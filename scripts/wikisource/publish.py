"""Copies checked pages from a generate.py run into the committed wikisource/ tree.

python3 -I scripts/wikisource/publish.py <generate-out-dir> <first-page>-<last-page>

Only pages whose chapters were checked against the scans belong here. For each
page the manifest records the hash of the wikitext and a status:

  generated  written from our data, not yet looked at as a whole page
  reviewed   read against the scan, ready to post
  posted     on Wikisource; `revid` is the revision we posted

When a page's text changes, its status drops back to `generated`, and a page
that was already posted keeps `revid` and gets `changed_since_post`, so the
uploader knows to compare against the live page before overwriting anyone.
"""
import hashlib, json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / 'wikisource' / '1582-rhemes-nt'
SRC = Path(sys.argv[1])
A, B = map(int, sys.argv[2].split('-'))

pages_dir = ROOT / 'pages'
pages_dir.mkdir(parents=True, exist_ok=True)
manifest_path = ROOT / 'manifest.json'
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}

changed = []
for n in range(A, B + 1):
    src = SRC / f'{n}.wiki'
    text = src.read_text()
    sha = hashlib.sha1(text.encode()).hexdigest()
    entry = manifest.get(str(n), {})
    if entry.get('sha1') == sha:
        continue
    shutil.copyfile(src, pages_dir / f'{n}.wiki')
    if entry.get('status') == 'posted':
        entry['changed_since_post'] = True
    entry.update(sha1=sha, status='generated' if entry.get('status') != 'posted' else 'posted')
    manifest[str(n)] = entry
    changed.append(n)

manifest = dict(sorted(manifest.items(), key=lambda kv: int(kv[0])))
manifest_path.write_text(json.dumps(manifest, indent=1) + '\n')
print(f'{len(changed)} page(s) written:', changed)
