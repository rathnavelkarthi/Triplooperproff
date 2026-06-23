import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuest } from './GuestLayout';
import { supabase } from '../../lib/supabaseClient';
import { Wifi, Phone, Coffee, Sparkles, MessageSquare, Receipt, Clock, MapPin, Moon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function GuestPortal() {
  const { session, token } = useGuest();
  const navigate = useNavigate();
  const [wifiPassword, setWifiPassword] = useState('Welcome@123');
  const [checkoutTime, setCheckoutTime] = useState('11:00 AM');
  const [supportPhone, setSupportPhone] = useState('+91 90427 37424');
  const [hotelAbout, setHotelAbout] = useState('');

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

    loadCMS();
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

  return (
    <div className="space-y-6 animate-fade-in">
      
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
            {hotelAbout || `We're thrilled to have you stay with us at ${session.business_name}. Manage your orders, services, and chat directly with reception right from here.`}
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
              <span className="text-zinc-400 line-clamp-1">{session.address}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
