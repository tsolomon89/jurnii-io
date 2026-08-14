# GTM + GA4 configuration runbook — Jurnii

**Audience: an AI agent with web browsing that will perform this configuration in the
Google Tag Manager and Google Analytics 4 web consoles.**

This document is self-contained. You do not need access to the Jurnii source code — every
event name, parameter name and value vocabulary you need is reproduced here.

The website code is **already deployed and already emitting** everything listed below.
Your job is entirely inside the two Google consoles: create the variables, triggers and
tags that receive it, configure the GA4 property, verify, and publish.

---

## 0. How to work through this document

1. **Work in order.** Section 3 (variables) must exist before Section 4 (triggers) and
   Section 5 (tags) can reference them. Section 7 (GA4 custom dimensions) should be done
   **before** you publish the container in Section 9, because GA4 does not backfill.
2. **Everything is idempotent by name.** Before creating any item, search for its exact
   name. If it already exists, compare it against the spec here, correct any difference,
   and note it as "already existed — verified/corrected" rather than creating a duplicate.
3. **Do not publish until Section 8 (verification) passes.** Work in a GTM workspace and
   preview it. Publishing a half-configured container starts collecting wrong data, and
   wrong data cannot be retroactively fixed.
4. **UI wording changes.** The navigation paths below were accurate at time of writing.
   If a label differs, find the equivalent setting rather than stopping — but if you
   cannot confidently identify the equivalent, stop and report it rather than guessing.
5. **Never invent a value.** If this document does not specify something, leave the GTM
   or GA4 default and note it in your report.
6. **Report at the end** using the template in Section 11.

### Access you need before starting

| System | Permission | If you do not have it |
|---|---|---|
| Google Tag Manager, container `GTM-PGVJ4K9T` | **Publish** on the container | Stop and report. You can build in a workspace with Edit, but cannot complete. |
| Google Analytics 4 (the Jurnii property) | **Editor** (Administrator for data-stream settings) | Stop and report which sections you could not complete. |

---

## 1. Facts you will need

| Fact | Value |
|---|---|
| GTM container ID | `GTM-PGVJ4K9T` |
| GTM container is installed on | `jurnii.io` (all marketing routes), `/manage.html`, `/admin-form` |
| GA4 property | Exists already, largely unconfigured |
| GA4 Measurement ID | **You must look this up** — see below |

**To find the Measurement ID:** GA4 → Admin (gear, bottom left) → *Data streams* → click
the web stream for jurnii.io. The Measurement ID is shown top-right in the format
`G-XXXXXXXXXX`. Record it; you will use it in Section 3.

If there is **no** web data stream, create one: Admin → Data streams → Add stream → Web →
URL `https://jurnii.io`, name `Jurnii — www`. Then continue.

---

## 2. The one thing that must not be got wrong

**No GA4 tag may fire on "All Pages", "Initialization", "Consent Initialization", or any
page-load trigger.**

The Jurnii site is a single HTML file serving 165 routes with no server-side rendering.
When the page loads, the browser does not yet know which page it is on — the title,
category and section are only resolved after the JavaScript app boots. A tag firing on
page load would report every page in the site as the homepage, and a hit that has already
been sent cannot be corrected.

The site therefore pushes a single `page_context_ready` event once identity is known, and
**that** is what the pageview fires on. Every page does this, including the two plain
pages, and including a 4-second failsafe if the app fails to boot.

If you find yourself attaching a GA4 tag to All Pages, you have misread this document.

---

## 3. GTM — Variables

**Navigate:** GTM → select container `GTM-PGVJ4K9T` → *Variables* (left sidebar).

### 3.1 Constant

Under **User-Defined Variables** → New → *Constant*.

| Variable name | Value |
|---|---|
| `CONST – GA4 Measurement ID` | the `G-XXXXXXXXXX` you found in Section 1 |

### 3.2 Data Layer Variables

Create one for each row. All use:

- **Variable Type:** Data Layer Variable
- **Data Layer Variable Name:** exactly the value in the "Data layer key" column
- **Data Layer Version:** **Version 2** (the default — leave it)
- Leave "Set Default Value" **unchecked**. An absent parameter must stay absent, not
  become an empty string, because GA4 treats an empty string as a real reportable value.

Name each variable `DLV – <key>` so they sort together.

**Page context (11):**

| Variable name | Data layer key |
|---|---|
| `DLV – page_type` | `page_type` |
| `DLV – page_title` | `page_title` |
| `DLV – page_location` | `page_location` |
| `DLV – canonical_path` | `canonical_path` |
| `DLV – content_group` | `content_group` |
| `DLV – content_section` | `content_section` |
| `DLV – content_slug` | `content_slug` |
| `DLV – content_category` | `content_category` |
| `DLV – content_medium` | `content_medium` |
| `DLV – content_author` | `content_author` |
| `DLV – content_filter` | `content_filter` |
| `DLV – template` | `template` |
| `DLV – surface` | `surface` |

**Booking funnel (13):**

| Variable name | Data layer key |
|---|---|
| `DLV – step_name` | `step_name` |
| `DLV – step_number` | `step_number` |
| `DLV – error_code` | `error_code` |
| `DLV – outcome_code` | `outcome_code` |
| `DLV – tone` | `tone` |
| `DLV – country` | `country` |
| `DLV – products` | `products` |
| `DLV – product_count` | `product_count` |
| `DLV – marketing_consent` | `marketing_consent` |
| `DLV – job_title_other` | `job_title_other` |
| `DLV – lead_source` | `lead_source` |
| `DLV – booking_host` | `booking_host` |
| `DLV – lead_time_days` | `lead_time_days` |
| `DLV – has_meet_link` | `has_meet_link` |

**Attribution and CTA (7):**

| Variable name | Data layer key |
|---|---|
| `DLV – form_placement` | `form_placement` |
| `DLV – cta_id` | `cta_id` |
| `DLV – form_variant` | `form_variant` |
| `DLV – cta_label` | `cta_label` |
| `DLV – cta_location` | `cta_location` |
| `DLV – cta_href` | `cta_href` |
| `DLV – intercepted` | `intercepted` |

**Library filter (2):**

| Variable name | Data layer key |
|---|---|
| `DLV – filter_scope` | `filter_scope` |
| `DLV – filter_value` | `filter_value` |

Total: 1 constant + 35 data layer variables.

---

## 4. GTM — Triggers

**Navigate:** GTM → *Triggers* → New → *Custom Event*.

For every row: **Trigger Type** = Custom Event, **Event name** = exactly the value in the
"Event name" column, **This trigger fires on** = All Custom Events. Do **not** add
conditions.

| Trigger name | Event name |
|---|---|
| `CE – page_context_ready` | `page_context_ready` |
| `CE – cta_click` | `cta_click` |
| `CE – booking_open` | `booking_open` |
| `CE – booking_step_view` | `booking_step_view` |
| `CE – booking_step_complete` | `booking_step_complete` |
| `CE – booking_slot_selected` | `booking_slot_selected` |
| `CE – booking_error` | `booking_error` |
| `CE – booking_confirmed` | `booking_confirmed` |
| `CE – booking_needs_attention` | `booking_needs_attention` |
| `CE – manage_step_view` | `manage_step_view` |
| `CE – manage_slot_selected` | `manage_slot_selected` |
| `CE – manage_complete` | `manage_complete` |
| `CE – manage_error` | `manage_error` |
| `CE – filter_apply` | `filter_apply` |

Total: 14 triggers.

---

## 5. GTM — Tags

**Navigate:** GTM → *Tags* → New.

### 5.1 The Google tag (the pageview)

| Setting | Value |
|---|---|
| Tag name | `GA4 – Google Tag` |
| Tag type | **Google Tag** |
| Tag ID | `{{CONST – GA4 Measurement ID}}` |
| Trigger | **`CE – page_context_ready`** — and nothing else |

**Configuration settings** (add each as a name/value row):

