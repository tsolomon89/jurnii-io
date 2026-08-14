# Analytics: GTM, GA4 and the dataLayer contract

Container **`GTM-PGVJ4K9T`**, installed on all three served pages. This is the
specification for what the container sees and what must be configured in Google's
consoles to make it reportable.

Everything described as "in code" is implemented and verified.

**The GTM and GA4 console configuration is NOT done yet.** The container collects events,
but until it is configured the reports will be wrong in specific, predictable ways.

> ### → [analytics-gtm-ga4-agent-runbook.md](analytics-gtm-ga4-agent-runbook.md)
>
> That is the **executable runbook** for the console work: every variable, trigger and tag
> with its exact field values, the GA4 admin settings, the custom-dimension registrations,
> and a verification pass. It is self-contained and written to be handed to an operator or
> an AI agent with browser access — it needs no access to this repository.
>
> **This document is the engineering reference: why the design is what it is.** The
> runbook is the authority on what to click. If the two ever disagree about a value, the
> runbook is what was built against — fix the drift rather than following both.

---

## Part 1 — Scope and standing rules

**In scope:** the web funnel. Page views, CTA clicks, booking form progression, and the
booking itself. The conversion is `booking_confirmed`.

**Explicitly out of scope:** what happens after the booking. Zoho tracks meeting
outcomes (held, no-show, qualified) and none of that is fed back to GA4. Doing so would
need a GA4 `client_id` persisted against the journey and a Measurement Protocol call from
the backend. It is a coherent piece of later work; nothing here forecloses it.

### Rule 1 — no personal data in the tag layer, ever

Never emit `firstName`, `lastName`, `email`, `nationalNumber`, `company`, or
`jobTitleOther`.

**Also never `bookingId` or `journeyId`.** They are the same UUID. It is the subject of
the signed manage link and the visitor's own "Booking Reference"
([booking-form.js](../booking/assets/booking-form.js)), which makes it a personal
identifier rather than a transaction id you may hand to a third party. This mirrors the
boundary the server already draws in
[retention.js](../booking/db/queries/retention.js), which nulls PII and keeps only the
`analytics_*` booleans.

Enforced in three places, deliberately overlapping:

1. The widget emits only the safe subset (`analyticsDims`).
2. [analytics-bridge.js](../assets/analytics-bridge.js) drops forbidden keys and refuses
   nested objects — a second, independent gate, because one careless `Object.assign`
   upstream should not be enough to leak.
3. A test walks every event a full journey produces and asserts no PII field name or
   visitor value appears in any of them. **That test must never be weakened.**

### Rule 2 — low cardinality only

| Dimension | Values | Source of truth |
|---|---|---|
| `country` | 11 | [countries.js](../booking/config/countries.js) |
| `products` | 4, pipe-joined | `PRODUCT_OPTIONS` in [booking-form.js](../booking/assets/booking-form.js) |
| `product_count` | 0–4 | derived |
| `marketing_consent` | boolean | |
| `lead_source` | 10 | [lead-sources.js](../booking/config/lead-sources.js) |
| `booking_host` | 3 | [host-calendars.js](../booking/config/host-calendars.js) |
| `form_placement` / `cta_id` / `form_variant` | small, enumerated below | |
| `step_name`, `error_code`, `outcome_code` | enumerated | the `COPY` keys |

`jobTitle` is **excluded**: 415 governed titles plus an `Other` sentinel. Only the
boolean `job_title_other` is emitted — whether they had to type one, never what they
typed.

### Rule 3 — the widget stays vendor-neutral

[booking/README.md](../booking/README.md) offers the booking module as copy-pastable into
another project, so it must not depend on Google. It dispatches
`jurnii:booking` CustomEvents on `window` and stops there.
[analytics-bridge.js](../assets/analytics-bridge.js) is the only file in the repository
that names `dataLayer`. Swapping vendors, or running two, means editing that one file.

A test asserts `booking-form.js` contains no reference to `dataLayer`, `gtag`,
`googletagmanager`, or a container id.

---

## Part 2 — Why the pageview does not fire on All Pages

**This is the single most important thing in this document, and the easiest to
accidentally undo.**

One `index.html` serves all 165 routes and nothing is server-rendered. At the moment GTM
boots in `<head>`, the browser knows nothing about which page it is on. Page identity is
not resolved until `ContentEngineApp`'s routing effect runs — which is after unpkg React
*and* Babel Standalone have downloaded and compiled, behind a 30 ms polling loop in
[index.html](../index.html).

