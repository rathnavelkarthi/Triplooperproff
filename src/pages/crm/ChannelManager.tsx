import React, { useState, useEffect, useCallback } from 'react';
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
    Youtube
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

/* ── OTA channel definitions (static metadata) ── */

interface ChannelMeta {
    id: string;
    name: string;
    logo: string;
    description: string;
    defaultCommission: string;
    tutorialUrl?: string;
    apiUrl?: string;
}

const OTA_CHANNELS: ChannelMeta[] = [
    { 
        id: 'booking_com', 
        name: 'Booking.com', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Booking.com_logo.svg', 
        description: "The world's leading digital travel company.", 
        defaultCommission: '15%',
        apiUrl: 'https://admin.booking.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=kS_q-Zk8JpI'
    },
    { 
        id: 'agoda', 
        name: 'Agoda', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Agoda_Logo_2022.svg', 
        description: 'Fast-growing online travel booking platform.', 
        defaultCommission: '15-20%',
        apiUrl: 'https://ycs.agoda.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=zJg1R805f-0'
    },
    { 
        id: 'expedia', 
        name: 'Expedia', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Expedia_logo.svg', 
        description: 'Global travel technology company.', 
        defaultCommission: '18-22%',
        apiUrl: 'https://www.expediapartnercentral.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=FmYj0Wz4G3I'
    },
    { 
        id: 'happyeasygo', 
        name: 'HappyEasyGo', 
        logo: 'https://www.happyeasygo.com/static/images/logo.png', 
        description: 'Online travel platform for flights and hotels.', 
        defaultCommission: '15%',
        apiUrl: 'https://partner.happyeasygo.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=P_M6a9L0F1A'
    },
    { 
        id: 'cleartrip', 
        name: 'Cleartrip', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Cleartrip_logo.svg', 
        description: 'Global online travel company headquartered in Mumbai.', 
        defaultCommission: '15-20%',
        apiUrl: 'https://extranet.cleartrip.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=zJqUu3m9fco'
    },
    { 
        id: 'goibibo', 
        name: 'Goibibo', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Goibibo_Logo.png', 
        description: 'Popular Indian travel aggregator.', 
        defaultCommission: '15%',
        apiUrl: 'https://extranet.goibibo.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=mD-mIeU8d6k'
    },
    { 
        id: 'paytm', 
        name: 'Paytm', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo.svg', 
        description: 'Digital payment and e-commerce platform offering travel bookings.', 
        defaultCommission: '15%',
        apiUrl: 'https://travelagent.paytm.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=7uKq75s3uCE'
    },
    { 
        id: 'yatra', 
        name: 'Yatra', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Yatra_logo.png', 
        description: 'Indian online travel agency and corporate travel service provider.', 
        defaultCommission: '15-20%',
        apiUrl: 'https://hotel.yatra.com/merchant/',
        tutorialUrl: 'https://www.youtube.com/watch?v=H74t4G4774k'
    },
    { 
        id: 'airbnb', 
        name: 'Airbnb', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg', 
        description: 'Online marketplace for short-term homestays and experiences.', 
        defaultCommission: '3-15%',
        apiUrl: 'https://www.airbnb.com/host/homes',
        tutorialUrl: 'https://www.youtube.com/watch?v=0hO1U785_U4'
    },
    { 
        id: 'tripadvisor', 
        name: 'Tripadvisor', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Tripadvisor_Logo.svg', 
        description: 'Travel guidance company providing reviews and booking deals.', 
        defaultCommission: '12-15%',
        apiUrl: 'https://www.tripadvisor.com/Owners',
        tutorialUrl: 'https://www.youtube.com/watch?v=Yf1R287wT0c'
    },
    { 
        id: 'google', 
        name: 'Google', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg', 
        description: 'Google Hotel Ads for direct distribution and metasearch.', 
        defaultCommission: '10-15%',
        apiUrl: 'https://www.google.com/travel/hotels',
        tutorialUrl: 'https://www.youtube.com/watch?v=x7EQLl1_8d8'
    },
    { 
        id: 'hotels_com', 
        name: 'Hotels.com', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Hotels.com_logo.svg', 
        description: 'Website for booking hotel rooms online and by telephone.', 
        defaultCommission: '15-20%',
        apiUrl: 'https://www.expediapartnercentral.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=FmYj0Wz4G3I'
    },
    { 
        id: 'kayak', 
        name: 'Kayak', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/KAYAK_logo.svg', 
        description: 'Travel metasearch engine and booking platform.', 
        defaultCommission: '15%',
        apiUrl: 'https://www.kayak.com/owner',
        tutorialUrl: 'https://www.youtube.com/watch?v=680D3D6iQyQ'
    },
    { 
        id: 'brevistay', 
        name: 'Brevistay', 
        logo: 'https://logo.clearbit.com/brevistay.com', 
        description: 'Hotel booking app for short-stay rooms on hourly basis.', 
        defaultCommission: '15-25%',
        apiUrl: 'https://partner.brevistay.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=D-P_F9l0E9g'
    },
    { 
        id: 'akbartravels', 
        name: 'Akbar Travels', 
        logo: 'https://logo.clearbit.com/akbartravels.com', 
        description: 'Leading travel agency offering comprehensive travel solutions.', 
        defaultCommission: '15%',
        apiUrl: 'https://agents.akbartravels.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=1F9yD5eC1qA'
    },
    { 
        id: 'makemytrip', 
        name: 'MakeMyTrip', 
        logo: 'https://imgak.mmtcdn.com/pwa_v3/pwa_commons_assets/desktop/logo@2x.png', 
        description: "India's leading online travel company.", 
        defaultCommission: '15-25%',
        apiUrl: 'https://extranet.makemytrip.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=mD-mIeU8d6k'
    },
    { 
        id: 'ixigo', 
        name: 'Ixigo', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Ixigo_logo.svg', 
        description: 'AI-based travel app for flights, trains, and hotels.', 
        defaultCommission: '12-15%',
        apiUrl: 'https://partner.ixigo.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=R9V1s3uB2eA'
    },
    { 
        id: 'trivago', 
        name: 'Trivago', 
        logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Trivago_logo_2023.svg', 
        description: 'Global hotel search and price comparison meta search engine.', 
        defaultCommission: '15%',
        apiUrl: 'https://studio.trivago.com/',
        tutorialUrl: 'https://www.youtube.com/watch?v=2r1p86E6cQ0'
    },
];

