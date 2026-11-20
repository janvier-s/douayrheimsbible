import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

import ocrpages

HERE = Path(__file__).resolve().parents[1]
REPO = HERE.parents[1]
GEN = str(HERE / 'generate.py')
needs_ocr = pytest.mark.skipif(not (ocrpages.TK.exists() and ocrpages.SCAN.exists()), reason='OCR not on this machine')


def run(book, first, out, *extra):
    r = subprocess.run([sys.executable, '-I', GEN, str(REPO), book, str(first), str(out), *map(str, extra)],
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-800:]
    return out


def test_import_has_no_side_effects(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    sys.modules.pop('generate', None)
    import generate  # noqa: F401
    assert list(tmp_path.iterdir()) == []
    assert callable(generate.main)


def test_load_books():
    import generate
    b = generate.load_books(REPO)
    assert b['mark'] == {'first': 114, 'last': 160, 'ornaments': False, 'golden': b['mark']['golden']}
    assert all(v['ornaments'] is False for v in b.values())


@needs_ocr
def test_ornaments_default_off(tmp_path):
    run('john', 244, tmp_path, 3)
    text = ''.join(p.read_text() for p in tmp_path.glob('*.wiki'))
    assert 'image=' not in text and '[[File:' not in text


@needs_ocr
def test_ornaments_flag_on(tmp_path):
    run('john', 244, tmp_path, 1, '--ornaments')
    assert '[[File:' in (tmp_path / '244.wiki').read_text()


@needs_ocr
def test_matthew_stops_at_last(tmp_path):
    run('matthew', 31, tmp_path)
    assert (tmp_path / '113.wiki').exists()
    assert not (tmp_path / '114.wiki').exists()


@needs_ocr
def test_john_argument_generates(tmp_path):
    run('john', 242, tmp_path, 3)
    a, b = (tmp_path / '242.wiki').read_text(), (tmp_path / '243.wiki').read_text()
    hws = re.search(r'\{\{hws\|((?:[^|{}]|\{\{ls\}\})*)\|((?:[^|{}]|\{\{ls\}\})*)', a)
    hwe = re.search(r'\{\{hwe\|((?:[^|{}]|\{\{ls\}\})*)\|((?:[^|{}]|\{\{ls\}\})*)', b)
    assert hws and hwe and hws.group(2) == hwe.group(2) == 'Pa{{ls}}{{ls}}ion'
