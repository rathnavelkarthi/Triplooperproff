import React from 'react';
import { Sparkles, ArrowLeft, ArrowRight, MapPin, IndianRupee, Car, Pocket, RefreshCw } from 'lucide-react';
import type { TripPlan } from '../../../lib/tripPlanner/types';

interface StepItineraryReviewProps {
  plan: TripPlan | null;
  update: (patch: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepItineraryReview({ plan, update, onNext, onBack }: StepItineraryReviewProps) {
  if (!plan) {
    return (
      <div className="text-center py-10 space-y-4">
        <p className="text-sm text-zinc-500 font-light font-plus-jakarta">Generating your itinerary...</p>
      </div>
    );
  }

  const { destination, nights, property, budgetBreakdown, itinerary } = plan;

  return (
    <div className="space-y-8 max-w-lg mx-auto text-zinc-800 text-left">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B3B2B]/5 text-[#0B3B2B] text-xs font-bold uppercase tracking-wider font-mono">
          <Sparkles size={12} className="text-[#C5A059]" /> Step 5: Itinerary & Budget
        </div>
        <h2 className="text-3xl font-playfair font-bold text-[#0B3B2B] tracking-tight">Your Custom Plan</h2>
        <p className="text-zinc-500 text-sm font-light leading-relaxed">
          Review your budget allocation and day-by-day suggested sightseeing spots.
        </p>
      </div>

      {/* Budget Breakdown Summary */}
      <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-150 space-y-4 font-mono text-xs">
        <h4 className="text-[10px] text-[#0B3B2B] font-extrabold uppercase tracking-widest border-b border-zinc-200 pb-2">
          Estimated Budget Allocation
        </h4>
        
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-zinc-700">
            <span className="flex items-center gap-1.5"><MapPin size={13} className="text-[#0B3B2B]" /> Stay Cost ({nights} nights)</span>
            <span className="font-bold text-[#0B3B2B]">₹{budgetBreakdown.stayCost.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center text-zinc-700">
            <span className="flex items-center gap-1.5"><Car size={13} className="text-[#0B3B2B]" /> Cab / Transport Reserve</span>
            <span className="font-bold text-[#0B3B2B]">₹{budgetBreakdown.transportReserve.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center text-zinc-700">
            <span className="flex items-center gap-1.5"><Pocket size={13} className="text-[#0B3B2B]" /> Spending Money</span>
            <span className="font-bold text-[#0B3B2B]">₹{budgetBreakdown.freeBudget.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {budgetBreakdown.suggestion && (
          <div className="bg-[#0B3B2B]/5 border border-[#0B3B2B]/10 p-3 rounded-xl text-[10px] text-[#0B3B2B] font-medium leading-relaxed flex items-start gap-1.5">
            <Sparkles size={11} className="text-[#C5A059] shrink-0 mt-0.5" />
            <span>{budgetBreakdown.suggestion}</span>
          </div>
        )}
      </div>

      {/* Day by Day Itinerary */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#0B3B2B] uppercase tracking-wider font-mono">Suggested Sightseeing Plan</h3>
        
        {itinerary.length === 0 || !itinerary.some(d => d.attractions.length) ? (
          <div className="p-4 rounded-xl border border-dashed border-zinc-200 text-center text-xs text-zinc-400 font-light">
            Custom day-by-day local sightseeing attractions can be personalized upon request.
          </div>
        ) : (
          <div className="space-y-4">
            {itinerary.map((day) => {
              if (day.attractions.length === 0) return null;
              return (
                <div key={day.day} className="flex gap-4 items-start relative pl-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] mt-1.5 shrink-0" />
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-[#0B3B2B] font-mono uppercase">Day {day.day}</h5>
                    <div className="flex flex-wrap gap-2">
                      {day.attractions.map((a, i) => (
                        <div key={i} className="bg-zinc-100/60 border border-zinc-150 px-3 py-1.5 rounded-xl text-[11px] text-zinc-650 flex flex-col">
                          <span className="font-bold text-zinc-800">{a.name}</span>
                          <span className="text-[9px] text-zinc-400 font-light mt-0.5">~{a.distanceKm}km away · {a.suggestedMins} mins stay</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-13 border border-zinc-150 text-zinc-650 hover:bg-zinc-50/50 hover:border-zinc-300 font-bold rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
        >
          <ArrowLeft size={13} /> Back
        </button>
        
        <button
          type="button"
          onClick={onNext}
          className="flex-grow-[1.5] h-13 bg-[#0B3B2B] hover:bg-[#115C43] text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#0B3B2B]/5 active:scale-98"
        >
          Proceed to Book <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
