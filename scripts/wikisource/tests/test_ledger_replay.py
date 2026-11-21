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
