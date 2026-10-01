import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

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

    const { staff_id, tenant_id, name, email, phone, role, status, password } = await req.json();

    if (!staff_id || !tenant_id) {
      throw new Error("Missing required fields: staff_id, tenant_id");
    }

    if (role && !ASSIGNABLE_ROLES.has(String(role).toUpperCase())) {
      return new Response(JSON.stringify({ error: `Role '${role}' cannot be assigned.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const claims = decodeJwt(token);
    const callerId = claims?.sub as string | undefined;
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Verify staff member exists in caller's tenant
    const { data: existingStaff, error: fetchErr } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('id', staff_id)
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (fetchErr || !existingStaff) {
      return new Response(JSON.stringify({ error: 'Staff member not found in this tenant' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 1. Update Auth user if email, password, name, or role are provided
    const authUpdates: Record<string, any> = {};
    if (password && String(password).trim().length > 0) {
      if (String(password).length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters long' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      authUpdates.password = String(password);
    }
    if (email && email.toLowerCase().trim() !== existingStaff.email.toLowerCase().trim()) {
      authUpdates.email = email.toLowerCase().trim();
      authUpdates.email_confirm = true;
    }
    if (name || role) {
      authUpdates.user_metadata = {
        ...(existingStaff.name ? { name: existingStaff.name } : {}),
        ...(name ? { name } : {}),
        ...(role ? { role: String(role).toUpperCase() } : {}),
      };
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(staff_id, authUpdates);
      if (authErr) {
        throw authErr;
      }
    }

    // 2. Update staff database table (allowed columns only — NEVER pass password)
    const staffUpdates: Record<string, any> = {};
    if (name !== undefined) staffUpdates.name = name;
    if (email !== undefined) staffUpdates.email = email.toLowerCase().trim();
    if (phone !== undefined) staffUpdates.phone = phone;
    if (role !== undefined) staffUpdates.role = String(role).toUpperCase();
    if (status !== undefined) staffUpdates.status = String(status).toUpperCase();

    if (Object.keys(staffUpdates).length > 0) {
      const { error: staffUpdateErr } = await supabaseAdmin
        .from('staff')
        .update(staffUpdates)
        .eq('id', staff_id)
        .eq('tenant_id', tenant_id);

      if (staffUpdateErr) {
        throw staffUpdateErr;
      }
    }

    const { data: updatedStaff } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('id', staff_id)
      .single();

    return new Response(JSON.stringify({
      user: updatedStaff || { id: staff_id, ...staffUpdates },
      success: true,
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
