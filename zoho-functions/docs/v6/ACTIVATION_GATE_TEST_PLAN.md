# v6 Activation Gate Test Plan

Verifies the sequence-email invariant:

```
No automated sequence email may be sent until the contact's activation Task
has been explicitly completed with a valid Task Sequence Type.
```

and its corollary:

```
one intended email  <->  one Email Sent audit Task  <->  one sequence transition
```

These are live MCP-driven tests: the gate spans Deluge, Zoho field state and workflow
rules, so it cannot be exercised off-platform. The Quote-naming contract IS unit
testable and lives in `tests/test_quote_subject.py` — run that first, it is free.

## Preconditions

- `Contacts.Sequence_Activated_At` (datetime) EXISTS, with api_name EXACTLY
  `Sequence_Activated_At`. **The gate fails closed**: with the field absent (or named
  differently) every send is blocked org-wide, so create and verify it before publishing.
- **No active Zoho Cadence on Contacts.** THIS GATE CANNOT COVER CADENCES. Both gates
  live in Deluge; a native Cadence sends via Zoho's own engine, so it bypasses the
  activation check, the SendKey idempotency AND the `Email Sent` audit Task — it would
  break the invariant silently and invisibly. As of 2026-07-15 the org has 26 email
  notifications with `feature_type: "cadences"` on Contacts ("Welcome Email 1..26",
  created 2026-06-28/29) and `getCadenceModuleActionsCount(Contacts) = 1`. The API
  exposes no cadence-listing endpoint: **verify by hand in Setup -> Automation ->
  Cadences that none is active on Contacts.** If one is active, it must be paused or
  brought under `sendSequencedEmail` before this gate can be claimed to hold.
- Republished: `routeContactSequence`, `sendSequencedEmail`, `processDeal`,
  `handleTaskCompletion`, `_util_applyQuoteLifecycle`, `_util_buildQuoteSubject` (new).
- WF008 (Tasks create_or_edit -> handleTaskCompletion) active. No workflow rule change
  is required by this fix.
- Seed Contacts use Gmail plus-addressing (`t.l.c.solomon+<runkey>@gmail.com`) so a
  real delivery is observable and attributable to the run.
- Record every created ID; delete all synthetic records afterwards.

## Evidence sources per test

| Signal | Where to read it |
| --- | --- |
| Email actually sent | Gmail inbox for the plus-address + Zoho message_id in the audit Task Description |
| Send blocked | automation log `blocked_not_activated`, and a `Manual Review` Task whose Description starts `[send_blocked_not_activated]` |
| Dispatch gated | automation log `dispatch_gate` = `activation_not_established` |
| Activation recorded | `Contacts.Sequence_Activated_At` non-blank + log `activation_stamped` |
| Audit invariant | exactly one `Task_Type = Email Sent` Task per SendKey |

## Negative tests — nothing may send before activation

| ID | Scenario | Action | Expected |
| --- | --- | --- | --- |
| AG-N1 | Contact creation | Create a Decision-Maker Contact with a Product Deal | Activation Task created. `Sequence_Activated_At` blank. **0 emails**, 0 `Email Sent` Tasks |
| AG-N2 | Activation Task creation | Observe the Task from AG-N1 | Creating it sends nothing. **0 emails** |
| AG-N3 | Unrelated Contact edit | Edit e.g. `Phone` / `Title`, save | WF001b0 refires processContact. **0 emails**, no duplicate activation Task |
| AG-N4 | Activation without a route | Set `Task_State = Won`, leave `Task_Sequence_Type` blank | Task reopened + `[activation_no_route]` Manual Review. `Sequence_Activated_At` still blank. **0 emails** |
| AG-N5 | Direct `routeContactSequence` before activation | Invoke `routeContactSequence(contact, deal, "resume", "{}")` | log `dispatch_gate` = `activation_not_established`. No Call/Task/email dispatched. `Sequence_State` stays `Not Activated` |
| AG-N6 | Direct `sendSequencedEmail` before activation | Invoke `sendSequencedEmail(contact, deal, "Marketing Consent", 1, "opener", "")` | Returns `""`. **0 emails**, no audit Task. `[send_blocked_not_activated]` Manual Review naming contact, step `marketing-consent:1:initial`, missing condition, caller hint |
| AG-N7 | **The reported defect** — commercial:signed bypass | Un-activated Contact at Stage `Commercial Agreement`; drive its Quotes to Confirmed so processDeal's term gate routes `commercial:signed` | Stage still advances to Onboarding (structural). **0 emails**, NO `onboarding:0:signed-confirmation` audit Task. `blocked_not_activated` logged |
| AG-N8 | Quote creation cannot bypass | Create/confirm a Quote on an un-activated Contact's Deal | WF020 -> handleQuoteStageChange -> processDeal reconciles. **0 emails** |
| AG-N9 | Deal update cannot bypass | Edit the Deal to refire processDeal | **0 emails** |
| AG-N10 | Import cannot bypass | Import a Lead with contract evidence at RTP (the AG-N7 shape, via import) | Deals/Quotes/Stage reconcile. **0 emails**. This is the exact production failure — Contact 991103000002491263 |
| AG-N11 | Onboarding change cannot bypass | Complete an `Onboarding Setup` Task on an un-activated Contact | `Sequence_State` handling runs. **0 emails** |
| AG-N12 | Repair/manual-review completion cannot bypass | Complete a `Manual Review` / `Data Repair` Task (routes `resume`) | `resume` is gated. **0 emails** |
| AG-N13 | Scheduled send cannot bypass | Let a `ScheduledSend` wake-up Task come due for an un-activated Contact | `sendScheduledEmailFromTask` delegates; send blocked. Wake-up Task NOT turned into an audit record. `Sequence_State` NOT advanced to Complete |
| AG-N14 | Demo reminder cannot bypass | Invoke `sendDemoReminder` for an un-activated Contact | **0 emails**, blocked + Manual Review |

