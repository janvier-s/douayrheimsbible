"""Splits Transkribus PAGE XML strips into per-page OCR the wikisource pipeline reads.

A strip is a vertical stack of page images (2710 px tall, 60 px gaps, 1897 wide)
sent to Transkribus as one image. offsets.json beside the strips maps each strip
to its pages:
    mark:    {"mark-01.jpg": [["1/1.jpg", 0], ...]}            (sancta ch/n pages)
    gospels: {"gospels-01.jpg": [["pdf162", "luke", 0], ...]}   (Wikisource PDF pages)

For every page this writes, under OUT/<role>/:
    <id>.tsv    Tesseract-style TSV (level 1 page row + level 5 word rows), page frame
    <id>.txt    the lines in reading order (raw Transkribus text)
    <id>.jpg    the page cut from the strip (the exact frame the coordinates are in)
and OUT/<role>/manifest.json: the pages in strip order with their source and checks.

<id> keeps the source name: "1/1" for sancta mark/1/1.jpg, "pdf114" for PDF page 114.
<role> is the book a page belongs to; ROLE_OVERRIDES moves misfiled pages
(sancta mark/16/3 is PDF 161, the Argument of Luke) and arguments to their own role.

Strips without Word elements (Transkribus run without word segmentation) get word
boxes estimated from the line: the line's x extent shared out by character count.
Those rows carry conf 50 and the manifest records words_estimated, so box-based
checks (crops, indents) know they are approximate.

Usage: python3 -I scripts/wikisource/rh.py ocr-split <strip_dir> <xml_dir> [out_dir]
  e.g. transkribus.py ~/facsimiles/transkribus/mark/h30k ~/facsimiles/transkribus/mark/OCR
"""
from pathlib import Path
import json, re, sys
import xml.etree.ElementTree as ET

PAGE_H, PAGE_W = 2710, 1897
OUT_DEFAULT = Path.home() / 'facsimiles/transkribus/pages'
# (strip book, page id) -> role. Arguments get '<book>-argument' so book_pages skips them.
ROLE_OVERRIDES = {('mark', '16/3'): 'luke-argument', ('mark', 'argument/pdf114'): 'mark-argument'}
PDF_OF = {('mark', '16/3'): 161, ('mark', 'argument/pdf114'): 114}


def _pts(el, ns):
    c = el.find(f'{ns}Coords')
    pts = [tuple(int(float(v)) for v in p.split(',')) for p in c.get('points').split()]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def _text(el, ns):
    u = el.find(f'{ns}TextEquiv/{ns}Unicode')
    return (u.text or '') if u is not None else ''


