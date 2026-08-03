# Jurnii Booking Module

A self-contained progressive **booking form** (frontend widget) + **serverless backend** that turns a
website visitor into a Zoho CRM record and a Google Calendar / Google Meet booking. Everything the
feature needs lives in this folder so it can be copied into another project.

- **As built — deviations, defects, decisions:** [`docs/implementation-notes.md`](docs/implementation-notes.md)
- **Operations:** [`docs/runbook.md`](docs/runbook.md)
- **Design & behaviour:** [`docs/architecture.md`](docs/architecture.md)
- ~~`docs/IMPLEMENTATION_EVIDENCE.md`~~ — **superseded**, kept as the record of the pre-rewrite design

## What's in here

```
booking/
  api/                     serverless handlers (the backend)
    v1/availability.js
    v1/submissions/{start.js,[id].js}
    v1/bookings/{index.js,[id]/{index.js,reschedule.js,status.js}}
    v1/internal/{jobs/{run,retention}.js,journeys/[id]/resolve.js}
    _utils/{email,products}.js
  integrations/{google,zoho}/index.js   the two third-party clients
  db/                      migrations, repository functions, migrate + register-calendar
  workflows/               the durable worker and its 13 operations
  lib/, config/            shared helpers (incl. dispatch.js); countries + slot geometry
  assets/booking-form.{js,css}   THE frontend widget — one implementation, no fork
  tests/*.test.js          offline suite (node:test)
  tests/db/*.test.js       against-PostgreSQL suite (skipped without DATABASE_URL)
  examples/{book.html,manage.html}  minimal host pages
  docs/                    architecture, as-built notes, runbook
  .env.example             every env var (names only)
  package.json             module manifest (deps + `npm test`)
  vercel.snippet.json      functions/headers to merge into the host vercel.json
```

## How it works (one paragraph)

The frontend (`assets/booking-form.js`) renders a 3-step form, generates a client **journeyId** (opaque
correlation key), and calls the backend under `/api/v1`. **Postgres is the authoritative intake record**:
Page 1 and Page 2 each commit before the API returns success and make **zero** Zoho calls, so nothing a
visitor types depends on a third party being reachable. Page 3 books Google Calendar + Meet — the
visitor-facing confirmation boundary — and all Zoho work then runs on a durable, retryable background
path driven from that record: identity resolution **Contact-first**, one suppressed data load, then **at
most one** workflow-enabled Lead update (the single call that starts `processLead`), bounded read-only
conversion discovery, one Zoho Meeting per journey, and Deal linkage only with an explicitly discovered
Contact. An uncertain Google create returns `202 booking_pending` and the browser polls
`GET /bookings/{id}/status`. The website never duplicates CRM business logic and never creates a Contact,
Account, Deal or Quote.

## Endpoints (served under `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/submissions/start` | Page 1 — resolve identity, mint the flow token |
| `PATCH` | `/api/v1/submissions/{journeyId}` | Page 2 — one required Zoho save, then advance |
| `GET` | `/api/v1/availability` | Slots (Google FreeBusy) |
| `POST` | `/api/v1/bookings` | Page 3 — create Google + Zoho meeting |
| `DELETE` | `/api/v1/bookings/{journeyId}` | Cancel — **gated**, `403` unless `BOOKING_CANCELLATION_ENABLED=true` |
| `PATCH` | `/api/v1/bookings/{journeyId}/reschedule` | Reschedule |
| `GET` | `/api/v1/bookings/{journeyId}/status` | Async-confirmation polling; returns `manageUrl` once confirmed |
| `GET/POST` | `/api/v1/internal/jobs/{run,retention}` | Cron worker (`CRON_SECRET`) |
| `POST` | `/api/v1/internal/journeys/{journeyId}/resolve` | Operator resolution (`BOOKING_ADMIN_SECRET`) |

## How it is wired in this repo

