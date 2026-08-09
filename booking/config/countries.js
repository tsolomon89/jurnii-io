/**
 * The single source of truth for countries and phone normalisation (spec §6).
 *
 * UMD dual export: `module.exports` for the CommonJS serverless handlers, and
 * `window.JurniiBookingCountries` for the plain `<script src>` browser form.
 * There is no bundler in this project, so a UMD wrapper is the only zero-build
 * way for both sides to share one file — and sharing it is the point: the server
 * re-derives `phone_e164` and must reach the same answer the client showed.
 *
 * `name` values are the exact Zoho `Country` picklist strings and must not be
 * edited: they are what `products.js` validates against, so changing one here
 * would silently start failing CRM writes.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JurniiBookingCountries = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * `trunkPrefix` is the digit a domestic caller dials before the national number
   * and which must be stripped before an E.164 concatenation. This is the fix for
   * the live bug where `+44` and a domestic `07123 456789` were concatenated into
   * `+4407123 456789`.
   *
   * A `trunkPrefix` of '0' is set for every country in this list except the US,
   * per the plan. For the few where domestic numbers never begin with 0 (Malta,
   * Gibraltar, Costa Rica, Curaçao, Spain) the strip is simply inert — it can
   * only fire on input that would have been invalid anyway.
   */
  var COUNTRIES = [
    { iso2: 'GB', name: 'United Kingdom', dialCode: '+44',  trunkPrefix: '0', minDigits: 9,  maxDigits: 10 },
    { iso2: 'US', name: 'United States',  dialCode: '+1',   trunkPrefix: null, minDigits: 10, maxDigits: 10 },
    { iso2: 'MT', name: 'Malta',          dialCode: '+356', trunkPrefix: '0', minDigits: 8,  maxDigits: 8  },
    { iso2: 'GI', name: 'Gibraltar',      dialCode: '+350', trunkPrefix: '0', minDigits: 8,  maxDigits: 8  },
    { iso2: 'SE', name: 'Sweden',         dialCode: '+46',  trunkPrefix: '0', minDigits: 7,  maxDigits: 13 },
    { iso2: 'DE', name: 'Germany',        dialCode: '+49',  trunkPrefix: '0', minDigits: 6,  maxDigits: 13 },
    { iso2: 'ES', name: 'Spain',          dialCode: '+34',  trunkPrefix: '0', minDigits: 9,  maxDigits: 9  },
    { iso2: 'IE', name: 'Ireland',        dialCode: '+353', trunkPrefix: '0', minDigits: 7,  maxDigits: 9  },
    { iso2: 'AU', name: 'Australia',      dialCode: '+61',  trunkPrefix: '0', minDigits: 9,  maxDigits: 9  },
    { iso2: 'CW', name: 'Curaçao',        dialCode: '+599', trunkPrefix: '0', minDigits: 7,  maxDigits: 8  },
    { iso2: 'CR', name: 'Costa Rica',     dialCode: '+506', trunkPrefix: '0', minDigits: 8,  maxDigits: 8  }
  ];

  var BY_ISO2 = {};
  var NAMES = [];
  for (var i = 0; i < COUNTRIES.length; i++) {
    BY_ISO2[COUNTRIES[i].iso2] = COUNTRIES[i];
    NAMES.push(COUNTRIES[i].name);
  }

  function byIso2(iso2) {
    if (!iso2) return null;
    return BY_ISO2[String(iso2).trim().toUpperCase()] || null;
  }

  /** The Zoho picklist name for an ISO2 code, or null. Never infers. */
  function nameForIso2(iso2) {
    var c = byIso2(iso2);
    return c ? c.name : null;
  }

  function digitsOnly(value) {
    return String(value === undefined || value === null ? '' : value).replace(/\D+/g, '');
  }

  /**
   * Normalise a phone number to E.164.
   *
   * Returns `{ ok: true, dialCode, nationalNumber, e164 }` or
   * `{ ok: false, reason }` with reason one of `country_unknown |
   * country_dial_mismatch | phone_missing | phone_too_short | phone_too_long`.
   *
   * The country and the dial code are cross-checked rather than trusted: spec §6
   * forbids inferring the country from the dial code (the live form does exactly
   * that, mapping a dial code back to a country name), and `+1` alone cannot
   * distinguish the US from Canada. So the ISO2 code is authoritative and a
   * supplied `dialCode` may only agree or be rejected.
   */
  function normalizePhone(input) {
    var opts = input || {};
    var country = byIso2(opts.iso2);
    if (!country) return { ok: false, reason: 'country_unknown' };

    if (opts.dialCode) {
      var supplied = String(opts.dialCode).trim();
      if (supplied.charAt(0) !== '+') supplied = '+' + digitsOnly(supplied);
      if (supplied !== country.dialCode) return { ok: false, reason: 'country_dial_mismatch' };
    }

    var national = digitsOnly(opts.nationalNumber);
    if (!national) return { ok: false, reason: 'phone_missing' };

    var ccDigits = country.dialCode.slice(1);

    // The international dial-out prefix, e.g. a pasted "00447123456789". Stripped
    // FIRST, and only when the country code immediately following it is the SELECTED
    // country's — so it can never fire on a domestic number that merely happens to
    // start with two zeros. Without this the trunk strip below removes one zero and
    // the remainder ("0447123456789") is neither domestic nor international, so a
    // perfectly interpretable paste was rejected as too long.
    if (national.indexOf('00' + ccDigits) === 0) {
      national = national.slice(2 + ccDigits.length);
    }

    // Strip the domestic trunk prefix before concatenating. Without this, a UK
    // visitor typing "07123 456789" yields "+4407123456789".
    if (country.trunkPrefix && national.indexOf(country.trunkPrefix) === 0) {
      national = national.slice(country.trunkPrefix.length);
    }
    // A visitor may paste the full international form into the national field.
    if (national.length > country.maxDigits && national.indexOf(ccDigits) === 0) {
      national = national.slice(ccDigits.length);
      if (country.trunkPrefix && national.indexOf(country.trunkPrefix) === 0) {
        national = national.slice(country.trunkPrefix.length);
      }
    }

    if (!national) return { ok: false, reason: 'phone_missing' };
    if (national.length < country.minDigits) return { ok: false, reason: 'phone_too_short' };
    if (national.length > country.maxDigits) return { ok: false, reason: 'phone_too_long' };

    return {
      ok: true,
      dialCode: country.dialCode,
      nationalNumber: national,
      e164: country.dialCode + national
    };
  }

  return {
    COUNTRIES: COUNTRIES,
    COUNTRY_NAMES: NAMES,
    byIso2: byIso2,
    nameForIso2: nameForIso2,
    normalizePhone: normalizePhone,
    digitsOnly: digitsOnly
  };
});
