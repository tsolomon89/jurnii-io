'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const sync = require('../sync');

// ---------------------------------------------------------------------------
// Harness
//
// Every I/O dependency is injected, and anything NOT explicitly stubbed throws
// `unexpected call: <name>` — so a code path that reaches the network by
// accident fails loudly rather than silently, the same discipline as
// booking/tests/db/worker.test.js:40.
// ---------------------------------------------------------------------------

const ARMED = {
  LEMLIST_SYNC_ENABLED: 'true',
  LEMLIST_ZOHO_WRITE_ENABLED: 'true',
  LEMLIST_ALLOW_RECORD_CREATION: 'true',
  LEMLIST_BODY_LOOKUP_ENABLED: 'true',
  LEMLIST_MAX_TASKS_PER_RUN: '100',
  LEMLIST_DEFAULT_OWNER_ID: '991103000001576001',
};

function harness(stubs = {}) {
  const calls = [];
  const logs = [];
  const names = [
    'fetchActivities', 'getInboxMessages', 'getTeamUsers', 'getActiveUsers',
    'findTaskByActivityId', 'findContactsByLinkedinFragment', 'findContactsByEmail',
    'findAccountsByWebsite', 'findAccountsByKey', 'findAccountsByName',
    'findAccountsByCompanyLinkedinFragment',
    'createAccountSuppressed', 'createContactSuppressed', 'createTask', 'readBack',
  ];
  const deps = { log: (f) => logs.push(f) };
  for (const name of names) {
    deps[name] = async (...args) => {
      calls.push({ name, args });
      if (!(name in stubs)) throw new Error(`unexpected call: ${name}`);
      const v = stubs[name];
      return typeof v === 'function' ? v(...args) : v;
    };
  }
  return {
    deps,
    calls,
    logs,
    countOf: (name) => calls.filter((c) => c.name === name).length,
    named: (name) => calls.filter((c) => c.name === name),
  };
}

function activity(overrides = {}) {
  return Object.assign({
    _id: 'act_x6esGLhoPa2SMHCZ7',
    type: 'linkedinSent',
    createdAt: '2026-08-30T14:03:11.482Z',
    contactId: 'ctc_FkeUdQHEfhqG2HMbK',
    leadId: 'lea_wj47uWhDbbN6Qq6oT',
    campaignId: 'cam_oxeGg6paG3ZVxjHkH',
    campaignName: 'Q3 UK Operators',
    sequenceStep: 3,
    sendUserId: 'usr_EvXz6JqPSJJL9lHkp',
    leadEmail: 'tuf.gavaz@flutteruki.com',
    leadCompanyName: 'Flutter UK & Ireland',
    lead: {
      variables: {
        firstName: 'Tuf',
        lastName: 'Gavaz',
        email: 'tuf.gavaz@flutteruki.com',
        companyName: 'Flutter UK & Ireland',
        companyDomain: 'flutteruki.com',
        linkedinUrl: 'https://www.linkedin.com/in/tuf-gavaz/',
        jobTitle: 'Head of Product',
      },
    },
  }, overrides);
}

const EXISTING_CONTACT = {
  id: '991103000002883343',
  Email: 'tuf.gavaz@flutteruki.com',
  Personal_Linkedin: 'https://www.linkedin.com/in/tuf-gavaz/',
  Account_Name: { name: 'Flutter UK & Ireland', id: '991103000002872067' },
  Last_Name: 'Gavaz',
};

function pages(activities) {
  return async () => ({ activities, pages: 1, truncated: false });
}

const NO_TEAM = { getTeamUsers: [], getActiveUsers: [] };

// ---------------------------------------------------------------------------
// The happy path
// ---------------------------------------------------------------------------

