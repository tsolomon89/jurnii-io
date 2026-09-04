# v6 Residual-Search Report

**Created:** 2026-08-17 · **Marker:** `jurnii-doc-reconciliation-2026-08-17`
**Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)

This is the §12.4 completion test: a repository-wide search for every surviving statement of the
prohibited Product-Deal architecture, classified by whether it is *allowed* to survive.

## Method

Case-insensitive regex sweep over the whole working tree, excluding `node_modules`, `.git`, `dist`,
`.vercel`, `.next`, `coverage`. Extensions: `.md .mermaid .deluge .js .ts .json .py .sql .csv .yml .yaml`.

Search set:

```
Deal = Account x|× Product        Account x|× Product          Product Deal / Product-Deal / Product_Deal
one Deal per product              per-product Deal             Deal per Product
one Deal per Contact              Deal_Product                 Deal_Product_Key
createOrReuseProductDeal          pipelineForProductKey        resolveDealPipeline
resolveProductDeal                multi_product_sequence_ambiguous
duplicate_product_deal            quote_product_mismatch       ::active
accountKey::productKey
```

Reproduce with `scripts/`-free Python or:
`rg -i -c "Product[ _-]Deal|Deal_Product|Account\s*[x×]\s*Product|createOrReuseProductDeal" --glob '!node_modules'`

## Counts

| | Occurrences | Files |
|---|---|---|
| Baseline (pre-reconciliation, narrower pattern set) | 489 | 68 |
| **Current (2026-08-17, post-reconciliation)** | **640** | **80** |

**The count went up, and that is the expected result.** Reconciliation adds category-(a) occurrences —
the banners, the authority map, this report and the conflict ledger all *quote* the prohibited pattern
in order to prohibit it. The measure that matters is not the total; it is that **category (e) —
"asserts Product-Deal as the current intended architecture, unlabelled" — is now empty.**

| Area | Occurrences | Files |
|---|---|---|
| `zoho-functions/` | 514 | 49 |
| `booking/` | 80 | 25 |
| `docs/` | 46 | 6 |

Clean (zero occurrences): repo-root `.agents/`, `.cursor/`, `.github/`, `.claude/`, `content/`,
`scripts/`, and all website / analytics / brand / market-research documentation. That exclusion set is
recorded so a future §12.4 run has a known-clean baseline.

---

## Classification

### (a) Quoted as the OLD architecture being retired — **ALLOWED**

The authority document itself (§11 prohibited-patterns block, §10 Reassess list, §12 reconciliation
list), plus every artifact created by this reconciliation: `SUPERSEDED.md`, the 33 banners,
`V6_DOCUMENTATION_AUTHORITY_MAP.md`, `V6_CONFLICT_LEDGER.md`, `V6_FIELD_USE_CONTRACT.md` and this file.

