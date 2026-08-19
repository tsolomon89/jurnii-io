> # 📁 HISTORICAL — preserved verbatim; contains the delete-ordering rule
>
> This document holds the single most operationally important finding in the repository: an api_name
> that does **not exist at all** can void an entire Deluge `updateRecord` map, while a field that exists
> but is off-layout only discards its own key. Deleting a field converts the second case into the first.
>
> That finding is **UNVERIFIED** and gates every field retirement. It must be promoted to a live
> fixture test, not to a documentation edit. Nothing below is superseded.
>
> **Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)  ·  reconciled 2026-08-17 (`jurnii-doc-reconciliation-2026-08-17`)

---

## ADVERSARIAL REVIEW — RULINGS

### FINDING THAT APPLIES TO EVERY RETIREMENT (found while verifying, not in any report)

**A deleted api_name does not fail silently — in Deluge it VOIDS THE ENTIRE WRITE MAP.** Two independent in-repo records of a production incident:

- `zoho-functions/v6/activity/handleMeetingEvent.deluge:429-433` — *"Because Deluge sends one updateRecord map, the unknown key took the SUPPORTED key down with it: `Demo_Reminder_Send_At` came back null on every Deal, so WF010c could never fire for any booking."*
- `zoho-functions/v6/processLead.deluge:521-524` — *"the unknown key would have voided this whole enrichment map — the exact failure mode that lost every demo reminder."*

This **contradicts the standing memory** `v6-phantom-field-writes` ("unknown api_names are ignored not fatal"). The reconciliation consistent with `zoho-field-admin-semantics` is: a field that *exists but is off-layout* discards its own key silently; a field that *does not exist* voids the map. Deleting a field converts case 1 into case 2. **Every report treats "delete the field, clean the code later" as safe. It is not.** Concretely, deleting `Blocks_Sequence` before removing its writes would void:
- `createAuxTask.deluge:92-98` `tkMap` → **no aux Task created at all** (Status/What_Id/Who_Id/Task_Sequence_Managed/Task_Type all go down with it)
- `createManualReview.deluge:70-82` `coMap` → **no Manual Review created**
- `handleTaskCompletion.deluge:219` and `processContact.deluge:452` — `{"Status":"Deferred","Blocks_Sequence":"No"}` → the surviving key `Status:"Deferred"` is the **dedupe-retire stop-gate**; voiding it leaves duplicate Tasks live forever
- plus `routeContactSequence:1603/1648`, `sendSequencedEmail:394/417`, `processContact:508`, and the booking REST write at `booking/integrations/zoho/index.js:529`

**Mandatory ordering for all retirements: remove and publish every write first, verify, then delete the field.** Note `Blocks_Sequence` is written by booking at `index.js:529` but is **not** in `WRITTEN.Tasks` (`booking/tests/zoho-field-names.test.js:107`), so the test suite will not catch it.

---

### 1. `Tasks.Blocks_Sequence` — **REFUTED as "reproducible", SURVIVES as "retirable"**

**The reproducibility claim is false.** I recomputed the derived predicate (`Task_Sequence_Managed==true && Task_Type ∉ {Scheduled Send, Email Sent} && Status ∉ {Completed,Cancelled,Deferred} && Task_Status != Closed`) — the exact expression at `routeContactSequence.deluge:363` and `:1406` — over all 219 live Tasks:

```
blank = 0   agree = 181   stored Yes/pred No = 38   stored No/pred Yes = 0
```

So **no**, it is not reproducible on every live Task; it disagrees on 17.4%. Report A's "superseded by the computed predicate" and Report D's framing both overstate it.

