import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, CheckCircle, XCircle, Loader2, ExternalLink, Zap, Wifi, WifiOff, QrCode, Smartphone, RefreshCw, Unplug, Clock, Send, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

interface WhatsAppConfig {
    whatsapp_enabled: boolean;
    evolution_api_url: string;
    evolution_instance_name: string;
    evolution_api_key: string;
    google_review_url: string;
    whatsapp_templates: {
        confirmation: string;
        reminder: string;
        review: string;
    };
}

// Evolution API credentials are held server-side in the whatsapp-connect / send-whatsapp
// edge functions (EVOLUTION_API_URL / EVOLUTION_API_KEY env). The frontend never holds them.

type ConnectionState = 'idle' | 'creating' | 'scanning' | 'connected' | 'error';

interface MessageStat {
    total: number;
    sent: number;
    pending: number;
    failed: number;
}

interface MessageLog {
    id: number;
    phone: string;
    message_type: string;
    sent: boolean;
    error: string | null;
    created_at: string;
}

const DEFAULT_TEMPLATES = {
    confirmation: `✅ *Booking Confirmed!*\n\nDear {guest_name}, your stay is confirmed.\n\n🏠 Room: {room_type}\n📅 Check-in: {check_in} (after 12:00 PM)\n📅 Check-out: {check_out} (before 11:00 AM)\n🔖 Booking ID: {booking_id}\n\n🔗 Guest Portal (Upload Aadhaar & View Stay):\n{guest_portal_url}\n\nFor assistance: {hotel_phone}`,
    reminder: `👋 See you tomorrow, {guest_name}!\n\nReminder: your check-in at {hotel_name} is tomorrow.\n⏰ After 12:00 PM\n📍 {hotel_address}\n\nQuestions? Reply here or call {hotel_phone}.`,
    review: `Thank you for staying with us, {guest_name}! 🙏\n\nWe hope you had a wonderful stay at {hotel_name}.\n\nA Google review would mean a lot to us:\n⭐ {google_review_url}\n\nWe hope to welcome you back soon!`,
};

const TEMPLATE_VARS = [
    '{guest_name}', '{hotel_name}', '{room_type}',
    '{check_in}', '{check_out}', '{booking_id}',
    '{hotel_phone}', '{hotel_address}', '{google_review_url}',
    '{guest_portal_url}',
];

