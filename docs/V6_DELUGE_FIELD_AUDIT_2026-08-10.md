# v6 Deluge — Field Requirement Audit

**Date:** 2026-08-10  
**Scope:** every `.deluge` file under `zoho-functions/v6/` (38 functions, ~11,500 lines)  
**Field authority:** live Zoho CRM metadata pulled for this audit via `getFields` on Leads, Contacts, Accounts, Deals, Quotes, Products, Tasks, Calls, Events. The `.agents/context/api_field_names/*.csv` exports are stale (79 live Lead fields and 36 live Quote fields have no CSV row) and were **not** used to decide field existence or labels.

---

## 1. Summary

- **248 distinct (module, field) pairs** are read or written by v6 Deluge.
- **149** of them are written; the rest are read-only dependencies.
- **12 field names are phantom** — referenced in a field position but absent from live metadata for the module they are used against. Zoho ignores unknown `api_name`s silently (no error), so every one of these is a silent no-op. See §5.
- **2 workflow rules are bound to a Deal date field no v6 code ever writes** (`WF010d`, and legacy `WF004`), so they cannot fire from automation. See §5.2.
- Counts by module:

| Module | Fields used | Written | Read-only |
| --- | ---: | ---: | ---: |
| Leads | 65 | 2 | 63 |
| Contacts | 36 | 29 | 7 |
| Accounts | 19 | 19 | 0 |
| Deals | 34 | 31 | 3 |
| Quotes | 23 | 21 | 2 |
| Products | 6 | 2 | 4 |
| Tasks | 23 | 17 | 6 |
| Calls | 22 | 21 | 1 |
| Events (Meetings) | 17 | 7 | 10 |
| Notes | 1 | 0 | 1 |
| Polymorphic activity reads | 2 | 0 | 2 |
| **Total** | **248** | **149** | **99** |

---

## 2. Workflow rules → Deluge entry points

| WF | Module | Trigger | Deluge function | Notes |
| --- | --- | --- | --- | --- |
| `WF001a` | Leads | create_or_edit (repeat) | `processLead` | Auto-converts the Lead; builds the Contact–Account–Deal graph. |
| `WF001b0` | Contacts | field_update (Stage / State / Status / Contact_Role1 / Account_Name) | `processContact` | Contact normalization + sequence activation. |
| `WF001b2` | Contacts | create | `processContact` | Same entry point, fired on Contact create. |
| `WF001c` | Accounts | create_or_edit (repeat) | `processAccount` | Per-product Deal dedupe + Account rollup. |
| `WF001d` | Deals | create_or_edit (repeat) | `processDeal(id, "{}")` | Reconcile-only; never creates a Quote. |
| `WF006` | Calls | create_or_edit | `handleCallOutcome` | Reads Call state fields + Product picklist evidence. |
| `WF007` | Events | create_or_edit | `handleMeetingEvent` | Meeting is source of truth; infers type from Meeting_Task_Stage. |
| `WF008` | Tasks | create_or_edit | `handleTaskCompletion` | Canonical Task command fields; drives activation. |
| `WF009a` | Emails | outgoing · replied | `handleEmailReplied → handleEmailEvent` | Thin wrapper. |
| `WF009b` | Emails | outgoing · bounced | `handleEmailBounced → handleEmailEvent` | Thin wrapper. |
| `WF009c` | Emails | outgoing · unreplied | `handleEmailNotReplied → handleEmailEvent` | Thin wrapper. |
| `WF009d` | Emails | outgoing · opened, not replied | `handleEmailOpenedNotReplied → handleEmailEvent` | Thin wrapper. |
| `WF009e` | Emails | outgoing · clicked | `handleEmailClicked → handleEmailEvent` | Thin wrapper. |
| `WF010c` | Deals | date-based on `Demo_Reminder_Send_At` | `sendDemoReminder` | Date WFs cannot bind to Events, so the Deal carries the date. |
| `WF010d` | Deals | date-based on `Next_Comm_Follow_Up_Date` | `sendCommercialFollowUp` | Commercial follow-up cadence. |
| `WF021` | Quotes | create_or_edit | `handleQuoteStageChange` | Supersedes WF020 stage-change rule. |
| `WFC-SchedEmail` | Tasks | date-based on `Due_Date` | `sendScheduledEmailFromTask` | Scheduled cadence sends. |

> `WF020` (legacy Quote stage-change) and `WF004` (legacy `Commercials_Status`) are back-compat rules being retired in favour of `WF021`; they bind to the same Quote/Deal fields listed below.

### Helper functions and the rules that reach them

Fields marked *"— (helper only)"* in the tables below are never touched directly by a WF-entry function; use this map to see which rules reach them.

| Helper | Reached from |
| --- | --- |
| `routeContactSequence` | WF006, WF007, WF008, WF009a–e, WF010d, WF001d |
| `sendSequencedEmail` | WF001d, WF010c, WFC-SchedEmail, + all routers |
| `createAuxTask` | WF001d, WF006, WF007, WF008, WF009a–e |
| `createManualReview` | WF001a, WF001b, WF001d, WF007, WF008 |
| `normalizeToProductQuoteTuples` | WF001a, WF001b, WF001c |
| `collectProductEvidence` | WF001a, WF001b, WF001c (via normalizeToProductQuoteTuples) |
| `createOrReuseProductDeal` | WF001a, WF001b, WF001c |
| `applyQuoteLifecycle` | WF001d (via processDeal) |
| `matchDraftQuotes` | WF008 |
| `resolveQuoteLinePrice` | WF001d, WF008 |
| `resolveActivityLoss` | WF006, WF007, WF008 |
| `rollupAccountState` | WF001a, WF001c, WF001d |
| `resolveDealProduct` | WF001a, WF001b, WF001c, WF001d |
| `resolveDealPipeline` | WF001b, WF006, WF007, + helpers |
| `buildQuoteSubject / computeProductKey / pipelineForProductKey / calculateBusinessDate / resolveManualReviewCode / resolveOpenerVariant / logAutomationEvent` | pure helpers — no CRM field reads of their own beyond arguments |

---

## 3. Field requirement tables

**Access** — `R` read, `W` written, `R+W` both.  
**WF** — workflow rules whose *entry* function touches the field directly. `— (helper only)` means it is only touched inside a shared helper (see §2).  
**Deluge** — the functions that reference the field directly.

### 3.1 Leads — 65 fields

| Field Label | API Name | Type | Custom | Access | WF | Deluge function(s) |
| --- | --- | --- | --- | --- | --- | --- |
| Acquisition Quote ACV | `Acquisition_Quote_ACV` | currency | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Acquisition Quote Contract Date End | `Acquisition_Quote_Contract_Date_End` | date | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Acquisition Quote Contract Date Renewal | `Acquisition_Quote_Contract_Date_Renewal` | date | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Acquisition Quote Contract Date Start | `Acquisition_Quote_Contract_Date_Start` | date | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Acquisition Quote Plan Brands | `Acquisition_Quote_Plan_Brands` | integer | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Acquisition Quote Plan Frequency | `Acquisition_Quote_Plan_Frequency` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Acquisition Quote Plan Products | `Acquisition_Quote_Plan_Products` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Acquisition Quote Plan Type | `Acquisition_Quote_Plan_Type` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Acquisition Quote Stage | `Acquisition_Quote_Stage` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Company | `Company` | text | native | R | WF001a | `processLead` |
| Company AOO Continent | `Company_AOO_Continent` | multi-picklist | custom | R | WF001a | `processLead` |
| Company AOO Country | `Company_AOO_Country` | multi-picklist | custom | R | WF001a | `processLead` |
| Company AOO Region | `Company_AOO_Region` | multi-picklist | custom | R | WF001a | `processLead` |
| Company AOO Sub Region | `Company_AOO_Sub_Region` | multi-picklist | custom | R | WF001a | `processLead` |
| Company Expansion  Continent | `Company_Expansion_Continent` | multi-picklist | custom | R | WF001a | `processLead` |
| Company Expansion Country | `Company_Expansion_Country` | multi-picklist | custom | R | WF001a | `processLead` |
| Company Expansion Region | `Company_Expansion_Region` | multi-picklist | custom | R | WF001a | `processLead` |
| Company Expansion Regional | `Company_Expansion_Regional` | boolean | custom | R | WF001a | `processLead` |
| Company Expansion Sub Region | `Company_Expansion_Sub_Region` | multi-picklist | custom | R | WF001a | `processLead` |
| Company Expansion Timeline | `Company_Expansion_Timeline` | date | custom | R | WF001a | `processLead` |
| Company Tier | `Company_Tier` | picklist | custom | R | WF001a | `processLead` |
| Contact AOR Continent | `Contact_AOR_Continent` | multi-picklist | custom | R | WF001a | `processLead` |
| Contact AOR Country | `Contact_AOR_Country` | multi-picklist | custom | R | WF001a | `processLead` |
| Contact AOR Region | `Contact_AOR_Region` | multi-picklist | custom | R | WF001a | `processLead` |
| Contact AOR Regional | `Contact_AOR_Regional` | boolean | custom | R | WF001a | `processLead` |
| Contact AOR Sub Region | `Contact_AOR_Sub_Region` | multi-picklist | custom | R | WF001a | `processLead` |
| Contact Completed Commercial Agreement At | `Contact_Completed_Commercial_Agreement_At` | datetime | custom | R | WF001a | `processLead` |
| Contact Completed Demo Booking At | `Contact_Completed_Demo_Booking_At` | datetime | custom | R | WF001a | `processLead` |
| Contact Completed Demo Confirmation At | `Contact_Completed_Demo_Confirmation_At` | datetime | custom | R | WF001a | `processLead` |
| Contact Completed Demo Hosted At | `Contact_Completed_Demo_Hosted_At` | datetime | custom | R | WF001a | `processLead` |
| Contact Completed Marketing Qualification At | `Contact_Completed_Marketing_Qualification_At` | datetime | custom | R | WF001a | `processLead` |
| Contact Completed Onboarding At | `Contact_Completed_Onboarding_At` | datetime | custom | R | WF001a | `processLead` |
| Contact Completed Proposal Preparation At | `Contact_Completed_Proposal_Preparation_At` | datetime | custom | R | WF001a | `processLead` |
| Contact Completed Renewal At | `Contact_Completed_Renewal_At` | datetime | custom | R | WF001a | `processLead` |
| Contact Marketing Consent | `Contact_Marketing_Consent` | boolean | custom | R | WF001a | `processLead` |
| Contact Role | `Contact_Role1` | picklist | custom | R+W | WF001a | `processLead` |
| Contact Email Primary | `Email` | email | native | R | WF001a | `processLead` |
| Expansion Quote ACV | `Expansion_Quote_ACV` | currency | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Expansion Quote Contract Date End | `Expansion_Quote_Contract_Date_End` | date | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Expansion Quote Contract Date Renewal | `Expansion_Quote_Contract_Date_Renewal` | date | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Expansion Quote Contract Date Start | `Expansion_Quote_Contract_Date_Start` | date | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Expansion Quote Plan Brands | `Expansion_Quote_Plan_Brands` | integer | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Expansion Quote Plan Frequency | `Expansion_Quote_Plan_Frequency` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Expansion Quote Plan Products | `Expansion_Quote_Plan_Products` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Expansion Quote Plan Type | `Expansion_Quote_Plan_Type` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Expansion Quote Stage | `Expansion_Quote_Stage` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Imported Record Type | `Imported_Record_Type` | picklist | custom | R | WF001a | `processLead` |
| Job Title | `Job_Title` | picklist | custom | R | WF001a | `processLead` |
| Job Title Raw | `Job_Title_Raw` | text | custom | R | WF001a | `processLead` |
| Lead Referrer | `Lead_Referrer` | text | custom | R | WF001a | `processLead` |
| Lead Source | `Lead_Source` | picklist | native | R | WF001a | `processLead` |
| Lost Reasons | `Lost_Reasons` | picklist | custom | R | WF001a | `processLead` |
| Company Phone | `Phone` | phone | native | R | WF001a | `processLead` |
| Product Interest | `Product_Interest` | multi-picklist | custom | R+W | WF001a, WF001d, WF008 | `collectProductEvidence`, `handleTaskCompletion`, `processDeal`, `processLead` |
| Renewal Quote ACV | `Renewal_Quote_ACV` | currency | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Renewal Quote Contract Date End | `Renewal_Quote_Contract_Date_End` | date | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Renewal Quote Contract Date Renewal | `Renewal_Quote_Contract_Date_Renewal` | date | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Renewal Quote Contract Date Start | `Renewal_Quote_Contract_Date_Start` | date | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Renewal Quote Plan Brands | `Renewal_Quote_Plan_Brands` | integer | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Renewal Quote Plan Frequency | `Renewal_Quote_Plan_Frequency` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Renewal Quote Plan Products | `Renewal_Quote_Plan_Products` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Renewal Quote Plan Type | `Renewal_Quote_Plan_Type` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Renewal Quote Stage | `Renewal_Quote_Stage` | picklist | custom | R | — (helper only) | `normalizeToProductQuoteTuples` |
| Stage | `Stage` | picklist | custom | R | WF001a | `processLead` |
| Company Website | `Website` | website | native | R | WF001a | `processLead` |

