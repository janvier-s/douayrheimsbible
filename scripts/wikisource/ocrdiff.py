"""Moved to rhemes/ocrdiff.py; run: python3 -I scripts/wikisource/rh.py diff ocr."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _shim  # noqa: E402

_shim.run(__name__, 'rhemes.ocrdiff', 'diff ocr')
