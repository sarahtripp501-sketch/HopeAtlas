'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// recipient: { name, email, shareUrl }
export async function sendInviteEmail({ name, email, shareUrl }) {
  if (!email) {
    return { success: true, sent: 0 };
  }

  try {
    await resend.emails.send({
      from: 'updates@hopeatlas.co',
      to: email,
      subject: `You've been invited to a Care Circle on Hope Atlas`,
      html: `
        <p>Hi ${name || 'there'},</p>
        <p>You've been invited to someone's Care Circle on Hope Atlas — a private way to
        stay updated on their journey and offer support.</p>
        <p style="padding: 12px; background: #f5f5f0; border-radius: 8px;">
          <a href="${shareUrl}">${shareUrl}</a>
        </p>
        <p>This link is personal to you — please don't share it with anyone else.</p>
      `,
    });
    return { success: true, sent: 1 };
  } catch (error) {
    console.error('Invite email error:', error);
    return { success: false, error: error.message };
  }
}