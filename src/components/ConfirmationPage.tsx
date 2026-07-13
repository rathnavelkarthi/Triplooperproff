import { motion } from 'motion/react';
import { CheckCircle, Calendar, Users, MapPin, Download, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { jsPDF } from "jspdf";
import { toPng } from 'html-to-image';
import posthog from 'posthog-js';
import { useCRM } from '../context/CRMDataContext';
import { useAuth } from '../context/AuthContext';

interface ConfirmationPageProps {
  bookingData: any;
}

export default function ConfirmationPage({ bookingData }: ConfirmationPageProps) {
  const { cmsSettings } = useCRM();
  const { tenant } = useAuth();
  const { room, checkIn, checkOut, guests, guestDetails } = bookingData;
  const bookingId = `BK-${Math.floor(100000 + Math.random() * 900000)}`;

  const hotelName = cmsSettings.hotelName || tenant?.business_name || 'Our Resort';
  const hotelAddress = cmsSettings.contactAddress || 'No. 2, Sai Baba Koil Street, Chinna Kalapet, Puducherry 605014';
  const hotelPhone = cmsSettings.contactPhone || '+91 8248981269';
  const hotelWhatsap = hotelPhone.replace(/\D/g, ''); // Clean number for WhatsApp link

  if (!room || !guestDetails?.fullName) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar size={32} className="text-gray-400" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-gray-900 mb-4">Session Expired</h2>
          <p className="text-gray-600 mb-8">
            We couldn't find your booking details. This usually happens if you refresh the page before completing the reservation.
          </p>
          <Link
            to="/book"
            onClick={() => window.location.reload()}
            className="inline-block px-8 py-3 bg-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-800)] text-white font-bold rounded-xl transition-colors"
          >
            Start New Booking
          </Link>
        </motion.div>
      </div>
    );
  }

  // Calculate nights
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const roomPrice = room ? room.price * nights : 0;
  const taxes = Math.round(roomPrice * 0.12);
  const total = roomPrice + taxes;

  useEffect(() => {
    posthog.capture('booking_completed', {
      booking_id: bookingId,
      room_name: room?.name,
      nights,
      total_amount: total,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDownloadInvoice = async () => {
    const element = document.getElementById('invoice-content');
    if (!element) return;

    posthog.capture('invoice_downloaded', {
      booking_id: bookingId,
      room_name: room?.name,
    });

    try {
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node) => {
          // Ignore elements with data-html2canvas-ignore="true" (for buttons)
          if (node.tagName && (node as HTMLElement).dataset?.html2canvasIgnore === 'true') {
            return false;
          }
          if (node.tagName && (node as HTMLElement).getAttribute?.('data-html2canvas-ignore') === 'true') {
            return false;
          }
          return true;
        }
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      // We don't have canvas directly, so we use element dimensions for aspect ratio
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${hotelName.replace(/\s+/g, '_')}_Invoice_${bookingId}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      if (error instanceof Error) {
        alert(`Could not generate invoice at this time. Error: ${error.message}`);
      } else {
        alert("Could not generate invoice at this time.");
      }
    }
  };

  const whatsappMessage = encodeURIComponent(`Hello ${hotelName}, I have just completed a booking (ID: ${bookingId}) for ${room?.name} from ${checkIn} to ${checkOut}.`);

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        {/* Header */}
        <div className="bg-[var(--color-ocean-900)] text-white p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg relative z-10"
          >
            <CheckCircle size={48} className="text-green-500" />
          </motion.div>

          <h1 className="font-serif text-4xl font-bold mb-2 relative z-10">Your Stay is Confirmed! 🎉</h1>
          <p className="text-white/80 text-lg relative z-10">Thank you for choosing {hotelName}, {guestDetails?.fullName?.split(' ')[0] || 'Guest'}.</p>
        </div>

        {/* Booking Details */}
        <div className="p-8 sm:p-10" id="invoice-content">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-8 border-b border-gray-100 gap-4">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Booking ID</p>
              <p className="text-2xl font-bold text-[var(--color-ocean-900)]">{bookingId}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-2">Room Details</h3>
                <p className="font-bold text-lg text-gray-900">{room?.name}</p>
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <Users size={16} />
                  <span>{guests} Guest{guests > 1 ? 's' : ''}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-2">Guest Information</h3>
                <p className="font-medium text-gray-900">{guestDetails?.fullName}</p>
                <p className="text-gray-600">{guestDetails?.email}</p>
                <p className="text-gray-600">{guestDetails?.phone}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Check-in</p>
                <p className="font-bold text-gray-900 flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--color-ocean-600)]" />
                  {formatDate(checkIn)}
                </p>
                <p className="text-sm text-gray-500 mt-1">After 12:00 PM</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Check-out</p>
                <p className="font-bold text-gray-900 flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--color-ocean-600)]" />
                  {formatDate(checkOut)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Before 11:00 AM</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-[var(--color-sand-100)] rounded-xl mb-10">
            <MapPin size={20} className="text-[var(--color-ocean-600)] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">{hotelName}</p>
              <p className="text-sm text-gray-600">{hotelAddress}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-html2canvas-ignore="true">
            <button
              onClick={handleDownloadInvoice}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 font-semibold text-gray-700 transition-colors"
            >
              <Download size={18} />
              Download Invoice
            </button>
            <a
              href={`https://wa.me/${hotelWhatsap}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => posthog.capture('whatsapp_confirmation_clicked', { booking_id: bookingId })}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors shadow-sm"
            >
              <MessageCircle size={18} />
              WhatsApp Confirmation
            </a>
            <a
              href={`tel:${hotelPhone}`}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 font-semibold text-gray-700 transition-colors sm:col-span-2"
            >
              <Phone size={18} />
              Contact Front Desk
            </a>
          </div>

          <div className="mt-8 text-center" data-html2canvas-ignore="true">
            <Link to="/" className="text-[var(--color-ocean-600)] font-medium hover:underline">
              Return to Home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
