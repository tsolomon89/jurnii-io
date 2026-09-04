# `zoho-functions/v6/` — read this before you read any `.deluge` file

## 🚨 These files are CORRECTED but NOT PUBLISHED (2026-08-19)

The working tree implements the **approved** model. The **live Zoho org still runs the superseded
one**. So the direction of the mismatch is now the opposite of what it used to be:

```
LIVE (published):   Deal = Account × Product     Deal_Key = accountKey::productKey
WORKING TREE:       one Account -> one Deal      Deal_Key = Account_Key
```

**A `.deluge` file here is no longer a description of what runs. It is a description of what is about
to run**, pending the owner's P1 publish.

- **To learn current LIVE behaviour, use `git show HEAD:<file>`** or read the org. Reading the working
  tree for that purpose is now wrong.
- The header comment blocks have been rewritten alongside the code, so they describe the approved
  model. If you find one still asserting `Deal = Account × Product`, it is a **stale comment on
  corrected code** — fix the comment, do not "restore" the code to match it.

## The approved model

**Authority:** [`../docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)

```
one Account  ->  ZERO OR ONE persistent Deal
Products enter as QUOTES under that one Deal, never as extra Deals
Opportunity authority is on the CONTACT, not the Deal
```

Activity context snapshots — **all nine kept**, sources now correct in-tree:

| Snapshot | Source |
|---|---|
| `Task_Stage`, `Call_Task_Stage`, `Meeting_Task_Stage` | the **Contact**'s Stage when raised |
| `Task_Opportunity`, `Call_Task_Opportunity`, `Meeting_Task_Opportunity` | the **Contact**'s MQL/SQL/FTP/RTP when raised, via `_util_opportunityForContactStage` |
| `Task_Pipeline`, `Call_Task_Pipeline`, `Meeting_Task_Pipeline` | the **Deal**'s `Pipeline` when raised, via `_util_resolveDealPipeline` |

## The single authorities

Reach for these rather than re-deriving. Each one exists because the same rule was previously
implemented two, three or four times with drifting answers.

| Helper | Owns | Callers |
|---|---|---|
`_util_deriveAccountKey` | the ONE `Account_Key` precedence (was 4 competing ones) | 4 |
`_util_resolveAccount` | K5/K6 — search every evidence form, stop on >1 | 2 |
`_util_resolveAccountDeal` | "which Deal belongs to this Account", **read-only** | 2 |
`_util_resolveOrCreateAccountDeal` | resolve + create-if-none, with post-insert readback | 3 |
`_util_roleForTitle` | the 415-title role corpora (was 3 verbatim copies) | 3 |
`_util_opportunityForContactStage` | Contact Stage → MQL/SQL/FTP/RTP | 6 |
`_util_resolveDealPipeline` | `Deals.Pipeline` over REST; returns `unresolved`, never `B2B` | 6 |
`_util_scheduleCadenceStep` | the "Scheduled Send" wake-up Task | 2 |

**Deleted, do not resurrect:** `_util_createOrReuseProductDeal`, `_util_pipelineForProductKey`,
`sendCommercialFollowUp`.

## Two contracts that will bite you

**`resolveDealPipeline` returns `"unresolved"`, not `""`.** Callers that stamp a mirror field must
skip it (`!= "" && != "unresolved"`); callers that gate dispatch must block. The old `""` return made
one site fail closed and another fail open.

**The Deal is OPTIONAL almost everywhere.** `Who_Id` (Contact) is the required link; `What_Id` (Deal)
is context. `createAuxTask` used to hard-return `""` without a Deal, which silently swallowed reviews.
If you add a Deal-dependent branch, guard it — do not reinstate a top-level Deal requirement.

## Rules for this directory

- **Never publish.** The owner republishes from the Zoho console. Deluge is not deployable over MCP.
- **Never commit a `.deluge` edit until the owner confirms it is published.** The whole tree is
  currently in that state: 26 functions modified/added and 3 deleted, all unpublished.
- **Run the offline gates before proposing any publish.** Both must be clean:
  ```
  python zoho-functions/scripts/deluge-syntax-check.py     # braces, signatures, call targets
  python zoho-functions/scripts/deluge-field-scan.py       # phantoms, picklists, invariants
  ```
- **`SUCCESS` proves nothing.** Read the whole update map back. An api_name that does not exist can
  void the entire `updateRecord` map; a field that exists but sits off-layout silently drops just its
  own key.
- **Picklists round-trip in display space**, including in COQL `where` clauses. `Task_Stage` stores
  `Renewall` and every surface returns `Renewal`. The field scan compares against value **and** label
  space for exactly this reason.
- `Contacts.Contact_Role1` is the Contact-record field. `Contact_Role` is the junction field on the
  `Contact_Roles` related list — querying it on Contacts returns blank for every record.
- **Blank roles stay blank.** Three sites used to default an unresolved title to `"Decision Maker"`,
  and the leading-Contact ranking then defaulted an unknown role to the *top* rank. Both removed.

## Field questions

`../docs/v6/V6_FIELD_USE_CONTRACT.md` is the field authority — semantic meaning, readers, writers,
workflow bindings, live population and retire/keep/redefine verdict for every field. It supersedes
`../docs/v6/FINAL_CANONICAL_FIELD_MATRIX.md` and `../../docs/V6_FIELD_VALIDATION_MATRIX_2026-08-15.md`.

⚠ **Writers for six fields are already removed** (`Blocks_Sequence`, `Deal_Product`,
`Deal_Product_Key`, `Deal_Primary_Contact`, `Accounts.Account_Status`, `Deals.Company_Tier`) but the
**fields still exist live** and are only deleted after P10. Do not add a reader "just in case" — that
is what turns a retirement into a phantom-field incident.
