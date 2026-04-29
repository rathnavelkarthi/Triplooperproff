import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { useNavigate, Navigate } from 'react-router-dom';
import { generateSubdomain } from '../../../lib/booking';
import { sendWelcomeEmail } from '../../../lib/email';
import { motion, AnimatePresence } from 'motion/react';
import {
  BedDouble, UtensilsCrossed, Building2, Check, ChevronRight,
  ChevronLeft, ArrowRight, Eye, EyeOff, Mail, Lock, AlertCircle,
  LayoutDashboard, ListTodo, CalendarDays, Users, Waypoints,
  Calculator, ClipboardList, Armchair, Package, BarChart3,
  CreditCard, FileText, Receipt, TrendingUp, Globe, Layers,
  Tag, CalendarCheck, MessageSquare, UserCog,
} from 'lucide-react';

// All toggleable features with their UI config
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

const DEFAULT_TOGGLES: Record<string, boolean> = {
  dashboard: true, reservations: true, calendar: true, guests: true,
  rooms: true, channel_manager: true, payments: false, invoices: false,
  expenses: false, profit_loss: false, reports: true, pos: true,
  menu_manager: true, food_orders: true, tables: true, inventory: true,
  website_editor: true, rooms_cms: true, pricing_rules: true,
  booking_settings: true, whatsapp: true, staff: true, billing: true,
  server_orders: true,
};

type BusinessType = 'hotel' | 'restaurant' | 'combined';

