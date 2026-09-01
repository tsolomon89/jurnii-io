'use strict';

const Z = require('../../booking/integrations/zoho/index.js');
const { ACTIVITY_ID, coqlLiteral, coqlLikeFragment } = require('./identity');

/**
 * Zoho side of the Lemlist import.
 *
 * The transport, OAuth, error taxonomy, `Retry-After` parsing, write envelope
 * and PII-free error description are all REUSED from
 * `booking/integrations/zoho/index.js` — nothing here re-implements them, and
 * that module is not modified.
 *
 * What this module adds is only what did not exist anywhere in the repo:
 *
 *   · a COQL wrapper (there was no COQL at all), and
 *   · Contact / Account creation, which the booking backend deliberately lacks.
 *
 * ⚠ ON CREATION. `booking/` may not create CRM records; this subsystem may,
 * for Accounts and Contacts only, and the difference is scoped by directory
 * rather than by an exception carved into booking's documentation. See
 * ./CLAUDE.md. Deals and Quotes are created here under no circumstances — the
 * commercial lifecycle stays owned by Deluge.
 *
 * ⚠ EVERY WRITE IS SUPPRESSED. `writePayload(record, [])` sets `trigger: []`,
 * which disables all workflows, approvals and blueprints. The create functions
 * take NO trigger parameter, so an unsuppressed Contact insert is not
 * expressible: it would fire WF001b2 -> `processContact`, which resolves-or-
 * creates the Account, CREATES THE ACCOUNT'S DEAL, writes a `Contact_Roles`
 * row, and runs the 2765-line `processDeal` — which can dispatch an automated
 * email to a cold prospect.
 */

const CONTACT_FIELDS = 'id,Email,Personal_Linkedin,Account_Name,Last_Name,First_Name';
const ACCOUNT_FIELDS = 'id,Account_Name,Account_Key,Website,Company_Linkedin';

/** Characters Deluge would read as its own control markers. See `buildDescription`. */
const DELUGE_DESCRIPTION_MARKERS = ['ScheduledSend|', 'SendKey: ', 'ActivationCommand|'];

const OUR_DESCRIPTION_TOKEN = '[lemlist_activity]';

const BODY_MAX_CHARS = Number(process.env.LEMLIST_BODY_MAX_CHARS || 4000);

// ---------------------------------------------------------------------------
// COQL
// ---------------------------------------------------------------------------

/**
 * Run a COQL `SELECT` and return its rows.
 *
 * COQL is used rather than the search API for three verified reasons:
 *   · `like` works on `Personal_Linkedin` and is case-insensitive, which is the
 *     only way to match the inconsistent stored LinkedIn URLs in this org;
 *   · `contains` is NOT a permitted search-API operator on a text field
 *     (`invalid operator found`), so the search API cannot do the same job;
 *   · an exact `Subject =` predicate works, which is the idempotency check.
 *
 * An empty result set comes back as `[]`, never `null`, so "no rows" and "no
 * body" are the same thing to callers. A FAILED query throws — it must never be
 * mistaken for an absence, because absence is what authorises a create.
 */
async function coql(selectQuery) {
  const res = await Z.requestZoho('POST', '/crm/v6/coql', { select_query: selectQuery });
  return res && Array.isArray(res.data) ? res.data : [];
}

/** `SELECT … WHERE <field> = '<value>'`, with the value validated not escaped. */
async function coqlEquals(module, fields, field, value) {
  return coql(`select ${fields} from ${module} where ${field} = '${coqlLiteral(value)}'`);
}

/**
 * `SELECT … WHERE <field> like '%<prefix><fragment>%'`.
 *
 * `fragment` is third-party-derived and is validated (never escaped) by
 * `coqlLikeFragment`. `prefix` is a fixed literal supplied by this module — it
 * carries the `/` characters that make the probe selective, which the fragment
 * validator deliberately forbids.
 */
async function coqlLike(module, fields, field, fragment, prefix = '') {
  const safe = coqlLikeFragment(fragment);
  if (!/^[a-z/]*$/.test(prefix)) throw new Error('coql_prefix_unsafe');
  return coql(`select ${fields} from ${module} where ${field} like '%${prefix}${safe}%'`);
}

// ---------------------------------------------------------------------------
// Idempotency — the activity id lives in the Task Subject
// ---------------------------------------------------------------------------

