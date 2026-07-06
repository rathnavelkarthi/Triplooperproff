import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useUser, useClerk, useSignIn, useSignUp, useSession } from '@clerk/react';
import { supabase, supabaseAuth, setSupabaseTokenGetter } from '../lib/supabaseClient';
import { generateSubdomain, hasPermission as checkPermission, DEMO_EMAIL } from '../lib/booking';
import { Session } from '@supabase/supabase-js';

export type Role = 'SUPER_ADMIN' | 'MANAGER' | 'RECEPTION' | 'HOUSEKEEPING' | 'ACCOUNTANT' | 'SERVER' | 'BUSINESS_ADMIN' | 'PLATFORM_ADMIN';

export const PLATFORM_ADMIN_EMAILS = [
  'rathnavelkarthi1@gmail.com',
  'admin@triplooper.com'
];
export const PLATFORM_ADMIN_EMAIL = PLATFORM_ADMIN_EMAILS[0];

export const isPlatformAdminEmail = (email?: string | null) => {
  if (!email) return false;
  return PLATFORM_ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
};

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
  verification_status?: 'pending' | 'approved' | 'rejected';
  verification_reason?: string | null;
  verified_at?: string | null;
  phone?: string | null;
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
  const { session: clerkSession } = useSession();
  const clerk = useClerk();
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const signInLoaded = !!signIn && signInFetchStatus !== 'fetching';
  const signUpLoaded = !!signUp && signUpFetchStatus !== 'fetching';

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

  const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN';

  const buildUser = (id: string, email: string, name: string, role: Role, type: 'CLERK' | 'SUPABASE', avatarUrl?: string): User => {
    // Force PLATFORM_ADMIN role for configured platform-admin emails, regardless of
    // whatever role Supabase / staff / user_properties has for them. This prevents the
    // platform admin from being downgraded to RECEPTION/MANAGER/BUSINESS_ADMIN by stale rows.
    const effectiveRole: Role = isPlatformAdminEmail(email) ? 'PLATFORM_ADMIN' : role;
    return {
      id,
      name,
      email,
      role: effectiveRole,
      type,
      avatar: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0E2A38&color=fff`,
    };
  };

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
          const { data: lostInvite } = await supabase
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

        if (inviteToken || pendingName) {
          console.log('[AuthContext] Onboarding flow triggered. Invite:', inviteToken, 'Pending Name:', pendingName);
          
          let maxProperties = 5;
          let maxRooms = 15;
          let bName = pendingName || '';
          let bType = pendingType || 'hotel';
          
          if (inviteToken) {
            const { data: invite, error: inviteReadError } = await supabase
              .from('business_invites')
              .select('*')
              .eq('token', inviteToken)
              .single();

            if (!inviteReadError && invite && invite.status === 'pending') {
              bName = invite.business_name;
              maxProperties = invite.max_properties || 5;
              maxRooms = invite.max_rooms_per_property || 15;
            }
          }

          if (bName) {
            const subdomain = generateSubdomain(bName);

            // 1. Create Business Record (using standard client — RLS permits own business creation)
            const { data: newBusiness, error: bError } = await supabase
              .from('businesses')
              .insert({
                name: bName,
                owner_id: userId,
                contact_email: email,
                max_properties: maxProperties,
                max_rooms_per_property: maxRooms
              })
              .select('*')
              .single();

            if (bError) console.error('[AuthContext] Failed to create business:', bError);

            if (!bError && newBusiness) {
                // 2. Create First Tenant (Property) via security-definer RPC
                const { data: newTenantId, error: tError } = await supabase.rpc('create_tenant', {
                  p_owner_id: userId,
                  p_business_name: bName,
                  p_business_type: bType,
                  p_subdomain: subdomain
                });

                if (tError) console.error('[AuthContext] Failed to create tenant:', tError);

                if (!tError && newTenantId) {
                    // Update business links on the newly created tenant
                    // Set payment_setup = false so they are gated to billing selection page
                    await supabase.from('tenants').update({ 
                        business_id: newBusiness.id,
                        managed_by_business: true,
                        payment_setup: false
                    }).eq('id', newTenantId);
                    
                    // Accept invitation if applicable
                    if (inviteToken) {
                      await supabase.from('business_invites').update({ status: 'accepted' }).eq('token', inviteToken);
                    }
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
          // Use cache to avoid the query on every render
          if (supabaseIdCacheRef.current[email]) {
            lookupIds.push(supabaseIdCacheRef.current[email]);
          } else {
            // Query staff table by email to resolve Supabase auth user UUID
            const { data: staffRow } = await supabase
              .from('staff')
              .select('id')
              .eq('email', email.toLowerCase())
              .maybeSingle();
              
            if (staffRow) {
              supabaseIdCacheRef.current[email] = staffRow.id;
              lookupIds.push(staffRow.id);
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
              const { data: bData } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', businessId)
                .single();
              if (bData) setBusiness(bData as Business);
            } else if (role === 'SUPER_ADMIN' || role === 'BUSINESS_ADMIN') {
               const { data: bData } = await supabase
                .from('businesses')
                .select('*')
                .in('owner_id', lookupIds)
                .limit(1)
                .maybeSingle();
              if (bData) setBusiness(bData as Business);
            }

            setLoading(false);
            return;
          }
        }
      }

      // 2. Fallback for Owners (mostly Clerk users)
      if (type === 'CLERK') {
        const { data: fallback, error: fbError } = await supabase
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
          const { data: bData } = await supabase
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
    const isPlatAdmin = isPlatformAdminEmail(email);
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
    supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      setSupabaseSession(session);
    });

    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 1b. Register the Clerk session token with the Supabase client so RLS can
  // scope by the Clerk user id (auth.jwt() ->> 'sub'). See supabaseClient.ts.
  //
  // ⚠️ Staff accounts authenticate via Supabase Auth (signInWithPassword). The
  // supabase-js `accessToken` option takes precedence over the built-in session,
  // so we fall back to the Supabase session token when there is no Clerk session,
  // keeping staff login working until staff are migrated to Clerk or moved to a
  // dedicated client. See docs/CLERK-SUPABASE-SETUP.md.
  useEffect(() => {
    setSupabaseTokenGetter(async () => {
      if (clerkSession) {
        try {
          const t = await clerkSession.getToken();
          if (t) return t;
        } catch { /* fall through to supabase session */ }
      }
      return supabaseSession?.access_token ?? null;
    });
    return () => setSupabaseTokenGetter(null);
  }, [clerkSession, supabaseSession]);

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
      // Try Clerk first (for owners/managers) — Clerk v6 Signals API
      const signInReady = await waitForSignIn();
      if (signInReady && signInRef.current) {
        try {
          console.log('[AuthContext] Attempting Clerk login for:', email);
          // Step 1: seed the sign-in with the identifier
          const createRes = await signInRef.current.create({ identifier: email });
          if (createRes.error) throw createRes.error;
          // Step 2: submit the password
          const pwRes = await signInRef.current.password({ password });
          if (pwRes.error) throw pwRes.error;
          // Step 3: check status on the resource itself (Signals API)
          if (signInRef.current.status === 'complete') {
            console.log('[AuthContext] Clerk login successful');
            // finalize() converts the completed sign-in into an active session.
            // useUser will then re-fire → useEffect → loadProperties.
            const fin = await signInRef.current.finalize();
            if (fin.error) throw fin.error;
            return { error: null };
          }
          console.log('[AuthContext] Clerk login status:', signInRef.current.status);
        } catch (clerkErr: any) {
          console.error('[AuthContext] Clerk login error detail:', {
            status: clerkErr?.status,
            errors: clerkErr?.errors,
            message: clerkErr?.message,
          });
          console.log('[AuthContext] Clerk login failed, trying Supabase fallback...');
        }
      }

      // Fallback to Supabase (for staff)
      const { data, error: sError } = await supabaseAuth.auth.signInWithPassword({ email, password });
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

      // Clerk v6 Signals API — create() returns { error } only; status lives on the resource.
      const createRes = await signUpRef.current.create({
        emailAddress: email,
        password,
        unsafeMetadata: { businessName },
      });
      if (createRes.error) throw createRes.error;

      // After create, inspect the resource's status field.
      if (signUpRef.current.status === 'complete') {
        const clerkId = signUpRef.current.id;
        const fin = await signUpRef.current.finalize();
        if (fin.error) throw fin.error;
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

      if (signUpRef.current.status === 'missing_requirements') {
        // v6: verifications.sendEmailCode() replaces prepareEmailAddressVerification({strategy:'email_code'})
        const sendRes = await signUpRef.current.verifications.sendEmailCode();
        if (sendRes.error) throw sendRes.error;
        return { error: null, needsVerification: true };
      }

      return { error: 'Unexpected signup status.' };
    } catch (err: any) {
      return { error: err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Signup failed.' };
    }
  };

  const verifyEmail = async (
    code: string, businessName: string, _businessType: 'hotel' | 'restaurant' | 'combined'
  ): Promise<{ error: string | null }> => {
    try {
      const signUpReady = await waitForSignUp();
      if (!signUpReady || !signUpRef.current) return { error: 'Authentication service failed to load. Please refresh the page.' };

      // Clerk v6 Signals API — verifications.verifyEmailCode() replaces attemptEmailAddressVerification()
      const verifyRes = await signUpRef.current.verifications.verifyEmailCode({ code });
      if (verifyRes.error) throw verifyRes.error;

      if (signUpRef.current.status === 'complete') {
        const clerkId = signUpRef.current.id;
        const fin = await signUpRef.current.finalize();
        if (fin.error) throw fin.error;

        if (clerkId) {
          // Simply trigger loadProperties which now handles the unified onboarding
          // using the data stored in localStorage during Signup phase.
          await loadProperties(clerkId, signUpRef.current.emailAddress || '', businessName, 'CLERK');
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
        await supabaseAuth.auth.signOut();
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
    // Platform admin can access EVERYTHING — they don't need to be in the allowedRoles list.
    if (isPlatformAdmin) return true;
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
