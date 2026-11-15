# KJV 1611 Original Spelling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `static/data/kjv-1611/` (KJV in 1611 spelling with ſ, yͤ/yͭ, supplied words) behind the existing `spelling` pref, plus a "KJV-Orig" compare column.

**Architecture:** Pure text functions in `scripts/kjv1611/lib.ts` (unit-tested). A build script turns the user's 66-book source + aruljohn Apocrypha into site-shaped JSON with abbreviations and rule-based ſ. A separate OCR pipeline (local Tesseract on the 1611 page images) produces per-word ſ evidence that the build script consumes, calibrated against Wikisource. The app reuses the ODR spelling plumbing: `loadTranslationBook` gains a spelling argument.

**Tech Stack:** SvelteKit, TypeScript, tsx scripts, vitest (`tests/unit`), Tesseract 5 (`eng`), ImageMagick/dwebp.

**Spec:** `docs/superpowers/specs/2026-11-15-kjv-original-spelling-design.md`

## Global Constraints

- Output dir: `static/data/kjv-1611/`, same file names, book/chapter/verse keys and JSON shape as `static/data/kjv/` (except: no Psalm verse 0, see Task 2).
- The user's current `kjv-1611/` (66 books, Protestant slugs, untracked at `/Users/Janvier/Documents/Bible-n-stuff/Websites/douayrheimsbible/static/data/kjv-1611`) is **input**: copy it unmodified to `~/facsimiles/kjv-1611/source/` before anything writes the output dir. Never overwrite the copy.
- External caches (aruljohn JSON, page images, OCR TSV) live under `~/facsimiles/kjv-1611/`, never in the repo.
- "the" abbreviation = `y` + U+0364 (`yͤ`); "that" = `y` + U+036D (`yͭ`). Never `þ` or `&thorn;` in output.
- ſ = U+017F. Lowercase non-final s → ſ; word-final s stays round; capitals unchanged. Clusters s+f, s+h, s+k, s+b decided by OCR evidence (Task 4), not by rule.
- Supplied words stay as `<i>…</i>`. Apocrypha books carry `"supplied": false` at book level.
- One shared `spelling` pref; no new pref, no prefs migration.
- Compare column: id `kjv-orig`, label `King James Version, 1611 spelling`, abbr `KJV-Orig`, year `1611`, `compareOnly: true`, micro `1611 Spelling`.
- Image downloads: ≤ 2 requests/second, generic User-Agent, cached (never re-fetch an existing file).
- Commit only the files each task names; this branch carries unrelated uncommitted work.

## Review Focus

1. A verse with both the pronoun "ye" and a "the" abbreviation: only the word aligned to aruljohn's `&thorn;` becomes `yͤ` (test in Task 1).
2. s next to punctuation or tags (`Moses:`, `<i>is</i>`, `selfe-same`): final-before-punctuation/hyphen/tag stays round, inner s still ſ (test in Task 1).
3. Spelling = original on a KJV book or chapter missing from kjv-1611: reader shows modern KJV, not a 404 (test in Task 5).
4. Toggling spelling while on a KJV read page swaps text in place and keeps position, like the ODR (manual check in Task 5).
5. yͤ / ſ render with the original-spelling font stack, not tofu (manual check in Task 6).

---

### Task 1: Text library

**Files:**
- Create: `scripts/kjv1611/lib.ts`
- Test: `tests/unit/kjv1611-lib.test.ts`

**Interfaces:**
- Produces:
  - `normalizeWord(w: string): string` — lowercase, strip tags/punctuation/¶, fold ſ→s, v→u, j→i, strip U+0364/U+036D. Letter folding only; no word substitutions.
  - `tokenize(text: string): Token[]` where `Token = { raw: string; start: number; end: number; key: string }` — words of the verse with offsets into `text`, tags excluded from tokens but offsets kept so edits preserve markup.
  - `type ClusterPolicy = Partial<Record<'f'|'h'|'k'|'b', 'long'|'round'>>`
  - `applyLongS(text: string, policy: ClusterPolicy, overrides?: Map<number, 'long'|'round'>): string` — `overrides` keyed by char offset of an s in `text`.
  - `placeAbbreviations(base: string, witness: string): { text: string; placed: number; unplaced: number }` — witness is aruljohn verse text with `&thorn;`.
  - `alignVerses(src: {verse:number;text:string}[], target: {verse:number;text:string}[]): Map<number, number>` — target verse → src verse, by word-set similarity (normalized keys), monotonic.

- [ ] **Step 1: Write failing tests**

