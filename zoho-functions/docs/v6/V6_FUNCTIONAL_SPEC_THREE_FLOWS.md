# v6 Functional Specification — three flows

> 🔄 **Two owner decisions post-date this document's research and amend it. Read these first.**
>
> **1 · The records are REBUILT, not migrated** — see [`V6_REBUILD_VS_MIGRATE.md`](V6_REBUILD_VS_MIGRATE.md).
> The org is a dev instance with disposable, CSV-reproducible data. **Work item 21 ("LIVE MIGRATION
> GATE") is dissolved:** the 21 surplus Deals, the 2 duplicate-key E2E Deals and the 2 duplicate
> Betsson scaffold Quotes are never merged — they are wiped and never re-created. Everything gated on
> item 21 (items 22, 29, 31) is gated instead on *the corrected code being published*, then verified
> against the R1–R11 acceptance set after re-import.
>
> **2 · Blocker B1 is void** — the org has no custom Reports, Dashboards or Analytics, so field
> retirement (item 32) is gated only on the writers-first ordering, not on a console dependency check.
>
> **3 · Fixture email convention and live validation (owner, 2026-08-17).** Use **`timothy+v6-<purpose>@jurnii.io`**
> — the same `+tag` pattern already in use for booking E2E (`timothy+booking-e2e-<timestamp>@jurnii.io`).
> `tlcsolomon@gmail.com` is available as a second inbox. **Both are readable over the Gmail MCP, so
> every email assertion in this document is upgraded from "assert nothing was sent" to "assert the
> right message arrived, at the right address, with the right content."** Verified working
> 2026-08-17: booking's calendar invitations are arriving (three on 2026-08-02 carrying
> `jurnii.vercel.app/manage.html?token=` links).
>
> **4 · `Deals.Amount` — owner ruling (2026-08-17).** The banded tier matrix is correct and stays, but
> it is a **Quote-line pricing input**, not a Deal valuation. Target shape:
> **tier → Quote line price → Quote total → `Deal.Amount` roll-up.** The per-Deal tier fallback at
> `pD:2318-2335` predates the Quote model and is the leftover. **`pD:2318-2335` is therefore no longer
> "frozen pending a ruling"** — it is in scope, as a rewire rather than a deletion. The contract ledger
> (`pD:2353-2470`, blocker B2) remains frozen.
>
> **5 · The 13 post-import Leads are disposable** (owner: all booking-form data is test data). The 2
> `Employee Referral` Leads may be operational but are reproducible.
>
> Nothing else in this document changes. The three flows, the trap diagnosis, the acceptance tests and
> the code verdicts all stand.
>
> **Independent corroboration of the zero (2026-08-17, Gmail):** a 120-day search of the owner's inbox
> returns **zero** CRM cadence emails — the only `noreply@jurnii.io` message is a Zoho password reset.
> Consistent with `Sequence_Activated_At` being null on 647/647, and evidence from entirely outside
> Zoho.

*Merged from the Flow A / Flow B / Flow C traces. All `.deluge` line numbers are **working-tree** (the 7 uncommitted files are unpublished phantom-field scrubs; none changes a propagation edge or a control-flow branch). "Live behaviour" = committed HEAD unless stated. Repo root `c:/Development/Projects/jurnii`; paths below are relative to `c:/Development/Projects/jurnii/zoho-functions/v6/`. Abbreviations: `pL`=processLead, `pC`=processContact, `pD`=processDeal, `pA`=processAccount, `rCS`=activity/routeContactSequence, `hTC`=activity/handleTaskCompletion, `hCO`=activity/handleCallOutcome, `hME`=activity/handleMeetingEvent, `hEE`=activity/handleEmailEvent, `sSE`=activity/sendSequencedEmail, `cAT`=activity/createAuxTask, `cMR`=activity/createManualReview, `aQL`=activity/_util_applyQuoteLifecycle, `rAS`=activity/_util_rollupAccountState, `cRPD`=activity/_util_createOrReuseProductDeal, `rDP`=activity/_util_resolveDealPipeline, `pFPK`=activity/_util_pipelineForProductKey.*

*One new live read this session (read-only): `select id, Account_Name, Account_Status, State from Accounts where Account_Status is null limit 200` → **200 rows, `more_records: true`, every row `State` null too**. CONFIRMED, and consistent with Trace A's 297-of-372 unclassified figure. The orchestrator's "75 Accounts" is the count of Accounts **holding a Deal**, not the Account population — the two figures do not conflict.*

---

## How to use this

The CRUD plan (`docs/v6/V6_CRUD_PLAN.md`) says **which files change**; this document says **what must be true** when they have. Each flow states the target behaviour, the measured delta against live, the ranked gap, and acceptance tests written against fixture records only. Work the flows in order: **A gates B** — today a Contact cannot activate without a Deal (`pC:312` returns before the activation gate at `:331`), and the Deal fan-out manufactures the `multi_product_sequence_ambiguous` dead-end that permanently un-sequences exactly the highest-intent Contacts. **B gates C** — the propagation edges that matter most (the nine Activity snapshots, cadence selection, Quote `Opportunity_Type`) are only exercised when a cadence actually runs, and **no cadence has ever run**: `Sequence_Activated_At` is null on 647/647 Contacts, there are 0 Calls, and the activity→Quote path has never executed. Do not attempt to validate C's propagation graph against live data before B produces a running Contact; you will be reading a graph whose live values are all create-time defaults. The single ordered work list at the end is the executable form of all three; the per-flow sections are its justification.

---

## Flow A — Lead → Account, Deal, Quote

**Entry:** WF001a (Leads, `create_or_edit`, **no criteria**, `repeat=true`) → `pL(lead_id)`. There is no idempotency latch; the only thing stopping a re-run is that `getRecordById("Leads", …)` returns null for a **converted** Lead (`pL:41-46`). Booking treats `pL` as an at-most-once command (`booking/workflows/zoho-ops.js:355-383`); the Zoho UI treats it as an on-save handler. `pL` is written for neither. CONFIRMED.

**The ordering invariant any rewrite must preserve:** `normalizeToProductQuoteTuples("Leads", cleanId)` at `pL:435-444` **must** run before `zoho.crm.convertLead` at `:453`. Both of the adapter's Lead reads (`_util_collectProductEvidence:41`, `_util_normalizeToProductQuoteTuples:71`) return null on a converted Lead — moving it later yields zero products, zero terms, zero Quotes, **silently**. CONFIRMED (`pL:436-438` documents it).

### A1 What should happen

Target shape under the authoritative model: `Deal_Key = Account_Key`; `Deal_Name = "{Account}"`; `Pipeline` is a relationship attribute of the Deal; Products enter as **Quotes** under that one Deal, each with a real `Quoted_Items` line and an attributed `Contact_Name`; the Contact carries Stage / State / Status / sequence.

**Deal instantiation rule (RESOLVED — the traces left this implicit and it decides cases (d) and (e)):** create the Account's single Deal **iff** (i) at least one **resolved canonical** Product bucket exists, **and** (ii) `Leads.Lost_Reasons == ""`. Product interest that resolves *is* entry into a commercial relationship (§2); an unresolved string is not, and a born-Lost Lead never entered one.

| # | Case | Accounts | Deals | Quotes | Contact |
|---|---|---|---|---|---|
| **a** | 1 product, new company | 1 · `Account_Key = acme.com` | **1** · `Deal_Key = acme.com` · `Deal_Name = "Acme"` · `Pipeline` from the relationship · `Opportunity_State=Open`, `Opportunity_Status=New`, `Stage=MQL` | **1** · Acquisition/Draft · `Quote_Product = Jurnii UX` · one `Quoted_Items` line · `Contact_Name` = new Contact · `Quote_Target_ACV` from Account tier | `Stage` = Lead's stage (default `Marketing Consent`) · `State=Open`, `Status=New` · `Sequence_State="Not Activated"` · **one** Activation Task |
| **b** | 3 products, new company | 1 | **1 — the same single Deal** | **3** · one per Product, all Acquisition/Draft, all on that Deal, all attributed to the same Contact | Identical to (a). §5.4: *several Products or Quotes under the Deal do not make the Contact sequence ambiguous.* Exactly **one** Activation Task |
| **c** | 2 products, Account + Deal exist | **0 new** | **0 new** — reuse the persistent Deal | 0–2 new: one per Product not already carrying an open Quote; reuse/update the open one otherwise | New Contact joins via `Contact_Roles` with its **own** Stage and sequence; `Deals.Contact_Name` re-derived by the §6.4 selection function; Closed-Won/Lost Quote attribution untouched (§7.3) |
| **d** | No product interest | 1 | **0** — §2: an Account may exist without a Deal | **0** | `Marketing Consent` ⇒ MQL, `Open`/`New`. Account still classified `Account_Status = "Prospect"`. Activation Task: **one**, `Who_Id` only, no `What_Id` — *pending owner ruling, see work item 27* |
| **e** | Lead arrives already Lost | 1 (identity exists) | **0 new.** An existing Deal is **untouched** — §6.5: relationship State does not become Lost because one Contact is Lost | **0** | `State=Lost`, `Status=Closed`, `Lost_Reasons` copied. No sequence, no Activation Task. Account `Account_Status = "Prospect"`, **never `Churned`** |
| **f** | Second Lead, same Account, already converted | **0 new** | **0 new** — §4.2 | Only if this Contact brings Product evidence not already quoted | A **second, independent** Contact opportunity on the same Deal, own Stage/State/sequence/Activation Task. Deal roll-up = max over viable Contacts |

### A2 What happens today — the delta per case