test('an activity for an existing Contact creates exactly one completed Task', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: { messages: [], pagination: null },
    createTask: { ok: true, id: '991103000009000001' },
    readBack: (m, id, fields) => {
      const row = { id };
      for (const f of String(fields).split(',')) row[f] = 'present';
      return row;
    },
  }, NO_TEAM));

  const r = await sync.runSync({ now: new Date('2026-08-31T04:30:00Z'), env: ARMED, deps: h.deps });

  assert.equal(r.outcome, 'complete');
  assert.equal(r.tasksCreated, 1);
  assert.equal(r.contactsMatchedByLinkedin, 1);
  assert.equal(h.countOf('createTask'), 1);
  // Nothing was created in the CRM graph.
  assert.equal(h.countOf('createContactSuppressed'), 0);
  assert.equal(h.countOf('createAccountSuppressed'), 0);

  const payload = h.named('createTask')[0].args[0];
  assert.equal(payload.Subject, 'LinkedIn Sent act_x6esGLhoPa2SMHCZ7');
  assert.equal(payload.Status, 'Completed');
  assert.deepEqual(payload.Who_Id, { id: EXISTING_CONTACT.id });
  assert.deepEqual(payload.What_Id, { id: '991103000002872067' });
  assert.equal(payload.$se_module, 'Accounts');
  assert.ok(payload.Description.includes('sent_at: 2026-08-30T14:03:11+00:00'),
    'the ORIGINAL send time, not the run time');
});

test('the window is the lookback, not "since last time"', async () => {
  const h = harness(Object.assign({ fetchActivities: pages([]) }, NO_TEAM));

  const r = await sync.runSync({
    now: new Date('2026-08-31T04:30:00Z'),
    env: Object.assign({}, ARMED, { LEMLIST_LOOKBACK_DAYS: '7' }),
    deps: h.deps,
  });

  assert.equal(r.window.minDate, '2026-08-24T04:30:00.000Z');
  assert.equal(r.window.maxDate, '2026-08-31T04:30:00.000Z');
  const arg = h.named('fetchActivities')[0].args[0];
  assert.equal(arg.type, 'linkedinSent');
  assert.equal(arg.minDate, '2026-08-24T04:30:00.000Z');
});

// ---------------------------------------------------------------------------
// Idempotency (acceptance J)
// ---------------------------------------------------------------------------

test('an already-imported activity creates nothing, however many times it is seen', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity(), activity(), activity()]),
    findTaskByActivityId: '991103000009000001',
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.alreadyImported, 3);
  assert.equal(r.tasksCreated, 0);
  assert.equal(h.countOf('createTask'), 0, 'not one write');
  // It short-circuits before any identity work at all.
  assert.equal(h.countOf('findContactsByLinkedinFragment'), 0);
});

test('a failed Subject check skips rather than risking a duplicate', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: () => { const e = new Error('x'); e.code = 'zoho_http_503'; throw e; },
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.tasksCreated, 0);
  assert.equal(h.countOf('createTask'), 0);
  assert.equal(r.apiFailures.zoho_http_503, 1);
  assert.equal(r.skipped.subject_check_failed, undefined);
});

test('a DUPLICATE_DATA on the Task is adopted, because it is the same activity', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: { messages: [], pagination: null },
    createTask: { ok: false, duplicateId: '991103000009000009', code: 'DUPLICATE_DATA' },
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.alreadyImported, 1);
  assert.equal(r.tasksCreated, 0);
});

// ---------------------------------------------------------------------------
// Type filtering
// ---------------------------------------------------------------------------

