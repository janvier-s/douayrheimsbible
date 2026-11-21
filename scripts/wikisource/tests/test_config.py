"""Per-book generator config: plain values in books.json (via rhemes.config), code-shaped
patches in rhemes/overrides.py; generate.py keeps none of the book tables (spec §8)."""
import ast
import subprocess
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parents[1]
BASE = '4428ee830021f61b53dacd8a6eb556a43b400240'  # last commit with the tables in generate.py
PLAIN = ['OCR_SOURCE', 'TITLE_END', 'ARGUMENT', 'ARGUMENT_INTROS', 'ARGUMENT_ROMAN', 'FIRST_HEAD_CHA',
         'SCRIPTURE_PAGES', 'RUNNING', 'HOLY_WEEK']
CODE_SHAPED = ['ARGUMENT_TITLES', 'ARGUMENT_BREAKS', 'ARGUMENT_SPLIT', 'INNER_ARGUMENT_NOTES', 'SUMMARY_STARS', 'SIDE_SC',
               'PAREN_TITLES', 'OUTER_NOTES', 'CREND_AT', 'BARS', 'PAGE_STARTS', 'CATCHWORDS', 'SPLIT_WORDS',
               'MANUAL_PARAS', 'NO_PARAS']


def old_tables():
    src = subprocess.run(['git', '-C', str(HERE), 'show', f'{BASE}:scripts/wikisource/rhemes/generate.py'],
                         capture_output=True, text=True, check=True).stdout
    ns = {}
    for node in ast.parse(src).body:
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name) and node.targets[0].id in PLAIN + CODE_SHAPED:
            exec(compile(ast.Module([node], []), 'old', 'exec'), ns)
    return ns


def test_config_matches_old_tables():
    from rhemes import config
    old = old_tables()
    for name, b in config.books().items():
        assert b.ocr == old['OCR_SOURCE'].get(name, 'tesseract'), name
        assert b.title_end == old['TITLE_END'].get(name), name
        assert b.argument_page == old['ARGUMENT'].get(name), name
        assert list(b.argument_intros) == old['ARGUMENT_INTROS'].get(name, [0]), name
        assert b.argument_roman == (name in old['ARGUMENT_ROMAN']), name
        assert b.first_head_cha == (name in old['FIRST_HEAD_CHA']), name
        assert b.scripture_pages == old['SCRIPTURE_PAGES'].get(name), name
        assert b.running == old['RUNNING'].get(name), name
        assert b.holy_week == old['HOLY_WEEK'].get(name), name


def test_overrides_match_old_tables():
    from rhemes import overrides
    old = old_tables()
    for n in CODE_SHAPED:
        if n == 'SIDE_SC':  # lambdas: same keys, same result on a sample
            assert overrides.SIDE_SC.keys() == old[n].keys()
            assert all(overrides.SIDE_SC[k]('x the Holy Ghost y') == old[n][k]('x the Holy Ghost y') for k in old[n])
        else:
            assert getattr(overrides, n) == old[n], n


def test_generator_has_no_book_tables():
    tree = ast.parse((HERE / 'rhemes/generate.py').read_text())
    assigned = {t.id for node in tree.body if isinstance(node, ast.Assign) for t in node.targets if isinstance(t, ast.Name)}
    assert not assigned & set(PLAIN + CODE_SHAPED), assigned & set(PLAIN + CODE_SHAPED)


def test_unknown_key_rejected():
    from rhemes import config
    with pytest.raises(ValueError, match='titel_end'):
        config.from_dict('mark', {'first': 114, 'last': 160, 'titel_end': 'DING TO MARKE.'})


def test_defaults_for_a_new_book():
    from rhemes import config
    b = config.from_dict('1-corinthians', {'first': 452, 'last': 500})
    assert (b.ocr, b.argument_page, b.argument_intros, b.argument_roman, b.holy_week, b.ornaments, b.golden) == \
        ('tesseract', None, (0,), False, None, False, False)
