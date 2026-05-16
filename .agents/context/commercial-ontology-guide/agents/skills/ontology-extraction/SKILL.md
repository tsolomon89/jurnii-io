---
name: ontology-extraction
description: Crawls a target website and organises its existing content into the six Commercial Ontology entity types (Brand, Products, Features, Solutions, Use Cases, Personas). Use when inventorying a site to produce a structured entity map.
---

# Ontology Extraction

## Quick start

1. Crawl the target site starting from homepage navigation
2. Inventory all existing content into the six entity types using the grammar rules below
3. Write the structured entity map to `/mnt/user/outputs/01-entity-map.json`

## What this skill does

Takes existing website content as raw input and applies the Commercial Ontology Framework as the organising layer. The output is a **structured entity map** — not a compliance report. Every piece of commercial content on the site gets classified into its entity type and normalised to the framework's grammar.

## Entity classification grammar

| Entity | Grammar | Max Length | Example |
|:---|:---|:---|:---|
| Brand | Root identity string | — | "Acme" |
| Product | Stable noun phrase | ≤4 words, ≤50 chars | "Revenue Platform" |
| Feature | Object noun | ≤2 words, ≤30 chars | "Contacts" |
| Solution | Nominalised operator | ≤2 words, ≤30 chars | "Automation" |
| Use Case | Field noun (not value) | ≤30 chars | "Industry" |
| Persona | Type + structured values | — | DM + {Dept: Marketing} |

## Crawl strategy

- Follow primary navigation links (Products, Features, Solutions, Pricing, About)
- Crawl up to 50 pages. Skip blogs, news, legal, support
- Prioritise: product pages, feature pages, pricing, use case pages

## Composition decomposition

If content encodes Feature+Solution as a single phrase (e.g. "Lead Scoring"), decompose into both atomic entities:
- Feature = `Leads`, Solution = `Scoring`
- Record the original phrase alongside the decomposition

## Detailed extraction rules and output schema

→ See [REFERENCE.md](REFERENCE.md)
