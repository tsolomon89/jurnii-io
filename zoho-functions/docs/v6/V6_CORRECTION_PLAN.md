# v6 correction plan — implementation-ready

> **Revised in place, 2026-08-18 (second correction pass). Moved into the repository 2026-08-19.**
> This is the single plan — there is no competing sprint plan and no second copy. It previously lived
> at `~/.claude/plans/whats-the-plan-for-expressive-sprout.md`, which is now a pointer to this file.
> **Nothing has been published.** No Deluge edit, no helper, no workflow, field, picklist or record
> change, no wipe, no re-import.
>
> **Owner ruling 2026-08-19 — B-T0 is no longer an implementation prerequisite.** It would have tested
> the *old* published `handleTaskCompletion`. The purpose of this sprint is to finish the corrected
> implementation, publish it, and test the corrected system. **G1 is reclassified from implementation
> blocker to the first post-publication acceptance gate**, run at P7 against the newly published code.
> No further UI save is requested before publication. Implementation proceeds now.

## Controlling documents

All are siblings of this file in `zoho-functions/docs/v6/`.

| Document | Role |
|---|---|
| [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md) | **The authority.** Outranks everything, including this plan |
| [`V6_DELUGE_FUNCTION_RESPONSIBILITY_LEDGER.md`](V6_DELUGE_FUNCTION_RESPONSIBILITY_LEDGER.md) | **LEDGER.** Per-file responsibility, drift, classification. Every item cites its rows |
| [`V6_IMPLEMENTATION_READINESS_CORRECTIONS.md`](V6_IMPLEMENTATION_READINESS_CORRECTIONS.md) | **CORRECTIONS.** Settled rulings and corrected claims |
| [`V6_FIELD_USE_CONTRACT.md`](V6_FIELD_USE_CONTRACT.md) | Field authority |
| [`V6_CRUD_PLAN.md`](V6_CRUD_PLAN.md) | Workflow-rule and file-level CRUD verdicts |
| [`V6_FUNCTIONAL_SPEC_THREE_FLOWS.md`](V6_FUNCTIONAL_SPEC_THREE_FLOWS.md) | What must be true, in three flows |
| [`V6_REBUILD_VS_MIGRATE.md`](V6_REBUILD_VS_MIGRATE.md) | Records are rebuilt, not migrated |

## Flow ordering — corrected

**A** Lead → Account / single Deal / Quotes · **B** Activities → cadence · **C** core fields →
supporting fields → cadence selection.

> ⚠ **"A gates B" was wrong and is withdrawn.** **Deal construction does not gate activation
> authority.** Activation is Contact-scoped: a Contact may hold, commit and reactivate an Activation
> Task with no Deal at all. What Flow A actually gates is **dispatch context** — the Deal is optional
> relationship context that routing *uses* when present.
>
> The true ordering is: **B is independently correctable**; **A supplies the context B prefers**; **C
> is only observable once B runs.**

---

## Settled rulings applied throughout

1. **Activation is Contact-scoped.** `Who_Id` required; `What_Id` optional. *(CORRECTIONS §1)*
2. **No unused helper** — created with every caller it rewires, or not at all. *(§2)*
3. **Two cadence routes, not five Calls.** *(§8)*
4. **One role-classification authority.** *(§3)*
5. **Valuation:** Company Tier → Target ACV estimate; Product configuration → actual Quote pricing;
   applicable Quote totals supersede the estimate in `Deal.Amount`. **Never a Productless Quote.** *(§5)*
6. **Records are rebuilt, not migrated.** *(REBUILD_VS_MIGRATE)*

---

## Ordered work items

### Stage 0 — RECLASSIFIED. Not a prerequisite

**Item 0.1 (B-T0) has moved out of Stage 0 and become the first post-publication acceptance test.**
It is now **A-T0**, run at **P7** — the phase that enables WF008 — against the newly published
`handleTaskCompletion`. See *Post-publication acceptance* below.

> **Why it moved.** B-T0 exercised the body published 2026-08-08, which Stage 2 replaces wholesale. A
> pass would have proved a code path that is being rewritten; a failure would have been diagnosed
> against code destined for deletion. Either outcome cost a fixture save and settled nothing about the
> corrected system. **The live-verified precondition it was meant to establish — whether a human UI
> save invokes WF008 — is unchanged by the reclassification and is settled by A-T0 at P7.**

**Verified 2026-08-19, for the record.** Task `991103000003663003` is byte-identical to its creation
state (`Modified_Time == Created_Time == 2026-08-14T13:41:15+01:00`, `Task_State='Open'`,
`Task_Sequence_Type=null`); its audit timeline holds exactly one entry, the `processLead` create. No
Task org-wide has been edited since, and none carries a `Task_Sequence_Type`. WF008
`last_executed_time` remains `2026-07-20T19:51:49+01:00`. The fixture therefore remains in a valid
pre-state and needs no reset before A-T0.

⚠ **`handleTaskCompletion` was republished `2026-08-08T16:22:55`, after WF008 last executed. The
currently live body has never executed once.** A-T0 is a first-run test either way — which is the
substantive reason to spend it on the corrected code rather than the superseded code.

**Stage 0 now contains no work items.** Implementation begins at Stage 1.

### Stage 1 — safe, self-contained

| # | Work | Ledger rows | Gate |
|---|---|---|---|
| **1.1** | **The activation trap.** `handleTaskCompletion:296` drop `&& tStatus == "Not Started"`; `:407` and `:648` stop writing `Task_Status`/`Status`; rewrite the `:329` review text so it no longer walks the rep into `legacy_bootstrap`; add to `processContact:498`'s Description *"Do not change the task's Status field — automation closes it for you."* | `handleTaskCompletion`, `processContact` | **None.** (Was 0.1 — reclassified.) Verified post-publication by A-T0, then A-T1, A-T2 |
| **1.2** | **`processLead:252` re-entrancy.** Add `{"trigger": List()}` to the `Contact_Role1` stamp on the Lead | `processLead` | Behaviour-preserving; ships alone |
| **1.3** | **Delete the WF010d unit.** Rule → deregister `sendCommercialFollowUp` → delete `Deals.Next_Comm_Follow_Up_Date` | `sendCommercialFollowUp` | Rule before field |

### Stage 2 — Flow B, cadence and Contact-only activation *(implemented now; PUBLISHED IN P1)*

> ⚠ **Stage 2 is implemented and offline-verified now, and is NOT published before the maintenance
> freeze.** Two reasons, both hard:
>
> 1. **The new Contact-scoped SendKey invalidates every existing key.** Publishing it over live data
>    would make the dedupe blind to every audit Task already written, and every pending chain step
>    would re-send.
> 2. **Optional-Deal dispatch assumes one Deal per Account.** Production still holds 17 Accounts with
>    2–3 Product Deals, so "resolve the Account's single Deal" has no correct answer there.
>
> **Stage 2 therefore publishes during P1, alongside the Stage 4 code, while all workflows and
> scheduled sends are inactive.** Prepare it, test it on fixtures, hold it. **Do not expose the new
> cadence implementation to the legacy multi-Deal graph.**

| # | Work | Ledger rows | Gate |
|---|---|---|---|
| **2.1** | **Collapse 5 Calls to 1.** `routeContactSequence:494-518` — remove the `stepNum < 5` escalation; a non-progressing Call enters the email chain at step 1. Remove the side-email interleave | `routeContactSequence` | Prepared after 1.1 · **published in P1** |
| **2.2** | **Split the routes.** `:840-849` — `Email` becomes chain-only (drop `send_opener_then_call`); `Call` stays Call-then-chain | `routeContactSequence`, `sendSequencedEmail` | Prepared with 2.1 · **published in P1** |
| **2.3** | **Chain advance — fully specified below (2.3a)** | `routeContactSequence`, `sendSequencedEmail`, `sendScheduledEmailFromTask` | Prepared with 2.1–2.2 · **published in P1** |
| **2.4** | **Contact-only activation, END TO END** — see the expanded specification below | `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendSequencedEmail` | Prepared after 1.1 · **published in P1** (optional-Deal dispatch needs the single-Deal graph) |

