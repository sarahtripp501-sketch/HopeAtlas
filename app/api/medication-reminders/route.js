import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { notifyPatient } from "../../../lib/notifyPatient";

// Runs once per hour. Since there's no per-user timezone stored anywhere in
// the app, this assumes reminder times were entered in Pacific time (where
// Hope Atlas is based) and converts using the real IANA timezone database —
// not a fixed UTC offset — so this correctly handles the twice-yearly
// daylight saving switch instead of silently drifting by an hour.
//
// Because this only runs on the hour, matching is hour-level precision: a
// medication set for "2:14 PM" will trigger during the 2 PM run, not at
// exactly 2:14. Good enough for "did you take your afternoon dose," not
// meant for minute-exact alarms.
function currentPacificHour() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false,
  });
  return parseInt(formatter.format(new Date()), 10) % 24;
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentHour = currentPacificHour();

    const { data: medications, error } = await supabaseAdmin
      .from("medications")
      .select("id, name, session_id, reminder_times")
      .eq("status", "Active");

    if (error) throw error;

    const dueNow = (medications || []).filter((m) =>
      (m.reminder_times || []).some((t) => {
        const hour = parseInt(t.split(":")[0], 10);
        return hour === currentHour;
      })
    );

    let reminded = 0;
    for (const med of dueNow) {
      try {
        await notifyPatient({
          sessionId: med.session_id,
          subject: `Time for ${med.name}`,
          message: `Reminder: it's time for your dose of ${med.name}.`,
        });
        reminded++;
      } catch (err) {
        console.error("Medication reminder notify error:", err);
      }
    }

    return NextResponse.json({ success: true, reminded, checked: medications?.length || 0 });
  } catch (error) {
    console.error("Medication reminder cron error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}