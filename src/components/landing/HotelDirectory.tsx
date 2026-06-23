import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Users, MapPin, Building2, Star, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface ListedHotel {
    id: string;
    business_name: string;
    business_type: string;
    subdomain: string;
    hero_image_url: string;
    min_price: number;
    about: string;
    primary_color: string;
    template: string;
}

export default function HotelDirectory() {
    const [hotels, setHotels] = useState<ListedHotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<'all' | 'hotel' | 'combined'>('all');
    
    // Search form state
    const [searchHotelId, setSearchHotelId] = useState<string>('all');
    const [checkIn, setCheckIn] = useState<string>('');
    const [checkOut, setCheckOut] = useState<string>('');
    const [guests, setGuests] = useState<number>(2);

    const staysSectionRef = useRef<HTMLDivElement>(null);

    // Fetch hotels from Supabase
    useEffect(() => {
        async function fetchHotels() {
            try {
                // 1. Fetch tenants
                const { data: tenantsData, error: tErr } = await supabase
                    .from('tenants')
                    .select('id, business_name, business_type, subdomain, hero_image_url, template')
                    .eq('is_active', true);
                
                if (tErr) throw tErr;

                if (!tenantsData || tenantsData.length === 0) {
                    setHotels([]);
                    return;
                }

                // 2. Fetch rooms to calculate min price
                const { data: roomsData, error: rErr } = await supabase
                    .from('rooms')
                    .select('tenant_id, price_per_night');

                // 3. Fetch settings for about text and primary color
                const { data: settingsData, error: sErr } = await supabase
                    .from('settings')
                    .select('tenant_id, setting_key, setting_value')
                    .in('setting_key', ['aboutText', 'primary_color']);

                const mapped = tenantsData.map(tenant => {
                    const tenantRooms = (roomsData || []).filter(r => r.tenant_id === tenant.id);
                    const minPrice = tenantRooms.length > 0 
                        ? Math.min(...tenantRooms.map(r => r.price_per_night)) 
                        : 2800; // default/fallback

                    const aboutSetting = (settingsData || []).find(s => s.tenant_id === tenant.id && s.setting_key === 'aboutText');
                    const colorSetting = (settingsData || []).find(s => s.tenant_id === tenant.id && s.setting_key === 'primary_color');

                    return {
                        id: tenant.id,
                        business_name: tenant.business_name,
                        business_type: tenant.business_type,
                        subdomain: tenant.subdomain,
                        hero_image_url: tenant.hero_image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
                        min_price: minPrice,
                        about: aboutSetting?.setting_value || 'Experience luxury and comfort with custom services.',
                        primary_color: colorSetting?.setting_value || '#0071e3',
                        template: tenant.template
                    };
                });

                setHotels(mapped);
            } catch (err) {
                console.error('Failed to load hotel directory:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchHotels();
    }, []);

    // Set default check-in tomorrow, check-out day after if blank
    useEffect(() => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(tomorrow.getDate() + 2);

        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        setCheckIn(formatDate(tomorrow));
        setCheckOut(formatDate(dayAfter));
    }, []);

    // Search and redirect logic
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (searchHotelId === 'all') {
            // Scroll down to listing grid
            staysSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Find selected hotel subdomain and redirect directly
            const selected = hotels.find(h => h.id === searchHotelId);
            if (selected) {
                const targetUrl = `/site/${selected.subdomain}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;
                window.open(targetUrl, '_blank');
            }
        }
    };

    // Filter hotels list
    const filteredHotels = hotels.filter(h => {
        const matchesType = filterType === 'all' || h.business_type === filterType;
        const matchesSearch = searchHotelId === 'all' || h.id === searchHotelId;
        return matchesType && matchesSearch;
    });

    const getCleanType = (type: string) => {
        return type === 'combined' ? 'Hotel & Restaurant' : 'Resort & Spa';
    };

    return (
        <section className="bg-[var(--color-surface-light)] py-24 lg:py-32 px-6 border-b border-[var(--color-border-light)]" id="hotel-explorer">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Section Header */}
                <div className="text-center max-w-2xl mx-auto space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-semibold uppercase tracking-wider">
                        <Sparkles size={12} /> Direct Booking Network
                    </div>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--color-text-primary-light)] tracking-tight">
                        Find and book your perfect getaway
                    </h2>
                    <p className="text-sm text-[var(--color-text-secondary-light)]">
                        Select a destination, input dates, and book directly. Enjoy zero commission bookings, premium service, and best price guarantees.
                    </p>
                </div>

                {/* Glassmorphic Search Bar */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="backdrop-blur-md bg-white/80 border border-[var(--color-border-light)] shadow-2xl rounded-2xl p-6 md:p-8 max-w-4xl mx-auto -mt-16 relative z-30"
                >
                    <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        {/* Hotel select */}
                        <div className="md:col-span-4 space-y-1.5">
                            <label className="block text-xs font-semibold text-[var(--color-text-secondary-light)] uppercase tracking-wide flex items-center gap-1.5">
                                <MapPin size={13} className="text-black/30" /> Destination / Property
                            </label>
                            <select
                                value={searchHotelId}
                                onChange={(e) => setSearchHotelId(e.target.value)}
                                className="w-full bg-white/70 border border-[var(--color-border-light)] hover:border-black/20 focus:border-[var(--color-primary)] rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all font-medium text-[var(--color-text-primary-light)]"
                            >
                                <option value="all">All Destinations (Explore Grid)</option>
                                {hotels.map(h => (
                                    <option key={h.id} value={h.id}>{h.business_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Check In Date */}
                        <div className="md:col-span-3 space-y-1.5">
                            <label className="block text-xs font-semibold text-[var(--color-text-secondary-light)] uppercase tracking-wide flex items-center gap-1.5">
                                <Calendar size={13} className="text-black/30" /> Check-in Date
                            </label>
                            <input
                                type="date"
                                required
                                value={checkIn}
                                onChange={(e) => setCheckIn(e.target.value)}
                                className="w-full bg-white/70 border border-[var(--color-border-light)] hover:border-black/20 focus:border-[var(--color-primary)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all font-medium text-[var(--color-text-primary-light)]"
                            />
                        </div>

                        {/* Check Out Date */}
                        <div className="md:col-span-3 space-y-1.5">
                            <label className="block text-xs font-semibold text-[var(--color-text-secondary-light)] uppercase tracking-wide flex items-center gap-1.5">
                                <Calendar size={13} className="text-black/30" /> Check-out Date
                            </label>
                            <input
                                type="date"
                                required
                                value={checkOut}
                                onChange={(e) => setCheckOut(e.target.value)}
                                className="w-full bg-white/70 border border-[var(--color-border-light)] hover:border-black/20 focus:border-[var(--color-primary)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all font-medium text-[var(--color-text-primary-light)]"
                            />
                        </div>

                        {/* Guests count */}
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="block text-xs font-semibold text-[var(--color-text-secondary-light)] uppercase tracking-wide flex items-center gap-1.5">
                                <Users size={13} className="text-black/30" /> Guests
                            </label>
                            <select
                                value={guests}
                                onChange={(e) => setGuests(Number(e.target.value))}
                                className="w-full bg-white/70 border border-[var(--color-border-light)] hover:border-black/20 focus:border-[var(--color-primary)] rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all font-medium text-[var(--color-text-primary-light)]"
                            >
                                <option value="1">1 Guest</option>
                                <option value="2">2 Guests</option>
                                <option value="3">3 Guests</option>
                                <option value="4">4 Guests</option>
                                <option value="5">5+ Guests</option>
                            </select>
                        </div>

                        {/* Submit Button */}
                        <div className="md:col-span-12 mt-2">
                            <button
                                type="submit"
                                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-[0.99] text-white font-semibold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Search size={16} />
                                {searchHotelId === 'all' ? 'Search Destinations' : 'Book Stay Directly'}
                            </button>
                        </div>
                    </form>
                </motion.div>

                {/* Hotel List Section */}
                <div ref={staysSectionRef} className="pt-4 scroll-mt-6">
                    {/* Filters & Results Counter */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                        <div className="flex bg-black/[0.04] p-1 rounded-xl">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterType === 'all' ? 'bg-white text-[var(--color-text-primary-light)] shadow-sm' : 'text-black/50 hover:text-black/80'}`}
                            >
                                All Properties
                            </button>
                            <button
                                onClick={() => setFilterType('hotel')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterType === 'hotel' ? 'bg-white text-[var(--color-text-primary-light)] shadow-sm' : 'text-black/50 hover:text-black/80'}`}
                            >
                                Resorts & Spa
                            </button>
                            <button
                                onClick={() => setFilterType('combined')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filterType === 'combined' ? 'bg-white text-[var(--color-text-primary-light)] shadow-sm' : 'text-black/50 hover:text-black/80'}`}
                            >
                                Hotel & Restaurant
                            </button>
                        </div>
                        
                        <p className="text-xs font-semibold text-black/30 uppercase tracking-wider">
                            Showing {filteredHotels.length} Stays
                        </p>
                    </div>

                    {/* Stays Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm h-[400px] animate-pulse">
                                    <div className="bg-slate-200 h-48 w-full" />
                                    <div className="p-5 space-y-4">
                                        <div className="h-4 bg-slate-200 rounded w-1/4" />
                                        <div className="h-6 bg-slate-200 rounded w-3/4" />
                                        <div className="h-10 bg-slate-200 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            <motion.div 
                                layout
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                            >
                                {filteredHotels.map((hotel) => (
                                    <motion.div
                                        key={hotel.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="group bg-white rounded-2xl border border-[var(--color-border-light)] hover:border-black/20 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col"
                                    >
                                        {/* Image Container */}
                                        <div className="relative h-48 overflow-hidden bg-black/5">
                                            <img
                                                src={hotel.hero_image_url}
                                                alt={hotel.business_name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
                                            
                                            {/* Badges */}
                                            <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                                                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/95 text-[var(--color-text-primary-light)] shadow-sm">
                                                    {getCleanType(hotel.business_type)}
                                                </span>
                                                {hotel.template === 'apple' && (
                                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--color-primary)] text-white shadow-sm flex items-center gap-1">
                                                        ★ Apple Design
                                                    </span>
                                                )}
                                            </div>

                                            {/* Price Badge */}
                                            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-[var(--color-border-light-subtle)]">
                                                <span className="text-[10px] font-medium text-black/50 block leading-tight">Rooms from</span>
                                                <span className="text-sm font-bold text-[var(--color-text-primary-light)] leading-tight">₹{hotel.min_price.toLocaleString()}<span className="text-[10px] font-normal text-black/50">/nt</span></span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 flex-grow flex flex-col justify-between">
                                            <div className="space-y-2">
                                                <h3 className="text-lg font-bold text-[var(--color-text-primary-light)] leading-tight group-hover:text-[var(--color-primary)] transition-colors">
                                                    {hotel.business_name}
                                                </h3>
                                                <p className="text-xs text-black/50 line-clamp-3 leading-relaxed">
                                                    {hotel.about}
                                                </p>
                                            </div>

                                            {/* Direct Booking CTA */}
                                            <div className="pt-5 mt-4 border-t border-[var(--color-border-light-subtle)] flex items-center gap-3">
                                                <a
                                                    href={`/site/${hotel.subdomain}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 text-center border border-[var(--color-border-light)] hover:border-black/20 text-black/70 font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer bg-black/[0.02]"
                                                >
                                                    Website <ArrowUpRight size={12} />
                                                </a>
                                                <a
                                                    href={`/site/${hotel.subdomain}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 text-center text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-sm hover:shadow flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98]"
                                                    style={{ backgroundColor: hotel.primary_color }}
                                                >
                                                    Book Now
                                                </a>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {!loading && filteredHotels.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[var(--color-border-light)]">
                            <Building2 className="mx-auto h-12 w-12 text-black/20 mb-3" />
                            <h4 className="text-[var(--color-text-primary-light)] font-bold">No stays found</h4>
                            <p className="text-black/50 text-xs mt-1">We couldn't find any hotels matching your exact filter selection.</p>
                        </div>
                    )}
                </div>

                {/* Direct Booking Advantages (Trust section) */}
                <div className="grid md:grid-cols-3 gap-6 pt-4">
                    <div className="bg-white p-5 rounded-2xl border border-[var(--color-border-light)] shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[var(--color-text-primary-light)] mb-1">Direct Verification</h4>
                            <p className="text-xs text-black/50 leading-relaxed">Book directly through certified host reservation panels. Your reservation is registered instantly in the hotel's system.</p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-[var(--color-border-light)] shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-success)]/10 text-[var(--color-success)] flex items-center justify-center shrink-0">
                            <Star size={20} className="fill-[var(--color-success)]" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[var(--color-text-primary-light)] mb-1">Best Rates Guaranteed</h4>
                            <p className="text-xs text-black/50 leading-relaxed">By cutting out travel aggregator commission middle-men, hosts can offer lower base prices directly to you.</p>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-[var(--color-border-light)] shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                            <Users size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[var(--color-text-primary-light)] mb-1">Instant Host Connect</h4>
                            <p className="text-xs text-black/50 leading-relaxed">Connect straight with the owners and hospitality managers via direct messaging or WhatsApp for any custom requests.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
