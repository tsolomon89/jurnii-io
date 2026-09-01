'use strict';

const https = require('https');

/**
 * Zoho CRM integration.
 *
 * Moved from `api/_utils/zoho.js` and materially edited. Two controls the old client
 * lacked entirely, both of which turn a recoverable stall into a lost submission:
 *
 *  - PER-REQUEST SOCKET TIMEOUTS. Without one, a half-open socket hangs until the
 *    platform kills the function, so the op's lease expires with no outcome recorded
 *    and the crash counter climbs toward termination — a duplicate-create risk
 *    dressed up as a crash loop.
 *  - 429 / `Retry-After` HONOURING. Ignoring it converts one rate limit into a
 *    self-inflicted outage.
 *
 * What this module deliberately CANNOT do, by omission: create a Contact, Account,
 * Deal or Quote; create or modify a field, picklist value, workflow or OAuth scope.
 * Those belong to Deluge (`processLead` / `processContact` / `processDeal`) and to
 * the CRM console. There is no function here to call.
 */

const DEFAULT_TIMEOUT_MS = Number(process.env.ZOHO_REQUEST_TIMEOUT_MS || 12_000);

/** Retryable: the request may succeed later, and MAY have already succeeded. */
const RETRYABLE_CODES = new Set([
  'zoho_http_429', 'zoho_http_500', 'zoho_http_502', 'zoho_http_503', 'zoho_http_504',
  'zoho_network_error', 'zoho_socket_timeout', 'zoho_token_refresh_failed',
]);

/** Terminal: retrying cannot help. */
const TERMINAL_CODES = new Set([
  'zoho_http_400', 'zoho_http_401', 'zoho_http_403', 'zoho_http_404',
  'INVALID_DATA', 'MANDATORY_NOT_FOUND', 'zoho_response_parse_failed',
]);

class ZohoError extends Error {
  constructor(code, detail, { retryAfterSeconds = null } = {}) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.retryAfterSeconds = retryAfterSeconds;
    this.name = 'ZohoError';
  }
  get retryable() { return RETRYABLE_CODES.has(this.code); }
  get terminal() { return TERMINAL_CODES.has(this.code); }
}

/**
 * A bounded, PII-free summary of a Zoho rejection, for the application log.
 *
 * `ZohoError.detail` already holds Zoho's response body, but every caller logged only
 * the transport code. A terminal write therefore surfaced as a bare `zoho_http_400` with
 * no indication of WHICH field Zoho objected to — the whole cause had to be bisected by
 * hand against the live org (journey ef6397f4, 2026-08-09).
 *
 * Only Zoho's own error code and the FIELD NAMES it names are extracted. Never
 * `message` (free text) and never a field's value: a rejected payload carries the
 * visitor's email, phone and company, and an application log is not the place for them.
 * That is the same reason the reason ledger stores a fixed code rather than a
 * third-party string — this adds diagnosis without widening what is retained.
 */
const ERROR_DETAIL_KEYS = ['api_name', 'parent_api_name', 'expected_data_type', 'index'];

function describeZohoError(err) {
  const detail = err && err.detail;
  if (!detail || typeof detail !== 'object') return null;
  // A write rejection nests per-record errors under `data`; a request-level one does not.
  const rows = Array.isArray(detail.data) ? detail.data : [detail];
  const out = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const one = {};
    if (row.code) one.code = String(row.code).slice(0, 64);
    const d = row.details;
    if (d && typeof d === 'object') {
      for (const k of ERROR_DETAIL_KEYS) {
        if (d[k] !== undefined && d[k] !== null) one[k] = String(d[k]).slice(0, 64);
      }
    }
    if (Object.keys(one).length) out.push(one);
  }
  return out.length ? out.slice(0, 5) : null;
}

/**
 * Is an error a genuine "definite reject", or merely unresolved?
 *
 * The distinction decides whether an uncertain create may be retried. Anything not
 * provably terminal is treated as uncertain, which is the conservative direction: a
 * duplicated Lead runs conversion twice and corrupts the commercial graph, while a
 * missed one is a visible, human-resolvable Task.
 */
function isDefiniteReject(err) {
  return Boolean(err) && err instanceof ZohoError && err.terminal;
}

// ---------------------------------------------------------------------------
// Token handling
// ---------------------------------------------------------------------------

