'use strict';

/**
 * The ONE failure responder for every booking endpoint.
 *
 * Replaces five near-duplicate `fail()` helpers that had drifted into two
 * different signatures (three handlers took four arguments, two took a fifth
 * `extra` object). Both shapes are preserved here so no caller changes meaning:
 * the response body is always `{ error, code }`, optionally merged with `extra`.
 *
 * `message` is visitor-facing text. It must never carry a third-party error
 * string: `error.message` from Google or Zoho can quote an email address, a
 * calendar id, or an internal payload fragment. Callers pass a fixed string or
 * omit it, in which case the machine `code` is echoed.
 */
function fail(res, status, code, message, extra) {
  return res.status(status).json(Object.assign({ error: message || code, code }, extra || {}));
}

/** `405` with the allowed methods, so a wrong verb is never a 500. */
function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return fail(res, 405, 'method_not_allowed', 'Method not allowed');
}

/**
 * Structured log line. Logs carry `journeyId`, status transitions, outcome kinds,
 * error codes and `resolutionId` only — never a name, email, phone, URL or raw
 * third-party response (§10, asserted by test 17).
 */
function log(fields) {
  process.stdout.write(JSON.stringify(fields) + '\n');
}

module.exports = { fail, methodNotAllowed, log };
