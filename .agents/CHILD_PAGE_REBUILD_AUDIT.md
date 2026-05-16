# Child Page Rebuild Audit

This audit evaluates current and legacy on-page references (cards, links, section titles, global nav, and footer) against the corrected 3-product architecture.

**Classification Key:**
- `Build Page`: A valid, source-backed child page needs to be created.
- `Link Existing Page`: The canonical page already exists.
- `Keep as Section`: This is a structural component, proof point, or vague claim, not a child page.
- `Rename / Map`: The label should be updated to point to a canonical child page.
- `Remove`: A reference to a deprecated or invalid concept (e.g. Jurnii Studio).
- `Gateway`: Preserve a legacy path that redirects to a canonical target.
- `Defer`: A valid concept (e.g. enterprise suppliers) that is not built in this phase.

---

## Global Navigation & Footer

| Location | Label / Path | Action | Target / Resolution |
|---|---|---|---|
| Nav / Footer | Products > Jurnii UX | `Link Existing Page` | `/products/jurnii-ux.html` |
| Nav / Footer | Products > Jurnii 360 | `Link Existing Page` | `/products/jurnii-360.html` |
| Nav / Footer | Products > Cortex | `Link Existing Page` | `/products/cortex.html` |
| Nav / Footer | Products > Jurnii Studio | `Remove` | Excluded from current product suite. |
| Nav / Footer | Features > *Various* | `Rename / Map` | Re-map to the new canonical feature routes based on the product messaging doc. |
| Nav / Footer | Solutions > UX Benchmarking | `Build Page` | `/solutions/ux-benchmarking.html` |
| Nav / Footer | Solutions > Conversion Optimisation | `Build Page` | `/solutions/conversion-optimisation.html` |
| Nav / Footer | Solutions > Competitor Intelligence | `Build Page` | `/solutions/competitor-intelligence.html` |
| Nav / Footer | Use Cases > Operators | `Rename / Map` | `/use-cases/company-type/igaming-operators.html` |
| Nav / Footer | Use Cases > CPO | `Build Page` | `/use-cases/role/cpo.html` |
| Footer | Implementation Services | `Remove` | Services deferred. |

---

## `index.html`

| Section / Card | Label | Action | Target / Resolution |
|---|---|---|---|
| Section | Jurnii UX | `Link Existing Page` | `/products/jurnii-ux.html` |
| Section | Jurnii 360 | `Link Existing Page` | `/products/jurnii-360.html` |
| Section | Cortex | `Link Existing Page` | `/products/cortex.html` |
| Section | Jurnii Studio | `Remove` | Excluded from current product suite. |

---

## `products/jurnii-ux.html`

| Section / Card | Label | Action | Target / Resolution |
|---|---|---|---|
| Card | Minutes, Not Weeks | `Keep as Section` | Proof point, not a page. |
| Card | Commercially Weighted | `Keep as Section` | Proof point, not a page. |
| Card | Defensible Prioritisation | `Keep as Section` | Proof point, not a page. |
| Card | Journeys | `Rename / Map` | Point to `Journey Effectiveness` |
| Card | Usability | `Build Page` | `/features/usability.html` |
| Card | Performance | `Build Page` | `/features/performance.html` |
| Card | Brand | `Rename / Map` | Point to `Perception` (`/features/perception.html`) |
| Card | UX Benchmarking | `Build Page` | `/solutions/ux-benchmarking.html` |
| Card | Conversion Optimisation | `Build Page` | `/solutions/conversion-optimisation.html` |
| Card | CPO | `Build Page` | `/use-cases/role/cpo.html` |
| Card | Head of UX | `Rename / Map` | Point to `/use-cases/role/head-of-ux-cx.html` |
| Card | Operators | `Rename / Map` | Point to `/use-cases/company-type/igaming-operators.html` |

---

## `products/jurnii-360.html`

