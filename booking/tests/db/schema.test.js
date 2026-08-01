'use strict';

/**
 * Against-Postgres tests. A repository double cannot prove `23505`, `23P01`,
 * rollback, partial-unique-index semantics, trigger rejection, or statement-level
 * visibility, so these run against a real server.
 *
 * Skipped entirely when DATABASE_URL is absent, so the offline suite stays portable.
 *
 * Plan coverage: #19, #41, #121, #122, #126, plus both approved deviations.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../../db');
const J = require('../../db/queries/journeys');
const R = require('../../db/queries/reservations');
const O = require('../../db/queries/ops');
const RV = require('../../db/queries/review');
const B = require('../../db/queries/bindings');

const skip = db.isConfigured() ? false : 'DATABASE_URL not set';

let seq = 0;
function nextId() {
  seq += 1;
  return `dbfeed00-0000-4000-8000-${String(seq).padStart(12, '0')}`;
}

async function newJourney(overrides = {}) {
  const id = nextId();
  await db.withTransaction(async (tx) => {
    await tx.query('DELETE FROM booking_journeys WHERE journey_id = $1', [id]);
    const cols = Object.keys(overrides);
    const extra = cols.length ? ', ' + cols.join(', ') : '';
    const ph = cols.map((_, i) => `, $${i + 3}`).join('');
    await tx.query(
      `INSERT INTO booking_journeys (journey_id, email_normalized${extra})
       VALUES ($1, $2${ph})`,
      [id, `${id}@example.test`, ...cols.map((c) => overrides[c])]
    );
  });
  return id;
}

/** Run `fn` and return the Postgres error, asserting that one was raised. */
async function expectFailure(fn) {
  try {
    await fn();
  } catch (err) {
    return err;
  }
  assert.fail('expected the statement to be rejected, but it succeeded');
}

test.after(async () => { if (!skip) await db.close(); });

// ---------------------------------------------------------------------------
// APPROVED DEVIATION 1 — trigger-derived reservation geometry
// ---------------------------------------------------------------------------

test('deviation 1: slot geometry is derived unconditionally and ignores supplied values', { skip }, async () => {
  const id = await newJourney();
  await db.withTransaction(async (tx) => {
    // Deliberately supply WRONG values for all three derived columns.
    const res = await tx.query(
      `INSERT INTO booking_slot_reservations
         (journey_id, purpose, host_calendar_key, slot_start_utc,
          slot_end_utc, hold_end_utc, slot_hold, status)
       VALUES ($1,'initial','devcal01','2026-10-06T13:00:00Z',
               '2001-01-01T00:00:00Z','2001-01-01T00:00:00Z',
               tstzrange('2001-01-01T00:00:00Z','2001-01-02T00:00:00Z','[)'),'pending')
       RETURNING slot_end_utc, hold_end_utc, slot_hold`,
      [id]
    );
    const row = res.rows[0];
    assert.equal(row.slot_end_utc.toISOString(), '2026-10-06T13:30:00.000Z', 'slot_end derived');
    assert.equal(row.hold_end_utc.toISOString(), '2026-10-06T13:45:00.000Z', 'hold_end derived');
    assert.equal(row.slot_hold, '["2026-10-06 12:45:00+00","2026-10-06 13:45:00+00")',
      'buffered [start-15, start+45) with [) bounds');

    // An UPDATE of slot_start_utc re-derives all three.
    const upd = await tx.query(
      `UPDATE booking_slot_reservations SET slot_start_utc = '2026-10-06T15:00:00Z'
        WHERE journey_id = $1 RETURNING slot_end_utc, hold_end_utc`,
      [id]
    );
    assert.equal(upd.rows[0].hold_end_utc.toISOString(), '2026-10-06T15:45:00.000Z',
      're-derived on update');
  });
});

// ---------------------------------------------------------------------------
// #19 / finding #8 — the buffered EXCLUDE constraint
// ---------------------------------------------------------------------------

