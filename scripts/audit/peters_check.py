#!/usr/bin/env python3
"""Can Peters' modernised edition verify the notes the scrape lacks?

Peters' OCR is a MODERN-wording witness: agreement checks the modern text and
says nothing about 1609 spelling.  Pages are indexed by five-word skeleton
shingles; each unmatched note is looked up, then verified by whole-note
containment.  The page is reported so the book/chapter can be checked by hand.

  python3 scripts/audit/peters_check.py
"""
import os, re, glob, json, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PETERS = os.path.expanduser('~/facsimiles/ocr-2026-11-12/peters-columns')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from match_notes import plain, sk, toks  # noqa: E402

NORM = re.compile(r'[^A-Za-z0-9 ]')


def page_info(path):
    s = open(path, encoding='utf-8', errors='replace').read()
    # nearest chapter heading before the first verse of the page
    ch = None
    book = None
    for line in s.splitlines():
        m = re.match(r'\s*(?:ANNOTATIONS\s*)?Chapter\s+(\d+)', line, re.I)
        if m:
            ch = int(m.group(1))
        m = re.match(r'\s*THE (?:BOOK|GOSPEL|EPISTLE|ACT|APOCALYPSE|CATHOLIC)[^\n]*', line)
        if m and len(line) < 90:
            book = line.strip()
    return book, ch


def build():
    pages = []
    for vol in ('v1', 'v2', 'v3'):
        for f in sorted(glob.glob(f'{PETERS}/{vol}/*.txt')):
            s = open(f, encoding='utf-8', errors='replace').read()
            t = toks(s)
            pages.append({'path': f, 'tokens': t,
                          'shingles': set(tuple(t[i:i + 5]) for i in range(len(t) - 4))})
    index = collections.defaultdict(set)
    for i, p in enumerate(pages):
        for sh in p['shingles']:
            index[sh].add(i)
    return pages, index


def contain_window(note, page):
    """Best ratio of the note tokens against a window of the page."""
    n = len(note)
    if not n or not page:
        return 0.0
    best = 0.0
    import difflib
    sm = difflib.SequenceMatcher(None, note, page, autojunk=False)
    for blk in sm.get_matching_blocks():
        start = max(0, min(blk.b - blk.a, len(page) - n))
        w = page[start:start + n]
        r = difflib.SequenceMatcher(None, note, w, autojunk=False).ratio()
        best = max(best, r)
        if best > 0.99:
            break
    return best


def main():
    rows = json.load(open(f'{ROOT}/scripts/audit/unmatched-reasons.json'))
    todo = [r for r in rows if not r['reason'].startswith(
        ('part-summary', 'liturgical', 'cross-reference'))]
    print('checking', len(todo), 'notes against Peters')
    pages, index = build()
    print('pages indexed:', len(pages))
    out = []
    for r in todo:
        note = toks(r['text'])
        votes = collections.Counter()
        for i in range(len(note) - 4):
            for pi in index.get(tuple(note[i:i + 4 + 1]), ()):
                votes[pi] += 1
        cand = [pi for pi, _ in votes.most_common(6)]
        best = (0.0, None)
        for pi in cand:
            sc = contain_window(note, pages[pi]['tokens'])
            if sc > best[0]:
                best = (sc, pi)
        book, ch = page_info(pages[best[1]]['path']) if best[1] is not None else ('', None)
        out.append({'key': r['key'], 'text': r['text'], 'score': round(best[0], 3),
                    'page': os.path.basename(pages[best[1]]['path']) if best[1] is not None else '',
                    'volume': os.path.basename(os.path.dirname(pages[best[1]]['path'])) if best[1] is not None else '',
                    'page_book': book, 'page_chapter': ch})
    for r in out:
        print(f"{r['score']:.2f} {r['volume']}/{r['page']} ch{r['page_chapter']} {r['key']}")
        if r['score'] < 0.8:
            print('     ', r['text'][:110])
    json.dump(out, open(f'{ROOT}/scripts/audit/peters-check.json', 'w'),
              ensure_ascii=False, indent=1)
    print('verified (>=0.8):', sum(1 for r in out if r['score'] >= 0.8), 'of', len(out))


if __name__ == '__main__':
    main()
