'use strict';

const crypto = require('crypto');

/**
 * The ONLY place a fingerprint is computed.
 *
 * Two callers need a keyed digest for different reasons, and Revision 15 shipped
 * a bug precisely because they were described in two places: §4.3 said the
 * calendar registry stored an HMAC while R2's pre-check was still written as a
 * plain `sha256`, which would have made every R2 fail closed and taken the
 * site's bookings down. There is now one implementation and no second path to
 * disagree with.
 *
 * `purpose` is a domain-separation label, versioned so a future algorithm change
 * is an explicit, greppable migration rather than a silent mismatch.
 */
function hmacFingerprint({ purpose, value, secret }) {
  if (!purpose) throw new ConfigError('fingerprint_purpose_missing');
  // Fail closed. Degrading to an unkeyed digest would make a calendar address
  // enumerable (it is drawn from a handful of candidates) and would silently
  // change every stored fingerprint.
  if (!secret) throw new ConfigError('fingerprint_secret_missing');
  return crypto.createHmac('sha256', secret)
    .update(`${purpose}|${value}`, 'utf8')
    .digest('hex');
}

/**
 * The `booking_calendars.canonical_fingerprint` of a calendar address.
 * Used by `db/register-calendar.js` and by R2's fail-closed pre-check, so the
 * two cannot disagree (test 119).
 */
function calendarFingerprint(calendarId) {
  return hmacFingerprint({
    purpose: 'calendar:v1',
    value: String(calendarId).trim().toLowerCase(), // the one canonicalisation, applied once
    secret: process.env.BOOKING_CALENDAR_HMAC_KEY,
  });
}

/**
 * Canonical JSON: sorted keys, `null` for absent, so two semantically identical
 * requests always serialise identically regardless of property order.
 */
function canonicalJson(obj) {
  const keys = Object.keys(obj).sort();
  const out = {};
  for (const k of keys) out[k] = obj[k] === undefined ? null : obj[k];
  return JSON.stringify(out);
}

/**
 * The effect-determining fields of an operator resolution request (§4.10).
 *
 * `operatorRef` is deliberately EXCLUDED: it is an audit label with no influence
 * on the effect, so re-issuing the same operation from a different console must
 * replay rather than be refused. Everything that changes what the transaction
 * does is included — including `expectedReviewVersion`, so a resolution computed
 * against a different review state is a different request.
 */
function resolutionFingerprintInput(req) {
  return canonicalJson({
    journeyId: req.journeyId,
    escalation: req.escalation,
    action: req.action,
    reasonCode: req.reasonCode,
    expectedAttemptVersion: req.expectedAttemptVersion,
    expectedIntentVersion: req.expectedIntentVersion,
    expectedReviewVersion: req.expectedReviewVersion,
    googleEventId: req.googleEventId,
    zohoContactId: req.zohoContactId,
    zohoAccountId: req.zohoAccountId,
    acknowledgeUnlabelledEvent: req.acknowledgeUnlabelledEvent === true,
  });
}

/**
 * Resolve a fingerprint key by its recorded id.
 *
 * Fingerprints are keyed with `RESOLUTION_FINGERPRINT_HMAC_KEY`, NOT with
 * `BOOKING_ADMIN_SECRET`. Revision 15 used the admin bearer, which coupled two
 * unrelated lifecycles: rotating the bearer — routine, and the credential most
 * likely to be rotated in a hurry — would have changed every computed
 * fingerprint, so every historical `completed` row would compare as a mismatch
 * and replay would break exactly when someone was mid-incident (test 128).
 *
 * Each stored row records the `fingerprint_key_id` that signed it, and the
 * previous slot keeps one generation of history replayable across a rotation.
 */
function fingerprintKeyById(keyId) {
  const currentId = process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_ID;
  const previousId = process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_PREVIOUS_ID;
  if (keyId && currentId && keyId === currentId) return process.env.RESOLUTION_FINGERPRINT_HMAC_KEY;
  if (keyId && previousId && keyId === previousId) return process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_PREVIOUS;
  return null; // unknown key generation — the caller degrades to a clean refusal
}

/** The current signing key id, stamped onto every new reservation. */
function currentFingerprintKeyId() {
  const id = process.env.RESOLUTION_FINGERPRINT_HMAC_KEY_ID;
  if (!id) throw new ConfigError('resolution_fingerprint_key_id_missing');
  return id;
}

/** Compute a resolution request fingerprint under a specific key generation. */
function resolutionFingerprint(req, keyId) {
  const secret = fingerprintKeyById(keyId);
  if (!secret) throw new UnknownKeyError(keyId);
  return hmacFingerprint({ purpose: 'resolution:v1', value: resolutionFingerprintInput(req), secret });
}

class ConfigError extends Error {
  constructor(code) { super(code); this.code = code; this.name = 'ConfigError'; }
}
/** A stored row signed by a key generation this deployment no longer holds. */
class UnknownKeyError extends Error {
  constructor(keyId) {
    super('resolution_fingerprint_key_unknown');
    this.code = 'resolution_fingerprint_key_unknown';
    this.keyId = keyId;
    this.name = 'UnknownKeyError';
  }
}

module.exports = {
  hmacFingerprint,
  calendarFingerprint,
  canonicalJson,
  resolutionFingerprint,
  resolutionFingerprintInput,
  currentFingerprintKeyId,
  fingerprintKeyById,
  ConfigError,
  UnknownKeyError,
};
