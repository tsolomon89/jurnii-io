#!/usr/bin/env python
"""Offline structural checks for the v6 Deluge sources.

Deluge has no local compiler, so this is the only pre-publication syntax gate that
exists. It is deliberately conservative: it reports what it can prove from the token
stream and nothing else.

Checks
  1. brace / paren / bracket balance, string- and comment-aware
  2. the function signature line is present and the file's declared name matches its
     filename (allowing the `_util_` prefix convention)
  3. no tab/space mixing inside leading indentation on a single line
  4. no unbalanced double quote on a logical line
  5. `automation.<fn>(` call targets all resolve to a file in the tree
  6. no `//` comment mid-expression -- inside a list/map literal or an unclosed argument
     list. Deluge rejects the ENTIRE function for one of these ("no viable alternative at
     input"), so it fails the publish with nothing to point at.
  7. no relational operator (`>` `<` `>=` `<=`) between two values provably TEXT. Deluge
     has none ("Operator > is not valid for TEXT expression"); compare timestamps by
     folding them to yyyyMMddHHmmss numbers, as processDeal and handleTaskCompletion do.

Checks 6 and 7 exist because both classes reached a publish attempt on 2026-09-04 with the
gate reporting clean.

Usage:
    python deluge-syntax-check.py [root]
Exit code 0 = all clear, 1 = at least one error.
"""
import io
import os
import re
import sys

SIG = re.compile(r'^\s*(void|string|bool|int|long|map|list)\s+automation\.([A-Za-z0-9_]+)\s*\(')
CALL = re.compile(r'automation\.([A-Za-z0-9_]+)\s*\(')

# A bare `name = <expr>;` assignment, used only to decide whether a name holds TEXT.
ASSIGN = re.compile(r'^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?);\s*$')
# `a > b` / `a <= b` between two BARE identifiers. Anything with a method call, index or
# literal on either side is left alone -- this check trades reach for zero false positives.
RELOP = re.compile(r'(?<![\w.])([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|>|<)\s*([A-Za-z_][A-Za-z0-9_]*)(?![\w.(])')
# Casts that make an expression numeric regardless of what it started as.
NUMERIC_CAST = re.compile(r'\.to(Long|Decimal|Number|Double|Float)\s*\(')


