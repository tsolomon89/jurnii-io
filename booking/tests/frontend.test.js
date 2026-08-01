'use strict';

/**
 * Frontend consolidation tests.
 *
 * The widget is installed against a jsdom window rather than a real one, which is
 * why `booking/assets/booking-form.js` exports its factory un-invoked under
 * CommonJS. Two kinds of assertion appear here and both are deliberate:
 *
 *   · DOM integration — render, mount, poll, and the states a visitor actually
 *     reaches. These drive the real code path end to end.
 *   · Pure classifiers — `classifyBooking` / `classifyStatus` / `manageActions`
 *     are the whole API contract expressed as data, so each response the backend
 *     can return is asserted directly instead of being inferred from a side
 *     effect several layers away.
 *
 * Timers are faked by replacing `win.setTimeout`, so the 3s → 10s poll ladder is
 * exercised without any real waiting and without a test-only seam in the widget.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const factoryPath = path.join(__dirname, '..', 'assets', 'booking-form.js');
const countries = require('../config/countries');

/* ===================================================================== *
 * Harness
 * ===================================================================== */

function freshFactory() {
  delete require.cache[require.resolve(factoryPath)];
  return require(factoryPath);
}

function makeWindow(bodyHtml, url) {
  const dom = new JSDOM(
    '<!doctype html><html><body>' + (bodyHtml || '') + '</body></html>',
    { url: url || 'https://jurnii.io/pricing?utm_source=linkedin&utm_medium=paid&gclid=abc123' }
  );
  const win = dom.window;
  // The shared config, already present — exactly as the concatenation-free
  // production page provides it via /booking/config/countries.js.
  win.JurniiBookingCountries = countries;
  win.localStorage.clear();
  return { dom, win };
}

/** Replace the window's timers so poll ladders run under test control. */
function fakeTimers(win) {
  let seq = 0;
  const pending = new Map();
  win.setTimeout = (fn) => { const id = ++seq; pending.set(id, fn); return id; };
  win.clearTimeout = (id) => { pending.delete(id); };
  return {
    count: () => pending.size,
    /** Run the oldest pending timer and drain the promise chain it starts. */
    async fire() {
      const next = pending.entries().next();
      if (next.done) return false;
      const [id, fn] = next.value;
      pending.delete(id);
      fn();
      await drain();
      return true;
    },
  };
}

async function drain(rounds) {
  for (let i = 0; i < (rounds || 6); i++) await new Promise((r) => setImmediate(r));
}

/**
 * A routing fetch stub. Routes are `[method, /regex/, handler]`; the handler may be
 * a static `{status, body}` or a function of the call index.
 */
function stubFetch(win, routes) {
  const calls = [];
  win.fetch = (url, init) => {
    const method = (init && init.method) || 'GET';
    const call = {
      method,
      url: String(url),
      body: init && init.body ? JSON.parse(init.body) : null,
      headers: (init && init.headers) || {},
    };
    calls.push(call);
    const hit = routes.find((r) => r[0] === method && r[1].test(call.url));
    if (!hit) return Promise.reject(new Error('unrouted ' + method + ' ' + call.url));
    const nth = calls.filter((c) => c.method === method && hit[1].test(c.url)).length;
    const out = typeof hit[2] === 'function' ? hit[2](nth, call) : hit[2];
    if (out === 'network-error') return Promise.reject(new Error('offline'));
    return Promise.resolve({
      status: out.status,
      ok: out.status >= 200 && out.status < 300,
      json: () => Promise.resolve(out.body === undefined ? {} : out.body),
    });
  };
  return calls;
}

const JID = '11111111-2222-4333-8444-555555555555';
const SLOT = '2026-09-15T13:00:00.000Z';

const R = {
  availability: [/\/availability$/],
  start: [/\/submissions\/start$/],
  page2: [/\/submissions\/[0-9a-f-]+$/i],
  bookings: [/\/bookings$/],
  status: [/\/bookings\/[^/]+\/status$/],
  reschedule: [/\/bookings\/[^/]+\/reschedule$/],
  cancel: [/\/bookings\/[^/]+$/],
};

function okAvailability(starts) {
  return { status: 200, body: { slots: (starts || [SLOT]).map((s) => ({ start: s, end: s })) } };
}

/** Drive a fresh instance all the way to the slot-selected state on step 3. */
async function upToSlotSelected(win, JB, extraRoutes) {
  const container = win.document.createElement('div');
  win.document.body.appendChild(container);
  const calls = stubFetch(win, (extraRoutes || []).concat([
    ['POST', R.start[0], { status: 200, body: { journeyId: JID, token: 'flow-1', step: 1 } }],
    ['PATCH', R.page2[0], { status: 200, body: { journeyId: JID, token: 'flow-2', step: 2 } }],
    ['GET', R.availability[0], okAvailability()],
  ]));
  const inst = JB.render(container, { onClose() {} });
  await drain();
  inst._setValues({
    firstName: 'Alex', lastName: 'Mercer', email: 'alex@acme.com',
    company: 'Acme', jobTitle: 'Head of Product', countryIso2: 'GB', nationalNumber: '07123 456789',
  });
  await inst._submitPage1();
  await drain();
  await inst._submitPage2();
  await drain();
  // The visitor picks a day, then a time — the calendar deliberately preselects
  // neither, exactly as it does today.
  const day = container.querySelector('.jurnii-calendar-day.available');
  assert.ok(day, 'an available day should be rendered');
  day.dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  const btn = container.querySelector('.jurnii-time-slot-btn');
  assert.ok(btn, 'a time slot button should be rendered');
  btn.dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  return { container, inst, calls };
}

/* ===================================================================== *
 * 1. The shared render API and embedded-modal mode
 * ===================================================================== */

test('render() is the shared entry point and returns a live instance', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  assert.strictEqual(typeof JB.render, 'function');
  assert.strictEqual(typeof JB.renderManage, 'function');

  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const inst = JB.render(el, {});
  await drain();
  assert.strictEqual(inst.kind, 'booking');
  assert.ok(el.querySelector('[data-jurnii-booking-root]'), 'the form should be painted into the container');
  assert.strictEqual(el.getAttribute('data-jurnii-mounted'), '1');
});

