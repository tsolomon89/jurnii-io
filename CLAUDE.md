# Jurnii — repository guide for AI agents

This is a **monorepo** with four independent systems. Work out which one you are in before you touch
anything.

| Path | System | Language |
|---|---|---|
| `src/`, `content/`, `assets/`, `scripts/`, `api/` | Jurnii marketing **website** (Vite + TS) | TypeScript |
| `booking/` | **Booking module** — form widget + serverless backend + Neon Postgres | Node / JS |
| `integrations/lemlist-zoho/` | **Lemlist import** — daily one-directional import of LinkedIn outbound activity into Zoho as completed Tasks | Node / JS |
| `zoho-functions/` | **Zoho CRM automation** — Deluge functions and workflow rules | Deluge |

> ⚠ The two Node subsystems have **different CRM write permissions, scoped by directory**. `booking/`
> creates no CRM records at all. `integrations/lemlist-zoho/` may create **Accounts and Contacts**
> (suppressed) but **never a Deal or Quote**. Each states its own rule in its own `CLAUDE.md`; do not
> reconcile them by weakening either.

---

# ⚠ THE COMMERCIAL MODEL — read this before touching `zoho-functions/` or `booking/`

**Authority:** [`zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)
It outranks all code, all documentation, and this file.

## The approved ontology

```
Lead     ->  Contact / Opportunity
Account  ->  Deal
Product  ->  Quote
```

```
one Account  ->  ZERO OR ONE persistent Deal
one Deal     ->  many Contact opportunities
one Deal     ->  many Quotes
one Product  ->  many Quote instances
one Quote    ->  one Product, one attributed Contact opportunity
one Contact  ->  many Activities
```

- **Products enter the model as QUOTES under the one Deal** — never as additional Deals.
- **Opportunity authority lives on the CONTACT**, not the Deal. The Deal's `Stage`,
  `Opportunity_Stage`, `Opportunity_State` and `Opportunity_Status` are **derived roll-ups**, not an
  independent lifecycle and not a command surface.
- **Activity context snapshots** (all nine are kept):
  `*_Task_Stage` ← the **Contact**'s Stage when raised ·
  `*_Task_Opportunity` ← the **Contact**'s MQL/SQL/FTP/RTP when raised ·
  `*_Task_Pipeline` ← the **Deal**'s relationship Pipeline when raised.
- Several Products or Quotes under a Deal **do not** make a Contact's sequence ambiguous.

## 🚨 The code is CORRECTED but NOT PUBLISHED (2026-08-19)

The working tree now implements the approved model. **The LIVE Zoho org still runs the superseded
one:**

```
LIVE (published):   Deal = Account × Product     Deal_Key = accountKey::productKey
WORKING TREE:       one Account -> one Deal      Deal_Key = Account_Key
```

**So the tree and the org disagree on purpose, and the direction of that disagreement is now the
opposite of what it was.** A `.deluge` file is no longer a description of what runs — it is a
description of what is *about to* run, pending the owner's P1 publish.

- **Reading code to learn current LIVE behaviour is now WRONG.** Use `git show HEAD:<file>` for that,
  or the live org.
- Offline gates: `python zoho-functions/scripts/deluge-syntax-check.py` and
  `python zoho-functions/scripts/deluge-field-scan.py` (both must be clean before publish).
- Most *documentation* still describes the superseded model and remains accurate about the org.

**Never "fix" code to match a document unless that document is the authority above.** In particular:

| You will find | It is |
|---|---|
| `zoho-functions/docs/v6/zoho_v6_refactor_spec_pack/` | ⛔ **SEALED.** The spec that commissioned the drift. **Do not implement from it. Do not run `08_coding_agent_prompt.md`** |
| `zoho-functions/.agents/skills/zoho-crm-deluge-refactoring/SKILL.md` | ⛔ **SEALED — do not invoke.** A loadable skill with a refactoring mandate, **two architectures out of date**, naming five Deluge functions that no longer exist |
| `zoho-functions/.agents/workflows/deluge-refactor-workflow.md` | ⛔ **SEALED.** Declares a `/refactor-deluge` command over a dead five-function pipeline |
| `zoho-functions/.agents/rules/deluge-rules.md` | ⛔ **SEALED.** Claims to "govern all Deluge development in this workspace". It does not — it is v3/v4-era |
| `Deal = Account × Product` in any README or guide | **live** behaviour, known drift — **banner-flagged** |
| `Deal = Account × Product` in a `.deluge` header comment | ⚠ **now mostly CORRECTED in-tree.** The rewritten headers describe the approved model and say so. Any that still assert the Product-Deal model are stale comments on corrected code — fix the comment, do not "restore" the code |
| `[multi_product_sequence_ambiguous]`, `[quote_product_mismatch]`, `[duplicate_product_deal]` | **RETIRED.** Removed from `_util_resolveManualReviewCode` and no longer raised anywhere. A guard test asserts their absence |
| `booking/tests/deluge-multi-product.test.js`, `zoho-field-names.test.js` | ✅ **INVERTED** into absence guards, as those files instructed. They now fail if the prohibited model returns |

## Where the truth is

| Question | File |
|---|---|
| What is the model? | `zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md` |
| Which doc can I trust? | `zoho-functions/docs/v6/V6_DOCUMENTATION_AUTHORITY_MAP.md` |
| What does this field mean, who reads/writes it, can I delete it? | `zoho-functions/docs/v6/V6_FIELD_USE_CONTRACT.md` |
| Where does the repo contradict the model? | `zoho-functions/docs/v6/V6_CONFLICT_LEDGER.md` |
| Where does the old model still appear, and is that allowed? | `zoho-functions/docs/v6/V6_RESIDUAL_SEARCH_REPORT.md` |
| What has to change, in which order? | `zoho-functions/docs/v6/V6_CRUD_PLAN.md` — all 18 workflow rules + all 38 Deluge files |
| **What is the plan?** | `zoho-functions/docs/v6/V6_CORRECTION_PLAN.md` — the single plan; six stages, publish order, blockers |
| What does each Deluge file do, and what should it do? | `zoho-functions/docs/v6/V6_DELUGE_FUNCTION_RESPONSIBILITY_LEDGER.md` |

---

# Hard rules

## Zoho — never mutate without explicit instruction

- **Default to read-only.** COQL `SELECT`, `GET`, `getFields`, `getWorkflowRules`. Nothing else.
- **Never publish a Deluge function.** The owner republishes by hand, from the Zoho console. Deluge
  source is not deployable over MCP.
- **Never commit a `.deluge` edit until the owner confirms it is published.** The working tree and the
  live org diverge on purpose. Some `.deluge` files are modified-but-unpublished at any given time —
  **check `git status` and ask before touching any.** See `V6_FIELD_USE_CONTRACT.md` blocker B7. The
  `booking/` tree has also been deployed from an uncommitted state before, so do not assume
  tracked == shipped there either.
- **Never create, update, delete or toggle a workflow rule, field, picklist or record** without an
  explicit instruction naming that exact change.
- **Never delete a Zoho field** without completing the ordering in `V6_FIELD_USE_CONTRACT.md` §11:
  remove every writer → publish → read the whole update map back → manual console dependency check →
  only then delete.

## Two Zoho write behaviours that will silently eat your data

1. A field that **exists but is off-layout** silently discards writes to that key. The rest of the map
   commits.
2. An api_name that **does not exist at all** can void the **entire** `updateRecord` map, taking valid
   keys down with it. Recorded twice as a production incident.

Deleting a field converts case 1 into case 2. `SUCCESS` proves nothing — **always read back.**

3. **Picklists round-trip in DISPLAY space** over Deluge, COQL and the record API, and COQL *filters*
   in display space too. `Task_Stage` stores the actual value `Renewall` but every surface returns
   `Renewal`. Never bulk-migrate a stage field between display and actual space.

   ⚠ **And the two stage vocabularies are not interchangeable.** `Contacts.Stage`,
   `Deals.Opportunity_Stage`, `Task_Stage`, `Call_Task_Stage` and `Meeting_Task_Stage` use the legacy
   actuals (`Demo Booked`, `Commercials Sent`, `Renewall`). `Tasks.Task_Sequence_Stage` and
   `Calls.Sequence_Stage` use the other set (`Demo Confirmation`, `Proposal Preparation`, `Renewal`) —
   and `Calls.Sequence_Stage` carries **both, 12 members**. Writing a value from the wrong set writes a
   non-member, which is discarded exactly like an unknown api_name. This is the specific mistake that
   would corrupt 132 Task rows.

## Contacts field names that look like each other

- `Contacts.Contact_Role1` — the field **on the Contact record**.
- `Contact_Role` — the field on the **`Contact_Roles` junction** (the Deals related list).
  Querying `Contact_Role` on Contacts returns blank for every record. That is a query artifact, not a
  finding.

---

# Working in each system

## `zoho-functions/`
Start at [`zoho-functions/README.md`](zoho-functions/README.md) §6 for the documentation map.
Reps and operators use `docs/SALES_GUIDE.md` — it describes **current** behaviour including the drift.

## `booking/`
Start at [`booking/README.md`](booking/README.md). `docs/implementation-notes.md` is the as-built
record and wins where documents disagree. Node **never creates a Deal** — that is owned by Deluge.

Tests: `npm test` (`node --test "booking/tests/*.test.js"`).
DB tests need the guard: `npm run test:db`.

⚠ `booking/integrations/zoho/index.js` `resolveProductDeal` picks a Meeting's `What_Id` by
substring-matching a Product name inside `Deal_Name`. Under the approved model that becomes "the
Account's Deal". **This must ship before the Deluge Deal-naming change**, or every booking lookup
returns `status:'none'` and Meetings are created with no `What_Id`.

## Website
`npm run dev` / `npm run build`. Content is compiled from `content/` via
`scripts/compile-content-manifest.ts`. `.agents/context/commercial-ontology-guide/` is a **website**
ontology tool — it has nothing to do with the CRM model above, despite the name.

---

# Conventions

- Prefer editing an existing file over creating a new one.
- Match the surrounding code's comment density, naming and idiom.
- Reference code as `path/to/file.ext:42`.
- Historical audit evidence is **preserved, never rewritten** to pretend the old implementation never
  existed. If a dated audit is wrong, add a banner — do not edit its findings.

---

*Reconciled 2026-08-17 (`jurnii-doc-reconciliation-2026-08-17`). **If this file conflicts with
`zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`, the authority wins and this file is
the bug** — fix it here rather than working around it.*
