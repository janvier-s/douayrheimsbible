"""agy (Gemini) reads scan crops; Claude reads only what agy is not trusted on.

    rh.py agy key                    the answer key from Mark–John (reconcile/agy-key.jsonl)
    rh.py agy calibrate              agy's accuracy per model, prompt and kind (reconcile/agy-calibration.json)
    rh.py agy read BOOK --chapters A-B --use MODEL:PROMPT --out FILE

Spec: docs/superpowers/specs/2026-11-21-agy-scan-reading-design.md.
"""
import hashlib
import io
import json
import re
import subprocess
import tempfile
import unicodedata
from pathlib import Path

from PIL import Image

from . import sources as O
from .transkribus import PAGE_W

CACHE = Path.home() / 'facsimiles/agy-cache'
BATCH = 30
BAND = (0.25, 0.95)  # the part of a Transkribus box that holds its line (checked on John pdf244)
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
    """The word's box (PAGE_W frame) padded by one box height left and right, at SCALE times the scan.

    Vertically only the band BAND of the box: Transkribus boxes are about 1.7 lines tall with the word
    in their lower part, so the full box shows the lines above and below."""
    im = Image.open(page_image(book, page, pages_dir))
    f = im.width / PAGE_W
    l, t, w, h = box
    x0, y0 = max(0, round((l - h) * f)), max(0, round((t + BAND[0] * h) * f))
    x1, y1 = min(im.width, round((l + w + h) * f)), min(im.height, round((t + BAND[1] * h) * f))
    c = im.crop((x0, y0, x1, y1))
    return c.resize((round(c.width * SCALE), round(c.height * SCALE)), Image.LANCZOS)


# ---------------------------------------------------------------- calling agy

_RULES = ('Each image NN.png shows a printed word from a book of 1582; read only the word in the middle of the image. Use only the image-reading tool. '
          'Transcribe each word exactly as printed, letter for letter: keep the long s as ſ, keep u and v as '
          'printed, write a double v as two letters vv when the print has two letters, write a stroke over a '
          'letter as a macron (ā ē ī ō ū), keep the printed punctuation. Do not correct or modernise spelling.')
PROMPTS = {
    'plain': _RULES,
    'targeted': _RULES + (' Look closely at three things in every word. Is each double-u one letter w, or two '
                          'letters vv printed side by side? Is there a stroke over any letter, and over which '
                          'letter? Is any s a long ſ?'),
}
SCHEMA = {'type': 'object', 'required': ['items'], 'properties': {'items': {'type': 'array', 'items': {
    'type': 'object', 'required': ['n', 'reading'],
    'properties': {'n': {'type': 'integer'}, 'reading': {'type': 'string'}, 'notes': {'type': 'string'}}}}}}


class AgyError(Exception):
    pass


def call_agy(model, prompt, image_dir):
    """agy's [{n, reading}] for the numbered images in image_dir; AgyError on a failed run or bad JSON."""
    cmd = ['agy', '--model', model, '--add-dir', str(image_dir), '--mode', 'accept-edits',
           '-p', f'{prompt} The images are in {image_dir}. Answer with one item per image, n = its number.',
           '--output-format', 'json', '--json-schema', json.dumps(SCHEMA)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if r.returncode:
        raise AgyError(f'agy exit {r.returncode}: {r.stderr[-300:]}')
    try:
        out = json.loads(r.stdout)
        out = out.get('structured_output', out.get('result', out)) if isinstance(out, dict) else out
        out = json.loads(out) if isinstance(out, str) else out
        return [dict(n=int(x['n']), reading=str(x['reading'])) for x in out['items']]
    except (ValueError, KeyError, TypeError) as e:
        raise AgyError(f'agy output: {e}: {r.stdout[:300]}')


def _png(im):
    b = io.BytesIO()
    im.save(b, 'PNG')
    return b.getvalue()


def read_batch(items, model, prompt, run, cache=CACHE):
    """{item id: NFC reading or None} for up to BATCH items ({id, image}); answers cached per item."""
    cache = Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    pngs = {it['id']: _png(it['image']) for it in items}
    ck = {i: cache / (hashlib.sha1(f'{model}|{PROMPTS[prompt]}|{run}|'.encode() + b).hexdigest() + '.json')
          for i, b in pngs.items()}
    out = {i: json.loads(ck[i].read_text())['reading'] for i in pngs if ck[i].exists()}
    todo = [i for i in pngs if i not in out]
    if todo:
        with tempfile.TemporaryDirectory() as d:
            for k, i in enumerate(todo, 1):
                (Path(d) / f'{k:02d}.png').write_bytes(pngs[i])
            try:
                got = {a['n']: a['reading'] for a in call_agy(model, PROMPTS[prompt], d)}
            except AgyError:
                got = None
        for k, i in enumerate(todo, 1):
            r = got.get(k) if got is not None else None
            out[i] = unicodedata.normalize('NFC', r) if r is not None else None
            if out[i] is not None:   # a failed call or a missing answer is asked again next time
                ck[i].write_text(json.dumps({'reading': out[i]}, ensure_ascii=False))
    return out


def read_all(items, model, prompt, cache=CACHE, runs=2, batch=BATCH):
    """{item id: [reading of run 1, run 2, …]}, in batches of `batch`."""
    out = {it['id']: [] for it in items}
    for run in range(1, runs + 1):
        for k in range(0, len(items), batch):
            for i, r in read_batch(items[k:k + batch], model, prompt, run, cache).items():
                out[i].append(r)
    return out
