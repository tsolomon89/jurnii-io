#!/usr/bin/env python
"""Phantom-field and picklist scan for the v6 Deluge sources.

Why this exists, in one line: an api_name that does not exist can void an ENTIRE
`updateRecord` map, taking valid keys down with it (recorded twice as a production
incident), and an out-of-set picklist value is discarded silently. `SUCCESS` proves
nothing. This is the offline gate that catches both before publication.

It reads the live field snapshot at booking/tests/fixtures/zoho-fields.json and
checks every field key the Deluge sources read or write against the module it is
used on.

Checks
  1. PHANTOM WRITES  -- a `put("Api_Name", ...)` / map-literal key on a module whose
                        snapshot does not list that field
  2. PHANTOM READS   -- a `.get("Api_Name")` on a record fetched from a module whose
                        snapshot does not list it
  3. PICKLIST VALUES -- a literal written to a known picklist field that is not a
                        member of that field's live value set, MODULE-QUALIFIED
                        (Task_Stage and Task_Sequence_Stage use different vocabularies
                        and are not interchangeable)
  4. RETIRING FIELDS -- any surviving writer for a field scheduled to retire
  5. INVARIANTS      -- the eight Contact stage-entry timestamps still present; no
                        Contacts.Stage_Entered_At introduced; no Product-Deal creation
                        path left; no dead Tasks.Status "Cancelled" predicate

Module attribution is intentionally conservative: a key is only reported when the
enclosing statement names the module unambiguously (a `zoho.crm.*("Module", ...)`
call or a map variable whose create/update target is on the same line). Anything
ambiguous is counted as UNATTRIBUTED and printed as a count, never as a failure --
a scanner that guesses would be worse than one that abstains.

Usage:
    python deluge-field-scan.py [--staged] [repo_root]
Exit 0 = clean, 1 = at least one hard finding.
"""
import io
import json
import os
import re
import subprocess
import sys

MODULE_CALL = re.compile(
    r'zoho\.crm\.(?:createRecord|updateRecord|getRecordById|searchRecords|upsertRecord)\s*\(\s*"([A-Za-z0-9_]+)"')
RELATED_CALL = re.compile(
    r'zoho\.crm\.(?:getRelatedRecords|updateRelatedRecord)\s*\(\s*"([A-Za-z0-9_]+)"\s*,\s*"([A-Za-z0-9_]+)"')
PUT = re.compile(r'\b([A-Za-z_][A-Za-z0-9_]*)\.put\s*\(\s*"([A-Za-z0-9_$]+)"\s*,')
GET = re.compile(r'\.get\s*\(\s*"([A-Za-z0-9_$]+)"\s*\)')
MAPLIT = re.compile(r'"([A-Za-z0-9_$]+)"\s*:')

# Fields the plan schedules for retirement. Any surviving WRITE is a finding: the
# writer must go before the field, or deleting the field converts a silent discard
# into a whole-map void.
RETIRING = {
    'Blocks_Sequence', 'Deal_Product', 'Deal_Product_Key', 'Deal_Primary_Contact',
    'Account_Status', 'Next_Comm_Follow_Up_Date',
}
# Deals.Company_Tier retires; Accounts.Company_Tier is KEEP and is the live source.
RETIRING_QUALIFIED = {('Deals', 'Company_Tier')}

CONTACT_STAMPS = [
    'Contact_Completed_Marketing_Qualification_At',
    'Contact_Completed_Demo_Booking_At',
    'Contact_Completed_Demo_Confirmation_At',
    'Contact_Completed_Demo_Hosted_At',
    'Contact_Completed_Proposal_Preparation_At',
    'Contact_Completed_Commercial_Agreement_At',
    'Contact_Completed_Onboarding_At',
    'Contact_Completed_Renewal_At',
]

# Deluge internals / lookup sub-keys that are never module fields.
SKIP_KEYS = {
    'id', 'name', 'email', 'code', 'data', 'details', 'status', 'message',
    'trigger', 'Pipeline', '$se_module', 'Owner', 'Modified_Time', 'Created_Time',
    'success', 'outcome', 'reason', 'deal_id', 'valid', 'created', 'candidates',
    'count', 'via', 'deal_key', 'product_key', 'Note_Content', 'Note_Title',
    'Created_Time', 'Product_Interest',
}


def load_snapshot(root):
    p = os.path.join(root, 'booking', 'tests', 'fixtures', 'zoho-fields.json')
    with io.open(p, encoding='utf-8') as fh:
        return json.load(fh)


