# Ontology Extraction — Reference

> Detailed extraction rules and output schema for the entity mapping phase.

---

## Purpose

Given a target website URL, crawl the site and classify all existing commercial content into the six entity types. The output is a structured entity map that downstream agents consume. This is a discovery and classification task — not a compliance audit.

---

## Crawl Strategy

1. Fetch the homepage. Identify the primary navigation structure.
2. Follow all top-level navigation links (Products, Features, Solutions, Pricing, About, Use Cases, Industries, etc.).
3. For each navigation section, fetch up to 20 child pages.
4. Parse pricing pages, footer links, and any "platform" or "overview" pages.
5. Do NOT crawl blog posts, news articles, legal pages, or support/help docs unless they contain product/feature definitions.

---

## Entity Classification Rules

### 1. Brand

| Field | Rule |
|:---|:---|
| Identity | The root name between the subdomain and TLD (e.g., `acme` in `www.acme.com`) |
| Variants | Record how the brand string appears across page titles, logo alt text, footer, social links |
| Sub-brands | List any distinct brand names operating under the same organisation |

### 2. Products

| Field | Rule |
|:---|:---|
| Identification | Every offering, platform, or system being sold, adopted, or licensed |
| Framework name | Normalise to a **stable noun phrase** (≤ 4 words, ≤ 50 characters) |
| Source name | Record the name as it currently appears on the site |
| Pricing | Document default pricing, contract duration, billing frequency if visible. Mark `NOT_FOUND` if not |
| Pipeline type | Classify as: `B2B`, `B2C`, `Reseller`, `Partnership`, or `Investment` |

### 3. Features

| Field | Rule |
|:---|:---|
| Identification | Native objects a Product supports (what it *has*) |
| Framework name | Normalise to an **object noun** (≤ 2 words, ≤ 30 characters) |
| Source name | Record the name as it currently appears on the site |
| Composition test | If the name encodes Feature+Solution (e.g., "Lead Scoring"), decompose: Feature=`Leads`, Solution=`Scoring` |
| Parent products | List which Products this Feature belongs to (M:M) |
| Auxiliary pricing | Note any Feature carrying its own separate pricing |

### 4. Solutions

| Field | Rule |
|:---|:---|
| Identification | Operators or processes applied to Features (what a Feature *does*) |
| Framework name | Normalise to a **nominalised operator** (≤ 2 words, ≤ 30 characters) |
| Source name | Record the name as it currently appears on the site |
| Applied to | List which Features this Solution acts upon (M:M) |
| Reusability | Note if the Solution only applies to one Feature (may be a Feature descriptor) |

### 5. Use Cases

| Field | Rule |
|:---|:---|
| Identification | Targeting/segmentation fields (Sector, Industry, Department, Seniority, Company Size, Location, etc.) |
| Framework name | Normalise to a **field noun** — the category name, not its values |
| Source name | Record the name as it currently appears on the site |
| Values | List the set of values discovered for each field |
| Bundled values | If the site presents a value bundle ("Healthcare companies"), separate: Use Case=`Industry`, Value=`Healthcare` |

### 6. Personas

| Field | Rule |
|:---|:---|
| Identification | Target audience segments per Product |
| Framework structure | Persona Type (Decision Maker / End User / Influencer) + structured set of values across Use Case fields |
| Source representation | Record how the persona is currently represented on the site (narrative, structured, or implicit) |
| Per-product | Note which Product each Persona maps to |

---

## Output Schema

Write the entity map to `/mnt/user/outputs/01-entity-map.json`:

```json
{
  "target": {
    "url": "https://example.com",
    "crawl_timestamp": "2026-05-11T10:00:00Z",
    "pages_crawled": 45
  },
  "brand": {
    "framework_name": "Example",
    "source_variants": ["Example", "Example Inc.", "Example.com"],
    "sub_brands": []
  },
  "products": [
    {
      "framework_name": "Revenue Platform",
      "source_name": "Revenue Growth Suite",
      "pipeline_type": "B2B",
      "pricing": { "visible": true, "default_price": "$99/mo", "billing": "monthly" },
      "source_urls": ["/products/revenue-growth-suite"]
    }
  ],
  "features": [
    {
      "framework_name": "Contacts",
      "source_name": "Contact Management",
      "parent_products": ["Revenue Platform"],
      "decomposed_from": "Contact Management",
      "auxiliary_pricing": false,
      "source_urls": ["/features/contact-management"]
    }
  ],
  "solutions": [
    {
      "framework_name": "Automation",
      "source_name": "Workflow Automation",
      "applied_to_features": ["Contacts", "Leads"],
      "source_urls": ["/solutions/automation"]
    }
  ],
  "use_cases": [
    {
      "framework_name": "Industry",
      "source_name": "Industries We Serve",
      "values": ["SaaS", "Healthcare", "Finance"],
      "source_urls": ["/industries"]
    }
  ],
  "personas": [
    {
      "product": "Revenue Platform",
      "persona_type": "Decision Maker",
      "value_set": { "Department": "Marketing", "Seniority": "Director" },
      "source_representation": "narrative",
      "source_urls": ["/solutions/for-marketing-leaders"]
    }
  ],
  "summary": {
    "entity_counts": { "products": 1, "features": 5, "solutions": 3, "use_cases": 4, "personas": 3 },
    "decompositions_applied": 2,
    "pages_with_no_entity_classification": ["/about", "/careers"]
  }
}
```

---

## Labels

Use these consistently:

| Label | Meaning |
|:---|:---|
| `framework_name` | Entity name normalised to framework grammar |
| `source_name` | Entity name as it currently appears on the site |
| `decomposed_from` | Original compound phrase if decomposition was applied |
| `NOT_FOUND` | Expected data not found on the site |
