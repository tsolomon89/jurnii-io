# Booking backend runbook

Operational procedures for the database-first booking backend. Spec §21 rules out an
admin UI in this implementation, so the operator interface is this document plus `curl`.

> **Zoho metadata boundary — applies to everything in this document.**
> No procedure here may create or alter a Zoho **module, field, layout, picklist value,
> workflow, validation rule, blueprint, OAuth scope or connection**. Nothing in this
> codebase can: the integration surface has no function for it, and a test asserts each
> such name is absent. If a procedure fails because a field, picklist value or scope is
> missing, that is a **prerequisite failure to report** — never permission to repair the
> metadata. The same applies to Deluge: no function is published or edited from here.

---

## 1. Environments and credentials

| Variable | Local | Preview | Production | Kind |
|---|---|---|---|---|
| `BOOKING_CALENDAR_KEY` | `jurnii_local` | `jurnii_preview` | `jurnii_prod` | stable identifier |
| `RESOLUTION_FINGERPRINT_HMAC_KEY_ID` | `local-v1` | `preview-v1` | `production-v1` | stable identifier |
| `BOOKING_CALENDAR_HMAC_KEY` | generated | generated | generated | **secret** |
| `BOOKING_ADMIN_SECRET` | generated | generated | generated | **secret** |
| `RESOLUTION_FINGERPRINT_HMAC_KEY` | generated | generated | generated | **secret** |
| `CRON_SECRET` | generated | generated | generated | **secret** |

The four secrets are **independently generated per environment and never reused**. See
§8 for what each rotation breaks.

Two credentials are deliberately not interchangeable and each is rejected on the other's
routes: `CRON_SECRET` drives the job endpoints; `BOOKING_ADMIN_SECRET` can change a
booking's truth. A scheduler credential must not carry that authority.

---

## 2. Worker execution

The worker is a per-minute cron. Each pass claims due operations, terminates any that
have hit the crash ceiling *before* running a handler, and records exactly one outcome
per claimed operation.

```bash
# Production: driven by Vercel cron. Manual invocation, or Preview (which gets no cron):
curl -s -X POST "$BASE/api/v1/internal/jobs/run" \
  -H "Authorization: Bearer $CRON_SECRET"
```

```json
{ "ok": true, "claimed": 4, "ran": 4, "outcomes": { "progress": 3, "no_progress": 1 },
  "reservationsExpired": 0 }
```

A pass is bounded by `JOBS_BATCH_LIMIT` (20) and `JOBS_TIME_BUDGET_MS` (40s). Unstarted
claims keep their pre-committed backoff and are simply due next pass — nothing is lost
by a pass ending early.

### Reading the outcome kinds

| Outcome | Means |
|---|---|
| `progress` | The step advanced and committed its transition plus the next operation. |
| `no_progress` | A **successful** read that found nothing yet. Consumes no retry budget; bounded by `deadline_at`. |
| `parked_precondition` | A precondition is not met and this op cannot change that. Stops polling until another transaction reactivates it. |
| `watch_tick` | A **failed** read during the durable watch phase. Consumes no budget. |
| `retryable_failure` | Classified transient failure. Consumes budget. |
| `terminal_failure` | The op's terminal action ran. |

### Diagnosing a stuck journey

```sql
SELECT op, state, failure_count, crash_reclaim_count, create_attempts,
       next_retry_at, deadline_at, watch_until_at, last_outcome_kind, last_error_code
  FROM booking_journey_ops WHERE journey_id = '<uuid>' ORDER BY op;

SELECT booking_status, google_outcome_state, google_status,
       cancel_intent_state, reschedule_intent_state,
       lead_terminal_update_state, zoho_status,
       needs_attention, needs_attention_code,
       manual_review_version, manual_review_applied_version, manual_review_closed_version
  FROM booking_journeys WHERE journey_id = '<uuid>';

SELECT code, generation, review_version, occurrences, first_seen_at, resolved_at
  FROM booking_journey_review_reasons WHERE journey_id = '<uuid>'
 ORDER BY review_version;
```

`state = 'terminal'` means the op **gave up**. It is not revivable by `ensureOp` and is
not busy for retention. Only a strictly newer cycle, or `RT1.resume`, moves it.

Journeys whose escalation channel itself broke are found here rather than by a CRM Task,
because a crash-looping reviewer is never asked to report its own crash loop:

```sql
SELECT journey_id FROM booking_journey_ops
 WHERE op = 'zoho_manual_review' AND state = 'terminal';
-- correlate with the log event worker.crash_loop.review_unavailable
```

---

## 3. Retention

