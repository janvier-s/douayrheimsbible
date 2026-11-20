"""Post generated pages to en.wikisource (Page: namespace), safely.

usage:
  wikipost.py --check-login
  wikipost.py FIRST-LAST [--summary TEXT] [--post] [--diff] [--create (also create pages that do not exist yet; createonly, never overwrites)] [--delay SECONDS (default 12: Wikisource rate-limits after about 8 edits)]

Default is a DRY RUN: it logs in, fetches each live page, and prints what would change. Nothing is
written without --post (and --summary). Rules it enforces:
  * the linter must report no errors on pages/
  * a page is skipped when live already equals ours (ignoring pagequality user="")
  * a page is skipped when its newest live revision is not by the posting account, unless
    --adopt-others lists it (somebody else edited it: review their change first)
  * live pagequality level (e.g. level 3 "Proofread") and proofreader user are preserved
    so bot uploads never demote human proofreading status back to level 1
  * the edit carries baserevid, so MediaWiki refuses it if the page changed since we fetched it
  * --diff displays the exact unified diff between live Wikisource and local wikitext
Credentials: the bot password in the macOS keychain, service "wikisource-bot" (account
"User@botname"); never printed, never stored in the repo.
"""
import difflib, hashlib, http.cookiejar, json, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1] / 'wikisource/1582-rhemes-nt'
API = 'https://en.wikisource.org/w/api.php'
UA = 'douay-rheims-wikisource-tools/0.1 (page proofreading helper)'
INDEX = '1582_Rhemes_New_Testament.pdf'


def keychain():
    meta = subprocess.run(['security', 'find-generic-password', '-s', 'wikisource-bot'], capture_output=True, text=True)
    m = re.search(r'"acct"<blob>="([^"]*)"', meta.stdout)
    if not m:
        sys.exit('no keychain item "wikisource-bot" (security add-generic-password -a User@bot -s wikisource-bot -w)')
    user = m.group(1).replace('<', '').replace('>', '')  # tolerate a placeholder typed with its brackets
    pw = subprocess.run(['security', 'find-generic-password', '-s', 'wikisource-bot', '-w'], capture_output=True, text=True).stdout.rstrip('\n')
    return user, pw


class Wiki:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def call(self, params, post=False):
        data = urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2, 'maxlag': 5}).encode()
        if post:
            req = urllib.request.Request(API, data=data, headers={'User-Agent': UA})
        else:
            req = urllib.request.Request(API + '?' + data.decode(), headers={'User-Agent': UA})
        for attempt in range(5):
            try:
                with self.op.open(req, timeout=60) as r:
                    return json.load(r)
            except (ConnectionResetError, urllib.error.URLError, TimeoutError) as e:
                if attempt == 4:
                    raise
                time.sleep(2 * (attempt + 1))

    def login(self):
        user, pw = keychain()
        tok = self.call({'action': 'query', 'meta': 'tokens', 'type': 'login'})['query']['tokens']['logintoken']
        r = self.call({'action': 'login', 'lgname': user, 'lgpassword': pw, 'lgtoken': tok}, post=True)['login']
        if r['result'] != 'Success':
            sys.exit(f'login failed: {r.get("reason", r["result"])} (for {user})')
        self.user = r['lgusername']
        self.csrf = self.call({'action': 'query', 'meta': 'tokens'})['query']['tokens']['csrftoken']
        return self.user

    def live(self, n):
        d = self.call({'action': 'query', 'prop': 'revisions', 'rvprop': 'ids|content|user|timestamp', 'rvslots': 'main',
                       'titles': f'Page:{INDEX}/{n}'})
        p = d['query']['pages'][0]
        if 'missing' in p:
            return None
        r = p['revisions'][0]
        return {'text': r['slots']['main']['content'], 'revid': r['revid'], 'user': r['user']}

    def edit(self, n, text, summary, baserevid):
        return self.call({'action': 'edit', 'title': f'Page:{INDEX}/{n}', 'text': text, 'summary': summary,
                          'baserevid': baserevid, 'nocreate': 1, 'token': self.csrf}, post=True)

    def create(self, n, text, summary):
        return self.call({'action': 'edit', 'title': f'Page:{INDEX}/{n}', 'text': text, 'summary': summary,
                          'createonly': 1, 'token': self.csrf}, post=True)


def norm(t):
    return re.sub(r'<pagequality level="\d" user="[^"]*"\s*/>', '<pagequality />', t).rstrip('\n')


def preserve_pagequality(ours, live):
    """Retain live page quality level and proofreader user if live >= ours."""
    m_live = re.search(r'(<pagequality level="(\d)" user="([^"]*)"\s*/>)', live)
    m_ours = re.search(r'(<pagequality level="(\d)" user="([^"]*)"\s*/>)', ours)
    if m_live and m_ours:
        live_lvl = int(m_live.group(2))
        ours_lvl = int(m_ours.group(2))
        if live_lvl > ours_lvl or (live_lvl == ours_lvl and m_live.group(3)):
            return ours[:m_ours.start()] + m_live.group(1) + ours[m_ours.end():]
    return ours


