# Jurnii Zoho CRM — Authoritative Commercial Model

**Status:** Owner-approved semantic authority  
**Purpose:** Define the commercial ontology that all Zoho CRM code, workflows, fields, tests,
documentation, integrations, and migration plans must implement.  
**Scope:** Leads, Contacts, Accounts, Deals, Products, Quotes, and Activities.  
**Precedence:** Where this document conflicts with existing repository documentation or code, this
document defines the intended model. Existing code and live configuration remain evidence of what is
currently implemented and must be migrated safely; they do not override this ontology.

---

## 1. The model in one statement

> **Lead is instantiated as Contact/Opportunity. Account is instantiated as Deal. Product is
> instantiated as Quote. Contact carries individual opportunity state, Deal joins and rolls up the
> Account relationship, and Quote carries the instantiated Product's commercial state. Activities
> act primarily on Contact opportunities and produce the evidence from which Deal and Quote state is
> reconciled.**

The three entity-to-instance relationships are:

| Existing or definitional record | Stateful relationship instantiation |
| --- | --- |
| Lead | Contact / Opportunity |
| Account | Deal |
| Product | Quote |

This is the controlling abstraction for field placement and automation ownership.

---

## 2. Canonical relationship graph

```text
Lead
  └── converts into Contact / Opportunity
          ├── belongs to Account
          ├── participates in the Account's one Deal
          ├── owns its own Stage, State, Status, sequence, and Activities
          └── may be attributed one or more Quotes

Account
  └── instantiated as one persistent Deal
          ├── joins multiple Contact opportunities
          ├── joins multiple Quote instances
          ├── identifies the currently leading Contact opportunity
          └── rolls up relationship state and commercial value

Product
  └── instantiated as Quote
          ├── belongs to the Deal
          ├── is attributed to a Contact opportunity
          └── owns relationship-specific stage, terms, dates, price, and outcome
```

Current Jurnii cardinality:

```text
one Lead       -> one converted Contact opportunity
one Account    -> zero or one persistent Deal
one Deal       -> many Contact opportunities
one Contact    -> many Activities
one Deal       -> many Quotes
one Product    -> many Quote instances
one Quote      -> one Product under the currently supported invariant
one Quote      -> one attributed Contact opportunity
```

An Account may exist without a Deal. The Deal is instantiated when the Account enters a commercial
relationship through a Contact opportunity. Once instantiated, the same Deal persists as Contacts,
Products, Quotes, renewals, expansions, and outcomes change.

Adding a Contact, Product, Quote, renewal, expansion, or upsell must not create another Deal for the
same Account.

---

## 3. Entity records and instantiated records

### 3.1 Entity or definition layer

Lead, Account, and Product answer what exists before or independently of a particular stateful
commercial relationship.

They may contain:

- identity;
- classification;
- intake or source evidence;
- reusable defaults;
- external identifiers;
- information required to create or initialise the stateful record.

They must not become the durable authority for relationship-specific progression.

### 3.2 Stateful relationship layer

Contact, Deal, and Quote answer how an entity currently exists within the Jurnii commercial
relationship.

They may contain:

- Stage;
- State;
- Status;
- relationship-specific dates;
- outcomes and loss reasons;
- automation state;
- historical progression evidence;
- commercial terms appropriate to that record.

The placement rule is:

| Question | Authoritative module |
| --- | --- |
| What person or intake record exists before conversion? | Lead |
| What individual opportunity are we progressing? | Contact |
| What company exists? | Account |
| What is Jurnii's commercial relationship with that company? | Deal |
| What reusable offering exists? | Product |
| What Product has been instantiated in this relationship and on what terms? | Quote |
| What action occurred, against which opportunity, through which surface, and by whom? | Activity |

---

## 4. Lead → Contact / Opportunity

### 4.1 Lead meaning

A Lead is the existing pre-relationship person or intake record. It is a transport and
normalisation surface, not durable commercial truth.

A Lead may carry:

- person and company identity;
- source and consent evidence;
- initial role or qualification evidence;
- Product interest;
- imported commercial terms needed to initialise Quotes;
- the initial conditions needed to create the Contact opportunity.

