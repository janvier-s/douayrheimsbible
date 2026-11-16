#!/usr/bin/env python3
"""Loose whole-note matching of ODR margin notes to the Sancta scrape.

Baseline: first three words of the modern note (the first pass).  For the notes
that misses, look for the best whole-note fuzzy match among every scrape note in
the same chapter and its neighbours, scoring the modern and the 1609 text
separately.  Score is the best containment ratio in either direction, so that a
note merged into a longer scrape note still matches.

Read-only; writes scripts/audit/loose-matches.json.
"""
import json, glob, os, re, difflib, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SC = os.path.expanduser(
    "~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/sancta-scrape/data")
SLUG = {'isaie': 'isaias', 'jeremie': 'jeremias', 'malachie': 'malachias'}
TAG = re.compile(r'<[^>]+>')


def plain(s):
    return re.sub(r'\s+', ' ', TAG.sub(' ', s).replace('ſ', 's')).strip()


def surf(w):
    return re.sub(r'^[^\w]+|[^\w]+$', '',
                  w.lower().replace('ſ', 's').replace('vv', 'w').replace('’', "'"))


def sk(w):
    w = surf(w)
    w = w.replace('&', 'and')
    w = w.replace('w', 'u').replace('j', 'i').replace('v', 'u').replace('y', 'i')
    w = re.sub(r'(.)\1', r'\1', w)
    return re.sub(r'[aeiou]', '', w) or w


def toks(s):
    return [sk(w) for w in plain(s).split() if sk(w)]


def ratio(a, b):
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()


def contain(a, b):
    """How much of the shorter sequence appears in the longer one."""
    if not a or not b:
        return 0.0
    if len(a) > len(b):
        a, b = b, a
    n = len(a)
    best = 0.0
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    for blk in sm.get_matching_blocks():
        # extend the anchor to a window the length of a
        start = max(0, min(blk.b - blk.a, len(b) - n))
        w = b[start:start + n]
        r = difflib.SequenceMatcher(None, a, w, autojunk=False).ratio()
        if r > best:
            best = r
            if best > 0.999:
                break
    return best


def load_ours():
    out = {}
    for f in sorted(glob.glob(f'{ROOT}/static/data/odr/*.json')):
        book = os.path.basename(f)[:-5]
        of = f'{ROOT}/static/data/odr-original/{book}.json'
        if not os.path.exists(of):
            continue
        md, od = json.load(open(f)), json.load(open(of))
        och = {c['chapter']: c for c in od.get('chapters', [])}
        for ch in md.get('chapters', []):
            oc = och.get(ch['chapter'])
            if not oc:
                continue
            ov = {v['verse']: v for v in oc['verses']}
            for v in ch['verses']:
                o = ov.get(v['verse'], {})
                on = {n['label']: n for n in o.get('notes', []) if n.get('label')}
                for n in v.get('notes', []):
                    if not n.get('label') or n['label'] not in on:
                        continue
                    if len(plain(n['text']).split()) < 4:
                        continue
                    if len(plain(on[n['label']]['text']).split()) < 4:
                        continue
                    out[(book, ch['chapter'], v['verse'], n['label'])] = {
                        'modern': n['text'], 'original': on[n['label']]['text']}
    return out


def load_scrape():
    cache = {}

    def one(book, ch):
        p = f'{SC}/{SLUG.get(book, book)}/{ch}.json'
        if not os.path.exists(p):
            return []
        res = []
        d = json.load(open(p))
        for v in d.get('verses', []):
            for side in ('left', 'right'):
                m = (v.get('margin') or {}).get(side)
                for i, n in enumerate((m or {}).get('notes', []) if m else []):
                    if n.get('original') and n.get('modern'):
                        res.append({'original': n['original'], 'modern': n['modern'],
                                    'verse': v.get('verse'), 'side': side, 'idx': i})
        return res

    def get(book, ch):
        key = (book, ch)
        if key not in cache:
            cache[key] = one(book, ch)
        return cache[key]

    return get


def main():
    ours = load_ours()
    get = load_scrape()

    baseline = {}
    for k, o in ours.items():
        book, ch = k[0], k[1]
        key = [sk(w) for w in plain(o['modern']).split()[:3]]
        got = None
        for c in (ch, ch - 1, ch + 1):
            for s in get(book, c):
                if [sk(w) for w in plain(s['modern']).split()[:3]] == key:
                    got = s
                    break
            if got:
                break
        baseline[k] = got

    unmatched = [k for k, v in baseline.items() if v is None]
    print(f'notes: {len(ours)}  baseline matched: {len(ours) - len(unmatched)}  '
          f'unmatched: {len(unmatched)}')

    loose = {}
    detail = []
    for k in unmatched:
        o = ours[k]
        book, ch = k[0], k[1]
        mt, ot = toks(o['modern']), toks(o['original'])
        cands = {}
        for c in (ch, ch - 1, ch + 1):
            for s in get(book, c):
                sig = (plain(s['modern']), plain(s['original']))
                if sig in cands:
                    continue
                sm, so = toks(s['modern']), toks(s['original'])
                rm = contain(mt, sm)
                ro = contain(ot, so)
                score = max(rm, ro)
                cands[sig] = (score, rm, ro, s, c)
        ranked = sorted(cands.values(), key=lambda x: -x[0])
        if not ranked:
            continue
        score, rm, ro, s, c = ranked[0]
        second = ranked[1][0] if len(ranked) > 1 else 0.0
        loose[k] = {'scrape': s, 'score': score, 'rm': rm, 'ro': ro,
                    'chapter': c, 'margin': score - second}
        detail.append({'key': k, 'score': score, 'rm': rm, 'ro': ro,
                       'chapter': c, 'margin': score - second,
                       'ours_m': plain(o['modern']), 'ours_o': plain(o['original']),
                       'sc_m': plain(s['modern']), 'sc_o': plain(s['original'])})

    for th in (0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9):
        print(f'  score>={th}: {sum(1 for v in loose.values() if v["score"] >= th)}')

    json.dump({'unmatched': [list(k) for k in unmatched],
               'loose': [{'key': list(k), 'score': v['score'], 'rm': v['rm'],
                          'ro': v['ro'], 'chapter': v['chapter'],
                          'margin': v['margin'],
                          'scrape_modern': plain(v['scrape']['modern']),
                          'scrape_original': plain(v['scrape']['original']),
                          'scrape_verse': v['scrape']['verse'],
                          'scrape_side': v['scrape']['side']}
                         for k, v in loose.items()],
               'detail': detail},
              open(os.path.join(ROOT, 'scripts/audit/loose-matches.json'), 'w'),
              ensure_ascii=False, indent=1)
    print('wrote scripts/audit/loose-matches.json')


if __name__ == '__main__':
    main()
