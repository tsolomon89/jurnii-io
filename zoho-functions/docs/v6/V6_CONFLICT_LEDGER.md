# v6 Conflict Ledger

**Created:** 2026-08-17 · **Marker:** `jurnii-doc-reconciliation-2026-08-17`
**Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)

Every repository statement that conflicts with the authoritative model, with its correction and — the
column that matters — **whether the code still implements the previous claim.**

**The ledger's single most important finding: the answer is "Yes" on all 30 rows.** Not one of these is
merely stale prose. Every conflicting statement is an accurate description of live, executing code.
Documentation reconciliation therefore cannot resolve any of them; it can only stop them being read as
approved intent. The code corrections are tracked in the v6 correction plan.

---

## Ledger

| # | File + section | Previous claim | Corrected claim (authority §) | Code still implements it? |
|---|---|---|---|---|
| 1 | `zoho-functions/README.md:18` | A Deal is always `Account × Product`; `Deal_Key = accountKey::productKey` | One Account → zero or one persistent Deal; `Deal_Key` is Account-scoped (§6.3) | **Yes** — `_util_createOrReuseProductDeal:61` composes it; `processDeal:1900-1906, 2105-2118` stamps it |
| 2 | `zoho-functions/README.md:79-81` | `processLead` creates one Product Deal per product; `processContact` activates only on exactly one B2B Deal; `processAccount` elects one canonical Deal per product key | Conversion resolves the Account's single Deal; several Products create several **Quotes**; activation is Contact-scoped and Product-count-independent (§4.2, §5.4, §14.4) | **Yes** — `processLead:588-648`, `processContact:265-360`, `processAccount:124-217` |
| 3 | `docs/v6/FLOW_REFERENCE.md:3-8` ("## Current Architecture") | One canonical open Deal *per product key* under an Account | One persistent Deal per Account, not per product key (§6.2) | **Yes** — `processAccount:70-163` groups and dedupes **by `Deal_Product_Key`** |
| 4 | `docs/v6/FLOW_REFERENCE.md:11-12` | `Deal.Opportunity_Stage` rolls up from the furthest-progressed open Contact **and is the stage authority** | `Contacts.Stage` is the authority; the Deal value is a derived roll-up with no independent lifecycle (§5.1, §6.3) | **Yes** — `processDeal:2251` is the sole writer with never-regress + RTP floor; 9 read sites gate on it |
| 5 | `docs/SALES_GUIDE.md:40-41, 53, 115, 121, 133` | "If someone wants two products, you get two Deals. **This is normal and correct.** One Deal per product, per Account." | Several Product interests create several **Quotes** under one Deal (§7.5, §14.4). Two live Deals on one Account is the defect | **Yes** |
| 6 | `docs/SALES_GUIDE.md:484` | `[multi_product_sequence_ambiguous]` — a rep must choose which Deal drives the sequence | Several Products or Quotes under the Deal do **not** make the Contact sequence ambiguous (§5.4); the code should not exist | **Yes** — `processContact:356`; registered at `_util_resolveManualReviewCode:37` |
| 7 | `docs/SALES_GUIDE.md:483` | `[quote_product_mismatch]` — more than one product on one Deal is a data error | Several Quote Products under one Deal are **valid**; treating that as a mismatch is forbidden (§7.5) | **Yes** — `processDeal:1931-1949` raises it and refuses to stamp `Deal_Product`/`Deal_Key` |
| 8 | `docs/SALES_GUIDE.md:366` | A Draft scaffold Quote for every open **Product** Deal | A Quote is the Product instance under the Account's one Deal; scaffolding is per Product-interest (§7.2) | **Yes** — `processDeal:1642-1658` (§8z scaffold) |
| 9 | `docs/MEETING_CRUD_GUIDE.md:61, 468` | "`Who_Id` = the Contact and `What_Id` = the **Product Deal**. Both. Every time." | `Who_Id` = Contact opportunity, `What_Id` = the Account's single Deal (§8.1). **The pairing is right; "Product" is wrong** | **Yes** — `handleMeetingEvent:458-560` reconciles "remaining Product Deals" beyond the anchor |
| 10 | `docs/MEETING_CRUD_GUIDE.md:330-331, 399-400` | A multi-product booking anchors on one Product Deal; the rest raise `[product_unresolved]`/`[duplicate_product_deal]` | One Deal, several Quotes — no anchoring problem exists (§7.2) | **Yes** — `handleMeetingEvent:485-560`; mirrored in Node at `zoho-ops.js:639-642` |
| 11 | `docs/MEETING_CRUD_GUIDE.md:91, 168, 308` | `Meeting_Task_Pipeline` ← `resolveDealPipeline(dealId)` resolved **from `Deal_Product_Key`** | `*_Task_Pipeline` = the Deal **relationship** Pipeline at raise (§8.3). Pipeline is not a function of Product | **Yes** — `_util_resolveDealPipeline:32-33` reads `Deal_Product_Key` → `pipelineForProductKey` |
| 12 | `docs/v6/zoho_v6_refactor_spec_pack/` — all 10 files | The **target** model is `Deal = Account × Product`; no Product Deal without a Quote; Account state rolls up across Product Deals | The entire pack is superseded (§12.2). The target is one persistent Account Deal with Quote instances | **Yes** — the pack is what the code implements, function for function |
| 13 | `spec_pack/02_field_schema_and_crud_ownership.md:203` | `Deal_Key = Account_Key + Product_Key` | `Deal_Key` is an Account-scoped deterministic identity (§6.3) | **Yes** — `_util_createOrReuseProductDeal:61` |
| 14 | `spec_pack/01:29`, `05:180-186`, `04:120` | Account state is an aggregate roll-up across Product Deals; the Account closes only when all Product Deals are lost | Account state mirrors its one Deal's roll-up (§6.1, §6.5) | **Yes** — `_util_rollupAccountState:6-9, 41-52, 83` counts "genuine Product Deals" and skips `::active` |
| 15 | `docs/v6/PHASE3_A_E_R_LIFECYCLE_SCOPE.md:10, 20, 52, 91` | Successor Quotes live on the SAME **Product** Deal; `Quote_Product = Deal_Product`, canonical, never a variant | Successor Quotes live on the Account's one Deal; the Quote's Product is its own (§7.2, §7.4) | **Yes** — `_util_applyQuoteLifecycle:28, 44` reads `deal.get("Deal_Product")` to set the successor's product |
| 16 | `docs/v6/FINAL_CANONICAL_FIELD_MATRIX.md:52-53, 66` | `Deals.Opportunity_State/Status/Stage/Opportunity_Stage` are the "Deal commercial lifecycle" and "Commercial ontology" | Deal opportunity fields are **derived summaries** with no independent lifecycle (§6.3); the ontology lives on the Contact (§5.1) | **Yes** — `processDeal:2227-2258` writes them as an autonomous lifecycle with its own never-regress floor |
| 17 | `docs/v6/FINAL_CANONICAL_FIELD_MATRIX.md:123` | The nine Activity mirrors are "**Deal context** mirrors" | `*_Task_Stage` and `*_Task_Opportunity` snapshot the **Contact** opportunity; only `*_Task_Pipeline` is Deal-sourced (§8.3) | **Yes** — `createAuxTask:135` ← `Deals.Opportunity_Stage`; `handleCallOutcome:193,269`, `handleMeetingEvent:402`, `routeContactSequence:1550`, `processContact:522` ← `Deals.Stage` |
| 18 | `docs/V6_FIELD_VALIDATION_MATRIX_2026-08-15.md:58, 68, 76, 84, 91` (**settled rulings**) | KEEP the three `*_Opportunity` snapshots **as `Deals.Stage` snapshots**; KEEP `Task_Stage` sourced from `Deals.Opportunity_Stage`; `Deals.Opportunity_Stage` is the "Canonical ontology field" | **The retention verdicts stand — all nine snapshots are kept.** The *source* changes: Stage and Opportunity from the **Contact**, Pipeline from the **Deal** (§8.3). `Deals.Opportunity_Stage` is a derived roll-up, not the ontology | **Yes** — same 5 write sites as row 17. **Measured: 35 of 182 live Tasks carry an `Task_Opportunity` value that is wrong under §8.3** |
| 19 | `docs/V6_DIAGNOSIS_BRIEFING_2026-08-15.md:60` (Phase-C acceptance) | Assert `Meeting_Task_Opportunity == Deals.Stage` after retro-link | Assert it equals the Contact opportunity's classification at Event creation, and that it does **not** change on later advancement (§14.9, §14.11) | **Yes** — `handleMeetingEvent:402`, and unguarded, so it re-stamps on every save |
| 20 | `docs/FIELD_REUSE_NOTES.md:15, 20, 140` | `Deals.Opportunity_Stage` is the stage value; Stage Rank always recomputed from it | Granular Stage authority is `Contacts.Stage` (§5.2); the Deal value is a derived roll-up | **Yes** — `processDeal:2251` + stage-rank maps throughout |
| 21 | `docs/v6/full-flow.mermaid:10, 24, 28` | The Deal node carries "Opportunity state/stage"; `processDeal` performs per-Product Quote upsert | The Contact carries opportunity state/stage; the Deal node is a roll-up (§2, §5.1). *Per-Product Quote upsert is correct and stays* | **Yes** |
| 22 | `docs/v6/ACTIVATION_GATE_TEST_PLAN.md:56` | AG-N1 precondition: a Decision-Maker Contact **with a Product Deal** | A Contact opportunity under the Account's Deal; Product count is irrelevant to activation (§5.4) | **Yes** — `processContact:314-360` gates activation on exactly one driver Product Deal |
| 23 | `booking/docs/architecture.md:141-158` (post-banner, current authority) | Multi-product bookings **must** defer activation to a human; auto-picking a driver Deal "would break HARD RULE 7" | Several Products must **not** make the Contact sequence ambiguous (§5.4). HARD RULE 7 is correct; deriving ambiguity from Product *count* is the violation | **Yes** — `processContact:348-360`, and **pinned by a test** at `booking/tests/zoho-field-names.test.js:233-247` |
| 24 | `booking/docs/architecture.md:161, 213` | The Meeting links "the exact Product Deal" when exactly one matching open Deal exists | The Meeting links the Account's one Deal as `What_Id` (§8.1); exact-match resolution becomes unnecessary | **Yes** — `booking/integrations/zoho/index.js:467`; `api/_utils/products.js:195-209`; `workflows/zoho-ops.js:639` |
| 25 | `booking/jurnii-booking-database-backend-spec.md:77, 80, 99, 446, 641` | Zoho owns "Account × Product Deal logic"; Node must not duplicate it | Zoho owns Account→Deal and Product→Quote logic. **The boundary statement is right; the entity name is wrong** (§7.1) | **Yes** — Node resolves Product Deals in three places (row 24) |
| 26 | `docs/V6_DELUGE_FIELD_AUDIT_2026-08-10.md:41, 70, 77-78, 245-260` | `Deal_Key`, `Deal_Product`, `Deal_Product_Key` are live canonical Deal fields with named writers | `Deal_Product`/`Deal_Product_Key` **RETIRE**; `Deal_Key` **REDEFINE**. No field is deleted until every writer is removed and published (§10, §13) | **Yes** — the writer inventory is accurate; only its status label is stale |
| 27 | `docs/AUDIT_QUESTIONS_v6_booking_2026-08-10.md:333-334` | Open question: how common is the two-product Contact that gets `[multi_product_sequence_ambiguous]` and no activation? | **Moot** under the corrected model — Product count never blocks activation (§5.4) | **Yes** |
| 28 | `booking/tests/zoho-field-names.test.js:233-247`; `booking/tests/deluge-multi-product.test.js` (whole file) | Executable assertions that the fan-out, the `Deal_Key:equals` lookup, the `duplicate_product_deal` review and the multi-driver guard **must remain** | These invert into §14 acceptance tests (14.1, 14.4, 14.13). **Today they are the only executable statement of architecture in the repo, and they state the prohibited one** | **Yes** — and they will fail on correction, which is the intended signal |
| 29 | `zoho-functions/tests/pipeline_mapping_contract.py:3` | A line-for-line mirror contract of `_util_pipelineForProductKey.deluge` | Pipeline is a Deal relationship property, not a function of the Product key (§6.3, §8.3) | **Yes** |
| 30 | `booking/db/migrations/0004:69`, `0005:30` | Column comments: "the first element resolves the product Deal"; "anchors on ONE Product Deal" | Correct via a **new** migration comment — never by editing an applied migration | **Yes** (comments only; no schema dependency on the model) |

