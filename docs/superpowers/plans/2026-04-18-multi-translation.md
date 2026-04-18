# Multi-Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add VUL, DRC, Knox, KJV, CPDV, and Confraternity translations — showing real text in compare mode, each with its own reader URL (`/drc/genesis/1` etc.), and a live translation picker in TopBar.

**Architecture:** Data pipeline copies translation JSONs to `static/data/{id}/` at build time (with slug remapping for DRC/Knox). A new `loadTranslationBook` in loader.ts fetches from these paths. Compare page loads all visible translations in parallel and renders per-column text. A dynamic `[translation]/[book]/[chapter]` route provides a simple reader for all translations.

**Tech Stack:** SvelteKit 2, Svelte 4 compat syntax, TypeScript, Tailwind CSS 3. All edits use Svelte 4 (`export let`, `$:`, `on:click`). No runes.

---

## Before starting: confirm source paths

Open `scripts/prepare-data.ts` and look at `ODR_SOURCE`. The new sources follow the same `../SCRIPTURA/sources/` parent. Confirm which subdirectory holds each translation's JSON files (they should contain one JSON per book in the format `{book, version_abbr, date, chapters: [{chapter, verses: [{verse, text}]}]}`):

| Translation | Expected directory | Notes |
|---|---|---|
| VUL | `VUL/` | May need `json/` subfolder |
| DRC | TBD | Confirm with user |
| Knox | `KNOX/newadvent/` | Likely one JSON per book |
| KJV | TBD | Confirm with user |
| CPDV | `PDV/` | Likely Catholic Public Domain |
| Confraternity | TBD | NT-only (27 books) |

> The user provided these paths in the previous session. Check `git log --all --oneline -5` or ask if unclear.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `scripts/prepare-data.ts` | Copy 6 new translation JSONs → `static/data/{id}/`, remap DRC/Knox slugs |
| Modify | `src/lib/data/loader.ts` | Add `loadTranslationBook(id, slug, fetch)` |
| Create | `src/lib/data/translation-types.ts` | Minimal `TranslationVerse`, `TranslationChapter`, `TranslationBook` types |
| Modify | `src/lib/stores/compare.ts` | Set `live: true` for all 6 translations; bump STORAGE_KEY to `v4` |
| Modify | `src/routes/compare/[book]/[chapter]/+page.ts` | Load all visible translation books in parallel |
| Modify | `src/routes/compare/[book]/[chapter]/+page.svelte` | Render actual per-column verse text |
| Create | `src/routes/[translation]/[book]/[chapter]/+page.ts` | Load translation book + validate |
| Create | `src/routes/[translation]/[book]/[chapter]/+page.svelte` | Simple reader, no study panel |
| Modify | `src/lib/components/TopBar.svelte` | Live translation picker with current-translation prop |
| Modify | `src/routes/odr/[book]/[chapter]/[[verse]]/+page.svelte` | Pass `translationId="odr"` to TopBar |

---

### Task 1: Data pipeline — copy translation JSONs

**Files:**
- Modify: `scripts/prepare-data.ts`

The source JSON format for non-ODR translations is: `{book, version_abbr, date, chapters: [{chapter, verses: [{verse, text}]}]}`

Output format written to `static/data/{id}/{slug}.json` is the same shape — no transformation needed except slug remapping for DRC and Knox.

**DRC/Knox slug remap** (ODR slug → DRC/Knox filename slug):
```
josue → joshua
jeremie → jeremiah
ezechiel → ezekiel
isaie → isaiah
micheas → micah
osee → hosea
aggeus → haggai
zacharias → zechariah
sophonias → zephaniah
malachie → malachi
abdias → obadiah
jonas → jonah
habacuc → habakkuk
tobias → tobit
ecclesiasticus → sirach
canticle-of-canticles → song-of-solomon
apocalypse → revelation
1-machabees → 1-maccabees
2-machabees → 2-maccabees
1-kings → 1-samuel
2-kings → 2-samuel
3-kings → 1-kings
4-kings → 2-kings
1-paralipomenon → 1-chronicles
2-paralipomenon → 2-chronicles
1-esdras → ezra
2-esdras → nehemiah
```