### 3.2 Contacts — 36 fields

| Field Label | API Name | Type | Custom | Access | WF | Deluge function(s) |
| --- | --- | --- | --- | --- | --- | --- |
| Account Name | `Account_Name` | lookup | native | R+W | WF001a, WF001b | `processContact`, `processLead`, `routeContactSequence` |
| Contact AOR Continent | `Contact_AOR_Continent` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Contact AOR Country | `Contact_AOR_Country` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Contact AOR Region | `Contact_AOR_Region` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Contact AOR Regional | `Contact_AOR_Regional` | boolean | custom | R+W | WF001a | `processLead` |
| Contact AOR Sub Region | `Contact_AOR_Sub_Region` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Contact Completed Commercial Agreement At | `Contact_Completed_Commercial_Agreement_At` | datetime | custom | R+W | WF001a, WF001d | `processDeal`, `processLead` |
| Contact Completed Demo Booking At | `Contact_Completed_Demo_Booking_At` | datetime | custom | R+W | WF001a, WF001d | `processDeal`, `processLead` |
| Contact Completed Demo Confirmation At | `Contact_Completed_Demo_Confirmation_At` | datetime | custom | R+W | WF001a, WF001d | `processDeal`, `processLead` |
| Contact Completed Demo Hosted At | `Contact_Completed_Demo_Hosted_At` | datetime | custom | R+W | WF001a, WF001d | `processDeal`, `processLead` |
| Contact Completed Marketing Qualification At | `Contact_Completed_Marketing_Qualification_At` | datetime | custom | R+W | WF001a, WF001d | `processDeal`, `processLead` |
| Contact Completed Onboarding At | `Contact_Completed_Onboarding_At` | datetime | custom | R+W | WF001a, WF001d | `processDeal`, `processLead` |
| Contact Completed Proposal Preparation At | `Contact_Completed_Proposal_Preparation_At` | datetime | custom | R+W | WF001a, WF001d | `processDeal`, `processLead` |
| Contact Completed Renewal At | `Contact_Completed_Renewal_At` | datetime | custom | R+W | WF001a, WF001d | `processDeal`, `processLead` |
| Contact Role | `Contact_Role1` | picklist | custom | R+W | WF001a, WF001b, WF001d | `processContact`, `processDeal`, `processLead` |
| Email | `Email` | email | native | R | WF001a, WF001b | `processContact`, `processLead`, `sendSequencedEmail` |
| First Name | `First_Name` | text | native | R | WF001b | `processContact` |
| Full Name | `Full_Name` | text | native | R | WF001b | `processContact` |
| Job Title | `Job_Title` | picklist | custom | R+W | WF001a, WF001b, WF001d | `processContact`, `processDeal`, `processLead` |
| Job Title Raw | `Job_Title_Raw` | text | custom | R+W | WF001a, WF001b, WF001d | `processContact`, `processDeal`, `processLead` |
| Last Name | `Last_Name` | text | native | R | WF001b | `processContact` |
| Lead Referrer | `Lead_Referrer` | text | custom | R+W | WF001a | `processLead` |
| Lead Source | `Lead_Source` | picklist | native | R | WF001b | `processContact` |
| Lost Reasons | `Lost_Reasons` | picklist | custom | R+W | WF001a | `processLead`, `routeContactSequence` |
| Marketing Consent | `Marketing_Consent` | boolean | custom | R+W | WF001a | `processLead` |
| Contact Owner | `Owner` | lookup | native | R | WF001b | `processContact` |
| Phone | `Phone` | phone | native | R+W | WF001a | `processLead` |
| Products Linked | `Products_Linked` | multi-lookup | custom | R | WF001d | `collectProductEvidence`, `processDeal` |
| Sequence Activated At | `Sequence_Activated_At` | datetime | custom | R+W | WF008 | `handleTaskCompletion`, `routeContactSequence`, `sendSequencedEmail` |
| Sequence Stage | `Sequence_Stage` | picklist | custom | R+W | WF006, WF008 | `handleCallOutcome`, `handleTaskCompletion`, `routeContactSequence` |
| Sequence State | `Sequence_State` | picklist | custom | R+W | WF001b, WF006, WF007, WF008, WF010d, WFC-SchedEmail | `handleCallOutcome`, `handleEmailEvent`, `handleMeetingEvent`, `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendCommercialFollowUp`, `sendScheduledEmailFromTask`, `sendSequencedEmail` |
| Sequence Step | `Sequence_Step` | picklist | custom | R+W | WF006, WF008 | `handleCallOutcome`, `handleTaskCompletion`, `routeContactSequence` |
| Sequence Type | `Sequence_Type` | picklist | custom | R+W | WF008 | `handleTaskCompletion`, `routeContactSequence`, `sendSequencedEmail` |
| Stage | `Stage` | picklist | custom | R+W | WF001a, WF001b, WF001d, WF006, WF007, WF008, WF010c | `handleCallOutcome`, `handleMeetingEvent`, `handleTaskCompletion`, `processContact`, `processDeal`, `processLead`, `routeContactSequence`, `sendDemoReminder` |
| State | `State` | picklist | custom | R+W | WF001a, WF001b, WF001d, WF008, WF010c, WF010d | `handleTaskCompletion`, `processContact`, `processDeal`, `processLead`, `routeContactSequence`, `sendCommercialFollowUp`, `sendDemoReminder` |
| Status | `Status` | picklist | custom | R+W | WF001a, WF001b, WF001d | `processContact`, `processDeal`, `processLead`, `routeContactSequence` |

### 3.3 Accounts — 19 fields

| Field Label | API Name | Type | Custom | Access | WF | Deluge function(s) |
| --- | --- | --- | --- | --- | --- | --- |
| Account Key | `Account_Key` | text | custom | R+W | WF001a, WF001b, WF001c, WF001d, WF007 | `handleMeetingEvent`, `processAccount`, `processContact`, `processDeal`, `processLead` |
| Account Name | `Account_Name` | text | native | R+W | WF001a, WF001b, WF001c, WF001d | `processAccount`, `processContact`, `processDeal`, `processLead` |
| Account Source Class | `Account_Source_Class` | picklist | custom | R+W | WF001a | `processLead` |
| Account Status | `Account_Status` | picklist | custom | W | — (helper only) | `rollupAccountState` |
| Company AOO Continent | `Company_AOO_Continent` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Company AOO Country | `Company_AOO_Country` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Company AOO Region | `Company_AOO_Region` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Company AOO Sub Region | `Company_AOO_Sub_Region` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Company Expansion Continent | `Company_Expansion_Continent` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Company Expansion Country | `Company_Expansion_Country` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Company Expansion Region | `Company_Expansion_Region` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Company Expansion Regional | `Company_Expansion_Regional` | boolean | custom | R+W | WF001a | `processLead` |
| Company Expansion Sub Region | `Company_Expansion_Sub_Region` | multi-picklist | custom | R+W | WF001a | `processLead` |
| Company Expansion Timeline | `Company_Expansion_Timeline` | date | custom | R+W | WF001a | `processLead` |
| Company Tier | `Company_Tier` | picklist | custom | R+W | WF001a, WF001d | `applyQuoteLifecycle`, `processDeal`, `processLead` |
| Phone | `Phone` | phone | native | R+W | WF001a | `processLead` |
| State | `State` | picklist | custom | R+W | WF001d | `processDeal`, `rollupAccountState` |
| Status | `Status` | picklist | custom | R+W | WF001d | `processDeal` |
| Website | `Website` | website | native | R+W | WF001a, WF001b, WF001c | `processAccount`, `processContact`, `processLead` |

### 3.4 Deals — 34 fields

| Field Label | API Name | Type | Custom | Access | WF | Deluge function(s) |
| --- | --- | --- | --- | --- | --- | --- |
| Account Name | `Account_Name` | lookup | native | R+W | WF001d, WF007, WF008 | `applyQuoteLifecycle`, `createOrReuseProductDeal`, `handleMeetingEvent`, `handleTaskCompletion`, `processDeal`, `routeContactSequence` |
| Amount | `Amount` | currency | native | R+W | WF001d | `processDeal` |
| Automation Suppressed | `Automation_Suppressed` | boolean | custom | R | WF001d, WF010c, WF010d | `handleEmailEvent`, `processDeal`, `sendCommercialFollowUp`, `sendDemoReminder` |
| Closing Date | `Closing_Date` | date | native | W | — (helper only) | `createOrReuseProductDeal` |
| Company Tier | `Company_Tier` | picklist | custom | R+W | WF001a, WF001d | `processDeal`, `processLead` |
| Contact Name | `Contact_Name` | lookup | native | R+W | WF001a, WF001d, WF007, WF010c, WF010d | `applyQuoteLifecycle`, `createManualReview`, `handleEmailEvent`, `handleMeetingEvent`, `processDeal`, `processLead`, `routeContactSequence`, `sendCommercialFollowUp`, `sendDemoReminder` |
| Contract Current ACV | `Contract_Current_ACV` | currency | custom | R+W | WF001d | `processDeal` |
| Contract Current Date End | `Contract_Current_Date_End` | date | custom | R+W | WF001d | `processDeal` |
| Contract Current Date Start | `Contract_Current_Date_Start` | date | custom | R+W | WF001d | `processDeal` |
| Contract Current Plan Brands | `Contract_Current_Plan_Brands` | integer | custom | W | WF001d | `processDeal` |
| Contract Current Plan Products | `Contract_Current_Plan_Products` | multi-picklist | custom | W | WF001d | `processDeal` |
| Contract Current Plan Type | `Contract_Current_Plan_Type` | picklist | custom | W | WF001d | `processDeal` |
| Contract Initial ACV | `Contract_Initial_ACV` | currency | custom | R+W | WF001d | `processDeal` |
| Contract Initial Date End | `Contract_Initial_Date_End` | date | custom | R+W | WF001d | `processDeal` |
| Contract Initial Date Start | `Contract_Initial_Date_Start` | date | custom | R+W | WF001d | `processDeal` |
| Contract Initial Plan Brands | `Contract_Initial_Plan_Brands` | integer | custom | W | WF001d | `processDeal` |
| Contract Initial Plan Products | `Contract_Initial_Plan_Products` | multi-picklist | custom | W | WF001d | `processDeal` |
| Contract Initial Plan Type | `Contract_Initial_Plan_Type` | picklist | custom | W | WF001d | `processDeal` |
| Deal Key | `Deal_Key` | text | custom | R+W | WF001c, WF001d, WF007 | `createOrReuseProductDeal`, `handleMeetingEvent`, `processAccount`, `processDeal`, `rollupAccountState` |
| Deal Name | `Deal_Name` | text | native | R+W | WF001c, WF001d, WF008 | `applyQuoteLifecycle`, `createOrReuseProductDeal`, `handleTaskCompletion`, `processAccount`, `processDeal` |
| Deal Primary Contact | `Deal_Primary_Contact` | lookup | custom | R | WF007 | `applyQuoteLifecycle`, `createManualReview`, `handleMeetingEvent` |
| Deal Product | `Deal_Product` | lookup | custom | R+W | WF001c, WF001d | `applyQuoteLifecycle`, `collectProductEvidence`, `createOrReuseProductDeal`, `processAccount`, `processDeal`, `rollupAccountState` |
| Deal Product Key | `Deal_Product_Key` | text | custom | R+W | WF001c, WF001d, WF007 | `collectProductEvidence`, `createOrReuseProductDeal`, `handleMeetingEvent`, `processAccount`, `processDeal`, `resolveDealPipeline`, `rollupAccountState`, `sendSequencedEmail` |
| Demo Reminder Send At | `Demo_Reminder_Send_At` | datetime | custom | W | WF007 | `handleMeetingEvent` |
| Description | `Description` | textarea | native | W | — (helper only) | `createOrReuseProductDeal` |
| Lead Source | `Lead_Source` | picklist | native | W | WF001a | `processLead` |
| Lost Reasons | `Lost_Reasons` | picklist | custom | R+W | WF001a, WF001d | `applyQuoteLifecycle`, `processDeal`, `processLead` |
| Opportunity Stage | `Opportunity_Stage` | picklist | custom | R+W | WF001d, WF008, WF010d | `createAuxTask`, `handleTaskCompletion`, `processDeal`, `rollupAccountState`, `sendCommercialFollowUp` |
| Opportunity State | `Opportunity_State` | picklist | custom | R+W | WF001a, WF001c, WF001d, WF010d | `applyQuoteLifecycle`, `createOrReuseProductDeal`, `processAccount`, `processDeal`, `processLead`, `rollupAccountState`, `routeContactSequence`, `sendCommercialFollowUp` |
| Opportunity Status | `Opportunity_Status` | picklist | custom | R+W | WF001a, WF001c, WF001d | `applyQuoteLifecycle`, `createOrReuseProductDeal`, `processAccount`, `processDeal`, `processLead` |
| Deal Owner | `Owner` | lookup | native | R | — (helper only) | `createAuxTask`, `routeContactSequence`, `sendSequencedEmail` |
| Opportunity Pipeline | `Pipeline` | picklist | native | W | — (helper only) | `createOrReuseProductDeal` |
| Reason For Loss | `Reason_For_Loss__s` | picklist | native | R+W | WF001c, WF001d | `processAccount`, `processDeal` |
| Opportunity Type | `Stage` | picklist | native | R+W | WF001b, WF001d, WF006, WF007, WF008 | `createAuxTask`, `createOrReuseProductDeal`, `handleCallOutcome`, `handleMeetingEvent`, `handleTaskCompletion`, `processContact`, `processDeal`, `routeContactSequence`, `sendSequencedEmail` |

