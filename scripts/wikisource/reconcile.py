"""Reconcile the committed Wikisource pages with generate.py (spec §4.1).

python3 -I scripts/wikisource/reconcile.py diff|ladder|adopt|write|status ...
"""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from generate import load_books  # noqa: E402

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
WS = REPO / 'wikisource/1582-rhemes-nt'
PAGES = WS / 'pages'
MANIFEST = WS / 'manifest.json'
LIVE_BASE = '494f0400'  # the commit whose pages equal the live pages (docs/audits/2026-11-20-live-vs-committed.md)


def generate_book(book, out, ornaments=None):
    """Run generate.py for the book's books.json range into out; returns out."""
    cfg = load_books(REPO)[book]
    out = Path(out)
    cmd = [sys.executable, '-I', str(HERE / 'generate.py'), str(REPO), book, str(cfg['first']), str(out)]
    if ornaments:
        cmd.append('--ornaments')
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f'generate.py {book} failed:\n{r.stderr[-1500:]}')
    return out
