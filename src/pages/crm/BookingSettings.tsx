import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import {
    Save,
    MessageSquare,
    Mail,
    CreditCard,
    Bell,
    CheckCircle2,
    AlertCircle,
    Globe,
    Smartphone
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function BookingSettings() {
    const { tenant } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        advance_payment_percentage: '25',
        whatsapp_enabled: 'false',
        whatsapp_phone: '',
        email_confirmation_enabled: 'true',
        booking_prefix: 'BK',
        instant_confirmation: 'true'
    });

    useEffect(() => {
        if (tenant) {
            fetchSettings();
        }
    }, [tenant]);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .eq('tenant_id', tenant.id);

            if (error) throw error;

            if (data) {
                const newSettings = { ...settings };
                data.forEach((s: any) => {
                    if (s.setting_key in newSettings) {
                        (newSettings as any)[s.setting_key] = s.setting_value;
                    }
                });
                setSettings(newSettings);
            }
        } catch (error: any) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const upsertData = Object.entries(settings).map(([key, value]) => ({
                tenant_id: tenant.id,
                setting_key: key,
                setting_value: value,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('settings')
                .upsert(upsertData, { onConflict: 'tenant_id,setting_key' });

            if (error) throw error;
            toast.success('Settings saved successfully');
        } catch (error: any) {
            toast.error('Failed to save settings: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2A38]"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-8 pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#0E2A38]">Booking Engine Settings</h1>
                    <p className="text-gray-500 text-sm mt-1">Configure how your website's booking engine behaves.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#0E2A38] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#1a3d4f] transition-all flex items-center gap-2 shadow-lg shadow-[#0E2A38]/10 disabled:opacity-50"
                >
                    {saving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payments Section */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <CreditCard size={20} />
                        </div>
                        <h2 className="font-bold text-[#0E2A38]">Payment & Confirmation</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Advance Payment Percentage (%)</label>
                            <input
                                type="number"
                                value={settings.advance_payment_percentage}
                                onChange={(e) => setSettings({ ...settings, advance_payment_percentage: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0E2A38]/5 transition-all"
                                min="0"
                                max="100"
                            />
                            <p className="text-[10px] text-gray-400 mt-1.5 italic">Amount guest must pay to confirm reservation.</p>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={18} className="text-green-500" />
                                <span className="text-sm font-medium">Instant Confirmation</span>
                            </div>
                            <button
                                role="switch"
                                aria-checked={settings.instant_confirmation === 'true'}
                                aria-label="Instant Confirmation"
                                onClick={() => setSettings({ ...settings, instant_confirmation: settings.instant_confirmation === 'true' ? 'false' : 'true' })}
                                className={`w-10 h-6 rounded-full transition-colors relative ${settings.instant_confirmation === 'true' ? 'bg-[#0E2A38]' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.instant_confirmation === 'true' ? 'left-5' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Messaging Section */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-50 p-2 rounded-lg text-green-600">
                            <MessageSquare size={20} />
                        </div>
                        <h2 className="font-bold text-[#0E2A38]">Notifications</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                            <div className="flex items-center gap-3">
                                <Smartphone size={18} className="text-[#25D366]" />
                                <span className="text-sm font-medium">WhatsApp Updates</span>
                            </div>
                            <button
                                role="switch"
                                aria-checked={settings.whatsapp_enabled === 'true'}
                                aria-label="WhatsApp Updates"
                                onClick={() => setSettings({ ...settings, whatsapp_enabled: settings.whatsapp_enabled === 'true' ? 'false' : 'true' })}
                                className={`w-10 h-6 rounded-full transition-colors relative ${settings.whatsapp_enabled === 'true' ? 'bg-[#25D366]' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.whatsapp_enabled === 'true' ? 'left-5' : 'left-1'}`} />
                            </button>
                        </div>

                        {settings.whatsapp_enabled === 'true' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Business Number</label>
                                <input
                                    type="tel"
                                    placeholder="+91 98765 43210"
                                    value={settings.whatsapp_phone}
                                    onChange={(e) => setSettings({ ...settings, whatsapp_phone: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0E2A38]/5 transition-all text-sm"
                                />
                            </motion.div>
                        )}

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                            <div className="flex items-center gap-3">
                                <Mail size={18} className="text-blue-500" />
                                <span className="text-sm font-medium">Email Confirmation</span>
                            </div>
                            <button
                                role="switch"
                                aria-checked={settings.email_confirmation_enabled === 'true'}
                                aria-label="Email Confirmation"
                                onClick={() => setSettings({ ...settings, email_confirmation_enabled: settings.email_confirmation_enabled === 'true' ? 'false' : 'true' })}
                                className={`w-10 h-6 rounded-full transition-colors relative ${settings.email_confirmation_enabled === 'true' ? 'bg-[#0E2A38]' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.email_confirmation_enabled === 'true' ? 'left-5' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <h2 className="font-bold text-[#0E2A38] flex items-center gap-2">
                    <Globe size={20} className="text-gray-400" /> Advanced Options
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Booking ID Prefix</label>
                        <input
                            type="text"
                            value={settings.booking_prefix}
                            onChange={(e) => setSettings({ ...settings, booking_prefix: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0E2A38]/5 transition-all text-sm uppercase"
                            maxLength={4}
                        />
                        <p className="text-[10px] text-gray-400 mt-1.5 italic">Example: {settings.booking_prefix}-1001</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
