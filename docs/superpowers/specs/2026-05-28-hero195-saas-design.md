# Hero195 SaaS Hero Integration — Design Spec

**Date:** 2026-05-28
**Status:** Approved (design)
**Target:** EasyStay SaaS marketing landing (`SaaSHome.tsx`)
**Owner:** Ganesh-resedence / EasyStay CRM

---

## 1. Goal & Scope

### Goal
Replace the existing inline hero `<section>` in `src/pages/SaaSHome.tsx` with a new `<Hero195 />` component that pairs the existing marketing copy with a live-feeling preview card of the **real EasyStay CRM dashboard** (stats, charts, activity feed) — so prospective hotel owners see the actual product, not a stock illustration.

### In scope
- New split-screen hero on the SaaS landing page (`/` route → `SaaSHome`).
- Embed a compact, tabbed dashboard preview (Overview / Bookings / Occupancy) inside the right-hand card.
- Use the project's existing forest / gold / cream / success palette via Tailwind v4 `@theme` tokens.
- Auto-advance the tabs (4 s interval) on first mount; pause once the visitor clicks a tab.
- Extract dashboard sample data into a shared module so the hero teaser and the deeper `DashboardPreview` section stay in sync.

### Out of scope
- No changes to authentication (`AuthContext`, Clerk, Supabase, SSO callback).
- No changes to routing, protected routes, or platform-admin gating.
- No changes to `DashboardPreview.tsx`'s **visual layout** — only its data source.
- No edits to the unused `src/components/saas/HeroSection.tsx` file (left as-is; can be removed in a follow-up).
- No dark-mode work, no i18n, no analytics wiring beyond what already exists on the CTAs.

### Success criteria
- `SaaSHome.tsx` renders `<Hero195 />` in place of the inline hero block; existing CTAs (`/signup`, Book-a-Demo external link) still work.
- Hero card displays three working tabs with EasyStay's real Jan–Jun revenue, occupancy, and booking-source data.
- Tabs cycle automatically every 4 s until the user clicks one.
- Lighthouse mobile + desktop scores for the landing page do not regress.
- `npm run build` and `npm test` pass.

---

## 2. File Plan

### New files
| Path | Purpose |
|---|---|
| `src/components/ui/tabs.tsx` | shadcn-style wrapper around `@radix-ui/react-tabs` (Tabs, TabsList, TabsTrigger, TabsContent). |
| `src/components/ui/border-beam.tsx` | CSS-only animated border component driven by `offset-path` / `offset-distance`. |
| `src/components/saas/Hero195.tsx` | The hero component itself. |
| `src/components/saas/hero-data.ts` | Single source of truth for `revenueData`, `occupancyData`, `sourceData`, `stats`, `activities`, `COLORS`. |
| `src/test/Hero195.test.tsx` | Vitest smoke test. |

### Edited files
| Path | Change |
|---|---|
| `src/pages/SaaSHome.tsx` | Replace the inline `{/* ═══════ 1. HERO ═══════ */}` block with `<Hero195 />`. Switch its `framer-motion` import to `motion/react` so the page matches the rest of `saas/`. |
| `src/components/saas/DashboardPreview.tsx` | Remove the inline data arrays; import them from `./hero-data`. No visual change. |
| `src/index.css` | Inside the existing `@theme` block, add `--animate-border-beam: border-beam calc(var(--duration)*1s) infinite linear;`. Below the block, add `@keyframes border-beam { 100% { offset-distance: 100%; } }`. |
| `package.json` | Add `"@radix-ui/react-tabs": "^1.1.2"` to `dependencies`. (CVA, clsx, tailwind-merge, lucide, recharts, motion are already present.) |

### Files explicitly NOT touched
- `src/components/saas/HeroSection.tsx` (unused; deletion deferred).
- `src/context/AuthContext.tsx`, anything under `src/auth/`, `src/components/SSOCallback.tsx`.
- `src/components/saas/DashboardPreview.tsx`'s JSX layout, charts, or styling.

---

## 3. Component Architecture

