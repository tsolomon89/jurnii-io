#!/usr/bin/env node
'use strict';

/**
 * Read-only diagnosis of the booking pipeline.
 *
 * SAFETY — ZERO WRITES. Every statement runs inside a transaction whose first statement
 * is `SET TRANSACTION READ ONLY`, so this is enforced by Postgres rather than by review.
 * `--zoho` issues GET and search requests only, and always AFTER the transaction has
 * closed — holding a pooled Neon connection across a Zoho round trip would exhaust
 * `PGPOOL_MAX`.
 *
 * WHY IT EXISTS
 *
 *   Answering "is data reaching the database, and where is the Zoho chain stuck?" used to
 *   require hand-running SQL from the runbook. That gap let a live defect sit unnoticed:
 *   `getDealsForAccount` omitted the v6 `fields` parameter, Zoho returned HTTP 400, the
 *   classifier called it terminal, and every booking escalated to `manual_review` with
 *   `meeting_create_failed` — while the Lead, the Contact and the Account were all fine.
 *
 *   The output that matters is the DIAGNOSIS line per journey, which distinguishes "the
 *   chain is retrying" from "nothing is executing at all".
 *
 * USAGE
 *
 *   vercel env pull --environment=production .env.production.local
 *   node --env-file=.env.production.local booking/scripts/inspect-journey.js
 *   node --env-file=.env.production.local booking/scripts/inspect-journey.js --stuck --zoho
 *   node --env-file=.env.production.local booking/scripts/inspect-journey.js --journey=<uuid>
 *
 * EXIT CODES
 *   0  ran successfully, INCLUDING when it found stuck journeys
 *   1  the tool itself failed (no DATABASE_URL, connection refused, bad --journey)
 *   2  only with --fail-on-stuck: findings exist
 */

const db = require('../db');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const hit = argv.find((a) => a.startsWith(`${f}=`));
  return hit ? hit.slice(f.length + 1) : d;
};

const JOURNEY = val('--journey', null);
const STUCK = has('--stuck');
const RECENT = JOURNEY || STUCK ? (has('--recent') || argv.some((a) => a.startsWith('--recent=')) ? Number(val('--recent', 10)) : 0)
  : Number(val('--recent', 10));
const WANT_ZOHO = has('--zoho');
const AS_JSON = has('--json');
const FULL_EMAIL = has('--full-email');
const GRACE_SEC = Number(val('--grace', 180));
const LIMIT = Number(val('--limit', 50));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const out = (s = '') => { if (!AS_JSON) console.log(s); };
const note = (s) => { if (AS_JSON) console.error(s); else console.log(s); };

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function maskEmail(email) {
  if (!email) return '—';
  if (FULL_EMAIL) return email;
  const [user, domain] = String(email).split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}

