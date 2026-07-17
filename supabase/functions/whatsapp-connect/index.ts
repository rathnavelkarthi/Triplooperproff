import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ||
  "https://triplooper.com,https://www.triplooper.com")
  .split(",").map((s) => s.trim());

function corsFor(req: Request) {
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

// Shared Evolution server credentials live server-side only (never shipped in the frontend bundle).
const DEFAULT_EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const DEFAULT_EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

let activeCors: Record<string, string> = {};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...activeCors, "Content-Type": "application/json" },
    status,
  });
}

async function evolution(
  baseUrl: string,
  apiKey: string,
  path: string,
  method: "GET" | "POST" | "DELETE",
  body?: unknown,
) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

serve(async (req) => {
  const corsHeaders = corsFor(req);
  activeCors = corsHeaders;
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tenant_id, action } = await req.json();
    if (!tenant_id || !action) {
      throw new Error("Missing tenant_id or action");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, subdomain, evolution_api_url, evolution_instance_name, evolution_api_key")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      throw new Error("Tenant not found");
    }

    const apiUrl = tenant.evolution_api_url || DEFAULT_EVOLUTION_API_URL;
    const apiKey = tenant.evolution_api_key || DEFAULT_EVOLUTION_API_KEY;
    if (!apiUrl || !apiKey) {
      throw new Error("Evolution API is not configured");
    }

    // Stable per-tenant instance name derived from subdomain + id fragment (lowercased for Evolution API compatibility).
    const instanceName =
      (tenant.evolution_instance_name ||
      `${(tenant.subdomain || "tenant").replace(/[^a-z0-9]/gi, "")}-${String(tenant.id).slice(0, 8)}`)
      .toLowerCase();

    switch (action) {
      case "create": {
        // Idempotent: if already open, report connected.
        const state = await evolution(apiUrl, apiKey, `/instance/connectionState/${instanceName}`, "GET");
        const currentStatus = (state.data as any)?.instance?.state || (state.data as any)?.state;
        if (state.ok && currentStatus === "open") {
          await supabaseAdmin
            .from("tenants")
            .update({
              evolution_api_url: apiUrl,
              evolution_api_key: apiKey,
              evolution_instance_name: instanceName,
              whatsapp_enabled: true,
            })
            .eq("id", tenant_id);
          return json({ status: "open", instanceName });
        }

        const created = await evolution(apiUrl, apiKey, "/instance/create", "POST", {
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          groupsIgnore: true,
          alwaysOnline: false,
        });

        // 403/already-exists is fine — instance is reusable.
        const alreadyExists =
          !created.ok &&
          JSON.stringify(created.data).toLowerCase().includes("already");

        if (!created.ok && !alreadyExists) {
          throw new Error(`Evolution create failed: ${JSON.stringify(created.data)}`);
        }

        let qrBase64 = null;
        if (alreadyExists) {
          // If instance already exists but is not connected (since open check was false), fetch QR code
          const conn = await evolution(apiUrl, apiKey, `/instance/connect/${instanceName}`, "GET");
          if (conn.ok) {
            const d = conn.data as any;
            qrBase64 = d?.base64 || d?.qrcode?.base64 || null;
          }
        } else {
          qrBase64 = (created.data as any)?.qrcode?.base64 || (created.data as any)?.base64 || null;
        }

        await supabaseAdmin
          .from("tenants")
          .update({
            evolution_api_url: apiUrl,
            evolution_api_key: apiKey,
            evolution_instance_name: instanceName,
          })
          .eq("id", tenant_id);

        return json({ status: "created", instanceName, base64: qrBase64 });
      }

      case "qrcode": {
        const conn = await evolution(apiUrl, apiKey, `/instance/connect/${instanceName}`, "GET");
        if (!conn.ok) {
          throw new Error(`Evolution connect failed: ${JSON.stringify(conn.data)}`);
        }
        const d = conn.data as any;
        return json({
          base64: d?.base64 || d?.qrcode?.base64 || null,
          code: d?.code || d?.qrcode?.code || null,
          pairingCode: d?.pairingCode || null,
        });
      }

      case "status": {
        const state = await evolution(apiUrl, apiKey, `/instance/connectionState/${instanceName}`, "GET");
        const d = state.data as any;
        const connState = d?.instance?.state || d?.state || "close";

        if (connState === "open") {
          await supabaseAdmin
            .from("tenants")
            .update({ whatsapp_enabled: true })
            .eq("id", tenant_id);

          // Fetch profile details (best-effort).
          let phone = "";
          let profileName = "";
          const info = await evolution(apiUrl, apiKey, `/instance/fetchInstances?instanceName=${instanceName}`, "GET");
          if (info.ok) {
            const arr = Array.isArray(info.data) ? info.data : [info.data];
            const match = arr.find((x: any) => (x?.instance?.instanceName || x?.name) === instanceName) || arr[0];
            const owner = match?.instance?.owner || match?.ownerJid || "";
            phone = String(owner).split("@")[0] || "";
            profileName = match?.instance?.profileName || match?.profileName || "";
          }
          return json({ status: "open", phone, profileName });
        }
        return json({ status: connState });
      }

      case "disconnect": {
        await evolution(apiUrl, apiKey, `/instance/logout/${instanceName}`, "DELETE");
        await evolution(apiUrl, apiKey, `/instance/delete/${instanceName}`, "DELETE");
        await supabaseAdmin
          .from("tenants")
          .update({ whatsapp_enabled: false })
          .eq("id", tenant_id);
        return json({ status: "disconnected" });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