| Parameter | Value |
|---|---|
| `page_location` | `{{DLV – page_location}}` |
| `page_title` | `{{DLV – page_title}}` |

> These two overrides matter. The site never set a per-page `document.title` until
> recently and the URL of the booking-management page carries a signed token, so the
> normalised values from the data layer are the correct source, not the browser's own.

**Shared event settings** — add each of these so they ride on every GA4 event from this
container, not just the pageview:

`page_type`, `content_group`, `content_section`, `content_slug`, `content_category`,
`content_medium`, `content_author`, `content_filter`, `template`, `surface`,
`canonical_path`

each mapped to its matching `{{DLV – …}}` variable.

> **Fallback:** if your GTM UI does not offer "Shared event settings" on the Google tag,
> add these eleven parameters individually to *every* GA4 Event tag in Section 5.2
> instead, and say so in your report.

**Advanced Settings → Tag firing options:** set to **Once per page**.

Leave "Send a page view event when this configuration loads" **enabled** (the default).
Because this tag fires on `page_context_ready` rather than on page load, that pageview is
sent at the correct moment with the correct data.

### 5.2 GA4 Event tags

For each row below create a tag with:

- **Tag name:** `GA4 – Event – <event name>`
- **Tag type:** Google Analytics → **GA4 Event**
- **Measurement ID / Configuration:** `{{CONST – GA4 Measurement ID}}` (if the UI asks for
  a configuration tag instead, select `GA4 – Google Tag`)
- **Event Name:** exactly the event name
- **Event Parameters:** each listed parameter mapped to its `{{DLV – …}}` variable
- **Trigger:** the matching `CE – …` trigger from Section 4

| Event name | Event parameters |
|---|---|
| `cta_click` | `cta_id`, `cta_label`, `cta_location`, `cta_href`, `intercepted` |
| `booking_open` | `form_placement`, `cta_id`, `form_variant` |
| `booking_step_view` | `step_name`, `step_number` |
| `booking_step_complete` | `step_name`, `step_number`, `country`, `products`, `product_count`, `marketing_consent`, `job_title_other`, `lead_source`, `booking_host` |
| `booking_slot_selected` | `lead_time_days` |
| `booking_error` | `step_name`, `error_code`, `tone` |
| `booking_confirmed` | `country`, `products`, `product_count`, `marketing_consent`, `job_title_other`, `lead_source`, `booking_host`, `lead_time_days`, `has_meet_link`, `form_placement`, `cta_id`, `form_variant` |
| `booking_needs_attention` | `form_placement`, `cta_id`, `form_variant` |
| `manage_step_view` | `step_name` |
| `manage_slot_selected` | `lead_time_days` |
| `manage_complete` | `outcome_code` |
| `manage_error` | `error_code`, `tone` |
| `filter_apply` | `filter_scope`, `filter_value` |

Total: 1 Google tag + 13 event tags.

> Not every parameter is present on every occurrence — the site omits empty values
> deliberately. A GA4 Event tag with an unset variable simply sends nothing for that
> parameter, which is the intended behaviour. Do not add default values to compensate.

---

## 6. What each event means

Context for sanity-checking your work and for the verification in Section 8. You do not
need to configure anything from this section.

| Event | Fires when |
|---|---|
| `page_context_ready` | Page identity resolved. **Exactly once per page load.** The pageview. |
| `cta_click` | Any "book a demo" or contact CTA clicked. `intercepted: true` means it opened the booking modal; `false` means it navigated to the contact page instead. |
| `booking_open` | The booking form mounted (the modal opened, or a booking page loaded). |
| `booking_step_view` | A form step became visible. |
| `booking_step_complete` | **The server accepted that step.** Not the same as it being viewed — a viewed step may still be rejected. |
| `booking_slot_selected` | A time slot was chosen. |
| `booking_error` | An error or notice was shown. `tone` is `error` or `info`. |
| `booking_confirmed` | **The conversion.** A demo booking was confirmed. |
| `booking_needs_attention` | A booking was escalated for manual handling. |
| `manage_*` | The equivalents on the reschedule/cancel page reached from booking emails. |
| `filter_apply` | A category filter on the research library. Not a page view. |

