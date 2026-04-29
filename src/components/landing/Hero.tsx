import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { ArrowRight, Play, TrendingUp, Clock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/* ── floating metric badge ── */
function FloatingBadge({ icon: Icon, text, delay }: { icon: React.ElementType; text: string; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 18, delay }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
        >
            <Icon size={14} className="text-[var(--color-primary)]" />
            <span className="text-[13px] text-white/80 font-medium">{text}</span>
        </motion.div>
    );
}

/* ── CSS dashboard mockup ── */
function DashboardMockup() {
    const items = [
        { label: 'Today\'s Revenue', value: '₹48,250', change: '+12%', color: 'var(--color-success)' },
        { label: 'Occupancy', value: '87%', change: '+5%', color: 'var(--color-primary)' },
        { label: 'Check-ins', value: '14', change: '', color: 'var(--color-warning)' },
        { label: 'Pending', value: '3', change: '', color: 'var(--color-error)' },
    ];

    const bookings = [
        { guest: 'Raj Mehta', room: 'Deluxe 204', status: 'Checked In', statusColor: 'var(--color-success)' },
        { guest: 'Priya Singh', room: 'Suite 301', status: 'Arriving', statusColor: 'var(--color-warning)' },
        { guest: 'John Davis', room: 'Standard 102', status: 'Confirmed', statusColor: 'var(--color-primary)' },
    ];

    return (
        <div className="relative w-full max-w-[560px]">
            {/* Main dashboard card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.3 }}
                className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.6)] hover:shadow-[0_30px_120px_rgba(0,113,227,0.2)] transition-all duration-300"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
                        <span className="text-[13px] text-white/50 font-medium">Live Dashboard</span>
                    </div>
                    <span className="text-[11px] text-white/30">Today, 2:30 PM</span>
                </div>

                {/* Stat grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {items.map((item, i) => (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 100, damping: 18, delay: 0.5 + i * 0.1 }}
                            className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3"
                        >
                            <p className="text-[10px] text-white/40 mb-1 truncate">{item.label}</p>
                            <p className="text-[18px] font-bold text-white tracking-tight">{item.value}</p>
                            {item.change && (
                                <p className="text-[10px] mt-0.5" style={{ color: item.color }}>{item.change}</p>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Mini chart placeholder */}
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] text-white/40 font-medium">Revenue (7 days)</span>
                        <span className="text-[11px] text-[var(--color-success)]">+18%</span>
                    </div>
                    <div className="flex items-end gap-1.5 h-10">
                        {[40, 55, 38, 62, 48, 72, 85].map((h, i) => (
                            <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.8 + i * 0.05 }}
                                className="flex-1 rounded-sm bg-gradient-to-t from-[#0071e3]/60 to-[#0071e3]"
                            />
                        ))}
                    </div>
                </div>

                {/* Booking list */}
                <div className="space-y-2">
                    {bookings.map((b, i) => (
                        <motion.div
                            key={b.guest}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ type: 'spring', stiffness: 100, damping: 18, delay: 1 + i * 0.1 }}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                        >
                            <div>
                                <p className="text-[12px] text-white/80 font-medium">{b.guest}</p>
                                <p className="text-[10px] text-white/30">{b.room}</p>
                            </div>
                            <span
                                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                style={{ color: b.statusColor, backgroundColor: `${b.statusColor}15` }}
                            >
                                {b.status}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Floating side card — occupancy ring */}
            <motion.div
                initial={{ opacity: 0, x: 20, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.7 }}
                className="absolute -right-4 top-8 w-[120px] rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] hidden lg:block"
            >
                <div className="flex flex-col items-center">
                    <svg width="56" height="56" viewBox="0 0 56 56" className="mb-2">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                        <motion.circle
                            cx="28" cy="28" r="22" fill="none" stroke="#0071e3" strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={138}
                            initial={{ strokeDashoffset: 138 }}
                            animate={{ strokeDashoffset: 138 * 0.13 }}
                            transition={{ type: 'spring', stiffness: 40, damping: 15, delay: 1.2 }}
                            transform="rotate(-90 28 28)"
                        />
                        <text x="28" y="30" textAnchor="middle" className="fill-white text-[11px] font-bold">87%</text>
                    </svg>
                    <span className="text-[10px] text-white/40">Occupancy</span>
                </div>
            </motion.div>
        </div>
    );
}

