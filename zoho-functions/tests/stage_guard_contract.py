"""Reference implementation of the two targeted Stage guards (Changes 7, 12, 13).

Mirror of the guards in v6/activity/handleTaskCompletion.deluge (historical Task Stage
adoption), v6/activity/routeContactSequence.deluge (demo:qualified target resolution)
and v6/activity/handleMeetingEvent.deluge (verified close on meeting Won). Deluge has no
local runner, so the contract is pinned here and exercised by tests/test_stage_guard.py.

LIMITATION: this proves the CONTRACT, not the deployed Deluge. Keep the two in step -
if you change one, change the other in the same commit. A green run here does not mean
production is correct; only republishing + the live E2E does that.

EXACTLY TWO Stage guards exist, both targeted. There is no global monotonicity policy
and no exception list. processDeal's never-regress Opportunity_Stage floor is separate
and untouched.
"""

STAGE_RANKS = {
    "Marketing Consent": 1,
    "Demo Booking": 2,
    "Demo Confirmation": 3,
    "Demo Hosted": 4,
    "Proposal Preparation": 5,
    "Commercial Agreement": 6,
    "Onboarding": 7,
    "Renewal": 8,
}

PROPOSAL_PREPARATION = "Proposal Preparation"

LOG_NO_REGRESS = "stage_adoption_skipped_no_regress"
LOG_ALREADY_PROGRESSED = "demo_qualified_already_progressed"
LOG_WON_ROUTED = "won_routed"
LOG_WON_REOPENED = "won_reopened_route_not_applied"

REVIEW_ROUTE_NOT_APPLIED = "[meeting_route_not_applied]"


def rank(stage):
    """Unknown stages sort to 1, mirroring ifnull(stageRanks.get(s), 1)."""
    return STAGE_RANKS.get((stage or "").strip(), 1)


# --------------------------------------------------------------------------------
# Guard 1 (Change 7) - historical Activation Task Stage adoption is forward-only.
# --------------------------------------------------------------------------------


def adopt_task_stage(contact_stage, task_stage):
    """Returns (new_contact_stage, log). Mirrors processLead:454.

    Forward adoption is preserved - it is load-bearing for Contacts imported at a later
    Stage. Backward adoption from a value frozen months earlier is refused.
    """
    if rank(task_stage) > rank(contact_stage):
        return (task_stage, None)
    return (contact_stage, LOG_NO_REGRESS)


# --------------------------------------------------------------------------------
# Guard 2 (Change 12) - demo:qualified target resolution.
# --------------------------------------------------------------------------------


def demo_qualified_target(contact_stage):
    """Returns (target_stage, log). Two lines in one branch, no allow-list."""
    if rank(contact_stage) >= rank(PROPOSAL_PREPARATION):
        return (contact_stage, LOG_ALREADY_PROGRESSED)
    return (PROPOSAL_PREPARATION, None)


# --------------------------------------------------------------------------------
# Change 13 - verified close on meeting Won. Success is "Proposal Preparation or any
# LATER Stage", not "the Stage changed".
# --------------------------------------------------------------------------------


def meeting_won_succeeded(post_stage):
    return rank(post_stage) >= rank(PROPOSAL_PREPARATION)


def meeting_won_outcome(post_stage):
    """Returns (meeting_task_state, meeting_task_status, review, log)."""
    if meeting_won_succeeded(post_stage):
        return (None, "Closed", None, LOG_WON_ROUTED)
    return ("Open", "Working", REVIEW_ROUTE_NOT_APPLIED, LOG_WON_REOPENED)
