import { NextResponse } from "next/server";
import { createScopedClient } from "../../../lib/supabaseRequestClient";

const EMPTY_RESULT = { trials: [] };
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CTGOV_BASE = "https://clinicaltrials.gov/api/v2/studies";

// Profile's diagnosis picker stores compound labels like
// "Brain tumor - Glioblastoma" or "Leukemia - Acute myeloid (AML)" — sending
// the whole phrase to ClinicalTrials.gov's condition search under-matches,
// since real trials are tagged with just the specific term. This splits out
// the specific part (after the dash) as the primary search term, and the
// broader category (before the dash) as a fallback if the specific search
// comes back empty — a narrow diagnosis genuinely can have zero currently-
// recruiting trials at any given moment, and falling back beats dead-ending.
function extractSpecificTerm(cancerType) {
  if (!cancerType) return "";
  const parts = cancerType.split(" - ");
  return (parts.length > 1 ? parts[parts.length - 1] : cancerType).trim();
}

function extractBroadTerm(cancerType) {
  if (!cancerType) return "";
  const parts = cancerType.split(" - ");
  return parts.length > 1 ? parts[0].trim() : "";
}

function buildFingerprint({ cancerType, stage, biomarkers, currentTreatment, previousTreatments, zip, query }) {
  return JSON.stringify({
    cancerType: cancerType || "",
    stage: stage || "",
    biomarkers: biomarkers || [],
    currentTreatment: currentTreatment || "",
    previousTreatments: previousTreatments || [],
    zip: zip || "",
    query: query || "",
  });
}

