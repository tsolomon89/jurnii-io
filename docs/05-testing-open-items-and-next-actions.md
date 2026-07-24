# 05 — Testing, Open Items, and Next Actions

This document highlights the real-time status of Jurnii.io, detailing what is completely built, what is partially complete, and the exact next steps needed to prepare the site for launch.

## Repository State & Action Items

| Website Area | Current State | What needs checking |
|---|---|---|
| **Core Homepage (`/index.html`)** | **Built** | Visual QA on mobile layout breakpoints and cross-browser testing for the interactive **Competitor UX Benchmarking Hub**. |
| **Product Detail Pages (`/products/*`)** | **Built** | **Needs design review.** Product pages for Jurnii UX, Jurnii 360, and Cortex are fully built, but copywriting and proof points must be reviewed to ensure they appeal directly to target buyers. |
| **Features Section (`/features/*`)** | **Partial** | **Needs content review.** 39 features pages exist. They must be reviewed to ensure copy is concise, organized, and links back to related products. |
| **Solutions Section (`/solutions/*`)** | **Partial** | **Needs content review.** 24 solution pages exist, but `commercial-intelligence.html` and `implementation-services.html` are **Not implemented**. |
| **Use Cases Section (`/use-cases/*`)** | **Built** | **Needs content review.** Role-specific sub-pages (e.g., CPO, CCO, CMO) are fully built under `use-cases/roles/`. The executive copy should be reviewed to verify metric accuracy. |
| **Services Pages (`/services/*`)** | **Not implemented** | `/services/jurnii-studio.html` is planned but does not yet exist. |
| **Forms & CRM Integration** | **Placeholder** | CTAs use direct `mailto:fraser@jurnii.io` links. A dynamic calendar widget (e.g., Calendly) or form intake tool is **Not implemented**. |
| **Link Integrity** | **Built** | Local link structures are **100% verified** using the repository validation script. No broken internal links exist. |
| **SEO & Metadata** | **Partial** | Meta description tags exist, but custom keywords and social sharing preview images (OG:image) are **Not implemented**. |

---

## Website Testing Checklist

To ensure absolute visual and functional quality before handoff, the following testing checklist must be executed:

- [x] **Homepage renders correctly:** Dark hero assets and interactive telemetry hubs load flawlessly.
- [x] **Main navigation works:** Dynamic dropdown menus open and point to existing local HTML files.
- [x] **Footer links work:** Grouped navigation paths resolve with no broken links.
- [x] **Product pages render:** UX, 360, and Cortex pages resolve without rendering errors.
- [x] **Solution pages render:** High-level solution maps are fully reachable.
- [x] **Use case pages render:** Role, size, department, and sector personas are correctly structured.
- [x] **No broken local links:** Confirmed via Node.js link validation script (zero errors returned).
- [ ] **Mobile layout works:** Semicircle gauges, multi-column navigation, and benchmark tables stack cleanly on iOS/Android devices.
- [ ] **Metadata exists:** Verify SEO page titles and descriptions match Jurnii's commercial ontology.
- [ ] **CTAs go to the right place:** Verify the primary book-a-demo actions launch email clients or schedule widgets.
- [ ] **Build passes:** Ensure that Vercel builds successfully compile the static directory.

---

## Next Action Plan (Next 3 Steps)

1. **Conduct Copy Polish on Product Pages (P0):** Refine the copy on `jurnii-ux.html` and `jurnii-360.html` to eliminate generic SaaS filler and emphasize Jurnii's specific numbers-driven commercial proof points.
2. **Implement Dynamic Booking Form (P1):** Replace static `mailto:` paths on conversion buttons with an embedded demo scheduler to maximize signups.
3. **Execute Mobile Layout Visual QA (P1):** Run responsive browser audits on the interactive home hub and tables to guarantee responsive mobile visual integrity.

---

## Implementation reference

Main files reviewed:
* `validate_links.js` (Automated link validator script)
* `index.html` (Primary landing page and benchmarking hubs)
* `products/` (Product descriptions)
* `solutions/` (Solution layouts)
* `use-cases/` (Persona routes)
