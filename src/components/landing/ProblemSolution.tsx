import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { TrendingDown, Clock, Layers, TrendingUp, Zap, Target } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 };

interface StatCard {
    icon: React.ElementType;
    value: string;
    label: string;
    color: string;
}

const problems: StatCard[] = [
    { icon: TrendingDown, value: '23%', label: 'Revenue leaked to OTA commissions', color: 'var(--color-accent-red)' },
    { icon: Clock, value: '4.2hrs', label: 'Staff time wasted daily', color: 'var(--color-accent-orange)' },
    { icon: Layers, value: '6+', label: 'Disconnected tools juggled', color: 'var(--color-accent-purple)' },
];

const solutions: StatCard[] = [
    { icon: TrendingUp, value: '₹0', label: 'Commission on direct bookings', color: 'var(--color-primary)' },
    { icon: Zap, value: '4.2hrs', label: 'Saved every day', color: 'var(--color-primary)' },
    { icon: Target, value: '1', label: 'Unified platform', color: 'var(--color-primary)' },
];

function StatCardComponent({ card, index, dark, reduced }: { card: StatCard; index: number; dark?: boolean; reduced?: boolean }) {
    return (
        <motion.div
            initial={reduced ? {} : { opacity: 0, x: -30 }}
            whileInView={reduced ? {} : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ ...spring, delay: index * 0.15 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-5 p-6 rounded-2xl border ${
                dark
                    ? 'bg-white/5 backdrop-blur-xl border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.6)] hover:shadow-[0_30px_120px_rgba(0,113,227,0.2)] transition-all duration-300'
                    : 'bg-white border-black/[0.04] shadow-[0_2px_20px_rgba(0,0,0,0.04)]'
            }`}
        >
            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${card.color}12` }}
            >
                <card.icon size={22} style={{ color: card.color }} />
            </div>
            <div>
                <p className={`text-[32px] font-bold tracking-tight leading-none ${
                    dark ? 'text-white' : 'text-[var(--color-text-primary-light)]'
                }`}>
                    {card.value}
                </p>
                <p className={`text-[14px] mt-1 ${dark ? 'text-white/50' : 'text-black/50'}`}>
                    {card.label}
                </p>
            </div>
            {dark && (
                <div
                    className="absolute -inset-px rounded-2xl opacity-20 blur-xl pointer-events-none"
                    style={{ background: `radial-gradient(circle at 30% 50%, ${card.color}30, transparent 70%)` }}
                />
            )}
        </motion.div>
    );
}

export default function ProblemSolution() {
    const reduced = useReducedMotion();
    const sectionRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start end', 'end start'],
    });

    const bgOpacity = useTransform(scrollYProgress, [0.35, 0.55], [0, 1]);

    return (
        <div ref={sectionRef} className="relative">
            {/* ── Part 1: The Old Way (light) ── */}
            <section className="relative py-24 lg:py-32 bg-[#f5f5f7] overflow-hidden">
                {/* Light section depth gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent opacity-40 pointer-events-none" />
                <div className="relative z-10 max-w-[980px] mx-auto px-6">
                    <motion.div
                        initial={reduced ? {} : { opacity: 0, y: 20 }}
                        whileInView={reduced ? {} : { opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={spring}
                        className="text-center mb-14"
                    >
                        <p className="text-[12px] font-semibold text-black/30 uppercase tracking-[0.2em] mb-3">
                            The problem
                        </p>
                        <h2 className="text-[32px] md:text-[38px] lg:text-[42px] font-bold text-[var(--color-text-primary-light)] tracking-[-0.03em] leading-tight">
                            Hotels are drowning in<br className="hidden md:block" /> disconnected tools.
                        </h2>
                    </motion.div>

                    <div className="max-w-[640px] mx-auto space-y-4">
                        {problems.map((card, i) => (
                            <StatCardComponent key={card.value + card.label} card={card} index={i} reduced={reduced} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Transition: crossfade to dark ── */}
            <section className="relative py-24 lg:py-32 overflow-hidden">
                {/* Light bg base */}
                <div className="absolute inset-0 bg-[#f5f5f7]" />
                {/* Dark overlay fades in */}
                <motion.div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: bgOpacity }}
                />
                {/* Gradient glow */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-transparent"
                    style={{ opacity: bgOpacity }}
                />
                {/* Grid lines */}
                <motion.div
                    className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:60px_60px]"
                    style={{ opacity: bgOpacity }}
                />
                {/* Floating light */}
                <div className="absolute bottom-[-200px] right-[-100px] w-[600px] h-[600px] bg-purple-500/20 blur-[150px] rounded-full pointer-events-none" />
                {/* Noise texture */}
                <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

                <div className="relative z-10 max-w-[980px] mx-auto px-6">
                    <motion.div
                        initial={reduced ? {} : { opacity: 0, y: 20 }}
                        whileInView={reduced ? {} : { opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={spring}
                        className="text-center mb-14"
                    >
                        <motion.p
                            initial={reduced ? {} : { opacity: 0, scale: 0.95 }}
                            whileInView={reduced ? {} : { opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ ...spring, delay: 0.2 }}
                            className="text-[14px] font-semibold text-[var(--color-primary)] uppercase tracking-[0.15em] mb-3"
                        >
                            There&apos;s a better way
                        </motion.p>
                        <h2 className="text-[32px] md:text-[38px] lg:text-[42px] font-bold text-white tracking-[-0.03em] leading-tight">
                            The EasyStay way.
                        </h2>
                    </motion.div>

                    <div className="max-w-[640px] mx-auto space-y-4">
                        {solutions.map((card, i) => (
                            <div key={card.value + card.label} className="relative">
                                <StatCardComponent card={card} index={i} dark reduced={reduced} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