**Retirement nevertheless survives**, on grounds the reports got right for the wrong reason:
- Zero reads. `grep 'get("Blocks_Sequence")'` across all 38 `.deluge` files returns nothing; both former read sites now compute inline. Booking writes it, never reads (`taskIsClosed`, `index.js:547-550`, keys off `Status`/`Task_Status`).
- Zero non-code consumers **verified by me**: absent from all 18 workflow rules (re-fetched each rule detail via `/crm/v8/settings/automation/workflow_rules/{id}` — `Blocks_Sequence: NONE`), and absent from all 81 custom views (23 Calls / 19 Contacts / 11 Deals / 11 Events / 17 Tasks captures). Present only on `Tasks > Standard > "Sequence"` section, sequence 6, `required:false`.
- The 38 divergences are **behaviourally inert**: 37 have **no `What_Id`**, and both read sites scan `searchRecords("Tasks","(What_Id:equals:"+dealId+")")` — they were never in the scanned set under either model. They are booking's contact-only Manual Reviews (`buildManualReviewTask`, which sets `Blocks_Sequence` but never `Task_Sequence_Managed`). The **one** in-scope divergence, `991103000002920013` (`Status=Deferred`, `Task_Status=Working`, `Blocks_Sequence=Yes`), is a case where the predicate is *more* correct — the stored field would block that Contact's cadence permanently.

**Refute Report B's P8.** Report B proposes `NOT(Task_Type=='Sequence Activation' && Status=='Deferred')` as a perfect 219/219 fit. Do not adopt it: it is fitted to a 3-record positive class, it is **not what the code computes**, and adopting it would re-introduce the stored field's staleness bug.

**Verdict: SURVIVES retirement.** Justification must be "zero readers + verified zero non-code consumers", never "reproducible". Sequence the writes-first ordering above.

---

### 2. `Calls.Sequence_Stage` → `Call_Task_Stage` — **REFUTED**

The rewire does **not** preserve meaning. Three independent reasons, all verified this session.

**(a) The two picklists are not interchangeable, and only one is space-safe.** Freshly fetched `GET /crm/v6/settings/fields?module=Calls&type=all`:

| | `Sequence_Stage` (13) | `Call_Task_Stage` (9) |
|---|---|---|
| storage | **actual == display for all 12 values** | `Demo Booked→Demo Confirmation`, `Demo Attended→Demo Hosted`, `Commercials Sent→Proposal Preparation`, `Commercials Signed→Commercial Agreement`, `Renewall→Renewal` |
| vocabulary | carries **both** generations as distinct storable values | new names exist only as *display labels* |

The only reader is a **string equality guard** against `Contacts.Stage` (`handleCallOutcome.deluge:90-96`):
```deluge
if(callSeqStage != "" && callSeqStage != contactStage)
{ updateRecord("Calls", callId, {"Call_Task_Status":"Closed","Outgoing_Call_Status":"Cancelled"}, ...); return; }
```
Today the guard is **immune to display-vs-actual ambiguity**: whatever string Deluge returns from `Contacts.Stage` — display `"Demo Confirmation"` *or* actual `"Demo Booked"` — is a valid `Sequence_Stage` actual value, so it round-trips verbatim and the compare holds under either space. `Call_Task_Stage` has no such property: it round-trips only if Deluge's write space and read space agree. **A mixed-space round trip (write accepts the actual `"Demo Booked"`, read returns the display `"Demo Confirmation"`) makes the guard fire on every Call** — silently closing the whole Call cadence with `Call_Task_Status=Closed` / `Outgoing_Call_Status=Cancelled` and no error anywhere. Calls has **0 records**, so this round trip is **UNVERIFIABLE read-only** and cannot be tested without a write. The rewire moves 4 gating comparisons onto an untested value space to no benefit.

**(b) The dedupe reads come from a related-list payload of unknown shape.** `routeContactSequence.deluge:1494-1499` reads `getRelatedRecords("Calls","Deals",dealId)` **first**, with `searchRecords` only as fallback — the inverse of the Tasks scans, where the code comments explicitly warn *"getRelatedRecords related-list payloads can omit control fields"* (`:337-340`, `:1386-1388`). If `Call_Task_Stage` is not in that payload, `ifnull(...,"")` yields `""`, `dupCall` never becomes true, and `routeContactSequence` **creates a duplicate Call on every re-entry**. Unverifiable with 0 Call records.