Enabled in Production by default. **Always dry-run first.**

```bash
curl -s "$BASE/api/v1/internal/jobs/retention?dryRun=1&limit=50" \
  -H "Authorization: Bearer $CRON_SECRET"
```

```json
{ "ok": true, "dryRun": true, "scrub": 3, "purge": 0,
  "journeyIds": { "scrub": ["…"], "purge": [] } }
```

```bash
# Execute. One transaction per journey, so a mid-run failure leaves earlier work done.
curl -s -X POST "$BASE/api/v1/internal/jobs/retention?limit=50" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Periods: 90d Page-1-only · 180d Page-2 complete · 365d booked/cancelled (from
`slot_end_utc`) · delete 730d after scrub. A journey is skipped while **busy** — any
scheduled, in-flight or in-doubt op, a pending intent, a live operator-resolution lease,
a hold whose `hold_end_utc` is still future, or a live review window.

`needs_attention` defers retention only until `review_retention_until`, one extension per
outstanding episode. **An unresolved journey scrubs on its normal lifecycle date even if
the operational issue was never resolved** — deliberately, so nothing blocks retention
forever. `needs_attention_code`, `manual_review_reasons` and the analytics booleans
survive so the operational history stays readable.

### If retention reports 0 candidates when you expect some

Check the busy predicate for one journey:

```sql
SELECT journey_id, needs_attention, review_retention_until, google_outcome_state
  FROM booking_journeys WHERE journey_id = '<uuid>';
```

Historically the predicate could evaluate to SQL `NULL` and silently exclude every
journey with a null `google_outcome_state` — reporting success while retaining
everything. That is fixed and pinned by a named regression test; if you see a suspicious
zero, confirm the fix is present rather than assuming a data explanation.

---

## 4. Calendar registration

Run **once per environment, before it accepts bookings**. Bookings are refused with
`503 calendar_misconfigured` until it has.

```bash
cd booking
npm run register-calendar            # idempotent; safe to re-run
node db/register-calendar.js --verify # verify only, writes nothing
```

Expected: `[register-calendar] ok  host_calendar_key=jurnii_preview fingerprint=1f785d0a…`

| Failure | Meaning |
|---|---|
| `calendar_config_invalid` | `GOOGLE_CALENDAR_ID` is `primary`, lacks an `@`, `BOOKING_CALENDAR_KEY` fails `^[a-z0-9_]{4,32}$`, or `BOOKING_CALENDAR_HMAC_KEY` is unset. Fix the configuration. |
| `calendar_key_bound_elsewhere` | This key is already registered against a **different** calendar. **Do not force it.** Re-pointing a key orphans every reservation held under it. |
| `calendar_bound_to_other_key` | This calendar already has a different key. Two keys for one calendar split the reservation namespace and let two journeys hold the same slot. |

An alias is rejected because `primary` and `demos@jurnii.io` denote the same calendar;
accepting both would create two independent reservation namespaces and defeat the
overlap constraint entirely.

---

## 5. Operator resolution

```
POST /api/v1/internal/journeys/{journeyId}/resolve
Authorization: Bearer $BOOKING_ADMIN_SECRET
```

**Read the journey first.** Every call needs three expected versions, and the endpoint
refuses if any has moved.

```bash
JOURNEY=<uuid>
psql "$DATABASE_URL" -c "SELECT booking_attempt_version, intent_version,
  manual_review_version, booking_status, google_outcome_state, needs_attention_code
  FROM booking_journeys WHERE journey_id='$JOURNEY'"
psql "$DATABASE_URL" -c "SELECT code, generation FROM booking_journey_review_reasons
  WHERE journey_id='$JOURNEY' AND resolved_at IS NULL"
```

```bash
curl -s -X POST "$BASE/api/v1/internal/journeys/$JOURNEY/resolve" \
  -H "Authorization: Bearer $BOOKING_ADMIN_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"resolutionId":"'"$(uuidgen)"'",
       "escalation":"t1","action":"resume",
       "expectedAttemptVersion":1,"expectedIntentVersion":0,"expectedReviewVersion":1,
       "operatorRef":"runbook-2026-07-31"}'
