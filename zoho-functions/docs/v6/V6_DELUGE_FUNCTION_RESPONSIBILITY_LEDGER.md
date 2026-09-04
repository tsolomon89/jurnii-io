# v6 Deluge Function Responsibility Ledger

**Created:** 2026-08-18 · **Marker:** `jurnii-doc-reconciliation-2026-08-17`
**Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md)
**Companion:** [`V6_IMPLEMENTATION_READINESS_CORRECTIONS.md`](V6_IMPLEMENTATION_READINESS_CORRECTIONS.md)

Every Deluge file in `zoho-functions/v6/`, recorded from its **executable body**. Header comments were
not treated as evidence — several are provably false and are flagged in place.

**Nothing in this document is implemented.** It is a description of what exists and a statement of
intended responsibility after correction.

---

## What the Deluge system exists to achieve

These are the outcomes every file is measured against. A file that serves none is a retirement
candidate by definition.

| # | Outcome |
|---|---|
| **O1** | Convert imported Leads into the durable Contact / Account / **single-Deal** graph |
| **O2** | Classify and synchronize Contact roles |
| **O3** | Maintain **one Contact-scoped** Activation Task |
| **O4** | Run Call-led, Email-led or Manual **Contact** cadences |
| **O5** | Record every automated email as **exactly one** completed Task |
| **O6** | Process Call, Meeting and Task outcomes **against the Contact** |
| **O7** | Reconcile Product and contract evidence into **Quotes** |
| **O8** | Price Quotes and roll **applicable** Quote value into Deal Amount |
| **O9** | Manage Acquisition, Expansion and Renewal succession |
| **O10** | Calculate the Deal's leading Contact and relationship roll-up |
| **O11** | Surface ambiguity through **deduplicated** repair or Manual Review Tasks |

## Classifications

| Class | Meaning |
|---|---|
| **KEEP** | Correct as-is under the authoritative model |
| **KEEP AND SIMPLIFY** | Right responsibility, redundant or duplicated implementation |
| **REWIRE** | Right capability, wrong input or wrong authority |
| **MERGE** | Its responsibility belongs to another authority |
| **RETIRE** | Exists only to serve the superseded model, or is dead |

## Reading the ledger

Each entry records: trigger and callers · outcome served · current responsibility · authoritative
inputs · reads · writes · creates and side effects · idempotency mechanism · workflow and configuration
dependencies · overlaps · model drift · classification · intended responsibility after correction.

**Complexity note.** Reduction here means **fewer authorities, fewer repeated rules and a
one-directional execution flow** — not automatically more files. Where this ledger records where a
responsibility *would* go if redistributed, that is a description, **not** a mandate to split.

---

## Part 1 — Orchestrators (4 files)

# LEDGER PART 1 — THE FOUR ORCHESTRATORS

**Method note.** Every claim below is from the executable body, not from headers. Three header claims are **provably false** and are flagged in-place. Live reads this session were READ-ONLY COQL SELECTs.

**Live facts established this session (COQL, read-only):**
- **96 Deals across 75 Accounts. 17 Accounts hold >1 Deal; 21 surplus Deals.** (Bally's 2, FDJ 3, Macau 3, LeoVegas 2, Betsson 2, Bet365 2, Hero 3, Evoke 2, SuperBet 2, Casimba 3, GOAT 2, Flutter 2, PowerPlay 2, Get's Bet 2, AdmiralBet 2, LiveScore 2, Jurnii E2E 2.)
- **`Deals.Deal_Key` UNIQUE is NOT enforced in this org.** Deals `991103000003645011` and `991103000003655003` both carry `jurnii-e2e.dev::jurnii_360`. Every one of the four files asserts this constraint in its header as a "REQUIRED ZOHO CRM SETTING" — **that assertion is false as a live guarantee.**
- **`Deals.Pipeline` is readable — 96/96 over COQL** (values `B2B` ×87, `Partnership` ×9). Confirms the prompt's ruling against `_util_resolveDealPipeline:11-13`.
- **132 `Sequence Activation` Tasks exist. 129 `Not Started`, 3 `Deferred`. `Task_Sequence_Type` is null on 132/132; `Task_State`=Open and `Task_Status`=New on 132/132.** Zero have ever been committed. **O3 produces records; O4 has never executed once.**

**Cross-cutting finding that corrects the brief: the three `dmTitles`/`euTitles`/`infTitles` maps are BYTE-IDENTICAL, not different.** md5 of each literal body is the same in `processLead`, `processContact` and `processDeal` (dm `bb9f7fea…`, eu `9ee281a2…`, inf `1d8644ca…`; 149 / 133 / 133 entries). What differs is the **fallback and the application** — at **four** sites, not three. Detailed below.

---

### zoho-functions/v6/processLead.deluge (801)

- **Trigger / callers:** WF001a "Process Lead" (`…000663622`, Leads, `create_or_edit`, repeat=**true**, no criteria). No `automation.processLead` call site exists anywhere in the repo (grep, 0 hits) — the workflow rule and the booking backend's `updateLeadWorkflowEnabled` path are the only entries.
- **Outcome served:** O1 (primary); O2 (`:221-261` role resolution + stamping); O7 (`:439-444, :619-680` evidence → tuples → Quote engine); O11 (`:613, :631, :689`). Not O3/O4 — delegated at `:788`.
- **Current responsibility:** Reads a Lead, resolves `Contact_Role1` from the title, derives `Account_Key`, resolves/creates the Account, converts the Lead, enriches the new Contact under a blank-target rule, then fans out **one Deal per resolved Product** and calls `processDeal` per bucket; finally links the Contact to each Product, calls `processContact`, and rolls up the Account.
- **Authoritative inputs:** the Lead's own fields; `automation.normalizeToProductQuoteTuples("Leads", id)` captured **pre-convert** (`:439-444`, because `getRecordById` returns null on a converted Lead); Account_Key precedence Website → email domain → Company → `unknown::<id>` (`:296-314`); the in-file title maps (`:227-247`).
- **Reads:** `Leads` → `Website, Email, Company, Phone, Stage, Lead_Source, Lost_Reasons, Job_Title, Job_Title_Raw, Lead_Referrer, Imported_Record_Type, Company_Tier, Contact_Marketing_Consent, Contact_Role1, Product_Interest, Contact_Completed_*_At ×8, Contact_AOR_{Continent,Country,Region,Sub_Region,Regional}, Contact_AOR, Company_AOO_*, Company_Expansion_*`. `Accounts` → `Account_Key, Account_Name, Website, Phone, Company_Tier, Account_Source_Class, Company_AOO_*, Company_Expansion_*`. `Contacts` → `Account_Name, Stage, State, Status, Job_Title, Job_Title_Raw, Contact_Role1, Phone, Lead_Referrer, Marketing_Consent, Contact_AOR_*, Contact_Completed_*_At`. `Products12`/`Contacts_X_Products` → `Product_Details.id, Product_Interest.id`.
- **Writes:** `Leads.Contact_Role1` (`:252` — **3-arg `updateRecord`, NO trigger suppression**). `Accounts` create (`:371`) / update (`:413`, `:709`, suppressed) → `Account_Key, Account_Name, Website, Phone, Account_Source_Class, Company_Tier, Company_AOO_*, Company_Expansion_*`. `Contacts` (`:584`, suppressed) → `Account_Name, Stage, State, Status, Lost_Reasons, Job_Title, Contact_Role1, Phone, Job_Title_Raw, Lead_Referrer, Marketing_Consent, Contact_AOR_*, Contact_Completed_*_At ×8`. `Deals` (`:653`, suppressed) → `Contact_Name, Lead_Source, Company_Tier, Opportunity_State, Opportunity_Status, Lost_Reasons`.
- **Creates / side effects:** Account record (`:371`); **`zoho.crm.convertLead`** (`:453`) creating the Contact; Product Deals via `createOrReuseProductDeal` (`:627`, itself unsuppressed → WF001d re-fires `processDeal`); `Contacts_X_Products` junction rows (`:763`); Manual Review Tasks (`:613, :631, :689`); calls `processDeal` (`:669` import_bootstrap / `:677` plain), `processContact` (`:788`), `rollupAccountState` (`:799`). **No `invokeurl`, no emails.**
- **Idempotency mechanism:** search-before-create on Accounts, three-key cascade `Account_Key` → `Website` → `Account_Name` (`:320-346`), plus `DUPLICATE_DATA.details.id` recovery (`:376`) and a post-create re-search (`:383`). Contact reuse by `(Email:equals:…)` (`:428`). Deal identity delegated to `createOrReuseProductDeal`'s `Deal_Key` search. Contact enrichment writes only into blank targets. Junction dedup by an `alreadyLinkedIds` list built from two related-list reads plus a `Contacts_X_Products` search (`:725-754`). **There is no latch on the Lead itself** — the only re-entry guards are "a converted Lead reads null" (`:41-46`) and `leadContactRole == ""` (`:222`).
- **Workflow / config dependencies:** WF001a; WF001b2 (Contacts create) fires `processContact` concurrently with this run; WF001d fires on the unsuppressed Deal create; `Accounts.Account_Key` UNIQUE; `Deals.Deal_Key` UNIQUE (**asserted `:33-34`, live-refuted**); picklists `Contact_Role1 {Decision Maker, End User, Influencer}`, 8-value `Stage`, `Company_Tier {1,2,3}`; `Job_Title` picklist curated to ~154 of 415 governed titles (`:207-213`).
- **Overlaps:** `Account_Key` derivation is written **three times with three different precedences** — here `:296-314` (Website→email→Company), `processContact:64-131` (Website→email→Account_Name, plus a second no-Account branch), `processAccount:50-65` (**Website→Account_Name only, no email fallback**). Title→role map + resolution: `processContact:173-192`, `processDeal:237-254`, `processDeal:488-510`. Product fan-out: `processContact:275-308`, `processAccount:188-210`. `Contacts_X_Products` linking: `processDeal:729-769`, `processDeal:1284-1324`. Account rollup: `processDeal:2560`, `processAccount:227`.
- **Model drift:**
  - `:17-27`, `:588-680` — one Deal **per Product**. Prohibited pattern `Deal = Account × Product` / `one Deal per Product` (authority §11).
  - `:627` → `createOrReuseProductDeal:61,90` — `Deal_Key = accountKey::productKey` and `Deal_Name = "<Account> - <Product>"`. Prohibited: `Product-specific Deal key`, `Product-specific Deal name` (§11).
  - **`:252` is the concurrency defect.** A bare 3-arg `updateRecord` on `Leads.Contact_Role1` re-enters WF001a (no criteria, repeat=true) on the very Lead being converted. `:222` stops an infinite loop, not a second concurrent conversion. **Live corroboration: the two Jurnii E2E Deals sharing one `Deal_Key`.**
  - `:645` mirrors `Company_Tier` onto the Deal while `:703-712` seeds it onto the Account and `processDeal:2284-2290` re-derives the same mirror — two writers for one cache.
  - `:167-174` copies `Contact_AOR`; the comment itself concedes the field has **no reader anywhere in v6**.
  - `:33-34` header asserts a UNIQUE constraint that the live org does not enforce.
- **Classification:** **REWIRE**
- **Intended responsibility after correction:** Convert the Lead into the Contact/Account graph and resolve-or-create the Account's **one persistent Deal**, then pass all product and contract evidence to the Quote layer through a single call. It must stop composing Deal identity from a Product and must suppress the trigger on its own Lead write.

---

### zoho-functions/v6/processContact.deluge (538)

- **Trigger / callers:** WF001b0 "Process Contact" (`…000663630`, Contacts, `field_update`, repeat=**true**, `match_all=false`, criteria `Stage, State, Status, Contact_Role1, Account_Name`); WF001b2 (`…001499202`, Contacts, `create`, no criteria). Code caller: `processLead.deluge:788`.
- **Outcome served:** O2, O3, O4 (entry point only); O1 (Account repair `:64-133`); O7 indirectly (`:275-308`); O11 (`:253, :284, :356, :466, :474`).
- **Current responsibility:** Normalizes the Contact (Account link, `Stage`/`State`/`Status` defaults, `Contact_Role1` from title, eight `Contact_Completed_*_At` back-stamps), fans out a Product Deal per resolved product and attaches the Contact via `Contact_Roles`, then runs an activation gate that creates **one** Sequence Activation Task or raises a Manual Review.
- **Authoritative inputs:** the Contact record (re-read at `:228` and `:317` after its own writes); `Accounts.Account_Key`; `normalizeToProductQuoteTuples("Contacts", id)` (`:237`); `pipelineForProductKey(productKey)` (`:300`); the Contact-scoped Activation Task set keyed on **`Who_Id` + `Task_Type == "Sequence Activation"` and nothing else** (`:362-366, :402-426`).
- **Reads:** `Contacts` → `Account_Name, Email, Full_Name/First_Name/Last_Name, Stage, State, Status, Job_Title, Job_Title_Raw, Contact_Role1, Sequence_State, Owner, Lead_Source, Contact_Completed_*_At ×8`. `Accounts` → `Account_Key, Website, Account_Name`. `Tasks` (related-list, falling back to `(Who_Id:equals:…)` search) → `Who_Id, Task_Type, Status, Task_State, Task_Status, Task_Sequence_Type, Description`. `Deals` → `Stage` (`:521`).
- **Writes:** `Accounts.Account_Key` (`:92`, suppressed). `Contacts` (`:226`, suppressed) → `Account_Name, Stage, State, Status, Contact_Role1, Contact_Completed_*_At`. `Contacts.Sequence_State` (`:322`, suppressed). `Tasks` (`:452`, suppressed) → `Status="Deferred", Blocks_Sequence="No"` on collapsed duplicates. `Contact_Roles` junction `Contact_Role` (`:293`, **`updateRelatedRecord`, unsuppressed**).
- **Creates / side effects:** Account (`:121`); Product Deals via `createOrReuseProductDeal` (`:281`); Manual Reviews (`:253, :284, :356, :466, :474`); **one `Tasks` record** `Task_Type="Sequence Activation"` (`:527`, deliberately unsuppressed so WF008 sees it) carrying `Subject, Status="Not Started", What_Id=<Deal>, $se_module="Deals", Who_Id, Task_Sequence_Managed=true, Task_Sequence_Stage, Blocks_Sequence="Yes", Description, Task_Stage, Task_State="Open", Task_Status="New", Task_Opportunity, Task_Pipeline, Owner`; calls `processDeal` per Deal (`:307`) and `resolveDealPipeline` (`:524`). No emails, no `invokeurl`.
- **Idempotency mechanism:** Account by `(Account_Key:equals:…)` (`:110`) + `DUPLICATE_DATA` recovery (`:126`). Deal identity delegated. **Activation is the most carefully built guard in the codebase:** candidate set = every Task with `Who_Id == this Contact` **and** `Task_Type == "Sequence Activation"` (`:402-408`); `Status == "Deferred"` is retired and permanently leaves the active set (`:411`); an unreadable related list is **never** read as empty (`:377-396` + fail-safe return `:428-433`); >1 active candidates collapse to lowest id **only** when all are provably indistinguishable on a four-part test `Task_State=="Open" && Task_Status=="New" && Task_Sequence_Type=="" && !Description.contains("ActivationCommand|")` (`:419-425, :436-456`), otherwise it stops and raises `activation_control_ambiguous` (`:457-468`); all-Deferred raises `activation_no_active_control` and refuses to recreate (`:470-476`). Creation predicate is simply `actActive.size() > 0` (`:481`).
- **Workflow / config dependencies:** WF001b0 / WF001b2; **WF008 must fire on the created Task** — live evidence says it has not fired since 2026-07-20 and 132/132 Tasks remain uncommitted; WFC-SchedEmail (`Tasks.Due_Date`); picklists `Task_Type` (needs `Sequence Activation`), `Task_Sequence_Type {Email, Call, Manual}`, `Sequence_State` (needs `Not Activated`), `Contact_Role` junction values, `Blocks_Sequence {Yes,No}`; `Deals.Stage` for `Task_Opportunity`; `resolveDealPipeline` for `Task_Pipeline`.
- **Overlaps:** `Account_Key` derivation (`processLead:296-314`, `processAccount:50-65`). Title map (`processLead:227-247`, `processDeal:123-125` + `:240-244`). Product fan-out (`processLead:619-680`, `processAccount:188-210`). `Contact_Roles` junction stamping — **duplicated and inconsistent** with `processDeal:465-517` (see complexity surfaces). `rollupAccountState` is *not* called here but is by the other three.
- **Model drift:**
  - **`:259-263`** — `if(products.size() == 0) { log mql_no_product_deal; return; }`. **No product evidence ⇒ no activation.** Directly violates the SETTLED OWNER RULING and authority §5.4.
  - **`:312`** — `if(productDealIds.size() == 0) { return; }`. Same class: Deal resolution failure kills activation.
  - **`:314, :354-358`** — activation "driven by the SINGLE Product Deal"; >1 driver Deal ⇒ `multi_product_sequence_ambiguous` and **return without creating the Task**. Prohibited patterns `Contact sequence driven by exactly one Product Deal` and `several Product interests make Contact activation ambiguous` (§11).
  - `:337-343` — B2B-vs-Partnership driver election performed on the Contact from **product keys**; Pipeline is a Deal-relationship attribute (§6.3), and `Deals.Pipeline` is live-readable.
  - `:502-503` — `What_Id`/`$se_module` set unconditionally to a Deal. The ruling makes `What_Id` **optional**; here the absence of a Deal means no Task at all.
  - `:243-244` — junction `Contact_Role` defaults to `"Decision Maker"` when `Contact_Role1` is blank, manufacturing exactly the decision-making authority that `:188-191` deliberately refused to assert on an unrecognised raw title.
  - `:275-308` — per-product `createOrReuseProductDeal`; same `Deal = Account × Product` violation.
- **Classification:** **REWIRE**
- **Intended responsibility after correction:** Own Contact normalization and the **one Contact-scoped Activation Task, unconditionally** — created, committed, stopped and reactivated with or without a Deal, attaching the Account's single Deal as optional `What_Id` when it exists — and pass product/contract evidence to the Quote layer without ever letting it gate activation. The Task-collapse rule (`:377-476`) is the one part to keep verbatim.

---

### zoho-functions/v6/processAccount.deluge (228)

- **Trigger / callers:** WF001c "Process Account" (`…000663648`, Accounts, `create_or_edit`, repeat=**true**, no criteria). **No code caller** — grep finds zero `automation.processAccount` call sites.
- **Outcome served:** O1 (`Account_Key`, `:47-65`); O11 (duplicate detection, `:137-167` — but see drift); O7/O8/O10 only indirectly via `processDeal` (`:222`); O9 via `rollupAccountState` (`:227`).
- **Current responsibility:** Stamps `Account_Key`; groups the Account's related Deals by `Deal_Product_Key`, elects the lowest-id live Deal per product key and **auto-Losts** every sibling sharing that key; creates a Deal for each product not already covered; reconciles every surviving/created Deal; rolls up Account state.
- **Authoritative inputs:** `Accounts.Account_Key` (derived Website → `Account_Name` → `unknown::<id>`, `:52-62`); `Deals.Deal_Product_Key`, with a `Deal_Product.name → computeProductKey` fallback (`:110-111`); `normalizeToProductQuoteTuples("Accounts", id)` (`:182`).
- **Reads:** `Accounts` → `id, Account_Key, Account_Name, Website`. `Deals` (related list, then a full `getRecordById` whenever any of the three keys is blank, `:100-114`) → `id, Opportunity_State, Deal_Key, Deal_Product_Key, Deal_Product, Deal_Name`.
- **Writes:** `Accounts.Account_Key` (`:64`, suppressed). `Deals` (`:162`, suppressed) → `Opportunity_State="Lost", Opportunity_Status="Closed", Lost_Reasons="Duplicate / Test Record", Deal_Key="", Deal_Name += " (Duplicate)"`.
- **Creates / side effects:** Product Deals via `createOrReuseProductDeal` (`:198`); `logAutomationEvent` rows (`:37, :164, :207, :214`); calls `processDeal(dealId, "{}")` per Deal (`:222`) and `rollupAccountState` (`:227`). **Creates no Manual Review record at all** — `:163` resolves a review *code* and then only logs it. No emails, no `invokeurl`.
- **Idempotency mechanism:** `Account_Key` written only when blank (`:50`). Dedup is deterministic and re-entrant-safe: lowest-id election per product key (`:124-135`), then a **re-read + `Opportunity_State == "Open"` re-check immediately before writing** (`:145-146`). A Deal with a blank product key **never** participates in dedup (`:117`). Creation delegated to `createOrReuseProductDeal`'s `Deal_Key` search. `coveredKeys` prevents creating a Deal for an already-covered product (`:196`).
- **Workflow / config dependencies:** WF001c; `Accounts.Account_Key` UNIQUE, `Deals.Deal_Key` UNIQUE (**asserted `:28-29`, live-refuted**); `Lost_Reasons` picklist must carry `"Duplicate / Test Record"` — deliberately repointed off the **native** `Reason_For_Loss__s`, which does not carry that option and silently discarded the write (`:151-158`, a correct fix worth preserving); `Opportunity_State {Open,Lost}` / `Opportunity_Status`.
- **Overlaps:** `Account_Key` derivation (`processLead:296-314`, `processContact:64-131`) — **this copy alone omits the email-domain fallback**, so the same company keys differently depending on entry point. Product fan-out (`processLead:619-680`, `processContact:275-308`). `rollupAccountState` (`processLead:799`, `processDeal:2560`). Deal reconciliation loop (`processContact:307`).
- **Model drift:**
  - **`:70-215` is the whole `Deal = Account × Product` model made explicit.** `:9-11` and `:73-74` state that Deals with *different* product keys "are NOT duplicates" — the exact inverse of *one Account → zero or one persistent Deal* (§2, §14.1, §14.13).
  - **`:145-162` auto-Losts a Deal with no human confirmation.** Authority §13 forbids merging/deleting Deals outside an approved migration; `V6_CRUD_PLAN.md:236` requires this function to "raise a review, not auto-Lost".
  - `:163-164` — the duplicate is silenced with only a log entry. **O11 is claimed but not served.**
  - `:211-215` — an Account with Contacts but no product evidence "creates NOTHING". Under the corrected model the Deal instantiates from the **commercial relationship**, not from product evidence.
  - `:50-65` — the third divergent `Account_Key` derivation.
  - `:28-29` header asserts the unenforced UNIQUE constraint.
- **Classification:** **REWIRE** (and shrinks substantially — §2/§3 collapse to a single resolve-or-create, and dedup becomes review-only)
- **Intended responsibility after correction:** Guarantee the Account's key and its at-most-one persistent Deal exist, reconcile that one Deal once, and roll up Account state — surfacing any surplus Deal as a Manual Review rather than closing it.

---

### zoho-functions/v6/processDeal.deluge (2765)

