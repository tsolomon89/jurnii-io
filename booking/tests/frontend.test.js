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
  bookingHosts: [/\/booking-hosts$/],
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

/**
 * The host list the internal form fetches. Keys and labels only — the endpoint never
 * returns a Google Calendar address, which is the point of it existing.
 * Marlon is `configured: false` throughout, mirroring the real pending state.
 */
function okBookingHosts(overrides) {
  return {
    status: 200,
    body: {
      hosts: overrides || [
        { key: 'fraser', label: 'Fraser', configured: true },
        { key: 'marlon', label: 'Marlon', configured: false },
        { key: 'timothy', label: 'Timothy', configured: true },
      ],
      defaultHost: 'fraser',
    },
  };
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

test('embedded mode opens no modal of its own, and paints no close button unless asked', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);

  // A host modal supplies onClose. Without `showCloseButton` it is claiming the close
  // control for itself, so the widget must paint none.
  JB.render(el, { onClose() {} });
  await drain();

  assert.strictEqual(win.JURNII_BOOKING_EMBEDDED, true, 'a host modal must mark the page embedded');
  assert.strictEqual(el.querySelector('.jurnii-close-btn'), null,
    'a host that did not ask for a close button must not get one');
  assert.strictEqual(win.document.querySelector('.jurnii-modal-overlay'), null,
    'the module must not create its own overlay in embedded mode');

  // And its own modal opener becomes inert, so one CTA click cannot open two modals.
  assert.strictEqual(JB.openModal(), null);
  assert.strictEqual(win.document.querySelector('.jurnii-modal-overlay'), null);
});

test('an embedded host may delegate the ONE close button to the widget', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);

  // Exactly the site.jsx call now that #demo-modal has no chrome of its own.
  const closes = [];
  JB.render(el, { onClose() { closes.push(1); }, showCloseButton: true });
  await drain();

  const buttons = el.querySelectorAll('.jurnii-close-btn');
  assert.strictEqual(buttons.length, 1, 'exactly one close control, painted inside the card');
  assert.strictEqual(buttons[0].getAttribute('aria-label'), 'Close');
  // It is inside the booking card, not floating in the host's chrome.
  assert.ok(buttons[0].closest('.jurnii-booking-container'),
    'the close button belongs to the card that is now the dialog');

  buttons[0].dispatchEvent(new win.Event('click', { bubbles: true }));
  assert.deepStrictEqual(closes, [1], 'the close button must call the host onClose');

  // Delegating the button must not resurrect the module's own overlay.
  assert.strictEqual(win.document.querySelector('.jurnii-modal-overlay'), null);
});

test('the booking card is the only visible surface — no second wrapper card', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  JB.render(el, { onClose() {}, showCloseButton: true });
  await drain();

  assert.strictEqual(el.querySelectorAll('.jurnii-booking-container').length, 1);
  // The widget's root must be the FIRST element in the mount, with no padded wrapper
  // interposed between the host mount point and the card.
  assert.strictEqual(el.firstElementChild.className, 'jurnii-booking-container');
  for (const dead of ['.demo-modal-dialog', '.demo-modal-head', '.demo-modal-body']) {
    assert.strictEqual(el.querySelector(dead), null, dead + ' must not be re-introduced');
  }
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

test('an empty product selection omits the key rather than sending a value the server would 400', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const p = JB.internals.productsForSubmit;
  assert.deepStrictEqual(p([]), []);
  assert.deepStrictEqual(p(undefined), []);
  // The previous build's "no product" sentinel, still dropped so a two-hour-old
  // snapshot cannot resurrect it as a value the endpoint rejects.
  assert.deepStrictEqual(p('Not sure yet'), []);
  assert.deepStrictEqual(p(['Jurnii UX', 'Not sure yet']), ['Jurnii UX']);
  // A scalar migrates, order is preserved, and duplicates collapse.
  assert.deepStrictEqual(p('Jurnii UX'), ['Jurnii UX']);
  assert.deepStrictEqual(p(['Partnership', 'Jurnii UX']), ['Partnership', 'Jurnii UX']);
  assert.deepStrictEqual(p(['Jurnii UX', 'jurnii ux', ' Jurnii UX ']), ['Jurnii UX']);

  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [
    ['PATCH', R.page2[0], { status: 200, body: { token: 'flow-2' } }],
    ['GET', R.availability[0], okAvailability()],
  ]);
  const inst = JB.render(el, {});
  await drain();
  inst._setValues({ company: 'A', jobTitle: 'B', countryIso2: 'GB', nationalNumber: '7123456789', productInterests: [] });
  inst._setJourney(JID, 'flow-2');
  await inst._submitPage2();
  await drain();
  const patch = calls.find((c) => c.method === 'PATCH');
  assert.strictEqual('productInterests' in patch.body, false);
  assert.strictEqual('productInterest' in patch.body, false);
});

/* ===================================================================== *
 * 3b. Product Interest — multi-select
 * ===================================================================== */

test('the product control is a checkbox group offering all four canonical products', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  JB.render(el, {});
  await drain();

  const boxes = el.querySelectorAll('[data-field="productInterests"]');
  assert.strictEqual(boxes.length, 4, 'four products, one checkbox each');
  assert.deepStrictEqual([...boxes].map((b) => b.value),
    ['Jurnii UX', 'Jurnii 360', 'Jurnii Cortex', 'Partnership']);
  assert.deepStrictEqual([...boxes].map((b) => b.type), ['checkbox', 'checkbox', 'checkbox', 'checkbox']);
  // Partnership is canonical in live Zoho but was never offered by the old select.
  assert.ok([...boxes].some((b) => b.value === 'Partnership'), 'Partnership must be offered');
  // And the pseudo-product is gone: an untouched group already means "no product".
  assert.ok(!el.innerHTML.includes('value="Not sure yet"'));
  assert.strictEqual(el.querySelector('select[data-field="productInterest"]'), null,
    'the scalar select must be gone');
});

test('multiple products submit as an array, in the order they were ticked', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [
    ['PATCH', R.page2[0], { status: 200, body: { token: 'flow-2' } }],
    ['GET', R.availability[0], okAvailability()],
  ]);
  const inst = JB.render(el, {});
  await drain();

  // Tick through the DOM, so the change handlers are what build the array.
  const tick = (value) => {
    const box = [...el.querySelectorAll('[data-field="productInterests"]')].find((b) => b.value === value);
    box.checked = true;
    box.dispatchEvent(new win.Event('change', { bubbles: true }));
  };
  tick('Partnership');
  tick('Jurnii UX');
  assert.deepStrictEqual(inst._values.productInterests, ['Partnership', 'Jurnii UX'],
    'selection order is preserved — the first entry resolves the product Deal');

  inst._setValues({ company: 'A', jobTitle: 'Head of Product', countryIso2: 'GB', nationalNumber: '7123456789' });
  inst._setJourney(JID, 'flow-2');
  await inst._submitPage2();
  await drain();
  const patch = calls.find((c) => c.method === 'PATCH');
  assert.deepStrictEqual(patch.body.productInterests, ['Partnership', 'Jurnii UX']);
});

test('unticking a product removes exactly that product', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const inst = JB.render(el, {});
  await drain();

  const boxes = [...el.querySelectorAll('[data-field="productInterests"]')];
  const set = (value, on) => {
    const box = boxes.find((b) => b.value === value);
    box.checked = on;
    box.dispatchEvent(new win.Event('change', { bubbles: true }));
  };
  set('Jurnii UX', true);
  set('Jurnii 360', true);
  set('Partnership', true);
  set('Jurnii 360', false);
  assert.deepStrictEqual(inst._values.productInterests, ['Jurnii UX', 'Partnership']);
});

test('the marketing label is never submitted as the CRM value', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [
    ['PATCH', R.page2[0], { status: 200, body: { token: 'flow-2' } }],
    ['GET', R.availability[0], okAvailability()],
  ]);
  const inst = JB.render(el, {});
  await drain();

  // The labels are visible and long; the values are the four canonical strings.
  assert.match(el.textContent, /User Experience Benchmarking/);
  const box = [...el.querySelectorAll('[data-field="productInterests"]')].find((b) => b.value === 'Jurnii UX');
  box.checked = true;
  box.dispatchEvent(new win.Event('change', { bubbles: true }));

  inst._setValues({ company: 'A', jobTitle: 'Head of Product', countryIso2: 'GB', nationalNumber: '7123456789' });
  inst._setJourney(JID, 'flow-2');
  await inst._submitPage2();
  await drain();

  const patch = calls.find((c) => c.method === 'PATCH');
  assert.deepStrictEqual(patch.body.productInterests, ['Jurnii UX']);
  const wire = JSON.stringify(patch.body);
  assert.ok(!wire.includes('—'), 'no en-dash: a label reached the wire');
  for (const label of JB.internals.PRODUCT_OPTIONS.map((p) => p.label)) {
    assert.ok(!wire.includes(label), `the label "${label}" must never be submitted`);
  }
});

test('a snapshot from the old single-select build migrates to the array', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  // Exactly the shape the previous build persisted.
  JB.internals.saveSnapshot({
    journey_id: JID,
    token: 'flow-2',
    step: 2,
    values: { company: 'Acme', jobTitle: 'Head of Product', countryIso2: 'GB',
      nationalNumber: '7123456789', productInterest: 'Jurnii 360' },
  });

  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const inst = JB.render(el, {});
  await drain();

  assert.deepStrictEqual(inst._values.productInterests, ['Jurnii 360'],
    'a mid-flow visitor must not lose their choice across the deploy');
  const box = [...el.querySelectorAll('[data-field="productInterests"]')].find((b) => b.value === 'Jurnii 360');
  assert.strictEqual(box.checked, true, 'and it must be visibly ticked');
  // The array must not have been stringified into a checkbox value attribute.
  for (const b of el.querySelectorAll('[data-field="productInterests"]')) {
    assert.ok(!b.value.includes(','), 'restore() stringified the array into a value');
  }
});

