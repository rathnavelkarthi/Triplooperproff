import { useState, useMemo } from 'react';
import { Search, Download, CheckCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useCRM } from '../../context/CRMDataContext';
import { useAuth } from '../../context/AuthContext';
import { printInvoice } from '../../components/crm/invoiceUtils';
import { InvoiceData } from '../../components/crm/InvoicePrintTemplate';

export default function Payments() {
  const { reservations, cmsSettings, updateReservation } = useCRM();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleMarkPaid = async (bookingId: string) => {
    setBusyId(bookingId);
    try {
      await updateReservation(bookingId, { payment: 'Paid' });
      toast.success('Payment marked as paid');
    } catch (e: any) {
      toast.error('Failed to update payment: ' + e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRefund = async (bookingId: string) => {
    if (!window.confirm('Refund this payment? This marks the reservation as refunded.')) return;
    setBusyId(bookingId);
    try {
      await updateReservation(bookingId, { payment: 'Refunded' });
      toast.success('Payment refunded');
    } catch (e: any) {
      toast.error('Failed to refund: ' + e.message);
    } finally {
      setBusyId(null);
    }
  };
  const { tenant } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const derivedPayments = useMemo(() => {
    return reservations.map(res => ({
      id: `PAY-${res.id.split('-')[1] || res.id}`,
      bookingId: res.id,
      guest: res.guest,
      amount: res.amount || 0,
      method: res.payment_method || 'UPI',
      status: res.payment,
      date: res.payment_date ? new Date(res.payment_date).toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : res.checkIn
    })).filter(pay =>
      pay.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pay.guest.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pay.bookingId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reservations, searchTerm]);

  const handleDownload = (payment: any) => {
    const res = reservations.find(r => r.id === payment.bookingId);
    if (!res) return;

    const checkIn = new Date(res.checkIn);
    const checkOut = new Date(res.checkOut);
    const nights = Math.max(1, Math.floor((checkOut.getTime() - checkIn.getTime()) / 86400000));
    const subtotal = res.amount || 0;
    const gst = res.gst_amount || Math.round(subtotal * 0.12);
    const total = subtotal + gst;
    const ratePerNight = nights > 0 ? Math.round(subtotal / nights) : subtotal;

    const data: InvoiceData = {
      invoiceNumber: payment.id.replace('PAY-', 'INV-'),
      date: payment.date?.split(',')[0] || res.checkIn,
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
      subtotal,
      gstAmount: gst,
      totalAmount: total,
      paymentMethod: res.payment_method || 'UPI',
      paymentStatus: res.payment,
      hotelName: cmsSettings?.hotelName || tenant?.business_name || 'Our Resort',
      hotelAddress: cmsSettings?.contactAddress || 'Hotel Address',
      hotelEmail: cmsSettings?.contactEmail || tenant?.custom_email || 'contact@hotel.com',
      hotelPhone: cmsSettings?.contactPhone || tenant?.contact_phone || '+91 0000 0000',
    };

    printInvoice(data);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">Track transactions, refunds, and payment statuses.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
          <div className="relative w-full sm:w-96">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Payment ID, Guest, or Booking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-semibold">Payment ID</th>
                <th className="p-4 font-semibold">Booking ID</th>
                <th className="p-4 font-semibold">Guest Name</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Method</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50">
              {derivedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="p-4 font-medium text-gray-900">{payment.id}</td>
                  <td className="p-4 text-[var(--color-ocean-600)] font-medium hover:underline cursor-pointer">{payment.bookingId}</td>
                  <td className="p-4 font-semibold text-gray-900">{payment.guest}</td>
                  <td className="p-4 font-bold text-gray-900">₹{payment.amount.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-gray-600">{payment.method}</td>
                  <td className="p-4 text-gray-600">{payment.date}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${payment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      payment.status === 'Refunded' ? 'bg-gray-100 text-gray-600' :
                      (payment.status === 'Unpaid' || payment.status === 'Partial') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(payment.status === 'Unpaid' || payment.status === 'Partial') && (
                        <button onClick={() => handleMarkPaid(payment.bookingId)} disabled={busyId === payment.bookingId} aria-label={`Mark ${payment.id} as paid`} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50" title="Mark as Paid">
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {payment.status === 'Paid' && (
                        <button onClick={() => handleRefund(payment.bookingId)} disabled={busyId === payment.bookingId} aria-label={`Refund ${payment.id}`} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50" title="Refund">
                          <RotateCcw size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(payment)}
                        aria-label={`Download invoice ${payment.id}`}
                        className="p-1.5 text-gray-400 hover:text-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-50)] rounded-lg transition-colors"
                        title="Download Invoice"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {derivedPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-400">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
