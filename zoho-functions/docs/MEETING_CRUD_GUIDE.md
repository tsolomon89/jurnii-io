# Meeting (Event) CRUD Guide — v6

**Scope.** How to create, read, update and retire Meetings/Events in Zoho CRM under the v6
automation, and **exactly what the automation does when the record is saved** — with the
emphasis on the update you make *after the demo has happened*.

**Grounding.** Everything below is read out of `zoho-functions/v6`. The primary source is
[`v6/activity/handleMeetingEvent.deluge`](../v6/activity/handleMeetingEvent.deluge) (`VERSION: v6-meeting-state`);
supporting behaviour comes from `routeContactSequence`, `processDeal`, `_util_resolveActivityLoss`,
`_util_calculateBusinessDate`, `_util_resolveDealPipeline`, `createManualReview` / `createAuxTask`,
and `sendDemoReminder`. Line references point at the file as committed. Where the code's own
comments contradict the code, the **code** is documented and the discrepancy is called out in §10.

---

## 0. The 30-second version

After a demo, you touch **one field**:

| What happened | Set on the Event | Also required |
| --- | --- | --- |
| Demo happened and qualified | `Meeting_Task_State = Won` | Contract fields *only if* terms were discussed |
| Demo did not happen / no-show | `Meeting_Task_State = Lost` | `Meeting_Task_Lost_Reasons = No Meeting / Demo` |
| Demo happened but is dead | `Meeting_Task_State = Lost` | `Meeting_Task_Lost_Reasons` = the real reason |
| Rescheduled / still upcoming | leave `Meeting_Task_State` blank or `Open` | change `Start_DateTime` |

Everything else on the Event — `Meeting_Task_Status`, `Reminder_Send_At`,
`Meeting_Task_Pipeline`, `Meeting_Task_Opportunity`, and the appended `Description` block —
is **automation-owned**. Do not edit it.

Saving the Event fires **WF007 → `handleMeetingEvent(eventId)`** on **create *and* every edit,
with no field criteria** (see the idempotency note at `handleMeetingEvent.deluge:475-479`). The
function is re-entrant by design: it is safe to save repeatedly.

---

## 1. Preconditions — what makes an Event processable

`handleMeetingEvent` returns early, doing nothing, unless all of the following hold
(`handleMeetingEvent.deluge:28-46`):

1. A numeric `eventId` was passed (WF007 supplies `${Events.id}`).
2. The Event is readable via `getRecordById("Events", id)`.
3. **`What_Id` is set and `$se_module == "Deals"`.** A meeting related to anything other than a
   Deal is skipped with `skip_no_related_deal`. *A meeting hung off a Contact or an Account is
   invisible to v6.*
4. The related Deal is readable.

**Contact resolution** (`:54-66`) is deliberately two-tier:

- `Who_Id` (the Event's own Contact) is preferred and sets `contactFromWhoId = true`.
- If `Who_Id` is blank, `Deal.Contact_Name` is used as a fallback — **but only for the
  non-terminal paths** (reminder computation, mirrors, type inference).

On a terminal save (`Won`/`Lost`) a fallback Contact is treated as *no* Contact, because
`routeContactSequence`'s activity-relationship validation requires `Event.Who_Id == contactId`
and would reject it as `who_id_mismatch` from inside a `void` call — an invisible failure
(`:48-53`, `:93-109`).

> **Practical rule:** if you intend to ever mark a meeting Won or Lost, the Event must have
> **`Who_Id` = the Contact** and **`What_Id` = the Product Deal**. Both. Every time.

---

## 2. Field roles

### Commands — yours to set

| Field | Values | Meaning |
| --- | --- | --- |
| `Meeting_Task_State` | `Open`, `Won`, `Lost` (blank ≙ Open) | The single result command. |
| `Meeting_Task_Lost_Reasons` | canonical Lost Reasons | **Required** when State = `Lost`. |
| `Meeting_Task_Stage` | 8-stage picklist | Declares the meeting *type* (see §3). |
| `Start_DateTime` / `End_DateTime` | native | Schedule. Drives the reminder. |
| `Who_Id` / `What_Id` | Contact / Deal | Relationship. Mandatory (§1). |

### Commercial evidence — yours to set, only when terms were discussed

`Meeting_Task_Contract_Products` (multi-select), `_Brands`, `_Date_Start`, `_Date_End`,
`_Frequency`. These are **evidence, not commands** — they are read only on a `Won` save
(`:138-169`). Product values must match `Products.Product_Name` exactly; the live catalogue is
`Jurnii 360`, `Jurnii UX`, `Jurnii Cortex`, `Partnership` (the `- Fixed` / `- Flex` variants
exist on the picklist but are deactivated — see `docs/v6/FLOW_REFERENCE.md:37-48`).

### Automation-owned — do not edit

| Field | Written by |
| --- | --- |
| `Meeting_Task_Status` (`New` / `Working` / `Closed`) | The processed-marker. §7. |
| `Reminder_Send_At` | Computed reminder, upcoming path only. |
| `Meeting_Task_Pipeline` | `resolveDealPipeline(dealId)` → `B2B` / `Partnership` / left blank. |
| `Meeting_Task_Opportunity` | Mirror of `Deals.Stage` (the opportunity type: MQL/SQL/FTP/RTP). |
| `Description` | The guidance block is appended once (§5.5). |

### Not read at all

`Meeting_Status`, `Meeting_Type`, `Meeting_Outcome` are legacy and **are not read by v6**
(`handleMeetingEvent.deluge:6-8`; `docs/v6/FLOW_REFERENCE.md:134`). Setting them does nothing.

---

## 3. Meeting *type* is inferred, never declared directly

There is no "meeting type" command. Type is derived from `Meeting_Task_Stage`
(`:115-136`) using the shared stage ranking:

```
Marketing Consent 1 | Demo Booking 2 | Demo Confirmation 3 | Demo Hosted 4
Proposal Preparation 5 | Commercial Agreement 6 | Onboarding 7 | Renewal 8
```

| Rank | Type | Behaviour |
| --- | --- | --- |
| 1–4, blank, unknown | **demo** | Routes the Contact sequence. |
| 5–6 | **commercial** | Promotes evidence straight to `processDeal`. |
| ≥ 7 | **renewal** | Same as commercial. |

If `Meeting_Task_Stage` is blank it falls back to the **Contact's** `Stage` (`:132`). An
unresolvable stage ranks 0 and is therefore treated as a demo.

**This matters:** the same `Won` save does completely different things depending on this one
picklist. A commercial conversation logged on a meeting still stamped `Demo Confirmation` will
route the *demo* path and never touch the Quote.

---

## 4. CREATE

**v6 does not create meetings.** The code says so explicitly at `:403` — meetings are booked
externally (the booking backend) or by a rep in the CRM. There is no `createMeeting` function in
`zoho-functions/v6`.

To create a meeting that the automation will handle, the record must carry:

| Field | Value |
| --- | --- |
| `What_Id` + `$se_module` | the Product **Deal** (mandatory — §1) |
| `Who_Id` | the **Contact** (mandatory for any later Won/Lost) |
| `Start_DateTime` | the meeting time |
| `Meeting_Task_Stage` | the stage that describes the meeting's *type* (optional; falls back to Contact Stage) |
| `Meeting_Task_State` | leave **blank** or `Open` |
| `Ext_Calendar_Booking_ID` | booking reference, if it came from the booking backend (used only in review text, `:516`) |

### What happens on that first save

The Event lands on the **UPCOMING** branch (`:367-597`). See §5.5 for the full write ledger.
In short: the reminder is computed and written *if it is still in the future*, the pipeline and
opportunity mirrors are stamped, the rep-facing guidance block is appended to `Description`,
`Meeting_Task_Status` is set to `New`, `Deal.Demo_Reminder_Send_At` is mirrored, and — **if the
Contact has not yet reached Demo Confirmation** — `routeContactSequence(…, "meeting:created")`
advances the Contact to Demo Confirmation and sends the confirmation email.

---

## 5. UPDATE — what happens when you save

Guards run **in this order**, before any branch (`:76-136`):

1. Read `Meeting_Task_State`, `Meeting_Task_Lost_Reasons` (both normalise `-None-` → blank) and
   `Meeting_Task_Stage` (trimmed only — see §10).
2. **MTG-4 idempotency** (`:82-91`): if state is `Won`/`Lost` **and** `Meeting_Task_Status ==
   "Closed"`, return with `skip_state_already_processed`. An already-processed meeting never
   re-routes on a later unrelated edit.
3. **Terminal-without-Contact** (`:93-109`): if state is `Won`/`Lost` and the Contact is missing
   *or* came from the Deal fallback → write `Meeting_Task_Status = "Working"` (deliberately
   **not** Closed), raise `[meeting_contact_unresolved]` Manual Review, return. The meeting stays
   reprocessable.
4. Resolve `dealPipeline` (via `Deal_Product_Key`, because `Deals.Pipeline` is unreadable in
   Deluge) and `dealOppType` (`Deals.Stage`).
5. Read the Contact for `Stage` and `Sequence_State`. `hasNext = "false"` **only** when
   `Sequence_State == "Complete"` (`:128-131`).
6. On `Won` only, build the activity `contextJson` from the Contract fields (`:138-169`).

Then one of five branches runs. Each returns; they are mutually exclusive.

---

### 5.1 Demo · `Meeting_Task_State = Won` — *the normal post-demo update*

`:266-295`

1. `routeContactSequence(contactId, dealId, "demo:qualified", ctxJson)`.
   Inside the router (`routeContactSequence.deluge:579-599`):
   - Contact `Stage` → **Proposal Preparation** — unless the Contact is *already* at Proposal
     Preparation or later, in which case the stage is **left alone** (no regression, logged as
     `demo_qualified_already_progressed`).
   - Stale in-flight activities are superseded (managed Calls → `Outgoing_Call_Status =
     Cancelled` + `Call_Task_Status = Closed`; managed Tasks → `Status = Cancelled`).
   - Side email `demo_post_demo` is dispatched. This is a **transactional** email, so it is *not*
     blocked by cadence suppression (`routeContactSequence.deluge:1419-1432`).
   - Stage entry into Proposal Preparation creates the **`Draft Commercials`** Task
     (`:1606-1665`), deduped against an existing open one for the same Contact + Deal + stage.
   - `processDeal(dealId, ctxJson)` reconciles the Deal: resolves the Product names, links
     Contact↔Product and Deal↔Product, upserts the per-Product Quote with brands/dates,
     recomputes `Amount` and the contract ledger.
2. **The close is verified, not assumed** (`:271-293`). `routeContactSequence` is `void`, so the
   function re-reads the Contact and checks the **observable outcome**:
   - `Contact.Stage` rank **≥ Proposal Preparation (5)** → `Meeting_Task_Status = "Closed"`,
     log `won_routed`. *(A Contact already at Onboarding therefore closes cleanly.)*
   - otherwise → `Meeting_Task_State` is reset to **`Open`**, `Meeting_Task_Status = "Working"`,
     and a `[meeting_route_not_applied]` Manual Review is raised naming the current stage. The
     meeting is **not** closed, so fixing the cause and re-saving genuinely retries.

**Net effect of a Won demo:** Contact advances to Proposal Preparation, a Draft Commercials Task
appears, a post-demo email goes out, the Deal (and any Quote) is reconciled, and the Event is
stamped `Closed`.

---

### 5.2 Demo · `Meeting_Task_State = Lost`

`:296-365`

**Blank reason short-circuits.** No `Meeting_Task_Lost_Reasons` → Manual Review Task, state reset
to `Open`, status `Working`, return (`:298-304`). Nothing else happens.

Otherwise `resolveActivityLoss(reason, "activity", hasNext, "false", "true")` decides — the last
argument is `meetingContext = true`, which is what makes `No Meeting / Demo` mean *reschedule*
rather than *review* (`_util_resolveActivityLoss.deluge:122-136`).

| `Meeting_Task_Lost_Reasons` | Action | What actually happens |
| --- | --- | --- |
| `No Meeting / Demo` | `continue_cadence` | `routeContactSequence(…, "demo:followup")` → **Sequence_State = Running, Sequence_Stage = None, Step = None, no email, no stage change.** The Contact stays where it is; you re-engage manually. |
| `No Response` + sequence *not* exhausted | `continue_cadence` | Same as above. |
| `No Response` + `Sequence_State == Complete` | `contact_lost` | Manual Review `[activity_lost_suggests_contact_loss]` only. **The Contact is NOT marked Lost and the Deal is NOT closed.** |
| `No Authority` | `find_decision_maker` | Manual Review `[no_authority]`: find another decision maker. Deal stays Open. |
| `Invalid / Bad Data` | `data_repair` | A **Data Repair** Task. |
| `Duplicate / Test Record` | `suppress` | Logged only. No task. |
| `No Fit` / `No Commercial Interest` / `No Budget` | `manual_review` | Human decides person-fit vs account-fit. |
| `Terms Rejected` / `Churned / Did Not Renew` | `manual_review` | (`finalCommercial` is hard-coded `"false"` here, so a demo never triggers `deal_lost`.) |
| `N/A` or unmapped | `none` / `manual_review` | Local only. |

**Then the close is verified** (`:354-362`): `Meeting_Task_Status = "Closed"` only if the action
landed. The default `manual_review` branch checks the returned Task id — an empty id means the
review was not created, so the meeting is reopened (`Open` / `Working`) and logged as
`lost_reopened_action_not_applied`.

> **Governing rule** (`_util_resolveActivityLoss.deluge:11-14`): activity loss is **module-relative
> and never cascades upward**. A Lost meeting never closes the Contact or the Deal by itself.

---

### 5.3 Commercial / Renewal · `Meeting_Task_State = Won`

`:174-194` — reached when `Meeting_Task_Stage` ranks 5–6 (commercial) or ≥ 7 (renewal).

The Contact sequence is **not** routed. Instead the contract evidence goes straight to the
commercial owner: `processDeal(dealId, ctxJson)`.

`processDeal` (§5 of that function, `processDeal.deluge:580+`) resolves each Product name against
the active catalogue, links it to the Contact and the Deal, and **upserts one Quote per Product**
keyed by Deal + `Quote_Product` + `Opportunity_Type`, writing brands/dates/frequency onto the
Quote line and recomputing `Amount` and the ledger. `Quote_Applied_Activity_Keys` receives
`Events:<eventId>` as the idempotency key, so a re-save cannot duplicate the line.

Then:

- `processDeal` returned `success == true` → `Meeting_Task_Status = "Closed"`,
  log `won_evidence_promoted`.
- otherwise → Manual Review Task, `Meeting_Task_State` reset to `Open`,
  `Meeting_Task_Status = "Working"`, log `won_reopened_validation_failed`. Fix the validation
  problem and set `Won` again.

**A Won commercial meeting does not sign the deal.** The `commercial:signed` advance is owned by
the term-complete / Confirmed-Quote gate inside `processDeal`, not by the meeting
(`handleMeetingEvent.deluge:177-181`; `processDeal.deluge:2701-2764`). A meeting expresses intent;
the Quote owns the signed ledger.

**Quotes that are Confirmed, Closed Won or Closed Lost are not overwritten** by activity evidence
— only Draft, Negotiation, Delivered and On Hold are activity-updatable
(`docs/v6/FLOW_REFERENCE.md:77-78`).

---

### 5.4 Commercial / Renewal · `Meeting_Task_State = Lost`

`:195-254`

Same shape as the demo Lost path with two differences:

- `meetingContext` is `"false"`, so `No Meeting / Demo` resolves to `manual_review`, not
  reschedule.
- A `deal_lost` action does **not** close the Deal. It raises a Manual Review saying the loss
  *suggests* opportunity loss and that an explicit Deal-level decision is required (`:218-222`).
  This is the branch whose Task id is checked, so a failed review creation reopens the meeting.

Blank reason behaves identically to the demo path: review + reopen (`:197-203`).

---

### 5.5 Open / blank — upcoming, rescheduled, or any non-terminal save

`:367-597`. This branch also runs on every plain edit of a non-terminal meeting.

**Reminder rule** (`:369-397`, verified live 2026-08-02):

1. `calculateBusinessDate(Start_DateTime, -1, "business_days_minus_AM")` → **09:00 on the previous
   business day** (weekends skipped, `_util_calculateBusinessDate.deluge:78-81`).
2. The value is written **only if it is still in the future**. A past value is *not* clamped to
   now — the reminder template says the demo is *tomorrow*, so firing it late would be factually
   wrong. A short-notice booking simply gets no reminder, logged as `skipped_already_past`.

**Event write ledger** — one `updateRecord` with `trigger: []` (no workflow re-fire), `:399-424`:

| Key | Written when |
| --- | --- |
| `Reminder_Send_At` | computed reminder is in the future |
| `Meeting_Task_Pipeline` | `resolveDealPipeline` returned non-blank (`B2B`/`Partnership`; an unknown product key returns blank and leaves the mirror alone) |
| `Meeting_Task_Opportunity` | `Deals.Stage` is non-blank |
| `Description` | the marker string `Automation-managed meeting.` is **absent** — the guidance block is **appended** (never overwrites a rep's agenda), so it lands exactly once even on booking-backend meetings that always arrive with a non-blank Description (`:407-421`) |
| `Meeting_Task_Stage` | the field is blank *and* a stage was inferred from the Contact |
| `Meeting_Task_Status` | the field is blank → `"New"` |

**Deal write** (`:426-440`): `Demo_Reminder_Send_At` only, and only when a reminder was computed.
It is written as a **standalone map** — a previous version bundled the non-existent
`Demo_Start_DateTime` key into the same call, and the unknown key took the supported key down with
it, so `Demo_Reminder_Send_At` came back null on every Deal and WF010c never fired for any booking.

**First-booking advance** (`:442-456`): if the Contact's stage ranks **below Demo Confirmation
(3)**, `routeContactSequence(…, "meeting:created")` runs → Stage = Demo Confirmation,
`Sequence_State = Running`, `Sequence_Stage = Meeting`, `Step = None`, action `await_meeting`,
in-flight activities superseded, and the **`demo_confirmation`** email dispatched
(`routeContactSequence.deluge:699-713`). If the Contact is already at Demo Confirmation or later,
nothing is routed — logged as `upcoming_mirrored`. This is what makes a **reschedule** safe: the
Contact is not advanced twice and the stage is not reverted.

**Multi-product reconciliation** (`:458-596`) — *runs only on this branch*, because the terminal
branches return earlier:

An Event has exactly one native `What_Id`, but a Deal is Account × Product. So a multi-product
booking anchors on one Product Deal and carries the full scope in
`Meeting_Task_Contract_Products`. This block reconciles the **remaining** products' Deals:

- Skips the anchor's own product key and any `Partnership` key (held out of B2B automation).
- Looks each one up **exactly** by `Deal_Key = <Account_Key>::<productKey>` — `Deals.Deal_Key` is
  unique, so there is no substring matching on `Deal_Name` anywhere.
- 0 matches → `[product_unresolved]` review. >1 → `[duplicate_product_deal]` review. Missing
  `Account_Key` → `[product_unresolved]` review naming the booking reference.
- Contact must be that Deal's primary; a non-primary Contact is skipped **without** a review
  (a legitimate state, not a data error).
- Otherwise `processDeal(rDealId, "{}")` — a stage roll-up with **empty** context, because the
  Contract fields belong to the Won path.

It never creates a Deal, never writes a stage itself, never fails the booking, and writes no
marker field — so it cannot re-trigger WF007.

---

## 6. READ

- **`Meeting_Task_Status` is the processed marker.** `New` = seen, upcoming. `Working` = seen but
  *not* concluded (or bounced back after a failed terminal save). `Closed` = terminally processed,
  and MTG-4 will refuse to reprocess it.
- **Automation reads the Event live** every time — there is no cached state. The Event's own
  `Meeting_Task_*` fields plus `Start_DateTime` are the entire input.
- **`Event.Reminder_Send_At` is written but nothing in v6 reads it.** The firing workflow
  (WF010c → `sendDemoReminder`) is bound to **Deals** on `Demo_Reminder_Send_At`, because
  date-based workflows cannot be bound to the Meetings module (`sendDemoReminder.deluge:5-15`).
- `sendDemoReminder` itself reads the **Event** for the schedule: it takes the earliest *upcoming*
  related Event's `Start_DateTime` and skips with `skip_no_upcoming_meeting` if there is none. It
  also skips on `Automation_Suppressed`, a non-Open primary Contact, or a Contact past Demo
  Confirmation (rank > 3 ⇒ the demo already happened).
- Every branch emits a `logAutomationEvent` record — grep the function log for
  `handleMeetingEvent` plus the phase token (`guard`, `result_won`, `result_lost`,
  `commercial_meeting`, `reminder`, `first_booking`, `multi_product_reconcile`).

---

## 7. Idempotency, reopen, and retry

Three mechanisms, working together:

1. **MTG-4 latch** — `Won`/`Lost` + `Closed` ⇒ skip. Once a meeting is genuinely processed, later
   edits (including a rep changing the title) cannot re-route the sequence, re-run `processDeal`,
   or raise duplicate tasks.
2. **Verified close** — every terminal path writes `Closed` **only after** confirming the intended
   effect landed: `processDeal.success == true` for commercial, a Contact stage re-read at rank ≥ 5
   for a Won demo, and a non-empty Task id for the loss branches that check it. Never mark
   processed before the outcome is known.
3. **Reopen is the retry path** — a failed terminal save resets `Meeting_Task_State = "Open"` and
   `Meeting_Task_Status = "Working"` with a Manual Review naming the cause. Because MTG-4 only
   traps records genuinely at `Closed`, the reopened record **is** reprocessed on the next save.
   That is why "fix the review, set the state again" actually works.

Re-entrancy on the non-terminal path is safe by construction rather than by a latch: `processDeal`
never regresses a stage, `createManualReview` dedupes on its leading `[code]` token across the
Contact's open review Tasks, and every automation write uses `trigger: []`.

---

## 8. Review codes you will see from meetings

| Code / marker | Raised when | Fix |
| --- | --- | --- |
| `[meeting_contact_unresolved]` | Terminal state with no `Who_Id` Contact | Set the meeting's Contact, then set the state again. Meeting was **not** closed. |
| `[meeting_route_not_applied]` | Won demo, but the Contact did not reach Proposal Preparation or later | Check the Contact/Deal links, then set `Won` again. |
| `[activity_lost_suggests_contact_loss]` | Lost + `No Response` on an exhausted sequence | Closing the Contact is an explicit human decision. |
| `[no_authority]` | Lost + `No Authority` | Find another decision maker. Deal stays Open. |
| `[product_unresolved]` | Multi-product booking: no Deal for `Deal_Key`, or the Account has no `Account_Key` | Create/repair the Product Deal, re-save the meeting. |
| `[duplicate_product_deal]` | Multi-product booking: >1 Deal for the same `Deal_Key` | Merge the duplicates, then re-save the meeting. |
| *(untitled)* Manual Review Task | Terminal state with a blank Lost Reason, or a commercial Won that failed validation | Add the missing data and set the state again. |
| **Data Repair** Task | Lost + `Invalid / Bad Data` | Repair the record before continuing. |

`createManualReview` prepends the canonical `[code]` token and `createAuxTask` dedupes on it, so
repeated fires accumulate distinct codes on one reusable Manual Review Task per Contact/Deal
rather than spawning duplicates.

---

## 9. DELETE / cancel

**There is no delete or cancel path for meetings in v6.** No function under
`zoho-functions/v6` calls `deleteRecord` on Events, writes an Event cancellation status, or
clears `Reminder_Send_At`. (Contrast Calls and Tasks, which are neutralised in place —
`Outgoing_Call_Status = Cancelled` + `Call_Task_Status = Closed`, or `Status = Cancelled` — by
the supersede logic in `routeContactSequence.deluge:1031-1058`.)

To retire a meeting **without** losing the audit trail, use the state machine rather than deleting:

| Situation | Do this |
| --- | --- |
| Meeting cancelled and will be rebooked | Set `Meeting_Task_State = Lost` + `Meeting_Task_Lost_Reasons = No Meeting / Demo`. The Contact stays put; book a new meeting when ready and it routes normally. |
| Meeting was a duplicate or a test | Set `Meeting_Task_State = Lost` + `Duplicate / Test Record` → `suppress`: logged, no task, no commercial effect. |
| Bad data | Set `Meeting_Task_State = Lost` + `Invalid / Bad Data` → Data Repair Task. |

**Consequences of an actual hard delete:** WF007 never fires again, `Meeting_Task_Status` never
reaches `Closed`, `Deal.Demo_Reminder_Send_At` **is not cleared** (see §10), and any Quote line
already applied under the key `Events:<eventId>` stays on the Quote — `processDeal` does not
reverse applied activity evidence. Prefer `Lost` over deletion.

---

## 10. Known gaps and quirks (grounded, not speculative)

1. **`Demo_Reminder_Send_At` is never cleared.** `sendDemoReminder.deluge:9-11` claims
   `handleMeetingEvent` "clears `Demo_Reminder_Send_At` when the meeting is Cancelled". No such
   code exists in `handleMeetingEvent`. In practice the reminder is defended at *send* time
   instead: `sendDemoReminder` re-reads the related Events and skips when there is no upcoming
   meeting, or when the primary Contact is past Demo Confirmation.
2. **`demo:followup` no longer runs a recovery cadence.** `handleMeetingEvent.deluge:317-323`
   still describes a "5-step Demo Hosted RECOVERY cadence (demo-hosted:1..5)". The router branch
   it calls (`routeContactSequence.deluge:601-618`, CHANGE 11) sets
   `Running / None / None`, `action = none`, no side email, and logs
   `demo_followup_manual_engagement`. The comment is stale; the behaviour is **manual
   re-engagement**, as documented in §5.2 and `docs/SALES_GUIDE.md:278-283`.
3. **`Meeting_Task_Stage` is not `-None-`-normalised.** `Meeting_Task_State` and
   `Meeting_Task_Lost_Reasons` both map `-None-` → blank (`:76-79`), but the stage is only
   trimmed (`:80`). A literal `-None-` stage therefore ranks 0 (⇒ demo), does **not** fall back to
   the Contact's stage, and is not backfilled by the upcoming-path write (which only fires when
   the field is truly empty).
4. **`meeting_contact_unresolved` is not in the canonical registry.**
   `_util_resolveManualReviewCode.deluge:24-40` does not list it, so it passes through as
   `[meeting_contact_unresolved]` **and logs `unknown_review_code`**. The review is still raised
   and still dedupes correctly; only the log line is noisy.
5. **`Meeting_Task_Stage` picklist reference value.** `docs/v6/AUDIT_RESULTS_PRE_PUBLISH.md`
   (Z5) records that display `Renewal` maps to reference value `Renewall`. Deluge reads picklists
   in **display** space, so `stageRanks.get("Renewal")` resolves — but any code or report that
   ever touches the reference value must account for the typo.
6. **Commercial/renewal meetings get no reminder and no guidance block.** The commercial branch
   returns at `:260`, before the upcoming-path writes. Only demo-type meetings ever receive
   `Reminder_Send_At`, the pipeline/opportunity mirrors, or the appended `Description` contract.

---

## 11. Worked examples

### A. Standard demo, went well, no commercials discussed
1. Open the Event. Confirm `Who_Id` = the Contact and `What_Id` = the Product Deal.
2. Set `Meeting_Task_State = Won`. Save.
3. Result: Contact → Proposal Preparation, post-demo email sent, `Draft Commercials` Task raised,
   Deal reconciled, `Meeting_Task_Status = Closed`.

### B. Demo went well **and** terms were discussed
1. Fill `Meeting_Task_Contract_Products` (exact catalogue names), `_Brands` (required for every
   product), `_Date_Start`, `_Date_End`, and `_Frequency` (**Jurnii 360 only**).
2. Set `Meeting_Task_State = Won`. Save.
3. Result: as (A), **plus** the products travel in the context to `processDeal`, which links them
   and upserts the Quote lines with brands/dates.
   *`Jurnii Cortex` is not in the pricing matrix and cannot be auto-priced
   (`_util_resolveQuoteLinePrice.deluge:100-104`) — it raises a Manual Review for manual pricing.*

### C. Prospect no-showed
1. Set `Meeting_Task_State = Lost` **and** `Meeting_Task_Lost_Reasons = No Meeting / Demo`. Save.
2. Result: `continue_cadence` → `demo:followup`. The Contact stays at its current stage, nothing
   is replayed, no email is sent, `Meeting_Task_Status = Closed`. Book a new meeting whenever
   you're ready — it routes normally through `meeting:created`.

### D. Commercial meeting where terms were agreed
1. Confirm `Meeting_Task_Stage` is `Proposal Preparation` or `Commercial Agreement` — **this is
   what selects the commercial path**.
2. Fill the Contract fields, set `Meeting_Task_State = Won`. Save.
3. Result: no sequence routing; `processDeal` upserts the per-Product Quote and rebuilds the
   ledger. The `commercial:signed` advance still waits on the Confirmed Quote, not on this
   meeting. If validation fails the meeting bounces back to `Open`/`Working` with a review.

### E. You marked it Won by mistake
The meeting is now `Closed` and MTG-4 will refuse to reprocess it. Set `Meeting_Task_Status` back
to `Working` (or blank) **as well as** correcting `Meeting_Task_State`, then save — otherwise the
guard at `:87` returns before anything runs. Note that the downstream effects of the mistaken Won
(stage advance, Draft Commercials Task, Quote line) are **not** reversed by re-saving the Event;
`processDeal` never un-applies evidence.