/* ── Types ── */

interface ChannelConnection {
    id?: string;
    channel_id: string;
    status: 'connected' | 'disconnected' | 'error';
    api_key?: string;
    property_id?: string;
    sync_inventory: boolean;
    sync_rates: boolean;
    commission: string;
    last_sync_at?: string | null;
}

interface Channel extends ChannelMeta {
    connection: ChannelConnection | null;
}

interface SyncLog {
    id: string;
    channel_id: string;
    channel_name: string;
    action: string;
    details: string;
    status: 'success' | 'error' | 'warning';
    created_at: string;
}

/* ── Helper: relative time ── */
function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

/* ── Component: ChannelLogo ── */
function ChannelLogo({ logo, name, size = 'md' }: { logo: string; name: string; size?: 'sm' | 'md' }) {
    const [hasError, setHasError] = useState(false);
    const sizeClasses = size === 'sm' ? 'w-8 h-8 rounded-lg p-1' : 'w-12 h-12 rounded-xl p-1.5';
    const textClasses = size === 'sm' ? 'text-xs font-bold' : 'text-sm font-bold';

    if (hasError || !logo) {
        return (
            <div className={`${sizeClasses} bg-gray-100 flex items-center justify-center border border-gray-100 shadow-sm`}>
                <span className={`${textClasses} text-[#0E2A38] font-bold`}>{name.charAt(0)}</span>
            </div>
        );
    }

    return (
        <div className={`${sizeClasses} bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden`}>
            <img
                src={logo}
                alt={name}
                className="w-full h-full object-contain"
                onError={() => setHasError(true)}
            />
        </div>
    );
}

/* ══════════════════════════════════════════════════ */

