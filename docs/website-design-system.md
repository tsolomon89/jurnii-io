# Jurnii Website — Design System

> **Scope:** jurnii.io implementation — architecture, components, motion, and voice.  
> **Brand & platform tokens** (palettes, semantic chains, all themes) → [design-system.md](./design-system.md)  
> **Source of truth in code:** [`assets/global.css`](../assets/global.css) (tokens), [`assets/site.css`](../assets/site.css) (components), [`assets/site.jsx`](../assets/site.jsx) (shared React).

Reference for building and extending jurnii.io. Hand this to Cursor (or any dev)
so new pages and components match the existing site exactly.

Jurnii is a **commercial intelligence platform for iGaming operators** (UX benchmarking,
competitor promotion tracking, marketing-mix modelling). The site voice is precise,
confident, and anti-fluff — no marketing slop, no emoji, straight talk.

---

## Document hierarchy

| Doc | Owns |
|-----|------|
| [design-system.md](./design-system.md) | Primitive palettes, semantic token tables, theme alias chains, spacing/radius/type **tokens** |
| **This file** | Static-site architecture, Babel conventions, component catalog, motion, voice, page checklist |

Do not duplicate full token tables here — look them up in the brand doc or `global.css`.

---

## 1. Architecture

The site is **static HTML pages** that mount **React 18 via inline Babel** (no build step).
Every page shares one CSS + component layer.

### Load order (every page `<head>`/`<body>`)
```html
<html data-theme="light">
<head>
  <link rel="icon" href="assets/jurnii-icon-light.svg">
  <link rel="stylesheet" href="assets/site.css">   <!-- @imports global.css -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <!-- React 18.3.1 + ReactDOM + Babel standalone (pinned, with integrity hashes) -->
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" src="assets/site.jsx"></script>       <!-- Nav, Footer, PageChrome, theme -->
  <script type="text/babel" src="assets/blocks.jsx"></script>     <!-- shared section blocks -->
  <script type="text/babel" src="assets/…">…page-specific…</script>
  <script type="text/babel">
    function App(){ return <PageChrome active="home">…sections…</PageChrome>; }
    // poll until all needed globals exist, then ReactDOM.createRoot(...).render(<App/>)
  </script>
  <script src="assets/headline-split.js"></script>
</body>
```

### Key files
| File | Role |
|------|------|
| `assets/global.css` | **Design tokens** — colors, type scale, radii, spacing. Never hard-code values; use these. Full token reference → [design-system.md](./design-system.md). |
| `assets/site.css` | All component/layout styles (`@import`s global.css). |
| `assets/site.jsx` | `Nav`, `Footer`, `PageChrome`, `DemoCTA`, theme management, `NavLogo`, demo modal. |
| `assets/blocks.jsx`, `page-sections.jsx`, `home-sections.jsx` | Reusable page sections. |
| `assets/*-data.jsx` | Data separated from presentation (feature/solution/use-case/product/compare data). |
| `component-library.html` | **Living component gallery — check here first before building anything new.** |

### Conventions (critical for Babel setup)
- **Each `<script type="text/babel">` has its own scope.** Export shared components with
  `window.MyComponent = MyComponent;` at the end of the file, and read them off `window` elsewhere.
- **Never name a style object `styles`** — collisions break the page. Use component-scoped names
  (`const heroStyles = {…}`) or inline styles.