### Value vocabularies

Useful when you build reports or spot-check data.

- **`page_type`** — `home`, `entity`, `directory`, `article`, `paper`, `page`,
  `library-index`, `not-found`, `manage`, `admin-form`, `unknown`.
  `unknown` means the failsafe fired because the app did not boot; a persistent rise in
  it is a site fault worth reporting.
- **`content_group`** — `home`, `products`, `features`, `solutions`, `use-cases`,
  `resources`.
- **`step_name`** — `1`, `2`, `3`, `pending`, `confirmed`, `attention`. For the manage
  page: `home`, `reschedule`, `pending`, `result`, `attention`.
- **`country`** — 11 ISO-2 codes: `GB, US, MT, GI, SE, DE, ES, IE, AU, CW, CR`.
- **`products`** — pipe-joined from exactly four values: `Jurnii UX`, `Jurnii 360`,
  `Jurnii Cortex`, `Partnership`. `product_count` is 0–4.
- **`booking_host`** — `fraser`, `marlon`, `timothy`.
- **`lead_source`** — `Advertisement, Employee Referral, External Referral, Trade Show,
  Facebook, Twitter, Linkedin, Apollo, Clay, Website`.
- **`form_placement`** — `site-demo-modal` (the public site), `internal-booking` (the
  internal form).
- **`cta_id`** — `nav-primary`, `nav-mobile`, `demo-band`, `sticky-mobile`, `home-hero`,
  `home-product-tab-ux|360|mmm`, `pricing-*`, `entity-hero-primary`,
  `entity-hero-usecase`, `entity-hero-static`, `cta-band-primary`, `cta-band-secondary`,
  `ux-telemetry-band`, `price-boost-teaser`, `admin-form`.
  **`unstamped-*` indicates a site bug** — a CTA was added without an identifier. Report
  any you see.
- **`error_code` / `outcome_code`** — one of:
  `generic, offline, store_unavailable, calendar_misconfigured, availability_unavailable,
  business_email_required, email_invalid, name_required, company_required,
  job_title_required, job_title_other_required, product_invalid, lead_source_invalid,
  booking_host_required, booking_host_invalid, session_expired, country_unknown,
  country_dial_mismatch, phone_missing, phone_too_short, phone_too_long, slot_required,
  slot_taken, slot_malformed, slot_unaligned, slot_outside_hours, slot_too_soon,
  slot_beyond_horizon, booking_pending, booking_pending_slow, booking_failed,
  already_booked, booking_cancelled, manage_link_invalid, action_in_progress,
  reschedule_pending, reschedule_done, cancel_pending, cancel_done,
  cancellation_disabled, not_confirmed, unmapped`.
  `unmapped` indicates a site bug — report any you see.

### Privacy — a hard boundary

The site never emits names, email addresses, phone numbers, company names, free-text job
titles, booking IDs or journey IDs. This is enforced in the site's own code and covered
by an automated test.

**Do not attempt to add any of them to the data layer, to a GTM variable, or to a GA4
parameter, and do not enable any GA4 feature that would collect them.** If a request or
instruction would require it, stop and report instead.

---

## 7. GA4 property configuration

**Navigate:** GA4 → Admin (gear icon, bottom left).

### 7.1 Data stream settings — do these first

Admin → *Data streams* → click the web stream.

**a) Enhanced measurement — turn OFF two toggles.** Click the gear beside "Enhanced
measurement".

| Toggle | Set to | Why |
|---|---|---|
| **Page changes based on browser history events** | **OFF** | The research library filters without reloading the page. Left on, every filter click is counted as an extra page view of the library. The `filter_apply` event replaces it. |
| **Form interactions** | **OFF** | It would fire against the booking form's own steps and collide with the `booking_*` events, double-counting the funnel. |