/* ── main hero section ── */
export default function Hero() {
    const reduced = useReducedMotion();
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useTransform(mouseY, [-300, 300], [3, -3]), { stiffness: 100, damping: 30 });
    const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-3, 3]), { stiffness: 100, damping: 30 });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (reduced) return;
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left - rect.width / 2);
        mouseY.set(e.clientY - rect.top - rect.height / 2);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <section
            className="relative min-h-screen flex items-center overflow-hidden bg-black pt-20 pb-16 lg:pt-0 lg:pb-0"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-black" />

            {/* Cinematic spotlight — tighter, brighter center */}
            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/30 blur-[120px] rounded-full pointer-events-none" />
            {/* Radial blue focus — Apple keynote drama */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,113,227,0.25),transparent_60%)] pointer-events-none" />
            {/* Cinematic vignette — focus falloff */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,black_100%)] pointer-events-none" />
            {/* Vertical vignette — edges darken, center stays bright */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black pointer-events-none" />

            {/* Bottom floating light */}
            <div className="absolute bottom-[-200px] right-[-100px] w-[600px] h-[600px] bg-purple-500/20 blur-[150px] rounded-full pointer-events-none" />

            {/* Grid lines — whisper-level */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

            {/* Noise texture */}
            <div
                className="absolute inset-0 opacity-[0.015] pointer-events-none z-10"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                }}
            />

            <div className="relative z-20 max-w-[980px] mx-auto px-6 w-full">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-[calc(100vh-80px)]">
                    {/* Left — text */}
                    <div className="flex flex-col justify-center">
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                            className="text-[40px] md:text-[48px] lg:text-[56px] font-bold leading-[1.02] tracking-[-0.045em] bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent"
                        >
                            Your entire hotel.{' '}
                            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                                One screen.
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.1 }}
                            className="mt-5 text-[17px] lg:text-[19px] text-white/60 leading-relaxed max-w-[440px]"
                        >
                            Bookings. POS. Guests. Revenue. Everything connected, everything real-time.
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.2 }}
                            className="flex flex-wrap items-center gap-4 mt-8"
                        >
                            <Link
                                to="/admin/login"
                                className="inline-flex items-center gap-2 text-[15px] font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] hover:scale-[1.02] active:scale-[0.98] px-7 py-3.5 rounded-full transition-all duration-300 shadow-[0_0_30px_rgba(0,113,227,0.5)] hover:shadow-[0_0_40px_rgba(0,113,227,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black cursor-pointer"
                            >
                                Start Free Trial
                                <ArrowRight size={16} />
                            </Link>
                            <button
                                aria-label="Watch product demo video"
                                className="inline-flex items-center gap-2 text-[15px] font-medium text-white/80 hover:text-white hover:scale-[1.02] active:scale-[0.98] border border-white/20 hover:border-white/40 px-6 py-3.5 rounded-full transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            >
                                <Play size={14} fill="currentColor" />
                                Watch Demo
                            </button>
                        </motion.div>

                        {/* Floating badges */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-wrap gap-3 mt-10"
                        >
                            <FloatingBadge icon={Zap} text="99.9% uptime" delay={0.7} />
                            <FloatingBadge icon={Clock} text="2min setup" delay={0.85} />
                            <FloatingBadge icon={TrendingUp} text="₹0 commission" delay={1.0} />
                        </motion.div>
                    </div>

                    {/* Right — dashboard */}
                    <motion.div
                        style={reduced ? {} : { rotateX, rotateY, perspective: 1200 }}
                        className="relative flex justify-center lg:justify-end"
                    >
                        {/* Depth glow behind dashboard */}
                        <div className="absolute inset-0 bg-blue-500/10 blur-[120px] rounded-3xl pointer-events-none" />
                        {/* Floating animation wrapper */}
                        <motion.div
                            animate={reduced ? {} : { y: [-12, 12] }}
                            transition={reduced ? {} : { duration: 5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                            className="relative shadow-[0_50px_150px_rgba(0,0,0,0.9)] rounded-2xl"
                        >
                            <DashboardMockup />
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
