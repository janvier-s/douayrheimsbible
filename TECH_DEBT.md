# Technical Debt

Items deferred from the March 2026 code review. Criticals and quick wins have been resolved.

**Resolved since initial filing:** M-2, M-3, M-5, M-6, M-7, M-8, M-9, M-10, M-11, M-12, M-13

---

## Medium Items

### M-1 — Svelte 5 runes migration

**File:** All `.svelte` files
**Issue:** The project uses `svelte: ^5.51.0` but all components use Svelte 4 syntax (`export let`, `$:`, `on:click`, writable stores). Svelte 4 compatibility mode works but runes unlock better performance and tree-shaking.
**Action:** Migrate incrementally — start with leaf components (VerseList, CompareBar chips), then stores (`prefs`, `compare`, `reading`). Use `svelte-migrate` CLI.
**Effort:** ~2 sprints

### M-3 — Infinite scroll cleanup

**File:** `src/routes/odr/[book]/[chapter]/[[verse]]/+page.svelte`
**Issue:** `IntersectionObserver` sentinel elements and cleanup logic are inline in the page component, making it large and hard to test.
**Action:** Extract to a `useInfiniteScroll` function/store, unit-testable in isolation.
**Effort:** 3–4 hours

### M-4 — Search: replace Pagefind with edge-compatible solution

**File:** `src/lib/components/SearchBar.svelte`
**Issue:** Pagefind relies on a static index built at deploy time. When content updates, the index must be rebuilt. Also relies on `window.PageFind` global which is unavailable in SSR.
**Action:** Evaluate Orama (runs in-process, SSR-compatible) or keep Pagefind with an explicit SSR guard and scheduled rebuild in CI.
**Effort:** 1 day

### M-5 — `readingPosition` store: server/client desync

**File:** `src/lib/stores/reading.ts`, `src/routes/+layout.svelte`
**Issue:** `readingPosition` is reset on every navigation from layout params, then set again from `onMount`. This causes a two-phase update and can flash the wrong chapter label during navigation.
**Action:** Drive label entirely from `$page.params` without a writable store, or derive it purely in the layout via a reactive statement.
**Effort:** 2–3 hours

---

## Large Items

### L-1 — Svelte 5 runes migration (full)

Full migration of all components and stores to `$state`, `$derived`, `$effect`, and the new event syntax. See M-1 for incremental path.
**Effort:** 3–5 days

### L-2 — DRC + Knox data pipeline

Add the Douay-Rheims Challoner (1752) and Knox (1955) translation data, set `live: true` in `compare.ts`, and implement the compare route `load` function to fetch the additional translation JSON.
**Effort:** 2–4 days (data acquisition and normalisation)

### L-3 — Full-text search rebuild with Orama

Replace Pagefind with Orama for in-process, SSR-compatible search with facets (book, testament, translation). Includes index-build script and updated `SearchBar` component.
**Effort:** 2–3 days

### L-4 — E2E test suite (Playwright)

Add Playwright tests for: reading navigation, compare mode column toggling, search, infinite scroll trigger, theme switching. Currently there are only unit tests.
**Effort:** 2–3 days

### L-5 — Internationalisation / Latin Vulgate display

The Vulgate translation (`vul`) will need RTL-adjacent rendering concerns resolved (Latin word order, no verse numbers in the original, etc.) and a dedicated font stack.
**Effort:** 1–2 days (design + implementation)
