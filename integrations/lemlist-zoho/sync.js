'use strict';

const { log } = require('../../booking/lib/http');
const { describeZohoError } = require('../../booking/integrations/zoho/index.js');
const { normalizeEmail } = require('../../booking/api/_utils/email');

const lemlist = require('./lemlist');
const zoho = require('./zoho');
const I = require('./identity');

/**
 * The daily import.
 *
 * Two mechanisms carry the whole design, and between them they replace every
 * piece of synchronisation machinery this subsystem deliberately does NOT have
 * (no database, no checkpoint, no queue, no state machine, no worker):
 *
 *   1. THE ZOHO TASK SUBJECT IS THE IMPORT IDENTITY. Before importing an
 *      activity, ask Zoho whether a Task named `LinkedIn Sent <activityId>`
 *      already exists. If it does, skip. Rerunning is therefore always safe.
 *
 *   2. THE OVERLAPPING WINDOW IS THE RETRY. Every run asks Lemlist for the last
 *      `LEMLIST_LOOKBACK_DAYS` (7 by default), not "everything since last time".
 *      If Sunday's run fails, Monday's still covers Sunday. Anything that fails
 *      for any reason is simply skipped and tried again tomorrow — there is
 *      nothing to queue and no state to reconcile.
 *
 * Consequently the failure policy is uniform: log the reason, skip the activity,
 * carry on. The one thing never done on uncertainty is a speculative CRM write.
 */

const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_ACTIVITY_TYPE = 'linkedinSent';

/** Read a fail-safe flag: only the exact string `true` arms anything. */
function flag(env, name) {
  return String((env && env[name]) || '').toLowerCase() === 'true';
}

/**
 * What this invocation is permitted to do.
 *
 * Three independent gates, all fail-safe OFF, so a freshly provisioned
 * environment imports nothing until an operator deliberately arms it. `?dryRun=1`
 * ALWAYS forces a dry run and can never be overridden by configuration — the
 * same contract as `booking/lib/retention-gate.js`.
 */
function gates(query, env) {
  const forcedDryRun = Boolean(query && (query.dryRun === '1' || query.dryRun === 'true'));
  const syncEnabled = flag(env, 'LEMLIST_SYNC_ENABLED');
  const writeEnabled = flag(env, 'LEMLIST_ZOHO_WRITE_ENABLED') && !forcedDryRun;
  return {
    syncEnabled,
    // Creation needs its own flag AND writes enabled: it is the only operation
    // whose mistakes are not fixed by tomorrow's run.
    createEnabled: writeEnabled && flag(env, 'LEMLIST_ALLOW_RECORD_CREATION'),
    writeEnabled,
    dryRun: !writeEnabled,
    dryRunReason: forcedDryRun ? 'query'
      : (!flag(env, 'LEMLIST_ZOHO_WRITE_ENABLED') ? 'writes_disabled' : null),
  };
}

function newSummary() {
  return {
    activitiesFetched: 0,
    typeMismatchDropped: 0,
    malformed: 0,
    alreadyImported: 0,
    tasksCreated: 0,
    contactsMatchedByLinkedin: 0,
    contactsMatchedByEmail: 0,
    contactsCreated: 0,
    accountsMatchedByDomain: 0,
    accountsMatchedByLinkedin: 0,
    accountsCreated: 0,
    // Dry-run projections: what a run WITH creation armed would have done. These
    // are the numbers an operator reads before arming anything.
    wouldCreateAccount: 0,
    wouldCreateContact: 0,
    bodiesResolved: 0,
    bodiesUnavailable: 0,
    sendersUnmapped: 0,
    skipped: {},
    apiFailures: {},
    pagesFetched: 0,
    windowTruncated: false,
  };
}

function bump(bucket, key) {
  bucket[key] = (bucket[key] || 0) + 1;
}

/**
 * The default I/O surface, injectable in full so the loop is testable offline
 * without intercepting `require`. Anything not overridden is the real call.
 */
