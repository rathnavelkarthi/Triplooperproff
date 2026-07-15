import React, { useState } from 'react';
import { MessageCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useGuestOtp, OtpPurpose } from '../../hooks/useGuestOtp';

interface OtpGateProps {
  purpose: OtpPurpose;
  /** Portal gate passes token; my_stays gate lets the guest type a phone. */
  token?: string;
  /** Prefilled/known phone (portal shows a masked hint instead of an input). */
  phoneHint?: string;
  theme?: 'light' | 'dark';
  title?: string;
  subtitle?: string;
  /** Fired with the verify response payload on success. */
  onVerified: (result: { stays?: unknown[] }) => void;
}

function maskPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.length < 4) return '••••';
  return `••• ••• ${d.slice(-4)}`;
}

/**
 * WhatsApp OTP gate shared by /my-stays and the /guest/:token portal.
 * `light` = the gold/navy My-Stays palette; `dark` = the zinc portal palette.
 */
export default function OtpGate({
  purpose, token, phoneHint, theme = 'light', title, subtitle, onVerified,
}: OtpGateProps) {
  const otp = useGuestOtp(purpose);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const dark = theme === 'dark';
  const shell = dark
    ? 'bg-zinc-900/50 backdrop-blur-md border border-zinc-800 text-zinc-100'
    : 'bg-white border border-gray-100 shadow-sm text-[#0E2A38]';
  const label = dark
    ? 'text-zinc-400'
    : 'text-gray-400';
  const inputCls = dark
    ? 'w-full px-4 h-12 rounded-xl bg-zinc-950/60 border border-zinc-800 text-white text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all'
    : 'w-full px-4 h-12 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#C9A646] focus:ring-2 focus:ring-[#C9A646]/20 transition-all';
  const btnCls = dark
    ? 'w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.99]'
    : 'w-full h-12 bg-[#0E2A38] hover:bg-[#123545] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-[#0E2A38]/15 disabled:opacity-50 transition-all active:scale-[0.99]';
  const accent = dark ? 'text-emerald-400' : 'text-[#C9A646]';
  const iconWrap = dark
    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
    : 'bg-[#0E2A38] text-[#C9A646] shadow-lg shadow-[#0E2A38]/15';

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purpose === 'my_stays') {
      await otp.requestCode({ phone });
    } else {
      await otp.requestCode({ token });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await otp.verifyCode(code);
    if (res.success) onVerified({ stays: res.stays });
  };

  const spinner = (c: string) => <span className={`w-4 h-4 border-2 ${c} rounded-full animate-spin`} />;

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="text-center mb-8">
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-5 ${iconWrap}`}>
          {otp.step === 'request' ? <MessageCircle size={26} /> : <ShieldCheck size={26} />}
        </div>
        <h1 className={`text-3xl font-bold mb-2 ${dark ? '' : 'font-playfair'}`}>
          {title || (otp.step === 'request' ? 'Verify it’s you' : 'Enter code')}
        </h1>
        <p className={`${label} text-sm max-w-xs mx-auto leading-relaxed`}>
          {otp.step === 'request'
            ? (subtitle || 'We’ll send a one-time code to your WhatsApp to confirm your identity.')
            : `Enter the 6-digit code we sent on WhatsApp${purpose === 'portal' && phoneHint ? ` to ${maskPhone(phoneHint)}` : ''}.`}
        </p>
      </div>

      <div className={`rounded-3xl p-8 space-y-5 ${shell}`}>
        {otp.step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-5">
            {purpose === 'my_stays' ? (
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${label}`}>WhatsApp number</label>
                <input
                  type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210" autoFocus className={inputCls}
                />
              </div>
            ) : (
              <p className={`text-sm text-center ${label}`}>
                Code goes to the WhatsApp number on your booking{phoneHint ? `: ${maskPhone(phoneHint)}` : ''}.
              </p>
            )}
            {otp.error && <p className="text-xs text-red-500 text-center">{otp.error}</p>}
            <button type="submit" disabled={otp.sending} className={btnCls}>
              {otp.sending ? spinner(dark ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white')
                : <><span>Send code</span><ArrowRight size={14} className={accent} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="space-y-1.5">
              <label className={`block text-[11px] font-bold uppercase tracking-wider ${label}`}>6-digit code</label>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••" autoFocus
                className={`${inputCls} tracking-[0.5em] text-center font-bold text-lg`}
              />
            </div>
            {otp.error && <p className="text-xs text-red-500 text-center">{otp.error}</p>}
            <button type="submit" disabled={otp.verifying || code.length < 6} className={btnCls}>
              {otp.verifying ? spinner(dark ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white')
                : <><span>Verify</span><ArrowRight size={14} className={accent} /></>}
            </button>
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className={label}>Didn't get it?</span>
              <button type="button" onClick={() => otp.resend()} disabled={otp.resendIn > 0}
                className={`font-semibold ${accent} disabled:opacity-40`}>
                {otp.resendIn > 0 ? `Resend in ${otp.resendIn}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
