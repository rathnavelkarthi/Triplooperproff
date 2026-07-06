# Live Web App Audit — https://triplooper.com

**Methodology:** OWASP WSTG (skill: `performing-web-application-penetration-test`)
**Target:** Production site `https://triplooper.com` (Vercel-hosted SPA)
**Test type:** Black-box, unauthenticated, non-intrusive (response headers, TLS, public JS bundle inspection only — no exploitation, no auth testing against prod)
**Date:** 2026-07-04 · **Auditor:** Claude Code (authorized owner)

## Executive Summary
The live production site is **actively leaking two live secrets in its public JavaScript bundle right now** — the Supabase `service_role` key (bypasses all database security) and the Resend API key. These are downloadable by anyone with `curl`, no authentication required. This is a **confirmed, exploitable exposure**, not a theoretical one. TLS/HSTS are configured correctly, but response security headers are largely missing.

**Live findings:** Critical 1 · High 1 · Medium 3

---

## Finding: LIVE-001 — Supabase service_role secret + Resend key served in public bundle
**Severity:** 🔴 Critical (CVSS 9.8) · **WSTG-ATHZ / Sensitive Data Exposure**
**Evidence (reproducible, unauthenticated):**
```
$ curl -s https://triplooper.com/ | grep -oE '/assets/[^"]+\.js'
  /assets/index-Ct5O0qLS.js  /assets/vendor-core-B4WK9bfe.js  /assets/vendor-utils-XJ4xXBCI.js

$ curl -s https://triplooper.com/assets/index-Ct5O0qLS.js | grep -o 'sb_secret[A-Za-z0-9_-]*'
  sb_secret_REDACTED         ← Supabase SERVICE_ROLE secret

$ curl -s https://triplooper.com/assets/*.js | grep -o 're_[A-Za-z0-9_]\{20,\}'
  re_REDACTED              ← Resend API key
```
**Impact:** The `service_role` key bypasses Row-Level Security → full read/write/delete on the entire Supabase database (all tenants, all guest PII, bookings, staff, financials). The Resend key allows sending email as your domain. Both are valid on the live backend until rotated.
**Confirmed NOT leaked:** Clerk `sk_live_` secret (good). Anon `sb_publishable_` key is present, which is expected/normal for a client.
**Remediation (in order):**
1. **Rotate the Supabase service_role key and Resend key NOW** — assume compromised.
2. Remove `VITE_SUPABASE_SERVICE_ROLE_KEY` from the build env; stop constructing `supabaseAdmin` in client code (see repo fix in `src/lib/supabaseAdmin.ts`, WEB-001).
3. Redeploy so the new bundle contains no secret; enable RLS (`20260704000000_enable_rls.sql`).
4. Review Supabase logs for anomalous access using the leaked key.

---

## Finding: LIVE-002 — Missing security response headers
**Severity:** 🟠 High (CVSS 6.5 aggregate) · **WSTG-CONF / Security Headers**
**Evidence:** `curl -sSI https://triplooper.com` returned:
- ✅ `Strict-Transport-Security: max-age=63072000` (present)
- ❌ No `Content-Security-Policy` (XSS has full reach; no framing restriction on script origins)
- ❌ No `X-Frame-Options` / `frame-ancestors` → **clickjacking possible** (login/CRM can be iframed)
- ❌ No `X-Content-Type-Options: nosniff` → MIME sniffing
- ❌ No `Referrer-Policy`, no `Permissions-Policy`
- ⚠️ `Access-Control-Allow-Origin: *` on the HTML response
**Remediation:** Applied in repo (`vercel.json` `headers` block: CSP, XFO=DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS+preload). Redeploy to activate; then re-test and tune CSP for any blocked legitimate origins.

---

## Medium
- **LIVE-003 — Clickjacking (subset of LIVE-002).** Until `X-Frame-Options: DENY` / `frame-ancestors 'none'` ships, the CRM/login can be embedded and UI-redressed. Verify after redeploy: `curl -I https://triplooper.com | grep -i frame`.
- **LIVE-004 — Anon Supabase key + (currently) no RLS.** Even after secret rotation, the public anon key can read/write base tables until `20260704000000_enable_rls.sql` is applied on prod. This is the live manifestation of WEB-002. Highest priority after key rotation.
- **LIVE-005 — Source maps / verbose bundle.** Confirm `.map` files are not served in prod (`curl -I https://triplooper.com/assets/index-Ct5O0qLS.js.map`); they expose original source. Set `build.sourcemap: false` in `vite.config.ts` for prod if present.

## Not tested (out of scope without authorization/accounts)
Authentication brute-force, IDOR/authorization on live APIs, injection, and business-logic testing were **not** performed against production (would require test accounts and could affect real data/customers). Recommend these on a **staging** environment with seeded data per the skill's Steps 2–6.

## Post-remediation verification checklist
1. [ ] `curl -s https://triplooper.com/assets/*.js | grep sb_secret` → **no match**
2. [ ] `curl -s https://triplooper.com/assets/*.js | grep 're_'` → **no match**
3. [ ] `curl -I https://triplooper.com` shows CSP, X-Frame-Options, X-Content-Type-Options
4. [ ] Old service_role key rejected by Supabase (rotated)
5. [ ] RLS migration applied on staging → all screens verified → applied on prod
