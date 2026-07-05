import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import { sendWelcomeEmail } from '../lib/email';
import { supabase } from '../lib/supabaseClient';
import { useClerk, useSignIn } from '@clerk/react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Building2, UtensilsCrossed, Layers, ArrowRight, Check, Mail,
    CheckCircle2, ShieldCheck, Wallet, CalendarCheck, MessageCircle,
    TrendingUp, Star, ChevronDown, Clock, BadgeCheck, Globe, Sparkles, MapPin,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Triplooper brand tokens (single source of truth — mirrors
   index.css). Booking.com conversion layout, Triplooper palette.
   ───────────────────────────────────────────────────────────── */
const C = {
    teal: '#0E2A38',
    tealRaised: '#123545',
    tealDeep: '#081B26',
    ink: '#0A1612',
    gold: '#C9A646',
    goldDeep: '#B08B47',
    cream: '#FDFBF7',
    line: '#E7E1D6',
    muted: '#5A6B72',
};

/* ─────────────────────────────────────────────────────────────
   Imagery. Served from the Unsplash CDN (same external-CDN model
   the app already uses for Clerk / Supabase / Google Fonts). Every
   URL is size- and quality-capped so the hero stays fast.
   ───────────────────────────────────────────────────────────── */
const U = (id: string, w = 1200) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const IMG = {
    hero: U('1566073771259-6a8506099945', 1920),
    receptionPanel: U('1564501049412-61c2a3083791', 1100),
    diningPanel: U('1414235077428-338989a2e8c0', 1100),
    ctaBg: U('1520250497591-112f2f40a3f4', 1600),
};

const SHOWCASE: { img: string; name: string; loc: string; rating: string; tag: string }[] = [
    { img: U('1582719508461-905c673771fd', 640), name: 'Serai Backwater Villa', loc: 'Alleppey, Kerala', rating: '4.9', tag: 'Villa' },
    { img: U('1618773928121-c32242e63f39', 640), name: 'The Saffron Suites', loc: 'Udaipur, Rajasthan', rating: '4.8', tag: 'Hotel' },
    { img: U('1551882547-ff40c63fe5fa', 640), name: 'Cliffside Retreat', loc: 'Varkala, Kerala', rating: '4.9', tag: 'Resort' },
    { img: U('1611892440504-42a792e24d32', 640), name: 'Cedar House Homestay', loc: 'Manali, Himachal', rating: '4.7', tag: 'Homestay' },
    { img: U('1445019980597-93fa8acb246c', 640), name: 'Coastal Table & Rooms', loc: 'Panjim, Goa', rating: '4.8', tag: 'Hotel + Dining' },
    { img: U('1571896349842-33c89424de2d', 640), name: 'The Heritage Haveli', loc: 'Jaipur, Rajasthan', rating: '5.0', tag: 'Boutique' },
];

const GRAIN =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const GoogleIcon = () => (
    <svg width="17" height="17" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107" />
        <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00" />
        <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50" />
        <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2" />
    </svg>
);

type BusinessType = 'hotel' | 'restaurant' | 'combined';

const businessTypes: { type: BusinessType; icon: React.ElementType; label: string; desc: string }[] = [
    { type: 'hotel', icon: Building2, label: 'Hotel / Resort', desc: 'Rooms, direct bookings, check-ins' },
    { type: 'restaurant', icon: UtensilsCrossed, label: 'Restaurant POS', desc: 'QR menus, tables, guest dining' },
    { type: 'combined', icon: Layers, label: 'Hotel + Restaurant', desc: 'Full stay property & culinary POS' },
];

