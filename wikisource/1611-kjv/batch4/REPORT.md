# KJV 1611 Wikisource — batch 4 (posted 2026-11-22)

## How these were found

After batch 3, all 150 `Page:BibleKJV1611-*.pdf/*` files were re-fetched and
word-diffed verse-by-verse against `static/data/kjv-1611/` again. Every Genesis
candidate page was downloaded as a scan thumbnail (or rendered from the PDF)
and read with Apple Vision OCR at 1920–300 DPI. The listed changes are those
where the scan OCR supports the 1611 reading over the live reading. Vision OCR
prints long-ſ as `f`/`l`/`b`/`(` and sometimes `v` as `b`; the quoted fragments
are the raw OCR strings.

## Corrections (17 total)

| Page                      | Verse | Live                            | Scan-backed reading             | OCR evidence                                                            |
| ------------------------- | ----- | ------------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `BibleKJV1611-002.pdf/10` | 10:14 | `out of whom came`              | `out of whome came`             | scan p10: "our of whome came"                                           |
| `BibleKJV1611-002.pdf/11` | 11:17 | `and thirty yeres`              | `and thirtie yeres`             | scan p11: "thirtie peres"                                               |
| `BibleKJV1611-002.pdf/15` | 17:2  | `my covenant betweene`          | `my couenant betweene`          | scan p15: "my couenant tieene"                                          |
| `BibleKJV1611-002.pdf/17` | 18:20 | `Sodome and Gomorah is great`   | `Sodome and Gomorrah is great`  | scan p17: "Sodome and omorcal is great"                                 |
| `BibleKJV1611-002.pdf/18` | 19:20 | `it is a little one:`           | `it is a litle one:`            | scan p18: "andétis a litle one"                                         |
| `BibleKJV1611-002.pdf/19` | 20:3  | `came to Abimilech in a dreame` | `came to Abimelech in a dreame` | scan p19: "cameto 2fbinielech"                                          |
| `BibleKJV1611-002.pdf/19` | 20:4  | `But Abimilech had not`         | `But Abimelech had not`         | scan p19: "23ut albinelech"                                             |
| `BibleKJV1611-002.pdf/48` | 42:33 | `the country ſaid`              | `the countrey ſaid`             | scan p48: "thecoun:trey faid"                                           |
| `BibleKJV1611-002.pdf/6`  | 6:17  | `and}} every thing`             | `and}} euery thing`             | scan p6: "euery"                                                        |
| `BibleKJV1611-002.pdf/6`  | 6:17  | `I, even I`                     | `I, euen I`                     | scan p6: "3,cuen / Doe"                                                 |
| `BibleKJV1611-002.pdf/6`  | 6:19  | `them}} alive with thee`        | `them}} aliue with thee`        | scan p6: "to heepe them aliue"                                          |
| `BibleKJV1611-002.pdf/6`  | 6:20  | `them}} alive.`                 | `them}} aliue.`                 | scan p6: "to heepe them aliue"                                          |
| `BibleKJV1611-002.pdf/8`  | 8:4   | `moneth, upon the mountaines`   | `moneth, vpon the mountaines`   | scan p8: "bpon themountames"                                            |
| `BibleKJV1611-002.pdf/8`  | 8:20  | `and offered burnt offrings`    | `and offred burnt offrings`     | scan p8: "offred burnt offrings"                                        |
| `BibleKJV1611-011.pdf/59` | 1:11  | `Come with us,`                 | `Come with vs,`                 | scan prov59: "Comenith b5"                                              |
| `BibleKJV1611-011.pdf/59` | 1:12  | `vp alive,`                     | `vp aliue,`                     | scan prov59: "fmallow them bp aliue"                                    |
| `BibleKJV1611-021.pdf/55` | 1:15  | `¶ John bare witneſſe`          | `¶ Iohn bare witneſſe`          | scan john55: "CJohn bace witnette"; local data + Iohn elsewhere on page |

## Deliberately excluded

- `Philiſtim` (10:14) — scan reads `Jbiultim` (single i); live is correct, local data is not.
- `Up`/`Vp` (19:14, 44:4) — scan reads `bp` (v→b), so live `Vp` is correct.
- `lacke` (18:28) — live reads correctly in the verse; the `{{smaller|lack}}` is a supplied word.
- `giue`/`giuen` (13:15, 15:3, 15:7) — live already has the 1611 spelling; local data is modernised there.
- `whome`/`whom`-style variants without scan support, all `ǁ`/dropinitial artifacts, and the Esther/Wisedome/hebrewes sections (incomparable or mis-mapped).

## Drafts

Each `.wiki` file is the exact proposed replacement, differing from the live
base only in the changes above. Base revisions at fetch time:

| Page                      | Base rev | Posted rev |
| ------------------------- | -------: | ---------- |
| `BibleKJV1611-002.pdf/10` | 16482160 |
| `BibleKJV1611-002.pdf/11` | 16482227 |
| `BibleKJV1611-002.pdf/15` | 16482229 |
| `BibleKJV1611-002.pdf/17` | 16482231 |
| `BibleKJV1611-002.pdf/18` | 16482168 |
| `BibleKJV1611-002.pdf/19` | 16482232 |
| `BibleKJV1611-002.pdf/48` | 16482234 |
| `BibleKJV1611-002.pdf/6`  | 16482235 |
| `BibleKJV1611-002.pdf/8`  | 16482236 |
| `BibleKJV1611-011.pdf/59` | 16482111 |
| `BibleKJV1611-021.pdf/55` | 16482112 |

## Posted

All 11 edits were made under `Sokonok@douayrheims` with the summary
"Proofread: correct 17 scan-backed typos (KJV 1611)", each guarded by its live
revid. All 11 pages were verified byte-for-byte against the drafts after
posting. Quality levels and all other text were left unchanged.
