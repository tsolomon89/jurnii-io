# Specification — Jurnii Database-First Booking Backend

**Status:** Planning specification  
**Date:** 30 July 2026  
**Target repository:** `tsolomon89/jurnii-io`  
**Related repository:** `tsolomon89/zoho-functions` (read-only dependency; no change assumed)  
**Primary implementation area:** `booking/`

## 1. Purpose

Replace the booking form’s current request-to-Zoho dependency with a small, durable, Jurnii-owned backend.

The progressive form must save each completed step to Postgres first. Google Calendar and Zoho CRM integration must then run from that durable record, so the visitor is never dependent on Zoho conversion, Deal creation, Deluge execution, or downstream CRM reconciliation completing inside the browser request.

The database is the authoritative record of:

1. what the visitor submitted;
2. where the submission came from;
3. the current booking state; and
4. the state of the Google and Zoho integrations.

It is **not** a replacement for Zoho as the commercial CRM system of record, and it is **not** a user-account system.

## 2. Required outcome

```text
Browser
  -> Vercel API
  -> Postgres (durable journey record)
  -> Google Calendar / Meet
  -> background Zoho processing
```

The user-facing flow must remain fast and progressive:

- Page 1 persists identity, consent, and attribution.
- Page 2 persists company, role, phone, country, and product interest.
- Page 3 persists the selected slot and confirms the Google booking without waiting for Zoho’s commercial graph to finish processing.
- Zoho processing continues in a durable background execution path and updates the same database record as it progresses.

## 3. Core architectural decisions

### 3.1 Database

Use a managed Postgres database compatible with Vercel serverless deployments.

**Preferred default:** Neon Postgres provisioned through the Vercel Marketplace, using `DATABASE_URL` and the Neon serverless driver.

Do not introduce a separate application platform, authentication product, ORM, microservice, or always-on worker unless the implementation plan demonstrates that it is strictly necessary.

The first implementation should use:

- one principal table;
- versioned SQL migrations;
- parameterised SQL;
- a small query/repository layer;
- no Prisma unless the agent identifies a concrete need that outweighs the additional abstraction.

### 3.2 Background execution

Zoho work must run through a **durable** background mechanism. Do not use request-lifecycle fire-and-forget promises.

**Preferred default:** Vercel Workflows, provided it can be introduced without migrating the site to another framework or duplicating the booking module.

The implementation plan must verify the current Vercel runtime and propose the smallest compatible durable mechanism. Any alternative must provide:

- persisted execution state;
- retries with backoff;
- idempotency;
- restart safety across deployments and function termination;
- observability of the current step and last failure.

### 3.3 System ownership

- **Postgres:** form intake, progressive state, attribution, booking status, integration status, external IDs, retry/error state.
- **Google Calendar:** availability, confirmed calendar event, Google Meet link, invitation delivery.
- **Zoho CRM:** Leads, Contacts, Accounts, Product Deals, Quotes, Meetings, Tasks, sequences, pipeline state, and commercial automation.
- **Zoho Deluge:** remains the sole owner of the CRM commercial graph and commercial business logic.

The website/backend must not recreate `processLead`, `processContact`, `processDeal`, quote logic, sequence logic, or Account × Product Deal logic in Node.

## 4. Existing behaviour to preserve

The implementation plan must preserve these working architectural decisions unless this specification explicitly supersedes them:

- The booking feature remains isolated under `booking/`.
- Root `/api` files remain minimal one-line Vercel shims only.
- No implementation is duplicated outside `booking/`.
- Existing public `/api/v1/...` routes should remain stable unless a new status endpoint is required.
- `journeyId` remains the client-generated opaque UUID and primary correlation/idempotency key.
- The browser never supplies trusted Zoho record IDs.
- Contact-first CRM identity resolution remains:
  1. one Contact -> reuse and stop;
  2. otherwise one unconverted Lead -> reuse;
  3. otherwise create a Lead;
  4. ambiguity -> Manual Review, never auto-pick.
- Only standard Zoho modules are used. No custom submission, booking, reconciliation, or integration-log CRM module.
- Product interest remains additive, canonical, and non-destructive.
- The website never fabricates a Product Deal or Quote.
- Google and Zoho records continue to carry the `journeyId` for correlation.
- Cancel and reschedule remain ownership-verified and idempotent.

