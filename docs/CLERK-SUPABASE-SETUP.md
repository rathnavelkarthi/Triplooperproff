# Clerk → Supabase Third-Party Auth Setup

This wires Clerk session tokens into Supabase so **RLS can enforce tenant isolation**
(fixes WEB-002 / WEB-004). The code side is done; these **dashboard steps are required**
and only you can do them. **Do it on a STAGING Supabase project first.**

## Why
The CRM authenticates users with Clerk, so Supabase previously saw every request as
anonymous — RLS could not identify the user, which is why the app ran with RLS off and
a leaked service_role key. With third-party auth, the Clerk JWT's `sub` claim (the Clerk
user id) reaches Postgres as `auth.jwt() ->> 'sub'`, matching `user_properties.user_id`
and `tenants.owner_id`.

## Step 1 — Clerk dashboard
1. Clerk Dashboard → **Configure → Integrations** (or **Sessions → Customize session token**).
2. Enable the **Supabase** integration. This adds `"role": "authenticated"` to session tokens.
   (Clerk's native Supabase integration; no manual JWT template needed on current Clerk.)

## Step 2 — Supabase dashboard
1. Supabase → **Authentication → Sign In / Providers → Third-Party Auth**.
2. **Add provider → Clerk**. Enter your Clerk domain (e.g. `clerk.triplooper.com`).
3. Save. Supabase will now accept Clerk-issued JWTs for the `authenticated` role.

## Step 3 — Environment
- The client already sends the token via the `accessToken` callback in
  `src/lib/supabaseClient.ts` (registered by `AuthContext`). No new env vars.
- Ensure `VITE_SUPABASE_SERVICE_ROLE_KEY` is **removed** from the build env (WEB-001).

## Step 4 — Apply RLS policies
Apply `supabase/migrations/20260704000000_enable_rls.sql` on **staging**, then verify every
screen. It enables RLS and adds tenant-scoped policies keyed on the Clerk `sub` claim.

## ⚠️ Staff accounts (Supabase Auth) — known interaction
`supabase-js`'s `accessToken` option **overrides the built-in Supabase session**. Staff log in
with `supabase.auth.signInWithPassword`. The token getter in `AuthContext` falls back to the
Supabase session token when there is no Clerk session, so staff login keeps working — but their
JWT `sub` is a Supabase UUID, and `staff.id` already stores that UUID, so staff policies below
use the same `sub` claim. **Test staff login explicitly on staging.**

Longer term, pick one:
- Migrate staff to Clerk (single identity provider), or
- Give staff auth its own Supabase client instance separate from the Clerk-token client.

## Verification (staging)
1. Log in as an owner → confirm CRM loads their tenant's data only.
2. Log in as staff → confirm staff screens work.
3. Open the public tenant site + guest portal (anonymous) → confirm they still load
   (these go through SECURITY DEFINER RPCs).
4. With only the anon key (no token), `curl` the REST API for `guests`/`reservations`
   → must return **empty/401**, not data.
