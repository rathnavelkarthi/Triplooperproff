import express from 'express';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    return;
  }

  try {
    const data = await resend.emails.send({
      from: 'Ganesh Residence <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

const PORT = process.env.EMAIL_SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
});