test('#19 one journey holds confirmed 13:00 and pending 13:30; another journey can take neither', { skip }, async () => {
  const a = await newJourney();
  const b = await newJourney();
  const cal = `excl${String(seq).padStart(4, '0')}`;

  await db.withTransaction(async (tx) => {
    await R.upsertPendingHold(tx, a, { purpose: 'initial', hostCalendarKey: cal, slotStartUtc: '2026-10-13T13:00:00Z' });
    await R.confirmHold(tx, a, 'initial');
    await R.upsertPendingHold(tx, a, { purpose: 'reschedule', hostCalendarKey: cal, slotStartUtc: '2026-10-13T13:30:00Z' });
    const live = await R.liveHolds(tx, a);
    assert.deepEqual(live.map((h) => `${h.purpose}/${h.status}`).sort(),
      ['initial/confirmed', 'reschedule/pending']);
  });

  // <60 minutes apart in either direction is a conflict for a DIFFERENT journey.
  for (const t of ['2026-10-13T13:30:00Z', '2026-10-13T12:30:00Z', '2026-10-13T13:00:00Z']) {
    const err = await expectFailure(() => db.withTransaction((tx) =>
      R.upsertPendingHold(tx, b, { purpose: 'initial', hostCalendarKey: cal, slotStartUtc: t })));
    assert.equal(err.code, 'SLOT_TAKEN', `${t} must be SLOT_TAKEN`);
  }

  // Exactly 60 minutes apart does not overlap.
  await db.withTransaction((tx) =>
    R.upsertPendingHold(tx, b, { purpose: 'initial', hostCalendarKey: cal, slotStartUtc: '2026-10-13T14:30:00Z' }));

  // A different calendar key is a different namespace — which is precisely why the
  // booking_calendars registry exists to stop two keys for one real calendar.
  const c = await newJourney();
  await db.withTransaction((tx) =>
    R.upsertPendingHold(tx, c, { purpose: 'initial', hostCalendarKey: `${cal}x`, slotStartUtc: '2026-10-13T13:00:00Z' }));
});

test('grid alignment is enforced by the database, not only by the validator', { skip }, async () => {
  const id = await newJourney();
  const err = await expectFailure(() => db.withTransaction((tx) =>
    R.upsertPendingHold(tx, id, { purpose: 'initial', hostCalendarKey: 'gridcal1', slotStartUtc: '2026-10-13T13:07:00Z' })));
  assert.equal(err.code, '23514');
  assert.match(err.constraint, /bsr_grid_aligned/);
});

// ---------------------------------------------------------------------------
// #41 — reschedule promotion ordering against the real partial unique index
// ---------------------------------------------------------------------------

test('#41 promotion releases the old confirmed hold before promoting the new one', { skip }, async () => {
  const id = await newJourney();
  const cal = `prom${String(seq).padStart(4, '0')}`;
  await db.withTransaction(async (tx) => {
    await R.upsertPendingHold(tx, id, { purpose: 'initial', hostCalendarKey: cal, slotStartUtc: '2026-10-20T13:00:00Z' });
    await R.confirmHold(tx, id, 'initial');
    await R.upsertPendingHold(tx, id, { purpose: 'reschedule', hostCalendarKey: cal, slotStartUtc: '2026-10-20T15:00:00Z' });
  });

  await db.withTransaction(async (tx) => {
    const promoted = await R.promoteRescheduleHold(tx, id);
    assert.equal(promoted.purpose, 'reschedule');
    assert.equal(promoted.status, 'confirmed');
  });

  await db.withTransaction(async (tx) => {
    const live = await R.liveHolds(tx, id);
    assert.equal(live.length, 1, 'exactly one live hold remains');
    assert.equal(live[0].purpose, 'reschedule');
  });

  // The reverse order violates bsr_one_confirmed, which is why the ordering is
  // load-bearing rather than stylistic.
  const id2 = await newJourney();
  const cal2 = `prom${String(seq).padStart(4, '0')}b`;
  await db.withTransaction(async (tx) => {
    await R.upsertPendingHold(tx, id2, { purpose: 'initial', hostCalendarKey: cal2, slotStartUtc: '2026-10-27T13:00:00Z' });
    await R.confirmHold(tx, id2, 'initial');
    await R.upsertPendingHold(tx, id2, { purpose: 'reschedule', hostCalendarKey: cal2, slotStartUtc: '2026-10-27T15:00:00Z' });
  });
  const err = await expectFailure(() => db.withTransaction(async (tx) => {
    await tx.query(
      `UPDATE booking_slot_reservations SET status='confirmed', expires_at=NULL
        WHERE journey_id=$1 AND purpose='reschedule' AND status='pending'`, [id2]);   // promote FIRST
    await tx.query(
      `UPDATE booking_slot_reservations SET status='released'
        WHERE journey_id=$1 AND purpose='initial' AND status='confirmed'`, [id2]);
  }));
  assert.equal(err.code, '23505');
  assert.equal(err.constraint, 'bsr_one_confirmed');
});

