"""Reference implementation of the Activation Task command contract (Changes 2-6, 21).

Mirror of the command-resolution logic implemented in
v6/activity/handleTaskCompletion.deluge. Deluge has no local runner, so the contract is
pinned here and exercised by tests/test_activation_command.py.

LIMITATION: this proves the CONTRACT, not the deployed Deluge. Keep the two in step -
if you change one, change the other in the same commit. A green run here does not mean
production is correct; only republishing + the live E2E does that.

The contract is three functions, deliberately separate:

  resolve_last(...)                 what command was last processed for this Task
  resolve_activation_command(...)   what the current edit means, given that
  may_execute(...)                  whether the executing half may run at all

Recording a command and executing it are two steps, in that order (plan 11.7f).
Eligibility gates execution only; it never changes what the command *is*.
"""

MARKER_PREFIX = "ActivationCommand|"

VALID_STATES = ("Open", "Won", "Lost")
VALID_TYPES = ("Email", "Call", "Manual")

# Task_Sequence_Type carries "-None-" as its blank sentinel in the live picklist.
BLANK_TYPE_SENTINELS = ("", "-None-", "None", "-")

# resolve_last kinds
KIND_ABSENT = "absent"
KIND_PARSED = "parsed"
KIND_LEGACY = "legacy"
KIND_UNRESOLVABLE = "unresolvable"
KIND_CONFLICT = "conflict"
KIND_UNREADABLE = "unreadable"

# resolve_activation_command outcomes. Note that neither "ineligible" nor
# "retry_execution" is a member: eligibility is a separate function, and a recorded
# commit is never re-executed by re-saving the Task.
AWAITING_COMMIT = "awaiting_commit"
NO_ROUTE = "no_route"
IDEMPOTENT_SKIP = "idempotent_skip"
ACTIVATE = "activate"
LEGACY_BOOTSTRAP = "legacy_bootstrap"
PREFERENCE_CHANGE = "preference_change"
DISABLE_LOST = "disable_lost"
DISABLE_OPEN = "disable_open"
RE_ENABLE = "re_enable"
RECORD_PREFERENCE_WHILE_DISABLED = "record_preference_while_disabled"

# The three stop-safely outcomes. Each raises one idempotent Manual Review and writes
# nothing at all - not the marker, not the preference, not any Contact or Deal field.
MARKER_UNREADABLE = "marker_unreadable"
LEGACY_COMMAND_UNRESOLVED = "legacy_command_unresolved"
COMMAND_STATE_CONFLICT = "command_state_conflict"

STOP_SAFELY = (MARKER_UNREADABLE, LEGACY_COMMAND_UNRESOLVED, COMMAND_STATE_CONFLICT)

REVIEW_CODES = {
    MARKER_UNREADABLE: "[activation_marker_unreadable]",
    LEGACY_COMMAND_UNRESOLVED: "[activation_legacy_command_unresolved]",
    COMMAND_STATE_CONFLICT: "[activation_command_state_conflict]",
}


def _norm(value):
    return (value or "").strip()


def normalize_type(value):
    """Return a valid Task_Sequence_Type, or "" for every blank/invalid spelling."""
    v = _norm(value)
    if v in BLANK_TYPE_SENTINELS:
        return ""
    return v if v in VALID_TYPES else ""


def normalize_state(value):
    v = _norm(value)
    return v if v in VALID_STATES else ""


# --------------------------------------------------------------------------------
# The marker: one line in the Task Description, same shape as the existing
# ScheduledSend| and SendKey: markers. No new field is created.
# --------------------------------------------------------------------------------


def render_marker(state, type_value):
    """ActivationCommand|state=<Task_State>|type=<Task_Sequence_Type or ->"""
    t = normalize_type(type_value)
    return "%sstate=%s|type=%s" % (MARKER_PREFIX, state, t if t else "-")


def parse_marker(line):
    """Parse one marker line. Returns (state, type) or None when malformed.

    A blank type is carried as "-" on the wire and comes back as "".
    """
    s = _norm(line)
    if not s.startswith(MARKER_PREFIX):
        return None
    body = s[len(MARKER_PREFIX):]
    parts = body.split("|")
    if len(parts) != 2:
        return None
    if not parts[0].startswith("state=") or not parts[1].startswith("type="):
        return None
    state = parts[0][len("state="):].strip()
    type_value = parts[1][len("type="):].strip()
    if state not in VALID_STATES:
        return None
    if type_value == "-":
        return (state, "")
    if type_value not in VALID_TYPES:
        return None
    return (state, type_value)


