# Part 1: Ontology & Grammar

> Canonical definitions of all entities and the grammar rules that keep the model coherent.

---

## 1. Organisation, Brand, Domain, and Website

### Organisation

An **Organisation** is the legal enterprise entity that owns one or more Brands. It represents the corporate parent — the entity with tax codes, legal jurisdiction, and ultimate ownership.

| Spec | Definition |
|:---|:---|
| Table | `Organisations` |
| Primary Key | `organisation_id` (surrogate) |
| Key Relationship | 1:M parent to `Brands` |

Organisations are non-transactional. They exist to separate legal identity from market identity. One Organisation can operate many Brands.

### Brand

A **Brand** is the core root name between the subdomain and the TLD.

| Example URL | Brand |
|------------|-------|
| `www.acme.com` | `acme` |
| `docs.hiretimothysolomon.com` | `hiretimothysolomon` |
| `app.ftlmarketing.com` | `ftlmarketing` |

A Brand is **not** the subdomain (`www`, `docs`, `app`) and **not** the TLD (`.com`, `.app`, `.ai`). It is the core identity string in the middle.

Within the systemic hierarchy, the Brand functions as the supreme organizing principle and the ultimate domain owner. The Brand is formally defined not as a transactional vehicle, a financial entity, or even a manufacturer, but purely as a **unique symbolic identifier**. It is strictly forbidden from housing transactional rules, default pricing models, or billing frequencies.

### Domain

A **Domain** is Brand + TLD. Examples: `acme.com`, `hiretimothysolomon.com`.

### Website / Hostname

A **Website** or **Hostname** is the full surfaced web address: Subdomain + Domain. Examples: `www.acme.com`, `docs.hiretimothysolomon.com`.

### Brand ↔ Product Relationship

**Many-to-many.** One brand can present many products. One product can appear under many brands. Products are not necessarily unique to a brand.

---

## 2. Product

### Definition

A **Product** is the offering, platform, or system being sold, adopted, licensed, or deployed. It is the thing the buyer hands to finance when the deal closes.

A Product is also a **configuration root**: creating a Product sets defaults for downstream commercial properties (pricing, contract duration, billing frequency, pipeline behaviour).

A Product is not a website. A Product is not a targeting field.

### Grammar Rule

**Stable noun or noun phrase.** Never a verb, never a claim, never a tagline.

| ✅ Use | ❌ Not |
|--------|--------|
| Revenue Platform | Helps Teams Grow |
| CRM | Automates Your Pipeline |
| Customer Data Platform | Routes Leads Faster |

A Product name must survive a purchase order. Nobody invoices a slogan.

### Product Pricing & Configuration

Products store default pricing, contract, and billing information:

- **Product Value**: Default price at which opportunities are created (editable after creation).
- **Contract Duration**: Default validity period, measured in time (Annual/Monthly/Weekly/Daily) or quantity (Per Unit).
- **Billing Frequency**: How often during a contract the customer is invoiced (Annual/Monthly/Weekly/Daily/Per Unit).

---

## 3. Pipeline

### Definition

A **Pipeline** is the commercial process classifier attached to products and opportunities.

Products that share a Pipeline share grouping, process, and reporting rules. Pipeline also determines whether the commercial process anchors to Account+Contact (B2B) or Contact only (B2C).

### Pipeline Classifications

| Classification | Architectural Implication |
|:---|:---|
| **B2B** | Mandates Account object. Contacts subordinate to Account. Complex multi-stakeholder routing. |
| **B2C** | Contact-only. No Account requirement. Shorter sales cycles. |
| **Reseller** | Account may be required. Pricing can have cost to end user. |
| **Partnership** | Account required. Qualification goals tied to attributed opportunities. |
| **Investment** | Selling the organisation itself for financial return. |

### Grammar Rule

**Stable process/category noun.** Do not use descriptive sentences.

---

## 4. Feature

### Definition

A **Feature** is a native object or domain object that the product supports. It is the thing in the system, not what is being done to it.

Features are the tangible structural, technical, physical, or digital components of a Product — what a product physically or digitally *is*.

### Grammar Rule

**Object noun.** Maximum 2 words. Maximum 30 characters. Singular or plural is a convention choice — pick one and hold it everywhere.

| ✅ Use | ❌ Not |
|--------|--------|
| Leads | Lead Scoring |
| Contacts | Contact Enrichment |
| Accounts | Account Intelligence |
| Opportunities | Opportunity Routing |
| Calls | Call Observation |

The right column contains **compositions** (Feature + Solution fused together), not atomic features. If the model cannot separate the atom from the composition, you lose the ability to talk about Leads and Scoring independently.

### Feature Pricing (The Pricing Paradox)

Unique among subordinate entities, Features can carry **auxiliary pricing structures** — pricing that is part of or in addition to a Product's default price. Features can be included by default with a product or added ad-hoc during a sale. This creates the "Pricing Paradox": the Product defines the baseline, but Feature-level pricing can dynamically modify the total at point of sale, potentially compromising baseline stability.

