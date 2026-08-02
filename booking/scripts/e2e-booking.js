#!/usr/bin/env node
'use strict';

/**
 * End-to-end booking verification.
 *
 * SAFETY — READ THIS BEFORE RUNNING WITH `--allow-live-crm-writes`.
 *
 *   The full run drives a real booking through the real deployment. It inserts a real
 *   Google Calendar event on the CONFIGURED booking calendar (this path goes through
 *   `/api/v1/bookings`, so unlike `verify-prerequisites.js` it cannot be redirected to a
 *   disposable calendar), creates a real Zoho Lead, and fires the ONE workflow-enabled
 *   Lead update. That update starts Deluge `processLead`, which creates a Contact, an
 *   Account and a Deal that THIS SCRIPT CANNOT DELETE — the Account in particular may be
 *   matched to a pre-existing real company rather than created. Those ids are reported
 *   for manual removal, never deleted automatically.
 *
 *   Without the flag the script is HTTP-only: today's status-code smoke test, plus the
 *   database assertions, and it stops before the booking is placed.
 *
 * WHY IT EXISTS
 *
 *   Nothing else in the repo asserts that a booking produced a Zoho record. The unit
 *   suites stub the network, `tests/db/handlers.test.js` asserts Zoho is NOT called, and
 *   the old preview smoke test only checked HTTP status codes. A live defect
 *   (`getDealsForAccount` omitting the v6 `fields` parameter) therefore suppressed every
 *   Meeting in production while every test stayed green.
 *
 *   This script closes that gap: it drives the worker itself rather than waiting for
 *   cron, so "is the chain correct" is isolated from "is the cron firing".
 *
 * USAGE
 *
 *   vercel env pull --environment=production .env.production.local
 *
 *   # HTTP + DB only, places no booking
 *   node --env-file=.env.production.local booking/scripts/e2e-booking.js
 *
 *   # the full chain, creating real CRM records
 *   node --env-file=.env.production.local booking/scripts/e2e-booking.js \
 *     --allow-live-crm-writes
 *
 * EXIT CODES
 *   0  every assertion passed (warnings allowed) and nothing was left behind
 *   1  an assertion failed, or a resource could not be cleaned up
 *   2  misconfiguration — missing env, unreachable database, missing acknowledgement
 *   3  the deployment and this script are pointed at DIFFERENT databases
 *   4  timed out driving the worker without reaching a terminal state
 */

const https = require('https');
const http = require('http');

const db = require('../db');
const Z = require('../integrations/zoho');
const G = require('../integrations/google');

// ---------------------------------------------------------------------------
// Arguments and configuration
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const hit = argv.find((a) => a.startsWith(`${f}=`));
  return hit ? hit.slice(f.length + 1) : d;
};

const LIVE = has('--allow-live-crm-writes');
const KEEP = has('--keep');
const BASE_URL = process.env.BASE_URL || process.env.PREVIEW_URL || '';
const CRON_SECRET = process.env.CRON_SECRET || '';
const EMAIL_DOMAIN = process.env.E2E_TEST_EMAIL_DOMAIN || 'jurnii-e2e.dev';

const MAX_PASSES = Number(val('--passes', process.env.E2E_MAX_PASSES || 40));
const PASS_DELAY_MS = Number(val('--delay', process.env.E2E_PASS_DELAY_MS || 5000));
const BUDGET_MS = Number(val('--budget', process.env.E2E_BUDGET_MS || 300_000));

// ---------------------------------------------------------------------------
// Reporting — the vocabulary `verify-prerequisites.js` established
// ---------------------------------------------------------------------------

const results = [];
const leaked = [];
const undeletable = [];

const record = (state, name, detail = '') => {
  results.push({ state, name, detail });
  console.log(`[${state.padEnd(5)}] ${name}${detail ? ` — ${detail}` : ''}`);
};
const pass = (n, d) => record('PASS', n, d);
const fail = (n, d) => record('FAIL', n, d);
const warn = (n, d) => record('WARN', n, d);
const block = (n, d) => record('BLOCK', n, d);

