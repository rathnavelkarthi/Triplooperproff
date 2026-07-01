import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowLeft, ArrowRight, AlertTriangle, Star } from 'lucide-react';
import { getProperties } from '../../../lib/tripPlanner/properties';
import { buildBudgetBreakdown } from '../../../lib/tripPlanner/budgetEngine';
import type { PlannerProperty } from '../../../lib/tripPlanner/types';

interface StepPropertyPickProps {
  state: { destination?: string; budget?: number; nights?: number; tier?: string; property?: PlannerProperty };
  update: (patch: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepPropertyPick({ state, update, onNext, onBack }: StepPropertyPickProps) {
  const [properties, setProperties] = useState<PlannerProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await getProperties(state.destination);
      // Filter by chosen tier
      const filtered = list.filter((p) => p.tier === state.tier);
      setProperties(filtered);
      setLoading(false);
    })();
  }, [state.destination, state.tier]);

  const handleSelect = (property: PlannerProperty) => {
    update({ property });
  };

  const handleContinue = () => {
    if (state.property) {
      onNext();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-[#0B3B2B] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500 font-light font-plus-jakarta">Scanning available properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-lg mx-auto text-zinc-800">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B3B2B]/5 text-[#0B3B2B] text-xs font-bold uppercase tracking-wider font-mono">
          <Sparkles size={12} className="text-[#C5A059]" /> Step 4: Choose Property
        </div>
        <h2 className="text-3xl font-playfair font-bold text-[#0B3B2B] tracking-tight">Select your Stay</h2>
        <p className="text-zinc-500 text-sm font-light leading-relaxed">
          Pick a property in {state.destination === 'Anywhere' ? 'our catalog' : state.destination}. We've calculated stay costs against your budget.
        </p>
      </div>

      {properties.length === 0 ? (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-center space-y-2">
          <AlertTriangle className="mx-auto text-amber-500" size={24} />
          <h4 className="text-sm font-bold text-amber-800 font-plus-jakarta">No matching properties</h4>
          <p className="text-xs text-amber-700/80 font-light leading-relaxed">
            We couldn't find any stays in {state.destination} for the '{state.tier}' class. Try backing up and changing the tier or destination.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-left max-h-[350px] overflow-y-auto pr-1 no-scrollbars">
          {properties.map((p) => {
            const isSelected = state.property?.id === p.id;
            const breakdown = buildBudgetBreakdown(state.budget || 0, p.nightlyRate, state.nights || 0);
            
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className={`flex gap-4 p-4 rounded-2xl border transition-all text-left relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#0B3B2B]/5 border-[#0B3B2B] ring-1 ring-[#0B3B2B]/10'
                    : 'bg-white border-zinc-150 hover:border-zinc-350 hover:bg-zinc-50/50'
                }`}
              >
                {/* Property Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-zinc-100">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                </div>

                {/* Details */}
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#0B3B2B] font-plus-jakarta leading-tight">{p.name}</h4>
                      <p className="text-[10px] text-zinc-400 font-light">{p.type} · {p.city}</p>
                    </div>
                    {p.rating && (
                      <span className="text-[10px] font-bold text-[#C5A059] flex items-center gap-0.5">
                        <Star size={10} fill="#C5A059" /> {p.rating}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-end pt-2 border-t border-zinc-50">
                    <div>
                      <span className="text-xs font-extrabold text-[#0B3B2B] font-mono">₹{p.nightlyRate.toLocaleString('en-IN')}</span>
                      <span className="text-[9px] text-zinc-400">/night</span>
                    </div>

                    <div className="text-right font-mono text-[9px]">
                      {breakdown.overBudget ? (
                        <span className="text-red-500 font-bold">Over Budget: ₹{breakdown.stayCost.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-zinc-500">
                          Stay: ₹{breakdown.stayCost.toLocaleString('en-IN')} · <span className="text-[#115C43] font-bold">₹{breakdown.freeBudget + breakdown.transportReserve} left</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {p.source === 'live' && (
                  <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded font-mono">
                    Instant Book
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

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
          onClick={handleContinue}
          disabled={!state.property}
          className="flex-1 h-13 bg-[#0B3B2B] hover:bg-[#115C43] text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#0B3B2B]/5 active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
        >
          Continue <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
