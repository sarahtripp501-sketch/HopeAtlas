'use server';

import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// recipients: [{ name, phone }] — phone must be E.164 format, e.g. +13105551234
export async function sendTextNotification({ recipients, message, category }) {
  if (!recipients || recipients.length === 0) {
    return { success: true, sent: 0 };
  }

  try {
    const results = await Promise.all(
      recipients.map((r) =>
        client.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: r.phone,
          body: category
            ? `Hope Atlas: New update (${category}) — ${message} Reply STOP to unsubscribe.`
            : `Hope Atlas: ${message} Reply STOP to unsubscribe.`,
        })
      )
    );
    return { success: true, sent: results.length };
  } catch (error) {
    console.error('Care update text error:', error);
    return { success: false, error: error.message };
  }
}