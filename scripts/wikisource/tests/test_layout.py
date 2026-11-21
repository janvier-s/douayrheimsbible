"""Phase 5 exit (spec §5): scripts/wikisource/ holds only the package, rh.py, the shims and the tests,
and no doc a person follows names a deleted script."""
import importlib.util
import re
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]  # scripts/wikisource
REPO = HERE.parents[1]
LIVE_DOCS = [REPO / 'AGENTS.md', REPO / '.prettierignore', *(REPO / 'wikisource/1582-rhemes-nt').glob('*.md')]
SHIM_TARGET = re.compile(r"_shim\.run\(__name__, '([\w.]+)'")
CACHES = {'__pycache__', '.pytest_cache'}
SHIM_MAX_LINES = 25  # the longest shim (an old-argv adapter) is 17


def is_shim(p):
    """A shim imports _shim, forwards with _shim.run, defines nothing and stays short: anything more is a script."""
    text = p.read_text()
    return ('import _shim' in text and SHIM_TARGET.search(text) is not None
            and not re.search(r'^\s*(def|class) ', text, re.M) and text.count('\n') <= SHIM_MAX_LINES)


def layout_problems(d):
    """Names in d that are not rhemes/, tests/, rh.py, _shim.py, a shim or a cache."""
    bad = []
    for p in sorted(d.iterdir()):
        if p.name in CACHES or p.name in ('rhemes', 'tests', 'rh.py', '_shim.py'):
            continue
        if not (p.is_file() and p.suffix == '.py' and is_shim(p)):
            bad.append(p.name)
    return bad


SHIM = "import _shim\n\n_shim.run(__name__, 'rhemes.lint', 'lint')\n"


def test_layout_problems_flags_one_offs(tmp_path):
    for name in ('rhemes', 'tests', '__pycache__', '.pytest_cache'):
        (tmp_path / name).mkdir()
    (tmp_path / 'rh.py').write_text('')
    (tmp_path / '_shim.py').write_text('')
    (tmp_path / 'lint.py').write_text(SHIM)
    assert layout_problems(tmp_path) == []
    (tmp_path / 'notes.txt').write_text('')
    (tmp_path / '.scratch').mkdir()
    (tmp_path / 'fat.py').write_text('def fix():\n    pass\n' + SHIM)
    (tmp_path / 'long.py').write_text('x = 1\n' * 30 + SHIM)
    (tmp_path / 'mention.py').write_text('# import _shim\nprint(1)\n')
    assert layout_problems(tmp_path) == ['.scratch', 'fat.py', 'long.py', 'mention.py', 'notes.txt']


def test_scripts_dir_holds_only_package_rh_shims_tests():
    assert layout_problems(HERE) == []


def test_every_shim_target_exists():
    """Found, not imported: rhemes.ornaments needs numpy/scipy, which are optional."""
    shims = [p for p in HERE.glob('*.py') if is_shim(p)]
    assert len(shims) == 19
    for p in shims:
        assert importlib.util.find_spec(SHIM_TARGET.search(p.read_text()).group(1)), p.name


def test_docs_name_no_deleted_script():
    deleted = re.findall(r'`scripts/wikisource/(\w+\.py)`', (REPO / 'docs/archive/scripts.md').read_text())
    assert len(deleted) == 19
    for doc in LIVE_DOCS:
        text = doc.read_text()
        assert [d for d in deleted if d in text] == [], doc
