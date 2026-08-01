# Booking integration — implementation evidence & handoff

> ## ⛔ SUPERSEDED — historical record only
>
> This file documents the **pre-rewrite synchronous implementation** and is kept only as the
> record of what was replaced. Nearly every specific claim below is now false: Page 1 and
> Page 2 make **zero** Zoho calls, Page 3 makes zero Zoho calls, `409 MANUAL_REVIEW` is
> gone, the test files it names are deleted, and the frontend it describes
> (`assets/booking-form.js`) no longer exists.
>
> Current documents, in reading order:
>
> | For | Read |
> |---|---|
> | What is built, and how it deviates from the plan | [`implementation-notes.md`](./implementation-notes.md) |
> | Operating it | [`runbook.md`](./runbook.md) |
> | Design | [`architecture.md`](./architecture.md) — its "As built" section wins where the older prose disagrees |
> | Wiring and portability | [`../README.md`](../README.md) |
>
> Do not cite anything below as current behaviour.

Implements the **KISS booking flow**: Page 2 performs one required Zoho save and advances to the calendar
immediately (no conversion/Deal polling, no Manual-Review gate); Page 3 books Google Calendar + Meet and
takes **one** CRM snapshot, linking the Zoho Meeting to the resolved person and — only if it already
exists — the exact Product Deal. The website never creates an Account/Deal/Quote and never invokes
`processLead`/`processContact` directly. Scope: **`jurnii-io` code only**. **No `zoho-functions`, Deluge,
custom-field, or OAuth change.**

See [architecture.md](./architecture.md) for the full design.

## 1. What the integration does

- **Page 1 — Contact-first identity** (`api/v1/submissions/start.js`): one matching Contact → reuse
  (**Leads are not searched**); else one unconverted Lead → reuse; else create a Lead (`trigger:[]`).
  Page-1 fields are persisted to the resolved record with `trigger:[]` (mandatory).
- **journeyId** — a client-generated, UUID-validated, JWT-bound opaque correlation key. Stored only in
  `Events.Ext_Calendar_Booking_ID` + Google private metadata. **No custom module.**
- **Page 2 — one required save** (`[id].js`): **Lead path** — one triggered Lead update *starts*
  `processLead` (async; not awaited); retry-safe via `readConversion` (already-converted → no second
  update; disappeared Lead → one email-recovery lookup, no sleep). **Contact path** — update the Contact
  with `trigger:[]` (additive `Product_Interest`, no `Company`); no Account/Deal read. A failed save stays
  an error (invalid → `400`, rejected write → retryable `502`). The step-2 token carries
  `journeyId/recordType/recordId/email/product?/step/purpose` — **no** contactId/accountId/dealId.
- **Page 3 — Meeting** (`bookings/index.js`): create/reuse the Google event + Meet **first**, then **one**
  bounded CRM snapshot (no poll) — resolve the person (Contact via `getContact`/conversion, else the Lead)
  and the exact Product Deal **iff** it already exists. Event `Who_Id`=person; `What_Id`=Deal +
  `$se_module='Deals'` **only when a Deal was resolved**, else person-linked; `Ext_Calendar_Booking_ID=journeyId`.
  A Zoho read failure is a retryable `502` (the Google event persists for retry). Ownership: Google by
  `journeyId`+normalized email, Zoho by `Ext_Calendar_Booking_ID`; `purpose:'flow'` required (mismatch →
  `403`; reuse mismatch → `409 correlation_conflict`).

## 2. Offline verification (run in this environment — all green)

