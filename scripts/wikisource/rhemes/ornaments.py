"""Find, crop and clean the woodcut ornaments in the 1582 Rhemes NT scans.

Ornaments: the drop-cap initial at verse 1 of every chapter, the headpiece banner on each
book's first page, and the tailpiece at the end of each book. Woodcuts are much denser ink
than type, so they are found as dense blobs in a smoothed ink map. Nothing is redrawn:
cleaning is deskew-free levels + threshold + despeckle; potrace then vectorises the
cleaned bitmap.

  uv run --with numpy,scipy,pillow python scripts/wikisource/rh.py ornaments detect OUT [book...]
  uv run --with numpy,scipy,pillow python scripts/wikisource/rh.py ornaments clean OUT
  uv run --with numpy,scipy,pillow python scripts/wikisource/rh.py ornaments sheet OUT
  uv run --with numpy,scipy,pillow,scikit-image python scripts/wikisource/rh.py ornaments dedupe OUT
"""
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

from . import paths

SCANS = Path.home() / 'facsimiles/sancta'
REPO = paths.REPO
DATA = REPO / 'static/data/odr-original'
NT = ['matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1-corinthians', '2-corinthians',
      'galatians', 'ephesians', 'philippians', 'colossians', '1-thessalonians',
      '2-thessalonians', '1-timothy', '2-timothy', 'titus', 'philemon', 'hebrews', 'james',
      '1-peter', '2-peter', '1-john', '2-john', '3-john', 'jude', 'apocalypse']
Q = 4  # work at 1/Q scale
# Chapters whose cap page has no usable OCR: a hand-placed anchor (the word right of the
# cap: x, y, height in hires px); box_left_of still finds the woodcut's edges.
ANCHORS = {('luke', 10): ((9, 5), dict(x=605, y=1735, w=60, h=40, t='ND')),
           ('2-corinthians', 8): ((8, 1), dict(x=767, y=652, w=60, h=36, t='ND'))}
# Bad crops (clipped, or type glued on), each matched by template to a clean print of the
# same woodblock (see `dedupe`); pages use that block's file, so no hand box is needed.
SAME_AS = {'luke-03': 'luke-12', 'acts-09': 'luke-05', 'luke-10': 'mark-15',
           'john-04': 'romans-06', 'mark-12': '1-timothy-04', 'acts-04': '2-thessalonians-02',
           '2-john-01': '1-corinthians-05', '2-corinthians-02': '2-thessalonians-02',
           'apocalypse-01': '1-corinthians-05', '1-thessalonians-05': 'luke-05'}
# Crops the detector gets wrong: an exact hires box, ((chdir, page), [x0, y0, x1, y1]).
BOXES = {}