## 5. Progressive form behaviour

### 5.1 General rule

Each completed page is a durable save boundary.

The API must return success for a page only after the database transaction for that page has committed. A Google or Zoho failure must never erase or invalidate already-saved form data.

Retries of the same page with the same `journeyId` must update the existing row, not create another journey.

### 5.2 Page 1 — identity and attribution

Persist:

- `journey_id`;
- first name;
- last name;
- normalized work email;
- marketing consent value;
- consent timestamp when affirmative;
- source page and attribution fields;
- form placement/variant metadata;
- Page-1 completion timestamp.

Page 1 should return as soon as the database write and required validation complete.

CRM identity resolution may begin after Page 1 or Page 2, but the browser must not wait for it. The implementation plan should choose the simplest reliable trigger point and explain the choice.

### 5.3 Page 2 — company details

Persist:

- company;
- raw job title;
- selected country;
- phone dial code;
- national phone number;
- normalized E.164 phone number;
- product interest;
- Page-2 completion timestamp.

The Page-2 response must not wait for Lead conversion, Contact reconciliation, Account resolution, Deal creation, Quote creation, or Deluge completion.

A failed Zoho write becomes background integration state, not a failed form save.

### 5.4 Page 3 — slot and booking

Persist the chosen slot in UTC plus the visitor/display timezone.

The booking endpoint must:

1. verify the flow token and journey ownership;
2. re-check Google availability immediately before reserving;
3. atomically reserve the slot in Postgres;
4. create or reuse the Google Calendar event and Meet link idempotently;
5. update Postgres with the Google result;
6. return confirmation without waiting for Zoho processing.

The current user experience should remain simple: the confirmation screen must only claim that the booking is confirmed once the Google Calendar event exists. Zoho completion is not part of the visitor-facing confirmation boundary.

If the implementation plan proposes an asynchronous Google step plus status polling, it must justify the added UI/API complexity. The preferred KISS boundary is: **database first, Google confirmation second, Zoho in the background**.

## 6. Country and phone model

The country selector is one controlled input that determines both the canonical country and the telephone dial code.

Do not infer the country from a free-text value. Do not use the dial code alone as the database key because some dial codes are shared by multiple countries.

Each allowed option must be represented by one canonical mapping containing:

- ISO 3166-1 alpha-2 country code;
- canonical country name;
- telephone dial code.

The server must validate the submitted tuple against the same canonical mapping used by the frontend.

### Current supported mapping

| ISO2 | Country | Dial code |
|---|---|---:|
| `GB` | United Kingdom | `+44` |
| `US` | United States | `+1` |
| `MT` | Malta | `+356` |
| `GI` | Gibraltar | `+350` |
| `SE` | Sweden | `+46` |
| `DE` | Germany | `+49` |
| `ES` | Spain | `+34` |
| `IE` | Ireland | `+353` |
| `AU` | Australia | `+61` |
| `CW` | Curaçao | `+599` |
| `CR` | Costa Rica | `+506` |

Store all of the following:

- `country_iso2` — canonical country key;
- `country_name` — canonical display name;
- `phone_dial_code` — e.g. `+44`;
- `phone_national_number` — digits entered by the user after normalization;
- `phone_e164` — e.g. `+447123456789`.

The country mapping must live in one booking-specific configuration source that both browser and server derive from or validate against. Do not maintain separate divergent country lists.

## 7. Attribution and hidden fields

### 7.1 Required dedicated columns

Capture the attribution available when the journey begins and preserve it as the journey’s first-touch attribution:

- `source_page` — page/path on which the form opened;
- `landing_url` — full initial URL, with reasonable length limits;
- `referrer_url`;
- `utm_id`;
- `utm_source`;
- `utm_medium`;
- `utm_campaign`;
- `utm_term`;
- `utm_content`;
- `form_placement` — e.g. homepage hero, product CTA, inline form;
- `cta_id` — stable identifier for the triggering CTA;
- `form_variant` — form/experiment version;
- `client_timezone`;
- `client_locale`.

Known reporting fields must be normal columns rather than existing only inside JSON.

### 7.2 Extensible attribution

Add an `attribution_extra JSONB` column for additional hidden/query-string data that is useful but not yet promoted to a first-class reporting column, for example:

- `gclid`;
- `msclkid`;
- `fbclid`;
- partner or affiliate identifiers;
- campaign-specific hidden fields.

The server must whitelist accepted keys, impose value-length limits, and reject nested/unbounded arbitrary payloads. Do not store the entire request body or all query parameters blindly.

### 7.3 Attribution immutability

First-touch attribution is written when the journey is created and must not be overwritten by later progressive steps or retries.

The plan may add a separate last-page or last-touch field if required, but it must not replace the original attribution.

## 8. Principal database table

Start with one principal table named:

```text
booking_journeys
```

### 8.1 Identity and lifecycle

| Column | Suggested type | Requirement |
|---|---|---|
| `journey_id` | `uuid primary key` | Client-generated correlation/idempotency key. |
| `form_step` | `smallint` | Highest durably completed page. |
| `form_status` | `text` | Progressive intake status. |
| `booking_status` | `text` | Draft/reserved/confirmed/cancelled/reschedule state. |
| `created_at` | `timestamptz` | Server timestamp. |
| `updated_at` | `timestamptz` | Updated on every mutation. |
| `page_1_completed_at` | `timestamptz null` | First durable Page-1 completion. |
| `page_2_completed_at` | `timestamptz null` | First durable Page-2 completion. |
| `form_completed_at` | `timestamptz null` | Slot submitted. |
| `confirmed_at` | `timestamptz null` | Google event confirmed. |
| `cancelled_at` | `timestamptz null` | Booking cancellation. |

### 8.2 Submitted person and company data

| Column | Suggested type |
|---|---|
| `first_name` | `text` |
| `last_name` | `text` |
| `email` | `text` |
| `email_normalized` | `text` |
| `marketing_consent` | `boolean` |
| `marketing_consent_at` | `timestamptz null` |
| `company` | `text null` |
| `job_title_raw` | `text null` |
| `country_iso2` | `char(2) null` |
| `country_name` | `text null` |
| `phone_dial_code` | `text null` |
| `phone_national_number` | `text null` |
| `phone_e164` | `text null` |
| `product_interest` | `text null` |

### 8.3 Attribution and form context

| Column | Suggested type |
|---|---|
| `source_page` | `text null` |
| `landing_url` | `text null` |
| `referrer_url` | `text null` |
| `utm_id` | `text null` |
| `utm_source` | `text null` |
| `utm_medium` | `text null` |
| `utm_campaign` | `text null` |
| `utm_term` | `text null` |
| `utm_content` | `text null` |
| `form_placement` | `text null` |
| `cta_id` | `text null` |
| `form_variant` | `text null` |
| `client_timezone` | `text null` |
| `client_locale` | `text null` |
| `attribution_extra` | `jsonb not null default '{}'` |

### 8.4 Calendar data

| Column | Suggested type |
|---|---|
| `slot_start_utc` | `timestamptz null` |
| `slot_end_utc` | `timestamptz null` |
| `booking_timezone` | `text null` |
| `google_status` | `text` |
| `google_event_id` | `text unique null` |
| `google_meet_url` | `text null` |
| `google_attempt_count` | `integer not null default 0` |
| `google_last_error_code` | `text null` |
| `google_last_error_at` | `timestamptz null` |

### 8.5 Zoho integration data

| Column | Suggested type |
|---|---|
| `zoho_status` | `text` |
| `zoho_record_type` | `text null` |
| `zoho_record_id` | `text null` |
| `zoho_contact_id` | `text null` |
| `zoho_account_id` | `text null` |
| `zoho_deal_id` | `text null` |
| `zoho_meeting_id` | `text unique null` |
| `zoho_manual_review_task_id` | `text null` |
| `zoho_attempt_count` | `integer not null default 0` |
| `zoho_last_error_code` | `text null` |
| `zoho_last_error_at` | `timestamptz null` |

### 8.6 Workflow state

| Column | Suggested type |
|---|---|
| `workflow_run_id` | `text null` |
| `processing_started_at` | `timestamptz null` |
| `processing_completed_at` | `timestamptz null` |
| `next_retry_at` | `timestamptz null` |

The implementation plan may refine names and types, but it must preserve the separation between submitted data, attribution, booking state, Google state, and Zoho state.

## 9. Status model