### 3.5 Quotes — 23 fields

| Field Label | API Name | Type | Custom | Access | WF | Deluge function(s) |
| --- | --- | --- | --- | --- | --- | --- |
| Account Name | `Account_Name` | lookup | native | W | WF001d, WF008 | `applyQuoteLifecycle`, `handleTaskCompletion`, `processDeal` |
| Contact Name | `Contact_Name` | lookup | native | R+W | WF001d, WF008 | `applyQuoteLifecycle`, `handleTaskCompletion`, `processDeal` |
| Contract ACV | `Contract_ACV` | currency | custom | R+W | WF001d | `applyQuoteLifecycle`, `processDeal` |
| Contract Date End | `Contract_Date_End` | date | custom | R+W | WF001d, WF008 | `applyQuoteLifecycle`, `handleTaskCompletion`, `processDeal` |
| Contract Date Start | `Contract_Date_Start` | date | custom | R+W | WF001d, WF008 | `applyQuoteLifecycle`, `handleTaskCompletion`, `processDeal` |
| Contract Signed Date | `Contract_Signed_Date` | date | custom | R+W | WF001d | `processDeal` |
| Deal Name | `Deal_Name` | lookup | native | R+W | WF001d, WF008, WF021 | `applyQuoteLifecycle`, `handleQuoteStageChange`, `handleTaskCompletion`, `matchDraftQuotes`, `processDeal` |
| Grand Total | `Grand_Total` | formula | native | R | WF001d | `processDeal` |
| Opportunity Type | `Opportunity_Type` | picklist | custom | R+W | WF001d, WF008 | `applyQuoteLifecycle`, `handleTaskCompletion`, `matchDraftQuotes`, `processDeal` |
| Quote Applied Activity Keys | `Quote_Applied_Activity_Keys` | textarea | custom | R+W | WF001d, WF008 | `handleTaskCompletion`, `matchDraftQuotes`, `processDeal` |
| Quote Applied Lifecycle Keys | `Quote_Applied_Lifecycle_Keys` | textarea | custom | R+W | — (helper only) | `applyQuoteLifecycle` |
| Quote Contract Date Renewal | `Quote_Contract_Date_Renewal` | date | custom | W | WF001d | `applyQuoteLifecycle`, `processDeal` |
| Quote Last Deal ID | `Quote_Last_Deal_ID` | text | custom | R+W | WF001d, WF008, WF021 | `applyQuoteLifecycle`, `handleQuoteStageChange`, `handleTaskCompletion`, `processDeal` |
| Quote Plan Brands | `Quote_Plan_Brands` | integer | custom | W | WF001d | `processDeal` |
| Quote Plan Frequency | `Quote_Plan_Frequency` | picklist | custom | W | WF001d | `processDeal` |
| Quote Plan Type | `Quote_Plan_Type` | picklist | custom | W | WF001d | `processDeal` |
| Quote Product | `Quote_Product` | lookup | custom | R+W | WF001d, WF008 | `applyQuoteLifecycle`, `collectProductEvidence`, `handleTaskCompletion`, `matchDraftQuotes`, `processDeal` |
| Quote Stage | `Quote_Stage` | picklist | native | R+W | WF001d, WF008, WF010d | `applyQuoteLifecycle`, `handleTaskCompletion`, `matchDraftQuotes`, `processDeal`, `rollupAccountState`, `sendCommercialFollowUp` |
| Quote Target ACV | `Quote_Target_ACV` | currency | custom | W | WF001d | `applyQuoteLifecycle`, `processDeal` |
| Quote Type | `Quote_Type` | picklist | custom | R+W | WF001d | `applyQuoteLifecycle`, `processDeal` |
| Quoted Items | `Quoted_Items` | subform | native | R+W | WF001d, WF008 | `applyQuoteLifecycle`, `handleTaskCompletion`, `matchDraftQuotes`, `processDeal` |
| Sub Total | `Sub_Total` | formula | native | R | WF001d | `processDeal` |
| Subject | `Subject` | text | native | W | WF001d, WF008 | `applyQuoteLifecycle`, `handleTaskCompletion`, `processDeal` |

### 3.6 Products — 6 fields

| Field Label | API Name | Type | Custom | Access | WF | Deluge function(s) |
| --- | --- | --- | --- | --- | --- | --- |
| Contacts | `Contacts` | multi-lookup | custom | R+W | WF001a, WF001d, WF008 | `handleTaskCompletion`, `processDeal`, `processLead` |
| Product Active | `Product_Active` | boolean | native | R | WF001d, WF008 | `handleTaskCompletion`, `processDeal` |
| Product Code | `Product_Code` | text | native | R | WF001d | `processDeal` |
| Product Name | `Product_Name` | text | native | R+W | WF001d, WF008 | `applyQuoteLifecycle`, `handleTaskCompletion`, `matchDraftQuotes`, `processDeal`, `resolveDealProduct`, `resolveQuoteLinePrice` |
| Product Plan Products | `Product_Plan_Products` | picklist | custom | R | WF001d | `processDeal`, `resolveDealProduct`, `resolveQuoteLinePrice` |
| Product Plan Type | `Product_Plan_Type` | picklist | custom | R | WF001d | `processDeal`, `resolveDealProduct`, `resolveQuoteLinePrice` |

### 3.7 Tasks — 23 fields

| Field Label | API Name | Type | Custom | Access | WF | Deluge function(s) |
| --- | --- | --- | --- | --- | --- | --- |
| Blocks Sequence | `Blocks_Sequence` | picklist | custom | W | WF001b, WF008 | `createAuxTask`, `createManualReview`, `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendSequencedEmail` |
| Description | `Description` | textarea | native | R+W | WF001b, WF006, WF008, WFC-SchedEmail | `createAuxTask`, `createManualReview`, `handleCallOutcome`, `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendScheduledEmailFromTask`, `sendSequencedEmail` |
| Due Date | `Due_Date` | date | native | W | — (helper only) | `routeContactSequence` |
| Task Owner | `Owner` | lookup | native | W | WF001b | `createAuxTask`, `processContact`, `routeContactSequence`, `sendSequencedEmail` |
| Status | `Status` | picklist | native | R+W | WF001b, WF006, WF008, WFC-SchedEmail | `createAuxTask`, `createManualReview`, `handleCallOutcome`, `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendScheduledEmailFromTask`, `sendSequencedEmail` |
| Subject | `Subject` | text | native | W | WF001b | `createAuxTask`, `createManualReview`, `processContact`, `routeContactSequence`, `sendSequencedEmail` |
| Task Contract Brands | `Task_Contract_Brands` | integer | custom | R | WF008 | `handleTaskCompletion` |
| Task Contract Date End | `Task_Contract_Date_End` | date | custom | R | WF008 | `handleTaskCompletion` |
| Task Contract Date Start | `Task_Contract_Date_Start` | date | custom | R | WF008 | `handleTaskCompletion` |
| Task Contract Frequency | `Task_Contract_Frequency` | picklist | custom | R | WF008 | `handleTaskCompletion` |
| Task Contract Products | `Task_Contract_Products` | multi-picklist | custom | R | WF008 | `handleTaskCompletion` |
| Task Lost Reasons | `Task_Lost_Reasons` | picklist | custom | R+W | WF008 | `handleEmailEvent`, `handleTaskCompletion` |
| Task Opportunity | `Task_Opportunity` | picklist | custom | W | WF001b | `createAuxTask`, `processContact`, `routeContactSequence`, `sendSequencedEmail` |
| Task Pipeline | `Task_Pipeline` | picklist | custom | W | WF001b | `createAuxTask`, `processContact`, `routeContactSequence`, `sendSequencedEmail` |
| Task Sequence Managed | `Task_Sequence_Managed` | boolean | custom | R+W | WF001b, WF006, WF008 | `createAuxTask`, `handleCallOutcome`, `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendSequencedEmail` |
| Task Sequence Stage | `Task_Sequence_Stage` | picklist | custom | R+W | WF001b, WF008 | `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendSequencedEmail` |
| Task Sequence Type | `Task_Sequence_Type` | picklist | custom | R | WF001b, WF008 | `handleTaskCompletion`, `processContact` |
| Task Stage | `Task_Stage` | picklist | custom | W | WF001b | `createAuxTask`, `processContact`, `routeContactSequence`, `sendSequencedEmail` |
| Task State | `Task_State` | picklist | custom | R+W | WF001b, WF008 | `createAuxTask`, `createManualReview`, `handleEmailEvent`, `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendSequencedEmail` |
| Task Status | `Task_Status` | picklist | custom | R+W | WF001b, WF008, WFC-SchedEmail | `createAuxTask`, `createManualReview`, `handleEmailEvent`, `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendScheduledEmailFromTask`, `sendSequencedEmail` |
| Task Type | `Task_Type` | picklist | custom | R+W | WF001b, WF008 | `createAuxTask`, `createManualReview`, `handleEmailEvent`, `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendSequencedEmail` |
| Related To | `What_Id` | lookup | native | R+W | WF001b, WF006, WF008, WFC-SchedEmail | `createAuxTask`, `handleCallOutcome`, `handleEmailEvent`, `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendScheduledEmailFromTask`, `sendSequencedEmail` |
| Contact Name | `Who_Id` | lookup | native | R+W | WF001b, WF006, WF008, WFC-SchedEmail | `createAuxTask`, `createManualReview`, `handleCallOutcome`, `handleEmailEvent`, `handleTaskCompletion`, `processContact`, `routeContactSequence`, `sendScheduledEmailFromTask`, `sendSequencedEmail` |

### 3.8 Calls — 22 fields

| Field Label | API Name | Type | Custom | Access | WF | Deluge function(s) |
| --- | --- | --- | --- | --- | --- | --- |
| Call Start Time | `Call_Start_Time` | datetime | native | W | WF006 | `handleCallOutcome`, `routeContactSequence` |
| Call Task Contract Brands | `Call_Task_Contract_Brands` | integer | custom | R+W | WF006 | `handleCallOutcome` |
| Call Task Contract Date End | `Call_Task_Contract_Date_End` | date | custom | R+W | WF006 | `handleCallOutcome` |
| Call Task Contract Date Start | `Call_Task_Contract_Date_Start` | date | custom | R+W | WF006 | `handleCallOutcome` |
| Call Task Contract Frequency | `Call_Task_Contract_Frequency` | picklist | custom | R+W | WF006 | `handleCallOutcome` |
| Call Task Contract Products | `Call_Task_Contract_Products` | multi-picklist | custom | R+W | WF006 | `handleCallOutcome` |
| Call Task Lost Reasons | `Call_Task_Lost_Reasons` | picklist | custom | R | WF006 | `handleCallOutcome` |
| Call Task Opportunity | `Call_Task_Opportunity` | picklist | custom | W | WF006 | `handleCallOutcome`, `routeContactSequence` |
| Call Task Pipeline | `Call_Task_Pipeline` | picklist | custom | W | WF006 | `handleCallOutcome`, `routeContactSequence` |
| Call Task Stage | `Call_Task_Stage` | picklist | custom | W | WF006 | `handleCallOutcome`, `routeContactSequence` |
| Call Task State | `Call_Task_State` | picklist | custom | R+W | WF006, WF008 | `handleCallOutcome`, `handleTaskCompletion`, `routeContactSequence` |
| Call Task Status | `Call_Task_Status` | picklist | custom | R+W | WF006, WF008 | `handleCallOutcome`, `handleTaskCompletion`, `routeContactSequence` |
| Call Type | `Call_Type` | picklist | native | W | WF006 | `handleCallOutcome`, `routeContactSequence` |
| Description | `Description` | textarea | native | W | WF006 | `handleCallOutcome`, `routeContactSequence` |
| Next Follow-Up Date | `Next_Follow_Up_Date` | datetime | custom | R+W | WF006 | `handleCallOutcome` |
| Outgoing Call Status | `Outgoing_Call_Status` | picklist | native | W | WF006, WF008 | `handleCallOutcome`, `handleTaskCompletion`, `routeContactSequence` |
| Sequence Attempt | `Sequence_Attempt` | integer | custom | R+W | WF006 | `handleCallOutcome`, `routeContactSequence` |
| Sequence Managed | `Sequence_Managed` | picklist | custom | R+W | WF006, WF008 | `handleCallOutcome`, `handleTaskCompletion`, `routeContactSequence` |
| Sequence Stage | `Sequence_Stage` | picklist | custom | R+W | WF006 | `handleCallOutcome`, `routeContactSequence` |
| Subject | `Subject` | text | native | W | WF006 | `handleCallOutcome`, `routeContactSequence` |
| Related To | `What_Id` | lookup | native | R+W | WF006 | `handleCallOutcome`, `routeContactSequence` |
| Contact Name | `Who_Id` | lookup | native | R+W | WF006, WF008 | `handleCallOutcome`, `handleTaskCompletion`, `routeContactSequence` |

