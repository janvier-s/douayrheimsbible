"""Reads the sancta-scan OCR for one book into a global page list.

Each chapter folder holds its scan pages 1..n. A chapter that starts mid-page
shares that page with the chapter before, so identical pages are merged.
For each page we keep the body lines: lines wide enough to be the text column
(the margins hold short lines), in reading order, with an indent flag.
"""
from pathlib import Path
import hashlib, re

SCAN = Path.home() / 'facsimiles/ocr-2026-11-12/sancta-scan'


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


def body_lines(words, page_width):
    lines = {}
    for w in words:
        lines.setdefault((w['block'], w['par'], w['line']), []).append(w)
    lines = [sorted(ws, key=lambda w: w['left']) for ws in lines.values()]
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
    edge = min((k for k in (best - 1, best, best + 1) if c[k]), default=best) * 10
    out = []
    for ws in lines:
        # Split at wide gaps (margin notes sit on the same baseline) and keep
        # the widest run: the text column.
        h = sorted(w['height'] for w in ws)[len(ws) // 2]
        runs, run = [], [ws[0]]
        for x, y in zip(ws, ws[1:]):
            if y['left'] - (x['left'] + x['width']) > 1.6 * h:
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
        out.append(dict(left=left, right=right, top=min(w['top'] for w in body), conf=conf,
                        words=[w['text'] for w in body]))
    body = [l for l in out if l['right'] - l['left'] > 0.40 * page_width and l['conf'] > 45]
    body.sort(key=lambda l: l['top'])
    if body and re.search(r'ACCORD|GOSPEL|CHA|EPISTLE|ACTES|APOCALYPSE', ' '.join(body[0]['words']), re.I) \
            and len(body[0]['words']) <= 8:
        body = body[1:]
    for i, l in enumerate(body):
        # Measure the indent against the neighbouring lines, which absorbs a
        # skewed scan and a misjudged column edge.
        near = sorted(x['left'] for x in body[max(0, i - 3):i] + body[i + 1:i + 4])
        local = near[len(near) // 2] if near else edge
        off = l['left'] - local
        l['indent'] = 0.014 * page_width < off < 0.08 * page_width and l['left'] - edge < 0.1 * page_width
        l['edge'] = edge
    return body


def book_pages(book):
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
                pages.append(dict(chapters=[ch], src=f'{book}/{ch}/{n}', body=body_lines(words, width),
                                  text=txt))
            n += 1
    return pages


if __name__ == '__main__':
    import sys
    ps = book_pages(sys.argv[1])
    for i, p in enumerate(ps[: int(sys.argv[2]) if len(sys.argv) > 2 else 5]):
        print(i, p['src'], p['chapters'], len(p['body']), 'lines')
        for l in p['body'][:3] + [{'words': ['...'], 'indent': False}] + p['body'][-2:]:
            print('   ', '>' if l.get('indent') else ' ', ' '.join(l['words'])[:100])