### 3.1 `Hero195` layout
```
<section> (full-bleed, cream background, py-20)
  <div className="container grid lg:grid-cols-2 gap-12 items-center">
    LEFT — copy column
      <Badge pill> New: AI-Powered Revenue Engine </Badge>
      <h1>  All-in-One Hotel & Restaurant Management </h1>
      <p>   (existing sub-headline, verbatim) </p>
      <div className="flex gap-3">
        <Button asChild><Link to="/signup">Start Free Trial</Link></Button>
        <Button variant="outline" asChild><a href="…">Book a Demo</a></Button>
      </div>
      <p className="trust-row">★ 4.8/5 · 120+ properties · Free 14-day trial</p>

    RIGHT — preview card
      <Card className="relative overflow-hidden">
        <BorderBeam size={250} duration={12}
                    colorFrom="#C9A646" colorTo="#0E2A38" />
        <div className="browser-chrome">  ● ● ●  app.esaystay.com  </div>
        <Tabs defaultValue="overview" onValueChange={pauseAutoplay}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">  …stat cards + revenue LineChart  </TabsContent>
          <TabsContent value="bookings">  …source PieChart + activity feed  </TabsContent>
          <TabsContent value="occupancy"> …occupancy BarChart + 85% gauge   </TabsContent>
        </Tabs>
      </Card>

      {/* floating badges (hidden < md) */}
      <motion.div className="absolute top-2 right-2"> +28% Direct bookings </motion.div>
      <motion.div className="absolute -bottom-3 -left-3"> 3× faster Reconciliation </motion.div>
  </div>
</section>
```

### 3.2 Tab contents
- **Overview** — 2×2 grid of compact stat cards (Total Revenue ₹24,50,000 / Occupancy 85 % / Bookings 342 / Pending ₹1,25,000), each with a lucide icon in the gold/forest palette; below the grid, a 120-px-tall `<LineChart>` of `revenueData`.
- **Bookings** — Left half: `<PieChart>` of `sourceData` (Direct 45 / Agoda 25 / MakeMyTrip 20 / Goibibo 10) with a centred "₹24.5 L total" label. Right half: scrollable `activities` list (Agoda booking, payment received, room cleaned, guest check-in) with relative-time stamps and lucide icons.
- **Occupancy** — 220-px `<BarChart>` of `occupancyData` for the last 6 months, plus a circular 85 % gauge built from a CSS conic-gradient.

### 3.3 Tab autoplay behaviour
- `useEffect` starts a `setInterval(4000)` that cycles `overview → bookings → occupancy → overview …`.
- The component owns a `paused` boolean (default `false`). `Tabs.onValueChange` sets `paused = true` and clears the interval.
- Cleanup function clears the interval on unmount.
- Respect `prefers-reduced-motion: reduce` — when set, do not start the interval at all.

### 3.4 Responsiveness
- `lg` (≥ 1024 px) and above: split grid as drawn above.
- Below `lg`: stack vertically (copy first, card second), card max-width 28 rem centred.
- Below `md` (< 768 px): hide both floating badges; chart heights drop to 96 px; stat-card grid stays 2×2 but with smaller type.

### 3.5 New shadcn primitives
- **`tabs.tsx`** — thin `forwardRef` wrappers around the four `@radix-ui/react-tabs` parts plus a `cn()`-merged base class. `TabsTrigger` styling: pill, forest text, gold underline + gold background when `data-state="active"`.
- **`border-beam.tsx`** — accepts `size`, `duration`, `colorFrom`, `colorTo`, `delay`, `className`; renders one absolutely-positioned div whose ::after uses `offset-path: rect()`, `animation: var(--animate-border-beam)`, and a linear-gradient mask in the two colours. No JS animation, no extra deps.

---

## 4. Data Flow, Theming & Testing

