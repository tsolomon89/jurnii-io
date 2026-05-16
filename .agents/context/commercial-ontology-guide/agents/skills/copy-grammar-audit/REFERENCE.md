# Copy Grammar Mapping — Reference

> Detailed mapping rules and output schema for the copy-grammar mapping phase.

---

## Purpose

Given the entity map and the live site, classify every headline, navigation label, and CTA against the framework's grammar rules. The output shows how existing language maps to the ontology — not whether it passes or fails.

---

## Input

- `/mnt/user/outputs/01-entity-map.json` — entity inventory
- Live site via `web_fetch` — page headlines, nav labels, CTAs

---

## Mapping Sections

### 3.1 H1 Classification

For every page, collect the `<h1>` tag and classify it:

| Field | Description |
|:---|:---|
| `url` | Page URL |
| `h1_text` | The current H1 |
| `current_grammar` | What grammar pattern the H1 uses now (noun phrase, verb phrase, question, imperative, etc.) |
| `framework_pillar` | Which pillar this page serves (from architecture map or inferred) |
| `framework_grammar` | What grammar the framework expects for this pillar |
| `entity_referenced` | Which entity from the entity map this H1 corresponds to |

### 3.2 Composition Inventory

Scan all headlines and navigation labels. For each compound phrase found:

| Field | Description |
|:---|:---|
| `compound_phrase` | The phrase as found on the site |
| `component_feature` | The Feature atom |
| `component_solution` | The Solution atom |
| `locations` | URLs and positions where this phrase appears |

### 3.3 Tone Map

For pages that address specific audiences, record:

| Field | Description |
|:---|:---|
| `url` | Page URL |
| `detected_audience` | Which Persona Type the page addresses (DM / EU / Influencer / All) |
| `current_tone` | Tone descriptors (e.g., "casual", "data-driven", "aspirational") |
| `framework_tone` | What tone the framework maps to this Persona Type |

Framework tone mapping:
- **Decision Maker**: Reliable, results-oriented, ROI-focused
- **Influencer**: Professional, data-driven, proof-focused
- **End User**: Relatable, empathetic, usability-focused

### 3.4 Navigation Label Map

For each navigation item, record:

| Field | Description |
|:---|:---|
| `label` | The nav label text |
| `entity_type` | Which entity type this label maps to (Product / Feature / Solution / Use Case / none) |
| `entity_match` | Which specific entity from the entity map it corresponds to |
| `current_grammar` | What grammar the label uses |

---

## Output Schema

Write to `/mnt/user/outputs/03-copy-grammar-map.json`:

```json
{
  "target": "https://example.com",
  "h1_map": [
    {
      "url": "/products/platform",
      "h1_text": "Grow Your Revenue",
      "current_grammar": "imperative_verb_phrase",
      "framework_pillar": "Products",
      "framework_grammar": "noun_phrase",
      "entity_referenced": "Revenue Platform"
    }
  ],
  "compositions": [
    {
      "compound_phrase": "Lead Scoring",
      "component_feature": "Leads",
      "component_solution": "Scoring",
      "locations": ["/features/lead-scoring", "/nav"]
    }
  ],
  "tone_map": [
    {
      "url": "/enterprise",
      "detected_audience": "Decision Maker",
      "current_tone": "casual, aspirational",
      "framework_tone": "reliable, results-oriented"
    }
  ],
  "nav_label_map": [
    {
      "label": "Products",
      "entity_type": "pillar_nav",
      "entity_match": null,
      "current_grammar": "noun"
    },
    {
      "label": "Lead Scoring",
      "entity_type": "composition",
      "entity_match": { "feature": "Leads", "solution": "Scoring" },
      "current_grammar": "compound_noun"
    }
  ],
  "summary": {
    "h1s_classified": 25,
    "compositions_found": 4,
    "tone_mapped_pages": 8,
    "nav_labels_classified": 12
  }
}
```
