# Child Page Build Plan

This plan maps all missing child pages to be built, derived strictly from source-backed product capabilities, commercial problems, and ICP definitions.

## Excluded For Now
- **Jurnii Studio**
- **Service Pages**: `/services/`, `implementation-services.html`
- **Generic Feature Pages**: `Budgets`, `Channels`, `Models`, `Reports`, `Scenarios`
- **Bare Industry Pages**: `Operators`, `Suppliers` (must use Company Type paths)

---

## 1. Products
Use exactly these three products. No Jurnii Studio.

| Product | Architecture Pillar |
|---|---|
| `Jurnii UX` | UX Intelligence |
| `Jurnii 360` | Commercial Radar |
| `Cortex` | Marketing Attribution |

---

## 2. Features / Capability Pages
Grouped strictly by product and matching the product messaging documents and PDF.

### Jurnii UX Features
| Target Path | Public Label |
|---|---|
| `/features/journey-effectiveness.html` | Journey Effectiveness |
| `/features/usability.html` | Usability |
| `/features/performance.html` | Performance |
| `/features/perception.html` | Perception |

### Jurnii 360 Features
| Target Path | Public Label |
|---|---|
| `/features/competitor-promotion-tracking.html` | Competitor Promotion Tracking |
| `/features/release-timing-insights.html` | Release Timing Insights |
| `/features/offer-benchmarking.html` | Offer Benchmarking |
| `/features/banner-creative-messaging-intelligence.html` | Banner Creative & Messaging Intelligence |
| `/features/market-segmentation-targeting-analysis.html` | Market Segmentation & Targeting Analysis |
| `/features/trend-spotting-market-shifts.html` | Trend Spotting & Market Shifts |
| `/features/real-time-alerts.html` | Real-Time Alerts |
| `/features/historical-database-reporting.html` | Historical Database & Reporting |
| `/features/promo-richness-index.html` | Promo Richness Index |
| `/features/mmm-ready-data-export.html` | MMM-Ready Data Export |

### Cortex Features
| Target Path | Public Label |
|---|---|
| `/features/ai-analytics-assistant.html` | AI Analytics Assistant |
| `/features/causal-impact-mmm-attribution.html` | Causal Impact & MMM Attribution |
| `/features/cross-channel-gantt-planning.html` | Cross-Channel Gantt Planning |
| `/features/finance-reconciliation-reporting.html` | Finance Reconciliation & Reporting |
| `/features/ai-snapshot-reports.html` | AI Snapshot Reports |
| `/features/scenario-planning.html` | Scenario Planning |

---

## 3. Solution Pages
Commercial problem and outcome pages.

| Target Path | Public Label |
|---|---|
| `/solutions/ux-benchmarking.html` | UX Benchmarking |
| `/solutions/conversion-optimisation.html` | Conversion Optimisation |
| `/solutions/competitor-intelligence.html` | Competitor Intelligence |
| `/solutions/retention-intelligence.html` | Retention Intelligence |
| `/solutions/marketing-attribution.html` | Marketing Attribution |
| `/solutions/marketing-mix-modelling.html` | Marketing Mix Modelling |
| `/solutions/commercial-intelligence.html` | Commercial Intelligence |
| `/solutions/finance-reconciliation.html` | Finance Reconciliation |
| `/solutions/scenario-planning.html` | Scenario Planning |

---

## 4. Use Case Value Pages
Built hierarchically based on the field/value ontology. Do not use legacy `/use-cases/industry/operators`.

### Role (Build First)
| Target Path | Value |
|---|---|
| `/use-cases/role/cpo.html` | CPO |
| `/use-cases/role/cco.html` | CCO |
| `/use-cases/role/cmo.html` | CMO |
| `/use-cases/role/ceo.html` | CEO |
| `/use-cases/role/head-of-crm-retention.html` | Head of CRM / Retention |
| `/use-cases/role/head-of-ux-cx.html` | Head of UX / CX |

### Company Type (Build Second)
| Target Path | Value |
|---|---|
| `/use-cases/company-type/igaming-operators.html` | iGaming Operators |
| `/use-cases/company-type/enterprise-suppliers.html`| Enterprise Suppliers |
| `/use-cases/company-type/strategic-partners.html` | Strategic Partners |

### Commercial Problem (Build Third)
| Target Path | Value |
|---|---|
| `/use-cases/problem/rising-cac.html` | Rising CAC |
| `/use-cases/problem/player-multi-homing.html` | Player Multi-Homing |
| `/use-cases/problem/platform-commoditisation.html` | Platform Commoditisation |
| `/use-cases/problem/manual-benchmarking.html` | Manual Benchmarking |
| `/use-cases/problem/no-attribution.html` | No Attribution |
| `/use-cases/problem/siloed-intelligence.html` | Siloed Intelligence |
| `/use-cases/problem/regulatory-margin-compression.html`| Regulatory Margin Compression |

---

## 5. Legacy Gateway Decisions
Old legacy paths will be maintained as structural gateways directing to the new canonical routes.

| Legacy Path | Canonical Target |
|---|---|
| `/solutions/auditing.html` | `/solutions/ux-benchmarking.html` |
| `/solutions/intelligence.html` | `/solutions/competitor-intelligence.html` |
| `/solutions/improvement.html` | `/solutions/conversion-optimisation.html` |
| `/services/cro.html` | `/solutions/conversion-optimisation.html` (since services are deferred) |
| `/services/analysis.html` | `/solutions/commercial-intelligence.html` |
| `/use-cases/industry/operators.html` | `/use-cases/company-type/igaming-operators.html` |
| `/use-cases/industry/suppliers.html` | `/use-cases/company-type/enterprise-suppliers.html` |
