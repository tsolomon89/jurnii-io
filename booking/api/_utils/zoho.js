const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const { pickProductDeal, normalizeProductKey } = require('./products');

// In-memory access-token cache (per serverless instance).
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Error that carries a short, safe `code` as its message. The raw third-party
 * detail is logged server-side and NEVER attached to the message, so handlers
 * can safely surface `error.code` without leaking Zoho payloads to the browser.
 */
class ZohoError extends Error {
  constructor(code, detail) {
    super(code);
    this.name = 'ZohoError';
    this.code = code;
    if (detail !== undefined) {
      try {
        console.error(`[zoho] ${code}:`, typeof detail === 'string' ? detail : JSON.stringify(detail));
      } catch (_) {
        console.error(`[zoho] ${code}: <undisplayable detail>`);
      }
    }
  }
}

const TOKEN_CACHE_PATH = path.join(__dirname, '../../scratch/.zoho_token.json');

function readDiskToken() {
  try {
    if (fs.existsSync(TOKEN_CACHE_PATH)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
      if (data.access_token && data.expires_at && Date.now() < data.expires_at - 60000) {
        return data;
      }
    }
  } catch (_) {}
  return null;
}

function writeDiskToken(token, expiresAt) {
  try {
    const dir = path.dirname(TOKEN_CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify({ access_token: token, expires_at: expiresAt }), 'utf8');
  } catch (_) {}
}

const ACCOUNTS_HOST = process.env.ZOHO_ACCOUNTS_HOST || 'accounts.zoho.eu';

async function getAccessToken(retryCount = 0) {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }
  const disk = readDiskToken();
  if (disk) {
    cachedToken = disk.access_token;
    tokenExpiresAt = disk.expires_at;
    return cachedToken;
  }

  if (!process.env.ZOHO_REFRESH_TOKEN || !process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET) {
    throw new ZohoError('zoho_credentials_missing', 'One or more of ZOHO_REFRESH_TOKEN/CLIENT_ID/CLIENT_SECRET is unset');
  }

  const params = querystring.stringify({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token'
  });

  const options = {
    hostname: ACCOUNTS_HOST,
    path: '/oauth/v2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(params)
    }
  };

  try {
    return await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(body);
          } catch (e) {
            return reject(new ZohoError('zoho_token_parse_failed', body));
          }
          if (data.access_token) {
            cachedToken = data.access_token;
            tokenExpiresAt = Date.now() + (data.expires_in * 1000);
            writeDiskToken(cachedToken, tokenExpiresAt);
            resolve(cachedToken);
          } else {
            reject(new ZohoError('zoho_token_refresh_failed', body));
          }
        });
      });
      req.on('error', (e) => reject(new ZohoError('zoho_token_network_error', e.message)));
      req.write(params);
      req.end();
    });
  } catch (err) {
    if (retryCount < 4 && err.code === 'zoho_token_refresh_failed') {
      const waitMs = (retryCount + 1) * 2000;
      console.warn(`[zoho] token refresh rate limited; retrying in ${waitMs}ms (attempt ${retryCount + 1})...`);
      await new Promise(r => setTimeout(r, waitMs));
      return getAccessToken(retryCount + 1);
    }
    throw err;
  }
}

/**
 * Generic Zoho CRM v6 REST call.
 * - Checks HTTP status: 2xx (and 204/empty) resolve; >=400 throws a sanitized ZohoError.
 * - Returns the parsed JSON body (or {} for empty/204).
 * Raw response bodies are logged server-side, never thrown to the caller as a message.
 */
async function requestZoho(method, path, body = null) {
  const token = await getAccessToken();
  const domain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.eu';
  const parsedUrl = new URL(`${domain}${path}`);
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method,
    headers: {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        const status = res.statusCode || 0;
        // 204 No Content (e.g. search with no results) or empty body.
        if (status === 204 || !resBody) {
          return resolve({});
        }
        let parsed;
        try {
          parsed = JSON.parse(resBody);
        } catch (e) {
          return reject(new ZohoError('zoho_response_parse_failed', `status=${status} body=${resBody}`));
        }
        if (status >= 400) {
          return reject(new ZohoError(`zoho_http_${status}`, parsed));
        }
        resolve(parsed);
      });
    });
    req.on('error', (e) => reject(new ZohoError('zoho_network_error', e.message)));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Builds a v6 write payload. When `trigger` is provided it is included verbatim:
 *   trigger: []            -> suppress ALL workflows/approvals/blueprints (used on Page-1 create)
 *   trigger omitted        -> Zoho default: all triggers run (used on the Page-2 enrichment update)
 */
