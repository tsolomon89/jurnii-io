> # ⚠ KNOWN DRIFT — this file describes CURRENT BEHAVIOUR, not the approved model
>
> The orchestrator inventory and flow descriptions below are an **accurate description of what the code
> does today** and are deliberately left accurate. They are **not** the target design.
>
> Specifically: "A **Deal is always `Account × Product`**" and the per-product fan-out described in the
> orchestrator table are **implemented drift**. The approved model is **one Account → zero or one
> persistent Deal**, with Products entering as **Quotes**.
>
> This file will be rewritten when the correction ships. It is not being rewritten now, because
> describing the target as though it were implemented would make this documentation false for engineers
> reading it today.
>
> **Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)  ·  reconciled 2026-08-17 (`jurnii-doc-reconciliation-2026-08-17`)

---

# Zoho CRM Deluge — Commercial Operations Automation (v6)

This repository holds the **Zoho CRM Deluge** custom functions that run Jurnii's sales
pipeline end to end. Leads are transient intake; the durable graph is
**Contacts → Accounts → Deals → Products → Quotes**. The automation keeps that graph
canonical: it deduplicates records, resolves products, drives the sequenced outreach,
prices and maintains Quotes, and keeps every Deal's stage, state, amount, and contract
ledger in sync.

> **Audience.** This README is the technical entry point for engineers/admins.
> If you are an SDR or AE, read **[docs/SALES_GUIDE.md](docs/SALES_GUIDE.md)** instead —
> it explains how to *use* the system day to day.

---

## 1. The model in one paragraph

A **Deal is always `Account × Product`** (`Deal_Key = accountKey::productKey`). A single
lead or contact who is interested in three products produces three Deals — never one
generic account Deal, never one Deal per lead. **`processDeal` is the sole commercial
owner**: it owns Amount, Quotes, the contract ledger, the primary Contact, stage
advancement, and the Account rollup. The other three orchestrators (`processLead`,
`processContact`, `processAccount`) resolve the graph and then delegate every commercial
decision to `processDeal`. The **Contact** owns the outreach sequence; the Deal's stage
rolls up from the furthest-progressed open Contact under the Account.

---

## 2. Commercial ontology

### Opportunity Type — `Stage` field (the pipeline bucket)

| Value | Meaning |
| --- | --- |
| `MQL` | Marketing-qualified: intake / top-of-funnel. |
| `SQL` | Sales-qualified: demo booked, confirmed, or held. |
| `FTP` | First-Time Purchase: proposal out, in commercial negotiation. |
| `RTP` | Retention Purchase: signed, onboarding, or renewing. |

### Stage — `Opportunity_Stage` field (the current step) → Opportunity Type

| # | Stage | Opportunity Type |
| --- | --- | --- |
| 1 | `Marketing Consent` | MQL |
| 2 | `Demo Booking` | SQL |
| 3 | `Demo Confirmation` | SQL |
| 4 | `Demo Hosted` | SQL |
| 5 | `Proposal Preparation` | FTP |
| 6 | `Commercial Agreement` | FTP |
| 7 | `Onboarding` | RTP |
| 8 | `Renewal` | RTP |

> **Naming note.** Stage 1 is literally **`Marketing Consent`** in the data. The
> completion-timestamp field is named `*_Marketing_Qualification_Completed_At` for
> legacy reasons — that field name does **not** imply a separate "Marketing
> Qualification" stage. There is one stage-1 value: `Marketing Consent`.

### State & Status

- **`State`** (`Opportunity_State` on Deals): `Open` or `Lost` only.
  **Deals are never persistently `Won`.** Winning a gate advances the Deal into the
  next commercial motion; the "won" signal lives on the Quote (`Closed Won`) and on the
  advance into Onboarding.
- **`Status`** (`Opportunity_Status` on Deals): `New` (no meaningful manual activity),
  `Working` (a human logged a Call/Task/Meeting/Note — automated emails do **not** make a
  record `Working`), or `Closed` (only when `State = Lost`).

Stage never regresses. An RTP-floor rule prevents a signed Deal from being pulled
backward by later low-stage evidence.

---

## 3. Deluge functions (`v6/`)

### Orchestrators (module triggers)

| Function | Fires on | Role |
| --- | --- | --- |
| `processLead.deluge` | Lead create/edit | Always-convert intake. Resolves the canonical Account, converts the Lead to a Contact, creates one Product Deal per resolved product of interest, links products, and bootstraps imported-contract Quotes. Delegates commercials to `processDeal`. |
| `processContact.deluge` | Contact create (WF001b2) | Normalizes Stage/role/dates, creates Product Deals and Contact-Role links, and — for a Decision-Maker Contact with exactly one B2B Deal — raises the **Sequence Activation** task (the human start-gate). |
| `processAccount.deluge` | Account create/edit (WF001c) | Elects one canonical Deal per product key, silences duplicates, backfills missing Product Deals, and reconciles each via `processDeal`. |
| `processDeal.deluge` | Deal create (WF001d) + all delegated calls | **Commercial owner.** Contact-Roles, primary Contact, activity/import Quote upserts, scaffold Quote, Confirmed prerequisites, A/E/R lifecycle, Amount, contract ledger, stage transitions, Account rollup, signed-confirmation email. |

