import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, MapPin, CreditCard, LogOut, CheckCircle } from 'lucide-react';
import { useCRM, Reservation } from '../../context/CRMDataContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId?: string | null;
}

export default function BookingModal({ isOpen, onClose, reservationId }: BookingModalProps) {
  const { rooms, reservations, addReservation, updateReservation } = useCRM();
  
  const [formData, setFormData] = useState({
    guest: '',
    room: 'Executive Double AC',
    checkIn: '',
    checkOut: '',
    source: 'Direct',
    status: 'Pending' as 'Confirmed' | 'Checked In' | 'Pending' | 'Cancelled' | 'Checked Out',
    payment: 'Unpaid' as 'Paid' | 'Unpaid' | 'Partial' | 'Refunded',
  });

  useEffect(() => {
    if (reservationId && isOpen) {
      const res = reservations.find(r => r.id === reservationId);
      if (res) {
        setFormData({
          guest: res.guest,
          room: res.room,
          checkIn: res.checkIn,
          checkOut: res.checkOut,
          source: res.source,
          status: res.status,
          payment: res.payment,
        });
      }
    } else if (!reservationId && isOpen) {
        // Reset form for new booking
        setFormData({
            guest: '',
            room: rooms.length > 0 ? (rooms[0].room_number ? `Room ${rooms[0].room_number} - ${rooms[0].name}` : rooms[0].name) : 'Executive Double AC',
            checkIn: '',
            checkOut: '',
            source: 'Direct',
            status: 'Pending',
            payment: 'Unpaid',
        });
    }
  }, [reservationId, isOpen, reservations, rooms]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guest || !formData.checkIn || !formData.checkOut) {
      alert("Please fill in all required fields (Guest Name, Check-in, Check-out).");
      return;
    }

    if (reservationId) {
      updateReservation(reservationId, formData);
    } else {
      addReservation(formData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="font-serif text-2xl font-bold text-gray-900">
            {reservationId ? 'Edit Booking' : 'Add New Booking'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Guest Name</label>
              <input
                type="text"
                required
                value={formData.guest}
                onChange={(e) => setFormData({ ...formData, guest: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Room</label>
              <select
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.room_number ? `Room ${r.room_number} - ${r.name}` : r.name}>
                    {r.room_number ? `Room ${r.room_number} - ${r.name}` : r.name}
                  </option>
                ))}
                {rooms.length === 0 && <option value="">No rooms added yet</option>}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Check-In Date</label>
              <input
                type="date"
                required
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Check-Out Date</label>
              <input
                type="date"
                required
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Booking Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
              >
                <option value="Direct">Direct (Walk-in/Phone)</option>
                <option value="Website">Website</option>
                <option value="Booking.com">Booking.com</option>
                <option value="Agoda">Agoda</option>
                <option value="MakeMyTrip">MakeMyTrip</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
              >
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Checked In">Checked In</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Payment</label>
              <select
                value={formData.payment}
                onChange={(e) => setFormData({ ...formData, payment: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Aadhaar Verification Panel */}
          {reservationId && (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard size={14} className="text-[var(--color-ocean-600)]" />
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

                      {selectedRes.aadhar_url && (
                        <div className="pt-1">
                          {selectedRes.aadhar_url.startsWith('data:') ? (
                            <div className="relative group max-w-xs overflow-hidden rounded-lg border border-gray-200">
                              <img src={selectedRes.aadhar_url} alt="Aadhaar Card" className="max-h-32 w-full object-cover" />
                              <a href={selectedRes.aadhar_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/45 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                                View Full Size
                              </a>
                            </div>
                          ) : (
                            <a href={selectedRes.aadhar_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--color-ocean-600)] hover:underline font-semibold">
                              Open Aadhaar Attachment
                            </a>
                          )}
                        </div>
                      )}
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

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-800)] rounded-xl transition-colors shadow-sm"
            >
              {reservationId ? 'Update Booking' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
