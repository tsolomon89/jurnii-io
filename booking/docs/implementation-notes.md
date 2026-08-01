# Implementation notes

> ## Zoho metadata boundary — global
>
> No part of this backend creates or alters a Zoho **module, field, layout, picklist
> value, workflow, validation rule, blueprint, OAuth scope or connection**, and none may
> be added. This is enforced by omission and by test: the integration surface has no such
> function, and `tests/integrations.test.js` asserts each name is `undefined` while
> `tests/db/worker.test.js` asserts no `workflows/` module even references one.
>
> **A missing dependency is a prerequisite failure to report, not permission to repair
> metadata.** If `Job_Title_Raw` is absent, if `Lead_Source` lacks `Website`, if the
> Tasks module refuses a record with neither `Who_Id` nor `What_Id`, or if the refresh
> token lacks a scope — the correct response is to report it and stop, never to create
> the field, add the value or widen the grant. The same holds for Deluge: nothing here
> publishes or edits a function, and `processLead` / `processContact` / `processDeal`
> remain the sole owners of the commercial graph.

## Implementation status

| Layer | State |
|---|---|
| Phase 0 deployability | **Done** — root deps, `api/package.json` CJS scope, `vercel.json` merged |
| `lib/`, `config/` | **Done** |
| `db/` schema, migration, `register-calendar` | **Done**, applied and verified on local PostgreSQL 17.10 |
| `db/queries/` — R1–R4, G1–G7, T1–T4, Z1–Z11, intents, resolutions, bindings, retention | **Done** |
| `integrations/google`, `integrations/zoho` | **Done**; `api/_utils/{google,zoho}.js` deleted |
| Six API handlers + the new status endpoint | **Done** |
| `workflows/` — all 13 worker operations | **Done** |
| Internal job endpoints + operator endpoint (15 actions) | **Done** |
| Frontend consolidation | **Done** — one implementation, `manage.html` served, legacy stub deleted |
| Runbook and documentation | **Done** (this file, `runbook.md`, `README.md`, `architecture.md`, `.env.example`) |

**Tests: 160 passing, 0 failing** — 85 offline (49 of them frontend), 75 against
PostgreSQL. The production build (`npm run build`) succeeds and emits every referenced
asset.

Implementation is complete. What remains is **Preview provisioning and live prerequisite
verification** (§12), which is separately gated, plus the two standing gates: no Deluge is
published, and Production is neither migrated nor cut over.

Deviations from the approved implementation plan (Revision 16), and the local
development setup. Every entry here is a **correction required by actual
PostgreSQL behaviour**, confirmed empirically before the change was made — not an
architectural change. Each was reported and approved before being applied.

---

## Approved deviation 1 — reservation geometry is trigger-derived, not generated

**Plan §4.3** specifies `slot_hold` and `hold_end_utc` on
`booking_slot_reservations` as generated columns:

```sql
slot_hold    tstzrange GENERATED ALWAYS AS
               (tstzrange(slot_start_utc - interval '15 min',
                          slot_start_utc + interval '45 min', '[)')) STORED,
hold_end_utc timestamptz GENERATED ALWAYS AS
               (slot_start_utc + interval '45 min') STORED,
```

**PostgreSQL rejects this** with `ERROR: generation expression is not immutable`.
A generated column requires an IMMUTABLE expression, and `timestamptz + interval`
(`timestamptz_pl_interval`) is **STABLE**: interval arithmetic with day or month
units depends on the session `TimeZone`, and volatility is a property of the
function, not of the particular value passed to it. The obvious workaround is no
better — `date_part('epoch', timestamptz)` is STABLE as well, so the epoch
round-trip `to_timestamp(extract(epoch from t) + 2700)` fails identically.

Verified against PostgreSQL 17.10 (the same major version as the target Neon
instance) before changing anything:

| Expression | Result |
|---|---|
| `generated always as (t + interval '45 min') stored` | `ERROR: generation expression is not immutable` |
| `generated always as (to_timestamp(extract(epoch from t) + 2700)) stored` | `ERROR: generation expression is not immutable` |
| `check (extract(epoch from t)::bigint % 1800 = 0)` | accepted — the grid CHECK is unaffected |
| plain columns + `BEFORE INSERT OR UPDATE` trigger | accepted |

**The fix.** `slot_end_utc`, `slot_hold` and `hold_end_utc` are plain `NOT NULL`
columns maintained by the `bsr_derive()` trigger, which fires `BEFORE INSERT OR
UPDATE` and assigns all three **unconditionally** from `slot_start_utc`. Any value
the application supplies for them is overwritten — never merged, never trusted —
so they behave exactly as `GENERATED ALWAYS` would have.

