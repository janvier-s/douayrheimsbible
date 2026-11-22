# KJV 1611 Wikisource — batch 3 (posted 2026-11-22)

## How these were found

All 150 `Page:BibleKJV1611-*.pdf/*` files were re-fetched and word-diffed
verse-by-verse against `static/data/kjv-1611/genesis.json` after the italics
sweeps. Esther and Wisedome were excluded (non-comparable sources). The
Genesis candidates were checked against the original Wikimedia scans: each
PDF page was rendered at 300 DPI and read with Apple Vision OCR (which prints
long-ſ as `f`/`l`/`b`/`(`). Only differences supported by the scan were kept.

## Corrections (17 total)

| Page | Verse | Live | Scan-backed reading | Evidence |
|---|---|---|---|---|
| `BibleKJV1611-002.pdf/11` | 12:5 | `had gaterhed,` | `had gathered,` | scan: "gathereo" = gathered |
| `BibleKJV1611-002.pdf/11` | 12:6 | `vnto the place of Moreh` | `vnto the plaine of Moreh` | scan: "the plaine of Moreh" |
| `BibleKJV1611-002.pdf/13` | 14:15 | `hand of Damasſcus:` | `hand of Damaſcus:` | scan: "Da / malcus" = Damaſcus |
| `BibleKJV1611-002.pdf/15` | 16:5 | `my maid itno thy` | `my maid into thy` | scan: "into" |
| `BibleKJV1611-002.pdf/17` | 19:2 | `wasſh your feete` | `waſh your feete` | scan: "woalh" = waſh |
| `BibleKJV1611-002.pdf/19` | 20:2 | `Abimilech King` | `Abimelech King` | scan: "abimelech" |
| `BibleKJV1611-002.pdf/3` | 2:18 | `the man ſhoud be alone` | `the man ſhould be alone` | scan: "(hould" = ſhould |
| `BibleKJV1611-002.pdf/48` | 42:36 | `Me haue ye bereaued` | `We haue ye bereaued` | scan: "D9e haue pe bereaued" = We haue ye |
| `BibleKJV1611-002.pdf/6` | 6:3 | `his dayes ſhallbe` | `his dayes ſhalbe` | scan: "Ohalbe" = ſhalbe |
| `BibleKJV1611-002.pdf/6` | 6:16 | `finish it abooe` | `finish it aboue` | scan: "aboue" |
| `BibleKJV1611-002.pdf/8` | 8:9 | `and the returned` | `and ſhe returned` | scan: "the" = ſhe (Vision reads ſhe as the); local data + grammar |
| `BibleKJV1611-002.pdf/8` | 8:11 | `leafe plucket off` | `leafe pluckt off` | scan: "plucht" = pluckt |
| `BibleKJV1611-002.pdf/8` | 9:2 | `that mooveth` | `that mooueth` | scan: "mooueti)" = mooueth |
| `BibleKJV1611-002.pdf/9` | 9:23 | `vpon bboth their` | `vpon both their` | scan: "both" |
| `BibleKJV1611-002.pdf/9` | 10:4 | `and Dadanim.` | `and Dodanim.` | scan: "Dobanim" = Dodanim |
| `BibleKJV1611-002.pdf/9` | 10:4 | `Iauan: Eliſah,` | `Iauan: Eliſhah,` | scan: "Clifhah" = Eliſhah |
| `BibleKJV1611-003.pdf/1` | 43:34 | `fiue times to much` | `fiue times ſo much` | scan: "fiue times fo much" = ſo much |

## Drafts

Each `.wiki` file is the exact proposed replacement, differing from the live
base only in the changes above. Base revisions at fetch time:

| Page | Base rev | Posted rev |
|---|---:|
| `BibleKJV1611-002.pdf/11` | 16482161 |
| `BibleKJV1611-002.pdf/13` | 16482163 |
| `BibleKJV1611-002.pdf/15` | 16482165 |
| `BibleKJV1611-002.pdf/17` | 16482167 |
| `BibleKJV1611-002.pdf/19` | 16482169 |
| `BibleKJV1611-002.pdf/3` | 16482172 |
| `BibleKJV1611-002.pdf/48` | 16482174 |
| `BibleKJV1611-002.pdf/6` | 16482176 |
| `BibleKJV1611-002.pdf/8` | 13558587 |
| `BibleKJV1611-002.pdf/9` | 16482178 |
| `BibleKJV1611-003.pdf/1` | 16482179 |

## Posted

All 11 edits were made under `Sokonok@douayrheims` with the summary
"Proofread: correct 17 scan-backed typos in Genesis (KJV 1611)", each guarded
by its live revid. All 11 pages were verified byte-for-byte against the drafts
after posting. Quality levels and all other text were left unchanged.
