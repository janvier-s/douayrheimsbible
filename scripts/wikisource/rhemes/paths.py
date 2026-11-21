"""Where things are. Every module takes its paths from here, so moving a file never breaks one."""
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
HERE = REPO / 'scripts/wikisource'
RH = HERE / 'rh.py'
WS = REPO / 'wikisource/1582-rhemes-nt'
PAGES = WS / 'pages'
MANIFEST = WS / 'manifest.json'
BOOKS_JSON = WS / 'books.json'
DATA = REPO / 'static/data/odr-original'
DATA_ODR = REPO / 'static/data/odr'
