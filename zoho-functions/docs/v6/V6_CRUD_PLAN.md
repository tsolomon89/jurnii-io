# v6 CRUD Plan — Zoho workflow rules and Deluge functions

**Created:** 2026-08-17 · **Marker:** `jurnii-doc-reconciliation-2026-08-17`
**Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)
**Field authority:** [`V6_FIELD_USE_CONTRACT.md`](V6_FIELD_USE_CONTRACT.md)

What must be **created, updated, renamed or deleted** — in Zoho workflow configuration and in the
Deluge source — to move from the implemented `Deal = Account × Product` model to the approved
`one Account → one persistent Deal` model.

> ⚠ **Verification status.** The live inventory below is CONFIRMED — all 18 rules were read
> individually (both `execute_when.details.criteria` *and* `conditions[].criteria_details.criteria`),
> and all 38 Deluge files were read against the working tree. **The adversarial verification pass did
> not run** — it was cut short by a session limit. Treat the CRUD *verdicts* as single-pass analysis:
> well-evidenced, not yet refuted. Re-run the refutation before executing any wave.

> **Nothing in this document has been executed.** No rule created, updated, deleted or toggled; no
> function published or deregistered; no field deleted; no record written.

> 🔄 **Superseding decision, 2026-08-17: the existing records are NOT migrated — they are rebuilt.**
> The owner confirmed the org is a dev instance with no Reports/Dashboards/Analytics and disposable
> data. See [`V6_REBUILD_VS_MIGRATE.md`](V6_REBUILD_VS_MIGRATE.md). This removes the `Deal_Key`
> UNIQUE-collision gate, survivor election, Quote/Activity reparenting and per-Account rollback from
> the plan entirely. **The code and workflow verdicts below are unaffected** — but the ordering
> inverts: the import path must be correct *before* the data exists, so there is no transitional
> multi-Deal state to tolerate.

---

## 1. Headline results

**1 · The workflow surface is reachable, and blocker B5 is closed.** The field contract recorded the
workflow REST surface as unreachable. It is not. All 18 rules were read. `getConnectedWorkflows`
returned empty, so the 18 are exhaustive: **18 configured, 17 active, WF021 the only inactive one.**

**2 · No live rule binds any of the flagged fields.** Exhaustive search across every rule's
`execute_when` criteria, every `conditions[]` criteria block, every `relational_criteria` and every
action field-mapping:

> **No rule binds** `Deal_Product_Key` · `Deal_Product` · `Deal_Key` · `Blocks_Sequence` ·
> `Reminder_Send_At` · `Commercials_Status` · `Commercial_Outcome` · or any of the **nine Activity
> snapshots**.

Their retirement is gated only on code writers (B4) and the manual console check (B1) — **not on any
workflow rule**. Exactly **one** retirement candidate in the whole org is rule-blocked:
`Deals.Next_Comm_Follow_Up_Date`, via WF010d.

**3 · WF004 does not exist — refuted three ways.** Absent from the 18-rule listing; a
`getWorkflowRuleById` on the exact id asserted in `FINAL_CANONICAL_FIELD_MATRIX.md` returns no rule;
and `handleCommercialsStatusChange` is absent from the function registry. Eight documents assert it
exists.

**4 · The prior audit's criteria reading was incomplete, and it mattered.** Eight items live only in
`conditions[]` and are invisible to the list endpoint — including an **entire second condition block on
WF006** (binding a third field, `Next_Follow_Up_Date`) and **two undocumented `assign_owner` actions**
on WF007 and WF008.

**5 · The WF020→WF021 cutover is not behaviour-neutral.** Both carry the identical action id
`991103000001581241` — confirmed byte-identical. But WF020 fires only on a `Quote_Stage` change while
**WF021 fires on every Quote create or edit, unconditionally.** `processDeal` writes Quotes at five
sites; each becomes a WF021 invocation. Since both `handleQuoteStageChange` and `processDeal` write
`Quote_Last_Deal_ID`, **activating WF021 amplifies the known move-detector defect rather than fixing
it.** My earlier plan called this "a pure trigger-surface swap" — correct about the action, wrong about
the blast radius.