function defaultDeps() {
  return {
    fetchActivities: lemlist.fetchActivities,
    getInboxMessages: lemlist.getInboxMessages,
    getTeamUsers: lemlist.getTeamUsers,
    findTaskByActivityId: zoho.findTaskByActivityId,
    findContactsByLinkedinFragment: zoho.findContactsByLinkedinFragment,
    findContactsByEmail: zoho.findContactsByEmail,
    findAccountsByWebsite: zoho.findAccountsByWebsite,
    findAccountsByKey: zoho.findAccountsByKey,
    findAccountsByName: zoho.findAccountsByName,
    findAccountsByCompanyLinkedinFragment: zoho.findAccountsByCompanyLinkedinFragment,
    createAccountSuppressed: zoho.createAccountSuppressed,
    createContactSuppressed: zoho.createContactSuppressed,
    createTask: zoho.createTask,
    readBack: zoho.readBack,
    getActiveUsers: zoho.getActiveUsers,
    log,
  };
}

// ---------------------------------------------------------------------------
// Sender -> Zoho user
// ---------------------------------------------------------------------------

/**
 * `LEMLIST_SENDER_MAP` — the authoritative Lemlist-sender -> Zoho-user mapping.
 *
 * Format: `usr_xYvofAcCBx8X7amjL:991103000001576001,usr_other:99110300000...`
 *
 * WHY THIS IS CONFIG RATHER THAN AN API LOOKUP. Verified live 2026-09-01: there
 * is no API path from a Lemlist `sendUserId` to an email address. `GET /team`
 * returns `userIds` as bare strings, `GET /team/senders` returns
 * `[{userId, campaigns}]`, and neither carries an email — so nothing can be
 * matched against a Zoho user. An operator-curated map is the only deterministic
 * option, and it is a small one: the workspace has a single sender today.
 *
 * A malformed entry is skipped and logged rather than guessed at.
 */
function parseSenderMap(env, ctx) {
  const raw = String((env && env.LEMLIST_SENDER_MAP) || '').trim();
  const map = new Map();
  if (!raw) return map;
  for (const pair of raw.split(',')) {
    const [lemlistId, zohoId] = pair.split(':').map((s) => (s || '').trim());
    if (/^usr_[A-Za-z0-9]+$/.test(lemlistId) && /^\d{6,}$/.test(zohoId)) {
      map.set(lemlistId, zohoId);
    } else if (pair.trim()) {
      ctx.deps.log({ evt: 'lemlist.sender_map_entry_invalid' });
    }
  }
  return map;
}

/**
 * The Task owner for an activity's sender. Deterministic; never guesses.
 *
 *   LEMLIST_SENDER_MAP[sendUserId]                       -> that Zoho user
 *   -> else a /team email matched to a Zoho active user   (inert today; see above)
 *   -> else LEMLIST_DEFAULT_OWNER_ID
 *   -> else no Owner key at all, and Zoho defaults to the API user. Counted.
 */
async function buildSenderMap(ctx) {
  if (ctx.senderMap) return ctx.senderMap;
  ctx.senderMap = new Map();
  try {
    const users = await ctx.deps.getTeamUsers();
    for (const u of users) {
      const email = normalizeEmail(u && u.email);
      if (u && u.userId && email) ctx.senderMap.set(String(u.userId), email);
    }
  } catch (err) {
    // Not fatal: a run can still import with the configured default owner.
    bump(ctx.summary.apiFailures, err.code || 'sender_map_failed');
    ctx.deps.log({ evt: 'lemlist.sender_map_failed', code: err.code || 'unknown' });
  }
  return ctx.senderMap;
}

/** Zoho active users, keyed by normalised email. Built once per run. */
async function buildZohoUserMap(ctx) {
  if (ctx.zohoUsersByEmail) return ctx.zohoUsersByEmail;
  ctx.zohoUsersByEmail = new Map();
  try {
    const users = await ctx.deps.getActiveUsers();
    for (const u of users) {
      const email = normalizeEmail(u && u.email);
      if (u && u.id && email) ctx.zohoUsersByEmail.set(email, String(u.id));
    }
  } catch (err) {
    // Most likely a missing `ZohoCRM.users.READ` scope. Non-fatal: the run falls
    // back to the configured default owner. Widening the OAuth scope is not
    // something this subsystem may do.
    bump(ctx.summary.apiFailures, err.code || 'zoho_user_map_failed');
    ctx.deps.log({ evt: 'lemlist.zoho_user_map_failed', code: err.code || 'unknown' });
  }
  return ctx.zohoUsersByEmail;
}

