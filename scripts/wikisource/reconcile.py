"""Moved to rhemes/reconcile.py; run: python3 -I scripts/wikisource/rh.py reconcile."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _shim  # noqa: E402

_shim.run(__name__, 'rhemes.reconcile', 'reconcile')
