# Part 3: Type Hierarchy & Execution

> The five-level execution spine, the "All" classifier, the qualification loop, and a worked example.

---

## The Five Levels

Every object in your commercial motion lives somewhere in this hierarchy. Every contact touchpoint, every campaign, every asset, every click — all of it lands on one of five levels at a typed coordinate. That coordinate is the object's name, and the name is the type.

```
Pipeline
  └── Campaign
        └── Asset Group
              └── Asset
                    └── Activity
```

Each level inherits typed fields from its parent and adds typed slots of its own.

---

## Level 1: Pipeline

A Pipeline is the highest-level commercial process container. It groups Products and Opportunities by type for forecasting and reporting.

**Composed of two typed fields:**

| # | Field | Source | Examples |
|---|-------|--------|---------|
| 1 | `productType` | Product classification | B2B, B2C, Reseller, Partnership, Investment |
| 2 | `opportunityType` | Lifecycle stage | MQL, SQL, FTP, RTP |

**Naming formula:** `productType • opportunityType`

**Examples:** `B2B • MQL`, `B2C • FTP`, `Reseller • RTP`

Pipelines self-populate when Products are created with a type. No separate administration required.

---

## Level 2: Campaign

A Campaign is where the audience meets the offering in a specific context. It inherits both Pipeline fields and adds two more.

**Composed of four typed fields:**

| # | Field | Source | Examples |
|---|-------|--------|---------|
| 1 | `productType` | Inherited from Pipeline | B2B |
| 2 | `opportunityType` | Inherited from Pipeline | MQL |
| 3 | `personaType` | Set at Campaign level | Decision Maker, End User, Influencer |
| 4 | `useCaseValue` | Set at Campaign level | Marketing, Agriculture, UK |

**Naming formula:** `productType • opportunityType • personaType • useCaseValue`

**Examples:** `B2B • MQL • Decision Maker • Marketing`, `B2C • SQL • End User • UK`

**Combinatorial generation:** Every Product × every Persona Type × every Opportunity Type × every Use Case = a Campaign. This guarantees total coverage — no slice of commercial reality lacks a Campaign to land in.

### Campaign Settings

- **Contact Lifespan**: Duration before inactive contact is removed (default 70 days per GDPR).
- **Persona Match**: Minimum threshold before contact is added.
- **Engagement Goal**: Expected conversion frequency from Activities.

---

## Level 3: Asset Group

An Asset Group is the semantic bridge between Campaign strategy and Asset execution. It inherits all four Campaign fields and adds three.

**Composed of seven typed fields:**

| # | Field | Source | Example |
|---|-------|--------|---------|
| 1 | `productType` | Inherited from Pipeline | B2B |
| 2 | `opportunityType` | Inherited from Pipeline | MQL |
| 3 | `personaType` | Inherited from Campaign | Decision Maker |
| 4 | `useCaseValue` | Inherited from Campaign | Marketing |
| 5 | `segment` | Set at Asset Group level | Director |
| 6 | `subjectType` | Set at Asset Group level | Brand, Product, Feature, Solution, Use Case |
| 7 | `subject` | Set at Asset Group level | Automation |

**Naming formula:** `productType • opportunityType • personaType • useCaseValue • segment • subjectType • subject`

**Example:** `B2B • MQL • Decision Maker • Marketing • Director • Feature • Automation`

### Subject Types

The `subjectType` field takes one of: Brand, Product, Feature, Solution, Use Case. It names what kind of thing the Asset Group is about. The `subject` field takes the specific named instance.

### Segments vs. Use Cases

The same token (e.g., "Agriculture") can appear as a Use Case in one Campaign and as a Segment in another Asset Group. The distinction is **positional** — which level of the hierarchy is doing the slicing.

### Asset Group Keywords

Keywords = Asset Group Focus name + named property from Asset Group Audience + Use Case.

---

## Level 4: Asset

An Asset is the atomic unit of execution — a deployable media/content object. Its job is to catalyse a state change in a prospect.

**Inherits all seven Asset Group fields and adds:**

| Field | Description |
|-------|------------|
| `headline` | Unique headline, max 90 characters |
| `version` | Version number (V.01, V.02) |
| `source` | Referring URL / placement |
| `referralType` | Paid or Organic |
| `medium` | Type of media |
| `channel` | Distribution method |