// ---------------------------------------------------------------------------
// #121 — the §4.5 invariants, against the real triggers
// ---------------------------------------------------------------------------

test('#121 T-a: attention cannot disagree with the reason ledger', { skip }, async () => {
  const id = await newJourney();

  const noReason = await expectFailure(() => db.withTransaction((tx) =>
    tx.query('UPDATE booking_journeys SET needs_attention = true WHERE journey_id = $1', [id])));
  assert.match(noReason.message, /invariant_attention_without_reason/);

  await db.withTransaction((tx) => RV.addReviewReason(tx, id, 'identity_ambiguous'));

  const stillOpen = await expectFailure(() => db.withTransaction((tx) =>
    tx.query('UPDATE booking_journeys SET needs_attention = false WHERE journey_id = $1', [id])));
  assert.match(stillOpen.message, /invariant_attention_open_reasons_remain/);
});

test('#121 T-a prime: an escalated parent state requires an open reason', { skip }, async () => {
  const id = await newJourney();
  for (const patch of ["google_outcome_state = 'unresolved'", "booking_status = 'needs_attention'"]) {
    const err = await expectFailure(() => db.withTransaction((tx) =>
      tx.query(`UPDATE booking_journeys SET ${patch} WHERE journey_id = $1`, [id])));
    assert.match(err.message, /invariant_escalated_without_open_reason/,
      'the invisibly-stuck state must be unreachable');
  }
});

test('#121 T-a prime exempts lead_terminal_update_state, so RT4.abandon can resolve', { skip }, async () => {
  const id = await newJourney();
  await db.withTransaction((tx) => RV.addReviewReason(tx, id, 'lead_update_outcome_unknown'));
  await db.withTransaction((tx) =>
    tx.query("UPDATE booking_journeys SET lead_terminal_update_state = 'unresolved' WHERE journey_id = $1", [id]));

  await db.withTransaction(async (tx) => {
    const { rows } = await tx.query('SELECT manual_review_version v FROM booking_journeys WHERE journey_id = $1', [id]);
    await RV.resolveReasons(tx, id, RV.ESCALATION_REASONS.t4, null, rows[0].v);
    await RV.refreshAttention(tx, id);
  });

  const row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.needs_attention, false, 'attention clears');
  assert.equal(row.lead_terminal_update_state, 'unresolved', 'the permanent latch stands');
});

test('#121 T-b: booking_failed is unreachable for a booking that existed', { skip }, async () => {
  const id = await newJourney({ booking_status: 'confirmed', google_status: 'confirmed' });
  await db.withTransaction((tx) =>
    tx.query("UPDATE booking_journeys SET confirmed_at = now(), google_event_id = 'ev-tb' WHERE journey_id = $1", [id]));
  const err = await expectFailure(() => db.withTransaction((tx) =>
    tx.query("UPDATE booking_journeys SET booking_status = 'booking_failed' WHERE journey_id = $1", [id])));
  assert.match(err.message, /invariant_booking_failed_requires_never_confirmed/);
});

