'use strict';

const { ConfigError, isRetryable } = require('./errors');

/**
 * Two access paths, chosen by what the work needs (§4.8):
 *
 *   Neon HTTP `neon()`   — single-statement reads and single-table writes with no
 *                          follow-up work. One round trip, no connection to hold.
 *   `Pool` + withTransaction — every transition in the §4.8 inventory. PgBouncer
 *                          transaction mode supports a transaction on one
 *                          checked-out connection; no session-level features are
 *                          used, so the pooled URL is safe here.
 *   DATABASE_URL_UNPOOLED — migrations only: `pg_advisory_lock` needs a session.
 *
 * The universal outbox rule means almost every write is a transaction, so the
 * `Pool` is the common path and the HTTP client is the exception.
 */

let _pool = null;
let _sql = null;

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new ConfigError('database_url_missing');
  return url;
}

function unpooledUrl() {
  // Fall back to the pooled URL only so a single-node dev Postgres works; Neon
  // deployments must set both, and the migration runner asserts a session.
  return process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
}

/** Module-scope pool, created lazily so requiring this file never opens sockets. */
function pool() {
  if (_pool) return _pool;
  const { Pool } = require('pg');
  _pool = new Pool({
    connectionString: databaseUrl(),
    max: Number(process.env.PGPOOL_MAX || 3),          // serverless: a small pool per instance
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT_MS || 8_000),
    // A statement that outlives the function invocation is a leaked lease, not a
    // slow query: every claim already pre-commits its own backoff.
    statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS || 15_000),
  });
  _pool.on('error', () => { /* a dead idle client is not a request failure */ });
  return _pool;
}

/** Neon HTTP tagged-template client for single statements. */
function sql() {
  if (_sql) return _sql;
  const { neon } = require('@neondatabase/serverless');
  _sql = neon(databaseUrl());
  return _sql;
}

/** One statement, no transaction. Returns rows. */
async function query(text, params) {
  const client = await pool().connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

/**
 * Run `fn` inside a single transaction on one checked-out connection.
 *
 * `fn` receives a `tx` with the same `query(text, params)` shape, so repository
 * functions are transaction-agnostic and always compose into the caller's
 * transaction — which is what makes "the state transition and the operation
 * activation occur in the same transaction" enforceable rather than aspirational.
 *
 * A serialization failure or deadlock is retried a bounded number of times; every
 * other error rolls back and propagates. Retrying is safe because every
 * transaction in the inventory is version- or token-guarded, so a replay either
 * re-applies identically or matches zero rows.
 */
async function withTransaction(fn, { retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const client = await pool().connect();
    const tx = {
      query: (text, params) => client.query(text, params),
      /** Escape hatch for repository helpers that need the raw client. */
      _client: client,
    };
    try {
      await client.query('BEGIN');
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) { /* connection already gone */ }
      lastErr = err;
      if (!isRetryable(err) || attempt === retries) throw err;
    } finally {
      client.release();
    }
  }
  throw lastErr;
}

/**
 * A session-bound connection for migrations. `pg_advisory_lock` is session-scoped,
 * so it cannot run over PgBouncer transaction pooling.
 */
async function withSession(fn) {
  const { Client } = require('pg');
  const client = new Client({ connectionString: unpooledUrl() });
  await client.connect();
  try {
    return await fn({ query: (text, params) => client.query(text, params) });
  } finally {
    await client.end();
  }
}

/** Close the pool. Called by CLI scripts and tests, never by a request handler. */
async function close() {
  if (_pool) { const p = _pool; _pool = null; await p.end(); }
  _sql = null;
}

/** True when a database is configured at all — lets `test:db` skip cleanly. */
function isConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

module.exports = { sql, pool, query, withTransaction, withSession, close, isConfigured, databaseUrl, unpooledUrl };