**(c) Module ambiguity is an active hazard here.** `Sequence_Stage` exists on **Contacts** (the Email/Call/Meeting/Task cursor) *and* **Calls** (8-stage business stage), and both are read **six lines apart in the same function** (`handleCallOutcome.deluge:76` = Calls, `:86` = Contacts). Any retirement instruction phrased by bare api_name risks destroying the Contacts cursor, which gates the `skip_processed_attempt` idempotency guard (`:97-104`) and the SEQ-6 exhaustion proof (`:338-349`).

**Not a blocker, contra Reports C/D framing:** I re-verified all 18 rules — `Sequence_Stage: NONE`, `Call_Task_Stage: NONE`. WF006's criteria are `Call_Task_State` and `Sequence_Managed`, not the stage fields.

**Verdict: REFUTED.** Retire the **other** half: `Calls.Call_Task_Stage` has 0 readers, 0 workflow references, 0 view references, 0 records, and stores the legacy vocabulary. `Calls.Sequence_Stage` must be KEPT. Separately, its dual-vocabulary picklist is a latent defect — nothing prevents a legacy value being written to the field the supersede guard compares — but that is a picklist cleanup, not a retirement.

---

### 3. `Tasks.Task_Sequence_Stage` → `Task_Stage` — **REFUTED**

Retiring the "duplicate" loses a **blank-vs-populated guard**, and I have a live record that changes behaviour on day one.

**The guard inverts on blank.** `routeContactSequence.deluge:363-364`:
```deluge
btIsBlocking = (btManaged=="true" && btType!="Scheduled Send" && btType!="Email Sent" && btStatus!="Completed" && btStatus!="Cancelled" && btStatus!="Deferred" && btTaskStatus!="Closed");
if(btWho == contactId.toString() && btIsBlocking && (btSeqStage == "" || btSeqStage == stage))
```
Blank `Task_Sequence_Stage` means **"unscoped — block at every Stage."** The comment at `:359` says so: *"Task_Sequence_Stage blank or == this Stage."* `createAuxTask.deluge` never writes `Task_Sequence_Stage`; it writes only `Task_Stage:135`, sourced from `deal.get("Opportunity_Stage")` (`:132`) — a **different module and a different field** from the sequence's `nextStage`.

**Live consequence, measured.** Of 219 Tasks: 132 have both (0 disagree), **18 have `Task_Stage` set with `Task_Sequence_Stage` blank**, 0 the reverse. I checked all 18: every one is `Task_Type=Manual Review`, `Task_Sequence_Managed=true`, `Status=In Progress`, `Task_Status=Working`, `Task_State=Open` — i.e. **all 18 satisfy `btIsBlocking`, and all 18 carry a `What_Id`, so all 18 are inside the scan scope.** Today all 18 block unconditionally. Under the rewire they become Stage-scoped, and I joined each to its `Who_Id` Contact's current `Stage`:

```
991103000002874113  Task_Stage=Demo Booking   contactStage=Renewal   *** STOPS BLOCKING ***
(the other 17 currently match)
```

That is an immediate, silent live regression — an open `[rtp_missing_commercial_evidence]` review that gates a Contact's cadence today would stop gating it — and the other 17 convert to time bombs that unblock the moment their Contact's Stage moves.

**Second loss: the stale-stage skip inverts too.** `handleTaskCompletion.deluge:112-117` returns `skip_stale_stage` when `taskStage != "" && taskStage != contactStage`. Manual Review Tasks have blank `Task_Sequence_Stage` today, so completing one **always** runs — which is the documented resume mechanism (`handleEmailEvent.deluge:8`). Rewired to `Task_Stage`, those 18 would be skipped whenever the Contact has moved on, and completing the review would silently fail to resume the sequence.

