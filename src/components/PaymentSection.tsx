import { CreditCard, Smartphone, ShieldCheck, Lock } from 'lucide-react';
import { useState } from 'react';
import posthog from 'posthog-js';

interface PaymentSectionProps {
  onConfirm: () => void;
  totalAmount: number;
}

export default function PaymentSection({ onConfirm, totalAmount }: PaymentSectionProps) {
  const [paymentMethod, setPaymentMethod] = useState('upi');

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-3xl text-[var(--color-ocean-900)] font-bold">Payment Details</h2>
        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-sm font-medium">
          <Lock size={14} />
          <span>Secure Checkout</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Payment Methods */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* UPI Option */}
          <label 
            className={`relative flex flex-col items-center p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300
              ${paymentMethod === 'upi' ? 'border-[var(--color-ocean-500)] bg-[var(--color-ocean-50)] shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <input 
              type="radio" 
              name="paymentMethod" 
              value="upi" 
              checked={paymentMethod === 'upi'}
              onChange={() => setPaymentMethod('upi')}
              className="sr-only"
            />
            <Smartphone size={32} className={`mb-3 ${paymentMethod === 'upi' ? 'text-[var(--color-ocean-600)]' : 'text-gray-400'}`} />
            <span className={`font-semibold ${paymentMethod === 'upi' ? 'text-[var(--color-ocean-900)]' : 'text-gray-600'}`}>UPI / QR Code</span>
            <span className="text-xs text-gray-500 mt-1 text-center">Google Pay, PhonePe, Paytm</span>
            
            {paymentMethod === 'upi' && (
              <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[var(--color-ocean-600)] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </label>

          {/* Card Option */}
          <label 
            className={`relative flex flex-col items-center p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300
              ${paymentMethod === 'card' ? 'border-[var(--color-ocean-500)] bg-[var(--color-ocean-50)] shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <input 
              type="radio" 
              name="paymentMethod" 
              value="card" 
              checked={paymentMethod === 'card'}
              onChange={() => setPaymentMethod('card')}
              className="sr-only"
            />
            <CreditCard size={32} className={`mb-3 ${paymentMethod === 'card' ? 'text-[var(--color-ocean-600)]' : 'text-gray-400'}`} />
            <span className={`font-semibold ${paymentMethod === 'card' ? 'text-[var(--color-ocean-900)]' : 'text-gray-600'}`}>Credit / Debit Card</span>
            <span className="text-xs text-gray-500 mt-1 text-center">Visa, Mastercard, RuPay</span>
            
            {paymentMethod === 'card' && (
              <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[var(--color-ocean-600)] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </label>

        </div>

        {/* Simulated Payment Form */}
        <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
          {paymentMethod === 'upi' ? (
            <div className="text-center py-4">
              <div className="w-48 h-48 bg-white border border-gray-200 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-sm">
                <span className="text-gray-400 text-sm">QR Code Placeholder</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">Scan with any UPI app to pay</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-400">or enter UPI ID</span>
                <input type="text" placeholder="username@upi" className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[var(--color-ocean-500)]" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Card Number</label>
                <div className="relative">
                  <input type="text" placeholder="0000 0000 0000 0000" className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-ocean-500)] outline-none" />
                  <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Expiry</label>
                  <input type="text" placeholder="MM/YY" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-ocean-500)] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">CVV</label>
                  <input type="text" placeholder="123" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-ocean-500)] outline-none" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-6 py-4 border-t border-gray-100 mt-8">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <ShieldCheck size={18} className="text-green-600" />
            <span>256-bit Encryption</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Lock size={18} className="text-green-600" />
            <span>Secure Payment Gateway</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            posthog.capture('booking_payment_confirmed', {
              payment_method: paymentMethod,
              total_amount: totalAmount,
            });
            onConfirm();
          }}
          className="w-full py-4 bg-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-800)] text-white rounded-xl font-bold text-lg transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <Lock size={18} />
          Pay ₹{totalAmount.toLocaleString('en-IN')} & Confirm Booking
        </button>

      </div>
    </div>
  );
}