Lead values may determine the initial state of the converted records. After conversion, automation
must not continue treating the Lead as authoritative.

### 4.2 Conversion meaning

Lead conversion is an ontological transition, not merely a record copy:

```text
uninstantiated person/intake -> stateful Contact opportunity
```

The conversion path must:

1. resolve or create the canonical Account;
2. resolve or create that Account's single persistent Deal where a commercial relationship exists;
3. create or reuse the Contact as the durable opportunity record;
4. associate the Contact with the Account and Deal;
5. normalise intake evidence into the Contact's initial opportunity state;
6. create or reconcile Quote instances when sufficient Product or commercial evidence exists;
7. remove the converted Lead under the established conversion lifecycle;
8. leave no continuing automation dependency on the removed Lead.

Subsequent Leads for people at the same company become additional Contact opportunities under the
same Account and Deal. They do not create Product Deals or parallel Account Deals.

---

## 5. Contact = Opportunity

### 5.1 Semantic authority

The Contact is the opportunity record in this Zoho implementation.

Zoho normally uses the Deals module where another CRM might use an Opportunity module. That platform
convention does not control Jurnii's ontology. Jurnii uses Contact as the individual opportunity and
Deal as the Account-relationship roll-up.

Every Contact opportunity progresses independently. A Deal can therefore contain several parallel
opportunities represented by several Contacts.

The Contact is authoritative for:

- granular opportunity Stage;
- opportunity State and Status;
- decision-making or persona role;
- Contact-level loss and completion context;
- Contact-level sequence state;
- the Activities required to progress that opportunity;
- Product-interest evidence before Product instantiation as a Quote.

### 5.2 Stage and opportunity classification

The granular Contact Stage is the authority for what should happen next to that Contact.

The current stage-to-opportunity classification is:

| Contact Stage | Opportunity classification |
| --- | --- |
| Marketing Consent | MQL |
| Demo Booking | SQL |
| Demo Confirmation | SQL |
| Demo Hosted | SQL |
| Proposal Preparation | FTP |
| Commercial Agreement | FTP |
| Onboarding | RTP |
| Renewal | RTP |

`MQL`, `SQL`, `FTP`, and `RTP` describe the Contact opportunity's higher-order commercial position.
They do not turn the Deal into the opportunity record.

Where the Deal stores one of these values, it stores a derived roll-up of Contact opportunities.
Where an Activity stores one, it stores an immutable snapshot of its Contact opportunity when the
Activity was raised.

### 5.3 Independent progression

Advancing, stopping, losing, or completing one Contact must not automatically perform the same action
on another Contact.

A Contact Activity may:

- update that Contact opportunity;
- cause the Deal to recalculate its roll-up;
- create or update a Quote when the Activity contains sufficient Product and commercial evidence.

It must not mutate another Contact opportunity merely because both Contacts belong to the same Deal.

### 5.4 Sequence authority

Outreach sequencing is Contact-scoped.

- Each eligible Contact has at most one canonical Activation Task.
- `Task_Sequence_Type` selects Email, Call, or Manual.
- The Activation Task's state commits or rejects activation.
- Manual stops automated sequence dispatch for that Contact only.
- Manual must not block meetings, Deal reconciliation, Quote progression, or unrelated activity.
- A finished, stopped, or lost Contact must not be restarted through an unrelated Task edit.
- Several Products or Quotes under the Deal do not make the Contact sequence ambiguous.

---

## 6. Account → Deal

### 6.1 Account meaning

The Account is the company identity. It answers:

> What company exists?

The Account may hold stable company attributes, identifiers, classification, and approved owner-kept
reference fields. It is not the authority for changing commercial relationship state.

Any Account field that mirrors relationship State, Status, value, or progression must be treated as a
derived reporting or Zoho-compatibility mirror, not as an independent command surface.

### 6.2 Deal meaning

The Deal is the stateful instantiation of the Account in Jurnii's commercial relationship. It answers:

> What is the current aggregate state of Jurnii's relationship with this Account?

The Account and Deal refer to the same company subject but occupy different semantic layers:

- Account is the existing company;
- Deal is that company instantiated in a commercial relationship.

