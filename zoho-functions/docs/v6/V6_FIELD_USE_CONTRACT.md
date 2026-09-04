# v6 Field-Use Contract

**Created:** 2026-08-17 · **Marker:** `jurnii-doc-reconciliation-2026-08-17`
**Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)
**Supersedes on field classification:** `../../../docs/V6_FIELD_VALIDATION_MATRIX_2026-08-15.md` and
`FINAL_CANONICAL_FIELD_MATRIX.md`

Every field read or written by Deluge, workflows, booking, integrations, formulas, tests, native Zoho
mechanics, or a known reporting dependency — judged against the authoritative commercial model.

## Retention rule (owner-set)

> A field stays only when it supports demonstrated automation, bookkeeping, reporting, user operation,
> historical context we intend to report on, or an independent business fact in the CRM ontology.
> **A possible future use is not enough.**

## Classifications

| Class | Meaning |
|---|---|
| **KEEP — core business fact** | An independent fact in the ontology. Not reconstructable, or reconstructable only with loss. |
| **KEEP — automation control** | Load-bearing for automation, workflows or idempotency. |
| **KEEP — immutable reporting snapshot** | Historical context at the moment of writing; destroyed if not stored. |
| **KEEP — integration identifier** | Correlation key across a system boundary. |
| **KEEP — required native mirror** | Zoho platform mechanics (mandatory, native reporting, subform). |
| **REDEFINE / MIGRATE** | The field stays; its **meaning or source** changes. |
| **RETIRE** | Remove — writers first, published, verified, then delete. |
| **UNRESOLVED** | Blocked on a named verification. Must not be deleted or relied upon. |

**Reconstructability legend:** `No` = destroyed once written · `Yes(src)` = derivable without loss ·
`Lossy` = derivable with known divergence.

## Evidence status

| Source | Status |
|---|---|
| Live COQL `SELECT` and `GET /settings/fields?type=all`, 2026-08-15 → 2026-08-17 | **CONFIRMED** |
| Deluge source, 39 `.deluge` files (7 uncommitted, read only, never modified) | **CONFIRMED** |
| Booking source + `booking/tests/zoho-field-names.test.js` `WRITTEN` map | **CONFIRMED** |
| Workflow-rule criteria (WF001a–WF021, WFC-SchedEmail) | ✅ **CONFIRMED 2026-08-17 — blocker B5 is CLOSED.** The workflow REST surface *is* reachable. All 18 rules read individually, both `execute_when.details.criteria` **and** `conditions[].criteria_details.criteria`. See [`V6_CRUD_PLAN.md`](V6_CRUD_PLAN.md) §2. **Headline: no live rule binds any of `Deal_Product`, `Deal_Product_Key`, `Deal_Key`, `Blocks_Sequence`, `Reminder_Send_At`, `Commercials_Status`, `Commercial_Outcome`, or any of the nine Activity snapshots.** The only rule-blocked retirement candidate org-wide is `Deals.Next_Comm_Follow_Up_Date` via WF010d |
| Reports / Dashboards / Analytics / layouts / validation rules / blueprints | **UNVERIFIED — no API surface.** `../../../docs/V6_MANUAL_DEPENDENCY_CHECKLIST.md` is a hard gate on every RETIRE row. |

**Function abbreviations:** `pA` `processAccount` · `pC` `processContact` · `pD` `processDeal` ·
`pL` `processLead` · `hME` `handleMeetingEvent` · `hCO` `handleCallOutcome` · `hTC` `handleTaskCompletion` ·
`hQSC` `handleQuoteStageChange` · `rCS` `routeContactSequence` · `sSE` `sendSequencedEmail` ·
`sCFU` `sendCommercialFollowUp` · `sDR` `sendDemoReminder`

---

## 1. What the model changes versus the 2026-08-15 matrix

**17 verdicts change.** The matrix judged 36 fields *inside* the Product-Deal architecture. Its
conclusions survive almost entirely for the Contact/Activity sequence family — that family was never
Product-scoped — and largely fail for the Deal identity family.

Three findings drive most of the change:

**1 · `Deals.Deal_Key` is declared UNIQUE (case-insensitive) in field metadata — but the live org does
NOT enforce it.** ⚠ **CORRECTED 2026-08-18.** Deals `991103000003645011` and `991103000003655003`
(Account `991103000003656001`, Jurnii E2E Ltd) **both carry `jurnii-e2e.dev::jurnii_360`**. All four
orchestrators assert the constraint in their headers as a *"REQUIRED ZOHO CRM SETTING"*; that assertion
is **false as a live guarantee**.

**Consequence — this reverses an earlier planning assumption.** An earlier version of this contract
stated the constraint would *"mechanically enforce one-Deal-per-Account"* and would *"block in-place
rekeying"*. **Neither can be relied on.** One-Deal-per-Account must be enforced in **code** — resolve,
then re-search after insert and collapse any duplicate — not by trusting the field property. The
duplicate pair above is live proof that a concurrent or REST-path insert slips past it.

*(The most likely producer is `processLead:252`, a bare 3-argument `updateRecord` on
`Leads.Contact_Role1` with no trigger suppression, which re-enters WF001a — `create_or_edit`,
`repeat=true`, no criteria — on the very Lead being converted.)*

**2 · `Deals.Pipeline` is readable after all.** `_util_resolveDealPipeline.deluge:11-13` claims the field
is "UNREADABLE inside the Deluge runtime (verified 2026-07-16: native/REST/COQL all return it blank)".
**COQL returned it populated on 96/96 Deals — B2B 87, Partnership 9.** The blanket claim is false for
REST/COQL; it may still hold for `zoho.crm.getRecordById` (**UNVERIFIED**). This unblocks retiring the
whole Product→Pipeline helper chain, previously the hardest dependency on `Deal_Product_Key`.

**3 · The nine Activity context snapshots are the largest semantic conflict — and all nine are KEPT.**
See §5. Measured: **35 of 182 live Tasks carry a `Task_Opportunity` value that is wrong under §8.3.**

---

## 2. Deals

