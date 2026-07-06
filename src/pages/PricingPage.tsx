import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'motion/react';
import { Shield, Zap, Receipt, Building2 } from 'lucide-react';
import BillingToggle from '../components/pricing/BillingToggle';
import PricingCard from '../components/pricing/PricingCard';
import FAQAccordion from '../components/pricing/FAQAccordion';
import { useAuth } from '../context/AuthContext';
import { initiatePayment } from '../lib/razorpay';
import { toast } from 'sonner';
import SaaSFooter from '../components/saas/SaaSFooter';

/* ─────────────────────────────────────────────
   FadeIn — wrapper that fades children in after
   a configurable delay (ms) and duration (ms)
   ───────────────────────────────────────────── */
function FadeIn({
    children,
    delay = 0,
    duration = 1000,
}: {
    children: ReactNode;
    delay?: number;
    duration?: number;
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(t);
    }, [delay]);

    return (
        <div
            className="transition-opacity"
            style={{
                opacity: visible ? 1 : 0,
                transitionDuration: `${duration}ms`,
            }}
        >
            {children}
        </div>
    );
}

/* ─────────────────────────────────────────────
   AnimatedHeading — character-by-character
   reveal with staggered translateX + opacity
   ───────────────────────────────────────────── */
function AnimatedHeading({ text }: { text: string }) {
    const [fired, setFired] = useState(false);
    const charDelay = 30; // ms per character
    const initialDelay = 200; // ms before first char moves

    useEffect(() => {
        const t = setTimeout(() => setFired(true), initialDelay);
        return () => clearTimeout(t);
    }, []);

    const lines = text.split('\n');

    return (
        <>
            {lines.map((line, lineIndex) => {
                const lineStartOffset = lines
                    .slice(0, lineIndex)
                    .reduce((sum, l) => sum + l.length, 0);

                return (
                    <span key={lineIndex} className="block">
                        {line.split('').map((char, charIndex) => {
                            const totalIndex = lineStartOffset + charIndex;
                            const delay = totalIndex * charDelay;
                            const isSpace = char === ' ';

                            return (
                                <span
                                    key={`${lineIndex}-${charIndex}`}
                                    className="inline-block"
                                    style={{
                                        opacity: fired ? 1 : 0,
                                        transform: fired
                                            ? 'translateX(0)'
                                            : 'translateX(-18px)',
                                        transition: `opacity 500ms ${delay}ms, transform 500ms ${delay}ms`,
                                    }}
                                >
                                    {isSpace ? '\u00A0' : char}
                                </span>
                            );
                        })}
                    </span>
                );
            })}
        </>
    );
}

/* ═══════════════════════════════════════════════
   PricingPage
   ═══════════════════════════════════════════════ */
