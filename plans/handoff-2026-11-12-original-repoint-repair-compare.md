# Handoff: repoint odr-original, repair 206 shifted original-spelling verses, versification-aware compare

Working tree is UNCOMMITTED and must stay that way: no commit, no push unless the user asks. Read the previous handoffs first for context: `plans/handoff-2026-11-12-facsimile-peters-salette.md`, `plans/handoff-2026-11-12-facsimile-scan-pass.md`.

## State you inherit (already done, uncommitted)

- Scan-confirmed text corrections applied to `static/data/odr` (modern) and the original-spelling data (A word rows + 42 annotation fixes).
- 13 chapters re-divided to the 1609/1582 verse division in both spellings (Mark 3, Matt 17, Gal 6, Ps 5, 7, 42, 111, 125, 2 Cor 1, Eccles 4, Prov 4, Ecclus 29, 35). Notes, cross_refs, annotations, odr-clarifications re-keyed. Mapping in `static/data/odr/versification.json` (book -> chapter -> {new verse: [previous verse numbers]}; previous numbers = the Vulgate-aligned numbering every other compare column uses).
- `scripts/export.corpus.test.ts` pinned block count updated 43877 -> 43883 (net +6 verses).
- Original-spelling fixes: Matt 17:14 (restored lost text), 17:16, 17:19, 17:26, Acts 7:59, Mark 9:8, 9:40, 9:44, 9:46.
- The user MOVED `static/data/odr-original` out of the repo to **`/Users/Janvier/Documents/Bible-n-stuff/Websites/odr-original`** (git now shows ~473 tracked deletions). It still contains ~946 stale iCloud conflict copies (`* 2.json`, `annotations/001 3.json`): never read or ship those.

## Task 1: repoint (do first; the original-spelling toggle is broken until this lands)

The site must load the original spelling from the new location while still deploying it as static assets (Cloudflare Pages serves `static/`; `src/lib/data/loader.ts:27` fetches `odr-original/...` at runtime).

- Recommended: keep the runtime URL `/data/odr-original/...` and have the data pipeline (`scripts/prepare-data.ts`, which runs as `prebuild`, and the dev server) copy or sync the external folder into the build output, EXCLUDING the `* N.json` conflict copies. Make the source path configurable (env var, e.g. `ODR_ORIGINAL_DIR`, defaulting to `../odr-original` relative to the repo). Decide with the user whether `static/data/odr-original` should be gitignored or kept as a generated copy; ask before deleting tracked files from git history.
- Update scripts that read it: `scripts/build-odr-clarifications.ts` (ORIG), `scripts/build-odr-lemmas.ts` (`--dir=odr-original` is resolved under static/data; give it an absolute/external path option), corpus tests that read odr-original (grep `odr-original` in scripts/ and src/), `scripts/export-lib.ts` if it reads it, and `sancta-scrape/tools/build_original.py` (hard-codes the iCloud stub path).
- Verify: `npm run dev` with `?spelling=original` shows original text; `npm run build` output contains `data/odr-original/*.json` and NO conflict copies; `npm run test` and `npm run check` pass.
- IMPORTANT gotcha: `scripts/build-odr-lemmas.ts` reads every .json in each annotations folder, so the conflict copies cause duplicated `lemmas` entries. Run it only against a clean copy (rsync --exclude='\* [0-9].json') or make it ignore names matching / \d+\.json$/.

## Task 2: repair 206 shifted original-spelling verses

List: `~/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/sancta-scrape/analysis/odr-original-shifted-verses.tsv` (book, chapter, verse, lengths, both texts; 100 are in Psalms).
Cause: `sancta-scrape/tools/build_original.py` accepted a Sancta verse at only 0.6 similarity (dropping the tail when Sancta splits my verse) and pulled whole merged Sancta verses into the next verse. Result: original-spelling text sits in the wrong verse or is missing, while numbering follows the modern file.
Fix approach (proven on the 13 chapters above; see scratch script `reseg_apply.py`, copied to `sancta-scrape/tools/facsimile/2026-11-12/` if present, otherwise reproduce):

1. For each affected chapter, concatenate Sancta's `original` verse texts (`sancta-scrape/data/<book>/<ch>.json`; slugs isaie/jeremie/malachie map to isaias/jeremias/malachias), align at word level to the MODERN chapter (`static/data/odr/<book>.json`, which is correct and keeps the site's verse division), and cut Sancta's original text at the modern verse boundaries.
2. For each modern verse, build the original verse with `transplant(modern_text, sancta_segment)` + `check(...)` from `sancta-scrape/tools/transplant.py` (markers <na>, <cr>, <mn>, <sc>, <i> carried over). If check fails, keep the current original text and record it; never fall back silently.
3. Keep notes/cross_refs/xrefs of the original verse (labels are the same as modern). Recompute lemmas for the original afterwards (clean copy, see gotcha).
4. Re-run the length-ratio scan (original vs modern plain text, flag ratio outside 0.75-1.3 for verses > 30 chars); target: 0 unexplained. Psalm titles/verse 1 likely dominate; check how Sancta stores psalm titles (headings vs verse 1) before cutting.
5. Write a TSV of what changed and what could not be repaired next to the input list.
   Rules: original archaisms win over modernization; keep Ægypt; do not change modern text in this task; preserve each JSON file's exact formatting (detect indent/separators like `fmt_dump` in the scratch scripts).

## Task 3: compare view uses versification.json

Today compare aligns columns purely by verse number (`src/lib/utils/verse-map.ts`, compare rendering around `src/lib/components/VerseList.svelte` / `ChapterView.svelte`, store `src/lib/stores/compare.ts`, route `src/routes/compare/`). In the 13 re-divided chapters the ODR column is now on 1609 numbering.

- Rows stay keyed on the Vulgate/previous numbering (what the other columns use). For the ODR column (and the original-spelling ODR column), translate through `static/data/odr/versification.json`: one ODR verse may cover two rows (show it once, spanning or on the first row with a note), or two ODR verses may share one row (concatenate with their verse numbers).
- Same map should serve other lookups that assume ODR == Vulgate numbering: Fathers and Haydock keyed by verse, VerseTooltip cross-refs into ODR, search hits, and old `#v<n>` links in the 13 chapters. Grep for `.verse ===` and verse-keyed fetches.
- Svelte 5 runes for components, stores stay Svelte 4 (see CLAUDE.md). Add unit tests for the mapping helper; verify in the browser on e.g. /odr/psalms/5 compare with DRC and Vulgate, and Matthew 17 (27 ODR verses vs 26).

## Done when

`npm run test`, `npm run check`, `npm run build` pass; original toggle works from the external folder; the 206 list is re-scanned with results reported; compare aligns in the 13 chapters. Report to the user; do not commit.
