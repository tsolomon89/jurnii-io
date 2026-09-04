# v6 Implementation-Readiness Corrections

**Created:** 2026-08-18 · **Marker:** `jurnii-doc-reconciliation-2026-08-17`
**Authority:** [`JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md`](JURNII_AUTHORITATIVE_COMMERCIAL_MODEL.md) — **unchanged by this document**
**Companion:** [`V6_DELUGE_FUNCTION_RESPONSIBILITY_LEDGER.md`](V6_DELUGE_FUNCTION_RESPONSIBILITY_LEDGER.md)

A bounded correction pass. It records settled rulings, corrects claims made in earlier documents that
the executable code refutes, and states target directions without implementing them.

**Sections:** 1 activation ruling · 2 no unused helper · 3 role classification · 4 leading Contact · 5 valuation · 6 complexity surfaces · 7 evidence preserved · **8 cadence correction**

**Nothing here is implemented.** No Deluge edit, no helper created, no workflow, field, picklist or
record change, no publish, no wipe, no re-import.

---

## 1. Activation is Contact-scoped — SETTLED RULING

**This is decided. It is not an open question and must not be re-raised.**

| Rule | Statement |
|---|---|
| `Who_Id` | **Required.** The Contact is the subject of the Activation Task |
| `What_Id` | **Optional relationship context.** Attach the Account's single Deal when it exists |
| Missing Deal | **Must not prevent** creating, committing, stopping or reactivating the Activation Task |
| Product interest, Quote existence, Deal resolution | **Must not determine cadence eligibility** |

**What this removes.** The structural exclusion that currently puts **419 of 647 Contacts** outside the
activation path entirely — `processContact:259-263` (`mql_no_product_deal`) and `processContact:312`
both `return` before the `Sequence_State="Not Activated"` write at `:322`, because activation needs a
Deal and a Deal needs a resolved Product. That requirement is a `Deal = Account × Product` carry-over,
not a model requirement: §5.4 scopes sequencing to the Contact and §2 permits an Account with no Deal.

**Relaxing the Task guard is NOT sufficient — corrected 2026-08-18.** Four downstream sites also
require a Deal id, verified against the executable bodies:

| Site | Blocker |
|---|---|
| `handleTaskCompletion:67-71` | returns `skip_no_related_deal` unless `$se_module=="Deals"` **and** `What_Id` non-null — silently dropping **37 of 219** live Tasks |
| **`routeContactSequence:67`** | `if(contactId == 0 \|\| dealId == 0)` → `skip_missing_ids` → **returns** |
| **`routeContactSequence:215-218`** | `deal_not_found` guard |
| **`sendSequencedEmail:29`** | same `skip_missing_ids` guard → **returns** |
| `sendSequencedEmail:151` | **`sendKey = contactId\|dealId\|canonicalKey`** — the Deal id is part of the idempotency key |
| `sendSequencedEmail:154` | audit-Task dedupe reads `getRelatedRecords("Tasks","Deals",dealId)` — Deal-scoped, so it cannot find a Contact-only audit Task |

**Required behaviour:**

1. **Activation commits regardless** — no Deal resolution is attempted or required to create, commit,
   stop or reactivate the Activation Task.
2. **Dispatch resolves context** — when `What_Id` is blank, `routeContactSequence` resolves the
   Contact → its Account → that Account's **single** Deal and uses it as optional context.
3. **If resolution fails, dispatch stops VISIBLY as unresolved** — a named review, not the present
   silent `skip_missing_ids` log line.
4. **SendKey and audit dedupe need a Contact-scoped form** for the no-Deal case.

> ⚠ **The "frees 419 Contacts" claim is withdrawn.** Until (2)–(4) land, relaxing
> `handleTaskCompletion` alone lets the Task commit and then loses the Contact at
> `routeContactSequence:67`. **No Contact is freed by the Task-guard change on its own.**

**Also corrected: "Flow A gates Flow B" is withdrawn.** Deal construction does **not** gate activation
authority. Activation is Contact-scoped; what Flow A supplies is *dispatch context*, not permission.

