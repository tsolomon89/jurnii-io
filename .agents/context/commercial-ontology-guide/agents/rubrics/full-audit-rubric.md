# Commercial Ontology Mapping — Outcome Rubric

> Outcome criteria for the Coordinator agent. The pipeline produces structured maps, not compliance scores.

---

## Entity Map (Phase 1)

- All six entity types extracted: Brand, Products, Features, Solutions, Use Cases, Personas
- Each entity has both `source_name` (as-is on site) and `framework_name` (normalised)
- Compositions decomposed into atomic parts with originals recorded
- Output written as valid JSON to `01-entity-map.json`
- Summary includes entity counts and decomposition count

## Architecture Map (Phase 2)

- Every crawled page classified into a pillar or marked multi_pillar/unclassified
- Entity placement recorded (dedicated page, shared page, no page)
- Cross-link inventory with existing and possible counts
- Navigation structure documented
- Output written as valid JSON to `02-architecture-map.json`

## Copy-Grammar Map (Phase 3)

- Every page H1 classified by current grammar type and mapped to framework pillar
- All compound phrases identified with atomic components
- Tone mapped to persona type for audience-specific pages
- Navigation labels classified by entity type
- Output written as valid JSON to `03-copy-grammar-map.json`

## CRM Mapping (Phase 4)

- Every entity mapped to a CRM field with bounded lookup table
- Page interactions mapped to CRM events with auto-populated fields
- Full campaign coverage matrix generated with dimension counts
- Qualification gates defined as boolean conditions
- CRM table and relationship model produced
- Output written as valid JSON to `04-crm-mapping.json`

## Compound Effects Map (Phase 5)

- All five effect categories mapped with enabling conditions
- Each condition marked present/absent with specific evidence cited
- Summary includes conditions present vs total per category
- Output written as valid JSON to `05-compound-effects-map.json`

## Transition Costs (Phase 6)

- All cost categories calculated from concrete counts in prior maps
- Derivation sources documented (which map, which field)
- Total hours, calendar weeks, and FTE recommendation included
- Output written as valid JSON to `06-transition-costs.json`

## Final Synthesis

- All six maps synthesised into a single executive summary
- Entity map, architecture distribution, CRM mapping, effects inventory, and costs summarised
- Written to `00-ontology-synthesis.md`
