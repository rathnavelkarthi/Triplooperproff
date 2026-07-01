import React, { useEffect, useState } from 'react';
import { MapPin, Sparkles } from 'lucide-react';
import { getDestinations } from '../../../lib/tripPlanner/properties';

interface StepDestinationProps {
  state: { destination?: string };
  update: (patch: any) => void;
  onNext: () => void;
}

export default function StepDestination({ state, update, onNext }: StepDestinationProps) {
  const [destinations, setDestinations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await getDestinations();
      setDestinations(list);
      setLoading(false);
    })();
  }, []);

  const handleSelect = (city: string) => {
    update({ destination: city });
    setTimeout(onNext, 300); // smooth advance
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-[#0B3B2B] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500 font-light font-plus-jakarta">Loading luxury destinations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-center max-w-md mx-auto">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B3B2B]/5 text-[#0B3B2B] text-xs font-bold uppercase tracking-wider font-mono">
          <Sparkles size={12} className="text-[#C5A059]" /> Step 1: Destination
        </div>
        <h2 className="text-3xl font-playfair font-bold text-[#0B3B2B] tracking-tight">Where are you heading?</h2>
        <p className="text-zinc-500 text-sm font-light leading-relaxed">
          Select a city to discover our handpicked boutique stays and curated local attractions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 text-left">
        {destinations.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => handleSelect(city)}
            className={`flex items-center gap-3.5 p-5 rounded-2xl border transition-all text-sm font-medium ${
              state.destination === city
                ? 'bg-[#0B3B2B]/5 border-[#0B3B2B] text-[#0B3B2B] shadow-sm'
                : 'bg-white border-zinc-150 text-zinc-700 hover:border-zinc-350 hover:bg-zinc-50/50'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              state.destination === city ? 'bg-[#0B3B2B] text-white' : 'bg-zinc-100 text-zinc-500'
            }`}>
              <MapPin size={16} />
            </div>
            <span className="font-plus-jakarta text-sm font-bold tracking-tight">{city}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => handleSelect('Anywhere')}
          className={`flex items-center gap-3.5 p-5 rounded-2xl border transition-all text-sm font-medium sm:col-span-2 ${
            state.destination === 'Anywhere'
              ? 'bg-[#0B3B2B]/5 border-[#0B3B2B] text-[#0B3B2B] shadow-sm'
              : 'bg-white border-zinc-150 text-zinc-700 hover:border-zinc-350 hover:bg-zinc-50/50'
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            state.destination === 'Anywhere' ? 'bg-[#0B3B2B] text-white' : 'bg-zinc-100 text-zinc-500'
          }`}>
            <Sparkles size={16} />
          </div>
          <div>
            <p className="font-plus-jakarta text-sm font-bold tracking-tight">Anywhere</p>
            <p className="text-[10px] text-zinc-400 font-light mt-0.5">Match across all available boutique stays</p>
          </div>
        </button>
      </div>
    </div>
  );
}
