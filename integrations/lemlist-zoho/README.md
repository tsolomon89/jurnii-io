# Lemlist → Zoho CRM outbound-activity import

SDRs run LinkedIn outbound through Lemlist. This imports that activity into Zoho — the system of record —
so a rep looking at a Contact can see the prospect was already messaged, and so outbound effort is visible
to reporting.

**A daily one-directional import. Not a synchronisation platform.** Nothing is pushed back to Lemlist, no
Leads or Deals are created, and no existing CRM data is overwritten.

---

## What it does

```
Once per day (04:30 UTC)
    ↓
Fetch the last 7 days of Lemlist linkedinSent activities
    ↓
For each activity:
    Task "LinkedIn Sent <activityId>" already in Zoho?  → skip
    ↓
    Find the Contact:  canonical LinkedIn URL → primary email
    ↓
    If missing:  find the Account by company domain → company LinkedIn
                 create the Account only if genuinely missing
                 create the Contact beneath it
    ↓
    Create one completed Zoho Task
        Who_Id      = the Contact
        What_Id     = the Account (when known)
        Description = message body + Lemlist metadata + the ORIGINAL send time
```

## The two mechanisms that carry the whole design

Most of the infrastructure you might expect is absent **on purpose** — no database, no checkpoint table,
no queue, no state machine, no worker, no reconciliation job. Two things replace all of it:

**1. The Zoho Task Subject is the import identity.** Every Task is named
`LinkedIn Sent <lemlist activity id>`, and the importer asks Zoho whether that Subject already exists
before doing anything else. Rerunning the same window is therefore always safe.

**2. The overlapping window is the retry.** Each run asks Lemlist for the last `LEMLIST_LOOKBACK_DAYS`
days, not "everything since last time". If Sunday's run fails, Monday's still covers Sunday — and the
Subject check stops anything already imported from importing twice.

So the failure policy is uniform: **log the reason, skip the activity, carry on.** There is nothing to
queue and no state to reconcile. The one thing never done on uncertainty is a speculative CRM write.

---

## Files

| File | Role |
|---|---|
| [`lemlist.js`](lemlist.js) | Lemlist client. **Non-mutating by construction** — see the warning below |
| [`zoho.js`](zoho.js) | COQL wrapper, suppressed Account/Contact creates, and the pure Task builders |
| [`identity.js`](identity.js) | Canonicalisation and the resolution verdicts. No I/O — every query is injected |
| [`sync.js`](sync.js) | The daily loop and the run summary |
| [`handler.js`](handler.js) | `GET\|POST /api/v1/internal/lemlist-sync`, `CRON_SECRET` only |
| [`scripts/spike.js`](scripts/spike.js) | Read-only Lemlist probe. Safe to run with no credentials |
| [`scripts/zoho-field-snapshot.js`](scripts/zoho-field-snapshot.js) | Captures live field metadata; `--check` fails on drift |

Everything reusable is reused rather than reimplemented: the Zoho transport, OAuth, error taxonomy,
`Retry-After` parsing, PII-free error description, write envelope and Task create all come from
`booking/integrations/zoho/index.js`; email normalisation and the free/disposable-domain denylist from
`booking/api/_utils/email.js`; cron auth from `booking/lib/auth.js`; structured logging from
`booking/lib/http.js`. **`booking/**` itself is not modified.**

The only genuinely new Zoho code is a COQL wrapper — there was no COQL anywhere in the repo — and Contact
and Account creation, which the booking backend deliberately lacks.

---

## 🚨 The Lemlist API key can send real LinkedIn messages

`POST /inbox/linkedin` — the same base URL, the same credential — is *Send LinkedIn Message*. So are
`/inbox/email` and `/inbox/whatsapp`.

[`lemlist.js`](lemlist.js) is therefore non-mutating **by construction, not by care**: the transport takes
no method parameter and can only issue `GET`, no mutating method is exported, the send paths do not appear
in its executable source, and `markAsRead` is unrepresentable so even reading an inbox cannot change
Lemlist state. `tests/lemlist-client.test.js` asserts each of those, and
[`tests/_guard.mjs`](tests/_guard.mjs) refuses to run the suite at all if `LEMLIST_API_KEY` is set.

Treat the key with the care you would give a mailbox password.

---

## Identity resolution

### Contact — LinkedIn, then email, with conflicts surfaced

