"""Post generated pages to en.wikisource (Page: namespace), safely.

usage:
  wikipost.py --check-login
  wikipost.py FIRST-LAST [--summary TEXT] [--post] [--create (also create pages that do not exist yet; createonly, never overwrites)] [--delay SECONDS (default 12: Wikisource rate-limits after about 8 edits)]

Default is a DRY RUN: it logs in, fetches each live page, and prints what would change. Nothing is
written without --post (and --summary). Rules it enforces:
  * the linter must report no errors on pages/
  * a page is skipped when live already equals ours (ignoring the user="" attribute)
  * a page is skipped when its newest live revision is not by the posting account, unless
    --adopt-others lists it (somebody else edited it: review their change first)
  * the edit carries baserevid, so MediaWiki refuses it if the page changed since we fetched it
  * pages are saved as they are (pagequality level 1, "Not proofread"); no status is set
Credentials: the bot password in the macOS keychain, service "wikisource-bot" (account
"User@botname"); never printed, never stored in the repo.
"""
import hashlib, http.cookiejar, json, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request
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
    return re.sub(r'(<pagequality level="\d" )user="[^"]*"', r'\1user=""', t).rstrip('\n')


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
            skipped += 1
            continue
        todo += 1
        added = len(ours) - len(live['text'])
        print(f'{n}: would change (live rev {live["revid"]}, {added:+d} chars)')
        if post:
            r = w.edit(n, ours, summary, live['revid'])
            if 'error' in r:
                print(f'{n}: ERROR {r["error"].get("code")}: {r["error"].get("info")}')
                break
            e = r['edit']
            ent = manifest.get(str(n), {})
            ent.update(sha1=hashlib.sha1(ours.encode()).hexdigest(), status='posted', revid=e.get('newrevid', live['revid']))
            ent.pop('changed_since_post', None)
            manifest[str(n)] = ent
            manifest_path.write_text(json.dumps(manifest, indent=1) + '\n')
            posted += 1
            print(f'{n}: posted (rev {ent["revid"]})')
            time.sleep(delay)
    print(f'{todo} to post, {skipped} skipped' + (f', {posted} posted' if post else ' (dry run; add --post --summary "…" to write)'))


if __name__ == '__main__':
    main()