### Activity layer (`v6/activity/`)

| Function | Fires on | Role |
| --- | --- | --- |
| `routeContactSequence.deluge` | called by every handler | The Contact sequence-state executor / state machine. Advances Stage, dispatches the next Call/Task/email, delegates Deal reconciliation to `processDeal`. |
| `handleCallOutcome.deluge` | Call edit (WF006) | Routes a sequenced Call's Won/Open/Lost outcome into the sequence. |
| `handleMeetingEvent.deluge` | Event create/edit (WF007) | Routes a Meeting's state; source of truth for demos and commercial/renewal meetings. |
| `handleTaskCompletion.deluge` | Task edit (WF008) | Applies task commands: activation, Draft/Send Commercials, Onboarding Setup, activity loss. |
| `handleQuoteStageChange.deluge` | Quote create/edit (WF021) | Thin Quote→Deal reconciliation adapter; owns Deal-reassignment via `Quote_Last_Deal_ID`. |
| `handleEmailEvent.deluge` + `handleEmail{Replied,Bounced,NotReplied,OpenedNotReplied,Clicked}.deluge` | Email events (WF009a–e) | Interrupt the Contact with review/repair tasks on engagement events. Never advance the Deal. |
| `sendSequencedEmail.deluge` | called by senders | **Sole email owner.** Resolves one template from the inline registry and sends it behind all send gates. |
| `sendScheduledEmailFromTask.deluge` | Task `Due_Date` reached | Fires a scheduled (`ScheduledSend|…`) email. |
| `sendDemoReminder.deluge` | date-based (WF010c) | Sends the demo reminder from the Deal's demo mirrors. |
| `sendCommercialFollowUp.deluge` | date-based (WF010d) | Re-engages the Commercial Agreement cadence. |
| `createAuxTask.deluge` / `createManualReview.deluge` | called throughout | Create (idempotent, deduped) blocking Tasks and canonical `[code]` Manual Reviews. |
| `_util_*.deluge` (17) | called throughout | Pure/near-pure helpers: pricing, product/pipeline resolution, business-date math, quote-subject builder, A/E/R lifecycle, evidence collection, account rollup, logging. |

> **Deployment.** Deluge source cannot be pushed via the MCP integration — functions are
> published **by hand** in the Zoho UI. Do not commit function changes until they are
> live (they must be published before the repo is treated as source of truth).

---

## 4. Sequences, emails, and the activation gate

- **Nothing sends automatically until a human activates the sequence.** For a
  Decision-Maker Contact with one B2B Deal, automation raises a **Sequence Activation**
  task. The rep picks a route (`Email` / `Call` / `Manual`) and optionally a `warm`/`cold`
  note; only then is `Sequence_Activated_At` stamped and outreach begins.
- **Cadence families** are 5 steps each: `Marketing Consent`, `Demo Booking`,
  `Demo Hosted` (demo-*recovery*, i.e. a demo was scheduled but not held),
  `Commercial Agreement`, `Renewal`. Plus single-shot event emails
  (demo confirmation / reminder / no-show, post-demo, proposal-sent, signed-confirmation).
- **Send gates** enforced by `sendSequencedEmail` on every send: SendKey idempotency,
  the activation gate, a non-blank Contact email (no-recipient guard), B2B-pipeline
  resolution (Partnership/unresolved blocked), template resolution, and — for date-based
  senders — `Deal.Automation_Suppressed != true`.

