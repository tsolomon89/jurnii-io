"""Reference implementation of the cadence dispatch gate (Changes 8, 9, 20, 21).

Mirror of the dispatch-suppression and activation-establishment logic in
v6/activity/routeContactSequence.deluge. Deluge has no local runner, so the contract is
pinned here and exercised by tests/test_cadence_dispatch_gate.py.

LIMITATION: this proves the CONTRACT, not the deployed Deluge. Keep the two in step -
if you change one, change the other in the same commit. A green run here does not mean
production is correct; only republishing + the live E2E does that.

Two independent corrections to the single dispatchSuppressed switch, plus a third
establishing event for the activation gate:

  Change 8a  Manual suppression is scoped to NEW STAGE ENTRY, never to a continuation
             callback belonging to the current Stage.
  Change 8b  create_task is never suppressed - commercial work is not cadence.
  Change 20  Partnership (and any non-B2B pipeline) is a STANDING gate at every Stage.
  Change 21  A committed preference establishes activation at the next cadence-eligible
             Stage entry, by itself.
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

CADENCE_STAGES = ("Marketing Consent", "Demo Booking", "Demo Hosted", "Commercial Agreement", "Renewal")
TASK_STAGES = ("Proposal Preparation", "Onboarding")
MEETING_WAIT_STAGES = ("Demo Confirmation",)

VALID_TYPES = ("Email", "Call", "Manual")

# sendSequencedEmail's canonical-key map separates the five 5-step cadence families from
# the six single-shot event emails. Cadence = kind in {opener, cadence, postcall}.
CADENCE_EMAIL_KINDS = ("opener", "cadence", "postcall")
TRANSACTIONAL_EMAIL_KINDS = (
    "demo_confirmation", "demo_reminder", "demo_post_demo", "commercials_terms",
    "commercials_signed", "onboarding_welcome",
)

CADENCE_ACTIONS = ("send_opener_then_call", "create_call", "schedule_email", "send_email_now")
COMMERCIAL_ACTIONS = ("create_task",)

REVIEW_PIPELINE_UNRESOLVED = "[pipeline_unresolved_no_dispatch]"


def _norm(v):
    return (v or "").strip()


def is_new_stage_entry(current_stage, next_stage):
    """Derived purely from next_stage != current_stage. No branch may opt out."""
    return _norm(next_stage) != _norm(current_stage)


def dispatch_suppressed(seq_state, activated_at):
    """The existing gate, unchanged."""
    return _norm(seq_state) == "Stopped" or not _norm(activated_at)


def cadence_suppressed(
    seq_state,
    activated_at,
    seq_type,
    current_stage,
    next_stage,
    deal_pipeline,
    is_activation_trigger=False,
):
    """Change 8a + Change 20, folded into one switch."""
    if dispatch_suppressed(seq_state, activated_at) and not is_activation_trigger:
        return True
    if _norm(deal_pipeline) != "B2B":
        # Partnership -> silent and expected. Unresolved -> also suppressed, plus a
        # Manual Review. Never a silent B2B fallback.
        return True
    if _norm(seq_type) == "Manual" and is_new_stage_entry(current_stage, next_stage):
        return True
    return False


def pipeline_review_code(deal_pipeline):
    """A genuine Partnership block is expected and silent; unresolved raises a review."""
    p = _norm(deal_pipeline)
    if p == "B2B" or p == "Partnership":
        return None
    return REVIEW_PIPELINE_UNRESOLVED


def commercial_task_suppressed(*_args, **_kwargs):
    """create_task ALWAYS runs. Draft Commercials and Onboarding Setup are commercial
    work, not cadence, and Manual/Partnership must not silently stall a Contact."""
    return False


def action_suppressed(action, **gate):
    if action in COMMERCIAL_ACTIONS:
        return commercial_task_suppressed(**gate)
    if action in CADENCE_ACTIONS:
        return cadence_suppressed(**gate)
    return False


def email_suppressed(email_kind, **gate):
    if _norm(email_kind) in CADENCE_EMAIL_KINDS:
        return cadence_suppressed(**gate)
    # Transactional and commercial-boundary emails are unaffected, exactly as for Manual.
    return False


# --------------------------------------------------------------------------------
# Change 9 - make Manual stick, but only from the point it becomes effective.
# --------------------------------------------------------------------------------


def next_sequence_state(seq_type, current_stage, next_stage, is_activation_trigger, default_state="Running"):
    """Sequence_State must not be overwritten to Running when a Manual Contact enters a
    new Stage - but equally must not be forced to Stopped while the current Stage's
    cadence is still running."""
    if _norm(seq_type) == "Manual" and is_new_stage_entry(current_stage, next_stage) and not is_activation_trigger:
        return "Stopped"
    return default_state


# --------------------------------------------------------------------------------
# Change 21 - a committed preference establishes activation at the next
# cadence-eligible Stage entry, by itself.
# --------------------------------------------------------------------------------


def establishes_activation_at_entry(
    activated_at,
    seq_state,
    seq_type,
    marker,
    current_stage,
    next_stage,
    contact_eligible,
    is_activation_trigger=False,
):
    """marker is the ACTIVE canonical Activation Task's (state, type), or None.

    The two Contact-field conjuncts are a PRE-FILTER only, so the common path costs
    nothing. The marker read is the AUTHORITATIVE check - a Contact field is never
    sufficient evidence of a Task command.
    """
    if _norm(activated_at):
        return False                      # nothing to establish; never re-stamped
    if is_activation_trigger:
        return False                      # activate:* stamps by its own path
    if not is_new_stage_entry(current_stage, next_stage):
        return False                      # never the interrupted or current Stage
    if _norm(next_stage) not in CADENCE_STAGES:
        return False                      # cadence-eligible Stages only
    if _norm(seq_state) != "Not Activated":
        return False                      # a disabled Contact must never auto-establish
    if _norm(seq_type) not in VALID_TYPES:
        return False
    if not marker:
        return False
    m_state, m_type = marker
    if m_state != "Won":
        return False                      # a disabled control never auto-activates
    if m_type != _norm(seq_type):
        return False                      # the two must agree
    if not contact_eligible:
        return False
    return True


# --------------------------------------------------------------------------------
# The not-activated clamp, narrowed so it stops wiping the committed preference.
# --------------------------------------------------------------------------------


def apply_not_activated_clamp(seq_state, seq_type, seq_stage, seq_step):
    """The clamp exists to stop a never-activated Contact being stamped Running.

    Erasing a rep's committed choice was never its purpose, and with Change 8 already
    preserving the type through Stop/Complete this makes the two consistent.
    """
    return {
        "Sequence_State": "Not Activated",
        "Sequence_Stage": "None",
        "Sequence_Step": "None",
        "Sequence_Type": seq_type,   # PRESERVED
    }


def clear_sequence_type_on_stop_or_complete(seq_type):
    """Change 8's narrowing: preserve the stored preference for ALL THREE types."""
    return seq_type
