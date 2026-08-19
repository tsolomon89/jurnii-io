> # 📁 HISTORICAL — evidence preserved, one acceptance criterion corrected
>
> Diagnostic evidence stands. Its CONFIRMED/INFERRED/UNRESOLVED labelling is intact and its L161
> observation (125 line items across 125 Quotes, all `Sequence_Number: "1"`) is cited by the field-use
> contract as direct evidence for the one-Product-per-Quote invariant (authority §7.2).
>
> **One correction.** The Phase-C acceptance assertion at L60, `Meeting_Task_Opportunity == Deals.Stage`,
> **would fail a correct implementation.** Authority §8.3 requires that snapshot to carry the *Contact*
> opportunity's classification at Event creation, and §14.11 requires that it not change when the
> Contact later advances. Do not run that assertion as written.
>
> **Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)  ·  reconciled 2026-08-17 (`jurnii-doc-reconciliation-2026-08-17`)

---

## JURNII v6 AUTOMATION — OWNER BRIEFING
### Synthesis of four diagnostic passes, all read-only, live state as of 2026-08-15

**Three cross-report corrections applied before anything below.** (a) Report 4 listed "why does no Event carry `Ext_Calendar_Booking_ID`" as unresolved; Report 2 answers it with hard evidence — it is now a CONFIRMED FACT, not an open question. (b) Report 1 filed "`repeat:false` does not prevent edit-firing" as a CONFIRMED FACT; the underlying evidence does not support that strength and it is demoted to UNRESOLVED below, because Section 3's cutover depends on it. (c) Report 3's premise that WF020 is not bound to `handleQuoteStageChange` was wrong: both rules carry the identical action node.

---

## 1. ACTIVATION SYSTEM — 132 Tasks, 0 activation markers

### CONFIRMED FACT
- **The 132 Activation Tasks are all in exactly their as-created state.** Census of `Task_Type = 'Sequence Activation'`: `Task_State = Open` ×132, `Task_Status = New` ×132, `Task_Sequence_Type = null` ×132, native `Status` = `Not Started` ×129 / `Deferred` ×3, `Description` containing `ActivationCommand|` = **0**, `Modified_Time == Created_Time` on all 132.
- **No Task anywhere in the org has ever been edited after creation.** 0 of 219 Tasks has `Modified_Time` more than 60 s past `Created_Time` (independently reproduced in both the activation pass and the structural pass).
- **`Task_Sequence_Type` has no code writer at all.** Grep over `zoho-functions` returns reads only (`handleTaskCompletion:83,177`, `processContact:415`). `processContact.deluge:492-494` states the intent: the Task is *always* created blank so the rep selects Email/Call/Manual. `0/219` is the designed value, not a defect.
- **`Sequence_Activated_At` has exactly one writer, and it is reachable.** `routeContactSequence.deluge:1132-1136` writes it when `isActivationTrigger` (`:885`, `activate:email|call|manual`); `Sequence_Type` at `:1188`; commit `updateRecord("Contacts", …)` at `:1233` is unconditional and the map always carries `Stage`, so it can never be voided. The only caller passing `activate:*` is `handleTaskCompletion.deluge:662`.
- **The route from a completed Task to that writer is unbroken for the current population.** All 129 active Tasks satisfy `Task_Status = New` AND native `Status = Not Started`, which resolves at `handleTaskCompletion:296` to `lastKind = "absent"` → `:347 actOutcome = "activate"` → `:662`.
- **Five competing hypotheses are excluded by evidence, not by argument.** Fields off-layout: excluded — `Contacts.Sequence_Activated_At` and `Sequence_Type` are on the Contacts Standard layout `991103000000032039`, `visible:true`, `read_only:false`. Invalid picklist values: excluded — `Sequence_Type` actual values `Email|Call|Manual` are identical to the literals written. Eligibility never met: excluded — 129 Contacts hold a Task, all `State = Open` / `Sequence_State = Not Activated`. Idempotency guard halted execution: excluded — the guard fired correctly on exactly the 3 duplicate Contacts and deferred them. Function crashes: excluded — `getAutomationFunctionFailures` returns `[]`.
- **WF008 (Tasks, `create_or_edit`, no criteria, action = `handleTaskCompletion`) is ACTIVE but its `last_executed_time` is 2026-07-20T19:51:49** — before all 132 Tasks were created (130 on 2026-07-21, 2 on 2026-08-14).
- **None of the six Task-creating code paths suppresses triggers** (verified directly this pass): `processContact:527`, `createAuxTask:137`, `createManualReview:82`, `routeContactSequence:1607` and `:1670`, `sendSequencedEmail:426` all call `zoho.crm.createRecord("Tasks", map)` with **no** trigger map. WF008's silence is therefore not explained at the call site.

