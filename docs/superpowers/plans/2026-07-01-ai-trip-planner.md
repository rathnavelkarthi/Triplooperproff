# AI Trip Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a button-driven "Plan with AI" trip planner to the consumer landing page that matches properties to a budget, builds a curated itinerary, and delivers the plan via WhatsApp / lead capture.

**Architecture:** Pure, unit-tested engine (`budgetEngine.ts`, `properties.ts`, `destinations.ts`) under `src/lib/tripPlanner/`, driven by a full-screen React wizard under `src/components/tripPlanner/`. Only `LandingPage.tsx` is modified (mounts a floating button). Live Supabase hotels are preferred; a curated catalog (extracted from `LandingPage.tsx`) is the fallback. Checkout stores a `trip_leads` row and, when the picked property is a live WhatsApp-enabled tenant, sends the plan through the existing `send-whatsapp` edge function.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest, framer-motion (`motion/react`), lucide-react, sonner (toasts), Supabase JS client.

**Decisions applied from spec §9:** live-tenant WhatsApp + lead store fallback for catalog picks; trip start date defaults to tomorrow with an optional date input; the 20-property catalog is extracted into `properties.ts` and `LandingPage.tsx` imports it (removes duplication).

**Reference spec:** `docs/superpowers/specs/2026-07-01-ai-trip-planner-design.md`

**Conventions observed in this repo:**
- Tests: `vitest`, files in `src/test/*.test.ts`, run with `npm test` or `npx vitest run <file>`.
- Import style: `import { supabase } from '../../lib/supabaseClient';` (relative paths, no `@/` alias).
- WhatsApp send: `supabase.functions.invoke('send-whatsapp', { body: { tenant_id, phone, message } })` → returns `{ data: { success }, error }`.
- Currency display uses `formatINR` from `src/lib/booking.ts`.
- Files kept under 500 lines (CLAUDE.md).

---

## File Structure

```
src/lib/tripPlanner/
  types.ts            # PropertyTier, PlannerProperty, Attraction, TripPlan, WizardState
  catalog.ts          # CATALOG_PROPERTIES: the 20 curated properties (extracted verbatim)
  destinations.ts     # ATTRACTIONS: curated attractions per city + getAttractions()
  budgetEngine.ts     # pure: tierForRate, stayCost, buildPlan, feasibility, spreadItinerary
  properties.ts       # getProperties(city?): live Supabase → catalog fallback, normalized
  planMessage.ts      # formatPlanMessage(plan): WhatsApp text
src/components/tripPlanner/
  TripPlannerButton.tsx    # floating glowing CTA
  TripPlannerWizard.tsx    # full-screen overlay + step orchestration + WizardState
  steps/
    StepDestination.tsx
    StepBudgetStayParty.tsx
    StepPropertyTier.tsx
    StepPropertyPick.tsx
    StepItineraryReview.tsx
    StepCheckout.tsx
src/test/
  tripPlanner.budgetEngine.test.ts
  tripPlanner.properties.test.ts
  tripPlanner.planMessage.test.ts
supabase/
  migrations/2026-07-01-trip-leads.sql   # trip_leads table + RLS
```

Modified: `src/pages/LandingPage.tsx` (import catalog from `catalog.ts`, mount `<TripPlannerButton/>`).

---

## Task 1: Types

**Files:**
- Create: `src/lib/tripPlanner/types.ts`

- [ ] **Step 1: Write the types file**

```ts
export type PropertyTier = 'budget' | 'standard' | 'premium';

export interface PlannerProperty {
  id: string;
  name: string;
  city: string;
  type: string;
  nightlyRate: number;
  tier: PropertyTier;
  image: string;
  rating?: string;
  source: 'live' | 'catalog';
  subdomain?: string;
  tenantId?: string;
}

export interface Attraction {
  name: string;
  distanceKm: number;
  suggestedMins: number;
  note?: string;
}

export interface ItineraryDay {
  day: number;
  attractions: Attraction[];
}

export interface BudgetBreakdown {
  budget: number;
  stayCost: number;
  transportReserve: number;
  freeBudget: number;
  overBudget: boolean;
  suggestion?: string;
}

export interface TripPlan {
  destination: string;
  startDate: string;      // ISO yyyy-mm-dd
  nights: number;
  people: number;
  tier: PropertyTier;
  property: PlannerProperty;
  budgetBreakdown: BudgetBreakdown;
  itinerary: ItineraryDay[];
}

export interface WizardState {
  destination?: string;
  budget?: number;
  nights?: number;
  people?: number;
  tier?: PropertyTier;
  property?: PlannerProperty;
  startDate?: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep tripPlanner || echo "no tripPlanner type errors"`
Expected: `no tripPlanner type errors`

- [ ] **Step 3: Commit**

```bash
git add src/lib/tripPlanner/types.ts
git commit -m "feat(planner): add trip planner types"
```

---

## Task 2: Curated catalog (extracted from LandingPage)

**Files:**
- Create: `src/lib/tripPlanner/catalog.ts`

- [ ] **Step 1: Write the catalog module**

Paste the 20 properties currently inlined in `LandingPage.tsx` (lines ~112–131) as a typed constant. Keep `loc`→`city`, `price`→`nightlyRate`, add nothing else.

