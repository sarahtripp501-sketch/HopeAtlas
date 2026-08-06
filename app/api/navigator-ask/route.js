import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { question, context } = await req.json();

    if (!question) {
      return NextResponse.json({ answer: "" });
    }

    const sys =
      "You are an AI navigator helping a cancer patient understand their own situation. " +
      "You have context about their diagnosis, treatments, and biomarkers below. Use it to give " +
      "specific, relevant answers rather than generic ones. Give clear, plain-language answers in " +
      "2-5 short paragraphs. This is general educational information, not personalized medical advice. " +
      "You must never: give a diagnosis or suggest what condition someone has or doesn't have; " +
      "recommend a specific treatment or tell someone which treatment option to choose; " +
      "state or imply survival odds, prognosis, or life expectancy; " +
      "state or imply that someone qualifies, is eligible, or is a definitive match for a clinical trial " +
      "or program — eligibility can only be confirmed by that program's own care team. " +
      "If a question asks for any of these, explain that it requires clinical judgment from their own " +
      "oncology team and that you can't make that determination, then offer what general educational " +
      "context you safely can instead. Do not invent details not present in the context or question.";

    const contextText = `
Diagnosis: ${context.diagnosis || "not specified"}, Stage: ${context.stage || "not specified"}
Current treatments: ${context.treatments && context.treatments.length ? context.treatments.join(", ") : "none listed"}
Known biomarkers: ${context.biomarkers && context.biomarkers.length ? context.biomarkers.join(", ") : "none listed"}
`;

    const user = `${contextText}\nQuestion: ${question}`;

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
      return NextResponse.json({ answer: "Sorry, something went wrong. Please try again." });
    }

    const data = await res.json();
    const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");

    return NextResponse.json({ answer: text });
  } catch (err) {
    console.error("navigator-ask route error:", err);
    return NextResponse.json({ answer: "Sorry, something went wrong. Please try again." });
  }
}