In the current Jurnii model, one Account has one persistent Deal. The Deal is not Product-specific and
is not Contact-specific.

### 6.3 Deal authority

The Deal owns or derives:

- the Account relationship link;
- an Account-scoped deterministic identity;
- relationship Pipeline;
- the currently leading Contact opportunity;
- rolled-up opportunity classification;
- rolled-up relationship State and Status;
- the collection of Contact opportunities;
- the collection of Quote instances;
- aggregate Quote accounting such as Deal Amount;
- required relationship-level automation controls.

The Deal does not own an independent opportunity lifecycle. Its opportunity-related values are
projections of the Contact opportunities it contains.

### 6.4 Leading Contact

The Deal may point to one currently leading or controlling Contact, using the existing canonical
lookup where possible. This pointer is a derived selection, not a separate opportunity and not proof
that the Deal has only one Contact.

The selection function must:

1. exclude Contact opportunities that are no longer viable where the lifecycle rules require it;
2. consider decision-making authority;
3. consider Contact Stage or opportunity progression;
4. use relevant recency as a deterministic tie-break;
5. preserve explicit historical attribution on closed commercial records;
6. never require a duplicate `Deal_Primary_Contact` concept when the canonical lookup already carries
   this meaning.

### 6.5 Deal roll-up

The Deal recalculates from its Contact opportunities and Quotes.

At minimum:

- opportunity classification derives from viable Contact progression;
- relationship State does not become Lost merely because one Contact is Lost;
- relationship closure requires all relevant Contact opportunities to be non-viable or an explicit
  Deal-level relationship decision;
- Deal Amount derives from authoritative Quote values under the approved Quote lifecycle rules;
- Product catalogue prices never directly become Deal Amount;
- a Product, Contact, renewal, or expansion never creates another Deal for the Account.

---

## 7. Product → Quote

### 7.1 Product meaning

The Product is a reusable catalogue or default definition. It answers:

> What can Jurnii offer?

A Product may contain:

- name and code;
- Product family or classification;
- active catalogue status;
- reusable default configuration;
- pricing inputs or matrices that are intrinsic to the offering.

A Product must not contain Account-, Deal-, Contact-, negotiation-, contract-, or customer-specific
state.

Direct Product-to-Deal identity is not part of the intended model. Products enter an Account
relationship through Quotes.

### 7.2 Quote meaning

The Quote is a stateful Product instance within the Deal. It answers:

> What Product is being proposed or contracted in this Account relationship, through which Contact
> opportunity, and on what terms?

The Quote is authoritative for:

- its Deal association;
- its Product association;
- its attributed Contact opportunity;
- commercial-motion type, such as Acquisition, Expansion, or Renewal;
- Quote Stage;
- plan type;
- brands;
- frequency;
- target and actual ACV where applicable;
- contract and renewal dates;
- price, total, currency, and discounts;
- line identity and idempotency evidence;
- Product-specific commercial outcome.

The current supported invariant is one Product per Quote. One Deal may contain many Quotes, including
several Product instances and successive Acquisition, Expansion, or Renewal motions.

### 7.3 Quote attribution

Each Quote is attributed to a Contact opportunity. This identifies the individual through whom that
Product instance is currently being progressed.

Open Quote attribution may follow a recalculated leading Contact when the approved business rule
requires it. Closed Won and Closed Lost Quote attribution is historical evidence and must not be
silently rewritten by later Contact changes.

### 7.4 Native line items and duplicate Product fields

`Quoted_Items` is Zoho's native Quote line-item subform and contains real Product lookups. It is not a
text substitute for a Product relationship.

Any additional header-level Product field on Quote must prove a separate querying, workflow,
integration, reporting, or idempotency requirement. Two fields must not both claim authority for the
same Product association merely because the current implementation writes both.

### 7.5 Quote and Deal value

Quote values represent instantiated commercial terms. Deal value is a roll-up of the relevant Quote
instances according to the approved Quote lifecycle.

The following are forbidden:

- using `Product.Unit_Price` directly as Deal Amount;
- treating Product interest as signed or priced commercial evidence;
- splitting the Account's Deal because several Products are quoted;
- treating several Quote Products under one Deal as a mismatch;
- moving a Quote to a different Deal merely because it references another Product.

