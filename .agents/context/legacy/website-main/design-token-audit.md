# Design Token Compliance Audit

**Date:** 2026-07-20 (updated consolidation pass)  
**Scope:** Live marketing site shared styles + JSX (excludes `component-library.html`, `canvas-comments*`, `tweaks-panel.jsx`, `uploads/`)  
**Active themes:** `light`, `jurnii-v1`

---

## Canonical type scale (consolidated)

Only these sizes exist. Everything else was rounded into the nearest value (ties prefer larger for type).

| Token | rem | px |
|-------|-----|----|
| `--text-2xs` | 0.625rem | **10** (min caption) |
| `--text-xs` | 0.75rem | **12** |
| `--text-sm` | 0.875rem | **14** |
| `--text-base` | 1rem | **16** |
| `--text-lg` | 1.125rem | **18** |
| `--text-xl` | 1.25rem | **20** |
| `--text-2xl` | 1.5rem | **24** |
| `--text-3xl` | 1.75rem | **28** |
| `--text-4xl` | 2rem | **32** |
| `--text-5xl` | 2.25rem | **36** |
| `--text-6xl` | 2.5rem | **40** |
| `--text-7xl` | 2.75rem | **44** |
| `--text-8xl` | 3rem | **48** |
| `--text-9xl` | 3.25rem | **52** |
| `--text-10xl` | 3.5rem | **56** |
| `--text-11xl` | 4rem | **64** |

Removed: `--text-3xs`, `*-plus`, `--text-md`, `--text-2_5xl`, `--text-4_5xl`, `--text-5xl-plus`, and the old 60/72/96/128 display sizes (snapped to `--text-11xl` / 64px).

---

## Spacing (design system only — no new tokens)

Existing scale only: **4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96** (`--spacing-1` … `--spacing-24`).

Off-grid and on-grid-but-missing values in `padding` / `margin` / `gap` were remapped to the **nearest existing token** (ties prefer smaller to avoid expanding layout). Examples:

| Was | Now |
|-----|-----|
| 6, 7, 9, 10 | `--spacing-2` (8) |
| 11, 13, 14 | `--spacing-3` (12) or `--spacing-4` (16) |
| 18, 22 | `--spacing-4` (16) / `--spacing-6` (24) |
| 28, 36 | `--spacing-8` (32) |
| 56 | `--spacing-12` (48) |
| 72, 88 | `--spacing-16` (64) / `--spacing-20` (80) |

No `--spacing-7`, `-9`, `-14`, etc. were added.

---

## Font weight

- `font-weight: 450` → `var(--fw-medium)` (500). No `--fw-book`.

---

## Alpha / glass tokens (added)

### Theme-aware (`alpha/5`…`90` from design system)

| Token | Light | Dark | jurnii-v1 |
|-------|-------|------|-----------|
| `--alpha-5` … `--alpha-90` | white @ 95%→10% | black @ 95%→10% | blue-dianne-950 @ 95%→10% |

### Fixed white overlays (dark surfaces)

`--white-a-3` … `--white-a-22`, plus `--white-a-60/64/66/70/80` for muted copy on dark panels.

### Fixed black overlays (shadows)

`--black-a-4`, `-12`, `-16`, `-20`, `-22`, `-25`, `-28`, `-30`, `-45`, `-50`.

### Nav glass

```css
--nav-bg: color-mix(…); /* concrete-50@84% / concrete-950@84% / blue-dianne-900@88% */
```

`.nav { background: var(--nav-bg); }` — single rule for all themes.

Dark/v1 `--border` / `--input` now use `--white-a-10` / `--white-a-15`.

---

## Scripts

| Script | Role |
|--------|------|
| [`scripts/token-audit.mjs`](scripts/token-audit.mjs) | Initial audit scanner |
| [`scripts/apply-tokens.mjs`](scripts/apply-tokens.mjs) | First Tier 1 pass |
| [`scripts/consolidate-tokens.mjs`](scripts/consolidate-tokens.mjs) | This consolidation pass |

---

## Remaining (lower priority)

- Rec-modal local palette (`--rm-*` hex) — map to blue-dianne / status or keep documented as product-surface
- `#7DB1FF` mention colour — still no global token
- Competitor brand colours in JSX — intentional exceptions
- `border-radius: 10px` and similar off-radius-scale values (not part of this spacing pass)
- Box-shadow blur/spread lengths (not spacing tokens)

---

## Suggested visual check

Toggle **light ↔ jurnii-v1** on home + a feature page. Expect small tightening where 11/14/18px padding snapped to 12/16, and display type capped at 64px instead of 72/96.
