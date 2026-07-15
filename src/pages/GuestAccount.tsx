import { useState } from 'react';
import { LogOut, FileText, Printer, X, Calendar, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import InvoicePrintTemplate, { InvoiceData } from '../components/crm/InvoicePrintTemplate';
import { printInvoice } from '../components/crm/invoiceUtils';
import OtpGate from '../components/guest/OtpGate';

type StayRecord = {
  id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  room_type: string;
  status: string;
  payment_status: string;
  amount: number | null;
  gst_amount: number | null;
  payment_method: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  guest_location: string | null;
  tenant_id: string;
  business_name?: string;
};

function buildInvoice(stay: StayRecord): InvoiceData {
  const nights = Math.max(1, Math.floor((new Date(stay.check_out).getTime() - new Date(stay.check_in).getTime()) / 86400000));
  const subtotal = stay.amount || 0;
  const gst = stay.gst_amount || Math.round(subtotal * 0.12);
  return {
    invoiceNumber: `INV-${stay.id.replace('RES-', '')}`,
    date: new Date().toLocaleDateString('en-GB'),
    guestName: stay.guest_name,
    guestPhone: stay.guest_phone || '',
    guestEmail: stay.guest_email || '',
    guestLocation: stay.guest_location || '',
    bookingId: stay.id,
    room: stay.room_type,
    checkIn: stay.check_in,
    checkOut: stay.check_out,
    nights,
    ratePerNight: nights > 0 ? Math.round(subtotal / nights) : subtotal,
    subtotal,
    gstAmount: gst,
    totalAmount: subtotal + gst,
    paymentMethod: stay.payment_method || 'UPI',
    paymentStatus: stay.payment_status === 'PAID' ? 'Paid' : 'Unpaid',
    hotelName: stay.business_name || 'Property',
    hotelAddress: '',
    hotelEmail: '',
    hotelPhone: '',
  };
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const cls: Record<string, string> = {
    CONFIRMED: 'bg-emerald-100 text-emerald-700',
    CHECKED_IN: 'bg-amber-100 text-amber-700',
    CHECKED_OUT: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700',
    NO_SHOW: 'bg-gray-800 text-white',
    PENDING: 'bg-yellow-100 text-yellow-700',
  };
  const lbl: Record<string, string> = {
    CONFIRMED: 'Confirmed', CHECKED_IN: 'Checked In', CHECKED_OUT: 'Checked Out',
    CANCELLED: 'Cancelled', NO_SHOW: 'No Show', PENDING: 'Pending',
  };
  return <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${cls[s] || 'bg-gray-100 text-gray-600'}`}>{lbl[s] || status}</span>;
}

export default function GuestAccount() {
  const [stays, setStays] = useState<StayRecord[] | null>(null);
  const [guestName, setGuestName] = useState('');
  const [viewInvoice, setViewInvoice] = useState<StayRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  // OTP verify returns bookings already enriched with business_name via the
  // guest_stays_for_phone RPC — no client-side reservations query needed.
  const handleVerified = ({ stays: verified }: { stays?: unknown[] }) => {
    const list = (verified || []) as StayRecord[];
    const withName = list.map(s => ({ ...s, business_name: s.business_name || 'Property' }));
    setStays(withName);
    setGuestName(withName[0]?.guest_name || 'Guest');
  };

  const resetSearch = () => { setStays(null); setGuestName(''); };

  const filteredStays = (stays || []).filter(s => {
    if (filter === 'all') return true;
    const out = new Date(s.check_out) < new Date();
    return filter === 'past' ? out : !out;
  });

  const fmt = (d: string) => { try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; } };

  return (
    <div className="min-h-screen bg-[#FAFAF8] font-inter antialiased">
      <Helmet>
        <title>My Stays — Triplooper</title>
        <meta name="description" content="View all your Triplooper bookings and download invoices." />
      </Helmet>

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#FAFAF8]/90 backdrop-blur-xl border-b border-[#C9A646]/15 px-6 h-16 flex items-center justify-between">
        <a href="/" className="font-playfair text-xl font-black tracking-widest text-[#0E2A38]">TRIP<span className="text-[#C9A646]">LOOPER</span></a>
        {stays && (
          <button onClick={resetSearch} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0E2A38] transition-colors">
            <LogOut size={13} /> Log out
          </button>
        )}
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        {/* OTP gate */}
        {!stays && (
          <OtpGate
            purpose="my_stays"
            theme="light"
            title="My Stays"
            subtitle="Enter the WhatsApp number you booked with — we’ll send a one-time code to view all your stays."
            onVerified={handleVerified}
          />
        )}

        {/* Stays list */}
        {stays && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-playfair text-2xl font-bold text-[#0E2A38]">Welcome, {guestName.split(' ')[0]}</h1>
                <p className="text-sm text-gray-400 mt-0.5">{stays.length} booking{stays.length !== 1 ? 's' : ''} found</p>
              </div>
              <div className="flex items-center bg-white border border-gray-100 rounded-xl p-1 shadow-sm gap-1">
                {(['all', 'upcoming', 'past'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filter === f ? 'bg-[#0E2A38] text-white' : 'text-gray-400 hover:text-gray-700'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredStays.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <Calendar size={30} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">No {filter !== 'all' ? filter : ''} stays found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStays.map(stay => (
                  <div key={stay.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-[#0E2A38] flex items-center justify-center shrink-0">
                        <MapPin size={18} className="text-[#C9A646]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <p className="font-bold text-[#0E2A38] text-sm truncate">{stay.business_name}</p>
                          <StatusBadge status={stay.status} />
                        </div>
                        <p className="text-xs text-gray-400 truncate">{stay.room_type}</p>
                        <div className="flex flex-wrap gap-x-3 mt-1.5 text-xs text-gray-400">
                          <span>{fmt(stay.check_in)} → {fmt(stay.check_out)}</span>
                          <span>#{stay.id}</span>
                          {stay.amount ? <span className="font-semibold text-[#0E2A38]">₹{stay.amount.toLocaleString('en-IN')}</span> : null}
                        </div>
                      </div>
                      <button onClick={() => setViewInvoice(stay)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-[#C9A646]/5 hover:border-[#C9A646]/20 transition-all shrink-0">
                        <FileText size={13} /> Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Invoice modal */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-50 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-2xl">
              <div>
                <h2 className="font-serif text-xl font-bold text-gray-900">Invoice</h2>
                <p className="text-xs text-gray-500 mt-0.5">{viewInvoice.id} — {viewInvoice.business_name}</p>
              </div>
              <button onClick={() => setViewInvoice(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 flex justify-center">
              <InvoicePrintTemplate data={buildInvoice(viewInvoice)} />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setViewInvoice(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">Close</button>
              <button onClick={() => printInvoice(buildInvoice(viewInvoice))}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#C9A646] text-[#0E2A38] font-semibold text-sm hover:bg-[#b8953e] transition-colors shadow-sm">
                <Printer size={14} /> Download & Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
