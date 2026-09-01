'use strict';

const https = require('https');

const { retryAfterSeconds } = require('../../booking/integrations/zoho/index.js');

/**
 * Lemlist API client.
 *
 * 🚨 THIS CLIENT IS NON-MUTATING, AND THAT IS A SAFETY PROPERTY, NOT A STYLE CHOICE.
 *
 * `POST /inbox/linkedin` on this same base URL, with this same credential, is
 * "Send LinkedIn Message". So are `POST /inbox/email` and `POST /inbox/whatsapp`.
 * A typo, a copied line, or a stray test would message a real prospect from an
 * SDR's own account — the single highest-consequence mistake available anywhere
 * in this integration.
 *
 * The defence is structural rather than careful:
 *
 *   · the transport takes NO method parameter — it can only issue GET;
 *   · there is no exported `post` / `put` / `patch` / `delete`;
 *   · the string `/inbox/linkedin` (and the email/whatsapp equivalents) does not
 *     appear in this file at all;
 *   · `markAsRead` is never sent, so reading an inbox cannot mutate Lemlist
 *     state either.
 *
 * `tests/lemlist-client.test.js` asserts each of those by inspecting the module
 * and its own source — the same "enforced by omission and by test" idiom as
 * `booking/integrations/zoho/index.js`.
 *
 * Auth is HTTP Basic with an EMPTY username and the API key as the password —
 * `Authorization: Basic base64(":" + KEY)`. Not Bearer. Lemlist's docs are
 * explicit and unusual about this.
 */

const BASE_HOST = 'api.lemlist.com';
const BASE_PATH = '/api';

const DEFAULT_TIMEOUT_MS = Number(process.env.LEMLIST_REQUEST_TIMEOUT_MS || 15_000);

/**
 * Lemlist allows 20 requests per 2 seconds per API key, globally across every
 * route. Requests here are strictly serial, so one minimum-interval gate is
 * sufficient and there is no burst to manage. 150ms is ~6.7 rps against a
 * ~10 rps ceiling — deliberately under, because the penalty for guessing high
 * is a 429 and the reward for guessing low is nothing.
 */
const MIN_INTERVAL_MS = Number(process.env.LEMLIST_MIN_REQUEST_INTERVAL_MS || 150);
const MAX_RETRIES = Number(process.env.LEMLIST_MAX_RETRIES || 3);

const RETRYABLE_CODES = new Set([
  'lemlist_http_429', 'lemlist_http_500', 'lemlist_http_502', 'lemlist_http_503',
  'lemlist_http_504', 'lemlist_network_error', 'lemlist_socket_timeout',
]);

const TERMINAL_CODES = new Set([
  'lemlist_http_400', 'lemlist_http_401', 'lemlist_http_403', 'lemlist_http_404',
  'lemlist_response_parse_failed', 'lemlist_api_key_missing',
]);

class LemlistError extends Error {
  constructor(code, detail = null, { retryAfterSeconds = null, route = null } = {}) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.retryAfterSeconds = retryAfterSeconds;
    this.route = route;
    this.name = 'LemlistError';
  }
  get retryable() { return RETRYABLE_CODES.has(this.code); }
  get terminal() { return TERMINAL_CODES.has(this.code); }
}

// ---------------------------------------------------------------------------
// Path builders — pure, so the exact query string is testable offline
// ---------------------------------------------------------------------------

