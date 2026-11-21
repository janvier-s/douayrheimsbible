"""rh.py is the one entry point; the old script names are shims onto the rhemes package."""
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
REPO = HERE.parents[1]
RH = str(HERE / 'rh.py')
PAGES = str(REPO / 'wikisource/1582-rhemes-nt/pages')


def test_shim_is_the_module():
    import ladder
    import rhemes.ladder
    assert ladder is rhemes.ladder


def test_rh_lists_commands(tmp_path):
    r = subprocess.run([sys.executable, '-I', RH], cwd=tmp_path, capture_output=True, text=True)
    assert r.returncode == 2
    for cmd in ['generate', 'lint', 'triage', 'diff xml', 'diff ocr', 'reconcile', 'status',
                'fetch', 'live-check', 'post', 'ocr-split', 'crops']:
        assert cmd in r.stdout, cmd


def test_rh_runs_isolated_from_elsewhere(tmp_path):
    r = subprocess.run([sys.executable, '-I', RH, 'lint', PAGES, '--only', 'E-loss', '--quiet'],
                       cwd=tmp_path, env={'PATH': os.environ['PATH'], 'HOME': os.environ['HOME']}, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-500:]
    assert '0 error(s)' in r.stdout


def test_old_name_prints_new_command(tmp_path):
    old = subprocess.run([sys.executable, '-I', str(HERE / 'lint.py'), PAGES, '--quiet'],
                         cwd=tmp_path, capture_output=True, text=True)
    new = subprocess.run([sys.executable, '-I', RH, 'lint', PAGES, '--quiet'],
                         cwd=tmp_path, capture_output=True, text=True)
    assert 'rh.py lint' in old.stderr
    assert old.stdout == new.stdout


def test_package_imports_are_relative():
    """A bare `import ladder` inside rhemes/ works only through the shim, which Phase 5 deletes."""
    import re
    names = {p.stem for p in (HERE / 'rhemes').glob('*.py')} | {'xml_json_diff', 'check_live_edits'}
    bad = [f'{p.name}:{i}' for p in (HERE / 'rhemes').glob('*.py')
           for i, line in enumerate(p.read_text().splitlines(), 1)
           if (m := re.match(r'\s*(?:from|import) (\w+)\b', line)) and m.group(1) in names]
    assert not bad, bad


def test_usage_texts_name_rh_commands():
    """Module docstrings are printed as usage; they name rh.py commands, not the old scripts."""
    import ast
    import re
    old = re.compile(r'(?:scripts/wikisource/|^\s*(?:[Uu]sage:\s*)?)(triage|reconcile|lint|generate|wikipost|wikifetch|'
                     r'check_live_edits|ocrdiff|xml_json_diff|transkribus|cropsheet)\.py\b', re.M)
    bad = [(p.name, m.group(0)) for p in (HERE / 'rhemes').glob('*.py')
           for m in old.finditer(ast.get_docstring(ast.parse(p.read_text())) or '')]
    assert not bad, bad
