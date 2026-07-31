'use strict';

/**
 * Retention eligibility, against a real server.
 *
 * Plan coverage: #16, #33, #38, #63, #79, #81, plus the three-valued-logic
 * regression that made the busy predicate return NULL.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../../db');
const RT = require('../../db/queries/retention');
const RV = require('../../db/queries/review');
const O = require('../../db/queries/ops');
const R = require('../../db/queries/reservations');
const J = require('../../db/queries/journeys');

const skip = db.isConfigured() ? false : 'DATABASE_URL not set';

let seq = 0;
async function newJourney(overrides = {}) {
  seq += 1;
  const id = `cafe0003-0000-4000-8000-${String(seq).padStart(12, '0')}`;
  await db.withTransaction(async (tx) => {
    await tx.query('DELETE FROM booking_journeys WHERE journey_id = $1', [id]);
    const cols = Object.keys(overrides);
    const extra = cols.length ? ', ' + cols.join(', ') : '';
    const ph = cols.map((_, i) => `, $${i + 3}`).join('');
    await tx.query(
      `INSERT INTO booking_journeys (journey_id, email_normalized${extra}) VALUES ($1, $2${ph})`,
      [id, `${id}@example.test`, ...cols.map((c) => overrides[c])]
    );
  });
  return id;
}

/**
 * Age a journey's last-activity clock.
 *
 * `bj_guard` stamps `updated_at := now()` on EVERY update — correct behaviour, since
 * `updated_at` is the retention lifecycle clock and any real modification is genuine
 * activity — which means a plain UPDATE cannot move it backwards. `replica` role
 * suppresses user triggers for this transaction only, so the test can simulate the
 * passage of time without weakening the schema for testability.
 */
async function age(id, interval) {
  await db.withTransaction(async (tx) => {
    await tx.query("SET LOCAL session_replication_role = 'replica'");
    await tx.query(
      `UPDATE booking_journeys SET updated_at = now() - $2::interval WHERE journey_id = $1`, [id, interval]);
  });
}

test.after(async () => { if (!skip) await db.close(); });

test('REGRESSION: the busy predicate returns false, never NULL', { skip }, async () => {
  // A brand-new journey has google_outcome_state NULL, which under three-valued
  // logic made the whole OR chain NULL — and `NOT NULL` excluded the row from every
  // scrub sweep, so nothing was ever scrubbed.
  const id = await newJourney();
  const busy = await db.withTransaction((tx) => RT.isBusy(tx, id));
  assert.equal(busy, false, 'must be a boolean false, not null');
  assert.notEqual(busy, null);
});

test('#33 a quiet journey is eligible; any due, leased or in-doubt op blocks it', { skip }, async () => {
  const id = await newJourney({ zoho_status: 'record_saved' });
  await age(id, '200 days');

  let found = await db.withTransaction((tx) => RT.findScrubCandidates(tx, 100));
  assert.ok(found.includes(id), 'past its 180-day lifecycle with nothing outstanding');

  // A due op blocks it.
  await db.withTransaction((tx) => O.ensureOp(tx, id, 'zoho_meeting_create'));
  assert.equal(await db.withTransaction((tx) => RT.isBusy(tx, id)), true);

  // Completing it releases the block; a `terminal` op does NOT block.
  await db.withTransaction((tx) => O.completeOp(tx, id, 'zoho_meeting_create'));
  assert.equal(await db.withTransaction((tx) => RT.isBusy(tx, id)), false);
  await db.withTransaction((tx) => O.terminateOp(tx, id, 'zoho_meeting_create', 'given_up'));
  assert.equal(await db.withTransaction((tx) => RT.isBusy(tx, id)), false,
    'terminal is the given-up state and is governed by the review window instead');

  // An in-doubt op blocks it again.
  await db.withTransaction((tx) => O.markOutcomeUnknown(tx, id, 'zoho_meeting_create'));
  assert.equal(await db.withTransaction((tx) => RT.isBusy(tx, id)), true);
});

