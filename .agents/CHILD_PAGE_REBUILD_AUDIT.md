# Child Page Rebuild Audit

This audit classifies current on-page references (cards, links, section titles) according to the corrected 3-product architecture. 

**Classification Key:**
- `Build Page`: A valid, source-backed child page needs to be created.
- `Link Existing Page`: The canonical page already exists.
- `Keep as Section`: This is a structural component or proof point, not a child page.
- `Rename / Map`: The label should be updated to point to a canonical child page.
- `Gateway`: Preserve a legacy path that redirects to a canonical target.

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
| Card | Head of UX | `Build Page` | `/use-cases/role/head-of-ux-cx.html` |
| Card | Operators | `Rename / Map` | Point to `/use-cases/company-type/igaming-operators.html` |
| Card | Jurnii 360 | `Link Existing Page` | `/products/jurnii-360.html` |
| Card | Cortex | `Link Existing Page` | `/products/cortex.html` |

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
| Card | Commercial Intelligence | `Build Page` | `/solutions/commercial-intelligence.html` |
| Card | CCO | `Build Page` | `/use-cases/role/cco.html` |
| Card | CMO | `Build Page` | `/use-cases/role/cmo.html` |
| Card | Head of CRM | `Build Page` | `/use-cases/role/head-of-crm-retention.html` |

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
| Card | Commercial Intelligence | `Build Page` | `/solutions/commercial-intelligence.html` |
| Card | CMO | `Build Page` | `/use-cases/role/cmo.html` |
| Card | CEO | `Build Page` | `/use-cases/role/ceo.html` |
| Card | Operators | `Rename / Map` | Point to `/use-cases/company-type/igaming-operators.html` |
| Card | +46% | `Keep as Section` | Metric/Proof |
| Card | 3× | `Keep as Section` | Metric/Proof |
| Card | 40× | `Keep as Section` | Metric/Proof |
| Card | $4.85M | `Keep as Section` | Metric/Proof |

## `features/` & `solutions/` Legacy Gateway Paths

| Current Path | Action | Target / Resolution |
|---|---|---|
| `/solutions/auditing.html` | `Gateway` | `/solutions/ux-benchmarking.html` |
| `/solutions/improvement.html` | `Gateway` | `/solutions/conversion-optimisation.html` |
| `/solutions/intelligence.html` | `Gateway` | `/solutions/competitor-intelligence.html` |
| `/features/indices.html` | `Gateway` | `/features/promo-richness-index.html` |
| `/features/journeys.html` | `Gateway` | `/features/journey-effectiveness.html` |
| `/features/promotions.html` | `Gateway` | `/features/competitor-promotion-tracking.html` |
