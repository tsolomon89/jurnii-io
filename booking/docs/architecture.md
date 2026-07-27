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
- **Contact path:** the Contact is updated in place with `trigger:[]` (additive `Product_Interest`). No
  Account read, no Deal resolution.
- **A failed direct save stays an error** (invalid fields → `400`; a rejected Zoho write → retryable
  `502`). Success is never reported for unsaved data. Product interest is optional and never gates
  advancing to the calendar.

## Product / Deal rules

- Form Product Interest maps to a canonical Zoho product (`Jurnii UX` / `Jurnii 360` / `Jurnii Cortex`
  / `Partnership`; `Cortex / Growth` → `Jurnii Cortex`). `Product_Interest` is written **additively**
  (deduplicated union), never a bare replace. The canonical product travels on the step-2 token.
- A Product Deal is **never required to book**. At booking, if a product was selected **and** exactly
  one matching open Deal already exists, the meeting is linked to it (`What_Id` + `$se_module='Deals'`);
  otherwise the meeting is **person-linked** and confirms anyway. Products/Deals are never fabricated by
  the website, and it never creates a productless Deal or a Quote (`processDeal` owns the Deal + scaffold
  Quote).

## Known limitation (deliberate KISS trade-off)

The website raises **no** Manual-Review Task and blocks nothing. If a product was selected but its
Product Deal is **not yet visible** at booking time (conversion still in flight, or the rep hasn't
created it), the meeting is created **person-linked** (`Who_Id` = Contact or Lead, no `What_Id`) and the
booking confirms. Such a meeting will **not** trigger `handleMeetingEvent` pipeline advancement, and it
is **not** retro-linked if the Deal appears later. Guaranteeing eventual Deal-linkage would require a
separate Zoho-side reconciliation workflow, which is intentionally **out of scope** for this module.

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
