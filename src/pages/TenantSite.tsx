import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabaseClient';
import { useTenantOccupancyPricing } from '../hooks/useOccupancyPricing';
import { getSubdomain } from '../hooks/useSubdomain';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import {
    Star, MapPin, Phone, Mail, Calendar, Users, ChevronDown,
    ArrowRight, Wifi, Car, Coffee, Waves, X, Check, Clock,
    Quote, ExternalLink, ChevronLeft, ChevronRight, Plus, Minus,
    Shield, Sunrise, BadgeCheck, Camera, Navigation, Plane, Building2,
    MessageCircle, UtensilsCrossed, Leaf, Wind, Sparkles, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { sendWhatsAppConfirmation } from '../lib/whatsapp';
import { triggerBookingEmails } from '../lib/email';

// --- Types ---
type Room = {
    id: number; name: string; type: string; description: string;
    price_per_night: number; max_occupancy: number; amenities: string[]; images: string[]; is_available: boolean;
    tourist_attractions?: string[];
};
type Testimonial = {
    guest_name: string; guest_location: string; rating: number;
    review_text: string; avatar_url: string; source: string;
};
type TenantData = {
    id: string; business_name: string; business_type: string; subdomain: string;
    template: string; logo_url: string; google_place_id: string; google_review_url: string;
    hero_image_url: string; sections_visible: Record<string, boolean> | null;
};
type MenuCategory = { id: number; name: string; description: string; sort_order: number; is_active: boolean };
type MenuItem = {
    id: number; category_id: number; name: string; description: string;
    price: number; is_veg: boolean; is_available: boolean; image_url: string | null;
    preparation_time_mins: number; sort_order: number;
};
type ChefSpecial = { id: number; name: string; description: string; price: number; image_url: string | null; is_veg: boolean };
type GalleryImage = { id: number; image_url: string; caption: string | null; sort_order: number };
type SiteData = { tenant: TenantData; rooms: Room[]; testimonials: Testimonial[]; settings: Record<string, string>; chef_specials: ChefSpecial[]; gallery: GalleryImage[] };

// --- Amenity icon map ---
const amenityIcons: Record<string, React.ElementType> = {
    wifi: Wifi, parking: Car, coffee: Coffee, pool: Waves, 'free wifi': Wifi, 'car park': Car
};

// --- Google Maps URL parser ---
export function parseGoogleMapsUrl(input: string): string {
    if (!input) return '';
    const trimmed = input.trim();
    if (!trimmed) return '';

    // 1. If it's a full iframe HTML snippet, extract the src attribute
    if (trimmed.startsWith('<iframe') || trimmed.includes('<iframe')) {
        const match = trimmed.match(/src=["']([^"']+)["']/);
        if (match && match[1]) {
            return match[1];
        }
    }

    // 2. If it's already an embed URL, return it
    if (trimmed.includes('google.com/maps/embed') || trimmed.includes('google.com/maps/embed/v1') || trimmed.includes('output=embed')) {
        return trimmed;
    }

    // 3. Reject short links because they cannot be embedded and will be blocked
    if (trimmed.includes('maps.app.goo.gl') || trimmed.includes('goo.gl/maps')) {
        return '';
    }

    // 4. Extract place name from standard Google Maps URLs if present
    const placeMatch = trimmed.match(/\/place\/([^/@?]+)/);
    if (placeMatch && placeMatch[1]) {
        const query = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&z=15`;
    }

    const searchMatch = trimmed.match(/\/search\/([^/@?]+)/);
    if (searchMatch && searchMatch[1]) {
        const query = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
        return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&z=15`;
    }

    // 5. Extract coordinates from standard Google Maps URLs if present
    const coordMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch && coordMatch[1] && coordMatch[2]) {
        return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&output=embed&z=15`;
    }

    // 6. If it's a query URL, extract 'q' parameter if possible
    if (trimmed.startsWith('http')) {
        try {
            const urlObj = new URL(trimmed);
            const q = urlObj.searchParams.get('q');
            if (q) {
                return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed&z=15`;
            }
        } catch {
            // ignore
        }
        return '';
    }

    // 7. Otherwise, treat it as a plain text address / search term
    return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed&z=15`;
}

// --- Star rating ---
function Stars({ count }: { count: number }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} className={i < count ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
            ))}
        </div>
    );
}

// --- Booking Modal ---
function BookingModal({ room, subdomain, onClose, onSuccess, adjustedPrice, initialCheckIn, initialCheckOut, tenantId, businessName, siteData }: {
    room: Room; subdomain: string; onClose: () => void; onSuccess: (data: any) => void; adjustedPrice: (base: number) => number;
    initialCheckIn?: string; initialCheckOut?: string; tenantId?: string; businessName?: string; siteData?: any;
}) {
    const [form, setForm] = useState({ name: '', email: '', phone: '', checkIn: initialCheckIn || '', checkOut: initialCheckOut || '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'property' | 'now'>('property');
    const [payNowOption, setPayNowOption] = useState<'advance' | 'full'>('advance');

    const nights = form.checkIn && form.checkOut
        ? Math.max(0, Math.floor((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000))
        : 0;

    const baseTotal = nights * adjustedPrice(room.price_per_night);
    const hasFullDiscount = paymentMethod === 'now' && payNowOption === 'full';
    const finalTotal = hasFullDiscount ? Math.round(baseTotal * 0.9) : baseTotal;
    const advanceAmountToPay = paymentMethod === 'property'
        ? 0
        : (payNowOption === 'advance' ? Math.round(baseTotal * 0.2) : finalTotal);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if ((window as any).Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleCreateBooking = async (paidAdvance: number) => {
        const { data, error: rpcError } = await supabase.rpc('create_public_booking', {
            p_subdomain: subdomain,
            p_guest_name: form.name,
            p_guest_email: form.email,
            p_guest_phone: form.phone,
            p_room_id: room.id,
            p_check_in: form.checkIn,
            p_check_out: form.checkOut,
            p_amount: finalTotal,
            p_advance_amount: paidAdvance,
        });

        if (rpcError) { setError(rpcError.message); setLoading(false); return; }
        if (data?.error) { setError(data.error); setLoading(false); return; }

        // Trigger WhatsApp confirmation
        if (form.phone && tenantId && businessName) {
            sendWhatsAppConfirmation({
                guestName: form.name,
                guestPhone: form.phone,
                roomType: room.type,
                roomNumber: (room as any).room_number || undefined,
                checkIn: form.checkIn,
                checkOut: form.checkOut,
                reservationId: data.booking_id,
                businessName: businessName,
                guestToken: data.token,
            }, tenantId);
        }

        // Trigger Email confirmation (Guest + Owner)
        triggerBookingEmails({
            reservationId: data.booking_id,
            guestName: form.name,
            guestEmail: form.email || '',
            guestPhone: form.phone,
            roomType: room.type || room.name || 'Standard Room',
            roomNumber: (room as any).room_number || '',
            checkIn: form.checkIn,
            checkOut: form.checkOut,
            amount: finalTotal,
            gstAmount: Math.round(finalTotal - (finalTotal / 1.12)),
            paymentStatus: paidAdvance > 0 || paymentMethod !== 'property' ? 'Paid' : 'Unpaid',
            source: 'Website',
            businessName: businessName || 'Our Hotel',
            businessAddress: siteData?.cms_settings?.contactAddress || '',
            businessPhone: siteData?.cms_settings?.contactPhone || '',
            ownerEmail: siteData?.tenant?.custom_email,
            guestToken: data.token,
        });

        setLoading(false);
        onSuccess(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (paymentMethod === 'property') {
            await handleCreateBooking(0);
        } else {
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                setError('Failed to load Razorpay payment gateway. Please try again.');
                setLoading(false);
                return;
            }

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_TASEzH1nUWAH3h',
                amount: advanceAmountToPay * 100, // in paise
                currency: 'INR',
                name: 'Triplooper',
                description: `Room Booking at ${businessName || 'Property'}`,
                prefill: {
                    name: form.name,
                    email: form.email,
                    contact: form.phone
                },
                theme: {
                    color: '#0E2A38'
                },
                handler: async function (response: any) {
                    toast.success(`Payment successful! ID: ${response.razorpay_payment_id}`);
                    await handleCreateBooking(advanceAmountToPay);
                },
                modal: {
                    ondismiss: function () {
                        setError('Payment was cancelled.');
                        setLoading(false);
                    }
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative h-28 bg-gradient-to-br from-primary to-primary-hover p-6 flex flex-col justify-end">
                    <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                        <X size={16} />
                    </button>
                    <h3 className="text-white font-bold text-lg leading-tight">{room.name}</h3>
                    <p className="text-white/60 text-xs mt-0.5">{room.type}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    {error && <div className="text-red-650 text-xs bg-red-50 px-3 py-2 rounded-lg font-medium">{error}</div>}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Check-in</label>
                            <input type="date" required value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Check-out</label>
                            <input type="date" required value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })}
                                min={form.checkIn || new Date().toISOString().split('T')[0]}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full name</label>
                        <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="John Doe"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                placeholder="you@email.com"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                            <input type="tel" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                placeholder="+91 98765 43210"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                        </div>
                    </div>

                    {nights > 0 && (
                        <div className="space-y-3.5 pt-1.5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Payment Method</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('property')}
                                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                            paymentMethod === 'property'
                                                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                                        }`}
                                    >
                                        <p className="text-xs font-bold">Pay at Property</p>
                                        <p className="text-[10px] text-gray-400 mt-1 font-light">Pay cash/card on arrival</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('now')}
                                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                            paymentMethod === 'now'
                                                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                                        }`}
                                    >
                                        <p className="text-xs font-bold">Pay Now (Online)</p>
                                        <p className="text-[10px] text-gray-400 mt-1 font-light">Secure online payment</p>
                                    </button>
                                </div>
                            </div>

                            {paymentMethod === 'now' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="bg-gray-55 bg-gray-50 border border-gray-150 p-3 rounded-xl space-y-2"
                                >
                                    <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Select Pay Now Option</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPayNowOption('advance')}
                                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                                payNowOption === 'advance'
                                                    ? 'border-[#0E2A38] bg-white text-[#0E2A38] ring-1 ring-[#0E2A38]'
                                                    : 'border-gray-200 bg-white text-gray-650 hover:border-gray-300'
                                            }`}
                                        >
                                            <p className="text-xs font-bold">20% Advance</p>
                                            <p className="text-xs font-extrabold mt-1 text-gray-800">₹{Math.round(baseTotal * 0.2).toLocaleString('en-IN')}</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPayNowOption('full')}
                                            className={`p-2.5 rounded-lg border text-left transition-all relative overflow-hidden cursor-pointer ${
                                                payNowOption === 'full'
                                                    ? 'border-[#0E2A38] bg-white text-[#0E2A38] ring-1 ring-[#0E2A38]'
                                                    : 'border-gray-200 bg-white text-gray-650 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="absolute top-0 right-0 bg-[#C9A646] text-white text-[7px] font-black uppercase px-1 py-0.5 rounded-bl">
                                                -10%
                                            </div>
                                            <p className="text-xs font-bold">Full Payment</p>
                                            <p className="text-xs font-extrabold mt-1 text-gray-800">₹{Math.round(baseTotal * 0.9).toLocaleString('en-IN')}</p>
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            <div className="bg-[#F7F4EF] rounded-xl p-4 space-y-1.5 border border-gray-150 text-sm">
                                <div className="flex items-center justify-between text-gray-600">
                                    <span>{nights} night{nights > 1 ? 's' : ''} stay</span>
                                    <span>₹{baseTotal.toLocaleString('en-IN')}</span>
                                </div>
                                {hasFullDiscount && (
                                    <div className="flex items-center justify-between text-xs text-emerald-600 font-bold">
                                        <span>10% Full Payment Discount</span>
                                        <span>- ₹{Math.round(baseTotal * 0.1).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                <div className="border-t border-gray-200/60 pt-1.5 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Total Price</p>
                                        <p className="text-[9px] text-gray-400">Taxes & fees included</p>
                                    </div>
                                    <p className="text-lg font-black text-[#0E2A38]">₹{finalTotal.toLocaleString('en-IN')}</p>
                                </div>

                                {paymentMethod === 'now' && (
                                    <div className="border-t border-dashed border-gray-200 pt-1.5 flex items-center justify-between text-xs">
                                        <span className="font-bold text-gray-600">Due Now via Razorpay</span>
                                        <span className="font-black text-[#C9A646] text-sm">₹{advanceAmountToPay.toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md">
                        {loading ? 'Processing...' : (paymentMethod === 'now' ? `Pay & Confirm Booking` : 'Confirm Booking')}
                        {!loading && <ArrowRight size={16} />}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

// --- Booking confirmation ---
function BookingConfirmation({ data, onClose }: { data: any; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                    <Check size={30} className="text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Booking confirmed</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Your reservation <span className="font-semibold text-primary">{data.booking_id}</span> has been received.
                </p>
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Room</span>
                        <span className="font-medium">{data.room}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Duration</span>
                        <span className="font-medium">{data.nights} night{data.nights > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total</span>
                        <span className="font-bold text-primary">₹{Number(data.amount).toLocaleString()}</span>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mb-4">You'll receive a confirmation email shortly.</p>
                <button onClick={onClose} className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-hover transition-all text-sm">
                    Done
                </button>
            </motion.div>
        </motion.div>
    );
}

// =========================================================================
// TABLE BOOKING MODAL (for restaurant built-in booking mode)
// =========================================================================
function TableBookingModal({ tenantName, subdomain, onClose, onSuccess }: {
    tenantName: string; subdomain: string;
    onClose: () => void; onSuccess: (data: any) => void;
}) {
    const [form, setForm] = useState({
        guest_name: '', guest_phone: '', guest_count: 2,
        reservation_date: '', reservation_time: '19:00', special_request: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.guest_name || !form.guest_phone || !form.reservation_date) {
            toast.error('Please fill in all required fields');
            return;
        }
        setSubmitting(true);
        try {
            const { data, error } = await supabase.rpc('create_table_reservation', {
                p_subdomain: subdomain,
                p_guest_name: form.guest_name,
                p_guest_phone: form.guest_phone,
                p_guest_count: form.guest_count,
                p_reservation_date: form.reservation_date,
                p_reservation_time: form.reservation_time,
                p_special_request: form.special_request || null,
            });
            if (error) throw error;
            if (data?.error) { toast.error(data.error); setSubmitting(false); return; }
            onSuccess(data);
        } catch (err: any) {
            toast.error('Booking failed: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-primary p-6 text-white">
                    <h3 className="text-xl font-bold">Book a Table</h3>
                    <p className="text-white/70 text-sm mt-1">{tenantName}</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name *</label>
                        <input type="text" value={form.guest_name} onChange={e => update('guest_name', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none" placeholder="Your name" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone *</label>
                        <input type="tel" value={form.guest_phone} onChange={e => update('guest_phone', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none" placeholder="+91 98765 43210" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date *</label>
                            <input type="date" min={today} value={form.reservation_date} onChange={e => update('reservation_date', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Time *</label>
                            <input type="time" value={form.reservation_time} onChange={e => update('reservation_time', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Guests</label>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => update('guest_count', Math.max(1, form.guest_count - 1))}
                                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-500">
                                <Minus size={16} />
                            </button>
                            <span className="text-lg font-bold text-primary min-w-[40px] text-center">{form.guest_count}</span>
                            <button type="button" onClick={() => update('guest_count', Math.min(20, form.guest_count + 1))}
                                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-500">
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Special request</label>
                        <textarea rows={2} value={form.special_request} onChange={e => update('special_request', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary/30 outline-none resize-none"
                            placeholder="Birthday, window seat, dietary needs..." />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl text-sm hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {submitting ? 'Booking...' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// =========================================================================
// MAIN TENANT SITE COMPONENT
// =========================================================================
export default function TenantSite() {
    const { subdomain: pathSubdomain } = useParams<{ subdomain?: string }>();
    const hostSubdomain = getSubdomain();
    const subdomain = pathSubdomain || hostSubdomain || '';

    const [siteData, setSiteData] = useState<SiteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
    const [bookingSuccess, setBookingSuccess] = useState<any>(null);
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [activeMenuCat, setActiveMenuCat] = useState<number | null>(null);
    const [menuSearch, setMenuSearch] = useState('');
    const [pageContent, setPageContent] = useState<any[]>([]);
    const [nearbyAttractions, setNearbyAttractions] = useState<string[]>([]);
    // Table booking modal state
    const [showTableBooking, setShowTableBooking] = useState(false);
    const [tableBookingSuccess, setTableBookingSuccess] = useState<any>(null);

    // Parse query params for checkIn, checkOut, guests
    const queryParams = new URLSearchParams(window.location.search);
    const paramCheckIn = queryParams.get('checkIn') || '';
    const paramCheckOut = queryParams.get('checkOut') || '';
    const paramGuests = parseInt(queryParams.get('guests') || '2', 10);

    // Hero booking strip state
    const [heroCheckIn, setHeroCheckIn] = useState(paramCheckIn);
    const [heroCheckOut, setHeroCheckOut] = useState(paramCheckOut);
    const [heroGuests, setHeroGuests] = useState(paramGuests);
    const heroCheckInRef = useRef<HTMLInputElement>(null);
    const heroCheckOutRef = useRef<HTMLInputElement>(null);

    // Occupancy-based pricing
    const { adjustedPrice } = useTenantOccupancyPricing(
        siteData?.tenant?.id,
        siteData?.rooms || []
    );

    // Sticky mobile bar
    const [showStickyBar, setShowStickyBar] = useState(false);
    const { scrollY } = useScroll();
    useMotionValueEvent(scrollY, 'change', (latest) => {
        setShowStickyBar(latest > 600);
    });

    useEffect(() => {
        if (!subdomain) return;
        (async () => {
            const { data, error } = await supabase.rpc('get_tenant_site', { p_subdomain: subdomain });
            if (error || !data || !data.tenant) { setNotFound(true); setLoading(false); return; }
            setSiteData(data);

            const { data: contentData } = await supabase.from('page_content').select('*').eq('tenant_id', data.tenant.id);
            if (contentData) setPageContent(contentData);

            // Fetch nearby attractions
            const { data: attractData } = await supabase.from('cms_settings').select('setting_value').eq('tenant_id', data.tenant.id).eq('setting_key', 'nearby_attractions').maybeSingle();
            if (attractData?.setting_value) {
                try { setNearbyAttractions(JSON.parse(attractData.setting_value)); } catch {}
            }

            // Fetch menu data for restaurant/combined tenants
            const bType = data.tenant.business_type;
            if (bType === 'restaurant' || bType === 'combined') {
                const [catRes, itemRes] = await Promise.all([
                    supabase.from('menu_categories').select('*').eq('tenant_id', data.tenant.id).eq('is_active', true).order('sort_order'),
                    supabase.from('menu_items').select('*').eq('tenant_id', data.tenant.id).eq('is_available', true).order('sort_order'),
                ]);
                if (catRes.data) setMenuCategories(catRes.data);
                if (itemRes.data) setMenuItems(itemRes.data);
                if (catRes.data && catRes.data.length > 0) setActiveMenuCat(catRes.data[0].id);
            }

            setLoading(false);
        })();
    }, [subdomain]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background animate-pulse">
                {/* Skeleton navbar */}
                <div className="h-16 bg-white/80 border-b border-gray-100/80" />
                {/* Skeleton hero */}
                <div className="h-[60vh] bg-gray-200/50" />
                {/* Skeleton booking strip */}
                <div className="max-w-5xl mx-auto -mt-8 px-6">
                    <div className="h-24 bg-white rounded-2xl shadow-sm" />
                </div>
                {/* Skeleton room cards */}
                <div className="max-w-6xl mx-auto px-6 py-28">
                    <div className="h-8 w-48 bg-gray-200/60 rounded mx-auto mb-16" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                                <div className="h-64 bg-gray-200/50" />
                                <div className="p-5 space-y-3">
                                    <div className="h-5 w-32 bg-gray-200/60 rounded" />
                                    <div className="h-4 w-full bg-gray-100 rounded" />
                                    <div className="h-10 w-full bg-gray-100 rounded-xl mt-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (notFound || !siteData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-primary">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-white/10 mb-4">404</h1>
                    <p className="text-white/50 text-lg mb-2">Property not found</p>
                    <p className="text-white/30 text-sm">This site doesn't exist or has been deactivated.</p>
                </div>
            </div>
        );
    }

    const { tenant, rooms, testimonials, settings, chef_specials = [], gallery = [] } = siteData;

    const isApple = tenant.template === 'apple';

    const themeStyles = {
        '--color-primary': isApple ? '#0071e3' : (settings.primary_color || '#ff385c'),
        '--color-primary-hover': isApple ? '#0062c4' : (settings.primary_color_hover || settings.primary_color || '#e00b41'),
        '--color-accent': isApple ? '#0071e3' : (settings.accent_color || '#ff385c'),
        '--color-accent-hover': isApple ? '#0062c4' : (settings.accent_color_hover || settings.accent_color || '#e00b41'),
        '--color-background': isApple ? '#ffffff' : (settings.bg_color || '#ffffff'),
        '--color-foreground': isApple ? '#1d1d1f' : (settings.text_color || '#222222'),
        '--font-sans': isApple ? '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' : undefined,
        '--font-serif': isApple ? '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' : undefined,
    } as React.CSSProperties;

    const getContent = (section: string, key: string, field: 'content_text' | 'image_url' = 'content_text') => {
        const block = pageContent.find(p => p.section === section && p.block_key === key);
        return block && block[field] ? block[field] : null;
    };

    const isHotel = tenant.business_type === 'hotel' || tenant.business_type === 'combined';
    const isRestaurant = tenant.business_type === 'restaurant' || tenant.business_type === 'combined';
    const vis = tenant.sections_visible || { hero: true, rooms: true, testimonials: true, about: true, contact: true, menu: true };

    const contactEmail = settings.contactEmail || getContent('contact', 'email') || '';
    const contactPhone = settings.contactPhone || getContent('contact', 'phone') || '';
    const contactAddress = settings.contactAddress || getContent('contact', 'address') || '';
    const googleMapsUrl = settings.googleMapsUrl || '';
    const heroTitle = settings.heroTitle || getContent('hero', 'title') || tenant.business_name;
    const heroSubtitle = settings.heroSubtitle || getContent('hero', 'subtitle') || (isRestaurant ? 'A culinary experience worth savoring' : 'Experience comfort and luxury');
    const aboutText = settings.aboutText || getContent('about', 'body') || '';

    const heroBtn = getContent('hero', 'button_text') || 'Book now';
    const aboutHeading = getContent('about', 'heading') || tenant.business_name;
    const heroBgImage = getContent('hero', 'bgImage', 'image_url') || tenant.hero_image_url;
    const optionalAboutImage = getContent('about', 'aboutImage', 'image_url');

    // Restaurant-specific settings
    const bookingMode = settings.bookingMode || 'whatsapp';
    const priceRange = settings.priceRange || '₹₹';
    const cuisineType = settings.cuisineType || '';
    const operatingHoursOpen = settings.operatingHoursOpen || '12:00 PM';
    const operatingHoursClose = settings.operatingHoursClose || '11:00 PM';
    const externalBookingUrl = settings.externalBookingUrl || '';
    const avgRating = testimonials.length > 0 ? (testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length).toFixed(1) : null;

    const whatsappNumberOverride = getContent('contact', 'whatsapp') || settings.whatsappNumber;
    const whatsappBase = whatsappNumberOverride || contactPhone;
    const whatsappNumber = whatsappBase.replace(/[\s\(\)\-\+]/g, '');
    const buildWhatsAppOrderUrl = () => {
        const text = encodeURIComponent(`Hi, I'd like to place an order from ${tenant.business_name}. Can I see the menu?`);
        return `https://wa.me/${whatsappNumber}?text=${text}`;
    };
    const buildWhatsAppTableUrl = (guests?: number, date?: string, time?: string) => {
        const lines = [`Hi, I'd like to book a table at ${tenant.business_name}.`];
        if (date) lines.push(`Date: ${date}`);
        if (time) lines.push(`Time: ${time}`);
        if (guests) lines.push(`Guests: ${guests}`);
        return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
    };

    const handleBookTable = () => {
        if (bookingMode === 'external' && externalBookingUrl) {
            window.open(externalBookingUrl, '_blank');
        } else if (bookingMode === 'builtin') {
            setShowTableBooking(true);
        } else {
            window.open(buildWhatsAppTableUrl(), '_blank');
        }
    };

    const handleHeroBook = () => {
        if (isRestaurant && !isHotel) {
            handleBookTable();
        } else {
            const el = document.getElementById('rooms');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div id="main-content" style={themeStyles} className="min-h-screen bg-background font-sans text-gray-900 antialiased overflow-x-hidden">
            <Helmet>
                <title>{tenant.business_name} - Book Direct | Rooms, Dining & More</title>
                <meta name="description" content={`Book your stay at ${tenant.business_name}. View rooms, prices, amenities, and reserve directly for the best rates. Powered by Trip Looper.`} />
                <link rel="canonical" href={`https://${tenant.subdomain}.triplooper.com/`} />
                <meta property="og:title" content={`${tenant.business_name} - Book Direct`} />
                <meta property="og:description" content={`View rooms, prices, and amenities at ${tenant.business_name}. Reserve directly for the best rates.`} />
                <meta property="og:url" content={`https://${tenant.subdomain}.triplooper.com/`} />
                <meta property="og:type" content="website" />
                {tenant.hero_image_url && <meta property="og:image" content={tenant.hero_image_url} />}
                {tenant.logo_url && <meta property="og:image" content={tenant.logo_url} />}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${tenant.business_name} - Book Direct`} />
                <meta name="twitter:description" content={`Book your stay at ${tenant.business_name}. Best rates guaranteed.`} />
                <script type="application/ld+json">{JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": tenant.business_type === 'restaurant' ? "Restaurant" : "LodgingBusiness",
                    "name": tenant.business_name,
                    "url": `https://${tenant.subdomain}.triplooper.com/`,
                    ...(tenant.logo_url && { "logo": tenant.logo_url }),
                    ...(tenant.hero_image_url && { "image": tenant.hero_image_url }),
                    ...(rooms.length > 0 && tenant.business_type !== 'restaurant' && {
                        "hasOfferCatalog": {
                            "@type": "OfferCatalog",
                            "name": "Rooms",
                            "itemListElement": rooms.slice(0, 5).map(r => ({
                                "@type": "Offer",
                                "itemOffered": {
                                    "@type": "HotelRoom",
                                    "name": r.name,
                                    "description": r.description,
                                    "occupancy": { "@type": "QuantitativeValue", "value": r.max_occupancy }
                                },
                                "price": r.price_per_night,
                                "priceCurrency": "INR"
                            }))
                        }
                    })
                })}</script>
            </Helmet>
            {/* ===== NAVBAR ===== */}
            <nav className={
                isApple 
                ? "fixed top-0 inset-x-0 z-40 bg-[#000000]/80 backdrop-blur-md saturate-[180%] border-b border-white/10 text-white"
                : "fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/80"
            }>
                <div className={`max-w-6xl mx-auto px-6 ${isApple ? 'h-12' : 'h-16'} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        {tenant.logo_url ? (
                            <img src={tenant.logo_url} alt={`${tenant.business_name} logo`} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                            <div className={`w-8 h-8 rounded-lg ${isApple ? 'bg-white/10 text-white' : 'bg-primary text-white'} flex items-center justify-center`}>
                                <span className="font-bold text-sm">{tenant.business_name.charAt(0)}</span>
                            </div>
                        )}
                        <span className={`tracking-tight ${isApple ? 'font-sans font-normal text-xs text-white/90' : 'font-serif font-bold text-primary'}`}>{tenant.business_name}</span>
                    </div>
                    <div className={`hidden md:flex items-center gap-8 ${isApple ? 'text-[12px] font-normal text-white/70' : 'text-sm'}`}>
                        {isHotel && <a href="#rooms" className={isApple ? "hover:text-white transition-colors" : "text-gray-500 hover:text-gray-900 transition-colors font-medium"}>Rooms</a>}
                        {isRestaurant && menuCategories.length > 0 && <a href="#menu" className={isApple ? "hover:text-white transition-colors" : "text-gray-500 hover:text-gray-900 transition-colors font-medium"}>Menu</a>}
                        {testimonials.length > 0 && <a href="#reviews" className={isApple ? "hover:text-white transition-colors" : "text-gray-500 hover:text-gray-900 transition-colors font-medium"}>Reviews</a>}
                        {aboutText && <a href="#about" className={isApple ? "hover:text-white transition-colors" : "text-gray-500 hover:text-gray-900 transition-colors font-medium"}>About</a>}
                        <a href="#location" className={isApple ? "hover:text-white transition-colors" : "text-gray-500 hover:text-gray-900 transition-colors font-medium"}>Location</a>
                        <a href="#contact" className={isApple ? "hover:text-white transition-colors" : "text-gray-500 hover:text-gray-900 transition-colors font-medium"}>Contact</a>
                    </div>
                    {isHotel ? (
                        <a href="#rooms" className={
                            isApple 
                            ? "bg-[#0071e3] text-white text-[12px] font-normal px-4 py-1.5 rounded-full hover:bg-[#0077ed] transition-all"
                            : "bg-primary text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-primary-hover transition-all shadow-sm hover:shadow-md"
                        }>Book now</a>
                    ) : (
                        <a href={buildWhatsAppOrderUrl()} target="_blank" rel="noopener noreferrer" className={
                            isApple
                            ? "bg-[#0071e3] text-white text-[12px] font-normal px-4 py-1.5 rounded-full hover:bg-[#0077ed] transition-all flex items-center gap-1.5"
                            : "bg-green-500 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-green-600 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                        }>
                            <MessageCircle size={14} /> Order now
                        </a>
                    )}
                </div>
            </nav>

            {/* ===== HERO ===== */}
            {vis.hero !== false && (
                <section className="relative pt-16 min-h-[65vh] flex flex-col justify-center">
                    {/* Background Wrapper */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                        {heroBgImage ? (
                            <>
                                <img src={heroBgImage} alt={`${tenant.business_name} property`} className="absolute inset-0 w-full h-full object-cover" fetchPriority="high" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />
                            </>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
                        )}
                        {/* Decorative */}
                        <div className="absolute top-20 right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background/90 to-transparent backdrop-blur-[2px] z-10 pointer-events-none" />
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                            backgroundSize: '60px 60px'
                        }} />
                    </div>

                    {/* Hero content */}
                    <div className="relative z-20 flex-1 flex flex-col justify-center max-w-6xl mx-auto px-6 pt-24 pb-32 md:pt-32 md:pb-40 w-full text-center md:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            className="max-w-3xl mx-auto md:mx-0 flex flex-col items-center md:items-start"
                        >
                            <h1
                                className={isApple ? "font-sans text-4xl md:text-5xl lg:text-[56px] font-semibold text-white leading-[1.07] tracking-[-0.03em] mb-6 whitespace-pre-line" : "font-serif text-4xl md:text-5xl lg:text-[64px] font-bold text-white leading-[1.15] tracking-tight mb-6"}
                            >
                                {heroTitle.split(',').join('\n')}
                            </h1>
                            <p className={isApple ? "text-lg md:text-[21px] text-white/80 leading-[1.19] tracking-[0.01em] mb-10 max-w-2xl font-normal" : "text-lg md:text-[20px] text-white/95 leading-relaxed mb-10 max-w-2xl font-light"}>
                                {heroSubtitle}
                            </p>

                            {/* Quick stats - Glass strip */}
                            <div className="inline-flex flex-wrap justify-center md:justify-start items-center gap-4 md:gap-6 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg shadow-black/5 rounded-2xl md:rounded-full px-6 py-3">
                                {avgRating && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-accent">★</span>
                                        <span className="text-white font-semibold">{avgRating}</span>
                                        <span className="text-white/60 text-sm">rating</span>
                                    </div>
                                )}
                                {isRestaurant && !isHotel && (
                                    <>
                                        {avgRating && <span className="text-white/20">|</span>}
                                        <span className="text-white font-semibold text-sm">{priceRange}</span>
                                        <span className="text-white/20">|</span>
                                        <span className="text-white/80 text-sm">Open until {operatingHoursClose}</span>
                                    </>
                                )}
                                {isHotel && rooms.length > 0 && (
                                    <>
                                        {avgRating && <span className="text-white/20">|</span>}
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-semibold">{rooms.length}</span>
                                            <span className="text-white/80 text-sm">Rooms</span>
                                        </div>
                                    </>
                                )}
                                {isRestaurant && menuItems.length > 0 && isHotel && (
                                    <>
                                        <span className="text-white/20">|</span>
                                        <div className="flex items-center gap-2">
                                            <UtensilsCrossed size={14} className="text-accent" />
                                            <span className="text-white font-semibold">{menuItems.length}</span>
                                            <span className="text-white/80 text-sm">Dishes</span>
                                        </div>
                                    </>
                                )}
                                {isHotel && rooms.length > 0 && (
                                    <>
                                        <span className="text-white/20 hidden md:inline">|</span>
                                        <span className="text-white font-semibold hidden md:inline flex items-center gap-1">
                                            <span className="text-accent text-xs font-normal">₹</span>
                                            {Math.min(...rooms.map(r => adjustedPrice(r.price_per_night))).toLocaleString()}
                                            <span className="text-white/60 font-normal text-xs ml-1">starting</span>
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Hero CTAs */}
                            <div className="flex flex-wrap gap-3 mt-8">
                                {isRestaurant && !isHotel ? (
                                    <>
                                        <button onClick={handleBookTable}
                                            className={
                                                isApple
                                                ? "bg-[#0071e3] text-white font-normal px-8 py-3 rounded-full text-sm hover:bg-[#0077ed] transition-all flex items-center gap-2 shadow-sm"
                                                : "bg-accent text-primary font-bold px-8 py-3.5 rounded-xl text-sm shadow-lg shadow-accent/20 flex items-center gap-2 hover:bg-accent-hover transition-all"
                                            }>
                                            Book a Table <ArrowRight size={16} />
                                        </button>
                                        <a href="#menu"
                                            className={
                                                isApple
                                                ? "bg-transparent text-white hover:underline font-normal px-6 py-3 text-sm flex items-center gap-1.5"
                                                : "bg-white/10 backdrop-blur-sm text-white font-semibold px-8 py-3.5 rounded-xl text-sm border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2"
                                            }>
                                            View Menu <UtensilsCrossed size={14} />
                                        </a>
                                    </>
                                ) : null}
                            </div>
                        </motion.div>
                    </div>

                    {/* ===== INLINE BOOKING STRIP (Hotel only) ===== */}
                    {isHotel && (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="sticky top-[60px] md:relative z-40 w-full px-4 md:px-6 max-w-5xl mx-auto pb-6 md:pb-0 md:-mb-10 mt-6 md:mt-0"
                        >
                            <div className={
                                isApple
                                ? "bg-white rounded-xl shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] overflow-hidden"
                                : "bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-white/40 overflow-hidden"
                            }>
                                <div className="grid grid-cols-1 md:grid-cols-4 items-stretch">
                                    {/* Check-in */}
                                    <div 
                                        onClick={() => (heroCheckInRef.current as any)?.showPicker?.()}
                                        className="p-5 md:p-6 flex flex-col gap-1 relative border-b md:border-b-0 md:border-r border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                    >
                                        <label className="absolute inset-0 w-full h-full cursor-pointer z-10">
                                            <input ref={heroCheckInRef} type="date" min={new Date().toISOString().split('T')[0]}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                onChange={(e) => {
                                                    setHeroCheckIn(e.target.value);
                                                    if (heroCheckOut && new Date(e.target.value) >= new Date(heroCheckOut)) {
                                                        const next = new Date(e.target.value); next.setDate(next.getDate() + 1);
                                                        setHeroCheckOut(next.toISOString().split('T')[0]);
                                                    }
                                                }} />
                                        </label>
                                        <span className="text-[10px] tracking-[0.15em] text-gray-400 uppercase font-bold">Check-in</span>
                                        <div className="flex items-center gap-3 text-primary font-bold">
                                            <Calendar size={18} className="text-accent group-hover:scale-110 transition-transform" />
                                            <span className="text-[15px]">{heroCheckIn ? new Date(heroCheckIn + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Select date'}</span>
                                        </div>
                                    </div>

                                    {/* Check-out */}
                                    <div 
                                        onClick={() => (heroCheckOutRef.current as any)?.showPicker?.()}
                                        className="p-5 md:p-6 flex flex-col gap-1 relative border-b md:border-b-0 md:border-r border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                    >
                                        <label className="absolute inset-0 w-full h-full cursor-pointer z-10">
                                            <input ref={heroCheckOutRef} type="date" min={heroCheckIn || new Date().toISOString().split('T')[0]}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                onChange={(e) => setHeroCheckOut(e.target.value)} />
                                        </label>
                                        <span className="text-[10px] tracking-[0.15em] text-gray-400 uppercase font-bold">Check-out</span>
                                        <div className="flex items-center gap-3 text-primary font-bold">
                                            <Calendar size={18} className="text-accent group-hover:scale-110 transition-transform" />
                                            <span className="text-[15px]">{heroCheckOut ? new Date(heroCheckOut + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Select date'}</span>
                                        </div>
                                    </div>

                                    {/* Guests */}
                                    <div className="p-5 md:p-6 flex flex-col gap-1 border-b md:border-b-0 md:border-r border-gray-100">
                                        <span className="text-[10px] tracking-[0.15em] text-gray-400 uppercase font-bold">Guests</span>
                                        <div className="flex items-center gap-4">
                                            <Users size={18} className="text-accent" />
                                            <div className="flex items-center gap-3">
                                                <button type="button" onClick={() => setHeroGuests(Math.max(1, heroGuests - 1))}
                                                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-500 hover:border-gray-300">
                                                    <Minus size={14} />
                                                </button>
                                                <div className="flex flex-col items-center min-w-[60px]">
                                                    <span className="text-sm font-bold text-primary leading-tight">{heroGuests}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">Guests</span>
                                                </div>
                                                <button type="button" onClick={() => setHeroGuests(Math.min(16, heroGuests + 1))}
                                                    disabled={heroGuests >= 16}
                                                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="p-5 md:p-6 flex items-center justify-center bg-gray-50/30">
                                        <button
                                            onClick={handleHeroBook}
                                            className={
                                                isApple
                                                ? "w-full bg-[#0071e3] text-white font-normal px-6 py-3.5 rounded-full hover:bg-[#0077ed] transition-all text-[15px] flex items-center justify-center gap-2 whitespace-nowrap shadow-none"
                                                : "w-full bg-primary text-primary-foreground font-bold px-6 py-4 rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/5 text-[15px] flex items-center justify-center gap-2 whitespace-nowrap group"
                                            }
                                        >
                                            Check Availability
                                            <ArrowRight size={18} className={isApple ? "" : "group-hover:translate-x-1 transition-transform"} />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-[#FAF9F6] py-3 text-center border-t border-gray-100">
                                    <p className="text-[10px] tracking-[0.15em] text-gray-400 uppercase font-semibold flex items-center justify-center gap-4">
                                        <span>BEST RATE GUARANTEE</span>
                                        <span className="w-1 h-1 bg-amber-400 rounded-full" />
                                        <span>NO FEES</span>
                                        <span className="w-1 h-1 bg-amber-400 rounded-full" />
                                        <span>FREE CANCEL</span>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </section>
            )}

            {/* ===== OPERATING HOURS STRIP (Restaurant) ===== */}
            {isRestaurant && (
                <div className={isApple ? "bg-[#f5f5f7] border-y border-gray-200/50" : "bg-primary/5 border-y border-primary/10"}>
                    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-sm font-semibold text-primary">Open Today</span>
                        </div>
                        <span className="text-sm text-gray-600">{operatingHoursOpen} – {operatingHoursClose}</span>
                        {cuisineType && (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className="text-sm text-gray-500">{cuisineType}</span>
                            </>
                        )}
                        {priceRange && (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className="text-sm font-semibold text-primary">{priceRange}</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ===== QUICK HIGHLIGHTS / AMENITIES ===== */}
            {isHotel && (
                <section className={isApple ? "pt-16 pb-12 px-6 bg-[#f5f5f7] border-none hidden md:block" : "pt-24 pb-12 md:pt-36 md:pb-20 px-6 bg-white border-b border-gray-100 hidden md:block"}>
                    <div className="max-w-5xl mx-auto grid grid-cols-3 md:grid-cols-6 gap-6">
                        {[
                            { label: 'Free WiFi', icon: Wifi },
                            { label: 'Air Conditioned', icon: Wind },
                            { label: 'Free Parking', icon: Car },
                            { label: '24/7 Check-in', icon: Clock },
                            { label: 'Room Service', icon: Coffee },
                            { label: 'Daily Cleaning', icon: Sparkles }
                        ].map((amenity, idx) => {
                            const Icon = amenity.icon;
                            return (
                                <div key={idx} className="flex flex-col items-center text-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                                    <Icon size={24} className="text-gray-400 mb-1" />
                                    <span className="text-xs font-semibold text-gray-700 tracking-wide">{amenity.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ===== CHEF'S SPECIALS (Restaurant) ===== */}
            {isRestaurant && chef_specials.length > 0 && (
                <section className="py-16 md:py-24 px-6 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <p className="text-xs font-semibold text-accent uppercase tracking-[0.2em] mb-3">Handpicked for you</p>
                            <h2 className={isApple ? "text-3xl md:text-[40px] font-semibold text-foreground tracking-tight leading-[1.10]" : "text-3xl md:text-5xl font-bold text-primary tracking-tight"}>Chef's signature dishes</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {chef_specials.map((dish, i) => (
                                <motion.div
                                    key={dish.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.6 }}
                                    className={isApple ? "group relative bg-white rounded-xl overflow-hidden shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] transition-all" : "group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 hover:border-gray-200"}
                                >
                                    <div className="relative h-56 overflow-hidden">
                                        {dish.image_url ? (
                                            <img src={dish.image_url} alt={dish.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                                                <UtensilsCrossed size={32} className="text-amber-300" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3">
                                            <span className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center ${dish.is_veg ? 'border-green-600' : 'border-red-600'}`}>
                                                <span className={`w-2.5 h-2.5 rounded-full ${dish.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
                                            </span>
                                        </div>
                                        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md">
                                            <span className={`font-semibold ${isApple ? 'text-[#1d1d1f]' : 'text-primary'}`}>₹{dish.price}</span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className={`font-semibold text-lg mb-1 ${isApple ? 'text-foreground' : 'text-primary'}`}>{dish.name}</h3>
                                        {dish.description && <p className="text-sm text-gray-500 line-clamp-2">{dish.description}</p>}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ===== ROOMS (Hotel only) ===== */}
            {isHotel && vis.rooms !== false && rooms.length > 0 && (
                <section id="rooms" className={isApple ? "py-16 md:py-24 px-6 bg-[#f5f5f7]" : "py-16 md:py-24 px-6"}>
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className={isApple ? "text-3xl md:text-[40px] font-semibold text-foreground tracking-tight leading-[1.10]" : "text-3xl md:text-5xl font-bold text-primary tracking-tight"}>Accommodation</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {rooms.map((room, i) => (
                                <motion.div
                                    key={room.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.6 }}
                                    className={isApple ? "group bg-white rounded-xl overflow-hidden shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px] transition-all duration-500 flex flex-col" : "group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-gray-200 flex flex-col"}
                                >
                                    {/* Room image -- 70% height aspect ratio via sizing */}
                                    <div className="relative h-72 md:h-80 overflow-hidden shrink-0">
                                        {room.images?.[0] ? (
                                            <img src={room.images[0]} alt={room.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            /* Elegant placeholder for missing images */
                                            <div className="w-full h-full bg-gradient-to-br from-primary/8 via-accent/5 to-primary/10 flex items-center justify-center backdrop-blur-sm">
                                                <div className="text-center">
                                                    <div className="w-14 h-14 rounded-2xl bg-white/80 shadow-sm flex items-center justify-center mx-auto mb-3">
                                                        <Camera size={24} className="text-primary/30" />
                                                    </div>
                                                    <p className="text-xs text-primary/40 font-medium">{room.type}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Price overlay on image */}
                                        <div className="absolute top-4 left-4">
                                            <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                                                <p className={`text-lg font-semibold ${isApple ? 'text-[#1d1d1f]' : 'text-primary'}`}>₹{adjustedPrice(room.price_per_night).toLocaleString()}<span className="text-[10px] font-normal text-gray-400 ml-0.5">/night</span></p>
                                            </div>
                                        </div>

                                        {/* Status tags on image */}
                                        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                                            {room.is_available === false ? (
                                                <div className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                                                    Sold Out
                                                </div>
                                            ) : (
                                                <div className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
                                                    <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                                    Available
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h3 className={`font-semibold text-xl mb-1 ${isApple ? 'text-foreground' : 'text-primary'}`}>{room.name}</h3>
                                                <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                                    <span>{room.max_occupancy} guests</span>
                                                    {room.amenities && room.amenities.length > 0 && (
                                                        <>
                                                            <span className="text-gray-300">•</span>
                                                            <span>{room.amenities.slice(0, 2).join(' • ')}</span>
                                                        </>
                                                    )}
                                                </p>
                                                {room.tourist_attractions && room.tourist_attractions.length > 0 && (
                                                    <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 font-semibold bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-lg w-fit">
                                                        <MapPin size={12} className="shrink-0" />
                                                        <span className="truncate max-w-[200px]">Near: {room.tourist_attractions.slice(0, 2).join(', ')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-6 flex gap-3">
                                            <Link
                                                to={hostSubdomain ? `/room/${room.id}` : `/site/${subdomain}/room/${room.id}`}
                                                className={isApple ? "flex-1 bg-transparent text-[#0066cc] hover:underline font-normal py-3 text-sm text-center" : "flex-1 bg-white text-primary font-semibold py-3 rounded-xl text-sm border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all text-center"}
                                            >
                                                Explore
                                            </Link>
                                            <button
                                                onClick={() => setBookingRoom(room)}
                                                className={isApple ? "flex-1 bg-[#0071e3] text-white font-normal py-3 rounded-full text-sm hover:bg-[#0077ed] transition-all" : "flex-1 bg-primary text-white font-semibold py-3 rounded-xl text-sm hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-sm"}
                                            >
                                                Book Now
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ===== RESTAURANT MENU ===== */}
            {isRestaurant && vis.menu !== false && menuCategories.length > 0 && (
                <section id="menu" className="py-28 px-6">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-16">
                            <p className="text-xs font-semibold text-accent uppercase tracking-[0.2em] mb-3">Our menu</p>
                            <h2 className={isApple ? "text-3xl md:text-[40px] font-semibold text-foreground tracking-tight leading-[1.10]" : "text-4xl md:text-5xl font-bold text-primary tracking-tight"}>What we serve</h2>
                            <p className="text-gray-500 mt-4 max-w-lg mx-auto">Fresh ingredients, bold flavors. Browse our menu and order via WhatsApp.</p>
                        </div>

                        {/* Category tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar justify-center">
                            {menuCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveMenuCat(cat.id)}
                                    className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${activeMenuCat === cat.id
                                        ? (isApple ? 'bg-[#1d1d1f] text-white shadow-none' : 'bg-primary text-white shadow-lg shadow-primary/20')
                                        : (isApple ? 'bg-[#f5f5f7] text-[#1d1d1f] border-none hover:bg-[#ebebeb]' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50')
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>

                        {/* Menu items grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {menuItems
                                .filter(item => item.category_id === activeMenuCat)
                                .map((item, i) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.05, duration: 0.4 }}
                                        className={isApple ? "bg-[#f5f5f7] rounded-xl p-4 flex gap-4 transition-all group border-none" : "bg-white rounded-xl border border-gray-100 p-4 flex gap-4 hover:shadow-md hover:border-gray-200 transition-all group"}
                                    >
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} loading="lazy" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center shrink-0">
                                                <span className="text-2xl">{item.is_veg ? '🥬' : '🍗'}</span>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center shrink-0 ${item.is_veg ? 'border-green-600' : 'border-red-600'}`}>
                                                        <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
                                                    </span>
                                                    <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                                                </div>
                                                <p className={`font-semibold text-sm whitespace-nowrap ${isApple ? 'text-foreground' : 'text-primary'}`}>₹{item.price}</p>
                                            </div>
                                            {item.description && (
                                                <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                                            )}
                                            {item.preparation_time_mins > 0 && (
                                                <p className="text-[10px] text-gray-300 mt-2 flex items-center gap-1">
                                                    <Clock size={10} /> {item.preparation_time_mins} min
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                        </div>

                        {/* WhatsApp order CTA */}
                        {contactPhone && (
                            <div className="text-center mt-16">
                                <a
                                    href={buildWhatsAppOrderUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={isApple ? "inline-flex items-center gap-3 bg-[#0071e3] text-white font-normal px-8 py-3.5 rounded-full hover:bg-[#0077ed] transition-all text-sm" : "inline-flex items-center gap-3 bg-green-500 text-white font-semibold px-8 py-4 rounded-xl hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 text-sm"}
                                >
                                    <MessageCircle size={20} />
                                    Order via WhatsApp
                                </a>
                                <p className="text-xs text-gray-400 mt-3">Send us your order and we'll confirm within minutes</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ===== GALLERY (Restaurant) ===== */}
            {isRestaurant && gallery.length > 0 && (
                <section id="gallery" className={isApple ? "py-16 md:py-24 px-6 bg-[#f5f5f7]" : "py-16 md:py-24 px-6 bg-gray-50"}>
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <p className="text-xs font-semibold text-accent uppercase tracking-[0.2em] mb-3">Our space</p>
                            <h2 className={isApple ? "text-3xl md:text-[40px] font-semibold text-foreground tracking-tight leading-[1.10]" : "text-3xl md:text-5xl font-bold text-primary tracking-tight"}>Gallery</h2>
                        </div>
                        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                            {gallery.map((img, i) => (
                                <motion.div
                                    key={img.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08, duration: 0.5 }}
                                    className="group relative break-inside-avoid rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all"
                                >
                                    <img src={img.image_url} alt={img.caption || 'Gallery'} loading="lazy" className="w-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    {img.caption && (
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-white text-sm font-medium">{img.caption}</p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ===== TESTIMONIALS -- 3-column grid ===== */}
            {vis.testimonials !== false && testimonials.length > 0 && (
                <section id="reviews" className={isApple ? "py-28 px-6 bg-black text-white" : "py-28 px-6 bg-primary"}>
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <p className="text-xs font-semibold text-accent uppercase tracking-[0.2em] mb-3">Guest reviews</p>
                            <h2 className={isApple ? "text-3xl md:text-[40px] font-semibold text-white tracking-tight leading-[1.10]" : "text-4xl md:text-5xl font-bold text-white tracking-tight"}>What our guests say</h2>
                            {testimonials.length >= 3 && (
                                <div className="flex items-center justify-center gap-2 mt-5">
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} size={18} className="fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    <span className="text-white/50 text-sm ml-2">
                                        {(testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length).toFixed(1)} average from {testimonials.length} reviews
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Grid -- up to 3 */}
                        <div className={`grid gap-6 ${testimonials.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : testimonials.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                            {testimonials.slice(0, 3).map((t, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1, duration: 0.6 }}
                                    className={isApple ? "bg-[#272729] rounded-xl p-7 transition-colors duration-300 flex flex-col border-none text-white" : "bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-7 hover:bg-white/8 transition-colors duration-300 flex flex-col"}
                                >
                                    <div className="flex items-center justify-between mb-5">
                                        <Stars count={t.rating} />
                                    </div>

                                    <p className="text-white/90 text-[15px] leading-relaxed mb-6 line-clamp-4 italic flex-1">
                                        "{t.review_text}"
                                    </p>

                                    <div className="flex items-center gap-3 pt-5 border-t border-white/10 mt-auto">
                                        <div className={isApple ? "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0" : "w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center ring-2 ring-white/10 shrink-0"}>
                                            <span className="text-accent font-bold">{t.guest_name.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold text-sm">{t.guest_name}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Google Reviews link */}
                        <div className="text-center mt-12">
                            <a href={tenant.google_review_url || '#'} target="_blank" rel="noopener noreferrer"
                                className={isApple ? "inline-flex items-center gap-2 text-[#2997ff] font-normal text-sm hover:underline" : "inline-flex items-center gap-2 text-white font-semibold text-sm bg-white/10 rounded-full px-8 py-3 hover:bg-white/20 transition-all border border-white/10"}>
                                <span>View all reviews</span>
                                <ArrowRight size={16} className={isApple ? "text-[#2997ff]" : "text-white"} />
                            </a>
                        </div>
                    </div>
                </section>
            )}

            {/* ===== ABOUT ===== */}
            {vis.about !== false && aboutText && (
                <section id="about" className="py-28 px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <p className="text-xs font-semibold text-accent uppercase tracking-[0.2em] mb-3">About us</p>
                        <h2 className={isApple ? "text-3xl md:text-[40px] font-semibold text-foreground tracking-tight leading-[1.10] mb-8" : "text-4xl md:text-5xl font-bold text-primary tracking-tight mb-8"}>{aboutHeading}</h2>
                        <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto whitespace-pre-wrap">{aboutText}</p>
                    </div>
                </section>
            )}

            {/* ===== NEARBY ATTRACTIONS ===== */}
            {nearbyAttractions.length > 0 && (
                <section id="nearby" className={isApple ? "py-16 px-6 bg-white border-none" : "py-16 px-6 bg-[#FDFBF7] border-t border-gray-100"}>
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="text-xs font-semibold text-accent uppercase tracking-[0.2em] mb-2">Explore</p>
                            <h2 className={isApple ? "text-3xl md:text-[40px] font-semibold text-foreground tracking-tight" : "text-3xl md:text-4xl font-bold text-primary tracking-tight"}>Nearby Spots &amp; Attractions</h2>
                            <p className="text-gray-400 text-sm mt-2">Places to visit during your stay</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                            {nearbyAttractions.map((name, i) => (
                                <span
                                    key={i}
                                    className={isApple
                                        ? "inline-flex items-center gap-2 bg-[#f5f5f7] text-[#1d1d1f] text-sm font-medium px-4 py-2 rounded-full"
                                        : "inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-shadow"
                                    }
                                >
                                    <MapPin size={13} className="text-accent shrink-0" />
                                    {name}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ===== LOCATION + MAP ===== */}
            <section id="location" className={isApple ? "py-16 md:py-24 px-6 bg-[#f5f5f7] border-none" : "py-16 md:py-24 px-6 bg-white border-t border-gray-100"}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className={isApple ? "text-3xl md:text-[40px] font-semibold text-foreground tracking-tight leading-[1.10]" : "text-3xl md:text-5xl font-bold text-primary tracking-tight"}>Perfectly Located</h2>
                    </div>

                    {/* Proximity Distance Badges */}
                    <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 mb-10 max-w-4xl mx-auto">
                        {[
                            { value: settings.locationStat1Value || '600m', label: settings.locationStat1Label || 'from Beach' },
                            { value: settings.locationStat2Value || '2km', label: settings.locationStat2Label || 'from Town Center' },
                            { value: settings.locationStat3Value || '15 min', label: settings.locationStat3Label || 'from Airport' },
                        ].map((stat, i) => (
                            <div key={i} className={isApple ? "flex items-center justify-center gap-2 bg-white rounded-full px-5 py-2.5 shadow-[rgba(0,0,0,0.04)_0px_2px_6px_0px]" : "flex items-center justify-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-5 py-2.5"}>
                                <span className="font-bold text-primary text-sm">{stat.value}</span>
                                <span className="text-gray-500 text-sm">{stat.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Map embed */}
                    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm h-[300px] md:h-[400px]">
                        {parseGoogleMapsUrl(settings.googleMapsUrl) ? (
                            <iframe
                                title="Location"
                                className="w-full h-full border-0"
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={parseGoogleMapsUrl(settings.googleMapsUrl)}
                            />
                        ) : tenant.google_place_id ? (
                            <iframe
                                src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY || ''}&q=place_id:${tenant.google_place_id}`}
                                className="w-full h-full border-0"
                                loading="lazy"
                                allowFullScreen
                                title="Location"
                            />
                        ) : contactAddress ? (
                            <iframe
                                src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY || ''}&q=${encodeURIComponent(contactAddress)}`}
                                className="w-full h-full border-0"
                                loading="lazy"
                                allowFullScreen
                                title="Location"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <div className="text-center text-gray-400">
                                    <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">Map unavailable</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Address below map */}
                    {contactAddress && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mt-6"
                        >
                            <a
                                href={`https://maps.google.com/maps?q=${encodeURIComponent(contactAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={isApple ? "inline-flex items-center justify-center gap-2 hover:underline px-4 py-2 transition-colors group" : "inline-flex items-center justify-center gap-2 hover:bg-gray-50 px-4 py-2 rounded-xl transition-colors group"}
                            >
                                <MapPin size={18} className="text-accent group-hover:scale-110 transition-transform shrink-0" />
                                <span className="text-sm text-gray-600 whitespace-pre-wrap text-left leading-relaxed max-w-lg">
                                    {contactAddress}
                                </span>
                                <ExternalLink size={14} className="text-gray-300 group-hover:text-primary ml-1 shrink-0" />
                            </a>
                        </motion.div>
                    )}
                </div>
            </section>

            {/* ===== DIRECT BOOKING BENEFITS (Hotel only) ===== */}
            {isHotel && (
                <section className={isApple ? "py-20 px-6 bg-[#272729] relative overflow-hidden text-white" : "py-20 px-6 bg-primary relative overflow-hidden"}>
                    {/* Decorative */}
                    <div className="absolute top-0 right-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />

                    <div className="max-w-4xl mx-auto relative z-10">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
                                Book direct & save
                            </h2>
                            <p className="text-white/40 text-sm">Skip the middleman. Get the best deal when you book with us directly.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                            {[
                                { icon: Shield, title: 'Best Price Guarantee', desc: 'Lowest rates available only here' },
                                { icon: Sunrise, title: 'Free Early Check-in', desc: 'Subject to availability' },
                                { icon: Check, title: 'No Hidden Fees', desc: 'What you see is what you pay' },
                            ].map((benefit, i) => {
                                const Icon = benefit.icon;
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-start gap-4 bg-white/5 rounded-xl p-5 border-none"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                                            <Icon size={20} className="text-accent" />
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold text-sm mb-1">{benefit.title}</p>
                                            <p className="text-white/35 text-xs leading-relaxed">{benefit.desc}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        <div className="text-center">
                            <a
                                href="#rooms"
                                className={isApple ? "inline-flex items-center gap-2 bg-[#0071e3] text-white font-normal px-8 py-3.5 rounded-full hover:bg-[#0077ed] transition-all text-sm" : "inline-flex items-center gap-2 bg-accent text-primary font-bold px-8 py-3.5 rounded-xl hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 text-sm"}
                            >
                                Browse rooms & book
                                <ArrowRight size={16} />
                            </a>
                        </div>
                    </div>
                </section>
            )}

            {/* ===== CONTACT / FOOTER ===== */}
            {vis.contact !== false && (
                <footer id="contact" className={isApple ? "bg-[#1d1d1f] text-white py-20 px-6 border-t border-white/10" : "bg-ocean-950 text-white py-20 px-6"}>
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                            {/* Brand */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    {tenant.logo_url ? (
                                        <img src={tenant.logo_url} alt={`${tenant.business_name} logo`} className="w-8 h-8 rounded-lg object-cover" />
                                    ) : (
                                        <div className={`w-8 h-8 rounded-lg ${isApple ? 'bg-white/10 text-white' : 'bg-accent'} flex items-center justify-center`}>
                                            <span className="text-white font-bold text-sm">{tenant.business_name.charAt(0)}</span>
                                        </div>
                                    )}
                                    <span className={isApple ? "font-sans font-semibold text-sm tracking-tight text-white" : "font-serif font-bold text-lg tracking-tight"}>{tenant.business_name}</span>
                                </div>
                                {aboutText && <p className="text-white/40 text-sm leading-relaxed line-clamp-3">{aboutText}</p>}
                            </div>

                            {/* Quick links */}
                            <div>
                                <p className="text-xs font-semibold text-white/30 uppercase tracking-[0.2em] mb-4">Quick links</p>
                                <ul className="space-y-3 text-sm">
                                    {isHotel && <li><a href="#rooms" className="text-white/50 hover:text-white transition-colors">Rooms</a></li>}
                                    {isRestaurant && menuCategories.length > 0 && <li><a href="#menu" className="text-white/50 hover:text-white transition-colors">Menu</a></li>}
                                    {testimonials.length > 0 && <li><a href="#reviews" className="text-white/50 hover:text-white transition-colors">Reviews</a></li>}
                                    {aboutText && <li><a href="#about" className="text-white/50 hover:text-white transition-colors">About</a></li>}
                                    <li><a href="#location" className="text-white/50 hover:text-white transition-colors">Location</a></li>
                                </ul>
                            </div>

                            {/* Contact */}
                            <div>
                                <p className="text-xs font-semibold text-white/30 uppercase tracking-[0.2em] mb-4">Contact</p>
                                <ul className="space-y-3 text-sm">
                                    {contactPhone && (
                                        <li className="flex items-center gap-3 text-white/50">
                                            <Phone size={14} className="text-accent" />
                                            <a href={`tel:${contactPhone}`} className="hover:text-white transition-colors">{contactPhone}</a>
                                        </li>
                                    )}
                                    {contactEmail && (
                                        <li className="flex items-center gap-3 text-white/50">
                                            <Mail size={14} className="text-accent" />
                                            <a href={`mailto:${contactEmail}`} className="hover:text-white transition-colors">{contactEmail}</a>
                                        </li>
                                    )}
                                    {contactAddress && (
                                        <li className="flex items-start gap-3 text-white/50">
                                            <MapPin size={14} className="text-accent mt-0.5 shrink-0" />
                                            <span>{contactAddress}</span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} {tenant.business_name}. All rights reserved.</p>
                            <p className="text-xs text-white/20">
                                Powered by <a href="/" className="text-accent/50 hover:text-accent transition-colors">Triplooper</a>
                            </p>
                        </div>
                    </div>
                </footer>
            )}

            {/* ===== MOBILE STICKY BOOK NOW BAR ===== */}
            <AnimatePresence>
                {showStickyBar && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
                    >
                        <div className="flex items-center gap-3">
                            {isHotel && rooms.length > 0 ? (
                                <>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-400">Starting from</p>
                                        <p className="text-lg font-bold text-accent">₹{Math.min(...rooms.map(r => adjustedPrice(r.price_per_night))).toLocaleString()}<span className="text-xs font-normal text-gray-400">/night</span></p>
                                    </div>
                                    <a href="#rooms" className={isApple ? "bg-[#0071e3] text-white font-normal px-6 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-[#0077ed] transition-all" : "bg-primary text-white font-semibold px-6 py-3 rounded-xl text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:bg-primary-hover transition-all"}>
                                        Book now <ArrowRight size={14} />
                                    </a>
                                </>
                            ) : isRestaurant ? (
                                <>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-400">{priceRange} {cuisineType && `· ${cuisineType}`}</p>
                                        <p className="text-sm font-semibold text-gray-700">Reserve your table</p>
                                    </div>
                                    <button onClick={handleBookTable} className={isApple ? "bg-[#0071e3] text-white font-normal px-6 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-[#0077ed] transition-all" : "bg-accent text-primary font-bold px-6 py-3 rounded-xl text-sm shadow-lg shadow-accent/20 flex items-center gap-2 hover:bg-accent-hover transition-all"}>
                                        Book a Table <ArrowRight size={14} />
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== BOOKING MODAL ===== */}
            <AnimatePresence>
                {bookingRoom && !bookingSuccess && (
                    <BookingModal
                        room={bookingRoom}
                        subdomain={subdomain || ''}
                        onClose={() => setBookingRoom(null)}
                        onSuccess={(data) => setBookingSuccess(data)}
                        adjustedPrice={adjustedPrice}
                        initialCheckIn={heroCheckIn}
                        initialCheckOut={heroCheckOut}
                        tenantId={tenant?.id}
                        businessName={tenant?.business_name}
                        siteData={siteData}
                    />
                )}
                {bookingSuccess && (
                    <BookingConfirmation
                        data={bookingSuccess}
                        onClose={() => { setBookingSuccess(null); setBookingRoom(null); }}
                    />
                )}
            </AnimatePresence>

            {/* ===== WHATSAPP FAB ===== */}
            {contactPhone && (
                <motion.a
                    href={`https://wa.me/${contactPhone.replace(/[\s\(\)\-\+]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-6 right-6 z-40 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors flex items-center justify-center group"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 1 }}
                >
                    <MessageCircle size={28} />
                    <span className="absolute right-full mr-4 bg-white text-gray-800 text-sm font-medium py-1.5 px-3 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Chat with us
                    </span>
                </motion.a>
            )}

            {/* ===== MOBILE STICKY BOOK NOW ===== */}
            {isHotel && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
                    <button
                        onClick={handleHeroBook}
                        className={isApple ? "w-full bg-[#0071e3] text-white font-normal py-3 rounded-full flex items-center justify-center gap-2" : "w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2"}
                    >
                        Check Availability
                        <ArrowRight size={16} />
                    </button>
                    <style>{`
                        #main-content { padding-bottom: 80px; }
                        @media (min-width: 768px) { #main-content { padding-bottom: 0; } }
                    `}</style>
                </div>
            )}
            {isRestaurant && !isHotel && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
                    <button
                        onClick={handleBookTable}
                        className={isApple ? "w-full bg-[#0071e3] text-white font-normal py-3 rounded-full flex items-center justify-center gap-2" : "w-full bg-accent text-primary font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2"}
                    >
                        Book a Table
                        <ArrowRight size={16} />
                    </button>
                    <style>{`
                        #main-content { padding-bottom: 80px; }
                        @media (min-width: 768px) { #main-content { padding-bottom: 0; } }
                    `}</style>
                </div>
            )}

            {/* ===== TABLE BOOKING MODAL (Built-in mode) ===== */}
            <AnimatePresence>
                {showTableBooking && (
                    <TableBookingModal
                        tenantName={tenant.business_name}
                        subdomain={subdomain}
                        onClose={() => setShowTableBooking(false)}
                        onSuccess={(data) => { setTableBookingSuccess(data); setShowTableBooking(false); }}
                    />
                )}
                {tableBookingSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setTableBookingSuccess(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                                <Check size={28} className="text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-primary mb-2">Table Reserved!</h3>
                            <p className="text-sm text-gray-500 mb-1">{tableBookingSuccess.guest_name}, your table for {tableBookingSuccess.guest_count} is booked.</p>
                            <p className="text-sm text-gray-500 mb-6">{tableBookingSuccess.reservation_date} at {tableBookingSuccess.reservation_time}</p>
                            <button onClick={() => setTableBookingSuccess(null)} className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-hover transition-all text-sm">
                                Done
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