| Section / Card | Label | Action | Target / Resolution |
|---|---|---|---|
| Card | 100% Market Visibility | `Keep as Section` | Core value prop, not a page. |
| Card | Real-Time Alerts | `Rename / Map` | Point to `Real-Time Alerts` (`/features/real-time-alerts.html`) |
| Card | MMM-Ready Data | `Rename / Map` | Point to `MMM-Ready Data Export` (`/features/mmm-ready-data-export.html`) |
| Card | Promotions | `Rename / Map` | Point to `Competitor Promotion Tracking` |
| Card | Timings | `Rename / Map` | Point to `Release Timing Insights` |
| Card | Offers | `Rename / Map` | Point to `Offer Benchmarking` |
| Card | Banners | `Rename / Map` | Point to `Banner Creative & Messaging Intelligence` |
| Card | Segments | `Rename / Map` | Point to `Market Segmentation & Targeting Analysis` |
| Card | Trends | `Rename / Map` | Point to `Trend Spotting & Market Shifts` |
| Card | Alerts | `Rename / Map` | Point to `Real-Time Alerts` |
| Card | Database | `Rename / Map` | Point to `Historical Database & Reporting` |
| Card | Indices | `Rename / Map` | Point to `Promo Richness Index` |
| Card | Exports | `Rename / Map` | Point to `MMM-Ready Data Export` |
| Card | Competitor Intelligence | `Build Page` | `/solutions/competitor-intelligence.html` |
| Card | Retention Intelligence | `Build Page` | `/solutions/retention-intelligence.html` |
| Card | Commercial Intelligence | `Remove` or `Keep as Section` | Category frame, not a specific solution page. |
| Card | CCO | `Build Page` | `/use-cases/role/cco.html` |
| Card | CMO | `Build Page` | `/use-cases/role/cmo.html` |
| Card | Head of CRM | `Rename / Map` | Point to `/use-cases/role/head-of-crm-retention.html` |

---

## `products/cortex.html`

| Section / Card | Label | Action | Target / Resolution |
|---|---|---|---|
| Card | Causal Impact | `Rename / Map` | Point to `Causal Impact & MMM Attribution` |
| Card | Budget Reconciliation | `Rename / Map` | Point to `Finance Reconciliation & Reporting` |
| Card | AI Analytics | `Rename / Map` | Point to `AI Analytics Assistant` |
| Card | Causal Impact & MMM | `Rename / Map` | Point to `Causal Impact & MMM Attribution` |
| Card | Cross-channel Gantt Planning | `Build Page` | `/features/cross-channel-gantt-planning.html` |
| Card | AI Analytics Assistant | `Build Page` | `/features/ai-analytics-assistant.html` |
| Card | Finance Reconciliation | `Rename / Map` | Point to `Finance Reconciliation & Reporting` |
| Card | AI Snapshot Reports | `Build Page` | `/features/ai-snapshot-reports.html` |
| Card | Scenario Planning | `Build Page` | `/features/scenario-planning.html` |
| Card | Marketing Attribution | `Build Page` | `/solutions/marketing-attribution.html` |
| Card | Marketing Mix Modelling | `Build Page` | `/solutions/marketing-mix-modelling.html` |
| Card | Commercial Intelligence | `Remove` or `Keep as Section` | Category frame, not a specific solution page. |
| Card | CMO | `Build Page` | `/use-cases/role/cmo.html` |
| Card | CEO | `Build Page` | `/use-cases/role/ceo.html` |
| Card | Operators | `Rename / Map` | Point to `/use-cases/company-type/igaming-operators.html` |
| Card | +46% / 3x / $4.85M | `Keep as Section` | Proof points, not pages. |

---

## `features/` , `solutions/` , and `use-cases/` Legacy Gateway Paths

| Current / Legacy Path | Action | Target / Resolution |
|---|---|---|
| `/solutions/auditing.html` | `Gateway` | `/solutions/ux-benchmarking.html` |
| `/solutions/improvement.html` | `Gateway` | `/solutions/conversion-optimisation.html` |
| `/solutions/intelligence.html` | `Gateway` | `/solutions/competitor-intelligence.html` |
| `/services/cro.html` | `Gateway` | `/solutions/conversion-optimisation.html` |
| `/services/analysis.html` | `Gateway` | `/solutions/index.html` (or category frame) |
| `/features/journeys.html` | `Gateway` | `/features/journey-effectiveness.html` |
| `/features/indices.html` | `Gateway` | `/features/promo-richness-index.html` |
| `/features/promotions.html` | `Gateway` | `/features/competitor-promotion-tracking.html` |
| `/use-cases/industry/operators.html` | `Gateway` | `/use-cases/company-type/igaming-operators.html` |
| `/use-cases/industry/suppliers.html` | `Gateway` / `Defer` | Deferred to future partner-channel phase. |
| `/use-cases/role/head-of-crm.html` | `Gateway` | `/use-cases/role/head-of-crm-retention.html` |
| `/use-cases/role/head-of-ux.html` | `Gateway` | `/use-cases/role/head-of-ux-cx.html` |
