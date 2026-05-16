# Part 4: Website Audit Checklist

> Step-by-step procedure for AI agents and human operators to audit any website against the Commercial Ontology Framework.

---

## Purpose

This checklist operationalises the framework from Parts 1–3 into an actionable audit procedure. Use it to evaluate whether a website's copy, URL structure, content categorisation, and CRM alignment conform to the commercial ontology.

---

## Phase 1: Extract the Ontology

Before evaluating the site, extract the raw commercial entities from whatever exists. Walk these questions in order.

### 1.1 Identify the Brand

- [ ] What is the root identity name between the subdomain and TLD?
- [ ] Is the brand string used consistently across all properties (social, email, print)?
- [ ] Are there multiple brands operating under one organisation? If so, list each.

### 1.2 Inventory Products

- [ ] List every offering/platform/system being sold, adopted, or licensed.
- [ ] For each Product: is the name a **stable noun phrase**?
- [ ] Flag any Product name that contains a verb, claim, or tagline (violation).
- [ ] For each Product: are default pricing, contract duration, and billing frequency defined?
- [ ] For each Product: which Pipeline classification applies? (B2B / B2C / Reseller / Partnership / Investment)

### 1.3 Inventory Features

- [ ] For each Product, list the native objects it supports.
- [ ] For each Feature: is the name an **object noun** (≤2 words, ≤30 characters)?
- [ ] Flag any Feature name that is actually a Feature + Solution composition (e.g., "Lead Scoring" should be Lead + Scoring).
- [ ] Are Features shared across Products where appropriate (M:M)?
- [ ] Do any Features carry auxiliary pricing? Document the pricing paradox exposure.

### 1.4 Inventory Solutions

- [ ] For each Feature, list the operators/processes applied to it.
- [ ] For each Solution: is the name a **nominalised operator** (≤2 words, ≤30 characters)?
- [ ] Flag any Solution expressed as a conjugated verb ("Automates" instead of "Automation").
- [ ] Verify reusability: does each Solution apply to more than one Feature? If not, it may be a Feature descriptor, not a true Solution.
- [ ] Confirm: Solutions carry zero intrinsic cost (all value traces to Features).

### 1.5 Inventory Use Cases and Values

- [ ] List all targeting/segmentation fields used (Sector, Industry, Department, Seniority, Company Size, Location, etc.).
- [ ] For each Use Case field: is the name a **field noun**?
- [ ] Flag any Use Case that is actually a Value or a description ("Healthcare companies" is a Value bundle, not a field).
- [ ] For each Use Case: list the bounded set of allowed Values.
- [ ] Are Values mutually exclusive within their field?
- [ ] Is an honest "Other" / "All" included rather than exhaustive edge-case enumeration?

### 1.6 Inventory Personas

- [ ] For each Product, are three Personas defined (Decision Maker, End User, Influencer)?
- [ ] Is each Persona expressed as **Persona Type + set of selected Values across Use Case fields**?
- [ ] Flag any Persona defined as a narrative blurb or character sketch.
- [ ] Is the Logic of Dominance applied? (Decision Maker supersedes all other classifications.)
- [ ] Are Personas product-relative? (Each Product's DM is distinct from another Product's DM.)

---

## Phase 2: Audit the Website Architecture

### 2.1 The Four Pillars of Content

Every website page must serve one of four cognitive functions. Audit every page against these categories:

| Pillar | Cognitive Function | Content Type | URL Pattern |
|:---|:---|:---|:---|
| **Products** | "What can I buy?" | Transactional, definitive | `/products/[name]` or equivalent |
| **Features** | "What does it include?" | Informative, structural, granular | `/features/[name]` or `/subjects/[name]` |
| **Solutions** | "What does it do for me?" | Empathetic, action-oriented | `/solutions/[name]` or `/services/[name]` |
| **Use Cases** | "How was it used by someone like me?" | Social proof, success stories | `/use-cases/[value]` or `/reviews/[audience]` |

**Audit questions:**

- [ ] Can every page on the site be classified into exactly one of the four pillars?
- [ ] Are there pages that conflate two or more pillars? (e.g., a Product page that also tries to be a Use Case page)
- [ ] Are there pillar gaps? (e.g., Features exist in the database but have no corresponding Feature pages)
- [ ] Does each pillar page cross-link to related pages in other pillars?

