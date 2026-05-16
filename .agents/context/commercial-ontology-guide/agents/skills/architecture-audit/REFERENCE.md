# Architecture Mapping — Reference

> Detailed mapping rules and output schema for the architecture mapping phase.

---

## Purpose

Given the entity map from Phase 1 and the live website, classify every page into the four-pillar content model and produce a structured architecture map. This is a discovery and classification task — the map shows where content currently lives relative to the framework's organising structure.

---

## Input

- `/mnt/user/outputs/01-entity-map.json` — entity inventory
- Live site via `web_fetch` — page structure, navigation, cross-linking

---

## Mapping Sections

### 2.1 Page-to-Pillar Classification

For every page crawled, assign it to the pillar it most closely serves:

| Pillar | Cognitive Function | Signals |
|:---|:---|:---|
| **Products** | "What can I buy?" | Pricing, plans, packaging, sign-up CTAs |
| **Features** | "What does it include?" | Object descriptions, capability lists, specifications |
| **Solutions** | "What does it do for me?" | Process descriptions, outcomes, workflow narratives |
| **Use Cases** | "How was it used by someone like me?" | Industry/role context, testimonials, case studies |

Pages that serve multiple pillars simultaneously → mark as `multi-pillar` and list which pillars are present.

Pages that don't fit any pillar → mark as `unclassified` (e.g., About, Careers, Legal).

### 2.2 Entity Placement Map

For each entity in the entity map, record:
- Which pages reference this entity
- Whether the entity has a dedicated page or is embedded in a shared page
- How the entity is presented (headline, section, sidebar mention, navigation label)

### 2.3 Cross-Link Inventory

Record existing relationships between pages:
- Feature pages linking to their parent Products
- Solution pages linking to the Features they apply to
- Use Case pages linking to relevant Solutions and Products
- Product pages listing their Features, Solutions, Use Cases

For each relationship type, record both the links that exist and the entity pairs that have no link.

### 2.4 Navigation Structure Map

Document the current navigation hierarchy:
- Top-level nav items and their children
- Footer navigation structure
- Sidebar/secondary navigation patterns
- Breadcrumb patterns

---

## Output Schema

Write to `/mnt/user/outputs/02-architecture-map.json`:

```json
{
  "target": "https://example.com",
  "page_classification": {
    "products": [
      { "url": "/products/platform", "entities_referenced": ["Revenue Platform"], "pillar_confidence": "high" }
    ],
    "features": [
      { "url": "/features/contacts", "entities_referenced": ["Contacts"], "pillar_confidence": "high" }
    ],
    "solutions": [],
    "use_cases": [
      { "url": "/industries/saas", "entities_referenced": ["Industry:SaaS"], "pillar_confidence": "high" }
    ],
    "multi_pillar": [
      { "url": "/platform", "pillars_present": ["Products", "Features", "Solutions"], "entities_referenced": ["Revenue Platform", "Contacts", "Automation"] }
    ],
    "unclassified": ["/about", "/careers", "/legal"]
  },
  "entity_placement": {
    "entities_with_dedicated_pages": ["Revenue Platform", "Contacts"],
    "entities_on_shared_pages": [
      { "entity": "Automation", "pages": ["/platform"], "presentation": "section" }
    ],
    "entities_with_no_page": ["Scoring", "Forecasting"]
  },
  "cross_links": {
    "feature_to_product": { "existing": 3, "possible": 8, "links": [] },
    "solution_to_feature": { "existing": 0, "possible": 6, "links": [] },
    "use_case_to_solution": { "existing": 2, "possible": 12, "links": [] },
    "product_to_feature": { "existing": 5, "possible": 8, "links": [] }
  },
  "navigation_structure": {
    "top_nav": ["Products", "Pricing", "Resources", "Company"],
    "footer_nav": ["Products", "Company", "Legal"],
    "breadcrumbs_present": false,
    "secondary_nav_present": false
  },
  "summary": {
    "total_pages_classified": 35,
    "pillar_distribution": { "products": 3, "features": 8, "solutions": 0, "use_cases": 4, "multi_pillar": 5, "unclassified": 15 },
    "entities_with_dedicated_pages": 10,
    "entities_on_shared_pages_only": 4,
    "entities_with_no_page": 2
  }
}
```
