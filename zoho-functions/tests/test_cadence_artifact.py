"""Cadence-artifact predicate contract tests (Change 4).

Run: python tests/test_cadence_artifact.py   (also collects under pytest)

This is the proof required by plan 7c. The FALSE cases are the point: neutralization
must not be able to reach commercial work, rep-owned activity, or sent-email history.

See tests/cadence_artifact_contract.py for why a green run here is not a statement
about production.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cadence_artifact_contract as A  # noqa: E402

CASES = []


def case(name, got, want):
    CASES.append((name, got, want))


C = "contact-1"
OTHER = "contact-2"


def call(**kw):
    r = {
        "Who_Id": C,
        "Sequence_Managed": "Yes",
        "Call_Task_State": "Open",
        "Call_Task_Status": "Working",
    }
    r.update(kw)
    return r


def tsk(**kw):
    r = {"Who_Id": C, "Task_Type": "Scheduled Send", "Status": "Not Started", "Task_Status": "New"}
    r.update(kw)
    return r


# ================================================================================
# TRUE - the two artifact classes
# ================================================================================

case("live cadence Call", A.is_cadence_artifact("Calls", call(), C), True)
case("live ScheduledSend Task", A.is_cadence_artifact("Tasks", tsk(), C), True)
case("ScheduledSend Task In Progress", A.is_cadence_artifact("Tasks", tsk(Status="In Progress"), C), True)
case("ScheduledSend Task Working", A.is_cadence_artifact("Tasks", tsk(Task_Status="Working"), C), True)


# ================================================================================
# FALSE - Calls
# ================================================================================

case("rep-created Call (no Sequence_Managed)", A.is_cadence_artifact("Calls", call(Sequence_Managed=""), C), False)
case("rep-created Call (Sequence_Managed No)", A.is_cadence_artifact("Calls", call(Sequence_Managed="No"), C), False)
case("Won Call", A.is_cadence_artifact("Calls", call(Call_Task_State="Won", Call_Task_Status="Closed"), C), False)
case("Won Call still Working", A.is_cadence_artifact("Calls", call(Call_Task_State="Won"), C), False)
case("Lost Call", A.is_cadence_artifact("Calls", call(Call_Task_State="Lost", Call_Task_Status="Closed"), C), False)
case("already-cancelled Call", A.is_cadence_artifact("Calls", call(Call_Task_Status="Closed"), C), False)
case("Call not yet started", A.is_cadence_artifact("Calls", call(Call_Task_Status="New"), C), False)
case("another Contact's cadence Call", A.is_cadence_artifact("Calls", call(Who_Id=OTHER), C), False)


# ================================================================================
# FALSE - every other Task_Type. Commercial work is never neutralized.
# ================================================================================

NEVER_TOUCHED = [
    "Draft Commercials",
    "Send Commercials",
    "Onboarding Setup",
    "Manual Review",
    "Suppression Review",
    "Data Repair",
    "Review Reply",
    "Enrichment",
    "Email Sent",
    "Sequence Activation",
]

for _t in NEVER_TOUCHED:
    case("%s is NOT a cadence artifact" % _t, A.is_cadence_artifact("Tasks", tsk(Task_Type=_t), C), False)
    # even when it carries every other managed marker
    case(
        "%s is NOT an artifact even when managed and open" % _t,
        A.is_cadence_artifact("Tasks", tsk(Task_Type=_t, Task_Sequence_Managed="true", Status="In Progress"), C),
        False,
    )

case("already-completed ScheduledSend", A.is_cadence_artifact("Tasks", tsk(Status="Completed"), C), False)
case("already-deferred ScheduledSend", A.is_cadence_artifact("Tasks", tsk(Status="Deferred"), C), False)
case("legacy cancelled ScheduledSend", A.is_cadence_artifact("Tasks", tsk(Status="Cancelled"), C), False)
case("closed ScheduledSend", A.is_cadence_artifact("Tasks", tsk(Task_Status="Closed"), C), False)
case("another Contact's ScheduledSend", A.is_cadence_artifact("Tasks", tsk(Who_Id=OTHER), C), False)


# ================================================================================
# FALSE - other modules entirely
# ================================================================================

for _m in ("Events", "Quotes", "Deals", "Contacts", "Emails"):
    case("%s is never an artifact" % _m, A.is_cadence_artifact(_m, {"Who_Id": C}, C), False)


# ================================================================================
# The neutralization write uses only live-valid values (see AUD note L21)
# ================================================================================

LIVE_TASK_STATUS = {"Not Started", "Deferred", "In Progress", "Completed", "Waiting on someone else"}
LIVE_TASK_TASK_STATUS = {"New", "Working", "Closed"}

_w = A.neutralize("Tasks", tsk())
case("Task neutralization writes a live-valid native Status", _w["Status"] in LIVE_TASK_STATUS, True)
case("Task neutralization does NOT write Cancelled", _w["Status"] != "Cancelled", True)
case("Task neutralization writes a live-valid Task_Status", _w["Task_Status"] in LIVE_TASK_TASK_STATUS, True)

_cw = A.neutralize("Calls", call())
case("Call neutralization cancels the native status", _cw["Outgoing_Call_Status"], "Cancelled")
case("Call neutralization closes the Task status", _cw["Call_Task_Status"], "Closed")
case("Call neutralization never rewrites Call_Task_State", "Call_Task_State" in _cw, False)


# ================================================================================
# Convergence - a repeat disable finds nothing left to cancel (plan 11.3)
# ================================================================================

for _m, _r in (("Calls", call()), ("Tasks", tsk()), ("Tasks", tsk(Status="Completed")), ("Calls", call(Call_Task_Status="Closed"))):
    case("neutralization is convergent (%s)" % _m, A.neutralization_is_convergent(_m, _r, C), True)


def test_cadence_artifact_contract():
    failures = [(n, g, w) for n, g, w in CASES if g != w]
    assert not failures, "\n".join(
        "%s\n  got:  %r\n  want: %r" % (n, g, w) for n, g, w in failures
    )


def main():
    failed = 0
    for name, got, want in CASES:
        if got == want:
            print("  PASS  %s" % name)
        else:
            failed += 1
            print("  FAIL  %s\n          got:  %r\n          want: %r" % (name, got, want))
    print("\n%d/%d passed" % (len(CASES) - failed, len(CASES)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
