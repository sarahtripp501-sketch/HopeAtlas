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
  const signature = request.headers.get("x-twilio-signature");
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/twilio-inbound`;
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
  // Present only when Advanced Opt-Out is enabled on the Messaging Service —
  // falls back to checking the message body directly if it's ever missing,
  // so this doesn't silently do nothing if that setting isn't on yet.
  const optOutType = params.get("OptOutType");
  const body = (params.get("Body") || "").trim().toUpperCase();

  const STOP_KEYWORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
  const START_KEYWORDS = ["START", "YES", "UNSTOP"];

  let action = null;
  if (optOutType === "STOP") action = "stop";
  else if (optOutType === "START") action = "start";
  else if (STOP_KEYWORDS.includes(body)) action = "stop";
  else if (START_KEYWORDS.includes(body)) action = "start";

  if (!action || !from) {
    // Nothing to sync (likely a HELP reply, or an unrelated message) —
    // still return valid empty TwiML so Twilio doesn't treat this as an error.
    return new NextResponse("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const normalizedFrom = normalizePhone(from);

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("session_id, phone")
    .not("phone", "is", null);

  const match = (profiles || []).find((p) => normalizePhone(p.phone) === normalizedFrom);

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