def read_strip(xml_path):
    """Lines of one strip: text, bbox, baseline y, words [(text, bbox)] or None."""
    root = ET.parse(xml_path).getroot()
    ns = re.match(r'\{[^}]*\}', root.tag).group(0)
    page = root.find(f'{ns}Page')
    order = {r.get('regionRef'): int(r.get('index')) for r in page.iter(f'{ns}RegionRefIndexed')}
    lines = []
    regions = sorted(page.findall(f'{ns}TextRegion'), key=lambda r: order.get(r.get('id'), 99))
    for ri, reg in enumerate(regions):
        for tl in reg.findall(f'{ns}TextLine'):
            bl = tl.find(f'{ns}Baseline')
            base = None
            if bl is not None:
                ys = [int(float(p.split(',')[1])) for p in bl.get('points').split()]
                base = sorted(ys)[len(ys) // 2]
            ws = tl.findall(f'{ns}Word')
            words = [(_text(w, ns), _pts(w, ns)) for w in ws] if ws else None
            lines.append(dict(region=ri, text=_text(tl, ns), box=_pts(tl, ns), base=base, words=words))
    return lines, int(page.get('imageHeight')), int(page.get('imageWidth'))


def estimate_words(text, box):
    """Shares the line box out among its words by character count."""
    toks = text.split()
    if not toks:
        return []
    x0, y0, x1, y1 = box
    total = sum(len(t) for t in toks) + len(toks) - 1
    unit = (x1 - x0) / max(total, 1)
    out, pos = [], 0
    for t in toks:
        a = x0 + pos * unit
        out.append((t, (round(a), y0, round(a + len(t) * unit), y1)))
        pos += len(t) + 1
    return out


def ink_words(text, box, img):
    """Word boxes from the ink: cuts the line at blank columns, then lets each token
    take the run of ink pieces whose width best fits its length. Keeps the wide gap
    between a margin note and the text column, which the even share-out loses.
    Returns None when the ink has fewer pieces than tokens."""
    from PIL import Image
    import math
    toks = text.split()
    x0, y0, x1, y1 = box
    h = y1 - y0
    if not toks or x1 - x0 < 4 or h < 8:
        return None
    band = img.crop((x0, y0 + h // 4, x1, y1 - h // 4)).convert('L')
    # The scan paper is grey (~190), so threshold halfway between ink and paper
    # and call a column inked when any pixel in it is dark.
    px = sorted(band.getdata())
    thr = (px[len(px) // 20] + px[len(px) * 4 // 5]) // 2
    prof = band.point(lambda v: 255 if v < thr else 0).resize((band.width, 1), Image.BOX).getdata()
    ink = [v > 0 for v in prof]
    gmin = max(5, int(0.08 * h))
    segs, start, gap = [], None, 0
    for i, d in enumerate(ink + [False] * (gmin + 1)):
        if d:
            if start is None:
                start = i
            gap, end = 0, i
        elif start is not None:
            gap += 1
            if gap >= gmin:
                segs.append((start, end + 1)); start = None
    n, m = len(toks), len(segs)
    if m < n:
        return None
    unit = sum(b - a for a, b in segs) / sum(len(t) for t in toks)
    K = 10
    INF = float('inf')
    best = [[INF] * (m + 1) for _ in range(n + 1)]
    back = [[0] * (m + 1) for _ in range(n + 1)]
    best[0][0] = 0
    for i in range(1, n + 1):
        want = max(len(toks[i - 1]), 1) * unit
        for j in range(i, m + 1):
            for k in range(1, min(K, j - (i - 1)) + 1):
                prev = best[i - 1][j - k]
                if prev == INF:
                    continue
                a, b = segs[j - k][0], segs[j - 1][1]
                inner = sum(segs[q + 1][0] - segs[q][1] for q in range(j - k, j - 1))
                c = prev + abs(math.log((b - a) / want)) + 2.0 * inner / h
                if c < best[i][j]:
                    best[i][j], back[i][j] = c, k
    if best[n][m] == INF:
        return None
    out, j = [], m
    for i in range(n, 0, -1):
        k = back[i][j]
        out.append((toks[i - 1], (x0 + segs[j - k][0], y0, x0 + segs[j - 1][1], y1)))
        j -= k
    return out[::-1]


def _mode(vals, bucket=15):
    from collections import Counter
    c = Counter(round(v / bucket) for v in vals)
    return c.most_common(1)[0][0] * bucket if c else None


def _edge(vals, right=False):
    """The column edge from line starts (or ends): the mode, refined to the median
    of the values near it. For the right edge, margin notes that fill their column
    make a second cluster further right, so take the leftmost strong cluster."""
    from collections import Counter
    c = Counter(round(v / 15) for v in vals)
    if not c:
        return None
    if right:
        top = max(c.values())
        strong = [k for k in c if c[k] + c[k - 1] + c[k + 1] >= max(2, 0.25 * top) and k * 15 > 0.5 * PAGE_W]
        m = min(strong, key=lambda k: (k, -c[k])) if strong else c.most_common(1)[0][0]
        m = max((m - 1, m, m + 1), key=lambda k: c[k])
    else:
        m = c.most_common(1)[0][0]
    near = sorted(v for v in vals if abs(v - m * 15) <= 15)
    return near[len(near) // 2]


def _gutter(words, lo=0.55, hi=0.92):
    """x where the right margin starts: the leftmost x that at most one word box of
    the nearby lines crosses, with 3+ words ending in the 60 px left of it and 2+
    starting in the 80 px right of it. The gutter can be as narrow as 3 px. None if
    there is no margin text near."""
    cov = [0] * (PAGE_W + 1)
    for _, (a, _, z, _) in words:
        for x in range(max(a, 0), min(z, PAGE_W)):
            cov[x] += 1
    for x in range(int(lo * PAGE_W), int(hi * PAGE_W)):
        if cov[x] <= 1:
            ends = sum(1 for _, (a, _, z, _) in words if x - 60 <= z <= x + 1)
            starts = sum(1 for _, (a, _, z, _) in words if x <= a <= x + 80)
            if ends >= 3 and starts >= 2:
                return x
    return None


def tag_margins(lines, page_w=PAGE_W, win=350):
    """0 = text column, 1 = left margin, 2 = right margin, per word.

    Margin notes share baselines with the column and, in the annotations, sit only
    ~20 px from it, so gaps cannot tell them apart. The column edges can: the long
    lines near a line (within win px vertically) mostly start and end at the same x.
    Verse numbers and † left of the column stay in it, as in Tesseract."""
    long_ = []
    for ws in lines:
        if ws and ws[-1][1][2] - ws[0][1][0] > 0.45 * page_w:
            # starts skip the verse number / † the print sets in the gutter
            first = next((w for w in ws if not re.fullmatch(r'[0-9†*:]+\.?', w[0])), ws[0])
            long_.append(((ws[0][1][1] + ws[0][1][3]) / 2, first[1][0], ws[-1][1][2]))
    out = []
    for ws in lines:
        if not ws:
            out.append([]); continue
        cy = (ws[0][1][1] + ws[0][1][3]) / 2
        near = [l for l in long_ if abs(l[0] - cy) < win] or long_
        L = _edge([l[1] for l in near])
        R = _gutter([w for ws2 in lines if ws2 and abs((ws2[0][1][1] + ws2[0][1][3]) / 2 - cy) < win
                     for w in ws2])
        if R is None:
            R = _edge([l[2] for l in near], right=True)
        side = []
        for t, (a, _, z, _) in ws:
            if R is not None and a > R - 2:  # no column word starts at its right edge
                side.append(2)
            elif L is not None and z < L - 8 and not re.fullmatch(r'[0-9†*]+\.?|[0-9Il]{1,3}\.?', t):
                side.append(1)
            else:
                side.append(0)
        out.append(side)
    return out


def column_edge(lines):
    """The page's text-column left x: the edge of the long lines' starts, skipping
    the verse number or † set in the gutter. Lines beside a drop cap start further
    right, summaries are indented; the body lines still outnumber them."""
    starts = []
    for ws in lines:
        if ws and ws[-1][1][2] - ws[0][1][0] > 0.45 * PAGE_W:
            first = next((w for w in ws if not re.fullmatch(r'[0-9†*:]+\.?', w[0])), ws[0])
            starts.append(first[1][0])
    return _edge(starts)


def split(strip_dir, xml_dir, out=OUT_DEFAULT):
    strip_dir, xml_dir, out = Path(strip_dir), Path(xml_dir), Path(out)
    offsets = json.loads((strip_dir / 'offsets.json').read_text())
    xmls = {p.name.split('_', 1)[-1].rsplit('.', 1)[0]: p for p in xml_dir.glob('*.xml')}
    manifests, problems = {}, []
    for strip, entries in offsets.items():
        stem = strip.rsplit('.', 1)[0]
        if stem not in xmls:
            problems.append(f'{strip}: no XML')
            continue
        book = re.sub(r'-\d+$', '', stem)
        lines, sh, sw = read_strip(xmls[stem])
        bands = []
        for e in entries:
            name, role, y = (e[0], None, e[1]) if len(e) == 2 else e
            pid = re.sub(r'\.jpg$', '', name)
            role = ROLE_OVERRIDES.get((book, pid), role or book)
            bands.append(dict(id=pid, role=role, y0=y, lines=[]))
        for ln in lines:
            x0, y0, x1, y1 = ln['box']
            c = ln['base'] if ln['base'] is not None else (y0 + y1) // 2
            b = next((b for b in bands if b['y0'] <= c < b['y0'] + PAGE_H), None)
            if b is None:
                problems.append(f'{strip}: line in a gap at y={c}: {ln["text"][:40]!r}')
                continue
            if y0 < b['y0'] - 15 or y1 > b['y0'] + PAGE_H + 15:
                problems.append(f'{strip} {b["id"]}: line crosses the page edge y={y0}-{y1}: {ln["text"][:40]!r}')
            b['lines'].append(ln)
        img = None
        try:
            from PIL import Image
            img = Image.open(strip_dir / strip)
        except Exception as ex:  # images are optional; TSVs still work
            problems.append(f'{strip}: no image crop ({ex})')
        for b in bands:
            d = out / b['role']
            stemp = d / b['id']
            stemp.parent.mkdir(parents=True, exist_ok=True)
            rows = ['level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
                    f'1\t1\t0\t0\t0\t0\t0\t0\t{sw}\t{PAGE_H}\t-1\t']
            est = False
            per_line = []
            for ln in b['lines']:
                words = ln['words']
                if words is None:
                    est = True
                    words = ink_words(ln['text'], ln['box'], img) if img is not None else None
                    conf = 70
                    if words is None:
                        words, conf = estimate_words(ln['text'], ln['box']), 50
                else:
                    conf = 95
                words = [(t.replace('¬', '-').replace('\t', ' ').strip(), bx) for t, bx in words]
                per_line.append(([w for w in words if w[0]], conf))
            sides = tag_margins([ws for ws, _ in per_line])
            # Transkribus sometimes breaks a page's lines into fragments (13/3 of Mark:
            # 24 short pieces in the column against the usual 4-6 paragraph ends).
            frags = sum(1 for (ws, _), side in zip(per_line, sides)
                        if (bw := [w for w, sd in zip(ws, side) if sd == 0])
                        and bw[-1][1][2] - bw[0][1][0] < 0.3 * PAGE_W and bw[0][1][0] > 0.3 * PAGE_W
                        and sum(len(t) for t, _ in bw) < 25)
            if frags >= 12:
                problems.append(f'{strip} {b["id"]}: {frags} fragment lines; prefer Tesseract or rerun this page')
            edge = column_edge([[w for w, sd in zip(ws, side) if sd == 0] for (ws, _), side in zip(per_line, sides)])
            for li, ((words, conf), side, ln) in enumerate(zip(per_line, sides, b['lines']), 1):
                for wi, ((t, (a, top, z, bot)), sd) in enumerate(zip(words, side), 1):
                    blk = ln['region'] + 1 if sd == 0 else 89 + sd
                    rows.append(f'5\t1\t{blk}\t1\t{li}\t{wi}\t{a}\t{top - b["y0"]}\t{z - a}\t{bot - top}\t{conf}\t{t}')
            (d / f'{b["id"]}.tsv').write_text('\n'.join(rows) + '\n')
            (d / f'{b["id"]}.txt').write_text('\n'.join(ln['text'] for ln in b['lines']) + '\n')
            if img is not None:
                img.crop((0, b['y0'], sw, min(sh, b['y0'] + PAGE_H))).convert('L').save(d / f'{b["id"]}.jpg', quality=90)
            m = re.fullmatch(r'pdf(\d+)', b['id'].split('/')[-1])
            pdf = int(m.group(1)) if m else PDF_OF.get((book, b['id']))
            manifests.setdefault(b['role'], []).append(dict(
                id=b['id'], strip=strip, y0=b['y0'], pdf=pdf, lines=len(b['lines']), edge=edge, fragments=frags,
                words_estimated=est, src=('sancta' if re.fullmatch(r'\d+/\d+', b['id']) else 'pdf')))
    for role, pages in manifests.items():
        f = out / role / 'manifest.json'
        old = json.loads(f.read_text()) if f.exists() else []
        keep = [p for p in old if p['id'] not in {q['id'] for q in pages}]
        f.write_text(json.dumps(keep + pages, indent=1))
    return manifests, problems


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    ms, probs = split(*argv[:3])
    for role, ps in ms.items():
        est = sum(p['words_estimated'] for p in ps)
        print(f'{role}: {len(ps)} pages, {sum(p["lines"] for p in ps)} lines, {est} with estimated word boxes')
    print(f'{len(probs)} problems')
    for p in probs[:30]:
        print('  ', p)
