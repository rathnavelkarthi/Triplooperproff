import { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Receipt, BarChart3, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMDataContext';

export default function Billing() {
    const { tenant } = useAuth();
    const { reservations } = useCRM();
    const [selectedResId, setSelectedResId] = useState<string | null>(null);

    // Calculate commission stats
    const activeBookings = reservations.filter(r => r.status !== 'Cancelled');
    const totalBookings = activeBookings.length;
    const totalRevenue = activeBookings.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalCommission = totalRevenue * 0.12;

    const selectedRes = reservations.find(r => r.id === selectedResId);

    return (
        <div className="max-w-5xl mx-auto space-y-8 font-sans">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[#0E2A38]">Billing & Commission Statements</h1>
                <p className="text-sm text-gray-400 mt-1">No subscriptions. No monthly fees. Just a simple 12% commission per booking — all enterprise features included.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0E2A38] text-white rounded-2xl p-6 relative overflow-hidden shadow-sm"
                >
                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-10">
                        <TrendingUp size={120} />
                    </div>
                    <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Total Booking Revenue</p>
                    <h3 className="text-3xl font-extrabold mt-2">₹{totalRevenue.toLocaleString('en-IN')}</h3>
                    <p className="text-[11px] text-white/50 mt-1">From {totalBookings} active reservations</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden shadow-sm"
                >
                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-[#C9A646]">
                        <CreditCard size={120} />
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Triplooper Commission (12%)</p>
                    <h3 className="text-3xl font-extrabold text-[#0E2A38] mt-2">₹{totalCommission.toLocaleString('en-IN')}</h3>
                    <p className="text-[11px] text-gray-500 mt-1">Calculated per booking checkout</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden shadow-sm"
                >
                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 text-emerald-600">
                        <BarChart3 size={120} />
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Commission Rate</p>
                    <h3 className="text-3xl font-extrabold text-[#0E2A38] mt-2">12%</h3>
                    <p className="text-[11px] text-gray-500 mt-1">Per booking · All features unlocked · No monthly fees</p>
                </motion.div>
            </div>

            {/* Billing List */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2">
                        <Receipt size={18} className="text-gray-400" />
                        <h2 className="font-bold text-[#0E2A38] text-lg">Booking Commission Statements</h2>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                        Showing all reservations
                    </span>
                </div>

                {reservations.length === 0 ? (
                    <div className="text-sm text-gray-400 py-12 text-center border border-dashed border-gray-200 rounded-xl">
                        No bookings recorded yet. Bookings generated through the booking engine will list here.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-gray-50/50">
                                    <th className="px-4 py-3.5">Booking ID</th>
                                    <th className="px-4 py-3.5">Guest</th>
                                    <th className="px-4 py-3.5">Check In / Out</th>
                                    <th className="px-4 py-3.5">Source</th>
                                    <th className="px-4 py-3.5">Amount</th>
                                    <th className="px-4 py-3.5 text-right">Commission (12%)</th>
                                    <th className="px-4 py-3.5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reservations.map(res => {
                                    const amount = res.amount || 0;
                                    const commission = amount * 0.12;
                                    const isCancelled = res.status === 'Cancelled';

                                    return (
                                        <tr key={res.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3.5 font-mono text-xs text-gray-500">
                                                {res.id.substring(0, 8)}...
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="font-semibold text-gray-900">{res.guest}</div>
                                                <div className="text-xs text-gray-400 font-light">{res.room}</div>
                                            </td>
                                            <td className="px-4 py-3.5 text-gray-600 font-light">
                                                {new Date(res.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(res.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                    res.source === 'Website' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {res.source}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-gray-900 font-medium">
                                                {isCancelled ? <span className="line-through text-gray-300">₹{amount.toLocaleString('en-IN')}</span> : `₹${amount.toLocaleString('en-IN')}`}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-bold text-[#0E2A38]">
                                                {isCancelled ? <span className="text-gray-300 font-normal">Cancelled</span> : `₹${commission.toLocaleString('en-IN')}`}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <button
                                                    onClick={() => setSelectedResId(res.id)}
                                                    className="text-xs text-[var(--color-ocean-600)] hover:underline font-bold"
                                                >
                                                    View Invoice Bill
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Bill/Invoice Modal */}
            {selectedRes && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh]">
                        <button
                            onClick={() => setSelectedResId(null)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 text-xl font-bold font-sans"
                        >
                            &times;
                        </button>
                        
                        {/* Printable Area */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                            {/* Invoice Header */}
                            <div className="text-center pb-6 border-b border-gray-100">
                                <h3 className="text-xl font-extrabold text-[#0E2A38] uppercase tracking-wide">Booking Invoice Folio</h3>
                                <p className="text-xs text-gray-400 mt-1">Generated by Triplooper PMS</p>
                            </div>

                            {/* Property & Booking Details */}
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-gray-400 font-medium block">Property Name</span>
                                    <span className="font-bold text-gray-900 text-sm mt-0.5 block">{tenant?.business_name || 'Our Hotel'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-medium block">Booking ID</span>
                                    <span className="font-mono font-bold text-gray-900 mt-0.5 block">{selectedRes.id}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-medium block">Guest Name</span>
                                    <span className="font-bold text-gray-900 mt-0.5 block">{selectedRes.guest}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-medium block">Room Reserved</span>
                                    <span className="font-bold text-gray-900 mt-0.5 block">{selectedRes.room} (Room #{selectedRes.room_id || '—'})</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-medium block">Check-In Date</span>
                                    <span className="font-bold text-gray-900 mt-0.5 block">{new Date(selectedRes.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-medium block">Check-Out Date</span>
                                    <span className="font-bold text-gray-900 mt-0.5 block">{new Date(selectedRes.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-6">
                                <h4 className="text-xs font-bold text-[#0E2A38] uppercase tracking-wider mb-3">Cost Breakdown</h4>
                                <div className="space-y-2 bg-gray-50 p-4 rounded-2xl text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Room Base Amount</span>
                                        <span className="font-semibold text-gray-900">₹{(selectedRes.amount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">GST Tax (Included)</span>
                                        <span className="font-semibold text-gray-900">₹{(selectedRes.gst_amount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="h-px bg-gray-200 my-2" />
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-gray-900">Total Booking Price</span>
                                        <span className="font-extrabold text-[#0E2A38]">₹{(selectedRes.amount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Triplooper commission portion */}
                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs space-y-1">
                                <div className="flex justify-between font-semibold text-amber-900">
                                    <span>Triplooper Partner Commission (12%)</span>
                                    <span>₹{((selectedRes.amount || 0) * 0.12).toLocaleString('en-IN')}</span>
                                </div>
                                <p className="text-[10px] text-amber-800 font-light">This fee is automatically billed to the property owner's account statement.</p>
                            </div>
                        </div>

                        {/* Print actions */}
                        <div className="pt-6 border-t border-gray-200 flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setSelectedResId(null)}
                                className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="px-6 py-2.5 text-xs font-bold text-white bg-[#0E2A38] hover:bg-[#ef4d23] rounded-xl transition-colors shadow-sm"
                            >
                                Print Bill / Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
