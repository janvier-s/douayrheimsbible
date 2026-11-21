"""sync-odr: content and structure differences between odr and odr-original.

    rh.py sync-odr BOOK… [--min-spelling N] [--corpus all|nt|BOOK,…] [--out FILE] [--repo R]

odr is odr-original modernised, so the two must say the same thing in different
spelling. This lists where they do not; it writes no data (proposals go to --out, which
may not be under fixes/ or static/data).

Structure, per book: the same set of locs, and per loc the same number of <na>, <mn>,
<cr> and *, of notes, and of lemmas (by their n).

Content, per loc: the tags (and the marker spans) are stripped, the words folded with
spell_key (text.fold_word: case, marks, ſ, vv, u/v, i/j; then & → and, a macron's m/n
restored, ꝑ ꝓ æ œ expanded, y → i, doubled letters single, no final e), and the two
word lists aligned. Within a
changed block, words are matched from both ends while they are equal, a known spelling
pair, or a split/join (to day / today). A pair is a known spelling when it turns up at
least --min-spelling times (default 3) across the corpus, counted from the 1:1 leftovers
of the blocks (Iewes/Jews, ſhal/shall). What is left is content (band/hand, a missing or
an extra word): it prints as `loc | odr-original: … | odr: …` and becomes one proposed
entry for odr, its old the odr span with 2 words of context (widened until unique), its
new that span with the original's words, still to be modernised by the reviewer.
"""
import collections
import datetime
import re
import sys
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path

from . import fixderive, fixes, loc as locmod, paths
import unicodedata

from .text import fold_word

MIN_SPELLING = 3
CONTEXT = 2
TOKEN = re.compile(r'<(cr|na|mn)>[^<]*</\1>|<[^>]+>|[^\s<]+')
NOTE = 'modernise new before adding'
EVIDENCE = 'sync-odr: odr-original reading'


@dataclass
class Diff:
    loc: str
    orig_words: list
    odr_words: list
    rest: str = field(default='', repr=False)
    j: tuple = field(default=(0, 0), repr=False)  # the odr word range


NASAL = ('\u0304', '\u0303')  # macron, tilde: an m or n left out
EXPAND = {'ꝑ': 'per', 'ꝓ': 'pro', 'æ': 'ae', 'œ': 'oe', 'Æ': 'ae', 'Œ': 'oe'}


def norm(k):
    """The last step of spell_key, also used on joined keys: doubled letters single, no final e."""
    k = re.sub(r'(.)\1+', r'\1', k)
    return k[:-1] if len(k) > 2 and k.endswith('e') else k


def base_key(w):
    """spell_key before norm (so that two words can be joined, then normed)."""
    w = re.sub(r'&c\b', 'etc', w).replace('&', 'and')
    w = unicodedata.normalize('NFD', w)
    out = []
    for k, ch in enumerate(w):
        if ch in NASAL:
            nxt = next((c for c in w[k + 1:] if not unicodedata.combining(c)), '')
            out.append('m' if nxt.lower() in 'mbp' and nxt else 'n')
        else:
            out.append(EXPAND.get(ch, ch))
    return fold_word(unicodedata.normalize('NFC', ''.join(out))).replace('y', 'i')


def spell_key(w):
    """A word's key with the period's spelling variation folded away (empty for bare punctuation)."""
    return norm(base_key(w))


def words(text):
    """[(start, end, raw, base_key)] for the words of a text, without tags, markers and bare punctuation."""
    out = []
    for m in TOKEN.finditer(text or ''):
        if m.group().startswith('<'):
            continue
        k = base_key(m.group())
        if norm(k):
            out.append((m.start(), m.end(), m.group(), k))
    return out


def _texts(store):
    return {rest: c.get(k) for rest, c, k in locmod.iter_locs(store) if isinstance(c.get(k), str)}


def _greedy(bo, bm, ok):
    """Matches from both ends; returns the unmatched middle (i1, i2, j1, j2) of the base-key lists bo/bm."""
    ko, km = [norm(x) for x in bo], [norm(x) for x in bm]
    i, j, I, J = 0, 0, len(ko), len(km)

    while i < I and j < J:
        if ko[i] == km[j] or ok(ko[i], km[j]):
            i, j = i + 1, j + 1
        elif i + 1 < I and norm(bo[i] + bo[i + 1]) == km[j]:
            i, j = i + 2, j + 1
        elif j + 1 < J and norm(bm[j] + bm[j + 1]) == ko[i]:
            i, j = i + 1, j + 2
        else:
            break
    while I > i and J > j:
        if ko[I - 1] == km[J - 1] or ok(ko[I - 1], km[J - 1]):
            I, J = I - 1, J - 1
        elif I - 2 >= i and norm(bo[I - 2] + bo[I - 1]) == km[J - 1]:
            I, J = I - 2, J - 1
        elif J - 2 >= j and norm(bm[J - 2] + bm[J - 1]) == ko[I - 1]:
            I, J = I - 1, J - 2
        else:
            break
    return i, I, j, J


