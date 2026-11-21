"""Moved to rhemes/livecheck.py; run: python3 -I scripts/wikisource/rh.py live-check."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _shim  # noqa: E402

_shim.run(__name__, 'rhemes.livecheck', 'live-check')