### INFERRED CAUSE
- **Primary (high confidence): the activation engine was never asked to run.** It stopped precisely at its designed human decision point. `Sequence_Activated_At 0/647`, `Sequence_Type 0/647` and `Task_Sequence_Type 0/219` are three views of one fact — no rep has ever completed an Activation Task — not three defects. *Confirmed by:* completing one Task (test below) producing the stamps.
- **Secondary (medium confidence): WF008 does not fire for Tasks created by Deluge from inside a workflow-invoked function.** The 2026-08-14 trace is clean: Lead → WF001a 13:40:37 → Account → WF001c 13:40:43 → Contacts → WF001b2 13:40:43 → Tasks created 13:40:56 and 13:41:15 → **WF008 unchanged since 2026-07-20**. Deluge creates do trigger workflows here (WF001c/WF001b2 prove it), so the differentiator is chain depth (Task = level 3) or a Zoho workflow-chaining cap. This does **not** explain the missing stamps — a create-time WF008 run would only have logged `activation_awaiting_commit` and written nothing (`handleTaskCompletion:392-396`) — but it means any future automation depending on WF008 firing at Task creation is currently inert. *Confirmed by:* a single UI edit of any Task advancing `WF008.last_executed_time`.
- **A live trap that will bite the first activation attempt.** Reaching `lastKind = "absent"` requires native `Status == "Not Started"` (`:296`). A rep who sets `Task_State = Won` *and* native `Status = Completed` in the same save falls through to the `:301` fallback, which requires `taskSeqType == contactSeqType` — and `Contacts.Sequence_Type` is null on all 647 — so it lands on `lastKind = "conflict"` (`:327-332`), raises `[activation_command_state_conflict]` and **writes nothing**. The rep-facing Description (`processContact.deluge:498`) says only "Set Task State = Won to start"; it does not warn against touching Status.

### OWNER DECISION
- **The smallest correction is a human action, not a code change.** On one active Activation Task — suggested: `991103000002854029`, Contact `991103000002882016` (Andy Wright, Proposal Preparation) — in the CRM UI set **`Task_Sequence_Type = Email`** and **`Task_State = Won`**, **leave native `Status` at `Not Started`**, save. Predicted chain, quoted from code: WF008 → `handleTaskCompletion` `:296 absent` → `:347 activate` → `:662 routeContactSequence(…, "activate:email", …)` → `:885 isActivationTrigger` → **`Sequence_Activated_At` stamped `:1136`**, **`Sequence_Type = Email` `:1188`**, committed `:1233`, Task closed and `ActivationCommand|state=Won|type=Email` written `:666`. A UI edit is a depth-1 trigger, so it is unaffected by the WF008 chain-depth inference. This same test settles the WF008 question as a by-product.
- **Amend the rep guidance, or relax the guard.** Either change the Description at `processContact.deluge:498` to state explicitly "do not change the Status field", or accept `tStatus == "Completed"` at `:296` when `taskStatusMirror == "New"`. Without one of these, the most intuitive rep gesture yields a Manual Review and no activation.

### UNRESOLVED DEPENDENCY
- **Whether WF008 fires on a rep UI edit of a Task.** No Task in this org has ever been human-edited, so there is zero direct evidence; the analogical evidence from WF007 is itself weaker than Report 1 claimed (see §3). Only a write settles it.
- **Whether `Sequence_Activated_At`'s writer existed on 2026-07-21.** Repo history begins at the 2026-08-02 consolidation import; pre-consolidation authorship is not visible. Moot — the Tasks were never completed at any time.
- **Runtime branch evidence.** `_util_logAutomationEvent` emits only a Deluge `info` line and writes no CRM record, so which guard each historical execution took cannot be queried. All conclusions above rest on record state plus code.
- **10 eligible Contacts hold no Activation Task** (91 match `Decision Maker + Open + Not Activated`; 81 have a Task). Not traced; candidates are the multi-driver / no-driver early returns at `processContact.deluge:345-358`.

---

## 2. MEETING POPULATION — 0/155 on every `Meeting_Task_*` field