test('#79 unresolved states are bounded by the review window, not held forever', { skip }, async () => {
  const id = await newJourney();
  await db.withTransaction((tx) => RV.addReviewReason(tx, id, 'lead_update_outcome_unknown'));
  await db.withTransaction((tx) =>
    tx.query("UPDATE booking_journeys SET lead_terminal_update_state='unresolved' WHERE journey_id=$1", [id]));

  assert.equal(await db.withTransaction((tx) => RT.isBusy(tx, id)), true, 'live review window blocks');

  await db.withTransaction((tx) => tx.query(
    "UPDATE booking_journeys SET review_retention_until = now() - interval '1 day' WHERE journey_id = $1", [id]));
  await db.withTransaction((tx) => O.completeOp(tx, id, 'zoho_manual_review'));

  assert.equal(await db.withTransaction((tx) => RT.isBusy(tx, id)), false,
    'once the bounded window lapses an unresolved journey stops blocking, even unresolved');

  // Whereas `outcome_unknown` on the parent latch is genuinely in doubt and blocks.
  const other = await newJourney({ lead_terminal_update_state: 'outcome_unknown' });
  assert.equal(await db.withTransaction((tx) => RT.isBusy(tx, other)), true);
});

test('#38/#63 a hold blocks only while its buffered window is still live', { skip }, async () => {
  const id = await newJourney();
  const cal = `ret${String(seq).padStart(5, '0')}`;

  // A future hold blocks.
  await db.withTransaction((tx) => R.upsertPendingHold(tx, id, {
    purpose: 'initial', hostCalendarKey: cal, slotStartUtc: '2027-06-01T13:00:00Z', armed: true }));
  assert.equal(await db.withTransaction((tx) => RT.isBusy(tx, id)), true);

  // A historical one does not — past hold_end_utc it is a record, not a lock,
  // because availability only ever offers future slots. This is the case Revision 8
  // got wrong: an armed-then-stranded hold stayed pending forever.
  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_slot_reservations SET slot_start_utc = '2020-06-01T13:00:00Z' WHERE journey_id = $1`, [id]));
  const holds = await db.withTransaction((tx) => R.liveHolds(tx, id));
  assert.equal(holds[0].status, 'pending', 'still pending');
  assert.equal(holds[0].armed, true, 'still armed');
  assert.equal(await db.withTransaction((tx) => RT.isBusy(tx, id)), false,
    'yet no longer a retention obstacle');
});

test('an in-flight operator resolution blocks only while its lease is live', { skip }, async () => {
  const id = await newJourney();
  await db.withTransaction((tx) => tx.query(
    `INSERT INTO booking_operator_resolutions
       (resolution_id, journey_id, request_fingerprint, fingerprint_key_id, escalation, action,
        expected_attempt_version, expected_intent_version, expected_review_version,
        state, lease_token, lease_expires_at)
     VALUES (gen_random_uuid(), $1, 'fp', 'k1', 't1', 'resume', 0, 0, 0,
             'processing', gen_random_uuid(), now() + interval '2 minutes')`, [id]));
  assert.equal(await db.withTransaction((tx) => RT.isBusy(tx, id)), true);

  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_operator_resolutions SET lease_expires_at = now() - interval '1 minute'
      WHERE journey_id = $1`, [id]));
  assert.equal(await db.withTransaction((tx) => RT.isBusy(tx, id)), false);
});

