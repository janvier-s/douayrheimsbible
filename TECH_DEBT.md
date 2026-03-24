# Technical Debt

Items deferred from the March 2026 code review. Criticals and quick wins have been resolved.

---

## Medium Items

### M-1 — Svelte 5 runes migration
**File:** All `.svelte` files
**Issue:** The project uses `svelte: ^5.51.0` but all components use Svelte 4 syntax (`export let`, `$:`, `on:click`, writable stores). Svelte 4 compatibility mode works but runes unlock better performance and tree-shaking.
**Action:** Migrate incrementally — start with leaf components (VerseList, CompareBar chips), then stores (`prefs`, `compare`, `reading`). Use `svelte-migrate` CLI.
**Effort:** ~2 sprints

### M-2 — Header height magic numbers
**Files:** `CompareBar.svelte`, `TopBar.svelte`, `+page.svelte` (compare route)
**Issue:** `top-[110px]`, `top-[90px]` offsets are hardcoded in multiple places. If either bar row height changes, all three files need updating.
**Action:** Extract to a CSS custom property (e.g. `--topbar-height: 110px`) set once in `app.css` or the layout, then reference `top-[var(--topbar-height)]` everywhere.
**Effort:** 1–2 hours

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

### M-6 — Compare store: `visible` Set is not localStorage-persisted
**File:** `src/lib/stores/compare.ts`
**Issue:** The set of visible translations resets to `{odr, drc}` on every page load. Users who picked a different set lose their choice on navigation.
**Action:** Persist `visible` and `order` to `localStorage` (same pattern as `prefs` store).
**Effort:** 2–3 hours

### M-7 — Missing `@types/dompurify` awareness
**File:** `src/lib/components/VerseList.svelte`, `ChapterView.svelte`
**Issue:** `isomorphic-dompurify` bundles its own types, but `DOMPurify.sanitize` config options are typed as `Config` — verify the `ALLOWED_TAGS`/`ALLOWED_ATTR` options match the actual runtime behaviour by adding a smoke test.
**Action:** Add a unit test asserting that `renderVerse` strips disallowed tags and that `<span class="sc">` passes through.
**Effort:** 1 hour

### M-8 — No error boundary / 404 handling for bad slugs
**Files:** `src/routes/odr/[book]/[chapter]/+page.ts`, compare route
**Issue:** If someone navigates to `/odr/nonexistent/99`, the loader crashes with an unhandled rejection. There is no `+error.svelte` page.
**Action:** Add `src/routes/+error.svelte`, and add `error(404, ...)` throws to the loaders when `getBookBySlug` returns null or chapter is out of range.
**Effort:** 2 hours

### M-9 — `ReadingPrefs` component: no type-safe store update
**File:** `src/lib/components/ReadingPrefs.svelte`
**Issue:** Some prefs are mutated directly on the spread object rather than through the typed `prefs.update()` method, risking a stale-update bug.
**Action:** Audit all `$prefs` writes and ensure they go through `prefs.update(p => ({ ...p, key: val }))`.
**Effort:** 1 hour

### M-10 — `FloatingNav`: keyboard trap not implemented
**File:** `src/lib/components/FloatingNav.svelte`
**Issue:** The floating nav is a modal-like overlay but does not trap keyboard focus. Screen reader users can tab past it into obscured background content.
**Action:** Add a focus trap (Svelte `use:focusTrap` action or `focus-trap` library). Also add `Escape` key handler to close.
**Effort:** 2 hours

### M-11 — No CSP headers
**File:** `static/_headers` (does not exist yet)
**Issue:** No `Content-Security-Policy` header is set. Combined with the `{@html}` sanitization added in C-1, this is defence-in-depth.
**Action:** Add a `static/_headers` file for Cloudflare Pages with a strict CSP that allows Google Fonts and self.
**Effort:** 1–2 hours

### M-12 — `prefs` store: `bionicReading` + `text-vide` bundle size
**File:** `src/lib/components/VerseList.svelte`
**Issue:** `text-vide` is imported unconditionally and included in every page bundle, even for users who never enable bionic reading.
**Action:** Lazy-import `text-vide` inside the `applyBionic` function branch, or use a dynamic `import()` triggered on first enable.
**Effort:** 1 hour

### M-13 — Compare page: "Soon" badge translations have invisible placeholder text
**File:** `src/routes/compare/[book]/[chapter]/+page.svelte` lines 164–170
**Issue:** Non-live translation cells render invisible verse text to preserve row height. This invisible text is still in the DOM and can be selected/copied, leaking "placeholder" content.
**Action:** Use `aria-hidden="true"` on the invisible spans; consider `min-height` approach instead of duplicate text.
**Effort:** 30 minutes

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
