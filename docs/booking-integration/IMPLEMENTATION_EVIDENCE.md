# Booking integration — implementation evidence & handoff

Implements the **CRM record-resolution correction** (Contact-first identity + an independent journey
UUID), replacing the earlier "Lead id is the universal correlation key" model. Scope: **`jurnii-io`
code only**. **No Deluge was changed and no live Zoho configuration was altered** — the Contact-path
reconciliation enablement is approval-gated (§4).

See [architecture.md](./architecture.md) for the full design.

## 1. What changed (the correction)

- **Contact-first, strictly sequential identity resolution** (`api/v1/submissions/start.js`): one
  matching Contact is reused and **Leads are not searched at all**; else one unconverted Lead; else a
  Lead is created. No throwaway Lead is ever created when a Contact exists. Page-1 fields are persisted
  to the resolved record with `trigger:[]` (mandatory).
- **Journey UUID (`journeyId`)** replaces the Lead id as the correlation/idempotency key. It is
  **client-generated + persisted before the first request** (deterministic retries), UUID-validated and
  JWT-bound server-side, and stored in the standard `Events.Ext_Calendar_Booking_ID` + Google private
  metadata. The JWT carries `recordType`/`recordId` (`Contact`|`Lead`). **No custom module.**
- **Contact path** (`api/v1/submissions/[id].js`): resolves the Account (reuse-authoritative /
  create-named-after-company / `account_conflict` / `account_ambiguous` Manual Review), updates the
  Contact with `trigger:[]`, then invokes the existing `processContact` automation imperatively; the
  Deal is then resolved from the graph. `Product_Interest` is written additively.
- **Meeting ownership verification**: reused Google/Zoho events must match the token's
  `contactId`/`dealId` → else `409 correlation_conflict` (booking, cancel, reschedule).
- **New/updated utils**: `api/_utils/account.js` (Account resolver), `email.js`
  (`normalizeEmail`/`businessDomain`), `zoho.js` (`getContact`/`updateContact`/`getAccount`, Account
  search+create, `invokeFunction`/`reconcileContact`, unconverted-Lead filter), `products.js`
  (`includeCompany`, `mergeMultiSelect`), `google.js` (journeyId + `readEventPrivate`).
- **Frontend** (`assets/booking-form.js`): generates/persists `journeyId`, sends it in the start body,
  TTL + cleanup, opaque manage flow.

## 2. Offline verification (run in this environment — all green)

- **Module load:** all handlers + utils `require()` without `MODULE_NOT_FOUND`.
- **Frontend syntax:** `node --check assets/booking-form.js` → OK.
- **Tests:** `npm test` → **48/48 pass**, including:
  - *Page-1 (`tests/start.integration.test.js`):* existing Contact → recordType Contact, **no Lead
    search, no Lead created**; reuse unconverted Lead; create Lead (`trigger:[]`); duplicate
    Contacts/Leads → Manual Review; malformed `journeyId` → 400; free email → `EMAIL_NOT_BUSINESS`.
  - *Page-2 (`tests/submissions.integration.test.js`):* Lead path (converts / out-of-list title never
    blocks / unknown country blocks / retry-resume); Contact path (reuse Account + **additive
    Product_Interest** + `processContact` invoked; create Account **named after the company**;
    `account_conflict`; `account_ambiguous`).
  - *Booking (`tests/bookings.integration.test.js`):* retry reuse with no FreeBusy self-conflict;
    **ownership mismatch → `correlation_conflict`** (Google and Zoho); `SLOT_TAKEN`; Google-ok/Zoho-fail
    recovery; pending-Meet does not confirm; durable `manageUrl` (`id=<journeyId>`); cancel/reschedule
    accept the manage token; `NO_SINGLE_DEAL`.
  - *Unit (`tests/booking.test.js`):* canonical product mapping, `mergeMultiSelect`, `validateLeadEnrichment`
    (Lead + Contact `includeCompany:false`), Account resolver (reuse/conflict/create/ambiguous/key),
    `writePayload` trigger contract, `readConversion`, `extractMeetLink`, work-email gate.

## 3. Request/response example

```http
POST /api/v1/submissions/start
{ "journeyId":"<uuid>", "firstName":"Alex","lastName":"Mercer","email":"alex@acme.com","consent":true }
→ 200 { "token":"<jwt recordType/recordId/journeyId>", "journeyId":"<uuid>", "step":1 }

PATCH /api/v1/submissions/<journeyId>     Authorization: Bearer <jwt step:1>
{ "company":"Acme","jobTitle":"Head of Product","productInterest":"Jurnii 360","phone":"+447…","country":"United Kingdom" }
→ 200 { "token":"<jwt step:2>", "step":2, "contactId":"<id>", "dealId":"<id>" }

POST /api/v1/bookings                     Authorization: Bearer <jwt step:2>
{ "slotStart":"2026-08-04T13:00:00.000Z" }
→ 200 { "status":"confirmed","bookingId":"<journeyId>","meetLink":"…","manageUrl":"…","googleEventId":"…","zohoEventId":"…" }
```

## 4. Approval-gated items (REQUIRED before production use)

Not applied in code that alters live config; these need sign-off. Run against a sandbox first.

**Contact-path reconciliation (choose one; §6 of the plan):**
- **Preferred:** publish the existing `processContact` function for **OAuth REST execution** and add the
  `ZohoCRM.functions.execute.READ` scope to the refresh token. Node then invokes
  `POST /crm/v6/functions/processcontact/actions/execute?contact_id=…` (`ZOHO_PROCESS_CONTACT_FN`).
- **Fallback:** add a Contacts **field** `Website_Reconcile_At` (datetime) + a workflow rule (extend
  WF001b0 or a new rule) so an always-changing write fires `processContact`. Do **not** rely on
  `Product_Interest` changing.

**Verify (read-only) pre-flight:** WF001b0's live trigger field set; that `processcontact` can be
REST-executed and the exact scope; `Product_Interest` options on Contacts; that `getContact` returns
`Account_Name`; Accounts `Account_Key`/`Website` searchability.

**Credentials / platform:** Google OAuth "In production" with `calendar.events` + `calendar.events.freebusy`;
all Vercel env vars set (no `ZOHO_SUBMISSION_MODULE`); confirm Vercel **Pro** for `maxDuration:60`.

**Live E2E (post-approval):** new person (Lead path); returning Contact (reuse-Account **and**
new-Account); duplicate Contact/Lead → Manual Review; cancel + reschedule. **Required later-stage-Contact
regression guard:** an existing Contact with an Account, a Product Deal, and an active sequence/Activation
Task must reconcile via direct `processContact` **without regressing `Stage`, overwriting `Contact_Role1`,
or creating duplicate Activation Tasks/Calls/emails**. Clean up all test records.

## 5. Out of scope (tracked separately)
- Wiring `Job_Title_Raw` into the Deluge role mapping (approval-gated Deluge change).
- Structured Zoho Meeting cancellation handling in `handleMeetingEvent`.
- Attribution/UTM Lead fields (inert until the fields exist and `ZOHO_LEAD_FIELD_*` are set).
