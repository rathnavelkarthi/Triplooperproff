import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard, Shield, BadgeCheck, Check, Building2,
  Zap, UtensilsCrossed, AlertTriangle, ArrowRight, Loader2,
  Smartphone, Lock, KeyRound, Globe, Wifi, CheckCircle2, X, Wallet
} from 'lucide-react';
import { initiatePayment } from '../../lib/razorpay';

const C = {
  teal: '#0E2A38',
  tealLight: '#18455B',
  tealDark: '#07161E',
  gold: '#C9A646',
  goldLight: '#E5C163',
  cream: '#FDFBF7',
  gray: '#5A6B72',
  border: '#E2E8F0',
};

export default function BillingSetup() {
  const { tenant, user, refreshTenant, logout } = useAuth();
  const navigate = useNavigate();
  
  const [method, setMethod] = useState<'subscription' | 'commission'>('subscription');
  const [selectedPlan, setSelectedPlan] = useState<'sub_1year' | 'sub_6months' | 'sub_3months' | 'sub_1month'>('sub_1year');
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'authorizing' | 'success'>('select');
  const [selectedPayOption, setSelectedPayOption] = useState<'gpay' | 'card' | 'upi'>('gpay');

  if (!tenant) return null;

  const getAmount = () => {
    if (method === 'commission') return 0;
    if (selectedPlan === 'sub_1year') return Math.round(23988 * 1.18);
    if (selectedPlan === 'sub_6months') return Math.round(13800 * 1.18);
    if (selectedPlan === 'sub_3months') return Math.round(7500 * 1.18);
    return Math.round(2700 * 1.18);
  };

  const handleActivate = () => {
    setShowCheckout(true);
    setPaymentStep('select');
  };

  const handlePaymentSubmit = async () => {
    if (!user) {
      toast.error('Authentication required. Please sign in first.');
      return;
    }

    setPaymentStep('authorizing');

    const finalPlan = method === 'commission' ? 'commission' : selectedPlan;

    try {
      const result = await initiatePayment(
        finalPlan,
        'yearly',
        tenant.id,
        user.email || '',
        tenant.business_name
      );

      if (result.success) {
        setPaymentStep('success');
        toast.success('Billing profile & Auto-Pay activated successfully!');
        
        setTimeout(async () => {
          window.location.href = '/admin';
        }, 1500);
      } else {
        setPaymentStep('select');
        toast.error(result.error || 'Payment failed. Please try again.');
      }
    } catch (err: any) {
      setPaymentStep('select');
      toast.error(err.message || 'Payment initiation failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-8 my-auto">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#0E2A38] text-white text-xs font-bold px-3 py-1 rounded-full">
            <Shield size={14} /> Official Triplooper Billing Setup
          </div>
          <h1 className="text-3xl font-extrabold text-[#0E2A38] tracking-tight">
            Activate Your Property Dashboard
          </h1>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Complete payment setup to activate your dashboard. Choose your preferred package and link your Auto-Pay mandate for the 12% monthly commission.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Option 1: Subscription Method */}
          <div 
            onClick={() => setMethod('subscription')}
            className={`cursor-pointer bg-white rounded-3xl p-8 border-2 transition-all flex flex-col justify-between relative shadow-sm hover:shadow-md ${
              method === 'subscription' ? 'border-[#0E2A38] ring-4 ring-[#0E2A38]/5' : 'border-gray-200'
            }`}
          >
            {method === 'subscription' && (
              <div className="absolute top-4 right-4 bg-[#0E2A38] text-white p-1 rounded-full">
                <Check size={16} />
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#0E2A38]/5 flex items-center justify-center text-[#0E2A38]">
                  <Wallet size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0E2A38]">Subscription Plan</h3>
                  <p className="text-xs text-gray-400">All features included + 12% commission</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-[#0E2A38] uppercase tracking-wider">Select Billing Duration</p>
                <div className="grid gap-2 grid-cols-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedPlan('sub_1year'); setMethod('subscription'); }}
                    className={`p-3 rounded-xl border text-center transition-all relative ${
                      selectedPlan === 'sub_1year' && method === 'subscription'
                        ? 'bg-[#0E2A38] text-white border-transparent'
                        : 'bg-white text-[#0E2A38] border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-full">Most Popular</span>
                    <p className="text-sm font-bold mt-1">1 YEAR</p>
                    <p className="text-[11px] opacity-70">₹1,999 / mo</p>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedPlan('sub_6months'); setMethod('subscription'); }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedPlan === 'sub_6months' && method === 'subscription'
                        ? 'bg-[#0E2A38] text-white border-transparent'
                        : 'bg-white text-[#0E2A38] border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-bold">6 MONTHS</p>
                    <p className="text-[11px] opacity-70">₹2,300 / mo</p>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedPlan('sub_3months'); setMethod('subscription'); }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedPlan === 'sub_3months' && method === 'subscription'
                        ? 'bg-[#0E2A38] text-white border-transparent'
                        : 'bg-white text-[#0E2A38] border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-bold">3 MONTHS</p>
                    <p className="text-[11px] opacity-70">₹2,500 / mo</p>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedPlan('sub_1month'); setMethod('subscription'); }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedPlan === 'sub_1month' && method === 'subscription'
                        ? 'bg-[#0E2A38] text-white border-transparent'
                        : 'bg-white text-[#0E2A38] border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-bold">1 MONTH</p>
                    <p className="text-[11px] opacity-70">₹2,700 / mo</p>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Access Inclusions:</p>
                <ul className="space-y-2.5 text-xs text-gray-500 font-medium">
                  <li className="flex items-center gap-2">
                    <BadgeCheck size={14} className="text-emerald-500 shrink-0" />
                    <span>Custom Property Website & Booking Engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BadgeCheck size={14} className="text-emerald-500 shrink-0" />
                    <span className="font-bold text-[#0E2A38]">OTA Channel Manager Included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BadgeCheck size={14} className="text-emerald-500 shrink-0" />
                    <span className="font-bold text-[#0E2A38]">Restaurant POS & Dining Included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BadgeCheck size={14} className="text-emerald-500 shrink-0" />
                    <span>Aadhaar Guest Verification & Reports</span>
                  </li>
                  <li className="flex items-center gap-2 text-[#C9A646]">
                    <Zap size={13} className="shrink-0" />
                    <span>Pay 12% commission on bookings monthly</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 mt-6 flex items-baseline justify-between">
              <span className="text-xs text-gray-400 font-semibold">Subscription Fee</span>
              <span className="text-lg font-black text-[#0E2A38]">
                {selectedPlan === 'sub_1year' && '₹1,999/mo + 18% GST'}
                {selectedPlan === 'sub_6months' && '₹2,300/mo + 18% GST'}
                {selectedPlan === 'sub_3months' && '₹2,500/mo + 18% GST'}
                {selectedPlan === 'sub_1month' && '₹2,700/mo + 18% GST'}
              </span>
            </div>
          </div>

          {/* Option 2: Commission Method */}
          <div 
            onClick={() => setMethod('commission')}
          className={`cursor-pointer bg-white rounded-3xl p-8 border-2 transition-all flex flex-col justify-between relative shadow-sm hover:shadow-md ${
            method === 'commission' ? 'border-[#0E2A38] ring-4 ring-[#0E2A38]/5' : 'border-gray-200'
          }`}
        >
          {method === 'commission' && (
            <div className="absolute top-4 right-4 bg-[#0E2A38] text-white p-1 rounded-full">
              <Check size={16} />
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CreditCard size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0E2A38]">Commission-Only</h3>
                <p className="text-xs text-gray-400">Zero subscription fees · Pay as you earn</p>
              </div>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200/40 rounded-2xl flex gap-3">
              <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-xs font-bold text-orange-800">Feature restrictions apply</p>
                <p className="text-[11px] text-orange-700/80 leading-relaxed mt-0.5">
                  Does not include the Channel Manager or Restaurant System (POS/Menu management/Tables/Kitchen orders).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Access Inclusions:</p>
              <ul className="space-y-2.5 text-xs text-gray-500 font-medium">
                <li className="flex items-center gap-2">
                  <BadgeCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Custom Property Website & Booking Engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <BadgeCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Guest Portal & Check-In Portal</span>
                </li>
                <li className="flex items-center gap-2">
                  <BadgeCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Unlimited Rooms, Staff & Guest Bookings</span>
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <X size={14} className="text-red-500 shrink-0" />
                  <span className="line-through">Channel Manager (OTA synchronization)</span>
                </li>
                <li className="flex items-center gap-2 opacity-50">
                  <X size={14} className="text-red-500 shrink-0" />
                  <span className="line-through">Restaurant POS & In-room Dining POS</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 mt-6 flex items-baseline justify-between">
            <span className="text-xs text-gray-400 font-semibold">Subscription Fee</span>
            <span className="text-2xl font-black text-emerald-600">
              ₹0 <span className="text-xs text-gray-400 font-normal">/ year</span>
            </span>
          </div>
        </div>

      </div>
    </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={logout}
          className="px-6 py-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-semibold transition-colors"
        >
          Sign Out
        </button>
        <button
          onClick={handleActivate}
          className="px-8 py-3 bg-[#0E2A38] text-white rounded-xl text-sm font-semibold hover:bg-[#1a3d4f] transition-all flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
        >
          Activate Plan & Setup Auto-Pay <ArrowRight size={14} />
        </button>
      </div>

      {/* Razorpay Mandate Modal */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Payment Steps */}
              {paymentStep === 'select' && (
                <div className="p-6 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                      <CreditCard size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-[#0E2A38]">Razorpay Auto-Pay Consent</h2>
                    <p className="text-xs text-gray-400">
                      Link a payment method to set up Auto-Pay for the 12% monthly commission.
                      {method === 'subscription' && ` You will also be charged ₹${getAmount().toLocaleString()} for the yearly subscription.`}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPayOption('gpay')}
                      className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedPayOption === 'gpay' ? 'border-blue-600 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="text-gray-400" size={18} />
                        <div>
                          <p className="text-sm font-bold text-[#0E2A38]">Google Pay / UPI AutoPay</p>
                          <p className="text-[10px] text-gray-400">One-click UPI authorization</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedPayOption === 'gpay' ? 'border-blue-600 bg-blue-600' : 'border-gray-200'
                      }`}>
                        {selectedPayOption === 'gpay' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPayOption('card')}
                      className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedPayOption === 'card' ? 'border-blue-600 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="text-gray-400" size={18} />
                        <div>
                          <p className="text-sm font-bold text-[#0E2A38]">Debit / Credit Card</p>
                          <p className="text-[10px] text-gray-400">Visa, Mastercard, RuPay, Amex</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedPayOption === 'card' ? 'border-blue-600 bg-blue-600' : 'border-gray-200'
                      }`}>
                        {selectedPayOption === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCheckout(false)}
                      className="flex-1 py-3 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handlePaymentSubmit}
                      className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2 shadow-sm"
                    >
                      Confirm Mandate
                    </button>
                  </div>
                </div>
              )}

              {paymentStep === 'authorizing' && (
                <div className="p-8 text-center space-y-6">
                  <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#0E2A38]">Registering Auto-Pay Mandate</h3>
                    <p className="text-xs text-gray-400">Contacting Razorpay Secure Gateway... Please do not close this window.</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl text-[10px] font-mono text-gray-400 flex items-center justify-center gap-2">
                    <Lock size={12} /> SECURE 256-BIT ENCRYPTION
                  </div>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="p-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 size={30} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#0E2A38]">Onboarding Setup Complete</h3>
                    <p className="text-xs text-gray-400">Payment mandate verified successfully. Redirecting you to the dashboard...</p>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