## Positive tests — activation works, exactly once

| ID | Scenario | Action | Expected |
| --- | --- | --- | --- |
| AG-P1 | Email activation sends exactly one | On the AG-N1 Task set `Task_Sequence_Type = Email`, `Task_State = Won` | `Sequence_Activated_At` stamped; `activation_stamped` logged. **Exactly 1** email (`marketing-consent:1:initial`) received at the plus-address. **Exactly 1** `Email Sent` audit Task. **One** sequence transition: `Sequence_State = Running`, `Sequence_Type = Email`, Call 1 created |
| AG-P2 | Call activation sends none | Fresh Contact; `Task_Sequence_Type = Call`, `Task_State = Won` | Activated + stamped. Call-first: **0 emails** (correct — Call route has no opener). Exactly 1 Call |
| AG-P3 | Manual activation | `Task_Sequence_Type = Manual`, `Task_State = Won` | Stamped (activation happened). `Sequence_State = Stopped`, `Status = Working`. **0 emails** |
| AG-P4 | Post-activation cadence flows | From AG-P1, drive the cadence forward | Emails send normally; each = 1 audit Task = 1 transition |
| AG-P5 | Signed confirmation AFTER activation | Activated Contact, drive Quotes Confirmed -> `commercial:signed` | **Exactly 1** `onboarding:0:signed-confirmation` email + 1 audit Task with `Task_Sequence_Stage = Onboarding` |
| AG-P6 | Already-activated Contacts continue | Any Contact with `Sequence_Activated_At` set | Behaves exactly as before this change |

## Idempotency / duplication tests

| ID | Scenario | Action | Expected |
| --- | --- | --- | --- |
| AG-I1 | Repeated workflow execution | Re-save the activated Contact / Deal several times | No duplicate emails. SendKey idempotency holds. Audit Tasks stay at 1 per key |
| AG-I2 | Re-completing the activation Task | Set the completed activation Task back to Won | `activation_already_processed` guard. `Sequence_Activated_At` NOT re-stamped (stamp is set-once). No second opener |
| AG-I3 | Repeated blocked attempts | Trigger AG-N6 three times | 3 log lines, but **one** Manual Review Task — `createAuxTask` dedups on the `[send_blocked_not_activated]` issue code. Still 0 emails |
| AG-I4 | Blocked then activated | Run AG-N6, then activate properly | The opener now sends exactly once. The earlier block did not consume the SendKey |

## Regression guards (things the gate must NOT break)

| ID | Scenario | Expected |
| --- | --- | --- |
| AG-R1 | Structural reconciliation on un-activated Contacts | Stage advance, Product linking, Quote upsert, Deal Amount, contract ledger and Account rollup all still run |
| AG-R2 | `Status = Working` rollup | An un-activated imported Contact at Onboarding is still `Status = Working`, so its Deal/Account still roll up via `anyContactWorking` (the `wouldRun` path) |
| AG-R3 | Stopped Contacts | Unchanged: structural reconciliation runs, dispatch suppressed |

