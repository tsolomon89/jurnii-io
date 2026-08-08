"""Activation Task command contract tests (Changes 2-6, 21).

Run: python tests/test_activation_command.py   (also collects under pytest)

Three rows here carry regressions this plan has already had to fix:
  (Lost, X) -> (Won, X) is re_enable, NOT idempotent_skip   (the r3 defect)
  legacy -> different type is preference_change, NOT activate
  no input returns `activate` unless last_kind == "absent"  (the closed proof)

See tests/activation_command_contract.py for why a green run here is not a statement
about production.
"""

import sys
import os
import itertools

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import activation_command_contract as C  # noqa: E402

CASES = []


def case(name, got, want):
    CASES.append((name, got, want))


# ================================================================================
# 1. Marker round-trip
# ================================================================================

for _s in C.VALID_STATES:
    for _t in list(C.VALID_TYPES) + [""]:
        case(
            "marker round-trip (%s, %r)" % (_s, _t),
            C.parse_marker(C.render_marker(_s, _t)),
            (_s, _t),
        )

case("blank type renders as -", C.render_marker("Won", ""), "ActivationCommand|state=Won|type=-")
case("marker shape", C.render_marker("Won", "Email"), "ActivationCommand|state=Won|type=Email")

# malformed markers do not parse
case("malformed state", C.parse_marker("ActivationCommand|state=Wonn|type=Email"), None)
case("malformed type", C.parse_marker("ActivationCommand|state=Won|type=Emial"), None)
case("missing type part", C.parse_marker("ActivationCommand|state=Won"), None)
case("wrong prefix", C.parse_marker("SendKey: contact|deal|x"), None)
case("extra part", C.parse_marker("ActivationCommand|state=Won|type=Email|x=1"), None)

# ================================================================================
# 2. apply_marker preserves every other line byte for byte
# ================================================================================

REP_DESC = (
    "Set Task_Sequence_Type to Email, Call or Manual to choose how this Contact is\n"
    "engaged, then set Task_State to Won to commit.\n"
    "\n"
    "Email  - one opener email, then a Call.\n"
    "Call   - a Call only.\n"
    "Manual - the automation stays out of your way.\n"
    "\n"
    "Rep note: Ana asked us to hold until after the conference."
)

_applied = C.apply_marker(REP_DESC, "Won", "Email")
case("apply_marker appends the marker", _applied.split("\n")[-1], "ActivationCommand|state=Won|type=Email")
case("apply_marker preserves rep text", "\n".join(_applied.split("\n")[:-1]), REP_DESC)
case("apply_marker preserves the rep-added paragraph", "Ana asked us to hold" in _applied, True)

_replaced = C.apply_marker(_applied, "Lost", "Email")
case("apply_marker replaces, never duplicates", len(C.marker_lines(_replaced)), 1)
case("apply_marker replaced value", C.parse_marker(C.marker_lines(_replaced)[0]), ("Lost", "Email"))
case("apply_marker still preserves rep text", "\n".join(_replaced.split("\n")[:-1]), REP_DESC)

case("apply_marker on empty description", C.apply_marker("", "Won", "Call"), "ActivationCommand|state=Won|type=Call")
case("apply_marker on None description", C.apply_marker(None, "Won", "Call"), "ActivationCommand|state=Won|type=Call")

# Line count is stable across repeated application - it never grows.
_grow = REP_DESC
for _ in range(5):
    _grow = C.apply_marker(_grow, "Won", "Manual")
case("apply_marker is idempotent in shape", len(_grow.split("\n")), len(REP_DESC.split("\n")) + 1)
case("apply_marker never accumulates markers", len(C.marker_lines(_grow)), 1)


# ================================================================================
# 3. resolve_last - the six kinds
# ================================================================================


def rl(desc="", activated="", cseq="", tstate="Open", tstatus="New", nstatus="Not Started", ttype=""):
    return C.resolve_last(desc, activated, cseq, tstate, tstatus, nstatus, ttype)


M_WON_EMAIL = C.render_marker("Won", "Email")

# well-formed marker -> parsed, whatever else is true
case("marker parsed", rl(desc=M_WON_EMAIL), (C.KIND_PARSED, ("Won", "Email")))
case(
    "marker wins over a stamped timestamp",
    rl(desc=M_WON_EMAIL, activated="2026-08-01T10:00:00+01:00", cseq="Call"),
    (C.KIND_PARSED, ("Won", "Email")),
)

