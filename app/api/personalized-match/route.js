import { NextResponse } from "next/server";
import { createScopedClient } from "../../../lib/supabaseRequestClient";

// Web-search-backed matching can take a while — this gives the function room
// to finish rather than silently timing out on a default limit. Check your
// hosting plan's actual max allowed value if this route still times out.
export const maxDuration = 60;

const EMPTY_RESULT = { grants: [], nonprofits: [], support_groups: [], clinical_trials: [], transportation: [], lodging: [], medication_assistance: [] };
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function buildFingerprint({ cancerType, stage, age, insurance, zip, financialNeed, transportNeed, caregiverStatus }) {
  return JSON.stringify({
    cancerType: cancerType || "",
    stage: stage || "",
    age: age || "",
    insurance: insurance || "",
    zip: zip || "",
    financialNeed: !!financialNeed,
    transportNeed: !!transportNeed,
    caregiverStatus: caregiverStatus || "",
  });
}

function buildSystemPrompt(categoryList) {
  return (
    "You are matching a person to REAL, currently-operating support resources using web search. " +
    `Return ONLY a JSON object (no prose, no markdown, no code fences) shaped exactly with these keys: ${categoryList.join(", ")}. ` +
    "Each array holds up to 4 objects shaped: {\"name\":string,\"url\":string,\"desc\":string (one short sentence, plain text, no quotation marks or apostrophes inside the sentence)}. " +
    "medication_assistance should specifically cover programs that help pay for prescription drugs, copay assistance cards, or manufacturer patient-assistance programs — distinct from general grants. " +
    "Only include real organizations/programs you actually found via search with a real, working URL — never invent names or URLs. " +
    "If a category genuinely has nothing relevant, return an empty array for it rather than guessing. " +
    "Never suggest anything that requires a medical diagnosis you don't have, and never give medical advice — only point to support programs, financial aid, groups, trial-matching services, transportation, lodging, and medication assistance."
  );
}

function buildUserPrompt({ cancerType, stage, age, insurance, zip, financialNeed, transportNeed, caregiverStatus }, categoryList) {
  return `Find support resources for someone with the following situation:
- Cancer type: ${cancerType || "not specified"}
- Stage: ${stage || "not specified"}
- Age: ${age || "not specified"}
- Insurance status: ${insurance || "not specified"}
- Location (ZIP): ${zip || "not specified"}
- Needs help with treatment/living costs: ${financialNeed ? "yes" : "no"}
- Needs transportation to treatment: ${transportNeed ? "yes" : "no"}
- Is a: ${caregiverStatus || "not specified"}

Search for and return real, current resources across these categories only: ${categoryList.join(", ")}.
Prioritize resources specific to the cancer type and location where possible.`;
}

async function fetchCategoryGroup(input, categoryList) {
  const sys = buildSystemPrompt(categoryList);
  const user = buildUserPrompt(input, categoryList);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1400,
      system: sys,
      messages: [{ role: "user", content: user }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Anthropic API error:", res.status, errText);
    return {};
  }

  const data = await res.json();
  const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    console.error("No JSON object found in model response:", text.slice(0, 400));
    return {};
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (parseErr) {
    console.error("Failed to parse model JSON:", parseErr.message, text.slice(0, 400));
    return {};
  }
}

export async function POST(req) {
  try {
    const input = await req.json();
    const { query, sessionId, forceRefresh } = input;

    const authHeader = req.headers.get("authorization");
    const accessToken = authHeader ? authHeader.replace("Bearer ", "") : null;

    // Caching only applies to real profile-based matching, not one-off
    // keyword browsing (query) — and only when we have enough to identify
    // whose cache this is. AI Navigator's ad-hoc financial question doesn't
    // send sessionId/token, so it always behaves as a live, uncached search.
    const cacheable = !query && sessionId && accessToken;
    const fingerprint = cacheable ? buildFingerprint(input) : null;
    const client = cacheable ? createScopedClient(accessToken) : null;

    if (cacheable && !forceRefresh) {
      const { data: cached } = await client
        .from("match_cache")
        .select("results, created_at")
        .eq("session_id", sessionId)
        .eq("match_type", "financial")
        .eq("profile_fingerprint", fingerprint)
        .maybeSingle();

      if (cached && Date.now() - new Date(cached.created_at).getTime() < ONE_DAY_MS) {
        return NextResponse.json(cached.results);
      }
    }

    // Split into two independent groups so both sets of web searches run
    // concurrently instead of one long sequential chain covering all 7.
    const groupA = ["grants", "medication_assistance", "clinical_trials"];
    const groupB = ["nonprofits", "support_groups", "transportation", "lodging"];

    const [resultA, resultB] = await Promise.all([
      fetchCategoryGroup(input, groupA),
      fetchCategoryGroup(input, groupB),
    ]);

    const result = { ...EMPTY_RESULT, ...resultA, ...resultB };

    if (cacheable) {
      await client.from("match_cache").upsert(
        {
          session_id: sessionId,
          match_type: "financial",
          profile_fingerprint: fingerprint,
          results: result,
          created_at: new Date().toISOString(),
        },
        { onConflict: "session_id,match_type,profile_fingerprint" }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("personalized-match route error:", err);
    return NextResponse.json(EMPTY_RESULT);
  }
}