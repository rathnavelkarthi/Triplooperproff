import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const DEFAULT_EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

// Normalize to digits only (Evolution expects country code + number, no +/spaces).
function normalizePhone(raw: string): string {
  return String(raw).replace(/\D/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  let tenant_id: string | undefined;
  let phone: string | undefined;
  let message_type: string | undefined;

  try {
    const body = await req.json();
    tenant_id = body.tenant_id;
    phone = body.phone;
    message_type = body.message_type;
    const message: string = body.message;

    if (!tenant_id || !phone || !message) {
      return json({ success: false, error: "Missing tenant_id, phone, or message" }, 400);
    }

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("evolution_api_url, evolution_instance_name, evolution_api_key, whatsapp_enabled")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      return json({ success: false, error: "Tenant not found" }, 400);
    }
    if (!tenant.evolution_instance_name) {
      return json({ success: false, reason: "WhatsApp not connected for this tenant" }, 400);
    }

    const apiUrl = (tenant.evolution_api_url || DEFAULT_EVOLUTION_API_URL).replace(/\/$/, "");
    const apiKey = tenant.evolution_api_key || DEFAULT_EVOLUTION_API_KEY;
    if (!apiUrl || !apiKey) {
      return json({ success: false, error: "Evolution API is not configured" }, 400);
    }

    const normalized = normalizePhone(phone);
    const res = await fetch(`${apiUrl}/message/sendText/${tenant.evolution_instance_name}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number: normalized, text: message }),
    });

    const resText = await res.text();
    let resData: any = null;
    try {
      resData = resText ? JSON.parse(resText) : null;
    } catch {
      resData = resText;
    }

    const sent = res.ok && !resData?.error;
    const errMsg = sent ? null : (resData?.message || resData?.error || JSON.stringify(resData) || `HTTP ${res.status}`);

    // Log the attempt (best-effort; do not fail the request if logging fails).
    await supabaseAdmin.from("whatsapp_scheduled_messages").insert([{
      tenant_id,
      phone: normalized,
      message_type: message_type || "manual",
      sent,
      error: errMsg,
    }]);

    if (!sent) {
      return json({ success: false, error: errMsg });
    }
    return json({ success: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    // Attempt to log a failed send if we have enough context.
    if (tenant_id && phone) {
      try {
        await supabaseAdmin.from("whatsapp_scheduled_messages").insert([{
          tenant_id,
          phone: normalizePhone(phone),
          message_type: message_type || "manual",
          sent: false,
          error: errMsg,
        }]);
      } catch { /* ignore */ }
    }
    return json({ success: false, error: errMsg }, 400);
  }
});