let cachedToken = null;      // { token, expiresAt }

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const domain = process.env.ZOHO_ACCOUNTS_DOMAIN || 'https://accounts.zoho.eu';
  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN || '',
    client_id: process.env.ZOHO_CLIENT_ID || '',
    client_secret: process.env.ZOHO_CLIENT_SECRET || '',
    grant_type: 'refresh_token',
  });

  const res = await rawRequest({
    url: `${domain}/oauth/v2/token?${params.toString()}`,
    method: 'POST',
    headers: {},
    body: null,
  }).catch((e) => { throw new ZohoError('zoho_token_refresh_failed', e.message); });

  if (res.status >= 400 || !res.json || !res.json.access_token) {
    throw new ZohoError('zoho_token_refresh_failed', res.json || res.text);
  }
  const expiresIn = Number(res.json.expires_in || 3600) * 1000;
  cachedToken = { token: res.json.access_token, expiresAt: Date.now() + expiresIn };
  return cachedToken.token;
}

/** Test seam: clear the cached token. */
function resetTokenCache() { cachedToken = null; }

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

function rawRequest({ url, method, headers, body, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers,
    }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        let json = null;
        if (text) { try { json = JSON.parse(text); } catch (_) { json = null; } }
        resolve({ status: res.statusCode || 0, headers: res.headers, text, json });
      });
    });

    // A half-open socket must fail fast rather than consume the whole invocation.
    req.setTimeout(timeoutMs, () => {
      req.destroy(new ZohoError('zoho_socket_timeout', `after ${timeoutMs}ms`));
    });
    req.on('error', (e) => reject(e instanceof ZohoError ? e : new ZohoError('zoho_network_error', e.message)));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/** Parse `Retry-After`, which may be seconds or an HTTP date. */
function retryAfterSeconds(headers) {
  const raw = headers && (headers['retry-after'] || headers['Retry-After']);
  if (!raw) return null;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber)) return Math.max(0, Math.ceil(asNumber));
  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate)) return Math.max(0, Math.ceil((asDate - Date.now()) / 1000));
  return null;
}

