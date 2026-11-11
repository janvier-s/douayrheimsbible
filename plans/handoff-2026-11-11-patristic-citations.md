# Handoff: verify patristic and other citation numbers online (annotations where yours and Sancta differ)

## Goal

Resolve the number differences in ODR annotation text and margin notes that are citations to the Fathers, councils or other non-scriptural works (e.g. `de civ. dei li. 21 c. 17` vs `c. 27`). Check the cited work online and decide which number is right.

## Context (read first)

- `plans/handoff-2026-11-11-annotation-review.md` (what was done and the rules) and `plans/handoff-2026-11-11-sancta-integration.md` (data formats, gotchas).
- Candidates: `../sancta-scrape/analysis/patristic-citation-candidates.csv` (book, chapter, verse, kind = ann_body/ann_title/note, yours vs Sancta number, context from both). Wider list: `annotation-review-residuals.csv` (cat = numbers). Scripture-only citations were already resolved against the repo's Bible text; 11 were fixed.
- Annotation data: `static/data/odr/<book>/annotations/NNN.json` (match by verse; notes under `notes[]`). Sancta: `../sancta-scrape/data/<book>/<ch>.json`.

## Steps

1. For each candidate, read the context, identify author, work, book/chapter or letter/homily number (Hierom, Aug, Greg, Chrysostom, Cyprian, Cyril, Ambrose, Bernard, councils, Eusebius, etc.).
2. Look the passage up online (New Advent / Church Fathers, CCEL, Perseus/documenta catholica omnia, Google Books/archive.org for older editions) and check which number points to a passage that matches the claim being made in the annotation. Note that old numbering (1582/1609, Erasmus or Benedictine editions) can differ from modern numbering by one or more; if the claim fits a passage under either number, treat as unresolved.
3. Apply a fix only when exactly one reading fits the claim and the work actually has that chapter/letter. Use exact-string replacement on the parsed JSON, assert one hit, and preserve each file's format (detect from `git show HEAD:<path>`, 2-space vs minified, `ensure_ascii`, trailing newline). Keep yours where yours is right.
4. Log every decision (resolved yes/no, source URL, reasoning) in `../sancta-scrape/analysis/patristic-citations-resolved.csv`. Anything not settled goes to `analysis/facsimile-check-list.csv` as type "E. annotation reading" (remove rows you resolved).
5. If modern text changed: `rm -rf static/data/odr-original && python3 ../sancta-scrape/tools/build_original.py`, then `npm run build` and `npm run check` (0 errors expected).

## Decisions / preferences

- Do not commit or push; the user commits.
- Keep the user's additional notes where they fit the text; Sancta is not a critical edition and can be wrong.
- Stay close to original archaisms; only change the number.
- Sancta's "original" is a transcription, not the scan. Where online sources cannot settle it, leave it for the facsimile.
- Page references to the original book (e.g. `pag. 186` vs `203`) and dates (`1552` vs `1551`) cannot be verified online; queue them.
- Dan 4:13 `(v. 32)` vs `v. 31` is still open (possible 1609 verse-numbering offset).

## Probable answers from memory (unverified, check before applying)

City of God 22.8 (John 14:12: Sancta c. 8), 21.27 (James 2:13: Sancta c. 27), 20.29 (Apoc 11:3: yours li. 20); Ambrose De sacr. 3.1 (John 13:10: Sancta li. 3).

## Gotchas

- Path has spaces and is iCloud; stale conflict copies like `"x 2.json"` may appear.
- Many "differences" in the wider residuals list are note-order or alignment noise, not real number disagreements; the candidates CSV already filters to rows where both sides are plain numbers.
