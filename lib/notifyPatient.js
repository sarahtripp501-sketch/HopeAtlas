import { supabaseAdmin } from "./supabaseAdmin";
import { Resend } from "resend";
import { sendTextNotification } from "../app/actions/sendTextNotification";

const resend = new Resend(process.env.RESEND_API_KEY);

// Notifies the patient by email and/or text, respecting their notification
// preferences — used whenever a Care Circle member does something the
// patient should hear about right away, rather than making them check the
// app to find out.
export async function notifyPatient({ sessionId, subject, message }) {
  const [profileRes, prefsRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("name, email, phone").eq("session_id", sessionId).maybeSingle(),
    supabaseAdmin.from("preferences").select("notify_email, notify_text").eq("session_id", sessionId).maybeSingle(),
  ]);

  const profile = profileRes.data;
  const prefs = prefsRes.data;
  let emailSent = false;
  let textSent = false;

  // Default email to on if no preference row exists yet, matching how
  // other notification flows in the app already default.
  if (profile?.email && (prefs?.notify_email ?? true)) {
    try {
      await resend.emails.send({
        from: "updates@hopeatlas.co",
        to: profile.email,
        subject,
        html: `<p>${message}</p>`,
      });
      emailSent = true;
    } catch (err) {
      console.error("notifyPatient email error:", err);
    }
  }

  if (profile?.phone && prefs?.notify_text) {
    try {
      const result = await sendTextNotification({
        recipients: [{ name: profile.name, phone: profile.phone }],
        message,
        category: null,
      });
      textSent = !!result.success && result.sent > 0;
    } catch (err) {
      console.error("notifyPatient text error:", err);
    }
  }

  return { emailSent, textSent };
}