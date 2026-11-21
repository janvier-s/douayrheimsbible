"""Loaders for every source the tools read: A16049.xml, the data, the pages, the manifest, books.json and the OCR.

The OCR part (formerly ocrpages.py) reads the sancta-scan OCR for one book into a global page list.

Each chapter folder holds its scan pages 1..n. A chapter that starts mid-page
shares that page with the chapter before, so identical pages are merged.
For each page we keep the body lines: lines wide enough to be the text column
(the margins hold short lines), in reading order, with an indent flag.
"""
from pathlib import Path
import functools, hashlib, json, os, re

from . import paths

SCAN = Path.home() / 'facsimiles/ocr-2026-11-12/sancta-scan'
IMG = Path.home() / 'facsimiles/sancta'
# Per-page Transkribus OCR written by transkribus.py (same TSV layout, page frame).
TK = Path.home() / 'facsimiles/transkribus/pages'


def xml_path():
    """A16049.xml (EEBO-TCP, literal ſ): RHEMES_XML if set, else the original-douay-rheims-nt repo's copy."""
    env = os.environ.get('RHEMES_XML')
    return Path(env) if env else Path.home() / 'Documents/Bible-n-stuff/original-douay-rheims-nt/A16049.xml'


@functools.lru_cache(maxsize=2)
def _read(path):
    return Path(path).read_text()


def xml_text():
    return _read(xml_path())


def load_books(repo=None):
    """Per-book run table from books.json: first/last wiki page, ornaments flag, golden flag."""
    return json.loads(((Path(repo) / paths.BOOKS_JSON.relative_to(paths.REPO)) if repo else paths.BOOKS_JSON).read_text())


def manifest():
    return json.loads(paths.MANIFEST.read_text())


def committed_page(n):
    return (paths.PAGES / f'{n}.wiki').read_text()


def data_files(book, repo=None):
    """The book's odr-original JSON and its annotation files."""
    base = Path(repo) / 'static/data/odr-original' if repo else paths.DATA
    return [base / f'{book}.json', *sorted((base / book / 'annotations').glob('*.json'))]


def read_page_width(tsv):
    """The page width the TSV coordinates are in (its level-1 row)."""
    for line in tsv.read_text(errors='replace').splitlines()[1:3]:
        f = line.split('\t')
        if f[0] == '1':
            return int(f[8])
    return 0


def read_tsv(path):
    words = []
    for line in path.read_text(errors='replace').splitlines()[1:]:
        f = line.split('\t')
        if len(f) < 12 or f[0] != '5' or not f[11].strip():
            continue
        words.append(dict(block=int(f[2]), par=int(f[3]), line=int(f[4]), left=int(f[6]),
                          top=int(f[7]), width=int(f[8]), height=int(f[9]),
                          conf=float(f[10]), text=f[11]))
    return words


def _mode(values, bucket=10):
    from collections import Counter
    c = Counter(round(v / bucket) for v in values)
    return c.most_common(1)[0][0] * bucket if c else 0