async function resolveOwner(activity, ctx) {
  const senderId = activity.sendUserId || activity.userId || activity.createdBy || null;

  // 1. The configured map. Authoritative, and the only path that works today.
  if (!ctx.configuredSenderMap) ctx.configuredSenderMap = parseSenderMap(ctx.env, ctx);
  if (senderId && ctx.configuredSenderMap.has(String(senderId))) {
    return {
      ownerId: ctx.configuredSenderMap.get(String(senderId)),
      senderEmail: null, mapped: true, via: 'config',
    };
  }

  // 2. An email from /team matched to a Zoho active user. Inert while Lemlist
  //    returns no emails, but costs nothing and starts working if that changes.
  const senderMap = await buildSenderMap(ctx);
  const email = senderId ? senderMap.get(String(senderId)) : null;
  if (email) {
    const zohoUsers = await buildZohoUserMap(ctx);
    if (zohoUsers.has(email)) {
      return { ownerId: zohoUsers.get(email), senderEmail: email, mapped: true, via: 'team_email' };
    }
  }

  // No deterministic match. Use the configured integration owner if there is
  // one; otherwise omit `Owner` entirely and let Zoho default to the API user.
  // An arbitrary user is never chosen at any step.
  // 3/4. The configured integration owner, or nothing at all.
  const fallback = ctx.env.LEMLIST_DEFAULT_OWNER_ID || null;
  ctx.summary.sendersUnmapped += 1;
  ctx.deps.log({
    evt: 'lemlist.sender_unmapped',
    senderId: senderId ? String(senderId) : null,
    usedDefaultOwner: Boolean(fallback),
  });
  return { ownerId: fallback, senderEmail: email || null, mapped: false, via: 'default' };
}

// ---------------------------------------------------------------------------
// Message body
// ---------------------------------------------------------------------------

/**
 * The rendered LinkedIn message for one activity, or a terminal "unavailable".
 *
 * THE ACTIVITY CARRIES THE BODY DIRECTLY. Verified against the live workspace on
 * 2026-09-01: `activity.text` holds the rendered message as PLAIN TEXT (not
 * HTML) on 100% of sampled `linkedinSent` activities. So the common path costs
 * ZERO extra requests — the documented `/inbox/{contactId}` hop is not needed.
 *
 * The inbox remains a fallback for the case where `text` is absent. Inbox items
 * carry `_id` in the same `act_…` namespace, which is the join key, and the
 * field there is `text` too (not `message`, as the published schema suggests).
 * It is fetched once per Lemlist contact and cached for the run.
 *
 * Failure to retrieve a body NEVER blocks the Task — the requirement is that the
 * activity still lands, with the absence stated explicitly.
 */
async function resolveBody(activity, ctx) {
  // The activity's own text, when present, is the whole answer.
  const inline = activity && typeof activity.text === 'string' ? activity.text.trim() : '';
  if (inline) {
    // Already plain text in practice; the transform is total and idempotent, so
    // running it costs nothing and still strips a tracking pixel if one appears.
    const text = zoho.htmlToPlainText(inline) || inline;
    return { available: true, text, source: 'activity' };
  }

  if (!ctx.bodyLookupEnabled || !activity.contactId) {
    return { available: false, text: null };
  }

  const key = String(activity.contactId);
  if (!ctx.inboxCache.has(key)) {
    try {
      const { messages } = await ctx.deps.getInboxMessages(key, { limit: 100, skip: 0 });
      const byId = new Map();
      for (const m of messages) if (m && m._id) byId.set(String(m._id), m);
      ctx.inboxCache.set(key, byId);
    } catch (err) {
      bump(ctx.summary.apiFailures, err.code || 'inbox_failed');
      ctx.inboxCache.set(key, new Map());
    }
  }

  const message = ctx.inboxCache.get(key).get(String(activity._id));
  const raw = message && (message.message || message.body || message.text);
  if (!raw) return { available: false, text: null };

  const text = zoho.htmlToPlainText(raw);
  if (!text) return { available: false, text: null };
  return { available: true, text };
}

// ---------------------------------------------------------------------------
// One activity
// ---------------------------------------------------------------------------

/**
 * Import one activity, or decide not to.
 *
 * Returns a machine outcome. Nothing here throws to the caller: every failure
 * mode becomes a skip with a reason, because the next overlapping run retries it
 * and a half-finished import is worse than a deferred one.
 */