**6 · WF010c misfires under consolidation.** `sendDemoReminder` sends to `deal.Contact_Name` — the
Deal's *leading* Contact. Once every Contact's meeting hangs off one Deal, Contact B's demo reminder
goes to Contact A. Worse, `Deals.Demo_Reminder_Send_At` is a **single datetime slot** with
`recur_cycle: once` — two Contacts booking demos means the second write overwrites the first and **one
reminder is silently lost**.

**7 · The justification for that design is false.** `sendDemoReminder.deluge:5-7` claims *"date-based
workflows cannot be bound to the Meetings/Tasks modules."* WFC-SchedEmail is a live `date_or_datetime`
rule on `Tasks.Due_Date`, and `getWorkflowConfigurations(Events)` returns `date_or_datetime` with
`functions` supported. **Rebasing the demo reminder onto Events is available and model-conformant.**

**8 · The suspected WF001c↔WF001d write-back loop is REFUTED.** `processDeal:2490,2550` and
`processAccount:64,162` all pass `noTrigger = {"trigger": []}`.

---

## 2. Zoho workflow rules — CRUD

**Live inventory: 18 rules. Verdicts: 11 KEEP · 6 UPDATE · 2 DELETE · 1 CREATE.**

| Rule id | Name | Module | Active | Trigger + repeat | Criteria fields bound | Verdict | Change |
|---|---|---|---|---|---|---|---|
| `…000663622` | WF001a Process Lead | Leads | ✅ | `create_or_edit`, repeat=**true**; no criteria | none | **KEEP** | None. The model conflict is inside `processLead`, not the rule. Booking's `updateLeadWorkflowEnabled` depends on it firing unconditionally |
| `…000663630` | WF001b0 Process Contact | Contacts | ✅ | `field_update`, repeat=**true**, `match_all=false` | `Stage`, `State`, `Status`, `Contact_Role1`, `Account_Name` | **KEEP** | None. Becomes **more** correct under the model — Contact is the opportunity, so a Contact-field trigger is the right entry point |
| `…001499202` | WF001b2 Process Contact | Contacts | ✅ | `create`; no criteria | none | **KEEP** | Not redundant with b0 — a `field_update` rule does not fire on create |
| `…000663648` | WF001c Process Account | Accounts | ✅ | `create_or_edit`, repeat=**true**; no criteria | none | **KEEP** ⚠ | None to the rule. Under R1 this unguarded rule is where the **UNIQUE ci constraint on `Deal_Key`** starts rejecting second-Deal creates. Handle idempotency in `processAccount`, not by adding criteria |
| `…000663638` | WF001d Process Deal | Deals | ✅ | `create_or_edit`, repeat=**true**; no criteria | none | **KEEP** | None. Loop concern refuted (`noTrigger` is passed) |
| `…000808046` | WF006 Handle Call Outcome | Calls | ✅ | `anyaction` | **cond 1:** `Call_Task_State`, `Sequence_Managed` · **cond 2:** `Next_Follow_Up_Date`, `Sequence_Managed` | **KEEP** | None. ⚠ Records a fragility: WF006 compares `Sequence_Managed == "Yes"` (string) while WFC-SchedEmail uses `== true` (boolean) |
| `…000782052` | WF007 Event Meeting Handler | Events | ✅ | `create_or_edit`, repeat=**false**; no criteria | `Events.Owner` | **KEEP — trigger surface FROZEN** | **Do not add criteria.** `booking/integrations/zoho/index.js:371-375` documents the dependency: a triggers-enabled PUT must re-fire `handleMeetingEvent`. ⚠ Investigate the undocumented `assign_owner` action against multi-calendar host selection |
| `…000784145` | WF008 Task Completion | Tasks | ✅ | `create_or_edit`, repeat=**false**; no criteria | `Tasks.Owner` | **KEEP** | None. ⚠ Carries a second, undocumented `assign_owner` action |
| `…000790073` | WF009a Email Replied | Emails | ✅ | `mail_sent_replied`; **never fired** | none (relational: **Deals**) | **UPDATE** | Re-scope `relational_criteria` off Deals — §3 |
| `…000806019` | WF009b Email Bounced | Emails | ✅ | `mail_sent_bounced`; **never fired** | none (relational: **Deals**) | **UPDATE** | as WF009a |
| `…000789167` | WF009c Email Not Replied | Emails | ✅ | `mail_sent_notreplied`, 3 days; **never fired** | none (relational: **Deals**) | **UPDATE** | as WF009a |
| `…000796107` | WF009d Open & Unreplied | Emails | ✅ | `mail_sent_opened_notreplied`, 3 days; **never fired** | none (relational: **Deals**) | **UPDATE** | as WF009a |
| `…000799022` | WF009e Email Clicked | Emails | ✅ | `mail_sent_clicked`; **never fired** | none (relational: **Deals**) | **UPDATE** | as WF009a |
| `…000802001` | WF010c Demo Reminder | Deals | ✅ | `date_or_datetime` on `Demo_Reminder_Send_At`; **never fired** | `Demo_Reminder_Send_At`, `Automation_Suppressed` | **DELETE + CREATE replacement** | Misfires under consolidation (§1.6). Rebase onto **Events**. Interim: **DEACTIVATE** rather than leave a wrong-recipient reminder armed |
| `…000790038` | WF010d Comm Follow-Up | Deals | ✅ | `date_or_datetime` on `Next_Comm_Follow_Up_Date`; **never fired** | **`Next_Comm_Follow_Up_Date`**, `Automation_Suppressed` | **DELETE** | Settled retirement. 0/96 populated, 0 writers, never executed. **⚠ THE ONLY RULE BLOCKING A FIELD RETIREMENT** |
| `…001581243` | WF020 Quotes | Quotes | ✅ | `field_update` on `Quote_Stage`, repeat=false | `Quote_Stage` | **DEACTIVATE → DELETE** | Cutover step 2 — §4 |
| `…001699034` | WF021 Quotes Create/Edit | Quotes | ❌ | `create_or_edit`, repeat=**false**; **no criteria at all** | **none** | **UPDATE (activate)** | Cutover step 3 — §4. ⚠ Strictly wider than WF020 |
| `…001499121` | WFC-SchedEmail | Tasks | ✅ | `date_or_datetime` on `Due_Date`, 09:00; **never fired** | `Due_Date`, `Task_Sequence_Managed`, `Status`, `Task_Type` | **KEEP** | None. Note it has never fired despite `Task_Type` being 219/219 populated |

