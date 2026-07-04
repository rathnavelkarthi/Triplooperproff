import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import { sendWelcomeEmail } from '../lib/email';
import { supabase } from '../lib/supabaseClient';
import { useClerk, useSignIn } from '@clerk/react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  UtensilsCrossed, 
  Layers, 
  ArrowRight, 
  Check, 
  Mail, 
  Star, 
  Zap, 
  CheckCircle2, 
  Bot, 
  Activity, 
  ArrowUpRight, 
  Lock, 
  Bell, 
  TrendingUp, 
  ShieldCheck, 
  DollarSign, 
  Coffee, 
  ChevronDown, 
  Smartphone,
  ChevronRight,
  Sparkles,
  Percent,
  Calculator,
  User,
  Volume2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

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
    { type: 'hotel', icon: Building2, label: 'Hotel / Resort', desc: 'Rooms, direct bookings, check-ins' },
    { type: 'restaurant', icon: UtensilsCrossed, label: 'Restaurant POS', desc: 'QR menus, tables, guest dining' },
    { type: 'combined', icon: Layers, label: 'Hotel + Restaurant', desc: 'Full stay property & culinary POS' },
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

    // Mouse tracking coordinates for premium glow effect
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const showcaseRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!showcaseRef.current) return;
        const rect = showcaseRef.current.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

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

    // Render verification screen
    if (needsVerification) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#081B26] p-6 relative overflow-hidden font-sans select-none">
                <Helmet>
                    <title>Confirm Code — TripLooper</title>
                    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
                </Helmet>

                <div className="absolute inset-0 bg-[#081B26] z-0 overflow-hidden">
                    <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#C9A646]/20 to-transparent blur-[140px]" />
                    <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#17C964]/15 to-transparent blur-[140px]" />
                </div>
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md p-10 rounded-[28px] bg-[#0E2A38]/80 backdrop-blur-2xl border border-white/5 shadow-[0_30px_70px_rgba(0,0,0,0.5)] z-10 space-y-6"
                >
                    <div className="w-14 h-14 rounded-2xl bg-[#C9A646]/10 border border-[#C9A646]/20 flex items-center justify-center mx-auto">
                        <Mail size={24} className="text-[#C9A646]" />
                    </div>
                    
                    <div className="space-y-1.5 text-center">
                        <h2 className="text-xl font-playfair font-bold text-[#FAFAFA] tracking-tight">Check your email</h2>
                        <p className="text-[#AAB8C5]/70 text-xs font-light">
                            We've sent a 6-digit confirmation key to
                        </p>
                        <p className="text-[#C9A646] text-xs font-semibold font-mono">{email}</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleVerify}>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-[11px] text-[#AAB8C5]/50 font-bold uppercase tracking-wider">Verification code</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full h-13 bg-white/5 border border-white/5 rounded-xl px-4 text-center text-xl tracking-[0.5em] font-mono text-white placeholder-white/10 outline-none focus:border-[#C9A646]/40 focus:ring-1 focus:ring-[#C9A646]/20 transition-all"
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-gradient-to-r from-[#C9A646] to-[#B08B47] text-[#081B26] font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(201,166,70,0.35)] text-xs uppercase tracking-widest disabled:opacity-50"
                        >
                            {isLoading ? 'Verifying...' : 'Verify account'}
                        </button>

                        <p className="text-center text-[11px] text-[#AAB8C5]/50 font-light">
                            Didn't receive it? Check spam, or{' '}
                            <button
                                type="button"
                                onClick={() => { setNeedsVerification(false); setError(''); setVerifyCode(''); }}
                                className="text-[#C9A646] hover:underline font-semibold"
                            >
                                go back
                            </button>.
                        </p>
                    </form>
                </motion.div>
            </div>
        );
    }

    // Render success screen
    if (signupComplete) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-[#081B26] p-6 relative overflow-hidden font-sans">
                <Helmet>
                    <title>Account Created — TripLooper</title>
                    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
                </Helmet>

                <div className="absolute inset-0 bg-[#081B26] z-0 overflow-hidden">
                    <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#C9A646]/20 to-transparent blur-[140px]" />
                    <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#17C964]/15 to-transparent blur-[140px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md p-10 rounded-[28px] bg-[#0E2A38]/80 backdrop-blur-2xl border border-white/5 shadow-[0_30px_70px_rgba(0,0,0,0.5)] z-10 text-center space-y-6"
                >
                    <div className="w-16 h-16 rounded-full bg-[#17C964]/10 border border-[#17C964]/20 flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} className="text-[#17C964]" />
                    </div>
                    
                    <div className="space-y-2">
                        <h1 className="text-2xl font-playfair font-bold text-white tracking-tight">Account established!</h1>
                        <p className="text-[#AAB8C5]/70 text-xs font-light">
                            Your hotel operating database and dashboard are fully initialized.
                        </p>
                    </div>

                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-left font-mono">
                        <p className="text-[10px] text-[#AAB8C5]/50 uppercase tracking-widest font-semibold mb-1">Your secure subdomain</p>
                        <p className="text-sm text-[#C9A646] font-bold">{subdomain}.triplooper.com</p>
                    </div>

                    <button
                        onClick={() => navigate('/admin/login')}
                        className="w-full h-14 bg-gradient-to-r from-[#C9A646] to-[#B08B47] text-[#081B26] font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(201,166,70,0.35)] text-xs uppercase tracking-widest"
                    >
                        Sign in to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#081B26] relative overflow-hidden font-sans selection:bg-[#C9A646]/30 text-[#FAFAFA]">
            <Helmet>
                <title>Join TripLooper — The Luxury Stay Operating System</title>
                <meta name="description" content="Unlock a cinematic direct booking engine, channel manager, restaurant POS, and automated WhatsApp guest concierge under a flat 12% commission." />
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            </Helmet>

            {/* Aurora Background & Vignette */}
            <div className="absolute inset-0 bg-[#081B26] z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[50%] rounded-full bg-gradient-to-br from-[#C9A646]/20 via-[#0E2A38]/20 to-transparent blur-[120px] opacity-75 animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute top-[30%] -right-[15%] w-[60%] h-[60%] rounded-full bg-gradient-to-bl from-[#17C964]/12 via-[#0E2A38]/30 to-transparent blur-[150px] opacity-50 animate-pulse" style={{ animationDuration: '12s' }} />
                <div className="absolute -bottom-[10%] left-[10%] w-[60%] h-[50%] rounded-full bg-gradient-to-tr from-[#C9A646]/15 via-transparent to-transparent blur-[140px] opacity-60" />
                
                {/* Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(8,27,38,0.75)_100%)]" />
            </div>

            {/* Noise Grain Overlay */}
            <div 
                className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none z-10" 
                style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
                }} 
            />

            {/* LEFT: Scrollable Presentation Showcase */}
            <div 
                ref={showcaseRef}
                onMouseMove={handleMouseMove}
                className="relative z-20 w-full md:w-[54%] lg:w-[60%] flex flex-col justify-start border-b md:border-b-0 md:border-r border-white/5 order-2 md:order-1 min-h-screen max-h-screen overflow-y-auto px-6 py-16 md:px-12 lg:px-20 space-y-40 no-scrollbars scroll-smooth"
            >
                {/* Hover Glow Light Follower */}
                <div 
                    className="absolute w-[400px] h-[400px] rounded-full bg-[#C9A646]/3 blur-[100px] pointer-events-none z-0 transition-opacity duration-300 opacity-0 md:opacity-100"
                    style={{
                        left: mousePosition.x - 200,
                        top: mousePosition.y - 200,
                        position: 'absolute'
                    }}
                />

                {/* ── HERO SECTION ── */}
                <div className="space-y-10 pt-8 relative z-10">
                    <div className="flex items-center gap-3">
                        <span className="font-playfair text-2xl font-black tracking-widest text-[#FAFAFA] flex items-center gap-2 select-none">
                            TRIP<span className="text-[#C9A646]">LOOPER</span>
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#17C964] animate-ping" />
                        <span className="text-[10px] text-[#AAB8C5]/50 tracking-widest font-mono uppercase">B2B Core Suite</span>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] text-[#C9A646] font-bold uppercase tracking-wider shadow-inner">
                        <Sparkles size={11} className="animate-spin [animation-duration:8s]" /> Designed for Boutique hospitality
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-8xl font-playfair font-semibold leading-[0.95] tracking-tight text-white">
                        Your hotel, <br />
                        orchestrated from <br />
                        <span className="bg-gradient-to-r from-[#C9A646] via-[#FAFAFA] to-[#B08B47] bg-clip-text text-transparent italic font-light">one platform.</span>
                    </h1>

                    <p className="text-[#AAB8C5] text-base sm:text-lg leading-relaxed font-light font-plus-jakarta max-w-xl">
                        Say goodbye to disjointed tabs and OTA billing leakages. TripLooper routes guest checkouts, WhatsApp verify flows, and restaurant kitchen tickets into a single database. Built for a flat 12% commission.
                    </p>

                    {/* Trust Badging & Metrics */}
                    <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5 max-w-lg">
                        <div>
                            <span className="text-3xl font-playfair font-bold text-white tracking-tight">10,000+</span>
                            <p className="text-[10px] text-[#AAB8C5]/40 uppercase tracking-widest font-semibold mt-1">Rooms Coordinated</p>
                        </div>
                        <div>
                            <span className="text-3xl font-playfair font-bold text-[#17C964] tracking-tight">+35%</span>
                            <p className="text-[10px] text-[#AAB8C5]/40 uppercase tracking-widest font-semibold mt-1">Direct bookings</p>
                        </div>
                        <div>
                            <span className="text-3xl font-playfair font-bold text-white tracking-tight">₹50Cr+</span>
                            <p className="text-[10px] text-[#AAB8C5]/40 uppercase tracking-widest font-semibold mt-1">Direct Revenue</p>
                        </div>
                    </div>
                </div>

                {/* ── ANIMATED PLATFORM ARCHITECTURE ── */}
                <div className="space-y-6 relative z-10">
                    <div className="space-y-2">
                        <span className="text-[11px] text-[#C9A646] font-bold uppercase tracking-wider block">Coordinated Flow</span>
                        <h2 className="text-3xl font-playfair font-semibold tracking-tight text-white">Platform Core Architecture</h2>
                        <p className="text-sm text-[#AAB8C5]/70 font-light max-w-lg">
                            Watch how data routes cleanly between guest checkout terminals, WhatsApp verification channels, and kitchen ticketing POS.
                        </p>
                    </div>
                    
                    <div className="relative aspect-[1.6] w-full rounded-[28px] bg-[#0E2A38]/40 border border-white/5 p-6 overflow-hidden shadow-inner flex items-center justify-center">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,166,70,0.18)_0%,transparent_85%)]" />
                        <ArchitectureDiagram />
                    </div>
                </div>

                {/* ── FEATURE SHOWCASE: CONSOLE PANEL ── */}
                <div className="space-y-8 relative z-10">
                    <div className="space-y-2">
                        <span className="text-[11px] text-[#C9A646] font-bold uppercase tracking-wider block">Unified PMS</span>
                        <h2 className="text-3xl font-playfair font-semibold tracking-tight text-white">Full-Stack Operator Console</h2>
                        <p className="text-sm text-[#AAB8C5]/70 font-light max-w-lg">
                            Manage guest folios, assign rooms, trigger digital Aadhaar checks, and monitor profit logs from an interactive dark console.
                        </p>
                    </div>

                    <div className="w-full rounded-[28px] bg-[#0E2A38]/30 border border-white/5 p-4 shadow-2xl relative overflow-hidden group">
                        {/* Windows dot headers */}
                        <div className="flex gap-1.5 items-center pb-3 px-2 border-b border-white/5 mb-4 text-[10px] text-[#AAB8C5]/40 font-mono">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
                            <span className="ml-2 font-bold tracking-wide">triplooper-operator-panel.dmg</span>
                        </div>
                        
                        <div className="p-4 space-y-6">
                            <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-4.5">
                                <div className="space-y-1">
                                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#C9A646] font-mono">Active guest session</span>
                                    <h4 className="text-sm font-bold text-white leading-none">Ganesh Residency Room 102</h4>
                                    <p className="text-[10px] text-[#AAB8C5]/50">Checkout Tomorrow, 11:00 AM</p>
                                </div>
                                <span className="text-[10px] bg-[#17C964]/10 text-[#17C964] border border-[#17C964]/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest font-mono">Aadhaar Verified</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#081B26]/80 border border-white/5 rounded-2xl p-4 space-y-2 text-left">
                                    <span className="text-[9px] text-[#AAB8C5]/40 uppercase tracking-widest font-bold font-mono">Room housekeeping</span>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold text-white">Room 104 (Suite)</span>
                                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded font-mono">CLEAN</span>
                                    </div>
                                </div>
                                <div className="bg-[#081B26]/80 border border-white/5 rounded-2xl p-4 space-y-2 text-left">
                                    <span className="text-[9px] text-[#AAB8C5]/40 uppercase tracking-widest font-bold font-mono">OTA sync status</span>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold text-white">Booking.com API</span>
                                        <span className="text-[9px] bg-[#C9A646]/10 text-[#C9A646] font-bold px-2 py-0.5 rounded font-mono">SYNCED</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── INTERACTIVE BOOKING ENGINE DEMO ── */}
                <div className="space-y-8 relative z-10">
                    <div className="space-y-2">
                        <span className="text-[11px] text-[#C9A646] font-bold uppercase tracking-wider block">Checkout engine</span>
                        <h2 className="text-3xl font-playfair font-semibold tracking-tight text-white">Cinematic Guest Reservation</h2>
                        <p className="text-sm text-[#AAB8C5]/70 font-light max-w-lg font-plus-jakarta">
                            Give travelers a frictionless stay check-out page that reduces booking drop-offs.
                        </p>
                    </div>

                    <div className="bg-[#0E2A38]/30 border border-white/5 rounded-[28px] p-6 shadow-xl relative overflow-hidden">
                        <InteractiveBookingShowcase />
                    </div>
                </div>

                {/* ── AUTOMATION TIMELINE ── */}
                <div className="space-y-12 relative z-10">
                    <div className="space-y-2">
                        <span className="text-[11px] text-[#C9A646] font-bold uppercase tracking-wider block">Automation</span>
                        <h2 className="text-3xl font-playfair font-semibold tracking-tight text-white">Interactive Stay Journey</h2>
                        <p className="text-sm text-[#AAB8C5]/70 font-light max-w-lg">
                            See how TripLooper handles the guest lifecycle from check-in logs to checkout invoicing.
                        </p>
                    </div>

                    <div className="bg-[#0E2A38]/20 border border-white/5 rounded-[28px] p-8">
                        <InteractiveGuestJourney />
                    </div>
                </div>

                {/* ── RESTAURANT POS MODULE ── */}
                <div className="space-y-8 relative z-10">
                    <div className="space-y-2">
                        <span className="text-[11px] text-[#C9A646] font-bold uppercase tracking-wider block">Dine-in POS</span>
                        <h2 className="text-3xl font-playfair font-semibold tracking-tight text-white">F&B QR Ordering Terminal</h2>
                        <p className="text-sm text-[#AAB8C5]/70 font-light max-w-lg">
                            Guests place food orders using tables QR menus, automatically routing tickets to the kitchen POS and the guest room invoice sheet.
                        </p>
                    </div>

                    <div className="bg-[#0E2A38]/30 border border-white/5 rounded-[28px] p-6 shadow-xl">
                        <InteractivePOSShowcase />
                    </div>
                </div>

                {/* ── ANALYTICS YIELD PANELS ── */}
                <div className="space-y-8 relative z-10">
                    <div className="space-y-2">
                        <span className="text-[11px] text-[#C9A646] font-bold uppercase tracking-wider block">Stay Metrics</span>
                        <h2 className="text-3xl font-playfair font-semibold tracking-tight text-white">Predictive Yield Insights</h2>
                        <p className="text-sm text-[#AAB8C5]/70 font-light max-w-lg">
                            Track occupancy forecast limits, direct checkout percentages, and total commission savings.
                        </p>
                    </div>

                    <div className="bg-[#0E2A38]/40 border border-white/5 rounded-[28px] p-6 shadow-xl">
                        <AnalyticsPanel />
                    </div>
                </div>

                {/* ── ROI SIMULATOR CALCULATOR ── */}
                <div className="space-y-8 relative z-10">
                    <div className="space-y-2">
                        <span className="text-[11px] text-[#C9A646] font-bold uppercase tracking-wider block">Savings Tool</span>
                        <h2 className="text-3xl font-playfair font-semibold tracking-tight text-white">Direct Profit Estimator</h2>
                        <p className="text-sm text-[#AAB8C5]/70 font-light max-w-lg">
                            Adjust your rooms count and occupancy rate to see the net cash saved under a flat 12% commission model.
                        </p>
                    </div>

                    <div className="bg-[#0E2A38]/30 border border-white/5 rounded-[28px] p-6 shadow-xl text-zinc-900">
                        <RevenueSimulator />
                    </div>
                </div>

                {/* ── PRICING PLAN CARD ── */}
                <div className="space-y-8 relative z-10">
                    <div className="space-y-2">
                        <span className="text-[11px] text-[#C9A646] font-bold uppercase tracking-wider block">Pricing model</span>
                        <h2 className="text-3xl font-playfair font-semibold tracking-tight text-white">One Unified Plan</h2>
                        <p className="text-sm text-[#AAB8C5]/70 font-light max-w-lg">
                            No setup charges or lock-in contracts. Pay only as you host bookings.
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-[28px] p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#C9A646] text-[#081B26] font-bold text-[9px] tracking-widest uppercase px-3 py-1 rounded-full shadow-lg font-mono">
                            COMMISSION ONLY
                        </div>
                        <PricingPlan />
                    </div>
                </div>

                {/* ── FAQ ACCORDION ── */}
                <div className="space-y-8 relative z-10">
                    <h2 className="text-3xl font-playfair font-semibold tracking-tight text-white">Frequently Asked Questions</h2>
                    <div className="bg-[#0E2A38]/20 border border-white/5 rounded-[28px] p-6 text-zinc-200">
                        <HospitalityFAQ />
                    </div>
                </div>

                {/* ── FOOTER BACKLINK ── */}
                <div className="pt-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs relative z-10">
                    <Link to="/" className="font-bold text-[#C9A646] hover:text-[#FAFAFA] transition-colors flex items-center gap-1.5">
                        ← Back to triplooper.com Direct Stays Directory
                    </Link>
                    <span className="text-[#AAB8C5]/30">© {new Date().getFullYear()} TripLooper. All rights reserved.</span>
                </div>
            </div>

            {/* RIGHT: Fixed/Sticky Sleek Onboarding Registration Card */}
            <div className="relative z-30 w-full md:w-[46%] lg:w-[40%] flex items-center justify-center p-6 sm:p-12 lg:p-16 min-h-screen bg-[#081B26]/60 backdrop-blur-3xl order-1 md:order-2 overflow-y-auto max-h-screen border-t md:border-t-0 md:border-l border-white/5">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[420px] p-8 sm:p-10 rounded-[28px] bg-[#0E2A38]/80 border border-white/5 shadow-2xl space-y-6 relative overflow-hidden"
                >
                    {/* Stepper Progress Bar */}
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 1 ? 'bg-gradient-to-b from-[#C9A646] to-[#B08B47] text-[#081B26] shadow-md shadow-[#C9A646]/10' : 'bg-white/5 text-[#AAB8C5]/40 border border-white/5'}`}>1</div>
                        <div className="flex-1 h-px bg-white/5" />
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 2 ? 'bg-gradient-to-b from-[#C9A646] to-[#B08B47] text-[#081B26] shadow-md shadow-[#C9A646]/10' : 'bg-white/5 text-[#AAB8C5]/40 border border-white/5'}`}>2</div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-[10px] text-[#C9A646] font-extrabold uppercase tracking-widest font-mono">Step {step} of 2</span>
                        <h2 className="text-2xl font-playfair font-bold tracking-tight text-white">
                            {inviteData ? 'Accept invitation' : (step === 1 ? 'Configure your stay' : 'Create account')}
                        </h2>
                        <p className="text-[#AAB8C5]/70 text-xs font-light">
                            {inviteData ? `Complete account setup for ${inviteData.business_name}` : (step === 1 ? 'Specify your hotel name to generate a custom subdomain.' : 'Configure your primary admin email credentials.')}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs font-medium text-center font-plus-jakarta">
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <form className="space-y-6 text-left" onSubmit={handleStep1}>
                            <div className="space-y-2">
                                <label className="block text-[11px] text-[#AAB8C5]/50 font-bold uppercase tracking-wider font-mono">Property Name</label>
                                <input
                                    type="text"
                                    required
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="e.g. Saffron Spice Villa"
                                    className="w-full h-13 bg-white/5 border border-white/5 rounded-xl px-4 text-sm text-white placeholder-white/15 outline-none focus:border-[#C9A646]/40 focus:ring-1 focus:ring-[#C9A646]/20 transition-all font-light"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[11px] text-[#AAB8C5]/50 font-bold uppercase tracking-wider font-mono">Property Type</label>
                                <div className="flex flex-col gap-2.5">
                                    {businessTypes.map(({ type, icon: Icon, label, desc }) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setBusinessType(type)}
                                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${businessType === type
                                                ? 'bg-[#C9A646]/5 border-[#C9A646]/40 ring-1 ring-[#C9A646]/15'
                                                : 'bg-white/5 border-white/5 hover:border-white/10'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${businessType === type ? 'bg-[#C9A646]/10' : 'bg-white/5'}`}>
                                                <Icon size={18} className={businessType === type ? 'text-[#C9A646]' : 'text-[#AAB8C5]/50'} />
                                            </div>
                                            <div>
                                                <p className={`text-xs font-bold ${businessType === type ? 'text-white' : 'text-[#AAB8C5]'}`}>{label}</p>
                                                <p className="text-[10px] text-[#AAB8C5]/40 mt-0.5">{desc}</p>
                                            </div>
                                            {businessType === type && (
                                                <div className="ml-auto w-5 h-5 rounded-full bg-[#C9A646] flex items-center justify-center">
                                                    <Check size={11} className="text-[#081B26] font-bold" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {businessName && (
                                <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
                                    <p className="text-[9px] text-[#AAB8C5]/40 uppercase tracking-widest font-semibold flex items-center gap-1.5 font-mono">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#17C964] animate-pulse" />
                                        Subdomain Preview
                                    </p>
                                    <p className="text-xs text-[#C9A646] font-mono font-semibold">{subdomain}.triplooper.com</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full h-14 bg-gradient-to-r from-[#C9A646] to-[#B08B47] text-[#081B26] font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(201,166,70,0.35)] text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98]"
                            >
                                <span>Continue Setup</span>
                                <ArrowRight size={14} />
                            </button>
                        </form>
                    ) : (
                        <form className="space-y-6 text-left" onSubmit={handleSignup}>
                            {!inviteData && (
                                <button 
                                    type="button" 
                                    onClick={() => setStep(1)} 
                                    className="text-[11px] text-[#AAB8C5]/60 hover:text-[#FAFAFA] transition-colors flex items-center gap-1"
                                >
                                    &larr; Back to Step 1
                                </button>
                            )}

                            <div className="space-y-2">
                                <label className="block text-[11px] text-[#AAB8C5]/50 font-bold uppercase tracking-wider font-mono">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    disabled={!!inviteData}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="owner@hotelname.com"
                                    className="w-full h-13 bg-white/5 border border-white/5 rounded-xl px-4 text-sm text-white placeholder-white/15 outline-none focus:border-[#C9A646]/40 focus:ring-1 focus:ring-[#C9A646]/20 transition-all font-light disabled:opacity-60"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[11px] text-[#AAB8C5]/50 font-bold uppercase tracking-wider font-mono">Secure Password</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    className="w-full h-13 bg-white/5 border border-white/5 rounded-xl px-4 text-sm text-white placeholder-white/15 outline-none focus:border-[#C9A646]/40 focus:ring-1 focus:ring-[#C9A646]/20 transition-all font-light"
                                />
                            </div>

                            {businessName && (
                                <div className="p-3 bg-white/5 border border-white/5 rounded-xl font-mono text-[11px] text-[#AAB8C5]/60">
                                    Property: <span className="text-white font-bold">{businessName}</span> • Subdomain: <span className="text-[#C9A646] font-bold">{subdomain}.triplooper.com</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 bg-gradient-to-r from-[#C9A646] to-[#B08B47] text-[#081B26] font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(201,166,70,0.35)] text-xs uppercase tracking-widest disabled:opacity-50 hover:opacity-90"
                            >
                                {isLoading ? 'Creating Workspace...' : 'Initialize Operating System'}
                            </button>

                            <div className="flex items-center gap-3 my-5">
                                <div className="flex-1 h-px bg-white/5" />
                                <span className="text-[10px] text-[#AAB8C5]/30 uppercase tracking-widest font-mono">or</span>
                                <div className="flex-1 h-px bg-white/5" />
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleSignup}
                                disabled={googleLoading}
                                className="w-full h-13 flex items-center justify-center gap-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-white text-xs font-semibold disabled:opacity-50"
                            >
                                <GoogleIcon />
                                {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center pt-4 border-t border-white/5">
                        <p className="text-xs text-[#AAB8C5]/70">
                            Already active on Triplooper?{' '}
                            <Link to="/admin/login" className="text-[#C9A646] hover:underline font-bold transition-all">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// ── CUSTOM DETAILED PRESENTATION SUB-COMPONENTS ──

// Animated Platform Architecture Nodes
function ArchitectureDiagram() {
    return (
        <svg viewBox="0 0 500 300" className="w-full h-full max-w-[400px]">
            {/* Center Core Node */}
            <g>
                <circle cx="250" cy="150" r="30" fill="#0E2A38" stroke="#C9A646" strokeWidth="1.5" />
                <circle cx="250" cy="150" r="24" fill="none" stroke="#C9A646" strokeWidth="0.5" strokeDasharray="3, 5" className="animate-spin" style={{ animationDuration: '12s' }} />
                <text x="250" y="153" textAnchor="middle" fill="#C9A646" fontSize="9" fontWeight="bold" fontFamily="monospace">Core OS</text>
            </g>

            {/* Top Node - Guest Verification */}
            <g>
                <line x1="250" y1="150" x2="250" y2="50" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                <circle cx="250" cy="50" r="22" fill="#0E2A38" stroke="rgba(255,255,255,0.15)" />
                <text x="250" y="53" textAnchor="middle" fill="#FAFAFA" fontSize="8" fontWeight="bold" fontFamily="monospace">GUESTS</text>
                <circle cx="250" cy="50" r="4" fill="#17C964" />
            </g>

            {/* Left Node - Direct Engine */}
            <g>
                <line x1="250" y1="150" x2="110" y2="150" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                <circle cx="110" cy="150" r="22" fill="#0E2A38" stroke="rgba(255,255,255,0.15)" />
                <text x="110" y="153" textAnchor="middle" fill="#FAFAFA" fontSize="8" fontWeight="bold" fontFamily="monospace">ENGINE</text>
                <circle cx="110" cy="150" r="4" fill="#C9A646" />
            </g>

            {/* Right Node - WhatsApp Core */}
            <g>
                <line x1="250" y1="150" x2="390" y2="150" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                <circle cx="390" cy="150" r="22" fill="#0E2A38" stroke="rgba(255,255,255,0.15)" />
                <text x="390" y="153" textAnchor="middle" fill="#FAFAFA" fontSize="8" fontWeight="bold" fontFamily="monospace">WHATSAPP</text>
                <circle cx="390" cy="150" r="4" fill="#17C964" />
            </g>

            {/* Bottom Node - Restaurant POS */}
            <g>
                <line x1="250" y1="150" x2="250" y2="250" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                <circle cx="250" cy="250" r="22" fill="#0E2A38" stroke="rgba(255,255,255,0.15)" />
                <text x="250" y="253" textAnchor="middle" fill="#FAFAFA" fontSize="8" fontWeight="bold" fontFamily="monospace">KITCHEN</text>
                <circle cx="250" cy="250" r="4" fill="#C9A646" />
            </g>

            {/* Moving signal pulses */}
            <circle cx="250" cy="150" r="4" fill="#C9A646">
                <animateMotion 
                    path="M 0,0 L 0,-100" 
                    begin="0s" 
                    dur="3s" 
                    repeatCount="indefinite" 
                />
            </circle>
            <circle cx="250" cy="150" r="4" fill="#17C964">
                <animateMotion 
                    path="M 0,0 L 140,0" 
                    begin="1s" 
                    dur="3.5s" 
                    repeatCount="indefinite" 
                />
            </circle>
            <circle cx="250" cy="150" r="4" fill="#C9A646">
                <animateMotion 
                    path="M 0,0 L 0,100" 
                    begin="2s" 
                    dur="2.5s" 
                    repeatCount="indefinite" 
                />
            </circle>
            <circle cx="250" cy="150" r="4" fill="#17C964">
                <animateMotion 
                    path="M 0,0 L -140,0" 
                    begin="0.5s" 
                    dur="4s" 
                    repeatCount="indefinite" 
                />
            </circle>
        </svg>
    );
}

// Analytics dashboard chart panel
function AnalyticsPanel() {
    const data = [
        { name: 'Mon', direct: 35, ota: 40 },
        { name: 'Tue', direct: 45, ota: 38 },
        { name: 'Wed', direct: 55, ota: 35 },
        { name: 'Thu', direct: 68, ota: 30 },
        { name: 'Fri', direct: 80, ota: 25 },
        { name: 'Sat', direct: 95, ota: 20 },
        { name: 'Sun', direct: 110, ota: 15 },
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-left">
                <div>
                    <h4 className="font-bold text-white uppercase tracking-wider font-mono">Direct Margins Recovered</h4>
                    <span className="text-[10px] text-[#17C964] font-semibold flex items-center gap-1 mt-0.5">
                        <TrendingUp size={12} /> +65% direct channel growth
                    </span>
                </div>
                <div className="flex gap-4 font-mono text-[9px]">
                    <span className="flex items-center gap-1 text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C9A646]" /> Direct Checkout
                    </span>
                    <span className="flex items-center gap-1 text-zinc-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" /> OTA commission loss
                    </span>
                </div>
            </div>

            <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorDirect" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C9A646" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#C9A646" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#AAB8C5" fontSize={9} opacity={0.3} axisLine={false} tickLine={false} />
                        <Area type="monotone" dataKey="direct" stroke="#C9A646" strokeWidth={1.5} fillOpacity={1} fill="url(#colorDirect)" />
                        <Area type="monotone" dataKey="ota" stroke="rgba(255,255,255,0.06)" strokeWidth={1} fill="none" strokeDasharray="3, 3" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// Custom internal presentation widgets (replacing LandingPage references to prevent slop)

// 1. Exploded Dashboard view (showing layers in 3D-perspective-like layout)
export function ExplodedDashboard() {
    return (
        <div className="w-full max-w-[380px] space-y-4 py-6 font-mono text-[10px] text-left">
            <div className="relative p-4 rounded-xl bg-white/5 border border-white/5 shadow-md flex justify-between items-center transform -rotate-2 hover:rotate-0 transition-all duration-300">
                <div className="space-y-1">
                    <span className="text-[#C9A646] font-bold block uppercase tracking-widest text-[8px]">LAYER 01 — Guest Checkout Portal</span>
                    <p className="text-white text-xs font-bold leading-none">Aadhaar scan trigger sent</p>
                </div>
                <Smartphone size={16} className="text-[#C9A646]" />
            </div>

            <div className="relative p-4 rounded-xl bg-[#0E2A38]/80 border border-white/5 shadow-md flex justify-between items-center transform rotate-1 hover:rotate-0 transition-all duration-300">
                <div className="space-y-1">
                    <span className="text-[#17C964] font-bold block uppercase tracking-widest text-[8px]">LAYER 02 — PMS Room Matrix</span>
                    <p className="text-white text-xs font-bold leading-none">Room 102 checked clean</p>
                </div>
                <CheckCircle2 size={16} className="text-[#17C964]" />
            </div>

            <div className="relative p-4 rounded-xl bg-white/5 border border-white/5 shadow-md flex justify-between items-center transform -rotate-1 hover:rotate-0 transition-all duration-300">
                <div className="space-y-1">
                    <span className="text-[#C9A646] font-bold block uppercase tracking-widest text-[8px]">LAYER 03 — Culinary POS</span>
                    <p className="text-white text-xs font-bold leading-none">KOT order sent to table 4</p>
                </div>
                <UtensilsCrossed size={16} className="text-[#C9A646]" />
            </div>
        </div>
    );
}

// 2. Interactive booking preview widget
export function InteractiveBookingShowcase() {
    const [bookingState, setBookingState] = useState<'idle' | 'booking' | 'done'>('idle');

    useEffect(() => {
        const timer = setInterval(() => {
            setBookingState((prev) => {
                if (prev === 'idle') return 'booking';
                if (prev === 'booking') return 'done';
                return 'idle';
            });
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="w-full max-w-[360px] mx-auto p-5 rounded-2xl bg-[#081B26]/90 border border-white/5 shadow-xl text-left space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[10px] text-[#AAB8C5]/50 font-bold uppercase tracking-wider font-mono">Stay direct Checkout</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#17C964] animate-ping" />
            </div>

            <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                        <h4 className="text-xs font-bold text-white">Deluxe Mountain Villa</h4>
                        <p className="text-[10px] text-zinc-400">2 Nights • Ganesh Residency</p>
                    </div>
                    <span className="text-xs font-extrabold text-[#C9A646]">₹13,000</span>
                </div>

                <AnimatePresence mode="wait">
                    {bookingState === 'idle' && (
                        <motion.div 
                            key="idle"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="bg-white/5 rounded-xl p-3 border border-white/5 text-[11px] text-[#AAB8C5]/70"
                        >
                            Guest enters checkout details...
                        </motion.div>
                    )}
                    {bookingState === 'booking' && (
                        <motion.div 
                            key="booking"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="bg-[#C9A646]/10 rounded-xl p-3 border border-[#C9A646]/20 text-[11px] text-[#C9A646] font-semibold flex items-center gap-2"
                        >
                            <Activity size={12} className="animate-spin" />
                            <span>Processing direct payment folio...</span>
                        </motion.div>
                    )}
                    {bookingState === 'done' && (
                        <motion.div 
                            key="done"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="bg-[#17C964]/10 rounded-xl p-3 border border-[#17C964]/20 text-[11px] text-[#17C964] font-semibold flex items-center gap-2"
                        >
                            <CheckCircle2 size={12} />
                            <span>Booking confirmed. WhatsApp check-in sent!</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// 3. Guest check-in timeline lifecycle
export function InteractiveGuestJourney() {
    const [stepIdx, setStepIdx] = useState(0);

    const steps = [
        { title: 'Room Booking', desc: 'Guest checks out direct on hotel subdomain.' },
        { title: 'WhatsApp Alert', desc: 'Magic verification link sent via WhatsApp bot.' },
        { title: 'Secure Verification', desc: 'Guest uploads Aadhaar/passport in 2 clicks.' },
        { title: 'Platform Ledger', desc: 'Operator receives payment; KOT culinary logs unlocked.' }
    ];

    return (
        <div className="space-y-6 text-left">
            <div className="flex gap-2 pb-4 border-b border-white/5">
                {steps.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setStepIdx(i)}
                        className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${stepIdx === i ? 'bg-[#C9A646]' : 'bg-white/5'}`}
                    />
                ))}
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <span className="text-[9px] text-[#C9A646] font-extrabold uppercase tracking-widest font-mono">STAGE 0{stepIdx + 1}</span>
                <h4 className="text-sm font-bold text-white leading-none">{steps[stepIdx].title}</h4>
                <p className="text-xs text-[#AAB8C5]/70 font-light mt-1.5">{steps[stepIdx].desc}</p>
            </div>
        </div>
    );
}