### 3.9 Events (Meetings) — 17 fields

| Field Label | API Name | Type | Custom | Access | WF | Deluge function(s) |
| --- | --- | --- | --- | --- | --- | --- |
| Description | `Description` | textarea | native | R+W | WF007 | `handleMeetingEvent` |
| Ext Calendar Booking ID | `Ext_Calendar_Booking_ID` | text | custom | R | WF007 | `handleMeetingEvent` |
| Meeting Task Contract Brands | `Meeting_Task_Contract_Brands` | integer | custom | R | WF007 | `handleMeetingEvent` |
| Meeting Task Contract Date End | `Meeting_Task_Contract_Date_End` | date | custom | R | WF007 | `handleMeetingEvent` |
| Meeting Task Contract Date Start | `Meeting_Task_Contract_Date_Start` | date | custom | R | WF007 | `handleMeetingEvent` |
| Meeting Task Contract Frequency | `Meeting_Task_Contract_Frequency` | picklist | custom | R | WF007 | `handleMeetingEvent` |
| Meeting Task Contract Products | `Meeting_Task_Contract_Products` | multi-picklist | custom | R | WF007 | `handleMeetingEvent` |
| Meeting Task Lost Reasons | `Meeting_Task_Lost_Reasons` | picklist | custom | R | WF007 | `handleMeetingEvent` |
| Meeting Task Opportunity | `Meeting_Task_Opportunity` | picklist | custom | W | WF007 | `handleMeetingEvent` |
| Meeting Task Pipeline | `Meeting_Task_Pipeline` | picklist | custom | W | WF007 | `handleMeetingEvent` |
| Meeting Task Stage | `Meeting_Task_Stage` | picklist | custom | R+W | WF007 | `handleMeetingEvent` |
| Meeting Task State | `Meeting_Task_State` | picklist | custom | R+W | WF006, WF007 | `handleCallOutcome`, `handleMeetingEvent` |
| Meeting Task Status | `Meeting_Task_Status` | picklist | custom | R+W | WF007 | `handleMeetingEvent` |
| Reminder Send At | `Reminder_Send_At` | datetime | custom | W | WF007 | `handleMeetingEvent` |
| From | `Start_DateTime` | datetime | native | R | WF006, WF007, WF010c | `handleCallOutcome`, `handleMeetingEvent`, `sendDemoReminder` |
| Related To | `What_Id` | lookup | native | R | WF007 | `handleMeetingEvent` |
| Contact Name | `Who_Id` | lookup | native | R | WF007 | `handleMeetingEvent` |

### 3.10 Notes — 1 field

Notes are read as a related list of Tasks (`getRelatedRecords("Notes", "Tasks", taskId)`).

| Field Label | API Name | Type | Custom | Access | WF | Deluge function(s) |
| --- | --- | --- | --- | --- | --- | --- |
| — | `Created_Time` | — | — | R | WF008 | `handleTaskCompletion` |

### 3.11 Polymorphic activity reads — 2 fields

`routeContactSequence` re-reads the source activity through a *dynamic* module name (`ctx.sourceModule`), so these two reads resolve against whichever of Tasks, Calls or Events raised the context.

| Field Label | API Name | Type | Custom | Access | WF | Deluge function(s) |
| --- | --- | --- | --- | --- | --- | --- |
| — | `What_Id` | — | — | R | — (helper only) | `routeContactSequence` |
| — | `Who_Id` | — | — | R | — (helper only) | `routeContactSequence` |

---

## 4. Non-module keys used in field position

These look like fields in the code but are not module fields. They are listed so the tables above can be read as complete.

| Key | What it is | Where |
| --- | --- | --- |
| `$se_module` | System key on Tasks / Calls / Events | Names the module of `What_Id`. Read in handleMeetingEvent, handleTaskCompletion, handleCallOutcome, createAuxTask, routeContactSequence. |
| `Product_Details` | Quotes line-item container | The Quoted Items subform payload. Written by processDeal, handleTaskCompletion, applyQuoteLifecycle. |
| `Product_Name`, `Quantity`, `List_Price`, `Net_Total`, `Total`, `Discount`, `Product_Description` | Quoted Items subform line keys | Not top-level Quote fields — they exist only inside `Product_Details` rows. |
| `Quoted_Item_Pricing_Tier`, `Quoted_Item_Plan_Brands`, `Quoted_Item_Frequency`, `Quoted_Item_Plan_Type` | Custom Quoted Items subform line keys | Carry per-line commercial terms. Verify these exist on the subform layout — they are not in module metadata. |
| `Contact_Roles` | Deals related list | Maintained via `updateRelatedRecord("Contact_Roles", contactId, "Deals", dealId, {"Contact_Role": …})` in processContact and processDeal. |
| `Contact_Role` | Field *inside* the Contact_Roles related list | Distinct from the module field `Contact_Role1` on Leads/Contacts. |
| `Contacts_X_Products` | Junction module | Contact ↔ Product links created by processLead / handleTaskCompletion to preserve Lead product interest. |
| `Note_Title`, `Note_Content` | Notes module | Written by handleTaskCompletion; `Created_Time` read to pick the latest note. |
| `DUPLICATE_DATA`, `NO_CONTENT` | API response codes | Not fields. |

---

## 5. Phantom fields — referenced but absent from live metadata

Each row was checked against the live `getFields` response for the module it is used against. Zoho accepts unknown `api_name`s in an update payload without error, so these writes are silently dropped and these reads always return null.

| Module | API Name in code | Access | Deluge | WF | Location | Finding |
| --- | --- | --- | --- | --- | --- | --- |
| Deals | `Marketing_Qualification_Completed_At` | W | `processDeal` | WF001d | processDeal.deluge:2515 (via `stageFields` map, written at :2537/:2540) | No Deals field matches. Live Deals has **no** `*_Completed_At` field except `Demo_Reminder_Send_At`. |
| Deals | `Demo_Booking_Completed_At` | W | `processDeal` | WF001d | processDeal.deluge:2516 | Same block — phantom. |
| Deals | `Demo_Confirmation_Completed_At` | W | `processDeal` | WF001d | processDeal.deluge:2517 | Same block — phantom. |
| Deals | `Demo_Hosted_Completed_At` | W | `processDeal` | WF001d | processDeal.deluge:2518 | Same block — phantom. |
| Deals | `Proposal_Preparation_Completed_At` | W | `processDeal` | WF001d | processDeal.deluge:2519 | Same block — phantom. |
| Deals | `Commercial_Agreement_Completed_At` | W | `processDeal` | WF001d | processDeal.deluge:2520 | Same block — phantom. |
| Deals | `Primary_Contact` | R+W | `processDeal` | WF001d | processDeal.deluge:2145 (read), :2174 (write) | Live field is **`Deal_Primary_Contact`** — used correctly in `createManualReview:39`, `handleMeetingEvent:573`, `applyQuoteLifecycle:55`. |
| Contacts | `Contact_Source_Class` | R+W | `processLead` | WF001a | processLead.deluge:552 (read), :554 (write) | No live Contacts field of this name. Accounts has `Account_Source_Class`. |
| Contacts / Leads | `Role_AOR` | R+W | `processLead` | WF001a | processLead.deluge:168 (Lead read), :561 (Contact read + write) | Live equivalent is **`Contact_AOR`** (present on both Leads and Contacts). |
| Contacts | `Product_Interest_Staging` | R | `collectProductEvidence`, `processDeal` | WF001a, WF001b, WF001c, WF001d | _util_collectProductEvidence.deluge:91, processDeal.deluge:266 | No live Contacts field. Leads has `Product_Interest`. Comment at processLead:550 calls it "a read-only formula". |
| Contacts | `Profile_Completion_Status` | W | `handleEmailEvent` | WF009a–e | handleEmailEvent.deluge:107 | No live Contacts field — the bounce-path enrichment flag never lands. |
| Calls | `Call_Purpose_Detail` | W | `routeContactSequence` | WF006, WF007, WF008, WF009a–e, WF010d | routeContactSequence.deluge:1533 | Live field is **`Call_Purpose`**. Every automation-created Call loses its purpose text. |

### 5.1 The Deal stage-completion block

`processDeal.deluge:2510-2543` builds a `stageFields` map of six Deal-level completion-date fields and stamps them on every reconcile. The block carries this comment:

```
// NOTE: Deal-level Onboarding_Completed_At / Renewal_Completed_At are PHANTOM (do not exist).
// They are intentionally absent from stageFields so they are NEVER written.
```

The two excluded fields are indeed absent — but so are the **six that were kept**. The live Deals module has 70 fields and not one is a `*_Completed_At`. Stage completion is only durably recorded on the Contact, via the eight `Contact_Completed_*_At` fields (which do exist, on both Leads and Contacts, and are read back at `processDeal.deluge:223-234` to derive `everRTP`).

> **Corroboration for `Primary_Contact`.** In §3.4 `Deal_Primary_Contact` shows as **read-only** — three functions read it, none writes it. The only write path in the codebase targets the phantom `Primary_Contact`, so the Deal's primary-contact multi-lookup is never populated by automation, and the read at `processDeal.deluge:2145` always yields an empty list.

### 5.2 Date-trigger fields that are never written

Two workflow rules are bound to a Deal date field that no v6 Deluge code ever sets. They cannot fire from automation.

| WF | Bound to | Written anywhere in v6? | Consequence |
| --- | --- | --- | --- |
| `WF010d` | `Deals.Next_Comm_Follow_Up_Date` | **No** — the name appears only in a comment at `sendCommercialFollowUp.deluge:4` | The commercial follow-up cadence never triggers. |
| `WF004` (legacy) | `Deals.Commercials_Status` | **No** — zero references | Consistent with WF004 being retired; confirms nothing still depends on it. |

For contrast, the equivalent demo path is intact: `handleMeetingEvent.deluge:439` writes `Demo_Reminder_Send_At`, so `WF010c` fires. The comment block at `handleMeetingEvent.deluge:426-432` records that this write was previously broken — an unknown key in the same `updateRecord` map silently took the supported key down with it. `WF010d` is the same class of failure, still open.

### 5.3 Suggested corrections

| Code reference | Live field to use |
| --- | --- |
| `Primary_Contact` (Deals) | `Deal_Primary_Contact` |
| `Role_AOR` (Leads, Contacts) | `Contact_AOR` |
| `Call_Purpose_Detail` (Calls) | `Call_Purpose` |
| `Contact_Source_Class` (Contacts) | no live equivalent — create the field or drop the write |
| `Profile_Completion_Status` (Contacts) | no live equivalent — create the field or drop the write |
| `Product_Interest_Staging` (Contacts) | no live equivalent — evidence already covered by `Products_Linked` + `Product_Interest` |
| six Deal `*_Completed_At` | no live equivalent — either create them on Deals or delete the block and rely on `Contact_Completed_*_At` |

---

## 6. Method

