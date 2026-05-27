import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import { sendWelcomeEmail } from '../lib/email';
import { supabase } from '../lib/supabaseClient';
import { useClerk, useSignIn } from '@clerk/react';
import { motion } from 'motion/react';
import { Building, UtensilsCrossed, Layers, ArrowRight, Check, Mail } from 'lucide-react';

const GoogleIcon = () => (
    <svg width="17" height="17" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107" />
        <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00" />
        <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50" />
        <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2" />
    </svg>
);

type BusinessType = 'hotel' | 'restaurant' | 'combined';

const businessTypes: { type: BusinessType; icon: React.ElementType; label: string; desc: string }[] = [
    { type: 'hotel', icon: Building, label: 'Hotel / Resort', desc: 'Rooms, bookings, guest management' },
    { type: 'restaurant', icon: UtensilsCrossed, label: 'Restaurant', desc: 'Menu, POS, table reservations' },
    { type: 'combined', icon: Layers, label: 'Hotel + Restaurant', desc: 'Full property with stays and dining' },
];

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

    // Invite flow
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('invite');
    const [inviteData, setInviteData] = useState<{ email: string; business_name: string; max_properties: number } | null>(null);
    const [inviteLoading, setInviteLoading] = useState(!!inviteToken);

    const { signup, verifyEmail } = useAuth();
    const clerk = useClerk();
    const { signIn, fetchStatus } = useSignIn();
    const signInLoaded = !!signIn && fetchStatus !== 'fetching';
    const navigate = useNavigate();

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
                setStep(2); // skip business info step, go straight to account creation
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
            // Mark invite as accepted
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
            // Success - AuthContext.verifyEmail already handled property linkage 
            // and the unified onboarding logic will follow after the redirect reloads state.
            sendWelcomeEmail({ email, businessName, businessType });
            
            // Hard redirect so the page reloads and picks up the new Clerk session
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

            // Always perform OAuth on the apex domain (e.g. esaystay.com) — not a tenant
            // subdomain — so the signed-in Clerk session lands where /admin/* is served.
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

    // Success screen
    if (signupComplete) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0E2A38] to-[#071A24] p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md text-center"
                >
                    <div className="w-16 h-16 rounded-2xl bg-[#2E7D5B]/20 border border-[#2E7D5B]/30 flex items-center justify-center mx-auto mb-6">
                        <Check size={28} className="text-[#2E7D5B]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#F7F4EF] mb-3">Account ready!</h1>
                    <p className="text-[#AAB8C5] text-sm mb-2">
                        Email verified. Your workspace is set up.
                    </p>
                    <p className="text-[#AAB8C5]/60 text-xs mb-8">
                        Your subdomain: <span className="text-[#C9A646] font-medium">{subdomain}.esaystay.com</span>
                    </p>
                    <button
                        onClick={() => navigate('/admin/login')}
                        className="px-6 py-3 bg-[#C9A646] hover:bg-[#B89535] text-white font-semibold rounded-lg transition-colors text-sm"
                    >
                        Go to login
                    </button>
                </motion.div>
            </div>
        );
    }

    // Verification screen
    if (needsVerification) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0E2A38] to-[#071A24] p-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md p-8 rounded-2xl bg-[#0E2A38]/20 backdrop-blur-xl border border-[#AAB8C5]/10 shadow-[0_40px_120px_rgba(0,0,0,0.25)]"
                >
                    <div className="w-14 h-14 rounded-2xl bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center mx-auto mb-6">
                        <Mail size={24} className="text-[#C9A646]" />
                    </div>
                    <h2 className="text-xl font-bold text-[#F7F4EF] text-center mb-2">Check your email</h2>
                    <p className="text-[#AAB8C5] text-sm text-center mb-1">
                        We sent a 6-digit code to
                    </p>
                    <p className="text-[#C9A646] text-sm font-medium text-center mb-8">{email}</p>

                    <form className="space-y-5" onSubmit={handleVerify}>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-[13px] text-center font-medium">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-[12px] text-[#AAB8C5] font-medium uppercase tracking-widest mb-2">Verification code</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full bg-[#0E2A38]/30 border border-[#AAB8C5]/20 rounded-lg px-4 py-3 text-[#F7F4EF] placeholder-[#AAB8C5]/30 outline-none focus:border-[#C9A646]/50 focus:ring-1 focus:ring-[#C9A646]/20 transition-all text-2xl tracking-[0.5em] text-center font-mono"
                                autoFocus
                            />
                        </div>

                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-[#C9A646] hover:bg-[#B89535] text-white font-semibold py-3.5 rounded-lg transition-all shadow-[0_4px_14px_rgba(201,166,70,0.3)] text-sm disabled:opacity-50"
                        >
                            {isLoading ? 'Verifying...' : 'Verify email'}
                        </motion.button>

                        <p className="text-center text-[12px] text-[#AAB8C5]/60">
                            Didn't receive it? Check your spam folder, or{' '}
                            <button
                                type="button"
                                onClick={() => { setNeedsVerification(false); setError(''); setVerifyCode(''); }}
                                className="text-[#C9A646] hover:text-[#F7F4EF] transition-colors"
                            >
                                go back
                            </button>.
                        </p>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0C2230] relative overflow-hidden font-sans">
            <Helmet>
                <title>Sign Up Free - EasyStay | Hotel & Restaurant Management</title>
                <meta name="description" content="Create your free EasyStay account. Set up your hotel or restaurant in minutes with bookings, POS, website, and analytics — all in one platform." />
                <link rel="canonical" href="https://esaystay.com/signup" />
                <meta property="og:title" content="Sign Up Free - EasyStay" />
                <meta property="og:description" content="Create your free account. Set up your hotel or restaurant in minutes." />
                <meta property="og:url" content="https://esaystay.com/signup" />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary" />
            </Helmet>
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0E2A38] to-[#071A24] z-0" />
            <div className="absolute left-0 md:left-[5%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0E2A38] rounded-full blur-[100px] opacity-40 pointer-events-none z-0" />

            {/* LEFT: progress & preview */}
            <div className="relative z-10 w-full md:w-[45%] p-8 md:p-16 lg:px-24 flex flex-col justify-center border-b md:border-b-0 md:border-r border-[#AAB8C5]/5 order-2 md:order-1 min-h-[40vh] md:min-h-screen">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="flex-1 flex flex-col justify-center"
                >
                    <h1 className="text-[36px] md:text-[48px] font-extrabold text-[#F7F4EF] leading-tight mb-2 tracking-tight">
                        Hospitality<span className="text-[#C9A646]">OS</span>
                    </h1>
                    <p className="text-[#AAB8C5] text-[15px] max-w-[400px] leading-relaxed mb-12 font-light">
                        Create your account and get your property online in 15 minutes. Website, bookings, billing, and more.
                    </p>

                    {/* Live preview of what they'll get */}
                    <div className="bg-[#0E2A38]/40 border border-[#AAB8C5]/10 rounded-xl p-5 max-w-[360px]">
                        <p className="text-[10px] text-[#AAB8C5]/50 uppercase tracking-widest font-semibold mb-3">What you'll get</p>
                        <ul className="space-y-3">
                            {[
                                'Your own website on a custom subdomain',
                                'Booking engine with zero commission',
                                'Custom email for invoicing',
                                'Dashboard with analytics',
                                'Staff and inventory management',
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-2.5 text-[13px] text-[#AAB8C5]/80">
                                    <div className="w-1 h-1 rounded-full bg-[#C9A646] mt-2 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>

                        {businessName && (
                            <div className="mt-5 pt-4 border-t border-[#AAB8C5]/10">
                                <p className="text-[10px] text-[#AAB8C5]/50 uppercase tracking-widest font-semibold mb-1">Your subdomain</p>
                                <p className="text-sm text-[#C9A646] font-medium">{subdomain || '...'}.esaystay.com</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                <div className="mt-12 md:mt-auto pt-6 border-t border-[#AAB8C5]/10">
                    <Link to="/" className="text-[12px] font-medium text-[#C9A646] hover:text-[#F7F4EF] transition-colors">
                        ← Back to HospitalityOS.com
                    </Link>
                </div>
            </div>

            {/* RIGHT: form */}
            <div className="relative z-10 w-full md:w-[55%] flex items-center justify-center p-6 sm:p-12 md:p-24 min-h-[60vh] md:min-h-screen order-1 md:order-2">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[440px] p-8 sm:p-12 rounded-2xl bg-[#0E2A38]/20 backdrop-blur-xl border border-[#AAB8C5]/10 shadow-[0_40px_120px_rgba(0,0,0,0.25)]"
                >
                    {/* Step indicator */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-[#C9A646] text-white' : 'bg-[#AAB8C5]/10 text-[#AAB8C5]/40'}`}>1</div>
                        <div className="flex-1 h-px bg-[#AAB8C5]/10" />
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-[#C9A646] text-white' : 'bg-[#AAB8C5]/10 text-[#AAB8C5]/40'}`}>2</div>
                    </div>

                    {step === 1 ? (
                        <>
                            <div className="mb-8">
                                <h2 className="text-[24px] font-bold text-[#F7F4EF] tracking-tight">Tell us about your business</h2>
                                <p className="text-[#AAB8C5] mt-2 text-[13px] font-light">We'll set up your dashboard based on this.</p>
                            </div>

                            <form className="space-y-6" onSubmit={handleStep1}>
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-[13px] text-center font-medium">
                                        {error}
                                    </div>
                                )}

                                {/* Business name */}
                                <div>
                                    <label className="block text-[12px] text-[#AAB8C5] font-medium uppercase tracking-widest mb-2">Business name</label>
                                    <input
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        placeholder="e.g. Sunrise Beach Resort"
                                        className="w-full bg-[#0E2A38]/30 border border-[#AAB8C5]/20 rounded-lg px-4 py-3 text-[#F7F4EF] placeholder-[#AAB8C5]/30 outline-none focus:border-[#C9A646]/50 focus:ring-1 focus:ring-[#C9A646]/20 transition-all text-sm"
                                    />
                                </div>

                                {/* Business type */}
                                <div>
                                    <label className="block text-[12px] text-[#AAB8C5] font-medium uppercase tracking-widest mb-3">What do you run?</label>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {businessTypes.map(({ type, icon: Icon, label, desc }) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setBusinessType(type)}
                                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${businessType === type
                                                    ? 'bg-[#C9A646]/10 border-[#C9A646]/40 ring-1 ring-[#C9A646]/20'
                                                    : 'bg-[#0E2A38]/20 border-[#AAB8C5]/10 hover:border-[#AAB8C5]/25'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${businessType === type ? 'bg-[#C9A646]/20' : 'bg-[#AAB8C5]/5'
                                                    }`}>
                                                    <Icon size={18} className={businessType === type ? 'text-[#C9A646]' : 'text-[#AAB8C5]/50'} />
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-semibold ${businessType === type ? 'text-[#F7F4EF]' : 'text-[#AAB8C5]/80'}`}>{label}</p>
                                                    <p className="text-[11px] text-[#AAB8C5]/40">{desc}</p>
                                                </div>
                                                {businessType === type && (
                                                    <div className="ml-auto w-5 h-5 rounded-full bg-[#C9A646] flex items-center justify-center">
                                                        <Check size={12} className="text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <motion.button
                                    type="submit"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full bg-gradient-to-b from-[#0E2A38] to-[#071A24] text-[#F7F4EF] font-semibold py-3.5 rounded-lg transition-all border border-transparent hover:border-[#C9A646]/30 shadow-[0_4px_14px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2 text-sm"
                                >
                                    Continue <ArrowRight size={16} />
                                </motion.button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="mb-8">
                                {!inviteData && (
                                    <button onClick={() => setStep(1)} className="text-[12px] text-[#AAB8C5]/60 hover:text-[#AAB8C5] transition-colors mb-3 block">&larr; Back</button>
                                )}
                                <h2 className="text-[24px] font-bold text-[#F7F4EF] tracking-tight">
                                    {inviteData ? 'Accept your invitation' : 'Create your account'}
                                </h2>
                                <p className="text-[#AAB8C5] mt-2 text-[13px] font-light">
                                    {inviteData
                                        ? <>You've been invited to manage <span className="text-[#C9A646] font-medium">{businessName}</span>. Choose a password to get started.</>
                                        : <>Setting up <span className="text-[#C9A646] font-medium">{businessName}</span> as a {businessType === 'combined' ? 'hotel + restaurant' : businessType}.</>
                                    }
                                </p>
                            </div>

                            <form className="space-y-5" onSubmit={handleSignup}>
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-[13px] text-center font-medium">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[12px] text-[#AAB8C5] font-medium uppercase tracking-widest mb-2">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => !inviteData && setEmail(e.target.value)}
                                        readOnly={!!inviteData}
                                        placeholder="you@example.com"
                                        className={`w-full bg-[#0E2A38]/30 border border-[#AAB8C5]/20 rounded-lg px-4 py-3 text-[#F7F4EF] placeholder-[#AAB8C5]/30 outline-none focus:border-[#C9A646]/50 focus:ring-1 focus:ring-[#C9A646]/20 transition-all text-sm ${inviteData ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[12px] text-[#AAB8C5] font-medium uppercase tracking-widest mb-2">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="w-full bg-[#0E2A38]/30 border border-[#AAB8C5]/20 rounded-lg px-4 py-3 text-[#F7F4EF] placeholder-[#AAB8C5]/30 outline-none focus:border-[#C9A646]/50 focus:ring-1 focus:ring-[#C9A646]/20 transition-all text-sm"
                                    />
                                </div>

                                {/* Subdomain preview */}
                                <div className="bg-[#0E2A38]/30 border border-[#AAB8C5]/10 rounded-lg px-4 py-3">
                                    <p className="text-[10px] text-[#AAB8C5]/50 uppercase tracking-widest font-semibold mb-1">Your subdomain</p>
                                    <p className="text-sm text-[#C9A646] font-mono">{subdomain}.esaystay.com</p>
                                </div>

                                <motion.button
                                    type="submit"
                                    disabled={isLoading}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full bg-[#C9A646] hover:bg-[#B89535] text-white font-semibold py-3.5 rounded-lg transition-all shadow-[0_4px_14px_rgba(201,166,70,0.3)] text-sm disabled:opacity-50"
                                >
                                    {isLoading ? 'Creating your account...' : 'Create account'}
                                </motion.button>
                            </form>

                            {/* Divider */}
                            <div className="flex items-center gap-3 my-5">
                                <div className="flex-1 h-px bg-[#AAB8C5]/10" />
                                <span className="text-[11px] text-[#AAB8C5]/40 uppercase tracking-widest">or</span>
                                <div className="flex-1 h-px bg-[#AAB8C5]/10" />
                            </div>

                            <motion.button
                                type="button"
                                onClick={handleGoogleSignup}
                                disabled={googleLoading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-[#AAB8C5]/15 bg-white/5 hover:bg-white/10 hover:border-[#AAB8C5]/30 transition-all text-[#F7F4EF] text-sm font-medium disabled:opacity-50"
                            >
                                <GoogleIcon />
                                {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                            </motion.button>
                        </>
                    )}

                    <div className="mt-8 text-center">
                        <p className="text-[13px] text-[#AAB8C5]/70">
                            Already have an account?{' '}
                            <Link to="/admin/login" className="text-[#C9A646] hover:text-[#F7F4EF] font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