# --- the plan's resolve_last table, row for row ---
case(
    "absent | blank | - | New/Not Started -> absent",
    rl(activated="", cseq="", tstatus="New", nstatus="Not Started"),
    (C.KIND_ABSENT, None),
)
case(
    "absent | blank | Email | Won/Closed/Completed type Email -> legacy",
    rl(activated="", cseq="Email", tstate="Won", tstatus="Closed", nstatus="Completed", ttype="Email"),
    (C.KIND_LEGACY, ("Won", "Email")),
)
case(
    "absent | blank | Email | Won/Closed/Completed type Call -> conflict",
    rl(activated="", cseq="Email", tstate="Won", tstatus="Closed", nstatus="Completed", ttype="Call"),
    (C.KIND_CONFLICT, None),
)
case(
    "absent | blank | blank | Won/Closed/Completed -> conflict",
    rl(activated="", cseq="", tstate="Won", tstatus="Closed", nstatus="Completed", ttype="Email"),
    (C.KIND_CONFLICT, None),
)
case(
    "absent | blank | Email | Open/Working/In Progress -> conflict",
    rl(activated="", cseq="Email", tstate="Open", tstatus="Working", nstatus="In Progress", ttype="Email"),
    (C.KIND_CONFLICT, None),
)
case(
    "absent | stamped | Email -> legacy",
    rl(activated="2026-07-01T09:00:00+01:00", cseq="Email"),
    (C.KIND_LEGACY, ("Won", "Email")),
)
case(
    "absent | stamped | blank -> unresolvable",
    rl(activated="2026-07-01T09:00:00+01:00", cseq=""),
    (C.KIND_UNRESOLVABLE, None),
)
case(
    "absent | stamped | -None- -> unresolvable",
    rl(activated="2026-07-01T09:00:00+01:00", cseq="-None-"),
    (C.KIND_UNRESOLVABLE, None),
)
case(
    "absent | stamped | junk -> unresolvable",
    rl(activated="2026-07-01T09:00:00+01:00", cseq="Telepathy"),
    (C.KIND_UNRESOLVABLE, None),
)
case(
    "two marker lines -> unreadable",
    rl(desc=M_WON_EMAIL + "\n" + C.render_marker("Lost", "Call")),
    (C.KIND_UNREADABLE, None),
)
case(
    "two identical marker lines -> unreadable",
    rl(desc=M_WON_EMAIL + "\n" + M_WON_EMAIL),
    (C.KIND_UNREADABLE, None),
)
case(
    "malformed marker -> unreadable",
    rl(desc="ActivationCommand|state=Wonn|type=Email"),
    (C.KIND_UNREADABLE, None),
)
case(
    "malformed marker beats a stamped timestamp",
    rl(desc="ActivationCommand|state=Wonn|type=Email", activated="2026-07-01T09:00:00+01:00", cseq="Email"),
    (C.KIND_UNREADABLE, None),
)

# --- THE strengthened property: `absent` requires every uncommitted signal at once ---
_absent_violations = []
for _act in ("", "2026-07-01T09:00:00+01:00"):
    for _cseq in ("", "Email"):
        for _tstate in ("Open", "Won", "Lost"):
            for _tstatus in ("New", "Working", "Closed"):
                for _nstatus in ("Not Started", "In Progress", "Completed", "Deferred"):
                    for _ttype in ("", "Email", "Call"):
                        k, _ = rl(
                            desc="",
                            activated=_act,
                            cseq=_cseq,
                            tstate=_tstate,
                            tstatus=_tstatus,
                            nstatus=_nstatus,
                            ttype=_ttype,
                        )
                        uncommitted = (_act == "" and _tstatus == "New" and _nstatus == "Not Started")
                        if (k == C.KIND_ABSENT) != uncommitted:
                            _absent_violations.append((_act, _cseq, _tstate, _tstatus, _nstatus, _ttype, k))

case("resolve_last returns `absent` ONLY when every uncommitted signal holds", _absent_violations, [])

# A present marker can never yield `absent`, whatever the Task signals say.
_marker_absent_violations = [
    (s, t)
    for s in C.VALID_STATES
    for t in list(C.VALID_TYPES) + [""]
    if rl(desc=C.render_marker(s, t), tstatus="New", nstatus="Not Started")[0] == C.KIND_ABSENT
]
case("a present marker never resolves to absent", _marker_absent_violations, [])


# ================================================================================
# 4. resolve_activation_command - the command table
# ================================================================================