Every property the design depends on is preserved:

- the columns remain **derived**, so the application cannot write an inconsistent hold;
- `slot_start_utc` remains the single authoritative input;
- the `bsr_no_cross_journey_overlap` EXCLUDE constraint still indexes `slot_hold` directly;
- the buffered window remains exactly the availability conflict predicate,
  `[a−15, a+45) && [b−15, b+45)  ⟺  |a−b| < 60 min`.

The trigger fires before constraint evaluation, so `NOT NULL` and the EXCLUDE both
see the derived values.

**Verified behaviour** (against the real server, not a double): a confirmed 13:00
hold blocks a *different* journey at 12:30 and 13:30 but permits 14:00, while the
*same* journey holds its confirmed 13:00 and a pending 13:30 simultaneously — the
reschedule case, plan test #19. A 13:07 start is rejected by `bsr_grid_aligned`.

---

## Approved deviation 2 — replacing an event binding needs two ordered statements

**Plan §4.10** describes `RG7.adopt_at_old_slot` / `adopt_at_new_slot` as closing
the previous live binding and inserting the replacement, without specifying the
statement structure.

**It must be two ordered statements inside one transaction**, in this order:

1. `UPDATE booking_journey_event_bindings SET unbound_at, unbound_reason WHERE journey_id = $1 AND unbound_at IS NULL`
2. `INSERT INTO booking_journey_event_bindings (...) VALUES (...)`

A single statement that does both — an `INSERT` with a data-modifying CTE that
closes the old row — violates `bjeb_one_live_per_journey`, because a unique index
is checked per statement and both rows are live within that statement's view.

Verified against PostgreSQL 17.10:

| Form | Result |
|---|---|
| single statement, CTE closes old + inserts new | `ERROR: duplicate key value violates unique constraint "bjeb_one_live_per_journey"` |
| two statements, **close then insert** | succeeds — one live binding, full history retained |
| two statements, **insert then close** | `ERROR: duplicate key value violates unique constraint "bjeb_one_live_per_journey"` |

This is the **same load-bearing ordering the plan already documents for G5**
against `bsr_one_confirmed`: a partial unique index cannot be deferred, so the
release must precede the promotion. `bindEvent()` in `db/queries/bindings.js`
enforces it in one place, and the tests pin **both** directions — the correct order
succeeding and the reverse order violating the constraint — so a future
refactor that collapses them back into one statement fails loudly.

---

## Defects caught during implementation (not deviations)

These are bugs in code I wrote, found by running against a real server. Recorded
because each one was silent — the code ran without error and did the wrong thing.

### The busy predicate returned NULL, not false

`retention.js`'s busy predicate compared a **nullable** column:

```sql
OR j.google_outcome_state IN ('creating','updating','cancelling','unknown')
```

A brand-new journey has `google_outcome_state` NULL, so that operand is NULL, and
under SQL three-valued logic `false OR NULL` is **NULL**, not false. `NOT NULL` is
also NULL, so `WHERE NOT busy` excluded the row from every scrub sweep: **no journey
with a null outcome state would ever have been scrubbed.** A retention policy that
silently retains everything is worse than no retention policy, because it reports
success.

Fixed by COALESCEing every nullable comparison and wrapping the whole expression in
`COALESCE(..., false)`. The plan's §9 SQL carries the same latent hole and should be
read with this correction. Pinned by the `REGRESSION: the busy predicate returns
false, never NULL` test.

### `addReviewReason` cannot be a single data-modifying CTE

The plan writes it as one statement whose CTE inserts the reason row while the outer
`UPDATE` touches the journey. A data-modifying CTE's `INSERT` is **not visible** to
another part of the same statement, so `bj_guard` would not see the new reason row
and would reject the journey update with `invariant_attention_without_reason`.

It is therefore ordered statements: lock the newest occurrence, advance the review
clock, insert the occurrence row, then `refreshAttention`. This is also why every
escalation transaction adds its reason **before** its status update — invariant T-a′
requires an open reason to exist by the time `google_outcome_state='unresolved'`
lands.

### `parkOp` destroyed the at-most-once latch

`recordOutcome('parked_precondition')` called `parkOp`, which wrote `state = 'parked'`
unconditionally. `parked` is **precisely the state `ensureOp` re-arms**, so parking an
op latched at `outcome_unknown` handed a revivable row to any later `ensureOp`.

