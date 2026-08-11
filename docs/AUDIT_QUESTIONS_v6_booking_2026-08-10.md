# v6 + Booking — deep-dive findings and open questions

Date: 2026-08-10 · Scope: `zoho-functions/v6/**` (38 Deluge functions, ~11,900 lines) and the
booking form end to end (`booking/assets/booking-form.js`, `booking/api/**`,
`booking/workflows/**`, `booking/integrations/zoho/**`, `booking/db/**`).

**How this was verified.** Everything in Part 1 marked **[LIVE]** was checked against live Zoho
metadata this session via `getFields` (Deals: 70 fields, Contacts: 107 fields), not against the
checked-in snapshot alone. Everything marked **[CODE]** is a reading of the source with no live
confirmation. Both test suites were run and are green: `booking` 414/414, `zoho-functions` 8/8.
Nothing was written to the CRM.

**How to use this.** Part 1 is what I found. Part 2 is the question set — answer them inline
(under each question is fine) and next session I can turn the answers into a sequenced,
publishable plan. Questions marked **⚑ blocking** change the shape of the plan, not just its
detail; the rest can be answered briefly if you have no strong view.

---

## Part 1 — Findings

Ranked by consequence, not by effort.

### F1 — `processDeal` writes three phantom field names into its main Deal update **[LIVE]** 🔴

