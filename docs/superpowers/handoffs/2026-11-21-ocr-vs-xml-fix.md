# Handoff: correct OCR-over-XML readings (Romans 421 and five checks)

Small, self-contained fix in worktree `douayrheimsbible-ws-phase0` (branch `wikisource-refactor-phase0`). **Another agent (Phase 2 docs) works in this worktree at the same time.** It only touches `.md` docs. Commit only your own files, by explicit path, and never run `git add -A` or `git commit -a`.

## The defect

Wikisource p. 421 (Romans) reads `remis{{ls}}ion` ("badges only of our remisſion of ſinnes"). That is round s before long s, the only `s{{ls}}` in the book. The scan (`~/facsimiles/transkribus/pages/romans/pdf421.jpg`) clearly shows **`remiſſion`**, and A16049.xml agrees. In `reconcile/romans.jsonl` the decision is `committed 'remiſsion'`, `generated 'remisſion'`, winner generated at rung 3 ("ocr remisſion"): one odd Tesseract reading outranked the XML. The data form in `static/data/odr-original/romans/annotations/*.json` is `remisſion`.

## Steps

1. Append to `wikisource/1582-rhemes-nt/reconcile/scan-readings.jsonl` (the print matches neither side, hence `replace: true`):
   `{"book": "romans", "page": 421, "committed": "remiſsion", "generated": "remisſion", "reading": "remiſſion", "evidence": "scan 2026-11-21 pdf421 (badges only of our remiſſion of ſinnes)", "replace": true}`
2. Optional guard, test first, in `scripts/wikisource/ladder.py` `decide()`: an OCR form containing `sſ` (round s, then long s) never votes, because the print never sets it.
3. Five decisions where a book majority or OCR went against the XML at the place. Read them on **one** scan collage (crop by the TSV word boxes; see `scripts/wikisource/ocrpages.py` `read_tsv`). Transkribus pages: `~/facsimiles/transkribus/pages/<book>/pdf<page>.{tsv,jpg}`; Mark uses `<chapter>/<n>.tsv`. Mark the context words when cropping, because pages repeat these words.
   - mark 141 `Paſsion.` (before "Iewrie toward his", after "Chap. X. He"): book majority 6:2, XML `Paſſion`
   - mark 154 `poſsible` ("al things are" … "to thee, transferre"): majority 3:0, XML `poſſible`
   - luke 233 `Paſsion` ("benefites of his" … "vnto vs. 20."): OCR, XML `Paſſion`
   - romans 442 `neceſsitie,` ("be ſubiect of" … "not only for"): majority 5:0, XML `neceſſitie`

   For each one, append a scan reading: `reading` = the printed form, `committed`/`generated` copied exactly from the jsonl line. Scan readings beat any rung.
4. Re-ladder each affected book from its pre-reconcile commit with `recheck.sh` below. The commits are mark `61861bf^`, luke `34ce9d69^` and romans `5b77a718^`. It writes `reconcile/<book>.jsonl` and prints the flips. Then run `revert.py` below: it reverts committed-side decisions that no longer hold and adopts the new ones. It holds the data lock.
5. `python3 -I scripts/wikisource/reconcile.py write <book>` and then `verify <book>` (expect 0). Then lint `python3 -I scripts/wikisource/lint.py wikisource/1582-rhemes-nt/pages --quiet` (expect 0 errors; an `ſ` gained is not a loss). Then `python3 -m pytest -q scripts/wikisource/tests -m "slow or not slow"` (all pass) and `reconcile.py status --write`.
6. Commit by explicit paths: scripts, `static/data/odr-original/...`, `wikisource/1582-rhemes-nt/{pages,reconcile,manifest.json}`. End the message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
7. Repost: run `python3 scripts/wikisource/wikipost.py 31-451` (a dry run) and report which pages would change. **Ask the owner before `--post`.** Then post only those pages with `--post --summary "Correct long s readings against the scan (OCR had outranked A16049)"`, and commit `manifest.json`.

## Constraints