---

## 8. Activities act on Contact opportunities

### 8.1 Activity meaning

An Activity is an action or recorded event that changes or evidences state. Calls, Tasks, Meetings,
and relevant email events are Activity surfaces.

Every Activity must identify:

1. the Contact opportunity or record being acted upon;
2. the Activity surface or asset through which the action occurs;
3. the user or automation responsible for the action;
4. the Deal relationship context where Zoho requires or supports it.

In Zoho relationship terms:

- the Contact is normally the person/opportunity context (`Who_Id`);
- the Deal is the Account-relationship context (`What_Id`);
- these links are complementary and must not be treated as competing ownership.

### 8.2 Activity command and derived fields

The established one-field operating model remains:

- the rep changes the Activity's intended State or result command;
- automation derives custom Status and required native Zoho Status values;
- automation performs the Contact progression, Deal roll-up, Quote reconciliation, and next-action
  routing;
- reps do not command the same lifecycle through several duplicate fields.

Activity loss is local unless an explicit lifecycle rule promotes its consequence. One lost Activity
does not automatically lose its Contact. One lost Contact does not automatically lose the Deal while
another viable Contact opportunity remains.

### 8.3 Creation-time context snapshots

The nine Activity context fields are intentional immutable bookkeeping and reporting snapshots:

| Module | Stage snapshot | Pipeline snapshot | Opportunity snapshot |
| --- | --- | --- | --- |
| Tasks | `Task_Stage` | `Task_Pipeline` | `Task_Opportunity` |
| Calls | `Call_Task_Stage` | `Call_Task_Pipeline` | `Call_Task_Opportunity` |
| Events | `Meeting_Task_Stage` | `Meeting_Task_Pipeline` | `Meeting_Task_Opportunity` |

Their meanings are:

- `*_Task_Stage` = the Contact opportunity's granular Stage when the Activity was raised;
- `*_Task_Opportunity` = the Contact opportunity's MQL/SQL/FTP/RTP classification when the Activity
  was raised, whether stored directly or deterministically derived from Contact Stage;
- `*_Task_Pipeline` = the applicable Deal relationship Pipeline when the Activity was raised.

These values are written at Activity creation and do not change when the Contact or Deal later
advances.

Sequence-scope fields are not duplicates of these snapshots. For example, a field that tells the
router which stage a Task or Call belongs to has a different meaning from the Contact Stage snapshot
recorded when that Activity was created.

### 8.4 Product and contract evidence on Activities

Activity Product and contract-evidence fields are inputs to Quote reconciliation. When sufficient
evidence exists, the automation may create or update one or more Quote instances under the same Deal.

Activity Product evidence must not:

- create a Product-specific Deal;
- choose between several Product Deals;
- make a Contact sequence Product-scoped;
- copy relationship state onto the Product catalogue record.

### 8.5 Progression order

The general reconciliation order is:

```text
Activity outcome/evidence
  -> update the associated Contact opportunity
  -> reconcile affected Quote instance(s), when commercial evidence exists
  -> recalculate the single Deal roll-up
  -> update required derived/native mirrors
  -> raise or suppress the next Contact Activity
```

This order expresses semantic authority. Exact transaction ordering, retry behavior, and idempotency
must follow proven Zoho platform constraints.

---

## 9. Source-of-truth and field-placement rules

Every field must represent one distinct fact. A field is justified only when it serves at least one
of the following:

- a core business fact;
- an automation control;
- non-reconstructable historical bookkeeping or reporting;
- an integration identifier;
- a required native Zoho compatibility mirror.

A field is not justified merely because current code writes it or because it is populated.

Before keeping, adding, redefining, or retiring a field, determine:

1. What exact fact does it represent?
2. Which module is authoritative for that fact under this model?
3. Is it user-commanded, automation-derived, or immutable history?
4. Can it be reconstructed safely from an authoritative field?
5. Does any workflow, report, integration, layout, validation rule, formula, or API contract require
   it?
6. Does another field already carry the same fact?
7. Would deleting it make an existing update map fail?

Required classifications are:

- `KEEP — core business fact`;
- `KEEP — automation control`;
- `KEEP — immutable reporting snapshot`;
- `KEEP — integration identifier`;
- `KEEP — required native mirror`;
- `REDEFINE/MIGRATE`;
- `RETIRE`;
- `UNRESOLVED — blocked by dependency verification`.

Native Zoho fields may be maintained as derived mirrors where the platform requires them. They must
not become a second command surface or competing source of truth.

---

## 10. Settled field-governance directions

The detailed field contract remains subject to module-qualified code and live dependency verification.
The following owner directions are already settled:

### Keep

- the nine Activity Stage/Pipeline/Opportunity creation-time snapshots;
- required Activity State, Status, loss, sequence, booking, idempotency, and contract-evidence fields;
- the structured Quote commercial schema;
- native `Quoted_Items` with real Product lookups;
- `Accounts.Contract_URL` and `Accounts.Contract_Renewal_URL` as owner-required reference pointers,
  not relationship-state authority;
- Contact AOR note-taking fields;
- native Zoho loss-reason fields needed for native reporting;
- custom module-specific Lost Reasons used by the operating model;
- Lead Source value exactly `Trade Show / Event`.

### Retire after dependency and writes-first gates

- `Tasks.Blocks_Sequence`;
- `Deals.Deal_Primary_Contact` where the canonical Deal Contact lookup already carries the pointer;
- `Events.Reminder_Send_At`;
- Deal `Contract_Current_*` and `Contract_Initial_*` plan mirrors now owned by Quotes;
- `Commercials_Status` and `Commercial_Outcome`;
- WF010d, `Next_Comm_Follow_Up_Date`, `sendCommercialFollowUp`, and its dormant routing branch;
- `Contact_Source_Class`;
- `Profile_Completion_Status`;
- `Product_Interest_Staging`;
- `Call_Purpose_Detail` and the map that feeds only it;
- orphaned Contact completion/date maps whose outputs have no consumer.

### Reassess under this model

- Product-specific `Deal_Product` and `Deal_Product_Key` concepts;
- Product-scoped `Deal_Key` composition;
- Product-to-Deal related-list writes used as Deal identity;
- Deal `Opportunity_Stage`, Deal `Stage`, and other Opportunity-labelled fields whose present meanings
  conflict with Contact opportunity authority;
- Account State/Status fields that may only mirror Deal relationship state;
- Quote header Product fields that may duplicate native `Quoted_Items`;
- helper fields that cache a safely derivable roll-up;
- Product-specific Deal pipeline resolution and Account aggregation fields.

No field is deleted until every writer is removed and published, update maps are verified, and manual
dependencies that cannot be enumerated through APIs are checked.

---

## 11. Prohibited architectural patterns

The following patterns conflict with this model:

```text
Deal = Account × Product
one Deal per Product
one Deal per Contact
Product Deal
Product-specific Deal key
Product-specific Deal name
Contact sequence driven by exactly one Product Deal
several Product interests make Contact activation ambiguous
Opportunity authority exists only on Deal
Deal has an independent opportunity lifecycle separate from Contacts
Product interest directly establishes priced commercial value
Product record stores customer-specific state
Quote with a different Product belongs on a different Deal
several Quote Products under one Deal are a data error
Activity Stage snapshot comes from Deal instead of Contact
Activity opportunity snapshot comes from an independently progressing Deal opportunity
```

These are not alternative implementation choices. They are model violations.

---

## 12. Documentation authority and correction rules

### 12.1 Precedence

For semantic intent, use this order:

1. this authoritative model and subsequent explicit owner rulings;
2. an approved field contract derived from this model;
3. approved correction and migration plans;
4. current reference documentation after it has been reconciled;
5. existing code and live configuration as evidence of current behavior;
6. historical plans, audits, and superseded specifications.

Live metadata and workflow configuration remain authoritative about what Zoho currently allows or
executes. They are not authoritative about what the commercial model should mean.

### 12.2 Known conflicting repository statements

Existing repository material currently contains statements including:

- `Deal = Account × Product`;
- one Product Deal per Account/Product;
- Product-specific Deal keys and names;
- Opportunity derived on Deal only;
- multiple Product interests create multiple Deals;
- Account State rolls up across Product Deals;
- a Contact must select one Product Deal to drive its sequence;
- multiple Quote Products under one Deal are invalid.

