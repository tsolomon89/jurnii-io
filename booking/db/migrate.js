'use strict';

/**
 * Versioned migration runner.
 *
 * Runs over `DATABASE_URL_UNPOOLED` because `pg_advisory_lock` is session-scoped
 * and cannot work over PgBouncer transaction pooling — two deployments migrating
 * at once is exactly the case the lock exists for.
 *
 *   node booking/db/migrate.js            apply pending migrations
 *   node booking/db/migrate.js --status    list applied / pending, apply nothing
 *   node booking/db/migrate.js --dry-run   print what would run
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { withSession, close } = require('./index');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const ADVISORY_LOCK_KEY = 4207731; // arbitrary, stable: booking migrations only

function discover() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((filename) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
      return {
        filename,
        sql,
        checksum: crypto.createHash('sha256').update(sql, 'utf8').digest('hex'),
      };
    });
}

async function ensureTable(tx) {
  await tx.query(`
    CREATE TABLE IF NOT EXISTS booking_migrations (
      filename    text PRIMARY KEY,
      checksum    text NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )`);
}

async function run({ dryRun = false, statusOnly = false } = {}) {
  const migrations = discover();
  if (!migrations.length) {
    process.stdout.write('[migrate] no migration files found\n');
    return { applied: [], pending: [] };
  }

  return withSession(async (tx) => {
    await tx.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    try {
      await ensureTable(tx);
      const { rows } = await tx.query('SELECT filename, checksum FROM booking_migrations');
      const applied = new Map(rows.map((r) => [r.filename, r.checksum]));

      const pending = [];
      for (const m of migrations) {
        const seen = applied.get(m.filename);
        if (seen === undefined) { pending.push(m); continue; }
        if (seen !== m.checksum) {
          // An edited applied migration means two environments can diverge
          // silently. Refuse rather than guess which one is right.
          throw new Error(
            `[migrate] ${m.filename} was already applied with a different checksum. ` +
            'Add a new migration instead of editing an applied one.'
          );
        }
      }

      if (statusOnly || dryRun) {
        for (const m of migrations) {
          const mark = applied.has(m.filename) ? 'applied' : 'PENDING';
          process.stdout.write(`[migrate] ${mark}  ${m.filename}\n`);
        }
        return { applied: [...applied.keys()], pending: pending.map((p) => p.filename) };
      }

      const done = [];
      for (const m of pending) {
        process.stdout.write(`[migrate] applying ${m.filename}\n`);
        // Each migration is its own transaction: a failure leaves earlier ones
        // applied and recorded, so a re-run resumes rather than restarting.
        await tx.query('BEGIN');
        try {
          await tx.query(m.sql);
          await tx.query(
            'INSERT INTO booking_migrations (filename, checksum) VALUES ($1, $2)',
            [m.filename, m.checksum]
          );
          await tx.query('COMMIT');
          done.push(m.filename);
        } catch (err) {
          await tx.query('ROLLBACK');
          throw err;
        }
      }
      process.stdout.write(
        done.length ? `[migrate] applied ${done.length} migration(s)\n` : '[migrate] up to date\n'
      );
      return { applied: done, pending: [] };
    } finally {
      await tx.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    }
  });
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  run({ dryRun: argv.includes('--dry-run'), statusOnly: argv.includes('--status') })
    .then(() => close())
    .then(() => process.exit(0))
    .catch(async (err) => {
      process.stderr.write(`[migrate] failed: ${err.message}\n`);
      await close().catch(() => {});
      process.exit(1);
    });
}

module.exports = { run, discover };
