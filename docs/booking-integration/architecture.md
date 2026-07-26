# Jurnii Booking Integration Architecture

This document describes the **implemented** design, API contracts, and sync logic for the
Jurnii website booking form's integration with Zoho CRM and Google Calendar.

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

    %% Page 2 — enrichment + reconciliation
    Visitor->>Frontend: Company, title, product, phone, country
    Frontend->>API: PATCH /api/v1/submissions/{journeyId} (Bearer)
    alt recordType = Lead
        Note over API: ONE Lead update, triggers ENABLED → processLead converts
        API->>Zoho: update Lead
        Zoho->>WF: processLead → Account/Contact/Deal/Quote/Roles
    else recordType = Contact
        Note over API: resolve Account (reuse/create/ManualReview) → update Contact (trigger:[])<br/>→ invoke processContact(contact_id)
        API->>Zoho: update Contact + execute processContact
        Zoho->>WF: processContact → Account/Deal/Quote/Roles
    end
    Note over API: bounded backoff → resolve the exact single Product Deal
    API-->>Frontend: { token, step:2, contactId, dealId }  (or 409 MANUAL_REVIEW)

    %% Page 3 — booking
    Frontend->>API: GET /api/v1/availability
    Frontend->>API: POST /api/v1/bookings (Bearer)
    Note over API: reuse-or-create Google event + Meet (ownership-verified by journeyId+contact+deal)
    API->>Google: events.insert (Meet, sendUpdates:all, private journeyId/contactId/dealId)
    Note over API: reuse-or-create Zoho Event: Who_Id=Contact, What_Id=Deal, $se_module='Deals'
    API->>Zoho: create Event (Ext_Calendar_Booking_ID = journeyId)
    Zoho->>WF: WF007 handleMeetingEvent → advance pipeline
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

## Reconciliation control

- **Lead path:** Page 2 performs exactly **one** Lead update **with triggers enabled**. That edit is
  the conversion trigger — `processLead` converts and builds/reuses the graph. Retry-safe: a replay
  after conversion resumes resolution without a second update.
- **Contact path:** the Contact is updated with `trigger:[]` (suppressed), then `processContact` is
  invoked **imperatively** via the Zoho Functions REST API (`reconcileContact` → function
  `processcontact`, arg `contact_id`). This is deterministic — it does not depend on which fields
  changed — and reuses the exact automation `processLead` calls inline. `processContact` is
  idempotent/self-healing.

## Account resolution (Contact path)

Contacts carry company only via the `Account_Name` lookup (no `Company` field), so the website
resolves/links the canonical Account **before** reconciliation — otherwise `processContact` would name
a new Account after the person. Mirrors `processLead`'s precedence and adds a Manual-Review guard:

- Existing `Account_Name` is authoritative — **reused**, never replaced. If the submitted
  company/business-domain **materially conflicts** → `409 MANUAL_REVIEW (account_conflict)` (Contact not
  moved, no Deal created).
- No Account → resolve unique canonical by `Account_Key`(domain) → `Website`(domain) → `Account_Name`
  (company). `>1` distinct candidate → `account_ambiguous`. None → create an Account named after the
  **company** (never the person) and link it.

## Product / Deal rules

- Form Product Interest maps to a canonical Zoho product (`Jurnii UX` / `Jurnii 360` / `Jurnii Cortex`
  / `Partnership`; `Cortex / Growth` → `Jurnii Cortex`). `Product_Interest` is written **additively**
  (deduplicated union with existing values), never a bare replace.
- **Exactly one** resolved Product Deal is required before Page 3 books. `Not sure yet`, blank,
  unresolved, or ambiguous → **Manual Review** (a standard Task via the existing automation); no Zoho
  Event is created. Products/Deals are never fabricated by the website.

## Journey UUID, JWT & continuation

- `journeyId` is **client-generated** (`crypto.randomUUID`) and persisted in `localStorage` **before**
  the first Page-1 request, so retries/concurrent submits are deterministically idempotent. The server
  **validates** it is a well-formed UUID and **binds** it into the signed JWT — it never mints its own.
  It is cleared on booking completion and when a new/unrelated journey (different email) starts.
- The **JWT is the journeyId→record binding** (there is no store): flow token (2h) carries
  `journeyId / recordType / recordId / email / contactId / accountId / dealId / step`; the manage token
  (30d) carries `journeyId / contactId / dealId`. Every step binds `decoded.journeyId === path id`;
  CRM reads/writes use `recordType`/`recordId`/`contactId`, never the path id.

## Meeting integration

- Google Calendar is the source of availability and the Meet conference. The event stores
  `extendedProperties.private.{journeyId, contactId, dealId}` and emails the invitee (`sendUpdates:'all'`).