### Stored Properties

| Field | Description |
|:---|:---|
| **Feature Name** | Object noun, ≤2 words, ≤30 chars |
| **Feature Description** | Default META description for related Assets. Reused as `<meta name="description">` on Feature pages and as fallback copy for Asset Groups. |
| **Feature URL** | Canonical URL path for the Feature's page (e.g., `/features/leads`). Must align with the site's URL hierarchy. |

---

## 5. Solution

### Definition

A **Solution** is an operator, process, or transformation applied to a Feature. It answers: *What is done to the object?*

Solutions describe the functional reality of what a Feature *does*. They act as the critical semantic bridge connecting technical specifications (Features) to human-centric market needs.

**Key architectural rule**: Solutions possess absolutely zero intrinsic cost. All monetary value must trace back to the enabling Features. A customer does not purchase a "Solution" — they purchase a Product composed of Features that output Solutions.

### Grammar Rule

**Nominalised operator.** Noun form, never a conjugated verb. Maximum 2 words, maximum 30 characters.

| ✅ Use | ❌ Not |
|--------|--------|
| Scoring | Scores |
| Routing | Routes |
| Enrichment | Enriches |
| Automation | Automates |
| Attribution | Attributes |
| Observation | Observes |

The noun form is structural engineering, not aesthetics. Scoring must apply to Leads, Accounts, and Opportunities without being renamed each time.

### Many-to-Many with Features

One Feature can enable many Solutions. One Solution may require multiple Features. This flexibility lets marketing reposition a static product for different markets by highlighting different Solutions — the underlying product remains unchanged.

### Stored Properties

| Field | Description |
|:---|:---|
| **Solution Name** | Nominalised operator, ≤2 words, ≤30 chars |
| **Solution Description** | Default META description for related Assets. Reused as `<meta name="description">` on Solution pages. |
| **Solution URL** | Canonical URL path for the Solution's page (e.g., `/solutions/automation`). |

---

## 6. Use Case

### Definition

A **Use Case** is a **field name** in the commercial schema. It is not a story. It is not a description of how someone uses the product. It is the column header.

### Semantics

A Use Case is a named targeting or segmentation field — the kind of field found in a CRM, CSV, JSON record, ad platform, or audience builder. These are typically technographic, firmographic, demographic, or behavioral dimensions.

| Format | Use Case | Value |
|--------|----------|-------|
| CSV column header | `industry` | Healthcare |
| JSON key | `company_size` | 200–1000 |
| CRM field | `crm` | HubSpot |
| Targeting dimension | `geography` | UK |

### Grammar Rule

**Field noun or field noun phrase.**

| ✅ Use | ❌ Not |
|--------|--------|
| Industry | Healthcare companies |
| Geography | UK finance teams |
| Company Size | Mid-market RevOps leaders |
| CRM | Best buyers for automation |
| Seniority | — |

The right column contains descriptions or value bundles, not schema fields.

### Related Data Fields

Primary Use Case fields: Contact Department, Account Sector, Account Size, Account Location (Region).

### Stored Properties

| Field | Description |
|:---|:---|
| **Use Case Name** | Field noun |
| **Use Case Summary** | Description of what the field represents and how it's used for segmentation. |
| **Use Case URL** | Canonical URL path for the Use Case's page (e.g., `/use-cases/industry`). |

---

## 7. Value

### Definition

A **Value** is an allowed or selected entry under a Use Case field.

If the Use Case is the column header, the Value is what goes in the cell.

- `Industry` → Healthcare, SaaS, Manufacturing
- `Company Size` → 1–50, 51–200, 200–1000
- `CRM` → Salesforce, HubSpot, Dynamics
- `Geography` → UK, US, EMEA

A Value is not a field. It is not a persona. It is not a product object. It is an admissible entry under a field.

---

## 8. Persona

### Definition

A **Persona** is a typed bundle of selected Values across Use Case fields. It is a structured record, not a fictional profile or narrative blurb.

### Persona Type (Mandatory)

Every Persona has exactly one of three types:

| Type | Definition |
|------|-----------|
| **Decision Maker (DM)** | Who completes the purchase. Controls financial resources. |
| **End User (EU)** | Who uses the product daily. |
| **Influencer (IN)** | Who benefits from but does not directly use the product. Advocates, consultants, gatekeepers. |

### The Logic of Dominance

**Decision Maker status absolutely supersedes all other classifications.** If a single contact qualifies for multiple types (e.g., a startup founder who is both End User and Decision Maker), the system categorises them as Decision Maker. This forces the architecture to continuously prioritise high-value transactional prospects.

### Persona Construction

**Persona = Persona Type + selected Values across Use Case fields**