> **Consent policy.** Every email `sendSequencedEmail` sends is a B2B sales, pipeline,
> transactional, or operational email — these are **not** gated by `Marketing_Consent`.
> `Contacts.Marketing_Consent` is a two-state checkbox (`true` or blank) that records
> affirmative consent for **general-marketing / promotional campaigns only**; blank does
> **not** block B2B or pipeline communication. Affirmative consent is carried from the
> Lead (`Leads.Contact_Marketing_Consent`) onto a blank Contact field on conversion —
> never fabricated. Only a future general-marketing campaign sender should require
> `Marketing_Consent == true`. See [docs/SALES_GUIDE.md §11](docs/SALES_GUIDE.md#11-maintaining-the-system-admin).

---

## 5. Guardrails worth knowing

- **`Deal.Automation_Suppressed = true`** is the master kill switch for a Deal's automation.
- **Loss is module-local.** An activity or single Contact going Lost never auto-closes a
  Deal; a Deal closes only when all its Contacts are Lost (or an explicit Deal-level loss),
  or on Renewal churn.
- **Manual Review tasks** (canonical `[code]` prefix) surface every anomaly the automation
  refuses to guess through — unresolved/ambiguous products, missing pricing, unverified
  writes, tier conflicts, etc. Automation **never auto-picks** on ambiguity.
- **Quotes use the REST API**, not native `getRecordById`, because Deluge drops custom
  subform fields and line ids — this prevents duplicate Quote lines / inflated Amounts on
  re-fire.
- **Pricing** comes from a banded matrix (`_util_resolveQuoteLinePrice`). Jurnii Cortex has
  no auto-price; unpriced lines raise Manual Review rather than inventing a value.

---

## 6. Documentation map

**Read in this order.** The authority outranks every other row, including this README.

| Doc | What it is |
| --- | --- |
| **[docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md](docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)** | 🟢 **THE AUTHORITY.** Owner-approved commercial ontology. Outranks all code and documentation. Start here. |
| [docs/v6/V6_DOCUMENTATION_AUTHORITY_MAP.md](docs/v6/V6_DOCUMENTATION_AUTHORITY_MAP.md) | Which document may be trusted, and for what. Every Zoho doc classified. |
| [docs/v6/V6_FIELD_USE_CONTRACT.md](docs/v6/V6_FIELD_USE_CONTRACT.md) | 🟢 **Field authority.** Every field: source, readers, writers, dependencies, classification. Supersedes both field matrices. |
| [docs/v6/V6_CONFLICT_LEDGER.md](docs/v6/V6_CONFLICT_LEDGER.md) | Every repository statement conflicting with the authority, and whether the code still implements it. |
| [docs/v6/V6_RESIDUAL_SEARCH_REPORT.md](docs/v6/V6_RESIDUAL_SEARCH_REPORT.md) | The §12.4 completion test: where the prohibited architecture still appears, and why each occurrence is allowed. |
| [docs/v6/V6_CRUD_PLAN.md](docs/v6/V6_CRUD_PLAN.md) | 🟢 **What to change.** Live inventory of all 18 Zoho workflow rules and all 38 Deluge files, with create/update/delete verdicts and the dependency-ordered publish sequence. |
| [docs/v6/V6_CORRECTION_PLAN.md](docs/v6/V6_CORRECTION_PLAN.md) | 🟢 **THE PLAN.** Ordered work items in six stages, each citing ledger rows, with the publish order and the genuine blockers. Start here to do the work. |
| [docs/v6/V6_FUNCTIONAL_SPEC_THREE_FLOWS.md](docs/v6/V6_FUNCTIONAL_SPEC_THREE_FLOWS.md) | 🟢 **Start here for the work itself.** What must be TRUE, in three flows: Lead→Account/Deal/Quote, Activities→cadence, core fields→supporting fields. Includes the ordered work list and the acceptance tests. |
| [docs/v6/V6_REBUILD_VS_MIGRATE.md](docs/v6/V6_REBUILD_VS_MIGRATE.md) | **Decision record:** the existing CRM records are wiped and re-imported from CSV, not migrated. Provenance evidence, what a wipe does *not* remove, and the post-import acceptance set. |
| **[docs/SALES_GUIDE.md](docs/SALES_GUIDE.md)** | **Start here if you're an SDR/AE.** How to use and maintain the system. ⚠ Describes current behaviour, including known drift. |
| [docs/v6/zoho_v6_refactor_spec_pack/](docs/v6/zoho_v6_refactor_spec_pack/) | ⛔ **SUPERSEDED AND SEALED** — the specification that commissioned the Product-Deal refactor. Historical record only. **Do not implement from it; do not re-run `08_coding_agent_prompt.md`.** See [SUPERSEDED.md](docs/v6/zoho_v6_refactor_spec_pack/SUPERSEDED.md). |
| [docs/v6/FLOW_REFERENCE.md](docs/v6/FLOW_REFERENCE.md) | End-to-end flow, cadences, and the Amount/valuation hierarchy. ⚠ Known drift on Deal identity. |
| [docs/v6/PHASE3_A_E_R_LIFECYCLE_SCOPE.md](docs/v6/PHASE3_A_E_R_LIFECYCLE_SCOPE.md) | Acquisition / Expansion / Renewal quote lifecycle. ⚠ Never coded; needs re-scope onto the Account Deal. |
| [docs/v6/ACTIVATION_GATE_TEST_PLAN.md](docs/v6/ACTIVATION_GATE_TEST_PLAN.md) | Activation-gate + email-idempotency invariants. Invariant survives; one precondition changes. |
| [docs/v6/FINAL_CANONICAL_FIELD_MATRIX.md](docs/v6/FINAL_CANONICAL_FIELD_MATRIX.md) | Per-module field reference. ⚠ Predates the authority; three rows superseded. Prefer the field-use contract. |
| [docs/MEETING_CRUD_GUIDE.md](docs/MEETING_CRUD_GUIDE.md) · [docs/MEETINGS_KISS.md](docs/MEETINGS_KISS.md) | Event/Meeting CRUD and the one-page rep guide. |
| [.agents/context/activity-workflows/](.agents/context/activity-workflows/) | Email drafts and call scripts, per stage/step. |

Historical migration artifacts (v1–v5, the June 2026 closeout cluster, one-time E2E
reports, completed deployment runsheets) have been removed from the working tree; they
remain in git history if ever needed.
