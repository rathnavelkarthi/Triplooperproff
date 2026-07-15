import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Guest WhatsApp OTP gate. Two actions:
//   action:"request" -> generate a 6-digit code, WhatsApp it to the guest.
//   action:"verify"  -> check the code; on success return either the guest's
//                       stays (purpose:"my_stays") or "ok" (purpose:"portal").
//
// Security notes:
//   * The plaintext code is never returned to the browser — only its sha-256
//     hash is stored. The client sends the code back on verify.
//   * Codes expire in 5 min, max 5 verify attempts, then invalidated.
//   * For purpose:"portal" the recipient phone is derived server-side from the
//     portal token, so a caller cannot redirect the code to an arbitrary number.
//   * For purpose:"my_stays" the code goes to the phone the caller typed; if no
//     booking exists for it we still respond success (no user enumeration) but
//     send nothing.

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

const DEFAULT_EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const DEFAULT_EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_ACTIVE_PER_PHONE = 5; // rate limit: new requests per phone within TTL

let activeCors: Record<string, string> = {};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...activeCors, "Content-Type": "application/json" },
    status,
  });
}

function normalizePhone(raw: string): string {
  return String(raw).replace(/\D/g, "");
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function genCode(): string {
  // 6-digit, no leading-zero bias — 100000..999999.
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000;
  return String(n);
}

async function sendWhatsApp(
  admin: ReturnType<typeof createClient>,
  tenantId: string,
  phone: string,
  message: string,
): Promise<boolean> {
  const { data: tenant } = await admin
    .from("tenants")
    .select("evolution_api_url, evolution_instance_name, evolution_api_key")
    .eq("id", tenantId)
    .single();
  if (!tenant || !tenant.evolution_instance_name) return false;

  const apiUrl = (tenant.evolution_api_url || DEFAULT_EVOLUTION_API_URL).replace(/\/$/, "");
  const apiKey = tenant.evolution_api_key || DEFAULT_EVOLUTION_API_KEY;
  if (!apiUrl || !apiKey) return false;

  const normalized = normalizePhone(phone);
  const res = await fetch(`${apiUrl}/message/sendText/${tenant.evolution_instance_name}`, {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ number: normalized, text: message }),
  });
  const resText = await res.text();
  let resData: any = null;
  try { resData = resText ? JSON.parse(resText) : null; } catch { resData = resText; }
  const sent = res.ok && !resData?.error;

  await admin.from("whatsapp_scheduled_messages").insert([{
    tenant_id: tenantId,
    phone: normalized,
    message_type: "guest_otp",
    sent,
    error: sent ? null : (resData?.message || resData?.error || `HTTP ${res.status}`),
  }]);
  return sent;
}

serve(async (req) => {
  const corsHeaders = corsFor(req);
  activeCors = corsHeaders;
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const action: string = body.action;
    const purpose: string = body.purpose === "portal" ? "portal" : "my_stays";

    // ---------------- REQUEST ----------------
    if (action === "request") {
      let phone = normalizePhone(body.phone || "");
      let tenantId: string | undefined;
      const token: string | undefined = body.token;

      if (purpose === "portal") {
        if (!token) return json({ success: false, error: "Missing token" }, 400);
        const { data: rows } = await admin.rpc("guest_phone_for_token", { p_token: token });
        const row = rows?.[0];
        if (!row || !row.guest_phone) {
          // Don't reveal token validity; act as if sent.
          return json({ success: true });
        }
        phone = normalizePhone(row.guest_phone);
        tenantId = row.tenant_id;
      } else {
        if (phone.length < 6) return json({ success: false, error: "Enter a valid phone number" }, 400);
        // Find any tenant that has a booking for this phone — used to send via
        // that tenant's WhatsApp instance.
        const { data: stays } = await admin.rpc("guest_stays_for_phone", { p_phone: phone });
        const first = stays?.[0];
        if (!first) return json({ success: true }); // no enumeration
        tenantId = first.tenant_id;
      }

      // Rate limit: cap active codes per phone within the TTL window.
      const since = new Date(Date.now() - OTP_TTL_MS).toISOString();
      const { count } = await admin
        .from("guest_otps")
        .select("id", { count: "exact", head: true })
        .eq("phone", phone)
        .gt("created_at", since);
      if ((count ?? 0) >= MAX_ACTIVE_PER_PHONE) {
        return json({ success: false, error: "Too many requests. Try again in a few minutes." }, 429);
      }

      const code = genCode();
      const code_hash = await sha256(code);
      const expires_at = new Date(Date.now() + OTP_TTL_MS).toISOString();
      await admin.from("guest_otps").insert([{
        phone, code_hash, purpose, token: purpose === "portal" ? token : null, expires_at,
      }]);

      if (tenantId) {
        await sendWhatsApp(admin, tenantId, phone, `Your Triplooper verification code is ${code}. It expires in 5 minutes.`);
      }
      return json({ success: true });
    }

    // ---------------- VERIFY ----------------
    if (action === "verify") {
      const code: string = String(body.code || "").trim();
      const token: string | undefined = body.token;
      let phone = normalizePhone(body.phone || "");

      if (purpose === "portal") {
        if (!token) return json({ success: false, error: "Missing token" }, 400);
        const { data: rows } = await admin.rpc("guest_phone_for_token", { p_token: token });
        const row = rows?.[0];
        if (!row?.guest_phone) return json({ success: false, error: "Invalid link" }, 400);
        phone = normalizePhone(row.guest_phone);
      }
      if (!code || phone.length < 6) return json({ success: false, error: "Invalid request" }, 400);

      const nowIso = new Date().toISOString();
      let q = admin.from("guest_otps").select("*")
        .eq("phone", phone).eq("purpose", purpose)
        .is("consumed_at", null).gt("expires_at", nowIso)
        .order("created_at", { ascending: false }).limit(1);
      if (purpose === "portal") q = q.eq("token", token);
      const { data: otps } = await q;
      const otp = otps?.[0];
      if (!otp) return json({ success: false, error: "Code expired. Request a new one." }, 400);

      if (otp.attempts >= MAX_ATTEMPTS) {
        await admin.from("guest_otps").update({ consumed_at: nowIso }).eq("id", otp.id);
        return json({ success: false, error: "Too many attempts. Request a new code." }, 400);
      }

      const match = (await sha256(code)) === otp.code_hash;
      if (!match) {
        await admin.from("guest_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
        return json({ success: false, error: "Incorrect code." }, 400);
      }

      // Success — consume the code (single use).
      await admin.from("guest_otps").update({ consumed_at: nowIso }).eq("id", otp.id);

      if (purpose === "portal") {
        return json({ success: true });
      }

      // my_stays: enrich + return bookings.
      const { data: stays } = await admin.rpc("guest_stays_for_phone", { p_phone: phone });
      return json({ success: true, stays: stays || [] });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return json({ success: false, error: errMsg }, 400);
  }
});
