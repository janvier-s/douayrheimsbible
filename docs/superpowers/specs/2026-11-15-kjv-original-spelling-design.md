# KJV original (1611) spelling — design

Date: 2026-11-15 · Status: approved in conversation, pending doc review

## Intent

Give the KJV the same modern / original spelling switch the ODR already has
(b3664220), so readers can read the 1611 King James text as printed and set it
beside the 1582/1609 ODR. Fidelity to the 1611 print is the point, same standard
as odr-original: long s (ſ), the printer's abbreviations (yͤ, yͭ), and the words
the 1611 set in roman type (the supplied words).

## Goals

- `static/data/kjv-1611/` = the KJV in 1611 spelling, in the site's KJV data shape
  and slugs, covering every book `static/data/kjv/` has (66 + Apocrypha).
- ſ placed as the 1611 prints it, validated against the page images.
- yͤ / yͭ where the 1611 prints them; the pronoun "ye" untouched.
- Supplied words kept as `<i>` where the source has them.
- The existing `spelling` pref (and `?spelling=original`) flips the KJV too: read
  and study panels show kjv-1611 when spelling is original.
- Compare gets a compare-only "KJV-Orig" column, like "ODR-Orig".

## Non-goals

- 1611 margin notes, chapter summaries, running heads (later, if ever).
- Search on the 1611 text (search stays modern, as for the ODR).
- LORD small caps beyond what the source text already has.
- Page-by-page reading of the images by Claude (token cost); OCR is local only.

## Anti-goals

- A "ye" pronoun turned into yͤ, or a yͤ left as "ye". Either is a fidelity bug.
- þ in the text. The 1611 prints a y with superscript e, not a thorn.
- Silently claiming supplied-word markup the Apocrypha does not have.

## Sources

| Source | Use | Notes |
|---|---|---|
| `kjv-1611/` (user's, 66 books; currently untracked in the main checkout at `douayrheimsbible/static/data/kjv-1611`) | **Base text** for the 66 books | 1611 spelling, `<i>` supplied words (19,853, checked against facsimile Gen 1:2, 1:4). No ſ. Writes the "the" abbreviation as `ye`, "that" as `yt` (16). Protestant book names/slugs. |
| aruljohn/Bible-kjv-1611 (80 books, no license stated) | **Apocrypha base**; **abbreviation witness** for all books | `&thorn;` marks exactly where the print has yͤ. No ſ, no supplied words. |
| kingjamesbibleonline.org 1611 page images (`/1611-Bible-KJV/webp/<Book>-Chapter-<c>-<n>.webp`, 1000 px) | **ſ witness** via local Tesseract | Tesseract `eng` reads ſ as l/f, never s: reliable evidence. |
| Wikisource `Page:BibleKJV1611-0NN.pdf/*` | **Calibration ground truth** | Only ~150 pages, ~40 proofread (quality 3–4), few dozen Bible pages (mostly Genesis). Has ſ, `{{smaller}}` roman words, margin notes. |

Attribution for aruljohn and kingjamesbibleonline goes on the about/sources page
the way other sources are credited.

## Approaches considered

1. **Rule + local Tesseract witness (chosen).** ſ by rule (non-final lowercase s
   → ſ; final stays round), with Tesseract on every page settling the variable
   clusters (s before f, h, k, b) and flagging conflicts for the user. Cheap,
   local, same method that worked for odr-original.
2. Dedicated blackletter OCR (Transkribus, Kraken + early-modern model). Outputs ſ
   directly but needs setup/paid credits and still needs alignment to the base
   text. Not worth it over (1).
3. Claude reading every page image. Most accurate for everything, but far too
   many tokens for ~1,500 pages. Rejected by the user.

## Data pipeline (builder's shape, script names are suggestions)

1. **Import** `kjv-1611/` into this worktree (it is the target directory, not a
   staging copy). Map book slugs to the site's KJV slugs (`1-samuel` →
   `1-kings`, `1-kings` → `3-kings`, chronicles → paralipomenon, etc.: take the
   map from however `kjv/` is keyed). Align verse structure with `kjv/`:
   Daniel and Esther (site's kjv merges the Greek additions: 531 vs 357, 272 vs
   167) and Psalms (2577 vs 2461; find out what the extra 116 are, probably
   superscriptions as verse 0/1). Output must have the same book/chapter/verse
   keys as `kjv/` so the existing remap logic (Psalm numbering, compare) just works.
2. **Apocrypha** from aruljohn, same mapping into the site's books (including the
   Greek additions to Esther/Daniel that `kjv/` merges). No `<i>`; record that in
   the data (e.g. a book-level flag) and in the UI/about copy.
3. **Abbreviations.** Align each verse with aruljohn word-by-word; where aruljohn
   has `&thorn;`, write `yͤ` (U+0079 U+0364). `yt` → `yͭ` (U+0079 U+036D). Every
   other `ye` stays. Report counts and any `&thorn;` that fails to align.
4. **ſ by rule** on the whole text, but leave the variable clusters (s+f, s+h,
   s+k, s+b) undecided, plus capitals and inside `<i>` treated the same as body.
5. **Images + Tesseract.** Download page images (polite rate, cached in
   `~/facsimiles/kjv-1611/`, outside the repo), run `tesseract eng` with TSV
   output, align OCR words to verse words. For each s, OCR l/f ⇒ ſ, OCR s ⇒ round.
   Decide the variable clusters by majority evidence per cluster per book section
   (OT/Apocrypha/NT may differ, as the ODR's did) and per word where OCR is clear.
6. **Calibrate** on the Wikisource proofread Bible pages before trusting step 5:
   report ſ precision/recall of rule-only vs rule+OCR. Target ≥ 99.5% agreement;
   inspect disagreements (they may be Wikisource errors).
7. **Conflicts file** (`docs/audits/kjv-1611-long-s.md` or TSV): words where rule,
   OCR and per-word evidence disagree, for the user to check by eye.

## App wiring

Mirror the ODR implementation (b3664220):

- `src/lib/data/loader.ts`: the KJV text loader picks `kjv-1611` when spelling is
  original, falling back to `kjv` per book if missing.
- Read + study panels (`StudyPanel.svelte`, `VerseList.svelte`, `BibleReader`):
  apply the swap for the KJV the same way as the ODR. One shared `spelling`
  pref; no new pref, no prefs migration.
- `app.html` flash-hiding: extend to KJV pages.
- `src/lib/stores/compare.ts` + compare route: add `kjv-1611` column, label
  "King James Version, 1611 spelling" (short "KJV-Orig"), compare-only, with the
  same Psalm remap as `kjv`.
- `<i>` renders as the KJV's supplied-word style already does.
- Fonts: verify yͤ/yͭ (combining marks on y) and ſ render in the
  original-spelling fonts in `src/lib/data/fonts.ts`; fix fallback if not.
- About / features page: one line on the KJV 1611 spelling and its sources,
  noting the Apocrypha has no supplied-word markup.

## Testing

- Data tests: every kjv-1611 book has the same chapter/verse keys as kjv; no `þ`
  or `&thorn;`; no final ſ; every `yͤ` came from an aligned `&thorn;`.
- Calibration report numbers recorded in the audit doc.
- Existing ODR spelling tests still pass; add a KJV case for the loader fallback.

## Left to the builder

Script names and layout, the alignment algorithm, OCR preprocessing (scaling,
binarizing), how the cluster decisions are parameterised, exact label copy.