```ts
expect(applyLongS('God said, Let', {})).toBe('God ſaid, Let');
expect(applyLongS('goodnesse', {})).toBe('goodneſſe');
expect(applyLongS('Moses: and', {})).toBe('Moſes: and');
expect(applyLongS('<i>is</i> in it selfe-same', {})).toBe('<i>is</i> in it ſelfe-ſame');
expect(applyLongS('Sonne', {})).toBe('Sonne');
expect(applyLongS('fish', { h: 'round' })).toBe('fish');
expect(applyLongS('fish', { h: 'long' })).toBe('fiſh');
expect(applyLongS('fish', {})).toBe('fish'); // undecided cluster stays round
const r = placeAbbreviations('so loued ye world, ye shall', 'so loued &thorn; world, ye shall');
expect(r.text).toBe('so loued yͤ world, ye shall');
expect(r).toMatchObject({ placed: 1, unplaced: 0 });
expect(placeAbbreviations('and yt is', 'and yt is').text).toBe('and yͭ is');
expect(normalizeWord('Vpon,')).toBe('upon');
expect(normalizeWord('ſaid')).toBe('said');
```
Plus `alignVerses` on a 3-verse target where src has an inserted extra verse: maps 1→1, 2→3, 3→4.

- [ ] **Step 2: Run** `npx vitest run tests/unit/kjv1611-lib.test.ts` — expect FAIL (module missing).
- [ ] **Step 3: Implement** the five functions. `alignVerses`: dynamic-programming alignment on Jaccard similarity of normalized key sets (threshold 0.3 to count as a match), allowing skips on both sides.
- [ ] **Step 4: Run** the same command — expect PASS.
- [ ] **Step 5: Commit** `scripts/kjv1611/lib.ts tests/unit/kjv1611-lib.test.ts` — `feat(kjv-1611): text library for long s, abbreviations, verse alignment`.

### Task 2: Build kjv-1611 JSON (structure, Apocrypha, abbreviations, rule ſ)

**Files:**
- Create: `scripts/kjv1611/fetch-aruljohn.ts`, `scripts/kjv1611/build.ts`, `scripts/kjv1611/slugs.ts`
- Create (generated): `static/data/kjv-1611/*.json` (76 files)
- Test: `scripts/kjv1611.corpus.test.ts` (follows `scripts/export.corpus.test.ts` pattern)

**Interfaces:**
- Consumes: Task 1 functions.
- Produces:
  - `SOURCE_SLUGS: Record<string /*site slug*/, { source?: string /*file in ~/facsimiles/kjv-1611/source*/; aruljohn?: string[] /*files, in order*/ }>` in `slugs.ts`.
  - `npx tsx scripts/kjv1611/build.ts [--evidence=<tsv>]` writes the output dir; without `--evidence` all clusters are round. Prints per-book counts: verses, yͤ placed/unplaced, ſ count.
  - Book JSON: `{ book, supplied?: false, chapters: [{ chapter, verses: [{ verse, text }] }] }`.

- [ ] **Step 1:** Copy the user's folder to `~/facsimiles/kjv-1611/source/` (`cp -n`). The build reads only from there and writes this worktree's `static/data/kjv-1611/` fresh.
- [ ] **Step 2:** `fetch-aruljohn.ts` downloads all 80 aruljohn files (raw GitHub URLs) to `~/facsimiles/kjv-1611/aruljohn/`, skipping existing.
- [ ] **Step 3: Write the failing corpus test** (skips when `static/data/kjv-1611` is absent):
  - every file in `static/data/kjv/` exists in `kjv-1611/`;
  - for every book/chapter, the set of verse numbers equals kjv's, except Psalms verse 0 (absent in kjv-1611: neither source has the 1611 titles);
  - no text contains `þ`, `&thorn;`, `&`-entities, or `ſ` followed by a non-letter or end of word;
  - books 1-esdras… (the Apocrypha list in `slugs.ts`) have `supplied: false`; the 66 do not.
- [ ] **Step 4: Run** `npx vitest run scripts/kjv1611.corpus.test.ts` — expect FAIL.
- [ ] **Step 5: Implement** `slugs.ts` (map every `static/data/kjv/*.json` slug; check each by comparing chapter counts against the source) and `build.ts`:
  - books with equal verse counts: map 1:1 by chapter/verse;
  - Daniel (kjv: 3 has 98 verses incl. Song of the Three; 13 Susanna; 14 Bel) and Esther (kjv: 16 chapters, Vulgate order): assemble from source Daniel/Esther + aruljohn additions using `alignVerses` against `kjv/` modern text; fail loudly on any kjv verse with no match;
  - Apocrypha from aruljohn, `&thorn;` handled by `placeAbbreviations` against itself;
  - abbreviations for the 66 via `placeAbbreviations(base, aruljohnVerse)`;
  - `applyLongS` with the evidence policy (empty until Task 4).