**Not implemented in this pass.**

---

## 2. No unused helper — corrected

The earlier plan listed "CREATE `_util_classifyContactStage`, publish first, nothing calls it yet, zero
risk" as a standalone work item. **That is withdrawn.** An uncalled helper is dead code and contradicts
the simplification objective, which is *fewer authorities*, not more files.

**Corrected rule:** if a shared classifier is justified, the implementation wave that creates it must
**rewire every intended caller in the same change**. It is created with its callers or not at all.

The same test now applies to every other proposed helper.

---

## 3. Contact-role classification — the premise was wrong, and that helps

The brief anticipated *"three independent mappings with different fallback behaviour."* Measured
against the executable bodies, that is **not what exists**, and the reality makes consolidation
strictly easier.

### 3.1 The three maps are byte-identical

Extracted and compared programmatically from `processLead.deluge`, `processContact.deluge` and
`processDeal.deluge`:

| | `dmTitles` | `euTitles` | `infTitles` |
|---|---|---|---|
| processLead | 149 | 133 | 133 |
| processContact | 149 | 133 | 133 |
| processDeal | 149 | 133 | 133 |

**`processLead` vs `processDeal`: IDENTICAL. `processContact` vs `processDeal`: IDENTICAL.** Same
titles, same order, all three. **415 distinct titles, and the three lists have ZERO overlap with each
other** (`dm∩eu = 0`, `dm∩inf = 0`, `eu∩inf = 0`).

Two consequences:

- **Consolidation is pure de-duplication.** There is no behavioural reconciliation to negotiate — one
  authority replaces three identical copies.
- **`processDeal:122`'s comment is both wrong and moot.** It claims *"precedence on duplicate titles:
  End User > Influencer > Decision Maker"* while the code tests `dm → eu → inf`, i.e. the exact
  inverse. Because the lists do not overlap, no title can reach the second test — the comment describes
  a precedence rule that can never fire, in the wrong order. Delete the comment; do not "fix" the code
  to match it.

### 3.2 The title-to-role fallback is also identical

All three: `resolvedRole = if(<picklistTitle> != "", "Decision Maker", "")`.

- an unmatched **picklist** `Job_Title` defaults to **Decision Maker** (a curated value with a missing
  map entry is treated as a curation gap)
- an unmatched **raw** `Job_Title_Raw` resolves to **blank**, deliberately refusing to guess on free
  text

That reasoning is sound and should survive consolidation unchanged.

### 3.3 The real differences are in write target and trigger posture

| Site | Writes to | Guard | Triggers |
|---|---|---|---|
| `processLead:252` | **`Leads.Contact_Role1`** (pre-conversion) | role blank | ⚠ **no `noTrigger`** — re-fires WF001a on the same Lead |
| `processLead:518` | `Contacts.Contact_Role1` (post-conversion) | blank-only | within the conversion update |
| `processContact:186` | `Contacts.Contact_Role1` | blank-only | within `updConInit` |
| `processDeal:247` | `Contacts.Contact_Role1` | blank-only | `noTrigger` |

The `processLead:252` unsuppressed write is a genuine re-entrancy defect and is the most likely
duplicate-Deal racer.

### 3.4 The one genuinely divergent fallback — and it is the consequential one

**`processDeal:218`** builds the junction stamp map with:

```
contactRoleMap.put(cId, ifnull(fullC.get("Contact_Role1"), "Decision Maker").toString());
```

This does **not** resolve from title. A Contact whose role is blank is **assumed Decision Maker** for
the `Contact_Roles` junction. Combined with §4 below — where a blank role also ranks top in
leading-Contact selection — this systematically **inflates the Decision Maker segment** wherever
classification failed. That is the divergent fallback worth correcting.

### 3.5 Target direction

**One governed classification authority** for `Decision Maker` / `Influencer` / `End User`.

- **The Contact owns the role** (`Contacts.Contact_Role1`).
- The native **Deal Contact Role junction is a synchronized relationship representation**, derived from
  the Contact — never an independent classification. Junction writes live at `processContact:293` and
  `processDeal:509`; they must read the Contact, never assume.
