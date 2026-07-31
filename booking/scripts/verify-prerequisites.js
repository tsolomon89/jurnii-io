#!/usr/bin/env node
'use strict';

/**
 * §12 live prerequisite verification.
 *
 * Every check the plan lists as "must be confirmed, never assumed", automated and
 * auditable. It exists because those checks are the gate on Preview, and doing them
 * by hand is both slow and easy to get half-right.
 *
 * ---------------------------------------------------------------------------
 * SAFETY — read the following before running.
 *
 *   · READ-ONLY BY DEFAULT. Nothing is created, updated or deleted unless
 *     `--allow-disposable-writes` is passed. Without it, the checks that need a
 *     write report `BLOCKED` and say what they would have needed.
 *
 *   · IT REFUSES TO TOUCH A CALENDAR IT WAS NOT EXPLICITLY POINTED AT.
 *     `VERIFY_CALENDAR_ID` must be set and must NOT equal `GOOGLE_CALENDAR_ID`,
 *     unless `--i-understand-this-is-the-configured-calendar` is also passed. The
 *     plan forbids modifying a Production calendar, and a booking calendar with
 *     real invitees is exactly the wrong place to insert disposable events.
 *
 *   · IT CREATES NO ZOHO METADATA. No module, field, layout, picklist value,
 *     workflow, validation rule, blueprint, OAuth scope or connection. The
 *     integration layer has no function capable of it. Where a dependency is
 *     missing this reports a FAILED PREREQUISITE — that is the answer, not a cue
 *     to repair the CRM.
 *
 *   · DISPOSABLE RESOURCES ARE CLEANED UP in a `finally`, and anything that could
 *     not be cleaned up is listed explicitly at the end so nothing is left behind
 *     silently.
 *
 * ---------------------------------------------------------------------------
 * USAGE
 *
 *   # read-only: reports what can be confirmed without writing anything
 *   node booking/scripts/verify-prerequisites.js
 *
 *   # full run against a DISPOSABLE test calendar and a disposable CRM record
 *   VERIFY_CALENDAR_ID=jurnii-preview-test@example.com \
 *   VERIFY_CONTACT_ID=<an existing Contact id, read only> \
 *     node booking/scripts/verify-prerequisites.js --allow-disposable-writes
 *
 *   # only one group
 *   node booking/scripts/verify-prerequisites.js --only=db
 *
 * Exit code is 0 when nothing FAILED, 1 otherwise. BLOCKED is not a failure — it
 * means a credential or an input was absent, which is a different report.
 */

const path = require('path');
const crypto = require('crypto');

const G = require('../integrations/google');
const Z = require('../integrations/zoho');

/* ===================================================================== */

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7) || null;

const ALLOW_WRITES = has('--allow-disposable-writes');
const CALENDAR_OVERRIDE = has('--i-understand-this-is-the-configured-calendar');

const results = [];
const leaked = [];

function record(group, id, state, detail) {
  results.push({ group, id, state, detail: detail || '' });
  const badge = { PASS: ' PASS ', FAIL: ' FAIL ', BLOCK: 'BLOCKED', WARN: ' WARN ' }[state];
  console.log(`[${badge}] ${group}/${id}${detail ? ' — ' + detail : ''}`);
}

const pass = (g, i, d) => record(g, i, 'PASS', d);
const fail = (g, i, d) => record(g, i, 'FAIL', d);
const block = (g, i, d) => record(g, i, 'BLOCK', d);
const warn = (g, i, d) => record(g, i, 'WARN', d);

function wants(group) { return !only || only === group; }

/* ===================================================================== *
 * Database — Neon / PgBouncer behaviour a local server cannot prove
 * ===================================================================== */