test('only the configured activity type is imported', async () => {
  const others = [
    'linkedinVisitDone', 'linkedinInviteDone', 'linkedinInviteAccepted',
    'linkedinInviteFailed', 'linkedinSendFailed', 'linkedinOpened', 'linkedinReplied',
    'linkedinVoiceNoteDone', 'linkedinFollowDone', 'emailsSent', 'manualDone',
  ].map((type, i) => activity({ type, _id: `act_other${String(i).padStart(3, '0')}` }));

  const h = harness(Object.assign({
    fetchActivities: pages([...others, activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: { messages: [], pagination: null },
    createTask: { ok: true, id: 't1' },
    readBack: null,
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.activitiesFetched, others.length + 1);
  assert.equal(r.typeMismatchDropped, others.length);
  assert.equal(r.tasksCreated, 1, 'exactly the one linkedinSent');
});

test('a malformed activity id is counted, never queried', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity({ _id: "act_x' OR '1'='1" }), activity({ _id: 'lea_abcdef' })]),
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.malformed, 2);
  assert.equal(h.countOf('findTaskByActivityId'), 0);
});

// ---------------------------------------------------------------------------
// One inbox fetch per contact (acceptance K)
// ---------------------------------------------------------------------------

test('three activities for one Contact make three Tasks and ONE inbox fetch', async () => {
  const acts = ['act_aaaaaa1', 'act_aaaaaa2', 'act_aaaaaa3'].map((id) => activity({ _id: id }));

  const h = harness(Object.assign({
    fetchActivities: pages(acts),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: {
      messages: acts.map((a) => ({ _id: a._id, message: `<p>Body for ${a._id}</p>` })),
      pagination: { totalItems: 3 },
    },
    createTask: (p) => ({ ok: true, id: `task-${p.Subject.slice(-7)}` }),
    readBack: null,
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.tasksCreated, 3);
  assert.equal(h.countOf('getInboxMessages'), 1, 'the inbox is cached per Lemlist contact');
  assert.equal(r.contactsCreated, 0);
  assert.equal(r.accountsCreated, 0);
  assert.equal(r.bodiesResolved, 3);

  const bodies = h.named('createTask').map((c) => c.args[0].Description);
  assert.ok(bodies[0].includes('Body for act_aaaaaa1'));
  assert.ok(bodies[2].includes('Body for act_aaaaaa3'));
});

// ---------------------------------------------------------------------------
// Body unavailable (acceptance M)
// ---------------------------------------------------------------------------

test('no retrievable body still creates the Task, with the absence stated', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    // The inbox holds other messages but not this activity id.
    getInboxMessages: { messages: [{ _id: 'act_unrelated1', message: 'x' }], pagination: null },
    createTask: { ok: true, id: 't1' },
    readBack: null,
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.tasksCreated, 1);
  assert.equal(r.bodiesUnavailable, 1);
  const d = h.named('createTask')[0].args[0].Description;
  assert.ok(d.includes('Message body not available from the Lemlist API for this activity.'));
  // The metadata is still complete.
  assert.ok(d.includes('act_x6esGLhoPa2SMHCZ7'));
  assert.ok(d.includes('campaign: Q3 UK Operators'));
});

test('an inbox failure does not block the Task', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: () => { const e = new Error('x'); e.code = 'lemlist_http_500'; throw e; },
    createTask: { ok: true, id: 't1' },
    readBack: null,
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.tasksCreated, 1);
  assert.equal(r.apiFailures.lemlist_http_500, 1);
});

// ---------------------------------------------------------------------------
// Identity conflict (acceptance D)
// ---------------------------------------------------------------------------

test('an identity conflict writes NOTHING and logs both candidate ids', async () => {
  const other = Object.assign({}, EXISTING_CONTACT, { id: '991103000002869284' });

  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [other],
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.tasksCreated, 0);
  assert.equal(h.countOf('createTask'), 0);
  assert.equal(h.countOf('createContactSuppressed'), 0);
  assert.equal(h.countOf('createAccountSuppressed'), 0);
  assert.equal(r.skipped.contact_linkedin_and_email_disagree, 1);

  const conflict = h.logs.find((l) => l.evt === 'lemlist.identity_conflict');
  assert.ok(conflict);
  assert.equal(conflict.scope, 'contact');
  assert.equal(conflict.candidateIds.length, 2);
});