Live `Contacts.Personal_Linkedin` values are inconsistent — `http://…`, `https://…/`,
`…?skipRedirect=true`, percent-encoded international slugs — so exact-string search would miss almost
every time. Instead:

1. Canonicalise the Lemlist URL to a slug (`tuf-gavaz`).
2. Ask Zoho for candidates with COQL `Personal_Linkedin like '%/in/<fragment>%'` — verified working and
   case-insensitive.
3. **Decide in Node** by comparing canonical forms exactly.

Step 3 is not optional: `like` cannot distinguish `john-smith` from `john-smith-4a92b117`, and the live
data proves that suffixed shape is the common one.

The email rung matches the **primary `Email` field only**, by exact COQL predicate.
`searchContactsByEmail` from the booking client is deliberately not used — its `?email=` semantics span
every email field, which would let a non-unique `Secondary_Email` become person identity.

Both signals are evaluated and then reconciled. If LinkedIn resolves to Contact A and the email to
Contact B, that is an identity conflict: nothing is created, nothing is merged, nothing is picked, and
both ids are logged. Role mailboxes (`info@`, `sales@`, `noreply@`, …) are never identity.

**A failed query is never an absence.** Absence is what authorises creating a person in the system of
record, so any API error skips the activity for tomorrow instead.

### Account — company domain, then company LinkedIn

Only reached when a Contact must be created; an existing Contact keeps the Account it already has.
Identity is an exact canonical domain or an exact canonical company slug — **never a company name**.
Public and disposable domains are never Account identity.

Company LinkedIn is used **only when the Lemlist payload already carries it**. There is deliberately no
company-object traversal: no `GET /companies` hop, no `companyId` chain, no cache. Absent it, matching is
domain-only, which can only under-match — and an under-match is caught by the veto below rather than
producing a wrong Account.

### The one guard that must never be removed

Before creating an Account, the two **name-shaped** forms Deluge itself would search are probed:

```
Accounts.Account_Name = <companyName minus ( ) : ,>
Accounts.Account_Key  = <companyName lowercased/normalised>     e.g. "finnish monopoly"
```

**If either hits while the domain and slug rungs did not, the create is refused.** Company name may
*forbid* a create; it may never *choose* an Account.

Why this one survives when so much else was cut: `_util_resolveAccount.deluge` searches every key form and
**stops with a review when two Accounts match**, performing no dependent writes. So if a company already
exists as a name-keyed Account and this integration creates a second, domain-keyed one, every future Lead
and Contact for that company resolves ambiguous — permanently. No Account link, no Deal, no activation.
**One bad Account create can jam that company's commercial graph, and no retry undoes it.** Everything
else here can fail and be retried tomorrow.

---

## What gets written

### The Task

```js
Subject:               `LinkedIn Sent ${activityId}`
Status:                'Completed'
Who_Id:                the Contact
What_Id + $se_module:  the Account + 'Accounts'   // together, or neither
Owner:                 the mapped SDR
Task_Sequence_Managed: false                       // explicit, not omitted
Description:           tokens, then the message body
```

Every omission is load-bearing, each against a specific live guard:

| Omitted | Because |
|---|---|
| `Task_Type` | no safe picklist member exists; blank keeps `handleTaskCompletion` a no-op |
| `Task_State` | a blank `Task_State` is a second, independent guard in the same function |
| `Due_Date` | it is a `date` (cannot hold the send time) **and** the trigger field of live rule WFC-SchedEmail, whose action chain emails prospects |
| `Closed_Time` | read-only in this org |
| `Blocks_Sequence` | a RETIRE field with zero readers |
| `Task_Stage`, `Task_Sequence_Stage` | the two use non-interchangeable stage vocabularies |

`Task_Sequence_Managed` is written **`false` explicitly** rather than omitted, so a future field default of
`true` cannot silently arm `routeContactSequence`'s cadence-blocking predicate.

**No Manual Review Task is ever created** — a Contact-scoped one would be found by `createAuxTask`'s dedupe
and have Deluge's own review codes appended into it. Skips are logged, not written to the CRM.

### The Description, and where the timestamp lives

```
[lemlist_activity] act_x6esGLhoPa2SMHCZ7
sent_at: 2026-08-30T14:03:11+00:00
campaign: Q3 UK Operators (cam_oxeGg6paG3ZVxjHkH)   step: 3
sender: alex.doe@example.com
lemlist_contact: ctc_FkeUdQHEfhqG2HMbK
--- message ---
<plain text>
```

