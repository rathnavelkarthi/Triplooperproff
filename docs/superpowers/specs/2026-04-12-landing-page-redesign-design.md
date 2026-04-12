# EasyStay Landing Page Redesign — Apple-Inspired "Product Cinema"

**Date:** 2026-04-12
**Approach:** Product Cinema (Apple.com / Linear.app / Stripe.com aesthetic)
**Target Audience:** Mid-size hotel operators (20-100 rooms)
**Tech Stack:** React 19 + Vite + Tailwind CSS + Framer Motion

---

## Design System

Based on `DESIGN.md` (Apple design tokens):

| Token | Value | Usage |
|-------|-------|-------|
| Black | `#000000` | Hero, dark sections, final CTA |
| Light Gray | `#f5f5f7` | Alternating light sections |
| Near Black | `#1d1d1f` | Text on light backgrounds |
| Apple Blue | `#0071e3` | CTAs, interactive elements only |
| Link (dark) | `#2997ff` | Links on dark backgrounds |
| Body (light) | `rgba(0,0,0,0.8)` | Body text on light bg |
| Body (dark) | `#ffffff` | Body text on dark bg |
| Card shadow | `rgba(0,0,0,0.22) 3px 5px 30px 0px` | Elevated cards |
| Nav glass | `backdrop-filter: saturate(180%) blur(20px)` on `rgba(0,0,0,0.6)` | Sticky nav |
| Font Display | `SF Pro Display, Helvetica Neue, Helvetica, Arial, sans-serif` | 20px+ headings |
| Font Body | `SF Pro Text, Helvetica Neue, Helvetica, Arial, sans-serif` | Body text <20px |
| Spacing base | 8px | All spacing multiples |
| Content width | 980px | Max container width |
| Radius (pill) | 980px | CTA buttons |
| Radius (card) | 18px | Cards, modules |

---

## Animation System (Framer Motion)

All animations use spring physics, not linear easing.

| Pattern | Config | Usage |
|---------|--------|-------|
| Fade + slide up | `opacity: 0→1, y: 30→0, spring stiffness: 100` | Section reveals |
| Stagger children | `staggerChildren: 0.1` | Lists, grids |
| Hover lift | `scale: 1.02–1.05, transition: spring` | Cards, buttons |
| Float loop | `y: [-5, 5], repeat: Infinity, duration: 3` | Floating badges |
| Scroll reveal | `whileInView, viewport: { once: true, margin: '-10%' }` | All sections |
| Parallax | `useMotionValue + useTransform on mouse move` | Hero dashboard |
| Button glow | `box-shadow expand on hover` | CTA buttons |

### Premium Touches
- **Cursor glow effect** — subtle radial gradient follows cursor on dark sections
- **Grain texture** — CSS noise overlay at ~3% opacity on dark sections
- **Smooth scrolling** — Lenis-style smooth scroll behavior
- **Micro-interactions** — button hover = glow + slight expand, link hover = color shift

---

## Section 1: Navbar (Glassmorphism)

**Position:** Fixed top, z-50
**Background:** `rgba(0,0,0,0.6)` with `backdrop-filter: saturate(180%) blur(20px)`
**Scroll behavior:** Shrinks slightly + becomes solid `rgba(0,0,0,0.9)` on scroll

### Layout
- **Left:** Logo — white "E" in Apple Blue (`#0071e3`) rounded square + "EasyStay" wordmark in white
- **Center:** `Features` | `Modules` | `Pricing` — smooth scroll anchor links, 14px, `rgba(255,255,255,0.8)`, hover → white
- **Right:**
  - `Sign In` — text link, white, no bg
  - `Start Free` — Apple Blue pill button (`#0071e3`, white text, 980px radius, 8px 22px padding)

### Mobile (< 834px)
- Logo left, hamburger right
- Slide-down panel with spring animation
- Full-width nav links + CTA

### Component: `src/components/landing/Navbar.tsx`

---

## Section 2: Hero (Full Viewport, Black)

**Background:** Pure black `#000`
**Height:** 100vh minimum
**Content alignment:** Center-left text, center-right product visual

### Content

**Headline:**
> Your entire hotel. One screen.

- SF Pro Display, 56px desktop / 36px mobile
- White `#fff`
- Font weight 700
- Letter spacing: -0.03em

**Subtext:**
> Bookings. POS. Guests. Revenue. Everything connected, everything real-time.

- 21px desktop / 17px mobile
- `rgba(255,255,255,0.7)`
- Font weight 400
- Max width 480px

**CTAs (horizontal row):**
1. `Start Free Trial` — Apple Blue pill, glow on hover (`0 0 20px rgba(0,113,227,0.4)`)
2. `Watch Demo` — white outline pill, Play icon left, hover → fill white with dark text

