"""rhemes.lock: the odr-data lock (RULES §6.2) as a context manager."""
import subprocess
from pathlib import Path

import pytest

from rhemes import lock

HERE = Path(__file__).resolve().parents[1]


def test_lock_held_inside_and_released_after(tmp_path):
    p = tmp_path / 'odr-data.lock'
    with lock.data_lock(p):
        assert p.is_dir()
    assert not p.exists()


def test_lock_released_on_error(tmp_path):
    p = tmp_path / 'odr-data.lock'
    with pytest.raises(ValueError):
        with lock.data_lock(p):
            raise ValueError('boom')
    assert not p.exists()


def test_lock_refuses_when_held(tmp_path):
    p = tmp_path / 'odr-data.lock'
    p.mkdir()
    with pytest.raises(lock.LockHeld, match='data lock held'):
        with lock.data_lock(p):
            pass
    assert p.is_dir()  # someone else's lock is never removed


def test_lock_path_is_common_dir():
    common = subprocess.run(['git', '-C', str(HERE), 'rev-parse', '--git-common-dir'],
                            capture_output=True, text=True, check=True).stdout.strip()
    assert lock.lock_path() == (HERE / common).resolve() / 'odr-data.lock'


def test_adopt_takes_no_lock():
    import inspect
    from rhemes import ladder
    assert list(inspect.signature(ladder.adopt).parameters) == ['files', 'decisions', 'ov']


def test_reconcile_write_holds_the_lock(monkeypatch, tmp_path):
    """reconcile write must hold the data lock while it writes pages."""
    from rhemes import reconcile
    p = tmp_path / 'odr-data.lock'
    seen = []
    monkeypatch.setattr(reconcile, 'lock_path', lambda: p)
    monkeypatch.setattr(reconcile, 'generate_book', lambda book, out: out)
    monkeypatch.setattr(reconcile, 'write_pages', lambda *a: seen.append(p.is_dir()) or [])
    monkeypatch.setattr(reconcile.sources, 'manifest', lambda: {})
    reconcile.cmd_write('mark')
    assert seen == [True] and not p.exists()
