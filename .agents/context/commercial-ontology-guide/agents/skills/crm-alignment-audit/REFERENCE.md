# CRM Schema Mapping — Reference

> Detailed mapping rules and output schema for the CRM mapping phase.

---

## Purpose

Generate a CRM data model from the extracted ontology. Map every entity to a CRM field, every site interaction to a CRM event, and produce the full campaign coverage matrix. This agent does NOT connect to a live CRM — it produces the structured mapping.

---

## Input

Read from `/mnt/user/outputs/`:
- `01-entity-map.json` — entity inventory
- `02-architecture-map.json` — site structure
- `03-copy-grammar-map.json` — copy grammar

---

## 4.1 Schema–Copy Parity Table

For every entity in the entity map, define its CRM field:

| Entity Type | CRM Field | Field Type | Table |
|:---|:---|:---|:---|
| Product | `product_name` | Lookup (bounded) | `Products` |
| Feature | `feature_name` | Lookup (bounded) | `Features` |
| Solution | `solution_name` | Lookup (bounded) | `Solutions` |
| Use Case | `use_case_field` | Lookup (bounded) | `UseCases` |
| Value | `use_case_value` | Enum within field | `UseCaseValues` |
| Persona | `persona_type` | Enum | `Personas` |

All fields must use bounded lookup tables, not free text.

## 4.2 Typed Coordinates

Map site interactions to CRM events:

| Page Type | CRM Event | Fields Auto-Populated |
|:---|:---|:---|
| Feature page view | Feature interaction | `feature_id`, `contact_id`, `timestamp` |
| Solution page view | Solution interaction | `solution_id`, `contact_id`, `timestamp` |
| Product page view | Product interest | `product_id`, `contact_id`, `timestamp` |
| Form submission | Lead creation | `contact_id` + all populated fields |

Document which fields can be inferred from behaviour vs. which require form input.

## 4.3 Campaign Coverage Matrix

Generate: `Products × Persona Types × Opportunity Types × Use Case Values = Campaigns`

Record the full combinatorial matrix, noting which cells have existing content and which are empty.

## 4.4 Qualification Gate Definitions

Define stage transitions as boolean conditions:

| Gate | Condition |
|:---|:---|
| MQL → SQL | Budget > threshold AND Decision Maker identified |
| SQL → FTP | Contract reviewed AND technical validation complete |
| FTP → RTP | Contract signed AND payment processed |

---

## Output Schema

Write to `/mnt/user/outputs/04-crm-mapping.json`:

```json
{
  "schema_parity": {
    "entity_to_field_map": [
      { "entity_type": "Product", "entity_name": "Revenue Platform", "crm_field": "product_name", "field_type": "lookup", "table": "Products" }
    ],
    "total_entities_mapped": 16,
    "total_crm_fields": 16
  },
  "typed_coordinates": {
    "interaction_map": [
      { "page_type": "Feature page", "crm_event": "Feature interaction", "auto_fields": ["feature_id", "contact_id", "timestamp"] }
    ],
    "minimum_form_fields": ["email", "first_name", "company"],
    "behaviour_inferred_fields": ["product_interest", "feature_interest", "solution_interest"]
  },
  "campaign_matrix": {
    "dimensions": {
      "products": 2,
      "persona_types": 3,
      "opportunity_types": 2,
      "use_case_values": 8
    },
    "total_cells": 96,
    "cells_with_content": 24,
    "cells_empty": 72,
    "matrix": []
  },
  "qualification_gates": [
    { "gate": "MQL → SQL", "conditions": ["budget > threshold", "decision_maker_identified"] },
    { "gate": "SQL → FTP", "conditions": ["contract_reviewed", "technical_validation_complete"] }
  ],
  "crm_tables": {
    "tables": ["Organisations", "Brands", "Products", "Features", "ProductFeatures", "Solutions", "FeatureSolutions", "UseCases", "UseCaseValues", "Personas", "Pipelines", "Campaigns", "Contacts", "Accounts", "Activities"],
    "relationships": [
      "Organisations 1:M Brands",
      "Brands 1:M Products",
      "Products M:M Features (via ProductFeatures)",
      "Features M:M Solutions (via FeatureSolutions)",
      "Pipelines 1:M Campaigns",
      "Contacts M:1 Accounts"
    ]
  },
  "summary": {
    "total_entities_mapped": 16,
    "total_crm_fields": 16,
    "campaign_coverage_pct": 25,
    "qualification_gates_defined": 3
  }
}
```
