'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const I = require('../identity');

// ---------------------------------------------------------------------------
// canonicalPersonalSlug — golden vectors
//
// The first three are VERBATIM values read out of the live org, which is the
// whole reason canonicalisation exists. If these regress, identity resolution
// silently starts missing real Contacts.
// ---------------------------------------------------------------------------

test('canonicalPersonalSlug: real live values from the org', () => {
  assert.equal(
    I.canonicalPersonalSlug('http://www.linkedin.com/in/alexandrakorzhova'),
    'alexandrakorzhova');
  assert.equal(
    I.canonicalPersonalSlug('https://www.linkedin.com/in/claus-retschitzegger-1ab0221a/'),
    'claus-retschitzegger-1ab0221a');
  assert.equal(
    I.canonicalPersonalSlug('https://www.linkedin.com/in/alan-evans-250850309/?skipRedirect=true'),
    'alan-evans-250850309');
  assert.equal(
    I.canonicalPersonalSlug('https://www.linkedin.com/in/tuf-gavaz/'),
    'tuf-gavaz');
});

test('canonicalPersonalSlug: scheme, case, host and trailing-slash variance all collapse', () => {
  const expected = 'tuf-gavaz';
  for (const input of [
    'https://www.linkedin.com/in/tuf-gavaz',
    'https://www.linkedin.com/in/tuf-gavaz/',
    'http://linkedin.com/in/tuf-gavaz',
    'linkedin.com/in/tuf-gavaz',
    'www.linkedin.com/in/tuf-gavaz/',
    'LinkedIn.com/IN/Tuf-Gavaz/',
    'https://uk.linkedin.com/in/tuf-gavaz/',
    'https://www.linkedin.com/in/tuf-gavaz/detail/recent-activity/',
    'https://www.linkedin.com/in/tuf-gavaz?trk=nav',
    '  https://www.linkedin.com/in/tuf-gavaz/#foo  ',
  ]) {
    assert.equal(I.canonicalPersonalSlug(input), expected, `input: ${input}`);
  }
});

test('canonicalPersonalSlug: percent-encoded slugs decode once', () => {
  // A real shape in this org: an internationalised surname stored encoded.
  assert.equal(
    I.canonicalPersonalSlug('https://www.linkedin.com/in/richard-nebesk%c3%bd-8b545310b'),
    'richard-nebeský-8b545310b');
});

test('canonicalPersonalSlug: rejects everything that is not a personal profile', () => {
  for (const input of [
    'https://www.linkedin.com/company/dafabet-web/',
    'https://www.linkedin.com/school/some-university/',
    'https://www.linkedin.com/sales/lead/ABC,NAME,xyz',
    'https://www.linkedin.com/sales/people/ABC',
    'https://www.linkedin.com/feed/',
    'https://www.linkedin.com/in/',
    'https://example.com/in/tuf-gavaz',
    'https://notlinkedin.com/in/tuf-gavaz',
    'https://linkedin.com.evil.test/in/tuf-gavaz',
    'not a url at all',
    '',
    null,
    undefined,
  ]) {
    assert.equal(I.canonicalPersonalSlug(input), null, `input: ${String(input)}`);
  }
});

test('canonicalCompanySlug: accepts /company/, rejects /in/', () => {
  assert.equal(I.canonicalCompanySlug('https://www.linkedin.com/company/dafabet-web/'), 'dafabet-web');
  assert.equal(I.canonicalCompanySlug('https://www.linkedin.com/company/bet-at-home'), 'bet-at-home');
  assert.equal(I.canonicalCompanySlug('linkedin.com/company/Stanleybet-Romania/'), 'stanleybet-romania');
  assert.equal(I.canonicalCompanySlug('https://www.linkedin.com/in/tuf-gavaz/'), null);
  assert.equal(I.canonicalCompanySlug('https://example.com/company/acme'), null);
});

// ---------------------------------------------------------------------------
// The substring collision — the reason the decision is made in Node
// ---------------------------------------------------------------------------