/* Rotating headline word (Booking-style). Respects reduced motion. */
const ROTATING = ['hotel', 'villa', 'homestay', 'resort', 'restaurant'];
function RotatingWord() {
    const [i, setI] = useState(0);
    useEffect(() => {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduced) return;
        const id = window.setInterval(() => setI((v) => (v + 1) % ROTATING.length), 2200);
        return () => window.clearInterval(id);
    }, []);
    return (
        <span className="relative inline-block align-baseline" style={{ color: C.gold }}>
            <AnimatePresence mode="wait">
                <motion.span
                    key={ROTATING[i]}
                    initial={{ y: '0.5em', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-0.5em', opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-block italic font-playfair"
                >
                    {ROTATING[i]}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

export default function Signup() {
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessType, setBusinessType] = useState<BusinessType>('hotel');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [signupComplete, setSignupComplete] = useState(false);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [verifyCode, setVerifyCode] = useState('');
    const [googleLoading, setGoogleLoading] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Invite flow
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('invite');
    const [inviteData, setInviteData] = useState<{ email: string; business_name: string; max_properties: number } | null>(null);
    const [, setInviteLoading] = useState(!!inviteToken);

    const { signup, verifyEmail } = useAuth();
    const clerk = useClerk();
    const { signIn, fetchStatus } = useSignIn();
    const navigate = useNavigate();

    // Nav goes transparent over the dark hero, solid once the user scrolls.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Load invite data if token present
    useEffect(() => {
        if (!inviteToken) return;
        (async () => {
            const { data } = await supabase
                .from('business_invites')
                .select('email, business_name, max_properties, status')
                .eq('token', inviteToken)
                .single();

            if (data && data.status === 'pending') {
                setInviteData(data);
                setEmail(data.email);
                setBusinessName(data.business_name);
                setStep(2);
            } else {
                setError(data ? 'This invite has already been used.' : 'Invalid invite link.');
            }
            setInviteLoading(false);
        })();
    }, [inviteToken]);

    const handleStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessName.trim()) {
            setError('Business name is required.');
            return;
        }
        setError('');
        setStep(2);
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            setIsLoading(false);
            return;
        }

        const result = await signup(email, password, businessName, businessType);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else if (result.needsVerification) {
            setNeedsVerification(true);
            setIsLoading(false);
        } else {
            sendWelcomeEmail({ email, businessName, businessType });
            if (inviteToken) {
                await supabase.from('business_invites').update({ status: 'accepted' }).eq('token', inviteToken);
            }
            setSignupComplete(true);
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!verifyCode.trim() || verifyCode.length < 4) {
            setError('Please enter the verification code from your email.');
            setIsLoading(false);
            return;
        }

        const result = await verifyEmail(verifyCode.trim(), businessName, businessType);

        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            sendWelcomeEmail({ email, businessName, businessType });
            window.location.href = '/admin/dashboard';
        }
    };

    const handleGoogleSignup = async () => {
        setError('');
        setGoogleLoading(true);
        try {
            const ready = await new Promise<boolean>((resolve) => {
                if (signIn) return resolve(true);
                const start = Date.now();
                const iv = setInterval(() => {
                    if (signIn) { clearInterval(iv); resolve(true); }
                    else if (Date.now() - start > 10000) { clearInterval(iv); resolve(false); }
                }, 100);
            });
            if (!ready || !signIn) {
                setError('Authentication service failed to load. Please refresh the page.');
                setGoogleLoading(false);
                return;
            }
            localStorage.setItem('pending_business_name', businessName);
            localStorage.setItem('pending_business_type', businessType);
            if (inviteToken) {
                localStorage.setItem('pending_invite_token', inviteToken);
            }

            const apexOrigin = (() => {
                const { protocol, hostname, port } = window.location;
                const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
                if (isLocalhost) return window.location.origin;
                const parts = hostname.split('.');
                const apexHost = parts.length > 2 ? parts.slice(-2).join('.') : hostname;
                return `${protocol}//${apexHost}${port ? `:${port}` : ''}`;
            })();
            await signIn.sso({
                strategy: 'oauth_google',
                redirectUrl: `${apexOrigin}/admin/dashboard`,
                redirectCallbackUrl: `${apexOrigin}/sso-callback`,
            });
        } catch (err: any) {
            setError(err?.errors?.[0]?.message || 'Google sign up failed.');
            setGoogleLoading(false);
        }
    };

    const subdomain = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30);

    const fontLink = (
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
    );

    /* ── VERIFICATION SCREEN (light, on-brand) ── */
    if (needsVerification) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFBF7] p-6 relative overflow-hidden">
                <Helmet><title>Confirm your code — Triplooper</title>{fontLink}</Helmet>
                <div className="absolute inset-0 pointer-events-none opacity-60" style={{ background: `radial-gradient(60% 50% at 50% 0%, ${C.gold}14 0%, transparent 70%)` }} />
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white border shadow-[0_30px_70px_rgba(14,42,56,0.10)] relative z-10 space-y-6"
                    style={{ borderColor: C.line }}
                >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: `${C.gold}18` }}>
                        <Mail size={24} style={{ color: C.goldDeep }} />
                    </div>
                    <div className="space-y-1.5 text-center">
                        <h2 className="text-2xl font-playfair font-bold tracking-tight" style={{ color: C.teal }}>Check your email</h2>
                        <p className="text-sm" style={{ color: C.muted }}>We sent a 6-digit confirmation key to</p>
                        <p className="text-sm font-semibold" style={{ color: C.goldDeep }}>{email}</p>
                    </div>
                    <form className="space-y-5" onSubmit={handleVerify}>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs text-center font-medium" role="alert">{error}</div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="verifyCode" className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Verification code</label>
                            <input
                                id="verifyCode"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full h-14 bg-[#FDFBF7] border rounded-xl px-4 text-center text-2xl tracking-[0.5em] font-semibold outline-none focus:ring-2 transition-all"
                                style={{ borderColor: C.line, color: C.teal }}
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 rounded-xl font-bold text-sm transition-all shadow-[0_8px_20px_rgba(14,42,56,0.22)] hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
                            style={{ background: C.teal, color: C.cream }}
                        >
                            {isLoading ? 'Verifying…' : 'Verify account'}
                        </button>
                        <p className="text-center text-xs" style={{ color: C.muted }}>
                            Didn't receive it? Check spam, or{' '}
                            <button type="button" onClick={() => { setNeedsVerification(false); setError(''); setVerifyCode(''); }} className="font-semibold hover:underline" style={{ color: C.goldDeep }}>go back</button>.
                        </p>
                    </form>
                </motion.div>
            </div>
        );
    }

    /* ── SUCCESS SCREEN (light, on-brand) ── */
    if (signupComplete) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFBF7] p-6 relative overflow-hidden">
                <Helmet><title>Account created — Triplooper</title>{fontLink}</Helmet>
                <div className="absolute inset-0 pointer-events-none opacity-60" style={{ background: `radial-gradient(60% 50% at 50% 0%, ${C.gold}14 0%, transparent 70%)` }} />
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white border shadow-[0_30px_70px_rgba(14,42,56,0.10)] relative z-10 text-center space-y-6"
                    style={{ borderColor: C.line }}
                >
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-emerald-50 border border-emerald-100">
                        <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-playfair font-bold tracking-tight" style={{ color: C.teal }}>You're all set!</h1>
                        <p className="text-sm" style={{ color: C.muted }}>Your property dashboard is fully initialized and ready.</p>
                    </div>
                    <div className="p-4 bg-[#FDFBF7] border rounded-2xl text-left" style={{ borderColor: C.line }}>
                        <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: C.muted }}>Your secure subdomain</p>
                        <p className="text-sm font-bold" style={{ color: C.goldDeep }}>{subdomain}.triplooper.com</p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/login')}
                        className="w-full h-14 rounded-xl font-bold text-sm transition-all shadow-[0_8px_20px_rgba(14,42,56,0.22)] hover:opacity-95 active:scale-[0.99]"
                        style={{ background: C.teal, color: C.cream }}
                    >
                        Sign in to your dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    /* ── The working registration card (hero + repeated). ── */
    const RegistrationCard = ({ idPrefix }: { idPrefix: string }) => (
        <div
            className="w-full max-w-md rounded-3xl bg-white border shadow-[0_40px_90px_-20px_rgba(8,27,38,0.55)] p-6 sm:p-8"
            style={{ borderColor: 'rgba(255,255,255,0.6)' }}
        >
            {/* Stepper */}
            <div className="flex items-center gap-3 mb-6">
                {[1, 2].map((n, idx) => (
                    <React.Fragment key={n}>
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
                            style={step >= n ? { background: C.teal, color: C.cream } : { background: '#F1EDE4', color: C.muted }}
                        >
                            {n}
                        </div>
                        {idx === 0 && <div className="flex-1 h-px" style={{ background: C.line }} />}
                    </React.Fragment>
                ))}
                <span className="ml-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Step {step} of 2</span>
            </div>

            <h3 className="text-xl font-playfair font-bold tracking-tight mb-1" style={{ color: C.teal }}>
                {inviteData ? 'Accept your invitation' : (step === 1 ? 'Register for free' : 'Create your account')}
            </h3>
            <p className="text-xs mb-5" style={{ color: C.muted }}>
                {inviteData ? `Finish setup for ${inviteData.business_name}` : (step === 1 ? 'List your property in minutes. No card required.' : 'Set your admin email and password.')}
            </p>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-medium text-center mb-4" role="alert">{error}</div>
            )}

            {step === 1 ? (
                <form className="space-y-5" onSubmit={handleStep1}>
                    <div className="space-y-1.5">
                        <label htmlFor={`${idPrefix}-name`} className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Property name</label>
                        <input
                            id={`${idPrefix}-name`}
                            type="text"
                            required
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="e.g. Saffron Spice Villa"
                            className="w-full h-12 bg-[#FDFBF7] border rounded-xl px-4 text-sm outline-none focus:ring-2 transition-all"
                            style={{ borderColor: C.line, color: C.teal }}
                        />
                    </div>

                    <div className="space-y-2">
                        <span className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Property type</span>
                        <div className="flex flex-col gap-2.5">
                            {businessTypes.map(({ type, icon: Icon, label, desc }) => {
                                const active = businessType === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setBusinessType(type)}
                                        aria-pressed={active}
                                        className="flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all"
                                        style={active
                                            ? { background: `${C.gold}12`, borderColor: C.gold }
                                            : { background: '#fff', borderColor: C.line }}
                                    >
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: active ? `${C.gold}1f` : '#F1EDE4' }}>
                                            <Icon size={18} style={{ color: active ? C.goldDeep : C.muted }} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold" style={{ color: active ? C.teal : '#334155' }}>{label}</p>
                                            <p className="text-[11px]" style={{ color: C.muted }}>{desc}</p>
                                        </div>
                                        {active && (
                                            <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: C.gold }}>
                                                <Check size={11} className="text-white" strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {businessName && (
                        <div className="p-3 rounded-xl border flex items-center gap-2" style={{ background: '#FDFBF7', borderColor: C.line }}>
                            <Globe size={13} style={{ color: C.goldDeep }} />
                            <p className="text-[11px]"><span style={{ color: C.muted }}>Your site: </span><span className="font-semibold" style={{ color: C.teal }}>{subdomain || 'your-property'}.triplooper.com</span></p>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_rgba(14,42,56,0.22)] hover:opacity-95 active:scale-[0.99]"
                        style={{ background: C.teal, color: C.cream }}
                    >
                        Continue <ArrowRight size={16} />
                    </button>
                </form>
            ) : (
                <form className="space-y-5" onSubmit={handleSignup}>
                    {!inviteData && (
                        <button type="button" onClick={() => setStep(1)} className="text-[11px] font-medium hover:underline flex items-center gap-1" style={{ color: C.muted }}>
                            ← Back to step 1
                        </button>
                    )}
                    <div className="space-y-1.5">
                        <label htmlFor={`${idPrefix}-email`} className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Email address</label>
                        <input
                            id={`${idPrefix}-email`}
                            type="email"
                            required
                            autoComplete="email"
                            disabled={!!inviteData}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="owner@hotelname.com"
                            className="w-full h-12 bg-[#FDFBF7] border rounded-xl px-4 text-sm outline-none focus:ring-2 transition-all disabled:opacity-60"
                            style={{ borderColor: C.line, color: C.teal }}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor={`${idPrefix}-password`} className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>Password</label>
                        <input
                            id={`${idPrefix}-password`}
                            type="password"
                            required
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full h-12 bg-[#FDFBF7] border rounded-xl px-4 text-sm outline-none focus:ring-2 transition-all"
                            style={{ borderColor: C.line, color: C.teal }}
                        />
                    </div>

                    {businessName && (
                        <div className="p-3 rounded-xl border text-[11px]" style={{ background: '#FDFBF7', borderColor: C.line, color: C.muted }}>
                            Property: <span className="font-bold" style={{ color: C.teal }}>{businessName}</span> · <span className="font-semibold" style={{ color: C.goldDeep }}>{subdomain}.triplooper.com</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 rounded-xl font-bold text-sm transition-all shadow-[0_8px_20px_rgba(14,42,56,0.22)] hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
                        style={{ background: C.teal, color: C.cream }}
                    >
                        {isLoading ? 'Creating your account…' : 'Create account'}
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px" style={{ background: C.line }} />
                        <span className="text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>or</span>
                        <div className="flex-1 h-px" style={{ background: C.line }} />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignup}
                        disabled={googleLoading}
                        className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border bg-white hover:bg-[#FDFBF7] transition-all text-sm font-semibold disabled:opacity-50"
                        style={{ borderColor: C.line, color: C.teal }}
                    >
                        <GoogleIcon />
                        {googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}
                    </button>
                </form>
            )}

            <p className="mt-6 text-center text-xs pt-4 border-t" style={{ color: C.muted, borderColor: C.line }}>
                Already have an account?{' '}
                <Link to="/admin/login" className="font-bold hover:underline" style={{ color: C.goldDeep }}>Sign in</Link>
            </p>
        </div>
    );

    const proofBullets = [
        'Go live in 15 minutes — no technical skills needed',
        'Zero subscription. A flat 12% commission on direct bookings',
        'Your own booking website, POS, and WhatsApp automations',
    ];

    return (
        <div className="min-h-screen w-full bg-white antialiased" style={{ color: C.teal, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Helmet>
                <title>List your property on Triplooper — Join free</title>
                <meta name="description" content="List your hotel, villa, homestay, or restaurant on Triplooper. Direct booking engine, channel manager, restaurant POS, and WhatsApp guest concierge — a flat 12% commission, zero subscription." />
                <link rel="canonical" href="https://triplooper.com/signup" />
                <link rel="preconnect" href="https://images.unsplash.com" />
                {fontLink}
            </Helmet>

            {/* Marquee animation (scoped keyframes) */}
            <style>{`
                @keyframes tl-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                .tl-marquee-track { animation: tl-marquee 46s linear infinite; }
                .tl-marquee-mask:hover .tl-marquee-track { animation-play-state: paused; }
                @media (prefers-reduced-motion: reduce) { .tl-marquee-track { animation: none; } }
            `}</style>

            {/* ── ADAPTIVE NAV ── */}
            <nav
                className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
                style={scrolled
                    ? { background: 'rgba(253,251,247,0.9)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.line}` }
                    : { background: 'transparent', borderBottom: '1px solid transparent' }}
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="font-playfair text-xl font-black tracking-widest transition-colors" style={{ color: scrolled ? C.teal : '#fff' }}>
                        TRIP<span style={{ color: C.gold }}>LOOPER</span>
                    </Link>
                    <div className="flex items-center gap-5 text-sm">
                        <Link to="/admin/login" className="font-semibold hover:opacity-70 transition-opacity" style={{ color: scrolled ? C.teal : 'rgba(255,255,255,0.92)' }}>Sign in</Link>
                        <a
                            href="#register"
                            className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full font-bold text-xs transition-all hover:opacity-95 shadow-lg"
                            style={scrolled ? { background: C.teal, color: C.cream } : { background: C.gold, color: C.teal }}
                        >
                            List your property
                        </a>
                    </div>
                </div>
            </nav>

            {/* ── CINEMATIC HERO ── */}
            <section id="register" className="relative overflow-hidden">
                {/* Background photograph + brand scrims */}
                <div className="absolute inset-0">
                    <img
                        src={IMG.hero}
                        alt="A luxury resort at golden hour"
                        className="w-full h-full object-cover"
                        loading="eager"
                        fetchPriority="high"
                    />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(8,27,38,0.60) 0%, rgba(14,42,56,0.78) 55%, rgba(8,27,38,0.96) 100%)` }} />
                    <div className="absolute inset-0 hidden lg:block" style={{ background: `linear-gradient(90deg, rgba(8,27,38,0.88) 0%, rgba(8,27,38,0.35) 52%, transparent 100%)` }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(70% 60% at 12% 6%, ${C.gold}2e 0%, transparent 55%)` }} />
                    <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.10]" style={{ backgroundImage: GRAIN, backgroundSize: '140px 140px' }} />
                </div>

                <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-16 lg:pt-36 lg:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left: copy */}
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-6 border" style={{ borderColor: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: C.gold, backdropFilter: 'blur(6px)' }}>
                            <Sparkles size={12} /> For hotels &amp; restaurants across India
                        </span>
                        <h1 className="font-playfair font-semibold tracking-tight leading-[1.04] text-4xl sm:text-5xl lg:text-[3.7rem] text-white">
                            List your{' '}
                            <RotatingWord />
                            <br className="hidden sm:block" />
                            {' '}on Triplooper
                        </h1>
                        <p className="mt-6 text-lg leading-relaxed max-w-xl" style={{ color: 'rgba(255,255,255,0.78)' }}>
                            Run your entire property from one platform — direct bookings, restaurant POS, guest check-in, and payments. Earn more, faster, without the OTA commission drain.
                        </p>
                        <ul className="mt-8 space-y-3.5 max-w-lg">
                            {proofBullets.map((b, i) => (
                                <motion.li
                                    key={b}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.25 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                                    className="flex items-start gap-3"
                                >
                                    <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${C.gold}33` }}>
                                        <Check size={12} strokeWidth={3} style={{ color: C.gold }} />
                                    </span>
                                    <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.92)' }}>{b}</span>
                                </motion.li>
                            ))}
                        </ul>
                        <div className="mt-9 flex items-center gap-4">
                            <div className="flex -space-x-3">
                                {[U('1507003211169-0a1dd7228f2d', 96), U('1494790108377-be9c29b29330', 96), U('1500648767791-00dcc994a43e', 96)].map((src, i) => (
                                    <img key={i} src={src} alt="" className="w-9 h-9 rounded-full object-cover border-2" style={{ borderColor: C.tealDeep }} loading="lazy" />
                                ))}
                            </div>
                            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                <span className="inline-flex items-center gap-1 font-bold" style={{ color: C.gold }}>
                                    <Star size={12} className="fill-current" /> 4.9
                                </span>
                                {' '}· trusted by 50+ Indian properties
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: registration card */}
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                        className="flex justify-center lg:justify-end"
                    >
                        <RegistrationCard idPrefix="hero" />
                    </motion.div>
                </div>
            </section>

            {/* ── TRUST STAT STRIP ── */}
            <section className="border-y" style={{ background: '#fff', borderColor: C.line }}>
                <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { icon: Clock, val: '15 min', label: 'Average time to go live' },
                        { icon: TrendingUp, val: '+35%', label: 'Direct bookings uplift' },
                        { icon: Building2, val: '50+', label: 'Properties on board' },
                        { icon: BadgeCheck, val: '12%', label: 'Flat commission, no fees' },
                    ].map((s) => (
                        <div key={s.label} className="flex flex-col items-center">
                            <s.icon size={22} style={{ color: C.gold }} />
                            <p className="mt-2 text-2xl md:text-3xl font-playfair font-bold" style={{ color: C.teal }}>{s.val}</p>
                            <p className="text-xs font-medium mt-1" style={{ color: C.muted }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── PROPERTY SHOWCASE MARQUEE ── */}
            <section className="py-20 overflow-hidden" style={{ background: C.cream }}>
                <div className="max-w-7xl mx-auto px-6 mb-12">
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.goldDeep }}>Beautiful by default</p>
                    <h2 className="text-3xl md:text-4xl font-playfair font-semibold tracking-tight max-w-2xl" style={{ color: C.teal }}>
                        Your property, presented at its very best
                    </h2>
                    <p className="mt-3 text-sm max-w-xl" style={{ color: C.muted }}>
                        Every listing gets a polished, mobile-first booking site — the kind guests trust more than an OTA page.
                    </p>
                </div>

                <div className="tl-marquee-mask relative">
                    {/* edge fades */}
                    <div className="absolute left-0 top-0 bottom-0 w-16 md:w-28 z-10 pointer-events-none" style={{ background: `linear-gradient(90deg, ${C.cream} 0%, transparent 100%)` }} />
                    <div className="absolute right-0 top-0 bottom-0 w-16 md:w-28 z-10 pointer-events-none" style={{ background: `linear-gradient(270deg, ${C.cream} 0%, transparent 100%)` }} />

                    <div className="tl-marquee-track flex gap-5 w-max">
                        {[...SHOWCASE, ...SHOWCASE].map((p, i) => (
                            <article
                                key={i}
                                className="group relative w-[280px] sm:w-[320px] shrink-0 rounded-3xl overflow-hidden border bg-white"
                                style={{ borderColor: C.line, boxShadow: '0 14px 40px rgba(14,42,56,0.10)' }}
                            >
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <img
                                        src={p.img}
                                        alt={`${p.name} in ${p.loc}`}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(8,27,38,0.72) 100%)' }} />
                                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(253,251,247,0.92)', color: C.teal }}>
                                        {p.tag}
                                    </span>
                                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(8,27,38,0.55)', color: C.gold, backdropFilter: 'blur(4px)' }}>
                                        <Star size={10} className="fill-current" /> {p.rating}
                                    </span>
                                    <div className="absolute bottom-3 left-4 right-4 text-white">
                                        <p className="font-playfair font-bold text-lg leading-tight">{p.name}</p>
                                        <p className="text-[11px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.82)' }}>
                                            <MapPin size={11} /> {p.loc}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section className="py-20 px-6" style={{ background: '#fff' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="max-w-2xl mb-14">
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.goldDeep }}>Simple to begin</p>
                        <h2 className="text-3xl md:text-4xl font-playfair font-semibold tracking-tight" style={{ color: C.teal }}>List once, run everything</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: Building2, title: 'Import your property', desc: 'Add rooms, photos, and rates — or import from other travel sites to avoid double-booking with calendar sync.' },
                            { icon: Globe, title: 'Launch your booking site', desc: 'Your branded website and subdomain go live instantly, taking commission-free direct reservations.' },
                            { icon: TrendingUp, title: 'Start earning', desc: 'Manage bookings, POS orders, and payments from one dashboard — and watch direct revenue grow.' },
                        ].map((f, i) => (
                            <div key={f.title} className="rounded-3xl bg-white border p-7 relative transition-shadow hover:shadow-[0_20px_50px_rgba(14,42,56,0.10)]" style={{ borderColor: C.line, boxShadow: '0 8px 30px rgba(14,42,56,0.05)' }}>
                                <span className="absolute top-6 right-7 font-playfair text-4xl font-bold opacity-15" style={{ color: C.teal }}>0{i + 1}</span>
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${C.gold}18` }}>
                                    <f.icon size={22} style={{ color: C.goldDeep }} />
                                </div>
                                <h3 className="text-lg font-bold mb-2" style={{ color: C.teal }}>{f.title}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── BENEFIT BLOCK 1: Host worry-free ── */}
            <BenefitBlock
                eyebrow="Host worry-free"
                title="Your property, your rules"
                image={IMG.receptionPanel}
                imageAlt="A warmly lit hotel reception ready to welcome guests"
                points={[
                    { icon: ShieldCheck, head: 'Verified guests', body: 'Automated Aadhaar/passport check-in via WhatsApp before every stay — you always know who is arriving.' },
                    { icon: MessageCircle, head: 'Talk before you commit', body: 'Pre-booking messaging and clear house rules let you set expectations up front.' },
                    { icon: CalendarCheck, head: 'No more overbookings', body: 'Two-way channel manager keeps Booking.com, Agoda, and your direct calendar in perfect sync.' },
                ]}
                ctaHref="#register"
            />

            {/* ── BENEFIT BLOCK 2: Payments (reversed) ── */}
            <BenefitBlock
                reversed
                eyebrow="Payments made easy"
                title="Take control of your revenue"
                image={IMG.diningPanel}
                imageAlt="An elegant restaurant table setting"
                points={[
                    { icon: Wallet, head: 'Direct payouts', body: 'Guests pay you directly for direct bookings. No 18% OTA leakage — just a flat 12% on what you earn.' },
                    { icon: UtensilsCrossed, head: 'Restaurant POS built in', body: 'QR dine-in menus route kitchen tickets and add F&B charges straight to the room folio.' },
                    { icon: BadgeCheck, head: 'GST-ready invoicing', body: 'Compliant billing, folios, and exportable financial reports — reconciliation without the spreadsheets.' },
                ]}
                ctaHref="#register"
            />

            {/* ── TESTIMONIALS ── */}
            <section className="py-20 px-6" style={{ background: C.cream }}>
                <div className="max-w-7xl mx-auto">
                    <div className="max-w-2xl mb-14">
                        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.goldDeep }}>Loved by operators</p>
                        <h2 className="text-3xl md:text-4xl font-playfair font-semibold tracking-tight" style={{ color: C.teal }}>Hosts growing with Triplooper</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { name: 'Rajiv Sharma', role: 'Boutique Hotel, Jaipur', avatar: U('1507003211169-0a1dd7228f2d', 128), text: 'We replaced five tools with Triplooper. Direct bookings jumped 40% in the first quarter and staff onboarding takes days, not weeks.' },
                            { name: 'Anita Desai', role: 'Resort Manager, Goa', avatar: U('1494790108377-be9c29b29330', 128), text: 'The occupancy-based pricing paid for itself in a month. During peak season our ADR rose 25% versus last year.' },
                            { name: 'Vikram Patel', role: 'Homestay Host, Pondicherry', avatar: U('1500648767791-00dcc994a43e', 128), text: 'My booking website looks like it cost ₹50,000. I set it up in 20 minutes — and guests trust it more than my OTA listing.' },
                        ].map((t) => (
                            <figure key={t.name} className="rounded-3xl bg-white border p-7 flex flex-col" style={{ borderColor: C.line, boxShadow: '0 8px 30px rgba(14,42,56,0.05)' }}>
                                <div className="flex gap-0.5 mb-5" style={{ color: C.gold }} aria-hidden="true">
                                    {[0, 1, 2, 3, 4].map((s) => <Star key={s} size={15} className="fill-current" />)}
                                </div>
                                <blockquote className="text-sm leading-relaxed flex-1 mb-6" style={{ color: C.muted }}>“{t.text}”</blockquote>
                                <figcaption className="flex items-center gap-3 pt-5 border-t" style={{ borderColor: C.line }}>
                                    <img src={t.avatar} alt={t.name} className="w-11 h-11 rounded-full object-cover" loading="lazy" />
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: C.teal }}>{t.name}</p>
                                        <p className="text-xs" style={{ color: C.muted }}>{t.role}</p>
                                    </div>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="py-20 px-6" style={{ background: '#fff' }}>
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-playfair font-semibold tracking-tight mb-10 text-center" style={{ color: C.teal }}>Your questions, answered</h2>
                    <FAQ />
                </div>
            </section>

            {/* ── FINAL CTA (image + deep teal overlay) ── */}
            <section className="relative py-24 px-6 overflow-hidden">
                <div className="absolute inset-0">
                    <img src={IMG.ctaBg} alt="" className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(14,42,56,0.94) 0%, rgba(8,27,38,0.97) 100%)` }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(60% 60% at 50% 0%, ${C.gold}24 0%, transparent 60%)` }} />
                </div>
                <div className="relative max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-playfair font-semibold tracking-tight text-white leading-tight mb-5">
                        Start welcoming guests today
                    </h2>
                    <p className="text-base md:text-lg mb-9 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.68)' }}>
                        Join operators across India who replaced six tools with one platform. Free to start, flat 12% commission.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <a href="#register" className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full text-base font-bold transition-all hover:opacity-95 shadow-xl" style={{ background: C.gold, color: C.teal }}>
                            Register for free <ArrowRight size={18} />
                        </a>
                        <a href="https://wa.me/919345244727?text=Hi%2C%20I%20would%20like%20to%20book%20a%20demo%20for%20Triplooper" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full text-base font-semibold border-2 transition-all hover:bg-white/10 text-white" style={{ borderColor: 'rgba(255,255,255,0.28)' }}>
                            Book a demo
                        </a>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="py-10 px-6" style={{ background: C.tealDeep }}>
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <Link to="/" className="font-playfair text-lg font-black tracking-widest text-white">
                        TRIP<span style={{ color: C.gold }}>LOOPER</span>
                    </Link>
                    <div className="flex gap-6 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <Link to="/" className="hover:text-white/70 transition-colors">Home</Link>
                        <Link to="/admin/login" className="hover:text-white/70 transition-colors">Sign in</Link>
                        <a href="https://wa.me/919345244727" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">Contact</a>
                    </div>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>© {new Date().getFullYear()} Triplooper. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

