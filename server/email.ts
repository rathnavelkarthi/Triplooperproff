import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const resend = new Resend(process.env.RESEND_API_KEY || process.env.VITE_RESENDAPIKEY);

// Strip HTML tags for plain-text fallback
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

app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    return;
  }

  try {
    const fromAddress = req.body.from || process.env.VITE_RESEND_FROM || 'EasyStay <onboarding@esaystay.com>';
    console.log(`[Email Server] Sending from: ${fromAddress} to: ${to}`);

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      text: htmlToText(html),
      headers: {
        'X-Entity-Ref-ID': crypto.randomUUID(),
      },
    });

    if (error) {
       console.error('[Email Server] Resend API Error:', error);
       res.status(400).json({ success: false, error });
       return;
    }

    console.log(`[Email Server] Success! ID: ${data?.id} to: ${to}`);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('[Email Server] Catch Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.EMAIL_SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
});