- A blank role must remain **blank** — never silently promoted to Decision Maker, in either the junction
  map or the selection ranking.
- The 415-title corpus moves to exactly one place; all three inline copies are deleted in the same
  change.

**Not implemented in this pass.**

---

## 4. Leading-Contact selection — corrected: two selectors, not one

There are **two selectors, not one**, and the one the brief describes is the *fallback*. Corrected
against the executable body.

### 4.1 Selector 1 — the winner: `ctrlContactId`, the controlling Quote's Contact

`processDeal:2144-2145`:

```
dealContactId = furthestContactId;
if(ctrlContactId != "") { dealContactId = ctrlContactId; }
```

**The Quote-derived Contact wins whenever it exists.** `furthestContactId` is only used when no open
Quote on the Deal carries a `Contact_Name`. Derived at `processDeal:1830-1887`:

- **Universe:** the Deal's Quotes, excluding both `Closed Lost` **and** `Closed Won` (`:1849`).
- **Primary key:** highest `Quote_Stage` rank —
  `{Draft:1, Negotiation:2, On Hold:2, Delivered:3, Confirmed:4, Closed Won:5}` (`:1833`); unknown → 0.
- **Tie-break:** `dqId.toLong() > ctrlContactQuoteId` — **the higher Quote record id wins.** Zoho ids
  increase monotonically, so this is a **recency tie-break by proxy**.
- **No role input and no Contact-Stage input at all** on this path.

### 4.2 Selector 2 — the fallback: `furthestContactId`

1. **Candidate set** (`:322-338`) — Contacts with `State == "Open"`, tied at the **maximum Contact Stage
   rank**. A missing/unknown Stage defaults to rank 1.
2. Single candidate → taken.
3. Multiple → **role rank** `{Decision Maker:3, End User:2, Influencer:1}` (`:537`).
4. Equal role rank → **incumbency**: the Deal's existing `Contact_Name` is retained (`:550-553`).
5. Otherwise → **related-list iteration order** (strict `>`, so the first candidate encountered holds).

### 4.3 Corrections to the brief's characterisation

| Brief said | Actually |
|---|---|
| "selects the furthest Stage first" | Only in the **fallback** selector. The winner is Quote-derived and never looks at Contact Stage |
| "uses role only as a tie-break" | **Confirmed — in the fallback.** The winning selector has **no role input at all** |
| "has no recency tie-break" | **REFUTED.** The winning selector's tie-break is the higher Quote id — recency by proxy. The *fallback* has none |

Three further defects, both selectors:

- **Blank/unknown roles rank TOP.** `ifnull(contactRoleMap.get(...), "Decision Maker")` (`:542`) and
  `ifnull(roleRanks.get(...), 3)` (`:543`) both default to the highest rank, so an unclassified Contact
  outranks a known End User. Same inflation as §3.4.
- **Iteration order decides real cases.** Two equal-role non-incumbent candidates are separated by
  related-list order, which is not a defined ordering.
- **`primaryContactId` and `dealContactId` can disagree.** `primaryContactId` (`:560-561`) is derived
  from `furthestContactId` only, and is what gates and Manual Review targeting use — so whenever
  `ctrlContactId` is set, **the Deal's `Contact_Name` and the Contact that reviews are raised against
  can be different people.** This is the most consequential finding in this section.

### 4.1 Target ordering

Applied in order, each stage narrowing the candidate set:

1. **Contact viability** — `State = Open`. *(retained; already first)*
2. **Decision-making authority** — `Decision Maker > Influencer > End User`. A **blank role does not
   rank**; it sorts last, never first. *(moved above progression — see the note below)*
3. **Contact progression** — highest Stage rank.
4. **Relevant recency** — most recent meaningful progression. Candidate evidence, to be settled in the
   implementation wave: `Contacts.Contact_Completed_*_At` for the current Stage (already maintained,
   non-reconstructable, Contact-owned) in preference to `Modified_Time`, which any automation write
   perturbs.
