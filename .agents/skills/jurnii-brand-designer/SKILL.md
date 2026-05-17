---
name: Jurnii Brand Designer
description: Governs visual design decisions to ensure pages feel like premium, enterprise iGaming intelligence infrastructure rather than generic SaaS.
---

# Jurnii Brand Designer

## When to use
Use when making visual design decisions, restructuring a page layout, or choosing colours, typography, and section hierarchies.

## When not to use
Do not use when auditing commercial logic without visual context, or when making purely structural HTML/CSS adjustments that do not impact visual aesthetics.

## Required inputs
* Current page HTML
* Page purpose and primary buyer brief
* Jurnii Brand Context

## Step-by-step instructions
1. **Determine Hierarchy:** Establish a dark brand background (`#252c1e` or `#2a2a27`) for the primary hero and strategic argument sections to create authority.
2. **Assign Light Sections:** Use off-white (`#f8f8f7`) and elevated white (`#ffffff`) for product explanations, data clarity, and detailed feature breakdowns.
3. **Typography Selection:** Ensure Geist is used for primary typography. Use Geist Mono for metrics, data labels, and technical references. Limit Cormorant Garamond italic to maximum one instance per page for editorial emphasis.
4. **Accent Application:** Use brand green (`#94ff96`) for CTAs, highlights, key metrics, and hero emphasis. Ensure high contrast and do not overuse it.
5. **Data Visualization:** Replace generic illustrations with structured data panels, benchmark tables, metric blocks, or dashboard-style cards. Ensure chart colours stick to brand green for Jurnii/clients and neutral grey for competitors.

## Constraints
* Do not use generic SaaS, cyberpunk, decorative AI, or startup-template styling.
* Do not use generic icons unless they support a clear information hierarchy.
* Do not use more than 4 colours in a single chart.

## Output format
A set of visual design instructions or CSS class assignments that map directly to the Jurnii `colors_and_type.css` tokens.

## Examples where useful
* "I need to design a new hero section for the Jurnii 360 page."
* "The 'How it works' section currently uses standard white cards. How should I restyle this to fit the brand?"
