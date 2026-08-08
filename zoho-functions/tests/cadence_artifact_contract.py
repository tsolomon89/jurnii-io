"""Reference implementation of the cadence-artifact predicate (Change 4).

Mirror of the neutralization predicate used by the Task_State = Lost / Open disable
paths in v6/activity/handleTaskCompletion.deluge. Deluge has no local runner, so the
contract is pinned here and exercised by tests/test_cadence_artifact.py.

LIMITATION: this proves the CONTRACT, not the deployed Deluge. Keep the two in step -
if you change one, change the other in the same commit. A green run here does not mean
production is correct; only republishing + the live E2E does that.

THIS IS THE PROOF REQUIRED BY PLAN 7c: that cadence artifacts are precisely
identifiable, and that neutralization cannot reach commercial or rep-owned work.

Two artifact classes, each with an exclusive marker:

  cadence Calls          Sequence_Managed = "Yes", written in exactly three places, all
                         automation cadence Calls. A rep-created Call never carries it.
  ScheduledSend Tasks    Task_Type = "Scheduled Send", written in exactly one place, and
                         the ScheduledSend| Description marker travels with it.

Deliberately NOT the existing doSupersede Task branch, which defers every
Task_Sequence_Managed Task except Email Sent - that would catch Draft Commercials, Send
Commercials, Onboarding Setup, Manual Review, Data Repair, Review Reply, Enrichment and
the Activation Task itself.
"""

SCHEDULED_SEND_TYPE = "Scheduled Send"

# Live native Status values on Tasks are exactly:
#   Not Started | Deferred | In Progress | Completed | Waiting on someone else
# There is NO "Cancelled" value in the live picklist, although existing code at
# routeContactSequence:936 writes one (recorded as L21). The read predicate tolerates it
# so a legacy record would still be recognised as already-neutralized; the WRITE side
# uses Deferred + Task_Status=Closed, both live-valid, either of which already satisfies
# the stop-gate at sendScheduledEmailFromTask.deluge:32.
NOT_ACTIONABLE_STATUS = ("Completed", "Cancelled", "Deferred")

NEUTRALIZE_TASK_WRITE = {"Status": "Deferred", "Task_Status": "Closed"}
NEUTRALIZE_CALL_WRITE = {"Outgoing_Call_Status": "Cancelled", "Call_Task_Status": "Closed"}


def _norm(v):
    return (v or "").strip()


def is_cadence_artifact(module, record, contact_id):
    """True only for a live cadence Call or a live ScheduledSend wake-up Task."""
    if _norm(record.get("Who_Id")) != _norm(contact_id):
        return False

    if module == "Calls":
        # The existing supersede predicate at routeContactSequence:911, reused verbatim.
        return (
            _norm(record.get("Sequence_Managed")) == "Yes"
            and _norm(record.get("Call_Task_State")) == "Open"
            and _norm(record.get("Call_Task_Status")) == "Working"
        )

    if module == "Tasks":
        return (
            _norm(record.get("Task_Type")) == SCHEDULED_SEND_TYPE
            and _norm(record.get("Status")) not in NOT_ACTIONABLE_STATUS
            and _norm(record.get("Task_Status")) != "Closed"
        )

    # Meetings, meeting reminders, Quotes and manually-created rep activities are
    # outside both predicates by construction.
    return False


def neutralize(module, record):
    """The write applied to an artifact. Call_Task_State is deliberately left Open.

    The Call was neither Won nor Lost, and rewriting it would falsify history.
    """
    if module == "Calls":
        return dict(NEUTRALIZE_CALL_WRITE)
    if module == "Tasks":
        return dict(NEUTRALIZE_TASK_WRITE)
    return {}


def neutralization_is_convergent(module, record, contact_id):
    """Applying neutralization to its own output must find nothing left to do."""
    if not is_cadence_artifact(module, record, contact_id):
        return True
    after = dict(record)
    after.update(neutralize(module, record))
    return not is_cadence_artifact(module, after, contact_id)