/* ── Alternating benefit block (real image panel + point list + CTA) ── */
function BenefitBlock({
    eyebrow, title, points, ctaHref, image, imageAlt, reversed = false,
}: {
    eyebrow: string;
    title: string;
    points: { icon: React.ElementType; head: string; body: string }[];
    ctaHref: string;
    image: string;
    imageAlt: string;
    reversed?: boolean;
}) {
    return (
        <section className="py-20 px-6" style={{ background: C.cream }}>
            <div className={`max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${reversed ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                {/* Visual panel — real photograph with brand scrim + floating feature pills */}
                <div className="rounded-3xl border overflow-hidden relative aspect-[4/3]" style={{ borderColor: C.line, boxShadow: '0 24px 60px rgba(14,42,56,0.16)' }}>
                    <img src={image} alt={imageAlt} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(155deg, rgba(8,27,38,0.35) 0%, rgba(8,27,38,0.72) 100%)` }} />
                    <div className="absolute inset-0" style={{ background: `radial-gradient(80% 80% at 30% 20%, ${C.gold}22 0%, transparent 60%)` }} />
                    <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between">
                        <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
                            <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
                            <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
                        </div>
                        <div className="space-y-3">
                            {points.map((p) => (
                                <div key={p.head} className="flex items-center gap-3 rounded-2xl bg-white/12 backdrop-blur-md border border-white/15 px-4 py-3">
                                    <p.icon size={18} style={{ color: C.gold }} />
                                    <span className="text-sm font-semibold text-white">{p.head}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Copy */}
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.goldDeep }}>{eyebrow}</p>
                    <h2 className="text-3xl md:text-4xl font-playfair font-semibold tracking-tight mb-8" style={{ color: C.teal }}>{title}</h2>
                    <div className="space-y-6 mb-9">
                        {points.map((p) => (
                            <div key={p.head} className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${C.gold}18` }}>
                                    <p.icon size={18} style={{ color: C.goldDeep }} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold mb-1" style={{ color: C.teal }}>{p.head}</h3>
                                    <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{p.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <a href={ctaHref} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold transition-all hover:opacity-95 shadow-[0_8px_20px_rgba(14,42,56,0.22)]" style={{ background: C.teal, color: C.cream }}>
                        List your property <ArrowRight size={16} />
                    </a>
                </div>
            </div>
        </section>
    );
}

/* ── FAQ accordion ── */
function FAQ() {
    const [open, setOpen] = useState<number | null>(0);
    const faqs = [
        { q: 'Is there a subscription fee or setup charge?', a: 'No. Triplooper has zero monthly fees, setup costs, or licensing charges. We operate on a flat 12% commission on the revenue generated through bookings placed on the platform.' },
        { q: 'How does WhatsApp check-in verify guest identity?', a: 'When a guest books, our engine sends a secure WhatsApp link. The guest uploads their Aadhaar or passport, which our OCR verifies in real time — no manual paperwork at the front desk.' },
        { q: 'Can I connect existing OTAs like Booking.com?', a: 'Yes. Our two-way channel manager syncs availability across all major OTAs in real time to prevent overbookings, and imports your existing review scores.' },
        { q: 'When will my property go online?', a: 'As soon as you finish creating your listing you can open for bookings. You can use the extranet to get familiar with the dashboard and prepare for your first guests.' },
    ];
    return (
        <div className="space-y-3">
            {faqs.map((f, i) => {
                const isOpen = open === i;
                return (
                    <div key={f.q} className="rounded-2xl border overflow-hidden" style={{ borderColor: C.line, background: C.cream }}>
                        <button
                            onClick={() => setOpen(isOpen ? null : i)}
                            aria-expanded={isOpen}
                            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                        >
                            <span className="text-sm font-bold" style={{ color: C.teal }}>{f.q}</span>
                            <ChevronDown size={18} className="shrink-0 transition-transform duration-300" style={{ color: C.goldDeep, transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                        </button>
                        <AnimatePresence initial={false}>
                            {isOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                    className="overflow-hidden"
                                >
                                    <p className="px-5 pb-5 text-sm leading-relaxed" style={{ color: C.muted }}>{f.a}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
