import { NextResponse } from "next/server";

const EMPTY_RESULT = {
  meaning: "",
  why_it_matters: "",
  common_questions: [],
};

export async function POST(req) {
  try {
    const { biomarkerName, status, cancerType } = await req.json();

    if (!biomarkerName) {
      return NextResponse.json(EMPTY_RESULT);
    }

    const sys =
      "You are explaining a cancer biomarker/genetic test result in plain, non-alarming language. " +
      "Return ONLY a JSON object (no prose, no markdown, no code fences) shaped exactly: " +
      '{"meaning":string,"why_it_matters":string,"common_questions":[string,...]}. ' +
      "meaning: 2-3 sentences explaining in plain English what this biomarker and result mean. " +
      "why_it_matters: 2-3 sentences on why this result matters for treatment decisions, in general terms. " +
      "common_questions: up to 4 short questions a patient might want to ask their oncologist about this specific result. " +
      "This is general educational information only, not personalized medical advice. Never claim certainty about an individual's prognosis or treatment.";

    const user = `Biomarker: ${biomarkerName}
Result/status: ${status || "not specified"}
Cancer type context (if known): ${cancerType || "not specified"}

Explain this biomarker result in plain language.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
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
    console.error("biomarker-info route error:", err);
    return NextResponse.json(EMPTY_RESULT);
  }
}
