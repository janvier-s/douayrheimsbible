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


def body_of(t):
    return re.match(r'^<noinclude>.*?</noinclude>(.*)<noinclude>(.*?)</noinclude>\n?$', t, re.S).groups()


def test_footer_markup_catchwords():
    import generate
    assert generate.footer("''6. It is''") == "{{continues|''6. It is''}}"
    assert generate.footer("''62. If") == "{{continues|''62. If''}}"
    assert generate.footer('{{sc|the}}') == '{{continues|{{sc|the}}}}'
    assert generate.footer('') == ''


def test_end_body():
    import generate
    assert generate.end_body('x', True) == 'x\n{{nop}}'
    assert generate.end_body('x', False) == 'x'


@pytest.fixture(scope='module')
def mark_pages(tmp_path_factory):
    if not (ocrpages.TK.exists() and ocrpages.SCAN.exists()):
        pytest.skip('OCR not on this machine')
    out = run('mark', 114, tmp_path_factory.mktemp('mark'))
    return {int(p.stem): p.read_text() for p in out.glob('*.wiki')}


def test_no_signature_or_rh_footer(mark_pages):
    foots = {n: body_of(t)[1] for n, t in mark_pages.items()}
    assert not [n for n, f in foots.items() if '{{rh' in f]
    assert foots[119] == '{{continues|ANNOT.}}'


def test_nop_only_on_paragraph_end(mark_pages):
    nops = [n for n, t in mark_pages.items() if body_of(t)[0].endswith('\n{{nop}}')]
    assert nops and 160 not in nops
    for n in nops:  # the next page opens a paragraph, so it does not start mid-sentence
        nxt = re.sub(r'^(\{\{MarginNote\|(?:[^{}]|\{\{[^{}]*\}\})*\}\}\s*)+', '', body_of(mark_pages[n + 1])[0])
        assert not re.match(r'[a-zſ]', nxt), (n, nxt[:40])
    assert sum(1 for t in mark_pages.values() if '{{nop}}' in t) == len(nops)


def test_hw_titles_plain(mark_pages):
    assert '{{hws|de|de{{ls}}ert.|title=desert.}}' in mark_pages[115]
    assert '{{hwe|{{ls}}ert.|de{{ls}}ert.|title=desert.}}' in mark_pages[116]