```ts
export interface CatalogProperty {
  id: number;
  name: string;
  city: string;
  type: string;
  nightlyRate: number;
  rating: string;
  image: string;
  tag: string;
  subdomain?: string;
}

export const CATALOG_PROPERTIES: CatalogProperty[] = [
  { id: 1, name: "Anya Paradise", city: "Pondicherry", type: "Luxury Beach Villa", nightlyRate: 6500, rating: "4.95", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80", tag: "Beachfront", subdomain: "anyaparadise" },
  { id: 2, name: "Coolspot Cottage", city: "Ooty", type: "Heritage Mountain Retreat", nightlyRate: 4200, rating: "4.89", image: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80", tag: "Mountain View", subdomain: "coolspot-cottage" },
  { id: 3, name: "Jayam Castle", city: "Yercaud", type: "Boutique Forest Lodge", nightlyRate: 3800, rating: "4.90", image: "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&q=80", tag: "Forest Edge", subdomain: "jayam-castle" },
  { id: 4, name: "Green Apple Property", city: "Madurai", type: "Premium Stay", nightlyRate: 3500, rating: "4.85", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", tag: "City Center", subdomain: "green-apple-property" },
  { id: 5, name: "Carvery Residency", city: "Pondicherry", type: "French Quarter Inn", nightlyRate: 5800, rating: "4.92", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80", tag: "Heritage Quarter", subdomain: "carvery-residency" },
  { id: 6, name: "Royal Park", city: "Chennai", type: "Executive Suite", nightlyRate: 7200, rating: "4.88", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80", tag: "Premium Suite", subdomain: "royal-park" },
  { id: 7, name: "Solitude Beach House", city: "Pondicherry", type: "Private Beachfront Villa", nightlyRate: 12000, rating: "4.98", image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80", tag: "Beachfront" },
  { id: 8, name: "Verdant Valley Resort", city: "Kodaikanal", type: "Hillside Plantation Villa", nightlyRate: 9500, rating: "4.94", image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80", tag: "Mountain View" },
  { id: 9, name: "Golden Crest Bistro & Inn", city: "Ooty", type: "Boutique Farmhouse", nightlyRate: 6000, rating: "4.91", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80", tag: "Eco Stays" },
  { id: 10, name: "Moongil Illam Cottage", city: "Pondicherry", type: "Bamboo Design Villa", nightlyRate: 5200, rating: "4.87", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80", tag: "Eco Stays", subdomain: "moongil-illam-cottage" },
  { id: 11, name: "Nest N Rest Cottage", city: "Ooty", type: "Cozy Wood Cabin", nightlyRate: 3900, rating: "4.83", image: "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=800&q=80", tag: "Mountain View", subdomain: "nest-n-rest-cottage" },
  { id: 12, name: "Pineapple Nest", city: "Coimbatore", type: "Modern Loft Stay", nightlyRate: 4000, rating: "4.86", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", tag: "City Center", subdomain: "pineapple-nest" },
  { id: 13, name: "Sai Residency", city: "Ooty", type: "Classic Hill Cottage", nightlyRate: 4500, rating: "4.93", image: "https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800&q=80", tag: "Mountain View", subdomain: "sai-residency" },
  { id: 14, name: "Coral Reef Resort", city: "Pondicherry", type: "Coastal Luxury Stay", nightlyRate: 10500, rating: "4.96", image: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&q=80", tag: "Beachfront" },
  { id: 15, name: "Emerald Glade Villa", city: "Yercaud", type: "Orchard Manor", nightlyRate: 8000, rating: "4.92", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80", tag: "Eco Stays" },
  { id: 16, name: "Whispering Pines", city: "Kodaikanal", type: "Pine Ridge Cabin", nightlyRate: 5500, rating: "4.89", image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80", tag: "Mountain View" },
  { id: 17, name: "Pondy Heights", city: "Pondicherry", type: "Rooftop Pool Penthouse", nightlyRate: 6800, rating: "4.88", image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80", tag: "Heritage Quarter" },
  { id: 18, name: "Hilltop Sanctuary", city: "Ooty", type: "Vintage Estate Bungalow", nightlyRate: 11000, rating: "4.97", image: "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=800&q=80", tag: "Mountain View" },
  { id: 19, name: "Kaveri Breeze Hotel", city: "Tiruchirappalli", type: "Boutique Riverside Stay", nightlyRate: 3900, rating: "4.84", image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80", tag: "Heritage Quarter" },
  { id: 20, name: "Silver Linings Villa", city: "Coimbatore", type: "Luxury Foothill Villa", nightlyRate: 8500, rating: "4.91", image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80", tag: "Eco Stays" },
];
```

- [ ] **Step 2: Typecheck & commit**

Run: `npx tsc --noEmit 2>&1 | grep catalog.ts || echo "ok"`
Expected: `ok`

```bash
git add src/lib/tripPlanner/catalog.ts
git commit -m "feat(planner): extract curated property catalog"
```

---

## Task 3: Budget engine (TDD)

**Files:**
- Create: `src/lib/tripPlanner/budgetEngine.ts`
- Test: `src/test/tripPlanner.budgetEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { tierForRate, buildBudgetBreakdown, spreadItinerary } from '../lib/tripPlanner/budgetEngine';
import type { Attraction } from '../lib/tripPlanner/types';

describe('tierForRate', () => {
  it('classifies budget at/under 3500', () => {
    expect(tierForRate(3000)).toBe('budget');
    expect(tierForRate(3500)).toBe('budget');
  });
  it('classifies standard between 3500 and 7000', () => {
    expect(tierForRate(3501)).toBe('standard');
    expect(tierForRate(7000)).toBe('standard');
  });
  it('classifies premium above 7000', () => {
    expect(tierForRate(7001)).toBe('premium');
    expect(tierForRate(12000)).toBe('premium');
  });
});

describe('buildBudgetBreakdown', () => {
  it('computes the brief scenario: Kodaikanal 10k, 2 nights, 2500/nt', () => {
    const b = buildBudgetBreakdown(10000, 2500, 2);
    expect(b.stayCost).toBe(5000);
    expect(b.transportReserve).toBe(2000); // 40% of 5000 remaining
    expect(b.freeBudget).toBe(3000);
    expect(b.overBudget).toBe(false);
  });
  it('flags over budget when stay exceeds budget', () => {
    const b = buildBudgetBreakdown(4000, 2500, 2); // 5000 > 4000
    expect(b.overBudget).toBe(true);
    expect(b.stayCost).toBe(5000);
    expect(b.transportReserve).toBe(0);
    expect(b.freeBudget).toBe(0);
    expect(b.suggestion).toContain('lower');
  });
  it('suggests a longer stay when budget comfortably covers more nights', () => {
    const b = buildBudgetBreakdown(50000, 2500, 2); // stay 5000, huge remaining
    expect(b.suggestion).toContain('longer');
  });
});

describe('spreadItinerary', () => {
  const spots: Attraction[] = [
    { name: 'A', distanceKm: 1, suggestedMins: 30 },
    { name: 'B', distanceKm: 2, suggestedMins: 30 },
    { name: 'C', distanceKm: 3, suggestedMins: 30 },
    { name: 'D', distanceKm: 4, suggestedMins: 30 },
    { name: 'E', distanceKm: 5, suggestedMins: 30 },
  ];
  it('produces one entry per day and covers days', () => {
    const days = spreadItinerary(spots, 2); // 2 nights
    expect(days).toHaveLength(2);
    expect(days[0].day).toBe(1);
    expect(days[0].attractions.length).toBeGreaterThan(0);
  });
  it('handles empty attraction list gracefully', () => {
    const days = spreadItinerary([], 3);
    expect(days).toHaveLength(3);
    expect(days[0].attractions).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/tripPlanner.budgetEngine.test.ts`
Expected: FAIL — cannot find module `budgetEngine`.