async function importActivity(activity, ctx) {
  const activityId = String(activity && activity._id || '');
  const s = ctx.summary;

  if (!I.ACTIVITY_ID.test(activityId)) {
    s.malformed += 1;
    return { outcome: 'malformed' };
  }

  // ---- 1. already imported? The Subject is the import identity. --------------
  try {
    const existing = await ctx.deps.findTaskByActivityId(activityId);
    if (existing) {
      s.alreadyImported += 1;
      return { outcome: 'already_imported', taskId: existing };
    }
  } catch (err) {
    // A failed check is NOT an absence: proceeding would risk a duplicate Task.
    bump(s.apiFailures, err.code || 'subject_check_failed');
    ctx.deps.log({ evt: 'lemlist.subject_check_failed', code: err.code || 'unknown' });
    return { outcome: 'skipped', reason: 'subject_check_failed' };
  }

  const lead = activity.lead || {};
  const vars = lead.variables || {};
  const linkedinUrl = I.leadVariable(vars, 'linkedinUrl') || lead.linkedinUrl || '';
  const email = normalizeEmail(I.leadVariable(vars, 'email') || activity.leadEmail || '');
  const companyDomain = I.leadVariable(vars, 'companyDomain');
  const companyLinkedinUrl = I.leadVariable(vars, 'companyLinkedinUrl');
  const companyName = I.leadVariable(vars, 'companyName') || activity.leadCompanyName || '';

  // ---- 2. resolve the Contact ----------------------------------------------
  let contact;
  try {
    contact = await I.resolveContact({ linkedinUrl, email }, ctx.deps);
  } catch (err) {
    bump(s.apiFailures, err.code || 'contact_resolve_failed');
    return { outcome: 'skipped', reason: 'contact_resolve_failed' };
  }

  if (contact.status === 'conflict') {
    ctx.deps.log({
      evt: 'lemlist.identity_conflict', scope: 'contact',
      reason: contact.reason, candidateIds: contact.candidateIds, activityId,
    });
    bump(s.skipped, `contact_${contact.reason}`);
    return { outcome: 'skipped', reason: contact.reason };
  }

  let zohoContactId = null;
  let zohoAccountId = null;

  if (contact.status === 'one') {
    zohoContactId = contact.contactId;
    zohoAccountId = contact.accountId;
    if (contact.matchedOn === 'linkedin') s.contactsMatchedByLinkedin += 1;
    else s.contactsMatchedByEmail += 1;
  } else {
    // ---- 3. the Contact must be created -----------------------------------
    const created = await createPerson({
      lead, email, linkedinUrl, companyDomain, companyLinkedinUrl, companyName,
    }, ctx);
    if (!created.ok) return { outcome: 'skipped', reason: created.reason };
    zohoContactId = created.contactId;
    zohoAccountId = created.accountId;
  }

  // ---- 4. owner and body ---------------------------------------------------
  const owner = await resolveOwner(activity, ctx);
  const body = await resolveBody(activity, ctx);
  if (body.available) s.bodiesResolved += 1; else s.bodiesUnavailable += 1;

  // ---- 5. build and create the Task ---------------------------------------
  let payload;
  try {
    payload = zoho.buildTaskPayload({
      activityId,
      zohoContactId,
      zohoAccountId,
      zohoOwnerId: owner.ownerId,
      description: zoho.buildDescription({
        activityId,
        sentAtIso: isoOrNull(activity.createdAt),
        campaignName: activity.campaignName || activity.name || '',
        campaignId: activity.campaignId || '',
        sequenceStep: Number.isFinite(activity.sequenceStep) ? activity.sequenceStep : undefined,
        senderEmail: owner.senderEmail,
        lemlistContactId: activity.contactId || '',
        body: body.text,
        bodyAvailable: body.available,
      }),
    });
  } catch (err) {
    // A refused Description (a Deluge control marker in the body) or a rejected
    // id. Terminal for this activity; retrying tomorrow will refuse identically,
    // so it is logged loudly rather than silently repeated.
    ctx.deps.log({ evt: 'lemlist.payload_refused', code: err.message, activityId });
    bump(s.skipped, 'payload_refused');
    return { outcome: 'skipped', reason: 'payload_refused' };
  }

  if (ctx.gates.dryRun) {
    bump(s.skipped, 'dry_run');
    return { outcome: 'dry_run', payload };
  }

  if (s.tasksCreated >= ctx.maxTasksPerRun) {
    bump(s.skipped, 'max_tasks_per_run');
    return { outcome: 'skipped', reason: 'max_tasks_per_run' };
  }

  try {
    const result = await ctx.deps.createTask(payload);
    if (!result.ok) {
      // A duplicate on a Task IS the same activity by definition, so adopting
      // the existing id is correct here. (Contrast Accounts, where adopting a
      // duplicate would be identity-by-name and is refused.)
      s.alreadyImported += 1;
      return { outcome: 'already_imported', taskId: result.duplicateId };
    }
    s.tasksCreated += 1;

    // SUCCESS proves nothing in this org: an off-layout field silently discards
    // its own key while the rest of the map commits. Read the record back.
    await verifyTask(result.id, payload, ctx);

    ctx.deps.log({
      evt: 'lemlist.task.created', activityId, taskId: result.id,
      matchedOn: contact.status === 'one' ? contact.matchedOn : 'created',
      hasAccount: Boolean(zohoAccountId), bodyAvailable: body.available,
      ownerMapped: owner.mapped,
    });
    return { outcome: 'created', taskId: result.id };
  } catch (err) {
    bump(s.apiFailures, err.code || 'task_create_failed');
    ctx.deps.log({
      evt: 'lemlist.task.create_failed', activityId,
      code: err.code || 'unknown', detail: describeZohoError(err),
    });
    return { outcome: 'skipped', reason: 'task_create_failed' };
  }
}

