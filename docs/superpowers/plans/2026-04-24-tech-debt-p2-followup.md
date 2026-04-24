# Tech Debt P2 Follow-up Plan

**Source:** `docs/superpowers/specs/2026-04-24-tech-debt-audit-findings.md`
**Date:** 2026-04-24
**Status:** Mostly complete

21 items from the tech debt audit, grouped by area. Completed items marked with ~~strikethrough~~.

---

## A. FathersCommentaryPanel decomposition and cleanup

| # | Finding | Status |
|---|---------|--------|
| 15 | ~~531 lines mixing 4 concerns~~ | Done: decomposed into FathersFilterBar.svelte + fathersFilterUtils.ts + panel shell (280 lines) |
| 16 | `annotatedPericopes` spreads every pericope on verse selection | Remaining |
| 17 | `filteredCounts` dispatch re-runs on every reactive invalidation | Remaining |
| 19 | Author dropdown has no click-outside-to-close | Remaining |
| 34 | ~~`chipClass` generates long inline strings every render~~ | Done: extracted CHIP_BASE const in fathersFilterUtils.ts |

## B. Fathers component polish

| # | Finding | Status |
|---|---------|--------|
| 18 | Duplicated tooltip hover/unhover in FathersCommentaryPanel + ChapterView | Skipped: data extraction logic differs, shared action adds complexity for little gain |
| 20 | ~~`FathersEntryCard` 9999px max-height animation~~ | Done: replaced with body-collapsed class toggle |
| 21 | ~~`FathersReader` fixed `calc(100vh - 100px)`~~ | Done: flex-1 + min-h-0 + h-screen parent |

## C. Cross-reference parser performance

| # | Finding | Status |
|---|---------|--------|
| 28 | ~~`findDrcRefs` O(n*m) per-character scan~~ | Done: sorted skip index, O(1) per position |
| 30 | `tokenizeCrossRef` iterates 300+ abbrevs per position | Remaining: pre-build first-char index or trie |
| 31 | `linkifyBareRefs` runs tokenizer inside `{@html}` on reference page | Remaining: pre-process during load() |
| 32 | ~~Shared stateful `g`-flag regex (latent concurrency bug)~~ | Done: construct regex inside function |
| 33 | ~~`stripTrailingCrossRefs` heuristic edge case~~ | Done: require digit/period |

## D. Reactivity and rendering -- COMPLETE

| # | Finding | Status |
|---|---------|--------|
| 27 | ~~`summaryHtml` recomputes on any `$prefs` change~~ | Done: isStudyMode derived variable |
| 29 | ~~`$studyPanel.annotatedVerse` inside `{#each}` triggers 176 re-evals~~ | Done: activeAnnotatedVerse derived variable |

## E. Data and bundle optimization

| # | Finding | Status |
|---|---------|--------|
| 14 | `paragraphs.ts` (28KB) statically bundled into every ODR page | Remaining: convert to per-book dynamic JSON sidecar |
| 23 | ~~Unbounded caches (11 Maps, no eviction)~~ | Done: LRU cap (30) on fathersChapterCache |
| 24 | Inconsistent error handling across loaders | Remaining |
| 25 | Wasted bytes in fathers JSON (`isDocument: false`, `fkbChapter: null`) | Remaining: build pipeline change |

## F. Build hygiene -- COMPLETE

| # | Finding | Status |
|---|---------|--------|
| 22 | ~~`ABOUT_NAV` duplicated across 4 about pages~~ | Done: shared src/routes/about/nav.ts |
| 26 | ~~26 prerender 301s from legacy reference route~~ | Done: Cloudflare _redirects file |

---

## Remaining items (6 of 21)

- A-16, A-17, A-19: minor FathersCommentaryPanel reactive optimizations
- C-30, C-31: tokenizer trie + reference page pre-processing (low impact post-virtualization)
- E-14, E-24, E-25: build pipeline and loader standardization
