# Child Page Rebuild Audit

This audit evaluates current and legacy on-page references against the corrected 3-product architecture, enforcing strict decomposition into the commercial ontology.

**Classification Key:**
- `Build Page`: A valid, source-backed child page needs to be created.
- `Link Existing Page`: The canonical page already exists.
- `Keep as Section`: This is a structural component, proof point, or vague claim, not a child page.
- `Rename / Map`: The label should be updated to point to a canonical child page.
- `Remove`: A reference to a deprecated or invalid concept (e.g. Jurnii Studio).
- `Gateway`: Preserve a legacy path that redirects to a canonical target.
- `Defer`: A valid concept that is not built in this phase.

---

## Global Navigation & Footer

| Label / Path | Action | Target URL | Product(s) | Feature Object(s) | Solution Operator(s) | Use Case Field(s) | Value(s) | Reason |
|---|---|---|---|---|---|---|---|---|
| Products > Jurnii UX | `Link Existing Page` | `/products/jurnii-ux.html` | Jurnii UX | - | - | - | - | Core Product |
| Products > Jurnii 360 | `Link Existing Page` | `/products/jurnii-360.html` | Jurnii 360 | - | - | - | - | Core Product |
| Products > Cortex | `Link Existing Page` | `/products/cortex.html` | Cortex | - | - | - | - | Core Product |
| Products > Jurnii Studio | `Remove` | - | - | - | - | - | - | Excluded from current product suite. |
| Solutions > UX Benchmarking | `Build Page` | `/solutions/ux-benchmarking.html` | Jurnii UX | Journeys, Usability, Performance, Perception | Benchmarking, Analysis, Reporting | Role, Company Type, Commercial Problem | CPO, Head of UX / CX, iGaming Operators, Manual Benchmarking | Core Solution |
| Solutions > Conversion Optimisation | `Build Page` | `/solutions/conversion-optimisation.html` | Jurnii UX | Journeys, Usability | Optimisation, Analysis | Role, Company Type, Commercial Problem | CPO, iGaming Operators, Platform Commoditisation | Core Solution |
| Solutions > Competitor Intelligence | `Build Page` | `/solutions/competitor-intelligence.html` | Jurnii 360 | Promotions, Offers, Banners, Segments, Trends, Alerts, Database, Indices, Timings | Tracking, Alerting, Benchmarking, Analysis, Reporting | Role, Company Type, Commercial Problem | CCO, CMO, Head of CRM / Retention, iGaming Operators, Manual Monitoring | Core Solution |
| Use Cases > Operators | `Rename / Map` | `/use-cases/company-type/igaming-operators.html` | - | - | - | Company Type | iGaming Operators | Operators are not an industry. They are a company-type value. |
| Use Cases > CPO | `Build Page` | `/use-cases/role/cpo.html` | Jurnii UX | - | - | Role | CPO | Core ICP persona |
| Implementation Services | `Remove` | - | - | - | - | - | - | Services deferred. |

---

## `index.html`

| Label / Section | Action | Target URL | Product(s) | Feature Object(s) | Solution Operator(s) | Use Case Field(s) | Value(s) | Reason |
|---|---|---|---|---|---|---|---|---|
| Jurnii UX | `Link Existing Page` | `/products/jurnii-ux.html` | Jurnii UX | - | - | - | - | Core Product |
| Jurnii 360 | `Link Existing Page` | `/products/jurnii-360.html` | Jurnii 360 | - | - | - | - | Core Product |
| Cortex | `Link Existing Page` | `/products/cortex.html` | Cortex | - | - | - | - | Core Product |
| Jurnii Studio | `Remove` | - | - | - | - | - | - | Excluded from current product suite. |

---

## `products/jurnii-ux.html`

