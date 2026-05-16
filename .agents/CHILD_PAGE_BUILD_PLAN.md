# Child Page Build Plan

This plan maps all missing child pages to be built. It strictly separates the **Canonical Ontology Atoms** (the underlying objects and operators) from the **Public Composite Pages** (the URLs and labels shown to users).

> **Important Constraint**: Public Label != Canonical Feature Object. Public Label != Solution Operator. Public Label != Use Case Field.

---

## Layer 1 — Canonical Ontology Atoms

### Products
What is sold, adopted, licensed, or deployed.
- Jurnii UX
- Jurnii 360
- Cortex

### Feature Objects
Native domain object nouns. (No composite phrases allowed here).
- **Jurnii UX**: Journeys, Usability, Performance, Perception
- **Jurnii 360**: Promotions, Offers, Banners, Segments, Trends, Alerts, Database, Exports, Indices, Timings
- **Cortex**: Assistant, Reports, Scenarios, Budgets, Channels, Models

### Solution Operators
Nominalised process/transformation applied to a feature.
- Benchmarking, Tracking, Alerting, Attribution, Modelling, Reconciliation, Planning, Reporting, Optimisation, Analysis, Measurement, Segmentation, Timing

### Use Case Fields
The category/field name.
- Industry, Company Type, Role, Commercial Problem, Market

### Values
Entries under a Use Case Field.
- **Industry**: iGaming
- **Company Type**: iGaming Operators, Enterprise Suppliers, Strategic Partners
- **Role**: CPO, CCO, CMO, CEO, Head of CRM / Retention, Head of UX / CX
- **Commercial Problem**: Rising CAC, Player Multi-Homing, Platform Commoditisation, Manual Benchmarking, No Attribution, Siloed Intelligence, Regulatory Margin Compression

---

## Layer 2 — Public Composite Pages

### Product Pages
| Target Path | Public Label | Page Pillar | Product(s) | Build Status |
|---|---|---|---|---|
| `/products/jurnii-ux.html` | Jurnii UX | Product | Jurnii UX | Existing |
| `/products/jurnii-360.html` | Jurnii 360 | Product | Jurnii 360 | Existing |
| `/products/cortex.html` | Cortex | Product | Cortex | Existing |

### Feature/Capability Pages
*Note: Public page labels map to product messaging, but their decomposition roots them in the ontology.*

