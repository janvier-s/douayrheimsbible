# KJV 1611 Wikisource — batch 2 (posted 2026-11-22)

## How these were found

All **150** `Page:BibleKJV1611-*.pdf/*` wikitext files were fetched through the
MediaWiki API in bulk, split into `<section>` / `{{verse|c|v}}` units, and
word-diffed against `static/data/kjv-1611/<slug>.json` (see
`scripts/kjv1611/fixes.tsv` for the local ledger). Differences that are purely
orthographic or markup conventions (`⁊`/`&`, long-s, `{{smaller}}` supplied
words, drop-initials, margin-note markers) were filtered out. What remained was
a short list of candidate typos in the Wikisource transcription, each checked
against the actual scan with Vision OCR.

Two sections were excluded as **not comparable**, not errors:

- `Esther` — the local JSON for the additions uses modern fallback text.
- `Wisedome` — the `Page:` section markers on those pages misplace Matthew's
  genealogy into that section.

The rest of the differences were the same markup gaps already documented in the
Philemon pilot (supplied words marked in our data with `<i>` but plain on
Wikisource, and drop-initial first letters).

## Corrections (4 total, all scan-backed)

| Page                      | Verse               | Live            | Draft           | Evidence                                                                                                                  |
| ------------------------- | ------------------- | --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `BibleKJV1611-011.pdf/59` | Proverbs 1:3        | `inſtice`       | `iuſtice`       | Scan OCR reads `iultice,` (Vision prints ſ as `l`); the attached margin note glosses _Hebr. equities_.                    |
| `BibleKJV1611-016.pdf/16` | Obadiah 1:3         | `dwelleth`      | `dwelleſt`      | Scan OCR reads `bibelleft` (d/w/e → b/i/b, ſ → f); second-person `dwelleſt` also agrees with "thou that … in the clefts". |
| `BibleKJV1611-024.pdf/20` | Hebrews 1:14        | `miniſtering`   | `miniſtring`    | Scan OCR reads `minitring` — no `e` before the `r`; matches the local 1611 text.                                          |
| `BibleKJV1611-024.pdf/4`  | 1 Thessalonians 1:1 | `Theſſalonains` | `Theſſalonians` | Scan OCR reads `Theffalonians`; the live form is a transposition of `ia` → `ai`.                                          |

Page 20 was already edited in the Philemon pilot (rev 16482016); this would be
a second, independent edit to its Hebrews section.

## Drafts

The `.wiki` files in this folder are the exact proposed wikitext, each differing
from its live base by **one** string replacement. Base revisions at fetch time:

- `Page-BibleKJV1611-011.pdf-59.wiki` — base rev 12786700
- `Page-BibleKJV1611-016.pdf-16.wiki` — base rev 13152428
- `Page-BibleKJV1611-024.pdf-20.wiki` — base rev 16482016
- `Page-BibleKJV1611-024.pdf-4.wiki` — base rev 14721377

## Posted

All four edits were made under the `Sokonok@douayrheims` account with the summary
"Proofread: correct 4 scan-backed typos (KJV 1611)", each guarded by its live
revid. Live text was verified byte-for-byte against the drafts after posting.

| Page                      | Revision                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `BibleKJV1611-011.pdf/59` | [rev 16482048](https://en.wikisource.org/w/index.php?title=Page:BibleKJV1611-011.pdf/59&oldid=16482048) |
| `BibleKJV1611-016.pdf/16` | [rev 16482049](https://en.wikisource.org/w/index.php?title=Page:BibleKJV1611-016.pdf/16&oldid=16482049) |
| `BibleKJV1611-024.pdf/20` | [rev 16482051](https://en.wikisource.org/w/index.php?title=Page:BibleKJV1611-024.pdf/20&oldid=16482051) |
| `BibleKJV1611-024.pdf/4`  | [rev 16482052](https://en.wikisource.org/w/index.php?title=Page:BibleKJV1611-024.pdf/4&oldid=16482052)  |

Page quality levels and all other text were left unchanged.