/**
 * The Subject of the Task an activity imports as. THE import identity.
 *
 * A pure function of the activity id and nothing else. Deliberately NOT the
 * campaign name: campaigns get renamed, and a Subject built from a mutable
 * value would stop matching, so the next run would import the activity a second
 * time. Deliberately colon-free, because Zoho search `criteria` uses `:` as its
 * own delimiter.
 *
 * The id goes in the SUBJECT rather than the Description because
 * `Tasks.Description` is not queryable at all — COQL rejects it with
 * `unsupported column in criteria` and the search API with
 * `invalid operator found`. A Description marker can never be a lookup key.
 */
function taskSubject(activityId) {
  if (!ACTIVITY_ID.test(String(activityId || ''))) throw new Error('lemlist_activity_id_invalid');
  return `LinkedIn Sent ${activityId}`;
}

/**
 * Has this activity already been imported? Returns the Task id, or `null`.
 *
 * A throw here is NOT an absence — the caller must skip the activity rather
 * than treat a failed query as permission to create a duplicate.
 */
async function findTaskByActivityId(activityId) {
  const rows = await coqlEquals('Tasks', 'id,Subject', 'Subject', taskSubject(activityId));
  const hit = rows.find((r) => r.Subject === taskSubject(activityId));
  return hit ? String(hit.id) : null;
}

// ---------------------------------------------------------------------------
// Reads used by identity resolution
// ---------------------------------------------------------------------------

/**
 * Candidate Contacts whose `Personal_Linkedin` contains `/in/<fragment>`.
 *
 * The `/in/` prefix keeps the probe selective: without it, a slug fragment
 * could match a `/company/` URL stored in the same field. These are CANDIDATES
 * only — the caller decides by comparing canonical forms in Node, because
 * `like` cannot tell `john-smith` from `john-smith-4a92b117`.
 */
function findContactsByLinkedinFragment(fragment) {
  return coqlLike('Contacts', CONTACT_FIELDS, 'Personal_Linkedin', fragment, '/in/');
}

/**
 * Contacts whose PRIMARY `Email` matches exactly.
 *
 * `searchContactsByEmail` from the booking client is deliberately NOT used:
 * it calls `/Contacts/search?email=…`, whose semantics span every email field
 * on the record, so a match on `Secondary_Email` — which is not unique — could
 * silently become person identity.
 */
function findContactsByEmail(emailNorm) {
  return coqlEquals('Contacts', CONTACT_FIELDS, 'Email', emailNorm);
}

function findAccountsByWebsite(domain) {
  return coqlEquals('Accounts', ACCOUNT_FIELDS, 'Website', domain);
}

function findAccountsByKey(key) {
  return coqlEquals('Accounts', ACCOUNT_FIELDS, 'Account_Key', key);
}

function findAccountsByName(name) {
  return coqlEquals('Accounts', ACCOUNT_FIELDS, 'Account_Name', name);
}

/** Candidate Accounts whose `Company_Linkedin` contains `/company/<fragment>`. */
function findAccountsByCompanyLinkedinFragment(fragment) {
  return coqlLike('Accounts', ACCOUNT_FIELDS, 'Company_Linkedin', fragment, '/company/');
}

// ---------------------------------------------------------------------------
// Writes — Accounts and Contacts, suppressed. Never Deals, never Quotes.
// ---------------------------------------------------------------------------

/**
 * Create an Account with workflows suppressed.
 *
 * There is no trigger parameter on purpose: an unsuppressed Account insert
 * fires WF001c -> `processAccount`, which creates a Deal.
 */
async function createAccountSuppressed(record) {
  const res = await Z.requestZoho('POST', '/crm/v6/Accounts', Z.writePayload(record, []));
  return Z.firstWriteResult(res);
}

/** Create a Contact with workflows suppressed. See the module header. */
async function createContactSuppressed(record) {
  const res = await Z.requestZoho('POST', '/crm/v6/Contacts', Z.writePayload(record, []));
  return Z.firstWriteResult(res);
}

/** Create the completed activity Task, suppressed. Reuses the booking helper. */
function createTask(payload) {
  return Z.createTaskSuppressed(payload);
}

/**
 * Active Zoho users, for mapping a Lemlist sender to a Task Owner.
 *
 * Needs the `ZohoCRM.users.READ` scope. If the refresh token lacks it this
 * throws, which is deliberately non-fatal at the call site: the run falls back
 * to `LEMLIST_DEFAULT_OWNER_ID` rather than guessing a user, and the missing
 * scope is a prerequisite to report rather than to widen.
 */
