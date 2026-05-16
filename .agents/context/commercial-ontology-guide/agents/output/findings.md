# jurnii.io — Commercial Ontology Mapping (keywords: jurnii, jurnii.io, ontology, audit findings)

Mapping run completed 2026-05-11 against https://www.jurnii.io/. All 6 phase outputs at /mnt/user/outputs/01-entity-map.json … 06-transition-costs.json.

## Site snapshot
- 9 pages crawled: /, /ux, /360, /studio, /services/cro, /services/analysis, /services/design-solutions, /about, /case-studies
- Brand: Jurnii (sub-brand Jurnii Studio); tagline "Experience intelligence"
- 3 Products: Jurnii UX (AI UX benchmarking SaaS, demo-gated), Jurnii 360 (competitor pricing/promotion intel SaaS, demo-gated), Jurnii Studio (services arm — CRO Programmes, Analytics & Measurement, Design Solutions; Price on Request)
- iGaming/Betting is the dominant case-study vertical

## Entity totals
- Products 3 / Features 23 / Solutions 8 / Use-Case fields 4 (19 values) / Personas 4 inferred
- 63 total named entities; 38 ontology entities; 6 (15.8%) have a dedicated page; 0 of 23 features have a page

## Architecture
- 8 of 9 pages conflate ≥2 pillars (avg 2.6 pillars per page; homepage carries all 4)
- URL deviations: Products at flat slugs (no /products/); Solutions at /services/ not /solutions/; no /features/ namespace; no /use-cases/[dimension]
- Cross-links: 18 of 253 possible body-level connections realised (7.1%). Product→Solution body = 0; Solution→Product body = 0; any Feature direction = 0; Use Case → Product/Solution = 0

## Copy grammar
- H1 distribution: 3 claim fragments (/, /ux, /360), 1 declarative sentence (/studio), 3 framework-matching noun phrases (3 service pages), 2 imperative phrases (/about, /case-studies)
- 19 compositions identified (e.g. UX Benchmarking, Heuristic UX Audit, Customer Journey Mapping, Landing Page Optimisation)
- 11 distinct CTAs; 4 booking variants all route to /book → single conversion event regardless of context
- 21 nav labels; 3 naming-drift instances: Jurnii AI↔Jurnii UX, Jurnii C360↔Jurnii 360, Analytics & Reports↔Analytics & Measurement (footer vs nav across all 9 pages)

## CRM mapping
- 27 CRM fields (8 entity-class + 19 structural across Contact, Account, Opportunity, Activity)
- 17 typed interaction events (9 fire without form, auto-populate product/persona context from URL)
- Minimum form payload: 4 fields (first_name, last_name, email, company_name)
- 5 qualification gates Lead→MQL→SQL→FTP→Closed; only Lead→MQL is fully automatable from page signals
- Campaign matrix: 3 Products × 4 Persona Types × 3 Opportunity Types × 5 Industries = 180 cells, 17.8% filled, only 2 "strong" cells (all Jurnii 360 × iGaming Operator × New Business); 60 Renewal cells uniformly empty
- 3 CRM entities unmapped: service_line, billing_type, brand_alias

## Compound effects (projection)
- Site: navigation has 2 qualification layers (Products / Services); 4 layers absent (Industry / Department / Company Type / Engagement Model); only 1 single-pillar page (/case-studies index)
- Pipeline: Studio sub-services collapse to product_name=Jurnii Studio (no service_line field); brand-alias drift can fragment product grouping if reps self-enter aliases
- Marketing: 2.6 avg pillars per page makes single-variable A/B isolation infeasible on 8 of 9 pages; iGaming concentration leaves SaaS/Tech and Digital Gaming under-served
- Team/cultural: vocabulary scaffold strong (63 named entities) but 19 composition habits + 3 active drift instances create rework load
- Asset compounding: 23 features grow as inline text with no URL/CRM signal; new case studies cannot populate dimension indexes that don't exist

## Transition cost (rounded up, honesty rule)
- Retagging 22h; Restructuring 202h; Learning curve 74h; Transition period 126h
- Base total: 424h; with all contingencies: 500h
- Calendar: 11 weeks at 1 FTE, ~13 weeks with 2 FTE parallel, ~7 weeks at 3 FTE
- Restructuring is the critical path; the 23 missing feature pages and namespace migrations dominate

## Anomalies worth remembering
- Jurnii AI / Jurnii UX naming drift suggests internal team uses "Jurnii AI" for the engine and "Jurnii UX" for the SKU — not aligned in marketing copy
- Studio capability ticker on homepage/studio lists capabilities (Product Discovery, UI Design, CRO Testing, Frontend Dev, Heuristic Analysis, Design Systems, UX Audit) that overlap with Studio service deliverables — not extracted as separate features
- 0 standalone feature pages despite 23 features is the single largest structural gap and drives most of the restructuring cost
