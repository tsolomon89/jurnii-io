# Meetings — The Short Version

For anyone using Zoho. No code, no jargon. If you only read one page about demos, read this one.

---

## The one field that matters

**Meeting Task State.** That's it. Set it to `Won` or `Lost` after the meeting and the system does
the rest — moves the contact along, sends the follow-up email, creates your next task, updates the
quote.

Leave it blank (or `Open`) while the meeting is still coming up.

---

## Before the meeting

When a demo gets booked, check three things on the meeting:

| Field | Must be |
| --- | --- |
| **Contact Name** | the person you're meeting |
| **Related To** | the Deal |
| **From** | the date and time |

**Contact Name and Related To are not optional.** If either is empty, the system can't process the
meeting later and you'll get a review task instead of a result.

Once you save, the system automatically:
- sends the contact a confirmation email
- schedules a reminder for 9am the working day before
- moves the contact to **Demo Confirmation**
- writes a short "what to do after this meeting" note into the Description

> Booked something for tomorrow morning? There's no time to send a reminder the day before, so
> the system skips it rather than sending a wrong "your demo is tomorrow" email today.

---

## After the meeting

Pick one:

### ✅ It happened and it went well

Set **Meeting Task State = `Won`**. Save.

You'll see:
- the contact moves to **Proposal Preparation**
- a post-demo email goes out
- a **Draft Commercials** task appears for you
- the meeting is marked done

### ❌ It didn't happen, or it's dead

Set **Meeting Task State = `Lost`** *and* pick a **Meeting Task Lost Reasons**.

**The reason is required.** If you leave it blank, the meeting bounces straight back to you with a
review task and nothing happens.

### 📅 It moved

Just change the **From** date. Leave Meeting Task State alone. The reminder recalculates itself
and the contact doesn't get dragged backwards.

---

## Picking a Lost Reason

| Reason | What the system does |
| --- | --- |
| **No Meeting / Demo** | Nothing is replayed. The contact stays where it is and you re-engage when you're ready. **Use this for no-shows and cancellations.** |
| **No Response** | Keeps the contact live. If you've genuinely run out of sequence steps, you get a review task asking you to decide. |
| **No Authority** | Review task: go find the actual decision maker. Deal stays open. |
| **No Fit / No Commercial Interest / No Budget** | Review task — a human decides whether it's this person or the whole account. |
| **Terms Rejected / Churned / Did Not Renew** | Review task. Doesn't close the deal on its own. |
| **Invalid / Bad Data** | Creates a Data Repair task. |
| **Duplicate / Test Record** | Quietly ignored. No task, no noise. |

**Important:** marking a *meeting* Lost never closes the *Contact* or the *Deal*. Those are
separate, deliberate decisions you make yourself.

---

## If you talked money

Fill these in **before** you set Won:

| Field | When |
| --- | --- |
| **Meeting Task Contract Products** | always — pick one or more |
| **Meeting Task Contract Brands** | always — the number of brands |
| **Meeting Task Contract Date Start** | always |
| **Meeting Task Contract Date End** | always |
| **Meeting Task Contract Frequency** | **Jurnii 360 only** |

Product names must be picked from the list exactly: **Jurnii 360**, **Jurnii UX**,
**Jurnii Cortex**, **Partnership**.

The system builds the quote from these fields. **Don't create or edit the quote yourself.**

> **Jurnii Cortex** has no automatic price. It'll raise a review task asking someone to price it
> manually. That's expected, not a bug.

---

## Was this a commercial meeting, not a demo?

The system works out what kind of meeting it was from **Meeting Task Stage**:

| Meeting Task Stage | Treated as |
| --- | --- |
| Marketing Consent, Demo Booking, Demo Confirmation, Demo Hosted | a **demo** |
| Proposal Preparation, Commercial Agreement | a **commercial** meeting |
| Onboarding, Renewal | a **renewal** meeting |

If you had a pricing conversation but the meeting still says `Demo Confirmation`, it gets handled
as a demo and **your quote won't get updated**. Set the stage to match the conversation you
actually had.

A Won commercial meeting updates the quote and the deal value. It does **not** mark anything as
signed — signing comes from the quote itself.

---

## Don't touch these

The system owns them. Editing them causes problems:

- Meeting Task Status
- Reminder Send At
- Meeting Task Pipeline
- Meeting Task Opportunity

---

## "It bounced back"

Sometimes you set Won or Lost and the meeting flips back to `Open` with a task attached. That's
deliberate — something didn't work, and the system would rather tell you than quietly pretend it
did.

| What you'll see | Why | Fix |
| --- | --- | --- |
| *"could not be resolved from the meeting itself"* | **Contact Name** is empty | Fill in Contact Name, set the state again |
| *"did not reach Proposal Preparation"* | the contact/deal links don't line up | Check Contact Name and Related To, set Won again |
| *"marked Lost without Meeting Lost Reasons"* | you forgot the reason | Add a reason, set Lost again |
| *"could not apply Product/Quote evidence"* | something's wrong with the contract fields | Fix the products/brands/dates, set Won again |

**In every case: fix the thing it names, then set the state again.** Re-saving genuinely retries —
you're not stuck.

---

## Cancelling a meeting

**Don't delete it.** Deleting loses the history and leaves things half-finished.

Instead set **Meeting Task State = `Lost`** with:
- **No Meeting / Demo** — cancelled or no-showed, you'll rebook
- **Duplicate / Test Record** — it shouldn't have existed
- **Invalid / Bad Data** — something's wrong with the record

Then book a new meeting whenever you're ready. It picks up normally.

---

## Quick reference

```
Meeting booked        →  fill Contact Name + Related To + From, save
                         (confirmation email + reminder happen automatically)

Demo went well        →  Meeting Task State = Won
Talked money too      →  + Contract Products / Brands / Dates / Frequency, then Won

Didn't happen         →  Meeting Task State = Lost
                         + Meeting Task Lost Reasons = No Meeting / Demo

Dead for another      →  Meeting Task State = Lost
reason                   + the reason that actually applies

Moved to a new date   →  change From. Nothing else.

Bounced back at you   →  read the task, fix what it names, set the state again
```

---

*Need the full detail — every field, every branch, every edge case?
See [MEETING_CRUD_GUIDE.md](MEETING_CRUD_GUIDE.md).*