def marker_lines(description):
    """Every line in the Description that claims to be a marker, malformed or not."""
    return [ln for ln in (description or "").split("\n") if _norm(ln).startswith(MARKER_PREFIX)]


def apply_marker(description, state, type_value):
    """Replace exactly the one ActivationCommand| line, preserving every other line.

    Rep-facing content - the long activation instructions written at create, and
    anything a rep added - is carried through byte for byte.
    """
    kept = [ln for ln in (description or "").split("\n") if not _norm(ln).startswith(MARKER_PREFIX)]
    marker = render_marker(state, type_value)
    # A wholly empty Description must not gain a leading blank line.
    if kept == [""] or kept == []:
        return marker
    return "\n".join(kept) + "\n" + marker


# --------------------------------------------------------------------------------
# Step 1 - resolve what was last processed.
# --------------------------------------------------------------------------------


def resolve_last(
    description,
    contact_activated_at,
    contact_sequence_type,
    task_state,
    task_status,
    native_status,
    task_type_value,
):
    """Resolve the last processed command. Returns (kind, last) with last=(state,type).

    Every Activation Task in the org predates the marker, so "marker absent" cannot mean
    "never committed". Absent evidence is never read as "never happened" (plan 11.7d).
    """
    lines = marker_lines(description)

    if len(lines) > 1:
        return (KIND_UNREADABLE, None)
    if len(lines) == 1:
        parsed = parse_marker(lines[0])
        if parsed is None:
            return (KIND_UNREADABLE, None)
        return (KIND_PARSED, parsed)

    # --- no marker ---
    cst = normalize_type(contact_sequence_type)

    if _norm(contact_activated_at):
        # Committed before the marker existed, or the marker was edited away. A stamped
        # timestamp plus a stored preference is solid evidence of the prior commit.
        if cst:
            return (KIND_LEGACY, ("Won", cst))
        return (KIND_UNRESOLVABLE, None)

    # --- no marker, blank timestamp: the Task's own signals decide ---
    ts = _norm(task_status)
    ns = _norm(native_status)
    tt = normalize_type(task_type_value)

    if ts == "New" and ns == "Not Started":
        # Genuinely uncommitted. The ONLY route to initial activation.
        return (KIND_ABSENT, None)

    committed = normalize_state(task_state) == "Won" and (ts == "Closed" or ns == "Completed")
    if committed and tt and tt == cst:
        # Change 21 leaves a durable (Won, type) command whose timestamp is still blank.
        # Reconstruct it. Weaker evidence than the stamped case, so the Task type must
        # AGREE with the Contact's stored preference - a disagreement is a conflict to
        # report, not a preference change to infer.
        return (KIND_LEGACY, ("Won", tt))

    return (KIND_CONFLICT, None)


# --------------------------------------------------------------------------------
# Step 2 - resolve what this edit means.
# --------------------------------------------------------------------------------


def resolve_activation_command(cur_state, cur_type, last_kind, last):
    """Returns (outcome, marker) where marker is the (state, type) to write, or None."""
    cs = normalize_state(cur_state)
    ct = normalize_type(cur_type)

    if last_kind == KIND_UNREADABLE:
        return (MARKER_UNREADABLE, None)
    if last_kind == KIND_UNRESOLVABLE:
        return (LEGACY_COMMAND_UNRESOLVED, None)
    if last_kind == KIND_CONFLICT:
        return (COMMAND_STATE_CONFLICT, None)

    if last_kind == KIND_ABSENT:
        if cs != "Won":
            return (AWAITING_COMMIT, None)
        if not ct:
            # No marker written, so a corrected retry works.
            return (NO_ROUTE, None)
        return (ACTIVATE, ("Won", ct))

    last_state, last_type = last

    if last_kind == KIND_PARSED and (cs, ct) == (last_state, last_type):
        # The repeated-save case, and the only outcome of re-saving an unchanged Task at
        # any later point - regardless of whether Sequence_Activated_At is stamped.
        return (IDEMPOTENT_SKIP, None)

    if last_kind == KIND_LEGACY and (cs, ct) == (last_state, last_type):
        # Write the marker, route nothing, create nothing, send nothing.
        return (LEGACY_BOOTSTRAP, (cs, ct))

    if last_state == "Won":
        if cs == "Won":
            if not ct:
                return (NO_ROUTE, None)
            return (PREFERENCE_CHANGE, ("Won", ct))
        if cs == "Lost":
            return (DISABLE_LOST, ("Lost", ct or last_type))
        if cs == "Open":
            return (DISABLE_OPEN, ("Open", ct or last_type))
        return (AWAITING_COMMIT, None)

    # last_state is Lost or Open - the control is disabled.
    if cs == "Won":
        if not ct:
            return (NO_ROUTE, None)
        # Adopts a changed type in the same operation.
        return (RE_ENABLE, ("Won", ct))
    if cs in ("Lost", "Open"):
        # Already disabled; record the preference, no dispatch effect. A pure state flip
        # between the two disabled states lands here too - neutralization is convergent,
        # so there is nothing further to switch off.
        return (RECORD_PREFERENCE_WHILE_DISABLED, (cs, ct))
    return (AWAITING_COMMIT, None)


