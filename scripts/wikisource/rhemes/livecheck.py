"""Check what others have edited on Wikisource (1582 Rhemes NT) before uploading.

Usage:
  python3 scripts/check_live_edits.py [PAGES...]
  e.g.:
    python3 scripts/check_live_edits.py 18-24
    python3 scripts/check_live_edits.py 21
    python3 scripts/check_live_edits.py --all-overwritten  (scans 1-451 for any human edits)
    python3 scripts/check_live_edits.py --pending          (checks pages where live differs from local)
"""
import difflib, json, re, sys, time
from pathlib import Path

from . import paths, wikipost

ROOT = paths.WS

def norm_text(t):
    # Strip user attribute and trailing whitespace
    return re.sub(r'(<pagequality level="\d" )user="[^"]*"', r'\1user=""', t).rstrip('\n')

def extract_pagequality(t):
    m = re.search(r'<pagequality level="(\d)" user="([^"]*)"', t)
    return (int(m.group(1)), m.group(2)) if m else (None, None)

def print_diff(a_text, b_text, from_label, to_label):
    diff = list(difflib.unified_diff(
        a_text.splitlines(keepends=True),
        b_text.splitlines(keepends=True),
        fromfile=from_label,
        tofile=to_label
    ))
    if not diff:
        print("    (No textual difference)")
        return
    for line in diff:
        line_clean = line.rstrip()
        if line.startswith('+') and not line.startswith('+++'):
            print(f"\033[32m{line_clean}\033[0m")
        elif line.startswith('-') and not line.startswith('---'):
            print(f"\033[31m{line_clean}\033[0m")
        elif line.startswith('@@'):
            print(f"\033[36m{line_clean}\033[0m")
        else:
            print(f" {line_clean}")

def check_page(w, me, n, manifest):
    title = f'Page:{wikipost.INDEX}/{n}'
    res = w.call({
        'action': 'query',
        'prop': 'revisions',
        'rvprop': 'ids|user|timestamp|comment|content',
        'rvslots': 'main',
        'rvlimit': 15,
        'titles': title
    })
    p = res['query']['pages'][0]
    if 'missing' in p:
        print(f"Page {n}: Missing on Wikisource")
        return None

    revs = p.get('revisions', [])
    if not revs:
        return None

    latest_rev = revs[0]
    latest_user = latest_rev['user']
    latest_content = latest_rev['slots']['main']['content']
    latest_lvl, latest_pq_user = extract_pagequality(latest_content)

    local_path = ROOT / 'pages' / f'{n}.wiki'
    local_content = local_path.read_text() if local_path.exists() else None
    local_lvl, _ = extract_pagequality(local_content) if local_content else (None, None)

    # Find revisions made by users other than the bot
    bot_base_user = me.split('@')[0]
    other_revs = [r for r in revs if r['user'] not in (bot_base_user, 'MediaWiki message delivery')]

    print(f"\n{'='*70}")
    print(f"📖 Page {n} ({title})")
    print(f"   Latest live revision: rev {latest_rev['revid']} by {latest_user} at {latest_rev['timestamp']}")
    if latest_rev.get('comment'):
        print(f"   Comment: {latest_rev['comment']}")
    print(f"   PageQuality: Live=level {latest_lvl} ({latest_pq_user or 'none'}) vs Local=level {local_lvl}")

    if local_lvl and latest_lvl and latest_lvl > local_lvl:
        print(f"   ⚠️ WARNING: Live page has higher proofread quality (level {latest_lvl}) than local (level {local_lvl})!")

    # Check if someone else edited
    if other_revs:
        print(f"   👥 Found {len(other_revs)} revision(s) in history by human contributor(s):")
        for r in other_revs:
            print(f"      - rev {r['revid']} by {r['user']} at {r['timestamp']}: {r.get('comment', '(no comment)')}")

    # Check diff between local and live
    if local_content is not None:
        if norm_text(local_content) != norm_text(latest_content):
            print(f"\n   📝 DIFF: Local file (-) vs Live on Wikisource (+):")
            print_diff(local_content, latest_content, f"local/{n}.wiki", f"live_rev_{latest_rev['revid']}")
        else:
            print(f"   ✅ Local text matches live text (normalized).")

    # If the latest revision is NOT the bot, show what that contributor specifically added vs the revision before it
    if latest_user != bot_base_user and len(revs) > 1:
        prev_rev = revs[1]
        prev_content = prev_rev['slots']['main'].get('content')
        if not prev_content:
            # fetch prev revision content
            res_prev = w.call({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'revids': prev_rev['revid']})
            prev_content = res_prev['query']['pages'][0]['revisions'][0]['slots']['main']['content']
        print(f"\n   🔍 SPECIFIC CHANGES BY {latest_user} in latest edit:")
        print_diff(prev_content, latest_content, f"previous_rev_{prev_rev['revid']}", f"{latest_user}_rev_{latest_rev['revid']}")

    return {
        'page': n,
        'latest_user': latest_user,
        'has_other_edits': bool(other_revs),
        'differs': local_content and norm_text(local_content) != norm_text(latest_content),
        'quality_mismatch': local_lvl and latest_lvl and latest_lvl > local_lvl
    }

def main(argv=None):
    args = sys.argv[1:] if argv is None else argv
    if not args:
        print(__doc__)
        sys.exit(0)

    w = wikipost.Wiki()
    me = w.login()
    print(f"Logged in as {me}")

    manifest_path = ROOT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}

    pages = []
    if '--all-overwritten' in args:
        pages = [7, 10, 14, 18, 20, 21, 22, 23, 24, 29, 38, 44, 109, 110]
    elif '--pending' in args:
        # Check all pages that manifest says differ or all 451
        for f in sorted((ROOT / 'pages').glob('*.wiki'), key=lambda p: int(p.stem)):
            pages.append(int(f.stem))
    else:
        for a in args:
            for part in a.split(','):
                if '-' in part:
                    s, e = map(int, part.split('-'))
                    pages.extend(range(s, e + 1))
                elif part.isdigit():
                    pages.append(int(part))

    results = []
    for n in pages:
        res = check_page(w, me, n, manifest)
        if res:
            results.append(res)
        time.sleep(0.5)

    print("\n" + "="*70)
    print("SUMMARY:")
    diff_count = sum(1 for r in results if r['differs'])
    other_count = sum(1 for r in results if r['has_other_edits'])
    mismatch_count = sum(1 for r in results if r['quality_mismatch'])
    print(f"Total pages checked: {len(results)}")
    print(f"Pages with diff against local: {diff_count}")
    print(f"Pages with human edits in history: {other_count}")
    print(f"Pages with quality level downgrade risk: {mismatch_count}")