5. **Stable final tie-break** — incumbent `Contact_Name` if still a candidate; otherwise **lowest
   Contact id**. Never iteration order.

> ⚠ **This inverts factors 2 and 3 relative to the current code**, which ranks progression above
> authority. It is a deliberate semantic change implied by the owner-stated ordering, and it will move
> `Deals.Contact_Name` on Accounts where a further-progressed End User currently outranks a
> less-progressed Decision Maker. It should be measured on fixtures before it ships.

**The `ctrlContactId` override must be reconciled with this ordering**, not left to silently supersede
it — a controlling Quote's Contact is strong evidence of both authority and recency, so it belongs
*inside* the ordering, not bolted on after it.

**Not implemented in this pass.**

---

## 5. Valuation — the corrected hierarchy

### 5.1 The earlier wording was wrong

An earlier document recorded the target as:

> ~~`tier → Quote line price → Quote total → Deal.Amount`~~

**That is withdrawn.** It conflates two unrelated things that merely share the word "tier". The
executable code already distinguishes them correctly:

| Concept | Field | Determines |
|---|---|---|
| **Company Tier** | `Accounts.Company_Tier` (1 / 2 / 3) | The **Target ACV benchmark** — 26000 / 16500 / 10500. An estimate of relationship value |
| **Quote pricing tier** | `Quoted_Item_Pricing_Tier` (Base / Markup / Agency) | One of **five inputs** to an actual **line price** |

`_util_resolveQuoteLinePrice(productId, planType, brandsStr, tier, frequency)` prices a line from the
banded matrix. Company Tier is **not** an input to it. A line is priced as *per-brand rate × brand-market
count*, where the band selects the volume-discounted rate.

**Company Tier never determines a line price. It never has.**

### 5.2 A Quote is a Product instantiation

Where no Product is known, **no real Product Quote can exist**. A Productless or placeholder Quote must
never be created merely to carry a Target ACV.

### 5.3 The five-level hierarchy

| # | Condition | Value | Where it lives |
|---|---|---|---|
| **1** | **No Product known** | Company-Tier **Target ACV** as an *estimated relationship value* | `Deals.Amount`, basis `target_acv_pipeline`. **No Quote is created** |
| **2** | **Product known, insufficient pricing evidence** | Quote exists, explicitly **unpriced or target-valued** | `Quotes.Quote_Target_ACV` (benchmark) with `Grand_Total = 0`. This is what the **74 zero-priced Draft Quotes** are |
| **3** | **Sufficient Product configuration** | Actual **line price → Quote total** | `Quoted_Items` line totals → `Quotes.Grand_Total` |
| **4** | **Applicable authoritative Quote totals** | **Deal Amount roll-up** | `Deals.Amount`, basis `quote_sum` |
| **5** | **Historical or successor Quotes** | **Excluded** where counting them would duplicate value | Closed-Lost excluded; a Renewal successor must not double-count its predecessor |

The live code at `processDeal:2292-2352` **already implements a close approximation** of this, including
the subtlety that an Open **RTP** Deal with no priced Quote resolves to **0, never Target ACV** — its own
comment states *"Target ACV is a benchmark, not an RTP renewal value."* It also reads the **live Account
tier**, not the Deal mirror, and never uses `Product.Unit_Price`.

### 5.4 Where Target ACV is stored and reported — no new field

Answering the brief's question directly:

- **Per Quote:** `Quotes.Quote_Target_ACV` already exists and is populated 125/125. Written from Company
  Tier at `processDeal:1507`, `:1545`, `:1715` and `_util_applyQuoteLifecycle:193`.
- **Per Deal with no Product at all:** the benchmark lives in `Deals.Amount` itself, under basis
  `target_acv_pipeline`.

**No additional field is required, and none should be added.** The remaining defect is not a missing
field — it is that **`Deals.Amount` is dual-meaning with no stored discriminator**. `amountBasis` is
computed at `:2307-2341` and then **only written to the `info` log** (`:2351`); it is never persisted.

