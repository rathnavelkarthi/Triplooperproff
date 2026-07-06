// ═══════════════════════════════════════════════════════════════════
// Triplooper — Premium Transactional Email Service (Resend)
// Inspired by Stripe, Airbnb, Linear, Notion
// ═══════════════════════════════════════════════════════════════════

// WEB-001: the Resend API key must NEVER be in the browser. Email is sent only
// via the server proxy (api/send-email.ts on Vercel / local express), which
// holds RESEND_API_KEY server-side. No VITE_RESENDAPIKEY, no direct browser call.
const FROM = import.meta.env.VITE_RESEND_FROM || 'Triplooper <onboarding@resend.dev>';

// ─── Types ──────────────────────────────────────────────────────

export interface WelcomeEmailData {
  email: string;
  businessName: string;
  businessType: string;
  password?: string;
  subdomain?: string;
}

export interface BookingConfirmationData {
  guestName: string;
  guestEmail: string;
  roomType: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  gstAmount: number;
  paymentStatus: string;
  source: string;
  reservationId: string;
  businessName: string;
  guestToken?: string;
}

export interface BookingCancelledData {
  guestName: string;
  guestEmail: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  gstAmount: number;
  reservationId: string;
  businessName: string;
}

export interface CheckInEmailData {
  guestName: string;
  guestEmail: string;
  roomNumber: string;
  roomType: string;
  checkOutDate: string;
  businessName: string;
}

export interface CheckOutEmailData {
  guestName: string;
  guestEmail: string;
  roomNumber: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  gstAmount: number;
  paymentMethod: string;
  businessName: string;
}

export interface StaffCredentialsData {
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  subdomain: string;
  businessName: string;
}

export interface BookingStatusChangeData {
  guestName: string;
  guestEmail: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  newStatus: string;
  reservationId: string;
  businessName: string;
}

export interface BusinessInviteData {
  email: string;
  businessName: string;
  maxProperties: number;
  inviteUrl: string;
}

// ─── Core sender ────────────────────────────────────────────────

