> # ✅ ACTIVE AND BLOCKING — extended by the model correction
>
> This checklist gates **every** field deletion, because Reports, Dashboards and Analytics have no REST
> surface and cannot be cleared by API.
>
> **Extend it** with the fields the model correction newly retires: `Deals.Deal_Product`,
> `Deals.Deal_Product_Key`, `Deals.Company_Tier`, `Accounts.State`, `Accounts.Lost_Reasons`, and the Deal
> `Contract_*_Plan_*` mirrors. Nothing already in it changes.
>
> **Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)  ·  reconciled 2026-08-17 (`jurnii-doc-reconciliation-2026-08-17`)

---

# Manual Zoho console dependency check — required before ANY field deletion

The v6 API audit could **not** enumerate Reports, Dashboards or Analytics: there is no reachable REST
surface (`400 INVALID_REQUEST`) and `/settings/functions` returns HTTP 500 on both v6 and v7. The
absence of an API is **not** evidence of no dependency.

Until this checklist is completed for a field, its verdict is
**`Unverified dependency, do not delete`** — regardless of what the code audit found.

## Fields to check

| # | Field | Module | Why it is a candidate |
| --- | --- | --- | --- |
| 1 | `Blocks_Sequence` | Tasks | 6 writers, **0 code readers**; stale on completed Tasks; blocking is computed from canonical Task fields |
| 2 | `Deal_Primary_Contact` | Deals | 0 writers, 0 records populated (0/96); all 3 readers fall through to `Contact_Name` |
| 3 | `Reminder_Send_At` | Events | 0 readers, 0/155 populated; `Deals.Demo_Reminder_Send_At` + WF010c own scheduling |
| 4 | `Contract_Current_Plan_Products` / `_Plan_Type` / `_Plan_Brands` | Deals | Reproducible from the latest Closed-Won Quote; Deal copy is lossier |
| 5 | `Contract_Initial_Plan_Products` / `_Plan_Type` / `_Plan_Brands` | Deals | Reproducible from the earliest Closed-Won Quote |
| 6 | `Commercials_Status`, `Commercial_Outcome` | Deals | 0 functional code refs, 0/96 populated, no workflow (WF004 does not exist) |
| 7 | `Next_Comm_Follow_Up_Date` | Deals | 0/96 populated, no writer. **Delete WF010d first** — the rule binds to this field |

## Where to look, per field

For each field, in **Setup → Customization → Modules and Fields → *(module)* → *(field)* →**:

1. **Field dependency view.** Zoho lists workflows, layout rules, validation rules and blueprints
   that reference the field. Any entry = dependency.
2. **Layouts** — Setup → Layouts → *(module)*. Note every layout and section the field appears in.
   It must be removed from layouts **before** deletion (step 8 of the publish order).
3. **Custom views** — the module's list-view dropdown → Manage Views. Check **both** filter criteria
   **and** displayed columns. A field used only as a column is still a dependency.
4. **Reports** — Reports tab → search by field label *and* api_name. Check filters, grouping,
   columns, and any scheduled report. **This is the surface with no API; it must be done by eye.**
5. **Dashboards / Analytics** — any component sourced from a report above, plus Zoho Analytics
   if the CRM sync is enabled.
6. **Workflow rules** — Setup → Automation → Workflow Rules. Check rule *criteria* **and** field
   updates. (API already confirms: WF010d binds `Next_Comm_Follow_Up_Date`; WFC-SchedEmail binds
   `Task_Sequence_Managed`/`Status`/`Task_Type`; WF006 binds `Call_Task_State`/`Sequence_Managed`.)
7. **Validation rules / Blueprints / Approval processes / Scoring rules** — Setup → Automation.
8. **Email + mail-merge templates** — already screened by API: only 8 merge fields exist across all
   42 templates, and the sole custom CRM ones are `Accounts.Contract_URL` and `Contract_Renewal_URL`.
   No field on this list appears. Re-confirm only if templates changed since 2026-08-15.
9. **Imports / exports** — Setup → Data Administration → Import History; any saved field mapping.
10. **Client scripts / widgets / Zoho Flow / external integrations** consuming the module.

## What counts as a dependency

A dependency exists if the field appears in **any** of: a workflow criterion or field update; a
validation rule, blueprint or approval condition; a report filter, column, grouping or schedule; a
dashboard component; a custom-view filter or column; a layout rule; an active import mapping; an
email or mail-merge template; a client script; an external integration or export.

**Not** a dependency: appearing on a layout with no rule attached (that is a layout removal, step 8),
or being listed in a stale repository CSV export.

## What must be replaced before deletion

| If you find | Replace with |
| --- | --- |
| A report/view filtering `Blocks_Sequence = Yes` | Canonical Task conditions: `Task_Sequence_Managed = true` **and** `Task_Type` not in {Scheduled Send, Email Sent} **and** `Status` not in {Completed, Deferred} **and** `Task_Status ≠ Closed`. Note `Cancelled` is **not** a member of `Tasks.Status` |
| Anything referencing `Deal_Primary_Contact` | `Deals.Contact_Name` |
| Anything referencing `Events.Reminder_Send_At` | `Deals.Demo_Reminder_Send_At` |
| A report using a Deal `Contract_*_Plan_*` mirror | The Quote: `Quote_Plan_Type` / `Quote_Plan_Brands` / `Quote_Product`, filtered to `Quote_Stage = Closed Won`, earliest by `Contract_Date_Start` for *Initial*, latest for *Current* |
| WF010d | Delete the rule before deleting `Next_Comm_Follow_Up_Date` |

## Recording the result

For each field record: **checked by**, **date**, **each surface checked**, **found / not found**, and
**what was replaced**. A field with any surface left unchecked stays
`Unverified dependency, do not delete`.
