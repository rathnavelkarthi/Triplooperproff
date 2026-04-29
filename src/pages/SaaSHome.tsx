import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
    ArrowRight, CheckCircle2, Building2, CalendarRange,
    BarChart3, Settings, Users, Star, Zap, ChevronRight,
    Wifi, ShieldCheck, CreditCard, Globe, MessageCircle,
    TrendingUp, Clock, Smartphone
} from 'lucide-react';

// ─── Design Tokens ──────────────────────────────────────────────
const C = {
    forest: '#1A3C34',
    forestLight: '#234D43',
    forestDark: '#0F2921',
    cream: '#FFF8F0',
    creamDark: '#F5EDE0',
    gold: '#C8A951',
    goldLight: '#D4BC6F',
    white: '#FFFFFF',
    textDark: '#1A1A1A',
    textMuted: '#6B7280',
    textLight: '#9CA3AF',
    border: '#E8E0D4',
};

const CHART_COLORS_LANDING = ['#1A3C34', '#C8A951', '#2E7D32', '#1565C0'];

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: 0.6, ease: 'easeOut' },
};

export default function SaaSHome() {
    return (
        <div className="font-sans antialiased overflow-x-hidden" style={{ color: C.textDark }}>
            <Helmet>
                <title>EasyStay - All-in-One Hotel & Restaurant Management Platform</title>
                <meta name="description" content="Manage your hotel or restaurant from one system. Websites, bookings, POS, inventory, billing, and analytics — all connected, all in real time. Free to start." />
                <link rel="canonical" href="https://esaystay.com/" />
                <meta property="og:title" content="EasyStay - All-in-One Hotel & Restaurant Management Platform" />
                <meta property="og:description" content="Manage your hotel or restaurant from one system. Websites, bookings, POS, inventory, billing, and analytics — all connected, all in real time." />
                <meta property="og:url" content="https://esaystay.com/" />
                <meta property="og:type" content="website" />
                <meta property="og:image" content="https://esaystay.com/og-image.png" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="EasyStay - All-in-One Hotel & Restaurant Management" />
                <meta name="twitter:description" content="Bookings, POS, website, inventory, analytics — connected in one platform. Free to start." />
                <meta name="twitter:image" content="https://esaystay.com/og-image.png" />
                <script type="application/ld+json">{JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "SoftwareApplication",
                    "name": "EasyStay",
                    "applicationCategory": "BusinessApplication",
                    "operatingSystem": "Web",
                    "description": "All-in-one hotel and restaurant management platform with bookings, POS, website builder, inventory, billing, and analytics.",
                    "url": "https://esaystay.com",
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "INR",
                        "description": "Free Starter plan with up to 5 rooms"
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": "EasyStay",
                        "url": "https://esaystay.com",
                        "logo": "https://esaystay.com/logo.png"
                    }
                })}</script>
            </Helmet>
            {/* FONTS (loaded via index.html preconnect) */}
            <style>{`
                .font-display { font-family: 'Sora', sans-serif; }
                .font-body { font-family: 'Inter', sans-serif; }
            `}</style>



            {/* ═══════ 1. HERO ═══════ */}
            <section className="relative pt-28 pb-8 md:pt-36 md:pb-16 px-6" style={{ background: C.cream }}>
                <div className="max-w-7xl mx-auto text-center">
                    {/* Badge */}
                    <motion.div {...fadeUp}>
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border mb-8" style={{ background: C.white, borderColor: C.border, color: C.forest }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: C.gold }} /> New: AI-Powered Revenue Engine
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        {...fadeUp}
                        transition={{ ...fadeUp.transition, delay: 0.1 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-display leading-[1.05] tracking-tight mb-6 mx-auto max-w-5xl"
                        style={{ color: C.forest }}
                    >
                        The operating system for modern hospitality
                    </motion.h1>

                    <motion.p
                        {...fadeUp}
                        transition={{ ...fadeUp.transition, delay: 0.2 }}
                        className="text-lg md:text-xl font-body max-w-2xl mx-auto mb-10 leading-relaxed"
                        style={{ color: C.textMuted }}
                    >
                        Bookings, POS, website, inventory, and analytics — connected in one beautiful platform. Replace 6 tools with one.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
                        <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-base font-semibold transition-all hover:opacity-90 shadow-xl" style={{ background: C.forest, color: C.cream }}>
                            Start Free <ArrowRight size={18} />
                        </Link>
                        <a href="https://wa.me/919345244727?text=Hi%2C%20I%20would%20like%20to%20book%20a%20demo%20for%20EasyStay" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-base font-semibold border-2 transition-all hover:bg-white/50" style={{ borderColor: C.border, color: C.forest }}>
                            Book a Demo
                        </a>
                    </motion.div>

                    {/* Hero Dashboard Image */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
                        className="relative max-w-6xl mx-auto"
                    >
                        <div className="rounded-2xl md:rounded-3xl overflow-hidden border shadow-2xl shadow-[#1A3C34]/10" style={{ borderColor: C.border }}>
                            {/* Dashboard mockup */}
                            <div className="w-full h-[250px] md:h-[550px] relative" style={{ background: C.forest }}>
                                <div className="p-3 md:p-5">
                                    {/* Browser chrome */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                                        </div>
                                        <div className="flex-1 h-6 rounded-md mx-3 flex items-center px-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>app.esaystay.com/admin/dashboard</span>
                                        </div>
                                    </div>
                                    {/* Dashboard content */}
                                    <div className="grid grid-cols-4 gap-2 md:gap-3 mb-3">
                                        {[
                                            { label: 'Total Bookings', val: '284', color: '#4caf50' },
                                            { label: 'Occupancy', val: '87%', color: C.gold },
                                            { label: "Today's Revenue", val: '₹1.24L', color: '#2196F3' },
                                            { label: 'Avg Rating', val: '4.8', color: '#FF9800' },
                                        ].map((kpi, i) => (
                                            <div key={i} className="rounded-lg p-2 md:p-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                <p className="text-[8px] md:text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{kpi.label}</p>
                                                <p className="text-sm md:text-xl font-bold mt-0.5" style={{ color: kpi.color }}>{kpi.val}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Chart placeholder bars */}
                                    <div className="rounded-lg p-3 md:p-4 hidden md:block" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                        <p className="text-[10px] font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Revenue — Last 30 Days</p>
                                        <div className="flex items-end gap-1 h-40">
                                            {Array.from({ length: 30 }, (_, i) => {
                                                const h = 20 + Math.sin(i * 0.4) * 30 + Math.random() * 40;
                                                return <div key={i} className="flex-1 rounded-t transition-all" style={{ height: `${h}%`, background: `linear-gradient(to top, ${C.gold}60, ${C.gold}20)` }} />;
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Overlay bottom bar */}
                            <div className="absolute bottom-0 inset-x-0 p-4 md:p-8" style={{ background: 'linear-gradient(to top, rgba(26,60,52,0.95), transparent)' }}>
                                <div className="flex flex-wrap gap-3 md:gap-6 items-end justify-between max-w-5xl mx-auto">
                                    <div>
                                        <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-1">Today's Revenue</p>
                                        <p className="text-white text-2xl md:text-4xl font-bold font-display">₹1,24,500</p>
                                    </div>
                                    <div className="flex gap-4 md:gap-8">
                                        <div className="text-right">
                                            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-1">Occupancy</p>
                                            <p className="text-white text-xl md:text-2xl font-bold">87%</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-1">Bookings</p>
                                            <p className="text-white text-xl md:text-2xl font-bold">+28%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Cards */}
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute -top-4 -left-4 md:-top-6 md:-left-8 rounded-2xl p-4 md:p-5 shadow-xl border hidden md:flex items-center gap-3 z-20"
                            style={{ background: C.white, borderColor: C.border }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E8F5E9' }}>
                                <TrendingUp size={20} style={{ color: '#2E7D32' }} />
                            </div>
                            <div>
                                <p className="font-bold text-sm" style={{ color: C.forest }}>Direct Bookings</p>
                                <p className="text-xs font-semibold" style={{ color: '#2E7D32' }}>↑ 42% this month</p>
                            </div>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                            className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-8 rounded-2xl p-4 md:p-5 shadow-xl border hidden md:flex items-center gap-3 z-20"
                            style={{ background: C.white, borderColor: C.border }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${C.gold}20` }}>
                                <Star size={20} style={{ color: C.gold }} />
                            </div>
                            <div>
                                <p className="font-bold text-sm" style={{ color: C.forest }}>Guest Rating</p>
                                <p className="text-xs font-semibold" style={{ color: C.gold }}>4.8 / 5.0 average</p>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════ 2. TRUST LOGOS + STATS ═══════ */}
            <section className="py-12 md:py-16 px-6 border-y" style={{ background: C.white, borderColor: C.border }}>
                <div className="max-w-7xl mx-auto">
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] mb-10" style={{ color: C.textLight }}>
                        Powering modern hotels and restaurants across India
                    </p>
                    <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto text-center">
                        {[
                            { val: '50+', label: 'Properties' },
                            { val: '12,000+', label: 'Bookings' },
                            { val: '₹8Cr+', label: 'Revenue Managed' },
                        ].map((s, i) => (
                            <div key={i}>
                                <p className="text-2xl md:text-3xl font-bold font-display" style={{ color: C.forest }}>{s.val}</p>
                                <p className="text-xs md:text-sm font-medium mt-1" style={{ color: C.textMuted }}>{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ 3. FEATURES (3 cards) ═══════ */}
            <section id="features" className="py-20 md:py-32 px-6" style={{ background: C.cream }}>
                <div className="max-w-7xl mx-auto">
                    <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
                        <p className="text-sm font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: C.gold }}>Core Platform</p>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display leading-[1.1] tracking-tight mb-6" style={{ color: C.forest }}>
                            Everything you need, nothing you don't
                        </h2>
                        <p className="text-lg leading-relaxed font-body" style={{ color: C.textMuted }}>
                            Three powerful modules that replace six separate tools. Fully integrated from day one.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Settings size={28} />,
                                iconBg: '#E8F5E9', iconColor: '#2E7D32',
                                title: 'Operations OS',
                                desc: 'Manage rooms, reservations, housekeeping, and staff schedules from a single unified dashboard.',
                                tags: ['Room Management', 'Staff Scheduling', 'Housekeeping'],
                            },
                            {
                                icon: <CalendarRange size={28} />,
                                iconBg: `${C.gold}20`, iconColor: C.gold,
                                title: 'Direct Booking Engine',
                                desc: 'Your own branded booking website that converts visitors into guests. Stop paying 18% to OTAs.',
                                tags: ['Custom Website', 'Payment Gateway', 'Booking Calendar'],
                            },
                            {
                                icon: <BarChart3 size={28} />,
                                iconBg: '#E3F2FD', iconColor: '#1565C0',
                                title: 'Revenue Intelligence',
                                desc: 'Real-time analytics with occupancy-based dynamic pricing. Know exactly where your revenue comes from.',
                                tags: ['Live Dashboard', 'Dynamic Pricing', 'Revenue Reports'],
                            }
                        ].map((feat, i) => (
                            <motion.div
                                key={i}
                                {...fadeUp}
                                transition={{ ...fadeUp.transition, delay: i * 0.15 }}
                                className="rounded-3xl p-8 border flex flex-col transition-all hover:-translate-y-1 duration-300"
                                style={{ background: C.white, borderColor: C.border, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}
                            >
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: feat.iconBg }}>
                                    <span style={{ color: feat.iconColor }}>{feat.icon}</span>
                                </div>
                                <h3 className="text-xl font-bold mb-3" style={{ color: C.forest }}>{feat.title}</h3>
                                <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: C.textMuted }}>{feat.desc}</p>
                                <div className="flex flex-wrap gap-2">
                                    {feat.tags.map(tag => (
                                        <span key={tag} className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: C.cream, color: C.forest }}>{tag}</span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ 4. HOW IT WORKS ═══════ */}
            <section id="how-it-works" className="py-20 md:py-32 px-6" style={{ background: C.forest }}>
                <div className="max-w-7xl mx-auto">
                    <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
                        <p className="text-sm font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: C.gold }}>How It Works</p>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display leading-[1.1] tracking-tight mb-6 text-white">
                            Live in 15 minutes.<br />No technical skills needed.
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-4 gap-8 relative">
                        {/* Connecting line */}
                        <div className="hidden md:block absolute top-[42px] left-[12%] right-[12%] h-px" style={{ background: `${C.gold}40` }} />

                        {[
                            { step: '01', title: 'Create your property', desc: 'Sign up and add your property details in under 2 minutes.' },
                            { step: '02', title: 'Add rooms & pricing', desc: 'Configure room types, photos, and dynamic pricing rules.' },
                            { step: '03', title: 'Launch your website', desc: 'Your branded booking site goes live instantly with your domain.' },
                            { step: '04', title: 'Start earning', desc: 'Receive bookings, manage ops, and watch revenue grow.' },
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                {...fadeUp}
                                transition={{ ...fadeUp.transition, delay: idx * 0.12 }}
                                className="relative z-10 flex flex-col items-center text-center"
                            >
                                <div className="w-[84px] h-[84px] rounded-full flex items-center justify-center font-display text-2xl font-bold mb-6 border-2"
                                    style={{ background: C.forestLight, borderColor: `${C.gold}60`, color: C.gold }}>
                                    {item.step}
                                </div>
                                <h4 className="font-bold text-lg text-white mb-2 font-body">{item.title}</h4>
                                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ 5. BIG PRODUCT SHOWCASE ═══════ */}
            <section className="py-20 md:py-32 px-6" style={{ background: C.cream }}>
                <div className="max-w-7xl mx-auto">
                    <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-16">
                        <p className="text-sm font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: C.gold }}>Product</p>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display leading-[1.1] tracking-tight" style={{ color: C.forest }}>
                            Beautiful, powerful, and fast.
                        </h2>
                    </motion.div>

                    <motion.div {...fadeUp} className="relative mx-auto max-w-6xl">
                        <div className="rounded-3xl overflow-hidden border shadow-2xl shadow-black/5" style={{ background: C.forest, borderColor: C.forestLight }}>
                            <div className="p-3 md:p-4">
                                {/* Browser chrome */}
                                <div className="flex items-center gap-2 mb-3 md:mb-4">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400/60" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                                        <div className="w-3 h-3 rounded-full bg-green-400/60" />
                                    </div>
                                    <div className="flex-1 h-7 rounded-lg mx-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                </div>
                                {/* Dashboard mockup */}
                                <div className="rounded-xl w-full h-[250px] md:h-[550px] p-4 md:p-6 overflow-hidden" style={{ background: C.cream }}>
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        {['Rooms', 'Reservations', 'Revenue'].map((t, i) => (
                                            <div key={t} className="rounded-xl p-3 md:p-4 border" style={{ background: C.white, borderColor: C.border }}>
                                                <p className="text-[9px] md:text-xs font-medium" style={{ color: C.textMuted }}>{t}</p>
                                                <p className="text-base md:text-2xl font-bold mt-1" style={{ color: C.forest }}>{['24/28', '156', '₹8.4L'][i]}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-5 gap-3 h-[calc(100%-80px)]">
                                        <div className="col-span-3 rounded-xl border p-3 md:p-4" style={{ background: C.white, borderColor: C.border }}>
                                            <p className="text-[9px] md:text-xs font-semibold mb-3" style={{ color: C.forest }}>Occupancy Overview</p>
                                            <div className="flex items-end gap-1 h-[70%]">
                                                {Array.from({ length: 14 }, (_, i) => {
                                                    const h = 30 + Math.sin(i * 0.5) * 25 + (i > 8 ? 20 : 0);
                                                    return <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i > 10 ? C.gold : C.forest, opacity: 0.7 }} />;
                                                })}
                                            </div>
                                        </div>
                                        <div className="col-span-2 rounded-xl border p-3 md:p-4 flex flex-col gap-2" style={{ background: C.white, borderColor: C.border }}>
                                            <p className="text-[9px] md:text-xs font-semibold" style={{ color: C.forest }}>Today's Check-ins</p>
                                            {['Rajiv M.', 'Priya S.', 'Amit K.', 'Sarah L.'].map((name, i) => (
                                                <div key={name} className="flex items-center gap-2 py-1 border-b" style={{ borderColor: `${C.border}80` }}>
                                                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-bold text-white" style={{ background: CHART_COLORS_LANDING[i % CHART_COLORS_LANDING.length] }}>{name[0]}</div>
                                                    <span className="text-[9px] md:text-xs font-medium" style={{ color: C.textDark }}>{name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating feature pills */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute top-[15%] -left-3 md:-left-10 rounded-2xl px-5 py-3 shadow-xl border hidden md:flex items-center gap-3 z-20"
                            style={{ background: C.white, borderColor: C.border }}
                        >
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            <span className="font-bold text-sm" style={{ color: C.forest }}>Real-time Bookings</span>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, 12, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                            className="absolute top-[40%] -right-3 md:-right-10 rounded-2xl px-5 py-3 shadow-xl border hidden md:flex items-center gap-3 z-20"
                            style={{ background: C.white, borderColor: C.border }}
                        >
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: C.gold }} />
                            <span className="font-bold text-sm" style={{ color: C.forest }}>Revenue Analytics</span>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                            className="absolute bottom-[15%] -left-3 md:-left-10 rounded-2xl px-5 py-3 shadow-xl border hidden md:flex items-center gap-3 z-20"
                            style={{ background: C.white, borderColor: C.border }}
                        >
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <span className="font-bold text-sm" style={{ color: C.forest }}>POS & Orders</span>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════ 6. ROI SECTION ═══════ */}
            <section className="py-20 md:py-32 px-6" style={{ background: C.white }}>
                <div className="max-w-5xl mx-auto">
                    <motion.div {...fadeUp} className="text-center mb-16">
                        <p className="text-sm font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: C.gold }}>Save Money</p>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display leading-[1.1] tracking-tight" style={{ color: C.forest }}>
                            Stop paying 18% to OTAs.
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-6 items-stretch">
                        {/* OTA */}
                        <motion.div {...fadeUp} className="rounded-3xl p-10 border relative overflow-hidden" style={{ background: '#FFF5F5', borderColor: '#FECDD3' }}>
                            <div className="absolute top-0 inset-x-0 h-1 bg-red-400" />
                            <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#DC2626' }}>With OTA Platforms</p>
                            <p className="text-6xl font-display font-bold mb-4" style={{ color: C.textDark }}>18%</p>
                            <p className="text-sm mb-8" style={{ color: C.textMuted }}>Commission taken on every booking by third-party aggregators.</p>
                            <div className="pt-6 border-t" style={{ borderColor: '#FECDD3' }}>
                                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: C.textLight }}>Lost Yearly</p>
                                <p className="text-3xl font-bold font-display" style={{ color: C.textDark }}>₹5.4L</p>
                            </div>
                        </motion.div>

                        {/* Direct */}
                        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="rounded-3xl p-10 border relative overflow-hidden" style={{ background: C.forest, borderColor: C.forestLight }}>
                            <div className="absolute top-0 inset-x-0 h-1" style={{ background: C.gold }} />
                            <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: C.gold }}>With EasyStay</p>
                            <p className="text-6xl font-display font-bold text-white mb-4">0%</p>
                            <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>Zero commission. You own the guest relationship and revenue.</p>
                            <div className="pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>You Save</p>
                                <p className="text-4xl font-bold font-display text-white">₹6L<span className="text-lg font-body font-medium" style={{ color: C.gold }}> / year</span></p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════ 7. TESTIMONIALS ═══════ */}
            <section id="testimonials" className="py-20 md:py-32 px-6" style={{ background: C.cream }}>
                <div className="max-w-7xl mx-auto">
                    <motion.div {...fadeUp} className="text-center mb-16">
                        <p className="text-sm font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: C.gold }}>Testimonials</p>
                        <h2 className="text-4xl md:text-5xl font-display leading-tight tracking-tight" style={{ color: C.forest }}>
                            Loved by operators across India
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { name: 'Rajiv Sharma', role: 'Boutique Hotel, Jaipur', text: "We replaced 5 different tools with EasyStay. Our direct bookings jumped 40% in the first quarter and staff onboarding now takes days instead of weeks." },
                            { name: 'Anita Desai', role: 'Resort Manager, Goa', text: "The occupancy-based pricing engine paid for the software in its first month. During peak season, our ADR increased 25% compared to last year." },
                            { name: 'Vikram Patel', role: 'Homestay Host, Pondicherry', text: "My booking website looks like it cost ₹50,000 to build. Reality: I set it up in 20 minutes. Guests actually trust it more than my OTA listing." }
                        ].map((t, i) => (
                            <motion.div
                                key={i}
                                {...fadeUp}
                                transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                                className="rounded-3xl p-8 border flex flex-col"
                                style={{ background: C.white, borderColor: C.border, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}
                            >
                                <div className="flex gap-0.5 mb-6" style={{ color: C.gold }}>
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} className="fill-current" />)}
                                </div>
                                <p className="text-sm leading-relaxed flex-1 mb-8 font-body" style={{ color: C.textMuted }}>
                                    "{t.text}"
                                </p>
                                <div className="flex items-center gap-3 pt-6 border-t" style={{ borderColor: C.border }}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: C.cream, color: C.forest }}>
                                        {t.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: C.forest }}>{t.name}</p>
                                        <p className="text-xs" style={{ color: C.textMuted }}>{t.role}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ 8. PRICING ═══════ */}
            <section id="pricing" className="py-20 md:py-32 px-6" style={{ background: C.white }}>
                <div className="max-w-7xl mx-auto">
                    <motion.div {...fadeUp} className="text-center mb-16 md:mb-20">
                        <p className="text-sm font-semibold uppercase tracking-[0.15em] mb-4" style={{ color: C.gold }}>Pricing</p>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display leading-[1.1] tracking-tight mb-4" style={{ color: C.forest }}>
                            Plans that grow with you
                        </h2>
                        <p className="text-lg font-body" style={{ color: C.textMuted }}>Start free. Upgrade when you're ready.</p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
                        {/* Starter */}
                        <motion.div {...fadeUp} className="rounded-3xl p-7 border flex flex-col" style={{ background: C.cream, borderColor: C.border }}>
                            <h3 className="text-lg font-bold mb-1" style={{ color: C.forest }}>Starter</h3>
                            <p className="text-xs mb-5" style={{ color: C.textMuted }}>For single properties getting started</p>
                            <div className="mb-6">
                                <span className="text-4xl font-display font-bold" style={{ color: C.forest }}>₹0</span>
                                <span className="text-sm ml-1" style={{ color: C.textMuted }}>/ forever</span>
                            </div>
                            <Link to="/signup" className="w-full text-center text-sm font-semibold py-3 rounded-full border mb-6 block transition-all hover:bg-white" style={{ borderColor: C.border, color: C.forest }}>
                                Start Free
                            </Link>
                            <ul className="space-y-3 text-sm flex-1" style={{ color: C.textMuted }}>
                                {['1 Property, 5 Rooms', 'Basic booking page', '20 bookings / month'].map(f => (
                                    <li key={f} className="flex gap-2.5"><CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: '#2E7D32' }} />{f}</li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Growth */}
                        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="rounded-3xl p-7 border flex flex-col" style={{ background: C.white, borderColor: C.border, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
                            <h3 className="text-lg font-bold mb-1" style={{ color: C.forest }}>Growth</h3>
                            <p className="text-xs mb-5" style={{ color: C.textMuted }}>For growing properties up to 30 rooms</p>
                            <div className="mb-1">
                                <span className="text-4xl font-display font-bold" style={{ color: C.forest }}>₹2,499</span>
                                <span className="text-sm ml-1" style={{ color: C.textMuted }}>/ mo</span>
                            </div>
                            <p className="text-xs font-medium mb-6" style={{ color: '#2E7D32' }}>₹23,999/yr — save 20%</p>
                            <Link to="/signup" className="w-full text-center text-sm font-semibold py-3 rounded-full border mb-6 block transition-all hover:opacity-90" style={{ background: C.forest, borderColor: C.forest, color: C.cream }}>
                                Start Trial
                            </Link>
                            <ul className="space-y-3 text-sm flex-1" style={{ color: C.textMuted }}>
                                {['Up to 30 rooms', 'Booking engine + website', 'Calendar & invoices', 'WhatsApp (100 msgs/mo)'].map(f => (
                                    <li key={f} className="flex gap-2.5"><CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: '#2E7D32' }} />{f}</li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Pro */}
                        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="rounded-3xl p-7 border-2 flex flex-col relative" style={{ background: C.forest, borderColor: C.gold }}>
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold" style={{ background: C.gold, color: C.white }}>MOST POPULAR</div>
                            <h3 className="text-lg font-bold text-white mb-1 mt-2">Pro</h3>
                            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>Hotels & restaurants that mean business</p>
                            <div className="mb-1">
                                <span className="text-4xl font-display font-bold text-white">₹4,999</span>
                                <span className="text-sm ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>/ mo</span>
                            </div>
                            <p className="text-xs font-medium mb-6" style={{ color: C.gold }}>₹47,999/yr — save 20%</p>
                            <Link to="/signup" className="w-full text-center text-sm font-bold py-3.5 rounded-full mb-6 block transition-all hover:opacity-90 shadow-lg" style={{ background: C.gold, color: C.white }}>
                                Start Free Trial
                            </Link>
                            <ul className="space-y-3 text-sm flex-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                {['Up to 75 rooms', 'OTA channel sync', 'Restaurant POS + orders', 'Full WhatsApp automation', 'Revenue analytics'].map(f => (
                                    <li key={f} className="flex gap-2.5"><CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: C.gold }} />{f}</li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* Enterprise */}
                        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} className="rounded-3xl p-7 border flex flex-col" style={{ background: C.cream, borderColor: C.border }}>
                            <h3 className="text-lg font-bold mb-1" style={{ color: C.forest }}>Enterprise</h3>
                            <p className="text-xs mb-5" style={{ color: C.textMuted }}>Multi-property groups & chains</p>
                            <div className="mb-1">
                                <span className="text-4xl font-display font-bold" style={{ color: C.forest }}>₹9,999</span>
                                <span className="text-sm ml-1" style={{ color: C.textMuted }}>/ mo</span>
                            </div>
                            <p className="text-xs font-medium mb-6" style={{ color: '#2E7D32' }}>₹95,999/yr — save 20%</p>
                            <a href="https://wa.me/919345244727?text=Hi%2C%20I%27m%20interested%20in%20the%20Enterprise%20plan%20for%20EasyStay" target="_blank" rel="noopener noreferrer" className="w-full text-center text-sm font-semibold py-3 rounded-full border mb-6 block transition-all hover:bg-white" style={{ borderColor: C.border, color: C.forest }}>
                                Contact Sales
                            </a>
                            <ul className="space-y-3 text-sm flex-1" style={{ color: C.textMuted }}>
                                {['Unlimited rooms', 'Multi-property dashboard', 'Custom branding', 'API access', 'Dedicated support'].map(f => (
                                    <li key={f} className="flex gap-2.5"><CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: '#2E7D32' }} />{f}</li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════ 9. FINAL CTA ═══════ */}
            <section className="py-24 md:py-36 px-6" style={{ background: C.forest }}>
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div {...fadeUp}>
                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-display text-white leading-[1.1] tracking-tight mb-8">
                            Ready to run your property smarter?
                        </h2>
                        <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto font-body" style={{ color: 'rgba(255,255,255,0.55)' }}>
                            Join the operators across India who replaced 6 tools with one unified platform. Start free today.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link to="/signup" className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full text-lg font-semibold shadow-xl transition-all hover:opacity-90" style={{ background: C.gold, color: C.white }}>
                                Get started for free <ArrowRight size={20} />
                            </Link>
                            <a href="https://wa.me/919345244727?text=Hi%2C%20I%20would%20like%20to%20book%20a%20demo%20for%20EasyStay" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-full text-lg font-semibold border-2 transition-all hover:bg-white/10" style={{ borderColor: 'rgba(255,255,255,0.2)', color: C.white }}>
                                Book a demo
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════ FOOTER ═══════ */}
            <footer className="py-10 px-6 border-t" style={{ background: C.forestDark, borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 font-bold text-lg text-white font-display">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${C.gold}30` }}>
                            <Zap size={14} style={{ color: C.gold }} />
                        </div>
                        EasyStay
                    </div>
                    <div className="flex gap-6 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
                        <a href="#" className="hover:text-white/60 transition-colors">Contact</a>
                    </div>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>&copy; {new Date().getFullYear()} EasyStay. All rights reserved.</p>
                </div>
            </footer>

            {/* ═══════ MOBILE STICKY CTA ═══════ */}
            <div className="md:hidden fixed bottom-0 inset-x-0 p-3 backdrop-blur-xl border-t z-50" style={{ background: `${C.cream}ee`, borderColor: C.border }}>
                <Link to="/signup" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold shadow-xl" style={{ background: C.forest, color: C.cream }}>
                    Start Free <ArrowRight size={16} />
                </Link>
            </div>

        </div>
    );
}
