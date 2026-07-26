import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { treatmentName, question } = await req.json();

    if (!treatmentName || !question) {
      return NextResponse.json({ answer: "" });
    }

    const sys =
      "You are answering a question about a specific cancer treatment for someone managing their own care. " +
      "Give a clear, plain-language answer in 2-4 short paragraphs. " +
      "This is general educational information, not personalized medical advice — " +
      "if the question requires knowledge of the person's specific case, say so and " +
      "suggest they raise it with their oncologist. Do not invent specific statistics you're not confident in.";

    const user = `Treatment: ${treatmentName}
Question: ${question}`;

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
        messages: [{ role: "user", content: question }],
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
    console.error("treatment-ask route error:", err);
    return NextResponse.json({ answer: "Sorry, something went wrong. Please try again." });
  }
}