#### 2.4 — the corrected specification

Relaxing the Task guard alone is **insufficient**. Verified against the executable bodies:

| Site | Blocker |
|---|---|
| `handleTaskCompletion:67-71` | returns `skip_no_related_deal` unless `$se_module=="Deals"` **and** `What_Id` non-null |
| **`routeContactSequence:67`** | `if(contactId == 0 \|\| dealId == 0)` → `skip_missing_ids` → **returns** |
| **`routeContactSequence:215-218`** | `deal_not_found` guard |
| **`sendSequencedEmail:29`** | same `skip_missing_ids` guard → **returns** |
| `sendSequencedEmail:151` | **`sendKey = contactId\|dealId\|canonicalKey`** — the Deal id is part of the idempotency key |
| `sendSequencedEmail:154` | audit-Task dedupe reads `getRelatedRecords("Tasks","Deals",dealId)` — Deal-scoped |

**Required behaviour:**

1. **Activation commits regardless.** No Deal resolution is attempted or required to create, commit,
   stop or reactivate the Activation Task.
2. **Dispatch resolves context.** When `What_Id` is blank, `routeContactSequence` resolves the
   Contact → its Account → that Account's **single** Deal, and uses it as optional context.
3. **If resolution fails, dispatch stops VISIBLY as unresolved** — a named review, not a silent
   `skip_missing_ids` log line. The current guards fail silently, which is what must change.
4. **Cadence idempotency becomes Contact-scoped, unconditionally** — whether or not a Deal exists:

   | | Today | Required |
   |---|---|---|
   | Key | `sendKey = contactId + "\|" + dealId + "\|" + canonicalKey` (`sendSequencedEmail:151`) | **`sendKey = contactId + "\|" + canonicalKey`.** The Deal contributes nothing to uniqueness — cadence is Contact-scoped (§5.4) — and its presence is exactly what breaks the no-Deal case |
   | Duplicate lookup | `getRelatedRecords("Tasks","Deals",dealId)`, falling back to `searchRecords("Tasks","(What_Id:equals:"+dealId+")")` (`:154-157`) — **only ever sees Tasks attached to that Deal** | **`searchRecords("Tasks","(Who_Id:equals:"+contactId+")")`**, matching `Status == "Completed"` **and** `Task_Type == "Email Sent"` **and** `Description contains "SendKey: " + sendKey` |

   Both changes are required together. With a Deal present the new form is equivalent and strictly
   more correct; with no Deal the old form both mis-keys **and** cannot find the audit Task, so a
   Contact-only cadence would re-send every step on every pass.

   **This invalidates every SendKey written under the old format.** That is acceptable only because
   the records are being rebuilt (Stage 6); it must not be published against data intended to survive.

5. **A fifth Deal requirement exists and must be fixed with the rest.**
   `sendScheduledEmailFromTask:44` — `if(contactId == "" || dealId == "") { missing_links; return; }`.
   Every scheduled step of the email chain dies here for a Contact-only cadence, silently.

> ⚠ **The "frees 419 Contacts" claim is withdrawn.** Until items 2.4(2)–(4) land, relaxing
> `handleTaskCompletion` alone lets the Task commit and then loses the Contact at
> `routeContactSequence:67`. **No Contact is freed by the Task-guard change on its own.**

> **2.1–2.4 ship as one window, inside P1.** Splitting them leaves the router between two cadence
> shapes with live Scheduled Sends outstanding against the old one. **The supersede correction** (`Deferred` +
> `Closed`, replacing the invalid `Cancelled` — already staged in the uncommitted
> `routeContactSequence` edit) **is a prerequisite in this window**, not an extra. **`Cancelled` is not
> a live `Tasks.Status` option**, so both the write and every predicate reading it are dead and are
> removed — with no replacement helper field.

#### 2.3a — the email chain, fully specified

**Four of the five steps run on the scheduler; one does not.** Nothing here is new machinery — it is
the existing scheduler with the Call escalation removed. The per-path breakdown is at the end of this
section and is the authoritative statement; the table immediately below describes the **scheduled**
mechanism only.

| Property | Definition |
|---|---|
| **Scheduler** | **WFC-SchedEmail** (`991103000001499121`), Tasks, `date_or_datetime` on `Tasks.Due_Date`, `execute_at 09:00:00+01:00`, `recur_cycle: once`, `repeat=false`. Criteria: `Task_Sequence_Managed == true` **and** `Status == "Not Started"` **and** `Task_Type == "Scheduled Send"` |
| **Wake-up record** | `routeContactSequence:1563-1608` creates a Task whose `Description` carries `ScheduledSend\|stage=<stage>\|step=<n>\|kind=<kind>`. The payload is the only state; there is no separate cursor field |
| **Timing** | `Due_Date = calculateBusinessDate(zoho.currenttime, dueOffsetDays, "business_days")` (`:1571-1573`). **`dueOffsetDays = 2`** between steps — the existing spacing at `:502` and `:514`. Step 1 is immediate on activation (`dueOffsetDays = 0`) |
| **Step advance** | On the step-*n* send completing, schedule step *n*+1 at +2 business days. Steps 1→5 use template keys `<stage-slug>:1:initial`, `:2:follow-up`, `:3:follow-up`, `:4:follow-up`, `:5:final` (`sendSequencedEmail:59-66`, registry `:73-97`). After step 5 the Stage's cadence is **Complete** — `sendScheduledEmailFromTask:67-70` already writes `Sequence_State = "Complete"` on the terminal send |
| **Interruption** | Any progression supersedes the chain. **The one valid supersede state is native `Tasks.Status = "Deferred"` **and** `Task_Status = "Closed"`** — the uncommitted `routeContactSequence` correction. `sendScheduledEmailFromTask:31-36` already refuses both. ⚠ **`Cancelled` is NOT a live `Tasks.Status` option**, so the existing `Status = "Cancelled"` write is inert: it is discarded like any out-of-set picklist value and the superseded step still fires. **Remove the `Cancelled` write and every predicate that tests for it** — those predicates are dead by construction. Do not introduce a replacement helper field |
| **Idempotency** | The Contact-scoped `sendKey` of 2.4(4), checked against a Completed `Email Sent` audit Task before every send |
| **Audit** | **Exactly one completed Task per successful send** — which function creates it differs by path; see the table below. Both forms set `Task_Type = "Email Sent"`, `Status = "Completed"`, `Task_State = "Open"` (the send completed; the reply has not), and embed `SendKey: <key>` in the Description. **An `Email Sent` Task must never advance the Contact as a Won sales activity** — enforced at `handleTaskCompletion:45`, which hard-returns on that `Task_Type` |

⚠ **Not every step goes through WFC-SchedEmail — the earlier "all five steps" wording was wrong.**
Step 1 differs by route, and only Step 1 can be immediate. Stated separately:

