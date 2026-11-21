"""Phase 5 exit (spec §5): scripts/wikisource/ holds only the package, rh.py, the shims and the tests,
and no doc a person follows names a deleted script."""
import importlib.util
import re
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]  # scripts/wikisource
REPO = HERE.parents[1]
LIVE_DOCS = [REPO / 'AGENTS.md', REPO / '.prettierignore', *(REPO / 'wikisource/1582-rhemes-nt').glob('*.md')]
SHIM_TARGET = re.compile(r"_shim\.run\(__name__, '([\w.]+)'")


def is_shim(p):
    return 'import _shim' in p.read_text()


def test_scripts_dir_holds_only_package_rh_shims_tests():
    entries = {p.name for p in HERE.iterdir() if not p.name.startswith('.') and p.name != '__pycache__'}
    assert entries - {'rhemes', 'tests'} == {p.name for p in HERE.glob('*.py')}
    extra = [p.name for p in HERE.glob('*.py') if p.name not in ('rh.py', '_shim.py') and not is_shim(p)]
    assert extra == []


def test_every_shim_target_exists():
    """Found, not imported: rhemes.ornaments needs numpy/scipy, which are optional."""
    shims = [p for p in HERE.glob('*.py') if is_shim(p)]
    assert shims
    for p in shims:
        m = SHIM_TARGET.search(p.read_text())
        assert m, p.name
        assert importlib.util.find_spec(m.group(1)), p.name


def test_docs_name_no_deleted_script():
    deleted = re.findall(r'`scripts/wikisource/(\w+\.py)`', (REPO / 'docs/archive/scripts.md').read_text())
    assert len(deleted) == 19
    for doc in LIVE_DOCS:
        text = doc.read_text()
        assert [d for d in deleted if d in text] == [], doc