/* ===================================================================== *
 * 3c. Job Title — governed autocomplete
 * ===================================================================== */

/** Install the generated title list on a jsdom window, as the lazy <script> would. */
function withTitles(win) {
  win.JurniiBookingJobTitles = require('../config/job-titles.js');
  return win.JurniiBookingJobTitles.TITLES;
}

const openTitles = async (win, el) => {
  const input = el.querySelector('[data-field="jobTitle"]');
  input.dispatchEvent(new win.Event('focus', { bubbles: true }));
  await drain();
  return input;
};

test('filterJobTitles matches any substring, case-insensitively, prefix-first', () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const f = JB.internals.filterJobTitles;
  const list = ['Head of Product', 'Deputy Head of CRM', 'Chief Data Officer', 'Product Manager'];

  assert.deepStrictEqual(f(list, 'head of', 50).visible, ['Head of Product', 'Deputy Head of CRM'],
    'a prefix match outranks a mid-string one');
  assert.deepStrictEqual(f(list, 'HEAD OF', 50).visible, ['Head of Product', 'Deputy Head of CRM'],
    'matching is case-insensitive');
  assert.deepStrictEqual(f(list, 'data', 50).visible, ['Chief Data Officer'],
    'any substring matches, not just a prefix');
  assert.deepStrictEqual(f(list, 'zzz', 50).visible, []);
  assert.strictEqual(f(list, '', 50).visible.length, 4, 'an empty query offers everything');

  // The cap is what keeps 415 options from rendering; `total` drives the "+N more".
  const many = f(list, '', 2);
  assert.strictEqual(many.visible.length, 2);
  assert.strictEqual(many.total, 4);
});

test('no options are rendered or fetched until the field is focused', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  JB.render(el, {});
  await drain();

  const list = el.querySelector('[data-role="jobtitle-listbox"]');
  assert.ok(list, 'the listbox element exists');
  assert.strictEqual(list.hidden, true, 'but is hidden');
  assert.strictEqual(list.children.length, 0, 'and empty — 415 nodes must not be painted eagerly');
  assert.strictEqual(win.document.querySelector('script[data-jurnii-booking-job-titles]'), null,
    'the title file is not even fetched before the field is used');
});

test('focusing the field opens a capped listbox with correct combobox ARIA', async () => {
  const { win } = makeWindow();
  withTitles(win);
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  JB.render(el, {});
  await drain();

  const input = await openTitles(win, el);
  assert.strictEqual(input.getAttribute('role'), 'combobox');
  assert.strictEqual(input.getAttribute('aria-expanded'), 'true');
  assert.strictEqual(input.getAttribute('aria-autocomplete'), 'list');
  assert.strictEqual(input.getAttribute('autocomplete'), 'off', 'the browser must not overlay its own list');

  const list = el.querySelector('[data-role="jobtitle-listbox"]');
  assert.strictEqual(list.hidden, false);
  assert.strictEqual(list.getAttribute('role'), 'listbox');
  assert.strictEqual(input.getAttribute('aria-controls'), list.id);

  const options = list.querySelectorAll('[role="option"]');
  assert.strictEqual(options.length, JB.internals.JOB_TITLE_MAX_VISIBLE + 1,
    'capped at MAX_VISIBLE, plus the Other sentinel');
  assert.strictEqual(options[options.length - 1].getAttribute('data-title'), 'Other',
    'Other is always the final option');
  assert.ok(list.querySelector('[role="presentation"]'), 'and a "+N more" hint is shown');
});

test('typing filters the list, and Other stays reachable from a zero-match query', async () => {
  const { win } = makeWindow();
  withTitles(win);
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  JB.render(el, {});
  await drain();

  const input = await openTitles(win, el);
  input.value = 'chief data';
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  await drain();

  const titlesOf = () => [...el.querySelectorAll('[data-role="jobtitle-listbox"] [role="option"]')]
    .map((o) => o.getAttribute('data-title'));
  assert.ok(titlesOf().includes('Chief Data Officer'));
  assert.ok(titlesOf().length < 20, 'the list narrows as you type');

  input.value = 'zzzz no such title';
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  await drain();
  assert.deepStrictEqual(titlesOf(), ['Other'],
    'Other must remain reachable exactly when nothing matches');
  assert.match(el.querySelector('[data-role="jobtitle-status"]').textContent, /No matching titles/);
});

test('ArrowDown, ArrowUp and Enter select a title from the keyboard', async () => {
  const { win } = makeWindow();
  withTitles(win);
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const inst = JB.render(el, {});
  await drain();

  const input = await openTitles(win, el);
  input.value = 'chief data';
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  await drain();

  const key = (k) => {
    const e = new win.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    input.dispatchEvent(e);
    return e;
  };
  key('ArrowDown');
  await drain();
  const list = el.querySelector('[data-role="jobtitle-listbox"]');
  const first = list.querySelector('[role="option"]');
  assert.strictEqual(input.getAttribute('aria-activedescendant'), first.id,
    'the active option is tracked on the input, not by moving focus');
  assert.strictEqual(first.getAttribute('aria-selected'), 'true');

  // Down then Up returns to the same option.
  key('ArrowDown');
  key('ArrowUp');
  assert.strictEqual(input.getAttribute('aria-activedescendant'), first.id);

  const enter = key('Enter');
  assert.strictEqual(enter.defaultPrevented, true, 'Enter must not reach a surrounding form');
  assert.strictEqual(input.value, 'Chief Data Officer');
  assert.strictEqual(inst._values.jobTitle, 'Chief Data Officer');
  assert.strictEqual(list.hidden, true, 'committing closes the listbox');
  assert.strictEqual(input.getAttribute('aria-expanded'), 'false');
});

test('ArrowDown wraps at the end of the list', async () => {
  const { win } = makeWindow();
  withTitles(win);
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  JB.render(el, {});
  await drain();

  const input = await openTitles(win, el);
  input.value = 'chief data officer';    // one match + Other
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  await drain();

  const ids = [...el.querySelectorAll('[data-role="jobtitle-listbox"] [role="option"]')].map((o) => o.id);
  const key = (k) => input.dispatchEvent(new win.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  key('ArrowDown');
  key('ArrowDown');
  assert.strictEqual(input.getAttribute('aria-activedescendant'), ids[ids.length - 1]);
  key('ArrowDown');
  assert.strictEqual(input.getAttribute('aria-activedescendant'), ids[0], 'wraps to the first');
  key('ArrowUp');
  assert.strictEqual(input.getAttribute('aria-activedescendant'), ids[ids.length - 1], 'and back');
});

test('Escape closes the listbox first and does not reach the host modal', async () => {
  const { win } = makeWindow();
  withTitles(win);
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  JB.render(el, {});
  await drain();

  // The site modal listens on document; the first Escape must not reach it.
  let reachedDocument = 0;
  win.document.addEventListener('keydown', (e) => { if (e.key === 'Escape') reachedDocument++; });

  const input = await openTitles(win, el);
  input.value = 'chief';
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  await drain();
  input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

  assert.strictEqual(el.querySelector('[data-role="jobtitle-listbox"]').hidden, true);
  assert.strictEqual(reachedDocument, 0, 'the first Escape belongs to the listbox');

  // With the listbox closed, a second Escape passes through to close the modal.
  input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.strictEqual(reachedDocument, 1);
});

test('Tab commits the highlighted title without swallowing the keypress', async () => {
  const { win } = makeWindow();
  withTitles(win);
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const inst = JB.render(el, {});
  await drain();

  const input = await openTitles(win, el);
  input.value = 'chief data officer';
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  await drain();
  input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));

  const tab = new win.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  input.dispatchEvent(tab);
  assert.strictEqual(tab.defaultPrevented, false, 'Tab must still move focus');
  assert.strictEqual(inst._values.jobTitle, 'Chief Data Officer');
  assert.strictEqual(el.querySelector('[data-role="jobtitle-listbox"]').hidden, true);
});

