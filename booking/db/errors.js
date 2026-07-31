'use strict';

/**
 * Postgres error classification.
 *
 * `23P01` (exclusion violation) is the load-bearing one: the buffered overlap
 * constraint `bsr_no_cross_journey_overlap` is an EXCLUDE, and an EXCLUDE
 * violation is NOT inferrable by `ON CONFLICT`. So `SLOT_TAKEN` is necessarily
 * exception-based rather than upsert-based (finding #8, §4.3).
 */

const PG = {
  UNIQUE_VIOLATION: '23505',
  EXCLUSION_VIOLATION: '23P01',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
  RAISE_EXCEPTION: 'P0001', // our trigger invariants
};

class DbError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
    this.name = 'DbError';
  }
}

/** A guarded update matched zero rows: a lost race, not a crash. */
class ConflictError extends Error {
  constructor(code, detail) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.name = 'ConflictError';
  }
}

class ConfigError extends Error {
  constructor(code) { super(code); this.code = code; this.name = 'ConfigError'; }
}

/**
 * True when the error is the cross-journey buffered-overlap violation, i.e. the
 * slot is genuinely taken by someone else. Checked on constraint name as well as
 * code so an unrelated future EXCLUDE cannot masquerade as `SLOT_TAKEN`.
 */
function isSlotTaken(err) {
  return Boolean(err) && err.code === PG.EXCLUSION_VIOLATION
    && err.constraint === 'bsr_no_cross_journey_overlap';
}

/** True when a partial unique index rejected a second confirmed hold, etc. */
function isUniqueViolation(err, constraint) {
  if (!err || err.code !== PG.UNIQUE_VIOLATION) return false;
  return constraint ? err.constraint === constraint : true;
}

/** True when one of the §4.5 trigger invariants rejected the write. */
function isInvariantViolation(err) {
  return Boolean(err) && (err.code === PG.RAISE_EXCEPTION || err.code === PG.CHECK_VIOLATION);
}

/** Transient failures worth an immediate in-transaction retry. */
function isRetryable(err) {
  return Boolean(err) && (err.code === PG.SERIALIZATION_FAILURE || err.code === PG.DEADLOCK_DETECTED);
}

module.exports = {
  PG,
  DbError,
  ConflictError,
  ConfigError,
  isSlotTaken,
  isUniqueViolation,
  isInvariantViolation,
  isRetryable,
};