| Label | API name | Type | Semantic fact | Authoritative module | Ownership | Readers | Writers | Workflow deps | Reporting / integration deps | Reconstructable? | Native mirror | Live population | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Deal Key | `Deal_Key` | text, **unique ci** | Deterministic Deal identity. Today `accountKey::productKey` | **Deal** (§6.3 Account-scoped) | automation | `pA:98,106`; `pD:2107`; `_util_rollupAccountState:46,52`; `hME` | `_util_createOrReuseProductDeal:97,130`; `pA:159`; `pD:2107` | none known (UNVERIFIED) | booking `WRITTEN.Deals` | Yes(`Accounts.Account_Key`) once Product is dropped | none | 96/96, **all contain `::`**, 0 `::active` | ⚠ **REDEFINE / MIGRATE** |
| Deal Product | `Deal_Product` | lookup → Products | Which Product this Deal *is* | **none** — §7.1 forbids direct Product-to-Deal identity | automation | `_util_applyQuoteLifecycle:44`; `_util_collectProductEvidence:100`; `_util_rollupAccountState:48`; `pA:110`; `pD:454,1658,1910,2116` | `_util_createOrReuseProductDeal:99,132`; `pD:2118` | none known | booking `WRITTEN.Deals` | Yes(`Quotes.Quote_Product` 125/125; `Quoted_Items` 125/125) | none | 96/96 | ⚠ **RETIRE** |
| Deal Product Key | `Deal_Product_Key` | text | Product key **and** de-facto runtime Pipeline source | **none**; the Pipeline fact belongs to §6.3 | automation | `_util_resolveDealPipeline:32`; `pD:100,113,451,1908,2112`; `pA:99,107`; `_util_rollupAccountState:47`; `hME:485`; `sSE:265`; `_util_collectProductEvidence:102,148` | `_util_createOrReuseProductDeal:98,131`; `pD:2112` | none (INHERITED) | booking `WRITTEN.Deals` | Yes(`Deals.Pipeline`) for the pipeline half; the Product half has no model home | none | 96/96 — ux 65, 360 18, partnership 9, cortex 4 | ⚠ **RETIRE** — gated on repointing pipeline resolution |
| Deal Name | `Deal_Name` | text, mandatory | Human name. Today `"{Account} - {Product}"` | **Deal** | automation | **`booking/integrations/zoho/index.js:470-482`** substring-matches the Product name inside it to pick a Meeting's `What_Id` | `_util_createOrReuseProductDeal:95,129`; `pA:160`; `pD`; `_util_applyQuoteLifecycle` | none | **HARD integration dep** — booking Meeting routing | Yes(`Accounts.Account_Name`) | native | 96/96, **all contain `" - "`** | ⚠ **REDEFINE / MIGRATE** |
| Opportunity Type | `Stage` | picklist native, mandatory, `MQL/SQL/FTP/RTP` | Rolled-up opportunity classification | **Contact** (§5.2); Deal holds a derived roll-up (§6.3) | automation | `createAuxTask:135`; `pC:522`; `hCO:193,269`; `hME:402`; `rCS:1550,1665`; `sSE:402,424`; `pD:367,2255` | `pD:2253,2259`; `_util_createOrReuseProductDeal:137` | none direct (INHERITED) | `WRITTEN.Deals` | Lossy(max rank of Contact Stages + RTP floor) | native `Stage` **labelled "Opportunity Type"** — the highest-value naming inversion in the org | 96/96 — SQL 42, RTP 29, FTP 13, MQL 12 | ⚠ **REDEFINE / MIGRATE** — must stop being the source for the three `*_Task_Opportunity` snapshots |
| Opportunity Stage | `Opportunity_Stage` | picklist custom, legacy actuals | Rolled-up 8-stage summary | **Contact** (§5.1 granular Stage); Deal roll-up permitted (§6.3) | automation | `sCFU:30`; `hTC:948`; `_util_rollupAccountState:61`; `pD:369,373,2255`; **`createAuxTask:135` → `Task_Stage`** | `pD:2251` — sole writer, `if(currentRank<floorRank)` | layout only (INHERITED) | — | Lossy(max Contact Stage + RTP floor) | none | 87/96 | ⚠ **REDEFINE / MIGRATE** — **not** "the canonical ontology field" |
| Opportunity State | `Opportunity_State` | picklist `Open/Won/Lost` | Deal viability | **Deal** (§6.5) | automation | 11 sites incl. `pD:2308` Amount override, `pA:116` dedupe scope, `_util_rollupAccountState:57`, `pD:1656,2517`, `sCFU:39` | `pD:2227,2234,2242`; `_util_applyQuoteLifecycle:285`; `_util_createOrReuseProductDeal:108,133`; `pA:149`; `pL:649`; `rCS:1114` | none (INHERITED) | booking `products.js:201` is dead code | No | none | 96/96 — Open 95, Lost 1 | **KEEP — core business fact** |
| Opportunity Status | `Opportunity_Status` | picklist `Open/Working/Closed` (displays New/Working/Closed) | Derived work state | **Deal** (§6.3) | automation | `pD:2520` → `Accounts.Status` — the sole behavioural gate | `pD:2243`; `_util_createOrReuseProductDeal:109,134` | none (INHERITED) | — | Lossy(`dealAnyContactWorking`) | none | 96/96 — Working 82, New 13, Closed 1 | **KEEP — automation control** |
| Deal Primary Contact | `Deal_Primary_Contact` | lookup custom | Intended primary-Contact pointer | §6.4 explicitly forbids a duplicate concept | **neither — 0 writers** | `createManualReview:39`, `hME:573`, `_util_applyQuoteLifecycle:55` — **all three fall through to `Contact_Name` on the next line** | **none** | none | backs the empty `Contact_Primary_Deal` related list | Yes(`Contact_Name`) | none | **0/96** | **RETIRE** |
| Contact Name | `Contact_Name` | lookup native | The currently leading Contact opportunity | **Deal** (§6.4 "the existing canonical lookup") | automation | 12+ sites | `pD`, `pL`, `_util_applyQuoteLifecycle`, booking | none (INHERITED) | `WRITTEN.Deals` | Lossy(selection function) | native | 96/96 | **KEEP — core business fact** |
| Opportunity Pipeline | `Pipeline` | picklist native, mandatory, `B2B/Partnership` | Relationship pipeline | **Deal** (§6.3) | automation | **none in Deluge** — believed unreadable | `_util_createOrReuseProductDeal:105,136` (REST insert for Partnership) | mandatory field | `WRITTEN.Deals` | Today Yes(`pipelineForProductKey`) — that derivation dies | native | **96/96, readable over COQL — contradicts `_util_resolveDealPipeline:11-13`** | ⚠ **REDEFINE / MIGRATE** |
| Amount | `Amount` | currency native | Deal value | **Quotes** (§6.5, §7.5) | automation | `pD` | `pD` §8b | none | Zoho forecasting (UNVERIFIED) | Partly — `quote_sum` yes; the tier fallback comes from **Account tier**, not Quotes | native | 79/96. **51/96 carry a bare tier fallback = £878,500 of £1,534,051 headline (57.3%)** | ⚠ **REDEFINE / MIGRATE** |
| Company Tier | `Company_Tier` | picklist `1/2/3` | Cache of the Account tier | **Account** (§6.1) | automation | **0 behavioural readers** — `pD:2295` reads it only to decide whether to refresh the cache; pricing reads `accRec.Company_Tier` live | `pD:2298`; `pL` | none known | — | Yes(`Accounts.Company_Tier`) | none | 94/96 | ⚠ **RETIRE** — a cache of a safely derivable value with no reader |
| Contract Current/Initial Plan Products · Plan Type · Plan Brands | `Contract_Current_Plan_Products`, `_Plan_Type`, `_Plan_Brands`, `Contract_Initial_*` | multiselect / picklist / integer | Contract plan mirrors | **Quotes** (§7.2) | automation | **0** | `pD` | none known | — | Yes — earliest/latest Closed-Won Quote reproduces them, and the Deal copy is **lossier** (`_Plan_Type` null, `_Plan_Products` empty on every Deal sampled) | none | populated but lossy; `Contract_Initial_Plan_Products` carries the typo option **"Jurnii Cortext"** | **RETIRE** *(settled)* |
| Contract Current/Initial ACV · Date Start · Date End | `Contract_Current_ACV`, `_Date_Start`, `_Date_End`, `Contract_Initial_*` | currency / date | Current and initial contract terms | **Quotes** (§7.2) | automation | `pD` | `pD` | none known | likely Reports (UNVERIFIED) | Yes(earliest/latest Closed-Won Quote) | none | populated | ⚠ **UNRESOLVED — blocker B2.** Once one Deal spans several Products, a single "current contract" pair is semantically undefined |
| Lost Reasons | `Lost_Reasons` | picklist custom, 12 options incl. `Duplicate / Test Record` | Scoped loss command | **Deal** (§10 keep-list) | user + automation | `pD` viability guard | `pA:154`; `pD`; `_util_applyQuoteLifecycle`; `pL` | none known | — | No | pairs with native `Reason_For_Loss__s` | 1/96 | **KEEP — core business fact** |
| Reason For Loss | `Reason_For_Loss__s` | picklist **native** | Zoho stock loss reporting | native | user | `pD` | none since 2026-08-11 | none | native loss reports | n/a | **is** the native mirror | 0/96 | **KEEP — required native mirror** |
| Automation Suppressed | `Automation_Suppressed` | boolean | Per-Deal automation kill switch | **Deal** (§6.3) | user | `hEE`, `pD`, `sCFU`, `sDR` | none | WF010c / WF010d guards (INHERITED) | — | No | none | 96/96 | **KEEP — automation control** |
| Demo Reminder Send At | `Demo_Reminder_Send_At` | datetime | WF010c date trigger | **Deal** | automation | WF010c | `hME:439` — deliberately a single-key map | **WF010c date trigger — HARD** | — | No | none | **0/96** — no booking Meeting has entered WF007 | **KEEP — automation control** |
| Closing Date | `Closing_Date` | date native | Zoho forecast date | native | automation | **0** | `_util_createOrReuseProductDeal:111,135` = today+30, never revised | none | Zoho forecasting (UNVERIFIED) | n/a | native | 96/96 — **all meaningless** | **KEEP — required native mirror** ⚠ value is not a real forecast |
| Next Comm Follow-Up Date | `Next_Comm_Follow_Up_Date` | datetime | WF010d date trigger | dormant path | — | none | **none** | **WF010d binds it — delete the RULE first** | — | n/a | none | **0/96** | **RETIRE** *(settled)* |
| DEP - Commercials Status | `Commercials_Status` | picklist | legacy WF004 trigger | — | — | none | none | **WF004 does not exist** | — | n/a | none | **0/96** | **RETIRE** *(settled)* |
| DEP - Commercial Outcome | `Commercial_Outcome` | picklist | legacy | — | — | none | none | none | — | n/a | none | **0/96** | **RETIRE** *(settled)* |
| Description · Lead Source · Account Name · Deal Owner | `Description`, `Lead_Source`, `Account_Name`, `Owner` | textarea / picklist / lookup / ownerlookup | Native mechanics + the Account relationship link | native / §6.3 | mixed | several | `_util_createOrReuseProductDeal:171`; `pL`; `pD` | none | `WRITTEN.Deals` (Lead_Source) | n/a | native | populated | **KEEP — required native mirror**; `Account_Name` is **KEEP — core business fact** |

