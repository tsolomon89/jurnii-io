# Jurnii Booking Integration Architecture

This document describes the **implemented** design, API contracts, and sync logic for the
Jurnii website booking form's integration with Zoho CRM and Google Calendar.

The website is a thin orchestration layer. **Zoho Deluge automation (`processLead` →
`processContact`/`processAccount`/`processDeal`, and `handleMeetingEvent`) is the sole
authority** for CRM conversion, the commercial graph (Account/Contact/Deal/Quote/Product/
Role), pipeline state, sequences, and activity handling. The website never reproduces that
business logic.

## High-level flow

```mermaid
sequenceDiagram
    autonumber
    actor Visitor
    participant Frontend as Website (booking-form.js)
    participant API as Vercel Serverless (api/v1)
    participant Zoho as Zoho CRM EU
    participant WF as Deluge (process Lead / handleMeetingEvent)
    participant Google as Google Calendar

    %% Page 1 — partial registration (NO conversion)
    Visitor->>Frontend: Name, email, consent (+ hidden UTM/source)
    Frontend->>API: POST /api/v1/submissions/start
    Note over API: dedupe by email; create the transient Lead with<br/>trigger:[] (WORKFLOW SUPPRESSED) → Lead stays unconverted
    API->>Zoho: create Lead (trigger:[]) + Website_Submissions record
    API-->>Frontend: { token, submissionId, step:1 }

    %% Page 2 — one enrichment update → conversion
    Visitor->>Frontend: Company, title, product, phone, country
    Frontend->>API: PATCH /api/v1/submissions/{id} (Bearer)
    Note over API: ONE Lead update, triggers ENABLED
    API->>Zoho: update Lead (no trigger override)
    Zoho->>WF: workflow fires → process Lead converts
    WF-->>Zoho: Account, Contact, Product Deal(s), Quote(s), Roles, Activation Task
    Note over API: bounded backoff poll → resolve Contact + Account,<br/>then the exact single Product Deal from the graph
    API-->>Frontend: { token, step:2, contactId, dealId }  (or 409 MANUAL_REVIEW)

    %% Page 3 — booking
    Frontend->>API: GET /api/v1/availability
    API->>Google: freebusy.query (host calendar)
    Frontend->>API: POST /api/v1/bookings (Bearer)
    Note over API: requires a single resolved Deal;<br/>reuse-or-create Google event + Meet
    API->>Google: events.insert (Meet, sendUpdates:all, extProp submissionId)
    Note over API: reuse-or-create Zoho Event:<br/>Who_Id=Contact, What_Id=Deal + $se_module='Deals'
    API->>Zoho: create Event (triggers enabled)
    Zoho->>WF: WF007 handleMeetingEvent → advance pipeline
    API-->>Frontend: { status:'confirmed', meetLink, googleEventId, zohoEventId }
```

## Lead-conversion control (the core mechanism)

- **Page 1** creates the Lead via the Zoho v6 REST API with `trigger: []` in the write body.
  This suppresses ALL workflows, so the always-convert `process Lead` automation does **not**
  fire and the Lead is preserved as an unconverted partial. No CRM "gate" field is used.
- **Page 2** performs exactly **one** Lead update **without** a `trigger` override (Zoho default
  = all triggers run). That edit is the conversion trigger: `process Lead` converts the Lead and
  builds/reuses the full graph, merging into an existing Contact by email where applicable.
- The website makes **no** `convertLead`/Account/Deal/Quote API calls of its own.

## Progressive state & continuation

- **`Website_Submissions`** (custom module) is the durable progressive-state record. A signed
  **JWT** (2h) carries `submissionId/email/leadId/contactId/dealId/step` as the client
  continuation token. There is **no** silent `MOCK_SUBMISSION_ID` fallback — a missing module
  fails loudly.
- The browser also persists a continuation snapshot to `localStorage` so a refresh (or return
  visit within 2h) resumes in place.

## Conversion-result resolution (Node-side, phase one)

After the page-2 update, the API polls the Lead with bounded backoff (REST `GET /Leads/{id}`
returns converted leads), reads the converted Contact + Account, then resolves the **exact
single Product Deal** from the converted graph by matching `Deal_Product` to the canonical
product. No Deluge stamp-back and no `/status` endpoint are used. **Retry-safe:** a page-2
replay after conversion resumes resolution and returns the existing result — it never updates
the converted Lead or creates a second Lead.

## Product / Deal rules

