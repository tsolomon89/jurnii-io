# Jurnii Design System — Design Tokens

> **Scope:** Jurnii brand & platform design tokens (Figma source of truth).  
> For jurnii.io page patterns, components, and conventions → [website-design-system.md](./website-design-system.md)
>
> Generated from the Jurni Design System Figma file.  
> **878 variables** across 4 collections: TailwindCSS, Theme, Mode (Light / Dark / Jurnii v1), Custom.
>
> **Implementation in this repo:** CSS custom properties live in [`assets/global.css`](../assets/global.css).

---

## How the Token Architecture Works

Tokens are structured in three layers. Always reference the **semantic layer** in code — never the primitives directly.

```
Primitive (Collection 1 — TailwindCSS)
  └─ tailwind colors/concrete/950        →   #2A2A27

Semantic alias (Collection 2 — Theme)
  └─ colors/primary-light                →   tailwind colors/concrete/950

Mode token (Collection 3 — Mode)
  └─ base/primary  [Light]               →   colors/primary-light  → concrete/950   → #2A2A27
                   [Dark]                →   colors/primary-dark   → jurnii/200     → #94FF96
                   [Jurnii v1]           →   colors/primary-v1     → jurnii/200     → #94FF96
```

---

## Table of Contents

1. [Primitive Palettes](#1-primitive-palettes)
2. [Semantic Colour Tokens](#2-semantic-colour-tokens-base)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Radius](#5-radius)
6. [CSS Custom Properties](#6-css-custom-properties)
7. [Usage Guide](#7-usage-guide)
8. [Website-only extensions](#8-website-only-extensions)

---

## 1. Primitive Palettes

Raw colour values. Semantic tokens alias into these — do not use them directly in components.

---

### Concrete — Custom Neutral Scale

Jurnii's warm-grey neutral scale. Used for backgrounds, foregrounds, borders, and muted surfaces in Light and Dark modes.

| Token | Hex |
|-------|-----|
| `tailwind colors/concrete/50` | `#F8F8F7` |
| `tailwind colors/concrete/100` | `#F2F2F1` |
| `tailwind colors/concrete/200` | `#E3E3E3` |
| `tailwind colors/concrete/300` | `#BFBFBA` |
| `tailwind colors/concrete/400` | `#9C9C94` |
| `tailwind colors/concrete/500` | `#807F77` |
| `tailwind colors/concrete/600` | `#686761` |
| `tailwind colors/concrete/700` | `#55554F` |
| `tailwind colors/concrete/800` | `#484744` |
| `tailwind colors/concrete/900` | `#3F3E3B` |
| `tailwind colors/concrete/950` | `#2A2A27` |

---

### Jurnii Green — Custom Brand Scale

The Jurnii brand green. Used for primary CTAs and the sidebar primary in Dark / Jurnii v1 modes.

| Token | Hex | Notes |
|-------|-----|-------|
| `tailwind colors/jurnii/50` | `#E6FFE5` | |
| `tailwind colors/jurnii/100` | `#C7FFC6` | |
| `tailwind colors/jurnii/200` | `#94FF96` | **primary brand green** (dark/v1 primary, sidebar accents) |
| `tailwind colors/jurnii/300` | `#57FF60` | logo arrow |
| `tailwind colors/jurnii/400` | `#34F741` | |
| `tailwind colors/jurnii/500` | `#05DD17` | |
| `tailwind colors/jurnii/600` | `#00B113` | |
| `tailwind colors/jurnii/700` | `#058615` | |
| `tailwind colors/jurnii/800` | `#0B6917` | |
| `tailwind colors/jurnii/900` | `#0E591A` | |
| `tailwind colors/jurnii/950` | `#01320A` | sidebar-primary in **Light** mode |

---

### Blue Dianne — Custom Teal Scale (Jurnii v1)

Used exclusively for the **Jurnii v1** branded theme. All v1 surface, foreground, and sidebar tokens reference this palette.

| Token | Hex | Notes |
|-------|-----|-------|
| `tailwind colors/blue dianne/50` | `#F2F9F9` | foreground / text |
| `tailwind colors/blue dianne/100` | `#DFEEED` | |
| `tailwind colors/blue dianne/200` | `#C2DFDD` | |
| `tailwind colors/blue dianne/300` | `#98C8C6` | muted-foreground |
| `tailwind colors/blue dianne/400` | `#66AAA8` | |
| `tailwind colors/blue dianne/500` | `#4B8F8E` | ring / focus |
| `tailwind colors/blue dianne/600` | `#417779` | sidebar-ring |
| `tailwind colors/blue dianne/700` | `#3A6264` | accent / muted / secondary |
| `tailwind colors/blue dianne/800` | `#355255` | card / popover |
| `tailwind colors/blue dianne/900` | `#31484B` | background / sidebar-background |
| `tailwind colors/blue dianne/950` | `#1C2D30` | primary-foreground |

---

### Standard Tailwind Colours Referenced

Semantic tokens also pull from these standard Tailwind palette steps:

| Token | Hex | Used for |
|-------|-----|----------|
| `tailwind colors/base/white` | `#FFFFFF` | card-light, popover-light |
| `tailwind colors/red/50` | `#FEF2F2` | destructive-foreground (light/dark) |
| `tailwind colors/red/300` | `#FCA5A5` | destructive (Jurnii v1) |
| `tailwind colors/red/400` | `#F87171` | destructive (dark) |
| `tailwind colors/red/600` | `#DC2626` | destructive (light) |
| `tailwind colors/red/950` | `#450A0A` | destructive-foreground (v1) |
| `tailwind colors/green/50` | `#F0FDF4` | positive-foreground (light) |
| `tailwind colors/green/400` | `#4ADE80` | positive (dark / v1) |
| `tailwind colors/green/600` | `#16A34A` | positive (light) |
| `tailwind colors/green/950` | `#052E16` | positive-foreground (dark / v1) |
| `tailwind colors/orange/50` | `#FFF7ED` | warning-foreground (light) |
| `tailwind colors/orange/400` | `#FB923C` | warning (dark / v1) |
| `tailwind colors/orange/600` | `#EA580C` | warning (light) |
| `tailwind colors/orange/950` | `#431407` | warning-foreground (dark / v1) |

---

## 2. Semantic Colour Tokens (`base/*`)

Live in **Collection 3 — Mode**. Each mode value is an alias that resolves through Collection 2 into a primitive.

**Reading the alias chain column:**  
`colors/background-light` → `concrete/50` → `#F8F8F7`  
means: the semantic alias references the primitive, which holds the final hex value.

In this website repo, use the CSS custom properties in [`assets/global.css`](../assets/global.css) (`--background`, `--primary`, etc.) — they map to these `base/*` tokens.

---

### Core Semantic Tokens

| Token | Light alias chain | Dark alias chain | Jurnii v1 alias chain |
|-------|-------------------|------------------|-----------------------|
| `base/background` | `colors/background-light` → `concrete/50` → `#F8F8F7` | `colors/background-dark` → `concrete/950` → `#2A2A27` | `colors/background-v1` → `blue dianne/900` → `#31484B` |
| `base/foreground` | `colors/foreground-light` → `concrete/950` → `#2A2A27` | `colors/foreground-dark` → `concrete/50` → `#F8F8F7` | `colors/foreground-v1` → `blue dianne/50` → `#F2F9F9` |
| `base/card` | `colors/card-light` → `base/white` → `#FFFFFF` | `colors/card-dark` → `concrete/900` → `#3F3E3B` | `colors/card-v1` → `blue dianne/800` → `#355255` |
| `base/card-foreground` | `colors/card-foreground-light` → `concrete/950` → `#2A2A27` | `colors/card-foreground-dark` → `concrete/50` → `#F8F8F7` | `colors/card-foreground-v1` → `blue dianne/50` → `#F2F9F9` |
| `base/primary` | `colors/primary-light` → `concrete/950` → `#2A2A27` | `colors/primary-dark` → `jurnii/200` → `#94FF96` | `colors/primary-v1` → `jurnii/200` → `#94FF96` |
| `base/primary-foreground` | `colors/primary-foreground-light` → `concrete/50` → `#F8F8F7` | `colors/primary-foreground-dark` → `concrete/950` → `#2A2A27` | `colors/primary-foreground-v1` → `blue dianne/950` → `#1C2D30` |
| `base/secondary` | `colors/secondary-light` → `concrete/200` → `#E3E3E3` | `colors/secondary-dark` → `concrete/800` → `#484744` | `colors/secondary-v1` → `blue dianne/700` → `#3A6264` |
| `base/secondary-foreground` | `colors/secondary-foreground-light` → `concrete/900` → `#3F3E3B` | `colors/secondary-foreground-dark` → `concrete/50` → `#F8F8F7` | `colors/secondary-foreground-v1` → `blue dianne/50` → `#F2F9F9` |
| `base/muted` | `colors/muted-light` → `concrete/200` → `#E3E3E3` | `colors/muted-dark` → `concrete/800` → `#484744` | `colors/muted-v1` → `blue dianne/700` → `#3A6264` |
| `base/muted-foreground` | `colors/muted-foreground-light` → `concrete/500` → `#807F77` | `colors/muted-foreground-dark` → `concrete/300` → `#BFBFBA` | `colors/muted-foreground-v1` → `blue dianne/300` → `#98C8C6` |
| `base/accent` | `colors/accent-light` → `concrete/100` → `#F2F2F1` | `colors/accent-dark` → `concrete/800` → `#484744` | `colors/accent-v1` → `blue dianne/700` → `#3A6264` |
| `base/accent-foreground` | `colors/accent-foreground-light` → `concrete/900` → `#3F3E3B` | `colors/accent-foreground-dark` → `concrete/50` → `#F8F8F7` | `colors/accent-foreground-v1` → `blue dianne/50` → `#F2F9F9` |
| `base/border` | `colors/border-light` → `concrete/200` → `#E3E3E3` | `colors/border-dark` → `#FFFFFF1A` (raw) | `colors/border-v1` → `#FFFFFF1A` (raw) |
| `base/input` | `colors/input-light` → `concrete/200` → `#E3E3E3` | `colors/input-dark` → `#FFFFFF26` (raw) | → `#FFFFFF26` (raw) |
| `base/ring` | `colors/ring-light` → `concrete/400` → `#9C9C94` | `colors/ring-dark` → `concrete/500` → `#807F77` | `colors/ring-v1` → `blue dianne/500` → `#4B8F8E` |
| `base/ring-offset` | → `base/white` → `#FFFFFF` | → `base/white` → `#FFFFFF` | → `base/white` → `#FFFFFF` |
| `base/popover` | `colors/popover-light` → `base/white` → `#FFFFFF` | `colors/popover-dark` → `concrete/800` → `#484744` | `colors/popover-v1` → `blue dianne/800` → `#355255` |
| `base/popover-foreground` | `colors/popover-foreground-light` → `concrete/950` → `#2A2A27` | `colors/popover-foreground-dark` → `concrete/50` → `#F8F8F7` | `colors/popover-foreground-v1` → `blue dianne/50` → `#F2F9F9` |

---

### Status Colours

| Token | Light alias chain | Dark alias chain | Jurnii v1 alias chain |
|-------|-------------------|------------------|-----------------------|
| `base/destructive` | `colors/destructive-light` → `red/600` → `#DC2626` | `colors/destructive-dark` → `red/400` → `#F87171` | `colors/destructive-v1` → `red/300` → `#FCA5A5` |
| `base/destructive-foreground` | `colors/destructive-foreground-light` → `red/50` → `#FEF2F2` | → `red/50` → `#FEF2F2` | `colors/destructive-foreground-v1` → `red/950` → `#450A0A` |
| `base/positive` | `colors/positive-light` → `green/600` → `#16A34A` | `colors/positive-dark` → `green/400` → `#4ADE80` | `colors/positive-v1` → `green/400` → `#4ADE80` |
| `base/positive-foreground` | `colors/positive-foreground-light` → `green/50` → `#F0FDF4` | `colors/positive-foreground-dark` → `green/950` → `#052E16` | `colors/positive-foreground-v1` → `green/950` → `#052E16` |
| `base/warning` | `colors/warning-light` → `orange/600` → `#EA580C` | `colors/warning-v1` → `orange/400` → `#FB923C` | `colors/warning-v1` → `orange/400` → `#FB923C` |
| `base/warning-foreground` | `colors/warning-foreground-light` → `orange/50` → `#FFF7ED` | `colors/warning-foreground-v1` → `orange/950` → `#431407` | `colors/warning-foreground-v1` → `orange/950` → `#431407` |
| `base/information` | `colors/info-v1` → `blue/400` → `#60A5FA` | ← same | ← same |
| `base/information-foreground` | `colors/info-foreground-v1` → `blue/900` → `#172554` | ← same | ← same |

---

### Score / Rating Colours

| Token | Light / Dark alias chain | Jurnii v1 alias chain |
|-------|--------------------------|----------------------|
| `base/excellent` | `colors/excellent-light` → `violet/500` → `#8B5CF6` | `colors/excellent-v1` → `violet/400` → `#A78BFA` |
| `base/good` | `colors/good-light` → `green/500` → `#22C55E` | `colors/good-v1` → `green/400` → `#4ADE80` |
| `base/average` | `colors/average-light` → `yellow/400` → `#FACC15` | `colors/average-v1` → `yellow/400` → `#FACC15` |
| `base/poor` | `colors/poor-light` → `orange/400` → `#FB923C` | `colors/poor-v1` → `orange/400` → `#FB923C` |
| `base/very-poor` | `colors/very-poor-light` → `red/500` → `#EF4444` | `colors/very-poor-v1` → `red/400` → `#F87171` |

---

### Jurnii 360 Category Colours

Mode-invariant across all themes (raw values, no Tailwind alias in Figma).

| Token | Hex | Equivalent Tailwind step |
|-------|-----|--------------------------|
| `base/performance` | `#C084FC` | `violet/400` |
| `base/journey` | `#4ADE80` | `green/400` |
| `base/usability` | `#FACC15` | `yellow/400` |
| `base/perception` | `#FB7185` | `rose/400` |

---

### Data Visualisation (Charts)

10 semantic chart tokens. Light uses warm → cool; Dark / Jurnii v1 use a different cool progression.

| Token | Light alias chain | Dark alias chain | Jurnii v1 alias chain |
|-------|-------------------|------------------|-----------------------|
| `base/chart-1` | `colors/chart-1-light` → `red/300` → `#FCA5A5` | `colors/chart-2-light` → `red/500` → `#EF4444` | `colors/chart-1-light` → `red/300` → `#FCA5A5` |
| `base/chart-2` | `colors/chart-2-light` → `red/500` → `#EF4444` | `colors/chart-4-light` → `orange/500` → `#F97316` | `colors/chart-3-light` → `orange/300` → `#FDBA74` |
| `base/chart-3` | `colors/chart-3-light` → `orange/300` → `#FDBA74` | `colors/chart-6-light` → `yellow/500` → `#EAB308` | `colors/chart-5-light` → `yellow/300` → `#FCD34D` |
| `base/chart-4` | `colors/chart-4-light` → `orange/500` → `#F97316` | `colors/chart-8-light` → `lime/400` → `#84CC16` | `colors/chart-7-light` → `lime/300` → `#BEF264` |
| `base/chart-5` | `colors/chart-5-light` → `yellow/300` → `#FCD34D` | `colors/chart-10-light` → `emerald/500` → `#10B981` | `colors/chart-9-light` → `emerald/300` → `#6EE7B7` |
| `base/chart-6` | `colors/chart-6-light` → `yellow/500` → `#EAB308` | `colors/chart-12-light` → `cyan/500` → `#06B6D4` | `colors/chart-11-light` → `cyan/300` → `#67E8F9` |
| `base/chart-7` | `colors/chart-7-light` → `lime/300` → `#BEF264` | `colors/chart-14-light` → `blue/500` → `#3B82F6` | `colors/chart-13-light` → `blue/300` → `#93C5FD` |
| `base/chart-8` | `colors/chart-8-light` → `lime/400` → `#84CC16` | `colors/chart-16-light` → `purple/500` → `#A855F7` | `colors/chart-15-light` → `purple/300` → `#D8B4FE` |
| `base/chart-9` | `colors/chart-9-light` → `emerald/300` → `#6EE7B7` | `colors/chart-18-light` → `pink/500` → `#EC4899` | `colors/chart-17-light` → `pink/300` → `#F9A8D4` |
| `base/chart-10` | `colors/chart-10-light` → `emerald/500` → `#10B981` | `colors/chart-20-light` → `rose/500` → `#F43F5E` | `colors/chart-19-light` → `rose/300` → `#FDA4AF` |

---

### Sidebar Tokens

| Token | Light alias chain | Dark alias chain | Jurnii v1 alias chain |
|-------|-------------------|------------------|-----------------------|
| `base/sidebar-background` | `colors/sidebar-background-light` → `concrete/50` → `#F8F8F7` | `colors/sidebar-background-dark` → `concrete/900` → `#3F3E3B` | `colors/sidebar-background-v1` → `blue dianne/900` → `#31484B` |
| `base/sidebar-foreground` | `colors/sidebar-foreground-light` → `concrete/950` → `#2A2A27` | `colors/sidebar-foreground-dark` → `concrete/50` → `#F8F8F7` | `colors/sidebar-foreground-v1` → `blue dianne/50` → `#F2F9F9` |
| `base/sidebar-primary` | `colors/sidebar-primary-light` → `jurnii/950` → `#01320A` | `colors/sidebar-primary-dark` → `jurnii/200` → `#94FF96` | `colors/sidebar-primary-v1` → `jurnii/200` → `#94FF96` |
| `base/sidebar-primary-foreground` | `colors/sidebar-primary-foreground-light` → `jurnii/200` → `#94FF96` | `colors/sidebar-primary-foreground-dark` → `concrete/950` → `#2A2A27` | `colors/sidebar-primary-foreground-v1` → `blue dianne/950` → `#1C2D30` |
| `base/sidebar-accent` | `colors/sidebar-accent-light` → `concrete/200` → `#E3E3E3` | `colors/sidebar-accent-dark` → `concrete/800` → `#484744` | `colors/sidebar-accent-v1` → `blue dianne/700` → `#3A6264` |
| `base/sidebar-accent-foreground` | `colors/sidebar-accent-foreground-light` → `concrete/900` → `#3F3E3B` | `colors/sidebar-accent-foreground-dark` → `concrete/50` → `#F8F8F7` | `colors/sidebar-accent-foreground-v1` → `blue dianne/50` → `#F2F9F9` |
| `base/sidebar-border` | `colors/sidebar-border-light` → `concrete/200` → `#E3E3E3` | `colors/sidebar-border-dark` → `#FFFFFF1A` (raw) | → `#FFFFFF1A` (raw) |
| `base/sidebar-ring` | `colors/sidebar-ring-light` → `concrete/400` → `#9C9C94` | `colors/sidebar-ring-dark` → `concrete/600` → `#686761` | `colors/sidebar-ring-v1` → `blue dianne/600` → `#417779` |

---

### Alpha Overlays

Theme-aware overlays derived from the base foreground colour at varying opacities.

| Token | Light | Dark | Jurnii v1 |
|-------|-------|------|-----------|
| `alpha/5` | `white` @ 95% → `#FFFFFFF2` | `black` @ 95% → `#0A0A0AF2` | `blue dianne/950` @ 95% → `#1C2D30F2` |
| `alpha/10` | `white` @ 90% → `#FFFFFFE5` | `black` @ 90% → `#0A0A0AE5` | `#1C2D30E5` |
| `alpha/20` | `white` @ 80% → `#FFFFFFCC` | `black` @ 80% → `#0A0A0ACC` | `#1C2D30CC` |
| `alpha/30` | `white` @ 70% → `#FFFFFFB2` | `black` @ 70% → `#0A0A0AB2` | `#1C2D30B2` |
| `alpha/40` | `white` @ 60% → `#FFFFFF99` | `black` @ 60% → `#0A0A0A99` | `#1C2D3099` |
| `alpha/50` | `white` @ 50% → `#FFFFFF80` | `black` @ 50% → `#0A0A0A80` | `#1C2D3080` |
| `alpha/60` | `white` @ 40% → `#FFFFFF66` | `black` @ 40% → `#0A0A0A66` | `#1C2D3066` |
| `alpha/70` | `white` @ 30% → `#FFFFFF4D` | `black` @ 30% → `#0A0A0A4D` | `#1C2D304D` |
| `alpha/80` | `white` @ 20% → `#FFFFFF33` | `black` @ 20% → `#0A0A0A33` | `#1C2D3033` |
| `alpha/90` | `white` @ 10% → `#FFFFFF1A` | `black` @ 10% → `#0A0A0A1A` | `#1C2D301A` |

---

### Custom Composite Tokens

Used for UI patterns where light and dark modes resolve to different base tokens entirely.

| Token | Light | Dark | Use Case |
|-------|-------|------|----------|
| `custom/background dark:input\30` | `base/background` | `white` @ 4.5% | Background in light, faint white overlay in dark |
| `custom/accent dark:input\50` | `base/accent` | `white` @ 7.5% | Subtle interactive hover |
| `custom/outline` | `concrete/400` @ 50% → `#A3A3A380` | `concrete/500` @ 50% → `#73737380` | Focus ring outline |
| `custom/dark:input` | transparent | `base/input` | Border visible in dark only |
| `custom/destructive dark:destructive\60` | `base/destructive` | `red/400` @ 60% | Softer destructive in dark |
| `custom/destructive dark:destructive\70` | `base/destructive` | `red/400` @ 70% | Medium destructive in dark |
| `custom/destructive dark:destructive\90` | `base/destructive` | `red/400` @ 90% | Strong destructive in dark |
| `custom/destructive\20 dark:destructive\40` | `red/600` @ 20% | `red/400` @ 40% | Tinted destructive background |
| `custom/destructive\40 dark:destructive\60` | `red/600` @ 40% | `red/400` @ 60% | Stronger destructive background |
| `custom/outline\10 dark:outline\20` | `concrete/400` @ 10% | `concrete/500` @ 20% | Subtle separator |

---

## 3. Typography

### Font Families

| Token | Value |
|-------|-------|
| `font/font-sans` | `Geist` |
| `font/font-serif` | serif fallback |
| `font/font-mono` | mono fallback |

### Heading Scale — Responsive (Collection 4 — Custom)

| Token | Desktop → resolves to | Mobile → resolves to | Weight |
|-------|----------------------|---------------------|--------|
| `heading-xl` | `text/5xl/font-size` → `48px / 48px lh` | `text/3xl/font-size` → `30px / 36px lh` | `font-weight/bold` → `700` |
| `heading-lg` | `text/4xl/font-size` → `36px / 40px lh` | `text/3xl/font-size` → `30px / 36px lh` | `font-weight/bold` → `700` |
| `heading-md` | `text/3xl/font-size` → `30px / 36px lh` | `text/3xl/font-size` → `30px / 36px lh` | `font-weight/bold` → `700` |
| `heading-sm` | `text/2xl/font-size` → `24px / 32px lh` | `text/2xl/font-size` → `24px / 32px lh` | `font-weight/bold` → `700` |

### Text Scale

| Token | Font Size | Line Height |
|-------|-----------|-------------|
| `text/xs` | `12px` | — |
| `text/sm` | `14px` | — |
| `text/base` | `16px` | — |
| `text/lg` | `18px` | — |
| `text/xl` | `20px` | — |
| `text/2xl` | `24px` | `32px` |
| `text/3xl` | `30px` | `36px` |
| `text/4xl` | `36px` | `40px` |
| `text/5xl` | `48px` | `48px` |
| `text/6xl` | `60px` | — |
| `text/7xl` | `72px` | — |
| `text/8xl` | `96px` | — |
| `text/9xl` | `128px` | — |

### Font Weights

| Token | Value |
|-------|-------|
| `font-weight/thin` | `100` |
| `font-weight/extralight` | `200` |
| `font-weight/light` | `300` |
| `font-weight/normal` | `400` |
| `font-weight/medium` | `500` |
| `font-weight/semibold` | `600` |
| `font-weight/bold` | `700` |
| `font-weight/extrabold` | `800` |
| `font-weight/black` | `900` |

> **Note for the marketing website:** heading classes and clamp sizes used on jurnii.io are documented in [website-design-system.md](./website-design-system.md) (section 4). In `global.css`, `--fw-bold` is set to `600` to match site heading weight.

---

## 4. Spacing & Layout

Tailwind 4px grid spacing scale:

| Token | Value |
|-------|-------|
| `spacing/1` | `4px` |
| `spacing/2` | `8px` |
| `spacing/3` | `12px` |
| `spacing/4` | `16px` |
| `spacing/5` | `20px` |
| `spacing/6` | `24px` |
| `spacing/8` | `32px` |
| `spacing/10` | `40px` |
| `spacing/12` | `48px` |
| `spacing/16` | `64px` |
| `spacing/20` | `80px` |
| `spacing/24` | `96px` |

### Container & Section Tokens (Collection 4 — Custom)

| Token | Desktop → resolves to | Mobile → resolves to |
|-------|----------------------|---------------------|
| `container-padding-x` | `spacing/6` → `24px` | `spacing/6` → `24px` |
| `section-padding-y` | `spacing/24` → `96px` | `spacing/16` → `64px` |
| `section-title-gap-xl` | `spacing/6` → `24px` | `spacing/4` → `16px` |
| `section-title-gap-lg` | `spacing/5` → `20px` | `spacing/4` → `16px` |
| `section-title-gap-md` | `spacing/5` → `20px` | `spacing/5` → `20px` |
| `section-title-gap-sm` | `spacing/4` → `16px` | `spacing/4` → `16px` |

### Breakpoints

| Token | Value |
|-------|-------|
| `breakpoint/sm` | `640px` |
| `breakpoint/md` | `768px` |
| `breakpoint/lg` | `1024px` |
| `breakpoint/xl` | `1280px` |
| `breakpoint/2xl` | `1536px` |

> **Website layout classes** (`.container` max-width, `.section` borders) → [website-design-system.md](./website-design-system.md) section 5.

---

## 5. Radius

| Token | Value |
|-------|-------|
| `border-radius/rounded-none` | `0px` |
| `border-radius/rounded-xxs` | `2px` |
| `border-radius/rounded-xs` | `4px` |
| `border-radius/rounded-sm` | `6px` |
| `border-radius/rounded-md` | `8px` |
| `border-radius/rounded-lg` | `12px` |
| `border-radius/rounded-xl` | `16px` |
| `border-radius/rounded-2xl` | `20px` |
| `border-radius/rounded-3xl` | `24px` |
| `border-radius/rounded-4xl` | `32px` |
| `border-radius/rounded-full` | `9999px` |
| `card-radius` | → `rounded-lg` → `12px` |

---

## 6. CSS Custom Properties

Canonical implementation: [`assets/global.css`](../assets/global.css). Summary of light-mode defaults:

```css
:root {
  /* Core */
  --background: #F8F8F7;       /* concrete/50 */
  --foreground: #2A2A27;       /* concrete/950 */
  --card: #FFFFFF;             /* base/white */
  --card-foreground: #2A2A27;
  --primary: #2A2A27;          /* concrete/950 */
  --primary-foreground: #F8F8F7;
  --secondary: #E3E3E3;        /* concrete/200 */
  --secondary-foreground: #3F3E3B;
  --muted: #E3E3E3;
  --muted-foreground: #807F77; /* concrete/500 */
  --accent: #F2F2F1;           /* concrete/100 */
  --accent-foreground: #3F3E3B;
  --border: #E3E3E3;
  --input: #E3E3E3;
  --ring: #9C9C94;             /* concrete/400 */
  --ring-offset: #FFFFFF;
  --popover: #FFFFFF;
  --popover-foreground: #2A2A27;

  /* Status */
  --destructive: #DC2626;      /* red/600 */
  --destructive-foreground: #FEF2F2;
  --positive: #16A34A;         /* green/600 */
  --positive-foreground: #F0FDF4;
  --warning: #EA580C;          /* orange/600 */
  --warning-foreground: #FFF7ED;
  --information: #60A5FA;      /* blue/400 */
  --information-foreground: #172554;

  /* Scores */
  --excellent: #8B5CF6;        /* violet/500 */
  --good: #22C55E;             /* green/500 */
  --average: #FACC15;          /* yellow/400 */
  --poor: #FB923C;             /* orange/400 */
  --very-poor: #EF4444;        /* red/500 */

  /* Jurnii 360 categories */
  --performance: #C084FC;      /* violet/400 */
  --journey: #4ADE80;          /* green/400 */
  --usability: #FACC15;        /* yellow/400 */
  --perception: #FB7185;       /* rose/400 */

  /* Sidebar */
  --sidebar-background: #F8F8F7;
  --sidebar-foreground: #2A2A27;
  --sidebar-primary: #01320A;        /* jurnii/950 */
  --sidebar-primary-foreground: #94FF96; /* jurnii/200 */
  --sidebar-accent: #E3E3E3;
  --sidebar-accent-foreground: #3F3E3B;
  --sidebar-border: #E3E3E3;
  --sidebar-ring: #9C9C94;

  /* Typography */
  --font-sans: 'Geist', sans-serif;
  --font-mono: monospace;

  /* Radius */
  --radius-none: 0px;  --radius-xxs: 2px;   --radius-xs: 4px;
  --radius-sm: 6px;    --radius-md: 8px;    --radius-lg: 12px;
  --radius-xl: 16px;   --radius-2xl: 20px;  --radius-full: 9999px;
  --card-radius: var(--radius-lg);

  /* Spacing */
  --spacing-1: 4px;   --spacing-2: 8px;   --spacing-3: 12px;
  --spacing-4: 16px;  --spacing-5: 20px;  --spacing-6: 24px;
  --spacing-8: 32px;  --spacing-10: 40px; --spacing-12: 48px;
  --spacing-16: 64px; --spacing-20: 80px; --spacing-24: 96px;

  --container-padding-x: var(--spacing-6);
  --section-padding-y:        var(--spacing-24);
  --section-padding-y-tight:  var(--spacing-16);
  --section-title-gap:        var(--spacing-5); /* maps to section-title-gap-lg */
  --page-hero-padding-top:    var(--spacing-20);
  --page-hero-padding-bottom: var(--spacing-12);
}
```

Dark (`[data-theme="dark"]`) and Jurnii v1 (`[data-theme="jurnii-v1"]`) overrides are fully defined in `global.css`.

### Theme switching

```html
<html data-theme="light">      <!-- Light (default) -->
<html data-theme="dark">       <!-- Dark -->
<html data-theme="jurnii-v1">  <!-- Jurnii v1 teal branded -->
```

---

## 7. Usage Guide

### Token naming convention

```
tailwind colors/{scale}/{step}   →  Primitive palette. Never use directly.
colors/{role}-{mode}             →  Semantic alias. Never use directly.
base/{role}                      →  ✅ Always use this in component code (via CSS vars).
```

### Building UI

- Prefer semantic CSS variables: `var(--background)`, `var(--primary)`, `var(--muted-foreground)`, etc.
- Never hardcode hex that already exists as a token.
- For jurnii.io pages and React components, follow [website-design-system.md](./website-design-system.md).

---

## 8. Website-only extensions

These live in [`assets/global.css`](../assets/global.css) for the marketing site and are **not** core Figma `base/*` tokens. Usage rules → [website-design-system.md](./website-design-system.md) section 3.

| Token | Purpose |
|-------|---------|
| `--accent-green` / `--accent-green-hover` | Solid green CTA fills on light surfaces (deeper than jurnii-200) |
| `--brand-glow` | RGB channels for radial accents / focus rings |
| `--accent-ux` / `--accent-mmm` (+ `-ink`, `-rgb`) | Product line accents |
| `--partial` | Partial / in-between status in compare tables |
| `--tag-*-bg` / `--tag-*-ink` | Category tag palette |
| `--avatar-*` | Testimonial avatar gradients |

---

*Last extracted: April 2026 — Jurni Design System*
