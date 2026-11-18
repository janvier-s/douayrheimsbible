# Prompt for agy: post the front-matter drafts (PDF pages 1-30) to en.wikisource

You are working in /Users/Janvier/Documents/Bible-n-stuff/Websites/douayrheimsbible on branch janvier-s/odr-wikisource. Read wikisource/1582-rhemes-nt/PLAYBOOK.md ("Publish and commit"), scripts/wikisource/wikipost.py (docstring) and docs/audits/front-matter-findings.md first.

Context: wikisource/1582-rhemes-nt/front-draft/<n>.wiki (n = PDF page 1-30) are the checked drafts of the 1582 Rhemes NT front matter. Live pages 1-30 already exist on en.wikisource (copies of the live text are in ~/facsimiles/wikisource-live/front/<n>.wiki); some were edited or proofread by other users (e.g. page 2 is proofread level 3 by another user). Our drafts are uncommitted.

Rules (do not break):
1. Do NOT post anything until the user has said "post" in this session after seeing the dry-run output. Everything before that is read-only or local.
2. Never overwrite another user's work blindly: the script skips pages whose newest live revision is by another account. Do not use --adopt-others unless the user names the pages after reviewing the diffs.
3. Keep proofreading status as is (the script saves with the page's existing pagequality attribute; never set a higher level yourself).
4. Credentials come from the keychain (service wikisource-bot); never print or store them.

Steps:
1. cd to the repo. Run `python3 -I scripts/wikisource/lint.py wikisource/1582-rhemes-nt/front-draft`; expect 0 errors (warnings about missing footers on pages 1, 2, 24, 25 are known). Stop and report if errors.
2. Copy the drafts into the posting tree WITHOUT touching pages 31+: `cp wikisource/1582-rhemes-nt/front-draft/{1..30}.wiki wikisource/1582-rhemes-nt/pages/` (check first that pages/1.wiki .. pages/30.wiki do not already exist; if they do, stop and tell the user).
3. `python3 -I scripts/wikisource/wikipost.py --check-login`.
4. Dry run: `python3 -I scripts/wikisource/wikipost.py 1-30` (no --post). Save the output. For each page report: new / unchanged / skipped (other editor) / would change, with a short word-level diff of the live text vs ours for the "would change" and "skipped" pages (use ~/facsimiles/wikisource-live/front/<n>.wiki as the live copy if the script does not print one).
5. Show the user the summary and wait.
6. After the user says "post" (and names any pages for --adopt-others): `python3 -I scripts/wikisource/wikipost.py 1-30 --post --summary "Front matter 1-30: checked against the scan (print spelling, long s, w/vv, macrons, margin notes, headers/footers)"`; use the default 12 s delay, resume with the printed page range if rate-limited.
7. Do not commit unless the user asks. Report posted revision ids and any page that was skipped.
