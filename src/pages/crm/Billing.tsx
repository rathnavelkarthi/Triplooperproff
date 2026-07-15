import { useState } from 'react';
import { motion } from 'motion/react';
import { CreditCard, Receipt, BarChart3, TrendingUp, Sparkles, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMDataContext';
import { initiatePayment } from '../../lib/razorpay';
import { toast } from 'sonner';

export default function Billing() {
    const { tenant, user, refreshTenant } = useAuth();
    const { reservations } = useCRM();
    const [selectedResId, setSelectedResId] = useState<string | null>(null);
    const isTestingMode = import.meta.env.DEV || window.location.search.includes('test=true') || window.location.hostname === 'localhost';
    const [upgradePlan, setUpgradePlan] = useState<'subscription_small' | 'subscription_large' | 'subscription_test' | null>(null);
    const [loading, setLoading] = useState(false);
 
    // Calculate commission stats
    const activeBookings = reservations.filter(r => r.status !== 'Cancelled');
    const totalBookings = activeBookings.length;
    const totalRevenue = activeBookings.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalCommission = totalRevenue * 0.12;
 
    const selectedRes = reservations.find(r => r.id === selectedResId);
 
    const handleInitiateUpgrade = (plan: 'subscription_small' | 'subscription_large' | 'subscription_test') => {
        setUpgradePlan(plan);
    };
 
    const handleConfirmUpgrade = async () => {
        if (!upgradePlan) return;
        if (!tenant || !user) {
            toast.error('Authentication required. Please sign in first.');
            return;
        }
 
        setLoading(true);
        try {
            const result = await initiatePayment(
                upgradePlan,
                'yearly',
                tenant.id,
                user.email || '',
                tenant.business_name
            );
 
            if (result.success) {
                toast.success('Successfully upgraded to subscription!');
                setUpgradePlan(null);
                await refreshTenant();
                window.location.reload();
            } else {
                if (result.error !== 'Payment cancelled') {
                    toast.error(result.error || 'Upgrade failed');
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Upgrade failed');
        } finally {
            setLoading(false);
        }
    };
 
    const getPlanDetails = () => {
        if (tenant?.plan === 'subscription_test') {
            return {
                name: 'Subscription (Test Plan - ₹1)',
                price: '₹1 / year',
                desc: 'Access to all features (Testing Mode). 12% monthly commission on booking earnings.',
                autoPay: true,
            };
        } else if (tenant?.plan === 'subscription_small') {
            return {
                name: 'Subscription (Max 10 Rooms)',
                price: '₹15,000 / year',
                desc: 'Access to all features. 12% monthly commission on booking earnings.',
                autoPay: true,
            };
        } else if (tenant?.plan === 'subscription_large') {
            return {
                name: 'Subscription (Unlimited Rooms)',
                price: '₹21,000 / year',
                desc: 'Access to all features. 12% monthly commission on booking earnings.',
                autoPay: true,
            };
        } else {
            return {
                name: '12% Commission Only',
                price: '₹0 / year',
                desc: 'Channel Manager and Restaurant POS disabled. 12% monthly commission on booking earnings.',
                autoPay: true,
            };
        }
    };

    const planInfo = getPlanDetails();

    return (
        <div className="max-w-5xl mx-auto space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-[#0E2A38]">{planInfo.name}</h1>
                    <p className="text-xs text-gray-400 mt-1">{planInfo.desc}</p>
                    <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs font-mono bg-gray-50 border border-gray-200 text-gray-500 px-2.5 py-1 rounded-lg">
                            Mandate: {tenant?.razorpay_mandate_id || 'Active (simulated)'}
                        </span>
                        <span className="text-xs text-emerald-600 bg-emerald-50 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> AutoPay Active
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xs text-gray-400 block font-semibold">Subscription Cost</span>
                    <span className="text-2xl font-black text-[#0E2A38] block mt-1">{planInfo.price}</span>
                </div>
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
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Commission Payout</p>
                    <h3 className="text-3xl font-extrabold text-[#0E2A38] mt-2">Monthly</h3>
                    <p className="text-[11px] text-gray-500 mt-1">Auto-deducted via Razorpay mandate</p>
                </motion.div>
            </div>

            {/* Upgrade to Subscription Section */}
            {tenant?.plan === 'commission' && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-[#0E2A38] flex items-center gap-2">
                                <Sparkles className="text-amber-655 text-amber-600" size={20} />
                                Upgrade to Subscription & Unlock All Tools
                            </h2>
                            <p className="text-xs text-gray-600 mt-1">
                                Enable the OTA Channel Manager, Restaurant POS, Table Management, and Unlimited Rooms.
                            </p>
                        </div>
                    </div>

                    <div className={`grid grid-cols-1 gap-4 ${isTestingMode ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                        {isTestingMode && (
                            <div className="bg-white border border-gray-150 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                        Test Tier
                                    </span>
                                    <h3 className="text-base font-bold text-[#0E2A38] mt-3">Subscription (Test Plan - ₹1)</h3>
                                    <p className="text-xs text-gray-400 mt-1 font-light">
                                        Test checkout, order creation, signature verification, and limits.
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-gray-50 mt-4 flex items-center justify-between">
                                    <span className="text-lg font-extrabold text-[#0E2A38]">₹1 <span className="text-[11px] text-gray-400 font-normal">/ year</span></span>
                                    <button
                                        onClick={() => handleInitiateUpgrade('subscription_test')}
                                        className="px-4 py-2 bg-[#0E2A38] hover:bg-[#18455B] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                    >
                                        Choose Plan
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white border border-gray-150 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                                    Starter Tier
                                </span>
                                <h3 className="text-base font-bold text-[#0E2A38] mt-3">Subscription (Max 10 Rooms)</h3>
                                <p className="text-xs text-gray-400 mt-1 font-light">
                                    Perfect for small boutique properties wanting full automation.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-gray-50 mt-4 flex items-center justify-between">
                                <span className="text-lg font-extrabold text-[#0E2A38]">₹15,000 <span className="text-[11px] text-gray-400 font-normal">/ year</span></span>
                                <button
                                    onClick={() => handleInitiateUpgrade('subscription_small')}
                                    className="px-4 py-2 bg-[#0E2A38] hover:bg-[#18455B] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                    Choose Plan
                                </button>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-150 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                                    Unlimited Tier
                                </span>
                                <h3 className="text-base font-bold text-[#0E2A38] mt-3">Subscription (Unlimited Rooms)</h3>
                                <p className="text-xs text-gray-400 mt-1 font-light">
                                    No room limits. Unrestricted channel synchronization and Restaurant POS.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-gray-50 mt-4 flex items-center justify-between">
                                <span className="text-lg font-extrabold text-[#0E2A38]">₹21,000 <span className="text-[11px] text-gray-400 font-normal">/ year</span></span>
                                <button
                                    onClick={() => handleInitiateUpgrade('subscription_large')}
                                    className="px-4 py-2 bg-[#0E2A38] hover:bg-[#18455B] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                    Choose Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Upgrade Confirmation Modal */}
            {upgradePlan && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative border border-gray-100 space-y-6">
                        <button
                            onClick={() => setUpgradePlan(null)}
                            className="absolute top-4 right-4 text-gray-450 hover:text-gray-900 text-xl font-bold font-sans cursor-pointer"
                        >
                            &times;
                        </button>

                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                                <Sparkles size={22} />
                            </div>
                            <h3 className="text-lg font-bold text-[#0E2A38]">Confirm Plan Upgrade</h3>
                            <p className="text-xs text-gray-400">
                                You are about to upgrade to the **{upgradePlan === 'subscription_small' ? 'Subscription (Max 10 Rooms)' : (upgradePlan === 'subscription_test' ? 'Subscription (Test Plan - ₹1)' : 'Subscription (Unlimited Rooms)')}** plan.
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200/50 rounded-2xl p-4 space-y-3 text-left">
                            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Shield size={14} /> What is going to happen:
                            </h4>
                            <ul className="space-y-2 text-xs text-blue-700 leading-relaxed font-light">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 font-bold">•</span>
                                    <span>Your registered GPay/Card will be charged **₹{upgradePlan === 'subscription_small' ? '15,000' : (upgradePlan === 'subscription_test' ? '1' : '21,000')}** for the yearly subscription.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 font-bold">•</span>
                                    <span>**Channel Manager (OTA Sync)** and **Restaurant POS** features will be immediately unlocked.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 font-bold">•</span>
                                    <span>Your billing plan will update, and you will continue paying the 12% monthly commission on booking earnings.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setUpgradePlan(null)}
                                className="flex-1 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmUpgrade}
                                className="flex-1 py-3 text-xs font-bold text-white bg-[#0E2A38] hover:bg-[#1a3d4f] rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={13} />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Confirm & Pay
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
