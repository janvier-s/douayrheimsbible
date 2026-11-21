"""Detectors propose ledger entries; applying them equals what the old script wrote (run from git at OLD_REV)."""
import json
import shutil
import subprocess
import sys

import pytest

from rhemes import fixes, paths
from rhemes.detectors import longs, stars, wvv

OLD_REV = '7cabe4e2'  # the last commit with autofix.py, apply_wvv.py and longs.py as writers


def _w(p, obj, indent=None):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=indent, separators=None if indent else (',', ':')))


def _book(root, slug, verses, anns, indent=None):
    _w(root / f'{slug}.json', {'book': slug, 'intros': [], 'chapters': [{'chapter': 1, 'summary': 'S.', 'verses': verses}]}, indent)
    _w(root / slug / 'annotations/001.json', {'chapter': 1, 'annotations': anns})


def _old(tmp, script, args):
    """Run the pre-shim script, as it was at OLD_REV, inside the fixture repo tmp."""
    d = tmp / 'scripts/wikisource'
    d.mkdir(parents=True, exist_ok=True)
    (d / script).write_bytes(subprocess.run(['git', '-C', str(paths.REPO), 'show', f'{OLD_REV}:scripts/wikisource/{script}'],
                                            capture_output=True, check=True).stdout)
    (d / 'jsonfmt.py').write_text('from rhemes.jsonfmt import *  # noqa\n')
    if not (d / 'rhemes').exists():
        shutil.copytree(paths.HERE / 'rhemes', d / 'rhemes', ignore=shutil.ignore_patterns('__pycache__'))
    r = subprocess.run([sys.executable, '-I', str(d / script), *args, '--write'], cwd=tmp, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-800:]


def _files(root):
    return {p.relative_to(root): p.read_bytes() for p in sorted((root / 'static/data').rglob('*.json'))}


def _new(tmp, entries):
    rep = fixes.apply(entries, fixes.Ctx(tmp, tmp / 'none.xml', lock=tmp / 'lock'), write=True)
    assert rep.counts()['conflict'] == 0, [r.problems for r in rep.rows]


# --- stars (autofix) ---

def _stars_fixture(t):
    for root, txt, note in (('odr-original', 'In the <cr>[1]</cr> beginning vvas the vvord <na>[1]</na> and the vvord.', 'THE GOSPEL vpon Chriſtmas day.'),
                            ('odr', 'In the <cr>[1]</cr> beginning was the word <na>[1]</na> and the word.', 'THE GOSPEL upon Christmas day.')):
        _book(t / 'static/data' / root, 'tiny',
              [{'verse': 1, 'text': txt, 'notes': [{'label': '1', 'text': note, 'kind': 'gloss'}]}],
              [{'verse': 1, 'title': 'T', 'text': 'x', 'notes': [{'marker': 1, 'text': 'Aug.'}, {'marker': 2, 'text': 'Hier.'}]}],
              indent=2 if root == 'odr' else None)
    toks = [{'kind': 'verse', 'ch': 1, 'verse': 1, 'w': 2, 'tags': ['cr:1'], 'ocr': 'beginning', 'ann': None},
            {'kind': 'verse', 'ch': 1, 'verse': 1, 'w': 6, 'tags': ['na:1'], 'ocr': '*and', 'ann': None},
            {'kind': 'ann', 'ch': 1, 'verse': 1, 'w': 0, 'ann': 0, 'tags': ['mn:1'], 'ocr': '*Hier.'}]
    (t / 'tokens.json').write_text(json.dumps(toks))


def test_stars_proposes(tmp_path):
    _stars_fixture(tmp_path)
    es = stars.propose(tmp_path, 'tiny', tmp_path / 'tokens.json', 1, 1)
    locs = sorted(e.loc for e in es)
    assert locs == ['tiny 1:1', 'tiny 1:1/note1#kind', 'tiny 1:1a1/mn2#star']
    star = next(e for e in es if e.loc.endswith('#star'))
    assert star.old is None and star.new is True and set(star.target) == {'odr-original', 'odr'}
    assert all(e.evidence == 'detect stars tokens.json' for e in es)


def test_stars_apply_equals_old_write(tmp_path):
    a, b = tmp_path / 'a', tmp_path / 'b'
    _stars_fixture(a)
    _stars_fixture(b)
    _old(a, 'autofix.py', [str(a), 'tiny', str(a / 'tokens.json'), '1-1'])
    _new(b, stars.propose(b, 'tiny', b / 'tokens.json', 1, 1))
    assert _files(a) == _files(b)


# --- wvv (apply_wvv) ---

def _wvv_fixture(t):
    _book(t / 'static/data/odr-original', 'tiny',
          [{'verse': 1, 'text': 'In the beginning with the vvord, and with God.'}],
          [{'verse': 1, 'title': 'T', 'text': ' The Perſon which is', 'notes': []}])
    rows = [('cls', 'loc', 'data', 'tk', 'ts', 'occ'),
            ('w_for_vv', '1:1', 'with', 'vvith', 'vvith', '1'),
            ('w_for_vv', '1:1a1', 'which', 'vvhich', 'vvhich', '0'),
            ('w_for_vv', '1:1', 'with', 'xyz', 'vvith', '0'),  # skipped: the OCR word does not line up
            ('vv_for_w', '1:1', 'vvord,', 'word,', 'word', '0')]
    (t / 'f.tsv').write_text(''.join('\t'.join(r) + '\n' for r in rows))


def test_wvv_proposes(tmp_path):
    _wvv_fixture(tmp_path)
    es = wvv.propose(tmp_path, 'tiny', tmp_path / 'f.tsv', 'w_for_vv')
    assert sorted(e.loc for e in es) == ['tiny 1:1', 'tiny 1:1a1']
    assert all(e.target == ('odr-original',) for e in es)