- The Zoho **Event** links to the Contact (`Who_Id`) and the exact Product Deal (`What_Id` +
  **`$se_module:'Deals'`**), stores the Meet link, and carries `Ext_Calendar_Booking_ID = journeyId`.
  WF007 `handleMeetingEvent` then advances the pipeline (it keys on `Who_Id`/`What_Id`/`$se_module`, not
  the external id). The **Activation Task remains the human decision point**.
- **Ownership verification:** because `journeyId` is client-controlled, a reused Google/Zoho event is
  accepted only if its stored `contactId`/`dealId` match the signed token — otherwise
  `409 correlation_conflict`. This gates booking, cancel, and reschedule.

## Idempotency

- **Record:** dedupe by normalized email; Contact-first; an existing single unconverted Lead is reused;
  ambiguity → Manual Review (never an arbitrary pick).
- **Google event:** reuse by `privateExtendedProperty=journeyId`, ownership-verified, before insert; the
  Meet `requestId` is stable per journey.
- **Zoho event:** reuse by `Ext_Calendar_Booking_ID=journeyId`, ownership-verified, before insert.

## Security

- Zoho/Google credentials stay server-side. The browser never supplies CRM record ids — all come from
  the server-signed JWT. `journeyId` is client-supplied but only ever an opaque correlation key (never a
  CRM id), UUID-validated, JWT-bound, and ownership-checked at reuse. Cancel/reschedule require the
  Bearer JWT and bind `journeyId` to the path id. Errors are sanitized (`{error, code}`); no raw
  Zoho/Google payloads; no PII in logs (email is a fingerprint). Google scopes are `calendar.events` +
  `calendar.events.freebusy`.

## API contracts

| Endpoint | Auth | Body | Success | Notable non-2xx |
| --- | --- | --- | --- | --- |
| `POST /api/v1/submissions/start` | — | `{journeyId,firstName,lastName,email,consent,sourcePage,utm*}` | `200 {token,journeyId,step:1}` | `400 validation` (bad/absent journeyId), `400 EMAIL_NOT_BUSINESS`, `409 MANUAL_REVIEW (identity_ambiguous)` |
| `PATCH /api/v1/submissions/{journeyId}` | Bearer | `{company,jobTitle,productInterest,phone,country}` | `200 {token,step:2,contactId,dealId}` | `409 MANUAL_REVIEW` (`account_conflict`/`account_ambiguous`/`conversion_unresolved`/`no_product_selected`/`deal_ambiguous`/`deal_unresolved`), `409 wrong_step` |
| `GET /api/v1/availability` | — | — | `200 {slots:[{start,end}]}` | — |
| `POST /api/v1/bookings` | Bearer | `{slotStart}` | `200 {status:'confirmed',bookingId,meetLink,manageUrl,googleEventId,zohoEventId}` | `409 SLOT_TAKEN`, `409 NO_SINGLE_DEAL`, `409 correlation_conflict`, `409 MEET_PENDING`, `502` |
| `DELETE /api/v1/bookings/{journeyId}` | Bearer (booking or 30-day manage token) | — | `200 {success}` | `403 forbidden`, `409 correlation_conflict` |
| `PATCH /api/v1/bookings/{journeyId}/reschedule` | Bearer | `{slotStart}` | `200 {success,newStart}` | `403`, `404`, `409 SLOT_TAKEN`, `409 correlation_conflict` |

## Work-email-only intake & self-service management

- **Work emails only:** `/submissions/start` rejects free/personal/disposable domains
  (`api/_utils/email.js`; extend via `BLOCKED_EMAIL_DOMAINS`); the front end also validates inline.
- **Self-service cancel/reschedule:** a successful booking mints a **30-day management JWT** and returns
  `manageUrl` (also in the invite description and confirmation screen). `manage.html` reads the token
  and calls the JWT-secured cancel/reschedule endpoints. Set `PUBLIC_BASE_URL`.

## Environment

See [`.env.example`](../../.env.example). Notable: `ZOHO_ACCOUNTS_HOST`, `HOST_TIMEZONE`,
`PUBLIC_BASE_URL`, `ZOHO_PROCESS_CONTACT_URL` (exact Production REST URL for the Contact-path
reconciliation; OAuth2 + `functions.execute.CREATE`; fails closed if unset),
optional `ZOHO_LEAD_FIELD_*` attribution, optional `ZOHO_EVENT_MEET_FIELD`. There is **no**
`ZOHO_SUBMISSION_MODULE`. `vercel.json` sets extended `maxDuration` for the conversion-polling and
booking endpoints.

## Live verification & approval-gated items

See [`IMPLEMENTATION_EVIDENCE.md`](./IMPLEMENTATION_EVIDENCE.md) for the verification checklist and the
configuration changes that must be approved before deploy (chiefly: publishing `processContact` for
REST execution + the OAuth functions-execute scope, or the fallback deterministic trigger field).