def ink_map(path):
    im = Image.open(path).convert('L')
    small = np.asarray(im.resize((im.width // Q, im.height // Q), Image.BILINEAR), dtype=float)
    # paper tone, survives page shading: median on a coarse grid, then upsampled
    coarse = ndi.median_filter(small[::4, ::4], size=11)
    bg = ndi.zoom(coarse, (small.shape[0] / coarse.shape[0], small.shape[1] / coarse.shape[1]),
                  order=1)[:small.shape[0], :small.shape[1]]
    ink = small < bg * 0.62
    return im, ink


def blobs(ink, win=7, dens=0.25):
    """Components of the region whose local ink density exceeds dens, closed and filled so a
    woodcut with open areas stays one blob."""
    d = ndi.uniform_filter(ink.astype(float), size=win)
    m = ndi.binary_fill_holes(ndi.binary_closing(d > dens, iterations=3))
    lab, n = ndi.label(m)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        area = (lab[sl] == i).sum()
        out.append(dict(x0=x0, y0=y0, x1=x1, y1=y1, w=x1 - x0, h=y1 - y0,
                        solid=area / ((x1 - x0) * (y1 - y0)),
                        ink=float(ink[sl].mean())))
    return out


def classify(b, W, H, last_page):
    w, h = b['w'], b['h']
    if w < 25 or h < 25:
        return None
    ar = w / h
    cx = (b['x0'] + b['x1']) / 2 / W
    if w > 0.45 * W and 18 < h < 90 and b['y0'] < 0.3 * H and b['solid'] > 0.5:
        return 'headpiece'
    if 0.6 < ar < 1.6 and 28 <= w <= 110 and b['solid'] > 0.55:
        if last_page and 0.38 < cx < 0.62 and w > 60 and b['y0'] > 0.25 * H:
            return 'tailpiece'
        return 'initial'
    if last_page and 0.38 < cx < 0.62 and 0.5 < ar < 2.2 and w >= 60 and b['y0'] > 0.25 * H:
        return 'tailpiece'
    return None


OCR = Path.home() / 'facsimiles/ocr-2026-11-12/sancta-scan'


def norm(s):
    s = s.lower().replace('ſ', 'f').replace('vv', 'w').replace('v', 'u').replace('j', 'i')
    return re.sub(r'[^a-z]', '', s)


def verse1(book, ch):
    b = json.loads((DATA / f'{book}.json').read_text())
    for c in b['chapters']:
        if c['chapter'] == ch:
            return re.sub(r'<(na|cr|nb)>[^<]*</\1>|<[^>]*>|\[[^\]]*\]', '', c['verses'][0]['text']).strip()
    return ''


def ocr_lines(book, ch, pg):
    f = OCR / book / str(ch) / f'{pg}.tsv'
    if not f.exists():
        return []
    lines = {}
    for row in f.read_text().splitlines()[1:]:
        c = row.split('\t')
        if len(c) < 12 or c[0] != '5' or not c[11].strip():
            continue
        key = tuple(c[1:5])
        lines.setdefault(key, []).append(dict(x=int(c[6]), y=int(c[7]), w=int(c[8]), h=int(c[9]),
                                              t=c[11]))
    return [sorted(v, key=lambda t: t['x']) for v in lines.values()]


def find_anchors(book, ch, spots):
    """OCR words that could sit just right of the drop cap (verse 1 minus its first letter),
    best first: (score, page, token, inc). inc: OCR read the woodcut letter into the word."""
    v = verse1(book, ch)
    m = re.search(r'[A-Za-z]', v)
    if not m:
        return []
    want = norm(v[m.end():])[:14]
    word = norm(v.split()[0]) if v.split() else ''
    rest = word[1:]
    out, weak = [], []
    for spot in spots:
        for line in ocr_lines(book, *spot):
            first = next((t for t in line if norm(t['t'])), None)
            if first and rest and norm(first['t']).startswith(rest):
                weak.append((0.3, spot, first, False, None))  # fallback: "ND ..." at line start
            best = None
            for i, tok in enumerate(line):
                if not norm(tok['t']):
                    continue  # stray dot or verse number before the word
                got = norm(''.join(t['t'] for t in line[i:i + 6]))[:len(want)]
                if len(got) < 6:
                    continue
                r = difflib.SequenceMatcher(None, want, got).ratio()
                inc = len(word) > 1 and norm(tok['t']).startswith(word)
                if inc:
                    r -= 0.1
                if best is None or r > best[0]:
                    nxt = next((t for t in line[i + 1:] if norm(t['t'])), None)
                    best = (r, spot, tok, inc, nxt)
            if best and best[0] >= 0.5:
                out.append(best)
    return sorted(out, key=lambda c: -c[0])[:8] + weak


def initial_box(book, ch, spots):
    """First anchor candidate with a square, dense woodcut to its left. spots: (chdir, page)."""
    ims = {}

    def load(spot):
        if spot not in ims:
            im = Image.open(SCANS / book / str(spot[0]) / 'hires' / f'{spot[1]}.jpg').convert('L')
            ims[spot] = (im, np.asarray(im, dtype=float), np.percentile(np.asarray(im), 90))
        return ims[spot]

    def test(spot, tok, inc):
        im, g, p90 = load(spot)
        box = box_left_of(g, tok, inc)
        if box is None:
            return None
        x0, y0, x1, y1 = box
        w, h = x1 - x0, y1 - y0
        dens = (g[y0:y1, x0:x1] < p90 * 0.6).mean()
        if min(w, h) >= 140 and h >= 2.5 * tok['h'] and dens >= 0.22 and 0.75 < w / h < 1.33 \
                and min(x0, y0) > 20 and x1 < g.shape[1] - 20:  # not the dark scan edge
            return box
        return None

    for r, spot, tok, inc, nxt in find_anchors(book, ch, spots):
        for t in (tok, nxt):  # the best token can be OCR junk read off the woodcut
            if t is None:
                continue
            box = test(spot, t, inc and t is tok)
            if box:
                return spot, load(spot)[0], box, round(r, 2)
    # last resort, OCR too garbled to match: every line start with a woodcut to its left,
    # ranked by how much its line resembles verse 1
    want = norm(verse1(book, ch))[1:40]
    best = None
    for spot in spots:
        for line in ocr_lines(book, *spot):
            toks = [t for t in line if norm(t['t'])][:2]
            for t in toks:
                if not 20 <= t['h'] <= 70:
                    continue
                box = test(spot, t, False)
                if box:
                    got = norm(''.join(x['t'] for x in line))[:len(want)]
                    r = difflib.SequenceMatcher(None, want, got).ratio()
                    if best is None or r > best[0]:
                        best = (r, spot, box)
                    break
    if best:
        return best[1], load(best[1])[0], best[2], round(best[0] - 1, 2)  # negative: weak
    return None


def run_around(prof, lo, hi, thr=0.03, gap=2):
    """Extend [lo, hi) over prof while values stay above thr, bridging gaps of <= gap."""
    n = len(prof)
    while True:
        k = next((j for j in range(lo - 1, max(-1, lo - 2 - gap), -1) if prof[j] > thr), None)
        if k is None:
            break
        lo = k
    while True:
        k = next((j for j in range(hi, min(n, hi + 1 + gap)) if prof[j] > thr), None)
        if k is None:
            break
        hi = k + 1
    return lo, hi


def box_left_of(g, tok, inc):
    """The woodcut just left of tok. A blob seeds it; its edges are then pushed out to the
    white gap that always separates a block from text (every row and column inside a woodcut
    carries ink: the frame), so pale halves and tops above the first text line are kept."""
    right = tok['x'] + tok['w'] if inc else tok['x'] - 6
    top = max(0, tok['y'] - 200)
    bottom = min(g.shape[0], tok['y'] + 600)
    off = max(0, right - 650)
    win = g[top:bottom:2, off:right:2]  # half res
    bg = np.percentile(win, 90)
    ink = win < bg * 0.6
    m = ndi.binary_fill_holes(ndi.binary_closing(ink, iterations=3))
    lab, n = ndi.label(m)
    sy0, sy1 = (tok['y'] - top) // 2, (tok['y'] + tok['h'] - top) // 2
    best = None
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if sl[0].stop < sy0 or sl[0].start > sy1 or h < 1.5 * tok['h'] / 2 or w < 30:
            continue
        if not inc and win.shape[1] - sl[1].stop > 60:  # must sit next to the anchor
            continue
        if best is None or h * w > best[0]:
            best = (h * w, sl)
    if best is None:
        return None
    sl = best[1]
    # seed: the component's columns, rows of the anchor line
    x0, x1 = sl[1].start, sl[1].stop
    y0, y1 = max(sl[0].start, sy0), min(sl[0].stop, sy1 + 1)
    for _ in range(3):
        y0, y1 = run_around(ink[:, x0:x1].mean(axis=1), y0, y1)
        x0, x1 = run_around(ink[y0:y1, :].mean(axis=0), x0, x1)
    sw, sh = sl[1].stop - sl[1].start, sl[0].stop - sl[0].start
    if not (0.8 < (x1 - x0) / max(1, y1 - y0) < 1.25) or (x1 - x0) > 1.5 * sw \
            or (y1 - y0) > 1.5 * max(sw, sh):
        # grew into the page (no white gap): keep the seed blob
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
    # the blocks are square: a taller box still has a text line glued on
    if (y1 - y0) > 1.1 * (x1 - x0):
        y1 = y0 + (x1 - x0)
    return [max(0, off + 2 * x0 - 4), max(0, top + 2 * y0 - 4), off + 2 * x1 + 4, top + 2 * y1 + 4]


def chapters(book):
    d = SCANS / book
    return sorted((int(p.name) for p in d.iterdir() if p.name.isdigit()), key=int)


def pages(book, ch):
    d = SCANS / book / str(ch) / 'hires'
    return sorted((int(p.stem) for p in d.glob('*.jpg')), key=int)


def first_letter(book, ch):
    b = json.loads((DATA / f'{book}.json').read_text())
    import re
    for c in b['chapters']:
        if c['chapter'] == ch:
            t = re.sub(r'<(na|cr|nb)>[^<]*</\1>|<[^>]*>|\[[^\]]*\]', '', c['verses'][0]['text'])
            m = re.search(r'[A-Za-z]', t)
            return m.group(0).upper() if m else '?'
    return '?'


def crop(im, b, pad=3):
    x0, y0 = max(0, (b['x0'] - pad) * Q), max(0, (b['y0'] - pad) * Q)
    x1, y1 = min(im.width, (b['x1'] + pad) * Q), min(im.height, (b['y1'] + pad) * Q)
    return im.crop((x0, y0, x1, y1)), [x0, y0, x1, y1]


def words_in(book, chdir, pg, box):
    """Real OCR words (3+ letters) centred inside a full-res box: text, not woodcut."""
    x0, y0, x1, y1 = box
    return sum(1 for line in ocr_lines(book, chdir, pg) for t in line
               if len(norm(t['t'])) >= 3 and x0 < t['x'] + t['w'] / 2 < x1
               and y0 < t['y'] + t['h'] / 2 < y1)


def trim_text_rows(g, box):
    """Cut a text line glued under (or over) a cap at the first near-blank row: the frame's
    sides keep every row inside a woodcut inked."""
    x0, y0, x1, y1 = box
    cut = g[y0:y1, x0:x1]
    ink = (cut < np.percentile(cut, 90) * 0.6).mean(axis=1)
    h = len(ink)
    for y in range(int(h * 0.7), h):  # first blank row below the woodcut, not the padding
        if ink[y] < 0.012:
            y1 = y0 + y
            break
    for y in range(0, int(h * 0.2)):
        if ink[y] < 0.012:
            y0 = y0 + y + 1
    return [x0, y0, x1, y1]


def blob_initial(book, spots):
    """No text anchor: the largest square dense blob with no OCR words in it, left of centre."""
    best = None
    for chdir, pg in spots:
        im, ink = ink_map(SCANS / book / str(chdir) / 'hires' / f'{pg}.jpg')
        H, W = ink.shape
        for b in blobs(ink):
            w, h = b['w'], b['h']
            if not (0.75 < w / h < 1.33 and min(w, h) >= 35 and b['solid'] > 0.5
                    and (b['x0'] + b['x1']) / 2 < 0.6 * W):
                continue
            box = [b['x0'] * Q, b['y0'] * Q, b['x1'] * Q, b['y1'] * Q]
            if words_in(book, chdir, pg, box) > 2:
                continue
            if best is None or w * h > best[0]:
                best = (w * h, (chdir, pg), b)
    if best is None:
        return None
    _, spot, b = best
    im = Image.open(SCANS / book / str(spot[0]) / 'hires' / f'{spot[1]}.jpg').convert('L')
    return spot, im, crop(im, b)[1], 0.0


def detect(out, books):
    out = Path(out)
    (out / 'raw').mkdir(parents=True, exist_ok=True)
    found = []
    for book in books:
        chs = chapters(book)
        for ch in chs:
            pgs = pages(book, ch)
            got_initial = False
            spots = [(ch, p) for p in pgs[:3]]
            if ch != chs[0]:
                spots += [(ch - 1, p) for p in pages(book, ch - 1)[-2:][::-1]]
            if (book, ch) in BOXES:
                spot, bx = BOXES[(book, ch)]
                im = Image.open(SCANS / book / str(spot[0]) / 'hires' / f'{spot[1]}.jpg').convert('L')
                ib = (spot, im, bx, 1.0)
            elif (book, ch) in ANCHORS:
                spot, tok = ANCHORS[(book, ch)]
                im = Image.open(SCANS / book / str(spot[0]) / 'hires' / f'{spot[1]}.jpg').convert('L')
                bx = box_left_of(np.asarray(im, dtype=float), tok, False)
                ib = (spot, im, bx, 1.0) if bx else None
            else:
                ib = initial_box(book, ch, spots) or blob_initial(book, spots)
            if ib:
                (chdir, pg), im, box, score = ib
                g = np.asarray(im, dtype=float)
                box = trim_text_rows(g, [int(v) for v in box])
                # blocks run slightly wider than tall (median h/w 0.95): taller means type
                # touching the woodcut's foot with no blank row between
                if box[3] - box[1] > 1.02 * (box[2] - box[0]):
                    box[3] = box[1] + round(0.97 * (box[2] - box[0]))
                    box = trim_text_rows(g, box)
                name = f'{book}-{ch:02d}-initial'
                im.crop(box).save(out / 'raw' / f'{name}.png')
                found.append(dict(name=name, kind='initial', book=book, chapter=ch, chdir=chdir, page=pg,
                                  box=[int(v) for v in box], letter=first_letter(book, ch),
                                  anchor=round(score, 2)))
                got_initial = True
            todo = pgs[:1] if ch == chs[0] else []
            if ch == chs[-1]:  # the folder can run on into the next book: check every page
                todo = list(dict.fromkeys(todo + pgs))
            for pg in todo:
                path = SCANS / book / str(ch) / 'hires' / f'{pg}.jpg'
                im, ink = ink_map(path)
                H, W = ink.shape
                last = ch == chs[-1] and not any(
                    f['book'] == book and f['kind'] == 'tailpiece' for f in found)
                for b in blobs(ink):
                    kind = classify(b, W, H, last)
                    if kind not in ('headpiece', 'tailpiece'):
                        continue
                    if kind == 'headpiece' and ch != chs[0]:
                        continue
                    if kind == 'tailpiece' and any(
                            f['kind'] == 'initial' and f['book'] == book and f.get('chdir') == ch
                            and f['page'] == pg and f['box'][1] < (b['y1'] * Q)
                            and f['box'][3] > b['y0'] * Q for f in found):
                        continue  # that is the chapter's initial, not a tailpiece
                    if kind == 'headpiece' and pg != pgs[0]:
                        continue
                    if words_in(book, ch, pg, [b['x0'] * Q, b['y0'] * Q, b['x1'] * Q, b['y1'] * Q]) > (
                            6 if kind == 'headpiece' else 2):
                        continue  # a block of small type
                    name = f'{book}-{kind}'
                    if any(f['name'] == name for f in found):
                        name += f'-p{pg}'
                    c, box = crop(im, b)
                    c.save(out / 'raw' / f'{name}.png')
                    found.append(dict(name=name, kind=kind, book=book, chapter=ch, page=pg,
                                      box=box, letter=None))
            if not got_initial:
                found.append(dict(name=f'{book}-{ch:02d}-initial', kind='initial', book=book,
                                  chapter=ch, page=None, box=None, missing=True,
                                  letter=first_letter(book, ch)))
        print(book, sum(1 for f in found if f['book'] == book and not f.get('missing')),
              'found,', sum(1 for f in found if f['book'] == book and f.get('missing')), 'missing',
              file=sys.stderr)
    mf = out / 'manifest.json'
    old = json.loads(mf.read_text()) if mf.exists() else []
    keep = [f for f in old if f['book'] not in books]
    mf.write_text(json.dumps(keep + found, indent=1))


def clean_one(src, dst_png, dst_svg):
    im = Image.open(src).convert('L')
    a = np.asarray(im, dtype=float)
    bg = np.percentile(a, 95)
    a = a / max(bg, 1) * 255  # flatten paper to white
    t = otsu(a)
    bw = a < t
    lab, n = ndi.label(bw)
    sizes = ndi.sum(bw, lab, range(1, n + 1))
    bw &= np.isin(lab, 1 + np.flatnonzero(sizes >= 15))  # despeckle
    Image.fromarray(np.where(bw, 0, 255).astype(np.uint8)).save(dst_png)
    pbm = dst_png.with_suffix('.pbm')
    Image.fromarray(np.where(bw, 0, 255).astype(np.uint8)).convert('1').save(pbm)
    subprocess.run(['potrace', '-s', '-t', '4', '-a', '1.0', '-O', '0.2', str(pbm), '-o', str(dst_svg)],
                   check=True)
    pbm.unlink()


def otsu(a):
    h, e = np.histogram(a.clip(0, 255), bins=256, range=(0, 256))
    p = h / h.sum()
    w = np.cumsum(p)
    mu = np.cumsum(p * np.arange(256))
    s = (mu[-1] * w - mu) ** 2 / (w * (1 - w) + 1e-12)
    return int(np.argmax(s))


def clean(out):
    out = Path(out)
    (out / 'clean').mkdir(exist_ok=True)
    (out / 'svg').mkdir(exist_ok=True)
    for f in json.loads((out / 'manifest.json').read_text()):
        if f.get('missing'):
            continue
        clean_one(out / 'raw' / f"{f['name']}.png", out / 'clean' / f"{f['name']}.png",
                  out / 'svg' / f"{f['name']}.svg")


def sheet(out, which='raw', cell=150, cols=10):
    """Contact sheets, cell px per item, labelled; one image per 60 items."""
    out = Path(out)
    items = json.loads((out / 'manifest.json').read_text())
    font = ImageFont.load_default()
    per = cols * 7
    for s in range(0, len(items), per):
        chunk = items[s:s + per]
        rows = (len(chunk) + cols - 1) // cols
        img = Image.new('L', (cols * cell, rows * (cell + 14)), 255)
        d = ImageDraw.Draw(img)
        for k, f in enumerate(chunk):
            x, y = (k % cols) * cell, (k // cols) * (cell + 14)
            label = f"{f['name'].replace('-initial', '')} {f.get('letter') or ''}"
            if f.get('missing'):
                d.rectangle((x + 4, y + 4, x + cell - 4, y + cell - 4), outline=0)
                d.text((x + 10, y + cell // 2), 'MISSING', fill=0, font=font)
            else:
                t = Image.open(out / which / f"{f['name']}.png").convert('L')
                t.thumbnail((cell - 6, cell - 6))
                img.paste(t, (x + 3, y + 3))
            d.text((x + 3, y + cell), label[:24], fill=0, font=font)
        img.save(out / f'sheet-{which}-{s // per + 1:02d}.png')


def signature(path):
    """Ink-bbox-normalised, blurred 40x40 thumbnail, so crop padding does not matter."""
    a = np.asarray(Image.open(path).convert('L'), dtype=float) < 128
    ys, xs = np.nonzero(a)
    if len(ys) == 0:
        return None
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    t = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((40, 40), Image.BILINEAR),
                   dtype=float)
    t = ndi.gaussian_filter(t, 1.2)
    t -= t.mean()
    return t.ravel() / (np.linalg.norm(t) + 1e-9)


def merge_by_template(out, groups, thresh=0.5):
    """Signatures split one block when impressions differ in inking. Merge same-letter groups
    whose prints match by template (centre of one found in the other, native scale: one press,
    one scan resolution). Same block scores 0.7-0.87, different blocks under 0.35."""
    from skimage.feature import match_template

    def load(n):
        im = Image.open(out / 'clean' / f'{n}.png').convert('L')
        return np.asarray(im.resize((im.width // 3, im.height // 3), Image.BILINEAR), dtype=float)

    def score(a, b):
        best = 0.0
        for x, y in ((a, b), (b, a)):
            h, w = x.shape
            t = x[int(h * .2):int(h * .8), int(w * .2):int(w * .8)]
            if t.shape[0] < y.shape[0] and t.shape[1] < y.shape[1]:
                best = max(best, float(match_template(y, t).max()))
        return best

    cache = {}
    merged = True
    while merged:
        merged = False
        for i in range(len(groups)):
            for j in range(i + 1, len(groups)):
                a, b = groups[i], groups[j]
                if a['kind'] != b['kind'] or not (
                        a['letter'] == b['letter'] or {a['letter'], b['letter']} == {'V', 'W'}):
                    continue
                # inking varies a lot between impressions: compare a spread of prints
                pa = a['members'][::max(1, len(a['members']) // 4)][:4]
                pb = b['members'][::max(1, len(b['members']) // 4)][:4]
                for n in pa + pb:
                    if n not in cache:
                        cache[n] = load(n)
                if max(score(cache[x], cache[y]) for x in pa for y in pb) > thresh:
                    # a V/W match means a V block: the data spells that W as VV (Romans 4
                    # prints V-woodcut + VHAT), and a two-stroke W block cannot match a V
                    if a['letter'] != b['letter']:
                        a['letter'] = 'V'
                    a['members'] += b['members']
                    del groups[j]
                    merged = True
                    break
            if merged:
                break
    return groups


def dedupe(out, thresh=0.6):
    """Group ornaments cut from the same woodblock: same kind and letter, similar signature.
    Each group's representative is its sharpest-looking member (most ink detail)."""
    out = Path(out)
    items = [f for f in json.loads((out / 'manifest.json').read_text()) if not f.get('missing')]
    vec = {f['name']: signature(out / 'clean' / f"{f['name']}.png") for f in items}
    groups = []
    for f in items:
        v = vec[f['name']]
        if v is None:
            continue
        # headpieces and tailpieces: no letter to keep the loose signature honest, so they
        # are grouped by template only (merge_by_template)
        scored = [(max(float(vec[n] @ v) for n in g['members']), g) for g in groups
                  if g['kind'] == f['kind'] == 'initial' and g['letter'] == f.get('letter')]
        sc, g = max(scored, key=lambda x: x[0], default=(0, None))
        if g is not None and sc > thresh:
            g['members'].append(f['name'])
        else:
            groups.append(dict(kind=f['kind'], letter=f.get('letter'), members=[f['name']]))
    groups = merge_by_template(out, groups)
    # bad crops join their matched block and never represent it
    bad = {f'{k}-initial': f'{v}-initial' for k, v in SAME_AS.items()}
    for g in groups:
        g['members'] = [n for n in g['members'] if n not in bad]
    groups = [g for g in groups if g['members']]
    for b, target in bad.items():
        g = next(g for g in groups if target in g['members'])
        g.setdefault('bad_crops', []).append(b)
    count = {}
    for g in groups:
        key = (g['kind'], g['letter'])
        count[key] = count.get(key, 0) + 1
        g['block'] = f"{g['kind']}-{(g['letter'] or '')}{count[key]}".replace('--', '-')
        # representative: the most typical member (closest to the group mean), which skips
        # crops with a text line glued on or an over-inked impression
        g['uses'] = len(g['members']) + len(g.get('bad_crops', []))
        mean = sum(vec[n] for n in g['members'])
        g['best'] = max(g['members'], key=lambda n: float(vec[n] @ mean))
    (out / 'blocks.json').write_text(json.dumps(groups, indent=1))
    print(len(items), 'ornaments,', len(groups), 'distinct blocks', file=sys.stderr)
    # contact sheet of block representatives
    cell, cols = 110, 12
    rows = (len(groups) + cols - 1) // cols
    img = Image.new('L', (cols * cell, rows * (cell + 14)), 255)
    d = ImageDraw.Draw(img)
    for k, g in enumerate(groups):
        t = Image.open(out / 'clean' / f"{g['best']}.png").convert('L')
        t.thumbnail((cell - 6, cell - 6))
        x, y = (k % cols) * cell, (k // cols) * (cell + 14)
        img.paste(t, (x + 3, y + 3))
        d.text((x + 3, y + cell), f"{g['block']} x{g['uses']}", fill=0)
    img.save(out / 'sheet-blocks.png')

# What each woodblock shows, keyed by its first use (block numbers shift between runs).
# Plain descriptions of what is visible; nothing is identified beyond that.
MOTIFS = {
    'matthew-01': 'a bird and a human head', 'matthew-02': 'foliage',
    'matthew-03': 'a bearded man', 'matthew-05': 'scrolling foliage with grotesque heads',
    'matthew-06': 'leafy sprays', 'matthew-07': 'two horned animals',
    'matthew-11': 'two satyrs', 'matthew-20': 'an urn and foliage',
    'luke-01': 'heads among foliage', 'john-14': 'a dragon', 'john-15': 'foliage',
    'acts-22': 'a grotesque mask', 'acts-25': 'scrolling foliage',
    'romans-01': 'flowers and foliage', 'romans-02': 'a hooded figure',
    'romans-04': 'a grotesque mask and flowers', 'romans-12': 'an old man in a cap',
    'romans-13': 'a standing child', '1-corinthians-04': 'scrolling foliage',
    '1-corinthians-06': 'a mask among foliage', '2-corinthians-07': 'a seated figure',
    '2-corinthians-09': 'a lion', 'galatians-03': 'a bearded head',
    'galatians-05': 'interlaced foliage', 'ephesians-06': 'a lion mask',
    'philippians-01': 'a bird', 'colossians-04': 'leafy sprays',
    '1-thessalonians-04': 'leafy sprays', 'hebrews-01': 'two figures among vines',
    'hebrews-04': 'flowers and foliage', 'hebrews-06': 'a bearded old man',
    'james-05': 'leafy sprays', '1-peter-04': 'a lion', '1-john-04': 'a child',
    'apocalypse-07': 'leafy sprays',
}
FIGURED = {'matthew-01', 'matthew-03', 'matthew-05', 'matthew-07', 'matthew-11', 'luke-01',
           'john-14', 'acts-22', 'romans-02', 'romans-04', 'romans-12', 'romans-13',
           '1-corinthians-06', '2-corinthians-07', '2-corinthians-09', 'galatians-03',
           'ephesians-06', 'philippians-01', 'hebrews-01', 'hebrews-06', '1-peter-04',
           '1-john-04'}
PX_SCALE = 22 / 52  # Wikisource px per hires-scan px (line pitch 22 vs 52)
TITLE = "''The New Testament of Iesus Christ''"
BOOK_NAMES = {b: b.replace('-', ' ').title().replace('Apocalypse', 'Apocalypse (Revelation)')
              for b in NT}


def where(name):
    """'matthew-11-initial' -> ('Matthew 11', 'matthew', 11)."""
    stem = name.rsplit('-', 1)[0]
    book, _, ch = stem.rpartition('-')
    if ch.isdigit():
        return f"{BOOK_NAMES[book]} {int(ch)}", book, int(ch)
    return BOOK_NAMES[stem], stem, None


def ordered(g):
    """A block's prints in NT order, bad crops included."""
    return sorted(g['members'] + g.get('bad_crops', []),
                  key=lambda n: (NT.index(where(n)[1]), where(n)[2] or 0))


def block_id(g):
    """Stable across reruns (block numbers are not): kind + first use."""
    return f"{g['kind']} {ordered(g)[0].rsplit('-', 1)[0]}"


def review(out):
    """review.html: every print of every block, to rank the best (top 3) or mark none good.
    Export saves review.json; put it in OUT and rerun `commons` to upload your #1 picks."""
    out = Path(out)
    blocks = json.loads((out / 'blocks.json').read_text())
    data = []
    for g in blocks:
        names = ordered(g)
        key = names[0].rsplit('-', 1)[0]
        if g['kind'] == 'initial':
            title = f"{g['letter']} with {MOTIFS.get(key, '?')}"
            short = f"{g['letter']} · {MOTIFS.get(key, '?')}"
        else:
            title = f"{g['kind'].title()} first used in {where(names[0])[0]}"
            short = where(names[0])[0]
        prints = []
        for n in names:
            w, h = Image.open(out / 'raw' / f'{n}.png').size
            prints.append(dict(name=n, where=where(n)[0], raw=f'raw/{n}.png', clean=f'clean/{n}.png',
                               w=w, h=h, bad=n in g.get('bad_crops', [])))
        data.append(dict(id=block_id(g), first=names[0], kind=g['kind'], letter=g['letter'],
                         title=title, short=short, auto=g['best'], prints=prints))
    order = {'initial': 0, 'headpiece': 1, 'tailpiece': 2}
    data.sort(key=lambda b: (order[b['kind']], b['letter'] or '', -len(b['prints'])))
    html = (Path(__file__).parent / 'ornaments_review.html').read_text()
    (out / 'review.html').write_text(html.replace('/*DATA*/null', json.dumps(data)))
    print(out / 'review.html', file=sys.stderr)


def commons(out):
    """One upload per woodblock: <out>/commons/<File name>.png (the cleaned print chosen in
    dedupe), <File name>.wiki (description page), and map.json (chapter/book -> file name)
    for generate.py."""
    out = Path(out)
    dst = out / 'commons'
    dst.mkdir(exist_ok=True)
    blocks = json.loads((out / 'blocks.json').read_text())
    man = {f['name']: f for f in json.loads((out / 'manifest.json').read_text())}
    rv = json.loads((out / 'review.json').read_text()) if (out / 'review.json').exists() else {}
    used, cmap, seen = {}, {'initial': {}, 'headpiece': {}, 'tailpiece': {}}, set()
    todo, none = [], []
    for g in blocks:
        r = rv.get(block_id(g), {})
        if r.get('picks'):
            g['best'] = r['picks'][0]  # your #1 print
        elif r.get('verdict') == 'none':
            none.append(block_id(g))
        elif r.get('verdict') != 'auto':
            todo.append(block_id(g))
        names = sorted(g['members'] + g.get('bad_crops', []),
                       key=lambda n: (NT.index(where(n)[1]), where(n)[2] or 0))
        first = names[0]
        label, book, ch = where(first)
        uses = ', '.join(where(n)[0] for n in names)
        if g['kind'] == 'initial':
            key = first.rsplit('-', 1)[0]
            motif = MOTIFS[key]
            fname = f"Rhemes New Testament 1582 initial {g['letter']}, {motif}.png"
            what = f"Woodcut decorated initial {g['letter']} with {motif}"
            cats = [f"Decorative letters/{g['letter']}"]
            if key in FIGURED:
                cats.append('Historiated initials')
        else:
            fname = f"Rhemes New Testament 1582 {g['kind']} ({label}).png"
            what = 'Woodcut headpiece (ornamental band)' if g['kind'] == 'headpiece' \
                else 'Woodcut tailpiece (fleuron)'
            cats = ['Headpieces (book illustration)' if g['kind'] == 'headpiece'
                    else 'Tailpieces (book illustration)', 'Fleurons']
        if fname in seen:
            raise SystemExit(f'duplicate file name {fname}: make the motif more specific')
        seen.add(fname)
        n = len(names)
        took = where(g['best'])[0]
        where_txt = (f"Used at {uses}." if g['kind'] == 'initial'
                     else f"Used in {uses}.")
        desc = f"""=={{{{int:filedesc}}}}==
{{{{Information
|description={{{{en|1={what}, from {TITLE} (Rhemes: Iohn Fogny, 1582), the Rheims New Testament. Printed from the same woodblock {n} time{'s' if n > 1 else ''} in this volume. {where_txt}
Cleaned from the scan: paper tone flattened to white and thresholded to black and white; no lines added, removed or redrawn.}}}}
|date=1582
|source={{{{Extracted from|File:1582 Rhemes New Testament.pdf}}}} (print from {took}, Boston Public Library copy, [https://archive.org/details/nevvtestamentofi00mart archive.org])
|author=Unknown woodcutter; printed by Iohn Fogny (Jean de Foigny), Rheims
|permission=
|other versions=
}}}}

=={{{{int:license-header}}}}==
{{{{PD-scan|PD-old-100-expired}}}}

[[Category:Douay-Rheims Bible]]
[[Category:1582 books from France]]
[[Category:16th-century woodcuts]]
""" + ''.join(f'[[Category:{c}]]\n' for c in cats)
        Image.open(out / 'clean' / f"{g['best']}.png").save(dst / fname, optimize=True)
        (dst / (fname[:-4] + '.wiki')).write_text(desc)
        bw = Image.open(out / 'clean' / f"{g['best']}.png").size[0]
        for nm in names:
            f = man[nm]
            # print lines are ~52 px apart in the hires scans and ~22 px on Wikisource:
            # show each woodcut at the print's scale, so a cap spans the lines it spans there
            size = f'{round(bw * PX_SCALE / 5) * 5}px'
            if g['kind'] == 'initial':
                cmap['initial'][f"{f['book']}/{f['chapter']}"] = dict(
                    file=fname, letter=g['letter'], imgsize=size)
            else:
                cmap[g['kind']][f['book']] = dict(file=fname, width=size)
        used[fname] = n
    (dst / 'map.json').write_text(json.dumps(cmap, indent=1))
    (REPO / 'wikisource/1582-rhemes-nt/ornaments.json').write_text(
        json.dumps(cmap, indent=1, sort_keys=True) + '\n')
    print(len(used), 'files in', dst, file=sys.stderr)
    if rv:
        print(f'not reviewed: {len(todo)}; marked none good (auto pick used): {none}', file=sys.stderr)


def main(argv=None):
    cmd, out, *rest = sys.argv[1:] if argv is None else argv
    if cmd == 'detect':
        detect(out, rest or NT)
    elif cmd == 'clean':
        clean(out)
    elif cmd == 'sheet':
        sheet(out, rest[0] if rest else 'raw', *map(int, rest[1:])) 
    elif cmd == 'dedupe':
        dedupe(out)
    elif cmd == 'commons':
        commons(out)
    elif cmd == 'review':
        review(out)
