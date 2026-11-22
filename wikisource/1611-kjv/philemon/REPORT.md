# KJV 1611 Wikisource — Philemon pilot (posted 2026-11-22)

## What this is

Scan-backed corrections to the two existing `Page:` pages that carry Philemon
in the [Bible (King James Version, 1611)](https://en.wikisource.org/wiki/Bible_(King_James_Version,_1611))
edition:

- `Page:BibleKJV1611-024.pdf/19` — posted as [rev 16482015](https://en.wikisource.org/w/index.php?title=Page:BibleKJV1611-024.pdf/19&oldid=16482015)
- `Page:BibleKJV1611-024.pdf/20` — posted as [rev 16482016](https://en.wikisource.org/w/index.php?title=Page:BibleKJV1611-024.pdf/20&oldid=16482016)

Both edits were made under the `Sokonok@douayrheims` account with the summary
"Proofread: correct 11 scan-backed transcription errors in Philemon (1611 KJV)".
The files `Page-BibleKJV1611-024.pdf-19.wiki` and
`Page-BibleKJV1611-024.pdf-20.wiki` in this folder are the exact text that was
posted. Page quality levels were deliberately left unchanged (3 and 2
respectively), so the original proofreader attribution remains intact.

## Data updates (this session)

The generated data was also corrected, through a **persistent ledger** so the fixes
survive a rebuild: `scripts/kjv1611/fixes.tsv`, applied by `scripts/kjv1611/build.ts`
after long-ſ placement. Rebuild the pilot books with:

```bash
npx tsx scripts/kjv1611/build.ts --evidence=$HOME/facsimiles/kjv-1611/long-s-evidence.tsv --only=philemon
npx tsx scripts/kjv1611/build.ts --evidence=$HOME/facsimiles/kjv-1611/long-s-evidence.tsv --only=genesis
```

| Book | Verse | Change | Evidence |
|---|---|---|---|
| Philemon | 1:1 | `&` → `⁊` | The print uses the Tironian et; confirmed by the proofread scan transcription. |
| Philemon | 1:25 | subscription restored: `¶ Written from Rome to Philemon, by Oneſimus a ſeruant.` | Present in the site's Original-1611 HTML and in the scan, but dropped from the frozen source JSON. |

Genesis 1 was collated against the two local 1611 scan pages and needed **no data
change**. The `voyd,` / `voyd;` question at 1:2 was left alone: the local scan OCR and
the site transcription read a comma, while the Wikisource proofread page reads a
semicolon — not clear-cut enough for a silent fix.

Note: kingjamesbibleonline.org hosts Philemon's local scan as
`Philemon-Chapter-1-1-Hebrews.webp` and it covers only verses 19–25; verses 1–18 were
checked against the site's Original-1611 text and the scan-backed Wikisource transcription.

## Inputs

1. **Local verse text:** `static/data/kjv-1611/philemon.json` (1 chapter, 25 verses).
2. **Local sidenotes:** `static/data/kjv-notes-1611/philemon/1.json` does not exist —
   the Original-1611 site has no sidenotes for Philemon, and the scan shows none.
   The sidenote sidecar will be used for books that do have them.
3. **Scans:** pages 19–20 of `File:BibleKJV1611-024.pdf`, fetched at 1280px and
   1920px from Wikimedia's thumbnail service.
4. **Vision OCR:** Apple Vision via the repo's existing tool
   `python3 -I scripts/wikisource/rh.py ocr-vision …`, which wrote the four
   `.vision.tsv` files alongside the drafts. Vision prints `ſ` as `f`/`l`/`b`,
   so its output was used only to adjudicate letters and words, never as a
   source of original spelling.

## Corrections (11 total)

| Page | Verse | Live text | Draft text | Evidence |
|---|---|---|---|---|
| 19 | 3 | `Ieſus Christ` | `Ieſus Chriſt` | Local 1611 text; scan OCR `Chilt` (ſ misread) |
| 19 | 6 | `in Christ Ieſus` | `in Chriſt Ieſus` | Local 1611 text; same ſ convention |
| 19 | 9 | `fof loues ſake` | `for loues ſake` | Scan OCR `foz` (r → z) |
| 19 | 13 | `miniſtered` | `miniſtred` | Scan OCR `baueminitred` = "haue miniſtred" |
| 19 | 16 | `a brotther beloued` | `a brother beloued` | Scan OCR `a brother beloued` |
| 19 | 16 | `boh in the fleſh` | `both in the fleſh` | Scan OCR `but bolb much` (both) |
| 19 | 18 | `but that on mine account` | `put that on mine account` | Scan OCR `put that ou mine ac-count` |
| 19 | 19 | `to thee thou oweſt` | `to thee how thou oweſt` | Scan OCR has an intervening word (`folb`); local text has `how` |
| 20 | 21 | `more that I ſay` | `more then I ſay` | Scan OCR `moze then lay` |
| 20 | 23 | `Epaphias` | `Epaphras` | Local 1611 text; kingjamesbibleonline.org's 1611 verse page and three other 1611 witnesses read *Epaphras*; scan OCR `@paphias` is blackletter *r* read as *i* |
| 20 | 25 | `with you ſpirit` | `with your ſpirit` | Scan OCR `lith pour (pirit` = "with your ſpirit" |

## Deliberately not changed

- The existing `{{smaller|…}}` markup. Our local JSON marks `our` (v1, v2),
  `thee` (v9), `thee` (v18) and `it` ×2 (v19) as supplied words; the live page
  leaves most of them plain. That is a likely fidelity gap, but the 1280/1920px
  Vision word boxes were not conclusive about the small Roman type, so it is
  left for a human proofread against the scan.
- The existing `{{smaller|thee ought}}` scope in v18 (our data marks only `thee`).
- The Hebrews material after `<section end="philemon" />` on page 20, including
  its `Christ` in the chapter summary — outside this pilot's scope.
- Page 19's `⁊` for the local text's `&` (the print glyph is `⁊`) and the
  `{{dropinitial|P|image=…}}` rendering of the pilcrow initial.

## Reproduce

```bash
# fetch the two scans (1280px is on Wikimedia's allowed thumbnail sizes)
curl -o scan-19.jpg 'https://upload.wikimedia.org/wikisource/en/thumb/6/65/BibleKJV1611-024.pdf/page19-1280px-BibleKJV1611-024.pdf.jpg'
python3 -I scripts/wikisource/rh.py ocr-vision scan-19.jpg scan-20.jpg
```

Drafts were produced by applying the 11 string replacements above to the live
wikitext fetched with `action=query&prop=revisions&rvslots=main`.