test('embedded mode opens no modal of its own and paints no second close button', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);

  // Exactly the site.jsx call: a host modal supplies onClose.
  JB.render(el, { onClose() {} });
  await drain();

  assert.strictEqual(win.JURNII_BOOKING_EMBEDDED, true, 'a host modal must mark the page embedded');
  assert.strictEqual(el.querySelector('.jurnii-close-btn'), null,
    'the site modal already has .demo-modal-close; a second close button must not appear');
  assert.strictEqual(win.document.querySelector('.jurnii-modal-overlay'), null,
    'the module must not create its own overlay in embedded mode');

  // And its own modal opener becomes inert, so one CTA click cannot open two modals.
  assert.strictEqual(JB.openModal(), null);
  assert.strictEqual(win.document.querySelector('.jurnii-modal-overlay'), null);
});

test('the module still owns a modal for non-embedded (legacy/inline) hosts', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const inst = JB.openModal();
  await drain();
  assert.ok(inst, 'a non-embedded page may open the module modal');
  const overlay = win.document.querySelector('.jurnii-modal-overlay');
  assert.ok(overlay && overlay.classList.contains('active'));
  assert.ok(overlay.querySelector('.jurnii-close-btn'), 'its own modal does need its own close button');
  JB.closeModal();
  assert.strictEqual(overlay.classList.contains('active'), false);
});

test('resolveEmbedded honours the explicit flag, onClose, and the page-level global', () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const r = JB.internals.resolveEmbedded;
  assert.strictEqual(r({ embedded: true }), true);
  assert.strictEqual(r({ embedded: false, onClose() {} }), false, 'an explicit false wins');
  assert.strictEqual(r({ onClose() {} }), true);
  assert.strictEqual(r({}), false);
  win.JURNII_BOOKING_EMBEDDED = true;
  assert.strictEqual(r({}), true);
});

test('re-rendering one container replaces the instance instead of stacking listeners', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  JB.render(el, {});
  await drain();
  JB.render(el, {});
  await drain();
  assert.strictEqual(el.querySelectorAll('[data-jurnii-booking-root]').length, 1);
});

/* ===================================================================== *
 * 2. Inline auto-mount
 * ===================================================================== */

test('bootstrap auto-mounts genuine inline placements', async () => {
  const { win } = makeWindow('<div id="jurnii-booking-form-inline" data-form-placement="pricing-inline"></div>');
  const JB = freshFactory()(win);       // bootstrap ON, as a plain <script src> does
  await drain();
  const el = win.document.getElementById('jurnii-booking-form-inline');
  assert.ok(el.querySelector('[data-jurnii-booking-root]'), 'the inline container should be mounted');
  assert.ok(JB.render, 'the public API is still available for hosts');
});

test('bootstrap auto-mounts the manage container as the manage UI, not the booking form', async () => {
  const { win } = makeWindow('<div id="jurnii-manage-inline"></div>', 'https://jurnii.io/manage.html');
  stubFetch(win, [['GET', R.status[0], { status: 200, body: {} }]]);
  freshFactory()(win);
  await drain();
  const el = win.document.getElementById('jurnii-manage-inline');
  assert.ok(el.querySelector('[data-jurnii-manage-root]'), 'the manage UI should mount');
  assert.strictEqual(el.querySelector('[data-jurnii-booking-root]'), null);
});

test('bootstrapPlan suppresses modal interception when a host owns the chrome, but keeps auto-mount', () => {
  const { win } = makeWindow('<div id="jurnii-booking-form-inline"></div>');
  const JB = freshFactory()(win, { bootstrap: false });
  const plan = JB.internals.bootstrapPlan(win.document, {});
  assert.strictEqual(plan.interceptModal, true);
  assert.strictEqual(plan.mounts.length, 1);

  const embedded = JB.internals.bootstrapPlan(win.document, { JURNII_BOOKING_EMBEDDED: true });
  assert.strictEqual(embedded.interceptModal, false, 'the host owns the CTA');
  assert.strictEqual(embedded.mounts.length, 1, 'a real inline placement must still mount');
});

test('an already-mounted container is not mounted twice by the bootstrap', async () => {
  const { win } = makeWindow('<div id="jurnii-booking-form-inline" data-jurnii-mounted="1"></div>');
  const JB = freshFactory()(win, { bootstrap: false });
  const plan = JB.internals.bootstrapPlan(win.document, {});
  assert.strictEqual(plan.mounts.length, 0);
});

/* ===================================================================== *
 * 3. Form data: ISO2 countries, shared phone normalisation, attribution
 * ===================================================================== */

test('the country select carries ISO2 values from the shared config, with no dial-code inference', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  JB.render(el, {});
  await drain();

  const sel = el.querySelector('[data-field="countryIso2"]');
  const values = Array.prototype.map.call(sel.options, (o) => o.value);
  assert.deepStrictEqual(values, countries.COUNTRIES.map((c) => c.iso2));
  assert.ok(values.includes('GB') && values.includes('US'));
  // A dial code must never be a country value — spec §6 forbids the inference the
  // old form made, mapping '+44' back to 'United Kingdom'.
  assert.ok(!values.some((v) => v.startsWith('+')));
  assert.match(sel.options[0].textContent, /United Kingdom \(\+44\)/);
});

test('Page 2 sends the shared normalisation: +44 with a domestic 07123 456789 becomes +447123456789', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const { calls } = await upToSlotSelected(win, JB);
  const patch = calls.find((c) => c.method === 'PATCH');
  assert.strictEqual(patch.body.countryIso2, 'GB');
  assert.strictEqual(patch.body.dialCode, '+44');
  assert.strictEqual(patch.body.nationalNumber, '7123456789', 'the trunk 0 must be stripped');
  assert.strictEqual(patch.body.e164, '+447123456789');
  // The live bug this replaces.
  assert.notStrictEqual(patch.body.e164, '+4407123456789');
});

test('a phone that fails the shared normaliser is refused client-side with authored copy', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [['PATCH', R.page2[0], { status: 200, body: {} }]]);
  const inst = JB.render(el, {});
  await drain();
  inst._setValues({ company: 'Acme', jobTitle: 'Head', countryIso2: 'GB', nationalNumber: '12' });
  inst._setJourney(JID, 'flow-2');
  const ok = await inst._submitPage2();
  assert.strictEqual(ok, false);
  assert.strictEqual(calls.length, 0, 'no request is made for input the shared config already rejects');
  assert.match(el.querySelector('[data-role="notice"]').textContent, /too short/i);
});

