import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { base64Data, mediaType, category } = await req.json();

    if (!base64Data || !mediaType) {
      return NextResponse.json({ explanation: "" });
    }

    const sys =
      "You are explaining a medical document to a cancer patient in plain, non-alarming language. " +
      "Read the document and write a short plain-English explanation (3-5 sentences) of what it says, " +
      "avoiding unnecessary jargon. If there are specific findings (like biomarker results, stage, or " +
      "medications), mention them clearly but simply. " +
      "This is general educational information only, not personalized medical advice — " +
      "always suggest discussing details with their care team. Do not invent information not present in the document.";

    const isPdf = mediaType === "application/pdf";

    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64Data } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } };

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
        messages: [
          {
            role: "user",
            content: [
              contentBlock,
              {
                type: "text",
                text: `This document is categorized as: ${category || "medical document"}. Explain it in plain language.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", res.status, errText);
      return NextResponse.json({ explanation: "Sorry, we couldn't read this document right now." });
    }

    const data = await res.json();
    const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");

    return NextResponse.json({ explanation: text });
  } catch (err) {
    console.error("document-explain route error:", err);
    return NextResponse.json({ explanation: "Sorry, we couldn't read this document right now." });
  }
}
