import { useState, useEffect } from 'react';
import { useAuth, isPlatformAdminEmail } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendBusinessInvite, sendVerificationApproved, sendVerificationRejected, sendCustomEmail } from '../../lib/email';
import { getPropertySubscriptionDetails, PLAN_NAMES } from '../../lib/subscriptionUtils';
import { createAndSendCustomPaymentLink } from '../../lib/razorpay';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Building2, Briefcase, ChevronDown, ChevronRight,
  Send, Copy, Check, X, Search, Mail, Shield,
  Plus, AlertCircle, Clock, CheckCircle2,
  TrendingUp, Receipt, Printer, ExternalLink,
  BarChart3, CalendarDays, IndianRupee,
  ShieldCheck, ShieldAlert, ShieldQuestion, FileText, Loader2, Car, MapPin, Pencil
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
    verification_status?: string;
    subscription_expires_at?: string | null;
    grace_period_days?: number;
    manual_override?: boolean | null;
    subscription_status?: string;
    custom_monthly_price?: number | null;
    payment_link_url?: string | null;
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

const getVerificationBadge = (p: PlatformUser['properties'][0], docs: any[] = []) => {
  const hasTradeAuth = docs.some(d => d.doc_type === 'govt_trade_authorization');
  const hasCompliance = docs.some(d => d.doc_type === 'govt_compliance_proof');
  
  if (p.verification_status === 'approved') {
    return {
      text: 'Approved',
      bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      status: 'approved'
    };
  }
  if (p.verification_status === 'rejected') {
    return {
      text: 'Rejected',
      bgColor: 'bg-red-50 text-red-700 border-red-150',
      status: 'rejected'
    };
  }
  if (hasTradeAuth && hasCompliance) {
    return {
      text: 'Pending - Review Ready',
      bgColor: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
      status: 'review_ready'
    };
  }
  return {
    text: 'Pending - Uploads Missing',
    bgColor: 'bg-gray-100 text-gray-600 border-gray-200',
    status: 'uploads_missing'
  };
};

