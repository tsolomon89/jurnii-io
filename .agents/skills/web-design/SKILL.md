---
name: "Web Design Constraints"
description: "A web-design skill to enforce strict brand identity guidelines, typography, and color systems for the Jurnii platform."
---

# Web Design Constraints

You are generating HTML, CSS, or UI layouts for Jurnii, a commercial intelligence platform. Jurnii’s visual identity reflects its brand personality: calm authority, commercial precision, and intelligence. The aesthetic is clean, data-forward, and confident — not loud, not decorative, and not tech-startup generic.

You must strictly adhere to the following visual constraints when writing CSS or designing DOM structures.

## 1. Colour System

Never deviate from these specific Hex codes. Do not invent new shades.

### Primary Brand Colours
- **Brand green (Jurnii green):** `#94ff96` (Primary accent. CTAs, highlights, hero moments. High visibility).
- **Deep green:** `#10d03a` (Legible on white. Body accent text, active states, links).
- **Mid green:** `#5ce56e` (Secondary accent, hover states, intermediate emphasis).
- **Soft green:** `#e9f9ed` (Tinted backgrounds, chip fills, subtle emphasis on white).

### Background and Structure
- **Off-white (Light bg):** `#f8f8f7` (Primary light mode background).
- **Elevated white:** `#ffffff` (Card and panel surfaces on light bg).
- **Panel:** `#eeeeec` (Secondary surfaces, code backgrounds).
- **Dark brand:** `#252c1e` (Primary dark mode background. Hero slides, brand moments).
- **Dark bg:** `#2a2a27` (Secondary dark mode background).

### Text and Muted
- **Dark text:** `#2a2a27` (Primary body text on light backgrounds).
- **Muted text:** `#807f77` (Secondary text, captions, labels).
- **Subtle text:** `#a6a59e` (Tertiary text, placeholder).
- **Light text:** `#f8f8f7` (Body text on dark backgrounds).

### Accent Colours (Use Sparingly)
- **Teal:** `#2ee5ae` (Data visualisation, secondary CTAs).
- **Cyan:** `#00c1d7` (Deep accent for charts/icons only).

## 2. Typography

### Primary Typeface: Geist
Used for all headings, body text, UI labels, and navigation.
- **Display (700):** Hero headlines.
- **H1 (600):** Page titles.
- **H2 (600):** Section headers.
- **Body (400):** Running text.

### Accent Typeface: Cormorant Garamond
Used **sparingly** for editorial moments only.
- **Rules:** Italic weight only. Never used for body text. Never used for UI. Maximum 1 instance per page (e.g., hero headline italic emphasis or a pull quote).

### Mono Typeface: Geist Mono
Used for data labels, numerical outputs, technical specifications, and the Promo Richness Index metric.

## 3. Data Visualisation & Density

### Colour Rules for Charts
- **Jurnii data / Client position:** Brand green (`#94ff96`) or Deep green (`#10d03a`).
- **Competitors:** Neutral grey (`#807f77`) or lighter variants.
- **Never** use more than 4 colours in a single chart/grid.
- **Never** use harsh red for alerts; use a muted warm tone.

### Density & Hierarchy
- Maintain a highly structured, data-forward aesthetic.
- The headline must make an argument, the visual must prove it, and body text should only add clarifying detail.
- Avoid generic, text-heavy blobs. Use card layouts, tables (Geist Mono for numbers), and concise 2-3 point grids.
- Ensure minimum clear space padding around brand elements.

## 4. Logo Usage
- **Approved Backgrounds:** 
  - Dark brand (`#252c1e`) -> Use white or brand green logo.
  - Off-white (`#f8f8f7`) or White (`#ffffff`) -> Use dark logo.
- **Banned Usage:** Do not put the logo on the brand green background (`#94ff96`). Do not use drop shadows.
