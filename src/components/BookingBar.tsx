import { useState } from 'react';
import { Calendar, Users, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import posthog from 'posthog-js';

export default function BookingBar() {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2 Adults, 0 Children');
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const navigate = useNavigate();

  const handleCheckAvailability = () => {
    const params = new URLSearchParams();
    if (checkIn) params.append('checkIn', checkIn);
    if (checkOut) params.append('checkOut', checkOut);
    // Parse simple guest count for the booking page
    const guestCount = parseInt(guests.split(' ')[0], 10) || 2;
    params.append('guests', guestCount.toString());

    posthog.capture('availability_checked', {
      check_in: checkIn || null,
      check_out: checkOut || null,
      guests: guestCount,
    });

    navigate(`/book?${params.toString()}`);
  };

  return (
    <div className="bg-white/95 backdrop-blur-2xl rounded-default shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 md:p-8 border border-white/40 relative z-50">
      <form className="flex flex-col md:flex-row gap-6 items-end">

        {/* Check-in */}
        <div className="w-full md:w-[28%] flex flex-col gap-2">
          <label className="text-[13px] font-semibold text-foreground/70 uppercase tracking-widest pl-1">Check-in</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/60">
              <Calendar size={18} />
            </div>
            <input
              type="date"
              className="w-full pl-11 pr-4 py-3.5 bg-muted/50 border border-secondary rounded-default text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-300 font-medium text-[15px]"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>
        </div>

        {/* Check-out */}
        <div className="w-full md:w-[28%] flex flex-col gap-2">
          <label className="text-[13px] font-semibold text-foreground/70 uppercase tracking-widest pl-1">Check-out</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/60">
              <Calendar size={18} />
            </div>
            <input
              type="date"
              className="w-full pl-11 pr-4 py-3.5 bg-muted/50 border border-secondary rounded-default text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-300 font-medium text-[15px]"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
        </div>

        {/* Guests */}
        <div className="w-full md:w-[28%] flex flex-col gap-2 relative">
          <label className="text-[13px] font-semibold text-foreground/70 uppercase tracking-widest pl-1">Guests</label>
          <div
            className="relative cursor-pointer group"
            onClick={() => setIsGuestOpen(!isGuestOpen)}
          >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/60 group-hover:text-primary transition-colors">
              <Users size={18} />
            </div>
            <div className="w-full pl-11 pr-10 py-3.5 bg-muted/50 border border-secondary rounded-default text-foreground flex items-center justify-between group-hover:border-primary/50 transition-all duration-300 font-medium text-[15px]">
              <span className="truncate">{guests}</span>
              <ChevronDown size={18} className={`text-foreground/40 transition-transform duration-300 ${isGuestOpen ? 'rotate-180 text-primary' : ''}`} />
            </div>
          </div>

          {/* Simple Dropdown Mockup */}
          <AnimatePresence>
            {isGuestOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-[calc(100%+8px)] left-0 right-0 bg-background border border-secondary/80 rounded-default shadow-xl p-5 z-50"
              >
                <div className="flex justify-between items-center mb-5">
                  <span className="font-medium text-foreground">Adults</span>
                  <div className="flex items-center gap-4">
                    <button type="button" className="w-8 h-8 rounded-full border border-secondary flex items-center justify-center hover:bg-muted text-foreground transition-colors">-</button>
                    <span className="font-medium w-4 text-center">2</span>
                    <button type="button" className="w-8 h-8 rounded-full border border-secondary flex items-center justify-center hover:bg-muted text-foreground transition-colors">+</button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Children</span>
                  <div className="flex items-center gap-4">
                    <button type="button" className="w-8 h-8 rounded-full border border-secondary flex items-center justify-center hover:bg-muted text-foreground transition-colors">-</button>
                    <span className="font-medium w-4 text-center">0</span>
                    <button type="button" className="w-8 h-8 rounded-full border border-secondary flex items-center justify-center hover:bg-muted text-foreground transition-colors">+</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Button */}
        <div className="w-full md:w-[16%] flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCheckAvailability}
            className="w-full py-3.5 bg-primary text-primary-foreground font-medium rounded-default shadow-md hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 uppercase tracking-widest text-[13px] h-[52px]"
          >
            Check
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-[11px] font-semibold text-primary/80 tracking-[0.2em] uppercase">
          Best Price Guarantee for Direct Booking
        </p>
      </div>
    </div>
  );
}