test('a slug that is a substring of another is NOT identity', () => {
  const wanted = I.canonicalPersonalSlug('https://www.linkedin.com/in/john-smith/');
  const other = I.canonicalPersonalSlug('https://www.linkedin.com/in/john-smith-4a92b117/');

  assert.equal(wanted, 'john-smith');
  assert.equal(other, 'john-smith-4a92b117');
  // A COQL `like '%/in/john-smith%'` probe returns BOTH rows. The canonical
  // comparison is what rejects the wrong one.
  assert.notEqual(wanted, other);
  assert.ok(other.startsWith(wanted), 'the collision shape this guards against');
});

// ---------------------------------------------------------------------------
// Company domain
// ---------------------------------------------------------------------------

test('canonicalCompanyDomain: strips scheme, www, path, port and case', () => {
  assert.equal(I.canonicalCompanyDomain('https://www.example.com/'), 'example.com');
  assert.equal(I.canonicalCompanyDomain('https://www.example.com/path?q=1'), 'example.com');
  assert.equal(I.canonicalCompanyDomain('WWW.EXAMPLE.COM'), 'example.com');
  assert.equal(I.canonicalCompanyDomain('example.com'), 'example.com');
  assert.equal(I.canonicalCompanyDomain('example.com:8443'), 'example.com');
  assert.equal(I.canonicalCompanyDomain('example.com.'), 'example.com');
  // Subdomains are preserved: the live org stores `sports.dafabet.com` as a
  // Website in its own right, and collapsing it to the apex would match the
  // wrong Account.
  assert.equal(I.canonicalCompanyDomain('https://sports.dafabet.com'), 'sports.dafabet.com');
});

test('canonicalCompanyDomain: rejects non-domains', () => {
  for (const input of ['', null, undefined, 'localhost', 'not a domain', 'http://', '://x']) {
    assert.equal(I.canonicalCompanyDomain(input), null, `input: ${String(input)}`);
  }
});

test('normalisedCompanyName mirrors the Deluge key shape found live', () => {
  // These are real live Account_Key values for Website-less Accounts.
  assert.equal(I.normalisedCompanyName('Finnish Monopoly'), 'finnish monopoly');
  assert.equal(I.normalisedCompanyName('Ferrara Solutions'), 'ferrara solutions');
  assert.equal(I.normalisedCompanyName('Xcaliber Gaming Limited'), 'xcaliber gaming limited');
  // The Deluge strip set is exactly ( ) : ,
  assert.equal(I.normalisedCompanyName('Acme (UK), Ltd: Group'), 'acme uk ltd group');
  assert.equal(I.normalisedCompanyName('  Padded  '), 'padded');
  assert.equal(I.normalisedCompanyName('x'.repeat(300)).length, 200);
});

// ---------------------------------------------------------------------------
// Role mailboxes
// ---------------------------------------------------------------------------

test('isRoleMailbox: shared inboxes are never identity', () => {
  for (const email of [
    'info@acme.com', 'sales@acme.com', 'hello@acme.com', 'no-reply@acme.com',
    'NOREPLY@ACME.COM', 'careers@acme.com', 'accounts+tag@acme.com',
  ]) {
    assert.equal(I.isRoleMailbox(email), true, `should be a role mailbox: ${email}`);
  }
  for (const email of [
    'tuf.gavaz@flutteruki.com', 'j.smith@acme.com', 'informative@acme.com',
    'salesperson@acme.com', 'not-an-email', '', null,
  ]) {
    assert.equal(I.isRoleMailbox(email), false, `should NOT be a role mailbox: ${String(email)}`);
  }
});

// ---------------------------------------------------------------------------
// The lead.variables allow-list
// ---------------------------------------------------------------------------

test('leadVariable reads ONLY allow-listed keys, by exact name', () => {
  const bag = {
    firstName: ' Sam ',
    lastName: 'Taylor',
    companyName: 'lemlist',
    // Lemlist's own documented example: a person's name under a company-shaped
    // key. Reading this as a company name is exactly the mis-attribution the
    // allow-list prevents.
    'Company name': 'John Doe',
    companyname: 'wrong-case',
    Company_Domain: 'wrong.example',
    __proto__: { injected: true },
    constructor: 'nope',
  };

  assert.equal(I.leadVariable(bag, 'firstName'), 'Sam', 'trimmed');
  assert.equal(I.leadVariable(bag, 'companyName'), 'lemlist');
  // Everything not on the allow-list is invisible, whatever its shape.
  assert.equal(I.leadVariable(bag, 'Company name'), '');
  assert.equal(I.leadVariable(bag, 'companyname'), '');
  assert.equal(I.leadVariable(bag, 'Company_Domain'), '');
  assert.equal(I.leadVariable(bag, 'constructor'), '');
  assert.equal(I.leadVariable(bag, '__proto__'), '');
  assert.equal(I.leadVariable(null, 'firstName'), '');
  assert.equal(I.leadVariable({ firstName: 42 }, 'firstName'), '', 'non-strings are ignored');
});

