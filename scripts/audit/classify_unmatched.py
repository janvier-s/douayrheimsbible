#!/usr/bin/env python3
"""Why is a margin note still unmatched after the loose pass?

For every note the loose matcher could not place, look through the scrape's
other containers (chapter headings, margin cross-references, verse text and
annotations) and through every other chapter of the same book, then assign a
reason.

Writes scripts/audit/unmatched-reasons.json and prints counts.
"""
import json, glob, os, re, difflib, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SC = os.path.expanduser(
    "~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/sancta-scrape/data")
SLUG = {'isaie': 'isaias', 'jeremie': 'jeremias', 'malachie': 'malachias'}
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from match_notes import plain, toks, contain  # noqa: E402

PART = re.compile(r'^(The (first|second|third|fourth|fifth|sixth|seventh|eight|ninth|tenth) part|'
                  r'The (first|second|third|fourth|fifth|sixth|seventh) part of this book)', re.I)
LIT = re.compile(r'^(The )?(Epistle|Gospel) (upon|for|in|at)\b', re.I)
CITE = re.compile(r'^[\s\d.,;:&vVcClLipPpAaRrGgEeXxTtOoNnMmUuSsHhJjDdFfBbKkIiQqYyZz\-–]+$')


def is_citation(t):
    """True for a note that is only Scripture citations (no prose)."""
    if not re.search(r'\d', t):
        return False
    words = re.findall(r"[A-Za-z]{2,}", t)
    if not words:
        return False
    allowed = {'and', 'v', 'c', 'ch', 'cap', 'vers', 'chap', 'li', 'lib', 'psal', 'ps'}
    for w in words:
        if w.lower() in allowed:
            continue
        if len(w) > 6 or not w[0].isupper():
            return False
    return True


def scrape_book(book):
    """All textual containers of a book: (kind, chapter, verse, text)."""
    out = []
    d = f'{SC}/{SLUG.get(book, book)}'
    if not os.path.isdir(d):
        return out
    for f in sorted(glob.glob(f'{d}/*.json')):
        ch = int(os.path.basename(f)[:-5])
        j = json.load(open(f))
        for h in j.get('headings', []):
            if h.get('modern'):
                out.append(('heading', ch, 0, h['modern']))
        for v in j.get('verses', []):
            for key in ('modern', 'original'):
                if v.get(key):
                    out.append(('verse', ch, v.get('verse', 0), v[key]))
            for side in ('left', 'right'):
                m = (v.get('margin') or {}).get(side) or {}
                for n in m.get('notes', []) or []:
                    if n.get('modern'):
                        out.append(('note', ch, v.get('verse', 0), n['modern']))
                for x in m.get('xrefs', []) or []:
                    txt = x.get('modern') if isinstance(x, dict) else x
                    if txt:
                        out.append(('xref', ch, v.get('verse', 0), txt))
        for a in j.get('annotations', []):
            for key in ('modern', 'original'):
                x = a.get(key)
                if isinstance(x, dict) and x.get('text'):
                    out.append(('annotation', ch, a.get('verse', 0), x['text']))
    return out


def main():
    rep = json.load(open(f'{ROOT}/scripts/audit/loose-matches.json'))
    by_key = {tuple(m['key']): m for m in rep['loose']}
    unmatched = [tuple(k) for k in rep['unmatched']
                 if not (by_key[tuple(k)]['score'] >= 0.55
                         and (by_key[tuple(k)]['score'] >= 0.8
                              or by_key[tuple(k)]['margin'] >= 0.05))]
    # our note text
    ours = {}
    sys.path.insert(0, os.path.join(ROOT, 'scripts/audit'))
    from vote_loose import load_ours
    ours = load_ours()
    cache = {}
    rows = []
    for k in unmatched:
        if k not in ours:
            continue
        book, ch = k[0], k[1]
        t = plain(ours[k]['modern'])
        row = {'key': list(k), 'text': t}
        if PART.match(t):
            row['reason'] = 'part-summary heading (not in scrape margin notes)'
        elif LIT.match(t):
            row['reason'] = 'liturgical heading (not in scrape margin notes)'
        else:
            if book not in cache:
                cache[book] = scrape_book(book)
            cont = cache[book]
            tt = toks(t)
            best = ('', 0.0, '', '', 0)
            for kind, c, v, s in cont:
                sc = contain(tt, toks(s))
                if sc > best[1]:
                    best = (kind, sc, s, c, v)
            row['best_kind'], row['best_score'] = best[0], round(best[1], 3)
            row['best_chapter'], row['best_verse'] = best[3], best[4]
            if is_citation(t):
                row['reason'] = 'cross-reference only (scrape keeps xrefs separately)'
            elif best[1] >= 0.8 and abs(best[3] - ch) > 1 and best[0] != 'heading':
                row['reason'] = f'filed under another chapter (ch {best[3]}, {best[0]})'
            elif best[1] >= 0.8 and best[0] in ('heading',):
                row['reason'] = 'stored as a chapter heading in the scrape'
            elif best[1] >= 0.8 and best[0] in ('verse', 'annotation'):
                row['reason'] = f'stored as {best[0]} text, not a margin note'
            elif best[1] >= 0.6:
                row['reason'] = 'partially present / merged into a neighbouring note'
            else:
                row['reason'] = 'missing from the scrape'
        rows.append(row)

    json.dump(rows, open(f'{ROOT}/scripts/audit/unmatched-reasons.json', 'w'),
              ensure_ascii=False, indent=1)
    print('still unmatched:', len(rows))
    for reason, n in collections.Counter(r['reason'] for r in rows).most_common():
        print(f'{n:4d}  {reason}')
    print()
    for r in rows:
        if not r['reason'].startswith(('part-summary', 'liturgical')):
            print(r['reason'], '|', r['key'], '|', r['text'][:90])


if __name__ == '__main__':
    main()