async function requestZoho(method, path, body = null) {
  const token = await getAccessToken();
  const domain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.eu';

  const res = await rawRequest({
    url: `${domain}${path}`,
    method,
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
    body,
  });

  // 204, or an empty body on a search with no results.
  if (res.status === 204 || !res.text) return {};

  if (res.json === null) {
    throw new ZohoError('zoho_response_parse_failed', `status=${res.status}`);
  }
  if (res.status === 401) {
    // The token may simply have aged out mid-flight; drop it so the next call refreshes.
    resetTokenCache();
    throw new ZohoError('zoho_http_401', res.json);
  }
  if (res.status >= 400) {
    throw new ZohoError(`zoho_http_${res.status}`, res.json,
      { retryAfterSeconds: retryAfterSeconds(res.headers) });
  }
  return res.json;
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * `trigger: []` suppresses ALL workflows, approvals and blueprints. Every data-load
 * write uses it, so the complete payload lands without initiating conversion; the
 * single workflow-enabled update that starts `processLead` omits it.
 */
function writePayload(record, trigger) {
  const payload = { data: [record] };
  if (Array.isArray(trigger)) payload.trigger = trigger;
  return payload;
}

const SUPPRESSED = { trigger: [] };

/**
 * Extract the duplicate record id from a `DUPLICATE_DATA` response, so an uncertain
 * create reuses what already exists instead of creating again.
 */
function duplicateRecordId(detail) {
  const row = detail && Array.isArray(detail.data) ? detail.data[0] : detail;
  if (!row) return null;
  if (row.code !== 'DUPLICATE_DATA') return null;
  const d = row.details || {};
  return (d.duplicate_record && d.duplicate_record.id) || d.id || null;
}

function firstWriteResult(res) {
  const row = res && Array.isArray(res.data) ? res.data[0] : null;
  if (!row) throw new ZohoError('zoho_write_no_result', res);
  if (row.status === 'success') return { ok: true, id: row.details && row.details.id };
  const dup = duplicateRecordId(row);
  if (dup) return { ok: false, duplicateId: dup, code: 'DUPLICATE_DATA' };
  throw new ZohoError(row.code || 'zoho_write_failed', row);
}

// ---------------------------------------------------------------------------
// Identity resolution — reads only, in the required order
// ---------------------------------------------------------------------------

async function searchByEmail(module, email) {
  const res = await requestZoho('GET', `/crm/v6/${module}/search?email=${encodeURIComponent(email)}`);
  return res && Array.isArray(res.data) ? res.data : [];
}

const searchContactsByEmail = (email) => searchByEmail('Contacts', email);

/**
 * Unconverted Leads only. A converted Lead is not a candidate — its Contact is.
 */
async function searchUnconvertedLeadsByEmail(email) {
  const leads = await searchByEmail('Leads', email);
  return leads.filter((l) => !readConversion(l).converted);
}

async function getRecord(module, id, fields = null) {
  const q = fields ? `?fields=${encodeURIComponent(fields)}` : '';
  const res = await requestZoho('GET', `/crm/v6/${module}/${id}${q}`);
  return res && Array.isArray(res.data) ? res.data[0] : null;
}

const getLead = (id) => getRecord('Leads', id);
const getContact = (id) => getRecord('Contacts', id);

/**
 * Read a Lead's conversion state, tolerating every shape Zoho uses for it.
 * Returns `{ converted, contactId, accountId, dealId }`.
 */
function readConversion(lead) {
  if (!lead) return { converted: false, contactId: null, accountId: null, dealId: null };
  const detail = lead.$converted_detail || {};
  const converted = Boolean(
    lead.$converted === true || lead.Is_Converted === true || lead.$converted === 'true'
    || detail.getContact || detail.contact_id || detail.contact
    || lead.Converted_Contact
  );
  const pick = (...vals) => {
    for (const v of vals) {
      if (!v) continue;
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v.id) return v.id;
    }
    return null;
  };
  // Four shapes are in play across Zoho versions and API surfaces: the `$converted_detail`
  // object (snake_case or getX), the `Converted_*` lookup fields, and the plain
  // `Contact_Name`/`Account_Name` lookups. Reading only one of them was a live defect:
  // conversion would be reported as not-yet-discovered forever and T4 would fire.
  return {
    converted,
    contactId: pick(detail.contact_id, detail.contact, detail.getContact,
      lead.Converted_Contact, lead.Contact_Name),
    accountId: pick(detail.account_id, detail.account, detail.getAccount,
      lead.Converted_Account, lead.Account_Name),
    dealId: pick(detail.deal_id, detail.deal, detail.getDeal, lead.Converted_Deal),
  };
}

/**
 * The Account of a verified Contact — DERIVED, never accepted from an operator.
 * `RT4.adopt_identity` uses this: a hand-typed Account id would attach a demo to
 * another company's commercial graph, and Zoho already knows the answer.
 */
function accountIdOfContact(contact) {
  return (contact && contact.Account_Name && contact.Account_Name.id) || null;
}

// ---------------------------------------------------------------------------
// Writes. Leads only — no Contact, Account, Deal or Quote is ever created here.
// ---------------------------------------------------------------------------

/** One suppressed Lead create, carrying the COMPLETE Page-1 + Page-2 payload. */
async function createLeadSuppressed(record) {
  const res = await requestZoho('POST', '/crm/v6/Leads', writePayload(record, SUPPRESSED.trigger));
  return firstWriteResult(res);
}

/** One suppressed convergent Lead update. */
async function updateLeadSuppressed(leadId, record) {
  const res = await requestZoho('PUT', `/crm/v6/Leads/${leadId}`, writePayload(record, SUPPRESSED.trigger));
  return firstWriteResult(res);
}

/** One suppressed Contact update. Never creates a Lead for an existing Contact. */
async function updateContactSuppressed(contactId, record) {
  const res = await requestZoho('PUT', `/crm/v6/Contacts/${contactId}`, writePayload(record, SUPPRESSED.trigger));
  return firstWriteResult(res);
}

/**
 * THE single workflow-enabled Lead update — the one call that starts `processLead`.
 *
 * `trigger` is omitted so Zoho's default applies and all workflows run. This is
 * at-most-once by the caller's latch: the caller commits `sending` BEFORE the request
 * leaves and never resends from `sending`, `outcome_unknown` or `unresolved`. There is
 * no retry inside this function on purpose.
 */
async function updateLeadWorkflowEnabled(leadId, record) {
  const res = await requestZoho('PUT', `/crm/v6/Leads/${leadId}`, writePayload(record, undefined));
  return firstWriteResult(res);
}

