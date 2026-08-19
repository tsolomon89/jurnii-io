> # ⚠ ACTIVE — must be re-based onto the authoritative model
>
> This plan predates the authoritative model and is the closest existing artifact to a correction plan.
> Its §2.7 activation fix (remove the "exactly one Product Deal" precondition) reaches the right
> conclusion for one gate and is **retained** — but it does not retire the Product-scoped `Deal_Key`
> composition, and its L134 `Deal_Key` lookup change must be re-scoped, not applied as written.
>
> Superseded as a whole by the v6 correction plan built on the authoritative model. Individual
> corrections C1–C4 remain valid evidence.
>
> **Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)  ·  reconciled 2026-08-17 (`jurnii-doc-reconciliation-2026-08-17`)

---

# v6 + Booking — verified state and corrective plan

Date: 2026-08-10 · Supersedes the question set in
[AUDIT_QUESTIONS_v6_booking_2026-08-10.md](AUDIT_QUESTIONS_v6_booking_2026-08-10.md).

All facts below were determined this session from live Zoho metadata, live records (COQL),
Zoho automation-function registry and failure log, Vercel project + production environment,
and repository history. **No record was written and nothing was published.**

---

## Part 1 — Corrections to the audit

Four findings were reported at the wrong severity, and two of them do not exist. The cause in
every case was the same: I treated the field snapshot's `value` key (which stores Zoho's
`actual_value`) as the value the API round-trips, and I inherited the repo's earlier
"one unknown api_name voids the whole map" theory without testing it.

**C1 — `processDeal`'s Deal update DOES land.** Live Deals carry values only `dUpd` writes:
tier-derived pipeline Amounts (`26000`/`16500`/`10500` for tiers 1/2/3 — §8b's
`target_acv_pipeline` branch exactly) and computed ledgers (Betsson `Amount 136710` /
`Current 45570` / `Initial 6700`). Zoho **ignores** the unknown keys and applies the rest.
F1 is a real invalid-write defect but its consequence is narrow: the six Deal stage-completion
timestamps are silently discarded and `Primary_Contact` never persists. Nothing else is lost.

**C2 — F4 (`Meeting_Task_Stage` vocabulary) does not exist.** Live metadata confirms the
divergence (`Demo Booked`→"Demo Confirmation", `Renewall`→"Renewal", …) — but `Deals.Opportunity_Stage`
has *identical* divergence, and live Deals read back `Opportunity_Stage: "Renewal"` /
`"Demo Confirmation"` while carrying `Stage: "RTP"` / `"SQL"`. That is only possible if
`stageRanks.get(...)` resolved, i.e. **Deluge and COQL both round-trip picklists in DISPLAY
space in this org**, and Zoho accepts a display value on write. The label-keyed rank maps are
therefore correct as written.

**C3 — F5 (`Meeting_Task_Status = "New"`) does not exist.** Same mechanism: `"New"` is the
display of actual `Open`, the write persisted, and the Events that received it
(2026-08-02) also carry `Reminder_Send_At`. `evUpd` landed whole.

**C4 — F8 (manage URL) does not exist.** `PUBLIC_BASE_URL = https://jurnii.vercel.app`, which
is an attached, live project domain. Manage links resolve. jurnii.io is still unattached but
nothing points at it.

What survives unchanged: F2 (phantom Contact writes), F3 (the guardrail gap), F6 (`Deal_Name`
substring matching), F9 (`Cancelled`), F10 (read amplification, recursion, pagination), F11.

---

## Part 2 — Determined facts

