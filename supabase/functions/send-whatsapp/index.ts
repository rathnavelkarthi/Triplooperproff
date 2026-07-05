import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// WEB-008: restrict CORS to known origins instead of "*".
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ||
  "https://triplooper.com,https://www.triplooper.com")
  .split(",").map((s) => s.trim());

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

// ⚠️ WEB-005 (partial): this function is invoked by BOTH authenticated CRM staff
// (arbitrary recipient) AND the PUBLIC trip-planner lead flow (submitLead.ts),
// which sends to a live tenant's own WhatsApp. Because of the public path we do
// NOT require caller-owns-tenant here. Remaining abuse risk: an attacker can
// trigger messages via any tenant's Evolution instance to arbitrary numbers.
// RECOMMENDED follow-up (needs product decision — see WEBAPP-PENTEST-REPORT.md):
//   * Split into two functions: authenticated `send-whatsapp` (verify_jwt + caller
//     tenant check) and public `send-lead-whatsapp` (recipient constrained to the
//     tenant's own number + rate limited), OR
//   * Add per-tenant/per-IP rate limiting + recipient allowlist for the public path.

const DEFAULT_EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const DEFAULT_EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

// Set per-request in serve() so json() emits the correct CORS origin.
let activeCors: Record<string, string> = {};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...activeCors, "Content-Type": "application/json" },
    status,
  });
}

// Normalize to digits only (Evolution expects country code + number, no +/spaces).
function normalizePhone(raw: string): string {
  return String(raw).replace(/\D/g, "");
}

serve(async (req) => {
  const corsHeaders = corsFor(req);
  activeCors = corsHeaders;
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