Tokens lead because truncation cuts from the end. **`sent_at` is the only home for the exact send
instant** — `Closed_Time` is read-only and `Due_Date` is a date — so state it plainly: the original
timestamp is recorded and readable, but **it is not queryable or reportable** in this version. A
`Tasks.Lemlist_Sent_At` datetime field would fix that and is an owner decision, not a prerequisite.

When no body is retrievable the section is exactly one fixed sentence, so "we looked and it is not there"
is distinguishable from silence. **A missing body never blocks the Task.**

The HTML→text transform strips every `<img>` and any `lemlst.org` URL. That is correctness, not
cosmetics: Lemlist bodies embed `https://zr0.lemlst.org/api/track/open/…` tracking pixels, and rendering
that HTML anywhere would fire **false "open" events back into Lemlist** and corrupt the SDR's own campaign
analytics.

### Created records

Both creates are hard-wired to `trigger: []`. Without suppression a Contact insert fires WF001b2 →
`processContact`, which resolves-or-creates the Account, **creates the Account's Deal**, writes a
`Contact_Roles` row and runs the 2765-line `processDeal` — which can dispatch an automated email to a cold
prospect.

**Account.** `Account_Name`, `Owner`, and then:

```
Domain known:     Website = <bare canonical domain>,  Account_Key = same
No domain:        Website OMITTED,                    Account_Key = <normalised name>
```

`Website` is data about the domain; `Account_Key` is identity machinery. They coincide only when a domain
exists, and a name-derived value never goes into `Website`. Writing the key Deluge would itself derive is
what stops its tier-1 lookup forking on the next Lead. `Industry` is never written — Lemlist supplies free
text into a Zoho picklist, and a non-member voids the whole map.

**Contact.** `Last_Name` (the only mandatory field), `First_Name`, `Email`, `Personal_Linkedin`,
`Account_Name`, `Owner`, `Job_Title_Raw`.

**No commercial lifecycle state is asserted.** `Stage`, `State`, `Status` and `Contact_Role1` are all
omitted — verified optional on the live module. The Contact exists because the person exists, not because a
commercial state has been claimed; `Stage = 'Marketing Consent'` would be a false MQL claim about someone
who was cold-messaged. `Lead_Source` is omitted too: the picklist has no `Lemlist` member and a non-member
voids the whole map.

> **A consequence worth knowing.** Because `WF001b0` is a `field_update` rule on exactly those fields, a
> Contact created blank never fires it and so never enters the commercial model. That is intended. The
> residual risk is that a later **bulk edit or import** over these Contacts fires `WF001b0`/`WF001c`
> *en masse*, creating many Accounts, Deals and Quotes at once. Classify Lemlist-originated Contacts
> deliberately and in batches — that is a process control, not a code one.

`Last_Name` is a **precondition, never synthesised**. No surname is derived from the email local-part, the
company name, a `fullName` split, or a placeholder; without one the activity is skipped and tomorrow's run
retries it, which gives a human the chance to fix the Lemlist record.

---

## Running it

```bash
# Read-only Lemlist probe. Works with or without a key; unresolved questions are reported as unresolved.
node integrations/lemlist-zoho/scripts/spike.js --days 30
node --env-file=.env integrations/lemlist-zoho/scripts/spike.js --days 30 --write-fixtures

# Live field metadata. Read-only; --check fails if the org has drifted from the fixture.
node --env-file=.env integrations/lemlist-zoho/scripts/zoho-field-snapshot.js --check

# Offline tests. No credential is needed, and the guard refuses to run if one is present.
cd integrations/lemlist-zoho && npm test

# Drive the endpoint by hand (Preview gets no cron).
curl -H "Authorization: Bearer $CRON_SECRET" \
  "$BASE/api/v1/internal/lemlist-sync?dryRun=1"
```

### Deployment — Fly.io, not Vercel

The project migrated to Fly.io (`fly.toml`, app `jurnii-web`, region `lhr`). Two process groups run from
one image:

```
app     = node server.js         Express 5, serves dist/ and every /api route
worker  = node worker-runner.js  a 60s loop: the booking recovery pass + the daily jobs
```