Vercel serves serverless functions **only from the repo-root `/api` directory**, so the root `api/v1/**`
files are 1-line **shims** that re-export from `booking/api/**` (the real handlers). `api/package.json`
declares `{"type":"commonjs"}` because the root manifest is `"type":"module"` and the shims are CJS.

`booking/tests` runs via the root `npm test` (offline) and `npm run test:db` (against PostgreSQL,
skipped when `DATABASE_URL` is absent).

### Frontend wiring (as built)

There is **one** booking implementation. The former `assets/booking-form.js` — a 411-line stub with a
Google Calendar iframe that posted to an empty endpoint — is deleted, so the site-wide demo modal now
captures real submissions for the first time.

| Concern | How |
|---|---|
| Widget URL | `/booking/assets/booking-form.js`, mirrored into `dist/booking/` by `vite.config.js`. Identical in dev and prod, unhashed because `assets/site.jsx` injects it by absolute path. |
| Stylesheet | `/booking/assets/booking-form.css`, linked explicitly from `index.html` (nothing `@import`s it) and folded into the hashed SPA bundle. Every selector is `.jurnii-*` scoped, so a global link is safe. |
| Country / phone config | `/booking/config/countries.js`, the **same file** the server requires. The widget fetches it once if the host has not already loaded it. |
| Site modal | `assets/site.jsx` sets `window.JURNII_BOOKING_EMBEDDED = true` **before** injection, then calls `JurniiBooking.render(mount, { onClose })`. The widget therefore paints no close button and opens no modal of its own — the site's `#demo-modal` chrome is unchanged. |
| Inline placements | Auto-mount into `#jurnii-booking-form-inline` (and `#jurnii-booking-aside`), retained and unconditional. |
| Manage page | The **real route** `/manage.html`, a plain file outside the SPA. Vercel resolves the filesystem before applying the `/(.*)` → `/index.html` rewrite, which is what stops the SPA swallowing it. Emailed manage links work. |

Host-page globals, all optional: `JURNII_BOOKING_EMBEDDED`, `JURNII_BOOKING_CANCELLATION_ENABLED`
(default **false** — the cancel button is hidden unless a deployment opts in, mirroring
`BOOKING_CANCELLATION_ENABLED`), `JURNII_BOOKING_SUPPORT_EMAIL`, `JURNII_BOOKING_API_BASE`,
`JURNII_BOOKING_CONFIG_URL`.

## Copying into another project

1. **Copy** the whole `booking/` folder into the target repo.
2. **API routing (Vercel):** functions must live under the project-root `/api`. Either
   - add root shims — for each endpoint create `api/v1/.../x.js` containing
     `module.exports = require('<relative>/booking/api/v1/.../x.js');` (see this repo's `api/` for the
     exact relative depths), **or**
   - move `booking/api/*` to the project root `/api/*` (then the internal `../../_utils` paths still resolve).
   - On non-Vercel hosts, mount each handler (a `(req, res)` function) at the matching route.
3. **Frontend:** put `<div id="jurnii-booking-form-inline"></div>` on the booking page, link
   `booking/assets/booking-form.css`, and load `booking/assets/booking-form.js` — it auto-mounts. Serve
   `booking/config/countries.js` at `/booking/config/countries.js`, or set `JURNII_BOOKING_CONFIG_URL`,
   or load it yourself before the widget. See `examples/book.html`.
   To embed in a modal you already own, call `window.JurniiBooking.render(container, { onClose })` and set
   `window.JURNII_BOOKING_EMBEDDED = true` before the script loads.
