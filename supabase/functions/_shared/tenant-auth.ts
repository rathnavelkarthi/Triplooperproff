// Shared caller-owns-tenant authorization for authenticated CRM edge functions.
// Mirrors the WEB-005 check used in create-staff: decode the caller's JWT, then
// confirm they own or administer the target tenant (or are a platform admin).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const PLATFORM_ADMIN_EMAILS = [
  "rathnavelkarthi1@gmail.com",
  "admin@triplooper.com",
];
const ADMIN_ROLES = new Set(["SUPER_ADMIN", "BUSINESS_ADMIN", "MANAGER"]);

function decodeJwt(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export interface AuthResult {
  ok: boolean;
  status: number;
  error?: string;
  callerId?: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseAdmin = ReturnType<typeof createClient>;

// Verify the bearer token belongs to an owner/admin of tenant_id.
export async function authorizeTenant(
  authHeader: string | null,
  tenantId: string,
  supabaseAdmin: SupabaseAdmin,
): Promise<AuthResult> {
  if (!authHeader) return { ok: false, status: 401, error: "Missing Authorization header" };

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const claims = decodeJwt(token);
  const callerId = claims?.sub as string | undefined;
  if (!callerId) return { ok: false, status: 401, error: "Invalid or expired token" };

  const callerEmail = (claims?.email || claims?.primary_email_address) as string | undefined;
  const isPlatformAdmin = !!callerEmail &&
    PLATFORM_ADMIN_EMAILS.some((e) => e.toLowerCase() === callerEmail.toLowerCase());

  const { data: callerLink } = await supabaseAdmin
    .from("user_properties").select("role, is_owner")
    .eq("user_id", callerId).eq("tenant_id", tenantId).maybeSingle();
  const { data: ownedTenant } = await supabaseAdmin
    .from("tenants").select("id").eq("id", tenantId).eq("owner_id", callerId).maybeSingle();
  const { data: tenantByEmail } = callerEmail ? await supabaseAdmin
    .from("tenants").select("id").eq("id", tenantId).eq("custom_email", callerEmail).maybeSingle() : { data: null };
  const { data: callerStaff } = await supabaseAdmin
    .from("staff").select("role")
    .eq("id", callerId).eq("tenant_id", tenantId).maybeSingle();

  const authorized = isPlatformAdmin || !!ownedTenant || !!tenantByEmail || callerLink?.is_owner ||
    (callerLink?.role && ADMIN_ROLES.has(String(callerLink.role).toUpperCase())) ||
    (callerStaff?.role && ADMIN_ROLES.has(String(callerStaff.role).toUpperCase()));

  if (!authorized) return { ok: false, status: 403, error: "Forbidden: not an admin of this tenant" };
  return { ok: true, status: 200, callerId };
}
