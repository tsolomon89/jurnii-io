# Visual QA

This workflow acts as the final gate check before committing visual updates to the repository.

## Verification Steps

1. **Artifacts Render**: Do the HTML/CSS/SVG artifacts render correctly without overflowing their containers?
2. **Path Validity**: Are all image `src` paths and external references resolving properly (no 404s)?
3. **Mobile Layout Check**: Have you verified the layout on narrow screens? (e.g., sidebars hide or stack, grids switch to single columns).
4. **No Generic Visuals**: Does the page look like generic SaaS, or does it feel like proprietary iGaming software? If it feels generic, revise the artifact.
5. **No Missing References**: Ensure all SVGs and webp images required by the page exist in the tree.
6. **Accessibility Regressions**: Are all SVG diagrams labeled? Are we respecting `prefers-reduced-motion` for radar sweeps and pulses?
7. **No Framework Introduction**: Confirm that no Tailwind, React, or external animation libraries have been sneaked into the codebase. All styles must live in `assets/site.css`.