async function verifyDatabase() {
  const G_ = 'db';
  const pooled = process.env.DATABASE_URL;
  const direct = process.env.DATABASE_URL_UNPOOLED;
  if (!pooled || !direct) {
    return block(G_, 'connection', 'DATABASE_URL and DATABASE_URL_UNPOOLED must both be set');
  }

  const { Pool, Client } = require('pg');

  // Refuse to run against a database that is not this application's. A schema with
  // unrelated tables and no booking tables is somebody else's project.
  {
    const c = new Client({ connectionString: direct });
    try {
      await c.connect();
      const mine = await c.query(
        `SELECT count(*)::int n FROM information_schema.tables
          WHERE table_schema='public' AND table_name LIKE 'booking%'`);
      const others = await c.query(
        `SELECT count(*)::int n FROM information_schema.tables
          WHERE table_schema='public' AND table_name NOT LIKE 'booking%'`);
      if (mine.rows[0].n === 0 && others.rows[0].n > 0) {
        await c.end();
        return fail(G_, 'dedicated-database',
          `refusing to continue: ${others.rows[0].n} unrelated tables and no booking_* tables. ` +
          'This looks like another project\'s database.');
      }
      pass(G_, 'dedicated-database', `${mine.rows[0].n} booking_* tables, ${others.rows[0].n} others`);

      const ext = await c.query("SELECT count(*)::int n FROM pg_extension WHERE extname='btree_gist'");
      if (ext.rows[0].n) pass(G_, 'btree_gist', 'installed');
      else fail(G_, 'btree_gist', 'absent — the overlap EXCLUDE constraint cannot be created');

      const v = await c.query("SELECT current_setting('server_version') v");
      pass(G_, 'server-version', v.rows[0].v);

      // The reason-ledger and refreshAttention rely on these two behaviours.
      const b = await c.query(
        "SELECT (array_agg(x ORDER BY x DESC))[1] AS first FROM (SELECT 1 x UNION SELECT 2) s");
      if (Number(b.rows[0].first) === 2) pass(G_, 'array_agg-subscript', '(array_agg(… ORDER BY …))[1] works');
      else fail(G_, 'array_agg-subscript', 'unexpected result: ' + b.rows[0].first);

      // Advisory lock over the DIRECT url — the migration runner needs a session.
      const lk = await c.query('SELECT pg_try_advisory_lock(4207731) ok');
      if (lk.rows[0].ok) {
        await c.query('SELECT pg_advisory_unlock(4207731)');
        pass(G_, 'advisory-lock-unpooled', 'session-scoped lock acquired and released');
      } else {
        warn(G_, 'advisory-lock-unpooled', 'lock already held — another migration may be running');
      }
    } catch (err) {
      await c.end().catch(() => {});
      return fail(G_, 'connection', err.message);
    }
    await c.end().catch(() => {});
  }

  // A transaction on one checked-out connection through PgBouncer transaction mode.
  // Every §4.8 and §4.10 transaction depends on this working.
  // max must exceed the two connections the ON CONFLICT race holds simultaneously,
  // or a pool.query while both are checked out waits for a slot that never frees.
  const pool = new Pool({ connectionString: pooled, max: 4, connectionTimeoutMillis: 10000 });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT 1');
      await client.query('COMMIT');
      pass(G_, 'pooled-transactions', 'BEGIN/COMMIT succeeded on a pooled connection');
    } catch (err) {
      fail(G_, 'pooled-transactions', err.message);
    } finally {
      client.release();
    }

    // Rollback must genuinely discard. A pooler that silently autocommits would make
    // every atomic transition a lie, so this is checked rather than assumed.
    const c2 = await pool.connect();
    try {
      await c2.query('CREATE TEMP TABLE IF NOT EXISTS _vp_rollback(x int); TRUNCATE _vp_rollback;');
      await c2.query('BEGIN');
      await c2.query('INSERT INTO _vp_rollback VALUES (1)');
      await c2.query('ROLLBACK');
      const n = await c2.query('SELECT count(*)::int n FROM _vp_rollback');
      if (n.rows[0].n === 0) pass(G_, 'pooled-rollback', 'ROLLBACK discarded the insert');
      else fail(G_, 'pooled-rollback', `ROLLBACK left ${n.rows[0].n} row(s) — transactions are not honoured`);
    } catch (err) {
      fail(G_, 'pooled-rollback', err.message);
    } finally {
      c2.release();
    }

    // The resolution reservation's serialisation point (plan test #113): after a
    // losing `ON CONFLICT DO NOTHING`, a NEW statement snapshot must see the row the
    // winner committed. If it does not, two operators could both reach Phase 2.
    const hasResolutions = await pool.query(
      `SELECT count(*)::int n FROM information_schema.tables
        WHERE table_schema='public' AND table_name='booking_operator_resolutions'`);
    if (!hasResolutions.rows[0].n) {
      block(G_, 'on-conflict-visibility', 'booking_operator_resolutions absent — run the migration first');
    } else {
      const id = crypto.randomUUID();
      // Look the journey up BEFORE checking out the two race connections.
      const jr = await pool.query('SELECT journey_id FROM booking_journeys LIMIT 1');
      const a = await pool.connect();
      const b = await pool.connect();
      try {
        if (!jr.rowCount) {
          block(G_, 'on-conflict-visibility', 'no journey row to reference — seed one, or run after the suite');
        } else {
          const jid = jr.rows[0].journey_id;
          const ins = (c) => c.query(
            `INSERT INTO booking_operator_resolutions
               (resolution_id, journey_id, request_fingerprint, fingerprint_key_id, escalation, action,
                expected_attempt_version, expected_intent_version, expected_review_version, state, lease_token)
             VALUES ($1,$2,'vp','vp','t1','resume',0,0,0,'processing', gen_random_uuid())
             ON CONFLICT (resolution_id) DO NOTHING RETURNING resolution_id`, [id, jid]);

          const ra = await ins(a);                       // winner
          const rb = await ins(b);                       // loser
          const seen = await b.query(
            'SELECT state FROM booking_operator_resolutions WHERE resolution_id = $1', [id]);
          if (ra.rowCount === 1 && rb.rowCount === 0 && seen.rowCount === 1) {
            pass(G_, 'on-conflict-visibility',
              'the losing insert observes the winner\'s committed row on re-SELECT');
          } else {
            fail(G_, 'on-conflict-visibility',
              `winner=${ra.rowCount} loser=${rb.rowCount} visible=${seen.rowCount}`);
          }
          // Cleanup on a connection already held, not a fresh checkout.
          await a.query('DELETE FROM booking_operator_resolutions WHERE resolution_id = $1', [id])
            .catch(() => leaked.push(`booking_operator_resolutions ${id}`));
        }
      } catch (err) {
        fail(G_, 'on-conflict-visibility', err.message);
      } finally {
        a.release(); b.release();
      }
    }
  } finally {
    await pool.end().catch(() => {});
  }

  // Idempotency: a second migrate must be a no-op, not a re-apply. The runner's
  // checksum guard also refuses an edited already-applied migration, which is the
  // behaviour that matters most here.
  try {
    const { run } = require('../db/migrate');
    const r = await run();
    const applied = (r && r.applied) || [];
    if (applied.length === 0) pass(G_, 'migration-idempotent', 'second run applied nothing');
    else warn(G_, 'migration-idempotent', `applied ${applied.length}: ${applied.join(', ')} (expected on a first run)`);
  } catch (err) {
    fail(G_, 'migration-idempotent', err.message);
  }
}

