/* =========================================================================
   Jurnii Booking — the single shared frontend implementation.

   One file powers every surface:
     · the site-wide demo modal    → site.jsx calls JurniiBooking.render(el, {onClose})
     · genuine inline placements   → auto-mounts into #jurnii-booking-form-inline
     · the manage page             → auto-mounts into #jurnii-manage-inline

   There is deliberately no second implementation. `assets/booking-form.js` (the
   legacy Calendar-iframe stub) is deleted: it posted to an empty endpoint, so the
   site's demo modal captured nothing at all.

   ---------------------------------------------------------------------------
   MODULE SHAPE

   A UMD-ish factory rather than a bare IIFE, for one reason: the tests need to
   install the widget against a jsdom window instead of a real one. In a browser
   `globalThis === window` and has a `document`, so the factory runs immediately
   and assigns `window.JurniiBooking` — a plain classic script, exactly as before.
   Under CommonJS the factory is exported un-invoked and nothing global is
   touched.

   ---------------------------------------------------------------------------
   COUNTRY / PHONE CONFIGURATION

   `booking/config/countries.js` is the single source of truth (spec §6) and is
   shared verbatim with the server, which re-derives `phone_e164` and rejects a
   disagreement. The widget therefore never carries its own country table and
   never infers a country from a dial code — the defect this replaces mapped
   `+44` back to "United Kingdom" and concatenated a domestic `07123 456789`
   into `+4407123456789`.

   The config is a separate file, so it is fetched once if the host has not
   already loaded it. `render()` stays synchronous; painting happens on the
   config promise, which is already resolved whenever the host included the
   script itself.
   ========================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  if (root && root.document) root.JurniiBooking = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (win, installOpts) {
  'use strict';

  var opts0 = installOpts || {};
  var doc = win.document;

  // --- configuration --------------------------------------------------------
  var API = trimSlash(win.JURNII_BOOKING_API_BASE || '/api/v1');
  var CONFIG_URL = win.JURNII_BOOKING_CONFIG_URL || '/booking/config/countries.js';
  var JOB_TITLES_URL = win.JURNII_BOOKING_JOB_TITLES_URL || '/booking/config/job-titles.js';
  var LEAD_SOURCES_URL = win.JURNII_BOOKING_LEAD_SOURCES_URL || '/booking/config/lead-sources.js';
  var PROGRESS_KEY = 'jurnii_booking_progress';
  var PROGRESS_TTL_MS = 2 * 60 * 60 * 1000;          // the flow token's own lifetime

  // Cancellation is HIDDEN unless a deployment explicitly opts in. Production runs
  // with `BOOKING_CANCELLATION_ENABLED=false` (§7.2) and a static page cannot read
  // an environment variable, so the default is the safe one: hiding a button that
  // would only ever answer `403 cancellation_disabled`.
  function cancellationEnabled() { return win.JURNII_BOOKING_CANCELLATION_ENABLED === true; }
  function supportEmail() { return win.JURNII_BOOKING_SUPPORT_EMAIL || 'hello@jurnii.io'; }

  var POLL_FIRST_MS = 3000;
  var POLL_MAX_MS = 10000;
  var POLL_GIVE_UP_MS = 3 * 60 * 1000;   // stop asking; the invite is already emailed

  // Whitelisted click ids — the same list the server accepts into attribution_extra.
  var CLICK_IDS = ['gclid', 'fbclid', 'msclkid', 'ttclid', 'li_fat_id', 'twclid'];
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'];

  /**
   * `value` is the canonical Zoho `Product_Interest` string and MUST match live
   * metadata exactly — the live multiselect offers precisely these four. `label` is
   * marketing copy and is never submitted; `booking/tests/zoho-payload.test.js` and
   * the page-2 endpoint both reject a label as a value.
   */
  var PRODUCT_OPTIONS = [
    { value: 'Jurnii UX', label: 'Jurnii UX — User Experience Benchmarking' },
    { value: 'Jurnii 360', label: 'Jurnii 360 — Competitor Surveillance Radar' },
    { value: 'Jurnii Cortex', label: 'Jurnii Cortex — Attribution & Scenarios' },
    { value: 'Partnership', label: 'Partnership — Commercial partnership enquiry' }
  ];

  /* =======================================================================
     Visitor-facing copy, keyed by machine code.

     Server messages are never rendered. Every string a visitor sees is authored
     here, so no reason code, CRM id, calendar id or third-party error fragment
     can reach the page even if a future handler starts echoing one.
     ======================================================================= */
  var COPY = {
    // request/transport
    generic: 'Something went wrong. Please try again.',
    offline: 'We could not reach the server. Please check your connection and try again.',
    store_unavailable: 'We could not save your details just now. Please try again.',
    calendar_misconfigured: 'Booking is temporarily unavailable. Please try again shortly.',
    availability_unavailable: 'We could not load the available times. Please try again.',
    // page 1
    business_email_required: 'Please use your work email address to book a demo.',
    email_invalid: 'Please enter a valid email address.',
    name_required: 'Please provide your first and last name.',
    // page 2
    company_required: 'Please provide your company name.',
    job_title_required: 'Please choose your job title.',
    job_title_other_required: 'Please tell us your job title.',
    product_invalid: 'Please choose from the listed products.',
    lead_source_invalid: 'That lead source is not available. Please choose another.',
    booking_host_required: 'Please choose a booking host.',
    booking_host_invalid: 'That booking host is not available. Please choose another.',
    session_expired: 'Your session expired. Please enter your details again.',
    country_unknown: 'Please choose your country.',
    country_dial_mismatch: 'That dialling code does not match the country you selected.',
    phone_missing: 'Please enter your phone number.',
    phone_too_short: 'That phone number looks too short.',
    phone_too_long: 'That phone number looks too long.',
    // slots
    slot_required: 'Please choose a date and time for your demo.',
    slot_taken: 'That time was just taken. Please choose another.',
    slot_malformed: 'Please choose a time from the calendar.',
    slot_unaligned: 'Please choose a time from the calendar.',
    slot_outside_hours: 'That time is outside our briefing hours. Please choose another.',
    slot_too_soon: 'That time is too soon. Please choose a later slot.',
    slot_beyond_horizon: 'That time is too far ahead. Please choose an earlier slot.',
    // booking outcomes
    booking_pending: 'Confirming your booking — this usually takes a few seconds.',
    booking_pending_slow: 'This is taking longer than usual. Your invitation will be emailed to you as soon as it is confirmed.',
    booking_failed: 'We could not hold that time after all. Please choose another slot.',
    already_booked: 'You already have a demo booked. Please use the link in your confirmation email to change it.',
    booking_cancelled: 'This booking has been cancelled.',
    // manage
    manage_link_invalid: 'This management link is invalid or has expired. Please use the link from your booking confirmation email.',
    action_in_progress: 'A change to this booking is already in progress. Please try again in a moment.',
    reschedule_pending: 'Updating your booking — this usually takes a few seconds.',
    reschedule_done: 'Your demo has been moved. An updated calendar invitation has been sent to your email.',
    cancel_pending: 'Cancelling your booking — this usually takes a few seconds.',
    cancel_done: 'Your demo has been cancelled. You can book again any time.',
    cancellation_disabled: 'To cancel this booking, please contact us.',
    not_confirmed: 'This booking is not currently active.'
  };

  function copy(key) {
    return (key && COPY[key]) || COPY.generic;
  }

  /* =======================================================================
     Analytics emission — deliberately vendor-neutral.

     This module is meant to be copy-pasted into another project (README §"Install"),
     so it must not know that Google Tag Manager, or any particular analytics vendor,
     exists. It dispatches a plain DOM CustomEvent and lets the host decide. In this
     repo `assets/analytics-bridge.js` is the adapter that forwards it on.

     WHAT MAY BE EMITTED, AND WHAT MAY NOT

     Only low-cardinality, non-identifying values: country, products, step, outcome
     code, placement. Never firstName, lastName, email, nationalNumber, company or
     jobTitleOther — and never journeyId or bookingId, which are the same UUID: it is
     the subject of the signed manage link and the visitor's own booking reference, so
     it is a personal identifier rather than a transaction id. The server draws this
     same line in db/queries/retention.js, which nulls PII and keeps only the
     analytics_* booleans. A test asserts no emitted payload crosses it.
     ======================================================================= */

  /**
   * Every visitor-facing string is authored once in COPY, so a reverse map turns any
   * rendered notice back into its machine code — no third argument threaded through
   * the ~30 notice() call sites, and no risk of a caller inventing a code that does
   * not exist.
   *
   * `slot_malformed` and `slot_unaligned` share one string on purpose (two server
   * reasons, one thing to tell the visitor). First-wins collapses them, which is the
   * granularity a report wants anyway.
   */
  var CODE_BY_COPY = (function () {
    var map = {};
    for (var key in COPY) {
      if (Object.prototype.hasOwnProperty.call(COPY, key) && !map[COPY[key]]) {
        map[COPY[key]] = key;
      }
    }
    return map;
  })();

  function emit(name, detail) {
    if (!win || typeof win.dispatchEvent !== 'function') return;

    var payload = { event: name };
    if (detail) {
      for (var k in detail) {
        if (Object.prototype.hasOwnProperty.call(detail, k) &&
            detail[k] !== undefined && detail[k] !== null && detail[k] !== '') {
          payload[k] = detail[k];
        }
      }
    }

    var ev;
    try {
      ev = new win.CustomEvent('jurnii:booking', { detail: payload });
    } catch (e) {
      // Engines where CustomEvent is not constructible.
      if (!win.document || !win.document.createEvent) return;
      ev = win.document.createEvent('CustomEvent');
      ev.initCustomEvent('jurnii:booking', false, false, payload);
    }
    win.dispatchEvent(ev);
  }

  /** Whole days from now to an ISO instant. A useful funnel dimension; not identifying. */
  function daysUntil(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return undefined;
    return Math.max(0, Math.round((t - Date.now()) / 86400000));
  }

  /** The safe subset of the form's own values. Everything omitted here is PII. */
  function analyticsDims(vals) {
    var v = vals || {};
    var products = v.productInterests || [];
    return {
      country: v.countryIso2 || undefined,
      products: products.length ? products.join('|') : undefined,
      product_count: products.length,
      marketing_consent: v.marketingConsent === true,
      // The free-text title itself is PII; whether they had to type one is not.
      job_title_other: v.jobTitle === 'Other',
      lead_source: v.leadSource || undefined,
      booking_host: v.bookingHost || undefined
    };
  }

  /* =======================================================================
     Small helpers
     ======================================================================= */
  function trimSlash(s) { return String(s || '').replace(/\/+$/, ''); }

  function escapeHtml(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** Only ever put an http(s) URL in an href, whoever produced it. */
  function safeUrl(value) {
    var s = String(value === undefined || value === null ? '' : value).trim();
    return /^https?:\/\//i.test(s) ? s : null;
  }

  function genUUID() {
    try {
      if (win.crypto && typeof win.crypto.randomUUID === 'function') return win.crypto.randomUUID();
    } catch (_) { /* fall through */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var rnd = (win.crypto && win.crypto.getRandomValues)
        ? win.crypto.getRandomValues(new Uint8Array(1))[0] % 16
        : Math.floor(Math.random() * 16);
      var v = c === 'x' ? rnd : (rnd & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function icons() { try { if (win.lucide) win.lucide.createIcons(); } catch (_) {} }

  /* -----------------------------------------------------------------------
     Date bucketing — ONE explicit zone.

     The old code built a `YYYY-MM-DD` from local getters and compared it against
     a UTC ISO string with `startsWith`, so an 23:30Z slot bucketed under the
     wrong day for every visitor west of UTC — and `todayStr` came from
     `toISOString()` on a local midnight, which is a different day again.

     The zone is now the visitor's own, consistently: the day a slot is filed
     under is the day its own label reads, and the value submitted is always the
     exact ISO instant the server offered, never a re-derived one. So display and
     submission cannot disagree.
     ----------------------------------------------------------------------- */
  function localDateKey(date) {
    var d = date instanceof Date ? date : new Date(date);
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  }

  /** Parse a `YYYY-MM-DD` key back to LOCAL midnight (`new Date(str)` is UTC). */
  function fromLocalDateKey(key) {
    var p = String(key || '').split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  /** `{ '2026-08-03': [slot, …] }`, keyed in the visitor's zone. */
  function bucketSlotsByLocalDay(slots) {
    var out = {};
    (slots || []).forEach(function (slot) {
      if (!slot || !slot.start) return;
      var d = new Date(slot.start);
      if (isNaN(d.getTime())) return;
      var key = localDateKey(d);
      (out[key] || (out[key] = [])).push(slot);
    });
    Object.keys(out).forEach(function (k) {
      out[k].sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    });
    return out;
  }

  function timeLabel(iso) {
    var d = new Date(iso);
    var t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    var zone = '';
    try {
      var parts = new Intl.DateTimeFormat([], { timeZoneName: 'short' }).formatToParts(d);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'timeZoneName') { zone = parts[i].value; break; }
      }
    } catch (_) { /* zone label is cosmetic */ }
    return zone ? t + ' (' + zone + ')' : t;
  }

  function dateTimeLabel(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      + ' at ' + timeLabel(iso);
  }

  /* =======================================================================
     The shared country config, fetched once.
     ======================================================================= */
  var configPromise = null;

  function loadConfig() {
    if (win.JurniiBookingCountries) return Promise.resolve(win.JurniiBookingCountries);
    if (configPromise) return configPromise;
    configPromise = new Promise(function (resolve, reject) {
      if (!doc) return reject(new Error('no_document'));
      var existing = doc.querySelector('script[data-jurnii-booking-config]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(win.JurniiBookingCountries); });
        existing.addEventListener('error', function () { reject(new Error('config_unavailable')); });
        return;
      }
      var s = doc.createElement('script');
      s.src = CONFIG_URL;
      s.setAttribute('data-jurnii-booking-config', '1');
      s.addEventListener('load', function () {
        if (win.JurniiBookingCountries) resolve(win.JurniiBookingCountries);
        else reject(new Error('config_unavailable'));
      });
      s.addEventListener('error', function () { reject(new Error('config_unavailable')); });
      (doc.body || doc.documentElement).appendChild(s);
    });
    return configPromise;
  }

  /* =======================================================================
     Optional, lazily-fetched input aids.

     DELIBERATELY NOT part of `loadConfig`. The country table gates `paint()` and
     hard-blocks page-2 submission, because the server re-derives E.164 from it and
     the two must agree. These files gate nothing: the job-title list is a typing
     aid over a field that accepts free text anyway, and the lead-source list only
     exists on the internal route. Folding them into the same promise would let a
     404 on a convenience file take the entire booking form down.

     Each therefore resolves to `null` on failure rather than rejecting, and every
     caller degrades to a plain input.
     ======================================================================= */
  var lazyScripts = {};

  function loadScriptOnce(url, attr, read) {
    if (read()) return Promise.resolve(read());
    if (lazyScripts[url]) return lazyScripts[url];
    lazyScripts[url] = new Promise(function (resolve) {
      if (!doc) return resolve(null);
      var done = function () { resolve(read() || null); };
      var existing = doc.querySelector('script[' + attr + ']');
      if (existing) {
        existing.addEventListener('load', done);
        existing.addEventListener('error', function () { resolve(null); });
        return;
      }
      var s = doc.createElement('script');
      s.src = url;
      s.setAttribute(attr, '1');
      s.addEventListener('load', done);
      s.addEventListener('error', function () { resolve(null); });
      (doc.body || doc.documentElement).appendChild(s);
    });
    return lazyScripts[url];
  }

  function loadJobTitles() {
    return loadScriptOnce(JOB_TITLES_URL, 'data-jurnii-booking-job-titles',
      function () { return win.JurniiBookingJobTitles; });
  }

  function loadLeadSources() {
    return loadScriptOnce(LEAD_SOURCES_URL, 'data-jurnii-booking-lead-sources',
      function () { return win.JurniiBookingLeadSources; });
  }

  /* =======================================================================
     First-touch attribution — captured ONCE, then replayed from the snapshot.

     Spec §7.3: first touch is immutable, and the server's Page-1 upsert
     deliberately omits every attribution column from its `DO UPDATE` list. So a
     visitor who lands from an ad, browses, and books three pages later must send
     the ORIGINAL landing URL and UTMs, not the ones visible at submit time.
     ======================================================================= */
  function captureFirstTouch() {
    var loc = win.location || {};
    var params = new (win.URLSearchParams || URLSearchParams)(loc.search || '');
    var out = {
      landing_url: loc.href || null,
      referrer_url: (doc && doc.referrer) || null,
      source_page: loc.pathname || '/',
      client_timezone: null,
      client_locale: (win.navigator && (win.navigator.language || win.navigator.userLanguage)) || null
    };
    try { out.client_timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (_) {}
    UTM_KEYS.forEach(function (k) { out[k] = params.get(k) || null; });
    CLICK_IDS.forEach(function (k) {
      var v = params.get(k);
      if (v) { out.attribution_extra = out.attribution_extra || {}; out.attribution_extra[k] = v; }
    });
    return out;
  }

  /** The stored first touch, or a freshly captured one persisted for next time. */
  function firstTouch() {
    var snap = loadSnapshot();
    if (snap && snap.attribution && snap.attribution.landing_url !== undefined) return snap.attribution;
    var fresh = captureFirstTouch();
    saveSnapshot(Object.assign({}, snap || {}, { attribution: fresh }));
    return fresh;
  }

  /* =======================================================================
     Progress snapshot (resume after refresh, within the flow token's 2h life)
     ======================================================================= */
  function storage() {
    try { return win.localStorage; } catch (_) { return null; }
  }

  function loadSnapshot() {
    var s = storage();
    if (!s) return null;
    try {
      var raw = s.getItem(PROGRESS_KEY);
      if (!raw) return null;
      var snap = JSON.parse(raw);
      if (!snap || typeof snap !== 'object') return null;
      if (snap.saved_at && (Date.now() - snap.saved_at) > PROGRESS_TTL_MS) { clearSnapshot(); return null; }
      return snap;
    } catch (_) { return null; }
  }

  function saveSnapshot(next) {
    var s = storage();
    if (!s) return;
    try {
      var merged = Object.assign({}, next, { saved_at: Date.now() });
      s.setItem(PROGRESS_KEY, JSON.stringify(merged));
    } catch (_) { /* storage full or blocked — non-fatal */ }
  }

  function clearSnapshot() {
    var s = storage();
    if (!s) return;
    try { s.removeItem(PROGRESS_KEY); } catch (_) {}
  }

  /* =======================================================================
     HTTP
     ======================================================================= */
  function request(method, path, body, token) {
    var init = { method: method, headers: {} };
    if (body !== undefined && body !== null) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    if (token) init.headers.Authorization = 'Bearer ' + token;
    return win.fetch(API + path, init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, ok: res.ok, data: data || {} };
      });
    }, function () {
      // A transport failure is NOT an outcome. `status: 0` keeps every classifier
      // from mistaking "we could not ask" for "the server said no".
      return { status: 0, ok: false, data: {}, offline: true };
    });
  }

  /* =======================================================================
     Response classifiers — pure, and the whole API contract in one place.
     Exported for the tests so the contract is asserted directly rather than
     inferred from DOM side effects.
     ======================================================================= */

  /** `POST /bookings` → what the form must do next. */
  function classifyBooking(res) {
    var code = res.data && res.data.code;
    if (res.status === 200 && res.data && res.data.status === 'confirmed') {
      return { action: 'confirmed' };
    }
    if (res.status === 202) return { action: 'poll', pollAfterMs: res.data.pollAfterMs || POLL_FIRST_MS };
    if (res.status === 409) {
      if (code === 'SLOT_TAKEN') return { action: 'reselect', copyKey: 'slot_taken', refresh: true };
      if (code === 'booking_needs_attention') return { action: 'needs_attention' };
      if (code === 'already_booked') return { action: 'message', copyKey: 'already_booked' };
      if (code === 'booking_cancelled') return { action: 'message', copyKey: 'booking_cancelled' };
      return { action: 'reselect', copyKey: 'generic', refresh: true };
    }
    if (res.status === 400) {
      // The slot reason is a machine code; the visitor sees authored copy for it.
      var reason = res.data && res.data.reason;
      return { action: 'reselect', copyKey: COPY[reason] ? reason : 'slot_malformed', refresh: true };
    }
    if (res.status === 502 && code === 'booking_failed') {
      return { action: 'reselect', copyKey: 'booking_failed', refresh: true };
    }
    if (res.status === 503) {
      return { action: 'error', copyKey: code === 'calendar_misconfigured' ? 'calendar_misconfigured' : 'store_unavailable' };
    }
    if (res.status === 0) return { action: 'error', copyKey: 'offline' };
    return { action: 'error', copyKey: 'generic' };
  }

  /**
   * `GET /bookings/{id}/status` → terminal or keep polling.
   *
   * `meetLink: null` is a perfectly valid confirmed booking (§10): the event
   * exists and the invitation is sent, and Google may simply not have minted the
   * conference link yet. It must never be treated as failure.
   */
  function classifyStatus(res) {
    if (res.status !== 200) {
      if (res.status === 401 || res.status === 403) return { terminal: true, kind: 'expired' };
      return { terminal: false, kind: 'retry' };
    }
    var s = res.data && res.data.bookingStatus;
    if (s === 'confirmed') return { terminal: true, kind: 'confirmed' };
    if (s === 'needs_attention') return { terminal: true, kind: 'needs_attention' };
    if (s === 'booking_failed') return { terminal: true, kind: 'booking_failed' };
    if (s === 'cancelled') return { terminal: true, kind: 'cancelled' };
    return { terminal: false, kind: 'pending' };
  }

  /** 3s → 10s, so a slow confirmation does not hammer the endpoint. */
  function nextPollDelay(prev) {
    return Math.min(POLL_MAX_MS, Math.round((prev || POLL_FIRST_MS) * 1.5));
  }

  /* =======================================================================
     Job title — pure helpers.

     The list is 415 governed titles from the persona CSV. It is NOT the live Zoho
     `Job_Title` picklist, which is a curated 154-value subset: the server decides
     which selections may enter the governed picklist and which travel as
     `Job_Title_Raw` only. The browser deliberately makes no such judgement, and
     never derives or submits a Contact Role.
     ======================================================================= */
  var JOB_TITLE_OTHER = 'Other';
  var JOB_TITLE_MAX_VISIBLE = 50;

  /**
   * Case-insensitive substring filter, prefix matches first.
   *
   * Two bands rather than a score: a visitor typing "head" wants "Head of Product"
   * before "Deputy Head of CRM", but beyond that the CSV's own order carries no
   * meaning, so within a band the input order is preserved (`sort` is stable).
   * Returns at most `limit` titles plus the total, so the caller can render a
   * "+N more" hint instead of 400 nodes.
   */
  function filterJobTitles(titles, query, limit) {
    var list = titles || [];
    var q = String(query === undefined || query === null ? '' : query).trim().toLowerCase();
    var cap = limit === undefined ? JOB_TITLE_MAX_VISIBLE : limit;

    var matches;
    if (!q) {
      matches = list.slice();
    } else {
      matches = list.filter(function (t) { return t.toLowerCase().indexOf(q) !== -1; });
      matches.sort(function (a, b) {
        var pa = a.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        var pb = b.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        return pa - pb;
      });
    }
    return { visible: matches.slice(0, cap), total: matches.length };
  }

  /**
   * The one string sent as `jobTitle`.
   *
   * `Other` is a UI sentinel, never a submitted value: it resolves to whatever the
   * visitor typed in the revealed field. The wire contract stays a single title
   * string with no `isOther` flag — the server decides governance from its own
   * picklist snapshot rather than trusting a claim from the browser.
   */
  function effectiveJobTitle(vals) {
    var v = vals || {};
    var chosen = String(v.jobTitle === undefined || v.jobTitle === null ? '' : v.jobTitle).trim();
    if (chosen === JOB_TITLE_OTHER) {
      return String(v.jobTitleOther === undefined || v.jobTitleOther === null ? '' : v.jobTitleOther).trim();
    }
    return chosen;
  }

  /**
   * Canonical product values for submission.
   *
   * Accepts a scalar so a snapshot written by the previous single-select build
   * migrates in place rather than losing the visitor's choice. `Not sure yet` was
   * that build's "no product" sentinel and is still dropped; the current form has
   * no such option — an empty selection means the same thing.
   */
  function productsForSubmit(list) {
    var input = Array.isArray(list) ? list : (list ? [list] : []);
    var out = [];
    var seen = {};
    for (var i = 0; i < input.length; i++) {
      var s = String(input[i] === undefined || input[i] === null ? '' : input[i]).trim();
      if (!s) continue;
      var key = s.toLowerCase();
      if (key === 'not sure yet' || seen[key]) continue;
      seen[key] = true;
      out.push(s);
    }
    return out;
  }

  /**
   * Which manage actions may be offered.
   *
   * Cancellation is gated and hidden by default; an escalated booking hides BOTH
   * actions and shows the support line, because §5.5 refuses every mutating
   * request on such a journey and offering a button that always 409s is worse
   * than offering none.
   */
  function manageActions(status, flags) {
    var f = flags || {};
    var s = (status && status.bookingStatus) || null;
    if (s === 'needs_attention' || (status && status.integrationStatus === 'needs_attention' && s !== 'confirmed')) {
      return { reschedule: false, cancel: false, support: true, attention: true };
    }
    if (s === 'cancelled') return { reschedule: false, cancel: false, support: true, attention: false };
    if (s !== 'confirmed') return { reschedule: false, cancel: false, support: true, attention: false };
    return { reschedule: true, cancel: f.cancellationEnabled === true, support: f.cancellationEnabled !== true, attention: false };
  }

  /* =======================================================================
     Markup
     ======================================================================= */

  /**
   * `showCloseButton` is opt-in and is the host's decision, not a consequence of
   * being embedded.
   *
   * It used to be forced off whenever a host owned the modal, because `site.jsx`
   * painted its own `.demo-modal-close` in a header bar above the card — so the
   * only way to avoid two close controls was for the widget to paint none. That
   * header bar (and the white card it sat on) is gone; the booking card is now the
   * dialog, so the host asks the widget for the ONE close button and it lands
   * anchored inside the card where it belongs.
   *
   * An embedded host that paints its own control simply omits the flag, which is
   * still the default.
   */
  function formMarkup(o) {
    var showClose = o && o.showCloseButton;
    var finishInline = o && o.finishInline;
    return ''
      + '<div class="jurnii-booking-container" data-jurnii-booking-root="1">'
      + '<div class="jurnii-notice" data-role="notice" style="display:none"></div>'
      + (showClose ? '<button type="button" class="jurnii-close-btn" data-role="close" aria-label="Close"><i data-lucide="x" style="width:18px;height:18px;"></i></button>' : '')

      + '<div class="jurnii-progress-container">'
      + '<div class="jurnii-progress-steps">'
      + '<div class="jurnii-step-indicator active" data-step-indicator="1"><div class="jurnii-step-bar"></div><span class="jurnii-step-label">Your details</span></div>'
      + '<div class="jurnii-step-indicator" data-step-indicator="2"><div class="jurnii-step-bar"></div><span class="jurnii-step-label">Company</span></div>'
      + '<div class="jurnii-step-indicator" data-step-indicator="3"><div class="jurnii-step-bar"></div><span class="jurnii-step-label">Book demo</span></div>'
      + '</div></div>'

      /* ---- step 1 ---- */
      + '<div class="jurnii-form-step active" data-step="1">'
      + '<div class="jurnii-form-header"><h3>Let\'s get started</h3>'
      + '<p>Tell us a little bit about yourself so we can customize your platform access and intelligence briefs.</p></div>'
      + '<div class="jurnii-form-grid">'
      + '<div class="jurnii-form-group"><label class="jurnii-label" for="jurnii-first-name">First name *</label>'
      + '<input type="text" class="jurnii-input" id="jurnii-first-name" data-field="firstName" autocomplete="given-name" placeholder="Alex" required></div>'
      + '<div class="jurnii-form-group"><label class="jurnii-label" for="jurnii-last-name">Last name *</label>'
      + '<input type="text" class="jurnii-input" id="jurnii-last-name" data-field="lastName" autocomplete="family-name" placeholder="Mercer" required></div>'
      + '<div class="jurnii-form-group full-width"><label class="jurnii-label" for="jurnii-email">Business email *</label>'
      + '<input type="email" class="jurnii-input" id="jurnii-email" data-field="email" autocomplete="email" placeholder="alex@company.com" required></div>'
      + '<div class="jurnii-form-group full-width" style="margin-top:10px;">'
      + '<label class="jurnii-consent-checkbox"><div class="jurnii-checkbox-wrapper">'
      + '<input type="checkbox" id="jurnii-consent" data-field="marketingConsent"><span class="jurnii-checkbox-checkmark"></span>'
      + '</div><span class="jurnii-consent-text">I consent to receive Jurnii\'s regular market intelligence reports and marketing updates. You can unsubscribe at any time.</span></label>'
      + '</div></div>'
      + '<div class="jurnii-form-actions"><button type="button" class="btn accent lg" data-role="next-1">Next: Company details &rarr;</button></div>'
      + '</div>'

      /* ---- step 2 ---- */
      + '<div class="jurnii-form-step" data-step="2">'
      + '<div class="jurnii-form-header"><h3>Tell us about your organization</h3>'
      + '<p>We tailor Jurnii benchmarking to your specific competitive set and company profile.</p></div>'
      + '<div class="jurnii-form-grid">'
      + '<div class="jurnii-form-group"><label class="jurnii-label" for="jurnii-company">Company / Organization *</label>'
      + '<input type="text" class="jurnii-input" id="jurnii-company" data-field="company" autocomplete="organization" placeholder="e.g. Flutter Entertainment" required></div>'
      + jobTitleMarkup()
      + '<div class="jurnii-form-group"><label class="jurnii-label" for="jurnii-country">Country *</label>'
      + '<select class="jurnii-select" id="jurnii-country" data-field="countryIso2"></select></div>'
      + '<div class="jurnii-form-group"><label class="jurnii-label" for="jurnii-phone">Phone number *</label>'
      + '<input type="tel" class="jurnii-input" id="jurnii-phone" data-field="nationalNumber" autocomplete="tel-national" placeholder="e.g. 7123 456789" required></div>'
      + productMarkup()
      + (o && o.internal ? leadSourceMarkup() : '')
      + (o && o.internal ? bookingHostMarkup() : '')
      + '</div>'
      + '<div class="jurnii-form-actions split">'
      + '<button type="button" class="btn ghost-on-dark sm" data-role="back-2">&larr; Back</button>'
      + '<button type="button" class="btn accent lg" data-role="next-2">Next: Book Demo briefing &rarr;</button>'
      + '</div></div>'

      /* ---- step 3 ---- */
      + '<div class="jurnii-form-step" data-step="3">'
      + '<div class="jurnii-form-header"><h3>Schedule your Jurnii Demonstration</h3>'
      + '<p>Select an available briefing slot in the calendar below. Briefings are conducted virtually in GMT/CET.</p></div>'
      + schedulerMarkup()
      + '<div class="jurnii-form-actions split">'
      + '<button type="button" class="btn ghost-on-dark sm" data-role="back-3">&larr; Back</button>'
      + '<button type="button" class="btn accent lg" data-role="confirm">Confirm Demo briefing</button>'
      + '</div></div>'

      /* ---- step 4: waiting on an uncertain create ---- */
      + '<div class="jurnii-form-step" data-step="pending">'
      + '<div class="jurnii-confirm-state">'
      + '<div class="jurnii-confirm-icon"><i data-lucide="loader" style="width:32px;height:32px;"></i></div>'
      + '<h3>Confirming your booking</h3>'
      + '<p data-role="pending-msg">' + escapeHtml(COPY.booking_pending) + '</p>'
      + '</div></div>'

      /* ---- step 5: confirmation. Every value comes from the response. ---- */
      + '<div class="jurnii-form-step" data-step="confirmed">'
      + '<div class="jurnii-confirm-state">'
      + '<div class="jurnii-confirm-icon"><i data-lucide="check" style="width:32px;height:32px;stroke-width:3;"></i></div>'
      + '<h3>Demo Briefing Confirmed</h3>'
      + '<p>Your product demonstration has been scheduled. Calendar invitation and Google Meet details have been sent to your email.</p>'
      + '<div class="jurnii-confirm-meta">'
      + '<div><span class="label">Briefing Time:</span><span class="val" data-role="confirm-time"></span></div>'
      + '<div><span class="label">Booking Reference:</span><span class="val val-mono" data-role="confirm-ref"></span></div>'
      + '<div data-role="confirm-meet-row" style="margin-top:10px;"><span class="label">Google Meet:</span><span class="val" data-role="confirm-meet"></span></div>'
      + '</div>'
      + '<div data-role="confirm-manage-row" style="margin:4px 0 18px;text-align:center;display:none;">'
      + '<a data-role="confirm-manage" href="#" style="color:var(--jurnii-300);text-decoration:underline;font-size:14px;">Reschedule or cancel this booking</a>'
      + '</div>'
      + (finishInline
        ? '<a href="/" class="btn primary lg">Back to Home</a>'
        : '<button type="button" class="btn primary lg" data-role="finish">Finish &amp; Close</button>')
      + '</div></div>'

      /* ---- needs attention: a human is on it, and no action is offered ---- */
      + attentionMarkup()

      + '</div>';
  }

  /**
   * Job Title — an ARIA 1.2 combobox over the governed list.
   *
   * The input keeps focus throughout and the highlighted option is tracked with
   * `aria-activedescendant` rather than a roving tabindex, which is what lets Tab
   * commit-and-leave instead of stepping through 415 options.
   *
   * The listbox starts empty and `hidden`: nothing is rendered, and the title file
   * is not even fetched, until the field is focused.
   */
  function jobTitleMarkup() {
    return ''
      + '<div class="jurnii-form-group jurnii-combobox" data-role="jobtitle-group">'
      + '<label class="jurnii-label" for="jurnii-job-title">Job Title *</label>'
      + '<input type="text" class="jurnii-input" id="jurnii-job-title" data-field="jobTitle"'
      + ' role="combobox" aria-expanded="false" aria-controls="jurnii-job-title-list"'
      + ' aria-autocomplete="list" aria-haspopup="listbox"'
      + ' autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"'
      + ' placeholder="Start typing, e.g. Head of Product" required>'
      + '<ul class="jurnii-listbox" id="jurnii-job-title-list" role="listbox"'
      + ' aria-label="Job titles" data-role="jobtitle-listbox" hidden></ul>'
      + '<p class="jurnii-field-hint" role="status" aria-live="polite" data-role="jobtitle-status"></p>'
      + '</div>'
      // Revealed only by choosing `Other`. Kept out of the grid flow until then, so
      // the layout does not reserve a gap for a field nobody is using.
      + '<div class="jurnii-form-group" data-role="jobtitle-other-group" hidden>'
      + '<label class="jurnii-label" for="jurnii-job-title-other">Your job title *</label>'
      + '<input type="text" class="jurnii-input" id="jurnii-job-title-other" data-field="jobTitleOther"'
      + ' autocomplete="organization-title" placeholder="e.g. Head of Competitive Intelligence">'
      + '<p class="jurnii-field-hint">'
      + '<button type="button" class="jurnii-linklike" data-role="jobtitle-clear">Choose from the list instead</button>'
      + '</p>'
      + '</div>';
  }

  /**
   * Product Interest — a checkbox group, because Zoho's `Product_Interest` is a
   * multiselect and always was; the single `<select>` was the narrower side of that
   * contract.
   *
   * `value` carries the canonical CRM string and the visible text carries the
   * marketing label. They are separate attributes precisely so a label can never be
   * submitted: the change handler reads `input.value`, never `textContent`.
   *
   * There is no `Not sure yet` option. An untouched group already means "no
   * product" and sends nothing, which is exactly what that option did — while also
   * being a pseudo-product that had to be special-cased on both sides.
   */
  function productMarkup() {
    return ''
      + '<div class="jurnii-form-group full-width">'
      + '<fieldset class="jurnii-checkbox-group" data-role="product-group">'
      + '<legend class="jurnii-label">What are you interested in seeing? (Optional)</legend>'
      + PRODUCT_OPTIONS.map(function (p, i) {
        var id = 'jurnii-product-' + i;
        return '<label class="jurnii-checkbox-option" for="' + id + '">'
          + '<div class="jurnii-checkbox-wrapper">'
          + '<input type="checkbox" id="' + id + '" data-field="productInterests"'
          + ' value="' + escapeHtml(p.value) + '">'
          + '<span class="jurnii-checkbox-checkmark"></span></div>'
          + '<span class="jurnii-checkbox-label">' + escapeHtml(p.label) + '</span>'
          + '</label>';
      }).join('')
      + '<p class="jurnii-field-hint">Choose as many as apply, or leave blank if you are not sure yet.</p>'
      + '</fieldset></div>';
  }

  /**
   * Lead Source — INTERNAL ROUTE ONLY (`/admin-form`).
   *
   * Options are fetched from the generated `lead-sources.js`, whose values come from
   * live Zoho metadata. It is populated at runtime rather than baked in here for the
   * same reason the country select is: a hand-typed CRM picklist value is a silent
   * write failure waiting to happen.
   */
  function leadSourceMarkup() {
    return ''
      + '<div class="jurnii-form-group full-width">'
      + '<label class="jurnii-label" for="jurnii-lead-source">Lead Source (internal)</label>'
      + '<select class="jurnii-select" id="jurnii-lead-source" data-field="leadSource">'
      + '<option value="" selected>Use the default (Website)</option>'
      + '</select>'
      + '<p class="jurnii-field-hint">Recorded against this booking only. Public bookings always use the configured default.</p>'
      + '</div>';
  }

  /**
   * Booking host — INTERNAL ROUTE ONLY (`/admin-form`), and REQUIRED there.
   *
   * On page 2 rather than page 3 because the host decides which calendar page 3 queries:
   * page 1 establishes the journey, page 2 the booking context, page 3 reads availability.
   * The selection is durably on the journey before any slot is shown.
   *
   * Options are fetched from `/booking-hosts` at runtime rather than baked in, for the
   * same reason as the country and Lead Source selects — but here there is a second
   * reason: whether a host is available depends on SERVER configuration (Marlon has no
   * Calendar ID yet), which a static file cannot know. The browser only ever sees opaque
   * keys and labels; a Google Calendar id never reaches it.
   *
   * There is deliberately NO default selection. The public form's host is chosen by the
   * server; an operator's must be chosen by the operator, and the server refuses an
   * internal page-2 commit that names no host.
   */
  function bookingHostMarkup() {
    return ''
      + '<div class="jurnii-form-group full-width">'
      + '<label class="jurnii-label" for="jurnii-booking-host">Booking host / Calendar (internal) *</label>'
      + '<select class="jurnii-select" id="jurnii-booking-host" data-field="bookingHost" required>'
      + '<option value="" selected>Select a host&hellip;</option>'
      + '</select>'
      + '<p class="jurnii-field-hint">Availability and the calendar invite both use this person&rsquo;s calendar.</p>'
      + '</div>';
  }

  function schedulerMarkup() {
    return ''
      + '<div class="jurnii-scheduler-container">'
      + '<div class="jurnii-calendar-wrapper">'
      + '<div class="jurnii-calendar-header"><span data-role="month-title">&mdash;</span>'
      + '<div class="jurnii-calendar-nav">'
      + '<button type="button" class="jurnii-calendar-nav-btn" data-role="cal-prev" aria-label="Previous Month"><i data-lucide="chevron-left" style="width:14px;height:14px;"></i></button>'
      + '<button type="button" class="jurnii-calendar-nav-btn" data-role="cal-next" aria-label="Next Month"><i data-lucide="chevron-right" style="width:14px;height:14px;"></i></button>'
      + '</div></div>'
      + '<div class="jurnii-calendar-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>'
      + '<div class="jurnii-calendar-grid" data-role="cal-grid"></div>'
      + '</div>'
      + '<div class="jurnii-slots-wrapper" data-role="slots">'
      + '<div class="jurnii-slots-empty">Select a date to view available time slots.</div>'
      + '</div></div>';
  }

  /** No reason code, no CRM id, no calendar id, no raw error — §5.5. */
  function attentionMarkup() {
    return ''
      + '<div class="jurnii-form-step" data-step="attention">'
      + '<div class="jurnii-confirm-state">'
      + '<div class="jurnii-confirm-icon" style="background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.18);color:var(--concrete-200);">'
      + '<i data-lucide="life-buoy" style="width:32px;height:32px;"></i></div>'
      + '<h3>We\'re looking into this</h3>'
      + '<p>Something needs a person to check it, and someone is on it. Please contact us and we will sort your booking out.</p>'
      + '<p><a data-role="support-link" href="#" style="color:var(--jurnii-300);text-decoration:underline;"></a></p>'
      + '</div></div>';
  }

  function manageMarkup() {
    return ''
      + '<div class="jurnii-booking-container" data-jurnii-manage-root="1">'
      + '<div class="jurnii-notice" data-role="notice" style="display:none"></div>'

      + '<div class="jurnii-form-step active" data-step="home">'
      + '<div class="jurnii-form-header"><h3>Manage your demo booking</h3>'
      + '<p data-role="home-lede">Loading your booking&hellip;</p></div>'
      + '<div class="jurnii-confirm-meta" data-role="home-meta" style="display:none;">'
      + '<div><span class="label">Briefing Time:</span><span class="val" data-role="home-time"></span></div>'
      + '</div>'
      + '<div class="jurnii-form-actions split" data-role="home-actions" style="display:none;">'
      + '<button type="button" class="btn ghost-on-dark sm" data-role="cancel" style="display:none;">Cancel booking</button>'
      + '<button type="button" class="btn accent lg" data-role="to-reschedule" style="display:none;">Reschedule &rarr;</button>'
      + '</div>'
      + '<p data-role="support" style="display:none;font-size:13px;color:var(--concrete-300);margin-top:18px;"></p>'
      + '</div>'

      + '<div class="jurnii-form-step" data-step="reschedule">'
      + '<div class="jurnii-form-header"><h3>Pick a new time</h3><p>Select an available briefing slot below.</p></div>'
      + schedulerMarkup()
      + '<div class="jurnii-form-actions split">'
      + '<button type="button" class="btn ghost-on-dark sm" data-role="manage-back">&larr; Back</button>'
      + '<button type="button" class="btn accent lg" data-role="manage-confirm">Confirm new time</button>'
      + '</div></div>'

      + '<div class="jurnii-form-step" data-step="pending">'
      + '<div class="jurnii-confirm-state">'
      + '<div class="jurnii-confirm-icon"><i data-lucide="loader" style="width:32px;height:32px;"></i></div>'
      + '<h3>Updating your booking</h3><p data-role="pending-msg"></p>'
      + '</div></div>'

      + '<div class="jurnii-form-step" data-step="result">'
      + '<div class="jurnii-confirm-state">'
      + '<div class="jurnii-confirm-icon"><i data-lucide="check" style="width:32px;height:32px;stroke-width:3;"></i></div>'
      + '<h3 data-role="result-title">Done</h3><p data-role="result-msg"></p>'
      + '<a href="/" class="btn primary lg">Back to Home</a>'
      + '</div></div>'

      + attentionMarkup()
      + '</div>';
  }

  /* =======================================================================
     A scheduler bound to one container — shared by booking and reschedule.
     ======================================================================= */
  function createScheduler(root, hooks) {
    var slots = [];
    var byDay = {};
    var selectedDay = null;
    var selectedStart = null;
    var month = new Date();
    month.setDate(1);
    // Which host the CURRENT `slots` belong to, so a change can invalidate them.
    var loadedHostKey = null;

    var q = function (role) { return root.querySelector('[data-role="' + role + '"]'); };
    var authToken = function () { return hooks && hooks.authToken ? hooks.authToken() : null; };
    var hostKey = function () { return hooks && hooks.hostKey ? hooks.hostKey() : null; };

    function load() {
      var grid = q('cal-grid');
      if (grid) grid.innerHTML = '';
      var panel = q('slots');
      if (panel) panel.innerHTML = '<div class="jurnii-slots-empty">Loading available times&hellip;</div>';
      var requestedHost = hostKey();
      /**
       * The token is what makes availability journey-aware. The server resolves the host
       * from the journey — not from anything this request could name — so the calendar
       * whose slots are shown is by construction the calendar the event lands on. An
       * anonymous request still gets the public host, which is why the public form is
       * unchanged in behaviour.
       */
      return request('GET', '/availability', null, authToken()).then(function (res) {
        if (res.status !== 200) {
          slots = []; byDay = {};
          // A stale selection must not survive a failed load either: it would be a slot
          // from a host we can no longer confirm.
          selectedDay = null; selectedStart = null; loadedHostKey = null;
          renderMonth();
          if (res.status === 401 && hooks && hooks.onAuthLost) {
            // The flow token expired. Availability now fails closed rather than quietly
            // serving the public host's slots, so retrying would loop on 401 — restart
            // the journey instead of showing an error the visitor cannot clear.
            hooks.onAuthLost();
            return false;
          }
          // 503 availability_unavailable is explicit and retryable — never a
          // silently all-disabled calendar, which is what the old form showed.
          renderSlotsError();
          return false;
        }
        slots = (res.data && res.data.slots) || [];
        byDay = bucketSlotsByLocalDay(slots);
        // Open on the first month that actually has a slot.
        var days = Object.keys(byDay).sort();
        if (days.length) { month = fromLocalDateKey(days[0]); month.setDate(1); }
        /**
         * Two independent reasons to drop the selection, and BOTH are needed.
         *
         * A different host means the slot belonged to somebody else's calendar, even if
         * the same instant happens to be free on this one. And whatever the host, a
         * selected start that is no longer offered must go: clearing only when the whole
         * DAY vanishes left a stale `selectedStart` alive whenever the day still had any
         * other slot, which `submitBooking` would then send.
         */
        if (loadedHostKey !== requestedHost) { selectedDay = null; selectedStart = null; }
        loadedHostKey = requestedHost;
        if (selectedDay && !byDay[selectedDay]) { selectedDay = null; selectedStart = null; }
        if (selectedStart && !slots.some(function (s) { return s.start === selectedStart; })) {
          selectedStart = null;
        }
        renderMonth();
        renderSlots();
        return true;
      });
    }

    function renderSlotsError() {
      var panel = q('slots');
      if (!panel) return;
      panel.innerHTML = '<div class="jurnii-slots-empty">' + escapeHtml(COPY.availability_unavailable)
        + '<br><br><button type="button" class="btn ghost-on-dark sm" data-role="retry-availability">Try again</button></div>';
      var btn = panel.querySelector('[data-role="retry-availability"]');
      if (btn) btn.addEventListener('click', function () { load(); });
    }

    function renderMonth() {
      var title = q('month-title');
      var grid = q('cal-grid');
      if (!grid) return;
      var year = month.getFullYear();
      var mon = month.getMonth();
      var names = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      if (title) title.textContent = names[mon] + ' ' + year;

      var now = new Date();
      var prev = q('cal-prev');
      if (prev) prev.disabled = (year === now.getFullYear() && mon === now.getMonth());

      grid.innerHTML = '';
      var firstIdx = new Date(year, mon, 1).getDay();
      var total = new Date(year, mon + 1, 0).getDate();
      var todayKey = localDateKey(now);

      for (var i = 0; i < firstIdx; i++) {
        var blank = doc.createElement('div');
        blank.className = 'jurnii-calendar-day empty';
        grid.appendChild(blank);
      }
      for (var day = 1; day <= total; day++) {
        var key = year + '-' + String(mon + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        var cell = doc.createElement('button');
        cell.type = 'button';
        cell.textContent = String(day);
        cell.setAttribute('data-day', key);
        var dow = new Date(year, mon, day).getDay();
        if (key < todayKey) {
          cell.className = 'jurnii-calendar-day past';
          cell.disabled = true;
        } else if (dow === 0 || dow === 6) {
          cell.className = 'jurnii-calendar-day weekend';
          cell.disabled = true;
        } else if (byDay[key] && byDay[key].length) {
          cell.className = 'jurnii-calendar-day available' + (selectedDay === key ? ' selected' : '');
          cell.addEventListener('click', onDayClick);
        } else {
          cell.className = 'jurnii-calendar-day past';
          cell.disabled = true;
        }
        grid.appendChild(cell);
      }
    }

    function onDayClick(e) {
      e.preventDefault();
      selectedDay = e.currentTarget.getAttribute('data-day');
      selectedStart = null;
      renderMonth();
      renderSlots();
      if (hooks && hooks.onSelect) hooks.onSelect(null);
    }

    function renderSlots() {
      var panel = q('slots');
      if (!panel) return;
      if (!selectedDay) {
        panel.innerHTML = '<div class="jurnii-slots-empty">Select a date to view available time slots.</div>';
        return;
      }
      var list = byDay[selectedDay] || [];
      var heading = fromLocalDateKey(selectedDay)
        .toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      var html = '<h4 class="jurnii-slots-title">Available slots for ' + escapeHtml(heading) + ':</h4>';
      if (!list.length) {
        panel.innerHTML = html + '<div class="jurnii-slots-empty">No slots available for this day.</div>';
        return;
      }
      html += '<div class="jurnii-slots-grid">' + list.map(function (slot) {
        var sel = selectedStart === slot.start ? ' selected' : '';
        return '<button type="button" class="jurnii-time-slot-btn' + sel + '" data-start="'
          + escapeHtml(slot.start) + '">' + escapeHtml(timeLabel(slot.start)) + '</button>';
      }).join('') + '</div>';
      panel.innerHTML = html;
      Array.prototype.forEach.call(panel.querySelectorAll('.jurnii-time-slot-btn'), function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          // The value submitted is the server's own ISO string, untouched.
          selectedStart = btn.getAttribute('data-start');
          Array.prototype.forEach.call(panel.querySelectorAll('.jurnii-time-slot-btn'), function (b) {
            b.classList.remove('selected');
          });
          btn.classList.add('selected');
          if (hooks && hooks.onSelect) hooks.onSelect(selectedStart);
        });
      });
    }

    var prevBtn = q('cal-prev');
    if (prevBtn) prevBtn.addEventListener('click', function (e) {
      e.preventDefault();
      month.setMonth(month.getMonth() - 1);
      renderMonth();
    });
    var nextBtn = q('cal-next');
    if (nextBtn) nextBtn.addEventListener('click', function (e) {
      e.preventDefault();
      month.setMonth(month.getMonth() + 1);
      renderMonth();
    });

    return {
      load: load,
      reload: load,
      selected: function () { return selectedStart; },
      clearSelection: function () { selectedStart = null; renderSlots(); },
      renderMonth: renderMonth
    };
  }

  /* =======================================================================
     The booking form
     ======================================================================= */
  function createBooking(container, options) {
    var opts = options || {};
    // NB: no `embedded` local. It used to suppress the close button; that is now the
    // host's explicit `showCloseButton`. `resolveEmbedded` still governs whether this
    // module opens a modal of its own, and is consulted in `render` and `bootstrap`.
    var data = readPlacement(container, opts);
    var internal = resolveInternal(container, opts);

    /**
     * The same three values the server stores as form_placement / cta_id /
     * form_variant. Emitting them under matching names is what lets a GA4 report and a
     * CRM query be joined on the button a visitor actually pressed.
     */
    function placementDims() {
      return {
        form_placement: data.formPlacement || undefined,
        cta_id: data.ctaId || undefined,
        form_variant: data.formVariant || undefined
      };
    }

    var countries = null;
    var poller = null;
    var destroyed = false;

    var vals = {
      firstName: '', lastName: '', email: '', marketingConsent: false,
      company: '', jobTitle: '', jobTitleOther: '', countryIso2: 'GB',
      nationalNumber: '', productInterests: [], leadSource: '', bookingHost: ''
    };
    var journeyId = null;
    var journeyEmail = null;
    var token = null;
    var scheduler = null;
    var root = null;
    var titles = null;                 // the governed job-title list, once fetched

    function q(role) { return root && root.querySelector('[data-role="' + role + '"]'); }
    function field(name) { return root && root.querySelector('[data-field="' + name + '"]'); }
    /** The checkbox-group form of `field`; `querySelector` only ever finds the first. */
    function fields(name) {
      return root ? Array.prototype.slice.call(
        root.querySelectorAll('[data-field="' + name + '"]')) : [];
    }

    function notice(msg, tone) {
      var el = q('notice');
      if (!el) return;
      if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
      el.textContent = msg;
      el.setAttribute('data-tone', tone || 'error');
      el.style.cssText = 'display:block;padding:12px;border-radius:6px;margin-bottom:16px;font-size:14px;text-align:center;'
        + (tone === 'info'
          ? 'color:#0b6b3a;background:rgba(16,185,129,0.10);border:1px solid rgba(16,185,129,0.25);'
          : 'color:#ff5252;background:rgba(255,82,82,0.1);border:1px solid rgba(255,82,82,0.2);');

      // The machine code, never the rendered sentence: copy gets reworded, reports
      // should not break when it does.
      emit('booking_error', {
        step_name: activeStepName(),
        error_code: CODE_BY_COPY[msg] || 'unmapped',
        tone: tone || 'error'
      });
    }

    function clearFieldErrors() {
      // `.jurnii-select` as well as `.jurnii-input`: markInvalid() adds `.error` to
      // whatever [data-field] matches, so a select marked invalid was previously never
      // cleared and stayed red for the rest of the session. Country had this latent bug;
      // the required host selector would have hit it on every corrected submission.
      Array.prototype.forEach.call(
        root.querySelectorAll('.jurnii-input.error, .jurnii-select.error'), function (el) {
          el.classList.remove('error');
        });
    }
    function markInvalid(name) {
      var el = field(name);
      if (el) el.classList.add('error');
    }

    function showStep(step) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-step]'), function (el) {
        el.classList.toggle('active', el.getAttribute('data-step') === String(step));
      });
      var numeric = Number(step);
      Array.prototype.forEach.call(root.querySelectorAll('[data-step-indicator]'), function (el) {
        var idx = Number(el.getAttribute('data-step-indicator'));
        el.classList.remove('active', 'completed');
        if (!numeric) { if (idx <= 3) el.classList.add('completed'); return; }
        if (idx === numeric) el.classList.add('active');
        else if (idx < numeric) el.classList.add('completed');
      });
      icons();

      // A step becoming VISIBLE. Not the same as the server having accepted it — see
      // booking_step_complete, emitted only from the submit success branches. Counting
      // these as completions is the usual way a funnel ends up over-reported.
      emit('booking_step_view', { step_name: String(step), step_number: Number(step) || undefined });
    }

    function setLoading(role, on) {
      var btn = q(role);
      if (!btn) return;
      if (on) {
        btn.disabled = true;
        if (!btn.getAttribute('data-label')) btn.setAttribute('data-label', btn.textContent);
        btn.textContent = 'Processing...';
      } else {
        btn.disabled = false;
        var label = btn.getAttribute('data-label');
        if (label) btn.textContent = label;
      }
    }

    /* ---- paint ---- */
    function paint() {
      if (destroyed) return;
      root = container;
      container.innerHTML = formMarkup({
        showCloseButton: opts.showCloseButton === true,
        // A host that supplied `onClose` gets a button that calls it; a genuine
        // inline placement has nothing to close, so it gets a home link instead.
        finishInline: typeof opts.onClose !== 'function',
        internal: internal
      });
      populateCountries();
      bind();
      restore();
      icons();
      if (internal) { populateLeadSources(); populateBookingHosts(); }
    }

    /**
     * INTERNAL ROUTE ONLY. Unlike Lead Source, failure here is NOT silently safe: with no
     * options the operator cannot choose a host, and the server refuses an internal
     * page-2 commit that names none. That refusal is the correct outcome — a booking on
     * the public host that nobody chose would be worse — so the failure is surfaced.
     *
     * An unconfigured host (Marlon, until his Calendar ID is supplied) is rendered but
     * DISABLED. Hiding him would be indistinguishable from a bug; showing him greyed out
     * says "known, not yet available". The server refuses him either way.
     */
    function populateBookingHosts() {
      var pending;
      // `request` turns a rejected fetch into `{status:0}`, but a host with no `fetch` at
      // all throws synchronously — and a failure to list hosts must never stop the rest
      // of the form from mounting.
      try { pending = request('GET', '/booking-hosts'); } catch (_) { return; }
      pending.then(function (res) {
        if (destroyed || !root) return;
        var sel = field('bookingHost');
        if (!sel) return;
        var hosts = (res.status === 200 && res.data && res.data.hosts) || [];
        if (!hosts.length) {
          sel.innerHTML = '<option value="">Unavailable &mdash; reload to try again</option>';
          return;
        }
        sel.innerHTML = '<option value="">Select a host&hellip;</option>'
          + hosts.map(function (h) {
            // `h.key` is an opaque identifier (`fraser`), never a calendar address.
            return '<option value="' + escapeHtml(h.key) + '"'
              + (h.configured ? '' : ' disabled')
              + (h.configured && h.key === vals.bookingHost ? ' selected' : '') + '>'
              + escapeHtml(h.label) + (h.configured ? '' : ' (not configured)')
              + '</option>';
          }).join('');
      });
    }

    /**
     * INTERNAL ROUTE ONLY. Failure is silent and safe: with no options the select
     * offers only "use the default", and the server falls back to the configured
     * public Lead Source exactly as it does for a public booking.
     */
    function populateLeadSources() {
      loadLeadSources().then(function (mod) {
        if (destroyed || !mod || !root) return;
        var sel = field('leadSource');
        if (!sel) return;
        sel.innerHTML = '<option value="">Use the default (Website)</option>'
          + mod.LEAD_SOURCES.map(function (s) {
            // label = Zoho display_value, value = actual_value. Five differ live, so
            // submitting the label would be an INVALID_DATA rejection.
            return '<option value="' + escapeHtml(s.value) + '"'
              + (s.value === vals.leadSource ? ' selected' : '') + '>'
              + escapeHtml(s.label) + '</option>';
          }).join('');
      });
    }

    function populateCountries() {
      var sel = field('countryIso2');
      if (!sel || !countries) return;
      // ISO2 values, straight from the shared config. No local country table, and
      // no dial-code → country inference anywhere (spec §6).
      sel.innerHTML = countries.COUNTRIES.map(function (c) {
        return '<option value="' + escapeHtml(c.iso2) + '"' + (c.iso2 === vals.countryIso2 ? ' selected' : '') + '>'
          + escapeHtml(c.name + ' (' + c.dialCode + ')') + '</option>';
      }).join('');
    }

    /* =====================================================================
       Job Title combobox
       ===================================================================== */
    var jt = { open: false, index: -1, options: [], committed: '' };

    function jtInput() { return field('jobTitle'); }
    function jtList() { return q('jobtitle-listbox'); }

    /** The list is an input aid; if it never arrives the field stays a plain input. */
    function jtDegrade() {
      var input = jtInput();
      if (!input) return;
      ['role', 'aria-expanded', 'aria-controls', 'aria-autocomplete', 'aria-haspopup',
        'aria-activedescendant'].forEach(function (a) { input.removeAttribute(a); });
      input.setAttribute('autocomplete', 'organization-title');
      var status = q('jobtitle-status');
      if (status) status.textContent = '';
    }

    /** Fetched on first focus — 415 options are neither rendered nor downloaded early. */
    function jtEnsureTitles() {
      if (titles) return Promise.resolve(titles);
      return loadJobTitles().then(function (mod) {
        if (destroyed) return null;
        if (!mod || !Array.isArray(mod.TITLES) || !mod.TITLES.length) { jtDegrade(); return null; }
        titles = mod.TITLES;
        return titles;
      });
    }

    function jtClose() {
      jt.open = false;
      jt.index = -1;
      var list = jtList();
      var input = jtInput();
      if (list) { list.hidden = true; list.innerHTML = ''; }
      if (input && input.getAttribute('role') === 'combobox') {
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
      }
    }

    function jtHighlight(i) {
      var list = jtList();
      var input = jtInput();
      if (!list || !input) return;
      var nodes = list.querySelectorAll('[role="option"]');
      if (!nodes.length) return;
      // Wrap: from the last option Down returns to the first, which is what a visitor
      // scanning a long list expects.
      jt.index = ((i % nodes.length) + nodes.length) % nodes.length;
      Array.prototype.forEach.call(nodes, function (n, idx) {
        var on = idx === jt.index;
        n.classList.toggle('active', on);
        n.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) {
          input.setAttribute('aria-activedescendant', n.id);
          if (typeof n.scrollIntoView === 'function') {
            try { n.scrollIntoView({ block: 'nearest' }); } catch (_) {}
          }
        }
      });
    }

    function jtRender(query) {
      var list = jtList();
      var input = jtInput();
      if (!list || !input || !titles) return;

      var res = filterJobTitles(titles, query, JOB_TITLE_MAX_VISIBLE);
      // `Other` is appended unconditionally, so it stays reachable even when the
      // query matches nothing — which is exactly when a visitor needs it.
      jt.options = res.visible.concat([JOB_TITLE_OTHER]);

      var html = jt.options.map(function (t, i) {
        return '<li class="jurnii-option' + (t === JOB_TITLE_OTHER ? ' is-other' : '') + '"'
          + ' id="jurnii-jt-opt-' + i + '" role="option" aria-selected="false"'
          + ' data-title="' + escapeHtml(t) + '">' + escapeHtml(t) + '</li>';
      }).join('');
      var hidden = res.total - res.visible.length;
      if (hidden > 0) {
        html += '<li class="jurnii-option-more" role="presentation">'
          + hidden + ' more — keep typing to narrow the list</li>';
      }
      list.innerHTML = html;
      list.hidden = false;
      jt.open = true;
      input.setAttribute('aria-expanded', 'true');
      jt.index = -1;
      input.removeAttribute('aria-activedescendant');

      var status = q('jobtitle-status');
      if (status) {
        status.textContent = res.total === 0
          ? 'No matching titles — choose Other to type your own.'
          : res.total + (res.total === 1 ? ' title' : ' titles') + ' available.';
      }

      Array.prototype.forEach.call(list.querySelectorAll('[role="option"]'), function (n, i) {
        // mousedown, not click: blur would otherwise close the list and remove the
        // node before the click ever lands on it.
        n.addEventListener('mousedown', function (e) { e.preventDefault(); jtCommit(i); });
      });
    }

    function jtCommit(i) {
      var title = jt.options[i];
      if (title === undefined) return;
      var input = jtInput();
      vals.jobTitle = title;
      jt.committed = title;
      if (input) input.value = title;
      jtClose();
      syncJobTitleOther({ focus: title === JOB_TITLE_OTHER });
      persist();
    }

    /**
     * Show or hide the free-text field to match the committed title.
     *
     * Called from `restore()` too. `restore` only assigns `.value`/`.checked`, so a
     * resumed session that had chosen `Other` would otherwise show a combobox reading
     * "Other" above a still-hidden text field holding the visitor's real title.
     */
    function syncJobTitleOther(o) {
      var group = q('jobtitle-other-group');
      var other = field('jobTitleOther');
      if (!group || !other) return;
      var on = String(vals.jobTitle || '').trim() === JOB_TITLE_OTHER;
      group.hidden = !on;
      if (on) {
        other.setAttribute('required', 'required');
        if (o && o.focus && typeof other.focus === 'function') {
          try { other.focus(); } catch (_) {}
        }
      } else {
        other.removeAttribute('required');
        // Cleared on the way out so a stale free-text title cannot be submitted
        // alongside a governed one.
        if (other.value) other.value = '';
        vals.jobTitleOther = '';
      }
    }

    function jtKeydown(e) {
      var input = jtInput();
      if (!input || input.getAttribute('role') !== 'combobox') return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!jt.open) {
          jtEnsureTitles().then(function (t) {
            if (!t) return;
            jtRender(input.value);
            jtHighlight(e.key === 'ArrowDown' ? 0 : jt.options.length - 1);
          });
          return;
        }
        jtHighlight(jt.index + (e.key === 'ArrowDown' ? 1 : -1));
        return;
      }
      if (!jt.open) return;

      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        jtHighlight(e.key === 'Home' ? 0 : jt.options.length - 1);
        return;
      }
      if (e.key === 'Enter') {
        // preventDefault whether or not something is highlighted: Enter inside an open
        // listbox must never reach a surrounding form and submit it.
        e.preventDefault();
        if (jt.index >= 0) jtCommit(jt.index);
        else jtClose();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        // The site modal also closes on Escape. The first press belongs to the
        // listbox; only a second one should close the booking form.
        e.stopPropagation();
        jtClose();
        // Restore the last committed title, so Escape means "cancel this edit".
        if (jt.committed) { input.value = jt.committed; vals.jobTitle = jt.committed; }
        return;
      }
      if (e.key === 'Tab') {
        // NOT prevented — Tab must still move focus. It commits the highlight on the
        // way out, which is the ARIA-recommended behaviour for a combobox.
        if (jt.index >= 0) jtCommit(jt.index);
        else jtClose();
      }
    }

    function bindJobTitle() {
      var input = jtInput();
      if (!input) return;

      input.addEventListener('focus', function () {
        jtEnsureTitles().then(function (t) { if (t && !jt.open) jtRender(input.value); });
      });
      input.addEventListener('input', function (e) {
        vals.jobTitle = e.target.value;
        persist();
        jtEnsureTitles().then(function (t) { if (t) jtRender(e.target.value); });
      });
      input.addEventListener('keydown', jtKeydown);
      input.addEventListener('blur', function () {
        // Snap to the governed casing when the typed text is an exact match, so
        // "head of product" reaches the server as "Head of Product".
        var typed = String(input.value || '').trim();
        if (titles && typed) {
          var exact = titles.filter(function (t) { return t.toLowerCase() === typed.toLowerCase(); })[0];
          if (exact) { input.value = exact; vals.jobTitle = exact; jt.committed = exact; persist(); }
        }
        jtClose();
        syncJobTitleOther();
      });

      var other = field('jobTitleOther');
      if (other) {
        other.addEventListener('input', function (e) { vals.jobTitleOther = e.target.value; persist(); });
      }
      // The return path out of `Other`. Typing over the word works too, but an
      // explicit affordance is what makes it discoverable.
      var clear = q('jobtitle-clear');
      if (clear) {
        clear.addEventListener('click', function (e) {
          e.preventDefault();
          vals.jobTitle = '';
          vals.jobTitleOther = '';
          jt.committed = '';
          if (input) { input.value = ''; try { input.focus(); } catch (_) {} }
          syncJobTitleOther();
          persist();
        });
      }
    }

    function bind() {
      ['firstName', 'lastName', 'email', 'company', 'nationalNumber'].forEach(function (name) {
        var el = field(name);
        if (el) el.addEventListener('input', function (e) { vals[name] = e.target.value; persist(); });
      });
      var consent = field('marketingConsent');
      if (consent) consent.addEventListener('change', function (e) { vals.marketingConsent = !!e.target.checked; persist(); });
      var country = field('countryIso2');
      if (country) country.addEventListener('change', function (e) { vals.countryIso2 = e.target.value; persist(); });

      bindJobTitle();

      // Push/splice rather than re-reading the DOM, so `productInterests` preserves the
      // order the visitor ticked. The first entry is the one the Zoho worker uses to
      // resolve a product Deal, so that order is load-bearing, not cosmetic.
      fields('productInterests').forEach(function (cb) {
        cb.addEventListener('change', function (e) {
          var value = e.target.value;          // the canonical value, never the label
          var at = vals.productInterests.indexOf(value);
          if (e.target.checked) { if (at === -1) vals.productInterests.push(value); }
          else if (at !== -1) vals.productInterests.splice(at, 1);
          persist();
        });
      });

      var leadSource = field('leadSource');
      if (leadSource) leadSource.addEventListener('change', function (e) { vals.leadSource = e.target.value; persist(); });

      var bookingHost = field('bookingHost');
      if (bookingHost) {
        bookingHost.addEventListener('change', function (e) {
          vals.bookingHost = e.target.value;
          persist();
          // A slot picked against the previous host is meaningless now, and must not
          // survive to `submitBooking`. The scheduler drops it again on the next load
          // for the same reason; this clears the visible selection immediately.
          if (scheduler) scheduler.clearSelection();
        });
      }

      var n1 = q('next-1'); if (n1) n1.addEventListener('click', submitPage1);
      var n2 = q('next-2'); if (n2) n2.addEventListener('click', submitPage2);
      var b2 = q('back-2'); if (b2) b2.addEventListener('click', function (e) { e.preventDefault(); showStep(1); });
      var b3 = q('back-3'); if (b3) b3.addEventListener('click', function (e) { e.preventDefault(); showStep(2); });
      var cf = q('confirm'); if (cf) cf.addEventListener('click', submitBooking);

      var close = q('close');
      if (close) close.addEventListener('click', function (e) { e.preventDefault(); requestClose(); });
      var finish = q('finish');
      if (finish) finish.addEventListener('click', function (e) { e.preventDefault(); requestClose(); });

      var support = q('support-link');
      if (support) {
        support.textContent = supportEmail();
        support.href = 'mailto:' + supportEmail();
      }

      scheduler = createScheduler(root, {
        onSelect: function (start) {
          notice(null);
          if (start) emit('booking_slot_selected', { lead_time_days: daysUntil(start) });
        },
        // The flow token makes availability journey-aware; the host key lets the
        // scheduler notice that its cached slots belong to a different calendar.
        authToken: function () { return token; },
        hostKey: function () { return vals.bookingHost || null; },
        onAuthLost: function () {
          clearSnapshot();
          resetJourney();
          showStep(1);
          notice(COPY.session_expired);
        }
      });
    }

    function requestClose() {
      stopPolling();
      if (typeof opts.onClose === 'function') opts.onClose();
    }

    /* ---- snapshot ---- */
    function persist() {
      var snap = loadSnapshot() || {};
      saveSnapshot(Object.assign({}, snap, {
        journey_id: journeyId,
        journey_email: journeyEmail,
        token: token,
        step: currentStepNumber(),
        values: vals,
        attribution: snap.attribution || firstTouch()
      }));
    }

    function currentStepNumber() {
      var active = root && root.querySelector('.jurnii-form-step.active');
      var s = active && active.getAttribute('data-step');
      return Number(s) || 1;
    }

    /**
     * The RAW `data-step` value, for analytics only.
     *
     * Deliberately not currentStepNumber(): that coerces `pending`, `confirmed` and
     * `attention` to 1, because the snapshot needs a resumable step. A funnel report
     * needs the opposite — those three are exactly the states worth distinguishing.
     */
    function activeStepName() {
      var active = root && root.querySelector('.jurnii-form-step.active');
      return (active && active.getAttribute('data-step')) || null;
    }

    function restore() {
      var snap = loadSnapshot();
      if (!snap) return;
      var saved = snap.values || {};
      Object.assign(vals, saved);

      // A snapshot written by the previous single-select build carries a scalar
      // `productInterest` and no array. Migrate it rather than dropping it: the TTL is
      // two hours, so a visitor mid-flow when the deploy lands would otherwise lose
      // their choice. Tested against `saved`, not the merged `vals` — the seed already
      // holds an empty array, so `vals.productInterests` is never not-an-array.
      if (!Array.isArray(saved.productInterests)) {
        vals.productInterests = productsForSubmit(saved.productInterest);
      }
      delete vals.productInterest;

      journeyId = snap.journey_id || null;
      journeyEmail = snap.journey_email || null;
      token = snap.token || null;

      // The multi-value fields FIRST: the generic loop below writes `.value`, which
      // would stringify the array into the first checkbox's value attribute.
      var checked = vals.productInterests || [];
      fields('productInterests').forEach(function (cb) {
        cb.checked = checked.indexOf(cb.value) !== -1;
      });

      Object.keys(vals).forEach(function (name) {
        if (name === 'productInterests') return;
        var el = field(name);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!vals[name];
        else if (vals[name] !== undefined && vals[name] !== null) el.value = vals[name];
      });

      // `restore` only assigns values; without this a resumed `Other` session shows a
      // combobox reading "Other" above a hidden field holding the real title.
      jt.committed = String(vals.jobTitle || '').trim();
      syncJobTitleOther();
      if (token && journeyId && Number(snap.step) >= 3) {
        showStep(3);
        scheduler.load();
      } else if (token && journeyId && Number(snap.step) === 2) {
        showStep(2);
      }
    }

    /** A fresh journey: new id, and the stored token/id dropped. */
    function resetJourney() {
      journeyId = genUUID();
      journeyEmail = vals.email;
      token = null;
      persist();
      return journeyId;
    }

    function ensureJourneyId() {
      if (journeyId && journeyEmail && journeyEmail !== vals.email) return resetJourney();
      if (!journeyId) return resetJourney();
      return journeyId;
    }

    /* ---- page 1 ---- */
    function page1Body() {
      var att = firstTouch();
      var body = {
        journeyId: ensureJourneyId(),
        firstName: String(vals.firstName || '').trim(),
        lastName: String(vals.lastName || '').trim(),
        email: String(vals.email || '').trim(),
        marketingConsent: !!vals.marketingConsent,
        // First touch, replayed from the snapshot — never re-read at submit time.
        landingUrl: att.landing_url,
        referrerUrl: att.referrer_url,
        sourcePage: att.source_page,
        clientTimezone: att.client_timezone,
        clientLocale: att.client_locale,
        // Hidden placement metadata, from render options or container data-*.
        formPlacement: data.formPlacement,
        ctaId: data.ctaId,
        formVariant: data.formVariant
      };
      UTM_KEYS.forEach(function (k) { body[k] = att[k] || null; });
      if (att.attribution_extra) body.attributionExtra = att.attribution_extra;
      return body;
    }

    function submitPage1(e) {
      if (e) e.preventDefault();
      clearFieldErrors();
      notice(null);
      var ok = true;
      if (!String(vals.firstName || '').trim()) { markInvalid('firstName'); ok = false; }
      if (!String(vals.lastName || '').trim()) { markInvalid('lastName'); ok = false; }
      var email = String(vals.email || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { markInvalid('email'); ok = false; }
      if (!ok) { notice(COPY.name_required); return Promise.resolve(false); }

      setLoading('next-1', true);
      return send(false).then(function (done) {
        setLoading('next-1', false);
        return done;
      });

      function send(isRetry) {
        return request('POST', '/submissions/start', page1Body()).then(function (res) {
          if (res.status === 200) {
            token = res.data.token;
            journeyId = res.data.journeyId || journeyId;
            journeyEmail = email;
            // Emitted here, on the 200 — not from showStep. The server has accepted.
            emit('booking_step_complete', {
              step_name: '1', step_number: 1,
              marketing_consent: vals.marketingConsent === true
            });
            showStep(2);
            persist();
            return true;
          }
          // `409 journey_conflict` means this id is bound to a different email.
          // A fresh journey is the fix, and it is invisible to the visitor.
          if (res.status === 409 && (res.data.code === 'journey_conflict' || res.data.code === 'wrong_step') && !isRetry) {
            clearSnapshot();
            resetJourney();
            return send(true);
          }
          if (res.status === 400 && res.data.code === 'business_email_required') {
            markInvalid('email'); notice(COPY.business_email_required); return false;
          }
          if (res.status === 400) { markInvalid('email'); notice(COPY.email_invalid); return false; }
          if (res.status === 0) { notice(COPY.offline); return false; }
          notice(COPY.store_unavailable);
          return false;
        });
      }
    }

    /* ---- page 2 ---- */
    function submitPage2(e) {
      if (e) e.preventDefault();
      clearFieldErrors();
      notice(null);
      if (!countries) { notice(COPY.generic); return Promise.resolve(false); }

      // `Other` is a UI sentinel; the title that counts is whatever it revealed.
      var jobTitle = effectiveJobTitle(vals);
      var ok = true;
      var problem = 'company_required';
      if (!String(vals.company || '').trim()) { markInvalid('company'); ok = false; }
      if (!jobTitle) {
        if (String(vals.jobTitle || '').trim() === JOB_TITLE_OTHER) {
          markInvalid('jobTitleOther');
          problem = 'job_title_other_required';
        } else {
          markInvalid('jobTitle');
          problem = 'job_title_required';
        }
        ok = false;
      }
      // Required on the internal route only. The public form has no host field and the
      // server assigns the configured public host; an internal booking must never
      // inherit it, so this mirrors a check the server enforces independently.
      if (internal && !String(vals.bookingHost || '').trim()) {
        markInvalid('bookingHost');
        problem = 'booking_host_required';
        ok = false;
      }
      if (!ok) { notice(COPY[problem]); return Promise.resolve(false); }

      // The SHARED normaliser, so the client shows what the server will derive.
      var phone = countries.normalizePhone({
        iso2: vals.countryIso2,
        nationalNumber: vals.nationalNumber
      });
      if (!phone.ok) {
        markInvalid(phone.reason === 'country_unknown' ? 'countryIso2' : 'nationalNumber');
        notice(copy(phone.reason));
        return Promise.resolve(false);
      }

      var body = {
        company: String(vals.company || '').trim(),
        // ONE title string. No `isOther` flag and no Contact Role: the server decides
        // which titles may enter the governed picklist, from its own live snapshot.
        jobTitle: jobTitle,
        countryIso2: vals.countryIso2,
        dialCode: phone.dialCode,
        nationalNumber: phone.nationalNumber,
        e164: phone.e164
      };
      // A NEW plural key. Reusing `productInterest` with an array value would 400
      // against a still-cached copy of the previous endpoint, so a rolling deploy in
      // either order stays safe.
      var products = productsForSubmit(vals.productInterests);
      if (products.length) body.productInterests = products;
      // Internal route only, and the server honours it only for a journey whose
      // stored placement is `internal-booking`.
      if (internal && vals.leadSource) body.leadSource = vals.leadSource;
      // Likewise gated server-side. An opaque host key (`fraser`), never a calendar
      // address — the browser is never given one to send.
      if (internal && vals.bookingHost) body.bookingHost = vals.bookingHost;

      setLoading('next-2', true);
      // A failed save must NOT advance: the calendar never opens on unsaved data.
      return request('PATCH', '/submissions/' + encodeURIComponent(journeyId), body, token).then(function (res) {
        if (res.status === 200) {
          token = res.data.token || token;
          // The point the visitor has committed real firmographics — the strongest
          // micro-conversion this funnel has before the booking itself.
          emit('booking_step_complete', Object.assign(
            { step_name: '2', step_number: 2 }, analyticsDims(vals)));
          showStep(3);
          persist();
          return scheduler.load();
        }
        if (res.status === 400) {
          var reason = res.data && res.data.reason;
          // Route the reason to the field it is about. Previously anything that was not
          // `country_unknown` reddened the phone input, so a rejected Lead Source — and
          // now a missing or unavailable host — pointed at the wrong control.
          var FIELD_FOR_REASON = {
            country_unknown: 'countryIso2',
            lead_source_invalid: 'leadSource',
            booking_host_required: 'bookingHost',
            booking_host_invalid: 'bookingHost'
          };
          markInvalid(FIELD_FOR_REASON[reason] || 'nationalNumber');
          notice(copy(reason));
          return false;
        }
        if (res.status === 409) { notice(COPY.generic); return false; }
        if (res.status === 0) { notice(COPY.offline); return false; }
        notice(COPY.store_unavailable);
        return false;
      }).then(function (r) {
        setLoading('next-2', false);
        return r;
      });
    }

    /* ---- page 3 ---- */
    function submitBooking(e) {
      if (e) e.preventDefault();
      notice(null);
      var start = scheduler.selected();
      if (!start) { notice(COPY.slot_required); return Promise.resolve(false); }

      setLoading('confirm', true);
      return request('POST', '/bookings', { slotStart: start }, token).then(function (res) {
        setLoading('confirm', false);
        var verdict = classifyBooking(res);

        if (verdict.action === 'confirmed') {
          finishConfirmed(res.data);
          return true;
        }
        if (verdict.action === 'poll') {
          showStep('pending');
          startPolling(verdict.pollAfterMs);
          return true;
        }
        if (verdict.action === 'needs_attention') { showAttention(); return false; }
        if (verdict.action === 'reselect') {
          notice(copy(verdict.copyKey));
          showStep(3);
          scheduler.clearSelection();
          if (verdict.refresh) scheduler.reload();
          return false;
        }
        if (verdict.action === 'message') { notice(copy(verdict.copyKey), 'info'); return false; }
        notice(copy(verdict.copyKey));
        return false;
      });
    }

    /* ---- 202 → poll → terminal ---- */
    function startPolling(firstDelay) {
      stopPolling();
      var delay = firstDelay || POLL_FIRST_MS;
      var startedAt = Date.now();
      var timer = null;
      poller = { stop: function () { if (timer) win.clearTimeout(timer); timer = null; } };

      function tick() {
        if (destroyed) return;
        request('GET', '/bookings/' + encodeURIComponent(journeyId) + '/status', null, token)
          .then(function (res) {
            if (destroyed) return;
            var verdict = classifyStatus(res);
            if (verdict.terminal) {
              stopPolling();
              if (verdict.kind === 'confirmed') return finishConfirmed(res.data);
              if (verdict.kind === 'needs_attention') return showAttention();
              if (verdict.kind === 'cancelled') { notice(COPY.booking_cancelled, 'info'); return showStep(3); }
              // `booking_failed` means G3 PROVED no event was created, so the slot
              // is genuinely free again and a retry is safe and correct.
              notice(COPY.booking_failed);
              showStep(3);
              scheduler.clearSelection();
              scheduler.reload();
              return;
            }
            if (Date.now() - startedAt > POLL_GIVE_UP_MS) {
              stopPolling();
              var msg = q('pending-msg');
              if (msg) msg.textContent = COPY.booking_pending_slow;
              return;
            }
            delay = nextPollDelay(delay);
            timer = win.setTimeout(tick, delay);
          });
      }
      timer = win.setTimeout(tick, delay);
    }

    function stopPolling() {
      if (poller) { poller.stop(); poller = null; }
    }

    /* ---- terminal states ---- */
    function finishConfirmed(payload) {
      clearSnapshot();
      journeyId = payload.bookingId || journeyId;
      var time = q('confirm-time');
      var ref = q('confirm-ref');
      var meet = q('confirm-meet');
      var meetRow = q('confirm-meet-row');
      var manageRow = q('confirm-manage-row');
      var manage = q('confirm-manage');

      // Every value comes from the response. The shipped `Status: Confirmed`,
      // `REG_XXXXXXXXX` and `July 15, 2026 at 2:00 PM CET` placeholders are gone.
      if (time) time.textContent = dateTimeLabel(payload.slotStart);
      if (ref) ref.textContent = payload.bookingId || '';

      var link = safeUrl(payload.meetLink);
      if (link && meet) {
        meet.innerHTML = '<a href="' + escapeHtml(link) + '" target="_blank" rel="noopener"'
          + ' style="color:var(--jurnii-300);text-decoration:underline;font-weight:500;">Join Google Meet</a>';
      } else if (meet) {
        // meetLink: null is a VALID confirmed booking — the invite is already sent.
        meet.textContent = 'Invitation sent via email';
      }
      if (meetRow) meetRow.style.display = '';

      var mUrl = safeUrl(payload.manageUrl);
      if (mUrl && manage && manageRow) { manage.href = mUrl; manageRow.style.display = ''; }
      else if (manageRow) { manageRow.style.display = 'none'; }

      // The conversion. `bookingId` is deliberately absent: it is the journey UUID,
      // which is the subject of the signed manage link and therefore a personal
      // identifier, not a transaction id that may be sent to a third party.
      emit('booking_confirmed', Object.assign({
        lead_time_days: daysUntil(payload.slotStart),
        has_meet_link: !!payload.meetLink
      }, analyticsDims(vals), placementDims()));

      showStep('confirmed');
      if (typeof opts.onConfirmed === 'function') opts.onConfirmed(payload);
    }

    function showAttention() {
      stopPolling();
      var support = q('support-link');
      if (support) { support.textContent = supportEmail(); support.href = 'mailto:' + supportEmail(); }
      emit('booking_needs_attention', placementDims());
      showStep('attention');
    }

    /* ---- boot ---- */
    loadConfig().then(function (cfg) {
      countries = cfg;
      paint();
    }, function () {
      // Fail closed and visibly, rather than falling back to a private country
      // table that could disagree with the server's normalisation.
      container.innerHTML = '<div class="jurnii-booking-container"><div class="jurnii-notice" style="padding:12px;'
        + 'border-radius:6px;font-size:14px;text-align:center;color:#ff5252;background:rgba(255,82,82,0.1);'
        + 'border:1px solid rgba(255,82,82,0.2);">' + escapeHtml(COPY.calendar_misconfigured) + '</div></div>';
    });

    return {
      kind: 'booking',
      destroy: function () { destroyed = true; stopPolling(); },
      // test seams
      _submitPage1: function () { return submitPage1(); },
      _submitPage2: function () { return submitPage2(); },
      _submitBooking: function () { return submitBooking(); },
      _scheduler: function () { return scheduler; },
      _values: vals,
      _setValues: function (patch) { Object.assign(vals, patch); },
      _journeyId: function () { return journeyId; },
      _setJourney: function (id, tok) { journeyId = id; token = tok; },
      _step: function () {
        var active = container.querySelector('.jurnii-form-step.active');
        return active ? active.getAttribute('data-step') : null;
      }
    };
  }

  /* =======================================================================
     The manage page
     ======================================================================= */
  function createManage(container, options) {
    var opts = options || {};
    var params = new (win.URLSearchParams || URLSearchParams)((win.location && win.location.search) || '');
    var token = opts.token || params.get('token');
    var journeyId = opts.journeyId || params.get('id');
    var scheduler = null;
    var status = null;
    var poller = null;
    var destroyed = false;
    var root = container;

    function q(role) { return root.querySelector('[data-role="' + role + '"]'); }

    function notice(msg, tone) {
      var el = q('notice');
      if (!el) return;
      if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
      el.textContent = msg;
      el.style.cssText = 'display:block;padding:12px;border-radius:6px;margin-bottom:16px;font-size:14px;text-align:center;'
        + (tone === 'info'
          ? 'color:#0b6b3a;background:rgba(16,185,129,0.10);border:1px solid rgba(16,185,129,0.25);'
          : 'color:#ff5252;background:rgba(255,82,82,0.1);border:1px solid rgba(255,82,82,0.2);');

      emit('manage_error', {
        error_code: CODE_BY_COPY[msg] || 'unmapped',
        tone: tone || 'error'
      });
    }

    function showStep(step) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-step]'), function (el) {
        el.classList.toggle('active', el.getAttribute('data-step') === step);
      });
      icons();
      emit('manage_step_view', { step_name: String(step) });
    }

    function setLoading(role, on) {
      var btn = q(role);
      if (!btn) return;
      if (on) {
        btn.disabled = true;
        if (!btn.getAttribute('data-label')) btn.setAttribute('data-label', btn.textContent);
        btn.textContent = 'Processing...';
      } else {
        btn.disabled = false;
        var label = btn.getAttribute('data-label');
        if (label) btn.textContent = label;
      }
    }

    function result(title, msg) {
      var t = q('result-title');
      var m = q('result-msg');
      if (t) t.textContent = title;
      if (m) m.textContent = msg;
      // Both terminal manage outcomes route through here, and CODE_BY_COPY separates
      // them: reschedule_done vs cancel_done.
      emit('manage_complete', { outcome_code: CODE_BY_COPY[msg] || 'unmapped' });
      showStep('result');
    }

    function showAttention() {
      stopPolling();
      var support = q('support-link');
      if (support) { support.textContent = supportEmail(); support.href = 'mailto:' + supportEmail(); }
      showStep('attention');
    }

    function paint() {
      container.innerHTML = manageMarkup();
      root = container;

      if (!token || !journeyId) {
        // No reason code, no id echoed back — just the one thing they can act on.
        notice(COPY.manage_link_invalid);
        var actions = q('home-actions');
        if (actions) actions.style.display = 'none';
        var lede = q('home-lede');
        if (lede) lede.textContent = '';
        icons();
        return;
      }

      var back = q('manage-back');
      if (back) back.addEventListener('click', function (e) { e.preventDefault(); notice(null); showStep('home'); });
      var toRe = q('to-reschedule');
      if (toRe) toRe.addEventListener('click', function (e) {
        e.preventDefault();
        notice(null);
        showStep('reschedule');
        scheduler.load();
      });
      var confirm = q('manage-confirm');
      if (confirm) confirm.addEventListener('click', submitReschedule);
      var cancel = q('cancel');
      if (cancel) cancel.addEventListener('click', submitCancel);

      /**
       * The manage token, so a reschedule reads availability from the calendar this
       * booking is ALREADY on. Without it the request would be anonymous and answered
       * from the public host — a confirmed booking on another host would then be offered
       * the wrong calendar's free slots. No `hostKey`: an existing booking's host is the
       * persisted one, which the server resolves and the browser must not influence.
       */
      scheduler = createScheduler(root, {
        onSelect: function (start) {
          notice(null);
          if (start) emit('manage_slot_selected', { lead_time_days: daysUntil(start) });
        },
        authToken: function () { return token; }
      });
      icons();
      return refreshStatus();
    }

    function refreshStatus() {
      return request('GET', '/bookings/' + encodeURIComponent(journeyId) + '/status', null, token)
        .then(function (res) {
          if (res.status === 401 || res.status === 403) {
            notice(COPY.manage_link_invalid);
            var a = q('home-actions'); if (a) a.style.display = 'none';
            var l = q('home-lede'); if (l) l.textContent = '';
            return false;
          }
          if (res.status !== 200) { notice(COPY.generic); return false; }
          status = res.data;
          renderHome();
          return true;
        });
    }

    function renderHome() {
      var acts = manageActions(status, { cancellationEnabled: cancellationEnabled() });
      if (acts.attention) return showAttention();

      var lede = q('home-lede');
      var meta = q('home-meta');
      var time = q('home-time');
      var actions = q('home-actions');
      var reBtn = q('to-reschedule');
      var cxBtn = q('cancel');
      var support = q('support');

      var slot = status && (status.slotStart || null);
      if (time && slot) time.textContent = dateTimeLabel(slot);
      if (meta) meta.style.display = slot ? '' : 'none';

      if (lede) {
        lede.textContent = acts.reschedule
          ? 'Reschedule to a new time or contact us about your Jurnii product demonstration.'
          : (status && status.bookingStatus === 'cancelled'
            ? COPY.booking_cancelled
            : COPY.not_confirmed);
      }
      if (actions) actions.style.display = (acts.reschedule || acts.cancel) ? '' : 'none';
      if (reBtn) reBtn.style.display = acts.reschedule ? '' : 'none';
      if (cxBtn) cxBtn.style.display = acts.cancel ? '' : 'none';
      if (support) {
        if (acts.support) {
          support.innerHTML = escapeHtml(COPY.cancellation_disabled) + ' <a href="mailto:' + escapeHtml(supportEmail())
            + '" style="color:var(--jurnii-300);text-decoration:underline;">' + escapeHtml(supportEmail()) + '</a>';
          support.style.display = '';
        } else {
          support.style.display = 'none';
        }
      }
      showStep('home');
    }

    function submitReschedule(e) {
      if (e) e.preventDefault();
      notice(null);
      var start = scheduler.selected();
      if (!start) { notice(COPY.slot_required); return Promise.resolve(false); }
      setLoading('manage-confirm', true);
      return request('PATCH', '/bookings/' + encodeURIComponent(journeyId) + '/reschedule',
        { slotStart: start }, token).then(function (res) {
        setLoading('manage-confirm', false);
        if (res.status === 200) { result('Booking rescheduled', COPY.reschedule_done); return true; }
        if (res.status === 202) {
          var msg = q('pending-msg');
          if (msg) msg.textContent = COPY.reschedule_pending;
          showStep('pending');
          startPolling(res.data.pollAfterMs, 'reschedule');
          return true;
        }
        if (res.status === 409) {
          var code = res.data && res.data.code;
          if (code === 'SLOT_TAKEN') {
            notice(COPY.slot_taken);
            scheduler.clearSelection();
            scheduler.reload();
            return false;
          }
          if (code === 'action_in_progress') { notice(COPY.action_in_progress); return false; }
          if (code === 'booking_needs_attention') { showAttention(); return false; }
          if (code === 'booking_cancelled') { notice(COPY.booking_cancelled); return false; }
          notice(COPY.generic);
          return false;
        }
        if (res.status === 400) {
          notice(copy(res.data && res.data.reason));
          scheduler.clearSelection();
          return false;
        }
        if (res.status === 0) { notice(COPY.offline); return false; }
        notice(COPY.generic);
        return false;
      });
    }

    function submitCancel(e) {
      if (e) e.preventDefault();
      notice(null);
      if (!cancellationEnabled()) { notice(COPY.cancellation_disabled); return Promise.resolve(false); }
      if (win.confirm && !win.confirm('Cancel your demo booking? This cannot be undone.')) return Promise.resolve(false);
      setLoading('cancel', true);
      return request('DELETE', '/bookings/' + encodeURIComponent(journeyId), null, token).then(function (res) {
        setLoading('cancel', false);
        if (res.status === 200) { result('Booking cancelled', COPY.cancel_done); return true; }
        if (res.status === 202) {
          var msg = q('pending-msg');
          if (msg) msg.textContent = COPY.cancel_pending;
          showStep('pending');
          startPolling(res.data.pollAfterMs, 'cancel');
          return true;
        }
        if (res.status === 403) { notice(COPY.cancellation_disabled); return false; }
        if (res.status === 409 && res.data && res.data.code === 'booking_needs_attention') { showAttention(); return false; }
        if (res.status === 409 && res.data && res.data.code === 'action_in_progress') { notice(COPY.action_in_progress); return false; }
        if (res.status === 409 && res.data && res.data.code === 'booking_cancelled') { notice(COPY.booking_cancelled); return false; }
        if (res.status === 0) { notice(COPY.offline); return false; }
        notice(COPY.generic);
        return false;
      });
    }

    function startPolling(firstDelay, intent) {
      stopPolling();
      var delay = firstDelay || POLL_FIRST_MS;
      var startedAt = Date.now();
      var timer = null;
      poller = { stop: function () { if (timer) win.clearTimeout(timer); timer = null; } };

      function tick() {
        if (destroyed) return;
        request('GET', '/bookings/' + encodeURIComponent(journeyId) + '/status', null, token)
          .then(function (res) {
            if (destroyed) return;
            if (res.status === 200) {
              status = res.data;
              var s = status.bookingStatus;
              if (s === 'needs_attention') { stopPolling(); return showAttention(); }
              if (intent === 'cancel' && s === 'cancelled') {
                stopPolling();
                return result('Booking cancelled', COPY.cancel_done);
              }
              if (intent === 'reschedule' && s === 'confirmed' && !status.pendingSlotStart) {
                stopPolling();
                return result('Booking rescheduled', COPY.reschedule_done);
              }
            }
            if (Date.now() - startedAt > POLL_GIVE_UP_MS) {
              stopPolling();
              notice(intent === 'cancel' ? COPY.cancel_pending : COPY.reschedule_pending, 'info');
              return renderHome();
            }
            delay = nextPollDelay(delay);
            timer = win.setTimeout(tick, delay);
          });
      }
      timer = win.setTimeout(tick, delay);
    }

    function stopPolling() { if (poller) { poller.stop(); poller = null; } }

    var booted = paint();

    return {
      kind: 'manage',
      ready: Promise.resolve(booted),
      destroy: function () { destroyed = true; stopPolling(); },
      _refresh: refreshStatus,
      _reschedule: function () { return submitReschedule(); },
      _cancel: function () { return submitCancel(); },
      _scheduler: function () { return scheduler; },
      _step: function () {
        var active = container.querySelector('.jurnii-form-step.active');
        return active ? active.getAttribute('data-step') : null;
      }
    };
  }

  /* =======================================================================
     Placement metadata and embedded detection
     ======================================================================= */

  /**
   * `formPlacement` / `ctaId` / `formVariant` come from render options first, then
   * container `data-*`. They are hidden metadata: no new visible field.
   */
  function readPlacement(container, opts) {
    function pick(optKey, attr) {
      if (opts && opts[optKey]) return String(opts[optKey]);
      if (container && container.getAttribute) {
        var v = container.getAttribute(attr);
        if (v) return v;
      }
      return null;
    }
    return {
      formPlacement: pick('formPlacement', 'data-form-placement'),
      ctaId: pick('ctaId', 'data-cta-id'),
      formVariant: pick('formVariant', 'data-form-variant')
    };
  }

  /**
   * True when a host page owns the modal chrome, in which case this module must
   * not open one of its own and must not paint a second close button.
   *
   * Three signals, any of which suffices: an explicit `embedded`, an `onClose`
   * callback (only a host modal supplies one), or the page-level
   * `JURNII_BOOKING_EMBEDDED` flag that `site.jsx` sets before it injects this
   * script — set before load precisely so the bootstrap below never wires a
   * competing modal in the first place.
   */
  function resolveEmbedded(opts) {
    if (opts && typeof opts.embedded === 'boolean') return opts.embedded;
    if (opts && typeof opts.onClose === 'function') return true;
    return win.JURNII_BOOKING_EMBEDDED === true;
  }

  /**
   * True on the internal `/admin-form` route, which shows the extra Lead Source field.
   *
   * This is PRESENTATION ONLY and is not a security boundary — the page is served
   * unauthenticated by design (a low-discovery convenience route, `noindex`, unlinked).
   * The server does not trust this flag: it honours a submitted `leadSource` only for a
   * journey whose stored `form_placement` is `internal-booking`, which is written on
   * page 1 and never read back from a page-2 body. That check is where a real
   * authentication gate would later attach, without the form changing.
   */
  function resolveInternal(container, opts) {
    if (opts && typeof opts.internal === 'boolean') return opts.internal;
    if (container && container.getAttribute && container.getAttribute('data-internal') === '1') return true;
    return false;
  }

  /* =======================================================================
     The module's own modal — inline/legacy placements ONLY.
     ======================================================================= */
  var ownModal = null;

  function openOwnModal() {
    if (win.JURNII_BOOKING_EMBEDDED === true) return null;   // the host owns the modal
    if (!ownModal) {
      var overlay = doc.createElement('div');
      overlay.className = 'jurnii-modal-overlay';
      overlay.innerHTML = '<div class="jurnii-modal-wrapper"></div>';
      doc.body.appendChild(overlay);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeOwnModal(); });
      ownModal = { overlay: overlay, instance: null };
    }
    var wrapper = ownModal.overlay.querySelector('.jurnii-modal-wrapper');
    if (ownModal.instance) ownModal.instance.destroy();
    ownModal.instance = createBooking(wrapper, {
      showCloseButton: true,
      embedded: false,
      onClose: closeOwnModal
    });
    ownModal.overlay.classList.add('active');
    try { doc.body.style.overflow = 'hidden'; } catch (_) {}
    return ownModal.instance;
  }

  function closeOwnModal() {
    if (!ownModal) return;
    ownModal.overlay.classList.remove('active');
    try { doc.body.style.overflow = ''; } catch (_) {}
    if (ownModal.instance) { ownModal.instance.destroy(); ownModal.instance = null; }
    var wrapper = ownModal.overlay.querySelector('.jurnii-modal-wrapper');
    if (wrapper) wrapper.innerHTML = '';
  }

  /* =======================================================================
     Public API
     ======================================================================= */
  var instances = [];

  function render(container, options) {
    if (!container) return null;
    var opts = options || {};
    // A host modal is authoritative from its first render, even if the page
    // forgot to set the flag before load.
    if (resolveEmbedded(opts)) win.JURNII_BOOKING_EMBEDDED = true;

    var isManage = opts.mode === 'manage'
      || (opts.mode !== 'book' && container.id === 'jurnii-manage-inline');

    // Re-rendering the same container replaces the instance rather than stacking
    // two sets of listeners on one DOM tree.
    for (var i = instances.length - 1; i >= 0; i--) {
      if (instances[i].container === container) {
        try { instances[i].instance.destroy(); } catch (_) {}
        instances.splice(i, 1);
      }
    }
    container.setAttribute('data-jurnii-mounted', '1');
    var inst = isManage ? createManage(container, opts) : createBooking(container, opts);
    instances.push({ container: container, instance: inst });

    // The top of the funnel: the form is on screen. Emitted after construction so a
    // widget that fails to build does not report as an opened form.
    if (!isManage) {
      var p = readPlacement(container, opts);
      emit('booking_open', {
        form_placement: p.formPlacement || undefined,
        cta_id: p.ctaId || undefined,
        form_variant: p.formVariant || undefined
      });
    }
    return inst;
  }

  function renderManage(container, options) {
    return render(container, Object.assign({}, options || {}, { mode: 'manage' }));
  }

  /* =======================================================================
     Bootstrap — auto-mount for genuine inline placements.

     Auto-mount is retained unconditionally: an inline `#jurnii-booking-form-inline`
     or `#jurnii-manage-inline` is a real placement and must still work with no
     host script at all. The MODAL wiring is what gets suppressed when a host owns
     the chrome, so the two never compete for one CTA click.
     ======================================================================= */
  function bootstrapPlan(document_, globals) {
    var g = globals || {};
    var mounts = [];
    ['jurnii-manage-inline', 'jurnii-booking-form-inline', 'jurnii-booking-aside'].forEach(function (id) {
      var el = document_ && document_.getElementById && document_.getElementById(id);
      if (el && !(el.getAttribute && el.getAttribute('data-jurnii-mounted'))) {
        mounts.push({ id: id, el: el, mode: id === 'jurnii-manage-inline' ? 'manage' : 'book' });
      }
    });
    return { mounts: mounts, interceptModal: g.JURNII_BOOKING_EMBEDDED !== true };
  }

  function bootstrap() {
    var plan = bootstrapPlan(doc, win);
    plan.mounts.forEach(function (m) {
      render(m.el, { mode: m.mode, embedded: false });
    });

    if (!plan.interceptModal) return;

    // Delegated, and deliberately narrow: the legacy `.open-booking-modal-btn`
    // class and a `book.html` href, which is what the pre-SPA pages used.
    doc.addEventListener('click', function (e) {
      if (win.JURNII_BOOKING_EMBEDDED === true) return;
      var el = e.target;
      while (el && el !== doc.body) {
        if (el.classList && el.classList.contains('open-booking-modal-btn')) {
          e.preventDefault();
          openOwnModal();
          return;
        }
        var href = el.tagName === 'A' && el.getAttribute && el.getAttribute('href');
        if (href === 'book.html' || href === '/book.html') {
          if (!doc.getElementById('jurnii-booking-form-inline')) {
            e.preventDefault();
            openOwnModal();
            return;
          }
        }
        el = el.parentElement;
      }
    });
  }

  if (doc && opts0.bootstrap !== false) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', bootstrap);
    else bootstrap();
  }

  return {
    version: '2.0.0',
    render: render,
    renderManage: renderManage,
    openModal: openOwnModal,
    closeModal: closeOwnModal,
    /** Test-only seams. Not part of the page-facing contract. */
    internals: {
      COPY: COPY,
      classifyBooking: classifyBooking,
      classifyStatus: classifyStatus,
      nextPollDelay: nextPollDelay,
      productsForSubmit: productsForSubmit,
      PRODUCT_OPTIONS: PRODUCT_OPTIONS,
      filterJobTitles: filterJobTitles,
      effectiveJobTitle: effectiveJobTitle,
      JOB_TITLE_OTHER: JOB_TITLE_OTHER,
      JOB_TITLE_MAX_VISIBLE: JOB_TITLE_MAX_VISIBLE,
      manageActions: manageActions,
      resolveEmbedded: resolveEmbedded,
      resolveInternal: resolveInternal,
      readPlacement: readPlacement,
      bootstrapPlan: bootstrapPlan,
      bookingHostMarkup: bookingHostMarkup,
      bucketSlotsByLocalDay: bucketSlotsByLocalDay,
      localDateKey: localDateKey,
      fromLocalDateKey: fromLocalDateKey,
      captureFirstTouch: captureFirstTouch,
      firstTouch: firstTouch,
      formMarkup: formMarkup,
      manageMarkup: manageMarkup,
      loadSnapshot: loadSnapshot,
      saveSnapshot: saveSnapshot,
      clearSnapshot: clearSnapshot,
      POLL_FIRST_MS: POLL_FIRST_MS,
      POLL_MAX_MS: POLL_MAX_MS,
      POLL_GIVE_UP_MS: POLL_GIVE_UP_MS
    }
  };
});