async function getActiveUsers() {
  const res = await Z.requestZoho('GET', '/crm/v6/users?type=ActiveUsers');
  return res && Array.isArray(res.users) ? res.users : [];
}

/**
 * Read a record back after creating it.
 *
 * `SUCCESS` proves nothing in this org: a field that exists but sits in the
 * layout's Unused bin silently discards writes to its key while the rest of the
 * map commits, and an api_name that does not exist can void the ENTIRE map.
 * Both are recorded production incidents.
 */
function readBack(module, id, fields) {
  return Z.getRecord(module, id, fields);
}

// ---------------------------------------------------------------------------
// Task payload — pure
// ---------------------------------------------------------------------------

/**
 * HTML message body -> plain text.
 *
 * Stripping `<img>` is a CORRECTNESS requirement, not cosmetics: Lemlist
 * bodies embed `https://zr0.lemlst.org/api/track/open/<user>/<task>` tracking
 * pixels. If that HTML ever reached a rendering surface it would fire false
 * "open" events back into Lemlist and corrupt the SDR's own campaign analytics.
 * Any `lemlst.org` URL is removed for the same reason.
 */
function htmlToPlainText(html) {
  if (!html || typeof html !== 'string') return '';
  let s = html;
  s = s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  // Quoted reply chains add no information and multiply length.
  s = s.replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi, ' ');
  s = s.replace(/<img\b[^>]*>/gi, ' ');
  s = s.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => {
    const label = String(text).replace(/<[^>]+>/g, '').trim();
    const url = String(href).trim();
    if (/lemlst\.org/i.test(url)) return label;              // tracking link: keep text, drop URL
    if (!url || url.length > 300) return label;
    return label ? `${label} (${url})` : url;
  });
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  // Decode entities once. Ampersand last, so `&amp;lt;` cannot become `<`.
  s = s.replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, '&');
  // Any surviving tracking URL, e.g. one that was never an anchor.
  s = s.replace(/https?:\/\/\S*lemlst\.org\S*/gi, '');
  s = s.replace(/[ \t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

const BODY_UNAVAILABLE = 'Message body not available from the Lemlist API for this activity.';

/**
 * The Task `Description`.
 *
 * Machine tokens LEAD, because truncation cuts from the end: a trailing token
 * could vanish and leave the record unattributable.
 *
 * `sent_at` here is the ONLY home for the exact send instant. `Closed_Time` is
 * read-only in this org (`view_type` has `edit:false, create:false`) and
 * `Due_Date` is a `date` with no time component — and is also the trigger field
 * of a live rule that sends email to prospects, so it is never written. The
 * consequence is worth stating plainly: the exact timestamp is recorded and
 * human-readable, but it is not queryable or reportable in v1.
 */
function buildDescription({
  activityId, sentAtIso, campaignName, campaignId, sequenceStep,
  senderEmail, lemlistContactId, body, bodyAvailable,
}) {
  const lines = [`${OUR_DESCRIPTION_TOKEN} ${activityId}`];
  if (sentAtIso) lines.push(`sent_at: ${sentAtIso}`);

  const campaign = [campaignName, campaignId ? `(${campaignId})` : ''].filter(Boolean).join(' ');
  const campaignLine = [campaign ? `campaign: ${campaign}` : '',
    Number.isFinite(sequenceStep) ? `step: ${sequenceStep}` : ''].filter(Boolean).join('   ');
  if (campaignLine) lines.push(campaignLine);

  if (senderEmail) lines.push(`sender: ${senderEmail}`);
  if (lemlistContactId) lines.push(`lemlist_contact: ${lemlistContactId}`);

  lines.push('--- message ---');
  if (bodyAvailable && body) {
    const text = body.length > BODY_MAX_CHARS
      ? `${body.slice(0, BODY_MAX_CHARS)}\n[truncated: ${body.length - BODY_MAX_CHARS} characters omitted]`
      : body;
    lines.push(text);
  } else {
    // A single fixed sentence, never an empty section, so "we looked and it is
    // not there" is distinguishable from "nobody looked".
    lines.push(BODY_UNAVAILABLE);
  }

  const out = lines.join('\n');
  assertDescriptionSafe(out);
  return out;
}

/**
 * Refuse a Description that Deluge would read as one of its own control markers.
 *
 * `handleTaskCompletion.deluge` early-returns on `ScheduledSend|`,
 * `sendScheduledEmailFromTask.deluge` requires it, and
 * `sendSequencedEmail.deluge` keys its send-idempotency on `SendKey: `. A body
 * containing one of those strings could make our audit record participate in
 * another subsystem's control flow. The check is narrow on purpose — a prospect
 * writing `[something]` in a LinkedIn message is harmless, so only these exact
 * markers are refused.
 */
function assertDescriptionSafe(description) {
  for (const marker of DELUGE_DESCRIPTION_MARKERS) {
    if (description.includes(marker)) throw new Error('lemlist_description_marker_conflict');
  }
  if (!description.startsWith(OUR_DESCRIPTION_TOKEN)) {
    throw new Error('lemlist_description_token_missing');
  }
}

/**
 * The Task payload.
 *
 * Every omission below is load-bearing, each against a specific live guard:
 *
 *   Task_Type              omitted — no safe picklist member exists. The only
 *                          two outside Deluge's nine `knownTypes` are claimed
 *                          (`Scheduled Send`, `Email Sent`), and an unknown
 *                          picklist value is silently discarded. Blank is not
 *                          in `knownTypes`, so `handleTaskCompletion:57`
 *                          returns.
 *   Task_State             omitted — `handleTaskCompletion:111` returns on a
 *                          blank `Task_State`: a second, independent guard.
 *   Task_Sequence_Managed  written FALSE explicitly, not omitted, so a future
 *                          field default of `true` cannot silently arm
 *                          `routeContactSequence`'s blocking predicate.
 *   Status: 'Completed'    also makes `sendScheduledEmailFromTask:39` return
 *                          and makes `createAuxTask:74` unable to adopt this
 *                          Task and append its own review codes to it.
 *   Due_Date               omitted — it is a `date` (cannot hold the send time)
 *                          AND the trigger field of live rule WFC-SchedEmail,
 *                          whose action chain sends email to prospects.
 *   Blocks_Sequence        omitted — a RETIRE field with zero readers, even
 *                          though `buildManualReviewTask` still writes it.
 *   Task_Stage /
 *   Task_Sequence_Stage    omitted — the two use non-interchangeable stage
 *                          vocabularies and cross-writing is silently discarded.
 *   Closed_Time            omitted — read-only in this org.
 */
function buildTaskPayload({ activityId, zohoContactId, zohoAccountId, zohoOwnerId, description }) {
  if (!zohoContactId) throw new Error('lemlist_task_requires_contact');

  const payload = {
    Subject: taskSubject(activityId),
    Status: 'Completed',
    Who_Id: { id: String(zohoContactId) },
    Task_Sequence_Managed: false,
    Description: description,
  };

  // `What_Id` and `$se_module` travel together or not at all. `$se_module` is
  // the discriminator FOR `What_Id`; with nothing to discriminate it is
  // meaningless, so it is omitted rather than set to 'Contacts'. `Who_Id`
  // already carries the Contact association.
  if (zohoAccountId) {
    payload.What_Id = { id: String(zohoAccountId) };
    payload.$se_module = 'Accounts';
  }

  if (zohoOwnerId) payload.Owner = { id: String(zohoOwnerId) };

  return payload;
}

/** The api_names `buildTaskPayload` may ever emit. Pinned by test. */
const TASK_PAYLOAD_FIELDS = [
  'Subject', 'Status', 'Who_Id', 'What_Id', '$se_module', 'Owner',
  'Task_Sequence_Managed', 'Description',
];

module.exports = {
  // COQL
  coql,
  coqlEquals,
  coqlLike,
  CONTACT_FIELDS,
  ACCOUNT_FIELDS,
  // idempotency
  taskSubject,
  findTaskByActivityId,
  // reads
  findContactsByLinkedinFragment,
  findContactsByEmail,
  findAccountsByWebsite,
  findAccountsByKey,
  findAccountsByName,
  findAccountsByCompanyLinkedinFragment,
  // writes
  createAccountSuppressed,
  createContactSuppressed,
  createTask,
  getActiveUsers,
  readBack,
  // pure builders
  htmlToPlainText,
  buildDescription,
  buildTaskPayload,
  assertDescriptionSafe,
  BODY_UNAVAILABLE,
  DELUGE_DESCRIPTION_MARKERS,
  OUR_DESCRIPTION_TOKEN,
  TASK_PAYLOAD_FIELDS,
  // Deliberately absent: createDeal, createQuote, updateContact, updateAccount,
  // and anything that creates or modifies a field, picklist value, layout,
  // workflow or OAuth scope. v1 has NO update path at all, which is what makes
  // "existing CRM data is not overwritten" structural rather than conditional.
};