**Resolution without a new field:** the basis is **derivable** at read time — a Deal with at least one
active priced Quote is `quote_sum`; a Deal with none and `Opportunity_Type ∈ {MQL, SQL, FTP}` is
`target_acv_pipeline`; RTP with none is 0. Reporting derives it rather than storing it.

### 5.4a Two further defects in the pricing path

- **Only the `Base` pricing tier is reachable from automation.** Four of the five call sites hardcode
  `"Base"` (`processDeal:953`, `:1072`, `:1349`; `handleTaskCompletion:1178`); only `processDeal:926`
  passes a real value, and only by echoing the line's existing tier. `_util_normalizeToProductQuoteTuples:124`
  and `:197-198` hardcode `"Base"` at import, **so a Markup or Agency contract loses its tier on the way
  in.** The Markup and Agency rows of the matrix are currently dead code. *(Jurnii 360's Markup and
  Agency rows are identical to Base in both the CSV and the code — only Jurnii UX has a channel uplift,
  so the loss is UX-specific.)*
- **`Quotes.Quote_Target_ACV` is never read back by any Deluge code** — grep returns writes only. It is
  reported through the formula field **`Quotes.Quote_ACV_Gap`** (= `Quote_Target_ACV − Contract_ACV`),
  which goes negative on good deals. That is a benchmark-versus-actual variance, which is exactly what a
  target is for and exactly what a price is not.

**Live formula verification (2026-08-18):** Quote `991103000002933005`, Flutter UK & Ireland — Jurnii 360
Renewal: brands 8, frequency `1x per day`, tier Base → band 10, PPB 9,676.80 → **9,676.80 × 8 =
77,414.40**, against a live `Grand_Total` of 77,414. The line-pricing formula is live-correct.

### 5.5 What actually changes

**Not the valuation logic.** The £878,500 / 57.3% figure is a **cardinality artefact, not a valuation
error**: under `Deal = Account × Product` the tier benchmark is applied *per Product Deal*, so an Account
with three Product Deals books 3 × £26,000. Under one Deal per Account it is booked once. Collapsing the
Deal cardinality corrects the number without touching the hierarchy.

Two genuine follow-ups remain:

- **Jurnii Cortex is not in the pricing matrix** and cannot be auto-priced — it raises Manual Review by
  design. This is a real contributor to the 74 zero-priced Drafts and is a **pricing-coverage** question,
  not a code defect.
- **Level 5 (successor exclusion)** needs explicit verification once one Deal carries Acquisition and
  Renewal Quotes for the same Product simultaneously — a condition that does not exist in live data today.

> **`processDeal:2318-2335` is NOT to be rewired** until the above is agreed. Its logic is closer to
> correct than the earlier summary implied; what it needs is the correct Deal cardinality beneath it.

**Not implemented in this pass.**

---

## 5a. `Accounts.Account_Status` — do not repair without a proven consumer

An earlier plan item proposed classifying a Deal-less Account as `Prospect`. **Withdrawn.**

Verified 2026-08-18: `Accounts.Account_Status` is **write-only**. Sole writer
`_util_rollupAccountState:102`. **Zero readers** across all 38 `.deluge` files and all of `booking/` —
the single booking occurrence is a field-name entry in a test fixture, not a read. The function's own
comment at `:104` concedes *"State / Account_Status are currently unused on live Accounts (all null)."*
Live population 75/372.

Account is company identity; the **Deal** owns relationship state. Under the owner's retention rule —
*"a possible future use is not enough"* — `Account_Status` fails the same test as `Accounts.State`.

**Action:** reclassify **RETIRE**, alongside `Accounts.State` and `Accounts.Lost_Reasons`. Add no new
behaviour to it. The roll-up fix keeps only what the corrected model breaks — removing
`_util_rollupAccountState:53` and the `::active` scoping at `:52`, both of which exclude the canonical
Deal. If a reporting or integration consumer is identified before the retirement wave, it returns to
KEEP and the `Prospect` rule may be reconsidered then — but it must be **proven**.

---

## 5b. Quote integrity — a gap to close, not logic to preserve

