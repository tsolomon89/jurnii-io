# Jurnii Entity Relationship Map

> **Purpose:** Canonical, source-grounded mapping of all Jurnii commercial entities and their many-to-many relationships.
> **Created:** 2026-05-16
> **Authority:** This document is inferred from primary sources. It supersedes `.agents/SITE_ONTOLOGY.md` where conflicts exist.
> **Grammar:** Strictly follows `.agents/context/commercial-ontology-guide/01-ontology-and-grammar.md`.

---

## 1. Source Inventory

| # | Source | Type | URL / Path | Reviewed | Key Content Extracted | Reliability | Notes |
|---|--------|------|-----------|----------|----------------------|-------------|-------|
| S1 | Jurnii Overview PDF (extracted) | Brand Guide / PDF | `.agents/context/brand-guide/00-jurnii-overview.md` | Yes | Three-product suite, capabilities, proof metrics, comparison table | High — primary content guide | Defines three-product model including Cortex |
| S2 | Brand Foundation | Brand Guide | `.agents/context/brand-guide/01 · Brand Foundation…` | Yes | Purpose, mission, vision, brand values | High | Internal compass document |
| S3 | Market Context | Brand Guide | `.agents/context/brand-guide/02 · Market Context…` | Yes | Category definition, competitive positioning, defensibility | High | Defines "intelligence layer" category |
| S4 | Strategic Narrative | Brand Guide | `.agents/context/brand-guide/03 · Strategic Narrative…` | Yes | Five messaging pillars, boilerplates, taglines | High | Messaging framework |
| S5 | Ideal Customer Profiles | Brand Guide | `.agents/context/brand-guide/04 · Ideal Customer Profiles…` | Yes | Primary ICP (Operators), Secondary ICP (Suppliers), DM profiles, buying triggers | High | Six decision-maker profiles defined |
| S6 | Product Messaging | Brand Guide | `.agents/context/brand-guide/05 · Product Messaging…` | Yes | Canonical product descriptions, per-persona value props, proof points, roadmap messaging | High | **Critical conflict:** describes TWO-product model (UX + 360) with Cortex as roadmap |
| S7 | Sales Messaging | Brand Guide | `.agents/context/brand-guide/07 · Sales Messaging…` | Yes | Objection handling, named clients, proof points | High | Named clients: Evoke, LeoVegas, FDJ, Flutter, Tombola |
| S8 | Sales Assets | Brand Guide | `.agents/context/brand-guide/11 · Sales Assets…` | Yes | Asset inventory, build priorities, case study themes | Medium | Planning doc, not product truth |
| S9 | Ontology Grammar | Ontology Guide | `.agents/context/commercial-ontology-guide/01-ontology-and-grammar.md` | Yes | Entity definitions, grammar rules, classification test | Authoritative | Governing grammar for all classifications |
| S10 | Relational Model | Ontology Guide | `.agents/context/commercial-ontology-guide/02-relational-model.md` | Yes | Cardinality rules, closed loop, join tables | Authoritative | Defines M:M relationships |
| S11 | Website Audit Checklist | Ontology Guide | `.agents/context/commercial-ontology-guide/04-website-audit-checklist.md` | Yes | Four pillars, URL structure, copy grammar, anti-patterns | Authoritative | Audit procedure |
| S12 | Live Homepage | Live Site | `https://www.jurnii.io/` | Yes | Two-product model (UX + 360), Jurnii Studio as service, nav structure | High | **No Cortex on live site** |
| S13 | Live UX Page | Live Site | `https://www.jurnii.io/ux` | Yes | UX product description, four dimensions, FAQ | High | Uses "Jurnii AI" terminology |
| S14 | Live 360 Page | Live Site | `https://www.jurnii.io/360` | Yes | Called "Jurnii C360" in title, competitor intelligence | High | Title says "C360" not "360" |
| S15 | Live Studio Page | Live Site | `https://www.jurnii.io/studio` | Yes | Three service offerings: CRO, Analytics, Design | High | Studio is a service umbrella |
| S16 | Live CRO Page | Live Site | `https://www.jurnii.io/services/cro` | Yes | CRO Programme service, pricing on request | High | Sold service |
| S17 | Live Analysis Page | Live Site | `https://www.jurnii.io/services/analysis` | Yes | Analytics & Measurement service | High | Sold service |
| S18 | Live Design Page | Live Site | `https://www.jurnii.io/services/design-solutions` | Yes | Design Solutions service | High | Sold service |
| S19 | Live Case Studies | Live Site | `https://www.jurnii.io/case-studies` | Yes | 12 case studies, all Jurnii Studio work | High | No Cortex case studies |
| S20 | Live About Page | Live Site | `https://www.jurnii.io/about` | Yes | Team (Fraser Dunk CEO, Mitch V. COO, Tristan Dexter CXO), "Global Network" | High | No Cortex mention |
| S21 | Repo Homepage | Repo | `index.html` | Yes | Three-product model with Cortex in nav | Medium | Redesign in progress |
| S22 | Repo Product Pages | Repo | `products/jurnii-ux.html`, `jurnii-360.html`, `cortex.html` | Yes | All three products built, Cortex page uses "Brand" instead of "Perception" | Medium | Redesign pages |
| S23 | Repo Solution Pages | Repo | `solutions/ux-benchmarking.html`, `conversion-optimisation.html`, `competitor-intelligence.html` | Yes | Three solution pages exist | Medium | Redesign pages |
| S24 | Repo Feature Pages | Repo | `features/journeys.html`, `promotions.html`, `indices.html` | Yes | Three feature pages exist | Medium | Only 3 of ~20 features have pages |
| S25 | Repo Use Case Pages | Repo | `use-cases/industry/operators.html`, `use-cases/role/cpo.html` | Yes | Two use case pages exist | Medium | Only 2 of ~8 values have pages |
| S26 | Prior SITE_ONTOLOGY | Agent Config | `.agents/SITE_ONTOLOGY.md` | Yes | Prior ontology draft with three products + Jurnii Studio | Low — prior draft | Contains errors documented below |
| S27 | Prior ONTOLOGY_RECONCILIATION | Agent Config | `.agents/ONTOLOGY_RECONCILIATION.md` | Yes | Correction log for prior ontology | Medium | Documents known issues |
| S28 | PAGE_ARCHITECTURE | Agent Config | `.agents/PAGE_ARCHITECTURE.md` | Yes | Page build checklist | Medium | Shows what exists vs missing |
| S29 | Content Rules | Agent Config | `.agents/rules/content-and-ontology.md` | Yes | Strictness rules | Authoritative | Governing rules |
| S30 | Page Depth Standards | Agent Config | `.agents/rules/page-depth-standards.md` | Yes | Page depth requirements | Authoritative | Governing rules |