The concrete path: `zoho_lead_terminal_update` sends, the response is lost, Z6 latches
the op at `outcome_unknown`. The op is then claimed again, the handler correctly refuses
to resend and returns `parked_precondition` — and that refusal **overwrote the latch**
with `parked`. A subsequent `ensureOp` would then re-arm it and send a second
workflow-enabled Lead update, running `processLead` twice and corrupting the commercial
graph. This is the exact failure the whole at-most-once design exists to prevent, and
the mechanism the plan explicitly warns about, reintroduced through the outcome path
rather than the escalation path.

`parkOp` now only writes `parked` from `PARKABLE_STATES` (`pending`, `parked`,
`watching`, `done`) and otherwise leaves the state untouched, while still clearing
`next_retry_at` so the op genuinely stops polling. Pinned by *"the workflow-enabled Lead
update is sent at most once and NEVER resent after an uncertain outcome"*, which drives
the op a second time and asserts both that no second send occurs and that the state is
still `outcome_unknown`.

### `recordOutcome` failed on a null `Retry-After`

`next_retry_at = CASE WHEN $6 IS NOT NULL THEN … make_interval(secs => $6) …` gave
Postgres nothing to infer the parameter type from when the value was NULL — the common
case, since most failures carry no `Retry-After`. Every such call failed with
`could not determine data type of parameter $6`, meaning **no outcome was recorded at
all**: the lease stayed live, the op looked crashed, and the crash counter climbed
toward termination. Fixed with an explicit `$6::double precision` cast.

### `bj_guard` stamps `updated_at`, so tests cannot age a row by updating it

Not a defect, but it silently broke a test: the guard sets `NEW.updated_at := now()`
on every update, which is correct — `updated_at` is the retention lifecycle clock and
a real modification is genuine activity — but it means a plain `UPDATE ... SET
updated_at = now() - interval` has no effect. The retention tests use
`SET LOCAL session_replication_role = 'replica'` to suppress user triggers for that
one transaction rather than weakening the schema for testability.

---

## Integration layer

`api/_utils/{google,zoho}.js` are **deleted**. `integrations/{google,zoho}/index.js` are
the only clients, and the handler rewrite, the deletion and the replacement of the
superseded test suites happened as one change — no compatibility wrapper, no duplicate
implementation, and no `require.cache` mock left pointing at a removed path.

Controls enforced structurally in the new layer, rather than by convention:

| Control | How |
|---|---|
| Persisted calendar identity | Every Google function takes an explicit `calendarId`. There is no environment fallback and no `'primary'` default — `requireCalendarId` throws on an alias or a value lacking `@`, before any network call. The old `calendarId()` helper returned `process.env.GOOGLE_CALENDAR_ID \|\| 'primary'`. |
| `listEventByJourneyId` deleted | Absent from the module, not merely unexported. A test asserts `events.list` has **exactly one** call site and that it sits inside `probeEventAccess`. |
| The `404` rule | `readEvent` returns a discriminated outcome (`present` / `cancelled` / `gone` / `not_found` / `unreadable`) instead of throwing, so no caller can collapse "absent" and "unreadable" into one `catch`. `qualifyNotFound` converts a `404` to a verdict only via the probe. |
| `writerWithoutPrivateAccess` | Unconfirmed by default, alongside `reader`, `freeBusyReader`, `none` and a missing role. A **failed** probe is also unconfirmed. |
| Uncertain creates | `insertEvent` distinguishes `duplicate` (409 — a positive existence hint, never the authority) from `uncertain` (transient) and `rejected` (definite 4xx). |
| No Node-side commercial graph | There is no `createContact`, `createAccount`, `createDeal` or `createQuote` function to call, and none that creates a field, picklist value, workflow or OAuth scope. A test asserts each name is `undefined`. |
| Contact + Deal linked together | `buildMeetingPayload` sets `What_Id` and `$se_module` **only** when a Contact id is also present. A Lead person with a known Deal is person-linked. |
| Suppressed vs workflow-enabled | `createLeadSuppressed` / `updateLeadSuppressed` / `updateContactSuppressed` all send `trigger: []`. `updateLeadWorkflowEnabled` omits `trigger` and has no internal retry — at-most-once is the caller's latch. |
| Transport | Per-request socket timeout (`ZOHO_REQUEST_TIMEOUT_MS`, default 12s) and `Retry-After` parsing in both seconds and HTTP-date form. Neither existed before. |

One small seam added for testability: `resolveProductDeal(accountId, product, { fetchDeals })`.
Reassigning the module export does not intercept the call, because it resolves the
module-local binding — so the injection point is explicit rather than implied.

---

## Frontend consolidation (as built)