| Path | When | How it sends | Who writes the audit Task |
|---|---|---|---|
| **Email-first, Step 1** | **Immediate**, at activation commit | `routeContactSequence` calls `sendSequencedEmail(...)` directly with `existingAuditTaskId = ""` | **`sendSequencedEmail` creates** a new Completed `Email Sent` Task (`:407-427`, the `tkMap` block). WFC-SchedEmail is **not** involved |
| **Call-first, Step 1** | **Scheduled**, after the single Call returns non-progressing | `routeContactSequence` creates a wake-up Task (`action = "schedule_email"`, payload `ScheduledSend\|stage=\|step=1\|kind=`), due +2 business days | WFC-SchedEmail fires → `sendScheduledEmailFromTask` → `sendSequencedEmail(..., taskId)` → **converts that wake-up Task in place** (`:395-403`) |
| **Steps 2–5, both routes** | **Scheduled**, +2 business days after the previous step's send completes | Same wake-up-Task mechanism as Call-first Step 1, with `step=n` | Same — the wake-up Task is converted in place |

So: **exactly one immediate send exists in the whole model — Email-first Step 1.** Everything else is
scheduled. That is also the only path that *creates* an audit Task rather than converting one, and the
distinction is the difference between the two blocks at `sendSequencedEmail:395-403` and `:407-427`.

**Cancellation — derived only from existing CRM state.** A pending wake-up Task must not fire when any
of these is true at fire time. All four are already observable; none needs new infrastructure:

| # | Condition | Existing signal |
|---|---|---|
| 1 | **Contact Lost** | `Contacts.State == "Lost"` |
| 2 | **Sequence stopped** | `Contacts.Sequence_State == "Stopped"` |
| 3 | **Stage progressed / cadence superseded** | The supersede path sets the wake-up Task `Status = "Deferred"` **and** `Task_Status = "Closed"`; `sendScheduledEmailFromTask:31-36` already refuses both |
| 4 | **Cadence completed** | `Contacts.Sequence_State == "Complete"` — written by `sendScheduledEmailFromTask:67-70` on the terminal send |

Conditions 1, 2 and 4 are Contact-state reads that the sender must add; condition 3 already works
**provided** the supersede correction ships (see 2.1–2.3).

⚠ **Reply and bounce are explicitly OUT OF SCOPE.** There is no reliable reply or bounce signal today:
WF009a–e are the only candidates, and **all five have never fired** (`last_executed_time: null`), are
scoped `relational → Deals`, and carry the mis-attribution defect in `V6_CRUD_PLAN.md` §3. **No
reply/bounce-driven cancellation is designed, assumed or implemented here.** A chain runs to step 5 or
is cancelled by conditions 1–4 — nothing else.

**What changes versus today:** the *source* of the next step. Today step *n*+1 is scheduled as a side
email alongside Call *n*+1; under the corrected model it is the next chain step with no Call. The
scheduler, payload format, timing and audit contract are unchanged.

### Stage 3 — Flow C, propagation sources

| # | Work | Ledger rows | Gate |
|---|---|---|---|
| **3.1** | **Pipeline source.** Rewrite `_util_resolveDealPipeline` to read `Deals.Pipeline` over REST; delete the `Deal_Product_Key` route and the false "UNREADABLE" comment at `:11-13`. **Blank/unknown must return `"unresolved"`, never `"B2B"`** — `_util_pipelineForProductKey:24` currently fails open | `_util_resolveDealPipeline`, `_util_pipelineForProductKey`, `routeContactSequence` | **Highest single-file blast radius.** `routeContactSequence:977` uses the return as the B2B dispatch gate. Live read-back on one B2B and one Partnership Deal before publish |
| **3.2** | **Activity snapshots → Contact.** Re-source at the **five** non-conformant sites: `processContact:518-525`, `createAuxTask:130-135`, `sendSequencedEmail:384,402,423`, `handleCallOutcome:125,192-194`, `handleMeetingEvent:113,401-402`. Delete the `handleCallOutcome:268-270` re-stamp. Add the `== ""` guard at `handleMeetingEvent:401-402`. Delete the unreachable `deal.get("Stage")` fallback at `routeContactSequence:1085` | `processContact`, `createAuxTask`, `sendSequencedEmail`, `handleCallOutcome`, `handleMeetingEvent`, `routeContactSequence` | 3.1. A shared classifier, if introduced, ships with all callers (ruling 2) |
| **3.3** | **Account roll-up — SCOPE REDUCED.** Remove only what breaks under the corrected model: `_util_rollupAccountState:53`'s `if(dpKey=="" && dpId=="") continue;` and the `::active` scoping at `:52`, both of which exclude the canonical Deal. **Do NOT add the previously planned `Prospect` classification** — see below | `_util_rollupAccountState` | **Must precede Stage 4** or the roll-up returns having written nothing |

#### 3.3 — `Accounts.Account_Status` correction

The earlier plan proposed classifying a Deal-less Account as `Prospect`. **That is withdrawn — it would
add new behaviour to a field with no proven consumer.**

Verified: `Accounts.Account_Status` is **write-only**. Sole writer `_util_rollupAccountState:102`.
**Zero readers** across all 38 `.deluge` files and all of `booking/` (the only booking occurrence is a
field-name entry in a test fixture, not a read). The function's own comment at `:104` concedes
*"State / Account_Status are currently unused on live Accounts (all null)."* Live population 75/372.

Under the owner's retention rule — *"a possible future use is not enough"* — it fails the test exactly
as `Accounts.State` does.

**Action:** reclassify `Accounts.Account_Status` **RETIRE**, with `Accounts.State` and
`Accounts.Lost_Reasons`, in Stage 5. Add no new behaviour to it. If a reporting or integration consumer
is identified before Stage 5, it returns to KEEP and the `Prospect` rule can be reconsidered then —
but it must be *proven*, not assumed.

### Stage 4 — Flow A, the cardinality cutover *(single controlled window)*

> ⚠ **The booking resolver cannot ship ahead of the Deluge change.** An Account-single-Deal resolver
> deployed while 17 Accounts still hold 2–3 Product Deals would face an ambiguous graph in production.
> The previous plan's "booking first, Deluge second" ordering is **withdrawn**.
>
> ⚠ **A booking pause is NOT sufficient, and the earlier claim that "while booking is paused nothing
> reads Deals" was false.** Booking is one writer among several. The Deluge orchestrators themselves
> read and write Deals on every Lead, Contact and Account save — including saves a human makes in the
> Zoho UI, and including WF001a/b0/b2/c/d, which are `create_or_edit` with `repeat=true` and **no
> criteria**.

**A full CRM maintenance freeze is required for the window.** Every one of these must be stopped, and
each is an independent entry path into the Deal graph:

| # | Writer | How it is frozen |
|---|---|---|
| 1 | **Booking** (`jurnii.vercel.app`) — creates Leads and Meetings, calls `processLead` with triggers enabled | Take the form offline **and** stop the ops worker; drain in-flight `booking_journeys` first |
| 2 | **Workflow rules WF001a / b0 / b2 / c / d** — fire `processLead` / `processContact` / `processAccount` / `processDeal` on any create or edit | **Deactivate all five for the window.** They are the only path by which a UI save reaches the orchestrators |
| 3 | **WF006 / WF007 / WF008** — Call, Event and Task handlers | Deactivate |
| 4 | **WF020 / WF021** — Quote handlers | Deactivate |
| 5 | **WF010c / WFC-SchedEmail** — date-triggered; they fire on a clock, not a save | **Deactivate.** A date rule will otherwise fire mid-window against a half-migrated graph |
| 6 | **Human edits in the Zoho UI** | Announce the freeze. With 1–5 deactivated a human edit is inert, but a human *delete* is not |
| 7 | **This agent, and any other MCP client** | Read-only for the duration |