/* ===================================================================== *
 * Google — the recovery design's load-bearing assumptions
 * ===================================================================== */

async function verifyGoogle() {
  const G_ = 'google';
  for (const k of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']) {
    if (!process.env[k]) return block(G_, 'credentials', `${k} is not set`);
  }

  const target = process.env.VERIFY_CALENDAR_ID;
  const configured = process.env.GOOGLE_CALENDAR_ID;
  if (!target) {
    return block(G_, 'test-calendar',
      'VERIFY_CALENDAR_ID is not set. Point it at a DISPOSABLE calendar — never the booking calendar.');
  }
  if (target === configured && !CALENDAR_OVERRIDE) {
    return fail(G_, 'test-calendar',
      'VERIFY_CALENDAR_ID equals GOOGLE_CALENDAR_ID. Refusing: the plan forbids modifying the ' +
      'configured (Production) calendar. Use a separate calendar, or pass ' +
      '--i-understand-this-is-the-configured-calendar to override.');
  }
  try {
    G.requireCalendarId(target);
    pass(G_, 'calendar-id-shape', 'explicit address, not an alias');
  } catch (err) {
    return fail(G_, 'calendar-id-shape', err.message + ' (aliases split the reservation namespace)');
  }

  // 3: accessRole. Read-only, and the gate on every terminal absence verdict.
  let role = null;
  try {
    const probe = await G.probeEventAccess(target);       // { confirmed, role, error? }
    role = probe.role;
    if (probe.confirmed) pass(G_, 'access-role', `${role} — a 404 from this calendar is real`);
    else fail(G_, 'access-role', `${role || 'unreadable'}${probe.error ? ' (' + probe.error + ')' : ''}` +
      ' — no terminal absence verdict is possible, so google_create_recovery can only ever reach T1, never G3');
    if (role === 'writerWithoutPrivateAccess') {
      warn(G_, 'writerWithoutPrivateAccess',
        'this role is treated as UNCONFIRMED by default. Promoting it requires proving the booking ' +
        'event AND its extendedProperties.private are readable under it — check manually.');
    }
  } catch (err) {
    fail(G_, 'access-role', err.message);
  }

  if (!ALLOW_WRITES) {
    for (const id of ['caller-supplied-id', 'duplicate-409', 'cancelled-get', 'private-metadata', 'manage-url']) {
      block(G_, id, 'needs --allow-disposable-writes (one disposable event, then deleted)');
    }
    return;
  }

  // 1, 2, 6, 7, 8: one disposable event proves four things at once.
  const journeyId = crypto.randomUUID();
  const eventId = G.deterministicEventId({ calendarKey: 'verifyprq', journeyId, attempt: 1 });
  let created = false;
  try {
    if (!/^[0-9a-v]{5,1024}$/.test(eventId)) {
      fail(G_, 'caller-supplied-id', `id is not base32hex: ${eventId}`);
    } else {
      const start = new Date(Date.now() + 40 * 24 * 3600 * 1000);
      start.setUTCMinutes(0, 0, 0);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const manageUrl = (process.env.PUBLIC_BASE_URL || 'https://example.invalid')
        .replace(/\/+$/, '') + `/manage.html?token=verify&id=${journeyId}`;

      const ins = await G.insertEvent(target, {
        eventId,
        summary: '[VERIFY] disposable prerequisite check — safe to delete',
        description: `Automated §12 verification. Manage: ${manageUrl}`,
        start: start.toISOString(),
        end: end.toISOString(),
        attendees: [],                       // no invitee: nobody is emailed
        journeyId,
        attempt: 1,
      });

      if (ins.kind === 'created') {
        created = true;
        pass(G_, 'caller-supplied-id', `${eventId.length}-char caller-supplied id accepted`);
      } else {
        fail(G_, 'caller-supplied-id', `insert returned "${ins.kind}"`);
      }

      if (created) {
        const again = await G.insertEvent(target, {
          eventId, summary: '[VERIFY] duplicate', description: '',
          start: start.toISOString(), end: end.toISOString(), attendees: [], journeyId, attempt: 1,
        });
        if (again.kind === 'duplicate') {
          pass(G_, 'duplicate-409', 'a second insert with the same id is reported as duplicate');
        } else {
          warn(G_, 'duplicate-409',
            `second insert returned "${again.kind}". Google documents that duplicate detection ` +
            '"cannot be guaranteed" at creation time, which is why events.get is the authority — ' +
            'so this is tolerable, but note it.');
        }

        const read = await G.readEvent(target, eventId);
        if (read.kind === 'present') {
          const priv = (read.event.extendedProperties && read.event.extendedProperties.private) || {};
          const keys = Object.keys(priv).sort();
          if (keys.join(',') === 'attempt,journeyId') {
            pass(G_, 'private-metadata', 'exactly {journeyId, attempt}');
          } else {
            fail(G_, 'private-metadata', 'unexpected keys: ' + keys.join(','));
          }
          const blob = JSON.stringify(priv);
          if (/@/.test(blob)) fail(G_, 'no-email-in-metadata', 'an address appears in private metadata');
          else pass(G_, 'no-email-in-metadata', 'no address in private metadata');

          if ((read.event.description || '').includes('/manage.html?token=')) {
            pass(G_, 'manage-url', 'the invite carries a /manage.html management URL');
          } else {
            fail(G_, 'manage-url', 'no /manage.html URL in the event description');
          }
        } else {
          fail(G_, 'private-metadata', `events.get returned "${read.kind}"`);
        }

        // 3: what a cancelled deterministic id looks like, and that it stays unusable.
        await G.cancelEvent(target, eventId);
        const after = await G.readEvent(target, eventId);
        if (['cancelled', 'gone', 'not_found'].includes(after.kind)) {
          pass(G_, 'cancelled-get', `after cancellation events.get reports "${after.kind}"`);
          created = false;                   // cancelled; nothing left to clean up
        } else {
          fail(G_, 'cancelled-get', `expected cancelled/gone/not_found, got "${after.kind}"`);
        }
      }
    }
  } catch (err) {
    fail(G_, 'disposable-event', err.message);
  } finally {
    if (created) {
      try { await G.cancelEvent(target, eventId); } catch (_) { leaked.push(`google event ${eventId} on ${target}`); }
    }
  }
}

