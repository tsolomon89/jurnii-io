# Pre-publish audit results (AUD-1..AUD-5)

Run 2026-08-08, read-only, against the live org. No record was written.
These are the counts step 1 of the plan's execution order requires before publishing.

## Headline

**The legacy-bootstrap bucket is empty.** Not one Activation Task in the org has ever
been committed, and not one Contact has ever been activated. Every LG-* risk the plan
spends §7c on is real as code, but has **zero existing records** to fire against.

| Fact | Value |
| --- | --- |
| `Sequence Activation` Tasks | **153** |
| …with `(Task_State, Task_Status, Status)` = `(Open, New, Not Started)` | **145** |
| …with `(Open, New, Deferred)` | **8** |
| …with any other combination | **0** |
| …with a non-blank `Task_Sequence_Type` | **0** |
| …with an `ActivationCommand\|` marker | **0** (the marker does not exist yet) |
| Distinct Contacts holding one | **150** |
| Contacts with `Sequence_Activated_At` stamped | **0** |
| Contacts with `Sequence_State` ∈ {Running, Stopped, Complete} | **0** |
| Contacts with a non-blank `Sequence_Type` | **0** |

## AUD-1 — Activation Task inventory

153 Tasks over 150 Contacts. `Task_Sequence_Stage` distribution:
Renewal 84 · Demo Booking 25 · Marketing Consent 24 · Proposal Preparation 16 ·
Commercial Agreement 3 · Onboarding 1.

**Three Contacts hold two Tasks each** — and in every case exactly one is `Not Started`
and one is `Deferred`:

| Contact | Active Task | Retired Task | Driver Deal |
| --- | --- | --- | --- |
| `991103000002874057` | `991103000002866254` | `991103000002890293` | Fanatics - Jurnii UX |
| `991103000002879188` | `991103000002879084` | `991103000002916099` | Casimba Gaming - Jurnii UX |
| `991103000002907085` | `991103000002866110` | `991103000002915113` | Honore Gaming - Jurnii UX |

Under Change 1's `activeCandidates` rule (`Status != "Deferred"`) each resolves to
**exactly one active control**. No Contact reaches the collapse rule, and none raises
`[activation_control_ambiguous]`. E2 is effectively already remediated.

**Legacy-bootstrap buckets (the three §7c cases):**

| Bucket | Count |
| --- | --- |
| resolvable (`Sequence_Activated_At` stamped + valid `Sequence_Type`) | **0** |
| unresolvable (stamped + blank/invalid `Sequence_Type`) → `[activation_legacy_command_unresolved]` | **0** |
| genuinely uncommitted (marker absent, timestamp blank, `New`/`Not Started`) | **145** |
| retired (`Deferred`, inert by the existing L89-93 guard) | **8** |

The unresolvable bucket the plan asked to size before publish is **empty**. Every
existing Task takes the `absent` path, which is the only route to initial activation —
correctly, because none of them has ever been committed.

## AUD-2 — coverage gaps, and the Partnership population Change 18 newly covers

**9 Partnership driver Deals exist**, all `Opportunity_State = Open`, each on a distinct
primary Contact, and none of those Contacts holds an Activation Task today:

| Deal | Primary Contact |
| --- | --- |
| CGA Experience - Partnership | Chris Garthwaite `991103000002910089` |
| Oakvale Capital - Partnership | Elliot Berg `991103000002909083` |
| Paulo Consulting - Partnership | Paul Bishop `991103000002916303` |
| UM Worldwide - Partnership | Haris Khan `991103000002868296` |
| Splash Tech - Partnership | Adam Wilson `991103000002895314` |
| Casino.com - Partnership | Lee Knott `991103000002910146` |
| H2 Gambling Capital - Partnership | Ed Birkin `991103000002869047` |
| Future Anthem - Partnership | Leigh Nissim `991103000002867324` |
| iPetel - Partnership | Pedro Barreda `991103000002877084` |

So Change 18 newly covers **at most 9 Contacts**, and only those that also pass the
unchanged Decision-Maker, `State = Open` and exactly-one-driver gates. Each gets one
canonical Task and dispatches nothing (Change 20). This is a small, reviewable blast radius.

