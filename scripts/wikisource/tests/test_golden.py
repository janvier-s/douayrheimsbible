"""Golden regeneration: for every book marked golden in books.json, generate.py reproduces
the committed pages byte for byte (spec §4.1 exit criterion)."""
import json
from pathlib import Path

import pytest

import ocrpages
import reconcile

REPO = Path(__file__).resolve().parents[3]
BOOKS = json.loads((REPO / 'wikisource/1582-rhemes-nt/books.json').read_text())
PAGES = REPO / 'wikisource/1582-rhemes-nt/pages'


@pytest.mark.slow
@pytest.mark.parametrize('book', sorted(BOOKS))
def test_golden(book, tmp_path):
    cfg = BOOKS[book]
    if not cfg['golden']:
        pytest.skip(f'{book} not reconciled yet')
    if not (ocrpages.TK.exists() and ocrpages.SCAN.exists()):
        pytest.skip('OCR not on this machine')
    out = reconcile.generate_book(book, tmp_path / book)
    bad = [n for n in range(cfg['first'], cfg['last'] + 1)
           if not (out / f'{n}.wiki').exists() or (out / f'{n}.wiki').read_text() != (PAGES / f'{n}.wiki').read_text()]
    assert not bad, f'{book}: {len(bad)} pages differ, first: {bad[:10]}'