def rc(cur_state, cur_type, last_kind, last=None):
    return C.resolve_activation_command(cur_state, cur_type, last_kind, last)


def outcome(cur_state, cur_type, last_kind, last=None):
    return rc(cur_state, cur_type, last_kind, last)[0]


def marker(cur_state, cur_type, last_kind, last=None):
    return rc(cur_state, cur_type, last_kind, last)[1]


P = C.KIND_PARSED
L = C.KIND_LEGACY
A = C.KIND_ABSENT

# --- THE r3 defect: Lost -> Won must re-enable, not skip ---
case("(Lost,Email) -> (Won,Email) is re_enable NOT idempotent_skip", outcome("Won", "Email", P, ("Lost", "Email")), C.RE_ENABLE)
case("(Open,Call) -> (Won,Call) is re_enable", outcome("Won", "Call", P, ("Open", "Call")), C.RE_ENABLE)
case("re_enable writes the Won marker", marker("Won", "Email", P, ("Lost", "Email")), ("Won", "Email"))

# --- idempotent skip, regardless of Sequence_Activated_At (the function never sees it) ---
case("(Won,Email) -> (Won,Email) is idempotent_skip", outcome("Won", "Email", P, ("Won", "Email")), C.IDEMPOTENT_SKIP)
case("idempotent_skip writes no marker", marker("Won", "Email", P, ("Won", "Email")), None)
case("resolve_activation_command takes no `executed` argument", C.resolve_activation_command.__code__.co_argcount, 4)

# --- legacy bootstrap and its three consequences ---
case("legacy (Won,Email) + (Won,Email) -> legacy_bootstrap", outcome("Won", "Email", L, ("Won", "Email")), C.LEGACY_BOOTSTRAP)
case("legacy_bootstrap writes the marker", marker("Won", "Email", L, ("Won", "Email")), ("Won", "Email"))
case("legacy (Won,Email) + (Won,Call) -> preference_change", outcome("Won", "Call", L, ("Won", "Email")), C.PREFERENCE_CHANGE)
case("legacy (Won,Email) + (Lost,Email) -> disable_lost", outcome("Lost", "Email", L, ("Won", "Email")), C.DISABLE_LOST)
case("legacy (Won,Email) + (Open,Email) -> disable_open", outcome("Open", "Email", L, ("Won", "Email")), C.DISABLE_OPEN)

# --- initial activation, and the Manual distinction ---
case("absent + (Won,Manual) -> activate", outcome("Won", "Manual", A), C.ACTIVATE)
case("absent + (Won,Email) -> activate", outcome("Won", "Email", A), C.ACTIVATE)
case("activate writes the marker", marker("Won", "Manual", A), ("Won", "Manual"))
case(
    "(Lost,Email) + (Won,Manual) -> re_enable adopting Manual, never initial activation",
    outcome("Won", "Manual", P, ("Lost", "Email")),
    C.RE_ENABLE,
)
case("re_enable adopts the changed type", marker("Won", "Manual", P, ("Lost", "Email")), ("Won", "Manual"))

# --- awaiting commit and no_route ---
case("absent + (Open, -) -> awaiting_commit", outcome("Open", "", A), C.AWAITING_COMMIT)
case("absent + (Open, Email) -> awaiting_commit", outcome("Open", "Email", A), C.AWAITING_COMMIT)
case("absent + (Lost, Email) -> awaiting_commit", outcome("Lost", "Email", A), C.AWAITING_COMMIT)
case("awaiting_commit writes no marker", marker("Open", "", A), None)
case("absent + (Won, blank) -> no_route", outcome("Won", "", A), C.NO_ROUTE)
case("absent + (Won, -None-) -> no_route", outcome("Won", "-None-", A), C.NO_ROUTE)
case("absent + (Won, junk) -> no_route", outcome("Won", "Telepathy", A), C.NO_ROUTE)
case("no_route writes NO marker so a corrected retry works", marker("Won", "", A), None)

# --- prospective preference change ---
case("(Won,Email) -> (Won,Call) is preference_change", outcome("Won", "Call", P, ("Won", "Email")), C.PREFERENCE_CHANGE)
case("(Won,Email) -> (Won,Manual) is preference_change", outcome("Won", "Manual", P, ("Won", "Email")), C.PREFERENCE_CHANGE)
case("preference_change writes the new type", marker("Won", "Manual", P, ("Won", "Email")), ("Won", "Manual"))

