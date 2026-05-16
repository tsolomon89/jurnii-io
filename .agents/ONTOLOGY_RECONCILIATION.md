# Ontology Reconciliation

## 1. Current State (Broken) vs. Proposed State (Corrected)

### Products
- **Current:** Jurnii UX, Jurnii 360, Cortex (Mostly correct, but missing service classification)
- **Corrected:**
  - Jurnii UX (Product)
  - Jurnii 360 (Product)
  - Cortex (Product)
  - Jurnii Studio (Service Product / Delivery Product)

### Features
- **Current (Broken):** Included compounds (e.g., Causal Impact & MMM) and generic terms.
- **Corrected (Canonical Object Nouns):**
  - Journeys, Usability, Performance, Perception
  - Promotions, Offers, Banners, Segments, Trends, Alerts, Database, Exports
  - Assistant, Reports, Scenarios, Budgets, Channels, Models

### Solutions
- **Current (Broken):** Included full composite labels as atomic solutions (e.g., UX Benchmarking, Competitor Intelligence, Marketing Attribution).
- **Corrected (Canonical Nominalised Operators):**
  - Benchmarking, Tracking, Alerting, Attribution, Modelling, Reconciliation, Planning, Reporting, Optimisation, Analysis, Measurement, Design, Experimentation

### Use Case Fields
- **Current (Broken):** Conflated Use Cases with Values. Listed "Operators", "CMO", "Head of CRM" as Use Cases.
- **Corrected:**
  - Industry
  - Role

### Values
- **Current (Broken):** Treated as Use Cases.
- **Corrected:**
  - Industry: Operators, Suppliers
  - Role: CPO, CCO, CMO, CEO, Head of CRM, Head of UX

### Personas
- **Current:** Implicit.
- **Corrected:** Decision Maker (DM), End User (EU), Influencer (IN)

## 2. Public Page Labels Decomposed

| Public Label | Page Slug | Product | Feature Object(s) | Solution Operator(s) |
|---|---|---|---|---|
| UX Benchmarking | `/solutions/ux-benchmarking.html` | Jurnii UX | Journeys, Usability, Performance, Perception | Benchmarking, Analysis, Reporting |
| Conversion Optimisation | `/solutions/conversion-optimisation.html` | Jurnii UX | Journeys, Usability | Optimisation |
| Competitor Intelligence | `/solutions/competitor-intelligence.html` | Jurnii 360 | Promotions, Offers, Banners, Segments, Trends, Alerts | Tracking, Alerting, Analysis |
| Retention Intelligence | `/solutions/retention-intelligence.html` | Jurnii 360, Jurnii UX | Segments, Trends, Journeys | Tracking, Analysis |
| Marketing Attribution | `/solutions/marketing-attribution.html` | Cortex | Budgets, Channels, Models | Attribution, Reconciliation |
| Marketing Mix Modelling | `/solutions/marketing-mix-modelling.html` | Cortex | Models | Modelling |
| Commercial Intelligence | `/solutions/commercial-intelligence.html` | Cortex, Jurnii 360 | Reports, Scenarios, Database | Reporting, Planning |
| Implementation Services | `/solutions/implementation-services.html` | Jurnii Studio | Jurnii Studio (Service Product) | Design, Experimentation, Measurement |
| Causal Impact & MMM | `/features/causal-impact-mmm.html` | Cortex | Models | Modelling |
| Cross-channel Planning | `/features/cross-channel-planning.html` | Cortex | Channels | Planning |
| Finance Reconciliation | `/features/finance-reconciliation.html` | Cortex | Budgets | Reconciliation |
| AI Snapshot Reports | `/features/ai-snapshot-reports.html` | Cortex | Reports | Reporting |
| Scenario Planning | `/features/scenario-planning.html` | Cortex | Scenarios | Planning |
| AI Analytics Assistant | `/features/ai-analytics-assistant.html` | Cortex | Assistant | Analysis |

## 3. Legacy Page Strategy

- `/solutions/auditing.html` -> Gateway to `/solutions/ux-benchmarking.html`
- `/solutions/intelligence.html` -> Gateway to `/solutions/competitor-intelligence.html`
- `/solutions/improvement.html` -> Gateway to `/solutions/conversion-optimisation.html`

*Gateways will contain a short explanation, a canonical link to the new URL, a visible button to the new page, and an optional meta refresh. They will not be exposed in the global navigation.*
