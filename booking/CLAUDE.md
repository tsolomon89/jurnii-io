# `booking/` — module guide for agents

Progressive booking form (widget) + serverless backend + Neon Postgres. Turns a website visitor into a
Zoho CRM record and a Google Calendar / Meet booking.

**Read first:** [`docs/implementation-notes.md`](docs/implementation-notes.md) — the as-built record.
It wins wherever documents disagree. Then [`docs/runbook.md`](docs/runbook.md) for operations.

## The CRM model this module talks to

**Authority:** [`../zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)

```
one Account -> ZERO OR ONE persistent Deal
Products enter as QUOTES under that one Deal, never as extra Deals
```

**The Deluge code and this module both still implement the superseded `Deal = Account × Product`
model.** Two places here assert it as *design intent* and are known drift:

| Location | Claim | Reality |
|---|---|---|
| `docs/architecture.md` (Deal-linking section) | multi-product bookings **must** defer activation to a human; auto-picking a driver Deal *"would break HARD RULE 7"* | Inverted. HARD RULE 7 (one sequence per Contact) is correct; deriving ambiguity from **Product count** is the violation |
| `tests/deluge-multi-product.test.js`, `tests/zoho-field-names.test.js:233-247` | assert the fan-out and `multi_product_sequence_ambiguous` **must remain** | They pin the prohibited model and are expected to fail when it is corrected. **Invert them; do not delete them** |

## ⚠ Cross-repo ordering constraint

`integrations/zoho/index.js` → `resolveProductDeal` picks a Meeting's `What_Id` by **substring-matching
a Product name inside `Deal_Name`**, which depends on Deluge naming Deals `"<Account> - <Product>"`.

Under the approved model that becomes "the Account's one Deal". **This change must ship BEFORE the
Deluge Deal-naming change.** If Deluge goes first, every lookup returns `status:'none'` and two live
paths degrade silently:

- `workflows/zoho-ops.js` creates the Meeting **with no `What_Id`**
- the journey escalates to `product_unresolved`

Same fix needed in `api/_utils/products.js` (`pickProductDeal`), `workflows/zoho-ops.js` and
`workflows/operator-actions.js`.

## Boundaries

- **Node never creates a Deal.** `integrations/zoho/index.js` marks Deals **READ ONLY**. Account→Deal
  and Product→Quote logic is owned by Deluge. Do not reimplement it here.
- A missing Zoho dependency is a **prerequisite failure to report**, not permission to repair metadata
  from Node.
- `db/migrations/` are **applied and immutable**. Two carry Product-Deal column comments — correct them
  with a *new* migration, never by editing an applied one.
- `db/queries/review.js` holds a **persisted enum** over existing rows. Renaming a review code needs a
  data check, not just an edit — historical escalations must stay readable.

## Tests

```bash
npm test          # node --test "booking/tests/*.test.js"
npm run test:db   # DB tests, guarded
```

`BOOKING_MEETING_AUTOMATION_ENABLED` is the rollback switch for Meeting automation. Do not enable it
without a passing controlled test on fixture records.