Use explicit status values with database constraints or application-level validation. Avoid one overloaded status field.

Suggested values:

### `form_status`

- `started`
- `identity_complete`
- `details_complete`
- `slot_selected`

### `booking_status`

- `draft`
- `reserved`
- `confirmed`
- `cancel_pending`
- `cancelled`
- `reschedule_pending`

### `google_status`

- `not_started`
- `pending`
- `confirmed`
- `cancel_pending`
- `cancelled`
- `retrying`
- `failed`

### `zoho_status`

- `not_started`
- `pending`
- `identity_resolved`
- `record_saved`
- `meeting_created`
- `complete`
- `retrying`
- `manual_review`
- `failed`

The implementation plan must prevent impossible state regressions, such as a confirmed Google event returning to `not_started`.

## 10. Slot reservation and concurrency

The database must prevent two website requests from confirming the same locally offered slot.

The implementation plan must include:

- an immediate Google FreeBusy re-check;
- a transaction around the local reservation;
- a uniqueness or exclusion constraint suitable for the current fixed-duration slot model;
- deterministic handling of `SLOT_TAKEN`;
- release or expiry of abandoned reservations;
- idempotent retries by the same `journeyId`.

For the current fixed-duration model, a partial unique index on the active `slot_start_utc` may be sufficient. The plan must verify this against the actual scheduling rules before implementation.

Google remains the final calendar source of truth; the Postgres reservation protects this application from concurrent duplicate submissions.

## 11. Google integration requirements

- Availability remains Google FreeBusy.
- Google event creation remains idempotent by `journeyId`.
- Store `journeyId` and normalized email in private event metadata.
- Reuse only when ownership metadata matches; otherwise return/record `correlation_conflict`.
- Persist `google_event_id` immediately after success.
- A retry must never create a second event after `google_event_id` has been stored.
- The confirmation screen must not claim success until the Google event exists.
- Google cancellation and rescheduling must update the same event and then update Postgres.
- A successful Google booking is not rolled back merely because Zoho is delayed or fails.

## 12. Zoho integration requirements

Zoho work runs after durable database persistence and must never block the visitor-facing booking confirmation.

### 12.1 Identity and record save

Preserve Contact-first resolution:

1. unique Contact -> update/reuse;
2. otherwise unique unconverted Lead -> update/reuse;
3. otherwise create Lead;
4. ambiguity -> standard Manual Review Task.

For a Lead, the one complete update with workflows enabled starts `processLead`. The background process may check conversion later, but no browser request waits for it.

For an existing Contact, update permitted fields in place. Do not create a throwaway Lead. Do not invoke `processContact` over a REST wrapper. Do not add a reconciliation trigger field as part of this backend work.

### 12.2 Deal and Meeting behaviour

- Never create a productless or generic Deal.
- Never duplicate Deal or Quote logic in Node.
- When exactly one matching Product Deal exists, create/reuse the Zoho Meeting linked to the resolved person and exact Deal.
- When the Deal is not yet visible, the workflow may retry in the background without blocking the visitor.
- After the bounded retry window, do not guess. Create/reuse a standard Manual Review Task and set `zoho_status = manual_review`.
- The implementation plan must decide whether a person-linked Zoho Meeting is created before the Deal is resolved or whether Meeting creation waits for the exact Deal. It must favour the smallest design that preserves visibility in Zoho without creating duplicates or corrupting pipeline automation.
- Google confirmation remains valid regardless of the Zoho outcome.

### 12.3 Manual Review

Use only the standard Tasks module.

Manual Review creation must be:

- idempotent by journey/reason;
- linked to the resolved Contact where possible;
- descriptive enough to show the journey ID, product, booking time, and failure reason;
- non-destructive to sequences and stages;
- consistent with the existing `createManualReview.deluge` conventions where applicable.

Do not create a custom CRM module or new custom field for this backend.

## 13. Idempotency and retry rules

`journeyId` is the universal journey key, not a CRM record ID.

Every write path must be safe to repeat:

- Page 1 upserts the journey.
- Page 2 updates the same journey.
- Page 3 reuses the same slot reservation and external events when already created.
- Google creation checks `google_event_id` and ownership metadata before insertion.
- Zoho identity resolution writes returned IDs into Postgres.
- Zoho Meeting creation checks `zoho_meeting_id` and `Ext_Calendar_Booking_ID` before insertion.
- Manual Review creation checks the stored Task ID and existing open related Tasks before insertion.
- Background retries resume from the last durable successful state, not from the beginning.

