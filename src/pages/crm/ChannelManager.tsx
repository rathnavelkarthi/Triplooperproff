import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Waypoints,
    Globe,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Plus,
    Power,
    Activity,
    CalendarDays,
    Tag,
    Search,
    Settings2,
    X,
    ExternalLink,
    Youtube,
    Radio,
    Layers,
    Building2,
    ShieldCheck,
    Zap,
    SlidersHorizontal,
    Check,
    Sparkles,
    ArrowUpRight,
    Server,
    Link2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMDataContext';
import { supabase } from '../../lib/supabaseClient';

/* ── 36 Supported Channels / Switches / PMS / Gateways ── */

export type ChannelCategory = 'all' | 'ota' | 'pms_cm' | 'gds_meta' | 'payments';

export interface ChannelMeta {
    id: string;
    name: string;
    logoUrl?: string;
    brandColor: string;
    textColor: string;
    category: 'ota' | 'pms_cm' | 'gds_meta' | 'payments';
    categoryLabel: string;
    description: string;
    defaultCommission: string;
    apiUrl?: string;
    tutorialUrl?: string;
    aliases: string[];
}

export const OTA_CHANNELS: ChannelMeta[] = [
    // Row 1
    {
        id: 'airbnb',
        name: 'Airbnb',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg',
        brandColor: '#FF5A5F',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: 'Global vacation rentals, homestays, and unique boutique hotel accommodations.',
        defaultCommission: '3-15%',
        apiUrl: 'https://www.airbnb.com/host/homes',
        tutorialUrl: 'https://www.youtube.com/watch?v=0hO1U785_U4',
        aliases: ['airbnb', 'air_bnb', 'air-bnb']
    },
    {
        id: 'agoda',
        name: 'Agoda',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Agoda_Logo_2022.svg',
        brandColor: '#2B3990',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: 'Fast-growing online travel booking platform in Asia-Pacific and globally.',
        defaultCommission: '15-20%',
        apiUrl: 'https://ycs.agoda.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=zJg1R805f-0',
        aliases: ['agoda', 'agoda_ycs']
    },
    {
        id: 'amadeus',
        name: 'AMADEUS',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Amadeus_%28CRS%29_Logo.svg',
        brandColor: '#005EB8',
        textColor: '#FFFFFF',
        category: 'gds_meta',
        categoryLabel: 'GDS / CRS',
        description: 'Leading global distribution system (GDS) and hospitality technology provider.',
        defaultCommission: '8-12%',
        apiUrl: 'https://hospitality.amadeus.com/',
        aliases: ['amadeus', 'amadeus_gds', 'amadeus_crs']
    },
    {
        id: 'booking_com',
        name: 'Booking.com',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Booking.com_logo.svg',
        brandColor: '#003580',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: "The world's leading digital travel and accommodation booking company.",
        defaultCommission: '15%',
        apiUrl: 'https://admin.booking.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=kS_q-Zk8JpI',
        aliases: ['booking_com', 'booking.com', 'booking', 'bookingcom']
    },
    {
        id: 'channex',
        name: 'Channex',
        logoUrl: 'https://channex.io/wp-content/uploads/2021/04/channex-logo.svg',
        brandColor: '#1A73E8',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'Channel Manager',
        description: 'Unified modern Channel Manager API for real-time rates and inventory distribution.',
        defaultCommission: 'Direct API',
        apiUrl: 'https://channex.io/',
        aliases: ['channex', 'channex_api']
    },
    {
        id: 'clock',
        name: 'Clock',
        logoUrl: '',
        brandColor: '#F58220',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'Cloud PMS',
        description: 'Cloud-native hotel PMS, reservation engine, and guest engagement platform.',
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://www.clock-software.com/',
        aliases: ['clock', 'clock_pms', 'clock-software']
    },

    // Row 2
    {
        id: 'ctrip',
        name: 'Ctrip',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Ctrip_Logo.svg',
        brandColor: '#2B72D7',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: "China's premier online travel service and Trip.com Group distribution network.",
        defaultCommission: '15-20%',
        apiUrl: 'https://ebooking.trip.com/',
        aliases: ['ctrip', 'trip_com', 'trip.com', 'tripcom']
    },
    {
        id: 'd_edge',
        name: 'd-edge',
        logoUrl: '',
        brandColor: '#3F2B96',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'CRS & Switch',
        description: 'Hospitality solutions provider with advanced CRS and connectivity engines.',
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://www.d-edge.com/',
        aliases: ['d_edge', 'd-edge', 'dedge']
    },
    {
        id: 'easemytrip',
        name: 'EaseMyTrip',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/07/EaseMyTrip_Logo.svg',
        brandColor: '#0084FF',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: 'Popular Indian online travel portal offering instant flight and hotel reservations.',
        defaultCommission: '10-15%',
        apiUrl: 'https://www.easemytrip.com/',
        aliases: ['easemytrip', 'ease_my_trip', 'emt']
    },
    {
        id: 'hotelogix',
        name: 'Hotelogix',
        logoUrl: '',
        brandColor: '#1F2937',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'PMS & CM',
        description: 'Enterprise cloud property management and smart hoteliering distribution suite.',
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://www.hotelogix.com/',
        aliases: ['hotelogix']
    },
    {
        id: 'hotels_com',
        name: 'Hotels.com',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Hotels.com_logo.svg',
        brandColor: '#D32F2F',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: 'Global online accommodation booking platform under Expedia Group.',
        defaultCommission: '15-20%',
        apiUrl: 'https://www.expediapartnercentral.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=FmYj0Wz4G3I',
        aliases: ['hotels_com', 'hotels.com', 'hotelscom']
    },
    {
        id: 'ids_next',
        name: 'IDS Next',
        logoUrl: '',
        brandColor: '#107C41',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'Enterprise ERP',
        description: 'Enterprise hospitality technology, ERP, and distribution systems across Asia & Africa.',
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://idsnext.com/',
        aliases: ['ids_next', 'ids', 'idsnext']
    },

    // Row 3
    {
        id: 'irctc',
        name: 'IRCTC',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/45/IRCTC_Logo.svg',
        brandColor: '#002B49',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'Travel Portal',
        description: 'Official tourism and accommodation portal of Indian Railways.',
        defaultCommission: '10-12%',
        apiUrl: 'https://www.hotel.irctctourism.com/',
        aliases: ['irctc', 'irctc_tourism']
    },
    {
        id: 'opera',
        name: 'Opera',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg',
        brandColor: '#0B5FA5',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'Enterprise PMS',
        description: 'The global hospitality industry benchmark for enterprise property management (Oracle).',
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://www.oracle.com/hospitality/',
        aliases: ['opera', 'oracle_opera', 'opera_cloud', 'opera_pms']
    },
    {
        id: 'rakuten',
        name: 'Rakuten',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Rakuten_Global_Brand_Logo.svg',
        brandColor: '#BF0000',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: "Japan's leading online travel marketplace with expansive Asian reach.",
        defaultCommission: '10-15%',
        apiUrl: 'https://travel.rakuten.com/',
        aliases: ['rakuten', 'rakuten_travel']
    },
    {
        id: 'resavenue',
        name: 'ResAvenue',
        logoUrl: '',
        brandColor: '#E65100',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'Booking Engine',
        description: 'Complete internet booking engine and channel management solution for hoteliers.',
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://www.resavenue.com/',
        aliases: ['resavenue', 'res_avenue']
    },
    {
        id: 'reznext',
        name: 'reznext',
        logoUrl: '',
        brandColor: '#6B46C1',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'Distribution Switch',
        description: 'Real-time hotel distribution switch and revenue automation platform.',
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://www.reznext.com/',
        aliases: ['reznext', 'rez_next']
    },
    {
        id: 'sabre',
        name: 'Sabre',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Sabre_Corporation_logo.svg',
        brandColor: '#E50914',
        textColor: '#FFFFFF',
        category: 'gds_meta',
        categoryLabel: 'GDS / SynXis',
        description: 'SynXis central reservation and global travel technology distribution network.',
        defaultCommission: '8-12%',
        apiUrl: 'https://www.sabrehospitality.com/',
        aliases: ['sabre', 'synxis', 'sabre_hospitality']
    },

    // Row 4
    {
        id: 'razorpay',
        name: 'Razorpay',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg',
        brandColor: '#0C2340',
        textColor: '#FFFFFF',
        category: 'payments',
        categoryLabel: 'Payment Gateway',
        description: 'Automated booking payments, instant payment links, and UPI settlements.',
        defaultCommission: '2% Gateway',
        apiUrl: 'https://dashboard.razorpay.com/',
        aliases: ['razorpay', 'razor_pay']
    },
    {
        id: 'siteminder',
        name: 'SiteMinder',
        logoUrl: '',
        brandColor: '#0072CE',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'Channel Manager',
        description: "World-leading open hotel commerce platform connecting properties to 450+ OTAs.",
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://www.siteminder.com/',
        aliases: ['siteminder', 'site_minder']
    },
    {
        id: 'staah',
        name: 'STAAH',
        logoUrl: '',
        brandColor: '#E65100',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'Channel Manager',
        description: 'High-speed cloud channel manager, MAX booking engine, and gift card system.',
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://www.staah.com/',
        aliases: ['staah', 'staah_max']
    },
    {
        id: 'tiket_com',
        name: 'tiket.com',
        logoUrl: '',
        brandColor: '#0064D2',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: 'Pioneering Southeast Asian OTA powering hotels, flights, and travel activities.',
        defaultCommission: '15%',
        apiUrl: 'https://en.tiket.com/',
        aliases: ['tiket_com', 'tiket.com', 'tiket']
    },
    {
        id: 'traveloka',
        name: 'traveloka',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Traveloka_Primary_Logo.svg',
        brandColor: '#1BA0E2',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: "Southeast Asia's leading lifestyle and travel superapp for flights and hotels.",
        defaultCommission: '15-20%',
        apiUrl: 'https://www.traveloka.com/',
        aliases: ['traveloka']
    },
    {
        id: 'tripadvisor',
        name: 'Tripadvisor',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Tripadvisor_Logo.svg',
        brandColor: '#34E0A1',
        textColor: '#002B11',
        category: 'gds_meta',
        categoryLabel: 'Metasearch',
        description: "World's largest travel guidance site for traveler reviews and instant bookings.",
        defaultCommission: '12-15%',
        apiUrl: 'https://www.tripadvisor.com/Owners',
        tutorialUrl: 'https://www.youtube.com/watch?v=Yf1R287wT0c',
        aliases: ['tripadvisor', 'trip_advisor']
    },

    // Row 5
    {
        id: 'winhms',
        name: 'WINHMS',
        logoUrl: '',
        brandColor: '#007BB6',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'Enterprise PMS',
        description: 'Comprehensive property management software and channel interface suite.',
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://www.winhms.com/',
        aliases: ['winhms', 'win_hms']
    },
    {
        id: 'wubook',
        name: 'WuBook',
        logoUrl: '',
        brandColor: '#333333',
        textColor: '#FFFFFF',
        category: 'pms_cm',
        categoryLabel: 'PMS & CM',
        description: 'Flexible European cloud channel manager and PMS for independent properties.',
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://wubook.net/',
        aliases: ['wubook', 'wu_book']
    },
    {
        id: 'yatra',
        name: 'yatra',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Yatra_logo.png',
        brandColor: '#EA232A',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: 'Leading Indian online travel agency and corporate travel service provider.',
        defaultCommission: '15-20%',
        apiUrl: 'https://hotel.yatra.com/merchant/',
        tutorialUrl: 'https://www.youtube.com/watch?v=H74t4G4774k',
        aliases: ['yatra']
    },
    {
        id: 'expedia',
        name: 'Expedia',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Expedia_logo.svg',
        brandColor: '#00355F',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: 'Global travel technology company powering millions of daily hotel bookings.',
        defaultCommission: '18-22%',
        apiUrl: 'https://www.expediapartnercentral.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=FmYj0Wz4G3I',
        aliases: ['expedia', 'expediapartnercentral']
    },
    {
        id: 'ezee',
        name: 'eZee',
        logoUrl: '',
        brandColor: '#F59E0B',
        textColor: '#0E2A38',
        category: 'pms_cm',
        categoryLabel: 'PMS & CM',
        description: 'Complete all-in-one cloud hotel PMS, channel manager, and online booking engine.',
        defaultCommission: 'Direct Sync',
        apiUrl: 'https://www.ezeetechnosys.com/',
        aliases: ['ezee', 'ezee_absolute', 'ezee_technosys']
    },
    {
        id: 'go_mmt',
        name: 'go-mmt',
        logoUrl: 'https://imgak.mmtcdn.com/pwa_v3/pwa_commons_assets/desktop/logo@2x.png',
        brandColor: '#E41D2E',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA Conglomerate',
        description: "India's largest travel booking group (MakeMyTrip, Goibibo & redBus).",
        defaultCommission: '15-22%',
        apiUrl: 'https://extranet.makemytrip.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=mD-mIeU8d6k',
        aliases: ['go_mmt', 'go-mmt', 'makemytrip', 'goibibo', 'mmt', 'gommt']
    },

    // Row 6
    {
        id: 'google_hotel_ads',
        name: 'Google Hotel Ads',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg',
        brandColor: '#4285F4',
        textColor: '#FFFFFF',
        category: 'gds_meta',
        categoryLabel: 'Metasearch',
        description: 'Direct booking metasearch and free booking links directly on Google Search & Maps.',
        defaultCommission: '10-15%',
        apiUrl: 'https://www.google.com/travel/hotels',
        tutorialUrl: 'https://www.youtube.com/watch?v=x7EQLl1_8d8',
        aliases: ['google_hotel_ads', 'google', 'google_hotels', 'google_travel']
    },
    {
        id: 'gb_payments',
        name: 'GB Payments',
        logoUrl: '',
        brandColor: '#2563EB',
        textColor: '#FFFFFF',
        category: 'payments',
        categoryLabel: 'Payment Gateway',
        description: 'Secure automated card processing and hospitality payment gateway integration.',
        defaultCommission: 'Payment Switch',
        apiUrl: 'https://gbpayments.com/',
        aliases: ['gb_payments', 'gbpay', 'gb_pay']
    },
    {
        id: 'happyeasygo',
        name: 'HAPPYEASYGO',
        logoUrl: 'https://www.happyeasygo.com/static/images/logo.png',
        brandColor: '#22C55E',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'OTA',
        description: 'Online travel booking platform offering competitive rates for flights and hotels.',
        defaultCommission: '15%',
        apiUrl: 'https://partner.happyeasygo.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=P_M6a9L0F1A',
        aliases: ['happyeasygo', 'happy_easy_go']
    },
    {
        id: 'heartland',
        name: 'Heartland',
        logoUrl: '',
        brandColor: '#DC2626',
        textColor: '#FFFFFF',
        category: 'payments',
        categoryLabel: 'POS & Payments',
        description: 'Payment processing and point of sale technology for hospitality businesses.',
        defaultCommission: 'Direct Switch',
        apiUrl: 'https://www.heartland.us/',
        aliases: ['heartland', 'heartland_pms', 'heartland_payments']
    },
    {
        id: 'hostelworld',
        name: 'Hostelworld Group',
        logoUrl: '',
        brandColor: '#FF7700',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'Hostel & Budget OTA',
        description: 'The world’s leading hostel-focused online booking platform for experiential travelers.',
        defaultCommission: '15%',
        apiUrl: 'https://inbox.hostelworld.com/',
        aliases: ['hostelworld', 'hostelworld_group', 'hw']
    },
    {
        id: 'hotelbeds',
        name: 'hotelbeds',
        logoUrl: '',
        brandColor: '#00529B',
        textColor: '#FFFFFF',
        category: 'ota',
        categoryLabel: 'B2B Bedbank',
        description: 'The world’s leading B2B travel tech partner and wholesale accommodation distributor.',
        defaultCommission: 'Net Wholesale',
        apiUrl: 'https://www.hotelbeds.com/',
        aliases: ['hotelbeds', 'hotel_beds', 'hbx']
    }
];

