import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { WizardState, TripPlan } from '../../lib/tripPlanner/types';
import { buildBudgetBreakdown, spreadItinerary } from '../../lib/tripPlanner/budgetEngine';
import { getAttractions } from '../../lib/tripPlanner/destinations';
import StepDestination from './steps/StepDestination';
import StepBudgetStayParty from './steps/StepBudgetStayParty';
import StepPropertyTier from './steps/StepPropertyTier';
import StepPropertyPick from './steps/StepPropertyPick';
import StepItineraryReview from './steps/StepItineraryReview';
import StepCheckout from './steps/StepCheckout';

const STEP_COUNT = 6;

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function TripPlannerWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({ startDate: tomorrowISO() });

  const update = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }));
  const next = () => setStep(s => Math.min(s + 1, STEP_COUNT - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const buildPlan = (): TripPlan | null => {
    if (!state.destination || !state.budget || !state.nights || !state.people || !state.tier || !state.property) return null;
    const budgetBreakdown = buildBudgetBreakdown(state.budget, state.property.nightlyRate, state.nights);
    const itinerary = spreadItinerary(getAttractions(state.property.city), state.nights);
    return {
      destination: state.destination, startDate: state.startDate || tomorrowISO(),
      nights: state.nights, people: state.people, tier: state.tier,
      property: state.property, budgetBreakdown, itinerary,
    };
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-white overflow-y-auto select-none" style={{ display: 'block' }}>
      <button 
        type="button"
        onClick={onClose} 
        aria-label="Close planner"
        className="fixed top-5 right-5 z-[100000] p-2.5 rounded-full bg-black/5 hover:bg-black/10 cursor-pointer transition-colors"
      >
        <X className="w-5 h-5 text-zinc-700" />
      </button>

      <div className="max-w-2xl mx-auto px-6 py-16 text-[#0A1612]">
        {/* Step Progress Indicators */}
        <div className="flex gap-2 mb-10 justify-center">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? 'w-8 bg-[#0B3B2B]' : 'w-4 bg-zinc-200'
              }`} 
            />
          ))}
        </div>

        {/* Wizard Steps */}
        <div className="transition-opacity duration-200">
          {step === 0 && <StepDestination state={state} update={update} onNext={next} />}
          {step === 1 && <StepBudgetStayParty state={state} update={update} onNext={next} onBack={back} />}
          {step === 2 && <StepPropertyTier state={state} update={update} onNext={next} onBack={back} />}
          {step === 3 && <StepPropertyPick state={state} update={update} onNext={next} onBack={back} />}
          {step === 4 && <StepItineraryReview plan={buildPlan()} update={update} onNext={next} onBack={back} />}
          {step === 5 && <StepCheckout plan={buildPlan()} onBack={back} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}
