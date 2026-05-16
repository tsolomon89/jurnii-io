# Part 2: Relational Model

> Entity cardinality, join tables, the closed relational loop, qualification gates, and normalization guidance.

---

## Three Relational Domains

The data model is partitioned into three distinct domains that intersect to execute business logic:

### 1. Identity & Master Data Domain
Core CRM entities representing real-world actors:
- **Accounts** — legal corporate entities
- **Contacts** — individual human beings

These store relatively stable demographic and firmographic dimensions.

### 2. Taxonomy & Classification Domain
Structural blueprints and reference tables that dictate routing logic, grouping, and classification:
- **Brands** — symbolic market identifiers
- **Pipelines** — process classifiers
- **Personas** — audience classification matrices
- **Products** — transactional rule bases
- **Features / Solutions** — offering components

Entities here generally do not hold transactional data; they serve as dimensional lookups or control variables.

### 3. Workflow & State Domain
Centred on the **Opportunity** entity — the intersection table where identity records, taxonomy classifications, and temporal state progression converge.

---

## The Closed Relational Loop

The content layer joins into a closed loop. Every edge is many-to-many:

```
Product ──has──→ Feature
Feature ──carries──→ Solution
Solution ──serves──→ Use Case
Use Case ──associated with──→ Persona
Persona ──associated with──→ Product
                                ↑ loop closes
```

Any node is a valid entry point. This is what makes the site self-navigating:
- Feature page lists every Product the Feature appears in
- Solution page lists every Feature the Solution applies to
- Use Case page cross-references Solutions and Personas
- Persona page surfaces Products configured for that Type

The loop is also a **predictive model**: every edge is an assertion about commercial reality. Contact behaviour that tracks the graph confirms claims. Behaviour that diverges reveals model errors.

---

## Entity-by-Entity Relational Specifications

### Organisation

| Spec | Definition |
|:---|:---|
| Table | `Organisations` |
| Classification | Core Reference / Legal |
| Primary Key | `organisation_id` (surrogate) |
| Key Relationship | 1:M parent to `Brands` |

Legal enterprise entity. Stores tax jurisdiction, legal name, ownership structure. Non-transactional. Exists solely to separate legal identity from market identity.

### Brand

| Spec | Definition |
|:---|:---|
| Table | `Brands` |
| Classification | Core Reference / Taxonomy |
| Primary Key | `brand_id` (surrogate) |
| Key Relationship | 1:M parent to `Products` |

Non-transactional reference entity. Contains a `organization_id` FK linking to the ultimate legal enterprise table, ensuring separation of legal entity from market identity.

### Account

| Spec | Definition |
|:---|:---|
| Table | `Accounts` |
| Classification | Core Master Data |
| Primary Key | `account_id` (surrogate) |
| Unique Constraint | Organisation URL |

Stores firmographic dimensions (industry, sector, company size, ARR, locations) and technographic data (confirmed technologies, technology profile).

**Relationships:**
- 1:M with Contacts (current employment via `primary_account_id`)
- M:M with Contacts (historical employment via `Work_Histories`)
- M:M with Personas (via `Account_Personas`)
- Mandatory FK target for Opportunities under B2B pipelines

### Contact

| Spec | Definition |
|:---|:---|
| Table | `Contacts` |
| Classification | Core Master Data |
| Primary Key | `contact_id` (surrogate) |
| Unique Constraint | Email address |

Stores demographics (age, gender, location, interests) and firmographics (department, job title, seniority).

**Relationships:**
- M:1 to Accounts (via `primary_account_id` for current employment)
- M:M with Accounts (via `Work_Histories` for career trajectory)
- M:M with Opportunities (via `Opportunity_Contacts`)
- M:M with Personas (via `Contact_Personas` with `match_score`)

### Persona

| Spec | Definition |
|:---|:---|
| Table | `Personas` |
| Classification | Taxonomy / Classification |
| Primary Key | `persona_id` (surrogate) |
| FK | `persona_type_id` → enum {Decision Maker, Influencer, End User} |

Abstract target, not a concrete instance. Primary mechanisms are M:M junction tables connecting to Contacts and Accounts. The **Logic of Dominance** dictates that Decision Maker classification supersedes all others for operational routing.

### Product

