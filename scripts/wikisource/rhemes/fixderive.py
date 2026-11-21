"""Propose ledger entries from the difference between two versions of A16049.xml.

    rh.py fix propose-diff xml REV_A REV_B --out DIR [--repo XML_REPO]

REV_A and REV_B are commits of the XML repo (default: the repo holding sources.xml_path()).
Writes DIR/<book>.jsonl, one proposal file per book that changed; never writes the ledger.
Use it to record a hand edit of the XML: review the proposals, append them to fixes/<book>.jsonl.

Per book span (xmlspan): a line diff, then a character diff inside each changed block gives
minimal edits; edits closer than 40 characters merge; each edit widens to whole words, then a
word at a time on both sides, until old is unique in the text as it stands when the entry is
applied (entries apply in document order), new is unique in the after-text, old does not occur
in the after-text, and old is not inside new. Evidence: every commit in REV_A..REV_B where the
count of old or new in the book's span changes (git's pickaxe, computed here).
"""
import difflib
import re
import subprocess
import sys
from pathlib import Path

from . import fidelity, fixes, paths, sources, xmlspan

MERGE = 40
MAX_WIDEN = 400
ALLOW_NOTE = 'historical audit commit, owner-approved 2026-11-19'
_CHAP = re.compile(r'<div n="(\d+)" type="chapter"')
_VERSE = re.compile(r'<seg type="milestoneunit">verse </seg>\s*(\d+)')
_BOOKDIV = re.compile(r'<div n="[^"]*" type="(?:gospel|book|epistle|prophecy|apocalypse)"')


def _edits(x, y):
    """[(i1, i2, j1, j2)] minimal edits turning x into y, merged when closer than MERGE."""
    xl, yl = x.splitlines(True), y.splitlines(True)
    xo, yo = [0], [0]
    for s in xl:
        xo.append(xo[-1] + len(s))
    for s in yl:
        yo.append(yo[-1] + len(s))
    out = []
    for tag, a1, a2, b1, b2 in difflib.SequenceMatcher(None, xl, yl, autojunk=False).get_opcodes():
        if tag == 'equal':
            continue
        i0, j0 = xo[a1], yo[b1]
        xa, ya = x[i0:xo[a2]], y[j0:yo[b2]]
        for t, c1, c2, d1, d2 in difflib.SequenceMatcher(None, xa, ya, autojunk=False).get_opcodes():
            if t != 'equal':
                out.append([i0 + c1, i0 + c2, j0 + d1, j0 + d2])
    merged = []
    for e in out:
        if merged and e[0] - merged[-1][1] < MERGE:
            merged[-1][1], merged[-1][3] = e[1], e[3]
        else:
            merged.append(e)
    return merged


def _left(text, pos, word):
    """Start of the whitespace-bounded word left of pos (word=True: one more word)."""
    p = pos
    if word:
        while p > 0 and text[p - 1].isspace():
            p -= 1
    while p > 0 and not text[p - 1].isspace():
        p -= 1
    return p


def _right(text, pos, word):
    p = pos
    if word:
        while p < len(text) and text[p].isspace():
            p += 1
    while p < len(text) and not text[p].isspace():
        p += 1
    return p


def _loc(book, y, pos):
    """'<book> C:V', '<book> arg', or '<book> <section type>' for the place pos in the after-span y."""
    divs = xmlspan._top_divs(y, 0, len(y))
    sec = None
    for off, at in divs:
        if off <= pos:
            sec = at
    if sec is None:
        return f'{book} head' if book in ('front', 'back') else f'{book} arg'
    t = sec.get('type', '')
    if t == 'argument':
        return f'{book} arg'
    if 'n' in sec and _BOOKDIV.match(f'<div n="{sec["n"]}" type="{t}"'):
        start = max(off for off, _ in divs if off <= pos)
        head = y[start:pos]
        chs = list(_CHAP.finditer(head))
        if not chs:
            return f'{book} head'
        vs = list(_VERSE.finditer(head, chs[-1].end()))
        return f'{book} {chs[-1].group(1)}:{vs[-1].group(1) if vs else 0}'
    return f'{book} {t or "section"}'


def _slug(rest):
    return re.sub(r'[^a-z0-9]+', '-', rest.lower()).strip('-') or 'x'


def _letter(n):
    s = ''
    n += 1
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(97 + r) + s
    return s


def _next_id(book, rest, taken):
    base = f'{book}-{_slug(rest)}-'
    i = 0
    while base + _letter(i) in taken:
        i += 1
    taken.add(base + _letter(i))
    return base + _letter(i)