def _blocks(ko, km):
    """The changed blocks (i1, i2, j1, j2) of two key lists."""
    return [(i1, i2, j1, j2) for tag, i1, i2, j1, j2 in SequenceMatcher(None, ko, km, autojunk=False).get_opcodes()
            if tag != 'equal']


def spelling_pairs(books):
    """Counter[(orig key, odr key)] over the 1:1 leftovers of changed blocks, for [(orig Store, odr Store)]."""
    c = collections.Counter()
    for orig, odr in books:
        to, tm = _texts(orig), _texts(odr)
        for rest in to.keys() & tm.keys():
            if to[rest] == tm[rest]:
                continue
            bo, bm = [w[3] for w in words(to[rest])], [w[3] for w in words(tm[rest])]
            ko, km = [norm(x) for x in bo], [norm(x) for x in bm]
            for i1, i2, j1, j2 in _blocks(ko, km):
                a, b, x, y = _greedy(bo[i1:i2], bm[j1:j2], lambda p, q: False)
                if b - a == y - x:
                    c.update(zip(ko[i1 + a:i1 + b], km[j1 + x:j1 + y]))
    return c


def content_diffs(orig, odr, spelling, min_count=MIN_SPELLING):
    def ok(p, q):
        return spelling[(p, q)] >= min_count

    out = []
    to, tm = _texts(orig), _texts(odr)
    for rest, _, _ in locmod.iter_locs(orig):
        if rest not in tm or not isinstance(to.get(rest), str) or to[rest] == tm[rest]:
            continue
        wo, wm = words(to[rest]), words(tm[rest])
        bo, bm = [w[3] for w in wo], [w[3] for w in wm]
        ko, km = [norm(x) for x in bo], [norm(x) for x in bm]
        for i1, i2, j1, j2 in _blocks(ko, km):
            a, b, x, y = _greedy(bo[i1:i2], bm[j1:j2], ok)
            i1, i2, j1, j2 = i1 + a, i1 + b, j1 + x, j1 + y
            if i1 == i2 and j1 == j2:
                continue
            runs = [(i1, i2, j1, j2)]
            if i2 - i1 == j2 - j1:  # 1:1: only the runs of pairs that are not spelling
                runs, cur = [], None
                for k in range(i2 - i1):
                    bad = not ok(ko[i1 + k], km[j1 + k])
                    if bad and cur is None:
                        cur = k
                    if not bad and cur is not None:
                        runs.append((i1 + cur, i1 + k, j1 + cur, j1 + k))
                        cur = None
                if cur is not None:
                    runs.append((i1 + cur, i2, j1 + cur, j2))
            for p1, p2, q1, q2 in runs:
                out.append(Diff(f'{orig.book} {rest}', [w[2] for w in wo[p1:p2]], [w[2] for w in wm[q1:q2]], rest, (q1, q2)))
    return out


def _span(text, wm, q1, q2, new_words, c):
    """(old, new) for odr text: the words q1..q2 with c words of context, replaced by new_words."""
    n = len(wm)
    a, b = max(0, q1 - c), min(n, q2 + c)
    s = wm[a][0] if a < n else len(text)
    e = wm[b - 1][1] if b > 0 else 0
    s, e = min(s, e), max(s, e)
    ins = ' '.join(new_words)
    if q2 > q1 and new_words:
        lo, hi, rep = wm[q1][0], wm[q2 - 1][1], ins
    elif q2 > q1:  # odr has words the original does not: drop them with one space
        if q2 < n:
            lo, hi, rep = wm[q1][0], wm[q2][0], ''
        elif q1 > 0:
            lo, hi, rep = wm[q1 - 1][1], wm[q2 - 1][1], ''
        else:
            lo, hi, rep = wm[q1][0], wm[q2 - 1][1], ''
    elif q1 < n:  # odr lacks the original's words: insert them before word q1
        lo = hi = wm[q1][0]
        rep = ins + ' '
    else:
        lo = hi = wm[n - 1][1] if n else len(text)
        rep = ' ' + ins
    s, e = min(s, lo), max(e, hi)
    return text[s:e], text[s:lo] + rep + text[hi:e]


