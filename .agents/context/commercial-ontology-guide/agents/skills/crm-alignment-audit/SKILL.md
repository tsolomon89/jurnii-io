---
name: crm-alignment-audit
description: Maps extracted website entities into a CRM data model — schema-copy parity table, typed interaction coordinates, campaign coverage matrix, and qualification gate definitions. Produces a structured CRM mapping, not a remediation spec.
---

# CRM Schema Mapping

## Quick start

1. Read all prior outputs from `/mnt/user/outputs/` (01, 02, 03)
2. Map entities to CRM fields, generate coordinates and campaign matrix
3. Write the CRM mapping to `/mnt/user/outputs/04-crm-mapping.json`

## What this skill does

Takes the entity map, architecture map, and copy-grammar map as input, then applies CRM relational modelling as the organising layer. The output is a **structured CRM mapping** — every entity mapped to a CRM field, every page interaction mapped to a CRM event, and the full combinatorial campaign matrix generated.

## Core deliverables

**Schema-copy parity table**: Every entity → CRM field with bounded lookup table.

**Typed coordinates**: Every page interaction → CRM event with auto-populated fields.

**Campaign coverage matrix**: Products × Persona Types × Opportunity Types × Use Case Values.

**Qualification gate definitions**: Boolean conditions for stage transitions.

## Detailed mapping rules and output schema

→ See [REFERENCE.md](REFERENCE.md)