function writePayload(record, trigger) {
  const payload = { data: [record] };
  if (Array.isArray(trigger)) payload.trigger = trigger;
  return payload;
}

function firstDetailId(res, code) {
  if (res && res.data && res.data.length > 0 && res.data[0].status === 'success') {
    return res.data[0].details.id;
  }
  throw new ZohoError(code, res);
}

// ---------------------------------------------------------------------------
// Search helpers (return ALL matches so callers can detect ambiguity).
// ---------------------------------------------------------------------------
async function searchRecordsByEmail(module, email) {
  const path = `/crm/v6/${module}/search?email=${encodeURIComponent(email)}`;
  const res = await requestZoho('GET', path);
  return (res && Array.isArray(res.data)) ? res.data : [];
}

async function searchContactsByEmail(email) {
  return searchRecordsByEmail('Contacts', email);
}

async function searchLeadsByEmail(email) {
  const leads = await searchRecordsByEmail('Leads', email);
  // Exclude converted leads so a Contact's originating converted Lead is never
  // treated as a reuse target on the Lead path.
  return leads.filter(l => l && l.Converted__s !== true && l.$converted !== true);
}

// ---------------------------------------------------------------------------
// Lead lifecycle.
// ---------------------------------------------------------------------------
/**
 * Creates a Lead. Pass { trigger: [] } to suppress the conversion workflow
 * (Page 1). Returns the new Lead id.
 */
async function createLead(leadData, { trigger } = {}) {
  const res = await requestZoho('POST', '/crm/v6/Leads', writePayload(leadData, trigger));
  return firstDetailId(res, 'lead_create_failed');
}

/**
 * Updates a Lead. With triggers ENABLED (default, no `trigger`) this is the
 * Page-2 conversion trigger. Returns the Lead id.
 */
async function updateLead(leadId, leadData, { trigger } = {}) {
  const res = await requestZoho('PUT', `/crm/v6/Leads/${leadId}`, writePayload(leadData, trigger));
  return firstDetailId(res, 'lead_update_failed');
}

/** GET a single Lead by id (returns the record object, or null if not found). */
async function getLead(leadId) {
  const res = await requestZoho('GET', `/crm/v6/Leads/${leadId}`);
  return (res && Array.isArray(res.data) && res.data.length > 0) ? res.data[0] : null;
}

/**
 * Reads conversion state off a Lead record (REST GET returns converted leads,
 * unlike Deluge getRecordById). Field shapes are defensively handled.
 * Returns { converted, contactId, accountId, dealId }.
 */
function readConversion(lead) {
  if (!lead) return { converted: false, contactId: null, accountId: null, dealId: null };
  const converted = lead.$converted === true || lead.Is_Converted === true;
  const detail = lead.$converted_detail || {};
  const pick = (lookup, detailKey) => {
    if (lookup && lookup.id) return lookup.id;
    if (detail && detail[detailKey]) return detail[detailKey];
    return null;
  };
  return {
    converted,
    contactId: pick(lead.Converted_Contact, 'contact'),
    accountId: pick(lead.Converted_Account, 'account'),
    dealId: pick(lead.Converted_Deal, 'deal')
  };
}

// ---------------------------------------------------------------------------
// Contact lifecycle (Contact-first path: an existing Contact is updated in
// place; no throwaway Lead is created).
// ---------------------------------------------------------------------------
/** GET a single Contact by id (returns the record object, or null if absent). */
async function getContact(contactId) {
  const res = await requestZoho('GET', `/crm/v6/Contacts/${contactId}`);
  return (res && Array.isArray(res.data) && res.data.length > 0) ? res.data[0] : null;
}

/**
 * Updates a Contact. Pass { trigger: [] } to suppress workflows (the Contact
 * path suppresses the write and invokes reconciliation explicitly). Returns id.
 */
async function updateContact(contactId, data, { trigger } = {}) {
  const res = await requestZoho('PUT', `/crm/v6/Contacts/${contactId}`, writePayload(data, trigger));
  return firstDetailId(res, 'contact_update_failed');
}