# --------------------------------------------------------------------------------
# Step 3 - eligibility, which gates execution only.
# --------------------------------------------------------------------------------

# Outcomes that write the marker and Contact.Sequence_Type. They do so whether or not
# the Contact is commercially eligible.
RECORDING_OUTCOMES = (
    ACTIVATE,
    LEGACY_BOOTSTRAP,
    PREFERENCE_CHANGE,
    DISABLE_LOST,
    DISABLE_OPEN,
    RE_ENABLE,
    RECORD_PREFERENCE_WHILE_DISABLED,
)

# Outcomes with an executing half at all. Everything else only records.
ROUTING_OUTCOMES = (ACTIVATE,)
NEUTRALIZING_OUTCOMES = (DISABLE_LOST, DISABLE_OPEN)


def records_command(outcome):
    """Whether the marker + Contact.Sequence_Type are written."""
    return outcome in RECORDING_OUTCOMES


def may_execute(outcome, contact_eligible):
    """Whether the command's EXECUTING half may run.

    A Won recorded while ineligible is a committed stored preference, not a pending
    instruction to activate the current Stage. Nothing is queued and nothing waits to
    fire; the preference becomes usable at the next cadence-eligible Stage entry, by
    Change 21 - see cadence_dispatch_gate_contract.establishes_activation_at_entry.
    """
    if outcome in (ACTIVATE, RE_ENABLE):
        return bool(contact_eligible)
    if outcome in NEUTRALIZING_OUTCOMES:
        # Cleanup is convergent and safe, so it runs even for an ineligible Contact.
        return True
    return True


def writes_for(outcome, contact_eligible):
    """The exact set of fields this outcome writes. Used to pin "and nothing else".

    Deliberately absent from every set: Contact.State, Contact.Status, Contact.Stage,
    Sequence_Activated_At, and every Deal field. Activation controls never write them.
    """
    if outcome in STOP_SAFELY:
        return set()
    if outcome in (AWAITING_COMMIT, NO_ROUTE, IDEMPOTENT_SKIP):
        return set()

    fields = {"Task.Description"}

    if outcome == LEGACY_BOOTSTRAP:
        # Marker only. Routes nothing, creates nothing, sends nothing.
        return fields

    if outcome in (PREFERENCE_CHANGE, RECORD_PREFERENCE_WHILE_DISABLED):
        # One field and nothing else (plan 11.6b).
        fields.add("Contact.Sequence_Type")
        return fields

    if outcome in NEUTRALIZING_OUTCOMES:
        fields.add("Contact.Sequence_Type")
        fields.add("Contact.Sequence_State")
        fields.add("Task.Task_Status")
        fields.add("Task.Status")
        # Neutralization runs even for an ineligible Contact - it is cleanup.
        fields.add("cadence_artifacts_neutralized")
        return fields

    if outcome == RE_ENABLE:
        fields.add("Contact.Sequence_Type")
        fields.add("Contact.Sequence_State")
        fields.add("Contact.Sequence_Stage")
        fields.add("Contact.Sequence_Step")
        fields.add("Task.Task_Status")
        fields.add("Task.Status")
        return fields

    if outcome == ACTIVATE:
        fields.add("Contact.Sequence_Type")
        if contact_eligible:
            fields.add("routed")
        return fields

    return fields
