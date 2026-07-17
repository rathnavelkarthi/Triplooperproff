import { useState, useRef, useMemo } from 'react';
import { Search, MoreVertical, Mail, Phone, MapPin, FileText, X, Download, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useCRM, Reservation } from '../../context/CRMDataContext';
import { useAuth } from '../../context/AuthContext';

// Define the Guest type based on reservations
type GuestRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  stays: number;
  spent: number;
  lastVisit: string;
  location: string;
  latestReservationId: string;
};

export default function Guests() {
  const { reservations, cmsSettings } = useCRM();
  const { tenant } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<GuestRecord | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Derive Guest Directory from Reservations
  const guestRecords = useMemo(() => {
    const records: Record<string, GuestRecord> = {};

    reservations.forEach(res => {
      // Group by name + email as a unique guest identifier
      const key = `${res.guest}-${res.guest_email || 'no-email'}`.toLowerCase();

      if (!records[key]) {
        records[key] = {
          id: `G-${res.id.split('-')[1] || res.id}`,
          name: res.guest,
          email: res.guest_email || 'N/A',
          phone: res.guest_phone || 'N/A',
          stays: 0,
          spent: 0,
          lastVisit: res.checkIn,
          location: res.guest_location || 'Unknown',
          latestReservationId: res.id
        };
      }

      records[key].stays += 1;
      records[key].spent += (res.amount || 0);

      // Track the most recent visit
      if (new Date(res.checkIn) > new Date(records[key].lastVisit)) {
        records[key].lastVisit = res.checkIn;
        records[key].latestReservationId = res.id;
      }
    });

    return Object.values(records).filter(guest =>
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.phone.includes(searchTerm)
    );
  }, [reservations, searchTerm]);

  const handleGenerateInvoice = (guest: GuestRecord) => {
    setSelectedGuest(guest);
    setActiveDropdown(null);
  };

  const handleDownloadAndShare = async () => {
    if (!invoiceRef.current || !selectedGuest) return;

    const formattedPhone = selectedGuest.phone.replace(/[^0-9+]/g, '');
    const hotelName = cmsSettings?.hotelName || tenant?.business_name || 'Our Resort';
    const waMessage = encodeURIComponent(
      `Hello ${selectedGuest.name},\n\nThank you for choosing ${hotelName}! We hope you enjoyed your stay.\n\nPlease find your latest billing invoice attached to this chat.\n\nBest Regards,\n${hotelName} Team`
    );
    const waUrl = `https://wa.me/${formattedPhone}?text=${waMessage}`;

    const waWindow = window.open('about:blank', '_blank');

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const filename = `Invoice_${selectedGuest.id}_${selectedGuest.name.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);

      if (waWindow) {
        waWindow.location.href = waUrl;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (waWindow) waWindow.close();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Guest Directory</h1>
          <p className="text-gray-500 mt-1">Manage guest profiles and stay history.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible relative z-10">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 rounded-t-2xl">
          <div className="relative w-full sm:w-96">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Name, Email, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-semibold">Guest Info</th>
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Total Stays</th>
                <th className="p-4 font-semibold">Total Spent</th>
                <th className="p-4 font-semibold">Last Visit</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50">
              {guestRecords.map((guest) => (
                <tr key={guest.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-ocean-50)] text-[var(--color-ocean-700)] flex items-center justify-center font-bold text-lg">
                        {guest.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{guest.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} /> {guest.location}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        <span className="truncate max-w-[150px]">{guest.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <span>{guest.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">
                      {guest.stays} {guest.stays === 1 ? 'Stay' : 'Stays'}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-[var(--color-ocean-900)]">₹{guest.spent.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-gray-600">{guest.lastVisit}</td>
                  <td className={`p-4 text-right relative ${activeDropdown === guest.id ? 'z-50' : ''}`}>
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === guest.id ? null : guest.id)}
                      aria-label={`Actions for ${guest.name}`}
                      aria-expanded={activeDropdown === guest.id}
                      className="p-1.5 text-gray-400 hover:text-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-50)] rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-ocean-300)] outline-none"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {activeDropdown === guest.id && (
                      <div className="absolute right-8 top-10 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 overflow-hidden">
                        <button
                          onClick={() => handleGenerateInvoice(guest)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[var(--color-ocean-50)] text-left"
                        >
                          <FileText size={16} />
                          Generate Bill
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {guestRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    No guests found in history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Count */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 text-sm text-gray-500 rounded-b-2xl">
        <span>{guestRecords.length} {guestRecords.length === 1 ? 'guest' : 'guests'}</span>
      </div>

      {/* Invoice Modal Overlay */}
      {
        selectedGuest && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
            <div className="bg-gray-50 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-2xl sticky top-0 z-10">
                <h2 className="font-serif text-xl font-bold text-gray-900">Invoice Preview</h2>
                <button
                  onClick={() => setSelectedGuest(null)}
                  className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body - Contains the actual invoice to be printed */}
              <div className="p-6 overflow-y-auto flex-1 flex justify-center">

                {/* THE INVOICE TEMPLATE (This div is captured by html2canvas) */}
                <div
                  ref={invoiceRef}
                  className="bg-[#ffffff] p-8 sm:p-12 w-full max-w-2xl shadow-sm border border-[#e5e7eb]"
                  style={{
                    // Enforce white background for the PDF, avoiding transparent backgrounds
                    backgroundColor: '#ffffff',
                    color: '#1f2937' // gray-800
                  }}
                >
                  {/* Header Section */}
                  <div className="flex justify-between items-start border-b border-[#f3f4f6] pb-8 mb-8">
                    <div>
                      <h1 className="font-serif text-3xl font-bold text-[#0c4a6e] leading-tight mb-2">
                        {cmsSettings?.hotelName || tenant?.business_name || 'Our Resort'}
                      </h1>
                      <p className="text-[#6b7280] text-sm">{cmsSettings?.contactAddress || 'Hotel Address'}</p>
                      <p className="text-[#6b7280] text-sm">{cmsSettings?.contactEmail || tenant?.custom_email || 'contact@hotel.com'}</p>
                      <p className="text-[#6b7280] text-sm">{cmsSettings?.contactPhone || tenant?.contact_phone || '+91 0000 0000'}</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl font-bold text-[#1f2937] tracking-wider mb-2">INVOICE</h2>
                      <p className="text-[#4b5563] text-sm font-medium">Inv. No: <span className="font-normal">#INV-{selectedGuest.latestReservationId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}</span></p>
                      <p className="text-[#4b5563] text-sm font-medium">Date: <span className="font-normal">{new Date().toLocaleDateString('en-GB')}</span></p>
                    </div>
                  </div>

                  {/* Bill To Section */}
                  <div className="mb-10">
                    <p className="text-xs text-[#9ca3af] font-bold uppercase tracking-wider mb-2">Bill To</p>
                    <h3 className="text-lg font-bold text-[#1f2937]">{selectedGuest.name}</h3>
                    <p className="text-[#4b5563] text-sm mt-1">{selectedGuest.location}</p>
                    <p className="text-[#4b5563] text-sm">{selectedGuest.phone}</p>
                    <p className="text-[#4b5563] text-sm">{selectedGuest.email}</p>
                  </div>

                  {/* Main Items Table */}
                  <table className="w-full mb-10 border-collapse">
                    <thead>
                      <tr className="border-b-2 border-[#1f2937] text-[#1f2937] text-sm">
                        <th className="py-3 text-left font-bold w-1/2">Description</th>
                        <th className="py-3 text-center font-bold">Qty / Days</th>
                        <th className="py-3 text-right font-bold">Unit Price</th>
                        <th className="py-3 text-right font-bold w-1/4">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr className="border-b border-[#f3f4f6]">
                        <td className="py-4 text-[#1f2937]">
                          <p className="font-semibold">Accommodation Services</p>
                          <p className="text-xs text-[#6b7280] mt-1">Room charges for stay history (Total {selectedGuest.stays} visits).</p>
                        </td>
                        <td className="py-4 text-center text-[#4b5563]">{selectedGuest.stays}</td>
                        <td className="py-4 text-right text-[#4b5563]">
                          ₹{(selectedGuest.spent / selectedGuest.stays).toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 text-right font-medium text-[#1f2937]">₹{selectedGuest.spent.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totals Section */}
                  <div className="flex justify-end mb-16">
                    <div className="w-1/2 max-w-[250px]">
                      <div className="flex justify-between py-2 text-sm text-[#4b5563]">
                        <span>Subtotal</span>
                        <span>₹{selectedGuest.spent.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between py-2 text-sm text-[#4b5563] border-b border-[#e5e7eb]">
                        <span>GST (18%)</span>
                        <span>₹{Math.round(selectedGuest.spent * 0.18).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between py-3 text-lg font-bold text-[#111827] border-b-2 border-[#1f2937]">
                        <span>Total</span>
                        <span>₹{Math.round(selectedGuest.spent * 1.18).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Section */}
                  <div className="text-center pt-8 border-t border-[#e5e7eb]">
                    <h4 className="font-serif text-[#0c4a6e] font-bold text-lg mb-1">Thank You For Your Stay!</h4>
                    <p className="text-[#6b7280] text-xs">If you have any questions concerning this invoice, please contact reception.</p>
                    <p className="text-[#9ca3af] text-xs mt-4">This is a highly secure, computer-generated invoice.</p>
                  </div>

                </div>
                {/* END INVOICE TEMPLATE */}

              </div>

              {/* Modal Footer (Action Buttons) */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => setSelectedGuest(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadAndShare}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating PDF...
                    </span>
                  ) : (
                    <>
                      <Download size={18} />
                      <Share2 size={18} className="ml-1" />
                      Download & WhatsApp
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
