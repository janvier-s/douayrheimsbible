"""Three-way word diff for one book: Transkribus + Tesseract OCR against odr-original.

Majority vote: a reading is a finding when BOTH OCRs agree with each other and
differ from our data. Single-OCR disagreements are only counted (OCR noise).

Body text (chapter summaries, verses, annotation titles and text, the argument) is
aligned as one stream per book against each OCR's column words. Margin items (verse
notes, cross_refs, summary_notes, annotation margin notes) are located in the margin
words of the page their anchor landed on (and the next page) and aligned there.

Known OCR habits are folded before comparing: ſ/s/f, vv/w/vy/vu, u/v, i/j, l for I
at word start, † read as f/t glued to the next word, hyphen breaks, macrons (vpō = vpon).
Separate passes report w vs vv (glyph class per witness) and Tesseract's ſ evidence.

Usage: python3 scripts/wikisource/ocrdiff.py <book> <out_dir>
Writes <out_dir>/<book>-findings.tsv (one row per location) and prints a summary
as JSON for the report. Needs transkribus.py's split (pages/<book>/manifest.json).
"""
from pathlib import Path
from collections import Counter, defaultdict
import difflib, json, re, sys

from . import paths, sources as O
from .transkribus import tag_margins, PAGE_W

REPO = paths.REPO
ORIG = REPO / 'static/data/odr-original'
MODERN = REPO / 'static/data/odr'

# ---------------------------------------------------------------- keys and folds

MACRON = str.maketrans('āēīōūȳ', 'aeiouy')


def key(w):
    """Spelling-blind comparison key: letters and digits, OCR habits folded."""
    w = w.lower().replace('ſ', 's').replace('æ', 'ae').replace('œ', 'oe')
    w = w.translate(MACRON)
    w = re.sub(r'[^a-z0-9]', '', w)
    w = w.replace('f', 's').replace('vv', 'w').replace('vy', 'w').replace('vu', 'w').replace('uv', 'w')
    return w.replace('u', 'v').replace('j', 'i').replace('y', 'i')


def clean_ocr(w):
    """Undo glyph-level OCR habits on a raw token: † read as f/t before a capital."""
    w = w.replace('¬', '-')
    m = re.match(r'^[ft†*](?=[A-Z])', w)
    return w[1:] if m else w


def eq(d, o):
    """Data word d matches OCR word o, allowing the known misreadings."""
    kd, ko = key(d), key(clean_ocr(o))
    if kd == ko:
        return True
    if ko[:1] == 'l' and kd[:1] == 'i' and kd[1:] == ko[1:]:
        return True  # lohn = Iohn
    if ko[:1] in ('t', 's') and ko[1:] == kd and len(kd) > 1:
        return True  # † read as t/f glued to the word (f is folded to s)
    if d[:1].isupper() and len(kd) > 2 and ko == kd[1:]:
        return True  # the drop cap letter is not read
    # macron: vpō in data, vpon (or vp6 / vpo) in OCR
    if re.search('[āēīōū]', d):
        if re.sub(r'(?<=[aeiov])[nm]', '', ko) == re.sub(r'(?<=[aeiov])[nm]', '', kd):
            return True
    return False


_ATTESTED = None


def attested(w):
    """The OCR form occurs twice or more in odr-original (any book, verses, notes,
    annotations). Both OCRs can misread the same glyph (c/e, t/r), so an
    unattested agreement is more likely a shared misreading than a print form."""
    global _ATTESTED
    if _ATTESTED is None:
        c = Counter()
        for f in ORIG.rglob('*.json'):
            try:
                txt = f.read_text()
            except OSError:
                continue
            c.update(key(w) for w in re.findall(r'[A-Za-zſæœāēīōū]+', txt))
        _ATTESTED = {k for k, n in c.items() if n >= 2}  # once may be junk in our own data
    return key(clean_ocr(w)) in _ATTESTED


def ratio(a, b):
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio() if a and b else 0.0


# ---------------------------------------------------------------- OCR pages

def _lines(rows, grouping):
    by = defaultdict(list)
    for w in rows:
        by[grouping(w)].append(w)
    out = [sorted(ws, key=lambda w: w['left']) for ws in by.values()]
    out.sort(key=lambda ws: sum(w['top'] + w['height'] / 2 for w in ws) / len(ws))
    return out