---

## 2. Executive Summary

### Current Live-Site Architecture (jurnii.io — as deployed)

The live site operates a **two-product + one-service model**:

- **Products:** Jurnii UX, Jurnii 360 (called "C360" in page title)
- **Services (Jurnii Studio):** CRO Programmes, Analytics & Measurement, Design Solutions
- **No Cortex:** Cortex does not appear anywhere on the live site
- **Navigation:** Products (UX, 360) → Services (Studio, CRO, Analytics, Design) → Resources → Company
- **Footer:** Products and Services are separate nav groups

### PDF / Brand Guide Architecture (future-state / canonical)

The brand guide (S6) describes a **two-product model** with Cortex as roadmap:

> "Jurnii operates as a single intelligence layer built on two complementary products"

However, the Overview PDF (S1) describes a **three-product suite**:

> "Three products. One intelligence layer." — listing UX, 360, and Cortex

### Repository Architecture (redesign in progress)

The repo presents a **three-product model** with Cortex as a full product, plus Jurnii Studio as a Service Product. This matches the Overview PDF (S1) but not the current live site (S12) or the Product Messaging chapter (S6).

### Key Differences

| Dimension | Live Site | Brand Guide (Ch.5) | Overview PDF | Repo |
|-----------|-----------|-------------------|--------------|------|
| Product count | 2 | 2 (+roadmap) | 3 | 3 (+Studio) |
| Cortex status | Absent | Roadmap / emerging | Full product | Full product |
| Studio status | Service umbrella | Not mentioned | Not mentioned | Service Product |
| 360 naming | "C360" in title | "Jurnii 360" | "Jurnii 360" | "Jurnii 360" |
| UX naming | "Jurnii AI" in FAQ | "Jurnii UX" | "Jurnii UX" | "Jurnii UX" |

### Canonical Recommendation for Redesign

**Treat the Overview PDF (S1) as the canonical product architecture.** It is the most recent, most specific, and most commercially complete source. The brand guide Product Messaging chapter (S6) was likely written before Cortex was confirmed and should be updated.

**Treat Jurnii Studio as a Service Product** per the ontology grammar — it is sold, scoped, and contracted. It should not be classified as merely a "service category."

### Remaining Ambiguities

1. **Cortex maturity:** Is Cortex currently sold to clients, or is it still in development? The proof metrics suggest at least one engagement.
2. **"Brand" vs "Perception":** The repo UX page uses "Brand" as the 4th dimension; the PDF and brand guide use "Perception."
3. **"Jurnii AI" vs "Jurnii UX":** The live site FAQ uses "Jurnii AI" as a product name. The brand guide uses "Jurnii UX."
4. **Jurnii Studio sub-services:** Are CRO / Analytics / Design sold independently, or only under the Studio umbrella?

---

## 3. Products

| ID | Product Name | Product Type | Public Label | Canonical Slug | Sold? | Primary Function | Primary Buyer | Related Features | Related Solutions | Related Use Case Fields | Related Values | Evidence | Confidence | Notes |
|----|-------------|-------------|-------------|---------------|-------|-----------------|--------------|-----------------|------------------|----------------------|---------------|----------|------------|-------|
| P1 | Jurnii UX | Platform Product | Jurnii UX / UX Intelligence | `/products/jurnii-ux` | Yes | AI-powered UX benchmarking across 4 dimensions | CPO, Head of UX | F1 Journeys, F2 Usability, F3 Performance, F4 Perception | SO1 Benchmarking, SO6 Analysis, SO8 Reporting | Industry, Role | Operators, CPO, Head of UX | S1, S6, S12, S13 | High | Live and sold. 300+ brands analysed. Launched Feb 2024 |
| P2 | Jurnii 360 | Platform Product | Jurnii 360 / Commercial Radar | `/products/jurnii-360` | Yes | Automated competitor promotional intelligence | CCO, CMO, Head of CRM | F5 Promotions, F6 Offers, F7 Banners, F8 Segments, F9 Trends, F10 Alerts, F11 Database, F12 Exports, F13 Indices, F14 Timings | SO2 Tracking, SO3 Alerting, SO6 Analysis, SO8 Reporting | Industry, Role | Operators, CCO, CMO, Head of CRM | S1, S6, S12, S14 | High | Live and sold. 21 feature areas. Daily updates |
| P3 | Cortex | Platform Product | Cortex / Marketing Attribution | `/products/cortex` | Unknown | Marketing intelligence & attribution; MMM | CMO, CEO | F15 Assistant, F16 Reports, F17 Scenarios, F18 Budgets, F19 Channels, F20 Models | SO4 Attribution, SO5 Modelling, SO7 Reconciliation, SO9 Planning, SO8 Reporting, SO6 Analysis | Industry, Role | Operators, CMO, CEO | S1, S22 | Medium | In Overview PDF as full product. Not on live site. One proof engagement ($17.1M budget) suggests at least pilot-sold |
| P4 | Jurnii Studio | Service Product | Jurnii Studio | `/services/jurnii-studio` | Yes | Fractional CX/UX design, analytics, CRO services | CPO, Head of UX, CMO | — (delivers against P1/P2 findings) | SO10 Design, SO11 Experimentation, SO12 Measurement, SO13 Optimisation | Industry, Role | Operators, Suppliers | S12, S15, S16, S17, S18 | High | Live and sold. Three sub-services. Case studies confirm delivery. "Price on Request" |

