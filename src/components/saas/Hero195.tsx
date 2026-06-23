import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
    ArrowRight, TrendingUp, Star, Sparkles,
} from 'lucide-react'
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

import { Card } from '../ui/card'
import { BorderBeam } from '../ui/border-beam'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import {
    revenueData, occupancyData, sourceData, COLORS, stats, activities,
} from './hero-data'

/* Tokens (kept inline for parity with SaaSHome.tsx palette). */
const C = {
    forest: '#1A3C34',
    forestSoft: '#234D43',
    cream: '#FFF8F0',
    creamDark: '#F5EDE0',
    gold: '#C8A951',
    border: '#E8E0D4',
    textMuted: '#6B7280',
}

const TAB_ORDER = ['overview', 'bookings', 'occupancy'] as const
type TabKey = typeof TAB_ORDER[number]

export default function Hero195() {
    const [tab, setTab] = useState<TabKey>('overview')
    const pausedRef = useRef(false)

    // Auto-advance every 4s until the visitor touches a tab.
    useEffect(() => {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        if (reduced) return
        const id = window.setInterval(() => {
            if (pausedRef.current) return
            setTab((t) => TAB_ORDER[(TAB_ORDER.indexOf(t) + 1) % TAB_ORDER.length])
        }, 4000)
        return () => window.clearInterval(id)
    }, [])

    const handleTabChange = (v: string) => {
        pausedRef.current = true
        setTab(v as TabKey)
    }

    return (
        <section
            className="relative pt-28 pb-16 md:pt-32 md:pb-20 px-6 overflow-hidden"
            style={{ background: C.cream }}
        >
            {/* soft radial wash */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${C.gold}14 0%, transparent 60%)` }} />

            <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                {/* ─────────── LEFT: copy ─────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center lg:text-left"
                >
                    <span
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border mb-6"
                        style={{ background: '#FFFFFF', borderColor: C.border, color: C.forest }}
                    >
                        <Sparkles size={14} style={{ color: C.gold }} />
                        New: AI-Powered Revenue Engine
                    </span>

                    <h1
                        className="font-display tracking-tight mb-6 text-4xl md:text-5xl lg:text-6xl leading-[1.07]"
                        style={{ color: C.forest, fontFamily: 'Sora, sans-serif' }}
                    >
                        The operating system for modern hospitality
                    </h1>

                    <p
                        className="text-base md:text-lg max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
                        style={{ color: C.textMuted }}
                    >
                        Bookings, POS, website, inventory, and analytics — connected in one beautiful
                        platform. Replace 6 tools with one.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 mb-8">
                        <Link
                            to="/signup"
                            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 shadow-xl"
                            style={{ background: C.forest, color: C.cream }}
                        >
                            Start Free Trial <ArrowRight size={16} />
                        </Link>
                        <a
                            href="https://wa.me/919345244727?text=Hi%2C%20I%20would%20like%20to%20book%20a%20demo%20for%20EasyStay"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold border-2 transition-all hover:bg-white"
                            style={{ borderColor: C.border, color: C.forest }}
                        >
                            Book a Demo
                        </a>
                    </div>

                    <div className="flex items-center justify-center lg:justify-start gap-3 text-xs font-medium" style={{ color: C.textMuted }}>
                        <span className="inline-flex items-center gap-1">
                            <Star size={12} className="fill-current" style={{ color: C.gold }} /> 4.8/5
                        </span>
                        <span>·</span>
                        <span>120+ properties</span>
                        <span>·</span>
                        <span>Free 14-day trial</span>
                    </div>
                </motion.div>

                {/* ─────────── RIGHT: preview card ─────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                    className="relative"
                >
                    <Card className="relative overflow-hidden border-0 shadow-[0_20px_60px_rgba(14,42,56,0.18)] bg-white">
                        <BorderBeam size={250} duration={12} colorFrom={C.gold} colorTo={C.forest} />

                        {/* Browser chrome */}
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F5F3EE] border-b" style={{ borderColor: C.border }}>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                            </div>
                            <div className="flex-1 flex justify-center">
                                <span className="bg-white rounded-md px-3 py-1 text-[10px] text-gray-500 font-medium">
                                    app.esaystay.com/admin/dashboard
                                </span>
                            </div>
                        </div>

                        <div className="p-4 md:p-5">
                            <Tabs value={tab} onValueChange={handleTabChange}>
                                <TabsList className="w-full justify-center mb-2">
                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                    <TabsTrigger value="bookings">Bookings</TabsTrigger>
                                    <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
                                </TabsList>

                                {/* OVERVIEW */}
                                <TabsContent value="overview">
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        {stats.map((s) => (
                                            <div key={s.title} className="rounded-xl p-3 bg-[#F8F9FB] border" style={{ borderColor: C.border }}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <s.icon size={16} className="text-[#0E2A38]" />
                                                    <span className={`text-[9px] font-bold ${s.up ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {s.trend}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] uppercase font-bold tracking-wider text-gray-400">{s.title}</p>
                                                <p className="text-base md:text-lg font-bold text-[#0E2A38] truncate">{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-32 md:h-36 rounded-xl bg-[#F8F9FB] border px-2 pt-2" style={{ borderColor: C.border }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={revenueData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                                                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.08)', fontSize: 12 }} />
                                                <Line type="monotone" dataKey="total" stroke={C.gold} strokeWidth={2.5} dot={{ fill: C.forest, r: 3 }} animationDuration={1200} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </TabsContent>

                                {/* BOOKINGS */}
                                <TabsContent value="bookings">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative h-44 rounded-xl bg-[#F8F9FB] border flex items-center justify-center" style={{ borderColor: C.border }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={sourceData} innerRadius={40} outerRadius={62} paddingAngle={3} dataKey="value" stroke="none">
                                                        {sourceData.map((_, i) => (
                                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-base font-bold text-[#0E2A38]">₹24.5L</span>
                                                <span className="text-[8px] uppercase font-bold tracking-widest text-gray-400">Total</span>
                                            </div>
                                        </div>
                                        <div className="h-44 overflow-y-auto rounded-xl bg-[#F8F9FB] border p-2 no-scrollbar" style={{ borderColor: C.border }}>
                                            {activities.map((a) => (
                                                <div key={a.title} className="flex gap-2 p-1.5 mb-1 rounded-lg">
                                                    <div className={`w-7 h-7 rounded-full ${a.bg} flex items-center justify-center shrink-0`}>
                                                        <a.icon size={13} className={a.color} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-semibold text-[#0E2A38] truncate">{a.title}</p>
                                                        <p className="text-[9px] text-gray-500 truncate">{a.desc}</p>
                                                        <p className="text-[8px] text-gray-400 mt-0.5">{a.time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* OCCUPANCY */}
                                <TabsContent value="occupancy">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2 h-44 rounded-xl bg-[#F8F9FB] border px-2 pt-2" style={{ borderColor: C.border }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={occupancyData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                                                    <Tooltip contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
                                                    <Bar dataKey="rate" fill={C.forest} radius={[4, 4, 0, 0]} animationDuration={1200} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="h-44 rounded-xl bg-[#F8F9FB] border flex flex-col items-center justify-center" style={{ borderColor: C.border }}>
                                            <div
                                                className="w-20 h-20 rounded-full flex items-center justify-center"
                                                style={{
                                                    background: `conic-gradient(${C.gold} 0% 85%, #E5E7EB 85% 100%)`,
                                                }}
                                            >
                                                <div className="w-14 h-14 rounded-full bg-[#F8F9FB] flex items-center justify-center">
                                                    <span className="text-lg font-bold text-[#0E2A38]">85%</span>
                                                </div>
                                            </div>
                                            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400 mt-2">Avg Occupancy</span>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </Card>

                    {/* Floating badges (hidden < md) */}
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        aria-hidden="true"
                        className="hidden md:flex absolute -top-4 -right-4 items-center gap-2 rounded-2xl bg-white shadow-xl border px-4 py-2.5 z-20"
                        style={{ borderColor: C.border }}
                    >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E8F5E9' }}>
                            <TrendingUp size={16} style={{ color: '#2E7D32' }} />
                        </div>
                        <div>
                            <p className="text-xs font-bold" style={{ color: C.forest }}>+28% Direct</p>
                            <p className="text-[10px] font-semibold text-emerald-600">bookings this month</p>
                        </div>
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                        aria-hidden="true"
                        className="hidden md:flex absolute -bottom-4 -left-4 items-center gap-2 rounded-2xl bg-white shadow-xl border px-4 py-2.5 z-20"
                        style={{ borderColor: C.border }}
                    >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${C.gold}22` }}>
                            <Sparkles size={16} style={{ color: C.gold }} />
                        </div>
                        <div>
                            <p className="text-xs font-bold" style={{ color: C.forest }}>3× faster</p>
                            <p className="text-[10px] font-semibold" style={{ color: C.gold }}>reconciliation</p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
