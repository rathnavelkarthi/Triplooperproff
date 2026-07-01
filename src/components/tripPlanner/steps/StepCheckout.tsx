import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, ArrowRight, BedDouble, Calendar, Users } from 'lucide-react';
import type { TripPlan } from '../../../lib/tripPlanner/types';

interface StepCheckoutProps {
  plan: TripPlan | null;
  onBack: () => void;
  onClose: () => void;
}

export default function StepCheckout({ plan, onBack, onClose }: StepCheckoutProps) {
  const navigate = useNavigate();

  if (!plan) return null;

  const handleProceed = () => {
    onClose();
    
    // Calculate checkout date
    const checkInDate = new Date(plan.startDate);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + plan.nights);
    const checkOutStr = checkOutDate.toISOString().slice(0, 10);
    
    const subdomain = plan.property.subdomain || plan.property.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    navigate(`/site/${subdomain}?checkIn=${plan.startDate}&checkOut=${checkOutStr}`);
  };

  const checkInFormatted = new Date(plan.startDate + 'T00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const checkOutDate = new Date(plan.startDate);
  checkOutDate.setDate(checkOutDate.getDate() + plan.nights);
  const checkOutFormatted = checkOutDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="space-y-8 max-w-md mx-auto text-zinc-800 font-inter">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B3B2B]/5 text-[#0B3B2B] text-xs font-bold uppercase tracking-wider font-mono">
          <Sparkles size={12} className="text-[#C5A059]" /> Step 6: Book Your Stay
        </div>
        <h2 className="text-3xl font-playfair font-bold text-[#0B3B2B] tracking-tight">Ready to finalize?</h2>
        <p className="text-zinc-500 text-xs sm:text-sm font-light leading-relaxed">
          Book your room directly on the property's direct checkout page. Once confirmed, your customized itinerary and coordinator contacts will be automatically sent to your WhatsApp by the hotel.
        </p>
      </div>

      {/* Luxury Summary Card */}
      <div className="bg-[#FAF9F6] border border-[#C5A059]/20 rounded-3xl p-6 shadow-sm space-y-5 text-left">
        <div className="flex gap-4 items-start border-b border-[#C5A059]/10 pb-4">
          <img 
            src={plan.property.image} 
            alt={plan.property.name} 
            className="w-20 h-20 rounded-2xl object-cover border border-[#C5A059]/10 shadow-sm shrink-0" 
          />
          <div className="space-y-1">
            <span className="text-[9px] bg-[#0B3B2B]/5 text-[#0B3B2B] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full font-mono">
              {plan.property.type}
            </span>
            <h3 className="text-sm font-bold text-[#0B3B2B] leading-tight">{plan.property.name}</h3>
            <p className="text-xs text-zinc-400 font-light">{plan.property.city}</p>
          </div>
        </div>

        {/* Stay Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1 flex items-start gap-2">
            <Calendar size={14} className="text-[#C5A059] mt-0.5 shrink-0" />
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 block font-mono">Check-In</span>
              <span className="font-bold text-[#0B3B2B]">{checkInFormatted}</span>
            </div>
          </div>

          <div className="space-y-1 flex items-start gap-2">
            <Calendar size={14} className="text-[#C5A059] mt-0.5 shrink-0" />
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 block font-mono">Check-Out</span>
              <span className="font-bold text-[#0B3B2B]">{checkOutFormatted}</span>
            </div>
          </div>

          <div className="space-y-1 flex items-start gap-2">
            <BedDouble size={14} className="text-[#C5A059] mt-0.5 shrink-0" />
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 block font-mono">Duration</span>
              <span className="font-bold text-[#0B3B2B]">{plan.nights} {plan.nights === 1 ? 'Night' : 'Nights'}</span>
            </div>
          </div>

          <div className="space-y-1 flex items-start gap-2">
            <Users size={14} className="text-[#C5A059] mt-0.5 shrink-0" />
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 block font-mono">Party Size</span>
              <span className="font-bold text-[#0B3B2B]">{plan.people} {plan.people === 1 ? 'Person' : 'People'}</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-[#C5A059]/10 my-1" />

        {/* Budget Breakdown Summary */}
        <div className="space-y-2.5 pt-1.5 font-mono text-[10px] text-zinc-500">
          <div className="flex justify-between">
            <span>Total Trip Budget:</span>
            <span className="font-bold text-zinc-800">₹{plan.budgetBreakdown.budget.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span>Stay Cost ({plan.nights} nights):</span>
            <span className="font-bold text-zinc-800">₹{plan.budgetBreakdown.stayCost.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span>Reserved Transport:</span>
            <span className="font-bold text-zinc-800 font-sans">~₹{plan.budgetBreakdown.transportReserve.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-[#C5A059]/10 pt-2 text-xs font-sans">
            <span className="font-medium text-[#0B3B2B]">Remaining Free Budget:</span>
            <span className="font-black text-[#0B3B2B]">₹{plan.budgetBreakdown.freeBudget.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-13 border border-zinc-150 text-zinc-650 hover:bg-zinc-50/50 hover:border-zinc-300 font-bold rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 active:scale-98"
        >
          <ArrowLeft size={13} /> Back
        </button>
        
        <button
          type="button"
          onClick={handleProceed}
          className="flex-grow-[1.5] h-13 bg-[#0B3B2B] hover:bg-[#115C43] text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#0B3B2B]/5 active:scale-98"
        >
          <span>Login & Book Stay</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
