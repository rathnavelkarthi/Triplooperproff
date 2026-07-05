import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Please check your .env file or build environment variables.');
}

// Provide a fallback URL to prevent createClient from throwing an Invalid URL error
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder-key';

// ------------------------------------------------------------
// Clerk → Supabase third-party auth (fixes WEB-002 / WEB-004).
//
// CRM users authenticate via Clerk. To let Supabase enforce RLS on their
// behalf, every request must carry the Clerk session JWT. Supabase-js calls
// this `accessToken` callback on each request; we read the current Clerk
// session token via a getter that AuthContext registers once Clerk loads.
//
// The Clerk session token's `sub` claim is the Clerk user id (TEXT), which
// matches user_properties.user_id and tenants.owner_id — so RLS policies can
// scope by `auth.jwt() ->> 'sub'` with no ID mapping.
//
// If no Clerk session (anonymous / public tenant site / guest portal), the
// callback returns null and Supabase falls back to the anon role — which,
// under deny-by-default RLS, can only reach data through SECURITY DEFINER RPCs.
//
// DASHBOARD SETUP REQUIRED (see docs/CLERK-SUPABASE-SETUP.md):
//   1. Clerk: enable the Supabase integration (adds the `role: authenticated`
//      claim to session tokens).
//   2. Supabase: Auth → Sign In / Providers → Third-Party Auth → add Clerk,
//      with your Clerk domain. Until BOTH are configured, tokens are rejected
//      and authenticated requests fail — configure on staging first.
// ------------------------------------------------------------

type TokenGetter = () => Promise<string | null> | string | null;

let clerkTokenGetter: TokenGetter | null = null;

/** Registered once by AuthContext after Clerk's session is available. */
export function setSupabaseTokenGetter(getter: TokenGetter | null) {
    clerkTokenGetter = getter;
}

export const supabase = createClient(
    supabaseUrl || fallbackUrl,
    supabaseAnonKey || fallbackKey,
    {
        accessToken: async () => {
            try {
                if (!clerkTokenGetter) return null;
                return (await clerkTokenGetter()) ?? null;
            } catch {
                return null;
            }
        },
    }
);

// ------------------------------------------------------------
// Staff auth client (fixes the `accessToken` / getSession conflict).
//
// supabase-js forbids ALL built-in auth methods (getSession,
// onAuthStateChange, signInWithPassword, signOut, signUp) on a client that
// was created with the `accessToken` option — that option hands token
// ownership to the external provider (Clerk) above.
//
// Staff accounts still authenticate via Supabase Auth, so they need those
// built-in methods. This second client has NO `accessToken` option and its
// own storage key, so it manages the staff session independently. The main
// `supabase` client's `accessToken` callback reads that staff session token
// (via AuthContext's getter fallback) so staff RLS queries keep working.
// ------------------------------------------------------------
export const supabaseAuth = createClient(
    supabaseUrl || fallbackUrl,
    supabaseAnonKey || fallbackKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: 'sb-staff-auth',
        },
    }
);
