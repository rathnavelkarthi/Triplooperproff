import React, { useState } from 'react';
import { Sparkles, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TripPlannerWizard from './TripPlannerWizard';

export default function TripPlannerButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Glowing Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 bg-[#0B3B2B] hover:bg-[#115C43] text-white px-5 py-4 rounded-full border border-[#C5A059]/20 shadow-[0_10px_30px_rgba(11,59,43,0.3)] transition-all duration-300 font-bold text-xs uppercase tracking-wider font-mono hover:scale-105 active:scale-95 group cursor-pointer"
      >
        <div className="relative">
          <CalendarDays size={16} className="text-white shrink-0 group-hover:rotate-6 transition-transform" />
          <Sparkles size={9} className="absolute -top-1 -right-1 text-[#C5A059] animate-bounce" />
        </div>
        <span>Plan with AI</span>
      </button>

      {/* Full-Screen Wizard Overlay */}
      <AnimatePresence>
        {isOpen && (
          <TripPlannerWizard onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