```

Use a **fresh `resolutionId` per distinct operation** and **reuse the same one when
retrying** — a repeat replays the stored result exactly, performing no external call and
no mutation.

### Which action, per escalation

| Escalation | `needs_attention_code` | Actions |
|---|---|---|
| **T1** initial creation unprovable | `google_calendar_unreadable` | `resume` (default) · `adopt` · `absent` |
| **T2** cancellation exhausted | `google_cancel_failed` | `retry_cancel` · `confirm_cancelled` · `abandon_cancel` |
| **T3** reschedule unreadable | `google_unreadable` | `reconcile` (default) · `retry_reschedule` · `abandon_reschedule` |
| **T4** conversion undiscovered | `lead_update_outcome_unknown` | `adopt_identity` · `abandon` |
| **RG7** reschedule event missing | `reschedule_event_missing` | `adopt_at_old_slot` · `adopt_at_new_slot` · `mark_cancelled` |
| **RR1** review-only | `crm_cancellation_followup_required` | `confirm_followup_done` (needs `reasonCode`) |

Per-action inputs: `googleEventId` for every adoption; `zohoContactId` for
`adopt_identity`; `acknowledgeUnlabelledEvent: true` to adopt a host-created event with
no `journeyId` in its private properties; `reasonCode` for RR1.

**Everything is server-verified.** `absent` re-derives G3's proof — a `404` plus a
`writer`/`owner` access probe — rather than trusting your assertion, because a calendar
UI showing "no events" because the credential lost access looks identical to an empty
calendar. `adopt_identity` verifies the Contact's email and **derives** the Account from
it; a supplied `zohoAccountId` may only agree or be refused.

The one exception is `RR1.confirm_followup_done`, where your word *is* the evidence,
because the CRM state it describes is unverifiable precisely while propagation is
disabled. It can close only that one named reason and cannot touch booking state.

### Refusals — what each one means

| Response | Meaning | Do |
|---|---|---|
| `409 version_conflict` | The booking or intent moved. | Re-read, re-issue with a **new** `resolutionId`. |
| `409 review_version_conflict` | A review reason arrived since you read. | Re-read; decide whether the new reason is yours to resolve. |
| `409 resolution_in_progress` | Another request holds the lease. | Wait, then retry the **same** id. |
| `409 resolution_lease_lost` | Your lease was reclaimed mid-verification. **Nothing was mutated.** | Re-read and retry. |
| `409 resolution_request_mismatch` | This id was used for a **different** request. | Use a new id. |
| `409 resolution_stuck` | Retried past `RESOLUTION_MAX_ATTEMPTS`. | Investigate before forcing anything. |
| `409 verification_unavailable` | Google or Zoho could not be read. Nothing changed. | Retry later. During a full outage only `resume`, `retry_cancel` and `retry_reschedule` are available — they assert nothing. |
| `409 absence_unverified` | Absence is not provable. | Do **not** work around it. The slot stays held deliberately. |
| `409 event_still_active` | The event exists. | Use `adopt_at_old_slot` or `retry_cancel`. |
| `409 event_absent` | The event is gone. | Use `confirm_cancelled` or `mark_cancelled`. |
| `409 event_at_new_slot` | It already moved. | Use `reconcile`. |
| `409 slot_mismatch` | The event is at neither expected slot. | Check you supplied the right event. |
| `409 correlation_conflict` / `stale_attempt_event` | The event belongs to another journey or attempt. **Never adopted.** | Find the correct event. |
| `409 event_unlabelled` | No `journeyId` in private properties. | Re-send with `acknowledgeUnlabelledEvent: true` if you are certain. |
| `409 event_already_bound` | Another journey holds it live. | Do not steal it. |
| `409 reason_not_open` / `400 invalid_reason_code` | RR1 target is wrong. | Re-read the open reasons. |
| `409 not_escalated` | The journey is not escalated. | Nothing to do. |
| `400 invalid_action` | Not legal for that escalation. | See the table above. |

### Reading a success response

```json
{ "resolved": true, "escalation": "t1", "action": "resume",
  "resolvedReasons": ["google_calendar_unreadable#0"],
  "remainingOpenReasons": ["identity_ambiguous#0"],
  "attentionCleared": false,
  "verified": { "source": "none" } }