test('lastNameFor never derives a surname', () => {
  assert.equal(I.lastNameFor({ variables: { lastName: 'Gavaz' } }), 'Gavaz');
  // No surname supplied: every tempting derivation source is present and all
  // must be ignored.
  assert.equal(I.lastNameFor({
    variables: {
      firstName: 'Tuf',
      email: 'tuf.gavaz@flutteruki.com',
      companyName: 'Flutter UK & Ireland',
    },
    fullName: 'Tuf Gavaz',
  }), null);
  assert.equal(I.lastNameFor({}), null);
  assert.equal(I.lastNameFor(null), null);
});

// ---------------------------------------------------------------------------
// COQL value guards — reject, never escape
// ---------------------------------------------------------------------------

test('coqlLiteral rejects injection-shaped and structural characters', () => {
  assert.equal(I.coqlLiteral('tuf.gavaz@flutteruki.com'), 'tuf.gavaz@flutteruki.com');
  assert.equal(I.coqlLiteral('LinkedIn Sent act_x6esGLhoPa2SMHCZ7'), 'LinkedIn Sent act_x6esGLhoPa2SMHCZ7');

  for (const bad of [
    "act_x' OR '1'='1",
    "o'brien@acme.com",
    'a\\b',
    'a\nb',
    'a\rb',
    'a\tb',
    'a(b)c',
    '',
    null,
    undefined,
    'x'.repeat(201),
  ]) {
    assert.throws(() => I.coqlLiteral(bad), /coql_value_/, `should reject: ${String(bad)}`);
  }
});

test('coqlLikeFragment additionally rejects LIKE wildcards', () => {
  assert.equal(I.coqlLikeFragment('tuf-gavaz'), 'tuf-gavaz');

  for (const bad of ['a%b', 'a_b', 'ab', 'Tuf-Gavaz', 'tuf gavaz', "a'b", '', null]) {
    assert.throws(() => I.coqlLikeFragment(bad), /coql_fragment_unsafe/, `should reject: ${String(bad)}`);
  }
});

test('slugProbeFragment yields an ASCII prefix for an internationalised slug', () => {
  assert.equal(I.slugProbeFragment('tuf-gavaz'), 'tuf-gavaz');
  assert.equal(I.slugProbeFragment('alan-evans-250850309'), 'alan-evans-250850309');
  // The probe narrows to the ASCII run; the canonical comparison in Node then
  // decides. A superset of candidates is correct; an unsafe query is not.
  assert.equal(I.slugProbeFragment('richard-nebeský-8b545310b'), 'richard-nebesk');
  // Too short to be a useful probe.
  assert.equal(I.slugProbeFragment('ab'), null);
  assert.equal(I.slugProbeFragment('ý-foo'), null);
  assert.equal(I.slugProbeFragment(null), null);

  // Whatever comes back must survive the query guard.
  assert.equal(I.coqlLikeFragment(I.slugProbeFragment('richard-nebeský-8b545310b')), 'richard-nebesk');
});

test('ACTIVITY_ID accepts real ids and rejects anything else', () => {
  for (const ok of ['act_x6esGLhoPa2SMHCZ7', 'act_PbKqTGpQqSlPcoOZ5', 'act_abcdef']) {
    assert.ok(I.ACTIVITY_ID.test(ok), `should accept: ${ok}`);
  }
  for (const bad of [
    'lea_x6esGLhoPa2SMHCZ7', 'act_', 'act_abc', 'act_abc-def', "act_x' OR '1'='1",
    'act_' + 'x'.repeat(65), ' act_abcdef', 'act_abcdef ',
  ]) {
    assert.ok(!I.ACTIVITY_ID.test(bad), `should reject: ${bad}`);
  }
});