// ---------------------------------------------------------------------------
// Manual-Review Task (Contact-only). Mirrors the createManualReview.deluge
// convention: dedupe on the Contact's OPEN Tasks via a related-records read
// (existing module scope — NOT the Search API), and create a Contact-scoped
// review Task with no What_Id, so the sequence completion handler deliberately
// ignores it (skip_no_related_deal).
// ---------------------------------------------------------------------------
/**
 * The Contact's OPEN Tasks (the "Open Tasks" related list, api_name `Tasks`),
 * via the related-records endpoint — the existing module-read scope, no Search
 * API (whose `contains` operator is unsupported and which lags on indexing).
 * Returns [] when the Contact has no open Tasks.
 */
async function getTasksForContact(contactId, fields = 'id,Subject,Status,Task_Type,Description') {
  const res = await requestZoho('GET', `/crm/v6/Contacts/${contactId}/Tasks?fields=${encodeURIComponent(fields)}`);
  return (res && Array.isArray(res.data)) ? res.data : [];
}

/** Creates a Task. Pass { trigger: [] } to suppress Task workflows. Returns the id. */
async function createTask(data, { trigger } = {}) {
  const res = await requestZoho('POST', '/crm/v6/Tasks', writePayload(data, trigger));
  return firstDetailId(res, 'task_create_failed');
}

// ---------------------------------------------------------------------------
// Product-Deal resolution (reads the graph the Deluge automation produced;
// does NOT create Deals or duplicate commercial logic).
// ---------------------------------------------------------------------------
/** Search Deals related to an Account by its lookup id. */
async function getDealsForAccount(accountId) {
  const path = `/crm/v6/Deals/search?criteria=(Account_Name:equals:${accountId})`;
  const res = await requestZoho('GET', path);
  return (res && Array.isArray(res.data)) ? res.data : [];
}

/**
 * Resolves the single open Product Deal for an Account that matches a canonical
 * product name (e.g. "Jurnii UX"). Matches on Deal_Product.name or
 * Deal_Product_Key (normalized), excluding Lost deals. Never fabricates a Deal.
 * Returns { status: 'one'|'none'|'many', deal, count }.
 */
async function resolveProductDeal(accountId, canonicalProductName) {
  if (!accountId || !canonicalProductName) return { status: 'none', deal: null, count: 0 };
  const deals = await getDealsForAccount(accountId);
  return pickProductDeal(deals, canonicalProductName);
}

function formatZohoDateTime(isoStr) {
  if (!isoStr) return isoStr;
  return String(isoStr).replace(/\.\d{3}Z$/, 'Z');
}

async function createZohoEvent(eventData) {
  const payload = Object.assign({}, eventData);
  if (payload.Start_DateTime) payload.Start_DateTime = formatZohoDateTime(payload.Start_DateTime);
  if (payload.End_DateTime) payload.End_DateTime = formatZohoDateTime(payload.End_DateTime);
  const res = await requestZoho('POST', '/crm/v6/Events', writePayload(payload));
  return firstDetailId(res, 'event_create_failed');
}

async function searchEventByExternalId(externalId) {
  const safe = encodeURIComponent(externalId);
  const path = `/crm/v6/Events/search?criteria=(Ext_Calendar_Booking_ID:equals:${safe})`;
  const res = await requestZoho('GET', path);
  return (res && Array.isArray(res.data) && res.data.length > 0) ? res.data[0] : null;
}

async function updateZohoEvent(eventId, eventData) {
  const payload = Object.assign({}, eventData);
  if (payload.Start_DateTime) payload.Start_DateTime = formatZohoDateTime(payload.Start_DateTime);
  if (payload.End_DateTime) payload.End_DateTime = formatZohoDateTime(payload.End_DateTime);
  const res = await requestZoho('PUT', `/crm/v6/Events/${eventId}`, writePayload(payload));
  return firstDetailId(res, 'event_update_failed');
}

module.exports = {
  ZohoError,
  writePayload,
  requestZoho,
  searchRecordsByEmail,
  searchContactsByEmail,
  searchLeadsByEmail,
  createLead,
  updateLead,
  getLead,
  readConversion,
  getContact,
  updateContact,
  getTasksForContact,
  createTask,
  resolveProductDeal,
  normalizeProductKey,
  createZohoEvent,
  searchEventByExternalId,
  updateZohoEvent
};
