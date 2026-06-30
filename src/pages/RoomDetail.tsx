import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabaseClient';
import { getSubdomain } from '../hooks/useSubdomain';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star, MapPin, Phone, Mail, Calendar, Users, ChevronLeft, ChevronRight,
  ArrowRight, ArrowLeft, Wifi, Car, Coffee, Waves, X, Check, Clock,
  Bed, Shield, Sparkles, Tag, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Types
type Room = {
  id: number; name: string; type: string; description: string;
  price_per_night: number; max_occupancy: number; amenities: string[]; images: string[];
};
type Tenant = { id: string; business_name: string; subdomain: string; logo_url: string };
type OtherRoom = { id: number; name: string; type: string; price_per_night: number; images: string[] };

// Amenity icons
const amenityIcons: Record<string, React.ElementType> = {
  wifi: Wifi, 'free wifi': Wifi, parking: Car, 'car park': Car,
  coffee: Coffee, 'coffee maker': Coffee, pool: Waves, balcony: Sparkles,
  minibar: Coffee, ac: Sparkles, tv: Sparkles, 'work desk': Sparkles,
};

export default function RoomDetail() {
  const { subdomain: pathSubdomain, roomId } = useParams<{ subdomain?: string; roomId: string }>();
  const hostSubdomain = getSubdomain();
  const subdomain = pathSubdomain || hostSubdomain || '';
  const [room, setRoom] = useState<Room | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [otherRooms, setOtherRooms] = useState<OtherRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Booking form
  const [form, setForm] = useState({ name: '', email: '', phone: '', checkIn: '', checkOut: '' });
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');
  const [bookSuccess, setBookSuccess] = useState<any>(null);

  // Phase 3: real-time logic
  const [availability, setAvailability] = useState<{ is_available: boolean; total_price: number } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<{ is_valid: boolean; amount: number; message: string } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    if (!subdomain || !roomId) return;
    (async () => {
      const { data, error } = await supabase.rpc('get_room_detail', {
        p_subdomain: subdomain,
        p_room_id: Number(roomId),
      });
      if (error || !data?.room) { setNotFound(true); setLoading(false); return; }
      setRoom(data.room);
      setTenant(data.tenant);
      setOtherRooms(data.all_rooms || []);

      // Fetch booking settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('tenant_id', data.tenant.id);

      if (settingsData) {
        const s: any = {};
        settingsData.forEach((item: any) => s[item.setting_key] = item.setting_value);
        setSettings(s);
      }

      setLoading(false);
    })();
  }, [subdomain, roomId]);

  // Handle availability check when dates change
  useEffect(() => {
    if (form.checkIn && form.checkOut && subdomain && room) {
      if (new Date(form.checkOut) > new Date(form.checkIn)) {
        checkAvailability();
      }
    }
  }, [form.checkIn, form.checkOut, subdomain, room?.id]);

  const checkAvailability = async () => {
    setCheckingAvailability(true);
    setBookError('');
    try {
      const { data, error } = await supabase.rpc('check_room_availability', {
        p_subdomain: subdomain,
        p_room_id: room!.id,
        p_check_in: form.checkIn,
        p_check_out: form.checkOut
      });

      if (error) throw error;
      setAvailability(data[0]);
    } catch (err: any) {
      console.error('Availability check failed:', err);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode || !subdomain || !room) return;
    setApplyingCoupon(true);
    try {
      const { data, error } = await supabase.rpc('apply_coupon', {
        p_subdomain: subdomain,
        p_code: couponCode,
        p_room_id: room.id,
        p_nights: nights
      });

      if (error) throw error;
      setCouponDiscount(data[0]);
      if (data[0].is_valid) {
        toast.success(data[0].message);
      } else {
        toast.error(data[0].message);
      }
    } catch (err: any) {
      toast.error('Failed to apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const nights = form.checkIn && form.checkOut
    ? Math.max(0, Math.floor((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000))
    : 0;

  const totalPrice = availability?.total_price || (nights * (room?.price_per_night || 0));
  const discount = couponDiscount?.is_valid ? couponDiscount.amount : 0;
  const finalPrice = Math.max(0, totalPrice - discount);
  const advanceAmount = Math.ceil(finalPrice * (Number(settings.advance_payment_percentage || 0) / 100));

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookError('');
    setBooking(true);
    const { data, error } = await supabase.rpc('create_public_booking', {
      p_subdomain: subdomain,
      p_guest_name: form.name,
      p_guest_email: form.email,
      p_guest_phone: form.phone,
      p_room_id: room!.id,
      p_check_in: form.checkIn,
      p_check_out: form.checkOut,
      p_amount: finalPrice,
      p_advance_amount: advanceAmount
    });
    setBooking(false);
    if (error) { setBookError(error.message); return; }
    if (data?.error) { setBookError(data.error); return; }
    setBookSuccess(data);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F4EF]">
      <div className="w-10 h-10 border-3 border-[#0E2A38]/10 border-t-[#0E2A38] rounded-full animate-spin" />
    </div>
  );

  if (notFound || !room || !tenant) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0E2A38]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white/10 mb-4">404</h1>
        <p className="text-white/50 text-lg mb-4">Room not found</p>
        <Link to={hostSubdomain ? "/" : `/site/${subdomain}`} className="text-[#C9A646] hover:underline text-sm">Back to property</Link>
      </div>
    </div>
  );

  const images = room.images?.length > 0 ? room.images : [];
  const hasImages = images.length > 0;

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-gray-900 antialiased">
      <Helmet>
        <title>{room.name} - {tenant.business_name} | Book Direct</title>
        <meta name="description" content={`${room.name} at ${tenant.business_name}. ${room.description?.slice(0, 120) || `Sleeps ${room.max_occupancy} guests. Starting at ₹${room.price_per_night}/night.`}`} />
        <link rel="canonical" href={`https://${tenant.subdomain}.triplooper.com/room/${room.id}`} />
        <meta property="og:title" content={`${room.name} - ${tenant.business_name}`} />
        <meta property="og:description" content={`Sleeps ${room.max_occupancy} guests. Starting at ₹${room.price_per_night}/night. Book direct for best rates.`} />
        <meta property="og:url" content={`https://${tenant.subdomain}.triplooper.com/room/${room.id}`} />
        <meta property="og:type" content="product" />
        {images[0] && <meta property="og:image" content={images[0]} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${room.name} - ${tenant.business_name}`} />
        <meta name="twitter:description" content={`From ₹${room.price_per_night}/night. Book direct.`} />
      </Helmet>
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={hostSubdomain ? "/" : `/site/${subdomain}`} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">All rooms</span>
            </Link>
            <div className="w-px h-6 bg-gray-200" />
            <div className="flex items-center gap-2">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt={`${tenant.business_name} logo`} className="w-7 h-7 rounded-lg object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#0E2A38] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{tenant.business_name.charAt(0)}</span>
                </div>
              )}
              <span className="font-bold text-[#0E2A38] tracking-tight text-sm">{tenant.business_name}</span>
            </div>
          </div>
          <a href="#booking" className="bg-[#0E2A38] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-[#1a3d4f] transition-all shadow-sm">
            Reserve
          </a>
        </div>
      </nav>

      {/* Image gallery */}
      <section className="pt-16">
        {hasImages ? (
          <div className="relative">
            {images.length === 1 ? (
              <div className="h-[60vh] cursor-pointer" onClick={() => setLightboxOpen(true)}>
                <img src={images[0]} alt={room.name} className="w-full h-full object-cover" />
              </div>
            ) : images.length === 2 ? (
              <div className="grid grid-cols-2 h-[60vh] gap-1">
                {images.map((img, i) => (
                  <div key={i} className="overflow-hidden cursor-pointer" onClick={() => { setActiveImage(i); setLightboxOpen(true); }}>
                    <img src={img} alt={`${room.name} photo ${i + 1}`} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 grid-rows-2 h-[60vh] gap-1">
                <div className="col-span-2 row-span-2 overflow-hidden cursor-pointer"
                  onClick={() => { setActiveImage(0); setLightboxOpen(true); }}>
                  <img src={images[0]} alt={room.name} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                {images.slice(1, 5).map((img, i) => (
                  <div key={i} className="overflow-hidden cursor-pointer relative"
                    onClick={() => { setActiveImage(i + 1); setLightboxOpen(true); }}>
                    <img src={img} alt={`${room.name} photo ${i + 2}`} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    {i === 3 && images.length > 5 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">+{images.length - 5}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-[40vh] bg-gradient-to-br from-[#0E2A38] via-[#132f3e] to-[#1a3d4f] flex items-center justify-center">
            <div className="text-center">
              <Bed size={48} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm">{room.type}</p>
            </div>
          </div>
        )}
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left: room info */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-[#C9A646] uppercase tracking-[0.15em] bg-[#C9A646]/10 px-3 py-1 rounded-full">{room.type}</span>
                <span className="text-xs text-gray-400 flex items-center gap-1"><Users size={12} /> Up to {room.max_occupancy} guests</span>
              </div>
              <h1 className="text-4xl font-bold text-[#0E2A38] tracking-tight mb-3">{room.name}</h1>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#0E2A38]">₹{room.price_per_night.toLocaleString()}</span>
                <span className="text-gray-400 text-sm">per night</span>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {room.description && (
              <div>
                <h2 className="text-lg font-bold text-[#0E2A38] mb-3">About this room</h2>
                <p className="text-gray-600 leading-relaxed text-[15px]">{room.description}</p>
              </div>
            )}

            {room.amenities?.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-[#0E2A38] mb-4">What's included</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {room.amenities.map((amenity, i) => {
                    const Icon = amenityIcons[amenity.toLowerCase()] || Shield;
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-9 h-9 rounded-lg bg-[#0E2A38]/5 flex items-center justify-center">
                          <Icon size={16} className="text-[#0E2A38]" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-[#0E2A38] mb-4">Policies</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <Clock size={18} className="text-[#C9A646] mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Check-in</p>
                    <p className="text-xs text-gray-500">From 2:00 PM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <Clock size={18} className="text-[#C9A646] mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Check-out</p>
                    <p className="text-xs text-gray-500">Before 11:00 AM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <Shield size={18} className="text-[#C9A646] mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Cancellation</p>
                    <p className="text-xs text-gray-500">Free up to 24h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: sticky booking card */}
          <div className="lg:col-span-1">
            <div id="booking" className="sticky top-24 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-br from-[#0E2A38] to-[#1a3d4f] p-6">
                <p className="text-white/60 text-xs uppercase tracking-wider mb-1">From</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">₹{room.price_per_night.toLocaleString()}</span>
                  <span className="text-white/40 text-sm">/night</span>
                </div>
              </div>

              {bookSuccess ? (
                <div className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <Check size={28} className="text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Booking confirmed</h3>
                  <p className="text-sm text-gray-500 mb-3">Ref: <span className="font-semibold text-[#0E2A38]">{bookSuccess.booking_id}</span></p>
                  <div className="bg-gray-50 rounded-xl p-3 mb-4 text-left space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Room</span><span className="font-medium">{bookSuccess.room}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Nights</span><span className="font-medium">{bookSuccess.nights}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Total</span><span className="font-bold text-[#0E2A38]">₹{Number(bookSuccess.amount).toLocaleString()}</span></div>
                  </div>
                  <p className="text-xs text-gray-400">Confirmation email sent.</p>
                </div>
              ) : (
                <form onSubmit={handleBook} className="p-5 space-y-3">
                  {bookError && <div className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{bookError}</div>}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Check-in</label>
                      <input type="date" required value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Check-out</label>
                      <input type="date" required value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })}
                        min={form.checkIn || new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Full name</label>
                    <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 transition-all" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                      <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="you@email.com"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                      <input type="tel" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 transition-all" />
                    </div>
                  </div>

                  {nights > 0 && (
                    <div className="space-y-2">
                      {availability?.is_available === false ? (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold">
                          <AlertCircle size={14} /> Sold out for these dates. Try other dates.
                        </div>
                      ) : (
                        <>
                          {/* Coupon Input */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Coupon code"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              className="flex-1 border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#0E2A38]/5"
                            />
                            <button
                              type="button"
                              onClick={handleApplyCoupon}
                              disabled={applyingCoupon || !couponCode}
                              className="bg-[#0E2A38] text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#1a3d4f] disabled:opacity-50"
                            >
                              {applyingCoupon ? '...' : 'Apply'}
                            </button>
                          </div>

                          <div className="bg-[#F7F4EF] rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">{nights} night{nights > 1 ? 's' : ''} stay</span>
                              <span className="font-semibold">₹{totalPrice.toLocaleString()}</span>
                            </div>

                            {couponDiscount?.is_valid && (
                              <div className="flex items-center justify-between text-sm text-emerald-600">
                                <span className="flex items-center gap-1 font-medium"><Tag size={12} /> Discount</span>
                                <span className="font-bold">-₹{discount.toLocaleString()}</span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-[#0E2A38]">Total Amount</p>
                                <p className="text-[10px] text-gray-400">Taxes included</p>
                              </div>
                              <p className="text-xl font-bold text-[#0E2A38]">₹{finalPrice.toLocaleString()}</p>
                            </div>

                            {advanceAmount > 0 && (
                              <div className="bg-white/50 rounded-lg p-2 flex items-center justify-between border border-[#0E2A38]/5">
                                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Advance to pay</span>
                                <span className="text-sm font-bold text-[#0E2A38]">₹{advanceAmount.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={booking || checkingAvailability || availability?.is_available === false}
                    className="w-full bg-[#0E2A38] hover:bg-[#1a3d4f] text-white font-semibold py-3 rounded-xl transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {booking ? 'Reserving...' : checkingAvailability ? 'Checking availability...' : 'Reserve now'}
                    {!booking && !checkingAvailability && <ArrowRight size={16} />}
                  </button>

                  <p className="text-[10px] text-gray-400 text-center">
                    {advanceAmount > 0
                      ? `Pay ₹${advanceAmount.toLocaleString()} to confirm. Balance at property.`
                      : "No payment required. Pay at property."
                    }
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Other rooms */}
      {otherRooms.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-12 border-t border-gray-100">
          <h2 className="text-2xl font-bold text-[#0E2A38] mb-6">Other rooms you might like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {otherRooms.map(r => (
              <Link key={r.id} to={hostSubdomain ? `/room/${r.id}` : `/site/${subdomain}/room/${r.id}`}
                className="group bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all">
                <div className="h-40 bg-gray-100 overflow-hidden">
                  {r.images?.[0] ? (
                    <img src={r.images[0]} alt={r.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Bed size={24} className="text-gray-300" /></div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-[#0E2A38]">{r.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400 uppercase">{r.type}</p>
                    <p className="text-sm font-bold text-[#0E2A38]">₹{r.price_per_night.toLocaleString()}<span className="text-xs font-normal text-gray-400">/night</span></p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-[#0E2A38] py-8 px-6 text-center">
        <p className="text-xs text-white/20">
          &copy; {new Date().getFullYear()} {tenant.business_name}. Powered by <a href={hostSubdomain ? "https://superstay.com" : "/"} className="text-[#C9A646]/50 hover:text-[#C9A646] transition-colors">HospitalityOS</a>
        </p>
      </footer>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && hasImages && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button onClick={() => setLightboxOpen(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10">
              <X size={20} />
            </button>

            <button onClick={(e) => { e.stopPropagation(); setActiveImage(prev => (prev - 1 + images.length) % images.length); }}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10">
              <ChevronLeft size={24} />
            </button>

            <motion.img
              key={activeImage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              src={images[activeImage]}
              alt={`${room.name} photo ${activeImage + 1}`}
              className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg"
              onClick={e => e.stopPropagation()}
            />

            <button onClick={(e) => { e.stopPropagation(); setActiveImage(prev => (prev + 1) % images.length); }}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10">
              <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-6 flex gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setActiveImage(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeImage ? 'bg-white w-6' : 'bg-white/30'}`} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