- [ ] **Step 1: Write the failing test** — `tests/prepare-data.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { remapSlug, SLUG_REMAP_DRC_KNOX } from '../scripts/prepare-data.js';

describe('remapSlug', () => {
  it('passes through ODR-compatible slugs unchanged', () => {
    expect(remapSlug('genesis', SLUG_REMAP_DRC_KNOX)).toBe('genesis');
    expect(remapSlug('mark', SLUG_REMAP_DRC_KNOX)).toBe('mark');
  });
  it('remaps josue to joshua', () => {
    expect(remapSlug('josue', SLUG_REMAP_DRC_KNOX)).toBe('joshua');
  });
  it('remaps 3-kings to 1-kings', () => {
    expect(remapSlug('3-kings', SLUG_REMAP_DRC_KNOX)).toBe('1-kings');
  });
  it('remaps apocalypse to revelation', () => {
    expect(remapSlug('apocalypse', SLUG_REMAP_DRC_KNOX)).toBe('revelation');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npm run test -- tests/prepare-data.test.ts
```
Expected: FAIL — `remapSlug is not exported`

- [ ] **Step 3: Add `remapSlug` export and `SLUG_REMAP_DRC_KNOX` to prepare-data.ts, and add the 6 translation copy blocks**

At the top of `scripts/prepare-data.ts`, after existing constants, add:

```typescript
// ── Translation sources ───────────────────────────────────────────────────────
// Each entry: [translationId, sourceDir, useSlugRemap]
// Confirm these paths match the actual SCRIPTURA directory structure before running.
// All sources live under SCRIPTURA/sources/ODR/ (sibling to the ODR/ODR folder)
const ODR_PARENT = join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'ODR');
const TRANSLATIONS_TO_COPY = [
  { id: 'vul',  srcDir: join(ODR_PARENT, 'VUL_CL', 'JSON_Converted'), remap: false },
  { id: 'drc',  srcDir: join(ODR_PARENT, 'DRC', 'JSON_drbo'), remap: true  },
  { id: 'knox', srcDir: join(ODR_PARENT, 'Knox', 'JSON_converted'), remap: true  },
  { id: 'kjv',  srcDir: join(ODR_PARENT, 'KJV', 'JSON_Converted'), remap: false },
  { id: 'cpdv', srcDir: join(ODR_PARENT, 'CPDV', 'JSON_Converted'), remap: false },
  { id: 'conf', srcDir: join(ODR_PARENT, 'Confraternity', 'JSON_Converted'), remap: false },
] as const;

export const SLUG_REMAP_DRC_KNOX: Record<string, string> = {
  'josue': 'joshua',
  'jeremie': 'jeremiah',
  'ezechiel': 'ezekiel',
  'isaie': 'isaiah',
  'micheas': 'micah',
  'osee': 'hosea',
  'aggeus': 'haggai',
  'zacharias': 'zechariah',
  'sophonias': 'zephaniah',
  'malachie': 'malachi',
  'abdias': 'obadiah',
  'jonas': 'jonah',
  'habacuc': 'habakkuk',
  'tobias': 'tobit',
  'ecclesiasticus': 'sirach',
  'canticle-of-canticles': 'song-of-solomon',
  'apocalypse': 'revelation',
  '1-machabees': '1-maccabees',
  '2-machabees': '2-maccabees',
  '1-kings': '1-samuel',
  '2-kings': '2-samuel',
  '3-kings': '1-kings',
  '4-kings': '2-kings',
  '1-paralipomenon': '1-chronicles',
  '2-paralipomenon': '2-chronicles',
  '1-esdras': 'ezra',
  '2-esdras': 'nehemiah',
};

export function remapSlug(odrSlug: string, map: Record<string, string>): string {
  return map[odrSlug] ?? odrSlug;
}
```

Then at the end of `main()`, after the existing ODR copy block, add:

```typescript
  // ── Copy non-ODR translations ─────────────────────────────────────────────
  for (const { id, srcDir, remap } of TRANSLATIONS_TO_COPY) {
    try {
      await readdir(srcDir);
    } catch {
      console.log(`Source not found for ${id} at ${srcDir} — skipping.`);
      continue;
    }

    const outDir = join(PROJECT_ROOT, 'static', 'data', id);
    await mkdir(outDir, { recursive: true });

    const files = await readdir(srcDir);
    let translationCount = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const raw = await readFile(join(srcDir, file), 'utf-8');
      const data = JSON.parse(raw);
      if (!data.book && !data.chapters) continue;

      // Source file slug (strip leading NN- prefix)
      const fileSlug = file.replace(/^\d+-/, '').replace('.json', '');

      // For DRC/Knox, source files use modern names; we need to find the ODR slug.
      // We write the file using the ODR slug so our loader can find it by ODR slug.
      // For VUL/KJV/CPDV, source already uses ODR-compatible slugs.
      const outputSlug = remap
        ? reverseRemapSlug(fileSlug, SLUG_REMAP_DRC_KNOX)
        : fileSlug;

      // Only write minimal fields needed for reading/compare (strips annotations, intros, etc.)
      const minimal = {
        book: data.book,
        chapters: data.chapters.map((ch: { chapter: number; verses: { verse: number; text: string }[] }) => ({
          chapter: ch.chapter,
          verses: ch.verses.map((v: { verse: number; text: string }) => ({ verse: v.verse, text: v.text }))
        }))
      };

      await writeFile(join(outDir, `${outputSlug}.json`), JSON.stringify(minimal));
      translationCount++;
    }
    console.log(`✓ ${id}: ${translationCount} books → static/data/${id}/`);
  }
```