export default function PricingPage() {
    const [isYearly, setIsYearly] = useState(true);
    const { user, tenant, refreshTenant } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<string | null>(null);

    const starterPrice = "Free";
    const growthPrice = isYearly ? "₹23,999" : "₹2,499";
    const growthPeriod = isYearly ? "/ year" : "/ month";
    const proPrice = isYearly ? "₹47,999" : "₹4,999";
    const proPeriod = isYearly ? "/ year" : "/ month";
    const enterprisePrice = isYearly ? "₹95,999" : "₹9,999";
    const enterprisePeriod = isYearly ? "/ year" : "/ month";

    const handlePlanClick = async (planId: string) => {
        if (!user || !tenant) {
            navigate('/signup');
            return;
        }
        if (planId === 'starter') {
            navigate('/admin/billing');
            return;
        }
        setLoading(planId);
        const billingCycle = isYearly ? 'yearly' : 'monthly';
        const result = await initiatePayment(planId, billingCycle as 'monthly' | 'yearly', tenant.id, user.email, tenant.business_name);
        setLoading(null);
        if (result.success) {
            toast.success(`Upgraded to ${planId.charAt(0).toUpperCase() + planId.slice(1)}!`);
            await refreshTenant();
            navigate('/admin/billing');
        } else if (result.error !== 'Payment cancelled') {
            toast.error(result.error || 'Payment failed');
        }
    };

    const scrollToPlans = () => {
        document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Helmet>
                <title>Pricing - Trip Looper | Free to Start, Plans from ₹2,499/mo</title>
                <meta name="description" content="Simple, transparent pricing for hotel and restaurant management. Start free with up to 5 rooms. Growth, Pro, and Enterprise plans for every property size." />
                <link rel="canonical" href="https://triplooper.com/pricing" />
                <meta property="og:title" content="Trip Looper Pricing - Free to Start, Plans from ₹2,499/mo" />
                <meta property="og:description" content="Simple, transparent pricing. Start free with up to 5 rooms. Growth, Pro, and Enterprise plans for every property size." />
                <meta property="og:url" content="https://triplooper.com/pricing" />
                <meta property="og:type" content="website" />
            </Helmet>

            {/* ════════════════════════════════════
                HERO — Full viewport, video bg, NO overlay
               ════════════════════════════════════ */}
            <section className="relative w-full h-screen overflow-hidden">

                {/* Background Video — raw, no dimming */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                >
                    <source
                        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4"
                        type="video/mp4"
                    />
                </video>

                {/* Content layer */}
                <div className="relative z-10 flex flex-col h-full">

                    {/* ── Navbar ── */}
                    <nav className="px-6 md:px-12 lg:px-16 pt-6">
                        <div className="liquid-glass rounded-xl px-4 py-2 flex items-center justify-between">
                            {/* Logo */}
                            <a href="/" className="text-2xl font-semibold tracking-tight text-white">
                                Trip Looper
                            </a>

                            {/* Center links — hidden on mobile */}
                            <div className="hidden md:flex items-center gap-8">
                                {['Features', 'Pricing', 'Hotels', 'Contact'].map((link) => (
                                    <a
                                        key={link}
                                        href={link === 'Pricing' ? '#pricing-plans' : link === 'Features' ? '/#features' : '#'}
                                        className="text-sm text-white/80 hover:text-gray-300 transition-colors duration-200"
                                    >
                                        {link}
                                    </a>
                                ))}
                            </div>

                            {/* CTA */}
                            <a
                                href="https://wa.me/919345244727?text=Hi%2C%20I%20want%20to%20learn%20about%20Trip%20Looper"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors duration-200"
                            >
                                Start a Chat
                            </a>
                        </div>
                    </nav>

                    {/* ── Hero content — pushed to bottom ── */}
                    <div className="flex-1 flex flex-col justify-end px-6 md:px-12 lg:px-16 pb-12 lg:pb-16">
                        <div className="lg:grid lg:grid-cols-2 lg:items-end">

                            {/* Left column */}
                            <div>
                                <h1
                                    className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal mb-4 text-white"
                                    style={{ letterSpacing: '-0.04em' }}
                                >
                                    <AnimatedHeading text={"Shaping hospitality\nwith vision and action."} />
                                </h1>

                                <FadeIn delay={800} duration={1000}>
                                    <p className="text-base md:text-lg text-gray-300 mb-5">
                                        We back hoteliers and craft software that defines what comes next.
                                    </p>
                                </FadeIn>

                                <FadeIn delay={1200} duration={1000}>
                                    <div className="flex flex-wrap gap-4">
                                        <button
                                            onClick={scrollToPlans}
                                            className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                                        >
                                            Get Started
                                        </button>
                                        <a
                                            href="/#features"
                                            className="liquid-glass border border-white/20 text-white px-8 py-3 rounded-lg font-medium hover:bg-white hover:text-black transition-all duration-300"
                                        >
                                            Explore Now
                                        </a>
                                    </div>
                                </FadeIn>
                            </div>

                            {/* Right column — tag */}
                            <FadeIn delay={1400} duration={1000}>
                                <div className="flex items-end justify-start lg:justify-end mt-8 lg:mt-0">
                                    <div className="liquid-glass border border-white/20 px-6 py-3 rounded-xl">
                                        <span className="text-lg md:text-xl lg:text-2xl font-light text-white">
                                            Hotels. Restaurants. Operations.
                                        </span>
                                    </div>
                                </div>
                            </FadeIn>
                        </div>
                    </div>

                </div>
            </section>

            {/* ════════════════════════════════════
                PRICING SECTION — below the fold
               ════════════════════════════════════ */}
            <div className="bg-[#ededed] text-neutral-800">

                <div id="pricing-plans" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-16 scroll-mt-6">

                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <h2 className="text-4xl md:text-5xl font-bold text-[#0E2A38] tracking-tight leading-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
                            Simple pricing. Start free.
                        </h2>
                        <p className="text-sm font-medium text-neutral-500">
                            One platform. Complete hotel and restaurant operations. Start free with up to 5 rooms.
                        </p>
                    </div>

                    {/* PRICING PLANS GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                        
                        {/* 1. Subscription (Max 10 Rooms) */}
                        <div className="relative bg-white border border-neutral-200 rounded-3xl p-8 shadow-lg flex flex-col justify-between space-y-6 overflow-hidden">
                            <div className="space-y-4 text-left font-sans">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-[#ef4d23] bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">Subscription Method</span>
                                    <h3 className="text-xl font-bold text-[#0E2A38] tracking-tight mt-3">Max 10 Rooms</h3>
                                    <p className="text-xs text-neutral-500 mt-1 font-light leading-relaxed">
                                        For small hotels or guesthouses. Fully unlocks all system features with a lower yearly rate.
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold text-[#0E2A38] tracking-tight">₹15,000</span>
                                        <span className="text-sm text-neutral-500 font-medium">/ year</span>
                                    </div>
                                    <p className="text-[11px] text-[#ef4d23] font-semibold mt-1">+ 12% commission per booking</p>
                                </div>
                                
                                <div className="h-px bg-neutral-100 my-4" />

                                <h4 className="text-xs font-bold text-[#0E2A38] uppercase tracking-wide">Included Features:</h4>
                                <ul className="space-y-2.5 text-xs text-neutral-600 font-light">
                                    {[
                                        "Custom Website & Booking Engine",
                                        "OTA Channel Manager Sync",
                                        "Guest Portal with Aadhaar Check-In",
                                        "Restaurant POS & Digital Menus",
                                        "WhatsApp Booking Automations",
                                        "GST Billing & Invoice Folios",
                                        "Up to 10 Active Rooms",
                                    ].map((f, i) => (
                                        <li key={i} className="flex gap-2 items-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#0e2a38]" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="pt-4">
                                <a
                                    href="/signup"
                                    className="w-full bg-[#0E2A38] hover:bg-[#ef4d23] text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md text-center text-sm"
                                >
                                    <span>Get Started</span>
                                </a>
                            </div>
                        </div>

                        {/* 2. Subscription (11+ Rooms) */}
                        <div className="relative bg-white border-2 border-[#0E2A38] rounded-3xl p-8 shadow-xl flex flex-col justify-between space-y-6 overflow-hidden transform lg:-translate-y-2">
                            <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#ef4d23] text-white font-extrabold text-[9px] uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                                Popular
                            </div>
                            
                            <div className="space-y-4 text-left font-sans">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-[#ef4d23] bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">Subscription Method</span>
                                    <h3 className="text-xl font-bold text-[#0E2A38] tracking-tight mt-3">Unlimited Rooms</h3>
                                    <p className="text-xs text-neutral-500 mt-1 font-light leading-relaxed">
                                        For mid-sized and large hotels. Unrestricted scale with every feature at your disposal.
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold text-[#0E2A38] tracking-tight">₹21,000</span>
                                        <span className="text-sm text-neutral-500 font-medium">/ year</span>
                                    </div>
                                    <p className="text-[11px] text-[#ef4d23] font-semibold mt-1">+ 12% commission per booking</p>
                                </div>
                                
                                <div className="h-px bg-neutral-100 my-4" />

                                <h4 className="text-xs font-bold text-[#0E2A38] uppercase tracking-wide">Included Features:</h4>
                                <ul className="space-y-2.5 text-xs text-neutral-600 font-light">
                                    {[
                                        "Custom Website & Booking Engine",
                                        "OTA Channel Manager Sync",
                                        "Guest Portal with Aadhaar Check-In",
                                        "Restaurant POS & Digital Menus",
                                        "WhatsApp Booking Automations",
                                        "GST Billing & Invoice Folios",
                                        "Unlimited Rooms & Staff",
                                    ].map((f, i) => (
                                        <li key={i} className="flex gap-2 items-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#ef4d23]" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="pt-4">
                                <a
                                    href="/signup"
                                    className="w-full bg-[#ef4d23] hover:bg-[#d63f1a] text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md text-center text-sm"
                                >
                                    <span>Get Started</span>
                                </a>
                            </div>
                        </div>

                        {/* 3. Commission-Only */}
                        <div className="relative bg-white border border-neutral-200 rounded-3xl p-8 shadow-lg flex flex-col justify-between space-y-6 overflow-hidden">
                            <div className="space-y-4 text-left font-sans">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">Commission Method</span>
                                    <h3 className="text-xl font-bold text-[#0E2A38] tracking-tight mt-3">Commission Only</h3>
                                    <p className="text-xs text-neutral-500 mt-1 font-light leading-relaxed">
                                        For hotels wanting zero upfront costs. Pay only when you earn booking revenue.
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-extrabold text-[#0E2A38] tracking-tight">₹0</span>
                                        <span className="text-sm text-neutral-500 font-medium">/ year</span>
                                    </div>
                                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">12% commission per booking</p>
                                </div>
                                
                                <div className="h-px bg-neutral-100 my-4" />

                                <h4 className="text-xs font-bold text-[#0E2A38] uppercase tracking-wide">Included Features:</h4>
                                <ul className="space-y-2.5 text-xs text-neutral-600 font-light">
                                    {[
                                        "Custom Website & Booking Engine",
                                        "Guest Portal with Aadhaar Check-In",
                                        "WhatsApp Booking Automations",
                                        "GST Billing & Invoice Folios",
                                        "Unlimited Rooms & Staff",
                                        "No Setup or Yearly Fee",
                                        "No Channel Manager Sync (Disabled)",
                                        "No Restaurant POS & Dining (Disabled)",
                                    ].map((f, i) => {
                                        const isRed = f.includes("Disabled");
                                        return (
                                            <li key={i} className={`flex gap-2 items-center ${isRed ? 'opacity-50' : ''}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isRed ? 'bg-red-500' : 'bg-emerald-600'}`} />
                                                <span className={isRed ? 'line-through' : ''}>{f}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="pt-4">
                                <a
                                    href="/signup"
                                    className="w-full bg-[#0E2A38] hover:bg-[#ef4d23] text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md text-center text-sm"
                                >
                                    <span>Get Started Free</span>
                                </a>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ROI SECTION (DARK) */}
                <section className="bg-[#0b0f1a] text-white py-24 mx-4 rounded-3xl relative overflow-hidden border border-neutral-800 shadow-lg">
                    <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />

                    <div className="max-w-[1000px] mx-auto px-6 sm:px-8 lg:px-12 text-center relative z-10">
                        <motion.h2
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-20%" }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            className="text-3xl md:text-4xl font-bold mb-10 tracking-wide"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            Your software should <span className="text-[#ef4d23]">generate revenue.</span>
                        </motion.h2>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: "-20%" }}
                            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 lg:p-12 rounded-3xl shadow-xl inline-block text-left"
                        >
                            <div className="space-y-4 text-sm sm:text-base font-medium text-white/90">
                                <p className="flex items-center gap-4"><span className="w-2 h-2 rounded-full bg-slate-500" /> Growth plan costs just <strong className="text-white text-lg ml-2">₹2,499/month</strong></p>
                                <p className="flex items-center gap-4"><span className="w-2 h-2 rounded-full bg-slate-500" /> One extra direct booking at <strong className="text-emerald-400 text-lg ml-2 bg-[#E8F3EF]/10 px-2.5 py-0.5 rounded">₹3,000/night</strong> covers it</p>

                                <div className="h-[1px] bg-white/20 my-6" />

                                <div className="flex items-center justify-between gap-12">
                                    <span className="text-white/60 text-base">Annual ROI</span>
                                    <span className="text-3xl lg:text-4xl font-bold text-[#ef4d23]">12x return</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/10 text-center">
                                <p className="text-sm font-bold tracking-widest uppercase text-white/70">
                                    One booking pays for <span className="text-white">the entire month.</span>
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
                    {/* TRUST SECTION */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { icon: Shield, title: "Secure Infrastructure" },
                            { icon: Zap, title: "Real-Time Sync" },
                            { icon: Receipt, title: "No Hidden Charges" },
                            { icon: Building2, title: "Annual Contracts" }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-10%" }}
                                transition={{ delay: i * 0.1, duration: 0.8 }}
                                className="flex flex-col items-center text-center p-6 bg-white border border-neutral-200/60 rounded-2xl shadow-sm"
                            >
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-[#ef4d23]">
                                    <item.icon size={22} strokeWidth={1.5} />
                                </div>
                                <h4 className="font-bold text-neutral-800 text-xs sm:text-sm tracking-wide">{item.title}</h4>
                            </motion.div>
                        ))}
                    </div>

                    {/* FAQ SECTION */}
                    <div className="pb-8">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold text-neutral-900" style={{ fontFamily: "'Inter', sans-serif" }}>Frequently asked questions</h2>
                        </div>
                        <FAQAccordion />
                    </div>

                    {/* FINAL CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-10%" }}
                        transition={{ duration: 1 }}
                        className="text-center bg-white rounded-3xl py-16 px-6 border border-neutral-200 shadow-sm"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-8 tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
                            Ready to upgrade your hotel operations?
                        </h2>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a href="https://wa.me/919345244727?text=Hi%2C%20I%20would%20like%20to%20talk%20to%20sales%20about%20Trip%20Looper" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3.5 bg-[#ef4d23] hover:bg-[#d63f1a] text-white rounded-xl font-bold text-sm tracking-wider transition-colors shadow-sm inline-block text-center cursor-pointer">
                                Talk to Sales
                            </a>
                            <a href="https://wa.me/919345244727?text=Hi%2C%20I%20would%20like%20to%20book%20a%20demo%20for%20Trip%20Looper" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-neutral-800 border-2 border-neutral-800 rounded-xl font-bold text-sm tracking-wider transition-colors shadow-sm inline-block text-center cursor-pointer">
                                Schedule Demo
                            </a>
                        </div>
                    </motion.div>
                </div>

                {/* FOOTER */}
                <SaaSFooter />
            </div>
        </div>
    );
}
