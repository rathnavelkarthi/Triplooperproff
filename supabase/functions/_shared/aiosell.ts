// Shared Aiosell Channel Manager client.
//
// Direction PMS -> Aiosell (push/fetch). All calls use HTTP Basic Auth with a
// SINGLE Triplooper-wide partner credential set held in edge-function secrets:
//   AIOSELL_USERNAME   - Basic Auth username  (issued at partner onboarding)
//   AIOSELL_PASSWORD   - Basic Auth password  (issued at partner onboarding)
//   AIOSELL_PARTNER_ID - the {pms} slug in the URL path (e.g. "sample-pms")
//
// Until Triplooper is onboarded these resolve to the placeholders below; every
// push/fetch will 401 against live.aiosell.com, which is expected. DO NOT
// hard-code real values here.

const BASE_URL = "https://live.aiosell.com/api/v2/cm";

const USERNAME = Deno.env.get("AIOSELL_USERNAME") || "<USERNAME>";
const PASSWORD = Deno.env.get("AIOSELL_PASSWORD") || "<PASSWORD>";
// {pms} path slug. Sandbox uses "sample-pms".
const PARTNER_ID = Deno.env.get("AIOSELL_PARTNER_ID") || "sample-pms";

function authHeader(): string {
  return "Basic " + btoa(`${USERNAME}:${PASSWORD}`);
}

export function credentialsConfigured(): boolean {
  return USERNAME !== "<USERNAME>" && PASSWORD !== "<PASSWORD>";
}

export interface AiosellResult<T = unknown> {
  ok: boolean;
  status: number;
  // Aiosell push/marknoshow responses use { success, message }; channel
  // multiplier uses { status, message }. Fetch APIs return the raw dataset.
  body: T;
}

async function call<T = unknown>(
  path: string,
  method: "GET" | "POST",
  payload?: unknown,
): Promise<AiosellResult<T>> {
  const headers: Record<string, string> = { Authorization: authHeader() };
  if (payload !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });

  let body: unknown;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body: body as T };
}

// ---------------------------------------------------------------------------
// Property / mapping details
// GET /property_details/{hotelCode}?partnerId={pms}
// ---------------------------------------------------------------------------
export function getPropertyDetails(hotelCode: string) {
  const q = `?partnerId=${encodeURIComponent(PARTNER_ID)}`;
  return call(`/property_details/${encodeURIComponent(hotelCode)}${q}`, "GET");
}

// ---------------------------------------------------------------------------
// Inventory push  POST /update/{pms}
// ---------------------------------------------------------------------------
export interface InventoryRoom { roomCode: string; available: number }
export interface InventoryUpdate {
  startDate: string;
  endDate: string;
  rooms: InventoryRoom[];
}
export function pushInventory(hotelCode: string, updates: InventoryUpdate[]) {
  return call(`/update/${PARTNER_ID}`, "POST", { hotelCode, updates });
}

// ---------------------------------------------------------------------------
// Rate push  POST /update-rates/{pms}
// ---------------------------------------------------------------------------
export interface RateEntry {
  roomCode: string;
  rateplanCode: string;
  rate: number;
}
export interface RateUpdate {
  startDate: string;
  endDate: string;
  rates: RateEntry[];
}
export function pushRates(hotelCode: string, updates: RateUpdate[]) {
  return call(`/update-rates/${PARTNER_ID}`, "POST", { hotelCode, updates });
}

// ---------------------------------------------------------------------------
// Restrictions. Unset fields MUST be sent as null, not omitted.
// ---------------------------------------------------------------------------
export interface Restrictions {
  stopSell?: boolean;
  minimumStay?: number | null;
  maximumStay?: number | null;
  closeOnArrival?: boolean;
  closeOnDeparture?: boolean;
  minimumStayArrival?: number | null;
  maximumStayArrival?: number | null;
  exactStayArrival?: number | null;
  minimumAdvanceReservation?: number | null;
  maximumAdvanceReservation?: number | null;
}