test('#121 T-c: review bookkeeping is monotonic and additive', { skip }, async () => {
  const id = await newJourney();
  await db.withTransaction((tx) => RV.addReviewReason(tx, id, 'product_unresolved'));

  const dec = await expectFailure(() => db.withTransaction((tx) =>
    tx.query('UPDATE booking_journeys SET manual_review_version = 0 WHERE journey_id = $1', [id])));
  assert.match(dec.message, /invariant_review_versions_monotonic/);

  await db.withTransaction((tx) => tx.query(
    "UPDATE booking_journeys SET manual_review_reasons_applied = ARRAY['a#0','b#0'] WHERE journey_id = $1", [id]));
  const shrink = await expectFailure(() => db.withTransaction((tx) => tx.query(
    "UPDATE booking_journeys SET manual_review_reasons_applied = ARRAY['a#0'] WHERE journey_id = $1", [id])));
  assert.match(shrink.message, /invariant_review_applied_additive/,
    'the applied array is the dedup source and must never lose a key');
});

test('#121 resolved_at is write-once: a recurrence is a new occurrence', { skip }, async () => {
  const id = await newJourney();
  await db.withTransaction((tx) => RV.addReviewReason(tx, id, 'google_calendar_unreadable'));
  await db.withTransaction(async (tx) => {
    await tx.query('UPDATE booking_journey_review_reasons SET resolved_at = now() WHERE journey_id = $1', [id]);
    await RV.refreshAttention(tx, id);
  });
  const err = await expectFailure(() => db.withTransaction((tx) =>
    tx.query('UPDATE booking_journey_review_reasons SET resolved_at = NULL WHERE journey_id = $1', [id])));
  assert.match(err.message, /invariant_resolved_at_write_once/);
});

// ---------------------------------------------------------------------------
// #122 — per-occurrence resolution
// ---------------------------------------------------------------------------

test('#122 resolving one escalation leaves every unrelated reason open', { skip }, async () => {
  const id = await newJourney();
  await db.withTransaction(async (tx) => {
    await RV.addReviewReason(tx, id, 'google_calendar_unreadable');   // T1's
    await RV.addReviewReason(tx, id, 'identity_ambiguous');            // nobody's
    await RV.addReviewReason(tx, id, 'product_unresolved');            // nobody's
  });

  const resolved = await db.withTransaction(async (tx) => {
    const { rows } = await tx.query('SELECT manual_review_version v FROM booking_journeys WHERE journey_id = $1', [id]);
    const keys = await RV.resolveReasons(tx, id, RV.ESCALATION_REASONS.t1, null, rows[0].v);
    await RV.refreshAttention(tx, id);
    return keys;
  });

  assert.deepEqual(resolved, ['google_calendar_unreadable#0'], 'only T1 codes closed');

  const after = await db.withTransaction(async (tx) => ({
    open: await RV.openReasonKeys(tx, id),
    row: await J.get(tx, id),
  }));
  assert.deepEqual(after.open.sort(), ['identity_ambiguous#0', 'product_unresolved#0']);
  assert.equal(after.row.needs_attention, true, 'attention stays true');
  assert.ok(['identity_ambiguous', 'product_unresolved'].includes(after.row.needs_attention_code));
});

test('#112 the same reason recurring after resolution is a new occurrence', { skip }, async () => {
  const id = await newJourney();
  const first = await db.withTransaction((tx) => RV.addReviewReason(tx, id, 'google_unreadable'));
  assert.equal(first.generation, 0);

  const repeat = await db.withTransaction((tx) => RV.addReviewReason(tx, id, 'google_unreadable'));
  assert.equal(repeat.created, false, 'an already-open code does not advance the clock');

  await db.withTransaction(async (tx) => {
    const { rows } = await tx.query('SELECT manual_review_version v FROM booking_journeys WHERE journey_id = $1', [id]);
    await RV.resolveReasons(tx, id, ['google_unreadable'], null, rows[0].v);
    await RV.refreshAttention(tx, id);
  });

  const recurrence = await db.withTransaction((tx) => RV.addReviewReason(tx, id, 'google_unreadable'));
  assert.equal(recurrence.created, true, 'after resolution the same code IS a new fact');
  assert.equal(recurrence.generation, 1);

  const row = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(row.needs_attention, true, 'the Task reopens');
  assert.deepEqual(row.manual_review_reasons, ['google_unreadable'], 'lifetime array still lists it once');
});

