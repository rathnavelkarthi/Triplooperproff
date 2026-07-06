import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Building2, Plus, BedDouble, UtensilsCrossed, Settings,
  ChevronRight, Users, ToggleLeft, ToggleRight, AlertCircle,
} from 'lucide-react';

interface ManagedProperty {
  id: string;
  business_name: string;
  business_type: string;
  subdomain: string | null;
  is_active: boolean;
  plan: string;
  feature_toggles: Record<string, boolean> | null;
  created_at: string;
}

const typeConfig = {
  hotel: { icon: BedDouble, color: 'bg-blue-50 text-blue-600', label: 'Hotel' },
  restaurant: { icon: UtensilsCrossed, color: 'bg-orange-50 text-orange-600', label: 'Restaurant' },
  combined: { icon: Building2, color: 'bg-purple-50 text-purple-600', label: 'Hotel + Restaurant' },
};

export default function BusinessDashboard() {
  const { user, business } = useAuth();
  const [properties, setProperties] = useState<ManagedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  // Access is managed by RoleGuard in CRMApp


  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (tenants) setProperties(tenants as ManagedProperty[]);
    } catch (err) {
      console.error('BusinessDashboard: load error', err);
    }
    setLoading(false);
  };

  const maxProperties = business?.max_properties || 5;
  const canCreate = properties.length < maxProperties;

  // Count enabled features across properties
  const avgFeatures = properties.length > 0
    ? Math.round(properties.reduce((sum, p) => {
        const toggles = p.feature_toggles || {};
        return sum + Object.values(toggles).filter(Boolean).length;
      }, 0) / properties.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#0E2A38]/20 border-t-[#0E2A38] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0E2A38]">My properties</h1>
          <p className="text-sm text-gray-400 mt-1">
            {properties.length} of {maxProperties} properties used
          </p>
        </div>
        {canCreate ? (
          <Link
            to="/admin/business/create"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0E2A38] text-white rounded-xl text-sm font-medium hover:bg-[#1a3d4f] transition-colors shadow-sm"
          >
            <Plus size={14} />
            Create property
          </Link>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm border border-amber-200">
            <AlertCircle size={14} />
            Property limit reached ({maxProperties})
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Properties</p>
          <p className="text-2xl font-bold text-[#0E2A38]">{properties.length}<span className="text-sm font-normal text-gray-400">/{maxProperties}</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{properties.filter(p => p.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Avg features enabled</p>
          <p className="text-2xl font-bold text-[#0E2A38]">{avgFeatures}</p>
        </div>
      </div>

      {/* Property Cards */}
      {properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
          <Building2 size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">No properties yet</p>
          <p className="text-sm text-gray-400 mb-6">Create your first property to start managing hotels.</p>
          <Link
            to="/admin/business/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0E2A38] text-white rounded-xl text-sm font-medium hover:bg-[#1a3d4f] transition-colors"
          >
            <Plus size={14} />
            Create property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties.map((prop, i) => {
            const config = typeConfig[prop.business_type as keyof typeof typeConfig] || typeConfig.hotel;
            const Icon = config.icon;
            const toggles = prop.feature_toggles || {};
            const enabledCount = Object.values(toggles).filter(Boolean).length;
            const totalCount = Object.keys(toggles).length;

            return (
              <motion.div
                key={prop.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/admin/business/${prop.id}`}
                  className="block bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-[#0E2A38] truncate">{prop.business_name}</h3>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${prop.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                      </div>
                      <p className="text-xs text-gray-400 mb-3">{config.label} &middot; {prop.subdomain || 'no subdomain'}</p>

                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Settings size={11} />
                          {enabledCount}/{totalCount} features
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          Owner access
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
