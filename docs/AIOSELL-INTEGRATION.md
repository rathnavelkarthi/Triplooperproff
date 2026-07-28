# Aiosell Channel Manager Integration

Connects Triplooper (as a PMS) to Aiosell so a tenant's rates & inventory push
out to OTAs, and OTA bookings flow back in as reservations.

**Status: built, not live.** All code ships with placeholder Aiosell partner
credentials. It cannot go live until Triplooper is an onboarded Aiosell partner
and the real credentials are set as edge secrets.

## Pieces

| Component | Path | Direction | Purpose |
|-----------|------|-----------|---------|
| Shared client | `supabase/functions/_shared/aiosell.ts` | PMS → Aiosell | HTTP client for all outbound API calls |
| Tenant auth helper | `supabase/functions/_shared/tenant-auth.ts` | — | JWT-based tenant authorization |
| Push fn | `supabase/functions/aiosell-push` | PMS → Aiosell | Push inventory/rates/restrictions FROM Triplooper TO Aiosell |
| Sync/fetch fn | `supabase/functions/aiosell-sync` | PMS ← Aiosell | Fetch property details / inventory / rates / reservations FROM Aiosell |
| Reservation webhook | `supabase/functions/aiosell-webhook` | Aiosell → PMS | Receive reservation (book/modify/cancel) FROM Aiosell |
| Inbound data push | `supabase/functions/aiosell-inbound` | Aiosell → PMS | Receive inventory/rates/restrictions pushed from Aiosell |
| Config doc for Aiosell | `docs/AIOSELL-WEBHOOK-CONFIG.md` | — | Document to share with Aiosell team at onboarding |
| Schema | `supabase/migrations/20260723000000_aiosell_integration.sql` | — | DB tables for room mappings, channel connections |

Per-tenant config reuses `channel_connections` with `channel_id = 'aiosell'`;
the tenant's Aiosell hotelCode goes in `channel_connections.property_id`.

## Data Flow

```
                    ┌─────────────────────────────┐
                    │       Aiosell CM             │
                    │  live.aiosell.com            │
                    └──────┬──────────┬────────────┘
                           │          │
         ┌─────────────────┘          └─────────────────┐
         ▼                                                ▼
┌──────────────────┐                        ┌──────────────────────┐
│  Outbound (PMS)   │                        │  Inbound (Webhooks)   │
│                   │                        │                       │
│ aiosell-push      │                        │ aiosell-webhook       │
│  → inventory      │                        │  ← reservations       │
│  → rates          │                        │                       │
│  → restrictions   │                        │ aiosell-inbound       │
│  → multiplier     │                        │  ← inventory          │
│                   │                        │  ← rates              │
│ aiosell-sync      │                        │  ← restrictions       │
│  ← inventory      │                        │                       │
│  ← rates          │                        │                       │
│  ← reservations   │                        │                       │
│  ← property map   │                        │                       │
└──────────────────┘                        └──────────────────────┘
```

## Edge secrets (set after onboarding — DO NOT commit)

```bash
# Partner Basic Auth issued by Aiosell at onboarding (single Triplooper account).
supabase secrets set AIOSELL_USERNAME=aiosell AIOSELL_PASSWORD=AIOsell@123
# The {pms} partner slug in the API path. Sandbox value: sample-pms
supabase secrets set AIOSELL_PARTNER_ID=sample-pms

# Inbound webhook Basic Auth — YOU choose these, then give them to Aiosell.
supabase secrets set AIOSELL_INBOUND_USERNAME=... AIOSELL_INBOUND_PASSWORD=...
```

Until `AIOSELL_USERNAME`/`AIOSELL_PASSWORD` are real, push/sync return HTTP 503
with a clear "credentials not set" message. The webhooks reject all calls (401)
until the inbound credentials are set.

## Client → edge function calls

**Push** (authenticated CRM user, must own the tenant):

```jsonc
// POST /functions/v1/aiosell-push   (Authorization: Bearer <supabase jwt>)
{ "tenant_id": "<uuid>", "action": "inventory",
  "updates": [{ "startDate":"2026-08-01","endDate":"2026-08-03",
                "rooms":[{"roomCode":"executive","available":5}] }] }
```