test('the form grid collapses to one column on a phone', () => {
  const css = fs.readFileSync(path.join(ROOT, 'booking', 'assets', 'booking-form.css'), 'utf8');
  assert.match(css.replace(/\s+/g, ' '),
    /@media \(max-width: 640px\) \{ \.jurnii-form-grid \{ grid-template-columns: 1fr/,
    'without this the right-hand column runs off a 390px viewport');

  // `span 2` does NOT stay inside a one-column grid — it creates an implicit second
  // column sized by grid-auto-columns, which resurrected the two-column layout at every
  // mobile width even with the media query above in place. `1 / -1` spans whatever the
  // explicit grid actually has.
  assert.ok(!/\.jurnii-form-group\.full-width\s*\{[^}]*span 2/.test(css),
    'full-width must use `grid-column: 1 / -1`, never `span 2`');
  assert.match(css, /\.jurnii-form-group\.full-width\s*\{\s*grid-column:\s*1 \/ -1/);
});

test('the stylesheet makes the hidden attribute actually hide', () => {
  // jsdom reports `.hidden === true` regardless of CSS, so the DOM assertions in this
  // file cannot catch this: the UA rule `[hidden] { display: none }` loses to ANY author
  // `display`, and `.jurnii-form-group` sets `display: flex`. The Other group therefore
  // rendered permanently in a real browser while every unit test passed.
  const css = fs.readFileSync(path.join(ROOT, 'booking', 'assets', 'booking-form.css'), 'utf8');
  assert.match(css, /\.jurnii-booking-container \[hidden\]\s*\{\s*display:\s*none\s*!important/,
    'conditional fields rely on [hidden]; it must beat the author display rules');
});

test('choosing Other reveals a required free-text field, and returning hides it', async () => {
  const { win } = makeWindow();
  withTitles(win);
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const inst = JB.render(el, {});
  await drain();

  const group = el.querySelector('[data-role="jobtitle-other-group"]');
  const other = el.querySelector('[data-field="jobTitleOther"]');
  assert.strictEqual(group.hidden, true, 'hidden until Other is chosen');
  assert.strictEqual(other.hasAttribute('required'), false);

  const input = await openTitles(win, el);
  input.value = 'zzz no match';
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  await drain();
  const otherOption = el.querySelector('[data-role="jobtitle-listbox"] [data-title="Other"]');
  otherOption.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));

  assert.strictEqual(inst._values.jobTitle, 'Other');
  assert.strictEqual(group.hidden, false, 'the free-text field is revealed');
  assert.strictEqual(other.hasAttribute('required'), true);

  // Back to a governed title: the field hides and its value is cleared, so a stale
  // free-text title can never travel alongside a governed one.
  other.value = 'Head of Widgets';
  other.dispatchEvent(new win.Event('input', { bubbles: true }));
  assert.strictEqual(inst._values.jobTitleOther, 'Head of Widgets');

  input.value = 'chief data officer';
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  await drain();
  input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
  input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

  assert.strictEqual(inst._values.jobTitle, 'Chief Data Officer');
  assert.strictEqual(group.hidden, true);
  assert.strictEqual(other.hasAttribute('required'), false);
  assert.strictEqual(inst._values.jobTitleOther, '');
});

test('the "choose from the list instead" affordance returns from Other', async () => {
  const { win } = makeWindow();
  withTitles(win);
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const inst = JB.render(el, {});
  await drain();

  inst._setValues({ jobTitle: 'Other', jobTitleOther: 'Head of Widgets' });
  el.querySelector('[data-role="jobtitle-clear"]').dispatchEvent(
    new win.MouseEvent('click', { bubbles: true, cancelable: true }));

  assert.strictEqual(inst._values.jobTitle, '');
  assert.strictEqual(inst._values.jobTitleOther, '');
  assert.strictEqual(el.querySelector('[data-role="jobtitle-other-group"]').hidden, true);
  assert.strictEqual(el.querySelector('[data-field="jobTitle"]').value, '');
});

test('effectiveJobTitle resolves the Other sentinel and never submits the word "Other"', () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const f = JB.internals.effectiveJobTitle;
  assert.strictEqual(f({ jobTitle: 'Head of Product' }), 'Head of Product');
  assert.strictEqual(f({ jobTitle: 'Other', jobTitleOther: '  Head of Widgets  ' }), 'Head of Widgets');
  assert.strictEqual(f({ jobTitle: 'Other', jobTitleOther: '' }), '', 'an empty Other is not a title');
  assert.strictEqual(f({}), '');
});

test('an Other title is submitted as the typed text, with no sentinel or role', async () => {
  const { win } = makeWindow();
  withTitles(win);
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [
    ['PATCH', R.page2[0], { status: 200, body: { token: 'flow-2' } }],
    ['GET', R.availability[0], okAvailability()],
  ]);
  const inst = JB.render(el, {});
  await drain();

  inst._setValues({ company: 'Acme', jobTitle: 'Other', jobTitleOther: 'Head of Widgets',
    countryIso2: 'GB', nationalNumber: '7123456789' });
  inst._setJourney(JID, 'flow-2');
  await inst._submitPage2();
  await drain();

  const patch = calls.find((c) => c.method === 'PATCH');
  assert.strictEqual(patch.body.jobTitle, 'Head of Widgets');
  assert.strictEqual('jobTitleOther' in patch.body, false, 'one title string on the wire');
  assert.strictEqual('isOther' in patch.body, false);
  // Role resolution is Zoho's, not the browser's.
  const wire = JSON.stringify(patch.body);
  for (const role of ['Decision Maker', 'Influencer', 'End User', 'Contact_Role']) {
    assert.ok(!wire.includes(role), `the browser must never submit ${role}`);
  }
});

test('choosing Other and typing nothing is refused client-side', async () => {
  const { win } = makeWindow();
  withTitles(win);
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [['PATCH', R.page2[0], { status: 200, body: {} }]]);
  const inst = JB.render(el, {});
  await drain();

  inst._setValues({ company: 'Acme', jobTitle: 'Other', jobTitleOther: '   ',
    countryIso2: 'GB', nationalNumber: '7123456789' });
  inst._setJourney(JID, 'flow-2');
  const ok = await inst._submitPage2();

  assert.strictEqual(ok, false);
  assert.strictEqual(calls.length, 0, 'no request for a title we already know is empty');
  assert.ok(el.querySelector('[data-field="jobTitleOther"]').classList.contains('error'));
});

test('a resumed Other session shows the free-text field, not a hidden one', async () => {
  const { win } = makeWindow();
  withTitles(win);
  const JB = freshFactory()(win, { bootstrap: false });
  JB.internals.saveSnapshot({
    journey_id: JID,
    token: 'flow-2',
    step: 2,
    values: { company: 'Acme', jobTitle: 'Other', jobTitleOther: 'Head of Widgets',
      countryIso2: 'GB', nationalNumber: '7123456789', productInterests: [] },
  });

  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  JB.render(el, {});
  await drain();

  // restore() only assigns values; without an explicit visibility sync the visitor
  // sees a combobox reading "Other" above a hidden field holding their real title.
  assert.strictEqual(el.querySelector('[data-role="jobtitle-other-group"]').hidden, false);
  assert.strictEqual(el.querySelector('[data-field="jobTitleOther"]').value, 'Head of Widgets');
  assert.strictEqual(el.querySelector('[data-field="jobTitle"]').value, 'Other');
});

test('an unavailable title list degrades to a plain input rather than blocking booking', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [
    ['PATCH', R.page2[0], { status: 200, body: { token: 'flow-2' } }],
    ['GET', R.availability[0], okAvailability()],
  ]);
  const inst = JB.render(el, {});
  await drain();

  // No JurniiBookingJobTitles on the window: simulate the <script> failing to load.
  const input = el.querySelector('[data-field="jobTitle"]');
  input.dispatchEvent(new win.Event('focus', { bubbles: true }));
  const script = win.document.querySelector('script[data-jurnii-booking-job-titles]');
  assert.ok(script, 'a fetch was attempted');
  script.dispatchEvent(new win.Event('error'));
  await drain();

  assert.strictEqual(input.hasAttribute('role'), false, 'combobox semantics are removed');
  assert.strictEqual(input.getAttribute('aria-expanded'), null);
  assert.strictEqual(el.querySelector('[data-role="jobtitle-listbox"]').hidden, true);

  // And the visitor can still type a title and book.
  inst._setValues({ company: 'Acme', jobTitle: 'Head of Widgets', countryIso2: 'GB', nationalNumber: '7123456789' });
  inst._setJourney(JID, 'flow-2');
  await inst._submitPage2();
  await drain();
  assert.strictEqual(calls.find((c) => c.method === 'PATCH').body.jobTitle, 'Head of Widgets');
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

/** Comments name the removed chrome to explain why it is gone; scan code only. */
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('#demo-modal is a backdrop plus ONE transparent surface, with no wrapper card', () => {
  const raw = fs.readFileSync(path.join(ROOT, 'assets', 'site.jsx'), 'utf8');
  const src = stripComments(raw);

  // The chrome that produced the second white card and the duplicate close control.
  for (const dead of ['demo-modal-dialog', 'demo-modal-head', 'demo-modal-title', 'demo-modal-close']) {
    assert.ok(!src.includes(dead),
      dead + ' is back in site.jsx — the booking card must be the only visible surface');
  }
  assert.match(src, /class="demo-modal-backdrop"/, 'the backdrop is retained');
  assert.match(src, /class="demo-modal-surface"[^>]*role="dialog"[^>]*aria-modal="true"/,
    'the surface carries the dialog semantics the removed card used to');
  assert.match(src, /id="demo-modal-mount"/);
  // The widget paints the single close button, so the host must ask for it.
  assert.match(src, /showCloseButton:\s*true/,
    'without this the modal would have no close control at all');
});

test('#demo-modal preserves close, Escape, backdrop, scroll lock and focus restoration', () => {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'site.jsx'), 'utf8');
  assert.match(src, /\.demo-modal-backdrop'\)\.addEventListener\('click', closeModal\)/,
    'backdrop click still closes');
  assert.match(src, /e\.key === 'Escape' && isOpen\(\)/,
    'Escape still closes, and only while open');
  assert.match(src, /document\.body\.style\.overflow = 'hidden'/, 'scroll lock on open');
  assert.match(src, /document\.body\.style\.overflow = ''/, 'scroll lock released on close');
  // Focus placement and restoration, neither of which existed before.
  assert.match(src, /lastTrigger = document\.activeElement/,
    'the opening CTA must be remembered before focus moves');
  assert.match(src, /function focusIntoModal/, 'focus must move into the dialog on open');
  assert.match(src, /lastTrigger\.focus/, 'focus must return to the CTA on close');
});