External success followed by a timeout must be recoverable by re-reading the external system and persisting the existing external ID.

## 14. API changes

Preserve the current endpoints where practical:

| Method | Path | Database-first responsibility |
|---|---|---|
| `POST` | `/api/v1/submissions/start` | Validate and upsert Page 1; return flow token. |
| `PATCH` | `/api/v1/submissions/{journeyId}` | Persist Page 2; schedule/reuse background Zoho processing; return without waiting for Zoho. |
| `GET` | `/api/v1/availability` | Google availability. |
| `POST` | `/api/v1/bookings` | Reserve slot, create/reuse Google event, persist confirmation, start/reuse Zoho workflow. |
| `DELETE` | `/api/v1/bookings/{journeyId}` | Persist cancel intent, update Google idempotently, schedule Zoho cancellation update. |
| `PATCH` | `/api/v1/bookings/{journeyId}/reschedule` | Reserve new slot, update Google idempotently, persist new time, schedule Zoho update. |

A read-only status endpoint may be added if required by the durable execution design:

```text
GET /api/v1/bookings/{journeyId}/status
```

It must require a signed flow/manage token and return only visitor-safe state. Do not expose CRM IDs, raw errors, credentials, or internal payloads.

## 15. Repository structure

Keep the booking feature portable and isolated:

```text
booking/
  api/
  assets/
  config/
    countries.*
  db/
    migrations/
    queries/
    index.*
  integrations/
    google/
    zoho/
  workflows/
  tests/
  docs/
  examples/
  .env.example
  package.json
  README.md
  vercel.snippet.json
```

The exact filenames may differ, but the boundaries must remain clear.

Outside `booking/`, keep only:

- one-line Vercel API re-export shims;
- minimal host-page and stylesheet wiring;
- root package/config references required to run the portable module.

No booking implementation may be duplicated outside `booking/`.

Do not migrate the website to Next.js, another framework, TypeScript, ESM, or an ORM solely to add the database. Any runtime/module-system change must be explicitly justified in the implementation plan.

## 16. Environment and setup

The implementation plan must enumerate exact environment variables and identify whether each is agent-configurable or requires the user/Vercel console.

Expected additions include:

```text
DATABASE_URL
```

Potential workflow-specific variables must be identified from the selected durable execution mechanism.

Existing Google, Zoho, JWT, timezone, and public-base-URL variables remain server-only.

The plan must include:

- Neon/Vercel Marketplace provisioning steps;
- local development connection setup;
- migration execution procedure;
- Preview versus Production database strategy;
- secret rotation and rollback procedure;
- no live provisioning or credential changes without explicit approval.

## 17. Security, privacy, and data quality

- Database access is server-side only.
- Use TLS and parameterised SQL.
- Validate all fields server-side with length and format limits.
- Normalize email and phone deterministically.
- Do not log raw PII or third-party payloads.
- Do not expose database IDs or CRM IDs to the browser unless required and signed.
- Do not store raw IP addresses by default. Any anti-abuse requirement must propose a privacy-conscious alternative and retention period.
- Preserve marketing consent as an explicit boolean plus timestamp; do not infer consent.
- Add a configurable retention/cleanup strategy for abandoned and completed journeys. The implementation plan must propose the retention periods; do not silently retain data forever.
- Database backups and provider recovery features must be documented.

## 18. Observability

The system must make it possible to answer, for any `journeyId`:

- which form pages were saved;
- whether Google is pending, confirmed, cancelled, retrying, or failed;
- whether Zoho is pending, complete, retrying, manual review, or failed;
- the last safe error code and timestamp;
- the external Google/Zoho IDs stored server-side;
- the active workflow run.

Logs should contain `journeyId`, safe status transitions, and error codes, but no raw names, email addresses, phone numbers, or external API payloads.

## 19. Testing requirements

The implementation plan must include tests for at least:

### Database and progressive form