**Naming formula:** `Headline • Version`

**Example:** `AutomateYourPipeline • V.01`

### Medium Types

| Medium | Description |
|--------|------------|
| Dynamic Ad | Combination text & image or video |
| Post | Tweets, shares, social posts |
| Collection | Newsletters, carousels |
| Message | Sales emails, calls, direct communications |
| Article | Long-form content (1,500–7,500 characters) |
| Document | PDFs, brochures, ebooks, slides |
| Page | Website pages, one-pagers, landing pages, flyers |
| Presentation | Webinars, instructional videos, podcasts |
| Exhibit | Tradeshow materials |

### Channel Types

| Channel | Examples |
|---------|---------|
| Social | Facebook, YouTube, LinkedIn, Instagram |
| Display | Placement URLs, social media display |
| Search | Google, Bing |
| Website | Direct / referral URLs |
| Event | Event host URLs, webinar providers |
| Email | Email service provider URLs |
| Call | Phone service provider URLs |

### The Single-Subject Rule

**Every Asset has one subject.** The subject is carried by `subjectType` and `subject` inherited from the Asset Group. An Asset about Feature Automation is about Feature Automation — not also about Solution Scoring and Use Case Agriculture. This is compositional, not stylistic.

### Versioning & Testing

Each Asset has one active Version. Different split-test versions are tracked with an A/B Test field. Publish better-performing tests as the new version and continue experimenting.

---

## The "All" Classifier and the Horoscope Principle

### The Compositional Rule

Every Asset has one subject. Most Assets do not need every slot specified. Specifying every slot often hurts the copy — the moment you frame a piece for Decision Makers specifically, End Users read the framing, notice it's not for them, and leave.

**"All"** is the reserved value that lets you say, at any typed slot, that the Asset is deliberately unspecified at that position:

- `personaType = All` → not framed for DM, EU, or IN specifically
- `useCaseValue = All` → not anchored to a particular field value
- `segment = All` → not sliced to a specific firmographic cut

### The Horoscope Principle

Great copy, like a good horoscope, feels written for the reader while being written for many readers at once. The writer manages this through two simultaneous moves:

1. **Disqualifier** — Establish a clear identifier so the wrong audience self-removes.
2. **Room** — Leave enough space for the right reader to complete the sentence in their head.

Copy that is all disqualifier reads as niche and cold. Copy that is all room reads as vague.

The type hierarchy enables this by giving writers typed slots to fill for specificity and "All" to use when the copy must leave room.

### Attribution Consequence

Because every Asset is typed — including those with "All" slots — every contact who touches an Asset lands somewhere in the graph. Specified buckets catch specialists. "All" buckets catch generalists. No behaviour is lost.

---

## Level 5: Activity

An Activity is an event or change record — the atomic unit where qualification happens. It is where the typed hierarchy meets actual Contact behaviour and either gets confirmed or falsified.

### Four Activity Archetypes

| Type | Description | Won When |
|------|------------|----------|
| **Data** | Creating, updating, editing contact/account records | Target field changes from null to non-null |
| **Asset** | Creating, versioning, publishing media | All required creative fields populated + admin approval |
| **Engagement** | End Users sharing Assets with Contacts; Contacts interacting with Assets | Contact triggers Asset Converted = TRUE |
| **Admin** | Approving, publishing changes; assigning new activities | Related activity marked Approved |

### Activity Qualifiers

Every Activity has boolean Qualifiers — conditions that evaluate TRUE or FALSE:
- Budget > threshold
- Decision Maker present
- Contract signed
- GDPR opt-in received

When all Qualifiers evaluate TRUE within the set duration → **Won**.
When threshold evaluates FALSE, or health score decays to zero, or expiry window elapses → **Lost**.

---

## The Qualification Loop

This is the epistemic payoff of the entire system.

### The Model Is a Hypothesis

The relational graph is a collection of claims:
- Contacts matching Persona Y tend to want Product X
- Features of shape A tend to pair with Solutions of shape B
- Use Cases in Sector C tend to accompany personaType DM

Until a real prospect tells you what they want, every edge is a hypothesis.

### Activities Test the Hypotheses

- **Won Activity** → confirms the typed lineage that produced it. The model's prediction at that coordinate is confirmed.
- **Lost Activity** → falsifies something upstream. The prediction was wrong.