- **Module load:** all handlers + utils `require()` without `MODULE_NOT_FOUND`.
- **Frontend syntax:** `node --check assets/booking-form.js` → OK.
- **Tests:** `npm test` → **49/49 pass**, including:
  - *Page-1 (`start.integration.test.js`):* existing Contact → recordType Contact, **no Lead search, no
    Lead created**; reuse Lead; create Lead; duplicate Contacts/Leads → Manual Review; malformed
    `journeyId` → 400; free email → `EMAIL_NOT_BUSINESS`.
  - *Page-2 (`submissions.integration.test.js`):* one enrichment update then advance **without waiting for
    conversion** (single read, no Deal, step-2 token has `product` and no `dealId`); out-of-list title
    never blocks; unrecognized country → `400 validation`; retry after conversion → **no second update**;
    disappeared Lead → **one** email-recovery → advance; neither establishable → retryable `502`; a failed
    Zoho write stays an error (no advance); Contact path advances with additive `Product_Interest` +
    `trigger:[]`; no-product and no-Account still advance.
  - *Booking (`bookings.integration.test.js`):* Google-first retry reuse (no FreeBusy self-conflict);
    ownership by journeyId+email (Google) and `Ext_Calendar_Booking_ID` (Zoho) → `correlation_conflict`;
    `SLOT_TAKEN`; Google-ok/Zoho-fail recovery; pending-Meet does not confirm; durable `manageUrl`
    (`id=<journeyId>`, manage token carries email, no dealId); **Deal resolved → Contact-and-Deal-linked
    Event**; **no Deal → person-linked Event still confirms**; **unconverted Lead → `Who_Id`=Lead**;
    cancel/reschedule accept the manage token; **purpose enforcement** (flow↔manage rejected).
  - *Unit (`booking.test.js`):* canonical product mapping, `mergeMultiSelect`, `validateLeadEnrichment`
    (Lead + Contact `includeCompany:false`), `writePayload` trigger contract, `readConversion`,
    `extractMeetLink`, work-email gate.

## 3. Request/response example

```http
POST /api/v1/submissions/start
{ "journeyId":"<uuid>", "firstName":"Alex","lastName":"Mercer","email":"alex@acme.com","consent":true }
→ 200 { "token":"<jwt recordType/recordId/journeyId>", "journeyId":"<uuid>", "step":1 }

PATCH /api/v1/submissions/<journeyId>     Authorization: Bearer <jwt step:1, purpose:flow>
{ "company":"Acme","jobTitle":"Head of Product","productInterest":"Jurnii 360","phone":"+447…","country":"United Kingdom" }
→ 200 { "token":"<jwt step:2 (journeyId/recordType/recordId/email/product)>", "step":2 }
# A failed save stays an error: invalid field → 400 validation; rejected Zoho write → 502 (retryable). No Deal gate.

POST /api/v1/bookings                     Authorization: Bearer <jwt step:2>
{ "slotStart":"2026-08-04T13:00:00.000Z" }
→ 200 { "status":"confirmed","bookingId":"<journeyId>","meetLink":"…","manageUrl":"…","googleEventId":"…","zohoEventId":"…" }
```

## 4. Pre-deploy items (standing — no Contact-path config needed)

The flow needs **no** Deluge, OAuth, or custom-field change. Remaining items are the usual ones:
- Google OAuth "In production" with `calendar.events` **+** `calendar.events.freebusy`; `GOOGLE_CALENDAR_ID` set.
- All Vercel env vars set (no `ZOHO_SUBMISSION_MODULE`, no reconciliation URL); confirm **Pro** for `maxDuration:60`.
- **Live confirm (read-only):** the standard `Events` module accepts the person-linked payload (`Who_Id`
  = Contact or Lead, no `What_Id`) as well as the Deal-linked payload (`What_Id` + `$se_module='Deals'`).

**Live E2E:** new person (Lead path — one save, the calendar opens immediately, books; conversion/Deal
happen after the fact); existing Contact with a resolvable Deal → **Deal-linked** meeting; product
selected but Deal not yet visible, or no product → **person-linked** meeting that still confirms; cancel +
reschedule. Clean up test records.

## 5. Out of scope (tracked separately)
- **Async Deal reconciliation:** a Zoho-side workflow to retro-link a person-linked demo Meeting to its
  Product Deal once conversion completes (see the Known limitation in architecture.md). Until it exists, a
  booking made before its Deal is visible stays person-linked and does not advance the pipeline.
- Wiring `Job_Title_Raw` into the Deluge role mapping (approval-gated Deluge change).
- Structured Zoho Meeting cancellation handling in `handleMeetingEvent`.
- Attribution/UTM Lead fields (inert until the fields exist and `ZOHO_LEAD_FIELD_*` are set).