test('#16/#81 the scrub nulls PII, retains safe analytics, and computes the booleans', { skip }, async () => {
  const id = await newJourney({
    zoho_status: 'complete', booking_status: 'confirmed', host_calendar_key: 'jurnii_local',
    google_calendar_id: 'demos-local@jurnii.io', product_interest: 'Platform',
  });
  await db.withTransaction((tx) => tx.query(
    `UPDATE booking_journeys SET
       first_name='Ada', last_name='Lovelace', company='Analytical Engines',
       phone_e164='+447123456789', landing_url='https://jurnii.io/x?utm_source=y',
       google_event_id='ev-scrub', zoho_record_id='9001', zoho_contact_id='9002',
       zoho_meeting_id='9003', zoho_deal_id='9004', attribution_extra='{"gclid":"abc"}'
     WHERE journey_id=$1`, [id]));

  const ok = await db.withTransaction((tx) => RT.scrubJourney(tx, id));
  assert.equal(ok, true);

  const row = await db.withTransaction((tx) => J.get(tx, id));
  for (const col of ['first_name', 'last_name', 'email', 'email_normalized', 'company',
    'phone_e164', 'landing_url', 'google_event_id', 'google_calendar_id',
    'zoho_record_id', 'zoho_contact_id', 'zoho_meeting_id', 'zoho_deal_id']) {
    assert.equal(row[col], null, `${col} must be nulled`);
  }
  assert.deepEqual(row.attribution_extra, {}, 'click ids are per-user identifiers');

  // Retained: the analytics booleans, computed from the ids immediately before they
  // were nulled — after the nulling there is nothing left to compute them from.
  assert.equal(row.analytics_google_booking_created, true);
  assert.equal(row.analytics_zoho_identity_resolved, true);
  assert.equal(row.analytics_zoho_meeting_created, true);
  assert.equal(row.analytics_deal_linked, true);
  assert.equal(row.analytics_final_integration_status, 'complete');

  // host_calendar_key survives while google_calendar_id does not: a calendar id is
  // very often a mailbox address, the opaque key is not.
  assert.equal(row.host_calendar_key, 'jurnii_local');
  assert.equal(row.product_interest, 'Platform');
  assert.ok(row.pii_scrubbed_at);

  // Idempotent.
  assert.equal(await db.withTransaction((tx) => RT.scrubJourney(tx, id)), false);
});

test('purge deletes the journey and cascades to every child table', { skip }, async () => {
  const id = await newJourney();
  await db.withTransaction(async (tx) => {
    await O.ensureOp(tx, id, 'zoho_manual_review');
    await RV.addReviewReason(tx, id, 'identity_ambiguous');
    await R.upsertPendingHold(tx, id, {
      purpose: 'initial', hostCalendarKey: `pg${String(seq).padStart(5, '0')}`, slotStartUtc: '2027-07-01T13:00:00Z' });
    await tx.query(
      `INSERT INTO booking_journey_event_bindings (journey_id, google_event_id, slot_start_utc, bound_action)
       VALUES ($1, 'ev-purge', '2027-07-01T13:00:00Z', 'pipeline_create')`, [id]);
    await tx.query(
      `INSERT INTO booking_operator_resolutions
         (resolution_id, journey_id, request_fingerprint, fingerprint_key_id, escalation, action,
          expected_attempt_version, expected_intent_version, expected_review_version,
          state, lease_token, result_status, result_body, completed_at)
       VALUES (gen_random_uuid(), $1, 'fp', 'k1', 't1', 'resume', 0, 0, 0,
               'completed', gen_random_uuid(), 200, '{}', now())`, [id]);
  });

  await db.withTransaction((tx) => RT.purgeJourney(tx, id));

  const counts = await db.withTransaction(async (tx) => {
    const q = async (t) => (await tx.query(
      `SELECT count(*)::int n FROM ${t} WHERE journey_id = $1`, [id])).rows[0].n;
    return {
      ops: await q('booking_journey_ops'),
      reservations: await q('booking_slot_reservations'),
      reasons: await q('booking_journey_review_reasons'),
      bindings: await q('booking_journey_event_bindings'),
      resolutions: await q('booking_operator_resolutions'),
    };
  });
  assert.deepEqual(counts, { ops: 0, reservations: 0, reasons: 0, bindings: 0, resolutions: 0 });
});
