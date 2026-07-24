# 04 — Content, Components, and Reuse

The Jurnii static site is engineered for content consistency and rapid page expansion. Rather than coding every page from scratch, it utilizes modular HTML/CSS design patterns combined with Node-based page build utilities.

## Reusable Components & Layout Areas

| Component / Content Area | Used for | Where it appears |
|---|---|---|
| **Dynamic Global Navigation** | Responsive layout containing centralized Products, Features, Solutions, and Use Case dropdowns. | Standardized at the top of every page; managed dynamically by `update_nav.js`. |
| **Global Footer** | Centralized site index links, copyright details, and social channels. | Standardized at the base of every page; managed dynamically by `update_footer.js`. |
| **High-Fidelity Interface Mockups** | Embeddable dashboard previews (UX scorecard gauges, competitor signal graphs, Cortex charts). | Found in `/assets/visual-components/` and embedded in the Homepage and core product pages. |
| **The Benchmark Comparison Table** | Directly contrasts Jurnii's data advantages against traditional agencies and generic analytics tools. | Homepage and core Solutions pages. |
| **Standard CTA Section** | Prompts readers to request a pilot or contact the sales team. | Placed at the bottom of all product, solution, and use case pages. |
| **Data Metric Strips** | Showcases specific commercial results (e.g., +46% NGR growth, 3x conversion rates, $4.85M reclaimed budget). | cortex.html, CPO/CCO/CMO persona pages, and ROI solutions pages. |
| **Icon-Driven Feature Grid** | Standardized grid lists linking feature objects (e.g., offer feeds, trends, alerts) to parent products. | Features index page (`/features/index.html`) and parent Product pages. |

---

## Why Component Reuse Matters

1. **Brand Consistency:** Propagating navigation, footers, and visual artifacts via Node scripts ensures that a style change (such as an updated link or color token) is instantly updated across all 80+ pages. This prevents layout drift and maintains a premium, polished user experience.
2. **Scalability:** Since layout sections and component styles are managed globally in `assets/site.css` and synchronized via custom scripts, adding a new solution or use case is trivial. A new HTML page can be structured with standard wrappers, and running `node update_nav.js` immediately registers it in the global menu index.
3. **No Redesigning from Scratch:** By reusing the strategic dark heroes and light data scorecard grids, new pages inherit the established category positioning instantly, saving massive development time.

---

## Implementation reference

Main files reviewed:
* `update_nav.js` (Centralizes navigation structure and updates all HTML files)
* `update_footer.js` (Centralizes footer layout and updates all HTML files)
* `fix_all_relative_links.js` (Ensures relative page paths align automatically upon sync)
* `/assets/visual-components/` (Central repository for embedded interface mockups)