- [ ] **Step 6: Run** `npx tsx scripts/kjv1611/build.ts` then the corpus test — expect PASS. Check printed unplaced-abbreviation total is < 1% of placed; list them in the commit message if any.
- [ ] **Step 7: Commit** scripts + `static/data/kjv-1611/` — `data(kjv-1611): build 1611-spelling KJV with Apocrypha, yͤ/yͭ, rule-based ſ`.

### Task 3: Page images + Tesseract

**Files:**
- Create: `scripts/kjv1611/fetch-pages.ts`, `scripts/kjv1611/ocr.ts`

**Interfaces:**
- Produces: `~/facsimiles/kjv-1611/pages/<Book>-Chapter-<c>-<n>.webp` and `~/facsimiles/kjv-1611/ocr/<same>.tsv` (Tesseract TSV, `eng`, image upscaled 3× with `magick -resize 300%`, `--psm 1`), plus `~/facsimiles/kjv-1611/pages/index.json`: `{ "<site slug>/<chapter>": ["<file>", ...] }`.

- [ ] **Step 1:** Probe the URL scheme on kingjamesbibleonline.org (`/1611-Bible-KJV/webp/<Book>-Chapter-<c>-<n>.webp`): find the site's book names (e.g. try `1-Samuel`, `1-Kings`) and whether `<n>` counts pages within a chapter (fetch n=1,2,… until 404). Record findings at the top of `fetch-pages.ts`.
- [ ] **Step 2:** Implement `fetch-pages.ts` per Global Constraints (rate, cache). Run on Genesis only; expect page files and an index entry per Genesis chapter.
- [ ] **Step 3:** Implement `ocr.ts` (skip pages with an existing TSV). Run on Genesis; spot-check one TSV has words with `conf` > 0.
- [ ] **Step 4:** Run both for all books in the background (resumable). Expected ~1,500+ pages.
- [ ] **Step 5: Commit** the two scripts — `feat(kjv-1611): fetch 1611 page images and OCR them locally`.

### Task 4: ſ evidence, calibration, apply

**Files:**
- Create: `scripts/kjv1611/evidence.ts`, `scripts/kjv1611/calibrate.ts`
- Create: `docs/audits/kjv-1611-long-s.md`
- Modify: `static/data/kjv-1611/*.json` (regenerated)

**Interfaces:**
- Consumes: Task 1 `tokenize`/`normalizeWord`; Task 3 OCR TSV + index; Task 2 `build.ts --evidence`.
- Produces:
  - `evidence.ts` → `~/facsimiles/kjv-1611/long-s-evidence.tsv` columns `slug chapter verse offset word ocr verdict` where `verdict ∈ long|round|none`; OCR l/f/ſ at the s position ⇒ long, s ⇒ round, unaligned ⇒ none. Alignment: per chapter, sequence-align OCR words to verse tokens on `normalizeWord` with OCR-confusable folding (ſ/l/f→s, for comparison only).
  - Also writes `~/facsimiles/kjv-1611/cluster-policy.json`: `{ "OT"|"APOC"|"NT": ClusterPolicy }` by majority verdict per cluster per section (require ≥ 20 observations, else leave undecided).
  - `build.ts --evidence` uses section policy, then per-word overrides where OCR verdict disagrees with rule and Tesseract `conf ≥ 80`.
  - `calibrate.ts` fetches Wikisource proofread Bible pages (`Page:BibleKJV1611-0NN.pdf/*`, quality ≥ 3, via `action=query&prop=revisions`, cached in `~/facsimiles/kjv-1611/wikisource/`), strips templates, aligns to kjv-1611 words, reports ſ agreement for rule-only vs final output.

