'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const I = require('../identity');

// ---------------------------------------------------------------------------
// Fixtures shaped like real COQL rows from this org.
// ---------------------------------------------------------------------------

const CONTACT_A = {
  id: '991103000002883343',
  Email: 'tuf.gavaz@flutteruki.com',
  Personal_Linkedin: 'https://www.linkedin.com/in/tuf-gavaz/',
  Account_Name: { name: 'Flutter UK & Ireland', id: '991103000002872067' },
  Last_Name: 'Gavaz',
};

const CONTACT_B = {
  id: '991103000002869284',
  Email: 'stephen.moorhead@flutteruki.com',
  Personal_Linkedin: 'https://www.linkedin.com/in/stephen-moorhead-872ab254/',
  Account_Name: { name: 'Flutter UK & Ireland', id: '991103000002872067' },
  Last_Name: 'Moorhead',
};

/** Query doubles. Any query not supplied throws, so an unexpected call is loud. */
function deps(overrides = {}) {
  const calls = [];
  const base = {
    findContactsByLinkedinFragment: null,
    findContactsByEmail: null,
    findAccountsByWebsite: null,
    findAccountsByKey: null,
    findAccountsByName: null,
    findAccountsByCompanyLinkedinFragment: null,
  };
  const out = { calls };
  for (const name of Object.keys(base)) {
    out[name] = async (arg) => {
      calls.push({ name, arg });
      if (!(name in overrides)) throw new Error(`unexpected query: ${name}`);
      const v = overrides[name];
      return typeof v === 'function' ? v(arg) : v;
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Contact: existing, by LinkedIn (acceptance A)
// ---------------------------------------------------------------------------

test('existing Contact matched by LinkedIn, with a different email', async () => {
  const d = deps({
    findContactsByLinkedinFragment: [CONTACT_A],
    // The Lemlist email is a personal one that matches nothing in the CRM.
    findContactsByEmail: [],
  });

  const r = await I.resolveContact({
    linkedinUrl: 'http://uk.linkedin.com/in/tuf-gavaz',   // non-canonical form
    email: 'tuf.gavaz@gmail.com',
  }, d);

  assert.equal(r.status, 'one');
  assert.equal(r.contactId, CONTACT_A.id);
  assert.equal(r.accountId, '991103000002872067', 'the existing Account is carried through');
  assert.equal(r.matchedOn, 'linkedin');
});

test('the LinkedIn probe is a candidate generator, not the decision', async () => {
  // A `like '%/in/john-smith%'` probe returns BOTH of these.
  const wanted = { id: '1', Personal_Linkedin: 'https://www.linkedin.com/in/john-smith/', Email: null };
  const other = { id: '2', Personal_Linkedin: 'https://www.linkedin.com/in/john-smith-4a92b117/', Email: null };

  const d = deps({ findContactsByLinkedinFragment: [wanted, other] });
  const r = await I.resolveContact({ linkedinUrl: 'https://www.linkedin.com/in/john-smith' }, d);

  assert.equal(r.status, 'one', 'the suffixed slug must be filtered out in Node');
  assert.equal(r.contactId, '1');
});

// ---------------------------------------------------------------------------
// Contact: email fallback (acceptance B)
// ---------------------------------------------------------------------------

test('email fallback matches when there is no usable LinkedIn URL', async () => {
  const d = deps({ findContactsByEmail: [CONTACT_A] });

  const r = await I.resolveContact({
    linkedinUrl: 'https://www.linkedin.com/company/flutter',   // not a personal slug
    email: 'TUF.GAVAZ@FlutterUKI.com',                          // normalised before use
  }, d);

  assert.equal(r.status, 'one');
  assert.equal(r.matchedOn, 'email');
  // The LinkedIn query must not even have been attempted: a company URL yields
  // no personal slug.
  assert.deepEqual(d.calls.map((c) => c.name), ['findContactsByEmail']);
});

test('the email rung matches the primary Email only', async () => {
  // A row whose Secondary_Email matches but whose primary Email does not. The
  // query is already exact, and the Node re-check means a future broadening of
  // the query still cannot make Secondary_Email into identity.
  const secondaryOnly = {
    id: '3',
    Email: 'someone.else@acme.com',
    Secondary_Email: 'target@acme.com',
    Personal_Linkedin: null,
  };
  const d = deps({ findContactsByEmail: [secondaryOnly] });

  const r = await I.resolveContact({ email: 'target@acme.com' }, d);

  assert.equal(r.status, 'none', 'a Secondary_Email hit is not the person');
});

// ---------------------------------------------------------------------------
// Contact: both identifiers agree (acceptance C)
// ---------------------------------------------------------------------------

test('LinkedIn and email agreeing on one Contact is not a conflict', async () => {
  const d = deps({
    findContactsByLinkedinFragment: [CONTACT_A],
    findContactsByEmail: [CONTACT_A],
  });

  const r = await I.resolveContact({
    linkedinUrl: 'https://www.linkedin.com/in/tuf-gavaz/',
    email: 'tuf.gavaz@flutteruki.com',
  }, d);

  assert.equal(r.status, 'one');
  assert.equal(r.contactId, CONTACT_A.id);
});

// ---------------------------------------------------------------------------
// Contact: identity conflict (acceptance D)
// ---------------------------------------------------------------------------

test('LinkedIn and email disagreeing is a conflict, with BOTH ids recorded', async () => {
  const d = deps({
    findContactsByLinkedinFragment: [CONTACT_A],
    findContactsByEmail: [CONTACT_B],
  });

  const r = await I.resolveContact({
    linkedinUrl: 'https://www.linkedin.com/in/tuf-gavaz/',
    email: 'stephen.moorhead@flutteruki.com',
  }, d);

  assert.equal(r.status, 'conflict');
  assert.equal(r.reason, 'linkedin_and_email_disagree');
  assert.deepEqual(r.candidateIds.sort(), [CONTACT_A.id, CONTACT_B.id].sort());
  assert.equal(r.contactId, undefined, 'a conflict must never yield a chosen Contact');
});

test('two Contacts sharing one canonical slug is a conflict, not a pick', async () => {
  const dupA = { id: '10', Personal_Linkedin: 'https://www.linkedin.com/in/tuf-gavaz/', Email: null };
  const dupB = { id: '11', Personal_Linkedin: 'http://linkedin.com/in/tuf-gavaz', Email: null };
  const d = deps({ findContactsByLinkedinFragment: [dupA, dupB] });

  const r = await I.resolveContact({ linkedinUrl: 'https://www.linkedin.com/in/tuf-gavaz/' }, d);

  assert.equal(r.status, 'conflict');
  assert.equal(r.reason, 'linkedin_matched_multiple');
  assert.deepEqual(r.candidateIds, ['10', '11']);
});

test('role mailboxes are never identity', async () => {
  const d = deps({});   // no query may be issued at all

  const r = await I.resolveContact({ email: 'info@acme.com' }, d);

  assert.equal(r.status, 'none');
  assert.equal(r.reason, 'role_mailbox_only_no_slug');
  assert.deepEqual(d.calls, [], 'a role mailbox must not even be queried');
});

test('a failed query propagates and is never read as an absence', async () => {
  const d = deps({
    findContactsByLinkedinFragment: () => { throw new Error('zoho_http_503'); },
  });

  await assert.rejects(
    () => I.resolveContact({ linkedinUrl: 'https://www.linkedin.com/in/tuf-gavaz/' }, d),
    /zoho_http_503/,
    'an API failure must not degrade into "this person does not exist"');
});

// ---------------------------------------------------------------------------
// Account (acceptance E, F, H, I)
// ---------------------------------------------------------------------------

const ACCOUNT_A = {
  id: '991103000002867363',
  Account_Name: 'Dafabet',
  Account_Key: 'sports.dafabet.com',
  Website: 'sports.dafabet.com',
  Company_Linkedin: 'https://www.linkedin.com/company/dafabet-web/',
};

const ACCOUNT_B = {
  id: '991103000002862287',
  Account_Name: 'Bet-at-home',
  Account_Key: 'bet-at-home.com',
  Website: 'bet-at-home.com',
  Company_Linkedin: 'https://www.linkedin.com/company/bet-at-home/',
};

test('Account matched by exact company domain', async () => {
  const d = deps({
    findAccountsByWebsite: [ACCOUNT_A],
    findAccountsByKey: [ACCOUNT_A],
  });

  const r = await I.resolveAccount({ companyDomain: 'https://sports.dafabet.com/' }, d);

  assert.equal(r.status, 'one');
  assert.equal(r.accountId, ACCOUNT_A.id);
  assert.equal(r.matchedOn, 'company_domain');
  assert.equal(r.domain, 'sports.dafabet.com');
});

test('Account matched by company LinkedIn when the domain misses', async () => {
  const d = deps({
    findAccountsByWebsite: [],
    findAccountsByKey: [],
    findAccountsByCompanyLinkedinFragment: [ACCOUNT_A],
  });

  const r = await I.resolveAccount({
    companyDomain: 'unknown-domain.example',
    companyLinkedinUrl: 'https://www.linkedin.com/company/dafabet-web',
  }, d);

  assert.equal(r.status, 'one');
  assert.equal(r.matchedOn, 'company_linkedin');
});

test('domain and company LinkedIn disagreeing is a conflict', async () => {
  const d = deps({
    findAccountsByWebsite: [ACCOUNT_A],
    findAccountsByKey: [],
    findAccountsByCompanyLinkedinFragment: [ACCOUNT_B],
  });

  const r = await I.resolveAccount({
    companyDomain: 'sports.dafabet.com',
    companyLinkedinUrl: 'https://www.linkedin.com/company/bet-at-home/',
  }, d);

  assert.equal(r.status, 'conflict');
  assert.equal(r.reason, 'domain_and_company_linkedin_disagree');
  assert.deepEqual(r.candidateIds.sort(), [ACCOUNT_A.id, ACCOUNT_B.id].sort());
});

test('no company LinkedIn in the payload means domain-only, with no extra hop', async () => {
  const d = deps({ findAccountsByWebsite: [], findAccountsByKey: [] });

  const r = await I.resolveAccount({ companyDomain: 'nowhere.example' }, d);

  assert.equal(r.status, 'none');
  // Only the two domain probes ran. No company-object traversal exists.
  assert.deepEqual(d.calls.map((c) => c.name).sort(),
    ['findAccountsByKey', 'findAccountsByWebsite']);
});

test('a subdomain does not resolve to the apex Account', async () => {
  // The live org holds `sports.dafabet.com` as a Website in its own right.
  // Matching is exact, so `dafabet.com` must not silently claim it.
  const d = deps({ findAccountsByWebsite: [], findAccountsByKey: [] });
  const r = await I.resolveAccount({ companyDomain: 'dafabet.com' }, d);
  assert.equal(r.status, 'none');
  assert.equal(r.domain, 'dafabet.com');
});

// ---------------------------------------------------------------------------
// The create veto — the one guard that survives (acceptance G, I)
// ---------------------------------------------------------------------------

test('an Account create is REFUSED when the company already exists under a name key', async () => {
  // The live shape this defends against: an Account created without a Website
  // carries a lowercased-name Account_Key.
  const nameKeyed = {
    id: '991103000002869264',
    Account_Name: 'Finnish Monopoly',
    Account_Key: 'finnish monopoly',
    Website: null,
    Company_Linkedin: null,
  };

  const d = deps({
    findAccountsByName: [nameKeyed],
    findAccountsByKey: [],
  });

  const v = await I.accountCreateAllowed({ companyName: 'Finnish Monopoly' }, d);

  assert.equal(v.allowed, false);
  assert.equal(v.reason, 'account_create_would_fork');
  assert.deepEqual(v.candidateIds, [nameKeyed.id]);
});

test('the veto also fires on the normalised name KEY, not just the name', async () => {
  const nameKeyed = { id: '77', Account_Name: 'Xcaliber Gaming Limited', Account_Key: 'xcaliber gaming limited' };
  const d = deps({ findAccountsByName: [], findAccountsByKey: [nameKeyed] });

  const v = await I.accountCreateAllowed({ companyName: 'Xcaliber Gaming Limited' }, d);

  assert.equal(v.allowed, false);
  assert.equal(v.reason, 'account_create_would_fork');
});

test('a create is allowed only when both name-shaped probes are empty', async () => {
  const d = deps({ findAccountsByName: [], findAccountsByKey: [] });

  const v = await I.accountCreateAllowed({ companyName: 'Acme (UK), Ltd' }, d);

  assert.equal(v.allowed, true);
  assert.equal(v.accountName, 'Acme UK Ltd', 'the Deluge character strip is applied');
  assert.equal(v.accountKey, 'acme uk ltd');
});

test('no company name at all refuses the create without querying', async () => {
  const d = deps({});
  const v = await I.accountCreateAllowed({ companyName: '  ' }, d);
  assert.equal(v.allowed, false);
  assert.equal(v.reason, 'missing_company_name');
  assert.deepEqual(d.calls, []);
});

test('a failed veto probe propagates rather than permitting the create', async () => {
  const d = deps({
    findAccountsByName: () => { throw new Error('zoho_http_500'); },
    findAccountsByKey: [],
  });

  await assert.rejects(() => I.accountCreateAllowed({ companyName: 'Acme' }, d), /zoho_http_500/);
});
