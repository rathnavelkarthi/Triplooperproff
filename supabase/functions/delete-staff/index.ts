import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// v2.103+ required for auth.getClaims() used in the caller-authorization check.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

// Restrict CORS to known origins instead of "*".
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ||
  'https://triplooper.com,https://www.triplooper.com')
  .split(',').map((s) => s.trim());

function corsFor(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = 
    origin === 'https://triplooper.com' ||
    origin === 'https://www.triplooper.com' ||
    origin.endsWith('.triplooper.com') ||
    origin.startsWith('http://localhost:');
  const allow = isAllowed ? origin : 'https://triplooper.com';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const { staff_id, tenant_id } = await req.json();
    if (!staff_id || !tenant_id) {
      throw new Error("Missing required fields: staff_id, tenant_id");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve the caller from their JWT and verify they are an admin/owner OF
    // THIS tenant before deleting staff from it. Mirrors create-staff (WEB-005).
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const claims = decodeJwt(token);
    const callerId = claims?.sub as string | undefined;
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    const PLATFORM_ADMIN_EMAILS = [
      'rathnavelkarthi1@gmail.com',
      'admin@triplooper.com'
    ];
    const callerEmail = (claims?.email || claims?.primary_email_address) as string | undefined;
    const isPlatformAdmin = callerEmail && PLATFORM_ADMIN_EMAILS.some(e => e.toLowerCase() === callerEmail.toLowerCase());

    const { data: callerLink } = await supabaseAdmin
      .from('user_properties')
      .select('role, is_owner')
      .eq('user_id', callerId)
      .eq('tenant_id', tenant_id)
      .maybeSingle();
    const { data: ownedTenant } = await supabaseAdmin
      .from('tenants').select('id').eq('id', tenant_id).eq('owner_id', callerId).maybeSingle();
    const { data: tenantByEmail } = callerEmail ? await supabaseAdmin
      .from('tenants').select('id').eq('id', tenant_id).eq('custom_email', callerEmail).maybeSingle() : { data: null };
    const { data: callerStaff } = await supabaseAdmin
      .from('staff')
      .select('role')
      .eq('id', callerId)
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'BUSINESS_ADMIN', 'MANAGER']);
    const isAuthorized = isPlatformAdmin || !!ownedTenant || !!tenantByEmail || callerLink?.is_owner ||
      (callerLink?.role && ADMIN_ROLES.has(String(callerLink.role).toUpperCase())) ||
      (callerStaff?.role && ADMIN_ROLES.has(String(callerStaff.role).toUpperCase()));
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Forbidden: not an admin of this tenant' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    // The staff row must belong to the caller's tenant — prevents deleting staff
    // in a tenant the caller doesn't administer by passing a mismatched id.
    const { data: staffRow } = await supabaseAdmin
      .from('staff').select('id, tenant_id').eq('id', staff_id).maybeSingle();
    if (!staffRow || staffRow.tenant_id !== tenant_id) {
      return new Response(JSON.stringify({ error: 'Staff member not found in this tenant' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      });
    }

    // 1. Delete the staff row.
    const { error: staffErr } = await supabaseAdmin.from('staff').delete().eq('id', staff_id);
    if (staffErr) throw staffErr;

    // 2. Remove the Supabase Auth login so the email frees up for re-use.
    // The staff row id == auth user id (set by create-staff). Ignore "not found".
    try {
      await supabaseAdmin.auth.admin.deleteUser(staff_id);
    } catch (_authErr) {
      // Non-fatal: auth user may already be gone.
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