### CONFIRMED FACT
- **The 155 surviving Events are not the population these fields target.** All 155 were created by Fraser Dunk; 134 of them inside a 3-second window on 2026-07-29T10:37:04-06. Across all 155: `Ext_Calendar_Booking_ID` 0, `What_Id` 0, `$se_module` 0, `Who_Id` 0 (despite 57 contact-typed `Participants` entries), `Description` containing "Booking Reference:" 0. Titles are a personal work calendar (`OOO`, `dinner Fis`, `Estate Agency Visit`).
- **Every Meeting the booking app ever created has been deleted.** The booking production DB records exactly 10 journeys with a `zoho_meeting_id`; **all 10 ids appear in `/crm/v6/Events/deleted`**, purged in a single bulk action at **2026-08-10T10:18:04+01:00 by Timothy Solomon**. COQL `where Ext_Calendar_Booking_ID is not null` → 0 rows. *(This is the answer to Report 4's open question about the booking app's missing footprint.)*
- **WF007 does run on the surviving Events and exits at the first guard.** Rule `991103000000782052`: active, `create_or_edit`, **`criteria: null`** (no conditions whatsoever), `last_executed_time 2026-08-14T17:15:06` matching to the second the `Modified_Time` of Google-synced Event `991103000003645001`. `handleMeetingEvent.deluge:38` returns `skip_no_related_deal` unless `What_Id` is set and `$se_module == "Deals"` — true for 0 of 155. Every WF007 run on this population is a designed no-op.
- **Writes are not being discarded and values are not being rejected.** All nine fields are on the single Events layout `991103000000032037`, `visible:true`, `read_only:false`, `create/edit:true`. `Meeting_Task_Pipeline` (`B2B|Partnership`) and `Meeting_Task_Opportunity` (`MQL|SQL|FTP|RTP`) have domains identical to `Deals.Pipeline` and `Deals.Stage`, so the mirror at `handleMeetingEvent:401-402` cannot fail on value space.
- **Configuration currently prevents WF007 from ever seeing a booking Meeting.** `.env.production.local` has `BOOKING_MEETING_AUTOMATION_ENABLED="false"`; `booking/lib/meeting-automation.js:24` requires the literal `'true'`, and it is the sole gate on `retroLinkTriggersEnabled`. Both the create (`createEventSuppressed`, `trigger: []`) and the retro-link therefore carry suppressed triggers.
- **The flag was on for roughly four hours on 2026-08-02.** `zoho_meeting_activation_state`: `complete` ×5 (all reconciled 2026-08-02 13:11→16:53), `suppressed` ×4 (from 2026-08-03 07:43), `not_requested` ×1.
- **`Reminder_Send_At`, `Meeting_Task_Pipeline` and `Meeting_Task_Opportunity` have no Node writer at all** — their only writer is the Deluge UPCOMING branch (`handleMeetingEvent:381-424`), reachable only after the `$se_module == "Deals"` guard.
- **The booking app's three-field payload has run in production exactly once.** `Meeting_Task_State`/`Meeting_Task_Status` arrived in commit `5192e59` (2026-08-09); the only post-08-09 booking, `fd75c529`, produced Event `991103000003546001` titled `Jurnii | Any - Timothy | Product Discovery` — deleted 80 minutes later.
- **Live loose end:** `booking_journey_ops` row `fd75c529 / zoho_deal_reconcile` is still `pending` today (`last_error_code = deal_not_visible_yet`, updated 2026-08-15T16:44Z), polling to retro-link an Event deleted on 2026-08-10.

### INFERRED CAUSE
- **The headline number measures the wrong population.** `0/155` is a survivorship artifact: every record any population path ever targeted was destroyed in one purge, and the residue is 100% out-of-scope calendar-sync records that `handleMeetingEvent` deliberately rejects. *Confirmed by:* one controlled booking that is not deleted before read-back.
- **The 155 are a Google/Teams calendar sync of a personal work calendar.** The 3-second burst, single creator, absent CRM linkage and the titles are jointly conclusive; it is an inference only because Events exposes no sync-origin field (`Meeting_Provider__s` null on all 155).
- **Even after a fresh booking, three fields would stay null — by configuration, not defect.** With `BOOKING_MEETING_AUTOMATION_ENABLED=false`, WF007 never fires on a booking Event, so the sole writer of `Reminder_Send_At`/`Pipeline`/`Opportunity` never executes. The code documents this as a normal terminal outcome.
- **The `"Automation-managed meeting."` Description append has never executed in production.** It was published 2026-08-09; the last WF007 run against a booking Event was 2026-08-02. Highest-risk untested path.