Also add after `remapSlug`:

```typescript
/** Given a modern-name slug (DRC/Knox file), find the ODR slug it maps to. */
function reverseRemapSlug(modernSlug: string, map: Record<string, string>): string {
  const entry = Object.entries(map).find(([, v]) => v === modernSlug);
  return entry ? entry[0] : modernSlug;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- tests/prepare-data.test.ts
```
Expected: PASS

- [ ] **Step 5: Run the build to verify books copy correctly**

```bash
npm run build 2>&1 | head -60
ls static/data/vul | head -5
ls static/data/drc | head -5
```
Expected: `static/data/vul/genesis.json`, `static/data/drc/genesis.json` etc.

> If a source path is wrong, fix `TRANSLATIONS_TO_COPY` paths before proceeding.

- [ ] **Step 6: Commit**

```bash
git add scripts/prepare-data.ts tests/prepare-data.test.ts
git commit -m "feat: copy 6 translation JSONs to static/data in build pipeline"
```

---

### Task 2: Add `loadTranslationBook` to loader.ts

**Files:**
- Create: `src/lib/data/translation-types.ts`
- Modify: `src/lib/data/loader.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/data/loader.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { loadTranslationBook } from './loader.js';

describe('loadTranslationBook', () => {
  it('fetches from the correct URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ book: 'Genesis', chapters: [] })
    });
    await loadTranslationBook('drc', 'genesis', mockFetch as unknown as typeof fetch);
    expect(mockFetch).toHaveBeenCalledWith('/data/drc/genesis.json');
  });

  it('throws on 404', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(
      loadTranslationBook('kjv', 'genesis', mockFetch as unknown as typeof fetch)
    ).rejects.toThrow('Book not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/lib/data/loader.test.ts
```
Expected: FAIL — `loadTranslationBook is not a function`

- [ ] **Step 3: Create `src/lib/data/translation-types.ts`**

```typescript
export interface TranslationVerse {
  verse: number;
  text: string;
}

export interface TranslationChapter {
  chapter: number;
  verses: TranslationVerse[];
}

export interface TranslationBook {
  book: string;
  chapters: TranslationChapter[];
}
```

- [ ] **Step 4: Add `loadTranslationBook` to `src/lib/data/loader.ts`**

Add after the existing `loadAnnotations` function:

```typescript
import type { TranslationBook } from './translation-types';

const translationBookCache = new Map<string, Promise<TranslationBook>>();

/**
 * Fetches a non-ODR translation's book JSON from /data/{id}/{slug}.json.
 * Caches per `{id}/{slug}` key.
 */
export function loadTranslationBook(
  id: string,
  slug: string,
  fetch: typeof globalThis.fetch
): Promise<TranslationBook> {
  const key = `${id}/${slug}`;
  if (!translationBookCache.has(key)) {
    const promise = fetch(`/data/${id}/${slug}.json`).then((res) => {
      if (!res.ok) throw new Error(`Book not found: ${id}/${slug}`);
      return res.json() as Promise<TranslationBook>;
    });
    promise.then(null, () => translationBookCache.delete(key));
    translationBookCache.set(key, promise);
  }
  return translationBookCache.get(key)!;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test -- src/lib/data/loader.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/translation-types.ts src/lib/data/loader.ts src/lib/data/loader.test.ts
git commit -m "feat: add loadTranslationBook for non-ODR translation data"
```

---

### Task 3: Set translations live in compare store

**Files:**
- Modify: `src/lib/stores/compare.ts`

- [ ] **Step 1: Set `live: true` for all 6 translations and bump storage key**

In `src/lib/stores/compare.ts`:

Change `live: false` → `live: true` for: `vul`, `kjv`, `drc`, `conf`, `knox`, `cpdv`.

