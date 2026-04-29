import { useState, useEffect } from 'react';
import { useAuth, PLATFORM_ADMIN_EMAIL } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendBusinessInvite } from '../../lib/email';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Building2, Briefcase, ChevronDown, ChevronRight,
  Send, Copy, Check, X, Search, Mail, Shield,
  Plus, AlertCircle, Clock, CheckCircle2
} from 'lucide-react';

interface PlatformUser {
  clerk_id: string;
  email: string;
  name?: string;
  created_at: string;
  subscription?: {
    plan: string;
    status: string;
    expires_at: string | null;
  };
  properties: {
    id: string;
    business_name: string;
    business_type: string;
    plan: string;
    is_active: boolean;
    subdomain: string | null;
    created_at: string;
  }[];
}

interface BusinessInvite {
  id: string;
  email: string;
  business_name: string;
  max_properties: number;
  max_rooms_per_property: number;
  status: string;
  token: string;
  created_at: string;
  expires_at: string;
}

export default function PlatformAdmin() {
  const { user, isPlatformAdmin } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [invites, setInvites] = useState<BusinessInvite[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBizName, setInviteBizName] = useState('');
  const [inviteMaxProps, setInviteMaxProps] = useState(5);
  const [inviteMaxRooms, setInviteMaxRooms] = useState(15);
  const [sending, setSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  if (!isPlatformAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all tenants
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, business_name, business_type, subdomain, plan, is_active, owner_id, custom_email, created_at')
        .order('created_at', { ascending: false });

      // Load all user_properties to get owner links + emails via staff table
      const { data: links } = await supabase
        .from('user_properties')
        .select('user_id, tenant_id, role, is_owner');

      // Load staff table to map user_id -> email for Supabase users
      const { data: staffList } = await supabase
        .from('staff')
        .select('id, email, name');

      // Load active subscriptions
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      const staffEmailMap = new Map<string, string>();
      const staffNameMap = new Map<string, string>();
      if (staffList) {
        for (const s of staffList) {
          staffEmailMap.set(s.id, s.email || '');
          staffNameMap.set(s.id, s.name || '');
        }
      }

      // Build map: owner_id -> { email, properties[] }
      const userMap = new Map<string, PlatformUser>();

      const ensureUser = (ownerId: string, email: string, name?: string, createdAt?: string) => {
        if (!userMap.has(ownerId)) {
          userMap.set(ownerId, { 
            clerk_id: ownerId, 
            email, 
            name, 
            created_at: createdAt || new Date().toISOString(),
            properties: [] 
          });
        } else {
          if (email && userMap.get(ownerId)!.email === 'N/A') {
            userMap.get(ownerId)!.email = email;
          }
          if (name && !userMap.get(ownerId)!.name) {
            userMap.get(ownerId)!.name = name;
          }
        }
      };

      // First pass: walk user_properties (owner links)
      if (links && tenants) {
        for (const link of links) {
          if (!link.is_owner) continue;
          const tenant = tenants.find(t => t.id === link.tenant_id);
          if (!tenant) continue;

          // Try to get a readable email: staff table first, then Clerk email (stored in tenant)
          const email =
            staffEmailMap.get(link.user_id) ||
            tenant.custom_email ||
            link.user_id; // fallback: show the ID if nothing else
            
          const name = staffNameMap.get(link.user_id);

          ensureUser(link.user_id, email, name, tenant.created_at);
          userMap.get(link.user_id)!.properties.push({
            id: tenant.id,
            business_name: tenant.business_name,
            business_type: tenant.business_type,
            plan: tenant.plan || 'starter',
            is_active: tenant.is_active,
            subdomain: tenant.subdomain,
            created_at: tenant.created_at
          });
          
          // Attach subscription if found for any of user's tenants
          if (subs) {
            const tenantSub = subs.find(s => s.tenant_id === tenant.id);
            if (tenantSub) {
              userMap.get(link.user_id)!.subscription = {
                plan: tenantSub.plan,
                status: tenantSub.status,
                expires_at: tenantSub.expires_at
              };
            }
          }
        }
      }

      // Second pass: any tenants whose owner_id wasn't covered above
      if (tenants) {
        for (const t of tenants) {
          if (!t.owner_id) continue;
          const alreadyHas = userMap.get(t.owner_id)?.properties.find(p => p.id === t.id);
          if (!alreadyHas) {
            const email = staffEmailMap.get(t.owner_id) || t.custom_email || t.owner_id;
            const name = staffNameMap.get(t.owner_id);
            ensureUser(t.owner_id, email, name, t.created_at);
            userMap.get(t.owner_id)!.properties.push({
              id: t.id,
              business_name: t.business_name,
              business_type: t.business_type,
              plan: t.plan || 'starter',
              is_active: t.is_active,
              subdomain: t.subdomain,
              created_at: t.created_at
            });
            
            if (subs) {
              const tenantSub = subs.find(s => s.tenant_id === t.id);
              if (tenantSub) {
                userMap.get(t.owner_id)!.subscription = {
                  plan: tenantSub.plan,
                  status: tenantSub.status,
                  expires_at: tenantSub.expires_at
                };
              }
            }
          }
        }
      }

      setUsers(Array.from(userMap.values()));

      // Load business invites
      const { data: inviteData } = await supabase
        .from('business_invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (inviteData) setInvites(inviteData);
    } catch (err) {
      console.error('PlatformAdmin: load error', err);
    }
    setLoading(false);
  };

  const deleteUser = async (u: PlatformUser) => {
    if (u.email.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase()) {
      toast.error("Cannot delete the platform admin account!");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${u.email} and all associated data? This will wipe properties, staff, and subscriptions.`)) {
      return;
    }

    setLoading(true);
    try {
      // 1. Get all tenants owned by this user
      const tenantIds = u.properties.map(p => p.id);

      // 2. Clear data via Supabase Admin (privileged)
      // We delete in reverse order of dependencies
      const { error: propError } = await supabaseAdmin.from('user_properties').delete().eq('user_id', u.clerk_id);
      if (propError) console.error('Error deleting user_properties', propError);

      if (tenantIds.length > 0) {
        await supabaseAdmin.from('staff').delete().in('tenant_id', tenantIds);
        await supabaseAdmin.from('subscriptions').delete().in('tenant_id', tenantIds);
        await supabaseAdmin.from('reservations').delete().in('tenant_id', tenantIds);
        await supabaseAdmin.from('tenants').delete().in('id', tenantIds);
      }

      await supabaseAdmin.from('businesses').delete().eq('owner_id', u.clerk_id);
      
      toast.success(`User ${u.email} and related data deleted locally from Supabase.`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const cleanStart = async () => {
    if (!window.confirm("CRITICAL ACTION: This will delete ALL users and data except your account. Type 'RESET' to confirm.")) {
      return;
    }
    const check = window.prompt("Type 'RESET' to proceed:");
    if (check !== 'RESET') return;

    setLoading(true);
    try {
      let deletedCount = 0;
      for (const u of users) {
        if (u.email.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase()) continue;
        
        // Quietly delete (reuse delete logic without confirmations)
        const tenantIds = u.properties.map(p => p.id);
        await supabaseAdmin.from('user_properties').delete().eq('user_id', u.clerk_id);
        if (tenantIds.length > 0) {
          await supabaseAdmin.from('staff').delete().in('tenant_id', tenantIds);
          await supabaseAdmin.from('subscriptions').delete().in('tenant_id', tenantIds);
          await supabaseAdmin.from('tenants').delete().in('id', tenantIds);
        }
        await supabaseAdmin.from('businesses').delete().eq('owner_id', u.clerk_id);
        deletedCount++;
      }
      
      toast.success(`Clean start complete. Removed ${deletedCount} users.`);
      await loadData();
    } catch (err: any) {
      toast.error("Clean start failed partly: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteInvite = async (id: string, email: string) => {
    if (!window.confirm(`Delete invite for ${email}?`)) return;
    
    setLoading(true);
    try {
      const { error } = await supabaseAdmin
        .from('business_invites')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Invite deleted");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete invite");
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !inviteBizName.trim()) return;
    setSending(true);
    setInviteError(null);

    const token = crypto.randomUUID();

    const { error } = await supabase.from('business_invites').insert({
      email: inviteEmail.trim().toLowerCase(),
      business_name: inviteBizName.trim(),
      max_properties: inviteMaxProps,
      max_rooms_per_property: inviteMaxRooms,
      invited_by: user?.id || '',
      token,
      status: 'pending',
    });

    if (error) {
      setInviteError(error.message);
      setSending(false);
      return;
    }

    const inviteUrl = `${window.location.origin}/signup?invite=${encodeURIComponent(token)}`;
    const emailed = await sendBusinessInvite({
      email: inviteEmail.trim().toLowerCase(),
      businessName: inviteBizName.trim(),
      maxProperties: inviteMaxProps,
      inviteUrl,
    });
    if (!emailed) {
      toast.warning(
        'Invite was saved, but the email was not sent. Check local email server at port 3001.'
      );
    } else {
      toast.success(`Invite email sent to ${inviteEmail}`);
    }

    // Refresh
    await loadData();
    setInviteEmail('');
    setInviteBizName('');
    setInviteMaxProps(5);
    setInviteMaxRooms(15);
    setShowInviteForm(false);
    setSending(false);
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.properties.some(p => p.business_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalProperties = users.reduce((sum, u) => sum + u.properties.length, 0);
  const activeBusinesses = invites.filter(i => i.status === 'accepted').length;
  const pendingInvites = invites.filter(i => i.status === 'pending').length;

  const planColors: Record<string, string> = {
    starter: 'bg-gray-100 text-gray-600',
    growth: 'bg-blue-50 text-blue-600',
    pro: 'bg-amber-50 text-amber-600',
    enterprise: 'bg-purple-50 text-purple-600',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#0E2A38]/20 border-t-[#0E2A38] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-[#0E2A38]" />
            <h1 className="text-2xl font-bold text-[#0E2A38]">Platform admin</h1>
          </div>
          <button 
            onClick={cleanStart}
            className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-widest px-3 py-1.5 border border-red-100 rounded-lg hover:bg-red-50"
          >
            Clean Start
          </button>
        </div>
        <p className="text-sm text-gray-400">All users, properties, and business invites across EasyStay.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total users', value: users.length, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Properties', value: totalProperties, icon: Building2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Business accounts', value: activeBusinesses, icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
          { label: 'Pending invites', value: pendingInvites, icon: Clock, color: 'text-amber-600 bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon size={16} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-[#0E2A38]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0E2A38]">All users</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by email or property..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">No users found.</div>
          )}
          {filteredUsers.map(u => (
            <div key={u.clerk_id} className="group/row">
              <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <button
                  onClick={() => setExpandedUser(expandedUser === u.clerk_id ? null : u.clerk_id)}
                  className="flex flex-1 items-center gap-4 text-left min-w-0"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0E2A38]/10 flex items-center justify-center text-xs font-bold text-[#0E2A38]">
                    {u.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <p className="text-sm font-bold text-gray-800 truncate">
                         {u.properties[0]?.business_name || 'No Property Name'}
                       </p>
                       {u.subscription && (
                         <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                           {u.subscription.plan} active
                         </span>
                       )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <Mail size={10} />
                      <span className="truncate">{u.email}</span>
                      <span className="text-gray-200">&middot;</span>
                      <Clock size={10} />
                      <span>{new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.properties.map(p => (
                      <span key={p.id} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${planColors[p.plan] || planColors.starter}`}>
                        {p.plan}
                      </span>
                    ))}
                  </div>
                  {u.properties.length > 0 && (
                    <ChevronDown
                      size={14}
                      className={`text-gray-300 transition-transform ${expandedUser === u.clerk_id ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>
                
                <button
                  onClick={(e) => { e.stopPropagation(); deleteUser(u); }}
                  className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-all rounded-lg hover:bg-red-50"
                  title="Delete user and all data"
                >
                  <X size={16} />
                </button>
              </div>

              <AnimatePresence>
                {expandedUser === u.clerk_id && u.properties.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 pl-16 space-y-2">
                      {u.properties.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                          <Building2 size={14} className="text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-gray-700">{p.business_name}</span>
                            {p.subdomain && (
                              <span className="text-xs text-gray-400 ml-2">{p.subdomain}.esaystay.com</span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {p.business_type}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${planColors[p.plan] || planColors.starter}`}>
                            {p.plan}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Business Invites */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0E2A38]">Business invites</h2>
            <p className="text-xs text-gray-400 mt-0.5">Send invites to upgrade users to Business tier.</p>
          </div>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0E2A38] text-white rounded-lg text-sm font-medium hover:bg-[#1a3d4f] transition-colors"
          >
            <Plus size={14} />
            New invite
          </button>
        </div>

        {/* Invite Form */}
        <AnimatePresence>
          {showInviteForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 bg-gray-50/50 border-b border-gray-100 space-y-4">
                {inviteError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    <AlertCircle size={14} /> {inviteError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="operator@example.com"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Business name</label>
                    <input
                      type="text"
                      value={inviteBizName}
                      onChange={e => setInviteBizName(e.target.value)}
                      placeholder="HotelPro Management"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Max properties</label>
                    <input
                      type="number"
                      value={inviteMaxProps}
                      onChange={e => setInviteMaxProps(Number(e.target.value))}
                      min={1} max={100}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Max rooms per property</label>
                    <input
                      type="number"
                      value={inviteMaxRooms}
                      onChange={e => setInviteMaxRooms(Number(e.target.value))}
                      min={1} max={500}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowInviteForm(false)}
                    className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendInvite}
                    disabled={!inviteEmail.trim() || !inviteBizName.trim() || sending}
                    className="flex items-center gap-2 px-5 py-2 bg-[#0E2A38] text-white rounded-lg text-sm font-medium hover:bg-[#1a3d4f] transition-colors disabled:opacity-40"
                  >
                    <Send size={14} />
                    {sending ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invites List */}
        <div className="divide-y divide-gray-50">
          {invites.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">No invites sent yet.</div>
          )}
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center gap-4 px-5 py-4 group/invite">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                inv.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' :
                inv.status === 'expired' ? 'bg-gray-100 text-gray-400' :
                'bg-amber-50 text-amber-600'
              }`}>
                {inv.status === 'accepted' ? <CheckCircle2 size={14} /> :
                 inv.status === 'expired' ? <X size={14} /> :
                 <Clock size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{inv.email}</p>
                <p className="text-xs text-gray-400">{inv.business_name} &middot; {inv.max_properties} properties, {inv.max_rooms_per_property} rooms max</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                inv.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' :
                inv.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                'bg-amber-50 text-amber-600'
              }`}>
                {inv.status}
              </span>
              <div className="flex items-center gap-2">
                {inv.status === 'pending' && (
                  <button
                    onClick={() => copyToken(inv.token)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy invite token"
                  >
                    {copiedToken === inv.token ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {copiedToken === inv.token ? 'Copied' : 'Copy token'}
                  </button>
                )}
                <button
                  onClick={() => deleteInvite(inv.id, inv.email)}
                  className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/invite:opacity-100 transition-all rounded-lg hover:bg-red-50"
                  title="Delete invite"
                >
                  <X size={14} />
                </button>
              </div>
              <span className="text-xs text-gray-300">{new Date(inv.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