// Inventory restrictions (room level)  POST /update/{pms}
export interface InventoryRestrictionUpdate {
  startDate: string;
  endDate: string;
  rooms: Array<{ roomCode: string; restrictions: Restrictions }>;
}
export function pushInventoryRestrictions(
  hotelCode: string,
  toChannels: string[],
  updates: InventoryRestrictionUpdate[],
) {
  return call(`/update/${PARTNER_ID}`, "POST", { hotelCode, toChannels, updates });
}

// Rate restrictions (room + rateplan level)  POST /update-rates/{pms}
export interface RateRestrictionUpdate {
  startDate: string;
  endDate: string;
  rates: Array<{
    roomCode: string;
    rateplanCode: string;
    restrictions: Restrictions;
  }>;
}
export function pushRateRestrictions(
  hotelCode: string,
  toChannels: string[],
  updates: RateRestrictionUpdate[],
) {
  return call(`/update-rates/${PARTNER_ID}`, "POST", { hotelCode, toChannels, updates });
}

// ---------------------------------------------------------------------------
// Mark no-show  POST /marknoshow/{pms}
// channel currently only supports "booking.com" and "gommt".
// ---------------------------------------------------------------------------
export function markNoShow(hotelCode: string, bookingId: string, channel: string) {
  return call(`/marknoshow/${PARTNER_ID}`, "POST", { hotelCode, bookingId, channel });
}

// ---------------------------------------------------------------------------
// Channel multiplier  POST /channel_multiplier/{pms}
// ---------------------------------------------------------------------------
export function setChannelMultiplier(hotelCode: string, multiplier: number) {
  return call(`/channel_multiplier/${PARTNER_ID}`, "POST", { hotelCode, multiplier });
}

// ---------------------------------------------------------------------------
// Fetch APIs (shared endpoint /data/{pms}, `type` selects the dataset)
// ---------------------------------------------------------------------------
export type FetchType = "inventory" | "rates" | "reservation";
export function fetchData(
  type: FetchType,
  hotelCode: string,
  startDate: string,
  endDate: string,
) {
  return call(`/data/${PARTNER_ID}`, "POST", { type, hotelCode, startDate, endDate });
}

// ---------------------------------------------------------------------------
// Reservation push  POST /push/{pms}
// Send a reservation FROM our PMS/OTA TO Aiosell when a booking happens.
// ---------------------------------------------------------------------------
export interface ReservationPrice {
  date: string;
  sellRate: number;
}
export interface ReservationRoom {
  roomCode: string;
  rateplanCode: string;
  guestName: string;
  occupancy: { adults: number; children: number };
  prices?: ReservationPrice[];
}
export interface ReservationGuest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
}
export interface ReservationAmount {
  amountAfterTax: number;
  amountBeforeTax?: number;
  tax?: number;
  currency?: string;
  commission?: number;
  tcs?: number;
  tds?: number;
}
export interface PushReservationPayload {
  action: "book" | "modify" | "cancel";
  hotelCode: string;
  channel: string;
  bookingId: string;
  cmBookingId?: string;
  bookedOn?: string;
  checkin: string;
  checkout: string;
  segment?: string;
  specialRequests?: string;
  pah: boolean;
  amount: ReservationAmount;
  guest: ReservationGuest;
  rooms: ReservationRoom[];
}

/**
 * Push a reservation (book/modify/cancel) from our system to Aiosell.
 * Uses the partner account's Basic Auth, NOT per-tenant credentials.
 * POST /push/{partnerId}
 */
export function pushReservationToAiosell(
  payload: PushReservationPayload,
): Promise<AiosellResult<{ success: boolean; message: string }>> {
  return call(`/push/${PARTNER_ID}`, "POST", payload);
}

// Validate a YYYY-MM-DD date string (Aiosell rejects other formats).
export function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