export default function BusinessPropertyCreate() {
  const { user, business } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [propName, setPropName] = useState('');
  const [propType, setPropType] = useState<BusinessType>('hotel');

  // Step 2
  const [toggles, setToggles] = useState<Record<string, boolean>>({ ...DEFAULT_TOGGLES });

  // Step 3
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState(() => generatePassword());
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user?.role !== 'BUSINESS_ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  function generatePassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$';
    let pwd = '';
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  }

  const toggleFeature = (key: string) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleGroup = (groupName: string, on: boolean) => {
    const group = FEATURE_GROUPS[groupName as keyof typeof FEATURE_GROUPS];
    if (!group) return;
    setToggles(prev => {
      const next = { ...prev };
      group.forEach(f => { next[f.key] = on; });
      return next;
    });
  };

  const handleCreate = async () => {
    if (!propName.trim() || !ownerEmail.trim()) return;
    setCreating(true);
    setError(null);

    try {
      let currentBusiness = business;

      // Self-healing fallback: If business is missing from context, try direct lookup
      if (!currentBusiness?.id && user?.id) {
        const { data: bData, error: bError } = await supabaseAdmin
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();

        if (bData) {
          currentBusiness = bData;
        } else if (bError) {
          console.error('[BusinessPropertyCreate] Fallback business lookup failed:', bError);
          setError(`Business lookup failed: ${bError.message}. Please refresh the page.`);
          setCreating(false);
          return;
        }
      }

      if (!currentBusiness?.id) {
        setError('Business account not found. Please refresh the page. If the problem persists, restart your development server (npm run dev).');
        setCreating(false);
        return;
      }

      // 1. Check property limit using the active business record
      const { count } = await supabaseAdmin
        .from('tenants')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', currentBusiness.id);

      if ((count || 0) >= currentBusiness.max_properties) {
        setError(`Property limit reached (${currentBusiness.max_properties}). Contact EasyStay to increase.`);
        setCreating(false);
        return;
      }

      // 3. Create Supabase auth user for the property owner
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: ownerEmail.trim(),
        password: ownerPassword,
        options: {
          data: { full_name: propName.trim() + ' Owner' },
        },
      });

      // It's OK if user already exists — they might have been invited before
      if (authError && !authError.message.includes('already')) {
        setError(authError.message);
        setCreating(false);
        return;
      }

      const ownerId = authData?.user?.id || ownerEmail.trim();

      // 4. Create tenant (property) with feature toggles
      const subdomain = generateSubdomain(propName.trim());
      const { data: newTenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert({
          business_name: propName.trim(),
          business_type: propType,
          subdomain,
          template: 'modern',
          plan: 'growth',
          owner_id: ownerId,
          business_id: currentBusiness.id,
          managed_by_business: true,
          feature_toggles: toggles,
          is_active: true,
        })
        .select()
        .single();

      if (tenantError) {
        if (tenantError.message?.includes('subdomain')) {
          setError('A property with this name already exists. Choose a different name.');
        } else {
          setError(tenantError.message);
        }
        setCreating(false);
        return;
      }

      // 5. Create user_properties link
      if (newTenant) {
        await supabaseAdmin.from('user_properties').insert({
          user_id: ownerId,
          tenant_id: newTenant.id,
          role: 'SUPER_ADMIN',
          is_owner: true,
        });

        // 6. Send welcome email
        await sendWelcomeEmail({
          email: ownerEmail.trim(),
          businessName: propName.trim(),
          businessType: propType,
          password: ownerPassword,
          subdomain: newTenant.subdomain
        });
      }

      // Done
      navigate('/admin/business');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    }
    setCreating(false);
  };

  // Helper to determine if a group should be shown based on property type
  const isGroupVisible = (groupName: string) => {
    if (propType === 'hotel' && groupName === 'Restaurant') return false;
    if (propType === 'restaurant' && groupName === 'Hotel') return false;
    return true;
  };

  // Calculate counts based only on visible features
  const visibleFeatures = Object.entries(FEATURE_GROUPS)
    .filter(([group]) => isGroupVisible(group))
    .flatMap(([_, features]) => features.map(f => f.key));

  const enabledCount = visibleFeatures.filter(key => toggles[key]).length;
  const totalCount = visibleFeatures.length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s < step ? 'bg-emerald-500 text-white' :
              s === step ? 'bg-[#0E2A38] text-white' :
              'bg-gray-100 text-gray-400'
            }`}>
              {s < step ? <Check size={14} /> : s}
            </div>
            <span className={`text-sm font-medium ${s === step ? 'text-[#0E2A38]' : 'text-gray-400'}`}>
              {s === 1 ? 'Basics' : s === 2 ? 'Features' : 'Owner'}
            </span>
            {s < 3 && <ChevronRight size={14} className="text-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basics */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-[#0E2A38]">Property basics</h2>
              <p className="text-sm text-gray-400 mt-1">Name the property and pick its type.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Property name</label>
              <input
                type="text"
                value={propName}
                onChange={e => setPropName(e.target.value)}
                placeholder="e.g. Seaside Boutique Hotel"
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
              />
              {propName.trim() && (
                <p className="text-xs text-gray-400 mt-1.5">Subdomain: <span className="font-mono text-gray-500">{generateSubdomain(propName)}.esaystay.com</span></p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Property type</label>
              <div className="space-y-2">
                {([
                  { key: 'hotel' as const, icon: BedDouble, label: 'Hotel', desc: 'Rooms, reservations, booking management' },
                  { key: 'restaurant' as const, icon: UtensilsCrossed, label: 'Restaurant', desc: 'Menu, orders, tables, inventory' },
                  { key: 'combined' as const, icon: Building2, label: 'Hotel + Restaurant', desc: 'Full hospitality suite' },
                ]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setPropType(opt.key)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      propType === opt.key
                        ? 'border-[#0E2A38] bg-[#0E2A38]/[0.03]'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      propType === opt.key ? 'bg-[#0E2A38] text-white' : 'bg-gray-50 text-gray-400'
                    }`}>
                      <opt.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${propType === opt.key ? 'text-[#0E2A38]' : 'text-gray-700'}`}>{opt.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      propType === opt.key ? 'border-[#0E2A38] bg-[#0E2A38]' : 'border-gray-200'
                    }`}>
                      {propType === opt.key && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!propName.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0E2A38] text-white rounded-xl text-sm font-medium hover:bg-[#1a3d4f] transition-colors disabled:opacity-40"
              >
                Next: Configure features <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Feature Toggles */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0E2A38]">Feature access</h2>
                <p className="text-sm text-gray-400 mt-1">Choose which modules the property owner can see. {enabledCount}/{totalCount} enabled.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(FEATURE_GROUPS)
                .filter(([groupName]) => isGroupVisible(groupName))
                .map(([groupName, features]) => {
                const allOn = features.every(f => toggles[f.key]);
                const someOn = features.some(f => toggles[f.key]);

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
                        const isOn = toggles[f.key];
                        return (
                          <button
                            key={f.key}
                            onClick={() => toggleFeature(f.key)}
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

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0E2A38] text-white rounded-xl text-sm font-medium hover:bg-[#1a3d4f] transition-colors"
              >
                Next: Owner credentials <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Owner Credentials + Confirm */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-[#0E2A38]">Owner credentials</h2>
              <p className="text-sm text-gray-400 mt-1">Set up the login for the property owner. They'll use these to sign in.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Owner email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={e => setOwnerEmail(e.target.value)}
                    placeholder="owner@theirhotel.com"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Auto-generated password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={ownerPassword}
                    onChange={e => setOwnerPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-20 py-3 text-sm font-mono focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => setOwnerPassword(generatePassword())}
                    className="text-xs text-[#0E2A38] font-medium hover:underline"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(ownerPassword)}
                    className="text-xs text-gray-400 font-medium hover:underline"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Summary</h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-gray-400">Property</span>
                <span className="text-gray-700 font-medium">{propName}</span>
                <span className="text-gray-400">Type</span>
                <span className="text-gray-700 font-medium capitalize">{propType}</span>
                <span className="text-gray-400">Subdomain</span>
                <span className="text-gray-700 font-mono text-xs">{generateSubdomain(propName)}.esaystay.com</span>
                <span className="text-gray-400">Features enabled</span>
                <span className="text-gray-700 font-medium">{enabledCount} of {totalCount}</span>
                <span className="text-gray-400">Owner email</span>
                <span className="text-gray-700 font-medium">{ownerEmail || '—'}</span>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>
              <button
                onClick={handleCreate}
                disabled={!ownerEmail.trim() || creating}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#0E2A38] text-white rounded-xl text-sm font-medium hover:bg-[#1a3d4f] transition-colors disabled:opacity-40"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create property</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
