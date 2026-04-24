# Tech Debt & Performance Audit -- Findings

**Date:** 2026-04-24
**Agents:** 4 parallel (Performance/Lighthouse, Code Review, Architecture, Linkify)
**Throttling:** Slow 3G + 4x CPU slowdown

---

## P0 -- Fix Now

These are measured, confirmed bottlenecks causing real user-facing slowness or broken behavior.

| # | Finding | Evidence | File(s) | Fix |
|---|---------|----------|---------|-----|
| 1 | **No virtualization: all 311 entries rendered at once** -- SSR produces 884KB HTML, hydration blocks main thread for 11 seconds, 39K DOM nodes (recommended max: 1,500) | LCP 4.0s, TBT 11.9s, wall clock 27.1s on Slow 3G | `FathersCommentaryPanel.svelte:480-489` | Implement windowed/virtual scrolling -- render only ~20 visible entries. SSR renders skeleton or first batch only (~30-50KB HTML). Eliminates 11s long task, drops DOM to ~8K nodes |
| 2 | **Sequential fetch waterfall** -- `loadBook` and `loadFathersChapter` awaited serially in the load function | Adds 200-500ms per navigation (measured: TTFB 4,091ms on throttled) | `fathers/[book]/[chapter]/+page.ts:23-27` | Use `Promise.all([loadBook(...), loadFathersChapter(...)])` -- one-line fix |
| 3 | **`cleanVerseText` hides `$prefs.showSmallCaps` dependency** -- correctness bug | Store read inside function call, invisible to Svelte reactivity tracker; toggling preference doesn't update verse display | `FathersVerseList.svelte:94-99` | Pass `$prefs.showSmallCaps` as explicit parameter at call site |

---

## P1 -- Fix This Session

Clear issues with bounded fixes. Ordered by impact. Items 4-7 are independent and can run as parallel agents.

| # | Finding | Evidence | File(s) | Fix |
|---|---------|----------|---------|-----|
| 4 | **CLS 0.466 on /odr/john/1** -- content shifts as annotations load | Far above the 0.1 "good" threshold; affects main reader route, every user | `/odr/[book]/[chapter]` route | Reserve space for annotation badges with CSS min-height or skeleton placeholders |
| 5 | **`normalizeForParser` rebuilds ~120 RegExp objects on every call** | O(120) regex compilations per `<i>` segment, called from every linkifyItalicRefs invocation | `crossRefParser.ts:958-1018` | Pre-compile patterns into frozen `Array<[RegExp, string]>` at module load |
| 6 | **`fathersChapterCache` returns empty object on failure instead of null** -- caches permanently | Masks transient failures; UI cannot distinguish "no data" from "fetch failed" | `loader.ts:310-318` | Return `null` on non-200 (matching other loaders), evict on non-404 errors |
| 7 | **`about/stats` modal doesn't reset `body.overflow` on destroy** | Navigation away while modal open leaves page non-scrollable | `about/stats/+page.svelte:35-39` | Add `document.body.style.overflow = ''` to onDestroy |

## Deferred to Follow-up (post-virtualization)

These were originally P1 but depend on or are made less impactful by virtualization (P0-1):

| # | Finding | Reason deferred |
|---|---------|-----------------|
| -- | `linkifyBareRefs` called 311 times during hydration | Virtualization reduces to ~20 calls; memoize later if still needed |
| -- | `linkifyItalicRefs` re-runs on re-render, no memoization | Same -- 15x less impactful after virtualization |
| -- | `getAuthorMeta` 4x / `entryMatches` 2x per entry per render | Must be sequenced after virtualization (touches same files/reactive blocks) |
| -- | Homepage preloads genesis.json (332KB) eagerly | Independent but lower impact than session scope allows |
| -- | `VerseTooltip` fires `loadBook` on every hover | Low frequency, bounded by module-level cache in loader.ts |
| -- | `FathersVerseList` loads alt translation without AbortController | Low frequency, no user-visible bug |

---

## P2 -- Plan for Later

