#!/usr/bin/env python3
"""Compare the freshly fetched pages with the cached scrape.

Answers: for the notes and annotations the cache lacks, does the live site have
them?  Also counts notes present on the site but absent from the cache (and the
reverse) over the fetched chapters.
"""
import json, os, re, sys, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SC = os.path.expanduser(
    "~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/sancta-scrape/data")
SLUG = {'isaie': 'isaias', 'jeremie': 'jeremias', 'malachie': 'malachias'}
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from match_notes import plain, toks, contain  # noqa: E402


def cached(book, ch):
    p = f'{SC}/{SLUG.get(book, book)}/{ch}.json'
    if not os.path.exists(p):
        return {'notes': [], 'annotations': []}
    j = json.load(open(p))
    notes = []
    for v in j.get('verses', []):
        for side in ('left', 'right'):
            for n in (((v.get('margin') or {}).get(side) or {}).get('notes') or []):
                if n.get('modern') or n.get('original'):
                    notes.append(n)
    ann = []
    for a in j.get('annotations', []):
        m = a.get('modern') or {}
        o = a.get('original') or {}
        ann.append({'verse': str(a.get('verse')),
                    'modern': m.get('text', '') if isinstance(m, dict) else '',
                    'original': o.get('text', '') if isinstance(o, dict) else ''})
    return {'notes': notes, 'annotations': ann}


def best(text, pool, key='modern'):
    if not text or not pool:
        return 0.0, None
    t = toks(text)
    b = (0.0, None)
    for x in pool:
        s = contain(t, toks(x.get(key, '')))
        if s > b[0]:
            b = (s, x)
    return b


def main():
    targets = json.load(open(f'{ROOT}/scripts/audit/fetch-targets.json'))
    reasons = {tuple(r['key']): r for r in
               json.load(open(f'{ROOT}/scripts/audit/unmatched-reasons.json'))}
    sys.path.insert(0, os.path.join(ROOT, 'scripts/audit'))
    from vote_loose import load_ours
    ours = load_ours()

    site_notes = 0
    cache_notes = 0
    site_only_notes = 0
    cache_only_notes = 0
    per_chapter = []
    note_rows = []
    for t in targets['targets']:
        book, ch = t['book'], t['chapter']
        p = f'{ROOT}/scripts/audit/site/{book}/{ch}.json'
        if not os.path.exists(p):
            continue
        site = json.load(open(p))
        cache = cached(book, ch)
        site_notes += len(site['notes'])
        cache_notes += len(cache['notes'])
        # notes on the site not represented in the cache, and vice versa
        s_only = 0
        for n in site['notes']:
            r, _ = best(n.get('modern', ''), cache['notes'])
            if r < 0.8:
                s_only += 1
        c_only = 0
        for n in cache['notes']:
            r, _ = best(n.get('modern', ''), site['notes'])
            if r < 0.8:
                c_only += 1
        site_only_notes += s_only
        cache_only_notes += c_only
        per_chapter.append({'book': book, 'chapter': ch,
                            'cached': len(cache['notes']),
                            'site': len(site['notes']),
                            'site_only': s_only, 'cache_only': c_only})

        # the notes we still have to place
        for k, r in reasons.items():
            if k[0] != book or k[1] != ch:
                continue
            if not r['reason'].startswith(('missing', 'partially')):
                continue
            score, hit = best(ours[k]['modern'], site['notes'])
            note_rows.append({'key': list(k), 'reason': r['reason'],
                              'site_score': round(score, 3),
                              'site_text': (hit or {}).get('modern', '')[:160]})

    # annotations named in the target file
    ann_rows = []
    for b, c, v in targets['missing_annotations']:
        p = f'{ROOT}/scripts/audit/site/{b}/{c}.json'
        if not os.path.exists(p):
            ann_rows.append({'key': [b, c, str(v)], 'site_has': None})
            continue
        site = json.load(open(p))
        hit = next((a for a in site['annotations'] if str(a['verse']) == str(v)), None)
        ann_rows.append({'key': [b, c, str(v)], 'site_has': bool(hit),
                         'text': (hit or {}).get('modern', '')[:120]})
    extra_rows = []
    for b, c, v in targets['extra_annotations']:
        p = f'{ROOT}/scripts/audit/site/{b}/{c}.json'
        if not os.path.exists(p):
            continue
        site = json.load(open(p))
        hit = next((a for a in site['annotations'] if str(a['verse']) == str(v)), None)
        extra_rows.append({'key': [b, c, str(v)], 'site_has': bool(hit)})

    print('fetched chapters:', len(per_chapter))
    print('cached margin notes:', cache_notes, ' site margin notes:', site_notes)
    print('site-only notes (cache missed):', site_only_notes,
          ' cache-only notes (site lacks):', cache_only_notes)
    print()
    print('unmatched notes found on the site:',
          sum(1 for r in note_rows if r['site_score'] >= 0.8),
          'of', len(note_rows))
    print('missing annotations present on the site:',
          sum(1 for r in ann_rows if r['site_has']),
          'of', len(ann_rows))
    print('extra annotations also on the site:',
          sum(1 for r in extra_rows if r['site_has']), 'of', len(extra_rows))
    print()
    for r in note_rows:
        if r['site_score'] < 0.8:
            print('NOT ON SITE', r['key'], r['site_score'], '|', r['reason'])
    print()
    for r in ann_rows:
        if not r['site_has']:
            print('ANNOTATION NOT ON SITE', r['key'])
    json.dump({'per_chapter': per_chapter, 'notes': note_rows,
               'annotations': ann_rows, 'extra_annotations': extra_rows},
              open(f'{ROOT}/scripts/audit/site-compare.json', 'w'),
              ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