---

## 4. Feature Objects

| ID | Feature Object | Noun Compliance | Related Product(s) | Possible Public Labels | Related Solution Operator(s) | Evidence | Confidence | Notes |
|----|---------------|----------------|--------------------|-----------------------|-----------------------------|----------|------------|-------|
| F1 | Journeys | ✅ Object noun | P1 Jurnii UX | Journey Effectiveness, User Journeys | Benchmarking, Analysis | S1 "Journey effectiveness", S6, S22 | High | One of the 4 UX dimensions. Page exists: `features/journeys.html` |
| F2 | Usability | ✅ Object noun | P1 Jurnii UX | Usability, Heuristic Analysis | Benchmarking, Analysis | S1, S6, S13 | High | One of the 4 UX dimensions |
| F3 | Performance | ✅ Object noun | P1 Jurnii UX | Performance, Technical Quality | Benchmarking, Measurement | S1, S6, S13 | High | One of the 4 UX dimensions |
| F4 | Perception | ✅ Object noun | P1 Jurnii UX | Perception, Brand Trust | Benchmarking, Analysis | S1 "Perception", S6 "Perception" | High | **Conflict:** Repo UX page uses "Brand" not "Perception." PDF and brand guide say "Perception." Use "Perception" as canonical |
| F5 | Promotions | ✅ Object noun | P2 Jurnii 360 | Live Promotion Tracking, Competitor Promotions | Tracking, Alerting, Analysis | S1, S6, S14 | High | Page exists: `features/promotions.html` |
| F6 | Offers | ✅ Object noun | P2 Jurnii 360 | Offer Benchmarking | Benchmarking, Tracking, Analysis | S1 "Offer benchmarking", S6 | High | Bonus sizes, free bet values, duration |
| F7 | Banners | ✅ Object noun | P2 Jurnii 360 | Banner Intelligence, Creative Monitoring | Tracking, Analysis | S1 (implicit), S6 "Banner creative", S22 | High | Homepage banners, promotional sliders |
| F8 | Segments | ✅ Object noun | P2 Jurnii 360 | Market Segmentation | Analysis, Tracking | S6 "Market segmentation & targeting", S22 | High | Player segment targeting analysis |
| F9 | Trends | ✅ Object noun | P2 Jurnii 360 | Trend Spotting, Market Shifts | Analysis, Tracking | S1 "Trend spotting", S6, S22 | High | Emerging promotional trends |
| F10 | Alerts | ✅ Object noun | P2 Jurnii 360 | Real-Time Alerts | Alerting | S1, S6, S22 | High | Instant notifications |
| F11 | Database | ✅ Object noun | P2 Jurnii 360 | Historical Database | Reporting, Analysis | S1 "Historical database", S6, S22 | High | Full promotional history for longitudinal analysis |
| F12 | Exports | ✅ Object noun | P2 Jurnii 360 | MMM-Ready Data Export | Reporting | S1, S6, S22 | High | Pre-formatted data for MMM |
| F13 | Indices | ✅ Object noun | P2 Jurnii 360 | Promo Richness Index | Measurement, Reporting | S6 "Promo Richness Index", S22 | High | Proprietary metric. Page exists: `features/indices.html` |
| F14 | Timings | ✅ Object noun | P2 Jurnii 360 | Release Timing Insights | Tracking, Analysis | S1 "Timing & sequencing", S6, S22 | Medium | When competitors launch promotions |
| F15 | Assistant | ✅ Object noun | P3 Cortex | AI Analytics Assistant | Analysis | S1, S22 | Medium | AI-powered query interface |
| F16 | Reports | ✅ Object noun | P3 Cortex | AI Snapshot Reports | Reporting | S1, S22 | Medium | Board-ready commercial summaries |
| F17 | Scenarios | ✅ Object noun | P3 Cortex | Scenario Planning | Planning | S1, S22 | Medium | Model future promotional strategies |
| F18 | Budgets | ✅ Object noun | P3 Cortex | Finance Reconciliation | Reconciliation | S1, S22 | Medium | Marketing spend alignment |
| F19 | Channels | ✅ Object noun | P3 Cortex | Cross-channel Planning | Planning | S1 "Cross-channel Gantt", S22 | Medium | Marketing and product roadmap alignment |
| F20 | Models | ✅ Object noun | P3 Cortex | Causal Impact & MMM | Modelling, Attribution | S1, S22 | Medium | MMM models |

---

## 5. Solution Operators

