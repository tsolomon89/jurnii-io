'use strict';

/**
 * Integration-layer controls, offline. No network is touched: the Google client and
 * the Zoho transport are both stubbed, and several tests assert a call is NEVER made.
 *
 * Plan coverage: #60, #69, #70, #74, #88, #89, #90 (Google identifiers and the 404
 * rule), and the Zoho transport, suppression and linkage controls.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const G = require('../integrations/google');
const Z = require('../integrations/zoho');

// ---------------------------------------------------------------------------
// Google: identifiers
// ---------------------------------------------------------------------------

test('#60/#90 the deterministic event id is 46 base32hex chars from the OPAQUE key', () => {
  const id = G.deterministicEventId({ calendarKey: 'jurnii_local', journeyId: '11111111-2222-3333-4444-555555555555', attempt: 1 });
  assert.equal(id.length, 46);
  assert.match(id, /^[0-9a-v]+$/, 'Google requires base32hex; hex is a strict subset');
  assert.match(id, /^bk/);

  // Stable for the same triple, and different for each component.
  const same = G.deterministicEventId({ calendarKey: 'jurnii_local', journeyId: '11111111-2222-3333-4444-555555555555', attempt: 1 });
  assert.equal(id, same);
  for (const change of [
    { calendarKey: 'jurnii_other' },
    { journeyId: '99999999-2222-3333-4444-555555555555' },
    { attempt: 2 },
  ]) {
    const other = G.deterministicEventId({
      calendarKey: 'jurnii_local', journeyId: '11111111-2222-3333-4444-555555555555', attempt: 1, ...change });
    assert.notEqual(id, other, `changing ${Object.keys(change)[0]} must change the id`);
  }

  // Derives from the key, NOT the calendar address — so the id discloses nothing.
  const addressDerived = G.sha256hex('demos@jurnii.io').slice(0, 8);
  assert.ok(!id.includes(addressDerived), 'no digest of the address appears in the id');
});

test('#69/#90 every Google operation refuses an alias or missing calendar id', async () => {
  for (const bad of [undefined, null, '', 'primary', 'PRIMARY', 'not-an-address']) {
    assert.throws(() => G.requireCalendarId(bad), /calendar_id_(required|must_be_canonical)/,
      `${JSON.stringify(bad)} must be refused: an alias addresses a different reservation namespace`);
  }
  assert.equal(G.requireCalendarId('demos@jurnii.io'), 'demos@jurnii.io');

  // readEvent and probeEventAccess reject before any network call.
  await assert.rejects(() => G.readEvent('primary', 'ev1'), /calendar_id_must_be_canonical/);
  await assert.rejects(() => G.probeEventAccess(undefined), /calendar_id_required/);
});

test('listEventByJourneyId is deleted, not merely unused', () => {
  assert.equal(G.listEventByJourneyId, undefined,
    'showDeleted:false cannot see a cancelled event, so correlation must be events.get');
  // events.list must appear EXACTLY once in the whole module, and that one call site
  // must be the access probe. Anything else would be a correlation path.
  const src = require('fs').readFileSync(path.join(__dirname, '..', 'integrations', 'google', 'index.js'), 'utf8');
  const callSites = src.match(/events\.list\(/g) || [];
  assert.equal(callSites.length, 1, 'exactly one events.list call site');
  const probeStart = src.indexOf('async function probeEventAccess');
  const probeEnd = src.indexOf('\n}', probeStart);
  const listAt = src.indexOf('events.list(');
  assert.ok(listAt > probeStart && listAt < probeEnd,
    'the only events.list call is inside probeEventAccess');
});

// ---------------------------------------------------------------------------
// Google: error classification and the 404 rule
// ---------------------------------------------------------------------------

test('a transport failure is never a verdict about the event', () => {
  for (const status of [null, 429, 500, 502, 503, 504]) {
    assert.equal(G.classify({ code: status }).transient, true, `${status} is transient`);
  }
  for (const status of [400, 401, 403, 404, 409, 410]) {
    assert.equal(G.classify({ code: status }).transient, false, `${status} is a definite answer`);
  }
});

test('#74/#88 only writer and owner confirm access; every other role is unconfirmed', async () => {
  const original = require('googleapis').google.calendar;
  const roles = ['writer', 'owner', 'reader', 'freeBusyReader', 'writerWithoutPrivateAccess', 'none', undefined];
  const results = {};
  try {
    for (const role of roles) {
      require('googleapis').google.calendar = () => ({
        events: {
          list: async (params) => {
            // The probe must be bounded and must not fetch items.
            assert.equal(params.maxResults, 1);
            assert.equal(params.fields, 'accessRole');
            return { data: { accessRole: role, items: [{ id: 'MUST-NOT-BE-READ' }] } };
          },
        },
      });
      results[String(role)] = (await G.probeEventAccess('demos@jurnii.io')).confirmed;
    }
    // A failing probe is not confirmation either.
    require('googleapis').google.calendar = () => ({
      events: { list: async () => { const e = new Error('boom'); e.code = 403; throw e; } },
    });
    results.failure = (await G.probeEventAccess('demos@jurnii.io')).confirmed;
  } finally {
    require('googleapis').google.calendar = original;
  }

  assert.deepEqual(results, {
    writer: true, owner: true,
    reader: false, freeBusyReader: false,
    writerWithoutPrivateAccess: false,   // unconfirmed BY DEFAULT (§5.1)
    none: false, undefined: false, failure: false,
  });
});

test('a 404 alone is never absence; qualifyNotFound requires a confirmed probe', async () => {
  const original = require('googleapis').google.calendar;
  try {
    // 404 + reader -> unknown. The hold must be retained.
    require('googleapis').google.calendar = () => ({
      events: {
        get: async () => { const e = new Error('nf'); e.code = 404; throw e; },
        list: async () => ({ data: { accessRole: 'reader' } }),
      },
    });
    assert.equal((await G.readEvent('demos@jurnii.io', 'ev')).kind, 'not_found');
    assert.equal((await G.qualifyNotFound('demos@jurnii.io')).verdict, 'unknown');

    // 404 + writer -> absent.
    require('googleapis').google.calendar = () => ({
      events: { list: async () => ({ data: { accessRole: 'writer' } }) },
    });
    assert.equal((await G.qualifyNotFound('demos@jurnii.io')).verdict, 'absent');
  } finally {
    require('googleapis').google.calendar = original;
  }
});

test('readEvent distinguishes present, cancelled, gone, not_found and unreadable', async () => {
  const original = require('googleapis').google.calendar;
  const cases = [
    [{ data: { id: 'e', status: 'confirmed' } }, 'present'],
    [{ data: { id: 'e', status: 'cancelled' } }, 'cancelled'],
    [{ throw: 410 }, 'gone'],
    [{ throw: 404 }, 'not_found'],
    [{ throw: 503 }, 'unreadable'],
  ];
  try {
    for (const [outcome, expected] of cases) {
      require('googleapis').google.calendar = () => ({
        events: {
          get: async () => {
            if (outcome.throw) { const e = new Error('x'); e.code = outcome.throw; throw e; }
            return outcome;
          },
        },
      });
      const res = await G.readEvent('demos@jurnii.io', 'ev');
      assert.equal(res.kind, expected);
    }
  } finally {
    require('googleapis').google.calendar = original;
  }
});

test('#70 private metadata carries exactly journeyId and attempt — never an email', async () => {
  const original = require('googleapis').google.calendar;
  let captured = null;
  try {
    require('googleapis').google.calendar = () => ({
      events: { insert: async (p) => { captured = p; return { data: { id: p.requestBody.id } }; } },
    });
    await G.insertEvent('demos@jurnii.io', {
      eventId: 'bk0000', summary: 's', description: 'd',
      start: '2026-12-01T13:00:00Z', end: '2026-12-01T13:30:00Z',
      attendees: [{ email: 'visitor@example.test' }],
      journeyId: 'j-1', attempt: 3,
    });
  } finally {
    require('googleapis').google.calendar = original;
  }
  const priv = captured.requestBody.extendedProperties.private;
  assert.deepEqual(Object.keys(priv).sort(), ['attempt', 'journeyId']);
  assert.equal(priv.attempt, '3');
  assert.equal(JSON.stringify(priv).includes('@'), false, 'no email in third-party metadata');
  assert.equal(captured.requestBody.id, 'bk0000', 'our deterministic id is supplied');
});

test('insertEvent reports duplicate, uncertain and rejected distinctly', async () => {
  const original = require('googleapis').google.calendar;
  const map = { 409: 'duplicate', 503: 'uncertain', 400: 'rejected' };
  try {
    for (const [status, kind] of Object.entries(map)) {
      require('googleapis').google.calendar = () => ({
        events: { insert: async () => { const e = new Error('x'); e.code = Number(status); throw e; } },
      });
      const res = await G.insertEvent('demos@jurnii.io', { eventId: 'e', journeyId: 'j', attempt: 0 });
      assert.equal(res.kind, kind, `${status} -> ${kind}`);
    }
  } finally {
    require('googleapis').google.calendar = original;
  }
});

// ---------------------------------------------------------------------------
// Zoho: transport controls
// ---------------------------------------------------------------------------

test('Retry-After is honoured in both seconds and HTTP-date form', () => {
  assert.equal(Z.retryAfterSeconds({ 'retry-after': '42' }), 42);
  const inTen = new Date(Date.now() + 10_000).toUTCString();
  const parsed = Z.retryAfterSeconds({ 'retry-after': inTen });
  assert.ok(parsed >= 8 && parsed <= 11, `expected ~10, got ${parsed}`);
  assert.equal(Z.retryAfterSeconds({}), null);
  assert.equal(Z.retryAfterSeconds({ 'retry-after': 'nonsense' }), null);
});

test('error classification separates retryable from terminal', () => {
  for (const code of ['zoho_http_429', 'zoho_http_500', 'zoho_http_503', 'zoho_network_error', 'zoho_socket_timeout', 'zoho_token_refresh_failed']) {
    const e = new Z.ZohoError(code);
    assert.equal(e.retryable, true, `${code} retryable`);
    assert.equal(Z.isDefiniteReject(e), false, `${code} is NOT a definite reject`);
  }
  for (const code of ['zoho_http_400', 'zoho_http_401', 'zoho_http_404', 'INVALID_DATA', 'MANDATORY_NOT_FOUND', 'zoho_response_parse_failed']) {
    const e = new Z.ZohoError(code);
    assert.equal(e.terminal, true, `${code} terminal`);
    assert.equal(Z.isDefiniteReject(e), true);
  }
  // An unrecognised code is neither: treated as uncertain, the conservative direction.
  const unknown = new Z.ZohoError('zoho_http_418');
  assert.equal(unknown.retryable, false);
  assert.equal(Z.isDefiniteReject(unknown), false);
});

test('DUPLICATE_DATA yields the existing id so no second create is attempted', () => {
  const withNested = { code: 'DUPLICATE_DATA', details: { duplicate_record: { id: '55501' } } };
  assert.equal(Z.duplicateRecordId(withNested), '55501');
  const withFlat = { code: 'DUPLICATE_DATA', details: { id: '55502' } };
  assert.equal(Z.duplicateRecordId(withFlat), '55502');
  assert.equal(Z.duplicateRecordId({ code: 'INVALID_DATA', details: {} }), null);

  const res = Z.firstWriteResult({ data: [withNested] });
  assert.deepEqual(res, { ok: false, duplicateId: '55501', code: 'DUPLICATE_DATA' });
});

// ---------------------------------------------------------------------------
// Zoho: suppression and linkage controls
// ---------------------------------------------------------------------------

test('every data-load write is suppressed; only the terminal Lead update runs workflows', () => {
  assert.deepEqual(Z.writePayload({ a: 1 }, []).trigger, [], 'trigger: [] suppresses all automation');
  assert.equal('trigger' in Z.writePayload({ a: 1 }, undefined), false,
    'omitting trigger is what lets processLead run');
});

test('#11/#37 a Deal is linked only together with the final Contact', () => {
  const base = {
    journeyId: 'j1', title: 'Jurnii | BetCo - Sarah | Jurnii UX',
    startIso: '2026-12-01T13:00:00Z', endIso: '2026-12-01T13:30:00Z',
  };

  // Lead person + known Deal -> person-linked ONLY. What_Id over a Lead Who_Id
  // silently mis-routes routeContactSequence.
  const leadWithDeal = Z.buildMeetingPayload({ ...base, leadId: '700', dealId: '900' });
  assert.equal(leadWithDeal.Who_Id.id, '700');
  assert.equal('What_Id' in leadWithDeal, false);
  assert.equal('$se_module' in leadWithDeal, false);

  // Contact + Deal -> both applied in the SAME write, with $se_module.
  const contactWithDeal = Z.buildMeetingPayload({ ...base, contactId: '800', dealId: '900' });
  assert.equal(contactWithDeal.Who_Id.id, '800');
  assert.equal(contactWithDeal.What_Id.id, '900');
  assert.equal(contactWithDeal.$se_module, 'Deals');

  // Contact, no Deal yet -> person-linked, awaiting the retro-link.
  const contactOnly = Z.buildMeetingPayload({ ...base, contactId: '800' });
  assert.equal('What_Id' in contactOnly, false);

  // No person at all -> Who_Id is OMITTED, never sent empty or null.
  //
  // This is the fallback `meetingCreate` uses once the Lead has been converted and no
  // Contact has been discovered yet. `Who_Id` is a CONTACT lookup: a converted Lead id
  // is rejected with INVALID_DATA, which is terminal, and that escalated the journey
  // instead of retrying. A Meeting with no person is recoverable — `dealReconcile`
  // applies Who_Id and What_Id together afterwards — whereas a terminal reject is not.
  const noPerson = Z.buildMeetingPayload({ ...base });
  assert.equal('Who_Id' in noPerson, false, 'no person means no Who_Id key at all');
  assert.equal('What_Id' in noPerson, false);
  assert.equal(noPerson.Ext_Calendar_Booking_ID, 'j1', 'correlation still allows recovery');

  // A Deal without a person is never linked: What_Id over an absent Who_Id would let
  // WF007 route a sequence with no contact.
  const dealNoPerson = Z.buildMeetingPayload({ ...base, dealId: '900' });
  assert.equal('What_Id' in dealNoPerson, false);
  assert.equal('$se_module' in dealNoPerson, false);

  // The correlation key is always re-sent, never cleared.
  for (const p of [leadWithDeal, contactWithDeal, contactOnly, noPerson]) {
    assert.equal(p.Ext_Calendar_Booking_ID, 'j1');
  }
});

// ---------------------------------------------------------------------------
// The Meeting's title and structured booking state
// ---------------------------------------------------------------------------

const MEETING_BASE = {
  journeyId: 'j1', title: 'Jurnii | BetCo - Sarah | Jurnii UX',
  startIso: '2026-12-01T13:00:00Z', endIso: '2026-12-01T13:30:00Z',
};

test('Event_Title is the caller\'s title, never a constant of its own', () => {
  // The builder must not invent or default a title: a fallback here would be a second
  // place the meeting name is decided, which is exactly what this change removes.
  for (const title of ['Jurnii | BetCo - Sarah | Jurnii UX', 'Jurnii | Product Discovery']) {
    assert.equal(Z.buildMeetingPayload({ ...MEETING_BASE, title }).Event_Title, title);
  }
});

test('a confirmed booking is an upcoming demo: Demo Booking / Open / Working', () => {
  const p = Z.buildMeetingPayload(MEETING_BASE);
  assert.equal(p.Meeting_Task_Stage, 'Demo Booking');
  assert.equal(p.Meeting_Task_State, 'Open');
  // Not 'New' — that is not a live value for this field, and setting a valid one here
  // stops handleMeetingEvent writing the invalid one into a blank.
  assert.equal(p.Meeting_Task_Status, 'Working');
});

test('Meeting_Task_Contract_Products is a real multiselect array, never a joined string', () => {
  const products = ['Jurnii UX', 'Jurnii Cortex'];
  const p = Z.buildMeetingPayload({ ...MEETING_BASE, products });

  assert.ok(Array.isArray(p.Meeting_Task_Contract_Products), 'must be an Array');
  assert.notEqual(typeof p.Meeting_Task_Contract_Products, 'string',
    'a comma-joined string is INVALID_DATA on a jsonarray field, and terminal');
  assert.deepEqual(p.Meeting_Task_Contract_Products, products);

  // The human-readable Description carries the same scope in prose. The two must not be
  // confused for one another: only the field drives automation.
  assert.ok(p.Description.includes('Products: Jurnii UX + Jurnii Cortex'));
});

test('no selected product OMITS the field rather than sending an empty array', () => {
  for (const products of [[], undefined]) {
    const p = Z.buildMeetingPayload({ ...MEETING_BASE, products });
    assert.equal('Meeting_Task_Contract_Products' in p, false,
      'omission is provably safe; [] is only probably safe, and a wrong guess is terminal');
    assert.ok(p.Description.includes('Products: Product Discovery'));
  }
});

test('"Not sure yet" never reaches Zoho in any field', () => {
  // The canonicalizer drops it upstream, so it can only arrive here through a bug. This
  // asserts the whole serialized payload, not one field.
  const p = Z.buildMeetingPayload({ ...MEETING_BASE, products: ['Jurnii UX'] });
  assert.equal(/not sure yet/i.test(JSON.stringify(p)), false);
});

test('the manage link appears only when the worker could build one', () => {
  const withUrl = Z.buildMeetingPayload({ ...MEETING_BASE, manageUrl: 'https://jurnii.io/manage.html?token=t&id=j1' });
  assert.ok(withUrl.Description.includes('Manage or cancel: https://jurnii.io/manage.html?token=t&id=j1'));

  // Without PUBLIC_BASE_URL the worker passes null rather than guess a host — a
  // preview-signed link on a production record would be worse than no link.
  const without = Z.buildMeetingPayload(MEETING_BASE);
  assert.equal(/manage/i.test(without.Description), false);
});

test('the Description always carries the Meet link and the booking reference', () => {
  const p = Z.buildMeetingPayload({ ...MEETING_BASE, meetLink: 'https://meet.google.com/abc-defg-hij' });
  assert.ok(p.Description.includes('Google Meet Link: https://meet.google.com/abc-defg-hij'));
  assert.ok(p.Description.includes('Booking Reference: j1'));
});

test('readConversion tolerates every shape, and unconverted Leads are the only candidates', () => {
  assert.equal(Z.readConversion(null).converted, false);
  assert.equal(Z.readConversion({}).converted, false);
  assert.equal(Z.readConversion({ $converted: true }).converted, true);
  assert.equal(Z.readConversion({ Is_Converted: true }).converted, true);
  const detailed = Z.readConversion({ $converted_detail: { contact_id: '800', account_id: '810' } });
  assert.equal(detailed.converted, true);
  assert.equal(detailed.contactId, '800');
  assert.equal(detailed.accountId, '810');
  const viaLookup = Z.readConversion({ $converted: true, Contact_Name: { id: '801' } });
  assert.equal(viaLookup.contactId, '801');
});

test('the Account is DERIVED from a verified Contact, never supplied', () => {
  assert.equal(Z.accountIdOfContact({ Account_Name: { id: '810' } }), '810');
  assert.equal(Z.accountIdOfContact({ Account_Name: null }), null);
  assert.equal(Z.accountIdOfContact({}), null);
  assert.equal(Z.accountIdOfContact(null), null);
});

test('resolveProductDeal resolves the Account\'s single Deal and never guesses', async () => {
  const fetch = (deals) => async () => deals;

  // WORK ITEM 4.1. This test used to assert Product-name substring matching inside
  // Deal_Name. That is the prohibited model, and it would break by construction once
  // Deluge names the single Deal after the ACCOUNT: Deal_Name would contain no Product
  // name, so every lookup would return 'none' and every Meeting would be created with
  // no What_Id. The contract is now "the Account's Deal", and the assertion that
  // matters most is that ambiguity is still never resolved by picking.
  const many = await Z.resolveProductDeal('810', 'Platform', {
    fetchDeals: fetch([
      { id: '1', Deal_Name: 'Acme Ltd' },
      { id: '2', Deal_Name: 'Acme Ltd' },
    ]),
  });
  assert.equal(many.status, 'many');
  assert.equal(many.deal, null, 'no Deal is returned, so none can be linked');
  assert.deepEqual(many.candidates, ['1', '2'], 'every candidate is named for the review');

  // The Account's one Deal resolves even though its name carries no Product at all —
  // exactly the shape the Deluge naming change produces.
  const one = await Z.resolveProductDeal('810', 'Platform', {
    fetchDeals: fetch([{ id: '1', Deal_Name: 'Acme Ltd' }]),
  });
  assert.equal(one.status, 'one');
  assert.equal(one.deal.id, '1');

  // The product argument no longer participates in selection.
  const ignored = await Z.resolveProductDeal('810', 'a product that does not exist', {
    fetchDeals: fetch([{ id: '4', Deal_Name: 'Acme Ltd' }]),
  });
  assert.equal(ignored.status, 'one');
  assert.equal(ignored.deal.id, '4');

  // A Lost relationship is excluded when something open exists beside it.
  const lostExcluded = await Z.resolveProductDeal('810', 'Platform', {
    fetchDeals: fetch([
      { id: '5', Deal_Name: 'Acme Ltd', Opportunity_State: 'Lost' },
      { id: '6', Deal_Name: 'Acme Ltd', Opportunity_State: 'Open' },
    ]),
  });
  assert.equal(lostExcluded.status, 'one');
  assert.equal(lostExcluded.deal.id, '6');

  assert.equal((await Z.resolveProductDeal('810', 'Platform', { fetchDeals: fetch([]) })).status, 'none');

  // No Account: nothing is fetched at all. A missing product no longer short-circuits,
  // because the product is not an input to the decision any more.
  let called = false;
  const guard = { fetchDeals: async () => { called = true; return []; } };
  assert.equal((await Z.resolveProductDeal(null, 'Platform', guard)).status, 'none');
  assert.equal(called, false, 'no Deal read is issued without an Account');
});

/**
 * Regression: every v6 RELATED-LIST read must carry `fields`.
 *
 * `GET /crm/v6/Accounts/{id}/Deals` without it returns HTTP 400
 * `REQUIRED_PARAM_MISSING`, which is classified TERMINAL — so it never retried and
 * escalated the journey instead. Because `meetingCreate` resolves the Deal inside its
 * try block BEFORE `incrementCreateAttempts`, the Event create was never attempted and
 * EVERY booking landed in `manual_review` with `meeting_create_failed`.
 *
 * The `fetchDeals` seam above tests the matching rule while bypassing the URL entirely,
 * which is exactly why this shipped. This test reads the source, so it cannot be
 * bypassed by a seam.
 */