`processDeal:1898-1973` §6b holds **four branches, all Deal-product-identity logic**. **None validates
Quote integrity.** Three delete with the model; the fourth (FTP+ with no Product evidence anywhere)
re-scopes against the Account's Quotes rather than Deal identity.

**Verified: no header-versus-line Product consistency check exists anywhere in the 38 files, and no
multi-line Quote guard exists either.** Blocker B3 proved 125/125 agreement by manual query — but
**nothing enforces it**.

So the correction must **add** what the deletion removes the illusion of:

- one Product per Quote (`Quoted_Items` line count == 1)
- header `Quote_Product` agrees with the `Quoted_Items` line Product
- violation raises a **Quote-scoped** review, never a Deal-product review

`_util_matchDraftQuotes` is untouched — it already discriminates by `Quote_Product` **within one Deal**
and becomes more load-bearing, not less.

---

## 6. Complexity surfaces

Complexity reduction here means **fewer authorities, fewer repeated rules, and a one-directional
execution flow** — *not* automatically more files. Large functions are not assumed to need splitting.

| # | Surface | Where | Direction |
|---|---|---|---|
| 1 | Product-Deal creation and resolution | `processLead`, `processContact`, `processAccount`, `processDeal`, `_util_createOrReuseProductDeal` | **One** Account-Deal resolver, called once per entry point. Five sites collapse to one authority |
| 2 | Product-scoped Contact Roles | `processDeal:449-487` | Delete. The Deal joins **all** the Account's Contact opportunities (§2). The correct fallback already exists at `:471-472` and becomes the only path |
| 3 | Multi-Product activation ambiguity | `processContact:354-358` + registry `_util_resolveManualReviewCode:37` | Delete — arithmetically unreachable once an Account has one Deal. **Delete, do not bypass** |
| 3a | **`Account_Key` derived three times with three DIFFERENT precedences** | `processLead:296-314` (Website → email domain → Company) · `processContact:64-131` (Website → email → Account_Name, plus a second no-Account branch) · `processAccount:50-65` (**Website → Account_Name only — no email fallback**) | ⚠ **A genuine divergence, unlike the role maps.** Three authorities that can derive different keys for the same company. One authority, one precedence |
| 3b | **`Deals.Deal_Key` UNIQUE is declared but NOT enforced live** | Deals `991103000003645011` / `991103000003655003` both hold `jurnii-e2e.dev::jurnii_360` | One-Deal-per-Account must be enforced **in code** (re-search after insert, collapse duplicates), never by trusting the field property |
| 4 | Duplicated title-role maps | 3 × 415 titles, byte-identical (§3) | One authority. Pure de-duplication, no reconciliation |
| 5 | Repeated Stage/rank/classification maps | `stageRanks` at `processDeal:119`, `processContact:43`, `handleMeetingEvent:116`; `stageOpportunity` at `routeContactSequence:414-422`; `contactStageFields` at `processContact:196+` | One authority **created together with its callers** (§2). Note `routeContactSequence`'s copy is already model-correct and becomes the reference |
| 6 | `routeContactSequence → processDeal → routeContactSequence` re-entry | `routeContactSequence:1323`; `processDeal:2683`, `:2723` | Make the flow **one-directional**. Re-entry is the hardest thing to reason about in the system and the likeliest source of duplicate side effects |
| 7 | Responsibility concentration | `processDeal` (2765), `routeContactSequence` (1688), `handleTaskCompletion` (1461) | Reduce **authorities**, not necessarily line count. The ledger records where each responsibility would go *if* redistributed — it does not mandate splitting |
| 8 | Retired commercial-follow-up branch | `sendCommercialFollowUp`, the `commercial:followup_due` branch, WF010d, `Deals.Next_Comm_Follow_Up_Date` | Retire as a unit. Never fired: trigger field 0/96 populated, zero writers |
| 9 | Helpers existing only for `Deal = Account × Product` | `_util_pipelineForProductKey`, `_util_createOrReuseProductDeal` | Retire with the model. **Do not** retire `_util_computeProductKey`, `_util_resolveDealProduct`, `_util_collectProductEvidence`, `_util_normalizeToProductQuoteTuples` or `_util_matchDraftQuotes` — each carries capability the Quote model still requires |

