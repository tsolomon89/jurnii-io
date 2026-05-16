---
name: copy-grammar-audit
description: Maps a website's existing copy (headlines, navigation labels, CTAs) into the Commercial Ontology Framework's grammar structure. Produces a copy-grammar map showing how current language maps to framework entity types, tone expectations, and composition patterns.
---

# Copy Grammar Mapping

## Quick start

1. Read entity map from `/mnt/user/outputs/01-entity-map.json`
2. Use web_fetch to collect H1 tags, nav labels, CTAs from the live site
3. Classify all copy against framework grammar and write the map to `/mnt/user/outputs/03-copy-grammar-map.json`

## What this skill does

Takes the entity map and live site copy as input, then applies the ontology's grammar rules as the organising layer. The output is a **structured copy-grammar map** — every headline classified by its current grammar pattern, every navigation label mapped to its entity type, every composition identified.

## Grammar classification by pillar

| Pillar | Framework grammar | Example |
|:---|:---|:---|
| Product | Noun phrase | "Revenue Platform" |
| Feature | Object noun | "Contacts" |
| Solution | Nominalised operator | "Automation" |
| Use Case | Value + context | "SaaS Marketing" |

## Mapping sections

**H1 classification**: Map every page's H1 to its current grammar type and corresponding framework pillar.

**Composition inventory**: Identify all compound phrases and record their atomic components.

**Tone mapping**: For each page, identify the implicit persona audience and record the current tone.

**Navigation label classification**: Map nav labels to entity types.

## Detailed mapping rules and output schema

→ See [REFERENCE.md](REFERENCE.md)