@pytest.mark.parametrize('cls', ['w_for_vv', 'vv_for_w'])
def test_wvv_apply_equals_old_write(tmp_path, cls):
    a, b = tmp_path / 'a', tmp_path / 'b'
    _wvv_fixture(a)
    _wvv_fixture(b)
    _old(a, 'apply_wvv.py', ['tiny', str(a / 'f.tsv'), cls])
    _new(b, wvv.propose(b, 'tiny', b / 'f.tsv', cls))
    assert _files(a) == _files(b)


def _wvv_ctx(t, text, rows, cols=('cls', 'loc', 'data', 'tk', 'ts', 'occ', 'ctx')):
    _book(t / 'static/data/odr-original', 'tiny', [{'verse': 1, 'text': text}], [])
    (t / 'f.tsv').write_text(''.join('\t'.join(r) + '\n' for r in [cols, *rows]))
    return [(e.old, e.new) for e in wvv.propose(t, 'tiny', t / 'f.tsv', 'w_for_vv')]


def test_wvv_ctx_picks_the_flagged_word(tmp_path):
    """occ counts the words of the audit-time text; the context names the word itself."""
    got = _wvv_ctx(tmp_path, 'hearing the word of God at one word and more.',
                   [('w_for_vv', '1:1', 'word', 'vvord', 'vvord', '0', 'of God at one [word] and more.')])
    assert got == [('one word and', 'one vvord and')]


def test_wvv_rerun_on_fixed_data_proposes_nothing(tmp_path):
    """The flagged word is already vv: the next w-form word is not the one the OCR read."""
    got = _wvv_ctx(tmp_path, 'hearing the word of God at one vvord and more.',
                   [('w_for_vv', '1:1', 'word', 'vvord', 'vvord', '0', 'of God at one [word] and more.')])
    assert got == []


def test_wvv_ctx_folds_neighbours_already_respelled(tmp_path):
    got = _wvv_ctx(tmp_path, 'working, Chriſtes vvord and internal working, that in',
                   [('w_for_vv', '1:1', 'working,', 'vvorking,', 'vvorking,', '0', 'Chriſtes word and internal [working,] that in')])
    assert got == [('internal working, that', 'internal vvorking, that')]


def test_wvv_reads_rows_without_occ(tmp_path):
    """Mark's findings file predates the occ column; the context places each word."""
    got = _wvv_ctx(tmp_path, 'the word of God at one word and more.',
                   [('w_for_vv', '1:1', 'word', 'vvord', 'vvord', 'at one [word] and')],
                   cols=('cls', 'loc', 'data', 'tk', 'ts', 'ctx'))
    assert got == [('one word and', 'one vvord and')]


def test_wvv_vv_for_w_carries_allow(tmp_path):
    _wvv_fixture(tmp_path)
    e, = wvv.propose(tmp_path, 'tiny', tmp_path / 'f.tsv', 'vv_for_w')
    assert e.allow == ('vv:shift', 'w:loss') or list(e.allow) == ['vv:shift', 'w:loss']
    assert 'Transkribus' in e.note


def test_old_names_forward(tmp_path):
    import apply_wvv
    from rhemes import loc
    assert apply_wvv.find_text is loc.find_text and apply_wvv.propose is wvv.propose
    r = subprocess.run([sys.executable, '-I', str(paths.HERE / 'longs.py'), str(paths.REPO), 'john', '--write'],
                       capture_output=True, text=True)
    assert r.returncode == 0 and 'detect longs' in r.stderr and '--write is gone' in r.stderr
    assert r.stdout == ''  # john is done (0ffb97e0): nothing proposed


# --- longs ---

def _longs_fixture(t):
    (t / 'src/lib/data').mkdir(parents=True, exist_ok=True)
    shutil.copy(paths.REPO / 'src/lib/data/books.ts', t / 'src/lib/data/books.ts')
    d = t / 'static/data/odr-original'
    _book(d, 'john', [{'verse': 1, 'text': 'x'}],
          [{'verse': 1, 'title': 'T', 'text': 'x', 'notes': [{'marker': 1, 'text': 'Chrysostome in his sermon'},
                                                             {'marker': 1, 'text': 'Basil. and Ambrose'},
                                                             {'marker': 2, 'text': 'Aug. ſerm. 3.'}]}])
    _book(d, 'job', [{'verse': 1, 'text': 'x'}],
          [{'verse': 1, 'title': 'T', 'text': 'x', 'notes': [{'marker': 1, 'text': 'English sheweth this'}]}])


def test_longs_proposes(tmp_path):
    _longs_fixture(tmp_path)
    es = longs.propose(tmp_path, 'john')
    assert [e.loc for e in es] == ['john 1:1a1/mn.1', 'john 1:1a1/mn.2']  # marker 1 is used twice: by index
    assert (es[0].old, es[0].new) == ('Chrysostome in his sermon', 'Chryſoſtome in his ſermon')


def test_longs_apply_equals_old_write(tmp_path):
    a, b = tmp_path / 'a', tmp_path / 'b'
    _longs_fixture(a)
    _longs_fixture(b)
    _old(a, 'longs.py', [str(a)])
    _new(b, longs.propose(b, 'john') + longs.propose(b, 'job'))
    assert _files(a) == _files(b)


def test_longs_noop_on_nt():
    assert longs.propose(paths.REPO, 'john') == []


def test_detect_refuses_ledger_out(tmp_path):
    from rhemes import detectors
    assert detectors.main(['longs', 'john', '--out', str(paths.FIXES / 'john.jsonl')]) == 2
    assert detectors.main(['longs', 'john', '--out', str(paths.REPO / 'static/data/x.jsonl')]) == 2
