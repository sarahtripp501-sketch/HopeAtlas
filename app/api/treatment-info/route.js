import { NextResponse } from "next/server";

const EMPTY_RESULT = {
  mechanism: "",
  side_effects: [],
  why_prescribed: "",
  alternatives: [],
};

export async function POST(req) {
  try {
    const { treatmentName, treatmentType, cancerType } = await req.json();

    if (!treatmentName) {
      return NextResponse.json(EMPTY_RESULT);
    }

    const sys =
      "You are providing general educational information about a cancer treatment. " +
      "Return ONLY a JSON object (no prose, no markdown, no code fences) shaped exactly: " +
      '{"mechanism":string,"side_effects":[string,...],"why_prescribed":string,"alternatives":[string,...]}. ' +
      "mechanism: one short paragraph (2-3 sentences) explaining in plain language how the treatment works. " +
      "side_effects: up to 6 common side effects, each a short phrase. " +
      "why_prescribed: one short paragraph explaining typical reasons oncologists prescribe this treatment. " +
      "alternatives: up to 4 other FDA-approved treatment names commonly used for similar situations. " +
      "This is general educational information only, not medical advice specific to any individual. " +
      "Never claim certainty about an individual's situation. Keep language plain and non-alarming.";

    const user = `Treatment name: ${treatmentName}
Treatment type (if known): ${treatmentType || "not specified"}
Cancer type context (if known): ${cancerType || "not specified"}

Provide general educational information about this treatment.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: sys,
        messages: [{ role: "user", content: user }],
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
    console.error("treatment-info route error:", err);
    return NextResponse.json(EMPTY_RESULT);
  }
}