async function sendResendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const emailEndpoint = isLocalDev
      ? 'http://localhost:3001/api/send-email'
      : '/api/send-email';

    // Send ONLY via the server-side proxy (local express or Vercel serverless),
    // which holds the Resend key. No browser-side Resend fallback (WEB-001).
    const serverRes = await fetch(emailEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html, from: FROM })
    });
    if (serverRes.ok) {
      return true;
    }
    const errBody = await serverRes.json().catch(() => ({}));
    console.error('[Triplooper Email] Server proxy failed:', errBody);
    return false;
  } catch (err) {
    console.error('[Triplooper Email] Email send error:', err);
    return false;
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ─── Design Tokens ──────────────────────────────────────────────

const ff = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Segoe UI', Arial, sans-serif";
const mono = "'SF Mono', 'Roboto Mono', 'IBM Plex Mono', Menlo, Consolas, monospace";

const T = {
  bgOuter: '#FAF9F6', // very subtle warm off-white for premium feel
  bgCard: '#ffffff',
  bgMuted: '#f4f4f5',
  bgAccentSoft: '#f4f4f5',
  bgWarnSoft: '#fff8f1',
  bgDangerSoft: '#fef2f2',
  bgInfoSoft: '#f0fdf4',

  textPrimary: '#18181b',
  textSecondary: '#52525b',
  textTertiary: '#a1a1aa',
  textOnAccent: '#ffffff',

  accent: '#000000', // sophisticated black button
  accentLight: '#e4e4e7',
  gold: '#b45309',

  border: '#e4e4e7',
  borderLight: '#f4f4f5',
  borderAccent: '#d4d4d8',

  green: '#059669',
  red: '#e11d48',
  blue: '#2563eb',
  orange: '#ea580c',
  gray: '#71717a',
};

// ─── Base Template ─────────────────────────────────────────────

function baseTemplate(opts: {
  preheader: string;
  businessName: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
  accentColor?: string;
}): string {
  const accent = opts.accentColor || T.accent;
  const cta = opts.ctaText && opts.ctaUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:40px; margin-bottom:20px;">
      <tr><td align="center">
        <a href="${opts.ctaUrl}" target="_blank" style="background:${accent};color:${T.textOnAccent};font-family:${ff};font-size:14px;font-weight:500;text-decoration:none;display:inline-block;padding:16px 36px;border-radius:4px;letter-spacing:0.5px;">${opts.ctaText}</a>
      </td></tr>
    </table>` : '';

  return `<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
<style>
  * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; box-sizing: border-box; }
  body { margin:0; padding:0; background-color: ${T.bgOuter}; }
  @media only screen and (max-width:600px) {
    .outer { padding: 20px 10px !important; }
    .card { border-radius: 0 !important; border: none !important; border-top: 1px solid ${T.borderLight} !important; border-bottom: 1px solid ${T.borderLight} !important; }
    .card-inner { padding: 40px 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${T.bgOuter};font-family:${ff}">
  <span style="display:none;font-size:1px;color:${T.bgOuter};max-height:0;overflow:hidden;mso-hide:all">${opts.preheader}${'&nbsp;'.repeat(40)}</span>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${T.bgOuter}">
    <tr><td align="center" class="outer" style="padding:60px 20px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="540" style="max-width:540px;width:100%">

        <!-- HEADER -->
        <tr><td style="padding-bottom:32px;text-align:center">
          <span style="font-family:${ff};font-size:22px;font-weight:300;color:${T.textPrimary};letter-spacing:3px;text-transform:uppercase;">TRIP<strong style="font-weight:700">LOOPER</strong></span>
        </td></tr>

        <!-- MAIN CARD -->
        <tr><td class="card" style="background:${T.bgCard};border-radius:8px;border:1px solid ${T.border};box-shadow:0 4px 20px rgba(0,0,0,0.03);">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td class="card-inner" style="padding:48px 40px">
              ${opts.bodyContent}
              ${cta}
            </td></tr>
          </table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:40px 20px 0;text-align:center">
          ${opts.footerNote ? `<p style="margin:0 0 16px;font-family:${ff};font-size:13px;color:${T.textTertiary};line-height:1.6">${opts.footerNote}</p>` : ''}
          <div style="height:1px;background:${T.border};width:30px;margin:20px auto;"></div>
          <p style="margin:0 0 8px;font-family:${ff};font-size:12px;color:${T.textTertiary}">Sent beautifully by <span style="font-weight:500;color:${T.textSecondary}">Triplooper</span> for <span style="font-weight:500;color:${T.textSecondary}">${opts.businessName}</span></p>
          <p style="margin:0;font-family:${ff};font-size:11px;color:${T.textTertiary};letter-spacing:1px;text-transform:uppercase;">&copy; ${new Date().getFullYear()} Triplooper &middot; Premium Management</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Component Helpers ──────────────────────────────────────────

function heading(text: string, size: 'lg' | 'md' = 'lg'): string {
  const s = size === 'lg' ? '24px' : '20px';
  return `<h1 style="margin:0 0 16px;font-family:${ff};font-size:${s};font-weight:600;color:${T.textPrimary};letter-spacing:-0.4px;line-height:1.4">${text}</h1>`;
}

function subtitle(text: string): string {
  return `<p style="margin:0 0 36px;font-family:${ff};font-size:15px;color:${T.textSecondary};line-height:1.7;font-weight:400;">${text}</p>`;
}

function divider(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:32px 0"><div style="height:1px;background:${T.border}"></div></td></tr></table>`;
}

function sectionLabel(text: string): string {
  return `<p style="margin:0 0 16px;font-family:${ff};font-size:11px;font-weight:600;color:${T.textTertiary};text-transform:uppercase;letter-spacing:1.5px">${text}</p>`;
}

function detailRow(label: string, value: string, bold = false): string {
  return `<tr>
    <td class="detail-label" style="padding:12px 0;font-family:${ff};font-size:14px;color:${T.textSecondary};vertical-align:top;width:35%">${label}</td>
    <td class="detail-value" style="padding:12px 0;font-family:${ff};font-size:14px;color:${bold ? T.textPrimary : T.textSecondary};font-weight:${bold ? '500' : '400'};text-align:right;vertical-align:top">${value}</td>
  </tr>`;
}

function detailCard(rows: [string, string, boolean?][], borderLeft?: string): string {
  const inner = rows.map(([l, v, b]) => detailRow(l, v, !!b)).join('');
  return `<div style="padding:8px 0;margin:24px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border-top:1px solid ${T.border};border-bottom:1px solid ${T.border};">
      ${inner}
    </table>
  </div>`;
}

function amountBlock(rows: [string, string][], totalLabel: string, totalValue: string): string {
  const items = rows.map(([l, v]) =>
    `<tr>
      <td style="padding:10px 0;font-family:${ff};font-size:14px;color:${T.textSecondary}">${l}</td>
      <td style="padding:10px 0;font-family:${ff};font-size:14px;color:${T.textSecondary};text-align:right">${v}</td>
    </tr>`
  ).join('');
  return `<div style="background:${T.bgOuter};padding:32px;margin:32px 0;border:1px solid ${T.border};border-radius:4px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">
      ${items}
      <tr><td colspan="2" style="padding:16px 0 0"><div style="height:1px;background:${T.border}"></div></td></tr>
      <tr>
        <td style="padding:20px 0 0;font-family:${ff};font-size:16px;font-weight:500;color:${T.textPrimary}">${totalLabel}</td>
        <td style="padding:20px 0 0;font-family:${ff};font-size:20px;font-weight:600;color:${T.textPrimary};text-align:right;letter-spacing:-0.5px;">${totalValue}</td>
      </tr>
    </table>
  </div>`;
}

function statusPill(label: string, color: string, bgColor: string): string {
  return `<span style="display:inline-block;padding:6px 12px;border-radius:4px;font-family:${mono};font-size:11px;font-weight:500;color:${color};background:${bgColor};letter-spacing:0.5px;text-transform:uppercase;">${label}</span>`;
}

function getStatusPill(status: string): string {
  const m: Record<string, [string, string, string]> = {
    'Confirmed': ['Confirmed', T.green, T.bgInfoSoft],
    'CONFIRMED': ['Confirmed', T.green, T.bgInfoSoft],
    'Cancelled': ['Cancelled', T.red, T.bgDangerSoft],
    'CANCELLED': ['Cancelled', T.red, T.bgDangerSoft],
    'Checked In': ['Checked In', T.blue, '#eff6ff'],
    'CHECKED_IN': ['Checked In', T.blue, '#eff6ff'],
    'Checked Out': ['Checked Out', T.green, T.bgInfoSoft],
    'CHECKED_OUT': ['Checked Out', T.green, T.bgInfoSoft],
    'Pending': ['Pending', T.orange, T.bgWarnSoft],
    'PENDING': ['Pending', T.orange, T.bgWarnSoft],
    'Paid': ['Paid', T.green, T.bgInfoSoft],
    'PAID': ['Paid', T.green, T.bgInfoSoft],
    'Unpaid': ['Unpaid', T.orange, T.bgWarnSoft],
    'UNPAID': ['Unpaid', T.orange, T.bgWarnSoft],
  };
  const [l, c, bg] = m[status] || [status, T.gray, T.bgMuted];
  return statusPill(l, c, bg);
}



// ═══════════════════════════════════════════════════════════════════
// 1. WELCOME EMAIL
// ═══════════════════════════════════════════════════════════════════

function welcomeEmailHtml(data: WelcomeEmailData): string {
  const body = `
    ${heading('Welcome to Triplooper')}
    ${subtitle(`Your property <strong style="color:${T.textPrimary}">${data.businessName}</strong> is set up and ready. Start managing your ${data.businessType || 'property'} in minutes.`)}

    ${sectionLabel('Your property')}
    ${detailCard([
      ['Property', data.businessName, true],
      ['Type', (data.businessType || 'Hotel').charAt(0).toUpperCase() + (data.businessType || 'hotel').slice(1)],
      ['Email', data.email],
      ['Account', getStatusPill('Confirmed')],
    ], T.accent)}

    ${data.password ? `
    ${sectionLabel('Login credentials')}
    <div style="background:${T.bgMuted};border-radius:12px;padding:20px 24px;margin:16px 0;border:1px solid ${T.borderAccent}">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">
        <tr>
          <td style="padding:8px 0;font-family:${ff};font-size:13px;color:${T.textTertiary}">Login URL</td>
          <td style="padding:8px 0;font-family:${ff};font-size:13px;color:${T.accent};font-weight:500;text-align:right;word-break:break-all">
            <a href="https://${data.subdomain ? `${data.subdomain}.` : ''}triplooper.com/admin/login" style="color:${T.accent};text-decoration:none">
              ${data.subdomain ? `${data.subdomain}.` : ''}triplooper.com
            </a>
          </td>
        </tr>
        <tr><td colspan="2" style="padding:4px 0"><div style="height:1px;background:${T.border}"></div></td></tr>
        <tr>
          <td style="padding:8px 0;font-family:${ff};font-size:13px;color:${T.textTertiary}">Email</td>
          <td style="padding:8px 0;font-family:${mono};font-size:14px;color:${T.textPrimary};font-weight:600;text-align:right">${data.email}</td>
        </tr>
        <tr><td colspan="2" style="padding:4px 0"><div style="height:1px;background:${T.border}"></div></td></tr>
        <tr>
          <td style="padding:8px 0;font-family:${ff};font-size:13px;color:${T.textTertiary}">Password</td>
          <td style="padding:8px 0;font-family:${mono};font-size:14px;color:${T.textPrimary};font-weight:600;text-align:right;letter-spacing:0.5px">${data.password}</td>
        </tr>
      </table>
    </div>
    <div style="background:${T.bgWarnSoft};border-radius:10px;padding:14px 20px;margin-bottom:24px">
      <p style="margin:0;font-family:${ff};font-size:13px;color:${T.orange};line-height:1.6;font-weight:500">&#9888;&#65039; Please change your password after your first login.</p>
    </div>
    ` : ''}

    ${divider()}

    <!-- Founder Note -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="padding:4px 0 16px">
        <p style="margin:0 0 4px;font-family:${ff};font-size:11px;font-weight:600;color:${T.textTertiary};text-transform:uppercase;letter-spacing:0.8px">A note from our founder</p>
      </td></tr>
      <tr><td style="padding:20px 24px;background:linear-gradient(135deg, #fefce8 0%, #fff7ed 100%);border-radius:12px;border:1px solid #fde68a">
        <p style="margin:0 0 12px;font-family:${ff};font-size:15px;color:${T.textPrimary};line-height:1.7">Hi ${data.businessName} team,</p>
        <p style="margin:0 0 12px;font-family:${ff};font-size:14px;color:${T.textSecondary};line-height:1.7">I'm Rathnavel Karthi, the founder of Triplooper. Thank you for trusting us with your property management.</p>
        <p style="margin:0 0 12px;font-family:${ff};font-size:14px;color:${T.textSecondary};line-height:1.7">We built Triplooper because every property &mdash; whether 5 rooms or 500 &mdash; deserves tools that just work. You're not just a customer; you're part of our story.</p>
        <p style="margin:0 0 12px;font-family:${ff};font-size:14px;color:${T.textSecondary};line-height:1.7">Need anything? Just reply to this email. I read every one.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px">
          <tr>
            <td style="vertical-align:middle">
              <div style="width:36px;height:36px;border-radius:50%;background:${T.accent};text-align:center;line-height:36px">
                <span style="font-family:${ff};font-size:14px;font-weight:700;color:${T.textOnAccent}">RK</span>
              </div>
            </td>
            <td style="padding-left:12px;vertical-align:middle">
              <p style="margin:0;font-family:${ff};font-size:14px;font-weight:600;color:${T.textPrimary}">Rathnavel Karthi</p>
              <p style="margin:0;font-family:${ff};font-size:12px;color:${T.textTertiary}">Founder, Triplooper</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  `;

  return baseTemplate({
    preheader: `Welcome to Triplooper — ${data.businessName} is ready to go.`,
    businessName: data.businessName,
    bodyContent: body,
    ctaText: 'Open Your Dashboard &rarr;',
    ctaUrl: 'https://triplooper.com/admin/login',
    footerNote: 'Set up rooms, configure pricing, and go live — all in under 15 minutes.',
  });
}

// ═══════════════════════════════════════════════════════════════════
// 2. BOOKING CONFIRMATION
// ═══════════════════════════════════════════════════════════════════

function bookingConfirmationHtml(data: BookingConfirmationData): string {
  const refId = `#${data.reservationId.slice(0, 8).toUpperCase()}`;
  const body = `
    ${heading('Booking Confirmed')}
    ${subtitle(`Great news! A reservation at <strong style="color:${T.textPrimary}">${data.businessName}</strong> has been confirmed.`)}

    ${sectionLabel('Reservation details')}
    ${detailCard([
      ['Reference', refId, true],
      ['Guest', data.guestName, true],
      ['Room', `${data.roomType}${data.roomNumber ? ` &middot; ${data.roomNumber}` : ''}`],
      ['Check-in', fmtDate(data.checkIn)],
      ['Check-out', fmtDate(data.checkOut)],
      ['Source', data.source],
      ['Payment', getStatusPill(data.paymentStatus)],
    ], T.green)}

    ${sectionLabel('Payment summary')}
    ${amountBlock(
      [
        ['Room charges', fmtCurrency(data.amount - data.gstAmount)],
        ['GST', fmtCurrency(data.gstAmount)],
      ],
      'Total',
      fmtCurrency(data.amount)
    )}
  `;

  return baseTemplate({
    preheader: `Booking confirmed for ${data.guestName} — ${fmtDate(data.checkIn)} at ${data.businessName}`,
    businessName: data.businessName,
    bodyContent: body,
    ctaText: data.guestToken ? 'Access Guest Portal &rarr;' : undefined,
    ctaUrl: data.guestToken ? `https://triplooper.com/guest/${data.guestToken}` : undefined,
    footerNote: 'For changes or cancellations, please contact the front desk or manage from your dashboard.',
  });
}

// ═══════════════════════════════════════════════════════════════════
// 3. BOOKING CANCELLED
// ═══════════════════════════════════════════════════════════════════

function bookingCancelledHtml(data: BookingCancelledData): string {
  const refId = `#${data.reservationId.slice(0, 8).toUpperCase()}`;
  const body = `
    ${heading('Booking Cancelled')}
    ${subtitle(`A reservation at <strong style="color:${T.textPrimary}">${data.businessName}</strong> has been cancelled.`)}

    ${sectionLabel('Cancelled reservation')}
    ${detailCard([
      ['Reference', refId, true],
      ['Guest', data.guestName, true],
      ['Room', data.roomType],
      ['Check-in', fmtDate(data.checkIn)],
      ['Check-out', fmtDate(data.checkOut)],
      ['Amount', fmtCurrency(data.amount)],
      ['Status', getStatusPill('Cancelled')],
    ], T.red)}

    <div style="background:${T.bgDangerSoft};border-radius:10px;padding:14px 20px;margin-top:8px">
      <p style="margin:0;font-family:${ff};font-size:13px;color:${T.red};line-height:1.6">If this was a mistake, please contact the front desk immediately to reinstate the booking.</p>
    </div>
  `;

  return baseTemplate({
    preheader: `Booking cancelled — ${data.guestName} at ${data.businessName}`,
    businessName: data.businessName,
    bodyContent: body,
    accentColor: T.red,
    footerNote: 'Refund policies vary. Contact the property for details.',
  });
}

// ═══════════════════════════════════════════════════════════════════
// 4. CHECK-IN CONFIRMATION
// ═══════════════════════════════════════════════════════════════════

function checkInConfirmationHtml(data: CheckInEmailData): string {
  const body = `
    ${heading(`Welcome to ${data.businessName}`)}
    ${subtitle(`You're all checked in! We hope you have a wonderful stay.`)}

    ${sectionLabel('Your stay')}
    ${detailCard([
      ['Guest', data.guestName, true],
      ['Room', `${data.roomType}${data.roomNumber ? ` &middot; ${data.roomNumber}` : ''}`, true],
      ['Check-out', fmtDate(data.checkOutDate)],
      ['Status', getStatusPill('Checked In')],
    ], T.blue)}

    <div style="background:${T.bgInfoSoft};border-radius:10px;padding:14px 20px;margin-top:8px">
      <p style="margin:0;font-family:${ff};font-size:13px;color:${T.blue};line-height:1.6">&#128161; Our front desk is available 24/7 for any assistance during your stay.</p>
    </div>
  `;

  return baseTemplate({
    preheader: `Welcome to ${data.businessName} — you're checked in!`,
    businessName: data.businessName,
    bodyContent: body,
    accentColor: T.blue,
    footerNote: 'Enjoy your stay! We\'re here if you need anything.',
  });
}

// ═══════════════════════════════════════════════════════════════════
// 5. CHECK-OUT RECEIPT
// ═══════════════════════════════════════════════════════════════════

function checkOutReceiptHtml(data: CheckOutEmailData): string {
  const nights = Math.max(1, Math.ceil(
    (new Date(data.checkOutDate).getTime() - new Date(data.checkInDate).getTime()) / (1000 * 60 * 60 * 24)
  ));
  const roomCharges = data.totalAmount - data.gstAmount;

  const body = `
    ${heading('Thank you for your stay')}
    ${subtitle(`Here's your receipt from <strong style="color:${T.textPrimary}">${data.businessName}</strong>. We hope to see you again soon.`)}

    ${sectionLabel('Stay summary')}
    ${detailCard([
      ['Guest', data.guestName, true],
      ['Room', `${data.roomType}${data.roomNumber ? ` &middot; ${data.roomNumber}` : ''}`],
      ['Check-in', fmtDate(data.checkInDate)],
      ['Check-out', fmtDate(data.checkOutDate)],
      ['Duration', `${nights} night${nights > 1 ? 's' : ''}`],
    ])}

    ${sectionLabel('Invoice')}
    ${amountBlock(
      [
        ['Room charges', fmtCurrency(roomCharges)],
        ['GST', fmtCurrency(data.gstAmount)],
      ],
      'Total paid',
      fmtCurrency(data.totalAmount)
    )}

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px">
      <tr>
        <td style="font-family:${ff};font-size:13px;color:${T.textTertiary}">Payment method</td>
        <td style="font-family:${ff};font-size:13px;color:${T.textSecondary};font-weight:500;text-align:right">${data.paymentMethod} &nbsp;${getStatusPill('Paid')}</td>
      </tr>
    </table>

    ${divider()}

    <p style="margin:0;font-family:${ff};font-size:13px;color:${T.textTertiary};line-height:1.6">This email serves as your official receipt. For billing queries, simply reply to this email.</p>
  `;

  return baseTemplate({
    preheader: `Your receipt from ${data.businessName} — ${fmtCurrency(data.totalAmount)}`,
    businessName: data.businessName,
    bodyContent: body,
    footerNote: 'Thank you for choosing us. Have a safe journey!',
  });
}

// ═══════════════════════════════════════════════════════════════════
// 6. STAFF CREDENTIALS
// ═══════════════════════════════════════════════════════════════════

function staffCredentialsHtml(data: StaffCredentialsData): string {
  const loginUrl = data.subdomain
    ? `https://${data.subdomain}.triplooper.com/admin/login`
    : 'https://triplooper.com/admin/login';
  const roleName = data.role.replace(/_/g, ' ');

  const body = `
    ${heading(`Welcome to ${data.businessName}`)}
    ${subtitle(`You've been added as <strong style="color:${T.textPrimary}">${roleName}</strong> staff. Your account is ready to use.`)}

    ${sectionLabel('Your profile')}
    ${detailCard([
      ['Name', data.name, true],
      ['Role', roleName],
      ['Email', data.email],
      ['Phone', data.phone],
    ])}

    ${sectionLabel('Login credentials')}
    <div style="background:${T.bgMuted};border-radius:12px;padding:20px 24px;margin:16px 0;border:1px solid ${T.borderAccent}">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">
        <tr>
          <td style="padding:8px 0;font-family:${ff};font-size:13px;color:${T.textTertiary}">Login URL</td>
          <td style="padding:8px 0;font-family:${ff};font-size:13px;color:${T.accent};font-weight:500;text-align:right;word-break:break-all"><a href="${loginUrl}" style="color:${T.accent};text-decoration:none">${loginUrl}</a></td>
        </tr>
        <tr><td colspan="2" style="padding:4px 0"><div style="height:1px;background:${T.border}"></div></td></tr>
        <tr>
          <td style="padding:8px 0;font-family:${ff};font-size:13px;color:${T.textTertiary}">Email</td>
          <td style="padding:8px 0;font-family:${mono};font-size:14px;color:${T.textPrimary};font-weight:600;text-align:right">${data.email}</td>
        </tr>
        <tr><td colspan="2" style="padding:4px 0"><div style="height:1px;background:${T.border}"></div></td></tr>
        <tr>
          <td style="padding:8px 0;font-family:${ff};font-size:13px;color:${T.textTertiary}">Password</td>
          <td style="padding:8px 0;font-family:${mono};font-size:14px;color:${T.textPrimary};font-weight:600;text-align:right;letter-spacing:0.5px">${data.password}</td>
        </tr>
      </table>
    </div>

    <div style="background:${T.bgWarnSoft};border-radius:10px;padding:14px 20px;margin-top:8px">
      <p style="margin:0;font-family:${ff};font-size:13px;color:${T.orange};line-height:1.6;font-weight:500">&#9888;&#65039; Please change your password after your first login for security.</p>
    </div>
  `;

  return baseTemplate({
    preheader: `Your staff login for ${data.businessName} is ready`,
    businessName: data.businessName,
    bodyContent: body,
    ctaText: 'Login Now &rarr;',
    ctaUrl: loginUrl,
    footerNote: 'This email contains sensitive information. Do not forward it to anyone.',
  });
}

// ═══════════════════════════════════════════════════════════════════
// 7. BOOKING STATUS CHANGE
// ═══════════════════════════════════════════════════════════════════

function bookingStatusChangeHtml(data: BookingStatusChangeData): string {
  const refId = `#${data.reservationId.slice(0, 8).toUpperCase()}`;
  const body = `
    ${heading('Booking Updated')}
    ${subtitle(`A reservation at <strong style="color:${T.textPrimary}">${data.businessName}</strong> has been updated.`)}

    ${sectionLabel('Updated reservation')}
    ${detailCard([
      ['Reference', refId, true],
      ['Guest', data.guestName, true],
      ['Room', data.roomType],
      ['Check-in', fmtDate(data.checkIn)],
      ['Check-out', fmtDate(data.checkOut)],
      ['New status', getStatusPill(data.newStatus)],
    ], T.orange)}
  `;

  return baseTemplate({
    preheader: `Booking status: ${data.newStatus} — ${data.guestName} at ${data.businessName}`,
    businessName: data.businessName,
    bodyContent: body,
    accentColor: T.orange,
    footerNote: 'Manage all reservations from your Triplooper dashboard.',
  });
}

// ═══════════════════════════════════════════════════════════════════
// 8. BUSINESS INVITE
// ═══════════════════════════════════════════════════════════════════

function businessInviteHtml(data: BusinessInviteData): string {
  const body = `
    ${heading('You Have Been Invited to Triplooper')}
    ${subtitle(`You have been invited to manage <strong style="color:${T.textPrimary}">${data.businessName}</strong> on Triplooper, the premium property management platform.`)}

    ${sectionLabel('Invite details')}
    ${detailCard([
      ['Role', 'Business Operator', true],
      ['Package', `Up to ${data.maxProperties} propert${data.maxProperties > 1 ? 'ies' : 'y'}`],
    ], T.accent)}

    <div style="margin-top: 16px;">
      <p style="margin:0 0 16px;font-family:${ff};font-size:14px;color:${T.textSecondary};line-height:1.7;">Click the secure link below to accept your invitation and create your operator account:</p>
    </div>
  `;

  return baseTemplate({
    preheader: `You have been invited to manage ${data.businessName} on Triplooper`,
    businessName: data.businessName,
    bodyContent: body,
    accentColor: T.accent,
    ctaText: 'Accept Invitation &rarr;',
    ctaUrl: data.inviteUrl,
    footerNote: 'This invitation is exclusive to your email. If you did not expect this, simply ignore it.',
  });
}

// ═══════════════════════════════════════════════════════════════════
// VERIFICATION EMAILS (manual document review outcome)
// ═══════════════════════════════════════════════════════════════════

export interface VerificationApprovedData {
  email: string;
  businessName: string;
  loginUrl?: string;
}

export interface VerificationRejectedData {
  email: string;
  businessName: string;
  reason: string;
  reuploadUrl?: string;
}

function verificationApprovedHtml(data: VerificationApprovedData): string {
  const body = `
    ${heading('Your documents are verified')}
    ${subtitle(`Great news — the documents for <strong style="color:${T.textPrimary}">${data.businessName}</strong> have been reviewed and approved by the Triplooper team. Your account is now fully active.`)}

    ${sectionLabel('Status')}
    <div style="margin:8px 0 24px;">
      ${statusPill('Verified', T.green, T.bgInfoSoft)}
    </div>

    <p style="margin:0 0 16px;font-family:${ff};font-size:14px;color:${T.textSecondary};line-height:1.7;">You can now sign in and start managing your property — set up rooms, publish your website, and take bookings.</p>
  `;

  return baseTemplate({
    preheader: `Your documents are verified — you can now use Triplooper`,
    businessName: data.businessName,
    bodyContent: body,
    accentColor: T.accent,
    ctaText: 'Go to your dashboard &rarr;',
    ctaUrl: data.loginUrl || 'https://triplooper.com/admin/login',
    footerNote: 'Welcome aboard. If you have any questions, just reply to this email.',
  });
}

function verificationRejectedHtml(data: VerificationRejectedData): string {
  const body = `
    ${heading('We need another look at your documents')}
    ${subtitle(`Thank you for submitting documents for <strong style="color:${T.textPrimary}">${data.businessName}</strong>. After review, we were unable to verify your account just yet.`)}

    ${sectionLabel('Status')}
    <div style="margin:8px 0 24px;">
      ${statusPill('Action needed', T.red, T.bgDangerSoft)}
    </div>

    ${sectionLabel('Reason')}
    <div style="background:${T.bgOuter};padding:20px 24px;margin:8px 0 24px;border:1px solid ${T.border};border-left:3px solid ${T.red};border-radius:4px;">
      <p style="margin:0;font-family:${ff};font-size:14px;color:${T.textSecondary};line-height:1.7;">${data.reason}</p>
    </div>

    <p style="margin:0 0 16px;font-family:${ff};font-size:14px;color:${T.textSecondary};line-height:1.7;">Please sign in and re-upload the corrected document. Our team will review it again promptly.</p>
  `;

  return baseTemplate({
    preheader: `Your Triplooper verification needs another document`,
    businessName: data.businessName,
    bodyContent: body,
    accentColor: T.accent,
    ctaText: 'Re-upload documents &rarr;',
    ctaUrl: data.reuploadUrl || 'https://triplooper.com/admin/verification',
    footerNote: 'If you believe this is a mistake, simply reply to this email and we will help.',
  });
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTED TRIGGERS (fire-and-forget)
// ═══════════════════════════════════════════════════════════════════

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  if (!data.email) return false;
  return sendResendEmail(data.email, `Welcome to Triplooper, ${data.businessName}!`, welcomeEmailHtml(data));
}

export async function sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
  if (!data.guestEmail) return false;
  return sendResendEmail(data.guestEmail, `Booking confirmed — ${data.guestName} at ${data.businessName}`, bookingConfirmationHtml(data));
}

