---
name: Design System Governor
description: Maintains consistency across shared CSS tokens and UI components, preventing drift and generic styling.
---

# Design System Governor

## When to use
Use when changing or creating shared CSS tokens, structural layout rules, or global components (buttons, cards, data visualization elements).

## When not to use
Do not use for one-off page specific layouts or content updates.

## Required inputs
* Proposed CSS changes or new component HTML.
* `assets/colors_and_type.css`
* `JURNII_WEB_DESIGN_SYSTEM.md`

## Step-by-step instructions
1. **Token Verification:** Ensure the proposed changes strictly use the variables defined in `assets/colors_and_type.css` (e.g., `var(--jurnii-500)`).
2. **Consistency Check:** Verify that spacing uses the established 4px grid (e.g., `var(--spacing-4)`). Ensure typography scales and font weights match the standard (`Geist`, `Geist Mono`).
3. **Component Standardization:** For new components (e.g., metric strips, benchmark tables), document the HTML structure and CSS classes so they can be reused across the site.
4. **Update Documentation:** If a new token or component is approved, update the `JURNII_WEB_DESIGN_SYSTEM.md` and `JURNII_COMPONENT_BACKLOG.md` artifacts.

## Constraints
* Must keep colour, spacing, typography, buttons, cards, and data visualization strictly consistent across all pages.
* Reject any inline styles or hardcoded hex values in component CSS (must use variables).

## Output format
Approved CSS/HTML component definitions, or rejection notes with required corrections.

## Examples where useful
* "I am creating a new Promo Richness Index block. Review it to ensure it matches the design system."
* "Audit the current `site.css` to find where hardcoded colours are used instead of tokens."