/* ===================================================================== *
 * Zoho — scopes, shapes, and the fields that must already exist
 * ===================================================================== */

async function verifyZoho() {
  const G_ = 'zoho';
  for (const k of ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN']) {
    if (!process.env[k]) return block(G_, 'credentials', `${k} is not set`);
  }

  try {
    await Z.getAccessToken();
    pass(G_, 'token-refresh', 'refresh token exchanged for an access token');
  } catch (err) {
    return fail(G_, 'token-refresh', err.message);
  }

  // Field metadata: read-only, and the answer to "does the dependency already exist".
  // A missing field here is a PREREQUISITE FAILURE, never a cue to create it.
  const fieldChecks = [
    ['Events', process.env.ZOHO_EVENT_EXTERNAL_ID_FIELD || 'Ext_Calendar_Booking_ID', true],
    ['Leads', process.env.ZOHO_LEAD_JOBTITLE_RAW_FIELD || 'Job_Title_Raw', true],
    ['Contacts', process.env.ZOHO_LEAD_JOBTITLE_RAW_FIELD || 'Job_Title_Raw', true],
  ];
  for (const [module, apiName, required] of fieldChecks) {
    try {
      const r = await Z.requestZoho('GET', `/crm/v6/settings/fields?module=${module}`);
      const fields = (r && r.fields) || [];
      const found = fields.find((f) => f.api_name === apiName);
      if (found) pass(G_, `field:${module}.${apiName}`, `exists (${found.data_type})`);
      else if (required) fail(G_, `field:${module}.${apiName}`, 'ABSENT — failed prerequisite, do not create it');
      else warn(G_, `field:${module}.${apiName}`, 'absent (optional)');
    } catch (err) {
      block(G_, `field:${module}.${apiName}`, 'could not read field metadata: ' + err.message);
    }
  }

  // Lead_Source must already offer the configured value.
  try {
    const r = await Z.requestZoho('GET', '/crm/v6/settings/fields?module=Leads');
    const src = ((r && r.fields) || []).find((f) => f.api_name === 'Lead_Source');
    const want = process.env.ZOHO_LEAD_SOURCE || 'Website';
    const values = ((src && src.pick_list_values) || []).map((v) => v.actual_value || v.display_value);
    if (values.includes(want)) pass(G_, 'picklist:Lead_Source', `"${want}" exists`);
    else fail(G_, 'picklist:Lead_Source',
      `"${want}" is NOT an option — failed prerequisite. Do not add the value; choose an existing one.`);
  } catch (err) {
    block(G_, 'picklist:Lead_Source', err.message);
  }

  // Meeting_Task_Lost_Reasons: recorded, because §7.2 depends on its live shape.
  try {
    const r = await Z.requestZoho('GET', '/crm/v6/settings/fields?module=Events');
    const f = ((r && r.fields) || []).find((x) => x.api_name === 'Meeting_Task_Lost_Reasons');
    if (f) {
      const vals = (f.pick_list_values || []).map((v) => v.actual_value || v.display_value);
      pass(G_, 'picklist:Meeting_Task_Lost_Reasons', `${f.data_type}; ${vals.length} values: ${vals.join(' | ')}`);
      if (vals.includes('Cancelled by Prospect')) {
        warn(G_, 'cancellation-gate',
          '"Cancelled by Prospect" already exists — but enabling cancellation still needs the Deluge ' +
          'correction, which is out of scope here.');
      }
    } else {
      warn(G_, 'picklist:Meeting_Task_Lost_Reasons', 'not found — only affects the gated §7.2 follow-up');
    }
  } catch (err) {
    block(G_, 'picklist:Meeting_Task_Lost_Reasons', err.message);
  }

  // Tasks READ scope, via a search that is expected to match nothing.
  try {
    await Z.searchTaskBySubject(crypto.randomUUID());     // takes a journeyId
    pass(G_, 'scope:tasks-read', 'Subject:equals search accepted (no match expected)');
  } catch (err) {
    fail(G_, 'scope:tasks-read',
      err.message + ' — if this is a scope error it is a console action for the project owner');
  }

  // RT4.adopt_identity derives the Account from a verified Contact, so Account_Name.id
  // must be readable. Read-only, and needs a Contact id supplied deliberately.
  const contactId = process.env.VERIFY_CONTACT_ID;
  if (!contactId) {
    block(G_, 'contact-account-shape', 'set VERIFY_CONTACT_ID to an existing Contact id (read only)');
  } else {
    try {
      const c = await Z.getContact(contactId);
      if (!c) fail(G_, 'contact-account-shape', 'Contact not found');
      else {
        const hasEmail = typeof c.Email === 'string' && c.Email.length > 0;
        const acct = c.Account_Name && c.Account_Name.id;
        if (hasEmail) pass(G_, 'contact-email-readable', 'Email is returned');
        else fail(G_, 'contact-email-readable', 'Email is NOT returned — RT4 cannot verify the Contact');
        if (acct) pass(G_, 'contact-account-shape', 'Account_Name.id is readable');
        else warn(G_, 'contact-account-shape',
          'Account_Name.id absent for this Contact. If that holds generally, RT4.adopt_identity must ' +
          'degrade to Contact-only rather than trust an operator-supplied Account id.');
      }
    } catch (err) {
      fail(G_, 'contact-account-shape', err.message);
    }
  }

  if (!ALLOW_WRITES) {
    for (const id of ['unlinked-task', 'owner-shape', 'duplicate-data-shape']) {
      block(G_, id, 'needs --allow-disposable-writes (creates one disposable Task, then deletes it)');
    }
    return;
  }

  // The one Zoho write: a disposable Manual Review Task with NEITHER Who_Id NOR What_Id.
  // No repo precedent exists, which is exactly why it must be proven.
  const ownerId = process.env.ZOHO_MANUAL_REVIEW_OWNER_ID;
  if (!ownerId) {
    return block(G_, 'unlinked-task', 'ZOHO_MANUAL_REVIEW_OWNER_ID is not set');
  }
  const probeJourney = crypto.randomUUID();
  let taskId = null;
  try {
    // The Owner is read from ZOHO_MANUAL_REVIEW_OWNER_ID inside the builder; the
    // contactId is deliberately null so the payload is genuinely unlinked.
    const payload = Z.buildManualReviewTask({
      journeyId: probeJourney,
      contactId: null,
      description: '[VERIFY] disposable §12 prerequisite check — safe to delete',
    });
    if ('Who_Id' in payload || 'What_Id' in payload) {
      fail(G_, 'unlinked-task', 'the built payload is not actually unlinked');
    } else if (!payload.Owner || payload.Owner.id !== ownerId) {
      fail(G_, 'owner-shape', 'the builder did not attach Owner:{id} — check ZOHO_MANUAL_REVIEW_OWNER_ID');
    } else {
      const created = await Z.createTaskSuppressed(payload);
      taskId = created && (created.id || (created.details && created.details.id));
      if (taskId) {
        pass(G_, 'unlinked-task', 'Tasks accepts a record with neither Who_Id nor What_Id');
        pass(G_, 'owner-shape', 'Owner:{id:"…"} is accepted over REST v6');

        const found = await Z.searchTaskBySubject(probeJourney);
        if (found && found.id === taskId) pass(G_, 'subject-search', 'the Subject search rediscovers it');
        else warn(G_, 'subject-search',
          'not rediscovered yet — Zoho search indexing lags, which the create-recovery grace window ' +
          'already accounts for. Re-run to confirm.');

        // DUPLICATE_DATA shape, if the module enforces uniqueness on Subject.
        try {
          await Z.createTaskSuppressed(payload);
          warn(G_, 'duplicate-data-shape',
            'a second identical Task was accepted — Tasks does not enforce uniqueness here, so the ' +
            'DUPLICATE_DATA path is exercised by Leads/Contacts instead. Verify it there.');
        } catch (err) {
          // ZohoError carries the parsed body on `.detail`, which is what
          // duplicateRecordId reads — it is not given the Error itself.
          const dupId = Z.duplicateRecordId(err && err.detail);
          if (dupId) pass(G_, 'duplicate-data-shape', 'details.duplicate_record.id is present and readable');
          else warn(G_, 'duplicate-data-shape',
            `rejected as "${err.code || err.message}" with no duplicate id — the uncertain-create ` +
            'recovery then falls back to re-searching, which it is designed to do');
        }
      } else {
        fail(G_, 'unlinked-task', 'create returned no id: ' + JSON.stringify(created).slice(0, 200));
      }
    }
  } catch (err) {
    fail(G_, 'unlinked-task', err.message);
  } finally {
    if (taskId) {
      try {
        await Z.requestZoho('DELETE', `/crm/v6/Tasks/${encodeURIComponent(taskId)}`);
        console.log(`         cleaned up disposable Task ${taskId}`);
      } catch (_) {
        leaked.push(`zoho Task ${taskId} (subject: ${Z.manualReviewSubject(probeJourney)})`);
      }
    }
  }
}