### OWNER DECISION
- **Run one controlled booking and do not delete it until every assertion has run.** Preconditions: ≥3 business days out (so the `reminderDt > now` skip at `:388` cannot silently fire), ≥2 products, an Account with a resolvable Product Deal.
  - **Phase A (after create, before retro-link)** — `Ext_Calendar_Booking_ID == journeyId` (exactly one row); `Event_Title` byte-identical to `booking_journeys.meeting_title`; `Meeting_Task_Stage == "Demo Booking"`, `Meeting_Task_State == "Open"`, `Meeting_Task_Status == "Working"` (**not** `"New"`); `Start/End_DateTime == slot_start/end_utc`; `Who_Id.id == zoho_contact_id`; Description contains `Booking Reference: <journeyId>`; `Meeting_Task_Contract_Products` an array in `orderedProducts` order; and **`Reminder_Send_At`, `Meeting_Task_Pipeline`, `Meeting_Task_Opportunity` all null** — this last one proves the create was genuinely suppressed.
  - **Phase B (after `zoho_deal_reconcile`)** — `What_Id.id == zoho_deal_id`, `$se_module == "Deals"`, `Ext_Calendar_Booking_ID` still intact, ops row `done`, `zoho_meeting_activation_state` matching the flag under test.
  - **Phase C (flag `true` only, re-read ~60 s after retro-link)** — `Meeting_Task_Pipeline == Deals.Pipeline`; `Meeting_Task_Opportunity == Deals.Stage`; `Reminder_Send_At` non-null, equal to `calculateBusinessDate(Start, -1, business_days_minus_AM)`, strictly future (a null is acceptable **only** if the log shows `reminder / skipped_already_past`); `Deals.Demo_Reminder_Send_At` equal to it; `Meeting_Task_Status` **still** `"Working"` and `Meeting_Task_Stage` **still** `"Demo Booking"` (proves the write-once guards skipped); Description contains **both** markers, with a real `0x0A` break, appearing **exactly once after a second save**; Contact advanced to `Demo Confirmation` if below rank 3; each non-anchor product either reconciled or carrying a `[product_unresolved]` / `[duplicate_product_deal]` Manual Review.
  - **Phase D (negative control, flag `false`)** — repeat A+B, assert the three fields still null, state `suppressed`, and **no** Manual Review raised. This is what distinguishes "deliberately suppressed" from "failed".
- **Decide whether `BOOKING_MEETING_AUTOMATION_ENABLED` should be turned on**, and clear the stuck `fd75c529` reconcile op, which is polling a deleted record indefinitely.

### UNRESOLVED DEPENDENCY
- **The 10 deleted Meetings' field values cannot be read back.** `/Events/deleted` exposes only id, display name, deleter and time. The claim that WF007 populated Pipeline/Opportunity/Reminder on the five `complete` journeys rests on the code path plus an in-repo comment at `handleMeetingEvent.deluge:369` asserting live verification on 2026-08-02 — **not independently re-verifiable**.
- **Whether the live Vercel environment still has the flag `false`.** Read from the locally pulled `.env.production.local`; Vercel's environment API was not queried.
- **What the published Deluge contained on 2026-08-02.** Zoho exposes only current `modified_time` (2026-08-09T13:53:01); mapping commits to the build that ran is inference from dates.
- **Whether `Meeting_Task_Status = "New"` (a display value; actual is `Open`) persists correctly.** Now unreachable on booking Events, still reachable on a rep-created Event linked to a Deal. Requires a write.
- **Why the 2026-08-10 purge swept `fd75c529`**, a real confirmed booking, together with the test records.

---

## 3. WF020 vs WF021 — Quote reconciliation ownership

### CONFIRMED FACT
- **Both rules invoke the same function through the same action node.** WF020 (`991103000001581243`) and WF021 (`991103000001699034`) each carry `instant_actions.actions = [{name: "handleQuoteStageChange", id: "991103000001581241"}]`. `handleQuoteStageChange` is **not** dark code — it runs today. The cutover is a pure trigger-surface swap with **no code change and no rebinding**.
- **WF020 is `field_update` on `Quote_Stage` with no rule criteria**, active, last executed 2026-07-29T10:25:17. WF021 is `create_or_edit`, `repeat:false`, inactive, never executed.
- **The delta is exactly four events WF020 cannot see:** Quote creation; `Deal_Name` changed A→B; `Deal_Name` cleared; `Quoted_Items` / `Contract_ACV` / discount edited — in each case with no accompanying stage change.
- **The adapter's core feature is unreachable from WF020.** `handleQuoteStageChange.deluge:50-86` exists mainly to own the two-Deal reassignment handshake, which keys entirely off `Deal_Name` changing. `Quote_Last_Deal_ID` is **read in exactly one place org-wide** (`:37`) and **written in seven** (`processDeal:860,1097,1509,1547,1716`; `handleTaskCompletion:1200`; `_util_applyQuoteLifecycle:194`).
- **There is zero reconciliation drift today.** 125 Quotes (not 123). `Quote_Last_Deal_ID` 125/125 populated and 125/125 equal to the current `Deal_Name.id`. Modelling `processDeal` §6/§8b correctly — **`Contract_ACV` first, then `Grand_Total`, then `Sub_Total`** — `Deal.Amount` matches on **21/21** Deals holding an open priced Quote. (Three apparent mismatches — Betsson UX 136 710, Honore UX 16 600, Tombola UX 69 300 — resolve exactly once `Contract_ACV` precedence at `processDeal.deluge:1854-1862` is applied.)
- **No human has ever created, moved or repriced a Quote in this org.** All 125 were machine-authored (123 on 2026-07-21, 2 on 2026-08-14).
- **WF004 does not exist.** The full org listing is 18 rules, none named WF004; there is no Deals `field_update` on `Commercials_Status`, and `handleCommercialsStatusChange` is not among the 11 registered functions. Three documents (`FLOW_REFERENCE.md:25`, `jurnii_zoho_quote_product_contract_spec_v2.md:36`, `AUDIT_01_ARCHITECTURE_E2E_QUOTE.md:74`) assert it is active and part of the pre-cutover safety net. **One third of the documented safety net is already gone.**
- **The Deal→Quote direction is heavily redundant** (WF001d `repeat:true` active, plus eight non-workflow `processDeal` callers). **The Quote→Deal direction is single-threaded through WF020 and only for `Quote_Stage`.**
- **`applyQuoteLifecycle` guards against sequential re-execution, not concurrency.** `_util_applyQuoteLifecycle.deluge:109-118,238` re-reads `Quote_Applied_Lifecycle_Keys` live before every mutating action; the Expansion path is an **additive** bump (`newRenAcv = curRenAcv + expAcv`, `:128`) and is the value at risk if the key guard is raced.