4. **Manage page:** host a **real** page at `/manage.html` with `<div id="jurnii-manage-inline"></div>`
   that loads `booking-form.js` (see `examples/manage.html` and this repo's root `manage.html`), and set
   `PUBLIC_BASE_URL` so the emailed manage link points at it. If your host has an SPA catch-all rewrite,
   confirm a real file still wins — otherwise every manage link lands on your home page.
5. **Env:** copy `.env.example` → set `DATABASE_URL` + `DATABASE_URL_UNPOOLED`, `JWT_SECRET`, `ZOHO_*`,
   `GOOGLE_*`, `HOST_TIMEZONE`, `PUBLIC_BASE_URL`, `BOOKING_CALENDAR_KEY` + `BOOKING_CALENDAR_HMAC_KEY`,
   `CRON_SECRET`, `BOOKING_ADMIN_SECRET`, `RESOLUTION_FINGERPRINT_HMAC_KEY(_ID)`.
6. **Migrate + register:** `npm run migrate`, then `npm run register-calendar` per environment. Bookings
   are refused with `503 calendar_misconfigured` until the calendar pair is registered.
7. **Dependencies:** add `@neondatabase/serverless`, `googleapis`, `jsonwebtoken` and `pg` to the host
   `package.json` (`npm install`).
8. **Vercel config:** merge `vercel.snippet.json` (60s `maxDuration` headroom for Zoho token refresh on
   the submissions/booking functions + `/api/*` security headers) into the host `vercel.json`, and add a
   per-minute cron for `/api/v1/internal/jobs/run`. The cron is the **recovery** mechanism; normal
   processing is started by the committed write itself — set `BOOKING_DISPATCH_ENABLED=true` for that,
   which needs `@vercel/functions` (already a dependency) for `waitUntil`. Leaving it unset is safe: the
   cron then does all the work, exactly as before.

## Test

```
npm test            # offline  → node --test "booking/tests/*.test.js"
npm run test:db     # against PostgreSQL; skipped when DATABASE_URL is absent
# or, standalone from this folder:
cd booking && npm test
```

The offline suite includes the frontend tests, which install the widget against a jsdom window — hence
`jsdom` in the root `devDependencies`. It is a dev dependency only and is never served or bundled.

Neither suite touches Zoho — the offline tests stub it and the DB tests assert it is *not* called. Three
scripts cover what they cannot, against a real deployment (`vercel env pull` first, then `node --env-file`):

```
booking/scripts/inspect-journey.js       read-only: is the data there, and where is the chain stuck?
booking/scripts/verify-prerequisites.js  credentials, scopes and field metadata
booking/scripts/e2e-booking.js           a real booking driven to zoho_status=complete
```

`e2e-booking.js` needs `--allow-live-crm-writes` before it will create anything, and it creates records
Deluge will not let it delete. Read §7a of `docs/runbook.md` before pointing it at Production.

## CRM notes

> **Zoho metadata boundary.** This module never creates or alters a Zoho module, field, layout, picklist
> value, workflow, validation rule, blueprint, OAuth scope or connection. A missing dependency is a
> **prerequisite failure to report**, never permission to repair the metadata. The same applies to
> Deluge: nothing here publishes or edits a function.

- Uses only **standard** modules: Leads, Contacts, Accounts, Deals, Products, Quotes, Tasks, Meetings
  (`Events`). No custom module. Node never creates a Contact, Account, Deal or Quote.
- A booking is **never blocked** on the CRM graph. If a selected product has no visible Deal at booking
  time, the Zoho Meeting is created **person-linked** (Contact or Lead, no `What_Id`) and confirms; it is
  then **retro-linked** once the final Contact is explicitly discovered — Contact and Deal applied
  together in one triggers-enabled PUT, never `What_Id` over a Lead `Who_Id`.
- The one custom **field** the flow writes is `Job_Title_Raw` (on Leads + Contacts) — never the governed
  `Job_Title` picklist. Reconciliation is the standard Deluge automation (`processLead` on Lead
  conversion); the website invokes none and reimplements none.
- `Ext_Calendar_Booking_ID` is the Meeting correlation key and **must be removed from the Tier-2 field
  deletion batch** before cutover (§13 of the plan).

## Operations

- `docs/runbook.md` — worker execution, stuck-journey queries, retention, calendar registration, the
  operator-resolution action table and every refusal code.
- `docs/implementation-notes.md` — the as-built record: deviations, defects found, and their named
  regression tests.
- `docs/architecture.md` — design; read its "As built" section first where the two disagree.