---

## Rows requiring more than a documentation change

**Row 18 — not a new owner decision.** The 2026-08-15 matrix recorded settled owner rulings that
justified the Activity snapshots as *Deal* context. The authoritative model already settles this
differently, so no fresh ruling is needed. The correct reading:

> **All nine Activity context snapshots are kept.** `Calls.Call_Task_Stage` does **not** retire — zero
> readers and zero records do not negate its owner-approved bookkeeping meaning. Only the **source**
> changes: Stage from the Contact, Opportunity classification from the Contact, Pipeline from the Deal.

**Row 19 — an acceptance criterion that would fail a correct implementation.** Corrected in place in the
briefing's banner. It must not be run as written.

**Row 23 — the strongest conflict in the repository.** It does not merely describe the pattern; it argues
that the alternative *"would break HARD RULE 7"*. And it is **pinned by an executable test**, so the
documentation, the code and the test suite all assert the violation together.

**Row 28 — zero category-(d) tests exist.** See the residual-search report. There is no executable guard
for any §14 invariant, and the tests that touch the architecture assert its opposite.

## Live measurements taken while building this ledger (2026-08-17, read-only)

| Fact | Value |
|---|---|
| Accounts holding more than one Deal | **17 of 75** (13 × two, 4 × three) → 21 Deals to retire |
| Deals with a product-scoped `Deal_Key` | **96 / 96** — zero `::active`, zero blank |
| `Deals.Deal_Key` uniqueness | **UNIQUE, case-insensitive** in live metadata — this both enforces §14.1 after the change *and* blocks in-place rekeying before the merge |
| Accounts whose live Deals span more than one Pipeline | **0** (87 B2B / 9 Partnership, cleanly separated) |
| `Deals.Pipeline` readable over COQL | **96 / 96 populated** — contradicting `_util_resolveDealPipeline:11-13`'s claim that native/REST/COQL all return it blank |
| Tasks whose `Task_Opportunity` is wrong under §8.3 | **35 of 182** — every case the Deal's RTP floor promoting ahead of the Contact |
| `Deals.Deal_Primary_Contact` | **0 / 96 populated, 0 writers** — three readers that all fall through to `Contact_Name` |
| Events carrying a `What_Id` | **0 of 156** — no Event has ever been linked to a Deal in production |
