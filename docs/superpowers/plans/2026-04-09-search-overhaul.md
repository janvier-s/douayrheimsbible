# Search Engine Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SpotlightSearch modal with a dedicated `/search` page that parses Bible verse references and displays full ODR verse text inline.

**Architecture:** Client-side only. `bcv_parser` parses user input into OSIS references, which are mapped to app slugs and used to fetch verse data from static JSON via the existing `loadBook()` cache. Results display as a continuous list grouped by reference range with "Read full chapter" links.

**Tech Stack:** SvelteKit 2.x, Svelte 4, TypeScript, Tailwind CSS, `bible-passage-reference-parser` v3.2.0 (already installed). No new dependencies — heading formatting uses `bookMeta.odrName` directly instead of `bible-reference-formatter`.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| **Modify** | `src/lib/search/reference.ts` | Extend parser to return all OSIS passages (not just the first), expose multi-reference parsing |
| **Create** | `src/lib/search/verses.ts` | Given parsed OSIS ranges, fetch verse data via `loadBook()` and return structured result groups |
| **Modify** | `src/routes/search/+page.ts` | Keep existing `?q=` param loader (no changes needed) |
| **Rewrite** | `src/routes/search/+page.svelte` | Full search page with search bar, example placeholders, results display |
| **Modify** | `src/lib/components/TopBar.svelte` | Remove SpotlightSearch import, replace search button with `<a href="/search">`, update mobile search tab |
| **Modify** | `src/lib/components/CompareBar.svelte` | Remove SpotlightSearch import, replace search button with `<a href="/search">`, update mobile search tab |
| **Delete** | `src/lib/components/SpotlightSearch.svelte` | No longer needed |
| **Modify** | `src/routes/+layout.svelte` | Add global `Cmd+K` / `/` keyboard shortcut to navigate to `/search` |

---

### Task 1: Extend `reference.ts` with multi-reference parsing

**Files:**
- Modify: `src/lib/search/reference.ts`
- Create: `src/lib/search/reference.test.ts`

The current `parseReference()` only returns the **first** OSIS passage. We need a new function `parseAllReferences()` that returns **all** parsed passages with their full OSIS strings, so queries like `Matt 3:2-12, John 5:1-6` produce multiple result groups.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/search/reference.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseAllReferences } from './reference';

