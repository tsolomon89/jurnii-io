# v6 Documentation Authority Map

**Created:** 2026-08-17 · **Marker:** `jurnii-doc-reconciliation-2026-08-17`
**Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)

This map is the answer to "which document may I trust, and for what?" Every Zoho-relevant document in
the repository is listed with a class, a purpose, whether it asserted the prohibited Product-Deal model
as current intent, and the reconciliation action actually applied.

## Classes

| Class | Meaning |
|---|---|
| **CURRENT AUTHORITY** | Outranks all code and documentation. Exactly one document. |
| **CURRENT IMPLEMENTATION REFERENCE** | Accurately describes what the code does **today**. May contain drift, banner-flagged. |
| **MIGRATION / CORRECTION PLAN** | Forward-looking. Re-based onto the authority. |
| **HISTORICAL EVIDENCE** | Dated evidence. Preserved unedited; conclusions may be superseded. |
| **OBSOLETE** | Superseded specification. Sealed, never re-executed. |
| **OUT OF SCOPE** | Website, analytics, brand, marketing. No Zoho content. |

## Path-mapping correction (load-bearing)

Authority §12.3 names `README.md`, `docs/SALES_GUIDE.md`, `docs/v6/*`,
`docs/v6/zoho_v6_refactor_spec_pack/`, `.agents/context/import_tests/`. **None resolve at the
repository root.** They all resolve under `zoho-functions/`. The repo-root `README.md` is a one-line
website build stub with zero Zoho content; the repo-root `docs/` is a different, newer set.

Reading §12.3 against the repo root would let the §12.4 completion test pass while every intended file
stayed unchanged. Every path below is given as its **real** path.

---

## The map

