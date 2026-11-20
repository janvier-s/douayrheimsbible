from pathlib import Path

import pytest

import ocrpages
import reconcile

needs_ocr = pytest.mark.skipif(not (ocrpages.TK.exists() and ocrpages.SCAN.exists()), reason='OCR not on this machine')


@needs_ocr
def test_generate_book_uses_books_range(tmp_path):
    out = reconcile.generate_book('mark', tmp_path / 'mark')
    nums = sorted(int(p.stem) for p in out.glob('*.wiki'))
    assert nums[0] == 114 and nums[-1] == 160 and len(nums) == 47
