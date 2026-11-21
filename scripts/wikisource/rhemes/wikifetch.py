"""Fetch live Page: wikitext from en.wikisource and diff it against our pages/.

usage: rh.py fetch FIRST-LAST OUT_DIR [--index Index_title.pdf]
Writes OUT_DIR/<n>.wiki (live text), OUT_DIR/revs.json ({n: {revid, user, timestamp}}) and prints
which pages differ from wikisource/1582-rhemes-nt/pages. Read-only, no login needed.
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

API = 'https://en.wikisource.org/w/api.php'
UA = 'douay-rheims-wikisource-tools/0.1 (page proofreading helper)'
from . import paths, text

ROOT = paths.WS
INDEX = '1582_Rhemes_New_Testament.pdf'


def get(params):
    url = API + '?' + urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
        return json.load(r)


def fetch(nums):
    out = {}
    for i in range(0, len(nums), 25):
        chunk = nums[i:i + 25]
        titles = '|'.join(f'Page:{INDEX}/{n}' for n in chunk)
        d = get({'action': 'query', 'prop': 'revisions', 'rvprop': 'ids|content|timestamp|user', 'rvslots': 'main', 'titles': titles})
        for p in d['query']['pages']:
            n = int(p['title'].rsplit('/', 1)[1])
            if 'missing' in p:
                out[n] = None
                continue
            r = p['revisions'][0]
            out[n] = {'text': r['slots']['main']['content'], 'revid': r['revid'], 'user': r['user'], 'timestamp': r['timestamp']}
        time.sleep(1)
    return out


norm = text.pagequality_blank_user


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    a, b = map(int, argv[0].split('-'))
    out = Path(argv[1])
    out.mkdir(parents=True, exist_ok=True)
    live = fetch(list(range(a, b + 1)))
    revs, differ = {}, []
    for n, v in live.items():
        if v is None:
            print(f'{n}: not on Wikisource yet')
            continue
        (out / f'{n}.wiki').write_text(v['text'])
        revs[n] = {k: v[k] for k in ('revid', 'user', 'timestamp')}
        ours = ROOT / 'pages' / f'{n}.wiki'
        if ours.exists() and norm(ours.read_text()) != norm(v['text']):
            differ.append(n)
    (out / 'revs.json').write_text(json.dumps(revs, indent=1))
    print(f'{len(revs)} live pages fetched; {len(differ)} differ from ours: {differ}')