| ID | Solution Operator | Nominalised Compliance | Feature Object(s) It Operates On | Related Product(s) | Possible Public Labels | Related Use Case Fields | Evidence | Confidence | Notes |
|----|------------------|----------------------|--------------------------------|-------------------|----------------------|----------------------|----------|------------|-------|
| SO1 | Benchmarking | ✅ | F1 Journeys, F2 Usability, F3 Performance, F4 Perception, F6 Offers | P1, P2 | UX Benchmarking, Offer Benchmarking | Industry, Role | S1, S6, S13 | High | Core operator across both UX and 360 |
| SO2 | Tracking | ✅ | F5 Promotions, F6 Offers, F7 Banners, F8 Segments, F9 Trends, F14 Timings | P2 | Competitor Intelligence, Retention Intelligence | Industry, Role | S1, S6, S14 | High | Primary 360 operator |
| SO3 | Alerting | ✅ | F10 Alerts, F5 Promotions | P2 | Real-Time Alerts | Industry | S1, S6 | High | Notification system |
| SO4 | Attribution | ✅ | F18 Budgets, F19 Channels, F20 Models | P3 | Marketing Attribution | Role | S1 | Medium | Cortex core operator |
| SO5 | Modelling | ✅ | F20 Models | P3 | Marketing Mix Modelling, Causal Impact & MMM | Role | S1 | Medium | MMM operator |
| SO6 | Analysis | ✅ | F1–F4 (UX), F5–F9 (360), F15 Assistant | P1, P2, P3 | UX Benchmarking, Competitor Intelligence, AI Analytics | Industry, Role | S1, S6 | High | Cross-product operator |
| SO7 | Reconciliation | ✅ | F18 Budgets | P3 | Finance Reconciliation | Role | S1 | Medium | Budget alignment |
| SO8 | Reporting | ✅ | F16 Reports, F11 Database, F12 Exports, F13 Indices | P2, P3 | AI Snapshot Reports, Commercial Intelligence | Role | S1, S6 | High | Cross-product |
| SO9 | Planning | ✅ | F17 Scenarios, F19 Channels | P3 | Scenario Planning, Cross-channel Planning | Role | S1 | Medium | Cortex operator |
| SO10 | Design | ✅ | — (service delivery) | P4 | Design Solutions | Industry, Role | S15, S18 | High | Studio operator |
| SO11 | Experimentation | ✅ | — (service delivery) | P4 | CRO Programmes | Industry, Role | S15, S16 | High | Studio operator |
| SO12 | Measurement | ✅ | — (service delivery) | P4 | Analytics & Measurement | Industry, Role | S15, S17 | High | Studio operator |
| SO13 | Optimisation | ✅ | F1 Journeys, F2 Usability | P1, P4 | Conversion Optimisation | Role | S22, S23 | High | Applied to UX findings |

---

## 6. Public Composite Labels

| Public Label | Likely URL | Page Pillar | Product(s) | Feature Object(s) | Solution Operator(s) | Use Case Field(s) | Value(s) | Persona Type(s) | Source | Should Become Page? | Reason |
|-------------|-----------|-------------|-----------|-------------------|---------------------|-------------------|----------|----------------|--------|-------------------|--------|
| UX Benchmarking | `/solutions/ux-benchmarking` | Solutions | P1 | F1, F2, F3, F4 | Benchmarking, Analysis, Reporting | Industry, Role | Operators, CPO, Head of UX | DM, EU | S1, S6, S22, S23 | Yes | Core solution. Page exists in repo |
| Conversion Optimisation | `/solutions/conversion-optimisation` | Solutions | P1, P4 | F1 Journeys, F2 Usability | Optimisation, Experimentation | Role | CPO, Head of UX | DM, EU | S22, S23, S16 | Yes | Page exists in repo. Bridges product + service |
| Competitor Intelligence | `/solutions/competitor-intelligence` | Solutions | P2 | F5, F6, F7, F8, F9, F10 | Tracking, Alerting, Analysis | Industry, Role | Operators, CCO, CMO | DM | S1, S6, S22, S23 | Yes | Core solution. Page exists in repo |
| Retention Intelligence | `/solutions/retention-intelligence` | Solutions | P2, P1 | F8 Segments, F9 Trends, F1 Journeys | Tracking, Analysis | Role | Head of CRM | DM, EU | S26 | Maybe | Cross-product. Low source evidence beyond prior ontology |
| Marketing Attribution | `/solutions/marketing-attribution` | Solutions | P3 | F18, F19, F20 | Attribution, Reconciliation | Role | CMO, CEO | DM | S1 | Maybe | Depends on Cortex go-live status |
| Marketing Mix Modelling | `/solutions/marketing-mix-modelling` | Solutions | P3 | F20 Models | Modelling | Role | CMO | DM | S1 | Maybe | May merge with Marketing Attribution page |
| Commercial Intelligence | `/solutions/commercial-intelligence` | Solutions | P3, P2 | F16, F17, F11 | Reporting, Planning | Role | CEO, CCO | DM | S1, S26 | Maybe | Broad label. May be too generic for a standalone page |
| Implementation Services | `/services/jurnii-studio` | Solutions/Services | P4 | — | Design, Experimentation, Measurement | Industry, Role | Operators, Suppliers | All | S15, S16, S17, S18 | Yes | Already live. Rebrand as Studio page |
| CRO Programmes | `/services/cro` | Solutions/Services | P4 | — | Experimentation, Optimisation | Role | CPO, Head of UX | DM, EU | S16 | Yes | Already live on current site |
| Analytics & Measurement | `/services/analysis` | Solutions/Services | P4 | — | Measurement, Analysis | Role | CMO, CPO | DM, IN | S17 | Yes | Already live on current site |
| Design Solutions | `/services/design-solutions` | Solutions/Services | P4 | — | Design | Role | CPO, Head of UX | EU | S18 | Yes | Already live on current site |
| Causal Impact & MMM | `/features/causal-impact-mmm` | Features | P3 | F20 Models | Modelling | — | — | — | S1 | No | Composite label. Decompose to Models + Modelling |
| Cross-channel Planning | `/features/cross-channel-planning` | Features | P3 | F19 Channels | Planning | — | — | — | S1 | No | Composite. Decompose to Channels + Planning |
| Finance Reconciliation | `/features/finance-reconciliation` | Features | P3 | F18 Budgets | Reconciliation | — | — | — | S1 | No | Composite. Decompose to Budgets + Reconciliation |
| AI Snapshot Reports | `/features/ai-snapshot-reports` | Features | P3 | F16 Reports | Reporting | — | — | — | S1 | No | Composite. Decompose to Reports + Reporting |
| Scenario Planning | `/features/scenario-planning` | Features | P3 | F17 Scenarios | Planning | — | — | — | S1 | No | Composite. Decompose to Scenarios + Planning |
| AI Analytics Assistant | `/features/ai-analytics-assistant` | Features | P3 | F15 Assistant | Analysis | — | — | — | S1 | No | Composite. Decompose to Assistant + Analysis |

