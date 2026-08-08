"""Reference implementation of the loss-propagation rule (Changes 16 and 19).

Mirror of the propagation decisions in v6/activity/handleMeetingEvent.deluge,
handleTaskCompletion.deluge, handleCallOutcome.deluge and routeContactSequence.deluge.
Deluge has no local runner, so the contract is pinned here and exercised by
tests/test_activity_loss_propagation.py.

LIMITATION: this proves the CONTRACT, not the deployed Deluge. Keep the two in step -
if you change one, change the other in the same commit. A green run here does not mean
production is correct; only republishing + the live E2E does that.

The rule, stated once:

  Loss is local at every level. No activity-level Lost - Task, Call or Meeting - writes
  Contact.State, Contact.Status, Contact.Stage or any Deal field. INCLUDING No Response
  on an exhausted sequence. An explicit Contact-level loss writes the Contact and NO
  Deal field. A Deal becomes Lost only through a separate, explicit Deal-level decision.

_util_resolveActivityLoss is left unchanged: it is a pure advisor whose contact_lost
suggestion is still accurate information. The CALLER decides propagation.
"""

ACTIVITY_HANDLERS = ("Task", "Call", "Meeting")

# Every action the loss matrix can return.
LOSS_ACTIONS = (
    "none",
    "retry",
    "reschedule",
    "stop_sequence",
    "sequence_complete",
    "manual_review",
    "contact_lost",
    "deal_lost",
)

CANONICAL_LOST_REASONS = (
    "N/A",
    "Invalid / Bad Data",
    "No Fit",
    "No Response",
    "No Meeting / Demo",
    "No Commercial Interest",
    "No Budget",
    "No Authority",
    "No Timing",
    "Terms Rejected",
    "Churned / Did Not Renew",
    "Duplicate / Test Record",
)

# The explicit, deliberate Contact-level command. Reachable only from a Contact-level
# decision now that Change 16 has removed every activity-driven route into it.
CONTACT_LOSS_COMMAND = "contactlost"

REVIEW_ACTIVITY_LOSS = "[activity_lost_suggests_contact_loss]"
REVIEW_DEAL_NO_VIABLE_CONTACT = "[deal_has_no_viable_contact]"


def propagates_to_contact(handler, action):
    """An activity Lost never writes Contact.State / Status / Stage. Always False."""
    if handler in ACTIVITY_HANDLERS:
        return False
    if handler == CONTACT_LOSS_COMMAND:
        # The explicit Contact-level command doing exactly what it says.
        return True
    return False


def propagates_to_deal(handler, action):
    """Nothing here closes a Deal - not an activity loss, not Contact loss."""
    return False


def referral_for(handler, action):
    """What is raised instead of propagating."""
    if handler in ACTIVITY_HANDLERS and action == "contact_lost":
        return REVIEW_ACTIVITY_LOSS
    if handler in ACTIVITY_HANDLERS and action == "deal_lost":
        # Already a referral before this sprint (handleMeetingEvent:188-191); unchanged.
        # Change 16 makes contact_lost behave the same way.
        return "[deal_lost_referred]"
    return None


def contact_loss_deal_outcome(other_open_contact_exists):
    """Change 19 - the Deal-closing write becomes a referral.

    The viability check is KEPT and becomes the evidence in the review rather than the
    trigger for a write.
    """
    if other_open_contact_exists:
        return (None, {})
    return (REVIEW_DEAL_NO_VIABLE_CONTACT, {})


def contact_loss_writes(other_open_contact_exists):
    """Contact.State = Lost / Status = Closed is kept. No Deal field is written."""
    return {"Contact.State": "Lost", "Contact.Status": "Closed"}


def deal_fields_written(handler, action):
    """The set of Deal fields any loss path writes. Must always be empty."""
    return set()