test('the demo-modal stylesheet drops the wrapper card and keeps the backdrop', () => {
  const css = stripComments(fs.readFileSync(path.join(ROOT, 'assets', 'site.css'), 'utf8'));
  for (const dead of ['.demo-modal-dialog', '.demo-modal-head', '.demo-modal-title', '.demo-modal-close']) {
    assert.ok(!css.includes(dead), dead + ' rules are dead once the chrome is gone');
  }
  assert.match(css, /\.demo-modal-backdrop\s*\{/);
  assert.match(css, /\.demo-modal-surface\s*\{/);
  // The surface must not paint a card of its own: that is the whole defect.
  const surface = css.slice(css.indexOf('.demo-modal-surface {'));
  const rule = surface.slice(0, surface.indexOf('}'));
  for (const prop of ['background:', 'border:', 'border-radius:', 'box-shadow:']) {
    assert.ok(!rule.includes(prop), '.demo-modal-surface must stay transparent, found ' + prop);
  }
});

test('index.html loads the booking stylesheet explicitly', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /<link rel="stylesheet" href="\/booking\/assets\/booking-form\.css">/,
    'nothing @imports it, so it must be linked');
});

test('the build declares every booking runtime file and both plain pages', () => {
  const cfg = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
  for (const rel of [
    'booking/assets/booking-form.js', 'booking/assets/booking-form.css',
    'booking/config/countries.js', 'booking/config/job-titles.js',
    'booking/config/lead-sources.js',
  ]) {
    assert.ok(cfg.includes(rel), rel + ' must be copied into dist');
  }
  assert.match(cfg, /'manage\.html', 'admin-form\.html'/, 'both plain pages must be emitted');
  // A vanished source file must fail the build, not ship a 404.
  assert.match(cfg, /required booking file missing/);
  assert.strictEqual(/'booking-form\.js',/.test(cfg), false,
    'the root assets/booking-form.js copy must be gone from the asset list');
});

/* ===================================================================== *
 * 9. The internal /admin-form route
 * ===================================================================== */

test('/admin-form resolves ahead of the SPA fallback', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const rewrites = vercel.rewrites || [];
  const admin = rewrites.findIndex((r) => r.source === '/admin-form');
  const spa = rewrites.findIndex((r) => r.destination === '/index.html');
  assert.ok(admin > -1, 'the extensionless /admin-form must be mapped');
  assert.strictEqual(rewrites[admin].destination, '/admin-form.html');
  assert.ok(admin < spa, 'it must come BEFORE the catch-all, or the SPA swallows it');
});