**CREATE — exactly one rule the model needs that does not exist:** a demo-reminder rule on **Events**,
replacing WF010c. Feasibility confirmed via `getWorkflowConfigurations(Events)`. The Meeting carries
the Contact in `Who_Id`, so the reminder reaches the right person and each meeting gets its own
trigger. Events also exposes a `cancel` trigger, replacing the manual clear-on-Cancelled logic.

**Not needed:** a rule enforcing one-Deal-per-Account (the UNIQUE `Deal_Key` constraint plus code does
it, and a rule would add trigger surface to the hottest record); a Contacts `delete` rule; anything
replacing WF004.

### 2.1 Complete bound-field register — the 18 api_names a rule blocks from deletion

`Contacts.Stage` · `Contacts.State` · `Contacts.Status` · `Contacts.Contact_Role1` ·
`Contacts.Account_Name` · `Calls.Call_Task_State` · `Calls.Sequence_Managed` ·
`Calls.Next_Follow_Up_Date` · `Events.Owner` · `Tasks.Owner` · `Tasks.Due_Date` ·
`Tasks.Task_Sequence_Managed` · `Tasks.Status` · `Tasks.Task_Type` ·
`Deals.Demo_Reminder_Send_At` · `Deals.Automation_Suppressed` · `Quotes.Quote_Stage` ·
**`Deals.Next_Comm_Follow_Up_Date`**

