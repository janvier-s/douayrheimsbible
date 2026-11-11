# Handoff: modern / original spelling toggle (read + study) and a spelling button on the compare page

## Goal

Readers can switch the ODR text between the user's modern spelling and the original 1582/1609 spelling in read mode and study mode (text, verse notes, annotations, summaries), and the compare page gets a button to switch the ODR column's spelling.

## Context (read first)

- `plans/handoff-2026-11-11-sancta-integration.md` = overall project, formats, gotchas. Other sessions are concurrently changing `static/data/odr/**` (annotation review) and may add a "Facsimile" study tab (`plans/handoff-2026-11-11-facsimile-tab.md`); do not touch data content here, and keep edits to shared components minimal.
- Data: `static/data/odr-original/<book>.json` mirrors `static/data/odr/<book>.json` (same keys, `"spelling":"original"`) and `odr-original/<book>/annotations/NNN.json` mirrors annotations. Built by `../sancta-scrape/tools/build_original.py` from Sancta's verbatim text with the user's markers (`<na> <cr> <sc> <i> <mn> <alt>`) re-inserted. Coverage: 37,090 of 37,179 verses, 1,432 of 1,470 annotations; items it could not convert silently keep the MODERN text (no flag; list in `../sancta-scrape/analysis/original-dataset-unconverted-verses.csv`; 1,832 verse notes and 648 annotation notes also fell back). Prayer of Manasses + 2 chapters have no Sancta data (fallback to modern). Intros/`articles`/`summary_notes` are copied unchanged (modern).
- Code to read: `src/lib/data/loader.ts` and `types.ts` (data loading), `src/routes/odr/[book]/[chapter]/[[verse]]/` (+page, +layout, load), `src/lib/components/StudyPanel.svelte`, `VerseList.svelte`, `src/lib/stores/prefs.ts` (versioned migrations; add a `spelling: 'modern' | 'original'` pref + migration), `src/lib/stores/compare.ts` + `src/lib/data/compare.ts` + `src/routes/compare/`, `scripts/prepare-data.ts`.
- ODR routes are served through the Worker on purpose (CLAUDE.md); keep it that way. New JSON under `static/data/` is fine (`static/data/` is prettier-ignored).

## Next steps (ordered)

1. **Fix offset-based data first (important):** `lemmas` (`[start,length,part]`, char offsets into the verse plain text) and paragraph/line data in `static/data/format/vul/<book>.json` (`b: [[verse, charOffset, type]]`, `l: {verse: [offsets]}`) are CHARACTER offsets into the MODERN verse text. In original spelling the same words sit at different offsets, so naively reusing them will highlight/break in the wrong places. `odr-original` currently copies the modern `lemmas` verbatim (wrong for converted verses). Recompute lemmas for `odr-original` (see `scripts/build-odr-lemmas.ts`, which builds them from annotation titles; run it against the original text) and remap the paragraph/line offsets to word-index based or original-text offsets (word alignment helper: `../sancta-scrape/tools/transplant.py`). Paragraph STARTS at verse level are safe; mid-verse breaks and poetry lines are not. Keep CPDV paragraphing (user decision).
2. Add the pref (`spelling`), URL param `?spelling=original` (shareable links; default modern), and a loader switch that fetches `odr-original` data. Add a toggle control to read mode and study mode (a segmented "Modern | Original spelling" control; match existing UI style; Svelte 5 runes for components, Svelte 4 stores for shared state, per CLAUDE.md). Notes and annotations follow the toggle. Add a short, visible hint that some items remain in modern spelling where no original was available.
3. Compare page: add a button on the ODR column to switch it between modern and original spelling (user asked for a button; an extra dropdown entry "ODR (original spelling)" is an optional alternative, ask before adding). Make sure compare/diff highlighting still works when the original-spelling text is shown.
4. Search stays on the modern index (note in the UI/PR description; original-spelling search is out of scope unless the user asks). Check `/api` endpoints and `sitemap`/canonical URLs are not duplicated for `?spelling=`.
5. `npm run check` (51 baseline `tsc` errors for browser globals are pre-existing), `npx prettier --write` on touched src files, `npm run build`, then verify in the browser: a chapter with notes/annotations, a poetry book (Psalms), a chapter that falls back to modern, and the compare page. vitest fails locally (known); add/adjust unit tests anyway.

## Decisions / preferences

- Original spelling = Sancta's verbatim 1582/1609 text (only long-s and vv->w normalized). User wants original archaisms kept; this toggle exposes them.
- Keep CPDV paragraphing in both modes. Credit text for Sancta goes on `/about` (user places it): "The Original Douay-Rheims, a modern edition by Sancta Clara Press (sanctaclarapress.com), used under CC BY 4.0."
- Do not commit or push; the user does.

## Gotchas

- `odr-original` must be rebuilt after any change to `odr` (`rm -rf static/data/odr-original`, then `build_original.py`); another session is still editing `odr` annotations, so build the toggle against the current dataset and expect a rebuild later (the loader should not depend on exact counts).
- Preserve each JSON file's original format (some minified, some 2-space) if you ever rewrite data; detect via `git show HEAD:<path>`.
- Path has spaces and is iCloud; check for stale conflict copies (`"x 2.ts"`).

## Progress (done in session 2026-11-11 evening)

- Lemmas: `npx tsx scripts/build-odr-lemmas.ts --dir=odr-original --write` recomputes spans on the original text (title match, then word-index alignment from modern spans). Run it AFTER every `build_original.py` rebuild (a rebuild copies modern lemmas). 1,511 of 1,520 anchored. ODR paragraphing never uses `format/vul` (verse-level CPDV starts only), so no offset remap was needed.
- `build_original.py`/`transplant.py` now strip Sancta's inline note letters ("ethe" -> "the"); ~35 of 5,734 markers still carry one.
- `spelling` pref (v28), `loadBook/loadAnnotations(..., spelling)` with modern fallback, `BibleReader` swaps loaded chapters in place (pages stay prerendered modern, so first paint is modern), `?spelling=original` seeds the pref and is kept in the URL while scrolling, segmented control in Reading options > Text Options (ODR only), "Original spelling" button on the ODR compare column, clarifications off in original mode, unit test `tests/unit/loader-spelling.test.ts`.
- Open: `vv` is still `vv` in the data (handoff said vv->w normalized; confirm intent). Search stays modern.

## Update (compare + first paint)

- Compare has no toggle: `odr-orig` ("ODR-Orig") is a compare-only column (flag `compareOnly` in `compare.ts`, hidden from TopBar/Fathers/`[translation]` route), filled from `odr-original` in the compare `+page.ts`. Saved column layouts reset once because the translation count changed.
- No modern flash: `app.html` adds `html.spelling-pending` on `/odr/` when original spelling is wanted; CSS hides `[data-reader-chapters]` (visibility, so no layout shift) until `BibleReader.syncSpelling` finishes (4s failsafe).
- `vv` stays `vv`.
