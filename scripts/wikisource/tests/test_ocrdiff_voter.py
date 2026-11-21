"""The third OCR voter: Apple Vision (.vision.tsv) where it exists, else Tesseract."""
import json

from rhemes import ocrdiff, sources as O

HEAD = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'


def _tsv(path, word):
    path.write_text(HEAD + '1\t1\t0\t0\t0\t0\t0\t0\t1897\t2710\t-1\t\n'
                    f'5\t1\t1\t1\t1\t1\t400\t500\t100\t40\t90\t{word}\n')


def _book(tmp_path, monkeypatch, vision):
    tk, scan = tmp_path / 'tk', tmp_path / 'scan'
    (tk / 'acts').mkdir(parents=True)
    (scan / 'acts').mkdir(parents=True)
    (tk / 'acts/manifest.json').write_text(json.dumps([{'id': 'pdf317'}]))
    _tsv(tk / 'acts/pdf317.tsv', 'transkribus')
    _tsv(tk / 'acts/pdf317.tess.tsv', 'tesseract')
    if vision:
        _tsv(tk / 'acts/pdf317.vision.tsv', 'vision')
    monkeypatch.setattr(O, 'TK', tk)
    monkeypatch.setattr(O, 'SCAN', scan)


def test_third_voter_prefers_vision(tmp_path, monkeypatch):
    _book(tmp_path, monkeypatch, vision=True)
    [(pid, body, _)] = ocrdiff.ocr_pages('acts', 'ts')
    assert pid == 'pdf317' and [w[0] for w in body] == ['vision']
    assert [w[0] for w in ocrdiff.ocr_pages('acts', 'tk')[0][1]] == ['transkribus']


def test_third_voter_falls_back_to_tesseract(tmp_path, monkeypatch):
    _book(tmp_path, monkeypatch, vision=False)
    assert [w[0] for w in ocrdiff.ocr_pages('acts', 'ts')[0][1]] == ['tesseract']


def test_book_without_transkribus_votes_vision_against_tesseract(tmp_path, monkeypatch):
    """Matthew: Vision on the sancta scan in the 'tk' slot, Tesseract in 'ts'; a repeated page is read once."""
    scan, img = tmp_path / 'scan', tmp_path / 'img'
    for ch in (1, 2):
        (scan / 'matthew' / str(ch)).mkdir(parents=True)
        (img / 'matthew' / str(ch) / 'hires').mkdir(parents=True)
    _tsv(scan / 'matthew/1/1.tsv', 'tesseract')
    (scan / 'matthew/1/1.txt').write_text('page one')
    _tsv(scan / 'matthew/2/1.tsv', 'tesseract')
    (scan / 'matthew/2/1.txt').write_text('page one')  # chapter 2 starts on the same page
    _tsv(img / 'matthew/1/hires/1.vision.tsv', 'vision')
    monkeypatch.setattr(O, 'TK', tmp_path / 'tk')
    monkeypatch.setattr(O, 'SCAN', scan)
    monkeypatch.setattr(O, 'IMG', img)
    [(pid, body, _)] = ocrdiff.ocr_pages('matthew', 'tk')
    assert pid == '1/1' and [w[0] for w in body] == ['vision']
    assert [w[0] for w in ocrdiff.ocr_pages('matthew', 'ts')[0][1]] == ['tesseract']


def test_add_xml_reads_the_xml_word_by_context():
    rows = [dict(ctx='ſwine. AND when he [was] come downe from the'), dict(ctx='no such [context] anywhere at all'), dict()]
    ocrdiff.add_xml('matthew', rows)
    assert [r['xml'] for r in rows] == ['vvas', '', '']
