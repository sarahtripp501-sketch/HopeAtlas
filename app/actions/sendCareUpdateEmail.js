'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// recipients: [{ name, email }]
export async function sendCareUpdateEmails({ recipients, message, category }) {
  if (!recipients || recipients.length === 0) {
    return { success: true, sent: 0 };
  }

  try {
    const results = await Promise.all(
      recipients.map((r) =>
        resend.emails.send({
          from: 'updates@hopeatlas.co',
          to: r.email,
          subject: category ? `New update: ${category}` : 'New Care Circle update',
          html: `
            <p>Hi ${r.name || "there"},</p>
            <p>There's a new update from your Care Circle:</p>
            <p style="padding: 12px; background: #f5f5f0; border-radius: 8px;">${message}</p>
          `,
        })
      )
    );
    return { success: true, sent: results.length };
  } catch (error) {
    console.error('Care update email error:', error);
    return { success: false, error: error.message };
  }
}
