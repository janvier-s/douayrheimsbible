# Tech Debt P2 Follow-up Plan

**Source:** `docs/superpowers/specs/2026-04-24-tech-debt-audit-findings.md`
**Date:** 2026-04-24
**Status:** Backlog

21 items from the tech debt audit, grouped by area. Items marked (post-virtualization) were deferred because the P0-1 virtualization fix reduces their impact significantly.

---

## A. FathersCommentaryPanel decomposition and cleanup

These are best done together as one focused session.

| # | Finding | Fix |
|---|---------|-----|
| 15 | 531 lines mixing 4 concerns | Full decomposition into 6 files (filter state, scroll management, tooltip, entry rendering, pericope grouping, panel shell) |
| 16 | `annotatedPericopes` spreads every pericope on verse selection | Compute `verseInRange` inline in template |
| 17 | `filteredCounts` dispatch re-runs on every reactive invalidation | Named reactive variable + equality check |
| 19 | Author dropdown has no click-outside-to-close | Add `svelte:window` click handler |
| 34 | `chipClass` generates long inline strings every render | Extract base classes to const |

## B. Fathers component polish

| # | Finding | Fix |
|---|---------|-----|
| 18 | Duplicated tooltip hover/unhover in FathersCommentaryPanel + ChapterView | Extract `createVerseRefTooltip()` Svelte action |
| 20 | `FathersEntryCard` 9999px max-height animation | Replace with `transition:slide` or targeted CSS |
| 21 | `FathersReader` fixed `calc(100vh - 100px)` | Use flex-1 + min-h-0 layout |

## C. Cross-reference parser performance

These are low-impact after virtualization (15x fewer calls on initial load) but worth addressing if touching crossRefParser.ts for other reasons.

| # | Finding | Fix |
|---|---------|-----|
| 28 | `findDrcRefs` O(n*m) per-character scan | Track `nextSkipEnd` to skip covered ranges |
| 30 | `tokenizeCrossRef` iterates 300+ abbrevs per position | Pre-build first-char index or trie |
| 31 | `linkifyBareRefs` runs tokenizer inside `{@html}` on reference page | Pre-process during load(), not in template |
| 32 | Shared stateful `g`-flag regex (latent concurrency bug) | Construct regex inside function |
| 33 | `stripTrailingCrossRefs` heuristic edge case | Tighten heuristic (require digit/period) |

## D. Reactivity and rendering

| # | Finding | Fix |
|---|---------|-----|
| 27 | `summaryHtml` recomputes on any `$prefs` change | Hoist `isStudyMode` to derived variable |
| 29 | `$studyPanel.annotatedVerse` inside `{#each}` triggers 176 re-evals per scroll | Pull into local `$:` derived variable |

## E. Data and bundle optimization

| # | Finding | Fix |
|---|---------|-----|
| 14 | `paragraphs.ts` (28KB) statically bundled into every ODR page | Convert to per-book dynamic JSON sidecar |
| 23 | Unbounded caches (11 Maps, no eviction) in loader.ts | Add LRU cap on fathersChapterCache |
| 24 | Inconsistent error handling across loaders | Standardize pattern |
| 25 | Wasted bytes in fathers JSON (`isDocument: false`, `fkbChapter: null`) | Omit defaults in build script, parse on client |

## F. Build hygiene

| # | Finding | Fix |
|---|---------|-----|
| 22 | `ABOUT_NAV` duplicated across 4 about pages | Extract to shared `src/routes/about/nav.ts` |
| 26 | 26 prerender 301s from legacy reference route | Move to Cloudflare `_redirects` file |
