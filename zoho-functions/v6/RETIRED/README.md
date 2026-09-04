# RETIRED — the Zoho-side delete list

Everything the correction makes dead **in the live org**. Nothing here is source any more.

Files carry the `.DELETE-FROM-ZOHO` suffix so they fall outside every `*.deluge` glob — no scanner,
test, or publish list can pick them up. Each one holds the original published body plus a tombstone
header with its ids and delete order. **Delete the file once the Zoho-side object is gone.**

> ⚠ **Do none of this until the P1 bundle is published.** Every deletion below assumes nothing
> references the object any more, and that only becomes true after the replacement code is live.
> Field deletions additionally wait until **after P10** — see the ordering note at the bottom.

> ⚠ **P1 PRE-FLIGHT, before any of this: check the `zoho_crm` connection.**
> `_util_resolveDealPipeline` now reads `Deals.Pipeline` over REST (8 call sites), and the same
> connection carries the Partnership Deal insert and the Quote REST writes. If it is unauthorized or
> has lost `ZohoCRM.modules.deals`, every pipeline resolution returns `"unresolved"` — cadence
> dispatch blocks org-wide **and** raises a review on every Contact that tries. Confirm in
> **Setup → Connections** before enabling any rule at P7.

---

## 1 · Functions to delete — 3

| Zoho function | Where in the console | Ids | Replaced by |
|---|---|---|---|
| **`sendCommercialFollowUp`** | **Workflow function**, module Deals. Live-confirmed 2026-08-19, `associated: true` | registration `991103000001499072`, function `991103000001499021` | nothing — the whole WF010d unit is deleted |
| **`createOrReuseProductDeal`** | **Standalone function** (Setup → Functions → Standalone) | not exposed by the workflow-function API — find it by **name** | `_util_resolveOrCreateAccountDeal` |
| **`pipelineForProductKey`** | **Standalone function** (Setup → Functions → Standalone) | not exposed by the workflow-function API — find it by **name** | `_util_resolveDealPipeline` |

⚠ **Two of the three are in a different part of the console.** The `getAllAutomationFunctions` API
returns **17 functions, all `feature_type: workflow`** — the entry points bound to rules. None of the
21 `_util_*` helpers appear in it, because they are standalone functions invoked as
`automation.<name>(...)` from other Deluge. So:

- `sendCommercialFollowUp` is deletable via the workflow-function list and has real ids.
- the two `_util_*` helpers must be found **by name** under Setup → Functions → Standalone.

This also applies to publishing: **19 of the 26 functions in the P1 bundle are standalone helpers**,
edited in Setup → Functions, not through a workflow action.

### Delete order per function

**`sendCommercialFollowUp` — rule → function → field, and the order is mandatory:**
1. Delete rule **WF010d**, id `991103000000790038` (Deals, date-based on `Next_Comm_Follow_Up_Date`). Deleting the function
   while a rule still points at it leaves a broken action on the rule.
2. Delete the function (registration `991103000001499072`).
3. **Only then** delete the field `Deals.Next_Comm_Follow_Up_Date`.

**The two standalone helpers:** publish P1 first, then delete by name. No rule references either, so
there is no rule to unbind.

**Safety evidence:** zero callers remain for all three. `deluge-syntax-check.py` fails on any
unresolved `automation.<fn>()` target and is clean across 42 files; the absence guards in
`booking/tests/deluge-multi-product.test.js` fail if a caller or a `::` Deal_Key composition returns.

---

## 2 · Workflow rules

| Rule | Action | Note |
|---|---|---|
| **WF010d Date Router Comm Follow-Up** — id `991103000000790038` (Deals, `date_or_datetime` on `Next_Comm_Follow_Up_Date`, 15 min, `recur_cycle: once`). **`last_executed_time: null` — it has never fired.** | **DELETE** | Step 1 of the `sendCommercialFollowUp` teardown above |
| **WF020** (Quotes, `field_update` on `Quote_Stage`, id `991103000001581243`) | **DEACTIVATE at P0, never re-activate** | Not deleted. WF020 and WF021 share action id `991103000001581241`, so they must never both be active. Since WF020 is off from P0 there is no hand-over to perform |

All other rules are deactivated at P0 and restored on the P7–P9 schedule. They are **not** retired.

---

## 3 · Fields whose WRITERS are already removed — 6

⚠ **The fields still exist live and MUST NOT be deleted yet.** Writer removal is only step one.

| Field | Verdict | Why |
|---|---|---|
| `Tasks.Blocks_Sequence` | RETIRE | Zero readers; blocking is computed from `Task_Sequence_Managed` / `Task_Type` / `Status` / `Task_Status` |
| `Deals.Deal_Product` | RETIRE | A Deal has no Product identity; a Product is a Quote |
| `Deals.Deal_Product_Key` | RETIRE | Same |
| `Deals.Deal_Primary_Contact` | RETIRE | Its only writer targeted a phantom api_name, so it has never held a value. All 3 readers collapsed onto `Contact_Name` |
| `Accounts.Account_Status` | RETIRE | Write-only, zero readers. Live population 75/372 |
| `Deals.Company_Tier` | RETIRE | Mirror of `Accounts.Company_Tier` with zero behavioural readers. ⚠ `Accounts.Company_Tier` is **KEEP** — it is the live source |

Also retire with these, per plan 3.3: **`Accounts.State`** (same write-only finding).

### The mandatory deletion ordering (V6_FIELD_USE_CONTRACT §11)

1. Remove every writer ✅ **done in-tree, verified: 0 writers for all six**
2. **Publish** (P1)
3. **Read the whole update map back** against a live record — `SUCCESS` proves nothing
4. Manual console dependency check
5. **Only then delete**, and only **after P10**

**Why this order is not negotiable:** an api_name that does not exist can void the **entire**
`updateRecord` map, taking valid keys down with it — recorded twice as a production incident. A field
that exists but sits off-layout silently discards just its own key. Deleting a field converts the
second failure into the first. Gate **G2** (two-key `updateRecord` with one valid key and one invented
api_name, then read back) is still **unverified** and gates all of this.

---

## 4 · Retired review codes — 3

Removed from `_util_resolveManualReviewCode` and no longer raised anywhere. Nothing to delete in Zoho
(they are strings in Task Descriptions, not metadata), but **do not re-add them**:

`multi_product_sequence_ambiguous` · `quote_product_mismatch` · `duplicate_product_deal`

⚠ `booking/db/queries/review.js` holds a **persisted enum over existing rows**. Historical escalations
carrying these codes must stay readable — renaming or removing an enum value needs a data check, not
just an edit.
