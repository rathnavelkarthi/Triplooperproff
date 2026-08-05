import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, ArrowRight } from 'lucide-react';

interface Tier {
    name: string;
    description: string;
    monthlyPrice: string;
    yearlyPrice: string;
    ctaText: string;
    popular?: boolean;
    isFree?: boolean;
    features: string[];
}

const tiers: Tier[] = [
    {
        name: 'Starter',
        description: 'Try it free. Perfect for small PGs and guesthouses.',
        monthlyPrice: 'Free',
        yearlyPrice: 'Free',
        ctaText: 'Start Free',
        isFree: true,
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
        description: 'For small hotels and PGs ready to scale.',
        monthlyPrice: '₹2,499',
        yearlyPrice: '₹23,999',
        ctaText: 'Get Started',
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
        description: 'Complete operations for mid-size hotels.',
        monthlyPrice: '₹4,999',
        yearlyPrice: '₹47,999',
        ctaText: 'Start Pro Plan',
        popular: true,
        features: [
            'Everything in Growth',
            'OTA Booking Sync',
            'Restaurant POS & Menu',
            'Food Orders & Inventory',
            'Full WhatsApp Automation',
            'Revenue Analytics',
            'Priority Support',
        ],
    },
    {
        name: 'Enterprise',
        description: 'For hotel groups and chains. Unlimited scale.',
        monthlyPrice: '₹9,999',
        yearlyPrice: '₹95,999',
        ctaText: 'Contact Sales',
        features: [
            'Everything in Pro',
            'Unlimited Rooms',
            'Multi-Property Dashboard',
            'API Access',
            'Custom Branding',
            'Dedicated Account Manager',
            'On-Site Training',
        ],
    },
];

export default function PricingSection() {
    const [isYearly, setIsYearly] = useState(true);

    return (
        <section id="pricing" className="py-24 lg:py-32">
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={{ duration: 0.6 }}
                        className="text-xs font-semibold text-accent uppercase tracking-widest mb-3"
                    >
                        Pricing
                    </motion.p>
                    <motion.h2
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={{ duration: 0.7, delay: 0.05 }}
                        className="text-3xl md:text-4xl lg:text-[42px] font-extrabold text-foreground tracking-tight leading-tight mb-4"
                    >
                        Simple Pricing. Start Free.
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-base text-foreground/40"
                    >
                        One platform. Complete hotel & restaurant operations. Free to start.
                    </motion.p>
                </div>

                {/* Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="flex items-center justify-center gap-3 mb-14"
                >
                    <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-foreground' : 'text-foreground/30'}`}>
                        Monthly
                    </span>
                    <button
                        onClick={() => setIsYearly(!isYearly)}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isYearly ? 'bg-primary' : 'bg-foreground/15'
                            }`}
                    >
                        <div
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${isYearly ? 'translate-x-6' : 'translate-x-0.5'
                                }`}
                        />
                    </button>
                    <span className={`text-sm font-medium transition-colors ${isYearly ? 'text-foreground' : 'text-foreground/30'}`}>
                        Yearly
                    </span>
                    {isYearly && (
                        <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-1 rounded-full">
                            Save 20%
                        </span>
                    )}
                </motion.div>

                {/* Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                    {tiers.map((tier, i) => (
                        <motion.div
                            key={tier.name}
                            initial={{ opacity: 0, y: 25 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-5%' }}
                            transition={{ duration: 0.6, delay: i * 0.08 }}
                            className={`relative rounded-2xl border transition-all duration-300 ${tier.popular
                                ? 'bg-primary text-white border-primary shadow-[0_20px_60px_rgba(14,42,56,0.2)] p-8 lg:p-9 -my-2 lg:-my-4'
                                : 'bg-background border-foreground/5 hover:shadow-[0_8px_30px_rgba(14,42,56,0.06)] p-7'
                                }`}
                        >
                            {tier.popular && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-accent text-white px-3 py-1 rounded-full uppercase tracking-wider">
                                    Most popular
                                </span>
                            )}

                            <p className="text-xs font-bold uppercase tracking-widest mb-2 opacity-50">{tier.name}</p>
                            <p className={`text-3xl font-extrabold mb-1 ${tier.popular ? 'text-white' : 'text-foreground'}`}>
                                {isYearly ? tier.yearlyPrice : tier.monthlyPrice}
                            </p>
                            <p className={`text-xs mb-5 ${tier.popular ? 'text-white/40' : 'text-foreground/30'}`}>
                                {tier.isFree ? 'forever' : `per ${isYearly ? 'year' : 'month'}`}
                            </p>
                            <p className={`text-sm mb-6 leading-relaxed ${tier.popular ? 'text-white/60' : 'text-foreground/40'}`}>
                                {tier.description}
                            </p>

                            <button
                                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 mb-7 ${tier.popular
                                    ? 'bg-accent hover:bg-accent-hover text-white shadow-md'
                                    : tier.isFree
                                        ? 'bg-[#2E7D5B] hover:bg-[#256B4D] text-white'
                                        : 'bg-primary hover:bg-primary-hover text-white'
                                    }`}
                            >
                                {tier.ctaText}
                                <ArrowRight size={14} />
                            </button>

                            <ul className="space-y-3">
                                {tier.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2.5">
                                        <Check size={14} strokeWidth={2.5} className={`mt-0.5 shrink-0 ${tier.popular ? 'text-accent' : 'text-success'}`} />
                                        <span className={`text-sm ${tier.popular ? 'text-white/70' : 'text-foreground/50'}`}>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>

                {/* Add-ons teaser */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    className="mt-10 text-center"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-50 border border-border rounded-full flex-wrap justify-center">
                        <span className="text-xs font-medium text-text-secondary">Need more?</span>
                        <span className="text-xs font-bold text-accent">Add-ons from ₹299/mo</span>
                        <span className="text-[10px] text-text-secondary">— Extra rooms, WhatsApp, OTA sync & more</span>
                    </div>
                </motion.div>

                {/* See full pricing link */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="mt-6 text-center"
                >
                    <Link
                        to="/pricing"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
                    >
                        See full pricing details & FAQs <ArrowRight size={14} />
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}
