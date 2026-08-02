import { NextResponse } from "next/server";
import { createScopedClient } from "../../../lib/supabaseRequestClient";

const EMPTY_RESULT = { trials: [] };
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function buildFingerprint({ cancerType, stage, biomarkers, currentTreatment, previousTreatments, zip }) {
  return JSON.stringify({
    cancerType: cancerType || "",
    stage: stage || "",
    biomarkers: biomarkers || [],
    currentTreatment: currentTreatment || "",
    previousTreatments: previousTreatments || [],
    zip: zip || "",
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { cancerType, stage, biomarkers, currentTreatment, previousTreatments, zip, query, sessionId, forceRefresh } = body;

    const authHeader = req.headers.get("authorization");
    const accessToken = authHeader ? authHeader.replace("Bearer ", "") : null;

    // Caching only applies to real profile-based matching, not one-off
    // keyword browsing (query) — and only when we have enough to identify
    // whose cache this is.
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

    const sys =
      "You are matching a person to REAL, currently-recruiting clinical trials using web search. " +
      "Return ONLY a JSON object (no prose, no markdown, no code fences) shaped exactly: " +
      '{"trials":[...]}. ' +
      "Each trial object shaped: {\"name\":string,\"url\":string,\"match_percent\":number (0-100, your estimate of fit based on the profile given),\"reasons\":[string,...] (up to 5 short phrases explaining why it matched, e.g. \"Stage IV Breast Cancer\", \"HER2 Positive\", \"Prior chemotherapy\", \"Within 25 miles\"),\"still_needed\":[string,...] (up to 3 short phrases for missing info that would help confirm eligibility, e.g. \"Insurance status\", \"Confirm current biomarker status\")}. " +
      "Only include real, currently-recruiting or soon-to-recruit trials found via search with a real, working URL — never invent trial names or URLs. " +
      "Order the array by match_percent descending. Return up to 8 trials. " +
      "If nothing relevant is found, return an empty array rather than guessing. " +
      "Never give medical advice — only explain match reasoning in plain, approachable language.";

    const user = `Find clinical trials for someone with this profile:
- Cancer type: ${cancerType || "not specified"}
- Stage: ${stage || "not specified"}
- Known biomarkers: ${biomarkers && biomarkers.length ? biomarkers.join(", ") : "not specified"}
- Current treatment: ${currentTreatment || "not specified"}
- Previous treatments: ${previousTreatments && previousTreatments.length ? previousTreatments.join(", ") : "not specified"}
- Location (ZIP): ${zip || "not specified"}
${query ? `- Additional search terms from the person: ${query}` : ""}

Search for and return real, currently-recruiting clinical trials that best match this profile, with a match percentage and specific reasons for each.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2200,
        system: sys,
        messages: [{ role: "user", content: user }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", res.status, errText);
      return NextResponse.json(EMPTY_RESULT);
    }

    const data = await res.json();
    const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      console.error("No JSON object found in model response:", text.slice(0, 400));
      return NextResponse.json(EMPTY_RESULT);
    }

    let parsed;
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch (parseErr) {
      console.error("Failed to parse model JSON:", parseErr.message, text.slice(0, 400));
      return NextResponse.json(EMPTY_RESULT);
    }

    const result = { ...EMPTY_RESULT, ...parsed };

    if (cacheable) {
      await client.from("match_cache").upsert(
        {
          session_id: sessionId,
          match_type: "trials",
          profile_fingerprint: fingerprint,
          results: result,
          created_at: new Date().toISOString(),
        },
        { onConflict: "session_id,match_type,profile_fingerprint" }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("trial-match route error:", err);
    return NextResponse.json(EMPTY_RESULT);
  }
}