- Page 1 creates exactly one journey.
- Page-1 retry updates/reuses the same journey.
- First-touch attribution is not overwritten by Page 2 or retries.
- Page 2 persists country, dial code, national number, E.164 number, and product.
- Invalid country/dial-code combinations are rejected.
- Abandoned Page-1 and Page-2 journeys remain inspectable.

### Booking and concurrency

- Exact same journey retry does not duplicate a reservation or Google event.
- Two different journeys cannot reserve the same active slot.
- Google success is persisted before response confirmation.
- Google success plus response timeout is recovered without duplicate creation.
- Cancel and reschedule update the same journey and Google event.

### Zoho background processing

- Contact-first identity resolution remains correct.
- A new Lead is created only when no Contact or unconverted Lead exists.
- Page 2 and booking responses do not wait for Zoho conversion or Deal creation.
- Background retries resume from stored state.
- Existing external IDs prevent duplicate CRM writes.
- Missing/ambiguous Deal produces Manual Review rather than a fabricated Deal.
- Google-confirmed booking remains confirmed when Zoho fails.

### Portability

- All real code lives under `booking/`.
- Root API files are one-line shims.
- The booking module test suite runs from the repository root and from `booking/`.

## 20. Acceptance criteria

The implementation is acceptable only when all of the following are true:

1. Every completed form page is durably stored in Postgres before success is returned.
2. UTM, source-page, hidden form-context, consent, country, and phone-normalization data are retained.
3. A visitor can progress through the form without waiting for Zoho conversion, Deluge, Deal, Quote, or Meeting completion.
4. Google Calendar confirmation remains the visitor-facing booking boundary.
5. Zoho processing is durable, idempotent, observable, and retryable in the background.
6. Google success is never undone solely because Zoho is delayed or failed.
7. No custom Zoho module is created.
8. No new reconciliation field or standalone Deluge REST wrapper is introduced for this work.
9. No Account, Product Deal, Quote, or sequence business logic is duplicated in Node.
10. No booking implementation is duplicated outside `booking/`.
11. Current public routes and frontend behaviour are preserved unless a reviewed plan justifies a minimal change.
12. Migrations, environment setup, tests, live verification, rollback, and user-versus-agent actions are documented.

## 21. Explicit non-goals

- Creating Jurnii login accounts from the booking form.
- Building a general-purpose CRM or marketing automation database.
- Replacing Zoho commercial records or Deluge automation.
- Introducing a custom Zoho submission/booking module.
- Rewriting the website framework.
- Creating a generic event-sourcing platform.
- Adding a full admin UI in the first implementation.
- Solving all CRM data-quality problems synchronously during booking.

## 22. Instructions to the coding agent

Using this specification, inspect the current `booking/` implementation in `tsolomon89/jurnii-io` and the relevant current functions/documentation in `tsolomon89/zoho-functions`.

Produce an **implementation plan only**. Do not implement, commit, provision Neon, alter Vercel, change OAuth scopes, or publish Deluge.

The plan must:

1. map the current request flow to the new database-first flow;
2. identify every file to add, modify, move, or delete;
3. provide the proposed SQL migration and indexes/constraints at planning level;
4. select and justify the durable background mechanism against the current non-Next.js CommonJS/Vercel setup;
5. define exact API response changes and frontend impact;
6. define status transitions and retry boundaries;
7. explain Google-first confirmation and Zoho eventual processing;
8. preserve Contact-first identity and standard-module-only Zoho rules;
9. specify the country mapping and attribution capture implementation;
10. list new dependencies and environment variables;
11. separate actions the coding agent can perform from console/credential actions Timothy must perform;
12. include offline tests, live E2E cases, migration, deployment, rollback, and cleanup;
13. identify any genuine conflicts with the current implementation rather than silently changing behaviour;
14. favour deletion and simplification over compatibility layers or duplicate code.

The implementation plan will be reviewed before any code or live configuration changes are approved.

## 23. Current platform facts for the plan to verify

At the time of this specification:

- New Vercel Postgres projects are provisioned through Marketplace Postgres providers; Neon is the preferred serverless Postgres option.
- The Neon Vercel integration provides a managed `DATABASE_URL` and supports serverless access through `@neondatabase/serverless`.
- Vercel Workflows is available for durable background execution.

The coding agent must re-check the current official Vercel and Neon documentation before finalising the implementation plan and must call out any incompatibility with this repository’s CommonJS serverless-function structure.