- [ ] **Step 3: Implement `budgetEngine.ts`**

```ts
import type { PropertyTier, Attraction, ItineraryDay, BudgetBreakdown } from './types';

export const TIER_BANDS = { budgetMax: 3500, standardMax: 7000 } as const;
export const TRANSPORT_RESERVE_RATIO = 0.4;
const SPOTS_PER_DAY = 2;

export function tierForRate(rate: number): PropertyTier {
  if (rate <= TIER_BANDS.budgetMax) return 'budget';
  if (rate <= TIER_BANDS.standardMax) return 'standard';
  return 'premium';
}

export function buildBudgetBreakdown(budget: number, nightlyRate: number, nights: number): BudgetBreakdown {
  const stayCost = nightlyRate * nights;
  const overBudget = stayCost > budget;
  const remaining = Math.max(0, budget - stayCost);
  const transportReserve = overBudget ? 0 : Math.round(remaining * TRANSPORT_RESERVE_RATIO);
  const freeBudget = Math.max(0, remaining - transportReserve);

  let suggestion: string | undefined;
  if (overBudget) {
    suggestion = 'This property is over your budget — try a lower tier or fewer nights.';
  } else if (nightlyRate > 0 && budget - stayCost >= nightlyRate * 2) {
    const extra = Math.floor((budget - stayCost) / nightlyRate);
    suggestion = `Your budget could comfortably cover a longer stay (about ${extra} more night${extra > 1 ? 's' : ''}).`;
  }

  return { budget, stayCost, transportReserve, freeBudget, overBudget, suggestion };
}

export function spreadItinerary(attractions: Attraction[], nights: number): ItineraryDay[] {
  const days: ItineraryDay[] = [];
  let cursor = 0;
  for (let d = 1; d <= nights; d++) {
    const slice = attractions.slice(cursor, cursor + SPOTS_PER_DAY);
    cursor += SPOTS_PER_DAY;
    days.push({ day: d, attractions: slice });
  }
  return days;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/tripPlanner.budgetEngine.test.ts`