describe('parseAllReferences', () => {
  it('parses a single verse reference', () => {
    const results = parseAllReferences('John 3:16');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      osis: 'John.3.16',
      book: 'John',
      startChapter: 3,
      startVerse: 16,
      endChapter: 3,
      endVerse: 16
    });
  });

  it('parses a verse range', () => {
    const results = parseAllReferences('Matt 3:2-12');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      osis: 'Matt.3.2-Matt.3.12',
      book: 'Matt',
      startChapter: 3,
      startVerse: 2,
      endChapter: 3,
      endVerse: 12
    });
  });

  it('parses multiple comma-separated references', () => {
    const results = parseAllReferences('Matt 3:2-12, John 5:1-6');
    expect(results).toHaveLength(2);
    expect(results[0].book).toBe('Matt');
    expect(results[1].book).toBe('John');
  });

  it('parses a whole chapter', () => {
    const results = parseAllReferences('Genesis 1');
    expect(results).toHaveLength(1);
    expect(results[0].book).toBe('Gen');
    expect(results[0].startChapter).toBe(1);
    expect(results[0].startVerse).toBeUndefined();
    expect(results[0].endVerse).toBeUndefined();
  });

  it('handles ODR book names via normalisation', () => {
    const results = parseAllReferences('Apocalypse 12:1');
    expect(results).toHaveLength(1);
    expect(results[0].book).toBe('Rev');
    expect(results[0].startChapter).toBe(12);
    expect(results[0].startVerse).toBe(1);
  });

  it('returns empty array for invalid input', () => {
    const results = parseAllReferences('hello world');
    expect(results).toEqual([]);
  });

  it('handles semicolons between references', () => {
    const results = parseAllReferences('Luke 1:28; Revelation 12:1');
    expect(results).toHaveLength(2);
    expect(results[0].book).toBe('Luke');
    expect(results[1].book).toBe('Rev');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/search/reference.test.ts
```

Expected: FAIL — `parseAllReferences` does not exist.

- [ ] **Step 3: Implement `parseAllReferences`**

In `src/lib/search/reference.ts`, add the new interface and function. Keep the existing `parseReference()` and `ParsedReference` untouched (other code may use them).

Add after the existing code:

```typescript
export interface OsisRange {
  /** Raw OSIS string e.g. "Matt.3.2-Matt.3.12" */
  osis: string;
  /** OSIS book code e.g. "Matt" */
  book: string;
  startChapter: number;
  startVerse?: number;
  endChapter: number;
  endVerse?: number;
}

/**
 * Parse input into all OSIS references.
 * Handles multi-reference queries like "Matt 3:2-12, John 5:1-6".
 */
export function parseAllReferences(input: string): OsisRange[] {
  const normalised = normaliseInput(input.trim()).replace(/^(\d)\s+/, '$1');
  const result = parser.parse(normalised);
  const passages = result.osis_and_indices();

  if (!passages.length) return [];

  const ranges: OsisRange[] = [];

  for (const passage of passages) {
    // Each passage.osis may contain comma-separated refs e.g. "Matt.3.2-Matt.3.12,John.5.1-John.5.6"
    const osisRefs = passage.osis.split(',');
    for (const osis of osisRefs) {
      const range = parseOsis(osis);
      if (range) ranges.push(range);
    }
  }

  return ranges;
}

function parseOsis(osis: string): OsisRange | null {
  // Formats: "Book.Ch", "Book.Ch.V", "Book.Ch.V-Book.Ch.V", "Book.Ch-Book.Ch"
  const rangeMatch = osis.match(
    /^([^.]+)\.(\d+)(?:\.(\d+))?(?:-[^.]+\.(\d+)(?:\.(\d+))?)?$/
  );
  if (!rangeMatch) return null;

  const [, book, sCh, sV, eCh, eV] = rangeMatch;
  return {
    osis,
    book,
    startChapter: parseInt(sCh, 10),
    startVerse: sV ? parseInt(sV, 10) : undefined,
    endChapter: eCh ? parseInt(eCh, 10) : parseInt(sCh, 10),
    endVerse: eV ? parseInt(eV, 10) : (sV ? parseInt(sV, 10) : undefined)
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/search/reference.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search/reference.ts src/lib/search/reference.test.ts
git commit -m "feat(search): add parseAllReferences for multi-reference queries"
```

---

### Task 2: Create verse fetcher (`verses.ts`)

**Files:**
- Create: `src/lib/search/verses.ts`
- Create: `src/lib/search/verses.test.ts`

This module takes parsed OSIS ranges, resolves them to app slugs, fetches verse data from `loadBook()`, and returns structured result groups ready for display.

- [ ] **Step 1: Write the failing test**

Create `src/lib/search/verses.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildResultGroups, type SearchResultGroup } from './verses';
import type { OsisRange } from './reference';

// We test buildResultGroups with a mock fetch that returns known data
const mockBookData = {
  book: 'Matthew',
  chapters: [
    {
      chapter: 16,
      verses: [
        { verse: 17, text: 'And Jesus answering...' },
        { verse: 18, text: 'And I say to thee...' },
        { verse: 19, text: 'And I will give to thee...' }
      ]
    }
  ]
};

const mockFetch = (() => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockBookData)
  });
}) as unknown as typeof globalThis.fetch;

