import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 };

interface Tier {
    name: string;
    tagline: string;
    monthly: string;
    yearly: string;
    popular?: boolean;
    features: string[];
    cta: string;
}

const tiers: Tier[] = [
    {
        name: 'Starter',
        tagline: 'For small PGs getting started.',
        monthly: 'Free',
        yearly: 'Free',
        cta: 'Start Free',
        features: [
            'Basic Booking Page',
            'Unlimited Rooms',
            'Calendar View',
            '20 Bookings/month',
            'Email Support',
        ],
    },
    {
        name: 'Growth',
        tagline: 'For small hotels ready to scale.',
        monthly: '₹2,499',
        yearly: '₹23,999',
        cta: 'Get Started',
        features: [
            'Everything in Starter',
            'Custom Booking Website',
            'Booking Engine',
            'CRM Dashboard',
            'Guest Management',
            'GST Invoices',
            'WhatsApp (100 msgs/mo)',
        ],
    },
    {
        name: 'Pro',
        tagline: 'Complete ops for mid-size hotels.',
        monthly: '₹4,999',
        yearly: '₹47,999',
        popular: true,
        cta: 'Start Pro Trial',
        features: [
            'Everything in Growth',
            'Channel Manager (OTA sync)',
            'Restaurant POS',
            'Food Inventory & KOT',
            'Revenue Analytics',
            'P&L Tracking',
            'Priority Support',
        ],
    },
    {
        name: 'Enterprise',
        tagline: 'For hotel groups at scale.',
        monthly: '₹9,999',
        yearly: '₹95,999',
        cta: 'Contact Sales',
        features: [
            'Everything in Pro',
            'Multi-Property Dashboard',
            'Unlimited Rooms',
            'Unlimited Bookings',
            'Custom Integrations',
            'Dedicated Account Manager',
            'SLA & Uptime Guarantee',
        ],
    },
];

export default function Pricing() {
    const [yearly, setYearly] = useState(false);
    const reduced = useReducedMotion();

    return (
        <section id="pricing" className="relative py-24 lg:py-32 bg-[#0a0a0a] overflow-hidden">
            {/* Grid lines — barely visible */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />
            {/* Floating lights */}
            <div className="absolute top-[-150px] left-[-100px] w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-150px] right-[-80px] w-[400px] h-[400px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
            {/* Noise texture */}
            <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
            <div className="relative z-10 max-w-[1080px] mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={spring}
                    className="text-center mb-12"
                >
                    <p className="text-[12px] font-semibold text-white/30 uppercase tracking-[0.2em] mb-3">
                        Pricing
                    </p>
                    <h2 className="text-[32px] md:text-[38px] lg:text-[42px] font-bold text-white tracking-[-0.03em] leading-tight mb-5">
                        Simple pricing. No surprises.
                    </h2>

                    {/* Toggle */}
                    <div className="inline-flex items-center gap-3 bg-white/[0.06] rounded-full p-1" role="radiogroup" aria-label="Billing period">
                        <button
                            onClick={() => setYearly(false)}
                            role="radio"
                            aria-checked={!yearly}
                            className={`text-[14px] font-medium px-6 py-2.5 min-h-[44px] rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                                !yearly ? 'bg-white text-black' : 'text-white/50 hover:text-white/80'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setYearly(true)}
                            role="radio"
                            aria-checked={yearly}
                            className={`text-[14px] font-medium px-6 py-2.5 min-h-[44px] rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                                yearly ? 'bg-white text-black' : 'text-white/50 hover:text-white/80'
                            }`}
                        >
                            Yearly
                            <span className="ml-1.5 text-[10px] text-[var(--color-success)] font-semibold">Save 20%</span>
                        </button>
                    </div>
                </motion.div>

                {/* Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {tiers.map((tier, i) => (
                        <motion.div
                            key={tier.name}
                            initial={reduced ? {} : { opacity: 0, y: 30 }}
                            whileInView={reduced ? {} : { opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ ...spring, delay: i * 0.08 }}
                            {...(tier.popular && !reduced
                                ? { animate: { y: [0, -6, 0] }, transition: { ...spring, delay: i * 0.08, y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } } }
                                : !reduced ? { whileHover: { y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } } } : {}
                            )}
                            className={`relative rounded-2xl p-8 border backdrop-blur-xl transition-all duration-300 ${
                                tier.popular
                                    ? 'bg-white/[0.08] border-[var(--color-primary)] shadow-[0_0_80px_rgba(0,113,227,0.6)] lg:scale-105'
                                    : 'bg-white/5 border-white/10 shadow-[0_20px_100px_rgba(0,0,0,0.6)] hover:shadow-[0_40px_140px_rgba(0,113,227,0.25)]'
                            }`}
                        >
                            {tier.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--color-primary)] text-[10px] text-white font-semibold">
                                    Most Popular
                                </div>
                            )}

                            <h3 className="text-[18px] font-bold text-white mb-1">{tier.name}</h3>
                            <p className="text-[12px] text-white/40 mb-5">{tier.tagline}</p>

                            {/* Price */}
                            <div className="mb-5">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={yearly ? 'yearly' : 'monthly'}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                    >
                                        <span className="text-[36px] font-bold text-white tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                            {yearly ? tier.yearly : tier.monthly}
                                        </span>
                                        {tier.monthly !== 'Free' && (
                                            <span className="text-[13px] text-white/30 ml-1">
                                                /{yearly ? 'yr' : 'mo'}
                                            </span>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Features */}
                            <ul className="space-y-2.5 mb-6">
                                {tier.features.map(f => (
                                    <li key={f} className="flex items-start gap-2">
                                        <Check size={14} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                                        <span className="text-[13px] text-white/60 leading-snug">{f}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <Link
                                to="/admin/login"
                                className={`w-full flex items-center justify-center gap-2 text-[14px] font-medium py-3 min-h-[44px] rounded-full transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                                    tier.popular
                                        ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(0,113,227,0.5)] hover:shadow-[0_0_40px_rgba(0,113,227,0.6)]'
                                        : 'border border-white/20 text-white/70 hover:border-white/40 hover:text-white hover:-translate-y-0.5 active:translate-y-0'
                                }`}
                            >
                                {tier.cta}
                                <ArrowRight size={14} />
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
