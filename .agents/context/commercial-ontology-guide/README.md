> ⚠ **This is the WEBSITE content ontology** (Products / Features / Solutions / Use Cases /
> page grammar). **It is NOT the Zoho CRM commercial model.** For Account / Deal / Contact /
> Product / Quote semantics and cardinality, the authority is
> `zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`.
> The two use overlapping words for different things; do not cross-apply them.

---

# Commercial Ontology Framework — Agent & Operator Guide

> **Purpose**: A unified reference for human operators and AI agents to audit, build, and align any website and CRM to a deterministic commercial ontology.
>
> **Scope**: Website copy, CRM schema, content architecture, campaign structure, and data modeling.

---

## How to Use This Guide

This guide is the canonical reference for structuring commercial positioning. It replaces ad-hoc marketing narratives with a deterministic, relational framework. Every word on a website, every URL path, every CRM field, and every marketing asset must map to a defined, constrained entity in this model.

**For AI agents**: When auditing a website or CRM, walk the documents in order. The ontology defines what each entity *is*. The relational model defines how entities *connect*. The type hierarchy defines how entities *compose* into deployable objects. The audit checklist gives you the step-by-step procedure.

**For human operators**: Start with the audit checklist (Part 4) for the practical workflow. Refer back to Parts 1–3 when you need the structural reasoning behind a rule.

---

## Document Index

| # | Document | What It Covers |
|---|----------|---------------|
| 1 | [Ontology & Grammar](./01-ontology-and-grammar.md) | Canonical definitions of all 16 entities. Grammar rules. The "Fast Classification Test." |
| 2 | [Relational Model](./02-relational-model.md) | Entity cardinality, join tables, many-to-many edges, qualification gates, normalization. |
| 3 | [Type Hierarchy & Execution](./03-type-hierarchy-and-execution.md) | Pipeline → Campaign → Asset Group → Asset → Activity. The "All" classifier. Qualification loop. |
| 4 | [Website Audit Checklist](./04-website-audit-checklist.md) | Step-by-step audit procedure. Content categorisation, URL structure, SEO, tone strategy. |
| 5 | [Operator Model & Performance](./05-operator-model-and-performance.md) | End User departments, roles, teams, capacity, commissions. Performance metrics and forecasting formulas. |

---

## The Core Premise

The buyer on your site is composing a sentence in their head:

> *I need a **[product]** with a **[feature]** that does **[solution]** for my **[use case]**.*

Your website must give the buyer the correct words to fill those slots. Your CRM must store those same words as typed fields. If the website and the CRM use different vocabularies — or fuse multiple slots into one ambiguous phrase — the buyer's sentence stops assembling, the tab closes, and the data comes back as noise.

**The grammar is not a branding exercise.** It is the shape the buyer's sentence has to fit into on one side, and the shape the measurement apparatus has to stand on on the other side, and those two shapes have to be the same shape.

---

## Two Separations That Must Stay Strict

1. **Product-side vs. Audience-side** — Features and Solutions describe the offering. Use Cases and Personas describe who the offering is for. Never merge them.
2. **Schema vs. Record** — A Use Case is a *field name* (Industry, Department). A Value is a *cell entry* (Healthcare, Marketing). A Persona is a *typed bundle of values*, not a narrative blurb.

---

## Canonical Quick Reference

| Entity | Definition | Grammar Rule |
|--------|-----------|-------------|
| **Organisation** | Legal enterprise parent of all Brands | — |
| **Brand** | Root identity name between subdomain and TLD | Stable identity string |
| **Domain** | Brand + TLD | — |
| **Website** | Full surfaced address (subdomain + domain) | — |
| **Product** | Offering / platform / configuration root | Stable noun phrase |
| **Pipeline** | Process classifier for product/opportunity | Category noun (B2B, B2C) |
| **Feature** | Native object the product supports | Object noun, ≤2 words, ≤30 chars |
| **Solution** | Operator / process applied to a feature | Nominalised operator, ≤2 words, ≤30 chars |
| **Use Case** | Field name in the commercial schema | Field noun |
| **Value** | Allowed entry under a use-case field | Cell entry |
| **Persona** | Persona Type + selected values across fields | Structured record, not narrative |
| **Contact** | Person record (unique email) | — |
| **Account** | Organisation record (unique URL) | — |
| **Opportunity** | Purchasing process over time | — |
| **Campaign** | Higher-order composition from base grammar | Typed compound name |
| **Asset Group** | Audience/content segmentation layer | Seven-slot typed name |
| **Asset** | Deployable media/content object | Headline + version |
| **Activity** | Event or change record | Four archetypes |

---

## Key Relationships (At a Glance)

```
Brand ←M:M→ Product
Product →1:M→ Feature
Feature ←M:M→ Solution
Solution ←M:M→ Use Case
Use Case ←M:M→ Persona
Persona ←M:M→ Product  ← loop closes

Contact →M:1→ Account (current)
Contact ←M:M→ Account (history via Work_Histories)
Contact ←M:M→ Persona (via Contact_Personas)
Opportunity →M:1→ Pipeline
Opportunity ←M:M→ Contact (via Opportunity_Contacts)
Pipeline →1:M→ Stage →1:M→ Qualification Gate
```

The closed loop (Product → Feature → Solution → Use Case → Persona → Product) is what makes the site architecture self-navigating and the data model predictive.

---

## The Reframe

The schema itself is not the asset. The schema is a container. What accumulates inside the container is the asset.

Every Won Activity confirms an edge in the graph. Every Lost Activity falsifies one. Over time, the graph becomes an increasingly accurate model of commercial reality — which Personas actually buy which Products through which Features for which Solutions in which Use Cases.

That accumulating model is the competitive moat. Competitors can copy the schema in a day. They cannot copy the data that has been tested against reality over quarters and years. The framework's value compounds with every interaction recorded against it.
