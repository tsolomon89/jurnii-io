'use strict';

const db = require('../../db');

/**
 * Fixture tracking for the against-PostgreSQL suite.
 *
 * WHY THIS EXISTS. The op queue is GLOBAL: `CLAIM_SQL` selects due rows across every
 * journey in the database, ordered by `op_priority`. So a journey left behind by an
 * earlier run is not inert — it is a due row that later runs will claim. The claim
 * commits a five-minute lease and `outcome_recorded = false`, and a test that claims a
 * batch without running it (the crash-ceiling tests deliberately use a large limit, to
 * avoid a lowest-priority op being starved) leaves every one of those rows leased and
 * unrecorded. On the next run their leases have expired with no outcome, so the claim's
 * crash arithmetic counts each as a crash. Accumulated over runs, that is what makes the
 * suite "pass alone and fail together": a drifted local database had 87 leftover
 * journeys and the suite failed 12 tests that all pass on a clean one.
 *
 * `derivations.test.js` already did this correctly — *"every journey this file creates is
 * tracked and removed, so the suite is safe to run against a real database and leaves
 * the row count exactly as it found it"*. This is that rule, factored out so all seven
 * files share one definition instead of one file honouring it.
 *
 * PER-FILE, NOT GLOBAL. `node --test` runs each test file in its own process, and files
 * run in parallel. The tracked set is therefore module state inside one file's process,
 * and `purgeTracked` deletes ONLY ids that file created. A blanket "delete every journey"
 * teardown would race a sibling file's in-flight fixtures.
 *
 * Every child table cascades from `booking_journeys`
 * (`booking_journey_ops`, `booking_journey_review_reasons`, `booking_slot_reservations`,
 * `booking_journey_event_bindings`, `booking_operator_resolutions`), so one delete per
 * journey is sufficient. `booking_calendars` is deliberately NOT purged: it is an
 * idempotent `ON CONFLICT DO NOTHING` registry row, shared config rather than a fixture.
 */

const created = new Set();

/** Record a journey id so teardown removes it. Returns the id, so it composes inline. */
function track(id) {
  created.add(id);
  return id;
}

/**
 * Delete every journey this file created. Safe to call when the suite skipped (nothing
 * was tracked) and safe to call twice. Never throws: a teardown failure must not mask
 * the actual test result.
 */
async function purgeTracked() {
  if (!created.size) return 0;
  const ids = [...created];
  created.clear();
  try {
    const res = await db.query(
      'DELETE FROM booking_journeys WHERE journey_id = ANY($1::uuid[])', [ids]);
    return res.rowCount;
  } catch (_) {
    return 0;
  }
}

/** How many ids are currently tracked — for a test that asserts its own bookkeeping. */
function trackedCount() {
  return created.size;
}

module.exports = { track, purgeTracked, trackedCount };