| Target Path | Public Label | Page Pillar | Product(s) | Canonical Feature Object(s) | Solution Operator(s) | Build Status | Source |
|---|---|---|---|---|---|---|---|
| `/features/journey-effectiveness.html` | Journey Effectiveness | Feature | Jurnii UX | Journeys | Benchmarking, Analysis | Pending | PDF |
| `/features/usability.html` | Usability | Feature | Jurnii UX | Usability | Benchmarking, Analysis | Pending | PDF |
| `/features/performance.html` | Performance | Feature | Jurnii UX | Performance | Benchmarking, Measurement | Pending | PDF |
| `/features/perception.html` | Perception | Feature | Jurnii UX | Perception | Benchmarking, Analysis | Pending | PDF |
| `/features/competitor-promotion-tracking.html`| Competitor Promotion Tracking | Feature | Jurnii 360 | Promotions | Tracking, Analysis | Pending | Product Messaging |
| `/features/release-timing-insights.html`| Release Timing Insights | Feature | Jurnii 360 | Timings | Timing, Analysis | Pending | Product Messaging |
| `/features/offer-benchmarking.html` | Offer Benchmarking | Feature | Jurnii 360 | Offers | Benchmarking, Analysis | Pending | Product Messaging |
| `/features/banner-creative-messaging-intelligence.html`| Banner Creative & Messaging Intelligence | Feature | Jurnii 360 | Banners | Tracking, Analysis | Pending | Product Messaging |
| `/features/market-segmentation-targeting-analysis.html`| Market Segmentation & Targeting Analysis | Feature | Jurnii 360 | Segments | Segmentation, Analysis | Pending | Product Messaging |
| `/features/trend-spotting-market-shifts.html`| Trend Spotting & Market Shifts | Feature | Jurnii 360 | Trends | Tracking, Analysis | Pending | Product Messaging |
| `/features/real-time-alerts.html` | Real-Time Alerts | Feature | Jurnii 360 | Alerts | Alerting | Pending | Product Messaging |
| `/features/historical-database-reporting.html`| Historical Database & Reporting | Feature | Jurnii 360 | Database | Reporting, Analysis | Pending | Product Messaging |
| `/features/promo-richness-index.html`| Promo Richness Index | Feature | Jurnii 360 | Indices | Measurement, Reporting | Pending | Product Messaging |
| `/features/mmm-ready-data-export.html`| MMM-Ready Data Export | Feature | Jurnii 360, Cortex| Exports | Reporting | Pending | Product Messaging |
| `/features/ai-analytics-assistant.html` | AI Analytics Assistant | Feature | Cortex | Assistant | Analysis, Reporting | Pending | PDF |
| `/features/causal-impact-mmm-attribution.html`| Causal Impact & MMM Attribution | Feature | Cortex | Models | Attribution, Modelling, Analysis | Pending | PDF |
| `/features/cross-channel-gantt-planning.html`| Cross-Channel Gantt Planning | Feature | Cortex | Channels | Planning | Pending | PDF |
| `/features/finance-reconciliation-reporting.html`| Finance Reconciliation & Reporting | Feature | Cortex | Budgets | Reconciliation, Reporting | Pending | PDF |
| `/features/ai-snapshot-reports.html` | AI Snapshot Reports | Feature | Cortex | Reports | Reporting | Pending | PDF |
| `/features/scenario-planning.html` | Scenario Planning | Feature | Cortex | Scenarios | Planning | Pending | PDF |

### Solution Pages
*Commercial problem/outcome pages.*

| Target Path | Public Label | Page Pillar | Product(s) | Canonical Feature Object(s) | Solution Operator(s) | Use Case Field(s) | Value(s) | Build Status |
|---|---|---|---|---|---|---|---|---|
| `/solutions/ux-benchmarking.html` | UX Benchmarking | Solution | Jurnii UX | Journeys, Usability, Performance, Perception | Benchmarking, Analysis, Reporting | Role, Company Type, Commercial Problem | CPO, Head of UX / CX, iGaming Operators, Manual Benchmarking | To Modify |
| `/solutions/conversion-optimisation.html` | Conversion Optimisation | Solution | Jurnii UX | Journeys, Usability | Optimisation, Analysis | Role, Company Type, Commercial Problem | CPO, iGaming Operators, Platform Commoditisation | To Modify |
| `/solutions/competitor-intelligence.html` | Competitor Intelligence | Solution | Jurnii 360 | Promotions, Offers, Banners, Segments, Trends, Alerts, Database, Indices, Timings | Tracking, Alerting, Benchmarking, Analysis, Reporting | Role, Company Type, Commercial Problem | CCO, CMO, Head of CRM / Retention, iGaming Operators, Manual Monitoring | To Modify |
| `/solutions/retention-intelligence.html` | Retention Intelligence | Solution | Jurnii 360 | Offers, Segments, Trends | Tracking, Analysis | Role, Company Type, Commercial Problem | Head of CRM / Retention, CCO, iGaming Operators, Player Multi-Homing | Pending |
| `/solutions/marketing-attribution.html` | Marketing Attribution | Solution | Cortex | Budgets, Channels, Models, Reports | Attribution, Modelling, Reconciliation, Reporting, Analysis | Role, Commercial Problem | CMO, CEO, No Attribution, Siloed Intelligence | Pending |
| `/solutions/marketing-mix-modelling.html` | Marketing Mix Modelling | Solution | Cortex | Models | Modelling, Analysis | Role, Commercial Problem | CMO, CEO, No Attribution | Pending |

