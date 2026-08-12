import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

// Uses the service role key so this route can read across all users' data.
// This must stay server-side only — never expose the service role key to the client.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// appt_time is stored as a raw 24-hour string (e.g. "18:14") straight from
// an HTML time input — this converts it to a normal 12-hour AM/PM format
// for the email, instead of showing military time.
function formatTime12hr(timeStr) {
  if (!timeStr) return '';
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteStr} ${period}`;
}

// appt_date is stored as "2026-08-13" — this makes it read naturally in the
// email instead of showing the raw ISO date.
function formatDateReadable(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function GET(request) {
  // Protect this route so only Vercel's Cron (or you, with the secret) can trigger it
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // "Tomorrow" in YYYY-MM-DD form
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // Find every appointment happening tomorrow, across all sessions
    const { data: appointments, error: apptError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('appt_date', tomorrowStr);

    if (apptError) throw apptError;
    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No appointments tomorrow.' });
    }

    // Get the relevant session IDs, then look up each patient's email + notification preference
    const sessionIds = [...new Set(appointments.map((a) => a.session_id))];

    const [{ data: profiles }, { data: prefs }] = await Promise.all([
      supabaseAdmin.from('profiles').select('session_id, name, email').in('session_id', sessionIds),
      supabaseAdmin.from('preferences').select('session_id, notify_appointments').in('session_id', sessionIds),
    ]);

    const profileMap = new Map((profiles || []).map((p) => [p.session_id, p]));
    const prefMap = new Map((prefs || []).map((p) => [p.session_id, p]));

    let sent = 0;
    const errors = [];

    for (const appt of appointments) {
      const profile = profileMap.get(appt.session_id);
      const pref = prefMap.get(appt.session_id);

      // Skip if no email on file, or the patient opted out
      if (!profile?.email) continue;
      if (pref && pref.notify_appointments === false) continue;

      try {
        await resend.emails.send({
          from: 'reminders@hopeatlas.co',
          to: profile.email,
          subject: `Reminder: ${appt.title} tomorrow`,
          html: `
            <p>Hi ${profile.name || 'there'},</p>
            <p>This is a reminder that you have an appointment tomorrow:</p>
            <p style="padding: 12px; background: #f5f5f0; border-radius: 8px;">
              <strong>${appt.title}</strong><br/>
              ${formatDateReadable(appt.appt_date)} at ${formatTime12hr(appt.appt_time)}
            </p>
          `,
        });
        sent++;
      } catch (err) {
        errors.push({ session_id: appt.session_id, error: err.message });
      }
    }

    return NextResponse.json({ success: true, sent, errors });
  } catch (error) {
    console.error('Appointment reminder cron error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}