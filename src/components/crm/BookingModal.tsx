import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, CreditCard, Zap, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { useCRM, Reservation } from '../../context/CRMDataContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId?: string | null;
}

export type SlotPackage = 'Full Stay' | '3-Hour Express' | '6-Hour Day Use' | '12-Hour Flex' | 'Custom Slot';

export interface SlotOption {
  id: SlotPackage;
  label: string;
  badge: string;
  desc: string;
  icon: string;
  defaultStart: string;
  defaultEnd: string;
  priceRatio: number;
}

export const SLOT_PACKAGES: SlotOption[] = [
  {
    id: 'Full Stay',
    label: 'Full Stay',
    badge: 'Overnight',
    desc: 'Standard 24h / Overnight stay',
    icon: '🏨',
    defaultStart: '12:00',
    defaultEnd: '11:00',
    priceRatio: 1.0,
  },
  {
    id: '3-Hour Express',
    label: '3-Hour Express',
    badge: 'Express',
    desc: 'Quick stop / 3h rest',
    icon: '⚡',
    defaultStart: '09:00',
    defaultEnd: '12:00',
    priceRatio: 0.35,
  },
  {
    id: '6-Hour Day Use',
    label: '6-Hour Day Use',
    badge: 'Daytime',
    desc: 'Daytime transit & business',
    icon: '☀️',
    defaultStart: '10:00',
    defaultEnd: '16:00',
    priceRatio: 0.60,
  },
  {
    id: '12-Hour Flex',
    label: '12-Hour Flex',
    badge: 'Half Day',
    desc: 'Extended daytime or night',
    icon: '🌙',
    defaultStart: '18:00',
    defaultEnd: '06:00',
    priceRatio: 0.80,
  },
  {
    id: 'Custom Slot',
    label: 'Custom Slot',
    badge: 'Flexible',
    desc: 'Custom check-in & check-out time',
    icon: '⏱️',
    defaultStart: '10:00',
    defaultEnd: '15:00',
    priceRatio: 0.50,
  },
];

