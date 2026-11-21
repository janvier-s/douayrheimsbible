"""fix propose-live: another editor's change on a live Wikisource page, as a proposed ledger entry.

    rh.py fix propose-live FETCH_DIR [PAGE…] [--out FILE] [--repo R]

Offline: it reads what rh.py fetch wrote (FETCH_DIR/<n>.wiki and revs.json) and compares each
page with its committed page (wikisource/1582-rhemes-nt/pages/<n>.wiki). Each changed word run
(plain words, {{ls}} read as ſ, '' and ''' dropped) is looked up in odr-original by its words
(tags and markers skipped): the committed words, with one word of context each side (then one side, then
none, then wider; TRIES), must stand exactly once in exactly one text. Then it
proposes an entry for odr-original with the evidence "wikisource rev <revid> by <user>"; otherwise
it lists the change as unplaced (a running head, a line break, a change across texts).

Never reverts the change, never writes data: proposals go to --out (not under fixes/ or
static/data) or stdout, for a person to check on the scan before appending (RULES §7).
"""
import json
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

from . import config, fixderive, fixes, loc as locmod, paths
from .sources import committed_page
from .syncodr import TOKEN
from .text import nfc, wiki_to_plain

NOTE = 'check against the scan; add odr/xml targets if they apply'
TRIES = ((1, 1), (1, 0), (0, 1), (0, 0), (2, 2), (2, 0), (0, 2), (3, 3))  # context words (left, right)


def book_of(n, repo=None):
    for name, b in config.books(repo).items():
        if b.first <= n <= b.last:
            return name
    return None


def _wiki_words(text):
    return [w for w in (x.replace("'''", '').replace("''", '') for x in wiki_to_plain(nfc(text)).split()) if w]


def _tokens(text):
    """[(start, end, word)] of a data text: its words without tags and marker spans."""
    return [(m.start(), m.end(), m.group()) for m in TOKEN.finditer(text) if not m.group().startswith('<')]


def _find(seq, toks):
    """Start indexes of seq in the token words."""
    words = [t[2] for t in toks]
    return [i for i in range(len(words) - len(seq) + 1) if words[i:i + len(seq)] == seq]


def _place(a, i1, i2, data, ctx):
    """(rest, k, m1, m2, n) if a[i1-l:i2+r] stands once in exactly one data text (k: its first token)."""
    lo, hi = max(0, i1 - ctx[0]), min(len(a), i2 + ctx[1])
    if lo == hi:
        return None  # an insertion needs a word beside it
    seq = a[lo:hi]
    hits = [(rest, k) for rest, (_, toks) in data.items() for k in _find(seq, toks)]
    if len(hits) != 1:
        return None
    rest, k = hits[0]
    return rest, k, i1 - lo, i2 - lo, hi - lo


def propose_live(page, live, committed, rev, store, taken=None):
    """(entries, unplaced) for the changes from the committed page to the live page."""
    taken = set() if taken is None else taken
    a, b = _wiki_words(committed), _wiki_words(live)
    data = {rest: (c[k], _tokens(c[k])) for rest, c, k in locmod.iter_locs(store) if isinstance(c.get(k), str)}
    entries, unplaced = [], []
    for tag, i1, i2, j1, j2 in SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == 'equal':
            continue
        got = next((p for ctx in TRIES if (p := _place(a, i1, i2, data, ctx))), None)
        edit = _edit(data, got, b[j1:j2]) if got else None
        if not edit:
            unplaced.append(f'page {page}: "{" ".join(a[i1:i2])}" → "{" ".join(b[j1:j2])}"')
            continue
        rest, old, new = edit
        entries.append(fixes.Entry.from_dict({
            'id': fixderive._next_id(store.book, rest, taken), 'target': ['odr-original'],
            'loc': f'{store.book} {rest}', 'old': old, 'new': new,
            'evidence': f'wikisource rev {rev["revid"]} by {rev["user"]}',
            'date': (rev.get('timestamp') or '')[:10] or '1970-01-01', 'note': NOTE}))
    return entries, unplaced


def _edit(data, got, live_words):
    """(rest, old, new) in the data's own text: the matched span, with the changed words replaced
    token by token (so tags between them stay), or as one run when nothing but spaces lies between."""
    rest, k, m1, m2, n = got
    text, toks = data[rest]
    span = toks[k:k + n]
    s, e = span[0][0], span[-1][1]
    mid = span[m1:m2]
    if len(mid) == len(live_words):
        out, pos = [], s
        for (ts, te, _), w in zip(mid, live_words):
            out += [text[pos:ts], w]
            pos = te
        new = ''.join(out) + text[pos:e]
    elif mid and '<' in text[mid[0][0]:mid[-1][1]]:
        return None  # a run of a different length across markup: left to a person
    elif mid:
        new = text[s:mid[0][0]] + ' '.join(live_words) + text[mid[-1][1]:e]
        if not live_words:  # a deletion: also drop one space
            new = re.sub(r'  +', ' ', new).strip() if new.strip() else new
    elif m1 > 0:  # an insertion after span[m1-1]
        cut = span[m1 - 1][1]
        new = text[s:cut] + ' ' + ' '.join(live_words) + text[cut:e]
    else:  # an insertion before span[0]
        new = ' '.join(live_words) + ' ' + text[s:e]
    old = text[s:e]
    if text.count(old) != 1 or old == new:
        return None
    return rest, old, new


def _opt(argv, name):
    if name not in argv:
        return argv, None
    i = argv.index(name)
    return argv[:i] + argv[i + 2:], argv[i + 1]


def main(argv):
    argv, out = _opt(argv, '--out')
    argv, repo = _opt(argv, '--repo')
    repo = Path(repo) if repo else paths.REPO
    if not argv or argv[0].startswith('--'):
        print(__doc__)
        return 2
    if out and fixes.forbidden_out(out, repo):
        print(f'--out {out}: proposals never go under fixes/ or static/data; review them, then append')
        return 2
    fetch = Path(argv[0])
    revs = json.loads((fetch / 'revs.json').read_text())
    pages = [int(x) for x in argv[1:]] or sorted(int(p.stem) for p in fetch.glob('*.wiki') if p.stem.isdigit())
    stores, taken, entries = {}, {}, []
    for n in pages:
        live, committed = (fetch / f'{n}.wiki').read_text(), committed_page(n)
        if nfc(live) == nfc(committed):
            continue
        book = book_of(n, repo if repo != paths.REPO else None)
        if book is None:
            print(f'page {n}: no book in books.json covers it')
            continue
        if book not in stores:
            stores[book] = locmod.load_store(repo / fixes.ROOTS['odr-original'], book)
            ledger = paths.FIXES / f'{book}.jsonl'
            taken[book] = {e.id for e in fixes.load_ledger(book)} if repo == paths.REPO and ledger.exists() else set()
        es, unplaced = propose_live(n, live, committed, revs[str(n)], stores[book], taken[book])
        entries += es
        for u in unplaced:
            print(f'unplaced {u}')
        print(f'page {n}: {len(es)} proposed, {len(unplaced)} unplaced')
    text = ''.join(fixes.dumps(e) + '\n' for e in entries)
    if out:
        Path(out).write_text(text)
    else:
        sys.stdout.write(text)
    return 0
