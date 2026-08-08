"""Canonical Activation Task identity contract tests (Change 1, plan 10).

Run: python tests/test_activation_identity.py   (also collects under pytest)

Identity and the active-control set are deliberately two functions; these tests assert
they are not conflated. The refusal paths matter as much as the success paths: every
refusal must modify NOTHING.

See tests/activation_identity_contract.py for why a green run here is not a statement
about production.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import activation_identity_contract as I  # noqa: E402

CASES = []


def case(name, got, want):
    CASES.append((name, got, want))


CONTACT = "991103000002874057"
OTHER_CONTACT = "991103000002879188"
MARKER_WON_EMAIL = "ActivationCommand|state=Won|type=Email"
MARKER_WON_CALL = "ActivationCommand|state=Won|type=Call"
MARKER_LOST_EMAIL = "ActivationCommand|state=Lost|type=Email"


def task(id_, **kw):
    t = {
        "id": id_,
        "Who_Id": CONTACT,
        "Task_Type": I.ACTIVATION_TASK_TYPE,
        "Task_State": "Open",
        "Task_Status": "New",
        "Status": "Not Started",
        "Task_Sequence_Type": "",
        "Task_Sequence_Stage": "Demo Booking",
        "What_Id": "deal-A",
        "Description": "Pick a type, then set Task_State to Won.",
    }
    t.update(kw)
    return t


# ================================================================================
# 1. Identity - Contact + Task_Type, and nothing else
# ================================================================================

BASE = task("100")

case("same Contact, same type -> same control", I.is_same_activation_control(BASE, CONTACT), True)
case(
    "different Stage -> STILL the same control",
    I.is_same_activation_control(task("101", Task_Sequence_Stage="Renewal"), CONTACT),
    True,
)
case(
    "different Deal -> STILL the same control",
    I.is_same_activation_control(task("102", What_Id="deal-B"), CONTACT),
    True,
)
case(
    "Completed -> STILL the same control",
    I.is_same_activation_control(task("103", Status="Completed", Task_Status="Closed", Task_State="Won"), CONTACT),
    True,
)
case(
    "In Progress -> same control",
    I.is_same_activation_control(task("104", Status="In Progress"), CONTACT),
    True,
)
case("different Contact -> NOT the same control", I.is_same_activation_control(BASE, OTHER_CONTACT), False)
case(
    "Manual Review Task -> NOT the same control",
    I.is_same_activation_control(task("105", Task_Type="Manual Review"), CONTACT),
    False,
)
case(
    "Draft Commercials Task -> NOT the same control",
    I.is_same_activation_control(task("106", Task_Type="Draft Commercials"), CONTACT),
    False,
)
case(
    "Scheduled Send Task -> NOT the same control",
    I.is_same_activation_control(task("107", Task_Type="Scheduled Send"), CONTACT),
    False,
)

# A Deferred Task SHARES the identity but is filtered out by active_candidates.
_deferred = task("108", Status=I.RETIRED_STATUS)
case("a Deferred Task still shares the identity", I.is_same_activation_control(_deferred, CONTACT), True)
case("a Deferred Task is NOT an active candidate", I.active_candidates([_deferred]), [])


# ================================================================================
# 2. active_candidates - the retirement rule
# ================================================================================

_completed = task("200", Status="Completed", Task_Status="Closed", Task_State="Won", Description=MARKER_WON_EMAIL)

case("Completed stays active", I.active_candidates([_completed]), [_completed])
case("Deferred never stays active", I.active_candidates([_completed, _deferred]), [_completed])
case(
    "excludes Deferred and NOTHING else",
    [t["id"] for t in I.active_candidates([task("1"), task("2", Status="In Progress"),
                                           task("3", Status="Completed"), task("4", Status=I.RETIRED_STATUS),
                                           task("5", Status="Waiting on someone else")])],
    ["1", "2", "3", "5"],
)

# one active + N deferred -> exactly one control, no ambiguity
_one_plus_three = [task("300"), task("301", Status=I.RETIRED_STATUS),
                   task("302", Status=I.RETIRED_STATUS), task("303", Status=I.RETIRED_STATUS)]
_kind, _control, _create, _code = I.control_state(_one_plus_three)
case("one active + 3 deferred -> single", _kind, I.SINGLE)
case("one active + 3 deferred -> that Task is the control", _control["id"], "300")
case("one active + 3 deferred -> no ambiguity review", _code, None)
case("one active + 3 deferred -> do not create", _create, False)

# zero active + >=1 deferred -> reported, never replaced
_all_retired = [task("400", Status=I.RETIRED_STATUS), task("401", Status=I.RETIRED_STATUS)]
_kind, _control, _create, _code = I.control_state(_all_retired)
case("zero active + deferred -> no_active_control", _kind, I.NO_ACTIVE_CONTROL)
case("zero active + deferred -> should_create_new is False", _create, False)
case("zero active + deferred -> reports the code", _code, I.REVIEW_NO_ACTIVE_CONTROL)
case("zero active + deferred -> no control chosen", _control, None)

# zero of anything -> create
_kind, _control, _create, _code = I.control_state([])
case("zero of anything -> none", _kind, I.NONE_AT_ALL)
case("zero of anything -> should_create_new is True", _create, True)
case("zero of anything -> no review", _code, None)

# create-time dedupe uses the SAME set as the runtime
case("create-time: >=1 active -> do not create", I.should_create_new([task("500")]), False)
case("create-time: completed active -> do not create", I.should_create_new([_completed]), False)
case("create-time: at an older Stage -> do not create (ID-1)", I.should_create_new([task("501", Task_Sequence_Stage="Marketing Consent")]), False)
case("create-time: on another Deal -> do not create (ID-2)", I.should_create_new([task("502", What_Id="deal-Z")]), False)
case("create-time: only Deferred -> do not create (ID-5)", I.should_create_new(_all_retired), False)
case("create-time: nothing at all -> create", I.should_create_new([]), True)


# ================================================================================
# 3. collapse_runtime - the Change 1 correction
# ================================================================================

_twins = [task("601"), task("600")]
_verdict, _keep, _retire = I.collapse_runtime(_twins)
case("two blank Open/New Tasks collapse", _verdict, I.COLLAPSED)
case("collapse keeps the LOWEST id", _keep["id"], "600")
case("collapse retires the rest", [t["id"] for t in _retire], ["601"])

# --- every refusal, each returning an EMPTY retire-list ---
REFUSALS = [
    ("any candidate carries a Task_Sequence_Type", [task("700"), task("701", Task_Sequence_Type="Email")]),
    ("any candidate carries a marker", [task("710"), task("711", Description=MARKER_WON_EMAIL)]),
    ("any candidate is Task_State != Open", [task("720"), task("721", Task_State="Won")]),
    ("any candidate is Task_State Lost", [task("725"), task("726", Task_State="Lost")]),
    ("any candidate is Task_Status != New", [task("730"), task("731", Task_Status="Closed")]),
    ("any candidate is Task_Status Working", [task("735"), task("736", Task_Status="Working")]),
    ("one candidate is Completed", [task("740"), task("741", Status="Completed", Task_Status="Closed", Task_State="Won")]),
    ("two DIFFERENT committed preferences", [
        task("750", Task_State="Won", Task_Status="Closed", Task_Sequence_Type="Email", Description=MARKER_WON_EMAIL),
        task("751", Task_State="Won", Task_Status="Closed", Task_Sequence_Type="Call", Description=MARKER_WON_CALL),
    ]),
    ("one committed and one blank (ID-3)", [
        task("760", Task_State="Won", Task_Status="Closed", Task_Sequence_Type="Email", Description=MARKER_WON_EMAIL),
        task("761"),
    ]),
]

for _name, _set in REFUSALS:
    _v, _k, _r = I.collapse_runtime(_set)
    case("refuse to collapse: %s" % _name, _v, I.AMBIGUOUS)
    case("refuse to collapse: %s -> empty retire-list" % _name, _r, [])
    case("refuse to collapse: %s -> no Task chosen" % _name, _k, None)
    case("refuse to collapse: %s -> unchanged by apply" % _name, I.apply_collapse(_set), _set)
    _ck, _cc, _cn, _ccode = I.control_state(_set)
    case("refuse to collapse: %s -> ambiguous control state" % _name, _ck, I.AMBIGUOUS)
    case("refuse to collapse: %s -> raises the review code" % _name, _ccode, I.REVIEW_AMBIGUOUS)
    case("refuse to collapse: %s -> handler acts on NOTHING" % _name, I.handler_acts_on_edited_task(_set), False)

# --- finality: feeding collapse_runtime its own output returns nothing to collapse ---
_after = I.apply_collapse(_twins)
case("apply_collapse retires the loser", sorted((t["id"], t["Status"]) for t in _after),
     [("600", "Not Started"), ("601", I.RETIRED_STATUS)])
case("collapse converges: second pass has nothing to do", I.collapse_runtime(_after)[0], I.NOTHING_TO_COLLAPSE)
case("collapse converges: retire-list is empty on the second pass", I.collapse_runtime(_after)[2], [])
case("collapse converges: third pass too", I.collapse_runtime(I.apply_collapse(_after))[0], I.NOTHING_TO_COLLAPSE)
case("after collapse there is exactly one active candidate", len(I.active_candidates(_after)), 1)
case("after collapse the control state is single", I.control_state(_after)[0], I.SINGLE)
case("after collapse no replacement is created", I.should_create_new(_after), False)

case("nothing to collapse with one active", I.collapse_runtime([task("800")])[0], I.NOTHING_TO_COLLAPSE)
case("nothing to collapse with none", I.collapse_runtime([])[0], I.NOTHING_TO_COLLAPSE)
case("nothing to collapse with only deferred", I.collapse_runtime(_all_retired)[0], I.NOTHING_TO_COLLAPSE)


# ================================================================================
# 4. ID-4 - retirement finality, the four-step live sequence, offline
# ================================================================================

_id4 = [task("900"), task("901")]
# (1) edit one, so collapse runs
_v, _keep4, _retire4 = I.collapse_runtime(_id4)
case("ID-4 (1) lowest id kept", (_v, _keep4["id"], [t["id"] for t in _retire4]), (I.COLLAPSED, "900", ["901"]))
_id4 = I.apply_collapse(_id4)
# (2) WF008 fires on the newly Deferred sibling -> inert
_sibling = [t for t in _id4 if t["id"] == "901"][0]
case("ID-4 (2) the Deferred sibling is inert", I.handler_processes(_sibling, _id4), False)
# (3) re-save the retained Task -> still usable
_retained = [t for t in _id4 if t["id"] == "900"][0]
case("ID-4 (3) the retained Task still processes", I.handler_processes(_retained, _id4), True)
# (4) re-run processContact
case("ID-4 (4) no ambiguity review", I.control_state(_id4)[3], None)
case("ID-4 (4) no additional Activation Task", I.should_create_new(_id4), False)
case("ID-4 exactly one active candidate at every step", len(I.active_candidates(_id4)), 1)

# ID-5 - the sole Task set Deferred by hand
_id5 = [task("910", Status=I.RETIRED_STATUS)]
case("ID-5 no replacement Task", I.should_create_new(_id5), False)
case("ID-5 reports no_active_control", I.control_state(_id5)[3], I.REVIEW_NO_ACTIVE_CONTROL)
case("ID-5 re-run is stable", I.control_state(_id5)[3], I.REVIEW_NO_ACTIVE_CONTROL)
case("ID-5 the retired Task itself is inert", I.handler_processes(_id5[0], _id5), False)


# ================================================================================
# 5. select_canonical_offline - the plan 10 rules, including the two that refuse
# ================================================================================

CONTACT_EMAIL = {"Sequence_Type": "Email"}
CONTACT_BLANK = {"Sequence_Type": ""}

# rule 3 - exactly one authoritative
_r3 = [
    task("1000", Task_State="Won", Task_Status="Closed", Status="Completed",
         Task_Sequence_Type="Email", Description=MARKER_WON_EMAIL),
    task("1001", Task_State="Won", Task_Status="Closed", Status="Completed",
         Task_Sequence_Type="Call", Description=MARKER_LOST_EMAIL),
]
_rule, _canon, _ret, _code = I.select_canonical_offline(_r3, CONTACT_EMAIL)
case("rule 3: exactly one authoritative", _rule, I.SELECT_AUTHORITATIVE)
case("rule 3: canonical is the authoritative one", _canon["id"], "1000")
case("rule 3: retires the rest", [t["id"] for t in _ret], ["1001"])

# a candidate with no marker can NEVER be authoritative
case("no marker -> never authoritative", I.is_authoritative(task("1010", Task_Sequence_Type="Email"), CONTACT_EMAIL), False)
case("marker type must equal Contact.Sequence_Type",
     I.is_authoritative(task("1011", Description=MARKER_WON_CALL), CONTACT_EMAIL), False)
case("Lost marker is never authoritative",
     I.is_authoritative(task("1012", Description=MARKER_LOST_EMAIL), CONTACT_EMAIL), False)
case("Won marker matching the Contact IS authoritative",
     I.is_authoritative(task("1013", Description=MARKER_WON_EMAIL), CONTACT_EMAIL), True)

# rule 4 - no authoritative, exactly one carries a valid preference
_r4 = [task("1100", Task_Sequence_Type="Call"), task("1101"), task("1102")]
_rule, _canon, _ret, _code = I.select_canonical_offline(_r4, CONTACT_BLANK)
case("rule 4: sole preference wins", _rule, I.SELECT_SOLE_PREFERENCE)
case("rule 4: canonical is the one expressing a preference", _canon["id"], "1100")
case("rule 4: retires the other two", sorted(t["id"] for t in _ret), ["1101", "1102"])

# rule 5 - all four-part indistinguishable, the ONLY id tiebreak
_r5 = [task("1203"), task("1201"), task("1202")]
_rule, _canon, _ret, _code = I.select_canonical_offline(_r5, CONTACT_BLANK)
case("rule 5: indistinguishable -> lowest id", (_rule, _canon["id"]), (I.SELECT_LOWEST_ID, "1201"))
case("rule 5: retires the rest", sorted(t["id"] for t in _ret), ["1202", "1203"])

# rule 6a - more than one authoritative -> refuse
_r6a = [
    task("1300", Description=MARKER_WON_EMAIL, Task_Sequence_Type="Email"),
    task("1301", Description=MARKER_WON_EMAIL, Task_Sequence_Type="Email"),
]
_rule, _canon, _ret, _code = I.select_canonical_offline(_r6a, CONTACT_EMAIL)
case("rule 6a: two authoritative -> refuse", _rule, I.SELECT_REFUSE)
case("rule 6a: leaves every record untouched", _ret, [])
case("rule 6a: raises the ambiguity code", _code, I.REVIEW_AMBIGUOUS)
case("rule 6a: no canonical chosen", _canon, None)

# rule 6b - conflicting preferences -> refuse
_r6b = [task("1400", Task_Sequence_Type="Email"), task("1401", Task_Sequence_Type="Call")]
_rule, _canon, _ret, _code = I.select_canonical_offline(_r6b, CONTACT_BLANK)
case("rule 6b: conflicting preferences -> refuse", _rule, I.SELECT_REFUSE)
case("rule 6b: leaves every record untouched", _ret, [])
case("rule 6b: raises the ambiguity code", _code, I.REVIEW_AMBIGUOUS)

# rule 1 - Deferred excluded; zero active with Deferred present -> report, create nothing
_r1 = [task("1500", Status=I.RETIRED_STATUS), task("1501", Status=I.RETIRED_STATUS)]
_rule, _canon, _ret, _code = I.select_canonical_offline(_r1, CONTACT_EMAIL)
case("rule 1: zero active -> no_active_control", _rule, I.SELECT_NO_ACTIVE_CONTROL)
case("rule 1: creates nothing", _ret, [])
case("rule 1: reports the code", _code, I.REVIEW_NO_ACTIVE_CONTROL)

# remediation uses the same active set as the runtime: a Deferred sibling is invisible
_r1b = [task("1600", Task_Sequence_Type="Email", Description=MARKER_WON_EMAIL),
        task("1601", Task_Sequence_Type="Call", Description=MARKER_WON_CALL, Status=I.RETIRED_STATUS)]
_rule, _canon, _ret, _code = I.select_canonical_offline(_r1b, CONTACT_EMAIL)
case("remediation ignores Deferred conflicts", _rule, I.SELECT_SINGLE)
case("remediation keeps the sole active control", _canon["id"], "1600")


# ================================================================================
# 6. runtime and offline agree wherever their inputs overlap
# ================================================================================

OVERLAP = [
    [],
    [task("2000")],
    [task("2001"), task("2002")],
    _all_retired,
    _r6a,
    _r6b,
    [task("2100"), task("2101", Task_Sequence_Type="Email")],
    [task("2200"), task("2201", Status=I.RETIRED_STATUS)],
]

_disagreements = []
for _set in OVERLAP:
    _rk = I.control_state(_set)[0]
    _sr = I.select_canonical_offline(_set, CONTACT_BLANK)[0]
    runtime_refuses = _rk in (I.AMBIGUOUS, I.NO_ACTIVE_CONTROL)
    offline_refuses = _sr in (I.SELECT_REFUSE, I.SELECT_NO_ACTIVE_CONTROL)
    # The runtime is allowed to be STRICTER (it refuses where offline may still choose
    # by preference), but it must never accept where offline refuses.
    if offline_refuses and not runtime_refuses:
        _disagreements.append((_set, _rk, _sr))
case("the runtime never accepts a set the offline rule refuses", _disagreements, [])

# Neither ever creates a Task where one already exists.
_create_violations = [
    _set for _set in OVERLAP if _set and I.should_create_new(_set)
]
case("no candidate set with any Task ever creates another", _create_violations, [])


def test_activation_identity_contract():
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
