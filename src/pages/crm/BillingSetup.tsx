import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard, Shield, BadgeCheck, Check, Building2,
  Zap, UtensilsCrossed, AlertTriangle, ArrowRight, Loader2,
  Smartphone, Lock, KeyRound, Globe, Wifi, CheckCircle2, X
} from 'lucide-react';

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
  const { tenant, refreshTenant, logout } = useAuth();
  const navigate = useNavigate();
  
  const [method, setMethod] = useState<'subscription' | 'commission'>('subscription');
  const [roomTier, setRoomTier] = useState<'small' | 'large'>('small');
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'authorizing' | 'success'>('select');
  const [selectedPayOption, setSelectedPayOption] = useState<'gpay' | 'card' | 'upi'>('gpay');

  if (!tenant) return null;

  const getAmount = () => {
    if (method === 'commission') return 0;
    return roomTier === 'small' ? 15000 : 21000;
  };

  const handleActivate = () => {
    setShowCheckout(true);
    setPaymentStep('select');
  };

  const handlePaymentSubmit = async () => {
    setPaymentStep('authorizing');
    
    // Simulate mandate registration & yearly payment charge (takes 2s)
    setTimeout(async () => {
      try {
        const finalPlan = method === 'commission' 
          ? 'commission' 
          : (roomTier === 'small' ? 'subscription_small' : 'subscription_large');

        const maxRoomsVal = method === 'commission'
          ? 9999
          : (roomTier === 'small' ? 10 : 9999);

        // Update database
        const { error } = await supabase
          .from('tenants')
          .update({
            plan: finalPlan,
            payment_setup: true,
            max_rooms: maxRoomsVal,
            razorpay_customer_id: 'cust_mock_' + Math.random().toString(36).substring(7),
            razorpay_subscription_id: method === 'subscription' ? 'sub_mock_' + Math.random().toString(36).substring(7) : null,
            razorpay_mandate_id: 'mandate_mock_' + Math.random().toString(36).substring(7),
          })
          .eq('id', tenant.id);

        if (error) throw error;

        // Record initial subscription log if it's the yearly plan
        if (method === 'subscription') {
          await supabase.from('subscriptions').insert({
            tenant_id: tenant.id,
            plan: finalPlan,
            status: 'paid',
            amount: getAmount(),
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
          });
        }

        setPaymentStep('success');
        toast.success('Billing profile & Auto-Pay activated successfully!');
        
        setTimeout(async () => {
          await refreshTenant();
          navigate('/admin/dashboard');
        }, 1500);

      } catch (err: any) {
        toast.error(err.message || 'Failed to register mandate.');
        setPaymentStep('select');
        setShowCheckout(false);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      
      {/* Header Info */}
      <div className="text-center max-w-xl mx-auto mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0E2A38]/5 border border-[#0E2A38]/10 text-xs font-semibold text-[#0E2A38]">
          <Shield size={13} /> Secure Onboarding Gate
        </div>
        <h1 className="text-3xl font-extrabold text-[#0E2A38] tracking-tight">Configure Your Billing & Auto-Pay</h1>
        <p className="text-sm text-gray-500">
          Complete payment setup to activate your dashboard. Choose your preferred package and link your Auto-Pay mandate for the 12% monthly commission.
        </p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
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
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-[#C9A646]">
                <Zap size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0E2A38]">Subscription Plan</h3>
                <p className="text-xs text-gray-400">One-time yearly fee + 12% commission</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-[#0E2A38] uppercase tracking-wider">Select Property Room Count</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setRoomTier('small'); setMethod('subscription'); }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    roomTier === 'small' && method === 'subscription'
                      ? 'bg-[#0E2A38] text-white border-transparent'
                      : 'bg-white text-[#0E2A38] border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-bold">Max 10 Rooms</p>
                  <p className="text-[11px] opacity-70">₹15,000 / year</p>
                </button>
                
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setRoomTier('large'); setMethod('subscription'); }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    roomTier === 'large' && method === 'subscription'
                      ? 'bg-[#0E2A38] text-white border-transparent'
                      : 'bg-white text-[#0E2A38] border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-bold">11+ Rooms</p>
                  <p className="text-[11px] opacity-70">₹21,000 / year</p>
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
                  <span className="font-bold text-[#0E2A38]">Restaurant POS & Tables Included</span>
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
            <span className="text-2xl font-black text-[#0E2A38]">
              ₹{roomTier === 'small' ? '15,000' : '21,000'} <span className="text-xs text-gray-400 font-normal">/ year</span>
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