A GA4 tag on **All Pages** would therefore fire before `page_title`, `content_category`
or anything else existed, and pushing the context afterwards cannot retro-fix a hit that
has already been sent.

So: **every page pushes `page_context_ready` exactly once, and the GA4 pageview fires on
that event only.**

Three consequences worth internalising:

- Because every internal link is a full document load — [site.jsx](../assets/site.jsx)
  uses plain `<a href>` throughout and there is no client-side router — "once per
  document" is also "once per pageview". There is no SPA double-count to defend against.
- [index.html](../index.html) carries a **4-second failsafe** that pushes a minimal
  context (`page_type: 'unknown'`) if the SPA never announces. Without it a CDN outage
  would read as zero traffic rather than as degraded traffic. `pushPageContext` inspects
  `dataLayer` before pushing, so a late real resolution cannot stack on top of the
  failsafe.
- Set the GA4 tag to fire **once per page** so the two can never both count.

---

## Part 3 — The dataLayer contract

### `page_context_ready`

Pushed by [page-context.js](../src/analytics/page-context.js). Call sites:
`ContentEngineApp` (content routes), [app.tsx](../src/app.tsx) (the homepage, which
renders `HomeApp` and never reaches the content engine), and inline `<head>` scripts on
`manage.html` and `admin-form.html`.

| Parameter | Notes |
|---|---|
| `page_type` | `home`, `entity`, `directory`, `article`, `paper`, `page`, `library-index`, `not-found`, `manage`, `admin-form`, `unknown` |
| `page_title` | **The real one.** See below. |
| `page_location` | Normalised — Part 5 |
| `canonical_path` | Alias-resolved path |
| `content_group` | `home`, `products`, `features`, `solutions`, `use-cases`, `resources` |
| `content_section`, `content_slug`, `content_category`, `content_medium`, `content_author` | from frontmatter, omitted when absent |
| `content_filter` | the active `?cat=` on the library index |
| `template` | `EntityPageTemplate`, `ArticleTemplate`, … |
| `surface` | `www` or `library` |

Empty strings and `undefined` are **omitted rather than sent blank** — an empty string is
a reportable value in GA4 and would be indistinguishable from a real one.

> **`document.title` was never set anywhere in this codebase.** Every route served the
> hardcoded `index.html` title, so GA4's `page_title` would have read
> "Jurnii · Commercial Intelligence Platform for iGaming Operators" on all 165 pages and
> every page report would have collapsed to one row. `page-context.js` now sets
> `document.title` and `<meta name="description">` — an SEO and accessibility fix as much
> as an analytics one.

### Booking funnel

Emitted from [booking-form.js](../booking/assets/booking-form.js).

| Event | Fires when | Key parameters |
|---|---|---|
| `booking_open` | the widget mounts | `form_placement`, `cta_id`, `form_variant` |
| `booking_step_view` | a `[data-step]` becomes visible | `step_name`, `step_number` |
| `booking_step_complete` | **the server accepted the step** | `step_name`, `step_number`, + dimensions on step 2 |
| `booking_slot_selected` | a time is chosen | `lead_time_days` |
| `booking_error` | a notice is painted | `step_name`, `error_code`, `tone` |
| `booking_confirmed` | **the conversion** | `country`, `products`, `product_count`, `marketing_consent`, `job_title_other`, `lead_time_days`, `has_meet_link`, `form_placement`, `cta_id` |
| `booking_needs_attention` | escalation | `form_placement`, `cta_id` |
| `manage_step_view` / `manage_slot_selected` / `manage_complete` / `manage_error` | the manage page | `step_name`, `outcome_code`, `error_code` |
| `cta_click` | any demo or contact CTA | `cta_id`, `cta_label`, `cta_location`, `cta_href`, `intercepted` |
| `filter_apply` | a library category pill | `filter_scope`, `filter_value` |

**`booking_step_view` and `booking_step_complete` are not the same thing.** A step
becoming visible is not the server having accepted it — completions are emitted only from
the 200 branches of `submitPage1` and `submitPage2`. Conflating them is the standard way
this kind of funnel ends up over-reported, and a test asserts a rejected submit produces
an error and no completion.

