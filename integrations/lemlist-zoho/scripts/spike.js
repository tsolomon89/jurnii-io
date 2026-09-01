#!/usr/bin/env node
'use strict';

/**
 * Read-only Lemlist validation spike.
 *
 *   node integrations/lemlist-zoho/scripts/spike.js [--days 30] [--write-fixtures] [--zoho]
 *   node --env-file=.env integrations/lemlist-zoho/scripts/spike.js
 *
 * WHAT THIS IS FOR. The design depends on several Lemlist behaviours that the
 * published API documentation does not actually prove. Each one is either a
 * config constant or has an explicit "absent" branch, so none of them can break
 * the architecture — but every one of them should be settled by observation
 * rather than by assumption before live Zoho writes are armed.
 *
 * WHAT IT WILL NOT DO. It performs no Zoho WRITES of any kind, and no Lemlist
 * mutation is even expressible — the client it uses is non-mutating by
 * construction and cannot reach `POST /inbox/linkedin`. Payloads are printed
 * REDACTED: key sets, presence flags and shapes, never a person's name, email,
 * LinkedIn URL or message text.
 *
 * WITHOUT CREDENTIALS. Runs anyway, reports every question as UNRESOLVED, and
 * exits 0. Absence of a key is not a failure — it just means the live-only
 * questions stay open, which the report states plainly rather than guessing.
 */

const fs = require('node:fs');
const path = require('node:path');

const lemlist = require('../lemlist');

const ARGS = process.argv.slice(2);
const DAYS = Number(argValue('--days') || 30);
const WRITE_FIXTURES = ARGS.includes('--write-fixtures');
const CHECK_ZOHO = ARGS.includes('--zoho');
const ACTIVITY_TYPE = process.env.LEMLIST_ACTIVITY_TYPE || 'linkedinSent';

function argValue(name) {
  const i = ARGS.indexOf(name);
  return i >= 0 ? ARGS[i + 1] : null;
}

const findings = [];

function record(id, question, verdict, detail) {
  findings.push({ id, question, verdict, detail });
  const mark = { YES: '✔', NO: '✘', UNRESOLVED: '?', INFO: 'ℹ' }[verdict] || '?';
  process.stdout.write(`${mark} ${id}  ${question}\n`);
  if (detail) process.stdout.write(`    ${detail}\n`);
}

/** Key sets and presence only — never a value that could identify a person. */
function redactedShape(obj, depth = 0) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.length ? [redactedShape(obj[0], depth + 1)] : [];
  if (typeof obj !== 'object') return typeof obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) { out[k] = null; continue; }
    if (typeof v === 'object') { out[k] = depth < 3 ? redactedShape(v, depth + 1) : '{…}'; continue; }
    out[k] = typeof v;
  }
  return out;
}

