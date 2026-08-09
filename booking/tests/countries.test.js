'use strict';

/**
 * The shared country + phone contract (spec §6).
 *
 * `booking/config/countries.js` is the ONE implementation: the browser normalises with
 * it before submitting, and `lib/validate.js` re-derives with the same function on the
 * server. If they ever disagreed, the visitor would be shown one number and the CRM
 * would receive another.
 *
 * Despite that, `normalizePhone` had no direct test — it was only ever exercised
 * transitively through jsdom and the DB-gated page-2 tests, neither of which runs
 * without extra setup. The trunk-prefix strip in particular is the fix for a bug that
 * SHIPPED (`+44` concatenated with a domestic `07123 456789` produced
 * `+4407123456789`), so it is pinned here explicitly.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const C = require('../config/countries');
const V = require('../lib/validate');
const PICKLISTS = require('../config/zoho-picklists');

const e164 = (iso2, nationalNumber, dialCode) =>
  C.normalizePhone({ iso2, nationalNumber, dialCode });

// ---------------------------------------------------------------------------
// The required regression matrix
// ---------------------------------------------------------------------------

test('UK: a domestic 07123 456789 becomes +447123456789', () => {
  // THE SHIPPED BUG. Without the trunk strip this concatenated to +4407123456789.
  const r = e164('GB', '07123 456789');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.e164, '+447123456789');
  assert.strictEqual(r.nationalNumber, '7123456789');
  assert.strictEqual(r.dialCode, '+44');
});

test('UK: an international +44 7123 456789 becomes +447123456789', () => {
  assert.strictEqual(e164('GB', '+44 7123 456789').e164, '+447123456789');
});

test('UK: a pasted +4407123456789 (dial code AND trunk) still becomes +447123456789', () => {
  // Both strips have to fire, in order: country code first, then the trunk behind it.
  assert.strictEqual(e164('GB', '+4407123456789').e164, '+447123456789');
  assert.strictEqual(e164('GB', '00447123456789').e164, '+447123456789');
});

test('UK: assorted domestic punctuation all normalise to the same number', () => {
  for (const input of ['07123 456789', '07123-456789', '(07123) 456789', '07123456789']) {
    assert.strictEqual(e164('GB', input).e164, '+447123456789', `failed for ${input}`);
  }
});

test('US: a selected US country with a valid ten-digit number', () => {
  const r = e164('US', '(415) 555-0142');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.e164, '+14155550142');
  assert.strictEqual(r.dialCode, '+1');
});

test('US has no trunk prefix, so a leading 0 is a digit and not stripped', () => {
  // `trunkPrefix: null` is deliberate. Stripping here would silently mangle a number.
  assert.strictEqual(C.byIso2('US').trunkPrefix, null);
  const r = e164('US', '0415555014');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.e164, '+10415555014', 'the leading 0 is preserved');
});

test('a country/dial-code mismatch is rejected, never silently corrected', () => {
  const r = e164('GB', '7123456789', '+1');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'country_dial_mismatch');
});

test('an agreeing dial code is accepted, in either notation', () => {
  assert.strictEqual(e164('GB', '7123456789', '+44').ok, true);
  assert.strictEqual(e164('GB', '7123456789', '44').ok, true);
  assert.strictEqual(e164('GB', '7123456789', '0044').ok, false,
    '0044 is a dial-out prefix, not a country code');
});

test('an unknown country is rejected', () => {
  for (const iso2 of ['ZZ', 'XX', '', null, undefined, 'GBR']) {
    const r = e164(iso2, '7123456789');
    assert.strictEqual(r.ok, false, `${iso2} should be unknown`);
    assert.strictEqual(r.reason, 'country_unknown');
  }
});

test('a too-short number is rejected', () => {
  const r = e164('GB', '12345');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'phone_too_short');
});

test('a too-long number is rejected', () => {
  const r = e164('GB', '712345678901234');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'phone_too_long');
});

test('a missing or non-numeric number is rejected as missing, not as too short', () => {
  for (const input of ['', '   ', 'not a phone', null, undefined]) {
    const r = e164('GB', input);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.reason, 'phone_missing', `failed for ${JSON.stringify(input)}`);
  }
});

// ---------------------------------------------------------------------------
// Every supported country, at its own bounds
// ---------------------------------------------------------------------------

for (const country of C.COUNTRIES) {
  test(`${country.iso2} accepts its min and max digit lengths and rejects either side`, () => {
    const digit = country.trunkPrefix === '0' ? '7' : '4';   // never start with a trunk 0
    const nat = (n) => digit + '1'.repeat(n - 1);

    const min = e164(country.iso2, nat(country.minDigits));
    assert.strictEqual(min.ok, true, `${country.iso2} rejected its own minimum`);
    assert.strictEqual(min.e164, country.dialCode + nat(country.minDigits));

    const max = e164(country.iso2, nat(country.maxDigits));
    assert.strictEqual(max.ok, true, `${country.iso2} rejected its own maximum`);

    assert.strictEqual(e164(country.iso2, nat(country.minDigits - 1)).reason, 'phone_too_short');
    assert.strictEqual(e164(country.iso2, nat(country.maxDigits + 1)).reason, 'phone_too_long');
  });
}

// ---------------------------------------------------------------------------
// The country list itself
// ---------------------------------------------------------------------------

test('every supported country name is a live Zoho Country picklist value', () => {
  // This is what makes the list "intentional" rather than incidental: a name added here
  // that Zoho does not offer would fail the CRM write, and nothing else would catch it.
  const live = PICKLISTS.valuesFor('Leads', 'Country');
  assert.ok(live.length > 100, 'the Country picklist snapshot looks empty');
  for (const c of C.COUNTRIES) {
    assert.ok(live.includes(c.name),
      `"${c.name}" is not a Leads.Country option — the Lead write would be rejected`);
  }
});

test('the supported country list is exactly the intended eleven', () => {
  assert.deepStrictEqual(C.COUNTRIES.map((c) => c.iso2),
    ['GB', 'US', 'MT', 'GI', 'SE', 'DE', 'ES', 'IE', 'AU', 'CW', 'CR'],
    'adding a country is a deliberate act — check the name against the Zoho picklist');
});

test('ISO2 codes and dial codes are unique, and every entry is well formed', () => {
  const iso2s = new Set();
  for (const c of C.COUNTRIES) {
    assert.match(c.iso2, /^[A-Z]{2}$/);
    assert.ok(!iso2s.has(c.iso2), `duplicate ISO2 ${c.iso2}`);
    iso2s.add(c.iso2);
    assert.match(c.dialCode, /^\+[0-9]{1,4}$/);
    assert.ok(c.minDigits <= c.maxDigits, `${c.iso2} has min > max`);
  }
});

test('byIso2 is case- and whitespace-tolerant but never infers from a dial code', () => {
  assert.strictEqual(C.byIso2('gb').name, 'United Kingdom');
  assert.strictEqual(C.byIso2('  GB  ').name, 'United Kingdom');
  assert.strictEqual(C.byIso2('+44'), null, 'a dial code is not a country');
  assert.strictEqual(C.nameForIso2('GB'), 'United Kingdom');
  assert.strictEqual(C.nameForIso2('ZZ'), null);
});

test('+1 does not resolve to a country, because it cannot', () => {
  // The rule this encodes: US and Canada share +1, so a dial code can never determine
  // the country. The ISO2 the visitor selected is authoritative, always.
  const plusOne = C.COUNTRIES.filter((c) => c.dialCode === '+1');
  assert.strictEqual(plusOne.length, 1, 'only the selected ISO2 disambiguates +1');
  assert.strictEqual(C.byIso2('+1'), null);
});

// ---------------------------------------------------------------------------
// The server wrapper — what actually reaches Postgres and Zoho
// ---------------------------------------------------------------------------

test('validatePhone returns the exact Zoho country name alongside the E.164 number', () => {
  const r = V.validatePhone({ countryIso2: 'GB', nationalNumber: '07123 456789' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.phone_e164, '+447123456789');
  assert.strictEqual(r.country_iso2, 'GB');
  assert.strictEqual(r.country_name, 'United Kingdom');
  assert.strictEqual(r.phone_dial_code, '+44');
  assert.strictEqual(r.phone_national_number, '7123456789');
});

test('validatePhone never splits an E.164 number to guess the country', () => {
  // The country comes from the visitor's selection. Sending a +1 number while GB is
  // selected is a mismatch, not a reason to re-derive the country as US.
  const r = V.validatePhone({ countryIso2: 'GB', nationalNumber: '7123456789', dialCode: '+1' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'country_dial_mismatch');
});

test('validatePhone propagates every client-visible reason code unchanged', () => {
  // The form maps these onto authored copy, so a renamed reason would show the wrong
  // message — or the generic one — for a specific, fixable mistake.
  const cases = {
    country_unknown: { countryIso2: 'ZZ', nationalNumber: '7123456789' },
    country_dial_mismatch: { countryIso2: 'GB', nationalNumber: '7123456789', dialCode: '+353' },
    phone_missing: { countryIso2: 'GB', nationalNumber: '' },
    phone_too_short: { countryIso2: 'GB', nationalNumber: '712' },
    phone_too_long: { countryIso2: 'GB', nationalNumber: '71234567890123456' },
  };
  for (const [reason, input] of Object.entries(cases)) {
    assert.strictEqual(V.validatePhone(input).reason, reason);
  }
});

test('the national number is truncated before normalisation, not after', () => {
  // `LIMITS.phone_national_number` guards the column; truncating after E.164 assembly
  // would produce a valid-looking but wrong number.
  const long = '7'.repeat(V.LIMITS.phone_national_number + 20);
  const r = V.validatePhone({ countryIso2: 'GB', nationalNumber: long });
  assert.strictEqual(r.ok, false, 'an over-long number is refused, never quietly trimmed to fit');
  assert.strictEqual(r.reason, 'phone_too_long');
});

test('the client and the server derive the same E.164 from the same input', () => {
  // They call the same function, and this is the assertion that keeps it that way.
  for (const [iso2, input] of [['GB', '07123 456789'], ['US', '(415) 555-0142'],
    ['IE', '087 1234567'], ['DE', '030 12345678']]) {
    const client = C.normalizePhone({ iso2, nationalNumber: input });
    const server = V.validatePhone({ countryIso2: iso2, nationalNumber: input });
    assert.strictEqual(server.ok, client.ok, `${iso2} disagreed on validity`);
    assert.strictEqual(server.phone_e164, client.e164, `${iso2} derived different numbers`);
  }
});
