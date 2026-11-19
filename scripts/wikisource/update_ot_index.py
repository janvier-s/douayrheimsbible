"""Update the Wikisource Index pages for the 1609 and 1610 Douay Old Testament volumes.

Usage:
  python3 scripts/wikisource/update_ot_index.py [--post]
"""
import argparse
import http.cookiejar
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

API = 'https://en.wikisource.org/w/api.php'
UA = 'douay-rheims-wikisource-tools/0.1 (index metadata helper)'

VOLUMES_NAV = """* [[Index:1609_Doway_Old_Testament.pdf|Volume 1: Old Testament (1609, Genesis to Job)]]
* [[Index:1610_Douai_Old_Testament.pdf|Volume 2: Old Testament (1610, Psalms to 2 Machabees)]]
* [[Index:1582_Rhemes_New_Testament.pdf|Volume 3: New Testament (1582, Matthew to Apocalypse)]]"""

PAGES_CONFIG = {
    'Index:1609_Doway_Old_Testament.pdf': {
        'title': 'Index:1609 Doway Old Testament.pdf',
        'wikitext': f"""{{{{:MediaWiki:Proofreadpage_index_template
|Type=book
|Title=The Holie Bible Faithfvlly Translated Into English, Ovt Of The Avthentical Latin
|Subtitle=Diligently conferred with the Hebrew, Greeke, and other Editions in diuers languages. With arguments of the bookes, and chapters: annotations. tables: and other helpes, for better vnderstanding of the text: for discouerie of corruptions in some late translations: and for clearing controversies in Religion
|Language=en
|Volume=1
|Author=
|Translator=[[w:English College, Douai|English College of Douay]] ([[w:Gregory Martin (scholar)|Gregory Martin]], with [[Author:William Allen|William Allen]], [[w:Richard Bristow|Richard Bristow]], and [[w:Thomas Worthington (scholar)|Thomas Worthington]])
|Editor=[[w:Thomas Worthington (scholar)|Thomas Worthington]]
|Illustrator=
|School=
|Publisher=[[w:Laurence Kellam|Laurence Kellam]]
|Address=Douai, Spanish Netherlands
|Year=1609
|Key=Holie Bible (1609)
|ISBN=
|OCLC=
|LCCN=
|BNF_ARK=
|ARC=
|DOI=
|Source=pdf
|Image=1
|Progress=C
|Transclusion=no
|Validation_date=
|Pages=<pagelist 1=Title 2to20=roman 21=1/>
|Volumes={VOLUMES_NAV}
|Remarks=First edition of the Douay Old Testament, Volume 1: Genesis to Job (STC 2207, ESTC S101944, Herbert 300). Translated from the Latin Vulgate by Gregory Martin; annotations, arguments, and tables by Thomas Worthington. Printed by Laurence Kellam at Douai, 1609.
|Width=
|Header=
|Footer=
|wikipedia=Douay–Rheims Bible
|commons=File:1609 Doway Old Testament.pdf
|wikidata=Q1240869
|portal=Bible
|tmplver=
}}}}""",
        'summary': 'Update bibliographic metadata, correct title and subtitle, add translators/editors, sister links, volume navigation, and calibrated pagelist'
    },
    'Index:1610_Douai_Old_Testament.pdf': {
        'title': 'Index:1610 Douai Old Testament.pdf',
        'wikitext': f"""{{{{:MediaWiki:Proofreadpage_index_template
|Type=book
|Title=The Second Tome of the Holie Bible Faithfvlly Translated Into English, Ovt Of The Avthentical Latin
|Subtitle=Diligently conferred with the Hebrew, Greeke, and other Editions in diuers languages. With arguments of the bookes, and chapters: annotations: tables: and other helpes, for better vnderstanding of the text: for discouerie of corruptions in some late translations: and for clearing controversies in Religion
|Language=en
|Volume=2
|Author=
|Translator=[[w:English College, Douai|English College of Douay]] ([[w:Gregory Martin (scholar)|Gregory Martin]], with [[Author:William Allen|William Allen]], [[w:Richard Bristow|Richard Bristow]], and [[w:Thomas Worthington (scholar)|Thomas Worthington]])
|Editor=[[w:Thomas Worthington (scholar)|Thomas Worthington]]
|Illustrator=
|School=
|Publisher=[[w:Laurence Kellam|Laurence Kellam]]
|Address=Douai, Spanish Netherlands
|Year=1610
|Key=Second Tome of the Holie Bible (1610)
|ISBN=
|OCLC=
|LCCN=
|BNF_ARK=
|ARC=
|DOI=
|Source=pdf
|Image=1
|Progress=C
|Transclusion=no
|Validation_date=
|Pages=<pagelist 1=Title 2=Approbatio 3=3 1005=Apocrypha 1006=1002 1129=Errata/>
|Volumes={VOLUMES_NAV}
|Remarks=First edition of the Douay Old Testament, Volume 2: Psalms to 2 Machabees and Apocrypha appendix (STC 2207, ESTC S101944, Herbert 300). Translated from the Latin Vulgate by Gregory Martin; annotations, arguments, and tables by Thomas Worthington. Printed by Laurence Kellam at Douai, 1610.
|Width=
|Header=
|Footer=
|wikipedia=Douay–Rheims Bible
|commons=File:1610 Douai Old Testament.pdf
|wikidata=Q1240869
|portal=Bible
|tmplver=
}}}}""",
        'summary': 'Update bibliographic metadata, correct title and subtitle, add translators/editors, sister links, volume navigation, and calibrated pagelist for Apocrypha jump'
    }
}