### Hero Visual (CRITICAL)
- **Floating dashboard mockup** — a styled representation of the EasyStay CRM dashboard
- 3D perspective: `perspective: 1200px, rotateY(-5deg), rotateX(3deg)`
- Soft glow shadow: `0 25px 80px rgba(0,113,227,0.15)`
- Depth layering: multiple UI card elements at different z-depths
- **Parallax on mouse move** — dashboard tilts subtly following cursor
- Spring entrance animation: fade in + scale from 0.95 → 1

### Floating Metric Badges
Three small floating pills that animate in with stagger:
1. "98% uptime" — green dot
2. "2min setup" — clock icon
3. "₹0 commission" — trending up icon

Animation: staggered fade-in (0.3s delay each) + continuous float loop (y: -5 to 5, 3s duration)

### Component: `src/components/landing/Hero.tsx`

---

## Section 3: Problem → Solution Transformation

### Part 1 — "The Old Way" (Light bg `#f5f5f7`)

**Padding:** py-24 lg:py-32

**Label:** "THE PROBLEM" — 12px uppercase, tracking-[0.2em], `rgba(0,0,0,0.4)`

**Headline:**
> Hotels are drowning in disconnected tools.

- 42px, `#1d1d1f`, font-weight 800

**Pain point cards** — scroll-reveal, slide in one-by-one from left:
1. Icon: TrendingDown | Stat: "23%" | Label: "Revenue leaked to OTA commissions" | Color: `#E74C3C`
2. Icon: Clock | Stat: "4.2hrs" | Label: "Staff time wasted daily" | Color: `#F39C12`
3. Icon: Layers | Stat: "6+" | Label: "Disconnected tools juggled" | Color: `#9B59B6`

Each card: white bg, rounded-18px, subtle shadow, icon left, stat large, label below.

### Transition

After cards, centered text:
> "There's a better way."

Smooth crossfade: light bg fades to black bg over 100vh scroll distance.

### Part 2 — "The EasyStay Way" (Dark bg `#000`)

Same 3 stats, but the positive version with subtle blue glow:
1. "₹0" — "Commission on direct bookings" | Apple Blue glow
2. "4.2hrs" — "Saved every day" | Apple Blue glow
3. "1" — "Unified platform" | Apple Blue glow

### Component: `src/components/landing/ProblemSolution.tsx`

---

## Section 4: Module Deep Dives (Apple-Style Core Sections)

Four full-viewport sections, each showcasing one core module. Alternating dark/light backgrounds.

### Layout Pattern (all 4 sections)
- Full viewport height (min-h-screen)
- Two-column: text left (40%), visual right (60%)
- Section label: 12px uppercase, tracking-wide, muted color
- Headline: 42px, bold
- Bullets: max 3, with check icons in Apple Blue
- Visual: styled mockup of the module UI
- Scroll-triggered slide-in animation (text from left, visual from right)

---

### 4A: Booking Engine (Dark bg `#000`)

**Label:** "DIRECT BOOKINGS"

**Headline:**
> Zero-commission direct bookings.

**Bullets:**
- 4-step booking flow with real-time availability
- Occupancy-based dynamic pricing
- WhatsApp confirmation on autopilot

**Visual:** Mockup of the booking flow — date picker → room selection → guest form → payment (Razorpay). Styled as floating cards with depth.

### 4B: Hotel CRM (Light bg `#f5f5f7`)

**Label:** "GUEST MANAGEMENT"

**Headline:**
> Every guest, every detail.

**Bullets:**
- Guest profiles with booking history and preferences
- Visual calendar with drag-and-drop reservations
- GST-compliant invoices generated in one click

**Visual:** CRM dashboard mockup showing guest list, profile card, and calendar view.

### 4C: Restaurant POS (Dark bg `#000`)

**Label:** "RESTAURANT"

**Headline:**
> Front desk to kitchen, connected.

**Bullets:**
- Dine-in, takeaway, and room service in one POS
- QR-based table ordering for guests
- Real-time kitchen order tracking (KOT)

**Visual:** POS interface mockup showing order screen, table map, and KOT display.

### 4D: Analytics (Light bg `#f5f5f7`)

**Label:** "INSIGHTS"

**Headline:**
> Revenue clarity, not guesswork.

**Bullets:**
- Revenue, occupancy, and channel mix dashboards
- Profit & Loss tracking with expense categories
- Exportable reports for accountants

**Visual:** Analytics dashboard with charts, occupancy graph, and P&L summary.

### Shared Component: `src/components/landing/ModuleSection.tsx`
- Accepts props: `label`, `headline`, `bullets`, `visual`, `dark` (boolean), `reversed` (boolean)
- Reusable for all 4 sections

---

## Section 5: Social Proof (Light bg `#f5f5f7`)

**Padding:** py-20 lg:py-28

### Layout
- **Label:** "TRUSTED BY HOTELIERS" — 12px, uppercase, muted
- **Headline:** "Hotels that switched never looked back." — 36px, `#1d1d1f`

