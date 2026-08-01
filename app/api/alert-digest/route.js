import { Resend } from 'resend';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Uses the service role key so this route can read across all users' data.
// This must stay server-side only — never expose the service role key to the client.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Used to call our own matching API routes server-side. Set this in .env.local
// and in Vercel's env vars — e.g. https://hopeatlas.co (no trailing slash).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function GET(request) {
  // Protect this route so only Vercel's Cron (or you, with the secret) can trigger it
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Only bother with users who've actually opted into at least one channel
    const { data: prefs, error: prefsError } = await supabaseAdmin
      .from('preferences')
      .select('session_id, notify_email, notify_text')
      .or('notify_email.eq.true,notify_text.eq.true');

    if (prefsError) throw prefsError;
    if (!prefs || prefs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No opted-in users.' });
    }

    const sessionIds = prefs.map((p) => p.session_id);
    const prefMap = new Map(prefs.map((p) => [p.session_id, p]));

    const [{ data: profiles }, { data: seenRows }] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('session_id, name, email, phone, diagnosis, stage, insurance, zip_code')
        .in('session_id', sessionIds),
      supabaseAdmin.from('seen_alerts').select('session_id, item_key').in('session_id', sessionIds),
    ]);

    const profileMap = new Map((profiles || []).map((p) => [p.session_id, p]));

    const seenBySession = new Map();
    (seenRows || []).forEach((row) => {
      if (!seenBySession.has(row.session_id)) seenBySession.set(row.session_id, new Set());
      seenBySession.get(row.session_id).add(row.item_key);
    });

    let sent = 0;
    const errors = [];

    for (const sessionId of sessionIds) {
      const profile = profileMap.get(sessionId);
      const pref = prefMap.get(sessionId);
      if (!profile) continue;

      const seen = seenBySession.get(sessionId) || new Set();

      try {
        const [trialRes, matchRes] = await Promise.all([
          fetch(`${SITE_URL}/api/trial-match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cancerType: profile.diagnosis || '',
              stage: profile.stage || '',
              zip: profile.zip_code || '',
            }),
          }).then((r) => r.json()),
          fetch(`${SITE_URL}/api/personalized-match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cancerType: profile.diagnosis || '',
              stage: profile.stage || '',
              insurance: profile.insurance || '',
              zip: profile.zip_code || '',
              financialNeed: true,
            }),
          }).then((r) => r.json()),
        ]);

        const newTrials = (trialRes.trials || []).filter((t) => !seen.has(t.url));
        const newGrants = [...(matchRes.grants || []), ...(matchRes.medication_assistance || [])].filter(
          (g) => !seen.has(g.url)
        );
        const newResources = [...(matchRes.nonprofits || []), ...(matchRes.support_groups || [])].filter(
          (r) => !seen.has(r.url)
        );

        const totalNew = newTrials.length + newGrants.length + newResources.length;
        if (totalNew === 0) continue;

        const summary = `${totalNew} new item${totalNew !== 1 ? 's' : ''} — ${newTrials.length} trial${newTrials.length !== 1 ? 's' : ''}, ${newGrants.length} grant${newGrants.length !== 1 ? 's' : ''}, ${newResources.length} resource${newResources.length !== 1 ? 's' : ''}`;

        if (pref.notify_email && profile.email) {
          await resend.emails.send({
            from: 'alerts@hopeatlas.co',
            to: profile.email,
            subject: `${totalNew} new match${totalNew !== 1 ? 'es' : ''} on Hope Atlas`,
            html: `
              <p>Hi ${profile.name || 'there'},</p>
              <p>You have new matches waiting in Hope Atlas:</p>
              <p style="padding: 12px; background: #f5f5f0; border-radius: 8px;">${summary}</p>
              <p>Open the Alerts tab in the app to see details.</p>
            `,
          });
        }

        if (pref.notify_text && profile.phone) {
          await twilioClient.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: profile.phone,
            body: `Hope Atlas: You have ${summary}. Open the app to see details.`,
          });
        }

        sent++;
      } catch (err) {
        errors.push({ session_id: sessionId, error: err.message });
      }
    }

    return NextResponse.json({ success: true, sent, errors });
  } catch (error) {
    console.error('Alert digest cron error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}