### 4.1 Shared data module — `src/components/saas/hero-data.ts`
```ts
export const revenueData = [
  { month: 'Jan', revenue: 180000 }, /* … through Jun … */
];
export const occupancyData = [ /* { month, percentage } × 6 */ ];
export const sourceData = [
  { name: 'Direct',     value: 45, color: '#C9A646' },
  { name: 'Agoda',      value: 25, color: '#10b981' },
  { name: 'MakeMyTrip', value: 20, color: '#3b82f6' },
  { name: 'Goibibo',    value: 10, color: '#64748b' },
];
export const stats = [
  { label: 'Total Revenue', value: '₹24,50,000', delta: '+12%', icon: 'IndianRupee' },
  { label: 'Occupancy',     value: '85%',        delta: '+5%',  icon: 'BedDouble'   },
  { label: 'Bookings',      value: '342',        delta: '+18%', icon: 'CalendarCheck' },
  { label: 'Pending',       value: '₹1,25,000',  delta: '-3%',  icon: 'Clock'       },
];
export const activities = [ /* { icon, title, detail, time } × 4 */ ];
export const COLORS = ['#C9A646', '#10b981', '#3b82f6', '#64748b'] as const;
```
Both `Hero195` and `DashboardPreview` import from this module. No hard-coded data inside either component.

### 4.2 Theming
- All colours come from the existing Tailwind v4 `@theme` tokens in `src/index.css`: `--color-primary` (forest #0E2A38), `--color-accent` (gold #C9A646), `--color-background` (cream #F7F4EF), `--color-success` (#2E7D5B), `--color-accent-foreground` (#FFFFFF), plus the ocean scale.
- Hard-coded hex values appear only inside chart `<Cell>` props and `BorderBeam` defaults — both routed through `hero-data.ts` or component props.
- Fonts: Sora for the h1 (`font-serif`), Inter for everything else (`font-sans`) — already loaded.

### 4.3 New CSS in `src/index.css`
```css
@theme {
  /* …existing tokens stay unchanged… */
  --animate-border-beam: border-beam calc(var(--duration) * 1s) infinite linear;
}
@keyframes border-beam {
  100% { offset-distance: 100%; }
}
```

### 4.4 Motion library
- Use `motion/react` (the v12 motion package, already installed).
- The page-level `SaaSHome.tsx` will have its lingering `import { motion } from 'framer-motion'` swapped to `import { motion } from 'motion/react'` in the same change, so the file no longer mixes libraries.
- No new `framer-motion` install.

### 4.5 Accessibility
- `<Tabs>` uses Radix, which provides correct ARIA roles and keyboard navigation (←/→/Home/End).
- Floating badges have `aria-hidden="true"` (decorative).
- All chart containers carry an `aria-label` describing the metric.
- The autoplay interval pauses when the user focuses a `TabsTrigger`, not just on click.
- `prefers-reduced-motion: reduce` disables both the autoplay and the BorderBeam animation (set `animation: none` via a media query in `border-beam.tsx`'s style block).

### 4.6 Testing — `src/test/Hero195.test.tsx`
Vitest + Testing Library smoke test asserting:
1. The hero renders the h1 text "All-in-One Hotel & Restaurant Management".
2. Three `TabsTrigger`s with names Overview, Bookings, Occupancy are present.
3. Clicking the **Bookings** tab reveals the activity feed (queries by an activity title from `hero-data.ts`).
4. The "Start Free Trial" link points to `/signup`.

No visual regression / snapshot tests in this pass — the Vitest setup already in the repo has no image-diff tooling.

### 4.7 Build & verification
- `npm install` (adds `@radix-ui/react-tabs`).
- `npm run build` must succeed with no new TypeScript errors.
- `npm test` must pass including the new smoke test.
- Manual check: visit `/` on dev server, confirm tabs auto-advance, click any tab to pause, resize to 375 px / 768 px / 1280 px and verify layout.

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `motion/react` vs `framer-motion` mixed in repo causes bundle bloat. | Migrate `SaaSHome.tsx`'s import in the same change; document in the implementation plan. |
| Radix Tabs adds ~5 KB gz. | Acceptable — already implicit via CVA's transitive deps; no other tabs in repo to share. |
| Auto-advancing tabs annoy users. | 4 s cadence + permanent pause on first interaction + `prefers-reduced-motion` opt-out. |
| Data drift between Hero195 and DashboardPreview. | `hero-data.ts` is the single import path; eslint can flag direct array literals in a later pass. |
| BorderBeam's `offset-path` not supported on very old Safari. | Visually degrades to a static border — no functional impact. |

---

## 6. Open Questions

None at design time. All four clarification questions (target hero, build-from-scratch vs lift, tab set, copy) were resolved during the brainstorm.