**Third loss: stage adoption changes provenance.** `handleTaskCompletion.deluge:586-604` writes `taskStage` onto `Contacts.Stage` under a rank guard. Rewired, the adoption source for aux Tasks becomes `Deals.Opportunity_Stage` rather than the Contact's own sequence stage — a different authority writing the Contact's primary state field.

**Fourth: the migration corrupts on the actual axis.** Verified metadata: `Task_Sequence_Stage` stores the **new** names as actual values (`Demo Confirmation`, `Renewal`, …); `Task_Stage` stores **legacy** actuals (`Demo Booked`, `Renewall`, …) behind renamed labels. The 132 agreeing rows agree only in **display space**. Any migration that reads and writes actual values (bulk update, data import, mass-update API) would write `"Renewal"`/`"Demo Confirmation"` — values that are **not** members of `Task_Stage`'s actual set — corrupting or dropping 132 rows.

**Note the reverse direction is also not free:** retiring `Task_Stage` instead destroys the only stage record on those 18 aux Tasks, with no migration source (`Task_Sequence_Stage` is blank on all 18 and `createAuxTask` never populates it).

**Verdict: REFUTED.** `Task_Sequence_Stage` must be KEPT (3 readers, 4 gated branches). `Task_Stage` is a legitimate separate retirement candidate (0 readers, 0 workflow/view references) — but it is **NEEDS-OWNER-DECISION**, not free: it is the only stage record on 18 live aux Tasks and it is sourced from a different field on a different module, so it is not a duplicate of anything.

---

### RULINGS ON THE REST OF THE REPORTS' RETIREMENT SHORTLIST

| Field | Ruling | Reason |
|---|---|---|
| `Deals.Deal_Primary_Contact` | **SURVIVES** (with one caveat) | I confirmed all 3 readers fall through to `Contact_Name` on the very next lines (`createManualReview:39-45`, `handleMeetingEvent:573-579`, `_util_applyQuoteLifecycle:55-61`); 0 writers; null on all 96 Deals. **Caveat:** it is a lookup, so deleting it removes the Contacts-side related list `Contact_Primary_Deal` (Report C matched lookup id `991103000001184289` to the related-list id). That related list is empty for every Contact, so the loss is cosmetic — but it is a UI surface the reports classified as "no consumer". |
| `Calls.Call_Task_Stage` | **SURVIVES** | 0 readers, 0 records, 0 workflow/view refs. This is the correct half of ruling 2. |
| `Calls.Call_Task_Pipeline` / `Call_Task_Opportunity` | **SURVIVES** | 0 readers, 0 records, 0 non-code refs. No history exists to destroy. |
| `Events.Meeting_Task_Pipeline` / `Meeting_Task_Opportunity` | **SURVIVES** | 0 readers, null on all 155 Events. Amend `WRITTEN.Events` first (it over-declares both). |
| `Events.Reminder_Send_At` | **NEEDS-OWNER-DECISION** | 0 readers and null on all 155 Events, so nothing breaks. But Report D's retention argument is sound and unrefuted: `Deals.Demo_Reminder_Send_At` is a single scalar overwritten by each new meeting, while the Event copy is per-meeting, and its *absence* is meaningful (`handleMeetingEvent:388` writes only when the T-1 reminder is still in the future). Retiring it is a product call about the multi-demo audit trail, not a code fact. |
| `Tasks.Task_Pipeline` | **NEEDS-OWNER-DECISION** | 0 readers, and 0/182 divergences today — but only because `routeContactSequence:977-989` suppresses cadence on non-B2B pipelines, so Partnership Deals never raise a cadence Task. The org has 9 Partnership Deals. Same freeze-at-create mechanism as `Task_Opportunity`; the data simply has not exercised it yet. |
| `Tasks.Task_Opportunity` | **REFUTED as free** / NEEDS-OWNER-DECISION | Report D's point-in-time finding stands and I did not find a counter: 33 of 182 already disagree with their Deal's current `Stage`. Deriving it retroactively relabels 33 Tasks. 0 readers means no *code* breaks — but this is deliberate destruction of a historical fact, not a cleanup. |
| `Tasks.Task_Stage` | **NEEDS-OWNER-DECISION** | See ruling 3. Not a duplicate; sole stage record on 18 aux Tasks; sourced from `Deals.Opportunity_Stage`. |
| All `Contacts.Sequence_*`, `Contacts.Stage/State/Status`, `Calls.Sequence_Managed/Sequence_Attempt/Call_Task_State/Call_Task_Status`, `Events.Meeting_Task_Stage/State/Status`, `Tasks.Task_Sequence_Managed/Type/State/Status/Task_Type`, `Deals.Opportunity_*` | **KEEP — no retirement proposed, none defensible** | Reports A and D are correct that each gates live branches. I additionally confirmed the workflow-criteria blockers Reports C/D found and Report A's premise missed. |

