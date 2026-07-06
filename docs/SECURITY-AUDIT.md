# Security Audit — Triplooper CRM (Ganesh-resedence)

**Date:** 2026-07-04 · **Auditor:** Claude Code (authorized owner review)
**Scope:** React 19 / Vite 6 SPA + Supabase + Clerk + Vercel functions
**Verdict:** 🔴 **CRITICAL — do not treat current deployment as secure. Rotate all keys today.**

---

## CRITICAL (fix immediately, in order)

### C1. Supabase `service_role` key shipped to the browser
- `.env.local`: `VITE_SUPABASE_SERVICE_ROLE_KEY=sb_secret_...`
- `src/lib/supabaseAdmin.ts` reads it via `import.meta.env` → **Vite inlines any `VITE_`‑prefixed var into the client bundle.**
- The `service_role` key **bypasses all RLS**. Anyone who opens the site can extract it from the JS bundle and gain full read/write/delete on the entire database (all tenants, all guests, all PII, all bookings).
- **Fix:** Remove `supabaseAdmin` from all client code. Move every admin operation (business creation, `auth.admin.listUsers`, invite acceptance in `AuthContext.loadProperties`) into Supabase Edge Functions that hold the key server‑side. Rename the var to drop `VITE_`. **Rotate the key now** — assume it is compromised.

### C2. Live secrets committed in plaintext
- `../credatials.txt` (repo root) and `.env.local` contain **real, live** credentials:
  - Supabase secret key + account password + access token (`sbp_...`)
  - Clerk **live** secret key (`sk_live_...`)
  - Resend API key (`re_...`)
  - GitHub Personal Access Token (`github_pat_...`)
- `credatials.txt` is **not** in `.gitignore` and sits outside the app dir — high risk of being committed/synced (it's already in a OneDrive folder).
- **Fix:** Delete `credatials.txt`. **Rotate every listed secret** (Supabase, Clerk, Resend, GitHub PAT, account password). Purge from git history if ever committed (`git filter-repo`). Store secrets only in Vercel/Supabase env settings, never in the repo.

### C3. RLS effectively disabled — no tenant isolation
- `src/sql/clerk_rls_bypass.sql` creates `FOR ALL USING (true)` policies on `businesses`, `user_properties`, `tenants`.
- Combined with the public anon key, **any anonymous visitor can read and write every tenant's rows.** Multi-tenant separation does not exist at the data layer.
- **Fix:** Replace `USING (true)` with tenant-scoped policies keyed off the authenticated user (Clerk JWT → Supabase via a verified claim, or a `request.jwt` check). Enforce isolation in the DB, not the client.

### C4. Authorization is client-side only
- `RoleGuard`, `hasPermission`, and `PLATFORM_ADMIN_EMAILS` (hardcoded in `AuthContext.tsx`) run entirely in the browser. With RLS at `true` (C3), the DB enforces nothing — a user can call Supabase directly with the anon key and bypass all role checks.
- **Fix:** Treat client role checks as UX only. Enforce every permission server-side (RLS policies + Edge Functions).

---

## HIGH

- **H1. Payment endpoints unauthenticated** — `src/lib/razorpay.ts` notes edge functions run `verify_jwt: false`; order creation/verification accept an anon `apikey` with no session. Anyone can create/verify orders. Require an authenticated JWT and validate `tenant_id` ownership server-side. Ensure Razorpay signature verification uses the server secret only.
- **H2. User enumeration + PII exposure** — `AuthContext.loadProperties` calls `supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })` client-side, pulling every user's email into the browser. Move to a server function that returns only the caller's own linkage.
- **H3. Clerk `sk_live_` in `.env.local`** — even without a `VITE_` prefix it must never live in the frontend project's env or `credatials.txt`. Keep Clerk secret only in server/Vercel env.

## MEDIUM

- **M1.** `console.log` of auth flow, emails, and Clerk IDs throughout `AuthContext` — strip debug logging from production builds.
- **M2.** `scratch/` and `tmp_create_users.js`, `test-apis.js`, `find_admin*.js` ship ad-hoc admin scripts and `leads_*.json` (customer PII). Remove from repo; keep lead data out of source control.
- **M3.** Silent fallback to `placeholder.supabase.co` / `placeholder-key` masks misconfiguration — fail loudly instead.
- **M4.** `.env.local` is git-ignored (`.env*`) — good — but verify it was never committed historically.

## Framework mapping (installed cybersecurity-skills)
- C1/C2 → OWASP A02 Cryptographic Failures / A05 Misconfiguration · CWE-798 Hardcoded Credentials · CWE-540 Info in Source
- C3/C4/H1 → OWASP A01 Broken Access Control · CWE-284 Improper Access Control
- H2 → OWASP API3 Excessive Data Exposure · CWE-359 PII Exposure

## Immediate action checklist
1. [ ] Rotate: Supabase keys + account password + access token, Clerk `sk_live`, Resend key, GitHub PAT.
2. [ ] Delete `credatials.txt`; scrub git history if committed.
3. [ ] Remove `supabaseAdmin`/service key from all client code; move to Edge Functions.
4. [ ] Replace `USING (true)` RLS with tenant-scoped policies.
5. [ ] Require JWT auth on payment + admin edge functions.