| # | Finding | File(s) | Fix approach |
|---|---------|---------|--------------|
| 14 | `paragraphs.ts` (28KB) statically bundled into every ODR page | `paragraphs.ts` | Convert to per-book dynamic JSON sidecar |
| 15 | FathersCommentaryPanel is 531 lines mixing 4 concerns | `FathersCommentaryPanel.svelte` | Full decomposition per Agent 2 plan (6 files) |
| 16 | `annotatedPericopes` spreads every pericope on verse selection | `FathersCommentaryPanel.svelte:202-206` | Compute `verseInRange` inline in template |
| 17 | `filteredCounts` dispatch re-runs on every reactive invalidation | `FathersCommentaryPanel.svelte:209-228` | Named reactive variable + equality check |
| 18 | Duplicated tooltip hover/unhover pattern in 2 components | `FathersCommentaryPanel.svelte`, `ChapterView.svelte` | Extract `createVerseRefTooltip()` utility or Svelte action |
| 19 | Author dropdown has no click-outside-to-close | `FathersCommentaryPanel.svelte:347-419` | Add svelte:window click handler |
| 20 | `FathersEntryCard` 9999px max-height animation | `FathersEntryCard.svelte:88` | Replace with `transition:slide` or targeted CSS |
| 21 | `FathersReader` uses fixed `calc(100vh - 100px)` | `FathersReader.svelte:34` | Use flex-1 + min-h-0 layout |
| 22 | `ABOUT_NAV` duplicated across 4 about pages | All about pages | Extract to shared `src/routes/about/nav.ts` |
| 23 | Unbounded caches (11 Maps, no eviction) | `loader.ts` | Add LRU cap on fathersChapterCache |
| 24 | Inconsistent error handling across loaders | `loader.ts` | Standardize pattern |
| 25 | Wasted bytes: `isDocument: false` / `fkbChapter: null` in fathers JSON | All fathers JSON | Omit defaults in build, parse on client |
| 26 | 26 prerender 301s from legacy reference route (intentional, noisy) | `reference/[testament]/[slug]/+page.ts` | Move to Cloudflare `_redirects` file |
| 27 | `summaryHtml` reactive recomputes on any `$prefs` change | `ChapterView.svelte:95-98` | Hoist `isStudyMode` to derived variable |
| 28 | `findDrcRefs` O(n*m) per-character scan | `crossRefParser.ts:1880-1901` | Track `nextSkipEnd` to skip covered ranges |
| 29 | `$studyPanel.annotatedVerse` inside `{#each}` triggers 176 re-evals per scroll | `VerseList.svelte:527-530` | Pull into local `$:` derived variable |
| 30 | `tokenizeCrossRef` iterates 300+ abbrevs per position | `crossRefParser.ts:610-698` | Pre-build first-char index or trie |
| 31 | `linkifyBareRefs` in reference page runs tokenizer inside `{@html}` | `crossRefParser.ts:1097-1115` | Pre-process during load(), not in template |
| 32 | Shared stateful `g`-flag regex (latent concurrency bug) | `crossRefParser.ts:1252-1266` | Construct regex inside function |
| 33 | `stripTrailingCrossRefs` heuristic edge case | `ChapterView.svelte:103-123` | Tighten heuristic (require digit/period) |
| 34 | `chipClass` generates long inline strings every render | `FathersCommentaryPanel.svelte:230-236` | Extract base classes to const |

---

## Hypotheses -- Resolved

| Hypothesis | Result |
|------------|--------|
| 386KB JSON is the bottleneck | **Partially confirmed.** The JSON itself compresses to ~117KB gzipped. The real issue is the 884KB SSR HTML (all entries rendered server-side) + client re-fetch of the same data. |
| No virtualization causes jank | **Confirmed.** 39K DOM nodes, 11s hydration task, 3.4s layout duration. |
| Build 404s from fathers manifest | **Rejected.** Manifest and data files are perfectly in sync (1,165 = 1,165). Build 404s come from annotation sidecar fetches during prerender (benign). |
| 301 redirects from stale internal links | **Rejected.** Redirects are intentional legacy URL preservation. No internal links use old format. |
| Linkify is a real performance problem | **Confirmed.** `linkifyBareRefs` runs 311 times during hydration with 120-regex recompilation per call, contributing to the 11s long task. Memoization missing in multiple components. |

---

## Implementation Priority -- This Session

7 items. Virtualization first (other fixes depend on it), then parallel agents for independent fixes.

| Order | # | Finding | Effort | Dependencies |
|-------|---|---------|--------|--------------|
| 1 | P0-1 | Virtualization of commentary list | Large | None -- do first |
| 2 | P0-2 | `Promise.all` fetch waterfall | One line | None -- parallel with 3-7 |
| 3 | P0-3 | `cleanVerseText` reactivity bug | Small | None -- parallel |
| 4 | P1-4 | CLS 0.466 on /odr/john/1 | Medium | None -- parallel |
| 5 | P1-5 | Pre-compile normalizeForParser regexes | Small | None -- parallel |
| 6 | P1-6 | fathersChapterCache error handling | Small | None -- parallel |
| 7 | P1-7 | Modal body overflow on destroy | Trivial | None -- parallel |

Items 2-7 can all run as parallel agents after item 1 completes.
