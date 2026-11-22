"""agy (Gemini) reads scan crops; Claude reads only what agy is not trusted on.

    rh.py agy key                    the answer key from Mark–John (reconcile/agy-key.jsonl)
    rh.py agy calibrate              agy's accuracy per model, prompt and kind (reconcile/agy-calibration.json)
    rh.py agy read BOOK --chapters A-B --use MODEL:PROMPT --out FILE

Spec: docs/superpowers/specs/2026-11-21-agy-scan-reading-design.md.
"""
import csv
import datetime
import hashlib
import io
import json
import random
import re
import sys
import subprocess
import tempfile
import unicodedata
from pathlib import Path

from PIL import Image

from . import fixes, paths, sources as O
from .ocrdiff import key as fold, word_boxes
from .transkribus import PAGE_W

CACHE = Path.home() / 'facsimiles/agy-cache'
BATCH = 30
BAND = (0.25, 0.95)  # the part of a Transkribus box that holds its line (checked on John pdf244)
RECONCILE = paths.REPO / 'wikisource/1582-rhemes-nt/reconcile'
KEY_PATH = RECONCILE / 'agy-key.jsonl'
CAL_PATH = RECONCILE / 'agy-calibration.json'
MODELS = ('gemini-4-argon-low', 'gemini-4-argon-high', 'gemini-3.8-flash-low', 'gemini-3.8-flash-high')
HARD = ('w_for_vv', 'vv_for_w', 'word')
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
    # Name every file and forbid commands: flash otherwise lists the folder with Bash, which headless
    # mode denies, and returns nothing.
    files = ', '.join(str(f) for f in sorted(Path(image_dir).glob('*.png')))
    cmd = ['agy', '--model', model, '--add-dir', str(image_dir), '--mode', 'accept-edits',
           '-p', f'{prompt} Do not run any shell command; open each image directly with your file-viewing'
                 f' tool: {files}. Answer with one item per image, n = the number in its file name.',
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


# ---------------------------------------------------------------- the answer key

def item_kinds(truth, *others):
    """Kinds of the printed word and of the forms the OCR offered instead (a wrong macron is a macron error)."""
    k = set().union(*(kinds(w) for w in (truth, *others) if w))
    return sorted(k - {'wording'} or k)


def _item(book, loc, word, v, stratum):
    l, t, w, h = v['box']
    return dict(id=f"{book}:{v['page']}:{l},{t},{w},{h}", book=book, loc=loc, page=v['page'], box=list(v['box']),
                truth=word, kinds=item_kinds(word, v['tk'], v['ts']), stratum=stratum)


def select_key(boxes, rows, n_hard=150, n_ordinary=150, seed=1582):
    """Answer-key items from {book: word_boxes} and {book: audit TSV rows}: the words the OCR misread
    (hard; found again by folded form when respelled since the audit; a row without occ only when
    unique in its loc) and a seeded sample of w/vv, macron and ſ words the OCRs agreed on (ordinary).
    The truth is the word in odr-original now (Mark–John are checked against the scans)."""
    hard, seen = [], set()
    for book in sorted(rows):
        bx = boxes.get(book, {})
        for r in rows[book]:
            if r['cls'] not in HARD:
                continue
            cands = sorted(k for k in bx if k[0] == r['loc'] and fold(k[1]) == fold(r['data']))
            if r.get('occ') not in (None, ''):
                cands = [k for k in cands if k[2] == int(r['occ'])]
            elif len(cands) != 1:
                continue
            if cands and (book, cands[0]) not in seen:
                seen.add((book, cands[0]))
                hard.append(_item(book, cands[0][0], cands[0][1], bx[cands[0]], 'hard'))
    ordinary = []
    for book in sorted(boxes):
        for k, v in sorted(boxes[book].items()):
            if (book, k) in seen or not kinds(k[1]) - {'wording'}:
                continue
            agree = fold(v['tk']) == fold(v['ts']) == fold(k[1])
            if agree or 'macron' in kinds(k[1]):   # macron words are rare (~50 in Mark–John): take misread ones too
                ordinary.append(_item(book, k[0], k[1], v, 'ordinary' if agree else 'hard'))
    rnd = random.Random(seed)
    pick = lambda xs, n: rnd.sample(xs, n) if len(xs) > n else xs
    # ordinary: an even share per kind (macron words are rare: a plain sample can miss them all)
    chosen, ks = [], ('macron', 'longs', 'wvv')
    for i, k in enumerate(ks):
        pool = [x for x in ordinary if k in x['kinds'] and x not in chosen]
        chosen += pick(pool, (n_ordinary - len(chosen)) // (len(ks) - i))
    return sorted(pick(hard, n_hard) + chosen, key=lambda x: x['id'])


def build_key(books=('mark', 'luke', 'john'), **kw):
    rows = {b: list(csv.DictReader(open(paths.REPO / f'docs/audits/{b}-transkribus-findings.tsv'), delimiter='\t'))
            for b in books}
    return select_key({b: word_boxes(b) for b in books}, rows, **kw)


# ---------------------------------------------------------------- scoring

def _macrons(w):
    base = [c for c in unicodedata.normalize('NFD', w.lower().replace('vv', 'w')) if c.isalpha() or c == '\u0304']
    out, n = [], 0
    for c in base:
        if c == '\u0304':
            out.append((n - 1, base_prev))
        else:
            base_prev, n = c, n + 1
    return out


FEATURE = {
    'wvv': lambda w: re.findall('vv|w', w.lower()),
    'macron': _macrons,
    'longs': lambda w: [c for c in w.lower() if c in 'sſ'],
    'wording': fold,
}


def score(key, readings):
    """{(model, prompt, kind): {n, agree, right, confidently_wrong}}; readings[(model, prompt)][id] = [run1, run2].
    agree: both runs read and show the same feature; right: they agree and match the key;
    confidently_wrong: they agree on a feature the print does not have."""
    out = {}
    for (model, prompt), rd in readings.items():
        for it in key:
            runs = rd.get(it['id'], [])
            for k in it['kinds']:
                s = out.setdefault((model, prompt, k), dict(n=0, agree=0, right=0, confidently_wrong=0))
                s['n'] += 1
                f = FEATURE[k]
                if len(runs) >= 2 and None not in runs and len({repr(f(r)) for r in runs}) == 1:
                    s['agree'] += 1
                    ok = f(runs[0]) == f(it['truth'])
                    s['right' if ok else 'confidently_wrong'] += 1
    return out


def trusted(scores, n_min=30, acc=0.98):
    """The (model, prompt, kind)s agy may settle alone: enough cases, nearly all right, never confidently wrong."""
    return {k for k, s in scores.items()
            if s['n'] >= n_min and s['right'] >= acc * s['n'] and s['confidently_wrong'] == 0}


# ---------------------------------------------------------------- Acts/Romans: open findings and routing

TRIAGE_KINDS = ('w/vv', 'macron', 'longs', 'text')


def _tri(w):
    """A data word as triage writes it: lower case, ſ kept, macron as ~, no punctuation."""
    out = []
    for ch in unicodedata.normalize('NFD', unicodedata.normalize('NFC', w).lower()):
        if ch in '\u0304\u0303':
            out.append('~')
        elif not unicodedata.combining(ch):
            out.append(ch)
    return re.sub(r'[^\w~]+|_', '', ''.join(out))


def _core(w):
    return re.sub(r'^[(\[]+|[.,;:?!)\]]+$', '', unicodedata.normalize('NFC', w or ''))


def _settled(f):
    """Both OCRs show one side's form for every kind (the cheap rungs settle it). The OCR cannot see
    macrons, so a macron conflict is never settled by it."""
    if 'macron' in f['kinds']:
        return False
    for k in f['kinds']:
        F = FEATURE[k]
        if not (f['tk'] and F(f['tk']) == F(f['ts']) and F(f['tk']) in (F(f['data']), F(f['xml']))):
            return False
    return True


def findings_from(book, rows, boxes, chapters):
    """Open findings ({id, book, loc, occ, data, xml, tk, ts, page, box, kinds}) from triage rows of the
    chapters, placed on the word boxes; a word with no box is kept with box None (for Claude)."""
    A, B = chapters
    out = []
    for c, n, kind, a, b, *_ in rows:
        if kind not in TRIAGE_KINDS or not (A <= c <= B):
            continue
        loc = f'{c}:{n}'
        xs, js = a.split(), b.split()
        pairs = list(zip(xs, js)) if len(xs) == len(js) else [(a, b)]
        for xw, jw in pairs:
            if xw == jw:
                continue
            xml = unicodedata.normalize('NFC', xw.replace('~', '\u0304'))
            cands = sorted(k for k in boxes if k[0] == loc and _tri(k[1]) == jw)
            for k in cands or [(loc, jw, 0)]:
                v = boxes.get(k)
                f = dict(book=book, loc=loc, occ=k[2], data=k[1], xml=xml, tk=v['tk'] if v else '',
                         ts=v['ts'] if v else '', page=v['page'] if v else None, box=list(v['box']) if v else None,
                         kinds=item_kinds(k[1], xml))
                f['id'] = (f"{book}:{f['page']}:{','.join(map(str, f['box']))}" if v
                           else f"{book}:{loc}:{k[1]}:{k[2]}")
                if not _settled(f):
                    out.append(f)
    return out


def open_findings(book, chapters):
    from . import triage
    return findings_from(book, triage.audit_book(book)[1], word_boxes(book), chapters)


def route(findings, readings, use, trusted_set):
    """(kept, to_claude). Kept: a box, every kind trusted for `use`, two runs that read the same word,
    and that word showing one side's form (the data's or the XML's) in every kind."""
    kept, claude = [], []
    for f in findings:
        runs = readings.get(f['id']) or []
        def why():
            if not f['box']:
                return 'no-box'
            if not all(tuple(use) + (k,) in trusted_set for k in f['kinds']):
                return 'untrusted-kind'
            if len(runs) < 2 or None in runs:
                return 'no-reading'
            if len({_core(r) for r in runs}) > 1:
                return 'runs-disagree'
            r = _core(runs[0])
            if not any(all(FEATURE[k](r) == FEATURE[k](side) for k in f['kinds']) for side in (f['data'], f['xml'])) \
                    or fold(r) not in (fold(f['data']), fold(f['xml'])):
                return 'neither-side'
            return None
        reason = why()
        if reason:
            claude.append(dict(f, reason=reason))
        else:
            kept.append(dict(f, reading=_core(runs[0])))
    return kept, claude


def propose(repo, book, kept, use, date=None, taken=None):
    """Ledger entries that set each kept word to agy's reading (none where the data already reads so)."""
    from .detectors import ledger_ids, load, snapshot, propose_from
    from .detectors.wvv import replace_nth
    from .loc import find_text
    date = date or datetime.date.today().isoformat()
    taken = set(ledger_ids(book) if taken is None else taken)
    stores = load(repo, book, ('odr-original',))
    st, es = stores['odr-original'], []
    for k in sorted(kept, key=lambda k: (k['loc'], -k['occ'])):
        core = _core(k['data'])
        if k['reading'] == core:
            continue
        before = snapshot(stores)
        cont, i = find_text(st.bj, st.anns, k['loc'])
        out = replace_nth(cont[i], k['data'], k['occ'], k['data'].replace(core, k['reading']))
        if out is None:
            continue
        cont[i] = out
        ev = f"agy {use[0]} {use[1]} {date}; XML {k['xml']}; Transkribus/Tesseract {k['tk']}/{k['ts']}"
        new = propose_from(book, before, stores, ev, taken=taken, date=date,
                           allow_note='spelling as agy read it on the scan (rh.py agy read)')
        taken |= {e.id for e in new}
        es += new
    return es


def sheet(items, path):
    """One labelled contact sheet of the crops Claude must read."""
    from PIL import ImageDraw
    rows = [(f"{it['loc']} {it['data']} | xml {it['xml']} | {it['reason']}", crop(it['book'], it['page'], tuple(it['box'])))
            for it in items if it['box']]
    if not rows:
        return
    W = max(max(im.width for _, im in rows), 600)
    out = Image.new('L', (W, sum(im.height + 22 for _, im in rows)), 255)
    d, y = ImageDraw.Draw(out), 0
    for label, im in rows:
        d.text((4, y + 4), label, fill=0)
        out.paste(im.convert('L'), (0, y + 20))
        y += im.height + 22
    out.save(path, quality=88)


# ---------------------------------------------------------------- CLI

def _arg(argv, name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


def calibrate(key, models, prompts, cache=CACHE):
    readings = {}
    for it in key:
        it['image'] = crop(it['book'], it['page'], tuple(it['box']))
    for m in models:
        for p in prompts:
            print(f'agy {m} {p}: {len(key)} crops x 2 runs', file=sys.stderr, flush=True)
            readings[(m, p)] = read_all(key, m, p, cache)
    for it in key:
        del it['image']
    return readings


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    cmd = argv[0] if argv else ''
    if cmd == 'key':
        key = build_key()
        KEY_PATH.write_text(''.join(json.dumps(k, ensure_ascii=False) + '\n' for k in key))
        print(f"{KEY_PATH.name}: {len(key)} items ({sum(k['stratum'] == 'hard' for k in key)} hard)")
        return 0
    if cmd == 'calibrate':
        key = [json.loads(l) for l in KEY_PATH.read_text().splitlines()]
        models = _arg(argv, '--models', ','.join(MODELS)).split(',')
        prompts = _arg(argv, '--prompts', ','.join(PROMPTS)).split(',')
        readings = calibrate(key, models, prompts)
        scores = score(key, readings)
        ok = trusted(scores)
        print(f"{'model':22} {'prompt':9} {'kind':8} {'n':>4} {'agree':>6} {'right':>6} {'conf-wrong':>10}")
        for (m, p, k), s in sorted(scores.items()):
            print(f"{m:22} {p:9} {k:8} {s['n']:4} {s['agree']:6} {s['right']:6} {s['confidently_wrong']:10}"
                  + ('  TRUSTED' if (m, p, k) in ok else ''))
        wrong = [dict(id=it['id'], model=m, prompt=p, truth=it['truth'], runs=rd.get(it['id']))
                 for (m, p), rd in readings.items() for it in key
                 if rd.get(it['id']) and None not in rd[it['id']] and rd[it['id']][0] == rd[it['id']][1]
                 and rd[it['id']][0] != unicodedata.normalize('NFC', it['truth'])]
        CAL_PATH.write_text(json.dumps(dict(
            date=datetime.date.today().isoformat(),
            scores=[dict(model=m, prompt=p, kind=k, **s) for (m, p, k), s in sorted(scores.items())],
            trusted=[list(t) for t in sorted(ok)], agreed_differently=wrong), ensure_ascii=False, indent=1) + '\n')
        return 0
    if cmd == 'read':
        return read_main(argv[1:])
    print(__doc__, file=sys.stderr)
    return 2


def read_main(argv):
    book, out = argv[0], _arg(argv, '--out')
    repo = Path(_arg(argv, '--repo', paths.REPO))
    if not out or fixes.forbidden_out(out, repo):
        print('--out FILE is required, and never under fixes/ or static/data: review the proposals, then append',
              file=sys.stderr)
        return 2
    A, B = map(int, _arg(argv, '--chapters').split('-'))
    use = tuple(_arg(argv, '--use').split(':'))
    trust = {tuple(t) for t in json.loads(CAL_PATH.read_text())['trusted']}
    fs = open_findings(book, (A, B))
    ask = [f for f in fs if f['box'] and all(use + (k,) in trust for k in f['kinds'])]
    for f in ask:
        f['image'] = crop(book, f['page'], tuple(f['box']))
    readings = read_all(ask, *use) if ask else {}
    for f in ask:
        del f['image']
    kept, claude = route(fs, readings, use, trust)
    es = propose(repo, book, kept, use)
    Path(out).write_text(''.join(fixes.dumps(e) + '\n' for e in es))
    with open(f'{out}.claude.tsv', 'w') as fh:
        fh.write('reason\tloc\tdata\txml\ttk\tts\tpage\tbox\n')
        for c in claude:
            fh.write('\t'.join(str(c[k] if k != 'box' else ','.join(map(str, c['box'] or []))) for k in
                               ('reason', 'loc', 'data', 'xml', 'tk', 'ts', 'page', 'box')) + '\n')
    sheet(claude, f'{out}.claude.jpg')
    log = RECONCILE / 'agy-readings.jsonl'
    with open(log, 'a') as fh:
        for k in kept:
            fh.write(json.dumps(dict(id=k['id'], book=book, loc=k['loc'], data=k['data'], xml=k['xml'],
                                     reading=k['reading'], model=use[0], prompt=use[1],
                                     date=datetime.date.today().isoformat()), ensure_ascii=False) + '\n')
    from collections import Counter
    print(f"{book} {A}-{B}: {len(fs)} open; agy kept {len(kept)}, proposed {len(es)} entries in {out}; "
          f"to Claude {len(claude)} {dict(Counter(c['reason'] for c in claude))}")
    return 0
