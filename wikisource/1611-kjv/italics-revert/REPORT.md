# KJV 1611 Wikisource: revert of the full italics sweep (posted 2026-11-22)

## Why

The full sweep (`../italics-full/REPORT.md`) wrapped 252 words in `{{smaller|…}}` because our local
`<i>` data marked them as supplied. That data follows the 1769 supplied-word scheme, not the 1611 print.
The pre-sweep human proofreading had left all 252 plain, and the local ledger already drops their `<i>`
(`wikisource-1611` rows in `scripts/kjv1611/fixes.tsv`).

## Scan evidence (Wikisource PDFs, ~2000x3000)

- 168 of the 252 words are located on the scan by `scripts/kjv1611/supplied_hires.py`.
- 105 are called blackletter by the erosion test (`supplied_fixes.py`); none is called roman.
- The other 63 were viewed one by one on crops: all blackletter.
- The other 84 (not located by OCR) were checked afterwards: Gemini 3.8 Flash (`agy`) read crops or full pages and
  every answer other than blackletter was checked by eye. All 84 are blackletter. So all 252 sweep marks were errors.
  Flash calibration on 20 controls: 0/10 roman called blackletter, 3/10 blackletter called roman (so only its
  blackletter answers were accepted unchecked).

## Edits

4 of the 252 were already removed (002.pdf/1 by the owner, rev 16482245; 002.pdf/2, rev 16482298).
The remaining **248** marks on **47 pages** are unwrapped here; each draft differs from the live page only by
removed `{{smaller|…}}` wrappers, and pre-sweep marks are untouched. Each edit was guarded by its live revid
and re-fetched and verified byte-for-byte. Summary: "Proofread: remove supplied-word marks added by the
2026-11-22 sweep; the 1611 print sets these words in blackletter (KJV 1611)".

| Page                      | Removed | Revision |
| ------------------------- | ------: | -------: |
| `BibleKJV1611-002.pdf/2`  |       2 | 16482463 |
| `BibleKJV1611-002.pdf/3`  |       2 | 16482465 |
| `BibleKJV1611-002.pdf/4`  |       2 | 16482466 |
| `BibleKJV1611-002.pdf/5`  |       2 | 16482469 |
| `BibleKJV1611-002.pdf/6`  |       4 | 16482472 |
| `BibleKJV1611-002.pdf/7`  |       7 | 16482473 |
| `BibleKJV1611-002.pdf/9`  |       4 | 16482474 |
| `BibleKJV1611-002.pdf/10` |       3 | 16482452 |
| `BibleKJV1611-002.pdf/11` |       1 | 16482453 |
| `BibleKJV1611-002.pdf/12` |      17 | 16482454 |
| `BibleKJV1611-002.pdf/13` |      12 | 16482455 |
| `BibleKJV1611-002.pdf/14` |       3 | 16482457 |
| `BibleKJV1611-002.pdf/15` |       6 | 16482458 |
| `BibleKJV1611-002.pdf/16` |       6 | 16482459 |
| `BibleKJV1611-002.pdf/17` |       5 | 16482460 |
| `BibleKJV1611-002.pdf/18` |       1 | 16482461 |
| `BibleKJV1611-002.pdf/19` |      11 | 16482462 |
| `BibleKJV1611-002.pdf/20` |       5 | 16482464 |
| `BibleKJV1611-002.pdf/48` |      14 | 16482467 |
| `BibleKJV1611-003.pdf/1`  |      11 | 16482475 |
| `BibleKJV1611-010.pdf/11` |       3 | 16482476 |
| `BibleKJV1611-010.pdf/12` |       5 | 16482477 |
| `BibleKJV1611-010.pdf/13` |       5 | 16482478 |
| `BibleKJV1611-010.pdf/14` |       2 | 16482481 |
| `BibleKJV1611-010.pdf/15` |       3 | 16482482 |
| `BibleKJV1611-010.pdf/16` |       4 | 16482483 |
| `BibleKJV1611-010.pdf/17` |       9 | 16482485 |
| `BibleKJV1611-010.pdf/19` |       4 | 16482486 |
| `BibleKJV1611-010.pdf/51` |       2 | 16482487 |
| `BibleKJV1611-010.pdf/52` |       1 | 16482489 |
| `BibleKJV1611-010.pdf/53` |       1 | 16482490 |
| `BibleKJV1611-011.pdf/60` |       3 | 16482491 |
| `BibleKJV1611-011.pdf/61` |       3 | 16482492 |
| `BibleKJV1611-016.pdf/17` |      10 | 16482493 |
| `BibleKJV1611-020.pdf/22` |       4 | 16482494 |
| `BibleKJV1611-020.pdf/27` |       4 | 16482497 |
| `BibleKJV1611-021.pdf/57` |       5 | 16482499 |
| `BibleKJV1611-023.pdf/1`  |       4 | 16482500 |
| `BibleKJV1611-023.pdf/56` |       9 | 16482501 |
| `BibleKJV1611-023.pdf/57` |       4 | 16482502 |
| `BibleKJV1611-023.pdf/58` |       7 | 16482503 |
| `BibleKJV1611-023.pdf/59` |       5 | 16482505 |
| `BibleKJV1611-024.pdf/1`  |       7 | 16482506 |
| `BibleKJV1611-024.pdf/2`  |       2 | 16482508 |
| `BibleKJV1611-024.pdf/3`  |       9 | 16482509 |
| `BibleKJV1611-024.pdf/4`  |       5 | 16482510 |
| `BibleKJV1611-024.pdf/66` |      10 | 16482511 |

## Not covered: the earlier five-page batch

The earlier batch (`../italics/REPORT.md`, 14 marks on 011.pdf/59, 021.pdf/55, 024.pdf/4, 024.pdf/19, 024.pdf/20)
used the same method. All 14 words are blackletter on the scan (Flash plus eye check). The local data now drops all
14 (3 via erosion rows, 11 via `scan-1611-visual` rows in `scripts/kjv1611/fixes.tsv`).

Live: the owner had already removed the two `our` marks on 024.pdf/19 (revs 16482218/16482221). The other 12 were
unwrapped (drafts in `earlier-batch/`), revid-guarded and verified byte-for-byte:

| Page                      | Removed | Revision |
| ------------------------- | ------: | -------: |
| `BibleKJV1611-011.pdf/59` |       1 | 16482578 |
| `BibleKJV1611-021.pdf/55` |       5 | 16482580 |
| `BibleKJV1611-024.pdf/19` |       3 | 16482581 |
| `BibleKJV1611-024.pdf/20` |       2 | 16482582 |
| `BibleKJV1611-024.pdf/4`  |       1 | 16482583 |