def body_lines(words, page_width, edge=None):
    """edge: the text column's left x when the caller knows it (Transkribus split)."""
    # Group words into lines by their vertical centre. Tesseract sometimes
    # splits one printed line into two blocks (beside a drop cap, or under a
    # full-width section), and its own line ids would then cut the line in half.
    hs = sorted(w['height'] for w in words) or [40]
    mh = hs[len(hs) // 2]
    lines = []
    for w in sorted(words, key=lambda w: w['top'] + w['height'] / 2):
        c = w['top'] + w['height'] / 2
        for ln in lines[-6:]:
            if abs(ln['c'] - c) < 0.45 * mh:
                ln['ws'].append(w)
                ln['c'] = sum(x['top'] + x['height'] / 2 for x in ln['ws']) / len(ln['ws'])
                break
        else:
            lines.append(dict(c=c, ws=[w]))
    lines = [sorted(ln['ws'], key=lambda w: w['left']) for ln in lines]
    # The text column's left edge: the left value most lines have a word at
    # (margin notes and verse numbers vary, the column edge recurs), looking
    # only where a column can start (right-hand margin notes recur too).
    from collections import Counter
    c = Counter()
    for ws in lines:
        for k in {round(w['left'] / 10) for w in ws}:
            c[k] += 1
    merged = {k: c[k - 1] + c[k] + c[k + 1] for k in c if 0.05 * page_width <= k * 10 <= 0.45 * page_width}
    best = max(merged, key=lambda k: (merged[k], c[k])) if merged else 0
    edge = min((k for k in (best - 1, best, best + 1) if c[k]), default=best) * 10 if edge is None else edge
    out = []
    for ws in lines:
        # Split at wide gaps (margin notes sit on the same baseline) and keep
        # the widest run: the text column.
        h = sorted(w['height'] for w in ws)[len(ws) // 2]
        runs, run = [], [ws[0]]
        for x, y in zip(ws, ws[1:]):
            if y['left'] - (x['left'] + x['width']) > 3.2 * h:
                runs.append(run); run = []
            run.append(y)
        runs.append(run)
        body = max(runs, key=lambda r: r[-1]['left'] + r[-1]['width'] - r[0]['left'])
        body = [w for w in body if w['left'] + w['width'] > edge + 8 and w['left'] >= edge - 40]
        if not body:
            continue
        left, right = body[0]['left'], body[-1]['left'] + body[-1]['width']
        m = re.match(r'^(\d+)(.+)', body[0]['text'])
        if m:  # a verse number glued to the first word: measure from the word
            left += body[0]['width'] * len(m.group(1)) // len(body[0]['text'])
        conf = sum(w['conf'] for w in body) / len(body)
        # A badly read text line still has some sure words and several real
        # ones; the ornament and rule lines at a page top have neither.
        sure = sum(1 for w in body if w['conf'] >= 80)
        real = sum(1 for w in body if re.fullmatch(r'[A-Za-zſ,.;:]{3,}', w['text']))
        if sure >= 2 and real >= 5:
            conf = max(conf, 46)
        out.append(dict(left=left, right=right, top=min(w['top'] for w in body), conf=conf, edge=edge,
                        bottom=max(w['top'] + w['height'] for w in body),
                        words=[w['text'] for w in body],
                        boxes=[(w['left'], w['top'], w['width'], w['height']) for w in body]))
    body = [l for l in out if l['right'] - l['left'] > 0.40 * page_width and l['conf'] > 45]
    body.sort(key=lambda l: l['top'])
    if body and re.search(r'ACCORD|GOSPEL|CHA|EPISTLE|ACTES|APOCALYPSE', ' '.join(body[0]['words']), re.I) \
            and len(body[0]['words']) <= 8:
        body = body[1:]
    return body


def mark_indents(body, image_path, page_width):
    """Flags paragraph indents from the ink on the scan.

    The OCR misreads or drops the † and verse numbers that open lines, so the
    word boxes say little about where a line really starts. The ink does: an
    indented line starts about an em right of the column edge, while a line
    opening with † starts at the edge (the † is ink too). Verse numbers and
    margin notes sit left of the edge, outside the band we scan.
    """
    from PIL import Image
    im = Image.open(image_path).convert('L')
    px = im.load()
    W, H = im.size
    scale = W / page_width if page_width else 1
    for l in body:
        e = int(l['edge'] * scale)
        top, bot = int(l['top'] * scale), int(l['bottom'] * scale)
        mid_top = top + (bot - top) // 4          # skip ascenders of the line above
        mid_bot = bot - (bot - top) // 4
        # Ink runs across the band; a run starting well left of the edge is a
        # verse number in the gutter, the first run after that opens the line.
        ink, run_start, gap = None, None, 99
        for x in range(max(0, e - 60), min(W, e + 160)):
            dark = sum(1 for y in range(mid_top, mid_bot) if px[x, y] < 100) >= 2
            if dark:
                if gap >= 7:
                    run_start = x
                    if run_start >= e - 10:
                        ink = run_start
                        break
                gap = 0
            else:
                gap += 1
        l['ink'] = (ink / scale) if ink is not None else None
    inks = [l['ink'] for l in body if l['ink'] is not None]
    for i, l in enumerate(body):
        near = sorted(x['ink'] for x in body[max(0, i - 4):i] + body[i + 1:i + 5] if x['ink'] is not None)
        local = near[len(near) // 2] if near else (sorted(inks)[len(inks) // 2] if inks else 0)
        em = (l['bottom'] - l['top']) * 0.3  # the print uses a full and a half indent
        l['indent'] = l['ink'] is not None and em < l['ink'] - local < 0.08 * page_width


def catchword(words, page_width):
    """The word printed alone at the bottom right: the next page's first word."""
    if not words:
        return None
    bottom = max(w['top'] for w in words)
    low = [w for w in words if w['top'] > bottom - 120 and w['left'] > 0.55 * page_width
           and re.search(r'[A-Za-zſ]{2,}', w['text']) and w['conf'] > 30]
    if not low:
        return None
    w = max(low, key=lambda w: (w['top'] // 40, w['left']))
    return w['text']


def transkribus_pages(book):
    """Pages of one book from the Transkribus split, in strip order.

    Words in TSV blocks 90/91 were tagged as left/right margin by the splitter;
    they are kept out of the body lines but still count for the catchword."""
    import json
    pages = []
    for m in json.loads((TK / book / 'manifest.json').read_text()):
        tsv = TK / book / f"{m['id']}.tsv"
        words = read_tsv(tsv)
        width = read_page_width(tsv) or max((w['left'] + w['width'] for w in words), default=1)
        body = body_lines([w for w in words if w['block'] < 90], width, edge=m.get('edge'))
        img = TK / book / f"{m['id']}.jpg"
        if img.exists():
            mark_indents(body, img, width)
        chs = [int(m['id'].split('/')[0])] if m['src'] == 'sancta' else []
        pages.append(dict(chapters=chs, src=f"{book}/{m['id']}", pdf=m.get('pdf'), body=body,
                          text=(TK / book / f"{m['id']}.txt").read_text(errors='replace'),
                          catch=catchword(words, width)))
    return pages


def book_pages(book, source=None):
    """source: 'tesseract' (sancta-scan, default) or 'transkribus'; env WS_OCR sets it."""
    import os
    if (source or os.environ.get('WS_OCR', 'tesseract')) == 'transkribus':
        return transkribus_pages(book)
    pages, seen = [], {}
    chapters = sorted((int(p.name) for p in (SCAN / book).iterdir() if p.name.isdigit()))
    for ch in chapters:
        n = 1
        while (SCAN / book / str(ch) / f'{n}.tsv').exists():
            tsv = SCAN / book / str(ch) / f'{n}.tsv'
            txt = (SCAN / book / str(ch) / f'{n}.txt').read_text(errors='replace')
            h = hashlib.sha1(re.sub(r'\s+', '', txt).encode()).hexdigest()
            if h in seen:
                pages[seen[h]]['chapters'].append(ch)
            else:
                words = read_tsv(tsv)
                width = max((w['left'] + w['width'] for w in words), default=1)
                seen[h] = len(pages)
                body = body_lines(words, width)
                img = IMG / book / str(ch) / 'hires' / f'{n}.jpg'
                if img.exists():
                    mark_indents(body, img, max(width, read_page_width(tsv)))
                pages.append(dict(chapters=[ch], src=f'{book}/{ch}/{n}', body=body, text=txt,
                                  catch=catchword(words, width)))
            n += 1
    return pages


def ocr_by_page(book, source):
    """OCR page text keyed by wiki page, numbered as generate.py numbers them (after the Argument)."""
    from . import config
    if source == 'transkribus' and not (TK / book / 'manifest.json').exists():
        return {}  # Matthew was read with Tesseract only
    cfg = load_books()[book]
    first = cfg['first']
    if config.book(book).argument_page == first:  # chapter 1 starts after the Argument's pages
        first += config.argument_pages(book)
    return {first + n: p['text'] for n, p in enumerate(book_pages(book, source)) if first + n <= cfg['last']}
