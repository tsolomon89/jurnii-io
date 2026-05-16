# Transition Cost Modelling — Reference

> Detailed formulas and output schema for the transition cost modelling phase.

---

## Purpose

Quantify the effort to fully adopt the Commercial Ontology Framework. All estimates derive from concrete counts in the prior phase outputs — entities, pages, compositions, vocabulary divergence.

---

## Input

Read all outputs from `/mnt/user/outputs/`:
- `01-entity-map.json` — entity counts, decompositions
- `02-architecture-map.json` — page counts, multi-pillar pages, entity placement
- `03-copy-grammar-map.json` — grammar divergence, compositions
- `04-crm-mapping.json` — CRM field counts, campaign coverage

---

## Cost Categories

### Retagging

Effort to classify and label existing content against the ontology.

| Factor | Source | Calculation |
|:---|:---|:---|
| Pages to classify | Phase 2: total pages | Count |
| Assets to retag | Estimate: 3× page count | Pages × 3 |
| CRM fields to define | Phase 4: total CRM fields | Count |
| Time per item | — | ~15 minutes |
| **Total hours** | — | `(pages + assets + fields) × 0.25` |

### Restructuring

Effort to reorganise content to match the four-pillar model.

| Factor | Source | Calculation |
|:---|:---|:---|
| Multi-pillar pages to separate | Phase 2: multi_pillar count | Count |
| Entities needing dedicated pages | Phase 2: entities_with_no_page | Count |
| Headlines to normalise | Phase 3: grammar divergence count | Count |
| Compositions to separate | Phase 3: compositions count | Count |
| Time per page | — | ~2 hours |
| **Total hours** | — | `(separations + new_pages + h1s + decompositions) × 2` |

### Learning Curve

| Factor | Estimate |
|:---|:---|
| Team training sessions | 2–3 sessions of 2 hours each |
| Ramp-up quarter | First quarter at ~70% creative velocity |
| Documentation creation | 8–16 hours for internal playbooks |

### Transition Period

| Factor | Impact |
|:---|:---|
| Parallel-run period | 4–6 weeks running existing and new structures |
| Reporting gap | Historical data not directly comparable |
| Creative velocity dip | ~30% reduction during first quarter |

---

## Output Schema

Write to `/mnt/user/outputs/06-transition-costs.json`:

```json
{
  "retagging": {
    "pages_to_classify": 35,
    "assets_to_retag": 105,
    "crm_fields_to_define": 16,
    "estimated_hours": 39,
    "estimated_weeks": "2 weeks (1 FTE)"
  },
  "restructuring": {
    "multi_pillar_pages_to_separate": 5,
    "entities_needing_dedicated_pages": 2,
    "headlines_to_normalise": 7,
    "compositions_to_separate": 4,
    "estimated_hours": 36,
    "estimated_weeks": "2-3 weeks (1 FTE)"
  },
  "learning_curve": {
    "training_sessions": 3,
    "training_hours": 6,
    "documentation_hours": 12,
    "ramp_up_velocity": "70% for first quarter"
  },
  "transition_period": {
    "parallel_run_weeks": 5,
    "reporting_gap": true,
    "creative_velocity_impact": "-30%"
  },
  "total_estimate": {
    "total_hours": 93,
    "calendar_weeks": "5-7 weeks",
    "team_size_recommended": "1-2 FTE",
    "roi_break_even": "Quarter 2 post-transition"
  },
  "derivation_sources": {
    "retagging_from": "02-architecture-map.json → total pages + 04-crm-mapping.json → total fields",
    "restructuring_from": "02-architecture-map.json → multi_pillar + entities_with_no_page + 03-copy-grammar-map.json → compositions + grammar divergence"
  },
  "summary": "Full transition requires approximately 93 hours over 5-7 weeks. All estimates derived from concrete counts in the prior phase maps."
}
```