// ---------------------------------------------------------------------------
// Creation (acceptance E, G) and its refusals (I)
// ---------------------------------------------------------------------------

test('a new Contact under an existing Account creates the Contact only', async () => {
  const existingAccount = {
    id: '991103000002872067', Account_Name: 'Flutter UK & Ireland',
    Account_Key: 'flutteruki.com', Website: 'flutteruki.com', Company_Linkedin: null,
  };

  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [],
    findContactsByEmail: [],
    findAccountsByWebsite: [existingAccount],
    findAccountsByKey: [existingAccount],
    createContactSuppressed: { ok: true, id: '991103000002999001' },
    getInboxMessages: { messages: [], pagination: null },
    createTask: { ok: true, id: 't1' },
    readBack: null,
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.accountsMatchedByDomain, 1);
  assert.equal(r.contactsCreated, 1);
  assert.equal(r.accountsCreated, 0, 'the existing Account must be reused');
  assert.equal(r.tasksCreated, 1);

  const record = h.named('createContactSuppressed')[0].args[0];
  assert.equal(record.Last_Name, 'Gavaz');
  assert.equal(record.First_Name, 'Tuf');
  assert.deepEqual(record.Account_Name, { id: existingAccount.id });
  assert.equal(record.Personal_Linkedin, 'https://www.linkedin.com/in/tuf-gavaz');
  // No commercial lifecycle state is asserted.
  for (const k of ['Stage', 'State', 'Status', 'Contact_Role1', 'Lead_Source', 'Marketing_Consent', 'Title']) {
    assert.ok(!(k in record), `must not write ${k} on a cold outbound Contact`);
  }
});

test('a genuinely new company creates one Account then one Contact, and NO Deal', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [],
    findContactsByEmail: [],
    findAccountsByWebsite: [],
    findAccountsByKey: [],
    findAccountsByName: [],
    createAccountSuppressed: { ok: true, id: 'acc-new' },
    createContactSuppressed: { ok: true, id: 'con-new' },
    getInboxMessages: { messages: [], pagination: null },
    createTask: { ok: true, id: 't1' },
    readBack: null,
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.accountsCreated, 1);
  assert.equal(r.contactsCreated, 1);
  assert.equal(r.tasksCreated, 1);

  const acc = h.named('createAccountSuppressed')[0].args[0];
  assert.equal(acc.Account_Name, 'Flutter UK & Ireland');
  assert.equal(acc.Website, 'flutteruki.com', 'the bare canonical domain');
  assert.equal(acc.Account_Key, 'flutteruki.com', 'the key Deluge itself would derive');
  for (const k of ['Industry', 'Company_Tier', 'Account_Status', 'Jurnii_Org_ID', 'Automation_Suppressed']) {
    assert.ok(!(k in acc), `must not write ${k}`);
  }

  // The Account is created BEFORE the Contact, so no Account-less Contact can
  // be left behind.
  const order = h.calls.map((c) => c.name)
    .filter((n) => n === 'createAccountSuppressed' || n === 'createContactSuppressed');
  assert.deepEqual(order, ['createAccountSuppressed', 'createContactSuppressed']);
});