| # | Question | Answer |
| --- | --- | --- |
| **A1** | Is the `processDeal` Deal write landing? | **Yes.** Evidence above. No controlled write was needed. Zoho tolerates unknown keys in a Deluge `updateRecord` map. |
| **A2** | Did the phantom fields ever exist? | **No.** `git log -S` shows every one of the six `*_Completed_At` names, `Primary_Contact`, `Contact_Source_Class`, `Role_AOR`, `Profile_Completion_Status`, `Product_Interest_Staging` entering only via the two repo-consolidation commits (`8ae1149`, `6808adf`) and later edits. None was ever created in Zoho. Nothing to preserve. |
| **A7** | Reject or ignore? | **Ignore.** Confirmed empirically. This is precisely why the atomic-write contract is required: the current code cannot tell a full write from a partial one. |
| **B2** | Events per `Meeting_Task_Stage` | Only two populations exist: `Demo Booking` (every booking-created Event) and null (calendar-synced Events). **Zero** Events carry a commercial or renewal stage. The divergent values are unexercised. |
| **B4** | Has a demo reminder ever been written/sent? | **Written, yes** — five Events on 2026-08-02 carry `Reminder_Send_At` (e.g. `991103000003297004` → `2026-08-03T08:00`). Those are also the only Events WF007 ever processed. Events created 2026-08-03 onward have null `Reminder_Send_At`, consistent with meeting automation being off since. Whether WF010c then *sent* one is not visible in Zoho metadata and needs the email audit-Task check in Batch 3's smoke test. |
| **C1** | Vercel flags | `BOOKING_DISPATCH_ENABLED = "true"` · `BOOKING_MEETING_AUTOMATION_ENABLED = "false"` · `BOOKING_CANCELLATION_ENABLED = "false"` · `RETENTION_EXECUTION_ENABLED = "false"`. Dispatch is on; meeting automation is off. |
| **C2** | Bookings with a linked Deal | Every booking-created Event carries a populated `What_Id` **and** a Contact `Who_Id`. The retro-link is working. F6's blast radius today is **zero**; it is a latent trap that fires the first time an Account is deduplicated. |
| **C4** | Production domain | Project `jurnii` (`prj_Ott6y3zs…`), domains `jurnii.vercel.app` + two preview aliases. `jurnii.io` not attached. `PUBLIC_BASE_URL` already correct. |
| **F1q** | Function failures | **Zero** records in the automation-function failure log. No timeout or limit errors are surfacing. |
| **F2q** | Duplicate Activation Tasks | **146** active (non-`Deferred`) Sequence Activation Tasks, **all** `(Task_State=Open, Task_Status=New, Status=Not Started, Task_Sequence_Type=null)`, one per Contact — no duplicate `Who_Id`. The three double-held Contacts in the pre-publish audit have resolved. The population is clean and entirely uncommitted. |
| **G1** | Repo vs published | **In sync, on the balance of evidence.** Live `modified_time`: processLead/processContact/processDeal 2026-08-09 09:40–09:41, handleMeetingEvent 2026-08-09 13:53, handleTaskCompletion/handleCallOutcome 2026-08-08 16:22. Repo commits `a9d7a52` (2026-08-08) and `5192e59`/`8f47bcf` (2026-08-09), working tree clean. Every live timestamp is at or after its commit, which is what the repo's commit-after-publish rule produces. **Not provable** — the function API returns no script body. Batch 1 should add a version stamp so this becomes checkable. (The memory note saying Changes 1–21 are "unpublished and uncommitted" is stale; corrected.) |

**Consequence for sequencing.** Nothing is actively corrupting data. Dispatch is live and
working; meeting automation is the gate holding everything else back. The work is therefore
*hardening before arming*, not incident response.

---

## Part 3 — Corrective plan

Three gated batches. Each is independently verifiable and independently publishable.
No batch depends on a decision not already made.

### Batch 1 — invalid writes, authority, and write integrity

Nothing here changes behaviour a user can see; it removes writes that do nothing and makes
silent partial writes impossible.

