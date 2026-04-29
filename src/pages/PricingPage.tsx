import { useState } from 'react';
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

    return (
        <div className="bg-[#F8FAFC] min-h-screen pt-32 pb-24 relative overflow-hidden text-[#0E2A38]">
            <Helmet>
                <title>Pricing - EasyStay | Free to Start, Plans from ₹2,499/mo</title>
                <meta name="description" content="Simple, transparent pricing for hotel and restaurant management. Start free with up to 5 rooms. Growth, Pro, and Enterprise plans for every property size." />
                <link rel="canonical" href="https://esaystay.com/pricing" />
                <meta property="og:title" content="EasyStay Pricing - Free to Start, Plans from ₹2,499/mo" />
                <meta property="og:description" content="Simple, transparent pricing. Start free with up to 5 rooms. Growth, Pro, and Enterprise plans for every property size." />
                <meta property="og:url" content="https://esaystay.com/pricing" />
                <meta property="og:type" content="website" />
                <meta property="og:image" content="https://esaystay.com/og-image.png" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="EasyStay Pricing - Free to Start" />
                <meta name="twitter:description" content="Hotel & restaurant management from ₹2,499/mo. Free starter plan available." />
                <meta name="twitter:image" content="https://esaystay.com/og-image.png" />
                <script type="application/ld+json">{JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": [
                        { "@type": "Question", "name": "Is there a free plan?", "acceptedAnswer": { "@type": "Answer", "text": "Yes! Our Starter plan is completely free — up to 5 rooms, 20 bookings per month, and a basic booking page. No credit card required." }},
                        { "@type": "Question", "name": "Is there a setup fee?", "acceptedAnswer": { "@type": "Answer", "text": "No. All onboarding, initial data migration, and training are included in your subscription." }},
                        { "@type": "Question", "name": "Do you integrate with OTAs?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, our Pro and Enterprise plans include seamless two-way synchronization with all major OTAs (MakeMyTrip, Goibibo, Booking.com, Agoda) via our channel manager." }},
                        { "@type": "Question", "name": "Can I manage my hotel restaurant too?", "acceptedAnswer": { "@type": "Answer", "text": "Absolutely. Our Pro plan includes a full restaurant POS — menu management, food orders with kitchen tracking, table management, and inventory control." }},
                        { "@type": "Question", "name": "Can I manage multiple properties?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The Enterprise plan includes a multi-property dashboard where you can manage all your hotels from a single login." }},
                        { "@type": "Question", "name": "What happens after Year 1?", "acceptedAnswer": { "@type": "Answer", "text": "Your subscription locks in your pricing for 12 months. After Year 1, you can renew at the same rate." }}
                    ]
                })}</script>
            </Helmet>

            {/* Background Layering */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F7] -z-20" />
            <div className="absolute inset-0 opacity-5 mix-blend-overlay -z-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />

            <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">

                {/* HERO SECTION */}
                <div className="text-center max-w-4xl mx-auto mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="font-serif text-5xl md:text-6xl lg:text-[72px] font-bold text-[#0E2A38] tracking-tight leading-[1.1] mb-6 drop-shadow-sm"
                    >
                        Simple Pricing.<br />Start Free.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="text-lg md:text-xl text-gray-500 font-medium tracking-wide"
                    >
                        One platform. Complete hotel & restaurant operations. Free to start.
                    </motion.p>
                </div>

                {/* BILLING TOGGLE */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <BillingToggle isYearly={isYearly} onToggle={setIsYearly} />
                </motion.div>

                {/* PRICING GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-32 items-start">
                    <PricingCard
                        index={0}
                        name="STARTER"
                        isFree={true}
                        price={starterPrice}
                        description="Try HospitalityOS with zero commitment."
                        ctaText={loading === 'starter' ? 'Loading...' : 'Start Free'}
                        onCtaClick={() => handlePlanClick('starter')}
                        features={[
                            "Basic Booking Page",
                            "Up to 5 Rooms",
                            "Calendar View",
                            "20 Bookings / month",
                            "Email Support"
                        ]}
                    />
                    <PricingCard
                        index={1}
                        name="GROWTH"
                        price={growthPrice}
                        period={growthPeriod}
                        description="For independent hotels going digital."
                        ctaText={loading === 'growth' ? 'Processing...' : 'Get Started'}
                        onCtaClick={() => handlePlanClick('growth')}
                        features={[
                            "Everything in Starter, plus:",
                            "Custom Booking Website",
                            "Booking Engine",
                            "CRM Dashboard",
                            "Guest Management",
                            "GST Invoice System",
                            "WhatsApp (100 msgs/mo)"
                        ]}
                    />
                    <PricingCard
                        index={2}
                        name="PRO"
                        isPopular={true}
                        price={proPrice}
                        period={proPeriod}
                        description="Complete hotel + restaurant platform."
                        ctaText={loading === 'pro' ? 'Processing...' : 'Start Pro Plan'}
                        onCtaClick={() => handlePlanClick('pro')}
                        features={[
                            "Everything in Growth, plus:",
                            "OTA Booking Sync",
                            "Restaurant POS & Menu",
                            "Food Orders & Inventory",
                            "Full WhatsApp Automation",
                            "Revenue Analytics",
                            "Priority Support"
                        ]}
                    />
                    <PricingCard
                        index={3}
                        name="ENTERPRISE"
                        price={enterprisePrice}
                        period={enterprisePeriod}
                        description="For hotel groups and chains."
                        ctaText={loading === 'enterprise' ? 'Processing...' : 'Contact Sales'}
                        onCtaClick={() => handlePlanClick('enterprise')}
                        features={[
                            "Everything in Pro, plus:",
                            "Unlimited Rooms",
                            "Multi-Property Dashboard",
                            "API Access",
                            "Custom Branding",
                            "Dedicated Account Manager",
                            "On-Site Training"
                        ]}
                    />
                </div>

            </div>

            {/* ROI SECTION (DARK) */}
            <section className="bg-[#0E2A38] text-white py-32 relative overflow-hidden mb-32">
                <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />

                <div className="max-w-[1000px] mx-auto px-6 sm:px-8 lg:px-12 text-center relative z-10">
                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-20%" }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className="font-serif text-4xl md:text-5xl font-bold mb-16 tracking-wide drop-shadow-lg"
                    >
                        Your Software Should <span className="text-[#C9A646]">Generate Revenue.</span>
                    </motion.h2>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: "-20%" }}
                        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 lg:p-14 rounded-3xl shadow-2xl inline-block text-left"
                    >
                        <div className="space-y-6 text-[17px] font-medium text-white/90">
                            <p className="flex items-center gap-4"><span className="w-2 h-2 rounded-full bg-gray-500" /> Growth plan costs just <strong className="text-white text-xl ml-2">₹2,499/month</strong></p>
                            <p className="flex items-center gap-4"><span className="w-2 h-2 rounded-full bg-gray-500" /> One extra direct booking at <strong className="text-[#2E7D5B] text-xl ml-2 bg-[#E8F3EF]/10 px-2 py-0.5 rounded">₹3,000/night</strong> covers it</p>

                            <div className="h-[1px] bg-white/20 my-8" />

                            <div className="flex items-center justify-between gap-12">
                                <span className="text-white/60 text-lg">Annual ROI</span>
                                <span className="font-serif text-4xl lg:text-5xl font-bold text-[#C9A646]">12x return</span>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-white/10 text-center">
                            <p className="text-lg font-bold tracking-widest uppercase text-white/80">
                                One booking pays for <span className="text-white">the entire month.</span>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
                {/* TRUST SECTION */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-32">
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
                            className="flex flex-col items-center text-center p-6"
                        >
                            <div className="w-16 h-16 bg-[#F7F4EF] rounded-full flex items-center justify-center mb-6 text-[#0E2A38]">
                                <item.icon size={28} strokeWidth={1.5} />
                            </div>
                            <h4 className="font-bold text-[#0E2A38] text-sm tracking-wide">{item.title}</h4>
                        </motion.div>
                    ))}
                </div>

                {/* FAQ SECTION */}
                <div className="mb-32">
                    <div className="text-center mb-16">
                        <h2 className="font-serif text-4xl font-bold text-[#0E2A38]">Frequently Asked Questions</h2>
                    </div>
                    <FAQAccordion />
                </div>

                {/* FINAL CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 1 }}
                    className="text-center bg-[#F7F4EF] rounded-3xl py-24 px-6 border border-gray-200"
                >
                    <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#0E2A38] mb-10 tracking-tight">
                        Ready to Upgrade Your Hotel Operations?
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <a href="https://wa.me/919345244727?text=Hi%2C%20I%20would%20like%20to%20talk%20to%20sales%20about%20HospitalityOS" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-10 py-4 bg-[#C9A646] hover:bg-[#b08d35] text-white rounded-xl font-bold tracking-wider transition-colors shadow-md hover:shadow-lg inline-block text-center">
                            Talk to Sales
                        </a>
                        <a href="https://wa.me/919345244727?text=Hi%2C%20I%20would%20like%20to%20book%20a%20demo%20for%20HospitalityOS" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-10 py-4 bg-white hover:bg-gray-50 text-[#0E2A38] border-2 border-[#0E2A38] rounded-xl font-bold tracking-wider transition-colors shadow-sm inline-block text-center">
                            Schedule Demo
                        </a>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