---

## 3. Quotes

| Label | API name | Type | Semantic fact | Authoritative module | Ownership | Readers | Writers | Workflow deps | Integration deps | Reconstructable? | Native mirror | Live population | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Quoted Items | `Quoted_Items` | **subform native, mandatory** | The real Product relationship + line commercials | **Quote** (§7.4) | automation | `pD`, `hTC`, `_util_matchDraftQuotes`, `_util_applyQuoteLifecycle` | same | — | `WRITTEN.Quotes` | No | — | 125/125; **0 lines lack a Product lookup**; all reconcile on 4 identities | **KEEP — core business fact.** **AUTHORITATIVE for the Product relationship** |
| Quote Product | `Quote_Product` | lookup custom → Products | **Queryable header index** of the line Product | derived from `Quoted_Items` | automation | `_util_matchDraftQuotes:117`; `_util_collectProductEvidence:110,117`; `pD:800,1029,1155,1438,1604,1866,2044`; `hTC:859` | `pD:858,1095,1501,1539,1713`; `hTC:1197`; `_util_applyQuoteLifecycle:191` | — | `WRITTEN.Quotes` | **No** — a subform cannot appear in a COQL `where` or in `searchRecords` criteria | header index over `Quoted_Items` | 125/125 | **KEEP — automation control.** **DERIVED MIRROR, never independently editable.** See §4 |
| Quote Last Deal ID | `Quote_Last_Deal_ID` | text | The Deal this Quote was last reconciled against | **Quote** (§8.5) | automation | `hQSC:37,64` | `hQSC:61,82,96`; `pD:860,1097,1509,1547,1716`; `hTC:1200`; `_util_applyQuoteLifecycle:194` | **WF021 / WF020** | — | **No** — the only record of the *previous* Deal; it is what re-zeros the old Deal's Amount when a Quote moves | none | **125/125, 0 drift vs `Deal_Name.id`** | **KEEP — automation control.** Value *rises* under this model — Quote reparenting is exactly the event it exists for |
| Opportunity Type | `Opportunity_Type` | picklist custom `FTP/RTP` | Quote-level opportunity class | **Contact** (§7.3 attribution) | automation | `_util_matchDraftQuotes:110`; `hTC:849,924`; `pD:802,1996,2601` | `pD:859,1096,1502,1540,1714`; `hTC:1199`; `_util_applyQuoteLifecycle:188` | — | — | Lossy | none | 125/125 — RTP 58, FTP 67 (**not** congruent with `Quote_Type`: only 28 Renewals) | ⚠ **REDEFINE / MIGRATE** — today `FTP unless Deal.Stage == RTP` (`pD:388-390`); must source from the attributed **Contact** |
| Quote Type | `Quote_Type` | picklist `Acquisition/Expansion/Renewal` | Commercial motion | **Quote** (§7.2) | automation | `_util_applyQuoteLifecycle:92,105,152,250`; `pD:855,1440` | `_util_applyQuoteLifecycle:187`; `pD:1503,1541,1710` | — | `WRITTEN.Quotes` | No | none | 125/125 — Acq 93, Renewal 28, Expansion 4 | **KEEP — core business fact** |
| Quote Stage | `Quote_Stage` | picklist native | Quote lifecycle | **Quote** (§7.2) | user + automation | `_util_applyQuoteLifecycle`, `hTC`, `_util_matchDraftQuotes`, `pD`, `_util_rollupAccountState:73`, `sCFU` | same | **WF021 / WF020** | `WRITTEN.Quotes` | No | native | 125/125 — Draft 86, CW 24, CL 5, Negotiation 8, On Hold 2 | **KEEP — core business fact** |
| Contact Name | `Contact_Name` | lookup native | The attributed Contact opportunity | **Quote** (§7.3) | automation | `_util_applyQuoteLifecycle`, `hTC`, `pD` | same | — | `WRITTEN.Quotes` | **No** — §7.3 forbids silently rewriting Closed-Won/Lost attribution | native | **125/125, 0 account-inconsistent; 6 Deals already carry Quotes across >1 Contact** | **KEEP — core business fact** |
| Deal Name | `Deal_Name` | lookup native | The Deal association | **Quote** (§7.2) | automation | `hQSC`, `_util_matchDraftQuotes`, `pD`, `_util_applyQuoteLifecycle` | same | WF021 | `WRITTEN.Quotes` | No | native | 125/125 | **KEEP — core business fact** |
| Account Name | `Account_Name` | lookup native | Account convenience link | derivable Deal→Account | automation | `pD` | `pD`, `hTC`, `_util_applyQuoteLifecycle` | — | `WRITTEN.Quotes` | Yes(`Deal_Name.Account_Name`) | native | 125/125 | **KEEP — required native mirror** |
| Contract ACV · Target ACV · Plan Type · Plan Brands · Plan Frequency · Contract Date Start/End · Date Renewal · Signed Date | `Contract_ACV`, `Quote_Target_ACV`, `Quote_Plan_Type`, `Quote_Plan_Brands`, `Quote_Plan_Frequency`, `Contract_Date_Start`, `Contract_Date_End`, `Quote_Contract_Date_Renewal`, `Contract_Signed_Date` | currency / picklist / integer / date | The structured Quote commercial schema | **Quote** (§7.2, §10 keep-list) | automation, from Activity contract evidence | `pD`, `_util_applyQuoteLifecycle`, `hTC`, `_util_rollupAccountState` | same | — | `WRITTEN.Quotes` (ACV, Target ACV) | No | none | ACV 124/125 · Target 125/125 · PlanType 52 · Brands 51 · Freq 6 · Dates 49 · Signed 24 | **KEEP — core business fact** |
| Quote Applied Activity Keys · Lifecycle Keys | `Quote_Applied_Activity_Keys`, `Quote_Applied_Lifecycle_Keys` | textarea | Idempotency ledgers | **Quote** (§8.5) | automation | `hTC`, `_util_matchDraftQuotes`, `pD`, `_util_applyQuoteLifecycle` | same | — | `WRITTEN.Quotes` | No | none | 117/125 and 37/125 | **KEEP — automation control** |
| Subject · Grand Total · Sub Total | `Subject`, `Grand_Total`, `Sub_Total` | text mandatory / formula ro / formula ro | Native mechanics | native | automation / read-only | `pD` | `_util_buildQuoteSubject` → Subject | — | `WRITTEN.Quotes` | n/a | native | populated. **74/125 have `Grand_Total = 0`, all `Quote_Stage = Draft`** | **KEEP — required native mirror** |