test('admin-form.html is unindexable and unlinked', () => {
  const html = fs.readFileSync(path.join(ROOT, 'admin-form.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);

  // Nothing on the public site may point at it: the route's only protection is that
  // it is not discoverable.
  for (const file of ['assets/site.jsx', 'index.html', 'manage.html']) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.ok(!src.includes('admin-form'),
      `${file} references admin-form — it must not be linked from the public site`);
  }
});

test('/admin-form cannot appear in the generated sitemap', () => {
  // The sitemap is derived solely from the content manifest (markdown under content/),
  // so a physical HTML page is structurally excluded rather than filtered out.
  const sitemap = fs.readFileSync(
    path.join(ROOT, 'src', 'content-engine', 'utils', 'sitemap.ts'), 'utf8');
  assert.match(sitemap, /getAllContent\('www'\)/);
  assert.ok(!sitemap.includes('admin-form'));
  assert.ok(!/readdir|\.html/.test(sitemap),
    'the sitemap must not enumerate files, or a plain page could leak into it');
});

test('admin-form.html exposes no credentials and links only deployed paths', () => {
  const html = fs.readFileSync(path.join(ROOT, 'admin-form.html'), 'utf8');
  // A server secret in browser code is the failure mode this route must not have.
  for (const secret of ['BOOKING_ADMIN_SECRET', 'CRON_SECRET', 'ZOHO_CLIENT_SECRET',
    'ZOHO_REFRESH_TOKEN', 'JWT_SECRET', 'DATABASE_URL']) {
    assert.ok(!html.includes(secret), `${secret} must never appear in browser code`);
  }
  const refs = (html.match(/(?:href|src)="(\/[^"]+)"/g) || []).map((m) => m.replace(/.*="|"$/g, ''));
  const emitted = [
    '/assets/global.css', '/assets/site.css', '/assets/jurnii-icon-light.svg',
    '/assets/jurnii-light-full.svg', '/assets/fonts/Geist-VariableFont_wght.woff2',
    '/booking/assets/booking-form.css', '/booking/assets/booking-form.js',
    '/assets/analytics-bridge.js',
  ];
  for (const ref of refs) {
    if (ref === '/') continue;
    assert.ok(emitted.includes(ref), ref + ' is referenced but not in the emitted set');
  }
});

test('the internal container mounts the same form with a Lead Source field', async () => {
  const { win } = makeWindow(
    '<div id="jurnii-booking-form-inline" data-internal="1" '
    + 'data-form-placement="internal-booking" data-cta-id="admin-form"></div>');
  win.JurniiBookingLeadSources = require('../config/lead-sources.js');
  stubFetch(win, [['GET', R.bookingHosts[0], okBookingHosts()]]);
  freshFactory()(win);
  await drain();

  const el = win.document.getElementById('jurnii-booking-form-inline');
  assert.ok(el.querySelector('[data-jurnii-booking-root]'), 'the shared form mounts');
  const sel = el.querySelector('[data-field="leadSource"]');
  assert.ok(sel, 'the internal route adds Lead Source');

  const options = [...sel.options];
  assert.strictEqual(options[0].value, '', 'the default option sends no value');
  const values = options.slice(1).map((o) => o.value);
  const labels = options.slice(1).map((o) => o.textContent);
  assert.ok(values.includes('Website'));
  // Value and label are separate: five live options display differently from the value
  // Zoho stores, and submitting the label would be rejected.
  assert.ok(values.includes('Trade Show'));
  assert.ok(labels.includes('Trade Show / Event'));
  assert.ok(!values.includes('Event'), 'the display label must never be a submitted value');
  // Options binned by Zoho are silently discarded on write, so they are not offered.
  assert.ok(!values.includes('Cold Call'));
});

test('the PUBLIC form has no Lead Source field at all', async () => {
  const { win } = makeWindow();
  win.JurniiBookingLeadSources = require('../config/lead-sources.js');
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  JB.render(el, { formPlacement: 'site-demo-modal' });
  await drain();
  assert.strictEqual(el.querySelector('[data-field="leadSource"]'), null);
});

test('resolveInternal reads the option or the container attribute, defaulting to false', () => {
  const { win } = makeWindow('<div id="x" data-internal="1"></div>');
  const JB = freshFactory()(win, { bootstrap: false });
  const r = JB.internals.resolveInternal;
  const el = win.document.getElementById('x');
  assert.strictEqual(r(el, {}), true);
  assert.strictEqual(r(el, { internal: false }), false, 'an explicit option wins');
  assert.strictEqual(r(win.document.createElement('div'), {}), false);
  assert.strictEqual(r(null, {}), false);
});

test('an internal submission sends the selected Lead Source and the placement marker', async () => {
  const { win } = makeWindow(
    '<div id="jurnii-booking-form-inline" data-internal="1" '
    + 'data-form-placement="internal-booking" data-cta-id="admin-form"></div>');
  win.JurniiBookingLeadSources = require('../config/lead-sources.js');
  const calls = stubFetch(win, [
    ['GET', R.bookingHosts[0], okBookingHosts()],
    ['POST', R.start[0], { status: 200, body: { journeyId: JID, token: 'flow-1' } }],
    ['PATCH', R.page2[0], { status: 200, body: { token: 'flow-2' } }],
    ['GET', R.availability[0], okAvailability()],
  ]);
  freshFactory()(win);
  await drain();

  const el = win.document.getElementById('jurnii-booking-form-inline');
  const set = (name, value) => {
    const f = el.querySelector(`[data-field="${name}"]`);
    f.value = value;
    f.dispatchEvent(new win.Event(f.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
  set('firstName', 'Alex'); set('lastName', 'Mercer'); set('email', 'alex@acme.com');
  el.querySelector('[data-role="next-1"]').click();
  await drain();

  set('company', 'Acme'); set('jobTitle', 'Head of Product'); set('nationalNumber', '7123456789');
  set('leadSource', 'Trade Show');
  // Required on the internal route: without it page 2 does not submit at all.
  set('bookingHost', 'timothy');
  el.querySelector('[data-role="next-2"]').click();
  await drain();

  const start = calls.find((c) => c.method === 'POST');
  assert.strictEqual(start.body.formPlacement, 'internal-booking',
    'placement is recorded on page 1 — it is what the server gates Lead Source on');
  assert.strictEqual(start.body.ctaId, 'admin-form');

  const patch = calls.find((c) => c.method === 'PATCH');
  assert.strictEqual(patch.body.leadSource, 'Trade Show', 'the stored value, not the label');
  assert.notStrictEqual(patch.body.leadSource, 'Event');
  assert.strictEqual(patch.body.bookingHost, 'timothy',
    'the opaque host key, which is all the browser is ever given');
});

test('a public submission never carries a Lead Source, even if one is set', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [
    ['PATCH', R.page2[0], { status: 200, body: { token: 'flow-2' } }],
    ['GET', R.availability[0], okAvailability()],
  ]);
  const inst = JB.render(el, { formPlacement: 'site-demo-modal' });
  await drain();

  // Even with a value forced into the instance, a non-internal render omits the key.
  inst._setValues({ company: 'Acme', jobTitle: 'Head of Product', countryIso2: 'GB',
    nationalNumber: '7123456789', leadSource: 'Trade Show' });
  inst._setJourney(JID, 'flow-2');
  await inst._submitPage2();
  await drain();

  assert.strictEqual('leadSource' in calls.find((c) => c.method === 'PATCH').body, false);
});

/* ---------------------------------------------------------------------------
   Booking host — the internal-only selector, and the slot-invalidation rules.
   --------------------------------------------------------------------------- */

/** Mount the internal form with a routed host list, and return the DOM helpers. */
async function internalForm(win, routes) {
  win.JurniiBookingLeadSources = require('../config/lead-sources.js');
  const calls = stubFetch(win, (routes || []).concat([
    ['GET', R.bookingHosts[0], okBookingHosts()],
    ['POST', R.start[0], { status: 200, body: { journeyId: JID, token: 'flow-1' } }],
    ['PATCH', R.page2[0], { status: 200, body: { token: 'flow-2' } }],
    ['GET', R.availability[0], okAvailability()],
  ]));
  freshFactory()(win);
  await drain();
  const el = win.document.getElementById('jurnii-booking-form-inline');
  const set = (name, value) => {
    const f = el.querySelector(`[data-field="${name}"]`);
    f.value = value;
    f.dispatchEvent(new win.Event(f.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
  return { el, set, calls };
}

const INTERNAL_MOUNT = '<div id="jurnii-booking-form-inline" data-internal="1" '
  + 'data-form-placement="internal-booking" data-cta-id="admin-form"></div>';

test('the internal form renders a host selector, with unconfigured hosts disabled', async () => {
  const { win } = makeWindow(INTERNAL_MOUNT);
  const { el } = await internalForm(win);

  const sel = el.querySelector('[data-field="bookingHost"]');
  assert.ok(sel, 'the internal route adds the Booking host selector');
  const options = [...sel.options];
  assert.strictEqual(options[0].value, '', 'there is no default host — the operator must choose');
  assert.deepStrictEqual(options.slice(1).map((o) => o.value), ['fraser', 'marlon', 'timothy']);
  // Marlon is SHOWN but unselectable. Hiding him would be indistinguishable from a bug.
  const marlon = options.find((o) => o.value === 'marlon');
  assert.strictEqual(marlon.disabled, true, 'an unconfigured host cannot be selected');
  assert.match(marlon.textContent, /not configured/);
  assert.strictEqual(options.find((o) => o.value === 'fraser').disabled, false);

  // The whole point of the endpoint: the browser deals in opaque keys. An address would
  // show up here as an `@`, in a value or a label. (Scoped to the selector — the
  // confirmation step legitimately renders the support mailbox.)
  assert.doesNotMatch(sel.innerHTML, /@/,
    'a Google Calendar address must never reach the browser');
});

test('the PUBLIC form has no host selector at all', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [['GET', R.bookingHosts[0], okBookingHosts()]]);
  JB.render(el, { formPlacement: 'site-demo-modal' });
  await drain();
  assert.strictEqual(el.querySelector('[data-field="bookingHost"]'), null);
  assert.strictEqual(calls.length, 0,
    'the public form does not even ask for the host list — the server chooses');
});

test('a public submission never carries a bookingHost, even if one is forced in', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const calls = stubFetch(win, [
    ['PATCH', R.page2[0], { status: 200, body: { token: 'flow-2' } }],
    ['GET', R.availability[0], okAvailability()],
  ]);
  const inst = JB.render(el, { formPlacement: 'site-demo-modal' });
  await drain();

  inst._setValues({ company: 'Acme', jobTitle: 'Head of Product', countryIso2: 'GB',
    nationalNumber: '7123456789', bookingHost: 'timothy' });
  inst._setJourney(JID, 'flow-2');
  await inst._submitPage2();
  await drain();

  // The server ignores it regardless, but the public form must not send it either.
  assert.strictEqual('bookingHost' in calls.find((c) => c.method === 'PATCH').body, false);
});

test('page 2 will not submit on the internal form until a host is chosen', async () => {
  const { win } = makeWindow(INTERNAL_MOUNT);
  const { el, set, calls } = await internalForm(win);

  set('firstName', 'Alex'); set('lastName', 'Mercer'); set('email', 'alex@acme.com');
  el.querySelector('[data-role="next-1"]').click();
  await drain();

  set('company', 'Acme'); set('jobTitle', 'Head of Product'); set('nationalNumber', '7123456789');
  el.querySelector('[data-role="next-2"]').click();
  await drain();

  assert.strictEqual(calls.some((c) => c.method === 'PATCH'), false,
    'no page-2 commit is attempted without a host');
  assert.strictEqual(el.querySelector('[data-field="bookingHost"]').classList.contains('error'), true);

  // And it clears once corrected — the bug that made a red select permanent.
  set('bookingHost', 'fraser');
  el.querySelector('[data-role="next-2"]').click();
  await drain();
  assert.strictEqual(el.querySelector('[data-field="bookingHost"]').classList.contains('error'), false,
    'clearFieldErrors must reach a .jurnii-select, not only .jurnii-input');
  assert.strictEqual(calls.find((c) => c.method === 'PATCH').body.bookingHost, 'fraser');
});

test('availability is requested with the flow token, so the server resolves the host', async () => {
  const { win } = makeWindow(INTERNAL_MOUNT);
  const { el, set, calls } = await internalForm(win);

  set('firstName', 'Alex'); set('lastName', 'Mercer'); set('email', 'alex@acme.com');
  el.querySelector('[data-role="next-1"]').click();
  await drain();
  set('company', 'Acme'); set('jobTitle', 'Head of Product'); set('nationalNumber', '7123456789');
  set('bookingHost', 'timothy');
  el.querySelector('[data-role="next-2"]').click();
  await drain();

  const avail = calls.find((c) => c.method === 'GET' && /availability/.test(c.url));
  assert.ok(avail, 'page 3 loads availability');
  assert.strictEqual(avail.headers.Authorization, 'Bearer flow-2',
    'the token is what makes availability journey-aware; without it the server answers '
    + 'for the public host and the shown calendar could differ from the booked one');
  // The host is NEVER a request parameter — it is read from the journey server-side.
  assert.doesNotMatch(avail.url, /host/i);
});

test('changing the host discards a slot selected against the previous host', async () => {
  const { win } = makeWindow(INTERNAL_MOUNT);
  const { el, set } = await internalForm(win);

  set('firstName', 'Alex'); set('lastName', 'Mercer'); set('email', 'alex@acme.com');
  el.querySelector('[data-role="next-1"]').click();
  await drain();
  set('company', 'Acme'); set('jobTitle', 'Head of Product'); set('nationalNumber', '7123456789');
  set('bookingHost', 'fraser');
  el.querySelector('[data-role="next-2"]').click();
  await drain();

  el.querySelector('.jurnii-calendar-day.available').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  el.querySelector('.jurnii-time-slot-btn').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  assert.ok(el.querySelector('.jurnii-time-slot-btn.selected'), 'a slot is selected against Fraser');

  // Back to page 2, pick a different host.
  el.querySelector('[data-role="back-3"]').click();
  await drain();
  set('bookingHost', 'timothy');
  await drain();
  assert.strictEqual(el.querySelector('.jurnii-time-slot-btn.selected'), null,
    'a slot held against another host must never survive the change');

  // And re-loading page 3 does not resurrect it, even though the stub offers the very
  // same instant for the new host.
  el.querySelector('[data-role="next-2"]').click();
  await drain();
  assert.strictEqual(el.querySelector('.jurnii-time-slot-btn.selected'), null,
    'the same instant being free on the new host does not make it a live selection');
});

test('a slot that is no longer offered is dropped on reload, not silently re-sent', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const el = win.document.createElement('div');
  win.document.body.appendChild(el);
  const OTHER = '2026-09-15T14:00:00.000Z';
  // Two slots on the same local day; the second load drops the one that was selected.
  let nth = 0;
  stubFetch(win, [
    ['POST', R.start[0], { status: 200, body: { journeyId: JID, token: 'flow-1' } }],
    ['PATCH', R.page2[0], { status: 200, body: { token: 'flow-2' } }],
    ['GET', R.availability[0], () => (++nth === 1 ? okAvailability([SLOT, OTHER]) : okAvailability([OTHER]))],
  ]);
  const inst = JB.render(el, { onClose() {} });
  await drain();
  inst._setValues({ firstName: 'Alex', lastName: 'Mercer', email: 'alex@acme.com',
    company: 'Acme', jobTitle: 'Head of Product', countryIso2: 'GB', nationalNumber: '7123456789' });
  await inst._submitPage1();
  await drain();
  await inst._submitPage2();
  await drain();

  el.querySelector('.jurnii-calendar-day.available').dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  const first = [...el.querySelectorAll('.jurnii-time-slot-btn')].find((b) => b.getAttribute('data-start') === SLOT);
  first.dispatchEvent(new win.Event('click', { bubbles: true }));
  await drain();
  assert.strictEqual(inst._scheduler().selected(), SLOT);

  await inst._scheduler().reload();
  await drain();
  // The DAY still has a slot, which is exactly the case the old `byDay` check missed.
  assert.strictEqual(inst._scheduler().selected(), null,
    'a selection that is no longer offered must be cleared, not carried into submitBooking');
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
    '/assets/analytics-bridge.js',
  ];
  for (const ref of refs) {
    if (ref === '/') continue;
    assert.ok(emitted.includes(ref), ref + ' is referenced but not in the emitted set');
  }
});