class Abort extends Error {
  constructor(code, message) { super(message); this.exitCode = code; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = (url.protocol === 'https:' ? https : http).request(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) { /* non-JSON is reported raw */ }
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

/**
 * One read covering the journey and every op. `now()` comes from the database so
 * ages are never measured against a workstation clock that may be skewed.
 */
async function snapshot(journeyId) {
  return db.withTransaction(async (tx) => {
    await tx.query('SET TRANSACTION READ ONLY');
    const r = await tx.query(
      `SELECT j.journey_id, j.email_normalized, j.booking_status, j.google_status,
              j.zoho_status, j.lead_terminal_update_state, j.needs_attention,
              j.needs_attention_code, j.zoho_record_id, j.zoho_contact_id,
              j.zoho_account_id, j.zoho_deal_id, j.zoho_meeting_id,
              j.zoho_manual_review_task_id, j.google_event_id, j.google_calendar_id,
              j.slot_start_utc, j.slot_end_utc,
              (SELECT json_agg(json_build_object(
                        'op', op, 'state', state, 'f', failure_count, 'max', max_failures,
                        'next', next_retry_at, 'err', last_error_code,
                        'attempts', create_attempts) ORDER BY op)
                 FROM booking_journey_ops WHERE journey_id = j.journey_id) AS ops,
              (SELECT min(next_retry_at) FROM booking_journey_ops
                WHERE journey_id = j.journey_id AND next_retry_at IS NOT NULL) AS next_due,
              (SELECT array_agg(code) FROM booking_journey_review_reasons
                WHERE journey_id = j.journey_id AND resolved_at IS NULL) AS open_reasons,
              now() AS db_now
         FROM booking_journeys j WHERE j.journey_id = $1`,
      [journeyId]
    );
    return r.rows[0] || null;
  });
}

/** A compact, comparable rendering of where the chain is. */
function fingerprint(snap) {
  const ops = (snap.ops || []).map((o) => `${o.op}:${o.state}:${o.f}`).sort().join(' ');
  return `${snap.zoho_status}|${snap.booking_status}|${ops}`;
}

function renderOps(snap) {
  return (snap.ops || [])
    .map((o) => `${o.op.replace(/^zoho_|^google_/, '')}:${o.state}${o.f ? `(${o.f}/${o.max})` : ''}`)
    .join(' ');
}

// ---------------------------------------------------------------------------
// Preflight
// ---------------------------------------------------------------------------

async function preflight() {
  const missing = [];
  if (!BASE_URL) missing.push('BASE_URL (or PREVIEW_URL)');
  if (!CRON_SECRET) missing.push('CRON_SECRET');
  if (!db.isConfigured()) missing.push('DATABASE_URL');
  if (missing.length) {
    throw new Abort(2,
      `Missing required configuration: ${missing.join(', ')}\n\n`
      + '  vercel env pull --environment=production .env.production.local\n'
      + '  node --env-file=.env.production.local booking/scripts/e2e-booking.js');
  }

  const info = await db.withTransaction(async (tx) => {
    await tx.query('SET TRANSACTION READ ONLY');
    const r = await tx.query(
      `SELECT current_database() AS dbname, inet_server_addr()::text AS host,
              to_regclass('booking_journeys') IS NOT NULL AS schema_ok`);
    return r.rows[0];
  }).catch((e) => { throw new Abort(2, `Database unreachable: ${e.message}`); });

  if (!info.schema_ok) {
    throw new Abort(2, `\`booking_journeys\` does not exist in "${info.dbname}" — wrong database, or migrations were never run.`);
  }

  console.log(`Target       : ${BASE_URL}`);
  console.log(`Database     : ${info.dbname}`);
  console.log(`Mode         : ${LIVE ? 'FULL E2E — creates real CRM records' : 'HTTP + DB only (pass --allow-live-crm-writes for the full chain)'}`);
  console.log('-'.repeat(72));
}

// ---------------------------------------------------------------------------
// The worker drive loop — the core of this script
// ---------------------------------------------------------------------------

/**
 * Drive `/api/v1/internal/jobs/run` until the journey reaches a terminal state.
 *
 * Concurrent Vercel cron passes are safe (`CLAIM_SQL` uses FOR UPDATE SKIP LOCKED),
 * but they mean `claimed: 0` can mean "the cron got there first" rather than
 * "nothing to do", so the DB snapshot — not the endpoint response — is the verdict.
 */
async function driveWorker(journeyId) {
  const startedAt = Date.now();
  let lastPrint = '';
  let idlePasses = 0;

  for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
    if (Date.now() - startedAt > BUDGET_MS) {
      return { reached: 'TIMEOUT', reason: `time budget ${BUDGET_MS}ms exhausted after ${pass - 1} passes` };
    }

    const res = await request('POST', '/api/v1/internal/jobs/run', {},
      { Authorization: `Bearer ${CRON_SECRET}` });
    if (res.status === 401) {
      return { reached: 'AUTH', reason: 'CRON_SECRET was rejected — this is a credential problem, not a worker failure' };
    }
    if (res.status !== 200) {
      return { reached: 'WORKER_ERROR', reason: `jobs/run returned ${res.status}: ${res.body.slice(0, 200)}` };
    }

    const snap = await snapshot(journeyId);
    if (!snap) return { reached: 'GONE', reason: 'the journey row disappeared mid-run' };

    // Print only on change, so 40 passes do not emit 40 identical blocks.
    const fp = fingerprint(snap);
    if (fp !== lastPrint) {
      const ran = res.json || {};
      console.log(`  pass ${String(pass).padStart(2)} (claimed ${ran.claimed ?? '?'}, ran ${ran.ran ?? '?'})  `
        + `zoho_status=${snap.zoho_status}  [${renderOps(snap)}]`);
      lastPrint = fp;
      idlePasses = 0;
    } else {
      idlePasses += 1;
    }

    if (snap.zoho_status === 'complete') return { reached: 'COMPLETE', snap };
    if (snap.needs_attention || ['manual_review', 'failed'].includes(snap.zoho_status)) {
      return { reached: 'ESCALATED', snap,
        reason: `${snap.needs_attention_code || snap.zoho_status} — open reasons: ${(snap.open_reasons || []).join(', ') || 'none'}` };
    }
    if ((snap.ops || []).some((o) => o.state === 'terminal')) {
      const t = snap.ops.find((o) => o.state === 'terminal');
      return { reached: 'ESCALATED', snap, reason: `${t.op} gave up: ${t.err || 'unknown'}` };
    }
    // The Meeting exists and only the Deal link is outstanding: a Deal that Deluge has
    // not created yet is a legitimate wait, not a failure.
    if (snap.zoho_status === 'meeting_created' && !snap.next_due && idlePasses >= 3) {
      return { reached: 'PARTIAL', snap, reason: 'Meeting created; Deal link still outstanding' };
    }
    if (!snap.next_due && idlePasses >= 3) {
      return { reached: 'STALLED', snap, reason: `nothing scheduled at zoho_status=${snap.zoho_status}` };
    }

    const waitMs = snap.next_due
      ? Math.min(Math.max(new Date(snap.next_due) - new Date(snap.db_now), 0) + 1000, PASS_DELAY_MS)
      : PASS_DELAY_MS;
    await sleep(waitMs);
  }
  return { reached: 'TIMEOUT', reason: `${MAX_PASSES} passes exhausted` };
}

// ---------------------------------------------------------------------------
// Zoho end-state assertions — read-only
// ---------------------------------------------------------------------------

async function assertZohoEndState(journeyId, email, snap) {
  // Lead — read by the STORED id. `searchUnconvertedLeadsByEmail` is wrong here:
  // once Deluge converts, it returns nothing and a healthy journey would fail.
  if (!snap.zoho_record_id) {
    fail('zoho: Lead created', 'no zoho_record_id on the journey');
  } else {
    try {
      const lead = await Z.getLead(snap.zoho_record_id);
      // A CONVERTED Lead is not readable by id — v6 answers `{"data": []}`. That is the
      // success case, not absence, so it is only a failure when no Contact exists either.
      if (!lead && snap.zoho_contact_id) {
        pass('zoho: Lead created', `id ${snap.zoho_record_id}, converted (no longer readable by id)`);
      } else if (!lead) {
        fail('zoho: Lead created', `id ${snap.zoho_record_id} not readable and no Contact exists`);
      } else if ((lead.Email || '').toLowerCase() !== email.toLowerCase()) {
        fail('zoho: Lead created', `email mismatch: CRM has ${lead.Email}`);
      } else {
        const conv = Z.readConversion(lead);
        pass('zoho: Lead created', `id ${lead.id}, converted=${conv.converted}`);
        if (conv.converted) {
          pass('zoho: Deluge processLead converted the Lead',
            `contact=${conv.contactId} account=${conv.accountId} deal=${conv.dealId || 'none'}`);
        } else if (snap.lead_terminal_update_state === 'accepted') {
          warn('zoho: Deluge processLead converted the Lead', 'update accepted but no conversion yet');
        }
      }
    } catch (e) {
      fail('zoho: Lead created', `${e.code || e.message}`);
    }
  }

  // Meeting — by correlation key. Zoho search indexing lags, so absence is retried
  // before it is believed, and a stored id with a lagging index is a WARN not a FAIL.
  let event = null;
  for (let attempt = 1; attempt <= 3 && !event; attempt += 1) {
    try { event = await Z.searchEventByExternalId(journeyId); } catch (e) {
      fail('zoho: Meeting created', `search failed: ${e.code || e.message}`);
      break;
    }
    if (!event && attempt < 3) await sleep(10_000);
  }
  if (event) {
    if (event.id === snap.zoho_meeting_id) {
      pass('zoho: Meeting created', `id ${event.id}, Ext_Calendar_Booking_ID matches`);
    } else {
      fail('zoho: Meeting created',
        `CRM has Event ${event.id} but the database recorded ${snap.zoho_meeting_id || 'none'}`);
    }
  } else if (snap.zoho_meeting_id) {
    warn('zoho: Meeting created', `database has ${snap.zoho_meeting_id} but search has not indexed it yet`);
  } else {
    fail('zoho: Meeting created', 'no Meeting exists and none was recorded');
  }

  // Contact — the thing the operator actually looks for in the CRM.
  if (snap.zoho_contact_id) {
    try {
      const contact = await Z.getContact(snap.zoho_contact_id);
      if (contact) pass('zoho: Contact exists', `id ${contact.id}, account=${Z.accountIdOfContact(contact) || 'none'}`);
      else fail('zoho: Contact exists', `id ${snap.zoho_contact_id} not readable`);
    } catch (e) {
      fail('zoho: Contact exists', `${e.code || e.message}`);
    }
  } else {
    warn('zoho: Contact exists', 'no contact discovered yet (Deluge conversion pending)');
  }

  if (snap.zoho_deal_id) pass('zoho: Deal linked to the Meeting', `id ${snap.zoho_deal_id}`);
  else warn('zoho: Deal linked to the Meeting', 'not linked — no matching product Deal resolved');

  return event;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * `Z.requestZoho` is used directly rather than adding delete helpers to
 * `integrations/zoho/index.js`. That module is the production request and worker
 * surface, and its readable guarantee is that it writes Leads, Events and Tasks only.
 * Putting a destructive verb there would place it one autocomplete away from a worker
 * handler. `verify-prerequisites.js` set this precedent for Tasks.
 */
async function zohoDelete(module, id) {
  await Z.requestZoho('DELETE', `/crm/v6/${module}/${id}`);
}

async function cleanup(journeyId, snap) {
  if (!snap) return;

  const attempt = async (label, fn) => {
    try { await fn(); console.log(`  removed ${label}`); }
    catch (e) { leaked.push(`${label} — ${e.code || e.message}`); }
  };

  console.log('\nCleaning up…');

  if (snap.zoho_meeting_id) await attempt(`Zoho Event ${snap.zoho_meeting_id}`, () => zohoDelete('Events', snap.zoho_meeting_id));
  if (snap.zoho_manual_review_task_id) {
    await attempt(`Zoho Task ${snap.zoho_manual_review_task_id}`, () => zohoDelete('Tasks', snap.zoho_manual_review_task_id));
  }

  // A converted Lead is kept: deleting it does not remove the Contact, Account or Deal
  // it produced, and it destroys the only audit trail linking them to this run.
  if (snap.zoho_record_id) {
    let converted = false;
    try { converted = Z.readConversion(await Z.getLead(snap.zoho_record_id)).converted; } catch (_) { /* treat as unconverted */ }
    if (converted) undeletable.push(`Lead ${snap.zoho_record_id} (converted — deleting it would orphan the Contact/Account/Deal)`);
    else await attempt(`Zoho Lead ${snap.zoho_record_id}`, () => zohoDelete('Leads', snap.zoho_record_id));
  }

  // Never deleted: Node did not create these, and an Account may have been MATCHED to a
  // pre-existing real company rather than created for this run.
  if (snap.zoho_contact_id) undeletable.push(`Contact ${snap.zoho_contact_id}`);
  if (snap.zoho_account_id) undeletable.push(`Account ${snap.zoho_account_id}`);
  if (snap.zoho_deal_id) undeletable.push(`Deal ${snap.zoho_deal_id}`);

  if (snap.google_event_id && snap.google_calendar_id) {
    // The calendar id comes from the row, so this can never cancel on the wrong calendar.
    await attempt(`Google event ${snap.google_event_id}`,
      () => G.cancelEvent(snap.google_calendar_id, snap.google_event_id));
  }

  // Last: every other booking table cascades from this row, so one statement is the
  // whole database cleanup, and it also frees the slot and the unique email index.
  await attempt(`database journey ${journeyId}`, () => db.withTransaction((tx) =>
    tx.query('DELETE FROM booking_journeys WHERE journey_id = $1', [journeyId])));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await preflight();

  const stamp = Date.now();
  const email = `e2e-${stamp}@${EMAIL_DOMAIN}`;
  let journeyId = null;
  let snap = null;

  try {
    // P1 — the manage route is served
    const manage = await request('GET', '/manage.html');
    if (manage.status === 200 && manage.body.includes('Jurnii')) pass('http: manage.html serves');
    else fail('http: manage.html serves', `status ${manage.status}`);

    // P2 — Page 1, and the mismatch tripwire
    const p1 = await request('POST', '/api/v1/submissions/start', {
      email, firstName: 'E2E', lastName: 'Verifier', company: 'Jurnii E2E Ltd',
      jobTitleRaw: 'Automation', countryIso2: 'GB', productInterest: 'Jurnii 360',
    });
    if (p1.status !== 200 || !p1.json || !p1.json.journeyId) {
      throw new Abort(1, `Page 1 failed: ${p1.status} ${p1.body.slice(0, 300)}`);
    }
    journeyId = p1.json.journeyId;
    const flowToken = p1.json.token || p1.json.flowToken;
    pass('http: Page 1 accepted', `journeyId=${journeyId}`);

    let seen = null;
    for (let i = 0; i < 3 && !seen; i += 1) { seen = await snapshot(journeyId); if (!seen) await sleep(1000); }
    if (!seen) {
      throw new Abort(3,
        `The API returned journeyId ${journeyId}, but the database this script can see has no such row.\n`
        + `  The deployment at ${BASE_URL} writes to a DIFFERENT database than DATABASE_URL points at.\n`
        + '  Every assertion after this point would be meaningless. Compare `vercel env ls` against your DATABASE_URL.');
    }
    pass('db: journey row committed', `booking_status=${seen.booking_status}`);

    // P3 — Page 2 arms the outbox
    const p2 = await request('PATCH', `/api/v1/submissions/${journeyId}`, {
      company: 'Jurnii E2E Ltd', jobTitle: 'Automation', countryIso2: 'GB',
      dialCode: '+44', nationalNumber: '7700900123', productInterest: 'Jurnii 360',
    }, { Authorization: `Bearer ${flowToken}` });
    if (p2.status !== 200 || !p2.json || p2.json.step !== 2) {
      throw new Abort(1, `Page 2 failed: ${p2.status} ${p2.body.slice(0, 300)}`);
    }
    const token = p2.json.token || flowToken;
    snap = await snapshot(journeyId);
    const armed = (snap.ops || []).some((o) => o.op === 'zoho_identity_resolve');
    if (snap.zoho_status === 'pending' && armed) pass('db: Page 2 armed zoho_identity_resolve');
    else fail('db: Page 2 armed zoho_identity_resolve', `zoho_status=${snap.zoho_status}, ops=[${renderOps(snap)}]`);

    // P4 — a real slot from the real calendar
    const avail = await request('GET', '/api/v1/availability');
    const slots = (avail.json && avail.json.slots) || [];
    if (avail.status === 200 && slots.length) pass('http: availability', `${slots.length} slots`);
    else fail('http: availability', `status ${avail.status}, ${slots.length} slots`);

    if (!LIVE) {
      block('booking + CRM chain', 'needs --allow-live-crm-writes (creates real Google and Zoho records)');
      return;
    }
    if (!slots.length) throw new Abort(1, 'no bookable slot available; cannot continue');

    // P5 — the booking
    const slot = slots[Math.min(2, slots.length - 1)];
    const booking = await request('POST', '/api/v1/bookings',
      { journeyId, slotStart: slot.start, slotEnd: slot.end },
      { Authorization: `Bearer ${token}` });
    if (![200, 202].includes(booking.status)) {
      throw new Abort(1, `Booking failed: ${booking.status} ${booking.body.slice(0, 300)}`);
    }
    snap = await snapshot(journeyId);
    pass('http: booking placed', `${booking.status}, slot ${slot.start}, booking_status=${snap.booking_status}`);

    // P6 — drive the chain
    console.log('\nDriving the worker…');
    const outcome = await driveWorker(journeyId);
    snap = outcome.snap || await snapshot(journeyId);

    if (outcome.reached === 'COMPLETE') pass('chain: reached zoho_status=complete');
    else if (outcome.reached === 'PARTIAL') warn('chain: reached zoho_status=meeting_created', outcome.reason);
    else if (outcome.reached === 'TIMEOUT') { fail('chain: reached a terminal state', outcome.reason); process.exitCode = 4; }
    else fail('chain: reached a terminal state', `${outcome.reached}: ${outcome.reason}`);

    // P7 — what is actually in the CRM
    console.log('');
    await assertZohoEndState(journeyId, email, snap);
  } finally {
    // Cleanup is skipped after a failure unless forced: cleaning up after a failed run
    // destroys the only reproduction there was.
    const failed = results.some((r) => r.state === 'FAIL');
    if (journeyId && LIVE) {
      snap = await snapshot(journeyId).catch(() => snap);
      if (KEEP) console.log('\n--keep: leaving every record in place.');
      else if (failed && !has('--force-cleanup')) {
        console.log('\nRun FAILED — cleanup skipped so the state stays inspectable. Re-run with --force-cleanup to remove it.');
        if (snap) undeletable.push(`journey ${journeyId} (database row retained for diagnosis)`);
      } else {
        await cleanup(journeyId, snap);
      }
    }

    const counts = results.reduce((a, r) => { a[r.state] = (a[r.state] || 0) + 1; return a; }, {});
    console.log(`\n${'-'.repeat(72)}`);
    console.log(`Summary: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing ran'}`);

    if (leaked.length) {
      console.log('\n!! DISPOSABLE RESOURCES NOT CLEANED UP — remove these by hand:');
      leaked.forEach((l) => console.log(`   · ${l}`));
    }
    if (undeletable.length) {
      console.log('\n!! CREATED BY ZOHO DELUGE OR RETAINED DELIBERATELY — remove by hand if unwanted:');
      undeletable.forEach((l) => console.log(`   · ${l}`));
    }
    await db.close().catch(() => {});
  }
}

main()
  .then(() => {
    if (process.exitCode) return;
    process.exitCode = (results.some((r) => r.state === 'FAIL') || leaked.length) ? 1 : 0;
  })
  .catch((err) => {
    console.error(`\n${err instanceof Abort ? '' : 'UNEXPECTED '}ERROR: ${err.message}`);
    process.exitCode = err instanceof Abort ? err.exitCode : 1;
    return db.close().catch(() => {});
  });
