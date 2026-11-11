# Handoff: integrate Sancta Clara Press data into douayrheimsbible (2026-11-11)

## Goal

Improve the ODR data and site using https://sanctaclarapress.com (original 1582/1609 text, both spellings, notes, annotations; other dev is OK with it; license CC BY 4.0 + public-domain text; robots `ai-train=no`). User keeps their own modernization, but wants the ORIGINAL spelling/archaisms to win wherever it is only a matter of spelling.

## State: everything is UNCOMMITTED on `main` in `douayrheimsbible/` (~390 modified files + new untracked). Nothing pushed anywhere.

Sibling work dir `../sancta-scrape/` (not in git): `data/` (complete scrape, 1359 chapters, 37,139 verses, both spellings, margin notes, annotations, `clarifications`, `para` flag), `scrape.py`, `paragraphs.py`(obsolete), `facsimiles.py`, `tools/` (all analysis/apply scripts), `analysis/*.csv`, `backup-odr-before-original-rule/`, `backup-odr-annotations-before-original-rule/`, `proposed-odr/`. Scrapling venv: `~/.venvs/scrapling/bin/python`.

## Done

- Data (in `static/data/odr/`, formats preserved per file, detected from git HEAD): joined 156 continuation annotation parts; `kind` on all 8,533 verse notes (gloss/head/lectionary/word; 828 inferred by rule, see `analysis/`/`inferred-kinds.csv`); `xrefs` on 868 verses; 220 missing `cross_refs` (`"source":"sancta"`); 3 misplaced notes + Esther 3:12 note moved; 16 verses inserted (4 Esdras, 3 Esdras 8:60); original-over-modern rule applied (~3,100 verse words, ~2,170 note/annotation words) with `tools/apply.py` / `apply2.py`; Age 6 essay added as intro of `1-machabees`.
- `static/data/odr-original/` built by `tools/build_original.py` (37,090/37,179 verses converted, 1,432/1,470 annotations; markers re-inserted via `tools/transplant.py`). NEEDS REBUILD (see below).
- Reference docs added in `static/data/reference/odr/{ot,nt}/` + registered in `src/lib/data/reference.ts`: ot `to-the-curteous-reader, marks-of-the-reader, censura-english, job-recapitulation, index, errata`; nt `marks-of-the-reader, errata-and-colophon`. (Ages 1-5 essays already exist as chapter articles/intros; do NOT re-add.)
- `npm run build` passed (exit 0) on earlier data states. 51 `tsc` errors are false alarms (missing browser globals), unrelated.
- Facsimile download RUNNING/may be done: `facsimiles.py` -> `~/facsimiles/sancta/<book>/<ch>/<n>.jpg` (+`manifest.json`), 4,834 unique images (~750KB each, ~6GB), log `/private/tmp/claude-501/facs.log`, resumable (`~/.venvs/scrapling/bin/python sancta-scrape/facsimiles.py ~/facsimiles/sancta`). Plantin Latin excluded on purpose. Outside iCloud on purpose.

## Progress since handoff (same day, later session)

- Step 2 DONE (uncommitted): `scripts/build-challoner-stats.ts` -> `static/data/stats/challoner.json`; new section "The Revision by the Numbers" in `src/routes/history/challoner/+page.svelte`. Stats numbers refreshed on about, features, translations, stats pages (annotations 1,521; marginal notes 8,533; cross-refs 2,209). Chapters/summaries/arguments left as is (1,362/1,236/84 vs data 1,361/1,235/85; unverified).
- Step 1: facsimile download still running at last check (4,031 of 4,834 images, 5.5 GB).

## Next steps (ordered)