def strip_comment(line):
    """Drop a trailing // comment but KEEP string literals, which carry the type signal."""
    i = 0
    in_str = False
    n = len(line)
    while i < n:
        c = line[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == '"':
                in_str = False
        elif c == '"':
            in_str = True
        elif c == '/' and i + 1 < n and line[i + 1] == '/':
            return line[:i]
        i += 1
    return line


def text_typed(expr, known):
    """True when this right-hand side can only have produced a TEXT value."""
    expr = expr.strip()
    if NUMERIC_CAST.search(expr):
        return False
    if expr in known:                      # copied from a name already known to be TEXT
        return True
    if expr.startswith('"') and expr.endswith('"'):
        return True
    if expr.endswith('.toString()'):
        return True
    return expr.endswith('.trim()') and '.toString()' in expr


def strip_noise(line):
    """Remove string literals and line comments, respecting escapes."""
    out = []
    i = 0
    in_str = False
    n = len(line)
    while i < n:
        c = line[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            i += 1
            continue
        if c == '/' and i + 1 < n and line[i + 1] == '/':
            break
        out.append(c)
        i += 1
    return ''.join(out), in_str


def check_file(path, known_fns):
    errors = []
    warnings = []
    src = io.open(path, encoding='utf-8').read()
    lines = src.split('\n')

    depth = {'{': 0, '(': 0, '[': 0}
    pair = {'}': '{', ')': '(', ']': '['}
    in_block_comment = False
    declared = None
    # Deluge's parser rejects a `//` line that sits mid-expression -- between the braces of
    # a list/map literal, or inside an unclosed argument list. It reports the whole function
    # as malformed ("no viable alternative at input"), so the gate has to catch it here.
    lit_brace = []      # line numbers of `{` opened in expression position
    prev_sig = ''       # last significant code character seen, across lines
    text_vars = {}      # name -> line it was last assigned a TEXT value

    for idx, raw in enumerate(lines, 1):
        line = raw

        # block comments are not used in this codebase, but tolerate them
        if in_block_comment:
            if '*/' in line:
                line = line.split('*/', 1)[1]
                in_block_comment = False
            else:
                continue
        if '/*' in line:
            before, after = line.split('/*', 1)
            if '*/' in after:
                line = before + after.split('*/', 1)[1]
            else:
                line = before
                in_block_comment = True

        m = SIG.match(raw)
        if m and declared is None:
            declared = m.group(2)

        code, unterminated = strip_noise(line)
        if unterminated:
            errors.append('%s:%d: unterminated string literal' % (path, idx))

        if line.lstrip().startswith('//') and not code.strip():
            if depth['('] > 0:
                errors.append('%s:%d: comment inside an unclosed argument list (opened earlier);'
                              ' Deluge rejects the whole function' % (path, idx))
            else:
                open_lit = [b for b in lit_brace if b is not None]
                if open_lit:
                    errors.append('%s:%d: comment inside the list/map literal opened on line %d;'
                                  ' Deluge rejects the whole function'
                                  % (path, idx, open_lit[-1]))

        for c in code:
            if c in depth:
                if c == '{':
                    # expression position => a literal, not a statement block
                    lit_brace.append(idx if prev_sig in '=,(:[' else None)
                depth[c] += 1
            elif c in pair:
                if c == '}' and lit_brace:
                    lit_brace.pop()
                depth[pair[c]] -= 1
                if depth[pair[c]] < 0:
                    errors.append('%s:%d: unbalanced closing %r' % (path, idx, c))
                    depth[pair[c]] = 0
            if not c.isspace():
                prev_sig = c

        am = ASSIGN.match(strip_comment(line))
        if am:
            if text_typed(am.group(2), text_vars):
                text_vars[am.group(1)] = idx
            else:
                text_vars.pop(am.group(1), None)

        for rm in RELOP.finditer(code):
            lhs, op, rhs = rm.group(1), rm.group(2), rm.group(3)
            if lhs in text_vars and rhs in text_vars:
                errors.append('%s:%d: `%s %s %s` compares two TEXT values; Deluge has no'
                              ' relational operator for TEXT (assigned on lines %d and %d)'
                              % (path, idx, lhs, op, rhs, text_vars[lhs], text_vars[rhs]))

        indent = re.match(r'^[\t ]*', raw).group(0)
        if '\t' in indent and ' ' in indent:
            warnings.append('%s:%d: mixed tab/space indentation' % (path, idx))

        for cm in CALL.finditer(code):
            target = cm.group(1)
            if target not in known_fns:
                errors.append('%s:%d: calls automation.%s() which has no file in the tree'
                              % (path, idx, target))

    for ch, d in depth.items():
        if d != 0:
            errors.append('%s: %d unclosed %r at end of file' % (path, d, ch))

    base = os.path.basename(path)[:-len('.deluge')]
    expect = base[len('_util_'):] if base.startswith('_util_') else base
    if declared is None:
        errors.append('%s: no `<type> automation.<name>(` signature line found' % path)
    elif declared != expect:
        errors.append('%s: declares automation.%s but filename implies %s'
                      % (path, declared, expect))

    return errors, warnings


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'v6')
    root = os.path.abspath(root)
    files = []
    for dirpath, _dirnames, filenames in os.walk(root):
        for fn in sorted(filenames):
            if fn.endswith('.deluge'):
                files.append(os.path.join(dirpath, fn))

    known = set()
    for f in files:
        b = os.path.basename(f)[:-len('.deluge')]
        known.add(b[len('_util_'):] if b.startswith('_util_') else b)

    all_errors = []
    all_warnings = []
    for f in sorted(files):
        e, w = check_file(f, known)
        all_errors.extend(e)
        all_warnings.extend(w)

    for w in all_warnings:
        print('WARN  ' + w)
    for e in all_errors:
        print('ERROR ' + e)

    print('\n%d files checked, %d errors, %d warnings'
          % (len(files), len(all_errors), len(all_warnings)))
    return 1 if all_errors else 0


if __name__ == '__main__':
    sys.exit(main())
