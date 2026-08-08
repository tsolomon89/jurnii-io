# v6 Single-Field Automation Audit

This audit defines the single-field invariant for v6 activity automation.

Single-field means the rep advances the activity lifecycle with exactly one primary
command field. Product, quote, contract, stage, sequence, and relationship fields are
context or evidence; they are not lifecycle commands.

> **Correction (D1).** Earlier revisions of this document described `Task_Sequence_Type` as the
> *sole command* for a Sequence Activation Task, with `Task_State = Won` automation-derived. That is
> backwards, and both the code and `SALES_GUIDE.md` §4 say so. The Activation Task carries **two
> independent controls**:
>
> - `Task_Sequence_Type` is the **preference**. Rep-owned, automation never writes it, and it starts
>   nothing on its own. A change is **prospective** — effective at the next eligible Stage entry.
> - `Task_State` is the **commit** (`Won`) and the **immediate off-switch** (`Lost`, or `Open` after
>   a `Won`). It is the only control with an immediate effect.
>
> The Activation Task is the one place the single-field rule does not apply, and that is deliberate:
> a preference and a commitment are different decisions and a rep must be able to change either one
> after the fact.
>
> **Loss is always local, at every level.** No activity-level `Lost` — Task, Call or Meeting —
> writes `Contact.State`, `Contact.Status`, `Contact.Stage` or any Deal field, **including
> `No Response` on an exhausted sequence**. It raises `[activity_lost_suggests_contact_loss]`
> instead. An explicit Contact-level loss writes the Contact and **no Deal field**; a Deal becomes
> Lost only through a separate, explicit Deal-level decision, surfaced by
> `[deal_has_no_viable_contact]`.

## Command Surfaces

| Use case | User command | Optional context | Automation-derived fields |
| --- | --- | --- | --- |
| Ordinary Task success | `Task_State = Won` | `Task_Type`, commercial evidence, relationship fields | `Task_Status = Closed`, native `Status = Completed`, downstream Contact/Deal/Quote/sequence writes |
| Ordinary Task loss | `Task_State = Lost` | `Task_Lost_Reasons` required | `Task_Status = Closed`, native `Status = Completed`, local loss routing |
| Ordinary Task unresolved | `Task_State = Open` | Task context/evidence | `Task_Status = New` or `Working`; no terminal transition |
| Activation Task — choose the route | `Task_Sequence_Type = Email/Call/Manual` | `Task_Sequence_Stage` | **Nothing by itself.** The preference is recorded; it is **prospective** and takes effect at the next eligible Stage entry. `Manual` included: selecting it mid-cadence stops nothing and the current Stage finishes |
| Activation Task — commit | `Task_State = Won` | latest Note = `Warm`/`Cold` (Email route only) | Route execution, `Task_Status = Closed`, native `Status = Completed`, `ActivationCommand\|state=Won\|type=…` marker |
| Activation Task — disable (deliberate) | `Task_State = Lost` | none; no Lost Reason required | Cadence Calls cancelled, ScheduledSend Tasks cancelled, `Sequence_State = Stopped`, marker `state=Lost`. `Sequence_Type` and `Sequence_Activated_At` **preserved**; Contact `State`/`Status`/`Stage` and every Deal field **unchanged** |
| Activation Task — disable (unaddressed) | `Task_State = Open` after a `Won` | none | Same neutralization as `Lost`; `Task_Status = Working`, native `Status = In Progress`, marker `state=Open` |
| Activation Task — re-enable | `Task_State = Won` from `Lost`/`Open` | new `Task_Sequence_Type` adopted in the same save | `Sequence_State = Not Activated`, `Sequence_Stage`/`Sequence_Step` cleared, marker `state=Won`. **Routes nothing** — no replay, no resume of the interrupted Stage; `Sequence_Activated_At` not re-stamped |
| Call success | `Call_Task_State = Won` | Call stage, attempt, Product/contract evidence | `Call_Task_Status = Closed`, native activity close, next sequence action |
| Call loss | `Call_Task_State = Lost` | `Call_Task_Lost_Reasons` required | `Call_Task_Status = Closed`, local loss routing |
| Call reschedule | `Call_Task_State = Open` | `Next_Follow_Up_Date` | Replacement/scheduled Call; no new State or Status value |
| Meeting success | `Meeting_Task_State = Won` | `Meeting_Task_Stage`, Product/contract evidence | `Meeting_Task_Status = Closed`, downstream routing or Quote evidence processing |
| Meeting loss | `Meeting_Task_State = Lost` | `Meeting_Task_Lost_Reasons` required | `Meeting_Task_Status = Closed`, local loss routing |
| Meeting booking/reschedule | `Meeting_Task_State = Open` or blank | native `Start_DateTime` | reminder/context mirrors and first-booking progression |

## Non-Command Evidence

These fields may be required for commercial work, but they never replace the lifecycle
command:

| Module | Evidence fields |
| --- | --- |
| Tasks | `Task_Contract_Products`, `Task_Contract_Brands`, `Task_Contract_Date_Start`, `Task_Contract_Date_End`, `Task_Contract_Frequency` |
| Calls | `Call_Task_Contract_Products`, `Call_Task_Contract_Brands`, `Call_Task_Contract_Date_Start`, `Call_Task_Contract_Date_End`, `Call_Task_Contract_Frequency` |
| Events | `Meeting_Task_Contract_Products`, `Meeting_Task_Contract_Brands`, `Meeting_Task_Contract_Date_Start`, `Meeting_Task_Contract_Date_End`, `Meeting_Task_Contract_Frequency` |
| Quotes | `Quote_Stage`, `Quote_Product`, `Quoted_Items`, `Contract_Date_Start`, `Contract_Date_End`, `Quote_Applied_Activity_Keys` |

If commercial validation fails after a user sets an activity State to `Won`, automation must
not leave the activity falsely closed. The handler must reopen or retain it as `Open` /
`Working`, create Manual Review, and log the validation failure.

## Retired Command Paths

The following fields are legacy or duplicate lifecycle surfaces and must not control v6
activity routing:

| Module | Retired field | Current target |
| --- | --- | --- |
| Tasks | `Task_Outcome` | Remove from code/workflow/layouts, then delete after dependency audit |
| Calls | `Call_Outcome` | Remove from workflows/layouts, then delete after dependency audit |
| Events | `Meeting_Outcome`, `Meeting_Status` | Remove from workflows/layouts, then delete after dependency audit |
| Deals | `Demo_Outcome`, `Demo_Status`, `Commercial_Outcome` | Retire after Event/Quote-driven replacement behavior is deployed and verified |

Native activity fields such as `Tasks.Status` are automation-owned. They may be retained for
Zoho mechanics, but they must not be exposed as an additional user command.

## Current Repository State

- `handleTaskCompletion` uses `Task_Sequence_Type` for activation and `Task_State` for ordinary Task routing.
- `handleCallOutcome` uses `Call_Task_State`; `Next_Follow_Up_Date` is scheduling context only.
- `handleMeetingEvent` uses `Meeting_Task_State`; `Meeting_Task_Stage` is context for demo/commercial/renewal behavior.
- `routeContactSequence` owns Contact stage/sequence transitions and must not treat Activity Lost as automatic Deal Lost.
- `processDeal` and Quote handlers own Product, Quote, Amount, and contract ledger propagation.

Live workflow, layout, validation, and deletion status is not proven in this repository. See
`PRE_CHANGE_FIELD_AUTHORITY_AUDIT.md` for live-access blockers and the safe deletion sequence.
