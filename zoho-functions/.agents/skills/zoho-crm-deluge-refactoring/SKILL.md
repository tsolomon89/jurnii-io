---
name: zoho-crm-deluge-refactoring
description: "SUPERSEDED — DO NOT INVOKE. Obsolete v3/v4-era skill describing five Deluge functions that no longer exist, under a commercial model that is two architectures out of date. Retained as historical evidence only. For any Zoho Deluge work read zoho-functions/docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md instead."
---

> # ⛔ SUPERSEDED — DO NOT EXECUTE THIS SKILL
>
> **Sealed 2026-08-17** (`jurnii-doc-reconciliation-2026-08-17`).
> **Authority:** [`../../../docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](../../../docs/v6/JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)
>
> This skill is **two architectures out of date** and carries an active refactoring mandate. If an agent
> matched it on its description and acted on it, it would rewrite live automation against a model that
> was replaced twice over.
>
> **The five functions it instructs you to refactor do not exist:**
> `convert2lead.deluge` · `normalizeContactCommercialState.deluge` ·
> `normalizeDealCommercialState.deluge` · `syncDealProductsAndValue.deluge` ·
> `rollupAccountCommercialState.deluge`
>
> The live architecture is **38 Deluge functions under `zoho-functions/v6/`**. Start at
> [`../../../v6/CLAUDE.md`](../../../v6/CLAUDE.md).
>
> **Two specific instructions below are model violations:**
> - §1.5 *"Deal Staging: generate a new Deal map for conversion if no suitable existing Deal is found"* —
>   the approved model is **one Account → zero or one persistent Deal**; Deal creation is not per-conversion.
> - `syncDealProductsAndValue` sums **Product values into Deal Amount** — authority §7.5 explicitly
>   forbids using `Product.Unit_Price` as Deal Amount. Amount derives from **Quote** evidence.
>
> Preserved unedited below (apart from this banner and the frontmatter `description`) as the record of
> the v3/v4-era approach.

---

# Skill: Zoho CRM Deluge Refactoring

This skill provides comprehensive instructions and code patterns for refactoring the 5 core Zoho CRM Deluge custom functions to align with the commercial ontology, handle multi-select product staging, and prevent account duplicates.

---

## 1. Convert Lead Processor (`convert2lead.deluge`)

### Core Requirements
1.  **Always-Convert Policy**: Remove blocking validation for `Website`, `Industry`, `Phone`, `Marketing_Consent`, and `Product_Interest`. Conversion should proceed as long as there is enough minimal data to call `zoho.crm.convertLead()`.
2.  **Domain & Account Identity Normalization**: Standardize Company names and Website URLs to derive a clean domain as the lookup key.
3.  **Deduplication Search**: Look up existing accounts using the hierarchy defined below before fallback creation.
4.  **Contact Enrichment**: Ensure the converted Contact receives the Phone number, while keeping Account Phone blank (unless an explicit account phone exists).
5.  **Deal Staging**: Generate a new Deal map for conversion if no suitable existing Deal is found.

### Domain Normalization Pattern (Deluge)
Use this utility logic to normalize website domains:
```deluge
normalizedDomain = website.toLowerCase();
normalizedDomain = normalizedDomain.replaceAll("https://", "");
normalizedDomain = normalizedDomain.replaceAll("http://", "");
normalizedDomain = normalizedDomain.replaceAll("www.", "");
if(normalizedDomain.endsWith("/"))
{
    normalizedDomain = normalizedDomain.substring(0, normalizedDomain.length() - 1);
}
```

### Account Lookup Priority Logic
Execute this chain of lookups to retrieve or create the Account:
```deluge
accountId = "";

// 1. Check existing Contact's Account if Contact is found by Email/Phone
if(existingContactId != "")
{
    linkedAccount = existingContactRecord.get("Account_Name");
    if(linkedAccount != null)
    {
        accountId = linkedAccount.get("id").toString();
    }
}

// 2. Lookup by Company Name
if(accountId == "" && companyName != "")
{
    search = zoho.crm.searchRecords("Accounts", "(Account_Name:equals:" + companyName + ")");
    if(search != null && search.size() > 0)
    {
        accountId = search.get(0).get("id").toString();
    }
}

// 3. Lookup by Website (normalized domain)
if(accountId == "" && normalizedDomain != "")
{
    search = zoho.crm.searchRecords("Accounts", "(Website:equals:" + normalizedDomain + ")");
    if(search != null && search.size() > 0)
    {
        accountId = search.get(0).get("id").toString();
    }
}

// 4. Fallback Account Name equals domain
if(accountId == "" && normalizedDomain != "")
{
    search = zoho.crm.searchRecords("Accounts", "(Account_Name:equals:" + normalizedDomain + ")");
    if(search != null && search.size() > 0)
    {
        accountId = search.get(0).get("id").toString();
    }
}
```

---

## 2. Commercial State Normalization (`normalizeContactCommercialState.deluge` & `normalizeDealCommercialState.deluge`)

These functions align records with the **Commercial Ontology**:
*   **Opportunity**: `MQL` $\to$ `SQL` $\to$ `FTP` $\to$ `RTP`
*   **Stage**: `Marketing Qualification` $\to$ `Demo Booking` $\to$ `Demo Confirmation` $\to$ `Demo Hosted` $\to$ `Proposal Preparation` $\to$ `Commercial Agreement` $\to$ `Onboarding` $\to$ `Renewal`
*   **State**: `Open` or `Lost`
*   **Status**: `New` (no human activity), `Working` (active call/meeting/note), or `Closed` (if Lost).

### Rules for Normalizers
1.  **Do Not Block on Product Interest**: Remove any validation checks requiring `Product_Interest` and instead let missing products leave the Deal value uncalculated.
2.  **No Backward Roll**: Do not roll a Deal's Stage backward based on Contact edits.
3.  **Active Status Auditing**: Search for related Tasks, Calls, and Notes before determining if a record status should move from `New` to `Working`.

---

## 3. Product Interest & Value Calculation (`syncDealProductsAndValue.deluge`)

### Core Architecture
*   Lead `Product_Interest` represents plain-text product names (e.g. `"Product A, Product B"`).
*   The function must extract these names, search the `Products` module by name, aggregate their standard prices (e.g., `Unit_Price`), and update `Deal.Amount`.

```deluge
// Extract staging product text
stagingProducts = ifnull(dealRecord.get("Product_Interest_Staging"), "");
productNames = stagingProducts.toList(","); // or split by other delimiter

totalAmount = 0.0;
resolvedCount = 0;

for each prodName in productNames
{
    trimmedName = prodName.trim();
    prodSearch = zoho.crm.searchRecords("Products", "(Product_Name:equals:" + trimmedName + ")");
    if(prodSearch != null && prodSearch.size() > 0)
    {
        price = ifnull(prodSearch.get(0).get("Unit_Price"), "0").toDecimal();
        totalAmount = totalAmount + price;
        resolvedCount = resolvedCount + 1;
    }
}

// Update Deal Amount
updateMap = Map();
updateMap.put("Amount", totalAmount);
zoho.crm.updateRecord("Deals", dealId.toLong(), updateMap);
```

---

## 4. Account State Rollup (`rollupAccountCommercialState.deluge`)

### Aggregation Rules
1.  **State**: Account State is `Open` if **any** associated Deal is `Open`. It is `Lost` **only** if all related Deals are `Lost`.
2.  **Status**: Set Account Status to `Closed` if State is `Lost`. Set to `Working` if any Open Deal is `Working`. Otherwise, default to `New`.
3.  **No Product Interest Rollups**: Keep Account-level Product Interest writes disabled for now.
