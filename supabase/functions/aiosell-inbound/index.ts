import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Aiosell → PMS inbound webhook.
 *
 * Aiosell pushes inventory / rates / restrictions to these endpoints when
 * changes happen on the OTA side. Triplooper shares the base URL + Basic Auth
 * credentials with Aiosell at onboarding; Aiosell suffixes the type path.
 *
 * Path routing (URL suffix after the function name):
 *   /inventory         — plain inventory push
 *   /inventory+restrictions — inventory + room-level restrictions
 *   /rates             — plain rate push
 *   /rates+restrictions     — rates + rateplan-level restrictions
 *
 * Shared Basic Auth credentials (edge secrets):
 *   AIOSELL_INBOUND_USERNAME
 *   AIOSELL_INBOUND_PASSWORD
 *
 * verify_jwt is false for this function (see config.toml): the caller is
 * Aiosell, not a Supabase user. Basic Auth is the only gate.
 */

const INBOUND_USER = Deno.env.get("AIOSELL_INBOUND_USERNAME") || "";
const INBOUND_PASS = Deno.env.get("AIOSELL_INBOUND_PASSWORD") || "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

// Constant-time string compare.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

function checkBasicAuth(req: Request): boolean {
  if (!INBOUND_USER || !INBOUND_PASS) return false;
  const header = req.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) return false;
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);
  const uOk = timingSafeEqual(user, INBOUND_USER);
  const pOk = timingSafeEqual(pass, INBOUND_PASS);
  return uOk && pOk;
}

/** Resolve the inbound "type" from the URL path suffix. */
function parsePath(url: URL): string {
  // e.g. ".../aiosell-inbound/inventory" → "inventory"
  let path = url.pathname;
  const idx = path.lastIndexOf("/aiosell-inbound");
  if (idx >= 0) path = path.slice(idx + "/aiosell-inbound".length + 1);
  // Strip trailing slash
  return path.replace(/\/+$/, "").toLowerCase() || "";
}

serve(async (req) => {
  if (req.method !== "POST") return json({ success: false, message: "Method not allowed" }, 405);

  if (!checkBasicAuth(req)) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", "WWW-Authenticate": "Basic" } },
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );

  // Determine data type from URL path, with fallback to body.type
  const url = new URL(req.url);
  const urlType = parsePath(url);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, message: "Invalid JSON body" }, 400);
  }

  const effectiveType = urlType || body?.type || "";

  if (!["inventory", "inventory+restrictions", "rates", "rates+restrictions"].includes(effectiveType)) {
    return json({
      success: false,
      message: `Unknown endpoint type '${effectiveType}'. Use URL suffix or body.type. Valid: inventory, inventory+restrictions, rates, rates+restrictions`,
    }, 400);
  }

  const { hotelCode, updates } = body;
  if (!hotelCode || !Array.isArray(updates) || !updates.length) {
    return json({ success: false, message: "hotelCode and non-empty updates[] are required" }, 400);
  }

  // Map hotelCode -> tenant via channel_connections.
  const { data: conn } = await supabaseAdmin
    .from("channel_connections")
    .select("tenant_id")
    .eq("channel_id", "aiosell")
    .eq("property_id", hotelCode)
    .maybeSingle();

  const tenantId = conn?.tenant_id;
  if (!tenantId) {
    return json({ success: false, message: `Unknown hotelCode '${hotelCode}'` }, 404);
  }

  const log = async (act: string, status: string, details: string) => {
    await supabaseAdmin.from("channel_sync_logs").insert({
      tenant_id: tenantId,
      channel_id: "aiosell",
      channel_name: "Aiosell",
      action: act,
      details: details.slice(0, 500),
      status,
    });
  };

  const isInventory = effectiveType === "inventory" || effectiveType === "inventory+restrictions";
  const hasRestrictions = effectiveType.includes("restrictions");
  const isRates = effectiveType === "rates" || effectiveType === "rates+restrictions";

  try {
    // Inventory / Inventory+Restrictions
    if (isInventory) {
      for (const update of updates) {
        const { startDate, endDate, rooms } = update;
        if (!startDate || !endDate || !Array.isArray(rooms)) continue;

        for (const room of rooms) {
          const { roomCode, available, restrictions } = room;

          // Store inventory snapshot in a simple key-value or bulk-upsert table.
          // We store per date per room to make it easy to query.
          // Parse date range into individual dates.
          const start = new Date(startDate);
          const end = new Date(endDate);
          const rows: Array<Record<string, unknown>> = [];

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().slice(0, 10);
            rows.push({
              tenant_id: tenantId,
              room_code: String(roomCode),
              date: dateStr,
              available: available ?? null,
              restrictions: restrictions ?? null,
              raw_source: "aiosell_inbound",
              updated_at: new Date().toISOString(),
            });
          }

          if (rows.length > 0) {
            const { error } = await supabaseAdmin
              .from("room_inventory")
              .upsert(rows, { onConflict: "tenant_id,room_code,date" });

            if (error) {
              await log("inbound:inventory", "error", `DB upsert: ${error.message.slice(0, 200)}`);
            }
          }
        }
      }

      await log(
        hasRestrictions ? `inbound:inventory+restrictions` : `inbound:inventory`,
        "success",
        `Inventory updated from Aiosell for ${hotelCode}: ${updates.length} date range(s)`,
      );
      return json({ success: true, message: "Inventory Updated Successfully" });
    }

    // Rates / Rates+Restrictions
    if (isRates) {
      for (const update of updates) {
        const { startDate, endDate, rates } = update;
        if (!startDate || !endDate || !Array.isArray(rates)) continue;

        for (const rate of rates) {
          const { roomCode, rateplanCode, rate: rateValue, restrictions } = rate;

          const start = new Date(startDate);
          const end = new Date(endDate);
          const rows: Array<Record<string, unknown>> = [];

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().slice(0, 10);
            rows.push({
              tenant_id: tenantId,
              room_code: String(roomCode),
              rateplan_code: String(rateplanCode || ""),
              date: dateStr,
              rate: rateValue ?? null,
              restrictions: restrictions ?? null,
              raw_source: "aiosell_inbound",
              updated_at: new Date().toISOString(),
            });
          }

          if (rows.length > 0) {
            const { error } = await supabaseAdmin
              .from("room_rates")
              .upsert(rows, { onConflict: "tenant_id,room_code,rateplan_code,date" });

            if (error) {
              await log("inbound:rates", "error", `DB upsert: ${error.message.slice(0, 200)}`);
            }
          }
        }
      }

      await log(
        hasRestrictions ? `inbound:rates+restrictions` : `inbound:rates`,
        "success",
        `Rates updated from Aiosell for ${hotelCode}: ${updates.length} date range(s)`,
      );
      return json({ success: true, message: "Rates Updated Successfully" });
    }

    // Should never reach here.
    return json({ success: false, message: "Unknown type" }, 400);
  } catch (e) {
    const act = isInventory ? "inbound:inventory" : "inbound:rates";
    await log(act, "error", String(e));
    return json({ success: false, message: "Processing failed", detail: String(e) }, 500);
  }
});