---

## 7. Evidence preserved from earlier passes

| Finding | Status |
|---|---|
| Gmail verification works and stays part of email acceptance testing | **Valid.** Assertions upgraded from "nothing was sent" to "the right message arrived" |
| Zero CRM cadence emails in 120 days | **Valid** — supports the finding that activation has never successfully completed. Independent of Zoho's own counters |
| Booking calendar invitations arrive | **Valid, and correctly scoped** — proves the **Google booking path** works. Says **nothing** about the CRM cadence path |
| Leads are disposable | **Valid** — all booking-form data is test data |
| No migration of the Product-Deal graph required | **Valid**, conditional on the owner-authorised rebuild remaining safe. See [`V6_REBUILD_VS_MIGRATE.md`](V6_REBUILD_VS_MIGRATE.md) |

---

## 8. Cadence — corrected account

The earlier documents described the cadence loosely. Read from the executable body, the current
implementation is **not** two interchangeable routes. The brief's characterisation is confirmed in
every particular.

### 8.1 What the code actually does — CONFIRMED

**Cadence Stages** (`routeContactSequence:390`) — five, and only these:

```
cadenceStages = {"Marketing Consent", "Demo Booking", "Demo Hosted", "Commercial Agreement", "Renewal"}
```

**On entering a cadence Stage** (`:830-849`):

| `Sequence_Type` | Action | Effect |
|---|---|---|
| `Call` | `create_call` | Call 1 only |
| `Email` | **`send_opener_then_call`** | Sends the opener **and creates Call 1** |
| `Manual` | — | `Stopped`, no dispatch (`:999`) |

The action name is literal. **The Email route is not an alternative to the Call route — it is the Call
route with an email prepended.**

**On a non-progressing Call outcome** (`call:neutral` / `call:noanswer`, `:494-518`):

| Condition | Behaviour |
|---|---|
| `stepNum < 5` | `nextStep = stepNum + 1`, `action = create_call`, `dueOffsetDays = 2`, **plus a side email** (`sideEmailKind = "cadence"`, `sideEmailStep = stepNum`) |
| `stepNum >= 5` | Switch to Email: `schedule_email`, `emailKind = "postcall"`, `dueOffsetDays = 2`, plus side email step 5 |

So: **five numbered Call attempts per cadence Stage, each carrying a side email, then a post-call
email.** Call Subject is `"<Stage> Call <attempt>"` (`:1533`); the attempt is stored in
`Sequence_Attempt` (`:1539`).

**Template resolution** (`sendSequencedEmail:59-66`): key format `<stage-slug>:<step>:<kind>` where
step 1 is `initial`, steps 2–4 `follow-up`, step 5 `final`. Two aliases matter:

- `opener` → `<stage>:1:initial`
- `postcall` → **`<stage>:5:final`**

The post-call email therefore **reuses the step-5 template**. In the current model, chain steps 2–4 are
reachable *only* as side emails during Calls 2–4, and step 5 is reachable both as a side email and as
the post-call send.

### 8.2 The assets already match the required model

**41 email templates + README.** Every one of the five cadence Stages carries a complete five-step
chain, and the registry (`sendSequencedEmail:73-97`) registers exactly **25 cadence templates**
(5 stages × 5 steps):

```
<stage>-1-initial.md   (+ -1-initial-warm.md, -1-initial-cold.md)
<stage>-2-follow-up.md
<stage>-3-follow-up.md
<stage>-4-follow-up.md
<stage>-5-final.md
```

**This is precisely the "existing follow-up email chain" the required model calls for**, and it is the
same chain in both routes — which is why the copy was written to stay coherent either way. **No new
email needs to be written, and none should be invented.**

Non-cadence templates sit outside the chain and are unaffected: `demo-confirmation-0-*` (confirmation /
reminder / no-show), `proposal-preparation-0-post-demo`, `commercial-agreement-0-proposal-sent`,
`onboarding-0-signed-confirmation`.

