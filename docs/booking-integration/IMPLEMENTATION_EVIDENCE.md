# Booking integration — implementation evidence & handoff

Implements the **CRM record-resolution correction** (Contact-first identity + an independent journey
UUID) with the **KISS Contact path**: an existing Contact is updated in place and books only against an
**existing** exact Product Deal; the website never creates an Account/Deal and never invokes
`processContact`. Scope: **`jurnii-io` code only**. **No `zoho-functions`, Deluge, custom-field, or OAuth
change.**

See [architecture.md](./architecture.md) for the full design.

## 1. What the integration does

- **Page 1 — Contact-first identity** (`api/v1/submissions/start.js`): one matching Contact → reuse
  (**Leads are not searched**); else one unconverted Lead → reuse; else create a Lead (`trigger:[]`).
  Page-1 fields are persisted to the resolved record with `trigger:[]` (mandatory).
- **journeyId** — a client-generated, UUID-validated, JWT-bound opaque correlation key. Stored only in
  `Events.Ext_Calendar_Booking_ID` + Google private metadata. **No custom module.**
- **Page 2 — Lead path** (`[id].js` `runLeadPath`): one triggered Lead update → `processLead` converts
  and builds the graph; the Deal is resolved with **bounded backoff** (conversion is async).
- **Page 2 — Contact path** (`runContactPath`): update the Contact with `trigger:[]` (additive
  `Product_Interest`, no `Company`), read the Contact's **existing** `Account_Name`, resolve the exact
  Product Deal in **one** lookup (no backoff). Exact Deal exists → proceed; else → Manual Review Task.
- **Manual Review → Contact-only Task**: `no_product_selected` / `deal_unresolved` / `deal_ambiguous`
  raise (best-effort) a Contact-scoped Task mirroring `createManualReview.deluge` (`Who_Id`=Contact, **no
  `What_Id`**, `$se_module='Contacts'`, `Task_Type='Manual Review'`, `Blocks_Sequence='Yes'`,
  `Task_State='Open'`, `Task_Status='Working'`, `Status='In Progress'`, `trigger:[]`; Description leads
  with `[<reason>]`). Idempotent per journey via the Contact's **Open Tasks** related list
  (`GET /crm/v6/Contacts/{id}/Tasks` — module scope, no Search API).
- **Page 3 — Meeting** (`bookings/index.js`): Event `Who_Id`=Contact, `What_Id`=exact Deal,
  `$se_module='Deals'`, `Ext_Calendar_Booking_ID=journeyId`; reuse is **ownership-verified** (mismatch →
  `409 correlation_conflict`).

## 2. Offline verification (run in this environment — all green)

- **Module load:** all handlers + utils `require()` without `MODULE_NOT_FOUND`.
- **Frontend syntax:** `node --check assets/booking-form.js` → OK.
- **Tests:** `npm test` → **45/45 pass**, including:
  - *Page-1 (`start.integration.test.js`):* existing Contact → recordType Contact, **no Lead search, no
    Lead created**; reuse Lead; create Lead; duplicate Contacts/Leads → Manual Review; malformed
    `journeyId` → 400; free email → `EMAIL_NOT_BUSINESS`.
  - *Page-2 (`submissions.integration.test.js`):* Lead path (converts / out-of-list title never blocks /
    unknown country blocks / retry-resume); **Contact path KISS** — existing Account + exact Deal → 200
    (**single lookup**, additive `Product_Interest`, no create/reconcile); no matching Deal →
    `409 deal_unresolved` **+ Contact-only Task**; **retry reuses the open Task** (no duplicate); no
    Account → `deal_unresolved` + Task; multiple Deals → `deal_ambiguous`; `Not sure yet` →
    `no_product_selected` + Task.
  - *Booking (`bookings.integration.test.js`):* retry reuse (no FreeBusy self-conflict); ownership
    mismatch → `correlation_conflict` (Google + Zoho); `SLOT_TAKEN`; Google-ok/Zoho-fail recovery;
    pending-Meet does not confirm; durable `manageUrl` (`id=<journeyId>`); cancel/reschedule accept the
    manage token; `NO_SINGLE_DEAL`.
  - *Unit (`booking.test.js`):* canonical product mapping, `mergeMultiSelect`, `validateLeadEnrichment`
    (Lead + Contact `includeCompany:false`), `writePayload` trigger contract, `readConversion`,
    `extractMeetLink`, work-email gate.

## 3. Request/response example

```http
POST /api/v1/submissions/start
{ "journeyId":"<uuid>", "firstName":"Alex","lastName":"Mercer","email":"alex@acme.com","consent":true }
→ 200 { "token":"<jwt recordType/recordId/journeyId>", "journeyId":"<uuid>", "step":1 }

PATCH /api/v1/submissions/<journeyId>     Authorization: Bearer <jwt step:1>
{ "company":"Acme","jobTitle":"Head of Product","productInterest":"Jurnii 360","phone":"+447…","country":"United Kingdom" }
→ 200 { "token":"<jwt step:2>", "step":2, "contactId":"<id>", "dealId":"<id>" }
# Contact path with no exact Deal → 409 { code:"MANUAL_REVIEW", reason:"deal_unresolved" } + a Contact-only Task.

POST /api/v1/bookings                     Authorization: Bearer <jwt step:2>
{ "slotStart":"2026-08-04T13:00:00.000Z" }
→ 200 { "status":"confirmed","bookingId":"<journeyId>","meetLink":"…","manageUrl":"…","googleEventId":"…","zohoEventId":"…" }
```

## 4. Pre-deploy items (standing — no Contact-path config needed)

The Contact path needs **no** Deluge, OAuth, or custom-field change. Remaining items are the usual ones:
- Google OAuth "In production" with `calendar.events` **+** `calendar.events.freebusy`; `GOOGLE_CALENDAR_ID` set.
- All Vercel env vars set (no `ZOHO_SUBMISSION_MODULE`, no reconciliation URL); confirm **Pro** for `maxDuration:60`.
- **Live confirm (read-only):** the Contacts→Tasks "Open Tasks" related list is `GET /crm/v6/Contacts/{id}/Tasks`
  (verified), and the standard `Tasks` module accepts the Contact-only payload above (a disposable
  create+delete reconfirms `Task_Type`/`Blocks_Sequence`/`Task_State`/`Task_Status`/`$se_module`).

**Live E2E:** new person (Lead path converts + books); existing Contact **with** an exact open Deal →
books; existing Contact **without** the Deal → Manual-Review Task appears in CRM (idempotent on retry);
cancel + reschedule. Clean up test records.

## 5. Out of scope (tracked separately)
- Wiring `Job_Title_Raw` into the Deluge role mapping (approval-gated Deluge change).
- Structured Zoho Meeting cancellation handling in `handleMeetingEvent`.
- Attribution/UTM Lead fields (inert until the fields exist and `ZOHO_LEAD_FIELD_*` are set).