export default function WhatsAppSettings() {
    const { tenant } = useAuth();
    const [config, setConfig] = useState<WhatsAppConfig>({
        whatsapp_enabled: false,
        evolution_api_url: '',
        evolution_instance_name: '',
        evolution_api_key: '',
        google_review_url: '',
        whatsapp_templates: DEFAULT_TEMPLATES,
    });
    const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
    const [qrCodeBase64, setQrCodeBase64] = useState('');
    const [connectedPhone, setConnectedPhone] = useState('');
    const [connectedName, setConnectedName] = useState('');
    const [connectionError, setConnectionError] = useState('');
    const [activeTemplate, setActiveTemplate] = useState<'confirmation' | 'reminder' | 'review'>('confirmation');
    const [isSaving, setSaving] = useState(false);
    const [isTesting, setTesting] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [saveState, setSaveState] = useState<'idle' | 'success' | 'error'>('idle');
    const [testState, setTestState] = useState<'idle' | 'success' | 'error'>('idle');
    const [testError, setTestError] = useState('');
    const [loading, setLoading] = useState(true);
    const [isDisconnecting, setDisconnecting] = useState(false);

    // Dashboard Stats State
    const [stats, setStats] = useState<MessageStat>({ total: 0, sent: 0, pending: 0, failed: 0 });
    const [recentMessages, setRecentMessages] = useState<MessageLog[]>([]);
    const [statsLoading, setStatsLoading] = useState(false);

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    useEffect(() => {
        if (!tenant?.id) return;
        loadConfig();
    }, [tenant?.id]);

    const loadConfig = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('tenants')
            .select('whatsapp_enabled, evolution_api_url, evolution_instance_name, evolution_api_key, google_review_url, whatsapp_templates')
            .eq('id', tenant!.id)
            .single();

        if (data) {
            setConfig({
                whatsapp_enabled: data.whatsapp_enabled ?? false,
                evolution_api_url: data.evolution_api_url ?? '',
                evolution_instance_name: data.evolution_instance_name ?? '',
                evolution_api_key: data.evolution_api_key ?? '',
                google_review_url: data.google_review_url ?? '',
                whatsapp_templates: data.whatsapp_templates ?? DEFAULT_TEMPLATES,
            });

            // If already configured, check connection status
            if (data.evolution_instance_name && data.whatsapp_enabled) {
                checkStatus();
            }
        }
        setLoading(false);
    };

    const callConnect = async (action: string) => {
        const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
            body: { tenant_id: tenant!.id, action },
        });
        if (error) throw error;
        return data;
    };

    const checkStatus = useCallback(async () => {
        if (!tenant?.id) return;
        try {
            const data = await callConnect('status');
            if (!mountedRef.current) return;

            if (data.status === 'open') {
                setConnectionState('connected');
                setConnectedPhone(data.phone || '');
                setConnectedName(data.profileName || '');
                setConfig(prev => ({ ...prev, whatsapp_enabled: true }));
                stopPolling();
            }
        } catch {
            // Silently handle - will retry on next poll
        }
    }, [tenant?.id]);

    const fetchDashboardStats = useCallback(async () => {
        if (!tenant?.id) return;
        setStatsLoading(true);
        try {
            // Get stats
            const { data: allMessages, error: statsError } = await supabase
                .from('whatsapp_scheduled_messages')
                .select('sent, error')
                .eq('tenant_id', tenant.id);

            if (!statsError && allMessages) {
                const total = allMessages.length;
                const sent = allMessages.filter(m => m.sent).length;
                const failed = allMessages.filter(m => m.error).length;
                const pending = total - sent - failed; // simplistic pending calc
                setStats({ total, sent, pending, failed });
            }

            // Get recent logs
            const { data: logsData, error: logsError } = await supabase
                .from('whatsapp_scheduled_messages')
                .select('id, phone, message_type, sent, error, created_at')
                .eq('tenant_id', tenant.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (!logsError && logsData) {
                setRecentMessages(logsData as MessageLog[]);
            }
        } catch (err) {
            console.error("Error fetching whatsapp stats", err);
        } finally {
            if (mountedRef.current) setStatsLoading(false);
        }
    }, [tenant?.id]);

    useEffect(() => {
        if (connectionState === 'connected') {
            fetchDashboardStats();
        }
    }, [connectionState, fetchDashboardStats]);

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const handleConnect = async () => {
        if (!tenant?.id) return;
        setConnectionState('creating');
        setConnectionError('');

        try {
            // Step 1: Create instance
            const createData = await callConnect('create');

            if (createData.status === 'open') {
                // Already connected
                setConnectionState('connected');
                await checkStatus();
                return;
            }

            // Step 2: Fetch QR code
            setConnectionState('scanning');
            await fetchQrCode();

            // Step 3: Start polling for connection status
            pollingRef.current = setInterval(async () => {
                if (!mountedRef.current) { stopPolling(); return; }

                try {
                    const statusData = await callConnect('status');
                    if (!mountedRef.current) return;

                    if (statusData.status === 'open') {
                        setConnectionState('connected');
                        setConnectedPhone(statusData.phone || '');
                        setConnectedName(statusData.profileName || '');
                        setConfig(prev => ({ ...prev, whatsapp_enabled: true }));
                        stopPolling();
                    }
                } catch {
                    // Keep polling
                }
            }, 5000);
        } catch (err) {
            setConnectionState('error');
            setConnectionError(String(err));
        }
    };

    const fetchQrCode = async () => {
        try {
            const qrData = await callConnect('qrcode');
            if (!mountedRef.current) return;

            if (qrData.base64) {
                setQrCodeBase64(qrData.base64);
            } else if (qrData.code) {
                // Some Evolution versions return the raw QR string, not base64 image
                setQrCodeBase64('');
            }
        } catch {
            // Will retry
        }
    };

    const handleRefreshQr = async () => {
        await fetchQrCode();
    };

    const handleDisconnect = async () => {
        if (!tenant?.id) return;
        setDisconnecting(true);
        try {
            await callConnect('disconnect');
            setConnectionState('idle');
            setConnectedPhone('');
            setConnectedName('');
            setQrCodeBase64('');
            setConfig(prev => ({ ...prev, whatsapp_enabled: false, evolution_api_url: '', evolution_instance_name: '', evolution_api_key: '' }));
            stopPolling();
        } catch (err) {
            console.error('Disconnect failed:', err);
        } finally {
            setDisconnecting(false);
        }
    };

    const handleSave = async () => {
        if (!tenant?.id) return;
        setSaving(true);
        setSaveState('idle');

        const { error } = await supabase
            .from('tenants')
            .update({
                google_review_url: config.google_review_url,
                whatsapp_templates: config.whatsapp_templates,
            })
            .eq('id', tenant.id);

        setSaving(false);
        setSaveState(error ? 'error' : 'success');
        setTimeout(() => setSaveState('idle'), 3000);
    };

    const handleTest = async () => {
        if (!testPhone || !tenant?.id) return;
        setTesting(true);
        setTestState('idle');
        setTestError('');

        try {
            const { data } = await supabase.functions.invoke('send-whatsapp', {
                body: {
                    tenant_id: tenant.id,
                    phone: testPhone,
                    message: `🧪 Test message from your hotel automation system!\n\nIf you received this, WhatsApp is connected and working. 🎉`,
                },
            });

            if (data?.success) {
                setTestState('success');
            } else {
                setTestState('error');
                setTestError(data?.error || data?.reason || 'Unknown error');
            }
        } catch (err) {
            setTestState('error');
            setTestError(String(err));
        } finally {
            setTesting(false);
            setTimeout(() => setTestState('idle'), 5000);
        }
    };

    const updateTemplate = (key: keyof typeof DEFAULT_TEMPLATES, value: string) => {
        setConfig(prev => ({
            ...prev,
            whatsapp_templates: { ...prev.whatsapp_templates, [key]: value },
        }));
    };

    const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all text-sm";

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-gray-300" size={32} />
            </div>
        );
    }

    const templateLabels = {
        confirmation: '📩 Booking Confirmation',
        reminder: '🔔 Check-in Reminder',
        review: '⭐ Google Review Request',
    };

    return (
        <div className="space-y-8">
            {/* Connection Status Card */}
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-green-100 rounded-xl">
                                <MessageCircle size={20} className="text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">WhatsApp Connection</h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Connect your WhatsApp to send automated messages.
                                </p>
                            </div>
                        </div>
                        {connectionState === 'connected' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                <Wifi size={13} /> Connected
                            </span>
                        )}
                        {connectionState === 'idle' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">
                                <WifiOff size={13} /> Disconnected
                            </span>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="p-5">
                    {/* IDLE: Show connect button */}
                    {connectionState === 'idle' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <QrCode size={32} className="text-green-500" />
                            </div>
                            <h4 className="text-lg font-semibold text-gray-800 mb-2">Connect your WhatsApp</h4>
                            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                                Click below to generate a QR code. Scan it with your WhatsApp app
                                to link this number for automated booking messages.
                            </p>
                            <button
                                onClick={handleConnect}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all shadow-sm shadow-green-200 hover:shadow-md"
                            >
                                <Smartphone size={18} />
                                Connect WhatsApp
                            </button>
                        </div>
                    )}

                    {/* CREATING: Loading spinner */}
                    {connectionState === 'creating' && (
                        <div className="text-center py-12">
                            <Loader2 size={40} className="animate-spin text-green-500 mx-auto mb-4" />
                            <p className="text-sm text-gray-600 font-medium">Setting up your WhatsApp instance...</p>
                        </div>
                    )}

                    {/* SCANNING: Show QR code */}
                    {connectionState === 'scanning' && (
                        <div className="text-center py-4">
                            <div className="inline-block p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm mb-4">
                                {qrCodeBase64 ? (
                                    <img
                                        src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                                        alt="WhatsApp QR Code"
                                        className="w-64 h-64 object-contain"
                                    />
                                ) : (
                                    <div className="w-64 h-64 flex items-center justify-center">
                                        <Loader2 size={32} className="animate-spin text-gray-300" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-semibold text-gray-800">Scan with WhatsApp</h4>
                                <ol className="text-sm text-gray-500 space-y-1 max-w-sm mx-auto text-left list-decimal list-inside">
                                    <li>Open WhatsApp on your phone</li>
                                    <li>Go to <strong>Settings → Linked Devices</strong></li>
                                    <li>Tap <strong>"Link a Device"</strong></li>
                                    <li>Point your phone camera at this QR code</li>
                                </ol>
                                <button
                                    onClick={handleRefreshQr}
                                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
                                >
                                    <RefreshCw size={14} /> Refresh QR Code
                                </button>
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 py-2 px-4 rounded-lg">
                                <Loader2 size={12} className="animate-spin" />
                                Waiting for scan...
                            </div>
                        </div>
                    )}

                    {/* CONNECTED: Show status */}
                    {connectionState === 'connected' && (
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle size={20} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-green-800 text-sm">
                                        {connectedName || 'WhatsApp Connected'}
                                    </p>
                                    <p className="text-xs text-green-600">
                                        {connectedPhone ? `+${connectedPhone}` : 'Ready to send messages'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDisconnect}
                                disabled={isDisconnecting}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                                {isDisconnecting ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                            </button>
                        </div>
                    )}

                    {/* ERROR state */}
                    {connectionState === 'error' && (
                        <div className="text-center py-8">
                            <XCircle size={40} className="text-red-400 mx-auto mb-3" />
                            <p className="text-sm text-red-600 font-medium mb-1">Connection failed</p>
                            <p className="text-xs text-red-400 mb-4">{connectionError}</p>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={handleConnect}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl transition-all text-sm shadow-sm"
                                >
                                    <RefreshCw size={15} /> Try Again
                                </button>
                                <button
                                    onClick={handleDisconnect}
                                    disabled={isDisconnecting}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl transition-all text-sm shadow-sm disabled:opacity-50"
                                >
                                    {isDisconnecting ? <Loader2 size={15} className="animate-spin" /> : <Unplug size={15} />}
                                    Reset Instance
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Only show the rest when connected */}
            {connectionState === 'connected' && (
                <>
                    {/* Automation Flow */}
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Zap size={13} /> Automation Flow
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            {[
                                { label: 'Booking Confirmed', color: 'bg-white border border-green-200 text-green-800' },
                                { label: '→', color: 'text-green-400 font-bold' },
                                { label: '✅ Confirmation (instant)', color: 'bg-green-100 text-green-800' },
                                { label: '+', color: 'text-green-400 font-bold' },
                                { label: '🔔 Reminder (day before)', color: 'bg-green-100 text-green-800' },
                                { label: '+', color: 'text-green-400 font-bold' },
                                { label: '⭐ Review (2h after checkout)', color: 'bg-green-100 text-green-800' },
                            ].map((item, i) => (
                                <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${item.color}`}>{item.label}</span>
                            ))}
                        </div>
                    </div>

                    {/* Dashboard Metrics */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Message Dashboard</h4>
                            <button
                                onClick={fetchDashboardStats}
                                className="text-gray-400 hover:text-green-600 transition-colors"
                                title="Refresh stats"
                            >
                                <RefreshCw size={16} className={statsLoading ? "animate-spin" : ""} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col">
                                <span className="text-xs text-gray-500 font-medium mb-1">Total Msgs</span>
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="text-gray-400" size={20} />
                                    <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
                                </div>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col">
                                <span className="text-xs text-emerald-600 font-medium mb-1">Sent</span>
                                <div className="flex items-center gap-2">
                                    <Send className="text-emerald-500" size={20} />
                                    <span className="text-2xl font-bold text-emerald-900">{stats.sent}</span>
                                </div>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col">
                                <span className="text-xs text-amber-600 font-medium mb-1">Pending</span>
                                <div className="flex items-center gap-2">
                                    <Clock className="text-amber-500" size={20} />
                                    <span className="text-2xl font-bold text-amber-900">{stats.pending}</span>
                                </div>
                            </div>
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex flex-col">
                                <span className="text-xs text-rose-600 font-medium mb-1">Failed</span>
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="text-rose-500" size={20} />
                                    <span className="text-2xl font-bold text-rose-900">{stats.failed}</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Messages Log */}
                        {recentMessages.length > 0 && (
                            <div className="mt-4 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                                    <h5 className="text-xs font-semibold text-gray-600">Recent Activity</h5>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {recentMessages.map((msg) => (
                                        <div key={msg.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${msg.message_type === 'confirmation' ? 'bg-blue-100 text-blue-700' :
                                                        msg.message_type === 'reminder' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-purple-100 text-purple-700'
                                                        }`}>
                                                        {msg.message_type}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-900">{msg.phone}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <Calendar size={12} />
                                                    {new Date(msg.created_at).toLocaleString(undefined, {
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end">
                                                {msg.sent ? (
                                                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                        <CheckCircle size={12} /> Delivered
                                                    </span>
                                                ) : msg.error ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded mb-1">
                                                            <XCircle size={12} /> Failed
                                                        </span>
                                                        <span className="text-[10px] text-rose-400 max-w-[150px] truncate" title={msg.error}>
                                                            {msg.error}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                                        <Clock size={12} /> Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Google Review URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Google Review URL</label>
                        <div className="relative">
                            <input
                                type="url"
                                placeholder="https://g.page/r/your-business/review"
                                value={config.google_review_url}
                                onChange={e => setConfig(p => ({ ...p, google_review_url: e.target.value }))}
                                className={`${inputClass} pr-10`}
                            />
                            {config.google_review_url && (
                                <a href={config.google_review_url} target="_blank" rel="noopener noreferrer"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500">
                                    <ExternalLink size={16} />
                                </a>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Sent in the post-checkout review request message</p>
                    </div>

                    {/* Test Connection */}
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Send a test message</h4>
                        <div className="flex gap-3">
                            <input
                                type="tel"
                                placeholder="Phone number (e.g. 919876543210)"
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                                className={`${inputClass} flex-1`}
                            />
                            <button
                                onClick={handleTest}
                                disabled={isTesting || !testPhone}
                                className="flex items-center gap-2 px-5 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-all text-sm whitespace-nowrap"
                            >
                                {isTesting ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                                {isTesting ? 'Sending...' : 'Send Test'}
                            </button>
                        </div>
                        {testState === 'success' && (
                            <p className="flex items-center gap-2 text-sm text-green-600 mt-2 font-medium">
                                <CheckCircle size={16} /> Message sent! Check your WhatsApp.
                            </p>
                        )}
                        {testState === 'error' && (
                            <p className="flex items-center gap-2 text-sm text-red-600 mt-2">
                                <XCircle size={16} /> Failed: {testError}
                            </p>
                        )}
                    </div>

                    {/* Message Templates */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Message Templates</h4>
                        <p className="text-xs text-gray-400">
                            Available variables: {TEMPLATE_VARS.join(', ')}
                        </p>

                        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                            {(Object.keys(templateLabels) as Array<keyof typeof templateLabels>).map(key => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTemplate(key as typeof activeTemplate)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${activeTemplate === key
                                        ? 'bg-white shadow text-gray-900'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {templateLabels[key]}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <textarea
                                rows={8}
                                value={config.whatsapp_templates[activeTemplate]}
                                onChange={e => updateTemplate(activeTemplate, e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all text-sm font-mono resize-none leading-relaxed"
                            />
                            <button
                                onClick={() => updateTemplate(activeTemplate, DEFAULT_TEMPLATES[activeTemplate])}
                                className="absolute bottom-3 right-3 text-xs text-gray-400 hover:text-gray-600 underline"
                            >
                                Reset to default
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-800)] disabled:bg-gray-200 text-white font-semibold rounded-xl transition-all shadow-sm"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>

                    {saveState === 'success' && (
                        <p className="flex items-center gap-2 text-sm text-green-600 font-medium">
                            <CheckCircle size={16} /> Settings saved!
                        </p>
                    )}
                    {saveState === 'error' && (
                        <p className="flex items-center gap-2 text-sm text-red-600">
                            <XCircle size={16} /> Failed to save. Please try again.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
