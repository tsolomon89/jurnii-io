# Part 5: Operator Model & Performance

> Internal platform users, team structures, capacity planning, forecasting formulas, and performance metrics.

---

## Overview

Parts 1–4 describe the **external** commercial model — what buyers see, how the CRM stores it, and how websites surface it. Part 5 describes the **internal** operator model — the people running the platform, their roles, their capacity, and how performance is measured.

The operator model exists because the commercial system is not self-executing. Contacts must be assigned, Activities must be completed, Opportunities must be worked. The operator model governs *who* does that work and *how much* of it they can absorb.

---

## End User Accounts

An **End User** is a platform operator — a person who uses the system to execute commercial activities. End Users are not the same as Contacts (external prospects) or Personas (abstract classification targets). End Users are the internal team.

### End User Summary

| Field | Description |
|:---|:---|
| First Name | End User's first name |
| Last Name | End User's last name |
| End User Email | End User's email address |
| Department | Organisational function (see below) |
| Role | Permission and routing tier (see below) |
| Team | Named team assignment for ownership routing |

---

## End User Departments

Every End User belongs to exactly one Department. Departments govern which parts of the commercial lifecycle the operator touches.

| Department | Function |
|:---|:---|
| **Sales** | Direct Opportunity management, qualification advancement, closing |
| **Marketing** | Campaign execution, Asset creation, audience segmentation |
| **Operations** | System administration, data quality, pipeline configuration |

---

## End User Roles

Every End User has exactly one Role within their Department. Roles control Opportunity assignment limits and administrative permissions.

| Role | Opportunity Assignment | Permissions |
|:---|:---|:---|
| **Junior** | Can own MQL and SQL Opportunities only | Execute Activities, update Contact/Account fields |
| **Senior** | Can own MQL, SQL, and FTP Opportunities | All Junior permissions + create Assets, manage Asset Groups |
| **Admin** | Can own all Opportunity types (MQL, SQL, FTP, RTP) | All Senior permissions + create Products, configure Pipelines, manage End Users |

### Routing Implications

When an Opportunity advances stages, the system checks whether the current owner's Role permits ownership at the new stage. If a Junior-owned SQL Opportunity wins and generates an FTP, the FTP is routed to a Senior or Admin — never left with the Junior.

---

## End User Teams

Teams are named groupings of End Users for ownership routing and reporting. A Team inherits its Department from its members (all members of a Team share a Department).

Teams enable:
- **Round-robin assignment** of new Opportunities within a Team
- **Escalation paths** from Junior → Senior → Admin within a Team
- **Reporting rollups** by Team → Department → Organisation

---

## End User Settings

### Work Schedule

| Setting | Description |
|:---|:---|
| **Working Days** | Days per week the End User is available (default: 5) |
| **Working Hours** | Hours per day (default: 8) |
| **Holidays / PTO** | Excluded dates for capacity calculation |

### Capacity

Capacity is the maximum number of active Opportunities an End User can manage simultaneously, calculated from:

```
Capacity = (Working Days × Working Hours) / Average Hours Per Opportunity
```

When an End User is at capacity, new Opportunities route to the next available team member.

### Commissions

| Field | Description |
|:---|:---|
| **Commission Rate** | Percentage of Opportunity value paid on Won status |
| **Commission Base** | Which value to calculate against (Product Value, Feature add-on value, total) |
| **Commission Trigger** | When commission is earned (Won status, payment received, contract signed) |

### Bonuses

| Field | Description |
|:---|:---|
| **Bonus Threshold** | Minimum target (revenue, Opportunity count, conversion rate) |
| **Bonus Period** | Time window for evaluation (monthly, quarterly, annually) |
| **Bonus Value** | Fixed amount or percentage above threshold |

---

## Performance Model

Performance measures how effectively End Users and Teams convert the commercial model into revenue. It operates on two temporal dimensions: **Ranked Periods** (historical evaluation) and **Goal Periods** (forward targets).

### Rank

Rank is a comparative score that positions an End User or Team against peers within the same Department and Role.

| Metric | Definition |
|:---|:---|
| **Time** | Average duration from Opportunity creation to Won/Lost status |
| **Close** | Number of Opportunities reaching terminal state (Won or Lost) |
| **Won** | Number of Opportunities reaching Won status |
| **Conversion %** | Won / Close × 100 |

### Ranked Period

The time window over which historical Rank is calculated. Examples: Last 30 days, Last Quarter, Last Year, All Time.

### Goals

Goals are forward-looking targets set per End User or Team. There are two types:

#### Activity Goals

| Goal | Definition |
|:---|:---|
| **Activity Volume** | Minimum number of Activities per period (calls, emails, meetings) |
| **Activity Frequency** | Required cadence (e.g., 5 Activities per Opportunity per week) |
| **Activity Mix** | Required ratio across Activity types (e.g., 40% Engagement, 30% Data, 20% Asset, 10% Admin) |

#### Opportunity Goals

| Goal | Definition |
|:---|:---|
| **Revenue Target** | Total won Opportunity value per Goal Period |
| **Volume Target** | Total won Opportunity count per Goal Period |
| **Conversion Target** | Minimum Won / Close ratio per Goal Period |
| **Cycle Time Target** | Maximum average days from creation to Won |

### Goal Period

The time window over which Goals are measured. Can differ from Ranked Period. Examples: This Month, This Quarter, This Year.

### Performance Score

```
Performance Score = Weighted Average of:
  (Actual Revenue / Revenue Target) × weight_revenue +
  (Actual Volume / Volume Target) × weight_volume +
  (Actual Conversion / Conversion Target) × weight_conversion +
  (Cycle Time Target / Actual Cycle Time) × weight_time
```

Weights are configured per Department. Sales may weight revenue heavily. Marketing may weight volume and conversion.

---

## Workflow Forecasting Formulas

These formulas connect Campaign settings, Activity cadence, and Contact volume into capacity and conversion predictions.

### Contact-Level Formulas

| Symbol | Formula | Definition |
|:---|:---|:---|
| **Cc** | Contact Lifespan (days) | Total days a Contact remains active in a Campaign before expiry |
| **Cd** | 1 / Cc | Daily score deterioration rate |
| **Cu** | Cc / Engagement Task Frequency | Number of Engagement Task Activities across lifespan |
| **Co** | Cc / Engagement Frequency Goal | Number of Engagement Activities across lifespan |
| **Cw** | Cu + Co | Total weighted Activities per Contact |

### Step & Sequence Formulas

| Symbol | Formula | Definition |
|:---|:---|:---|
| **Sc** | Sum of Step durations in a Sequence | Total Sequence cycle time (days) |
| **So** | Cc / Sc | Number of times a Sequence can run within a Contact's lifespan |

### Macro Capacity Formulas

| Symbol | Formula | Definition |
|:---|:---|:---|
| **Mc** | Cw × Total Contacts | Total Activities required across all Contacts in Campaign |
| **Mo** | Mc / End Users available | Activities per End User (capacity demand) |

### Usage

These formulas answer:
1. **"How many Activities does this Campaign generate?"** → Mc
2. **"Can our team absorb it?"** → Mo vs. End User capacity
3. **"How many Sequence cycles fit before Contact expiry?"** → So
4. **"What's the daily health decay rate?"** → Cd

If Mo exceeds available End User capacity, either reduce Contact volume, extend Contact Lifespan (Cc), or add End Users.