⚠ **The freeze cannot simply be held until R1–R11 pass — that was a contradiction.** An import of
Leads produces **no** Contacts, Accounts, Deals or Quotes while WF001a/b0/b2/c/d are inactive: those
rules *are* the conversion pipeline. Re-entry is therefore **staged**, and each phase names exactly
which rules are active.

#### 4.0a — the staged cutover

Throughout **every** phase below: **booking offline, human CRM edits frozen, scheduled sends off, all
unrelated automation off.** Only the rules named as active in a phase are active.

| Phase | Active workflows | Action | Stop condition |
|---|---|---|---|
| **P0 · Freeze** | **none** | Deactivate all 18. Record `last_executed_time` for each. Drain in-flight `booking_journeys`, take the form offline, stop the ops worker | — |
| **P1 · Publish** | **none** | **First: verify the `zoho_crm` connection** (see below). Then publish **Stage 2 (2.1–2.4) and the Stage 4 Deluge set (4.2–4.9)**, then the booking resolver (4.1). No rule is active, so nothing executes on publish. ⚠ **No field is deleted in P1** — Stage 5 deletion happens last, after P10 | Any publish error; a failed connection check |

> ⚠ **P1 PRE-FLIGHT — the `zoho_crm` connection is now a hard runtime dependency.**
>
> Work item 3.1 rewrote `_util_resolveDealPipeline` to read `Deals.Pipeline` over REST
> (`invokeurl`, connection `zoho_crm`) instead of via native `getRecordById`, which omits the
> special Pipeline field. There are **8 call sites**.
>
> If that connection is unauthorized, or has lost the `ZohoCRM.modules.deals` scope, **every**
> pipeline resolution returns `"unresolved"`. Two things then happen together, org-wide: cadence
> dispatch blocks, and `[pipeline_unresolved_no_dispatch]` reviews are raised on every Contact
> that tries. The same connection also carries the Partnership Deal REST insert and the Quote
> REST writes.
>
> **Before enabling any rule at P7, confirm in Setup → Connections that `zoho_crm` is connected
> and holds `ZohoCRM.modules.deals`.** This is cheap to check and expensive to discover at P7.
>
> **Call volume** is a separate, lower-priority question: `routeContactSequence` resolves the
> pipeline once and reuses it, but `createAuxTask` and `sendSequencedEmail` each resolve
> independently, and one dispatch pass can call `createAuxTask` several times. **Measure it during
> the P4 canary** rather than pre-optimising — a per-run cache is easy to add later and premature
> now.
| **P2 · Wipe** | **none** | Delete child-first: Quotes → Deals → Activities → Contacts → Accounts → Leads | Any delete failure |
| **P3 · Canary ingestion** | **WF001a, WF001b2, WF001c, WF001d** — and nothing else | Import the canary set from the CSV: **one** multi-Contact, multi-Product B2B company (F1–F9) **plus one minimal Partnership company** (F10, for C16 — it cannot be folded into the first) | — |
| **P4 · Canary verify** | same four | Verify the canary in full (4.0b). **Read every write back** | **Stop on any failed readback.** Do not proceed to P5 |
| **P5 · Bulk import** | same four | Import the remainder of `Jurnii LTD Pipeline - CLEANED.csv` | Any error, or any Manual Review the canary did not also produce |
| **P6 · Rebuild verify** | same four | Verify **R1–R11** across the whole rebuilt set | Any R-check failure |
| **P7 · Activity + cadence** | add **WF001b0**, then **WF006, WF007, WF008** | Enable in that order, one at a time, verifying `active`, trigger and `repeat` after each | Any rule that fires unexpectedly on enable |
| **P8 · Quote** | add **WF021 only. WF020 stays INACTIVE and is never re-activated** | **Configure and verify WF021 while it remains inactive** (trigger surface, `repeat` flag, action id `991103000001581241`), **then activate WF021 alone.** WF020 and WF021 are bound to the same function, so they must **never** be active simultaneously — and because WF020 stays off from P0 onward, there is **no sequential hand-over to perform** | WF020 found active at any point; any Quote double-execution |
| **P9 · Date triggers** | add **WF010c, WFC-SchedEmail** | Enable last of the rules — they fire on a clock, so they must not be live over unverified data | Any immediate unexpected fire |
| **P10 · Resume booking** | all intended rules active | Bring the form and ops worker back online | — |

**Why WF001a/b2/c/d are the minimum ingestion set.** WF001a converts the Lead; WF001b2 (`create`)
runs `processContact` on the Contact conversion creates; WF001c and WF001d reconcile the Account and
the Deal. **WF001b0 is deliberately excluded until P7** — it is `field_update` on five Contact fields
with `repeat=true`, so during a bulk import it re-fires `processContact` on automation's own writes.
It is not needed for conversion and only adds noise to the canary.

**WF009a–e stay off throughout and are enabled only after P10**, if at all — they have never fired,
and they carry the Deal-scoped mis-attribution defect recorded in `V6_CRUD_PLAN.md` §3.

#### 4.0b — what the canary must prove

**Composition — one B2B company built to exercise every corrected path at once, plus one minimal
Partnership company (F10) that cannot share the first:**

| # | Fixture content |
|---|---|
| F1 | **One Account** |
| F2 | **One Deal** |
| F3 | **≥ 3 eligible Contacts** with **different roles, Stages, States, and stage-entry timestamps** |
| F4 | **One independent Activation Task per eligible Contact** |
| F5 | **Independent Activities for each Contact** |
| F6 | **≥ 2 Product Quotes under the same Deal** |
| F7 | **Quotes attributed to different Contacts** where required |
| F8 | **One Expansion or Renewal successor** |
| F9 | **One multi-Product booking** |
| **F10** | **A SECOND, separate Account whose Product evidence is `Partnership`**, with ≥ 1 eligible Contact. *(Added 2026-09-04, for C16.)* |

> ⚠ **F10 must be its own company — it cannot be folded into F1.** Pipeline is a property of the
> single Deal, so giving the main canary a Partnership product among its others would resolve that
> one Deal to `Partnership` and suppress **all** of its cadence — which would silently invalidate
> C4, C7 and every dispatch assertion. The Partnership case therefore needs its own minimal Account.
> Keep it small: one Contact and one Product is enough to prove C16.

**Assertions — all must pass:**

| # | Assertion |
|---|---|
| C1 | **Exactly one Account**, `Account_Key` per 4.7a and K1–K6 |
| C2 | **Exactly one Deal**, `Deal_Key == Account_Key`, `Deal_Name == Account_Name`, no `::` |
| C3 | **One Quote per Product**, one Product across all its `Quoted_Items` rows (P1), header/line agreement (P2) |
| C4 | **Every eligible Contact — not only Decision Makers — receives exactly one Activation Task** |
| C5 | **Progressing one Contact changes no other Contact** — Stage, State, `Sequence_State` and stage-entry timestamps all unchanged on the others |
| C6 | **The leading Contact is elected from Contact facts only**, in order: viability → role authority → Stage progression → **current-Stage timestamp** → stable tie-break. No Quote is consulted |
| C7 | **Open Quote attribution follows the independently elected leading Contact** |
| C8 | **Closed Quote attribution is unchanged when the leading Contact later changes** — re-elect, then re-read every Closed Won / Closed Lost Quote and confirm its `Contact_Name` is untouched |
| C9 | **The successor Quote inherits the correct Product and applicable terms** from its predecessor — not from `Deal_Product` |
| C10 | **Predecessor and successor Quotes are not double-counted** in `Deal.Amount` |
| C11 | **Multiple Products create no additional Deal** — `count(Deals where Account = canary) == 1` after every Quote exists |
| C12 | **Multiple Products create no activation ambiguity** — zero `[multi_product_sequence_ambiguous]`, `[quote_product_mismatch]`, `[duplicate_product_deal]` |
| C13 | `primaryContactId == dealContactId` |
| C14 | **Account roll-up demonstrably executed** — proven through **retained authoritative outputs**: the Deal's `Opportunity_State` / `Opportunity_Status` roll-up and `Accounts.Account_Key` persistence. *(The former `Accounts.Account_Status` assertion is removed — that field is being retired, so it cannot serve as proof of execution.)* |
| **C16** | **A Partnership relationship is created as Partnership, and dispatches nothing.** Add a second canary company whose Product evidence is `Partnership`. Assert its Deal reads `Deals.Pipeline == "Partnership"` **and** that its eligible Contacts receive their Activation Tasks but dispatch **zero** Calls, Scheduled Sends and emails. *(Added 2026-09-04. This is the assertion whose absence let a real defect through: every caller passes a blank `pipelineHint`, so an earlier revision created **every** Deal as B2B — including Partnership ones — and the standing dispatch gate then read `B2B` and let the B2B sequence run against a partner. Pipeline is now derived from Account Product evidence at create time, `Partnership` being a real Product. A Partnership canary is the only fixture shape that exercises it.)* |
| C15 | **Every material write is read back from the CRM record** — never inferred from a successful API response. `SUCCESS` proves nothing |