### CORRECTIONS TO THE PREMISE AND THE REPORTS

1. **The briefing's "only fields in any rule criteria" list is incomplete** — confirmed independently by re-fetching all 18 rule details. `conditions[].criteria_details.criteria` adds four live criteria fields on ACTIVE rules: `Tasks.Task_Sequence_Managed`, `Tasks.Task_Type`, `Tasks.Status` (WFC-SchedEmail); `Calls.Call_Task_State`, `Calls.Sequence_Managed`, `Calls.Next_Follow_Up_Date` (WF006, both condition groups). Report A §0 asserts WF006 has no field criteria — **wrong**.
2. **None of my three target fields is a workflow blocker** — `Blocks_Sequence`, `Task_Stage`, `Task_Sequence_Stage`, `Call_Task_Stage`, `Sequence_Stage` all returned `NONE` across all 18 rules and all 81 custom views.
3. **Report A §22 "9 writers, zero readers ⇒ cleanest deletion candidate"** understates the ordering hazard (map-voiding) and overstates reproducibility.
4. **Report D §2's claim that the 18 blank-`Task_Sequence_Stage` Tasks matter** is right, but it did not test the consequence. I did: one of them changes behaviour immediately.

### UNVERIFIED — must be closed before any deletion

- **Zoho Reports / Dashboards / Analytics.** No reachable REST surface from this client (`400 INVALID_REQUEST`). Every "no non-code consumer" verdict above, including all three rulings, is conditional on a manual console check. Reports C and D both flagged this; neither could close it. **Do not treat "not found" as "not present" here.**
- **`/settings/functions`** returns HTTP 500 on v6 and v7 — live CRM functions (button/scheduled/standalone) could not be enumerated. The repo capture `crm_functions_raw.json` is stale (lists `sequenceRouter`, `handleDemoOutcome`, `Convert Lead`, none of which exist among the 38 current files).
- **Whether an unknown api_name voids a Deluge map or is silently dropped.** The code says voids (twice, with a production incident behind it); memory `v6-phantom-field-writes` says dropped. This must be settled — it decides whether field deletion before code cleanup is a cleanup or an outage.
- **Deluge's read/write value space for a renamed picklist** (`Call_Task_Stage`, `Task_Stage`) is unverified empirically; COQL/REST display-space behaviour was verified by Report B but is a different code path from `zoho.crm.getRecordById`.
- **Calls has 0 records**, so every Calls verdict rests on code plus metadata only.

Scratch scripts (no repository file modified; only `GET /settings/*` and `POST /crm/v6/coql`): `C:/Users/Audna/AppData/Local/Temp/claude/c--Development-Projects-jurnii/b7e7d9a5-fd89-4a8f-bfec-0233280951a8/scratchpad/adv1.js`, `adv2.js`, `adv3.js`, with captures `adv_tasks.json`, `adv_q1_mismatch.json`, `adv_q3_onlyTaskStage.json`, `raw/adv_wf_*.json`.