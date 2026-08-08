"""Reference implementation of canonical Activation Task identity (Change 1, plan 10).

Mirror of the identity, retirement and collapse rules implemented across
v6/processContact.deluge (create-time dedupe + duplicate sweep) and
v6/activity/handleTaskCompletion.deluge (sibling defer). Deluge has no local runner, so
the contract is pinned here and exercised by tests/test_activation_identity.py.

LIMITATION: this proves the CONTRACT, not the deployed Deluge. Keep the two in step -
if you change one, change the other in the same commit. A green run here does not mean
production is correct; only republishing + the live E2E does that.

Identity and the active-control set are deliberately two functions:

  is_same_activation_control(task, contact_id)  identity: Who_Id + Task_Type, nothing else
  active_candidates(candidates)                 the control set: identity minus retirement

Conflating them is what produced the r3 wording. Identity ignores Stage, Deal and
completion; it must NOT ignore retirement, or collapse would achieve nothing.
"""

ACTIVATION_TASK_TYPE = "Sequence Activation"
RETIRED_STATUS = "Deferred"
MARKER_PREFIX = "ActivationCommand|"

VALID_TYPES = ("Email", "Call", "Manual")
BLANK_TYPE_SENTINELS = ("", "-None-", "None", "-")

# verdicts
NOTHING_TO_COLLAPSE = "nothing_to_collapse"
COLLAPSED = "collapsed"
AMBIGUOUS = "ambiguous"

# control-set kinds
NONE_AT_ALL = "none"
SINGLE = "single"
NO_ACTIVE_CONTROL = "no_active_control"

REVIEW_AMBIGUOUS = "[activation_control_ambiguous]"
REVIEW_NO_ACTIVE_CONTROL = "[activation_no_active_control]"


def _norm(v):
    return (v or "").strip()


def _type_of(task):
    v = _norm(task.get("Task_Sequence_Type"))
    if v in BLANK_TYPE_SENTINELS:
        return ""
    return v if v in VALID_TYPES else ""


def _marker_lines(task):
    return [ln for ln in _norm(task.get("Description")).split("\n") if _norm(ln).startswith(MARKER_PREFIX)]


def has_marker(task):
    return len(_marker_lines(task)) > 0


def parse_marker(task):
    """Return (state, type) from the Task's single well-formed marker, else None."""
    lines = _marker_lines(task)
    if len(lines) != 1:
        return None
    body = _norm(lines[0])[len(MARKER_PREFIX):]
    parts = body.split("|")
    if len(parts) != 2 or not parts[0].startswith("state=") or not parts[1].startswith("type="):
        return None
    state = parts[0][len("state="):].strip()
    type_value = parts[1][len("type="):].strip()
    if state not in ("Open", "Won", "Lost"):
        return None
    if type_value == "-":
        return (state, "")
    if type_value not in VALID_TYPES:
        return None
    return (state, type_value)


# --------------------------------------------------------------------------------
# Identity - Who_Id + Task_Type, and nothing else.
# --------------------------------------------------------------------------------


def is_same_activation_control(task, contact_id):
    """Stage, Deal, native Status and completion are context, not identity."""
    return (
        _norm(task.get("Who_Id")) == _norm(contact_id)
        and _norm(task.get("Task_Type")) == ACTIVATION_TASK_TYPE
    )


def candidates_for(tasks, contact_id):
    return [t for t in tasks if is_same_activation_control(t, contact_id)]


# --------------------------------------------------------------------------------
# The active-control set - identity minus retirement. Retirement is final.
# --------------------------------------------------------------------------------


def active_candidates(candidates):
    """Excludes every Status='Deferred' Task and nothing else.

    Completed Tasks stay valid controls - that is the normal state of a committed
    Activation Task.
    """
    return [t for t in candidates if _norm(t.get("Status")) != RETIRED_STATUS]


def control_state(candidates):
    """Classify a Contact's control set. Returns (kind, control, should_create_new, code)."""
    active = active_candidates(candidates)
    if not candidates:
        return (NONE_AT_ALL, None, True, None)
    if not active:
        # The Contact's control was retired and none replaced it. That is a data
        # condition for a human, not something to paper over with a fresh Task.
        return (NO_ACTIVE_CONTROL, None, False, REVIEW_NO_ACTIVE_CONTROL)
    if len(active) == 1:
        return (SINGLE, active[0], False, None)
    verdict, keep, _retire = collapse_runtime(candidates)
    if verdict == COLLAPSED:
        return (SINGLE, keep, False, None)
    return (AMBIGUOUS, None, False, REVIEW_AMBIGUOUS)


def should_create_new(candidates):
    """Create-time dedupe evaluates the SAME active set as the runtime."""
    return control_state(candidates)[2]


# --------------------------------------------------------------------------------
# The collapse rule - one rule, used identically at all three sites.
# --------------------------------------------------------------------------------


