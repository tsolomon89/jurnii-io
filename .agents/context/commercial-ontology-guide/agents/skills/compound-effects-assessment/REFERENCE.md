# Compound Effects Projection — Reference

> Detailed projection rules and output schema for the compound effects mapping phase.

---

## Purpose

Synthesise outputs from Phases 1–4 and project forward: given the site's current structure, what does each effect domain look like? Describe the observable state, traced to specific data in the prior maps.

---

## Input

Read all outputs from `/mnt/user/outputs/`:
- `01-entity-map.json`
- `02-architecture-map.json`
- `03-copy-grammar-map.json`
- `04-crm-mapping.json`

---

## Domain Projections

### Site Domain

Describe how visitors experience the site structure:

| Observation | Source | What to record |
|:---|:---|:---|
| Navigation paths | Phase 2: `navigation_structure` | Top nav items, depth levels, number of entity types reachable from homepage |
| Page focus | Phase 2: `page_classification` | Count of single-pillar pages vs multi-pillar pages vs unclassified |
| Cross-linking density | Phase 2: `cross_links` | Existing links per relationship type (Feature→Product, Solution→Feature, etc.) and total possible |
| Entity discoverability | Phase 2: `entity_placement` | Entities with dedicated pages vs shared-page-only vs no page |

### Pipeline Domain

Describe what the CRM mapping makes possible:

| Observation | Source | What to record |
|:---|:---|:---|
| Trackable interactions | Phase 4: `typed_coordinates` | Count of interaction types defined and which fields each auto-populates |
| Form-to-behaviour ratio | Phase 4: `typed_coordinates` | List of form-required fields vs behaviour-inferred fields |
| Stage transition definitions | Phase 4: `qualification_gates` | Each gate's boolean conditions and whether data sources are identified |
| Campaign dimensions | Phase 4: `campaign_matrix` | Product × PersonaType × OpportunityType × UseCase matrix dimensions and fill rate |

### Marketing Domain

Describe what experimental and attribution capacity the structure provides:

| Observation | Source | What to record |
|:---|:---|:---|
| Variable isolation | Phase 2: `page_classification` | Average entities per page (lower = better variable isolation) |
| Entity inventory bounds | Phase 1: `summary.entity_counts` | Total entities per type — are they finite and enumerable? |
| Attribution surface | Phase 4: `typed_coordinates` | Which entity types have trackable coordinates defined |

### Team/Cultural Domain

Describe the vocabulary landscape:

| Observation | Source | What to record |
|:---|:---|:---|
| Name divergence | Phase 1: all entities | Count of entities where `source_name` ≠ `framework_name` |
| Decomposition count | Phase 1: `summary.decompositions_applied` | How many compound terms were split into atomic parts |
| Grammar divergence | Phase 3: `h1_map` | Count of H1s where `current_grammar` ≠ `framework_grammar` |
| Tone divergence | Phase 3: `tone_map` | Count of pages where `current_tone` ≠ `framework_tone` |

### Asset Compounding Domain

Describe how the entity graph relates to content growth:

| Observation | Source | What to record |
|:---|:---|:---|
| Pillar completeness | Phase 2: `page_classification` | Which pillars have pages vs which have zero pages |
| Entity coverage | Phase 2: `entity_placement` | Percentage of entities with at least one dedicated page |
| CRM field coverage | Phase 4: `schema_parity` | Percentage of entities mapped to CRM fields |
| Growth pattern | Phase 2: `summary` | Ratio of entities to pages — indicates fragmented vs consolidated content |

---

## Output Schema

Write to `/mnt/user/outputs/05-compound-effects-map.json`:

```json
{
  "site_domain": {
    "nav_depth_levels": 2,
    "entity_types_in_top_nav": 3,
    "single_pillar_pages": 22,
    "multi_pillar_pages": 5,
    "unclassified_pages": 8,
    "cross_links": {
      "feature_to_product": { "existing": 3, "possible": 8 },
      "solution_to_feature": { "existing": 0, "possible": 6 },
      "use_case_to_solution": { "existing": 2, "possible": 12 }
    },
    "entities_with_dedicated_page": 10,
    "entities_shared_page_only": 4,
    "entities_no_page": 2,
    "description": "Visitors can reach 3 of 4 entity types from the top nav. 63% of pages serve a single pillar. Cross-linking is sparse — Solution→Feature links don't exist yet."
  },
  "pipeline_domain": {
    "interaction_types_defined": 4,
    "form_required_fields": ["email", "first_name", "company"],
    "behaviour_inferred_fields": ["product_interest", "feature_interest", "solution_interest"],
    "qualification_gates": 3,
    "campaign_matrix_dimensions": { "products": 2, "persona_types": 3, "opportunity_types": 2, "use_case_values": 8 },
    "campaign_matrix_fill_rate": 0.25,
    "description": "4 interaction types are mapped to CRM events. Behaviour inference covers 3 fields that forms don't need to ask. Campaign matrix is 25% filled — 72 of 96 cells have no content mapped."
  },
  "marketing_domain": {
    "avg_entities_per_page": 1.4,
    "entity_inventory": { "products": 2, "features": 8, "solutions": 5, "use_cases": 4, "personas": 6 },
    "entity_types_with_coordinates": ["products", "features", "solutions"],
    "description": "Entity inventory is bounded at 25 total entities. Average 1.4 entities per page — most pages isolate a single variable. Attribution coordinates exist for 3 of 5 entity types."
  },
  "team_cultural_domain": {
    "name_divergences": 7,
    "decompositions_applied": 4,
    "grammar_divergences": 9,
    "tone_divergences": 3,
    "description": "7 entities use different names on the site vs the framework grammar. 4 compound terms were decomposed. 9 H1s use a different grammar pattern than the framework expects for their pillar."
  },
  "asset_compounding_domain": {
    "pillars_with_pages": ["products", "features", "use_cases"],
    "pillars_without_pages": ["solutions"],
    "entity_coverage_pct": 0.75,
    "crm_field_coverage_pct": 1.0,
    "entity_to_page_ratio": 1.6,
    "description": "3 of 4 pillars have dedicated pages. 75% of entities have at least one page. All entities are mapped to CRM fields. Entity-to-page ratio of 1.6 suggests moderate content consolidation."
  }
}
```

---

## Key Principle

Every field in the output is a **measurement traced to a prior map**, not a judgment. The `description` fields are narrative summaries of the data, not evaluations. They say "X is Y" not "X should be Z."