Expected: PASS (all specs green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tripPlanner/budgetEngine.ts src/test/tripPlanner.budgetEngine.test.ts
git commit -m "feat(planner): add budget engine with tests"
```

---

## Task 4: Destinations (curated attractions)

**Files:**
- Create: `src/lib/tripPlanner/destinations.ts`

- [ ] **Step 1: Write the module**

```ts
import type { Attraction } from './types';

export const ATTRACTIONS: Record<string, Attraction[]> = {
  Kodaikanal: [
    { name: "Coaker's Walk", distanceKm: 3, suggestedMins: 45 },
    { name: "Dolphin's Nose", distanceKm: 8, suggestedMins: 90 },
    { name: "Pillar Rocks", distanceKm: 10, suggestedMins: 60 },
    { name: "Kodaikanal Lake", distanceKm: 1, suggestedMins: 60 },
    { name: "Bryant Park", distanceKm: 1, suggestedMins: 45 },
    { name: "Silver Cascade Falls", distanceKm: 8, suggestedMins: 30 },
  ],
  Ooty: [
    { name: "Botanical Gardens", distanceKm: 3, suggestedMins: 90 },
    { name: "Ooty Lake", distanceKm: 2, suggestedMins: 60 },
    { name: "Doddabetta Peak", distanceKm: 10, suggestedMins: 60 },
    { name: "Nilgiri Mountain Railway", distanceKm: 1, suggestedMins: 120 },
    { name: "Rose Garden", distanceKm: 2, suggestedMins: 45 },
    { name: "Tea Museum", distanceKm: 4, suggestedMins: 45 },
  ],
  Pondicherry: [
    { name: "Promenade Beach", distanceKm: 2, suggestedMins: 60 },
    { name: "Auroville", distanceKm: 12, suggestedMins: 120 },
    { name: "French Quarter", distanceKm: 1, suggestedMins: 90 },
    { name: "Paradise Beach", distanceKm: 8, suggestedMins: 120 },
    { name: "Sri Aurobindo Ashram", distanceKm: 1, suggestedMins: 45 },
    { name: "Rock Beach", distanceKm: 2, suggestedMins: 45 },
  ],
  Chennai: [
    { name: "Marina Beach", distanceKm: 4, suggestedMins: 60 },
    { name: "Kapaleeshwarar Temple", distanceKm: 5, suggestedMins: 60 },
    { name: "Fort St. George", distanceKm: 6, suggestedMins: 60 },
    { name: "Government Museum", distanceKm: 5, suggestedMins: 90 },
    { name: "Marundeeswarar Temple", distanceKm: 12, suggestedMins: 45 },
    { name: "San Thome Basilica", distanceKm: 5, suggestedMins: 45 },
  ],
};

export function getAttractions(city: string): Attraction[] {
  return ATTRACTIONS[city] ?? [];
}
```

- [ ] **Step 2: Typecheck & commit**

Run: `npx tsc --noEmit 2>&1 | grep destinations.ts || echo "ok"`
Expected: `ok`

```bash
git add src/lib/tripPlanner/destinations.ts
git commit -m "feat(planner): add curated destination attractions"
```

---

## Task 5: Properties source (live → catalog fallback, TDD)

**Files:**
- Create: `src/lib/tripPlanner/properties.ts`
- Test: `src/test/tripPlanner.properties.test.ts`

- [ ] **Step 1: Write the failing test**

The Supabase client is mocked so the test is deterministic. We test the pure normalization/fallback helpers, not the network.

```ts
import { describe, it, expect } from 'vitest';
import { catalogToPlanner, mergeSources } from '../lib/tripPlanner/properties';
import type { PlannerProperty } from '../lib/tripPlanner/types';
import { CATALOG_PROPERTIES } from '../lib/tripPlanner/catalog';

describe('catalogToPlanner', () => {
  it('normalizes a catalog entry with correct tier and source', () => {
    const p = catalogToPlanner(CATALOG_PROPERTIES[1]); // Coolspot Cottage, Ooty, 4200
    expect(p.city).toBe('Ooty');
    expect(p.nightlyRate).toBe(4200);
    expect(p.tier).toBe('standard');
    expect(p.source).toBe('catalog');
    expect(p.subdomain).toBe('coolspot-cottage');
    expect(p.tenantId).toBeUndefined();
  });
});

describe('mergeSources', () => {
  const live: PlannerProperty[] = [
    { id: 't1', name: 'Live Ooty Hotel', city: 'Ooty', type: 'Hotel', nightlyRate: 5000, tier: 'standard', image: 'x', source: 'live', tenantId: 't1' },
  ];
  it('keeps live properties and fills cities that have no live listing from catalog', () => {
    const merged = mergeSources(live, CATALOG_PROPERTIES.map(catalogToPlanner));
    const ootyLive = merged.filter(p => p.city === 'Ooty' && p.source === 'live');
    const ootyCatalog = merged.filter(p => p.city === 'Ooty' && p.source === 'catalog');
    expect(ootyLive).toHaveLength(1);
    expect(ootyCatalog).toHaveLength(0); // Ooty covered by live → catalog Ooty dropped
    const pondy = merged.filter(p => p.city === 'Pondicherry');
    expect(pondy.every(p => p.source === 'catalog')).toBe(true); // no live Pondy
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/tripPlanner.properties.test.ts`
Expected: FAIL — module/exports missing.

- [ ] **Step 3: Implement `properties.ts`**

```ts
import { supabase } from '../supabaseClient';
import { tierForRate } from './budgetEngine';
import { CATALOG_PROPERTIES, type CatalogProperty } from './catalog';
import type { PlannerProperty } from './types';

export function catalogToPlanner(c: CatalogProperty): PlannerProperty {
  return {
    id: `catalog-${c.id}`,
    name: c.name,
    city: c.city,
    type: c.type,
    nightlyRate: c.nightlyRate,
    tier: tierForRate(c.nightlyRate),
    image: c.image,
    rating: c.rating,
    source: 'catalog',
    subdomain: c.subdomain,
  };
}

/** Live properties win; for any city that has no live listing, keep catalog entries. */
export function mergeSources(live: PlannerProperty[], catalog: PlannerProperty[]): PlannerProperty[] {
  const liveCities = new Set(live.map(p => p.city.toLowerCase()));
  const catalogFallback = catalog.filter(p => !liveCities.has(p.city.toLowerCase()));
  return [...live, ...catalogFallback];
}

async function fetchLiveProperties(): Promise<PlannerProperty[]> {
  try {
    const { data: tenants, error: tErr } = await supabase
      .from('tenants')
      .select('id, business_name, business_type, subdomain, hero_image_url, city, whatsapp_enabled')
      .eq('is_active', true);
    if (tErr || !tenants) return [];

    const { data: rooms } = await supabase.from('rooms').select('tenant_id, price_per_night');

    return tenants
      .map((t): PlannerProperty | null => {
        const tRooms = (rooms || []).filter(r => r.tenant_id === t.id);
        if (tRooms.length === 0) return null; // no bookable rooms → skip
        const nightlyRate = Math.min(...tRooms.map(r => r.price_per_night));
        const city = (t as { city?: string }).city || '';
        if (!city) return null; // can't place on map without a city
        return {
          id: `live-${t.id}`,
          name: t.business_name,
          city,
          type: t.business_type || 'Stay',
          nightlyRate,
          tier: tierForRate(nightlyRate),
          image: t.hero_image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
          source: 'live',
          subdomain: t.subdomain,
          tenantId: t.id,
        };
      })
      .filter((p): p is PlannerProperty => p !== null);
  } catch {
    return [];
  }
}

export async function getProperties(city?: string): Promise<PlannerProperty[]> {
  const live = await fetchLiveProperties();
  const catalog = CATALOG_PROPERTIES.map(catalogToPlanner);
  let all = mergeSources(live, catalog);
  if (city && city !== 'Anywhere') {
    all = all.filter(p => p.city.toLowerCase() === city.toLowerCase());
  }
  return all.sort((a, b) => a.nightlyRate - b.nightlyRate);
}

/** Cities that have at least one property, for the destination step. */
export async function getDestinations(): Promise<string[]> {
  const all = await getProperties();
  return Array.from(new Set(all.map(p => p.city))).sort();
}
```

Note: if the `tenants` table has no `city` column, live properties simply get skipped (defensive `if (!city)`), and catalog fallback covers everything — the feature still works. Adding a `city` column to `tenants` is a future enhancement, out of scope here.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/tripPlanner.properties.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tripPlanner/properties.ts src/test/tripPlanner.properties.test.ts
git commit -m "feat(planner): add property source with live/catalog merge and tests"
```

---

## Task 6: Plan message formatter (TDD)

**Files:**
- Create: `src/lib/tripPlanner/planMessage.ts`
- Test: `src/test/tripPlanner.planMessage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { formatPlanMessage } from '../lib/tripPlanner/planMessage';
import type { TripPlan } from '../lib/tripPlanner/types';

const plan: TripPlan = {
  destination: 'Kodaikanal',
  startDate: '2026-07-02',
  nights: 2,
  people: 2,
  tier: 'budget',
  property: {
    id: 'catalog-8', name: 'Verdant Valley Resort', city: 'Kodaikanal', type: 'Villa',
    nightlyRate: 2500, tier: 'budget', image: 'x', source: 'catalog',
  },
  budgetBreakdown: { budget: 10000, stayCost: 5000, transportReserve: 2000, freeBudget: 3000, overBudget: false },
  itinerary: [
    { day: 1, attractions: [{ name: "Dolphin's Nose", distanceKm: 8, suggestedMins: 90 }] },
    { day: 2, attractions: [{ name: "Coaker's Walk", distanceKm: 3, suggestedMins: 45 }] },
  ],
};

describe('formatPlanMessage', () => {
  it('includes destination, property, budget breakdown and itinerary', () => {
    const msg = formatPlanMessage(plan, 'Ravi');
    expect(msg).toContain('Kodaikanal');
    expect(msg).toContain('Verdant Valley Resort');
    expect(msg).toContain('₹5,000');       // stay cost
    expect(msg).toContain('₹2,000');       // transport reserve
    expect(msg).toContain("Dolphin's Nose");
    expect(msg).toContain('Ravi');
    expect(msg).toContain('Day 1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/tripPlanner.planMessage.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `planMessage.ts`**

```ts
import type { TripPlan } from './types';
import { formatINR } from '../booking';

export function formatPlanMessage(plan: TripPlan, guestName: string): string {
  const { destination, startDate, nights, people, property, budgetBreakdown, itinerary } = plan;
  const lines: string[] = [];
  lines.push(`🌴 *Your Triplooper Plan — ${destination}*`);
  lines.push('');
  lines.push(`Hi ${guestName}! Here's your trip plan:`);
  lines.push('');
  lines.push(`📍 Destination: ${destination}`);
  lines.push(`🗓️ Start: ${startDate} · ${nights} night${nights > 1 ? 's' : ''} · ${people} guest${people > 1 ? 's' : ''}`);
  lines.push(`🏠 Stay: ${property.name} (${property.type}) — ${formatINR(property.nightlyRate)}/night`);
  lines.push('');
  lines.push(`💰 *Budget*`);
  lines.push(`• Stay: ${formatINR(budgetBreakdown.stayCost)}`);
  lines.push(`• Cab / transport reserve: ${formatINR(budgetBreakdown.transportReserve)}`);
  lines.push(`• Free for food & activities: ${formatINR(budgetBreakdown.freeBudget)}`);
  lines.push('');
  if (itinerary.length && itinerary.some(d => d.attractions.length)) {
    lines.push(`🗺️ *Suggested Itinerary*`);
    for (const day of itinerary) {
      if (!day.attractions.length) continue;
      lines.push(`Day ${day.day}:`);
      for (const a of day.attractions) {
        lines.push(`  • ${a.name} (~${a.distanceKm}km, ~${a.suggestedMins} min)`);
      }
    }
    lines.push('');
  }
  lines.push(`We'll reach out to confirm. Safe travels! ✨`);
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/tripPlanner.planMessage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tripPlanner/planMessage.ts src/test/tripPlanner.planMessage.test.ts
git commit -m "feat(planner): add WhatsApp plan message formatter with tests"
```

---

## Task 7: `trip_leads` migration

**Files:**
- Create: `supabase/migrations/2026-07-01-trip-leads.sql`

- [ ] **Step 1: Write the migration**

```sql
create table if not exists public.trip_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  destination text,
  budget integer,
  nights integer,
  people integer,
  tier text,
  property_name text,
  property_id text,
  tenant_id uuid references public.tenants(id) on delete set null,
  plan jsonb,
  whatsapp_sent boolean not null default false
);

alter table public.trip_leads enable row level security;

-- Public planner: anyone may create a lead.
create policy "trip_leads_insert_anon"
  on public.trip_leads for insert
  to anon, authenticated
  with check (true);

-- Reads restricted to authenticated users (platform admin / owning tenant handled app-side).
create policy "trip_leads_select_authenticated"
  on public.trip_leads for select
  to authenticated
  using (true);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/2026-07-01-trip-leads.sql
git commit -m "feat(planner): add trip_leads table migration"
```

Note: applying the migration to the hosted DB (via `supabase db push` or dashboard) is a deploy step done by the maintainer, not part of local build/test.

---

## Task 8: Checkout submit helper (TDD)

**Files:**
- Create: `src/lib/tripPlanner/submitLead.ts`
- Test: extend `src/test/tripPlanner.planMessage.test.ts` is not appropriate — create `src/test/tripPlanner.submitLead.test.ts` with a mocked supabase.

- [ ] **Step 1: Write the failing test (mock supabase)**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
const invokeMock = vi.fn();
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: () => ({ insert: insertMock }),
    functions: { invoke: invokeMock },
  },
}));

import { submitLead } from '../lib/tripPlanner/submitLead';
import type { TripPlan } from '../lib/tripPlanner/types';

const basePlan: TripPlan = {
  destination: 'Ooty', startDate: '2026-07-02', nights: 2, people: 2, tier: 'standard',
  property: { id: 'live-x', name: 'Live Hotel', city: 'Ooty', type: 'Hotel', nightlyRate: 5000, tier: 'standard', image: 'x', source: 'live', tenantId: 'tenant-1' },
  budgetBreakdown: { budget: 20000, stayCost: 10000, transportReserve: 4000, freeBudget: 6000, overBudget: false },
  itinerary: [],
};

beforeEach(() => { insertMock.mockReset().mockResolvedValue({ error: null }); invokeMock.mockReset().mockResolvedValue({ data: { success: true }, error: null }); });

describe('submitLead', () => {
  it('inserts a lead and sends WhatsApp when property is a live tenant', async () => {
    const res = await submitLead(basePlan, 'Ravi', '9876543210');
    expect(insertMock).toHaveBeenCalledOnce();
    expect(invokeMock).toHaveBeenCalledWith('send-whatsapp', expect.objectContaining({
      body: expect.objectContaining({ tenant_id: 'tenant-1', phone: '9876543210' }),
    }));
    expect(res.whatsappSent).toBe(true);
  });

  it('inserts a lead but skips WhatsApp for catalog-only property', async () => {
    const catalogPlan = { ...basePlan, property: { ...basePlan.property, source: 'catalog' as const, tenantId: undefined } };
    const res = await submitLead(catalogPlan, 'Ravi', '9876543210');
    expect(insertMock).toHaveBeenCalledOnce();
    expect(invokeMock).not.toHaveBeenCalled();
    expect(res.whatsappSent).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/tripPlanner.submitLead.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `submitLead.ts`**

```ts
import { supabase } from '../supabaseClient';
import type { TripPlan } from './types';
import { formatPlanMessage } from './planMessage';

export interface SubmitResult { whatsappSent: boolean; leadStored: boolean; }

export async function submitLead(plan: TripPlan, name: string, phone: string): Promise<SubmitResult> {
  let leadStored = false;
  let whatsappSent = false;

  const { error: insertError } = await supabase.from('trip_leads').insert({
    name,
    phone,
    destination: plan.destination,
    budget: plan.budgetBreakdown.budget,
    nights: plan.nights,
    people: plan.people,
    tier: plan.tier,
    property_name: plan.property.name,
    property_id: plan.property.id,
    tenant_id: plan.property.tenantId ?? null,
    plan: plan as unknown as Record<string, unknown>,
    whatsapp_sent: false,
  });
  leadStored = !insertError;

  if (plan.property.source === 'live' && plan.property.tenantId) {
    const message = formatPlanMessage(plan, name);
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { tenant_id: plan.property.tenantId, phone, message },
    });
    whatsappSent = !error && !!(data as { success?: boolean })?.success;
  }

  return { whatsappSent, leadStored };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/tripPlanner.submitLead.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tripPlanner/submitLead.ts src/test/tripPlanner.submitLead.test.ts
git commit -m "feat(planner): add lead submit + WhatsApp send helper with tests"
```

---

## Task 9: Wizard shell + step orchestration

**Files:**
- Create: `src/components/tripPlanner/TripPlannerWizard.tsx`

- [ ] **Step 1: Implement the wizard shell**

Full-screen overlay using `motion/react` (already used in LandingPage). Holds `WizardState` and a `step` index (0–5). Renders the current step, passes `state`, an `update` callback, `onNext`, `onBack`. Uses `AnimatePresence` for transitions and a progress dots row. Computes `TripPlan` at the itinerary step via `buildBudgetBreakdown`, `getAttractions`, `spreadItinerary`.

```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { WizardState, TripPlan } from '../../lib/tripPlanner/types';
import { buildBudgetBreakdown, spreadItinerary } from '../../lib/tripPlanner/budgetEngine';
import { getAttractions } from '../../lib/tripPlanner/destinations';
import StepDestination from './steps/StepDestination';
import StepBudgetStayParty from './steps/StepBudgetStayParty';
import StepPropertyTier from './steps/StepPropertyTier';
import StepPropertyPick from './steps/StepPropertyPick';
import StepItineraryReview from './steps/StepItineraryReview';
import StepCheckout from './steps/StepCheckout';

const STEP_COUNT = 6;

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function TripPlannerWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({ startDate: tomorrowISO() });

  const update = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }));
  const next = () => setStep(s => Math.min(s + 1, STEP_COUNT - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const buildPlan = (): TripPlan | null => {
    if (!state.destination || !state.budget || !state.nights || !state.people || !state.tier || !state.property) return null;
    const budgetBreakdown = buildBudgetBreakdown(state.budget, state.property.nightlyRate, state.nights);
    const itinerary = spreadItinerary(getAttractions(state.property.city), state.nights);
    return {
      destination: state.destination, startDate: state.startDate || tomorrowISO(),
      nights: state.nights, people: state.people, tier: state.tier,
      property: state.property, budgetBreakdown, itinerary,
    };
  };

  return (
    <motion.div className="fixed inset-0 z-[1000] bg-white overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button onClick={onClose} aria-label="Close planner"
        className="fixed top-5 right-5 z-10 p-2 rounded-full bg-black/5 hover:bg-black/10">
        <X className="w-5 h-5" />
      </button>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="flex gap-2 mb-10 justify-center">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-8 bg-emerald-600' : 'w-4 bg-black/10'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            {step === 0 && <StepDestination state={state} update={update} onNext={next} />}
            {step === 1 && <StepBudgetStayParty state={state} update={update} onNext={next} onBack={back} />}
            {step === 2 && <StepPropertyTier state={state} update={update} onNext={next} onBack={back} />}
            {step === 3 && <StepPropertyPick state={state} update={update} onNext={next} onBack={back} />}
            {step === 4 && <StepItineraryReview plan={buildPlan()} update={update} onNext={next} onBack={back} />}
            {step === 5 && <StepCheckout plan={buildPlan()} onBack={back} onClose={onClose} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Typecheck (steps not yet created → expect missing-module errors, that's fine for now)**

Run: `echo "steps created in Task 10"`

- [ ] **Step 3: Commit after Task 10 (wizard + steps compile together).**

The wizard imports step files created in Task 10; commit both together at the end of Task 10 to keep the tree compiling.

---

## Task 10: Wizard steps

**Files:**
- Create: `src/components/tripPlanner/steps/StepDestination.tsx`
- Create: `src/components/tripPlanner/steps/StepBudgetStayParty.tsx`
- Create: `src/components/tripPlanner/steps/StepPropertyTier.tsx`
- Create: `src/components/tripPlanner/steps/StepPropertyPick.tsx`
- Create: `src/components/tripPlanner/steps/StepItineraryReview.tsx`
- Create: `src/components/tripPlanner/steps/StepCheckout.tsx`

- [ ] **Step 1: StepDestination**

```tsx
import React, { useEffect, useState } from 'react';
import type { WizardState } from '../../../lib/tripPlanner/types';
import { getDestinations } from '../../../lib/tripPlanner/properties';

interface Props { state: WizardState; update: (p: Partial<WizardState>) => void; onNext: () => void; }

export default function StepDestination({ update, onNext }: Props) {
  const [cities, setCities] = useState<string[]>([]);
  useEffect(() => { getDestinations().then(c => setCities([...c, 'Anywhere'])); }, []);

  const pick = (city: string) => { update({ destination: city }); onNext(); };

  return (
    <div>
      <h2 className="text-3xl font-semibold mb-2">Where are you going?</h2>
      <p className="text-black/50 mb-8">Pick a destination and we'll plan the rest.</p>
      <div className="grid grid-cols-2 gap-3">
        {cities.map(c => (
          <button key={c} onClick={() => pick(c)}
            className="p-5 rounded-2xl border border-black/10 text-left text-lg font-medium hover:border-emerald-500 hover:bg-emerald-50 transition">
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: StepBudgetStayParty**

```tsx
import React, { useState } from 'react';
import type { WizardState } from '../../../lib/tripPlanner/types';

interface Props { state: WizardState; update: (p: Partial<WizardState>) => void; onNext: () => void; onBack: () => void; }
const BUDGETS = [10000, 25000, 50000, 100000];

export default function StepBudgetStayParty({ state, update, onNext, onBack }: Props) {
  const [budget, setBudget] = useState<number | undefined>(state.budget);
  const [nights, setNights] = useState<number>(state.nights ?? 2);
  const [people, setPeople] = useState<number>(state.people ?? 2);

  const cont = () => { if (budget) { update({ budget, nights, people }); onNext(); } };

  return (
    <div>
      <button onClick={onBack} className="text-black/40 mb-4">← Back</button>
      <h2 className="text-3xl font-semibold mb-8">Your trip basics</h2>

      <label className="block font-medium mb-2">Budget</label>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {BUDGETS.map(b => (
          <button key={b} onClick={() => setBudget(b)}
            className={`p-4 rounded-xl border text-lg font-medium transition ${budget === b ? 'border-emerald-600 bg-emerald-50' : 'border-black/10'}`}>
            ₹{b.toLocaleString('en-IN')}
          </button>
        ))}
      </div>
      <input type="number" placeholder="Or enter custom budget (₹)" value={budget && !BUDGETS.includes(budget) ? budget : ''}
        onChange={e => setBudget(Number(e.target.value) || undefined)}
        className="w-full p-3 rounded-xl border border-black/10 mb-8" />

      <label className="block font-medium mb-2">Nights: {nights}</label>
      <input type="range" min={1} max={10} value={nights} onChange={e => setNights(Number(e.target.value))} className="w-full mb-8" />

      <label className="block font-medium mb-2">People: {people}</label>
      <input type="range" min={1} max={20} value={people} onChange={e => setPeople(Number(e.target.value))} className="w-full mb-10" />

      <button onClick={cont} disabled={!budget}
        className="w-full p-4 rounded-xl bg-emerald-600 text-white font-medium disabled:opacity-40">Continue</button>
    </div>
  );
}
```

- [ ] **Step 3: StepPropertyTier**

```tsx
import React from 'react';
import type { WizardState, PropertyTier } from '../../../lib/tripPlanner/types';

interface Props { state: WizardState; update: (p: Partial<WizardState>) => void; onNext: () => void; onBack: () => void; }
const TIERS: { key: PropertyTier; label: string; hint: string }[] = [
  { key: 'budget', label: 'Budget', hint: 'Comfortable & affordable (≤ ₹3,500/night)' },
  { key: 'standard', label: 'Standard', hint: 'Great mid-range stays (₹3,500–7,000/night)' },
  { key: 'premium', label: 'Premium', hint: 'Luxury & top-rated (₹7,000+/night)' },
];

export default function StepPropertyTier({ update, onNext, onBack }: Props) {
  const pick = (tier: PropertyTier) => { update({ tier }); onNext(); };
  return (
    <div>
      <button onClick={onBack} className="text-black/40 mb-4">← Back</button>
      <h2 className="text-3xl font-semibold mb-8">What kind of stay?</h2>
      <div className="space-y-3">
        {TIERS.map(t => (
          <button key={t.key} onClick={() => pick(t.key)}
            className="w-full p-5 rounded-2xl border border-black/10 text-left hover:border-emerald-500 hover:bg-emerald-50 transition">
            <div className="text-lg font-medium">{t.label}</div>
            <div className="text-sm text-black/50">{t.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: StepPropertyPick**

```tsx
import React, { useEffect, useState } from 'react';
import type { WizardState, PlannerProperty } from '../../../lib/tripPlanner/types';
import { getProperties } from '../../../lib/tripPlanner/properties';
import { buildBudgetBreakdown } from '../../../lib/tripPlanner/budgetEngine';
import { formatINR } from '../../../lib/booking';

interface Props { state: WizardState; update: (p: Partial<WizardState>) => void; onNext: () => void; onBack: () => void; }

export default function StepPropertyPick({ state, update, onNext, onBack }: Props) {
  const [items, setItems] = useState<PlannerProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProperties(state.destination).then(all => {
      const filtered = all.filter(p =>
        p.tier === state.tier &&
        p.nightlyRate * (state.nights ?? 1) <= (state.budget ?? 0));
      setItems(filtered);
      setLoading(false);
    });
  }, [state.destination, state.tier, state.nights, state.budget]);

  const choose = (p: PlannerProperty) => { update({ property: p }); onNext(); };

  return (
    <div>
      <button onClick={onBack} className="text-black/40 mb-4">← Back</button>
      <h2 className="text-3xl font-semibold mb-2">Choose your stay</h2>
      <p className="text-black/50 mb-8">Within your budget in {state.destination}.</p>
      {loading && <p className="text-black/40">Finding properties…</p>}
      {!loading && items.length === 0 && (
        <p className="text-black/50">No {state.tier} stays fit this budget. Try going back and raising the budget or changing the tier.</p>
      )}
      <div className="space-y-3">
        {items.map(p => {
          const b = buildBudgetBreakdown(state.budget ?? 0, p.nightlyRate, state.nights ?? 1);
          return (
            <button key={p.id} onClick={() => choose(p)}
              className="w-full flex gap-4 p-3 rounded-2xl border border-black/10 text-left hover:border-emerald-500 transition">
              <img src={p.image} alt={p.name} className="w-24 h-24 rounded-xl object-cover" />
              <div className="flex-1">
                <div className="text-lg font-medium">{p.name}</div>
                <div className="text-sm text-black/50">{p.type} · {p.city}</div>
                <div className="text-sm mt-1">{formatINR(p.nightlyRate)} × {state.nights} = {formatINR(b.stayCost)} · <span className="text-emerald-700">{formatINR(b.budget - b.stayCost)} left</span></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: StepItineraryReview**

```tsx
import React from 'react';
import type { TripPlan, WizardState } from '../../../lib/tripPlanner/types';
import { formatINR } from '../../../lib/booking';

interface Props { plan: TripPlan | null; update: (p: Partial<WizardState>) => void; onNext: () => void; onBack: () => void; }

export default function StepItineraryReview({ plan, onNext, onBack }: Props) {
  if (!plan) return <div><button onClick={onBack} className="text-black/40">← Back</button><p className="mt-6">Something's missing — please go back.</p></div>;
  const { budgetBreakdown: b, itinerary, property } = plan;
  const hasItinerary = itinerary.some(d => d.attractions.length);

  return (
    <div>
      <button onClick={onBack} className="text-black/40 mb-4">← Back</button>
      <h2 className="text-3xl font-semibold mb-2">Your plan for {plan.destination}</h2>
      <p className="text-black/50 mb-6">{property.name} · {plan.nights} nights · {plan.people} guests</p>

      <div className="rounded-2xl bg-emerald-50 p-5 mb-6">
        <div className="flex justify-between py-1"><span>Stay ({plan.nights} nights)</span><span>{formatINR(b.stayCost)}</span></div>
        <div className="flex justify-between py-1"><span>Cab / transport reserve</span><span>{formatINR(b.transportReserve)}</span></div>
        <div className="flex justify-between py-1"><span>Food & activities</span><span>{formatINR(b.freeBudget)}</span></div>
        <div className="flex justify-between py-1 border-t border-emerald-200 mt-2 pt-2 font-medium"><span>Total budget</span><span>{formatINR(b.budget)}</span></div>
      </div>
      {b.suggestion && <p className="text-sm text-amber-700 mb-6">💡 {b.suggestion}</p>}

      {hasItinerary ? (
        <div className="space-y-4 mb-8">
          {itinerary.map(day => day.attractions.length > 0 && (
            <div key={day.day}>
              <div className="font-medium mb-1">Day {day.day}</div>
              <ul className="text-sm text-black/60 space-y-1">
                {day.attractions.map(a => <li key={a.name}>• {a.name} — ~{a.distanceKm}km, ~{a.suggestedMins} min</li>)}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-black/50 mb-8">We'll craft a custom day-by-day itinerary for {plan.destination} and share it with you.</p>
      )}

      <button onClick={onNext} className="w-full p-4 rounded-xl bg-emerald-600 text-white font-medium">Continue to checkout</button>
    </div>
  );
}
```

- [ ] **Step 6: StepCheckout**

```tsx
import React, { useState } from 'react';
import { toast } from 'sonner';
import type { TripPlan } from '../../../lib/tripPlanner/types';
import { submitLead } from '../../../lib/tripPlanner/submitLead';

interface Props { plan: TripPlan | null; onBack: () => void; onClose: () => void; }

export default function StepCheckout({ plan, onBack, onClose }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!plan) return <div><button onClick={onBack} className="text-black/40">← Back</button><p className="mt-6">Something's missing — please go back.</p></div>;

  const submit = async () => {
    if (!name || !phone) { toast.error('Please enter your name and phone.'); return; }
    setSubmitting(true);
    try {
      const res = await submitLead(plan, name, phone);
      if (res.whatsappSent) toast.success('Your plan has been sent on WhatsApp!');
      else if (res.leadStored) toast.success("Got it! We'll reach out with your full plan shortly.");
      else toast.error('Could not save your request. Please try again.');
      if (res.leadStored) onClose();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="text-black/40 mb-4">← Back</button>
      <h2 className="text-3xl font-semibold mb-2">Almost there!</h2>
      <p className="text-black/50 mb-8">We'll send your complete {plan.destination} plan to your WhatsApp.</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
        className="w-full p-3 rounded-xl border border-black/10 mb-3" />
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp number" inputMode="tel"
        className="w-full p-3 rounded-xl border border-black/10 mb-8" />
      <button onClick={submit} disabled={submitting}
        className="w-full p-4 rounded-xl bg-emerald-600 text-white font-medium disabled:opacity-40">
        {submitting ? 'Sending…' : 'Send my plan on WhatsApp'}
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Typecheck the whole planner**

Run: `npx tsc --noEmit 2>&1 | grep tripPlanner || echo "no tripPlanner type errors"`
Expected: `no tripPlanner type errors`

- [ ] **Step 8: Commit wizard + steps together**

```bash
git add src/components/tripPlanner/TripPlannerWizard.tsx src/components/tripPlanner/steps/
git commit -m "feat(planner): add wizard shell and all six steps"
```

---

## Task 11: Floating button + landing page integration

**Files:**
- Create: `src/components/tripPlanner/TripPlannerButton.tsx`
- Modify: `src/pages/LandingPage.tsx`

- [ ] **Step 1: Implement the floating button (owns the wizard open state)**

```tsx
import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import TripPlannerWizard from './TripPlannerWizard';

export default function TripPlannerButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Plan with AI"
        className="fixed bottom-24 right-6 z-[900] flex items-center gap-2 px-5 py-3.5 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 hover:scale-105 transition-transform">
        <Sparkles className="w-5 h-5" />
        <span className="font-medium">Plan with AI</span>
      </button>
      <AnimatePresence>
        {open && <TripPlannerWizard onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
```

Note: `bottom-24` keeps it clear of the existing `FloatingWhatsApp` button (which sits at `bottom-6`). Verify in browser and adjust if they overlap.

- [ ] **Step 2: Mount it in LandingPage and replace the inline catalog import**

In `src/pages/LandingPage.tsx`:
1. Add import near the top: `import TripPlannerButton from '../components/tripPlanner/TripPlannerButton';`
2. Add import: `import { CATALOG_PROPERTIES } from '../lib/tripPlanner/catalog';`
3. Replace the inline `const initialProperties = [ ... 20 items ... ];` (lines ~112–131) with a mapping to the existing shape used by the page:

```tsx
  const initialProperties = CATALOG_PROPERTIES.map(p => ({
    id: p.id, name: p.name, loc: p.city, type: p.type, price: p.nightlyRate,
    rating: p.rating, image: p.image, tag: p.tag, subdomain: p.subdomain,
  }));
```

4. Mount the button just before the component's closing fragment/return tag (alongside other floating elements):

```tsx
      <TripPlannerButton />
```

- [ ] **Step 3: Typecheck & build**

Run: `npx tsc --noEmit 2>&1 | grep -E "LandingPage|tripPlanner" || echo "ok"`
Expected: `ok`
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/tripPlanner/TripPlannerButton.tsx src/pages/LandingPage.tsx
git commit -m "feat(planner): add floating button and wire into landing page"
```

---

## Task 12: Full suite + manual verification

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all tests pass (existing + 4 new planner test files).

- [ ] **Step 2: Manual browser verification**

Run: `npm run dev` and open `http://localhost:3000`.
Verify:
- "Plan with AI" button visible, doesn't overlap the WhatsApp button.
- Destination step lists cities + "Anywhere".
- Budget/nights/people step works; custom budget input works.
- Tier step → property list filtered by tier + budget; cost preview correct (e.g. budget property in Kodaikanal shows `₹X × nights = stay · left`).
- Over-budget case: pick high budget + low tier with no fits → friendly empty message.
- Itinerary shows day-by-day for a curated city (Ooty/Kodaikanal/Pondicherry/Chennai) and the "custom plan" message for others.
- Checkout: entering name + phone → toast; catalog pick shows "we'll reach out", no console errors.
- Mobile viewport (dev tools) layout is usable.

- [ ] **Step 3: Final commit if any tweaks were needed**

```bash
git add -A
git commit -m "fix(planner): manual verification tweaks"
```

---

## Self-Review

**Spec coverage:**
- §2 decisions → Tasks 5 (live/catalog), 4 (curated itinerary), 8 (WhatsApp+lead), 3 (transport line), 11 (floating button+wizard), 3 (tiers), 5 (`getDestinations` auto list). ✅
- §4 wizard flow → Tasks 9–10 (all six steps in order). ✅
- §5 budget engine → Task 3 (bands, stayCost, remaining, reserve clamp, feasibility, spread) with the exact worked example asserted. ✅
- §6 data sources → Tasks 2 (catalog), 4 (destinations), 5 (properties merge). ✅
- §7 checkout/WhatsApp + `trip_leads` → Tasks 7 (migration), 8 (submitLead with live-vs-catalog branch). ✅
- §8 testing → budgetEngine, properties, planMessage, submitLead unit tests + manual (Task 12). ✅
- §9 open items → resolved in header (live-tenant WA + lead fallback; tomorrow default; catalog extracted). ✅

**Type consistency:** `PlannerProperty`, `TripPlan`, `BudgetBreakdown`, `WizardState`, `PropertyTier` defined in Task 1 and used unchanged in Tasks 3/5/6/8/9/10. `buildBudgetBreakdown`, `spreadItinerary`, `tierForRate`, `getAttractions`, `getProperties`, `getDestinations`, `catalogToPlanner`, `mergeSources`, `formatPlanMessage`, `submitLead` — names consistent across definition and call sites. ✅

**Placeholder scan:** every code step contains full code; no TBD/TODO. ✅