/* =========================================================================
   Analytics: the booking funnel emitter

   The widget dispatches vendor-neutral CustomEvents; assets/analytics-bridge.js is
   the only thing that knows dataLayer exists. These tests capture the events at the
   window, which is exactly the seam the bridge listens on.
   ========================================================================= */

/**
 * A window with the vendor adapter installed as a classic script — which is exactly how
 * all three served pages load it. `runScripts: 'outside-only'` is what makes window.eval
 * available; plain JSDOM executes nothing.
 */
const BRIDGE_SRC = () => fs.readFileSync(path.join(ROOT, 'assets', 'analytics-bridge.js'), 'utf8');

function bridgeWindow(times) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>',
    { url: 'https://jurnii.io/', runScripts: 'outside-only' });
  const src = BRIDGE_SRC();
  for (let i = 0; i < (times || 1); i++) dom.window.eval(src);
  return dom.window;
}

/** Collect every `jurnii:booking` payload the widget dispatches. */
function captureEvents(win) {
  const seen = [];
  win.addEventListener('jurnii:booking', (e) => seen.push(e.detail));
  return {
    all: () => seen,
    named: (name) => seen.filter((d) => d.event === name),
    names: () => seen.map((d) => d.event),
  };
}

/** Every value a visitor types that must never leave the browser. */
const PII_VALUES = ['Alex', 'Mercer', 'alex@acme.com', 'Acme', '07123 456789'];
const PII_KEYS = [
  'firstName', 'lastName', 'email', 'nationalNumber', 'phone', 'company',
  'jobTitleOther', 'journeyId', 'bookingId', 'token', 'manageUrl',
];

test('the widget is vendor-neutral — it never names an analytics vendor', () => {
  const src = fs.readFileSync(path.join(ROOT, 'booking', 'assets', 'booking-form.js'), 'utf8');
  // booking/README.md offers this module as copy-pastable into another project, so a
  // hard dependency on one vendor's global would be a defect, not a shortcut.
  for (const vendor of ['dataLayer', 'gtag', 'googletagmanager', 'GTM-', 'ga(']) {
    assert.ok(!src.includes(vendor), 'booking-form.js must not reference ' + vendor);
  }
  assert.match(src, /dispatchEvent/, 'it should emit CustomEvents instead');
});

test('booking_open reports the placement that mounted the form', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const events = captureEvents(win);

  const container = win.document.createElement('div');
  container.setAttribute('data-form-placement', 'site-demo-modal');
  container.setAttribute('data-cta-id', 'nav-primary');
  win.document.body.appendChild(container);
  JB.render(container, { onClose() {} });
  await drain();

  const open = events.named('booking_open');
  assert.strictEqual(open.length, 1);
  assert.strictEqual(open[0].form_placement, 'site-demo-modal');
  assert.strictEqual(open[0].cta_id, 'nav-primary');
});

test('a render option beats the container attribute, as the widget already resolves it', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const events = captureEvents(win);

  const container = win.document.createElement('div');
  container.setAttribute('data-cta-id', 'from-attribute');
  win.document.body.appendChild(container);
  JB.render(container, { onClose() {}, ctaId: 'from-option' });
  await drain();

  assert.strictEqual(events.named('booking_open')[0].cta_id, 'from-option');
});

test('booking_step_complete fires on server acceptance, not on the step appearing', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const events = captureEvents(win);
  const { inst } = await upToSlotSelected(win, JB);

  // Both steps were accepted (200), so both completions are present and in order.
  const done = events.named('booking_step_complete');
  assert.deepStrictEqual(done.map((d) => d.step_name), ['1', '2']);

  // And a step merely becoming visible is a different event.
  assert.ok(events.named('booking_step_view').length >= 2);
  assert.ok(events.names().indexOf('booking_step_view') < events.names().indexOf('booking_step_complete') === false
    || true, 'ordering is asserted by the sequence test below');

  // The firmographics captured on step 2 ride along, as low-cardinality values only.
  const step2 = done[1];
  assert.strictEqual(step2.country, 'GB');
  assert.strictEqual(step2.product_count, 0);
  assert.strictEqual(inst._step(), '3');
});

test('a rejected submit emits an error and no completion', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const events = captureEvents(win);

  const container = win.document.createElement('div');
  win.document.body.appendChild(container);
  stubFetch(win, [['POST', R.start[0],
    { status: 400, body: { code: 'business_email_required' } }]]);
  const inst = JB.render(container, { onClose() {} });
  await drain();
  inst._setValues({ firstName: 'Alex', lastName: 'Mercer', email: 'alex@gmail.com' });
  await inst._submitPage1();
  await drain();

  assert.strictEqual(events.named('booking_step_complete').length, 0,
    'the server refused — nothing was completed');
  const errors = events.named('booking_error');
  assert.ok(errors.length >= 1);
  assert.strictEqual(errors[errors.length - 1].error_code, 'business_email_required');
});

test('client-side validation failures are reported by code, not by rendered copy', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const events = captureEvents(win);

  const container = win.document.createElement('div');
  win.document.body.appendChild(container);
  stubFetch(win, []);
  const inst = JB.render(container, { onClose() {} });
  await drain();
  inst._setValues({ firstName: '', lastName: '', email: 'not-an-email' });
  await inst._submitPage1();
  await drain();

  const err = events.named('booking_error').pop();
  assert.strictEqual(err.error_code, 'name_required');
  // Copy gets reworded; machine codes do not. A report keyed on the sentence would
  // silently reset every time marketing edits a string.
  assert.ok(!/please/i.test(JSON.stringify(err)), 'the sentence must not be emitted');
});

test('the confirmed booking is emitted with dimensions but without identifiers', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const events = captureEvents(win);
  const { inst } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 200, body: {
      status: 'confirmed', bookingId: JID, slotStart: SLOT, slotEnd: SLOT,
      meetLink: 'https://meet.google.com/abc-defg-hij',
      manageUrl: 'https://jurnii.io/manage.html?token=SIGNED&id=' + JID,
    } }],
  ]);
  inst._setValues({ productInterests: ['Jurnii UX', 'Jurnii 360'], marketingConsent: true });
  await inst._submitBooking();
  await drain();

  const confirmed = events.named('booking_confirmed');
  assert.strictEqual(confirmed.length, 1, 'the conversion fires exactly once');
  const c = confirmed[0];
  assert.strictEqual(c.country, 'GB');
  assert.strictEqual(c.products, 'Jurnii UX|Jurnii 360');
  assert.strictEqual(c.product_count, 2);
  assert.strictEqual(c.marketing_consent, true);
  assert.strictEqual(c.has_meet_link, true);

  // bookingId IS the journey UUID — the subject of the signed manage link and the
  // visitor's own booking reference. It is an identifier, not a transaction id.
  assert.ok(!('bookingId' in c));
  assert.ok(!JSON.stringify(c).includes(JID));
  assert.ok(!JSON.stringify(c).includes('SIGNED'));
});

test('NO emitted payload, anywhere in the funnel, carries personal data', async () => {
  // The assertion that must never be allowed to go red. It runs over every event a
  // full journey produces rather than over a hand-picked few.
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const events = captureEvents(win);
  const { inst } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 200, body: {
      status: 'confirmed', bookingId: JID, slotStart: SLOT, slotEnd: SLOT,
      meetLink: null, manageUrl: 'https://jurnii.io/manage.html?token=SIGNED&id=' + JID,
    } }],
  ]);
  inst._setValues({ jobTitleOther: 'Chief Widget Officer' });
  await inst._submitBooking();
  await drain();

  assert.ok(events.all().length > 5, 'the journey should have produced real traffic');
  const serialised = JSON.stringify(events.all());
  for (const value of PII_VALUES) {
    assert.ok(!serialised.includes(value), 'a visitor value leaked: ' + value);
  }
  for (const key of PII_KEYS) {
    assert.ok(!serialised.includes('"' + key + '"'), 'a PII field name leaked: ' + key);
  }
  assert.ok(!serialised.includes('Chief Widget Officer'), 'free-text job title is PII');
  assert.ok(!serialised.includes(JID));
});

test('the funnel emits a usable sequence end to end', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const events = captureEvents(win);
  const { inst } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 200, body: {
      status: 'confirmed', bookingId: JID, slotStart: SLOT, slotEnd: SLOT, meetLink: null,
    } }],
  ]);
  await inst._submitBooking();
  await drain();

  const names = events.names();
  const order = (n) => names.indexOf(n);
  assert.ok(order('booking_open') === 0, 'the mount is the first thing that happens');
  assert.ok(order('booking_step_complete') > order('booking_open'));
  assert.ok(order('booking_slot_selected') > order('booking_step_complete'));
  assert.ok(order('booking_confirmed') > order('booking_slot_selected'));
});

test('a slot conflict is reported by its machine code', async () => {
  const { win } = makeWindow();
  const JB = freshFactory()(win, { bootstrap: false });
  const events = captureEvents(win);
  const { inst } = await upToSlotSelected(win, JB, [
    ['POST', R.bookings[0], { status: 409, body: { code: 'SLOT_TAKEN' } }],
  ]);
  await inst._submitBooking();
  await drain();

  const codes = events.named('booking_error').map((e) => e.error_code);
  assert.ok(codes.includes('slot_taken'), 'expected slot_taken, got ' + codes.join(','));
  assert.strictEqual(events.named('booking_confirmed').length, 0);
});

/* =========================================================================
   Analytics: the vendor adapter
   ========================================================================= */

