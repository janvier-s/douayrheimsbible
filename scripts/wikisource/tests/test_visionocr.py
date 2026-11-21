"""rh.py ocr-vision: Apple Vision OCR (.vision.tsv) beside each page image that lacks one."""
import shutil
import sys

import pytest

from rhemes import visionocr


def test_pending_finds_images_without_vision_tsv(tmp_path):
    (tmp_path / 'acts').mkdir()
    (tmp_path / 'mark/1').mkdir(parents=True)
    for p in ('acts/pdf317.jpg', 'acts/pdf318.jpg', 'mark/1/1.jpg'):
        (tmp_path / p).write_bytes(b'')
    (tmp_path / 'acts/pdf318.vision.tsv').write_text('')
    assert visionocr.pending([tmp_path]) == [tmp_path / 'acts/pdf317.jpg', tmp_path / 'mark/1/1.jpg']
    assert len(visionocr.pending([tmp_path], force=True)) == 3
    assert visionocr.pending([tmp_path / 'acts/pdf318.jpg'], force=True) == [tmp_path / 'acts/pdf318.jpg']


def test_binary_is_cached_by_source_hash(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr(visionocr, 'CACHE', tmp_path)
    monkeypatch.setattr(visionocr.subprocess, 'run',
                        lambda cmd, **kw: calls.append(cmd) or open(cmd[cmd.index('-o') + 1], 'w').close())
    a = visionocr.binary()
    assert visionocr.binary() == a and len(calls) == 1
    assert visionocr.SRC.read_bytes()[:2] == b'//' and a.parent == tmp_path


@pytest.mark.skipif(sys.platform != 'darwin' or not shutil.which('swiftc'), reason='needs macOS swiftc')
def test_main_reads_a_page(tmp_path):
    img = tmp_path / 'p.jpg'
    pytest.importorskip('PIL')
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new('RGB', (800, 200), 'white')
    ImageDraw.Draw(im).text((40, 60), 'vvhich', fill='black', font=ImageFont.load_default(size=80))
    im.save(img)
    assert visionocr.main([str(tmp_path)]) == 0
    rows = [l.split('\t') for l in (tmp_path / 'p.vision.tsv').read_text().splitlines()]
    assert rows[1][:2] == ['1', '1'] and [r[11] for r in rows if r[0] == '5'] == ['vvhich']


def test_ocr_split_reads_new_pages_with_vision(tmp_path, monkeypatch, capsys):
    from rhemes import transkribus
    (tmp_path / 'acts').mkdir()
    (tmp_path / 'acts/pdf317.jpg').write_bytes(b'')
    monkeypatch.setattr(transkribus, 'split', lambda *a: ({'acts': []}, []))
    got = []
    monkeypatch.setattr(visionocr, 'run', lambda imgs: got.extend(imgs) or len(imgs))
    transkribus.main(['strips', 'xml', str(tmp_path)])
    assert got == [tmp_path / 'acts/pdf317.jpg'] and 'vision: 1 of 1' in capsys.readouterr().out
    got.clear()
    transkribus.main(['strips', 'xml', str(tmp_path), '--no-vision'])
    assert got == []
