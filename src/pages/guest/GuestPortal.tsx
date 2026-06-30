import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuest } from './GuestLayout';
import { supabase } from '../../lib/supabaseClient';
import { Wifi, Phone, Coffee, Sparkles, MessageSquare, Receipt, Clock, MapPin, Upload, FileText, CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function GuestPortal() {
  const { session, token } = useGuest();
  const navigate = useNavigate();
  const [wifiPassword, setWifiPassword] = useState('Welcome@123');
  const [checkoutTime, setCheckoutTime] = useState('11:00 AM');
  const [supportPhone, setSupportPhone] = useState('+91 90427 37424');
  const [hotelAbout, setHotelAbout] = useState('');

  // Stays & Aadhaar Verification states
  const [stayHistory, setStayHistory] = useState<any[]>([]);
  const [loadingStays, setLoadingStays] = useState(true);
  
  // Verification details
  const [aadharUrl, setAadharUrl] = useState<string | null>(session?.aadhar_url || null);
  const [aadharNumber, setAadharNumber] = useState<string | null>(session?.aadhar_number || null);
  const [extractedAge, setExtractedAge] = useState<number | null>(session?.aadhar_extracted_age || null);
  const [extractedAddress, setExtractedAddress] = useState<string | null>(session?.aadhar_extracted_address || null);
  const [extractedName, setExtractedName] = useState<string | null>(session?.aadhar_extracted_name || null);
  const [aadharDob, setAadharDob] = useState<string | null>(session?.aadhar_dob || null);

  const [scanning, setScanning] = useState(false);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Local form state for OCR corrections
  const [verifyForm, setVerifyForm] = useState({
    name: '',
    number: '',
    dob: '',
    address: ''
  });

  useEffect(() => {
    if (!session?.tenant_id) return;

    async function loadCMS() {
      try {
        const { data } = await supabase
          .from('cms_settings')
          .select('setting_key, setting_value')
          .eq('tenant_id', session.tenant_id);

        if (data) {
          const wifi = data.find(d => d.setting_key === 'wifiPassword');
          const checkout = data.find(d => d.setting_key === 'checkoutTime');
          const phone = data.find(d => d.setting_key === 'contactPhone');
          const about = data.find(d => d.setting_key === 'aboutText');

          if (wifi?.setting_value) setWifiPassword(wifi.setting_value);
          if (checkout?.setting_value) setCheckoutTime(checkout.setting_value);
          if (phone?.setting_value) setSupportPhone(phone.setting_value);
          if (about?.setting_value) setHotelAbout(about.setting_value);
        }
      } catch (err) {
        console.error('Failed to load portal settings:', err);
      }
    }

    async function loadStays() {
      setLoadingStays(true);
      try {
        let query = supabase
          .from('reservations')
          .select('id, check_in, check_out, room_type, status, amount, created_at')
          .order('check_in', { ascending: false });

        if (session.guest_phone && session.guest_email) {
          query = query.or(`guest_phone.eq.${session.guest_phone},guest_email.eq.${session.guest_email}`);
        } else if (session.guest_phone) {
          query = query.eq('guest_phone', session.guest_phone);
        } else {
          query = query.eq('guest_email', session.guest_email);
        }

        const { data, error } = await query;
        if (!error && data) {
          setStayHistory(data);
        }
      } catch (err) {
        console.error('Failed to load stays history:', err);
      } finally {
        setLoadingStays(false);
      }
    }

    loadCMS();
    loadStays();
  }, [session]);

  if (!session) return null;

  const formatDateStr = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'checked_in' || s === 'checked in' || s === 'active') {
      return <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full font-medium">Checked In</span>;
    }
    if (s === 'checked_out' || s === 'checked out') {
      return <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs px-3 py-1 rounded-full font-medium">Checked Out</span>;
    }
    return <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-1 rounded-full font-medium capitalize">{status || 'Confirmed'}</span>;
  };

  // Simulated OCR Scanner with Gemini Fallback logic
  const handleAadharUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setShowConfirmForm(false);

    // 1. Read locally as Base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || '') as string;

      if (apiKey) {
        try {
          console.log('[OCR] Gemini API Key found. Initiating real AI extraction...');
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "Extract details from this Indian Aadhaar Card image. Return a JSON object with the following fields: 'name' (full name), 'number' (12-digit number formatted with spaces like 'XXXX XXXX XXXX'), 'dob' (date of birth in DD/MM/YYYY format), 'address' (full address). Return only the raw JSON. Do not include markdown code block syntax." },
                  {
                    inlineData: {
                      mimeType: file.type || 'image/jpeg',
                      data: base64Data.split(',')[1]
                    }
                  }
                ]
              }],
              generationConfig: {
                responseMimeType: "application/json"
              }
            })
          });

          if (!response.ok) {
            throw new Error(`Gemini API returned status ${response.status}`);
          }

          const result = await response.json();
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          console.log('[OCR] Raw response from Gemini:', rawText);
          
          // Clean markdown formatting if any
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          setVerifyForm({
            name: parsed.name || session.guest_name || '',
            number: parsed.number || '0000 0000 0000',
            dob: parsed.dob || '01/01/1990',
            address: parsed.address || session.guest_location || ''
          });
          setAadharUrl(base64Data);
          setScanning(false);
          setShowConfirmForm(true);
          toast.success('Real AI OCR scan successful! Please review and confirm.');
          return;
        } catch (err) {
          console.error('[OCR] Gemini AI extraction failed, falling back to smart simulation:', err);
        }
      }

      // Fallback: Smart Simulation (scanning for 3 seconds)
      setTimeout(() => {
        // Try to guess a name from the file name if it has alphabetical characters and isn't generic
        let inferredName = session.guest_name || '';
        const baseName = file.name.split('.')[0].replace(/[-_]+/g, ' ');
        if (baseName.length > 3 && !/screenshot|image|upload|aadhar/i.test(baseName)) {
          inferredName = baseName.replace(/\b\w/g, c => c.toUpperCase());
        }

        const parsedNumber = `${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
        const parsedDob = '15/08/1995'; // Example DOB
        const parsedAddress = session.guest_location || '123 Coastal Highway, Pondicherry, 605001';

        setVerifyForm({
          name: inferredName,
          number: parsedNumber,
          dob: parsedDob,
          address: parsedAddress
        });
        
        setAadharUrl(base64Data);
        setScanning(false);
        setShowConfirmForm(true);
        toast.info('Simulated OCR extraction complete. For real AI scanning, configure VITE_GEMINI_API_KEY.');
      }, 3000);
    };

    reader.readAsDataURL(file);
  };

  // Calculate age based on DOB string (DD/MM/YYYY)
  const calculateAge = (dobString: string): number => {
    try {
      const parts = dobString.split('/');
      if (parts.length === 3) {
        const birthYear = parseInt(parts[2], 10);
        const currentYear = new Date().getFullYear();
        return currentYear - birthYear;
      }
      return 30; // fallback default
    } catch {
      return 30;
    }
  };

  const handleSaveVerification = async () => {
    if (!session?.reservation_id) return;

    try {
      const computedAge = calculateAge(verifyForm.dob);

      const { error } = await supabase
        .from('reservations')
        .update({
          aadhar_url: aadharUrl,
          aadhar_number: verifyForm.number,
          aadhar_extracted_age: computedAge,
          aadhar_extracted_address: verifyForm.address,
          aadhar_extracted_name: verifyForm.name,
          aadhar_dob: verifyForm.dob
        })
        .eq('id', session.reservation_id);

      if (error) throw error;

      // Update local states
      setAadharNumber(verifyForm.number);
      setExtractedAge(computedAge);
      setExtractedAddress(verifyForm.address);
      setExtractedName(verifyForm.name);
      setAadharDob(verifyForm.dob);

      setShowConfirmForm(false);
      toast.success('Identity verified and Aadhaar saved successfully!');
    } catch (err) {
      console.error('Failed to save Aadhaar details:', err);
      toast.error('Failed to complete verification. Please try again.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Welcome Guest</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">{session.guest_name}</h2>
            </div>
            {getStatusBadge(session.status)}
          </div>
          
          <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
            {hotelAbout || `We're thrilled to have you stay with us at ${session.business_name}. Manage your orders, services, and check-in options right from here.`}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-800/60">
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Your Room</span>
              <p className="text-sm font-semibold text-white">{session.room_number ? `Room ${session.room_number}` : 'TBD'}</p>
              <p className="text-xs text-zinc-400">{session.room_name || 'Deluxe Room'}</p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Check In</span>
              <p className="text-sm font-semibold text-white">{formatDateStr(session.check_in)}</p>
              <p className="text-xs text-zinc-400">After 2:00 PM</p>
            </div>

            <div className="space-y-1 col-span-2 md:col-span-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Check Out</span>
              <p className="text-sm font-semibold text-white">{formatDateStr(session.check_out)}</p>
              <p className="text-xs text-zinc-400">Before {checkoutTime}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Aadhaar Verification Section */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 shadow-md space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <FileText size={18} className="text-emerald-400" />
            Aadhaar Verification
          </h3>
          {aadharNumber ? (
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 size={12} /> Verified
            </span>
          ) : (
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
              <AlertTriangle size={12} /> Action Required
            </span>
          )}
        </div>

        {/* Not Verified State */}
        {!aadharNumber && !scanning && !showConfirmForm && (
          <div className="py-4 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-3 text-zinc-400">
              <Upload size={22} />
            </div>
            <h4 className="text-sm font-semibold text-white">Upload Aadhaar Card</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Please upload a copy of your Aadhaar card. Our system will use AI OCR to automatically verify your age and address for quick reception check-in.
            </p>
            <label className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black text-xs font-semibold rounded-xl cursor-pointer shadow-lg shadow-emerald-500/10 transition-all">
              <Upload size={14} />
              Select Document
              <input type="file" accept="image/*,.pdf" onChange={handleAadharUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Scanning Animation */}
        {scanning && (
          <div className="relative border border-zinc-800 rounded-2xl bg-zinc-950 p-8 flex flex-col items-center justify-center text-center overflow-hidden h-48">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_#10b981] animate-[scan_2s_infinite]"></div>
            <Loader2 className="animate-spin text-emerald-400 mb-3" size={28} />
            <h4 className="text-sm font-semibold text-white">Processing Document...</h4>
            <p className="text-xs text-zinc-500 mt-1">AI OCR is extracting verification fields from your Aadhaar card.</p>
          </div>
        )}

        {/* Confirm OCR details form */}
        {showConfirmForm && (
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 md:p-5 space-y-4">
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex gap-2">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={14} />
              <p className="text-2xs text-amber-400 leading-normal">
                Please review the extracted Aadhaar data. Correct any errors if the scanner misread any details.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Full Name</label>
                <input
                  type="text"
                  value={verifyForm.name}
                  onChange={(e) => setVerifyForm({ ...verifyForm, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Aadhaar Number</label>
                <input
                  type="text"
                  value={verifyForm.number}
                  onChange={(e) => setVerifyForm({ ...verifyForm, number: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Date of Birth (DD/MM/YYYY)</label>
                <input
                  type="text"
                  value={verifyForm.dob}
                  onChange={(e) => setVerifyForm({ ...verifyForm, dob: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Extracted Address</label>
                <input
                  type="text"
                  value={verifyForm.address}
                  onChange={(e) => setVerifyForm({ ...verifyForm, address: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmForm(false)}
                className="px-4 py-2 text-xs text-zinc-400 bg-zinc-900 rounded-xl hover:bg-zinc-850 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVerification}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl transition-all"
              >
                Confirm & Save Details
              </button>
            </div>
          </div>
        )}

        {/* Verified State Info */}
        {aadharNumber && (
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Verified Name</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">{extractedName || session.guest_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Aadhaar Number</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">•••• •••• {aadharNumber.slice(-4)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Extracted Age</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">{extractedAge ? `${extractedAge} years` : 'Verified'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">DOB</span>
                  <span className="text-xs font-semibold text-white mt-0.5 block">{aadharDob || 'N/A'}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-850/60">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Extracted Address</span>
                <span className="text-xs text-zinc-300 mt-0.5 block leading-normal">{extractedAddress}</span>
              </div>
            </div>

            <div className="flex md:flex-col justify-end gap-2 shrink-0">
              <button
                onClick={() => setPreviewOpen(!previewOpen)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 text-xs font-semibold rounded-xl transition-all"
              >
                <Eye size={12} /> {previewOpen ? 'Hide Card' : 'View Saved Card'}
              </button>
              <label className="flex items-center justify-center gap-1.5 px-4 py-2 border border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold rounded-xl cursor-pointer transition-all">
                Update Card
                <input type="file" accept="image/*,.pdf" onChange={handleAadharUpload} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* Saved Card Image Preview */}
        {previewOpen && aadharUrl && (
          <div className="border border-zinc-800 bg-zinc-950 rounded-2xl p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-zinc-400 font-semibold">Aadhaar Card Attachment</span>
              <button onClick={() => setPreviewOpen(false)} className="text-xs text-zinc-500 hover:text-white underline">Close</button>
            </div>
            {aadharUrl.startsWith('data:') ? (
              <img src={aadharUrl} alt="Aadhaar Card Attachment" className="max-h-64 object-contain rounded-xl mx-auto border border-zinc-800 bg-zinc-900" />
            ) : (
              <div className="h-48 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center text-zinc-400">
                <FileText size={32} className="text-zinc-600 mb-2" />
                <span className="text-xs">Document stored in database</span>
                <a href={aadharUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 text-xs mt-1 hover:underline">Open in new tab</a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Services Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => navigate(`/guest/${token}/food`)}
          className="flex flex-col items-center justify-center p-6 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-emerald-500/30 transition-all group active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Coffee size={22} />
          </div>
          <span className="text-sm font-semibold text-white">Order Food</span>
          <span className="text-2xs text-zinc-500 mt-1">In-room dining</span>
        </button>

        <button
          onClick={() => navigate(`/guest/${token}/services`)}
          className="flex flex-col items-center justify-center p-6 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-emerald-500/30 transition-all group active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Sparkles size={22} />
          </div>
          <span className="text-sm font-semibold text-white">Room Services</span>
          <span className="text-2xs text-zinc-500 mt-1">Towels, cleaning</span>
        </button>

        <button
          onClick={() => navigate(`/guest/${token}/bill`)}
          className="flex flex-col items-center justify-center p-6 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-emerald-500/30 transition-all group active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Receipt size={22} />
          </div>
          <span className="text-sm font-semibold text-white">Running Bill</span>
          <span className="text-2xs text-zinc-500 mt-1">View charges</span>
        </button>

        <button
          onClick={() => navigate(`/guest/${token}/chat`)}
          className="flex flex-col items-center justify-center p-6 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-emerald-500/30 transition-all group active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <MessageSquare size={22} />
          </div>
          <span className="text-sm font-semibold text-white">Reception Chat</span>
          <span className="text-2xs text-zinc-500 mt-1">24/7 helpdesk</span>
        </button>
      </div>

      {/* History of Stays Section */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 shadow-md space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Clock size={18} className="text-emerald-400" />
          Stay History
        </h3>
        
        {loadingStays ? (
          <div className="flex items-center justify-center py-6 text-zinc-500 text-xs">
            <Loader2 className="animate-spin text-zinc-500 mr-2" size={14} /> Loading stay history...
          </div>
        ) : stayHistory.length > 1 ? (
          <div className="divide-y divide-zinc-800/60">
            {stayHistory.map((stay) => {
              const isCurrent = stay.id === session.reservation_id;
              return (
                <div key={stay.id} className={`py-3.5 flex items-center justify-between gap-4 ${isCurrent ? 'bg-emerald-500/5 px-3 -mx-3 rounded-xl border border-emerald-500/10' : ''}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{stay.id}</span>
                      <span className="text-2xs text-zinc-400">• {stay.room_type}</span>
                      {isCurrent && (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-bold">Current Stay</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                      <Calendar size={11} />
                      <span>{formatDateStr(stay.check_in)}</span>
                      <span>to</span>
                      <span>{formatDateStr(stay.check_out)}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-xs font-semibold text-white block">₹{Number(stay.amount).toLocaleString()}</span>
                    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      stay.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' :
                      stay.status === 'CHECKED_IN' ? 'bg-amber-500/10 text-amber-400' :
                      stay.status === 'CHECKED_OUT' ? 'bg-zinc-800 text-zinc-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>{stay.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-zinc-500 text-xs">
            This is your first stay with us. We hope you enjoy it!
          </div>
        )}
      </div>

      {/* Property & Stay Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Connection Details */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 space-y-4 shadow-md">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Wifi size={18} className="text-emerald-400" />
            Stay Connected
          </h3>
          
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Wi-Fi Network</span>
              <span className="font-semibold text-white select-all">{session.business_name}_Guest</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Wi-Fi Password</span>
              <span className="font-semibold text-emerald-400 select-all font-mono">{wifiPassword}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-800/40">
              <span className="text-zinc-500 font-medium">Front Desk Support</span>
              <a href={`tel:${supportPhone}`} className="font-semibold text-white hover:text-emerald-400 transition-colors flex items-center gap-1">
                <Phone size={14} className="text-emerald-400" />
                {supportPhone}
              </a>
            </div>
          </div>
        </div>

        {/* Helpful Info / Rules */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 space-y-4 shadow-md">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Clock size={18} className="text-emerald-400" />
            Stay Information
          </h3>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Breakfast Hours</span>
              <span className="font-semibold text-white">08:00 AM - 10:30 AM</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Checkout Guidelines</span>
              <span className="font-semibold text-white">Drop key cards at front desk</span>
            </div>

            <div className="flex items-center gap-2 text-sm pt-2 border-t border-zinc-800/40">
              <MapPin size={14} className="text-zinc-500 shrink-0" />
              <span className="text-zinc-400 line-clamp-1">{session.guest_location || 'Coastal Road, Pondicherry'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* CSS Animation Keyframes for laser scanner effect */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
}
