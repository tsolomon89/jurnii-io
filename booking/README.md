# Jurnii Booking Module

A self-contained progressive **booking form** (frontend widget) + **serverless backend** that turns a
website visitor into a Zoho CRM record and a Google Calendar / Google Meet booking. Everything the
feature needs lives in this folder so it can be copied into another project.

- **Design & behaviour:** [`docs/architecture.md`](docs/architecture.md)
- **Evidence / handoff:** [`docs/IMPLEMENTATION_EVIDENCE.md`](docs/IMPLEMENTATION_EVIDENCE.md)

## What's in here

```
booking/
  api/                     serverless handlers + shared utils (the backend)
    v1/availability.js
    v1/submissions/{start.js,[id].js}
    v1/bookings/{index.js,[id]/{index.js,reschedule.js}}
    _utils/{email,google,products,zoho}.js
  assets/booking-form.{js,css}   the frontend widget (self-rendering)
  tests/*.test.js          offline test suite (node:test) — 45 tests
  examples/{book.html,manage.html}  minimal host pages
  docs/                    architecture + evidence
  .env.example             every env var (names only)
  package.json             module manifest (deps + `npm test`)
  vercel.snippet.json      functions/headers to merge into the host vercel.json
```

## How it works (one paragraph)

The frontend (`assets/booking-form.js`) renders a 3-step form into `#jurnii-booking-form-inline`,
generates a client **journeyId** (opaque correlation key), and calls the backend under `/api/v1`. Page 1
resolves identity **Contact-first** (existing Contact → reuse; else unconverted Lead → reuse; else create
a Lead). Page 2 enriches: the **Lead path** lets `processLead` convert + build the graph; the **Contact
path** updates the Contact and books only against an **existing** exact Product Deal (else it raises a
standard Contact-only Manual-Review Task). Page 3 books Google Calendar + Meet and a Zoho Meeting
(`Events`) linked to the Contact + exact Deal. The website never duplicates CRM business logic.

## Endpoints (served under `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/submissions/start` | Page 1 — resolve identity, mint the flow token |
| `PATCH` | `/api/v1/submissions/{journeyId}` | Page 2 — enrich + resolve the Product Deal |
| `GET` | `/api/v1/availability` | Slots (Google FreeBusy) |
| `POST` | `/api/v1/bookings` | Page 3 — create Google + Zoho meeting |
| `DELETE` | `/api/v1/bookings/{journeyId}` | Cancel (Bearer / 30-day manage token) |
| `PATCH` | `/api/v1/bookings/{journeyId}/reschedule` | Reschedule |

## How it is wired in this repo

Vercel serves serverless functions **only from the repo-root `/api` directory**, so the root `api/v1/**`
files are 1-line **shims** that re-export from `booking/api/**` (the real handlers). The site pages load
the widget from `booking/assets/booking-form.js`, and `assets/site.css` `@import`s
`../booking/assets/booking-form.css`. `booking/tests` runs via the root `npm test`.

## Copying into another project

1. **Copy** the whole `booking/` folder into the target repo.
2. **API routing (Vercel):** functions must live under the project-root `/api`. Either
   - add root shims — for each endpoint create `api/v1/.../x.js` containing
     `module.exports = require('<relative>/booking/api/v1/.../x.js');` (see this repo's `api/` for the
     exact relative depths), **or**
   - move `booking/api/*` to the project root `/api/*` (then the internal `../../_utils` paths still resolve).
   - On non-Vercel hosts, mount each handler (a `(req, res)` function) at the matching route.
3. **Frontend:** put `<div id="jurnii-booking-form-inline"></div>` on the booking page and load
   `booking/assets/booking-form.js`; include `booking/assets/booking-form.css` (directly, or via a global
   `@import`). See `examples/book.html`.
4. **Manage page:** host a page (e.g. `/manage.html`) with `<div id="jurnii-manage-inline"></div>` that
   loads `booking-form.js` (see `examples/manage.html`), and set `PUBLIC_BASE_URL` so the emailed
   manage link points at it.
5. **Env:** copy `.env.example` → set `JWT_SECRET`, `ZOHO_*`, `GOOGLE_*`, `HOST_TIMEZONE`,
   `PUBLIC_BASE_URL` (no submission-module or reconciliation URL is needed).
6. **Dependencies:** add `googleapis` + `jsonwebtoken` to the host `package.json` (`npm install`).
7. **Vercel config:** merge `vercel.snippet.json` (extended `maxDuration` for the conversion/booking
   functions + `/api/*` security headers) into the host `vercel.json`.

## Test

```
npm test            # from repo root → node --test booking/tests/*.test.js
# or, standalone from this folder:
cd booking && npm test
```

## CRM notes (no Zoho config change required by this module)

- Uses only **standard** modules: Leads, Contacts, Accounts, Deals, Products, Quotes, Tasks, Meetings
  (`Events`). No custom module.
- Manual Review = a Contact-only standard **Task** (mirrors `createManualReview.deluge`): `Who_Id`=Contact,
  no `What_Id`, `$se_module='Contacts'`, `Task_Type='Manual Review'`, idempotent per journey via the
  Contact's Open Tasks related list.
- The one custom **field** the flow writes is `Job_Title_Raw` (on Leads + Contacts). Reconciliation is
  the standard Deluge automation (`processLead` on Lead conversion); the Contact path invokes none.