```

**`200` does not mean the journey is clear.** Resolution is per reason, so check
`remainingOpenReasons` and `attentionCleared`. Here the Google problem is resolved and
the journey is bookable again, but an unrelated `identity_ambiguous` keeps the Task open
— that one is fixed by correcting the CRM data, not by this endpoint.

`resolved: false` means the action dispatched into a still-escalated state — only
`RT3.reconcile` finding the event missing does this, which re-escalates as RG7.

### Reasons this endpoint cannot resolve

`identity_ambiguous`, `product_unresolved`, `record_write_failed`,
`meeting_create_outcome_unknown`, `lead_create_outcome_unknown`, `worker_crash_loop` and
the rest are cleared by the CRM work that fixes them. The endpoint moves *booking state*;
a reason it cannot act on is a reason it must not close. Such a Task stays open until a
human resolves the underlying data — retention is unaffected, but the review queue is
not self-draining.

---

## 6. Cancellation-disabled CRM follow-up

`BOOKING_CANCELLATION_ENABLED=false` in Production. Visitor `DELETE` returns
`403 cancellation_disabled` with no Google or Zoho call and no intent recorded.

One cancellation path is still reachable: **`RG7.mark_cancelled`**, because it descends
from a *reschedule*, which is never gated. With the flag off it records the Postgres
cancellation, creates **no** `zoho_cancel_propagate`, and raises an unresolved
`crm_cancellation_followup_required` so the Task cannot close.

Do this by hand in the CRM, then close the reason:

1. Move the Meeting's pipeline state appropriately.
2. **Clear `Deals.Demo_Reminder_Send_At`** — otherwise WF010c still sends "your demo is
   tomorrow" for a cancelled meeting. Nothing clears it automatically today.
3. Clear `Demo_Start_DateTime`.
4. Preserve or rebase the Activation Task per your convention.

```bash
curl -s -X POST "$BASE/api/v1/internal/journeys/$JOURNEY/resolve" \
  -H "Authorization: Bearer $BOOKING_ADMIN_SECRET" -H 'Content-Type: application/json' \
  -d '{"resolutionId":"'"$(uuidgen)"'","escalation":"rr1",
       "action":"confirm_followup_done","reasonCode":"crm_cancellation_followup_required",
       "expectedAttemptVersion":1,"expectedIntentVersion":2,"expectedReviewVersion":3,
       "operatorRef":"crm-followup"}'
```

Enabling visitor cancellation requires the separately approved Deluge correction — a new
`Cancelled by Prospect` picklist value, cancellation handled *ahead of* the MTG-4 guard,
`meeting:cancelled` routing, cleared reminder fields, a preserved Activation Task and
idempotent re-entry. **That is a metadata and Deluge change, out of scope here.**

### The frontend flag must move with the backend flag

The manage page is a static file and cannot read `BOOKING_CANCELLATION_ENABLED`, so it is
gated by a host-page global instead:

```html
<script>window.JURNII_BOOKING_CANCELLATION_ENABLED = true;</script>  <!-- Preview only -->
```

Default (absent) means **hidden**, which is the fail-safe direction: a misconfiguration
hides a button that would only answer `403`, rather than offering one that always fails.
Leave it unset in Production. When the flag is eventually flipped, set **both** — the
server variable and this global, in `manage.html` — or the endpoint will accept
cancellations no visitor can reach.

`JURNII_BOOKING_SUPPORT_EMAIL` mirrors `BOOKING_SUPPORT_EMAIL` the same way, and defaults
to `hello@jurnii.io`.

---

## 6a. Frontend surfaces and how to check them

| Surface | Served from | Check |
|---|---|---|
| Site-wide demo modal | `assets/site.jsx` → `JurniiBooking.render(mount, {onClose})` | Open any page, click "Book a demo": the site's `#demo-modal` chrome with the 3-step form inside it, **one** close button (the site's). |
| Inline placement | auto-mount into `#jurnii-booking-form-inline` | The form paints with no host script. |
| Manage page | the real route `/manage.html?token=…&id=…` | Must render the booking's time, **not** the home page. If it renders the SPA, `dist/manage.html` is missing and every emailed manage link is dead. |
| Widget + config + CSS | `/booking/assets/booking-form.{js,css}`, `/booking/config/countries.js` | `curl -sI $BASE/booking/assets/booking-form.js` → `200`. All three are emitted by `vite.config.js`, which **throws** if a source file is missing. |

A `202 booking_pending` is normal and not an incident: the browser polls
`GET /bookings/{id}/status`, and after three minutes it stops and tells the visitor the
invitation will be emailed — which is true, because Google sent it with `sendUpdates:'all'`
and the manage token was minted before `events.insert`.

---

## 7. Live prerequisite verification

None of these may be assumed, and each is a **prerequisite failure to report** if it
fails — not a licence to change metadata.