All such statements are superseded by this document.

### 12.3 Documents requiring reconciliation

At minimum, the coding agent must review and correct or explicitly mark historical:

- `README.md`;
- `docs/SALES_GUIDE.md`;
- `docs/v6/FLOW_REFERENCE.md`;
- `docs/v6/full-flow.mermaid`;
- `docs/v6/FINAL_CANONICAL_FIELD_MATRIX.md`;
- every file in `docs/v6/zoho_v6_refactor_spec_pack/`;
- `docs/v6/PHASE3_A_E_R_LIFECYCLE_SCOPE.md`;
- Activity and activation test plans;
- current correction plans and field-audit conclusions;
- function header comments and inline invariants throughout `v6/`;
- booking documentation and tests that expect several Product Deals.

Historical audit evidence must not be rewritten to pretend the old implementation never existed.
Mark it historical or superseded and preserve its observations where they remain useful.

### 12.4 Documentation completion test

Documentation is not reconciled until a repository-wide search finds no current-authority statement
that:

- defines Deal by Product;
- places individual opportunity authority on Deal;
- treats Contact as merely supporting a Deal opportunity;
- treats Product as carrying customer relationship state;
- requires several Deals for several Products;
- sources Activity opportunity progression from Deal rather than Contact.

---

## 13. Implementation and migration boundaries

This document defines intended semantics. It does not authorize live mutation.

Before implementation, the coding agent must produce:

1. a module-qualified field-use contract;
2. an exhaustive reader/writer/workflow/integration map;
3. a code impact map for removing Product Deal assumptions;
4. an inventory of Accounts with multiple existing Deals;
5. a preservation-first strategy for Quotes, Activities, Contact Roles, audit history, and existing
   Deal IDs;
6. a staged plan separating code correction from live-record migration;
7. fixture-only acceptance tests proving the model;
8. an explicit publication, rollback, and field-retirement order.

Do not:

- merge or delete existing Deals;
- reparent live Quotes or Activities;
- rewrite historical Contact or Activity stages;
- bulk-reset sequence state;
- regenerate Activation Tasks;
- enable workflows or booking automation;
- delete fields;
- publish changed functions;

without the separately approved plan and deployment authorization.

---

## 14. Minimum acceptance invariants

Any corrected implementation must prove at least the following:

1. One Account produces no more than one persistent Deal.
2. Several converted Leads at the same Account become several Contact opportunities under that Deal.
3. Each Contact progresses independently through its own Activities and sequence.
4. Several Product interests or Product instances create several Quotes, not several Deals.
5. Each Quote carries one real Product relationship and an attributed Contact opportunity.
6. Quote stage and terms do not mutate the Product catalogue record.
7. Contact progression recalculates the Deal roll-up without rewriting other Contacts.
8. Losing one Contact does not lose the Deal while another viable Contact remains.
9. Activity Stage and Opportunity snapshots preserve the originating Contact's creation-time state.
10. Activity Pipeline snapshot preserves the Deal relationship Pipeline at creation.
11. Later Contact or Deal advancement does not rewrite Activity snapshots.
12. Deal Amount is derived from approved Quote evidence and never directly from Product defaults.
13. A renewal, expansion, additional Product, or Quote reassignment does not create another Deal for
    the Account.
14. Lead conversion leaves no durable automation dependency on the removed Lead.
15. Native Zoho fields required for mechanics or reporting remain derived and cannot override the
    custom authority model.

---

## 15. Compact reference

```text
Lead    = pre-relationship person/intake
Contact = instantiated person and individual opportunity

Account = existing company
Deal    = instantiated Account relationship and roll-up

Product = reusable offering definition
Quote   = instantiated Product in the Deal, attributed to a Contact opportunity

Activity = action/evidence applied primarily to a Contact opportunity

Contact progression -> Quote reconciliation where relevant -> Deal roll-up
```

The core rule is:

> **Identity and defaults live on the entity record. Changing relationship state lives on the
> instantiated record. Contact is the opportunity; Deal is the Account relationship roll-up; Quote
> is the Product instance.**