| Label / Card | Action | Target URL | Product(s) | Feature Object(s) | Solution Operator(s) | Use Case Field(s) | Value(s) | Reason |
|---|---|---|---|---|---|---|---|---|
| Minutes, Not Weeks | `Keep as Section` | - | - | - | - | - | - | Proof point, not a page. |
| Commercially Weighted | `Keep as Section` | - | - | - | - | - | - | Proof point, not a page. |
| Defensible Prioritisation | `Keep as Section` | - | - | - | - | - | - | Proof point, not a page. |
| Journeys | `Rename / Map` | `/features/journey-effectiveness.html` | Jurnii UX | Journeys | Benchmarking, Analysis | - | - | Product messaging explicitly names this Journey Effectiveness. |
| Usability | `Build Page` | `/features/usability.html` | Jurnii UX | Usability | Benchmarking, Analysis | - | - | Core UX analysis category. |
| Performance | `Build Page` | `/features/performance.html` | Jurnii UX | Performance | Benchmarking, Measurement | - | - | Core UX analysis category. |
| Brand | `Rename / Map` | `/features/perception.html` | Jurnii UX | Perception | Benchmarking, Analysis | - | - | Explicitly listed as Perception in PDF. |
| UX Benchmarking | `Build Page` | `/solutions/ux-benchmarking.html` | Jurnii UX | Journeys, Usability, Performance, Perception | Benchmarking, Analysis, Reporting | Role, Company Type, Commercial Problem | CPO, Head of UX / CX, iGaming Operators, Manual Benchmarking | Valid commercial problem solution. |
| Conversion Optimisation | `Build Page` | `/solutions/conversion-optimisation.html` | Jurnii UX | Journeys, Usability | Optimisation, Analysis | Role, Company Type, Commercial Problem | CPO, iGaming Operators, Platform Commoditisation | Valid commercial problem solution. |
| CPO | `Build Page` | `/use-cases/role/cpo.html` | Jurnii UX | - | - | Role | CPO | Defined ICP. |
| Head of UX | `Rename / Map` | `/use-cases/role/head-of-ux-cx.html` | Jurnii UX | - | - | Role | Head of UX / CX | Defined ICP. |
| Operators | `Rename / Map` | `/use-cases/company-type/igaming-operators.html` | All | - | - | Company Type | iGaming Operators | Operators are a company type, not an industry. |
| Jurnii 360 | `Link Existing Page` | `/products/jurnii-360.html` | Jurnii 360 | - | - | - | - | Existing cross-link. |
| Cortex | `Link Existing Page` | `/products/cortex.html` | Cortex | - | - | - | - | Existing cross-link. |

---

## `products/jurnii-360.html`