def check_live_lint(w, n):
    """Check if Parsoid or MediaWiki flagged any linter or tracking category error on the live page."""
    title = f'Page:{INDEX}/{n}'
    res = w.call({'action': 'query', 'list': 'linterrors', 'lnttitle': title})
    lints = res.get('query', {}).get('linterrors', [])
    c_res = w.call({'action': 'query', 'titles': title, 'prop': 'categories'})
    pages = c_res.get('query', {}).get('pages', [])
    cats = [c['title'] for c in pages[0].get('categories', [])] if pages else []
    tracking = [c for c in cats if any(k in c.lower() for k in [
        'invalid template', 'duplicate arguments', 'reference errors', 'script errors'
    ])]
    return lints, tracking


def main():
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    w = Wiki()
    me = w.login()
    if a[0] == '--check-login':
        print(f'logged in as {me}')
        return
    pages = []
    for part in a[0].split(','):
        if '-' in part:
            first, last = map(int, part.split('-'))
            pages.extend(range(first, last + 1))
        else:
            pages.append(int(part))
    post = '--post' in a
    create = '--create' in a
    show_diff = '--diff' in a
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    summary = opt('--summary')
    delay = float(opt('--delay', 12))
    adopt = {int(x) for x in opt('--adopt-others', '').split(',') if x}
    if post and not summary:
        sys.exit('--post needs --summary')
    lint = subprocess.run([sys.executable, '-I', str(HERE / 'lint.py'), str(ROOT / 'pages'), '--quiet'], capture_output=True, text=True)
    if lint.returncode:
        sys.exit('lint errors; run lint.py first\n' + lint.stdout)
    manifest_path = ROOT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    todo = skipped = posted = 0
    for n in pages:
        f = ROOT / 'pages' / f'{n}.wiki'
        if not f.exists():
            continue
        ours = f.read_text()
        live = w.live(n)
        if live is None and not create:
            print(f'{n}: not on Wikisource (add --create to create it)')
            continue
        if live is None:
            todo += 1
            print(f'{n}: would create ({len(ours)} chars)')
            if post:
                r = w.create(n, ours, summary)
                if 'error' in r:
                    print(f'{n}: ERROR {r["error"].get("code")}: {r["error"].get("info")}')
                    break
                ent = manifest.get(str(n), {})
                ent.update(sha1=hashlib.sha1(ours.encode()).hexdigest(), status='posted', revid=r['edit'].get('newrevid'))
                ent.pop('changed_since_post', None)
                manifest[str(n)] = ent
                manifest_path.write_text(json.dumps(manifest, indent=1) + '\n')
                posted += 1
                print(f'{n}: created (rev {ent["revid"]})')
                time.sleep(delay)
            continue
        if norm(ours) == norm(live['text']):
            continue
        if live['user'] != me.split('@')[0] and n not in adopt:
            print(f'{n}: SKIP newest live revision is by {live["user"]}; review their edit, then --adopt-others {n}')
            if show_diff:
                diff = list(difflib.unified_diff(
                    ours.splitlines(keepends=True),
                    live['text'].splitlines(keepends=True),
                    fromfile=f'local/{n}.wiki',
                    tofile=f'live/{n} (rev {live["revid"]} by {live["user"]})'
                ))
                for dl in diff:
                    print('  ' + dl.rstrip())
            skipped += 1
            continue
        todo += 1
        added = len(ours) - len(live['text'])
        print(f'{n}: would change (live rev {live["revid"]}, {added:+d} chars)')
        if show_diff:
            diff = list(difflib.unified_diff(
                live['text'].splitlines(keepends=True),
                ours.splitlines(keepends=True),
                fromfile=f'live/{n} (rev {live["revid"]} by {live["user"]})',
                tofile=f'local/{n}.wiki'
            ))
            for dl in diff:
                print('  ' + dl.rstrip())
        if post:
            ours_post = preserve_pagequality(ours, live['text'])
            r = w.edit(n, ours_post, summary, live['revid'])
            if 'error' in r:
                print(f'{n}: ERROR {r["error"].get("code")}: {r["error"].get("info")}')
                break
            e = r['edit']
            ent = manifest.get(str(n), {})
            ent.update(sha1=hashlib.sha1(ours_post.encode()).hexdigest(), status='posted', revid=e.get('newrevid', live['revid']))
            ent.pop('changed_since_post', None)
            manifest[str(n)] = ent
            manifest_path.write_text(json.dumps(manifest, indent=1) + '\n')
            posted += 1
            print(f'{n}: posted (rev {ent["revid"]})')
            lints, tracking = check_live_lint(w, n)
            if lints or tracking:
                for le in lints:
                    print(f'   ⚠️ LINTER ALERT on {n}: {le.get("category")} {le.get("params")} at {le.get("location")}')
                for tc in tracking:
                    print(f'   ⚠️ TRACKING ALERT on {n}: {tc}')
            time.sleep(delay)
    print(f'{todo} to post, {skipped} skipped' + (f', {posted} posted' if post else ' (dry run; add --post --summary "…" to write)'))


if __name__ == '__main__':
    main()