`assets/booking-form.js` — 411 lines, a Google Calendar iframe posting to an empty
endpoint — is **deleted**. `booking/assets/booking-form.js` is the only implementation,
and it is what the site-wide demo modal now renders, so that modal captures a real
submission for the first time. `tests/frontend.test.js` asserts the deleted path appears
in no executable or served file, with the matcher itself sanity-checked so a
never-matching regex cannot pass silently.

### Deployment shape

| Concern | Decision | Why |
|---|---|---|
| Widget URL | `/booking/assets/booking-form.js`, mirrored to `dist/booking/` | Identical in dev and prod — in dev Vite serves it from the source tree at the same path. It must be **unhashed** because `site.jsx` injects it by absolute path, and a classic script because it assigns `window.JurniiBooking`. |
| Stylesheet | linked from `index.html` as `/booking/assets/booking-form.css`, and mirrored for `manage.html` | Nothing `@import`s it, so it must be linked. Vite folds the linked copy into the hashed SPA bundle; a test asserts `.jurnii-booking-container` really arrives there, not just that the `<link>` exists. Every selector is `.jurnii-*` scoped, so a global link cannot restyle the site. |
| Country config | fetched from `/booking/config/countries.js` when absent | The **same file** the server requires, so client and server cannot disagree about `phone_e164`. Concatenating it into the widget was rejected: it would have made dev and prod different code paths. |
| `manage.html` | a real file at the repo root, copied to `dist/manage.html` | Vercel resolves the filesystem **before** rewrites, so a real file wins over `/(.*)` → `/index.html`. This is what makes emailed manage links work. Proof it holds today: `/assets/site.css` is served rather than rewritten. |
| Missing source file | `vite.config.js` **throws** | A missing widget or `manage.html` is a 404 on the live booking path, not a cosmetic gap, so it fails the build instead of shipping. |

`site.jsx` sets `window.JURNII_BOOKING_EMBEDDED = true` **before** appending the script,
and a test asserts that ordering. It matters: the widget's bootstrap reads the flag as it
loads, and if it read `false` it would wire its own `.open-booking-modal-btn` interception
alongside the site's, so one CTA click could open two modals.

### Defects found and fixed in the frontend

| # | Defect | Fix |
|---|---|---|
| 1 | **`site.jsx` loaded the widget by a relative path** (`assets/booking-form.js`), which resolved against the current route — so it 404'd on every nested page (`/products/…`, `/use-cases/…`) and the modal stayed empty. | Absolute `/booking/assets/booking-form.js`, plus an `error` handler that shows a contact line instead of an empty dialog. |
| 2 | **`Not sure yet` would have been rejected with `400`.** `canonicalProduct('Not sure yet')` returns `null` by design, and `PATCH /submissions/{id}` refuses a supplied-but-non-canonical product — so a visible, valid option 400'd the save. | The option stays; the field is **omitted** when the value means "no product". `productForSubmit` + a named test. **No backend change.** |
| 3 | **Date bucketing was wrong in two independent ways.** `todayStr` came from `toISOString()` on a *local* midnight, and slots were matched with `slot.start.startsWith(localYmd)` against a **UTC** ISO string. Evening slots were filed under the wrong day for every visitor west of UTC, and "today" could be off by one. | One explicit zone: `localDateKey` from local getters, `fromLocalDateKey` parsing back to **local** midnight (`new Date('YYYY-MM-DD')` is UTC), and bucketing by the slot's own local day — the day its own label reads. The value submitted is the server's ISO string verbatim, so display and submission cannot disagree. |
| 4 | **All widget state was module-level** (`state`, `currentStep`, `availableSlots`) and queried with `document.getElementById`, so two mounts on one page — the modal plus an inline placement — would have fought over the same fields. | Per-instance state, container-scoped `[data-role]` / `[data-field]` queries throughout, and re-rendering a container destroys the previous instance instead of stacking listeners. |
| 5 | **The confirmation panel shipped placeholders as fact** — `Status: Confirmed`, `REG_XXXXXXXXX`, `July 15, 2026 at 2:00 PM CET`. | Every value comes from the response. A test asserts each ghost string is absent from the markup. |

### Deliberate choices worth knowing

- **Server message strings are never rendered.** All visitor copy is authored in the
  widget's `COPY` map and selected by machine `code`, so a reason code, CRM id, calendar
  id or third-party fragment cannot reach the page even if a future handler starts echoing
  one. A test feeds a deliberately hostile `409` payload and asserts nothing leaks.
- **`meetLink` and `manageUrl` are `http(s)`-validated before going in an `href`.**
  A `javascript:` value degrades to "Invitation sent via email" and a hidden row.