Leave the other enhanced-measurement toggles (scrolls, outbound clicks, site search, video,
file downloads) at their defaults.

**b) Redact data — this is a privacy control, not an optimisation.**

In the data stream, open *Configure tag settings* → *Show all* → **Redact data**.

- Ensure **email redaction** is **on**.
- Under URL query parameters, add: **`token`** and **`id`**

> The booking-management page URL contains a signed token that permits rescheduling and
> cancelling a booking. The site already strips it before anything is sent, but this is an
> independent second layer that also protects against any future tag reading the raw URL.
> **Do not skip this on the grounds that the first layer exists.**

### 7.2 Property settings

| Setting | Where | Value |
|---|---|---|
| Data retention | Admin → Data settings → Data retention | **14 months** (the 2-month default is almost never wanted) |
| Google Signals | Admin → Data settings → Data collection | **Off** — B2B audience, little demographic value, and it does not sit well with a site that currently has no cookie consent banner |
| Internal traffic | Admin → Data streams → *Configure tag settings* → Define internal traffic | Define a rule for the office/VPN IP ranges, `traffic_type` = `internal` |
| **Activate** the internal filter | Admin → Data settings → Data filters | Set the *Internal Traffic* filter state to **Active** |
| Unwanted referrals | Admin → Data streams → *Configure tag settings* → List unwanted referrals | `jurnii.io`, `library.jurnii.io`, `app.jurnii.io` |

> The internal-traffic step is two separate actions and the second is the one usually
> missed. A defined filter left in **Testing** state filters nothing. Set it to Active.

### 7.3 Custom dimensions and metrics

**Navigate:** Admin → *Custom definitions*.

GA4 does **not** backfill: a parameter collected before its dimension is registered is not
reportable for the period before registration. **Register these before publishing the
container in Section 9.**

**Custom metrics** — Custom definitions → *Custom metrics* tab → Create. Scope **Event**,
Unit of measurement **Standard**:

| Metric name | Event parameter |
|---|---|
| Product count | `product_count` |
| Booking lead time (days) | `lead_time_days` |
| Step number | `step_number` |

**Custom dimensions** — *Custom dimensions* tab → Create. Scope **Event** for all:

| Dimension name | Event parameter |
|---|---|
| Page type | `page_type` |
| Content section | `content_section` |
| Content slug | `content_slug` |
| Content category | `content_category` |
| Content medium | `content_medium` |
| Content author | `content_author` |
| Content filter | `content_filter` |
| Template | `template` |
| Surface | `surface` |
| Canonical path | `canonical_path` |
| Step name | `step_name` |
| Error code | `error_code` |
| Outcome code | `outcome_code` |
| Notice tone | `tone` |
| Booking country | `country` |
| Products | `products` |
| Marketing consent | `marketing_consent` |
| Job title other | `job_title_other` |
| Lead source | `lead_source` |
| Booking host | `booking_host` |
| Form placement | `form_placement` |
| CTA id | `cta_id` |
| Form variant | `form_variant` |
| CTA label | `cta_label` |
| CTA location | `cta_location` |
| CTA href | `cta_href` |
| CTA intercepted | `intercepted` |
| Has meet link | `has_meet_link` |
| Filter scope | `filter_scope` |
| Filter value | `filter_value` |

That is 30 dimensions and 3 metrics. The property limit is 50 event-scoped dimensions, so
there is headroom.

> **Do not register `content_group`.** GA4 collects a parameter of that exact name into
> its built-in **Content group** dimension automatically. Registering it as a custom
> dimension creates a confusing duplicate.

### 7.4 Key events (conversions)

**Navigate:** Admin → *Key events* (called *Conversions* in older UI).

| Event name | Mark as key event | Why |
|---|---|---|
| `booking_confirmed` | **Yes — the primary conversion** | A demo booking was confirmed |
| `booking_step_complete` | Optional secondary | The point a visitor commits real company details |

If `booking_confirmed` does not yet appear in the list (it only appears after the event
has been seen at least once), use **"Create key event"** and type the name
`booking_confirmed` manually.

