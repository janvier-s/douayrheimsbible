# Handoff: review ODR annotations + annotation margin notes for PDF-parsing errors (cross-check with Sancta)

## Goal

The user's ODR data was extracted from PDFs, so annotations (`static/data/odr/<book>/annotations/NNN.json`) and their margin notes (`notes[]` per annotation) may contain parsing/OCR errors. Find and fix them using Sancta Clara Press's independently transcribed text as a cross-check. Verse text was already reviewed this way; annotations only got spelling-level fixes so far.

## Context (read first)

- `plans/handoff-2026-11-11-sancta-integration.md` = big picture, data formats, gotchas (read the Gotchas section: per-file JSON format preservation, iCloud paths, tool paths).
- Sancta data: `../sancta-scrape/data/<sancta-book>/<ch>.json` -> `annotations[]` = `{id, verse, modern:{lemma,text}, original:{lemma,text}, margin:{left:{modern[],original[]}, right:{...}}}` (text starts with the lemma; strip it). Book slugs differ for 3 books: `isaie/jeremie/malachie` (here) = `isaias/jeremias/malachias` (Sancta).
- Tools already written in `../sancta-scrape/tools/` (they hard-code ROOT; check paths): `compare4.py` (matches annotations by verse+lemma+body, writes stats and CSVs), `apply2.py` (applies the "closest to the original" word-level rule to notes/annotations; `APPLY=1` writes with backups), `core.py` (`process()` = aligned word-level replacer, `strict=True` for notes), `transplant.py`, `rules.py`.
- Analysis outputs in `../sancta-scrape/analysis/`: `notes-annotations-held-back.csv` (296 different-word swaps held for review), `applied-original-rule-notes-annotations.csv`, `annotations-diff.csv`, `annotations-unmatched.csv` (51 yours-only / 47 Sancta-only).

## State today (after the spelling-level pass; uncommitted on `main`)

- 1,470 annotation pairs matched (verse+lemma+body). Remaining differences vs Sancta: body wording differs in 957, punctuation only 389, identical 103; titles/lemmas: 55 wording; margin-note sets: 970 identical, 211 minor (>=90% shared), 289 differ. 643 of your annotation margin notes found no clean Sancta match; 51 of your annotations and 47 of Sancta's are unmatched.
- Already applied: spelling-level swaps (2,162 words in verse notes/annotation bodies/margin notes/titles), 156 continuation parts joined, markers (`<mn>[n]</mn>`) preserved. Backups: `../sancta-scrape/backup-odr-annotations-before-original-rule/` (annotation files) and `backup-odr-before-original-rule/` (book files).

## Next steps (ordered)

1. For every matched pair, classify each remaining difference: (a) spelling/modernization style = ignore, (b) same word-level slot but different WORD (likely parse/OCR error in yours OR in Sancta), (c) missing/extra words or sentences (dropped line, merged column, hyphenation leftovers like `con- tinued`), (d) stray characters / broken markers, (e) numbers/citations (`Gen. 3. 5` style) that differ, (f) paragraph breaks (`\n\n`) in the wrong place. Output one review CSV per category with book/chapter/verse, both texts, and a suggested fix.
2. Auto-fix only the safe, high-confidence cases (original spelling in Sancta agrees with a different reading than yours AND the difference is a typo-like word, a dropped word, or a hyphenation artifact). Everything else (different numbers, different words, anything where yours and Sancta could both be plausible) goes to `analysis/facsimile-check-list.csv` as a new type "E. annotation reading" for the user to check against the facsimiles in `~/facsimiles/sancta/<book>/<ch>/<n>.jpg` (`manifest.json` maps chapters to pages).
3. Handle the unmatched annotations (51 yours-only, 47 Sancta-only) and the 643 unmatched margin notes: find whether they are split/merged differently (try matching by body text only), truly missing in one source, or misplaced to the wrong verse.
4. Check margin-note markers: each `<mn>[n]</mn>` in an annotation text must have a note with the same `marker`, and vice versa (no orphans or duplicates, including `◦` markers); verse-level `<na>`/`<cr>` markers likewise (`label` vs marker). Report/fix structural problems.
5. Rebuild `static/data/odr-original` afterwards (`tools/build_original.py`, `rm -rf` the dir first) because modern text changes; run `npm run build` and `npm run check` (51 baseline `tsc` errors for browser globals are pre-existing).

## Decisions / preferences

- Stay as close to the original archaisms as possible; modernize only for readability (already the rule used). `Ægypt` etc. stay.
- Sancta's "original" is their transcription, NOT the scan: it can be wrong. Where yours and Sancta disagree on a real word or a number, do not auto-pick; queue it for facsimile check (user will check).
- Don't push or commit anything; the user commits.

## Gotchas

- Preserve each JSON file's original format (minified vs 2-space indent, trailing newline) by detecting it from `git show HEAD:<path>`; never blind `json.dump(indent=2)`.
- Path has spaces and is iCloud; stale conflict copies like `"x 2.json"` may appear.
- Matching annotation by verse number fails in chapters whose verse numbering is offset (see `analysis/verse-numbering-differences.csv`); match by lemma/body instead.
- Your annotation text can be longer than Sancta's body (joined parts) or contain `<i>…</i>`; compare on tokens with tags/markers stripped (`tools/transplant.py: plain_tokens`).