1. Parsed all 38 `.deluge` files, collecting tokens in **field position only** — `.get("X")`, `.put("X", …)`, `"X":` inside a `createRecord`/`updateRecord` map literal, COQL `select`/`where`, and `searchRecords` criteria. This excludes same-named string *values* (e.g. `sType == "Email"` is not a use of the `Email` field).
2. Resolved concatenated names — `lqe_p + "Quote_ACV"` over the `Acquisition_`/`Expansion_`/`Renewal_` prefixes yields the real Lead field names; all 24 prefixed variants were confirmed live.
3. Attributed each reference to a module by: unique membership across the nine modules; else the module named in the enclosing `zoho.crm.*` call; else the record variable's binding. Of 1,658 field-position references, 337 are the universal `id` key (excluded from the tables); the remaining 1,321 all resolved to exactly one module — none were left ambiguous or guessed.
4. Built the call graph to separate WF entry points from shared helpers, and to compute which rules reach each helper.
5. Cross-checked every name against live `getFields` metadata to isolate the phantoms.

### Caveats

- Field **existence and labels** are live as of 2026-08-10. Layout placement, conditional-visibility rules, and profile-level permissions were not checked — a field can exist and still be unwritable for the automation user.
- Picklist *values* were not validated against live option lists. Picklists round-trip in display space, so a renamed option fails differently from a renamed field and would not be caught by this audit.
- Quoted Items subform line keys (§4) are not in module metadata and were not verified against the live subform layout.
- The `Emails` module (WF009a–e triggers) has no field table: those wrappers pass only a record id, and `handleEmailEvent` reads Contacts/Deals/Tasks, not Email fields.

---

## 7. Unused custom fields — deletion evaluation

Question: of the custom fields that exist live, which are neither read nor written by v6 Deluge, and could therefore be deleted?

"Unused by Deluge" alone is a weak signal, so each candidate was put through three further tests:

1. **Referenced anywhere else in the repo?** — 810 code files and 450 docs scanned (the booking app, its API handlers, migrations, tests and scripts all write to Zoho). Metadata mirrors — `booking/tests/fixtures/zoho-fields.json`, the stale CSV exports, the backup snapshots — were excluded, since appearing there is not use.
2. **Does it hold data in the live org?** — a COQL `is not null` probe per field, run 2026-08-10.
3. **Structural role** — formula, rollup, reverse-lookup, or a workflow trigger field.

**Result: 126 custom fields are unused by Deluge; 88 of them are also empty in the live org and reference-free — the deletion shortlist.** The remainder hold real data and should stay.

| Module | Custom fields | Used by Deluge | Unused | Unused **and empty** | Unused but populated |
| --- | ---: | ---: | ---: | ---: | ---: |
| Leads | 129 | 60 | 69 | **58** | 11 |
| Contacts | 39 | 28 | 11 | **0** | 11 |
| Accounts | 29 | 16 | 13 | **8** | 5 |
| Deals | 39 | 23 | 16 | **7** | 9 |
| Quotes | 19 | 15 | 4 | **3** | 1 |
| Products | 11 | 3 | 8 | **7** | 1 |
| Tasks | 16 | 16 | 0 | **0** | 0 |
| Calls | 18 | 15 | 3 | **3** | 0 |
| Events (Meetings) | 15 | 13 | 2 | **2** | 0 |
| **Total** | **315** | **189** | **126** | **88** | **38** |

### 7.1 Read this before deleting anything

- **Zoho-side consumers are invisible to this analysis.** Workflow criteria and field updates, validation rules, blueprints, approval rules, reports, dashboards, list views, email and mail-merge templates, assignment and scoring rules, client scripts, Zoho Flow and Analytics can all reference a field without appearing in this repo. Check each field's **"Used in"** / dependency view in Setup before removing it.
- **Formula expressions are not exposed by the API.** `getFields` returns a formula's return type but not its body, so a formula could reference a field on this shortlist. Verify in the UI.
- **The Calls module currently holds zero records**, so the emptiness test tells you nothing there. Those three fields rest on code evidence alone.
- Field deletion in Zoho moves the field to the recycle bin and **destroys its data after ~30 days**. Export first.

### 7.2 Deletion shortlist by module

#### Leads — 58 candidate(s) · ⚠️ SUPERSEDED, DO NOT ACTION

> **Retracted 2026-08-11.** The field owner supplied an authoritative keep-list of 112 Lead
> labels (§8.1). **30 of the 58 fields below are on it** and must not be deleted — they are
> mapped across Contacts / Accounts / Deals / Quotes, a dependency that neither the repo scan
> nor the live-data probe could see. Emptiness on the Lead record was the wrong test for a
> staging module whose fields exist to carry an inbound mapping.
>
> The remaining **28** — listed in §8.2 — are not on the keep-list and stay open for a later
> decision. They are almost entirely the Lead-level `Contract_Current_*` / `Contract_Initial_*`
> ledger mirrors.
>
> The table below is kept only as the evidence trail for *which* Lead fields are empty.
> **Treat §8.1 as the decision.**

Grouped by family for readability. All 58 are unused by Deluge, unreferenced elsewhere in the repo, and empty across every Lead record.

**Lead-level contract ledger mirrors** (21)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| Contract Currency | `Contract_Currency` | picklist |  |
| Contract Current ACV | `Contract_Current_ACV` | currency |  |
| Contract Current Date End | `Contract_Current_Date_End` | date |  |
| Contract Current Date End Days Remaining | `Contract_Current_Date_End_Days_Remaining` | formula |  |
| Contract Current Date Renewal | `Contract_Current_Date_Renewal` | formula |  |
| Contract Current Date Renewal Days Remaining | `Contract_Current_Date_Renewal_Days_Remaining` | formula |  |
| Contract Current Date Start | `Contract_Current_Date_Start` | date |  |
| Contract Current Plan Brands | `Contract_Current_Plan_Brands` | integer |  |
| Contract Current Plan Frequency | `Contract_Current_Plan_Frequency` | picklist |  |
| Contract Current Plan Products | `Contract_Current_Plan_Products` | multiselectpicklist |  |
| Contract Current Plan Type | `Contract_Current_Plan_Type` | picklist |  |
| Contract Initial ACV | `Contract_Initial_ACV` | currency |  |
| Contract Initial Date End | `Contract_Initial_Date_End` | date |  |
| Contract Initial Date End Days Remaining | `Contract_Initial_Date_End_Days_Remaining` | formula |  |
| Contract Initial Date Renewal | `Contract_Initial_Date_Renewal` | formula |  |
| Contract Initial Date Renewal Days Remaining | `Contract_Initial_Date_Renewal_Days_Remaining` | formula |  |
| Contract Initial Date Start | `Contract_Initial_Date_Start` | date |  |
| Contract Initial Plan Brands | `Contract_Initial_Plan_Brands` | integer |  |
| Contract Initial Plan Frequency | `Contract_Initial_Plan_Frequency` | picklist |  |
| Contract Initial Plan Products | `Contract_Initial_Plan_Products` | multiselectpicklist |  |
| Contract Initial Plan Type | `Contract_Initial_Plan_Type` | picklist |  |

**Per-group quote roll-ups (Acquisition / Expansion / Renewal)** (12)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| Acquisition Quote ACV Gap | `Acquisition_Quote_ACV_Gap` | currency |  |
| Acquisition Quote Contract Date End Days Remaining | `Acquisition_Quote_Contract_Date_End_Days_Remaining` | integer |  |
| Acquisition Quote Date Renewal Days Remaining | `Acquisition_Quote_Date_Renewal_Days_Remaining` | integer |  |
| Acquisition Quote Target ACV | `Acquisition_Quote_Target_ACV` | currency |  |
| Expansion Quote ACV Gap | `Expansion_Quote_ACV_Gap` | currency |  |
| Expansion Quote Contract Date End Days Remaining | `Expansion_Quote_Contract_Date_End_Days_Remaining` | integer |  |
| Expansion Quote Date Renewal Days Remaining | `Expansion_Quote_Date_Renewal_Days_Remaining` | integer |  |
| Expansion Quote Target ACV | `Expansion_Quote_Target_ACV` | currency |  |
| Renewal Quote ACV Gap | `Renewal_Quote_ACV_Gap` | currency |  |
| Renewal Quote Contract Date End Days Remaining | `Renewal_Quote_Contract_Date_End_Days_Remaining` | integer |  |
| Renewal Quote Date Renewal Days Remaining | `Renewal_Quote_Date_Renewal_Days_Remaining` | integer |  |
| Renewal Quote Target ACV | `Renewal_Quote_Target_ACV` | currency |  |

**Contact address block** (7)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| Contact Address - City | `Contact_Address_City` | text |  |
| Contact Address - Country / Region | `Contact_Address_Country_Region` | picklist |  |
| Contact Address - Flat / House No./ Building / Apartment Name | `Contact_Address_Flat_House_No_Building_Apartment_N` | text |  |
| Contact Address - State / Province | `Contact_Address_State_Province` | picklist |  |
| Contact Address - Street Address | `Contact_Address_Street_Address` | text |  |
| Contact Address - Zip / Postal Code | `Contact_Address_Zip_Postal_Code` | text |  |
| Contact Phone | `Contact_Phone` | phone |  |

**Enrichment / firmographics** (11)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| Company Linkedin | `Company_Linkedin` | text |  |
| Company Subsidiary of | `Company_Subsidiary_of` | text |  |
| Contact AOR | `Contact_AOR` | textarea | **Do not delete.** This is the live field the phantom `Role_AOR` should be corrected to (§5.3). Empty on Leads today; populated on Contacts. |
| Contact AOR Brands | `Contact_AOR_Brands` | multiselectpicklist |  |
| Contact AOR Priority 1 | `Contact_AOR_Priority_1` | textarea |  |
| Contact AOR Priority 2 | `Contact_AOR_Priority_2` | textarea |  |
| Contact AOR Priority 3 | `Contact_AOR_Priority_3` | textarea |  |
| Job Departments | `Job_Departments` | multiselectpicklist |  |
| Job Function | `Job_Function` | text |  |
| Technographics | `Technographics` | multiselectpicklist |  |
| Technographics Evaluating | `Technographics_Evaluating` | multiselectpicklist |  |

**Jurnii platform mirrors** (3)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| Jurnii Org ID | `Jurnii_Org_ID` | text |  |
| Jurnii User Created At | `Jurnii_User_Created_At` | text |  |
| Jurnii User Role | `Jurnii_User_Role` | picklist |  |

**Keys and routing** (4)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| Account Key | `Account_Key` | text |  |
| DEP - Conversion Outcome | `Conversion_Outcome` | textarea |  |
| Deal Key | `Deal_Key` | text |  |
| Pipeline | `Pipeline` | picklist |  |

**Keep — unused by Deluge but holding live data (6):** `Contact_Linkedin`, `Contract_Current_ACV_Gap`, `Contract_Initial_ACV_Gap`, `Contract_Target_ACV`, `Jurnii_Report_Created`, `Status`.

**Could not be tested (5):** `Contact_Address`, `Contact_Address_Coordinates1`, `Contact_Address_Coordinates1_Latitude1`, `Contact_Address_Coordinates1_Longitude1`, `Products_Linked` — COQL rejects these column types (address blocks, multi-select lookups) in a `where` clause. Check them in the UI.

#### Contacts — 0 candidate(s)

**Keep — unused by Deluge but holding live data (11):** `Contact_AOR`, `Contact_AOR_Brands`, `Contact_AOR_Priority_1`, `Contact_AOR_Priority_2`, `Contact_AOR_Priority_3`, `Job_Departments`, `Job_Function`, `Jurnii_Org_ID`, `Jurnii_User_Created_At`, `Jurnii_User_Role`, `Personal_Linkedin`.

#### Accounts — 8 candidate(s)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| Account Enrichment Status | `Account_Enrichment_Status` | picklist |  |
| Account Suppression Reason | `Account_Suppression_Reason` | picklist |  |
| Automation Suppressed | `Automation_Suppressed` | boolean | Never `true` on any Account. Note `Deals.Automation_Suppressed` **is** read by automation — only the Accounts copy is idle. |
| Company Size Band | `Company_Size_Band` | picklist |  |
| Contract Renewal URL | `Contract_Renewal_URL` | website | ❌ **DO NOT DELETE** — live email merge field `${!Contacts.Account_Name.Contract_Renewal_URL}`, used by the renewal templates (24 uses). See §11. |
| Contract URL | `Contract_URL` | website | ❌ **DO NOT DELETE** — live email merge field `${!Contacts.Account_Name.Contract_URL}` (27 uses). Verified live in template *Commercial Agreement - Proposal and Terms*, last used 2026-07-20. See §11. |
| Industry Validation | `Industry_Validation` | picklist |  |
| Lost Reasons | `Lost_Reasons` | picklist | Account-level loss reason. `rollupAccountState` writes `Accounts.State` but never a reason. Deals has its own `Lost_Reasons`, which *is* used. |