## Data repair (run once, after publishing)

Contact `991103000002491263` (Simon Herchel) is the live casualty: `Sequence_State = Running`
with `Sequence_Type` null and zero activation Tasks — a state the state machine cannot
produce legitimately. It already received `onboarding:0:signed-confirmation`.

```
select id, Full_Name, Stage, Sequence_State, Sequence_Type
from Contacts
where Sequence_State = 'Running' and Sequence_Type is null
```

Expected after the fix: this query returns rows only for Contacts corrupted before the
fix. Reset each to `Sequence_State = Not Activated`, `Sequence_Stage = None`,
`Sequence_Step = None`, leaving `Sequence_Activated_At` blank, so the Contact re-enters
through a proper activation Task.

The reset is REQUIRED, not cosmetic: `processContact` only creates an activation Task
when `Sequence_State == "Not Activated"`. A Contact left on the corrupt `Running` value
would get no activation Task (so nothing can activate it) while the gate blocks its
sends — permanently stuck. Resetting it lets `processContact` issue the activation Task
that unblocks it.

## Expected blast radius on publish (intended, not a regression)

Every `Not Activated` Contact stops receiving automated email until a rep completes its
activation Task. That IS the invariant. Before this fix those Contacts dispatched freely
— only `Stopped` was suppressed — which is the defect.

This is safe to publish because the unblock path already exists: 50+ open
`Sequence Activation` Tasks are already queued across Demo Booking / Proposal
Preparation / Commercial Agreement / Renewal (verified 2026-07-15). Reps action those
Tasks as normal and their sequences start. Nothing is silently lost.

**No backfill is required for legitimate Contacts**: at the time of the fix, zero
Contacts in the org had a non-null `Sequence_Type`, so no live activated sequence
exists to grandfather. Re-verify with the query above before publishing — if it ever
returns Contacts that WERE legitimately activated, backfill
`Sequence_Activated_At` for them first or the gate will silence their sequences.

---

# Activation & Meeting Alignment — added acceptance tests (2026-08-08)

Every AG-* test above is **retained as a regression guard** and must still pass. The tests below
are added by the Activation & Meeting Alignment sprint (Changes 1-21). Run them in the order
given. Seed Contacts use Gmail plus-addressing (`t.l.c.solomon+<runkey>@gmail.com`) so deliveries
are observable and attributable. Record every created id and delete all synthetic records
afterwards.

## Preconditions

Every precondition above still applies, plus:

- `Task_Sequence_Type` and `Task_State` are **visible and editable on a completed Activation
  Task** (otherwise Changes 3-6 are unreachable from the UI).
- `Task_Status` and native `Status` are read-only/hidden for reps (the mirrors stay
  automation-owned).
- `BOOKING_MEETING_AUTOMATION_ENABLED` is still `false`.
- V4 confirmed (`Task_Type` contains `Scheduled Send` and `Email Sent` — **verified 2026-08-08**).
- V5 confirmed (`Meeting_Task_Contract_Products` carries the 4 active catalogue names —
  **verified 2026-08-08, already repaired**).
- V6 confirmed (no Zoho Cadence active on Contacts — **hand verification still required**).

> **Baseline from the pre-publish audit** (`AUDIT_RESULTS_PRE_PUBLISH.md`): the org contains 153
> Activation Tasks, **all uncommitted** (`Open`/`New`), **zero** Contacts with
> `Sequence_Activated_At`, and **zero** Events with a terminal `Meeting_Task_State`. The LG-*
> tests therefore have **no naturally-occurring records** to run against and must be run on
> **seeded** ones.

## Canonical identity (Change 1)

| ID | Scenario | Expected |
| --- | --- | --- |
| ID-1 | Contact with a completed Activation Task at an older Stage; force `processContact` to re-run | **No second Activation Task.** Log shows the existing one found. |
| ID-2 | Contact with a completed Task on Deal A; create Deal B and re-run | **No second Task.** Identity ignored the Deal. |
| ID-3 | Seed two Activation Tasks: one committed (`Won`, marker present), one Open/New/blank. Edit either. | **Nothing is deferred. Neither Task is modified. The edited command is not acted on.** One `[activation_control_ambiguous]` review naming both ids and their `Task_Sequence_Type`. Re-save twice → still exactly one review Task. |
| ID-4 | **Retirement finality, four steps.** (1) Seed two Open/New/blank Tasks with no marker; edit one, so collapse runs. (2) Let WF008 fire on the newly `Deferred` sibling. (3) Re-save the retained Task. (4) Re-run `processContact`. | (1) Lowest id kept, sibling `Deferred`. (2) Deferred sibling inert — handler returns, nothing written. (3) Retained Task **still usable**: its command processes normally. (4) **No ambiguity review, no additional Task.** Exactly one active candidate at every step. |
| ID-5 | Set the sole Activation Task to `Deferred` by hand, then re-run `processContact` | **No replacement Task.** One `[activation_no_active_control]` report. Re-run twice → still one. |

