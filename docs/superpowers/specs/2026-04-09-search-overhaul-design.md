# Search Engine Overhaul — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the SpotlightSearch modal with a dedicated `/search` page that parses Bible verse references and displays full verse text inline.

**Scope:** Reference-based search only. Full-text word search and compare-from-search are explicitly deferred.

---

## 1. Architecture

The search page is a single client-side route at `/search`. No server endpoints, no new data sources.

**Flow:**
1. User types a query (e.g., `Matt 3:2-12, John 5:1-6`) into the search bar
2. `bcv_parser` (from `bible-passage-reference-parser`, already installed) parses input into OSIS references
3. OSIS references are split into individual verse lookups grouped by book
4. `loadBook()` fetches the relevant book JSON files (cached in memory after first load)
5. Verses are extracted and rendered as a continuous list with book/chapter headings
6. `bible-reference-formatter` formats OSIS back into readable headings

**Key files:**
- `src/routes/search/+page.svelte` — the search page (replaces current placeholder)
- `src/lib/search/reference.ts` — already has `bcv_parser` setup, extend with verse extraction logic
- `src/lib/search/resolve.ts` — existing OSIS-to-slug mapping
- `src/lib/data/loader.ts` — existing `loadBook()` / `getCachedBook()`, no changes needed
- `src/lib/data/books.ts` — 76 books with BookMeta (slug, odrName, modernName, testament, chapters)
- Delete `src/lib/components/SpotlightSearch.svelte`

**New dependency:** `bible-reference-formatter` (npm) — for converting OSIS to readable reference strings with ODR book names via `setBooks()`.

---

## 2. Search Input & URL State

The search bar is the hero element at the top of `/search`.

- Query stored in URL as `?q=` parameter — results are shareable and bookmarkable
- On page load, if `?q=` is present, auto-parse and show results immediately
- Typing updates results live after ~300ms debounce
- Enter key also triggers search
- URL updates via `replaceState` (no history spam)
- Empty input shows placeholder state with example queries:
  - "Matthew 16:18"
  - "John 6:53-56"
  - "Luke 1:28, Revelation 12:1"

**Header integration:**
- Search icon in TopBar and CompareBar becomes `<a href="/search">`
- `Cmd+K` and `/` keyboard shortcuts navigate to `/search` and auto-focus the input
- SpotlightSearch component is deleted entirely

---

## 3. Parser & Formatter Integration

**Parsing (input to OSIS):**
- `bcv_parser` handles all common name variants: "Matt", "Matthew", "Mt", "1 Cor", "1 Corinthians", "Rev", "Revelation", "Apoc", etc.
- Handles Deuterocanonical books (Sirach, Wisdom, Tobit, etc.)
- Multi-reference queries with commas, semicolons, and ranges all work natively
- Existing setup in `src/lib/search/reference.ts` already configures this
- Handles regular/modern book names out of the box

**Formatting (OSIS to display heading):**
- `bible-reference-formatter` converts OSIS back to readable text
- Customize with `setBooks()` to use ODR book names (matching `bookMeta.odrName`)

**Verse extraction:**
- Parse OSIS output into book/chapter/verse ranges
- Map OSIS book codes to app slugs using existing mapping in `resolve.ts`
- Call `loadBook(slug)` for each book, extract specific verses from chapter data

---

## 4. Results Display

Results render as a single continuous list, grouped by reference range (BibleGateway-style).

**Layout for each group:**
- **Heading** — formatted reference from `bible-reference-formatter`, styled as a subtle section header. Clickable — navigates to that chapter in reading mode.
- **Verses** — each verse on its own line with verse number + full ODR text, same font/styling as the reading page (`font-reader`, `--font-size-reader`)
- **"Read full chapter" link** — at the bottom of each reference group, links to the chapter in reading mode
- Light divider between groups when multiple references are in one query

**Only ODR text** is shown (the only live translation). No translation selector.

**Edge cases:**
- Invalid input (e.g., "hello world") — gentle message: "No references found. Try a verse like James 2:24"
- Chapter-only reference (e.g., "Matt 3") — show entire chapter
- Out-of-range verses — `bcv_parser` clamps to valid range automatically

---

## 5. SpotlightSearch Removal

- Delete `src/lib/components/SpotlightSearch.svelte`
- Remove all imports and keyboard listener registrations from layout/header components
- Search icon in TopBar/CompareBar becomes `<a href="/search">`
- Preserve keyboard shortcuts (`Cmd+K`, `/`) — navigate to `/search` and auto-focus input via a small event listener in layout or search page

---

## 6. Future Scope (Not This Spec)

- **Full-text word search** — search across all verse text for keywords
- **Compare from search** — verse-level comparison with stacked vertical layout (requires compare page expansion with chapter/verse toggle)
- **Cross-reference linking** — making cross-refs in study mode clickable using the reference formatter