---

## 7. Use Case Fields

| ID | Field Name | Field Type | Allowed Values | Related Products | Related Solutions | Evidence | Confidence | Notes |
|----|-----------|-----------|---------------|-----------------|------------------|----------|------------|-------|
| UC1 | Industry | Firmographic | V1 Operators, V2 Suppliers | P1, P2, P3, P4 | All | S5 (ICP chapter defines Operators as primary, Suppliers as secondary) | High | Primary segmentation field |
| UC2 | Role | Demographic | V3 CPO, V4 CCO, V5 CMO, V6 CEO, V7 Head of CRM, V8 Head of UX | P1, P2, P3, P4 | All | S5 (six DM profiles defined), S6 (per-persona value props) | High | Core persona field |
| UC3 | Market | Geographic | V9 UK, V10 EU, V11 LATAM, V12 North America | P1, P2 | Benchmarking, Tracking | S5 "UK, EU, LATAM, or North America", S3 "regional nuance" | Medium | Mentioned in ICP but not prominent on site |
| UC4 | Company Type | Firmographic | V13 Multi-brand, V14 Single-brand, V15 Challenger | P1, P2 | All | S5 "Multi-brand, multi-jurisdiction… Minimum 3 brands" | Low | Implicit in ICP. Not surfaced as a field |
| UC5 | Commercial Problem | Behavioural | V16 Rising CAC, V17 Player multi-homing, V18 Manual monitoring, V19 No attribution | P1, P2, P3 | Various | S1 "The Challenge" section, S3 pillars | Inferred | Not an explicit field. Could drive content pages |

---

## 8. Use Case Values