def edit_pairs(x, y):
    """[(old, new, j1)] turning x into y when applied in order: each old unique in the text as it then stands,
    each new unique in y, no old left in y, old never inside new (j1: the edit's offset in y)."""
    edits = _edits(x, y)
    cur, d, out = x, 0, []
    k = 0
    while k < len(edits):
        i1, i2, j1, j2 = edits[k]
        L = j1 - _left(y, j1, False)
        R = _right(x, i2, False) - i2
        for _ in range(MAX_WIDEN):
            nxt = edits[k + 1] if k + 1 < len(edits) else None
            if nxt and i2 + R > nxt[0]:  # context reaches the next edit: merge it
                k += 1
                i2, j2 = nxt[1], nxt[3]
                R = _right(x, i2, False) - i2
                continue
            old = cur[i1 + d - L:i2 + d + R]
            new = y[j1 - L:j2 + R]
            if old != new and cur.count(old) == 1 and y.count(new) == 1 and y.count(old) == 0 and old not in new:
                break
            L = j1 - _left(y, j1 - L, True)
            R = _right(x, i2 + R, True) - i2
        else:
            raise ValueError(f'cannot make the edit at {j1} unique')
        cur = cur[:i1 + d - L] + new + cur[i2 + d + R:]
        d += len(new) - len(old)
        out.append((old, new, j1))
        k += 1
    assert cur == y, 'edit pairs do not reproduce the after-text'
    return out


def derive_book(book, x, y, taken, evidence=None, date='1970-01-01'):
    out = []
    for old, new, j1 in edit_pairs(x, y):
        loc = _loc(book, y, j1)
        rest = loc.split(' ', 1)[1]
        ev, dt = (evidence(book, old, new) if evidence else ('xml diff', date))
        e = {'id': _next_id(book, rest, taken), 'target': ['xml'], 'loc': loc, 'old': old, 'new': new,
             'evidence': ev, 'date': dt}
        allow = sorted({f'{f.feature}:{f.kind}' for f in fidelity.compare(old, new)})
        if allow:
            e['allow'], e['note'] = allow, ALLOW_NOTE
        out.append(fixes.Entry.from_dict(e))
    return out


def derive_xml(before, after, existing_ids=frozenset(), evidence=None, date='1970-01-01'):
    sa = {k: (s, e) for k, s, e in xmlspan.spans(before)}
    sb = {k: (s, e) for k, s, e in xmlspan.spans(after)}
    if list(sa) != list(sb):
        raise ValueError(f'the book spans differ: {sorted(set(sa) ^ set(sb))}')
    taken = set(existing_ids)
    out = {}
    for k in sa:
        x, y = before[slice(*sa[k])], after[slice(*sb[k])]
        if x != y:
            out[k] = derive_book(k, x, y, taken, evidence, date)
    return out


def _git(repo, *args):
    return subprocess.run(['git', '-C', str(repo), *args], capture_output=True, check=True).stdout


def history(repo, rev_a, rev_b, name='A16049.xml'):
    """[(hash7, date, subject, {book: span text})] for rev_a and each commit touching the file up to rev_b."""
    revs = _git(repo, 'log', '--reverse', '--format=%h%x09%ad%x09%s', '--date=short',
                f'{rev_a}..{rev_b}', '--', name).decode().splitlines()
    out = []
    for line in [f'{rev_a}\t\t'] + revs:
        h, dt, subj = line.split('\t', 2)
        text = _git(repo, 'show', f'{h}:{name}').decode('utf-8')
        out.append((h[:7], dt, subj, {k: text[s:e] for k, s, e in xmlspan.spans(text)}))
    return out


def evidence_from(versions):
    def evidence(book, old, new):
        hits = []
        for (h0, _, _, v0), (h, dt, subj, v1) in zip(versions, versions[1:]):
            a, b = v0.get(book, ''), v1.get(book, '')
            if a.count(old) != b.count(old) or a.count(new) != b.count(new):
                hits.append((h, dt, subj))
        if not hits:
            return f'A16049.xml {versions[0][0]}..{versions[-1][0]}', versions[-1][1]
        ev = '; '.join(f'A16049.xml {h}: {s[:80]}' for h, _, s in hits)
        return ev, max(dt for _, dt, _ in hits)
    return evidence


def _forbidden(out):
    o = Path(out).resolve()
    for p in (paths.FIXES, paths.REPO / 'static/data'):
        p = p.resolve()
        if o == p or p in o.parents:
            return True
    return False


def main(argv):
    args, out, repo = [], None, None
    it = iter(argv)
    for a in it:
        if a == '--out':
            out = next(it)
        elif a == '--repo':
            repo = next(it)
        else:
            args.append(a)
    if len(args) != 3 or args[0] != 'xml' or not out:
        print(__doc__)
        return 2
    if _forbidden(out):
        print(f'--out {out}: proposals never go under fixes/ or static/data; review them, then append')
        return 2
    repo = Path(repo) if repo else sources.xml_path().parent
    _, ra, rb = args
    versions = history(repo, ra, rb)
    before = _git(repo, 'show', f'{ra}:A16049.xml').decode('utf-8')
    after = _git(repo, 'show', f'{rb}:A16049.xml').decode('utf-8')
    taken = {e.id for p in paths.FIXES.glob('*.jsonl') for e in fixes.load_ledger(p.stem)}
    res = derive_xml(before, after, taken, evidence_from(versions))
    Path(out).mkdir(parents=True, exist_ok=True)
    for book, es in res.items():
        fixes.write_ledger(Path(out) / f'{book}.jsonl', es)
        print(f'{book}: {len(es)} entries ({sum(1 for e in es if e.allow)} with allow)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