test('every v6 related-list read carries the required `fields` parameter', () => {
  const src = require('fs').readFileSync(
    path.join(__dirname, '..', 'integrations', 'zoho', 'index.js'), 'utf8');

  // `/crm/v6/<Module>/<id-expression>/<RelatedList>` — a search or single-record read
  // has no third segment and is not subject to the rule.
  const related = [...src.matchAll(/`\/crm\/v6\/[A-Za-z_]+\/\$\{[^}]+\}\/([A-Za-z_]+)([^`]*)`/g)];
  assert.ok(related.length >= 2, 'expected the Deals and Tasks related-list reads to be found');

  for (const [whole, list, query] of related) {
    assert.match(query, /[?&]fields=/,
      `${list} related-list read omits \`fields\` and will 400: ${whole}`);
  }
});

test('Node cannot create a Contact, Account, Deal or Quote — the functions do not exist', () => {
  for (const forbidden of [
    'createContact', 'createAccount', 'createDeal', 'createQuote',
    'createField', 'createPicklistValue', 'createWorkflow', 'updateFieldMetadata',
  ]) {
    assert.equal(Z[forbidden], undefined, `${forbidden} must not exist in the integration surface`);
  }
});

test('the Manual Review Task shape matches each case, and a closed Task is reopened', () => {
  const linked = Z.buildManualReviewTask({ journeyId: 'j1', contactId: '800', description: 'x' });
  assert.equal(linked.Subject, 'Manual Review: j1', 'journey-scoped and stable — it is the lookup key');
  assert.equal(linked.Who_Id.id, '800');
  assert.equal(linked.$se_module, 'Contacts');
  assert.equal('What_Id' in linked, false, 'no Deal is ever invented to host the Task');

  process.env.ZOHO_MANUAL_REVIEW_OWNER_ID = '4242';
  const unlinked = Z.buildManualReviewTask({ journeyId: 'j1', contactId: null, description: 'x' });
  assert.equal('Who_Id' in unlinked, false);
  assert.equal('What_Id' in unlinked, false);
  assert.equal('$se_module' in unlinked, false);
  assert.equal(unlinked.Owner.id, '4242');
  delete process.env.ZOHO_MANUAL_REVIEW_OWNER_ID;

  assert.equal(Z.taskIsClosed({ Status: 'Completed' }), true);
  assert.equal(Z.taskIsClosed({ Task_Status: 'Closed' }), true);
  assert.equal(Z.taskIsClosed({ Status: 'In Progress', Task_Status: 'Working' }), false);
  const reopened = Z.buildManualReviewTask({ journeyId: 'j1', contactId: '800', description: 'x', reopen: true });
  assert.equal(reopened.Status, 'In Progress');
  assert.equal(reopened.Task_State, 'Open');
});