**Any failed readback stops the rebuild before the remaining CSV is imported.** A canary failure means
the code is wrong, not the data — re-freeze at P0, fix, re-run from P2. Do not proceed to P5 on a
partial pass.

| # | Work | Ledger rows | Gate |
|---|---|---|---|
| **4.1** | **Booking resolver.** `booking/integrations/zoho/index.js:470-482` — stop substring-matching the Product name inside `Deal_Name`; resolve the Account's single Deal. Same in `api/_utils/products.js`, `workflows/zoho-ops.js`, `workflows/operator-actions.js` | *(booking)* | **Published in P1**, after the Deluge set |
| **4.2** | **Account-Deal resolver.** `_util_createOrReuseProductDeal` → `_util_resolveOrCreateAccountDeal(accountId, accountKey, accountName)`: `Deal_Key = Account_Key`, `Deal_Name = Account_Name`, no `Deal_Product*` writes. **Retain the Partnership REST-insert branch** — native `createRecord` drops the mandatory `Pipeline`. ⚠ **Re-search `Deal_Key` after insert and assert exactly one match.** Zero → the insert silently failed, stop and raise a review. More than one → stop, raise a review naming every id, **no further write to any of them**. **Never collapse, merge, re-key or Lose a Deal automatically** — the declared UNIQUE constraint is **not enforced live** (two Deals share `jurnii-e2e.dev::jurnii_360`), so a duplicate is a concurrency defect a silent merge would hide | `_util_createOrReuseProductDeal` | 3.3, **1.2 published**. Signature change — callers in the same window |
| **4.3** | **Collapse the three fan-outs.** `processLead:588-680`, `processContact:265-308`, `processAccount:70-215` → one resolver call each. `processLead` concatenates all buckets' `terms_encoded` into a single `import_bootstrap` call. **Preserve tuple-capture-before-`convertLead`** — both adapter reads return null on a converted Lead | `processLead`, `processContact`, `processAccount` | Same window as 4.2 |
| **4.4** | **Narrowed mismatch deletion** — see below | `processDeal`, `processContact`, `handleMeetingEvent`, `_util_resolveManualReviewCode` | 4.2 |
| **4.5** | **Partnership hold.** Delete `processDeal:100-117`; scoping lives at `routeContactSequence:977-990` only | `processDeal`, `routeContactSequence` | `routeContactSequence` live first |
| **4.6** | **Successor Product.** `_util_applyQuoteLifecycle:44-47,202` — inherit from the **predecessor Quote**; `openRenewalId` per **(Deal, Product)** | `_util_applyQuoteLifecycle` | **Before** any change that blanks `Deal_Product` |
| **4.7** | **Role consolidation.** One 415-title authority; delete all three copies; junction reads the Contact; **blank stays blank** (remove the `"Decision Maker"` defaults at `processDeal:218` and in the ranking). **Also unify `Account_Key` onto 4.7a** | `processLead`, `processContact`, `processDeal`, `processAccount` | Role maps: pure de-duplication (byte-identical, zero overlap). `Account_Key`: a real behavioural change — see 4.7a |
| **4.8** | **Leading Contact — fully specified in 4.8a.** Elect from Contact facts only; never iteration order; fix the `primaryContactId`/`dealContactId` divergence | `processDeal`, `processContact` | ⚠ Inverts authority and progression — measure on fixtures |
| **4.9** | **Valuation implementation** — see below | `processDeal`, `_util_resolveQuoteLinePrice`, `_util_normalizeToProductQuoteTuples` | 4.3 |

#### 4.4 — narrowed mismatch deletion

`processDeal:1898-1973` §6b has **four branches, all Deal-product-identity logic**, and **none validates
Quote integrity**:

| Branch | Action |
|---|---|
| `dealProductKey != ""` — compose `accountKey::productKey`, flag disagreeing Quotes | **DELETE** — Product-Deal artefact |
| exactly one non-lost Quote product → derive Deal product | **DELETE** — Product-Deal artefact |
| more than one → `quote_product_mismatch` review | **DELETE** — several Quote Products under one Deal is now **normal operation** (§7.5) |
| none, and FTP+ → `product_unresolved` review | **RE-SCOPE, do not delete.** "A commercial-stage relationship with no Product evidence anywhere" is a genuine data-quality signal. Re-express it against the Account's Quotes, not Deal identity |

**Verified: no header-versus-line Product consistency check exists anywhere in the 38 files**, and no
multi-line guard either. B3 proved agreement 125/125 by manual query — **nothing enforces it.** So this
is a gap to close, and **Product cardinality is not row cardinality**:

| Check | Statement | Why stated this way |
|---|---|---|
| **P1 — Product cardinality** | **All `Quoted_Items` rows on a Quote resolve to the SAME Product** | The §7.2 invariant: *one Product per Quote*. A statement about **Products**, not rows |
| **P2 — header/line agreement** | `Quotes.Quote_Product` equals the Product P1 resolved | §7.4: the header is a derived queryable index, never a competing authority |
| **P3 — row cardinality** | **Not asserted.** One row today (`processDeal:866`), 125/125 live | **An implementation fact, not a semantic invariant.** Splitting one Product across rows — by band, term or brand group — violates nothing. Asserting one row would forbid a legal shape |

Violation of P1 or P2 raises a **Quote-scoped** review naming the Quote id — never a Deal-product
review. `_util_matchDraftQuotes` is untouched: it already discriminates by `Quote_Product` **within one
Deal** and becomes more load-bearing.

#### 4.7a — the exact `Account_Key` algorithm and authority

Four derivations exist today across three files:

| Site | Precedence |
|---|---|
| `processLead:296-314` | `Website` → `Email` domain (free-provider filtered) → **`Company`** → `unknown::<leadId>` |
| `processContact:72-92` (Account exists, key blank) | `Website` → `Email` domain → **`Account_Name`** → `unknown::<contactId>` |
| `processContact:100-110` (no Account) | `Email` domain → **`Company`** → `unknown::<contactId>` — **no `Website` step** |
| `processAccount:52-63` | `Website` → **`Account_Name`** → `unknown::<accountId>` — no email step (**structurally forced**: Accounts carry no `Email`) |

**The derivation, when one is needed at all:**