def page_streams(tsv, source, pid):
    """(body words, margin words) of one page, reading order. Words are
    (raw, page, line). TK margins come pre-tagged (blocks 90/91); Tesseract's
    are tagged here with the same column-edge rule."""
    words = O.read_tsv(tsv)
    width = O.read_page_width(tsv) or PAGE_W
    s = PAGE_W / width
    for w in words:
        for k in ('left', 'top', 'width', 'height'):
            w[k] = int(w[k] * s)
    if source == 'tk':
        lines = _lines(words, lambda w: w['line'])
        sides = [[0 if w['block'] < 90 else w['block'] - 89 for w in ln] for ln in lines]
    else:
        lines = _lines(words, lambda w: (w['block'], w['par'], w['line']))
        sides = tag_margins([[(w['text'], (w['left'], w['top'], w['left'] + w['width'], w['top'] + w['height']))
                              for w in ln] for ln in lines])
    body, marg = [], {1: [], 2: []}
    for li, (ln, sd) in enumerate(zip(lines, sides)):
        for w, side in zip(ln, sd):
            (body if side == 0 else marg[side]).append((w['text'], pid, li, (w['left'], w['top'], w['width'], w['height'])))
    return join_hyphens(body), join_hyphens(marg[1]) + join_hyphens(marg[2])


def join_hyphens(ws):
    out = []
    for w in ws:
        if out and re.search(r'[-¬]$', out[-1][0]) and len(out[-1][0]) > 1 and w[2] != out[-1][2]:
            out[-1] = (out[-1][0][:-1] + w[0],) + out[-1][1:]
        else:
            out.append(w)
    return out


def ocr_pages(book, source):
    """[(page id, body, margin)] for the book's argument then its pages."""
    pages = []
    arg = O.TK / f'{book}-argument'
    if (arg / 'manifest.json').exists():
        for m in json.loads((arg / 'manifest.json').read_text()):
            tsv = arg / f"{m['id']}.tsv" if source == 'tk' else arg / f"{m['id']}.tess.tsv"
            if tsv.exists():
                pages.append((m['id'],) + page_streams(tsv, source, m['id']))
    for m in json.loads((O.TK / book / 'manifest.json').read_text()):
        tsv = O.TK / book / f"{m['id']}.tsv" if source == 'tk' else O.SCAN / book / f"{m['id']}.tsv"
        if source != 'tk' and not tsv.exists():  # PDF pages (Luke, John) have no sancta scan: Tesseract on the cut page
            tsv = O.TK / book / f"{m['id']}.tess.tsv"
        if tsv.exists():
            pages.append((m['id'],) + page_streams(tsv, source, m['id']))
    return pages


# ---------------------------------------------------------------- our data

TAGS = re.compile(r'<cr>.*?</cr>|<na>.*?</na>|<mn>.*?</mn>|<[^>]+>|[⊢`]')


def words_of(text):
    text = text.replace('<br>', ' ')
    return [w for w in TAGS.sub(' ', text).split() if key(w)]


def data_streams(book):
    b = json.loads((ORIG / f'{book}.json').read_text())
    ann = {}
    for f in sorted((ORIG / book / 'annotations').glob('*.json')):
        a = json.loads(f.read_text())
        ann[a['chapter']] = a['annotations']
    body, margin = [], []   # body: (word, loc, section); margin: (text, loc, section, anchor loc)
    for ii, it in enumerate(b.get('intros') or []):
        for w in words_of(it.get('title', '')):
            body.append((w, f'arg:title', 'intro'))
        for w in words_of(it['text']):
            body.append((w, f'arg:{ii}', 'intro'))
    for ch in b['chapters']:
        c = ch['chapter']
        for w in words_of(ch.get('summary') or ''):
            body.append((w, f'{c}:sum', 'summary'))
        for n in ch.get('summary_notes') or []:
            margin.append((n['text'], f'{c}:sum/n{n.get("marker")}', 'summary_note', f'{c}:sum'))
        for v in ch['verses']:
            loc = f'{c}:{v["verse"]}'
            for w in words_of(v['text']):
                body.append((w, loc, 'verse'))
            for n in v.get('notes') or []:
                margin.append((n['text'], f'{loc}/note{n.get("label")}', 'note:' + n.get('kind', 'gloss'), loc))
            for k, r in enumerate(v.get('cross_refs') or []):
                margin.append((r['text'], f'{loc}/cr{k + 1}', 'cross_ref', loc))
        for ai, a in enumerate(ann.get(c, [])):
            loc = f'{c}:{a["verse"]}a{ai + 1}'
            for w in words_of(a.get('title', '')):
                body.append((w, loc + ':title', 'ann_title'))
            for w in words_of(a.get('text', '')):
                body.append((w, loc, 'ann_text'))
            for n in a.get('notes') or []:
                margin.append((n['text'], f'{loc}/mn{n.get("marker")}', 'ann_margin', loc))
    return body, margin


