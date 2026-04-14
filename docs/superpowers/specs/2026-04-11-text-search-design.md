# Text Search for the ODR Bible

**Date:** 2026-04-11
**Status:** Approved

## Overview

Add a full-text search mode to the existing `/search` page, allowing users to search the Original Douay-Rheims Bible by words and phrases in addition to verse references. The ODR is the only complete online edition of this translation, so users may not know the exact archaic/British spellings -- the search must account for this.

## Architecture: Pre-built MiniSearch Index

A build-time script generates serialized MiniSearch indexes shipped as static JSON files on the CDN. The browser downloads the relevant index on first text search (~1.6 MB gzipped for verses), deserializes it, and all subsequent searches are instant and client-side. No Worker compute cost per search.

### Why MiniSearch

- 0 dependencies, ~7 KB gzipped
- Supports exact phrase search with quotes, prefix matching, boolean AND, exclusion (`-word`)
- Serializable index (`toJSON` / `loadJSON`) for build-time generation
- Custom tokenizer and term processor for the normalization pipeline
- Relevance scoring handles phrase-vs-AND ranking naturally

### Why not alternatives

- **Pagefind:** Pre-rendered page attributes exist but Pagefind indexes HTML pages, not structured verse data. Lacks the verse-level granularity needed for Bible search.
- **Cloudflare Worker search:** ~10 MB of JSON per request, risky under Worker CPU time limits on free tier.
- **Client-side raw loading (all 77 book JSONs):** ~10 MB uncompressed download, too heavy for users.
- **Custom inverted index:** Would require reimplementing phrase search, ranking, prefix matching -- all things MiniSearch provides.

## Search Indexes

Two separate MiniSearch indexes, each lazy-loaded only when needed:

### 1. Verse Text Index (`static/data/odr/search-index.json`)

- ~37,000 documents (one per verse)
- Each document: `{ id: "genesis:1:1", book: "genesis", chapter: 1, verse: 1, text: "stripped verse text" }`
- Estimated size: ~1.6 MB gzipped
- Text is stripped of HTML tags (`<sc>`, `<cr>`, `<na>`, `<i>`) and punctuation-normalized

### 2. Notes & Annotations Index (`static/data/odr/search-notes-index.json`)

- Documents from two sources:
  - Verse notes (`notes` array in each verse object)
  - Annotation sidecars (`/data/odr/{book}/annotations/{chapter}.json`)
- Each document: `{ id: "genesis:1:1:n1", book, chapter, verse, text, type: "note"|"annotation" }`
- Estimated size: ~0.8-1.2 MB gzipped

### MiniSearch Configuration

- **Searchable fields:** `text`
- **Stored fields:** `book`, `chapter`, `verse`, `type` (notes index only)
- **Custom tokenizer:** split on whitespace and punctuation
- **Custom term processor:** lowercase, strip intra-word punctuation (hyphens)
- **Prefix search:** enabled

## Normalization & Query Expansion

The index preserves original ODR text exactly. Normalization happens only on the query side via a curated expansion map.

### Query Expansion Map (`src/lib/search/query-expansions.json`)

A committed JSON file mapping modern/American English words to their ODR equivalents. Examples:

```json
{
  "baptize": ["baptise"],
  "honor": ["honour"],
  "savior": ["saviour"],
  "today": ["to-day"],
  "passover": ["pasch"]
}
```

At query time, if the user types "baptize", MiniSearch searches for both "baptize" and "baptise". The original ODR spelling always works directly since it's in the index.

Estimated size: ~2-3 KB, ~100-200 entries.

### Generation Script (`scripts/generate-expansions.ts`)

A one-time script (not part of regular builds) that:

1. Extracts all unique words from ODR verse text, notes, and annotations (~14,758 unique words)
2. Cross-references against `convert-british-to-american-spellings` npm package for automatic British-to-American pairs
3. Compares remaining words against a modern English word list; flags words not found as "potentially archaic/rare"
4. Outputs two files:
   - Auto-matched pairs (ready to use)
   - Flagged list (for manual review -- add modern equivalents where useful, discard the rest)
5. Merges manual additions with auto-matched pairs into the final `query-expansions.json`

Re-run only when adding new translations or when users report missing mappings.

### What This Does NOT Do

- No lossy normalization of the index
- No regex-based pattern matching that could misfire (e.g., "paradise" staying "paradise")
- No runtime dependency on the 18K-entry spelling library -- only the relevant pairs ship to the client

## Query Engine

Module: `src/lib/search/text-search.ts`

### Flow

1. Normalize query using shared tokenizer (lowercase, strip punctuation)
2. Expand query tokens using `query-expansions.json`
3. Stop word gate: if ALL tokens are stop words, show "Try a more specific search" instead of returning thousands of results
4. Pass query to MiniSearch `search()` with `{ prefix: true, combineWith: 'AND' }`
5. MiniSearch handles: exact phrase (quotes), AND logic, prefix matching (`bapt*`), exclusion (`-word`)
6. Parse result IDs to get book/chapter/verse
7. Fetch needed book JSONs via `loadBook()` for full verse text rendering
8. Sort by MiniSearch relevance score (phrase matches naturally rank higher than AND-only matches)
9. Cap at 100 results; "Show more" button loads next batch
10. Debounced at 300ms

