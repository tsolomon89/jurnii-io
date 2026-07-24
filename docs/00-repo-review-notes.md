# 00 — Repo Review Notes

## Framework / Stack Identified
* **Static HTML, CSS, JavaScript (Vanilla Stack):** No heavyweight frontend framework (like React, Next.js, or Astro) is used.
* **Vercel Deployments:** The build/hosting system is Vercel (as evidenced by the `.vercel` configuration directory).
* **Node.js Utilities for Syncing Templates:** Custom utility scripts in the root directory serve as a simple build/templating pipeline:
  * `update_nav.js`: Standardizes and propagates a highly robust, dynamic navigation bar across all HTML files.
  * `update_footer.js`: Propagates a uniform, detailed footer across all HTML files.
  * `fix_all_relative_links.js` / `fix_links.js`: Parses and corrects relative path depths (`../`) dynamically based on directory depth.
  * `validate_links.js`: Validates all local href assets to ensure zero broken links in the production build.

## Folders Reviewed
* `/` (Root): Holds `index.html` (the primary landing page) and Node.js sync scripts.
* `/products/`: Core product-specific pages (`jurnii-ux.html`, `jurnii-360.html`, `cortex.html`).
* `/features/`: Sub-pages corresponding to atomic feature capabilities (40 items in total).
* `/solutions/`: Sub-pages detailing specific business outcomes and methodologies (26 items).
* `/use-cases/`: Context-specific landing pages and nested folders (`roles/`, `company-sizes/`, `departments/`, `sectors/`).
* `/assets/`: Shared design systems tokens CSS, global styles CSS, images, SVGs, animations, and typography.
* `/.agents/`: Holds internal rules, workflows, design quality bars, brand guidelines, and skills.

## Pages / Routes Found

| Category | Routes / Slugs (Total count: 87 pages) |
|---|---|
| **Root** | `/index.html` (Primary Homepage) |
| **Products** | `/products/jurnii-ux.html`, `/products/jurnii-360.html`, `/products/cortex.html` |
| **Features** | `/features/index.html` and 39 feature pages (e.g. `/features/competitor-promotions.html`, `/features/brand-usability.html`, `/features/ai-analytics-assistant.html`) |
| **Solutions** | `/solutions/index.html` and 25 solution pages (e.g. `/solutions/ux-benchmarking.html`, `/solutions/conversion-rate-optimization.html`, `/solutions/competitor-intelligence.html`) |
| **Use Cases** | `/use-cases/index.html`, `/use-cases/roles.html`, `/use-cases/company-sizes.html`, `/use-cases/departments.html`, `/use-cases/sectors.html` |
| **Use Cases - Roles** | 9 role pages: `/use-cases/roles/ceo.html`, `/use-cases/roles/cmo.html`, `/use-cases/roles/cco.html`, `/use-cases/roles/coo.html`, `/use-cases/roles/cpo.html`, `/use-cases/roles/cfo.html`, `/use-cases/roles/head-of-product.html`, `/use-cases/roles/head-of-marketing.html`, `/use-cases/roles/head-of-crm.html` |
| **Use Cases - Sizes** | 3 pages: `/use-cases/company-sizes/smb.html`, `/use-cases/company-sizes/midmarket.html`, `/use-cases/company-sizes/enterprise.html` |
| **Use Cases - Depts** | 3 pages: `/use-cases/departments/marketing.html`, `/use-cases/departments/commercial.html`, `/use-cases/departments/product.html` |
| **Use Cases - Sectors**| 3 pages: `/use-cases/sectors/igaming.html`, `/use-cases/sectors/ecommerce.html`, `/use-cases/sectors/fintech.html` |

## Layouts Found
* **Global Navigation:** Dynamically injected, responsive navbar layout featuring sub-menus for Products, Features, Solutions, and Use Cases.
* **Global Footer:** Dynamically injected footer featuring grouped quick links and social links.
* **Dual-Visual Sections:**
  * **Dark Strategic Heros:** High-contrast, premium, dark sections showcasing technical authority and strategic graphics.
  * **Light Content/Data Grids:** Warm, off-white, light background sections showcasing product data tables and scorecards.

## Key Components Found
* **Interactive Competitor UX Benchmarking Hub:** Tabbed component with live JavaScript toggling between Summary Scorecards, Performance Audits, Journey Matrices, and Usability Heuristics.
* **Interface Artifacts:** Live browser-frame visual mockups containing active canvas animations, moving signal paths, and float metrics.
* **Strategic Competitor Benchmark Table:** Comparison table contrasting traditional agencies, generic analytics, and Jurnii's specific advantages.
* **Grouped Dropdown Panels:** Multi-column navigation dropdown grids (Products, 4-column Features, 4-column Solutions, 4-column Use Cases).

## Design System / Tokens Found
* **Stored in `assets/colors_and_type.css`:**
  * **Color Palettes:** warm neutral scale (`--concrete-*`), brand green (`--jurnii-*`), and a primary teal brand theme (`--blue-dianne-*`).
  * **Semantic Tokens:** Support for three separate themes: `light` (off-white default), `dark` (deep charcoal), and `jurnii-v1` (rich Blue Dianne teal theme).
  * **Typography:** Core sans-serif Geist (`--font-sans`), editorial accent Cormorant Garamond (`--font-serif`), and data-forward Geist Mono (`--font-mono`).
  * **Layout Tokens:** Precise 4px grid spacing tokens (`--spacing-1` through `--spacing-24`), card radii, container widths, and mobile break points.

## Content Sources Found
* **Highly Structured HTML Templates:** All textual copy is stored inside static HTML files, constructed following strict ontology structures (Products as Nouns, Features as Objects, Solutions as Operators, Use Cases as Fields).

## SEO / Metadata Setup Found
* **Page-Specific Meta Tags:** `<title>` and `<meta name="description">` tags exist in every page.
* **Structured Hierarchy:** Uses clear heading progression (an `<h1>` per page, sequential `<h2>` to `<h4>` subdivisions) for high crawling efficiency.
* **Lucide Icon Library integration:** Injected via unpkg CDN to provide standard UI wayfinding.

## Forms / Integrations Found
* **Pilots / Demos Callouts:** Directly integrated `mailto:fraser@jurnii.io` email links on primary CTAs.
* **Contact Actions:** Standard `<a href="#">Book Demo</a>` anchor points acting as placeholders for dynamic pilots. No direct API-based CRM connections or forms exist.

## Build / Deploy Setup Found
* **Vercel CLI & Integration:** Built directly from Vercel's automated git-based deployments.
* **Pre-commit / Sync Scripts:** Custom Node.js scripts (`update_nav.js`, `update_footer.js`, `fix_all_relative_links.js`) must be executed to compile and synchronize layouts before code commits are pushed.

## Gaps / Unknowns
* **Manual HTML Management:** Page expansions and modifications require manual edits inside direct HTML structures.
* **Form Automation:** No automated email capture or calendar scheduling tools (like HubSpot or Calendly) are active in the codebase yet.
* **Legacy Gateways:** A few legacy solution files exist (`auditing.html`, `intelligence.html`, `improvement.html`) that serve as gateway pages rather than the primary stable solutions.