/** Ages are measured against the DATABASE clock, never the workstation's. */
function age(ts, dbNow) {
  if (!ts) return '—';
  const delta = new Date(dbNow) - new Date(ts);
  const abs = Math.abs(delta);
  const d = Math.floor(abs / 86400000);
  const h = Math.floor((abs % 86400000) / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const parts = d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
  return delta >= 0 ? `${parts} ago` : `in ${parts}`;
}

function table(rows, columns) {
  if (!rows.length) { out('  (none)'); return; }
  const widths = columns.map((c) =>
    Math.max(c.header.length, ...rows.map((r) => String(c.get(r) ?? '').length)));
  out('  ' + columns.map((c, i) => c.header.padEnd(widths[i])).join('  '));
  out('  ' + widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) {
    out('  ' + columns.map((c, i) => String(c.get(r) ?? '').padEnd(widths[i])).join('  '));
  }
}

function renderOps(ops) {
  if (!ops || !ops.length) return '(no ops)';
  return ops.map((o) => {
    const short = o.op.replace(/^zoho_/, '').replace(/^google_/, 'g:');
    const budget = o.failure_count ? `(${o.failure_count}/${o.max_failures})` : '';
    return `${short}:${o.state}${budget}`;
  }).join(' ');
}

// ---------------------------------------------------------------------------
// The verdict engine — pure, so it can be reasoned about without a database
// ---------------------------------------------------------------------------

/** Hints for the park reasons that are routinely misread as failures. */
const PARK_HINTS = {
  awaiting_record_saved:
    'the Meeting op is waiting for zoho_status ∈ {record_saved, meeting_created, complete}; it is reactivated by Z4/Z5, not by a retry',
  awaiting_google_confirmation: 'the booking is not confirmed yet',
  awaiting_record_write: 'identity is resolved but the record write has not run',
  already_attempted: 'the at-most-once Lead update latch refuses a resend — this is correct, not a fault',
};

function diagnose(j, dbNow) {
  const ops = j.ops || [];
  const due = ops.filter((o) => o.next_retry_at && new Date(o.next_retry_at) <= new Date(dbNow));
  const overdueBy = due.length
    ? Math.max(...due.map((o) => new Date(dbNow) - new Date(o.next_retry_at))) / 1000
    : 0;

  const terminal = ops.find((o) => o.state === 'terminal');
  const unknown = ops.find((o) => o.state === 'outcome_unknown');
  const sending = ops.find((o) => o.state === 'sending'
    && o.lease_expires_at && new Date(o.lease_expires_at) > new Date(dbNow));
  const parked = ops.find((o) => o.state === 'parked');

  if (j.needs_attention) {
    return { severity: 'ATTENTION',
      verdict: `${j.needs_attention_code || 'unknown reason'} — open ${age(j.needs_attention_at, dbNow)}`,
      hint: `open reasons: ${(j.open_reasons || []).join(', ') || 'none'}` };
  }
  if (j.zoho_status === 'complete') {
    return { severity: 'OK',
      verdict: `chain complete (lead ${j.zoho_record_id || '—'}, meeting ${j.zoho_meeting_id || '—'}, deal ${j.zoho_deal_id || '—'})` };
  }
  if (!ops.length && j.zoho_status === 'not_started') {
    return { severity: 'OK', verdict: 'Page 2 never committed — nothing was started, so nothing is stuck' };
  }
  if (terminal) {
    return { severity: 'STUCK', verdict: `GAVE UP at ${terminal.op}: ${terminal.last_error_code || 'unknown'}`,
      hint: 'ensureOp cannot revive a terminal row — only a strictly newer cycle, or RT1.resume' };
  }
  if (unknown) {
    return { severity: 'DOUBT',
      verdict: `IN DOUBT since ${age(unknown.unknown_since, dbNow)}: ${unknown.op} issued a create it could not confirm`,
      hint: 'the latch forbids a resend; recovery is read-only and bounded by the deadline' };
  }
  if (sending) {
    return { severity: 'BUSY', verdict: `in flight: ${sending.op}, leased ${age(sending.lease_expires_at, dbNow)}` };
  }
  if (due.length && overdueBy > GRACE_SEC * 3) {
    const worst = due[0];
    return { severity: 'STUCK',
      verdict: `stalled at ${worst.op}, ${worst.failure_count}/${worst.max_failures} failures, due ${age(worst.next_retry_at, dbNow)}`,
      hint: 'nothing has executed it — check that the cron is firing and that CRON_SECRET matches' };
  }
  if (due.length) {
    const next = due[0];
    return { severity: 'RUNNING', verdict: `${next.op} due now, ${next.failure_count}/${next.max_failures} failures` };
  }
  if (parked) {
    return { severity: 'PARKED', verdict: `parked at ${parked.op}: ${parked.last_error_code || 'precondition unmet'}`,
      hint: PARK_HINTS[parked.last_error_code] };
  }
  return { severity: 'IDLE',
    verdict: `idle at zoho_status=${j.zoho_status} with nothing due`,
    hint: 'waiting on an external event — Google confirmation, or the Deluge conversion' };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const SQL_LIVENESS = `
  SELECT now() AS db_now,
         (SELECT count(*)  FROM booking_journey_ops WHERE next_retry_at <= now()) AS due_now,
         (SELECT count(*)  FROM booking_journeys)                                 AS journeys,
         (SELECT max(updated_at)     FROM booking_journey_ops)                    AS last_op_touch,
         (SELECT now() - max(updated_at) FROM booking_journey_ops)                AS since_last_touch`;

const OPS_JSON = `
  SELECT json_agg(json_build_object(
           'op', op, 'state', state, 'failure_count', failure_count,
           'max_failures', max_failures, 'next_retry_at', next_retry_at,
           'lease_expires_at', lease_expires_at, 'deadline_at', deadline_at,
           'unknown_since', unknown_since, 'create_attempts', create_attempts,
           'last_outcome_kind', last_outcome_kind, 'last_error_code', last_error_code)
           ORDER BY next_retry_at NULLS LAST, op)
    FROM booking_journey_ops WHERE journey_id = j.journey_id`;

const SQL_RECENT = `
  SELECT j.journey_id, j.created_at, j.email_normalized, j.pii_scrubbed_at,
         j.booking_status, j.google_status, j.zoho_status, j.zoho_record_type,
         j.lead_terminal_update_state, j.needs_attention, j.needs_attention_code,
         j.needs_attention_at, j.zoho_record_id, j.zoho_contact_id, j.zoho_account_id,
         j.zoho_meeting_id, j.zoho_deal_id, j.google_event_id,
         (${OPS_JSON}) AS ops,
         (SELECT array_agg(code) FROM booking_journey_review_reasons
           WHERE journey_id = j.journey_id AND resolved_at IS NULL) AS open_reasons
    FROM booking_journeys j
   ORDER BY j.created_at DESC
   LIMIT $1`;

// The three queries below are the runbook's §2 "Diagnosing a stuck journey" block.
// The ONLY change is '<uuid>' -> $1: interpolating a CLI argument into SQL is not
// acceptable even in a read-only script. Keep them textually in step with the runbook.
const SQL_J_OPS = `
  SELECT op, state, failure_count, crash_reclaim_count, create_attempts,
         next_retry_at, deadline_at, watch_until_at, last_outcome_kind, last_error_code
    FROM booking_journey_ops WHERE journey_id = $1 ORDER BY op`;
const SQL_J_STATE = `
  SELECT booking_status, google_outcome_state, google_status,
         cancel_intent_state, reschedule_intent_state,
         lead_terminal_update_state, zoho_status,
         needs_attention, needs_attention_code,
         manual_review_version, manual_review_applied_version, manual_review_closed_version
    FROM booking_journeys WHERE journey_id = $1`;
const SQL_J_REASONS = `
  SELECT code, generation, review_version, occurrences, first_seen_at, resolved_at
    FROM booking_journey_review_reasons WHERE journey_id = $1 ORDER BY review_version`;
const SQL_J_IDS = `
  SELECT journey_id, email_normalized, zoho_record_type, zoho_record_id, zoho_contact_id,
         zoho_account_id, zoho_deal_id, zoho_meeting_id, zoho_manual_review_task_id,
         google_event_id, google_calendar_id, slot_start_utc, slot_end_utc, created_at
    FROM booking_journeys WHERE journey_id = $1`;

const SQL_OVERDUE = `
  SELECT o.journey_id, o.op, o.state, o.failure_count, o.max_failures, o.next_retry_at,
         now() - o.next_retry_at AS overdue_by, o.last_error_code, j.zoho_status
    FROM booking_journey_ops o JOIN booking_journeys j USING (journey_id)
   WHERE o.next_retry_at <= now() - make_interval(secs => $1)
     AND (o.lease_expires_at IS NULL OR o.lease_expires_at < now())
   ORDER BY o.next_retry_at LIMIT $2`;
const SQL_LATCHED = `
  SELECT journey_id, op, state, failure_count, last_error_code, unknown_since, updated_at
    FROM booking_journey_ops
   WHERE state IN ('terminal','outcome_unknown','parked','sending')
   ORDER BY CASE state WHEN 'terminal' THEN 0 WHEN 'outcome_unknown' THEN 1
                       WHEN 'sending' THEN 2 ELSE 3 END, updated_at DESC
   LIMIT $1`;
const SQL_ATTENTION = `
  SELECT j.journey_id, j.needs_attention_code, j.needs_attention_at, j.booking_status,
         j.zoho_status, array_agg(r.code ORDER BY r.first_seen_at) AS open_reasons
    FROM booking_journeys j
    JOIN booking_journey_review_reasons r
      ON r.journey_id = j.journey_id AND r.resolved_at IS NULL
   WHERE j.needs_attention
   GROUP BY 1,2,3,4,5 ORDER BY j.needs_attention_at LIMIT $1`;
// The runbook's broken-escalation query: a crash-looping reviewer is never asked to
// report its own crash loop, so these journeys are found here and nowhere else.
const SQL_BROKEN_REVIEW = `
  SELECT journey_id FROM booking_journey_ops
   WHERE op = 'zoho_manual_review' AND state = 'terminal'`;
// zoho_lead_terminal_update is the only unreplayable call in the system (MAX_FAILURES 1),
// so its stuck states get their own section rather than being buried among the rest.
const SQL_LEAD_LATCH = `
  SELECT journey_id, lead_terminal_update_state, lead_terminal_update_attempted_at, zoho_status
    FROM booking_journeys
   WHERE lead_terminal_update_state IN ('sending','outcome_unknown','unresolved')
   ORDER BY lead_terminal_update_attempted_at LIMIT $1`;

async function load() {
  return db.withTransaction(async (tx) => {
    await tx.query('SET TRANSACTION READ ONLY');
    const doc = { liveness: (await tx.query(SQL_LIVENESS)).rows[0] };

    if (RECENT > 0) doc.recent = (await tx.query(SQL_RECENT, [RECENT])).rows;

    if (JOURNEY) {
      doc.journey = {
        identifiers: (await tx.query(SQL_J_IDS, [JOURNEY])).rows[0] || null,
        ops: (await tx.query(SQL_J_OPS, [JOURNEY])).rows,
        state: (await tx.query(SQL_J_STATE, [JOURNEY])).rows[0] || null,
        reasons: (await tx.query(SQL_J_REASONS, [JOURNEY])).rows,
      };
    }

    if (STUCK) {
      doc.stuck = {
        overdue: (await tx.query(SQL_OVERDUE, [GRACE_SEC, LIMIT])).rows,
        latched: (await tx.query(SQL_LATCHED, [LIMIT])).rows,
        attention: (await tx.query(SQL_ATTENTION, [LIMIT])).rows,
        brokenReview: (await tx.query(SQL_BROKEN_REVIEW)).rows,
        leadLatch: (await tx.query(SQL_LEAD_LATCH, [LIMIT])).rows,
      };
    }
    return doc;
  });
}

// ---------------------------------------------------------------------------
// Zoho readback — network, strictly after the transaction has closed
// ---------------------------------------------------------------------------

async function zohoReadback(rows) {
  const configured = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN']
    .every((k) => process.env[k]);
  if (!configured) { note('\nzoho: SKIPPED (ZOHO_* not set)'); return new Map(); }

  const Z = require('../integrations/zoho');
  try { await Z.getAccessToken(); } catch (e) {
    note(`\nzoho: SKIPPED (token refresh failed: ${e.code || e.message})`);
    return new Map();
  }

  const byJourney = new Map();
  // Sequential on purpose: Zoho search is throttled and a burst earns a 429.
  for (const j of rows) {
    const found = { lead: null, event: null, contacts: null, conversion: null, error: null };
    try {
      if (j.zoho_record_id) {
        // Read the STORED id. Searching unconverted Leads by email is wrong here: once
        // Deluge converts, the search returns nothing and a healthy journey would be
        // reported as having no Lead.
        //
        // A CONVERTED Lead is also not readable by id — v6 answers `{"data": []}` — so an
        // empty read plus a known Contact means converted, not missing. Reporting that as
        // NOT FOUND would point every investigation at the wrong end of the chain.
        const lead = await Z.getLead(j.zoho_record_id);
        if (lead) { found.lead = lead.id; found.conversion = Z.readConversion(lead); }
        else found.lead = j.zoho_contact_id ? 'converted' : 'NOT FOUND';
      }
      const ev = await Z.searchEventByExternalId(j.journey_id);
      found.event = ev ? ev.id : null;
      if (ev && j.zoho_meeting_id && ev.id !== j.zoho_meeting_id) {
        found.error = `MISMATCH: CRM Event ${ev.id} vs database ${j.zoho_meeting_id}`;
      }
      if (j.email_normalized && !j.pii_scrubbed_at) {
        found.contacts = (await Z.searchContactsByEmail(j.email_normalized)).length;
      }
    } catch (e) {
      found.error = `unreadable (${e.code || e.message})`;
    }
    byJourney.set(j.journey_id, found);
  }
  return byJourney;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderLiveness(l) {
  out('');
  out('WORKER LIVENESS');
  out(`  database time      ${new Date(l.db_now).toISOString()}`);
  out(`  journeys           ${l.journeys}`);
  out(`  operations due now ${l.due_now}`);
  out(`  last op touched    ${l.last_op_touch ? age(l.last_op_touch, l.db_now) : 'never'}`);
  if (Number(l.due_now) > 0 && l.last_op_touch
      && (new Date(l.db_now) - new Date(l.last_op_touch)) > 5 * 60_000) {
    out('  >> work is due but nothing has been touched in over 5 minutes — the worker is probably not running.');
  }
}

function renderRecent(rows, dbNow, zoho) {
  out('');
  out(`RECENT JOURNEYS (${rows.length})`);
  table(rows, [
    { header: 'created', get: (r) => age(r.created_at, dbNow) },
    { header: 'email', get: (r) => maskEmail(r.email_normalized) },
    { header: 'booking', get: (r) => r.booking_status },
    { header: 'zoho', get: (r) => r.zoho_status },
    { header: 'lead-upd', get: (r) => r.lead_terminal_update_state },
    { header: 'lead', get: (r) => (r.zoho_record_id ? 'y' : '·') },
    { header: 'contact', get: (r) => (r.zoho_contact_id ? 'y' : '·') },
    { header: 'meeting', get: (r) => (r.zoho_meeting_id ? 'y' : '·') },
    { header: 'deal', get: (r) => (r.zoho_deal_id ? 'y' : '·') },
  ]);

  for (const r of rows) {
    const d = diagnose(r, dbNow);
    out('');
    out(`  ${r.journey_id}  ${maskEmail(r.email_normalized)}`);
    out(`    ops       ${renderOps(r.ops)}`);
    out(`    ${d.severity.padEnd(9)} ${d.verdict}`);
    if (d.hint) out(`              → ${d.hint}`);
    const z = zoho && zoho.get(r.journey_id);
    if (z) {
      out(`    zoho      lead=${z.lead || '—'} event=${z.event || '—'} contacts=${z.contacts ?? '—'}`
        + (z.conversion ? ` converted=${z.conversion.converted}` : ''));
      if (z.error) out(`              !! ${z.error}`);
    }
  }
}

function renderJourney(j, dbNow) {
  out('');
  out('JOURNEY');
  if (!j.state) { out('  (no such journey)'); return; }
  out('  -- identifiers --');
  for (const [k, v] of Object.entries(j.identifiers || {})) {
    out(`    ${k.padEnd(28)} ${k === 'email_normalized' ? maskEmail(v) : (v ?? '—')}`);
  }
  out('  -- state --');
  for (const [k, v] of Object.entries(j.state)) out(`    ${k.padEnd(28)} ${v ?? '—'}`);
  out('  -- operations --');
  table(j.ops, [
    { header: 'op', get: (r) => r.op },
    { header: 'state', get: (r) => r.state },
    { header: 'fail', get: (r) => r.failure_count },
    { header: 'crash', get: (r) => r.crash_reclaim_count },
    { header: 'creates', get: (r) => r.create_attempts },
    { header: 'next', get: (r) => age(r.next_retry_at, dbNow) },
    { header: 'outcome', get: (r) => r.last_outcome_kind ?? '—' },
    { header: 'error', get: (r) => r.last_error_code ?? '—' },
  ]);
  out('  -- review reasons --');
  table(j.reasons, [
    { header: 'code', get: (r) => r.code },
    { header: 'gen', get: (r) => r.generation },
    { header: 'ver', get: (r) => r.review_version },
    { header: 'seen', get: (r) => r.occurrences },
    { header: 'first', get: (r) => age(r.first_seen_at, dbNow) },
    { header: 'resolved', get: (r) => (r.resolved_at ? age(r.resolved_at, dbNow) : 'OPEN') },
  ]);
}

function renderStuck(s, dbNow) {
  out('');
  out(`OVERDUE OPERATIONS (more than ${GRACE_SEC}s past due, unleased)`);
  table(s.overdue, [
    { header: 'journey', get: (r) => r.journey_id.slice(0, 8) },
    { header: 'op', get: (r) => r.op },
    { header: 'state', get: (r) => r.state },
    { header: 'fail', get: (r) => `${r.failure_count}/${r.max_failures}` },
    { header: 'overdue', get: (r) => age(r.next_retry_at, dbNow) },
    { header: 'error', get: (r) => r.last_error_code ?? '—' },
  ]);

  out('');
  out('LATCHED / IN-DOUBT / PARKED OPERATIONS');
  table(s.latched, [
    { header: 'journey', get: (r) => r.journey_id.slice(0, 8) },
    { header: 'op', get: (r) => r.op },
    { header: 'state', get: (r) => r.state },
    { header: 'error', get: (r) => r.last_error_code ?? '—' },
    { header: 'updated', get: (r) => age(r.updated_at, dbNow) },
  ]);

  out('');
  out('JOURNEYS NEEDING ATTENTION');
  table(s.attention, [
    { header: 'journey', get: (r) => r.journey_id },
    { header: 'code', get: (r) => r.needs_attention_code ?? '—' },
    { header: 'since', get: (r) => age(r.needs_attention_at, dbNow) },
    { header: 'open reasons', get: (r) => (r.open_reasons || []).join(', ') },
  ]);

  if (s.brokenReview.length) {
    out('');
    out('!! ESCALATION CHANNEL ITSELF BROKEN (zoho_manual_review terminal)');
    s.brokenReview.forEach((r) => out(`   · ${r.journey_id}`));
    out('   correlate with the log event worker.crash_loop.review_unavailable');
  }
  if (s.leadLatch.length) {
    out('');
    out('!! LEAD TERMINAL UPDATE STUCK MID-FLIGHT (never resendable — MAX_FAILURES is 1)');
    table(s.leadLatch, [
      { header: 'journey', get: (r) => r.journey_id },
      { header: 'state', get: (r) => r.lead_terminal_update_state },
      { header: 'attempted', get: (r) => age(r.lead_terminal_update_attempted_at, dbNow) },
    ]);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!db.isConfigured()) {
    console.error('DATABASE_URL is not set.\n'
      + '  vercel env pull --environment=production .env.production.local\n'
      + '  node --env-file=.env.production.local booking/scripts/inspect-journey.js');
    process.exitCode = 1;
    return;
  }
  if (JOURNEY && !UUID_RE.test(JOURNEY)) {
    console.error(`--journey must be a UUID; got "${JOURNEY}"`);
    process.exitCode = 1;
    return;
  }

  const doc = await load();
  const dbNow = doc.liveness.db_now;

  let zoho = null;
  if (WANT_ZOHO && doc.recent) zoho = await zohoReadback(doc.recent);

  if (AS_JSON) {
    if (zoho) doc.recent.forEach((r) => { r.zoho = zoho.get(r.journey_id) || null; });
    if (doc.recent) doc.recent.forEach((r) => { r.diagnosis = diagnose(r, dbNow); });
    console.log(JSON.stringify(doc, null, 2));
  } else {
    renderLiveness(doc.liveness);
    if (doc.recent) renderRecent(doc.recent, dbNow, zoho);
    if (doc.journey) renderJourney(doc.journey, dbNow);
    if (doc.stuck) renderStuck(doc.stuck, dbNow);
    out('');
  }

  if (has('--fail-on-stuck')) {
    const findings = (doc.stuck && (doc.stuck.overdue.length || doc.stuck.attention.length
      || doc.stuck.brokenReview.length || doc.stuck.leadLatch.length))
      || (doc.recent || []).some((r) => ['STUCK', 'ATTENTION', 'DOUBT'].includes(diagnose(r, dbNow).severity));
    if (findings) process.exitCode = 2;
  }
}

main()
  .catch((err) => { console.error(`ERROR: ${err.message}`); process.exitCode = 1; })
  .finally(() => db.close().catch(() => {}));
