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


def fin(s, **kw):
    import generate
    return generate.sc_wiki(generate.finish(s, **kw))


def test_caps_to_sc():
    assert fin('IESVS said') == '{{sc|Iesvs}} said'
    assert fin('{{MOUTER|THE GOSPEL vpon Munday.}}') == '{{MOUTER|{{sc|The gospel}} vpon Munday.}}'
    assert fin('{{MOUTER|MVNDAY.}}And') == '{{MOUTER|{{sc|Mvnday}}.}}And'
    assert fin('CHAP. XII. ANNOT.') == 'CHAP. XII. ANNOT.'
    assert fin('S. Peter and A man') == 'S. Peter and A man'
    assert 'ſ' not in fin('MESSIAS')  # owner 2026-11-21: no long-s inside small caps (capitals have none)


def test_dropcap_rest_small_caps():
    import generate
    generate.BOOK = 'mark'
    assert fin('{{verse|chapter=1|verse=1}}THE beginning', dropcap=True, ch=1) == \
        '{{dropinitial|T|fl={{verse|chapter=1|verse=1}}}}{{sc|He}} beginning'
    assert fin('{{verse|chapter=12|verse=1}}AT that time', dropcap=True, ch=12).startswith(
        '{{dropinitial|A|fl={{verse|chapter=12|verse=1}}}}{{sc|T}} that')
    assert fin('{{verse|chapter=2|verse=1}}And it', dropcap=True, ch=2) == \
        '{{dropinitial|A|fl={{verse|chapter=2|verse=1}}}}nd it'


def test_greek_lang():
    import generate
    assert generate.greek_lang("''Μισθὸς.''") == "''{{lang|grc|Μισθὸς}}.''"
    assert generate.greek_lang('λατρεύσεις.') == '{{lang|grc|λατρεύσεις}}.'
    assert generate.greek_lang("''Μετανοεῖν. Μετάνοια.''") == "''{{lang|grc|Μετανοεῖν. Μετάνοια}}.''"
    assert generate.greek_lang('no greek here') == 'no greek here'


def test_tidy_space():
    import generate
    assert generate.tidy_space('them )') == 'them)'
    assert generate.tidy_space('erre , and') == 'erre, and'
    assert generate.tidy_space('( so') == '(so'
    assert generate.tidy_space('{{verse|chapter=1|verse=2}} And') == '{{verse|chapter=1|verse=2}} And'
    assert generate.tidy_space('end.\n\nNext') == 'end.\n\nNext'


def test_caps_abbreviations_stay():
    assert fin('SS. Peter and Paul') == 'SS. Peter and Paul'


def test_no_nested_sc(mark_pages):
    assert not [n for n, t in mark_pages.items() if '{{sc|{{sc|' in t]


def test_dropcap_rest_not_merged():
    import generate
    generate.BOOK = 'matthew'
    assert fin('{{verse|chapter=2|verse=1}}WHEN IESVS', dropcap=True, ch=2).endswith('}}{{sc|Hen}} {{sc|Iesvs}}')
