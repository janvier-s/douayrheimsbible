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
    r = subprocess.run(['git', '-C', str(HERE), 'show', f'{BASE}:scripts/wikisource/rhemes/generate.py'],
                       capture_output=True, text=True)
    if r.returncode:
        pytest.skip(f'migration check: commit {BASE[:8]} (the old tables) is not in this clone')
    src = r.stdout
    ns = {}
    for node in ast.parse(src).body:
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name) and node.targets[0].id in PLAIN + CODE_SHAPED:
            exec(compile(ast.Module([node], []), 'old', 'exec'), ns)
    return ns


def config_mismatches(books, old):
    """(book, field) where a book the old tables knew now differs from them. Books added later are not checked."""
    known = set(old['RUNNING']) | set(old['TITLE_END'])
    want = lambda name: dict(
        ocr=old['OCR_SOURCE'].get(name, 'tesseract'), title_end=old['TITLE_END'].get(name),
        argument_page=old['ARGUMENT'].get(name), argument_intros=tuple(old['ARGUMENT_INTROS'].get(name, [0])),
        argument_roman=name in old['ARGUMENT_ROMAN'], first_head_cha=name in old['FIRST_HEAD_CHA'],
        scripture_pages=old['SCRIPTURE_PAGES'].get(name), running=old['RUNNING'].get(name),
        holy_week=old['HOLY_WEEK'].get(name))
    return [(name, f) for name, b in books.items() if name in known
            for f, v in want(name).items() if getattr(b, f) != v]


def override_mismatches(ov, old):
    """Tables that lost or changed an old entry. New entries (a new book) are fine."""
    bad = []
    for n in CODE_SHAPED:
        new, was = ov[n], old[n]
        if isinstance(was, (set, frozenset)):
            ok = was <= new
        elif n == 'SIDE_SC':  # lambdas: same result on a sample
            ok = all(k in new and new[k]('x the Holy Ghost y') == f('x the Holy Ghost y') for k, f in was.items())
        else:
            ok = all(k in new and new[k] == v for k, v in was.items())
        if not ok:
            bad.append(n)
    return bad


def test_config_matches_old_tables():
    from rhemes import config
    assert config_mismatches(config.books(), old_tables()) == []


def test_overrides_match_old_tables():
    from rhemes import overrides
    assert override_mismatches({n: getattr(overrides, n) for n in CODE_SHAPED}, old_tables()) == []


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


def test_migration_checks_allow_a_new_book():
    """Adding a book (PLAYBOOK "Start a new book") must not trip the migration checks."""
    from rhemes import config, overrides
    old = old_tables()
    books = dict(config.books())
    books['1-corinthians'] = config.from_dict('1-corinthians', {'first': 452, 'last': 500, 'running': ['A', 'B'],
                                                                'title_end': 'TO THE CORINTHIANS.'})
    ov = {n: getattr(overrides, n) for n in CODE_SHAPED}
    ov['PAGE_STARTS'] = {**ov['PAGE_STARTS'], ('1-corinthians', 3): 'some words'}
    ov['INNER_ARGUMENT_NOTES'] = ov['INNER_ARGUMENT_NOTES'] | {'Aug. li. 1.'}
    assert config_mismatches(books, old) == []
    assert override_mismatches(ov, old) == []


def test_migration_checks_catch_a_changed_value():
    from rhemes import config, overrides
    old = old_tables()
    books = dict(config.books())
    books['mark'] = books['mark']._replace(title_end='DING TO MARK.')
    ov = {n: getattr(overrides, n) for n in CODE_SHAPED}
    ov['CREND_AT'] = {}
    assert config_mismatches(books, old) == [('mark', 'title_end')]
    assert override_mismatches(ov, old) == ['CREND_AT']


def test_old_tables_skip_without_the_base_commit(monkeypatch):
    monkeypatch.setitem(globals(), 'BASE', '0' * 40)
    with pytest.raises(pytest.skip.Exception):
        old_tables()
