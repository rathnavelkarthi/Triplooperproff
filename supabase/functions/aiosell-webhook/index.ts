import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Aiosell -> PMS reservation webhook. Aiosell POSTs book / modify / cancel here
// (all differentiated by the `action` field). We authenticate the INBOUND call
// with HTTP Basic Auth: Triplooper chooses these credentials and hands them to
// Aiosell at onboarding. They are stored server-side as edge secrets:
//   AIOSELL_INBOUND_USERNAME / AIOSELL_INBOUND_PASSWORD
//
// verify_jwt is false for this function (see config.toml): the caller is Aiosell,
// not a Supabase user. Basic Auth is the only gate.

const INBOUND_USER = Deno.env.get("AIOSELL_INBOUND_USERNAME") || "";
const INBOUND_PASS = Deno.env.get("AIOSELL_INBOUND_PASSWORD") || "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

// Constant-time string compare to avoid leaking credential length/prefix.
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
  if (!INBOUND_USER || !INBOUND_PASS) return false; // not configured -> reject all
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
  // Evaluate both to keep timing roughly constant.
  const uOk = timingSafeEqual(user, INBOUND_USER);
  const pOk = timingSafeEqual(pass, INBOUND_PASS);
  return uOk && pOk;
}

// Compose a stable local reservation PK from the OTA booking id.
function localId(bookingId: string): string {
  return `AIO-${bookingId}`;
}

// Best-effort guest name from optional OTA fields.
function guestName(g: any, rooms: any[]): string {
  const first = g?.firstName || "";
  const last = g?.lastName || "";
  const joined = `${first} ${last}`.trim();
  if (joined) return joined;
  const rn = rooms?.[0]?.guestName;
  return (typeof rn === "string" && rn.trim()) ? rn.trim() : "OTA Guest";
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, message: "Invalid JSON body" }, 400);
  }

  const { action, hotelCode, bookingId } = body;
  if (!action || !hotelCode || !bookingId) {
    return json({ success: false, message: "action, hotelCode and bookingId are required" }, 400);
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

  try {
    if (action === "cancel") {
      // Cancel resolves by (tenant, channel_booking_id). Idempotent: cancelling
      // an unknown/already-cancelled booking still returns success.
      await supabaseAdmin
        .from("reservations")
        .update({ status: "CANCELLED" })
        .eq("tenant_id", tenantId)
        .eq("channel_booking_id", String(bookingId));
      await log("webhook:cancel", "success", `Cancelled ${bookingId}`);
      return json({ success: true, message: "Reservation Cancelled Successfully" });
    }

    if (action !== "book" && action !== "modify") {
      return json({ success: false, message: `Unknown action '${action}'` }, 400);
    }

    // book / modify both carry the full new state -> upsert (replace, not merge).
    const rooms: any[] = Array.isArray(body.rooms) ? body.rooms : [];
    const firstRoom = rooms[0] || {};
    const amount = body.amount || {};

    // Translate the first room's Aiosell codes to a local room_id, if mapped.
    let roomId: number | null = null;
    if (firstRoom.roomCode) {
      const { data: mapping } = await supabaseAdmin
        .from("aiosell_room_mappings")
        .select("room_id")
        .eq("tenant_id", tenantId)
        .eq("room_code", String(firstRoom.roomCode))
        .eq("rateplan_code", String(firstRoom.rateplanCode || ""))
        .maybeSingle();
      roomId = (mapping?.room_id as number | null) ?? null;
    }

    const row = {
      id: localId(String(bookingId)),
      tenant_id: tenantId,
      channel_booking_id: String(bookingId),
      cm_booking_id: body.cmBookingId ?? null,
      guest_name: guestName(body.guest, rooms),
      guest_email: body.guest?.email ?? null,
      guest_phone: body.guest?.phone ?? null,
      guest_location: body.guest?.address?.city ?? null,
      room_type: firstRoom.roomCode ?? null,
      room_id: roomId,
      check_in: body.checkin ?? null,
      check_out: body.checkout ?? null,
      source: body.channel ? String(body.channel).toUpperCase() : "OTA",
      status: "CONFIRMED",
      payment_status: body.pah === true ? "PENDING" : "PAID",
      amount: Number(amount.amountAfterTax ?? 0),
      gst_amount: Number(amount.tax ?? 0),
      special_requests: typeof body.specialRequests === "string" ? body.specialRequests : null,
      pah: body.pah === true,
      currency: amount.currency ?? null,
      commission: amount.commission == null ? null : Number(amount.commission),
      raw_payload: body,
    };

    // Upsert on the PK so duplicate deliveries and modify both converge.
    const { error } = await supabaseAdmin
      .from("reservations")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;

    await log(`webhook:${action}`, "success", `${action} ${bookingId}`);
    return json({
      success: true,
      message: action === "modify"
        ? "Reservation Modified Successfully"
        : "Reservation Updated Successfully",
    });
  } catch (e) {
    await log(`webhook:${action}`, "error", String(e));
    return json({ success: false, message: "Processing failed", detail: String(e) }, 500);
  }
});