async function fetchTrialsForCondition(condTerm) {
  const params = new URLSearchParams({
    "query.cond": condTerm,
    "filter.overallStatus": "RECRUITING",
    pageSize: "20",
    format: "json",
  });

  const res = await fetch(`${CTGOV_BASE}?${params.toString()}`);
  if (!res.ok) {
    console.error("ClinicalTrials.gov API error:", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  return data.studies || [];
}

function mapStudy(s) {
  const p = s.protocolSection || {};
  const nctId = p.identificationModule?.nctId || "";
  const title = p.identificationModule?.briefTitle || "Untitled study";
  const status = p.statusModule?.overallStatus || "";
  const phase = (p.designModule?.phases || []).join(", ");
  const conditions = (p.conditionsModule?.conditions || []).join(", ");
  const interventions = (p.armsInterventionsModule?.interventions || [])
    .map((i) => i.name)
    .filter(Boolean)
    .join(", ");
  const eligibility = (p.eligibilityModule?.eligibilityCriteria || "").slice(0, 1200);
  const locations = (p.contactsLocationsModule?.locations || [])
    .slice(0, 5)
    .map((l) => [l.city, l.state].filter(Boolean).join(", "));

  return {
    nctId,
    title,
    status,
    phase,
    conditions,
    interventions,
    eligibility,
    locations,
    url: nctId ? `https://clinicaltrials.gov/study/${nctId}` : null,
  };
}

// Fetches real, currently-recruiting trials directly from ClinicalTrials.gov's
// official public API — no API key needed, free, and every result returned
// here is guaranteed to actually exist with a real NCT ID and real URL.
async function fetchRealTrials({ cancerType, query }) {
  const specificTerm = query || extractSpecificTerm(cancerType) || "cancer";
  let studies = await fetchTrialsForCondition(specificTerm);

  // If the specific term found nothing, and there's a broader category to
  // fall back to (and this wasn't a manual keyword search), retry with that
  // instead of returning empty.
  if (studies.length === 0 && !query) {
    const broadTerm = extractBroadTerm(cancerType);
    if (broadTerm && broadTerm.toLowerCase() !== specificTerm.toLowerCase()) {
      studies = await fetchTrialsForCondition(broadTerm);
    }
  }

  return studies.map(mapStudy).filter((t) => t.nctId && t.url);
}


export async function POST(req) {
  try {
    const body = await req.json();
    const { cancerType, stage, biomarkers, currentTreatment, previousTreatments, zip, query, sessionId, forceRefresh } = body;

    const authHeader = req.headers.get("authorization");
    const accessToken = authHeader ? authHeader.replace("Bearer ", "") : null;

    const cacheable = !query && sessionId && accessToken;
    const fingerprint = cacheable ? buildFingerprint(body) : null;
    const client = cacheable ? createScopedClient(accessToken) : null;

    if (cacheable && !forceRefresh) {
      const { data: cached } = await client
        .from("match_cache")
        .select("results, created_at")
        .eq("session_id", sessionId)
        .eq("match_type", "trials")
        .eq("profile_fingerprint", fingerprint)
        .maybeSingle();

      if (cached && Date.now() - new Date(cached.created_at).getTime() < ONE_DAY_MS) {
        return NextResponse.json(cached.results);
      }
    }

    const realTrials = await fetchRealTrials({ cancerType, query });

    if (realTrials.length === 0) {
      const empty = { trials: [] };
      if (cacheable) {
        await client.from("match_cache").upsert(
          { session_id: sessionId, match_type: "trials", profile_fingerprint: fingerprint, results: empty, created_at: new Date().toISOString() },
          { onConflict: "session_id,match_type,profile_fingerprint" }
        );
      }
      return NextResponse.json(empty);
    }

    const sys =
      "You are helping rank and explain REAL clinical trials that were already retrieved from ClinicalTrials.gov's official API — you are not searching the web and must not invent, add, or substitute any trial. " +
      "Only comment on the trials provided in the data below; every trial you return must come from that list with its nctId, name, and url copied exactly. " +
      "Return ONLY a JSON object (no prose, no code fences) shaped exactly: {\"trials\":[...]}. " +
      "Each trial object shaped: {\"nctId\":string (copy exactly from input),\"name\":string (copy the title exactly from input),\"url\":string (copy exactly from input),\"match_percent\":number (0-100, your estimate of fit based on the profile and this trial's real eligibility/condition/intervention text),\"reasons\":[string,...] (up to 5 short neutral fact fragments grounded only in the provided text, e.g. \"Recruiting for Stage IV\", \"Includes prior chemotherapy patients\" — never a declarative verdict like \"you qualify\"),\"still_needed\":[string,...] (up to 3 short phrases for info that would help confirm eligibility)}. " +
      "Order by match_percent descending. Select and return only the best-fitting 8 trials from the list below — you do not need to include every trial provided, just the ones most worth the person's attention. " +
      "Never state or imply that the person qualifies, is eligible, or is a definitive match for any trial — eligibility can only be confirmed by that trial's own care team after real screening.";

    const user = `Person's profile:
- Cancer type: ${cancerType || "not specified"}
- Stage: ${stage || "not specified"}
- Known biomarkers: ${biomarkers && biomarkers.length ? biomarkers.join(", ") : "not specified"}
- Current treatment: ${currentTreatment || "not specified"}
- Previous treatments: ${previousTreatments && previousTreatments.length ? previousTreatments.join(", ") : "not specified"}
- Location (ZIP): ${zip || "not specified"}

Real candidate trials retrieved from ClinicalTrials.gov (only comment on these, do not invent others):
${JSON.stringify(realTrials, null, 2)}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: sys,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", res.status, errText);
      // Fall back to the real trials with no AI ranking, rather than empty —
      // still 100% real, verified data, just without personalized reasoning.
      const fallback = {
        trials: realTrials.map((t) => ({
          nctId: t.nctId,
          name: t.title,
          url: t.url,
          match_percent: 0,
          reasons: ["From ClinicalTrials.gov — personalized ranking unavailable right now"],
          still_needed: [],
        })),
      };
      return NextResponse.json(fallback);
    }

    const data = await res.json();
    const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    let parsed = EMPTY_RESULT;
    if (start !== -1 && end !== -1) {
      try {
        parsed = JSON.parse(text.slice(start, end + 1));
      } catch (parseErr) {
        console.error("Failed to parse model JSON:", parseErr.message);
      }
    }

    const result = { ...EMPTY_RESULT, ...parsed };

    if (cacheable) {
      await client.from("match_cache").upsert(
        { session_id: sessionId, match_type: "trials", profile_fingerprint: fingerprint, results: result, created_at: new Date().toISOString() },
        { onConflict: "session_id,match_type,profile_fingerprint" }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("trial-match route error:", err);
    return NextResponse.json(EMPTY_RESULT);
  }
}