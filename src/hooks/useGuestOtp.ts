import { useCallback, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export type OtpPurpose = 'my_stays' | 'portal';

interface RequestArgs {
  phone?: string;
  token?: string;
}

interface VerifyResult {
  success: boolean;
  stays?: unknown[];
  error?: string;
}

/**
 * Drives the guest WhatsApp-OTP flow against the `guest-otp` edge function.
 * UI-agnostic: pages own their own styling and just call these methods.
 */
export function useGuestOtp(purpose: OtpPurpose) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const argsRef = useRef<RequestArgs>({});

  const startCooldown = useCallback((seconds = 30) => {
    setResendIn(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1 && timerRef.current) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }, []);

  const requestCode = useCallback(async (args: RequestArgs): Promise<boolean> => {
    setError(null);
    setSending(true);
    argsRef.current = args;
    try {
      const { data, error: fnError } = await supabase.functions.invoke('guest-otp', {
        body: { action: 'request', purpose, ...args },
      });
      if (fnError) throw fnError;
      const res = data as { success?: boolean; error?: string };
      if (!res?.success) { setError(res?.error || 'Could not send code.'); return false; }
      setStep('verify');
      startCooldown();
      return true;
    } catch (e: any) {
      setError(e?.message || 'Could not send code. Please try again.');
      return false;
    } finally {
      setSending(false);
    }
  }, [purpose, startCooldown]);

  const verifyCode = useCallback(async (code: string): Promise<VerifyResult> => {
    setError(null);
    setVerifying(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('guest-otp', {
        body: { action: 'verify', purpose, code, ...argsRef.current },
      });
      if (fnError) throw fnError;
      const res = data as VerifyResult;
      if (!res?.success) { setError(res?.error || 'Verification failed.'); return { success: false }; }
      return res;
    } catch (e: any) {
      setError(e?.message || 'Verification failed. Please try again.');
      return { success: false };
    } finally {
      setVerifying(false);
    }
  }, [purpose]);

  const resend = useCallback(() => {
    if (resendIn > 0) return Promise.resolve(false);
    return requestCode(argsRef.current);
  }, [requestCode, resendIn]);

  const reset = useCallback(() => {
    setStep('request');
    setError(null);
    setResendIn(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { step, sending, verifying, error, resendIn, requestCode, verifyCode, resend, reset };
}
