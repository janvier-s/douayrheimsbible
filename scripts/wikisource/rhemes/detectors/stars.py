"""stars (was autofix.py): the two OCR-reliable fix classes, proposed as ledger entries.

1. Annotation stars: an annotation margin note whose next word carries a * in the OCR
   gets "star": true.
2. Swapped verse marks: the verse's <cr> sits where the OCR has no *, while a margin
   note's <na> sits exactly where the OCR has the *. The print puts the citation's * there
   and sets the note in the margin unmarked. The citation moves to the note's place, the
   note to the verse start, and a lectionary note is typed as such.
Both go to odr-original and odr (by word index).
"""
import re
from pathlib import Path
import json

from . import load, snapshot, propose_from

LECT = re.compile(r'Go[sſ]pel|Epi[sſ]tle|feast|fea[sſ]t|Sunday|part of this', re.I)

# Star proposals checked on the scans and found wrong: (book, chapter, annotation
# index, note index). Matt 3 "Doe penance.": the OCR's * is the print's ∷ before
# "Greeke Word" (Tesseract reads ∷ as *). Matt 13 "They haue ſhut.": the * before
# "Which" belongs to the Iren. citation (note 1, starred); the side heading "God is
# not the author of euil." has no mark in the text.
KNOWN_FALSE_STARS = {('matthew', 3, 1, 4), ('matthew', 13, 2, 0)}


def find(book, toks, orig_bj):
    """(stars, swaps) as autofix found them; orig_bj is odr-original's book JSON."""
    stars, swaps = [], []
    for t in toks:
        for tag in t['tags']:
            if tag.startswith('mn:') and t['ocr'] is not None and '*' in t['ocr']:
                if (book, t['ch'], t['ann'], int(tag[3:])) not in KNOWN_FALSE_STARS:
                    stars.append((t['ch'], t['ann'], int(tag[3:])))

    def lectionary_like(ch, v, label):
        note = next((n for n in orig_bj['chapters'][ch - 1]['verses'][v - 1].get('notes', []) if n['label'] == label), None)
        return bool(note) and (note.get('kind') in ('lectionary', 'head') or note.get('unmarked')
                               or bool(re.match(r'^\s*THE (GO[SſF]PEL|EPI[SſF]TLE|[A-Z]+ PART|FIRST|SECOND|THIRD)',
                                                note['text'].upper())))

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
    return stars, swaps


def move_markers(text, cr, na, to_w):
    """Puts <cr>[cr] before word to_w and <na>[na] at the verse start."""
    text = re.sub(rf'\s*<cr>\[{cr}\]</cr>\s*', ' ', text).strip()
    text = re.sub(rf'\s*<na>\[{na}\]</na>\s*', ' ', text).strip()
    out, w = [], 0
    placed = False
    for p in re.split(r'(\s+)', text):
        if not p.strip():
            out.append(p)
            continue
        bare = re.sub(r'<(cr|na|mn)>[^<]*</\1>', '', p)
        bare = re.sub(r'<[^>]+>', '', bare)
        if bare and w == to_w and not placed:
            # the marker goes before the word, after any opening tag (<sc>, <i>)
            m = re.match(r'^((?:<[a-z]+>)*)(.*)$', p)
            out.append(m.group(1) + f'<cr>[{cr}]</cr> ' + m.group(2))
            placed = True
        else:
            out.append(p)
        if bare:
            w += 1
    assert placed, (text, to_w)
    return f'<na>[{na}]</na> ' + ''.join(out)


def run(stores, stars, swaps):
    """Applies the rule to the stores in memory; returns report lines."""
    report = []
    for ds, st in stores.items():
        for ch, v, cr, cw, na, nw in swaps:
            verse = st.bj['chapters'][ch - 1]['verses'][v - 1]
            try:
                after = move_markers(verse['text'], cr, na, nw)
            except AssertionError:
                report.append(f'{ds} {ch}:{v} SKIP (word {nw} not found)')
                continue
            note = next(n for n in verse['notes'] if n['label'] == na)
            if LECT.search(note['text']) and note.get('kind') == 'gloss':
                note['kind'] = 'head' if re.search(r'part of this', note['text'], re.I) else 'lectionary'
            elif note.get('kind') not in ('lectionary', 'head'):
                note['unmarked'] = True
            verse['text'] = after
        for ch, ai, k in stars:
            st.anns[ch]['annotations'][ai]['notes'][k]['star'] = True
    return report


def propose(repo, book, tokens, a, b):
    tokens = Path(tokens)
    toks = [t for t in json.loads(tokens.read_text()) if t['ch'] and a <= t['ch'] <= b]
    stores = load(repo, book)
    before = snapshot(stores)
    stars, swaps = find(book, toks, stores['odr-original'].bj)
    run(stores, stars, swaps)
    return propose_from(book, before, stores, f'detect stars {tokens.name}')


def main(argv):
    """rh.py detect …, for the old script name's shim."""
    from . import main as detect
    return detect(argv)