test('with no domain, Account_Key is the name form and Website is OMITTED', async () => {
  const noDomain = activity();
  delete noDomain.lead.variables.companyDomain;
  noDomain.lead.variables.companyLinkedinUrl = 'https://www.linkedin.com/company/flutter-uki/';

  const h = harness(Object.assign({
    fetchActivities: pages([noDomain]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [],
    findContactsByEmail: [],
    findAccountsByCompanyLinkedinFragment: [],
    findAccountsByName: [],
    findAccountsByKey: [],
    createAccountSuppressed: { ok: true, id: 'acc-new' },
    createContactSuppressed: { ok: true, id: 'con-new' },
    getInboxMessages: { messages: [], pagination: null },
    createTask: { ok: true, id: 't1' },
    readBack: null,
  }, NO_TEAM));

  await sync.runSync({ env: ARMED, deps: h.deps });

  const acc = h.named('createAccountSuppressed')[0].args[0];
  assert.ok(!('Website' in acc), 'a name-derived value must never go into Website');
  assert.equal(acc.Account_Key, 'flutter uk & ireland');
  assert.equal(acc.Company_Linkedin, 'https://www.linkedin.com/company/flutter-uki');
});

test('the name veto refuses a create that would fork the Deluge resolver', async () => {
  const nameKeyed = {
    id: '991103000002869264', Account_Name: 'Flutter UK & Ireland',
    Account_Key: 'flutter uk & ireland', Website: null, Company_Linkedin: null,
  };

  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [],
    findContactsByEmail: [],
    findAccountsByWebsite: [],
    // The domain rung misses, but the company exists under a NAME key.
    findAccountsByKey: (key) => (key === 'flutter uk & ireland' ? [nameKeyed] : []),
    findAccountsByName: [nameKeyed],
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.accountsCreated, 0);
  assert.equal(r.contactsCreated, 0);
  assert.equal(r.tasksCreated, 0);
  assert.equal(h.countOf('createAccountSuppressed'), 0);
  assert.equal(r.skipped.account_create_would_fork, 1);

  const refusal = h.logs.find((l) => l.evt === 'lemlist.account_create_refused');
  assert.ok(refusal);
  assert.deepEqual(refusal.candidateIds, [nameKeyed.id]);
});

test('an Account DUPLICATE_DATA is terminal, never adopted', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [],
    findContactsByEmail: [],
    findAccountsByWebsite: [],
    findAccountsByKey: [],
    findAccountsByName: [],
    createAccountSuppressed: { ok: false, duplicateId: 'acc-existing', code: 'DUPLICATE_DATA' },
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.skipped.account_name_collision, 1);
  assert.equal(r.contactsCreated, 0, 'adopting the duplicate would be identity-by-name');
  assert.equal(h.countOf('createContactSuppressed'), 0);
});

test('no company identity at all refuses the create', async () => {
  const bare = activity();
  delete bare.lead.variables.companyDomain;

  const h = harness(Object.assign({
    fetchActivities: pages([bare]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [],
    findContactsByEmail: [],
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.skipped.insufficient_account_identity, 1);
  assert.equal(h.countOf('createAccountSuppressed'), 0);
});

test('a missing Last_Name skips, and no surname is ever derived', async () => {
  const noSurname = activity();
  delete noSurname.lead.variables.lastName;
  noSurname.lead.fullName = 'Tuf Gavaz';   // a tempting derivation source

  const h = harness(Object.assign({
    fetchActivities: pages([noSurname]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [],
    findContactsByEmail: [],
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.skipped.missing_last_name, 1);
  assert.equal(r.contactsCreated, 0);
  assert.equal(h.countOf('createContactSuppressed'), 0);
  assert.equal(h.countOf('createAccountSuppressed'), 0, 'nothing is created before the precondition');
});

// ---------------------------------------------------------------------------
// Gates
// ---------------------------------------------------------------------------

test('disabled means not one Lemlist call', async () => {
  const h = harness({});
  const r = await sync.runSync({ env: {}, deps: h.deps });
  assert.equal(r.outcome, 'disabled');
  assert.deepEqual(h.calls, []);
});

test('dry run resolves everything and writes nothing', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: { messages: [], pagination: null },
  }, NO_TEAM));

  const r = await sync.runSync({
    env: Object.assign({}, ARMED, { LEMLIST_ZOHO_WRITE_ENABLED: 'false' }),
    deps: h.deps,
  });

  assert.equal(r.dryRun, true);
  assert.equal(r.dryRunReason, 'writes_disabled');
  assert.equal(r.contactsMatchedByLinkedin, 1, 'resolution still ran');
  assert.equal(h.countOf('createTask'), 0);
});

test('?dryRun=1 forces a dry run even when writes are armed', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: { messages: [], pagination: null },
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, query: { dryRun: '1' }, deps: h.deps });

  assert.equal(r.dryRun, true);
  assert.equal(r.dryRunReason, 'query');
  assert.equal(h.countOf('createTask'), 0);
});