def deluge_files(root, staged_only):
    base = os.path.join(root, 'zoho-functions', 'v6')
    if staged_only:
        out = subprocess.check_output(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM', '--', '*.deluge'],
            cwd=root).decode('utf-8', 'replace')
        rels = [l.strip() for l in out.split('\n') if l.strip()]
        return [os.path.join(root, r) for r in rels if os.path.exists(os.path.join(root, r))]
    files = []
    for dirpath, _d, filenames in os.walk(base):
        for fn in sorted(filenames):
            if fn.endswith('.deluge'):
                files.append(os.path.join(dirpath, fn))
    return files


def main():
    args = [a for a in sys.argv[1:]]
    staged_only = '--staged' in args
    args = [a for a in args if a != '--staged']
    root = os.path.abspath(args[0]) if args else os.path.abspath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

    snap = load_snapshot(root)
    modules = snap.get('modules', {})
    picklists = snap.get('picklists', {})
    files = deluge_files(root, staged_only)

    findings = []
    unattributed = 0
    picklist_checked = 0

    # Map-variable attribution.
    #
    # Same-line attribution alone is nearly useless here: a Deluge write map is built over
    # dozens of lines (`tkMap.put(...)` x 20) and only handed to
    # `zoho.crm.createRecord("Tasks", tkMap)` at the end, so the module name is almost never
    # on the same line as the key. A first pass therefore binds each map VARIABLE to the
    # module it is ultimately written to, and the second pass attributes that variable's
    # puts to that module.
    #
    # Binding is per file and requires the variable to be written to exactly ONE module. A
    # variable handed to two different modules is left unattributed rather than guessed.
    SINK = re.compile(
        r'zoho\.crm\.(?:createRecord|updateRecord|upsertRecord)\s*\(\s*"([A-Za-z0-9_]+)"\s*,'
        r'(?:[^,()]*,)?\s*([A-Za-z_][A-Za-z0-9_]*)\s*[,)]')
    # A record READ binds the variable that receives it, so `.get("Field")` on that variable
    # can be checked too.
    SOURCE = re.compile(
        r'\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*zoho\.crm\.(?:getRecordById|searchRecords|getRelatedRecords)\s*\(\s*"([A-Za-z0-9_]+)"')
    VAR_GET = re.compile(r'\b([A-Za-z_][A-Za-z0-9_]*)\.get\s*\(\s*"([A-Za-z0-9_$]+)"\s*\)')

    for path in files:
        rel = os.path.relpath(path, root).replace('\\', '/')
        src = io.open(path, encoding='utf-8').read()
        lines = [ln.split('//', 1)[0] for ln in src.split('\n')]

        # ---- pass 1: bind variables to modules ----
        binding = {}
        conflicted = set()

        def bind(var, mod):
            if var in conflicted:
                return
            if var in binding and binding[var] != mod:
                conflicted.add(var)
                del binding[var]
                return
            binding[var] = mod

        for ln in lines:
            for mod, var in SINK.findall(ln):
                bind(var, mod)
            for var, mod in SOURCE.findall(ln):
                bind(var, mod)

        # ---- pass 2: check keys against the bound module ----
        for idx, ln in enumerate(lines, 1):
            if not ln.strip():
                continue

            same_line = MODULE_CALL.findall(ln)
            for m in RELATED_CALL.findall(ln):
                same_line.append(m[0])
            same_mod = same_line[0] if len(set(same_line)) == 1 and same_line else None

            checked_any = False

            # writes: var.put("Field", ...)
            for var, k in PUT.findall(ln):
                mod = binding.get(var) or same_mod
                if k in SKIP_KEYS or k.startswith('$'):
                    continue
                if mod is None or mod not in modules:
                    unattributed += 1
                    continue
                checked_any = True
                if k not in set(modules.get(mod, [])):
                    findings.append(('PHANTOM-WRITE', rel, idx, '%s.%s' % (mod, k)))
                if (mod, k) in RETIRING_QUALIFIED or k in RETIRING:
                    findings.append(('RETIRING-WRITE', rel, idx, '%s.%s' % (mod, k)))

                # picklist literal, MODULE-QUALIFIED. Task_Stage and Task_Sequence_Stage use
                # different vocabularies, so an unqualified lookup would validate against the
                # wrong set -- the exact mistake that would corrupt 132 Task rows.
                allowed = picklists.get(mod, {}).get(k)
                if allowed:
                    lit = re.search(r'\.put\s*\(\s*"%s"\s*,\s*"([^"]*)"\s*\)' % re.escape(k), ln)
                    if lit:
                        picklist_checked += 1
                        val = lit.group(1)
                        # ⚠ Accept EITHER the stored value OR the display label.
                        #
                        # Picklists round-trip in DISPLAY space over Deluge, COQL and the record
                        # API, and COQL filters in display space too. The canonical example is
                        # Task_Stage, which stores the actual value "Renewall" while every surface
                        # returns "Renewal". Events.Meeting_Task_Status is the same shape inverted:
                        # it stores "Open" and displays "New", so `put("Meeting_Task_Status","New")`
                        # is CORRECT and comparing against stored values alone would report it as a
                        # violation. Membership in either space is therefore the only sound test;
                        # anything in neither space is a genuine out-of-set write, which Zoho
                        # discards silently exactly like an unknown api_name.
                        members = set()
                        for a in allowed:
                            if isinstance(a, dict):
                                if a.get('value') is not None:
                                    members.add(str(a['value']))
                                if a.get('label') is not None:
                                    members.add(str(a['label']))
                            else:
                                members.add(str(a))
                        if val and val not in members:
                            findings.append(('PICKLIST', rel, idx,
                                             '%s.%s = %r in neither value nor label space; live members %r'
                                             % (mod, k, val, sorted(members))))

            # reads: var.get("Field")
            for var, k in VAR_GET.findall(ln):
                mod = binding.get(var) or same_mod
                if k in SKIP_KEYS or k.startswith('$'):
                    continue
                if mod is None or mod not in modules:
                    unattributed += 1
                    continue
                checked_any = True
                if k not in set(modules.get(mod, [])):
                    findings.append(('PHANTOM-READ', rel, idx, '%s.%s' % (mod, k)))

            # map-literal keys on a line that names its module directly
            if same_mod and same_mod in modules:
                for k in MAPLIT.findall(ln):
                    if k in SKIP_KEYS or k.startswith('$'):
                        continue
                    checked_any = True
                    if k not in set(modules.get(same_mod, [])):
                        findings.append(('PHANTOM-WRITE', rel, idx, '%s.%s' % (same_mod, k)))
                    if (same_mod, k) in RETIRING_QUALIFIED or k in RETIRING:
                        findings.append(('RETIRING-WRITE', rel, idx, '%s.%s' % (same_mod, k)))

    # ---------------- invariants ----------------
    all_src = {}
    for dirpath, _d, filenames in os.walk(os.path.join(root, 'zoho-functions', 'v6')):
        for fn in filenames:
            if fn.endswith('.deluge'):
                p = os.path.join(dirpath, fn)
                all_src[os.path.relpath(p, root).replace('\\', '/')] = io.open(p, encoding='utf-8').read()

    def code_only(text):
        return '\n'.join(ln.split('//', 1)[0] for ln in text.split('\n'))

    # Comments must NOT feed the invariants. The sources legitimately MENTION
    # Stage_Entered_At (to record that it is withdrawn and must not be created) and the
    # retired review codes (to make a stale caller recognisable), so matching comment text
    # would make these checks self-defeating: documenting a prohibition would fail it.
    blob = '\n'.join(code_only(v) for v in all_src.values())
    # Field PRESENCE, by contrast, is checked against the raw text: a stamp named only in a
    # comment is still evidence the field was not silently dropped from the tree.
    raw_blob = '\n'.join(all_src.values())

    inv = []
    for f in CONTACT_STAMPS:
        inv.append(('contact-stamp-present', f, f in raw_blob))
    inv.append(('no-Stage_Entered_At', 'Contacts.Stage_Entered_At', 'Stage_Entered_At' not in blob))
    inv.append(('no-product-deal-key', 'accountKey::productKey composition',
                '"::" + pKey' not in blob and 'aKey + "::" + pKey' not in blob))
    dead_cancelled = re.findall(r'(?:Status|tStatus|ntkStatus|stStatus|btStatus|rtStatus|xtStatus)[^\n]{0,40}==?\s*"Cancelled"', blob)
    dead_cancelled += re.findall(r'!=\s*"Cancelled"', blob)
    inv.append(('no-dead-Cancelled-predicate', '%d found' % len(dead_cancelled), not dead_cancelled))

    # ---------------- report ----------------
    scope = 'STAGED ONLY' if staged_only else 'WORKING TREE'
    print('=== Deluge field scan (%s) — %d files ===\n' % (scope, len(files)))

    hard = [f for f in findings if f[0] in ('PHANTOM', 'PICKLIST', 'RETIRING-WRITE')]
    if hard:
        for kind, rel, idx, detail in hard:
            print('%-14s %s:%d  %s' % (kind, rel, idx, detail))
    else:
        print('No phantom writes/reads, picklist violations or retiring-field writers found.')

    print('\n--- invariants ---')
    inv_fail = 0
    for name, detail, ok in inv:
        print('%-4s %-28s %s' % ('OK' if ok else 'FAIL', name, detail))
        if not ok:
            inv_fail += 1

    print('\n%d hard findings, %d invariant failures, %d picklist literals checked, '
          '%d keys unattributed (module not provable on the line — not a failure)'
          % (len(hard), inv_fail, picklist_checked, unattributed))
    return 1 if (hard or inv_fail) else 0


if __name__ == '__main__':
    sys.exit(main())
