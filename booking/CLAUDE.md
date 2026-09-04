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

**The correction is IMPLEMENTED in this module's working tree but NOT PUBLISHED** (2026-08-19).
`resolveProductDeal` and `pickProductDeal` now resolve **the Account's single Deal** and ignore the
Product argument for selection. The two former drift entries are resolved:

| Location | Was | Now |
|---|---|---|
| `tests/deluge-multi-product.test.js` | pinned the Product-Deal fan-out | **Inverted into absence guards** — asserts no `::` Deal_Key composition, no `createOrReuseProductDeal`/`pipelineForProductKey` caller, no per-Product reconcile, and that a duplicate Deal is never auto-merged |
| `tests/zoho-field-names.test.js` | asserted `multi_product_sequence_ambiguous` and the `"Decision Maker"` seed must remain | **Inverted** — asserts a multi-product Contact activates normally, and that blank roles stay blank |
| `docs/architecture.md` (Deal-linking) | multi-product bookings **must** defer activation to a human | ✅ **CORRECTED 2026-09-04.** Body and banner both rewritten: one Deal, Products as Quotes, multi-product Contacts activate normally. The old reasoning is retained under a "Formerly:" heading so the change stays legible |

## ⚠ Cross-repo ordering constraint — SATISFIED, and it is now a JOINT publish

`resolveProductDeal` used to pick a Meeting's `What_Id` by substring-matching a Product name inside
`Deal_Name`, which depended on Deluge naming Deals `"<Account> - <Product>"`.

The resolver has been corrected to "the Account's one Deal", so the **hazard has inverted**: it is the
corrected resolver that now assumes one Deal per Account. Shipping it while 17 Accounts still hold 2–3
Product Deals would return `status:'many'` for all of them. It therefore ships **inside the P1 window,
after the Deluge set and after the P2 wipe removes the multi-Deal graph** — not before, and not alone.

If only one side ships, both failure directions are silent:

- Deluge first → old resolver returns `status:'none'`, Meetings get **no `What_Id`**
- booking first → new resolver returns `status:'many'` on every multi-Deal Account

Both call sites are corrected (`integrations/zoho/index.js`, `api/_utils/products.js`).
`workflows/zoho-ops.js` and `workflows/operator-actions.js` consume them unchanged, so they needed no
edit — verify that stays true if the return shape changes again.

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
