# AI Trip Planner — Design Spec

**Date:** 2026-07-01
**Status:** Approved (design phase)
**Surface:** Consumer landing page (`/` → `src/pages/LandingPage.tsx`)

## 1. Goal

Add an **AI Trip Planner** to the consumer landing page. A visitor who wants to plan a
group/property trip clicks a floating **"Plan with AI"** button, answers a short
button-driven wizard (destination → budget/stay/party → property tier → pick property →
itinerary review → checkout), and receives a complete trip plan over WhatsApp. No online
payment in v1 — checkout is **lead capture + WhatsApp plan delivery**.

### Non-goals (v1)
- No online payment / Razorpay in the planner flow.
- No live AI (Gemini) itinerary generation — itineraries use curated static data.
- No real cab/driver booking — transport is a **budget line only**.
- No changes to the existing hotel booking flow (`/site/:subdomain`, `Booking.tsx`).

## 2. Decisions (locked)

| Area | Decision |
|------|----------|
| Property source | **Live Supabase hotels first, curated catalog as fallback** per city |
| Itinerary | **Curated static data** (hand-built attractions per destination) |
| Checkout | **Lead capture + WhatsApp plan** (no payment) |
| Cab/transport | **Budget line only** (reserve % of remaining, no driver details) |
| Entry point | **Floating button + full-screen wizard overlay** on `/` |
| Property tiers | **Budget / Standard / Premium** (nightly-rate bands) |
| Destinations | **Auto-derived** from cities that have properties (live + catalog) + "Anywhere" |

## 3. Architecture

All logic is new and self-contained. The **only** existing file modified is
`LandingPage.tsx` (mounts the floating button).

```
src/lib/tripPlanner/
  types.ts            # TripPlan, PlannerProperty, Attraction, WizardState, PropertyTier
  destinations.ts     # curated attractions per city (name, distanceKm, suggestedMins)
  properties.ts       # getProperties(city?) — live Supabase → catalog fallback, normalized
  budgetEngine.ts     # PURE functions: tier bands, stay cost, remaining, transport reserve,
                      #   feasibility checks, itinerary spread
src/components/tripPlanner/
  TripPlannerButton.tsx    # floating glowing CTA (mounted in LandingPage)
  TripPlannerWizard.tsx    # full-screen overlay, step orchestration + WizardState
  steps/
    StepDestination.tsx
    StepBudgetStayParty.tsx
    StepPropertyTier.tsx
    StepPropertyPick.tsx
    StepItineraryReview.tsx
    StepCheckout.tsx
```

**Separation of concerns:** `budgetEngine.ts` and `properties.ts` are framework-free and
unit-tested. React components own only presentation + `WizardState` transitions.

## 4. Wizard flow

All steps are button-driven with Back/Next. `WizardState` accumulates:
`{ destination, budget, nights, people, tier, property, plan }`.

1. **Destination** — "Where are you going?" Buttons derived from cities that actually have
   properties (live + catalog), plus **"Anywhere"** (matches across all cities).
2. **Budget · Stay · Party** — budget buttons (₹10k / ₹25k / ₹50k / ₹1L + custom input),
   nights (1–10), number of people.
3. **Property tier** — Budget / Standard / Premium.
4. **Pick property** — lists only properties in the chosen city + tier whose **stay cost
   fits budget**. Live preview per card: `₹2,500 × 2 = ₹5,000 · ₹5,000 left`. User selects one.
5. **Itinerary review** — from remaining budget + nights, shows a day-by-day plan built from
   curated attractions (place, distanceKm, suggestedMins), plus a reserved **cab/transport**
   budget line. Feasibility note if nights don't fit or budget allows more.
6. **Checkout** — name + phone + plan summary → **"Send my plan on WhatsApp"**.

## 5. Budget engine (`budgetEngine.ts`)

Pure functions, unit-tested:

- **Tier bands** (by nightly rate, tunable constants):
  - Budget `≤ ₹3,500`
  - Standard `₹3,500 – ₹7,000`
  - Premium `> ₹7,000`
- `stayCost = nightlyRate × nights`
- `remaining = budget − stayCost`
- `transportReserve = clamp(remaining × 0.40, 0, remaining)` (default 40%, tunable) — shown
  as a "cab/transport" line, **no driver details**.
- `freeBudget = remaining − transportReserve` (spending money / activities).
- **Feasibility:**
  - `stayCost > budget` → flag "over budget", nudge to a lower tier or fewer nights.
  - budget comfortably covers more nights → suggest a longer stay.