test('"Not sure yet" omits productInterest rather than sending a value the server would 400', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const p = JB.internals.productForSubmit;
  // canonicalProduct('Not sure yet') is null by design, and the handler rejects a
  // supplied-but-non-canonical product, so sending it would 400 a valid choice.
  assert.strictEqual(p('Not sure yet'), undefined);
  assert.strictEqual(p(''), undefined);
  assert.strictEqual(p('Jurnii UX'), 'Jurnii UX');

  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [
    ['PATCH', R.page2[0], { status: 200, body: { token: 'flow-2' } }],
    ['GET', R.availability[0], okAvailability()],
  ]);
  const inst = JB.render(el, {});
  await drain();
  inst._setValues({ company: 'A', jobTitle: 'B', countryIso2: 'GB', nationalNumber: '7123456789', productInterest: 'Not sure yet' });
  inst._setJourney(JID, 'flow-2');
  await inst._submitPage2();
  await drain();
  const patch = calls.find((c) => c.method === 'PATCH');
  assert.strictEqual('productInterest' in patch.body, false);
});

test('first-touch attribution is captured once and replayed from the snapshot, not re-read at submit', async () => {
  const { win } = makeWindow(
    '',
    'https://jurnii.io/landing?utm_source=linkedin&utm_medium=paid&utm_campaign=q3&gclid=abc123'
  );
  const JB = freshFactory()(win, { bootstrap: false });
  const first = JB.internals.firstTouch();
  assert.strictEqual(first.utm_source, 'linkedin');
  assert.strictEqual(first.utm_campaign, 'q3');
  assert.strictEqual(first.attribution_extra.gclid, 'abc123');
  assert.match(first.landing_url, /\/landing\?/);

  // The visitor navigates on; the stored first touch must win.
  win.history.replaceState({}, '', '/pricing?utm_source=organic');
  const second = JB.internals.firstTouch();
  assert.strictEqual(second.utm_source, 'linkedin', 'first touch is immutable (spec §7.3)');
  assert.match(second.landing_url, /\/landing\?/);

  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [['POST', R.start[0], { status: 200, body: { journeyId: JID, token: 't' } }]]);
  const inst = JB.render(el, { formPlacement: 'site-demo-modal', ctaId: 'book-a-demo' });
  await drain();
  inst._setValues({ firstName: 'A', lastName: 'B', email: 'a@acme.com' });
  await inst._submitPage1();
  const body = calls[0].body;
  assert.strictEqual(body.utm_source, 'linkedin');
  assert.strictEqual(body.attributionExtra.gclid, 'abc123');
  assert.strictEqual(body.formPlacement, 'site-demo-modal');
  assert.strictEqual(body.ctaId, 'book-a-demo');
  assert.ok(body.clientTimezone, 'the client timezone is captured');
});

test('placement metadata comes from render options first, then container data-*', () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  el.setAttribute('data-form-placement', 'from-attr');
  el.setAttribute('data-cta-id', 'attr-cta');
  el.setAttribute('data-form-variant', 'attr-variant');
  const fromAttrs = JB.internals.readPlacement(el, {});
  assert.deepStrictEqual(fromAttrs, { formPlacement: 'from-attr', ctaId: 'attr-cta', formVariant: 'attr-variant' });
  const fromOpts = JB.internals.readPlacement(el, { formPlacement: 'from-opts' });
  assert.strictEqual(fromOpts.formPlacement, 'from-opts');
  assert.strictEqual(fromOpts.ctaId, 'attr-cta');
  // Hidden metadata only — never a visible field.
  assert.strictEqual(JB.internals.formMarkup({}).includes('formPlacement'), false);
});

/* ===================================================================== *
 * 4. Timezone / date bucketing
 * ===================================================================== */

test('slots bucket by the visitor local day, so an evening slot west of UTC is not misfiled', () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const { bucketSlotsByLocalDay, localDateKey } = JB.internals;

  const iso = '2026-09-15T23:30:00.000Z';
  const local = new Date(iso);
  const buckets = bucketSlotsByLocalDay([{ start: iso }]);
  const keys = Object.keys(buckets);
  assert.strictEqual(keys.length, 1);
  // The key is the day the visitor's own label reads — which is what the old
  // `slot.start.startsWith(localYmd)` comparison against a UTC ISO string got wrong.
  assert.strictEqual(keys[0], localDateKey(local));
  assert.strictEqual(keys[0], local.getFullYear() + '-'
    + String(local.getMonth() + 1).padStart(2, '0') + '-'
    + String(local.getDate()).padStart(2, '0'));
});

test('a YYYY-MM-DD key round-trips through LOCAL midnight, never UTC midnight', () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const { fromLocalDateKey, localDateKey } = JB.internals;
  const d = fromLocalDateKey('2026-09-15');
  assert.strictEqual(d.getFullYear(), 2026);
  assert.strictEqual(d.getMonth(), 8);
  assert.strictEqual(d.getDate(), 15);
  assert.strictEqual(d.getHours(), 0);
  assert.strictEqual(localDateKey(d), '2026-09-15');
  // `new Date('2026-09-15')` is UTC midnight and drifts a day west of UTC.
  assert.strictEqual(localDateKey(fromLocalDateKey(localDateKey(d))), '2026-09-15');
});

test('the submitted slotStart is the server ISO string verbatim, never re-derived', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const { container, inst, calls } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 200, body: { status: 'confirmed', bookingId: JID, slotStart: SLOT } }],
  ]);
  assert.strictEqual(container.querySelector('.jurnii-time-slot-btn.selected').getAttribute('data-start'), SLOT);
  await inst._submitBooking();
  await drain();
  const post = calls.find((c) => c.method === 'POST' && /\/bookings$/.test(c.url));
  // Byte-identical to what /availability offered. Display is bucketed in the
  // visitor's zone; the value on the wire is never re-derived from that label.
  assert.strictEqual(post.body.slotStart, SLOT);
});

/* ===================================================================== *
 * 5. Booking outcomes — the classifier is the contract
 * ===================================================================== */

