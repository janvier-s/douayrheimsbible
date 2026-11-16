#!/usr/bin/env python3
"""Polite re-fetch of the chapters the cached scrape may have missed.

Reads scripts/audit/fetch-targets.json, fetches one page at a time from
https://sanctaclarapress.com/read/<book>/<chapter> with Scrapling, waits a few
seconds between requests, and stores the margin notes and annotations it finds
under scripts/audit/site/<book>/<chapter>.json.

robots.txt allows the path (Content-Signal use=reference); no login is used.
"""
import json, os, sys, time, random, pathlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'scripts/audit/site')
SLUG = {'isaie': 'isaias', 'jeremie': 'jeremias', 'malachie': 'malachias'}
BASE = 'https://sanctaclarapress.com/read'

from scrapling.fetchers import Fetcher  # noqa: E402


def text(el):
    try:
        return ' '.join(el.get_all_text().split())
    except Exception:
        return ''


def extract(page):
    out = {'notes': [], 'annotations': [], 'headings': []}
    for span in page.css('.vnote-tag'):
        out['headings'].append(text(span))
    for note in page.css('aside.vnote'):
        cls = note.attrib.get('class', '')
        side = 'right' if 'vnote-right' in cls else 'left' if 'vnote-left' in cls else ''
        vn = note.css('.vnote-vn')
        verse = text(vn[0]) if vn else ''
        for item in note.css('.vnote-item'):
            m = [text(x) for x in item.css('.ed-spelling')]
            o = [text(x) for x in item.css('.ed-verbatim')]
            if m or o:
                out['notes'].append({'verse': verse, 'side': side,
                                     'modern': m[0] if m else '',
                                     'original': o[0] if o else ''})
    for ann in page.css('section#annotations div.annotation'):
        aid = ann.attrib.get('id', '')
        verse = ''
        a = ann.css('a.aref')
        if a:
            verse = text(a[0])
        if not verse and aid.startswith('a'):
            verse = aid[1:]
        m = [text(x) for x in ann.css('span.ed.ed-spelling')]
        o = [text(x) for x in ann.css('span.ed.ed-verbatim')]
        am = [text(x) for x in ann.css('div.amargin.ed-spelling .amargin-item')]
        ao = [text(x) for x in ann.css('div.amargin.ed-verbatim .amargin-item')]
        out['annotations'].append({'id': aid, 'verse': verse,
                                   'modern': m[0] if m else '',
                                   'original': o[0] if o else '',
                                   'margin_modern': am, 'margin_original': ao})
    return out


def main():
    targets = json.load(open(f'{ROOT}/scripts/audit/fetch-targets.json'))['targets']
    os.makedirs(OUT, exist_ok=True)
    delay = float(os.environ.get('ODR_FETCH_DELAY', '4'))
    done = 0
    for i, t in enumerate(targets, 1):
        book, ch = t['book'], t['chapter']
        slug = SLUG.get(book, book)
        dest = os.path.join(OUT, book, f'{ch}.json')
        if os.path.exists(dest):
            continue
        url = f'{BASE}/{slug}/{ch}'
        data = None
        for attempt in range(3):
            try:
                page = Fetcher.get(url, timeout=60)
                if page.status == 200:
                    data = extract(page)
                    break
            except Exception as e:
                print('retry', url, type(e).__name__, e, file=sys.stderr)
            time.sleep(10 * (attempt + 1))
        if data is None:
            print('FAILED', url)
            continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        data['book'] = book
        data['chapter'] = ch
        data['url'] = url
        json.dump(data, open(dest, 'w'), ensure_ascii=False, indent=1)
        done += 1
        print(f'[{i}/{len(targets)}] {book} {ch}: {len(data["notes"])} notes, '
              f'{len(data["annotations"])} annotations')
        sys.stdout.flush()
        time.sleep(delay + random.random())
    print('fetched', done)


if __name__ == '__main__':
    main()