### Testimonial Cards (3 cards in a row)
- White bg, rounded-18px, subtle shadow
- Quote text: 17px, `rgba(0,0,0,0.8)`, italic
- Author: Hotel name + Location, 14px, bold
- No heavy styling — Apple-clean

### Optional: Logo Strip
- Grayscale partner/hotel logos
- Color on hover (filter transition)

### Component: `src/components/landing/Testimonials.tsx`

---

## Section 6: Pricing (Dark bg `#000`)

**Padding:** py-24 lg:py-32

### Header
- **Label:** "PRICING" — 12px, uppercase, `rgba(255,255,255,0.4)`
- **Headline:** "Simple pricing. No surprises." — 42px, white
- **Toggle:** Monthly / Yearly — animated pill toggle, yearly shows "Save 20%"

### 4 Pricing Cards (glass style)
Background: `rgba(255,255,255,0.05)` with `backdrop-filter: blur(10px)` and 1px `rgba(255,255,255,0.1)` border.

| Tier | Monthly | Yearly | Highlight |
|------|---------|--------|-----------|
| Starter | Free | Free | — |
| Growth | ₹2,499 | ₹23,999/yr | — |
| **Pro** | **₹4,999** | **₹47,999/yr** | **Apple Blue border glow** |
| Enterprise | ₹9,999 | ₹95,999/yr | "Contact us" |

**Pro card** is highlighted:
- Apple Blue border: `1px solid #0071e3`
- Glow: `0 0 30px rgba(0,113,227,0.2)`
- "Most Popular" badge at top

**Each card:**
- Tier name: 24px, white, bold
- Tagline: 14px, `rgba(255,255,255,0.5)`
- Price: 48px, white, bold + "/mo" in small text
- Feature list: check icon (Apple Blue) + text (white, 15px)
- CTA: Apple Blue pill (Pro), outline pill (others)

**Interactions:**
- Hover: slight lift (translateY: -4px) + shadow glow increase
- Toggle: animated slide with spring physics

### Component: `src/components/landing/Pricing.tsx`

---

## Section 7: Final CTA (Black bg `#000`)

**Padding:** py-32 lg:py-40
**Alignment:** Center

**Headline:**
> Ready to run your hotel from one screen?

- 48px, white, bold, max-width 700px

**CTA:** `Start Free Trial` — Large Apple Blue pill, centered, glow hover

**Subtext:**
> No credit card required. Set up in 2 minutes.

- 15px, `rgba(255,255,255,0.5)`

### Component: `src/components/landing/CTA.tsx`

---

## Section 8: Footer (Dark `#1d1d1f`)

Minimal Apple-style footer:
- **Top row:** 4 columns — Product (Features, Pricing, How It Works), Company (Contact), Legal (Privacy, Terms), Support (Help Center)
- **Bottom row:** "© 2026 EasyStay" left, "Staff Portal" link right (tiny, muted)
- All text: 12-14px, `rgba(255,255,255,0.5)`, hover → white

### Component: `src/components/landing/Footer.tsx`

---

## Component Structure

All new components go in `src/components/landing/`:

```
src/components/landing/
├── Navbar.tsx
├── Hero.tsx
├── ProblemSolution.tsx
├── ModuleSection.tsx
├── Testimonials.tsx
├── Pricing.tsx
├── CTA.tsx
└── Footer.tsx
```

The main SaaS landing page route (`/`) in `App.tsx` will be updated to import from `landing/` instead of `saas/`.

Old `src/components/saas/` files remain untouched (kept as backup) — we create entirely new components.

---

## Responsive Breakpoints

| Breakpoint | Width | Key Changes |
|-----------|-------|-------------|
| Mobile | < 640px | Single column, 36px headlines, stacked CTAs, hamburger nav |
| Tablet | 640-1024px | 2-column grids begin, 42px headlines |
| Desktop | > 1024px | Full layout, 56px hero headline, side-by-side modules |

---

## Performance Considerations

- Lazy-load module section visuals (they are below the fold)
- Use `whileInView` with `viewport: { once: true }` to prevent re-triggering animations
- Dashboard mockups are CSS/HTML-based (not images) for fast loading
- Smooth scroll via CSS `scroll-behavior: smooth` (not a heavy JS library)
- Keep total new bundle size under 50KB gzipped (components + framer-motion already in deps)

---

## Integration Points

- **Clerk auth:** `Start Free Trial` and `Sign In` link to Clerk sign-up/sign-in flows (existing)
- **Pricing page:** `View Full Pricing` links to existing `/pricing` route
- **Smooth scroll:** Feature/Module/Pricing nav links scroll to section IDs
- **Existing routes:** All other routes (`/booking`, `/admin/*`, `/:subdomain`) remain unchanged
- **SaaSNavbar import in App.tsx:** Replace with new `landing/Navbar`

---

## Out of Scope

- Tenant-facing site redesign (stays as-is)
- CRM/admin UI changes
- Booking engine flow changes
- New backend/API changes
- Image/photo assets (mockups are CSS-rendered)
