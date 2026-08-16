'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTestEmail(to) {
  if (!to) {
    return { success: false, error: 'No email address on file.' };
  }

  try {
    const data = await resend.emails.send({
      from: 'hello@hopeatlas.co',
      to,
      subject: 'Hope Atlas — Test Notification',
      html: `
        <p>This is a test email from Hope Atlas.</p>
        <p>If you're seeing this, your notification email is set up correctly.</p>
      `,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Test email send error:', error);
    return { success: false, error: error.message };
  }
}