`action` ∈ `inventory` | `rates` | `inventory_restrictions` |
`rate_restrictions` | `multiplier`. Restriction & rate payload shapes match the
Aiosell doc exactly (unset restriction fields must be `null`, not omitted).

**Sync:**

```jsonc
// property mapping + optional seed of aiosell_room_mappings
{ "tenant_id":"<uuid>", "action":"property_details", "seed": true }
// fetch dataset
{ "tenant_id":"<uuid>", "action":"fetch", "type":"reservation",
  "startDate":"2026-08-01", "endDate":"2026-08-05" }
```

## Webhooks (Aiosell → Triplooper)

Give Aiosell the following URLs + Basic Auth credentials at onboarding.
Full spec: [`docs/AIOSELL-WEBHOOK-CONFIG.md`](./AIOSELL-WEBHOOK-CONFIG.md)

| Webhook | URL Path | Purpose |
|---------|----------|---------|
| Reservation | `/functions/v1/aiosell-webhook` | Receive book/modify/cancel notifications |
| Inventory | `/functions/v1/aiosell-inbound/inventory` | Receive inventory updates pushed by Aiosell |
| Inventory + Restrictions | `/functions/v1/aiosell-inbound/inventory+restrictions` | Receive inventory + room-level restrictions |
| Rates | `/functions/v1/aiosell-inbound/rates` | Receive rate updates pushed by Aiosell |
| Rates + Restrictions | `/functions/v1/aiosell-inbound/rates+restrictions` | Receive rates + rateplan-level restrictions |

**Reservation webhook (`aiosell-webhook`):**
- Handles `book` / `modify` / `cancel` (differentiated by `action`).
- Idempotent: upserts `reservations` on PK `AIO-<bookingId>`; duplicate
  deliveries and `modify` converge to one row. `modify` is full-replace.
- Guest fields optional — never rejects a booking for missing name/email/phone.
- `specialRequests` stored raw in `reservations.special_requests`.
- Full payload kept in `reservations.raw_payload` for audit.

**Inbound data push (`aiosell-inbound`):**
- Single function routes by URL suffix to handle 4 data types.
- Validates Basic Auth, resolves `hotelCode` → tenant.
- Stores inventory in `room_inventory` table (upsert by tenant+room+date).
- Stores rates in `room_rates` table (upsert by tenant+room+rateplan+date).
- Logs all activity in `channel_sync_logs`.

## Reservation push (Triplooper → Aiosell)

When a direct booking is made on the property website, Triplooper can push the
reservation to Aiosell via the shared client:

```ts
import { pushReservationToAiosell } from "../_shared/aiosell.ts";

await pushReservationToAiosell({
  action: "book",
  hotelCode: "sandbox-pms",
  channel: "Direct",
  bookingId: "BK-001",
  checkin: "2026-08-01",
  checkout: "2026-08-03",
  pah: true,
  amount: { amountAfterTax: 5000, currency: "INR" },
  guest: { firstName: "John", lastName: "Doe" },
  rooms: [{ roomCode: "executive", rateplanCode: "executive-s-ep",
            guestName: "John Doe", occupancy: { adults: 1, children: 0 } }],
});
```

API endpoint called: `POST https://live.aiosell.com/api/v2/cm/push/sample-pms`

## Onboarding order

1. Test Rate Push & Inventory Push in the Aiosell Sandbox (`sample-pms`).
2. Build & test the webhooks with the Aiosell Webhook Tester.
3. Share [`docs/AIOSELL-WEBHOOK-CONFIG.md`](./AIOSELL-WEBHOOK-CONFIG.md) with Aiosell.
4. Register as an Aiosell partner.
5. Aiosell issues partner id + Basic Auth → set the edge secrets above.
6. For each tenant: create a `channel_connections` row
   (`channel_id='aiosell'`, `property_id=<hotelCode>`), then call
   `aiosell-sync` `property_details` with `seed:true` to populate room mappings.