test('the retention extension refreshes per episode, not per lifetime', { skip }, async () => {
  const id = await newJourney();
  await db.withTransaction((tx) => RV.addReviewReason(tx, id, 'record_write_failed'));
  const first = await db.withTransaction((tx) => J.get(tx, id));
  assert.ok(first.review_retention_until, 'first reason sets the window');

  await db.withTransaction((tx) => RV.addReviewReason(tx, id, 'deal_reconcile_failed'));
  const second = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(second.review_retention_until.getTime(), first.review_retention_until.getTime(),
    'a second reason in the same episode does not extend it');

  await db.withTransaction(async (tx) => {
    const { rows } = await tx.query('SELECT manual_review_version v FROM booking_journeys WHERE journey_id = $1', [id]);
    await RV.resolveReasons(tx, id, ['record_write_failed', 'deal_reconcile_failed'], null, rows[0].v);
    await RV.refreshAttention(tx, id);
  });
  const cleared = await db.withTransaction((tx) => J.get(tx, id));
  assert.equal(cleared.review_extension_applied_at, null, 'the marker clears when nothing is open');
});

// ---------------------------------------------------------------------------
// APPROVED DEVIATION 2 / #126 — event binding replacement
// ---------------------------------------------------------------------------

test('#126 a journey adopts replacement A, then B after A disappears', { skip }, async () => {
  const id = await newJourney();
  const slot = '2026-11-03T13:00:00Z';

  await db.withTransaction((tx) => B.bindEvent(tx, id, {
    googleEventId: 'ev-A', slotStartUtc: slot, boundAction: 'pipeline_create' }));

  const second = await db.withTransaction((tx) => B.bindEvent(tx, id, {
    googleEventId: 'ev-B', slotStartUtc: slot, boundAction: 'rg7_adopt_old' }));

  assert.equal(second.supersededEventId, 'ev-A', 'the previous binding is closed, not deleted');

  const history = await db.withTransaction((tx) => B.bindingHistory(tx, id));
  assert.equal(history.length, 2, 'history is preserved — no write-once restriction');
  assert.equal(history[0].unbound_reason, 'superseded');
  assert.equal(history[1].unbound_at, null, 'exactly one live binding');

  const live = await db.withTransaction((tx) => B.liveBinding(tx, id));
  assert.equal(live.google_event_id, 'ev-B');
});

test('deviation 2: close-then-insert succeeds, insert-then-close violates the live index', { skip }, async () => {
  const id = await newJourney();
  const slot = '2026-11-10T13:00:00Z';
  await db.withTransaction((tx) => B.bindEvent(tx, id, {
    googleEventId: 'ord-A', slotStartUtc: slot, boundAction: 'pipeline_create' }));

  // Correct order — what bindEvent does.
  await db.withTransaction(async (tx) => {
    await tx.query(
      `UPDATE booking_journey_event_bindings SET unbound_at = now(), unbound_reason = 'superseded'
        WHERE journey_id = $1 AND unbound_at IS NULL`, [id]);
    await tx.query(
      `INSERT INTO booking_journey_event_bindings (journey_id, google_event_id, slot_start_utc, bound_action)
       VALUES ($1, 'ord-B', $2, 'rg7_adopt_new')`, [id, slot]);
  });

  // Reverse order — must fail, so a refactor that collapses the statements is loud.
  const err = await expectFailure(() => db.withTransaction(async (tx) => {
    await tx.query(
      `INSERT INTO booking_journey_event_bindings (journey_id, google_event_id, slot_start_utc, bound_action)
       VALUES ($1, 'ord-C', $2, 'rg7_adopt_new')`, [id, slot]);
    await tx.query(
      `UPDATE booking_journey_event_bindings SET unbound_at = now(), unbound_reason = 'superseded'
        WHERE journey_id = $1 AND google_event_id = 'ord-B'`, [id]);
  }));
  assert.equal(err.code, '23505');
  assert.equal(err.constraint, 'bjeb_one_live_per_journey');
});

