# `integrations/lemlist-zoho/` — subsystem guide for agents

Daily one-directional import of Lemlist LinkedIn outbound activity into Zoho CRM as **completed Tasks**.
Not a synchronisation platform. Read [`README.md`](README.md) for how it works.

**Authority for the CRM model:**
[`../../zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../../zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)

---

## What this subsystem MAY do

- **Create Accounts and Contacts**, with workflows suppressed (`trigger: []`), after deterministic
  identity resolution proves they are genuinely absent.
- **Create completed Tasks** on a resolved Contact, optionally related to its Account.
- **Read** Zoho records via COQL and the record API.
- **Read** Lemlist activities, inbox messages and team users.

## What this subsystem MUST NOT do

- **Never create or modify a Deal or a Quote.** The commercial lifecycle is owned by Deluge
  (`processContact` / `processDeal`). A LinkedIn message is not a commercial opportunity, and nothing here
  may assert that it is.
- **Never create or alter a Zoho field, picklist value, layout, workflow, validation rule, blueprint or
  OAuth scope.** A missing dependency is a **prerequisite failure to report**, not permission to repair
  metadata.
- **Never update an existing Contact or Account.** v1 has *no update path at all* — that is what makes
  "existing CRM data is not overwritten" structural rather than conditional, and
  `tests/task.test.js` asserts the absence.
- **Never issue an unsuppressed write.** The create functions take no trigger parameter, so it is not
  expressible.
- **Never mutate Lemlist.** The client is non-mutating by construction; see below.

### Why the boundary is scoped by directory, not by an exception

`booking/CLAUDE.md` says *"Node never creates a Deal"* — respected here, since this subsystem creates
none. The stronger no-Contact/Account rule lives in `booking/docs/implementation-notes.md` and explicitly
scopes itself to *"this backend"*, which this subsystem is not.

**`booking/**` is therefore not modified at all**, and its absence assertions in
`booking/tests/integrations.test.js` stand unchanged. Each subsystem states its own prohibition where it
lives; neither needs to know about the other's. Do not "reconcile" them by weakening booking's.

---

## 🚨 The Lemlist API key can send real LinkedIn messages

`POST /inbox/linkedin` — same base URL, same credential — is *Send LinkedIn Message*. So are
`/inbox/email` and `/inbox/whatsapp`. A typo could message a real prospect from an SDR's own account.

[`lemlist.js`](lemlist.js) is **non-mutating by construction**, not by care:

- the transport takes **no method parameter** and can only issue `GET`;
- no `post` / `put` / `patch` / `delete` is exported, and no generic `request` is;
- the strings `/inbox/linkedin`, `/inbox/email`, `/inbox/whatsapp` do not appear in executable source;
- `markAsRead` is **unrepresentable**, so reading an inbox cannot mutate Lemlist state either.

`tests/lemlist-client.test.js` asserts every one of those against the module and its own source. **Do not
add a generic request helper to that file**, and do not "fix" the tests if one appears — the test is the
control.

---

## The two mechanisms that replace all the machinery

Understand these before changing anything, because most "missing" infrastructure is missing on purpose.

1. **The Zoho Task Subject is the import identity.** `LinkedIn Sent <activityId>`, checked with an exact
   COQL `Subject =` predicate before importing. So rerunning is always safe, and there is no ledger, no
   checkpoint, no state machine and no database.
2. **The overlapping window is the retry.** Every run asks for the last `LEMLIST_LOOKBACK_DAYS` (7), not
   "since last time". A failed Sunday is covered by Monday. So there is no queue, no backoff ladder and no
   unresolved-item subsystem — every failure is `log and skip`.

If you are tempted to add durable state, check first whether the overlap already solves it.

---

## Live-verified constraints you must not undo

| Fact | Consequence |
|---|---|
| `Tasks.Closed_Time` is **read-only** (`view_type: edit:false, create:false`) | the exact send instant lives in `Description` only, and is not queryable |
| `Tasks.Due_Date` is a `date`, and is the trigger field of live rule **WFC-SchedEmail** whose action chain **emails prospects** | `Due_Date` is never written |
| `Tasks.Description` is not queryable — COQL says `unsupported column in criteria`, search says `invalid operator found` | the activity id must live in the **Subject** |
| `contains` is not a permitted search operator on `Subject` | the check uses COQL `=`, not the search API |
| `Task_Type` has no safe member (the only two outside Deluge's nine `knownTypes` are claimed) | `Task_Type` is omitted; blank keeps WF008 a no-op |
| `Contacts.Last_Name` is the **only** `system_mandatory` field | it is a create precondition, never synthesised |
| `Contacts.Title` sits in the layout's Unused bin | writes to it vanish silently; never written |
| `Lead_Source` has no `Lemlist` member, and a non-member **voids the whole write map** | `Lead_Source` is never written |
| `Accounts.Account_Name` is `unique` **and** mandatory | a `DUPLICATE_DATA` on Account create is terminal, never adopted |
| Deluge's `_util_resolveAccount` returns `many` and **stops** when two Accounts match | one wrongly-created Account jams that company's graph permanently — hence the name veto |

**The name veto is the one guard that must never be removed.** Company name may *forbid* an Account
create; it may never *choose* an Account.

---

## Tests

```bash
cd integrations/lemlist-zoho && npm test      # node --test "tests/*.test.js"
node scripts/spike.js                          # read-only Lemlist probe; safe with no key
node scripts/zoho-field-snapshot.js --check    # fails if the live field metadata has drifted
```

Everything is offline and fixture-driven. Injected dependencies are the only seam: the harness in
`tests/sync.test.js` throws `unexpected call: <name>` for any I/O that was not explicitly stubbed, so a
code path that reaches the network by accident fails loudly.

**`LEMLIST_API_KEY` must not be set while tests run** — the suite refuses to proceed if it is.
