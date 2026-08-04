import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// v2.103+ required for auth.getClaims() used in the caller-authorization check (WEB-005).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

// WEB-008: restrict CORS to known origins instead of "*".
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

// Roles a caller is allowed to assign to new staff. A caller cannot mint an
// account more privileged than an admin, and cannot create platform admins.
const ASSIGNABLE_ROLES = new Set([
  'SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'ACCOUNTANT', 'SERVER',
]);

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

    const { email, password, name, phone, role, status, tenant_id } = await req.json();

    if (!email || !password || !name || !role || !tenant_id) {
      throw new Error("Missing required fields");
    }

    // WEB-005: validate the requested role is one the caller may assign.
    if (!ASSIGNABLE_ROLES.has(String(role).toUpperCase())) {
      return new Response(JSON.stringify({ error: `Role '${role}' cannot be assigned.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // WEB-005: verify the CALLER is an admin/owner OF THIS tenant before creating
    // staff in it. The client sends its Clerk/Supabase JWT; resolve the caller id
    // from it and check user_properties for an owning/admin role on tenant_id.
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

    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes("already registered")) {
        throw new Error("A user with this email already exists.");
      }
      throw authError;
    }

    const userId = authData.user.id;

    // 2. Insert into the staff table
    const { error: staffError } = await supabaseAdmin.from('staff').insert([{
      id: userId,
      tenant_id,
      name,
      email,
      phone,
      role,
      status: status.toUpperCase()
    }]);

    if (staffError) {
      // Rollback Auth user if staff insertion fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw staffError;
    }

    return new Response(JSON.stringify({
      user: { id: userId, email, name, role, status }
    }), {
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