- Mount pattern polls for required globals before rendering (see any page's inline script).
- After DOM changes that add Lucide icons, call `window.lucide.createIcons()`.
- Wrap page content in `<PageChrome active="…">` — it renders Nav + Footer + DemoCTA + sticky CTA + theme tweaks and runs the scroll-reveal engine.

---

## 2. Theming

Themes are set with `data-theme` on `<html>`. Stored in `localStorage['jurnii-theme']`, applied before paint.

| Theme | Use |
|-------|-----|
| `light` | **Default.** Warm-neutral, near-white background. |
| `dark` | Dark warm-neutral (fully specified in CSS; not in the Nav theme cycle). |
| `jurnii-v1` | Blue Dianne teal brand theme. |

The Nav theme toggle cycles `light → jurnii-v1`. All three are fully specified in [design-system.md](./design-system.md) and `global.css`.

**Rule:** style with **semantic tokens** (`var(--foreground)`, `var(--card)`, …), never
primitives, so components adapt across all themes automatically. Theme-specific overrides use
`[data-theme="dark"] .x, [data-theme="jurnii-v1"] .x { … }`.

---

## 3. Color (website rules)

Full primitive + semantic tables → [design-system.md](./design-system.md) sections 1–2.  
Implemented CSS vars → [`assets/global.css`](../assets/global.css).

### Product accents (constant across themes)
- Jurnii UX: `--accent-ux #5299FF` / `-ink #2B6FD1`
- Jurnii 360: brand green
- Jurnii Cortex (MMM): `--accent-mmm #FFA852` / `-ink #B46915`

### Green usage rule
On light surfaces use `--accent-green` (deeper `jurnii-500`) — `jurnii-200` fails contrast on white.
Inside dark/teal use `jurnii-200`. Helper class `.ink-green` picks the right green per theme.

**Never invent new colors.** Reuse a token. If a genuinely new hue is unavoidable, define it in
`oklch()` matching the existing chroma/lightness of the nearest ramp.

Website-only extensions (`--tag-*`, `--avatar-*`, `--partial`, `--brand-glow`) are listed in
[design-system.md §8](./design-system.md#8-website-only-extensions).

---

## 4. Typography (website implementation)

Token scale (`--text-*`, `--fw-*`, heading tokens) → [design-system.md](./design-system.md) section 3.

- **Sans:** `Geist` (variable 100–900) — `--font-sans`. All UI + headings.
- **Mono:** `Geist Mono` — `--font-mono`. Eyebrows, labels, metadata, kickers, stat units.
- Serif token exists (`--font-serif`) but is essentially unused.
- Fonts self-hosted from `assets/fonts/`.

### Heading style (marketing site — weight 600, tight negative tracking)
- `h1.display` — hero: `clamp(40px,5.6vw,72px)`, line-height 0.98, tracking -0.035em, max-width 16ch.
- `h1.page-title` / `.h1-page` — page hero: `clamp(36px,4.6vw,60px)`.
- `.h2-section` — section heads: `clamp(30px,3.6vw,46px)`, tracking -0.025em.
- Base `h1/h2/h3` also mapped (`--text-4xl/3xl/2xl`).

### Text helpers
- `.eyebrow` — mono, 11px, uppercase, letter-spacing .12em, muted; often with a pulsing green `.dot`.
- `.lede` / `.section-lede` — 17–19px muted intro copy, constrained measure (~56–62ch).
- `.body-md` 16px/1.65. `.muted` = muted-foreground. `.ink-green` / `.ink-muted` for inline emphasis.
- Headline auto-styling: `headline-split.js` wraps words; every visual line after line 1 in an
  H1/H2 renders in `--muted-foreground` (`.hl-2`). Keep that script loaded.

**Min sizes:** never below 12px; body copy 15–17px.

---

## 5. Spacing, radii, layout

Token values (`--spacing-*`, `--radius-*`, `--section-padding-y`) → [design-system.md](./design-system.md) sections 4–5.

- **Containers:** `.container` (max 1240px, 28px pad) and `.container-narrow` (max 880px). Mobile pad 20px.
- **Sections:** `.section` uses `--section-padding-y` (96px → 64px mobile) / `.section-tight` uses `--section-padding-y-tight` (64px) / `.section-dark` (concrete-950 bg). Page heroes use `--page-hero-padding-top/bottom` (80/48 → 48/40 mobile).
- **Section head:** `.section-head` (max 720px, 48px bottom margin); `.compact` (32px) / `.flush` (0). Add `.centered` to center.
- **Eyebrow → headline:** `--section-title-gap` (20px → 16px mobile) on `.section-head > .eyebrow`, hero, page-hero, and use-case challenge/cortex/archive heroes.
- **Breakpoints:** 640 / 768 / 1024 / 1280 / 1536. Main layout shifts at 1024 (grids collapse) and 768 (nav → mobile overlay, sticky CTA appears).
- **Layout primitive:** use flex/grid + `gap`, never margin-spaced inline siblings.
- Card default `--card-radius = --radius-lg (12px)`; large feature cards use 14–20px.

---

## 6. Core components

Reference the live gallery at **`component-library.html`** and copy existing markup — don't reinvent.

### Buttons — `.btn`
Base: inline-flex, gap 8, 14px/500, radius 10, 1px border, hover lifts `translateY(-1px)`.
Sizes: `.sm` / `.lg`. Variants:
- `.primary` — solid `--primary` (near-black on light).
- `.accent` — solid brand green, dark text.
- `.ghost` — transparent, bordered; `.ghost-on-dark` for dark sections.
- Arrow icons use `.arrow` (slides right on hover). Focus ring: 2px `jurnii-500`.
- `.link-arrow` — inline text link with arrow that spreads gap on hover.

### Pills & badges
- `.pill` — rounded, card bg, bordered; `.pill .dot` = pulsing green.
- Category badges `.badge.cat-{comparison|guide|report|thought|casestudy}` map to the tag palette (mono, uppercase, 10px).
- `.filter-pill` — toggle chips; `.is-active` = solid concrete-950 (green in dark/v1).

### Cards
- `.card` — card bg, 1px border, radius 12, 24px pad. Add `.hover-lift` for the standard hover (rise + border darken).
- Section-specific cards: `.problem-card`, `.how-card`, `.resource-card`, `.proof-stat`, `.feature-cell`, `.team-card`, `.industry-card`, `.plan`, `.persona-cell`, `.tm-card` — all share the border+radius+card-bg language.

### Nav — `<Nav active="…">`
Sticky, blurred translucent bar. Grid: brand / centered links / CTAs. Animated inline-SVG logo
(`NavLogo` — green arrow + twinkling sparks + wordmark, all theme-driven). Links use `Dropdown`
(Products, Resources — icon + title + desc) and `MegaDropdown` (Features, Solutions, Use Cases —
grouped columns). Right side: theme toggle, Log in (ghost), **Book a demo** (primary). Under 768px
collapses to a full-screen mobile overlay.

### Footer — `<Footer>`
Concrete-950. Brand blurb + LinkedIn/email, then 6 link columns (Products, Features, Solutions,
Use Cases, Resources, Company). Mono column heads. Legal row. `hello@jurnii.io`, © Jurnii Ltd, London.

### CTAs
- `<DemoCTA>` — dark full-width "Book a demo" band with radial green glow, appended by `PageChrome`.
- `.cta-band` — inset dark rounded CTA (headline + actions) for mid-page use.
- `<StickyDemoCTA>` — mobile-only fixed bottom bar.
- **"Book a demo" links** (`href="contact-us.html"`) are intercepted globally to open the demo modal (`booking-form.js` wizard). Keep that href + label to opt in.

### Tables
- `.compare-table` — feature comparison; Jurnii column highlighted green (`.is-jurnii` / `.us-col`), `.cmp-yes/-no/-partial` cells.
- `.bench-table` inside `.bench-card` — competitor benchmark, highlighted Jurnii column with `.bench-pill`.
- `.pbt-table` — Jurnii 360 price-boost snapshot with cut-off fade + "view more" CTA.
- `.tele-matrix` — journey-score matrix in the UX telemetry hub.

### Forms
- `.contact-form` / `.form-row` — mono uppercase labels, card-bg inputs radius 8–10, focus =
  `jurnii-500` border + green glow ring. Validation: `.invalid` (red), `.form-status.is-success/-error`.
- Booking wizard (`booking-form.js`) is a 3-step flow used in the demo modal and contact page.

### FAQ — `.faq-list`
Accordion; plus-icon rotates to × and fills dark when open; body height-animated.

### Product "dashboard" mocks
Hero and product pages use fabricated-but-realistic UI mocks: `.hero-dashboard`, `.hero-ticker`,
`.hero-orbit`, `.hero-stack` (hero variants cycled via `data-variant`), the `.sc-card` (UX rating
gauge), `.pb-card` (360 price-boost card), and the `.tele-hub` telemetry explorer. These are the
signature "show the product" visuals — reuse the existing components rather than drawing new ones.

### Shared section blocks (`blocks.jsx`)
Reuse before inventing: `PageHero`, `FeatureGrid`, `OutcomeStrip`, `Methodology`, `PullQuote`,
`Testimonials`, `PersonaList`, `CTABand`.

---

## 7. Motion

- **Scroll reveal** (GSAP, wired by `PageChrome` via `useReveal`): add `.reveal` to a section.
  It fades + rises in; card grids listed in `FX_STAGGER_GROUPS` stagger children; stat numbers in
  `FX_COUNT_TARGETS` count up from zero. If you add a new card grid or big-number stat, add its
  selector to those arrays in `site.jsx` so it animates.
- Standard easing: `cubic-bezier(0.2,0.8,0.2,1)` for UI; `cubic-bezier(0.22,1,0.36,1)` for gauges/bars.
- Live/"pulse" dots use the `pulse-dot` / `pulse` keyframes.
- **Always respect `prefers-reduced-motion`** — the reduce block instantly shows content with no movement (already handled globally; keep any new animation motion-safe).

---

## 8. Content & voice

- Audience: iGaming operators (CMO/COO/CCO, marketing/commercial/product teams).
- Tone: sharp, evidence-led, no filler. Real named operators and concrete numbers over vague claims.
- **No emoji.** No AI-slop tropes (aggressive gradients, decorative rounded-with-left-accent boxes, generic stat padding).
- Imagery: the product-mock components ARE the imagery. Don't hand-draw new SVG illustrations.
- Every element earns its place; prefer fewer, denser, more credible sections.

---

## 9. Checklist when adding a page or component

1. Start from `<PageChrome active="…">`; reuse existing section components from `blocks.jsx` / `*-sections.jsx`.
2. Use semantic tokens for every color (see [design-system.md](./design-system.md)), the type helpers for text, spacing/radius tokens for layout.
3. Copy an existing card/table/CTA pattern rather than authoring new CSS; extend `site.css` only if truly new. Check `component-library.html` first.
4. Export shared components to `window`; never use a global `styles` object; call `lucide.createIcons()` after icon injection.
5. Add `.reveal` to sections; register new card grids / stat numbers in `FX_STAGGER_GROUPS` / `FX_COUNT_TARGETS`.
6. Verify in all three themes (`light`, `dark`, `jurnii-v1`) and at ≤768px.
7. Keep "Book a demo" → `contact-us.html` so the demo modal fires.
