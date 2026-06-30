import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform admins permitted to delete accounts. Mirrors PLATFORM_ADMIN_EMAILS in the client.
const PLATFORM_ADMIN_EMAILS = [
  'rathnavelkarthi1@gmail.com',
  'admin@triplooper.com',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, requester_email, tenant_ids } = await req.json();

    if (!user_id) {
      throw new Error("Missing required field: user_id");
    }

    // Authorization: only known platform admins may delete accounts.
    if (!requester_email || !PLATFORM_ADMIN_EMAILS.some(e => e.toLowerCase() === String(requester_email).toLowerCase())) {
      return new Response(JSON.stringify({ error: "Forbidden: requester is not a platform admin" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Server misconfigured: missing Supabase service credentials");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve the tenants owned by this user authoritatively (don't trust client list alone).
    const ownedTenantIds = new Set<string>(Array.isArray(tenant_ids) ? tenant_ids : []);

    const { data: ownerTenants } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('owner_id', user_id);
    for (const t of ownerTenants ?? []) ownedTenantIds.add(t.id);

    const { data: ownerLinks } = await supabaseAdmin
      .from('user_properties')
      .select('tenant_id')
      .eq('user_id', user_id)
      .eq('is_owner', true);
    for (const l of ownerLinks ?? []) ownedTenantIds.add(l.tenant_id);

    const tenantIdList = Array.from(ownedTenantIds);

    // Delete the user's property links first (no cascade from tenants to this row by user_id).
    const { error: linkErr } = await supabaseAdmin
      .from('user_properties')
      .delete()
      .eq('user_id', user_id);
    if (linkErr) throw new Error(`user_properties: ${linkErr.message}`);

    // Deleting tenants cascades to all tenant-scoped tables (staff, reservations, etc.)
    // via ON DELETE CASCADE on tenant_id.
    if (tenantIdList.length > 0) {
      const { error: tenantErr } = await supabaseAdmin
        .from('tenants')
        .delete()
        .in('id', tenantIdList);
      if (tenantErr) throw new Error(`tenants: ${tenantErr.message}`);
    }

    // Remove any business records owned by this user.
    const { error: bizErr } = await supabaseAdmin
      .from('businesses')
      .delete()
      .eq('owner_id', user_id);
    if (bizErr) throw new Error(`businesses: ${bizErr.message}`);

    // Finally, remove the Supabase Auth user so the email can't sign back in.
    // user_id may be a Clerk text id (not a Supabase Auth uuid); ignore "not found".
    try {
      await supabaseAdmin.auth.admin.deleteUser(user_id);
    } catch (_authErr) {
      // Non-fatal: the account may be Clerk-managed or already removed.
    }

    return new Response(JSON.stringify({
      success: true,
      deleted_tenants: tenantIdList.length,
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
