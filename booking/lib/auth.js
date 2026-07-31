'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * The ONE bearer + JWT assertion, replacing four copies across the handlers.
 *
 * Three distinct credential classes exist and none may substitute for another:
 *
 *   flow token   — short-lived (2h) registration credential, `purpose:'flow'`
 *   manage token — 30-day self-service credential, `purpose:'manage'`
 *   CRON_SECRET / BOOKING_ADMIN_SECRET — shared secrets, not JWTs
 *
 * `BOOKING_ADMIN_SECRET` can change a booking's truth, so it is deliberately
 * separate from `CRON_SECRET` and each is rejected by the other's endpoints
 * (test 107). A scheduler credential must not carry authority to resolve an
 * escalation.
 */

const FLOW_TOKEN_TTL = '2h';
const MANAGE_TOKEN_TTL = '30d';

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new ConfigError('jwt_secret_missing');
  return s;
}

/** Extract a `Bearer <token>` value, or null. */
function bearer(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!header || typeof header !== 'string') return null;
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Verify a JWT from the Authorization header.
 * Returns `{ ok: true, claims }` or `{ ok: false, status, code }`.
 */
function verifyToken(req) {
  const token = bearer(req);
  if (!token) return { ok: false, status: 401, code: 'auth_required' };
  try {
    return { ok: true, claims: jwt.verify(token, jwtSecret()) };
  } catch (err) {
    return { ok: false, status: 401, code: 'auth_invalid' };
  }
}

/**
 * A flow token that has cleared a given step, bound to a journey.
 *
 * Flow-token claims are deliberately reduced to `{journeyId, email, step,
 * purpose}` (§10): the old token also carried `recordType`, `recordId` and
 * `product`, which made CRM graph state part of a browser credential and meant a
 * Zoho hiccup could invalidate a visitor's session. Those now live in Postgres.
 */
function requireFlow(req, { journeyId, minStep = 1 } = {}) {
  const v = verifyToken(req);
  if (!v.ok) return v;
  const c = v.claims;
  if (c.purpose !== 'flow') return { ok: false, status: 403, code: 'forbidden' };
  if (!c.step || c.step < minStep) return { ok: false, status: 409, code: 'not_ready' };
  if (journeyId && c.journeyId !== journeyId) return { ok: false, status: 403, code: 'journey_mismatch' };
  return { ok: true, claims: c };
}

/** A manage token bound to a journey. */
function requireManage(req, { journeyId } = {}) {
  const v = verifyToken(req);
  if (!v.ok) return v;
  const c = v.claims;
  if (c.purpose !== 'manage') return { ok: false, status: 403, code: 'forbidden' };
  if (journeyId && c.journeyId !== journeyId) return { ok: false, status: 403, code: 'journey_mismatch' };
  return { ok: true, claims: c };
}

/**
 * `GET /bookings/{id}/status` accepts EITHER credential: the browser polls with
 * the flow token it already has during the `202 booking_pending` handoff, and the
 * manage page polls with its manage token after a reschedule (§10).
 */
function requireFlowOrManage(req, { journeyId, minStep = 2 } = {}) {
  const v = verifyToken(req);
  if (!v.ok) return v;
  const c = v.claims;
  if (c.purpose === 'flow') {
    if (!c.step || c.step < minStep) return { ok: false, status: 409, code: 'not_ready' };
  } else if (c.purpose !== 'manage') {
    return { ok: false, status: 403, code: 'forbidden' };
  }
  if (journeyId && c.journeyId !== journeyId) return { ok: false, status: 403, code: 'journey_mismatch' };
  return { ok: true, claims: c };
}

function signFlowToken({ journeyId, email, step }) {
  return jwt.sign({ purpose: 'flow', journeyId, email, step }, jwtSecret(), { expiresIn: FLOW_TOKEN_TTL });
}

/**
 * Mint a manage token. Called at step 2 of `POST /bookings` — before
 * `events.insert`, which the current code already does (finding #14) — so the
 * calendar invite always carries a working management URL even on the `202` path
 * where the browser never sees a `200`. Also re-minted fresh by the status
 * endpoint, but only once `bookingStatus === 'confirmed'`.
 */
function signManageToken({ journeyId, email }) {
  return jwt.sign({ purpose: 'manage', journeyId, email }, jwtSecret(), { expiresIn: MANAGE_TOKEN_TTL });
}

function publicBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
  const host = req && req.headers && req.headers.host;
  return host ? `https://${host}` : 'https://jurnii.io';
}

function manageUrlFor(req, { journeyId, email }) {
  const token = signManageToken({ journeyId, email });
  return `${publicBaseUrl(req)}/manage.html?token=${encodeURIComponent(token)}&id=${encodeURIComponent(journeyId)}`;
}

/** Constant-time compare, so a shared secret cannot be probed byte by byte. */
function secretEquals(supplied, expected) {
  if (!supplied || !expected) return false;
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Cron endpoints: `CRON_SECRET` only. `BOOKING_ADMIN_SECRET` is explicitly
 * rejected here, mirroring the rejection in the other direction (test 107).
 */
function requireCronSecret(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return { ok: false, status: 503, code: 'cron_secret_not_configured' };
  const supplied = bearer(req);
  if (!secretEquals(supplied, expected)) return { ok: false, status: 401, code: 'auth_invalid' };
  return { ok: true };
}

/** The operator-resolution endpoint: `BOOKING_ADMIN_SECRET` only. */
function requireAdminSecret(req) {
  const expected = process.env.BOOKING_ADMIN_SECRET;
  if (!expected) return { ok: false, status: 503, code: 'admin_secret_not_configured' };
  const supplied = bearer(req);
  if (!secretEquals(supplied, expected)) return { ok: false, status: 401, code: 'auth_invalid' };
  return { ok: true };
}

class ConfigError extends Error {
  constructor(code) { super(code); this.code = code; this.name = 'ConfigError'; }
}

module.exports = {
  FLOW_TOKEN_TTL,
  MANAGE_TOKEN_TTL,
  bearer,
  verifyToken,
  requireFlow,
  requireManage,
  requireFlowOrManage,
  signFlowToken,
  signManageToken,
  manageUrlFor,
  publicBaseUrl,
  requireCronSecret,
  requireAdminSecret,
  secretEquals,
  ConfigError,
};
