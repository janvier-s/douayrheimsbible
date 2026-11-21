"""Phase 4 exit: the ledger is a no-op on the current data, and reproduces the XML from the EEBO-TCP import."""
import subprocess

import pytest

from rhemes import fixes, paths, sources

XML_BASE = 'ee79a5e'  # the 2014 EEBO-TCP import; every A16049.xml commit since is in the ledger


def _xml_repo():
    p = sources.xml_path()
    ok = p.exists() and subprocess.run(['git', '-C', str(p.parent), 'cat-file', '-e', XML_BASE],
                                       capture_output=True).returncode == 0
    return p if ok else None


def _all():
    return {p.stem: fixes.load_ledger(p.stem) for p in sorted(paths.FIXES.glob('*.jsonl'))}


@pytest.mark.skipif(_xml_repo() is None, reason='needs the XML repo')
def test_ledger_noop_on_current():
    led = _all()
    assert led, 'no ledger files'
    ctx = fixes.Ctx()
    for book, entries in led.items():
        c = fixes.apply(entries, ctx).counts()
        assert c['pending'] == 0 and c['conflict'] == 0, (book, c)


def _text(x):
    return x[x.index('<text'):x.index('</text>')]


@pytest.mark.slow
@pytest.mark.skipif(_xml_repo() is None, reason='needs the XML repo with history')
def test_xml_ledger_replays_history(tmp_path):
    p = _xml_repo()
    base = subprocess.run(['git', '-C', str(p.parent), 'show', f'{XML_BASE}:A16049.xml'],
                          capture_output=True, check=True).stdout
    x = tmp_path / 'A16049.xml'
    x.write_bytes(base)
    ctx = fixes.Ctx(tmp_path, x, lock=tmp_path / 'lock')
    xml_entries = [e for es in _all().values() for e in es if 'xml' in e.target]
    assert xml_entries
    rep = fixes.apply([fixes.Entry.from_dict({**e.to_dict(), 'target': ['xml']}) for e in xml_entries], ctx, write=True)
    assert rep.counts()['conflict'] == 0, [r.problems for r in rep.rows if r.problems][:5]
    assert _text(x.read_bytes().decode()) == _text(p.read_bytes().decode())


def _git(*args):
    return subprocess.run(['git', '-C', str(paths.REPO), *args], capture_output=True, check=True).stdout


def _checkout_book(rev, book, dest):
    """The book's odr-original and odr files at rev, in a repo layout under dest."""
    for root in ('static/data/odr-original', 'static/data/odr'):
        names = _git('ls-tree', '-r', '--name-only', rev, '--', f'{root}/{book}.json', f'{root}/{book}/annotations').decode().split()
        for n in names:
            (dest / n).parent.mkdir(parents=True, exist_ok=True)
            (dest / n).write_bytes(_git('show', f'{rev}:{n}'))


def _shape(s):
    from rhemes import text
    return text.fold_chars(s).replace('VV', 'W')


def test_json_entries_replay_history(tmp_path):
    """The JSON entries of each commit named in their evidence ("applied in <hash>"), applied in ledger order to
    the text at <hash>^, give the text at <hash> at their loc. Where the same commit also ran a letter-shape
    bulk pass (ſ, vv: the baseline, spec §8), the replay runs on the letter-shape fold (_shape) where an old
    text is not in <hash>^ as it stands, and the result must equal <hash>'s text, or its fold: the bulk pass is
    then the only other change at that loc. An entry that names no commit is a fix recorded since the ledger
    (PLAYBOOK "Record a fix": committed with its data, so it cannot name its own commit); test_ledger_noop_on_current
    checks that it is applied."""
    import re
    from rhemes import loc as locmod
    groups = {}
    for es in _all().values():
        for e in es:
            if set(e.target) & {'odr-original', 'odr'}:
                m = re.search(r'applied in ([0-9a-f]{7,})', e.evidence)
                if not m:
                    continue
                groups.setdefault((m.group(1), e.book), []).append(e)
    assert groups, 'no JSON entries'
    for (rev, book), es in groups.items():
        before, after = tmp_path / f'{rev}-a', tmp_path / f'{rev}-b'
        _checkout_book(f'{rev}^', book, before)
        _checkout_book(rev, book, after)
        for t in ('odr-original', 'odr'):
            sa = locmod.load_store(before / fixes.ROOTS[t], book)
            sb = locmod.load_store(after / fixes.ROOTS[t], book)
            cur, folded = {}, set()
            for e in es:
                if t not in e.target:
                    continue
                old, new = e.pair(t)
                if e.rest not in cur:
                    c, k = locmod.resolve(sa, e.rest, check_verse=False)
                    cur[e.rest] = c.get(k)
                v = cur[e.rest]
                if e.is_value:
                    assert v == old, (rev, e.id, t, 'value is not old')
                    cur[e.rest] = new
                    continue
                if e.rest not in folded and v.count(old) != 1:
                    folded.add(e.rest)
                    v = _shape(v)
                if e.rest in folded:
                    old, new = _shape(old), _shape(new)
                assert v.count(old) == 1, (rev, e.id, t, v.count(old))
                cur[e.rest] = v.replace(old, new, 1)
            for rest, v in cur.items():
                c, k = locmod.resolve(sb, rest, check_verse=False)
                want = c.get(k)
                assert v == want or _shape(v) == _shape(want), (rev, rest, t)


def test_ledger_entries_pass_the_gate():
    """Every live entry would pass apply's fidelity check if it were pending (allow + note where decided)."""
    bad = [(e.id, p) for es in _all().values() for e in es if e.superseded_by is None
           for t in e.target for p in fixes._fidelity(e, t)]
    assert not bad, bad[:20]
