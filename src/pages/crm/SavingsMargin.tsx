import { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMDataContext';
import { motion } from 'motion/react';
import { TrendingUp, Percent, Wallet, ArrowRight, CheckCircle2, Info } from 'lucide-react';

// OTA sources whose bookings carry commission that direct booking would recover.
const OTA_SOURCES = ['booking.com', 'agoda', 'makemytrip', 'expedia', 'airbnb', 'goibibo', 'cleartrip', 'ota'];
const DEFAULT_OTA_COMMISSION = 0.18; // typical blended OTA commission (18%)

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function isOta(source?: string) {
  if (!source) return false;
  return OTA_SOURCES.some(s => source.toLowerCase().includes(s));
}

export default function SavingsMargin() {
  const { reservations } = useCRM();
  const [commission, setCommission] = useState(DEFAULT_OTA_COMMISSION * 100);
  const [shiftPct, setShiftPct] = useState(50); // % of OTA revenue you aim to move to direct

  const data = useMemo(() => {
    const booked = reservations.filter(r => r.status !== 'Cancelled' && (r.amount || 0) > 0);
    const totalRevenue = booked.reduce((s, r) => s + (r.amount || 0), 0);
    const otaBookings = booked.filter(r => isOta(r.source));
    const otaRevenue = otaBookings.reduce((s, r) => s + (r.amount || 0), 0);
    const directRevenue = totalRevenue - otaRevenue;

    const rate = commission / 100;
    const commissionPaid = otaRevenue * rate;                       // what OTAs took
    const recoverable = commissionPaid * (shiftPct / 100);          // what shifting to direct recovers

    const otaShareOfRevenue = totalRevenue > 0 ? otaRevenue / totalRevenue : 0;

    return {
      totalRevenue,
      otaRevenue,
      directRevenue,
      otaCount: otaBookings.length,
      totalCount: booked.length,
      commissionPaid,
      recoverable,
      otaShareOfRevenue,
      annualisedRecovery: recoverable * 12, // recovered yield projected over a year
    };
  }, [reservations, commission, shiftPct]);

  const hasData = data.totalCount > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[#0B3B2B]/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-[#0B3B2B]" />
          </div>
          <h1 className="text-2xl font-bold text-[#0B3B2B]">Savings &amp; Margin calculator</h1>
        </div>
        <p className="text-sm text-gray-400">Calculate your recovered yields</p>
      </div>

      {!hasData && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
          <Info size={16} className="shrink-0" />
          No booking revenue yet. Once reservations come in, this page shows the commission you can recover by driving direct bookings.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total revenue', value: inr(data.totalRevenue), sub: `${data.totalCount} bookings`, icon: Wallet, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'OTA revenue', value: inr(data.otaRevenue), sub: `${data.otaCount} via OTAs · ${Math.round(data.otaShareOfRevenue * 100)}% of revenue`, icon: Percent, color: 'text-orange-600 bg-orange-50' },
          { label: 'Commission paid to OTAs', value: inr(data.commissionPaid), sub: `at ${commission.toFixed(0)}% blended rate`, icon: TrendingUp, color: 'text-red-600 bg-red-50' },
          { label: 'Recoverable yield', value: inr(data.recoverable), sub: `shifting ${shiftPct}% to direct`, icon: CheckCircle2, color: 'text-[#0B3B2B] bg-[#0B3B2B]/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0B3B2B]">{stat.value}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{stat.label}</p>
            <p className="text-[11px] text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Calculator controls + headline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#0B3B2B]">Assumptions</h2>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium text-gray-600">Blended OTA commission</label>
              <span className="font-bold text-[#0B3B2B]">{commission.toFixed(0)}%</span>
            </div>
            <input
              type="range" min={5} max={30} step={1}
              value={commission}
              onChange={e => setCommission(Number(e.target.value))}
              className="w-full accent-[#0B3B2B]"
            />
            <p className="text-[11px] text-gray-400">Booking.com &amp; Agoda typically charge 15–22%.</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium text-gray-600">Bookings shifted to direct</label>
              <span className="font-bold text-[#0B3B2B]">{shiftPct}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={shiftPct}
              onChange={e => setShiftPct(Number(e.target.value))}
              className="w-full accent-[#0B3B2B]"
            />
            <p className="text-[11px] text-gray-400">Direct booking engine + WhatsApp reminders recover this share.</p>
          </div>
        </div>

        <div className="bg-[#0B3B2B] rounded-2xl shadow-sm p-6 text-white flex flex-col justify-center">
          <p className="text-xs uppercase tracking-widest text-[#C5A059] font-bold">Recovered yield / year</p>
          <motion.p
            key={data.annualisedRecovery}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black mt-2"
          >
            {inr(data.annualisedRecovery)}
          </motion.p>
          <p className="text-xs text-white/60 mt-2 leading-relaxed">
            Based on your current OTA mix, projected across 12 months. Every direct booking keeps the
            commission in your pocket instead of the channel's.
          </p>
        </div>
      </div>

      {/* Transparent Pricing */}
      <div className="pt-4">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-[#C5A059] font-bold">Transparent Pricing</p>
          <h2 className="text-2xl font-bold text-[#0B3B2B] mt-1">Bespoke value-driven plans</h2>
          <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
            No complex setup fees or locking agreements. Choose annual billing to save 20%.
          </p>
        </div>
        <TransparentPricing />
      </div>
    </div>
  );
}

/* Reused from the landing page PricingPlan — self-contained pricing block. */
function TransparentPricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const basePrice = billingCycle === 'annual' ? 3999 : 4999;
  const roomSurcharge = billingCycle === 'annual' ? 120 : 150;

  return (
    <div className="space-y-10 max-w-xl mx-auto">
      <div className="flex justify-center">
        <div className="bg-[#FAF9F6]/60 border border-[#C5A059]/20 p-1.5 rounded-2xl flex gap-1.5 backdrop-blur-md shadow-inner">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              billingCycle === 'monthly' ? 'bg-[#0B3B2B] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'annual' ? 'bg-[#0B3B2B] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Annual
            <span className="text-[8px] bg-[#C5A059] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="relative bg-white border border-[#C5A059]/20 rounded-3xl p-8 shadow-md flex flex-col justify-between space-y-6 overflow-hidden">
        <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#C5A059] text-white font-extrabold text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border border-[#FAF9F6]/20">
          Super Operator Pack
        </div>

        <div className="space-y-4 text-left">
          <div>
            <h3 className="text-xl font-bold text-[#0B3B2B] tracking-tight">Enterprise Operating System</h3>
            <p className="text-xs text-zinc-500 mt-1 font-light leading-normal">Unified hospitality commerce software for boutique stays, cottages, resorts, and residencies.</p>
          </div>

          <div className="flex items-baseline gap-1 pt-2">
            <span className="text-4xl font-black text-[#0B3B2B] tracking-tight">₹{basePrice.toLocaleString('en-IN')}</span>
            <span className="text-xs text-zinc-400">/month base</span>
          </div>

          <p className="text-[10px] text-zinc-400 font-mono">+ ₹{roomSurcharge}/room per month (pay only for active rooms in PMS)</p>

          <div className="h-px bg-zinc-100 my-4" />

          <ul className="space-y-3.5 text-xs text-zinc-600 font-light">
            {[
              'Unlimited direct booking engine bookings',
              'Real-time Channel Manager (2-way OTA sync)',
              'Guest Portal with magic checkout and billing links',
              'Restaurant POS (dine-in, table order, room service)',
              'WhatsApp message reminders & verification alerts',
              'Multi-user operational permission access roles',
              'Exportable Profit & Loss reports for tax filing',
            ].map((f, i) => (
              <li key={i} className="flex gap-2.5 items-start">
                <CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <a
          href="/admin/billing"
          className="w-full bg-[#0B3B2B] hover:bg-[#115C43] text-white font-black h-13 py-3.5 rounded-2xl text-xs tracking-wider uppercase transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>Manage your plan</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}