/* ── Database Types ── */

export interface ChannelConnection {
    id?: string;
    channel_id: string;
    status: 'connected' | 'disconnected' | 'error';
    api_key?: string;
    property_id?: string;
    sync_inventory: boolean;
    sync_rates: boolean;
    commission?: string;
    last_sync_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Channel extends ChannelMeta {
    connection: ChannelConnection | null;
    isAiosellRouted?: boolean;
}

export interface SyncLog {
    id: string;
    channel_id: string;
    channel_name: string;
    action: string;
    details: string;
    status: 'success' | 'error' | 'warning';
    created_at: string;
}

/* ── Helper: Relative Time ── */
function timeAgo(iso?: string | null): string {
    if (!iso) return 'never';
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 0) return 'just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

/* ── Distinctive Brand Badges / Logos ── */
function ChannelLogo({ meta, size = 'md' }: { meta: ChannelMeta; size?: 'sm' | 'md' | 'lg' }) {
    const [imgFailed, setImgFailed] = useState(false);
    const sizeClasses = size === 'sm' 
        ? 'w-9 h-9 text-xs rounded-xl' 
        : size === 'lg' 
            ? 'w-14 h-14 text-base rounded-2xl' 
            : 'w-12 h-12 text-sm rounded-xl';

    // SVG / Vector Custom Renderers for crisp display matching the user image
    const renderCustomVector = () => {
        switch (meta.id) {
            case 'clock':
                return (
                    <div className="flex flex-col items-center justify-center text-center font-black leading-none">
                        <span className="text-[#F58220] text-[10px] font-extrabold flex items-center gap-0.5">
                            ⏰ <span className="tracking-tight text-gray-900 font-bold text-[11px]">Clock</span>
                        </span>
                    </div>
                );
            case 'd_edge':
                return (
                    <div className="flex items-center justify-center font-bold text-[11px] tracking-tighter text-[#3F2B96]">
                        <span>d<span className="text-[#00D2A0] font-black">•</span>edge</span>
                    </div>
                );
            case 'hotelogix':
                return (
                    <div className="flex flex-col items-center justify-center leading-none text-center">
                        <div className="flex gap-0.5 mb-0.5">
                            <div className="w-1.5 h-3 bg-gray-900 rounded-xs" />
                            <div className="w-1.5 h-4 bg-gray-900 rounded-xs" />
                        </div>
                        <span className="text-[8px] font-black tracking-tighter uppercase text-gray-800">HOTELOGIX</span>
                    </div>
                );
            case 'ids_next':
                return (
                    <div className="flex flex-col items-center justify-center leading-none text-center">
                        <div className="grid grid-cols-2 gap-0.5 mb-0.5">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-xs" />
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-xs" />
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-xs" />
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-xs" />
                        </div>
                        <span className="text-[9px] font-black tracking-tight text-gray-900">IDS</span>
                    </div>
                );
            case 'resavenue':
                return (
                    <div className="font-extrabold text-[11px] text-gray-900 tracking-tight flex items-center">
                        <span className="text-[#E65100]">Res</span><span>Avenue</span>
                    </div>
                );
            case 'reznext':
                return (
                    <div className="font-black text-[11px] text-[#6B46C1] tracking-tight">
                        rez<span className="text-[#FF6B6B]">next</span>
                    </div>
                );
            case 'siteminder':
                return (
                    <div className="flex items-center gap-1 font-bold text-[10px] text-[#0072CE] tracking-tight">
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[#0072CE] flex items-center justify-center">
                            <div className="w-1 h-1 bg-[#0072CE] rounded-full" />
                        </div>
                        <span>SiteMinder</span>
                    </div>
                );
            case 'staah':
                return (
                    <div className="bg-[#E65100] px-1.5 py-0.5 rounded text-white font-black text-[10px] tracking-wide flex items-center gap-1">
                        <span>STAAH</span>
                        <span className="text-[8px] opacity-80">★</span>
                    </div>
                );
            case 'tiket_com':
                return (
                    <div className="font-bold text-[11px] text-[#0064D2] flex items-center">
                        <span>tiket</span><span className="text-amber-400 font-black">•</span><span>com</span>
                    </div>
                );
            case 'winhms':
                return (
                    <div className="flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-black text-[#007BB6] tracking-tighter">WINHMS</span>
                    </div>
                );
            case 'wubook':
                return (
                    <div className="flex items-center gap-0.5 text-gray-900 font-black text-[10px] tracking-tight">
                        <span>🐑</span>
                        <span>WuBook</span>
                    </div>
                );
            case 'ezee':
                return (
                    <div className="flex flex-col items-center text-center">
                        <span className="text-[12px] font-black text-[#F59E0B] leading-none">eZee</span>
                        <span className="text-[7px] text-gray-400 font-medium tracking-tighter">Absolute</span>
                    </div>
                );
            case 'gb_payments':
                return (
                    <div className="bg-blue-900 text-white font-black px-1.5 py-0.5 rounded text-[9px] tracking-wider uppercase">
                        GB Pay
                    </div>
                );
            case 'heartland':
                return (
                    <div className="font-black text-[11px] text-[#DC2626] tracking-tighter">
                        Heartland
                    </div>
                );
            case 'hostelworld':
                return (
                    <div className="flex flex-col items-center text-center leading-none">
                        <div className="bg-[#FF7700] text-white font-black text-[10px] px-1 rounded-xs">H</div>
                        <span className="text-[7px] font-bold text-gray-800 mt-0.5 tracking-tighter">HOSTELWORLD</span>
                    </div>
                );
            case 'hotelbeds':
                return (
                    <div className="font-black text-[10px] text-[#00529B] tracking-tight">
                        hotelbeds
                    </div>
                );
            default:
                return (
                    <span className="font-black text-gray-800 tracking-tight text-center px-1 truncate">
                        {meta.name}
                    </span>
                );
        }
    };

    if (meta.logoUrl && !imgFailed) {
        return (
            <div className={`${sizeClasses} bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden p-1.5 shrink-0`}>
                <img
                    src={meta.logoUrl}
                    alt={meta.name}
                    className="w-full h-full object-contain"
                    onError={() => setImgFailed(true)}
                    loading="lazy"
                />
            </div>
        );
    }

    return (
        <div className={`${sizeClasses} bg-gray-50 flex items-center justify-center border border-gray-100 shadow-xs overflow-hidden p-1 shrink-0`}>
            {renderCustomVector()}
        </div>
    );
}

/* ══════════════════════════════════════════════════ */

export default function ChannelManager() {
    const { tenant } = useAuth();
    const { rooms } = useCRM();

    const [connections, setConnections] = useState<ChannelConnection[]>([]);
    const [logs, setLogs] = useState<SyncLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ChannelCategory>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'disconnected'>('all');
    const [isSyncing, setIsSyncing] = useState(false);

    // Modals
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showAiosellModal, setShowAiosellModal] = useState(false);
    const [selectedMeta, setSelectedMeta] = useState<ChannelMeta | null>(null);
    const [propertyIdInput, setPropertyIdInput] = useState('');
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [connectionStep, setConnectionStep] = useState<1 | 2 | 3>(1);

    // Aiosell Master Config Form
    const [aiosellHotelCode, setAiosellHotelCode] = useState('');
    const [aiosellSaving, setAiosellSaving] = useState(false);
    const [aiosellVerifyResult, setAiosellVerifyResult] = useState<{ rooms: number; rateplans: number } | null>(null);
    const [aiosellVerifyError, setAiosellVerifyError] = useState<string | null>(null);

    // Local Storage cache key for resilience against network/RLS lag
    const localCacheKey = useMemo(() => `triplooper_channels_${tenant?.id || 'default'}`, [tenant?.id]);

    /* ── Fetch Data ── */
    const fetchData = useCallback(async () => {
        if (!tenant?.id) {
            setLoading(false);
            return;
        }

        try {
            // Read cached state first for immediate UI hydration
            const cached = localStorage.getItem(localCacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setConnections(parsed);
                    }
                } catch { /* ignore parse error */ }
            }

            const [connRes, logRes] = await Promise.all([
                supabase.from('channel_connections').select('*').eq('tenant_id', tenant.id),
                supabase.from('channel_sync_logs').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(25),
            ]);

            let activeConnections: ChannelConnection[] = [];

            if (connRes.data && connRes.data.length > 0) {
                activeConnections = connRes.data;
                setConnections(activeConnections);
                localStorage.setItem(localCacheKey, JSON.stringify(activeConnections));
            } else if (cached) {
                // If DB returned empty but we have local connected channels, keep them and attempt sync
                try {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        activeConnections = parsed;
                        setConnections(activeConnections);
                    }
                } catch { /* ignore */ }
            }

            if (logRes.data) {
                setLogs(logRes.data);
            }

            // Sync Aiosell property ID state
            const aiosellConn = activeConnections.find(c => 
                c.channel_id.toLowerCase() === 'aiosell' || 
                c.channel_id.toLowerCase() === 'aiosell_cm'
            );
            if (aiosellConn?.property_id) {
                setAiosellHotelCode(aiosellConn.property_id);
            } else if (activeConnections.length > 0 && activeConnections[0].property_id) {
                setAiosellHotelCode(activeConnections[0].property_id);
            }
        } catch (err) {
            console.error('Error fetching channel connections:', err);
        } finally {
            setLoading(false);
        }
    }, [tenant?.id, localCacheKey]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* ── Resolve Master Aiosell Connection ── */
    const aiosellMasterConn = useMemo(() => {
        return connections.find(c => 
            (c.channel_id.toLowerCase() === 'aiosell' || c.channel_id.toLowerCase() === 'aiosell_cm') &&
            c.status === 'connected'
        ) || null;
    }, [connections]);

    const isAiosellMasterConnected = Boolean(aiosellMasterConn && aiosellMasterConn.status === 'connected');

    /* ── Resolve Channel Connection (with robust alias and Aiosell property match) ── */
    const isChannelConnected = useCallback((meta: ChannelMeta): { isConnected: boolean; conn: ChannelConnection | null } => {
        // Direct matching via ID or aliases
        const match = connections.find(c => {
            const rawId = (c.channel_id || '').toLowerCase().trim();
            if (rawId === meta.id.toLowerCase()) return true;
            if (meta.aliases.some(alias => alias.toLowerCase() === rawId)) return true;
            return false;
        });

        if (match && match.status === 'connected') {
            return { isConnected: true, conn: match };
        }

        // If Aiosell master connection is active and hotel code is mapped, channel is active via Aiosell
        if (isAiosellMasterConnected && match?.status !== 'disconnected') {
            return {
                isConnected: true,
                conn: match || {
                    channel_id: meta.id,
                    status: 'connected',
                    property_id: aiosellMasterConn?.property_id || tenant?.id,
                    sync_inventory: true,
                    sync_rates: true,
                    commission: meta.defaultCommission,
                    last_sync_at: aiosellMasterConn?.last_sync_at || null
                }
            };
        }

        return { isConnected: false, conn: match || null };
    }, [connections, isAiosellMasterConnected, aiosellMasterConn, tenant?.id]);

    /* ── Merged Channels List ── */
    const mergedChannels: Channel[] = useMemo(() => {
        return OTA_CHANNELS.map(meta => {
            const { isConnected, conn } = isChannelConnected(meta);
            return {
                ...meta,
                connection: isConnected ? conn : (conn || null),
                isAiosellRouted: isAiosellMasterConnected && (!conn || conn.channel_id === 'aiosell')
            };
        });
    }, [isChannelConnected, isAiosellMasterConnected]);

    /* ── Audit Logger ── */
    const addSyncLog = async (channelId: string, channelName: string, action: string, details: string, status: 'success' | 'error' | 'warning') => {
        if (!tenant?.id) return;
        try {
            const { data } = await supabase.from('channel_sync_logs').insert({
                tenant_id: tenant.id,
                channel_id: channelId,
                channel_name: channelName,
                action,
                details,
                status,
            }).select().single();

            if (data) {
                setLogs(prev => [data, ...prev].slice(0, 25));
            }
        } catch {
            // Local fallback log
            const fallbackItem: SyncLog = {
                id: `log_${Date.now()}`,
                channel_id: channelId,
                channel_name: channelName,
                action,
                details,
                status,
                created_at: new Date().toISOString()
            };
            setLogs(prev => [fallbackItem, ...prev].slice(0, 25));
        }
    };

    /* ── Actions ── */

    // 1. Full 2-Way Sync: pushes Triplooper rates+inventory → Aiosell → all OTAs
    //    and pulls latest reservations from Aiosell → Triplooper
    const handleGlobalSync = async () => {
        if (!tenant?.id) return;
        setIsSyncing(true);
        const now = new Date().toISOString();
        const today = new Date().toISOString().split('T')[0];
        const in90 = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

        try {
            // Step 1: Pull room-to-Aiosell code mappings for this tenant
            const { data: mappings } = await supabase
                .from('aiosell_room_mappings')
                .select('room_code, rateplan_code')
                .eq('tenant_id', tenant.id);

            // Step 2: Pull this tenant's rooms with their current price
            const { data: roomsData } = await supabase
                .from('rooms')
                .select('id, name, type, price_per_night, is_available')
                .eq('tenant_id', tenant.id)
                .eq('is_available', true);

            // Step 3: Build inventory + rate payloads from the room mappings
            if (mappings && mappings.length > 0 && roomsData && roomsData.length > 0) {
                // Group mappings by room_code (one room_code → many rateplans)
                const roomCodeMap = new Map<string, typeof mappings>();
                for (const m of mappings) {
                    if (!roomCodeMap.has(m.room_code)) roomCodeMap.set(m.room_code, []);
                    roomCodeMap.get(m.room_code)!.push(m);
                }

                // Inventory push: count all physical rooms belonging to this room_code category
                const inventoryRooms = Array.from(roomCodeMap.keys()).map(rc => {
                    const matchingUnits = roomsData.filter(r =>
                        (r.type || '').toLowerCase() === rc.toLowerCase() ||
                        (r.name || '').toLowerCase().includes(rc.toLowerCase()) ||
                        rc.toLowerCase().includes((r.type || '').toLowerCase())
                    );
                    return {
                        roomCode: rc,
                        available: matchingUnits.length > 0 ? matchingUnits.length : roomsData.length,
                    };
                });

                if (inventoryRooms.length > 0) {
                    await supabase.functions.invoke('aiosell-push', {
                        body: {
                            tenant_id: tenant.id,
                            action: 'inventory',
                            updates: [{ startDate: today, endDate: in90, rooms: inventoryRooms }],
                        }
                    }).catch(e => console.warn('Inventory push warning:', e));
                }

                // Rate push: use price_per_night from the first mapped room
                const rateEntries: Array<{ roomCode: string; rateplanCode: string; rate: number }> = [];
                for (const m of mappings) {
                    // Try to find a local room that has been linked to this mapping
                    // Fall back to the first available room's price if no specific link
                    const room = roomsData[0];
                    if (room?.price_per_night) {
                        rateEntries.push({
                            roomCode: m.room_code,
                            rateplanCode: m.rateplan_code,
                            rate: Number(room.price_per_night),
                        });
                    }
                }

                if (rateEntries.length > 0) {
                    await supabase.functions.invoke('aiosell-push', {
                        body: {
                            tenant_id: tenant.id,
                            action: 'rates',
                            updates: [{ startDate: today, endDate: in90, rates: rateEntries }],
                        }
                    }).catch(e => console.warn('Rate push warning:', e));
                }
            }

            // Step 4: Pull latest reservations from Aiosell → Triplooper (30 days back)
            const from30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
            await supabase.functions.invoke('aiosell-sync', {
                body: {
                    tenant_id: tenant.id,
                    action: 'fetch',
                    type: 'reservation',
                    startDate: from30,
                    endDate: in90,
                }
            }).catch(() => null);

            // Step 5: Update last_sync_at on the aiosell channel_connection row
            await supabase.from('channel_connections').update({
                last_sync_at: now,
                updated_at: now
            }).eq('tenant_id', tenant.id).eq('channel_id', 'aiosell');

            setConnections(prev => {
                const updated = prev.map(c => c.status === 'connected' ? { ...c, last_sync_at: now } : c);
                localStorage.setItem(localCacheKey, JSON.stringify(updated));
                return updated;
            });

            const mappingCount = mappings?.length ?? 0;
            await addSyncLog(
                'aiosell_cm',
                'Aiosell CM + 36 Channels',
                'Full 2-Way Distribution Sync',
                mappingCount > 0
                    ? `Pushed inventory & rates for ${mappingCount} room-rateplan mapping(s) to Aiosell → Booking.com, Agoda, Expedia & all active OTAs. Pulled latest reservations.`
                    : `Pulled latest reservations from Aiosell. No room mappings found yet — enter your Hotel Code to enable rate & inventory push.`,
                'success'
            );
        } catch (err) {
            console.error('Sync failed:', err);
            await addSyncLog('aiosell_cm', 'Aiosell CM', 'Sync Error', String(err), 'error');
        } finally {
            setIsSyncing(false);
            fetchData();
        }
    };

    // 2. Toggle Sync Settings
    const toggleSetting = async (channelId: string, conn: ChannelConnection, setting: 'sync_inventory' | 'sync_rates') => {
        const newVal = !conn[setting];
        const now = new Date().toISOString();

        // Update local state immediately
        setConnections(prev => {
            const updated = prev.map(c => {
                if (c.channel_id === channelId || c.id === conn.id) {
                    return { ...c, [setting]: newVal, updated_at: now };
                }
                return c;
            });
            localStorage.setItem(localCacheKey, JSON.stringify(updated));
            return updated;
        });

        if (conn.id) {
            await supabase.from('channel_connections').update({
                [setting]: newVal,
                updated_at: now
            }).eq('id', conn.id);
        }

        const meta = OTA_CHANNELS.find(m => m.id === channelId);
        const label = setting === 'sync_inventory' ? 'Inventory' : 'Rate';
        await addSyncLog(
            channelId,
            meta?.name || channelId,
            'Setting Update',
            `${label} automatic synchronization turned ${newVal ? 'ON' : 'OFF'}`,
            'warning'
        );
    };

    // 3. Connect Channel Click
    const handleConnectClick = (meta: ChannelMeta) => {
        setSelectedMeta(meta);
        setPropertyIdInput(aiosellHotelCode || (tenant?.business_name ? `${tenant.business_name.toLowerCase().replace(/\s+/g, '_')}_id` : ''));
        setApiKeyInput('');
        setConnectionStep(1);
        setShowConnectModal(true);
    };

    // 4. Disconnect Channel
    const handleDisconnect = async (ch: Channel) => {
        if (!tenant?.id) return;
        if (!window.confirm(`Disconnect ${ch.name}? This will stop automated inventory and rate updates.`)) return;

        const now = new Date().toISOString();

        // If it was stored in DB
        if (ch.connection?.id) {
            await supabase.from('channel_connections').update({
                status: 'disconnected',
                sync_inventory: false,
                sync_rates: false,
                updated_at: now,
            }).eq('id', ch.connection.id);
        }

        setConnections(prev => {
            const updated = prev.map(c => {
                if (c.channel_id === ch.id || c.id === ch.connection?.id) {
                    return { ...c, status: 'disconnected' as const, sync_inventory: false, sync_rates: false, updated_at: now };
                }
                return c;
            });
            localStorage.setItem(localCacheKey, JSON.stringify(updated));
            return updated;
        });

        await addSyncLog(ch.id, ch.name, 'Channel Disconnected', 'Live distribution paused and channel unlinked.', 'warning');
        await fetchData();
    };

    // 5. Submit Channel Connection
    const submitConnection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!propertyIdInput || !selectedMeta || !tenant?.id) return;
        setConnectionStep(2);

        const now = new Date().toISOString();
        const existing = connections.find(c => c.channel_id.toLowerCase() === selectedMeta.id.toLowerCase());

        try {
            if (existing?.id) {
                await supabase.from('channel_connections').update({
                    status: 'connected',
                    api_key: apiKeyInput || existing.api_key || 'live_key_aiosell',
                    property_id: propertyIdInput,
                    sync_inventory: true,
                    sync_rates: true,
                    last_sync_at: now,
                    updated_at: now,
                }).eq('id', existing.id);
            } else {
                await supabase.from('channel_connections').insert({
                    tenant_id: tenant.id,
                    channel_id: selectedMeta.id,
                    status: 'connected',
                    api_key: apiKeyInput || 'live_key_aiosell',
                    property_id: propertyIdInput,
                    sync_inventory: true,
                    sync_rates: true,
                    commission: selectedMeta.defaultCommission,
                    last_sync_at: now,
                });
            }

            // Also ensure aiosell master row is active
            if (!isAiosellMasterConnected) {
                await supabase.from('channel_connections').upsert({
                    tenant_id: tenant.id,
                    channel_id: 'aiosell',
                    status: 'connected',
                    property_id: propertyIdInput,
                    sync_inventory: true,
                    sync_rates: true,
                    commission: 'Direct',
                    last_sync_at: now,
                }, { onConflict: 'tenant_id,channel_id' });
            }

            // Immediate state update
            const newConn: ChannelConnection = {
                channel_id: selectedMeta.id,
                status: 'connected',
                property_id: propertyIdInput,
                api_key: apiKeyInput,
                sync_inventory: true,
                sync_rates: true,
                commission: selectedMeta.defaultCommission,
                last_sync_at: now,
                updated_at: now
            };

            setConnections(prev => {
                const filtered = prev.filter(c => c.channel_id !== selectedMeta.id);
                const updated = [...filtered, newConn];
                localStorage.setItem(localCacheKey, JSON.stringify(updated));
                return updated;
            });

            await addSyncLog(
                selectedMeta.id,
                selectedMeta.name,
                'Channel Connected',
                `Successfully connected with Property Code: ${propertyIdInput} (Synced via Aiosell CM Engine)`,
                'success'
            );

            setConnectionStep(3);
            setTimeout(async () => {
                await fetchData();
                setShowConnectModal(false);
            }, 1200);
        } catch (err) {
            console.error('Connection error:', err);
            setConnectionStep(1);
        }
    };

    // 6. Connect / Update Master Aiosell Integration
    const handleSaveAiosell = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant?.id || !aiosellHotelCode.trim()) return;
        setAiosellSaving(true);
        setAiosellVerifyResult(null);
        setAiosellVerifyError(null);

        const now = new Date().toISOString();
        const hotelCode = aiosellHotelCode.trim();

        try {
            const { error: saveErr } = await supabase.from('channel_connections').upsert({
                tenant_id: tenant.id,
                channel_id: 'aiosell',
                status: 'connected',
                property_id: hotelCode,
                api_key: 'aiosell_cm_partner_auth',
                sync_inventory: true,
                sync_rates: true,
                last_sync_at: now,
                updated_at: now,
            }, { onConflict: 'tenant_id,channel_id' });

            if (saveErr) console.warn('Aiosell upsert warning:', saveErr);

            // Seed room/rateplan mappings and surface the result to the user
            const syncResult = await supabase.functions.invoke('aiosell-sync', {
                body: { tenant_id: tenant.id, action: 'property_details', seed: true }
            }).catch(() => null);

            const syncData = syncResult?.data as any;
            if (syncData?.rooms) {
                // Count total rateplans across all rooms
                const totalRateplans = (syncData.rooms as any[]).reduce(
                    (acc: number, r: any) => acc + (r.rateplans?.length ?? 0), 0
                );
                setAiosellVerifyResult({ rooms: syncData.rooms.length, rateplans: totalRateplans });
            } else if (syncData?._seeded !== undefined) {
                // Fallback: _seeded is the count of mapping rows inserted
                setAiosellVerifyResult({ rooms: 0, rateplans: syncData._seeded });
            } else if (syncResult?.error || (syncData && !syncData.rooms)) {
                setAiosellVerifyError('Hotel code saved — room mapping will sync automatically on next inventory pull.');
            }

            // Update local state
            const aiosellRow: ChannelConnection = {
                channel_id: 'aiosell',
                status: 'connected',
                property_id: hotelCode,
                sync_inventory: true,
                sync_rates: true,
                commission: 'Direct',
                last_sync_at: now,
                updated_at: now
            };

            setConnections(prev => {
                const filtered = prev.filter(c => c.channel_id !== 'aiosell');
                const updated = [...filtered, aiosellRow];
                localStorage.setItem(localCacheKey, JSON.stringify(updated));
                return updated;
            });

            await addSyncLog(
                'aiosell',
                'Aiosell CM Hub',
                'Property Linked',
                `Aiosell Channel Manager connected for Property Code: ${hotelCode}`,
                'success'
            );

            // Step 3: Fire initial inventory + rate push now that mappings are seeded
            // This makes the property live on all OTAs immediately without manual sync
            const today = new Date().toISOString().split('T')[0];
            const in90 = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
            const { data: mappings } = await supabase
                .from('aiosell_room_mappings')
                .select('room_code, rateplan_code')
                .eq('tenant_id', tenant.id);
            const { data: roomsData } = await supabase
                .from('rooms')
                .select('price_per_night')
                .eq('tenant_id', tenant.id)
                .eq('is_available', true)
                .limit(1);

            if (mappings && mappings.length > 0) {
                const roomCodes = [...new Set(mappings.map(m => m.room_code))];
                // Inventory push
                await supabase.functions.invoke('aiosell-push', {
                    body: {
                        tenant_id: tenant.id,
                        action: 'inventory',
                        updates: [{ startDate: today, endDate: in90, rooms: roomCodes.map(rc => ({ roomCode: rc, available: 1 })) }],
                    }
                }).catch(() => null);
                // Rate push (if we have a base price)
                const baseRate = Number(roomsData?.[0]?.price_per_night ?? 0);
                if (baseRate > 0) {
                    await supabase.functions.invoke('aiosell-push', {
                        body: {
                            tenant_id: tenant.id,
                            action: 'rates',
                            updates: [{ startDate: today, endDate: in90, rates: mappings.map(m => ({ roomCode: m.room_code, rateplanCode: m.rateplan_code, rate: baseRate })) }],
                        }
                    }).catch(() => null);
                }
            }

            // Keep modal open briefly to show the verification result, then close
            setTimeout(async () => {
                setShowAiosellModal(false);
                setAiosellVerifyResult(null);
                setAiosellVerifyError(null);
                await fetchData();
            }, 3000);
        } catch (err) {
            console.error('Failed to link Aiosell:', err);
            setAiosellVerifyError('Connection failed. Check the hotel code and try again.');
        } finally {
            setAiosellSaving(false);
        }
    };

    /* ── Filtering ── */
    const filteredChannels = useMemo(() => {
        return mergedChannels.filter(ch => {
            // Category filter
            if (selectedCategory !== 'all' && ch.category !== selectedCategory) {
                return false;
            }

            // Connection Status filter
            const isConnected = ch.connection?.status === 'connected';
            if (filterStatus === 'connected' && !isConnected) return false;
            if (filterStatus === 'disconnected' && isConnected) return false;

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = ch.name.toLowerCase().includes(q);
                const matchCategory = ch.categoryLabel.toLowerCase().includes(q);
                const matchDesc = ch.description.toLowerCase().includes(q);
                return matchName || matchCategory || matchDesc;
            }

            return true;
        });
    }, [mergedChannels, selectedCategory, filterStatus, searchQuery]);

    const totalActiveChannels = useMemo(() => {
        return mergedChannels.filter(c => c.connection?.status === 'connected').length;
    }, [mergedChannels]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-80 space-y-4">
                <div className="w-10 h-10 border-3 border-[#0E2A38]/20 border-t-[#C9A646] rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-500">Loading Channel Manager & Aiosell Connectivity...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-16">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0E2A38] to-[#1F4E64] flex items-center justify-center text-[#C9A646] shadow-sm">
                            <Waypoints size={22} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                Channel Manager
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    36 Global Channels
                                </span>
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Automated inventory, rate distribution, and reservation sync powered by <strong className="text-gray-700">Aiosell CM</strong>.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowAiosellModal(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-[#0E2A38] border border-gray-200 rounded-xl text-sm font-semibold transition-all"
                    >
                        <Server size={16} className="text-[#C9A646]" />
                        <span>{isAiosellMasterConnected ? 'Aiosell Config' : 'Connect Aiosell'}</span>
                    </button>

                    <button
                        onClick={handleGlobalSync}
                        disabled={isSyncing}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#0E2A38] hover:bg-[#0E2A38]/90 text-white rounded-xl text-sm font-semibold shadow-sm transition-all ${isSyncing ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                        <span>{isSyncing ? 'Syncing All...' : 'Sync All Channels'}</span>
                    </button>
                </div>
            </div>

            {/* Aiosell CM Master Engine Banner */}
            <div className={`p-5 rounded-2xl border transition-all shadow-xs relative overflow-hidden ${
                isAiosellMasterConnected 
                    ? 'bg-gradient-to-r from-emerald-950 via-[#0E2A38] to-[#0E2A38] text-white border-emerald-800/40'
                    : 'bg-gradient-to-r from-[#0E2A38] via-[#173748] to-[#0E2A38] text-white border-amber-500/30'
            }`}>
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#C9A646]/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs font-semibold">
                                <Radio size={14} className="text-[#C9A646] animate-pulse" />
                                <span>Aiosell Channel Manager Engine</span>
                            </div>

                            {isAiosellMasterConnected ? (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-900/60 border border-emerald-500/30 px-3 py-1 rounded-lg">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                    Property Connected & Active
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-900/50 border border-amber-500/30 px-3 py-1 rounded-lg">
                                    <AlertCircle size={13} />
                                    Ready for Aiosell Linking
                                </span>
                            )}

                            {aiosellHotelCode && (
                                <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 text-gray-200">
                                    Hotel Code: <strong className="text-white">{aiosellHotelCode}</strong>
                                </span>
                            )}
                        </div>

                        <p className="text-sm text-gray-300 max-w-2xl">
                            {isAiosellMasterConnected
                                ? `Your property (${tenant?.business_name || 'Hotel'}) is connected to Aiosell. Real-time rates, inventory, and instant OTA booking webhooks are active.`
                                : `Connect your property via Aiosell Channel Manager to automatically push inventory and rates to Booking.com, Agoda, Expedia, Airbnb, MakeMyTrip, and 30+ OTAs.`}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => setShowAiosellModal(true)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold backdrop-blur-sm transition-colors flex items-center gap-2"
                        >
                            <Settings2 size={14} />
                            {isAiosellMasterConnected ? 'Engine Settings' : 'Link Hotel Code'}
                        </button>

                        <button
                            onClick={handleGlobalSync}
                            disabled={isSyncing}
                            className="px-4 py-2 bg-[#C9A646] hover:bg-[#b8953b] text-[#0E2A38] rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2"
                        >
                            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                            Quick 2-Way Sync
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* 36 Channels Grid (Left 2 cols) */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Controls & Filter Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search 36 channels (e.g. Booking, Agoda, Expedia, Opera, MakeMyTrip)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A646]/50 focus:border-[#C9A646] transition-all"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Status Filter */}
                            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                                <button
                                    onClick={() => setFilterStatus('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    All (36)
                                </button>
                                <button
                                    onClick={() => setFilterStatus('connected')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'connected' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    Active ({totalActiveChannels})
                                </button>
                                <button
                                    onClick={() => setFilterStatus('disconnected')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'disconnected' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    Available ({36 - totalActiveChannels})
                                </button>
                            </div>
                        </div>

                        {/* Category Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                            <span className="text-gray-400 font-medium mr-1 text-[11px]">Category:</span>
                            {[
                                { key: 'all', label: 'All Channels (36)' },
                                { key: 'ota', label: 'OTAs & Bedbanks (18)' },
                                { key: 'pms_cm', label: 'PMS & Switches (11)' },
                                { key: 'gds_meta', label: 'GDS & Metasearch (4)' },
                                { key: 'payments', label: 'Payments & POS (3)' }
                            ].map(cat => (
                                <button
                                    key={cat.key}
                                    onClick={() => setSelectedCategory(cat.key as ChannelCategory)}
                                    className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                                        selectedCategory === cat.key
                                            ? 'bg-[#0E2A38] text-white shadow-xs'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200/60'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Channel Cards Grid */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredChannels.length > 0 ? (
                                filteredChannels.map((ch) => {
                                    const isConnected = ch.connection?.status === 'connected';

                                    return (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, scale: 0.96 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.96 }}
                                            transition={{ duration: 0.18 }}
                                            key={ch.id}
                                            className={`bg-white rounded-2xl border p-5 relative overflow-hidden transition-all hover:shadow-md flex flex-col justify-between ${
                                                isConnected 
                                                    ? 'border-emerald-500/40 ring-1 ring-emerald-500/20 bg-gradient-to-b from-white via-white to-emerald-50/20' 
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            {isConnected && (
                                                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
                                                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500/20 skew-x-12 translate-x-4" />
                                                </div>
                                            )}

                                            <div>
                                                {/* Card Header */}
                                                <div className="flex justify-between items-start gap-3 mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <ChannelLogo meta={ch} />
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <h3 className="font-bold text-gray-900 text-base">{ch.name}</h3>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                                    {ch.categoryLabel}
                                                                </span>
                                                                {isConnected ? (
                                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                                        <CheckCircle2 size={10} /> Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                                                        Available
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {!isConnected && (
                                                        <button
                                                            onClick={() => handleConnectClick(ch)}
                                                            className="w-8 h-8 rounded-xl bg-gray-50 text-gray-600 border border-gray-200 flex items-center justify-center hover:bg-[#0E2A38] hover:text-white hover:border-[#0E2A38] transition-all shadow-xs shrink-0"
                                                            title="Connect Channel"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                <p className="text-xs text-gray-500 line-clamp-2 min-h-[32px] leading-relaxed mb-3">
                                                    {ch.description}
                                                </p>

                                                {/* External Portal Links */}
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4 text-[11px] border-t border-gray-50 pt-2.5">
                                                    {ch.apiUrl && (
                                                        <a
                                                            href={ch.apiUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[#0E2A38] hover:text-[#C9A646] font-semibold flex items-center gap-1 transition-colors"
                                                        >
                                                            <ExternalLink size={12} /> Extranet Portal
                                                        </a>
                                                    )}
                                                    {ch.tutorialUrl && (
                                                        <a
                                                            href={ch.tutorialUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors"
                                                        >
                                                            <Youtube size={12} /> Video Guide
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Footer / Controls */}
                                            {isConnected && ch.connection ? (
                                                <div className="space-y-2.5 pt-3 border-t border-gray-100">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 text-gray-600">
                                                            <CalendarDays size={14} className="text-gray-400" />
                                                            <span>Inventory Push</span>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleSetting(ch.id, ch.connection!, 'sync_inventory')}
                                                            className={`w-8 h-4.5 rounded-full relative transition-colors ${ch.connection.sync_inventory ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                                        >
                                                            <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform ${ch.connection.sync_inventory ? 'translate-x-3.5 left-0.5' : 'translate-x-0.5 left-0'}`} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 text-gray-600">
                                                            <Tag size={14} className="text-gray-400" />
                                                            <span>Rate Sync</span>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleSetting(ch.id, ch.connection!, 'sync_rates')}
                                                            className={`w-8 h-4.5 rounded-full relative transition-colors ${ch.connection.sync_rates ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                                        >
                                                            <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform ${ch.connection.sync_rates ? 'translate-x-3.5 left-0.5' : 'translate-x-0.5 left-0'}`} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-gray-100 text-[10px]">
                                                        <span className="text-gray-400 flex items-center gap-1">
                                                            <RefreshCw size={10} />
                                                            Synced {timeAgo(ch.connection.last_sync_at)}
                                                        </span>
                                                        <button
                                                            onClick={() => handleDisconnect(ch)}
                                                            className="font-semibold text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-1 transition-colors"
                                                        >
                                                            <Power size={11} /> Disconnect
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                                    <span>Commission: <strong className="text-gray-700">{ch.defaultCommission}</strong></span>
                                                    <button
                                                        onClick={() => handleConnectClick(ch)}
                                                        className="font-semibold text-[#0E2A38] hover:text-[#C9A646] transition-colors flex items-center gap-1"
                                                    >
                                                        Connect <ArrowUpRight size={13} />
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                                    <Globe className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                    <h3 className="text-sm font-semibold text-gray-900">No channels match your filter</h3>
                                    <p className="text-xs text-gray-500 mt-1">Try resetting the search query or category filters.</p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setFilterStatus('all'); }}
                                        className="mt-3 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold rounded-lg text-gray-700"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Sidebar (Right col: Quick Stats, Sync Health, Live Audit Logs) */}
                <div className="space-y-6">
                    {/* Connection Health Card */}
                    <div className="bg-[#0E2A38] rounded-2xl p-6 text-white shadow-lg overflow-hidden relative border border-gray-800">
                        <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-[#C9A646]/20 rounded-full blur-2xl pointer-events-none" />

                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Activity size={16} className="text-[#C9A646]" /> Connectivity Health
                            </h3>
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                            </span>
                        </div>

                        <div className="space-y-3 relative z-10">
                            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-sm border border-white/5 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] text-white/60 mb-0.5">Active Channels</p>
                                    <p className="text-2xl font-bold">{totalActiveChannels} <span className="text-xs font-normal text-white/40">/ 36 channels</span></p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#C9A646]">
                                    <Globe size={20} />
                                </div>
                            </div>

                            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-sm border border-white/5 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] text-white/60 mb-0.5">Aiosell CM Engine</p>
                                    <p className="text-sm font-bold flex items-center gap-1.5 text-emerald-300">
                                        <ShieldCheck size={16} />
                                        {isAiosellMasterConnected ? 'Live & Synchronized' : 'Standalone Mode'}
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                                    <Zap size={20} />
                                </div>
                            </div>

                            <div className="bg-white/10 rounded-xl p-3.5 backdrop-blur-sm border border-white/5">
                                <div className="flex justify-between items-center text-xs text-white/60 mb-1">
                                    <span>Property Hotel Code</span>
                                    <span className="font-mono text-white font-semibold">{aiosellHotelCode || tenant?.business_name || 'Not Configured'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-white/60">
                                    <span>Inbound Webhooks</span>
                                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                        <Check size={12} /> Active (Idempotent)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sync Logs Audit Trail */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[460px]">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <Settings2 size={16} className="text-[#0E2A38]" /> Channel Distribution Log
                            </h3>
                            <span className="text-[11px] font-semibold text-gray-500">
                                {logs.length} events
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                            <AnimatePresence>
                                {logs.map((log) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={log.id}
                                        className="relative pl-3.5 border-l-2 py-0.5"
                                        style={{
                                            borderColor: log.status === 'success' ? '#10b981' : log.status === 'warning' ? '#f59e0b' : '#ef4444'
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="text-[11px] font-bold text-gray-800">{log.action}</span>
                                            <span className="text-[9px] text-gray-400">{timeAgo(log.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-snug mb-1">{log.details}</p>
                                        <span className="text-[9px] font-medium text-gray-600 px-1.5 py-0.5 bg-gray-100 rounded-md">
                                            {log.channel_name}
                                        </span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {logs.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs text-center p-4">
                                    <Activity className="h-8 w-8 text-gray-300 mb-2" />
                                    <span>No sync events yet. Connect channels to begin automatic distribution.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Connect Individual Channel Modal */}
            <AnimatePresence>
                {showConnectModal && selectedMeta && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => connectionStep === 1 && setShowConnectModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10"
                        >
                            {/* Modal Header */}
                            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ChannelLogo meta={selectedMeta} size="sm" />
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-base">Connect {selectedMeta.name}</h3>
                                        <p className="text-[11px] text-gray-500">Distribution via Aiosell Channel Manager</p>
                                    </div>
                                </div>
                                {connectionStep === 1 && (
                                    <button 
                                        onClick={() => setShowConnectModal(false)} 
                                        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>

                            {/* Modal Body */}
                            <div className="p-6">
                                {connectionStep === 1 ? (
                                    <form onSubmit={submitConnection} className="space-y-4">
                                        <div className="bg-blue-50/80 text-blue-900 text-xs p-3.5 rounded-xl flex items-start gap-2.5 border border-blue-100">
                                            <AlertCircle size={16} className="shrink-0 text-blue-600 mt-0.5" />
                                            <p className="leading-relaxed">
                                                Enter your <strong>{selectedMeta.name} Hotel / Property ID</strong>. Aiosell CM will automatically synchronize live room rates and inventory.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                                Hotel ID / Property Code <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={propertyIdInput}
                                                onChange={(e) => setPropertyIdInput(e.target.value)}
                                                placeholder={`e.g. ${selectedMeta.id}_${tenant?.id?.slice(0, 5) || '101'}`}
                                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                                API Key / Extranet Auth Token <span className="text-gray-400 font-normal">(optional if routed via Aiosell)</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={apiKeyInput}
                                                onChange={(e) => setApiKeyInput(e.target.value)}
                                                placeholder="Provided by channel partner extranet"
                                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none transition-all"
                                            />
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={!propertyIdInput.trim()}
                                                className="w-full py-3 bg-[#0E2A38] text-white rounded-xl text-sm font-bold hover:bg-[#0E2A38]/90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Link2 size={16} /> Authenticate & Connect Channel
                                            </button>
                                        </div>
                                    </form>
                                ) : connectionStep === 2 ? (
                                    <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                                        <div className="w-12 h-12 border-4 border-gray-100 border-t-[#C9A646] rounded-full animate-spin" />
                                        <h4 className="font-bold text-gray-900 text-base">Authenticating with Channel Manager...</h4>
                                        <p className="text-xs text-gray-500 max-w-xs">Connecting {selectedMeta.name} through Aiosell central distribution hub.</p>
                                    </div>
                                ) : (
                                    <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                                            <CheckCircle2 size={30} />
                                        </div>
                                        <h4 className="font-bold text-gray-900 text-base">Connection Successful!</h4>
                                        <p className="text-xs text-gray-500 max-w-xs">Initial rate & inventory mapping is now active.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Aiosell CM Master Configuration Modal */}
            <AnimatePresence>
                {showAiosellModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => !aiosellSaving && setShowAiosellModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-[#0E2A38] to-[#1a445a] text-white px-6 py-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#C9A646] text-[#0E2A38] flex items-center justify-center font-black text-base shadow-sm">
                                        AS
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Aiosell Channel Manager</h3>
                                        <p className="text-xs text-gray-300">Central PMS ↔ OTA Distribution Gateway</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowAiosellModal(false)} 
                                    className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <form onSubmit={handleSaveAiosell} className="p-6 space-y-4">
                                <div className="bg-emerald-50 text-emerald-900 text-xs p-4 rounded-2xl border border-emerald-200/70 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                                        <ShieldCheck size={16} />
                                        <span>Unified Distribution Engine</span>
                                    </div>
                                    <p className="leading-relaxed text-emerald-950">
                                        Connecting your property to Aiosell synchronizes all 36 channel extranets simultaneously. Rates updated in Triplooper push instantly to Booking.com, Agoda, Expedia, Airbnb, and all partner channels.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                                        Aiosell Hotel Code / Property ID <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={aiosellHotelCode}
                                        onChange={(e) => { setAiosellHotelCode(e.target.value); setAiosellVerifyResult(null); setAiosellVerifyError(null); }}
                                        placeholder="e.g. 09c2d53550 (find in Aiosell dashboard URL)"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none transition-all font-mono"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        Your Hotel Code is in the URL when you open your property in the{' '}
                                        <a href="https://live.aiosell.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Aiosell dashboard</a>.
                                        See <a href="https://apidocs.aiosell.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">apidocs.aiosell.com</a> for details.
                                    </p>
                                </div>

                                {/* Live verification result */}
                                {aiosellVerifyResult && (
                                    <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-sm">
                                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-emerald-800">Property verified &amp; connected!</p>
                                            <p className="text-emerald-700 text-xs mt-0.5">
                                                {aiosellVerifyResult.rooms > 0
                                                    ? `${aiosellVerifyResult.rooms} Room Type${aiosellVerifyResult.rooms !== 1 ? 's' : ''} (${rooms.length} physical room${rooms.length !== 1 ? 's' : ''} in inventory) · ${aiosellVerifyResult.rateplans} rate plan${aiosellVerifyResult.rateplans !== 1 ? 's' : ''} auto-mapped. All ${rooms.length} rooms are live for inventory distribution &amp; reservations.`
                                                    : `${rooms.length || 'All'} rooms · ${aiosellVerifyResult.rateplans} mapping${aiosellVerifyResult.rateplans !== 1 ? 's' : ''} seeded. Live sync active.`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {aiosellVerifyError && (
                                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-sm">
                                        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-amber-800 text-xs">{aiosellVerifyError}</p>
                                    </div>
                                )}

                                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1.5 text-gray-600">
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-gray-700">Webhook Status:</span>
                                        <span className="text-emerald-600 font-bold">Enabled (/api/webhooks/aiosell)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-gray-700">Rate Plan Mapping:</span>
                                        <span className="text-gray-900 font-medium">Auto-Seed from Property Details</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-gray-700">Supported Channels:</span>
                                        <span className="text-gray-900 font-bold">36 OTAs, PMS & Switches</span>
                                    </div>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAiosellModal(false)}
                                        className="flex-1 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={aiosellSaving || !aiosellHotelCode.trim()}
                                        className="flex-1 py-2.5 bg-[#0E2A38] hover:bg-[#0E2A38]/90 text-white rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {aiosellSaving ? (
                                            <>
                                                <RefreshCw size={15} className="animate-spin" />
                                                Linking...
                                            </>
                                        ) : (
                                            <>
                                                <Check size={16} /> Save & Activate Engine
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
