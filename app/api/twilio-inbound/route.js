import { NextResponse } from "next/server";
import twilio from "twilio";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

// Keeps only the last 10 digits of a phone number, regardless of how it was
// typed (with dashes, parentheses, a leading +1, spaces, etc.) — this lets
// us reliably match Twilio's strict +1XXXXXXXXXX format against whatever a
// person actually typed into their Profile's free-text phone field.
function normalizePhone(raw) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.slice(-10);
}

export async function POST(request) {
  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);

  // Verify this request genuinely came from Twilio, not someone spoofing a
  // fake STOP reply to silently disable a stranger's notifications.
  // This URL must exactly match what's configured in Twilio Console's
  // Messaging Service webhook setting — confirmed to be the www version.
  const signature = request.headers.get("x-twilio-signature");
  const url = "https://www.hopeatlas.co/api/twilio-inbound";
  const paramsObject = Object.fromEntries(params.entries());

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    paramsObject
  );

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const from = params.get("From");
  const optOutType = params.get("OptOutType");
  const body = (params.get("Body") || "").trim().toUpperCase();

  const STOP_KEYWORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
  const START_KEYWORDS = ["START", "YES", "UNSTOP"];

  let action = null;
  if (optOutType === "STOP") action = "stop";
  else if (optOutType === "START") action = "start";
  else if (STOP_KEYWORDS.includes(body)) action = "stop";
  else if (START_KEYWORDS.includes(body)) action = "start";

  const normalizedFrom = normalizePhone(from);

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("session_id, phone")
    .not("phone", "is", null);

  const match = (profiles || []).find((p) => normalizePhone(p.phone) === normalizedFrom);

  // Temporary diagnostic — remove once confirmed.
  console.log("twilio-inbound debug:", {
    from,
    normalizedFrom,
    optOutType,
    body,
    action,
    allProfilePhones: (profiles || []).map((p) => ({
      session_id: p.session_id,
      phone: p.phone,
      normalized: normalizePhone(p.phone),
    })),
    matchFound: !!match,
    matchSessionId: match?.session_id,
  });

  if (!action || !from) {
    // Nothing to sync (likely a HELP reply, or an unrelated message) —
    // still return valid empty TwiML so Twilio doesn't treat this as an error.
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  if (match) {
    await supabaseAdmin
      .from("preferences")
      .upsert(
        { session_id: match.session_id, notify_text: action === "start" },
        { onConflict: "session_id" }
      );
  }

  return new NextResponse("<Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}