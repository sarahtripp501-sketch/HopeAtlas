import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { notifyPatient } from "../../../lib/notifyPatient";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Date.now();

    // Only consider sessions that actually have a real profile — no point
    // reminding an empty/abandoned session that never entered anything.
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("session_id");
    if (profileError) throw profileError;

    const sessionIds = (profiles || []).map((p) => p.session_id);
    if (sessionIds.length === 0) {
      return NextResponse.json({ success: true, reminded: 0 });
    }

    const { data: prefsRows, error: prefsError } = await supabaseAdmin
      .from("preferences")
      .select("session_id, last_export_at, last_export_reminder_sent_at")
      .in("session_id", sessionIds);
    if (prefsError) throw prefsError;

    const prefsMap = new Map((prefsRows || []).map((p) => [p.session_id, p]));

    const overdueDue = sessionIds.filter((sessionId) => {
      const prefs = prefsMap.get(sessionId);
      const lastExport = prefs?.last_export_at ? new Date(prefs.last_export_at).getTime() : null;
      const lastReminder = prefs?.last_export_reminder_sent_at
        ? new Date(prefs.last_export_reminder_sent_at).getTime()
        : null;

      const neverExportedOrOverdue = !lastExport || now - lastExport > THIRTY_DAYS_MS;
      const notRecentlyReminded = !lastReminder || now - lastReminder > THIRTY_DAYS_MS;

      return neverExportedOrOverdue && notRecentlyReminded;
    });

    let reminded = 0;
    for (const sessionId of overdueDue) {
      try {
        const result = await notifyPatient({
          sessionId,
          subject: "A gentle reminder to back up your Hope Atlas data",
          message:
            "Since Hope Atlas doesn't use a login, your information only lives in this browser. " +
            "It's worth exporting a backup every so often, just in case — you can do that anytime " +
            "from Data & Privacy in Settings.",
        });
        if (result.emailSent || result.textSent) {
          await supabaseAdmin
            .from("preferences")
            .update({ last_export_reminder_sent_at: new Date().toISOString() })
            .eq("session_id", sessionId);
          reminded++;
        }
      } catch (err) {
        console.error("Export reminder notify error:", err);
      }
    }

    return NextResponse.json({ success: true, reminded, checked: sessionIds.length });
  } catch (error) {
    console.error("Export reminder cron error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}