# --- the immediate disables ---
case("(Won,Call) -> (Lost,Call) is disable_lost", outcome("Lost", "Call", P, ("Won", "Call")), C.DISABLE_LOST)
case("(Won,Call) -> (Open,Call) is disable_open", outcome("Open", "Call", P, ("Won", "Call")), C.DISABLE_OPEN)
case("disable_lost writes the Lost marker", marker("Lost", "Call", P, ("Won", "Call")), ("Lost", "Call"))
case("disable_open writes the Open marker", marker("Open", "Call", P, ("Won", "Call")), ("Open", "Call"))
case("disable keeps the last type when the edit blanks it", marker("Lost", "", P, ("Won", "Call")), ("Lost", "Call"))

# --- preference recorded while disabled ---
case(
    "(Lost,Email) -> (Lost,Call) is record_preference_while_disabled",
    outcome("Lost", "Call", P, ("Lost", "Email")),
    C.RECORD_PREFERENCE_WHILE_DISABLED,
)
case(
    "(Open,Email) -> (Open,Manual) is record_preference_while_disabled",
    outcome("Open", "Manual", P, ("Open", "Email")),
    C.RECORD_PREFERENCE_WHILE_DISABLED,
)

# --- the three stop-safely kinds write nothing and process no command ---
for _kind, _code in (
    (C.KIND_UNREADABLE, C.MARKER_UNREADABLE),
    (C.KIND_UNRESOLVABLE, C.LEGACY_COMMAND_UNRESOLVED),
    (C.KIND_CONFLICT, C.COMMAND_STATE_CONFLICT),
):
    for _cs in C.VALID_STATES:
        for _ct in list(C.VALID_TYPES) + [""]:
            case("%s + (%s,%r) stops safely" % (_kind, _cs, _ct), outcome(_cs, _ct, _kind), _code)
            case("%s + (%s,%r) writes no marker" % (_kind, _cs, _ct), marker(_cs, _ct, _kind), None)
            case("%s + (%s,%r) writes no field" % (_kind, _cs, _ct), C.writes_for(_code, True), set())

case("every stop-safely outcome has a review code", sorted(C.REVIEW_CODES), sorted(C.STOP_SAFELY))


# ================================================================================
# 5. THE closed proof: nothing returns `activate` unless last_kind == "absent"
# ================================================================================

_activate_violations = []
_all_lasts = [(s, t) for s in C.VALID_STATES for t in list(C.VALID_TYPES) + [""]]
for _kind in (C.KIND_ABSENT, C.KIND_PARSED, C.KIND_LEGACY, C.KIND_UNRESOLVABLE, C.KIND_CONFLICT, C.KIND_UNREADABLE):
    _lasts = _all_lasts if _kind in (C.KIND_PARSED, C.KIND_LEGACY) else [None]
    for _last in _lasts:
        for _cs in list(C.VALID_STATES) + ["", "-None-"]:
            for _ct in list(C.VALID_TYPES) + ["", "-None-", "junk"]:
                if outcome(_cs, _ct, _kind, _last) == C.ACTIVATE and _kind != C.KIND_ABSENT:
                    _activate_violations.append((_kind, _last, _cs, _ct))

case("NO input returns `activate` unless last_kind == absent", _activate_violations, [])

# The same statement end to end, through resolve_last: no Task carrying ANY commit
# evidence can replay a Stage.
_replay_violations = []
for _act in ("", "2026-07-01T09:00:00+01:00"):
    for _cseq in ("", "Email", "Call"):
        for _desc in ("", REP_DESC, REP_DESC + "\n" + M_WON_EMAIL):
            for _tstate in ("Open", "Won", "Lost"):
                for _tstatus in ("New", "Working", "Closed"):
                    for _nstatus in ("Not Started", "In Progress", "Completed"):
                        for _ttype in ("", "Email", "Call"):
                            k, lst = C.resolve_last(_desc, _act, _cseq, _tstate, _tstatus, _nstatus, _ttype)
                            out = outcome("Won", _ttype or "Email", k, lst)
                            if out == C.ACTIVATE:
                                committed = (
                                    _act != ""
                                    or C.marker_lines(_desc)
                                    or _tstatus != "New"
                                    or _nstatus != "Not Started"
                                )
                                if committed:
                                    _replay_violations.append((_act, _cseq, _desc[:12], _tstate, _tstatus, _nstatus, _ttype))

