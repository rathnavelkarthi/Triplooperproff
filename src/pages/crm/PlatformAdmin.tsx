import { useState, useEffect } from 'react';
import { useAuth, isPlatformAdminEmail } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendBusinessInvite } from '../../lib/email';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Building2, Briefcase, ChevronDown, ChevronRight,
  Send, Copy, Check, X, Search, Mail, Shield,
  Plus, AlertCircle, Clock, CheckCircle2,
  TrendingUp, Receipt, Printer, ExternalLink,
  BarChart3, CalendarDays, IndianRupee
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
    dailyRevenue?: number;
    monthlyRevenue?: number;
    dailyCommission?: number;
    monthlyCommission?: number;
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

interface PropertyDrawerData {
  property: PlatformUser['properties'][0];
  ownerEmail: string;
  bookings: any[];
}

export default function PlatformAdmin() {
  const { user, isPlatformAdmin } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'bookings'>('users');
  const [invites, setInvites] = useState<BusinessInvite[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<PropertyDrawerData | null>(null);
  const [drawerFilter, setDrawerFilter] = useState<'all' | 'today' | 'month'>('month');

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
      // Load all reservations
      const { data: resList, error: resErr } = await supabaseAdmin
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (resErr) {
        console.error('Failed to load reservations:', resErr.message);
      }
      const loadedReservations = resList || [];
      setReservations(loadedReservations);

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

      const getTenantStats = (tenantId: string) => {
        const tenantRes = loadedReservations.filter((r: any) => r.tenant_id === tenantId && r.status !== 'Cancelled');
        
        // Swedish format output is exactly "YYYY-MM-DD"
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const currentMonthStr = todayStr.substring(0, 7); // "YYYY-MM"
        
        const dailyRes = tenantRes.filter((r: any) => r.check_in === todayStr || (r.created_at && r.created_at.startsWith(todayStr)));
        const dailyRevenue = dailyRes.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
        
        const monthlyRes = tenantRes.filter((r: any) => (r.check_in && r.check_in.startsWith(currentMonthStr)) || (r.created_at && r.created_at.startsWith(currentMonthStr)));
        const monthlyRevenue = monthlyRes.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
        
        return {
          dailyRevenue,
          monthlyRevenue,
          dailyCommission: dailyRevenue * 0.12,
          monthlyCommission: monthlyRevenue * 0.12
        };
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
           const stats = getTenantStats(tenant.id);
           userMap.get(link.user_id)!.properties.push({
             id: tenant.id,
             business_name: tenant.business_name,
             business_type: tenant.business_type,
             plan: tenant.plan || 'starter',
             is_active: tenant.is_active,
             subdomain: tenant.subdomain,
             created_at: tenant.created_at,
             ...stats
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
             const stats = getTenantStats(t.id);
             userMap.get(t.owner_id)!.properties.push({
               id: t.id,
               business_name: t.business_name,
               business_type: t.business_type,
               plan: t.plan || 'starter',
               is_active: t.is_active,
               subdomain: t.subdomain,
               created_at: t.created_at,
               ...stats
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
    if (isPlatformAdminEmail(u.email)) {
      toast.error("Cannot delete a platform admin account!");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${u.email} and all associated data? This will wipe properties, staff, and subscriptions.`)) {
      return;
    }

    setLoading(true);
    try {
      // Privileged cascade delete runs server-side in the delete-user edge function.
      // Deleting the tenant rows cascades to all tenant-scoped tables via ON DELETE CASCADE.
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          user_id: u.clerk_id,
          requester_email: user?.email,
          tenant_ids: u.properties.map(p => p.id),
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`User ${u.email} and related data deleted.`);
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
      let failedCount = 0;
      for (const u of users) {
        if (isPlatformAdminEmail(u.email)) continue;

        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: {
            user_id: u.clerk_id,
            requester_email: user?.email,
            tenant_ids: u.properties.map(p => p.id),
          },
        });

        if (error || data?.error) {
          failedCount++;
        } else {
          deletedCount++;
        }
      }

      if (failedCount > 0) {
        toast.warning(`Clean start: removed ${deletedCount} users, ${failedCount} failed.`);
      } else {
        toast.success(`Clean start complete. Removed ${deletedCount} users.`);
      }
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
        'Invite was saved, but the email could not be sent. Please check the email service configuration.'
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

  const openPropertyDrawer = (property: PlatformUser['properties'][0], ownerEmail: string) => {
    const bookings = reservations.filter(r => r.tenant_id === property.id);
    setDrawerData({ property, ownerEmail, bookings });
    setDrawerFilter('month');
  };

  const filteredDrawerBookings = () => {
    if (!drawerData) return [];
    const { bookings } = drawerData;
    if (drawerFilter === 'today') return bookings.filter(r => r.check_in === todayStr || (r.created_at && r.created_at.startsWith(todayStr)));
    if (drawerFilter === 'month') return bookings.filter(r => (r.check_in && r.check_in.startsWith(currentMonthStr)) || (r.created_at && r.created_at.startsWith(currentMonthStr)));
    return bookings;
  };

  const generatePrint = () => {
    if (!drawerData) return;
    const { property, ownerEmail } = drawerData;
    const printBookings = filteredDrawerBookings().filter(r => r.status !== 'Cancelled');
    const revenue = printBookings.reduce((s, r) => s + (r.amount || 0), 0);
    const commission = revenue * 0.12;
    const periodLabel = drawerFilter === 'today' ? `Today (${todayStr})` : drawerFilter === 'month' ? `Month of ${currentMonthStr}` : 'All Time';
    const rows = printBookings.map(r => `<tr><td style="font-family:monospace;font-size:10px">${(r.id||'').substring(0,12)}...</td><td>${r.guest||'—'}</td><td>${r.room||'—'}</td><td>${r.check_in||'—'}</td><td>${r.check_out||'—'}</td><td style="text-align:right">&#8377;${(r.amount||0).toLocaleString('en-IN')}</td><td style="text-align:right">&#8377;${((r.amount||0)*0.12).toLocaleString('en-IN')}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>Commission Invoice</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;padding:40px}.header{text-align:center;border-bottom:2px solid #0E2A38;padding-bottom:24px;margin-bottom:32px}.logo{font-size:22px;font-weight:900;color:#0E2A38}.logo span{color:#C9A646}h1{font-size:14px;font-weight:600;color:#666;margin-top:6px;text-transform:uppercase;letter-spacing:1px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}.meta-item label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;font-weight:600}.meta-item p{font-size:14px;font-weight:700;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px}th{background:#f5f5f5;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:#666}td{padding:10px 12px;border-bottom:1px solid #f0f0f0}.total-row{background:#0E2A38;color:white}.total-row td{padding:14px 12px;font-weight:700;font-size:14px}.commission-box{background:#fff8ed;border:1px solid #C9A646;border-radius:8px;padding:20px;margin-top:24px}.commission-box .label{font-size:11px;text-transform:uppercase;color:#9a6800;font-weight:600}.commission-box .amount{font-size:28px;font-weight:900;color:#7c4700;margin-top:6px}.footer{margin-top:40px;text-align:center;font-size:11px;color:#aaa}</style></head><body><div class="header"><div class="logo">Trip<span>Looper</span></div><h1>Partner Commission Invoice</h1></div><div class="meta"><div class="meta-item"><label>Property</label><p>${property.business_name}</p></div><div class="meta-item"><label>Owner Email</label><p>${ownerEmail}</p></div><div class="meta-item"><label>Billing Period</label><p>${periodLabel}</p></div><div class="meta-item"><label>Generated On</label><p>${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p></div></div><table><thead><tr><th>Booking ID</th><th>Guest</th><th>Room</th><th>Check In</th><th>Check Out</th><th style="text-align:right">Amount</th><th style="text-align:right">Commission (12%)</th></tr></thead><tbody>${rows}<tr class="total-row"><td colspan="5">Total (${printBookings.length} bookings)</td><td style="text-align:right">&#8377;${revenue.toLocaleString('en-IN')}</td><td style="text-align:right">&#8377;${commission.toLocaleString('en-IN')}</td></tr></tbody></table><div class="commission-box"><div class="label">Triplooper Commission Due (12%)</div><div class="amount">&#8377;${commission.toLocaleString('en-IN')}</div></div><div class="footer">Auto-generated commission statement by TripLooper PMS &middot; triplooper.com</div><script>window.onload=()=>window.print();<\/script></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.properties.some(p => p.business_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalProperties = users.reduce((sum, u) => sum + u.properties.length, 0);
  const activeBusinesses = invites.filter(i => i.status === 'accepted').length;
  const pendingInvites = invites.filter(i => i.status === 'pending').length;

  const activeBookings = reservations.filter(r => r.status !== 'Cancelled');
  const todayStr = new Date().toLocaleDateString('sv-SE');
  const currentMonthStr = todayStr.substring(0, 7);

  const dailyRes = activeBookings.filter(r => r.check_in === todayStr || (r.created_at && r.created_at.startsWith(todayStr)));
  const dailyRevenue = dailyRes.reduce((sum, r) => sum + (r.amount || 0), 0);

  const monthlyRes = activeBookings.filter(r => (r.check_in && r.check_in.startsWith(currentMonthStr)) || (r.created_at && r.created_at.startsWith(currentMonthStr)));
  const monthlyRevenue = monthlyRes.reduce((sum, r) => sum + (r.amount || 0), 0);

  const getTenantName = (tenantId: string) => {
    for (const u of users) {
      const p = u.properties.find(p => p.id === tenantId);
      if (p) return p.business_name;
    }
    return 'Unknown Property';
  };

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
    <>
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
        <p className="text-sm text-gray-400">All users, properties, and business invites across Trip Looper.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total properties', value: totalProperties, icon: Building2, color: 'text-blue-600 bg-blue-50' },
          { label: 'Platform Bookings', value: activeBookings.length, icon: Users, color: 'text-purple-600 bg-purple-50' },
          { label: "Today's Revenue", value: `₹${dailyRevenue.toLocaleString('en-IN')}`, icon: Briefcase, color: 'text-emerald-600 bg-emerald-50' },
          { label: "Monthly Commission (12%)", value: `₹${(monthlyRevenue * 0.12).toLocaleString('en-IN')}`, icon: Clock, color: 'text-amber-600 bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon size={16} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#0E2A38]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-4 border-b border-gray-100 pb-px">
        <button
          onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all ${
            activeTab === 'users'
              ? 'border-[#0E2A38] text-[#0E2A38]'
              : 'border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          Properties & Stays
        </button>
        <button
          onClick={() => { setActiveTab('bookings'); setSearchQuery(''); }}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all ${
            activeTab === 'bookings'
              ? 'border-[#0E2A38] text-[#0E2A38]'
              : 'border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          Partner Bookings Registry (12% Comm.)
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
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
                        <div className="px-5 pb-4 pl-16 space-y-3">
                          {u.properties.map(p => (
                            <div key={p.id} className="p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Building2 size={16} className="text-gray-400 shrink-0" />
                                  <span className="font-bold text-gray-800 text-sm">{p.business_name}</span>
                                  {p.subdomain && (
                                    <span className="text-xs text-gray-400 font-mono">({p.subdomain}.triplooper.com)</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                                    {p.business_type}
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${planColors[p.plan] || planColors.starter}`}>
                                    {p.plan}
                                  </span>
                                  <span className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                                  <button
                                    onClick={() => openPropertyDrawer(p, u.email)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-[#0E2A38] bg-white border border-[#0E2A38]/20 hover:bg-[#0E2A38] hover:text-white px-2.5 py-1 rounded-lg transition-colors"
                                  >
                                    <BarChart3 size={11} /> Revenue &amp; Bill
                                  </button>
                                </div>
                              </div>

                              {/* Daily / Monthly Revenue Breakdown */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3 rounded-lg border border-gray-100/80 text-xs">
                                <div>
                                  <span className="text-gray-400 block font-medium">Daily Revenue</span>
                                  <span className="font-extrabold text-gray-900 text-sm">₹{(p.dailyRevenue || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-medium">Daily Commission (12%)</span>
                                  <span className="font-extrabold text-amber-600 text-sm">₹{(p.dailyCommission || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-medium">Monthly Revenue</span>
                                  <span className="font-extrabold text-gray-900 text-sm">₹{(p.monthlyRevenue || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block font-medium">Monthly Commission (12%)</span>
                                  <span className="font-extrabold text-amber-600 text-sm">₹{(p.monthlyCommission || 0).toLocaleString('en-IN')}</span>
                                </div>
                              </div>
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
        </>
      ) : (
        <>
          {/* Bookings registry tab */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-[#0E2A38]">Global Booking & Commission Registry</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search guest or property..."
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
                />
              </div>
            </div>

            {/* List bookings */}
            {reservations.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No reservations found on the platform.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-gray-50/50">
                      <th className="px-4 py-3">Booking ID</th>
                      <th className="px-4 py-3">Property</th>
                      <th className="px-4 py-3">Guest / Room</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3 text-right">Commission (12%)</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations
                      .filter(r => 
                        r.guest?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        getTenantName(r.tenant_id).toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(res => {
                        const amount = res.amount || 0;
                        const commission = amount * 0.12;
                        const isCancelled = res.status === 'Cancelled';

                        return (
                          <tr key={res.id} className="border-b border-gray-55 hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                              {res.id.substring(0, 8)}...
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {getTenantName(res.tenant_id)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-900 font-medium">{res.guest}</div>
                              <div className="text-xs text-gray-400 font-light">{res.room}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-650 font-light">
                              {new Date(res.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(res.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="px-4 py-3 text-gray-900 font-medium">
                              {isCancelled ? <span className="line-through text-gray-300">₹{amount.toLocaleString('en-IN')}</span> : `₹${amount.toLocaleString('en-IN')}`}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[#0E2A38]">
                              {isCancelled ? <span className="text-gray-300 font-normal">Cancelled</span> : `₹${commission.toLocaleString('en-IN')}`}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                res.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                                res.status === 'Checked Out' ? 'bg-emerald-50 text-emerald-600' :
                                'bg-blue-50 text-blue-600'
                              }`}>
                                {res.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

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

      {/* Property Revenue Drawer */}
      <AnimatePresence>
        {drawerData && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerData(null)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
            <motion.div key="drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col">
              {/* Drawer Header */}
              <div className="flex items-start justify-between p-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 size={16} className="text-gray-400" />
                    <h2 className="text-lg font-bold text-[#0E2A38]">{drawerData.property.business_name}</h2>
                    <span className={`w-2 h-2 rounded-full ${drawerData.property.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                  </div>
                  <p className="text-xs text-gray-400">{drawerData.ownerEmail}</p>
                  {drawerData.property.subdomain && (
                    <a href={`https://${drawerData.property.subdomain}.triplooper.com`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1">
                      <ExternalLink size={11} />{drawerData.property.subdomain}.triplooper.com
                    </a>
                  )}
                </div>
                <button onClick={() => setDrawerData(null)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"><X size={18} /></button>
              </div>

              {/* Period Filter */}
              <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <CalendarDays size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Period:</span>
                {(['today', 'month', 'all'] as const).map(f => (
                  <button key={f} onClick={() => setDrawerFilter(f)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${drawerFilter === f ? 'bg-[#0E2A38] text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-[#0E2A38]/30'}`}>
                    {f === 'today' ? 'Today' : f === 'month' ? 'This Month' : 'All Time'}
                  </button>
                ))}
              </div>

              {/* Revenue Stats */}
              {(() => {
                const dBookings = filteredDrawerBookings();
                const dActive = dBookings.filter(r => r.status !== 'Cancelled');
                const dRevenue = dActive.reduce((s: number, r: any) => s + (r.amount || 0), 0);
                const dCommission = dRevenue * 0.12;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 p-6 border-b border-gray-100">
                      <div className="bg-[#0E2A38] text-white rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-10"><IndianRupee size={80} /></div>
                        <p className="text-xs text-white/50 uppercase tracking-widest font-semibold">Total Revenue</p>
                        <p className="text-2xl font-black mt-1">₹{dRevenue.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-white/40 mt-1">{dActive.length} active bookings</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-10"><Receipt size={80} className="text-amber-600" /></div>
                        <p className="text-xs text-amber-700/70 uppercase tracking-widest font-semibold">Commission (12%)</p>
                        <p className="text-2xl font-black text-amber-700 mt-1">₹{dCommission.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-amber-600/50 mt-1">Triplooper partner fee</p>
                      </div>
                    </div>

                    {/* Bookings List */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bookings</h3>
                        <span className="text-xs text-gray-400">{dBookings.length} total</span>
                      </div>
                      {dBookings.length === 0 ? (
                        <div className="text-center py-12 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">No bookings for this period.</div>
                      ) : dBookings.map((res: any) => {
                        const isCancelled = res.status === 'Cancelled'; const amount = res.amount || 0;
                        return (
                          <div key={res.id} className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs ${isCancelled ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-gray-200'} transition-colors`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-gray-900 truncate">{res.guest || 'Guest'}</span>
                                <span className={`font-bold ${isCancelled ? 'text-gray-300 line-through' : 'text-[#0E2A38]'}`}>₹{amount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex items-center gap-3 text-gray-400">
                                <span className="font-mono">{res.id?.substring(0, 8)}...</span>
                                <span>{res.room || '—'}</span>
                                <span>{res.check_in} → {res.check_out}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${isCancelled ? 'bg-red-50 text-red-500' : res.status === 'Checked Out' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{res.status}</span>
                              {!isCancelled && <span className="text-[9px] text-amber-600 font-bold">+₹{(amount * 0.12).toLocaleString('en-IN')} comm.</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Generate Invoice Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                      <button
                        onClick={generatePrint}
                        disabled={dActive.length === 0}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0E2A38] text-white font-bold rounded-xl hover:bg-[#1a3d4f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                      >
                        <Printer size={16} />
                        Generate Commission Invoice
                        {dActive.length > 0 && <span className="text-white/60 font-normal text-sm">— ₹{dCommission.toLocaleString('en-IN')}</span>}
                      </button>
                      <p className="text-center text-[10px] text-gray-400 mt-2">Opens a print-ready invoice for the selected period</p>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
