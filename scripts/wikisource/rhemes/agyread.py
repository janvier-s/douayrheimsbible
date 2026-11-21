"""agy (Gemini) reads scan crops; Claude reads only what agy is not trusted on.

    rh.py agy key                    the answer key from Mark–John (reconcile/agy-key.jsonl)
    rh.py agy calibrate              agy's accuracy per model, prompt and kind (reconcile/agy-calibration.json)
    rh.py agy read BOOK --chapters A-B --use MODEL:PROMPT --out FILE

Spec: docs/superpowers/specs/2026-11-21-agy-scan-reading-design.md.
"""
import re
from pathlib import Path

from PIL import Image

from . import sources as O
from .transkribus import PAGE_W

SCALE = 1.4  # PLAYBOOK: letter shapes need about 1.4x; 0.5-0.85x misleads
MACRONS = set('āēīōūȳĀĒĪŌŪȲ') | {'̄'}


def kinds(word):
    """The features a reading of this word must get right: wvv, macron, longs, else wording."""
    k = set()
    if re.search('w|vv', word, re.I):
        k.add('wvv')
    if MACRONS & set(word):
        k.add('macron')
    if 'ſ' in word:
        k.add('longs')
    return k or {'wording'}


def page_image(book, page, pages_dir=None):
    pages_dir = Path(pages_dir or O.TK)
    for d in (pages_dir / book, pages_dir / f'{book}-argument'):
        if (d / f'{page}.jpg').exists():
            return d / f'{page}.jpg'
    raise FileNotFoundError(f'{book} {page}: no page image under {pages_dir}')


def crop(book, page, box, pages_dir=None):
    """The word's box (PAGE_W frame) padded by one box height each side, at SCALE times the scan."""
    im = Image.open(page_image(book, page, pages_dir))
    f = im.width / PAGE_W
    l, t, w, h = box
    x0, y0 = max(0, round((l - h) * f)), max(0, round((t - h) * f))
    x1, y1 = min(im.width, round((l + w + h) * f)), min(im.height, round((t + 2 * h) * f))
    c = im.crop((x0, y0, x1, y1))
    return c.resize((round(c.width * SCALE), round(c.height * SCALE)), Image.LANCZOS)