- **Trigger / callers:** WF001d "Process Deal" (`…000663638`, Deals, `create_or_edit`, repeat=**true**, no criteria). **Twelve code call sites:** `processAccount.deluge:222` (`"{}"`); `processContact.deluge:307` (`"{}"`); `processLead.deluge:669` (`source=import_bootstrap`), `processLead.deluge:677` (plain, `contactId`); `activity/routeContactSequence.deluge:1323` (**verbatim `contextJson`**); `activity/handleTaskCompletion.deluge:811` (activity ctx), `:939` (`"{}"`); `activity/handleMeetingEvent.deluge:182` (activity ctx), `:590` (`"{}"`); `activity/handleQuoteStageChange.deluge:53, :55, :79, :92` (`source=quote`).
- **Outcome served:** O7, O8, O9, O10 (primary); O2 (`:230-254` stamps `Contact_Role1`, `:404-517` maintains `Contact_Roles`); O6 (the reconcile half of every activity outcome, `:563-1187`); **O5 (`:2665-2672` — it dispatches an email)**; O11 (~20 review sites); O4 (`:2683, :2723` — it re-enters the router).
- **Current responsibility:** The single reconciliation pass for one exact Deal: gather the Account's Contacts and their Product interest, derive a durable RTP floor and opportunity type, maintain `Contact_Roles`, elect the leading Contact, create/update Quotes from **three** different evidence sources, apply the A/E/R lifecycle, recompute `Amount`, compose `Deal_Key`, write the contract ledger, roll up the Account, and route at most one commercial transition.
- **Authoritative inputs:** the **exact** supplied `deal_id` — it never reselects a canonical Deal (`:173-174`, `:27-31`); `contextJson.source ∈ {activity, quote, import_bootstrap}` (`:72-75`); `Deal_Product_Key → pipelineForProductKey` (`:100`) **as the pipeline authority**; `Accounts.Account_Key` (hard guard, `:157-163`); Contact `Stage` ranks and `Contact_Completed_Onboarding_At`/`_Renewal_At` for `everRTP` (`:222-223, :373`); Quote fields (`Quote_Stage`, `Contract_ACV`, `Grand_Total`/`Sub_Total`, `Contract_Date_Start/_End`, `Quote_Product`, `Quote_Applied_Activity_Keys`); the **live Account** `Company_Tier` for Target ACV (`:2285, :2324`).
- **Reads:** `Deals` → `id, Automation_Suppressed, Deal_Product_Key, Deal_Product, Deal_Name, Reason_For_Loss__s, Lost_Reasons, Account_Name, Contact_Name, Stage, Opportunity_Stage, Opportunity_State, Opportunity_Status, Amount, Deal_Key, Company_Tier, Contract_Initial_Date_Start/_End, Contract_Initial_ACV, Contract_Current_Date_Start/_End, Contract_Current_ACV`. `Accounts` → `Account_Key, Account_Name, Company_Tier, State, Status`. `Contacts` → `State, Status, Stage, Job_Title, Job_Title_Raw, Contact_Role1, Contact_Completed_Onboarding_At, Contact_Completed_Renewal_At, Products_Linked`. `Quotes` (related list, then always a full `getRecordById`, plus REST GET for subforms) → `Quote_Stage, Quote_Product, Opportunity_Type, Quote_Type, Quote_Applied_Activity_Keys, Contract_Date_Start/_End, Contract_ACV, Contract_Signed_Date, Grand_Total, Sub_Total, Contact_Name, Quoted_Items{id, Product_Name, Quantity, Quoted_Item_Pricing_Tier, Quoted_Item_Plan_Brands, Quoted_Item_Frequency, List_Price}`. `Products` → `Product_Name, Product_Code, Product_Active, Product_Plan_Products, Product_Plan_Type`. `Contact_Roles` (off Deals) → `id, Contact_Role`. `Contacts_X_Products` / `Products12`.
- **Writes:** `Contacts.Contact_Role1` (`:247`, suppressed). `Contact_Roles.Contact_Role` (`:509`, `updateRelatedRecord`). `Quotes` via **REST PUT/POST with `trigger:[]`** (`:997, :1108, :1521, :1556, :1726`) → `Subject, Quote_Stage, Quote_Type, Quote_Product, Opportunity_Type, Quote_Plan_Type, Quote_Plan_Brands, Quote_Plan_Frequency, Quote_Target_ACV, Quote_Contract_Date_Renewal, Quote_Last_Deal_ID, Contract_Date_Start/_End, Contract_ACV, Account_Name, Deal_Name, Contact_Name, Quoted_Items, Quote_Applied_Activity_Keys`. `Quotes` via native (`:1768, :1793`, suppressed) → `Quote_Stage="On Hold"`, `Contract_ACV`, `Contract_Signed_Date`. `Deals` (`:2490`, suppressed) → `Deal_Key, Deal_Product, Deal_Product_Key, Contact_Name, Amount, Company_Tier, Opportunity_State, Opportunity_Status, Opportunity_Stage, Stage, Contract_Initial_{ACV,Date_Start,Date_End,Plan_Products,Plan_Type,Plan_Brands}, Contract_Current_{…}`. `Accounts` (`:2550`, suppressed) → `State, Status`.
- **Creates / side effects:** Quotes (REST POST `:1108` activity, `:1556` import, `:1726` scaffold); `Contacts_X_Products` rows (`:766, :1321`); Deal↔Product related-list links (`:773, :1328`); `createAuxTask` "Manual Review" Tasks at ~16 sites and `createManualReview` at `:113, :1932, :1949, :1966`; **one automated email** via `automation.sendSequencedEmail(...)` (`:2668`); `applyQuoteLifecycle` (`:1809`); `rollupAccountState` (`:2560`); **`routeContactSequence`** (`:2683` `commercial:signed`, `:2723` `commercial:sent`). **External calls:** `invokeurl GET https://www.zohoapis.com/crm/v2/Contacts/roles` (`:408-412`) — **the only `zohoapis.com` call and the only `invokeurl` without `connection:` in the entire 38-file codebase; the other 22 all use `zohoapis.eu` + `connection:"zoho_crm"`**; REST GET/PUT/POST on `zohoapis.eu/crm/v6/Quotes` at `:875, :997, :1007, :1108, :1139, :1481, :1521, :1556, :1592, :1726, :2070`.
- **Idempotency mechanism:** **Activity Quotes** — exact, trimmed, newline-delimited `Quote_Applied_Activity_Keys` match on `<sourceModule>:<sourceActivityId>` (`:806-811`, appended in the same PUT `:969-982`), with strict post-write readback of key + product + line (`:1005-1056`, `:1138-1181`) that sets `anyBlocked` on failure. **Import** — `ImportBootstrap:Lead:<leadId>:<quoteType>:<prodId>:<start>:<end>` (`:1416`), plus a term-level dedup search on `Quote_Product + Quote_Type + both dates + not Closed` (`:1444`), plus **subform line-id reuse via REST GET so the PUT updates in place rather than appending** (`:1475-1495` — the guard against Amount doubling on replay). **Scaffold** — `Scaffold:Deal:<dealId>:Acquisition:<prodId>` (`:1667`) **plus** "skip if the Deal has any non-Closed-Lost Quote" (`:1685`). **Lifecycle** — delegated to `applyQuoteLifecycle`'s `Quote_Applied_Lifecycle_Keys`. **Deal/Account** — diff-guarded (only changed keys enter `dUpd`) and trigger-suppressed. **Transitions** — routed at most one, then verified by re-read (`:2685-2690`, `:2725-2729`), failure → review + `success=false`.
- **Workflow / config dependencies:** WF001d; WF020/WF021 on Quotes — **every** Quote write passes `trigger:[]` to suppress the `handleQuoteStageChange → processDeal` recursion (`:994, :1106, :1519, :1554, :1724`); WF008 for the review Tasks it creates. Picklists: `Quote_Stage {Draft, Negotiation, On Hold, Delivered, Confirmed, Closed Won, Closed Lost}`, `Quote_Type {Acquisition, Expansion, Renewal}`, `Opportunity_Type {FTP, RTP}`, `Deals.Stage {MQL, SQL, FTP, RTP}`, 8-value `Opportunity_Stage`, `Opportunity_State {Open, Lost}`, `Opportunity_Status {New, Working, Closed}`, `Quoted_Item_Pricing_Tier` (needs `Base`), Contact Roles `{Decision Maker, End User, Influencer}`, `Accounts.Company_Tier {1,2,3}`. **`Quote_ACV_Gap` must remain a FORMULA field** and is never written (`:1204, :1389`). Requires the `zoho_crm` connection with `ZohoCRM.modules.*` scopes. Requires `Deals.Deal_Key` UNIQUE (asserted `:41`, live-refuted).
- **Overlaps:** Title→role maps and resolution — `processLead:221-261`, `processContact:173-192`, and **two separate applications inside this file** (`:237-254`, `:488-510`). `Contact_Roles` junction stamping — `processContact:291-293`. `Contacts_X_Products` linking — `processLead:723-767` and **twice internally** (`:729-769`, `:1284-1324`, near-identical). `Company_Tier` → Target ACV rule `{1→26000, 2→16500, 3→10500}` — **three copies** (`:1225-1227`, `:1695-1697`, `:2325-2327`). Quote creation — **three engines** (§5 activity `:788-1183`, §5b import `:1216-1631`, §8z scaffold `:1655-1736`). Account rollup — its own `:2494-2551` **plus** `rollupAccountState(:2560)` **plus** `processAccount:227` **plus** `processLead:799`. Stage rank map — `processLead:48`, `processContact:43`, `handleMeetingEvent:116`, `handleTaskCompletion:592`, `sendDemoReminder:89`, `routeContactSequence:403-412`. Opportunity classification — `:383-387` (rank-derived) vs `routeContactSequence:414-422` (map) vs `handleTaskCompletion:825,1005,1306` (reads `Deals.Stage`).
- **Model drift:**
  - **`:92-117` PIPELINE GATE.** Returns `partnership_held` and skips **all** reconciliation because one *product* is Partnership. Under one-Deal-per-Account this holds an Account's **entire** commercial relationship out of automation. It also derives pipeline from `Deal_Product_Key` while **`Deals.Pipeline` is live-readable 96/96** — the correctly-placed gate already exists at `routeContactSequence:977-990`.
  - **`:449-459, :465-517` product-scoped Contact Roles.** A Contact is refused a role on the Deal unless its product evidence matches `dealProdKey`. Under the corrected model every Account Contact belongs on the one Deal.
  - **`:488-510` is a fourth, materially different role resolution.** It reads `contactJobTitleMap` (populated at `:212, :217` from **`Job_Title` only — no `Job_Title_Raw` fallback**), defaults to `"Decision Maker"` **unconditionally** including for a blank title, and consults **only `euTitles` then `infTitles` — `dmTitles` is never checked here**. A booking-sourced Contact whose `Contact_Role1` resolved to blank/End User/Influencer at `:237-254` can be stamped `Decision Maker` on the junction seconds later in the same run.
  - **`:1898-1973` §6b** composes `Deal_Key = accountKey + "::" + dealProductKey` (`:1922, :1942`) and raises `quote_product_mismatch` when non-lost Quotes carry >1 product (`:1944-1951`) or when a Quote disagrees with `Deal_Product` (`:1928-1934`). Prohibited: `several Quote Products under one Deal are a data error`, `Quote with a different Product belongs on a different Deal` (§11).
  - **`:2107` `Deal_Key` write; `:2110-2120` `Deal_Product` / `Deal_Product_Key` stamping** — direct Product↔Deal identity, forbidden by §7.1 ("Direct Product-to-Deal identity is not part of the intended model").
  - **`:1664` scaffold precondition `scafProdId != ""`.** With `Deal_Product` blank under the corrected model the "no open Deal without a Quote" invariant silently stops firing — a data-quality failure, not an error.
  - **`:2318-2335` Amount from `Company_Tier` Target ACV** when no priced Quote exists. §6.5/§7.5: Deal Amount derives from **Quote** evidence. (`V6_CRUD_PLAN.md:245` freezes this block pending R6 — 57.3% of headline value.)
  - **`:2230-2236`** closes the Deal (`Lost`/`Closed`) when the **product-scoped** role set has no Open Contact. Violates acceptance invariant 8: losing one Contact must not lose the Deal while another viable Contact remains.
  - **`:383-387`** derives `MQL/SQL/FTP/RTP` from a Deal-side rank rather than the Contact's Stage classification — a second opportunity-classification authority.
  - **`:2665-2672`** the reconciliation engine decides to send an email. A dispatch authority sitting alongside `routeContactSequence` (O5's single-owner intent).
  - **`:2677-2748`** the reconciliation engine routes sequence transitions — the re-entry (see below).
  - **`:408-412`** `zohoapis.com` + no `connection:` in an EU org. If it fails, `roleIdMap` is empty and `:504-505` silently degrades to passing the role **name** instead of the role **id**. Code asymmetry CONFIRMED; runtime effect **UNVERIFIED** (function logs are not API-reachable).
  - **`:36-39` header is false.** It claims `ensureDealQuote`, `syncConfirmedQuoteToDeal` and `_util_resolveQuotePlanSummary` "stay on disk". **None of the three exists anywhere in the repo** (`find` across the whole tree: 0 hits).
  - **`:41` header** asserts the unenforced `Deal_Key` UNIQUE constraint.
- **Classification:** **REWIRE** (internally **KEEP AND SIMPLIFY** — the fix is fewer authorities inside this file, not more files)
- **Intended responsibility after correction:** Be the single reconciliation pass for the Account's one persistent Deal: recompute the leading Contact, the rolled-up classification and State, `Amount`, and the contract ledger **from Quote evidence only**. It must stop owning product identity, Deal keying, Deal creation, sequence routing and email dispatch.

---

## processDeal — internal section map (where each responsibility would go)

| Lines | Section | Outcome | Where it belongs under the corrected model |
|---|---|---|---|
| `45-82` | result object, ctx parse, Deal read | none | stays |
| `84-90` | `Automation_Suppressed` kill-switch | none | stays |
| **`92-117`** | **pipeline gate (`partnership_held` / `product_key_unresolved`)** | mis-serves O7 | **DELETE.** The gate already exists correctly at `routeContactSequence:977-990`; pipeline reads from `Deals.Pipeline` |
| `119-125` | stage-rank + three title maps | O2 | **extract** to shared helpers (`classifyContactStage`, one role resolver) |
| `127-140` | explicit-duplicate short-circuit | O11 | stays |
| `142-174` | Account + `Account_Key` resolution | O1 | stays (single guard) |
| `176-362` | §1 gather Contacts, aggregate Product Interest, `everRTP`, stamp `Contact_Role1` | O2, O10 | **role stamping → processContact**; gather/aggregate stays |
| `364-402` | §2 RTP floor + effective Opportunity Type | O10 | stays, but classification from the **shared Contact-Stage map** |
| **`404-517`** | §3 `Contact_Roles` maintenance + product scope | O2, O10 | **REWIRE**: drop the product scope; one role resolver shared with processContact |
| `519-561` | §4 leading-Contact election (role tiebreak) | O10 | stays — this is authority §6.4 |
| **`563-1187`** | §5 activity Product resolution + linking + per-Product Quote upsert | O6, O7 | stays — this is the O7 engine |
| **`1189-1631`** | §5b imported-contract bootstrap Quote engine | O1, O7 | **merge with §5** — same Quote upsert with a different key source |
| `1633-1639` | blocked short-circuit | O11 | stays |
| `1641-1736` | §8z scaffold Quote (open Deal must have ≥1 Quote) | O7 | **merge with §5/§5b**; precondition must stop depending on `Deal_Product` |
| `1738-1798` | §9 Confirmed prerequisites + `Contract_ACV`/`Contract_Signed_Date` | O7, O8 | stays |
| `1800-1819` | §10a A/E/R lifecycle (`applyQuoteLifecycle`) + re-read | O9 | stays |
| `1821-1896` | §6 `Amount` recompute + controlling Contact + product keys | O8, O10 | stays |
| **`1898-1973`** | §6b Deal product identity + `Deal_Key` composition | — | **DELETE.** Deal identity becomes Account-scoped; product identity lives on the Quote |
| `1975-2096` | §7 contract-term ledger aggregation | O8 | stays (**frozen — blocker B2**) |
| `2098-2272` | §8 Deal-update map: key, product stamp, Contact, viability, stage | O8, O10 | keep Contact/viability/stage; **delete the key + product stamp**; viability must read **all** Deal Contacts |
| `2274-2290` | §8a2 `Company_Tier` mirror | O8 | **RETIRE the mirror** — read the Account |
| `2292-2351` | §8b `Amount` valuation hierarchy | O8 | keep 1/2/5; **tier fallback frozen — R6** |
| `2353-2470` | ledger fields onto the Deal | O8 | stays (**frozen — B2**) |
| `2472-2560` | §10b Deal write + Account rollups (×2 authorities) | O9, O10 | **collapse to one** `rollupAccountState` call |
| `2562-2749` | §11 transition gates + signed-confirmation email + router re-entry | O4, O5, O6 | **move out** — dispatch and routing belong to `routeContactSequence` |
| `2751-2764` | §12 return | none | stays |

---

## Owner-named complexity surfaces

**1 · Product-Deal creation/resolution embedded across all four.**
Four independent entry points create Deals through the same helper: `processLead:627`, `processContact:281`, `processAccount:198`, and the workflow-triggered `createOrReuseProductDeal` create itself (`_util_createOrReuseProductDeal:61,90,105,142`), which is **deliberately unsuppressed** and re-fires WF001d → `processDeal`. `processAccount` additionally *destroys* Deals (`:148-162`). `Account_Key` — the left half of every key — is derived by **three different algorithms** (`processLead:296-314` Website→email→Company; `processContact:74-108` Website→email→Account_Name, with a second no-Account branch at `:97-108`; `processAccount:52-62` Website→Account_Name, **no email**). Result: five writers of Deal identity, three definitions of the Account half, and a UNIQUE constraint that live data proves is not enforced.

**2 · Product-scoped Contact Roles (`processDeal:449-517`).**
`dealProdKey` is resolved at `:451-459`; `:472-487` then **skips** any Contact whose `contactProductKeysMap` entry does not contain that key, unless it is `Deal.Contact_Name`. Two knock-on effects: (a) the Deal's role list becomes product-filtered, and (b) `:2184-2213` computes Deal viability from **that same filtered list**, so a Deal can be marked Lost while a viable Account Contact exists — acceptance invariant 8. `dealProdKey == ""` falls back to stamp-all (`:472`), which is exactly the behaviour the corrected model wants unconditionally.

**3 · Multi-Product activation ambiguity (`processContact:354-358`).**
```
if(driverDealIds.size() > 1)
{
    automation.createManualReview(cleanId, driverDealIds.get(0), "multi_product_sequence_ambiguous", …);
    return;
}
```
Preceded by two harder stops: `:259-263` (zero products → return before any activation code) and `:312` (zero Product Deals → return). And `:345-350` (no B2B and no Partnership driver → return). **Four separate product-derived early returns stand between a Decision Maker and its Activation Task.** Under the settled ruling all four must go; the Task is created on the Contact, with the Account's Deal as optional `What_Id`.

**4 · The duplicated title→role maps — EXACT contents and EXACT fallbacks.**

**Contents: identical.** `dmTitles` 149 entries, `euTitles` 133, `infTitles` 133 — md5 of the literal body is the same in all three files (`bb9f7fea…` / `9ee281a2…` / `1d8644ca…`). Declared at `processLead:227,234,241`; `processContact:177,178,179`; `processDeal:123,124,125`.

**Fallbacks: four sites, three distinct behaviours.**

| Site | Gate | Default before lookup | Lookup order | Written to |
|---|---|---|---|---|
| `processLead:221-261` | `(Job_Title != "" ‖ Job_Title_Raw != "") && Contact_Role1 == ""` | `if(Job_Title != "", "Decision Maker", "")` | dm → **nested else** eu → **nested else** inf | `Leads.Contact_Role1` (`:252`, **unsuppressed**) |
| `processContact:173-192` | `(Job_Title != "" ‖ Job_Title_Raw != "") && Contact_Role1 == ""` | `if(Job_Title != "", "Decision Maker", "")` | dm → `else if` eu → `else if` inf | `Contacts.Contact_Role1` via `updConInit` (`:226`, suppressed) |
| `processDeal:237-254` | `Contact_Role1 == "" && (Job_Title != "" ‖ Job_Title_Raw != "")` | `if(Job_Title != "", "Decision Maker", "")` | dm → `else if` eu → `else if` inf | `Contacts.Contact_Role1` (`:247`, suppressed) |
| **`processDeal:488-510`** | `existingRoleVal == null ‖ blank` (the **junction**, not the Contact) | **`"Decision Maker"` unconditionally — including for a blank title** | **`euTitles` → `infTitles` only; `dmTitles` never consulted**; **`Job_Title_Raw` never consulted** | `Contact_Roles.Contact_Role` (`:509`) |

A fifth default exists at `processContact:243-244`: `if(contactRoleVal == "") { contactRoleVal = "Decision Maker"; }`, written to the same junction at `:293`. **So the two junction writers and the three Contact writers disagree by construction: a raw-title-only Contact resolves to blank on `Contact_Role1` and to `Decision Maker` on `Contact_Roles`, in the same execution.**

**5 · Repeated Stage / rank / classification maps — every location.**
- 8-stage rank map `{Marketing Consent:1 … Renewal:8}`, **six identical literals**: `processLead:48`, `processContact:43`, `processDeal:119`, `handleMeetingEvent:116`, `handleTaskCompletion:592` (`actStageRanks`), `sendDemoReminder:89`; plus a seventh built programmatically at `routeContactSequence:403-412`.
- 8-stage ordered list `stagesList`: `processContact:44`, `routeContactSequence:403`.
- Inverse map `rankToStage`: `processDeal:394-399` (built at runtime from the literal).
- Stage → `MQL/SQL/FTP/RTP` classification, **two incompatible implementations**: an explicit map at `routeContactSequence:414-422`, and rank arithmetic at `processDeal:383-387` (`>=7 RTP`, `>=5 FTP`, `>=2 SQL`, else MQL). Consumed by a **third** pattern that just reads `Deals.Stage == "RTP"` at `handleTaskCompletion:825, :1005, :1306` and `_util_applyQuoteLifecycle:188`.
- Role rank map `{Decision Maker:3, End User:2, Influencer:1}`: `processDeal:537`.
- Quote-stage rank map `{Draft:1, Negotiation:2, On Hold:2, Delivered:3, Confirmed:4, Closed Won:5}`: `processDeal:1833`.
- Contact stage → completion-field map (8 entries): `processContact:195-203`. The Deal-side twin was deleted 2026-08-11 (`processDeal:2475-2485`) because all six fields were phantom.
- `Company_Tier` → Target ACV `{1→26000, 2→16500, 3→10500}`: `processDeal:1225-1227`, `:1695-1697`, `:2325-2327`.
- Free-email-domain list: `processLead:306`, `processContact:83`, `processContact:101`.

**6 · `routeContactSequence` → `processDeal` → `routeContactSequence` re-entry.**
`routeContactSequence:1320-1331` calls `processDeal(dealId, contextJson)` **verbatim**, so an activity context propagates down. `processDeal:2677-2748` then calls `routeContactSequence(primaryContactId, targetDealId, "commercial:signed"|"commercial:sent", "{}")` — **frame 3**, which itself reaches `:1320` again — **frames 4 and 5**. `processDeal:1346-1350` documents the observed consequence: at that depth the signed-confirmation send **and its own Manual Reviews silently no-op'd**, which is why the dispatch was hoisted out to `processDeal:2665-2672` (two frames shallower) and `routeContactSequence` now leaves `sideEmailKind` blank for `commercial:signed`.

The re-entry is fenced, not removed. Three fences: `runReconcile = (primaryId == contactId) || isActivityCtx` (`:1320`); the four-way outer-dispatch suppression on `transitionRouted` / `success==false` / `Sequence_State=="Stopped"` / an open blocking Task (`:1369-1408`); and `processDeal`'s own `if(!isQuoteSrc)` guard (`:2677`) plus post-route verification (`:2685-2690`, `:2725-2729`). **And the `commercial:signed` branch is dead in practice** — `processDeal:2652-2655` records the live proof (2026-07-20): the RTP floor writes `Opportunity_Stage="Onboarding"` at `:2251` **before** the gate at `:2680` evaluates, so its `primaryStageNow == "Commercial Agreement"` precondition is already false. The branch still routes and still verifies; it just never fires. That is the one-directional flow the owner is asking for, achieved by accident and defended by five layers of fencing — the corrected design should make it structural: **activities → router → reconciliation, and reconciliation returns evidence rather than calling back.**

---

## Part 2 — Activity handlers and senders (17 files)

# LEDGER PART 2 — ACTIVITY HANDLERS AND SENDERS (`zoho-functions/v6/activity/`)

**Live reads performed (READ-ONLY, 2026-08-18):** `getWorkflowRules` (18 rules, full ids below), `getAllAutomationFunctions` (17 registered, `feature_type=workflow`, `more_records=false`), COQL on `Contacts.Sequence_Activated_At` and `Tasks.Task_Type='Sequence Activation'`.

**Three live facts that govern every verdict below:**
1. **`Contacts.Sequence_Activated_At` is populated on ZERO Contacts** (COQL `where Sequence_Activated_At is not null` → `[]`). The gate at `routeContactSequence:963-967` and the independent send gate at `sendSequencedEmail:217-233` therefore suppress **every** cadence dispatch and **every** sequenced email org-wide, today.
2. **Every `Sequence Activation` Task is `Task_State=Open / Task_Status=New / Status=Not Started / Task_Sequence_Type=null`** (COQL, 50+ rows, `more_records=true`). Zero commits have ever occurred. All of them carry a `What_Id`.
3. **`routeContactSequence`, `sendSequencedEmail`, `createAuxTask`, `createManualReview` are NOT registered automation functions.** The registry returns 17 names and none of these four appear. They are reachable only by in-code `automation.<fn>` calls.

---

### zoho-functions/v6/activity/routeContactSequence.deluge (1688)

- **Trigger / callers:** **No workflow rule.** Not in the live function registry — UNREGISTERED as a workflow function, callable only in-process. Callers: `handleTaskCompletion:662` (`activate:email|call|manual`), `:720` (`resume`), `:962` (`resume`), `:1451` (`resume`), `:1458` (`task:positive`); `handleCallOutcome:165` (`call:positive`), `:324` (`call:neutral`), `:490` (`call:neutral`); `handleMeetingEvent:269` (`demo:qualified`), `:324` (`demo:followup`), `:450` (`meeting:created`); `handleEmailEvent:127` (`contactlost:No Response`); `sendCommercialFollowUp:85` (`commercial:followup_due`); `processDeal:2683` (`commercial:signed`), `processDeal:2723` (`commercial:sent`). **The header comment at `:32-34` ("the public Contact router workflow passes `resume`") is FALSE — no rule invokes this function.**
- **Outcome served:** O3, O4, O6, O11 (delegates O7/O8/O9/O10 to `processDeal`)
- **Current responsibility:** The single Contact-transition executor: validates the source activity's relationship, runs an inlined trigger→(Stage, Sequence_State, Sequence_Stage, Sequence_Step, action) state machine, supersedes stale Calls/Tasks, writes the Contact's authoritative Stage/Sequence fields, calls `processDeal` for reconciliation, then dispatches at most one downstream Call / stage Task / scheduled email / cadence email.
- **Authoritative inputs:** `Contacts.Stage`, `Sequence_Type/State/Stage/Step`, **`Contacts.Sequence_Activated_At` as the sole proof of activation** (`:254-255`), the `trig` token, `contextJson`, and the ACTIVE Activation Task's `ActivationCommand|` Description marker (`:910-960`).
- **Reads:** Contacts → `Stage, Sequence_Type, Sequence_State, Sequence_Stage, Sequence_Step, Sequence_Activated_At, State, Status, Lost_Reasons, Account_Name, Contact_Completed_*_At`; Deals → `id, Owner, Contact_Name, Account_Name, Opportunity_State, Stage`; Deals related `Contact_Roles`; Tasks → `Who_Id, Status, Task_Status, Task_Type, Task_Sequence_Managed, Task_Sequence_Stage, Description`; Calls → `Who_Id, Sequence_Managed, Sequence_Stage, Sequence_Attempt, Call_Task_State, Call_Task_Status`; Events (via source-activity fetch); `automation.resolveDealPipeline(dealId)` (`:977`).
- **Writes:** Contacts → `Stage, Sequence_Type, Sequence_State, Sequence_Stage, Sequence_Step, Sequence_Activated_At, State, Status, Lost_Reasons, Contact_Completed_{Marketing_Qualification,Demo_Booking,Demo_Confirmation,Demo_Hosted,Proposal_Preparation,Commercial_Agreement,Onboarding,Renewal}_At` (`:1122-1233`); Deals → `Opportunity_State` only (`:1110-1117`); Calls → `Outgoing_Call_Status, Call_Task_Status` (supersede `:1035`); Tasks → `Status, Task_Status, Description` (supersede `:1067,:1071`).
- **Creates / side effects:** Calls (`:1555`, `Subject "<Stage> Call <n>"`, `Sequence_Managed=Yes`, `Sequence_Stage`, `Sequence_Attempt`, `Call_Task_State=Open`, `Call_Task_Status=Working`, mirrors); Tasks — Scheduled Send wake-up (`:1607`) and stage Tasks Draft Commercials / Onboarding Setup / Manual Review (`:1670`); emails via `sendSequencedEmail` (`:1465, :1483, :1561`); `createAuxTask` (`:202, 309, 314, 329, 987, 1283, 1288, 1298`); `processDeal(dealId, contextJson)` (`:1323`). No `invokeurl`. **Created Calls/Tasks are created WITHOUT `noTrigger`, so WF006/WF008 re-fire on them** (both re-entries return at their own guards).
- **Idempotency mechanism:** Call dedupe = `Who_Id + Sequence_Managed=="Yes" + Sequence_Stage==nextStage + Sequence_Attempt==callStep + Call_Task_State=="Open" + Call_Task_Status=="Working"` (`:1508`). Scheduled-send dedupe = `Description.contains("ScheduledSend|stage=..|step=..|kind=..")` on a non-Completed/Cancelled Task (`:1569, :1589`). Stage-Task dedupe = `Task_Type + Task_Sequence_Stage + Status in {Not Started, In Progress}` (`:1631`). Blocking-Task guard on `resume` (`:341-371`) and post-reconcile (`:1389-1409`). `Sequence_Activated_At` is set-once (`:1132`). Email idempotency is owned downstream by SendKey.
- **Workflow / config dependencies:** `Tasks.Blocks_Sequence` (written `:1603,:1648`; the field contract marks it **RETIRE — 0 readers**, and per the phantom-write memory deleting it before these writes are removed would void the whole create map). Picklists: `Sequence_State {Not Activated, Running, Stopped, Complete}`, `Sequence_Stage {Call, Email, Task, Meeting, None}`, `Task_Type {Draft Commercials, Onboarding Setup, Manual Review, Scheduled Send}`, `Lost_Reasons` canonical set (`:276-294`), `Outgoing_Call_Status` (**`Cancelled` is valid on Calls but NOT on `Tasks.Status`** — the fix is documented at `:1058-1066`). Depends on `automation.resolveDealPipeline` returning exactly `"B2B"`. Consumers: WFC-SchedEmail (`Due_Date` + `Task_Type`), WF006, WF008.
- **Overlaps:** supersede logic duplicated in `handleTaskCompletion:470-509`; stage-rank maps duplicated in `handleTaskCompletion:592`, `handleMeetingEvent:116`, `sendDemoReminder:89`; `stageOpportunity` map (`:414-422`) duplicates the Contact→MQL/SQL/FTP/RTP classification also derived at `createAuxTask:388`, `sendSequencedEmail:384`, `handleCallOutcome:125`, `handleMeetingEvent:113`; the activity-loss matrix is INLINED here (`:273-294`) while `_util_resolveActivityLoss` remains the shared implementation used by all three handlers — two copies of one rule.
- **Model drift:**
  - `:67-71` returns when `dealId == 0`. **Violates the settled ruling** — a Contact-scoped activation must operate with no Deal.
  - `:977-990` `gatePipeline != "B2B"` suppresses all dispatch. **Violates "Product interest, Quote existence and Deal resolution must NOT determine cadence eligibility"** — pipeline is derived from the Deal's product.
  - `:81-206` requires `Activity.What_Id == dealId` (`what_id_mismatch`) — makes What_Id mandatory relationship context, not optional.
  - `:1085` `mirrorOppType` falls back to `deal.get("Stage")`; **`*_Task_Opportunity` must come from the Contact.**
  - `:390-403` `cadenceStages`/`progression` are Contact-Stage-driven and correct, but `:1323` passes the whole product/brand/date context into `processDeal`, which is Deal-per-Product — Quotes-under-one-Deal is not what runs.
  - `:1114` writes only `Opportunity_State`; header `:11-15` correctly flags the phantom set.
  - **17 of the ~31 handled trigger tokens are unreachable** (see cadence section, Dead-token table).
- **Classification:** **KEEP AND SIMPLIFY**
- **Intended responsibility after correction:** Remain the sole Contact-transition executor, but Contact-scoped: accept `dealId == ""`, treat What_Id as optional context, drop the pipeline dispatch gate, delete the unreachable trigger branches, and take `*_Task_Opportunity` from the Contact classifier.

---

### zoho-functions/v6/activity/handleTaskCompletion.deluge (1461)

- **Trigger / callers:** **WF008 Task Completion Handler**, id `991103000000784145`, module Tasks, `create_or_edit`, `repeat=false`, **no criteria**, active, last executed 2026-07-20; carries an undocumented `assign_owner` action. Registered function id `991103000000780448`. No in-code callers.
- **Outcome served:** O3, O4, O6, O7, O11
- **Current responsibility:** Applies the Task command surface: for `Task_Type="Sequence Activation"` it resolves the `ActivationCommand|` marker into one of nine outcomes (activate / preference_change / disable / re-enable / idempotent-skip / three stop-safely reviews) and routes activation once; for every other Task type it applies `Task_State` Won/Lost/Open to the Contact sequence and owns the Draft/Send Commercials Quote package.
- **Authoritative inputs:** `Tasks.Task_State` + `Task_Sequence_Type` (rep command), the `ActivationCommand|state=..|type=..` line in `Tasks.Description` (**authoritative processed-command marker**, `:246-312`), `Contacts.Sequence_Activated_At` + `Sequence_Type` as legacy bootstrap evidence, `Task_Contract_*` as commercial evidence.
- **Reads:** Tasks → `Task_Type, Task_State, Task_Status, Task_Sequence_Type, Task_Sequence_Managed, Task_Sequence_Stage, Task_Lost_Reasons, Status, Description, Who_Id, What_Id, $se_module, Task_Contract_{Products,Brands,Date_Start,Date_End,Frequency}`; Contacts → `Stage, State, Sequence_State, Sequence_Type, Sequence_Activated_At`; Contacts related `Tasks`, `Notes` (on the Task, `:624`), `Products12`; `Contacts_X_Products`; Deals → `Account_Name, Stage, Deal_Name`; Deals related `Quotes`, `Products`; Products → `Product_Name, Product_Active`; Quotes (REST GET) → `Quote_Stage, Opportunity_Type, Quote_Product, Quoted_Items, Quote_Applied_Activity_Keys`.
- **Writes:** Tasks → `Task_State, Task_Status, Status, Description, Blocks_Sequence` (`:219, 407, 435, 456, 521, 528, 547, 572, 581, 666, 694, 738, 752, 818, 895, 935, 952, 955, 977, 1286, 1300, 1441, 1445`); Contacts → `Sequence_Type` (`:434, 571`), `Sequence_State/Stage/Step` (`:515-517, 540-546, 798-802`), `Stage` (`:599`); Calls → `Outgoing_Call_Status, Call_Task_Status` (`:486`); Quotes → `Quote_Stage="Delivered"` (`:901`), and via REST PUT `Quote_Applied_Activity_Keys, Contract_Date_Start, Contract_Date_End` (`:1132-1139`).
- **Creates / side effects:** `Contacts_X_Products` junction rows (`:1079, :1408`); Deals↔Products link (`updateRelatedRecord`, `:1081`); **Quotes created by raw REST POST** to `https://www.zohoapis.eu/crm/v6/Quotes` with `trigger:[]` (`:1218-1225`) plus REST GET readback (`:1247`); `createAuxTask` ×16; `createManualReview:649`; `processDeal` (`:811, :939`); `routeContactSequence` (`:662, 720, 962, 1451, 1458`).
- **Idempotency mechanism:** (a) `Task_Status=="Closed"` + terminal `Task_State` → skip (`:680-684`); (b) the `ActivationCommand|` marker tuple compared to `(Task_State, Task_Sequence_Type)` → `idempotent_skip` (`:349-352, 397-403`); (c) active-control collapse: >1 active Activation Task, all provably blank → defer all but lowest id; otherwise **stop safely** (`:206-243`); (d) `matchDraftQuotes(..., activityKey="Tasks:<taskId>")` reuse detection (`:1086, :1429`); (e) `Email Sent` audit guard (`:45-49`) and `ScheduledSend|` guard (`:51-55`).
- **Workflow / config dependencies:** WF008 firing on Deluge-created Tasks (unverified — CRUD plan U5). Picklists `Task_Type` (9 known values `:58`), `Task_State`, `Task_Status`, `Task_Lost_Reasons`, `Quote_Stage {Draft, Negotiation, Delivered, On Hold, Confirmed, Closed Lost}`, `Opportunity_Type {FTP, RTP}`, `Quoted_Item_Pricing_Tier`. Product names are string-matched with hardcoded `Jurni`→`Jurnii` repairs (`:1014-1015, 1314-1315`). `Tasks.Blocks_Sequence` written at `:219`.
- **Overlaps:** the whole `:967-1448` Draft Commercials block **re-implements `processDeal`'s Quote creation, pricing, product linking and readback** — and `:985-988` sets `pdRawDraft = "{}"` so `processDeal` is deliberately never called; the "fallback" is the only path. Cadence-artifact neutralisation (`:470-509`) duplicates `routeContactSequence:1016-1076`. Stage ranks duplicated (`:592`).
- **Model drift:**
  - `:65-72` returns `skip_no_related_deal` when `$se_module != "Deals"` or `What_Id` is blank. **Directly violates the settled ruling: a missing Deal must not prevent creating, committing, stopping or reactivating the Activation Task.**
  - `:1005, :1306, :825` derive Quote `Opportunity_Type` from `Deal.Stage=="RTP"` — Deal-scoped opportunity authority; the model puts it on the Contact.
  - `:1192-1204` builds a **per-Product Quote under a per-Product Deal** (`Quote_Product`, `Deal_Name`), not products-as-Quotes under one persistent Deal.
  - `:1444` surfaces `Send Commercials` only after per-Product Deal/Quote/Product-link verification — commercial progression gated on Deal resolution.
  - `:113-117` stale-stage guard silently drops any non-activation Task whose `Task_Sequence_Stage` differs from `Contact.Stage`.
- **Classification:** **KEEP AND SIMPLIFY** (the Draft Commercials fallback at `:980-1291` is a **MERGE** candidate into `processDeal`)
- **Intended responsibility after correction:** Own the Task command surface only — resolve and apply the activation command Contact-scoped with What_Id optional, and hand every Quote/pricing/product concern to the single Quote owner.

---

### zoho-functions/v6/activity/handleMeetingEvent.deluge (598)

- **Trigger / callers:** **WF007 Event Meeting Handler**, id `991103000000782052`, module Events, `create_or_edit`, `repeat=false`, **no criteria**, active, last executed 2026-08-17; carries an `assign_owner` action on `Events.Owner`. Registered function id `991103000000780415`. Trigger surface is frozen by the booking backend (`booking/integrations/zoho/index.js:371-375`). No in-code callers.
- **Outcome served:** O4, O6, O7, O11
- **Current responsibility:** Applies `Meeting_Task_State` to the Contact/Deal — commercial/renewal meetings promote evidence to `processDeal`; demo meetings route `demo:qualified` / activity-loss; upcoming meetings compute the reminder, stamp mirrors and guidance, and advance a first booking to Demo Confirmation; then reconciles any additional selected products' Deals.
- **Authoritative inputs:** `Events.Meeting_Task_State`, `Meeting_Task_Stage` (meeting TYPE inference), `Meeting_Task_Lost_Reasons`, `Meeting_Task_Contract_*`, `Start_DateTime`, and **`Events.Who_Id` — required on any terminal path** (`:103-109`).
- **Reads:** Events → `What_Id, $se_module, Who_Id, Meeting_Task_{State,Status,Stage,Lost_Reasons,Contract_Products,Contract_Brands,Contract_Date_Start,Contract_Date_End,Contract_Frequency}, Start_DateTime, Description, Ext_Calendar_Booking_ID`; Deals → `Account_Name, Contact_Name, Stage, Deal_Product_Key`; Contacts → `Stage, Sequence_State`; Accounts → `Account_Key`; Deals searched by `Deal_Key`; `resolveDealPipeline`, `computeProductKey`, `pipelineForProductKey`, `resolveActivityLoss`.
- **Writes:** Events → `Meeting_Task_Status, Meeting_Task_State, Reminder_Send_At, Meeting_Task_Pipeline, Meeting_Task_Opportunity, Meeting_Task_Stage, Description` (`:105, 188, 192, 200, 246, 250, 285, 290, 356, 360, 399-424`); Deals → `Demo_Reminder_Send_At` (`:439`).
- **Creates / side effects:** `createAuxTask` ×11; `createManualReview` (`:106, 521, 554, 560`); `routeContactSequence` (`:269, 324, 450`); `processDeal` (`:182, :590`). No `invokeurl`. Creates no Events (meetings are booked externally).
- **Idempotency mechanism:** MTG-4 — terminal `Meeting_Task_State` + `Meeting_Task_Status=="Closed"` → skip (`:87-91`). **Verified close**: `Closed` is written only AFTER the intended effect is observed (`:283-293` demo Won verifies Contact reached Proposal Preparation or later; `:244-252` and `:354-362` verify the loss action landed), otherwise the record is reopened `Open/Working` for retry. First-booking advance is rank-guarded (`:446-452`). Multi-product block is idempotent by construction — no marker, `processDeal` never regresses, `createManualReview` dedups on the `[code]` token (`:474-479`).
- **Workflow / config dependencies:** WF007 must stay criteria-free (booking dependency). Picklists `Meeting_Task_State/Status/Stage/Lost_Reasons`, `Meeting_Task_Contract_Frequency`. `Deals.Demo_Reminder_Send_At` feeds WF010c. Depends on `Deals.Deal_Key` uniqueness and `Accounts.Account_Key`.
- **Overlaps:** loss-action fan-out duplicated with `handleCallOutcome:322-514` and `handleTaskCompletion:690-741`; stage ranks duplicated (`:116`); the reminder-mirror onto Deals duplicates `Events.Reminder_Send_At`.
- **Model drift:**
  - `:458-596` the entire multi-product reconcile exists **only because a Deal is Account × Product** — it resolves `Account_Key + "::" + productKey` against `Deals.Deal_Key` (`:542`) and calls `processDeal` per product Deal (`:590`). Under one-Deal-per-Account with products as Quotes, this block has no reason to exist.
  - `:113` `dealOppType = deal.get("Stage")` → `Meeting_Task_Opportunity` from the **Deal**, not the Contact.
  - `:38-42` requires `$se_module=="Deals"` and a `What_Id`; a meeting with no Deal is dropped.
  - `:534` `pipelineForProductKey` — product→pipeline, a concept the model does not have.
  - Header `:14-16` claims `Meeting_Type` is retired; body confirms (never read) — comment is accurate here.
- **Classification:** **KEEP AND SIMPLIFY** (delete `:458-596` when the Deal model collapses)
- **Intended responsibility after correction:** Apply the Meeting's own state to the Contact and hand commercial evidence to the single Quote owner; compute the reminder; nothing product-Deal-shaped.

---

### zoho-functions/v6/activity/handleCallOutcome.deluge (522)

- **Trigger / callers:** **WF006 Handle Call Outcome**, id `991103000000808046`, module Calls, `anyaction`, active, last executed 2026-07-21. Two conditions: (1) `Call_Task_State` + `Sequence_Managed`; (2) `Next_Follow_Up_Date` + `Sequence_Managed`. Registered function id `991103000000780459`. No in-code callers.
- **Outcome served:** O4, O6, O7, O11
- **Current responsibility:** Turns a cadence Call's `Call_Task_State` into a Contact transition — Won → `call:positive` with commercial evidence; Open + `Next_Follow_Up_Date` → reschedule (reuse-or-create replacement Call); Lost → `resolveActivityLoss` fan-out, with an explicit multi-precondition exhaustion proof before any Contact-loss referral.
- **Authoritative inputs:** `Calls.Call_Task_State` + `Call_Task_Lost_Reasons`; `Sequence_Managed=="Yes"` as the automation-ownership marker; `Contacts.Stage / Sequence_Stage / Sequence_Step / Sequence_State` for staleness and exhaustion.
- **Reads:** Calls → `Sequence_Managed, Call_Task_State, Call_Task_Status, Call_Task_Lost_Reasons, Sequence_Stage, Sequence_Attempt, Who_Id, What_Id, $se_module, Next_Follow_Up_Date, Call_Task_Contract_{Products,Brands,Date_Start,Date_End,Frequency}`; Contacts → `Stage, Sequence_Stage, Sequence_Step, Sequence_State`; Deals → `Stage`; Deals related `Calls`, `Tasks`; Contacts related `Events` → `Meeting_Task_State, Start_DateTime`; `resolveDealPipeline`, `resolveActivityLoss`.
- **Writes:** Calls → `Call_Task_Status, Outgoing_Call_Status, Call_Task_State, Next_Follow_Up_Date` (`:93, 166, 276, 283, 290, 297, 307, 325, 482, 491, 498, 503, 507, 513`).
- **Creates / side effects:** replacement Calls (`:294`, full contract-evidence carry-forward `:203-213`); `createAuxTask` (`:308, 481, 497, 502, 512`); `routeContactSequence` (`:165, 324, 490`). No `invokeurl`.
- **Idempotency mechanism:** `Call_Task_Status=="Closed"` → skip (`:42-46`); `Call_Task_State==""` → `skip_no_signal` (`:70-74`); stale-stage neutralise (`:91-96`); processed-attempt guard `Sequence_Attempt != Contact.Sequence_Step` (`:98-105`); reschedule dedupe on `Sequence_Stage + Sequence_Attempt + Call_Task_State==Open + Call_Task_Status==Working + Next_Follow_Up_Date==""` with lowest-id keep and surplus cancel (`:218-286`); **CALL-3: a failed dedupe scan aborts rather than creating** (`:250-256`); CALL-4: `Next_Follow_Up_Date` cleared so WF006 condition 2 cannot re-fire (`:290, :297`).
- **Workflow / config dependencies:** WF006 compares `Sequence_Managed == "Yes"` (string picklist, not boolean). Picklists `Call_Task_State/Status/Lost_Reasons`, `Outgoing_Call_Status {Scheduled, Completed, Cancelled}`, `Call_Type`, `Call_Task_Contract_Frequency`. Depends on `routeContactSequence` accepting `call:neutral`.
- **Overlaps:** loss fan-out duplicated with `handleMeetingEvent` and `handleTaskCompletion`; the SEQ-6 exhaustion scan (`:337-472`) partially duplicates the blocking-Task scans in `routeContactSequence:341-371, 1389-1409`; the replacement-Call map (`:181-213`) duplicates `routeContactSequence:1532-1554` byte-for-byte in its Description.
- **Model drift:**
  - `:50-54` requires `$se_module=="Deals"` + `What_Id`; a Contact-scoped Call is dropped.
  - `:125` `dealOppType = dealRec.get("Stage")` → `Call_Task_Opportunity` from the Deal, not the Contact.
  - `:224` and `:368` scope every scan by `Deals` relation — a Contact's activities are read through the Deal.
  - **There is no `Call_Task_State` value that maps to "neutral / no answer".** The live surface is Open/Won/Lost only, so the five-attempt cadence is reachable only via `Lost + "No Response"` (`:317, 322-326`) — a rep must mark a call **Lost** to get the next attempt.
- **Classification:** **KEEP AND SIMPLIFY**
- **Intended responsibility after correction:** Apply the Call's own result to the Contact, Contact-scoped, with the loss matrix in exactly one place.

---

### zoho-functions/v6/activity/handleQuoteStageChange.deluge (104)

- **Trigger / callers:** **WF020 Quotes**, id `991103000001581243`, module Quotes, `field_update` on `Quote_Stage`, `repeat=false`, **ACTIVE**, last executed 2026-07-29. **WF021 Quotes Create/Edit**, id `991103000001699034`, `create_or_edit`, no criteria, **INACTIVE**, never executed. Both bound to registered function id `991103000001581241`. No in-code callers.
- **Outcome served:** O7, O8
- **Current responsibility:** Thin adapter that decides WHICH Deal(s) `processDeal` must reconcile after a Quote change, and owns the two-Deal reassignment handshake via `Quote_Last_Deal_ID`.
- **Authoritative inputs:** `Quotes.Deal_Name` (new Deal) vs `Quotes.Quote_Last_Deal_ID` (previously reconciled Deal).
- **Reads:** Quotes → `Deal_Name, Quote_Last_Deal_ID`.
- **Writes:** Quotes → `Quote_Last_Deal_ID` (`:61, 82, 96`).
- **Creates / side effects:** `processDeal` (`:53, 55, 79, 92`) with `reconciliationRole = old|new|current`. No records created, no emails, no `invokeurl`.
- **Idempotency mechanism:** The `Quote_Last_Deal_ID` marker itself — it is only advanced when **both** reconciles succeed (`:59-66`), and re-read/verified (`:63-65`); on partial failure the marker is left stale so the next edit retries (`:69-70`).
- **Workflow / config dependencies:** `Quotes.Quote_Last_Deal_ID` must exist and be writable. The WF020→WF021 cutover is **not** behaviour-neutral (CRUD plan §4): WF021 fires on every create/edit, and `processDeal` writes Quotes at five sites, so each becomes a re-entry.
- **Overlaps:** `processDeal` also writes `Quote_Last_Deal_ID` — two owners of the move detector, which is the known amplification risk.
- **Model drift:** The whole two-Deal reassignment handshake **presupposes Quotes moving between per-Product Deals.** Under one Account → one Deal, a Quote never changes Deal and `:50-86` is dead weight. `:53/:55/:79/:92` call `.toMap()` directly on the `processDeal` return with no null guard.
- **Classification:** **KEEP AND SIMPLIFY** (collapse to the `no move` path once the Deal model collapses)
- **Intended responsibility after correction:** On any Quote change, reconcile the Account's single Deal. Nothing else.

---

### zoho-functions/v6/activity/handleEmailEvent.deluge (144)

- **Trigger / callers:** **No rule binds it directly** — registered function id `991103000000780517`, `associated: false` (registered, unbound). Invoked only by the five wrappers: `handleEmailReplied:13`, `handleEmailBounced:13`, `handleEmailClicked:13`, `handleEmailNotReplied:14`, `handleEmailOpenedNotReplied:14`.
- **Outcome served:** O5, O6, O11
- **Current responsibility:** Resolves the latest `Email Sent` audit Task for the Contact/Deal and closes it Won (replied) or Lost/No Response (not replied), raises a blocking `Review Reply` or `Data Repair` Task, and escalates to Contact Lost only on an exhausted sequence.
- **Authoritative inputs:** `eventType` from the wrapper; the highest-id `Email Sent` Task for this Contact under this Deal (`:64-87`); `Contacts.Sequence_State == "Complete"` as the exhaustion proof (`:124-129`).
- **Reads:** Deals → `Automation_Suppressed, Contact_Name`; Deals related `Tasks` → `Who_Id, Task_Type, id`; Contacts → `Sequence_State`.
- **Writes:** Tasks → `Task_State, Task_Status, Task_Lost_Reasons` (`:94, :118`).
- **Creates / side effects:** `createAuxTask` `Review Reply` (`:96`) and `Data Repair` (`:103`); `routeContactSequence(..., "contactlost:No Response", "{}")` (`:127`).
- **Idempotency mechanism:** **None on the event itself.** The only protection is `createAuxTask`'s open-Task dedupe (`createAuxTask:305-306`). A repeated `replied` event re-stamps the same audit Task Won and reuses the Review Reply Task; a repeated `not replied` re-routes `contactlost:No Response` (which `routeContactSequence` makes idempotent only via `Lost_Reasons` already being set, `routeContactSequence:1220`).
- **Workflow / config dependencies:** `Deals.Automation_Suppressed` (`:39`) — the only handler in Part 2 that honours it. Picklists `Task_State`, `Task_Status`, `Task_Lost_Reasons` value `"No Response"`.
- **Overlaps:** none — sole owner of email-engagement outcomes.
- **Model drift:**
  - `:33-37` returns unless a Deal id was supplied. Email engagement is a **Contact** fact; scoping it through the Deal is the same What_Id-mandatory drift.
  - `:127` is the only place in Part 2 that can drive `Contact.State = Lost` automatically (via the `contactlost:` branch) — inconsistent with CHANGE 16's "loss is LOCAL at every level" applied in the other three handlers.
  - Header `:9` and the WF009a/b rule descriptions still describe a `Sequence_Status=Paused` model and a `Profile_Completion_Status` write — **both false**; the field write was removed at `:105-108`.
- **Classification:** **KEEP AND SIMPLIFY**
- **Intended responsibility after correction:** Resolve one email audit Task's own result and raise the Contact-scoped follow-up Task; never decide Contact loss.

---

### zoho-functions/v6/activity/handleEmailReplied.deluge (14)

- **Trigger / callers:** **WF009a — Outgoing Email Replied**, id `991103000000790073`, module Emails, `mail_sent_replied`, active, **`last_executed_time: null` — has NEVER fired.** Relational criteria on Deals. Registered function id `991103000000780547`. No in-code callers.
- **Outcome served:** O5, O6
- **Current responsibility:** Hardcodes `eventType="replied"` and delegates to `handleEmailEvent` (`:13`), so the workflow UI never binds an immutable static literal.
- **Authoritative inputs:** none — pure delegation.
- **Reads:** none
- **Writes:** none
- **Creates / side effects:** `automation.handleEmailEvent("0", "replied", relatedDealIdStr, relatedContactIdStr)` (`:13`).
- **Idempotency mechanism:** none (delegated).
- **Workflow / config dependencies:** WF009a's relational scope must supply `Deals - Deal Id` and `Contacts - Contact Id` merge fields. `emailRecordIdStr` is `"0"` because Emails exposes no Id merge field.
- **Overlaps:** structurally identical to the four sibling wrappers.
- **Model drift:** relational criteria scoped to **Deals** — the CRUD plan §3 verdict is UPDATE (re-scope off Deals). Never having fired is UNVERIFIED as to cause (Zoho does not expose `mail_sent_*` relational scopes over the API — CRUD plan U4).
- **Classification:** **KEEP**
- **Intended responsibility after correction:** Unchanged, once WF009a is re-scoped to the Contact.

---

### zoho-functions/v6/activity/handleEmailBounced.deluge (14)

- **Trigger / callers:** **WF009b — Outgoing Email Bounced**, id `991103000000806019`, Emails, `mail_sent_bounced`, active, **never fired**. Registered function id `991103000000780554`. No in-code callers.
- **Outcome served:** O5, O6
- **Current responsibility:** Hardcodes `eventType="bounced"` and delegates (`:13`).
- **Authoritative inputs:** none
- **Reads:** none
- **Writes:** none
- **Creates / side effects:** `automation.handleEmailEvent("0", "bounced", relatedDealIdStr, relatedContactIdStr)` (`:13`).
- **Idempotency mechanism:** none (delegated).
- **Workflow / config dependencies:** as WF009a.
- **Overlaps:** siblings.
- **Model drift:** Deal-scoped relational criteria. The live rule description still promises a `Profile_Completion_Status=Needs Enrichment` write — **that field does not exist and the write was removed** (`handleEmailEvent:105-108`); the rule description is stale.
- **Classification:** **KEEP**
- **Intended responsibility after correction:** Unchanged.

---

### zoho-functions/v6/activity/handleEmailClicked.deluge (14)

- **Trigger / callers:** **WF009e — Outgoing Email Clicked**, id `991103000000799022`, Emails, `mail_sent_clicked`, active, **never fired**. Registered function id `991103000000780574`. No in-code callers.
- **Outcome served:** NONE (log-only passive event — `handleEmailEvent:137-141`)
- **Current responsibility:** Hardcodes `eventType="clicked"` and delegates (`:13`).
- **Authoritative inputs:** none
- **Reads:** none
- **Writes:** none
- **Creates / side effects:** `automation.handleEmailEvent("0", "clicked", ...)` (`:13`). The core then only logs.
- **Idempotency mechanism:** none needed — no state is written.
- **Workflow / config dependencies:** as WF009a.
- **Overlaps:** siblings; and `handleEmailOpenedNotReplied` shares the identical log-only terminus.
- **Model drift:** none beyond the Deal-scoped relational criteria. The entire path is observability with no outcome.
- **Classification:** **KEEP**
- **Intended responsibility after correction:** Unchanged, or retired together with the passive branch if click telemetry is not wanted.

---

### zoho-functions/v6/activity/handleEmailNotReplied.deluge (15)

- **Trigger / callers:** **WF009c — Outgoing Email Not Replied**, id `991103000000789167`, Emails, `mail_sent_notreplied`, **unit 3 days**, active, **never fired**. Registered function id `991103000000780561`. No in-code callers.
- **Outcome served:** O5, O6
- **Current responsibility:** Hardcodes `eventType="not replied"` and delegates (`:14`).
- **Authoritative inputs:** none
- **Reads:** none
- **Writes:** none
- **Creates / side effects:** `automation.handleEmailEvent("0", "not replied", ...)` (`:14`) — the only wrapper whose core path can drive `contactlost:` (`handleEmailEvent:127`).
- **Idempotency mechanism:** none (delegated).
- **Workflow / config dependencies:** the 3-day threshold is UI-only and is **not** coordinated with the cadence's 2-business-day step (`routeContactSequence:503`).
- **Overlaps:** siblings.
- **Model drift:** Deal-scoped relational criteria; and it is the entry point to the only automatic Contact-Lost path in Part 2.
- **Classification:** **KEEP**
- **Intended responsibility after correction:** Unchanged; the Contact-Lost escalation belongs behind an explicit Contact-level decision, not this wrapper's core.

---

### zoho-functions/v6/activity/handleEmailOpenedNotReplied.deluge (15)

- **Trigger / callers:** **WF009d — Outgoing Email Open and Unreplied**, id `991103000000796107`, Emails, `mail_sent_opened_notreplied`, **unit 3 days**, active, **never fired**. Registered function id `991103000000780568`. No in-code callers.
- **Outcome served:** NONE (log-only passive event)
- **Current responsibility:** Hardcodes `eventType="opened but not replied"` and delegates (`:14`).
- **Authoritative inputs:** none
- **Reads:** none
- **Writes:** none
- **Creates / side effects:** `automation.handleEmailEvent("0", "opened but not replied", ...)` (`:14`).
- **Idempotency mechanism:** none needed.
- **Workflow / config dependencies:** as WF009c.
- **Overlaps:** siblings; identical terminus to `handleEmailClicked`.
- **Model drift:** none beyond the Deal-scoped relational criteria.
- **Classification:** **KEEP**
- **Intended responsibility after correction:** Unchanged.

---

### zoho-functions/v6/activity/sendSequencedEmail.deluge (431)

- **Trigger / callers:** **No workflow rule; UNREGISTERED as a workflow function.** Callers: `routeContactSequence:1465` (side cadence/transactional email), `:1483` (opener), `:1561` (`send_email_now`); `sendScheduledEmailFromTask:63`; `sendDemoReminder:97`; `processDeal:2668` (`commercials_signed_confirmation` — the sole dispatch origin).
- **Outcome served:** O4, O5
- **Current responsibility:** Sole email owner — resolves one canonical template key, enforces SendKey idempotency, applies the send-time activation and pipeline gates, calls the Send Mail API, and produces exactly one Completed `Email Sent` audit Task after a confirmed send.
- **Authoritative inputs:** the `(stage, step, kind)` triple → `canonicalKey`; the hardcoded `templateRegistry` (`:72-117`); **`Contacts.Sequence_Activated_At` re-read independently of the caller** (`:216`); `Deals.Deal_Product_Key` → pipeline (`:265-277`); the existing `Email Sent` audit Task carrying `SendKey:`.
- **Reads:** Contacts → `id, Sequence_Activated_At, Sequence_State, Sequence_Type, Email` (native `getRecordById`, then REST GET fallback at `:181-187`); Deals → `id, Owner{email,name,id}, Deal_Product_Key, Stage`; Deals related `Tasks` (or `searchRecords What_Id`) → `id, Status, Task_Type, Description`; Tasks by id (`:364`); `pipelineForProductKey`, `resolveDealPipeline`.
- **Writes:** Tasks → on the scheduled path converts the wake-up Task into the audit record: `Status="Completed", Task_Type="Email Sent", Task_Sequence_Stage, Blocks_Sequence="No", Subject, Description, Task_State="Open", Task_Status="New", Task_Stage, Task_Pipeline, Task_Opportunity` (`:387-403`); on failure appends a retryable note (`:366`).
- **Creates / side effects:** **Send Mail API** `POST https://www.zohoapis.eu/crm/v3/Contacts/<id>/actions/send_mail` (`:326-333`); creates the immediate-path `Email Sent` Task (`:426`); `createAuxTask` (`:124` template missing, `:231` not activated, `:369` send failed); `createManualReview` (`:195` contact unreadable, `:239` no recipient, `:285` pipeline unresolved). Returns `message_id` or `""`.
- **Idempotency mechanism:** **SendKey = `<contactId>|<dealId>|<canonicalKey>`** (`:151`), written into the audit Task Description as `"SendKey: " + sendKey` (`:386`) and checked as `Status=="Completed" && Task_Type=="Email Sent" && Description.contains("SendKey: "+sendKey)`, excluding the Task being converted (`:161-169`). The Warm/Cold variant swaps only `templateId` (`:135-148`), never the key — so exactly one opener per activation regardless of variant.
- **Workflow / config dependencies:** 31 base + 10 variant Zoho template ids hardcoded (`:73-117`) — any template deletion silently becomes `template_missing`. Requires the `zoho_crm` connection. Falls back to `timothy@jurnii.io` as sender when the Deal Owner has no email (`:303`). Explicitly **not** gated by `Contacts.Marketing_Consent` (`:242-248`).
- **Overlaps:** none for sending. The Deal-pipeline defence (`:253-288`) duplicates the standing gate at `routeContactSequence:977-990`.
- **Model drift:**
  - `:29-33` requires a non-zero `dealId`; SendKey embeds it (`:151`), so **the same email to the same Contact under a different Deal is a different key** — Deal-scoped idempotency for a Contact-scoped fact.
  - `:253-288` blocks the send on a Deal-product-derived pipeline. **Violates "Product interest, Quote existence and Deal resolution must NOT determine cadence eligibility."**
  - `:384` `emOpp = emDeal.get("Stage")` → `Task_Opportunity` from the Deal, not the Contact.
  - `:60-67` the **opener key and the cadence step-1 key are identical** (`<slug>:1:initial`), and the **postcall key and the cadence step-5 key are identical** (`<slug>:5:final`) — see the cadence section for the two consequences.
- **Classification:** **KEEP AND SIMPLIFY**
- **Intended responsibility after correction:** Sole email owner, Contact-scoped: SendKey without the Deal, no pipeline gate, distinct keys for opener vs cadence-1 and postcall vs cadence-5.

---

### zoho-functions/v6/activity/sendDemoReminder.deluge (99)

- **Trigger / callers:** **WF010c Date Router Demo Reminder**, id `991103000000802001`, module Deals, `date_or_datetime` on `Demo_Reminder_Send_At`, **15 minutes before**, `recur_cycle=once`, active, **`last_executed_time: null` — never fired.** Registered function id `991103000001499062`. No in-code callers.
- **Outcome served:** O4
- **Current responsibility:** On the Deal's reminder datetime, verifies an upcoming meeting still exists and the Primary Contact has not passed the demo phase, then sends the `demo-confirmation:0:reminder` email.
- **Authoritative inputs:** the **Event's** `Start_DateTime` (earliest upcoming meeting on the Deal, `:52-64`) — deliberately not a Deal mirror; `Deals.Contact_Name` as recipient; `Contacts.State` + `Stage` rank.
- **Reads:** Deals → `Automation_Suppressed, Contact_Name`; Deals related `Events` → `Start_DateTime`; Contacts → `State, Stage`.
- **Writes:** none.
- **Creates / side effects:** `sendSequencedEmail(primaryId, dealId, "Demo Confirmation", 0, "demo_reminder", "", "")` (`:97`).
- **Idempotency mechanism:** **None of its own.** Relies entirely on `WF010c recur_cycle=once` plus the downstream SendKey `<contact>|<deal>|demo-confirmation:0:reminder`. A second booking on the same Deal therefore **cannot** produce a second reminder — the SendKey is already burned.
- **Workflow / config dependencies:** `Deals.Demo_Reminder_Send_At` (written only by `handleMeetingEvent:439`) and `Deals.Automation_Suppressed`. Requires template `991103000001487004`.
- **Overlaps:** stage ranks duplicated (`:89`); recipient resolution duplicates `sendCommercialFollowUp:72-79`.
- **Model drift:**
  - **Header `:8-10` is FALSE:** it claims `handleMeetingEvent` writes `Demo_Start_DateTime` onto the Deal and "clears `Demo_Reminder_Send_At` when the meeting is Cancelled". `Demo_Start_DateTime` does not exist and was deliberately removed (`handleMeetingEvent:428-435`), and **nothing anywhere writes a clear of `Demo_Reminder_Send_At`** (repo-wide grep: the only writer is `handleMeetingEvent:439`). The comment at `:41-50` correctly documents the first half; `:10` was never corrected.
  - `:73-74` sends to `Deals.Contact_Name`, not the meeting's `Who_Id` — CRUD plan §1.6 "misfires under consolidation".
  - The reminder itself is a Contact/Meeting fact hosted on a Deal date field purely because Zoho date-based rules cannot bind to Events.
- **Classification:** **REWIRE** (rebase onto Events; interim DEACTIVATE per CRUD plan)
- **Intended responsibility after correction:** Fire from the Meeting's own `Reminder_Send_At` and send to the meeting's `Who_Id`.

---

### zoho-functions/v6/activity/sendCommercialFollowUp.deluge (87)

- **Trigger / callers:** **WF010d Date Router Comm Follow-Up**, id `991103000000790038`, module Deals, `date_or_datetime` on `Next_Comm_Follow_Up_Date`, 15 min, active, **never fired**. Registered function id `991103000001499072`. No in-code callers.
- **Outcome served:** O4 (nominally) — **effectively NONE: the function is unreachable.**
- **Current responsibility:** Re-engages the Commercial Agreement cadence for the Deal's Primary Contact when a deferred follow-up date is reached.
- **Authoritative inputs:** `Deals.Opportunity_Stage == "Commercial Agreement"` + `Opportunity_State == "Open"`; `Contacts.State == "Open"` + `Sequence_State != "Stopped"`; at least one Quote in `{Delivered, Negotiation, On Hold}`.
- **Reads:** Deals → `Automation_Suppressed, Opportunity_Stage, Opportunity_State, Contact_Name`; Contacts → `State, Sequence_State`; Deals related `Quotes` → `Quote_Stage`.
- **Writes:** none.
- **Creates / side effects:** `routeContactSequence(primaryId, dealId, "commercial:followup_due", "{}")` (`:85`).
- **Idempotency mechanism:** **None.** Relies on `recur_cycle=once` and on `routeContactSequence`'s create_call dedupe (`routeContactSequence:1508`).
- **Workflow / config dependencies:** `Deals.Next_Comm_Follow_Up_Date` — **repo-wide grep confirms NOTHING writes this field.** WF010d can therefore never fire. This is the only rule blocking a field retirement org-wide (field contract line 40).
- **Overlaps:** recipient/guard logic duplicates `sendDemoReminder:72-85`; the `commercial:followup_due` branch it targets (`routeContactSequence:683-694`) is otherwise unreachable.
- **Model drift:** Deal-derived cadence re-engagement — `commercial:followup_due` restarts a **Call** cadence off a Deal stage and a Quote state, precisely what the settled ruling forbids ("Quote existence... must NOT determine cadence eligibility"). `:129` gates on `Deals.Opportunity_Stage`; opportunity authority is on the Contact.
- **Classification:** **RETIRE** (settled; order: WF010d rule → deregister function → delete `Next_Comm_Follow_Up_Date`)
- **Intended responsibility after correction:** None — deleted.

---

### zoho-functions/v6/activity/sendScheduledEmailFromTask.deluge (71)

- **Trigger / callers:** **WFC-SchedEmail**, id `991103000001499121`, module Tasks, `date_or_datetime` on `Due_Date`, `unit 0 days`, `execute_at 09:00:00+01:00`, `recur_cycle=once`, active, **never fired**. Criteria bind `Due_Date`, `Task_Sequence_Managed`, `Status`, `Task_Type`. Registered function id `991103000001499119`. No in-code callers.
- **Outcome served:** O4, O5
- **Current responsibility:** Wakes a `ScheduledSend|` Task on its Due_Date, parses the payload, delegates everything to `sendSequencedEmail` (which turns THIS Task into the audit record), and on a successful `postcall` send marks the Contact sequence Complete.
- **Authoritative inputs:** the `ScheduledSend|stage=<>|step=<>|kind=<>` line in `Tasks.Description` (`:54-60`); `Tasks.Who_Id` / `What_Id`; `Status` + `Task_Status` as the stop-gate.
- **Reads:** Tasks → `Description, Status, Task_Status, Who_Id, What_Id`.
- **Writes:** Contacts → `Sequence_State = "Complete"` (`:68`, only when `msgId != "" && kind == "postcall"`).
- **Creates / side effects:** `sendSequencedEmail(contactId, dealId, stage, step, kind, taskId, "")` (`:63`).
- **Idempotency mechanism:** Stop-gate: refuses any Task with `Status in {Completed, Cancelled, Deferred}` **or** `Task_Status == "Closed"` (`:32-36`) — this is exactly what `routeContactSequence:1067` and `handleTaskCompletion:507` write when superseding. Send idempotency is the downstream SendKey.
- **Workflow / config dependencies:** WFC-SchedEmail's criteria include `Task_Sequence_Managed` as a **boolean** while WF006 compares `Sequence_Managed == "Yes"` as a string — the recorded fragility. The payload format is a hard contract with `routeContactSequence:1569`.
- **Overlaps:** none.
- **Model drift:**
  - `:44-49` requires both `Who_Id` and `What_Id`.
  - `:68` writes `Sequence_State="Complete"` from a send wrapper — the router is meant to own every `Sequence_*` write (`routeContactSequence:1119-1121`). Second writer.
  - **This path is provably dead for its only live payload:** the postcall email's canonical key equals the step-5 cadence key, which `routeContactSequence` already sent in the same run — see the cadence section, finding C-3.
- **Classification:** **KEEP AND SIMPLIFY**
- **Intended responsibility after correction:** Parse and delegate only; the Complete write moves back to the router.

---

### zoho-functions/v6/activity/createAuxTask.deluge (141)

- **Trigger / callers:** **No workflow rule; UNREGISTERED as a workflow function.** ~52 in-code call sites: `routeContactSequence:202,309,314,329,987,1283,1288,1298`; `handleTaskCompletion:239,317,323,329,408,695,715,724,728,736,816,893,933,950,975,1185,1284,1298,1439,1444`; `handleCallOutcome:308,481,497,502,512`; `handleMeetingEvent:187,199,220,228,233,237,241,291,300,331,336,340,348`; `handleEmailEvent:96,103`; `sendSequencedEmail:124,231,369`; `createManualReview:88`; `processDeal` ×24 (`:706,713,828,841,935,962,1050,1081,1133,1174,1273,1376,1384,1412,1580,1621,1771,2270,2334,2346,2422,2459,2713,2743`).
- **Outcome served:** O11
- **Current responsibility:** Creates or reuses one open blocking Task of a given `Task_Type` for a Contact/Deal pair, appending distinct issue codes to an existing Task rather than duplicating, and stamps a type-appropriate rep instruction footer.
- **Authoritative inputs:** the `(Who_Id, Task_Type, Status != "Completed")` triple as the reuse key (`:47-49`); the leading `[issue_code]` token of the note as the append discriminator (`:59-62`).
- **Reads:** Deals related `Tasks` (fallback `searchRecords "(What_Id:equals:<deal>)"`) → `Who_Id, Task_Type, Status, Description, id`; Deals → `Owner, Stage, Opportunity_Stage`; `resolveDealPipeline`.
- **Writes:** Tasks → `Description` and, on a genuinely new issue code against a parked Task, `Status = "In Progress"` (`:76-81`).
- **Creates / side effects:** Tasks (`:137`) with `Subject, Status="In Progress", What_Id, $se_module="Deals", Who_Id, Task_Sequence_Managed=true, Task_Type, Blocks_Sequence="Yes", Description(+footer), Task_Status="Working", Task_State="Open", Owner, Task_Pipeline, Task_Opportunity, Task_Stage`. Returns the Task id or `""`.
- **Idempotency mechanism:** Reuse on `Who_Id + Task_Type + Status != "Completed"` — deliberately including `Deferred` (`:48`, with the live 2026-08-02 proof in the comment at `:38-47`). Append-issue dedupe on `Description.contains(issueCode)` else `contains(note)` (`:63-65`).
- **Workflow / config dependencies:** **Writes `Tasks.Blocks_Sequence` (`:98`)** — per the phantom-write memory, deleting that field before this write is removed would stop `createAuxTask`/`createManualReview` creating any Task at all. `Task_Type` values must pre-exist in the picklist. Created without `noTrigger`, so **WF008 re-fires on every review Task created** (returns at `handleTaskCompletion:685` since `Task_State="Open"`).
- **Overlaps:** `createManualReview` wraps it; the Contact-only branch of `createManualReview:451-484` re-implements the create.
- **Model drift:**
  - `:18` `if(contactId == 0 || dealId == 0 ... ) return ""` — **a Deal is mandatory.** Every Contact-scoped review therefore either vanishes or is forced onto a Deal. Directly violates the settled ruling and is the reason `createManualReview` needs its own Deal-less path.
  - `:131-132` `auxOppType = deal.get("Stage")` and `auxStage = deal.get("Opportunity_Stage")` — **both `Task_Opportunity` and `Task_Stage` are stamped from the Deal**, where the authority is the Contact.
  - `:26-29` scopes the dedupe scan by the Deal, so the same issue against the same Contact on a different Deal duplicates.
- **Classification:** **KEEP AND SIMPLIFY**
- **Intended responsibility after correction:** Create/reuse one blocking Task per (Contact, Task_Type) with the Deal as optional `What_Id`, and stamp Contact-derived `Task_Stage`/`Task_Opportunity`.

---

### zoho-functions/v6/activity/createManualReview.deluge (95)

- **Trigger / callers:** **No workflow rule; UNREGISTERED as a workflow function.** Callers: `_util_applyQuoteLifecycle:226,230`; `handleMeetingEvent:106,521,554,560`; `handleTaskCompletion:649`; `sendSequencedEmail:195,239,285`; `processContact:253,284,356,466,474`; `processDeal:113,1932,1949,1966`; `processLead:613,631,689`.
- **Outcome served:** O11
- **Current responsibility:** Resolves a canonical `[code]` via `resolveManualReviewCode`, prepends it to the note so `createAuxTask`'s append-dedupe makes repeat fires idempotent, and provides a Contact-only fallback when no Deal exists.
- **Authoritative inputs:** the `codeKey` → canonical `[code]` token from `_util_resolveManualReviewCode`; `Deals.Deal_Primary_Contact` then `Contact_Name` as the contact fallback (`:37-46`).
- **Reads:** Deals → `Deal_Primary_Contact, Contact_Name` (`:36`); Contacts related `Tasks` → `Task_Type, Status, Description` (`:55`); `resolveManualReviewCode`.
- **Writes:** none directly (all writes go through `createAuxTask`).
- **Creates / side effects:** delegates to `createAuxTask(cId, dId, "Manual Review", note)` (`:88`); **OR** creates a Contact-only Task directly (`:82`) with `Who_Id`, `$se_module="Contacts"`, **no `What_Id`**, `Task_Type="Manual Review"`, `Blocks_Sequence="Yes"`, `Task_Status="Working"`, `Task_State="Open"`. Logs `review_not_created` when both ids are unusable (`:92`).
- **Idempotency mechanism:** The leading `[code]` token — via `createAuxTask`'s append-issue dedupe on the Deal path, and via a direct scan of the Contact's open `Manual Review` Tasks for `Description.contains(code)` on the Contact-only path (`:55-68`). Note the Contact-only scan accepts only `Not Started` / `In Progress` (`:63`), **not** `Deferred` — narrower than `createAuxTask:48`, so a deferred Contact-only review duplicates.
- **Workflow / config dependencies:** `_util_resolveManualReviewCode` registry (fail-open); `Task_Type="Manual Review"` picklist value; `Tasks.Blocks_Sequence` (`:73`).
- **Overlaps:** `:51-84` duplicates `createAuxTask`'s create path with a different dedupe predicate and a different footer — two Task creators for the same concept.
- **Model drift:** The Contact-only branch (`:51-84`) is the **only** place in Part 2 that already implements the settled ruling (Who_Id required, What_Id absent) — and it exists solely as a workaround for `createAuxTask:18`. Its own comment (`:74-77`) concedes the consequence: `handleTaskCompletion` returns at its no-related-Deal guard, so **completing a Contact-only review drives nothing.** That is the settled ruling's violation stated in-code.
- **Classification:** **MERGE** (fold into `createAuxTask` once `createAuxTask` accepts a blank Deal)
- **Intended responsibility after correction:** Resolve the canonical code and delegate; one Task creator, one dedupe predicate.

---
---

# CADENCE STATE MACHINE — EXACT ACCOUNT (`routeContactSequence.deluge`)

## A. `activate:call` vs `activate:email`, traced from the commit

**The commit** (`handleTaskCompletion:556-668`): reached only when `lastKind == "absent"` (no `ActivationCommand|` marker, `Task_Status=="New"`, `Status=="Not Started"`, `:296-300`) **and** `taskState == "Won"` **and** `curType != ""` (`:343-347`). Then:
1. `:569-575` if `Contact.State == "Lost"` → record the preference, close the Task, **route nothing**.
2. `:579-584` if type is Email/Call **and** `Contact.Sequence_State == "Running"` → close the Task, **route nothing** (Manual is exempt).
3. `:592-606` rank-guarded Stage adoption: `Task_Sequence_Stage` overwrites `Contact.Stage` **only if strictly higher rank**.
4. `:609-611` `actTrig = "activate:email" | "activate:call" | "activate:manual"`.
5. `:620-660` **Email route only**: reads the Activation Task's related Notes, takes the latest by `Created_Time`, passes it to `resolveOpenerVariant`; `"conflict"` reopens the Task and blocks activation (`:646-652`); `warm`/`cold` becomes `{"opener_variant":"..."}` in `actCtx`. Call and Manual pass `"{}"`.
6. `:662` `routeContactSequence(contactId, dealId, actTrig, actCtx)`.

**Inside the router** (`:458-483`):
- `activate:manual` → `Sequence_Type="Manual"`, `Sequence_State="Stopped"`, `Sequence_Stage="None"`, `Step="None"`, `forceWorking=true`, `resolved=true`. **No Call, no email, no Task.** `Contact.Status` still becomes `Working` (`:1222-1232`).
- `activate:email` → `sType="Email"`; `activate:call` → `sType="Call"`. Both then `nextSeqType=sType; targetStage=st; doEntry=true; isActivation=true`.

**Shared entry block** (`:810-859`), `targetStage = the Contact's CURRENT Stage`:

| targetStage | Sequence_Stage | Step | action |
|---|---|---|---|
| `Demo Confirmation` | `Meeting` | `None` | `await_meeting` — **nothing created** |
| `Proposal Preparation`, `Onboarding` (`taskStages`, `:391`) | `Task` | `1` | `create_task` |
| `Marketing Consent`, `Demo Booking`, `Demo Hosted`, `Commercial Agreement`, `Renewal` (`cadenceStages`, `:390`) | `Call` | `1` | `sType=="Email"` → `send_opener_then_call` (+`emailKind="opener"`, `emailStep=1`); else → `create_call` |
| anything else | `None` | `None` | Stopped, no action |

**Dispatch** (`:1481-1558`):
- `activate:call` → `create_call`: one Call, `Subject = "<Stage> Call 1"`, `Sequence_Attempt=1`, `dueOffsetDays == 0` so `Call_Start_Time = zoho.currenttime` (`:1530`) — **due immediately**. No email.
- `activate:email` → `sendSequencedEmail(contact, deal, nextStage, 1, "opener", "", openerVariant)` (`:1483`), then `action = "create_call"; nextStep = "1"; dueOffsetDays = 0` (`:1484-1486`) → falls straight into the **same** create_call block.

**So the two routes differ by exactly one artefact: the opener email.** Both produce `<Stage> Call 1` due now, at `Sequence_Stage=Call, Step=1`. Per CHANGE 10 (`:834-849`) this applies at **every** cadence-Stage entry, not just the first.

> ⚠ **Today this is entirely theoretical.** With `Sequence_Activated_At` blank on all 647 Contacts and `Task_Sequence_Type` null on every Activation Task, no activation has ever committed. Even if one did, the Change-20 pipeline gate (`:977-990`) and the send-time gate (`sendSequencedEmail:217`) sit in front of both routes.

## B. CONFIRM — the Email route ALSO creates Call 1 after the opener

**CONFIRMED.** `routeContactSequence:1481-1487`:
```
if(action == "send_opener_then_call")
{
    automation.sendSequencedEmail(contactId.toString(), dealId.toString(), nextStage, 1, "opener", "", openerVariant);
    action = "create_call";
    nextStep = "1";
    dueOffsetDays = 0;
}
```
It is an unconditional fall-through, with **zero delay** (`dueOffsetDays = 0` → `Call_Start_Time = now`, `:1530`). There is no Email-only cadence in this codebase.

## C. CONFIRM — FIVE numbered Call attempts per managed Stage (with three defects)

**CONFIRMED.** The exact attempt-numbering code is `routeContactSequence:494-520`:
```
else if(trigLc == "call:neutral" || trigLc == "call:noanswer")
{
    if(stepNum < 5)                                    // :496
    {
        nextSeqState = "Running";
        nextSeqStage = "Call";
        nextStep = (stepNum + 1).toString();           // :500  <-- the numbering
        action = "create_call";
        dueOffsetDays = 2;                             // :503
        sideEmailKind = "cadence";
        sideEmailStep = stepNum;                       // :504
        reason = "call_neutral_next_call";
    }
    else                                               // stepNum >= 5
    {
        nextSeqState = "Running";
        nextSeqStage = "Email";
        nextStep = "1";
        action = "schedule_email";
        emailKind = "postcall";
        dueOffsetDays = 2;
        sideEmailKind = "cadence";
        sideEmailStep = 5;
        reason = "call_neutral_postcall";
    }
    resolved = true;
}
```
Seed is `nextStep = "1"` at `:833`. Attempt is stamped as `Sequence_Attempt` (`:1539`) and in `Subject = nextStage + " Call " + callStep` (`:1533`).

**The Stage list:** `cadenceStages = {"Marketing Consent", "Demo Booking", "Demo Hosted", "Commercial Agreement", "Renewal"}` (`:390`) — and only these five have 5-step template families in `sendSequencedEmail:73-97` (`marketing-consent`, `demo-booking`, `demo-hosted`, `commercial-agreement`, `renewal`). `Demo Confirmation`, `Proposal Preparation` and `Onboarding` have `:0:` single-shot templates only.

Three defects around this:

**C-1 — there is no "neutral" rep surface.** `Calls.Call_Task_State` is `Open | Won | Lost` only. `call:neutral` is emitted from exactly two places, both on a **Lost** Call: `handleCallOutcome:324` (loss action `continue_cadence`, i.e. reason `No Response` with the sequence not Complete) and `:490` (the not-provably-exhausted fallback). **A rep must mark a call Lost to get the next attempt.** `call:noanswer` is never emitted by anything.

**C-2 — the Email route silently loses one cadence email.** `sendSequencedEmail:60` maps `kind=="opener"` → `stageSlug + ":1:initial"`, and `:62-67` maps `kind=="cadence", step==1` → `stageSlug + ":1:initial"` — **the same canonical key**, therefore the same SendKey (`:151`). The opener burns it at activation, so the Call-1-neutral side email idempotency-skips at `:161-169`. An Email-led Contact receives 4 cadence emails where a Call-led Contact receives 5.

**C-3 — the post-call follow-up email can never send, so the sequence can never Complete.** In the `stepNum >= 5` branch the router does both, in this order inside one dispatch block:
- `:1458-1469` sends the side email `kind="cadence", step=5` → `sendSequencedEmail:61/66` → key `<slug>:5:final`, audit Task written with `SendKey: <c>|<d>|<slug>:5:final`.
- `:1563-1611` creates the Scheduled Send Task with payload `ScheduledSend|stage=<slug-stage>|step=0|kind=postcall` (`emailStep` is never assigned in this branch — it stays `0` from `:432`).

Two business days later `sendScheduledEmailFromTask:63` calls `sendSequencedEmail(..., kind="postcall", ...)`, which at `:61` resolves `<slug>:5:final` — **the identical SendKey already burned** — and returns `""` at `:166`. Consequences, all provable from the code:
- the wake-up Task is never converted to an audit (that only happens after a confirmed send, `:387-403`), so it stays `Not Started` forever;
- `sendScheduledEmailFromTask:67` is `if(msgId != "" && kind == "postcall")`, so **`Sequence_State` never becomes `"Complete"`** by this path;
- `hasNextStep` is derived as `Sequence_State == "Complete"` in all three handlers (`handleCallOutcome:316`, `handleTaskCompletion:702`, `handleMeetingEvent:131`), so it is permanently `"true"`, so `resolveActivityLoss` never returns `contact_lost` for `No Response` (`_util_resolveActivityLoss:65-81`), so `handleEmailEvent:124-129` never escalates either.

**C-4 — the target cadence has 7 post-call emails; the code has 1.** `docs/stage_day_sequence_matrix_call_first_30_days.csv` specifies `Post-Call Email Chain 1..7` at +2bd then +3 calendar days each, with `Sequence Status = Completed` after Chain 7. The code implements a single `<slug>:5:final` and no chain, and no `Chain N` template exists in the registry.

## D. Every SendKey / idempotency key format

| # | Key | Format | Where written | Where checked |
|---|---|---|---|---|
| 1 | **SendKey** | `<contactId>\|<dealId>\|<canonicalKey>` | `sendSequencedEmail:151`; persisted as `"SendKey: " + sendKey` in the audit Task Description (`:386`) | `:163` — `Status=="Completed" && Task_Type=="Email Sent" && Description.contains("SendKey: "+sendKey)`, excluding the Task being converted |
| 2 | canonicalKey — cadence | `<stage-slug>:<1..5>:<initial\|follow-up\|final>` (step 1→`initial`, 5→`final`, else `follow-up`) | `sendSequencedEmail:62-67` | via SendKey |
| 3 | canonicalKey — opener | `<stage-slug>:1:initial` (**collides with #2 step 1**) | `:60` | via SendKey |
| 4 | canonicalKey — postcall | `<stage-slug>:5:final` (**collides with #2 step 5**) | `:61` | via SendKey |
| 5 | canonicalKey — fixed six | `demo-confirmation:0:confirmation`, `demo-confirmation:0:reminder`, `demo-confirmation:0:no-show`, `proposal-preparation:0:post-demo`, `commercial-agreement:0:proposal-sent`, `onboarding:0:signed-confirmation` | `:51-56` | via SendKey |
| 6 | Warm/Cold variant | `<canonicalKey>:warm` \| `:cold` — **template lookup only, NOT part of the SendKey** | `:137` | n/a by design (`:128-133`) |
| 7 | **ScheduledSend payload** | `ScheduledSend\|stage=<nextStage>\|step=<emailStep>\|kind=<emailKind>` | `routeContactSequence:1569`; Description written at `:1605` | `:1589` — same Who_Id, `Status` not Completed/Cancelled, `Description.contains(payload)`; parsed at `sendScheduledEmailFromTask:54-60` |
| 8 | **Call dedupe** | `Who_Id + Sequence_Managed=="Yes" + Sequence_Stage + Sequence_Attempt + Call_Task_State=="Open" + Call_Task_Status=="Working"` | — | `routeContactSequence:1508`; reschedule variant `handleCallOutcome:236` (adds `Next_Follow_Up_Date == ""`) |
| 9 | **Stage-Task dedupe** | `Who_Id + Task_Type + Task_Sequence_Stage + Status in {Not Started, In Progress}` | — | `routeContactSequence:1631` |
| 10 | **Aux/review dedupe** | `Who_Id + Task_Type + Status != "Completed"`, then leading `[issue_code]` append | — | `createAuxTask:47-49, 59-65`; Contact-only variant `createManualReview:63` |
| 11 | **ActivationCommand marker** | `ActivationCommand\|state=<Open\|Won\|Lost>\|type=<Email\|Call\|Manual\|->` | `handleTaskCompletion:416-417`, rebuilt `:418-427` | `:252-288`; also read by `routeContactSequence:944` for Change-21 establishment |
| 12 | **Quote applied-activity key** | `Tasks:<taskId>` (Calls/Events equivalents in `processDeal`) | `handleTaskCompletion:1006, 1204, 1122` | `matchDraftQuotes(...)` `:1086, :1429` |

## E. Timing rules — every `calculateBusinessDate` call and every offset

| Step | Offset | Code | Resulting datetime |
|---|---|---|---|
| Activation / any cadence-Stage entry → Call 1 | **0** | `dueOffsetDays = 0` set at `:816`; `send_opener_then_call` re-asserts `0` at `:1486` | `Call_Start_Time = zoho.currenttime` (`:1530`) — **immediate** |
| Opener email | **0** | `:1483` | sent inline, before Call 1 |
| Call *n* → Call *n+1* (n = 1..4) | **+2 business days** | `dueOffsetDays = 2` (`:503`) → `calculateBusinessDate(zoho.currenttime, 2, "business_days")` (`:1525`) | `yyyy-MM-dd'T'HH:mm:ssXXX` from a `"<date> 00:00:00"` string (`:1526`) — **midnight**, because `_util_calculateBusinessDate:84` emits `00:00:00` for `business_days` |
| Cadence side email at Call *n* | **0** (same run as the Call it accompanies) | `:1465` | immediate |
| Call 5 → post-call scheduled email | **+2 business days** | `dueOffsetDays = 2` (`:513`) → `calculateBusinessDate(...)` (`:1573`), truncated to `yyyy-MM-dd` (`:1574`) | Task `Due_Date`; WFC-SchedEmail fires at **09:00 +01:00** |
| Demo reminder | **−1 business day, snapped to 09:00** | `handleMeetingEvent:386` — `calculateBusinessDate(startDateTime, -1, "business_days_minus_AM")`; `_util_calculateBusinessDate:78-81` writes `09:00:00` | written to `Events.Reminder_Send_At` (`:400`) and `Deals.Demo_Reminder_Send_At` (`:439`) **only if still in the future** (`:388-396`); WF010c then fires **15 minutes before** |
| Call reschedule | rep-chosen | `handleCallOutcome:190` — `Call_Start_Time = Next_Follow_Up_Date` verbatim | no business-day maths |
| Email "not replied" / "opened not replied" | **3 days** | WF009c `991103000000789167`, WF009d `991103000000796107` — rule config only | not coordinated with the 2-business-day cadence step |

**There are no other timing rules.** Notably: no delay between opener and Call 1; no per-Stage variation; no calendar-day arm anywhere in the cadence (`"calendar_days"` mode exists at `_util_calculateBusinessDate:36-41` but **no caller uses it**, while the target matrix specifies +3 calendar days for the post-call chain).

## F. Stage entry — new, resumed, or superseded?

**A new cadence is STARTED. Never resumed.** The shared entry block (`:810-859`) unconditionally overwrites `nextSeqState = "Running"`, `nextSeqStage`, and `nextStep = "1"` for the target Stage's class, discarding the previous Stage's step counter.

`isNewStageEntry = (nextStage != st)` is computed once at `:894`, **after** the state machine and entry block have both resolved, so it covers `doEntry` branches and the `resolved=true` branches that set `nextStage` directly (`meeting:created`, `meeting:attended`) alike. A continuation callback within the current Stage (`call:neutral` creating Call n+1, `commercial:followup_due`, `meeting:noshow`, `resume` recreating a Call) leaves `nextStage == st`, so `isNewStageEntry` is false and the running cadence is untouched.

`resume` is the one non-restarting entry (`:776-798`):
- `Sequence_State in {Not Activated, Stopped, Complete}` → `action="none"`, `reason="resume_no_active_sequence"`;
- `Sequence_Stage=="Call" && step >= 1` → `action="create_call"` at the **same** step (a re-assert, made safe by the Call dedupe at `:1508`);
- otherwise → `doEntry` with `targetStage = current Stage`, i.e. a **restart of that Stage's cadence at step 1**.

Same-Stage restart is explicitly forbidden elsewhere: CHANGE 11 (`:601-618`) rewrote `demo:followup` to stop replaying the Demo Hosted cadence, with the comment *"a completed or stopped same-Stage cadence cannot restart"*. The `resume` fall-through at `:795` still can.

Entry is additionally gated at three points, all evaluated **before** dispatch but **after** the authoritative Contact writes:
1. `dispatchSuppressed = (sState == "Stopped")` (`:962`) — the **current**, not the computed, state;
2. `!activationEstablished && !isActivationTrigger` → suppressed + `Sequence_State` clamped to `"Not Activated"` (`:963-967`, `:1172-1181`) — **the gate that is live-blocking every Contact today**;
3. `gatePipeline != "B2B"` (`:977-990`) and `sType=="Manual" && isNewStageEntry` (`:999-1003`).

Per CHANGE 8b (`:1428-1441`) suppression is **per artefact class**: `cadenceDispatchOk` gates cadence Calls/emails; `nonCadenceDispatchOk` (only `!suppressOuter`) lets `create_task` (Draft Commercials / Onboarding Setup) and transactional side emails (`demo_confirmation`, `demo_post_demo`, `commercials_terms`) through even for a Stopped/Manual/Partnership Contact.

## G. How a supersede is performed, and exactly what it writes

Triggered by `doSupersede == "true"`, set in: `call:positive` (`:490`), `task:positive` (`:572`), `demo:qualified` (`:597`), `demo:not_qualified` (`:624`), `demo:noshow` (`:633`), `demo:cancelled` (`:639`), `commercial:sent` (`:655`), `commercial:signed` (`:661`), `commercial:rejected` (`:676`), `meeting:created` (`:709`), `meeting:attended` (`:723`), `meeting:cancelled` (`:733`), `contactlost:*` (`:768`), `call:negative|donotcontact` (`:540`). **Not** set by `activate:*` or `resume`.

Executed at `:1016-1076`, **before** the Contact field write and **before** `processDeal`, and **outside** every dispatch gate (a Stopped or never-activated Contact still gets superseded):

**Calls** (`:1018-1038`) — read Deal-related Calls, fall back to `searchRecords "(What_Id:equals:<deal>)"`. For each where `Who_Id == contactId && Sequence_Managed == "Yes" && Call_Task_State == "Open" && Call_Task_Status == "Working"`:
```
zoho.crm.updateRecord("Calls", id, {"Outgoing_Call_Status":"Cancelled", "Call_Task_Status":"Closed"}, noTrigger);   // :1035
```
`Call_Task_State` is deliberately left `Open` — the Call was neither Won nor Lost, and rewriting it would falsify history (`:1030-1032`).

**Tasks** (`:1039-1075`) — same read pattern. For each where `Who_Id == contactId && Task_Sequence_Managed == true && Task_Type != "Email Sent" && Status not in {Completed, Cancelled, Deferred}`:
- if `Description.contains("ScheduledSend|")`:
```
{"Status":"Deferred", "Task_Status":"Closed", "Description": tDesc + "\nSuperseded by Stage change."}   // :1067
```
  Both `Deferred` and `Task_Status="Closed"` are written because **`Tasks.Status` has no live `Cancelled` value** (live set: Completed, Deferred, In Progress, Not Started, Waiting on someone else) — the previous `{"Status":"Cancelled"}` was discarded and superseded wake-ups still fired (`:1058-1066`). Either value alone satisfies the stop-gate at `sendScheduledEmailFromTask:32`.
- else:
```
{"Status":"Deferred"}   // :1071
```
  **Note: no `Task_Status` write on this branch.** A deferred blocking Task therefore still matches `createAuxTask`'s reuse predicate (`Status != "Completed"`, `createAuxTask:48`) and will be **reopened to `In Progress`** on the next distinct issue code (`createAuxTask:76-81`).

**Supersede touches nothing else** — no Events, no Quotes, no Contact fields, no Deal fields. The `\n` at `:1067` is a literal backslash-n given this org's Deluge string behaviour documented at `:49-52` (which is why every rep-facing string elsewhere uses `hextoText("0A")`).

The near-identical sibling implementation lives at `handleTaskCompletion:470-509` (activation disable), scoped `Who_Id`-first rather than Deal-first, and additionally narrows Tasks to `Task_Type == "Scheduled Send"`.

## H. Dead tokens — 17 of ~31 handled triggers are unreachable

Repo-wide grep for each literal outside `routeContactSequence.deluge`: every one of the following appears **only** in `.agents/context/zoho-backups/20260615T121415Z/_util_resolveContactAction.deluge` (a dated backup with no live counterpart) or nowhere at all.

| Dead token | Handler branch |
|---|---|
| `activate:stop` | `:460` |
| `call:noanswer` | `:494` |
| `call:deferred` | `:521` |
| `call:alreadyhandled` | `:529` |
| `call:negative`, `call:donotcontact` | `:535` — the only branches that set `Contact.State = Lost` from a Call |
| `call:manualonly` | `:550` |
| `call:baddata` / `call:notrelevant` (the `else`) | `:559` |
| `demo:not_qualified` | `:619` |
| `demo:noshow` | `:631` — `handleMeetingEvent:322-323` explicitly reserves it, then never emits it |
| `demo:cancelled` | `:637` |
| `demo:rescheduled` (the `else`) | `:642` |
| `commercial:rejected` | `:671` |
| `meeting:booked` | `:699` (alias of the live `meeting:created`) |
| `meeting:attended` | `:714` — the **only** path to Demo Hosted via an attended Meeting |
| `meeting:cancelled` | `:731` |
| `meeting:noshow` (the `else`) | `:736` |
| `email:postcall_due` | `:749` — the only `send_email_now` producer |

**Live tokens (14):** `activate:email`, `activate:call`, `activate:manual`, `call:positive`, `call:neutral`, `task:positive`, `demo:qualified`, `demo:followup`, `meeting:created`, `contactlost:<reason>`, `commercial:sent`, `commercial:signed`, `commercial:followup_due` (unreachable in practice — WF010d's date field has no writer), `resume`.

Consequence: `Demo Hosted` is reachable only through `progression.get("Demo Confirmation")` on a `call:positive`/`task:positive` (`:397`), never through an attended Meeting; and no live path exists to mark a Contact Lost from a Call or a Demo.

---

## Part 3 — Helpers (17 files)

All 17 helpers exist; no extra `_util_*` file is present in `v6/activity/` that is missing from the list. None of the 18 live workflow rules invokes a `_util_*` function directly — every helper is a Deluge-internal callee only, so "Trigger" is "none (helper)" throughout and I give callers with `file:line`.

---

# LEDGER PART 3 — THE HELPERS (17 files, all under `zoho-functions/v6/activity/`)

---

### zoho-functions/v6/activity/_util_applyQuoteLifecycle.deluge (307)
- **Trigger / callers:** none (helper). Sole caller `v6/processDeal.deluge:1809` (`automation.applyQuoteLifecycle(targetDealId)`), inside processDeal §10.
- **Outcome served:** O9 (primary), O7, O8 (secondary — it writes Contract_ACV that O8 then rolls up)
- **Current responsibility:** On a Deal, walks every child Quote and applies A/E/R succession: Closed Won on Acquisition/Renewal ensures exactly one open Renewal Quote (reuse-or-create); Closed Won on Expansion bumps the open Renewal's `Contract_ACV`; Closed Lost on Renewal churns the Deal to Lost when no other open Quote remains.
- **Authoritative inputs:** `Quotes.Quote_Stage` (Closed Won = the signed event, :6-7), `Quotes.Quote_Type`, `Quotes.Contract_ACV`, `Quotes.Contract_Date_End`; `Accounts.Company_Tier` for the successor's Target-ACV benchmark (:63-75).
- **Reads:** Deals -> `id`, `Deal_Product`, `Account_Name`, `Deal_Primary_Contact`, `Contact_Name`, `Deal_Name`, `Opportunity_State`; Accounts -> `Company_Tier`; Quotes (related list + full `getRecordById` per quote, :78-95) -> `Quote_Stage`, `Quote_Type`, `Contract_ACV`, `Contract_Date_End`, `Quote_Applied_Lifecycle_Keys`.
- **Writes:** Quotes -> `Contract_ACV` (:130), `Quote_Applied_Lifecycle_Keys` (:239, :305); Deals -> `Opportunity_State`="Lost", `Opportunity_Status`="Closed", `Lost_Reasons`="Churned / Did Not Renew" (:285-293).
- **Creates / side effects:** Creates a successor Renewal Quote via **direct REST POST** `https://www.zohoapis.eu/crm/v6/Quotes` on connection `zoho_crm` (:207-214). Creates Manual Review Tasks via `createManualReview` for `renewal_date_invalid` (:226) and `target_acv_unresolved` (:230). All CRM updates use `trigger: []`.
- **Idempotency mechanism:** Deterministic transition key stamped on the **triggering** Quote in `Quote_Applied_Lifecycle_Keys` — `AcqCW:<qid>` / `ExpCW:<qid>` / `RenCW:<qid>` / `RenCL:<qid>` (:109-111, :253). Key is **re-read live** immediately before acting (:114-119, :254-259); before a create, the Deal's Quotes are **re-searched live** for an open Renewal (:139-156). Successor carries `Origin:<transKey>` (:183, :203). Two-pass ordering (creates before churn) so a successor created this run counts as "open" (:242-245).
- **Workflow / config dependencies:** WF001d (Process Deal) is the upstream firing path; `Quotes.Quote_Stage` picklist must contain exactly `Draft/Negotiation/On Hold/Delivered/Confirmed/Closed Won/Closed Lost`; `Quotes.Quote_Type` must contain `Acquisition/Expansion/Renewal`; `Deals.Lost_Reasons` must contain the exact option `Churned / Did Not Renew` (:293); `Opportunity_Type` value `RTP` (:188); `Quoted_Item_Pricing_Tier` value `Base` (:179). Requires the `zoho_crm` connection with Quotes write scope.
- **Overlaps:** Quote creation duplicated in `processDeal:1091` (activity path), `processDeal:1535` (import path), `processDeal:1708` (acquisition scaffold), `handleTaskCompletion:1193` (draft fallback) — four other Quote-creation sites. Deal-Lost writing also happens in `processDeal` §8 viability and via `_util_resolveActivityLoss` consumers.
- **Model drift:** (a) `:44-47` treats `Deals.Deal_Product` as the Deal's single product identity and `:177/:191/:202` wires the successor Renewal's `Quote_Product` and `Quoted_Items` from it — under one-Deal-per-Account there is no single Deal product, and with `Deal_Product` blank the whole `Quoted_Items` block is skipped (`if(dealProdId != "")`, :202), silently creating product-less, line-less Renewals. (b) `:193` writes `Quote_Target_ACV` = Company-Tier benchmark onto a Renewal, mixing a benchmark into the contract-value record. (c) `:180` hardcodes `List_Price: 0` so every successor Renewal is born zero-priced (this is one of the two live generators of the 74 zero-priced Drafts — see sub-report A). (d) `:71-74` hardcodes the tier→Target-ACV table, a third copy (processDeal `:1225-1227`, `:1695-1697`, `:2325-2327`).
- **Classification:** REWIRE (V6_CRUD_PLAN §5 already says REWRITE; consistent)
- **Intended responsibility after correction:** Own A/E/R Quote succession on the Account's one persistent Deal, deriving the successor's Product from the **predecessor Quote's** `Quote_Product` (never from a Deal-level product), and stop writing `Quote_Target_ACV`.
- **Deal = Account × Product only?** **No.** Quote succession (Acquisition → Renewal → Renewal, Expansion bump, churn) is a first-class model requirement (O9) and survives intact. Only the `Deal_Product`-sourced successor wiring (:44-47, :177, :191, :202) is product-Deal residue.

---

### zoho-functions/v6/activity/_util_buildQuoteSubject.deluge (112)
- **Trigger / callers:** none (helper). `processDeal.deluge:855` (existing-Quote subject repair), `:1091` (activity Quote create), `:1500` (import update), `:1535` (import create), `:1708` (acquisition scaffold); `handleTaskCompletion.deluge:1193` (draft fallback); `_util_applyQuoteLifecycle.deluge:185` (successor Renewal).
- **Outcome served:** O7 (naming of the Quote artifact); supporting only
- **Current responsibility:** Pure string composer for `Quotes.Subject` = `<base> [ - <product>[ + <product>…] ] [ (<label>) ]`, with the Account name as the authoritative base and the Deal name as legacy fallback, appending a product only when the base does not already carry it as a whole `" - "`-delimited segment.
- **Authoritative inputs:** `Accounts.Account_Name` (base). Nothing else is trusted; the Deal name is explicitly the fallback (:49-52).
- **Reads:** none (pure — no CRM call)
- **Writes:** none (callers write the returned string to `Quotes.Subject`)
- **Creates / side effects:** none
- **Idempotency mechanism:** Recomputation from canonical parts, not patching. Trailing parenthesised group stripped **for matching only** (:75) so re-feeding a built Subject is stable; whole-segment product match (:86-89); label appended only if not already the suffix (:109).
- **Workflow / config dependencies:** none. Mirrored by `tests/quote_subject_contract.py` (:38) — change both together.
- **Overlaps:** none — this is the single owner and every Quote-writing path routes through it.
- **Model drift:** None material. The one-Deal model changes what `productNames` should contain (per-Quote product, not the Deal product), but the helper already accepts a comma-separated multi-product list and dedupes (:54-63), so it is model-agnostic. The `dealName` fallback parameter (:36, :52) becomes vestigial once Account is always present.
- **Classification:** KEEP
- **Intended responsibility after correction:** Unchanged — the sole composer of `Quotes.Subject` from Account + Quote product(s) + type label; drop the `dealName` fallback parameter once every Quote is guaranteed an Account.
- **Deal = Account × Product only?** **No.** Quote naming survives the model change entirely; it is already keyed on Account + product, which is exactly the target shape.

---

### zoho-functions/v6/activity/_util_calculateBusinessDate.deluge (89)
- **Trigger / callers:** none (helper). `handleMeetingEvent.deluge:386` (demo reminder, `-1` business day, AM snap); `routeContactSequence.deluge:1525` (Task due date), `:1573` (scheduled-send base).
- **Outcome served:** O4 (cadence scheduling); indirectly O5
- **Current responsibility:** Pure date arithmetic — add/subtract N days from a start date, skipping Saturday/Sunday in `business_days` mode, optionally snapping to 09:00 (`business_days_minus_AM`), or straight calendar add (`calendar_days`). Returns `"yyyy-MM-dd HH:mm:ss"`.
- **Authoritative inputs:** the caller-supplied `startDate`; `zoho.currentdate` when null (:22-25 in-file / concat :132-135).
- **Reads:** none
- **Writes:** none
- **Creates / side effects:** none, except an `info "VERSION: v6-shared-utility"` banner on every call (file :18) — the only pure helper in the set that still spams the log (the others explicitly suppress it: see `_util_computeProductKey:18-20`).
- **Idempotency mechanism:** N/A — pure function, no state.
- **Workflow / config dependencies:** none. Depends on Deluge's `toString("EEEE")` day names being English (:67-70) and on the 100-element `counterList` loop bound (file :57) — offsets above 100 business days silently return a short date.
- **Overlaps:** none.
- **Model drift:** none. No product, Deal, Quote or Account concept appears.
- **Classification:** KEEP AND SIMPLIFY (drop the `info` VERSION banner at file :18 for parity with the other pure helpers; document the 100-day ceiling or guard it)
- **Intended responsibility after correction:** Unchanged — the single business-day/calendar-day date calculator for cadence and reminder scheduling.
- **Deal = Account × Product only?** **No.** Entirely model-independent; survives untouched.

---

### zoho-functions/v6/activity/_util_collectProductEvidence.deluge (167)
- **Trigger / callers:** none (helper). Single external caller `_util_normalizeToProductQuoteTuples.deluge:59`; plus **self-recursive** at file :137 (Accounts branch calls itself for each related Contact).
- **Outcome served:** O7 (product evidence gathering), O1 (Lead intake evidence)
- **Current responsibility:** The single definition of "which fields carry product evidence" per module. Returns `{"raw":[<distinct product name/key strings>]}` for Leads / Contacts / Deals / Accounts.
- **Authoritative inputs:** Per module — Leads: `Product_Interest` + `{Acquisition|Expansion|Renewal}_Quote_Plan_Products`; Contacts: `Products_Linked`; Deals: `Deal_Product`.name + `Deal_Product_Key` + child Quotes' `Quote_Product`.name; Accounts: union of related Contacts' evidence + related Deals' `Deal_Product_Key`.
- **Reads:** Leads -> `Product_Interest`, `Acquisition_Quote_Plan_Products`, `Expansion_Quote_Plan_Products`, `Renewal_Quote_Plan_Products` (file :39-63). Contacts -> `Products_Linked` (file :65-93). Deals -> `Deal_Product`, `Deal_Product_Key`, related `Quotes.Quote_Product` (file :95-124). Accounts -> related `Contacts` (recursive), related `Deals.Deal_Product_Key` (file :125-152).
- **Writes:** none
- **Creates / side effects:** none. Read amplification: the Accounts branch is O(contacts) recursive `getRecordById` plus a Deals related-list read; the Deals branch does an extra `getRecordById("Quotes", …)` per quote whose lookup name is omitted (file :112-118).
- **Idempotency mechanism:** N/A (pure read). Output determinism via case-insensitive dedupe on a lowercased `seenKeys` list (file :154-163).
- **Workflow / config dependencies:** Lead multiselect `Product_Interest` and the three `*_Quote_Plan_Products` single picklists must exist and use the display names `Jurnii UX` / `Jurnii 360` / `Jurnii Cortex` / `Partnership`; the known-typo `Jurnii Cortext` is repaired at file :24 and :160.
- **Overlaps:** `processDeal:298-320` performs its own per-Contact product-name → key resolution loop over `cRawProdNames` with a `productKeyResolveCache`, duplicating this helper's Contacts branch.
- **Model drift:** The Deals branch (file :95-107) treats `Deal_Product` / `Deal_Product_Key` as product evidence — those two fields are `Deal = Account × Product` artefacts and are already on the CRUD plan's deletion list (V6_CRUD_PLAN:240). The Accounts branch (file :145-151) likewise harvests `Deal_Product_Key`. Both must be repointed at child **Quotes** `Quote_Product`.
- **Classification:** KEEP AND SIMPLIFY (V6_CRUD_PLAN §5 already says UPDATE; consistent)
- **Intended responsibility after correction:** Same single-source-of-truth role, with the Deals and Accounts branches sourcing product evidence from child Quotes' `Quote_Product` only, after `Deal_Product`/`Deal_Product_Key` are deleted.
- **Deal = Account × Product only?** **No.** Product-interest evidence collection is required to decide **which Quotes to create** under the one-Deal model, which is exactly the O7 job. Only the two `Deal_Product*` reads retire.

---

### zoho-functions/v6/activity/_util_computeProductKey.deluge (29)
- **Trigger / callers:** none (helper). `_util_resolveDealProduct.deluge:37, :58, :71, :88, :89, :94`; `processAccount.deluge:111`; `processDeal.deluge:457, :1869, :1914`; `handleMeetingEvent.deluge:490`.
- **Outcome served:** O7 (product identity normalisation); supporting only
- **Current responsibility:** Pure normaliser: lowercases a product display name, collapses every run of non-alphanumerics to a single `_`, and strips leading/trailing underscores. `"Jurnii UX"` → `"jurnii_ux"`.
- **Authoritative inputs:** the raw string passed in. The header (:13-16) warns callers to route plan-variant names through `resolveDealProduct` **first** — keying a raw variant yields a non-canonical key.
- **Reads:** none
- **Writes:** none
- **Creates / side effects:** none. No `info` banner by design (:18-20).
- **Idempotency mechanism:** N/A — pure, deterministic, and self-stable (`computeProductKey(computeProductKey(x)) == computeProductKey(x)`).
- **Workflow / config dependencies:** none.
- **Overlaps:** none.
- **Model drift:** none in the body. Its *outputs* feed model-drifted consumers (`Deals.Deal_Product_Key` at `processDeal:1914`, `processAccount:111`), but the function itself encodes no Deal/product cardinality.
- **Classification:** KEEP
- **Intended responsibility after correction:** Unchanged — the canonical product-name normaliser, used for Quote grouping and product identity comparison rather than for Deal keying.
- **Deal = Account × Product only?** **No.** Grouping Quotes by product, comparing an activity's product to a Quote's product, and deduping product names all still need a stable key. V6_CRUD_PLAN:218 reaches the same conclusion.

---

### zoho-functions/v6/activity/_util_createOrReuseProductDeal.deluge (196)
- **Trigger / callers:** none (helper). `processAccount.deluge:198`; `processContact.deluge:281`; `processLead.deluge:627`. (Also referenced in comments at `processAccount.deluge:15`.)
- **Outcome served:** O1 (creating the durable Deal on conversion) — but implemented against the wrong cardinality
- **Current responsibility:** The single entry point for the `Deal = Account × Product` invariant. Keys a Deal as `Deal_Key = "{accountKey}::{productKey}"`, searches for an existing Deal with that key (reusing the lowest id, any state), otherwise creates a minimal Deal.
- **Authoritative inputs:** `Deals.Deal_Key` uniqueness (:9-10); `_util_pipelineForProductKey` for the mandatory `Pipeline` value (:53).
- **Reads:** Deals via `searchRecords("Deals","(Deal_Key:equals:…)")` (:64) -> `id`.
- **Writes:** Deals (create) -> `Deal_Name`, `Account_Name`, `Deal_Key`, `Deal_Product_Key`, `Deal_Product`, `Pipeline`, `Opportunity_State`="Open", `Opportunity_Status`="New", `Closing_Date` = today+30 (:94-111). On REST fallback failure also writes `Deals.Description` with a `[partnership_pipeline_rest_failed]` flag (:171).
- **Creates / side effects:** Creates Deal records. **Two creation paths**: native `zoho.crm.createRecord` for B2B/blank (:178, no trigger suppression, so WF001d fires `processDeal` on the new Deal), and a **direct REST POST** to `https://www.zohoapis.eu/crm/v6/Deals` with `trigger:[]` for Partnership (:140-147) because native `createRecord` drops the mandatory `Pipeline` special field (verified 2026-07-19, :100-104).
- **Idempotency mechanism:** Search-before-create on the unique `Deal_Key` (:64-86); lowest-id wins on duplicates and the duplicate count is logged (:76-79). Secondary recovery from a `DUPLICATE_DATA` create response (:168, :180).
- **Workflow / config dependencies:** `Deals.Deal_Key` must be UNIQUE; `Deals.Pipeline` is a mandatory special field with exactly two live values `B2B` / `Partnership`; `Stage` value `MQL` must be valid under both pipelines (:122-124); `Opportunity_Status` value `New`; the `zoho_crm` connection needs `ZohoCRM.modules.deals` scope. WF001d fires on the created Deal.
- **Overlaps:** `processDeal` §6b recomposes `Deal_Key` and re-stamps `Deal_Product`/`Deal_Product_Key` (`processDeal:2104-2120`), duplicating this helper's keying.
- **Model drift:** **This file is the model violation.** `:6-10` states the `Deal = Account × Product` invariant; `:61` composes the product-scoped `Deal_Key`; the whole function's contract is "one Deal per Account per Product". Under `one Account -> zero or one persistent Deal` (`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md` §2), every additional product must become a **Quote** under the existing Deal, not a new Deal. Secondary drift: `:105` derives `Pipeline` from a product key; `:98-99` writes `Deal_Product_Key`/`Deal_Product`, both scheduled for deletion (V6_CRUD_PLAN:240).
- **Classification:** REWIRE (V6_CRUD_PLAN §5 already rules RENAME + REWRITE → `_util_resolveOrCreateAccountDeal`; consistent)
- **Intended responsibility after correction:** Resolve or create the Account's **one** persistent Deal keyed on the Account alone (`Deal_Key = accountKey`), with no product dimension and no product-derived Pipeline; every product then enters as a Quote under that Deal.
- **Deal = Account × Product only?** **Yes — this helper exists solely for it.** What survives is the *capability*: idempotent search-before-create of the Account's Deal on a unique key, the `DUPLICATE_DATA` recovery, and the REST-insert workaround for the mandatory `Pipeline` field. The product dimension in the key, name and payload retires.

---

### zoho-functions/v6/activity/_util_logAutomationEvent.deluge (28)
- **Trigger / callers:** none (helper). 264 call sites across 23 files — heaviest: `handleTaskCompletion` (64), `processDeal` (37), `routeContactSequence` (31), `handleMeetingEvent` (27), `handleCallOutcome` (23), `sendSequencedEmail` (15), `handleEmailEvent` (10), `sendCommercialFollowUp` (8), `handleQuoteStageChange` (6), `sendDemoReminder` (6), `_util_createOrReuseProductDeal` (5), `processContact` (5), `_util_applyQuoteLifecycle` (4), `processAccount` (4), `sendScheduledEmailFromTask` (4), `_util_resolveDealProduct` (3), `_util_rollupAccountState` (3), `processLead` (3), `createManualReview` (2), `_util_resolveDealPipeline` (2), `_util_matchDraftQuotes` (1), `_util_resolveManualReviewCode` (1).
- **Outcome served:** NONE directly — it is pure observability infrastructure supporting every outcome
- **Current responsibility:** The single emit point for structured automation logs, producing one fixed-format `info` line: `automation_event func=… module=… record=… action=… outcome=… payload=…`.
- **Authoritative inputs:** the caller's arguments only.
- **Reads:** none
- **Writes:** none (writes to the CRM function log via `info`)
- **Creates / side effects:** one `info` line per call. No `VERSION` banner by design (:3-4).
- **Idempotency mechanism:** none — and none needed; the log is append-only by nature.
- **Workflow / config dependencies:** none.
- **Overlaps:** Large amounts of ad-hoc `info "…"` logging bypass this helper (e.g. `processDeal:510`, `:1896`, `:2351`, `_util_calculateBusinessDate` file :18), so the log is only partly parseable.
- **Model drift:** none.
- **Classification:** KEEP
- **Intended responsibility after correction:** Unchanged — the single structured-log emit point; ad-hoc `info` calls in the engines should be migrated onto it so the log is uniformly machine-parseable.
- **Deal = Account × Product only?** **No.** Pure infrastructure, entirely model-independent.

---

### zoho-functions/v6/activity/_util_matchDraftQuotes.deluge (181)
- **Trigger / callers:** none (helper). `handleTaskCompletion.deluge:1086` (Draft Commercials reuse-vs-create decision) and `:1429` (final package verification) — deliberately the same matcher on both sides so they cannot disagree (:5-8).
- **Outcome served:** O7, O11 (deduplicated Quote resolution)
- **Current responsibility:** One idempotent Draft-Quote matcher. A Quote MATCHES only if all hold: belongs to the Deal, `Opportunity_Type == oppType`, `Quote_Stage == "Draft"`, `Quote_Product == productId`, has ≥1 `Quoted_Items` line for that product with a positive price, and its normalised `Quote_Applied_Activity_Keys` contains the exact activity key. REUSABLE = all of the above except the key.
- **Authoritative inputs:** `Quotes.Quote_Applied_Activity_Keys` (the idempotency ledger), `Quotes.Quote_Product`, `Quotes.Quote_Stage`, `Quotes.Opportunity_Type`, `Quotes.Deal_Name`.
- **Reads:** Deals related list `Quotes` (:61) plus explicitly-passed `extraQuoteIdsCsv` ids (:71-79); per candidate, REST `GET /crm/v6/Quotes/<id>` first, then `getRecordById` fallback (:85-92) -> `Deal_Name`, `Opportunity_Type`, `Quote_Stage`, `Quote_Product`, `Quoted_Items` (`Product_Name`, `Total`, `Net_Total`, `List_Price`), `Quote_Applied_Activity_Keys`.
- **Writes:** none (pure resolver; the caller adopts a reusable Quote by appending the key)
- **Creates / side effects:** one invokeurl GET per candidate Quote; one `logAutomationEvent` summary (:174).
- **Idempotency mechanism:** N/A for itself (read-only), but it **is** the idempotency mechanism for its callers: exact `Quote_Applied_Activity_Keys` membership, parsed robustly — the org stores the delimiter as a **literal backslash-n**, so `litBsN = hextoText("5C5C6E")`, CRLF and CR are all normalised to a real newline before splitting (:38-41, :145-149).
- **Workflow / config dependencies:** `Quotes.Quote_Applied_Activity_Keys` must exist and be writable; `Quote_Stage` value `Draft`; `Opportunity_Type` picklist; `Quoted_Items` subform with `Product_Name`, `Total`/`Net_Total`/`List_Price`; the `zoho_crm` connection for the read-after-write GET.
- **Overlaps:** `processDeal` §5/§5b/§8z run their own reuse-vs-create Quote matching against `Quote_Applied_Activity_Keys` (e.g. `processDeal:970-982` key append, `:1515-1518` import key append) using a **different, weaker** parser that splits on `"\n"` only — the exact bug this helper documents at :26-29. That divergence is live.
- **Model drift:** `:14` requires `Quote_Product == productId` as a match criterion — correct and *strengthened* under the one-Deal model (with many Quotes per Deal, `Quote_Product` becomes the only discriminator). No drift.
- **Classification:** KEEP (V6_CRUD_PLAN:221 concurs — `Quote_Product` is the only queryable per-Product discriminator)
- **Intended responsibility after correction:** Unchanged, and **promoted**: it should become the single Draft-Quote matcher for `processDeal` §5/§5b/§8z too, retiring their weaker inline key parsers.
- **Deal = Account × Product only?** **No — the opposite.** It becomes *more* necessary: once one Deal carries many product Quotes, a per-product, per-activity-key matcher is the only safe way to avoid duplicate Quotes.

---

### zoho-functions/v6/activity/_util_normalizeToProductQuoteTuples.deluge (226)
- **Trigger / callers:** none (helper). `processLead.deluge:439`; `processContact.deluge:237`; `processAccount.deluge:182`. (Comment references at `processLead.deluge:73`, `processAccount.deluge:13`.)
- **Outcome served:** O1, O7
- **Current responsibility:** The engine that turns raw product evidence plus Lead A/E/R contract terms into resolved per-product buckets. Calls `collectProductEvidence`, resolves each name via `resolveDealProduct`, inlines the Lead A/E/R term reader (folded from the former `_util_collectLegacyQuoteEvidence`, :62-129), and encodes each term as an 11-field `~`-joined string, `;`-joined per product.
- **Authoritative inputs:** `collectProductEvidence` output (:59); Lead group fields `{Acquisition|Expansion|Renewal}_Quote_Plan_Products` (single picklist, gates emission, :80-87) plus that group's `_Quote_Plan_Type`, `_Quote_Plan_Brands`, `_Quote_Contract_Date_Start/End/Renewal`, `_Quote_ACV`, `_Quote_Plan_Frequency`, `_Quote_Stage`.
- **Reads:** Leads -> the 24 A/E/R group fields (:71-127); everything else via `collectProductEvidence` and `resolveDealProduct`.
- **Writes:** none
- **Creates / side effects:** none. Read amplification: one `resolveDealProduct` per evidence name and per term family (:142, :168), each of which does a `getRecords("Products",1,200)` — no cache here (unlike `processDeal:305-317`).
- **Idempotency mechanism:** N/A — pure derivation, deterministic given the record.
- **Workflow / config dependencies:** The 11-field encoding order at :18-32 and :203 **must match the `processDeal` §5b parser exactly** — a brittle positional contract across two files. Requires the Lead A/E/R group fields to exist; `Quote_Plan_Type` value `Flexible` is normalised to `Flex` (:90); tier is hardcoded `"Base"` (:124, :197-198).
- **Overlaps:** `processDeal:1260` re-runs `resolveDealProduct` on the same encoded family during import; `processDeal:298-320` independently resolves Contact product names.
- **Model drift:** (a) The output shape "products → terms" is the seed for **per-product Deal creation** at `processLead:627` / `processContact:281` / `processAccount:198`, i.e. it feeds the `Deal = Account × Product` fan-out. (b) `:124` and `:197-198` hardcode `tier = "Base"`, permanently discarding any Markup/Agency channel tier from import — see sub-report A. (c) `:34-35` claims "pi_for_conflict is `""` from the adapter, so no conflict fires", and indeed `conflicts` is initialised at :50 and returned at :224 **always empty** — a dead output field.
- **Classification:** REWIRE
- **Intended responsibility after correction:** Same engine, but its `products[]` output must drive **Quote** creation under the Account's single Deal rather than Deal creation; and the 11-field positional string should become a structured map or a stable named-field encoding shared with the `processDeal` parser.
- **Deal = Account × Product only?** **No.** Turning messy Lead product interest + A/E/R contract terms into resolved per-product commercial tuples is exactly what the one-Deal/many-Quotes model needs to build its Quotes (O7). Only the downstream consumption (Deal-per-product) changes.

---

### zoho-functions/v6/activity/_util_pipelineForProductKey.deluge (29)
- **Trigger / callers:** none (helper). `_util_createOrReuseProductDeal.deluge:53`; `_util_resolveDealPipeline.deluge:33`; `processDeal.deluge:100`; `processContact.deluge:300`; `sendSequencedEmail.deluge:268`; `handleMeetingEvent.deluge:534`.
- **Outcome served:** NONE under the authoritative model (it serves a Product→Pipeline rule the model does not define)
- **Current responsibility:** Pure map from a canonical product key to a Deal Pipeline: `jurnii_ux|jurnii_360|jurnii_cortex` → `"B2B"`; `partnership` → `"Partnership"`; blank → `"B2B"`; anything else → `"unresolved"`.
- **Authoritative inputs:** the product key alone. The header (:6-7) asserts "Product Interest is authoritative for the pipeline" — an assertion with no basis in `JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`.
- **Reads:** none
- **Writes:** none
- **Creates / side effects:** none.
- **Idempotency mechanism:** N/A — pure.
- **Workflow / config dependencies:** `Deals.Pipeline` must have exactly two values `B2B` and `Partnership`. Callers **must** handle `"unresolved"` explicitly (:14-17).
- **Overlaps:** `_util_resolveDealPipeline` is a thin CRM-reading wrapper around this function and nothing else (`_util_resolveDealPipeline` file :32-33).
- **Model drift:** **Fundamental.** Under `one Account -> zero or one persistent Deal`, a Deal has no single product, so a product-key-derived Pipeline is undefined. The rule also inverts the authority direction: `Deals.Pipeline` is a real, populated, readable field (COQL live read 2026-08-18: 5/5 Deals returned `Pipeline="B2B"` alongside their `Deal_Product_Key`), so the Deal's own field is the authority and this derivation is redundant. Additionally `:54` silently maps a **blank** key to `"B2B"`, contradicting the same header's "NEVER silent B2B" promise at `:12` — a blank key is exactly the ambiguous case that should not default.
- **Classification:** RETIRE (V6_CRUD_PLAN §5 already lists it under DELETE and V6_CRUD_PLAN:208 gives the same reasoning; consistent)
- **Intended responsibility after correction:** None — read `Deals.Pipeline` directly. The one capability that must be re-homed before deletion is the **Partnership hold-out** (Partnership Deals must not enter B2B automation), currently enforced at `routeContactSequence:977`, `sendSequencedEmail:268/273`, `handleMeetingEvent:534`, `processContact:300`, `processDeal:100`.
- **Deal = Account × Product only?** **Yes.** It exists purely to give a product-keyed Deal a Pipeline. What survives is the *Partnership hold-out gate*, which must be re-expressed as a direct `Deals.Pipeline == "Partnership"` read.

---

### zoho-functions/v6/activity/_util_resolveActivityLoss.deluge (152)
- **Trigger / callers:** none (helper). `handleCallOutcome.deluge:317`; `handleMeetingEvent.deluge:209` and `:307` (the latter with `meetingContext="true"`); `handleTaskCompletion.deluge:703`. All four pass `scope="activity"` and `finalCommercial="false"`.
- **Outcome served:** O6 (primary), O4, O11
- **Current responsibility:** The single source of truth for how an activity-level Lost resolves. Pure decision table returning `{action, contactLostReason, dealLostReason, blocksSequence, reason}` where action ∈ `continue_cadence | contact_lost | deal_lost | manual_review | find_decision_maker | data_repair | suppress | none`.
- **Authoritative inputs:** the canonical `*_Lost_Reasons` value plus caller-supplied context (`hasNextStep`, `finalCommercial`, `meetingContext`). Governing rule (user-locked 2026-06-20, file :10-15): Lost is module-relative and never auto-cascades upward; the Deal is never closed from a Lost Reason alone.
- **Reads:** none
- **Writes:** none (the caller executes the returned action)
- **Creates / side effects:** none.
- **Idempotency mechanism:** N/A — pure, side-effect-free.
- **Workflow / config dependencies:** The `*_Lost_Reasons` picklists must carry exactly these strings: `No Response`, `No Authority`, `No Fit`, `No Commercial Interest`, `No Budget`, `Terms Rejected`, `Churned / Did Not Renew`, `Invalid / Bad Data`, `Duplicate / Test Record`, `No Meeting / Demo`, `N/A` (file :65-137). Any drift in an option string falls through to the default `manual_review` branch (file :143-148) — fail-safe, but silently.
- **Overlaps:** `_util_applyQuoteLifecycle:293` independently writes `Deals.Lost_Reasons = "Churned / Did Not Renew"` on churn without consulting this helper; `processDeal` §8 independently sets `Opportunity_State` from Contact viability. So there are three places that can Lose a Deal.
- **Model drift:** None. It is Contact/activity-scoped, aligning with the settled owner ruling that activation is Contact-scoped, and it deliberately refuses to close a Deal from an activity (file :12-15). Note `deal_lost` is reachable only via an explicit caller `scope="deal"` (file :46-51) or `commercialFinal="true"` (file :95-101) — **and no live caller passes either**, so the `deal_lost` branch is currently dead code.
- **Classification:** KEEP
- **Intended responsibility after correction:** Unchanged. Its Contact-scoped, never-cascade contract is exactly what the settled ruling requires; it should additionally become the single gate through which `_util_applyQuoteLifecycle`'s churn routes its Deal-Lost decision.
- **Deal = Account × Product only?** **No.** No product or Deal-cardinality concept appears anywhere in the body; fully survives.

---

### zoho-functions/v6/activity/_util_resolveDealPipeline.deluge (42)
- **Trigger / callers:** none (helper). `createAuxTask.deluge:130`; `handleCallOutcome.deluge:124`; `handleMeetingEvent.deluge:112`; `routeContactSequence.deluge:977`; `sendSequencedEmail.deluge:273` and `:383`; `processContact.deluge:524`.
- **Outcome served:** O4 (via the Partnership dispatch gate), plus the activity `*_Task_Pipeline` mirrors
- **Current responsibility:** Given a Deal id, reads `Deals.Deal_Product_Key` and maps it through `pipelineForProductKey` to return `"B2B"` / `"Partnership"` / `""`, for the `Task_Pipeline` / `Call_Task_Pipeline` / `Meeting_Task_Pipeline` mirrors.
- **Authoritative inputs:** `Deals.Deal_Product_Key` (file :32) — **not** `Deals.Pipeline`.
- **Reads:** Deals -> `id`, `Deal_Product_Key` (file :29-32)
- **Writes:** none
- **Creates / side effects:** one `getRecordById` per call; two `logAutomationEvent` lines (file :37, :40).
- **Idempotency mechanism:** N/A — read-only. Blank-return contract: every call site guards `if(pipeline != "")` so an unresolved product leaves the mirror untouched rather than mislabelling it (file :16-17).
- **Workflow / config dependencies:** Depends on `Deals.Deal_Product_Key` being populated (a field on the deletion list, V6_CRUD_PLAN:240) and on `pipelineForProductKey`'s two-value contract.
- **Overlaps:** It is a one-line wrapper over `_util_pipelineForProductKey` plus one CRM read; `processDeal:100` calls `pipelineForProductKey` directly with the same field, bypassing this wrapper.
- **Model drift:** (a) **The header comment at file :11-13 is FALSE.** It claims `Deals.Pipeline` "is UNREADABLE inside the Deluge runtime (verified 2026-07-16: native/REST/COQL all return it blank in-function)". Live COQL read 2026-08-18 returns `Pipeline` populated on every Deal sampled (5/5 `"B2B"`, alongside `Deal_Product_Key`); V6_CRUD_PLAN:274 records the same refutation at 96/96. The in-function-only claim is UNVERIFIED (I did not execute Deluge), but the blanket "unreadable" framing that justifies the entire product-key detour is refuted for REST/COQL. **Report the code and flag the comment as false.** (b) The whole function is a workaround for a non-problem: read `Deals.Pipeline`. (c) It depends on a field scheduled for deletion.
- **Classification:** REWIRE (V6_CRUD_PLAN §5 says REWRITE; consistent. Note V6_CRUD_PLAN:204 flags this as the **highest blast radius single-file edit** — `routeContactSequence:977` uses the return as the B2B dispatch gate, so a blank return silently stops every Contact's cadence. Gate any change on a live read-back of one B2B and one Partnership Deal.)
- **Intended responsibility after correction:** Read `Deals.Pipeline` directly and return it, deleting the `Deal_Product_Key` → `pipelineForProductKey` indirection entirely.
- **Deal = Account × Product only?** **No.** The capability — telling activity handlers and the cadence dispatcher which pipeline a Deal is on — survives and is required by O4. Only its *implementation* (product-key derivation) retires.

---

### zoho-functions/v6/activity/_util_resolveDealProduct.deluge (102)
- **Trigger / callers:** none (helper). `_util_normalizeToProductQuoteTuples.deluge:142` and `:168`; `processDeal.deluge:311` and `:1260`.
- **Outcome served:** O7 (product identity resolution), O11 (raises the `[product_unresolved]` review path)
- **Current responsibility:** Resolves an arbitrary product name / interest / family string to the ONE canonical name-only Product record. Order: (1) fix the single known typo `Jurnii Cortext` → `Jurnii Cortex` (file :35); (2) exact key match against a **name-only** Product (`Product_Plan_Products` AND `Product_Plan_Type` both blank, file :57); (3) if no canonical record exists, return the family name with no `product_id` and `reason=canonical_product_missing` (file :95) so the caller raises Manual Review.
- **Authoritative inputs:** the Products module — specifically the "name-only" convention (file :12-14) that distinguishes a canonical product from a legacy `"Jurnii UX - Fixed"` plan variant.
- **Reads:** Products via `getRecords("Products", 1, 200)` (file :40) -> `id`, `Product_Name`, `Product_Plan_Products`, `Product_Plan_Type`.
- **Writes:** none
- **Creates / side effects:** one full 200-record Products page read **per call**, uncached inside the helper; `_util_normalizeToProductQuoteTuples` calls it once per evidence name and once per term with no cache (`:142`, `:168`), so a 3-product Lead costs 4-6 full Products reads. Logs on read failure (file :44), ambiguity (file :78) and canonical-missing (file :96).
- **Idempotency mechanism:** N/A — pure resolver. Explicitly refuses to guess: multiple canonical matches return `reason=ambiguous_product` with no id (file :75-79); it **never fuzzy-matches plan variants** (file :6).
- **Workflow / config dependencies:** Requires ≤200 Products; requires canonical Products to exist with both `Product_Plan_Products` and `Product_Plan_Type` blank — until Product consolidation lands, the `canonical_product_missing` path is live. Feeds the `product_unresolved` Manual Review code registered in `_util_resolveManualReviewCode` file :26.
- **Overlaps:** `processDeal:305-317` wraps it in a `productKeyResolveCache`; `_util_normalizeToProductQuoteTuples` does not — the caching is inconsistent across callers.
- **Model drift:** None in the body — resolving a product name to a Product record is model-neutral. Its name (`resolveDealProduct`) is the only residue: it resolves a **Product**, not a *Deal's* product.
- **Classification:** KEEP AND SIMPLIFY (add an internal call-scoped Products cache; rename to `resolveCanonicalProduct`)
- **Intended responsibility after correction:** Unchanged behaviour — the canonical Product resolver that Quote creation depends on — with the 200-record Products read cached per invocation and the name de-Deal-ified.
- **Deal = Account × Product only?** **No.** V6_CRUD_PLAN:218 already keeps it: every Quote needs `Quote_Product` set to a canonical Product record, so this resolver is load-bearing under the one-Deal model.

---

### zoho-functions/v6/activity/_util_resolveManualReviewCode.deluge (45)
- **Trigger / callers:** none (helper). `createManualReview.deluge:18` (the common path wrapper); `processAccount.deluge:163` (raw `"duplicate_product_deal"` code).
- **Outcome served:** O11 (deduplicated Manual Review surfacing)
- **Current responsibility:** Canonical registry of Manual Review codes. Normalises a key to `[a-z0-9_]`, returns it as a bracketed leading token `"[code]"` for a `createAuxTask` note, so `createAuxTask`'s leading-`[token]` dedupe makes reviews idempotent and greppable without changing its signature.
- **Authoritative inputs:** the 15-entry `known` set at file :24-40.
- **Reads:** none
- **Writes:** none
- **Creates / side effects:** logs `unknown_review_code` for unregistered keys (file :43) but still returns them bracketed — **fail-open by design** (file :19-20).
- **Idempotency mechanism:** N/A for itself; it *enables* idempotency downstream — `createAuxTask` dedupes a reused Manual Review on the leading `[token]` (file :7-9).
- **Workflow / config dependencies:** none directly; the dedupe contract depends on `createAuxTask`'s append-issue logic remaining leading-token-based.
- **Overlaps:** Several call sites emit bracketed codes **without** going through the registry — `processDeal:2334` (`[pipeline_target_acv_unresolved]`), `:2346` (`[rtp_missing_commercial_evidence]`), `:1376` (`[imported_acv_variance]`), `:1384` (`[pricing_from_imported_acv]`), `_util_createOrReuseProductDeal:171` (`[partnership_pipeline_rest_failed]`). None of those five is in the `known` set, so the registry is not the single source of truth in practice.
- **Model drift:** Two registry entries are `Deal = Account × Product` artefacts: `duplicate_product_deal` (file :29) and `quote_product_mismatch` (file :32, partially). `duplicate_product_deal` is meaningless when one Account has one Deal — the equivalent concern becomes `duplicate_open_quote` (already registered, file :30).
- **Classification:** KEEP AND SIMPLIFY (V6_CRUD_PLAN §5 says UPDATE; consistent. Publish it **last** per V6_CRUD_PLAN:239 because the registry is fail-open.)
- **Intended responsibility after correction:** Same registry, with `duplicate_product_deal` removed, the five unregistered live codes added, and every bracketed-code emitter routed through it.
- **Deal = Account × Product only?** **No.** Deduplicated review-code surfacing is O11 and survives; only the `duplicate_product_deal` entry retires with the model.

---

### zoho-functions/v6/activity/_util_resolveOpenerVariant.deluge (34)
- **Trigger / callers:** none (helper). Single caller `handleTaskCompletion.deluge:645`.
- **Outcome served:** O4 (cadence opener selection), O11 (the conflict → Manual Review path)
- **Current responsibility:** Single owner of the opening-email variant decision, driven by the **latest** native Note on the Activation Task (the caller reads that one note; older notes are never consulted, file :5-7). Case-insensitive **exact** match: `"warm"` → `warm`; `"cold"` → `cold`; an explicit both-value entry → `conflict`; anything else (including prose) → `default`.
- **Authoritative inputs:** the single latest Note's full trimmed content.
- **Reads:** none (the caller supplies the note content)
- **Writes:** none
- **Creates / side effects:** none.
- **Idempotency mechanism:** N/A — pure and deterministic; the same note always yields the same variant.
- **Workflow / config dependencies:** Requires a matching template + registry key in `sendSequencedEmail` for each variant (file :17-19). The `conflict` return maps to the registered review code `conflicting_opening_variant` (`_util_resolveManualReviewCode` file :39).
- **Overlaps:** none.
- **Model drift:** None. It is Contact/Task-scoped and consistent with the settled ruling that activation is Contact-scoped — no Deal, Quote or Product is consulted.
- **Classification:** KEEP
- **Intended responsibility after correction:** Unchanged — the deterministic warm/cold opener selector, extended only by adding an exact token here plus a template and registry key.
- **Deal = Account × Product only?** **No.** Zero coupling to Deal or Product; survives untouched.

---

### zoho-functions/v6/activity/_util_resolveQuoteLinePrice.deluge (172)
- **Trigger / callers:** none (helper). `processDeal.deluge:926` (existing-line reprice, passes the line's own `Quoted_Item_Pricing_Tier`), `:953` (new line, hardcoded `"Base"`), `:1072` (new Quote line, `"Base"`), `:1349` (import path, `"Base"`); `handleTaskCompletion.deluge:1178` (draft fallback, `"Base"`).
- **Outcome served:** O8 (primary), O7
- **Current responsibility:** Resolves ONE Quoted-Item line price from the banded pricing matrix transcribed verbatim from `price_model.csv`. Returns JSON with `line_acv`, `pricing_band_used`, `pricing_tier_used`, `pricing_basis`, `sub`, `ppb`, `valid`, `reason`.
- **Authoritative inputs:** `Products.Product_Plan_Products` (family; falls back to `Product_Name` when blank, :67-70); the caller's brand-market count; `Quoted_Item_Pricing_Tier`; frequency (Jurnii 360 only); plan type (Jurnii UX only, read from `Products.Product_Plan_Type` if blank, :72-76).
- **Reads:** Products -> `id`, `Product_Plan_Products`, `Product_Name`, `Product_Plan_Type` (:64-77). One read; nothing else.
- **Writes:** none
- **Creates / side effects:** none, except an `info "VERSION: v6-quote-pricing"` banner on every call (:38).
- **Idempotency mechanism:** N/A — pure given its inputs.
- **Workflow / config dependencies:** Products must carry `Product_Plan_Products` / `Product_Plan_Type`; `Quoted_Item_Pricing_Tier` picklist must use exactly `Base` / `Markup` / `Agency`; `Quoted_Item_Frequency` must use exactly `4x per day` / `2x per day` / `1x per day`; `Quote_Plan_Type` `Flexible` is normalised to `Flex` (:52, :75); typo alias `Jurnii Cortext` handled at :71.
- **Overlaps:** none — it is the only pricing calculator. But the *value* it produces is routinely overridden: `processDeal:1366` prefers imported ACV over the calculated line, and `processDeal:1860` prefers `Contract_ACV` over `Grand_Total`.
- **Model drift:** (a) The matrix has **no Jurnii Cortex row**, so every Cortex line returns `valid=false, reason=no_pricing_for_product` (:100-104) and can never be auto-priced. (b) `brands <= 0` returns `missing_brand_count` before anything else (:58) — the dominant live failure mode (74/74 zero-priced Drafts have `Quote_Plan_Brands = null`). (c) It correctly does **not** consult Company Tier — but four of its five call sites hardcode `"Base"`, so `Markup`/`Agency` are unreachable from automation.
- **Classification:** KEEP AND SIMPLIFY (externalise the matrix; drop the per-call `info` banner)
- **Intended responsibility after correction:** Unchanged as the single line-price calculator; the hardcoded `PRICE` map at :120-146 should become a configuration source so pricing changes do not require a Deluge publish, and callers must pass a real `Quoted_Item_Pricing_Tier` instead of hardcoding `"Base"`.
- **Deal = Account × Product only?** **No.** It prices a **Quote line**, keyed on Product + plan dimensions. It never reads a Deal. It is the most model-correct file in the set and becomes *more* central under one-Deal/many-Quotes.

---

### zoho-functions/v6/activity/_util_rollupAccountState.deluge (117)
- **Trigger / callers:** none (helper). `processAccount.deluge:227`; `processDeal.deluge:2560`; `processLead.deluge:799`.
- **Outcome served:** O10 (relationship roll-up), O9
- **Current responsibility:** Aggregates Deal state onto the Account: `Accounts.State` = `"Lost"` only when **every** counted Deal is Lost, else `"Open"`; `Accounts.Account_Status` = `Churned` / `Active Customer` / `Prospect`. "Signed/active" = `Opportunity_Stage` in `{Onboarding, Renewal}` **or** ≥1 Closed Won Quote on the Deal.
- **Authoritative inputs:** `Deals.Opportunity_State`, `Deals.Opportunity_Stage`, and child `Quotes.Quote_Stage == "Closed Won"` (the D1 signed event).
- **Reads:** Accounts related list `Deals` (file :29), then `getRecordById("Deals", …)` per Deal (file :39) -> `Deal_Key`, `Deal_Product_Key`, `Deal_Product`, `Opportunity_State`, `Opportunity_Stage`; then per unsigned Deal, related `Quotes` + `getRecordById("Quotes", …)` -> `Quote_Stage` (file :64-75).
- **Writes:** Accounts -> `State`, `Account_Status` (file :100-103), with `trigger: []`. Never writes `Accounts.Status` (file :17).
- **Creates / side effects:** none. Deep read amplification: O(Deals × Quotes) full record reads per Account. Logs `no_product_deals` (file :83), `applied` (file :107) or `update_rejected` (file :111) — it checks the update response rather than assuming success (file :104-106), because `State`/`Account_Status` are all-null on live Accounts and an invalid picklist option would be silently rejected.
- **Idempotency mechanism:** Full recomputation from live state on every call — no keys or markers needed; repeated runs converge.
- **Workflow / config dependencies:** `Accounts.State` must accept `Open`/`Lost` and `Accounts.Account_Status` must accept `Churned`/`Active Customer`/`Prospect` — **unverified live** (the code itself flags this as a pre-publish gate at file :104-106). `Deals.Opportunity_Stage` values `Onboarding`/`Renewal`; `Quotes.Quote_Stage` value `Closed Won`.
- **Overlaps:** `processDeal` §8 computes Deal-level viability from Contacts; this computes Account-level viability from Deals. Complementary, not duplicated.
- **Model drift:** **Fatal under the corrected model.** File :51-53 skips any Deal with blank `Deal_Key`, any key ending `"::active"`, and any Deal with **both** `Deal_Product_Key` and `Deal_Product` blank. A corrected one-per-Account Deal will have no product identity at all, so the third guard `continue`s on **every** Deal, `total` stays 0, and the function returns at file :81-85 having written nothing — a silent no-op, not an error. V6_CRUD_PLAN:200 records the same finding at `:53`.
- **Classification:** REWIRE (V6_CRUD_PLAN §5 says REWRITE; consistent. Must be published **before** the process* functions per V6_CRUD_PLAN:235.)
- **Intended responsibility after correction:** Roll the Account's single Deal (and its Quotes) up into `Accounts.State` / `Account_Status`, with the three product-Deal filters at file :51-53 deleted and the "signed" test resting on Closed Won Quotes.
- **Deal = Account × Product only?** **No.** `Account_Status` (Prospect / Active Customer / Churned) is a business fact no Deal field carries (V6_CRUD_PLAN:222). Only the multi-Deal counting logic and the three product-identity filters retire; under one Deal per Account the aggregation collapses to a single-Deal read.

---
---

# (A) VALUATION CHAIN

**The core correction the owner asked for, stated once:** the word "tier" names **two unrelated things** in this codebase, and conflating them is the error.

| | **Pricing Tier** | **Company Tier** |
| --- | --- | --- |
| api_name | `Quoted_Item_Pricing_Tier` (Quoted Items subform) | `Accounts.Company_Tier` (mirrored to `Deals.Company_Tier`) |
| values | `Base` / `Markup` / `Agency` | `1` / `2` / `3` |
| what it is | a channel/margin multiplier on the per-brand rate | a **target ACV benchmark** for the account |
| where it acts | `_util_resolveQuoteLinePrice` `tier` param (:14, :150) | `processDeal:2318-2335`, `:1224-1227`, `:1693-1697`; `_util_applyQuoteLifecycle:70-74` |
| determines a line price? | **Yes** | **No — never. It appears nowhere in `_util_resolveQuoteLinePrice`.** |

`_util_resolveQuoteLinePrice` does not read `Company_Tier` at any line. Its `tier` argument is documented at `:14` as `Quoted_Item_Pricing_Tier`. This is verified by reading the executable body, not the header.

### A.1 What determines a Quote LINE price

Exactly five inputs, in this order (`_util_resolveQuoteLinePrice`):

1. **Product family** — from `Products.Product_Plan_Products`, falling back to `Products.Product_Name` when blank (:67-70). Selects which band set and SKU space applies.
2. **Plan type** (`Fixed` / `Flex`) — **Jurnii UX only**; from the caller or `Products.Product_Plan_Type` (:72-76, :86). Composes `skuKey = "UX_" + pType`.
3. **Frequency** (`4x/2x/1x per day`) — **Jurnii 360 only** (:92-97). Composes `skuKey = "360_4x|360_2x|360_1x"`.
4. **Brand-market count** (`Quoted_Item_Plan_Brands`) — used **twice**: it selects the volume band (first band ≥ brands, from `{5,7,10,15,20,50,100}` for UX or `{5,10,20,50}` for 360, :113-117), and it is the **multiplier**.
5. **Pricing tier** (`Base`/`Markup`/`Agency`) — picks the row of the matrix (:150).

**The formula (gate A2, resolved):**

```
line_acv = PPB(skuKey, pricingTier, band) × brand_markets      rounded to 2dp   (:165-166)
pricing_basis = "ppb_x_brands"                                                  (:168)
```

Explicitly **not** the band `Sub` total — `sub` is returned for reporting only (:159) and never used in the calculation (:28-30).

**Live confirmation (COQL, 2026-08-18):** Quote `991103000002933005` "Flutter UK & Ireland - Jurnii 360 (Renewal)" — brands 8, frequency `1x per day`, tier Base → band 10, PPB 9,676.80 → 9,676.80 × 8 = **77,414.40**; live `Grand_Total` = 77,414 and `Contract_ACV` = 77,414. The formula is live-correct.

Two facts the owner should know about the tier that *does* price:
- **Only `Base` is reachable from automation.** Four of the five call sites hardcode `"Base"` (`processDeal:953`, `:1072`, `:1349`; `handleTaskCompletion:1178`); only `processDeal:926` passes a real value, and only by echoing the line's existing tier. `_util_normalizeToProductQuoteTuples:124` and `:197-198` hardcode `tier = "Base"` at import, so a Markup/Agency contract loses its tier on the way in. The Markup and Agency rows of the matrix are currently dead.
- **The 360 Markup and Agency rows are identical to Base** in both the CSV (`price_model.csv:9-21`, columns 8-11) and the code (`:136-145`) — 360 has no channel uplift. Only UX does.

### A.2 What Company Tier actually determines

**A target ACV benchmark, and nothing else.** The mapping is hardcoded, identically, in four places:

```
Company_Tier "1" -> 26000     "2" -> 16500     "3" -> 10500     else -> 0
```
`processDeal:1225-1227` (import), `processDeal:1695-1697` (scaffold), `processDeal:2325-2327` (Deal.Amount fallback), `_util_applyQuoteLifecycle:71-74` (successor Renewal).

It is a per-**Account** attribute (`V6_FIELD_USE_CONTRACT.md:249`, "Authoritative pricing input", populated 371/372 — T1 91, T2 59, T3 221). `Deals.Company_Tier` is a **cache with zero behavioural readers**: `processDeal:2284-2289` reads it only to decide whether to refresh the mirror, and §8b reads `accRec.Company_Tier` live (`processDeal:2324`). `V6_FIELD_USE_CONTRACT.md:320` already rules `Deals.Company_Tier` → **RETIRE**.

The benchmark is a **goal**, not a price: `Quotes.Quote_ACV_Gap` is a formula field = `Quote_Target_ACV − Contract_ACV`, and it goes negative on good deals (live: Betsson 360 Acquisition, Target 26,000, Contract 65,280, Gap **−39,280**). That is a benchmark-vs-actual variance report, which is exactly what a target is for and exactly what a price is not.

### A.3 Where the pre-Quote Target ACV is stored and reported

Two distinct storage locations, both live:

1. **`Quotes.Quote_Target_ACV`** (currency) — the per-Quote benchmark. Written at `processDeal:1507` (import update), `processDeal:1545` (import create), `processDeal:1715` (acquisition scaffold), `_util_applyQuoteLifecycle:193` (successor Renewal). **Never read back by any Deluge code** — grep across `zoho-functions/**/*.deluge` returns writes only. It is reported through the formula field **`Quotes.Quote_ACV_Gap`** = Target − `Contract_ACV`. Live population: 125/125 per `V6_FIELD_USE_CONTRACT.md:118`; live sample confirms values 0 / 10500 / 16500 / 26000.

2. **`Deals.Amount`** — where the benchmark is currently laundered into a **valuation**. `processDeal:2318-2336`: when the Deal is Open, `effectiveOppType ∈ {MQL, SQL, FTP}`, and `totalAmount == 0` (no priced open Quote), `Amount` is set directly to the tier benchmark and `amountBasis = "target_acv_pipeline"`. Live confirmation: `888 GCC - Jurnii UX` Tier 2 → `Amount` 16,500; `Macau Sporting Club - Jurnii UX` Tier 3 → 10,500; `Bally's Interactive - Jurnii 360` Tier 1 → 26,000. **These Deal Amounts are benchmarks displayed as pipeline value.**

There is **no** `Deals.Target_ACV` field and no separate Deal-level benchmark field — the benchmark and the valuation share one column, which is the reporting defect.

The **full Amount precedence** (`processDeal:2292-2351`), in order:
1. `Opportunity_State == "Lost"` → **0** (`lost_override`, :2308-2312)
2. `totalAmount > 0` → sum of open Quote totals (`quote_sum`, :2313-2317)
3. Open + `{MQL,SQL,FTP}` + no priced Quote → **Company-Tier benchmark** (`target_acv_pipeline`, :2318-2336); if the tier is blank → 0 + Manual Review `[pipeline_target_acv_unresolved]`
4. Open `RTP` + no priced Quote → **0** (`rtp_no_quote_zero`, :2337-2348) + Manual Review `[rtp_missing_commercial_evidence]`, with the correct comment "Target ACV is a benchmark, not an RTP renewal value" (:2346)
5. otherwise → 0

And `totalAmount` itself (`processDeal:1852-1863`) is **Contract_ACV-first**: `Contract_ACV > 0` wins, else `Grand_Total`, else `Sub_Total`. So the pricing matrix's output (`List_Price` → `Grand_Total`) is only consulted when `Contract_ACV` is empty. `Closed Won` and `Closed Lost` Quotes are excluded from the sum (:1849).

Step 4 already states the correct principle. **Step 3 contradicts step 4** — the same benchmark that is explicitly forbidden as an RTP value is used as an MQL/SQL/FTP value. `V6_FIELD_USE_CONTRACT.md:366` (R6, owner ruling 2026-08-17) confirms: `Deal.Amount` must never be computed from an Account tier directly; the target shape is Quote line price → Quote total → `Deal.Amount` roll-up.

One caution on R6's own wording: it says "the banded tier matrix ... is a Quote-line pricing input". The **banded matrix rows** are `Base/Markup/Agency` (Pricing Tier), which is *already* a line-pricing input. `Company_Tier` 1/2/3 is a **different field** that is not in the matrix at all and should not be described as feeding it. The benchmark should stay a benchmark (`Quote_Target_ACV` + `Quote_ACV_Gap`) and simply stop being written to `Deals.Amount`.

### A.4 Can a Quote exist with a Product but insufficient pricing evidence? — Yes, by design, and here is what it looks like

**Yes.** Nothing gates Quote creation on priceability. Three code paths create a Quote with `Quote_Product` set and no price:

- **Acquisition scaffold** — `processDeal:1699-1723` builds one `Quoted_Items` line with `Quantity: 1`, `Quoted_Item_Pricing_Tier: "Base"`, and **`List_Price: 0`** (explicitly, ":1703 // List_Price 0 so Zoho does not inherit the Product Unit_Price and fabricate a total"), `Contract_ACV: 0` (:1721), and `Quote_Target_ACV: scafTarget` (:1715). It never calls `resolveQuoteLinePrice` — there is no brand count at scaffold time.
- **Successor Renewal** — `_util_applyQuoteLifecycle:180` sets `List_Price: 0` identically. Also never calls the pricer.
- **Priced paths that fail** — `processDeal:926`/`953`/`1072`/`1349` and `handleTaskCompletion:1178` call `resolveQuoteLinePrice`, and on `valid=false` set **no** `List_Price` at all and raise Manual Review `pricing_unavailable` (`processDeal:931-936`, `:958-963`). The gate is `if(effBrands != "" && effBrands != "null" …)` — **with no brand count the pricer is never even called** (`processDeal:924`, `:951`, `:1347`).

**The 74 zero-priced Draft Quotes — live-verified explanation (COQL, 2026-08-18):**

There are exactly **86** Draft Quotes org-wide. **12** carry a price. **74** have `Grand_Total = 0`. And the decisive fact:

> **74 of 74 zero-priced Draft Quotes have `Quote_Plan_Brands = null`. Every single one. Zero exceptions.**

Meanwhile all 12 priced Drafts carry a brand count (5, 5, 5, 6, 6, 8, 8, 8, 12, 20, 31, and Flutter's 8). The correlation is total: **brand count present ⇒ priced; brand count absent ⇒ zero.** `_util_resolveQuoteLinePrice:58` (`if(brands <= 0) { reason = "missing_brand_count"; return; }`) is the single upstream cause, and the callers' `if(effBrands != "")` guards mean the pricer usually is not reached at all.

The 74 break into three shapes:

| shape | count | `Contract_ACV` | what it is |
| --- | --- | --- | --- |
| Acquisition scaffold | **65** | 0 | `processDeal:1699-1723` placeholder — a Quote created to hold the product slot before any commercial conversation. Zero is **correct and intentional** here. e.g. `Hippodrome Casino - Jurnii UX (Acquisition scaffold)`, `Macau Sporting Club - Jurnii Cortex (Acquisition scaffold)` |
| imported Renewal | **8** | **> 0** | e.g. `Neatplay - Jurnii UX (Renewal)` `Contract_ACV` 23,350 with `Grand_Total` 0; also iBet 6,480 / Honore 8,300 / River Tech 1,750 / 45 Group 7,440 / Tombola 10,500 / Get's Bet 5,981.75 / GAMING1 11,000. **These are not valueless** — the negotiated ACV is on the Quote; only the *line* is unpriced, because import supplied ACV but no brand count (`processDeal:1347-1357` → `calcReason = "missing_brand_count"`, then `:1366` imported ACV wins and is written to `Contract_ACV`) |
| Expansion | **1** | `null` | `SuperBet - Jurnii UX (Expansion)` — `Quote_Plan_Type` Fixed, no brands, no ACV. Genuinely empty |

**Practical consequence:** because `processDeal:1860` is Contract_ACV-first, those 8 imported Renewals **do** contribute to `Deals.Amount` despite `Grand_Total = 0`. The 65 scaffolds and the 1 empty Expansion contribute nothing, which correctly pushes their Deals into the `target_acv_pipeline` branch at `:2318` — and that is precisely how a Company-Tier benchmark ends up displayed as a Deal's pipeline value. **The 74 zero-priced Drafts and the tier-as-Amount defect are the same phenomenon seen from two ends.**

**The fix is a data fix, not a pricing-engine fix.** `_util_resolveQuoteLinePrice` computes correctly whenever it is given a brand count (Flutter proves it live). Supply `Quote_Plan_Brands` / `Quoted_Item_Plan_Brands` and 74 becomes a small number. Two residual code issues remain: Jurnii Cortex has no matrix row and can never be auto-priced (`:100-104`), and `Grand_Total` disagrees with `Contract_ACV` on some priced Drafts (Tombola 29,400 vs 58,800; Betsson 45,570 vs 136,710), which the Contract_ACV-first rule currently masks.

---
---

# (B) LEADING-CONTACT SELECTION

### B.1 The exact current ordering

The final write is two lines (`processDeal:2144-2148`):

```
2144    dealContactId = furthestContactId;
2145    if(ctrlContactId != "") { dealContactId = ctrlContactId; }
2146    if(dealContactId != "")
2148        if(dealContactId != currentPrimaryId) { dUpd.put("Contact_Name", dealContactId); }
```

**The Quote-derived contact wins.** `furthestContactId` is only the fallback, used when `ctrlContactId` is empty — i.e. when no open Quote on the Deal carries a `Contact_Name`.

**Selector 1 (winner) — `ctrlContactId`, the controlling Quote's Contact.** Derived inside the Amount loop, `processDeal:1830-1887`:

- Universe: the Deal's Quotes, **excluding** `Closed Lost` and `Closed Won` (`:1849 continue`).
- Rank: `qStageRankMap = {"Draft":1, "Negotiation":2, "On Hold":2, "Delivered":3, "Confirmed":4, "Closed Won":5}` (`:1833`). Unknown stages default to rank 0 (`:1880`).
- Selection (`:1881`): `if(qRank > ctrlContactRank || (qRank == ctrlContactRank && dqId.toLong() > ctrlContactQuoteId))`
  - **Primary key:** highest Quote_Stage rank.
  - **Tie-break 1:** **higher Quote record id wins.** Zoho ids are monotonically increasing, so this is a **recency tie-break by proxy** — the most recently created Quote at the same stage wins.
- There is **no** role input and **no** Contact-Stage input in this path at all.

**Selector 2 (fallback) — `furthestContactId`, the furthest-stage open Contact.** Derived in two steps:

*Step 2a, build the candidate set (`processDeal:322-338`):*
- `stageRanks = {"Marketing Consent":1, "Demo Booking":2, "Demo Confirmation":3, "Demo Hosted":4, "Proposal Preparation":5, "Commercial Agreement":6, "Onboarding":7, "Renewal":8}` (`:119`).
- Only Contacts with `State == "Open"` are considered (`:322`).
- Strict `>` keeps the running max and **resets** the list; `==` appends (`:328-338`). So `openContactIdsAtMax` = every Open Contact tied at the maximum Contact `Stage` rank.
- A missing/unknown Stage defaults to rank 1 (`:326`).

*Step 2b, break the tie (`processDeal:528-556`):*
- Single candidate → taken directly (`:531-534`).
- Multiple candidates → `roleRanks = {"Decision Maker": 3, "End User": 2, "Influencer": 1}` (`:537`), and per candidate (`:540-553`):
  - `cRole_tie = ifnull(contactRoleMap.get(cId_tie), "Decision Maker")` — **a missing role defaults to Decision Maker** (`:542`).
  - `cRoleRank = ifnull(roleRanks.get(cRole_tie), 3)` — **an unrecognised role also defaults to rank 3, the highest** (`:543`).
  - `if(cRoleRank > bestRoleRank)` → new winner (strict `>`, so on an exact tie the **first candidate in related-list iteration order** holds).
  - `else if(cRoleRank == bestRoleRank && isCurrentPrimary)` → **incumbency tie-break**: the Deal's existing `Contact_Name` is retained when tied on role rank (`:550-553`).

So the full fallback ordering is: **Contact Stage rank → Contact role rank → incumbency (current `Contact_Name` retained) → related-list iteration order.**

`primaryContactId` (used for gates and Manual Review targeting elsewhere) is derived separately at `:560-561`: current primary, overwritten by `furthestContactId` whenever that is non-empty — so `primaryContactId` and `dealContactId` can **disagree** whenever `ctrlContactId` is set.

### B.2 Verdict on the owner's statement

> *"selects furthest Stage first, uses role only as a tie-break, and has NO recency tie-break."*

**REFUTED as a description of the leading-Contact selection as a whole.** Precisely:

| claim | verdict | evidence |
| --- | --- | --- |
| "selects furthest Stage first" | **REFUTED.** The **primary** selector is the controlling **Quote's** Contact, ranked by `Quote_Stage`. Furthest **Contact** Stage is only the fallback when no open Quote carries a Contact. | `processDeal:2144-2145` — `furthestContactId` is assigned then **overwritten** by `ctrlContactId` |
| "uses role only as a tie-break" | **CONFIRMED, for the fallback path only.** Role never enters the Quote path. | `:537-549` vs `:1830-1887` (no role read) |
| "has NO recency tie-break" | **REFUTED.** The Quote path tie-breaks on **higher Quote record id = most recently created Quote**. | `:1881` `dqId.toLong() > ctrlContactQuoteId` |

**The statement is accurate only if scoped to the `furthestContactId` fallback** — and even there it is incomplete, because it omits the **incumbency tie-break** at `:550-553` (the current `Contact_Name` is retained on a role-rank tie) and the implicit **related-list-order** tie-break that decides a full tie.

### B.3 Defects found in this selection while reading the body

1. **`"Closed Won": 5` in `qStageRankMap` (`:1833`) is dead.** Closed Won Quotes are `continue`d at `:1849` before reaching the ranking code at `:1876-1887`. The highest reachable rank is `Confirmed` = 4.
2. **A role-less Contact outranks nothing and ties with a real Decision Maker.** Both `ifnull` defaults at `:542` and `:543` resolve to the **top** rank (3), so blank/unknown roles are treated as maximally authoritative — the opposite of a safe default.
3. **The tie-break reads a different field than the function maintains.** `contactRoleMap` is populated from `Contacts.Contact_Role1` (`:218`), while §3 of the same function writes roles to the Deal's **`Contact_Roles`** related list (`:509`). The two can diverge, and the tie-break trusts the one this function does not own.
4. **`Draft` (1) can win.** With only Draft Quotes on a Deal, the newest Draft's Contact becomes `Contact_Name` — including a zero-priced acquisition **scaffold** Quote created by `processDeal:1699-1723`, whose `Contact_Name` is `sourceContactId` or `primaryContactId` (`:1717-1720`). So an automation-generated placeholder can determine the Deal's leading Contact.
5. **`Negotiation` and `On Hold` both rank 2** (`:1833`), so an on-hold Quote ties with an active negotiation and the newer id wins.

---

## Cross-cutting notes

- **All 17 listed helpers exist.** No helper exists in `v6/activity/` that is absent from the list. `_util_collectLegacyQuoteEvidence` was folded into `_util_normalizeToProductQuoteTuples:62-129` on 2026-07-16 and is correctly gone.
- **Retire with the model (product-Deal only): 2 of 17** — `_util_createOrReuseProductDeal` (rename/rewrite to Account-keyed) and `_util_pipelineForProductKey` (delete; re-home the Partnership hold-out onto a direct `Deals.Pipeline` read). Both already carry matching CRUD-plan verdicts.
- **Survive with edits: 5** — `_util_applyQuoteLifecycle`, `_util_resolveDealPipeline`, `_util_rollupAccountState`, `_util_collectProductEvidence`, `_util_normalizeToProductQuoteTuples`.
- **Survive unchanged or near-unchanged: 10** — `buildQuoteSubject`, `calculateBusinessDate`, `computeProductKey`, `logAutomationEvent`, `matchDraftQuotes`, `resolveActivityLoss`, `resolveDealProduct`, `resolveManualReviewCode`, `resolveOpenerVariant`, `resolveQuoteLinePrice`.
- **False header comment confirmed:** `_util_resolveDealPipeline.deluge:11-13` claims `Deals.Pipeline` is unreadable. Live COQL 2026-08-18 returns it populated (`B2B`) on every Deal sampled. The in-Deluge-runtime claim specifically is UNVERIFIED (I ran no Deluge), but the field is demonstrably readable over COQL, matching `V6_CRUD_PLAN:274`.
- **Three unverified live-config items** carried forward: `Accounts.State` / `Accounts.Account_Status` picklist options (`_util_rollupAccountState` file :104-106 flags this itself), the live registration state of the 17 helpers (`V6_CRUD_PLAN:254` — `GET /settings/functions` 500s), and whether `Deals.Pipeline` reads blank *inside* the Deluge runtime specifically.

---