**1.1 Delete the phantom writes.**
- `processDeal`: remove the six `*_Completed_At` puts and the `stageFields` map
  ([processDeal.deluge:2513-2543](../zoho-functions/v6/processDeal.deluge#L2513-L2543)).
  Deal transition history is not derived from a Contact; if it becomes a reporting
  requirement it gets its own schema change and its own evidence source.
- `processLead`: remove `Contact_Source_Class`
  ([:552-555](../zoho-functions/v6/processLead.deluge#L552-L555)); transform the Lead's
  `Role_AOR` staging value into the existing governed `Contact_AOR_*` fields and drop the raw
  put ([:561](../zoho-functions/v6/processLead.deluge#L561)).
- `handleEmailEvent`: remove `Profile_Completion_Status`
  ([:107](../zoho-functions/v6/activity/handleEmailEvent.deluge#L107)) — derived state.
- `processDeal`: remove the `Product_Interest_Staging` read
  ([:266](../zoho-functions/v6/processDeal.deluge#L266)); product interest belongs to the
  product relationship and the Quote line.

**1.2 Primary-contact authority.** Deal Contact Roles become the single source of truth.
`Contact_Name` stays as the convenience lookup. Remove the `Primary_Contact` read/write
([:2145](../zoho-functions/v6/processDeal.deluge#L2145),
[:2174](../zoho-functions/v6/processDeal.deluge#L2174)) and migrate the three
`Deal_Primary_Contact` readers
([createManualReview:39](../zoho-functions/v6/activity/createManualReview.deluge#L39),
[handleMeetingEvent:573](../zoho-functions/v6/activity/handleMeetingEvent.deluge#L573),
[_util_applyQuoteLifecycle:55](../zoho-functions/v6/activity/_util_applyQuoteLifecycle.deluge#L55))
onto Contact Roles, then retire the duplicate field.

**1.3 Atomic write contract.** A shared `_util_writeRecord` wrapper: every write validates the
response, treats any non-`SUCCESS` row or any `INVALID_DATA` as *did not commit*, stops
downstream processing for that unit of work, and raises one idempotent review. This is what
turns A7's finding from invisible into loud.

**1.4 Generalise the field-name guardrail.** Extend
[zoho-field-names.test.js](../booking/tests/zoho-field-names.test.js) to parse every
api_name written by `zoho-functions/v6/**` and assert it against the live snapshot.
Intentionally-ahead code declares itself in an explicit schema-migration manifest, never a
test exemption. (I prototyped the parser during the audit; it found all four defects.)

**1.5 Version stamp.** Emit a build hash in each function's `info` banner so repo-vs-published
becomes checkable instead of inferred.

*Gate:* full test suite green; the new field-name test passes with zero exemptions.

### Batch 2 — determinism, resolution and re-entrancy

**2.1 One canonical stage translation layer.** A single `_util_canonicalStage` owning the
mapping for `Contacts.Stage`, `Deals.Opportunity_Stage`, `Task_Stage`, `Call_Task_Stage`,
`Meeting_Task_Stage`. Note the empirical constraint: the code currently works in **display**
space and Zoho accepts it, so this is centralisation and pinning, not a live-bug fix.
Switching I/O to `actual_value` is the stricter option but is a breaking change across five
fields and all existing records — **recommend keeping display-space I/O, centralising it, and
pinning it with a test against live picklist metadata**, so a label edit in Zoho cannot
silently null every rank map. `Renewall` still gets its controlled data migration later; the
adapter handles it either way.

**2.2 Exact-key Deal resolution.** Replace the `Deal_Name` substring filter
([integrations/zoho/index.js:470-483](../booking/integrations/zoho/index.js#L470-L483)) with
exact `Deal_Key` lookup (`{accountKey}::{productKey}`), excluding `Opportunity_State = Lost` —
matching what the Deluge already does at
[handleMeetingEvent:542](../zoho-functions/v6/activity/handleMeetingEvent.deluge#L542).
`getDealsForAccount` must fetch the fields that decision needs. No list-order product choice.

**2.3 Missing `What_Id` defers, never discards.** A booking with no resolvable Deal keeps its
Event, its correlation key and its Contact link, and defers only Deal-specific processing with
one idempotent review. It must not escalate the journey or suppress meeting automation.

**2.4 Supersession status.** Replace the invalid `Status = "Cancelled"` write
([routeContactSequence:1058](../zoho-functions/v6/activity/routeContactSequence.deluge#L1058))
with `Closed` plus an explicit supersession reason, and update the three read-side predicates.

**2.5 Break the cycle.** `processDeal → routeContactSequence → processDeal` becomes one
directional transition carrying an idempotency key, with a re-entry guard as secondary
protection. Remove the dual ownership of Contact processing: the Contact workflow is the sole
post-conversion owner; `processLead` stops invoking it inline
([:781](../zoho-functions/v6/processLead.deluge#L781)).

**2.6 Read consolidation and pagination.** One Quote snapshot per `processDeal` run (currently
six related-list reads plus per-Quote fetches). Paginate `getRecords("Products", …)`
([:634](../zoho-functions/v6/processDeal.deluge#L634) and `_util_resolveDealProduct`).

**2.7 Activation gate.** Remove the "exactly one Product Deal" precondition — product
multiplicity must not decide whether a Contact can activate. One relevant opportunity per
qualification motion, multiple Products attached. The initiating booking Contact defaults to
Decision Maker in Deal Contact Roles; a job-title mismatch never blocks Task creation. Keep the
truthful raw title; no fuzzy title→role mapping. `Manual` remains the explicit off value —
never cleared to null.

**2.8 Booking front-end.** Validate the resume token when restoring, not only at slot submit
([booking-form.js:1485](../booking/assets/booking-form.js#L1485)). Rate-limit
`POST /submissions/start`.

**2.9 Review parity.** `[pricing_unavailable]` and the RTP evidence review become idempotent,
not recreated per reconciliation. Missing commercial evidence yields a **blank** Amount plus
one review — never `Amount = 0`. Uncommitted Renewal Activation Tasks raise no review merely by
existing.

**2.10 Lighter-reviewed surfaces.** Apply the same invariants to
[workflows/operator-actions.js](../booking/workflows/operator-actions.js) (517 lines),
the retention machinery and
[handleCallOutcome.deluge](../zoho-functions/v6/activity/handleCallOutcome.deluge). These had a
lighter pass in the audit and need a full read-through before this batch closes.

*Gate:* deterministic resolution proven by test; no name/substring/label matching anywhere in
the resolution path; re-entry guard covered.

### Batch 3 — publish, smoke, arm

1. Publish Batches 1–2 to Zoho (separate publishes per batch, given Deluge has no rollback).
2. Controlled smoke tests on a scratch Account: booking → Contact → Deal → Event → Quote, plus
   a deliberately deduplicated Account to prove 2.2, plus the WF010c reminder path to close B4.
3. Set `BOOKING_MEETING_AUTOMATION_ENABLED = true`.
4. Cancellation stays off until the manage/cancel workflow is verified end to end.
5. Then, separately: repair and deduplicate the 146-Task activation population, preserving every
   task's uncommitted state. No bulk activation — reps commit individually.

---

## Part 4 — The standing correction

The functions currently let Zoho's incidental vocabulary define the model: field api_names,
picklist labels and Product names are load-bearing in branch conditions. They are adapter
details. The ontology is **Relationship, Opportunity, Offering, Participant, Activity**, and
the functions should project that model into Zoho rather than derive it from Zoho. Every item
in Batch 2 is an instance of that single correction.