| Spec | Definition |
|:---|:---|
| Table | `Products` |
| Classification | Core Catalog |
| Primary Key | `product_id` (surrogate) |
| Parent FK | `brand_id` → Brands (M:1) |
| Process FK | `pipeline_id` → Pipelines (M:1) |

Transactional rule base. Carries pricing, contract duration, billing frequency defaults. Engages Opportunities via M:M junction (`Opportunity_Products`).

### Pipeline

| Spec | Definition |
|:---|:---|
| Table | `Pipelines` |
| Classification | Taxonomy / Process Definition |
| Primary Key | `pipeline_id` (surrogate) |
| FK | `pipeline_type_id` → enum {B2B, B2C, Reseller, Partnership, Investment} |

**Relationships:**
- 1:M parent to Opportunities (controls procedural rules)
- 1:M parent to Stages (each Pipeline governs its own lifecycle phases)

Pipeline type dictates which FKs are mandatory on Opportunity creation. B2B enforces non-null `account_id`. B2C bypasses it.

### Stage

| Spec | Definition |
|:---|:---|
| Table | `Stages` (or `Pipeline_Stages`) |
| Classification | Lookup / Reference |
| Primary Key | `stage_id` (surrogate) |
| FK | `pipeline_id` → Pipelines |

Canonical stages: MQL, SQL, FTP, RTP. Referenced via `current_stage_id` FK on Opportunities. Parent in 1:M relationship with Qualification Gates.

### Qualification Gate

| Spec | Definition |
|:---|:---|
| Table | `Qualification_Gates` |
| Classification | Rules Reference |
| Primary Key | `gate_id` (surrogate) |
| FK | `stage_id` → Stages |

Boolean conditions that act as relational barriers preventing Opportunity advancement. Defines: field to evaluate, conditional logic, target object (Contact/Account/Opportunity).

---

## Compact Relationship Matrix

| Entity A | Entity B | Cardinality | Join Table? | Rule |
|:---|:---|:---|:---|:---|
| Organisations | Brands | 1:M | No | Organisation is legal parent to Brand |
| Brands | Products | 1:M | No | Brand is non-transactional parent to Product |
| Pipelines | Opportunities | 1:M | No | Pipeline defines structural constraints for Opportunity |
| Pipelines | Stages | 1:M | No | Each Pipeline governs its own lifecycle stages |
| Stages | Qualification Gates | 1:M | No | Each Stage holds mandated boolean rules |
| Opportunities | Qualification Gates | M:M | Yes | Evaluated in `Opportunity_Qualifications` intersection |
| Opportunities | Accounts | M:1 | No | Account linkage mandated under B2B Pipelines |
| Opportunities | Contacts | M:M | Yes | `Opportunity_Contacts` with stakeholder role flags |
| Accounts | Contacts | 1:M (core) | No | `primary_account_id` for current employment |
| Accounts | Contacts | M:M (history) | Yes | `Work_Histories` captures past employment |
| Personas | Contacts | M:M | Yes | `Contact_Personas` with `match_score` |
| Personas | Accounts | M:M | Yes | `Account_Personas` for organisational scoring |
| Products | Features | 1:M | No | Product supports many Features |
| Features | Solutions | M:M | Yes | One Feature enables many Solutions and vice versa |

---

## Join Tables Detail

| Join Table | Entity A | Entity B | Payload Columns |
|:---|:---|:---|:---|
| `Work_Histories` | Contacts | Accounts | `job_title`, `start_date`, `end_date` |
| `Contact_Personas` | Contacts | Personas | `match_score`, `primary_match_flag` |
| `Account_Personas` | Accounts | Personas | `match_score` |
| `Opportunity_Contacts` | Opportunities | Contacts | `stakeholder_role_flag` (Billing, Evaluator, etc.) |
| `Opportunity_Qualifications` | Opportunities | Qual. Gates | `boolean_state` (TRUE/FALSE/NULL), `verification_timestamp` |
| `Opportunity_Products` | Opportunities | Products | Pricing overrides, feature add-ons |

---

## Qualification Gate Examples

| Gate | Stage | Condition |
|:---|:---|:---|
| MQL Entry | MQL | Contact email verified (non-null), GDPR opt-in = TRUE, Persona match_score > 60% |
| SQL Transition | SQL | Verified budget > minimum, at least one Contact with Decision Maker persona type linked |
| FTP Validation | FTP | Account billing fields populated, legal contract (MSA) boolean = TRUE |
| Pipeline Structural | Any | B2B Pipeline prohibits Opportunity creation without `account_id` |