Leave `rsv` as `live: false` (hidden, Konami-only).

Change:
```typescript
const STORAGE_KEY = 'compareStore_v3';
```
To:
```typescript
const STORAGE_KEY = 'compareStore_v4';
```

- [ ] **Step 2: Run svelte-check**

```bash
npm run check 2>&1 | tail -10
```
Expected: 0 errors (the `live` field change is purely data, no type change).

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/compare.ts
git commit -m "feat: mark all 6 translations as live in compare store"
```

---

### Task 4: Load per-translation data in compare +page.ts

**Files:**
- Modify: `src/routes/compare/[book]/[chapter]/+page.ts`

Currently loads only ODR. Needs to load all visible translations in parallel and return a verse map.

- [ ] **Step 1: Write the failing test** — `src/routes/compare/[book]/[chapter]/+page.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';

// Just verify the helper that builds the verseMap
import { buildVerseMap } from './+page.js';

describe('buildVerseMap', () => {
  it('indexes verses by verse number', () => {
    const chapters = [{ chapter: 1, verses: [{ verse: 1, text: 'In the beginning' }, { verse: 2, text: 'And the earth' }] }];
    const map = buildVerseMap(chapters, 1);
    expect(map.get(1)).toBe('In the beginning');
    expect(map.get(2)).toBe('And the earth');
  });

  it('returns empty map for missing chapter', () => {
    const map = buildVerseMap([], 1);
    expect(map.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- "src/routes/compare/[book]/[chapter]/+page.test.ts"
```
Expected: FAIL — `buildVerseMap is not exported`

- [ ] **Step 3: Rewrite `src/routes/compare/[book]/[chapter]/+page.ts`**

```typescript
import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadBook, getChapter, loadTranslationBook } from '$lib/data/loader';
import { getBookBySlug } from '$lib/data/books';
import { TRANSLATIONS } from '$lib/stores/compare';
import type { TranslationChapter } from '$lib/data/translation-types';

/** Builds a Map<verseNum, verseText> from a chapter's verses, for fast lookup in the template. */
export function buildVerseMap(
  chapters: TranslationChapter[],
  chapterNum: number
): Map<number, string> {
  const ch = chapters.find((c) => c.chapter === chapterNum);
  if (!ch) return new Map();
  return new Map(ch.verses.map((v) => [v.verse, v.text]));
}

export const load: PageLoad = async ({ params, fetch }) => {
  const { book: slug, chapter: chapterStr } = params;

  const bookMeta = getBookBySlug(slug);
  if (!bookMeta) throw error(404, `Book not found: ${slug}`);

  const chapterNum = parseInt(chapterStr, 10);
  if (isNaN(chapterNum) || chapterNum < 1) throw error(404, `Invalid chapter: ${chapterStr}`);

  // Always load ODR (base text)
  const odrBookData = await loadBook(slug, fetch);
  const chapter = getChapter(odrBookData, chapterNum);
  if (!chapter) throw error(404, `Chapter ${chapterNum} not found`);

  // Load all other live translations in parallel
  const otherTranslations = TRANSLATIONS.filter(
    (t) => t.id !== 'odr' && t.live && !(t.ntOnly && bookMeta.testament === 'OT')
  );

  const translationResults = await Promise.allSettled(
    otherTranslations.map((t) => loadTranslationBook(t.id, slug, fetch))
  );

  // Build verse map per translation: translationId → Map<verseNum, text>
  const verseMaps: Record<string, Map<number, string>> = {
    odr: new Map(chapter.verses.map((v) => [v.verse, v.text]))
  };

  for (let i = 0; i < otherTranslations.length; i++) {
    const result = translationResults[i];
    const t = otherTranslations[i];
    if (result.status === 'fulfilled') {
      verseMaps[t.id] = buildVerseMap(result.value.chapters, chapterNum);
    } else {
      verseMaps[t.id] = new Map(); // empty — translation unavailable for this book
    }
  }

  return {
    bookMeta,
    chapter,
    totalChapters: odrBookData.chapters.length,
    verseMaps,
    showLayoutTopBar: false
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- "src/routes/compare/[book]/[chapter]/+page.test.ts"
```
Expected: PASS

- [ ] **Step 5: Run svelte-check**

```bash
npm run check 2>&1 | tail -15
```

- [ ] **Step 6: Commit**

```bash
git add "src/routes/compare/[book]/[chapter]/+page.ts" "src/routes/compare/[book]/[chapter]/+page.test.ts"
git commit -m "feat: load all live translation verse data in compare page loader"
```

---

### Task 5: Render per-translation text in compare +page.svelte

**Files:**
- Modify: `src/routes/compare/[book]/[chapter]/+page.svelte`

The template currently renders `v.text` (ODR) for every column, hiding non-live columns with `invisible`. Now we use `verseMaps[t.id].get(v.verse)` per column.

- [ ] **Step 1: Update the script block**

In `src/routes/compare/[book]/[chapter]/+page.svelte`, change:

```typescript
$: ({ bookMeta, chapter } = data);
```
To:
```typescript
$: ({ bookMeta, chapter, verseMaps } = data);
```

- [ ] **Step 2: Update the verse grid section**

Find and replace the entire verse grid `<div class="grid" ...>` block (lines ~249–275):

**Old:**
```svelte
		<!-- Verse grid: one cell per (verse × column) — CSS grid auto-flow aligns rows -->
		<div
			class="grid"
			style="grid-template-columns: repeat({displayedCols.length}, minmax(0, 1fr));"
		>
			{#each chapter.verses as v (v.verse)}
				{#each displayedCols as t, colIdx (t.id)}
					<div
						class="px-[16px] py-[12px] max-md:px-[5px] max-md:py-[8px] border-b border-border bg-panel font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)] flex items-start gap-[3px]
						{colIdx < displayedCols.length - 1 ? 'border-r border-border' : ''}"
						class:text-justify={$prefs.justifiedText}
					>
						{#if $prefs.showVerseNumbers}
							<span
								class="text-subtle font-ui text-[10px] font-light select-none shrink-0 tabular-nums pt-[0.25em] text-right w-fit md:mr-[6px]"
								class:invisible={!t.live}
								aria-hidden={!t.live}>{v.verse}</span
							>
						{/if}
						{#if t.live}
							<span>{@html stripTags(v.text)}</span>
						{:else}
							<span class="invisible" aria-hidden="true">{@html stripTags(v.text)}</span>
						{/if}
					</div>
				{/each}
			{/each}
		</div>
```

**New:**
```svelte
		<!-- Verse grid: one cell per (verse × column) — CSS grid auto-flow aligns rows -->
		<div
			class="grid"
			style="grid-template-columns: repeat({displayedCols.length}, minmax(0, 1fr));"
		>
			{#each chapter.verses as v (v.verse)}
				{#each displayedCols as t, colIdx (t.id)}
					<div
						class="px-[16px] py-[12px] max-md:px-[5px] max-md:py-[8px] border-b border-border bg-panel font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)] flex items-start gap-[3px]
						{colIdx < displayedCols.length - 1 ? 'border-r border-border' : ''}"
						class:text-justify={$prefs.justifiedText}
					>
						{#if $prefs.showVerseNumbers}
							<span
								class="text-subtle font-ui text-[10px] font-light select-none shrink-0 tabular-nums pt-[0.25em] text-right w-fit md:mr-[6px]"
							>{v.verse}</span>
						{/if}
						<span>{@html stripTags(verseMaps[t.id]?.get(v.verse) ?? '')}</span>
					</div>
				{/each}
			{/each}
		</div>
```

- [ ] **Step 3: Remove the "Soon" badge from column headers**

Find and remove this block from the column headers section:

```svelte
					{#if !t.live}
						<span
							class="shrink-0 text-[9px] uppercase tracking-[0.1em] text-subtle border border-border rounded-[2px] px-[5px] py-[1px]"
						>
							Soon
						</span>
					{/if}
```

- [ ] **Step 4: Run svelte-check**

```bash
npm run check 2>&1 | tail -15
```
Expected: 0 errors.

- [ ] **Step 5: Verify locally**

```bash
npm run dev
```
Open `http://localhost:5173/compare/genesis/1`. Verify DRC, VUL etc. show actual text in their columns.

- [ ] **Step 6: Commit**

```bash
git add "src/routes/compare/[book]/[chapter]/+page.svelte"
git commit -m "feat: render actual translation text per column in compare view"
```

---

### Task 6: Create translation reader route

**Files:**
- Create: `src/routes/[translation]/[book]/[chapter]/+page.ts`
- Create: `src/routes/[translation]/[book]/[chapter]/+page.svelte`

This is a simple reader: no study panel, no annotations, no TopBar. Uses the same layout and font prefs as ODR, but much simpler.

Note: SvelteKit gives static segments higher priority than `[translation]`, so `/odr/`, `/compare/`, `/about/` etc. all continue to match their static routes first.

- [ ] **Step 1: Create `src/routes/[translation]/[book]/[chapter]/+page.ts`**

```typescript
import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadTranslationBook } from '$lib/data/loader';
import { getBookBySlug } from '$lib/data/books';
import { TRANSLATIONS } from '$lib/stores/compare';
import type { TranslationChapter } from '$lib/data/translation-types';

export const load: PageLoad = async ({ params, fetch }) => {
  const { translation: translationId, book: slug, chapter: chapterStr } = params;

  const translation = TRANSLATIONS.find((t) => t.id === translationId && t.live);
  if (!translation || translationId === 'odr') {
    throw error(404, `Unknown translation: ${translationId}`);
  }

  const bookMeta = getBookBySlug(slug);
  if (!bookMeta) throw error(404, `Book not found: ${slug}`);

  if (translation.ntOnly && bookMeta.testament === 'OT') {
    throw error(404, `${translation.label} is NT-only`);
  }

  const chapterNum = parseInt(chapterStr, 10);
  if (isNaN(chapterNum) || chapterNum < 1) throw error(404, `Invalid chapter: ${chapterStr}`);

  const book = await loadTranslationBook(translationId, slug, fetch);
  const chapter: TranslationChapter | undefined = book.chapters.find((c) => c.chapter === chapterNum);
  if (!chapter) throw error(404, `Chapter ${chapterNum} not found`);

  return {
    translation,
    bookMeta,
    chapter,
    totalChapters: book.chapters.length
  };
};
```

- [ ] **Step 2: Create `src/routes/[translation]/[book]/[chapter]/+page.svelte`**

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { prefs } from '$lib/stores/prefs';
  import { ALL_BOOKS } from '$lib/data/books';
  import { fade } from 'svelte/transition';
  import PageFooter from '$lib/components/PageFooter.svelte';

  export let data: PageData;

  $: ({ translation, bookMeta, chapter } = data);

  $: bookIdx = ALL_BOOKS.findIndex((b) => b.slug === bookMeta.slug);
  $: prevBook = bookIdx > 0 ? ALL_BOOKS[bookIdx - 1] : null;
  $: nextBook = bookIdx < ALL_BOOKS.length - 1 ? ALL_BOOKS[bookIdx + 1] : null;

  $: prevChapter = chapter.chapter > 1 ? chapter.chapter - 1 : null;
  $: nextChapter = chapter.chapter < data.totalChapters ? chapter.chapter + 1 : null;

  $: displayName = $prefs.modernBookNames ? bookMeta.modernName : bookMeta.odrName;
  $: base = `/${translation.id}`;
</script>

<svelte:head>
  <title>{displayName} {chapter.chapter} — {translation.abbr} ({translation.year})</title>
</svelte:head>

<!-- Minimal top nav -->
<header class="sticky top-0 z-30 bg-glass backdrop-blur-sm border-b border-border px-lg flex items-center justify-between" style="height: 50px;">
  <div class="font-ui text-[13px] font-semibold text-foreground">
    {translation.abbr}
    <span class="text-subtle font-normal ml-[6px] text-[11px]">{translation.year}</span>
  </div>
  <nav class="flex items-center gap-[16px] font-ui text-[11px] uppercase tracking-[0.12em] text-subtle">
    {#if prevChapter}
      <a href="{base}/{bookMeta.slug}/{prevChapter}" class="hover:text-accent transition-colors duration-fast">‹ Ch. {prevChapter}</a>
    {:else if prevBook && !translation.ntOnly}
      <a href="{base}/{prevBook.slug}/1" class="hover:text-accent transition-colors duration-fast">‹ {prevBook.odrName}</a>
    {/if}
    <span class="text-foreground font-medium">{displayName} {chapter.chapter}</span>
    {#if nextChapter}
      <a href="{base}/{bookMeta.slug}/{nextChapter}" class="hover:text-accent transition-colors duration-fast">Ch. {nextChapter} ›</a>
    {:else if nextBook && !translation.ntOnly}
      <a href="{base}/{nextBook.slug}/1" class="hover:text-accent transition-colors duration-fast">{nextBook.odrName} ›</a>
    {/if}
  </nav>
</header>

<div in:fade={{ duration: 140 }}>
  <article
    class="mx-auto px-lg py-[32px] font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
    style="max-width: 680px;"
    class:text-justify={$prefs.justifiedText}
  >
    {#each chapter.verses as v (v.verse)}
      <span class="verse-unit" id="v{v.verse}">
        {#if $prefs.showVerseNumbers}
          <sup class="text-subtle font-ui text-[10px] font-light select-none tabular-nums mr-[3px]">{v.verse}</sup>
        {/if}
        {v.text}{' '}
      </span>
    {/each}
  </article>

  <PageFooter
    {bookMeta}
    chapterNum={chapter.chapter}
    totalChapters={data.totalChapters}
    routeBase={base}
  />
</div>
```

- [ ] **Step 3: Run svelte-check**

```bash
npm run check 2>&1 | tail -15
```
Expected: 0 errors.

- [ ] **Step 4: Verify locally**

```bash
npm run dev
```
Open `http://localhost:5173/drc/genesis/1` — should show DRC text with simple reader. Test `http://localhost:5173/vul/genesis/1`.

- [ ] **Step 5: Commit**

```bash
git add "src/routes/[translation]"
git commit -m "feat: add translation reader route /[translation]/[book]/[chapter]"
```

---

### Task 7: Live translation picker in TopBar

**Files:**
- Modify: `src/lib/components/TopBar.svelte`

The TopBar currently hardcodes `ODR` in the picker and shows "More translations coming soon." We replace this with a list of all live translations, linking to the same book+chapter in each translation. The current translation is passed as a new prop.

- [ ] **Step 1: Add `translationId` prop to TopBar**

In the `<script>` section of `src/lib/components/TopBar.svelte`, add after the existing props:

```typescript
export let translationId: string = 'odr';
```

Also add the import:
```typescript
import { TRANSLATIONS } from '$lib/stores/compare';
```

And add derived value:
```typescript
$: liveTranslations = TRANSLATIONS.filter((t) => t.live && !t.hidden);
$: currentTranslation = liveTranslations.find((t) => t.id === translationId) ?? liveTranslations.find((t) => t.id === 'odr')!;
```

- [ ] **Step 2: Replace the translation picker button and dropdown**

Find the translation selector block (approximately lines 199–233):

```svelte
			<!-- Left: translation selector -->
			<div class="relative shrink-0">
				<button
					class="flex items-center gap-[7px] px-[10px] py-[10px] rounded-[3px] transition-colors duration-fast
					{translationOpen ? 'bg-accent text-white' : 'text-foreground hover:text-accent'}"
					aria-expanded={translationOpen}
					aria-haspopup="listbox"
					on:click={() => {
						translationOpen = !translationOpen;
						prefsOpen = false;
						navOpen = false;
					}}
				>
					<span class="text-[11px] md:text-[14px] leading-tight font-medium">ODR</span>
					<span
						class="text-[12px] opacity-70 {translationOpen ? 'text-white/70' : ''} leading-none"
						aria-hidden="true"
					>
						{translationOpen ? '▲' : '▼'}
					</span>
				</button>
				{#if translationOpen}
					<div
						transition:slide={{ duration: 180 }}
						class="absolute top-[calc(100%+8px)] left-0 bg-panel border border-border rounded-sm shadow-lg p-sm z-50 w-56 font-ui text-sm"
					>
						<p class="text-[11px] uppercase tracking-[0.15em] text-subtle mb-sm font-medium">
							Translation
						</p>
						<div class="flex items-center justify-between px-sm py-[7px] rounded-sm bg-accent/10">
							<span class="text-foreground font-medium text-[13px]">Original Douay-Rheims</span>
							<span class="text-[10px] text-accent font-semibold tracking-[0.1em]">✓</span>
						</div>
						<p class="text-[11px] text-subtle mt-sm px-sm">More translations coming soon.</p>
					</div>
				{/if}
			</div>
```

Replace with:

```svelte
			<!-- Left: translation selector -->
			<div class="relative shrink-0">
				<button
					class="flex items-center gap-[7px] px-[10px] py-[10px] rounded-[3px] transition-colors duration-fast
					{translationOpen ? 'bg-accent text-white' : 'text-foreground hover:text-accent'}"
					aria-expanded={translationOpen}
					aria-haspopup="listbox"
					on:click={() => {
						translationOpen = !translationOpen;
						prefsOpen = false;
						navOpen = false;
					}}
				>
					<span class="text-[11px] md:text-[14px] leading-tight font-medium">{currentTranslation.abbr}</span>
					<span
						class="text-[12px] opacity-70 {translationOpen ? 'text-white/70' : ''} leading-none"
						aria-hidden="true"
					>
						{translationOpen ? '▲' : '▼'}
					</span>
				</button>
				{#if translationOpen}
					<div
						transition:slide={{ duration: 180 }}
						class="absolute top-[calc(100%+8px)] left-0 bg-panel border border-border rounded-sm shadow-lg p-sm z-50 w-64 font-ui text-sm"
					>
						<p class="text-[11px] uppercase tracking-[0.15em] text-subtle mb-sm font-medium">
							Translation
						</p>
						{#each liveTranslations as t (t.id)}
							{@const isCurrent = t.id === translationId}
							{@const href = t.id === 'odr'
								? `/odr/${bookSlug}/${chapterNum}`
								: `/${t.id}/${bookSlug}/${chapterNum}`}
							{#if isCurrent}
								<div class="flex items-center justify-between px-sm py-[7px] rounded-sm bg-accent/10 mb-[2px]">
									<div class="min-w-0">
										<span class="text-foreground font-medium text-[13px] block">{t.abbr}</span>
										{#if t.micro}<span class="text-[10px] text-subtle">{t.micro}</span>{/if}
									</div>
									<span class="text-[10px] text-accent font-semibold tracking-[0.1em] shrink-0 ml-[8px]">✓</span>
								</div>
							{:else}
								<a
									{href}
									on:click={() => { translationOpen = false; }}
									class="flex items-center justify-between px-sm py-[7px] rounded-sm hover:bg-panel-hover transition-colors duration-fast mb-[2px]"
								>
									<div class="min-w-0">
										<span class="text-foreground text-[13px] block">{t.abbr}</span>
										{#if t.micro}<span class="text-[10px] text-subtle">{t.micro}</span>{/if}
									</div>
									<span class="text-[10px] text-subtle shrink-0 ml-[8px]">{t.year}</span>
								</a>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
```

- [ ] **Step 3: Pass `translationId="odr"` where TopBar is used in the ODR reader**

In `src/routes/odr/[book]/[chapter]/[[verse]]/+page.svelte`, find the `<TopBar ...>` usage and add `translationId="odr"`.

- [ ] **Step 4: Run svelte-check**

```bash
npm run check 2>&1 | tail -15
```

- [ ] **Step 5: Verify locally**

```bash
npm run dev
```
Open `http://localhost:5173/odr/genesis/1`. Click the "ODR ▼" picker — should show all live translations. Click "DRC" → should navigate to `/drc/genesis/1`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/TopBar.svelte "src/routes/odr/[book]/[chapter]/[[verse]]/+page.svelte"
git commit -m "feat: live translation picker in TopBar with links to all translations"
```

---

### Task 8: Update sitelinks

**Files:**
- Find where sitelinks are defined (likely in `src/routes/+layout.svelte` or a head component)

- [ ] **Step 1: Find the sitelinks location**

```bash
grep -r "sitelink\|SiteLink\|sameAs" src/ --include="*.svelte" --include="*.ts" -l
```

- [ ] **Step 2: Add sitelinks for the 6 new translation readers**

Following the pattern established by the existing ODR sitelinks, add entries for `/drc/genesis/1`, `/vul/genesis/1`, `/kjv/genesis/1`, `/knox/genesis/1`, `/cpdv/genesis/1`, `/conf/matthew/1` (Confraternity is NT-only, so Matthew is the first book).

- [ ] **Step 3: Run svelte-check and verify**

```bash
npm run check 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add <sitelinks file(s)>
git commit -m "feat: add sitelinks for new translation reader URLs"
```

---

## Self-Review

**Spec coverage:**
- ✓ VUL/DRC/Knox/KJV/CPDV/Confraternity copied at build time (Task 1)
- ✓ Compare mode shows real text per column (Tasks 2–5)
- ✓ Each translation gets its own URL (Task 6)
- ✓ TopBar picker is live with all translations (Task 7)
- ✓ Sitelinks updated (Task 8)
- ✓ NT-only constraint for Confraternity respected (loader returns empty map for OT books; route returns 404)
- ✓ DRC/Knox slug remapping handled in prepare-data.ts (files output under ODR slug names)
- ✓ Storage key bumped to v4 so cached column preferences reset cleanly

**Edge cases handled:**
- Translation source missing → copy skipped with log message (non-fatal)
- Translation has no data for a book → empty verse map → blank cells in compare (no crash)
- Confraternity + OT book → 404 in reader, hidden/skipped in compare
- RSV stays hidden (Konami-only), `live: false` unchanged

**What is NOT in this plan:**
- Study notes / annotations for non-ODR translations (none have them)
- Passing `translationId` to the simple `[translation]` reader's TopBar (that reader has its own minimal nav)
- Prerendering the 6 new reader routes (can be added later if Cloudflare serving is a concern)