# ---------------------------------------------------------------- alignment

def sub_align(D, Ow):
    """DP over a mismatched stretch. Returns per data index (ocr index list or [],
    op) and the OCR indexes left over (insertions, with the data index they follow)."""
    n, m = len(D), len(Ow)
    if n * m > 40000:
        return [([], 'del')] * n, [(-1, j) for j in range(m)]
    kd = [key(w) for w in D]
    ko = [key(clean_ocr(w)) for w in Ow]
    INF = 1e9
    cost = [[INF] * (m + 1) for _ in range(n + 1)]
    back = [[None] * (m + 1) for _ in range(n + 1)]
    cost[0][0] = 0
    for i in range(n + 1):
        for j in range(m + 1):
            c = cost[i][j]
            if c == INF:
                continue
            steps = []
            if i < n:
                steps.append((i + 1, j, 0.8, 'del'))
            if j < m:
                steps.append((i, j + 1, 0.8, 'ins'))
            if i < n and j < m:
                r = 1.0 if eq(D[i], Ow[j]) else ratio(kd[i], ko[j])
                steps.append((i + 1, j + 1, (1 - r) * 1.3 if r < 1 else 0, 'sub'))
            if i + 1 < n and j < m:
                steps.append((i + 2, j + 1, (1 - ratio(kd[i] + kd[i + 1], ko[j])) * 1.6 + 0.1, 'merge'))
            if i < n and j + 1 < m:
                steps.append((i + 1, j + 2, (1 - ratio(kd[i], ko[j] + ko[j + 1])) * 1.6 + 0.1, 'split'))
            for a, b, w, op in steps:
                if c + w < cost[a][b]:
                    cost[a][b], back[a][b] = c + w, (i, j, op)
    res, ins = [None] * n, []
    i, j = n, m
    while i or j:
        pi, pj, op = back[i][j]
        if op == 'del':
            res[pi] = ([], 'del')
        elif op == 'ins':
            ins.append((pi - 1, pj))
        elif op == 'sub':
            res[pi] = ([pj], 'eq' if eq(D[pi], Ow[pj]) else 'sub')
        elif op == 'merge':
            res[pi] = ([pj], 'merge'); res[pi + 1] = ([pj], 'merge')
        elif op == 'split':
            res[pi] = ([pj, pj + 1], 'split')
        i, j = pi, pj
    return res, ins


def align(D, Ow):
    """Pairs each data word with OCR words. Returns (pairs, insertions) where
    pairs[i] = (list of OCR indexes, op) and insertions = [(data idx before, ocr idx)]."""
    kd = [key(w) for w in D]
    ko = [key(clean_ocr(w)) for w in Ow]
    sm = difflib.SequenceMatcher(None, kd, ko, autojunk=False)
    pairs, ins = [None] * len(D), []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            for k in range(i2 - i1):
                pairs[i1 + k] = ([j1 + k], 'eq')
        else:
            r, extra = sub_align(D[i1:i2], Ow[j1:j2])
            for k, (js, o) in enumerate(r):
                pairs[i1 + k] = ([j1 + x for x in js], o)
            ins += [(i1 + a, j1 + b) for a, b in extra]
    return pairs, ins


# ---------------------------------------------------------------- glyph classes

def wclass_data(w):
    lw = w.lower()
    return 'vv' if 'vv' in lw else ('w' if 'w' in lw else None)