---

## 4. Resolved: `Quote_Product` versus native `Quoted_Items`

Authority §7.4 requires that a header-level `Quote_Product` **prove** a separate purpose beyond the
native subform, and that two fields must not both claim authority. Both tests are now answered.

**The distinct purpose is mechanical and proven.** `Quoted_Items` is a Zoho **subform**. Zoho subforms
**cannot appear in a COQL `where` clause or in `searchRecords` criteria**. Every Quote-matching and
idempotency predicate in the codebase therefore requires a header-level Product lookup:

| Requirement | Site | Would break without a header field |
|---|---|---|
| Draft-Quote matching | `_util_matchDraftQuotes:117` | Cannot filter candidate Quotes by Product |
| Product-evidence collection | `_util_collectProductEvidence:110,117` | Cannot read a Quote's Product without a full record fetch per Quote |
| Quote reconciliation and idempotency | `pD:800,1029,1155,1438,1604,1866,2044` | Deterministic per-Product dedup keys become unbuildable |
| Task→Quote application | `hTC:859` | Cannot select the Quote an Activity's contract evidence applies to |

**The authority split — they are not co-authoritative:**

| Field | Role |
|---|---|
| `Quoted_Items` | **AUTHORITATIVE.** The real Product relationship and all line commercials. |
| `Quote_Product` | **DERIVED technical mirror.** A queryable header index over the subform's single line Product. Written only by automation, at the same moment the line is written. **Must never be independently editable and must never be the source of truth for what a Quote is for.** |

**Contract rules:**
1. `Quote_Product` is written only in the same operation that writes `Quoted_Items`.
2. It must be removed from any rep-facing layout — an editable copy would create a second authority.
3. If they ever disagree, `Quoted_Items` wins and `Quote_Product` is repaired from it.

**⚠ Blocker B3 — UNVERIFIED.** Whether `Quote_Product` agrees with the `Quoted_Items` line Product on all
125 Quotes has not been checked; it needs a per-record read
(`GET /crm/v6/Quotes/{id}?fields=Quoted_Items`). If any disagree, §7.4 is *actively* violated today and
a reconciliation pass is required before `Quote_Product` can be declared a derived index. **Until B3
closes, this row is "KEEP with a verification debt", not "resolved".**

**One-Product-per-Quote is confirmed:** 125 line items across 125 Quotes, every one `Sequence_Number: "1"`.

---

## 5. The nine Activity context snapshots

Authority §8.3, unambiguous:

> `*_Task_Stage` = the **Contact** opportunity's Stage when raised
> `*_Task_Opportunity` = the **Contact** opportunity's MQL/SQL/FTP/RTP when raised
> `*_Task_Pipeline` = the **Deal** relationship Pipeline when raised

### All nine are KEPT. None retires.

**`Calls.Call_Task_Stage` does not retire.** Its zero readers and zero records do not negate its
owner-approved bookkeeping meaning — the Calls module is simply empty. An immutable reporting snapshot
is defined by what it preserves, not by whether anything reads it back yet.

| Module | API name | Type | Current source | Model source | Writers | Readers | Live population | Reconstructable? | Classification |
|---|---|---|---|---|---|---|---|---|---|
| Tasks | `Task_Stage` | picklist, legacy actuals | **split** — `createAuxTask:135` ← `Deals.Opportunity_Stage` ❌; `pC:515` ← `contactStage` ✅; `rCS:1666` ← `nextStage` ✅; `sSE:400,422` ← `stage` ✅ | **Contact** Stage | 5 Deluge + booking | 0 | 150/219 | No | **KEEP** ⚠ **re-source** — repoint `createAuxTask:135` only; the other four are already conformant |
| Calls | `Call_Task_Stage` | picklist, legacy actuals | `hCO:194,270` ← `contactStage` ✅; `rCS:1551` ← `nextStage` ✅ | **Contact** Stage | 3 | 0 | 0/0 — module empty | No | **KEEP — immutable reporting snapshot.** Already conformant |
| Events | `Meeting_Task_Stage` | picklist, legacy actuals | rep or booking; Deluge stamps only if blank (`hME:422`) ✅ | **Contact** Stage + a genuine command | 1 stamp-if-blank + booking `index.js:410` | `hME:80,422` → drives `isCommercial`/`isRenewal`/`isDemo` | 0/156 | No | **KEEP — core business fact.** Dual role: snapshot **and** the meeting-type command |
| Tasks | `Task_Opportunity` | picklist `MQL/SQL/FTP/RTP` | **`Deals.Stage`** ❌ — `createAuxTask:134`, `pC:522`, `sSE:402,424`. ⚠ **CORRECTED 2026-08-17: `rCS:1665` is NOT a `Deals.Stage` writer** — it derives from `stageOpportunity.get(nextStage)`, i.e. the **Contact's** next Stage, with a `deal.get("Stage")` fallback that is unreachable for all 8 known Stage values | **Contact** classification | 4 non-conformant | 0 | 182/219 — RTP 100, MQL 35, SQL 29, FTP 18 | No | **KEEP** ⚠ **re-source** |
| Calls | `Call_Task_Opportunity` | picklist | **`Deals.Stage`** ❌ — `hCO:193,269`. ⚠ **CORRECTED: `rCS:1550` is already Contact-sourced** (same mechanism as above) | **Contact** classification | 2 non-conformant | 0 | 0/0 | No | **KEEP** ⚠ **re-source** |
| Events | `Meeting_Task_Opportunity` | picklist | **`Deals.Stage`** ❌ — `hME:402`, **unguarded, re-stamps on every save** | **Contact** classification | 1 + booking | 0 | 0/156 | No | **KEEP** ⚠ **re-source** + add the `== ""` write-once guard `hME:422` already uses |
| Tasks | `Task_Pipeline` | picklist `B2B/Partnership` | `_util_resolveDealPipeline` ← `Deal_Product_Key` ⚠ | **Deal** Pipeline | 5 | 0 | 182/219 — all B2B, 0 divergences | Yes(`Deals.Pipeline`) | **KEEP** ⚠ **re-source the derivation** (right fact, wrong route) |
| Calls | `Call_Task_Pipeline` | picklist | same ⚠ — `hCO:192,268` **unconditional overwrite** | **Deal** Pipeline | 3 | 0 | 0/0 | Yes(`Deals.Pipeline`) | **KEEP** ⚠ **re-source**; delete the unconditional re-stamp |
| Events | `Meeting_Task_Pipeline` | picklist | same ⚠ — `hME:401`, unguarded | **Deal** Pipeline | 1 + booking | 0 | 0/156 | Yes(`Deals.Pipeline`) | **KEEP** ⚠ **re-source** + write-once guard |

