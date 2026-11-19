"""Fix LIVE wiki pages (31-451) for the findings the Transkribus OCR confirms (triage.py --live, status tk-xml).

Only two safe, mechanical kinds:
  macron  page spells a word out (vpon) where the print has the stroke (vpō): drop the n/m, add U+0304.
  text    one-word wording difference where the OCR agrees with the XML reading.
A fix is applied only when the page has exactly ONE matching word in the finding's context;
anything else is listed as 'skip' for a human. Dry run unless --write. Never posts, never touches
the manifest: post afterwards with wikipost.py (lint first).

Usage: fix_live.py [book ...] [--write] [--kind macron|text]
"""
from pathlib import Path
import difflib, re, sys, unicodedata

sys.path.insert(0, str(Path(__file__).parent))
import triage as T  # noqa: E402

PAGES = T.ROOT / 'pages'
MACRON = '\u0304'


def units(w):
    """wikitext word -> units, {{ls}} is one unit 'ſ'."""
    return [('ſ' if u == '{{ls}}' else u) for u in re.findall(r'\{\{ls\}\}|.', w)]


def join(us):
    return ''.join('{{ls}}' if u == 'ſ' else u for u in us)


def pattern(word):
    p = ''.join(r'(?:\{\{ls\}\}|ſ)' if c == 'ſ' else re.escape(c) for c in word)
    return re.compile(r'(?<![\w}{|])' + p + r'(?![\w{])', re.I)


def macron_target(us, a, b):
    """us: units of the page word (same letters as b); a: XML word with ~ strokes; b: JSON word."""
    base = a.replace('~', '')
    strokes = []  # indexes into base of letters carrying the stroke
    k = 0
    for ch in a:
        if ch == '~':
            strokes.append(k - 1)
        else:
            k += 1
    out = [None] * len(base)
    sm = difflib.SequenceMatcher(None, base, b, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for d in range(i2 - i1):
                out[i1 + d] = us[j1 + d]
        elif not (tag == 'insert' and b[j1:j2] in ('n', 'm')):
            return None  # not a pure nasal expansion
    if any(o is None for o in out):
        return None
    for k in strokes:
        if out[k] is None or out[k].lower() not in 'aeiou':
            return None  # no precomposed macron letter (n-bar etc.): leave to a human
        out[k] = unicodedata.normalize('NFC', out[k] + MACRON)
    return join(out)


def text_target(us, a, b):
    if ' ' in a or ' ' in b or '~' in a or not a:
        return None
    new = [u for u in units(a.replace('ſ', '{{ls}}'))]
    if us and us[0].isupper():
        new[0] = new[0].upper()
    return join(new)


# Read by eye on Transkribus-frame crops (2026-11-19): the 8 words the mechanical pass skipped.
# (wiki page, exact old wikitext, new wikitext). Applied only if the old text occurs exactly once.
MANUAL = [
    (200, 'build the monuments of the Prophets', 'build the monum\u0113ts of the Prophets'),
    (209, 'not to recompen{{ls}}e thee', 'not to rec\u014dpen{{ls}}e thee'),
    (261, 'And when they had found him beyond', 'And vvh\u0113 they had found him beyond'),
    (287, 'you not knowen me', 'you not knovv\u0113 me'),
    (346, 'a great linnen {{ls}}heete', 'a great li\u00f1en {{ls}}heete'),
    (350, 'as vpon vs al{{ls}}o', 'as vp\u014d vs al{{ls}}o'),
    (353, 'And when they had opened', 'And vvh\u0113 they had opened'),
    (431, 'not they that are the children of the fle{{ls}}h', 'not they that are the childr\u0113 of the fle{{ls}}h'),
]


def apply_manual(write):
    ok = 0
    for pg, old, new in MANUAL:
        f = PAGES / f'{pg}.wiki'
        text = f.read_text(encoding='utf8')
        if text.count(old) != 1:
            if text.count(new) == 1:
                print(f'already done p{pg}: {new}')
            else:
                print(f'skip manual p{pg} ({text.count(old)}x): {old}')
            continue
        print(f'{"FIX " if write else "would fix "}manual p{pg}: {old}  ->  {new}')
        if write:
            f.write_text(text.replace(old, new), encoding='utf8')
        ok += 1
    return ok


def verse_region(text, chapter, verse):
    """(start, end) of one verse on a page: its {{verse}} marker (or the page start when the verse
    began on the previous page) up to the next marker."""
    marks = [(m.start(), int(m.group(1)), int(m.group(2)))
             for m in re.finditer(r'\{\{verse\|chapter=(\d+)\|verse=(\d+)\}\}', text)]
    starts = [p for p, c, v in marks if (c, v) == (chapter, verse)]
    start = starts[0] if starts else 0
    ends = [p for p, _, _ in marks if p > start]
    return start, (ends[0] if ends else len(text))


def main(argv):
    write = '--write' in argv
    kinds = {argv[argv.index('--kind') + 1]} if '--kind' in argv else {'macron', 'text'}
    books = [a for a in argv if a in T.LIVE] or list(T.LIVE)
    done = skipped = 0
    for book in books:
        parts = T.live_text(book)
        ocr = T.ocr_text(book)
        _, rows = T.audit_book(book)
        edits = {}  # page -> [(old, new, label)]
        for r in rows:
            if r[2] not in kinds:
                continue
            st, pg = T.page_status(parts, r)
            if st != 'live-json' or T.ocr_status(ocr, r) != 'tk-xml':
                continue
            a, b = r[3], r[4]
            label = f'{book} p{pg} {r[0]}:{r[1]} [{r[2]}] {a} => {b}'
            if len(a.split()) != 1 or len(b.split()) != 1:
                print('skip (multi-word)', label)
                skipped += 1
                continue
            text = (PAGES / f'{pg}.wiki').read_text(encoding='utf8')
            matches = [m for m in pattern(b).finditer(text)]
            if len(matches) > 1:
                lo, hi = verse_region(text, r[0], r[1])
                matches = [m for m in matches if lo <= m.start() < hi]
            if len(matches) != 1:
                print(f'skip ({len(matches)} matches on page)', label)
                skipped += 1
                continue
            m = matches[0]
            us = units(m.group(0))
            new = macron_target(us, a, b) if r[2] == 'macron' else text_target(us, a, b)
            if not new or unicodedata.normalize('NFC', new) == m.group(0):
                print('skip (no safe rewrite)', label)
                skipped += 1
                continue
            edits.setdefault(pg, []).append((m.group(0), new, label, r[0], r[1]))
        for pg, es in sorted(edits.items()):
            f = PAGES / f'{pg}.wiki'
            text = f.read_text(encoding='utf8')
            for old, new, label, ch, vs in es:
                pos = [m.start() for m in re.finditer(re.escape(old), text)]
                lo, hi = verse_region(text, ch, vs)
                inv = [p for p in pos if lo <= p < hi]
                if len(inv) != 1:
                    print(f'skip ({len(inv)}x in verse)', label)
                    skipped += 1
                    continue
                text = text[:inv[0]] + new + text[inv[0] + len(old):]
                print(f'{"FIX " if write else "would fix "}{label}   [{old} -> {new}]')
                done += 1
            if write:
                f.write_text(text, encoding='utf8')
    if '--kind' not in argv and not [a for a in argv if a in T.LIVE]:
        done += apply_manual(write)  # the hand-checked table runs only on a full, unfiltered pass
    if write:
        print('now: python3 scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages, then wikipost.py for the changed pages')
    print(f'-- {done} {"applied" if write else "fixable (dry run)"}, {skipped} skipped')


if __name__ == '__main__':
    main(sys.argv[1:])
