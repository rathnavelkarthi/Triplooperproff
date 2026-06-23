import { useState } from 'react';
import { TrendingDown, TrendingUp, ChevronDown, X } from 'lucide-react';
import Gauge from './Gauge';

export default function DashboardPreview() {
    // Card 1 state
    const [card1ActiveTab, setCard1ActiveTab] = useState<'revenue' | 'bookings'>('bookings');
    
    // Card 2 state
    const [figuresPeriod, setFiguresPeriod] = useState('This month');
    const [comparePeriod, setComparePeriod] = useState('Month-to-date (MTD)');
    const [monthTarget, setMonthTarget] = useState('50');
    const [yearTarget, setYearTarget] = useState('500');
    const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
    const [isCompareDropdownOpen, setIsCompareDropdownOpen] = useState(false);

    // Card 3 state
    const [card3ActiveTab, setCard3ActiveTab] = useState<'orders' | 'bookings'>('bookings');

    return (
        <div className="w-full max-w-[880px] mx-auto px-3 sm:px-4">
            <div className="bg-[#f5f2ee] rounded-3xl p-4 sm:p-6 shadow-sm border border-neutral-200/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {/* Card 1 — Bookings & Revenue */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 flex flex-col justify-between min-h-[340px]">
                        <div>
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-bold text-[#ef4d23] uppercase tracking-wider">Bookings</span>
                                <span className="text-[12px] text-neutral-400 font-medium">This Month</span>
                            </div>

                            {/* Main Stat */}
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-3xl font-bold tracking-tight text-neutral-900">6,896</span>
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold">
                                    <TrendingDown size={11} /> -3,382 (33%)
                                </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 mb-4">Compared to yesterday</p>

                            {/* Target achieved section */}
                            <div className="text-center space-y-1 mb-2">
                                <span className="text-[11px] text-neutral-500 font-medium">Month Target achieved</span>
                                <Gauge value={92} color="#ef4d23" showLabels min="389" max="425" />
                            </div>
                        </div>

                        {/* Toggle Pill */}
                        <div className="bg-neutral-100 rounded-full p-1 flex mt-2">
                            <button
                                onClick={() => setCard1ActiveTab('revenue')}
                                className={`flex-1 text-center py-1.5 rounded-full text-xs font-semibold transition-all ${card1ActiveTab === 'revenue' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                            >
                                Room Revenue
                            </button>
                            <button
                                onClick={() => setCard1ActiveTab('bookings')}
                                className={`flex-1 text-center py-1.5 rounded-full text-xs font-semibold transition-all ${card1ActiveTab === 'bookings' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                            >
                                Bookings
                            </button>
                        </div>
                    </div>

                    {/* Card 2 — Target Planner Form */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 flex flex-col gap-3.5 justify-between min-h-[340px] relative">
                        <div className="space-y-3.5">
                            {/* Figure dropdown */}
                            <div className="space-y-1.5 relative">
                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Show figures for</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPeriodDropdownOpen(!isPeriodDropdownOpen);
                                        setIsCompareDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-800 bg-slate-50 hover:bg-slate-100/50 font-medium transition-colors focus:outline-none"
                                >
                                    {figuresPeriod}
                                    <ChevronDown size={14} className="text-neutral-400" />
                                </button>
                                {isPeriodDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden">
                                        {['This month', 'This week', 'This year'].map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => { setFiguresPeriod(p); setIsPeriodDropdownOpen(false); }}
                                                className="w-full text-left px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Comparison period dropdown */}
                            <div className="space-y-1.5 relative">
                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Compare period by</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCompareDropdownOpen(!isCompareDropdownOpen);
                                        setIsPeriodDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-800 bg-slate-50 hover:bg-slate-100/50 font-medium transition-colors focus:outline-none"
                                >
                                    {comparePeriod}
                                    <ChevronDown size={14} className="text-neutral-400" />
                                </button>
                                {isCompareDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden">
                                        {['Month-to-date (MTD)', 'Year-to-date (YTD)', 'Previous Month'].map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => { setComparePeriod(p); setIsCompareDropdownOpen(false); }}
                                                className="w-full text-left px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Month Target input */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Set targets (This month)</label>
                                <div className="relative rounded-xl border border-neutral-200 bg-slate-50">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">#</span>
                                    <input
                                        type="number"
                                        value={monthTarget}
                                        onChange={(e) => setMonthTarget(e.target.value)}
                                        className="w-full bg-transparent border-0 pl-7 pr-3.5 py-2 text-xs font-semibold text-neutral-800 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Year Target input */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Set targets (This year)</label>
                                <div className="relative rounded-xl border border-neutral-200 bg-slate-50">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">#</span>
                                    <input
                                        type="number"
                                        value={yearTarget}
                                        onChange={(e) => setYearTarget(e.target.value)}
                                        className="w-full bg-transparent border-0 pl-7 pr-3.5 py-2 text-xs font-semibold text-neutral-800 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="flex items-center gap-3 pt-3 border-t border-neutral-100 mt-2">
                            <button
                                type="button"
                                className="bg-[#ef4d23] hover:bg-[#d63f1a] active:scale-[0.97] text-white text-[11px] font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                className="text-neutral-500 hover:text-neutral-800 text-[11px] font-semibold underline underline-offset-4 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="ml-auto w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Card 3 — Table Bookings / KOT */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 flex flex-col justify-between min-h-[340px]">
                        <div>
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-bold text-[#ef4d23] uppercase tracking-wider">Table Bookings</span>
                                <span className="text-[12px] text-neutral-400 font-medium">Today</span>
                            </div>

                            {/* Main Stat */}
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-3xl font-bold tracking-tight text-neutral-900">0</span>
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-neutral-50 text-neutral-500 text-[11px] font-semibold">
                                    <TrendingUp size={11} /> 0
                                </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 mb-4">Compared to yesterday</p>

                            {/* Target achieved section */}
                            <div className="text-center space-y-1 mb-2">
                                <span className="text-[11px] text-neutral-500 font-medium">Today's Target achieved</span>
                                <Gauge value={68} color="#9ca3af" showLabels={false} />
                            </div>
                        </div>

                        {/* Toggle Pill */}
                        <div className="bg-neutral-100 rounded-full p-1 flex mt-2">
                            <button
                                onClick={() => setCard3ActiveTab('orders')}
                                className={`flex-1 text-center py-1.5 rounded-full text-xs font-semibold transition-all ${card3ActiveTab === 'orders' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                            >
                                Table Orders
                            </button>
                            <button
                                onClick={() => setCard3ActiveTab('bookings')}
                                className={`flex-1 text-center py-1.5 rounded-full text-xs font-semibold transition-all ${card3ActiveTab === 'bookings' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                            >
                                Table Bookings
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