def propose(diffs, orig, odr, taken=None, date=None):
    date = date or datetime.date.today().isoformat()
    taken = set() if taken is None else taken
    tm = _texts(odr)
    out = []
    for d in diffs:
        text = tm[d.rest]
        wm = words(text)
        c = CONTEXT
        old, new = _span(text, wm, *d.j, d.orig_words, c)
        while text.count(old) != 1 and c < len(wm):
            c += 1
            old, new = _span(text, wm, *d.j, d.orig_words, c)
        if text.count(old) != 1 or old == new:
            continue
        out.append(fixes.Entry.from_dict({
            'id': fixderive._next_id(odr.book, d.rest, taken), 'target': ['odr'], 'loc': d.loc,
            'old': old, 'new': new, 'evidence': EVIDENCE, 'date': date, 'note': NOTE}))
    return out


def _counts(text, cont, key):
    t = text or ''
    got = {m: t.count(m) for m in ('<na>', '<mn>', '<cr>', '*')}
    if key in ('text', 'summary') and isinstance(cont.get('notes'), list):
        got['notes'] = len(cont['notes'])
    if isinstance(cont.get('lemmas'), list) and key == 'text':
        got['lemmas'] = [lm[2] if len(lm) > 2 else None for lm in cont['lemmas']]
    return got


def structure_diffs(orig, odr):
    lo = {r: (c, k) for r, c, k in locmod.iter_locs(orig)}
    lm = {r: (c, k) for r, c, k in locmod.iter_locs(odr)}
    out = [f'{orig.book} {r} only in odr-original' for r in lo if r not in lm]
    out += [f'{orig.book} {r} only in odr' for r in lm if r not in lo]
    for r, (c, k) in lo.items():
        if r not in lm:
            continue
        a, b = _counts(c.get(k), c, k), _counts(lm[r][0].get(lm[r][1]), *lm[r])
        for what in a.keys() | b.keys():
            if a.get(what) != b.get(what):
                out.append(f'{orig.book} {r} {what}: odr-original {a.get(what)} | odr {b.get(what)}')
    return out


def _books(repo, corpus):
    root = Path(repo) / fixes.ROOTS['odr-original']
    have = sorted(p.stem for p in root.glob('*.json') if (Path(repo) / fixes.ROOTS['odr'] / p.name).exists())
    if corpus == 'all':
        return have
    if corpus == 'nt':
        from .detectors.longs import nt_books
        nt = nt_books(repo)
        return [b for b in have if b in nt]
    return corpus.split(',')


def _opt(argv, name, default=None):
    if name not in argv:
        return argv, default
    i = argv.index(name)
    return argv[:i] + argv[i + 2:], argv[i + 1]


def main(argv):
    from .detectors import _forbidden
    argv, out = _opt(argv, '--out')
    argv, repo = _opt(argv, '--repo', paths.REPO)
    argv, mins = _opt(argv, '--min-spelling', MIN_SPELLING)
    argv, corpus = _opt(argv, '--corpus', 'all')
    if not argv or any(a.startswith('--') for a in argv):
        print(__doc__)
        return 2
    if out and _forbidden(out):
        print(f'--out {out}: proposals never go under fixes/ or static/data; review them, then append')
        return 2
    load = {}

    def pair(b):
        if b not in load:
            load[b] = tuple(locmod.load_store(Path(repo) / fixes.ROOTS[s], b) for s in ('odr-original', 'odr'))
        return load[b]

    spelling = spelling_pairs(pair(b) for b in sorted(set(_books(repo, corpus)) | set(argv)))
    entries = []
    for b in argv:
        orig, odr = pair(b)
        st = structure_diffs(orig, odr)
        ds = content_diffs(orig, odr, spelling, int(mins))
        for s in st:
            print(s)
        for d in ds:
            print(f'{d.loc} | odr-original: {" ".join(d.orig_words)} | odr: {" ".join(d.odr_words)}')
        taken = {e.id for e in fixes.load_ledger(b)} if Path(repo) == paths.REPO and (paths.FIXES / f'{b}.jsonl').exists() else set()
        es = propose(ds, orig, odr, taken)
        entries += es
        print(f'{b}: {len(st)} structure, {len(ds)} content differences, {len(es)} proposed entries')
    if out:
        Path(out).write_text(''.join(fixes.dumps(e) + '\n' for e in entries))
    return 0
