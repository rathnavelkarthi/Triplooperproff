import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rarr;/g, '->')
    .replace(/&middot;/g, '·')
    .replace(/&copy;/g, '©')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, from } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }

  const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESENDAPIKEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const resend = new Resend(apiKey);
  const fromAddress = from || process.env.VITE_RESEND_FROM || 'Triplooper <onboarding@triplooper.com>';

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      text: htmlToText(html),
      headers: { 'X-Entity-Ref-ID': crypto.randomUUID() },
    });

    if (error) {
      return res.status(400).json({ success: false, error });
    }

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