test('one journey per current google_event_id, and no two live bindings for one event', { skip }, async () => {
  const a = await newJourney();
  const b = await newJourney();
  await db.withTransaction((tx) =>
    tx.query("UPDATE booking_journeys SET google_event_id = 'shared-ev' WHERE journey_id = $1", [a]));
  const err = await expectFailure(() => db.withTransaction((tx) =>
    tx.query("UPDATE booking_journeys SET google_event_id = 'shared-ev' WHERE journey_id = $1", [b])));
  assert.equal(err.constraint, 'bj_one_journey_per_event');

  await db.withTransaction((tx) => B.bindEvent(tx, a, {
    googleEventId: 'live-ev', slotStartUtc: '2026-11-17T13:00:00Z', boundAction: 'pipeline_create' }));
  const dup = await expectFailure(() => db.withTransaction((tx) => B.bindEvent(tx, b, {
    googleEventId: 'live-ev', slotStartUtc: '2026-11-17T13:00:00Z', boundAction: 'rt1_adopt' })));
  assert.equal(dup.constraint, 'bjeb_one_live_per_event');
});

// ---------------------------------------------------------------------------
// Ops: latches, cycles, and the resume primitive
// ---------------------------------------------------------------------------

test('#49 ensureOp never revives a latch; startAttemptOp requires a newer cycle', { skip }, async () => {
  const id = await newJourney();
  await db.withTransaction(async (tx) => {
    await O.ensureOp(tx, id, 'zoho_record_write');
    await O.markOutcomeUnknown(tx, id, 'zoho_record_write');
    await O.incrementCreateAttempts(tx, id, 'zoho_record_write');
  });

  await db.withTransaction(async (tx) => {
    const r = await O.ensureOp(tx, id, 'zoho_record_write');
    assert.equal(r.armed, false, 'an uncertain create latch is never re-armed');
    const op = await O.getOp(tx, id, 'zoho_record_write');
    assert.equal(op.create_attempts, 1, 'create_attempts preserved');
    assert.ok(op.unknown_since, 'unknown_since preserved');
  });

  await assert.rejects(
    () => db.withTransaction((tx) => O.startAttemptOp(tx, id, 'zoho_record_write', 1)),
    /startAttemptOp_forbidden_for_op/,
    'the create-counter reset can never reach a Lead or Meeting latch'
  );

  await db.withTransaction(async (tx) => {
    await O.startAttemptOp(tx, id, 'google_create_recovery', 1);
    const stale = await O.startAttemptOp(tx, id, 'google_create_recovery', 1);
    assert.equal(stale.armed, false, 'an equal cycle cannot re-arm');
    const newer = await O.startAttemptOp(tx, id, 'google_create_recovery', 2);
    assert.equal(newer.armed, true, 'a strictly newer cycle can');
  });
});

test('#100 resumeOp re-arms the same cycle and preserves the create latch', { skip }, async () => {
  const id = await newJourney();
  await db.withTransaction(async (tx) => {
    await O.startAttemptOp(tx, id, 'google_create_recovery', 3);
    await O.incrementCreateAttempts(tx, id, 'google_create_recovery');
    await O.terminateOp(tx, id, 'google_create_recovery', 'deadline_unprovable');
  });

  const resumed = await db.withTransaction((tx) =>
    O.resumeOp(tx, id, 'google_create_recovery', 3, { deadlineSeconds: 1800 }));
  assert.equal(resumed.create_attempts, 1, 'same create_attempts — no new insert is authorised');
  assert.equal(resumed.cycle_version, 3, 'same cycle, so the candidate id is unchanged');

  const op = await db.withTransaction((tx) => O.getOp(tx, id, 'google_create_recovery'));
  assert.equal(op.state, 'pending');
  assert.ok(op.next_retry_at, 'due again');
  assert.equal(op.failure_count, 0, 'a fresh cadence budget, not a fresh identity');

  await assert.rejects(
    () => db.withTransaction((tx) => O.resumeOp(tx, id, 'zoho_meeting_create', 1, { deadlineSeconds: 60 })),
    /resumeOp_forbidden_for_op/
  );
});
