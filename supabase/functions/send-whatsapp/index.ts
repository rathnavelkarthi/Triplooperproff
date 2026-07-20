import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// WEB-008: restrict CORS to known origins instead of "*".
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ||
  "https://triplooper.com,https://www.triplooper.com")
  .split(",").map((s) => s.trim());

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = 
    origin === "https://triplooper.com" ||
    origin === "https://www.triplooper.com" ||
    origin.endsWith(".triplooper.com") ||
    origin.startsWith("http://localhost:");
  const allow = isAllowed ? origin : "https://triplooper.com";
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
      .select("id, subdomain, evolution_api_url, evolution_instance_name, evolution_api_key, whatsapp_enabled")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      return json({ success: false, error: "Tenant not found" }, 400);
    }

    const apiUrl = (tenant.evolution_api_url || DEFAULT_EVOLUTION_API_URL).replace(/\/$/, "");
    const apiKey = tenant.evolution_api_key || DEFAULT_EVOLUTION_API_KEY;
    if (!apiUrl || !apiKey) {
      return json({ success: false, error: "Evolution API is not configured" }, 400);
    }

    // Instance name: prefer DB value; otherwise derive the same way whatsapp-connect does.
    // Derived fallback lets us self-heal when a tenant finished the QR scan on the
    // Evolution server but the DB row never got written (poll skipped / page closed).
    let instanceName = tenant.evolution_instance_name ||
      `${(tenant.subdomain || "tenant").replace(/[^a-z0-9]/gi, "")}-${String(tenant.id).slice(0, 8)}`
        .toLowerCase();

    // Verify the instance is actually connected on the server before sending.
    // If server says "open" but our DB was stale, heal the row so future calls are fast.
    const stateRes = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
      headers: { apikey: apiKey },
    });
    const stateData = stateRes.ok ? await stateRes.json().catch(() => null) : null;
    const connState = (stateData as any)?.instance?.state || (stateData as any)?.state;

    if (connState !== "open") {
      return json({ success: false, reason: "WhatsApp not connected for this tenant" }, 400);
    }

    if (!tenant.evolution_instance_name || !tenant.whatsapp_enabled) {
      await supabaseAdmin
        .from("tenants")
        .update({ evolution_instance_name: instanceName, whatsapp_enabled: true })
        .eq("id", tenant.id);
    }

    const normalized = normalizePhone(phone);
    const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
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