- **Itinerary spread:** distribute curated attractions across `nights` (2–3 spots/day),
  each carrying distanceKm + suggestedMins. Display-only.

**Worked example (from brief):** Kodaikanal, ₹10,000, 2 nights, property ₹2,500/nt →
stayCost ₹5,000, remaining ₹5,000, transportReserve ₹2,000, freeBudget ₹3,000 → 2-day
itinerary (e.g. Dolphin's Nose ~8km ~90min, Coaker's Walk ~3km ~45min, Pillar Rocks ~10km ~60min).

## 6. Data sources

### `properties.ts`
`async getProperties(city?): PlannerProperty[]`:
1. Query live Supabase (`tenants` + `rooms`, same pattern as `HotelDirectory.tsx`); derive
   nightly rate from min room `price_per_night`, tier from bands.
2. For any requested city with **no live listings**, fall back to the curated catalog
   currently hardcoded in `LandingPage.tsx` (~18 properties across Ooty, Kodaikanal,
   Pondicherry, Chennai, Yercaud, etc.). This catalog is **extracted into
   `properties.ts`** so both the planner and (optionally, later) the landing page share it.

```ts
type PropertyTier = 'budget' | 'standard' | 'premium';
interface PlannerProperty {
  id: string;
  name: string;
  city: string;
  type: string;          // "Heritage Mountain Retreat", etc.
  nightlyRate: number;
  tier: PropertyTier;
  image: string;
  rating?: string;
  source: 'live' | 'catalog';
  subdomain?: string;    // present when live (or catalog entry has one)
  tenantId?: string;     // present only when source === 'live'
}
```

### `destinations.ts`
Hand-written attractions for **Ooty, Kodaikanal, Pondicherry, Chennai**:
```ts
interface Attraction { name: string; distanceKm: number; suggestedMins: number; note?: string; }
```
Cities without curated attractions still work for property matching — itinerary shows a
graceful "custom plan on request" message instead of a day-by-day list.

## 7. Checkout & WhatsApp delivery

The trip plan is formatted into a single WhatsApp message: destination, dates (derived from
nights + start date), property, budget breakdown (stay / transport reserve / free), and the
day-by-day itinerary.

### Constraint (important)
The existing `send-whatsapp` edge function **requires a `tenant_id`** and per-tenant
Evolution API config (`evolution_instance_name`, etc.). There is **no platform-wide WhatsApp
sender**. Delivery therefore branches:

- **Chosen property is a live tenant** (`source === 'live'`, has `tenantId` with
  `whatsapp_enabled` + Evolution config): POST the formatted plan to `send-whatsapp` with that
  `tenant_id`. The property owner's WhatsApp reaches out to the lead.
- **Catalog fallback / no WhatsApp config:** store the lead only and show an on-screen
  "We'll be in touch" confirmation. (Optional later: a platform outreach tenant.)

### Lead storage — new table `trip_leads`
No leads table exists today. Add a lightweight table:
```
trip_leads (
  id uuid pk default gen_random_uuid(),
  created_at timestamptz default now(),
  name text, phone text,
  destination text, budget int, nights int, people int,
  tier text,
  property_name text, property_id text, tenant_id uuid null,
  plan jsonb,            -- full TripPlan snapshot (budget breakdown + itinerary)
  whatsapp_sent boolean default false
)
```
RLS: insert allowed for anon (public planner); select restricted to platform admin / owning
tenant. Migration lives in `supabase/` alongside existing SQL.

## 8. Testing

- **Unit (`budgetEngine`):** tier banding boundaries, stayCost, remaining, transportReserve
  clamp, feasibility flags (over-budget + suggest-longer), itinerary spread across nights.
- **Unit (`properties`):** live→catalog fallback per city, normalization of both shapes,
  tier assignment.
- **Manual (browser):** full wizard happy path on `/`, over-budget path, "Anywhere" path,
  live-tenant WhatsApp send vs catalog fallback confirmation, mobile layout.

## 9. Open items to confirm during planning
- Exact `trip_leads` RLS policy wording and migration file naming.
- Whether to also refactor `LandingPage.tsx`'s inline catalog to import from
  `properties.ts` now (removes duplication) or leave it untouched for v1.
- Trip start date input (default "tomorrow" per brief) vs explicit date picker.
