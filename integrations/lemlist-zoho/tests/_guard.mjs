/**
 * Test guard. Preloaded via `node --import ./tests/_guard.mjs`, so it runs
 * before any test file is evaluated.
 *
 * WHY THIS IS THE MOST IMPORTANT FILE IN THE TEST DIRECTORY.
 *
 * `booking/tests/db/_guard.mjs` exists because on 2026-08-02 that suite created
 * a live Account, two Contacts, a Deal, a Quote and two Tasks in the production
 * Zoho org. This guard is the same idea applied to a sharper credential: the
 * Lemlist API key can SEND REAL LINKEDIN MESSAGES via POST /inbox/linkedin.
 *
 * The client in this subsystem is non-mutating by construction and cannot reach
 * that endpoint. This guard is the second, independent layer: if the key is not
 * present, no test can possibly reach Lemlist at all, whatever a future edit
 * does to the client.
 *
 * Every test here is offline and fixture-driven, so a present credential is
 * never needed and is always a mistake — most likely a shell that sourced a
 * real `.env`.
 */

const forbidden = [];

if (process.env.LEMLIST_API_KEY) {
  forbidden.push('LEMLIST_API_KEY — the Lemlist credential can send LinkedIn messages');
}
if (process.env.ZOHO_REFRESH_TOKEN) {
  forbidden.push('ZOHO_REFRESH_TOKEN — a live CRM credential');
}

if (forbidden.length) {
  process.stderr.write(
    '\n[lemlist-zoho guard] REFUSING TO RUN TESTS.\n\n'
    + 'A live credential is present in the environment:\n'
    + forbidden.map((f) => `  · ${f}\n`).join('')
    + '\nEvery test in this subsystem is offline and fixture-driven, so no credential\n'
    + 'is needed. Unset it and run again:\n\n'
    + '  LEMLIST_API_KEY= ZOHO_REFRESH_TOKEN= npm test\n\n'
    + 'There is deliberately no override flag. If you want to exercise the live\n'
    + 'API, use scripts/spike.js, which is read-only.\n\n');
  process.exit(2);
}
