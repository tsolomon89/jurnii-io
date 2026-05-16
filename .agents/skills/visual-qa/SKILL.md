---
name: "Visual QA"
description: "A skill defining the quality assurance protocol for new interface artifacts and visual system updates."
---

# Visual QA

This skill governs the visual review checklist before any interface artifacts or CSS updates are committed to the repository.

## QA Checklist

1. **Page-Specificity**: Does the visual accurately reflect the core topic of the page?
2. **Generic Check**: Is this a generic SaaS visual? If so, reject it. It must look like proprietary iGaming intelligence software.
3. **Mobile Layout**: Does the artifact break the layout on narrow screens? Verify mobile fallbacks.
4. **Accessibility & Media Queries**: 
   - Ensure SVGs contain `<title>` or are `aria-hidden` if purely decorative.
   - All motion/animation must respect `@media (prefers-reduced-motion: reduce)`.
5. **Path Integrity**: Verify there are no dead image paths or missing SVG references.
6. **Class Purity**: Check that no Tailwind classes, external frameworks, or copied Oblio-specific class names (e.g., specific Oblio structural conventions) were introduced. Use the `assets/site.css` Jurnii classes.
7. **Visual Hierarchy & Alignment**: Does the artifact overshadow the primary text? Is the CTA clear? Ensure the visual reinforces the topic rather than distracting from it.