def wclass_ocr(w):
    if re.search(r'vv|vu|vy|uv|yv|VV|VY', w):
        return 'vv'
    return 'w' if re.search('[wW]', w) else None


# ---------------------------------------------------------------- run

def run(book, out_dir):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    body, margin = data_streams(book)
    D = [w for w, _, _ in body]
    src = {}
    for s in ('tk', 'ts'):
        pages = ocr_pages(book, s)
        Ob = [w for p in pages for w in p[1]]
        pairs, ins = align(D, [w[0] for w in Ob])
        src[s] = dict(pages=pages, Ob=Ob, pairs=pairs, ins=ins)

    def reading(s, i):
        js, op = src[s]['pairs'][i]
        return ' '.join(src[s]['Ob'][j][0] for j in js), op

    def page_of(s, i):
        js, _ = src[s]['pairs'][i]
        return src[s]['Ob'][js[0]][1] if js else None

    rows, stats = [], Counter()
    ctx = lambda i: ' '.join(D[max(0, i - 4):i]) + ' [' + D[i] + '] ' + ' '.join(D[i + 1:i + 5])
    wv = defaultdict(Counter)        # (section, chapter) -> class counts
    longs = []
    occ_seen = Counter()
    occ = []                          # n-th occurrence of this word in its location
    for w, loc, _ in body:
        occ.append(occ_seen[(loc, w)]); occ_seen[(loc, w)] += 1
    for i, (w, loc, sec) in enumerate(body):
        tk, otk = reading('tk', i)
        ts, ots = reading('ts', i)
        stats[f'{sec}:words'] += 1
        both_present = otk in ('eq', 'sub') and ots in ('eq', 'sub')
        if otk == 'sub' and ots == 'sub' and eq(tk, ts) or \
                (otk == 'sub' and ots == 'sub' and key(clean_ocr(tk)) == key(clean_ocr(ts))):
            c = 'both' if attested(tk) else 'both-unattested'
            rows.append(dict(cls='word', conf=c, sec=sec, loc=loc, data=w, tk=tk, ts=ts, ctx=ctx(i), occ=occ[i], i=i))
            stats[f'{sec}:word:{c}'] += 1
        elif otk == 'del' and ots == 'del':
            nb = all(src[s]['pairs'][k][1] == 'eq' for s in ('tk', 'ts') for k in (i - 1, i + 1) if 0 <= k < len(D))
            if nb:
                rows.append(dict(cls='extra', conf='both', sec=sec, loc=loc, data=w, tk='-', ts='-', ctx=ctx(i), occ=occ[i], i=i))
                stats[f'{sec}:extra:both'] += 1
        elif otk == 'sub' and ots in ('eq',) or ots == 'sub' and otk == 'eq':
            stats[f'{sec}:word:one'] += 1
        # w / vv glyph class, only where both OCRs read the same word
        dc = wclass_data(w)
        if dc and both_present and eq(w, tk) and eq(w, ts):
            ct, cs = wclass_ocr(tk), wclass_ocr(ts)
            ch = loc.split(':')[0]
            if ct == cs == 'vv' and dc == 'w':
                wv[(sec, ch)]['w->vv'] += 1
                rows.append(dict(cls='w_for_vv', conf='both', sec=sec, loc=loc, data=w, tk=tk, ts=ts, ctx=ctx(i), occ=occ[i], i=i))
            elif ct == cs == 'w' and dc == 'vv':
                wv[(sec, ch)]['vv->w'] += 1
                rows.append(dict(cls='vv_for_w', conf='both', sec=sec, loc=loc, data=w, tk=tk, ts=ts, ctx=ctx(i), occ=occ[i], i=i))
            elif ct == dc or cs == dc:
                wv[(sec, ch)]['agree'] += 1
            else:
                wv[(sec, ch)]['mixed'] += 1
        # long s: Tesseract reads ſ as f
        if ots == 'eq' and len(ts) == len(w) and sec != 'intro':
            for k, (a, b) in enumerate(zip(w, ts)):
                if a == 's' and b == 'f' and k < len(w) - 1 and w[k + 1:k + 2].isalpha():
                    longs.append((loc, w, ts))
                    break
    # insertions both OCRs share (same data gap, same word)
    for s in ('tk', 'ts'):
        src[s]['insmap'] = defaultdict(list)
        for i, j in src[s]['ins']:
            src[s]['insmap'][i].append(src[s]['Ob'][j][0])
    for i, ws in src['tk']['insmap'].items():
        other = src['ts']['insmap'].get(i, [])
        for w in ws:
            k = key(clean_ocr(w))
            if len(k) < 2 or re.fullmatch(r'[0-9ivxl]+', k) or (w.isupper() and len(w) > 1) or not attested(w):
                continue
            # only between two words both OCRs read: margins and heads leak in elsewhere
            if not all(0 <= x < len(D) and src[s2]['pairs'][x][1] == 'eq' for s2 in ('tk', 'ts') for x in (i, i + 1)):
                continue
            if any(key(clean_ocr(o)) == k for o in other) and 0 <= i < len(D):
                loc, sec = body[i][1], body[i][2]
                jw = next((src['tk']['Ob'][j] for ii, j in src['tk']['ins'] if ii == i and src['tk']['Ob'][j][0] == w), None)
                rows.append(dict(cls='missing', conf='both', sec=sec, loc=loc, data='-', tk=w, ts=w,
                                 ctx=ctx(i) + ' + ' + w,
                                 **(dict(page=jw[1], box=','.join(map(str, jw[3]))) if jw else {})))
                stats[f'{sec}:missing:both'] += 1

    # ------------------------------------------------ margins
    first_idx = {}
    for i, (_, loc, _) in enumerate(body):
        first_idx.setdefault(loc, i)
    mstats = Counter()
    for text, loc, sec, anchor in margin:
        nw = [w for w in re.sub(r'<[^>]+>', ' ', text).split() if key(w)]
        if not nw:
            continue
        got = {}
        for s in ('tk', 'ts'):
            i = first_idx.get(anchor)
            pg = page_of(s, i) if i is not None else None
            if pg is None:  # anchor word unread: use the nearest read word before it
                k = i or 0
                while k > 0 and page_of(s, k) is None:
                    k -= 1
                pg = page_of(s, k)
            pages = src[s]['pages']
            pi = next((n for n, p in enumerate(pages) if p[0] == pg), None)
            stream = []
            if pi is None:
                got[s] = (0.0, None)
                continue
            for p in pages[max(0, pi - 1):pi + 2]:
                stream += p[2]
            sw = [w[0] for w in stream]
            ks = [key(clean_ocr(w)) for w in sw]
            K = ''.join(key(w) for w in nw)
            best = (0.0, 0, 0)
            for st in range(len(sw)):   # character-level: OCR splits and joins refs ("Mt.3,1.")
                acc = ''
                for en in range(st, len(sw)):
                    acc += ks[en]
                    if len(acc) >= len(K) * 0.8:
                        r = ratio(K, acc)
                        if r > best[0]:
                            best = (r, st, en + 1)
                    if len(acc) > len(K) * 1.3 + 3:
                        break
            if best[0] < 0.6:
                got[s] = (best[0], None)
                continue
            win = sw[best[1]:best[2]]
            pairs, _ = align(nw, win)
            got[s] = (best[0], [(' '.join(win[j] for j in js), op) for js, op in pairs])
        mstats[f'{sec}:items'] += 1
        rt, rs = got['tk'][0], got['ts'][0]
        if rt < 0.6 and rs < 0.6:
            mstats[f'{sec}:notfound'] += 1
            rows.append(dict(cls='margin_notfound', conf='both', sec=sec, loc=loc, data=text[:120], tk='%.2f' % rt,
                             ts='%.2f' % rs, ctx=''))
            continue
        if got['tk'][1] and got['ts'][1]:
            for k, w in enumerate(nw):
                (tk, otk), (ts, ots) = got['tk'][1][k], got['ts'][1][k]
                if otk == 'sub' and ots == 'sub' and key(clean_ocr(tk)) == key(clean_ocr(ts)):
                    mstats[f'{sec}:word:both'] += 1
                    rows.append(dict(occ=nw[:k].count(w), cls='word', conf='both', sec=sec, loc=loc, data=w, tk=tk, ts=ts,
                                     ctx=' '.join(nw[max(0, k - 3):k]) + ' [' + w + '] ' + ' '.join(nw[k + 1:k + 4])))
                dc = wclass_data(w)
                if dc and otk == 'eq' and ots == 'eq':
                    ct, cs = wclass_ocr(tk), wclass_ocr(ts)
                    ch = loc.split(':')[0]
                    if ct == cs == 'vv' and dc == 'w':
                        wv[(sec, ch)]['w->vv'] += 1
                        rows.append(dict(occ=nw[:k].count(w), cls='w_for_vv', conf='both', sec=sec, loc=loc, data=w, tk=tk, ts=ts, ctx=text[:60]))
                    elif ct == cs == 'w' and dc == 'vv':
                        wv[(sec, ch)]['vv->w'] += 1
                        rows.append(dict(occ=nw[:k].count(w), cls='vv_for_w', conf='both', sec=sec, loc=loc, data=w, tk=tk, ts=ts, ctx=text[:60]))
                    elif ct == dc or cs == dc:
                        wv[(sec, ch)]['agree'] += 1
                    else:
                        wv[(sec, ch)]['mixed'] += 1

    # ------------------------------------------------ odr (modern) cross-check
    mod = json.loads((MODERN / f'{book}.json').read_text())
    mverse = {f'{c["chapter"]}:{v["verse"]}': v['text'] for c in mod['chapters'] for v in c['verses']}
    msum = {f'{c["chapter"]}:sum': c.get('summary') or '' for c in mod['chapters']}
    mann = {}
    for f in sorted((MODERN / book / 'annotations').glob('*.json')):
        a = json.loads(f.read_text())
        for ai, x in enumerate(a['annotations']):
            mann[f'{a["chapter"]}:{x["verse"]}a{ai + 1}'] = x.get('title', '') + ' ' + x.get('text', '')
    for r in rows:
        i = r.pop('i', None)
        if i is not None:
            js, _ = src['tk']['pairs'][i]
            if not js:   # deleted word: point at the next word read
                k = i + 1
                while k < len(D) and not src['tk']['pairs'][k][0]:
                    k += 1
                js = src['tk']['pairs'][k][0] if k < len(D) else []
            if js:
                w0 = src['tk']['Ob'][js[0]]
                r['page'], r['box'] = w0[1], ','.join(map(str, w0[3]))
    for r in rows:
        if r['cls'] not in ('word', 'extra', 'missing'):
            continue
        base = r['loc'].split('/')[0].replace(':title', '')
        mt = mverse.get(base) or msum.get(base) or mann.get(base)
        if not mt:
            r['modern'] = ''
            continue
        mk = [key(w) for w in words_of(mt)]
        best = lambda w: max((ratio(key(w), k) for k in mk), default=0)
        if r['cls'] == 'extra':
            r['modern'] = 'has-data-word' if best(r['data']) >= 0.8 else 'lacks'
        elif r['cls'] == 'missing':
            r['modern'] = 'has-ocr-word' if best(r['tk']) >= 0.8 else 'lacks'
        else:
            bd, bo = best(r['data']), best(r['tk'])
            r['modern'] = 'like-ocr' if bo > bd and bo >= 0.8 else ('like-data' if bd >= 0.8 else '?')

    cols = ['cls', 'conf', 'sec', 'loc', 'occ', 'data', 'tk', 'ts', 'modern', 'page', 'box', 'ctx']
    with open(out_dir / f'{book}-findings.tsv', 'w') as f:
        f.write('\t'.join(cols) + '\n')
        for r in rows:
            f.write('\t'.join(str(r.get(c, '')).replace('\t', ' ') for c in cols) + '\n')
    quality = {s: dict(Counter(op for _, op in src[s]['pairs'])) for s in src}
    summary = dict(stats=stats, mstats=mstats, quality=quality,
                   wv={f'{a}|{b}': dict(c) for (a, b), c in sorted(wv.items(), key=lambda x: (x[0][0], int(x[0][1]) if x[0][1].isdigit() else 0))},
                   longs=len(longs), longs_ex=longs[:15])
    (out_dir / f'{book}-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1))
    return summary


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    s = run(argv[0], argv[1])
    print(json.dumps({k: s[k] for k in ('quality', 'longs')}, ensure_ascii=False))
    print({k: v for k, v in s['stats'].items() if not k.endswith(':words')})
    print(dict(s['mstats']))