Seventeen are KEEP. **One is a retirement candidate.**

---

## 3. WF009a–e — the email family is Deal-scoped

All five carry `relational_criteria: {module_selection: "specific", module: Deals}`, and
`handleEmailEvent.deluge:31-35` hard-returns `skip_no_deal` when the Deal arg is empty. Then `:45-51`
falls back to **`deal.Contact_Name`** when the Contact merge field is empty — attributing the email
event to the Deal's *leading* Contact regardless of who was actually emailed.

With one Deal spanning all an Account's Contacts, that fallback picks the wrong Contact **by
construction**. And `handleEmailEvent:113-131` can escalate to `routeContactSequence(...,
"contactlost:No Response")` — so a mis-attributed bounce can **mark the wrong Contact Lost**.

Blast radius today is zero — all five have never fired. Fix: re-scope off Deals and make
`relatedContactIdStr` the required argument.

⚠ **UNVERIFIED:** whether Zoho offers a Contacts relational scope for `mail_sent_*` triggers.
`getWorkflowConfigurations` does not expose email-event relational options; this needs the setup UI.

---

## 4. WF020 → WF021 cutover — corrected

All four checks confirmed: identical action id on both, WF021 inactive, `repeat: false` on both, WF020
triggering on `field_update`/`Quote_Stage` with no secondary criteria. It **is** a pure trigger swap in
terms of the action invoked.

**But it is not behaviour-neutral.** WF021 is strictly wider — unconditional on every Quote create or
edit. Mandatory order:

1. **Land the `Quote_Last_Deal_ID` adapter-ownership fix in `handleQuoteStageChange` and publish it.**
   Without this, WF021 amplifies the defect where `processDeal` re-stamps a moved Quote before the
   adapter sees it, so `oldDealId == newDealId` and the old Deal is never recomputed.
2. **DEACTIVATE WF020.**
3. **Then ACTIVATE WF021.** Never overlapping — both are bound to the same function id, so an overlap
   double-invokes `handleQuoteStageChange` on every stage change, against the **additive** Expansion
   ACV bump at `_util_applyQuoteLifecycle:128`.
4. Verify, then **DELETE WF020**.

---

## 5. Deluge files — CRUD

**38 files under `zoho-functions/v6/`.** 17 registered as workflow functions (all with exact-name repo
files, zero drift); the other 21 are `automation.*` standalone helpers that
`getAllAutomationFunctions` does not enumerate — **absence there is not evidence they are
unregistered.**

| Verdict | Count | Files |
|---|---|---|
| **CREATE** | 1 | `_util_classifyContactStage` |
| **RENAME + REWRITE** | 1 | `_util_createOrReuseProductDeal` → `_util_resolveOrCreateAccountDeal` |
| **REWRITE** | 7 | `processDeal`, `processLead`, `processContact`, `processAccount`, `_util_rollupAccountState`, `_util_resolveDealPipeline`, `_util_applyQuoteLifecycle` |
| **UPDATE** | 9 | `handleMeetingEvent`, `routeContactSequence`, `handleTaskCompletion`, `sendSequencedEmail`, `handleCallOutcome`, `createAuxTask`, `createManualReview`, `_util_resolveManualReviewCode`, `_util_collectProductEvidence` |
| **DELETE** | 2 (+1 backup) | `_util_pipelineForProductKey`, `sendCommercialFollowUp` (+ a stray `.agents` backup) |
| **KEEP UNCHANGED** | 18 | incl. all 5 email wrappers |

### 5.1 CREATE — `activity/_util_classifyContactStage.deluge`

`string automation.classifyContactStage(string contactStage)` — Contact Stage → `MQL/SQL/FTP/RTP`.
Pure, no CRM reads.

**Why it must exist:** §8.3 fixes `*_Task_Opportunity` to the Contact's classification. **Ten** live
sites currently read `Deals.Stage`. Without one shared owner the repoint becomes ten copies of the
mapping. It also replaces the correct-but-private `stageOpportunity` map at
`routeContactSequence:414-422`.