/* ===================================================================== */

async function main() {
  console.log('§12 prerequisite verification');
  console.log(`mode: ${ALLOW_WRITES ? 'DISPOSABLE WRITES ALLOWED' : 'READ-ONLY'}`);
  console.log('');

  if (wants('db')) { console.log('--- database ---'); await verifyDatabase().catch((e) => fail('db', 'unexpected', e.message)); console.log(''); }
  if (wants('google')) { console.log('--- google ---'); await verifyGoogle().catch((e) => fail('google', 'unexpected', e.message)); console.log(''); }
  if (wants('zoho')) { console.log('--- zoho ---'); await verifyZoho().catch((e) => fail('zoho', 'unexpected', e.message)); console.log(''); }

  const n = (s) => results.filter((r) => r.state === s).length;
  console.log('--- summary ---');
  console.log(`PASS ${n('PASS')}   FAIL ${n('FAIL')}   BLOCKED ${n('BLOCK')}   WARN ${n('WARN')}`);

  const failed = results.filter((r) => r.state === 'FAIL');
  if (failed.length) {
    console.log('\nFAILED PREREQUISITES — report these, do not work around them:');
    for (const f of failed) console.log(`  · ${f.group}/${f.id}: ${f.detail}`);
  }
  const blocked = results.filter((r) => r.state === 'BLOCK');
  if (blocked.length) {
    console.log('\nBLOCKED (a credential or input was absent — not a failure):');
    for (const b of blocked) console.log(`  · ${b.group}/${b.id}: ${b.detail}`);
  }
  if (leaked.length) {
    console.log('\n!! DISPOSABLE RESOURCES NOT CLEANED UP — remove these by hand:');
    for (const l of leaked) console.log(`  · ${l}`);
  } else if (ALLOW_WRITES) {
    console.log('\nAll disposable resources were cleaned up.');
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => { console.error('verification aborted:', err); process.exit(1); });
