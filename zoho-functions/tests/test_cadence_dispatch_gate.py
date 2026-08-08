"""Cadence dispatch gate contract tests (Changes 8, 9, 20, 21).

Run: python tests/test_cadence_dispatch_gate.py   (also collects under pytest)

The Manual-scoping rows carry the r3 correction: selecting Manual mid-cadence stops
NOTHING. Every remaining step of the already-running Stage cadence executes.

See tests/cadence_dispatch_gate_contract.py for why a green run here is not a statement
about production.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cadence_dispatch_gate_contract as G  # noqa: E402

CASES = []


def case(name, got, want):
    CASES.append((name, got, want))


def gate(seq_state="Running", activated_at="2026-08-01T10:00:00+01:00", seq_type="Email",
         current_stage="Marketing Consent", next_stage="Marketing Consent",
         deal_pipeline="B2B", is_activation_trigger=False):
    return dict(
        seq_state=seq_state, activated_at=activated_at, seq_type=seq_type,
        current_stage=current_stage, next_stage=next_stage,
        deal_pipeline=deal_pipeline, is_activation_trigger=is_activation_trigger,
    )


# ================================================================================
# 1. is_new_stage_entry is derived purely from next_stage != current_stage
# ================================================================================

case("same Stage is not a new entry", G.is_new_stage_entry("Demo Booking", "Demo Booking"), False)
case("different Stage is a new entry", G.is_new_stage_entry("Demo Booking", "Demo Hosted"), True)
case("a backward move is still a new entry", G.is_new_stage_entry("Onboarding", "Demo Booking"), True)

_derivation_violations = [
    (a, b)
    for a in G.STAGE_RANKS
    for b in G.STAGE_RANKS
    if G.is_new_stage_entry(a, b) != (a != b)
]
case("no branch can opt out of the is_new_stage_entry rule", _derivation_violations, [])


# ================================================================================
# 2. cadence_suppressed - the plan's table, row for row
# ================================================================================

case(
    "Manual, continuation callback (same Stage) -> NOT suppressed",
    G.cadence_suppressed(**gate(seq_type="Manual", current_stage="Marketing Consent", next_stage="Marketing Consent")),
    False,
)
case(
    "Manual, new Stage entry -> suppressed",
    G.cadence_suppressed(**gate(seq_type="Manual", current_stage="Marketing Consent", next_stage="Demo Booking")),
    True,
)
case("Email, activated, B2B -> not suppressed", G.cadence_suppressed(**gate(seq_type="Email")), False)
case("Call, activated, B2B -> not suppressed", G.cadence_suppressed(**gate(seq_type="Call")), False)

for _cur in G.STAGE_RANKS:
    for _nxt in G.STAGE_RANKS:
        case(
            "Email at %s->%s, B2B, activated -> not suppressed" % (_cur, _nxt),
            G.cadence_suppressed(**gate(seq_type="Email", current_stage=_cur, next_stage=_nxt)),
            False,
        )

case("Sequence_State Stopped -> suppressed", G.cadence_suppressed(**gate(seq_state="Stopped")), True)
case(
    "Sequence_State Stopped at any Stage -> suppressed",
    all(G.cadence_suppressed(**gate(seq_state="Stopped", current_stage=s, next_stage=s)) for s in G.STAGE_RANKS),
    True,
)
case("blank activated_at, not an activation trigger -> suppressed", G.cadence_suppressed(**gate(activated_at="")), True)
case(
    "blank activated_at IS allowed for an activation trigger",
    G.cadence_suppressed(**gate(activated_at="", is_activation_trigger=True)),
    False,
)

# --- Change 20: the standing Partnership gate ---
case(
    "Partnership with Email stored -> suppressed at the FIRST Stage",
    G.cadence_suppressed(**gate(seq_type="Email", deal_pipeline="Partnership")),
    True,
)
_partnership_leaks = [
    (c, n, t)
    for c in G.STAGE_RANKS
    for n in G.STAGE_RANKS
    for t in ("Email", "Call", "Manual")
    if not G.cadence_suppressed(**gate(seq_type=t, current_stage=c, next_stage=n, deal_pipeline="Partnership"))
]
case("Partnership dispatches NOTHING at EVERY Stage, for every stored type", _partnership_leaks, [])
case(
    "Partnership is suppressed even on an activation trigger",
    G.cadence_suppressed(**gate(deal_pipeline="Partnership", is_activation_trigger=True, activated_at="")),
    True,
)
case("a genuine Partnership block is silent", G.pipeline_review_code("Partnership"), None)

case("unresolved pipeline -> suppressed", G.cadence_suppressed(**gate(deal_pipeline="")), True)
case("unresolved pipeline -> raises a review", G.pipeline_review_code(""), G.REVIEW_PIPELINE_UNRESOLVED)
case("unresolved pipeline -> raises a review (literal)", G.pipeline_review_code("unresolved"), G.REVIEW_PIPELINE_UNRESOLVED)
case("B2B raises no review", G.pipeline_review_code("B2B"), None)
case("unresolved is never a silent B2B fallback", G.cadence_suppressed(**gate(deal_pipeline="unresolved")), True)


# ================================================================================
# 3. commercial_task_suppressed - create_task is NEVER suppressed
# ================================================================================

ROWS = [
    ("Manual continuation", gate(seq_type="Manual")),
    ("Manual new Stage entry", gate(seq_type="Manual", current_stage="Marketing Consent", next_stage="Proposal Preparation")),
    ("Email any Stage B2B activated", gate(seq_type="Email")),
    ("Sequence_State Stopped", gate(seq_state="Stopped")),
    ("activated_at blank", gate(activated_at="")),
    ("pipeline Partnership", gate(deal_pipeline="Partnership")),
    ("pipeline unresolved", gate(deal_pipeline="")),
]

for _name, _g in ROWS:
    case("create_task is NOT suppressed: %s" % _name, G.commercial_task_suppressed(**_g), False)
    case("action create_task is NOT suppressed: %s" % _name, G.action_suppressed("create_task", **_g), False)

# and the cadence actions ARE suppressed in exactly the rows where the gate says so
for _name, _g in ROWS:
    _want = G.cadence_suppressed(**_g)
    for _a in G.CADENCE_ACTIONS:
        case("action %s follows the cadence gate: %s" % (_a, _name), G.action_suppressed(_a, **_g), _want)

# --- Change 8b's classification table ---
_g_off = gate(seq_state="Stopped")
for _k in G.CADENCE_EMAIL_KINDS:
    case("cadence email kind %r is suppressed when the gate is off" % _k, G.email_suppressed(_k, **_g_off), True)
for _k in G.TRANSACTIONAL_EMAIL_KINDS:
    case("transactional email kind %r is NEVER suppressed" % _k, G.email_suppressed(_k, **_g_off), False)

# AC-5b: at Proposal Preparation a Manual Contact still gets Draft Commercials.
_ac5b = gate(seq_type="Manual", current_stage="Demo Hosted", next_stage="Proposal Preparation")
case("AC-5b cadence is suppressed at the new Stage", G.cadence_suppressed(**_ac5b), True)
case("AC-5b Draft Commercials IS still created", G.commercial_task_suppressed(**_ac5b), False)


# ================================================================================
# 4. Change 9 - Manual sticks, but only from the boundary
# ================================================================================

case(
    "Manual mid-cadence keeps Sequence_State Running",
    G.next_sequence_state("Manual", "Marketing Consent", "Marketing Consent", False),
    "Running",
)
case(
    "Manual at a new Stage entry flips to Stopped",
    G.next_sequence_state("Manual", "Marketing Consent", "Demo Booking", False),
    "Stopped",
)
case(
    "Manual on an activation trigger keeps its own path",
    G.next_sequence_state("Manual", "Marketing Consent", "Demo Booking", True),
    "Running",
)
case("Email at a new Stage stays Running", G.next_sequence_state("Email", "Marketing Consent", "Demo Booking", False), "Running")
case("Call at a new Stage stays Running", G.next_sequence_state("Call", "Marketing Consent", "Demo Booking", False), "Running")


# ================================================================================
# 5. Change 21 - establishes_activation_at_entry
# ================================================================================


def est(activated_at="", seq_state="Not Activated", seq_type="Email", marker=("Won", "Email"),
        current_stage="Marketing Consent", next_stage="Demo Booking", contact_eligible=True,
        is_activation_trigger=False):
    return G.establishes_activation_at_entry(
        activated_at, seq_state, seq_type, marker, current_stage, next_stage,
        contact_eligible, is_activation_trigger,
    )


case("blank, Not Activated, Email, (Won,Email), new cadence Stage, eligible -> True", est(), True)
case("same but next_stage == current_stage -> False", est(next_stage="Marketing Consent"), False)
case("same but next_stage is a task-Stage -> False", est(next_stage="Proposal Preparation"), False)
case("same but next_stage is Onboarding -> False", est(next_stage="Onboarding"), False)
case("same but next_stage is Demo Confirmation -> False", est(next_stage="Demo Confirmation"), False)
case("same but Sequence_State Stopped -> False", est(seq_state="Stopped"), False)
case("same but Sequence_State Running -> False", est(seq_state="Running"), False)
case("same but Sequence_State Complete -> False", est(seq_state="Complete"), False)
case("same but marker is (Lost, Email) -> False", est(marker=("Lost", "Email")), False)
case("same but marker is (Open, Email) -> False", est(marker=("Open", "Email")), False)
case("same but marker type != seq_type -> False", est(marker=("Won", "Call")), False)
case("same but no marker -> False", est(marker=None), False)
case("same but contact_eligible False -> False", est(contact_eligible=False), False)
case("activated_at already stamped -> False (never re-stamped)", est(activated_at="2026-08-01T10:00:00+01:00"), False)
case("an activation trigger stamps by its own path -> False here", est(is_activation_trigger=True), False)
case("blank seq_type -> False", est(seq_type=""), False)
case("invalid seq_type -> False", est(seq_type="Telepathy", marker=("Won", "Telepathy")), False)

# every cadence Stage may establish; no other Stage may
for _s in G.STAGE_RANKS:
    _want = _s in G.CADENCE_STAGES and _s != "Marketing Consent"
    case("establish at %s" % _s, est(next_stage=_s), _want)

# Manual is a valid committed type and may establish - it just dispatches nothing.
case("Manual can establish activation", est(seq_type="Manual", marker=("Won", "Manual")), True)
case(
    "...but dispatches nothing at that Stage",
    G.cadence_suppressed(**gate(seq_type="Manual", activated_at="now", current_stage="Marketing Consent", next_stage="Demo Booking")),
    True,
)

# AC-9d - a disabled control never auto-activates at a Stage boundary
case("AC-9d (Lost, Call) marker establishes nothing", est(seq_type="Call", marker=("Lost", "Call")), False)

# AC-9c - the never-activated run stamps HERE, at this Stage
case("AC-9c never-activated + (Won, Call) at a new cadence Stage establishes", est(seq_type="Call", marker=("Won", "Call")), True)
case(
    "AC-9c the interrupted Stage is never the one activated",
    est(seq_type="Call", marker=("Won", "Call"), current_stage="Demo Booking", next_stage="Demo Booking"),
    False,
)


# ================================================================================
# 6. The clamp must preserve the committed preference
# ================================================================================

for _t in ("Email", "Call", "Manual"):
    _c = G.apply_not_activated_clamp("Running", _t, "Email", "3")
    case("clamp preserves Sequence_Type %s" % _t, _c["Sequence_Type"], _t)
    case("clamp still holds Not Activated (%s)" % _t, _c["Sequence_State"], "Not Activated")
    case("clamp clears Sequence_Stage (%s)" % _t, _c["Sequence_Stage"], "None")
    case("clamp clears Sequence_Step (%s)" % _t, _c["Sequence_Step"], "None")
    case("Stop/Complete preserves Sequence_Type %s" % _t, G.clear_sequence_type_on_stop_or_complete(_t), _t)

# The r5 clamp would have erased the very preference Change 21 depends on.
_clamped = G.apply_not_activated_clamp("Running", "Call", "Call", "2")
case(
    "a clamped Contact can still establish at the next Stage",
    G.establishes_activation_at_entry(
        "", _clamped["Sequence_State"], _clamped["Sequence_Type"], ("Won", "Call"),
        "Marketing Consent", "Demo Booking", True, False,
    ),
    True,
)


def test_cadence_dispatch_gate_contract():
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