**Publish first — nothing calls it until Wave 2, so it carries no risk.**

### 5.2 The five most consequential file changes

| File | Change | Why it matters |
|---|---|---|
| `_util_rollupAccountState.deluge:53` | **RM** `if(dpKey == "" && dpId == "") continue;` | ⚠ **Worse than previously understood.** The corrected Deal has neither `Deal_Product` nor `Deal_Product_Key`, so this `continue`s on **every** Deal, `total` stays 0, the function returns having written nothing, and **`Accounts.Account_Status` freezes silently org-wide.** Must publish **before** Wave 3 |
| `processDeal.deluge:100-117` | **RM** the `partnership_held` return | Holds an Account's **entire** commercial relationship out of automation because one *product* is Partnership. Partnership scoping already exists, correctly placed, at `routeContactSequence:977-990` |
| `processDeal.deluge:2107` | `Deal_Key` write, new composition | ⚠ **The single hardest live gate.** `Deal_Key` is UNIQUE ci. The first Deal rekeyed to a bare `Account_Key` wins; the other 21 surplus Deals **400**. Per B4 a rejected key can void the whole `dUpd` map — Amount, `Contact_Name`, `Opportunity_State` all silently unwritten |
| `_util_applyQuoteLifecycle.deluge:202` | successor Product from the **predecessor Quote** | With `Deal_Product` blank, `if(dealProdId != "")` skips `Quoted_Items` and **every successor Renewal is created with no line and no Product — a silent data-quality failure, not an error.** Also `:80-233`: the "one open Renewal per Deal" slot must become **per (Deal, Product)** |
| `_util_resolveDealPipeline.deluge:29-33` | read `Deals.Pipeline` over REST | ⚠ **Highest blast radius of any single-file edit.** `routeContactSequence:977` uses the return as the **B2B dispatch gate**. A blank return stops **every** Contact's cadence silently. Mandatory pre-publish gate: live read-back on one B2B and one Partnership Deal |

### 5.3 DELETE — decisive

1. **`_util_pipelineForProductKey.deluge`** — Product→Pipeline has no home in the model; `Deals.Pipeline`
   is proven readable 96/96. Deregister only after all **six** callers publish.
2. **`activity/sendCommercialFollowUp.deluge`** — settled retirement, never fired. Order: **WF010d rule
   → function → field.**
3. **`_util_createOrReuseProductDeal.deluge`** — deleted as a *path*; replaced by a new name and
   signature. Deregister only after all three callers publish.
4. **`.agents/context/zoho-backups/20260615T121415Z/_util_resolveContactAction.deluge`** — a dated
   backup, no live counterpart, no caller. Nothing to deregister.

**Explicitly NOT deleted despite looking Product-shaped** — each is capability the model *requires*:
`_util_computeProductKey` (Quote grouping survives), `_util_resolveDealProduct` (the canonical-Product
resolver Quote creation needs), `_util_collectProductEvidence` / `_util_normalizeToProductQuoteTuples`
(§8.4 makes Activity product evidence an input to Quote reconciliation — *more* central),
`_util_matchDraftQuotes` (`Quote_Product` is the only queryable per-Product discriminator),
`_util_rollupAccountState` (rewritten — `Account_Status` is a fact no Deal field carries).

---

## 6. Publish sequence

Deluge resolves `automation.<fn>` at **runtime**, so a signature change is a hard cut — callee and
every caller must land in one window. Nothing is deployable over MCP; the owner republishes by hand.