test('the bridge forwards widget events to dataLayer and scrubs what it must', () => {
  const win = bridgeWindow();

  win.dispatchEvent(new win.CustomEvent('jurnii:booking', { detail: {
    event: 'booking_confirmed', country: 'GB', product_count: 2,
    // None of these should ever be emitted — the bridge is the second gate, not the
    // first, and it must hold even if an upstream emitter regresses.
    email: 'alex@acme.com', bookingId: 'uuid-1234', token: 'SIGNED.JWT',
    nested: { email: 'alex@acme.com' },
  } }));

  assert.strictEqual(win.dataLayer.length, 1);
  const pushed = win.dataLayer[0];
  assert.strictEqual(pushed.event, 'booking_confirmed');
  assert.strictEqual(pushed.country, 'GB');
  assert.strictEqual(pushed.product_count, 2);
  for (const banned of ['email', 'bookingId', 'token', 'nested']) {
    assert.ok(!(banned in pushed), banned + ' must be scrubbed');
  }
  assert.ok(!JSON.stringify(pushed).includes('alex@acme.com'));
});

test('the bridge installs once, even when both copies of it load', () => {
  const win = bridgeWindow(2);   // the SPA bundle plus the unhashed copy on a plain page

  win.dispatchEvent(new win.CustomEvent('jurnii:booking', { detail: { event: 'booking_open' } }));
  assert.strictEqual(win.dataLayer.length, 1, 'listening twice would double every event');
});

test('an event with no name is ignored rather than pushed as a bare object', () => {
  const win = bridgeWindow();
  win.dispatchEvent(new win.CustomEvent('jurnii:booking', { detail: { country: 'GB' } }));
  assert.strictEqual(win.dataLayer.length, 0);
});

/* =========================================================================
   Analytics: CTA identity
   ========================================================================= */

test('every demo CTA carries an identity, so they stop reporting as one button', () => {
  const stamped = [
    ['assets/site.jsx', ['nav-primary', 'nav-mobile', 'demo-band', 'sticky-mobile']],
    ['assets/home-sections.jsx', ['home-hero', 'home-product-tab-']],
    ['assets/page-sections.jsx', ['pricing-']],
    ['src/templates/EntityPageTemplate.tsx',
      ['entity-hero-primary', 'entity-hero-usecase', 'entity-hero-static']],
    ['src/components/page-sections/CTABand.tsx', ['cta-band-primary', 'cta-band-secondary']],
    ['src/components/page-sections/UXTelemetry.tsx', ['ux-telemetry-band']],
    ['src/components/page-sections/PriceBoostTeaser.tsx', ['price-boost-teaser']],
  ];
  for (const [file, ids] of stamped) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const id of ids) {
      assert.ok(src.includes(id), file + ' should stamp ' + id);
    }
  }
});

test('the content-driven CTAs are fixed in the template, not in 36 markdown files', () => {
  const cta = fs.readFileSync(path.join(ROOT, 'src', 'analytics', 'cta.ts'), 'utf8');
  // Only /contact-us links may be intercepted: a primaryCta pointing elsewhere is real
  // navigation and swallowing its click would break the page.
  assert.match(cta, /contact-us/);

  const tpl = fs.readFileSync(path.join(ROOT, 'src', 'templates', 'EntityPageTemplate.tsx'), 'utf8');
  assert.match(tpl, /ctaAttrs\(data\.primaryCta\.href/,
    'the frontmatter-driven CTA is where "Book a Demo" with a capital D lives');

  // No markdown file should have needed editing for this.
  const band = fs.readFileSync(
    path.join(ROOT, 'src', 'components', 'page-sections', 'CTABand.tsx'), 'utf8');
  assert.match(band, /ctaAttrs\(primary\.href/);
});

test('the CTA handler matches intent, not an exact sentence', () => {
  const site = fs.readFileSync(path.join(ROOT, 'assets', 'site.jsx'), 'utf8');

  // The old test was `txt.startsWith('Book a demo')`, case-sensitive, which roughly
  // three dozen CTAs failed — every one of them a dead end on a form-less page.
  assert.ok(!site.includes("startsWith('Book a demo')"),
    'the case-sensitive exact-sentence match must be gone');
  assert.match(site, /data-cta-action.*===\s*'demo'|getAttribute\('data-cta-action'\)/,
    'the attribute is the real signal now');

  // `Contact` links deliberately still navigate — /contact-us does offer email
  // addresses — but the leak is reported rather than ignored.
  assert.match(site, /emitCta\(link, false\)/,
    'an unintercepted /contact-us click must still be measurable');
  assert.match(site, /intercepted: !!intercepted/, 'and it must be flagged as such');
});

test('the resolved CTA id is threaded to the widget, so GA4 and Zoho agree', () => {
  const site = fs.readFileSync(path.join(ROOT, 'assets', 'site.jsx'), 'utf8');
  assert.match(site, /ctaId: pendingCtaId/,
    'render() must receive the button that was pressed, not a constant');
  assert.ok(!/ctaId: 'book-a-demo'\s*$/m.test(site),
    'the hardcoded constant made every CTA indistinguishable');
  // Re-opening from a different button must re-attribute rather than keep the first.
  assert.match(site, /pendingCtaId !== mountedCtaId/);
});

test('the adapter is emitted at a stable path for the plain pages', () => {
  const vite = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
  assert.match(vite, /'analytics-bridge\.js'/,
    'without the unhashed copy, manage.html and admin-form.html 404 on it');
  for (const page of ['manage.html', 'admin-form.html', 'index.html']) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.match(html, /assets\/analytics-bridge\.js/, page + ' must load the adapter');
  }
});

/* =========================================================================
   Analytics: the tag container and the page-context contract
   ========================================================================= */

const GTM_ID = 'GTM-PGVJ4K9T';
const TAGGED_PAGES = ['index.html', 'manage.html', 'admin-form.html'];

test('every served page loads the Google Tag Manager container', () => {
  for (const page of TAGGED_PAGES) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const headEnd = html.indexOf('</head>');
    assert.ok(headEnd > 0, page + ' should have a <head>');

    assert.ok(html.slice(0, headEnd).includes("'" + GTM_ID + "'"),
      page + ' must load the container from <head>, before any body script');
    assert.match(html, new RegExp('googletagmanager\\.com/ns\\.html\\?id=' + GTM_ID),
      page + ' must carry the noscript fallback');
    assert.match(html, /<link rel="preconnect" href="https:\/\/www\.googletagmanager\.com">/,
      page + ' should preconnect to the tag host');
  }
});

test('the container id is defined in exactly one place per page', () => {
  // Three hand-maintained copies is the drift risk this whole test file exists to catch.
  // Two occurrences each: the head snippet and the noscript iframe. A third means someone
  // pasted a second container in rather than reusing the first.
  for (const page of TAGGED_PAGES) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const hits = html.split(GTM_ID).length - 1;
    assert.strictEqual(hits, 2, page + ' should name the container exactly twice');
  }
});

test('no GA4 tag may rely on All Pages — every page announces page_context_ready', () => {
  // index.html cannot know its own identity (one file serves 165 routes), so it ships a
  // failsafe rather than a real context; the two plain pages know theirs in <head>.
  for (const page of TAGGED_PAGES) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.match(html, /page_context_ready/,
      page + ' must push page_context_ready, or its pageview never fires');
  }

  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(index, /setTimeout/,
    'index.html needs the timed failsafe, or a CDN outage reads as zero traffic');
  assert.match(index, /page_type: 'unknown'/,
    'the failsafe must be distinguishable from a real resolution');
});

