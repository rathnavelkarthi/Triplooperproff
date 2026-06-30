import { render } from '@react-email/render';
import { Resend } from 'resend';
import { WelcomeEmail } from './src/emails/WelcomeEmail';
import dotenv from 'dotenv';
import React from 'react';

dotenv.config();

const resend = new Resend(process.env.VITE_RESENDAPIKEY);

async function send() {
  const email = 'rathnavelkarthi1@gmail.com';
  const businessName = 'rastay';
  const businessType = 'combined';
  const dashboardUrl = 'https://rastay.esaystay.com/admin/login';
  
  try {
    // Note: react-email render returns a promise depending on the version
    const htmlOutput = await render(
      React.createElement(WelcomeEmail, {
        businessName,
        businessType,
        dashboardUrl
      })
    );

    const { data, error } = await resend.emails.send({
      from: 'Triplooper <onboarding@resend.dev>',
      to: [email],
      subject: `Welcome to Triplooper, ${businessName}!`,
      html: htmlOutput as string
    });

    if (error) {
      console.error(error);
    } else {
      console.log('Sent successfully', data);
    }
  } catch (err) {
    console.error('Error rendering or sending email:', err);
  }
}

send();