### Two Visible Failure Modes

| Failure | Meaning | Action |
|---------|---------|--------|
| **Model is wrong** | Graph edges don't match commercial reality | Revise edges: add/remove/modify connections |
| **Read is wrong** | Graph is right but team is misassigning contacts to Personas | Correct process, not structure |

Both become actionable **only** when the data is typed cleanly enough to tell them apart.

### Bidirectional Testing

The qualification loop operates in both directions simultaneously:

- **The site tests the buyer.** Every click submits evidence about the buyer's intent — which Feature pages they visit, which Solution they linger on, which Use Case landing page they arrived through. The site assembles a typed profile before any form is filled.
- **The buyer tests the site.** Every page the buyer reads is an answer to their internal sentence: "Do they have the [Feature] I need? Does it do the [Solution] I'm looking for? Have people like me [Use Case] used this before?" If the site fails to answer, the buyer navigates away.

Both tests happen on the same visit. The typed structure ensures the site's answers and the buyer's questions use the same vocabulary. When those vocabularies diverge — when the site says "comprehensive platform" and the buyer is searching for "lead routing" — both tests fail.

---

## Workflows

Steps, Sequences, and Stages structure Workflows:

- **Step** = Asset + Engagement Activity assigned to an End User and a Contact. Purpose: generate Engagement Activity. If no Activity within set duration, next Step triggers.
- **Sequence** = Group of Steps to follow up non-Activity. Can be for specific Asset Groups or entire Campaigns.
- **Stage** = Group of Sequences. Goal: Qualification Goals related to a Campaign's Opportunity Type.

Workflows can have one or many Stages. Workflows can be used in many Campaigns but Campaigns only have one Workflow.

---

## Worked Example (End to End)

### Setup

- **Product**: Revenue Platform
- **productType**: B2B
- **opportunityTypes**: MQL, SQL, FTP, RTP
- **Pipeline**: `B2B • MQL`

### Persona

- **Decision Maker** + {Department: Marketing, Seniority: Director, Company Size: 201–1000, Geography: UK, CRM: HubSpot}

### Campaign

- `B2B • MQL • Decision Maker • Marketing`

### Asset Group

- Focus: Feature `Automation`
- Segment: `Director`
- Full name: `B2B • MQL • Decision Maker • Marketing • Director • Feature • Automation`

### Asset

- Headline: `AutomateYourPipeline`
- Version: `V.01`
- Source: `google.com`
- Referral Type: `Paid`
- Medium: `Page`
- Channel: `Search`

### Contact Interaction

- **Contact**: `sarah.jones@acme.com`
- **Account**: `acme.com`
- **Data Activity**: Enriched record with Department and Seniority → Won
- **Engagement Activity**: Visited landing page, watched demo, submitted form
  - Qualifiers: GDPR opt-in ✓, Demo request ✓ → Won
- **Result**: Opportunity moved from null → MQL Won → auto-created SQL Open
- **New Pipeline**: `B2B • SQL`

Every slot filled. Every coordinate recoverable. Every Activity attributable. The model's prediction was tested against Sarah specifically and confirmed. Next quarter's report tells the team how often that prediction holds across every similar prospect.

---

## Omnichannel Media Mapping

Creative mediums mapped to distribution channels:

| Channel | Primary Mediums | Purpose |
|:---|:---|:---|
| Social | Posts, messages, sponsorships | Top-of-funnel engagement, brand awareness |
| Display | Dynamic ads, articles, collections | Visual retargeting, mid-funnel reinforcement |
| Search | Articles, pages, documents | Capturing high-intent solution-aware traffic |
| Website | Pages, documents, presentations, demos | Deep qualification, technical validation, conversion |
| Email | Messages, landing pages, documents, collections | Long-term nurturing, lifecycle management |

### Funnel Stage Mapping

| Funnel Stage | Campaign Focus | Asset Types |
|:---|:---|:---|
| Awareness / Engagement | Activity-driven (MQL) | Educational articles, dynamic search assets |
| Lead Generation | Registration-driven (SQL) | Forms, demos, consultations |
| Conversion | Direct response (FTP) | Contracts, payment portals, demonstrations |
| Retention | Lifecycle (RTP) | Onboarding, support, recurring interest assets |
