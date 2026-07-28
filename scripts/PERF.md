# CWV / performance tooling

| Script | Purpose |
|--------|---------|
| `scripts/patch-cwv-html.mjs` | Keep all live React HTML pages in sync (production React, pinned Lucide, preconnect/preload, async fonts-mono, body scripts, idle headline-split). Run: `npm run patch:html` |
| `scripts/lighthouse-ci.mjs` | Mobile Lighthouse for `jurnii-360`, `jurnii-ux`, `index`. Fails if CLS > 0.1. |
| `scripts/perf-baselines/` | Phase 0 baseline JSON + `BASELINE.md` |
| `scripts/vite-babel-html-bridge.js` | Vite plugin: turns `type="text/babel"` pages into ES module entries (no Babel Standalone in production builds); keeps Geist Mono async |
| `.github/workflows/deploy-pages.yml` | Build `dist/` and deploy to GitHub Pages (set Pages source to **GitHub Actions**) |

## Authoring vs production

- **Authoring / static preview:** open HTML directly (or `python3 -m http.server`). Uses CDN React production + Babel Standalone.
- **Production build:** `npm run build` → `dist/`. Precompiled JSX, no Babel, hashed assets, web-vitals RUM.
- **GitHub Pages:** must publish the Vite `dist/` output via Actions (not the repo root), or visitors still download Babel.
