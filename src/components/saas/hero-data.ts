/**
 * Shared sample data for the Triplooper SaaS landing hero (`Hero195`)
 * and the deeper `DashboardPreview` section. Single source of truth so
 * the hero teaser and the product deep-dive never drift apart.
 *
 * Numbers mirror the real CRM dashboard for Ganesh Residency.
 */

import {
    IndianRupee,
    BedDouble,
    CalendarCheck,
    AlertCircle,
    CheckCircle2,
    Users,
    type LucideIcon,
} from 'lucide-react';

/* ── 6-month revenue (₹) ───────────────────────────── */
export const revenueData = [
    { name: 'Jan', total: 400000 },
    { name: 'Feb', total: 300000 },
    { name: 'Mar', total: 500000 },
    { name: 'Apr', total: 450000 },
    { name: 'May', total: 600000 },
    { name: 'Jun', total: 550000 },
];

/* ── Weekly occupancy (%) ─────────────────────────── */
export const occupancyData = [
    { name: 'Mon', rate: 65 },
    { name: 'Tue', rate: 70 },
    { name: 'Wed', rate: 68 },
    { name: 'Thu', rate: 85 },
    { name: 'Fri', rate: 95 },
    { name: 'Sat', rate: 100 },
    { name: 'Sun', rate: 90 },
];

/* ── Booking-source mix (%) ───────────────────────── */
export const sourceData = [
    { name: 'Direct', value: 45 },
    { name: 'Agoda', value: 25 },
    { name: 'MakeMyTrip', value: 20 },
    { name: 'Goibibo', value: 10 },
];

export const COLORS = ['#C9A646', '#10b981', '#3b82f6', '#64748b'];

/* ── KPI tiles ─────────────────────────────────────── */
export interface Stat {
    title: string;
    value: string;
    icon: LucideIcon;
    trend: string;
    up: boolean;
}

export const stats: Stat[] = [
    { title: 'Total Revenue', value: '₹24,50,000', icon: IndianRupee, trend: '+12.5%', up: true },
    { title: 'Occupancy Rate', value: '85%', icon: BedDouble, trend: '+5.2%', up: true },
    { title: 'Total Bookings', value: '342', icon: CalendarCheck, trend: '+18.1%', up: true },
    { title: 'Pending Payments', value: '₹1,25,000', icon: AlertCircle, trend: '-2.4%', up: false },
];

/* ── Activity feed ─────────────────────────────────── */
export interface Activity {
    icon: LucideIcon;
    bg: string;
    color: string;
    title: string;
    time: string;
    desc: string;
}

export const activities: Activity[] = [
    { icon: CalendarCheck, bg: 'bg-blue-500/20', color: 'text-blue-600', title: 'New Booking from Agoda', time: '10 mins ago', desc: 'Room 102 — Executive Double AC' },
    { icon: IndianRupee, bg: 'bg-emerald-500/20', color: 'text-emerald-600', title: 'Payment Received', time: '25 mins ago', desc: '₹12,400 via UPI (TXN-8821)' },
    { icon: CheckCircle2, bg: 'bg-amber-500/20', color: 'text-amber-600', title: 'Room Marked Clean', time: '1 hr ago', desc: 'Housekeeping finished Room 205' },
    { icon: Users, bg: 'bg-purple-500/20', color: 'text-purple-600', title: 'Guest Check-in', time: '2 hrs ago', desc: 'Sarah Jenkins arrived' },
];