// 4. Restaurant QR POS Terminal order logging
export function InteractivePOSShowcase() {
    const [orders, setOrders] = useState<{name: string, price: number}[]>([]);
    
    const items = [
        { name: 'South Filter Coffee', price: 90 },
        { name: 'Ghee Podi Dosa', price: 210 },
        { name: 'Paneer Tikka Roll', price: 280 }
    ];

    const addOrder = (item: {name: string, price: number}) => {
        setOrders([...orders, item]);
    };

    const clearOrders = () => {
        setOrders([]);
    };

    const total = orders.reduce((sum, item) => sum + item.price, 0);

    return (
        <div className="grid sm:grid-cols-2 gap-6 text-left">
            <div className="space-y-3">
                <span className="text-[9px] text-[#AAB8C5]/50 font-bold uppercase tracking-wider font-mono">Dine-in menu card</span>
                <div className="flex flex-col gap-2">
                    {items.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => addOrder(item)}
                            className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#C9A646]/30 transition-all text-xs"
                        >
                            <span className="text-white font-medium">{item.name}</span>
                            <span className="text-[#C9A646] font-bold">₹{item.price}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <span className="text-[9px] text-[#AAB8C5]/50 font-bold uppercase tracking-wider font-mono">Active room bill</span>
                <div className="p-4 bg-[#081B26]/90 border border-white/5 rounded-2xl flex flex-col justify-between min-h-[140px] text-xs">
                    <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
                        {orders.length === 0 ? (
                            <p className="text-[10px] text-[#AAB8C5]/30 italic">Click items to add to bill...</p>
                        ) : (
                            orders.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-[#AAB8C5]">
                                    <span>{item.name}</span>
                                    <span>₹{item.price}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="border-t border-white/5 pt-2 flex justify-between items-center mt-2">
                        <span className="font-bold text-white">Total: ₹{total}</span>
                        {orders.length > 0 && (
                            <button
                                onClick={clearOrders}
                                className="text-[9px] bg-[#C9A646] text-[#081B26] font-bold px-2 py-1 rounded"
                            >
                                Send to Room 102
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 5. Margin saved / ROI Simulator
export function RevenueSimulator() {
    const [rooms, setRooms] = useState(20);
    const [adr, setAdr] = useState(4000);
    const [occupancy, setOccupancy] = useState(70);

    const monthlyRevenue = rooms * adr * (occupancy / 100) * 30;
    
    // OTA takes 18% commission
    const otaCommissions = monthlyRevenue * 0.18;
    
    // Triplooper takes 12% commission
    const triplooperCommissions = monthlyRevenue * 0.12;

    const commissionsSaved = otaCommissions - triplooperCommissions;

    return (
        <div className="p-6 bg-[#0E2A38]/80 rounded-[28px] border border-white/5 text-white space-y-6">
            <div className="grid gap-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-[#AAB8C5]">
                        <span>Rooms count</span>
                        <span className="font-bold text-[#C9A646]">{rooms} Rooms</span>
                    </div>
                    <input 
                        type="range" 
                        min="5" 
                        max="100" 
                        value={rooms}
                        onChange={(e) => setRooms(Number(e.target.value))}
                        className="w-full accent-[#C9A646]"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-[#AAB8C5]">
                        <span>Average daily rate (ADR)</span>
                        <span className="font-bold text-[#C9A646]">₹{adr}</span>
                    </div>
                    <input 
                        type="range" 
                        min="1000" 
                        max="15000" 
                        step="500"
                        value={adr}
                        onChange={(e) => setAdr(Number(e.target.value))}
                        className="w-full accent-[#C9A646]"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-[#AAB8C5]">
                        <span>Monthly occupancy</span>
                        <span className="font-bold text-[#C9A646]">{occupancy}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        value={occupancy}
                        onChange={(e) => setOccupancy(Number(e.target.value))}
                        className="w-full accent-[#C9A646]"
                    />
                </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="grid grid-cols-2 gap-4 text-center font-mono">
                <div className="bg-[#081B26] p-4 rounded-xl border border-white/5">
                    <span className="text-[9px] text-[#AAB8C5]/40 block uppercase">Standard OTA Fee (18%)</span>
                    <span className="text-sm font-bold text-red-400 mt-1 block">₹{Math.round(otaCommissions).toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-[#081B26] p-4 rounded-xl border border-white/5">
                    <span className="text-[9px] text-[#AAB8C5]/40 block uppercase">Triplooper Fee (12%)</span>
                    <span className="text-sm font-bold text-[#17C964] mt-1 block">₹{Math.round(triplooperCommissions).toLocaleString('en-IN')}</span>
                </div>
            </div>

            <div className="bg-[#C9A646]/5 border border-[#C9A646]/20 p-4 rounded-xl text-center">
                <span className="text-[10px] text-[#C9A646] font-bold uppercase tracking-wider font-mono">Net recovered margin monthly</span>
                <h3 className="text-xl font-bold text-[#FAFAFA] mt-1">₹{Math.round(commissionsSaved).toLocaleString('en-IN')}</h3>
            </div>
        </div>
    );
}

// 6. Pricing table / details card
export function PricingPlan() {
    return (
        <div className="space-y-6 text-left">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold text-white font-playfair">12% Flat Commission</h3>
                    <p className="text-xs text-[#AAB8C5]/70 font-light mt-1 font-plus-jakarta">All enterprise hotel OS features completely unlocked, with zero monthly licensing or setup fees.</p>
                </div>
                <span className="text-2xl font-bold text-[#C9A646] bg-white/5 px-3 py-1 rounded-xl font-mono">12%</span>
            </div>

            <div className="h-px bg-white/5" />

            <ul className="space-y-3.5 text-xs text-[#AAB8C5] font-light font-plus-jakarta">
                {['Direct Booking Engine & Custom Website Subdomain', 'Real-Time Channel Manager (2-Way OTA Calendar Sync)', 'Magic Aadhaar verification check-in links sent via WhatsApp', 'Integrated QR Menu Dine-in Restaurant POS with Room Billing', 'Multi-user operational permission access roles'].map((f, i) => (
                    <li key={i} className="flex gap-2.5 items-start">
                        <span className="text-[#C9A646] font-bold">✓</span>
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// 7. Hospitality FAQs accordion
export function HospitalityFAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const faqs = [
        { q: "Is there any upfront setup cost or hidden monthly fee?", a: "No. Triplooper has zero monthly fees, setup costs, or licensing surcharges. We operate strictly on a 12% commission of the revenue generated by the hotel through bookings placed on the platform." },
        { q: "How does the WhatsApp magic check-in verify guest identity?", a: "When a guest places a booking, our engine automatically triggers a WhatsApp message containing a secure login link. The guest uploads their identity card (Aadhaar or Passport), which our OCR verifies in real-time." },
        { q: "Can we connect existing OTA channels like Booking.com?", a: "Yes. Our platform includes a real-time, two-way channel manager that synchronizes availability across all major OTA sites to prevent room overbookings." }
    ];

    return (
        <div className="space-y-3.5 font-plus-jakarta text-left">
            {faqs.map((faq, idx) => (
                <div key={idx} className="border-b border-white/5 pb-3">
                    <button
                        onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                        className="w-full flex justify-between items-center text-xs font-bold text-white py-2"
                    >
                        <span>{faq.q}</span>
                        <ChevronDown size={14} className={`text-[#C9A646] transition-transform duration-300 ${openIndex === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {openIndex === idx && (
                        <p className="text-[11px] text-[#AAB8C5]/70 leading-relaxed font-light mt-2">{faq.a}</p>
                    )}
                </div>
            ))}
        </div>
    );
}