### 8.3 Current versus required transition table

| Event | Current | Required |
|---|---|---|
| Activate `Manual` | `Stopped`, no dispatch | **unchanged** |
| Activate `Call`, enter cadence Stage | `create_call` → Call 1 | **unchanged** — Call 1 |
| Activate `Email`, enter cadence Stage | `send_opener_then_call` → opener **+ Call 1** | **email chain step 1 only. No Call is created** |
| Call 1 non-progressing | Call 2 + side email (step 1) | **enter the email chain at step 1**; no Call 2 |
| Call 2/3/4 non-progressing | Call 3/4/5 + side email | **do not exist** |
| Call 5 non-progressing | `postcall` email = `:5:final` | **does not exist** |
| Email chain step *n* non-progressing | only reachable as a side email | **advance to step *n*+1**, up to step 5 |
| Email chain step 5 (`final`) exhausted | — | **cadence complete for this Stage**; no further automated send |
| Call progresses (`call:positive`) | supersede → advance Stage | **unchanged** |
| Stage entry | supersede prior, start the Stage's cadence | **unchanged**, but the route decides Call-then-chain vs chain-only |

**Net effect: 5 Calls per Stage become at most 1.** The email chain stops being interleaved side traffic
and becomes the sequence proper.

### 8.4 Asset discrepancies — reported, not silently resolved

| # | Discrepancy | Detail |
|---|---|---|
| **D1** | **Demo Hosted has 3 call scripts; the code runs 5 attempts** | `call_scripts/Demo Hosted/` holds 3. Attempts 4 and 5 have no script today. **Under the required model this resolves itself** — only one Call is made |
| **D2** | **Onboarding has 5 call scripts but is not a cadence Stage** | `Onboarding ∉ cadenceStages`, so those 5 scripts are unreachable by the router. Either Onboarding should be a cadence Stage or the scripts are for manual use — **owner decision, no code implication yet** |
| **D3** | **Folder name ≠ Stage value** | `call_scripts/Marketing Qualification/` vs the live Stage `Marketing Consent`. Cosmetic, but it invites an agent to invent a "Marketing Qualification" stage |
| **D4** | **Demo Confirmation has 1 call script and is not a cadence Stage** | Consistent with it being a meeting-class stage, not a cadence stage. No action |

**With the required model, the call-script count needed per cadence Stage drops from 5 to 1** — so the
existing 5-script sets become an over-supply rather than D1's under-supply. Which single script is
canonical per Stage is a **content decision for the owner**, not a code decision.

### 8.5 Invariants preserved

Every one of these is already satisfied by the current design and must remain so:

| Invariant | Mechanism that enforces it |
|---|---|
| Cadence belongs to the Contact | `Sequence_*` fields are Contact-owned; `routeContactSequence` is Contact-keyed |
| Product count does not affect activation or routing | Guaranteed once the §1 ruling and the one-Deal model land; `cadenceStages` never consults Product |
| A route change follows the Activation Task transition rules | `ActivationCommand|state=Won|type=<T>` marker; `:953` re-establishes at Stage entry |
| Every successful automated email has exactly one Task audit record | `sendSequencedEmail` `tkMap` creates one `Email Sent` Task per send |
| An `Email Sent` Task cannot advance the Contact as a Won sales activity | `handleTaskCompletion:45` hard-returns on `Email Sent` |
| Scheduled and superseded sends cannot duplicate or go stale | SendKey `<stage-slug>:<step>:<kind>` idempotency + the supersede path that Defers the scheduled Task |

> ⚠ **The supersede path is the one to watch.** Collapsing 5 Calls to 1 changes which records are
> outstanding when a supersede fires. The `Deferred` + `Closed` correction already staged in the
> uncommitted `routeContactSequence` edit is a prerequisite, not an optional extra — a superseded
> Scheduled Send that stays `Not Started` is exactly the stale-email failure this invariant forbids.

**Not implemented in this pass.**
