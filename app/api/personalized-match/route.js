import { NextResponse } from "next/server";

const EMPTY_RESULT = { grants: [], nonprofits: [], support_groups: [], clinical_trials: [], transportation: [], lodging: [], medication_assistance: [] };

export async function POST(req) {
  try {
    const { cancerType, stage, age, insurance, zip, financialNeed, transportNeed, caregiverStatus } = await req.json();

    const sys =
      "You are matching a person to REAL, currently-operating support resources using web search. " +
      "Return ONLY a JSON object (no prose, no markdown, no code fences) shaped exactly: " +
      '{"grants":[...],"nonprofits":[...],"support_groups":[...],"clinical_trials":[...],"transportation":[...],"lodging":[...],"medication_assistance":[...]}. ' +
      "Each array holds up to 4 objects shaped: {\"name\":string,\"url\":string,\"desc\":string (one short sentence, plain text, no quotation marks or apostrophes inside the sentence)}. " +
      "medication_assistance should specifically cover programs that help pay for prescription drugs, copay assistance cards, or manufacturer patient-assistance programs — distinct from general grants. " +
      "Only include real organizations/programs you actually found via search with a real, working URL — never invent names or URLs. " +
      "If a category genuinely has nothing relevant, return an empty array for it rather than guessing. " +
      "Never suggest anything that requires a medical diagnosis you don't have, and never give medical advice — only point to support programs, financial aid, groups, trial-matching services, transportation, lodging, and medication assistance.";

    const user = `Find support resources for someone with the following situation:
- Cancer type: ${cancerType || "not specified"}
- Stage: ${stage || "not specified"}
- Age: ${age || "not specified"}
- Insurance status: ${insurance || "not specified"}
- Location (ZIP): ${zip || "not specified"}
- Needs help with treatment/living costs: ${financialNeed ? "yes" : "no"}
- Needs transportation to treatment: ${transportNeed ? "yes" : "no"}
- Is a: ${caregiverStatus || "not specified"}

Search for and return real, current resources across all seven categories that best match this specific situation. Prioritize resources specific to the cancer type and location where possible.`;

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

    return NextResponse.json({ ...EMPTY_RESULT, ...parsed });
  } catch (err) {
    console.error("personalized-match route error:", err);
    return NextResponse.json(EMPTY_RESULT);
  }
}