// ---------------------------------------------------------------------------
// Meetings (Events). One per journey, correlated by Ext_Calendar_Booking_ID.
// ---------------------------------------------------------------------------

function formatZohoDateTime(isoStr) {
  return new Date(isoStr).toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

async function searchEventByExternalId(externalId) {
  const criteria = encodeURIComponent(`(Ext_Calendar_Booking_ID:equals:${externalId})`);
  const res = await requestZoho('GET', `/crm/v6/Events/search?criteria=${criteria}`);
  const rows = res && Array.isArray(res.data) ? res.data : [];
  return rows[0] || null;
}

async function createEventSuppressed(eventData) {
  const res = await requestZoho('POST', '/crm/v6/Events', writePayload(eventData, SUPPRESSED.trigger));
  return firstWriteResult(res);
}

/**
 * Update a Meeting. `triggersEnabled` is the retro-link case: WF007 fires on
 * `create_or_edit` with no field criteria, so a triggers-enabled PUT re-fires
 * `handleMeetingEvent` and advances the pipeline. Its first guard returns early
 * unless `What_Id` is set AND `$se_module === 'Deals'`, which is why Contact and Deal
 * must be applied in the SAME write.
 */
async function updateEvent(eventId, eventData, { triggersEnabled = false } = {}) {
  const res = await requestZoho('PUT', `/crm/v6/Events/${eventId}`,
    writePayload(eventData, triggersEnabled ? undefined : SUPPRESSED.trigger));
  return firstWriteResult(res);
}

/**
 * Build the Meeting payload.
 *
 * A Deal is linked ONLY when the final Contact is already known — both, or neither.
 * Passing `What_Id` over a Lead `Who_Id` corrupts the pipeline:
 * `handleMeetingEvent.deluge` passes `Who_Id` into `routeContactSequence(<contactId>,
 * …)`, so a Lead id in the Contact position silently mis-routes.
 */
function buildMeetingPayload({
  journeyId, title, startIso, endIso, contactId, leadId, dealId,
  meetLink, products = [], manageUrl, extraFields = {},
}) {
  const linkAtCreate = Boolean(dealId && contactId);
  const payload = {
    // The journey's persisted title — byte-identical to the Google Calendar summary.
    Event_Title: title,
    Start_DateTime: formatZohoDateTime(startIso),
    End_DateTime: formatZohoDateTime(endIso),
    Ext_Calendar_Booking_ID: journeyId,          // re-sent explicitly, never cleared
    /**
     * A confirmed booking is an UPCOMING demo, and these three say so in the vocabulary
     * `handleMeetingEvent` actually reads. All are live-valid picklist values.
     *
     * `Meeting_Task_Status: 'Working'` also closes a latent bug: the Deluge writes
     * `Meeting_Task_Status = 'New'` when it finds the field blank, and `'New'` is NOT a
     * live value for that field. Setting it here means that write never happens.
     */
    Meeting_Task_Stage: 'Demo Booking',
    Meeting_Task_State: 'Open',
    Meeting_Task_Status: 'Working',
    Description: [
      meetLink ? `Google Meet Link: ${meetLink}` : null,
      `Booking Reference: ${journeyId}`,
      `Products: ${products.length ? products.join(' + ') : 'Product Discovery'}`,
      manageUrl ? `Manage or cancel: ${manageUrl}` : null,
    ].filter(Boolean).join('\n'),
    ...extraFields,
  };
  /**
   * `Meeting_Task_Contract_Products` is a multiselectpicklist (json_type jsonarray), so
   * it takes an ARRAY of canonical names — never a comma-joined string, which is what
   * the Description carries and what Zoho would reject.
   *
   * OMITTED, not sent as `[]`, when nothing was selected. Omission is provably safe: it
   * is byte-for-byte the behaviour this field has always had. `[]` is only probably
   * safe, and `INVALID_DATA` is classified TERMINAL — a wrong guess would not retry, it
   * would escalate the journey and leave the booking with no Meeting at all. Both read
   * identically downstream: the Deluge guards the field with `if(!isNull(rawProds))`.
   * Same discipline as `Who_Id`/`What_Id` below.
   */
  if (products.length) payload.Meeting_Task_Contract_Products = products;
  const person = contactId || leadId;
  if (person) payload.Who_Id = { id: person };
  if (linkAtCreate) {
    payload.What_Id = { id: dealId };
    payload.$se_module = 'Deals';
  }
  const meetField = process.env.ZOHO_EVENT_MEET_FIELD;
  if (meetField && meetLink) payload[meetField] = meetLink;
  return payload;
}

// ---------------------------------------------------------------------------
// Deals — READ ONLY. Node never creates a Deal.
// ---------------------------------------------------------------------------

/**
 * `fields` is REQUIRED on a v6 related-list read. Omitting it returns HTTP 400
 * `REQUIRED_PARAM_MISSING`, which `TERMINAL_CODES` classifies as terminal — so the
 * failure never retried and instead escalated the whole journey. That is how a
 * missing query parameter suppressed every Meeting: `meetingCreate` calls this
 * inside its try block BEFORE `incrementCreateAttempts`, so the Event create was
 * never even attempted (`create_attempts` stayed 0) and the journey went to
 * `manual_review` with `meeting_create_failed`.
 *
 * `id` is always returned. `Deal_Name` and `Opportunity_State` are requested so the
 * resolver can name candidates in a review and exclude Lost relationships without a
 * second round trip.
 */
async function getDealsForAccount(accountId) {
  const res = await requestZoho('GET', `/crm/v6/Accounts/${accountId}/Deals?fields=Deal_Name,Opportunity_State`);
  return res && Array.isArray(res.data) ? res.data : [];
}

/**
 * Resolve THE Deal for an Account.
 *
 * WORK ITEM 4.1. Under the approved commercial model an Account has ZERO OR ONE
 * persistent Deal, and a Product is a QUOTE under that Deal — never a Deal of its own.
 * So there is nothing to select BY: the Account's Deal is simply the Account's Deal.
 *
 * What this used to do, and why it had to change: it substring-matched the canonical
 * Product name inside `Deal_Name`. That only worked because Deals were named
 * "<Account> - <Product>". Once Deluge names the single Deal after the Account,
 * `Deal_Name` no longer contains any Product name, so EVERY lookup would have returned
 * `status:'none'` and every Meeting would have been created with no `What_Id`. This is
 * why the item must ship in the same window as the Deluge Deal-naming change — and why
 * the earlier "booking first" ordering was withdrawn: shipped early, it would face 17
 * Accounts still holding 2–3 Product Deals and resolve `many` for all of them.
 *
 * `canonicalProductName` is retained in the signature but is NO LONGER USED for
 * selection. Every call site passes a product/anchor, and changing all of them plus
 * this contract in one step would make the diff hard to review against the plan; the
 * parameter is accepted, ignored for matching, and echoed back for logging. It should be
 * dropped once the call sites are simplified.
 *
 * `{ status: 'one'|'none'|'many', deal, count, candidates }` — 'many' is ambiguity,
 * never a guess. A `many` result must raise a visible review naming every candidate; it
 * must never be resolved by picking one, because the Deal_Key UNIQUE constraint is not
 * enforced live and a silent choice would hide a duplicate-Deal defect.
 */
async function resolveProductDeal(accountId, canonicalProductName, { fetchDeals } = {}) {
  if (!accountId) return { status: 'none', deal: null, count: 0, candidates: [] };
  // `fetchDeals` is an explicit seam so the matching rule can be unit-tested without
  // a network stub. Reassigning the module export would not work: the call below
  // resolves the module-local binding, not the exports object.
  const deals = await (fetchDeals || getDealsForAccount)(accountId);
  const all = Array.isArray(deals) ? deals : [];
  // A Lost relationship is not the Account's live Deal. Excluding it keeps a churned
  // Account that later returns from resolving 'many' against its own history.
  const open = all.filter((d) => (d.Opportunity_State || '') !== 'Lost');
  const candidates = open.length ? open : all;
  const ids = candidates.map((d) => d.id).filter(Boolean);
  if (candidates.length === 1) {
    return { status: 'one', deal: candidates[0], count: 1, candidates: ids };
  }
  if (candidates.length > 1) {
    return { status: 'many', deal: null, count: candidates.length, candidates: ids };
  }
  return { status: 'none', deal: null, count: 0, candidates: [] };
}

// ---------------------------------------------------------------------------
// Manual Review Tasks
// ---------------------------------------------------------------------------

function manualReviewSubject(journeyId) {
  return `Manual Review: ${journeyId}`;
}

/**
 * Journey-scoped Subject search. Exact-match and journey-unique, so at most one
 * record is expected and no module scan occurs.
 *
 * Requires `ZohoCRM.modules.tasks.READ`. Whether the current refresh token carries
 * it is NOT established anywhere in either repository and is on the §12
 * live-verification list — this function is written, unit-tested against mocks, and
 * deliberately not exercised against the live tenant.
 */
async function searchTaskBySubject(journeyId) {
  const criteria = encodeURIComponent(`(Subject:equals:${manualReviewSubject(journeyId)})`);
  const res = await requestZoho('GET', `/crm/v6/Tasks/search?criteria=${criteria}`);
  const rows = res && Array.isArray(res.data) ? res.data : [];
  return rows[0] || null;
}

async function getTasksForContact(contactId, fields = 'id,Subject,Status,Task_Type,Description') {
  const res = await requestZoho('GET', `/crm/v6/Contacts/${contactId}/Tasks?fields=${encodeURIComponent(fields)}`);
  return res && Array.isArray(res.data) ? res.data : [];
}

async function getTask(taskId) { return getRecord('Tasks', taskId); }

/**
 * Build the Manual Review Task payload. No Deal is ever invented to host it.
 * The unlinked (ambiguous) shape carries no `Who_Id`/`What_Id`/`$se_module` at all,
 * which has no precedent in the repository and is on the §12 verification list.
 */
function buildManualReviewTask({ journeyId, contactId, description, reopen = false }) {
  const payload = {
    Subject: manualReviewSubject(journeyId),
    Description: description,
    Task_Type: 'Manual Review',
    Status: 'In Progress',
    Task_Status: 'Working',
    Task_State: 'Open',
    Blocks_Sequence: 'Yes',      // convention only; never relied on (§8.2)
  };
  if (contactId) {
    payload.Who_Id = { id: contactId };
    payload.$se_module = 'Contacts';
  } else {
    const owner = process.env.ZOHO_MANUAL_REVIEW_OWNER_ID;
    if (owner) payload.Owner = { id: owner };
  }
  if (reopen) {
    payload.Status = 'In Progress';
    payload.Task_Status = 'Working';
    payload.Task_State = 'Open';
  }
  return payload;
}

/** True when a found Task is closed and must be reopened rather than duplicated. */
function taskIsClosed(task) {
  if (!task) return false;
  return ['Completed', 'Cancelled', 'Deferred'].includes(task.Status) || task.Task_Status === 'Closed';
}

async function createTaskSuppressed(payload) {
  const res = await requestZoho('POST', '/crm/v6/Tasks', writePayload(payload, SUPPRESSED.trigger));
  return firstWriteResult(res);
}

async function updateTaskSuppressed(taskId, payload) {
  const res = await requestZoho('PUT', `/crm/v6/Tasks/${taskId}`, writePayload(payload, SUPPRESSED.trigger));
  return firstWriteResult(res);
}

module.exports = {
  ZohoError,
  RETRYABLE_CODES,
  TERMINAL_CODES,
  isDefiniteReject,
  describeZohoError,
  retryAfterSeconds,
  requestZoho,
  rawRequest,
  getAccessToken,
  resetTokenCache,
  writePayload,
  duplicateRecordId,
  firstWriteResult,
  searchByEmail,
  searchContactsByEmail,
  searchUnconvertedLeadsByEmail,
  getRecord,
  getLead,
  getContact,
  readConversion,
  accountIdOfContact,
  createLeadSuppressed,
  updateLeadSuppressed,
  updateContactSuppressed,
  updateLeadWorkflowEnabled,
  formatZohoDateTime,
  searchEventByExternalId,
  createEventSuppressed,
  updateEvent,
  buildMeetingPayload,
  getDealsForAccount,
  resolveProductDeal,
  manualReviewSubject,
  searchTaskBySubject,
  getTasksForContact,
  getTask,
  buildManualReviewTask,
  taskIsClosed,
  createTaskSuppressed,
  updateTaskSuppressed,
  // Deliberately absent: any createContact / createAccount / createDeal / createQuote,
  // and anything that would create or modify a field, picklist value, workflow or
  // OAuth scope. Those belong to Deluge and to the CRM console.
};
