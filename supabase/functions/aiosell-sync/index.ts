import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { authorizeTenant } from "../_shared/tenant-auth.ts";
import {
  credentialsConfigured,
  fetchData,
  getPropertyDetails,
  isValidDate,
  type FetchType,
} from "../_shared/aiosell.ts";

// PMS <- Aiosell fetch/sync. Authenticated CRM callers pull data for a tenant
// they own. Two modes via `action`:
//   * "property_details"  -> fetch mapping (hotel/room/rateplan codes). Optional
//                            seed=true upserts aiosell_room_mappings rows.
//   * "fetch"             -> fetch inventory | rates | reservation for a range.

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
  if (!tenant_id || !action) return json({ error: "tenant_id and action are required" }, 400);

  const auth = await authorizeTenant(req.headers.get("Authorization"), tenant_id, supabaseAdmin);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const { data: conn } = await supabaseAdmin
    .from("channel_connections")
    .select("property_id")
    .eq("tenant_id", tenant_id)
    .eq("channel_id", "aiosell")
    .maybeSingle();
  const hotelCode = conn?.property_id;
  if (!hotelCode) {
    return json({ error: "Aiosell not configured for this tenant (missing property_id)" }, 409);
  }

  if (!credentialsConfigured()) {
    return json({
      error: "Aiosell partner credentials not set. Configure AIOSELL_USERNAME / " +
        "AIOSELL_PASSWORD / AIOSELL_PARTNER_ID secrets after onboarding.",
    }, 503);
  }

  try {
    if (action === "property_details") {
      const result = await getPropertyDetails(hotelCode);
      if (!result.ok) return json(result.body, result.status || 502);

      // Optionally seed room/rateplan mappings from the returned rooms[].
      if (body.seed === true) {
        const details = result.body as any;
        const rows: any[] = [];
        for (const room of details?.rooms ?? []) {
          for (const rp of room?.rateplans ?? []) {
            rows.push({
              tenant_id,
              room_code: String(room.room_id),
              rateplan_code: String(rp.rateplan_id),
              rateplan_name: rp.rateplan_name ?? null,
            });
          }
        }
        if (rows.length) {
          await supabaseAdmin
            .from("aiosell_room_mappings")
            .upsert(rows, { onConflict: "tenant_id,room_code,rateplan_code" });
        }
        return json({ ...details, _seeded: rows.length });
      }
      return json(result.body);
    }

    if (action === "fetch") {
      const type = body.type as FetchType;
      if (!["inventory", "rates", "reservation"].includes(type)) {
        return json({ error: "type must be inventory | rates | reservation" }, 400);
      }
      if (!isValidDate(body.startDate) || !isValidDate(body.endDate)) {
        return json({ error: "startDate and endDate must be YYYY-MM-DD" }, 400);
      }
      const result = await fetchData(type, hotelCode, body.startDate, body.endDate);
      return json(result.body, result.ok ? 200 : result.status || 502);
    }

    return json({ error: `Unknown action '${action}'` }, 400);
  } catch (e) {
    return json({ error: "Sync failed", detail: String(e) }, 502);
  }
});