test('classifyBooking maps every documented response to a safe next action', () => {
  const { win } = makeWindow();
  const c = freshFactory()(win, { bootstrap: false }).internals.classifyBooking;

  assert.deepStrictEqual(c({ status: 200, data: { status: 'confirmed' } }), { action: 'confirmed' });
  assert.deepStrictEqual(c({ status: 202, data: { pollAfterMs: 3000 } }), { action: 'poll', pollAfterMs: 3000 });
  assert.strictEqual(c({ status: 409, data: { code: 'SLOT_TAKEN' } }).action, 'reselect');
  assert.strictEqual(c({ status: 409, data: { code: 'booking_needs_attention' } }).action, 'needs_attention');
  assert.strictEqual(c({ status: 409, data: { code: 'already_booked' } }).action, 'message');
  assert.strictEqual(c({ status: 409, data: { code: 'booking_cancelled' } }).action, 'message');
  assert.strictEqual(c({ status: 400, data: { code: 'validation', reason: 'slot_too_soon' } }).copyKey, 'slot_too_soon');
  assert.strictEqual(c({ status: 502, data: { code: 'booking_failed' } }).action, 'reselect');
  assert.strictEqual(c({ status: 503, data: { code: 'calendar_misconfigured' } }).copyKey, 'calendar_misconfigured');
  assert.strictEqual(c({ status: 0, data: {} }).copyKey, 'offline');
  // A 200 that is not `confirmed` must never be treated as success.
  assert.strictEqual(c({ status: 200, data: { status: 'something_else' } }).action, 'error');
});

test('the obsolete 409 MANUAL_REVIEW branch is gone', () => {
  const src = fs.readFileSync(factoryPath, 'utf8');
  assert.strictEqual(/MANUAL_REVIEW/.test(src), false,
    'Page 1 makes no Zoho call, so ambiguity is undiscoverable there and the branch is dead');
});

test('409 journey_conflict transparently mints a fresh journey and retries once', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [
    ['POST', R.start[0], (nth) => (nth === 1
      ? { status: 409, body: { code: 'journey_conflict', error: 'journey_conflict' } }
      : { status: 200, body: { journeyId: 'aaaaaaaa-2222-4333-8444-555555555555', token: 'flow-1' } })],
  ]);
  const inst = JB.render(el, {});
  await drain();
  inst._setValues({ firstName: 'A', lastName: 'B', email: 'a@acme.com' });
  const ok = await inst._submitPage1();
  await drain();

  assert.strictEqual(ok, true, 'the visitor should not see a conflict they did not cause');
  assert.strictEqual(calls.length, 2, 'exactly one retry');
  assert.notStrictEqual(calls[1].body.journeyId, calls[0].body.journeyId, 'a genuinely fresh journeyId');
  assert.strictEqual(inst._step(), '2');
  // And the retry is bounded: a second conflict is not retried again.
  const el2 = win.document.createElement('div');
  win.document.body.appendChild(el2);
  const calls2 = stubFetch(win, [['POST', R.start[0], { status: 409, body: { code: 'journey_conflict' } }]]);
  const inst2 = JB.render(el2, {});
  await drain();
  inst2._setValues({ firstName: 'A', lastName: 'B', email: 'b@acme.com' });
  assert.strictEqual(await inst2._submitPage1(), false);
  assert.strictEqual(calls2.length, 2);
});

test('confirmation renders from the response, with no shipped placeholders anywhere', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const markup = JB.internals.formMarkup({});
  for (const ghost of ['REG_XXXXXXXXX', 'July 15, 2026', '2:00 PM CET', 'Generating link...']) {
    assert.strictEqual(markup.includes(ghost), false, ghost + ' must not be shipped');
  }
  // The hardcoded "Status: Confirmed" row is gone; status is not asserted as copy.
  assert.strictEqual(/>\s*Status:\s*</.test(markup), false);

  const { container, inst } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 200, body: {
      status: 'confirmed', bookingId: JID, slotStart: SLOT,
      meetLink: 'https://meet.google.com/abc-defg-hij',
      manageUrl: 'https://jurnii.io/manage.html?token=tok&id=' + JID,
    } }],
  ]);
  await inst._submitBooking();
  await drain();

  assert.strictEqual(inst._step(), 'confirmed');
  assert.strictEqual(container.querySelector('[data-role="confirm-ref"]').textContent, JID);
  assert.match(container.querySelector('[data-role="confirm-time"]').textContent, /2026/);
  assert.match(container.querySelector('[data-role="confirm-meet"]').innerHTML, /meet\.google\.com\/abc-defg-hij/);
  const manageRow = container.querySelector('[data-role="confirm-manage-row"]');
  assert.notStrictEqual(manageRow.style.display, 'none');
  assert.match(container.querySelector('[data-role="confirm-manage"]').getAttribute('href'), /manage\.html\?token=tok/);
});

test('a confirmed booking with meetLink:null is a success, not a failure', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const { container, inst } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 200, body: {
      status: 'confirmed', bookingId: JID, slotStart: SLOT, meetLink: null,
      manageUrl: 'https://jurnii.io/manage.html?token=t&id=' + JID,
    } }],
  ]);
  await inst._submitBooking();
  await drain();
  assert.strictEqual(inst._step(), 'confirmed');
  assert.strictEqual(container.querySelector('[data-role="confirm-meet"]').textContent, 'Invitation sent via email');
  assert.strictEqual(container.querySelector('[data-role="notice"]').style.display, 'none', 'no error is shown');
});

test('a non-http meetLink or manageUrl is never written into an href', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const { container, inst } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 200, body: {
      status: 'confirmed', bookingId: JID, slotStart: SLOT,
      meetLink: 'javascript:alert(1)', manageUrl: 'javascript:alert(2)',
    } }],
  ]);
  await inst._submitBooking();
  await drain();
  assert.strictEqual(container.querySelector('[data-role="confirm-meet"]').textContent, 'Invitation sent via email');
  assert.strictEqual(container.querySelector('[data-role="confirm-manage-row"]').style.display, 'none');
  assert.strictEqual(container.innerHTML.includes('javascript:'), false);
});

/* ===================================================================== *
 * 6. 202 booking_pending → status polling → terminal
 * ===================================================================== */

test('202 booking_pending polls the status endpoint with the flow token and confirms', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const timers = fakeTimers(win);
  const { container, inst, calls } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 202, body: { status: 'booking_pending', bookingId: JID, pollAfterMs: 3000 } }],
    ['GET', R.status[0], (nth) => (nth < 3
      ? { status: 200, body: { bookingStatus: 'booking_pending', integrationStatus: 'pending' } }
      : { status: 200, body: {
        bookingStatus: 'confirmed', slotStart: SLOT, meetLink: null,
        manageUrl: 'https://jurnii.io/manage.html?token=late&id=' + JID,
      } })],
  ]);

  await inst._submitBooking();
  await drain();
  assert.strictEqual(inst._step(), 'pending');
  assert.match(container.querySelector('[data-role="pending-msg"]').textContent, /Confirming your booking/i);

  await timers.fire();   // poll 1 → still pending
  await timers.fire();   // poll 2 → still pending
  assert.strictEqual(inst._step(), 'pending');
  await timers.fire();   // poll 3 → confirmed
  assert.strictEqual(inst._step(), 'confirmed');
  assert.strictEqual(timers.count(), 0, 'polling stops on a terminal result');

  const statusCalls = calls.filter((c) => /\/status$/.test(c.url));
  assert.strictEqual(statusCalls.length, 3);
  assert.strictEqual(statusCalls[0].headers.Authorization, 'Bearer flow-2',
    'the browser polls with the flow token it already holds');
  // manageUrl is obtained from the STATUS response on this path — the 202 never carries one.
  assert.match(container.querySelector('[data-role="confirm-manage"]').getAttribute('href'), /token=late/);
});