## Legacy / marker resolution (Change 2) — **the first gate**

Run LG-1..LG-6 **before anything else**. They prove no pre-existing Task can replay activation.

| ID | Scenario | Expected |
| --- | --- | --- |
| LG-1 | Completed `Won` Task, **no** marker, Contact has `Sequence_Activated_At` + `Sequence_Type='Email'`; change the type to `Call` | **`preference_change`, not a replay.** 0 emails, 0 Calls, no Stage change, `Sequence_State` untouched. Marker written `(Won, Call)`. |
| LG-2 | The same Task saved with **no** change | **`legacy_bootstrap`**: marker written `(Won, Email)` and nothing else — 0 emails, 0 Calls, 0 Tasks. Save again → `idempotent_skip`. |
| LG-3 | Delete the `ActivationCommand\|` line from a processed Task, then save | Reconstructed as legacy. **Never replays.** Marker restored; rep-facing text intact. |
| LG-4 | Legacy Task set to `Lost` (and separately `Open`) on a Contact with the timestamp stamped | The corresponding immediate disable runs. No replay, no Contact/Deal state change. |
| LG-5 | Legacy Task whose Contact has the timestamp stamped but **blank** `Sequence_Type` | **Stops safely.** One `[activation_legacy_command_unresolved]` review. 0 emails, 0 Calls. Re-save twice → still one review. |
| LG-6 | Task with two `ActivationCommand\|` lines, or a malformed one | **Stops safely.** `[activation_marker_unreadable]`, nothing written. |
| LG-7 | **The last replay path.** (1) On an **ineligible** Contact with a **blank** timestamp, record `Won`/`Call`. (2) Delete the marker line. (3) Reopen the Contact. (4) Re-save the Task unchanged. | **Nothing starts at any step.** 0 emails, 0 Calls, 0 Tasks, no Stage change, timestamp **still blank**. At (4) it resolves as *reconstruct*: marker restored to `(Won, Call)`, nothing else. Then advance a Stage → exactly one Call 1 for that Stage, nothing from the earlier one. |
| LG-8 | Repeat LG-7 but change the type to `Email` in the same save as (4) | **Stops safely.** `[activation_command_state_conflict]`, nothing written. |

## The two independent controls (Changes 3-7)

| ID | Scenario | Expected |
| --- | --- | --- |
| AC-1 | Canonical Task Open; set `Task_Sequence_Type=Email`, leave `Task_State` | Nothing starts. 0 emails, 0 Calls. Timestamp blank. Log `activation_awaiting_commit`. |
| AC-2 | Set `Task_State=Won` | Cadence starts from the **Contact's current** Stage. Exactly 1 opener email + 1 Call 1. Timestamp stamped. |
| AC-3 | Contact at Commercial Agreement; commit a Task frozen at `Marketing Consent` | Stage **stays** Commercial Agreement. Log `stage_adoption_skipped_no_regress`. |
| AC-4 | Won Contact running an Email cadence; change type to `Call` | Current cadence unchanged — no new Call, none cancelled, no resend. `Sequence_Type='Call'`. Advance a Stage → Call-only entry, 0 opener emails. |
| AC-5 | **Manual is prospective — the load-bearing test.** Contact mid-cadence at Call 2 of 5. Change type to `Manual`. Then drive Calls 2-5 neutral. | On the change: `Sequence_Type='Manual'`, **`Sequence_State` still `Running`**, 0 cancelled, 0 deferred. Then **every remaining step still executes** — Calls 3/4/5 created, cadence emails 2/3/4 sent, the `:5:final` postcall scheduled and sent. |
| AC-5b | Continue AC-5: advance to the next Stage | **Now** Manual takes effect: 0 cadence Calls, 0 cadence emails, 0 ScheduledSend Tasks. `Sequence_State → Stopped` once, at the boundary. At Proposal Preparation a **Draft Commercials Task IS created**. |
| AC-6 | Set `Task_State=Lost` mid-cadence | Open cadence Calls → `Outgoing_Call_Status=Cancelled`, `Call_Task_Status=Closed`. ScheduledSend Tasks neutralized. `Sequence_State=Stopped`. **Unchanged:** Contact `State`/`Status`/`Stage`, `Sequence_Type`, `Sequence_Activated_At`, every Quote and Deal field, every open Draft Commercials / Manual Review / Data Repair Task, every meeting and reminder. |
| AC-7 | Set a previously-Won Task to `Open` | Same neutralization. `Task_Status='Working'`, native `Status='In Progress'`. Log `activation_unaddressed`. |
| AC-8 | Set the Task back to `Won` (from Lost, then from Open) | **Re-enable runs.** `Sequence_State → Not Activated`, marker `(Won, type)`. No replay: 0 emails, 0 Calls, no resume. Timestamp **not** re-stamped. |
| AC-8b | Save the re-enabled Task three more times unchanged | `idempotent_skip` each time. 0 of everything, marker unchanged. |
| AC-8c | From Lost with `Email`, set type `Manual` **and** state `Won` in one save | One `re_enable` adopting Manual. Logs `activation_re_enabled`, not `activated`; `Sequence_State → Not Activated`, not `Stopped`. |