**Scheduling is `worker-runner.js`, not a platform cron.** The Lemlist sync fires from
[worker-runner.js](../../worker-runner.js) on the first pass after **04:00 UTC**, guarded by an
in-memory `lastLemlistRunDate`. The HTTP route
`/api/v1/internal/lemlist-sync` is wired in [server.js](../../server.js) and remains available for
manual runs.

> ⚠ **`vercel.json` is vestigial.** No workflow deploys to Vercel any more, so its `crons` array never
> fires — including the `30 4 * * *` Lemlist entry. The entry and the root `api/v1/internal/lemlist-sync.js`
> shim are both kept as the Vercel-shaped wiring in case that host returns, and the handler test still
> pins them, but **neither is what runs in production**. Do not "fix" scheduling by editing `vercel.json`.

> **A restart re-runs the day's sync, and that is safe by design.** `lastLemlistRunDate` lives in memory,
> so a deploy after 04:00 UTC makes the next pass run the sync again. The Subject-based import identity
> makes that a no-op: every activity already imported is skipped. This is precisely the property that
> justified having no database.

Secrets are Fly secrets, not Vercel env vars:

```bash
fly secrets set \
  LEMLIST_API_KEY=... \
  LEMLIST_DEFAULT_OWNER_ID=991103000002846001 \
  LEMLIST_SYNC_ENABLED=true \
  LEMLIST_ZOHO_WRITE_ENABLED=false
```

`fly secrets set` restarts the machines, which is how new configuration takes effect on both the `app` and
`worker` process groups.

### Rollout order

| Step | Set | Expect |
|---|---|---|
| 1 | `LEMLIST_API_KEY` | run `spike.js` locally; settle the live questions |
| 2 | `LEMLIST_SYNC_ENABLED=true` | full dry run: activities fetched, identities resolved, creation **projected**, nothing written. Read the summary |
| 3 | `LEMLIST_ZOHO_WRITE_ENABLED=true`, `LEMLIST_MAX_TASKS_PER_RUN=5` | Tasks for activities whose Contact already exists. Inspect in the CRM, re-run, confirm zero new ones |
| 4 | `LEMLIST_ALLOW_RECORD_CREATION=true` | Contacts (and Accounts, if needed) start being created |
| 5 | raise the cap 25 → 100 → unset | steady state |

Steps 3 and 4 are swapped relative to a naive reading, because in this workspace **no messaged prospect
yet exists in Zoho** — so with creation off, step 3 imports nothing. Check the dry-run
`wouldCreateContact` count to see what step 4 will do.

`?dryRun=1` forces a dry run at any point and can never be overridden by configuration.

```bash
# Drive it by hand on Fly
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://jurnii-web.fly.dev/api/v1/internal/lemlist-sync?dryRun=1"
```

### Reading the run summary

The response body and the single `lemlist.sync.complete` log line are identical:

```json
{ "outcome": "complete", "dryRun": false, "activitiesFetched": 41,
  "typeMismatchDropped": 12, "alreadyImported": 26, "tasksCreated": 3,
  "contactsMatchedByLinkedin": 2, "contactsMatchedByEmail": 1, "contactsCreated": 0,
  "accountsMatchedByDomain": 0, "accountsCreated": 0,
  "bodiesResolved": 3, "bodiesUnavailable": 0, "contactsTagged": 0, "ownerUnconfigured": 0,
  "skipped": {}, "apiFailures": {}, "window": { "...": "..." }, "durationMs": 8421 }
```

`skipped` and `apiFailures` are keyed by reason, so a recurring problem is visible as a count rather than
buried in a stack trace. Logs carry ids, codes, counts and booleans only — never a name, email, URL,
message body or third-party error string.

### Re-importing a window

There is no backfill command, and none is needed: raise `LEMLIST_LOOKBACK_DAYS`, run the endpoint, and
every activity already imported is skipped by Subject. To re-import a *specific* activity, delete its Task
in Zoho and run again.

---

## Live spike results (2026-09-03)

Run against the real workspace and the real Zoho org, read-only. These settle the questions the design
was built to survive either answer to.