## AUD-3 — mirror conflicts

**Zero.** No Activation Task has `(Task_State = Open, Task_Status = Closed)`, and none
has `(Task_State = Won, Status != Completed)` — because none is `Won` at all. E4 has no
existing instances.

## AUD-4 — stuck or mis-flagged meetings

**Zero.** No Event in the org has `Meeting_Task_State` ∈ {Won, Lost}, so there is no
Event that C9/C10 could have trapped, and nothing to repair. E5's booking-side population
is likewise empty because `BOOKING_MEETING_AUTOMATION_ENABLED` has never been true.

## AUD-5 — the known AG corruption class

**Zero.** No Contact has `Sequence_State = 'Running'`, so none can have it with a null
`Sequence_Type`. Expected zero, found zero.

## `[VERIFY-LIVE]` answers obtained in the same pass

| # | Question | Answer |
| --- | --- | --- |
| V1 | Activation Tasks per Contact | AUD-1 above |
| V3 | `Task_State=Open` + `Task_Status=Closed` | none |
| **V4** | Does `Task_Type` contain `Scheduled Send` and `Email Sent`? | **Yes, both.** The documented list omitting them is the error, not the code. |
| **V5** | Has `Meeting_Task_Contract_Products` been repaired? | **Yes — already done.** The 4 active catalogue names (`Jurnii 360`, `Jurnii Cortex`, `Jurnii UX`, `Partnership`) are live and `used`; the 6 variant names are retained but `unused`. **Z3 is closed and step 2 of the execution order is a no-op.** Acceptance scenarios 27/29 are unblocked. |
| D2 | Does `Task_Sequence_Step` exist? | **No.** Confirmed absent from live Tasks metadata. |
| Z5 | `Renewall` typo | Confirmed. `Meeting_Task_Stage` maps display `Renewal` → reference `Renewall`. |

Field ids captured for later metadata work: `Meeting_Task_Contract_Products`
`991103000001702637` · `Task_State` `991103000001702065` · `Task_Sequence_Type`
`991103000001581228` · `Task_Status` `991103000001702077` · `Task_Type` `991103000000786003`.

## New finding — `Status = "Cancelled"` is not a live Task value

Not part of the plan, found while confirming the §7g metadata. The live native `Status`
picklist on Tasks is exactly:

```
Not Started · Deferred · In Progress · Completed · Waiting on someone else
```

There is **no `Cancelled` value**. Existing code nevertheless writes it at
[routeContactSequence.deluge:936](../../v6/activity/routeContactSequence.deluge#L936)
(the supersede path), and three read-side predicates test for it
([routeContactSequence.deluge:932](../../v6/activity/routeContactSequence.deluge#L932),
[:1412](../../v6/activity/routeContactSequence.deluge#L1412),
[sendScheduledEmailFromTask.deluge:32](../../v6/activity/sendScheduledEmailFromTask.deluge#L32)).

It is latent rather than live-broken: there are **zero** `Scheduled Send` Tasks and **zero**
Tasks in any `Cancelled` state in the org, because no Contact has ever been activated. The
write has therefore never executed against a real record.

**Consequence for this sprint.** Change 4's neutralization of ScheduledSend wake-up Tasks
must not depend on `Cancelled`. The new code writes `Status = "Deferred"` **and**
`Task_Status = "Closed"` — both live-valid, and either one alone already satisfies the
stop-gate at `sendScheduledEmailFromTask.deluge:32`. The pre-existing write at
`routeContactSequence:936` is left untouched (§8 discipline) and recorded below as **L21**.

## Recorded as new deferred work

| # | Item |
| --- | --- |
| **L21** | `Status = "Cancelled"` is written to Tasks at `routeContactSequence:936` but is not a live picklist value. Latent today (no ScheduledSend Tasks exist). Will surface the first time a Stage change supersedes a managed Task on an activated Contact. Fix is either adding the value to the picklist or changing the write to `Deferred`; both are outside this sprint's change list. |

## Remediation required

**None.** Every audit came back either empty or already in the shape Change 1 expects.
Steps 9 (remediation) and 2 (picklist fix) of the execution order have nothing to do.