### 5.1 Measured conflict — CONFIRMED

Of 182 Tasks carrying `Task_Opportunity`:

| Comparison | Agreement |
|---|---|
| equals the model value, `CLASSIFY(the Task's own Stage snapshot)` | **147 / 182** |
| equals `Deals.Stage` **now** | 149 / 182 |

**35 live Tasks carry an opportunity classification that is wrong under §8.3.** Every divergent sample
shows the same mechanism: `Task_Stage = Proposal Preparation` (⇒ FTP under §5.2) with
`Task_Opportunity = RTP`, because `processDeal`'s never-regress RTP floor (`pD:2244-2258`) had already
promoted the Deal.

**Do not backfill.** These values are immutable history *under the definition that produced them*. The
redefinition needs a recorded cut-over date, not a data rewrite (§14 invariant 11). *(Moot if the
rebuild path is taken — see `V6_REBUILD_VS_MIGRATE.md`; the wrong values are never re-created.)*

⚠ **Re-source scope corrected 2026-08-17: it is 5 files / 8 write statements, not 9–10.**
`routeContactSequence` is **already conformant** — `rCS:1085` derives the opportunity class from the
Contact's next Stage and only falls back to `deal.get("Stage")` on a branch unreachable for all eight
known Stage values. It needs that fallback **deleted**, nothing repointed. The genuinely
non-conformant writers are `processContact`, `createAuxTask`, `sendSequencedEmail`,
`handleCallOutcome` and `handleMeetingEvent`. See `V6_FUNCTIONAL_SPEC_THREE_FLOWS.md` §B3.

### 5.2 Vocabulary trap the re-sourcing must clear — CONFIRMED live

Authority §5.2's stage table is written in **display** vocabulary. `Contacts.Stage` stores **legacy
actuals**:

| `Contacts.Stage` actual (live) | Model's name | Classification |
|---|---|---|
| `Marketing Consent` | Marketing Consent | MQL |
| `Demo Booking` | Demo Booking | SQL |
| `Demo Booked` | Demo Confirmation | SQL |
| `Demo Attended` | Demo Hosted | SQL |
| `Commercials Sent` | Proposal Preparation | FTP |
| `Commercials Signed` | Commercial Agreement | FTP |
| `Onboarding` | Onboarding | RTP |
| `Renewall` | Renewal | RTP |

`Contacts.Stage`, `Deals.Opportunity_Stage`, `Task_Stage`, `Call_Task_Stage` and `Meeting_Task_Stage`
all use the **left** column. `Tasks.Task_Sequence_Stage` and `Calls.Sequence_Stage` use the **right**
column. `Calls.Sequence_Stage` carries **both — 12 members** (a latent supersede defect; Calls has 0
records, so fix it before the first Call exists).

**Never bulk-migrate between the two spaces.** Writing `"Renewal"` into `Task_Stage` writes a
non-member and would corrupt 132 rows.

The new shared `CLASSIFY()` helper must map from the **actual** space.

---

## 6. Accounts and Products

| Module | Label | API name | Type | Semantic fact | Authoritative module | Ownership | Readers | Writers | Reconstructable? | Live population | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Accounts | Account Key | `Account_Key` | text **unique ci** | Deterministic Account identity | **Account** (§6.1) | automation | `pA`, `pC:92`, `pD`, `pL`, `hME` | same | No | **372/372** | **KEEP — integration identifier** |
| Accounts | State | `State` | picklist `Open/Won/Lost` | Roll-up of Deal viability | **Deal** (§6.1 calls it a derived mirror) | automation | **0 code readers** | **two writers, different scopes** — `_util_rollupAccountState:101` (Lost only when *every* Product Deal is Lost) and `pD:2533,2540` | Yes(`Deals.Opportunity_State`) — **1:1 with zero aggregation left once one Account has one Deal** | 75/372 — Open 74, Lost 1 | ⚠ **RETIRE** |
| Accounts | Status | `Status` | picklist `Open/Working/Closed` (displays New/Working/Closed) | Account work state | **Deal** (§6.1 derived mirror) | automation | **0 code readers** | `pD:2535,2541` | Yes(`Deals.Opportunity_Status`) but it is the only Account-level work surface and is near-universally populated | **371/372** — Working 209, New 159, Closed 3 | ⚠ **REDEFINE / MIGRATE** — declare a derived mirror of the single Deal, **never** a command surface |
| Accounts | Account Status | `Account_Status` | picklist `Prospect/Active Customer/Existing Client/Partner/Churned/Do Not Contact` | Customer-lifecycle classification — **no Deal field carries this fact** | **Account** (§6.1) | automation | 0 in Deluge | `_util_rollupAccountState:102` | Lossy | 75/372 — Active 21, Prospect 53, Churned 1 | ⚠ **RETIRE — reclassified 2026-08-18.** **Write-only**: sole writer `_util_rollupAccountState:102`, **zero readers** in Deluge or booking; the function's own comment at `:104` says it is "currently unused on live Accounts (all null)". Account is company identity; the **Deal** owns relationship state. Fails the retention rule exactly as `Accounts.State` does. **Add no new behaviour to it.** Returns to KEEP only if a reporting or integration consumer is *proven* before the retirement wave |
| Accounts | Company Tier | `Company_Tier` | picklist `1/2/3` | Authoritative pricing input | **Account** (§6.1, §7.5) | user | `pD` §8a2/§8b (live-authoritative), `_util_applyQuoteLifecycle:67` | `pL` | No | 371/372 — T1 91, T2 59, T3 221 | **KEEP — core business fact** |
| Accounts | Contract URL · Contract Renewal URL | `Contract_URL`, `Contract_Renewal_URL` | website | Owner-required reference pointers | **Account** (§10 keep-list) | user | none in code | **none** | No | **0/372 — live email templates merge them 27 and 24 times, so proposal and renewal emails ship an empty link** | **KEEP — core business fact.** The population gap is a separate defect |
| Accounts | Account Source Class | `Account_Source_Class` | picklist, 9 options | Intake source classification | **Account** (§3.1) | automation | 0 | `pL:355,397` ← `Imported_Record_Type` | Yes(`Leads.Imported_Record_Type`) — but the Lead does not survive conversion | **0/372 despite two live writers** | ⚠ **UNRESOLVED** — either the write lands nowhere (off-layout) or `Imported_Record_Type` is always blank. Needs a layout/bin check |
| Accounts | Lost Reasons | `Lost_Reasons` | picklist | Account-level loss reason | **Deal** owns loss | — | none | **none** | Yes(`Deals.Lost_Reasons`) | **0/372** | **RETIRE** |
| Accounts | Account Name · Website · Phone · AOO/Expansion blocks | `Account_Name`, `Website`, `Phone`, `Company_AOO_*` (10 multi-picklists), `Company_Expansion_Regional`, `Company_Expansion_Timeline` | text / website / phone / multi-picklist / boolean / date | Company identity + firmographics | **Account** (§6.1) | user + automation | `pA`, `pC`, `pD`, `pL` | `pL` | No | populated | **KEEP — core business fact** |
| Products | Product Name · Code · Active | `Product_Name` (unique), `Product_Code`, `Product_Active` | text / text / boolean | Catalogue identity | **Product** (§7.1) | user | `_util_resolveDealProduct:54`, `_util_resolveQuoteLinePrice`, `pD`, `hTC`, `_util_matchDraftQuotes`, `_util_applyQuoteLifecycle` | `pD` | No | 10 Products — 4 canonical Active, 6 legacy plan variants inactive | **KEEP — core business fact** |
| Products | Plan Products · Plan Type · Plan Brands | `Product_Plan_Products`, `Product_Plan_Type`, `Product_Plan_Brands` | picklist / picklist / integer | Catalogue family + pricing-matrix inputs; also how `_util_resolveDealProduct` tells a canonical Product from a legacy variant (both blank = "name-only") | **Product** (§7.1) | user | `_util_resolveDealProduct:55,56`; `_util_resolveQuoteLinePrice`; `pD` | none | No | plan variants only | **KEEP — core business fact.** No violation: *customer* plan type lives on `Quote_Plan_Type` |
| Products | Unit Price | `Unit_Price` | currency native | Catalogue list price | **Product** (§7.1) | user | **never read for Amount** — `pD` §8b uses Quote sum or Account tier | none | No | 6 legacy variants only; null on all 4 canonical | **KEEP — core business fact.** Record the §7.5 prohibition in-code |
| Products | Contacts | `Contacts` | multiselectlookup custom | Contact↔Product interest link | **Contact** side is authoritative (§5.1) | automation | `pD`, `hTC` | `pL`, `hTC`, `pD` via `Contacts_X_Products` | n/a | populated | **KEEP — required native mirror.** ⚠ This is the Product-side end of the *same* relationship whose Contact-side end is `Contacts.Products_Linked` — **retiring it destroys the Contact-side evidence too.** Rule: automation writes the Contact side only |