### 2.2 URL Structure

- [ ] Does the URL hierarchy reflect the ontology? (broad → specific, matching Product/Feature/Solution/Use Case nesting)
- [ ] Are URLs stable noun-based paths (not verb-based or campaign-specific)?
- [ ] Does the nesting support hierarchical SEO progression? (e.g., `/subjects/biology/a-level/`)
- [ ] Are there orphan pages that don't sit within the hierarchy?

### 2.3 The Relational Graph on the Frontend

- [ ] Does each Feature page list every Product the Feature appears in?
- [ ] Does each Solution page list every Feature the Solution applies to?
- [ ] Does each Use Case page cross-reference the Solutions and Personas attached to it?
- [ ] Does each Product page surface its Features, Solutions, and relevant Use Cases?
- [ ] Can a buyer who lands on the wrong front door find the right one in ≤2 clicks?

### 2.4 Self-Qualification Architecture

- [ ] Does the site allow buyers to self-qualify through navigation rather than requiring them to read long copy?
- [ ] Are pages short and focused (one subject per page)?
- [ ] Is there more pages with less content, rather than fewer pages with everything crammed in?

---

## Phase 3: Audit Copy Grammar

### 3.1 Headline & H1 Compliance

- [ ] Does each page H1 use the correct grammar for its pillar?
  - Product pages: noun phrase
  - Feature pages: object noun
  - Solution pages: nominalised operator or action phrase
  - Use Case pages: value label + context
- [ ] Are H1s unique across all pages?

### 3.2 Composition vs. Atom

- [ ] Scan all headlines and navigation labels for compound phrases.
- [ ] Decompose each compound into Feature + Solution components.
- [ ] Verify the ontology preserves both parts separately in the data layer.

### 3.3 Tone Strategy by Persona Type

When the same Product URL is accessed by different Personas, surrounding marketing assets must shift tone:

| Persona Type | Tone | Focus | Example CTA |
|:---|:---|:---|:---|
| **Decision Maker** | Reliable, reassuring, results-oriented | Track record, financial value, guaranteed outcomes | "Schedule a Free Consultation" |
| **Influencer** | Professional, objective, data-driven | Certifications, expertise, statistical proof | "Explore Our Programs" |
| **End User** | Relatable, engaging, empathetic, informal | Self-improvement, usability, capability | "Discover Your Potential" |

- [ ] Are assets differentiated by Persona Type?
- [ ] Does the "All" classifier correctly leave room for multi-persona pages (homepages, top-level product pages)?
- [ ] Are homepages using `personaType = All` and routing to persona-specific pages?

---

## Phase 4: Audit CRM Alignment

### 4.1 Schema–Copy Parity

- [ ] Does the CRM schema use the same vocabulary as the website copy?
- [ ] Can every Product, Feature, Solution, Use Case, and Value on the website be found as a typed field or record in the CRM?
- [ ] Are there CRM fields that have no corresponding website content? (potential content gaps)
- [ ] Are there website pages that have no corresponding CRM fields? (potential data gaps)

### 4.2 Typed Coordinates

- [ ] Is every page interaction typed as the correct entity interaction? (Feature page click = Feature interaction, not generic "page view")
- [ ] Does behaviour on the site populate the prospect's record before any form is filled?
- [ ] Are forms as short as possible (3 fields instead of 12) because behaviour has already provided context?
- [ ] Is the disconnect between form responses and browsing behaviour visible and actionable?

### 4.3 Campaign Coverage

- [ ] Has the combinatorial matrix been generated? (every Product × Persona Type × Opportunity Type × Use Case = Campaign)
- [ ] Are there slices of commercial reality that lack a Campaign to land in?
- [ ] Is every Asset traceable to its full typed lineage (Asset → Asset Group → Campaign → Pipeline)?

### 4.4 Qualification Gates

- [ ] Are qualification gates defined as boolean conditions, not subjective probability estimates?
- [ ] Is stage progression automated based on Activity outcomes?
- [ ] Are the two failure modes visible in reporting? (model-wrong vs. read-wrong)

---

## Phase 5: Measure the Compound Effects