/** Read the created Task back and report any key Zoho silently dropped. */
async function verifyTask(taskId, payload, ctx) {
  if (!taskId) return;
  try {
    const fields = Object.keys(payload).filter((k) => k !== '$se_module').join(',');
    const row = await ctx.deps.readBack('Tasks', taskId, fields);
    if (!row) return;
    for (const key of Object.keys(payload)) {
      if (key === '$se_module' || key === 'Description') continue;
      const landed = row[key];
      if (landed === undefined || landed === null) {
        ctx.deps.log({ evt: 'lemlist.field_silently_discarded', module: 'Tasks', apiName: key, taskId });
      }
    }
  } catch (err) {
    bump(ctx.summary.apiFailures, err.code || 'task_readback_failed');
  }
}

function isoOrNull(value) {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

// ---------------------------------------------------------------------------
// Creating the person
// ---------------------------------------------------------------------------

/**
 * Create the Account (only if genuinely absent and the veto is clean) and then
 * the Contact beneath it.
 *
 * Ordering matters: the Account is resolved or created FIRST, so the Contact can
 * be created with its `Account_Name` lookup already set in the same payload.
 * That avoids leaving an Account-less Contact behind if the second write fails.
 */
async function createPerson(input, ctx) {
  const s = ctx.summary;
  const { lead, email, linkedinUrl, companyDomain, companyLinkedinUrl, companyName } = input;

  // `Last_Name` is the only system_mandatory Contacts field, so it is a
  // PRECONDITION. It is never synthesised from the email local-part, the company
  // name, or by splitting a full name — that would write a fabricated person
  // into the system of record.
  const lastName = I.lastNameFor(lead);
  if (!lastName) {
    ctx.deps.log({ evt: 'lemlist.skip', reason: 'missing_last_name' });
    bump(s.skipped, 'missing_last_name');
    return { ok: false, reason: 'missing_last_name' };
  }

  // NOTE ON ORDERING. Account resolution and the create veto run even when
  // creation is disabled, because that is the ENTIRE VALUE OF A DRY RUN: it is
  // how an operator learns, before arming anything, how many activities would
  // match an existing Account, how many would create one, and how many would hit
  // the veto. Gating the resolution behind the write flag would make the dry run
  // report `creation_disabled` and nothing else. Only the WRITES are gated, and
  // they are gated immediately below each resolution.

  // ---- Account ------------------------------------------------------------
  let account;
  try {
    account = await I.resolveAccount({ companyDomain, companyLinkedinUrl }, ctx.deps);
  } catch (err) {
    bump(s.apiFailures, err.code || 'account_resolve_failed');
    return { ok: false, reason: 'account_resolve_failed' };
  }

  if (account.status === 'conflict') {
    ctx.deps.log({
      evt: 'lemlist.identity_conflict', scope: 'account',
      reason: account.reason, candidateIds: account.candidateIds,
    });
    bump(s.skipped, `account_${account.reason}`);
    return { ok: false, reason: account.reason };
  }

  let accountId = null;
  if (account.status === 'one') {
    accountId = account.accountId;
    if (account.matchedOn === 'company_domain') s.accountsMatchedByDomain += 1;
    else s.accountsMatchedByLinkedin += 1;
  } else {
    // No Account matched. A create needs BOTH a reliable company identifier and
    // a clean name veto.
    if (!account.domain && !account.slug) {
      bump(s.skipped, 'insufficient_account_identity');
      return { ok: false, reason: 'insufficient_account_identity' };
    }

    let veto;
    try {
      veto = await I.accountCreateAllowed({ companyName }, ctx.deps);
    } catch (err) {
      bump(s.apiFailures, err.code || 'account_veto_failed');
      return { ok: false, reason: 'account_veto_failed' };
    }
    if (!veto.allowed) {
      ctx.deps.log({
        evt: 'lemlist.account_create_refused',
        reason: veto.reason, candidateIds: veto.candidateIds,
      });
      bump(s.skipped, veto.reason);
      return { ok: false, reason: veto.reason };
    }

    if (!ctx.gates.createEnabled) {
      // The veto is clean and a create WOULD happen. Reported, not performed.
      s.wouldCreateAccount += 1;
      bump(s.skipped, 'creation_disabled');
      return { ok: false, reason: 'creation_disabled', wouldCreateAccount: true };
    }

    const record = { Account_Name: veto.accountName };
    // `Website` is data about the domain; `Account_Key` is identity machinery.
    // They coincide only when a domain exists — a name-derived value must never
    // go into `Website`.
    if (account.domain) {
      record.Website = account.domain;
      record.Account_Key = account.domain;
    } else {
      record.Account_Key = veto.accountKey;
    }
    if (companyLinkedinUrl && account.slug) {
      record.Company_Linkedin = `https://www.linkedin.com/company/${account.slug}`;
    }
    if (ctx.env.LEMLIST_DEFAULT_OWNER_ID) record.Owner = { id: ctx.env.LEMLIST_DEFAULT_OWNER_ID };

    try {
      const created = await ctx.deps.createAccountSuppressed(record);
      if (!created.ok) {
        // A DUPLICATE_DATA on an Account is TERMINAL, never adopted: adopting
        // the returned id would be identity by company name, which the model
        // forbids. (The opposite rule applies to Tasks.)
        ctx.deps.log({
          evt: 'lemlist.account_create_duplicate', duplicateId: created.duplicateId,
        });
        bump(s.skipped, 'account_name_collision');
        return { ok: false, reason: 'account_name_collision' };
      }
      accountId = created.id;
      s.accountsCreated += 1;
      ctx.deps.log({ evt: 'lemlist.account.created', accountId, hasDomain: Boolean(account.domain) });
    } catch (err) {
      bump(s.apiFailures, err.code || 'account_create_failed');
      ctx.deps.log({
        evt: 'lemlist.account.create_failed',
        code: err.code || 'unknown', detail: describeZohoError(err),
      });
      return { ok: false, reason: 'account_create_failed' };
    }
  }

  // ---- Contact ------------------------------------------------------------
  if (!ctx.gates.createEnabled) {
    // An Account was matched, so only the Contact would be created.
    s.wouldCreateContact += 1;
    bump(s.skipped, 'creation_disabled');
    return { ok: false, reason: 'creation_disabled', wouldCreateContact: true };
  }

  const record = { Last_Name: lastName };
  const firstName = I.firstNameFor(lead);
  if (firstName) record.First_Name = firstName;
  if (email && !I.isRoleMailbox(email)) record.Email = email;

  const slug = I.canonicalPersonalSlug(linkedinUrl);
  if (slug) record.Personal_Linkedin = `https://www.linkedin.com/in/${slug}`;

  if (accountId) record.Account_Name = { id: accountId };

  const jobTitle = I.leadVariable(lead.variables, 'jobTitle');
  if (jobTitle) record.Job_Title_Raw = jobTitle.slice(0, 120);

  if (ctx.env.LEMLIST_DEFAULT_OWNER_ID) record.Owner = { id: ctx.env.LEMLIST_DEFAULT_OWNER_ID };

  // NO commercial lifecycle state is asserted. Stage / State / Status /
  // Contact_Role1 are all omitted — verified optional on the live module. The
  // Contact exists because the person exists, not because a commercial state has
  // been claimed: `Stage = 'Marketing Consent'` would be a false MQL claim about
  // someone who was cold-messaged on LinkedIn. Lead_Source is omitted too, since
  // the picklist has no `Lemlist` member and a non-member voids the whole map.

  try {
    const created = await ctx.deps.createContactSuppressed(record);
    if (!created.ok) {
      // Contacts.Email is unique: a duplicate here means the person exists after
      // all, so adopt the id rather than skipping. Nothing is overwritten.
      ctx.deps.log({ evt: 'lemlist.contact_create_duplicate', contactId: created.duplicateId });
      return { ok: true, contactId: created.duplicateId, accountId };
    }
    s.contactsCreated += 1;
    ctx.deps.log({ evt: 'lemlist.contact.created', contactId: created.id, hasAccount: Boolean(accountId) });
    return { ok: true, contactId: created.id, accountId };
  } catch (err) {
    bump(s.apiFailures, err.code || 'contact_create_failed');
    ctx.deps.log({
      evt: 'lemlist.contact.create_failed',
      code: err.code || 'unknown', detail: describeZohoError(err),
    });
    return { ok: false, reason: 'contact_create_failed' };
  }
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/**
 * One daily pass. Returns the run summary, which the handler both logs as a
 * single line and returns as its response body.
 */
async function runSync({ now = new Date(), query = {}, env = process.env, deps = {} } = {}) {
  const startedAt = Date.now();
  const g = gates(query, env);
  const summary = newSummary();

  const resolvedDeps = Object.assign(defaultDeps(), deps);
  const lookbackDays = Number(env.LEMLIST_LOOKBACK_DAYS || DEFAULT_LOOKBACK_DAYS);
  const activityType = env.LEMLIST_ACTIVITY_TYPE || DEFAULT_ACTIVITY_TYPE;

  const maxDate = new Date(now.getTime());
  const minDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const ctx = {
    env,
    gates: g,
    deps: resolvedDeps,
    summary,
    inboxCache: new Map(),
    senderMap: null,
    zohoUsersByEmail: null,
    bodyLookupEnabled: flag(env, 'LEMLIST_BODY_LOOKUP_ENABLED'),
    maxTasksPerRun: Number(env.LEMLIST_MAX_TASKS_PER_RUN || 5),
  };

  const window = {
    minDate: minDate.toISOString(),
    maxDate: maxDate.toISOString(),
    lookbackDays,
    activityType,
  };

  if (!g.syncEnabled) {
    return finish({ summary, window, gates: g, startedAt, outcome: 'disabled' });
  }

  let fetched;
  try {
    fetched = await resolvedDeps.fetchActivities({
      type: activityType,
      minDate: window.minDate,
      maxDate: window.maxDate,
    });
  } catch (err) {
    bump(summary.apiFailures, err.code || 'activities_fetch_failed');
    resolvedDeps.log({ evt: 'lemlist.activities_fetch_failed', code: err.code || 'unknown' });
    return finish({ summary, window, gates: g, startedAt, outcome: 'fetch_failed' });
  }

  summary.pagesFetched = fetched.pages;
  summary.windowTruncated = fetched.truncated;

  // The server-side `type` filter is not enumerated in Lemlist's spec, so it is
  // not trusted. This ALLOW-LIST OF ONE cannot drift: it admits exactly the
  // configured type, so `linkedinVisitDone`, `linkedinInviteFailed`,
  // `linkedinSendFailed` and the rest can never be imported as sends.
  const activities = [];
  for (const a of fetched.activities) {
    summary.activitiesFetched += 1;
    if (!a || a.type !== activityType) { summary.typeMismatchDropped += 1; continue; }
    activities.push(a);
  }

  // Group by Lemlist contact so the inbox is fetched once per person, not once
  // per activity — the single largest request saving available here.
  activities.sort((x, y) => String(x.contactId || '').localeCompare(String(y.contactId || '')));

  for (const activity of activities) {
    await importActivity(activity, ctx);
  }

  return finish({ summary, window, gates: g, startedAt, outcome: 'complete' });
}

function finish({ summary, window, gates: g, startedAt, outcome }) {
  return Object.assign({
    ok: true,
    outcome,
    dryRun: g.dryRun,
    dryRunReason: g.dryRunReason,
    createEnabled: g.createEnabled,
    window,
    durationMs: Date.now() - startedAt,
  }, summary);
}

module.exports = {
  runSync,
  importActivity,
  createPerson,
  resolveBody,
  resolveOwner,
  gates,
  newSummary,
  defaultDeps,
};