export default function BookingModal({ isOpen, onClose, reservationId }: BookingModalProps) {
  const { rooms, reservations, addReservation, updateReservation } = useCRM();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    guest: '',
    guest_phone: '',
    guest_email: '',
    room: 'Executive Double AC',
    room_id: null as number | null,
    base_rate: '4000',
    checkIn: '',
    checkOut: '',
    slot_type: 'Full Stay' as SlotPackage,
    slot_start_time: '12:00',
    slot_end_time: '11:00',
    source: 'Direct',
    status: 'Pending' as 'Confirmed' | 'Checked In' | 'Pending' | 'Cancelled' | 'Checked Out',
    payment: 'Unpaid' as 'Paid' | 'Unpaid' | 'Partial' | 'Refunded',
    custom_price: '' as string,
  });

  useEffect(() => {
    if (reservationId && isOpen) {
      const res = reservations.find(r => r.id === reservationId);
      if (res) {
        const roomObj = rooms.find(r => r.id === res.room_id) || rooms.find(r => r.name === res.room);
        setFormData({
          guest: res.guest,
          guest_phone: res.guest_phone || '',
          guest_email: res.guest_email || '',
          room: res.room,
          room_id: res.room_id || null,
          base_rate: roomObj?.price_per_night ? String(roomObj.price_per_night) : '4000',
          checkIn: res.checkIn,
          checkOut: res.checkOut,
          slot_type: (res.slot_type as SlotPackage) || 'Full Stay',
          slot_start_time: res.slot_start_time || '12:00',
          slot_end_time: res.slot_end_time || '11:00',
          source: res.source,
          status: res.status,
          payment: res.payment,
          custom_price: res.amount ? String(res.amount) : '',
        });
      }
    } else if (!reservationId && isOpen) {
      // Reset form for new booking
      const firstRoom = rooms[0];
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      setFormData({
        guest: '',
        guest_phone: '',
        guest_email: '',
        room: firstRoom ? (firstRoom.room_number ? `Room ${firstRoom.room_number} - ${firstRoom.name}` : firstRoom.name) : 'Executive Double AC',
        room_id: firstRoom ? firstRoom.id : null,
        base_rate: firstRoom?.price_per_night ? String(firstRoom.price_per_night) : '4000',
        checkIn: today,
        checkOut: tomorrow,
        slot_type: 'Full Stay',
        slot_start_time: '12:00',
        slot_end_time: '11:00',
        source: 'Direct',
        status: 'Pending',
        payment: 'Unpaid',
        custom_price: '',
      });
    }
  }, [reservationId, isOpen, reservations, rooms]);

  const handleRoomChange = (roomIdStr: string) => {
    const roomId = roomIdStr ? parseInt(roomIdStr, 10) : null;
    const roomObj = rooms.find(r => r.id === roomId);
    if (roomObj) {
      setFormData(prev => ({
        ...prev,
        room: roomObj.room_number ? `Room ${roomObj.room_number} - ${roomObj.name}` : roomObj.name,
        room_id: roomObj.id,
        base_rate: roomObj.price_per_night ? String(roomObj.price_per_night) : prev.base_rate,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        room_id: null
      }));
    }
  };

  const handleSlotPackageSelect = (pkg: SlotOption) => {
    setFormData(prev => {
      // If it's a day slot, ensure checkOut defaults to same day unless overnight full stay
      const isSameDaySlot = pkg.id !== 'Full Stay';
      const checkOutDate = isSameDaySlot ? prev.checkIn : prev.checkOut;

      return {
        ...prev,
        slot_type: pkg.id,
        slot_start_time: pkg.defaultStart,
        slot_end_time: pkg.defaultEnd,
        checkOut: checkOutDate || prev.checkOut,
      };
    });
  };

  // Compute calculated amounts dynamically
  const selectedRoomObj = rooms.find(r => r.id === formData.room_id) || rooms[0];
  const effectiveDailyRate = Number(formData.base_rate) > 0 ? Number(formData.base_rate) : (selectedRoomObj?.price_per_night || 4000);
  const currentSlotPackage = SLOT_PACKAGES.find(p => p.id === formData.slot_type) || SLOT_PACKAGES[0];

  const calculatedAmount = (() => {
    if (formData.custom_price && !isNaN(Number(formData.custom_price)) && Number(formData.custom_price) > 0) {
      return Number(formData.custom_price);
    }
    const checkInDate = new Date(formData.checkIn || Date.now());
    const checkOutDate = new Date(formData.checkOut || Date.now());
    const nights = Math.max(1, Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / 86400000));
    
    if (formData.slot_type === 'Full Stay') {
      return effectiveDailyRate * nights;
    } else {
      return Math.round(effectiveDailyRate * currentSlotPackage.priceRatio);
    }
  })();

  const gstAmount = Math.round(calculatedAmount * 0.12);
  const totalAmount = calculatedAmount + gstAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guest || !formData.checkIn || !formData.checkOut) {
      alert("Please fill in all required fields (Guest Name, Check-in, Check-out).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        guest: formData.guest,
        guest_phone: formData.guest_phone || undefined,
        guest_email: formData.guest_email || undefined,
        room: formData.room,
        room_id: formData.room_id,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        slot_type: formData.slot_type,
        slot_start_time: formData.slot_start_time,
        slot_end_time: formData.slot_end_time,
        source: formData.source,
        status: formData.status,
        payment: formData.payment,
        amount: calculatedAmount,
        gst_amount: gstAmount,
      };

      if (reservationId) {
        await updateReservation(reservationId, payload);
      } else {
        await addReservation(payload);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save booking:', err);
      alert(err.message || 'Failed to save booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#0E2A38]">
              {reservationId ? 'Edit Manual Booking' : 'Add New Booking / Slot'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Book full overnight stay or predefined hourly slots with instant channel sync.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Real-time Aiosell & Channel Manager Sync Banner */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 px-6 py-2.5 border-b border-emerald-100/80 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold flex items-center gap-1">
              <Zap size={13} className="text-emerald-600 fill-emerald-500" />
              Real-Time Channel Manager & Aiosell Sync
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium bg-white/70 px-2 py-0.5 rounded-full border border-emerald-200/50">
            Auto-blocking OTA inventory
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(85vh-140px)] overflow-y-auto">
          
          {/* Guest & Room Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Guest Name *</label>
              <input
                type="text"
                required
                value={formData.guest}
                onChange={(e) => setFormData({ ...formData, guest: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:border-[#0E2A38] focus:bg-white focus:ring-2 focus:ring-[#0E2A38]/10 outline-none text-sm transition-all font-medium text-gray-900"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Assign Room *</label>
              <select
                value={formData.room_id || ''}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl font-medium focus:border-[#0E2A38] focus:bg-white focus:ring-2 focus:ring-[#0E2A38]/10 outline-none text-sm transition-all text-gray-900"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.room_number ? `Room ${r.room_number} - ${r.name}` : r.name} (₹{Number(r.price_per_night).toLocaleString('en-IN')}/night)
                  </option>
                ))}
                {rooms.length === 0 && <option value="">No rooms added yet</option>}
              </select>
            </div>
          </div>

          {/* Base Daily Rate & Rate Sync Indicator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-150">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Base Nightly Rate (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-gray-500 font-bold text-sm">₹</span>
                <input
                  type="number"
                  value={formData.base_rate}
                  onChange={(e) => setFormData({ ...formData, base_rate: e.target.value })}
                  className="w-full pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:border-[#0E2A38] focus:ring-2 focus:ring-[#0E2A38]/10 outline-none"
                  placeholder="4000"
                />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Channel & Slot Calculation</span>
              <p className="text-xs text-gray-600 mt-0.5">
                Hourly slot prices calculate automatically based on this base rate.
              </p>
            </div>
          </div>

          {/* Guest Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Phone Number (WhatsApp)</label>
              <input
                type="tel"
                value={formData.guest_phone}
                onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:border-[#0E2A38] focus:bg-white focus:ring-2 focus:ring-[#0E2A38]/10 outline-none text-sm transition-all text-gray-900"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Guest Email</label>
              <input
                type="email"
                value={formData.guest_email}
                onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:border-[#0E2A38] focus:bg-white focus:ring-2 focus:ring-[#0E2A38]/10 outline-none text-sm transition-all text-gray-900"
                placeholder="guest@example.com"
              />
            </div>
          </div>

          {/* Booking Slot Package Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Clock size={14} className="text-[#C9A646]" />
                Select Booking Slot / Stay Package
              </label>
              <span className="text-[11px] font-medium text-gray-400">Choose stay duration</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SLOT_PACKAGES.map((pkg) => {
                const isSelected = formData.slot_type === pkg.id;
                const pkgAmount = Math.round(effectiveDailyRate * pkg.priceRatio);
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => handleSlotPackageSelect(pkg)}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                      isSelected
                        ? 'bg-[#0E2A38] text-white border-[#0E2A38] shadow-md shadow-[#0E2A38]/10 ring-2 ring-[#C9A646]/40'
                        : 'bg-gray-50/70 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-base mb-1">
                        <span>{pkg.icon}</span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-600'
                        }`}>
                          {pkg.badge}
                        </span>
                      </div>
                      <p className="text-xs font-bold truncate leading-tight">{pkg.label}</p>
                      <p className={`text-[11px] font-extrabold mt-0.5 ${isSelected ? 'text-[#C9A646]' : 'text-gray-900'}`}>
                        ₹{pkgAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <p className={`text-[10px] mt-1.5 leading-tight line-clamp-1 ${
                      isSelected ? 'text-gray-300' : 'text-gray-400'
                    }`}>
                      {pkg.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dates and Time Slots */}
          <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Check-In Date *</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.checkIn}
                    onChange={(e) => {
                      const newCheckIn = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        checkIn: newCheckIn,
                        checkOut: prev.slot_type !== 'Full Stay' ? newCheckIn : (prev.checkOut < newCheckIn ? newCheckIn : prev.checkOut)
                      }));
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-[#0E2A38] focus:ring-2 focus:ring-[#0E2A38]/10 outline-none text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Check-Out Date *</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.checkOut}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-[#0E2A38] focus:ring-2 focus:ring-[#0E2A38]/10 outline-none text-sm font-medium transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Slot Hours Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200/60">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-[#C9A646]" />
                  Slot Start Time
                </label>
                <input
                  type="time"
                  value={formData.slot_start_time}
                  onChange={(e) => setFormData({ ...formData, slot_start_time: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:border-[#0E2A38] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                  <Clock size={12} className="text-[#C9A646]" />
                  Slot End Time
                </label>
                <input
                  type="time"
                  value={formData.slot_end_time}
                  onChange={(e) => setFormData({ ...formData, slot_end_time: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:border-[#0E2A38] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Booking Source, Status & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Booking Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl font-medium focus:border-[#0E2A38] focus:bg-white focus:ring-2 focus:ring-[#0E2A38]/10 outline-none text-sm transition-all"
              >
                <option value="Direct">Direct (Walk-in / Phone)</option>
                <option value="Website">Website Direct</option>
                <option value="Booking.com">Booking.com</option>
                <option value="Agoda">Agoda</option>
                <option value="MakeMyTrip">MakeMyTrip</option>
                <option value="Airbnb">Airbnb</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl font-medium focus:border-[#0E2A38] focus:bg-white focus:ring-2 focus:ring-[#0E2A38]/10 outline-none text-sm transition-all"
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Checked In">Checked In</option>
                <option value="Pending">Pending</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Payment</label>
              <select
                value={formData.payment}
                onChange={(e) => setFormData({ ...formData, payment: e.target.value as any })}
                className="w-full px-3.5 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl font-medium focus:border-[#0E2A38] focus:bg-white focus:ring-2 focus:ring-[#0E2A38]/10 outline-none text-sm transition-all"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Pricing & Summary Card */}
          <div className="bg-gradient-to-br from-[#0E2A38] to-[#1a445a] text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-widest text-[#C9A646]">
                    {formData.slot_type} ({formData.slot_start_time} - {formData.slot_end_time})
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5">
                  Base Rate: ₹{effectiveDailyRate.toLocaleString('en-IN')}/day &bull; Taxable: ₹{calculatedAmount.toLocaleString('en-IN')} &bull; GST (12%): ₹{gstAmount.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-white/10 sm:pl-5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block">Total Payable</span>
                <span className="text-2xl font-bold font-serif text-[#C9A646]">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Custom rate override option */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
              <span className="flex items-center gap-1.5 text-gray-300">
                <Tag size={13} className="text-[#C9A646]" /> Custom Rate Override (Optional):
              </span>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 font-medium">₹</span>
                <input
                  type="number"
                  placeholder={String(calculatedAmount)}
                  value={formData.custom_price}
                  onChange={(e) => setFormData({ ...formData, custom_price: e.target.value })}
                  className="w-24 px-2.5 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#C9A646]"
                />
              </div>
            </div>
          </div>

          {/* Aadhaar Verification Panel for existing booking */}
          {reservationId && (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard size={14} className="text-[#0E2A38]" />
                Guest Identity Verification (Aadhaar)
              </h3>
              
              {(() => {
                const selectedRes = reservations.find(r => r.id === reservationId);
                if (selectedRes?.aadhar_number) {
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-3 rounded-xl border border-gray-100 text-xs">
                        <div>
                          <span className="text-gray-400 font-medium block">Extracted Name</span>
                          <span className="font-semibold text-gray-900 mt-0.5 block">{selectedRes.aadhar_extracted_name || selectedRes.guest}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-medium block">Aadhaar Number</span>
                          <span className="font-semibold text-gray-900 mt-0.5 block">{selectedRes.aadhar_number}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-medium block">Extracted Age</span>
                          <span className="font-semibold text-gray-900 mt-0.5 block">{selectedRes.aadhar_extracted_age ? `${selectedRes.aadhar_extracted_age} years` : 'Verified'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-medium block">DOB</span>
                          <span className="font-semibold text-gray-900 mt-0.5 block">{selectedRes.aadhar_dob || '—'}</span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-gray-100 text-xs">
                        <span className="text-gray-400 font-medium block">Extracted Address</span>
                        <span className="font-semibold text-gray-900 mt-0.5 block leading-relaxed">{selectedRes.aadhar_extracted_address || '—'}</span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <p className="text-xs text-gray-500 bg-white p-4 rounded-xl border border-gray-100 text-center">
                      ⚠️ Verification pending. The guest has a portal magic link where they can upload their Aadhaar card.
                    </p>
                  );
                }
              })()}
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <p className="text-[11px] text-gray-400 hidden sm:block flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-600" />
              Pushes live updates to Aiosell instantly
            </p>
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0E2A38] hover:bg-[#1a445a] rounded-xl transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Syncing & Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{reservationId ? 'Update & Sync Booking' : 'Confirm & Sync Booking'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