Gates operate under the **"Stupify" principle**: a human operator cannot manually bypass relational logic or advance a stage without underlying data satisfying boolean criteria.

---

## Boundary Clarifications

| Term A | Term B | Distinction |
|:---|:---|:---|
| Brand | Account | Brand = internal symbolic identity. Account = external legal entity being sold to. Never share a table. |
| Account | Contact | Account = multi-person corporate structure (unique URL). Contact = individual human (unique email). Contact is relationally subservient. |
| Contact | Persona | Contact = physical instantiation. Persona = abstract blueprint. Contact is dynamically assigned to Persona via junction table. |
| Pipeline | Opportunity | Pipeline = master reference defining rules/stages/constraints. Opportunity = active instantiated transaction subjected to those rules. |
| Stage | Qualification | Stage = macro-state (MQL phase). Qualification = micro-gate condition ("Is budget verified?") that must be TRUE before Stage updates. |

---

## Normalization Guidance

### Third Normal Form (3NF) Principles

1. **Reference tables over duplication.** Master record traits are never physically duplicated onto transactional records. Opportunity queries origin tables via FK joins.

2. **Separate state from master data.** Contacts/Accounts = durable master data. Lifecycle progressions = dedicated workflow/state junction tables. Never overwrite stable master columns with transient workflow data.

3. **No free-text for critical attributes.** Firmographic dimensions (Industry, Sector, Company Size) and taxonomical categories (Persona Type) are modelled as finite domain lookups in separate reference tables. Master records store integer IDs pointing to these tables.

4. **Avoid over-materialising derived entities.** Personas should be modelled as standardised lookups linking to predefined criteria values, pushing complex derivations into application logic or non-materialised database views rather than persistent physical tables.

---

## Health Scoring Model

### Contact Health Score

```
Daily Score Deterioration = 1 / Contact Lifespan (Days)
Engagement Task Activities = Contact Lifespan / Campaign Engagement Task Frequency
Engagement Activities = Contact Lifespan / Campaign Engagement Frequency Goal
Total Activities = Engagement Task Activities + Engagement Activities
Activity Score = Total Activities / Contact Lifespan
Contact Health Score = Sum(Daily Score Deterioration) + Sum(Activity Score)
```

### Opportunity Health Score
Equals the average of Contact Health Scores of related Primary Contacts.

### Account Health Score
Equals the average of Contact Health Scores of related Primary Contacts.

---

## Open Architectural Issues

These are unresolved design decisions documented in the source material. Each represents a genuine trade-off with no universally correct answer.

### 1. Activities: Event Log vs. Coupled State Trigger

**Question**: Should Activities be modelled as a pure, append-only event log (where state changes are derived from event streams), or as tightly coupled state triggers (where each Activity directly mutates the parent Opportunity/Contact state)?

| Approach | Advantage | Risk |
|:---|:---|:---|
| Event log | Full audit trail, replay capability, temporal queries | Requires projection logic, eventual consistency |
| Coupled trigger | Simpler queries, immediate state consistency | Harder to audit, risk of orphaned state |

### 2. Use Cases: Materialised Tables vs. Computed Views

**Question**: Should Use Cases exist as physically materialised lookup tables, or as computed views/virtual entities derived from Contact/Account field metadata?

| Approach | Advantage | Risk |
|:---|:---|:---|
| Materialised | Clear FK targets, easy joins, explicit admin control | Schema rigidity, migration cost when fields change |
| Computed | Dynamic, always reflects current schema | No FK target, harder to enforce referential integrity |

### 3. EAV Meta-Model vs. Standard ORM

**Question**: Should the system use an Entity-Attribute-Value pattern (maximising flexibility for custom fields and multi-tenant configurations) or standard ORM with fixed column schemas?

| Approach | Advantage | Risk |
|:---|:---|:---|
| EAV | Infinite extensibility, multi-tenant friendly | Query complexity, poor indexing, type safety issues |
| Standard ORM | Fast queries, strong typing, simple migrations | Schema changes require migrations, less flexible |

Implementors should make explicit decisions on these trade-offs and document the choice as an ADR (Architecture Decision Record).