case("end to end: no Task with commit evidence can replay a Stage", _replay_violations, [])

# `ineligible` and `retry_execution` are not members of the outcome set.
_ALL_OUTCOMES = {
    C.AWAITING_COMMIT, C.NO_ROUTE, C.IDEMPOTENT_SKIP, C.ACTIVATE, C.LEGACY_BOOTSTRAP,
    C.PREFERENCE_CHANGE, C.DISABLE_LOST, C.DISABLE_OPEN, C.RE_ENABLE,
    C.RECORD_PREFERENCE_WHILE_DISABLED,
} | set(C.STOP_SAFELY)
case("`ineligible` is not an outcome", "ineligible" in _ALL_OUTCOMES, False)
case("`retry_execution` is not an outcome", "retry_execution" in _ALL_OUTCOMES, False)

_observed = set()
for _kind in (C.KIND_ABSENT, C.KIND_PARSED, C.KIND_LEGACY, C.KIND_UNRESOLVABLE, C.KIND_CONFLICT, C.KIND_UNREADABLE):
    _lasts = _all_lasts if _kind in (C.KIND_PARSED, C.KIND_LEGACY) else [None]
    for _last in _lasts:
        for _cs in list(C.VALID_STATES) + [""]:
            for _ct in list(C.VALID_TYPES) + [""]:
                _observed.add(outcome(_cs, _ct, _kind, _last))
case("every observed outcome is a declared member", _observed - _ALL_OUTCOMES, set())


# ================================================================================
# 6. may_execute - eligibility gates execution only
# ================================================================================

case("activate on a Lost Contact does not execute", C.may_execute(C.ACTIVATE, False), False)
case("re_enable on a Lost Contact does not execute", C.may_execute(C.RE_ENABLE, False), False)
case("activate on an eligible Contact executes", C.may_execute(C.ACTIVATE, True), True)
case("re_enable on an eligible Contact executes", C.may_execute(C.RE_ENABLE, True), True)
case("disable_lost still neutralizes on a Lost Contact", C.may_execute(C.DISABLE_LOST, False), True)
case("disable_open still neutralizes on a Lost Contact", C.may_execute(C.DISABLE_OPEN, False), True)

# Every command is still RECORDED for an ineligible Contact.
for _out in C.RECORDING_OUTCOMES:
    case("%s records the command even when ineligible" % _out, C.records_command(_out), True)
    case("%s writes the marker even when ineligible" % _out, "Task.Description" in C.writes_for(_out, False), True)

for _out in (C.AWAITING_COMMIT, C.NO_ROUTE, C.IDEMPOTENT_SKIP) + tuple(C.STOP_SAFELY):
    case("%s records nothing" % _out, C.records_command(_out), False)

# Preference is written in every ineligible case that records a type.
for _out in (C.ACTIVATE, C.RE_ENABLE, C.PREFERENCE_CHANGE, C.DISABLE_LOST, C.DISABLE_OPEN,
             C.RECORD_PREFERENCE_WHILE_DISABLED):
    case("%s writes Contact.Sequence_Type when ineligible" % _out, "Contact.Sequence_Type" in C.writes_for(_out, False), True)

# --- the fields activation controls must NEVER write, in any outcome, either eligibility ---
_FORBIDDEN = {
    "Contact.State", "Contact.Status", "Contact.Stage", "Contact.Sequence_Activated_At",
    "Deal.Opportunity_State", "Deal.Opportunity_Status", "Deal.Lost_Reasons",
}
_forbidden_violations = []
for _out in _ALL_OUTCOMES:
    for _elig in (True, False):
        bad = C.writes_for(_out, _elig) & _FORBIDDEN
        if bad:
            _forbidden_violations.append((_out, _elig, bad))
case("no activation outcome writes Contact.State/Status/Stage, the timestamp or any Deal field", _forbidden_violations, [])