### INFERRED CAUSE
- **The gap is latent, not benign.** All four uncovered events require a human to touch a Quote in the UI, and none ever has — which is why drift is zero. Zero drift measures zero exposure, not zero risk.
- **The reassignment handshake is racy independent of which rule owns it.** Because `processDeal` re-stamps `Quote_Last_Deal_ID` from five sites, if any `processDeal` run touches a moved Quote before the adapter does, `oldDealId == newDealId`, the adapter takes the "no move" branch, and **Deal A is never recomputed**. Activating WF021 narrows the window; it does not close it. *Confirmed by:* test case 11 below.
- **WF020 → adapter → `processDeal` demonstrably ran end-to-end on 2026-07-29**, from the 21-second trace (WF020 10:25:17 → successor Renewal Quote created 10:25:31 with `Contract_ACV` 11 000 → Acquisition Quote Closed Won 10:25:33 → Deal `Amount` 11 000 at 10:25:38). A direct scripted `processDeal` call inside that window cannot be excluded from data alone.

### OWNER DECISION
- **WF021 should own Quote reconciliation.** It is the only trigger covering creation, `Deal_Name` moves, unlinks and repricing, and the reassignment handshake is reachable only from it. **WF020 must not be kept as a second line** — both rules run the same action, so both active means every stage change runs the adapter twice against an additive Expansion ACV bump behind a check-then-act guard.
- **Smallest safe cutover, in one maintenance window with no Quote edits in flight:** (1) **deactivate WF020**, then (2) **activate WF021**, then (3) read both back via `getWorkflowRuleById` and confirm `status.active` and `instant_actions.actions[0].id == 991103000001581241`. Order matters: a brief window where nothing owns reconciliation is far safer than a window of double execution, and with no human Quote edits in this org the exposure is effectively nil. **Rollback is reversing the two toggles. Do not delete WF021** — Zoho refuses to create a rule in an inactive state, so a deleted WF021 cannot be recreated dark.
- **Blocking pre-req before either toggle: resolve `WF021.repeat`.** If Zoho's `repeat:false` means once-per-record, activating WF021 as configured would be a **regression** against WF020. If so, set it to `true` to match WF001d first. (WF001a/b0/c/d are all `repeat:true`; WF007, WF008 and WF021 are all `repeat:false`.)
- **Acceptance set to run after cutover** — 1 baseline (UI Quote create pre-cutover: assert zero adapter runs, `Amount` static); 2 UI Quote create with `Deal_Name` (one run, `action=reconciled`, marker == Deal); 3 `processDeal`-authored Quote with `trigger:[]` (**zero** adapter runs — proves no recursion); 4 stage ladder Draft→…→Closed Won and →Closed Lost (exactly one successor Renewal); **5 line-item / `Contract_ACV` change with no stage change — the headline case WF020 cannot do** (also verify the line updates in place; `processDeal.deluge:1477` documents that a missing line id doubles the Quote total); 6 reassignment A→B (both reconciled, A's `Amount` drops, marker == B); 7 reassignment failure (`B.Automation_Suppressed = true` → marker must **not** advance, `action=reassign_incomplete`, retry on next edit); 8 unlink (old Deal reconciled, marker cleared); 9 duplicate execution (re-apply Closed Won twice — no second Renewal and no second Expansion bump; rapid successive edits — validates `repeat`; confirm both rules are never simultaneously active); 10 loop safety (all adapter and `processDeal` Quote writes carry `trigger:[]`); 11 marker race per the inference above; 12 regression (Deal edit → `processDeal` once via WF001d).
- **Documentation follow-ups (not part of the cutover):** `handleQuoteStageChange.deluge:6` and `zoho-functions/README.md:92` already describe the post-cutover state as achieved; three documents still assert WF004 exists. The real structural fix — making `Quote_Last_Deal_ID` adapter-owned so `processDeal` cannot defeat the move detector — is a code change and does not belong in this cutover.

### UNRESOLVED DEPENDENCY
- **What `repeat:false` on `create_or_edit` means in this org — the blocking pre-req.** Report 1 filed this as settled, citing WF007 (`repeat:false`) executing at 2026-08-14T17:15:06 against an Event created 13:14:22 and modified 17:15:05. That proves WF007 **fired on an edit**; it does **not** prove it fired twice on one record, because there is no evidence it fired at that record's creation (a calendar-sync create may not trigger workflows). **This is an inference, not a fact, and it is the one unknown gating the cutover.** Only a write test settles it — and the same test settles the WF008 question in §1.
- **Whether the deployed `handleQuoteStageChange` body matches the repo file.** `getAutomationFunctions` returns no script body; CRM `modified_time` is 2026-06-21T19:59:36. The repo file is clean in git, so it should be published — unverified.
- **Whether Zoho `field_update` fires on record creation.** The only live evidence (the two 2026-08-14 Quotes not advancing WF020) is confounded, because those were written with `trigger:[]`.
- **Why the second 2026-07-29 sequence (Finterra Quote → Closed Lost 10:26:43, Deal → Lost/Amount 0 at 10:26:48) did not advance `WF020.last_executed_time`.** Structurally identical to the trace that did. Either `last_executed_time` updates unreliably, or that change came via a trigger-suppressed script.
- **Execution counts.** Zoho exposes only `last_executed_time`; there is no per-rule log through any available read path.
- **Two Deals both named "Jurnii E2E Ltd - Jurnii 360"** (`991103000003645011`, `991103000003655003`), each with its own scaffold Quote — 2026-08-14 E2E residue, an un-deduplicated pair.

---

## 4. ACTIVITY CONTEXT FIELDS — are they create-time snapshots?

### CONFIRMED FACT
- **Answer: they are create-time snapshots by design and by live behaviour, but the code has three `updateRecord` writers that contradict it.** An exhaustive literal-name search over `zoho-functions/v6/` and `booking/` finds **11 writers of the nine fields: 8 CREATE, 3 UPDATE-on-existing-Activity.**
- **The three contradicting writers, named:**

| | Writer | What it does |
|---|---|---|
| **V1** | `handleMeetingEvent.deluge:401-402` → `updateRecord("Events", …)` `:424` | Re-stamps `Meeting_Task_Pipeline` and `Meeting_Task_Opportunity` from the Deal's **current** Pipeline/Stage. **No guard of any kind.** WF007 has no field criteria, so *every* triggers-enabled save of the Event re-runs it. Internally inconsistent: the neighbouring `:422` in the same map guards `Meeting_Task_Stage` correctly with `… == ""`. |
| **V2** | `handleCallOutcome.deluge:268-270` → `updateRecord("Calls", …)` `:276` | Overwrites all three `Call_Task_*` fields on a **pre-existing** Call found by the dedupe scan at `:218-256` — a Call that already carries its own creation snapshot. Unconditional. |
| **V3** | `sendSequencedEmail.deluge:400-402` → `updateRecord("Tasks", …)` `:403` | Stamps the `Scheduled Send` wake-up Task at **send** time, from a Deal re-read live at `:376-384`. Qualified: the target was created at `routeContactSequence:1607` carrying none of the three fields, so this is in practice the *first* stamp, not an overwrite — but it is unguarded, and the context is `dueOffsetDays` business days stale relative to when the Activity was raised. |

- **The eight compliant writers** are `routeContactSequence:1549-1551` (Calls) and `:1664-1666` (Tasks), `handleCallOutcome:192-194`, `processContact:515/522/525`, `createAuxTask:133-135`, `sendSequencedEmail:422-424`, `booking/integrations/zoho/index.js:410`, plus `handleMeetingEvent:422` which is an update but is write-once-if-blank guarded and therefore behaviourally compliant.
- **No other writer exists.** The booking app has **no** writer for `Meeting_Task_Pipeline` or `Meeting_Task_Opportunity` at all. Zoho-native field-update actions org-wide number exactly **two** (`Deals.Automation_Suppressed`; `Leads.Fax`) — neither touches any of the nine.
- **Live data currently reads as fully compliant.** Tasks 219, of which 182 resolve a Deal via `What_Id`. `Task_Opportunity` 182/182 populated, **33 differ from `Deals.Stage`** (the owner's figure re-verified exactly). `Task_Stage` 150/182 populated, 6 differ from `Deals.Opportunity_Stage`. `Task_Pipeline` 182/182 populated, **0 differ**. Cross-check: `Task_Stage` vs `Deals.Stage` differs on 145/150, confirming `Task_Stage` mirrors `Opportunity_Stage` exactly as coded at `createAuxTask:132`.
- **32 of the 33 divergences have `Deals.Modified_Time` after the Task's `Created_Time`, and 0 of 182 Tasks were ever edited after creation.** Divergence concentrates in Manual Review Tasks (31 of 50) versus Sequence Activation (2 of 132).
- **The Calls module holds 0 records** and no Event has ever entered the `handleMeetingEvent` write path, so V1 and V2 have zero live footprint.

### INFERRED CAUSE
- **The 33 `Task_Opportunity` divergences are correct snapshot behaviour, not a bug.** With no Task ever modified post-creation, each divergent value can only be the value written at `createRecord`, and 32/33 have a Deal that moved afterwards.
- **`Task_Pipeline`'s 0 divergence is a data accident, not protection.** It is written by the same `createRecord` payloads; Pipeline simply has never changed on a Deal in this dataset.
- **The 32 blank `Task_Stage` values are a source-data gap**, consistent with `createAuxTask:135` skipping the write when the Deal's `Opportunity_Stage` was blank at creation.
- **All three violations are latent, not yet realised** — V1 and V2 target modules with zero live automation footprint, V3 targets a Task type that has never been produced (the live census is only `Sequence Activation` 132 + `Manual Review` 87). The data looks clean while the code is not; each will begin corrupting snapshots the moment its path activates.
- **V1 is likely an oversight, not a decision**, given the correctly guarded write two lines below it in the same map.

### OWNER DECISION
- **Rule on V3: which moment counts as "when the Activity was raised" for a scheduled email — Task creation, or email send?** This single ruling decides whether V3 is a defect or by design, and it cannot be settled from code or data. If "Task-create time" wins, the stamp moves to `routeContactSequence:1594-1607` and is deleted from the send-time update.
- **Acceptance test — "an Activity retains its original context".** Preconditions: scratch Account, one Deal `D`, record `(S0, O0, P0)` = `Stage`, `Opportunity_Stage`, `Pipeline`; identify a reachable distinct triple `(S1, O1, P1)`.
  - **T1 (Tasks, writers 8/9/10/11):** raise a Task `T` on `D`; assert `Task_Stage = O0`, `Task_Opportunity = S0`, `Task_Pipeline = P0`; advance `D` to `(S1,O1,P1)`; force an automation re-touch of `T` by setting `Task_State = Won`; **assert all three unchanged.** Sub-case T1b targets V3: trigger a `schedule_email`, advance `D`, let the send fire, read the resulting `Email Sent` Task — under a "Task-create time" ruling it must read `(O0,S0,P0)` and **will currently read `(O1,S1,P1)`**.
  - **T2 (Events, targets V1 — expected to FAIL):** create Event `E` with `What_Id = D` and `$se_module = 'Deals'`; record the stamps; advance `D`; make **any** triggers-enabled edit to `E` (no criteria gate WF007, so any save suffices); **assert `Meeting_Task_Pipeline = P0` and `Meeting_Task_Opportunity = S0`.** **Predicted: FAIL** — both will read `P1`/`S1` from `:401-402`, while `Meeting_Task_Stage` correctly holds. That asymmetry within one record is V1's diagnostic signature.
  - **T3 (Calls, targets V2 — expected to FAIL):** let `routeContactSequence` create Call `C1`; drive `handleCallOutcome` to create replacement `C2` (`:294`); advance `D`; re-trigger so the dedupe scan finds `C2` and takes the reuse branch at `:257`; **assert `C2`'s three fields unchanged.** **Predicted: FAIL** — `:268-270` rewrites all three.
  - Clean up `D`, `E`, `C1`, `C2`, `T`, the Account and any side-effect Quote.
- **Minimal repair, for scoping only (nothing applied):** add the `:422`-style blank-target guard to `handleMeetingEvent:401-402`; **delete** `handleCallOutcome:268-270` outright (the reused Call already carries its snapshot and the reuse branch has no legitimate reason to re-stamp); decide V3 before touching `sendSequencedEmail:400-402`.

### UNRESOLVED DEPENDENCY
- **Whether the CRM UI, mass-update or import has ever written these fields.** Zoho's field-history API is not exposed through the available read paths, so "no writer beyond the 11" is proven for Deluge, the booking app, and the two org-wide field-update actions only. Blueprints and approvals were probed via `getFieldUpdates` with `feature_type` filters, which returned the same two records — the API appears to ignore the filter, so that surface is **bounded but not independently confirmed**.
- **The one divergent Task whose Deal was not modified after Task creation.** Most likely a same-second touch or a `noTrigger` write that did not bump `Modified_Time` — not verifiable from live reads.
- **No live proof of any Event-side writer is currently possible**, because every booking-produced Event was deleted (see §2). The §2 controlled booking is a prerequisite for T2.

---

## 5. `Quoted_Items` — correct structure, or repair needed?

### CONFIRMED FACT
- **It is the native Zoho inventory line-item subform and it is correct. No repair is required.** Field metadata: `data_type: "subform"`, `json_type: "jsonarray"`, `custom_field: false`, `system_mandatory: true`, `read_only: false`, id `991103000000175501`. Not a custom field, not a multi-select, not a textarea.
- **The child module carries the full native structure**, with only 4 Jurnii extensions added on top: `Product_Name` is a genuine **lookup → Products**; `Quantity` is `double`; `List_Price`, `Discount` and `Tax` are `currency`; `Total`, `Total_After_Discount` and `Net_Total` are formulas; `Line_Tax` is the native `linetax` jsonarray. The custom additions are `Quoted_Item_Plan_Brands`, `_Pricing_Tier`, `_Pricing_Band`, `_Frequency` — additive, not replacements.
- **Parent totals cannot be spoofed by a writer:** `Sub_Total` and `Grand_Total` are formula, `read_only: true`.
- **Record read-back confirms hydrated lookups**, e.g. `Product_Name: {name: "Jurnii UX", id: "991103000002158001", Product_Code: "J360-UX", Taxable: true, …}` — a real Products record, not a text label.
- **All 125 live Quotes were read individually and reconcile on four independent identities (±0.02): `Σ line.Total == Sub_Total`; `Σ line.Discount == Discount`; `Σ line.Tax == Tax`; `Sub_Total − Discount + Tax + Adjustment == Grand_Total`. 125/125 pass, zero exceptions.**
- **Direct answer to the question asked: `linesMissingProductLookup = 0`. No Quote has any line item lacking a Product lookup — 0 of 125.** Also: `quotesWithZeroLines: 0`, `linesWithPricingTier: 125` (100%).

### INFERRED CAUSE
- **The 74 Quotes with `List_Price: 0` are a pricing-resolution outcome, not a structural defect.** They are structurally identical to the 51 priced ones — real Product lookup, `Quantity: 1`, tier set. `linesWithPlanBrands: 51` matches the 51 non-zero Quotes one-for-one: **a line prices iff `Quoted_Item_Plan_Brands` is populated**, which is what `_util_resolveQuoteLinePrice.deluge` produces when the brand-count input is absent. The 51/51 coincidence was observed; the causal link was read from code, not executed.
- **Multi-product Deals currently fan out to one Quote per product, not one Quote with multiple lines.** 125 line items across 125 Quotes, every one `Sequence_Number: "1"`.

### OWNER DECISION
- **Whether 74 structurally sound but commercially empty Quotes (`Grand_Total: 0`) are acceptable.** This is a pricing/data question, not a structural one, and a read-only pass cannot settle it. Fixing it means supplying `Quoted_Item_Plan_Brands` at Quote-build time.

### UNRESOLVED DEPENDENCY
- **The reconciliation identities are proven only for the single-line case** — the four sums are sums over one term. No multi-line Quote exists in this org. The formulas are Zoho-native and would be expected to hold, but this is unverified live, and it becomes load-bearing the moment multi-product bookings start producing multi-line Quotes.
- **`Line_Tax` is `[]` on every line of all 125 Quotes** — structural presence confirmed, behaviour untested.
- **`Adjustment` is 0 and `Price_Book_Name` is null across all 125** — their contribution to the `Grand_Total` identity is untested.

---

## CROSS-CUTTING: one write session settles four open questions

The single largest unknown across all four passes is **Zoho trigger semantics in this org**, and it currently blocks §1 (does WF008 fire?), §3 (what does `repeat:false` mean? — the stated blocking pre-req for the cutover), §4 (T2/T3 cannot run without triggers behaving predictably), and §2's Phase C. One controlled write session — completing a single Activation Task in the UI, then one Quote edit, then one Event edit — resolves all of them and produces the first end-to-end activation. Every conclusion above that is marked INFERRED becomes confirmable or falsifiable inside that one session; nothing in this briefing requires a code change before it runs.

**Provenance.** All four passes were read-only: the only POST issued was `/crm/v6/coql` (SELECT). No CRM record, field, workflow, layout or view was created or modified, and no repository file was edited. Working artifacts are scratch-only under `C:/Users/Audna/AppData/Local/Temp/claude/c--Development-Projects-jurnii/b7e7d9a5-fd89-4a8f-bfec-0233280951a8/scratchpad/` (`q1.js`, `q2.js`, `q3.js`, `q5.js`, `acts.json`, `ev1.js`, `ev2.js`, `seg.js`, `seg2.js`, `lay.js`, `events.json`, `t4a.js`–`t4e.js`).