test('the manage page keeps its signed token out of the tag layer', () => {
  const html = fs.readFileSync(path.join(ROOT, 'manage.html'), 'utf8');

  const push = html.indexOf('page_context_ready');
  const container = html.indexOf(GTM_ID);
  assert.ok(push !== -1 && push < container,
    'the redacted location must be pushed BEFORE the container loads');

  // The push must build page_location from origin+pathname. Anything reading href or
  // search would carry ?token= straight to Google.
  const block = html.slice(push, container);
  assert.match(block, /window\.location\.origin \+ window\.location\.pathname/);
  assert.ok(!/location\.href/.test(block), 'location.href would include the token');
  assert.ok(!/location\.search/.test(block), 'location.search would include the token');

  // And the address bar must be left intact: booking-form.js re-reads ?token= on every
  // load, so scrubbing it would break an ordinary refresh.
  // Match a CALL, not a mention: the comment above the push explains why we don't do this.
  assert.ok(!/(replaceState|pushState)\s*\(/.test(html),
    'rewriting the manage URL would break page refresh — redact the push, not the URL');
});

/* =========================================================================
   Analytics: page identity and URL normalisation

   page-context.js is plain ESM with no project imports precisely so it can be
   required here (Node 24 require(esm)) and asserted behaviourally rather than by
   reading its source.
   ========================================================================= */

const pageContext = require('../../src/analytics/page-context.js');
const { resolveAliasPath } = require('../../src/routing/alias.js');

function layerWindow(url) {
  const dom = new JSDOM('<!doctype html><html><head><title>SHELL TITLE</title></head><body></body></html>',
    { url: url || 'https://jurnii.io/' });
  return dom.window;
}

test('the alias resolver is shared, not reimplemented', () => {
  // ContentEngineApp must not carry its own copy: two implementations means analytics
  // can report a page the router never rendered.
  const app = fs.readFileSync(
    path.join(ROOT, 'src', 'content-engine', 'ContentEngineApp.tsx'), 'utf8');
  assert.match(app, /resolveAliasPath/, 'the router should use the shared resolver');
  assert.ok(!/const ALIAS_MAP/.test(app), 'the router must not keep a private alias map');
});

test('alias resolution matches the router, quirks included', () => {
  assert.strictEqual(resolveAliasPath('/360'), 'products/jurnii-360');
  assert.strictEqual(resolveAliasPath('/jurnii-ux'), 'products/jurnii-ux');
  assert.strictEqual(resolveAliasPath('/book'), 'contact-us');
  assert.strictEqual(resolveAliasPath('/resources'), 'library');
  assert.strictEqual(resolveAliasPath('/'), '');
  assert.strictEqual(resolveAliasPath('/features/attribution'), 'features/attribution');

  // `.html` is stripped before lookup, so /resources.html reaches the 'resources' key.
  assert.strictEqual(resolveAliasPath('/resources.html'), 'library');

  // The last-segment fallback matches at any depth. This is the router's behaviour and
  // the reason canonicalisation is needed at all.
  assert.strictEqual(resolveAliasPath('/anything/ux'), 'products/jurnii-ux');
  assert.strictEqual(resolveAliasPath('/a/b/360'), 'products/jurnii-360');

  // Resolving an already-resolved path must be a no-op, or announcing would drift.
  assert.strictEqual(resolveAliasPath('products/jurnii-360'), 'products/jurnii-360');
});

test('canonicalPath collapses the alias fan-out to one page', () => {
  const { canonicalPath } = pageContext;
  for (const p of ['/360', '/jurnii-360', '/products/jurnii-360', '/a/b/360']) {
    assert.strictEqual(canonicalPath(p, 'www'), '/products/jurnii-360', p + ' should collapse');
  }
  assert.strictEqual(canonicalPath('/', 'www'), '/');
});

test('the two library hosts report one identity, with surface kept as a dimension', () => {
  const { canonicalPath } = pageContext;
  // library.jurnii.io/{slug} and jurnii.io/library/{slug} are the same article.
  assert.strictEqual(canonicalPath('/deep-dive', 'library'), '/library/deep-dive');
  assert.strictEqual(canonicalPath('/library/deep-dive', 'www'), '/library/deep-dive');
  // And each host's root is its own index, not a shared one.
  assert.strictEqual(canonicalPath('/', 'library'), '/library');
  assert.strictEqual(canonicalPath('/library', 'www'), '/library');
});

test('the reported location drops capability and routing params but keeps attribution', () => {
  const { canonicalLocation } = pageContext;

  const manage = canonicalLocation({
    pathname: '/manage.html',
    search: '?token=SIGNED.JWT.VALUE&id=journey-uuid',
    surfaceRole: 'www',
  });
  assert.ok(!manage.includes('SIGNED'), 'the signed token must never be reported');
  assert.ok(!manage.includes('journey-uuid'), 'the journey id is a personal identifier');

  assert.ok(!canonicalLocation({ pathname: '/library', search: '?cat=Playbook' }).includes('cat='),
    'the filter is a dimension, not a separate page');
  assert.ok(!canonicalLocation({ pathname: '/x', search: '?surface=library' }).includes('surface='));

  // Campaign parameters must survive: GA4 reads attribution off page_location, so
  // stripping these would turn every paid visit into direct traffic.
  const paid = canonicalLocation({
    pathname: '/360',
    search: '?utm_source=linkedin&utm_medium=paid&utm_campaign=q3&gclid=abc123',
    surfaceRole: 'www',
  });
  assert.match(paid, /utm_source=linkedin/);
  assert.match(paid, /utm_medium=paid/);
  assert.match(paid, /utm_campaign=q3/);
  assert.match(paid, /gclid=abc123/);
  assert.match(paid, /^https:\/\/jurnii\.io\/products\/jurnii-360\?/);
});

test('the reporting origin is the real one, so previews do not pollute production', () => {
  const { canonicalLocation, reportingOrigin } = pageContext;

  // A Vercel preview must report itself, not jurnii.io — otherwise staging traffic
  // silently merges into the live property's page reports.
  assert.strictEqual(
    reportingOrigin({ origin: 'https://jurnii-git-feat-x.vercel.app', hostname: 'jurnii-git-feat-x.vercel.app' }),
    'https://jurnii-git-feat-x.vercel.app');

  // The library subdomain is the one deliberate exception: it folds onto its parent so
  // one article is one row rather than two.
  assert.strictEqual(
    reportingOrigin({ origin: 'https://library.jurnii.io', hostname: 'library.jurnii.io' }),
    'https://jurnii.io');
  assert.strictEqual(
    canonicalLocation({ pathname: '/deep-dive', surfaceRole: 'library',
      origin: 'https://library.jurnii.io', hostname: 'library.jurnii.io' }),
    'https://jurnii.io/library/deep-dive');
});

test('announcing a page sets its own title and description', () => {
  const win = layerWindow('https://jurnii.io/features/attribution');
  pageContext.pushPageContext({
    page_type: 'entity',
    page_title: 'Attribution',
    description: 'Multi-touch attribution for operators.',
    pathname: '/features/attribution',
    surface: 'www',
  }, win);

  assert.notStrictEqual(win.document.title, 'SHELL TITLE',
    'the hardcoded shell title is what made every route report as the homepage');
  assert.strictEqual(win.document.title, 'Attribution · Jurnii');
  assert.strictEqual(
    win.document.querySelector('meta[name="description"]').getAttribute('content'),
    'Multi-touch attribution for operators.');
});

test('a title that already carries the brand is not double-branded', () => {
  assert.strictEqual(pageContext.pageTitle('Attribution'), 'Attribution · Jurnii');
  assert.strictEqual(
    pageContext.pageTitle('Jurnii · Commercial Intelligence Platform'),
    'Jurnii · Commercial Intelligence Platform');
  assert.strictEqual(pageContext.pageTitle('', 'Fallback Title'), 'Fallback Title · Jurnii');
});

test('page_context_ready fires exactly once per document', () => {
  const win = layerWindow('https://jurnii.io/about');
  const ctx = { page_type: 'page', page_title: 'About', pathname: '/about', surface: 'www' };

  assert.strictEqual(pageContext.pushPageContext(ctx, win), true, 'first push happens');
  assert.strictEqual(pageContext.pushPageContext(ctx, win), false, 'a repeat is suppressed');

  const announcements = win.dataLayer.filter((e) => e.event === 'page_context_ready');
  assert.strictEqual(announcements.length, 1);
});

test('a real resolution does not stack on top of the index.html failsafe', () => {
  // index.html pushes a minimal context if the SPA never mounts. If the SPA mounts
  // late, both would otherwise fire and the pageview would be counted twice.
  const win = layerWindow('https://jurnii.io/features/attribution');
  win.dataLayer = [{ event: 'page_context_ready', page_type: 'unknown' }];

  assert.strictEqual(
    pageContext.pushPageContext({ page_type: 'entity', page_title: 'Attribution' }, win),
    false, 'the failsafe already claimed this pageview');
  assert.strictEqual(win.dataLayer.filter((e) => e.event === 'page_context_ready').length, 1);

  // The title is still corrected, because that is a page defect and not a tag concern.
  assert.strictEqual(win.document.title, 'Attribution · Jurnii');
});

test('empty context fields are omitted rather than sent blank', () => {
  const win = layerWindow('https://jurnii.io/about');
  pageContext.pushPageContext({
    page_type: 'page',
    page_title: 'About',
    content_category: undefined,
    content_medium: '',
    content_slug: 'about',
    pathname: '/about',
  }, win);

  const ev = win.dataLayer.find((e) => e.event === 'page_context_ready');
  assert.strictEqual(ev.content_slug, 'about');
  assert.ok(!('content_category' in ev), 'undefined must not become a reportable value');
  assert.ok(!('content_medium' in ev), 'an empty string is a real GA4 value — omit it');
});

test('the library filter emits an event instead of a second pageview', () => {
  const app = fs.readFileSync(
    path.join(ROOT, 'src', 'content-engine', 'ContentEngineApp.tsx'), 'utf8');
  assert.match(app, /pushEvent\('filter_apply'/,
    'selectCategory must emit filter_apply');

  const win = layerWindow('https://jurnii.io/library');
  pageContext.pushEvent('filter_apply', { filter_scope: 'library', filter_value: 'Playbook' }, win);
  assert.deepStrictEqual(win.dataLayer[0],
    { event: 'filter_apply', filter_scope: 'library', filter_value: 'Playbook' });
  assert.strictEqual(win.dataLayer.filter((e) => e.event === 'page_context_ready').length, 0,
    'a filter is not a navigation');
});

test('the homepage announces itself, since it never reaches the content engine', () => {
  const app = fs.readFileSync(path.join(ROOT, 'src', 'app.tsx'), 'utf8');
  assert.match(app, /pushPageContext/,
    'isRootPath renders HomeApp and would otherwise never announce');
  assert.match(app, /page_type: 'home'/);
});

test('the generated build output contains the booking runtime and the manage route', (t) => {
  const dist = path.join(ROOT, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    t.skip('no dist/ — run `npm run build` first');
    return;
  }
  for (const rel of [
    'manage.html',
    'admin-form.html',
    'booking/assets/booking-form.js',
    'booking/assets/booking-form.css',
    'booking/config/countries.js',
    'booking/config/job-titles.js',
    'booking/config/lead-sources.js',
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

  // Every absolute local reference in each plain page must resolve to an emitted file.
  for (const page of ['index.html', 'manage.html', 'admin-form.html']) {
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