**Keep — unused by Deluge but holding live data (5):** `Company_Linkedin`, `Company_Subsidiary_of`, `Jurnii_Org_ID`, `Technographics`, `Technographics_Evaluating`.

#### Deals — 7 candidate(s)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| DEP - Commercial Outcome | `Commercial_Outcome` | picklist |  |
| DEP - Commercials Status | `Commercials_Status` | picklist | Delete **only after** legacy `WF004` is switched off — it is that rule's trigger field. |
| Contract Currency | `Contract_Currency` | picklist |  |
| Contract Initial Plan Frequency | `Contract_Initial_Plan_Frequency` | picklist |  |
| Jurnii Org ID | `Jurnii_Org_ID` | text |  |
| Next Comm Follow-Up Date | `Next_Comm_Follow_Up_Date` | datetime | **Do not delete.** This is the `WF010d` trigger field (§5.2). It is empty *because* the write is missing — deleting it makes the commercial follow-up cadence permanently unfixable. |
| Suppression Reason | `Suppression_Reason` | picklist |  |

**Keep — unused by Deluge but holding live data (9):** `Contract_Current_ACV_Gap`, `Contract_Current_Date_End_Days_Remaining`, `Contract_Current_Date_Renewal`, `Contract_Current_Date_Renewal_Days_Remaining`, `Contract_Initial_ACV_Gap`, `Contract_Initial_Date_End_Days_Remaining`, `Contract_Initial_Date_Renewal`, `Contract_Initial_Date_Renewal_Days_Remaining`, `Contract_Target_ACV`.

#### Quotes — 3 candidate(s)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| Contract Type | `Contract_Type` | picklist |  |
| Net Order Value | `Net_Order_Value` | currency |  |
| Previous Contract Credit | `Previous_Contract_Credit` | currency |  |

**Keep — unused by Deluge but holding live data (1):** `Quote_ACV_Gap`.

#### Products — 7 candidate(s)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| Active for Deal Auto | `Active_for_Deal_Auto` | boolean |  |
| CRM Product Type | `CRM_Product_Type` | picklist |  |
| Default Deal Value | `Default_Deal_Value` | currency |  |
| Needs Manual Pricing | `Needs_Manual_Pricing` | boolean |  |
| Product Mapping Aliases | `Product_Mapping_Aliases` | textarea |  |
| Product Plan Brands | `Product_Plan_Brands` | integer |  |
| Value Calculation Method | `Value_Calculation_Method` | picklist |  |

**Could not be tested (1):** `Leads` — COQL rejects these column types (address blocks, multi-select lookups) in a `where` clause. Check them in the UI.

#### Tasks

Every custom field on this module is read or written by v6 Deluge. **Nothing to delete.**

#### Calls — 3 candidate(s)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| Block Email Until Done | `Block_Email_Until_Done` | picklist |  |
| Email Trigger Template | `Email_Trigger_Template` | text |  |
| Outcome Notes | `Outcome_Notes` | textarea |  |

#### Events (Meetings) — 2 candidate(s)

| Field Label | API Name | Type | Note |
| --- | --- | --- | --- |
| Follow-Up Required | `Follow_Up_Required` | picklist |  |
| Follow-Up Stage | `Follow_Up_Stage` | picklist |  |

### 7.3 Notable results

- **Tasks is clean.** All 16 custom Task fields are used by Deluge — the activation/sequence model uses everything it defines.
- **Contacts has no candidates.** All 11 unused custom fields carry real data (AOR targeting, job taxonomy, Jurnii platform mirrors, LinkedIn). Automation ignores them; people and imports do not.
- **Leads carries the bulk of the dead weight** — 58 of 129 custom fields are unused and empty. The Lead module was built as an import-staging surface with a full contract ledger and per-group quote roll-up mirrored from Deals/Quotes; in practice `processLead` reads only the `Acquisition_/Expansion_/Renewal_` *input* fields and the AOO/AOR company block. Every mirrored *output* field — ACV, dates, plan type, days-remaining — is empty.
- **Two fields are empty for the wrong reason.** `Deals.Next_Comm_Follow_Up_Date` and the six Deal `*_Completed_At` phantoms (§5) are empty because of defects, not disuse. Fix those before treating emptiness as evidence of redundancy.
- **`Products.Leads` is a false positive** in the reference scan — the bare word "Leads" matches almost every file. It is the reverse side of the Lead↔Product multi-lookup and is structural; keep it.

---

## 8. Field-owner keep-list reconciliation and the activity-module removal plan

*Added 2026-08-11, after the field owner supplied an authoritative Leads keep-list and scoped removal to Meetings / Tasks / Calls.*

### 8.1 Leads — the keep-list is the decision

112 labels were supplied; **108 resolve to a live Lead field**. Leads are now out of scope for deletion, and §7.2's Leads shortlist is retracted.

**Four fields the automation depends on are missing from the list.** These are read or written by `processLead` — add them, or a future cleanup pass will delete working behaviour:

| API Name | Label | Used how |
| --- | --- | --- |
| `Contact_Role1` | Contact Role | Resolved from `Job_Title` and written on conversion; also the `WF001b0` trigger field on Contacts |
| `Imported_Record_Type` | Imported Record Type | Read to derive the Contact source class |
| `Job_Title_Raw` | Job Title Raw | Read for role resolution |
| `Lost_Reasons` | Lost Reasons | Read and written by the Lead loss path |

**Three labels match no live Lead field** — either they need creating, or they live on another module: `Current Job`, `Email Guess`, `Last Contact`.

**Five labels differ from the live label** (same field, worth aligning so the list matches metadata):

| Your label | Live API name | Live label |
| --- | --- | --- |
| Jurnii Report | `Jurnii_Report_Created` | Jurnii Report Created |
| Company Employee Count | `No_of_Employees` | Company Employees Count |
| Tags | `Tag` | Tag |
| *X* Quote Contract Date Renewal Days Remaining | `X_Quote_Date_Renewal_Days_Remaining` | *X* Quote Date Renewal Days Remaining (all three groups) |
| State | `State` | Address - State / Province — collides with your separate "Address - State / Province" entry; there is no lifecycle `State` field on Leads |

### 8.2 Leads still outside the keep-list

28 of the 58 retracted candidates are **not** on your list. No action taken — recorded so the question stays open. 21 of the 28 are the Lead-level contract ledger (`Contract_Current_*`, `Contract_Initial_*`, `Contract_Currency`), which mirrors a ledger that Deals owns and populates; the Lead copy is empty on every record. The other 7 are `Account_Key`, `Deal_Key`, `Conversion_Outcome` (already labelled *DEP -*), `Contact_Phone`, and the `Contact_Address` street / flat / zip subfields.

---

### 8.3 Meetings / Tasks / Calls — what can actually go

Full inventory of all three modules: **130 fields, 49 custom**. Cross-checked against Deluge usage, the booking app, and live data.

| Module | Fields | Custom | Used by Deluge | Custom + unused | **Deletable now** |
| --- | ---: | ---: | ---: | ---: | ---: |
| Events (Meetings) | 50 | 15 | 17 | 2 | **2** |
| Tasks | 36 | 16 | 23 | 0 | **0** |
| Calls | 44 | 18 | 22 | 3 | **3** |
| **Total** | **130** | **49** | **62** | **5** | **5** |

#### The five deletable fields

All custom, zero Deluge reads or writes, zero references in the booking app, zero live data. My pass reached these independently; they are the same five already sitting in `ACTIVITY_FIELD_CLEANUP_PLAN.md` as **Tier 2 — pending**.

| Module | API Name | Label | Type | Field ID | Blocker |
| --- | --- | --- | --- | --- | --- |
| Events | `Follow_Up_Required` | Follow-Up Required | picklist | 991103000000793003 | On layout *Meeting Additional Information* |
| Events | `Follow_Up_Stage` | Follow-Up Stage | picklist | 991103000000793015 | On layout *Meeting Additional Information* |
| Calls | `Block_Email_Until_Done` | Block Email Until Done | picklist | 991103000000789090 | On layout *Purpose Of Outgoing Call* |
| Calls | `Email_Trigger_Template` | Email Trigger Template | text | 991103000000789065 | On layout *Purpose Of Outgoing Call* |
| Calls | `Outcome_Notes` | Outcome Notes | textarea | 991103000000789049 | On layout *Purpose Of Outgoing Call* |

> **The `Block_Email_Until_Done` data blocker is now clear.** The plan records one remaining `"Yes"` row on scratch Call `991103000002287359`. **The Calls module now holds zero records org-wide** (verified by COQL, 2026-08-11), so that row is gone. Its write was already removed in `939b1b2`. Layout removal is the only step left — the same step the other four need.

**Sequence:** remove all five from their layouts in Setup, then delete. Do not call `deleteCustomField` on an on-layout field as a probe.

#### Tasks — nothing to delete

All 16 custom Task fields are read or written by v6 Deluge. The activation and sequence model uses everything Tasks defines. The two previously-dead Task fields were already removed: `Task_Outcome` (Tier 1, deleted 2026-07-09) and `Task_Sequence_Step` (never existed live).

#### Written but never read — do not delete these ten

These have zero code *reads*, which makes them look dead. They are not: each is a Deal-context mirror stamped onto the activity so a rep sees stage / pipeline / opportunity on the Task, Call or Meeting itself. The consumer is the UI, not code. **Make them read-only rather than delete them** — matching Tier 3 of the existing plan.

| Module | Fields |
| --- | --- |
| Events | `Meeting_Task_Pipeline`, `Meeting_Task_Opportunity`, `Reminder_Send_At` |
| Tasks | `Blocks_Sequence`, `Task_Stage`, `Task_Pipeline`, `Task_Opportunity` |
| Calls | `Call_Task_Stage`, `Call_Task_Pipeline`, `Call_Task_Opportunity` |

#### Correction to the existing cleanup plan

`ACTIVITY_FIELD_CLEANUP_PLAN.md` lists **`Call_Purpose_Detail`** in Tier 3 as a write-only mirror to clean up later. **That field does not exist.** It is the phantom write from §5 — `routeContactSequence.deluge:1533` writes it on every automation-created Call and Zoho discards it silently. There is nothing to delete; the write needs correcting to the real field, `Call_Purpose`.

And when you make that fix: **`Call_Purpose` is on zero layouts** (as is `Call_Agenda`). Repointing the write alone will not surface the purpose text to reps — the field has to be added to the Call layout too.

### 8.4 Layout hygiene — native fields neither system touches

Native Zoho fields cannot be deleted, only removed from the layout. These are unused by both Deluge and the booking app:

| Module | Unused native fields | Note |
| --- | --- | --- |
| Events | The entire check-in block — `Check_In_Time`, `Check_In_By`, `Check_In_Status`, `Check_In_State`, `Check_In_Address`, `Check_In_City`, `Check_In_Country`, `Check_In_Sub_Locality`, `Check_In_Comment`, `Latitude`, `Longitude`, `ZIP_Code` — plus `All_day`, `Participants`, `Recurring_Activity`, `Remind_At`, `Remind_Participants`, `Meeting_Provider__s`, `Meeting_Venue__s`, `Online_Meeting_External_UUID__s` | `Check_In_Time`/`Check_In_Status` do carry values (Zoho defaults), so remove from layout rather than expecting them empty |
| Tasks | `Priority`, `Closed_Time`, `Recurring_Activity`, `Remind_At`, `Send_Notification_Email` | `Priority` and `Closed_Time` are populated by Zoho itself |
| Calls | `CTI_Entry`, `Caller_ID`, `Dialled_Number`, `Voice_Recording__s`, `Call_Duration`, `Call_Duration_in_seconds`, `Call_Result`, `Scheduled_In_CRM`, `Reminder`, `Call_Agenda` | Telephony fields — only relevant if CTI is ever wired up |

> **Keep on the Events layout: `Event_Title`, `End_DateTime`, `Venue`.** They show as unused by Deluge but the **booking app writes them** (`booking/integrations/zoho/index.js:398-400`), and all three carry live data. `Ext_Calendar_Booking_ID` likewise stays — it is the booking backend's Meeting-to-journey correlation key.

### 8.5 Net position

- **5 custom fields are deletable** across Meetings, Tasks and Calls — 2 on Events, 3 on Calls, 0 on Tasks. All are blocked only on layout removal.
- **10 more look dead but are rep-facing mirrors** — make read-only, do not delete.
- **1 plan entry is void** (`Call_Purpose_Detail` never existed) and its real counterpart `Call_Purpose` is not on any layout.
- **~37 native fields could leave the layouts** without affecting either system.
- Leads is out of scope; the keep-list governs, with four additions needed (§8.1).

---