---

## 8. Verification — before publishing

### 8.1 GTM Preview

1. In GTM, click **Preview**. Enter `https://jurnii.io` and connect.
2. Check each of these and record the result:

| Check | Expected |
|---|---|
| On the homepage, the event list shows | `page_context_ready` exactly **once** |
| `GA4 – Google Tag` | Fired, **once** |
| Its `page_title` | A real page title, **not** the generic homepage title on every page |
| Navigate to `/features/attribution` | `page_context_ready` again, with `page_type: entity` and a *different* `page_title` |
| Navigate to `/library` | `page_type: library-index` |
| Click a category filter pill on `/library` | `filter_apply` fires; **no** second `page_context_ready`, and the Google tag does **not** fire again |
| Click a "Book a demo" button | `cta_click` with a specific `cta_id`, then `booking_open` |
| Click a **different** "Book a demo" button (e.g. the nav vs. the pricing table) | A **different** `cta_id` — if both report the same value, something is wrong; report it |

3. Preview `https://jurnii.io/admin-form`: expect `page_context_ready` with
   `page_type: admin-form`, then `booking_open` with `form_placement: internal-booking`.

### 8.2 GA4 DebugView

With GTM Preview still connected, open GA4 → Admin → **DebugView**.

- Confirm `page_view` arrives with a real `page_title` and a `page_location` beginning
  `https://jurnii.io`.
- Click a CTA and confirm `cta_click` arrives with its parameters populated.
- **Confirm no parameter anywhere contains an email address, personal name, phone number
  or long UUID.** If one does, stop, do not publish, and report it as a privacy defect.

### 8.3 The negative checks

These are as important as the positive ones:

- No GA4 tag is attached to All Pages, Initialization, Consent Initialization, DOM Ready
  or Window Loaded.
- The Google tag fires **once** per page, not twice.
- Navigating between pages does not produce duplicate `page_view` events.

---

## 9. Publish

Only once Section 8 passes.

GTM → **Submit** → Version name `GA4 initial configuration`, description summarising what
you created → **Publish**.

Record the version number in your report — it is the rollback point.

---

## 10. Rollback

If anything looks wrong after publishing: GTM → *Versions* → find the version immediately
before yours → **Publish** it. That reverts the container within minutes.

GA4 property settings are not versioned. If you change a data-stream or property setting,
note the previous value in your report so it can be restored manually.

---

## 11. Report back with

1. The **GA4 Measurement ID** you used.
2. **Created:** counts of variables, triggers and tags, and any item that already existed
   (and whether you corrected it).
3. **GA4 settings:** each item in Section 7 marked done / already correct / not possible,
   with the previous value where you changed one.
4. **Custom definitions:** how many dimensions and metrics registered; note if you hit the
   50-dimension cap.
5. **Verification results:** the Section 8.1 table with actual observed values, and
   confirmation of the 8.2 privacy check.
6. **The published GTM version number.**
7. **Anything you could not do**, with the reason — missing permission, a UI that did not
   match this document, or a setting you could not confidently identify.
8. **Site bugs observed:** any `unstamped-*` `cta_id`, any `unmapped` error code, or an
   unexpectedly high rate of `page_type: unknown`. These are defects in the website, not
   in your configuration, and should be passed back to the engineering team.

---

## Appendix — what is deliberately *not* configured

Do not add these unless separately asked. Their absence is a decision, not an oversight.

- **Consent Mode / a cookie banner.** The site currently has neither. Any GA4 tag you
  create will set cookies for UK and EU visitors with no consent gate. This is known and
  was accepted for this phase. If you are asked to add Consent Mode later, the site has a
  reserved slot for the default block ahead of the container snippet.
- **Offline conversion import.** Meeting outcomes (held, no-show, qualified) live in the
  CRM and are not fed to GA4. Doing so needs site and backend changes first.
- **Outbound link, file download, video and scroll tracking** beyond GA4's enhanced
  measurement defaults.
- **Server-side tagging.**