| Check | Why |
|---|---|
| A 46-char base32hex caller-supplied id is accepted by `events.insert`, and a duplicate returns `409` | The whole recovery design keys on it. Disposable insert-then-delete. |
| `events.get` on a cancelled deterministic id returns `410`/`404`/`status:'cancelled'`, and the id cannot be reused | Why each attempt needs its own id. |
| `events.list` returns `accessRole`, and reports `writer`/`owner` for the booking calendar | It is the access probe. Also confirm what a downgraded principal reports. |
| Whether `writerWithoutPrivateAccess` can read the booking event **and** its `extendedProperties.private` | Determines whether that role may ever be promoted from unconfirmed. Default is unconfirmed. |
| Tasks module accepts a Task with **neither** `Who_Id` nor `What_Id` | No repo precedent; both Deluge wrappers refuse. |
| The `Owner` shape over REST v6 | Deluge writes a plain string; REST likely needs `{"id":"…"}`. |
| `Subject:equals` Tasks search rediscovers that Task | The unlinked dedup depends on it. |
| Which OAuth scopes those calls need, and whether the current refresh token has them | **No scope inventory exists.** A scope change is a console action for the owner. |
| `DUPLICATE_DATA` payload shape (`details.duplicate_record.id`) | Uncertain creates reuse the returned id. |
| `getRecord('Contacts', id)` returns `Email` and `Account_Name.id` | `RT4.adopt_identity` verifies the email and derives the Account. |
| `Pool` transactions over the pooled `DATABASE_URL`; `pg_advisory_lock` over the unpooled URL | Every transaction and the migration runner depend on them. |
| `INSERT … ON CONFLICT DO NOTHING` + same-transaction re-`SELECT` sees a concurrent commit under PgBouncer | The resolution reservation's serialisation. |
| Per-minute cron availability (Pro/Enterprise) | Hobby is one jittered daily run, which makes the cadence unusable. |
| `btree_gist` on the target instance | Required by the overlap constraint. |
| `Ext_Calendar_Booking_ID` still exists and is **removed from the Tier-2 deletion batch** | It is the Meeting correlation key for everything. |

---

## 8. Credential rotation

| Credential | Rotating it |
|---|---|
| `CRON_SECRET` | Safe. Update the cron configuration. |
| `BOOKING_ADMIN_SECRET` | **Safe** — it keys nothing. Historical resolution replays are unaffected. |
| `RESOLUTION_FINGERPRINT_HMAC_KEY` | Move the old value to `..._PREVIOUS` and its id to `..._PREVIOUS_ID` **in the same change**, so one generation of history stays replayable. Rotating twice without doing so makes older ids un-replayable — a clean `409 resolution_request_mismatch`, never a wrong effect. |
| `BOOKING_CALENDAR_HMAC_KEY` | **Invalidates every stored `canonical_fingerprint`.** Clear the `booking_calendars` row and re-run `register-calendar` in the same window. R2 fails closed with `503 calendar_misconfigured` until they match — safe, but bookings stop until it is done. |
| `JWT_SECRET` | Invalidates every live flow and manage token. Visitors mid-flow restart; emailed manage links break. Avoid outside an incident. |

---

## 9. Rollback and incident handling

### Rollback

Vercel deployment rollback plus additive/reversible migrations. No parallel legacy
implementation is retained. Because the previous production deployment of this backend
was itself non-functional (its serverless dependencies were missing), rollback restores
the prior state without data loss — rows simply stop being written, and additive
migrations leave an older deployment unaffected.

Deploy in a low-traffic window: a flow token minted pre-migration has no row and yields
`404 journey_not_found`; the frontend clears `localStorage` and restarts, bounded by the
2-hour token life.

### Incidents

| Symptom | Read | Action |
|---|---|---|
| Bookings refused `503 calendar_misconfigured` | `booking_calendars` vs the configured pair | Run `register-calendar --verify`. Do **not** force a row. |
| Availability `503` | Postgres reachability | Fails closed deliberately — never serve Google-only slots. |
| Many `google_calendar_unreadable` reasons | The credential's `accessRole` | A revoked scope or downgraded role. Holds are retained and no booking is marked failed; restore access and the ops resume. |
| A journey stuck `booking_pending` | `google_create_recovery` state and `deadline_at` | It resolves itself at the deadline (G3 or T1). Do not intervene early. |
| `worker.crash_loop.review_unavailable` in logs | The §2 terminal-review query | The escalation channel is broken. Investigate the Zoho Tasks path. |
| Two slots withheld on one journey | `booking_slot_reservations` | Expected after G7/T3: neither slot is proven free. Resolve via RG7/RT3. |
| Duplicate CRM record suspected | `create_attempts` on the relevant op | It is capped at 1 and never reset. If a duplicate exists it predates this backend or was created by hand. |

**Never** clear `needs_attention` by hand. It is derived from the reason ledger and the
database rejects a direct write; resolution means resolving reason rows through §5.

Logs carry `journeyId`, status transitions, outcome kinds, error codes and
`resolution_id` only — no name, email, phone, URL or third-party response body.
