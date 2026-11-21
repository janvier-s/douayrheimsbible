"""agyread: crops, agy batches, the answer key, scoring and routing (agy itself is never called)."""
import csv
import os
from pathlib import Path

import pytest
from PIL import Image

from rhemes import agyread, ocrdiff, sources as O
from rhemes.transkribus import PAGE_W

REPO = Path(__file__).resolve().parents[3]


# ---------------------------------------------------------------- Task 1: kinds, crops, word boxes

def test_kinds():
    assert agyread.kinds('vvhich') == {'wvv'}
    assert agyread.kinds('ſhevved') == {'wvv', 'longs'}
    assert agyread.kinds('vpō') == {'macron'}
    assert agyread.kinds('Lord') == {'wording'}


def test_crop_pads_scales_and_maps_page_frame(tmp_path):
    """Boxes are in the PAGE_W frame: a page image twice that wide doubles them, then 1.4x."""
    (tmp_path / 'acts').mkdir()
    Image.new('L', (2 * PAGE_W, 3000), 255).save(tmp_path / 'acts/pdf314.jpg')
    im = agyread.crop('acts', 'pdf314', (100, 200, 60, 40), pages_dir=tmp_path)
    assert im.size == (round((60 + 2 * 40) * 2 * 1.4), round(3 * 40 * 2 * 1.4))


def test_crop_finds_argument_pages(tmp_path):
    (tmp_path / 'john-argument').mkdir()
    Image.new('L', (PAGE_W, 2000), 255).save(tmp_path / 'john-argument/pdf242.jpg')
    assert agyread.crop('john', 'pdf242', (100, 200, 60, 40), pages_dir=tmp_path).size[0] > 0


def test_crop_clamps_at_page_edge(tmp_path):
    (tmp_path / 'acts').mkdir()
    Image.new('L', (PAGE_W, 2000), 0).save(tmp_path / 'acts/pdf314.jpg')
    im = agyread.crop('acts', 'pdf314', (0, 0, 60, 40), pages_dir=tmp_path)
    assert im.size == (round((60 + 40) * 1.4), round(2 * 40 * 1.4))
    assert im.getextrema() == (0, 0)  # only page pixels, no padding fill


@pytest.mark.skipif(not os.environ.get('RH_AGY_SLOW') or not (O.TK / 'john/manifest.json').exists(),
                    reason='runs diff ocr on all of John (~4 min): set RH_AGY_SLOW=1; needs the John Transkribus split')
def test_word_boxes_match_the_findings_rows(tmp_path):
    """word_boxes and a fresh run() agree on page and box for every body row that has one."""
    ocrdiff.run('john', tmp_path)
    rows = [r for r in csv.DictReader(open(tmp_path / 'john-findings.tsv'), delimiter='\t')
            if r['cls'] in ('w_for_vv', 'vv_for_w', 'word') and r['box'] and ':' in r['loc']]
    wb = ocrdiff.word_boxes('john')
    hits = 0
    for r in rows:
        v = wb.get((r['loc'], r['data'], int(r['occ'])))
        if v and len(v['box']) == 4 and ' ' not in v['tk']:   # one OCR word: run() boxes the first only
            hits += 1
            assert (v['page'], ','.join(map(str, v['box']))) == (r['page'], r['box']), r
    assert hits >= 50