| Label / Card | Action | Target URL | Product(s) | Feature Object(s) | Solution Operator(s) | Use Case Field(s) | Value(s) | Reason |
|---|---|---|---|---|---|---|---|---|
| 100% Market Visibility | `Keep as Section` | - | - | - | - | - | - | Core value prop, not a page. |
| Real-Time Alerts | `Rename / Map` | `/features/real-time-alerts.html` | Jurnii 360 | Alerts | Alerting | - | - | Explicit capability in product messaging. |
| MMM-Ready Data | `Rename / Map` | `/features/mmm-ready-data-export.html` | Jurnii 360, Cortex | Exports | Reporting | - | - | Explicit capability in product messaging. |
| Promotions | `Rename / Map` | `/features/competitor-promotion-tracking.html` | Jurnii 360 | Promotions | Tracking, Analysis | - | - | Product messaging lists Competitor Promotion Tracking. |
| Timings | `Rename / Map` | `/features/release-timing-insights.html` | Jurnii 360 | Timings | Timing, Analysis | - | - | Product messaging lists Release Timing Insights. |
| Offers | `Rename / Map` | `/features/offer-benchmarking.html` | Jurnii 360 | Offers | Benchmarking, Analysis | - | - | Product messaging lists Offer Benchmarking. |
| Banners | `Rename / Map` | `/features/banner-creative-messaging-intelligence.html` | Jurnii 360 | Banners | Tracking, Analysis | - | - | Product messaging lists Banner Creative & Messaging Intelligence. |
| Segments | `Rename / Map` | `/features/market-segmentation-targeting-analysis.html` | Jurnii 360 | Segments | Segmentation, Analysis | - | - | Product messaging lists Market Segmentation & Targeting Analysis. |
| Trends | `Rename / Map` | `/features/trend-spotting-market-shifts.html` | Jurnii 360 | Trends | Tracking, Analysis | - | - | Product messaging lists Trend Spotting & Market Shifts. |
| Alerts | `Rename / Map` | `/features/real-time-alerts.html` | Jurnii 360 | Alerts | Alerting | - | - | Explicit capability. |
| Database | `Rename / Map` | `/features/historical-database-reporting.html` | Jurnii 360 | Database | Reporting, Analysis | - | - | Product messaging lists Historical Database & Reporting. |
| Indices | `Rename / Map` | `/features/promo-richness-index.html` | Jurnii 360 | Indices | Measurement, Reporting | - | - | Product messaging lists Promo Richness Index. |
| Exports | `Rename / Map` | `/features/mmm-ready-data-export.html` | Jurnii 360 | Exports | Reporting | - | - | Explicit capability. |
| Competitor Intelligence | `Build Page` | `/solutions/competitor-intelligence.html` | Jurnii 360 | Promotions, Offers, Banners, Segments, Trends, Alerts, Database, Indices, Timings | Tracking, Alerting, Benchmarking, Analysis, Reporting | Role, Company Type, Commercial Problem | CCO, CMO, Head of CRM / Retention, iGaming Operators, Manual Monitoring | Valid commercial problem solution. |
| Retention Intelligence | `Build Page` | `/solutions/retention-intelligence.html` | Jurnii 360 | Offers, Segments, Trends | Tracking, Analysis | Role, Company Type, Commercial Problem | Head of CRM / Retention, CCO, iGaming Operators, Player Multi-Homing | Valid commercial problem solution. |
| Commercial Intelligence | `Remove` | - | - | - | - | - | - | Category frame, not a specific solution page. |
| CCO | `Build Page` | `/use-cases/role/cco.html` | Jurnii 360 | - | - | Role | CCO | Defined ICP. |
| CMO | `Build Page` | `/use-cases/role/cmo.html` | Cortex, Jurnii 360 | - | - | Role | CMO | Defined ICP. |
| Head of CRM | `Rename / Map` | `/use-cases/role/head-of-crm-retention.html` | Jurnii 360 | - | - | Role | Head of CRM / Retention | Defined ICP. |
| Jurnii UX | `Link Existing Page` | `/products/jurnii-ux.html` | Jurnii UX | - | - | - | - | Existing cross-link. |
| Cortex | `Link Existing Page` | `/products/cortex.html` | Cortex | - | - | - | - | Existing cross-link. |

---

## `products/cortex.html`

| Label / Card | Action | Target URL | Product(s) | Feature Object(s) | Solution Operator(s) | Use Case Field(s) | Value(s) | Reason |
|---|---|---|---|---|---|---|---|---|
| Causal Impact | `Rename / Map` | `/features/causal-impact-mmm-attribution.html` | Cortex | Models | Attribution, Modelling, Analysis | - | - | PDF capability. |
| Budget Reconciliation | `Rename / Map` | `/features/finance-reconciliation-reporting.html` | Cortex | Budgets | Reconciliation, Reporting | - | - | PDF capability. |
| AI Analytics | `Rename / Map` | `/features/ai-analytics-assistant.html` | Cortex | Assistant | Analysis, Reporting | - | - | PDF capability. |
| Causal Impact & MMM | `Rename / Map` | `/features/causal-impact-mmm-attribution.html` | Cortex | Models | Attribution, Modelling, Analysis | - | - | PDF capability. |
| Cross-channel Gantt Planning | `Rename / Map` | `/features/cross-channel-gantt-planning.html` | Cortex | Channels | Planning | - | - | PDF capability. |
| AI Analytics Assistant | `Rename / Map` | `/features/ai-analytics-assistant.html` | Cortex | Assistant | Analysis, Reporting | - | - | PDF capability. |
| Finance Reconciliation | `Rename / Map` | `/features/finance-reconciliation-reporting.html` | Cortex | Budgets | Reconciliation, Reporting | - | - | PDF capability. |
| AI Snapshot Reports | `Rename / Map` | `/features/ai-snapshot-reports.html` | Cortex | Reports | Reporting | - | - | PDF capability. |
| Scenario Planning | `Rename / Map` | `/features/scenario-planning.html` | Cortex | Scenarios | Planning | - | - | PDF capability. |
| Marketing Attribution | `Build Page` | `/solutions/marketing-attribution.html` | Cortex | Budgets, Channels, Models, Reports | Attribution, Modelling, Reconciliation, Reporting, Analysis | Role, Commercial Problem | CMO, CEO, No Attribution, Siloed Intelligence | Valid commercial problem solution. |
| Marketing Mix Modelling | `Build Page` | `/solutions/marketing-mix-modelling.html` | Cortex | Models | Modelling, Analysis | Role, Commercial Problem | CMO, CEO, No Attribution | Valid commercial problem solution. |
| Commercial Intelligence | `Remove` | - | - | - | - | - | - | Category frame, not a specific solution page. |
| CMO | `Build Page` | `/use-cases/role/cmo.html` | Cortex, Jurnii 360 | - | - | Role | CMO | Defined ICP. |
| CEO | `Build Page` | `/use-cases/role/ceo.html` | Cortex | - | - | Role | CEO | Defined ICP. |
| Operators | `Rename / Map` | `/use-cases/company-type/igaming-operators.html` | All | - | - | Company Type | iGaming Operators | Operators are a company type, not an industry. |
| +46% / 3x / 40x / $4.85M | `Keep as Section` | - | - | - | - | - | - | Proof points, not pages. |

