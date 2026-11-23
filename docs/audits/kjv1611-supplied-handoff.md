# Handoff: KJV 1611 supplied words, a high-res rerun (worktree douayrheimsbible-ws-phase0)

## Goal
`static/data/kjv-1611/*.json` carries `<i>` supplied words from the 1769 edition, which marks more than the 1611 print.
Drop `<i>` from every word that the 1611 print sets in blackletter. It must be mechanical and token-lean: no image review except a small precision sample.

## Done so far (uncommitted, in this worktree)
- `scripts/kjv1611/supplied.py <data dir> <out.tsv> [slug..]`: aligns verse words to Tesseract word boxes
  (`~/facsimiles/kjv-1611/ocr/*.tsv`, 3x coordinates) on the 1000px pages `~/facsimiles/kjv-1611/pages/*.webp`.
  For each `<i>` word it measures erosion survival (binarize below 140, MaxFilter 7 on a 3x upscale, ink after / ink before),
  the median ink run, the box width ratio, and the same for plain neighbours on its line.
- `scripts/kjv1611/supplied_fixes.py <tsv> <data dir>`: decision rule plus `fixes.tsv` rows (one row per verse, witness `scan-1611-erosion`).
  Rule: exact OCR match, at least 1 neighbour, wratio 0.6-1.6, surv/nsurv >= 0.5, run >= 7.
- `scripts/kjv1611/fixes.tsv`: 229 rows `wikisource-1611` (the Wikisource-sweep extras), then 2496 rows `scan-1611-erosion` (3166 words).
  The data is rebuilt and copied. Backup of the ledger before the erosion rows:
  `/private/tmp/claude-501/-Users-Janvier-Documents-Bible-n-stuff-Websites-douayrheimsbible-ws-phase0/a6881aec-71c7-4d83-82ec-2cdb84f7fc2d/scratchpad/fixes.pre-erosion.tsv`
- Limits at 1000px: only 10.3k of 23.9k italic words are located (blackletter OCR is poor), and precision is about 95%.
  False positives come from boxes merged with a neighbour or mis-aligned in a gap.

## Next: rerun on the Wikisource scans (4x resolution)
- 24 PDFs `File:BibleKJV1611-001.pdf` to `-024.pdf`, hosted locally on en.wikisource (not Commons). About 1.8 GB, 49 pages each, 4060x6220 per page.
  Get them through the en.wikisource API `imageinfo` URL. Use a generic User-Agent and stay polite.
  Save them in a new dir such as `~/facsimiles/kjv-1611/ws-scans/` and extract with `pdfimages` (lossless).
- OCR the pages for word boxes. Tesseract (`/opt/homebrew/bin/tesseract`, TSV) works. Apple Vision is better
  (`python3 -I scripts/wikisource/rh.py ocr-vision <dir>`, as used by `scripts/ot/prep.py`); check whether it gives word boxes.
- Map pages to book and chapter by aligning the OCR text to the verse stream, since the PDF page ranges are not known.
- Port `supplied.py` to the new pages: rescale the erosion and run thresholds about 4x. Recalibrate on labels:
  the italics removed by the `wikisource-1611` rows (known blackletter) and the italics kept on the 48 Wikisource-proofread pages.
  Many of those kept marks are also blackletter on the scan, so the labels are noisy.
- Decide on the italics still in the current data (`static/data/kjv-1611`), measure precision on one random 40-word crop collage, and append rows.
  If it works, consider re-checking the 3166 erosion rows on the hi-res pages too.

## Rules
- Rebuild only with `npx tsx scripts/kjv1611/build.ts --evidence=$HOME/facsimiles/kjv-1611/long-s-evidence.tsv --out=<scratch dir>`,
  check that only `<i>` tags changed, then copy the JSON into `static/data/kjv-1611/`. Without `--evidence` the long-s output changes everywhere.
- Do not commit or post to Wikisource without the owner's OK. `scripts/ot/prep.py` changes belong to another task: leave them alone.
- Pending owner decision (not yours): reverting the 252 sweep marks on the 48 live Wikisource pages.

## Result of the Wikisource-scan rerun (2026-11-22, uncommitted)
- Scans: all 24 PDFs (sha1-checked) in `~/facsimiles/kjv-1611/ws-scans/`. They embed ~2000x3000 JPEGs (2x the 1000px pages, not 4x);
  extracted with `pdfimages -j` to `img/NNN/p-XXX.jpg` (1506 pages), Tesseract TSV in `ocr/NNN-p-XXX.tsv`.
- Wikisource has no book/chapter map: only Genesis is transcluded, and the Index `<pagelist 1=N>` values only give the global page order.
  `scripts/kjv1611/supplied_hires.py` places each page by rare-trigram voting over the whole verse stream, aligns inside the region
  (exact, equal gaps, fuzzy gaps <= 12 words), drops stray short blocks, and never reaches more than 60 words back into the previous
  page (repeated formulae in Gen 5, Num 1-7, Lev 4). 1413 pages mapped; 16,323 of 24,189 raw italic words located (1000px: 10.3k).
- Labels: 252 `wikisource-1611` removals = blackletter, 501 human `{{smaller}}` marks on the pre-sweep pages (`pages.json`, Nov 15) = roman.
- Rule in `supplied_fixes.py` (`blackletter_hires`/`roman_hires`): blackletter 105/168 located labels with 0 roman calls; roman 148/311
  with 1 blackletter call. Scan samples: new removals 39/40 (the miss was a merged OCR box, now excluded); all 24 restorations roman.
- Ledger: `supplied_fixes.py --hires` regenerated the `scan-1611-erosion` rows: 3166 earlier removals, 24 restored, 2695 new,
  5837 words in 4371 rows (reason says which test). Rebuilt with `--evidence`; only `<i>` changed (2239 verses, 0 text diffs);
  italic words 20,771 -> 18,100; `<i>` spans 17,321 -> 15,266. `scripts/kjv1611.corpus.test.ts` passes.
- Open: 7.9k raw italic words are still unlocated (OCR gaps); the owner decision on the 252 live sweep marks still stands, and the
  hi-res rule now gives a scan verdict for many of them.

## Live sweep marks reverted (2026-11-22)
- Outlier check: the zone just below the blackletter thresholds (surv ratio >= 0.25, run ratio >= 0.75; 164 still-italic words)
  is about 20% roman on a 32-crop sample (exact/gap matches only: 3/22), so the rule was left unchanged. Local data unchanged.
- The 252 sweep marks: 168 located on the scan, all blackletter (105 by the rule, 63 by eye), 0 roman.
  248 remaining marks unwrapped on 47 live pages (4 were already removed); see `wikisource/1611-kjv/italics-revert/REPORT.md`.
- The 84 unlocated sweep words were then checked with agy Gemini 3.8 Flash plus eye checks: all blackletter.
- Earlier five-page batch: all 14 marks blackletter; 11 `scan-1611-visual` rows added to fixes.tsv, data rebuilt (10 verses, <i> only).
  Its live marks are removed (12 by us, 2 earlier by the owner). All supplied-word marks the sweeps added are now gone from live.
