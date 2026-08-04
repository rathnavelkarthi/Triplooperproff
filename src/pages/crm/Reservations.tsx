import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, ChevronDown, MoreVertical, X, LogOut, FileText, Printer, AlertOctagon, Star } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useCRM, Reservation } from '../../context/CRMDataContext';
import { useAuth } from '../../context/AuthContext';
import InvoicePrintTemplate, { InvoiceData } from '../../components/crm/InvoicePrintTemplate';
import BookingModal from '../../components/crm/BookingModal';
import { printInvoice } from '../../components/crm/invoiceUtils';
import { usePlanLimits } from '../../lib/planLimits';
import UpgradeModal from '../../components/crm/UpgradeModal';
import { supabase } from '../../lib/supabaseClient';

type StatusFilter = 'All' | 'Confirmed' | 'Checked In' | 'Checked Out' | 'Pending' | 'Cancelled' | 'No Show';

export default function Reservations() {
  const { reservations, rooms, deleteReservation, checkInGuest, checkOutGuest, cmsSettings, updateReservation } = useCRM();
  const { tenant } = useAuth();
  const { canAdd, limitFor, currentCount, plan } = usePlanLimits();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [billRes, setBillRes] = useState<Reservation | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (action === 'new') {
      setIsModalOpen(true);
      setEditingReservationId(null);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    } else if (id) {
      setEditingReservationId(id);
      setIsModalOpen(true);
      searchParams.delete('id');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);


  const filteredReservations = useMemo(() => {
    return reservations
      .filter(res => {
        const matchesSearch =
          res.guest.toLowerCase().includes(searchTerm.toLowerCase()) ||
          res.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          res.room.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || res.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [reservations, searchTerm, statusFilter]);

  // Count reservations by status for the filter tabs
  const statusCounts = useMemo(() => {
    const counts = { All: reservations.length, Confirmed: 0, 'Checked In': 0, 'Checked Out': 0, Pending: 0, Cancelled: 0, 'No Show': 0 };
    reservations.forEach(r => {
      if (r.status in counts) counts[r.status as keyof typeof counts]++;
    });
    return counts;
  }, [reservations]);

  const buildInvoiceData = (res: Reservation): InvoiceData => {
    const checkIn = new Date(res.checkIn);
    const checkOut = new Date(res.checkOut);
    const nights = Math.max(1, Math.floor((checkOut.getTime() - checkIn.getTime()) / 86400000));
    const roomPrice = res.amount || 5000;
    const discount = (res as any).discount ?? 0;
    const taxableValue = Math.max(0, roomPrice - discount);
    const gst = res.gst_amount || Math.round(taxableValue * 0.12);
    const total = taxableValue + gst;
    const ratePerNight = nights > 0 ? Math.round(roomPrice / nights) : roomPrice;
    const commissionAmount = Math.round(taxableValue * 0.12);
    const amountPayableToProperty = total - commissionAmount;

    return {
      invoiceNumber: `INV-${res.id.replace('RES-', '')}`,
      date: new Date().toLocaleDateString('en-GB'),
      guestName: res.guest,
      guestPhone: res.guest_phone,
      guestEmail: res.guest_email,
      guestLocation: res.guest_location,
      bookingId: res.id,
      room: res.room,
      checkIn: res.checkIn,
      checkOut: res.checkOut,
      nights,
      ratePerNight,
      subtotal: taxableValue,
      roomPrice,
      discount,
      taxableValue,
      gstAmount: gst,
      totalAmount: total,
      commissionAmount,
      amountPayableToProperty,
      paymentMethod: res.payment_method || 'UPI',
      paymentStatus: res.payment,
      hotelName: cmsSettings?.hotelName || tenant?.business_name || 'Our Resort',
      hotelAddress: cmsSettings?.contactAddress || 'Hotel Address',
      hotelEmail: cmsSettings?.contactEmail || tenant?.custom_email || 'contact@hotel.com',
      hotelPhone: cmsSettings?.contactPhone || tenant?.contact_phone || '+91 0000 0000'
    };
  };

  const handleCheckout = async (res: Reservation) => {
    if (!window.confirm(`Check out ${res.guest} from ${res.room}?`)) return;
    await checkOutGuest(res.id, res.room_id);
    setActiveMenuId(null);
  };

  const handleCheckIn = async (res: Reservation) => {
    if (!window.confirm(`Check in ${res.guest} to ${res.room}?`)) return;
    await checkInGuest(res.id, res.room_id);
    setActiveMenuId(null);
  };

  const handleCheckoutAndBill = async (res: Reservation) => {
    setActiveMenuId(null);
    setBillRes(res);
    // The bill modal handles the rest
  };

  const handleGenerateBill = (res: Reservation) => {
    setActiveMenuId(null);
    setBillRes(res);
  };

  const handlePrintBill = () => {
    if (!billRes) return;
    const data = buildInvoiceData(billRes);
    printInvoice(data);
  };

  const handleCheckoutAndPrint = async () => {
    if (!billRes) return;
    const data = buildInvoiceData(billRes);
    printInvoice(data);
    await checkOutGuest(billRes.id, billRes.room_id);
    setBillRes(null);
  };


  const openEditModal = (res: Reservation) => {
    setEditingReservationId(res.id);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  // --- No Show ---
  const handleMarkNoShow = async (res: Reservation) => {
    const hoursUntilCheckIn = (new Date(res.checkIn).getTime() - Date.now()) / (1000 * 60 * 60);
    const refundMsg = hoursUntilCheckIn > 24
      ? 'Guest can request a manual refund since check-in is more than 24 hours away.'
      : 'No refund applies — cancellation is within 24 hours of check-in.';
    if (!window.confirm(`Mark "${res.guest}" as No Show?\n\n${refundMsg}`)) return;
    await updateReservation(res.id, { status: 'No Show' });
    if (res.room_id) {
      // Free the room back to available
      await supabase.from('rooms').update({ status: 'Available' }).eq('id', res.room_id);
    }
    setActiveMenuId(null);
  };

  // --- Guest Review (3-day window post checkout) ---
  const [reviewRes, setReviewRes] = useState<Reservation | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const canAddReview = (res: Reservation) => {
    if (res.status !== 'Checked Out') return false;
    const daysSinceCheckout = (Date.now() - new Date(res.checkOut).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCheckout <= 3;
  };

  const handleSaveReview = async () => {
    if (!reviewRes) return;
    setSavingReview(true);
    await updateReservation(reviewRes.id, {
      guest_review_note: reviewNote,
      guest_review_date: new Date().toISOString().split('T')[0]
    });
    setSavingReview(false);
    setReviewRes(null);
    setReviewNote('');
  };

  const statusTabs: StatusFilter[] = ['All', 'Confirmed', 'Checked In', 'Pending', 'Checked Out', 'Cancelled', 'No Show'];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-emerald-100 text-emerald-800';
      case 'Checked In': return 'bg-amber-100 text-amber-800';
      case 'Checked Out': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'No Show': return 'bg-gray-800 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const invoiceData = billRes ? buildInvoiceData(billRes) : null;

  return (
    <div className="max-w-7xl mx-auto relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Reservations</h1>
          <p className="text-gray-500 mt-1">Manage bookings, check-ins, and check-outs.</p>
        </div>
        <button
          onClick={() => canAdd('reservations') ? setIsModalOpen(true) : setShowUpgrade(true)}
          className="flex items-center gap-2 bg-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-800)] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Booking
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Status Filter Tabs */}
        <div className="px-4 pt-4 pb-0 border-b border-gray-100 bg-gray-50 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {statusTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all border-b-2 ${statusFilter === tab
                  ? 'bg-white text-[var(--color-ocean-900)] border-[#C9A646] shadow-sm'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {tab}
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === tab ? 'bg-[#C9A646]/10 text-[#C9A646]' : 'bg-gray-200 text-gray-500'
                  }`}>
                  {statusCounts[tab]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white">
          <div className="relative w-full sm:w-96">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, Guest Name or Room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm w-full sm:w-auto justify-center">
              <Filter size={16} />
              Filters
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm w-full sm:w-auto justify-center">
              Export
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-semibold">Booking ID</th>
                <th className="p-4 font-semibold">Guest Name</th>
                <th className="p-4 font-semibold">Room</th>
                <th className="p-4 font-semibold">Dates</th>
                <th className="p-4 font-semibold">Source</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Payment</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50">
              {filteredReservations.length > 0 ? (
                filteredReservations.map((res) => (
                  <tr key={res.id} className={`hover:bg-gray-50 transition-colors group ${res.status === 'Checked Out' ? 'opacity-70' : ''
                    }`}>
                    <td className="p-4 font-medium text-gray-900">{res.id}</td>
                    <td className="p-4 font-semibold text-[var(--color-ocean-900)]">{res.guest}</td>
                    <td className="p-4 text-gray-600">
                      {(() => {
                        const linkedRoom = res.room_id ? rooms.find(r => r.id === res.room_id) : null;
                        if (linkedRoom) return `Room ${linkedRoom.room_number} (${linkedRoom.type})`;
                        return res.room || '—';
                      })()}
                    </td>
                    <td className="p-4 text-gray-600">
                      <div className="flex flex-col">
                        <span>{res.checkIn}</span>
                        <span className="text-xs text-gray-400">to {res.checkOut}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${res.source === 'Direct' ? 'bg-slate-100 text-slate-700' :
                        res.source === 'Website' ? 'bg-[var(--color-ocean-100)] text-[var(--color-ocean-800)]' :
                          res.source === 'Booking.com' ? 'bg-[#003580]/10 text-[#003580]' :
                            res.source === 'Agoda' ? 'bg-[#5392f9]/10 text-[#5392f9]' :
                              res.source === 'MakeMyTrip' ? 'bg-[#ffedb3] text-[#d63200]' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {res.source}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusStyle(res.status)}`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${res.payment === 'Paid' ? 'bg-green-100 text-green-800' :
                        res.payment === 'Partial' ? 'bg-orange-100 text-orange-800' :
                          res.payment === 'Refunded' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {res.payment}
                      </span>
                    </td>
                    <td className={`p-4 text-right relative ${activeMenuId === res.id ? 'z-50' : ''}`}>
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === res.id ? null : res.id)}
                        className="p-1.5 text-gray-400 hover:text-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-50)] rounded-lg transition-colors"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {activeMenuId === res.id && (
                        <div className="absolute right-8 top-10 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden animate-in fade-in slide-in-from-top-2 text-left">
                          <button
                            onClick={() => openEditModal(res)}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <MoreVertical size={14} className="text-gray-400" />
                            Edit Booking
                          </button>

                          {res.status === 'Confirmed' && (
                            <>
                              <div className="border-t border-gray-100" />
                              <button
                                onClick={() => handleCheckIn(res)}
                                className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-ocean-800)] hover:bg-[var(--color-ocean-50)] transition-colors flex items-center gap-2 font-medium"
                              >
                                <LogOut size={14} className="text-[#C9A646] rotate-180" />
                                Check In
                              </button>
                            </>
                          )}

                          {(res.status === 'Confirmed' || res.status === 'Checked In') && (
                            <>
                              <div className="border-t border-gray-100" />
                              <button
                                onClick={() => handleCheckout(res)}
                                className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-ocean-800)] hover:bg-[var(--color-ocean-50)] transition-colors flex items-center gap-2 font-medium"
                              >
                                <LogOut size={14} className="text-[#C9A646]" />
                                Check Out
                              </button>
                              <button
                                onClick={() => handleCheckoutAndBill(res)}
                                className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-ocean-800)] hover:bg-[var(--color-ocean-50)] transition-colors flex items-center gap-2 font-medium"
                              >
                                <Printer size={14} className="text-[#C9A646]" />
                                Check Out & Print Bill
                              </button>
                            </>
                          )}

                          <div className="border-t border-gray-100" />
                          <button
                            onClick={() => handleGenerateBill(res)}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <FileText size={14} className="text-gray-400" />
                            Generate Bill
                          </button>

                          {/* No Show action */}
                          {(res.status === 'Confirmed' || res.status === 'Pending') && (
                            <>
                              <div className="border-t border-gray-100" />
                              <button
                                onClick={() => handleMarkNoShow(res)}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
                              >
                                <AlertOctagon size={14} />
                                Mark as No Show
                              </button>
                            </>
                          )}

                          {/* Guest review (3-day window post checkout) */}
                          {canAddReview(res) && (
                            <>
                              <div className="border-t border-gray-100" />
                              <button
                                onClick={() => { setReviewRes(res); setReviewNote(res.guest_review_note || ''); setActiveMenuId(null); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-ocean-800)] hover:bg-[var(--color-ocean-50)] transition-colors flex items-center gap-2 font-medium"
                              >
                                <Star size={14} className="text-[#C9A646]" />
                                {res.guest_review_note ? 'Edit Guest Review' : 'Add Guest Review'}
                              </button>
                            </>
                          )}

                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={() => {
                              if (window.confirm('Remove this booking permanently?')) {
                                deleteReservation(res.id);
                              }
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium flex items-center gap-2"
                          >
                            <X size={14} />
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    {searchTerm || statusFilter !== 'All'
                      ? `No reservations match your filters.`
                      : 'No reservations yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 text-sm text-gray-500">
          <span>Showing {filteredReservations.length} of {reservations.length} entries</span>
        </div>
      </div>

      {/* Bill/Invoice Preview Modal */}
      {billRes && invoiceData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-50 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-2xl sticky top-0 z-10">
              <div>
                <h2 className="font-serif text-xl font-bold text-gray-900">Invoice Preview</h2>
                <p className="text-xs text-gray-500 mt-0.5">{billRes.id} -- {billRes.guest}</p>
              </div>
              <button
                onClick={() => setBillRes(null)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex justify-center">
              <InvoicePrintTemplate data={invoiceData} />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setBillRes(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              {billRes.status === 'Confirmed' && (
                <button
                  onClick={handleCheckoutAndPrint}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0E2A38] text-white font-semibold hover:bg-[#091b24] transition-colors shadow-sm"
                >
                  <LogOut size={16} />
                  Check Out & Print
                </button>
              )}
              <button
                onClick={handlePrintBill}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#C9A646] text-[#0E2A38] font-semibold hover:bg-[#b8953e] transition-colors shadow-sm"
              >
                <Printer size={16} />
                Download & Print
              </button>
            </div>
          </div>
        </div>
      )}

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReservationId(null);
        }}
        reservationId={editingReservationId}
      />
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} resource="reservations this month" plan={plan} currentCount={currentCount('reservations')} limit={limitFor('reservations')} />

      {/* Guest Review Modal */}
      {reviewRes && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="font-serif text-lg font-bold text-gray-900">Guest Review</h2>
                <p className="text-xs text-gray-500 mt-0.5">{reviewRes.guest} — {reviewRes.room}</p>
              </div>
              <button onClick={() => setReviewRes(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                <Star size={12} className="inline mr-1.5 text-amber-500" />
                This review is private and visible only to your staff. You have 3 days after checkout to add or edit this review.
              </div>
              <textarea
                rows={5}
                maxLength={500}
                placeholder="Describe the guest's behavior, room condition on departure, any issues, or special notes..."
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
              />
              <p className="text-xs text-gray-400 text-right">{reviewNote.length}/500</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setReviewRes(null)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleSaveReview} disabled={savingReview} className="px-5 py-2 rounded-xl bg-[#0E2A38] text-white text-sm font-semibold hover:bg-[#091b24] transition-colors disabled:opacity-50">
                  {savingReview ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