| ID | Value | Field (UC#) | Related Products | Related Solutions | Persona Type(s) | Evidence | Confidence | Repo Page | Live Page | Notes |
|----|-------|------------|-----------------|------------------|----------------|----------|------------|-----------|-----------|-------|
| V1 | Operators | UC1 Industry | P1, P2, P3, P4 | All | DM, IN, EU | S5 "Primary ICP: Operators", S6 value props per product | High | `use-cases/industry/operators.html` ✅ | ❌ | Primary target. iGaming operators with 3+ brands |
| V2 | Suppliers | UC1 Industry | P4 | Design, Measurement, Experimentation | DM, IN | S5 "Secondary ICP: Suppliers" | Medium | ❌ | ❌ | Agencies, affiliates, platform providers. Studio-focused |
| V3 | CPO | UC2 Role | P1 | Benchmarking, Optimisation, Analysis | DM | S5 "Chief Product Officer", S6 value props, S7 objection handling | High | `use-cases/role/cpo.html` ✅ | ❌ | "Roadmap prioritisation mapped to revenue impact" |
| V4 | CCO | UC2 Role | P2 | Tracking, Alerting, Reporting | DM | S5 "Chief Commercial Officer", S6 "Track market generosity" | High | ❌ | ❌ | "Board-level market context" |
| V5 | CMO | UC2 Role | P2, P3 | Tracking, Attribution, Modelling, Reporting | DM | S5 "Chief Marketing Officer", S6, S7 | High | ❌ | ❌ | "Explain performance variance with market evidence" |
| V6 | CEO | UC2 Role | P3, P2 | Reporting, Attribution, Planning | DM | S5 (implied), S22 Cortex page | Medium | ❌ | ❌ | "Defensible, board-ready market context" |
| V7 | Head of CRM | UC2 Role | P2 | Tracking, Alerting | IN | S5 (implied via retention), S22 360 page | Medium | ❌ | ❌ | "Track competitor retention offers" |
| V8 | Head of UX | UC2 Role | P1, P4 | Benchmarking, Design, Optimisation | IN/EU | S22 UX page "Head of UX" cross-link | Medium | ❌ | ❌ | "Commercially weighted design advocacy" |
| V9 | UK | UC3 Market | P1, P2 | Benchmarking, Tracking | — | S5 | Low | ❌ | ❌ | Geographic ICP criteria |
| V10 | EU | UC3 Market | P1, P2 | Benchmarking, Tracking | — | S5 | Low | ❌ | ❌ | Geographic ICP criteria |
| V11 | LATAM | UC3 Market | P1, P2 | Benchmarking, Tracking | — | S5 | Low | ❌ | ❌ | Geographic ICP criteria |
| V12 | North America | UC3 Market | P1, P2 | Benchmarking, Tracking | — | S5 | Low | ❌ | ❌ | Geographic ICP criteria |

---

## 9. Personas

| ID | Persona Type | Field Value(s) | Seniority | Department | Buying Triggers | Products Used | Solutions Relevant | Evidence | Confidence |
|----|-------------|---------------|-----------|-----------|----------------|--------------|-------------------|----------|------------|
| PE1 | Decision Maker | V3 CPO | C-Suite | Product | Roadmap pressure from board, subjective UX debates, loss of market share | P1 | Benchmarking, Optimisation, Analysis | S5, S6, S7 | High |
| PE2 | Decision Maker | V4 CCO | C-Suite | Commercial | CPA variance unexplainable, competitor offers disrupting margin, board demands evidence | P2, P3 | Tracking, Alerting, Reporting, Attribution | S5, S6, S7 | High |
| PE3 | Decision Maker | V5 CMO | C-Suite | Marketing | Budget justification pressure, no causal attribution, overspend on uncompetitive mechanics | P2, P3 | Tracking, Attribution, Modelling, Reporting | S5, S6, S7 | High |
| PE4 | Decision Maker | V6 CEO | C-Suite | Executive | Board needs defensible market context, org-wide alignment on market reality | P3, P2 | Reporting, Planning | S5 (implied), S22 | Medium |
| PE5 | Influencer | V7 Head of CRM | VP/Director | CRM/Retention | Player multi-homing, competitor retention offers eroding base | P2 | Tracking, Alerting | S5 (implied), S22 | Medium |
| PE6 | End User | V8 Head of UX | VP/Director | Design/UX | Need commercial evidence to justify design investment, replacing subjective audits | P1, P4 | Benchmarking, Design, Optimisation | S22 | Medium |

---

## 10. Relationship Matrices

### 10.1 Product ↔ Feature Matrix

| | F1 Journeys | F2 Usability | F3 Performance | F4 Perception | F5 Promotions | F6 Offers | F7 Banners | F8 Segments | F9 Trends | F10 Alerts | F11 Database | F12 Exports | F13 Indices | F14 Timings | F15 Assistant | F16 Reports | F17 Scenarios | F18 Budgets | F19 Channels | F20 Models |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **P1 Jurnii UX** | ● | ● | ● | ● | | | | | | | | | | | | | | | | |
| **P2 Jurnii 360** | | | | | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | | | | | | |
| **P3 Cortex** | | | | | | | | | | | | | | | ● | ● | ● | ● | ● | ● |
| **P4 Studio** | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |

> P4 Jurnii Studio does not own Feature Objects. It delivers against the findings of P1–P3.

### 10.2 Feature ↔ Solution Matrix

| | SO1 Benchmarking | SO2 Tracking | SO3 Alerting | SO4 Attribution | SO5 Modelling | SO6 Analysis | SO7 Reconciliation | SO8 Reporting | SO9 Planning | SO10 Design | SO11 Experimentation | SO12 Measurement | SO13 Optimisation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **F1 Journeys** | ● | | | | | ● | | | | | | | ● |
| **F2 Usability** | ● | | | | | ● | | | | | | | ● |
| **F3 Performance** | ● | | | | | | | | | | | ● | |
| **F4 Perception** | ● | | | | | ● | | | | | | | |
| **F5 Promotions** | | ● | ● | | | ● | | | | | | | |
| **F6 Offers** | ● | ● | | | | ● | | | | | | | |
| **F7 Banners** | | ● | | | | ● | | | | | | | |
| **F8 Segments** | | ● | | | | ● | | | | | | | |
| **F9 Trends** | | ● | | | | ● | | | | | | | |
| **F10 Alerts** | | | ● | | | | | | | | | | |
| **F11 Database** | | | | | | ● | | ● | | | | | |
| **F12 Exports** | | | | | | | | ● | | | | | |
| **F13 Indices** | | | | | | | | ● | | | | ● | |
| **F14 Timings** | | ● | | | | ● | | | | | | | |
| **F15 Assistant** | | | | | | ● | | | | | | | |
| **F16 Reports** | | | | | | | | ● | | | | | |
| **F17 Scenarios** | | | | | | | | | ● | | | | |
| **F18 Budgets** | | | | ● | | | ● | | | | | | |
| **F19 Channels** | | | | | | | | | ● | | | | |
| **F20 Models** | | | | ● | ● | | | | | | | | |

### 10.3 Solution ↔ Use Case Value Matrix

| | V1 Operators | V2 Suppliers | V3 CPO | V4 CCO | V5 CMO | V6 CEO | V7 Head of CRM | V8 Head of UX |
|---|---|---|---|---|---|---|---|---|
| **SO1 Benchmarking** | ● | | ● | | | | | ● |
| **SO2 Tracking** | ● | | | ● | ● | | ● | |
| **SO3 Alerting** | ● | | | ● | | | ● | |
| **SO4 Attribution** | ● | | | | ● | ● | | |
| **SO5 Modelling** | ● | | | | ● | | | |
| **SO6 Analysis** | ● | ● | ● | ● | ● | | | ● |
| **SO7 Reconciliation** | ● | | | | ● | ● | | |
| **SO8 Reporting** | ● | | | ● | ● | ● | | |
| **SO9 Planning** | ● | | | | ● | ● | | |
| **SO10 Design** | ● | ● | ● | | | | | ● |
| **SO11 Experimentation** | ● | ● | ● | | | | | ● |
| **SO12 Measurement** | ● | ● | | | ● | | | |
| **SO13 Optimisation** | ● | | ● | | | | | ● |

### 10.4 Product ↔ Use Case Value Matrix

| | V1 Operators | V2 Suppliers | V3 CPO | V4 CCO | V5 CMO | V6 CEO | V7 Head of CRM | V8 Head of UX |
|---|---|---|---|---|---|---|---|---|
| **P1 Jurnii UX** | ● | | ● | | | | | ● |
| **P2 Jurnii 360** | ● | | | ● | ● | | ● | |
| **P3 Cortex** | ● | | | | ● | ● | | |
| **P4 Studio** | ● | ● | ● | | ● | | | ● |

---

## 11. Discrepancy Register

| # | Discrepancy | Source A | Source B | Severity | Resolution | Status |
|---|------------|---------|---------|----------|------------|--------|
| D1 | **Cortex: product vs. roadmap** | S1 (Overview PDF): full product, three-product model | S6 (Product Messaging): "Cortex will evolve" — positioned as roadmap | High | **Recommend: adopt three-product model per S1.** Cortex page exists in repo with real proof metrics ($17.1M engagement). S6 should be updated | Open — requires stakeholder confirmation |
| D2 | **"Perception" vs. "Brand"** as 4th UX dimension | S1 (Overview): "Perception", S6 (Product Messaging): "Perception" | S22 (Repo UX page): uses "Brand" as 4th dimension card | Medium | **Use "Perception" as canonical.** Both primary sources (S1, S6) use it. Repo page should be corrected | Open — fix in page build |
| D3 | **"Jurnii AI" vs. "Jurnii UX"** product naming | S13 (Live UX FAQ): uses "Jurnii AI" in answer text | S1, S6 (Brand Guide): "Jurnii UX" | Medium | **"Jurnii UX" is canonical.** "Jurnii AI" appears to be a legacy naming or CMS error on the live site | Open — fix in live CMS |
| D4 | **"C360" vs. "Jurnii 360"** | S14 (Live 360 page title): "Jurnii C360" | S1, S6: "Jurnii 360" | Low | **"Jurnii 360" is canonical.** "C360" appears to be a CMS shorthand | Cosmetic — fix in live CMS |
| D5 | **Jurnii Studio classification** | S12, S15 (Live site): operates as a service umbrella | S26 (Prior SITE_ONTOLOGY): classified as "Service Product" | Medium | **Classify as Service Product per ontology grammar.** It is sold, scoped, and contracted. The ontology guide defines this type | Resolved — adopt "Service Product" classification |
| D6 | **Studio sub-services: independent or bundled?** | S16, S17, S18 (Live service pages): each has own URL, own pricing structure, own CTA | S15 (Studio hub page): presents all three as studio offerings | Low | **Independent pages are correct.** Sub-services are individually sold. Hub page is an aggregation view | Resolved — current structure is valid |
| D7 | **Feature pages in nav: only 2 of 20** | S22 (Repo nav): shows only Journeys, Promotions | S1, S6: describe 15+ feature capabilities | High | **Expand Feature nav progressively.** Not all 20 features need pages at launch, but at minimum add: Usability, Performance, Perception, Offers, Alerts, Indices | Open — see page build order |
| D8 | **Solution pages: 3 built, 6+ needed** | S23 (Repo): UX Benchmarking, Conversion Optimisation, Competitor Intelligence | S1, S6: Marketing Attribution, MMM, Commercial Intelligence, Retention Intelligence mentioned | Medium | **Build in phases.** Priority: Marketing Attribution (if Cortex is live), Retention Intelligence, Commercial Intelligence | Open — depends on Cortex status |
| D9 | **Use Case pages: 2 built, 8+ values exist** | S25 (Repo): Operators, CPO only | S5 (ICP chapter): CCO, CMO, CEO, Head of CRM, Head of UX, Suppliers all defined | High | **Build Role pages for CCO and CMO next.** These are highest-value decision-maker personas. Add Suppliers as secondary industry page | Open — see build order |
| D10 | **Live site vs repo navigation divergence** | S12 (Live): Products/Services/Resources/Company | S21 (Repo): Products/Features/Solutions/Use Cases | High | **Repo navigation follows the ontology "Four Pillars" structure.** Live site should migrate to this model. Services live under Solutions or as their own pillar | Open — architectural decision |

---

## 12. Page Architecture Recommendations

### Confirmed Pages (exist in repo or live)

| Pillar | Slug | Entity ID | Status | Depth |
|--------|------|-----------|--------|-------|
| Product | `/products/jurnii-ux` | P1 | ✅ Repo | Deep |
| Product | `/products/jurnii-360` | P2 | ✅ Repo | Deep |
| Product | `/products/cortex` | P3 | ✅ Repo | Deep |
| Feature | `/features/journeys` | F1 | ✅ Repo | Deep |
| Feature | `/features/promotions` | F5 | ✅ Repo | Deep |
| Feature | `/features/indices` | F13 | ✅ Repo | Shallow |
| Solution | `/solutions/ux-benchmarking` | SO1+F1-4 | ✅ Repo | Deep |
| Solution | `/solutions/conversion-optimisation` | SO13+F1,2 | ✅ Repo | Moderate |
| Solution | `/solutions/competitor-intelligence` | SO2+F5-10 | ✅ Repo | Deep |
| Use Case | `/use-cases/industry/operators` | V1 | ✅ Repo | Deep |
| Use Case | `/use-cases/role/cpo` | V3 | ✅ Repo | Deep |
| Service | `/services/jurnii-studio` | P4 | ✅ Live | Moderate |
| Service | `/services/cro` | P4/SO11 | ✅ Live | Moderate |
| Service | `/services/analysis` | P4/SO12 | ✅ Live | Moderate |
| Service | `/services/design-solutions` | P4/SO10 | ✅ Live | Moderate |

### Priority Pages to Build

| Priority | Pillar | Slug | Entity ID | Rationale |
|----------|--------|------|-----------|-----------|
| 1 | Use Case | `/use-cases/role/cco` | V4 | Highest-value DM for P2 (360). No page exists. Primary buyer for Competitor Intelligence |
| 2 | Use Case | `/use-cases/role/cmo` | V5 | Highest-value DM for P3 (Cortex) and secondary for P2. No page exists |
| 3 | Feature | `/features/usability` | F2 | Core UX dimension. Referenced but no page exists |
| 4 | Feature | `/features/performance` | F3 | Core UX dimension. Referenced but no page exists |
| 5 | Feature | `/features/perception` | F4 | Core UX dimension. Referenced but no page exists. Resolves D2 |
| 6 | Feature | `/features/offers` | F6 | Core 360 feature. High commercial value |
| 7 | Feature | `/features/alerts` | F10 | Core 360 feature. Differentiating capability |
| 8 | Use Case | `/use-cases/role/head-of-ux` | V8 | Secondary DM for P1. High Studio cross-sell |
| 9 | Use Case | `/use-cases/industry/suppliers` | V2 | Secondary ICP. Studio-focused |
| 10 | Solution | `/solutions/marketing-attribution` | SO4 | Cortex core. Depends on Cortex go-live |

### Build Order (waves)

**Wave 1: Complete the closed loop for P1 + P2 (products already sold)**
- Feature: `/features/usability` (F2)
- Feature: `/features/performance` (F3)
- Feature: `/features/perception` (F4)
- Use Case: `/use-cases/role/cco` (V4)
- Use Case: `/use-cases/role/cmo` (V5)

**Wave 2: Deepen 360 feature coverage**
- Feature: `/features/offers` (F6)
- Feature: `/features/alerts` (F10)
- Feature: `/features/banners` (F7)
- Feature: `/features/timings` (F14)

**Wave 3: Expand use cases + secondary solution pages**
- Use Case: `/use-cases/role/head-of-ux` (V8)
- Use Case: `/use-cases/role/head-of-crm` (V7)
- Use Case: `/use-cases/industry/suppliers` (V2)
- Solution: `/solutions/retention-intelligence`

**Wave 4: Cortex launch pages (conditional on go-live)**
- Solution: `/solutions/marketing-attribution`
- Solution: `/solutions/marketing-mix-modelling`
- Feature: `/features/models` (F20)
- Feature: `/features/reports` (F16)
- Feature: `/features/scenarios` (F17)
- Use Case: `/use-cases/role/ceo` (V6)

### Cross-Linking Requirements

Every page must satisfy these minimum cross-link rules:

| Page Type | Must Link To |
|-----------|-------------|
| Product page | ≥3 Features, ≥2 Solutions, ≥2 Use Case Values, sibling Products |
| Feature page | Parent Product(s), ≥1 Solution, ≥1 Use Case Value |
| Solution page | ≥1 Product, ≥2 Features, ≥1 Use Case Value |
| Use Case page | ≥1 Product, ≥2 Solutions, related Use Case Values |
| Service page | Studio hub, related Products, related case studies |

---

## 13. The Closed Relational Loop

```
Product ──has──→ Feature
Feature ──carries──→ Solution
Solution ──serves──→ Use Case (Field:Value)
Use Case ──associated with──→ Persona
Persona ──associated with──→ Product
                                ↑ loop closes
```

**Validation:** Every entity in this document can be traced through the full loop:

```
P1 Jurnii UX → F1 Journeys → SO1 Benchmarking → V3 CPO → PE1 Decision Maker → P1 ✅
P2 Jurnii 360 → F5 Promotions → SO2 Tracking → V4 CCO → PE2 Decision Maker → P2 ✅
P3 Cortex → F20 Models → SO5 Modelling → V5 CMO → PE3 Decision Maker → P3 ✅
P4 Studio → (delivers against P1 findings) → SO10 Design → V8 Head of UX → PE6 End User → P4 ✅
```

---

## 14. Proof Metrics (Source-Grounded)

| Metric | Value | Product | Source |
|--------|-------|---------|--------|
| Brands benchmarked | 300+ | P1 Jurnii UX | S1 |
| Data points per audit | 1,000+ | P1 Jurnii UX | S1, S13 |
| Recommendations per audit | 70+ | P1 Jurnii UX | S1 |
| Feature areas tracked (360) | 21 | P2 Jurnii 360 | S1 |
| Monthly promotions tracked | 400+ | P2 Jurnii 360 | S1 |
| Monthly odds boosts tracked | 5,000+ | P2 Jurnii 360 | S1 |
| Market visibility | 100% automated | P2 Jurnii 360 | S1 |
| ROI improvement | +46% | P3 Cortex | S22 |
| Budget reconciliation | $4.85M | P3 Cortex | S22 |
| Reporting speed improvement | 3× | P3 Cortex | S22 |
| Annual planning acceleration | 40× | P3 Cortex | S22 |
| Budget analysed | $17.1M | P3 Cortex | S22 |
| NPS Score | 100 | P4 Studio | S15, S16 |
| Client Satisfaction | 9/10 | P4 Studio | S15, S16 |
| Named clients | Evoke, LeoVegas, FDJ, Flutter, Tombola | All | S7 |

---

*End of document.*


## Implementation Correction � Child Page Architecture

**Date:** May 2026

Following a review of the child-page building documentation, several corrections have been made to align with the canonical product messaging (Jurnii_Overview.pdf and  5 � Product Messaging):

- **Service Pages Removed:** The site architecture focuses strictly on the three software products (Jurnii UX, Jurnii 360, Cortex). Jurnii Studio and broader service pages have been deferred to avoid diluting the SaaS proposition.
- **Use Case Fields Corrected:** Operators and Suppliers are not industries; they are classified under the Company Type field. Industry is strictly iGaming.
- **Vague Feature Atoms Replaced:** Generic nouns (e.g., Budgets, Models, Channels) were incorrect targets for public child pages. The public pages now map directly to the source-grounded capabilities listed in the messaging docs (e.g., Causal Impact & MMM Attribution, Competitor Promotion Tracking).
- **Solutions Restructured:** Solutions are maintained strictly as commercial problem/outcome hubs without generating arbitrary new solutions from legacy copy.

These corrections ensure that the public website faithfully represents the **Three products. One intelligence layer.** architecture without hallucinating non-existent pages or collapsing the commercial ontology.
