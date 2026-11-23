"""Token-cheap triage: A16049.xml (EEBO-TCP) vs static/data/odr-original/<book>.json, plus page state.

Prints ONE short report (~40 lines) instead of per-verse dumps:
  1. pages: posted pages whose local file differs from the posted sha1, git-dirty pages, lint totals
  2. per book: verse text and margin-note findings by kind (counts only)
  3. top recurring residual findings, grouped, so one fix rule covers many hits

Kinds (verse text, compared char-by-char with spaces kept):
  w/vv        XML vv, JSON w (or the reverse)         -> usually JSON modernised w; check scan
  longs       ſ vs s differs                          -> long-s distribution
  lig         ae/oe vs æ/œ                            -> EEBO writes plain letters; mostly noise
  macron      stroke in one source only               -> json-lacks: JSON spelled the word out
  spacing     word split/joined differently           -> mostly noise
  stray-letter  JSON has a one-letter token the XML lacks (often a note anchor not keyed to an XML note)
  anchor-letter same, but the letter matches an XML note label: the print keys a margin note
                with a letter in the text, so this is expected, not an error
  text        anything else (wording, u/v, i/j, typos either side)
  verse-xml / verse-json   verse number absent from one source
Margin notes (matched per chapter by text, so verse placement does not matter):
  note-digits  citation numbers differ (Febr. 4 / 24)  -> highest value
  note-text    wording differs beyond nasal-stroke loss
  note-xml-only / note-json-only   no counterpart

XML is NOT ground truth (EEBO drops lines and misreads). Findings are candidates to
check on the Transkribus text, never auto-fixes. Reviewed-and-fine findings go in
scripts/wikisource/triage-accepted.txt (--accept) and are then hidden.

Usage:
  rh.py triage                     overview of all books
  rh.py triage acts romans         overview of chosen books
  rh.py triage acts --detail text  list findings of one kind (cap with --limit, default 40)
  rh.py triage acts --detail all --tsv out.tsv
  rh.py triage --accept acts text  add all current acts/text findings to the accepted list
  rh.py triage --no-pages          skip page/lint section
  rh.py triage --live              findings re-tested against the live pages (31-451) and the
                                    Transkribus OCR text; --live <book> --detail <kind>
                                    [--status tk-xml|tk-none|tk-json] lists them
"""
from pathlib import Path
import collections, difflib, hashlib, json, re, subprocess, sys, unicodedata

from . import paths, text, xmldiff as X

REPO = X.REPO
ROOT = REPO / 'wikisource/1582-rhemes-nt'
ACCEPTED = paths.HERE / 'triage-accepted.txt'
MAC = '\x01'
CHECKED = {'matthew', 'mark', 'luke', 'john'}  # BOOKS.md: checked against the scans
BOOKS = list(X.BOOKN)

fold_char = text.fold_chars


