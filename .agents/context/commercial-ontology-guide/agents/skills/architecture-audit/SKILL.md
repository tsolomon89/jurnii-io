---
name: architecture-audit
description: Maps a website's existing page structure into the four-pillar content architecture defined by the Commercial Ontology Framework. Produces a structured architecture map showing how current pages distribute across Products, Features, Solutions, and Use Cases pillars.
---

# Architecture Mapping

## Quick start

1. Read the entity map from `/mnt/user/outputs/01-entity-map.json`
2. Use web_fetch to inventory the live site's page structure
3. Classify every page into a pillar and write the architecture map to `/mnt/user/outputs/02-architecture-map.json`

## What this skill does

Takes the entity map and the live site as input, then applies the four-pillar content model as the organising layer. The output is a **structured architecture map** — every page classified by pillar, every entity mapped to its location, every cross-link recorded.

## Four pillars of content

| Pillar | Cognitive function | Content type | URL pattern |
|:---|:---|:---|:---|
| Products | "What can I buy?" | Transactional, definitive | `/products/[name]` |
| Features | "What does it include?" | Informative, structural | `/features/[name]` |
| Solutions | "What does it do for me?" | Empathetic, action-oriented | `/solutions/[name]` |
| Use Cases | "How was it used by someone like me?" | Social proof, success stories | `/use-cases/[value]` |

## Mapping sections

**Page classification**: Assign every crawled page to exactly one pillar (or mark as `unclassified`).

**Entity placement**: For each entity in the entity map, record which pages contain it.

**Cross-linking inventory**: Record existing cross-links between pages across pillars.

**Navigation structure**: Document how the current site navigation organises content.

## Detailed mapping rules and output schema

→ See [REFERENCE.md](REFERENCE.md)
