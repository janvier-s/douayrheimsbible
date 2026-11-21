"""Moved to rhemes/wikipost.py; run: python3 -I scripts/wikisource/rh.py post."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _shim  # noqa: E402

_shim.run(__name__, 'rhemes.wikipost', 'post')
