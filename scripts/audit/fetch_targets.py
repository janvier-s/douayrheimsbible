#!/usr/bin/env python3
"""Work out which chapters need a polite re-fetch from sanctaclarapress.com.

Targets
  1. chapters where our margin notes exist but the cached scrape has no margin
     note at all;
  2. chapters that still hold one of the notes the loose matcher could not
     place;
  3. chapters of the annotations missing from the cached scrape.

Writes scripts/audit/fetch-targets.json.
"""
import json, os, re, glob, collections, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SC = os.path.expanduser(
    "~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/sancta-scrape/data")
SLUG = {'isaie': 'isaias', 'jeremie': 'jeremias', 'malachie': 'malachias'}
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from match_notes import plain, load_ours  # noqa: E402


def scrape_chapter(book, ch):
    p = f'{SC}/{SLUG.get(book, book)}/{ch}.json'
    if not os.path.exists(p):
        return None
    return json.load(open(p))


def main():
    ours = load_ours()
    books = sorted({k[0] for k in ours})
    no_margin = []
    our_chapters = collections.defaultdict(set)
    for k in ours:
        our_chapters[k[0]].add(k[1])
    for b in books:
        for c in sorted(our_chapters[b]):
            j = scrape_chapter(b, c)
            if j is None:
                no_margin.append((b, c, 'chapter file absent'))
                continue
            n = 0
            for v in j.get('verses', []):
                for side in ('left', 'right'):
                    m = (v.get('margin') or {}).get(side) or {}
                    n += len(m.get('notes') or [])
            if n == 0:
                no_margin.append((b, c, 'no margin notes in scrape'))

    reasons = {tuple(r['key']): r['reason'] for r in
               json.load(open(f'{ROOT}/scripts/audit/unmatched-reasons.json'))}
    still = collections.defaultdict(list)
    for k, reason in reasons.items():
        if reason.startswith(('missing', 'partially')):
            still[(k[0], k[1])].append({'key': list(k), 'reason': reason})

    # annotations: our verse-level set versus the scrape's, chapter by chapter
    missing_ann = []
    extra_ann = []
    ours_files = []
    for b in books:
        for f in glob.glob(f'{ROOT}/static/data/odr/{b}/annotations/*.json'):
            c = int(os.path.basename(f)[:-5])
            ours_files.append((b, c, f))
    for b, c, f in sorted(ours_files):
        j = scrape_chapter(b, c)
        ann = json.load(open(f)).get('annotations', [])
        ours_v = collections.Counter(str(a['verse']) for a in ann)
        if j is None:
            missing_ann += [(b, c, v) for v in ours_v]
            continue
        scr_v = collections.Counter()
        for a in j.get('annotations', []):
            if a.get('verse') is not None:
                scr_v[str(a['verse'])] += 1
        for v in sorted(ours_v):
            if v not in scr_v:
                missing_ann.append((b, c, v))
        for v in sorted(scr_v):
            if v not in ours_v:
                extra_ann.append((b, c, v))

    targets = collections.OrderedDict()
    for b, c, why in no_margin:
        targets.setdefault((b, c), []).append(why)
    for (b, c), items in sorted(still.items()):
        targets.setdefault((b, c), []).append(f'{len(items)} unmatched note(s)')
    for b, c, v in missing_ann:
        targets.setdefault((b, c), []).append(f'missing annotation v{v}')

    out = {
        'no_margin': no_margin,
        'unmatched_notes': {f'{b}|{c}': v for (b, c), v in still.items()},
        'missing_annotations': missing_ann,
        'extra_annotations': extra_ann,
        'targets': [{'book': b, 'chapter': c, 'why': w}
                    for (b, c), w in targets.items()],
    }
    json.dump(out, open(f'{ROOT}/scripts/audit/fetch-targets.json', 'w'),
              ensure_ascii=False, indent=1)
    print('chapters with no scrape margin notes:', len(no_margin))
    print('chapters with still-unmatched notes:', len(still))
    print('annotations missing from scrape:', len(missing_ann),
          'extra in scrape:', len(extra_ann))
    print('fetch targets:', len(targets),
          'estimated minutes at 4s:', round(len(targets) * 4 / 60, 1))
    print()
    for (b, c), w in list(targets.items())[:40]:
        print(b, c, '|', '; '.join(w))


if __name__ == '__main__':
    main()
