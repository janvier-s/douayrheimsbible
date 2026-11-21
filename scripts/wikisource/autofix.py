"""Moved to rhemes/detectors/stars.py; run: python3 -I scripts/wikisource/rh.py detect stars BOOK TOKENS.json A-B.

It now proposes ledger entries and writes no data: review them, append them to
fixes/BOOK.jsonl, then run rh.py fix apply BOOK --write. Old form: REPO BOOK TOKENS A-B [--write]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _shim  # noqa: E402

if __name__ == '__main__':
    if '--write' in sys.argv:
        print('--write is gone: the detector only proposes entries (see rh.py fix apply)', file=sys.stderr)
    a = [x for x in sys.argv[1:] if x != '--write']
    sys.argv[1:] = ['stars', *a[1:], '--repo', a[0]] if a else ['stars']
_shim.run(__name__, 'rhemes.detectors.stars', 'detect stars')