## Storage vs eligibility, and Stage-entry establishment (Changes 2, 21)

| ID | Scenario | Expected |
| --- | --- | --- |
| AC-9 | **Run twice** — once on a Contact that **was** activated before going Lost (timestamp stamped), once on one that **never** was (blank). Contact `State=Lost`. (1) type `Email`→`Call`. (2) `Task_State=Lost`. (3) back to `Won`. | **Every command is recorded.** Markers written at each step; `Contact.Sequence_Type='Call'`. **Throughout: Contact stays `State=Lost`/`Status=Closed`, Stage unchanged, Deal completely unchanged, 0 emails, 0 Calls, 0 Tasks. `Sequence_Activated_At` UNCHANGED in both runs** — preserved in the stamped run, still blank in the other. |
| AC-9b | Continue: a separate process reopens the Contact (`State → Open`). Then re-save the unchanged Task. | **Neither action starts anything.** Reopening: structural work only. Re-saving: `idempotent_skip`. |
| AC-9c | Continue: advance the reopened Contact to the **next** cadence-eligible Stage legitimately | **The stored `Call` preference takes effect automatically, with no further Task save.** Never-activated run: timestamp stamped **now**, logged `activation_established_at_stage_entry`. Both runs: exactly one Call 1 for **this** Stage, 0 opener emails. **Nothing from the earlier Stage is re-entered.** |
| AC-9d | Repeat AC-9c with a marker reading `(Lost, Call)` | **No establishment.** Timestamp stays blank, 0 Calls, 0 emails. |

## Partnership coverage and the standing gate (Changes 18, 20)

| ID | Scenario | Expected |
| --- | --- | --- |
| AC-10 | Partnership-only Contact; commit `Email` + `Won` | Exactly one canonical Task. Committed state and preference stored. **0** Calls, **0** Tasks, **0** ScheduledSend, **0** emails. Log `dispatch_suppressed_partnership`. |
| AC-10b | Continue: advance that Contact through two further Stages | **Still 0** cadence artifacts at every Stage. The gate holds beyond commit. |
| AC-10c | Contact with a B2B **and** a Partnership Deal | **Unchanged from today**: activates on the B2B Deal, no ambiguity review, cadence runs. |

Candidate seeds for AC-10 (Partnership-only, from the pre-publish audit): Chris Garthwaite,
Elliot Berg, Paul Bishop, Haris Khan, Adam Wilson, Lee Knott, Ed Birkin, Leigh Nissim,
Pedro Barreda — the nine primary Contacts on the org's nine Partnership driver Deals. Prefer a
synthetic seed; use these only to confirm the population behaves as expected.

## Loss is local (Changes 16, 19)

| ID | Scenario | Expected |
| --- | --- | --- |
| CL-1 | Explicitly mark a Deal's Primary Contact Lost, no other open Contact | Contact `State=Lost`, `Status=Closed`. **Deal untouched** — `Opportunity_State` still `Open`. `[deal_has_no_viable_contact]` raised. |
| CL-2 | Log a Call `Lost` with `No Response` on a Contact whose `Sequence_State='Complete'` | **Contact NOT Lost. Deal NOT closed.** `[activity_lost_suggests_contact_loss]`. Same assertion for a Lost Task and a Lost Meeting. |

