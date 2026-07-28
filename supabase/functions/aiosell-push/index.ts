import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { authorizeTenant } from "../_shared/tenant-auth.ts";
import {
  credentialsConfigured,
  pushInventory,
  pushInventoryRestrictions,
  pushRateRestrictions,
  pushRates,
  setChannelMultiplier,
  type InventoryUpdate,
  type InventoryRestrictionUpdate,
  type RateRestrictionUpdate,
  type RateUpdate,
} from "../_shared/aiosell.ts";

// PMS -> Aiosell push. Authenticated CRM callers push rates/inventory/
// restrictions/multiplier for a tenant they own. Partner Basic Auth lives in
// edge secrets (AIOSELL_*), not per tenant. The tenant's Aiosell hotelCode is
// stored on channel_connections.property_id where channel_id = 'aiosell'.

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

let activeCors: Record<string, string> = {};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...activeCors, "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  activeCors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: activeCors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { tenant_id, action } = body;
  if (!tenant_id || !action) {
    return json({ error: "tenant_id and action are required" }, 400);
  }

  // Authorize caller against this tenant.
  const auth = await authorizeTenant(req.headers.get("Authorization"), tenant_id, supabaseAdmin);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  // Resolve the tenant's Aiosell hotelCode.
  const { data: conn } = await supabaseAdmin
    .from("channel_connections")
    .select("property_id, status")
    .eq("tenant_id", tenant_id)
    .eq("channel_id", "aiosell")
    .maybeSingle();

  const hotelCode = conn?.property_id;
  if (!hotelCode) {
    return json({ error: "Aiosell not configured for this tenant (missing property_id)" }, 409);
  }

  if (!credentialsConfigured()) {
    // Surface clearly rather than letting every call 401 opaquely.
    return json({
      error: "Aiosell partner credentials not set. Configure AIOSELL_USERNAME / " +
        "AIOSELL_PASSWORD / AIOSELL_PARTNER_ID secrets after onboarding.",
    }, 503);
  }

  try {
    let result;
    switch (action) {
      case "inventory": {
        const updates = body.updates as InventoryUpdate[];
        if (!Array.isArray(updates) || !updates.length) {
          return json({ error: "updates[] required for inventory push" }, 400);
        }
        result = await pushInventory(hotelCode, updates);
        break;
      }
      case "rates": {
        const updates = body.updates as RateUpdate[];
        if (!Array.isArray(updates) || !updates.length) {
          return json({ error: "updates[] required for rate push" }, 400);
        }
        result = await pushRates(hotelCode, updates);
        break;
      }
      case "inventory_restrictions": {
        const updates = body.updates as InventoryRestrictionUpdate[];
        const toChannels = body.toChannels as string[];
        if (!Array.isArray(toChannels) || !toChannels.length) {
          return json({ error: "toChannels[] required for restrictions" }, 400);
        }
        result = await pushInventoryRestrictions(hotelCode, toChannels, updates);
        break;
      }
      case "rate_restrictions": {
        const updates = body.updates as RateRestrictionUpdate[];
        const toChannels = body.toChannels as string[];
        if (!Array.isArray(toChannels) || !toChannels.length) {
          return json({ error: "toChannels[] required for restrictions" }, 400);
        }
        result = await pushRateRestrictions(hotelCode, toChannels, updates);
        break;
      }
      case "multiplier": {
        const multiplier = Number(body.multiplier);
        if (!Number.isFinite(multiplier) || multiplier <= 0) {
          return json({ error: "multiplier must be a positive number" }, 400);
        }
        result = await setChannelMultiplier(hotelCode, multiplier);
        break;
      }
      default:
        return json({ error: `Unknown action '${action}'` }, 400);
    }

    // Aiosell reports success via `success` (push) or `status` (multiplier).
    const rb = result.body as any;
    const succeeded = result.ok && (rb?.success === true || rb?.status === true);

    await supabaseAdmin.from("channel_sync_logs").insert({
      tenant_id,
      channel_id: "aiosell",
      channel_name: "Aiosell",
      action: `push:${action}`,
      details: typeof rb?.message === "string" ? rb.message : JSON.stringify(rb).slice(0, 500),
      status: succeeded ? "success" : "error",
    });

    if (succeeded) {
      await supabaseAdmin.from("channel_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("tenant_id", tenant_id).eq("channel_id", "aiosell");
    }

    // Pass Aiosell's own status/body through so the caller sees the real result.
    return json(result.body, succeeded ? 200 : result.status || 502);
  } catch (e) {
    await supabaseAdmin.from("channel_sync_logs").insert({
      tenant_id,
      channel_id: "aiosell",
      channel_name: "Aiosell",
      action: `push:${action}`,
      details: String(e).slice(0, 500),
      status: "error",
    });
    return json({ error: "Push failed", detail: String(e) }, 502);
  }
});