export async function sendBookingCancelled(data: BookingCancelledData): Promise<boolean> {
  if (!data.guestEmail) return false;
  return sendResendEmail(data.guestEmail, `Booking cancelled — ${data.businessName}`, bookingCancelledHtml(data));
}

export async function sendCheckInEmail(data: CheckInEmailData): Promise<boolean> {
  if (!data.guestEmail) return false;
  return sendResendEmail(data.guestEmail, `Welcome to ${data.businessName} — You're checked in!`, checkInConfirmationHtml(data));
}

export async function sendCheckOutEmail(data: CheckOutEmailData): Promise<boolean> {
  if (!data.guestEmail) return false;
  return sendResendEmail(data.guestEmail, `Your receipt from ${data.businessName}`, checkOutReceiptHtml(data));
}

export async function sendStaffCredentials(data: StaffCredentialsData): Promise<boolean> {
  if (!data.email) return false;
  return sendResendEmail(data.email, `Your login for ${data.businessName} — Triplooper`, staffCredentialsHtml(data));
}

export async function sendBookingStatusChange(data: BookingStatusChangeData): Promise<boolean> {
  if (!data.guestEmail) return false;
  return sendResendEmail(data.guestEmail, `Booking update: ${data.newStatus} — ${data.businessName}`, bookingStatusChangeHtml(data));
}

export async function sendBusinessInvite(data: BusinessInviteData): Promise<boolean> {
  if (!data.email) return false;
  return sendResendEmail(
    data.email,
    `You're invited to manage ${data.businessName} on Triplooper`,
    businessInviteHtml(data)
  );
}

export async function sendVerificationApproved(data: VerificationApprovedData): Promise<boolean> {
  if (!data.email) return false;
  return sendResendEmail(
    data.email,
    `Your documents are verified — welcome to Triplooper`,
    verificationApprovedHtml(data)
  );
}

export async function sendVerificationRejected(data: VerificationRejectedData): Promise<boolean> {
  if (!data.email) return false;
  return sendResendEmail(
    data.email,
    `Action needed: your Triplooper verification`,
    verificationRejectedHtml(data)
  );
}
