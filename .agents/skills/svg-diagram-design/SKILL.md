---
name: "SVG Diagram Design"
description: "A skill for authoring hand-coded, semantic SVGs that communicate intelligence layer structures and workflows."
---

# SVG Diagram Design

This skill governs the creation of hand-authored, semantic SVG diagrams. These diagrams act as the visual backbone for explaining complex capabilities like the intelligence layer, attribution modelling, and journey tracking.

## Core Directives

1. **Semantic Structure**: All SVGs must be logically structured.
2. **Accessibility**: SVGs must have accessible `<title>` and `<desc>` elements to describe their function.
3. **Responsive**: SVGs should use `viewBox` and relative sizing (`width="100%"`) to remain fluid across all device widths.
4. **No Trapped Text**: Do not trap essential, critical text inside the SVG natively if it prevents accessibility or translation. Short labels ("UX", "360") are acceptable, but paragraphs or critical insights should be HTML overlays.
5. **Visual Elements**: Use the established Jurnii visual language:
   - Dashed signal paths and glowing nodes
   - Intelligence-layer maps and grids
   - Attribution graphs and radar sweeps
   - Journey maps with friction nodes
6. **Reusable Symbols**: Where applicable, define common filters (like glows) and gradients in a `<defs>` block to maintain consistency and reduce file size.
