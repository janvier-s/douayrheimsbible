import subprocess
from pathlib import Path

import pytest

from rhemes import ocrpages
from rhemes import reconcile

needs_ocr = pytest.mark.skipif(not (ocrpages.TK.exists() and ocrpages.SCAN.exists()), reason='OCR not on this machine')


@needs_ocr
def test_generate_book_uses_books_range(tmp_path):
    out = reconcile.generate_book('mark', tmp_path / 'mark')
    nums = sorted(int(p.stem) for p in out.glob('*.wiki'))
    assert nums[0] == 114 and nums[-1] == 160 and len(nums) == 47


GIT = ['git', '-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false']
PAGE = '<noinclude><pagequality level="1" user="" />{{{{rh|1|X|Y}}}}</noinclude>{body}<noinclude>{foot}</noinclude>\n'


def page(body, foot='{{continues|And}}'):
    return PAGE.format(body=body, foot=foot)


def test_classify_ls():
    assert reconcile.classify('Pa{{ls}}sion', 'Pa{{ls}}{{ls}}ion') == 'ls:ss'
    assert reconcile.classify('Chri{{ls}}t', 'Christ') == 'ls:other'


def test_classify_macron():
    assert reconcile.classify('cōmaunding', 'commaunding') == 'macron'
    assert reconcile.classify('vpō', 'vpon') == 'macron'
    assert reconcile.classify('vpō', 'vpto') == 'text'


def test_classify_space_sc_greek_ornament():
    assert reconcile.classify('them)', 'them )') == 'space'
    assert reconcile.classify('{{sc|Iesvs}}', 'IESVS') == 'sc'
    assert reconcile.classify("''{{lang|grc|Μισθὸς}}''.", "''Μισθὸς.''") == 'greek'
    assert reconcile.classify('{{dropinitial|T|image=X.png|imgsize=9px}}HE', '{{dropinitial|T}}HE') == 'ornament'
    assert reconcile.classify('therfore', 'therefore') == 'text'


def test_word_diffs_head_foot():
    d = reconcile.word_diffs(page('same body', '{{rh||K ij|And}}'), page('same body'), 5)
    assert [(x.page, x.cls) for x in d] == [(5, 'foot')]
    d = reconcile.word_diffs(page('a Pa{{ls}}sion b'), page('a Pa{{ls}}{{ls}}ion b'), 5)
    assert d == [reconcile.Diff(5, 'Pa{{ls}}sion', 'Pa{{ls}}{{ls}}ion', 'ls:ss')]


def test_write_respects_range_and_frozen(tmp_path):
    gen, pages = tmp_path / 'gen', tmp_path / 'pages'
    gen.mkdir(), pages.mkdir()
    for n in (113, 114, 115):
        (gen / f'{n}.wiki').write_text(f'new {n}')
        (pages / f'{n}.wiki').write_text(f'old {n}')
    manifest = {'113': {'status': 'posted'}, '114': {'status': 'posted', 'source': 'frozen'}, '115': {}}
    assert reconcile.write_pages('mark', gen, pages, manifest, rng=(113, 114)) == [113]
    assert [(pages / f'{n}.wiki').read_text() for n in (113, 114, 115)] == ['new 113', 'old 114', 'old 115']


def test_mark_status(tmp_path):
    subprocess.run(GIT + ['init', '-q', str(tmp_path)], check=True)
    (tmp_path / '1.wiki').write_text(page('body one'))
    (tmp_path / '2.wiki').write_text(page('body two'))
    subprocess.run(GIT + ['-C', str(tmp_path), 'add', '.'], check=True)
    subprocess.run(GIT + ['-C', str(tmp_path), 'commit', '-qm', 'base'], check=True)
    base = subprocess.run(['git', '-C', str(tmp_path), 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    (tmp_path / '1.wiki').write_text(page('body ONE'))
    (tmp_path / '2.wiki').write_text(page('body two').replace('level="1" user=""', 'level="3" user="Beardo"'))
    manifest = {'1': {'status': 'posted'}, '2': {'status': 'posted', 'source': 'frozen'}}
    assert reconcile.mark_status(tmp_path, manifest, base) == {1: 'changed'}
    assert manifest == {'1': {'status': 'changed'}, '2': {'status': 'posted', 'source': 'frozen'}}


@needs_ocr
def test_ocr_by_page_matches_generator_numbering():
    tk = reconcile.ocr_by_page('mark', 'transkribus')
    assert min(tk) == 115 and max(tk) == 160
    assert 'CHA. II.' in tk[118]  # transkribus page 4 of Mark (index 3), as generate.py numbers it
    assert min(reconcile.ocr_by_page('john', 'tesseract')) == 244


FROZEN = {*range(1, 31), *range(309, 314), *range(402, 405)}  # Arguments 314-316, 405-409 generated (owner 2026-11-21)


def test_frozen_marked():
    import json
    manifest = json.loads(reconcile.MANIFEST.read_text())
    frozen = {int(k) for k, e in manifest.items() if e.get('source') == 'frozen'}
    assert frozen == FROZEN
    books = reconcile.load_books(reconcile.REPO)
    for b, cfg in books.items():
        assert not FROZEN & set(range(cfg['first'], cfg['last'] + 1)), b
    covered = FROZEN.union(*(range(c['first'], c['last'] + 1) for c in books.values()))
    assert covered == set(range(1, 452))  # every page is generated or frozen


@needs_ocr
def test_ocr_by_page_missing_source_is_empty():
    assert reconcile.ocr_by_page('matthew', 'transkribus') == {}
    assert min(reconcile.ocr_by_page('matthew', 'tesseract')) == 31


def test_verify_decisions_against_pages():
    from rhemes import ladder
    head = '<noinclude><pagequality level="1" user="" />{{rh|1|X|Y}}</noinclude>'
    pages = {216: head + 'the 13 Sunday after Pentecoſt. And it came<noinclude></noinclude>\n',
             217: head + 'his Lords Paſſion beheaded, laſt<noinclude></noinclude>\n'}
    ok = ladder.Decision(ladder.Conflict(216, 'Pentecoſt.', 'Pentecost.', ['13', 'Sunday', 'after'], ['And', 'it', 'came']), 3, 'committed', 'x')
    bad = ladder.Decision(ladder.Conflict(217, 'Paſsion', 'Paſſion', ['his', 'Lords'], ['beheaded,', 'laſt']), 3, 'committed', 'x')
    open4 = ladder.Decision(ladder.Conflict(217, 'a', 'b', [], []), 4, '', 'x')
    assert reconcile.verify_decisions([ok, bad, open4], pages) == [bad]


def test_verify_flags_loser_at_the_place():
    # the winner shows up nearby with two weak context words, but the losing form sits at the place itself
    from rhemes import ladder
    head = '<noinclude><pagequality level="1" user="" />{{rh|1|X|Y}}</noinclude>'
    pages = {300: head + 'great the compaſsion of God. And then the compaſſion of God here<noinclude></noinclude>\n'}
    d = ladder.Decision(ladder.Conflict(300, 'compaſsion', 'compaſſion', ['vvith', 'great', 'the'], ['of', 'God.', 'And']), 3, 'generated', 'x')
    assert reconcile.verify_decisions([d], pages) == [d]