- **Cancellation is hidden unless a deployment opts in** via
  `window.JURNII_BOOKING_CANCELLATION_ENABLED === true`. A static page cannot read
  `BOOKING_CANCELLATION_ENABLED`, and this is the fail-safe direction: a
  misconfiguration hides a button that would only ever answer `403`, rather than
  offering one that always fails. `manageActions` is a pure function so every
  combination is asserted directly.
- **`409 journey_conflict` and `409 wrong_step` on Page 1 mint a fresh journey and retry
  exactly once.** The visitor caused neither and sees neither. Bounded: a second
  conflict surfaces rather than looping.
- **A `202` poll gives up after 3 minutes** with "your invitation will be emailed to you
  as soon as it is confirmed" — not an error. The invite is already sent by then
  (`sendUpdates:'all'`), and the manage token was minted before `events.insert`.
- **The localhost-only JSON debug panel is gone.** It dumped the whole state object —
  email, phone, company — into the DOM, which sits badly beside the PII discipline
  everywhere else, and nothing user-facing depended on it. Its CSS rules remain unused
  in `booking-form.css`.
- **The calendar still preselects no day.** Auto-selecting the first available day would
  be a behaviour change, and "no visual redesign" was a boundary.
- **`jsdom` was added to the root `devDependencies`** so the widget's real render, mount
  and poll paths are tested rather than approximated. Dev-only: never bundled, never
  served.

---

## Local development

The booking backend has its own dedicated PostgreSQL instance. It deliberately
does **not** share a database with any other project: an earlier inspection found
the Neon connection in `.vercel/.env.development.local` belongs to an unrelated
CRM/simulation project with 72 tables and its own `schema_migrations`. Nothing was
ever written to it, and it is not to be used.

```bash
docker run -d --name jurnii-booking-pg \
  -e POSTGRES_PASSWORD=booking -e POSTGRES_USER=booking -e POSTGRES_DB=jurnii_booking \
  -p 5433:5432 postgres:17-alpine
```

Port **5433**, not 55432: on this Windows host 55432 falls inside a reserved
exclusion range (55343–55442, per `netsh interface ipv4 show excludedportrange`)
and the bind is refused.

Configuration lives in `booking/.env.local`, which is ignored by `.gitignore`
(`.env*.local`) and must never be committed. Local values are independent of every
other environment:

| Variable | Local value | Kind |
|---|---|---|
| `BOOKING_CALENDAR_KEY` | `jurnii_local` | stable identifier, **not** a secret |
| `RESOLUTION_FINGERPRINT_HMAC_KEY_ID` | `local-v1` | stable identifier, **not** a secret |
| `BOOKING_CALENDAR_HMAC_KEY` | generated, 32 bytes | secret |
| `BOOKING_ADMIN_SECRET` | generated, 32 bytes | secret |
| `RESOLUTION_FINGERPRINT_HMAC_KEY` | generated, 32 bytes | secret |
| `CRON_SECRET` | generated, 32 bytes | secret |

The four secrets are independently generated and are **not** reused across
environments. Preview and Production values are provisioned separately by the
project owner; Preview will use `jurnii_preview` / `preview-v1`, Production
`jurnii_prod` / `production-v1`.

```bash
cd booking
npm run migrate            # apply pending migrations
npm run register-calendar   # register this environment's calendar pair
npm test                    # offline suite
npm run test:db             # against-Postgres suite (skips without DATABASE_URL)
```

---

## Still outstanding

Implementation is complete. These are required before Preview deployment and are
separately gated:

- **A dedicated Neon Preview project** for the booking backend, with its pooled
  `DATABASE_URL` and unpooled `DATABASE_URL_UNPOOLED`. Vercel functions cannot
  reach localhost, so Preview E2E needs it. It is also the only way to verify the
  two Neon-specific assumptions a local server cannot cover: `Pool` transactions
  over the pooled URL, and the `ON CONFLICT DO NOTHING` reservation race under
  PgBouncer (plan test #113).
- **The plan §12 live verifications** against Google and Zoho — caller-supplied
  event IDs, `events.get` on a cancelled deterministic ID, `accessRole` under the
  booking credential, the Tasks module accepting a Task with neither `Who_Id` nor
  `What_Id`, the `Owner` shape over REST v6, and the current refresh token's
  granted scopes. None of these may be assumed; code that depends on them is
  written and unit-tested against mocks, and is not run against live services.
- **Production remains un-provisioned and un-migrated**, no Deluge is published,
  and no Zoho metadata is created or modified.
