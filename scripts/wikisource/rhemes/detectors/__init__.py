"""Rule-based detectors: each runs its rule on an in-memory copy of the data and proposes ledger entries.

    rh.py detect stars BOOK TOKENS.json A-B [--out FILE] [--repo R]   (was autofix.py)
    rh.py detect wvv BOOK FINDINGS.tsv CLASS [--out FILE] [--repo R]  (was apply_wvv.py)
    rh.py detect longs BOOK [--out FILE] [--repo R]                   (was longs.py)

Nothing is written but the proposal file (ledger JSONL; printed when there is no --out). It may
not go under fixes/ or static/data: a person reviews the proposals, appends them to
fixes/<book>.jsonl, and runs rh.py fix apply.

propose_from(book, before, after, …): the entries that turn the stores `before` into `after`. A
changed text becomes text entries (fixderive.edit_pairs: minimal, unique in their string); a
changed scalar key of a container becomes a value entry loc#key. When odr-original and odr
change alike at one loc (same number of edits), the two pair into one entry with odr_old/odr_new.
With allow_note, an entry whose odr-original change trips the fidelity gate carries the
"allow" it needs and that note (the rule's reason; the reviewer still checks the scan).
"""
import copy
import datetime
import sys
from pathlib import Path

from .. import fidelity, fixderive, fixes, loc as locmod, paths

STORES = ('odr-original', 'odr')


def load(repo, book, stores=STORES):
    """{store: Store} for the stores the book has under repo."""
    out = {}
    for s in stores:
        root = Path(repo) / fixes.ROOTS[s]
        if (root / f'{book}.json').exists():
            out[s] = locmod.load_store(root, book)
    return out


def snapshot(stores):
    return {s: copy.deepcopy(st) for s, st in stores.items()}


def _scalar(v):
    return v is None or isinstance(v, (str, bool, int, float)) or (isinstance(v, list) and not any(isinstance(x, dict) for x in v))


def _changes(before, after):
    """[(rest, kind, old, new)] where kind is 'text' or '#key', for one store."""
    b, a = list(locmod.iter_locs(before)), list(locmod.iter_locs(after))
    if [r for r, _, _ in b] != [r for r, _, _ in a]:
        raise ValueError('the data changed shape (locs differ); not representable as entries')
    out, keys, home = [], {}, {}
    for (rest, c0, k0), (_, c1, _) in zip(b, a):
        keys.setdefault(id(c0), (c0, c1, set()))[2].add(k0)
        if id(c0) not in home or k0 in ('text', 'summary'):
            home[id(c0)] = rest
        if c0.get(k0) != c1.get(k0):
            out.append((rest, 'text', c0.get(k0), c1.get(k0)))
    for cid, (c0, c1, texts) in keys.items():
        for key in sorted(set(c0) | set(c1)):
            v0, v1 = c0.get(key), c1.get(key)
            if key in texts or v0 == v1:
                continue
            if not (_scalar(v0) and _scalar(v1)):
                if isinstance(v0, list) and isinstance(v1, list) and len(v0) == len(v1):
                    continue  # its items are containers of their own, compared at their locs
                raise ValueError(f'{home[cid]}: {key} changed in structure; not representable as entries')
            out.append((home[cid], f'#{key}', v0, v1))
    return out


def propose_from(book, before, after, evidence, taken=None, date=None, allow_note=None):
    date = date or datetime.date.today().isoformat()
    taken = set(taken if taken is not None else ledger_ids(book))
    per = {s: _changes(before[s], after[s]) for s in before}
    by_loc = {}
    order = []
    for s in per:
        for rest, kind, old, new in per[s]:
            key = (rest, kind)
            if key not in by_loc:
                by_loc[key] = {}
                order.append(key)
            by_loc[key][s] = (old, new)
    out = []
    for rest, kind in order:
        got = by_loc[(rest, kind)]
        if kind == 'text':
            pairs = {s: [(o, n) for o, n, _ in fixderive.edit_pairs(old, new)] for s, (old, new) in got.items()}
            if len(pairs) == 2 and len(pairs['odr-original']) == len(pairs['odr']):
                for (o, n), (mo, mn) in zip(pairs['odr-original'], pairs['odr']):
                    out.append(_entry(book, rest, ['odr-original', 'odr'], o, n, evidence, date, taken, (mo, mn)))
            else:
                for s in pairs:
                    for o, n in pairs[s]:
                        out.append(_entry(book, rest, [s], o, n, evidence, date, taken))
        else:
            loc = rest + kind
            if len(got) == 2:
                (o, n), (mo, mn) = got['odr-original'], got['odr']
                out.append(_entry(book, loc, ['odr-original', 'odr'], o, n, evidence, date, taken, (mo, mn)))
            else:
                (s, (o, n)), = got.items()
                out.append(_entry(book, loc, [s], o, n, evidence, date, taken))
    return [_allow(e, allow_note) for e in out] if allow_note else out


def _allow(e, note):
    if 'odr-original' not in e.target or e.is_value:
        return e
    allow = sorted({f'{f.feature}:{f.kind}' for f in fidelity.compare(e.old, e.new)})
    if not allow:
        return e
    d = e.to_dict()
    d['allow'], d['note'] = allow, note
    return fixes.Entry.from_dict(d)


def _entry(book, rest, target, old, new, evidence, date, taken, odr=None):
    d = {'id': fixderive._next_id(book, rest.replace('#', '-'), taken), 'target': target, 'loc': f'{book} {rest}',
         'old': old, 'new': new, 'evidence': evidence, 'date': date}
    if odr:
        d['odr_old'], d['odr_new'] = odr
    return fixes.Entry.from_dict(d)


def ledger_ids(book, root=None):
    """The ids in the book's ledger (none when it has no file); a broken ledger raises LedgerError."""
    if not (Path(root or paths.FIXES) / f'{book}.jsonl').exists():
        return set()
    return {e.id for e in fixes.load_ledger(book, root)}


def _opt(argv, name):
    if name not in argv:
        return argv, None
    i = argv.index(name)
    return argv[:i] + argv[i + 2:], argv[i + 1]


def main(argv):
    from . import longs, stars, wvv
    argv, out = _opt(argv, '--out')
    argv, repo = _opt(argv, '--repo')
    if out and fixes.forbidden_out(out, repo):
        print(f'--out {out}: proposals never go under fixes/ or static/data; review them, then append')
        return 2
    rules = {'stars': (stars, 4), 'wvv': (wvv, 4), 'longs': (longs, 2)}
    if not argv or argv[0] not in rules or len(argv) != rules[argv[0]][1]:
        print(__doc__)
        return 2
    rule, args = argv[0], argv[1:]
    repo = Path(repo) if repo else paths.REPO
    if rule == 'stars':
        a, b = map(int, args[2].split('-'))
        es = stars.propose(repo, args[0], Path(args[1]), a, b)
    elif rule == 'wvv':
        es = wvv.propose(repo, args[0], Path(args[1]), args[2])
    else:
        es = longs.propose(repo, args[0])
    text = ''.join(fixes.dumps(e) + '\n' for e in es)
    if out:
        Path(out).write_text(text)
    else:
        sys.stdout.write(text)
    print(f'{len(es)} proposed entries' + (f' in {out}' if out else ''), file=sys.stderr)
    return 0