**Error codes are machine codes, never rendered copy.** Every visitor-facing string is
authored once in the widget's `COPY` map, and a reverse lookup turns any notice back into
its key. `classifyBooking` and `classifyStatus` already reduce every server outcome to a
code (`slot_taken`, `already_booked`, `booking_failed`, `needs_attention`, …), so the
taxonomy is the code's own, not one invented for reporting. Marketing can reword any
string without breaking a single report.

One deliberate collapse: `slot_malformed` and `slot_unaligned` share a visitor message
(two server reasons, one thing to tell the visitor). First-wins reports both as
`slot_malformed`, which is the right granularity for a funnel.

Note also that the raw `data-step` string is used, **not** `currentStepNumber()` — that
helper coerces `pending`, `confirmed` and `attention` to `1` because the resume snapshot
needs a resumable step. Those three are exactly the states a funnel wants distinguished.

---

## Part 4 — GA4 property configuration

**Not done yet.** The property exists but is largely unconfigured.

**The step-by-step version, with navigation paths and exact values, is Section 7 of the
[agent runbook](analytics-gtm-ga4-agent-runbook.md).** What follows is the reasoning —
several of these are non-obvious and one is a privacy control, so the *why* is recorded
here rather than buried in a click-list.

### Must do before trusting any report

1. **Point the pageview at `page_context_ready`.** Not All Pages. See Part 2. Set the tag
   to fire once per page.
2. **Enhanced measurement → turn OFF "page changes based on browser history events".**
   The library filter calls `history.pushState` on every category pill click, so this
   setting would count a second view of the library index each time. `filter_apply`
   replaces it.
3. **Enhanced measurement → turn OFF form interactions.** It would fire against the
   booking widget's own steps and collide with the explicit `booking_*` events.
4. **Data streams → Redact data → add `token` and `id`** as redacted query parameters.
   The manage page's URL carries a signed reschedule/cancel capability. The page already
   publishes a redacted location to the tag layer; this is the independent second layer
   that also covers any tag reading `location.href` directly. **Do not skip it because
   the first layer exists.**

### Should do

5. **Register custom dimensions** (event-scoped) for every parameter in Part 3. GA4 does
   **not** backfill: a parameter collected before its dimension is registered is not
   reportable for the period before registration. Register before driving traffic. The
   cap is 50 event-scoped dimensions; the contract above uses roughly half.
6. **Key events.** `booking_confirmed` as the single primary conversion. Recommended
   secondary: `booking_step_complete` where `step_name = 2` — the point the visitor has
   committed real firmographics, and the strongest micro-conversion in the funnel.
7. **Data retention → 14 months** (the default of 2 months is rarely what anyone wants).
8. **Internal traffic**: define the filter *and activate it*. Defining without activating
   is the usual mistake — it stays in "testing" mode and filters nothing.
9. **Unwanted referrals**: `jurnii.io`, `library.jurnii.io`, `app.jurnii.io`.
10. **Google Signals: off.** B2B audience, little demographic value, and it sits awkwardly
    with the current no-consent posture.

---

## Part 5 — Page identity and URL normalisation

All of it happens once, inside
[page-context.js](../src/analytics/page-context.js), so it cannot be forgotten per-tag.

| Problem | Rule |
|---|---|
| The manage page's signed `?token=` / `?id=` | stripped |
| `?surface=library` silently reroutes on any host | stripped |
| `?cat=` would split the library index into one row per category | stripped from `page_location`, reported as `content_filter` |
| `library.jurnii.io/{slug}` and `jurnii.io/library/{slug}` are the same article | reported as the www form; `surface` remains a dimension |
| The alias resolver falls back to the **last path segment**, so `/anything/ux` and `/a/b/360` are real pages — unbounded duplicate URLs | `canonical_path` is the resolved path, not `location.pathname` |

**UTM parameters and click ids are deliberately preserved.** GA4 reads campaign
attribution off `page_location`; stripping `utm_*`, `gclid`, `fbclid`, `msclkid`,
`ttclid`, `li_fat_id` or `twclid` would silently turn all paid traffic into direct. A
test asserts they survive.

The reporting origin is the **real** origin, not a hardcoded `jurnii.io` — otherwise every
Vercel preview deploy would report as production and contaminate the live property. The
library subdomain is the one deliberate exception, folded onto its parent.

Note this is intentionally **not** `getCanonicalUrl` from
[surface-utils.ts](../src/routing/surface-utils.ts). That is the SEO canonical, which
keeps the two surfaces separate on purpose. Measurement wants the opposite: merge, and
keep `surface` as a dimension. You can always split a merged report by a dimension; you
can never merge two rows after collection.