```
1. domain_from_website(Website)                if Website present
2. domain_from_email(Email)                    if Email present AND not a free provider
                                               {gmail, yahoo, hotmail, outlook, aol, icloud}.com
3. normalize_company(Company | Account_Name)    whichever the module carries
4. "unknown::" + <calling record id>            terminal fallback

domain_from_website(w) = lowercase, strip "https://","http://","www.", take segment before first "/"
domain_from_email(e)   = lowercase suffix after "@"
normalize_company(n)   = remove ( ) : , then trim then lowercase
truncate all results to 200 characters
```

⚠ **One algorithm is not sufficient on its own** — different modules carry different evidence, so the
same company can still key two ways. The **authority rules** govern:

| # | Rule |
|---|---|
| **K1** | **An existing non-blank `Accounts.Account_Key` is authoritative and immutable.** Never recomputed, never overwritten, never "upgraded" because better evidence appeared later |
| **K2** | **A Contact already associated with an Account always inherits that Account's key.** No derivation is attempted |
| **K3** | **A new Account derives its key once**, from the richest evidence available at that moment, and persists it immediately |
| **K4** | **Later records reuse the Account's key**; they never recompute it |
| **K5** | **Before creating another Account, resolution searches ALL available evidence** — the domain form *and* the normalized-name form |
| **K6** | **The resolver contract, by match count:** **zero** — the valid **new-company** case: create exactly one Account, persist its `Account_Key`, and **read the Account and key back**. **Exactly one** — reuse that Account and its immutable key. **More than one** — **stop** with a visible review naming **every** candidate, and perform **no dependent writes**. Never automatically merge, re-key, Lose or delete a duplicate Account |

`processAccount` never replaces a non-blank key — its `if(accountKey == "")` guard at `:50` is already
correct; K1 makes that binding everywhere.

**The Acme case, resolved.** 1) A Lead arrives `Company = "Acme Ltd"`, no website, no corporate email
→ step 3 gives `acme ltd`; **K3** persists it. 2) Later a Contact arrives `x@acme.com`, no Account link
→ step 2 would compute `acme.com`. 3) **K5** searches for an Account matching **either** `acme.com`
**or** the normalized name `acme ltd` — the name form matches. 4) **K1 + K4**: the Contact links to that
Account and **reuses `acme ltd`**; the computed `acme.com` is discarded. **One Account, one Deal, one
company.** Stable-but-worse evidence beats better-but-forking. If step 3 had found **two** candidates,
**K6** stops with a review naming both.

#### 4.8a — the exact leading-Contact ordering

⚠ **`ctrlContactId` is removed from the ordering entirely — promoting it was circular.** Open-Quote
attribution is supposed to *follow* the leading Contact, so it cannot help *elect* one.

| Concern | Rule |
|---|---|
| **Electing the leading Contact** | **From Contact facts only.** No Quote is consulted |
| **Open Quotes** | May be attributed to the independently elected leading Contact |
| **Closed Quotes** (`Closed Won` / `Closed Lost`) | **Retain their historical attribution permanently** (§7.3) |

Each step consulted only on a tie:

| # | Criterion | Exact fact |
|---|---|---|
| 1 | **Viability** | `Contacts.State == "Open"` |
| 2 | **Decision-making authority** | `Contacts.Contact_Role1`, ranked `Decision Maker > Influencer > End User`. **A blank or unrecognised role does not rank — it sorts last.** Today both default to the *top* rank (`processDeal:542-543`); that inversion is removed |
| 3 | **Progression** | Highest `Contacts.Stage` rank on the 8-stage ladder |
| 4 | **Recency** | **`Contacts.Contact_Completed_<CurrentStage>_At`** — the stage-entry timestamp for the Stage the Contact currently occupies. **Most recent wins.** Equal or blank falls through to step 5 |
| 5 | **Stable tie-break** | The incumbent `Deals.Contact_Name` if still a candidate; otherwise the **lowest Contact id**. Never related-list iteration order |

##### The eight Contact stage timestamps — owner-clarified

**All eight are KEEP** — for automation, historical bookkeeping, reporting **and** leading-Contact
selection:

`Contact_Completed_Marketing_Qualification_At` · `_Demo_Booking_At` · `_Demo_Confirmation_At` ·
`_Demo_Hosted_At` · `_Proposal_Preparation_At` · `_Commercial_Agreement_At` · `_Onboarding_At` ·
`_Renewal_At`

**Owner clarification: these are the authoritative timestamp ledger for when each Contact ENTERED the
corresponding Stage.** Where only a date is known, **12:00** is the intentional neutral default time.

⚠ **Semantic note — the api_names say `Completed`; the owner-defined fact is Stage ENTRY.** Documented
deliberately; it must not be "fixed" by inference. A **label-only** rename to *"Contact Entered [Stage]
At"* may be proposed. **Do not change the api_names. Do not create replacement fields.** An earlier
suggestion of a new `Contacts.Stage_Entered_At` is **withdrawn and must not be implemented.**

**The writer is defective and must be corrected.** `processContact:206-218` stamps **every** field
whose rank is `<= contactRank`, write-once — back-filling the whole ladder at one instant and
fabricating a progression that never happened. Measured: **644 of 647 live Contacts carry every
populated stamp at the identical timestamp**, clustered inside the 2026-07-21 import loop.

> **That measurement is evidence of the defective bulk-stamp writer — NOT evidence that the fields are
> unnecessary.** An earlier draft drew the opposite conclusion and is withdrawn.

| # | Required writer behaviour |
|---|---|
| W1 | **Remove** the `stageItemRank <= contactRank` bulk-stamp loop (`processContact:206-218`) |
| W2 | **Reconciliation never fabricates historical progression** — a reconcile pass writes no stage timestamp |
| W3 | On a **real Stage transition**, write **only** the timestamp for the **newly entered** Stage |
| W4 | **Write once.** Never changed by later reconciliation or any unrelated update |
| W5 | **During rebuild, preserve imported timestamp values** — the import is the historical ledger |
| W6 | Source date **without a time** → use **12:00** |
| W7 | **No date known** → leave **blank**. A blank does not rank at step 4 |

**`primaryContactId` and `dealContactId` must resolve to the same Contact.** Today they can differ
(`processDeal:560-561` vs `:2144-2145`), so the Deal's `Contact_Name` and the Contact that Manual
Reviews are raised against can be two different people. Removing the `ctrlContactId` override closes
this by construction.

#### 4.9 — valuation implementation

Removing the fan-out fixes the *multiplication*; the hierarchy still needs wiring. Exact sites:

| Site | Change |
|---|---|
| `processDeal:2318-2335` | The Target-ACV fallback. **Keep the branch** — already close to correct, including RTP → 0 rather than Target ACV. Confirm it reads the **live Account** tier (`:2324`), never `Deals.Company_Tier` |
| `processDeal:2313-2317` | `quote_sum`. **Applicable Quote totals supersede the estimate** — confirm Closed-Lost is excluded and a Renewal successor cannot double-count its predecessor |
| `processDeal:1507`, `:1545`, `:1715`; `_util_applyQuoteLifecycle:193` | `Quote_Target_ACV` writers. Keep — the per-Quote benchmark |
| `_util_normalizeToProductQuoteTuples:124`, `:197-198`; `processDeal:953`, `:1072`, `:1349`; `handleTaskCompletion:1178` | ⚠ **All hardcode `Quoted_Item_Pricing_Tier = "Base"`**, so a Markup or Agency contract **loses its tier on import** and those matrix rows are dead. Carry the real tier through |
| `processDeal:2284-2290` | `Deals.Company_Tier` mirror — retire (zero behavioural readers) |