export default function PlatformAdmin() {
  const { user, isPlatformAdmin } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'bookings' | 'drivers'>('users');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driverDrawerData, setDriverDrawerData] = useState<any | null>(null);
  const [propertyDocs, setPropertyDocs] = useState<Record<string, any[]>>({});
  const [invites, setInvites] = useState<BusinessInvite[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<PropertyDrawerData | null>(null);
  const [drawerFilter, setDrawerFilter] = useState<'all' | 'today' | 'month'>('month');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBizName, setInviteBizName] = useState('');
  const [inviteMaxProps, setInviteMaxProps] = useState(5);
  const [inviteMaxRooms, setInviteMaxRooms] = useState(15);
  const [sending, setSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Property rejection form state
  const [rejectingBizId, setRejectingBizId] = useState<string | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);

  // Custom email states
  const [customEmailBizId, setCustomEmailBizId] = useState<string | null>(null);
  const [customEmailSubject, setCustomEmailSubject] = useState('');
  const [customEmailMessage, setCustomEmailMessage] = useState('');
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false);

  // Inline email editor states
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [tempEmail, setTempEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const handleSaveEmail = async (tenantId: string, newEmail: string) => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ custom_email: newEmail.trim() })
        .eq('id', tenantId);
      
      if (error) throw error;
      
      toast.success("Owner email updated successfully!");
      setEditingEmailId(null);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to update email: " + err.message);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSendCustomEmail = async (email: string, businessName: string, tenantId: string) => {
    if (!customEmailSubject.trim() || !customEmailMessage.trim()) {
      toast.error("Please fill in both subject and message.");
      return;
    }
    setSendingCustomEmail(true);
    try {
      const sent = await sendCustomEmail({
        email,
        subject: customEmailSubject.trim(),
        message: customEmailMessage.trim(),
        businessName
      });
      if (sent) {
        toast.success(`Custom email sent to ${email}`);
        setCustomEmailBizId(null);
        setCustomEmailSubject('');
        setCustomEmailMessage('');
      } else {
        toast.error("Failed to send email. Please check server log.");
      }
    } catch (err: any) {
      toast.error("Error sending email: " + err.message);
    } finally {
      setSendingCustomEmail(false);
    }
  };


  if (!isPlatformAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all business invites first for fallback email resolution
      const { data: inviteData } = await supabase
        .from('business_invites')
        .select('*')
        .order('created_at', { ascending: false });
      const loadedInvites = inviteData || [];
      setInvites(loadedInvites);

      // Load all reservations
      const { data: resList, error: resErr } = await supabase
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
        .select('id, business_name, business_type, subdomain, plan, is_active, owner_id, custom_email, created_at, verification_status, verification_reason, verified_at, subscription_plan, subscription_expires_at, grace_period_days, manual_override, custom_monthly_price, payment_link_url')
        .order('created_at', { ascending: false });

      // Load all property documents
      const { data: docList } = await supabase
        .from('property_documents')
        .select('*');
      const docsMap: Record<string, any[]> = {};
      if (docList) {
        for (const doc of docList) {
          if (!docsMap[doc.tenant_id]) {
            docsMap[doc.tenant_id] = [];
          }
          docsMap[doc.tenant_id].push(doc);
        }
      }
      setPropertyDocs(docsMap);

      // Load all user_properties to get owner links + emails via staff table
      const { data: links } = await supabase
        .from('user_properties')
        .select('user_id, tenant_id, role, is_owner');

      // Load staff table to map user_id -> email for Supabase users
      const { data: staffList } = await supabase
        .from('staff')
        .select('id, email, name');

      // Load subscriptions
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
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
          let email =
            staffEmailMap.get(link.user_id) ||
            tenant.custom_email ||
            link.user_id; // fallback: show the ID if nothing else

          if (email === link.user_id && loadedInvites) {
            const matchingInvite = loadedInvites.find(inv => 
              inv.business_name.toLowerCase() === tenant.business_name.toLowerCase()
            );
            if (matchingInvite) {
              email = matchingInvite.email;
            }
          }
            
          const name = staffNameMap.get(link.user_id);

           const tenantSub = subs ? subs.find(s => s.tenant_id === tenant.id) : null;
           const propPlan = tenantSub?.plan || tenant.subscription_plan || tenant.plan || 'starter';
           const propExpires = tenantSub?.expires_at || tenant.subscription_expires_at || null;
           const propGrace = tenantSub?.grace_period_days || tenant.grace_period_days || 3;
           const propOverride = tenantSub?.manual_override !== undefined && tenantSub?.manual_override !== null ? tenantSub.manual_override : tenant.manual_override;

           ensureUser(link.user_id, email, name, tenant.created_at);
           const stats = getTenantStats(tenant.id);
           userMap.get(link.user_id)!.properties.push({
             id: tenant.id,
             business_name: tenant.business_name,
             business_type: tenant.business_type,
             plan: propPlan,
             is_active: tenant.is_active,
             subdomain: tenant.subdomain,
             created_at: tenant.created_at,
             verification_status: tenant.verification_status,
             subscription_expires_at: propExpires,
             grace_period_days: propGrace,
             manual_override: propOverride,
             custom_monthly_price: tenantSub?.custom_monthly_price || tenant.custom_monthly_price || null,
             payment_link_url: tenant.payment_link_url || null,
             ...stats
           });
           
           if (tenantSub) {
             userMap.get(link.user_id)!.subscription = {
               plan: tenantSub.plan,
               status: tenantSub.status,
               expires_at: tenantSub.expires_at
             };
           }
         }
       }
 
       // Second pass: any tenants whose owner_id wasn't covered above
       if (tenants) {
         for (const t of tenants) {
           if (!t.owner_id) continue;
           const alreadyHas = userMap.get(t.owner_id)?.properties.find(p => p.id === t.id);
           if (!alreadyHas) {
             let email = staffEmailMap.get(t.owner_id) || t.custom_email || t.owner_id;
             if (email === t.owner_id && loadedInvites) {
               const matchingInvite = loadedInvites.find(inv => 
                 inv.business_name.toLowerCase() === t.business_name.toLowerCase()
               );
               if (matchingInvite) {
                 email = matchingInvite.email;
               }
             }
             const name = staffNameMap.get(t.owner_id);

             const tenantSub = subs ? subs.find(s => s.tenant_id === t.id) : null;
             const propPlan = tenantSub?.plan || t.subscription_plan || t.plan || 'starter';
             const propExpires = tenantSub?.expires_at || t.subscription_expires_at || null;
             const propGrace = tenantSub?.grace_period_days || t.grace_period_days || 3;
             const propOverride = tenantSub?.manual_override !== undefined && tenantSub?.manual_override !== null ? tenantSub.manual_override : t.manual_override;

             ensureUser(t.owner_id, email, name, t.created_at);
             const stats = getTenantStats(t.id);
             userMap.get(t.owner_id)!.properties.push({
               id: t.id,
               business_name: t.business_name,
               business_type: t.business_type,
               plan: propPlan,
               is_active: t.is_active,
               subdomain: t.subdomain,
               created_at: t.created_at,
               verification_status: t.verification_status,
               subscription_expires_at: propExpires,
               grace_period_days: propGrace,
               manual_override: propOverride,
               custom_monthly_price: tenantSub?.custom_monthly_price || t.custom_monthly_price || null,
               payment_link_url: t.payment_link_url || null,
               ...stats
             });
             
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

      setUsers(Array.from(userMap.values()));

      // Load all drivers
      const { data: driverList } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });
      setDrivers(driverList || []);

    } catch (err) {
      console.error('PlatformAdmin: load error', err);
    } finally {
      setVerifyingId(null);
      setLoading(false);
    }
  };

  const decideDriverVerification = async (driverId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ status: action })
        .eq('id', driverId);

      if (error) throw error;
      toast.success(`Driver partner profile marked as ${action}.`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update driver status.');
    }
  };

  const decidePropertyVerification = async (tenantId: string, action: 'approved' | 'rejected', reason?: string) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ 
          verification_status: action,
          verified_at: action === 'approved' ? new Date().toISOString() : null,
          verification_reason: reason || null
        })
        .eq('id', tenantId);

      if (error) throw error;

      // Trigger the edge function to update whatsapp/notify owner with correct action mapping ('approve' / 'reject')
      const mappedAction = action === 'approved' ? 'approve' : 'reject';
      const funcRes = await supabase.functions.invoke('verify-property', {
        body: { tenant_id: tenantId, action: mappedAction, reason, requester_email: user?.email }
      }).catch(err => {
        console.error('Failed to trigger verification function:', err);
        return null;
      });

      // Send the email client-side using Resend proxy on success
      if (funcRes && funcRes.data && funcRes.data.success) {
        const { ownerEmail, businessName } = funcRes.data;
        if (ownerEmail) {
          if (action === 'approved') {
            const sent = await sendVerificationApproved({
              email: ownerEmail,
              businessName,
              loginUrl: `${window.location.origin}/admin/login`
            });
            if (sent) toast.success(`Verification email sent to ${ownerEmail}`);
            else toast.warning('Property approved, but email notification failed.');
          } else {
            const sent = await sendVerificationRejected({
              email: ownerEmail,
              businessName,
              reason: reason || 'Submitted documents were invalid.',
              reuploadUrl: `${window.location.origin}/admin/verification`
            });
            if (sent) toast.success(`Rejection email sent to ${ownerEmail}`);
            else toast.warning('Property rejected, but email notification failed.');
          }
        }
      }

      toast.success(`Property marked as ${action}.`);
      await loadData();
      
      // Update drawer state if open
      if (drawerData && drawerData.property.id === tenantId) {
        setDrawerData({
          ...drawerData,
          property: {
            ...drawerData.property,
            verification_status: action
          }
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update property verification status.');
    }
  };

  const [sendingLinkFor, setSendingLinkFor] = useState<string | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState<Record<string, number>>({});

  const updatePropertySubscription = async (
    tenantId: string,
    updates: {
      plan?: string;
      subscription_expires_at?: string | null;
      manual_override?: boolean | null;
      grace_period_days?: number;
      custom_monthly_price?: number | null;
    }
  ) => {
    try {
      // Find property from current state
      const targetProperty = users.flatMap(u => u.properties).find(p => p.id === tenantId);
      const currentPlan = updates.plan || targetProperty?.plan || 'starter';
      const currentExpires = updates.subscription_expires_at !== undefined ? updates.subscription_expires_at : targetProperty?.subscription_expires_at;
      const currentOverride = updates.manual_override !== undefined ? updates.manual_override : targetProperty?.manual_override;
      const currentGrace = updates.grace_period_days !== undefined ? updates.grace_period_days : (targetProperty?.grace_period_days || 3);
      const currentCustomPrice = updates.custom_monthly_price !== undefined ? updates.custom_monthly_price : (targetProperty?.custom_monthly_price || null);

      const subInfo = getPropertySubscriptionDetails(currentPlan, currentExpires, currentOverride, currentGrace);

      const tenantPayload: Record<string, any> = {
        is_active: subInfo.isAccessAllowed,
        payment_setup: true,
      };

      if (updates.plan !== undefined) {
        tenantPayload.plan = updates.plan;
        tenantPayload.subscription_plan = updates.plan;
        if ((updates.plan === 'subscription_custom' || updates.plan === 'subscription') && !currentExpires && updates.subscription_expires_at === undefined) {
          const autoThirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          tenantPayload.subscription_expires_at = autoThirtyDays;
        }
      }
      if (updates.subscription_expires_at !== undefined) {
        tenantPayload.subscription_expires_at = updates.subscription_expires_at;
      }
      if (updates.manual_override !== undefined) {
        tenantPayload.manual_override = updates.manual_override;
      }
      if (updates.grace_period_days !== undefined) {
        tenantPayload.grace_period_days = updates.grace_period_days;
      }
      if (updates.custom_monthly_price !== undefined) {
        tenantPayload.custom_monthly_price = updates.custom_monthly_price;
      }

      const { error: tenantErr } = await supabase
        .from('tenants')
        .update(tenantPayload)
        .eq('id', tenantId);

      if (tenantErr) throw tenantErr;

      // Sync with subscriptions table
      const subPayload = {
        tenant_id: tenantId,
        plan: currentPlan,
        status: subInfo.status === 'manual_on' ? 'manual_on' : (subInfo.status === 'manual_off' ? 'manual_off' : subInfo.status),
        expires_at: currentExpires,
        manual_override: currentOverride,
        grace_period_days: currentGrace,
        custom_monthly_price: currentCustomPrice,
        updated_at: new Date().toISOString()
      };

      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existingSub) {
        await supabase.from('subscriptions').update(subPayload).eq('id', existingSub.id);
      } else {
        await supabase.from('subscriptions').insert(subPayload);
      }

      toast.success('Property subscription details updated!');
      await loadData();
    } catch (err: any) {
      toast.error('Failed to update subscription: ' + (err.message || err));
    }
  };

  const handleSendPaymentLink = async (tenantId: string, ownerEmail: string, businessName: string) => {
    const amount = customPriceInput[tenantId] !== undefined ? customPriceInput[tenantId] : 500;
    if (!ownerEmail || ownerEmail === 'N/A' || !ownerEmail.includes('@')) {
      toast.error('Valid owner email is required to send payment link.');
      return;
    }
    setSendingLinkFor(tenantId);
    try {
      const result = await createAndSendCustomPaymentLink(tenantId, ownerEmail, businessName, amount);
      if (result.success) {
        toast.success(`Payment link generated (₹${amount}) & sent to ${ownerEmail}!`);
        await loadData();
      } else {
        toast.error(result.error || 'Failed to generate payment link');
      }
    } catch (err: any) {
      toast.error('Error: ' + (err.message || err));
    } finally {
      setSendingLinkFor(null);
    }
  };

  const getDocSignedUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('property-documents')
      .createSignedUrl(filePath, 3600); // 1 hour link
    if (error) {
      toast.error("Failed to get document link: " + error.message);
      return null;
    }
    return data.signedUrl;
  };

  const downloadDoc = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .download(filePath);
      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || filePath.split('/').pop() || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Downloading ${fileName || 'document'}`);
    } catch (error: any) {
      toast.error("Failed to download document: " + error.message);
    }
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
        <button
          onClick={() => { setActiveTab('drivers'); setSearchQuery(''); }}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all ${
            activeTab === 'drivers'
              ? 'border-[#0E2A38] text-[#0E2A38]'
              : 'border-transparent text-gray-400 hover:text-gray-650'
          }`}
        >
          Driver Partners ({drivers.length})
        </button>
      </div>

      {activeTab === 'users' && (
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

                              {/* Subscription & Grace Period Control Panel */}
                              {(() => {
                                const subInfo = getPropertySubscriptionDetails(
                                  p.plan,
                                  p.subscription_expires_at,
                                  p.manual_override,
                                  p.grace_period_days || 3,
                                  p.is_active,
                                  p.created_at
                                );

                                const effectiveExpires = p.subscription_expires_at || subInfo.expiresAt;

                                return (
                                  <div className="bg-white p-3.5 rounded-lg border border-gray-100/80 text-xs space-y-3">
                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-[#0E2A38] uppercase tracking-wider text-[10px]">
                                          Subscription &amp; Grace Period Control
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${subInfo.badgeBg}`}>
                                          {subInfo.badgeText}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-semibold text-gray-500">
                                        {subInfo.statusLabel}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
                                       {/* 1. Subscription Plan Selection */}
                                       <div>
                                         <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">
                                           Subscription Type / Plan
                                         </label>
                                         <select
                                           value={p.plan === 'commission' ? 'commission' : 'subscription_custom'}
                                           onChange={(e) => updatePropertySubscription(p.id, { plan: e.target.value })}
                                           className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#0E2A38]"
                                         >
                                           <option value="subscription_custom">Subscribed Mode (Custom Monthly Price)</option>
                                           <option value="commission">12% Commission Only (Trial / PMS Mode)</option>
                                         </select>
                                       </div>

                                       {/* 2. Custom Rate & Send Payment Link */}
                                       <div>
                                         <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">
                                           Custom Price (₹/mo Tax-Inclusive)
                                         </label>
                                         <div className="flex items-center gap-1.5">
                                           <div className="relative flex-1">
                                             <span className="absolute left-2 top-1.5 text-xs text-gray-400 font-bold">₹</span>
                                             <input
                                               type="number"
                                               value={customPriceInput[p.id] !== undefined ? customPriceInput[p.id] : (p.custom_monthly_price || 500)}
                                               onChange={(e) => setCustomPriceInput({ ...customPriceInput, [p.id]: Number(e.target.value) })}
                                               placeholder="500"
                                               className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-5 pr-2 py-1 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#0E2A38]"
                                             />
                                           </div>
                                           <button
                                             onClick={() => handleSendPaymentLink(p.id, u.email, p.business_name)}
                                             disabled={sendingLinkFor === p.id || subInfo.isAccessAllowed}
                                             className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 border ${
                                               sendingLinkFor === p.id
                                                 ? 'bg-[#0E2A38] text-white opacity-50 cursor-not-allowed border-transparent'
                                                 : subInfo.isAccessAllowed
                                                 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-not-allowed opacity-90'
                                                 : 'bg-[#0E2A38] hover:bg-[#163a4d] text-white border-transparent cursor-pointer'
                                             }`}
                                             title={
                                               subInfo.isAccessAllowed
                                                 ? `Subscription is active (${subInfo.statusLabel}). Payment link button is turned off until subscription expires.`
                                                 : "Generate Razorpay payment link & email owner"
                                             }
                                           >
                                             {sendingLinkFor === p.id ? (
                                               <Loader2 size={11} className="animate-spin" />
                                             ) : subInfo.isAccessAllowed ? (
                                               <CheckCircle2 size={11} className="text-emerald-600" />
                                             ) : (
                                               <Send size={11} />
                                             )}
                                             {subInfo.isAccessAllowed ? 'Sub Active' : (p.payment_link_url ? 'Resend Link' : 'Send Link')}
                                           </button>
                                         </div>
                                       </div>

                                       {/* 3. Expiration Date (3-Day Grace Auto Applies) */}
                                       <div>
                                         <div className="flex items-center justify-between mb-1">
                                           <label className="block text-[9px] font-bold text-gray-400 uppercase">
                                             Expiration Date (+3-Day Grace)
                                           </label>
                                           {subInfo.daysRemaining !== null ? (
                                             <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                               {subInfo.daysRemaining}d left
                                             </span>
                                           ) : (
                                             <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 animate-pulse">
                                               No Expiry Date!
                                             </span>
                                           )}
                                         </div>
                                         <div className="flex items-center gap-1.5">
                                           <input
                                             type="date"
                                             value={effectiveExpires ? effectiveExpires.split('T')[0] : ''}
                                             onChange={(e) => {
                                               const dateVal = e.target.value ? new Date(e.target.value).toISOString() : null;
                                               updatePropertySubscription(p.id, { subscription_expires_at: dateVal, manual_override: null });
                                             }}
                                             className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0E2A38]"
                                           />
                                           <button
                                             onClick={() => {
                                               const current = new Date();
                                               const next30 = new Date(current.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
                                               updatePropertySubscription(p.id, { subscription_expires_at: next30, manual_override: null });
                                             }}
                                             className="px-2.5 py-1 bg-[#0E2A38] hover:bg-[#163a4d] text-white text-[10px] font-bold rounded cursor-pointer transition-all flex items-center gap-1"
                                             title="Set 30-Day Expiration Date & Auto-Calculate"
                                           >
                                             +30d
                                           </button>
                                         </div>
                                       </div>

                                       {/* 4. Manual Subscription Override Toggle */}
                                       <div>
                                         <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">
                                           Manual Override Toggle
                                         </label>
                                         <div className="flex items-center gap-1">
                                           <button
                                             onClick={() => updatePropertySubscription(p.id, { manual_override: true })}
                                             className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                               p.manual_override === true
                                                 ? 'bg-emerald-600 text-white shadow-sm'
                                                 : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                                             }`}
                                           >
                                             Turn ON
                                           </button>
                                           <button
                                             onClick={() => updatePropertySubscription(p.id, { manual_override: false })}
                                             className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                               p.manual_override === false
                                                 ? 'bg-red-600 text-white shadow-sm'
                                                 : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'
                                             }`}
                                           >
                                             Turn OFF
                                           </button>
                                           <button
                                             onClick={() => updatePropertySubscription(p.id, { manual_override: null })}
                                             className={`py-1 px-2 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                               p.manual_override === null || p.manual_override === undefined
                                                 ? 'bg-[#0E2A38] text-white shadow-sm'
                                                 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                             }`}
                                             title="Auto Expiration + 3-Day Grace Period"
                                           >
                                             Auto
                                           </button>
                                         </div>
                                       </div>
                                     </div>
                                  </div>
                                );
                              })()}

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

                              {/* Granular Verification & Documents Checklist */}
                              {(() => {
                                const pDocs = propertyDocs[p.id] || [];
                                const tradeAuth = pDocs.find(d => d.doc_type === 'govt_trade_authorization');
                                const complaintsProof = pDocs.find(d => d.doc_type === 'govt_complaints_proof');
                                const otherDoc = pDocs.find(d => d.doc_type === 'other');
                                const badge = getVerificationBadge(p, pDocs);

                                return (
                                  <div className="bg-white p-4 rounded-lg border border-gray-100/80 text-xs space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-[#0E2A38] uppercase tracking-wider text-[10px]">Verification &amp; Documents</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${badge.bgColor}`}>
                                          {badge.text}
                                        </span>
                                      </div>
                                      {p.verification_reason && p.verification_status === 'rejected' && (
                                        <span className="text-red-500 font-medium max-w-xs truncate text-[10px]" title={p.verification_reason}>
                                          Reason: {p.verification_reason}
                                        </span>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      {/* Trade Authorization */}
                                      <div className="p-3 bg-gray-50/50 rounded-lg border border-gray-100 flex flex-col justify-between space-y-2">
                                        <div>
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-700">Trade Authorization</span>
                                            {tradeAuth ? (
                                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase">Uploaded</span>
                                            ) : (
                                              <span className="text-[9px] font-bold text-red-650 bg-red-50 px-1.5 py-0.5 rounded-full uppercase">Missing</span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-gray-400 mt-1">Official operating trade license.</p>
                                          {tradeAuth && (
                                            <p className="text-[10px] text-gray-550 font-mono mt-1.5 truncate" title={tradeAuth.file_name}>
                                              {tradeAuth.file_name}
                                            </p>
                                          )}
                                        </div>
                                        {tradeAuth && (
                                          <div className="flex gap-2 pt-1 border-t border-gray-100/60 mt-1">
                                            <button
                                              onClick={async () => {
                                                const url = await getDocSignedUrl(tradeAuth.file_path);
                                                if (url) window.open(url, '_blank');
                                              }}
                                              className="flex-1 text-center py-1 bg-white border border-gray-200 text-gray-600 hover:text-[#0E2A38] hover:border-[#0E2A38]/30 rounded font-semibold text-[10px] transition-colors cursor-pointer"
                                            >
                                              View
                                            </button>
                                            <button
                                              onClick={() => downloadDoc(tradeAuth.file_path, tradeAuth.file_name || 'trade_license.pdf')}
                                              className="flex-1 text-center py-1 bg-white border border-gray-200 text-gray-600 hover:text-[#0E2A38] hover:border-[#0E2A38]/30 rounded font-semibold text-[10px] transition-colors cursor-pointer"
                                            >
                                              Download
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Complaints Proof */}
                                      <div className="p-3 bg-gray-50/50 rounded-lg border border-gray-100 flex flex-col justify-between space-y-2">
                                        <div>
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-700">Complaints Proof</span>
                                            {complaintsProof ? (
                                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase">Uploaded</span>
                                            ) : (
                                              <span className="text-[9px] font-bold text-red-655 bg-red-50 px-1.5 py-0.5 rounded-full uppercase">Missing</span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-gray-400 mt-1">No outstanding complaints proof.</p>
                                          {complaintsProof && (
                                            <p className="text-[10px] text-gray-550 font-mono mt-1.5 truncate" title={complaintsProof.file_name}>
                                              {complaintsProof.file_name}
                                            </p>
                                          )}
                                        </div>
                                        {complaintsProof && (
                                          <div className="flex gap-2 pt-1 border-t border-gray-100/60 mt-1">
                                            <button
                                              onClick={async () => {
                                                const url = await getDocSignedUrl(complaintsProof.file_path);
                                                if (url) window.open(url, '_blank');
                                              }}
                                              className="flex-1 text-center py-1 bg-white border border-gray-200 text-gray-600 hover:text-[#0E2A38] hover:border-[#0E2A38]/30 rounded font-semibold text-[10px] transition-colors cursor-pointer"
                                            >
                                              View
                                            </button>
                                            <button
                                              onClick={() => downloadDoc(complaintsProof.file_path, complaintsProof.file_name || 'complaints_proof.pdf')}
                                              className="flex-1 text-center py-1 bg-white border border-gray-200 text-gray-600 hover:text-[#0E2A38] hover:border-[#0E2A38]/30 rounded font-semibold text-[10px] transition-colors cursor-pointer"
                                            >
                                              Download
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Other document */}
                                      <div className="p-3 bg-gray-50/50 rounded-lg border border-gray-100 flex flex-col justify-between space-y-2">
                                        <div>
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-700">Other Supporting</span>
                                            {otherDoc ? (
                                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase">Uploaded</span>
                                            ) : (
                                              <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full uppercase">None</span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-gray-400 mt-1">Additional records / certificates.</p>
                                          {otherDoc && (
                                            <p className="text-[10px] text-gray-550 font-mono mt-1.5 truncate" title={otherDoc.file_name}>
                                              {otherDoc.file_name}
                                            </p>
                                          )}
                                        </div>
                                        {otherDoc && (
                                          <div className="flex gap-2 pt-1 border-t border-gray-100/60 mt-1">
                                            <button
                                              onClick={async () => {
                                                const url = await getDocSignedUrl(otherDoc.file_path);
                                                if (url) window.open(url, '_blank');
                                              }}
                                              className="flex-1 text-center py-1 bg-white border border-gray-200 text-gray-600 hover:text-[#0E2A38] hover:border-[#0E2A38]/30 rounded font-semibold text-[10px] transition-colors cursor-pointer"
                                            >
                                              View
                                            </button>
                                            <button
                                              onClick={() => downloadDoc(otherDoc.file_path, otherDoc.file_name || 'supporting_doc.pdf')}
                                              className="flex-1 text-center py-1 bg-white border border-gray-200 text-gray-600 hover:text-[#0E2A38] hover:border-[#0E2A38]/30 rounded font-semibold text-[10px] transition-colors cursor-pointer"
                                            >
                                              Download
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Action Buttons Bar */}
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50 items-center justify-between">
                                      <div className="flex gap-2">
                                        {p.verification_status !== 'approved' && (
                                          <button
                                            onClick={() => decidePropertyVerification(p.id, 'approved')}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm cursor-pointer"
                                          >
                                            <CheckCircle2 size={12} /> Approve Property
                                          </button>
                                        )}
                                        {p.verification_status !== 'approved' && (
                                          <button
                                            onClick={() => {
                                              setRejectingBizId(rejectingBizId === p.id ? null : p.id);
                                              setRejectReasonText('The uploaded documents are either unreadable, invalid, or do not match your government trade license registration. Please log in and upload a valid, clear scan of your trade authorization license.');
                                              setCustomEmailBizId(null);
                                            }}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                                              rejectingBizId === p.id 
                                                ? 'bg-red-50 text-red-700 border-red-200' 
                                                : 'bg-white text-red-650 border-red-200 hover:bg-red-55'
                                            }`}
                                          >
                                            <AlertCircle size={12} /> Reject &amp; Request Fix
                                          </button>
                                        )}
                                        <button
                                          onClick={() => {
                                            setCustomEmailBizId(customEmailBizId === p.id ? null : p.id);
                                            setCustomEmailSubject('Update regarding your Triplooper Property registration');
                                            setCustomEmailMessage(`Hi ${p.business_name} team,\n\nWe are reviewing your property registration on Triplooper.\n\n[Please enter your message here]\n\nRegards,\nTriplooper Support`);
                                            setRejectingBizId(null);
                                          }}
                                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                                            customEmailBizId === p.id 
                                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                              : 'bg-white text-blue-650 border-blue-200 hover:bg-blue-55'
                                          }`}
                                        >
                                          <Mail size={12} /> Send Email Notice
                                        </button>
                                      </div>
                                      
                                      <span className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                        Owner Contact: 
                                        {editingEmailId === p.id ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="email"
                                              className="px-2 py-0.5 text-[10px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                                              value={tempEmail}
                                              onChange={(e) => setTempEmail(e.target.value)}
                                              placeholder="Enter valid email"
                                              disabled={savingEmail}
                                              autoFocus
                                            />
                                            <button
                                              onClick={() => handleSaveEmail(p.id, tempEmail)}
                                              className="text-[10px] text-green-600 hover:text-green-700 font-bold px-1 py-0.5 rounded bg-green-50 border border-green-200"
                                              disabled={savingEmail}
                                            >
                                              {savingEmail ? '...' : 'Save'}
                                            </button>
                                            <button
                                              onClick={() => setEditingEmailId(null)}
                                              className="text-[10px] text-gray-550 hover:text-gray-600 px-1 py-0.5 rounded bg-gray-100 border border-gray-200"
                                              disabled={savingEmail}
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1">
                                            <span className={`font-semibold ${!u.email.includes('@') ? 'text-red-500 bg-red-50 px-1 rounded border border-red-100 animate-pulse' : 'text-gray-700'}`}>
                                              {u.email}
                                            </span>
                                            <button
                                              onClick={() => {
                                                setEditingEmailId(p.id);
                                                setTempEmail(u.email.includes('@') ? u.email : '');
                                              }}
                                              className="text-gray-400 hover:text-blue-600 transition-colors p-0.5 rounded hover:bg-gray-100"
                                              title="Edit Owner Email"
                                            >
                                              <Pencil size={11} />
                                            </button>
                                            {!u.email.includes('@') && (
                                              <span className="text-[9px] text-red-500 font-medium">
                                                (Invalid email! Please edit to send notices)
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </span>
                                    </div>

                                    {/* Inline Rejection Form */}
                                    {rejectingBizId === p.id && (
                                      <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-3 mt-2 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex items-center gap-2 text-red-700">
                                          <AlertCircle size={14} />
                                          <span className="font-bold text-[11px] uppercase tracking-wider">Reject &amp; Send Document Warning</span>
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-gray-450 uppercase mb-1">Rejection Email Message / Reason</label>
                                          <textarea
                                            value={rejectReasonText}
                                            onChange={(e) => setRejectReasonText(e.target.value)}
                                            rows={3}
                                            className="w-full border border-red-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-red-300"
                                            placeholder="Specify document issues..."
                                          />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                          <button
                                            onClick={() => { setRejectingBizId(null); setRejectReasonText(''); }}
                                            className="px-2.5 py-1 text-gray-500 hover:bg-gray-100 rounded font-bold text-[10px]"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={async () => {
                                              setSubmittingRejection(true);
                                              await decidePropertyVerification(p.id, 'rejected', rejectReasonText);
                                              setRejectingBizId(null);
                                              setRejectReasonText('');
                                              setSubmittingRejection(false);
                                            }}
                                            disabled={!rejectReasonText.trim() || submittingRejection}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] disabled:opacity-50"
                                          >
                                            {submittingRejection ? 'Rejecting...' : 'Reject & Send Email'}
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Inline Custom Email Form */}
                                    {customEmailBizId === p.id && (
                                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3 mt-2 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex items-center gap-2 text-blue-700">
                                          <Mail size={14} />
                                          <span className="font-bold text-[11px] uppercase tracking-wider">Compose Custom Email</span>
                                        </div>
                                        <div className="space-y-2">
                                          <div>
                                            <label className="block text-[9px] font-bold text-gray-450 uppercase mb-1">Subject</label>
                                            <input
                                              type="text"
                                              value={customEmailSubject}
                                              onChange={(e) => setCustomEmailSubject(e.target.value)}
                                              className="w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                                              placeholder="Email Subject..."
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[9px] font-bold text-gray-450 uppercase mb-1">Message Body</label>
                                            <textarea
                                              value={customEmailMessage}
                                              onChange={(e) => setCustomEmailMessage(e.target.value)}
                                              rows={4}
                                              className="w-full border border-blue-200 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 font-mono"
                                              placeholder="Write your email here..."
                                            />
                                          </div>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                          <button
                                            onClick={() => { setCustomEmailBizId(null); setCustomEmailSubject(''); setCustomEmailMessage(''); }}
                                            className="px-2.5 py-1 text-gray-500 hover:bg-gray-100 rounded font-bold text-[10px]"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleSendCustomEmail(u.email, p.business_name, p.id)}
                                            disabled={!customEmailSubject.trim() || !customEmailMessage.trim() || sendingCustomEmail}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px] disabled:opacity-50"
                                          >
                                            {sendingCustomEmail ? 'Sending...' : 'Send Custom Email'}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

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
      )}

      {activeTab === 'bookings' && (
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

      {activeTab === 'drivers' && (
        <>
          {/* Driver Registry Tab */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-[#0E2A38]">Driver Partners</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search drivers..."
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#0E2A38]/10 focus:border-[#0E2A38]/30 outline-none"
                />
              </div>
            </div>

            {drivers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No driver accounts registered on the platform.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase tracking-wider bg-gray-50/50">
                      <th className="px-4 py-3">Driver Profile</th>
                      <th className="px-4 py-3">Car Info</th>
                      <th className="px-4 py-3">License Info</th>
                      <th className="px-4 py-3">GPS Location</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers
                      .filter(d => 
                        (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (d.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (d.car_number || '').toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(d => {
                        const isApproved = d.status === 'approved';
                        const isRejected = d.status === 'rejected';
                        
                        return (
                          <tr 
                            key={d.id} 
                            onClick={() => setDriverDrawerData(d)}
                            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {d.car_photo && (
                                  <img 
                                    src={d.car_photo} 
                                    alt="Vehicle" 
                                    className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                                  />
                                )}
                                <div>
                                  <div className="font-bold text-gray-900 text-sm">{d.name}</div>
                                  <div className="text-xs text-gray-400 font-light">{d.email} &middot; {d.phone}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {d.car_number}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-500">
                              {d.license_info}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-650">
                              {d.latitude && d.longitude ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 font-mono font-bold text-[#0E2A38]">
                                    <MapPin size={12} className="text-emerald-500" />
                                    <span>{d.latitude.toFixed(5)}, {d.longitude.toFixed(5)}</span>
                                  </div>
                                  {d.location_updated_at && (
                                    <div className="text-[9px] text-gray-400">
                                      Updated {new Date(d.location_updated_at).toLocaleTimeString()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-300 italic">Offline / No GPS</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isApproved ? 'bg-emerald-50 text-emerald-600' :
                                isRejected ? 'bg-red-50 text-red-600' :
                                'bg-amber-50 text-amber-600'
                              }`}>
                                {d.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {d.status !== 'approved' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); decideDriverVerification(d.id, 'approved'); if (driverDrawerData?.id === d.id) setDriverDrawerData({...driverDrawerData, status: 'approved'}); }}
                                    className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                {d.status !== 'rejected' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); decideDriverVerification(d.id, 'rejected'); if (driverDrawerData?.id === d.id) setDriverDrawerData({...driverDrawerData, status: 'rejected'}); }}
                                    className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                )}
                              </div>
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

                    {/* Verification Status & Uploaded Documents */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-550 uppercase tracking-wider block">Verification Status</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 mt-1 rounded-full ${
                            drawerData.property.verification_status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                            drawerData.property.verification_status === 'rejected' ? 'bg-red-50 text-red-650' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {drawerData.property.verification_status || 'pending'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {drawerData.property.verification_status !== 'approved' && (
                            <button
                              onClick={() => decidePropertyVerification(drawerData.property.id, 'approved')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {drawerData.property.verification_status !== 'rejected' && (
                            <button
                              onClick={() => {
                                const reason = window.prompt("Enter rejection reason (optional):");
                                if (reason !== null) {
                                  decidePropertyVerification(drawerData.property.id, 'rejected', reason);
                                }
                              }}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Uploaded Documents */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-gray-550 uppercase tracking-wider block">Uploaded verification documents</span>
                        {(!propertyDocs[drawerData.property.id] || propertyDocs[drawerData.property.id].length === 0) ? (
                          <p className="text-xs text-gray-400 italic">No government trade authorization or other documents uploaded yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {propertyDocs[drawerData.property.id].map((doc: any) => (
                              <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-gray-150 rounded-xl text-xs">
                                <div className="flex items-center gap-2.5">
                                  <FileText size={16} className="text-gray-400" />
                                  <div>
                                    <p className="font-bold text-gray-800">{doc.file_name || 'Trade Authorization scan'}</p>
                                    <p className="text-[10px] text-gray-400">Uploaded on {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={async () => {
                                    const url = await getDocSignedUrl(doc.file_path);
                                    if (url) window.open(url, '_blank');
                                  }}
                                  className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-150 border border-gray-200 text-gray-700 hover:text-gray-900 rounded-lg font-bold transition-all cursor-pointer"
                                >
                                  View scan
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
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

        {driverDrawerData && (
          <>
            <motion.div key="driver-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDriverDrawerData(null)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
            <motion.div key="driver-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between p-6 border-b border-gray-100 bg-[#0E2A38] text-white">
                <div className="flex items-center gap-3">
                  <Car size={20} className="text-[#C9A646]" />
                  <div>
                    <h2 className="text-lg font-bold text-white">{driverDrawerData.name}</h2>
                    <p className="text-xs text-gray-300">Driver Partner Profile</p>
                  </div>
                </div>
                <button onClick={() => setDriverDrawerData(null)} className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Car Photo Display */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Uploaded Vehicle & Car Photo</label>
                  {driverDrawerData.car_photo ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                      <img 
                        src={driverDrawerData.car_photo} 
                        alt="Vehicle" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm">
                      <Car size={32} className="mb-2" />
                      <span>No vehicle photo uploaded</span>
                    </div>
                  )}
                </div>

                {/* Details Grid */}
                <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Driver Details & Documents</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-gray-450 block">Verification Status</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mt-1 rounded-full ${
                        driverDrawerData.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                        driverDrawerData.status === 'rejected' ? 'bg-red-50 text-red-650' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {driverDrawerData.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-450 block">Registration Date</span>
                      <span className="font-semibold text-gray-800 mt-1 block">
                        {new Date(driverDrawerData.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-455 block">Driving License Number</span>
                      <span className="font-mono font-bold text-gray-850 mt-1 block uppercase">{driverDrawerData.license_info || '—'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-455 block">Car License Plate</span>
                      <span className="font-bold text-gray-850 mt-1 block uppercase">{driverDrawerData.car_number || '—'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-455 block">Email Address</span>
                      <a href={`mailto:${driverDrawerData.email}`} className="font-semibold text-blue-500 hover:underline mt-1 block">{driverDrawerData.email}</a>
                    </div>
                    <div>
                      <span className="text-xs text-gray-455 block">Phone Number</span>
                      <a href={`tel:${driverDrawerData.phone}`} className="font-semibold text-gray-850 mt-1 block">{driverDrawerData.phone}</a>
                    </div>
                  </div>
                </div>

                {/* GPS Location Status */}
                <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">GPS Location (Live Browser Sync)</h3>
                  {driverDrawerData.latitude && driverDrawerData.longitude ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 font-mono font-bold text-[#0E2A38]">
                        <MapPin className="text-emerald-500" size={16} />
                        <span>{driverDrawerData.latitude.toFixed(6)}, {driverDrawerData.longitude.toFixed(6)}</span>
                      </div>
                      {driverDrawerData.location_updated_at && (
                        <p className="text-xs text-gray-400">
                          Last coordinates synced: {new Date(driverDrawerData.location_updated_at).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-400 italic">
                      <MapPin size={16} className="text-gray-300" />
                      <span>Offline / Browser GPS not shared yet</span>
                    </div>
                  )}
                </div>

                {/* Driver CMS & Pricing Profile */}
                <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Service Profile & CMS Details</h3>
                  
                  <div className="space-y-3.5 text-sm">
                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                      <div>
                        <span className="text-xs text-gray-455 block">Standard Hourly Rate</span>
                        <span className="font-bold text-gray-850 mt-1 block">
                          {driverDrawerData.payment_details?.hourly_rate ? `₹${driverDrawerData.payment_details.hourly_rate}/hr` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-455 block">Overtime Rate</span>
                        <span className="font-bold text-red-600 mt-1 block">
                          {driverDrawerData.payment_details?.overtime_rate ? `₹${driverDrawerData.payment_details.overtime_rate}/hr` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="border-b border-gray-100 pb-3 space-y-1">
                      <span className="text-xs text-gray-455 block">Payment & UPI ID</span>
                      <span className="font-semibold text-gray-800 block">UPI: {driverDrawerData.payment_details?.upi_id || '—'}</span>
                      {driverDrawerData.payment_details?.bank_name && (
                        <p className="text-xs text-gray-400">
                          {driverDrawerData.payment_details.bank_name} • A/C {driverDrawerData.payment_details.account_number} • IFSC {driverDrawerData.payment_details.ifsc_code}
                        </p>
                      )}
                    </div>

                    {/* Travel Locations */}
                    <div className="border-b border-gray-100 pb-3">
                      <span className="text-xs text-gray-455 block mb-1">Travel Locations</span>
                      <div className="flex flex-wrap gap-1">
                        {driverDrawerData.travel_locations && driverDrawerData.travel_locations.length > 0 ? (
                          driverDrawerData.travel_locations.map((loc: string) => (
                            <span key={loc} className="bg-gray-200/60 text-gray-700 px-2 py-0.5 rounded text-[11px] font-medium">
                              {loc}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">No travel locations registered</span>
                        )}
                      </div>
                    </div>

                    {/* Nearby Spots */}
                    <div className="border-b border-gray-100 pb-3">
                      <span className="text-xs text-gray-455 block mb-1">Nearby Spots Covered</span>
                      <div className="flex flex-wrap gap-1">
                        {driverDrawerData.nearby_spots && driverDrawerData.nearby_spots.length > 0 ? (
                          driverDrawerData.nearby_spots.map((spot: string) => (
                            <span key={spot} className="bg-gray-200/60 text-gray-700 px-2 py-0.5 rounded text-[11px] font-medium">
                              {spot}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">No spots registered</span>
                        )}
                      </div>
                    </div>

                    {/* Pickup & Drop services */}
                    <div>
                      <span className="text-xs text-gray-455 block mb-1">Pickup & Drop Services</span>
                      <div className="flex flex-wrap gap-1">
                        {driverDrawerData.pickup_drop_services && driverDrawerData.pickup_drop_services.length > 0 ? (
                          driverDrawerData.pickup_drop_services.map((service: string) => (
                            <span key={service} className="bg-gray-200/60 text-gray-700 px-2 py-0.5 rounded text-[11px] font-medium">
                              {service}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">No services registered</span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                {driverDrawerData.status !== 'approved' && (
                  <button
                    onClick={() => { decideDriverVerification(driverDrawerData.id, 'approved'); setDriverDrawerData({...driverDrawerData, status: 'approved'}); }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    Approve Partner
                  </button>
                )}
                {driverDrawerData.status !== 'rejected' && (
                  <button
                    onClick={() => { decideDriverVerification(driverDrawerData.id, 'rejected'); setDriverDrawerData({...driverDrawerData, status: 'rejected'}); }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <X size={16} />
                    Reject Partner
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
