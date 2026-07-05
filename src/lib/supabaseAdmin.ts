import { createClient } from '@supabase/supabase-js';

// ⚠️ SECURITY FIX (WEB-001): the Supabase service_role key MUST NOT reach the
// browser. Any VITE_-prefixed var is inlined into the client bundle by Vite and
// is publicly downloadable — the live triplooper.com bundle was leaking it.
//
// This module NO LONGER reads VITE_SUPABASE_SERVICE_ROLE_KEY, so the key can
// never be bundled again. As a result this client is non-functional in the
// browser BY DESIGN (it runs with a placeholder key).
//
// ⚠️ MIGRATION REQUIRED BEFORE NEXT DEPLOY — the following call sites currently
// depend on the (removed) admin key and WILL break until migrated:
//   * src/context/AuthContext.tsx (signup onboarding, listUsers)
//   * src/pages/crm/business/BusinessDashboard.tsx
//   * src/pages/crm/business/BusinessPropertyCreate.tsx
//   * src/pages/crm/business/BusinessPropertyDetail.tsx
//   * src/pages/crm/PlatformAdmin.tsx
// Migrate each to either the regular `supabase` client (now that Clerk→Supabase
// RLS is wired — tenant policies authorize the logged-in user) or a server-side
// Edge Function. See docs/WEBAPP-PENTEST-REPORT.md (WEB-001) and
// docs/CLERK-SUPABASE-SETUP.md.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder-key';

// Intentionally constructed with a placeholder key — never the real service key.
export const supabaseAdmin = createClient(
    supabaseUrl || fallbackUrl,
    fallbackKey
);