**No Productless Quote is ever created.** Where no Product is known the Target ACV estimate lives in
`Deals.Amount` under basis `target_acv_pipeline` and **no Quote exists**. **No new field** — the basis
is derivable from `Opportunity_Type` plus the presence of priced Quotes.

### Stage 5 — retirement

| # | Work | Gate |
|---|---|---|
| **5.1** | Remove writers → **publish** → read the whole update map back → delete. `Blocks_Sequence`, `Deal_Product`, `Deal_Product_Key`, `Deals.Company_Tier`, `Deal_Primary_Contact` (collapse 3 readers onto `Contact_Name` first), `Accounts.State`, `Accounts.Lost_Reasons`, **`Accounts.Account_Status`** (per 3.3). Deregister `_util_pipelineForProductKey`, `_util_createOrReuseProductDeal` | **Runs LAST — after P10.** Ordered gates, all required: **G2 settled** → every writer removed and published → rebuild verified (P6) → **full update-map readback** against a live record → restoration testing complete. **No field is deleted during P1 or anywhere inside the freeze.** Writers-first is mandatory — an unknown api_name voids the whole `updateRecord` map |

### Stage 6 — rebuild

**The rebuild is not a separate stage with its own sequence.** It *is* phases **P2–P6** of the staged
cutover defined in **4.0a**, and 4.0a is the single authoritative procedure. See also **4.0b** for the
canary assertions.

---

## Publish order

```
1.1  1.2  1.3                           independent, publishable immediately
     └─ Stage 2 (2.1–2.4) PREPARED + fixture-tested — NOT published
         └─ 3.1 → 3.2        3.3          publishable before the freeze
             └─ 4.0a STAGED CUTOVER — the authoritative sequence:
                  P0  freeze all 18 rules, booking offline, human edits frozen
                  P1  publish Stage 2 + Stage 4 Deluge, then booking resolver   (no field deletion)
                  P2  wipe records                                (all rules inactive)
                  P3  canary import        — WF001a, WF001b2, WF001c, WF001d only
                  P4  canary verify (4.0b) — STOP on any failed readback
                  P5  bulk import          — same four rules
                  P6  verify R1–R11
                  P7  add WF001b0, then WF006, WF007, WF008
                      └─ A-T0 (was B-T0) — first live test, on WF008 enable
                  P8  add WF021 ONLY — WF020 stays inactive permanently
                  P9  add WF010c, WFC-SchedEmail
                  P10 resume booking
                      └─ 5.1  field deletion — LAST, after G2 + readback + restoration testing
```

Throughout P0–P9: **booking, human CRM edits, Activity and cadence workflows, scheduled sends and all
unrelated integrations remain frozen** until their named restoration phase.

Deluge resolves `automation.<fn>` at runtime, so **any signature change ships with every caller in one
window**. Nothing deploys over MCP — the owner republishes by hand, each wave publish-and-readback
verified.

## Post-publication acceptance

**These tests run against the NEWLY PUBLISHED code, never the superseded body.** A-T0 is the former
B-T0, reclassified by owner ruling 2026-08-19. It is the **first live test after publication**, run at
**P7**, at the moment WF008 is enabled.

### A-T0 — activation, on the corrected code

Fixture (verified still in valid pre-state 2026-08-19): Contact `991103000003658001` "E2E Host",
`e2e-1786711232825-618273@jurnii-e2e.dev`; Deal `991103000003645011`; **Task `991103000003663003`**.
⚠ **Do not use Task `991103000003664003`** — its `What_Id` points at the other Contact's Deal.

> ⚠ **P2 wipes records.** If the cutover has reached P2 before A-T0 runs, these fixture ids no longer
> exist and A-T0 is run instead against an equivalent Activation Task from the **canary** Contact set
> created at P3. The assertions are unchanged; only the ids are re-bound.

**Step 0.** Record `WF008.last_executed_time` immediately before enabling the rule.

**Step 1.** One UI save on the Activation Task: `Task_Sequence_Type = "Call"`, `Task_State = "Won"`,
**leave native `Status` at "Not Started"**. Change nothing else. Save once.

**Why `Call`:** `activate:call` reaches `action = "create_call"` with `emailKind` and `sideEmailKind`
both blank, so `sendSequencedEmail` is never called. Zero send risk by construction; the
`@jurnii-e2e.dev` address is a second layer.

**Step 2 — assertions, all by query, every one read back from the record:**

| # | Assertion |
|---|---|
| A1 | `WF008.last_executed_time` **advanced** past the Step-0 value |
| A2 | Task: `Task_State='Won'`, `Task_Status='Closed'`, `Description` contains **exactly one** `ActivationCommand\|state=Won\|type=Call` line |
| A3 | Contact: **`Sequence_Activated_At` NON-NULL**, `Sequence_Type='Call'`, `Sequence_State='Running'`, `Sequence_Stage='Call'`, `Sequence_Step='1'`, `Status='Working'` |
| A4 | Contact `Stage='Marketing Consent'` **unchanged**, and its `Contact_Completed_Marketing_Qualification_At` **unchanged from its pre-save value** — W4 write-once, and the reconcile must not re-stamp it |
| A5 | **Exactly one** Call created: `Subject='Marketing Consent Call 1'`, `Who_Id=<contact>`, `Sequence_Managed='Yes'`, `Sequence_Attempt=1`, `Call_Task_State='Open'`, `Call_Task_Status='Working'`, `Outgoing_Call_Status='Scheduled'` |
| A6 | **`Call_Task_Stage='Marketing Consent'` and `Call_Task_Opportunity='MQL'` — sourced from the CONTACT** (3.2). `Call_Task_Pipeline='B2B'` — sourced from the **Deal** (3.1) |
| A7 | **No `Call_Purpose_Detail`** on the Call — the write was removed |
| A8 | **Zero emails.** `count(Tasks where Task_Type='Email Sent')` unchanged |
| A9 | **Zero new reviews** of any code — in particular `[activation_command_state_conflict]`, `[activation_no_route]`, `[send_blocked_not_activated]`, and the retired `[multi_product_sequence_ambiguous]`, `[quote_product_mismatch]`, `[duplicate_product_deal]` |
| A10 | **`What_Id` absence is tolerated.** Repeat Step 1 on an Activation Task with `What_Id` blank: activation still commits, dispatch resolves the Account's single Deal, and **no `skip_missing_ids` log line is written** (2.4) |

**Diagnosis branches, per owner ruling:**

| Observation | Diagnose |
|---|---|
| `Modified_Time` advances, **WF008 does not execute** | The **live workflow binding** — rule active state, trigger surface, `repeat` flag, function association. **Not** the Deluge body |
| **WF008 executes, assertions fail** | The **newly published function**. Bisect by assertion group: A2 → `handleTaskCompletion`; A3/A4 → the Contact write and the W1–W7 timestamp writer; A5/A6/A7 → `routeContactSequence` + the snapshot re-sourcing; A10 → the Deal-optional guards |
| Neither | Re-read the record; confirm the save committed at all before diagnosing anything |

⚠ **Do not re-test the old function under any outcome.**

**`repeat=false` — the one configuration risk to watch at P7.** WF008 is `create_or_edit` with
`repeat=false` and no criteria. If Zoho consumes one execution *per record*, a **second** save on the
same Task cannot re-fire the rule — which would make **A-T2's retry leg structurally unrunnable**. This
is not settleable from the API: `last_executed_time` is org-level and per-record execution state is not
readable. Evidence is ambiguous — the 132 Deluge creates left the timestamp unmoved, suggesting no
allowance was consumed at creation, but WF007 under the same flag is relied upon by booking to re-fire.
**Watch it at P7; if A-T2 cannot fire, the fix is the rule's `repeat` flag, not the Deluge body.**

