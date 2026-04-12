import { test } from 'vitest';
import { sendWelcomeEmail } from './email';

test('send test email to user', async () => {
  console.log('Test: Sending welcome email to rathnavelkarthi1@gmail.com');
  sendWelcomeEmail({
    email: 'rathnavelkarthi1@gmail.com',
    businessName: 'Ganesh Residence Premium',
    businessType: 'Boutique Hotel'
  });
  
  // Wait a moment for the fire-and-forget promise to resolve
  await new Promise(r => setTimeout(r, 3000));
  console.log('Test: Email triggered successfully');
});