function queryString(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** `GET /activities` — one page. `version=v2` is mandatory. */
function activitiesPath({ type, minDate, maxDate, offset = 0, limit = 100, campaignId } = {}) {
  return `/activities${queryString({
    version: 'v2', type, minDate, maxDate, offset, limit, campaignId,
  })}`;
}

/**
 * `GET /inbox/{contactId}` — the only known source of a rendered message body.
 *
 * `markAsRead` is deliberately UNREPRESENTABLE here rather than defaulted to
 * false: a parameter that cannot be expressed cannot be set by accident, and
 * marking a prospect's conversation read is a mutation of Lemlist state that an
 * import has no business performing.
 */
function inboxPath(contactId, { limit = 100, skip = 0 } = {}) {
  return `/inbox/${encodeURIComponent(contactId)}${queryString({ limit, skip })}`;
}

/** `GET /team` — carries `users[{userId, name, email, role}]`: the whole sender map in one call. */
function teamPath() {
  return '/team';
}

/**
 * A short, stable token naming the endpoint class, for the structured log.
 *
 * The full URL must never be logged: `/inbox/{contactId}` embeds a person's
 * Lemlist contact id, and `booking/lib/http.js` forbids URLs in log lines. A
 * fixed token keeps failures diagnosable without widening what is retained.
 */
function routeToken(path) {
  if (path.startsWith('/activities')) return 'activities';
  if (path.startsWith('/inbox/')) return 'inbox';
  if (path.startsWith('/team')) return 'team';
  return 'other';
}

// ---------------------------------------------------------------------------
// Transport — GET only, by construction
// ---------------------------------------------------------------------------

function authHeader() {
  const key = process.env.LEMLIST_API_KEY || '';
  if (!key) throw new LemlistError('lemlist_api_key_missing');
  // Empty username, API key as password.
  return `Basic ${Buffer.from(`:${key}`).toString('base64')}`;
}

let lastRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

/**
 * Issue one GET. There is no `method` parameter — this transport is incapable of
 * anything else, which is what makes the send endpoints unreachable.
 */
function rawGet(path, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}${path}`,
      method: 'GET',
      headers: { Authorization: authHeader(), Accept: 'application/json' },
    }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        let json = null;
        if (text) { try { json = JSON.parse(text); } catch (_) { json = null; } }
        resolve({ status: res.statusCode || 0, headers: res.headers, text, json });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new LemlistError('lemlist_socket_timeout', `after ${timeoutMs}ms`));
    });
    req.on('error', (e) => reject(
      e instanceof LemlistError ? e : new LemlistError('lemlist_network_error', e.message)));
    req.end();
  });
}

/**
 * A GET with the rate gate and bounded retry.
 *
 * Lemlist error bodies are NOT always JSON — `/activities` answers a bad team
 * with `text/plain: "Bad team"`, and a 401 has no body at all. So classification
 * is on STATUS ONLY and the body is never parsed for meaning, never logged, and
 * never surfaced in an error message.
 */
async function get(path, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const route = routeToken(path);
  let attempt = 0;

  for (;;) {
    attempt += 1;
    await throttle();

    let res;
    try {
      res = await rawGet(path, timeoutMs);
    } catch (err) {
      const e = err instanceof LemlistError ? err : new LemlistError('lemlist_network_error');
      e.route = route;
      if (e.retryable && attempt <= MAX_RETRIES) { await sleep(attempt * 500); continue; }
      throw e;
    }

    if (res.status === 429 || res.status >= 500) {
      const after = retryAfterSeconds(res.headers);
      const err = new LemlistError(`lemlist_http_${res.status}`, null,
        { retryAfterSeconds: after, route });
      if (attempt <= MAX_RETRIES) {
        // Honour Retry-After when Lemlist supplies it, but never sleep so long
        // that one rate limit consumes the whole invocation.
        const waitMs = Math.min((after != null ? after : attempt) * 1000, 10_000);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }

    if (res.status >= 400) throw new LemlistError(`lemlist_http_${res.status}`, null, { route });
    if (!res.text) return null;
    if (res.json === null) throw new LemlistError('lemlist_response_parse_failed', null, { route });
    return res.json;
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * One page of activities. The caller paginates; see `fetchActivities`.
 * Always returns an array, so an empty body and an empty page look the same.
 */
async function getActivitiesPage(opts) {
  const body = await get(activitiesPath(opts));
  return Array.isArray(body) ? body : [];
}

/**
 * Every activity in `[minDate, maxDate]`, by ordinary offset pagination.
 *
 * `limit` caps at 100 and a 7-day window can exceed that at modest volume, so
 * paging is not optional. There is no adaptive slicing and no persisted cursor:
 * if a concurrent Lemlist write shifts a page boundary mid-run, the next day's
 * overlapping window covers it, and the activity-id check stops anything
 * already imported from importing twice.
 */
async function fetchActivities({ type, minDate, maxDate, campaignId, maxPages = 200, fetchPage } = {}) {
  // `fetchPage` is an explicit test seam, the same shape as
  // `resolveProductDeal(accountId, product, { fetchDeals })` in the booking Zoho
  // client. Reassigning the module export would not intercept this call, because
  // the loop resolves the function through the module scope.
  const page1 = fetchPage || getActivitiesPage;
  const out = [];
  let offset = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const rows = await page1({ type, minDate, maxDate, campaignId, offset, limit: 100 });
    out.push(...rows);
    if (rows.length < 100) return { activities: out, pages: page + 1, truncated: false };
    offset += 100;
  }
  // Only reachable on an implausible volume; report it rather than silently
  // returning a partial window as if it were complete.
  return { activities: out, pages: maxPages, truncated: true };
}

/**
 * Inbox messages for one Lemlist contact.
 *
 * Items carry `_id` in the SAME `act_…` namespace as an activity, which is the
 * join key for a message body. Fetched once per contact, not once per activity.
 */
async function getInboxMessages(contactId, { limit = 100, skip = 0 } = {}) {
  const body = await get(inboxPath(contactId, { limit, skip }));
  if (!body) return { messages: [], pagination: null };
  const messages = Array.isArray(body.data) ? body.data
    : (Array.isArray(body) ? body : []);
  return { messages, pagination: body.pagination || null };
}

/** The team's users, `[{ userId, name, email, role }]`. One call per run. */
async function getTeamUsers() {
  const body = await get(teamPath());
  if (!body) return [];
  if (Array.isArray(body.users)) return body.users;
  if (Array.isArray(body)) return body;
  return [];
}

module.exports = {
  LemlistError,
  RETRYABLE_CODES,
  TERMINAL_CODES,
  // pure path builders, exported for test
  activitiesPath,
  inboxPath,
  teamPath,
  routeToken,
  // reads
  get,
  getActivitiesPage,
  fetchActivities,
  getInboxMessages,
  getTeamUsers,
  // Deliberately absent: any post / put / patch / delete, any generic `request`
  // taking a method, and any path builder for a send endpoint. The transport
  // cannot issue a non-GET request at all. See the header.
};