1. Facsimile download is DONE: 4,832 of 4,834 images saved (`~/facsimiles/sancta`), 0 failures, 2 are 404 on Sancta's side (`isaias/37/2.jpg`, `psalms/38/2.jpg`); nothing left to do except tell the user if asked.
2. **Challoner page (user said yes, do it):** `/history/challoner` is a narrative essay with 4 hand-picked examples; add a MEASURED section (or `/history/challoner/by-the-numbers`): compute ODR (modern) vs DRC (`static/data/drc/`) per verse: unchanged / spelling-only / reworded; per-book rate; top word swaps (Sancta cites: 11 in 12 verses reworded, 5,151 "our Lord"->"the Lord", 715 "Moyses"->"Moses"; compute our own, don't copy); most-rewritten verses; skip verses in numbering-offset chapters (`analysis/verse-numbering-differences.csv`). Precompute to `static/data/stats/…json` with a script in `scripts/`. Also refresh `/about/stats` (stale: 1,707 annotations, 37,196 verses; recompute from data).
3. Website: ODR read/study **toggle** modern/original (`?spelling=original`, loads `odr-original`); compare page **new dropdown entry** "ODR (original spelling)". Keep CPDV paragraphing in both modes.
4. **Inline clarifications** (user: "gold"): `sancta-scrape/data/*/*.json` -> `verses[].clarifications [{term,latin,gloss}]` (9,163). Anchor `term` into the user's modern verse text (they may differ after modernization), ship as data, UI = faint underline + popover, user-toggle (Sancta puts it under settings "Clarifications").
5. Rebuild `odr-original` after any modern-text change (`tools/build_original.py`; deletes/rewrites the dir, so `rm -rf` first). Add original spelling for the new Age 6 intro + reference docs (Sancta page embeds verbatim markdown in its script payload; `tools/docconv.py` converts the modern HTML only).
6. GitHub repo `janvier-s/original-douay-rheims` (CC0; local mirror = `dist-export/`, generated by `scripts/build-export-bundle.ts`): regenerate JSON/USFM from updated data, ADD verse-only JSON + USFM (modern and original). Annotation counts changed (merged parts; manifest said 1,677). Add NOTICE/README crediting Sancta (CC BY 4.0 applies to Sancta-derived data). **Show the diff and get user approval before ANY push.**
7. Credit text for `https://thedouayrheims.com/about`: "The Original Douay-Rheims, a modern edition by Sancta Clara Press (sanctaclarapress.com), used under CC BY 4.0." (user will place it; cover original-spelling text/notes, clarifications, facsimiles).
8. User will check `analysis/facsimile-check-list.csv` (137 rows: 14 word readings, 43 verse-numbering runs, 10 verse-count diffs, 70 notes only in their data) against the downloaded facsimiles; apply their answers.
9. Leftovers: `analysis/text-discrepancies-held-back.csv` / `notes-annotations-held-back.csv` (296 held-back note words), 1,832 verse notes and 648 annotation margin notes with no clean Sancta match, typo candidates (`analysis/typo-candidates.csv`), modernization inconsistencies (`inconsistent-modernizations.csv`, e.g. judgement/judgment).

## User preferences / decisions

- Modernization-agnostic: closest to the original archaisms wins (Marie not Mary, stroke not struck), modernize only for readability; keep `Ægypt`.
- KEEP CPDV paragraphing (Sancta 1609 paragraph flags are sparse in OT, verse-level only; user will re-check Sancta later; capture is in `data/*/*.json` `verses[].para`).
- No Plantin Latin. Facsimiles stay outside iCloud. Don't train models on Sancta data.
- Prose rules (memory): no em dashes in user-facing prose; Catholic apologetic framing for history articles.

## Gotchas

- Path contains spaces and is iCloud: iCloud makes stale conflict copies like `"1 2.json"`; check `find … -name '* *'`. vitest fails locally (known); rely on CI. Run `npx prettier --write` on touched src files before committing (`static/data/` is prettier-ignored).
- Data JSON formats differ per file (minified vs 2-space); scripts detect from `git show HEAD:`; never `json.dump(indent=2)` blindly (caused 150k-line diffs).
- Sancta scrape bug (fixed): HTML parser dropped verses; always use `scrape.py` (segments raw HTML at `<p class="verse…">`).
- `tools/*.py` hard-code `ROOT` and some import siblings; `apply.py` reads `tools/allow.json` via an old scratchpad path, fix before reuse. Sancta 'original' is their transcription, not the scan; it can have errors (facsimile is the arbiter).
- Sancta is corrected over time ("text last corrected 7 Nov 2026"); re-scrape occasionally and diff.