## Meeting truthfulness (Changes 11-17)

| ID | Scenario | Expected |
| --- | --- | --- |
| MT-1 | New meeting, no result entered | `Meeting_Task_State` Open/blank. Reminder computed only if still future. |
| MT-2 | Set `Meeting_Task_State=Won` on a Demo Hosted Contact | Contact → Proposal Preparation **exactly once**. `Meeting_Task_Status=Closed` only after the Stage re-read confirms rank >= Proposal Preparation. Exactly 1 Draft Commercials Task, 1 post-demo email. |
| MT-3 | Force a genuine routing failure (blank `Who_Id`, terminal state) | Event **not** Closed. Reopened to `Working` + `[meeting_contact_unresolved]`. Contact unchanged. Fix `Who_Id`, re-save → processes correctly, still exactly once. |
| MT-4 | Set a second Event to Won for the same Contact | No second advance, no duplicate Draft Commercials, no duplicate post-demo email. |
| MT-5 | Set `Lost` + `No Meeting / Demo` | Lost recorded with reason. `Contact.State` Open, `Deal.Opportunity_State` Open. **Contact stays put with no replayed recovery cadence** — 0 Calls, 0 cadence emails; log `demo_followup_manual_engagement`. A new meeting can be booked and processes normally. |
| MT-6 | Set `Lost` + `No Response` on a Contact whose `Sequence_State='Complete'` | **Contact NOT Lost. Deal NOT closed.** `[activity_lost_suggests_contact_loss]`. |
| MT-7 | Set `Lost` with a blank Lost Reason | Event reopened to `Open`/`Working` + review. No routing. |
| MT-8 | Won Event on a Contact already at Onboarding | Contact **stays** at Onboarding. **Event closes successfully** — **not** reopened. No Draft Commercials Task. Logs `demo_qualified_already_progressed` + `won_routed`. |
| MT-9 | Re-save an already-processed Won/Lost Event three times | MTG-4 returns each time. No duplicate Task, Call, email or Quote key. |
| MT-10 | Open a booked demo Event that already has a `Booking Reference:` Description | The guidance is **appended once**, below the existing text, which is preserved. Re-save twice → still appended exactly once. |

## Rollout gate and deployment

| ID | Scenario | Expected |
| --- | --- | --- |
| BK-1 | **Rollout gate.** Set `BOOKING_MEETING_AUTOMATION_ENABLED=true` in a controlled environment; make one web booking end to end | Exactly one Zoho Event, correlated by `Ext_Calendar_Booking_ID`. WF007 fires once. Contact advances to Demo Confirmation exactly once. Confirmation email + reminder as expected. **Production enablement only after this and MT-1..MT-9 pass.** |
| DA-1 | Publish every changed function, change no record | Zero automation-log entries attributable to the publish. AUD-1..AUD-5 counts identical before and after. Flag still `false`. |
| DA-2 | Re-run AUD-1..AUD-5 | Existing canonical Tasks in place. No bulk regeneration, reset, or automatic activation. |
| DA-3 | Review the audit output | Missing / duplicate / conflicting controls appear as reviewable lists, not silent repairs. |

## Offline contract suites that must be green first

These run locally and gate the live tests. `python tests/<name>.py`, or all under pytest.

| Suite | Proves |
| --- | --- |
| `test_activation_command.py` | The command table, marker round-trip, and **the closed proof that nothing returns `activate` unless `last_kind == "absent"`**. |
| `test_activation_identity.py` | Canonical identity, the retirement rule, collapse finality, and every refusal path leaving an empty retire-list. |
| `test_cadence_artifact.py` | Neutralization reaches cadence Calls and ScheduledSend Tasks **only** — never commercial, rep-owned or sent-email records. |
| `test_cadence_dispatch_gate.py` | Manual scoping to new Stage entry, `create_task` never suppressed, the standing Partnership gate, and Change 21 establishment. |
| `test_activity_loss_propagation.py` | No activity Lost propagates, on any handler, for any action; no path closes a Deal. |
| `test_stage_guard.py` | The two targeted Stage guards and the meeting-Won success rule. |

Plus the pre-existing `test_quote_subject.py`, `test_pipeline_mapping.py` and the booking suites
(`zoho-field-names.test.js`, `deluge-reminder-rule.test.js`, `meeting-automation.test.js`,
`integrations.test.js`, `tests/db/*`).