| # | Window | Files | Risk if out of order |
|---|---|---|---|
| P1 | **W0** | `_util_classifyContactStage` **(new)** | None. Must precede every consumer |
| P2 | **W1** | `_util_resolveDealPipeline` | ⚠ Gate on a live read-back of one B2B and one Partnership Deal first. Late → the three Pipeline mirrors go blank |
| P3–P8 | **W2** | `createAuxTask`, `createManualReview`, `handleCallOutcome`, `sendSequencedEmail`, `routeContactSequence`, `_util_rollupAccountState` | `routeContactSequence` **must** be live before P14 — after that it is the *only* Partnership hold. `_util_rollupAccountState` **must** precede W3 or `Account_Status` freezes org-wide |
| P9–P12 | **W3 — one window** | `_util_resolveOrCreateAccountDeal` **(new)**, `processLead`, `processContact`, `processAccount` | Signature change. Any one alone → every `createOrReuseProductDeal(6 args)` throws: **no Deal on conversion, no activation, silently.** `processAccount` must **raise a review, not auto-Lost** — §13 forbids merging Deals outside the approved migration |
| — | **LIVE MIGRATION GATE** | — | The 21 surplus Deals on 17 Accounts must be merged or key-blanked **before** W4 |
| P13–P16 | **W4 — one window** | `_util_applyQuoteLifecycle`, `processDeal`, `handleTaskCompletion`, `handleMeetingEvent` | `_util_applyQuoteLifecycle` **before** `processDeal` or every Renewal loses its product line. `handleTaskCompletion`'s three `Deal.Stage=="RTP"` repoints key the **same** Quote match set as `processDeal:388-391` — split them and Draft Quotes duplicate |
| P17–P18 | **W5** | `_util_collectProductEvidence`, `_util_resolveManualReviewCode` | Registry is fail-open; publish it last so nothing emits an unregistered code |
| P19 | **W6**, gated on B1/B4/B5 | Deregistrations + field deletions | WF010d rule → deregister `sendCommercialFollowUp` → delete `Next_Comm_Follow_Up_Date`. Deregister `_util_pipelineForProductKey` and `_util_createOrReuseProductDeal`. Then, only after a full update-map read-back, delete `Deal_Product`, `Deal_Product_Key`, `Company_Tier`, `Deal_Primary_Contact` |

**Cross-repo:** the booking `resolveProductDeal` fix must ship **before** W3's `Deal_Name` change.

**Frozen pending blockers — touch in no wave:** `processDeal:2353-2470` (contract ledger, **B2**) and
`processDeal:2318-2335` (tier-fallback Amount, **R6** — 57.3% of headline value).

---

## 7. Still unverified

| # | Item | What settles it |
|---|---|---|
| U1 | Adversarial refutation of every verdict here | Re-run the verify pass — it was cut by a session limit |
| U2 | The 21 `_util_*` helpers' live registration | `GET /settings/functions` (500s from this client) |
| U3 | WF007's `assign_owner` vs multi-calendar host selection | A booking-create trace |
| U4 | Zoho's relational scopes for `mail_sent_*` triggers | Setup UI — not exposed by the API |
| U5 | Whether WF008 fires for Deluge-created Tasks | One UI edit of any Task; watch `last_executed_time` |
| U6 | `zoho.crm.getRecordById("Deals",id).get("Pipeline")` | Confirmed for REST/COQL only |
| U7 | `CLASSIFY()` vocabulary space | One live read of `Contacts.Stage` in-function before publish |
| U8 | B2, B3, B6 from the field contract | Named queries in that document |

---

## 8. Repository corrections this analysis requires

- **Eight documents assert WF004 exists.** It does not: `FLOW_REFERENCE.md:42,148,161`;
  `jurnii_zoho_quote_product_contract_spec_v2.md:58`; `full-flow.mermaid:69,71`;
  `single-field-full-flow.mermaid:44`; `FINAL_CANONICAL_FIELD_MATRIX.md:155-158`;
  `AUDIT_01_ARCHITECTURE_E2E_QUOTE.md:88,98,108`.
- **`V6_FIELD_USE_CONTRACT.md:40,377` can mark blocker B5 closed** — the workflow surface is reachable
  and the field-binding question is settled.
- **`sendDemoReminder.deluge:5-7`'s date-workflow claim is false** and is the justification for a
  design that misfires under consolidation.
- **`_util_resolveDealPipeline.deluge:11-13`'s "UNREADABLE" claim is false** for REST/COQL.