| # | Question | Answer |
|---|---|---|
| S1 | Is `linkedinSent` a valid `/activities` type? | **Yes.** 6 in 120 days. The workspace also emits `linkedinVisitDone` (46), `linkedinInviteDone` (32), `linkedinInviteAccepted` (17), `linkedinOpened` (3) — all correctly excluded |
| S2 | Is the server-side `type` filter honoured? | **Yes**, every returned row matched |
| S3 | `contactId` present? | **100%** |
| S3b | Personal LinkedIn URL present and canonicalisable? | **100%**, all `/in/` — identity resolution is fully available |
| S3c | `lastName` present? | **100%** |
| S4 | Is the rendered message body retrievable? | **Yes — better than expected.** `activity.text` carries it as **plain text** directly, so **no inbox request is needed at all**. The inbox also holds it (field `text`, not `message` as documented) and remains a fallback |
| S5 | `companyDomain` present? | **100%**, all canonicalise cleanly |
| S6 | Company LinkedIn URL in the payload? | 17% (1 of 6). Domain-only matching for the rest, as designed |
| S7 | Can a sender be mapped to a Zoho user via the API? | **No.** `GET /team` returns `userIds` as bare strings, `/team/senders` returns `[{userId, campaigns}]`, `/users` is not a route — **no endpoint exposes a sender email.** So ownership is configured (`LEMLIST_DEFAULT_OWNER_ID`) and the sender is recorded in the Task `Description` instead |
| S8 | Volume | 6 in 120 days. Comfortably one page |
| S9 | Zoho scopes | COQL, Tasks read, Contacts read, Accounts read, users read **all pass** on the existing refresh token. CREATE scopes are unprovable without writing — see below |

### The dry-run projection over those 6 activities

```
activitiesFetched            6
contactsMatchedByLinkedin    0     ← none of the 6 people exist in Zoho yet
contactsMatchedByEmail       0     ← these leads carry NO email at all; identity is LinkedIn-only
accountsMatchedByDomain      4     ← Entain ×3, Playtech
accountsMatchedByLinkedin    1     ← Novibet, whose domain is corporate.novibet.com
wouldCreateAccount           0     ← every company already exists
wouldCreateContact           5
skipped                      { missing_company_name: 1 }
```

Three things worth drawing out:

- **5 of 6 companies already exist in Zoho**, so the Account-create path is barely exercised. The riskiest
  operation is the one least needed.
- **Subdomains do get handled** — `corporate.novibet.com` does not match the `novibet.com` Account by
  domain, but the company LinkedIn URL rescued it. Where neither works the activity is skipped, not
  guessed at.
- **The one refusal is correct, not a bug.** Five of six activities carry an **empty `companyName`**.
  LiveScore's `livescoregroup.com` matched no Account, had no company LinkedIn and no name — so the veto
  refused. `Accounts.Account_Name` is mandatory in Zoho, so a create would have failed anyway. **This is a
  Lemlist data-quality gap, not a code one:** populating `companyName` on those leads would let them
  import.

## Known limitations

- **The exact send timestamp is not queryable.** It lives in `Description` because `Closed_Time` is
  read-only and `Due_Date` is a date. A `Tasks.Lemlist_Sent_At` datetime field would fix it.
- **`Task_Type` is blank**, so these Tasks are harder to filter in the Zoho UI than they could be. Adding a
  `LinkedIn Sent` picklist member is an owner action with no correctness impact.
- **Unresolved activities are invisible in the CRM.** Skips are counted in the run summary and logged;
  deliberately no Manual Review Task is created, because Deluge would adopt it.
- **Ownership is configured, not derived.** Every created record goes to `LEMLIST_DEFAULT_OWNER_ID`
  regardless of who sent the message — no Lemlist endpoint exposes a sender email, so an owner could never
  be inferred. The sender is still recorded in the Task `Description`, so attribution is not lost.
- **The `Lemlist` tag must exist in Zoho.** Creating a tag is org metadata and is not done from code. If
  it is deleted, tagging fails, the failure is counted as `tagFailures`, and Contacts still import.
- **Activities with no `companyName` are unimportable** when their domain matches no Account — currently
  the majority. Fixable in Lemlist, not here.
- **Zoho CREATE scopes are unproven.** Reads all pass on the existing token, but `booking/docs/runbook.md`
  records that no scope inventory exists for it. The first live create is what proves them, which is why
  the rollout starts at a cap of five.
- **Two runs overlapping within seconds could both create a Task**, because Zoho's search index is
  eventually consistent. The cron runs daily, so this is not a real scenario — and the fix would be to not
  run two crons, not to add a database.
