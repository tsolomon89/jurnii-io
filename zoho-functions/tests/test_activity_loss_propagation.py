"""Loss-propagation contract tests (Changes 16 and 19).

Run: python tests/test_activity_loss_propagation.py   (also collects under pytest)

The rule is one rule, so it is asserted for ALL THREE activity handlers and for EVERY
action the loss matrix can return - contact_lost included, No Response on an exhausted
sequence included. Leaving handleCallOutcome out would mean a Lost Call could still
close a Contact while a Lost Meeting or Task could not.

See tests/activity_loss_propagation_contract.py for why a green run here is not a
statement about production.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import activity_loss_propagation_contract as L  # noqa: E402

CASES = []


def case(name, got, want):
    CASES.append((name, got, want))


# ================================================================================
# 1. No activity Lost propagates - every handler x every action
# ================================================================================

for _h in L.ACTIVITY_HANDLERS:
    for _a in L.LOSS_ACTIONS:
        case("%s / %s does NOT propagate to the Contact" % (_h, _a), L.propagates_to_contact(_h, _a), False)
        case("%s / %s does NOT propagate to the Deal" % (_h, _a), L.propagates_to_deal(_h, _a), False)
        case("%s / %s writes no Deal field" % (_h, _a), L.deal_fields_written(_h, _a), set())

# contact_lost is the case that used to propagate. It is now a referral.
for _h in L.ACTIVITY_HANDLERS:
    case("%s contact_lost -> referral" % _h, L.referral_for(_h, "contact_lost"), L.REVIEW_ACTIVITY_LOSS)
    case("%s contact_lost -> Contact untouched" % _h, L.propagates_to_contact(_h, "contact_lost"), False)
    case("%s contact_lost -> Deal untouched" % _h, L.propagates_to_deal(_h, "contact_lost"), False)

# The specific live scenario: No Response on an exhausted sequence.
for _h in L.ACTIVITY_HANDLERS:
    case(
        "%s Lost with No Response on an exhausted sequence does NOT mark the Contact Lost" % _h,
        L.propagates_to_contact(_h, "contact_lost"),
        False,
    )

# Every canonical Lost Reason, on every handler, changes nothing above the activity.
for _h in L.ACTIVITY_HANDLERS:
    for _r in L.CANONICAL_LOST_REASONS:
        case("%s Lost (%s) -> Contact untouched" % (_h, _r), L.propagates_to_contact(_h, "contact_lost"), False)
        case("%s Lost (%s) -> Deal untouched" % (_h, _r), L.deal_fields_written(_h, "contact_lost"), set())

# handleCallOutcome specifically - the handler that would otherwise be inconsistent.
case("a Lost Call cannot close a Contact", L.propagates_to_contact("Call", "contact_lost"), False)
case("a Lost Call cannot close a Deal", L.propagates_to_deal("Call", "contact_lost"), False)
case(
    "Call, Task and Meeting agree",
    len({L.propagates_to_contact(h, "contact_lost") for h in L.ACTIVITY_HANDLERS}),
    1,
)


# ================================================================================
# 2. An explicit Contact-level loss writes the Contact and NO Deal field
# ================================================================================

case("explicit Contact loss DOES write the Contact", L.propagates_to_contact(L.CONTACT_LOSS_COMMAND, "contact_lost"), True)
case("explicit Contact loss does NOT close the Deal", L.propagates_to_deal(L.CONTACT_LOSS_COMMAND, "contact_lost"), False)
case(
    "explicit Contact loss writes exactly State and Status",
    L.contact_loss_writes(False),
    {"Contact.State": "Lost", "Contact.Status": "Closed"},
)
case("explicit Contact loss writes no Deal field", L.deal_fields_written(L.CONTACT_LOSS_COMMAND, "contact_lost"), set())


# ================================================================================
# 3. Change 19 - CL-1: no other open Contact -> referral, not closure
# ================================================================================

_code, _writes = L.contact_loss_deal_outcome(other_open_contact_exists=False)
case("CL-1 raises [deal_has_no_viable_contact]", _code, L.REVIEW_DEAL_NO_VIABLE_CONTACT)
case("CL-1 writes NO Deal field", _writes, {})
case("CL-1 does not write Opportunity_State", "Opportunity_State" in _writes, False)
case("CL-1 does not write Opportunity_Status", "Opportunity_Status" in _writes, False)
case("CL-1 does not write Lost_Reasons", "Lost_Reasons" in _writes, False)

_code2, _writes2 = L.contact_loss_deal_outcome(other_open_contact_exists=True)
case("another open Contact -> no review", _code2, None)
case("another open Contact -> still no Deal write", _writes2, {})


# ================================================================================
# 4. The consequence stated plainly: no activity- and no Contact-driven path
#    closes a Deal.
# ================================================================================

_deal_closures = []
for _h in list(L.ACTIVITY_HANDLERS) + [L.CONTACT_LOSS_COMMAND]:
    for _a in L.LOSS_ACTIONS:
        if L.propagates_to_deal(_h, _a) or L.deal_fields_written(_h, _a):
            _deal_closures.append((_h, _a))
for _other in (True, False):
    if L.contact_loss_deal_outcome(_other)[1]:
        _deal_closures.append(("contact_loss_viability", _other))

case("NO path in this contract closes a Deal", _deal_closures, [])


def test_activity_loss_propagation_contract():
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