| ✅ Use | ❌ Not |
|--------|--------|
| Decision Maker + {Industry: SaaS, Geography: UK, Company Size: 201–1000, CRM: Salesforce, Department: RevOps, Seniority: Director} | "Sarah is a busy RevOps leader who cares about efficiency." |

The right column is a character sketch. The left is a query. The character sketch cannot be matched against a contact record, scored, segmented, or reported against. The query can.

### Product-Relative

Each Product defines its own Decision Maker, End User, and Influencer Persona. Persona matching is scored to determine the closest primary fit.

---

## 9. Contact and Account

### Contact

A **Contact** is a person record, keyed by a **unique email address**. Contains demographic attributes (age, gender, location) and firmographic attributes (department, job title, seniority).

### Account

An **Account** is an organisation record, keyed by a **unique URL**. Contains firmographic attributes (sector, industry, company size, employees, growth rate, estimated ARR, locations) and technographic attributes (confirmed technologies, technology profile).

### Key Distinction

Contacts and Accounts are **not** Personas. Personas classify audiences. Contacts and Accounts are the records that get matched against Personas.

---

## 10. Opportunity

An **Opportunity** is the purchasing process over time. It relates Contacts/Accounts to one purchasing process, separated into stages. Each stage tracks Qualifiers — special Activities defined when creating a Product.

### Opportunity Types

| Type | Description |
|------|------------|
| **MQL** (Marketing Qualified Lead) | Contact/Account identified as matching a Product Persona. Goals: registration, opt-in, GDPR consent. |
| **SQL** (Sales Qualified Lead) | Met minimum marketing requirements. Goals: direct contact, decision maker assignment, product interest confirmation. |
| **FTP** (First Time Purchase) | Entered sales cycle, committed to working together. Goals: complete transactions. |
| **RTP** (Retention Purchase) | Existing customer requiring renewal or additional purchase. Goals: onboarding, product experience, retention. |

### Opportunity Status

- **Open**: Qualification goals are null.
- **Won**: Threshold of qualification goals are TRUE. Generates next Opportunity Type.
- **Lost**: Threshold of qualification goals are FALSE.

---

## 11. Campaign, Asset Group, Asset, Activity

These are **higher-order compositions** built from the base grammar. Full treatment in [Part 3: Type Hierarchy](./03-type-hierarchy-and-execution.md).

- **Campaign** = controlled commercial grouping from Pipeline + Persona Type + Opportunity Type + Use Case.
- **Asset Group** = audience/content segmentation layer with subject focus.
- **Asset** = deployable media/content object (ad, page, email, document).
- **Activity** = event or change record (data, asset, engagement, admin).

---

## Core Grammar Rules (Summary)

| # | Rule | Example |
|---|------|---------|
| 1 | Brand names are root web identity names | `acme`, not `www.acme.com` |
| 2 | Product names are noun phrases | Revenue Platform, not "Helps teams grow" |
| 3 | Pipeline names are stable process nouns | B2B, B2C, not descriptive sentences |
| 4 | Feature names are object nouns | Leads, not "Lead Scoring" |
| 5 | Solution names are nominalised operators | Automation, not "Automates" |
| 6 | Use Case names are field names | Industry, not "Healthcare companies" |
| 7 | Values are entries under fields | Healthcare, not Industry |
| 8 | Personas are typed sets of values | DM + {SaaS, UK, Salesforce}, not narrative blurbs |
| 9 | Never confuse a composition with an atom | Lead = Feature, Scoring = Solution, Lead Scoring = composition |
| 10 | Keep schema separate from records | Use Case = field, Value = entry, Feature/Solution = product model |
| 11 | Consistency beats improvisation | Pick one form and hold it everywhere |

---

## Why Compound Phrases Cause Confusion

| Display Phrase | Feature (Object) | Solution (Operator) |
|:---|:---|:---|
| Lead Scoring | Leads | Scoring |
| Opportunity Routing | Opportunities | Routing |
| Contact Enrichment | Contacts | Enrichment |
| Call Observation | Calls | Observation |

These are **composed phrases**, not base terms. Useful for display, but the ontology must preserve the parts separately.

---

## Fast Classification Test

When any new term appears, ask what kind of thing it is:

| Question | Classification |
|----------|---------------|
| Is it the root identity name between subdomain and TLD? | **Brand** |
| Is it Brand + TLD? | **Domain** |
| Is it the full surfaced web address? | **Website / Hostname** |
| Is it the offering or platform? | **Product** |
| Is it the process classifier attached to product/opportunity? | **Pipeline** |
| Is it a native object in the product? | **Feature** |
| Is it an operator applied to that object? | **Solution** |
| Is it the name of a field in a CSV, CRM, or JSON schema? | **Use Case** |
| Is it an allowed or selected entry inside that field? | **Value** |
| Is it a typed grouping of selected values across many fields? | **Persona** |
| Is it a real person/company record being matched against personas? | **Contact** or **Account** |
| Is it the tracked purchasing process? | **Opportunity** |

This test catches most category errors quickly.
