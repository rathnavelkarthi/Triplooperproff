import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { useAuth, Role, PLATFORM_ADMIN_EMAIL } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import UpgradeModal from './UpgradeModal';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BedDouble,
  CreditCard,
  FileText,
  BarChart3,
  UserCog,
  LogOut,
  ListTodo,
  X,
  Layers,
  Globe,
  Tag,
  CalendarCheck,
  Waypoints,
  MessageSquare,
  UtensilsCrossed,
  ClipboardList,
  Armchair,
  Package,
  ChevronDown,
  ChevronRight,
  Check,
  Plus,
  Building2,
  Calculator,
  Receipt,
  TrendingUp,
  Shield,
  Briefcase,
} from 'lucide-react';

type BusinessType = 'hotel' | 'restaurant' | 'combined';
type NavGroup = 'Overview' | 'Hotel' | 'Restaurant' | 'Finance' | 'Settings' | 'Business' | 'Platform';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: Role[];
  businessTypes: BusinessType[];
  group: NavGroup;
  featureKey?: string;
}

const navItems: NavItem[] = [
  // Overview
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'ACCOUNTANT', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Overview', featureKey: 'dashboard' },
  { name: 'Guests', path: '/admin/guests', icon: Users, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Overview', featureKey: 'guests' },

  // Hotel
  { name: 'Channel Manager', path: '/admin/channels', icon: Waypoints, roles: ['SUPER_ADMIN', 'MANAGER', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'combined'], group: 'Hotel', featureKey: 'channel_manager' },
  { name: 'Reservations', path: '/admin/reservations', icon: ListTodo, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'combined'], group: 'Hotel', featureKey: 'reservations' },
  { name: 'Calendar View', path: '/admin/calendar', icon: CalendarDays, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'combined'], group: 'Hotel', featureKey: 'calendar' },
  { name: 'Rooms', path: '/admin/rooms', icon: BedDouble, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'combined'], group: 'Hotel', featureKey: 'rooms' },
  { name: 'Service Requests', path: '/admin/service-requests', icon: ClipboardList, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'BUSINESS_ADMIN'], businessTypes: ['hotel', 'combined'], group: 'Hotel', featureKey: 'reservations' },

  // Restaurant
  { name: 'Server Orders', path: '/admin/server-orders', icon: ListTodo, roles: ['SUPER_ADMIN', 'MANAGER', 'SERVER'], businessTypes: ['restaurant', 'combined'], group: 'Restaurant', featureKey: 'server_orders' },
  { name: 'Point of Sale', path: '/admin/pos', icon: Calculator, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'SERVER'], businessTypes: ['restaurant', 'combined'], group: 'Restaurant', featureKey: 'pos' },
  { name: 'Menu Manager', path: '/admin/menu', icon: UtensilsCrossed, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['restaurant', 'combined'], group: 'Restaurant', featureKey: 'menu_manager' },
  { name: 'Food Orders', path: '/admin/food-orders', icon: ClipboardList, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'SERVER'], businessTypes: ['restaurant', 'combined'], group: 'Restaurant', featureKey: 'food_orders' },
  { name: 'Tables', path: '/admin/tables', icon: Armchair, roles: ['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'SERVER'], businessTypes: ['restaurant', 'combined'], group: 'Restaurant', featureKey: 'tables' },
  { name: 'Inventory', path: '/admin/inventory', icon: Package, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['restaurant', 'combined'], group: 'Restaurant', featureKey: 'inventory' },

  // Finance (removed: Payments, Invoices, Expenses, Profit & Loss)
  { name: 'Reports', path: '/admin/reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ACCOUNTANT'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Finance', featureKey: 'reports' },

  // Settings
  { name: 'Website Editor', path: '/admin/website-editor', icon: Globe, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Settings', featureKey: 'website_editor' },
  { name: 'Rooms CMS', path: '/admin/rooms-cms', icon: Layers, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['hotel', 'combined'], group: 'Settings', featureKey: 'rooms_cms' },
  { name: 'Pricing Rules', path: '/admin/pricing', icon: Tag, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['hotel', 'combined'], group: 'Settings', featureKey: 'pricing_rules' },
  { name: 'Booking Settings', path: '/admin/booking-settings', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['hotel', 'combined'], group: 'Settings', featureKey: 'booking_settings' },
  { name: 'WhatsApp', path: '/admin/whatsapp', icon: MessageSquare, roles: ['SUPER_ADMIN', 'MANAGER'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Settings', featureKey: 'whatsapp' },
  { name: 'Staff Management', path: '/admin/staff', icon: UserCog, roles: ['SUPER_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Settings', featureKey: 'staff' },
  { name: 'Billing', path: '/admin/billing', icon: CreditCard, roles: ['SUPER_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Settings', featureKey: 'billing' },

  // Business (only for BUSINESS_ADMIN)
  { name: 'My Properties', path: '/admin/business', icon: Briefcase, roles: ['BUSINESS_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Business' },
  { name: 'Create Property', path: '/admin/business/create', icon: Plus, roles: ['BUSINESS_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Business' },

  // Platform (only for platform admin)
  { name: 'Platform Admin', path: '/admin/platform', icon: Shield, roles: ['PLATFORM_ADMIN'], businessTypes: ['hotel', 'restaurant', 'combined'], group: 'Platform' },
];

interface SidebarProps {
  onClose?: () => void;
}

const typeLabel: Record<BusinessType, string> = {
  hotel: 'Hotel',
  restaurant: 'Restaurant',
  combined: 'Hotel + Restaurant',
};

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, tenant, properties, isPlatformAdmin, logout, hasPermission, switchProperty, addProperty } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<BusinessType>('hotel');
  const [adding, setAdding] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Overview: true,
    Hotel: true,
    Restaurant: true,
    Finance: true,
    Settings: false,
    Business: true,
    Platform: true
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Close switcher on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const businessType = tenant?.business_type || 'hotel';

  const filteredNavItems = navItems.filter(item => {
    // Role check — hasPermission grants platform admins everything (short-circuit)
    // and otherwise checks the user's role against the item's allowed roles.
    // A unified check is required: items like the Hotel group list BUSINESS_ADMIN
    // alongside SUPER_ADMIN/MANAGER/etc., so special-casing BUSINESS_ADMIN here
    // would wrongly hide those items from every other allowed role.
    if (!hasPermission(item.roles)) return false;
    // Business type check
    if (!item.businessTypes.includes(businessType as BusinessType)) return false;
    // Feature toggle check — if the tenant has toggles and this item has a featureKey,
    // hide it when the toggle is explicitly false
    if (item.featureKey && tenant?.feature_toggles && tenant.feature_toggles[item.featureKey] === false) return false;
    return true;
  });

  // Group filtered items
  const groupedItems = filteredNavItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  // Define group order
  const groupOrder: NavGroup[] = ['Platform', 'Business', 'Overview', 'Hotel', 'Restaurant', 'Finance', 'Settings'];

  const handleAddProperty = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await addProperty(newName.trim(), newType);
    setAdding(false);
    if (!error) {
      setAddModalOpen(false);
      setNewName('');
      setSwitcherOpen(false);
    }
  };

  return (
    <>
      <aside className="w-64 bg-[#0E2A38] border-r border-[#0E2A38]/50 flex flex-col h-full lg:h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.1)] lg:shadow-[4px_0_40px_rgba(14,42,56,0.15)] z-40 relative backdrop-blur-xl">
        {/* Property switcher */}
        <div className={`p-4 pb-2 relative ${switcherOpen ? 'z-50' : 'z-10'}`} ref={switcherRef}>
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#C9A646]/20 flex items-center justify-center shrink-0">
              {tenant?.logo_url ? (
                <img src={tenant.logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
              ) : (
                <Building2 size={16} className="text-[#C9A646]" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-white truncate">{tenant?.business_name || 'Select property'}</p>
              <p className="text-[10px] text-[#C9A646] uppercase tracking-[0.15em]">{typeLabel[businessType as BusinessType] || 'Workspace'}</p>
            </div>
            <ChevronDown size={14} className={`text-white/40 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {switcherOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute left-4 right-4 top-full mt-1 bg-[#0B1F2B] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
              >
                <div className="py-2 max-h-[240px] overflow-y-auto">
                  {properties.map(prop => (
                    <button
                      key={prop.id}
                      onClick={() => {
                        switchProperty(prop.id);
                        setSwitcherOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${prop.id === tenant?.id ? 'bg-white/5' : 'hover:bg-white/5'
                        }`}
                    >
                      <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#C9A646]">{prop.business_name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{prop.business_name}</p>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">{typeLabel[prop.business_type as BusinessType]}</p>
                      </div>
                      {prop.id === tenant?.id && (
                        <Check size={14} className="text-[#C9A646] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/5 p-2">
                  <button
                    onClick={() => {
                      if ((tenant?.plan === 'starter' || !tenant?.plan) && properties.length >= 1) {
                        setShowUpgradeModal(true);
                      } else {
                        setAddModalOpen(true);
                      }
                      setSwitcherOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Plus size={14} />
                    Add property
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 lg:hidden p-2 text-white/50 hover:text-white rounded-lg transition-colors z-10">
            <X size={20} />
          </button>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4 custom-scrollbar relative">
          {groupOrder.map((groupName) => {
            const itemsInGroup = groupedItems[groupName];
            if (!itemsInGroup || itemsInGroup.length === 0) return null;

            const isExpanded = expandedGroups[groupName];

            return (
              <div key={groupName} className="space-y-1 block">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-white/30 uppercase tracking-[0.1em] hover:text-white/60 transition-colors"
                >
                  {groupName}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-1 block"
                    >
                      {itemsInGroup.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.path}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg font-medium transition-all duration-200 relative group overflow-hidden ${isActive
                              ? 'text-white bg-white/10 shadow-inner'
                              : 'text-white/50 hover:bg-white/5 hover:text-white/90'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <motion.div
                                  layoutId="active-sidebar-indicator"
                                  className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-[#C9A646] rounded-r-lg shadow-[0_0_12px_rgba(201,166,70,0.8)]"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                              )}
                              <item.icon size={16} className={`transition-colors duration-200 ${isActive ? 'text-[#C9A646]' : 'text-white/40 group-hover:text-white/80'}`} />
                              <span className="text-[13px] tracking-wide">{item.name}</span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 relative z-10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-white/20 shadow-sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-[#C9A646] uppercase tracking-widest truncate">{user.role.replace('_', ' ')}</p>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${(tenant?.plan || 'starter') === 'starter' ? 'bg-gray-500/20 text-gray-300' :
                    (tenant?.plan) === 'growth' ? 'bg-blue-500/20 text-blue-300' :
                      (tenant?.plan) === 'pro' ? 'bg-[#C9A646]/20 text-[#C9A646]' :
                        'bg-purple-500/20 text-purple-300'
                    }`}>{tenant?.plan || 'starter'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 px-4 py-2 w-full rounded-md font-medium text-white/70 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-colors text-xs uppercase tracking-widest"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#05141C]/80 pointer-events-none z-0" />
      </aside>

      <AddPropertyModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        tenant={tenant}
        onAdd={addProperty}
      />
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        resource="properties"
        plan={tenant?.plan || 'starter'}
        currentCount={properties.length}
        limit={1}
      />
    </>
  );
}

/* Add Property Modal - portalled to body to escape sidebar stacking context */
function AddPropertyModal({
  open,
  onClose,
  tenant,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  tenant: ReturnType<typeof useAuth>['tenant'];
  onAdd: (name: string, type: 'hotel' | 'restaurant' | 'combined') => Promise<{ error: string | null }>;
}) {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'hotel' | 'restaurant' | 'combined'>('hotel');
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setErrorMsg(null);
    const { error } = await onAdd(newName.trim(), newType);
    setAdding(false);
    if (!error) {
      onClose();
      setNewName('');
    } else {
      setErrorMsg(error);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0E2A38]">Add a new property</h2>
                <p className="text-sm text-gray-400 mt-1">Expand your business with another location.</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="px-6 pb-4 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm">
                {errorMsg}
              </div>
            )}

            {/* Property name */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Property name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Beach House Resort"
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none transition-all"
              />
            </div>

            {/* Business type selection */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Property type</label>
              <div className="space-y-2">
                {([
                  { key: 'hotel' as const, icon: BedDouble, label: 'Hotel', desc: 'Rooms, reservations, and booking management' },
                  { key: 'restaurant' as const, icon: UtensilsCrossed, label: 'Restaurant', desc: 'Menu, food orders, tables, and inventory' },
                  { key: 'combined' as const, icon: Building2, label: 'Hotel + Restaurant', desc: 'Full hospitality suite with rooms and dining' },
                ]).map(opt => {
                  const isAddon = tenant?.business_type === 'hotel' && (opt.key === 'restaurant' || opt.key === 'combined');
                  const selected = newType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setNewType(opt.key)}
                      className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${selected
                        ? 'border-[#0E2A38] bg-[#0E2A38]/[0.03]'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-[#0E2A38] text-white' : 'bg-gray-50 text-gray-400'
                        }`}>
                        <opt.icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${selected ? 'text-[#0E2A38]' : 'text-gray-700'}`}>{opt.label}</span>
                          {isAddon && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">
                              Add-on
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                        {isAddon && selected && (
                          <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                            <span className="inline-block w-1 h-1 rounded-full bg-amber-500" />
                            Restaurant features require an upgraded plan
                          </p>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${selected ? 'border-[#0E2A38] bg-[#0E2A38]' : 'border-gray-200'
                        }`}>
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <p className="text-xs text-gray-300">A subdomain will be created automatically.</p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newName.trim() || adding}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#0E2A38] text-white hover:bg-[#1a3d4f] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md cursor-pointer"
              >
                {adding ? 'Creating...' : 'Create property'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
