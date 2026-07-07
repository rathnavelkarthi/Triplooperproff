import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { History, Mail, ArrowRight, LogOut, FileText, Printer, X, Calendar, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import InvoicePrintTemplate, { InvoiceData } from '../components/crm/InvoicePrintTemplate';
import { printInvoice } from '../components/crm/invoiceUtils';

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
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [stays, setStays] = useState<StayRecord[] | null>(null);
  const [guestName, setGuestName] = useState('');
  const [viewInvoice, setViewInvoice] = useState<StayRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) { toast.error('Enter your email or phone number.'); return; }
    setLoading(true);
    try {
      let q = supabase
        .from('reservations')
        .select('id,guest_name,check_in,check_out,room_type,status,payment_status,amount,gst_amount,payment_method,guest_email,guest_phone,guest_location,tenant_id')
        .order('check_in', { ascending: false });

      if (email.trim() && phone.trim()) {
        q = q.or(`guest_email.ilike.${email.trim()},guest_phone.ilike.${phone.trim()}`);
      } else if (email.trim()) {
        q = q.ilike('guest_email', email.trim());
      } else {
        q = q.ilike('guest_phone', phone.trim());
      }

      const { data, error } = await q;
      if (error) throw error;
      if (!data?.length) { toast.error('No bookings found. Try a different email or phone.'); setLoading(false); return; }

      // Enrich with tenant names
      const tIds = [...new Set(data.map(r => r.tenant_id).filter(Boolean))];
      const { data: tData } = await supabase.from('tenants').select('id,business_name').in('id', tIds);
      const tMap: Record<string, string> = {};
      tData?.forEach(t => { tMap[t.id] = t.business_name; });

      const enriched = data.map(r => ({ ...r, business_name: tMap[r.tenant_id] || 'Property' }));
      setStays(enriched);
      setGuestName(enriched[0]?.guest_name || 'Guest');
    } catch { toast.error('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

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
          <button onClick={() => { setStays(null); setEmail(''); setPhone(''); }} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0E2A38] transition-colors">
            <LogOut size={13} /> Search again
          </button>
        )}
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        {/* Lookup form */}
        {!stays && (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-3xl bg-[#0E2A38] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#0E2A38]/15">
                <History size={26} className="text-[#C9A646]" />
              </div>
              <h1 className="font-playfair text-3xl font-bold text-[#0E2A38] mb-2">My Stays</h1>
              <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">Enter the email or phone number used when you booked to see all your stays.</p>
            </div>
            <form onSubmit={handleLookup} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
                    className="w-full pl-9 pr-4 h-12 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#C9A646] focus:ring-2 focus:ring-[#C9A646]/20 transition-all" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" /><span className="text-[10px] uppercase tracking-widest text-gray-400">or</span><div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210"
                  className="w-full px-4 h-12 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#C9A646] focus:ring-2 focus:ring-[#C9A646]/20 transition-all" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-12 bg-[#0E2A38] hover:bg-[#123545] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-[#0E2A38]/15 disabled:opacity-50 transition-all active:scale-[0.99]">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>View My Stays</span><ArrowRight size={14} className="text-[#C9A646]" /></>}
              </button>
              <p className="text-center text-xs text-gray-400">No account needed — just your booking details.</p>
            </form>
          </div>
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
