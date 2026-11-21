"""The odr-data lock (RULES §6.2): a folder in the git common dir, made with mkdir, so only one
writer touches the data or the pages at a time. In a worktree the common dir is the main checkout's .git."""
import contextlib
import os
import subprocess
from pathlib import Path

from . import paths


class LockHeld(RuntimeError):
    pass


def lock_path():
    if os.environ.get('RHEMES_LOCK'):  # tests point it elsewhere
        return Path(os.environ['RHEMES_LOCK'])
    common = subprocess.run(['git', '-C', str(paths.REPO), 'rev-parse', '--git-common-dir'],
                            capture_output=True, text=True, check=True).stdout.strip()
    return (paths.REPO / common).resolve() / 'odr-data.lock'


@contextlib.contextmanager
def data_lock(path=None):
    """Hold the lock for the block; refuse (never wait, never remove it) when someone else holds it."""
    path = Path(path) if path else lock_path()
    try:
        path.mkdir()
    except FileExistsError:
        raise LockHeld(f'data lock held: {path} (another writer, or a crash: check, then rmdir it)') from None
    try:
        yield path
    finally:
        path.rmdir()