| # | Path | Class | Purpose | Asserted Product-Deal as current intent? | Action applied |
|---|---|---|---|---|---|
| 1 | `zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md` | **CURRENT AUTHORITY** | Owner-approved commercial ontology | No — prohibits it (§11) | **Installed here 2026-08-17**; pointer left at `docs/` |
| 2 | `zoho-functions/README.md` | CURRENT IMPL REF | Engineer entry point; orchestrator inventory | **YES** — L18 "a Deal is always `Account × Product`"; L79–81 fan-out as design | KNOWN-DRIFT banner. Prose deliberately left accurate to code |
| 3 | `zoho-functions/docs/v6/FLOW_REFERENCE.md` | CURRENT IMPL REF | "How v6 flows today" | **YES** — L3–8 under the heading "## Current Architecture" | KNOWN-DRIFT banner; heading re-framed in banner; WF004 non-existence flagged |
| 4 | `zoho-functions/docs/SALES_GUIDE.md` | CURRENT IMPL REF | SDR/AE working manual | **YES** — L40–41, L53, L115 diagram, L121, L133 | KNOWN-DRIFT banner. **Highest behavioural blast radius — trains humans.** Prose not rewritten |
| 5 | `zoho-functions/docs/MEETING_CRUD_GUIDE.md` | CURRENT IMPL REF | Event/Meeting CRUD + automation on save | **YES** — L61, L330–335, L399–400 | KNOWN-DRIFT banner. Notes §8.1 *endorses* Who=Contact/What=Deal; only "Product" is drift |
| 6 | `zoho-functions/docs/MEETINGS_KISS.md` | CURRENT IMPL REF | One-page rep guide | No — says only "Related To = the Deal" | None needed; already model-compatible |
| 7 | `zoho-functions/docs/v6/full-flow.mermaid` | CURRENT IMPL REF | End-to-end v6 diagram | Partially — no `Account × Product` label; Deal node carries opportunity state | `%%` drift note added |
| 8 | `zoho-functions/docs/v6/single-field-full-flow.mermaid` | CURRENT IMPL REF | Single-field command flow | No | None needed |
| 9 | `zoho-functions/docs/v6/FINAL_CANONICAL_FIELD_MATRIX.md` | CURRENT IMPL REF | Intended final field authority | No — de-couples Activation-Task identity from Deal/Stage | Predates-model banner; three rows marked superseded. **Not obsolete — materially aligned** |
| 10 | `zoho-functions/docs/v6/SINGLE_FIELD_AUTOMATION_AUDIT.md` | CURRENT IMPL REF | Single-field command invariant; correction D1 | No | None needed; D1 consistent with §8.2/§5.4 |
| 11 | `zoho-functions/docs/v6/jurnii_zoho_quote_product_contract_spec_v2.md` | CURRENT IMPL REF | Quote/Product contract | No — "one Product per Quote" matches §7.2 | Banner **resolving** the `Quote_Product` vs `Quoted_Items` question; `Opportunity_Type` correction |
| 12 | `zoho-functions/docs/v6/PHASE3_A_E_R_LIFECYCLE_SCOPE.md` | MIGRATION PLAN (unexecuted) | A/E/R successor-Quote scope | **YES** — L10, L20, L52, L91, L80 | RE-SCOPE banner. State machine survives; anchor changes. Never coded → no code debt |
| 13 | `zoho-functions/docs/v6/ACTIVATION_GATE_TEST_PLAN.md` | MIGRATION PLAN (unrun) | "No email before Activation commit" tests | Marginally — AG-N1 precondition | Banner: one precondition changes, one §14.13 case added. Invariant survives |
| 14 | `zoho-functions/docs/v6/AUDIT_RESULTS_PRE_PUBLISH.md` | HISTORICAL | 2026-08-08 census; 153 Activation Tasks, 0 committed | No | HISTORICAL banner; points to newer census. Counts not restated |
| 15–24 | `zoho-functions/docs/v6/zoho_v6_refactor_spec_pack/` (10 files) | **OBSOLETE** | The specification that commissioned the refactor | **YES** — 86 occurrences | **SEALED.** `SUPERSEDED.md` + per-file banner. `08_coding_agent_prompt.md` marked *do not re-run* |
| 25 | `docs/AUDIT_QUESTIONS_v6_booking_2026-08-10.md` | HISTORICAL | v6+booking deep dive | No — describes fan-out as *observed* | HISTORICAL banner; supersession made mutual; F1 severity retraction recorded |
| 26 | `docs/V6_BOOKING_REMEDIATION_PLAN.md` | MIGRATION PLAN (active) | C1–C4 + three-batch plan | No — L157 already proposes removing the one-Product-Deal gate | RE-BASE banner. §2.7 retained; L134 re-scoped |
| 27 | `docs/V6_DELUGE_FIELD_AUDIT_2026-08-10.md` | HISTORICAL | 248 (module,field) pairs across 38 functions | No — records identity fields as *observed writers* | HISTORICAL banner: **field evidence valid, framing superseded.** Not rewritten |
| 28 | `docs/V6_DIAGNOSIS_BRIEFING_2026-08-15.md` | HISTORICAL | Owner briefing, 4 diagnostic passes | No | HISTORICAL banner + **one acceptance criterion corrected** (L60) |
| 29 | `docs/V6_FIELD_VALIDATION_ADVERSARIAL_2026-08-15.md` | HISTORICAL | Adversarial rulings; delete-ordering rule | No | HISTORICAL banner. Holds the void-the-map finding — **UNVERIFIED, gates every retirement** |
| 30 | `docs/V6_FIELD_VALIDATION_MATRIX_2026-08-15.md` | MIGRATION PLAN (active) | 36-field matrix with owner rulings | No | **CORRECTED banner: retention verdicts stand, Activity snapshot SOURCE superseded.** Not a new owner decision |
| 31 | `docs/V6_MANUAL_DEPENDENCY_CHECKLIST.md` | MIGRATION PLAN (active, blocking) | Manual console gate on every deletion | No | ACTIVE banner; extended with the newly-retired fields |
| 32 | `zoho-functions/docs/FIELD_REUSE_NOTES.md` | HISTORICAL | v3-era field-reuse decisions | No | HISTORICAL banner; two dead references flagged; Deals row still live-true |
| 33 | `.../import_tests/AUDIT_00_REVISION_R1.md` | HISTORICAL | Pricing-model correction (banded matrix) | No | HISTORICAL banner. Its `Unit_Price` finding is **required** by §7.5 |
| 34 | `.../import_tests/AUDIT_01_ARCHITECTURE_E2E_QUOTE.md` | HISTORICAL | 2026-06-22 pre-import E2E audit | No — **strongest pro-model evidence in the repo** | Banner extended + **promoted.** L115 is live proof the approved model worked here. WF004 claim flagged false |
| 35 | `.../import_tests/AUDIT_02_CSV_MAPPING_EXCEPTIONS.md` | HISTORICAL | CSV→field mapping, row exceptions | No — "one Account + one Deal per domain" | HISTORICAL banner; same promotion note |
| 36 | `.../import_tests/AUDIT_03_RUNBOOK_AND_QUOTE_BACKFILL.md` | HISTORICAL | Import runbook + Quote backfill | No | HISTORICAL banner. Its "Trigger workflows" control lifted into the migration procedure |
| 37 | `.../import_tests/AUDIT_R2_HANDOFF.md` | HISTORICAL | F1–F4 repair handoff | No | HISTORICAL banner. Tooling constraints still true |
| 38 | `.../import_tests/AUDIT_R2_REPAIR_MANIFEST.md` | HISTORICAL | Repair + republish manifest | No | HISTORICAL banner. Provenance for the field contract |
| 39 | `.../import_tests/ACTIVITY_FIELD_DEPENDENCY_AUDIT.md` | HISTORICAL | Activity-field dependency audit | No | HISTORICAL banner. Headline is load-bearing but **inherited, not re-verified** |
| 40 | `.../import_tests/ACTIVITY_FIELD_CLEANUP_PLAN.md` | MIGRATION PLAN (partly executed) | Four-layer field cleanup | No | **⚠ banner: do not run as written.** Layer 1 "hide via layout" is unsafe — off-layout fields discard writes |
| 41 | `.../import_tests/ACTIVITY_DESCRIPTION_AUDIT.md` | HISTORICAL | Automation-authored Description rewrite | No | HISTORICAL banner; links the open Activation-Task Description gap |
| 42 | `.../import_tests/IMPORT_MAPPING_NOTES.md` | HISTORICAL | Import contract / schema alignment | **YES, weakly** — L63 end-state | HISTORICAL banner; L63 end-state marked superseded |
| 43 | `zoho-functions/.agents/context/v4-core-e2e-test-log.md` | HISTORICAL | v4 CRM-graph E2E log | No — L129 tests a second Deal as a *duplicate* | HISTORICAL banner + **promoted** as pro-model evidence |
| 44 | `.../activity-workflows/emails/README.md` | CURRENT IMPL REF | 41 email templates + send gates | No | KNOWN-DRIFT banner on two gate descriptions (recipient, pipeline resolution) |
| 45 | `.../activity-workflows/{call_scripts,emails}/*.md` (~90 files) | CURRENT IMPL REF | Per-stage scripts and copy | No — keyed to Contact Stage | None needed. §5.2 preserves the 8 Contact Stages |
| 46 | `.../zoho-backups/20260615T121415Z/README.md` | HISTORICAL | Pre-cutover rollback snapshot | No | HISTORICAL banner; `crm_functions_raw.json` flagged stale |
| 47 | `booking/README.md` | CURRENT IMPL REF | Booking entry point + reading order | No | None needed. **Model banner practice for the rest of the repo** |
| 48 | `booking/docs/architecture.md` | CURRENT IMPL REF (internal obsolete section) | Booking design + API contracts | **YES** — inside the *surviving* As-built half | **Second, narrower banner** on the Deal-linking section. Strongest (e) in the repo |
| 49 | `booking/docs/implementation-notes.md` | CURRENT IMPL REF | As-built deviations/defects/decisions | No | None needed. Its Zoho metadata boundary is **stricter than** §13 and compatible |
| 50 | `booking/docs/runbook.md` | CURRENT IMPL REF | Operator procedures | No | None needed |
| 51 | `booking/docs/IMPLEMENTATION_EVIDENCE.md` | **OBSOLETE** | Pre-rewrite synchronous booking design | **YES** | **Already correctly bannered.** Used as the banner template |
| 52 | `booking/jurnii-booking-database-backend-spec.md` | CURRENT IMPL REF (planning spec) | DB-first booking backend spec | **YES** — but all 5 hits sit in *boundary* clauses | TERMINOLOGY banner. Boundary clauses correct; entity name wrong |
| 53 | Repo-root `README.md` | CURRENT IMPLEMENTATION REFERENCE | Was a one-line website stub; rewritten 2026-08-17 as a monorepo entry point | No | Rewritten. §12.3's `README.md` means row 2; mapping recorded so §12.4 is not falsely satisfied |
| 55 | `zoho-functions/.agents/skills/zoho-crm-deluge-refactoring/SKILL.md` | **OBSOLETE** | A **loadable skill** carrying an active refactoring mandate over five Deluge functions that no longer exist | No — it predates the Product-Deal vocabulary entirely, which is why the §12.4 term sweep missed it | ⛔ **SEALED.** Frontmatter `description` rewritten to open `SUPERSEDED — DO NOT INVOKE` — *a body banner does not prevent skill matching; the description is what a matching agent reads.* Two instructions inside are model violations: per-conversion Deal creation, and summing Product values into `Deal.Amount` (§7.5 forbids) |
| 56 | `zoho-functions/.agents/workflows/deluge-refactor-workflow.md` | **OBSOLETE** | Declares a **`/refactor-deluge` slash command** over `convert2lead → normalizeContactCommercialState → normalizeDealCommercialState → syncDealProductsAndValue → rollupAccountCommercialState` | No | ⛔ **SEALED.** None of those five functions exists; the live architecture is 38 functions under `v6/` |
| 57 | `zoho-functions/.agents/rules/deluge-rules.md` | **OBSOLETE** | Claims to *"govern all Zoho CRM Deluge development within this workspace"* | No | ⛔ **SEALED.** Its no-Cadences / zero-block-conversion / no-duplicate-Account rules survive; its `syncDealProductsAndValue` mandate and `Product Interest (Staging)` → `Amount` mapping do not |
| 58 | `zoho-functions/.agents/rules/zoho-api-reference.md` | HISTORICAL | Deluge API signatures, criteria structures, pagination, linking behaviour | No | Mechanics largely still true. Banner adds three live-verified corrections: read-back is mandatory, picklists round-trip in display space, `Contact_Roles` (not `Contacts`) is the valid Deals related list |
| 59 | `zoho-functions/docs/v6/V6_CRUD_PLAN.md` | MIGRATION / CORRECTION PLAN (active) | All 18 live workflow rules + all 38 Deluge files, with CRUD verdicts and the publish sequence | No | **Created 2026-08-17.** Closes field-contract blocker B5 |
| 60 | `zoho-functions/.agents/context/README.md` | CURRENT IMPLEMENTATION REFERENCE | Staleness index for the cached context snapshots | No | **Created 2026-08-17.** Flags `crm_workflow_rules_raw.CAPTURED_AUTH_FAILURE.json` (a captured error, zero rules) and `crm_functions_raw.2026-06-14.STALE.json` — both renamed so the filename stops implying validity |
| 61 | `CLAUDE.md`, `AGENTS.md`, `booking/CLAUDE.md`, `zoho-functions/v6/CLAUDE.md`, `.cursor/rules/jurnii-crm-model.mdc` | CURRENT IMPLEMENTATION REFERENCE | Agent entry points | No — they state the approved model | **Created 2026-08-17.** Before this there was **no `CLAUDE.md` or `AGENTS.md` anywhere**, so a fresh agent's first model signal came from a `.deluge` header asserting `Deal = Account × Product` |
| 54 | `docs/analytics-*.md`, `docs/*design-system.md`, `design-token-audit.md`, `scripts/PERF.md`, `scripts/perf-baselines/`, `.agents/context/{architecture,commercial-ontology-guide,brand-guide,international-reports}/**`, `content/**` | OUT OF SCOPE | Website, analytics, brand, market research, marketing | No — grep returns two incidental analytics mentions, neither architectural | None. Recorded as the known-clean exclusion set for §12.4 |

---

## Reconciliation summary

| Tier | Count | Treatment |
|---|---|---|
| Authority installed | 1 | canonical path + pointer |
| Tier 1 — SUPERSEDED, sealed | 10 | `SUPERSEDED.md` + per-file banner; **content unedited** |
| Tier 2 — HISTORICAL | 19 | dated banner; evidence preserved |
| Tier 3 — KNOWN-DRIFT | 6 | banner; **prose deliberately left accurate to current code** |
| Active plans corrected | 3 | correction / re-base / extension banner |
| Scoped notes | 5 | targeted correction notes |
| No change needed | ~95 | already model-compatible or out of scope |

## Two deliberate decisions recorded

**1 · Bannering, not rewriting, the six Tier-3 documents.** They describe what the system does today and
reps act on them. Authority §12.3 prohibits rewriting documentation to claim the target is already
implemented, and §12.4's completion test is satisfiable by bannering. Rewriting them now would create
false documentation for the entire interval between now and the code correction.

**2 · Sealing the spec pack rather than editing it.** It is the origin of the drift *and* the record of
why the drift was built. Editing it would destroy the decision history that explains the reversion.