## 9. Verification pass — 2026-08-11

Independent re-check of every field marked for removal, against both consumers: the Deluge functions and the booking form. Scope is Zoho-resident fields only.

### 9.1 What was checked

| Check | Method | Result |
| --- | --- | --- |
| Deluge source | Literal scan of **all 39 `.deluge` files** in the repo (38 in `v6/` + 1 backup), counting comments as hits too | **0 occurrences** of all five fields — not even a mention |
| Deployed Deluge | `getAllAutomationFunctions` against the live org | **17 functions deployed, all 17 map to a `v6/` file by name.** No orphan function exists in Zoho that the repo scan could have missed |
| Booking form / app | ripgrep across every `.js/.mjs/.cjs/.ts/.tsx/.jsx/.py/.html/.sql` file in the repo, plus `dist/` and `.vercel/` build output | **0 occurrences** of all five fields |
| Booking write contract | `booking/tests/zoho-field-names.test.js` declares every field the booking chain writes, per module, and asserts each exists live | None of the five appear. Booking writes **nothing at all** to Calls |
| Zoho "Unused Fields" bin | `getFields?type=unused` per module | Events: empty · Tasks: empty · Calls: `Call_Purpose`, `Call_Agenda` only |

### 9.2 Verdict on the five

| Module | Field | In 39 Deluge files | In booking code | In booking write contract | Live data | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Events | `Follow_Up_Required` | 0 | 0 | no | none | **Safe to delete** |
| Events | `Follow_Up_Stage` | 0 | 0 | no | none | **Safe to delete** |
| Calls | `Block_Email_Until_Done` | 0 | 0 | no | none | **Safe to delete** |
| Calls | `Email_Trigger_Template` | 0 | 0 | no | none | **Safe to delete** |
| Calls | `Outcome_Notes` | 0 | 0 | no | none | **Safe to delete** |

All five remain on a layout, which is the only remaining blocker. Confirmed unchanged: `Block_Email_Until_Done` has no data, because the Calls module holds no records at all.

### 9.3 Two corrections to §8

**§8.4 was wrong about `Venue`.** I wrote that the booking app writes `Events.Venue` and it should stay on the layout. It does not — `Venue` appears nowhere in booking code, and it is not in the booking write contract. Its only occurrence anywhere in the repo is the metadata mirror. It *does* hold live data, so something populates it — most likely the Zoho calendar integration or manual entry, neither of which this repo can see. **It is still not a deletion candidate** (it is native, and populated), but the stated reason was wrong. `Event_Title` and `End_DateTime` *are* genuinely written by booking (`booking/integrations/zoho/index.js:398-400`), as is `Ext_Calendar_Booking_ID`.

**§8.3 undercounted the writers of three mirrors.** I described the ten write-only fields as having the UI as their only consumer. For three of them that is incomplete — `Meeting_Task_Pipeline`, `Meeting_Task_Opportunity` and `Reminder_Send_At` are written by the **booking app as well as Deluge**, per its write contract. The conclusion is unchanged and now better supported: do not delete them.

### 9.4 A finding that changes the layout advice

`booking/scripts/zoho-field-snapshot.js:84-98` records a behaviour proved against a scratch Deal on 2026-08-02:

> A field removed from a module layout keeps its stored data and still reports `read_only: false, api_update: true` — but a write to it returns `code: SUCCESS`, `message: "record updated"`, bumps `Modified_Time`, and **silently discards the value**.

So in this org, taking a field off the layout is not a cosmetic change: **it silently disables every write to that field**, from Deluge and REST alike, with no error surfaced. Two consequences:

1. **The §8.4 layout-hygiene list is safe only because those fields are genuinely unwritten.** Before removing any *other* field from a layout, confirm nothing writes it — a silent discard is far harder to notice than a deletion.
2. **`Call_Purpose` is in the bin right now.** §8.3 recommended repointing the phantom `Call_Purpose_Detail` write to `Call_Purpose`. That fix alone **will not work** — the write would be accepted and discarded. `Call_Purpose` has to be restored to the Calls layout *first*, then the write repointed. `Call_Agenda` is in the bin too.

This is the same failure mode as the historical `Demo_Reminder_Send_At` bug. Both it and `Next_Comm_Follow_Up_Date` are back on a layout today, so §5.2's `WF010d` gap is a genuinely missing write, not a bin problem.

### 9.5 Net

The five fields in §8.3 are confirmed unused by both the Deluge functions and the booking form, and hold no data. Remove them from their layouts, then delete. Nothing else on the removal or layout-hygiene lists is touched by either system — with the caveat in §9.4 that layout removal is itself a write-disabling action, so it should be applied only to fields confirmed unwritten.

---

## 10. Deletion log — executed 2026-08-11

The five fields from §8.3 were deleted via `deleteCustomField` after the §9 verification pass.
Custom fields only; no native field was touched.

| Module | Field | Field ID | Zoho response | Verified gone by |
| --- | --- | --- | --- | --- |
| Calls | `Outcome_Notes` | 991103000000789049 | `SUCCESS: field deleted` | COQL `invalid column` |
| Calls | `Email_Trigger_Template` | 991103000000789065 | `SUCCESS: field deleted` | COQL `invalid column` |
| Calls | `Block_Email_Until_Done` | 991103000000789090 | `SUCCESS: field deleted` | COQL `invalid column` |
| Events | `Follow_Up_Required` | 991103000000793003 | `SUCCESS: field deleted` | absent from `getFields` |
| Events | `Follow_Up_Stage` | 991103000000793015 | `SUCCESS: field deleted` | absent from `getFields` |

**Post-state:** Calls 45 → 42 fields (custom 18 → 15); Events 51 → 49 (custom 15 → 13).
`Call_Task_State`, `Sequence_Managed`, `Call_Purpose`, `Call_Agenda` and every `Meeting_Task_*`
field confirmed present and untouched.

### 10.1 The layout blocker did not exist

`Outcome_Notes` was deleted first as a single controlled probe, deliberately while it was still on
the *Purpose Of Outgoing Call* layout. It returned `SUCCESS` with no dependency blocker and no
admin-UI step — **Zoho removes an on-layout custom field from the layout as part of the delete.**
The §8.3 / cleanup-plan premise that layout removal must come first is therefore wrong, and
`ACTIVITY_FIELD_CLEANUP_PLAN.md` has been corrected.

This also means the residual risk named in §7.1 and §9.1 — reports, dashboards, custom views,
email templates, none of which any API exposes — never materialised for these five. The endpoint
refuses when a field is used in workflows, approvals or scoring rules, so it fails safe.

### 10.2 Verify deletions with `getFields`, not COQL

Immediately after `Follow_Up_Stage` was deleted, COQL still accepted it as a valid column and
returned `null` for it, while `getFields` already showed it absent. COQL caught up within
seconds. The COQL metadata layer lags a schema change, so a COQL query is not a reliable
freshly-post-delete check — `getFields` is.

### 10.3 Still outstanding

- The **10 write-only mirrors** (§8.3) remain in place by design — rep-facing Deal context, and
  three of them are written by the booking app too. Make read-only rather than delete.
- **`Call_Purpose` is still in the Unused Fields bin**, so the `Call_Purpose_Detail` phantom fix
  (§5, §9.4) still needs the field restored to the Calls layout *before* the write is repointed.
- The **native layout-hygiene list** (§8.4) is untouched — those are layout changes, not
  deletions, and §9.4's silent-discard behaviour makes them worth doing deliberately.
- **Leads, Contacts, Accounts, Deals, Quotes, Products** deletions are not actioned. Leads is
  governed by the §8.1 keep-list; the other modules' candidates in §7.2 remain open.

### 10.4 Completion sweep — 2026-08-11

Recomputed from live metadata after the deletions, not from the pre-delete figures:

| Module | Fields | Custom | Used by Deluge | **Unused custom remaining** |
| --- | ---: | ---: | ---: | ---: |
| Events (Meetings) | 49 | 13 | 13 | **0** |
| Calls | 42 | 15 | 15 | **0** |
| Tasks | 37 | 16 | 16 | **0** |

**Every custom field on Meetings, Tasks and Calls is now read or written by v6 Deluge.** The
scope the field owner set is complete.

**Downstream fixture refreshed.** Deleting the two Events fields drifted
`booking/tests/fixtures/zoho-fields.json`, which the booking suite reads offline and which
`booking/scripts/zoho-field-snapshot.js --check` guards in CI. The check failed as designed
(Events 49 live vs 51 snapshotted). Regenerated: the diff is exactly the two deleted names, and
the script's two generated runtime configs (`config/zoho-picklists.js`, `config/lead-sources.js`)
came back byte-identical, so no picklist drift rode along. Post-refresh: `--check` reports
*"Snapshot and generated config match live metadata"*, and `node --test tests/*.test.js` passes
**414/414**.

Remaining items are unchanged from §10.3 and all sit outside the Meetings/Tasks/Calls scope:
the ten write-only mirrors (keep), `Call_Purpose` still in the Unused Fields bin, the native
layout-hygiene list, and the unactioned Accounts / Deals / Quotes / Products candidates in §7.2.

---

## 11. Phantom remediation — 2026-08-11

Code changes made against the §5 phantom set. **Not yet published to Zoho** — the repo must not be
committed ahead of the org (all 17 deployed functions currently match it).

| # | Change | File | Result |
| --- | --- | --- | --- |
| 1 | `Primary_Contact` → `Deal_Primary_Contact`, **rewritten to single-lookup semantics** | `processDeal.deluge` | The old code read and wrote a **List** — `Deal_Primary_Contact` is a single `lookup` (`jsonobject`). A straight rename would have written a List to a scalar field. Now matches the read pattern in `createManualReview` / `handleMeetingEvent` / `applyQuoteLifecycle` |
| 2 | `Role_AOR` → `Contact_AOR` (read + write); variable renamed `leadRoleAOR` → `leadContactAOR` | `processLead.deluge` | Field exists on both Leads and Contacts |
| 3 | Removed the six-field Deal stage-completion block **and** the `dealPcDates` computation that fed only it | `processDeal.deluge` | −85 lines. `finalOppStage`, `finalRank`, `stagesList`, `primaryContactIdsList` all became dead with it and were removed |
| 4 | Removed both `Product_Interest_Staging` reads | `_util_collectProductEvidence.deluge`, `processDeal.deluge` | Always null; `Products_Linked` feeds the same accumulators immediately below each site |
| 5 | Removed the `Contact_Source_Class` write | `processLead.deluge` | The source class is recorded on the Account (`Account_Source_Class`), written from the same `importedRecordType` |
| 6 | Removed the `Profile_Completion_Status` write **and its `updateRecord` call** | `handleEmailEvent.deluge` | Was a whole no-op API round-trip. The Data Repair task on the same branch is the actionable signal |

Net: **50 insertions, 104 deletions** across four functions.

### 11.1 Verification run

- **Phantom re-scan, all 39 `.deluge` files:** only `Call_Purpose_Detail` remains (blocked, §11.2).
  `Accounts` (convertLead API key) and `Onboarding` / `Renewal` (local Map keys) are known
  non-field false positives.
- **Brace/paren balance vs `HEAD`**, string literals stripped: unchanged on all four files
  (`processDeal`, `handleEmailEvent`, `collectProductEvidence` balanced at `(0,0)`; `processLead`
  carries a pre-existing `(0,1)` paren artefact present in `HEAD` too).
- **No dangling references** to any removed variable — `dealPcDates` survives only inside an
  explanatory comment; `stagesList` / `cUpd` elsewhere are unrelated variables in other functions.
- **booking suite 414/414**, snapshot `--check` clean.

### 11.2 Blocked — `Call_Purpose_Detail`

Repointing it to `Call_Purpose` is **not** a rename. Beyond the field being in the Unused Fields
bin (§9.4), the vocabulary does not match: the code writes `Data Completion`, `Book Demo`,
`Confirm Attendance`, `Post-Demo Follow-Up`, `Commercial Discussion`, `Onboarding`, `Renewal`, but
live `Call_Purpose` accepts only `-None-`, `Prospecting`, `Administrative`, `Negotiation`, `Demo`,
`Project`, `Support`. Writing an out-of-set picklist value is discarded the same way an unknown
api_name is. Options: add the seven values **and** restore the field to the Calls layout, or drop
the write (the Call `Subject` already encodes stage + attempt, and the `Description` states the
contract). Left unchanged pending that decision.

### 11.3 Email-template screen (§7.2 correction)

Every merge field used across all 42 templates, extracted from the drafts and spot-checked live:

```
${!org.company_name}                          102    ${!users.website}                        47
${!Contacts.Account_Name.Account_Name}         94    ${!Contacts.Account_Name.Contract_URL}   27
${!Contacts.First_Name}                        86    ${!…Contract_Renewal_URL}                24
${!users.first_name}                           83    ${!userSignature}                        83
```

