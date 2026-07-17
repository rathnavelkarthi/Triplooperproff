import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import { useParams, Navigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BedDouble, UtensilsCrossed, Building2, ArrowLeft, Save,
  LayoutDashboard, ListTodo, CalendarDays, Users, Waypoints,
  Calculator, ClipboardList, Armchair, Package, BarChart3,
  CreditCard, FileText, Receipt, TrendingUp, Globe, Layers,
  Tag, CalendarCheck, MessageSquare, UserCog, Check, Key,
  Copy, Eye, EyeOff, AlertCircle,
} from 'lucide-react';

const FEATURE_GROUPS = {
  Hotel: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'reservations', label: 'Reservations', icon: ListTodo },
    { key: 'calendar', label: 'Calendar View', icon: CalendarDays },
    { key: 'guests', label: 'Guest Management', icon: Users },
    { key: 'rooms', label: 'Rooms', icon: BedDouble },
    { key: 'channel_manager', label: 'Channel Manager', icon: Waypoints },
  ],
  Restaurant: [
    { key: 'pos', label: 'Point of Sale', icon: Calculator },
    { key: 'menu_manager', label: 'Menu Manager', icon: UtensilsCrossed },
    { key: 'food_orders', label: 'Food Orders', icon: ClipboardList },
    { key: 'tables', label: 'Tables', icon: Armchair },
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'server_orders', label: 'Server Orders', icon: ListTodo },
  ],
  Finance: [
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'invoices', label: 'Invoices', icon: FileText },
    { key: 'expenses', label: 'Expenses', icon: Receipt },
    { key: 'profit_loss', label: 'Profit & Loss', icon: TrendingUp },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
  ],
  Settings: [
    { key: 'website_editor', label: 'Website Editor', icon: Globe },
    { key: 'rooms_cms', label: 'Rooms CMS', icon: Layers },
    { key: 'pricing_rules', label: 'Pricing Rules', icon: Tag },
    { key: 'booking_settings', label: 'Booking Settings', icon: CalendarCheck },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { key: 'staff', label: 'Staff Management', icon: UserCog },
    { key: 'billing', label: 'Billing', icon: CreditCard },
  ],
};

interface PropertyDetail {
  id: string;
  business_name: string;
  business_type: string;
  subdomain: string | null;
  is_active: boolean;
  plan: string;
  owner_id: string;
  feature_toggles: Record<string, boolean>;
  created_at: string;
}

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  hotel: { icon: BedDouble, color: 'bg-blue-50 text-blue-600', label: 'Hotel' },
  restaurant: { icon: UtensilsCrossed, color: 'bg-orange-50 text-orange-600', label: 'Restaurant' },
  combined: { icon: Building2, color: 'bg-purple-50 text-purple-600', label: 'Hotel + Restaurant' },
};

export default function BusinessPropertyDetail() {
  const { user } = useAuth();
  const { propertyId } = useParams<{ propertyId: string }>();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  if (user?.role !== 'BUSINESS_ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const loadProperty = async () => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (fetchErr) throw fetchErr;
      if (data) {
        setProperty(data as PropertyDetail);
        setToggles(data.feature_toggles || {});
      }
    } catch (err: any) {
      console.error('BusinessPropertyDetail: load error', err);
      setError(err.message);
    }
    setLoading(false);
  };

  const toggleFeature = (key: string) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const toggleGroup = (groupName: string, on: boolean) => {
    const group = FEATURE_GROUPS[groupName as keyof typeof FEATURE_GROUPS];
    if (!group) return;
    setToggles(prev => {
      const next = { ...prev };
      group.forEach(f => { next[f.key] = on; });
      return next;
    });
    setSaved(false);
  };

  const saveToggles = async () => {
    if (!propertyId) return;
    setSaving(true);
    setError(null);

    const { error: updateErr } = await supabase
      .from('tenants')
      .update({ feature_toggles: toggles })
      .eq('id', propertyId);

    if (updateErr) {
      setError(updateErr.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const enabledCount = Object.values(toggles).filter(Boolean).length;
  const totalCount = Object.keys(toggles).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#0E2A38]/20 border-t-[#0E2A38] rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Property not found.</p>
        <Link to="/admin/business" className="text-sm text-[#0E2A38] hover:underline mt-2 inline-block">Back to properties</Link>
      </div>
    );
  }

  const config = typeConfig[property.business_type] || typeConfig.hotel;
  const TypeIcon = config.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        to="/admin/business"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ArrowLeft size={14} /> Back to properties
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.color}`}>
            <TypeIcon size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-[#0E2A38]">{property.business_name}</h1>
              <span className={`w-2 h-2 rounded-full ${property.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
            </div>
            <p className="text-sm text-gray-400">
              {config.label} &middot; {property.subdomain ? `${property.subdomain}.triplooper.com` : 'No subdomain'} &middot; Created {new Date(property.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Owner info */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-[#0E2A38] mb-4 flex items-center gap-2">
          <Key size={14} /> Owner access
        </h2>
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <div className="grid grid-cols-2 gap-y-2">
            <span className="text-gray-400">Owner ID</span>
            <span className="text-gray-700 font-mono text-xs truncate">{property.owner_id}</span>
            <span className="text-gray-400">Plan</span>
            <span className="text-gray-700 capitalize font-medium">{property.plan}</span>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0E2A38]">Feature access</h2>
            <p className="text-xs text-gray-400 mt-0.5">{enabledCount}/{totalCount} features enabled for the property owner.</p>
          </div>
          <button
            onClick={saveToggles}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all ${
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-[#0E2A38] text-white hover:bg-[#1a3d4f]'
            } disabled:opacity-60`}
          >
            {saving ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
            ) : saved ? (
              <><Check size={14} /> Saved</>
            ) : (
              <><Save size={14} /> Save changes</>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(FEATURE_GROUPS).map(([groupName, features]) => {
            const allOn = features.every(f => toggles[f.key]);

            return (
              <div key={groupName} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{groupName}</h3>
                  <button
                    onClick={() => toggleGroup(groupName, !allOn)}
                    className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider transition-colors"
                  >
                    {allOn ? 'Turn all off' : 'Turn all on'}
                  </button>
                </div>
                <div className="space-y-1">
                  {features.map(f => {
                    const isOn = toggles[f.key] ?? true;
                    return (
                      <button
                        key={f.key}
                        onClick={() => toggleFeature(f.key)}
                        role="switch"
                        aria-checked={isOn}
                        aria-label={`${f.label} — ${isOn ? 'enabled' : 'disabled'}`}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                          isOn ? 'bg-emerald-50/60' : 'bg-gray-50/60 opacity-60'
                        }`}
                      >
                        <f.icon size={14} className={isOn ? 'text-emerald-600' : 'text-gray-400'} />
                        <span className={`text-sm flex-1 ${isOn ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                          {f.label}
                        </span>
                        {isOn ? (
                          <div className="w-9 h-5 bg-emerald-500 rounded-full p-0.5 transition-colors">
                            <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-sm" />
                          </div>
                        ) : (
                          <div className="w-9 h-5 bg-gray-300 rounded-full p-0.5 transition-colors">
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
