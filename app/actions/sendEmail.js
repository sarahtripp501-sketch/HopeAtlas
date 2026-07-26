'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReportEmail({ resourceName, resourceUrl, issueType, details }) {
  try {
    const data = await resend.emails.send({
    from: 'hello@hopeatlas.co',
      to: 'hello@hopeatlas.co',
      subject: `Issue reported: ${resourceName}`,
      html: `
        <p><strong>Resource:</strong> ${resourceName}</p>
        <p><strong>URL:</strong> ${resourceUrl || 'N/A'}</p>
        <p><strong>Issue type:</strong> ${issueType}</p>
        <p><strong>Details:</strong> ${details || 'No additional details provided.'}</p>
      `,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}