def keychain():
    meta = subprocess.run(['security', 'find-generic-password', '-s', 'wikisource-bot'], capture_output=True, text=True)
    m = re.search(r'"acct"<blob>="([^"]*)"', meta.stdout)
    if not m:
        sys.exit('no keychain item "wikisource-bot"')
    user = m.group(1).replace('<', '').replace('>', '')
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
            except (ConnectionResetError, urllib.error.URLError, TimeoutError):
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

    def get_live(self, title):
        d = self.call({'action': 'query', 'prop': 'revisions', 'rvprop': 'ids|content|user|timestamp', 'rvslots': 'main',
                       'titles': title})
        p = d['query']['pages'][0]
        if 'missing' in p:
            return None
        r = p['revisions'][0]
        return {'text': r['slots']['main']['content'], 'revid': r['revid'], 'user': r['user'], 'timestamp': r['timestamp']}

    def edit(self, title, text, summary, baserevid):
        return self.call({'action': 'edit', 'title': title, 'text': text, 'summary': summary,
                          'baserevid': baserevid, 'nocreate': 1, 'token': self.csrf}, post=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--post', action='store_true', help='Post the updates to Wikisource')
    args = parser.parse_args()

    wiki = Wiki()
    user = wiki.login()
    print(f'Logged in as {user}')

    for key, cfg in PAGES_CONFIG.items():
        title = cfg['title']
        print(f'\n--- Checking {title} ---')
        live = wiki.get_live(title)
        if not live:
            print(f'Page {title} not found!')
            continue
        print(f'Current revid: {live["revid"]}, last editor: {live["user"]} at {live["timestamp"]}')

        if live['text'].strip() == cfg['wikitext'].strip():
            print('Page content is already up-to-date.')
            continue

        if not args.post:
            print('DRY RUN: Differences to apply:')
            import difflib
            diff = difflib.unified_diff(
                live['text'].splitlines(keepends=True),
                cfg['wikitext'].splitlines(keepends=True),
                fromfile='live',
                tofile='proposed'
            )
            print(''.join(diff))
        else:
            print('Posting update...')
            res = wiki.edit(title, cfg['wikitext'], cfg['summary'], live['revid'])
            if res.get('edit', {}).get('result') == 'Success':
                new_revid = res['edit']['newrevid']
                print(f'Successfully updated {title} (new revid: {new_revid})')
            else:
                print(f'Error updating {title}: {res}')
            time.sleep(3)


if __name__ == '__main__':
    main()
