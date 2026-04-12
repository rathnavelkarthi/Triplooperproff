import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 };

export default function CTA() {
    const reduced = useReducedMotion();
    return (
        <section className="relative py-32 lg:py-40 bg-black overflow-hidden">
            {/* Gradient glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-black pointer-events-none" />

            {/* Radial spotlight */}
            <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-500/15 blur-[120px] rounded-full pointer-events-none" />

            {/* Bottom floating light */}
            <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-purple-500/15 blur-[150px] rounded-full pointer-events-none" />

            {/* Grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

            {/* Grain */}
            <div
                className="absolute inset-0 opacity-[0.015] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                }}
            />

            <div className="relative z-10 max-w-[700px] mx-auto px-6 text-center">
                <motion.h2
                    initial={reduced ? {} : { opacity: 0, y: 20 }}
                    whileInView={reduced ? {} : { opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10%' }}
                    transition={spring}
                    className="text-[36px] md:text-[42px] lg:text-[48px] font-bold text-white tracking-[-0.03em] leading-tight mb-8"
                >
                    Ready to run your hotel from one screen?
                </motion.h2>

                <motion.div
                    initial={reduced ? {} : { opacity: 0, y: 15 }}
                    whileInView={reduced ? {} : { opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...spring, delay: 0.1 }}
                >
                    <Link
                        to="/admin/login"
                        className="inline-flex items-center gap-2 text-[16px] font-semibold text-[#0071e3] bg-white hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] px-8 py-4 min-h-[48px] rounded-full transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                        Start Free Trial
                        <ArrowRight size={18} />
                    </Link>
                </motion.div>

                <motion.p
                    initial={reduced ? {} : { opacity: 0 }}
                    whileInView={reduced ? {} : { opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ ...spring, delay: 0.2 }}
                    className="mt-5 text-[14px] text-white/40"
                >
                    No credit card required. Set up in 2 minutes.
                </motion.p>
            </div>
        </section>
    );
}