test('the poll ladder backs off 3s → 10s and never below or above those bounds', () => {
  const { win } = makeWindow();
  const n = freshFactory()(win, { bootstrap: false }).internals.nextPollDelay;
  assert.strictEqual(n(3000), 4500);
  assert.strictEqual(n(4500), 6750);
  assert.strictEqual(n(6750), 10000);
  assert.strictEqual(n(10000), 10000, 'capped');
  assert.strictEqual(n(undefined), 4500);
});

test('classifyStatus treats only real outcomes as terminal', () => {
  const { win } = makeWindow();
  const c = freshFactory()(win, { bootstrap: false }).internals.classifyStatus;
  assert.deepStrictEqual(c({ status: 200, data: { bookingStatus: 'confirmed' } }), { terminal: true, kind: 'confirmed' });
  assert.deepStrictEqual(c({ status: 200, data: { bookingStatus: 'needs_attention' } }), { terminal: true, kind: 'needs_attention' });
  assert.deepStrictEqual(c({ status: 200, data: { bookingStatus: 'booking_failed' } }), { terminal: true, kind: 'booking_failed' });
  assert.deepStrictEqual(c({ status: 200, data: { bookingStatus: 'cancelled' } }), { terminal: true, kind: 'cancelled' });
  assert.strictEqual(c({ status: 200, data: { bookingStatus: 'booking_pending' } }).terminal, false);
  assert.strictEqual(c({ status: 200, data: { bookingStatus: 'reserved' } }).terminal, false);
  // A transport failure is not an outcome: it must not stop the poll.
  assert.deepStrictEqual(c({ status: 0, data: {} }), { terminal: false, kind: 'retry' });
  assert.deepStrictEqual(c({ status: 503, data: {} }), { terminal: false, kind: 'retry' });
  assert.strictEqual(c({ status: 401, data: {} }).kind, 'expired');
});

test('booking_failed returns the visitor to slot selection with a retryable message', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const timers = fakeTimers(win);
  const { container, inst, calls } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 202, body: { status: 'booking_pending', pollAfterMs: 3000 } }],
    ['GET', R.status[0], { status: 200, body: { bookingStatus: 'booking_failed' } }],
  ]);
  await inst._submitBooking();
  await drain();
  await timers.fire();

  assert.strictEqual(inst._step(), '3', 'back to slot selection');
  assert.match(container.querySelector('[data-role="notice"]').textContent, /choose another slot/i);
  assert.strictEqual(container.querySelector('.jurnii-time-slot-btn.selected'), null, 'the stale choice is cleared');
  // G3 proved the slot free again, so availability is re-read before a retry.
  assert.ok(calls.filter((c) => /\/availability$/.test(c.url)).length >= 2);
});

test('the poll gives up after its ceiling with a calm message, not an error', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const timers = fakeTimers(win);
  const realNow = Date.now;
  const { container, inst } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 202, body: { status: 'booking_pending', pollAfterMs: 3000 } }],
    ['GET', R.status[0], { status: 200, body: { bookingStatus: 'booking_pending' } }],
  ]);
  await inst._submitBooking();
  await drain();
  try {
    Date.now = () => realNow() + 10 * 60 * 1000;   // past POLL_GIVE_UP_MS
    await timers.fire();
  } finally {
    Date.now = realNow;
  }
  assert.strictEqual(timers.count(), 0, 'polling stops');
  assert.match(container.querySelector('[data-role="pending-msg"]').textContent, /emailed to you/i);
  assert.strictEqual(inst._step(), 'pending', 'and it stays on the calm waiting screen');
});

test('SLOT_TAKEN reselects and refreshes availability without disturbing anything else', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const { container, inst, calls } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 409, body: { code: 'SLOT_TAKEN', error: 'SLOT_TAKEN' } }],
  ]);
  await inst._submitBooking();
  await drain();
  assert.strictEqual(inst._step(), '3');
  assert.match(container.querySelector('[data-role="notice"]').textContent, /just taken/i);
  assert.ok(calls.filter((c) => /\/availability$/.test(c.url)).length >= 2);
});

/* ===================================================================== *
 * 7. needs_attention
 * ===================================================================== */

test('409 booking_needs_attention shows the support panel and hides every booking action', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const { container, inst } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 409, body: {
      code: 'booking_needs_attention', error: 'booking_needs_attention',
    } }],
  ]);
  await inst._submitBooking();
  await drain();

  assert.strictEqual(inst._step(), 'attention');
  const panel = container.querySelector('[data-step="attention"]');
  assert.ok(panel.classList.contains('active'));
  // Actions live on the other steps, all of which are now inactive.
  ['confirm', 'next-1', 'next-2'].forEach((role) => {
    const btn = container.querySelector('[data-role="' + role + '"]');
    const step = btn && btn.closest('.jurnii-form-step');
    assert.strictEqual(step.classList.contains('active'), false, role + ' must not be reachable');
  });
  assert.match(panel.textContent, /looking into this/i);
  assert.ok(container.querySelector('[data-role="support-link"]').getAttribute('href').startsWith('mailto:'));
});

test('no reason code, CRM id, calendar id or raw server text reaches the page', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const { container, inst } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 409, body: {
      code: 'booking_needs_attention',
      // Deliberately hostile payload: none of this may be rendered.
      error: 'google_calendar_unreadable on calendar demos@jurnii.io',
      reason: 'google_calendar_unreadable',
      zohoContactId: '5566778899',
      googleCalendarId: 'demos@jurnii.io',
    } }],
  ]);
  await inst._submitBooking();
  await drain();
  const html = container.innerHTML;
  for (const leak of ['google_calendar_unreadable', 'demos@jurnii.io', '5566778899']) {
    assert.strictEqual(html.includes(leak), false, leak + ' must never be rendered');
  }
});

