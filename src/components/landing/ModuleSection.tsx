import { motion } from 'motion/react';
import { Check, Calendar, Users, CreditCard, BarChart3, UtensilsCrossed, ShoppingCart, QrCode, ClipboardList, TrendingUp, PieChart, FileText } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 };

interface ModuleSectionProps {
    label: string;
    headline: string;
    bullets: string[];
    dark?: boolean;
    reversed?: boolean;
    mockup: React.ReactNode;
    bgClass?: string;
}

/* ── reusable module section ── */
export default function ModuleSection({ label, headline, bullets, dark, reversed, mockup, bgClass }: ModuleSectionProps) {
    const reduced = useReducedMotion();
    const bg = bgClass || (dark ? 'bg-black' : 'bg-[#f5f5f7]');
    const textColor = dark ? 'text-white' : 'text-[#1d1d1f]';
    const subColor = dark ? 'text-white/50' : 'text-black/50';
    const labelColor = dark ? 'text-white/30' : 'text-black/30';

    return (
        <section className={`${bg} py-24 lg:py-32 overflow-hidden relative`}>
            {dark ? (
                <>
                    {/* Grid lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />
                    {/* Floating accent light */}
                    <div className="absolute bottom-[-150px] left-[-100px] w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />
                    <div className="absolute top-[-100px] right-[-80px] w-[400px] h-[400px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
                    {/* Noise texture */}
                    <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
                </>
            ) : (
                <>
                    {/* Light section depth gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white to-transparent opacity-40 pointer-events-none" />
                </>
            )}
            <div className="relative z-10 max-w-[980px] mx-auto px-6">
                <div className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${reversed ? 'lg:direction-rtl' : ''}`}>
                    {/* Text side */}
                    <motion.div
                        initial={reduced ? {} : { opacity: 0, x: reversed ? 40 : -40 }}
                        whileInView={reduced ? {} : { opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={spring}
                        className={reversed ? 'lg:order-2' : ''}
                        style={{ direction: 'ltr' }}
                    >
                        <p className={`text-[12px] font-semibold ${labelColor} uppercase tracking-[0.2em] mb-3`}>
                            {label}
                        </p>
                        <h2 className={`text-[32px] md:text-[38px] lg:text-[42px] font-bold ${textColor} tracking-[-0.03em] leading-tight mb-6`}>
                            {headline}
                        </h2>
                        <ul className="space-y-3">
                            {bullets.map((b, i) => (
                                <motion.li
                                    key={b}
                                    initial={reduced ? {} : { opacity: 0, x: -10 }}
                                    whileInView={reduced ? {} : { opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ ...spring, delay: 0.1 + i * 0.1 }}
                                    className="flex items-start gap-3"
                                >
                                    <Check size={18} className="text-[#0071e3] mt-0.5 shrink-0" />
                                    <span className={`text-[15px] ${subColor} leading-relaxed`}>{b}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Visual side */}
                    <motion.div
                        initial={reduced ? {} : { opacity: 0, x: reversed ? -40 : 40 }}
                        whileInView={reduced ? {} : { opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={{ ...spring, delay: 0.15 }}
                        className={reversed ? 'lg:order-1' : ''}
                        style={{ direction: 'ltr' }}
                    >
                        {mockup}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

/* ── CSS mockups for each module ── */

export function BookingMockup() {
    const steps = ['Dates', 'Room', 'Guest Info', 'Payment'];
    return (
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.6)] hover:shadow-[0_30px_120px_rgba(0,113,227,0.2)] transition-all duration-300">
            {/* Steps */}
            <div className="flex items-center gap-2 mb-5">
                {steps.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            i === 0 ? 'bg-[#0071e3] text-white' : 'bg-white/[0.06] text-white/30'
                        }`}>
                            {i + 1}
                        </div>
                        <span className={`text-[11px] ${i === 0 ? 'text-white/80' : 'text-white/25'} hidden sm:inline`}>{s}</span>
                        {i < 3 && <div className="w-6 h-px bg-white/10" />}
                    </div>
                ))}
            </div>
            {/* Calendar mock */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] text-white/50 font-medium">April 2026</span>
                    <Calendar size={14} className="text-white/30" />
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {['S','M','T','W','T','F','S'].map(d => (
                        <span key={d} className="text-[9px] text-white/20 text-center">{d}</span>
                    ))}
                    {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                        <div
                            key={d}
                            className={`text-[10px] text-center py-1 rounded ${
                                d >= 15 && d <= 18
                                    ? 'bg-[#0071e3]/30 text-[#0071e3]'
                                    : 'text-white/30 hover:bg-white/[0.04]'
                            }`}
                        >
                            {d}
                        </div>
                    ))}
                </div>
            </div>
            {/* Room cards */}
            <div className="space-y-2">
                {[
                    { name: 'Deluxe Room', price: '₹3,200', avail: true },
                    { name: 'Suite', price: '₹5,800', avail: true },
                    { name: 'Standard', price: '₹1,800', avail: false },
                ].map(r => (
                    <div key={r.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <div>
                            <p className="text-[12px] text-white/80 font-medium">{r.name}</p>
                            <p className="text-[10px] text-white/30">{r.price}/night</p>
                        </div>
                        <span className={`text-[10px] font-medium ${r.avail ? 'text-[#34C759]' : 'text-white/20'}`}>
                            {r.avail ? 'Available' : 'Sold Out'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function CRMMockup() {
    return (
        <div className="rounded-2xl bg-white border border-black/[0.06] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-[#0071e3]" />
                    <span className="text-[13px] text-[#1d1d1f] font-semibold">Guest Directory</span>
                </div>
                <span className="text-[11px] text-black/30">248 guests</span>
            </div>
            {/* Guest list */}
            {[
                { name: 'Ananya Sharma', stays: 12, spend: '₹1,84,000', tag: 'VIP' },
                { name: 'Michael Chen', stays: 5, spend: '₹62,500', tag: 'Regular' },
                { name: 'Priya Patel', stays: 3, spend: '₹28,800', tag: 'New' },
            ].map(g => (
                <div key={g.name} className="flex items-center justify-between py-3 border-b border-black/[0.04] last:border-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center">
                            <span className="text-[11px] font-bold text-[#1d1d1f]">{g.name[0]}</span>
                        </div>
                        <div>
                            <p className="text-[13px] text-[#1d1d1f] font-medium">{g.name}</p>
                            <p className="text-[10px] text-black/40">{g.stays} stays &middot; {g.spend}</p>
                        </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        g.tag === 'VIP' ? 'bg-[#0071e3]/10 text-[#0071e3]' :
                        g.tag === 'Regular' ? 'bg-[#34C759]/10 text-[#34C759]' :
                        'bg-[#FF9500]/10 text-[#FF9500]'
                    }`}>
                        {g.tag}
                    </span>
                </div>
            ))}
            {/* Quick actions */}
            <div className="flex gap-2 mt-4">
                {[
                    { icon: FileText, label: 'Invoice' },
                    { icon: CreditCard, label: 'Payment' },
                ].map(a => (
                    <div key={a.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5f5f7] text-[11px] text-black/50 font-medium">
                        <a.icon size={12} />
                        {a.label}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function POSMockup() {
    return (
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.6)] hover:shadow-[0_30px_120px_rgba(0,113,227,0.2)] transition-all duration-300">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <UtensilsCrossed size={16} className="text-[#FF9500]" />
                    <span className="text-[13px] text-white/80 font-semibold">Restaurant POS</span>
                </div>
                <span className="text-[11px] text-white/30">Table 5 &middot; Dine-in</span>
            </div>
            {/* Order items */}
            {[
                { item: 'Butter Chicken', qty: 2, price: '₹560' },
                { item: 'Garlic Naan', qty: 4, price: '₹200' },
                { item: 'Dal Makhani', qty: 1, price: '₹220' },
                { item: 'Mango Lassi', qty: 3, price: '₹270' },
            ].map(o => (
                <div key={o.item} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center gap-3">
                        <ShoppingCart size={12} className="text-white/20" />
                        <div>
                            <p className="text-[12px] text-white/80">{o.item}</p>
                            <p className="text-[10px] text-white/30">x{o.qty}</p>
                        </div>
                    </div>
                    <span className="text-[12px] text-white/60 font-medium">{o.price}</span>
                </div>
            ))}
            {/* Total */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.08]">
                <span className="text-[13px] text-white/50">Total</span>
                <span className="text-[18px] text-white font-bold">₹1,250</span>
            </div>
            {/* Actions */}
            <div className="flex gap-2 mt-4">
                <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#FF9500]/20 text-[#FF9500] text-[11px] font-medium">
                    <ClipboardList size={12} />
                    Send KOT
                </div>
                <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#0071e3]/20 text-[#0071e3] text-[11px] font-medium">
                    <QrCode size={12} />
                    QR Order
                </div>
            </div>
        </div>
    );
}

export function AnalyticsMockup() {
    return (
        <div className="rounded-2xl bg-white border border-black/[0.06] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#0071e3]" />
                    <span className="text-[13px] text-[#1d1d1f] font-semibold">Revenue Analytics</span>
                </div>
                <span className="text-[11px] text-black/30">Last 30 days</span>
            </div>
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                    { label: 'Revenue', value: '₹12.4L', change: '+18%', color: '#34C759' },
                    { label: 'Occupancy', value: '84%', change: '+7%', color: '#0071e3' },
                    { label: 'ADR', value: '₹3,840', change: '+12%', color: '#FF9500' },
                ].map(k => (
                    <div key={k.label} className="rounded-xl bg-[#f5f5f7] p-3">
                        <p className="text-[10px] text-black/40 mb-1">{k.label}</p>
                        <p className="text-[16px] font-bold text-[#1d1d1f] tracking-tight">{k.value}</p>
                        <p className="text-[10px]" style={{ color: k.color }}>{k.change}</p>
                    </div>
                ))}
            </div>
            {/* Chart */}
            <div className="rounded-xl bg-[#f5f5f7] p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] text-black/40 font-medium">Monthly Revenue</span>
                    <div className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-[#34C759]" />
                        <span className="text-[10px] text-[#34C759]">Trending up</span>
                    </div>
                </div>
                <div className="flex items-end gap-2 h-16">
                    {[35, 42, 38, 55, 48, 62, 58, 72, 68, 78, 82, 90].map((h, i) => (
                        <div
                            key={i}
                            className="flex-1 rounded-sm bg-gradient-to-t from-[#0071e3]/40 to-[#0071e3]"
                            style={{ height: `${h}%` }}
                        />
                    ))}
                </div>
            </div>
            {/* P&L summary */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/[0.04]">
                <div>
                    <p className="text-[10px] text-black/40">Net Profit</p>
                    <p className="text-[15px] font-bold text-[#1d1d1f]">₹4.2L</p>
                </div>
                <div className="flex items-center gap-1">
                    <PieChart size={14} className="text-[#0071e3]" />
                    <span className="text-[11px] text-black/40">34% margin</span>
                </div>
            </div>
        </div>
    );
}