def is_indistinguishable_concurrent_create(task):
    """Exactly the shape two racing processContact runs produce.

    processContact never sets Task_Sequence_Type, and neither Task has been through
    handleTaskCompletion, so neither carries a marker.
    """
    return (
        _norm(task.get("Task_State")) == "Open"
        and _norm(task.get("Task_Status")) == "New"
        and _type_of(task) == ""
        and not has_marker(task)
    )


def collapse_runtime(candidates):
    """Returns (verdict, keep, retire_list).

    Every refusal returns an EMPTY retire-list: on the ambiguous path no Task is
    modified - not the duplicates, and not the Task the rep edited.
    """
    active = active_candidates(candidates)
    if len(active) <= 1:
        return (NOTHING_TO_COLLAPSE, active[0] if active else None, [])

    if all(is_indistinguishable_concurrent_create(t) for t in active):
        ordered = sorted(active, key=lambda t: _norm(t.get("id")))
        return (COLLAPSED, ordered[0], ordered[1:])

    return (AMBIGUOUS, None, [])


def apply_collapse(candidates):
    """Apply collapse_runtime's retire-list, so finality can be asserted by re-feeding."""
    verdict, _keep, retire = collapse_runtime(candidates)
    if verdict != COLLAPSED:
        return list(candidates)
    retire_ids = {_norm(t.get("id")) for t in retire}
    out = []
    for t in candidates:
        if _norm(t.get("id")) in retire_ids:
            copied = dict(t)
            copied["Status"] = RETIRED_STATUS
            copied["Blocks_Sequence"] = "No"
            out.append(copied)
        else:
            out.append(dict(t))
    return out


def handler_acts_on_edited_task(candidates):
    """When the handler hits the ambiguous branch it returns without acting.

    Acting on one of several conflicting controls is precisely the arbitrary choice the
    rule forbids.
    """
    return control_state(candidates)[0] in (SINGLE,)


def handler_processes(task, candidates):
    """A Deferred Task is inert on every execution, whatever the rest of the set says."""
    if _norm(task.get("Status")) == RETIRED_STATUS:
        return False
    return handler_acts_on_edited_task(candidates)


# --------------------------------------------------------------------------------
# Offline remediation (plan 10) - the extra selection steps that only make sense
# offline. The runtime never attempts this.
# --------------------------------------------------------------------------------

SELECT_AUTHORITATIVE = "authoritative"
SELECT_SINGLE = "single_active"
SELECT_SOLE_PREFERENCE = "sole_preference"
SELECT_LOWEST_ID = "lowest_id"
SELECT_REFUSE = "refuse"
SELECT_NO_ACTIVE_CONTROL = "no_active_control"
SELECT_NONE = "none"


def is_authoritative(task, contact):
    """Marker reads (Won, valid type) AND that type equals Contact.Sequence_Type.

    The marker is the evidence of a processed command; the Contact field is the evidence
    of the live preference. A candidate with no marker has never been processed and can
    never be authoritative.
    """
    parsed = parse_marker(task)
    if parsed is None:
        return False
    state, type_value = parsed
    if state != "Won" or type_value not in VALID_TYPES:
        return False
    cst = _norm(contact.get("Sequence_Type"))
    return type_value == cst


def select_canonical_offline(candidates, contact):
    """Returns (rule, canonical, retire_list, review_code)."""
    if not candidates:
        return (SELECT_NONE, None, [], None)

    active = active_candidates(candidates)
    if not active:
        return (SELECT_NO_ACTIVE_CONTROL, None, [], REVIEW_NO_ACTIVE_CONTROL)

    if len(active) == 1:
        # Nothing to select between. Retirement already did the work, or there was only
        # ever one control.
        return (SELECT_SINGLE, active[0], [], None)

    authoritative = [t for t in active if is_authoritative(t, contact)]
    if len(authoritative) == 1:
        keep = authoritative[0]
        return (SELECT_AUTHORITATIVE, keep, [t for t in active if t is not keep], None)
    if len(authoritative) > 1:
        return (SELECT_REFUSE, None, [], REVIEW_AMBIGUOUS)

    with_preference = [t for t in active if _type_of(t)]
    if len(with_preference) == 1:
        keep = with_preference[0]
        return (SELECT_SOLE_PREFERENCE, keep, [t for t in active if t is not keep], None)

    # Conflicting preferences among candidates - do not resolve.
    if len({_type_of(t) for t in with_preference}) > 1:
        return (SELECT_REFUSE, None, [], REVIEW_AMBIGUOUS)

    if all(is_indistinguishable_concurrent_create(t) for t in active):
        # The ONLY place an id tiebreak is used, and only because the records genuinely
        # carry no distinguishing information.
        ordered = sorted(active, key=lambda t: _norm(t.get("id")))
        return (SELECT_LOWEST_ID, ordered[0], ordered[1:], None)

    return (SELECT_REFUSE, None, [], REVIEW_AMBIGUOUS)
