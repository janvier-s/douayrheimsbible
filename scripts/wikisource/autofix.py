"""Proposes (and with --write applies) the two OCR-reliable fix classes.

python3 -I autofix.py <repo> <book> <tokens.json> <chapters a-b> [--write]

1. Annotation stars: an annotation margin note whose next word carries a *
   in the OCR gets "star": true.
2. Swapped verse marks: the verse's <cr> sits where the OCR has no *, while a
   margin note's <na> sits exactly where the OCR has the *. The print puts the
   citation's * there and sets the note in the margin unmarked. The citation
   moves to the note's place, the note to the verse start, and a lectionary
   note is typed as such.
Both are applied to odr-original and odr (by word index; skipped when the
two texts disagree on word count up to that point).
"""
import json, re, sys
from pathlib import Path

REPO, BOOK, TOK = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
A, B = map(int, sys.argv[4].split('-'))
WRITE = '--write' in sys.argv
LECT = re.compile(r'Go[sſ]pel|Epi[sſ]tle|feast|fea[sſ]t|Sunday|part of this', re.I)

toks = [t for t in json.loads(TOK.read_text()) if t['ch'] and A <= t['ch'] <= B]

stars, swaps = [], []
for i, t in enumerate(toks):
    for tag in t['tags']:
        if tag.startswith('mn:') and t['ocr'] is not None and '*' in t['ocr']:
            stars.append((t['ch'], t['ann'], int(tag[3:])))

_orig = json.loads((REPO / f'static/data/odr-original/{BOOK}.json').read_text())


def lectionary_like(ch, v, label):
    note = next((n for n in _orig['chapters'][ch - 1]['verses'][v - 1].get('notes', []) if n['label'] == label), None)
    return bool(note) and (note.get('kind') in ('lectionary', 'head') or note.get('unmarked')
                           or bool(re.match(r'^\s*THE (GO[SſF]PEL|EPI[SſF]TLE|[A-Z]+ PART|FIRST|SECOND|THIRD)', note['text'].upper())))


verses = {}
for t in toks:
    if t['kind'] == 'verse':
        verses.setdefault((t['ch'], t['verse']), []).append(t)
for (ch, v), ts in verses.items():
    crs = [t for t in ts if any(g.startswith('cr:') for g in t['tags'])]
    nas = [t for t in ts if any(g.startswith('na:') for g in t['tags'])]
    if len(crs) != 1:
        continue
    c = crs[0]
    if c['ocr'] is None or '*' in c['ocr']:
        continue  # the OCR did not see this word, or agrees
    # Only a note the print leaves unmarked can be the one sitting where the *
    # belongs: the OCR reads a gloss's ∷ as * too, so a gloss proves nothing.
    hits = [n for n in nas if n['ocr'] is not None and '*' in n['ocr'] and n['w'] != c['w']
            and lectionary_like(ch, v, [g for g in n['tags'] if g.startswith('na:')][0][3:])]
    if len(hits) == 1:
        swaps.append((ch, v, int(c['tags'][0].split(':')[1]), c['w'],
                      [g for g in hits[0]['tags'] if g.startswith('na:')][0][3:], hits[0]['w']))


def plain_words(text):
    t = re.sub(r'<(cr|na|mn)>[^<]*</\1>', ' ', text)
    t = re.sub(r'<[^>]+>', '', t)
    return t.split()


def move_markers(text, cr, na, to_w):
    """Puts <cr>[cr] before word to_w and <na>[na] at the verse start."""
    text = re.sub(rf'\s*<cr>\[{cr}\]</cr>\s*', ' ', text).strip()
    text = re.sub(rf'\s*<na>\[{na}\]</na>\s*', ' ', text).strip()
    # walk words of the raw text, counting only real words
    out, w, i = [], 0, 0
    parts = re.split(r'(\s+)', text)
    placed = False
    for p in parts:
        if not p.strip():
            out.append(p); continue
        bare = re.sub(r'<(cr|na|mn)>[^<]*</\1>', '', p)
        bare = re.sub(r'<[^>]+>', '', bare)
        if bare and w == to_w and not placed:
            # keep a leading opening tag (<sc>, <i>) before the marker? no: the
            # marker goes before the word, after any opening tag
            m = re.match(r'^((?:<[a-z]+>)*)(.*)$', p)
            out.append(m.group(1) + f'<cr>[{cr}]</cr> ' + m.group(2))
            placed = True
        else:
            out.append(p)
        if bare:
            w += 1
    assert placed, (text, to_w)
    return f'<na>[{na}]</na> ' + ''.join(out)


report = []
for ds in ('odr-original', 'odr'):
    bp = REPO / f'static/data/{ds}/{BOOK}.json'
    book = json.loads(bp.read_text())
    for ch, v, cr, cw, na, nw in swaps:
        verse = book['chapters'][ch - 1]['verses'][v - 1]
        before = verse['text']
        try:
            after = move_markers(before, cr, na, nw)
        except AssertionError:
            report.append(f'{ds} {ch}:{v} SKIP (word {nw} not found)'); continue
        note = next(n for n in verse['notes'] if n['label'] == na)
        if LECT.search(note['text']) and note.get('kind') == 'gloss':
            note['kind'] = 'head' if re.search(r'part of this', note['text'], re.I) else 'lectionary'
        elif note.get('kind') not in ('lectionary', 'head'):
            note['unmarked'] = True
        report.append(f'{ds} {ch}:{v} swap cr[{cr}] w{cw} -> w{nw}; na[{na}] -> start ({note["kind"]})\n'
                      f'    {before[:150]}\n    {after[:150]}')
        verse['text'] = after
    if WRITE:
        bp.write_text(json.dumps(book, ensure_ascii=False, separators=(',', ':')))
    for ch, ai, k in stars:
        ap = REPO / f'static/data/{ds}/{BOOK}/annotations/{ch:03d}.json'
        a = json.loads(ap.read_text())
        n = a['annotations'][ai]['notes'][k]
        report.append(f'{ds} {ch} ann#{ai} "{a["annotations"][ai]["title"]}" note {k} star: {n["text"][:50]}')
        n['star'] = True
        if WRITE:
            ap.write_text(json.dumps(a, ensure_ascii=False, separators=(',', ':')))
print('\n'.join(report))
print(f'{len(swaps)} swaps, {len(stars)} stars', '(written)' if WRITE else '(dry run)')