Once aligned, verify the expected outcomes:

### Site Effects
- [ ] Self-qualification is structural (navigation-based, not copy-dependent)
- [ ] Pages are shorter and more numerous (one subject per page)
- [ ] Cross-linking is automatic from the relational graph
- [ ] SEO: internal linking density and meaningful page hierarchy present
- [ ] Bounce rate on landing pages decreasing; pages-per-visit increasing

### Pipeline Effects
- [ ] Forms are shorter (≤5 fields)
- [ ] Sales reps have pre-populated context from browsing behaviour
- [ ] Qualification is hypothesis-testing, not guesswork
- [ ] Cycle times are decreasing
- [ ] Pipeline hygiene is automated (stage transitions via Activity outcomes)

### Marketing Effects
- [ ] Experiments isolate one variable
- [ ] Attribution is a query, not a debate
- [ ] Dashboards build from the model, not around it
- [ ] Feature/Solution/Use Case/Persona inventories are bounded and growing controlled

### Compounding Asset
- [ ] Every new page adds to the same dataset (no fragmentation)
- [ ] Every Won/Lost Activity refines the graph
- [ ] The model becomes more accurate over time
- [ ] The accumulating data is the competitive moat — not the schema itself

### Team & Cultural Effects
- [ ] Vocabulary is aligned: marketing, sales, and ops use the same entity names
- [ ] New team members can be onboarded by walking the ontology (knowledge is structural, not personal)
- [ ] Handoff friction between teams has decreased (everyone references the same typed coordinates)
- [ ] Strategic debates use typed entities instead of vague language (“which Solutions drive DM conversion in SaaS?” vs. “how do we grow?”)

---

## Phase 6: Acknowledge Honest Costs

The framework delivers compounding returns, but the transition has real costs. Document these during the audit so stakeholders have accurate expectations.

### Retagging
- Every existing page, asset, CRM field, and URL must be classified against the ontology. For a site with 200+ pages this is 2–4 weeks of focused work.
- Legacy content that cannot be cleanly classified must be rewritten or retired.

### Rewriting
- Pages that conflate two or more pillars must be split. The total page count will likely increase while average page length decreases.
- Compound-phrase headlines must be decomposed. This affects navigation, SEO metadata, and internal linking.

### Learning Curve
- Operators accustomed to narrative-based personas and subjective pipeline stages will need retraining on the typed model.
- The first quarter after adoption will feel slower — the team is learning a new language while maintaining output.

### The Transition Quarter
- Expect a temporary dip in creative velocity as the team shifts from ad-hoc to typed composition.
- Historical reporting will not be directly comparable across the pre/post boundary.
- Plan for a parallel-run period where old and new systems overlap.

---

## Ontological Relativity (Edge Case)

The definition of "Product" vs. "Feature" is relative to position in the supply chain. A microchip is a *Product* to its manufacturer. The moment another enterprise integrates it into a larger system, that same entity becomes a *Feature*.

**Resolution**: Define entities strictly relative to their localised database graph. Focus on the immediate transactional relationship facing the end consumer. Do not attempt to map the entire supply chain.

---

## Anti-Patterns to Flag

| Anti-Pattern | What's Wrong | Fix |
|:---|:---|:---|
| Product named as a verb/claim | "Helps Teams Grow" | Rename to noun phrase: "Revenue Platform" |
| Feature named as composition | "Lead Scoring" | Decompose: Feature=Leads, Solution=Scoring |
| Solution as conjugated verb | "Automates" | Nominalise: "Automation" |
| Use Case is a description | "Healthcare companies" | Separate: Use Case=Industry, Value=Healthcare |
| Persona is a narrative | "Sarah cares about efficiency" | Structure: DM + {field: value, field: value} |
| Same content on multiple pillars | Product page also serves as Use Case page | Split into separate typed pages |
| Free-text CRM fields for critical attributes | Industry typed as free text | Replace with lookup table |
| Manual stage advancement | Rep drags card across board | Automate via Qualification Gates |
| Untyped page interactions | Generic "page view" analytics | Type as Feature/Solution/UseCase interaction |
| Unbounded value lists | New Use Case values added ad-hoc | Enforce bounded sets with admission rules |
