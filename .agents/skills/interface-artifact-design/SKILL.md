---
name: "Interface Artifact Design"
description: "A skill governing the construction of complex HTML/CSS interface mockups to communicate proprietary software value."
---

# Interface Artifact Design

This skill governs the creation of complex HTML/CSS interface mockups and visual artifacts for the Jurnii platform. The goal is to visually communicate proprietary iGaming intelligence software capabilities, steering clear of generic SaaS imagery.

## Core Directives

1. **Not Just Images**: The visual artifact is not an image. It is a designed interface object built from HTML/CSS/SVG, with generated images only as supporting atmosphere.
2. **Page-Specific Meaning**: Every artifact must visually encode the specific page topic (e.g., UX benchmarking, attribution modelling).
3. **No Generic Visuals**: Do not build generic hero images. Do not build simple icon cards and call them “visuals.”
4. **Structural Elements**: Artifacts should frequently incorporate:
   - Browser frames / App shells
   - Sidebars and layered depth
   - Floating panels and data pills
   - Status badges and metric overlays
   - Nodes and dashed connector paths
   - Glass cards
5. **HTML/CSS Only**: Use semantic HTML and CSS classes (e.g., `.interface-artifact`, `.artifact-shell`). Do not use Tailwind, React, or any JS framework. Do not use inline spaghetti styling unless unavoidable.
6. **Text Locality**: HTML text must carry the meaning; visuals support and reinforce it. Ensure text within the interface mockups contributes directly to the narrative.
7. **Reusability**: Components must use a reusable structural foundation but maintain page-specific content.
