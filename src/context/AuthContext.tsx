import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useUser, useClerk, useSignIn, useSignUp } from '@clerk/react';
import { supabase } from '../lib/supabaseClient';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { generateSubdomain, hasPermission as checkPermission, DEMO_EMAIL } from '../lib/booking';
import { Session } from '@supabase/supabase-js';

export type Role = 'SUPER_ADMIN' | 'MANAGER' | 'RECEPTION' | 'HOUSEKEEPING' | 'ACCOUNTANT' | 'SERVER' | 'BUSINESS_ADMIN' | 'PLATFORM_ADMIN';

export const PLATFORM_ADMIN_EMAIL = 'rathnavelkarthi1@gmail.com';

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  contact_email: string | null;
  max_properties: number;
  max_rooms_per_property: number;
  is_active: boolean;
  created_at: string;
}

export type Tenant = {
  id: string;
  business_name: string;
  business_type: 'hotel' | 'restaurant' | 'combined';
  subdomain: string | null;
  template: string;
  plan: string;
  custom_email: string | null;
  logo_url: string | null;
  is_active: boolean;
  feature_toggles: Record<string, boolean> | null;
  business_id: string | null;
  managed_by_business: boolean;
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  type: 'CLERK' | 'SUPABASE';
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  properties: Tenant[];
  business: Business | null;
  isPlatformAdmin: boolean;
  session: { access_token: string } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, businessName: string, businessType: 'hotel' | 'restaurant' | 'combined') => Promise<{ error: string | null; needsVerification?: boolean }>;
  verifyEmail: (code: string, businessName: string, businessType: 'hotel' | 'restaurant' | 'combined') => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  switchProperty: (tenantId: string) => void;
  addProperty: (name: string, type: 'hotel' | 'restaurant' | 'combined') => Promise<{ error: string | null }>;
  hasPermission: (allowedRoles: Role[]) => boolean;
  refreshTenant: () => Promise<void>;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_PROPERTY_KEY = 'active_property_id';

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const clerk = useClerk();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [properties, setProperties] = useState<Tenant[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(() => localStorage.getItem('is_demo_mode') === 'true');

  const signInRef = useRef(signIn);
  const signUpRef = useRef(signUp);
  const signInLoadedRef = useRef(signInLoaded);
  const signUpLoadedRef = useRef(signUpLoaded);
  signInRef.current = signIn;
  signUpRef.current = signUp;
  signInLoadedRef.current = signInLoaded;
  signUpLoadedRef.current = signUpLoaded;

  const waitForSignIn = (timeoutMs = 10000): Promise<boolean> => {
    return new Promise((resolve) => {
      if (signInLoadedRef.current && signInRef.current) return resolve(true);
      const start = Date.now();
      const interval = setInterval(() => {
        if (signInLoadedRef.current && signInRef.current) { clearInterval(interval); resolve(true); }
        else if (Date.now() - start > timeoutMs) { clearInterval(interval); resolve(false); }
      }, 100);
    });
  };

  const waitForSignUp = (timeoutMs = 10000): Promise<boolean> => {
    return new Promise((resolve) => {
      if (signUpLoadedRef.current && signUpRef.current) return resolve(true);
      const start = Date.now();
      const interval = setInterval(() => {
        if (signUpLoadedRef.current && signUpRef.current) { clearInterval(interval); resolve(true); }
        else if (Date.now() - start > timeoutMs) { clearInterval(interval); resolve(false); }
      }, 100);
    });
  };

  // Prevent concurrent loadProperties calls (e.g. login + useEffect both firing)
  const loadingRef = useRef(false);
  // Cache the Supabase ID for a Clerk user's email to avoid repeated listUsers() calls
  const supabaseIdCacheRef = useRef<Record<string, string>>({});

  const isPlatformAdmin = user?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase();

  const buildUser = (id: string, email: string, name: string, role: Role, type: 'CLERK' | 'SUPABASE', avatarUrl?: string): User => ({
    id,
    name,
    email,
    role,
    type,
    avatar: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0E2A38&color=fff`,
  });

  const loadProperties = async (userId: string, email: string, name: string, type: 'CLERK' | 'SUPABASE', avatarUrl?: string) => {
    console.log(`[AuthContext] Loading properties for ${type} user: ${userId}`);
    
    // 0. Handle Pending Signups (Invitation flow)
    if (type === 'CLERK') {
      let inviteToken = localStorage.getItem('pending_invite_token');
      const pendingName = localStorage.getItem('pending_business_name');
      const pendingType = localStorage.getItem('pending_business_type') as Tenant['business_type'] | null;

      try {
        // Automatically recover lost invite token if the user has a pending invite for their email
        if (!inviteToken && email) {
          const { data: lostInvite } = await supabaseAdmin
            .from('business_invites')
            .select('token')
            .eq('email', email)
            .eq('status', 'pending')
            .maybeSingle();
            
          if (lostInvite) {
            inviteToken = lostInvite.token;
            localStorage.setItem('pending_invite_token', inviteToken);
          }
        }

        if (inviteToken) {
          console.log('[AuthContext] Unified onboarding for token:', inviteToken);
          const { data: invite, error: inviteReadError } = await supabaseAdmin
            .from('business_invites')
            .select('*')
            .eq('token', inviteToken)
            .single();

          if (!inviteReadError && invite && invite.status === 'pending') {
            const bName = invite.business_name;
            const bType = pendingType || 'hotel';
            const subdomain = generateSubdomain(bName);

            // 1. Create Business Record (using Admin client to bypass RLS)
            const { data: newBusiness, error: bError } = await supabaseAdmin
              .from('businesses')
              .insert({
                name: bName,
                owner_id: userId,
                contact_email: email,
                max_properties: invite.max_properties || 5,
                max_rooms_per_property: invite.max_rooms_per_property || 15
              })
              .select('*')
              .single();

            if (bError) console.error('[AuthContext] Failed to create business:', bError);

            if (!bError && newBusiness) {
                // 2. Create First Tenant (Property)
                const { data: newTenantId, error: tError } = await supabaseAdmin.rpc('create_tenant', {
                  p_owner_id: userId,
                  p_business_name: bName,
                  p_business_type: bType,
                  p_subdomain: subdomain
                });

                if (tError) console.error('[AuthContext] Failed to create tenant:', tError);

                if (!tError && newTenantId) {
                    await supabaseAdmin.from('tenants').update({ 
                        business_id: newBusiness.id,
                        managed_by_business: true 
                    }).eq('id', newTenantId);
                    
                    await supabaseAdmin.from('user_properties').insert({
                        user_id: userId,
                        tenant_id: newTenantId,
                        role: 'BUSINESS_ADMIN',
                        is_owner: true
                    });
                    
                    await supabaseAdmin.from('business_invites').update({ status: 'accepted' }).eq('token', inviteToken);
                    localStorage.removeItem('pending_invite_token');
                    localStorage.removeItem('pending_business_name');
                    localStorage.removeItem('pending_business_type');
                    
                    // Restart load sequence now that they are fully onboarded
                    await loadProperties(userId, email, name, 'CLERK', avatarUrl);
                    return;
                }
            }
          }
        }
      } catch (err) {
        console.error('[AuthContext] Onboarding critical failure:', err);
      }
    }

    try {
      // Concurrency guard: bail if already loading to prevent double-run
      if (loadingRef.current) {
        console.log('[AuthContext] loadProperties already running, skipping duplicate call');
        return;
      }
      loadingRef.current = true;

      let lookupIds = [userId];

      // If we are CLERK, also try to find their Supabase ID to link accounts
      // so they can access their existing data whether they login via Google or Email
      if (type === 'CLERK') {
        try {
          // Use cache to avoid the expensive listUsers() call on every render
          if (supabaseIdCacheRef.current[email]) {
            lookupIds.push(supabaseIdCacheRef.current[email]);
          } else {
            // Filter by email directly — much faster than fetching all users
            const { data: adminUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
            if (adminUsers?.users) {
              const supaUser = adminUsers.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
              if (supaUser) {
                supabaseIdCacheRef.current[email] = supaUser.id;
                lookupIds.push(supaUser.id);
              }
            }
          }
        } catch (e) {
          console.warn('[AuthContext] Failed to lookup Supabase user for Clerk linking', e);
        }
      }

      // 1. Try to find the tenant link in user_properties
      const { data: links, error: linkError } = await supabase
        .from('user_properties')
        .select('tenant_id, role, is_owner, user_id')
        .in('user_id', lookupIds);

      if (linkError) console.error('[AuthContext] Error fetching user_properties:', linkError);

      if (links && links.length > 0) {
        const tenantIds = links.map(l => l.tenant_id);
        const { data: tenantData, error: tError } = await supabase
          .from('tenants')
          .select('*')
          .in('id', tenantIds);

        if (tError) {
          console.error('[AuthContext] Error fetching tenants sequentially:', tError);
        }

        if (tenantData && tenantData.length > 0) {
          setProperties(tenantData as Tenant[]);
          const savedId = localStorage.getItem(ACTIVE_PROPERTY_KEY);
          const active = (savedId && tenantData.find(t => t.id === savedId)) || tenantData[0];

          if (active) {
            setTenant(active as Tenant);
            localStorage.setItem(ACTIVE_PROPERTY_KEY, active.id);
            const link = links.find(l => l.tenant_id === active.id);
            const role = (link?.role as Role) || 'RECEPTION';
            // Important: we use the original userId from Auth for the session state
            setUser(buildUser(userId, email, name, role, type, avatarUrl));

            const businessId = (active as Tenant).business_id;
            if (businessId) {
              const { data: bData } = await supabaseAdmin
                .from('businesses')
                .select('*')
                .eq('id', businessId)
                .single();
              if (bData) setBusiness(bData as Business);
            } else if (role === 'SUPER_ADMIN' || role === 'BUSINESS_ADMIN') {
               // Fallback: search by owner_id using any of their linked IDs
               const { data: bData } = await supabaseAdmin
                .from('businesses')
                .select('*')
                .in('owner_id', lookupIds)
                .limit(1)
                .single();
              if (bData) setBusiness(bData as Business);
            }

            setLoading(false);
            return;
          }
        }
      }

      // 2. Fallback for Owners (mostly Clerk users)
      if (type === 'CLERK') {
        const { data: fallback, error: fbError } = await supabaseAdmin
          .from('tenants').select('*').in('owner_id', lookupIds);

        if (fbError) {
          console.error('[AuthContext] Clerk fallback error:', fbError);
        }

        if (fallback && fallback.length > 0) {
          const tenants = fallback as Tenant[];
          setProperties(tenants);
          const active = tenants[0];
          setTenant(active);

          // Check if this Clerk user owns a Business record.
          // If yes → BUSINESS_ADMIN (invited business owner).
          // If no  → SUPER_ADMIN (standalone hotel owner who signed up directly).
          const { data: bData } = await supabaseAdmin
            .from('businesses')
            .select('*')
            .in('owner_id', lookupIds)
            .limit(1)
            .maybeSingle();

          const assignedRole: Role = bData ? 'BUSINESS_ADMIN' : 'SUPER_ADMIN';
          console.log(`[AuthContext] Clerk fallback – role assigned: ${assignedRole}`);
          setUser(buildUser(userId, email, name, assignedRole, 'CLERK', avatarUrl));
          if (bData) setBusiness(bData as Business);

          setLoading(false);
          return;
        }
      }

      // 3. Fallback for Staff (Supabase users)
      if (type === 'SUPABASE') {
        const { data: staffData, error: sError } = await supabase
          .from('staff')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (sError) {
          console.error('[AuthContext] Staff lookup error:', sError);
          throw sError;
        }

        if (staffData) {
          const { data: tenantData, error: stError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', staffData.tenant_id)
            .single();

          if (stError) {
             console.error('[AuthContext] Staff tenant lookup error:', stError);
             throw stError;
          }

          if (tenantData) {
            const staffTenant = tenantData as Tenant;
            setProperties([staffTenant]);
            setTenant(staffTenant);
            setUser(buildUser(userId, email, name, (staffData.role as Role) || 'RECEPTION', 'SUPABASE', avatarUrl));
            setLoading(false);
            return;
          }
        }
      }
    } catch (err: any) {
      console.error('[AuthContext] Critical failure in loadProperties:', err);
    } finally {
      // Always release the concurrency guard when done
      loadingRef.current = false;
    }
    
    // Fallback: If we reach here, the user successfully authenticated but has no tenant.
    // Give them a BUSINESS_ADMIN role with no tenant so they can be routed to the business creation page
    // instead of being bounced back to the login screen.
    const isPlatAdmin = email.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase();
    setUser(buildUser(userId, email, name, isPlatAdmin ? 'PLATFORM_ADMIN' : 'BUSINESS_ADMIN', type, avatarUrl));
    setProperties([]);
    setTenant(null);
    setLoading(false);
  };

  const refreshTenant = async () => {
    if (clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const name = clerkUser.fullName || email.split('@')[0];
      await loadProperties(clerkUser.id, email, name, 'CLERK', clerkUser.imageUrl);
    } else if (supabaseSession?.user) {
      const sUser = supabaseSession.user;
      const name = sUser.user_metadata?.full_name || sUser.email?.split('@')[0] || 'Staff';
      await loadProperties(sUser.id, sUser.email || '', name, 'SUPABASE');
    }
  };

  useEffect(() => {
    // 1. Supabase Auth Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // 2. Main Auth Resolution Logic
    if (isDemoMode) {
      const demoTenant: Tenant = {
        id: '00000000-0000-0000-0000-000000000777',
        business_name: 'Ocean View Demo Resort',
        business_type: 'combined',
        subdomain: 'demo-ocean-view',
        template: 'luxury',
        plan: 'enterprise',
        custom_email: DEMO_EMAIL,
        logo_url: null,
        is_active: true,
        feature_toggles: null,
        business_id: null,
        managed_by_business: false,
      };
      setTenant(demoTenant);
      setUser(buildUser('demo-user-123', DEMO_EMAIL, 'Demo Manager', 'SUPER_ADMIN', 'SUPABASE'));
      setProperties([demoTenant]);
      setLoading(false);
      return;
    }

    if (!userLoaded) return;

    // Handle Clerk User
    if (clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const name = clerkUser.fullName || email.split('@')[0];
      loadProperties(clerkUser.id, email, name, 'CLERK', clerkUser.imageUrl);
      return;
    }

    // Handle Supabase User
    if (supabaseSession?.user) {
      const sUser = supabaseSession.user;
      const name = sUser.user_metadata?.full_name || sUser.email?.split('@')[0] || 'Staff';
      loadProperties(sUser.id, sUser.email || '', name, 'SUPABASE');
      return;
    }

    // No user found
    setUser(null);
    setTenant(null);
    setProperties([]);
    setLoading(false);
  }, [clerkUser?.id, userLoaded, supabaseSession?.user?.id, isDemoMode]);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      // Only set loading if not already loading to avoid flicker loops
      if (!loadingRef.current) setLoading(true);
      // Try Clerk first (for owners/managers)
      const signInReady = await waitForSignIn();
      if (signInReady && signInRef.current) {
        try {
          console.log('[AuthContext] Attempting Clerk login for:', email);
          const result = await signInRef.current!.create({ identifier: email, password });
          if (result.status === 'complete') {
            console.log('[AuthContext] Clerk login successful');
            // setActive triggers clerkUser change → useEffect → loadProperties
            // Do NOT call setLoading(false) here; loadProperties will handle it
            await clerk.setActive({ session: result.createdSessionId });
            return { error: null };
          }
          console.log('[AuthContext] Clerk login status:', result.status);
        } catch (clerkErr: any) {
          console.error('[AuthContext] Clerk login error detail:', {
            status: clerkErr.status,
            errors: clerkErr.errors,
            message: clerkErr.message,
          });
          console.log('[AuthContext] Clerk login failed, trying Supabase fallback...');
        }
      }

      // Fallback to Supabase (for staff)
      const { data, error: sError } = await supabase.auth.signInWithPassword({ email, password });
      if (sError) {
        setLoading(false);
        return { error: sError.message };
      }
      
      if (data.session) {
        setSupabaseSession(data.session);
        // Do not setLoading(false) here, let loadProperties handle it after session sync
        return { error: null };
      }

      setLoading(false);
      return { error: 'Unknown authentication error.' };
    } catch (err: any) {
      setLoading(false);
      return { error: err.message || 'Login failed.' };
    }
  };

  const signup = async (
    email: string, password: string, businessName: string, businessType: 'hotel' | 'restaurant' | 'combined'
  ): Promise<{ error: string | null; needsVerification?: boolean }> => {
    try {
      const signUpReady = await waitForSignUp();
      if (!signUpReady || !signUpRef.current) return { error: 'Authentication service failed to load. Please refresh the page.' };

      const result = await signUpRef.current.create({
        emailAddress: email,
        password,
        unsafeMetadata: { businessName },
      });

      if (result?.status === 'complete') {
        const clerkId = result?.createdUserId;
        await clerk.setActive({ session: result.createdSessionId });
        if (clerkId) {
          const subdomain = generateSubdomain(businessName);
          const { error: tenantError } = await supabase.rpc('create_tenant', {
            p_owner_id: clerkId, p_business_name: businessName, p_business_type: businessType, p_subdomain: subdomain,
          });
          if (tenantError) {
            if (tenantError.message?.includes('tenants_subdomain_key')) {
              return { error: 'This business name is already taken. Please choose a different one.' };
            }
            return { error: tenantError.message };
          }
        }
        return { error: null };
      }

      if (result?.status === 'missing_requirements') {
        await signUpRef.current.prepareEmailAddressVerification({ strategy: 'email_code' });
        return { error: null, needsVerification: true };
      }

      return { error: 'Unexpected signup status.' };
    } catch (err: any) {
      return { error: err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Signup failed.' };
    }
  };

  const verifyEmail = async (
    code: string, businessName: string, businessType: 'hotel' | 'restaurant' | 'combined'
  ): Promise<{ error: string | null }> => {
    try {
      const signUpReady = await waitForSignUp();
      if (!signUpReady || !signUpRef.current) return { error: 'Authentication service failed to load. Please refresh the page.' };

      const result = await signUpRef.current.attemptEmailAddressVerification({ code });

      if (result?.status === 'complete') {
        const clerkId = result?.createdUserId;
        await clerk.setActive({ session: result.createdSessionId });

        if (clerkId) {
          // Simply trigger loadProperties which now handles the unified onboarding
          // using the data stored in localStorage during Signup phase.
          await loadProperties(clerkId, email, businessName, 'CLERK');
        }
        return { error: null };
      }

      return { error: 'Verification did not complete. Please check the code and try again.' };
    } catch (err: any) {
      const msg: string = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('redeemed')) {
        return { error: null };
      }
      return { error: msg || 'Verification failed.' };
    }
  };

  const logout = async () => {
    try {
      if (user?.type === 'CLERK') {
        await clerk.signOut();
      } else {
        await supabase.auth.signOut();
        setSupabaseSession(null);
      }
    } catch (e) {
      console.error('Error during sign out', e);
    }
    setIsDemoMode(false);
    localStorage.removeItem('is_demo_mode');
    setUser(null); setTenant(null); setProperties([]);
    localStorage.removeItem(ACTIVE_PROPERTY_KEY);
    localStorage.removeItem('crm_user');
  };

  const switchProperty = (tenantId: string) => {
    const target = properties.find(p => p.id === tenantId);
    if (!target) return;
    
    setTenant(target);
    localStorage.setItem(ACTIVE_PROPERTY_KEY, tenantId);
    
    const currentUserId = user?.id;
    if (currentUserId) {
      supabase.from('user_properties').select('role')
        .eq('user_id', currentUserId).eq('tenant_id', tenantId).single()
        .then(({ data }) => {
          if (data) setUser(prev => prev ? { ...prev, role: (data.role as Role) || 'RECEPTION' } : prev);
        });
    }
  };

  const addProperty = async (name: string, type: 'hotel' | 'restaurant' | 'combined'): Promise<{ error: string | null }> => {
    if (!user || user.type !== 'CLERK') return { error: 'Only property owners can add new properties.' };
    
    const subdomain = generateSubdomain(name);
    const { data: newTenantId, error } = await supabase.rpc('create_tenant', {
      p_owner_id: user.id, p_business_name: name, p_business_type: type, p_subdomain: subdomain,
    });
    
    if (error) {
      if (error.message?.includes('tenants_subdomain_key')) {
        return { error: 'This property name is already taken. Please try a different name.' };
      }
      return { error: error.message };
    }
    
    await refreshTenant();
    if (newTenantId) switchProperty(newTenantId);
    return { error: null };
  };

  const hasPermission = (allowedRoles: Role[]) => {
    // Platform admin can access everything
    if (isPlatformAdmin && allowedRoles.includes('PLATFORM_ADMIN')) return true;
    return checkPermission(user?.role ?? null, allowedRoles);
  };
  const session = user ? { access_token: isDemoMode ? 'demo-token' : 'active-session' } : null;

  const loginAsDemo = () => {
    setIsDemoMode(true);
    localStorage.setItem('is_demo_mode', 'true');
  };

  return (
    <AuthContext.Provider value={{
      user, tenant, properties, business, isPlatformAdmin, session, loading,
      login, signup, verifyEmail, logout, switchProperty, addProperty, hasPermission, refreshTenant,
      loginAsDemo,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