function has(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

function pct(n, total) {
  return total ? `${Math.round((n / total) * 100)}% (${n}/${total})` : 'n/a';
}

async function main() {
  process.stdout.write(`\nLemlist spike — read-only. type=${ACTIVITY_TYPE}, window=${DAYS}d\n`);
  process.stdout.write('No Zoho writes. No Lemlist mutations are expressible.\n\n');

  if (!process.env.LEMLIST_API_KEY) {
    record('S0', 'LEMLIST_API_KEY present?', 'NO',
      'Every live question below stays UNRESOLVED. Run again once the key is provisioned.');
    for (const [id, q] of [
      ['S1', `does type=${ACTIVITY_TYPE} return activities?`],
      ['S2', 'is the server-side type filter honoured?'],
      ['S3', 'are contactId and a personal LinkedIn URL present?'],
      ['S4', 'is a rendered message body retrievable from the inbox?'],
      ['S5', 'is companyDomain present?'],
      ['S6', 'does the payload carry a company LinkedIn URL?'],
      ['S7', 'does sendUserId map to a team user with an email?'],
      ['S8', 'what is the actual volume?'],
    ]) record(id, q, 'UNRESOLVED', null);
    return summarise();
  }

  const maxDate = new Date();
  const minDate = new Date(maxDate.getTime() - DAYS * 24 * 60 * 60 * 1000);
  const window = { minDate: minDate.toISOString(), maxDate: maxDate.toISOString() };

  // ---- S1 -----------------------------------------------------------------
  let typed = [];
  try {
    typed = await lemlist.getActivitiesPage(
      Object.assign({ type: ACTIVITY_TYPE, limit: 100, offset: 0 }, window));
    record('S1', `does type=${ACTIVITY_TYPE} return activities?`,
      typed.length ? 'YES' : 'NO',
      typed.length
        ? `${typed.length} on the first page`
        : `EMPTY. The type may not be an /activities value — see S1b for what IS returned. `
          + `Fix is one config constant: LEMLIST_ACTIVITY_TYPE.`);
  } catch (err) {
    record('S1', `does type=${ACTIVITY_TYPE} return activities?`, 'NO',
      `${err.code || err.message}`);
  }

  // ---- S1b: what types exist at all --------------------------------------
  let untyped = [];
  try {
    untyped = await lemlist.getActivitiesPage(Object.assign({ limit: 100, offset: 0 }, window));
    const counts = {};
    for (const a of untyped) counts[a && a.type] = (counts[a && a.type] || 0) + 1;
    const seen = Object.entries(counts).sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${t}=${n}`).join(', ');
    record('S1b', 'which activity types does this workspace actually emit?', 'INFO',
      seen || 'none in this window');
    const linkedinish = Object.keys(counts).filter((t) => /linkedin/i.test(String(t)));
    if (linkedinish.length) {
      record('S1c', 'LinkedIn-shaped types present', 'INFO', linkedinish.join(', '));
    }
  } catch (err) {
    record('S1b', 'which activity types does this workspace emit?', 'UNRESOLVED', err.code || err.message);
  }

  // ---- S2 -----------------------------------------------------------------
  if (typed.length) {
    const offType = typed.filter((a) => a && a.type !== ACTIVITY_TYPE);
    record('S2', 'is the server-side type filter honoured?',
      offType.length ? 'NO' : 'YES',
      offType.length
        ? `${offType.length} rows came back with another type. The client-side `
          + `allow-list already drops them, so this costs requests, not correctness.`
        : 'every returned row matched the requested type');
  }

  // ---- S3, S5, S6 ---------------------------------------------------------
  if (typed.length) {
    const n = typed.length;
    const withContactId = typed.filter((a) => has(a, 'contactId')).length;
    const withLeadId = typed.filter((a) => has(a, 'leadId')).length;
    const withSender = typed.filter((a) => has(a, 'sendUserId') || has(a, 'userId')).length;
    const withLastName = typed.filter((a) => has(a, 'lead.variables.lastName')).length;

    const linkedinUrls = typed
      .map((a) => has(a, 'lead.variables.linkedinUrl') || has(a, 'lead.linkedinUrl'))
      .filter(Boolean);
    const I = require('../identity');
    const personal = linkedinUrls.filter((u) => I.canonicalPersonalSlug(u)).length;
    const company = linkedinUrls.filter((u) => I.canonicalCompanySlug(u)).length;

    record('S3', 'is contactId present on the activity?',
      withContactId ? 'YES' : 'NO', pct(withContactId, n)
        + (withContactId < n ? '  — the body lookup needs it; leadId present on ' + pct(withLeadId, n) : ''));

    record('S3b', 'is a PERSONAL LinkedIn URL present, and canonicalisable?',
      personal ? 'YES' : 'NO',
      `linkedinUrl present on ${pct(linkedinUrls.length, n)}; of those, `
      + `${personal} canonicalise as /in/ and ${company} as /company/. `
      + `This rate is the go/no-go number: a low one means email-only identity and many skips.`);

    record('S3c', 'is lastName present? (a create precondition, never derived)',
      withLastName ? 'YES' : 'NO', pct(withLastName, n));

    const domains = typed.map((a) => has(a, 'lead.variables.companyDomain')).filter(Boolean);
    const bareDomains = domains.filter((d) => I.canonicalCompanyDomain(d)).length;
    record('S5', 'is companyDomain present, and already bare?',
      domains.length ? 'YES' : 'NO',
      `${pct(domains.length, n)} present; ${bareDomains} canonicalise cleanly`);

    const companyLinkedin = typed
      .map((a) => has(a, 'lead.variables.companyLinkedinUrl') || has(a, 'lead.companyLinkedinUrl'))
      .filter(Boolean);
    record('S6', 'does the payload already carry a company LinkedIn URL?',
      companyLinkedin.length ? 'YES' : 'NO',
      companyLinkedin.length
        ? pct(companyLinkedin.length, n)
        : 'absent. Account matching is domain-only. Do NOT add a company-object hop to get it.');

    record('S3d', 'activity key set (redacted)', 'INFO',
      JSON.stringify(redactedShape(typed[0])));

    record('S8', 'volume in this window', 'INFO',
      `${n} on page 1 of a ${DAYS}-day window`
      + (n === 100 ? ' — a full page, so pagination is exercised in production' : ''));
  }

  // ---- S4: the message body ----------------------------------------------
  if (typed.length) {
    const withContact = typed.filter((a) => a && a.contactId).slice(0, 5);
    let checked = 0;
    let found = 0;
    let withBody = 0;
    let sampleKeys = null;

    for (const a of withContact) {
      try {
        const { messages } = await lemlist.getInboxMessages(a.contactId, { limit: 100 });
        checked += 1;
        const hit = messages.find((m) => m && String(m._id) === String(a._id));
        if (hit) {
          found += 1;
          if (hit.message || hit.body || hit.text) withBody += 1;
          if (!sampleKeys) sampleKeys = Object.keys(hit).sort().join(', ');
        }
      } catch (err) {
        record('S4', 'inbox lookup', 'UNRESOLVED', `${a.contactId ? 'contact sampled' : ''} ${err.code || err.message}`);
        break;
      }
    }

    if (checked) {
      record('S4', `does ${ACTIVITY_TYPE} appear in /inbox/{contactId} with a body?`,
        withBody ? 'YES' : 'NO',
        `${found}/${checked} sampled activities were found in the inbox; ${withBody} carried message text.`
        + (sampleKeys ? `  item keys: ${sampleKeys}` : '')
        + (withBody ? '' : '  Tasks are still created, with the absence stated explicitly.'));
    }
  }

  // ---- S7: the sender map -------------------------------------------------
  try {
    const users = await lemlist.getTeamUsers();
    const withEmail = users.filter((u) => u && u.email).length;
    record('S7', 'does GET /team give userId -> email for every sender?',
      withEmail ? 'YES' : 'NO',
      `${users.length} team users, ${withEmail} with an email. `
      + '(/team/senders carries no email and is not used.)');

    if (typed.length) {
      const ids = new Set(users.map((u) => u && String(u.userId)).filter(Boolean));
      const senders = new Set(typed.map((a) => String(a.sendUserId || a.userId || '')).filter(Boolean));
      const unmapped = [...senders].filter((s) => !ids.has(s));
      record('S7b', 'does every observed sender appear in /team?',
        unmapped.length ? 'NO' : 'YES',
        unmapped.length
          ? `${unmapped.length} of ${senders.size} sender ids are not in /team — those need LEMLIST_DEFAULT_OWNER_ID`
          : `all ${senders.size} observed sender ids resolve`);
    }
  } catch (err) {
    record('S7', 'does GET /team give userId -> email?', 'UNRESOLVED', err.code || err.message);
  }

  // ---- S9: Zoho scopes, READ ONLY, opt-in --------------------------------
  if (CHECK_ZOHO) {
    const zoho = require('../zoho');
    const probes = [
      ['Tasks read + COQL', () => zoho.coql('select id from Tasks where Subject = \'__lemlist_spike_probe__\'')],
      ['Contacts read', () => zoho.coql(`select id from Contacts where Email = '__none@example.invalid'`)],
      ['Accounts read', () => zoho.coql(`select id from Accounts where Account_Key = '__none.invalid'`)],
      ['users read', () => zoho.getActiveUsers()],
    ];
    for (const [label, fn] of probes) {
      try {
        await fn();
        record('S9', `Zoho scope: ${label}`, 'YES', 'read succeeded');
      } catch (err) {
        record('S9', `Zoho scope: ${label}`, 'NO',
          `${err.code || err.message} — a missing scope is a prerequisite to REPORT, not to widen`);
      }
    }
  } else {
    record('S9', 'Zoho scopes', 'UNRESOLVED', 'pass --zoho to check (read-only)');
  }

  if (WRITE_FIXTURES && typed.length) writeFixtures(typed);
  return summarise();
}

/** Redacted fixtures, safe to commit: shapes and presence, never a real value. */
function writeFixtures(activities) {
  const dir = path.join(__dirname, '..', 'tests', 'fixtures');
  fs.mkdirSync(dir, { recursive: true });
  const out = {
    '//': 'Redacted Lemlist shapes captured by scripts/spike.js. Key sets and value TYPES only — no names, emails, URLs or message text.',
    capturedAt: new Date().toISOString().slice(0, 10),
    activityType: ACTIVITY_TYPE,
    sampleCount: activities.length,
    activityShape: redactedShape(activities[0]),
    keyUnion: [...new Set(activities.flatMap((a) => Object.keys(a || {})))].sort(),
    leadVariableKeyUnion: [...new Set(activities.flatMap(
      (a) => Object.keys((a && a.lead && a.lead.variables) || {})))].sort(),
  };
  const file = path.join(dir, 'lemlist-activity-shape.json');
  fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  process.stdout.write(`\nwrote ${path.relative(process.cwd(), file)}\n`);
}

function summarise() {
  const counts = findings.reduce((acc, f) => {
    acc[f.verdict] = (acc[f.verdict] || 0) + 1;
    return acc;
  }, {});
  process.stdout.write(`\n${JSON.stringify(counts)}\n`);
  const unresolved = findings.filter((f) => f.verdict === 'UNRESOLVED');
  if (unresolved.length) {
    process.stdout.write(`\nSTILL UNRESOLVED — do not treat these as settled:\n`);
    for (const f of unresolved) process.stdout.write(`  ${f.id}  ${f.question}\n`);
  }
  // Exit 0 either way: an unresolved question is information, not a failure.
  return 0;
}

main().then((code) => process.exit(code || 0)).catch((err) => {
  process.stderr.write(`spike failed: ${err && (err.code || err.message)}\n`);
  process.exit(1);
});