- Form Product Interest is mapped to a canonical Zoho product (`Jurnii UX` / `Jurnii 360` /
  `Jurnii Cortex` / `Partnership`). The "Cortex / Growth" option resolves to `Jurnii Cortex`.
- **Exactly one** resolved Product Deal is required before Page 3 books. `Not sure yet`,
  blank, unresolved, or ambiguous (multiple) → **Manual Review**: the submission + converted
  records are preserved, no Zoho Event is created, and the visitor is told the team will follow
  up. Products are never fabricated.

## Meeting integration

- Google Calendar is the source of availability and the Google Meet conference. The event
  carries `extendedProperties.private.submissionId` as the dedupe key and emails the invitee
  (`sendUpdates:'all'`). Cancellation is a soft-cancel (`status:'cancelled'`).
- The Zoho **Event** links to the converted Contact (`Who_Id`) and the exact Product Deal
  (`What_Id` + **`$se_module:'Deals'`** — required for `handleMeetingEvent` to act), stores the
  Meet link, and carries `Ext_Calendar_Booking_ID = submissionId`. WF007 `handleMeetingEvent`
  then advances the pipeline. The **Activation Task remains the human decision point** — the
  booking never auto-completes it.

## Idempotency

- **Lead/Contact:** dedupe by normalized email; an existing single unconverted Lead is reused;
  an existing Contact is a merge target but the transient Lead is still created; ambiguous
  multiples → Manual Review (never an arbitrary pick).
- **Google event:** reuse by `events.list` filtered on `privateExtendedProperty=submissionId`
  before insert; the Meet `requestId` is stable per submission.
- **Zoho event:** reuse by `Ext_Calendar_Booking_ID` search before insert.
- **Booking:** the Google event id is persisted before the Zoho step; a lost response is
  reconcilable via the extended-property reuse on retry.

## Security

- Zoho/Google credentials stay server-side (env). The browser never supplies CRM record ids —
  all ids come from the server-signed JWT. Cancel/reschedule now require the Bearer JWT and
  bind `token.submissionId` to the path id. Page-2 enforces `step==1` (replay guard). Error
  responses are sanitized (`{error, code}`) and never include raw Zoho/Google payloads. No PII in
  logs (email is logged as a fingerprint). Least-privilege Google scopes are `calendar.events`
  **and** `calendar.events.freebusy` (FreeBusy needs the latter).

## API contracts

| Endpoint | Auth | Body | Success | Notable non-2xx |
| --- | --- | --- | --- | --- |
| `POST /api/v1/submissions/start` | — | `{firstName,lastName,email,consent,sourcePage,utmSource,utmMedium,utmCampaign}` | `200 {token,submissionId,step:1}` | `409 MANUAL_REVIEW` (ambiguous identity), `400 validation` |
| `PATCH /api/v1/submissions/{id}` | Bearer | `{company,jobTitle,productInterest,phone,country}` | `200 {token,step:2,contactId,dealId}` | `409 MANUAL_REVIEW` (`conversion_unresolved`/`no_product_selected`/`deal_ambiguous`/`deal_unresolved`), `409 wrong_step` |
| `GET /api/v1/availability` | — | — | `200 {slots:[{start,end}]}` | — |
| `POST /api/v1/bookings` | Bearer | `{slotStart}` | `200 {status:'confirmed',bookingId,meetLink,googleEventId,zohoEventId}` | `409 SLOT_TAKEN`, `409 NO_SINGLE_DEAL`, `502` |
| `DELETE /api/v1/bookings/{id}` | Bearer | — | `200 {success}` | `403 forbidden` |
| `PATCH /api/v1/bookings/{id}/reschedule` | Bearer | `{slotStart}` | `200 {success,newStart}` | `403`, `404`, `409 SLOT_TAKEN` |

## Environment

See [`.env.example`](../../.env.example) for the full list. Notable: `ZOHO_ACCOUNTS_HOST`,
`ZOHO_SUBMISSION_MODULE`, `HOST_TIMEZONE`, optional `ZOHO_LEAD_FIELD_UTM_*` /
`ZOHO_LEAD_FIELD_SOURCE_PAGE` (attribution is written to the Lead only when these point at
real, approved fields — otherwise it is logged), and optional `ZOHO_EVENT_MEET_FIELD`.
`vercel.json` sets extended `maxDuration` for the conversion-polling and booking endpoints.

## Live verification & approval-gated items

See [`IMPLEMENTATION_EVIDENCE.md`](./IMPLEMENTATION_EVIDENCE.md) for the full verification
checklist, the exact live Zoho metadata to confirm (`getFields`), and the configuration
changes that must be approved before deploy.