`docs/V6_BOOKING_REMEDIATION_PLAN.md:157` also belongs here — it is the only pre-authority document
that treats any part of Product-Deal as something to remove ("remove the 'exactly one Product Deal'
precondition"). It reaches the right conclusion for one gate only and does not retire the Deal-key
composition.

### (b) Preserved historical evidence — **ALLOWED**

Now all banner-marked. `booking/docs/IMPLEMENTATION_EVIDENCE.md` (already correctly sealed before this
pass); `.agents/context/import_tests/AUDIT_01/02/03`, `AUDIT_R2_HANDOFF`, `AUDIT_R2_REPAIR_MANIFEST`,
`IMPORT_MAPPING_NOTES`; `.agents/context/v4-core-e2e-test-log.md`;
`.agents/context/api_field_names/*.csv` (already declared stale).

**Immutable by nature:** `booking/db/migrations/0004_multi_product_and_lead_source.sql:69` and
`0005_meeting_title.sql:30` carry Product-Deal column comments. Applied migrations are history —
correct them with a **new** migration, never by editing an applied one.

### (c) Current-code description — allowed **only if labelled as drift**

At baseline this category held ~25 occurrences and **none carried a drift label**. All are now labelled:

| File | Label applied |
|---|---|
| `docs/V6_DELUGE_FIELD_AUDIT_2026-08-10.md` | HISTORICAL — field evidence valid, framing superseded |
| `docs/AUDIT_QUESTIONS_v6_booking_2026-08-10.md` | HISTORICAL — supersession made mutual |
| `docs/V6_DIAGNOSIS_BRIEFING_2026-08-15.md` | HISTORICAL + one acceptance criterion corrected |
| `booking/docs/implementation-notes.md` | none needed — neutral engineering note, no design claim |
| `booking/docs/architecture.md:172` | already carried `~~Known limitation~~ — CLOSED` |

### (d) A test proving the prohibited architecture is ABSENT — **ZERO, before and after**

**This is the most important finding in the report and reconciliation does not fix it.**

There is no executable guard for any of the 15 acceptance invariants in authority §14. Worse, the tests
that touch the architecture assert its **opposite**:

| Test | What it pins |
|---|---|
| `booking/tests/deluge-multi-product.test.js` (whole file) | The `Deal_Key:equals` lookup is unambiguous "by construction"; the `duplicate_product_deal` review; the `Deal_Product_Key` anchor exclusion |
| `booking/tests/zoho-field-names.test.js:233-247` | **Asserts `driverDealIds.size() > 1` and `multi_product_sequence_ambiguous` must still exist**, commenting that "neither side may be 'fixed' to auto-pick a driver Deal" |
| `booking/tests/booking.test.js:37-60` | `pickProductDeal` fixtures |
| `zoho-functions/tests/pipeline_mapping_contract.py:3` | A line-for-line mirror of `_util_pipelineForProductKey.deluge` |
| `booking/tests/integrations.test.js`, `db/meeting-only.test.js`, `db/dispatch.test.js`, `db/worker.test.js`, `meeting-title-source.test.js`, `frontend.test.js` | Incidental Product-Deal fixtures |

These will fail when the model is corrected. **That is the intended signal**, and it is why the
correction cannot be quietly partial. They must be *inverted* into §14 guards, not deleted.

### (e) Asserts Product-Deal as the CURRENT INTENDED architecture — **was ~145 · now 0 unlabelled**

Every member of this category has been bannered. The clusters were:

| Cluster | Occurrences | Treatment |
|---|---|---|
| `docs/v6/zoho_v6_refactor_spec_pack/` (10 files) | 86 — **the largest, and the origin** | SEALED: `SUPERSEDED.md` + per-file banner; `08_coding_agent_prompt.md` marked *do not re-run* |
| `docs/SALES_GUIDE.md` | §2, §3, §7, §9 | KNOWN-DRIFT banner — highest behavioural blast radius, trains humans |
| `docs/MEETING_CRUD_GUIDE.md` | §2, §5, §9, §11 | KNOWN-DRIFT banner; Who/What pairing affirmed as correct |
| `zoho-functions/README.md` | L5, L18, L79–81 | KNOWN-DRIFT banner |
| `docs/v6/FLOW_REFERENCE.md` | L3–8, L11–12, L16 | KNOWN-DRIFT banner |
| `booking/docs/architecture.md:141-158` | **the strongest single conflict** — argues the alternative "would break HARD RULE 7" | Second, narrower banner |
| `booking/jurnii-booking-database-backend-spec.md` | L77, 80, 99, 446, 641 — all inside *boundary* clauses | Terminology banner; boundary clauses affirmed correct |
| `docs/v6/PHASE3_A_E_R_LIFECYCLE_SCOPE.md` | L5, 10, 20, 52, 80, 91 | RE-SCOPE banner (never coded) |
| `docs/v6/FINAL_CANONICAL_FIELD_MATRIX.md` | L52–53, 66, 123 | Three rows marked superseded |
| `docs/v6/ACTIVATION_GATE_TEST_PLAN.md:56` | AG-N1 precondition | Banner: one line changes, one §14.13 case added |
| `docs/FIELD_REUSE_NOTES.md` | L15, 20, 22, 140 | HISTORICAL banner |
| `docs/v6/full-flow.mermaid` | L10, 24, 28 | `%%` drift note |
| `docs/V6_FIELD_VALIDATION_MATRIX_2026-08-15.md` | Settled rulings sourcing Activity snapshots from the Deal | **CORRECTED banner** — retention stands, source superseded |
| `docs/V6_DIAGNOSIS_BRIEFING_2026-08-15.md:60` | An owner-facing acceptance criterion that would fail a correct build | Corrected in banner |

### (f) Executable code implementing it — **the implementation sprint, not this pass**

**~290 occurrences.** Unchanged by this pass by design — no executable file was modified.

**Deluge (`zoho-functions/v6/`), by density:**

| File | Occurrences |
|---|---|
| `processDeal.deluge` | 55 |
| `processContact.deluge` | 33 |
| `processLead.deluge` | 30 |
| `activity/_util_createOrReuseProductDeal.deluge` | 24 — **the single entry point for the invariant** |
| `processAccount.deluge` | 22 |
| `activity/_util_rollupAccountState.deluge` | 13 |
| `activity/handleMeetingEvent.deluge` | 11 |
| `activity/sendSequencedEmail.deluge` | 9 |
| `activity/_util_collectProductEvidence.deluge`, `_util_resolveDealPipeline`, `_util_pipelineForProductKey`, `_util_resolveManualReviewCode`, `routeContactSequence`, `createManualReview`, `_util_applyQuoteLifecycle`, `_util_buildQuoteSubject`, `_util_computeProductKey`, `_util_resolveDealProduct`, `_util_normalizeToProductQuoteTuples`, `createAuxTask`, `handleCallOutcome`, `handleTaskCompletion` | 1–8 each |

**Booking Node:** `integrations/zoho/index.js:467` (`resolveProductDeal`); `api/_utils/products.js:92,
195-209` (`pickProductDeal`); `api/v1/bookings/index.js:25`; `workflows/zoho-ops.js:636-642`;
`workflows/manual-review.js:34-35`; `workflows/operator-actions.js:241`; `db/queries/review.js:27`;
`assets/booking-form.js:1610`; `scripts/e2e-booking.js:394, 508`; `tests/fixtures/zoho-fields.json:427-428`.

⚠ Four Deluge files carrying (f) occurrences are among the 7 uncommitted, unpublished edits. **None was
read for edit and none was modified by this pass.**

---

## §12.4 completion test

> *"No current-authority statement defines a Deal by Product."*

**PASS**, with the scope correction recorded in the authority map: §12.3's paths resolve under
`zoho-functions/`, not the repository root. Running the test against the root would have passed
vacuously while leaving every intended file unchanged.

Specifically:

- Every document classed CURRENT AUTHORITY or CURRENT IMPLEMENTATION REFERENCE either contains no
  Product-Deal claim, or carries a banner stating the claim describes current code and is **not** the
  target.
- Every OBSOLETE document is sealed and marked never-re-execute.
- Every HISTORICAL document is dated and preserved unedited.
- **No current-behaviour documentation was rewritten to claim the code already implements the target
  model.** That prohibition (§12.3) was the governing constraint on this pass.

## What this pass did NOT resolve

1. **Category (d) is still zero.** Writing the §14 guards is implementation work.
2. **All 290 (f) occurrences remain.** The code is unchanged.
3. **All 30 conflict-ledger rows still answer "Yes" to *does the code implement it*.** Documentation
   reconciliation cannot change that column.