def fine_json(text):
    """JSON verse text -> lowercase, ſ kept, macron letters decomposed to letter+MAC, spaces single."""
    text = re.sub(r'<(cr|na)>\[\d+\]</\1>', ' ', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    out = []
    for ch in unicodedata.normalize('NFD', unicodedata.normalize('NFC', text).lower()):
        if ch in '\u0304\u0303':
            out.append(MAC)
        elif unicodedata.combining(ch):
            continue
        else:
            out.append(ch)
    return re.sub(r'\s+', ' ', re.sub(r'[^\w\x01]+|_', ' ', ''.join(out))).strip()


def fine_xml(raw):
    """raw XML verse text (stroke carrier = \\x00 after the letter it sits on)."""
    out = []
    for ch in unicodedata.normalize('NFD', unicodedata.normalize('NFC', raw).lower()):
        if ch == '\x00' or ch in '\u0304\u0303':
            out.append(MAC)
        elif unicodedata.combining(ch):
            continue
        else:
            out.append(ch)
    return re.sub(r'\s+', ' ', re.sub(r'[^\w\x01]+|_', ' ', ''.join(out))).strip()


def xml_verses(ch):
    """{verse: (fine string, notes[(anchor, words, label)])} for one XML chapter, no folding."""
    st = X.Stream()
    X.walk(ch, st, None)
    cur, raw, notes = 0, {}, {}
    for ev in st.ev:
        if ev[0] == 'verse':
            cur = int(re.sub(r'\D', '', ev[1]) or 0) or cur
            raw.setdefault(cur, [])
            notes.setdefault(cur, [])
        elif ev[0] == 'raw':
            raw.setdefault(cur, []).append(ev[1])
        elif ev[0] == 'stroke':
            raw.setdefault(cur, []).append('\x00')
        elif ev[0] == 'note':
            notes.setdefault(cur, []).append((X.words(''.join(raw.get(cur, [])).replace('\x00', ''))[-2:], ev[2], ev[1]))
    return {v: (fine_xml(''.join(p)), notes.get(v, [])) for v, p in raw.items()}


def classify(xs, js):
    """kind for one differing opcode pair (xs from XML, js from JSON)."""
    if xs.replace(' ', '') == js.replace(' ', ''):
        return 'spacing'
    xm, jm = MAC in xs, MAC in js
    xn, jn = xs.replace(MAC, ''), js.replace(MAC, '')
    if (xm or jm) and (xn == jn or (xm and not jm and len(jn) - len(xn) in (1, 2) and not xn.strip())):
        return 'macron'
    a, b = fold_char(xn), fold_char(jn)
    if a == b:
        if 'ſ' in xn + jn and xn.replace('ſ', 's') == jn.replace('ſ', 's'):
            return 'longs'
        if 'vv' in xn + jn:
            return 'w/vv'
        if re.search('[æœ]', xn + jn):
            return 'lig'
        return 'longs'
    return 'text'


def widen(s, i1, i2):
    a = s.rfind(' ', 0, i1) + 1
    b = s.find(' ', i2)
    return s[a:b if b >= 0 else len(s)]


def anchor_letter(a, b):
    aw, bw = a.split(), b.split()
    if len(bw) == len(aw) + 1:
        return bw[0] if bw[1:] == aw else bw[-1]
    for x, y in zip(aw, bw):
        if x != y and len(y) == len(x) + 1:
            return y[0]
    return ''


def stray_letter(a, b):
    """JSON carries a margin-note anchor letter the print does not have: 'and' => 'b and', 'depriued' => 'cdepriued'."""
    aw, bw = a.split(), b.split()
    if len(bw) == len(aw) + 1 and len(bw[0]) == 1 and bw[0] not in 'aio' and bw[1:] == aw:
        return True
    if len(bw) == len(aw) + 1 and len(bw[-1]) == 1 and bw[-1] not in 'aio' and bw[:-1] == aw:
        return True
    return len(aw) == len(bw) and any(len(y) == len(x) + 1 and y[1:] == x and y[0] in 'bcdefghklmnpqrstuvwxyz*' and not y.startswith(x[:1] * 2)
                                     for x, y in zip(aw, bw) if x != y) and sum(x != y for x, y in zip(aw, bw)) == 1


def verse_findings(xs, js):
    """-> [(kind, xml words, json words, offset in js, json context, xml context)]"""
    out, seen = [], set()
    if xs == js:
        return out
    sm = difflib.SequenceMatcher(None, xs, js, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        kind = classify(xs[i1:i2], js[j1:j2])
        a, b = widen(xs, i1, i2).replace(MAC, '~'), widen(js, j1, j2).replace(MAC, '~')
        if kind == 'text' and stray_letter(a, b):
            kind = 'stray-letter'
        f = (kind, a, b, j1, js[max(0, j1 - 14):j2 + 14], xs[max(0, i1 - 14):i2 + 14])
        if f[:3] not in seen:
            seen.add(f[:3])
            out.append(f)
    return out


def note_diff(xk, jk):
    """residual differing chars after allowing nasal-stroke loss (XML lacks n/m)."""
    if xk == jk:
        return ''
    sm = difflib.SequenceMatcher(None, xk, jk, autojunk=False)
    res = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        a, b = xk[i1:i2], jk[j1:j2]
        if tag == 'insert' and b in ('n', 'm'):
            continue
        res.append(f'{a}>{b}')
    return ' '.join(res)


def note_findings(xnotes, jnotes):
    """xnotes/jnotes: [(verse, words)] for a chapter, in order -> findings (verse, kind, x, j).

    Compared as one word stream per chapter, so notes moved between verses or citations
    merged/split differently do not matter; only the words and numbers do."""
    xt = [(fold_key(w), v, w) for v, ws in xnotes for w in ws]
    jt = [(fold_key(w), v, w) for v, ws in jnotes for w in ws]
    sm = difflib.SequenceMatcher(None, [t[0] for t in xt], [t[0] for t in jt], autojunk=False)
    out = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        xs, js = [t[2] for t in xt[i1:i2]], [t[2] for t in jt[j1:j2]]
        v = (jt[j1][1] if j1 < len(jt) else xt[i1][1]) if jt or xt else 0
        ctx = ' '.join(t[2] for t in xt[max(0, i1 - 3):i1])
        if tag == 'replace':
            if note_diff(''.join(fold_key(w) for w in xs), ''.join(fold_key(w) for w in js)) == '':
                continue
            kind = 'note-digits' if all(w.isdigit() for w in xs + js) else 'note-text'
        else:
            kind = 'note-xml-only' if tag == 'delete' else 'note-json-only'
        out.append((v, kind, ' '.join(xs)[:60] + (f'   (after: {ctx})' if ctx else ''), ' '.join(js)[:60]))
    return out


def audit_book(book):
    jb = json.loads((REPO / 'static/data/odr-original' / f'{book}.json').read_text(encoding='utf8'))
    xch = X.xml_chapters(book)
    rows = []  # (chapter, verse, kind, xml, json)
    nverses = 0
    for jc in jb['chapters']:
        c = jc['chapter']
        if c not in xch:
            rows.append((c, 0, 'verse-xml', 'chapter missing', '', '', ''))
            continue
        xv = xml_verses(xch[c])
        jverses, jfine = set(), {}
        xnotes, jnotes = [], []
        for n in sorted(xv):
            xnotes += [(n, w) for _, w, _ in xv[n][1]]
        for v in jc['verses']:
            n = v['verse']
            jverses.add(n)
            nverses += 1
            jfine[n] = fine_json(v['text'])
            _, jn, junm = X.json_verse(v)
            jnotes += [(n, w) for _, w, _ in jn] + [(n, w) for w in junm]
            if n not in xv:
                rows.append((c, n, 'verse-xml', 'absent in XML', '', '', ''))
                continue
            labels = {str(l).lower() for _, _, l in xv[n][1]}
            for kind, a, b, _, jc_, xc_ in verse_findings(xv[n][0], jfine[n]):
                if kind == 'stray-letter' and anchor_letter(a, b) in labels:
                    kind = 'anchor-letter'  # print keys a margin note with a letter in the text; XML keeps it as note n=
                rows.append((c, n, kind, a, b, jc_, xc_))
        for n in sorted(set(xv) - jverses - {0}):
            rows.append((c, n, 'verse-json', 'absent in JSON', '', '', ''))
        rows = collapse_splits(rows, c, {n: xv[n] for n in xv}, jfine)
        for n, kind, a, b in note_findings(xnotes, jnotes):
            rows.append((c, n, kind, a, b, '', ''))
    return nverses, rows


fold_key = text.fold_key


def collapse_splits(rows, c, xv, jv):
    """Verse-level 'text' findings that vanish when compared as one string are verse-boundary shifts
    (a verse number missing or misplaced), not wording errors. Replaces the cascade by real findings."""
    bad = sorted({r[1] for r in rows if r[0] == c and r[2] in ('text', 'stray-letter', 'anchor-letter')})
    if len(bad) < 2 or not any(b - a == 1 for a, b in zip(bad, bad[1:])):
        return rows
    jorder = sorted(jv)
    jall, starts, pos = [], [], 0
    for v in jorder:
        starts.append(pos)
        jall.append(jv[v])
        pos += len(jv[v]) + 1
    xall = ' '.join(xv[v][0] for v in sorted(xv) if v > 0)
    fs = verse_findings(xall, ' '.join(jall))
    nbad = len([r for r in rows if r[0] == c and r[2] == 'text'])
    if sum(f[0] == 'text' for f in fs) * 2 > nbad:
        return rows  # not a boundary cascade: keep the per-verse view
    def verse_at(off):
        i = max(k for k in range(len(starts)) if starts[k] <= off)
        return jorder[i]
    rows = [r for r in rows if not (r[0] == c and r[2] in ('text', 'stray-letter', 'anchor-letter', 'w/vv', 'longs', 'macron', 'lig', 'spacing'))]
    rows.append((c, bad[0], 'verse-split', f'XML/JSON verse boundaries differ over {bad[0]}-{bad[-1]}', '', '', ''))
    for kind, a, b, off, jc_, xc_ in fs:
        rows.append((c, verse_at(off), kind, a, b, jc_, xc_))
    return rows


LIVE = {'matthew': (31, 113), 'mark': (114, 160), 'luke': (161, 241), 'john': (242, 308),
        'acts': (309, 404), 'romans': (405, 451), '1-corinthians': (452, 496),
        '2-corinthians': (497, 521), 'galatians': (522, 539),
        'ephesians': (540, 552), 'philippians': (553, 562)}  # wiki page ranges (BOOKS.md / git log)
TEXT_KINDS = {'w/vv', 'longs', 'macron', 'stray-letter', 'text', 'lig', 'spacing'}  # anchor-letter is expected, not checked


def wiki_plain(src):
    """wikitext -> verse-text-like plain string (margin notes, verse numbers, running heads dropped)."""
    src = re.sub(r'<noinclude>.*?</noinclude>', ' ', src, flags=re.S)
    src = text.wiki_to_ls(src)
    for _ in range(6):
        src = re.sub(r'\{\{(?:verse|verseline|rh|continues|MarginNote|outside R?L|outside R)\|[^{}]*\}\}', ' ', src)
        src = re.sub(r'\{\{[A-Za-z]+\|([^{}|]*)\}\}', r'\1', src)
    return fine_json(src)


def live_text(book):
    a, b = LIVE[book]
    parts = []
    for n in range(a, b + 1):
        f = ROOT / 'pages' / f'{n}.wiki'
        if f.exists():
            parts.append((n, wiki_plain(f.read_text(encoding='utf8'))))
    return parts


def page_status(parts, row):
    """live-json: page has the JSON reading; live-xml: page already has the XML reading; live-other: neither."""
    jc_, xc_ = row[5], row[6]
    for n, t in parts:
        if jc_ and jc_ in t:
            return 'live-json', n
    for n, t in parts:
        if xc_ and xc_ in t:
            return 'live-xml', n
    return 'live-other', 0


TK = Path.home() / 'facsimiles/transkribus/pages'
SCAN = Path.home() / 'facsimiles/ocr-2026-11-12/sancta-scan'


def ocr_key(s):
    """spaceless comparison key: long-s, vv/w, ae/oe, macrons and all punctuation folded away."""
    s = unicodedata.normalize('NFD', unicodedata.normalize('NFC', s).lower())
    s = ''.join(c for c in s if not unicodedata.combining(c)).replace(MAC, '')
    return re.sub(r'[^a-z0-9]', '', fold_char(s))


def ocr_text(book):
    """One spaceless key per OCR file (Transkribus; Matthew only has the sancta-scan Tesseract)."""
    root = SCAN / book if book == 'matthew' else TK / book
    return [(p, ocr_key(p.read_text(errors='replace'))) for p in sorted(root.rglob('*.txt'))]


def ocr_status(ocr, row):
    """tk-xml: OCR has the XML reading (JSON is wrong); tk-json: OCR has the JSON reading (XML is wrong);
    tk-none: neither found (OCR noise or both wrong, needs a look); tk-both: ambiguous."""
    jk, xk = ocr_key(row[5]), ocr_key(row[6])
    hj = bool(jk) and any(jk in t for _, t in ocr)
    hx = bool(xk) and any(xk in t for _, t in ocr)
    return 'tk-both' if hj and hx else 'tk-json' if hj else 'tk-xml' if hx else 'tk-none'


def fkey(book, r):
    return f'{book}|{r[0]}:{r[1]}|{r[2]}|{r[3]}|{r[4]}'


def load_accepted():
    return set(ACCEPTED.read_text(encoding='utf8').splitlines()) if ACCEPTED.exists() else set()


def pages_section():
    out = []
    m = json.loads((ROOT / 'manifest.json').read_text())
    changed, never = [], []
    for p in sorted((ROOT / 'pages').glob('*.wiki'), key=lambda p: int(p.stem)):
        n = int(p.stem)
        e = m.get(str(n))
        if not e:
            never.append(n)
        elif hashlib.sha1(p.read_bytes()).hexdigest() != e['sha1']:
            changed.append(n)
    out.append(f'pages: {len(m)} in manifest; local differs from posted: {ranges(changed)}; not in manifest: {ranges(never)}')
    g = subprocess.run(['git', 'status', '--short', '--', 'wikisource/1582-rhemes-nt/pages', 'static/data/odr-original'],
                       cwd=REPO, capture_output=True, text=True).stdout.split('\n')
    dirty_pages = [int(re.search(r'pages/(\d+)\.wiki', l).group(1)) for l in g if 'pages/' in l]
    dirty_data = [Path(l.split()[-1]).stem for l in g if 'odr-original' in l]
    out.append(f'git-dirty: {len(dirty_pages)} pages ({ranges(sorted(dirty_pages))}); data: {", ".join(dirty_data) or "none"}')
    lint = subprocess.run([sys.executable, '-I', str(paths.RH), 'lint', str(ROOT / 'pages')], capture_output=True, text=True)
    out.append('lint: ' + (lint.stdout.strip().splitlines() or ['?'])[-1])
    return out


def ranges(ns):
    if not ns:
        return 'none'
    out, s, p = [], ns[0], ns[0]
    for n in ns[1:] + [None]:
        if n is not None and n == p + 1:
            p = n
            continue
        out.append(str(s) if s == p else f'{s}-{p}')
        if n is not None:
            s = p = n
    return ','.join(out)


KINDS = ['w/vv', 'longs', 'macron', 'stray-letter', 'anchor-letter', 'text', 'lig', 'spacing', 'verse-split', 'verse-xml', 'verse-json',
         'note-digits', 'note-text', 'note-xml-only', 'note-json-only']
SHORT = {'verse-split': 'v-split', 'stray-letter': 'stray-ltr', 'anchor-letter': 'anchor-l', 'verse-xml': 'v-noXML', 'verse-json': 'v-noJSON', 'note-digits': 'n-digits',
         'note-text': 'n-text', 'note-xml-only': 'n-xmlonly', 'note-json-only': 'n-jsonon'}


def live_main(argv):
    """Findings re-tested against the live page text (pages 31-451). Only 'live-json' needs a fix
    (and only if the XML reading is right on the scan); 'live-xml' means the page is already fine."""
    args = [a for a in argv if not a.startswith('--')]
    opt = lambda k, d=None: argv[argv.index(k) + 1] if k in argv else d
    detail, limit, status = opt('--detail'), int(opt('--limit', 40)), opt('--status', 'tk-xml')
    for a in (detail, opt('--limit'), opt('--status')):
        if a in args:
            args.remove(a)
    acc = load_accepted()
    table = collections.defaultdict(collections.Counter)
    shown = 0
    for b in args or list(LIVE):
        parts = live_text(b)
        ocr = ocr_text(b)
        _, rows = audit_book(b)
        for r in rows:
            if r[2] not in TEXT_KINDS or fkey(b, r) in acc:
                continue
            st, pg = page_status(parts, r)
            tk = ocr_status(ocr, r) if st == 'live-json' else '-'
            table[b][(r[2], tk)] += 1
            if detail and detail in ('all', r[2]) and st == 'live-json' and tk == status:
                if shown < limit:
                    print(f'{b} p{pg} {r[0]}:{r[1]} [{r[2]}] {r[3]} => {r[4]}')
                shown += 1
    if detail:
        print(f'-- {shown} rows with status {status} (showing {min(shown, limit)})')
        return
    kinds = ['stray-letter', 'text', 'longs', 'macron', 'w/vv', 'lig', 'spacing']
    print('Findings where the LIVE page has the JSON reading, split by what the OCR text shows:')
    print('  tk-xml = OCR agrees with XML, so the page is WRONG (fix) / tk-json = OCR agrees with page, XML wrong /')
    print('  tk-none = OCR shows neither (look) / tk-both = ambiguous.   Cells: xml/json/none/both')
    print(f'{"book":<9}' + ''.join(f'{k:>17}' for k in kinds))
    for b, c in table.items():
        print(f'{b:<9}' + ''.join(f'{c[(k, "tk-xml")]:>4}/{c[(k, "tk-json")]:>3}/{c[(k, "tk-none")]:>3}/{c[(k, "tk-both")]:>2} ' for k in kinds))
    print('\nDrill down: triage.py --live <book> --detail <kind> [--status tk-xml|tk-none|tk-json] [--limit N]')


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if '--live' in argv:
        return live_main([a for a in argv if a != '--live'])
    args = [a for a in argv if not a.startswith('--')]
    opt = lambda k, d=None: argv[argv.index(k) + 1] if k in argv else d
    detail = opt('--detail')
    limit = int(opt('--limit', 40))
    tsv = opt('--tsv')
    if '--accept' in argv:
        i = argv.index('--accept')
        book, kind = argv[i + 1], argv[i + 2]
        if book not in BOOKS:
            sys.exit(f'unknown book {book!r}; one of: {", ".join(BOOKS)}')
        _, rows = audit_book(book)
        keys = load_accepted() | {fkey(book, r) for r in rows if kind in ('all', r[2])}
        ACCEPTED.write_text('\n'.join(sorted(keys)) + '\n', encoding='utf8')
        print(f'accepted list now {len(keys)} entries')
        return
    for a in (opt('--detail'), opt('--tsv'), opt('--limit')):
        if a in args:
            args.remove(a)
    books = args or BOOKS
    acc = load_accepted()
    if '--no-pages' not in argv and not detail:
        print('== PAGES ==')
        print('\n'.join(pages_section()))
    results = {}
    for b in books:
        try:
            nv, rows = audit_book(b)
        except Exception as e:  # keep going on one bad book
            print(f'{b}: ERROR {type(e).__name__}: {e}')
            continue
        results[b] = (nv, [r for r in rows if fkey(b, r) not in acc], len(rows) - len([r for r in rows if fkey(b, r) not in acc]))
    if detail:
        n = 0
        w = open(tsv, 'w', encoding='utf8') if tsv else None
        if w:
            w.write('book\tchapter\tverse\tkind\txml\tjson\n')
        for b, (nv, rows, _) in results.items():
            for r in rows:
                if detail in ('all', r[2]):
                    if w:
                        w.write('\t'.join([b] + [str(x) for x in r]) + '\n')
                    elif n < limit:
                        print(f'{b} {r[0]}:{r[1]} [{r[2]}] {r[3]} => {r[4]}')
                    n += 1
        print(f'-- {n} rows' + (f' -> {tsv}' if w else f' (showing {min(n, limit)})'))
        return
    print('\n== XML vs JSON (counts; noise kinds lig/spacing last) ==')
    cols = [k for k in KINDS]
    hdr = f'{"book":<16}{"vs":>5} ' + ' '.join(f'{SHORT.get(k, k):>9}' for k in cols)
    print(hdr)
    tot = collections.Counter()
    groups = collections.defaultdict(collections.Counter)
    for b, (nv, rows, hidden) in results.items():
        c = collections.Counter(r[2] for r in rows)
        tot.update(c)
        print(f'{b:<16}{nv:>5} ' + ' '.join(f'{c[k] or "·":>9}' for k in cols) + (f'  (+{hidden} accepted)' if hidden else ''))
        for r in rows:
            if r[2] in ('w/vv', 'longs', 'macron', 'text', 'note-digits'):
                groups[r[2]][(r[3], r[4])] += 1
    print(f'{"TOTAL":<16}{"":>5} ' + ' '.join(f'{tot[k] or "·":>9}' for k in cols))
    print('\n== WHAT TO LOOK AT (xml => json) ==')
    allrows = [(b, r) for b, (_, rows, _) in results.items() for r in rows]
    for kind, note in (('w/vv', 'JSON w where XML vv = candidates for modernised w'), ('macron', 'JSON spelled out where XML has a stroke')):
        cnt = collections.Counter(('checked Mt-Jn' if b in CHECKED else 'unchecked') for b, r in allrows if r[2] == kind)
        print(f'{kind}: {dict(cnt)}  ({note}; settle them with rh.py diff ocr, whose xml column is the XML vote, then rh.py detect wvv)')
    for kind, n in (('stray-letter', 8), ('text', 8), ('longs', 6), ('macron', 5), ('note-digits', 6), ('verse-split', 9), ('verse-xml', 4)):
        rr = [(b, r) for b, r in allrows if r[2] == kind]
        if not rr:
            continue
        print(f'-- {kind}: {len(rr)} in {len({b for b, _ in rr})} books; ' + ('top books: ' + ', '.join(f'{b} {k}' for b, k in collections.Counter(b for b, _ in rr).most_common(3))))
        grp = collections.Counter((r[3], r[4]) for _, r in rr)
        first = {}
        for b, r in rr:
            first.setdefault((r[3], r[4]), f'{b} {r[0]}:{r[1]}')
        for (a, c), k in grp.most_common(n):
            print(f'  {k:>3}x {first[(a, c)]:<20} {a[:48]} => {c[:48]}')
    print('\nDrill down: triage.py <book> --detail <kind> [--limit N]; accept: triage.py --accept <book> <kind>')