/* ===================================================================== *
 * 8. Availability failure
 * ===================================================================== */

test('503 availability_unavailable says so explicitly and offers a retry', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [
    ['GET', R.availability[0], (nth) => (nth === 1
      ? { status: 503, body: { code: 'availability_unavailable', error: 'availability_unavailable' } }
      : okAvailability())],
  ]);
  const inst = JB.render(el, {});
  await drain();
  await inst._scheduler().load();
  await drain();

  const panel = el.querySelector('[data-role="slots"]');
  assert.match(panel.textContent, /could not load the available times/i);
  const retry = panel.querySelector('[data-role="retry-availability"]');
  assert.ok(retry, 'an explicit retry, not a silently all-disabled calendar');
  // The old form left every day disabled with no explanation at all.
  assert.strictEqual(panel.textContent.includes('availability_unavailable'), false);

  retry.dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  assert.strictEqual(calls.filter((c) => /\/availability$/.test(c.url)).length, 2);
  assert.ok(el.querySelector('.jurnii-calendar-day.available'), 'the retry repopulates the calendar');
});

/* ===================================================================== *
 * 9. The manage page
 * ===================================================================== */

const MANAGE_URL = 'https://jurnii.io/manage.html?token=manage-tok&id=' + JID;

async function mountManage(win, JB, routes) {
  const el = win.document.createElement('div');
  el.id = 'jurnii-manage-inline';
  win.document.body.appendChild(el);
  const calls = stubFetch(win, routes);
  const inst = JB.render(el, {});
  await drain();
  return { el, inst, calls };
}

test('the manage page reads the token, loads state, and hides cancellation while gated', async () => {
  const { win } = makeWindow('', MANAGE_URL);
  const JB = freshFactory()(win, { bootstrap: false });
  const { el, calls } = await mountManage(win, JB, [
    ['GET', R.status[0], { status: 200, body: {
      bookingId: JID, bookingStatus: 'confirmed', slotStart: SLOT, integrationStatus: 'complete',
    } }],
  ]);

  assert.strictEqual(calls[0].headers.Authorization, 'Bearer manage-tok');
  assert.notStrictEqual(el.querySelector('[data-role="to-reschedule"]').style.display, 'none');
  assert.strictEqual(el.querySelector('[data-role="cancel"]').style.display, 'none',
    'BOOKING_CANCELLATION_ENABLED is false in Production, so the button must not be offered');
  const support = el.querySelector('[data-role="support"]');
  assert.notStrictEqual(support.style.display, 'none');
  assert.match(support.textContent, /contact us/i);
  assert.match(support.innerHTML, /mailto:/);
  assert.match(el.querySelector('[data-role="home-time"]').textContent, /2026/);
});

test('the cancel button appears only when a deployment explicitly enables cancellation', async () => {
  const { win } = makeWindow('', MANAGE_URL);
  win.JURNII_BOOKING_CANCELLATION_ENABLED = true;
  const JB = freshFactory()(win, { bootstrap: false });
  const { el } = await mountManage(win, JB, [
    ['GET', R.status[0], { status: 200, body: { bookingStatus: 'confirmed', slotStart: SLOT } }],
  ]);
  assert.notStrictEqual(el.querySelector('[data-role="cancel"]').style.display, 'none');
  assert.strictEqual(el.querySelector('[data-role="support"]').style.display, 'none');
});

test('manageActions is fail-safe: gated, escalated and non-confirmed states offer no action', () => {
  const { win } = makeWindow();
  const m = freshFactory()(win, { bootstrap: false }).internals.manageActions;

  assert.deepStrictEqual(m({ bookingStatus: 'confirmed' }, { cancellationEnabled: false }),
    { reschedule: true, cancel: false, support: true, attention: false });
  assert.deepStrictEqual(m({ bookingStatus: 'confirmed' }, { cancellationEnabled: true }),
    { reschedule: true, cancel: true, support: false, attention: false });
  assert.deepStrictEqual(m({ bookingStatus: 'needs_attention' }, { cancellationEnabled: true }),
    { reschedule: false, cancel: false, support: true, attention: true });
  assert.deepStrictEqual(m({ bookingStatus: 'cancelled' }, { cancellationEnabled: true }),
    { reschedule: false, cancel: false, support: true, attention: false });
  assert.strictEqual(m({ bookingStatus: 'booking_pending' }, {}).reschedule, false);
  // An absent flag is the same as disabled — a misconfiguration must hide the button.
  assert.strictEqual(m({ bookingStatus: 'confirmed' }, {}).cancel, false);
  // T2/T3 keep a real meeting: booking truth stays confirmed and reschedule stays open.
  assert.strictEqual(m({ bookingStatus: 'confirmed', integrationStatus: 'needs_attention' }, { cancellationEnabled: false }).reschedule, true);
});

test('a missing or malformed manage link says so once and offers no action', async () => {
  const { win } = makeWindow('', 'https://jurnii.io/manage.html');
  const JB = freshFactory()(win, { bootstrap: false });
  const { el, calls } = await mountManage(win, JB, []);
  assert.strictEqual(calls.length, 0, 'no request is made without a token');
  assert.match(el.querySelector('[data-role="notice"]').textContent, /invalid or has expired/i);
  assert.strictEqual(el.querySelector('[data-role="home-actions"]').style.display, 'none');
});

test('an expired manage token is reported as a link problem, not as an error code', async () => {
  const { win } = makeWindow('', MANAGE_URL);
  const JB = freshFactory()(win, { bootstrap: false });
  const { el } = await mountManage(win, JB, [
    ['GET', R.status[0], { status: 401, body: { code: 'auth_invalid', error: 'auth_invalid' } }],
  ]);
  assert.match(el.querySelector('[data-role="notice"]').textContent, /invalid or has expired/i);
  assert.strictEqual(el.innerHTML.includes('auth_invalid'), false);
  assert.strictEqual(el.querySelector('[data-role="home-actions"]').style.display, 'none');
});