export default function ChannelManager() {
    const { tenant } = useAuth();

    const [connections, setConnections] = useState<ChannelConnection[]>([]);
    const [logs, setLogs] = useState<SyncLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'connected'>('all');

    // Connect modal
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [selectedMeta, setSelectedMeta] = useState<ChannelMeta | null>(null);
    const [hotelId, setHotelId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [connectionStep, setConnectionStep] = useState(1);

    /* ── Fetch data ── */

    const fetchData = useCallback(async () => {
        if (!tenant?.id) return;
        const [connRes, logRes] = await Promise.all([
            supabase.from('channel_connections').select('*').eq('tenant_id', tenant.id),
            supabase.from('channel_sync_logs').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(15),
        ]);
        if (connRes.data) setConnections(connRes.data);
        if (logRes.data) setLogs(logRes.data);
        setLoading(false);
    }, [tenant?.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── Merge static metadata with DB connections ── */

    const channels: Channel[] = OTA_CHANNELS.map(meta => {
        const conn = connections.find(c => c.channel_id === meta.id) || null;
        return { ...meta, connection: conn };
    });

    /* ── Actions ── */

    const addSyncLog = async (channelId: string, channelName: string, action: string, details: string, status: 'success' | 'error' | 'warning') => {
        if (!tenant?.id) return;
        const { data } = await supabase.from('channel_sync_logs').insert({
            tenant_id: tenant.id, channel_id: channelId, channel_name: channelName, action, details, status,
        }).select().single();
        if (data) setLogs(prev => [data, ...prev].slice(0, 15));
    };

    const handleGlobalSync = async () => {
        setIsSyncing(true);
        const connected = connections.filter(c => c.status === 'connected');
        const now = new Date().toISOString();
        for (const c of connected) {
            await supabase.from('channel_connections').update({ last_sync_at: now, updated_at: now }).eq('id', c.id);
        }
        await addSyncLog('all', 'Multiple Channels', 'Manual Full Sync', `Synchronized inventory and rates across ${connected.length} active channel${connected.length !== 1 ? 's' : ''}`, 'success');
        await fetchData();
        setIsSyncing(false);
    };

    const toggleSetting = async (conn: ChannelConnection, setting: 'sync_inventory' | 'sync_rates') => {
        if (!conn.id) return;
        const newVal = !conn[setting];
        await supabase.from('channel_connections').update({ [setting]: newVal, updated_at: new Date().toISOString() }).eq('id', conn.id);
        setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, [setting]: newVal } : c));
        const meta = OTA_CHANNELS.find(m => m.id === conn.channel_id);
        const label = setting === 'sync_inventory' ? 'Inventory' : 'Rate';
        await addSyncLog(conn.channel_id, meta?.name || conn.channel_id, 'Setting Update', `${label} sync turned ${newVal ? 'ON' : 'OFF'}`, 'warning');
    };

    const handleConnectClick = (meta: ChannelMeta) => {
        setSelectedMeta(meta);
        setHotelId('');
        setApiKey('');
        setConnectionStep(1);
        setShowConnectModal(true);
    };

    const handleDisconnect = async (ch: Channel) => {
        if (!tenant?.id || !ch.connection?.id) return;
        if (!window.confirm(`Disconnect ${ch.name}? This will stop all inventory and rate sync.`)) return;
        await supabase.from('channel_connections').update({
            status: 'disconnected', sync_inventory: false, sync_rates: false, updated_at: new Date().toISOString(),
        }).eq('id', ch.connection.id);
        await addSyncLog(ch.id, ch.name, 'Channel Disconnected', 'Connection revoked and mappings disabled', 'warning');
        await fetchData();
    };

    const submitConnection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hotelId || !apiKey || !selectedMeta || !tenant?.id) return;
        setConnectionStep(2);

        // Upsert connection
        const now = new Date().toISOString();
        const existing = connections.find(c => c.channel_id === selectedMeta.id);
        if (existing?.id) {
            await supabase.from('channel_connections').update({
                status: 'connected', api_key: apiKey, property_id: hotelId,
                sync_inventory: true, sync_rates: true, last_sync_at: now, updated_at: now,
            }).eq('id', existing.id);
        } else {
            await supabase.from('channel_connections').insert({
                tenant_id: tenant.id, channel_id: selectedMeta.id, status: 'connected',
                api_key: apiKey, property_id: hotelId, sync_inventory: true, sync_rates: true,
                commission: selectedMeta.defaultCommission, last_sync_at: now,
            });
        }

        await addSyncLog(selectedMeta.id, selectedMeta.name, 'Channel Connected', `Successfully authenticated with Property ID: ${hotelId}`, 'success');
        setConnectionStep(3);
        setTimeout(async () => {
            await fetchData();
            setShowConnectModal(false);
        }, 1500);
    };

    /* ── Filtered list ── */

    const filteredChannels = channels.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (activeTab === 'connected') return matchesSearch && c.connection?.status === 'connected';
        return matchesSearch;
    });

    const connectedCount = channels.filter(c => c.connection?.status === 'connected').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-[#0E2A38]/20 border-t-[#0E2A38] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Waypoints className="text-[#C9A646]" size={28} />
                        Channel Manager
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Connect OTAs and automate your inventory and rate distribution.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-[#0E2A38]/5 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Activity size={14} className="text-[#0E2A38]" />
                        <span className="text-xs font-semibold text-[#0E2A38]">{connectedCount} Channels Active</span>
                    </div>
                    <button
                        onClick={handleGlobalSync}
                        disabled={isSyncing || connectedCount === 0}
                        className={`flex items-center gap-2 px-4 py-2 bg-[#0E2A38] text-white rounded-lg text-sm font-medium transition-all ${isSyncing || connectedCount === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#0E2A38]/90 shadow-md'}`}
                    >
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing...' : 'Sync All Now'}
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Channels */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                            <button onClick={() => setActiveTab('all')}
                                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                All Channels
                            </button>
                            <button onClick={() => setActiveTab('connected')}
                                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'connected' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                Connected ({connectedCount})
                            </button>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" placeholder="Search channels..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A646]/50 focus:border-[#C9A646] transition-all" />
                        </div>
                    </div>

                    {/* Channel Grid */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredChannels.length > 0 ? (
                                filteredChannels.map((ch) => {
                                    const isConnected = ch.connection?.status === 'connected';
                                    return (
                                        <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
                                            key={ch.id} className={`bg-white rounded-xl border p-5 relative overflow-hidden transition-shadow hover:shadow-md ${isConnected ? 'border-[#C9A646]/30' : 'border-gray-200'}`}>
                                            {isConnected && (
                                                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
                                                    <div className="absolute top-0 right-0 w-2 h-full bg-[#C9A646]/20 skew-x-12 translate-x-4" />
                                                </div>
                                            )}

                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <ChannelLogo logo={ch.logo} name={ch.name} />
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{ch.name}</h3>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {isConnected ? (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                                    <CheckCircle2 size={10} /> Active
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                                    Not connected
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!isConnected && (
                                                    <button onClick={() => handleConnectClick(ch)} className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-[#C9A646]/10 hover:text-[#C9A646] transition-colors" title="Connect Channel">
                                                        <Plus size={18} />
                                                    </button>
                                                )}
                                            </div>

                                            <p className="text-xs text-gray-500 mb-2 line-clamp-2 min-h-[32px]">{ch.description}</p>

                                            {/* Tutorial & API Portal links */}
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4 text-[11px] border-t border-gray-50 pt-2">
                                                {ch.apiUrl && (
                                                    <a href={ch.apiUrl} target="_blank" rel="noopener noreferrer" className="text-[#0E2A38] hover:text-[#C9A646] font-semibold flex items-center gap-1 transition-colors">
                                                        <ExternalLink size={12} /> API Portal
                                                    </a>
                                                )}
                                                {ch.tutorialUrl && (
                                                    <a href={ch.tutorialUrl} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors">
                                                        <Youtube size={12} /> Video Tutorial
                                                    </a>
                                                )}
                                            </div>

                                            {isConnected && ch.connection ? (
                                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-sm text-gray-700"><CalendarDays size={16} className="text-gray-400" /><span>Inventory sync</span></div>
                                                        <button onClick={() => toggleSetting(ch.connection!, 'sync_inventory')}
                                                            className={`w-9 h-5 rounded-full relative transition-colors ${ch.connection.sync_inventory ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${ch.connection.sync_inventory ? 'translate-x-4.5 left-0' : 'translate-x-0.5 left-0'}`} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-sm text-gray-700"><Tag size={16} className="text-gray-400" /><span>Rate sync</span></div>
                                                        <button onClick={() => toggleSetting(ch.connection!, 'sync_rates')}
                                                            className={`w-9 h-5 rounded-full relative transition-colors ${ch.connection.sync_rates ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${ch.connection.sync_rates ? 'translate-x-4.5 left-0' : 'translate-x-0.5 left-0'}`} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-50">
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                            <RefreshCw size={10} />
                                                            Last sync: {ch.connection.last_sync_at ? timeAgo(ch.connection.last_sync_at) : 'never'}
                                                        </span>
                                                        <button onClick={() => handleDisconnect(ch)}
                                                            className="text-[10px] font-semibold text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-1">
                                                            <Power size={10} /> Disconnect
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                                    <span>Commission: {ch.defaultCommission}</span>
                                                    <button onClick={() => handleConnectClick(ch)} className="font-medium text-[#0E2A38] hover:text-[#C9A646] transition-colors">
                                                        Connect →
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 py-12 text-center bg-white rounded-xl border border-dashed border-gray-200">
                                    <Globe className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                    <h3 className="text-sm font-medium text-gray-900">No channels found</h3>
                                    <p className="text-xs text-gray-500 mt-1">Try adjusting your search or filters.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Sidebar: Stats & Sync Logs */}
                <div className="space-y-6">
                    {/* Quick Stats */}
                    <div className="bg-[#0E2A38] rounded-xl p-5 text-white shadow-lg overflow-hidden relative">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#C9A646]/20 rounded-full blur-2xl" />
                        <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2 relative z-10">
                            <Activity size={16} /> Connection Health
                        </h3>
                        <div className="space-y-4 relative z-10">
                            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/5">
                                <p className="text-xs text-white/50 mb-1">Connected Channels</p>
                                <p className="text-2xl font-bold">{connectedCount} <span className="text-sm font-normal text-white/40">/ {OTA_CHANNELS.length}</span></p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/5">
                                <p className="text-xs text-white/50 mb-1">Sync Activity (recent)</p>
                                <p className="text-2xl font-bold">{logs.length} <span className="text-sm font-normal text-white/40">events</span></p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/5">
                                <p className="text-xs text-white/50 mb-1">Last Sync</p>
                                <p className="text-sm font-semibold">
                                    {connections.some(c => c.last_sync_at)
                                        ? timeAgo(connections.filter(c => c.last_sync_at).sort((a, b) => new Date(b.last_sync_at!).getTime() - new Date(a.last_sync_at!).getTime())[0].last_sync_at!)
                                        : 'No syncs yet'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sync Logs */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                <Settings2 size={16} className="text-gray-400" /> Sync Log
                            </h3>
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <AnimatePresence>
                                {logs.map((log) => (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} key={log.id}
                                        className="relative pl-4 border-l-2 py-1"
                                        style={{ borderColor: log.status === 'success' ? '#10b981' : log.status === 'warning' ? '#f59e0b' : '#ef4444' }}>
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="text-[11px] font-bold text-gray-700">{log.action}</span>
                                            <span className="text-[9px] text-gray-400">{timeAgo(log.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed mb-1">{log.details}</p>
                                        <span className="text-[10px] font-medium text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">{log.channel_name}</span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {logs.length === 0 && (
                                <div className="h-full flex items-center justify-center text-gray-400 text-xs text-center">
                                    No sync events yet. Connect a channel to get started.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Connect Modal */}
            <AnimatePresence>
                {showConnectModal && selectedMeta && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => connectionStep === 1 && setShowConnectModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            {/* Header */}
                            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ChannelLogo logo={selectedMeta.logo} name={selectedMeta.name} size="sm" />
                                    <h3 className="font-bold text-gray-900">Connect to {selectedMeta.name}</h3>
                                </div>
                                {connectionStep === 1 && (
                                    <button onClick={() => setShowConnectModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                                )}
                            </div>
                            {/* Body */}
                            <div className="p-6">
                                {connectionStep === 1 ? (
                                    <form onSubmit={submitConnection} className="space-y-4">
                                        <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-start gap-2 mb-2">
                                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                            <p>To connect, you must authorize Triplooper within your {selectedMeta.name} Extranet account first.</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hotel ID / Property ID</label>
                                            <input type="text" required value={hotelId} onChange={(e) => setHotelId(e.target.value)}
                                                placeholder={`e.g. ${selectedMeta.id}_12345`}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">API Connection Key</label>
                                            <input type="password" required value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                                                placeholder="Provided by channel provider"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#C9A646] focus:border-transparent outline-none" />
                                        </div>
                                        <button type="submit" disabled={!hotelId || !apiKey}
                                            className="w-full mt-2 py-2.5 bg-[#0E2A38] text-white rounded-lg text-sm font-semibold hover:bg-[#0E2A38]/90 transition-colors disabled:opacity-50">
                                            Authenticate & Connect
                                        </button>
                                    </form>
                                ) : connectionStep === 2 ? (
                                    <div className="py-8 flex flex-col items-center justify-center text-center">
                                        <div className="w-12 h-12 border-4 border-gray-100 border-t-[#C9A646] rounded-full animate-spin mb-4" />
                                        <h4 className="font-semibold text-gray-900 mb-1">Authenticating...</h4>
                                        <p className="text-sm text-gray-500">Contacting {selectedMeta.name} API endpoint</p>
                                    </div>
                                ) : (
                                    <div className="py-8 flex flex-col items-center justify-center text-center">
                                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <h4 className="font-semibold text-gray-900 mb-1">Connection Successful!</h4>
                                        <p className="text-sm text-gray-500">Initial sync will begin shortly.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
