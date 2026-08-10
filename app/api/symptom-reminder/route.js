import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { notifyPatient } from "../../../lib/notifyPatient";

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    const { data: prefsRows } = await supabaseAdmin
      .from("preferences")
      .select("session_id, notify_email, notify_text")
      .or("notify_email.eq.true,notify_text.eq.true");

    const sessions = (prefsRows || []).map((p) => p.session_id);
    if (sessions.length === 0) {
      return NextResponse.json({ success: true, reminded: 0 });
    }

    const { data: loggedToday } = await supabaseAdmin
      .from("symptom_logs")
      .select("session_id")
      .eq("log_date", today)
      .in("session_id", sessions);

    const loggedSet = new Set((loggedToday || []).map((r) => r.session_id));
    const needsReminder = sessions.filter((s) => !loggedSet.has(s));

    let reminded = 0;
    for (const sessionId of needsReminder) {
      const result = await notifyPatient({
        sessionId,
        subject: "Want to track your symptoms today?",
        message:
          "Want to track your symptoms today? A quick check-in only takes a minute — open Hope Atlas to log how you're feeling.",
      });
      if (result.emailSent || result.textSent) reminded++;
    }

    return NextResponse.json({ success: true, reminded, checked: sessions.length });
  } catch (err) {
    console.error("symptom-reminder route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}