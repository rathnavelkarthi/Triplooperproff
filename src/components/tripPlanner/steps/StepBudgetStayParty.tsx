import React, { useState } from 'react';
import { Sparkles, Calendar, Users, IndianRupee, ArrowRight, ArrowLeft } from 'lucide-react';

interface StepBudgetStayPartyProps {
  state: { budget?: number; nights?: number; people?: number; startDate?: string };
  update: (patch: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const BUDGET_PRESETS = [10000, 25000, 50000, 100000];

export default function StepBudgetStayParty({ state, update, onNext, onBack }: StepBudgetStayPartyProps) {
  const [budget, setBudget] = useState(state.budget || 25000);
  const [nights, setNights] = useState(state.nights || 2);
  const [people, setPeople] = useState(state.people || 2);
  const [startDate, setStartDate] = useState(state.startDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update({ budget, nights, people, startDate });
    onNext();
  };

  return (
    <div className="space-y-8 max-w-md mx-auto text-zinc-800">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B3B2B]/5 text-[#0B3B2B] text-xs font-bold uppercase tracking-wider font-mono">
          <Sparkles size={12} className="text-[#C5A059]" /> Step 2: Plan Parameters
        </div>
        <h2 className="text-3xl font-playfair font-bold text-[#0B3B2B] tracking-tight">Stay Details</h2>
        <p className="text-zinc-500 text-sm font-light leading-relaxed">
          Configure your budget, trip length, and party size to build your custom itinerary.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-left">
        {/* Budget section */}
        <div className="space-y-3">
          <label className="block text-xs font-extrabold uppercase tracking-widest text-[#0B3B2B] font-mono">Total Budget (₹)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
              <IndianRupee size={15} />
            </div>
            <input
              type="number"
              min={1000}
              required
              value={budget}
              onChange={(e) => setBudget(Math.max(1000, Number(e.target.value)))}
              className="w-full h-13 bg-zinc-50 border border-zinc-150 rounded-2xl pl-10 pr-4 text-sm font-bold text-[#0B3B2B] placeholder-zinc-300 focus:bg-white focus:border-[#0B3B2B] outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {BUDGET_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBudget(p)}
                className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold tracking-tight transition-all font-mono ${
                  budget === p
                    ? 'bg-[#0B3B2B] text-white border-[#0B3B2B]'
                    : 'bg-white border-zinc-150 text-zinc-500 hover:border-zinc-300'
                }`}
              >
                ₹{(p / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        {/* Nights & Guests Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-extrabold uppercase tracking-widest text-[#0B3B2B] font-mono">Nights</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                <Calendar size={14} />
              </div>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={nights}
                onChange={(e) => setNights(Math.max(1, Math.min(10, Number(e.target.value))))}
                className="w-full h-13 bg-zinc-50 border border-zinc-150 rounded-2xl pl-10 pr-4 text-sm font-bold text-[#0B3B2B] outline-none focus:bg-white focus:border-[#0B3B2B] transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-extrabold uppercase tracking-widest text-[#0B3B2B] font-mono">Guests</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                <Users size={14} />
              </div>
              <input
                type="number"
                min={1}
                max={15}
                required
                value={people}
                onChange={(e) => setPeople(Math.max(1, Math.min(15, Number(e.target.value))))}
                className="w-full h-13 bg-zinc-50 border border-zinc-150 rounded-2xl pl-10 pr-4 text-sm font-bold text-[#0B3B2B] outline-none focus:bg-white focus:border-[#0B3B2B] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold uppercase tracking-widest text-[#0B3B2B] font-mono">Start Date</label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-13 bg-zinc-50 border border-zinc-150 rounded-2xl px-4 text-sm font-bold text-[#0B3B2B] outline-none focus:bg-white focus:border-[#0B3B2B] transition-all"
          />
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
            type="submit"
            className="flex-1 h-13 bg-[#0B3B2B] hover:bg-[#115C43] text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#0B3B2B]/5 active:scale-98"
          >
            Continue <ArrowRight size={13} />
          </button>
        </div>
      </form>
    </div>
  );
}