`processDeal` builds one `dUpd` map and writes it once at
[processDeal.deluge:2548](zoho-functions/v6/processDeal.deluge#L2548). That map carries api_names
that **do not exist on the live Deals module**:

| Written key | Site | Live status |
| --- | --- | --- |
| `Primary_Contact` | [processDeal.deluge:2174](zoho-functions/v6/processDeal.deluge#L2174) | absent — the live field is `Deal_Primary_Contact` |
| `Marketing_Qualification_Completed_At` | [processDeal.deluge:2515](zoho-functions/v6/processDeal.deluge#L2515)+ | absent |
| `Demo_Booking_Completed_At` … `Commercial_Agreement_Completed_At` (6 total) | [processDeal.deluge:2537](zoho-functions/v6/processDeal.deluge#L2537), [:2540](zoho-functions/v6/processDeal.deluge#L2540) | absent — **the live Deals module has zero fields containing "Completed"** |

This is the exact failure mode the repo has already been bitten by twice and has written a whole
test file about: Deluge sends one `updateRecord` map, so one unknown api_name voids every other
key in it (`Demo_Start_DateTime` took `Demo_Reminder_Send_At` down with it; `Personal_Phone` was
removed pre-emptively for the same reason — see the comment at
[processLead.deluge:514](zoho-functions/v6/processLead.deluge#L514)).

**Why it is not intermittent.** The completion-stamp loop
([processDeal.deluge:2527-2543](zoho-functions/v6/processDeal.deluge#L2527-L2543)) computes
`finalRank`, which defaults to 1, and `"Marketing Consent"` also ranks 1 — so the `<=` test is
always true. `targetDeal.get("Marketing_Qualification_Completed_At")` is always null because the
field does not exist, so the guard never suppresses the put. **Every `processDeal` run adds at
least one phantom key to `dUpd`.** `Primary_Contact` piles on top: the list it is diffed against
is read from the same nonexistent field ([:2145](zoho-functions/v6/processDeal.deluge#L2145)), so
it is always empty and the put fires whenever a Contact resolves.

**What that means, if confirmed on a live write.** Nothing in `dUpd` ever lands: `Deal_Key`,
`Deal_Product`/`Deal_Product_Key`, `Amount`, `Opportunity_State`/`_Status`/`_Stage`, `Stage`, the
`Company_Tier` mirror, and the whole `Contract_Initial_*`/`Contract_Current_*` ledger. Every one
of those target fields is live, on a layout, and writable — I checked. Quote writes go out
separately over REST and are unaffected; `createOrReuseProductDeal` creates Deals with a separate
map and is unaffected. So Deals exist and Quotes exist, but the reconciliation that is supposed to
join them may never have persisted.

Three other functions use the correct `Deal_Primary_Contact`
([createManualReview.deluge:39](zoho-functions/v6/activity/createManualReview.deluge#L39),
[handleMeetingEvent.deluge:573](zoho-functions/v6/activity/handleMeetingEvent.deluge#L573),
[_util_applyQuoteLifecycle.deluge:55](zoho-functions/v6/activity/_util_applyQuoteLifecycle.deluge#L55)),
so `processDeal` is the outlier, not the convention.

### F2 — the same class, three more sites **[LIVE]** 🔴

| Function | Phantom write | Map it would void |
| --- | --- | --- |
| `processLead` | `Contacts.Contact_Source_Class` ([:554](zoho-functions/v6/processLead.deluge#L554)) | `updCon` — the whole post-conversion enrichment: `Account_Name`, `Stage`, `State`/`Status`, `Job_Title`, **`Contact_Role1`**, `Phone`, `Job_Title_Raw`, `Lead_Referrer`, `Marketing_Consent`, every AOR list, all 8 `Contact_Completed_*_At` stamps |
| `processLead` | `Contacts.Role_AOR` ([:561](zoho-functions/v6/processLead.deluge#L561)) | same map |
| `handleEmailEvent` | `Contacts.Profile_Completion_Status` ([:107](zoho-functions/v6/activity/handleEmailEvent.deluge#L107)) | that handler's `cUpd` |

Unlike F1 these are conditional — they fire only when the source Lead carries
`Imported_Record_Type` or `Role_AOR` — which is why booking-sourced Leads may have escaped while
imported ones did not. `Contacts.Product_Interest_Staging` is also absent live; `processDeal`
only *reads* it ([:266](zoho-functions/v6/processDeal.deluge#L266)), which is harmless, but it
means the Contact-side product aggregation silently contributes nothing from that source.

### F3 — the guardrail that exists does not cover the Deluge **[CODE]** 🟠

[booking/tests/zoho-field-names.test.js](booking/tests/zoho-field-names.test.js) was written for
precisely this bug class and is excellent — but its `WRITTEN` map enumerates only what the
*booking chain* writes. It has one hand-written assertion about `Demo_Start_DateTime` and no
general rule. That is why 414 green tests sit on top of F1 and F2. A ~40-line generalisation
(parse every `updateRecord`/`createRecord` key out of `zoho-functions/v6/**` and assert it against
the snapshot) would have caught all four, and would keep catching them. I prototyped this to
produce the table above.

### F4 — `Meeting_Task_Stage` is branched on with the wrong vocabulary **[LIVE]** 🔴

The live picklist stores *values* that differ from their *labels*:

| Stored value | Displayed label |
| --- | --- |
| `Demo Booked` | Demo Confirmation |
| `Demo Attended` | Demo Hosted |
| `Commercials Sent` | Proposal Preparation |
| `Commercials Signed` | Commercial Agreement |
| `Renewall` | Renewal |

`handleMeetingEvent` reads the field ([:80](zoho-functions/v6/activity/handleMeetingEvent.deluge#L80))
— which returns the **value** — and ranks it against a map keyed on the **labels**
([:116](zoho-functions/v6/activity/handleMeetingEvent.deluge#L116), used at
[:133](zoho-functions/v6/activity/handleMeetingEvent.deluge#L133)). Five of the eight stages
therefore rank 0, and `isCommercial`/`isRenewal` are both false, so **every commercial and every
renewal meeting is classified as a demo** and routed down the demo branch. Only `Marketing
Consent`, `Demo Booking` and `Onboarding` spell the same in both vocabularies. The
`Renewall` typo is already logged as known data debt in
[FINAL_CANONICAL_FIELD_MATRIX.md](zoho-functions/docs/v6/FINAL_CANONICAL_FIELD_MATRIX.md); the
other four look like they have never been reconciled at all.

### F5 — `handleMeetingEvent` writes an invalid `Meeting_Task_Status`, voiding the reminder **[LIVE]** 🟠

Live `Meeting_Task_Status` values are `Open` / `Working` / `Closed` — and `Open`'s *label* is
"New". [handleMeetingEvent.deluge:423](zoho-functions/v6/activity/handleMeetingEvent.deluge#L423)
writes the literal `"New"`, i.e. a label, not a value. It goes into `evUpd`, which is written as
one map at [:424](zoho-functions/v6/activity/handleMeetingEvent.deluge#L424) alongside
`Reminder_Send_At`, the rep-facing `Description` contract, `Meeting_Task_Pipeline`,
`Meeting_Task_Opportunity` and `Meeting_Task_Stage` — the F1 mechanism again, on the one map that
carries the demo reminder. [:422](zoho-functions/v6/activity/handleMeetingEvent.deluge#L422) can
compound it by writing a Contact-vocabulary stage (`Demo Confirmation`) into a field whose values
are the F4 list.

The booking backend already works around this from its side by writing `Meeting_Task_Status:
'Working'` at create ([integrations/zoho/index.js:412](booking/integrations/zoho/index.js#L412),
with the reasoning in the comment above it) — but that only covers Events the booking creates. A
rep-created Event with a blank status still hits it.

### F6 — the Node → Deal resolver matches on `Deal_Name` substrings and ignores Lost **[CODE]** 🟠

[`resolveProductDeal`](booking/integrations/zoho/index.js#L470-L483) filters
`Deal_Name.toLowerCase().includes(product.toLowerCase())`, over a related-list read that requests
`?fields=Deal_Name` only ([:461](booking/integrations/zoho/index.js#L461)). Consequences:

- **Silenced duplicates still match.** `processAccount` retires a duplicate by setting
  `Opportunity_State = Lost` and appending `" (Duplicate)"` to the name
  ([processAccount.deluge:148-155](zoho-functions/v6/processAccount.deluge#L148-L155)). The name
  still contains the product, and `Opportunity_State` was never fetched — so the resolver returns
  `many`. `meetingCreate` then creates the Meeting with **no `What_Id`**
  ([zoho-ops.js:560-563](booking/workflows/zoho-ops.js#L560-L563)) and `dealReconcile` escalates
  `duplicate_product_deal` ([:640-643](booking/workflows/zoho-ops.js#L640-L643)). WF007's first
  guard requires `What_Id` + `$se_module == Deals`, so that booking's automation never starts.
  **Any Account that has ever been deduplicated is permanently in this state.**
- **Account names collide with product names.** An Account called e.g. "Partnership Capital"
  makes every one of its Deals match the anchor `Partnership`.
- A correct implementation already exists and is unused:
  [`pickProductDeal`](booking/api/_utils/products.js#L197-L209) matches on `Deal_Product_Key` /
  `Deal_Product.name` and excludes `Opportunity_State = Lost`. It is exported and tested but never
  called on the live path — `getDealsForAccount` does not fetch the fields it needs. The Deluge
  side already does this properly, by exact unique `Deal_Key`
  ([handleMeetingEvent.deluge:542-543](zoho-functions/v6/activity/handleMeetingEvent.deluge#L542-L543)).

### F7 — meeting automation appears to be off in production **[CODE]** 🟠

`BOOKING_MEETING_AUTOMATION_ENABLED` and `BOOKING_DISPATCH_ENABLED` are **absent** from the
pulled `.env.production.local` (I did not read any values, only which keys are present).
Both fail closed ([lib/meeting-automation.js:23](booking/lib/meeting-automation.js#L23),
[lib/dispatch.js:35](booking/lib/dispatch.js#L35)). If that snapshot reflects Vercel, then:

- the retro-link PUT is triggers-suppressed, so **WF007 never fires for a booking** and the entire
  demo → Contact-sequence → Deal path is dormant for every booking taken so far;
- post-commit dispatch is off, so the worker only advances via the cron sweep.

This is consistent with the pre-publish audit finding zero activated Contacts and zero Events with
a terminal `Meeting_Task_State`
([AUDIT_RESULTS_PRE_PUBLISH.md](zoho-functions/docs/v6/AUDIT_RESULTS_PRE_PUBLISH.md)). It also
means F4 and F5 are latent rather than actively burning — arming the flag turns them on.

### F8 — `workerManageUrl` returns null without `PUBLIC_BASE_URL`, and the domain is not aliased **[CODE]** 🟡

[zoho-ops.js:107-110](booking/workflows/zoho-ops.js#L107-L110) deliberately omits the
"Manage or cancel" line when `PUBLIC_BASE_URL` is unset, to avoid writing a preview-signed link
into a production record. The key *is* set in production — but the dispatch module's own comment
notes it "points at a domain that is not aliased"
([lib/dispatch.js:29-30](booking/lib/dispatch.js#L29-L30)), and jurnii.io not being aliased is a
known open item. So the manage links written into CRM Meeting descriptions and into confirmation
emails may resolve to nothing.

### F9 — `Status = "Cancelled"` is not a live Task value **[CODE, already documented]** 🟡

Known and recorded as **L21** in
[AUDIT_RESULTS_PRE_PUBLISH.md](zoho-functions/docs/v6/AUDIT_RESULTS_PRE_PUBLISH.md). Still present
at [routeContactSequence.deluge:1058](zoho-functions/v6/activity/routeContactSequence.deluge#L1058)
(the supersede path), with three read-side predicates testing for it. Latent only because no
Contact has ever been activated; it fires the first time a Stage change supersedes a managed Task.

### F10 — read amplification and recursion depth **[CODE]** 🟡

- `processDeal` re-reads the Deal's Quotes via `getRelatedRecords` **six separate times**
  (§5, §8z, §9, §6, §7, §11) and issues a `getRecordById` per Quote inside most of them, plus a
  REST `GET` per Quote in §7 for the subform. A Deal with 4 Quotes costs on the order of 40+ API
  calls per reconcile, before the per-product Quote upserts.
- The call graph re-enters itself: `handleMeetingEvent` → `routeContactSequence` → `processDeal` →
  `routeContactSequence` ([:2741](zoho-functions/v6/processDeal.deluge#L2741),
  [:2781](zoho-functions/v6/processDeal.deluge#L2781)) → `processDeal` again for the same Deal.
  The code already carries scar tissue from hitting runtime limits at depth —
  `sendSequencedEmail` has a REST fallback because "a deeply-nested dispatch can make the native
  `getRecordById` return null"
  ([sendSequencedEmail.deluge:171-197](zoho-functions/v6/activity/sendSequencedEmail.deluge#L171-L197)),
  and the signed-confirmation email was moved out of `routeContactSequence` because at 5 frames
  deep "the send + its own reviews silently no-op'd".
- `processLead` calls `processContact` inline at
  [:781](zoho-functions/v6/processLead.deluge#L781) while WF001b2 fires the same function on
  Contact create — two concurrent runs, reconciled only by dedupe logic.
- `getRecords("Products", 1, 200)` ([processDeal.deluge:634](zoho-functions/v6/processDeal.deluge#L634)
  and in `_util_resolveDealProduct`) reads one page with no pagination. Fine at 4 products; a
  silent cliff at 200.

### F11 — smaller items 🟢

- **Two "Primary Contact" concepts.** `processDeal` maintains `Contact_Name` (single lookup) *and*
  intends to maintain a multi-select primary list, while `handleMeetingEvent` and
  `applyQuoteLifecycle` read `Deal_Primary_Contact`. Which one is authoritative is not stated
  anywhere I could find.
- **`Contract_Current_Plan_Frequency` does not exist on Deals** (only `Contract_Initial_Plan_Frequency`
  does), so the Current-term ledger cannot carry frequency even though the Initial one can.
- **`Task_Sequence_Stage` uses the label vocabulary** (`Demo Confirmation`, `Proposal Preparation`)
  while `Meeting_Task_Stage` uses the value vocabulary — the F4 split, in a second field, already
  flagged as "RETAIN pending reconciliation" in the field matrix.
- **Multi-family import terms share one brands/dates/frequency tuple** — documented as a schema
  limitation in [FLOW_REFERENCE.md](zoho-functions/docs/v6/FLOW_REFERENCE.md), still unresolved.
- **Booking form resume.** The progress snapshot TTL and the flow-token TTL are both 2h and
  independent ([booking-form.js:53](booking/assets/booking-form.js#L53)); a snapshot that outlives
  its token restores straight to step 3 ([:1485](booking/assets/booking-form.js#L1485)) and the
  visitor discovers the expiry only when they submit a slot.
- **No rate limiting** is visible on `POST /submissions/start`
  ([start.js](booking/api/v1/submissions/start.js)) — it is an unauthenticated endpoint that
  writes a row per call.
- **`Job_Title` free text bypasses the combobox.** The field accepts arbitrary typed text without
  committing an option ([booking-form.js:1334-1338](booking/assets/booking-form.js#L1334-L1338)),
  so a typo'd near-match travels as `Job_Title_Raw` and resolves no `Contact_Role1` — which then
  fails the activation gate. Deliberate ("blank is honest and filterable") but it is the single
  biggest determinant of whether a booking ever activates.

---

## Part 2 — Questions

### A. The phantom-field class (F1, F2, F3)

**⚑ A1.** Can you confirm from the live org whether a `processDeal` Deal update is actually landing?
The decisive test is five minutes of work: pick one Deal that `processDeal` has run against
recently, note its `Amount` / `Opportunity_Stage` / `Deal_Key`, change something upstream that
should move them, re-run, and re-read. Alternatively read a function-execution log and look for a
`Deal updateRecord resp:` line ([processDeal.deluge:2549](zoho-functions/v6/processDeal.deluge#L2549))
carrying an error rather than SUCCESS. **What does it show?** Everything below branches on this.

**A2.** If the writes are indeed being voided — for how long? Was there ever a version of these
fields on Deals that was later deleted, or have `Marketing_Qualification_Completed_At` and friends
never existed? (This decides whether the fix is "rename the writes" or "create the fields".)

**A3.** For the six stage-completion timestamps, which do you want?
 (a) **create** the six Deal fields, because Deal-level completion timestamps are wanted for
 reporting; or
 (b) **delete the writes**, because `Contact_Completed_*_At` already exists on Contacts (all 8 live,
 populated) and the Deal can derive from its primary Contact; or
 (c) keep writing but into a different existing field.
 I would default to (b) — but only you know whether anything reports off Deal-level stamps.

**A4.** For `Primary_Contact` → `Deal_Primary_Contact`: is `Deal_Primary_Contact` a multi-select
(the code builds a list of `{id}` maps) or a single lookup? And what is the intended relationship
between `Deal_Primary_Contact`, `Contact_Name`, and the Contact-Roles related list — which is the
source of truth for "who is the buyer on this Deal"?

**A5.** `Contacts.Contact_Source_Class`, `Contacts.Role_AOR`, `Contacts.Profile_Completion_Status`,
`Contacts.Product_Interest_Staging` are all absent live. For each: create the field, or delete the
code? `Role_AOR` and `Imported_Record_Type` **do** exist on Leads, so the intent to carry them onto
the Contact was real — was the Contact-side field never created, or deleted?

**A6.** Do you want me to generalise
[zoho-field-names.test.js](booking/tests/zoho-field-names.test.js) to assert *every* api_name
written by `zoho-functions/v6/**` against the snapshot? It is cheap and it makes this whole class
of bug impossible to reintroduce. Any reason not to — e.g. Deluge files that are intentionally
ahead of live metadata?

**A7.** Related: does Zoho **reject** an unknown api_name (whole map voided) or **ignore** it?
The repo asserts the former from the `Demo_Start_DateTime` evidence. If it is actually the latter,
F1 collapses from "nothing persists" to "six stamps are silently dropped", and the priority order
in Part 3 changes completely.

### B. Meeting / Event vocabulary (F4, F5)

**⚑ B1.** `Meeting_Task_Stage` stores `Demo Booked` / `Demo Attended` / `Commercials Sent` /
`Commercials Signed` / `Renewall` but displays the canonical 8-stage labels. Do you want to
 (a) **fix the data** — rename the picklist values to match the labels, migrating existing records
 (touches live data, needs a gated change); or
 (b) **fix the code** — add a value→label translation at every read site; or
 (c) both, in that order?
 Note this is the same decision already deferred for `Renewall` and for `Task_Sequence_Stage`, so
 it may be worth settling the whole vocabulary question once.

**B2.** How many Events currently carry each `Meeting_Task_Stage` value? (If the commercial/renewal
values are unused so far, (a) is nearly free.)

**B3.** `Meeting_Task_Status` values are `Open`/`Working`/`Closed` with `Open` labelled "New". Is
that label deliberate, or should the value be renamed to `New` for consistency with
`Task_Status`/`Call_Task_Status`? Confirm those two use `New`/`Working`/`Closed` as *values*.

**B4.** Is the demo-reminder path (`Demo_Reminder_Send_At` → WF010c) currently firing for anyone?
The field was restored to the layout on 2026-08-02 and the test comment says it was written for
the first time then — has a reminder actually been *sent* since?

### C. The booking ↔ CRM seam (F6, F7, F8)

**⚑ C1.** Is `BOOKING_MEETING_AUTOMATION_ENABLED` set to `true` in Vercel production? And
`BOOKING_DISPATCH_ENABLED`? (Neither key is in the pulled env snapshot.) If not — what is the
remaining gate before arming meeting automation? This is the single biggest question in the
document: with it off, most of v6 has never run against a real booking.

**C2.** How many bookings have been taken in production, and how many of them have a Zoho Meeting
with a populated `What_Id`? That number is the practical blast radius of F6.

**C3.** For F6 — do you want the Node resolver to (a) fetch `Deal_Product_Key`,
`Opportunity_State`, `Deal_Name` and delegate to the existing `pickProductDeal`, or (b) do what the
Deluge does and look the Deal up by exact unique `Deal_Key` (which needs `Account_Key`, one extra
read)? (b) is stricter and matches
[handleMeetingEvent](zoho-functions/v6/activity/handleMeetingEvent.deluge#L542-L543); (a) is a
smaller diff and reuses tested code.

**C4.** Is `jurnii.io` aliased yet? If not, what should `PUBLIC_BASE_URL` be so that manage links
in CRM Meeting descriptions and confirmation emails actually resolve?

**C5.** Cancellation is `false` in production and the manage page falls back to "contact us". Is
that permanent policy, or pending something?

### D. Activation and the sequence engine

**D1.** 145 Activation Tasks sit uncommitted and 150 Contacts have never activated. What is the
intended path from here — a bulk activation, a per-rep rollout, or does the population get
re-derived once F1/F2 are fixed?

**D2.** The activation gate requires `Contact_Role1 = Decision Maker`, `State = Open`, and
**exactly one** B2B driver Deal. Given the fan-out creates one Deal per product, a visitor who
ticks two products gets `[multi_product_sequence_ambiguous]` and **no** activation. How common do
you expect multi-product bookings to be, and is "a human always chooses" the right long-run answer,
or should there be a default (e.g. the canonical-order anchor product, which
[PRODUCT_ORDER](booking/api/_utils/products.js#L114) already defines)?

**D3.** F11's job-title point: a visitor who types a title that is not an exact list match gets a
blank `Contact_Role1` and can never activate. Do you want (a) the form to *force* a committed
selection (choose from list or explicitly pick "Other"), (b) a fuzzy server-side match into the
governed list, or (c) leave as-is and triage blanks manually?

**D4.** Change 18 gives Partnership Contacts a canonical Activation Task that dispatches nothing
(Change 20). What is the intended Partnership motion — a separate cadence later, or purely manual
forever? The 9 Partnership driver Deals will each raise a Task nobody can action.

**D5.** `Sequence_Type` is now preserved on Stop/Complete (Change 8) and a committed preference can
establish activation at a later Stage entry (Change 21). Is there any case where a rep should be
able to *clear* a stored preference back to "none"?

### E. The commercial / Quote engine

**E1.** The contract ledger is Confirmed-**or**-Closed-Won inclusive, but `Contract_Signed_Date`
and the A/E/R lifecycle transitions are Closed-Won-**only**
([processDeal.deluge:2017-2021](zoho-functions/v6/processDeal.deluge#L2017-L2021) admits this is a
coupled decision that was deferred). Should imported genuinely-signed contracts be emitted as
`Closed Won` rather than `Confirmed`, so the ledger can become signed-only?

**E2.** `Deal.Amount` excludes both `Closed Lost` and `Closed Won` Quotes. So the moment a deal is
signed, its Amount drops to whatever the successor Renewal Quote is worth (or 0 until one exists).
Is that the intended reporting behaviour? It makes "total pipeline" and "total contracted value"
two different questions that no single field answers.

**E3.** An Open RTP Deal with no priced Quote gets `Amount = 0` plus a
`[rtp_missing_commercial_evidence]` review, by design. With 84 Renewal-stage Activation Tasks in
the org, how many such reviews do you expect on first run, and is that acceptable?

**E4.** Multi-family import terms share one brands/dates/frequency tuple. Do you want per-product
contract fields on Leads, or is the current one-review-per-conflict behaviour good enough?

**E5.** `Jurnii Cortex` has no auto-price by design, so every Cortex line raises
`[pricing_unavailable]`. Is a manual price the permanent answer, or is a Cortex pricing band coming?

### F. Operational limits (F10)

**F1q.** Have you seen Deluge function timeouts, "too many API calls", or statement-limit errors in
the function logs? If yes, on which functions? `processDeal`'s Quote re-reads are the obvious
candidate and would be worth consolidating into one pass — but only if it is a real problem.

**F2q.** Is the `processLead` → inline `processContact` + concurrent WF001b2 race causing anything
observable (duplicate Activation Tasks, duplicate Deals)? The pre-publish audit found 3 Contacts
with 2 Tasks each, all cleanly resolvable — is that the whole population?

**F3q.** Do you want a hard cap / re-entrancy guard on the `processDeal ↔ routeContactSequence`
cycle, or is the current "verify the observable outcome afterwards" approach the one you want to
keep?

### G. Process and sequencing

**⚑ G1.** What is the deployment reality right now — is the `zoho-functions/v6` working tree
**identical** to what is published in Zoho? The memory note says Changes 1–21 were implemented but
unpublished; the field-name test's `noDeluge` skip exists precisely because "the Deluge source is
only tracked in this repo once the live functions match it". If the tree is ahead of live, the
fixes below need to be folded into the same publish.

**G2.** Given A1's answer, what is the priority order you want? My default would be:
 1. F1 + F2 (nothing else can be trusted until Deal/Contact writes land)
 2. F3 (the test that stops it recurring)
 3. F4 + F5 (must be right *before* C1 arms WF007)
 4. F6 (Meetings link to the right Deal)
 5. C1 — arm meeting automation
 6. everything else
 Does that match your view, and is there a business deadline pulling any of it forward?

**G3.** Do you want the fixes staged as separate publishes (one per finding, verifiable in
isolation) or one batch? Separate is safer given Deluge cannot be rolled back easily; batch is
fewer publish cycles.

**G4.** What can I verify directly? I have read-only Zoho MCP access and used it for metadata this
session. Am I allowed to run read-only COQL/record queries against the live org to size the
populations in B2, C2 and E3 myself — or do you want to produce those numbers?

**G5.** Is there anything in v6 you already know is wrong that I have not listed? I read all 38
functions but the booking half of `workflows/operator-actions.js`, the retention/ops machinery and
`handleCallOutcome` got a lighter pass than the rest.

---

## Part 3 — What I need to build the plan

Minimum to start: **A1** (is the Deal write landing), **C1** (is meeting automation armed),
**G1** (is the tree published). With those three I can sequence everything else even if the
remaining questions are answered later.

Ideal: A1–A7, B1, C1–C3, G1–G3.