The alias map itself was lifted out of `ContentEngineApp` into
[alias.js](../src/routing/alias.js) precisely so there is one implementation. If the
router and the analytics layer ever disagree about what page a URL is, GA4 reports a page
the visitor was never on.

---

## Part 6 — CTA identity

Every CTA on the site used to submit the same `formPlacement: 'site-demo-modal'`,
`ctaId: 'book-a-demo'` — the nav button, the sticky bar, the hero, the pricing table and
all 94 entity-page heroes were indistinguishable in GA4 **and** in Zoho.

They now carry `data-cta-action="demo"` and a `data-cta-id`:

| `cta_id` | Where |
|---|---|
| `nav-primary`, `nav-mobile` | header |
| `demo-band` | the shared `DemoCTA` band |
| `sticky-mobile` | sticky mobile bar |
| `home-hero`, `home-product-tab-{ux\|360\|mmm}` | homepage |
| `pricing-{plan}` | pricing table |
| `entity-hero-primary` / `-usecase` / `-static` | the three entity hero variants |
| `cta-band-primary` / `-secondary` | `sections: [{type: cta}]` frontmatter |
| `ux-telemetry-band`, `price-boost-teaser` | component CTAs |
| `admin-form` | the internal form |
| `unstamped-{slug}` | **a gap** — see below |

The id names the **slot**, not the page: which page a click happened on is already
carried by `page_location`, so `entity-hero-primary` stays one low-cardinality value
across 94 pages and can still be crossed with the page when a report needs to be specific.

The resolved id is threaded through `openDemoModal(ctaId)` into `JurniiBooking.render`,
and the server already persists `cta_id` and `form_placement`
([validate.js](../booking/lib/validate.js)) — **so a GA4 report and a CRM query can be
joined on the button the visitor actually pressed.** Re-opening the modal from a different
button re-attributes rather than keeping the first one.

### The interception gap this closed

The old handler required `textContent.startsWith('Book a demo')` **and**
`href === '/contact-us'`, case-sensitive. Roughly three dozen CTAs failed it —
`Book a Demo` with a capital D from content frontmatter, `Book a scoping call`,
`Book a 45-min demo`, `Get a custom quote` — and every one of them navigated to
`/contact-us`, which is fifteen lines of markdown **with no booking form on it**. They
were dead ends.

They are fixed **in the templates, not in the content**: the templates stamp any anchor
whose `href` is `/contact-us`, so no markdown file needed editing. Verified in a real
browser: `Book a Demo` and `Book a 45-min demo` now open the modal and report
`cta-band-primary` and `entity-hero-primary` respectively.

`Contact` links in the nav, mobile menu and footer are **deliberately not stamped** —
`/contact-us` does offer email addresses, so that is a real destination. They emit
`cta_click` with `intercepted: false`, so the leak stays measurable instead of becoming
invisible.

An `unstamped-*` id appearing in reports means a CTA was added without a stamp. The label
fallback still opens the modal, so it degrades to "vague attribution" rather than "dead
link" — but it should be treated as a bug.

---

## Part 7 — The GTM container

**The full inventory — 1 constant, 35 data layer variables, 14 triggers, 14 tags, each
with its exact field values — is Sections 3 to 5 of the
[agent runbook](analytics-gtm-ga4-agent-runbook.md).** It is not duplicated here, so
there is one place to change when the contract changes.

The design decisions behind that inventory:

- **Google tag** — override `page_location` and `page_title` from the dataLayer. This is
  the container-side half of both the identical-title fix and the manage-token redaction.
- **Triggers** — one Custom Event trigger per event in Part 3. The pageview fires on
  `page_context_ready` and nothing else.
- **Prefer delegated click triggers over element-presence triggers.** The page polls
  every 30 ms waiting for Babel-compiled globals, so anything timed on `gtm.dom` /
  `gtm.load` that inspects the DOM can run before React has painted. `cta_click` is
  already emitted from a delegated handler, so use that rather than a GTM click trigger.
- CTA selectors, if you ever need them directly: `a[data-cta-action="demo"]` for booking
  intent, `a[href="/contact-us"]:not([data-cta-action])` for the contact leak.

---

## Part 8 — Not yet instrumented

Deliberately out of this piece of work:

- **Outbound clicks.** The complete list is small and known: `app.jurnii.io` (a login
  intent — arguably its own event), `jurnii.featurebase.app/help`, two LinkedIn
  destinations, the Google Meet join link on the confirmed step, and the manage link.
  Plus `mailto:` on contact-us, privacy, and the widget's support fallbacks.
- **File downloads — nothing to track.** `getPdfUrl`
  ([markdown.ts](../src/content-engine/utils/markdown.ts)) is unreachable dead code: no
  `content/library/*.md` ends in `-paper` and no `papers/` directory is ever built, so
  `PaperTemplate`'s "Download PDF Paper" button cannot be reached. There are no `tel:`
  links anywhere either.
- **Engagement**: homepage product tabs, FAQ accordion.
- **Web Vitals.** [web-vitals-init.js](../src/web-vitals-init.js) already collects
  CLS/INP/LCP/FCP/TTFB and is wired in by the build, but only writes `window.__CWV__`.
  Pushing them to `dataLayer` is a few lines.

---

## Part 9 — Data-quality defects that will distort reports

Found while instrumenting. These are not analytics bugs, but they will surface as
analytics noise, and someone will otherwise waste a day debugging the tags.

- **Three homepage CTAs point at 404s.** `/library/compare-ekimetrics`,
  `/library/compare-nielsen`, `/library/compare-ux-agencies` in
  [home-sections.jsx](../assets/home-sections.jsx); the real slugs are `jurnii-vs-*`.
  Three guaranteed not-found views from the highest-traffic page.
- **`?cat=` means two different things.** `ResourcesHub` in
  [page-sections.jsx](../assets/page-sections.jsx) reads it against `guide`, `report`,
  `casestudy`…; the library index reads it against `Playbook`, `Market Intelligence`….
  Same parameter, two vocabularies — hence `filter_scope` on `filter_apply`.
- **Library categories are dirty.** `Competitive Analysis` vs
  `Competitive Intelligence`, `Market Report` vs `Market Intelligence`. Normalise the
  content before leaning on `content_category`.
- **Directory titles render as `"FEATURES"`** — `getByPath` hardcodes
  `section.toUpperCase()` ([markdown.ts](../src/content-engine/utils/markdown.ts)), so
  `page_title` on `/products` is `PRODUCTS · Jurnii`. Correct, but it will read oddly.
- **Two footer links are not measurable and probably not intended**: the footer email is a
  bare `<span>` rather than a `mailto:`, and the footer mail icon is `href="#"`
  ([site.jsx](../assets/site.jsx)).
- **`/features/attribution` reports `content_section: solutions`.** Not a bug in the
  tagging: `getByPath` has a global slug fallback, so that URL genuinely renders an item
  whose section is `solutions`. The dimension reports what was rendered, which is the
  useful answer, but it will look wrong next to the URL.

---

## Part 10 — Consent

**There is no cookie banner and no consent management platform on this site.** The only
`consent` in the codebase is the marketing opt-in checkbox inside the booking form, which
is unrelated.

A bare install was chosen deliberately, so this is a known and accepted state rather than
an oversight — but any GA4 or Ads tag added in the GTM UI will set cookies for UK and EU
visitors with no consent gate.

When a CMP is added, the correct shape is a Consent Mode v2 default block set to `denied`,
placed in `<head>` **before** the container snippet on all three pages — the slot is
already noted in the comment above the snippet in [index.html](../index.html) — with the
CMP calling `gtag('consent', 'update', …)`. No change to the dataLayer contract is needed.

---

## Verifying

- `npm test` — 478 tests. The analytics ones cover URL normalisation, title setting,
  once-per-document announcement, the emitter's event sequence, the adapter's scrubbing,
  and CTA stamping. **The PII-absence test is the one that must never go red.**
- `npm run build`, then confirm `GTM-PGVJ4K9T` appears twice in each of
  `dist/index.html`, `dist/manage.html`, `dist/admin-form.html` (snippet + noscript), and
  that `dist/assets/analytics-bridge.js` exists.
- In a browser against `npm run preview`: `window.dataLayer` should contain exactly one
  `page_context_ready` per page, the tab title should be page-specific, `/a/b/360` should
  report `canonical_path: /products/jurnii-360`, and `/manage.html?token=…` should report
  a `page_location` with no query string.
- After deploy, use GTM Preview against a real emailed manage link — that is the one path
  that cannot be fully exercised locally.
