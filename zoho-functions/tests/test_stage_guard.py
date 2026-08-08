"""Targeted Stage guard contract tests (Changes 7, 12, 13).

Run: python tests/test_stage_guard.py   (also collects under pytest)

Includes the two real regressions the plan found - a Task frozen at Marketing Consent
landing on a Commercial Agreement Contact, and demo:qualified pulling an Onboarding
Contact back to Proposal Preparation - and the review's key case: Onboarding + Won is a
SUCCESS, not a reopen.

See tests/stage_guard_contract.py for why a green run here is not a statement about
production.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import stage_guard_contract as S  # noqa: E402

CASES = []


def case(name, got, want):
    CASES.append((name, got, want))


STAGES = list(S.STAGE_RANKS)


# ================================================================================
# Guard 1 - adopt_task_stage: forward only
# ================================================================================

case(
    "AC-3 / the real regression: Task frozen at Marketing Consent onto a Commercial Agreement Contact",
    S.adopt_task_stage("Commercial Agreement", "Marketing Consent"),
    ("Commercial Agreement", S.LOG_NO_REGRESS),
)
case(
    "forward adoption is preserved (imported at a later Stage)",
    S.adopt_task_stage("Marketing Consent", "Commercial Agreement"),
    ("Commercial Agreement", None),
)
case("equal Stages are a no-op", S.adopt_task_stage("Demo Booking", "Demo Booking"), ("Demo Booking", S.LOG_NO_REGRESS))

_regressions = [
    (c, t)
    for c in STAGES
    for t in STAGES
    if S.rank(t) < S.rank(c) and S.adopt_task_stage(c, t)[0] != c
]
case("adopt_task_stage NEVER regresses the Contact", _regressions, [])

_forward_losses = [
    (c, t)
    for c in STAGES
    for t in STAGES
    if S.rank(t) > S.rank(c) and S.adopt_task_stage(c, t)[0] != t
]
case("adopt_task_stage always adopts forward", _forward_losses, [])

_no_log_on_adopt = [
    (c, t) for c in STAGES for t in STAGES if S.rank(t) > S.rank(c) and S.adopt_task_stage(c, t)[1] is not None
]
case("a real adoption logs nothing", _no_log_on_adopt, [])

_missing_log = [
    (c, t) for c in STAGES for t in STAGES if S.rank(t) <= S.rank(c) and S.adopt_task_stage(c, t)[1] != S.LOG_NO_REGRESS
]
case("every refusal logs stage_adoption_skipped_no_regress", _missing_log, [])


# ================================================================================
# Guard 2 - demo_qualified_target
# ================================================================================

case(
    "the real regression: demo:qualified onto an Onboarding Contact",
    S.demo_qualified_target("Onboarding"),
    ("Onboarding", S.LOG_ALREADY_PROGRESSED),
)

for _s in STAGES:
    _want = (_s, S.LOG_ALREADY_PROGRESSED) if S.rank(_s) >= 5 else (S.PROPOSAL_PREPARATION, None)
    case("demo_qualified_target(%s)" % _s, S.demo_qualified_target(_s), _want)

case("ranks 1-4 advance to Proposal Preparation", S.demo_qualified_target("Marketing Consent")[0], S.PROPOSAL_PREPARATION)
case("rank 4 (Demo Hosted) advances", S.demo_qualified_target("Demo Hosted")[0], S.PROPOSAL_PREPARATION)
case("rank 5 (Proposal Preparation) stays put", S.demo_qualified_target("Proposal Preparation")[0], "Proposal Preparation")
case("rank 8 (Renewal) stays put", S.demo_qualified_target("Renewal")[0], "Renewal")

_pulled_back = [_s for _s in STAGES if S.rank(S.demo_qualified_target(_s)[0]) < S.rank(_s)]
case("demo:qualified NEVER pulls a Contact backwards", _pulled_back, [])


# ================================================================================
# Change 13 - meeting_won_succeeded and the reopen path
# ================================================================================

for _s in STAGES:
    case("meeting_won_succeeded(%s)" % _s, S.meeting_won_succeeded(_s), S.rank(_s) >= 5)

case("Proposal Preparation is success", S.meeting_won_succeeded("Proposal Preparation"), True)
case("Commercial Agreement is success", S.meeting_won_succeeded("Commercial Agreement"), True)
case("Onboarding is success", S.meeting_won_succeeded("Onboarding"), True)
case("Renewal is success", S.meeting_won_succeeded("Renewal"), True)
case("Demo Hosted is NOT success", S.meeting_won_succeeded("Demo Hosted"), False)
case("Marketing Consent is NOT success", S.meeting_won_succeeded("Marketing Consent"), False)

# MT-8 - the review's key case. Already at Onboarding: close successfully, do NOT reopen.
_state, _status, _review, _log = S.meeting_won_outcome("Onboarding")
case("MT-8 Event closes successfully", _status, "Closed")
case("MT-8 Event is NOT reopened", _state, None)
case("MT-8 raises no Manual Review", _review, None)
case("MT-8 logs won_routed", _log, S.LOG_WON_ROUTED)

# MT-2 - the normal path.
case("MT-2 Proposal Preparation closes successfully", S.meeting_won_outcome("Proposal Preparation")[1], "Closed")

# Genuine routing failure - the Contact never advanced.
_state, _status, _review, _log = S.meeting_won_outcome("Demo Hosted")
case("genuine failure reopens to Open", _state, "Open")
case("genuine failure sets Working, never Closed", _status, "Working")
case("genuine failure raises [meeting_route_not_applied]", _review, S.REVIEW_ROUTE_NOT_APPLIED)
case("genuine failure logs won_reopened_route_not_applied", _log, S.LOG_WON_REOPENED)

# Reopen is the retry path: a reopened Event is never Closed, so MTG-4 cannot trap it.
_never_closed_on_failure = [
    _s for _s in STAGES if not S.meeting_won_succeeded(_s) and S.meeting_won_outcome(_s)[1] == "Closed"
]
case("a failed route NEVER marks the Event Closed", _never_closed_on_failure, [])

# ...and success never reopens.
_reopened_on_success = [
    _s for _s in STAGES if S.meeting_won_succeeded(_s) and S.meeting_won_outcome(_s)[0] is not None
]
case("a successful route NEVER reopens the Event", _reopened_on_success, [])


# ================================================================================
# There are exactly two Stage guards, and they agree with Change 13's success rule
# ================================================================================

case(
    "Change 12 and Change 13 use the same threshold",
    [S.rank(S.demo_qualified_target(s)[0]) >= 5 for s in STAGES if S.rank(s) >= 5],
    [True] * len([s for s in STAGES if S.rank(s) >= 5]),
)
case(
    "after demo:qualified from any Stage, meeting Won always succeeds",
    [S.meeting_won_succeeded(S.demo_qualified_target(s)[0]) for s in STAGES],
    [True] * len(STAGES),
)


def test_stage_guard_contract():
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