# activate routes only when eligible; the timestamp is never in the write set either way.
case("activate routes when eligible", "routed" in C.writes_for(C.ACTIVATE, True), True)
case("activate does NOT route when ineligible", "routed" in C.writes_for(C.ACTIVATE, False), False)
case("legacy_bootstrap never routes", "routed" in C.writes_for(C.LEGACY_BOOTSTRAP, True), False)
case("legacy_bootstrap writes the marker and nothing else", C.writes_for(C.LEGACY_BOOTSTRAP, True), {"Task.Description"})
case(
    "preference_change writes one field and the marker, nothing else",
    C.writes_for(C.PREFERENCE_CHANGE, True),
    {"Task.Description", "Contact.Sequence_Type"},
)
case(
    "preference_change never writes Sequence_State",
    "Contact.Sequence_State" in C.writes_for(C.PREFERENCE_CHANGE, True),
    False,
)
case(
    "preference_change never neutralizes an artifact",
    "cadence_artifacts_neutralized" in C.writes_for(C.PREFERENCE_CHANGE, True),
    False,
)
case("re_enable does not neutralize", "cadence_artifacts_neutralized" in C.writes_for(C.RE_ENABLE, True), False)
case("re_enable does not route", "routed" in C.writes_for(C.RE_ENABLE, True), False)


# ================================================================================
# 7. Scenario walk-throughs from the plan's live acceptance table
# ================================================================================

# LG-7 - the last replay path. Ineligible Contact, blank timestamp, Won/Call recorded,
# marker then deleted from the Description, Contact reopened, Task re-saved unchanged.
_k, _l = C.resolve_last(
    description=REP_DESC,                 # marker deleted by hand
    contact_activated_at="",              # still blank - never activated
    contact_sequence_type="Call",         # the stored preference
    task_state="Won",
    task_status="Closed",
    native_status="Completed",
    task_type_value="Call",
)
case("LG-7 resolves as legacy (reconstruct), not absent", _k, C.KIND_LEGACY)
case("LG-7 reconstructs (Won, Call)", _l, ("Won", "Call"))
case("LG-7 re-save is legacy_bootstrap, not activate", outcome("Won", "Call", _k, _l), C.LEGACY_BOOTSTRAP)
case("LG-7 restores the marker", marker("Won", "Call", _k, _l), ("Won", "Call"))
case("LG-7 writes the marker and nothing else", C.writes_for(C.LEGACY_BOOTSTRAP, True), {"Task.Description"})

# LG-8 - same, but the type is changed to Email in the same save. Evidence too weak.
_k8, _l8 = C.resolve_last(REP_DESC, "", "Call", "Won", "Closed", "Completed", "Email")
case("LG-8 resolves as conflict", _k8, C.KIND_CONFLICT)
case("LG-8 stops safely", outcome("Won", "Email", _k8, _l8), C.COMMAND_STATE_CONFLICT)
case("LG-8 writes nothing", C.writes_for(C.COMMAND_STATE_CONFLICT, True), set())

# LG-5 - stamped timestamp, blank preference.
_k5, _l5 = C.resolve_last(REP_DESC, "2026-07-01T09:00:00+01:00", "", "Open", "New", "Not Started", "")
case("LG-5 resolves as unresolvable", _k5, C.KIND_UNRESOLVABLE)
case("LG-5 stops safely", outcome("Won", "Email", _k5, _l5), C.LEGACY_COMMAND_UNRESOLVED)

# AC-9 - storage and eligibility are independent, on a Contact with State=Lost.
_seq = [("Won", "Call", C.PREFERENCE_CHANGE), ("Lost", "Call", C.DISABLE_LOST), ("Won", "Call", C.RE_ENABLE)]
_last_kind, _last = C.KIND_PARSED, ("Won", "Email")
for _cs, _ct, _want in _seq:
    _out, _mk = rc(_cs, _ct, _last_kind, _last)
    case("AC-9 %s,%s -> %s" % (_cs, _ct, _want), _out, _want)
    case("AC-9 %s,%s records the command while ineligible" % (_cs, _ct), C.records_command(_out), True)
    case(
        "AC-9 %s,%s leaves Contact.State/Stage and the timestamp alone" % (_cs, _ct),
        C.writes_for(_out, False) & _FORBIDDEN,
        set(),
    )
    _last = _mk

# AC-8b - three more unchanged saves after re-enable.
for _i in range(3):
    case("AC-8b re-save %d is idempotent_skip" % (_i + 1), outcome("Won", "Call", C.KIND_PARSED, ("Won", "Call")), C.IDEMPOTENT_SKIP)

# AC-8c - Manual + Won from Lost in one save is re_enable, distinguishable from initial Manual.
case("AC-8c is re_enable", outcome("Won", "Manual", C.KIND_PARSED, ("Lost", "Email")), C.RE_ENABLE)
case("AC-8c is NOT activate", outcome("Won", "Manual", C.KIND_PARSED, ("Lost", "Email")) != C.ACTIVATE, True)


def test_activation_command_contract():
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
