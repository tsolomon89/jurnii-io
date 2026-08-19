> # ⚠ SECOND BANNER — the Deal-linking design below is KNOWN DRIFT
>
> This file's existing banner correctly marks the pre-rewrite sections out of date and the "As-built"
> material authoritative. **This banner is narrower and applies inside the surviving As-built half.**
>
> The section arguing that **multi-product bookings must defer sequence activation to a human** — and
> that auto-picking a driver Deal "would break HARD RULE 7" — is **inverted relative to the approved
> model.** HARD RULE 7 (one sequence per Contact) is correct. Deriving ambiguity from the *number of
> Products* is the violation: authority §5.4 states that several Products or Quotes under the Deal do
> **not** make the Contact sequence ambiguous.
>
> Likewise "`processLead` fans out one Product Deal per resolved product" is current behaviour, not
> target design.
>
> **What must not change:** the defensive rule that a Meeting links a Deal as `What_Id` only when that
> Deal already exists. That is correct under either model.
>
> **Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../../zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)  ·  reconciled 2026-08-17 (`jurnii-doc-reconciliation-2026-08-17`)

---

# Jurnii Booking Integration Architecture

> ## ⚠ Read "As-built" first
>
> **The sections below — including the sequence diagram, "Identity resolution (Page 1)" and
> "Page-2 behaviour" — describe the PRE-REWRITE synchronous design and are materially out of
> date.** They are retained because they document the reasoning that led here, and because
> readers familiar with the old system will look for them.
>
> The **[As-built](#as-built-how-the-implementation-differs-from-the-literal-plan)** section at
> the end of this file is authoritative wherever it disagrees. In particular, these claims above
> are now **wrong**:
>
> | Says | Actually |
> |---|---|
> | Page 1 searches Contacts and Leads and writes to Zoho | Page 1 is **Postgres-only**, zero Zoho calls |
> | Page 1 can answer `409 MANUAL_REVIEW` | Removed — ambiguity is undiscoverable there, so the visitor books normally and the worker raises a Task |
> | Page 2 sends the workflow-enabled Lead update inline | Page 2 is transaction **R1** and queues `zoho_identity_resolve`; the single workflow-enabled update is the worker's, at most once |
> | Booking takes "ONE bounded CRM snapshot" and creates the Zoho Event | Booking makes **zero** Zoho calls; G1 activates `zoho_meeting_create` |
> | Google private metadata holds `{journeyId, email}` | It holds `{journeyId, attempt}` — no email is written to a third party |
> | The flow token carries `recordType`/`recordId`/`product` | Reduced to `{journeyId, email, step, purpose}`; CRM state lives in Postgres |
> | A meeting is never retro-linked | `zoho_deal_reconcile` retro-links Contact + Deal in one triggers-enabled PUT |
> | The site loads `assets/booking-form.js` | That stub is **deleted**. One implementation: `booking/assets/booking-form.js`, served at `/booking/assets/booking-form.js` |
> | The confirmation panel is static | Every value comes from the response; `202 booking_pending` polls `GET /bookings/{id}/status` for the outcome and the `manageUrl` |
>
> Implementation is complete. What remains is Preview provisioning and the §12 live
> verifications, both separately gated. See `docs/implementation-notes.md` for the as-built
> record and `docs/runbook.md` for operations.

This document describes the design, API contracts, and sync logic for the Jurnii website
booking form's integration with Zoho CRM and Google Calendar.

The website is a thin orchestration layer. **Zoho Deluge automation (`processLead` /
`processContact` → `processAccount`/`processDeal`, and `handleMeetingEvent`) is the sole
authority** for the commercial graph (Account/Contact/Deal/Quote/Product/Role), pipeline state,
sequences, and activity handling. The website never reproduces that business logic. It uses only
the **standard** CRM modules (Leads, Contacts, Accounts, Deals, Products, Quotes, Tasks, Calls,
Meetings/`Events`) — **there is no custom submission or booking module**.

## Two identities (the core correction)

- **CRM record id** — `recordType` (`Contact` | `Lead`) + `recordId` — identifies the record being
  updated. It is resolved **Contact-first** (§ Identity resolution).
- **Journey UUID** (`journeyId`) — a client-generated, opaque key that identifies this form+booking
  journey. It is the idempotency/correlation key for the Google event and the Zoho Meeting, and is
  independent of whether the record is a Contact or a Lead. It is **not** a CRM id.

## High-level flow

```mermaid
sequenceDiagram
    autonumber
    actor Visitor
    participant Frontend as Website (booking-form.js)
    participant API as Vercel Serverless (api/v1)
    participant Zoho as Zoho CRM EU
    participant WF as Deluge (processLead / processContact / handleMeetingEvent)
    participant Google as Google Calendar

    %% Page 1 — identity resolution + partial persistence (NO conversion)
    Visitor->>Frontend: Name, email, consent (+ client journeyId, hidden UTM)
    Frontend->>API: POST /api/v1/submissions/start { journeyId, ... }
    Note over API: Contact-first: 1 Contact → reuse (no Lead search);<br/>else 1 unconverted Lead → reuse; else create Lead (trigger:[])
    API->>Zoho: update Contact / update-or-create Lead (trigger:[] — workflows SUPPRESSED)
    API-->>Frontend: { token(journeyId,recordType,recordId), journeyId, step:1 }

    %% Page 2 — ONE required save, then advance immediately (never waits for automation)
    Visitor->>Frontend: Company, title, product (optional), phone, country
    Frontend->>API: PATCH /api/v1/submissions/{journeyId} (Bearer) + prefetch availability concurrently
    alt recordType = Lead
        Note over API: ONE Lead update, triggers ENABLED → processLead converts ASYNC (not awaited)
        API->>Zoho: update Lead
        Zoho-->>WF: processLead → Account/Contact/Deal/Quote/Roles (after the fact)
    else recordType = Contact
        Note over API: update Contact (trigger:[]) — no Account/Deal read
        API->>Zoho: update Contact
    end
    API-->>Frontend: { token, step:2 }   (a failed SAVE stays an error; no conversion/Deal gate)

    %% Page 3 — booking (Google first, then ONE bounded CRM snapshot)
    Frontend->>API: GET /api/v1/availability
    Frontend->>API: POST /api/v1/bookings (Bearer, purpose:flow)
    Note over API: reuse-or-create Google event + Meet (owned by journeyId + normalized email)
    API->>Google: events.insert (Meet, sendUpdates:all, private {journeyId, email})
    Note over API: ONE snapshot (no poll): resolve person (Contact else Lead); resolve the Deal IF it already exists
    API->>Zoho: create Event (Who_Id=person; What_Id+$se_module='Deals' only if a Deal exists; Ext_Calendar_Booking_ID=journeyId)
    Zoho->>WF: WF007 handleMeetingEvent → advance pipeline (only when a Deal is linked)
    API-->>Frontend: { status:'confirmed', meetLink, manageUrl, googleEventId, zohoEventId }
```

## Identity resolution (Page 1) — strictly sequential

After canonical email normalization (`normalizeEmail`, work-email-only gate):

1. **Search Contacts.** `>1` → `409 MANUAL_REVIEW (identity_ambiguous)`. `==1` → `recordType=Contact`,
   reuse it, and **stop — Leads are not searched at all**.
2. **Only if no Contact:** search **unconverted** Leads. `>1` → Manual Review. `==1` → reuse.
   `0` → create a Lead.
3. Multiple matches are never auto-picked; stale-Lead cleanup is a separate CRM maintenance process,
   off the request path.

**Page-1 persistence is mandatory:** the resolved record is always written with the permitted Page-1
fields using `trigger:[]` (workflows suppressed) — consent on a Contact (never clobbering the name),
all Page-1 fields on a reused/created Lead.

## Page-2 behaviour (KISS)

Page 2 performs **exactly one required Zoho save** and returns immediately. It never polls for
conversion, waits for `processLead`, resolves an Account/Deal/Quote, or gates booking on downstream
automation — Zoho reconciles the graph after the fact, and it is read **once** (best-effort) at booking.

- **Lead path:** exactly **one** Lead update **with triggers enabled** — that edit *starts* `processLead`
  (which converts + builds the graph asynchronously). The response does **not** wait for it. Retry-safe:
  if a prior successful save already converted the Lead, the replay makes **no second update**; if the
  Lead has since disappeared, **one** email-recovery lookup (no sleep) confirms the person.
- **Contact path:** the Contact is updated in place with `trigger:[]`. No Account read, no Deal
  resolution. It carries **no** `Product_Interest` at all — that api_name does not exist on Contacts
  (product interest lives in the `Products_Linked` junction `processLead` populates), and sending it
  made the entire update `INVALID_DATA`. *Corrected 2026-08-08: this line previously claimed the
  Contact path wrote `Product_Interest` additively.*
- **A failed direct save stays an error** (invalid fields → `400`; a rejected Zoho write → retryable
  `502`). Success is never reported for unsaved data. Product interest is optional and never gates
  advancing to the calendar.

## Product / Deal rules

- Product Interest is **multi-select** (2026-08-08). The form offers all four canonical Zoho products —
  `Jurnii UX` / `Jurnii 360` / `Jurnii Cortex` / `Partnership` — as a checkbox group whose visible
  labels are structurally separate from the submitted values, and the page-2 endpoint canonicalizes,
  deduplicates and rejects anything that is not a live picklist value (`Cortex / Growth` →
  `Jurnii Cortex` is retained as a legacy input spelling). Selections persist to
  `booking_journeys.product_interests text[]` **in the order they were ticked**, and the whole array is
  sent to the Lead's `Product_Interest` multiselect.
- On an update to an **existing** Lead the array is written **additively** (deduplicated union with the
  record's current value), never a bare replace — Zoho multiselect writes replace, so a returning
  visitor would otherwise lose the interests already recorded against them. The enrichment read happens
  **before** the at-most-once send latch and degrades to a plain replace if it fails, so it can never
  consume the single permitted workflow-enabled write.
- The **first** selected product is the one that resolves a Deal, because a Meeting links to exactly one
  record via `What_Id`. With a single selection this is identical to the pre-multi-select behaviour.

> **Multi-product bookings defer sequence activation to a human. This is by design, and the
> multi-select made it reachable.**
>
> `processLead` fans out **one Product Deal per resolved product**, so a visitor who ticks two boxes
> gets two Deals. `processContact` then applies HARD RULE 7 — one active automated sequence per
> Contact — and, on finding more than one driver Deal, raises a
> `multi_product_sequence_ambiguous` Manual Review **instead of** the Sequence Activation Task
> (`processContact.deluge`, the `driverDealIds.size() > 1` branch).
>
> Before the multi-select the form could only ever send one product, so that branch was
> unreachable from the booking flow. It is now reachable from the ordinary happy path. Nothing
> breaks — it fails safely to a human, which is what the rule is for, and a genuinely two-product
> prospect does need a person to choose which Deal drives the sequence. But it is a real change in
> operational load: expect a Manual Review for every multi-product booking. Neither side was
> altered to paper over it, because the alternatives are worse — sending only the first product
> would discard what the visitor told us, and auto-picking a driver Deal would break HARD RULE 7.
>
> If that load proves unacceptable, the decision belongs in Deluge (e.g. a documented precedence
> order over driver Deals), not in the form.
- A Product Deal is **never required to book**. At booking, if a product was selected **and** exactly
  one matching open Deal already exists, the meeting is linked to it (`What_Id` + `$se_module='Deals'`);
  otherwise the meeting is **person-linked** and confirms anyway. Products/Deals are never fabricated by
  the website, and it never creates a productless Deal or a Quote (`processDeal` owns the Deal + scaffold
  Quote).

## ~~Known limitation~~ — CLOSED by the durable backend

> This section described the pre-rewrite behaviour and is **no longer accurate**. It is kept because
> readers who know the old system will look for it.

**Formerly:** the website raised no Manual Review Task, and a meeting created before its Product Deal was
visible stayed person-linked forever, never triggering `handleMeetingEvent` and never being retro-linked.

**Now:** both halves are closed.

- **Manual Review exists.** `zoho_manual_review` creates or updates exactly **one Task per journey** for
  its whole life, with an append-only reason ledger. Reasons are per *occurrence*, so the same problem
  recurring after a resolution reopens the same Task rather than being silently swallowed.
- **The retro-link happens.** `zoho_deal_reconcile` polls a 5m/15m/1h/6h/24h ladder and, once the final
  Contact is **explicitly discovered** and the Meeting exists, issues **one triggers-enabled PUT applying
  `Who_Id` and `What_Id` together** with `$se_module='Deals'` — which re-fires WF007 and advances the
  pipeline. Unresolved or ambiguous after the window escalates to Manual Review; it never fabricates a
  Deal or creates a second Meeting.

Two constraints are unchanged and load-bearing. A Deal is linked **only** together with the final
Contact, never over a Lead `Who_Id` — `handleMeetingEvent.deluge` passes `Who_Id` into
`routeContactSequence(<contactId>, …)`, so a Lead id in the Contact position silently mis-routes. And
the person-linked phase still drives **no** Deluge automation: it buys CRM visibility, and the retro-link
is what advances the pipeline.

No Zoho-side reconciliation workflow was added — and none may be. See the metadata boundary below.

## Journey UUID, JWT & continuation

- `journeyId` is **client-generated** (`crypto.randomUUID`) and persisted in `localStorage` **before**
  the first Page-1 request, so retries/concurrent submits are deterministically idempotent. The server
  **validates** it is a well-formed UUID and **binds** it into the signed JWT — it never mints its own.
  It is cleared on booking completion and when a new/unrelated journey (different email) starts.
- The **JWT is the journeyId→record binding** (there is no store): the flow token (2h, `purpose:'flow'`)
  carries `journeyId / recordType / recordId / email / product? / step`; the manage token
  (30d, `purpose:'manage'`) carries `journeyId / recordType / recordId / email`. It carries **no**
  `contactId`/`accountId`/`dealId` — those are mutable relationships resolved once at booking, never
  ownership keys. Every step binds `decoded.journeyId === path id` and enforces `purpose`; CRM
  reads/writes use `recordType`/`recordId`, never the path id.

## Meeting integration

- Google Calendar is the source of availability and the Meet conference. The event stores
  `extendedProperties.private.{journeyId, email}` and emails the invitee (`sendUpdates:'all'`).
- The Zoho **Event** always links to the resolved person (`Who_Id` = Contact when converted, else the
  Lead), stores the Meet link, and carries `Ext_Calendar_Booking_ID = journeyId`. It links the exact
  Product Deal (`What_Id` + **`$se_module:'Deals'`**) **only when that Deal already exists** at booking;
  then WF007 `handleMeetingEvent` advances the pipeline. Otherwise the meeting is person-linked (see
  Known limitation). The **Activation Task remains the human decision point**.
- **Ownership verification:** because `journeyId` is client-controlled, a reused Google event is
  accepted only if its stored `journeyId` **and normalized `email`** match the signed token, and a reused
  Zoho event only if its `Ext_Calendar_Booking_ID` matches — otherwise `409 correlation_conflict`. This
  gates booking, cancel, and reschedule; Contact/Deal ids are never ownership keys.

## Idempotency

- **Record:** dedupe by normalized email; Contact-first; an existing single unconverted Lead is reused;
  ambiguity → Manual Review (never an arbitrary pick).
- **Google event:** reuse by `privateExtendedProperty=journeyId`, ownership-verified, before insert; the
  Meet `requestId` is stable per journey.
- **Zoho event:** reuse by `Ext_Calendar_Booking_ID=journeyId`, ownership-verified, before insert.

## Security

- Zoho/Google credentials stay server-side. The browser never supplies CRM record ids — all come from
  the server-signed JWT. `journeyId` is client-supplied but only ever an opaque correlation key (never a
  CRM id), UUID-validated, JWT-bound, and ownership-checked at reuse. Booking requires `purpose:'flow'`;
  cancel/reschedule require `purpose:'manage'` and bind `journeyId` to the path id. Errors are sanitized
  (`{error, code}`); no raw
  Zoho/Google payloads; no PII in logs (email is a fingerprint). Google scopes are `calendar.events` +
  `calendar.events.freebusy`.

## API contracts

| Endpoint | Auth | Body | Success | Notable non-2xx |
| --- | --- | --- | --- | --- |
| `POST /api/v1/submissions/start` | — | `{journeyId,firstName,lastName,email,consent,sourcePage,utm*}` | `200 {token,journeyId,step:1}` | `400 validation` (bad/absent journeyId), `400 EMAIL_NOT_BUSINESS`, `409 MANUAL_REVIEW (identity_ambiguous)` |
| `PATCH /api/v1/submissions/{journeyId}` | Bearer (`purpose:flow`, step 1) | `{company,jobTitle,productInterest,phone,country}` | `200 {token,step:2}` | `400 validation` (missing/invalid fields), `409 wrong_step`, `502` (Zoho save failed — retryable) |
| `GET /api/v1/availability` | — | — | `200 {slots:[{start,end}]}` | — |
| `POST /api/v1/bookings` | Bearer (`purpose:flow`, step 2) | `{slotStart}` | `200 {status:'confirmed',bookingId,meetLink,manageUrl,googleEventId,zohoEventId}` | `403 forbidden` (wrong purpose), `409 SLOT_TAKEN`, `409 correlation_conflict`, `502 MEET_PENDING`, `502` |
| `DELETE /api/v1/bookings/{journeyId}` | Bearer (`purpose:manage`, 30-day) | — | `200 {success}` | `403 forbidden`, `409 correlation_conflict` |
| `PATCH /api/v1/bookings/{journeyId}/reschedule` | Bearer (`purpose:manage`) | `{slotStart}` | `200 {success,newStart}` | `403`, `404`, `409 SLOT_TAKEN`, `409 correlation_conflict` |

## Work-email-only intake & self-service management

- **Work emails only:** `/submissions/start` rejects free/personal/disposable domains
  (`api/_utils/email.js`; extend via `BLOCKED_EMAIL_DOMAINS`); the front end also validates inline.
- **Self-service cancel/reschedule:** a successful booking mints a **30-day management JWT** and returns
  `manageUrl` (also in the invite description and confirmation screen). `manage.html` reads the token
  and calls the JWT-secured cancel/reschedule endpoints. Set `PUBLIC_BASE_URL`.

## Environment

See [`.env.example`](../.env.example). Notable: `ZOHO_ACCOUNTS_HOST`, `HOST_TIMEZONE`,
`PUBLIC_BASE_URL`, optional `ZOHO_LEAD_FIELD_*` attribution, optional `ZOHO_EVENT_MEET_FIELD`. There is
**no** `ZOHO_SUBMISSION_MODULE` and **no** Contact-path reconciliation URL/scope. `vercel.json` keeps a
60s `maxDuration` on the submissions + booking functions as headroom for Zoho token refresh — Page 2 no
longer polls; it does one save and returns.

## Live verification & approval-gated items

See [`IMPLEMENTATION_EVIDENCE.md`](./IMPLEMENTATION_EVIDENCE.md) for the verification checklist. The
Contact path needs **no** Deluge, OAuth, or custom-field change; the only pre-deploy items are the
standard Google/Vercel credentials + production E2E.

---

# As-built: how the implementation differs from the literal plan

This section is authoritative where it disagrees with anything above or with the
implementation plan. Each item is a correction forced by real PostgreSQL or Zoho
behaviour, verified against PostgreSQL 17.10, and pinned by a named regression test.
Full reasoning is in `docs/implementation-notes.md`.

## Dispatch: a committed write starts the work, not a timer

Operations are armed inside the transaction that makes them necessary (the universal outbox
rule, §4.8), but for a long time nothing *looked* for them except a per-minute cron — and a
pass claimed one batch, so each hop in a chain cost a full interval. A five-hop Lead journey
spent ~4–5 minutes queueing before Zoho's own timing counted.

Two changes fix that, and they are separable:

1. **A pass claims one operation at a time and re-claims after each one.** This was
   introduced to fix a defect — a batch claim leased rows it might never start, and the
   claim's crash arithmetic then counted them as crashes — but it also means a pass
   continues into whatever it arms. One pass now walks the whole runnable chain.
2. **`publish()` registers a journey-scoped drain after a commit**, so the chain starts in
   seconds instead of at the next tick. `booking/lib/dispatch.js`, gated on
   `BOOKING_DISPATCH_ENABLED`.

`withTransaction(fn, { collectRunnable })` returns the set of journeys the transaction made
runnable; the handler publishes it at the top level, after `COMMIT` and **before** the
response returns. Publication is deliberately *not* inside `withTransaction`: that helper is
also used by the worker, the CLI scripts and the test suite, none of which should acquire a
detached network effect, and none of which has a request context for `waitUntil`. It also
means worker contexts cannot publish at all — they simply never pass a collector — so a
drain cannot fan out wakes for the operations its own loop is about to run.

The dispatch is a **hint with no authority**. Postgres remains the queue; losing a hint
costs latency and nothing else, because the operation is still `pending` and the sweep
claims it. That is what makes best-effort acceptable here, and it is why there is no
internal HTTP call, no second credential and no queue in this layer.

`runJourneyUntilBlocked` reports *why* it stopped, because stopping is not the same as
finishing: `no_due_work` means genuinely waiting, while `budget_exhausted`/`max_ops` with
`continuationRequired` means runnable work was left for the sweep. It never sleeps and never
overrides `next_retry_at`, so it cannot busy-poll Zoho.

## Zoho metadata boundary (global)

No module, field, layout, picklist value, workflow, validation rule, blueprint, OAuth
scope or connection is ever created or altered, and none may be added. Enforced by
omission and by test. **A missing dependency is a prerequisite failure to report, not
permission to repair metadata.** Deluge is likewise never published or edited;
`processLead` / `processContact` / `processDeal` remain the sole owners of the
commercial graph, and Node creates no Contact, Account, Deal or Quote.

## 1. Reservation geometry is trigger-maintained, not generated

`slot_end_utc`, `slot_hold` and `hold_end_utc` are plain columns assigned
**unconditionally** by the `bsr_derive` BEFORE INSERT OR UPDATE trigger, which ignores
any value the application supplies. They cannot be generated columns: `timestamptz +
interval` is STABLE, not IMMUTABLE, so PostgreSQL rejects the expression outright
(`generation expression is not immutable`), and the epoch round-trip fails identically.
Every property is preserved — derived, authoritative, indexed by the EXCLUDE constraint,
and exactly equal to the availability conflict predicate.

## 2. Event-binding replacement is two ordered statements

Close the live binding **first**, insert the replacement **second**, inside one
transaction. A single statement doing both violates `bjeb_one_live_per_journey`, because
a unique index is checked per statement. This is the same load-bearing ordering as G5
against `bsr_one_confirmed`. `bindEvent()` enforces it; the tests pin **both** directions
so a refactor that collapses them fails loudly.

Adoption is **not** write-once: an adopted event can itself disappear, and the operator
must be able to adopt a second verified replacement. `booking_journey_event_bindings`
keeps the full chain with one live binding per journey and per event.

## 3. The retention busy predicate must return a concrete boolean

Every nullable comparison is `COALESCE`d and the whole expression wrapped in
`COALESCE(…, false)`. `google_outcome_state` is nullable, so `NULL IN (…)` is NULL,
`false OR NULL` is NULL, and `NOT NULL` is NULL — which silently excluded **every journey
with a null outcome state from every scrub sweep**. Nothing would ever have been scrubbed
while the job reported success.

## 4. Reason insertion and escalation updates are ordered statements

`addReviewReason` cannot be one data-modifying CTE: the CTE's INSERT is not visible to
the outer UPDATE, so `bj_guard` would not see the new reason row and would reject the
journey update with `invariant_attention_without_reason`. Hence: lock the newest
occurrence, advance the clock, insert the occurrence, then `refreshAttention`. For the
same reason **every escalation adds its reason before its status update** — invariant
T-a′ requires an open reason to exist by the time `google_outcome_state='unresolved'`
lands.

`needs_attention`, `needs_attention_code` and `needs_attention_at` are **derived** from
the ledger by `refreshAttention` and by nothing else; the trigger rejects a row where
they disagree. Clearing attention by hand is impossible, not merely discouraged.

## 5. `parkOp` may only write `parked` from safe states

`parked` is precisely the state `ensureOp` re-arms, so writing it over `outcome_unknown`,
`accepted`, `sending` or `terminal` would hand a revivable row to a later `ensureOp`.
The concrete failure: the workflow-enabled Lead update's response is lost, Z6 latches
`outcome_unknown`, the op is claimed again, the handler correctly refuses to resend and
returns `parked_precondition` — and that refusal **overwrote the latch**, permitting a
second `processLead`. `parkOp` now preserves latched states while still clearing
`next_retry_at`.

## 6. `Retry-After` handling is explicitly typed

`recordOutcome`'s `next_retry_at` CASE casts the parameter (`$6::double precision`).
Without it a NULL `Retry-After` — the common case — failed with *could not determine data
type*, so **no outcome was recorded at all**: the lease stayed live, the op looked
crashed, and the crash counter climbed toward termination.

## 7. The status endpoint and the polling handoff

`GET /api/v1/bookings/{journeyId}/status` is new and is how an uncertain create resolves
for the visitor. It accepts **either** a flow token (the browser polls with what it
already has after a `202`) or a manage token, and mints a fresh 30-day manage token
**only** when the booking is confirmed — that is how the browser obtains a durable
credential on the `202` path, where it never sees a `200`.

The manage token is minted **before** `events.insert`, so the calendar invite always
carries a working management URL even when the browser gives up. The projection exposes
no CRM id, calendar id, reason code or raw error: booking truth and integration state are
separate axes, so a visitor whose cancellation failed is still correctly told their
meeting is real.

## Google recovery, in one place

Correlation is **always** a direct `events.get` on the deterministic per-attempt id;
`listEventByJourneyId` is deleted, because `showDeleted:false` cannot see a cancelled
event. `events.list` survives for exactly one purpose — reading `accessRole` in the
access probe — and a test asserts it has a single call site.

A bare `404` is **never** proof of absence. `booking_failed` requires a `404` **plus** a
confirmed `writer`/`owner` probe **plus** the deadline. `writerWithoutPrivateAccess` is
unconfirmed by default. Anything else is `unknown`: the hold is retained, the attempt
stays open, and `[google_calendar_unreadable]` surfaces it for a human. The visible cost
is that an unreachable calendar withholds a slot until someone intervenes — the
deliberate trade against releasing a slot Google may already have booked, or telling Zoho
a live meeting was cancelled.

## 8. One frontend implementation

There is one booking widget, `booking/assets/booking-form.js`, and the site's demo modal
renders it. `assets/booking-form.js` — the Calendar-iframe stub that posted to an empty
endpoint — is deleted, so the modal captures a real submission for the first time.

`window.JurniiBooking.render(container, options)` is the host contract. Supplying
`onClose` (or `embedded: true`, or the page-level `JURNII_BOOKING_EMBEDDED` flag) tells the
widget a host owns the modal chrome: it paints no close button of its own and its own
`.open-booking-modal-btn` interception never wires up, so one CTA click cannot open two
modals. Auto-mount into `#jurnii-booking-form-inline` / `#jurnii-manage-inline` is retained
unconditionally, because an inline placement is a real surface that must work with no host
script at all.

`manage.html` is a **real file**, not an SPA route. Vercel resolves the filesystem before
applying the `/(.*)` → `/index.html` rewrite, which is what stops the fallback swallowing
it — and it is why every emailed manage link was previously dead. The build throws if the
file or any widget asset is missing, rather than shipping a 404 on the booking path.

Two properties are worth stating because they are structural rather than incidental. First,
**no server message string is ever rendered**: all visitor copy is authored in the widget
and selected by machine `code`, so a reason code, CRM id, calendar id or third-party
fragment cannot reach the page even if a handler later starts echoing one. Second,
**display and submission cannot disagree about time**: slots are bucketed and labelled in
the visitor's own zone, while the value sent back is the exact ISO instant `/availability`
offered, never re-derived from the label.

Cancellation is hidden unless a deployment sets `JURNII_BOOKING_CANCELLATION_ENABLED`.
A static page cannot read `BOOKING_CANCELLATION_ENABLED`, and this is the fail-safe
direction: a misconfiguration hides a button that would only answer `403`, rather than
offering one that always fails.
