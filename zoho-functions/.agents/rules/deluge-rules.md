> # ⚠ SUPERSEDED AS GOVERNING RULES — historical reference only
>
> **Sealed 2026-08-17.** Authority:
> [`../../docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../../docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)
>
> This file claims to *"govern all Zoho CRM Deluge development within this workspace."* **It does not.**
> It is v3/v4-era and predates the current architecture. For live rules read
> [`../../v6/CLAUDE.md`](../../v6/CLAUDE.md) and the field authority
> [`../../docs/v6/V6_FIELD_USE_CONTRACT.md`](../../docs/v6/V6_FIELD_USE_CONTRACT.md).
>
> **What is still true:** no Zoho Cadences (all logic in workflow-triggered custom functions);
> zero-block Lead conversion; never create a duplicate Account. Those survive.
>
> **What is superseded:**
> - *"Deal Reusability: attempt to locate and reuse a suitable existing Deal under the matching
>   Account"* — accidentally **closer** to the approved model than the code is, which makes it more
>   confusing rather than less. The approved rule is stronger: **one Account → zero or one persistent
>   Deal**, always.
> - Any mandate to run `syncDealProductsAndValue` — that function does not exist, and summing Product
>   values into `Deal.Amount` is forbidden by authority §7.5. Amount derives from **Quote** evidence.
> - The mapping of `Product Interest (Staging)` → `Amount`. `Product_Interest_Staging` is on the
>   authority §10 **retire** list and its readers have already been removed in the working tree.
>
> Preserved unedited below.
>
> Reconciled 2026-08-17 (`jurnii-doc-reconciliation-2026-08-17`)

---

# Zoho CRM Deluge Automation Rules

These baseline constraints and programming guidelines govern all Zoho CRM Deluge development within this workspace. Antigravity agents must strictly adhere to these rules when modifying `.deluge` scripts.

## Core Directives

> [!IMPORTANT]
> **Workflow-Adjacent Custom-Function Logic Only**
> Do not use Zoho Cadences. All logic must reside within workflow-triggered custom functions that communicate sequentially via Zoho CRM APIs.

*   **Zero-Block Lead Conversion**: Leads are transient staging containers. Always attempt to convert a Lead if the absolute minimum required data (First Name, Last Name, Company, Email/Phone) is present or can be derived. Missing commercial metadata (Marketing Consent, Website, Industry, Product Interest) must **never** block conversion; it should instead leave gaps for post-conversion normalization or manual enrichment.
*   **Prevent Duplicate Accounts**: Before converting a Lead, search for a matching Account using the canonical account lookup hierarchy. Never create a duplicate Account.
*   **Deal Reusability**: When converting a Lead, attempt to locate and reuse a suitable existing Deal under the matching Account before generating a new one.

---

## Coding Conventions & Zoho Deluge Syntax

### 1. Variables & Safe Retrieval
*   Always use `ifnull()` when pulling string properties to prevent `null` pointer exceptions:
    ```deluge
    companyName = ifnull(leadRecord.get("Company"), "");
    ```
*   Cast IDs properly before performing lookups or related-records fetches:
    ```deluge
    leadId = lead_id.toLong();
    ```

### 2. Multi-Select Fields & Lookup Limitations
*   **Lead Product Interest**: In Lead records, `Product_Interest` has been configured as a multi-select picklist containing plain text product names. Do **not** treat it as a lookup map containing `id` and `name` values.
*   **Contact/Account/Deal Product Interest**: These use a linked join / multi-select lookup table to actual Product records.
*   **Conversion Rule**: Do not directly map Lead `Product_Interest` fields to Contact/Account/Deal join tables during the initial `convertLead` operation. Use the staging names as strings, resolve matching Product records in the Products module by name, and sum up values in `syncDealProductsAndValue`.

### 3. CRM Method Formatting
Always follow the official Zoho CRM Deluge function signatures:
*   `zoho.crm.getRecordById(module, id)`
*   `zoho.crm.searchRecords(module, criteria)`
*   `zoho.crm.updateRecord(module, id, map)`
*   `zoho.crm.convertLead(leadId, map)`
*   `zoho.crm.getRelatedRecords(relation, parentModule, parentId)`

---

## Workflow Loop Prevention

To avoid infinite cascading workflows, custom functions must only write to calculated/semantic fields and should not trigger loops.

| Trigger Fields (Safe to Watch) | Target Output Fields (Do NOT Watch) |
| :--- | :--- |
| `Stage` | `Opportunity` |
| `Marketing_Consent` | `State` |
| `Lost_Reasons` | `Status` |
| `Product Interest (Staging)` | `Amount` |
| `Ready_For_Commercials` | |
| `Demo_Outcome` | |

When triggering workflows, narrow the criteria to only execute when source fields change, preventing self-triggering logic loops.
