import { NextResponse } from "next/server";

const EMPTY_RESULT = { events: [] };

export async function POST(req) {
  try {
    const { base64Data, mediaType } = await req.json();

    if (!base64Data || !mediaType) {
      return NextResponse.json(EMPTY_RESULT);
    }

    const sys =
      "You are extracting dated medical events from a document (pathology report, scan, lab report, or doctor's note) " +
      "for a patient timeline. Return ONLY a JSON object (no prose, no markdown, no code fences) shaped exactly: " +
      '{"events":[{"date":string (YYYY-MM-DD if a full date is found, or best guess if only month/year given, e.g. "2024-06-01"),"title":string (short, e.g. "Lumpectomy", "Started chemotherapy", "PET scan", "Diagnosis: Stage II HER2+")}]}. ' +
      "Only extract events with an actual identifiable date in the document. Do not invent dates or events not present. " +
      "If no clear dated events are found, return an empty array. Return up to 6 events, most significant first.";

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
              { type: "text", text: "Extract dated medical events from this document for a patient timeline." },
            ],
          },
        ],
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
    console.error("document-timeline-extract route error:", err);
    return NextResponse.json(EMPTY_RESULT);
  }
}