test('creation can be disabled independently of Task writes', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [],
    findContactsByEmail: [],
  }, NO_TEAM));

  const r = await sync.runSync({
    env: Object.assign({}, ARMED, { LEMLIST_ALLOW_RECORD_CREATION: 'false' }),
    deps: h.deps,
  });

  assert.equal(r.createEnabled, false);
  assert.equal(r.skipped.creation_disabled, 1);
  assert.equal(h.countOf('createAccountSuppressed'), 0);
  assert.equal(h.countOf('createContactSuppressed'), 0);
});

test('the per-run Task ceiling bounds the blast radius', async () => {
  const acts = Array.from({ length: 6 }, (_, i) => activity({ _id: `act_cap${String(i).padStart(4, '0')}` }));

  const h = harness(Object.assign({
    fetchActivities: pages(acts),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: { messages: [], pagination: null },
    createTask: (p) => ({ ok: true, id: `t-${p.Subject.slice(-4)}` }),
    readBack: null,
  }, NO_TEAM));

  const r = await sync.runSync({
    env: Object.assign({}, ARMED, { LEMLIST_MAX_TASKS_PER_RUN: '2' }),
    deps: h.deps,
  });

  assert.equal(r.tasksCreated, 2);
  assert.equal(r.skipped.max_tasks_per_run, 4);
});

// ---------------------------------------------------------------------------
// Failure policy: skip and let tomorrow retry
// ---------------------------------------------------------------------------

test('one activity failing does not stop the run', async () => {
  const good = activity({ _id: 'act_good001', contactId: 'ctc_good' });
  const bad = activity({ _id: 'act_bad0001', contactId: 'ctc_bad' });

  const h = harness(Object.assign({
    fetchActivities: pages([bad, good]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: { messages: [], pagination: null },
    createTask: (p) => {
      if (p.Subject.includes('act_bad0001')) {
        const e = new Error('x'); e.code = 'zoho_http_500'; throw e;
      }
      return { ok: true, id: 't-good' };
    },
    readBack: null,
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.tasksCreated, 1, 'the good activity still landed');
  assert.equal(r.apiFailures.zoho_http_500, 1);
});

test('a fetch failure ends the run cleanly rather than throwing', async () => {
  const h = harness({
    fetchActivities: () => { const e = new Error('x'); e.code = 'lemlist_http_401'; throw e; },
  });

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.outcome, 'fetch_failed');
  assert.equal(r.apiFailures.lemlist_http_401, 1);
  assert.equal(r.tasksCreated, 0);
});

test('a body carrying a Deluge control marker refuses the payload, not the run', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: {
      messages: [{ _id: 'act_x6esGLhoPa2SMHCZ7', message: '<p>ScheduledSend| hello</p>' }],
      pagination: null,
    },
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.skipped.payload_refused, 1);
  assert.equal(h.countOf('createTask'), 0);
  assert.equal(r.outcome, 'complete');
});

// ---------------------------------------------------------------------------
// Owner
// ---------------------------------------------------------------------------

test('a mapped sender becomes the Task Owner', async () => {
  const h = harness({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: { messages: [], pagination: null },
    getTeamUsers: [{ userId: 'usr_EvXz6JqPSJJL9lHkp', email: 'Fraser@Jurnii.io', name: 'Fraser' }],
    getActiveUsers: [{ id: '991103000002846001', email: 'fraser@jurnii.io' }],
    createTask: { ok: true, id: 't1' },
    readBack: null,
  });

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.sendersUnmapped, 0);
  assert.deepEqual(h.named('createTask')[0].args[0].Owner, { id: '991103000002846001' });
  // One call each, cached for the run.
  assert.equal(h.countOf('getTeamUsers'), 1);
  assert.equal(h.countOf('getActiveUsers'), 1);
});