### Matching Behavior

- **Default (no quotes):** tries phrase match first via MiniSearch relevance scoring; AND matches rank lower
- **Quoted (`"thou art Peter"`):** exact phrase only, no AND fallback
- **Prefix (`bapt*`):** matches baptise, baptism, baptized, etc.
- **Exclusion (`grace -law`):** finds "grace" but not in verses also containing "law"
- **Case-insensitive:** always

### Stop Words

Stop words (the, and, of, to, in, that, etc.) remain in the index -- they're needed for phrase matching ("the Lord", "and he said"). But a query consisting entirely of stop words is blocked to prevent returning 27,000+ results.

## UI & Interaction

### Mode Toggle (Top Level)

Two tab-style buttons below the search card: **"Verse Search"** | **"Text Search"**. Active tab gets accent styling. Swapping mode clears results and updates the H1, placeholder, and examples.

### Scope Toggle (Within Text Search)

A smaller secondary toggle appears only in text search mode: **"Verses"** | **"Notes & Annotations"**. Defaults to "Verses".

### URL Structure

`/search?mode=text&scope=verses&q=thou+art+Peter`

- `mode`: `verse` (default, omitted) or `text`
- `scope`: `verses` (default, omitted) or `notes` -- ignored when mode is `verse`
- `q`: the search query

All existing `/search?q=Matthew+16:18` links continue to work (mode defaults to verse search).

### Per-Mode Configuration

| | Verse Search | Text: Verses | Text: Notes |
|---|---|---|---|
| H1 | "Verse Search" | "Text Search" | "Text Search" |
| Placeholder | "e.g. Matthew 16:18" | "e.g. thou art Peter" | "e.g. transubstantiation" |
| Examples | Matthew 16:18, John 6:53-56, Luke 1:28 | thou art Peter, full of grace, daily bread | transubstantiation, original sin |
| Engine | parseAllReferences + buildResultGroups | MiniSearch verse index | MiniSearch notes index |
| No results | "That verse is not found..." | "No verses found matching..." | "No notes found matching..." |

### Result Rendering

**Verse results:** Full verse text with matching words wrapped in `<mark>` (accent-colored background). Grouped by chapter with "Read full chapter" link. Same layout as existing verse search results.

**Notes/annotation results:** Note or annotation text with highlights, labeled with source verse reference (e.g., "Matthew 26:26 -- Annotation"). Clicking navigates to the verse with the study panel open.

### Unchanged Across All Modes

- Search bar appearance and dimensions
- Debounce timing (300ms)
- URL sync with query params
- Keyboard shortcuts (`/` or `Ctrl+K`)
- Loading and empty states with animations
- Reduced motion support
- Screen reader `aria-live` region

## File Structure

### New Files

```
src/lib/search/
  text-search.ts          -- MiniSearch init, query, result formatting
  expand-query.ts         -- loads query-expansions.json, expands tokens
  normalize.ts            -- shared tokenizer/punctuation stripping
  query-expansions.json   -- curated word-pair map (~2-3 KB)

scripts/
  build-search-index.ts   -- builds both MiniSearch indexes (called by prepare-data)
  generate-expansions.ts  -- one-time script to generate query-expansions.json

static/data/odr/
  search-index.json       -- serialized MiniSearch verse index
  search-notes-index.json -- serialized MiniSearch notes/annotations index
```

### Modified Files

```
src/routes/search/+page.svelte  -- mode toggle, scope toggle, text search integration
src/routes/search/+page.ts      -- read mode/scope from URL params
scripts/prepare-data.ts         -- import and call build-search-index after book data prep
package.json                    -- add minisearch (runtime), convert-british-to-american-spellings (dev)
```

### No Changes To

- Existing verse search logic (reference.ts, resolve.ts, verses.ts)
- Book data files or loader (loader.ts)
- Any other routes or components
- Cloudflare Worker configuration

## Dependencies

- **`minisearch`** -- runtime dependency, ~7 KB gzipped
- **`convert-british-to-american-spellings`** -- devDependency only, used by generate-expansions script

## Size Budget

| Asset | Gzipped Size | When Loaded |
|---|---|---|
| MiniSearch library | ~7 KB | With page bundle |
| Verse search index | ~1.6 MB | First text search (verses scope) |
| Notes search index | ~0.8-1.2 MB | First text search (notes scope) |
| Query expansions | ~2-3 KB | With page bundle |
| **Total worst case** | **~2.8 MB** | Only if user searches both scopes |

All static files, CDN-cached, no Worker compute cost. Cloudflare free tier has no limit on static asset size or bandwidth.