- Scripts run as `python3 -I`. Data JSON is written only through `jsonfmt.write_like()` (`adopt` does that), under the lock `<git-common-dir>/odr-data.lock`.
- odr-original reproduces the print, misprints included. Never modernise ſ, vv or macrons.
- This worktree has no `node_modules`.

## recheck.sh (save to your scratchpad; usage: `recheck.sh BOOK COMMIT SCRATCHDIR`; don't pipe it to `head`)

```bash
#!/bin/bash
# recheck.sh BOOK COMMIT: re-run the ladder for BOOK at COMMIT with the current scripts; print flipped decisions
set -e
B=$1; C=$2; S=$3; WT=$S/re-$B
rm -rf $WT; git worktree add -q --detach $WT $C
cp scripts/wikisource/*.py $WT/scripts/wikisource/
cp wikisource/1582-rhemes-nt/books.json $WT/wikisource/1582-rhemes-nt/
mkdir -p $WT/wikisource/1582-rhemes-nt/reconcile; cp wikisource/1582-rhemes-nt/reconcile/scan-readings.jsonl $WT/wikisource/1582-rhemes-nt/reconcile/
(cd $WT && WS_OLD_LEMMAS=1 python3 -I scripts/wikisource/reconcile.py ladder $B | grep -v '^  ' | tr '\n' ';'); echo
python3 - "$B" "$WT" <<'PY'
import json, sys
b, wt = sys.argv[1], sys.argv[2]
key = lambda r: (r['page'], r['committed'], r['generated'], tuple(r['before']), tuple(r['after']))
old = {key(r): r for r in map(json.loads, open(f'wikisource/1582-rhemes-nt/reconcile/{b}.jsonl'))}
new = {key(r): r for r in map(json.loads, open(f'{wt}/wikisource/1582-rhemes-nt/reconcile/{b}.jsonl'))}
for k in new:
    if k not in old or old[k]['winner'] != new[k]['winner']:
        print('  flip', k, old.get(k, {}).get('winner'), '->', new[k]['winner'], new[k]['evidence'])
print('  gone:', [k for k in old if k not in new])
PY
cp $WT/wikisource/1582-rhemes-nt/reconcile/$B.jsonl wikisource/1582-rhemes-nt/reconcile/$B.jsonl
git worktree remove --force $WT
```

## revert.py (save to your scratchpad; run from the worktree root with `python3 -I revert.py`)

```python
import sys, json, subprocess, collections
from pathlib import Path
sys.path.insert(0, 'scripts/wikisource')
import ladder, reconcile, fidelity
common = subprocess.run(['git', 'rev-parse', '--git-common-dir'], capture_output=True, text=True).stdout.strip()
lock = Path(common).resolve() / 'odr-data.lock'
for b in ('mark', 'matthew', 'luke', 'john', 'acts', 'romans'):
    head = subprocess.run(['git', 'show', f'HEAD:wikisource/1582-rhemes-nt/reconcile/{b}.jsonl'], capture_output=True, text=True).stdout.splitlines()
    k = lambda r: (r['page'], r['committed'], r['generated'], tuple(r['before']), tuple(r['after']))
    old = collections.Counter(k(json.loads(x)) for x in head if json.loads(x)['winner'] == 'committed')
    new = collections.Counter(k(json.loads(x)) for x in open(f'wikisource/1582-rhemes-nt/reconcile/{b}.jsonl') if json.loads(x)['winner'] == 'committed')
    flips = list((old - new).elements())
    rev = [ladder.Decision(ladder.Conflict(p, g, c, list(bf), list(af)), 3, 'committed', 'revert') for p, c, g, bf, af in flips]
    ap, un = ladder.adopt(ladder.book_files(reconcile.REPO, b), rev, fidelity.parse_overrides([]), lock)
    ap2, un2 = ladder.adopt(ladder.book_files(reconcile.REPO, b), reconcile.load_decisions(b),
                            fidelity.parse_overrides(['--allow-shift', 'ls:1-451', '--reason', 'ladder']), lock)
    print(b, 'reverted', len(ap), 'of', len(flips), 'unlocated', [(d.conflict.page, d.conflict.generated, w[:60]) for d, w in un],
          '| new adoptions', len(ap2), 'unlocated', len(un2), flush=True)
```
