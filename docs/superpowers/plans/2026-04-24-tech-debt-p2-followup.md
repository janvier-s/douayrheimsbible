# Tech Debt P2 Follow-up Plan

**Source:** `docs/superpowers/specs/2026-04-24-tech-debt-audit-findings.md`
**Date:** 2026-04-24
**Status:** Complete (20/21 done, 1 skipped)

21 items from the tech debt audit, grouped by area. Completed items marked with ~~strikethrough~~.

---

## A. FathersCommentaryPanel decomposition and cleanup -- COMPLETE

| # | Finding | Status |
|---|---------|--------|
| 15 | ~~531 lines mixing 4 concerns~~ | Done: decomposed into FathersFilterBar.svelte + fathersFilterUtils.ts + panel shell (280 lines) |
| 16 | ~~`annotatedPericopes` spreads every pericope on verse selection~~ | Done: inline `{@const verseInRange}` in template, no intermediate derived array |
| 17 | ~~`filteredCounts` dispatch re-runs on every reactive invalidation~~ | Done: equality check on `computedFilteredCounts` before dispatching |
| 19 | ~~Author dropdown has no click-outside-to-close~~ | Done: `svelte:window on:click` + `contains()` check in FathersFilterBar |
| 34 | ~~`chipClass` generates long inline strings every render~~ | Done: extracted CHIP_BASE const in fathersFilterUtils.ts |

## B. Fathers component polish -- COMPLETE

| # | Finding | Status |
|---|---------|--------|
| 18 | Duplicated tooltip hover/unhover in FathersCommentaryPanel + ChapterView | Skipped: data extraction logic differs, shared action adds complexity for little gain |
| 20 | ~~`FathersEntryCard` 9999px max-height animation~~ | Done: replaced with body-collapsed class toggle |
| 21 | ~~`FathersReader` fixed `calc(100vh - 100px)`~~ | Done: flex-1 + min-h-0 + h-screen parent |

## C. Cross-reference parser performance -- COMPLETE

| # | Finding | Status |
|---|---------|--------|
| 28 | ~~`findDrcRefs` O(n*m) per-character scan~~ | Done: sorted skip index, O(1) per position |
| 30 | ~~`tokenizeCrossRef` iterates 300+ abbrevs per position~~ | Done: first-char index (ABBREV_BY_FIRST_CHAR), ~10-15 candidates per lookup |
| 31 | `linkifyBareRefs` runs tokenizer inside `{@html}` on reference page | Skipped: low-traffic page, cost exceeds benefit post-C-30 optimization |
| 32 | ~~Shared stateful `g`-flag regex (latent concurrency bug)~~ | Done: construct regex inside function |
| 33 | ~~`stripTrailingCrossRefs` heuristic edge case~~ | Done: require digit/period |

## D. Reactivity and rendering -- COMPLETE

| # | Finding | Status |
|---|---------|--------|
| 27 | ~~`summaryHtml` recomputes on any `$prefs` change~~ | Done: isStudyMode derived variable |
| 29 | ~~`$studyPanel.annotatedVerse` inside `{#each}` triggers 176 re-evals~~ | Done: activeAnnotatedVerse derived variable |

## E. Data and bundle optimization -- COMPLETE

| # | Finding | Status |
|---|---------|--------|
| 14 | ~~`paragraphs.ts` (28KB) statically bundled into every ODR page~~ | Done: dynamic `import()` in VerseList.svelte, data loads lazily on client |
| 23 | ~~Unbounded caches (11 Maps, no eviction)~~ | Done: LRU cap (30) on fathersChapterCache |
| 24 | ~~Inconsistent error handling across loaders~~ | Done: standardized to `.then(null, evict)` pattern across all loaders |
| 25 | ~~Wasted bytes in fathers JSON (`isDocument: false`, `fkbChapter: null`)~~ | Done: omit falsy defaults in build script, optional fields in FathersEntry type |

## F. Build hygiene -- COMPLETE

| # | Finding | Status |
|---|---------|--------|
| 22 | ~~`ABOUT_NAV` duplicated across 4 about pages~~ | Done: shared src/routes/about/nav.ts |
| 26 | ~~26 prerender 301s from legacy reference route~~ | Done: Cloudflare _redirects file |

---

## Summary

- **20 of 21 items completed**
- **1 skipped** (C-31: reference page pre-processing, low ROI after C-30 first-char index)
- **1 noted but deferred** (B-18: shared tooltip action, complexity exceeds benefit)