test('202 reschedule_pending polls status and reports success only once the move lands', async () => {
  const { win } = makeWindow('', MANAGE_URL);
  const JB = freshFactory()(win, { bootstrap: false });
  const timers = fakeTimers(win);
  const { el, inst, calls } = await mountManage(win, JB, [
    ['GET', R.status[0], (nth) => {
      if (nth === 1) return { status: 200, body: { bookingStatus: 'confirmed', slotStart: SLOT } };
      if (nth === 2) return { status: 200, body: { bookingStatus: 'reschedule_pending', pendingSlotStart: SLOT } };
      return { status: 200, body: { bookingStatus: 'confirmed', slotStart: SLOT, pendingSlotStart: null } };
    }],
    ['GET', R.availability[0], okAvailability(['2026-09-16T13:00:00.000Z'])],
    ['PATCH', R.reschedule[0], { status: 202, body: { status: 'reschedule_pending', pollAfterMs: 3000 } }],
  ]);

  el.querySelector('[data-role="to-reschedule"]').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  el.querySelector('.jurnii-calendar-day.available').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  el.querySelector('.jurnii-time-slot-btn').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();

  await inst._reschedule();
  await drain();
  assert.strictEqual(inst._step(), 'pending');
  assert.match(el.querySelector('[data-role="pending-msg"]').textContent, /Updating your booking/i);

  await timers.fire();   // still pending
  assert.strictEqual(inst._step(), 'pending');
  await timers.fire();   // landed
  assert.strictEqual(inst._step(), 'result');
  assert.match(el.querySelector('[data-role="result-msg"]').textContent, /updated calendar invitation/i);
  assert.strictEqual(timers.count(), 0);
  assert.strictEqual(calls.find((c) => c.method === 'PATCH').body.slotStart, '2026-09-16T13:00:00.000Z');
});

test('409 action_in_progress on reschedule is reported without losing the booking', async () => {
  const { win } = makeWindow('', MANAGE_URL);
  const JB = freshFactory()(win, { bootstrap: false });
  const { el, inst } = await mountManage(win, JB, [
    ['GET', R.status[0], { status: 200, body: { bookingStatus: 'confirmed', slotStart: SLOT } }],
    ['GET', R.availability[0], okAvailability()],
    ['PATCH', R.reschedule[0], { status: 409, body: { code: 'action_in_progress', error: 'action_in_progress' } }],
  ]);
  el.querySelector('[data-role="to-reschedule"]').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  el.querySelector('.jurnii-calendar-day.available').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  el.querySelector('.jurnii-time-slot-btn').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();

  assert.strictEqual(await inst._reschedule(), false);
  assert.match(el.querySelector('[data-role="notice"]').textContent, /already in progress/i);
  assert.strictEqual(el.innerHTML.includes('action_in_progress'), false);
  assert.strictEqual(inst._step(), 'reschedule', 'the visitor keeps their place');
});

test('an escalated journey renders the manage attention panel with no action and no detail', async () => {
  const { win } = makeWindow('', MANAGE_URL);
  win.JURNII_BOOKING_CANCELLATION_ENABLED = true;
  const JB = freshFactory()(win, { bootstrap: false });
  const { el, inst } = await mountManage(win, JB, [
    ['GET', R.status[0], { status: 200, body: {
      bookingStatus: 'needs_attention', integrationStatus: 'needs_attention', slotStart: SLOT,
    } }],
  ]);
  assert.strictEqual(inst._step(), 'attention');
  assert.strictEqual(el.querySelector('[data-role="home-actions"]').style.display, 'none');
  assert.match(el.querySelector('[data-step="attention"]').textContent, /looking into this/i);
});

test('SLOT_TAKEN on reschedule refreshes availability and keeps the existing booking', async () => {
  const { win } = makeWindow('', MANAGE_URL);
  const JB = freshFactory()(win, { bootstrap: false });
  const { el, inst, calls } = await mountManage(win, JB, [
    ['GET', R.status[0], { status: 200, body: { bookingStatus: 'confirmed', slotStart: SLOT } }],
    ['GET', R.availability[0], okAvailability()],
    ['PATCH', R.reschedule[0], { status: 409, body: { code: 'SLOT_TAKEN' } }],
  ]);
  el.querySelector('[data-role="to-reschedule"]').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  el.querySelector('.jurnii-calendar-day.available').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  el.querySelector('.jurnii-time-slot-btn').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  await inst._reschedule();
  await drain();
  assert.match(el.querySelector('[data-role="notice"]').textContent, /just taken/i);
  assert.strictEqual(inst._step(), 'reschedule');
  assert.ok(calls.filter((c) => /\/availability$/.test(c.url)).length >= 2);
});

test('a cancel attempt while gated makes no request at all', async () => {
  const { win } = makeWindow('', MANAGE_URL);
  const JB = freshFactory()(win, { bootstrap: false });
  const { el, inst, calls } = await mountManage(win, JB, [
    ['GET', R.status[0], { status: 200, body: { bookingStatus: 'confirmed', slotStart: SLOT } }],
  ]);
  const before = calls.length;
  assert.strictEqual(await inst._cancel(), false);
  assert.strictEqual(calls.length, before, 'no DELETE is issued while cancellation is disabled');
  assert.match(el.querySelector('[data-role="notice"]').textContent, /contact us/i);
});

/* ===================================================================== *
 * 10. Consolidation: one implementation, valid deployed paths
 * ===================================================================== */

test('the legacy assets/booking-form.js is deleted and nothing runtime references it', () => {
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'assets', 'booking-form.js')), false,
    'the legacy Calendar-iframe stub must be gone, not merely unused');

  // Scan everything that can execute or be served. Excluded, deliberately: `docs`
  // (prose), the unserved `.agents/context/legacy` snapshot, and `src/generated`
  // (gitignored build output, rewritten from the HTML inputs on every build).
  const SKIP_DIRS = new Set(['node_modules', 'docs', 'generated']);
  const files = [path.join(ROOT, 'index.html'), path.join(ROOT, 'manage.html'), path.join(ROOT, 'vite.config.js')];
  for (const r of ['assets', 'src', 'scripts', 'api', 'booking']) {
    const abs = path.join(ROOT, r);
    if (!fs.existsSync(abs)) continue;
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) walk(p); }
        else if (/\.(js|jsx|ts|tsx|html|css)$/.test(entry.name)) files.push(p);
      }
    })(abs);
  }

  // A reference RESOLVING TO THE DELETED ROOT FILE. `booking/assets/booking-form.js`
  // and the examples' `../assets/booking-form.js` both resolve to the shared module
  // and are correct, so the character before `/assets` must be neither a word
  // character (…booking/assets) nor a dot (../assets).
  const ROOT_REF = /(?<![.\w])\/assets\/booking-form\.js/;
  const BARE_REF = /["']assets\/booking-form\.js/;
  const offenders = [];
  for (const f of files) {
    if (f === __filename) continue;   // this file names the path in order to assert it is gone
    const src = fs.readFileSync(f, 'utf8');
    if (ROOT_REF.test(src) || BARE_REF.test(src)) offenders.push(path.relative(ROOT, f));
  }
  assert.deepStrictEqual(offenders, [], 'these still point at the deleted legacy form');

  // Sanity-check the matcher itself, so a silently-never-matching regex cannot pass.
  assert.strictEqual(ROOT_REF.test('src="/assets/booking-form.js"'), true);
  assert.strictEqual(BARE_REF.test("s.src = 'assets/booking-form.js';"), true);
  assert.strictEqual(ROOT_REF.test('src="/booking/assets/booking-form.js"'), false);
  assert.strictEqual(ROOT_REF.test('src="../assets/booking-form.js"'), false);
});