### A-T1 — the activation trap

One save: `Task_Sequence_Type='Call'`, `Task_State='Won'`, **and native `Status='Completed'`**. Assert
the **full A-T0 set** passes, and `count(Tasks where Description like '%activation_command_state_conflict%')`
is unchanged. This is the 1.1 guard relaxation — on the superseded code it produced a conflict review.

### A-T2 — retry recoverability

Save with `Task_State='Won'` and `Task_Sequence_Type` **blank** → assert `[activation_no_route]` review
created **and** `Task_Status` still `'New'` (the 1.1 `:407` correction). Then set
`Task_Sequence_Type='Call'` and re-save → assert the full A-T0 set. Subject to the `repeat=false`
caveat above.

### A-T3 — snapshot freeze

From the A-T0 end-state, complete the Call with `Call_Task_State='Won'`. Assert Contact
`Stage='Demo Booking'`, a new `'Demo Booking Call 1'` exists, **and the original Call's
`Call_Task_Stage` is still `'Marketing Consent'` and `Call_Task_Opportunity` still `'MQL'`** — the
`handleCallOutcome:268-270` re-stamp deletion (3.2). Emails still 0. **And** the Contact's
`Contact_Completed_Demo_Booking_At` is now stamped while
`Contact_Completed_Marketing_Qualification_At` is unchanged — W3 writes only the newly entered Stage.

---

## Simplification and preservation together

| Removed | Preserved by |
|---|---|
| 3 title-role maps | one authority, identical corpus |
| 3 `Account_Key` precedences | one authority, one precedence |
| 5 Product-Deal creation sites | one Account-Deal resolver |
| Product-derived pipeline | `Deals.Pipeline`, readable 96/96 |
| 5-Call escalation | the existing 5-step email chain, copy unchanged |
| Deal-sourced Activity snapshots | Contact-sourced, all nine fields kept |
| `partnership_held` whole-Deal hold | the dispatch gate at `routeContactSequence:977` |
| Deal-product mismatch reviews | **new** Quote-integrity checks (one Product per Quote, header/line agreement) |

## Genuine blockers

| # | Blocker | Settles it |
|---|---|---|
| ~~**G1**~~ | ~~**B-T0 has not run.** Gates all of Stage 2~~ **RECLASSIFIED 2026-08-19 — no longer a blocker.** Became **A-T0**, the first post-publication acceptance test, run at P7 | Owner ruling. It gates *acceptance*, not implementation |
| **G2** | **Void-the-map behaviour UNVERIFIED.** Gates Stage 5 | Two-key `updateRecord` on a fixture: one valid key, one invented api_name; read back |
| **G4** | Level-5 successor exclusion unverifiable on current data | Arises only when one Deal carries Acquisition + Renewal for the same Product |
| ~~**G5**~~ | ~~`Demo Confirmation → Demo Hosted` via `call:positive` believed unreachable~~ **RESOLVED FROM CODE 2026-09-04 — no fixture needed.** See below | Closed on evidence, not belief |

**G5 — resolved from the executable path.** The gate asked for a fixture check before removing
`Demo Hosted` from `cadenceStages`, in case `call:positive` could arrive with a Contact at Demo
Confirmation. It cannot, and this is provable statically:

1. `progression.put("Demo Confirmation", "Demo Hosted")` does exist
   (`routeContactSequence.deluge:491`), so the *mapping* is real.
2. But `call:positive` requires a **Call**, and Calls are only ever created by the cadence block,
   which is gated on `cadenceStages.contains(...)` (`:485`). **Demo Confirmation has never been a
   member of that set** — not before this change and not after. So automation never produces a Call
   at Demo Confirmation, and never produces `call:positive` there.
3. A hand-made Call cannot substitute: `handleCallOutcome.deluge:37` returns immediately unless
   `Sequence_Managed == "Yes"`, and automation only sets that flag on Calls it creates itself.

**Therefore removing `Demo Hosted` from `cadenceStages` describes existing behaviour rather than
changing it.** The only way to reach the path would be for someone to hand-create a Call *and* set
`Sequence_Managed = Yes` on it — an off-contract manual act, not a live route.

**G3 — resolved from executable entry paths. The earlier resolution was wrong.**

The previous answer reasoned from **asset existence** ("every Stage has a Call 1 script, therefore
resolved"). That is not evidence of a cadence. Re-derived from what actually routes:

| Stage | Executable entry into a Call cadence | Verdict |
|---|---|---|
| Marketing Consent | Yes — activation, then stage entry via `cadenceStages` (`routeContactSequence:830`) | **One-Call cadence Stage** |
| Demo Booking | Yes — same path | **One-Call cadence Stage** |
| **Demo Hosted** | **No live path** — see below | **NOT a cadence Stage in practice** |
| Commercial Agreement | Yes — same path | **One-Call cadence Stage** |
| Renewal | Yes — same path | **One-Call cadence Stage** |

**Demo Hosted, from the code.** It appears in `cadenceStages` at `:390`, but neither of its two entry
paths starts a cadence:

- **`meeting:attended` (`:715-728`)** → `nextStage = "Demo Hosted"`, `nextSeqStage = "Meeting"`,
  `nextStep = "None"`, **`action = "await_meeting"`**. The comment is explicit: *"First arrival at Demo
  Hosted via an attended Meeting = AWAITING Meeting outcome, NOT the generic Call cadence."*
- **`demo:followup` — the missed or lost demo (`:602-616`, "CHANGE 11")** → `nextSeqStage = "None"`,
  `nextStep = "None"`, **`action = "none"`**, `sideEmailKind = ""`, reason
  `demo_followup_manual_engagement`. The comment records that the recovery cadence was **deliberately
  removed**, and that its in-flight guard *"is dead code once the recovery cadence itself is gone, so
  it is removed with it."*

This matches the documented rule at `docs/SALES_GUIDE.md:299-304`: a demo that did not happen is marked
`Lost` with `No Meeting / Demo`, **the Contact stays where it is, and a human re-engages** — *"the old
5-step 'Demo Hosted recovery' cadence no longer runs, because a stage's cadence cannot restart once it
has finished."*

**Conclusion: the one-Call cadence Stages are four — Marketing Consent, Demo Booking, Commercial
Agreement, Renewal.** Each maps to its `Call 1` script. **Demo Hosted needs no cadence Call script**,
and its 3 scripts are re-engagement material for a human, not automation assets. Onboarding
(task-driven) and Demo Confirmation (meeting-class) are likewise not cadence Stages.

**Two consequences for the implementation, both in scope for 2.1–2.3:**

1. **`Demo Hosted` should be removed from `cadenceStages` (`:390`)**, so the list states what is true.
   Leaving it is what made this look like an unresolved content question.
2. ⚠ **One residual path must be verified, not assumed.** `progression:396` maps
   `Demo Confirmation → Demo Hosted`, and `call:positive` (`:488-492`) advances with `doEntry = true`,
   which *would* reach the cadence block at `:830`. It is believed unreachable because Demo
   Confirmation is meeting-class and has no Call to produce `call:positive`. **Confirm on a fixture
   before removing Demo Hosted from the list** — if the path is live, removing the entry changes
   behaviour rather than describing it.

**Cosmetic residue, unchanged:** the folder is `call_scripts/Marketing Qualification/` against the Stage
value `Marketing Consent`.

**No longer blockers:** B1 (no Reports/Dashboards — void), B2, B3, B5 (closed), the migration gate
(dissolved by rebuild), fixture emails (`timothy+v6-<purpose>@jurnii.io`, Gmail-verifiable),
`Deal.Amount` (ruled — but see 4.9: the ruling still needs implementing).