- [ ] **Step 1:** Implement `evidence.ts`; run on Genesis; print counts per verdict. Expect `long` dominating non-final s.
- [ ] **Step 2:** Implement `calibrate.ts`; run against the Task 2 (rule-only) output; record numbers.
- [ ] **Step 3:** Run `evidence.ts` on all books, then `build.ts --evidence=…`, then `calibrate.ts`. Pass: final agreement ≥ 99.5% on the Wikisource words. If below, inspect disagreements and adjust thresholds (not per-word hand edits).
- [ ] **Step 4:** Write `docs/audits/kjv-1611-long-s.md`: method, cluster policy table per section, calibration numbers (before/after), and the conflict list (words where rule and OCR disagree but conf < 80), for the user to check by eye.
- [ ] **Step 5: Run** `npx vitest run scripts/kjv1611.corpus.test.ts` — PASS.
- [ ] **Step 6: Commit** scripts, audit, regenerated data — `data(kjv-1611): place ſ from 1611 page OCR evidence`.

### Task 5: App wiring

**Files:**
- Modify: `src/lib/data/loader.ts` (`loadTranslationBook`, ~line 447)
- Modify: `src/lib/components/BibleReader.svelte:74`, `src/routes/[translation]/[book]/[chapter]/+page.ts:40`, `src/lib/components/VerseTooltip.svelte:110`
- Modify: `src/lib/stores/compare.ts` (new entry after `kjv`), `src/routes/compare/[book]/[chapter]/+page.ts` (load + psalm remap for `kjv-orig`)
- Modify (if needed): `src/app.html:52-75`, `scripts/prepare-data.ts`
- Test: `tests/unit/loader-spelling.test.ts`, `tests/unit/compare-store.test.ts`, `tests/unit/compare-page.test.ts`

**Interfaces:**
- Produces: `loadTranslationBook(id: string, slug: string, fetch, spelling: Spelling = 'modern'): Promise<TranslationBook>` — when `id === 'kjv' && spelling === 'original'`, fetches `/data/kjv-1611/<slug>.json`, falling back to `kjv` on non-OK; cache key includes spelling. `SPELLING_DIRS: Record<string, string> = { kjv: 'kjv-1611' }` exported for reuse.

- [ ] **Step 1: Write failing tests:**
  - loader: original spelling fetches `/data/kjv-1611/genesis.json`; on 404 resolves with `/data/kjv/genesis.json` content; modern never touches kjv-1611; `knox` + original fetches `/data/knox/...`.
  - compare store: a `kjv-orig` entry exists with the Global Constraints values.
  - compare page: psalms chapter loads `kjv-orig` rows with the same remap as `kjv` (row for DR Ps 9 pulls 1611 Ps 9+10 like kjv does).
- [ ] **Step 2: Run** `npx vitest run tests/unit/loader-spelling.test.ts tests/unit/compare-store.test.ts tests/unit/compare-page.test.ts` — FAIL.
- [ ] **Step 3: Implement.** Pass `get(prefs).spelling` at the three call sites. In BibleReader, make the existing spelling-sync path (`syncSpelling`, ~line 447) re-fetch translation books too, not only the ODR. Check `app.html`'s pending-class script applies on `/kjv/` routes; extend if it is ODR-only. If `prepare-data.ts` enumerates data dirs for a manifest, add `kjv-1611`.
- [ ] **Step 4: Run** the tests — PASS; then `npm test` and `npm run check` — no new failures.
- [ ] **Step 5: Manual check:** `npx vite dev`, open `/kjv/genesis/1?spelling=original` → "God ſaid", supplied words styled; toggle spelling in Reading options → text swaps without losing scroll; `/kjv/john/3?spelling=original` v16 shows "yͤ world"; `/compare/psalms/9` shows KJV-Orig column.
- [ ] **Step 6: Commit** the modified files — `feat: original spelling toggle and compare column for the KJV (1611)`.

### Task 6: Fonts, copy, credits

**Files:**
- Modify: `src/lib/data/fonts.ts` (only if a fallback is needed), `src/routes/about/features/+page.svelte`, the about/sources page that credits data sources (find where ODR/Sancta sources are credited).

- [ ] **Step 1:** In dev, check `yͤ`, `yͭ`, `ſ` in each original-spelling font option on `/kjv/john/3?spelling=original`. If any shows tofu or a detached mark, add a fallback font with combining-mark support to that stack in `fonts.ts`.
- [ ] **Step 2:** Features page: one line — the KJV can be read in its 1611 spelling (long s, printer's abbreviations, supplied words in roman type); the Apocrypha has no supplied-word marking.
- [ ] **Step 3:** Credit aruljohn/Bible-kjv-1611 and kingjamesbibleonline.org page images (OCR evidence) where other sources are credited.
- [ ] **Step 4: Run** `npm run check && npm run lint` — clean.
- [ ] **Step 5: Commit** — `docs: credit KJV 1611 sources and describe the spelling switch`.