---

## Legacy Gateway Paths

| Legacy Path | Action | Target URL | Product(s) | Feature Object(s) | Solution Operator(s) | Use Case Field(s) | Value(s) | Reason |
|---|---|---|---|---|---|---|---|---|
| `/solutions/auditing.html` | `Gateway` | `/solutions/ux-benchmarking.html` | Jurnii UX | Journeys, Usability, Performance, Perception | Benchmarking, Analysis, Reporting | Role, Company Type, Commercial Problem | CPO, Head of UX / CX, iGaming Operators, Manual Benchmarking | Consolidate auditing into benchmarking solution. |
| `/solutions/improvement.html` | `Gateway` | `/solutions/conversion-optimisation.html` | Jurnii UX | Journeys, Usability | Optimisation, Analysis | Role, Company Type, Commercial Problem | CPO, iGaming Operators, Platform Commoditisation | Consolidate improvement into conversion optimisation. |
| `/solutions/intelligence.html` | `Gateway` | `/solutions/competitor-intelligence.html` | Jurnii 360 | Promotions, Offers, Banners, Segments, Trends, Alerts, Database, Indices, Timings | Tracking, Alerting, Benchmarking, Analysis, Reporting | Role, Company Type, Commercial Problem | CCO, CMO, Head of CRM / Retention, iGaming Operators, Manual Monitoring | Better naming. |
| `/services/cro.html` | `Gateway` | `/solutions/conversion-optimisation.html` | Jurnii UX | Journeys, Usability | Optimisation, Analysis | Role, Company Type, Commercial Problem | CPO, iGaming Operators, Platform Commoditisation | Services layer removed; CRO maps to conversion optimisation. |
| `/services/analysis.html` | `Gateway` | `/solutions/index.html` | All | - | - | - | - | Services layer removed. |
| `/features/journeys.html` | `Gateway` | `/features/journey-effectiveness.html` | Jurnii UX | Journeys | Benchmarking, Analysis | - | - | Match product messaging terminology. |
| `/features/indices.html` | `Gateway` | `/features/promo-richness-index.html` | Jurnii 360 | Indices | Measurement, Reporting | - | - | Match product messaging terminology. |
| `/features/promotions.html` | `Gateway` | `/features/competitor-promotion-tracking.html` | Jurnii 360 | Promotions | Tracking, Analysis | - | - | Match product messaging terminology. |
| `/use-cases/industry/operators.html`| `Gateway` | `/use-cases/company-type/igaming-operators.html` | All | - | - | Company Type | iGaming Operators | Ontology correction (Company Type). |
| `/use-cases/industry/suppliers.html`| `Defer` | Deferred | - | - | - | Company Type | Enterprise Suppliers | Deferred to partner-channel phase. |
| `/use-cases/role/head-of-crm.html` | `Gateway` | `/use-cases/role/head-of-crm-retention.html` | Jurnii 360 | - | - | Role | Head of CRM / Retention | Exact ICP match. |
| `/use-cases/role/head-of-ux.html` | `Gateway` | `/use-cases/role/head-of-ux-cx.html` | Jurnii UX | - | - | Role | Head of UX / CX | Exact ICP match. |