### Use Case Value Pages
| Target Path | Public Label | Page Pillar | Use Case Field | Value | Related Product(s) | Persona Type(s) | Build Status | Source |
|---|---|---|---|---|---|---|---|---|
| `/use-cases/role/cpo.html` | CPO | Use Case | Role | CPO | Jurnii UX | C-Suite | Pending | ICP |
| `/use-cases/role/cco.html` | CCO | Use Case | Role | CCO | Jurnii 360 | C-Suite | Pending | ICP |
| `/use-cases/role/cmo.html` | CMO | Use Case | Role | CMO | Cortex, Jurnii 360 | C-Suite | Pending | ICP |
| `/use-cases/role/ceo.html` | CEO | Use Case | Role | CEO | Cortex | C-Suite | Pending | ICP |
| `/use-cases/role/head-of-crm-retention.html` | Head of CRM / Retention | Use Case | Role | Head of CRM / Retention | Jurnii 360 | Leader | Pending | ICP |
| `/use-cases/role/head-of-ux-cx.html` | Head of UX / CX | Use Case | Role | Head of UX / CX | Jurnii UX | Leader | Pending | ICP |
| `/use-cases/company-type/igaming-operators.html`| iGaming Operators | Use Case | Company Type | iGaming Operators | All | Operator | Pending | ICP |

### Gateway Pages
| Target Path | Canonical Target | Reason |
|---|---|---|
| `/solutions/auditing.html` | `/solutions/ux-benchmarking.html` | Legacy URL consolidation |
| `/solutions/improvement.html` | `/solutions/conversion-optimisation.html` | Legacy URL consolidation |
| `/solutions/intelligence.html` | `/solutions/competitor-intelligence.html` | Legacy URL consolidation |
| `/services/cro.html` | `/solutions/conversion-optimisation.html` | Services deferred to solutions |
| `/services/analysis.html` | `/solutions/index.html` | Services deferred to solutions |
| `/features/journeys.html` | `/features/journey-effectiveness.html` | Updated ontology name |
| `/features/indices.html` | `/features/promo-richness-index.html` | Updated ontology name |
| `/features/promotions.html` | `/features/competitor-promotion-tracking.html` | Updated ontology name |
| `/use-cases/industry/operators.html` | `/use-cases/company-type/igaming-operators.html` | Operators are a Company Type, not an Industry |
| `/use-cases/industry/suppliers.html` | Deferred | Will gateway to partner channel later |
| `/use-cases/role/head-of-crm.html` | `/use-cases/role/head-of-crm-retention.html` | Expanded label based on ICP |
| `/use-cases/role/head-of-ux.html` | `/use-cases/role/head-of-ux-cx.html` | Expanded label based on ICP |

### Excluded / Deferred Pages
| Label / Concept | Type | Reason |
|---|---|---|
| Jurnii Studio | Product | Deferred; focus solely on the 3 core SaaS products in this phase. |
| `/services/*`, `implementation-services.html` | Concept | Not building out services layer yet. |
| `Budgets`, `Channels`, `Models`, `Reports`, `Scenarios` | Feature Objects | Not public pages. They are ontology atoms that decompose the Cortex features. |
| `/solutions/commercial-intelligence.html` | Category Frame | This is the site frame, not a discrete commercial problem solution. Use `/solutions/index.html` instead. |
| `/solutions/finance-reconciliation.html` | Feature | This is a Cortex feature (`/features/finance-reconciliation-reporting.html`), not a solution. |
| `/solutions/scenario-planning.html` | Feature | This is a Cortex feature (`/features/scenario-planning.html`), not a solution. |
| `/use-cases/company-type/enterprise-suppliers.html` | Value | Secondary strategic partner channel; deferred from the main build phase. |
| `/use-cases/company-type/strategic-partners.html` | Value | Secondary strategic partner channel; deferred from the main build phase. |
