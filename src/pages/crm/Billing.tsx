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
        const customPrice = (tenant as any)?.custom_monthly_price;
        if (customPrice && typeof customPrice === 'number' && customPrice > 0) {
            return {
                name: 'Advance Platform Subscription Plan',
                price: `₹${customPrice.toLocaleString('en-IN')} / month (Tax Inclusive)`,
                desc: 'Advance software subscription providing full operational access to Website, Staff Management, WhatsApp Management, Unlimited Rooms, Channel Manager & POS.',
                autoPay: true,
            };
        } else if (tenant?.plan === 'commission') {
            return {
                name: '12% Commission Only (Trial / PMS Mode)',
                price: '₹0 / month',
                desc: 'Core software & Channel Manager trial mode. 12% monthly commission on booking earnings. Additional app modules available as add-ons.',
                autoPay: false,
            };
        } else {
            return {
                name: 'Subscribed Plan',
                price: 'Subscription Active',
                desc: 'Full access to Website, Staff Management, WhatsApp Management, Unlimited Rooms, Channel Manager & POS. 12% monthly commission on booking earnings.',
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

            {/* Dashboard Upgrade & Add-ons Section */}
            <DashboardAddonsUpgrade tenant={tenant} user={user} refreshTenant={refreshTenant} />

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
            {selectedRes && (() => {
                const roomPrice = selectedRes.amount || 5000;
                const discount = selectedRes.discount ?? 0;
                const commissionableAmount = Math.max(0, roomPrice - discount);
                const gstAmount = Math.round(commissionableAmount * 0.12);
                const totalBookingAmount = commissionableAmount + gstAmount;
                const triplooperCommission = Math.round(commissionableAmount * 0.12);
                const payableToProperty = commissionableAmount - triplooperCommission;

                const copyTableToClipboard = (title: string, text: string) => {
                    navigator.clipboard.writeText(text);
                    toast.success(`${title} copied to clipboard!`);
                };

                const settlementBillText = `Property Settlement Bill\nParticulars\tAmount\nRoom Price\t₹${roomPrice.toLocaleString('en-IN')}\nDiscount\t-₹${discount.toLocaleString('en-IN')}\nCommissionable Amount\t₹${commissionableAmount.toLocaleString('en-IN')}\nGST @12%\t₹${gstAmount.toLocaleString('en-IN')}\nTotal Booking Amount\t₹${totalBookingAmount.toLocaleString('en-IN')}\nTriplooper Commission (12%)\t-₹${triplooperCommission.toLocaleString('en-IN')}\nAmount Payable to Property\t₹${payableToProperty.toLocaleString('en-IN')}`;

                const customerBillText = `Customer Tax Bill\nParticulars\tAmount\nRoom Price\t₹${roomPrice.toLocaleString('en-IN')}\nDiscount\t-₹${discount.toLocaleString('en-IN')}\nTaxable Value\t₹${commissionableAmount.toLocaleString('en-IN')}\nGST @12%\t₹${gstAmount.toLocaleString('en-IN')}\nGrand Total\t₹${totalBookingAmount.toLocaleString('en-IN')}`;

                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh]">
                            <button
                                onClick={() => setSelectedResId(null)}
                                className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 text-xl font-bold font-sans"
                            >
                                &times;
                            </button>
                            
                            {/* Scrollable Printable Area */}
                            <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                                {/* Header */}
                                <div className="text-center pb-4 border-b border-gray-100">
                                    <h3 className="text-xl font-extrabold text-[#0E2A38] uppercase tracking-wide">Property Statement & Tax Bills</h3>
                                    <p className="text-xs text-gray-400 mt-1">{tenant?.business_name || 'Property Folio'} · Booking {selectedRes.id.substring(0, 8)}</p>
                                </div>

                                {/* Booking Info Summary */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <div>
                                        <span className="text-gray-400 font-medium block">Guest Name</span>
                                        <span className="font-bold text-gray-900 mt-0.5 block">{selectedRes.guest}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 font-medium block">Room</span>
                                        <span className="font-bold text-gray-900 mt-0.5 block">{selectedRes.room}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 font-medium block">Check In / Out</span>
                                        <span className="font-bold text-gray-900 mt-0.5 block">
                                            {new Date(selectedRes.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(selectedRes.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                </div>

                                {/* 1. Property Settlement Bill */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                        <h4 className="text-base font-bold text-gray-900">Property Settlement Bill</h4>
                                        <button
                                            onClick={() => copyTableToClipboard('Property Settlement Bill', settlementBillText)}
                                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                            title="Copy Settlement Bill"
                                        >
                                            <span className="text-[10px]">Copy</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>

                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-gray-500 border-b border-gray-100 text-xs uppercase font-semibold">
                                                <th className="text-left py-2">Particulars</th>
                                                <th className="text-right py-2">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-gray-700">
                                            <tr>
                                                <td className="py-2.5">Room Price</td>
                                                <td className="py-2.5 text-right font-medium">₹{roomPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5">Discount</td>
                                                <td className="py-2.5 text-right font-medium text-red-600">-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr className="font-bold text-gray-900">
                                                <td className="py-2.5">Commissionable Amount</td>
                                                <td className="py-2.5 text-right">₹{commissionableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5">GST @12%</td>
                                                <td className="py-2.5 text-right font-medium">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr className="font-bold text-gray-900">
                                                <td className="py-2.5">Total Booking Amount</td>
                                                <td className="py-2.5 text-right">₹{totalBookingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5">
                                                    Less: Triplooper Commission (12% of ₹{commissionableAmount.toLocaleString('en-IN')})
                                                </td>
                                                <td className="py-2.5 text-right font-medium text-amber-700">
                                                    -₹{triplooperCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                            <tr className="font-extrabold text-[#0E2A38] bg-emerald-50/70">
                                                <td className="py-3 px-2 rounded-l-xl">Amount Payable to Property</td>
                                                <td className="py-3 px-2 text-right rounded-r-xl text-emerald-800 text-base">
                                                    ₹{payableToProperty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <p className="text-[10px] text-gray-400 text-center pt-1 italic">To property</p>
                                </div>

                                {/* 2. Customer Tax Bill */}
                                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                        <div className="space-y-0.5">
                                            <h4 className="text-base font-bold text-gray-900">1. Customer Tax Bill</h4>
                                            <p className="text-[11px] text-gray-400">Shows: Room Charges · Discount (if any) · GST @12% · Total Amount Paid</p>
                                        </div>
                                        <button
                                            onClick={() => copyTableToClipboard('Customer Tax Bill', customerBillText)}
                                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                            title="Copy Customer Tax Bill"
                                        >
                                            <span className="text-[10px]">Copy</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>

                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-gray-500 border-b border-gray-100 text-xs uppercase font-semibold">
                                                <th className="text-left py-2">Particulars</th>
                                                <th className="text-right py-2">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-gray-700">
                                            <tr>
                                                <td className="py-2.5">Room Charges</td>
                                                <td className="py-2.5 text-right font-medium">₹{roomPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5">Discount</td>
                                                <td className="py-2.5 text-right font-medium text-red-600">-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr className="font-semibold text-gray-900">
                                                <td className="py-2.5">Taxable Value</td>
                                                <td className="py-2.5 text-right font-bold">₹{commissionableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2.5">GST @12%</td>
                                                <td className="py-2.5 text-right font-medium">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            <tr className="font-extrabold text-[#0E2A38] bg-gray-50">
                                                <td className="py-3 px-2 rounded-l-xl text-base">Grand Total</td>
                                                <td className="py-3 px-2 text-right rounded-r-xl text-base text-[#0E2A38]">
                                                    ₹{totalBookingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                            </div>

                            {/* Print / Close Actions */}
                            <div className="pt-4 border-t border-gray-200 flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => setSelectedResId(null)}
                                    className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="px-6 py-2.5 text-xs font-bold text-white bg-[#0E2A38] hover:bg-[#ef4d23] rounded-xl transition-colors shadow-sm cursor-pointer"
                                >
                                    Print Bill / Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

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

/* ─────────────────────────────────────────────────────────
   DashboardAddonsUpgrade Component
   ───────────────────────────────────────────────────────── */
function DashboardAddonsUpgrade({ tenant, user, refreshTenant }: { tenant: any; user: any; refreshTenant: () => Promise<void> }) {
    const [isYearly, setIsYearly] = useState(true);
    const [includeBasePlan, setIncludeBasePlan] = useState(true);
    const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({
        channel_manager: true,
        website: true,
        staff_mgmt: true,
        whatsapp_mgmt: true,
        room_mgmt: true,
        digital_marketing: false,
    });
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const ADDON_LIST = [
        { id: 'channel_manager', name: 'Channel Manager', monthlyPrice: 1500, yearlyPrice: 15000, desc: 'Real-time OTA inventory & rate synchronization across Booking.com, Agoda, MakeMyTrip' },
        { id: 'website', name: 'Web Site', monthlyPrice: 400, yearlyPrice: 4000, desc: 'Custom property booking site with zero-commission direct guest booking engine' },
        { id: 'staff_mgmt', name: 'Staff Management', monthlyPrice: 400, yearlyPrice: 4000, desc: 'Role-based access, housekeeping assignments, staff shifts & performance analytics' },
        { id: 'whatsapp_mgmt', name: 'WhatsApp Management', monthlyPrice: 400, yearlyPrice: 4000, desc: 'Automated booking confirmations, check-in reminders & guest messaging via WhatsApp' },
        { id: 'room_mgmt', name: 'Room Management', monthlyPrice: 400, yearlyPrice: 4000, desc: 'Interactive room calendar, live status tracking & multi-property room inventory' },
        { id: 'digital_marketing', name: 'Digital Marketing', monthlyPrice: 1000, yearlyPrice: 10000, desc: 'Google Hotel Ads integration, SEO optimization & direct booking campaign tools' },
    ];

    const basePrice = includeBasePlan ? (isYearly ? 27000 : 2700) : 0;
    const addonsTotal = ADDON_LIST.reduce((sum, item) => {
        if (selectedAddons[item.id]) {
            return sum + (isYearly ? item.yearlyPrice : item.monthlyPrice);
        }
        return sum;
    }, 0);

    const subtotal = basePrice + addonsTotal;
    const gstAmount = Math.round(subtotal * 0.18);
    const grandTotal = subtotal + gstAmount;

    const toggleAddon = (id: string) => {
        setSelectedAddons(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handlePayAndUpgrade = async () => {
        if (!tenant || !user) {
            toast.error('Authentication required. Please sign in.');
            return;
        }

        if (grandTotal <= 0) {
            toast.error('Please select at least one plan or add-on to upgrade.');
            return;
        }

        setCheckoutLoading(true);
        try {
            const billingCycle = isYearly ? 'yearly' : 'monthly';
            const selectedAddonNames = ADDON_LIST.filter(a => selectedAddons[a.id]).map(a => a.name).join(', ');
            const desc = includeBasePlan
                ? `Base Plan (₹2,700/mo) + Addons: ${selectedAddonNames || 'None'} (${billingCycle})`
                : `Addons: ${selectedAddonNames} (${billingCycle})`;

            const { initiateCustomBundlePayment } = await import('../../lib/razorpay');
            const result = await initiateCustomBundlePayment(
                grandTotal,
                desc,
                tenant.id,
                user.email || '',
                tenant.business_name,
                billingCycle,
                'subscription_2700'
            );

            if (result.success) {
                toast.success('Upgrade completed successfully!');
                await refreshTenant();
                window.location.reload();
            } else if (result.error !== 'Payment cancelled') {
                toast.error(result.error || 'Upgrade payment failed');
            }
        } catch (err: any) {
            toast.error(err.message || 'Payment initiation failed');
        } finally {
            setCheckoutLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-[#0E2A38]/5 via-white to-amber-50/40 border border-[#0E2A38]/15 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200/80 pb-6">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E2A38] text-white text-[11px] font-bold uppercase tracking-wider mb-2">
                        <Sparkles size={12} className="text-amber-400" /> Exclusive Dashboard Upgrade & Add-ons
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#0E2A38] tracking-tight">Customize Your Subscription & Add-ons</h2>
                    <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                        Select the features your property needs. Pay monthly or choose yearly billing to get <span className="font-bold text-amber-700">2 Months FREE</span> on your annual payment.
                    </p>
                </div>

                {/* Billing Cycle Selector */}
                <div className="flex items-center bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shrink-0 self-start md:self-auto">
                    <button
                        onClick={() => setIsYearly(false)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                            !isYearly ? 'bg-white text-[#0E2A38] shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Monthly Billing
                    </button>
                    <button
                        onClick={() => setIsYearly(true)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                            isYearly ? 'bg-[#0E2A38] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <span>Yearly Billing</span>
                        <span className="bg-amber-400 text-[#0E2A38] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                            2 Mos Free
                        </span>
                    </button>
                </div>
            </div>

            {/* Base Subscription Card */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${
                includeBasePlan ? 'bg-white border-[#0E2A38] shadow-md' : 'bg-gray-50/60 border-gray-200'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <input
                            type="checkbox"
                            checked={includeBasePlan}
                            onChange={(e) => setIncludeBasePlan(e.target.checked)}
                            className="mt-1.5 w-5 h-5 rounded border-gray-300 text-[#0E2A38] focus:ring-[#0E2A38] cursor-pointer"
                            id="base-plan-checkbox"
                        />
                        <div>
                            <label htmlFor="base-plan-checkbox" className="text-base font-bold text-[#0E2A38] cursor-pointer flex items-center gap-2">
                                Triplooper Core PMS Base Plan
                                {isYearly && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">2 Months Free Applied</span>}
                            </label>
                            <p className="text-xs text-gray-500 mt-1 font-light">
                                Includes Full PMS, Booking Engine, Aadhaar Guest Check-In, GST Invoicing, Unlimited Rooms & Staff + 12% monthly commission on booking earnings.
                            </p>
                        </div>
                    </div>

                    <div className="text-right shrink-0 pl-9 sm:pl-0">
                        <div className="text-xl font-extrabold text-[#0E2A38]">
                            ₹{isYearly ? '27,000' : '2,700'} <span className="text-xs font-normal text-gray-400">{isYearly ? '/ year' : '/ month'}</span>
                        </div>
                        {isYearly ? (
                            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">₹2,250 / mo effective (10 mos paid)</p>
                        ) : (
                            <p className="text-[11px] text-gray-400 mt-0.5">Billed monthly + 18% GST</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Add-ons Selection Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#0E2A38] uppercase tracking-wider">Select Available Add-ons:</h3>
                    <span className="text-xs text-gray-400">{Object.values(selectedAddons).filter(Boolean).length} of 6 selected</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ADDON_LIST.map((addon) => {
                        const isSelected = !!selectedAddons[addon.id];
                        const displayPrice = isYearly ? addon.yearlyPrice : addon.monthlyPrice;

                        return (
                            <div
                                key={addon.id}
                                onClick={() => toggleAddon(addon.id)}
                                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                                    isSelected
                                        ? 'bg-white border-[#0E2A38] ring-2 ring-[#0E2A38]/10 shadow-sm'
                                        : 'bg-white/70 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                        isSelected ? 'bg-[#0E2A38] border-[#0E2A38] text-white' : 'border-gray-300 bg-white'
                                    }`}>
                                        {isSelected && <span className="text-xs font-bold">✓</span>}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-[#0E2A38]">{addon.name}</h4>
                                        <p className="text-xs text-gray-400 mt-1 font-light leading-relaxed">{addon.desc}</p>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="text-sm font-extrabold text-[#0E2A38]">
                                        ₹{displayPrice.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[11px] text-gray-400 block">{isYearly ? '/ yr' : '/ mo'}</span>
                                    {isYearly && (
                                        <span className="text-[10px] text-amber-600 font-bold block mt-0.5">2 mos free</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Total Summary & Checkout Button */}
            <div className="bg-[#0E2A38] text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <CreditCard size={20} className="text-amber-400" /> Summary of Selected Upgrades
                        </h3>
                        <p className="text-xs text-white/60 mt-1">
                            {isYearly ? 'Annual payment with 2 Months FREE offer applied.' : 'Monthly recurring subscription.'} Standard 18% GST applies.
                        </p>
                    </div>

                    <div className="text-right">
                        <span className="text-xs text-white/50 block font-medium">Total Amount Payable</span>
                        <span className="text-3xl font-black text-amber-400 block mt-1">
                            ₹{grandTotal.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-white/60 block">Including 18% GST (₹{gstAmount.toLocaleString('en-IN')})</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-white/70 border-b border-white/10 pb-6">
                    <div>
                        <span className="text-white/40 block">Base Subscription</span>
                        <span className="font-bold text-white mt-0.5 block">₹{basePrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                        <span className="text-white/40 block">Add-ons Subtotal</span>
                        <span className="font-bold text-white mt-0.5 block">₹{addonsTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                        <span className="text-white/40 block">GST Tax (18%)</span>
                        <span className="font-bold text-white mt-0.5 block">₹{gstAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                        <span className="text-white/40 block">Booking Commission</span>
                        <span className="font-bold text-amber-300 mt-0.5 block">12% Monthly</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <p className="text-xs text-white/60 font-light max-w-md">
                        🔒 Secured by Razorpay 256-bit encrypted checkout. Unlocks selected features immediately across your dashboard.
                    </p>
                    <button
                        onClick={handlePayAndUpgrade}
                        disabled={checkoutLoading || grandTotal <= 0}
                        className="w-full sm:w-auto px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-[#0E2A38] font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {checkoutLoading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Processing...
                            </>
                        ) : (
                            <>
                                Upgrade Now & Pay ₹{grandTotal.toLocaleString('en-IN')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