| Case | Today | Delta |
|---|---|---|
| **a** | 1 Account, 1 Deal, 1 Quote, 1 Contact — architecturally correct | **Naming/keying only.** `Deal_Key = "acme.com::jurnii_ux"` (`cRPD:61`), `Deal_Name = "Acme - Jurnii UX"` (`cRPD:88-92`). Quote is the 8z scaffold: Draft, `Contract_ACV=0`, `List_Price=0` |
| **b** | `prodBuckets.size()==3` → **3 Deals** (`pL:588-680`), 3 scaffold Quotes, 3 `Contacts_X_Products` rows, `Contact_Roles` on all 3. Then `pC:354-358` sees 3 B2B drivers → `[multi_product_sequence_ambiguous]` review → `return`. **No Activation Task, ever** | **3 Deals instead of 1, and a permanently un-sequenced high-intent Contact.** CONFIRMED live: 4 such reviews (`…2867116` Bet365, `…2890111` Bally's, `…2902356` Flutter/Tuf Gavaz, `…2916164` GOAT) |
| **c** | Account reused correctly (3-tier search `pL:320-346`). `cRPD:64` reuses only on exact `accountKey::productKey` → **2 new Deals**, Account now holds 3–4. `pD:100-107` `partnership_held` would, under one Deal, quarantine the Account's *entire* relationship | **N extra Deals per new product**, and an Account roll-up aggregating a set that should have exactly one member |
| **d** | No Deal, no Quote ✅ (`pC:257-263` even logs `mql_no_product_deal` without spamming reviews). But `pC` returns **before** activation, and `rAS:81-85` returns having written nothing when `total==0` | **"No Deal" is right; "therefore no roll-up and no sequence" is the defect.** ≥200 Accounts live with `Account_Status` **and** `State` null (CONFIRMED today, `more_records:true`) |
| **e** | Lost propagates to the Contact correctly (`pL:491-497`), but the fan-out is **unconditional**: `cRPD` creates the Deal Open/New → `seedDeal` (`pL:646-652`) flips it Lost/Closed → `pD:2227-2228` keeps it → `pD:2308-2312` zeroes Amount → 8z skipped (`pD:1664`, so no Quote ✅) → `rAS`: `lost==total` ⇒ **`Account_Status = "Churned"`** | **A phantom born-Lost Deal, and a brand-new Account stamped Churned.** Live: 1 Deal Lost, 1 Account Lost, 1 Churned — consistent |
| **f** | Correct **only for a repeat product** — `cRPD:64` finds the key and reuses. For a *different* product it degenerates into (c). And `seedDeal:642` **unconditionally overwrites `Deals.Contact_Name`** with the newest Contact, before `pD:1876-1887`/`:2144-2148` re-derives it | The leading-Contact pointer is a **write** where the model says **computation**. Blast radius grows when (f) is fixed: `sendDemoReminder` → `deal.Contact_Name` mails the wrong Contact; `Deals.Demo_Reminder_Send_At` is one slot so the second booking silently overwrites the first; `hEE:45-51`'s fallback can mark the **wrong** Contact Lost |

**The concurrency finding that all three traces reached independently, and that overrides the plan's assumption.** `getFields(Deals)` returns `Deal_Key → unique: {case_sensitive: false}`, and yet Deals `991103000003645011` and `991103000003655003` both carry `jurnii-e2e.dev::jurnii_360`, created in the **same second**. A duplicate 8z scaffold Quote exists too (`…2924001` / `…2933001` on Betsson, identical `Scaffold:Deal:…` key, 12 seconds apart). **CONFIRMED.** This refutes `V6_FIELD_USE_CONTRACT.md` R1 and `V6_CRUD_PLAN.md:104` ("not needed: the UNIQUE constraint plus code does it"). The most likely racer is `pL:252` — a bare 3-arg `updateRecord("Leads", …, {"Contact_Role1": …})` with **no trigger suppression**, re-entering WF001a (no criteria, repeat=true) on the very Lead being converted; the `pL:222` guard prevents an infinite loop but not a **second concurrent conversion**. Racer identity is INFERRED (function-execution logs are not API-reachable); the duplicate outcome is CONFIRMED. Consolidating to one key per Account makes this race **more** likely, not less: every Contact at a company will contend for the same key.

### A3 The gap, ranked by severity

1. **The fan-out manufactures un-sequenceable Contacts.** 17 Accounts hold 2–3 Deals (21 surplus); every multi-product Contact hits `pC:354-358` and never receives an Activation Task. Bounded at 4 Contacts *today*, but it is the **default outcome** for every future multi-product Lead. (RESOLVED contradiction: Trace B correctly refutes this as a material cause of the org-wide activation zero — it is not; Trace A correctly calls it the most expensive Flow-A defect going forward. Both hold; the scopes differ.)
2. **Deal-less Accounts are never classified, and the classifier is about to break org-wide.** `rAS:53` `if(dpKey=="" && dpId=="") continue;` — once `Deal_Product`/`Deal_Product_Key` are retired, `total` stays 0 for **every** Account and `Account_Status` freezes silently for all 75 that currently work. `rAS` must publish **before** the Deal-identity wave.
3. **Idempotency is not enforced anywhere.** Duplicate Deals and duplicate scaffold Quotes exist live. Enforcement must move into code (search → insert → **re-search → collapse**), and `pL:252` must be suppressed.
4. **Case (e) creates a phantom Deal and mislabels the Account `Churned`.** A never-engaged company reads as a lost customer in every roll-up.
5. **`seedDeal`'s `Contact_Name` stamp**, plus its downstream fallbacks (reminder recipient, email-event Lost attribution). Harmless-ish per-product; wrong by construction per-Account.
6. **Naming/keying (case a).** Cosmetic in Zoho, **fatal cross-repo**: `booking/integrations/zoho/index.js:470-482` substring-matches the Product name inside `Deal_Name`. The moment `Deal_Name` becomes `"{Account}"`, every booking Meeting resolves `status:'none'`. This is the hardest ordering constraint in the programme.

*Not a defect, despite appearances:* **74 of 125 Quotes at `Grand_Total = 0`** decomposes exhaustively as 65 8z scaffolds (`List_Price=0` deliberate, `pD:1703-1704`), 8 lifecycle successor Renewals (real `Contract_ACV` 1750–23350, `aQL:180` vs `:195`), and **1** genuine unpriceable import that self-reported `[import_contract_draft]`. `pD:1856-1862` values a Quote from `Contract_ACV` first, so no revenue is lost. It is a **native-reporting hazard**, not a valuation defect. This refines `V6_FIELD_USE_CONTRACT.md` §3.

### A4 Acceptance tests

Fixture-only. Use a dedicated domain per test so `accountKey` is deterministic (`pL:296-314`: Website domain → email domain → Company). All Leads created with `Email = <slug>@<domain>` and `Website = https://<domain>`, `Contact_Marketing_Consent` false, no `Lost_Reasons` unless stated. All assertions are COQL-readable. **Run A-T7 first** (it is a pre-change regression probe and costs nothing).

| Test | Fixture | Exact assertions (post-change, target model) |
|---|---|---|
| **A-T1** case (a) | domain `a1.flowa-e2e.dev`, `Product_Interest = ["Jurnii UX"]`, Stage blank | `count(Accounts where Account_Key='a1.flowa-e2e.dev') = 1` · `count(Deals where Account_Name=<acc>) = 1` · that Deal: `Deal_Key='a1.flowa-e2e.dev'`, `Deal_Name = Accounts.Account_Name` exactly, `Pipeline='B2B'`, `Opportunity_State='Open'`, `Opportunity_Status='New'`, `Stage='MQL'`, `Deal_Product` **and** `Deal_Product_Key` absent/blank · `count(Quotes where Deal_Name=<deal>) = 1`, that Quote `Quote_Type='Acquisition'`, `Quote_Stage='Draft'`, `Quote_Product='Jurnii UX'`, `Contact_Name=<contact>`, `Quoted_Items` line count = 1 · Contact: `Stage='Marketing Consent'`, `State='Open'`, `Status='New'`, `Sequence_State='Not Activated'`, `Contact_Role1='Decision Maker'` · `count(Tasks where Who_Id=<contact> and Task_Type='Sequence Activation') = 1` · `count(Tasks where Who_Id=<contact> and Task_Type='Manual Review') = 0` |
| **A-T2** case (b) | domain `a2.flowa-e2e.dev`, `Product_Interest = ["Jurnii UX","Jurnii 360","Jurnii Cortex"]` | Deals on that Account **= 1** · Quotes on that Deal **= 3**, distinct `Quote_Product`, all `Acquisition`/`Draft`, all `Contact_Name=<contact>` · Activation Tasks for that Contact **= 1** · **`count(Tasks where Description like '%multi_product_sequence_ambiguous%' and Who_Id=<contact>) = 0`** · `count(Contacts_X_Products where Contacts=<contact>) = 3` |
| **A-T3** case (c) | second Lead, **same** domain as A-T1, different person, `Product_Interest = ["Jurnii 360","Jurnii Cortex"]` | Accounts unchanged (still 1) · **Deals on that Account still = 1, same id as A-T1's** · Quotes on that Deal 1 → **3** · new Contact has its own Activation Task and `Sequence_State='Not Activated'` · `Contact_Roles` rows on the Deal = 2 · `Deals.Contact_Name` = the **furthest-stage open** Contact per `pD:2144-2148`, **not** unconditionally the newest — assert it is A-T1's Contact when both are at `Marketing Consent` and A-T1's id is lower |
| **A-T4** case (d) | domain `a4.flowa-e2e.dev`, `Product_Interest` empty | 1 Account · **0 Deals** · **0 Quotes** · `Accounts.Account_Status = 'Prospect'` **non-null** (this is the `rAS` fix — pre-change it is null) · `Accounts.State` non-null · Contact `Stage='Marketing Consent'`, `State='Open'` · Activation Task: **1**, with `Who_Id=<contact>` and `What_Id` null — *assert 0 instead if item 27's ruling is "Deal required"* · `count(Tasks where Description like '%product_unresolved%' and Who_Id=<contact>) = 0` |
| **A-T5** case (e) | domain `a5.flowa-e2e.dev`, `Product_Interest = ["Jurnii UX"]`, `Lost_Reasons = "No Fit"` | 1 Account · **0 Deals** · **0 Quotes** · Contact `State='Lost'`, `Status='Closed'`, `Lost_Reasons='No Fit'` · **`Accounts.Account_Status = 'Prospect'`, NOT `'Churned'`** · 0 Activation Tasks |
| **A-T6** case (f) | third Lead, domain of A-T1, `Product_Interest = ["Jurnii UX"]` (repeat product) | 0 new Accounts · **0 new Deals** · **0 new Quotes** (the open Acquisition Quote for Jurnii UX is reused, `Quote_Applied_Activity_Keys` unchanged) · new Contact has its own Activation Task · `Deals.Contact_Name` **unchanged** from its pre-test value |
| **A-T7** idempotency (**run pre-change as a regression probe, and again post-change**) | one fixture Lead, saved twice within 2 s (two API `updateRecord` calls with `trigger` omitted) | `count(Deals where Deal_Key=<key>) = 1` · `count(Quotes where Quote_Applied_Activity_Keys like 'Scaffold:Deal:<deal>:%') = 1` · `count(Contacts where Email=<lead email>) = 1`. **Pre-change this is expected to fail** — that failure is the reproduction of the live duplicate and the justification for work items 3 and 15 |
| **A-T8** cross-repo | after item 15 publishes, replay one booking fixture flow against the A-T1 Account | `booking` `resolveProductDeal` returns `status != 'none'` and the resolved Deal id equals A-T1's Deal · a Meeting is created with `What_Id = <deal>` and `Who_Id = <contact>`. **Must pass before item 15 reaches Production** |

---

## Flow B — Activities → cadence of tasks

### B1 What should happen

**Activation.** `pC` creates exactly one canonical Activation Task per eligible Contact. Its identity is **`Who_Id` (Contact) + `Task_Type = "Sequence Activation"` and nothing else** (`pC:362-366`); `Task_Sequence_Stage`, `What_Id` and native `Status` are context. The retrieval is Contact-scoped (`getRelatedRecords("Tasks","Contacts",…)` at `pC:378`, with a `searchRecords("(Who_Id:equals:…)")` fallback; an *unresolved read returns, never "none"*). **This is one of the very few things in v6 that is already model-correct and survives one-Deal-per-Account unchanged** — a Deal-scoped identity would find the other Contact's Task the moment two Contacts share a Deal.

The rep performs **one save** setting exactly two fields: `Task_Sequence_Type ∈ {Email, Call, Manual}` and `Task_State = "Won"`. That commit must (i) stamp `Contacts.Sequence_Activated_At` — set-once, single writer `rCS:1136`, the **only** trustworthy activation evidence; (ii) write `Sequence_Type`/`Sequence_State`/`Sequence_Stage`/`Sequence_Step`; (iii) enter the Contact's **current** Stage cadence.

**Then the stage-by-stage cadence**, all Contact-scoped:

| Contact Stage | Class | Cursor | Entry action | Emails |
|---|---|---|---|---|
| Marketing Consent | cadence | `Call`/`1` | `send_opener_then_call` (Email) or `create_call` (Call) | `marketing-consent:1..5` |
| Demo Booking | cadence | `Call`/`1` | as above | `demo-booking:1..5` |
| Demo Confirmation | special | `Meeting`/`None` | `await_meeting` — creates nothing | `:0:confirmation`, `:0:reminder`, `:0:no-show` |
| Demo Hosted | cadence | `Call`/`1` | as above | `demo-hosted:1..5` |
| Proposal Preparation | task | `Task`/`1` | `create_task` → `Draft Commercials` | `:0:post-demo` on entry |
| Commercial Agreement | cadence | `Call`/`1` | as above | `:0:proposal-sent` + `commercial-agreement:1..5` |
| Onboarding | task | `Task`/`1` | `create_task` → `Onboarding Setup` (terminal: `Sequence_State="Complete"`) | `:0:signed-confirmation` |
| Renewal | cadence | `Call`/`1` | as above | `renewal:1..5` |

Progression: `Marketing Consent → Demo Booking → Demo Confirmation → Demo Hosted → Proposal Preparation → Commercial Agreement → Onboarding → Renewal → Renewal` (terminal self-loop) (`rCS:393-401`). Advance on `call:positive`/`task:positive`; within-stage on `call:neutral` steps 1→5 then a post-call email that sets `Sequence_State="Complete"`; stop on `Stopped` + Contact Lost. Every advance supersedes the Contact's in-flight Calls and Tasks (`rCS:1016-1076`).

**Template registry reconciles exactly** with `.agents/context/activity-workflows/emails/`: 5 cadence stages × 7 files + 6 transactional = 41 keys, 41 files, no drift. CONFIRMED.

Two **corpus/code divergences** to settle as product decisions, not code bugs: the Marketing Consent call scripts live under a folder named "Marketing Qualification" (name drift only, 5 scripts ↔ 5 steps); **Demo Hosted** runs a 5-step Call cadence with only 3 scripts on disk; **Onboarding** has a 5-step call-script cadence on disk but the code raises a single `Onboarding Setup` Task.

### B2 What happens today — and THE ZERO

**The headline, CONFIRMED and decisive: the activation branch of `hTC` has never executed against a single Activation Task.** WF008 `last_executed_time = 2026-07-20T19:51:49+01:00`. All 132 Sequence Activation Tasks were created 2026-07-21T12:45–17:50 (130) and 2026-08-14T13:41 (2) — **the day after WF008 last fired**. All 132 remain in their exact byte-state from `pC:499-527`: `Task_State=Open`, `Task_Status=New`, `Status="Not Started"`, `Task_Sequence_Type=null`. 0 Calls exist. `Sequence_Activated_At` and `Sequence_Type` are null on 647/647.

**Why no Contact has ever activated — ranked by probability:**

| # | Mechanism | Verdict |
|---|---|---|
| **1** | **No human has ever saved an Activation Task.** WF008's last execution predates the entire population; every Task is untouched. | **CONFIRMED — decisive.** This is an operational fact, not an engineering one |
| **1a** | Deluge `createRecord` did **not** fire WF008 (132 creates left `last_executed_time` unmoved), so not even the benign `awaiting_commit` no-op ran | **INFERRED, high confidence.** Settles `V6_CRUD_PLAN.md` U5 for the API side; the UI side is U3 below |
| **2** | **Only 132 of 647 Contacts ever received a Task.** `pC:261` (`mql_no_product_deal`) and `pC:312` both `return` before the `Sequence_State="Not Activated"` write at `:322`. **419 Contacts are structurally outside the activation path.** Even a perfect commit path caps at ~132 | **CONFIRMED** (91 Contacts are `Decision Maker` + `Not Activated`) |
| **3** | **The `hTC:296` trap and the two self-heal bricks.** Never fired — but they are why the *first* rep to try will fail and why the zero would then persist | **CONFIRMED as code, NEVER TRIGGERED** |
| **4** | `multi_product_sequence_ambiguous` | **REFUTED as a material cause** — bounded at exactly 4 Contacts (Flow A owns this) |
| **5** | `Sequence_Type` being rep-input-only | **REFUTED — this is the design** (`pC:485-494`). Null on 647/647 is a *consequence* of the zero |
| **6** | The B2B pipeline gate `rCS:977` | **REFUTED.** `Deal_Product_Key` is 96/96 populated; `pFPK` returns B2B for 87/96. Suppresses at most 9 Deals |
| **7** | `Automation_Suppressed` | **REFUTED** — false on the fixtures, no Lost/suppressed pattern |

**The trap, traced in full (mechanism #3).** A rep sets `Task_Sequence_Type="Email"`, `Task_State="Won"` **and** native `Status="Completed"` in one save — the single most natural action in the Zoho UI, and one the Task's own Description (`pC:498`) never warns against.
- Save 1: `hTC:296` requires `taskStatusMirror=="New" **&& tStatus=="Not Started"**` → false. `hTC:301` requires `taskSeqType == contactSeqType` → `"Email" == ""` → false. → `lastKind="conflict"` → `[activation_command_state_conflict]` review → `return`. **Nothing written.**
- Save 2, **following that review's own instruction** to set the Contact's Sequence Type and re-save: `:301` now true → `lastKind="legacy"` → `legacy_bootstrap` (`:454-459`) writes **only** the `ActivationCommand|state=Won|type=Email` marker — *"write the marker, route nothing, create nothing."*
- **Result: the Task is permanently stamped as an already-processed commit that never happened.** Every later save resolves `idempotent_skip`. The Contact is silently and irreversibly un-activatable through that Task. The only theoretical rescue (Change 21 at `rCS:896-960`) needs a new cadence-eligible Stage entry, which needs progression, which needs dispatch, which needs activation. **CONFIRMED closed trap.**

Two more bricks of the same class: `no_route` (`hTC:407`) and `conflicting_opening_variant` (`hTC:648`) both write `Task_Status:"Working"`, destroying the `Task_Status=="New"` precondition their own comments promise the retry depends on. `hTC:406`'s claim *"a corrected retry works"* is **false**. CONFIRMED.

**Dropping the `tStatus` conjunct at `:296` is safe.** Exhaustive writer enumeration: on a `Sequence Activation` Task, `Task_Status=="New"` ⟺ the activation branch has never written to it (every in-branch write sets `Working` or `Closed`; `sSE:399/421` only touch `Email Sent` Tasks, which `hTC:45` hard-returns on). Native `Status` is rep-editable and only `Deferred` carries meaning — and `hTC:89` returns on `Deferred` *before* `:296`. Widening steals nothing from `:301`, whose real legacy case writes `Task_Status:"Closed"`. CONFIRMED.

**Also dead today, and therefore untested from cold:** `hME` returns `skip_no_related_deal` for **all 156 live Events** (0 carry a `What_Id`; they are calendar-sync artifacts). `hCO` has never run (0 Calls). The activity→Quote path (P2) has never run (`Tasks.Task_Contract_*` 0/219) — the path the authority makes most central (§8.4/§8.5). `hTC:67-71` requires `$se_module=="Deals"` **and** a non-null `What_Id`, silently dropping **37 of 219** live Tasks; §8.1 makes `Who_Id`/`What_Id` complementary, not co-required.

### B3 The gap, ranked

1. **The first commit attempt bricks the record, permanently and silently** (`hTC:296` + `:407`/`:648` + the misleading review text at `:329`). Two files, five one-line changes, no signature change, no model dependency. Nothing else in Flow B matters until this is done.
2. **419 of 647 Contacts cannot be sequenced at all** because activation requires a Deal, and therefore a resolved Product. Under the model, §5.4 scopes sequencing to the **Contact** and §2 allows a Deal-less Account — so the Deal requirement is a carry-over from `Deal = Account × Product` and is itself a model violation. Needs an owner ruling (work item 27) because it also relaxes `hTC:67`.
3. **The Activity snapshots are Deal-sourced and, at three sites, re-stamped.** `Task_Opportunity`/`Call_Task_Opportunity`/`Meeting_Task_Opportunity` from `Deals.Stage` at `pC:521-522`, `cAT:131`/`:134`, `sSE:402`/`:423`, `hCO:193`, `hCO:269`, `hME:402`; `Task_Stage` from `Deals.Opportunity_Stage` at `cAT:132`/`:135`. Three of those (`hCO:268-270`, `hME:401-402`, `sSE:399-403`) are **updates** to existing records: a re-stamped snapshot is not a snapshot, it is a lagging mirror, it fails §9's justification test outright, and it would have erased the useful 35-of-182 divergence signal the field contract measured. `hME:422` already shows the correct `== ""` idiom inside the same map.
   **RESOLVED contradiction (both traces, same finding):** `V6_FIELD_USE_CONTRACT.md` §5 is **wrong** to list `rCS:1665` and `rCS:1550` as `Deals.Stage` writers. `rCS:1085` derives from `stageOpportunity.get(nextStage)` — the *Contact's* next Stage — with `deal.get("Stage")` only as a fallback unreachable for all 8 known Stage values. `routeContactSequence` is already conformant; it needs the fallback **deleted**, nothing repointed. The repoint set is therefore **5 files** (`pC`, `cAT`, `sSE`, `hCO`, `hME`) / 8 write statements, not 9 or 10.
4. **The pipeline gate is routed through the wrong field and fails open.** `rDP` reads `Deal_Product_Key`; `Deals.Pipeline` is populated 96/96 and readable over COQL — re-confirmed by two traces, refuting `rDP:11-13`'s "UNREADABLE" comment. Worse, `pFPK:24` returns **`"B2B"` for a blank key**, directly contradicting its own `:16-18` contract; once `Deal_Product_Key` is retired the B2B gate at `rCS:977` **fails open** for every Deal.
5. **Deal-level Manual Reviews block the leading Contact at every Stage.** `cAT:88-98` creates them with `Blocks_Sequence="Yes"` and **no `Task_Sequence_Stage`**; `rCS:364`'s `(btSeqStage=="" || btSeqStage==stage)` therefore blocks `resume` unconditionally. All 87 live Manual Reviews have `Task_Sequence_Stage` null. `cMR:39-43` attaches them to `Deal_Primary_Contact` → `Contact_Name` — the wrong person by construction under one Deal (`Deal_Primary_Contact` is 0/96 populated with 0 writers, so the fallback is the only live path).
6. **`hTC:67` drops 37/219 Contact-only Tasks.**
7. **`Blocks_Sequence` has 5 writers and 0 readers** — retire, writers-first-then-publish-then-delete (blocker B4).

**Gates to keep exactly as they are:** `Sequence_State=="Stopped"` (`rCS:962`); the activation gate `rCS:963-967` — it is currently suppressing 100% of dispatch org-wide and that is *correct*, it is what stops an imported `Commercial Agreement` Contact being emailed without ever being activated; Manual-at-new-Stage-entry (`rCS:999-1003`, prospective by design); `suppressOuter` (`rCS:1369-1413`); the **send-time** activation gate `sSE:216-234`, which deliberately re-reads the evidence rather than trusting the caller; and the activity relationship validation `rCS:81-207`, which gets *easier* to satisfy under one Deal. `Deals.Automation_Suppressed` (G9) is a keep **with a required ruling**: under one Deal per Account it silently becomes an Account-wide kill switch across every Contact.

### B4 Acceptance tests

**B-T0 — the smallest test that proves activation, and it needs no code change at all.** *(RESOLVED: Trace B's proposed first test deliberately trips the trap, which requires the fix first. Setting only the two command fields and leaving native `Status` alone satisfies `hTC:296` on **HEAD**, so this probe is available today and settles the whole "is the zero operational or structural" question before a single line ships.)*

Fixtures (live-verified, self-consistent): Contact `991103000003658001` "E2E Host", `e2e-1786711232825-618273@jurnii-e2e.dev`, `Stage='Marketing Consent'`, `State=Open`, `Sequence_State='Not Activated'`, `Contact_Role1='Decision Maker'`; Deal `991103000003645011`, `Pipeline='B2B'`, `Automation_Suppressed=false`; **Task `991103000003663003`** (`Task_State=Open`, `Task_Status=New`, `Status='Not Started'`, `What_Id`/`Who_Id` both correct). **Do not use Task `991103000003664003`** — its `What_Id` points at the other Contact's Deal.

- **Step 0.** Record `WF008.last_executed_time` (`2026-07-20T19:51:49+01:00`). If it does not advance after Step 1, `hTC` is not being invoked at all and every code fix below is moot. One workflow read; highest-value observation available.
- **Step 1.** One UI save on Task `991103000003663003`: `Task_Sequence_Type = "Call"`, `Task_State = "Won"`. **Change nothing else — in particular leave native `Status` at "Not Started".**
- **Why `Call`:** `activate:call` → `rCS:830-849`, `Marketing Consent ∈ cadenceStages`, `sType != "Email"` → `action="create_call"`, and **`emailKind` and `sideEmailKind` are both blank on this path**. `sSE` is never called. Zero send risk by construction; the `@jurnii-e2e.dev` address is a second layer.
- **Step 2 — assertions** (all COQL): WF008 `last_executed_time` **> 2026-07-20** · Task: `Task_State='Won'`, `Task_Status='Closed'`, `Description` contains **exactly one** line `ActivationCommand|state=Won|type=Call` · Contact `…3658001`: **`Sequence_Activated_At` NON-NULL** (the whole point), `Sequence_Type='Call'`, `Sequence_State='Running'`, `Sequence_Stage='Call'`, `Sequence_Step='1'`, `Status='Working'`, `Stage='Marketing Consent'` *unchanged*, `Contact_Completed_Marketing_Qualification_At` non-null · **Calls module goes 0 → exactly 1**: `Subject='Marketing Consent Call 1'`, `Who_Id=…3658001`, `What_Id=…3645011`, `Sequence_Managed='Yes'`, `Sequence_Attempt=1`, `Call_Task_State='Open'`, `Call_Task_Status='Working'`, `Outgoing_Call_Status='Scheduled'`, `Call_Task_Pipeline='B2B'`, `Call_Task_Stage='Marketing Consent'`, **`Call_Task_Opportunity='MQL'`** (proves `rCS:1085` is Contact-sourced) · **zero** emails: `count(Tasks where Task_Type='Email Sent')` unchanged at 0 · no new `[activation_command_state_conflict]`, `[activation_no_route]` or `[send_blocked_not_activated]` Task.
- **Rollback:** Task → `Task_State=Open`, `Task_Status=New`, `Status='Not Started'`, strip the `ActivationCommand|` line; Contact → clear `Sequence_Activated_At`/`Sequence_Type`, `Sequence_State='Not Activated'`, `Sequence_Stage`/`Sequence_Step`='None'; delete the Call. Fixtures only.

**B-T1 — the trap (post work item 2).** New fixture Contact + Activation Task. One save: `Task_Sequence_Type='Call'`, `Task_State='Won'`, **and native `Status='Completed'`**. Assert the **full B-T0 assertion set** passes, and `count(Tasks where Description like '%activation_command_state_conflict%')` unchanged. Pre-fix this must fail with a conflict review — run it once **before** publishing to record the failure.

**B-T2 — retry recoverability (post work item 2).** Fixture Task: save with `Task_State='Won'` and `Task_Sequence_Type` **blank** → assert `[activation_no_route]` review created **and** `Task_Status` still `'New'` (pre-fix it becomes `'Working'`). Then set `Task_Sequence_Type='Call'` and re-save → assert the full B-T0 set. Repeat for the `conflicting_opening_variant` path by putting both Warm and Cold markers in the Note (`hTC:648`).

**B-T3 — snapshot freeze.** From the B-T0 end-state, complete the Call with `Call_Task_State='Won'` (`call:positive`). Assert: Contact `Stage='Demo Booking'`, a new Call `'Demo Booking Call 1'` exists, **and the original Call's `Call_Task_Stage` is still `'Marketing Consent'` and `Call_Task_Opportunity` still `'MQL'`** — unchanged (this is the `hCO:268-270` re-stamp regression). Emails still 0.

**B-T4 — Contact-only Task (post work item 27).** Create a `Sequence Activation` Task with `Who_Id` set and `What_Id` null on a Deal-less fixture Contact (A-T4's). Commit it with `Task_Sequence_Type='Call'`. Assert `hTC` does **not** return at `:67`, `Sequence_Activated_At` is stamped, and a Call is created with `Who_Id` set and `What_Id` null.

**B-T5 — send path, still no customer email.** Only after B-T1 passes: repeat B-T0 on a fresh fixture with `Task_Sequence_Type='Email'`. Assert exactly one `Email Sent` audit Task with `Task_Stage='Marketing Consent'`, template key `marketing-consent:1:initial`, recipient `@jurnii-e2e.dev` **only**, and that `sSE:216-234` was not triggered (no `[send_blocked_not_activated]`). Verify the audit Task's `Task_Stage`/`Task_Opportunity` are **not** re-stamped by a later `sSE` update (`sSE:399-403`).

---

## Flow C — Core fields → supporting fields → cadence selection

### C1 The propagation graph

**The one structural fact that shapes every chain:** every automation write to Deals, Accounts and Contacts passes `noTrigger = {"trigger": List()}` — verified at `pD:2490,2550`; `pA:64,162`; `pC:92,226,322`; `rCS:1115,1233`; `hTC:434,517,546,571,599,802`; `rAS:103`; `pL:413,584,653,709`; `aQL:294`; `hME:440`. **No propagation edge is workflow-mediated after the first hop.** That refutes the suspected WF001c↔WF001d loop, and it means a helper that returns early (`rAS:81-85`) fails **silently with no retry**. The two unsuppressed writes are `pL:252` (→ WF001a self-refire) and `pL:371` / `cRPD:178` (→ WF001c / WF001d) — see work items 3 and 15.

**Chain 1 — `Contacts.Stage`, the spine:**

```
Contacts.Stage  (human edit | rCS:1123 | hTC:599 rank-guarded)
 └─ WF001b0 → processContact
    ├─ pC:149-154  blank → "Marketing Consent"
    ├─ pC:205-219  stamp Contact_Completed_<stage>_At at/below rank      [WRITE-ONCE]
    ├─ pC:237      normalizeToProductQuoteTuples → products[]
    ├─ pC:281      createOrReuseProductDeal per product   ← THE FAN-OUT
    ├─ pC:293      updateRelatedRecord Contact_Roles.Contact_Role
    └─ pC:307      processDeal(dealId,"{}")
                    ├─ pD:100-107  pipelineForProductKey → "Partnership" ⇒ RETURN partnership_held
                    ├─ pD:180      getRelatedRecords("Contacts","Accounts")  ← ALL Account Contacts
                    ├─ pD:247      WRITE Contacts.Contact_Role1 on blank-role Contacts  ← cross-Contact
                    ├─ pD:322-339  maxRank / bestStage over State=="Open" Contacts
                    ├─ pD:373-380  RTP FLOOR = storedStage=="RTP" ∨ storedRank≥7 ∨ everRTPviaContact
                    ├─ pD:383-391  effectiveOppType (MQL|SQL|FTP|RTP) → quoteOppType
                    ├─ pD:2148     WRITE Deals.Contact_Name
                    ├─ pD:2227-2243 WRITE Opportunity_State / Opportunity_Status
                    ├─ pD:2249-2261 WRITE Opportunity_Stage (never-regress) + Stage
                    ├─ pD:2288/2350/2353-2470  Company_Tier · Amount · contract ledger
                    ├─ pD:2499-2551 WRITE Accounts.State / Accounts.Status
                    ├─ pD:2560     rollupAccountState → rAS:100-103 Accounts.State + Account_Status
                    └─ pD:2665-2748 TERM GATES → rCS("commercial:sent"|"commercial:signed")
                                     └─ rCS:1123 WRITE Contacts.Stage  ← the only cycle back
```

Cycle bounded by exact-equality gates (`pD:2680`, `:2720`) plus never-regress; the `commercial:signed` half is **dead by the code's own admission** (`pD:2652-2655`: the floor writes `Opportunity_Stage='Onboarding'` at `:2251` before the gate reads it). Graph **terminates on Accounts** — `Accounts.State`/`Status`/`Account_Status` have **zero** Deluge readers.

**The remaining chains, one line each:**

| Core field | Chain | Terminus |
|---|---|---|
| `Contacts.State` | `pC:155` default Open → `pC:331` activation gate → `pD:322` maxRank input / `pD:2204-2212` viability → `pD:2230-2235` `Opportunity_State='Lost'` (only when `dealViabilityResolved ∧ dealHasContacts ∧ !dealAnyContactOpen`) → `pD:2540` / `rAS:89-92` `Account_Status='Churned'` | Accounts. **Never executed — 647/647 Open** |
| `Contacts.Status` | `rCS:1231` Working / `:1219` Closed → `pD:2210` `dealAnyContactWorking` → `pD:2241` `Opportunity_Status` → `pD:2534-2535` `Accounts.Status` | 0 readers. `rCS:1165` deliberately captures `wouldRun` **before** the Manual flip and the not-activated clamp so a gated Contact still reads Working — correct |
| `Contacts.Contact_Role1` | `pC:186` / `pD:247` / `pL` (blank-fill from `Job_Title`→`Job_Title_Raw`) → `Contact_Roles.Contact_Role` (`pC:293`, `pD:509`) → `pD:537-556` role tiebreak (DM 3 > EndUser 2 > Influencer 1) → **`Deals.Contact_Name`** (`pD:2148`) → 6 fallback consumers (`hEE:50-51`, `sendDemoReminder:73-74`, `cMR:43-44`, `aQL:59-60`, `hME:64-65`, `pD:574`→`Quotes.Contact_Name` at `:1097`) | Also the activation gate: `pC:331` requires `"Decision Maker"` |
| `Tasks.Task_State='Won'` | WF008 → `hTC` → marker rebuild `:413-417` → `Contacts.Sequence_Type` `:434/:571` → `Contacts.Stage` `:599` (rank-guarded) → `rCS(activate:*)` → the 5 dispatch switches → the Contact write `rCS:1122-1233` → `pD` → Chain 1 | Dispatch artifacts (Call / Task / email) |
| `Calls.Call_Task_State` | WF006 → `hCO` → `call:positive` → `rCS:487-493` `progression.get(st)` | **0 Calls live** |
| `Events.Meeting_Task_State` | WF007 → `hME:36-42` **returns for all 156 live Events** (`What_Id` null) | Dead |
| `Quotes.Quote_Stage` | WF020 → `hQSC:50-100` → `pD(…, "quote")` → `aQL`: Expansion CW bumps the single open Renewal's `Contract_ACV` **additively** (`:122-130`); Acq/Ren CW creates a successor Renewal (`:187`); Renewal CL → `Deals.Opportunity_State='Lost'` + `Lost_Reasons='Churned / Did Not Renew'` (`:288-296` — load-bearing: it is what makes churn survive `pD:2172` on the next reconcile) | Chain 1 |
| `Deals.Opportunity_State` | WF001d fires **only on a human edit or a Deal create** (everything else is `noTrigger`) | **A human setting `Opportunity_State='Lost'` with no loss reason is silently reverted**: `pD:2172` computes `hasLossReason` from `Reason_For_Loss__s` ∨ `Lost_Reasons`; with neither and any role Contact Open, `pD:2237-2242` writes `'Open'` straight back. CONFIRMED by code, documented nowhere |

### C2 Correctly derived vs wrongly authoritative

| Field | Sole writer(s) | Verdict |
|---|---|---|
| `Deals.Opportunity_Stage` | `pD:2251` | **Roll-up in form, floor in effect.** Derived but irreversible — no code path anywhere in v6 lowers it |
| **`Deals.Stage`** (Opportunity Type) | `pD:2252,2260`; `cRPD:137` | **Derived, but wrongly treated as authority** by the 8 snapshot writes + `pD:390` `quoteOppType` + `hTC:825/1005/1306`. This is R7–R9 and R14 |
| `Deals.Opportunity_State` | `pD:2227/2234/2242`; `aQL:285`; `cRPD:108`; `pA:149`; `pL:649`; `rCS:1114` | **Correct** — a decision, not a computation |
| `Deals.Opportunity_Status` | `pD:2243`; `cRPD:109` | **Correct as derived** |
| `Deals.Amount` | `pD:2350` | Branches 1/2/4 correct; **branch 3 (Account tier → Target ACV) is not a Quote roll-up** and carries 51/96 Deals = 57.3% of headline value. **FROZEN pending owner ruling (R6)** |
| `Deals.Contact_Name` | `pD:2148`; `pL:652`; `aQL`; booking | **Correct as a derived pointer (§6.4)** — but 6 sites treat it as *the* Contact, and `pL:652` writes it unconditionally |
| `Deals.Company_Tier` | `pD:2298` | **Cache with zero behavioural readers** — pricing at `pD:2324` reads the Account live. RETIRE |
| `Deals.Deal_Key` | `pD:2107`; `cRPD:97,130`; `pA:159` | REDEFINE to `Account_Key`. **Uniqueness is declared but not enforced** |
| Deal contract ledger | `pD:2353-2470` | Reproducible from Quotes; **undefined once one Deal spans several Products**. **FROZEN (blocker B2)** |
| `Accounts.State` | **two writers, different scopes** — `pD:2533/2540` (over all the Account's Deals) **and** `rAS:101` (Lost only when `lost==total` over *product* Deals), run back-to-back | **Live inconsistency, not a feature.** 0 readers. RETIRE |
| `Accounts.Status` | `pD:2535,2541` | 1:1 with `Opportunity_Status` once one Deal exists. 0 readers. REDEFINE as a declared mirror |
| `Accounts.Account_Status` | `rAS:102` | **The only Account field carrying a fact no Deal field carries.** KEEP — and fix `rAS:53` |
| `Contact_Completed_*_At` ×8 | `pC:205-219`; `rCS:1201-1215`; `pL` | **Correct as history** (write-once, never cleared). **But its only consumer is wrong** — `pD:222-223` ORs `_Onboarding_At`/`_Renewal_At` across **every** Deal-linked Contact into `everRTPviaContact` |
| `Sequence_Activated_At` | `rCS:1136` — **single writer**, set-once | **Correct, and the only trustworthy activation evidence.** `sSE:216-217` blocks every send while blank |
| `Sequence_State` | `rCS:1189`; `hTC:515,541,802`; `pC:322`; `sendScheduledEmailFromTask:68` | Correct-ish, **six writers across four files**. `rCS:1172-1181` clamps to `Not Activated` when activation is unproven while deliberately preserving `Sequence_Type` |
| `Sequence_Type` | `rCS:1188`; `hTC:434,517,546,571` | **Correct as a stored preference.** The authoritative copy is the `ActivationCommand|` marker in the Task Description; the Contact field is a pre-filter |
| `Sequence_Stage` / `_Step` | `rCS:1190-1191` | **Correct.** Pure cursor |

**Cadence selection — what decides, and what should:**

| Decision | Decided today by | Should be |
|---|---|---|
| Route (Email/Call/Manual) | `Tasks.Task_Sequence_Type`, human | **unchanged.** `pC:492-494` deliberately leaves it blank so `Lead_Source` cannot preselect |
| Whether any cadence runs (B2B vs Partnership) | `pFPK(Deals.Deal_Product_Key)` at 4 gates: `pC:300-302`, `pD:100-107`, `rCS:977-990`, `sSE:390-403` | **`Deals.Pipeline`**, read over REST, at **`rCS:977` only** (plus the `sSE` send-time defence). Pipeline is a relationship attribute (§6.3) set once at Deal instantiation and thereafter human-only |
| Which stage cadence | `Contacts.Stage` → `cadenceStages`/`taskStages` + `progression` | **unchanged — already correct** |
| A / E / R | `Quotes.Quote_Type`, written in only 3 places (`pD:1503/1541` import, `pD:1710` hardcoded Acquisition, `aQL:187` hardcoded Renewal) | Derive at Quote creation: no prior CW Quote for this (Deal, Product) → Acquisition; contiguous term after a CW for the same Product → Renewal; CW exists for a **different** Product → Expansion |
| FTP vs RTP on the Quote | `quoteOppType` from the **Deal** floor (`pD:390-391`, re-asserted `pD:859`) | `CLASSIFY(attributed Contact.Stage)` (R14) |

**The A/E/R hole — CONFIRMED, previously unreported.** The activity-driven Quote create at `pD:1092-1105` writes `Subject, Quote_Stage, Account_Name, Deal_Name, Quote_Product, Opportunity_Type, Quote_Last_Deal_ID, Contact_Name, Contract_Date_*, Quoted_Items, Quote_Applied_Activity_Keys` — and **no `Quote_Type`**. `aQL:107` then skips it: `if(qtype != "Acquisition" && qtype != "Expansion" && qtype != "Renewal") continue;`. **A Quote created from a Task, Call or Meeting never enters the A/E/R lifecycle**: closing it Won creates no successor Renewal, closing it Lost never churns the Deal. Invisible today only because all 125 live Quotes came from import/scaffold/lifecycle.

**The RTP floor.** Legitimate as a relationship rule — an existing customer must not be demoted to MQL because a new prospect Contact was added, `pD:2299` correctly refuses to price an RTP Deal from Target ACV, and `rAS:61` reads `Onboarding|Renewal` as the customer signal. It becomes an **independent Deal lifecycle** at four points: (i) it writes `Deals.Stage`, which 8 sites copy into Activity snapshots — this *is* the measured 35-of-182 divergence; (ii) it flips `quoteOppType` FTP→RTP, changing `relevantQuotes` (`pD:2601`) → `termComplete` (`pD:2641`) → whether `commercial:sent`/`commercial:signed` fire — **the floor has already silently killed one transition path**, as the code itself documents at `pD:2580-2585`; (iii) `everRTPviaContact` is a **cross-Contact OR**, forbidden by §5.3; (iv) it is irreversible. **Verdict: keep the floor, split its scope** — relationship-level never-regress on the Deal, derived from the Deal's own stored stage plus its Closed-Won Quotes (reuse `rAS:58-77`'s test), never from other Contacts' completion stamps, and never feeding an Activity snapshot.

**Vocabulary — RESOLVED contradiction.** Trace B holds that live COQL returns **display space** on `Contacts.Stage`, `Task_Stage` and `Task_Sequence_Stage` (`Renewal`, `Demo Booking`, …) and that the legacy actuals (`Renewall`, `Demo Booked`, `Commercials Sent`) never surface at runtime; Trace C wanted `CLASSIFY()` keyed on the actuals and gated on an in-function probe. **Take Trace B**: it is backed by live COQL on both sides, by `pL:48`/`rCS:390-422`/`hTC:592` all being keyed in display space and working, and by the standing org fact that Deluge round-trips picklists in display space. `CLASSIFY()` is keyed on **display** names, **and additionally aliases the five legacy actuals** — that costs five map entries, removes the need for a gating probe, and is the only defensive posture that is safe either way. The actual/display split remains a real hazard for **bulk data migration only**.

### C3 Propagations that become wrong-by-construction under one Deal per Account

| # | Propagation | Why it breaks | Live evidence |
|---|---|---|---|
| **C1** | `everRTPviaContact` (`pD:222-223` → `:373`) | One Contact who ever reached Onboarding floors the Deal at RTP **permanently, for every other Contact on the Account** → `pD:2260` writes `Stage='RTP'` → 8 sites stamp RTP onto every new Contact's Activities | Account `…2869113`: 7 Contacts, 6 Renewal + **1 Demo Booking**. `…2855022`: 6 Contacts, 4 Renewal + **2 Proposal Preparation**. `…2903016`: 5, 4 Renewal + **1 Proposal Preparation**. **Catastrophic** |
| **C2** | `pD:859` re-asserts `Opportunity_Type = quoteOppType` on every activity Quote update | Contact B's new Acquisition Quote is stamped RTP because Contact A reached Renewal → changes `relevantQuotes` → `termComplete` → **Contact B's quote changes whether Contact A's transition fires** | — |
| **C3** | `cMR:34-47` → `cAT:88-98` Deal-level review, no `Task_Sequence_Stage`, `Blocks_Sequence=Yes`, attached to the leading Contact | Unscoped blocking Task blocks `resume` at **every** Stage. `[quote_product_mismatch]`, `[product_unresolved]`, `[deal_viability_unresolved]`, `[pipeline_target_acv_unresolved]` are all Deal-level → they **permanently block the leading Contact's cadence for problems caused by other Contacts**. `cAT:77-80` even reopens a deferred one per new issue code | 87 live reviews, all `Task_Sequence_Stage` null |
| **C4** | `hEE:50-51` falls back to `deal.Contact_Name` | `hEE:127` can escalate to `contactlost:No Response` → `rCS:1216-1221` marks the **wrong** Contact Lost | Blast radius 0 today (WF009a-e never fired) |
| **C5** | `Deals.Demo_Reminder_Send_At` — a single datetime slot (`hME:439-440`, `recur_cycle: once`) | Two Contacts booking demos → the second write overwrites the first and **one reminder is silently lost**; the one that fires goes to `deal.Contact_Name`, not the attendee | — |
| **C6** | `pD:180` (all Account Contacts, drives Stage) vs `pD:2184` (Deal-role Contacts, drives State) | Two different candidate sets on the same record. Today the product-scope guard at `pD:472-487` keeps them apart; once `dealProdKey` is blank, `stampAllowed=true` for everyone and the sets converge **by accident** | — |
| **C7** | `aQL:93` `openRenewalId` — one open Renewal **per Deal** | Product B's Renewal is treated as Product A's slot; `:122-130` bumps the wrong Quote's `Contract_ACV` additively | — |
| **C8** | `aQL:44-47,202` successor Product from `Deal_Product` | `if(dealProdId != "") { renewMap.put("Quoted_Items", …) }` → with `Deal_Product` blank, **every successor Renewal is created with no line and no Product**, silently | — |
| **C9** | `pD:1641-1736` 8z scaffold gated on `Deal_Product` (`:1658-1664`) | Scaffold **never fires** → the "no Open Deal without a Quote" invariant becomes unenforceable | — |
| **C10** | `pD:1898-1973` §6b "exactly one unique non-lost Quote product" | Raises `[quote_product_mismatch]` on **every** multi-product Deal — the normal case under the model | — |
| **C11** | `rAS:53` blank-product-key `continue` | `total` stays 0 → `Account_Status` freezes **org-wide** | ≥200 Accounts already unclassified |
| **C12** | `pD:100-107` `partnership_held` | Holds an Account's **entire** relationship out of automation because one product is Partnership. It has already frozen all 9 Partnership Deals: `Opportunity_Stage=null`, `Stage='MQL'` are `cRPD:108-109` create-time defaults, never a derivation | 9 Deals, 9 distinct Accounts, **0 Accounts mix B2B and Partnership** |
| **C13** | `pA:70-215` | `:117` skips every blank-product-key Deal → `canonicalByProduct` empty → `:190-209` **creates a fresh Deal per product**. `processAccount` would manufacture the very fan-out the model forbids | — |
| **C14** | `pD:2107` writes `Deal_Key` in the **same map** as `Amount`, `Contact_Name`, `Opportunity_State` | Per blocker B4 a rejected key voids the whole map — Amount, leading Contact and viability silently unwritten, with `SUCCESS` returned | — |

**Forward ruling on a mixed-pipeline Account** (0 live, so this is design not migration): `Deals.Pipeline` is a first-class Deal attribute set once at instantiation from the first product's classification, human-editable thereafter, **never derived from the Quote set and never auto-flipped**. A Quote for a Product whose classification differs raises `[pipeline_product_mismatch]` and changes nothing. Do **not** create a second Deal (§11 forbids it) and do **not** reintroduce a product→pipeline function.

### C4 Acceptance tests

| Test | Fixture | Exact assertions |
|---|---|---|
| **C-T1** pipeline read | after work item 6: a throwaway Deluge function logging `resolveDealPipeline` for Deal `991103000003645011` (B2B) and one of the 9 Partnership Deals | Returns `"B2B"` and `"Partnership"` respectively. **Assert neither returns `""`** — and assert that a Deal with a blank/unknown pipeline returns `"unresolved"`, **not** `"B2B"` (the `pFPK:24` fail-open regression) |
| **C-T2** cross-Contact RTP floor | one fixture Account, one Deal, Contact X `Stage='Renewal'` with `Contact_Completed_Onboarding_At` set, Contact Y `Stage='Marketing Consent'`. Activate Y via B-T0's method | The Call created for Y: **`Call_Task_Opportunity='MQL'`**, `Call_Task_Stage='Marketing Consent'` — **not** `RTP`/`Renewal`. Any `cAT` review raised for Y: `Task_Opportunity='MQL'`, `Task_Stage='Marketing Consent'`, **`Task_Sequence_Stage` non-null**. Deal may remain `Stage='RTP'` — that is the relationship fact and is allowed |
| **C-T3** Deal-less roll-up | A-T4's Account | `Accounts.Account_Status='Prospect'` non-null, `Accounts.State` non-null. Then run `rAS` on an Account whose single Deal has **blank `Deal_Product`/`Deal_Product_Key`** → assert `Account_Status` is still written (the `rAS:53` fix) |
| **C-T4** map isolation | fixture Deal; force a `Deal_Key` collision with an existing Deal, then trigger a reconcile | `Deals.Amount`, `Contact_Name`, `Opportunity_State` are **all written** even though the `Deal_Key` write is rejected/skipped; the key write appears as its own `updateRecord` |
| **C-T5** A/E/R hole | fixture Task with `Task_Contract_Products/Brands/Date_Start/Date_End/Frequency` populated, completed `Won` (this exercises P2 **from cold** — it has never run in production) | A Quote is created with **`Quote_Type` non-null and correct** (`Acquisition` when no prior CW for that Product). Close it `Closed Won` → assert exactly **one** successor Renewal exists, `Quote_Type='Renewal'`, **`Quote_Product` non-null**, `Quoted_Items` line count = 1, `Contract_ACV` carried from the predecessor, `Quote_Applied_Lifecycle_Keys` contains `Origin:AcqCW:<qid>` |
| **C-T6** per-Product Renewal slot | one Deal, two Products, both with a CW Acquisition Quote | **two** open Renewals exist, one per Product. Then close an Expansion CW for Product A → assert **only Product A's** Renewal `Contract_ACV` is bumped |
| **C-T7** per-Event reminder | after work item 28: two fixture Meetings on one Deal, different `Who_Id` | **two** reminder sends, each addressed to its own Event's `Who_Id`; `Deals.Demo_Reminder_Send_At` is no longer read by the reminder path |
| **C-T8** scaffold idempotency | fixture Deal with 2 linked Products, saved twice within 2 s | `count(Quotes where Quote_Applied_Activity_Keys like 'Scaffold:Deal:<deal>:%') = 2` (one per Product), **not 3 or 4** — proves the per-(Deal, Product) key plus the readback-and-collapse |
| **C-T9** snapshot freeze, full | from C-T2's end state, advance Contact Y two Stages | Every Activity created for Y before the advance retains its original `*_Task_Stage` / `*_Task_Opportunity` / `*_Task_Pipeline`. Zero rows change. This is the §8.3 / §14-invariant-11 test |

---

## Cross-flow: the ordered work list

Work top to bottom. "Unblocks" names the flow section the item satisfies; "Gate" is what must be true before the item ships or before the next item starts. Items 1–5 are safe today and depend on nothing.

| # | What changes | Unblocks | Gate |
|---|---|---|---|
| **1** | **Nothing — run B-T0.** One UI save on Task `991103000003663003` (`Task_Sequence_Type='Call'`, `Task_State='Won'`, leave native `Status` alone), with WF008's `last_executed_time` recorded before and after | B2 (settles the zero), and every Flow-B item below | None. Costs one save on a fixture. **If WF008 does not advance, stop and diagnose invocation — items 2, 6 and 7 are moot until it does** |
| **2** | `hTC:296` drop `&& tStatus == "Not Started"`; `hTC:407` and `hTC:648` stop writing `Task_Status`/`Status` (write `{"Task_State":"Open"}` only); rewrite the `hTC:329` review text so it no longer instructs the rep into `legacy_bootstrap`; add to `pC:498`'s Description *"Do not change the task's Status field — automation closes it for you."* | B3 gap 1 — the trap and both bricks | Publish `hTC` + `pC` alone, no signature change. Then B-T1 and B-T2 must pass |
| **3** | `pL:252` — add `{"trigger": List()}` to the `Contact_Role1` stamp | A3 gap 3 (removes the most likely duplicate-Deal racer) | Behaviour-preserving; publish independently. A-T7 pre/post |
| **4** | **CREATE** `activity/_util_classifyContactStage.deluge` — `classifyContactStage(stage) → MQL\|SQL\|FTP\|RTP`, keyed in **display** space with the 5 legacy actuals aliased, pure, no CRM reads | B3 gap 3, C2, C-T2 | Zero risk — nothing calls it. Publish first |
| **5** | **Probe only:** one controlled *sequential* insert of a Deal carrying an existing `Deal_Key` on a fixture Account; observe `DUPLICATE_DATA` vs success | The idempotency design in item 15 | Concurrent non-enforcement is CONFIRMED; this settles whether sequential inserts are rejected. **Until settled, design as if not enforced** |
| **6** | **REWRITE** `rDP` to read `Deals.Pipeline` over `invokeurl` REST; delete the `Deal_Product_Key` route and the false "UNREADABLE" comment at `:11-13`; ensure a blank/unknown pipeline returns `"unresolved"`, **never** `"B2B"` | B3 gap 4; C1/C2; all `*_Task_Pipeline` snapshots; unblocks the `Deal_Product_Key` retirement | **C-T1 must pass first.** Highest single-file blast radius in the programme — `rCS:977` uses the return as the B2B dispatch gate, and a blank return stops every Contact's cadence silently |
| **7** | `cAT:130-135` — `Task_Opportunity ← classifyContactStage(contact.Stage)`, `Task_Stage ← contact.Stage` (requires `cAT` to read the Contact; it currently reads only the Deal), `Task_Pipeline ← rDP`, **and set `Task_Sequence_Stage`** | B3 gaps 3 and 5 (fixes C3 — the unscoped blocking review) | Items 4 and 6 published |
| **8** | `pC:518-525` — `Task_Opportunity ← classifyContactStage(contactStage)`; delete the `getRecordById("Deals",…)` read | B3 gap 3 | as above |
| **9** | `sSE:104,384,402,423` — re-source from `classifyContactStage(stage)`; make `:399-403` **create-only** | B3 gap 3 | as above |
| **10** | `hCO:125,192-194` — re-source; **delete the whole `:268-270` re-stamp block** | B3 gap 3 | as above |
| **11** | `hME:113,401-402` — re-source **and** add the `== ""` write-once guard already used at `:422` in the same map | B3 gap 3 | as above |
| **12** | `rCS:1085` — delete the `ifnull(…, deal.get("Stage"))` fallback. **Nothing else in `rCS` is repointed** | B3 gap 3; corrects `V6_FIELD_USE_CONTRACT.md` §5 | as above. C-T9 after items 7–12 |
| **13** | **REWRITE** `rAS` — remove `:53`'s `if(dpKey=="" && dpId=="") continue;` and the `::active` scoping at `:52`; classify a **Deal-less** Account as `Prospect` instead of returning at `:81-85` | A3 gap 2; A-T4, A-T5, C-T3 | **MUST publish before item 15** or `Account_Status` freezes org-wide |
| **14** | `booking/integrations/zoho/index.js:470-482` — stop substring-matching the Product name inside `Deal_Name`; resolve the Account's single Deal | A3 gap 6 | **MUST reach Production before item 15.** A-T8 |
| **15** | **RENAME + REWRITE** `cRPD` → `_util_resolveOrCreateAccountDeal(accountId, accountKey, accountName)`: `Deal_Key = Account_Key`, `Deal_Name = Account_Name`, no `Deal_Product`/`Deal_Product_Key` writes, `Pipeline` set once at instantiation from the first product's classification; **add code-side enforcement** — after insert, re-search `Deal_Key`; if >1 row keep the lowest id, Lost the rest with `Lost_Reasons="Duplicate / Test Record"`, re-verify | A1/A2 all cases; C3 | Items 5, 13, 14 done. A-T1, A-T7 |
| **16** | `pD:100-117` — **delete** `partnership_held` and the `product_key_unresolved` hold. Partnership scoping lives at `rCS:977-990` only | C3 C12 — unfreezes 9 Deals | Run on **one** Partnership Deal and inspect its first-ever roll-up before releasing the other 8 |
| **17** | `pL` step 6 — stop the fan-out: one `resolveOrCreateAccountDeal` call; `prodBuckets` becomes the **Quote** list; concatenate **all** buckets' `terms_encoded` into a **single** `import_bootstrap` call (P1's per-term dedup already handles multi-product); gate Deal creation on the A1 instantiation rule so (d) and (e) create none; drop `seedDeal`'s unconditional `Contact_Name` write. **Preserve the tuple-capture-before-convertLead ordering** | A1/A2 cases b–f | Item 15. A-T1…A-T6 |
| **18** | `pC:265-358` — delete the per-product Deal loop, the B2B/Partnership driver election, and the `multi_product_sequence_ambiguous` branch (**delete, do not bypass** — it becomes unreachable by construction) | A3 gap 1; B1 | Item 15. A-T2 |
| **19** | **REWRITE** `pA:70-215` — resolve the one Deal per Account; if the Account holds more, **raise a review, never auto-Lost**; never create a Deal per product; reconcile and roll up. Also decide the trigger posture of `pL:371` (unsuppressed Account create → WF001c → `pA`): suppress it, or make `pA` provably idempotent against a concurrent `pL` | C3 C13 | Item 15 |
| **20** | `pD:2107` — move the `Deal_Key` write into its **own** `updateRecord` ahead of the roll-up map | C3 C14 | C-T4 |
| **21** | **LIVE MIGRATION GATE (data, not code).** Merge or key-blank the 21 surplus Deals on 17 Accounts; collapse the 2 duplicate-key E2E Deals (`…3645011` / `…3655003`); collapse the 2 duplicate Betsson scaffold Quotes (`…2924001` / `…2933001`) | Everything below | Items 15–20 published. No item below ships until this is clean |
| **22** | `pD:222-223` / `:373-380` — drop `everRTPviaContact` as an input to `everRTP`; derive the floor from the Deal's own stored stage plus its Closed-Won Quotes (reuse `rAS:58-77`). Keep `Contact_Completed_*_At` as Contact history | C3 C1 | Item 21. C-T2 |
| **23** | `quoteOppType` at `pD:390-391`, re-assertion at `pD:859`, and `hTC:825,1005,1306` → `classifyContactStage(attributed Contact.Stage)` (R14) | C3 C2; unblocks the suppressed `commercial:*` transitions | **Publish with item 22** — these key the same Quote match set as `pD:388-391`; split them and Draft Quotes duplicate |
| **24** | **REWRITE** `aQL` — successor Product from the **predecessor Quote** (`:202`), not `Deal_Product` (`:44-47`); `openRenewalId` (`:93`, `:139-156`) scoped **per (Deal, Product)** | C3 C7, C8 | Publish **before** item 25. C-T5, C-T6 |
| **25** | `pD:1641-1736` 8z — re-drive the scaffold from the Contacts' `Products_Linked`; key per **(Deal, Product)**; add post-write readback-and-collapse | C3 C9 | Item 24. C-T8 |
| **26** | Close the A/E/R hole: derive and write `Quote_Type` in the activity create at `pD:1092-1105` and in `_util_matchDraftQuotes` | C2 | C-T5. Note this is the **first ever** production exercise of P2 |
| **27** | **OWNER RULING + code:** may a Contact activate with `Who_Id` and no `What_Id`? Recommended **yes** — §5.4 scopes sequencing to the Contact and §2 allows a Deal-less Account, so the Deal requirement is a `Deal = Account × Product` carry-over. If yes: relax `hTC:67-71`, and remove the `pC:261`/`pC:312` returns before the activation gate | A1 case (d); B3 gap 2 — makes **419** Contacts eligible | This is the one genuine product decision in the programme. B-T4, A-T4 |
| **28** | Demo reminder: **deactivate WF010c now** (an armed wrong-recipient reminder is worse than none); create a `date_or_datetime` rule on **Events** using `Events.Reminder_Send_At` (already written by `hME:410` — **reverse its retirement**); rewrite `sendDemoReminder(eventId)` to gate on the Event and its `Who_Id`. Then retire `Deals.Demo_Reminder_Send_At` and `hME:439-440` | C3 C5 | `sendDemoReminder:5-7`'s claim that date workflows cannot bind Events is false — `getWorkflowConfigurations(Events)` confirms feasibility. C-T7 |
| **29** | `rCS:1250` — evaluate Deal viability across **all** the Deal's Contacts, not only when the lost Contact is `Contact_Name`; `rCS:1320` — `runReconcile` must not depend on primacy; `pD:472-487` + `pD:180`/`:2184` — unify the candidate sets on one definition | C3 C6; §6.5 | Item 21 |
| **30** | `cMR:39-43` — drop the `Deal_Primary_Contact` → `Contact_Name` fallback, require the subject Contact; `hEE:45-52` — make `relatedContactIdStr` **required**, delete the `deal.Contact_Name` fallback | C3 C3, C4 | The WF009a–e rule re-scope is blocked on U4 below; the Deluge half is not |
| **31** | `pD:1898-1973` §6b — stop raising `[quote_product_mismatch]` for a multi-product Deal (it is now the normal case) | C3 C10 | Item 21 |
| **32** | Remove all `Blocks_Sequence` writers (`pC:452,508`; `rCS:1603,1648`; `hTC:219`) → **publish** → then delete the field. Same writers-first order for `Deal_Product`, `Deal_Product_Key`, `Deals.Company_Tier`, `Deal_Primary_Contact` (collapse its 3 readers onto `Contact_Name` first), `Accounts.State`, `Accounts.Lost_Reasons`. Deregister `pFPK` and `cRPD`; deregister `sendCommercialFollowUp` and delete `Deals.Next_Comm_Follow_Up_Date` with its WF010d rule | Field-contract cleanup | **Blocker B4 order is mandatory**: an unknown api_name voids the entire `updateRecord` map. Gate each deletion on a full update-map readback against a live Deal |

**Frozen — touch in no wave, both pending an owner ruling and neither required for any flow to become model-correct:** `pD:2353-2470` (the contract ledger, blocker B2) and `pD:2318-2335` (the tier-fallback `Amount` branch, R6 — 57.3% of headline value).

**Product decisions carried, not code:** the Demo Hosted call-script shortfall (code runs 5 steps, 3 scripts exist); the Onboarding divergence (corpus specifies a 5-step call cadence, code raises one Task); the "Marketing Qualification" folder name vs the "Marketing Consent" Stage; and G9 — whether `Deals.Automation_Suppressed` becoming an **Account-wide** kill switch is intended.

---

## What is still unknown

| # | Unknown | Exact check that settles it |
|---|---|---|
| **U1** | Whether the `Deals.Deal_Key` UNIQUE index rejects a **sequential** duplicate insert. Concurrent non-enforcement is CONFIRMED (two live Deals, same key, same second); sequential is untested, and the org is known to return no `DUPLICATE_DATA` on duplicate Lead/Task inserts | On a fixture Account, `createRecord("Deals", {... "Deal_Key": "jurnii-e2e.dev::jurnii_360" ...})` and observe whether the response is `DUPLICATE_DATA` or `SUCCESS`. Until settled, **assume not enforced** and keep item 15's code-side reconcile |
| **U2** | Whether `zoho.crm.getRecordById("Deals", id).get("Pipeline")` returns a value **in-function**. COQL and REST are proven (96/96, re-confirmed twice) | A throwaway Deluge function logging both `getRecordById(...).get("Pipeline")` and an `invokeurl` GET for Deals `991103000003645011` and one Partnership Deal. Item 6 mandates REST regardless, so this only decides whether a simpler call is available |
| **U3** | Whether WF008 fires for **Deluge-created** Tasks. The 132 creates on 2026-07-21T12:45+ left `last_executed_time` at 2026-07-20T19:51 (INFERRED not); the UI-save side is untested | Item 1 (B-T0) settles the UI side directly. For the Deluge side: record `last_executed_time`, invoke `cAT` on a fixture to create one Task, re-read |
| **U4** | Whether Zoho offers a **Contacts** relational scope for the `mail_sent_*` triggers (WF009a–e are currently scoped on Deals). Not exposed by the API | Setup → Workflow Rules → new rule on Contacts → inspect the trigger dropdown for `mail_sent_*` relational options. Blocks only the rule half of item 30 |
| **U5** | Whether `Quotes.Quote_Product` agrees with the `Quoted_Items` line Product on all 125 live Quotes (field-contract blocker B3) | `GET /crm/v6/Quotes/{id}?fields=Quoted_Items` per record, compared against `Quote_Product`. Subform lines are not COQL-readable |
| **U6** | Why `Accounts.Account_Source_Class` is **0/372 populated despite two writers** (`pL:355`, `pL:397`) — off-layout (writes silently discarded) or `Imported_Record_Type` always blank | `getLayouts("Accounts")` → is `Account_Source_Class` on the layout? plus `select id from Leads where Imported_Record_Type is not null limit 1`. One of the two answers is definitive |
| **U7** | Which racer produced the duplicate `jurnii-e2e.dev::jurnii_360` Deals — `pL:252` self-refire, WF001b2, or a late WF001c. Function-execution logs are not API-reachable | After item 3 publishes, re-run the E2E harness 5× and check `count(Deals where Deal_Key=<key>)`. If duplicates stop, `pL:252` was the racer; if they persist, the racer is WF001b2/WF001c and item 15's reconcile is load-bearing rather than belt-and-braces |
| **U8** | Whether an adversarial pass would overturn any `V6_CRUD_PLAN.md` per-file verdict (that document's own U1) | Not yet run. It is the only outstanding review of the plan's file-level conclusions, and it should run before item 15 opens its publish window |