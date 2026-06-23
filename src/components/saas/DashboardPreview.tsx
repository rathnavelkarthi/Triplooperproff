import { motion } from 'motion/react';
import {
    TrendingUp,
    type LucideIcon,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

/* ── Shared data (same source as Hero195) ── */
import { revenueData, sourceData, COLORS, stats } from './hero-data';

function StatCard({ title, value, icon: Icon, trend, up, delay }: { title: string; value: string; icon: LucideIcon; trend: string; up: boolean; delay: number; key?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
            className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-50 to-transparent rounded-bl-full -z-0 group-hover:from-gray-100/80 transition-colors" />
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-11 h-11 rounded-full bg-[#F8F9FB] flex items-center justify-center border border-gray-100 shadow-inner">
                        <Icon size={20} className="text-[#0E2A38]" />
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${up ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                        <TrendingUp size={10} className={up ? '' : 'rotate-180'} />
                        {trend}
                    </div>
                </div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.18em] mb-1">{title}</p>
                <p className="text-2xl font-serif font-bold text-[#0E2A38] tracking-tight">{value}</p>
            </div>
        </motion.div>
    );
}

export default function DashboardPreview() {
    return (
        <section id="dashboard" className="py-20 lg:py-28 bg-[#0E2A38] relative overflow-hidden">
            {/* Noise texture */}
            <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

            {/* Radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-accent/[0.04] rounded-full blur-[150px] pointer-events-none" />

            <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={{ duration: 0.6 }}
                        className="text-xs font-semibold text-accent uppercase tracking-[0.2em] mb-3"
                    >
                        Live dashboard
                    </motion.p>
                    <motion.h2
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={{ duration: 0.7, delay: 0.05 }}
                        className="text-3xl md:text-4xl lg:text-[42px] font-extrabold text-white tracking-tight leading-tight mb-4"
                    >
                        This Is Your Actual Dashboard.
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-base text-white/40 leading-relaxed"
                    >
                        Not a mockup. The real CRM dashboard you get on day one — revenue, occupancy, bookings, and activity, all in one place.
                    </motion.p>
                </div>

                {/* Real Dashboard Embed — scaled down to look like a product shot */}
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: '-5%' }}
                    transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="relative mx-auto"
                    style={{ maxWidth: '1050px' }}
                >
                    <div
                        className="bg-[#F5F3EE] rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden border border-white/[0.08] origin-top"
                    >
                        {/* Browser chrome bar */}
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/90 border-b border-gray-200">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="bg-gray-100 rounded-lg px-3 py-1 text-[10px] text-gray-400 font-medium flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-gray-300/50" />
                                    crm.ganeshresidency.com/dashboard
                                </div>
                            </div>
                        </div>

                        {/* Dashboard header */}
                        <div className="px-5 lg:px-8 pt-5 lg:pt-6 pb-3">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <h3 className="font-serif text-xl lg:text-2xl font-bold text-[#0E2A38] tracking-tight">Dashboard Overview</h3>
                                    <p className="text-gray-500 text-xs mt-0.5">Real-time metrics for Ganesh Residency.</p>
                                </div>
                                <div className="flex bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                                    {['Daily', 'Monthly', 'Yearly'].map(f => (
                                        <span
                                            key={f}
                                            className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${f === 'Yearly'
                                                ? 'bg-[#0E2A38] text-[#C9A646] shadow-md'
                                                : 'text-gray-400'
                                                }`}
                                        >
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="px-5 lg:px-8 pb-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {stats.map((s, i) => (
                                    <StatCard key={s.title} {...s} delay={0.2 + i * 0.08} />
                                ))}
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="px-5 lg:px-8 pb-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                {/* Revenue Chart */}
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: 0.3 }}
                                    className="lg:col-span-2 bg-white/80 backdrop-blur-md p-5 lg:p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100"
                                >
                                    <div className="flex justify-between items-center mb-5">
                                        <h4 className="font-serif text-lg font-bold text-[#0E2A38]">Revenue Overview</h4>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9A646] px-3 py-1 bg-[#C9A646]/10 rounded-full">
                                            YTD 2026
                                        </span>
                                    </div>
                                    <div className="h-52">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={revenueData}>
                                                <defs>
                                                    <linearGradient id="colorRevPreview" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#0E2A38" stopOpacity={0.9} />
                                                        <stop offset="95%" stopColor="#0E2A38" stopOpacity={0.5} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }} dy={8} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }} tickFormatter={(v) => `₹${v / 1000}k`} dx={-5} />
                                                <Tooltip cursor={{ fill: '#F3F4F6', opacity: 0.4 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '10px 14px', fontWeight: 600, color: '#0E2A38' }} />
                                                <Bar dataKey="total" fill="url(#colorRevPreview)" radius={[6, 6, 0, 0]} animationDuration={1500} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </motion.div>

                                {/* Booking Sources Pie */}
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: 0.4 }}
                                    className="bg-white/80 backdrop-blur-md p-5 lg:p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col"
                                >
                                    <h4 className="font-serif text-lg font-bold text-[#0E2A38] mb-4">Booking Sources</h4>
                                    <div className="flex-1 min-h-[160px] relative flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={sourceData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={72}
                                                    stroke="none"
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    animationDuration={1500}
                                                >
                                                    {sourceData.map((_entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-2xl font-serif font-bold text-[#0E2A38]">82%</span>
                                            <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Online</span>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-y-2">
                                        {sourceData.map((source, i) => (
                                            <div key={source.name} className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                                <span className="text-xs font-semibold text-gray-600">{source.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Bottom fade — implies more content below */}
                        <div className="relative h-16 -mt-2">
                            <div className="absolute inset-0 bg-gradient-to-t from-[#F5F3EE] via-[#F5F3EE]/80 to-transparent pointer-events-none" />
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
