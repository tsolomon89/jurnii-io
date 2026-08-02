/**
 * Refuse to run the database suite against Production.
 *
 * WHY THIS EXISTS
 *
 *   The db suite is designed for a scratch database: it writes journeys, drives real
 *   operation handlers and cleans up afterwards. Run with
 *   `--env-file=.env.production.local` it inherits BOTH the production `DATABASE_URL`
 *   and the production `ZOHO_*` credentials, so `worker.test.js` drives the real Zoho
 *   op handlers against the live CRM.
 *
 *   That happened on 2026-08-02: the suite created a live Account ("Acme Ltd",
 *   Account_Key `example.test`), two Contacts, a Deal, a scaffold Quote and two Tasks
 *   in the production org, and left 81 journeys in Production Postgres — 9 of whose
 *   reservations were actively blocking real booking slots on `jurnii_prod`.
 *
 *   Preloaded via `--import` from the `test:db` script, so it cannot be forgotten by an
 *   individual test file.
 */

const url = process.env.DATABASE_URL || '';
const override = process.env.ALLOW_PRODUCTION_DB_TESTS === 'yes-i-accept-live-writes';

const reasons = [];
if (/jurnii_booking_production|ep-old-field-zaqcy38o/.test(url)) {
  reasons.push('DATABASE_URL points at the Production booking database');
}
// The db suite must never reach Zoho. Credentials being present at all is the hazard:
// worker.test.js runs the real op handlers, which write Leads and fire the
// workflow-enabled update that starts Deluge.
if (process.env.ZOHO_REFRESH_TOKEN) {
  reasons.push('ZOHO_REFRESH_TOKEN is set — the worker tests would write to the live CRM');
}

if (reasons.length && !override) {
  const msg = [
    '',
    'REFUSING TO RUN THE DATABASE SUITE:',
    ...reasons.map((r) => `  · ${r}`),
    '',
    'This suite writes real rows and drives real op handlers. Point it at a scratch',
    'database with no Zoho credentials:',
    '',
    '  DATABASE_URL=postgres://…/scratch DATABASE_URL_UNPOOLED=… npm run test:db',
    '',
    'If you genuinely intend live writes, set',
    '  ALLOW_PRODUCTION_DB_TESTS=yes-i-accept-live-writes',
    'and expect to clean up Zoho by hand afterwards.',
    '',
  ].join('\n');
  console.error(msg);
  process.exit(2);
}
