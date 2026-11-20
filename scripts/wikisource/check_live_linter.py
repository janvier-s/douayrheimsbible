"""Audit Wikisource live pages using MediaWiki's Parsoid Linter and Tracking Categories.

Usage:
  python3 scripts/check_live_linter.py 21
  python3 scripts/check_live_linter.py 1-50
  python3 scripts/check_live_linter.py --all
"""
import json, re, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1] / 'wikisource/1582-rhemes-nt'
sys.path.insert(0, str(HERE))
import wikipost

TRACKING_ERROR_KEYWORDS = [
    'invalid template invocation',
    'duplicate arguments',
    'reference errors',
    'script errors',
    'pages with broken file links',
    'omitted template arguments'
]

def check_pages_linter(w, pages):
    # 1. Fetch page IDs and tracking categories in chunks of 50
    page_info = {}
    for i in range(0, len(pages), 50):
        chunk = pages[i:i+50]
        titles = '|'.join(f'Page:{wikipost.INDEX}/{p}' for p in chunk)
        res = w.call({
            'action': 'query',
            'titles': titles,
            'prop': 'categories'
        })
        for p in res.get('query', {}).get('pages', []):
            if 'missing' not in p:
                p_num = int(p['title'].split('/')[-1])
                cats = [c['title'] for c in p.get('categories', [])]
                tracking = [c for c in cats if any(k in c.lower() for k in TRACKING_ERROR_KEYWORDS)]
                page_info[p['pageid']] = {
                    'page': p_num,
                    'title': p['title'],
                    'tracking': tracking,
                    'lints': []
                }
        time.sleep(0.3)

    if not page_info:
        print("No live pages found on Wikisource for the given range.")
        return

    # 2. Query list=linterrors for all page IDs
    pids = list(page_info.keys())
    for i in range(0, len(pids), 50):
        chunk = pids[i:i+50]
        res = w.call({
            'action': 'query',
            'list': 'linterrors',
            'lntpageid': '|'.join(map(str, chunk)),
            'lntlimit': 500
        })
        for err in res.get('query', {}).get('linterrors', []):
            pid = err['pageid']
            if pid in page_info:
                page_info[pid]['lints'].append(err)
        time.sleep(0.3)

    # 3. Report results
    total_checked = len(page_info)
    issues_found = 0

    print(f"\nChecked {total_checked} live page(s) on Wikisource:")
    print("=" * 70)

    for pid in sorted(page_info.keys(), key=lambda x: page_info[x]['page']):
        info = page_info[pid]
        p_num = info['page']
        lints = info['lints']
        tracking = info['tracking']

        if not lints and not tracking:
            continue

        issues_found += 1
        print(f"\n⚠️  Page {p_num} ({info['title']}):")
        if lints:
            print(f"   Parsoid Linter Errors ({len(lints)}):")
            for l in lints:
                cat = l.get('category', 'unknown')
                loc = l.get('location', [])
                params = l.get('params', {})
                print(f"     - Category: {cat}")
                if loc:
                    print(f"       Byte Location: [{loc[0]}:{loc[1]}]")
                if params:
                    print(f"       Details: {params}")
        if tracking:
            print(f"   Tracking Categories ({len(tracking)}):")
            for t in tracking:
                print(f"     - {t}")

    print("\n" + "=" * 70)
    if issues_found == 0:
        print(f"✅ Clean! 0 linter errors and 0 tracking errors across {total_checked} page(s).")
    else:
        print(f"❌ Found issues on {issues_found} out of {total_checked} page(s).")

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)

    w = wikipost.Wiki()
    me = w.login()
    print(f"Logged in as {me}")

    pages = []
    if '--all' in args:
        pages = list(range(1, 452))
    else:
        for a in args:
            for part in a.split(','):
                if '-' in part:
                    s, e = map(int, part.split('-'))
                    pages.extend(range(s, e + 1))
                elif part.isdigit():
                    pages.append(int(part))

    check_pages_linter(w, pages)

if __name__ == '__main__':
    main()