Only **two** are custom CRM fields, and both were on the §7.2 Accounts shortlist:
`Accounts.Contract_URL` and `Accounts.Contract_Renewal_URL` — now marked do-not-delete. Confirmed
against the live template *Commercial Agreement - Proposal and Terms* (id `991103000001475003`,
last used 2026-07-20), whose body contains `${!Contacts.Account_Name.Contract_URL}`.

**No other §7.2 candidate is referenced by any template.** The rest of the shortlist is unaffected.
Both fields are empty in live data, which is why they read as dead — populating them is a separate
gap, since the proposal and renewal emails currently merge an empty link.

---

## 12. Canonical-model revision — 2026-08-11 (supersedes parts of §11)

A canonical-model review over §11 found that fixing phantom *names* was necessary but not
sufficient: several **live** fields are duplicated, wrongly owned, or already represented elsewhere.
The governing plan is `whats-the-plan-for-expressive-sprout.md`. **Nothing is published.**

### 12.1 §11 corrections

| §11 row | Correction |
| --- | --- |
| 1 — `Primary_Contact` → `Deal_Primary_Contact` | **Reversed.** The write is now removed entirely, not repointed. `Contact_Name` is the canonical controlling Deal Contact (12+ readers). `Deal_Primary_Contact` is read in exactly 3 places, each falling straight back to `Contact_Name`, and — because its only write was the phantom — has never held a value on any Deal. Repointing would have persisted duplicate state. It is scheduled for retirement. |
| 2 — `Role_AOR` → `Contact_AOR` | **Held.** The repoint is correct as a name, but `Contact_AOR` has no code reader and no template reference anywhere; conversion is its only writer. Kept for now (the field owner retains it) with the open question recorded in-code. |
| 3 — Deal `*_Completed_At` block | **Extended.** Also removed the orphans it left: `contactStageMap`, `contactDatesMap` and the per-Contact `cDates` build — eight `Contact_Completed_*_At` reads per Contact per reconcile, feeding nothing. `everRTPviaContact` retained. |
| 4, 5, 6 | Unchanged and correct. |

### 12.2 New defects fixed

- **D1 (high — sent a wrong email).** `routeContactSequence:1058` wrote `{"Status":"Cancelled"}` to a
  Task. `Cancelled` is not a live `Tasks.Status` option, so the write was discarded and the line set
  no `Task_Status` — the stop-gate at `sendScheduledEmailFromTask:32` never tripped and a
  **superseded Scheduled Send still fired its email on Due_Date**. Now writes
  `Deferred` + `Task_Status=Closed`, matching the already-corrected sibling at
  `handleTaskCompletion:506`. Idempotent via the existing guard.
- **D4.** `processAccount:151` wrote an invalid `Reason_For_Loss__s` value on duplicate silencing.
  Removed rather than substituted: an auto-silenced duplicate is a data artefact, not a commercial
  loss, and recording it as one would corrupt loss reporting and feed `processDeal`'s
  `hasLossReason` viability guard a non-commercial signal.
- **F2.** `Call_Purpose_Detail` write and its `purposeMap` deleted. Deliberately **not** repointed to
  `Call_Purpose`: Stage, Pipeline and Status already encode call purpose, the Call Subject carries
  `<Stage> Call <n>`, and `Call_Purpose` is both bin-resident and vocabulary-incompatible.

### 12.3 The model inversion (not yet fixed — Wave 3)

`Call_Task_Stage` has **3 writes, 0 reads**. `Task_Stage` has **5 writes, 0 reads**. All behaviour
reads `Calls.Sequence_Stage` and `Tasks.Task_Sequence_Stage`. The canonical fields are write-only
mirrors while the duplicates drive the logic. `Events.Meeting_Task_Stage` (2 reads, 1 write, no
duplicate) is already correct and is the model to copy.

The canonical stage family stores legacy values behind renamed display labels
(`Demo Booked`→"Demo Confirmation", `Commercials Sent`→"Proposal Preparation",
`Renewall`→"Renewal") and round-trips in display space, so both fields already accept the same eight
strings — **consolidation needs no value translation**.

`Tasks.Blocks_Sequence`: **9 writes, 0 reads.** Blocking is fully derived at
`routeContactSequence:363/1397` from `Task_Sequence_Managed` + `Task_Type` + `Status` +
`Task_Status`. The behaviour is required; the persisted field is not.

`Contacts.Sequence_Stage` is **not** a stage — it is the next-Activity-type cursor
(`Call`/`Email`/`Meeting`/`Task`). **D2** remains open: the code clears it by writing the literal
`"None"`, which is not a live option, so the cursor never clears. `Sequence_Step` *does* have a
`None` option, which is why the same idiom works there and masked the bug. The correct clearing form
needs a live write/read-back to establish.

### 12.4 Verification

- **Phantom api_names in v6: 0.**
- **Picklist validator** (module-attributed): only D2 remains; every other literal write matches
  live options.
- **Brace/paren balance** unchanged vs `HEAD` on all six edited files.
- **Zero dangling references** to any removed identifier.
- **booking suite: 456 pass / 3 fail — the 3 are pre-existing** failures in unrelated in-progress
  frontend work (`admin-form.html`, `manage.html`, build output), not caused by these changes.

### 12.5 Unrelated live change found

Zoho's display label for the `Trade Show` Lead Source was renamed **"Event" → "Trade Show / Event"**.
This drifts `zoho-fields.json` and `config/lead-sources.js`. Regenerating them is correct against
live but breaks two tests and three doc comments that hard-code `"Event"`
(`zoho-payload.test.js:167`, `booking.test.js:262`, `db/handlers.test.js:1229`,
`zoho-field-snapshot.js:45,232`). The regeneration was **reverted** to keep this change set clean —
decide whether the rename was intended (update the tests) or accidental (revert it in Zoho).

---

## 13. State reconciliation and corrections — 2026-08-11

The Zoho **MCP servers are disconnected**. All live evidence below was gathered read-only through
the repository's own Zoho REST client (`booking/integrations/zoho`, `requestZoho`), the same path
`zoho-field-snapshot.js` uses. Two settings endpoints are outside that client's scopes
(`/settings/functions`, `/settings/automation/*` → 400/404), so the deployed-function and
workflow-rule comparison rests on the MCP enumeration taken earlier today (17 functions, all
matching `v6/` by name).

### 13.1 Delta table

| Approved change | Repository state | Live Zoho state | Correction applied |
| --- | --- | --- | --- |
| Delete 5 dead activity fields | n/a | **Deleted** (Calls 45→42, Events 51→49) | none — complete |
| Phantom removals (`Contact_Source_Class`, `Profile_Completion_Status`, `Product_Interest_Staging`) | code refs removed | **All three ABSENT live** on every module — no field migration needed | Stale comments in 5 files corrected so none is described as required |
| `Primary_Contact` → `Deal_Primary_Contact` | write removed, not repointed | `Deal_Primary_Contact` custom lookup, **empty** | none — correct |
| Duplicate-Deal loss reason | write had been **removed** | `Reason_For_Loss__s` is **native** (`custom_field=false`), empty; `Lost_Reasons` is custom, **populated**, and already defines `Duplicate / Test Record` | **Repointed to `Lost_Reasons`** — the value exists there by design. Removal was wrong |
| `Call_Purpose_Detail` removal | removed with `purposeMap` | `Call_Purpose`/`Call_Agenda` remain binned | none — correct |
| D1 superseded Scheduled Send | `Deferred` + `Task_Status=Closed` | — | none — correct |
| Task stage migration (~153 Tasks) | not started | **Not needed**: 132 Tasks have both fields, **0 disagree**, **0** have `Task_Sequence_Stage` set with `Task_Stage` blank | Migration cancelled — copy is a no-op |
| `Quoted_Items` treated as suspect | — | **Native subform** (`data_type=subform`, `json_type=jsonarray`, `custom_field=false`) returning real Product lookups | **Retained**; removed from all deletion consideration |
| Lead Source `Trade Show` | tests asserted label `"Event"` | actual_value `Trade Show`, **display_value `Trade Show / Event`** | 2 assertions + 4 doc comments updated; snapshot regenerated |
| `Next_Comm_Follow_Up_Date` / WF010d | dormant | **empty** live, no writer | disposition below |
| `Commercials_Status`, `Commercial_Outcome` | zero functional refs (comments only) | both **empty** live | disposition below |

### 13.2 `Quoted_Items` — confirmed native, retained

`data_type=subform`, `json_type=jsonarray`, `custom_field=false`. A live Quote
(`991103000002921009`, Grand_Total 5981.75) returns one structured line carrying a real Product
lookup (`Jurnii UX`, `Product_Code: JUX`, id `991103000002158001`) plus `Quantity`, `List_Price`,
`Net_Total`, `Total`, `Discount`, `Tax`, `Line_Tax`, and the custom subform fields
`Quoted_Item_Pricing_Tier`, `Quoted_Item_Plan_Brands`, `Quoted_Item_Frequency`. Totals reconcile
(`Sub_Total == Grand_Total == Net_Total`).

**Why it appears in the unused-field bin:** the bin for Quotes is exactly
`Sub_Total, Discount, Tax, Adjustment, Grand_Total, Quoted_Items` — the entire native
inventory/computed block. These are rendered by the inventory section rather than as ordinary
layout fields, so `type=unused` lists them. It is a metadata artefact, not a bin placement, and
must not be read as "deletable".

### 13.3 Loss reasons — resolved

`Reason_For_Loss__s` is **Zoho-native** standard loss reporting (10 stock values, empty in this org).
`Lost_Reasons` is the **custom v6 scoped command** (13 values) and is the populated one. Its option
list contains reconciliation outcomes — `Invalid / Bad Data`, `Duplicate / Test Record` — that the
native field deliberately lacks. They are therefore **not competing commands**: the native field is
reporting-only and unused, the custom field is the automation authority. `processAccount` now writes
`Lost_Reasons = "Duplicate / Test Record"`. Nothing is written to the native field, nothing is
mapped lossily, and both fields keep their existing values.

### 13.4 Live population (read-only probe)

Empty: `Next_Comm_Follow_Up_Date`, `Commercials_Status`, `Commercial_Outcome`,
`Reason_For_Loss__s`, `Contract_URL`, `Contract_Renewal_URL`, `Account_Source_Class`; Calls module
has **0 records**. Populated: `Lost_Reasons`, `Contacts.Contact_AOR`, `Tasks.Task_Stage`,
`Blocks_Sequence` (216 `Yes` / 3 `No`), `Task_Pipeline`/`Task_Opportunity` (182 of 219 Tasks, mixed
`MQL`/`SQL`/`FTP`/`RTP` — consistent with point-in-time capture rather than a live mirror).

### 13.5 Corrected `Sequence_Stage` map (module-qualified)

The earlier map conflated two modules. Correctly:

| Module | Reads | Writes |
| --- | --- | --- |
| **Calls** (may migrate to `Call_Task_Stage`) | `handleCallOutcome:76` (`call`), `:236` (`ec`), `routeContactSequence:1508` (`ec`) | `handleCallOutcome:187` (`rescheduledCall`), `:262` (`rescheduledUpdate`), `routeContactSequence:1538` (`callMap`) |
| **Contacts — DO NOT TOUCH** (next-Activity cursor) | `handleCallOutcome:86` (`contact`), `routeContactSequence:228` (`contact`) | `handleTaskCompletion:542` (`cRe`), `:800` (`cUpd`), `routeContactSequence:1190` (`cUpd`) |

### 13.6 Verification

Phantom api_names **0**; picklist validator clean except D2; brace/paren balance unchanged vs `HEAD`
on all six edited functions; snapshot `--check` clean; **booking suite 478/478 green**.

### 13.7 Unresolved

- **D2** — `Contacts.Sequence_Stage` is still cleared by writing the literal `"None"`, which is not a
  live option. Left untouched per the instruction not to alter the Contact cursor; the correct
  clearing form still needs a controlled write/read-back.
- **Contract URL population** — both fields are empty with no writer. Retained (live templates
  reference them); the population process is still missing, so proposal and renewal emails currently
  merge an empty link.
- **Deployed-function / workflow-rule parity** — cannot be re-verified while the MCP is down.
- **Field retirements** (`Sequence_Stage`, `Task_Sequence_Stage`, `Blocks_Sequence`,
  `Deal_Primary_Contact`, `Next_Comm_Follow_Up_Date`, `Commercials_Status`, `Commercial_Outcome`,
  `Account_Source_Class`) — none performed. Each needs the report/view/layout dependency check that
  no available API exposes.