describe('buildResultGroups', () => {
  it('fetches verses for a single reference', async () => {
    const ranges: OsisRange[] = [
      { osis: 'Matt.16.18', book: 'Matt', startChapter: 16, startVerse: 18, endChapter: 16, endVerse: 18 }
    ];
    const groups = await buildResultGroups(ranges, mockFetch);
    expect(groups).toHaveLength(1);
    expect(groups[0].slug).toBe('matthew');
    expect(groups[0].chapter).toBe(16);
    expect(groups[0].verses).toHaveLength(1);
    expect(groups[0].verses[0].verse).toBe(18);
  });

  it('returns empty group for unknown OSIS book', async () => {
    const ranges: OsisRange[] = [
      { osis: 'Fake.1.1', book: 'Fake', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 1 }
    ];
    const groups = await buildResultGroups(ranges, mockFetch);
    expect(groups).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/search/verses.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `verses.ts`**

Create `src/lib/search/verses.ts`:

```typescript
import type { OsisRange } from './reference';
import type { Verse } from '$lib/data/types';
import { loadBook, getChapter } from '$lib/data/loader';
import { OSIS_TO_SLUG } from './resolve';
import { ALL_BOOKS } from '$lib/data/books';

export interface SearchResultGroup {
  /** Display heading e.g. "Matthew 16:18" */
  heading: string;
  /** App slug for linking e.g. "matthew" */
  slug: string;
  /** Chapter number for the "Read full chapter" link */
  chapter: number;
  /** ODR book name for display */
  bookName: string;
  /** The verses in this group */
  verses: Verse[];
}

/**
 * Given parsed OSIS ranges, fetch book data and extract the matching verses.
 * Returns an array of result groups ready for display.
 */
export async function buildResultGroups(
  ranges: OsisRange[],
  fetch: typeof globalThis.fetch
): Promise<SearchResultGroup[]> {
  const groups: SearchResultGroup[] = [];

  for (const range of ranges) {
    const slug = OSIS_TO_SLUG[range.book];
    if (!slug) continue;

    const meta = ALL_BOOKS.find((b) => b.slug === slug);
    if (!meta) continue;

    try {
      const bookData = await loadBook(slug, fetch);

      // Handle cross-chapter ranges (rare but possible)
      for (let ch = range.startChapter; ch <= range.endChapter; ch++) {
        const chapter = getChapter(bookData, ch);
        if (!chapter) continue;

        const startV = ch === range.startChapter ? (range.startVerse ?? 1) : 1;
        const endV =
          ch === range.endChapter
            ? (range.endVerse ?? chapter.verses[chapter.verses.length - 1]?.verse ?? 999)
            : (chapter.verses[chapter.verses.length - 1]?.verse ?? 999);

        const verses = chapter.verses.filter((v) => v.verse >= startV && v.verse <= endV);
        if (!verses.length) continue;

        // Build heading
        const heading = formatHeading(meta.odrName, ch, startV, endV, range, chapter.verses.length);

        groups.push({
          heading,
          slug,
          chapter: ch,
          bookName: meta.odrName,
          verses
        });
      }
    } catch {
      // Book failed to load — skip silently
      continue;
    }
  }

  return groups;
}

function formatHeading(
  bookName: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
  range: OsisRange,
  totalVerses: number
): string {
  // Whole chapter (no verse specified in input)
  if (range.startVerse === undefined && range.endVerse === undefined) {
    return `${bookName} ${chapter}`;
  }
  // Single verse
  if (startVerse === endVerse) {
    return `${bookName} ${chapter}:${startVerse}`;
  }
  // Verse range
  return `${bookName} ${chapter}:${startVerse}\u2013${endVerse}`;
}
```

- [ ] **Step 4: Export `OSIS_TO_SLUG` from `resolve.ts`**

In `src/lib/search/resolve.ts`, the `OSIS_TO_SLUG` constant is currently not exported. Change:

```typescript
const OSIS_TO_SLUG: Record<string, string> = {
```

to:

```typescript
export const OSIS_TO_SLUG: Record<string, string> = {
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/lib/search/verses.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/search/verses.ts src/lib/search/verses.test.ts src/lib/search/resolve.ts
git commit -m "feat(search): add verse fetcher for search result groups"
```

---

### Task 3: Build the `/search` page

**Files:**
- Rewrite: `src/routes/search/+page.svelte`
- Modify: `src/routes/search/+page.ts` (no changes needed, already passes `?q=`)

This is the main search page with a search bar, example placeholders, and inline verse results.

- [ ] **Step 1: Rewrite `+page.svelte`**

Replace the entire contents of `src/routes/search/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { prefs } from '$lib/stores/prefs';
  import { parseAllReferences } from '$lib/search/reference';
  import { buildResultGroups, type SearchResultGroup } from '$lib/search/verses';
  import TopBar from '$lib/components/TopBar.svelte';
  import PageFooter from '$lib/components/PageFooter.svelte';

  export let data: { query: string };

  let inputEl: HTMLInputElement;
  let query = data.query;
  let results: SearchResultGroup[] = [];
  let loading = false;
  let searched = false;
  let debounceTimer: ReturnType<typeof setTimeout>;

  const EXAMPLES = [
    'Matthew 16:18',
    'John 6:53-56',
    'Luke 1:28, Revelation 12:1'
  ];

  onMount(() => {
    // Auto-focus if navigated here via keyboard shortcut or empty
    if (inputEl) inputEl.focus();
    // If query is present on load, search immediately
    if (query) search(query);
  });

  function onInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      updateUrl(query);
      if (query.trim()) {
        search(query);
      } else {
        results = [];
        searched = false;
      }
    }, 300);
  }

  function onSubmit() {
    clearTimeout(debounceTimer);
    updateUrl(query);
    if (query.trim()) search(query);
  }

  function updateUrl(q: string) {
    if (!browser) return;
    const url = new URL(window.location.href);
    if (q.trim()) {
      url.searchParams.set('q', q.trim());
    } else {
      url.searchParams.delete('q');
    }
    history.replaceState({}, '', url.toString());
  }

  async function search(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;

    const ranges = parseAllReferences(trimmed);
    if (!ranges.length) {
      results = [];
      searched = true;
      loading = false;
      return;
    }

    loading = true;
    try {
      results = await buildResultGroups(ranges, fetch);
      searched = true;
    } catch {
      results = [];
      searched = true;
    }
    loading = false;
  }

  function onExampleClick(example: string) {
    query = example;
    updateUrl(query);
    search(query);
  }

  /** Strip <cr>, <na> tags and their content; keep <i> as HTML italic. */
  function stripTags(text: string): string {
    return text
      .replace(/<cr>[^<]*<\/cr>/g, '')
      .replace(/<na>[^<]*<\/na>/g, '')
      .replace(/  +/g, ' ')
      .trim();
  }
</script>

<svelte:head>
  <title>{query ? `${query} | Search` : 'Search'} | ODR Bible</title>
</svelte:head>

<TopBar bookSlug="" chapterNum="" />

<main class="max-w-[750px] mx-auto px-md py-xl font-ui" in:fade={{ duration: 140 }}>
  <!-- Search bar -->
  <form on:submit|preventDefault={onSubmit} class="relative mb-lg">
    <div class="flex items-center gap-[10px] border border-border rounded-[6px] bg-panel px-[14px] h-[54px] focus-within:border-accent transition-colors duration-fast">
      <svg
        width="18" height="18" viewBox="0 0 20 20"
        fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
        class="text-subtle shrink-0"
        aria-hidden="true"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <line x1="13" y1="13" x2="18" y2="18" />
      </svg>
      <input
        bind:this={inputEl}
        bind:value={query}
        on:input={onInput}
        type="text"
        placeholder="Search for a verse — e.g. Matthew 16:18"
        class="flex-1 bg-transparent border-none outline-none font-ui text-[15px] font-light text-foreground caret-accent min-w-0"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </div>
  </form>

  <!-- Example queries (shown when no results and no query) -->
  {#if !searched && !query}
    <div class="text-center">
      <p class="text-subtle text-[13px] mb-sm">Try a reference:</p>
      <div class="flex flex-wrap justify-center gap-[8px]">
        {#each EXAMPLES as example}
          <button
            class="px-[12px] py-[6px] rounded-[4px] border border-border text-[13px] text-accent hover:bg-accent/10 transition-colors duration-fast"
            on:click={() => onExampleClick(example)}
          >
            {example}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Loading -->
  {#if loading}
    <p class="text-subtle text-[13px] text-center">Searching...</p>
  {/if}

  <!-- No results -->
  {#if searched && !loading && results.length === 0}
    <p class="text-subtle text-[14px] text-center">
      No references found. Try a verse like <button class="text-accent hover:underline" on:click={() => onExampleClick('James 2:24')}>James 2:24</button>
    </p>
  {/if}

  <!-- Results -->
  {#if results.length > 0}
    <div class="space-y-[24px]" in:fade={{ duration: 160 }}>
      {#each results as group, groupIdx}
        {#if groupIdx > 0}
          <hr class="border-border" />
        {/if}
        <section>
          <h2 class="font-ui text-[14px] font-semibold text-foreground mb-[8px]">
            <a
              href="/odr/{group.slug}/{group.chapter}"
              class="hover:text-accent transition-colors duration-fast"
            >
              {group.heading}
            </a>
          </h2>
          <div class="space-y-[2px]">
            {#each group.verses as v}
              <p
                class="font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
                class:text-justify={$prefs.justifiedText}
              >
                {#if $prefs.showVerseNumbers}
                  <span class="text-subtle font-ui text-[10px] font-light select-none tabular-nums mr-[3px]">{v.verse}</span>
                {/if}
                <span>{@html stripTags(v.text)}</span>
              </p>
            {/each}
          </div>
          <a
            href="/odr/{group.slug}/{group.chapter}"
            class="inline-block mt-[8px] text-[11px] uppercase tracking-[0.15em] text-accent hover:text-foreground transition-colors duration-fast font-medium"
          >
            Read full chapter →
          </a>
        </section>
      {/each}
    </div>
  {/if}
</main>

<div class="max-w-[750px] mx-auto">
  <PageFooter routeBase="/search" />
</div>
```

- [ ] **Step 2: Verify the page renders**

```bash
npm run dev
```

Navigate to `http://localhost:5173/search` — the search bar and example buttons should be visible. Type "Matthew 16:18" and verify verse text appears.

- [ ] **Step 3: Commit**

```bash
git add src/routes/search/+page.svelte
git commit -m "feat(search): build dedicated search page with inline verse results"
```

---

### Task 4: Remove SpotlightSearch from TopBar

**Files:**
- Modify: `src/lib/components/TopBar.svelte`

Replace the SpotlightSearch modal with a direct link to `/search`.

- [ ] **Step 1: Remove SpotlightSearch import and state**

In `src/lib/components/TopBar.svelte`:

Remove line 11:
```typescript
import SpotlightSearch from './SpotlightSearch.svelte';
```

Remove from the `let` declarations:
```typescript
let searchOpen = false;
```

Remove line 115:
```svelte
<SpotlightSearch bind:open={searchOpen} />
```

- [ ] **Step 2: Replace desktop search button with link**

Replace the desktop search button (lines 163–181) — change from `<button on:click={() => (searchOpen = true)}>` to `<a href="/search">`:

```svelte
    <!-- Search icon — desktop only -->
    <a
      href="/search"
      class="hidden md:flex ml-0 shrink-0 items-center justify-center w-[30px] h-[30px]
        rounded-[3px] text-subtle hover:text-foreground transition-colors duration-fast"
      aria-label="Search"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      >
        <circle cx="6.5" cy="6.5" r="4.5" />
        <line x1="10" y1="10" x2="14" y2="14" />
      </svg>
    </a>
```

- [ ] **Step 3: Replace mobile search tab with link**

Replace the mobile search tab button (lines 370–390) — change from `<button on:click={() => (searchOpen = true)}>` to `<a href="/search">`:

```svelte
      <!-- Search tab -->
      <a
        href="/search"
        class="flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors duration-fast
          text-subtle hover:text-foreground"
        aria-label="Search"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        >
          <circle cx="8" cy="8" r="5.5" />
          <line x1="12" y1="12" x2="16" y2="16" />
        </svg>
        <span class="text-[8px] uppercase tracking-[0.1em] font-medium">Search</span>
      </a>
```

- [ ] **Step 4: Remove `searchOpen` from backdrop close logic if present**

Check if `searchOpen` appears in the close-all overlay condition (lines 428–436). If the overlay `{#if}` block references `searchOpen`, remove it. Currently it's `{#if navOpen || prefsOpen || translationOpen}` which does not include `searchOpen`, so no change needed here.

- [ ] **Step 5: Verify TopBar still renders correctly**

```bash
npm run dev
```

Navigate to a reader page, verify the search icon on desktop opens `/search` instead of a modal.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/TopBar.svelte
git commit -m "refactor(TopBar): replace SpotlightSearch modal with /search link"
```

---

### Task 5: Remove SpotlightSearch from CompareBar

**Files:**
- Modify: `src/lib/components/CompareBar.svelte`

Same treatment as TopBar (Task 4) — replace SpotlightSearch with a link.

- [ ] **Step 1: Remove SpotlightSearch import, state, and component**

Remove the import:
```typescript
import SpotlightSearch from './SpotlightSearch.svelte';
```

Remove the `let searchOpen = false;` declaration.

Remove the `<SpotlightSearch bind:open={searchOpen} />` component (line 63).

Remove `searchOpen = false;` from the `closeAll()` function if present.

- [ ] **Step 2: Replace desktop search button with link**

Find the desktop search button that does `on:click={() => (searchOpen = true)}` and replace with:

```svelte
    <a
      href="/search"
      class="hidden md:flex ml-0 shrink-0 items-center justify-center w-[30px] h-[30px]
        rounded-[3px] text-subtle hover:text-foreground transition-colors duration-fast"
      aria-label="Search"
    >
      <svg
        width="15" height="15" viewBox="0 0 15 15"
        fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
      >
        <circle cx="6.5" cy="6.5" r="4.5" />
        <line x1="10" y1="10" x2="14" y2="14" />
      </svg>
    </a>
```

- [ ] **Step 3: Replace mobile search tab with link**

Find the mobile search tab button and replace with an `<a href="/search">` — same pattern as TopBar Task 4 Step 3.

- [ ] **Step 4: Verify CompareBar renders correctly**

```bash
npm run dev
```

Navigate to a compare page, verify the search icon links to `/search`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/CompareBar.svelte
git commit -m "refactor(CompareBar): replace SpotlightSearch modal with /search link"
```

---

### Task 6: Delete SpotlightSearch and add global keyboard shortcut

**Files:**
- Delete: `src/lib/components/SpotlightSearch.svelte`
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Delete SpotlightSearch**

```bash
rm "src/lib/components/SpotlightSearch.svelte"
```

- [ ] **Step 2: Add global keyboard shortcut in layout**

In `src/routes/+layout.svelte`, add a `<svelte:window>` handler (or extend the existing one if present) that listens for `Cmd+K` and `/`:

```svelte
<svelte:window on:keydown={handleGlobalKeydown} />
```

Add in the `<script>` block:

```typescript
import { goto } from '$app/navigation';
import { page } from '$app/stores';

function handleGlobalKeydown(e: KeyboardEvent) {
  // Don't trigger if user is typing in an input/textarea
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
    e.preventDefault();
    if ($page.url.pathname !== '/search') {
      goto('/search');
    }
  }
}
```

If `goto` and `page` are already imported, don't duplicate. If a `<svelte:window>` already exists, merge the handler.

- [ ] **Step 3: Verify keyboard shortcuts work**

```bash
npm run dev
```

From any page, press `/` or `Cmd+K` — should navigate to `/search`. On the search page itself, `/` should not trigger navigation (the input will capture it).

- [ ] **Step 4: Run full build to ensure no broken imports**

```bash
npm run build
```

Expected: build succeeds with no errors about missing SpotlightSearch.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: delete SpotlightSearch, add global Cmd+K / slash keyboard shortcut"
```

---

### Task 7: End-to-end verification and cleanup

**Files:**
- No new files — verification only

- [ ] **Step 1: Run all existing tests**

```bash
npx vitest run
```

Expected: all tests pass (including new reference and verse tests).

- [ ] **Step 2: Run prettier**

```bash
npx prettier --write src/routes/search/+page.svelte src/lib/search/reference.ts src/lib/search/verses.ts src/lib/search/resolve.ts src/lib/components/TopBar.svelte src/lib/components/CompareBar.svelte src/routes/+layout.svelte
```

- [ ] **Step 3: Manual verification checklist**

```bash
npm run dev
```

Test the following:
1. Navigate to `/search` — search bar visible, example buttons shown
2. Click "Matthew 16:18" example — verse text appears with heading and "Read full chapter" link
3. Type "John 6:53-56" — 4 verses appear with verse numbers
4. Type "Luke 1:28, Revelation 12:1" — two groups with divider
5. Type "Genesis 1" — entire chapter 1 appears
6. Type "hello world" — "No references found" message with James 2:24 suggestion
7. Click heading link — navigates to reading page
8. Click "Read full chapter" — navigates to reading page
9. URL shows `?q=` parameter — copy and open in new tab, results load automatically
10. From reader page, press `Cmd+K` — navigates to `/search`
11. From reader page, press `/` — navigates to `/search`
12. Desktop search icon in TopBar → links to `/search`
13. Mobile search tab in bottom bar → links to `/search`
14. Compare page search icon → links to `/search`
15. ODR book names like "Apocalypse 12:1" work
16. Build succeeds: `npm run build`

- [ ] **Step 4: Commit any formatting fixes**

```bash
git add -A
git commit -m "chore: format search files with prettier"
```
