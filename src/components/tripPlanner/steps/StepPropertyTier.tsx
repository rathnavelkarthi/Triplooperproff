import React from 'react';
import { Sparkles, ArrowLeft, ArrowRight, ShieldCheck, Heart, Crown } from 'lucide-react';
import type { PropertyTier } from '../../../lib/tripPlanner/types';

interface StepPropertyTierProps {
  state: { tier?: PropertyTier };
  update: (patch: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const TIER_CARDS: { tier: PropertyTier; icon: any; label: string; range: string; desc: string }[] = [
  { 
    tier: 'budget', 
    icon: ShieldCheck, 
    label: 'Budget Stay', 
    range: 'Under ₹3,500 / night', 
    desc: 'Cozy guest houses, homestays, and budget cottages.' 
  },
  { 
    tier: 'standard', 
    icon: Heart, 
    label: 'Standard Boutique', 
    range: '₹3,500 – ₹7,000 / night', 
    desc: 'Charming boutique stays, heritage suites, and view villas.' 
  },
  { 
    tier: 'premium', 
    icon: Crown, 
    label: 'Luxury Premium', 
    range: 'Above ₹7,000 / night', 
    desc: 'Premium resorts, villas, and exclusive retreats.' 
  },
];

export default function StepPropertyTier({ state, update, onNext, onBack }: StepPropertyTierProps) {
  const selectedTier = state.tier || 'standard';

  const handleSelect = (tier: PropertyTier) => {
    update({ tier });
  };

  const handleContinue = () => {
    update({ tier: selectedTier });
    onNext();
  };

  return (
    <div className="space-y-8 max-w-md mx-auto text-zinc-800">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B3B2B]/5 text-[#0B3B2B] text-xs font-bold uppercase tracking-wider font-mono">
          <Sparkles size={12} className="text-[#C5A059]" /> Step 3: Accommodation Tier
        </div>
        <h2 className="text-3xl font-playfair font-bold text-[#0B3B2B] tracking-tight">Stay Class</h2>
        <p className="text-zinc-500 text-sm font-light leading-relaxed">
          Select the property tier that best matches your target comfort and style level.
        </p>
      </div>

      <div className="flex flex-col gap-3 text-left">
        {TIER_CARDS.map(({ tier, icon: Icon, label, range, desc }) => {
          const isSelected = selectedTier === tier;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => handleSelect(tier)}
              className={`flex gap-4 p-5 rounded-2xl border transition-all text-left ${
                isSelected
                  ? 'bg-[#0B3B2B]/5 border-[#0B3B2B] ring-1 ring-[#0B3B2B]/10'
                  : 'bg-white border-zinc-150 hover:border-zinc-350 hover:bg-zinc-50/50'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-[#0B3B2B] text-white' : 'bg-zinc-100 text-zinc-500'
              }`}>
                <Icon size={18} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-baseline">
                  <p className={`text-sm font-bold font-plus-jakarta ${isSelected ? 'text-[#0B3B2B]' : 'text-zinc-800'}`}>
                    {label}
                  </p>
                  <span className="text-[10px] font-bold text-[#C5A059] font-mono">{range}</span>
                </div>
                <p className="text-xs text-zinc-500 font-light mt-1 leading-relaxed">{desc}</p>
              </div>
            </button>
          );
        })}
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
          onClick={handleContinue}
          className="flex-1 h-13 bg-[#0B3B2B] hover:bg-[#115C43] text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#0B3B2B]/5 active:scale-98"
        >
          Continue <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