test('an unmapped sender falls back to the configured owner and is counted', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: { messages: [], pagination: null },
    createTask: { ok: true, id: 't1' },
    readBack: null,
  }, NO_TEAM));

  const r = await sync.runSync({ env: ARMED, deps: h.deps });

  assert.equal(r.sendersUnmapped, 1);
  assert.deepEqual(h.named('createTask')[0].args[0].Owner, { id: ARMED.LEMLIST_DEFAULT_OWNER_ID });
});

test('with no sender map and no default, Owner is omitted rather than guessed', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: { messages: [], pagination: null },
    createTask: { ok: true, id: 't1' },
    readBack: null,
  }, NO_TEAM));

  const env = Object.assign({}, ARMED);
  delete env.LEMLIST_DEFAULT_OWNER_ID;

  await sync.runSync({ env, deps: h.deps });

  assert.ok(!('Owner' in h.named('createTask')[0].args[0]));
});

// ---------------------------------------------------------------------------
// Log hygiene
// ---------------------------------------------------------------------------

test('no log line carries an email, a URL, a name or a message body', async () => {
  const h = harness({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [],
    findContactsByEmail: [],
    findAccountsByWebsite: [],
    findAccountsByKey: [],
    findAccountsByName: [],
    getTeamUsers: [{ userId: 'usr_EvXz6JqPSJJL9lHkp', email: 'fraser@jurnii.io' }],
    getActiveUsers: [],
    createAccountSuppressed: { ok: true, id: 'acc-new' },
    createContactSuppressed: { ok: true, id: 'con-new' },
    getInboxMessages: {
      messages: [{ _id: 'act_x6esGLhoPa2SMHCZ7', message: '<p>Secret body text</p>' }],
      pagination: null,
    },
    createTask: { ok: true, id: 't1' },
    readBack: null,
  });

  await sync.runSync({ env: ARMED, deps: h.deps });

  assert.ok(h.logs.length > 0, 'the run must actually log something');
  for (const line of h.logs) {
    const text = JSON.stringify(line);
    assert.ok(!text.includes('@'), `log line carries an email: ${text}`);
    assert.ok(!/https?:\/\//.test(text), `log line carries a URL: ${text}`);
    assert.ok(!text.includes('linkedin.com'), `log line carries a LinkedIn URL: ${text}`);
    assert.ok(!text.includes('Secret body text'), `log line carries a message body: ${text}`);
    assert.ok(!text.includes('Gavaz'), `log line carries a person name: ${text}`);
    assert.ok(!text.includes('Flutter'), `log line carries a company name: ${text}`);
  }
});

test('the read-back reports a silently discarded field', async () => {
  const h = harness(Object.assign({
    fetchActivities: pages([activity()]),
    findTaskByActivityId: null,
    findContactsByLinkedinFragment: [EXISTING_CONTACT],
    findContactsByEmail: [EXISTING_CONTACT],
    getInboxMessages: { messages: [], pagination: null },
    createTask: { ok: true, id: 't1' },
    // Zoho returns SUCCESS but Task_Sequence_Managed never landed.
    readBack: (m, id) => ({ id, Subject: 'LinkedIn Sent act_x6esGLhoPa2SMHCZ7', Status: 'Completed', Who_Id: { id: 'x' }, Owner: { id: 'y' }, What_Id: { id: 'z' } }),
  }, NO_TEAM));

  await sync.runSync({ env: ARMED, deps: h.deps });

  const discarded = h.logs.filter((l) => l.evt === 'lemlist.field_silently_discarded');
  assert.ok(discarded.some((l) => l.apiName === 'Task_Sequence_Managed'),
    'SUCCESS proves nothing; a missing key must be reported');
});
