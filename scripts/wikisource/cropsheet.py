"""Moved to rhemes/cropsheet.py; run: python3 -I scripts/wikisource/rh.py crops."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _shim  # noqa: E402

_shim.run(__name__, 'rhemes.cropsheet', 'crops')
