# Rebuild instead of migrate — decision record

**Created:** 2026-08-17 · **Marker:** `jurnii-doc-reconciliation-2026-08-17`
**Supersedes:** the per-Account migration procedure in the v6 correction plan (§B6)

## Decision

**Do not migrate the existing records. Correct the code, wipe the CRM records, re-import from CSV.**

The owner confirmed the org is a development instance: no custom Reports, Dashboards or Analytics; not
in meaningful operational use; the data can be deleted and re-uploaded "no harm, no foul."

## Why this is strictly better than migrating

A migration proves only that you can *patch* old data. A clean re-import through corrected code proves
the **model itself works end to end** — which is the actual question.

It also dissolves the four hardest items in the plan outright:

| Migration problem | Under rebuild |
|---|---|
| `Deals.Deal_Key` is UNIQUE ci, so rekeying two Deals of one Account to a bare `Account_Key` **400s** — and a rejected key can void the whole `dUpd` map | **Gone.** No Deal is ever rekeyed; each is created once, correctly |
| Survivor election across 17 Accounts / 21 surplus Deals, with a scoring rule and a tie-break | **Gone.** The surplus Deals are never created |
| Reparenting 21 Quotes + 16 Activities, each needing a read-back | **Gone** |
| Per-Account rollback from a snapshot | **Replaced by** "wipe and re-import again" — repeatable, and cheap enough to run after every fix |

Two data defects also disappear rather than being repaired: the **35 Tasks carrying a wrong
`Task_Opportunity`**, and the **21 surplus Deals**. Neither is migrated — neither ever exists.

## Provenance evidence (live, read-only, 2026-08-17)

Everything in the org is reproducible or disposable:

| Module | Count | Origin |
|---|---|---|
| Accounts | 200 | **200/200 created 2026-07-21** — the bulk CSV import |
| Contacts | 200+ | **200/200 created 2026-07-21** — same import |
| Deals | 96 | 94 on 2026-07-21; 2 on 2026-08-14 (the `Jurnii E2E Ltd` test account) |
| Quotes | 125 | 122 on 2026-07-21; 2 on 2026-08-14; 1 on 2026-07-29 |
| Tasks | 219 | 182 on 2026-07-21 — **automation-generated** (`Sequence Activation` 130, `Manual Review` 70), not imported. They regenerate |
| Calls | 0 | — |
| Events | 156 | **0 carry `Ext_Calendar_Booking_ID`, 0 carry `What_Id`** — calendar-sync noise, linked to nothing |
| Notes | **0** | No hand-authored content exists anywhere |
| Leads | 13 | The only post-import records: 11 on 2026-07-26 (`Website`), 2 on 2026-08-10 (`Employee Referral`) |

**Source CSV is in the repo:** `zoho-functions/.agents/context/import_tests/Jurnii LTD Pipeline - CLEANED.csv`
— 255 rows, carrying `Product Interest`, `Pipeline`, `Opportunity`, `State`, `Status`, `Stage`.

**The 13 Leads — resolved (owner, 2026-08-17).** All booking-form data is test data, so the 11
`Website` Leads (2026-07-26) are disposable. The 2 `Employee Referral` Leads (2026-08-10) *may* be
operational, but the owner can re-upload them or trace their provenance. **Nothing blocks the wipe.**

Corroborated over Gmail: the three booking E2E calendar invitations on 2026-08-02 went to
`timothy+booking-e2e-<timestamp>@jurnii.io` addresses — the booking path was being exercised against
the owner's own inbox, not against prospects.

## ⚠ What a record wipe does NOT remove

Deleting records is not the same as resetting the org. These persist and are handled separately:

- **Custom fields** — retirement is still its own task, now unblocked by B1 being void but still gated on
  B4 (remove every writer → publish → read the update map back).
- **Workflow rules** — all 18 survive a wipe. The CRUD verdicts in `V6_CRUD_PLAN.md` §2 still apply.
- **Deluge functions** — unaffected. All 38 still need their corrections.
- **Layouts, picklists, profiles** — unaffected.

## ⚠ Booking is in production against this org

`jurnii.vercel.app` has been live since 2026-08-01 and writes to this org, with its own Neon database
holding `booking_journeys` rows that reference Zoho record ids by value.

Before any wipe:
1. **Pause booking**, or accept that an in-flight journey will fail.
2. Decide what happens to `booking_journeys` rows whose `zoho_*_id` values will no longer resolve —
   truncate the dev journeys, or leave them as dangling history.
3. Note the existing stuck row `fd75c529 / zoho_deal_reconcile`, which has polled a deleted Event since
   2026-08-10. A wipe does not fix it; it needs the terminal-state fix.

## Sequence

The ordering constraint inverts. Under migration, code had to tolerate a transitional multi-Deal state.
Under rebuild, **the import path must be correct before the data exists** — there is no transitional
state to survive.

1. **Correct the code** — Deluge waves per `V6_CRUD_PLAN.md` §6, and the booking `resolveProductDeal`
   fix. Nothing is published until the whole set is ready.
2. **Fix the workflow rules** — `V6_CRUD_PLAN.md` §2.
3. **Publish everything**, in the dependency order of §6. The transitional resolver described in the old
   §B6.1 is no longer needed, but is harmless to keep as a defensive guard.
4. **Wipe records** — Quotes → Deals → Activities → Contacts → Accounts → Leads. Child-first, so no
   lookup is orphaned mid-delete.
5. **Re-import the CSV** through the corrected `processLead` path.
6. **Verify against the model**, not against the old data — the acceptance set below.

## Acceptance after re-import

Assert on the rebuilt data, not on a diff against the old:

| # | Assertion |
|---|---|
| R1 | **No Account holds more than one live Deal.** Previously 17 did |
| R2 | Every `Deal_Key` equals its `Account_Key` — no `::` composition anywhere |
| R3 | Every Deal name is the Account name — no `" - <Product>"` suffix |
| R4 | An Account with N Product interests has **1 Deal and N Quotes** |
| R5 | Every Quote carries exactly one Product; header `Quote_Product` agrees with its `Quoted_Items` line |
| R6 | `Deals.Opportunity_Stage` = the furthest-progressed Contact Stage on the Account |
| R7 | `Deal.Amount` = the sum of its Quotes — **not** a per-Deal tier figure multiplied by Product count |
| R8 | Every Activity's `*_Task_Stage` and `*_Task_Opportunity` match the **Contact** at creation; `*_Task_Pipeline` matches the Deal |
| R9 | **Zero** `[multi_product_sequence_ambiguous]`, `[quote_product_mismatch]` or `[duplicate_product_deal]` reviews raised |
| R10 | Multi-product Contacts hold an Activation Task like any other |
| R11 | `Accounts.Account_Status` is written for every Account — the roll-up did not silently return early |

**R7 will restate headline pipeline downward.** 57.3% of the current figure is a tier fallback
multi-counted across Product Deals. On test data that is a correctness win, not a commercial event —
but it is the number that must be right before the org carries real data.

## What this does not change

The code correction is unchanged in scope. Rebuilding removes the *data* problem, not the *model*
problem — `V6_CRUD_PLAN.md` stands in full, and the three functional flows still have to work.
