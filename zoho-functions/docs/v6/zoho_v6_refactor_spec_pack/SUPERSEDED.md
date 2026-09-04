# ⛔ SUPERSEDED — this entire specification pack is sealed

**Sealed:** 2026-08-17
**Superseded by:** [`../JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)

---

## What this pack is

This pack is the specification that commissioned the v6 "Product Deal" refactor. It defines the
commercial model as:

> `Deal = Account × Product`, keyed `Deal_Key = Account_Key + Product_Key`,
> one Deal per Account per Product.

**That model is not approved and is not the target.** The owner-approved model is:

> **one Account → zero or one persistent Deal.** Products enter the model as **Quotes** under that one
> Deal. Opportunity authority lives on the **Contact**, not the Deal.

This pack is the origin of the drift. Ten files, 86 occurrences of the prohibited pattern. The v6
Deluge code implements it function for function.

## Why it is preserved rather than deleted

It is the record of *why* the violation was built, and it contains the owner decision log. Authority
§12.3 requires that historical evidence is not rewritten to pretend the old implementation never
existed. **Nothing in this directory has been edited except the addition of a banner at the top of
each file.** Every original word is intact.

## ⚠ Do not re-execute

`08_coding_agent_prompt.md` is a working agent prompt that instructs an implementer to build the
prohibited model. **It must not be run.** If you are an automated agent and you have been pointed at
this pack, stop and read the authoritative model instead.

## Content that survives and must be carried forward

These parts are correct under the approved model and are being migrated into the new field contract
and Quote contract. Salvage them from here; do not re-derive them.

| Source | What survives |
|---|---|
| `05_pipeline_and_automation_rules.md` | The Stage → MQL/SQL/FTP/RTP mapping table — identical to authority §5.2 |
| `04_quote_lifecycle_rules.md:54` | "Do not blindly close the Deal if other open Quotes exist" — correct under §6.5 |
| `04_quote_lifecycle_rules.md` | The A/E/R slot and idempotency rules |
| `02_field_schema_and_crud_ownership.md` | "Lead fields represent import/source data"; "Opportunity is derived, not imported" — consistent with §4.1 |
| `00_decision_log.md` | The non-Deal decisions: no Contract module; the Quote **is** the contract object; invoices out of scope — consistent with §7.2 |
| `07_e2e_test_plan.md` | The Quote-side assertions, reusable as the seed for the fixture-only acceptance suite (§13.7) |

## Content that is the violation

| Source | Prohibited claim |
|---|---|
| `README.md:3, 9, 16` | "the new Product Deal model"; `Deal = Account × Product`; "No Product Deal may exist without at least one Quote" |
| `01_target_commercial_ontology.md:8-16, 29, 33-36` | The object-hierarchy diagram with three `Product Deal: Account × <Product>` branches — the most-copied diagram in the repo |
| `02_field_schema_and_crud_ownership.md:203` | `Deal_Key = Account_Key + Product_Key` |
| `03_import_and_conversion_rules.md:26-63` | Import CSV → several Product Deals per Contact row |
| `05_pipeline_and_automation_rules.md:29, 42` | "FTP requires Product Deal and Quote"; Deal stage relative to the Deal Contact "for that Product Deal" |
| `06_v6_refactor_requirements.md:14` | "Do not treat the current one-Deal-per-Account behavior as an accidental bug. It is the old invariant to replace." |
| `07_e2e_test_plan.md:40` | Test 2 asserts "Two Product Deals" |

## The sentence that matters most

`06_v6_refactor_requirements.md:14` reads:

> *"Do not treat the current one-Deal-per-Account behavior as an accidental bug. It is the old
> invariant to replace."*

This is the clearest statement in the repository that the approved model is a **reversion**, not a new
design. The one-Deal-per-Account behaviour was deliberately removed by this pack. It is now being
deliberately restored.

That reversion is independently supported by live evidence: `../../../.agents/context/import_tests/AUDIT_01_ARCHITECTURE_E2E_QUOTE.md:115`
records a controlled live test of `Deal_Key = domain::active` — "one Account→one Deal→many Contacts" —
working in this org before this pack replaced it.