---

## 7. Contacts, Tasks, Calls, Events, Leads, Notes

The 2026-08-15 matrix judged this family correctly and the model **confirms** it — this family was never
Product-scoped.

| Module | API name(s) | Model basis | Live population | Classification |
|---|---|---|---|---|
| Contacts | `Stage` | §5.1 granular opportunity Stage — **the model's central authority**; WF001b0 trigger; 8 live custom views | 647/647 | **KEEP — core business fact** |
| Contacts | `State` | §5.1 | 647/647, all `Open` (`Won` never written) | **KEEP — core business fact** |
| Contacts | `Status` | derived work state; sole behavioural chain → `Deals.Opportunity_Status` → `Accounts.Status` | 647/647 — Working 473, New 168, Closed 6 | **KEEP — automation control** |
| Contacts | `Contact_Role1` | §5.1 decision-making role; WF001b0 trigger. ⚠ **`Contact_Role` is a different field — the junction field on `Contact_Roles`. Do not confuse them.** | 559/647 — DM 283, Influencer 138, End User 138 | **KEEP — core business fact** |
| Contacts | `Products_Linked` | §5.1 Product-interest evidence before instantiation as a Quote | multi-lookup | **KEEP — core business fact** |
| Contacts | `Sequence_State`, `Sequence_Step`, `Sequence_Stage`, `Sequence_Type` | §5.4 outreach sequencing is Contact-scoped | 228 / 1 / 1 / **0** of 647 | **KEEP — automation control** ×4. Label renames settled; `Sequence_Stage` → "Next Activity Type" |
| Contacts | `Sequence_Activated_At` | §5.4; single writer, set-once; `sSE:217` blocks **every** send while blank | **0/647** | **KEEP — automation control** |
| Contacts | `Contact_Completed_*_At` (8 datetime) | Non-reconstructable stage-completion history; feeds `everRTPviaContact` | populated | **KEEP — immutable reporting snapshot** |
| Contacts | `Lost_Reasons` | §10 custom module-specific Lost Reasons | 0/647 | **KEEP — core business fact** |
| Contacts | `Contact_AOR`, `Contact_AOR_*` (5), `Contact_AOR_Brands/Priority_1-3` | §10 Contact AOR note-taking | `Contact_AOR` 73/647 | **KEEP — core business fact** |
| Contacts | `Marketing_Consent`, `Email`, `Phone`, `First/Last/Full_Name`, `Job_Title(_Raw)`, `Lead_Source`, `Lead_Referrer`, `Owner`, `Account_Name` | §3.1 identity | populated | **KEEP — core business fact** / required native mirror |
| Tasks | `Task_Sequence_Stage` | §8.3 final paragraph protects it explicitly: "sequence-scope fields are not duplicates of these snapshots". **Blank = unscoped, blocks at every Stage** | 132/219 | **KEEP — automation control.** **Not** a duplicate of `Task_Stage` |
| Tasks | `Task_Sequence_Managed`, `Task_Type`, `Task_Status` | §8.2 one-field operating model; WFC-SchedEmail criteria (INHERITED) | 219/219 each | **KEEP — automation control** |
| Tasks | `Task_State`, `Task_Sequence_Type` | §8.2 rep command surface | 219/219 · **0/219** | **KEEP — automation control** (user-commanded) |
| Tasks | `Task_Contract_Products/Brands/Date_Start/Date_End/Frequency`, `Task_Lost_Reasons` | §8.4 inputs to Quote reconciliation | **0/219 each — the Quote-from-Activity path has never run** | **KEEP — core business fact** |
| Tasks | `Blocks_Sequence` | Superseded by the computed `isBlockingTask`; 0 readers | 219/219 — Yes 216 / No 3 | **RETIRE** *(settled; rewire + publish first)* |
| Tasks | `Who_Id`, `What_Id`, `$se_module`, `Status`, `Subject`, `Description`, `Due_Date`, `Owner` | §8.1 Contact = `Who_Id`, Deal = `What_Id`, "complementary, not competing" | populated | **KEEP — required native mirror** |
| Calls | `Sequence_Stage`, `Sequence_Managed`, `Sequence_Attempt`, `Call_Task_State`, `Call_Task_Status` | §5.4, §8.2; WF006 criteria (INHERITED) | 0/0 — module empty | **KEEP — automation control** ×5 |
| Calls | `Call_Task_Contract_*` (5), `Call_Task_Lost_Reasons` | §8.4 | 0/0 | **KEEP — core business fact** |
| Calls | `Call_Start_Time`, `Call_Type`, `Outgoing_Call_Status`, `Next_Follow_Up_Date`, `Subject`, `Description`, `Who_Id`, `What_Id` | native mechanics | 0/0 | **KEEP — required native mirror** |
| Events | `Meeting_Task_State`, `Meeting_Task_Status` | §8.2; WF007's only re-entry latch | 0/156 | **KEEP — automation control** |
| Events | `Meeting_Task_Contract_*` (5), `Meeting_Task_Lost_Reasons` | §8.4 | 0/156 | **KEEP — core business fact** |
| Events | `Meeting_Task_Contract_Products` | §8.4 Activity Product evidence — an **input** to Quote reconciliation that "must not choose between several Product Deals" | 0/156 | **KEEP — core business fact.** Becomes *more* correct: with one Deal it feeds Quote reconciliation exactly as prescribed |
| Events | `Reminder_Send_At` | 0 readers anywhere; `Deals.Demo_Reminder_Send_At` + WF010c own scheduling | **0/156** | **RETIRE** *(settled)* |
| Events | `Ext_Calendar_Booking_ID` | booking↔Meeting correlation key | **0/156** — every booking-created Meeting was bulk-deleted 2026-08-10 | **KEEP — integration identifier** |
| Events | `Start_DateTime`, `End_DateTime`, `Event_Title`, `Description`, `Who_Id`, `What_Id` | native + booking-written | populated; **0/156 carry a `What_Id`** | **KEEP — required native mirror** |
| Leads | 27 × `Acquisition_/Expansion_/Renewal_ Quote_*` | §4.1 imported commercial terms needed to initialise Quotes; consumed by `_util_normalizeToProductQuoteTuples` | read-only inputs | **KEEP — core business fact.** Import-adapter surface — hide from rep layouts |
| Leads | `Product_Interest` | §4.1 Product interest ✅ — **but today it also decides how many Deals get created** | populated | ⚠ **REDEFINE / MIGRATE** — evidence for Quote creation only; never Deal fan-out |
| Leads | `Stage`, `Lost_Reasons`, `Contact_Role1`, `Imported_Record_Type`, `Job_Title(_Raw)`, `Lead_Source`, `Lead_Referrer`, `Company*`, `Contact_AOR_*`, `Contact_Completed_*_At`, `Email`, `Phone`, `Website`, `Company_Tier` | §4.1 initial conditions for the Contact opportunity; §10 keeps `Lead_Source = 'Trade Show / Event'` exactly | populated | **KEEP — core business fact** (governed by the owner's 112-label keep-list) |
| Leads | `Deal_Key`, `Account_Key`, `Pipeline`, `Conversion_Outcome` (already labelled `DEP -`) | Lead-level Product-Deal artefacts; §4.2 step 8 leaves no continuing automation dependency on the removed Lead | **empty on every Lead** | ⚠ **RETIRE** |
| Leads | 21 × `Contract_Current_*` / `Contract_Initial_*` / `Contract_Currency` | Mirrors a ledger the Quotes own | **empty on every Lead** | **RETIRE** *(unchanged)* |
| Notes | `Note_Title`, `Note_Content`, `Created_Time` | Opener-variant selection (`_util_resolveOpenerVariant`) | — | **KEEP — automation control** |

---

## 8. Redundancy decisions — the explicit reassessment

Authority §10 requires that a field duplicating safely reconstructable state prove a reporting,
native-platform, integration or historical purpose. Each candidate, with the distinct fact it preserves:

| Field | Distinct fact it preserves | Verdict |
|---|---|---|
| `Accounts.State` | **None.** Once one Account has one Deal it is a 1:1 copy of `Deals.Opportunity_State` with zero aggregation. 0 code readers. Two writers with *different* scopes — a live inconsistency, not a feature | **RETIRE** |
| `Accounts.Status` | **Weak, but real.** Also 1:1 with `Deals.Opportunity_Status`, but it is the only Account-level work surface and is 371/372 populated — near-certain Reports/views dependency | **REDEFINE** — keep as a declared derived mirror; never a command surface. Deletion only after the manual console check |
| `Accounts.Account_Status` | **Yes.** Customer lifecycle (Prospect / Active / Churned / Partner). **No Deal field carries this fact** | **KEEP** |
| `Accounts.Lost_Reasons` | **None.** 0/372, no writer, no reader. The Deal owns loss | **RETIRE** |
| `Deals.Stage` ("Opportunity Type") | **Yes, as a roll-up.** Mandatory native picklist, drives forecasting and 8 read sites | **REDEFINE** — derived roll-up, not an independent lifecycle; stop sourcing Activity snapshots from it |
| `Deals.Opportunity_Stage` | **Yes, as a roll-up.** The granular 8-stage summary at Deal level. Distinct from `Stage` (8 values vs 4) | **REDEFINE** — a roll-up, **not** "the canonical ontology field" |
| `Deals.Opportunity_State` | **Yes.** Deal viability. Not reconstructable — closure is a decision, not a computation | **KEEP** |
| `Deals.Opportunity_Status` | **Yes.** Sole behavioural gate feeding `Accounts.Status` | **KEEP** |
| `Deals.Deal_Product` | **None.** Fully reconstructable from `Quotes.Quote_Product` (125/125) and `Quoted_Items` (125/125) | **RETIRE** |
| `Deals.Deal_Product_Key` | **None for Product.** Its *pipeline* half is real but belongs to `Deals.Pipeline`, now proven readable | **RETIRE** — after pipeline resolution is repointed |
| `Deals.Company_Tier` | **None.** A cache of `Accounts.Company_Tier` with **zero behavioural readers** — pricing reads the Account live | **RETIRE** |
| `Deals.Deal_Primary_Contact` | **None.** 0/96 populated, 0 writers, three readers that all fall through to `Contact_Name` | **RETIRE** |
| Deal `Contract_*_Plan_*` (6) | **None.** Reproducible from the earliest/latest Closed-Won Quote, and the Deal copy is **lossier** | **RETIRE** |
| Deal `Contract_*_ACV/Date_*` (6) | **Undetermined.** Reproducible today, but once one Deal spans several Products a single "current contract" pair may be undefined | **UNRESOLVED — blocker B2** |
| `Quotes.Quote_Product` | **Yes — mechanical.** Subforms are unqueryable in COQL/`searchRecords` | **KEEP as a derived index** (§4) |
| `Products.Contacts` | **Yes — structural.** The Product-side end of the same relationship as `Contacts.Products_Linked`; deleting it destroys both ends | **KEEP** |
| `Tasks.Task_Sequence_Stage` | **Yes.** Blank means "unscoped — blocks at every Stage". Not expressible by `Task_Stage` | **KEEP** |
| All nine Activity snapshots | **Yes.** Immutable context at the moment the Activity was raised — destroyed if not stored | **KEEP** (§5) |

---

## 9. Classification tally

| Classification | Count |
|---|---|
| KEEP — core business fact | ~118 |
| KEEP — automation control | 34 |
| KEEP — immutable reporting snapshot | 10 |
| KEEP — integration identifier | 3 |
| KEEP — required native mirror | ~38 |
| **REDEFINE / MIGRATE** | **17** |
| **RETIRE** | **~45** (10 newly added by this model; ~35 already settled, including the 21 Lead ledger mirrors) |
| **UNRESOLVED** | **3** — `Accounts.Account_Source_Class`; the 6 Deal `Contract_*_ACV/Date_*` (B2); `Quote_Product` header/line agreement (B3) |

Counts are exact for every field named individually and per-family for the grouped identity,
firmographic, AOO/AOR, Lead import-adapter and native-mechanics blocks.

**Coverage:** the 2026-08-10 baseline mapped 248 (module, field) pairs. Since then 5 custom activity
fields were deleted live (2026-08-11), 6 phantom writers were removed in code, and the
`Primary_Contact` / `Role_AOR` / `Call_Purpose_Detail` / `Contact_Source_Class` /
`Profile_Completion_Status` / `Product_Interest_Staging` references were eliminated. Every surviving
pair is covered — individually where the model changes the verdict, per-family otherwise. **No reader,
writer or dependency here is guessed**; where one could not be established the row says so and names the
query or console step that settles it.

---

## 10. The REDEFINE / MIGRATE register

| # | Field | Current meaning | Intended meaning | Exact change |
|---|---|---|---|---|
| R1 | `Deals.Deal_Key` | `accountKey :: productKey` | Account-scoped Deal identity | `Deal_Key = Account_Key`. Drop `_util_createOrReuseProductDeal:61`. **The live UNIQUE constraint then enforces §14.1 mechanically — and blocks in-place rekeying of the 21 surplus Deals until they are merged or blanked** |
| R2 | `Deals.Deal_Name` | `"{Account} - {Product}"` (96/96) | `"{Account}"` | Drop the suffix at `_util_createOrReuseProductDeal:90-92`. **Blocked on** rewriting `booking/integrations/zoho/index.js:470-482` first — without it every booking resolves `status:'none'` |
| R3 | `Deals.Stage` | Roll-up over the Product Deal's role-Contacts | Roll-up over **all** the Account's Contact opportunities | Re-scope `pD:180-340`. Keep the roll-up; document the RTP floor as a deliberate relationship rule. **Stop being the source for the three `*_Task_Opportunity` snapshots.** 11/96 Deals already disagree with `max(CLASSIFY(Contact.Stage))` across their Account |
| R4 | `Deals.Opportunity_Stage` | as R3 | as R3 | Same re-scope; **repoint `createAuxTask:135` off it** |
| R5 | `Deals.Pipeline` | Derived from `pipelineForProductKey(Deal_Product_Key)` | An Account-relationship attribute | Replace the Product→Pipeline rule. **Safe on current data: 0 Accounts mix B2B and Partnership** |
| R6 | `Deals.Amount` | Quote sum, **or Account-tier Target ACV**, or 0 | **Roll-up of Quote evidence only (§6.5)** | ✅ **OWNER RULING 2026-08-17.** The banded tier matrix is **correct and stays** — but it is a **Quote-line pricing input**, not a Deal valuation. It was designed *before Quotes existed*, and the per-Deal tier fallback at `processDeal:2318-2335` is that era's leftover. **Target shape: tier → Quote line price → Quote total → `Deal.Amount` roll-up.** `Deal.Amount` must never be computed from an Account tier directly. Expect implementation work in how the matrix feeds `_util_resolveQuoteLinePrice` and how line totals sum to the Quote — the *concept* is sound, the *wiring* predates the Quote model |
| R7–R9 | `Task_Opportunity`, `Call_Task_Opportunity`, `Meeting_Task_Opportunity` | `Deals.Stage` at raise | `CLASSIFY(Contact.Stage)` at raise | One shared `CLASSIFY()` over the **legacy actual** vocabulary (§5.2). Repoint 9 write sites. **35/182 live values are wrong under the new definition — record a cut-over date, do not backfill** |
| R10–R12 | `Task_Pipeline`, `Call_Task_Pipeline`, `Meeting_Task_Pipeline` | `pipelineForProductKey(Deal_Product_Key)` | `Deals.Pipeline` at raise | Rewrite `_util_resolveDealPipeline` to read `Deals.Pipeline` over `invokeurl` REST. The `!= ""` write guard at every call site stays load-bearing |
| R13 | `Tasks.Task_Stage` | Dual-source: Deal at `createAuxTask:135`, Contact at the other four sites | Contact Stage at raise | One-line repoint |
| R14 | `Quotes.Opportunity_Type` | `FTP` unless `Deals.Stage == RTP` (`pD:388-390`) | The **attributed Contact** opportunity's class when quoted | Repoint. Live proves it is not a duplicate of `Quote_Type` (RTP 58 vs Renewal 28) |
| R15 | `Accounts.Status` | Roll-up across Product Deals | Declared derived mirror of the single Deal | 371/372 populated, 0 code readers — keep the surface, fix the contract |
| R16 | `Leads.Product_Interest` | Drives Deal fan-out | Quote-creation evidence only | Remove the fan-out in `processLead` / `processContact` / `processAccount` |
| R17 | Deal `Contract_Current_*` / `Contract_Initial_*` ACV + dates | Deal-level contract ledger | Derived roll-up of earliest/latest Closed-Won Quote | See blocker B2 — may be unsatisfiable and become RETIRE |

---

## 11. Blockers

| id | Blocker | Effect |
|---|---|---|
| **B1** | ✅ **VOID as at 2026-08-17 — owner-confirmed.** There are **no custom Reports, Dashboards or Analytics** configured in the org. The manual console check has nothing to check | **Every RETIRE row is unblocked** on the reporting axis. Retirement is now gated only on **B4** (remove every writer → publish → read the whole update map back). ⚠ Re-open this blocker the moment the org gains its first real Report or Dashboard — it is void because of the org's current state, not because the risk was misjudged |
| **B2** | ✅ **CLOSED 2026-08-17.** 24 Closed-Won Quotes across 21 Accounts; **0 Accounts hold Closed-Won Quotes on more than one Product.** | The six Deal `Contract_*_ACV/Date_*` fields **keep their REDEFINE verdict** — a single "current contract" pair is well-defined on all current data. ⚠ **Forward risk, not resolved:** the first Account to close two Products makes the pair ambiguous. Decide the rule (per-Product ledger, or accept latest-wins) **before** that happens rather than after |
| **B3** | ✅ **CLOSED 2026-08-17.** All 125 Quotes read individually: **agree 125, disagree 0, header blank 0, no-line 0, multi-line 0.** | §7.4 is **satisfied**. `Quote_Product` is a faithful derived index over `Quoted_Items`; no reconciliation pass needed. §4's contract holds as written. Also independently re-confirms one-Product-per-Quote (0 multi-line). ⚠ **Two query artifacts found while closing this — record them:** COQL does **not** return the `Quote_Product` lookup (returns blank), and the record **list** endpoint does **not** return the `Quoted_Items` subform. Both need a single-record `GET /crm/v6/Quotes/{id}?fields=…`. A naive check reports 125/125 disagreement, which is false |
| **B4** | **Writes-first ordering is mandatory.** `handleMeetingEvent:429-433` and `processLead:521-524` each record a production incident where an unknown api_name **voided an entire `updateRecord` map**. Deleting a field converts *exists-but-off-layout* (key discarded) into *does not exist* (whole map voided) | Remove and **publish** every writer, verify by reading the whole map back, *then* delete. Deleting `Deal_Product_Key` before `_util_resolveDealPipeline` is repointed would void the mirror-write maps in `createAuxTask`, `routeContactSequence` and `sendSequencedEmail` |
| **B5** | ✅ **CLOSED 2026-08-17.** All 18 rules read live. Two corrections to the inherited list: WF006 binds a **third** field (`Next_Follow_Up_Date`) via an entire **second condition block** that the list endpoint does not surface; and **WF021 binds nothing at all** — it is `create_or_edit` with no criteria, so only WF020 binds `Quote_Stage`. **WF004 confirmed not to exist** (refuted three ways) | **No longer blocking.** Every flagged field is workflow-clear. The single exception: delete the **WF010d rule** before deleting `Deals.Next_Comm_Follow_Up_Date`. Full inventory and verdicts: [`V6_CRUD_PLAN.md`](V6_CRUD_PLAN.md) |
| **B6** | **`Contacts.Contact_Role1` distribution and the activation-eligible population are UNRESOLVED** — rate-limited. ⚠ An earlier query used `Contact_Role` (the *junction* field) and returned blank on all 647; that was a query artifact, not a finding | Re-run `GET /crm/v6/Contacts?fields=id,Stage,State,Contact_Role1,Sequence_State,Sequence_Type,Sequence_Activated_At` |
| **B7** | **The 7 uncommitted `.deluge` edits are unpublished.** Nothing may be committed until the owner publishes | The repo tree and the live org are divergent; every line number cited here is against the working tree |