test('site.jsx loads the shared module by an absolute path and marks the page embedded', () => {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'site.jsx'), 'utf8');
  assert.match(src, /BOOKING_SRC\s*=\s*'\/booking\/assets\/booking-form\.js'/,
    'absolute: a relative src 404s on every nested route');
  assert.match(src, /window\.JURNII_BOOKING_EMBEDDED\s*=\s*true/);
  assert.match(src, /JurniiBooking\.render\(/);
  // The flag must be set BEFORE the script is appended, or the module's bootstrap
  // wires a competing modal as it loads.
  const flagAt = src.indexOf('JURNII_BOOKING_EMBEDDED = true');
  const appendAt = src.indexOf('document.body.appendChild(s)');
  assert.ok(flagAt > -1 && appendAt > -1 && flagAt < appendAt, 'the flag must precede injection');
});

test('index.html loads the booking stylesheet explicitly', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /<link rel="stylesheet" href="\/booking\/assets\/booking-form\.css">/,
    'nothing @imports it, so it must be linked');
});

test('the build declares every booking runtime file and the manage page', () => {
  const cfg = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
  for (const rel of ['booking/assets/booking-form.js', 'booking/assets/booking-form.css', 'booking/config/countries.js']) {
    assert.ok(cfg.includes(rel), rel + ' must be copied into dist');
  }
  assert.match(cfg, /dist\/manage\.html/, 'manage.html must be emitted');
  // A vanished source file must fail the build, not ship a 404.
  assert.match(cfg, /required booking file missing/);
  assert.strictEqual(/'booking-form\.js',/.test(cfg), false,
    'the root assets/booking-form.js copy must be gone from the asset list');
});

test('manage.html survives the SPA fallback and links only deployed paths', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const spa = (vercel.rewrites || []).find((r) => r.destination === '/index.html');
  assert.ok(spa, 'the SPA fallback is still in place');
  // The catch-all must NOT rewrite /api/ routes to index.html (commit 5e03a86),
  // so API functions resolve instead of being swallowed by the SPA fallback.
  assert.match(spa.source, /\(\?!api\//, 'the SPA fallback must exclude /api/ routes');

  // Vercel resolves the filesystem BEFORE rewrites, so a real file at
  // dist/manage.html is served and the `/(.*)` catch-all never sees the request.
  // That is the whole reason this is a file rather than an SPA route.
  const html = fs.readFileSync(path.join(ROOT, 'manage.html'), 'utf8');
  assert.match(html, /id="jurnii-manage-inline"/);
  assert.match(html, /src="\/booking\/assets\/booking-form\.js"/);
  assert.match(html, /href="\/booking\/assets\/booking-form\.css"/);
  assert.match(html, /href="\/assets\/global\.css"/, 'the design tokens the booking CSS reads');
  assert.match(html, /href="\/assets\/site\.css"/, 'the .btn classes its markup uses');
  assert.match(html, /noindex/, 'a signed-token URL must not be indexed');
  // Every asset it references must be one the build actually emits.
  const refs = html.match(/(?:href|src)="(\/[^"]+)"/g).map((m) => m.replace(/.*="|"$/g, ''));
  const emitted = [
    '/assets/global.css', '/assets/site.css', '/assets/jurnii-icon-light.svg',
    '/assets/jurnii-light-full.svg', '/assets/fonts/Geist-VariableFont_wght.woff2',
    '/booking/assets/booking-form.css', '/booking/assets/booking-form.js',
  ];
  for (const ref of refs) {
    if (ref === '/') continue;
    assert.ok(emitted.includes(ref), ref + ' is referenced but not in the emitted set');
  }
});

test('the generated build output contains the booking runtime and the manage route', (t) => {
  const dist = path.join(ROOT, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    t.skip('no dist/ — run `npm run build` first');
    return;
  }
  for (const rel of [
    'manage.html',
    'booking/assets/booking-form.js',
    'booking/assets/booking-form.css',
    'booking/config/countries.js',
  ]) {
    assert.ok(fs.existsSync(path.join(dist, rel)), 'dist/' + rel + ' should exist');
  }
  assert.strictEqual(fs.existsSync(path.join(dist, 'assets', 'booking-form.js')), false,
    'the legacy copy must no longer be emitted');
  // The emitted widget is the shared source, byte for byte — not a stale copy.
  assert.strictEqual(
    fs.readFileSync(path.join(dist, 'booking/assets/booking-form.js'), 'utf8'),
    fs.readFileSync(path.join(ROOT, 'booking/assets/booking-form.js'), 'utf8')
  );

  // The widget's stylesheet reaches the SPA too: index.html links it, so Vite folds
  // it into the hashed bundle. Verify the RULES arrived, not just the <link>.
  const cssName = fs.readdirSync(path.join(dist, 'assets')).find((f) => /^index-.*\.css$/.test(f));
  assert.ok(cssName, 'a bundled stylesheet should exist');
  const bundled = fs.readFileSync(path.join(dist, 'assets', cssName), 'utf8');
  assert.ok(bundled.includes('.jurnii-booking-container'), 'the booking CSS must be in the SPA bundle');

  // Every absolute local reference in either page must resolve to an emitted file.
  for (const page of ['index.html', 'manage.html']) {
    const html = fs.readFileSync(path.join(dist, page), 'utf8');
    const refs = (html.match(/(?:href|src)="(\/[^"]*)"/g) || [])
      .map((m) => m.replace(/^(?:href|src)="/, '').replace(/"$/, ''))
      .filter((r) => r !== '/' && !r.startsWith('//'));
    for (const ref of refs) {
      assert.ok(fs.existsSync(path.join(dist, ref.replace(/^\//, ''))),
        page + ' references ' + ref + ', which the build did not emit');
    }
  }
});
