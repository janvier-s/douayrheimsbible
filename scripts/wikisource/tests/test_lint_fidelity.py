import subprocess
import sys
from pathlib import Path

import pytest

import fidelity
import lint

LINT = str(Path(__file__).resolve().parents[1] / 'lint.py')
GIT = ['git', '-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false']


def fid(rows):
    return [r for r in rows if r[0] in ('E-loss', 'E-shift')]


@pytest.fixture
def git_pages(tmp_path):
    subprocess.run(GIT + ['init', '-q', str(tmp_path)], check=True)
    (tmp_path / '1.wiki').write_text('Pa{{ls}}{{ls}}ion')
    subprocess.run(GIT + ['-C', str(tmp_path), 'add', '.'], check=True)
    subprocess.run(GIT + ['-C', str(tmp_path), 'commit', '-qm', 'base'], check=True)
    (tmp_path / '1.wiki').write_text('Passion')
    return tmp_path


def test_lint_flags_long_s_loss(git_pages):
    assert 'E-shift' in {c for c, n, m in lint.lint(git_pages, fidelity.parse_overrides([]))}


def test_lint_override_clears(git_pages):
    ov = fidelity.parse_overrides(['--allow-shift', 'ls:1', '--reason', 'test'])
    assert not fid(lint.lint(git_pages, ov))


def test_lint_no_baseline(tmp_path, git_pages):
    (tmp_path / 'plain').mkdir()
    (tmp_path / 'plain' / '1.wiki').write_text('Passion')
    assert not fid(lint.lint(tmp_path / 'plain', fidelity.parse_overrides([])))
    (git_pages / '2.wiki').write_text('Passion')  # untracked new page in a repo
    assert not [r for r in fid(lint.lint(git_pages, fidelity.parse_overrides([]))) if r[1] == 2]


def test_cli_exit_codes(git_pages):
    run = lambda *extra: subprocess.run([sys.executable, '-I', LINT, str(git_pages), '--quiet', '--only', 'E-loss,E-shift', *extra], capture_output=True, text=True)
    assert run().returncode == 1
    assert run('--allow-shift', 'ls:*', '--reason', 'r').returncode == 0
    assert run('--allow-shift', 'ls:*').returncode != 0
