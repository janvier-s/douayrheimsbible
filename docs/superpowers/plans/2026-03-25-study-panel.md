# Study Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Study mode to the Douay-Rheims reader — a permanent resizable side panel with book intro and commentary tabs, plus inline annotation blocks that animate in alongside the panel.

**Architecture:** Three-mode toggle (Reading / Study / Compare) stored in `prefs.readingMode`. Study mode wraps the existing reading column and a new `StudyPanel` in a flex row with a drag divider. Inline `InlineAnnotationBlock` components are mounted after verses in Study mode and animate in/out via a CSS grid trick triggered by `data-mode` on the container.

**Tech Stack:** SvelteKit 2, Svelte (Options API), TypeScript, Tailwind CSS v3, Vitest (CI only — fails locally due to iCloud path spaces; use `npm run build` + `npm run lint` for local verification)

**Spec:** `docs/superpowers/specs/2026-03-25-study-panel-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/data/types.ts` | Modify | Add `InlineAnnotation`, `Annotation`, `BookIntro`; extend `Verse`, `Chapter`, `BookData` |
| `src/lib/stores/prefs.ts` | Modify | Add `readingMode`, `studyPanelWidth` to `ReadingPrefs`; v5 migration |
| `src/lib/stores/studyPanel.ts` | Create | In-memory panel tab state (`activeTab`, `activeIntroIndex`) |
| `src/lib/components/InlineAnnotationBlock.svelte` | Create | Shaded block rendered after a verse; contains one or more `InlineAnnotation` entries |
| `src/lib/components/AnnotatedText.svelte` | Create | Prose renderer: `[n]` marker popovers + collapsible footnote list |
| `src/lib/components/StudyPanel.svelte` | Create | Panel shell: Intro + Commentary tabs, sticky positioning |
| `src/lib/components/VerseList.svelte` | Modify | Mount `InlineAnnotationBlock` after verses that have `inlineAnnotations` in Study mode |
| `src/routes/odr/[book]/[chapter]/[[verse]]/+page.svelte` | Modify | Flex row layout, `data-mode` attribute, drag divider, `StudyPanel` |
| `src/lib/components/TopBar.svelte` | Modify | Three-way mode toggle (Reading · Study · Compare) |

---

## Task 1: Data types

**Files:**
- Modify: `src/lib/data/types.ts`
- Test: `src/lib/data/types.test.ts` (type-level, compile-only)

- [ ] **Step 1: Add new interfaces and extend existing ones**

Replace the entire contents of `src/lib/data/types.ts` with:

```ts
export interface InlineAnnotation {
	marker: string; // letter ('a','b') = footnote; digit ('1','2') = cross-ref
	text: string;
}

export interface Annotation {
	chapter: number;
	verse: number;
	page: number;
	title: string;
	text: string;
	annotations?: InlineAnnotation[];
}

export interface BookIntro {
	title: string;
	text: string;
	annotations?: InlineAnnotation[];
	default?: boolean;
}

export interface Verse {
	verse: number;
	text: string;
	inlineAnnotations?: InlineAnnotation[];
}

export interface Chapter {
	chapter: number;
	summary: string;
	verses: Verse[];
	annotations?: Annotation[];
}

export interface BookData {
	book: string;
	version_abbr: string;
	date: string;
	chapters: Chapter[];
	intros?: BookIntro[];
}

export interface BookMeta {
	/** URL slug e.g. "mark", "1-kings" */
	slug: string;
	/** Display name in the ODR e.g. "Mark", "3 Kings" */
	odrName: string;
	/** Modern English name e.g. "Mark", "1 Kings" */
	modernName: string;
	testament: 'OT' | 'NT';
	/** Total number of chapters */
	chapters: number;
	/** Whether this book has Confraternity data (NT only) */
	hasConfraternity: boolean;
}

/** Returns true if the marker is a cross-reference (numeric), false if footnote (letter) */
export function isCrossRef(marker: string): boolean {
	return /^\d+$/.test(marker);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npm run build 2>&1 | head -30
```

Expected: no type errors related to `types.ts`. Existing code using `Verse`, `Chapter`, `BookData`, `BookMeta` is backward-compatible since all new fields are optional.

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add -f src/lib/data/types.ts
git commit -m "feat: add InlineAnnotation, Annotation, BookIntro types"
```

---

## Task 2: Update prefs store

**Files:**
- Modify: `src/lib/stores/prefs.ts`

- [ ] **Step 1: Add fields to `ReadingPrefs` and `DEFAULTS`, bump version, add v5 migration**

In `src/lib/stores/prefs.ts`:

1. Add to the `ReadingPrefs` interface (after `dyslexiaFont`):
```ts
readingMode: 'reading' | 'study';
studyPanelWidth: string; // CSS width value e.g. '33vw' or '420px'
```

2. Add to `DEFAULTS` object (after `dyslexiaFont: false`):
```ts
readingMode: 'reading',
studyPanelWidth: '33vw'
```

3. Change `const PREFS_VERSION = 4;` → `const PREFS_VERSION = 5;`

4. Add v5 migration block after the existing v4 block (before `parsed._v = PREFS_VERSION;`):
```ts
// v5 migration: add readingMode and studyPanelWidth
if (!parsed._v || parsed._v < 5) {
    parsed.readingMode = 'reading';
    parsed.studyPanelWidth = '33vw';
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add -f src/lib/stores/prefs.ts
git commit -m "feat: add readingMode and studyPanelWidth to prefs (v5)"
```

---

## Task 3: Create studyPanel store

**Files:**
- Create: `src/lib/stores/studyPanel.ts`

- [ ] **Step 1: Create the store**

```ts
// src/lib/stores/studyPanel.ts
import { writable } from 'svelte/store';

export type StudyTab = 'intro' | 'commentary';

export interface StudyPanelState {
	activeTab: StudyTab;
	activeIntroIndex: number;
}

const defaults: StudyPanelState = {
	activeTab: 'intro',
	activeIntroIndex: 0
};

export const studyPanel = writable<StudyPanelState>({ ...defaults });
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add -f src/lib/stores/studyPanel.ts
git commit -m "feat: add studyPanel store"
```

---

## Task 4: Create InlineAnnotationBlock component

**Files:**
- Create: `src/lib/components/InlineAnnotationBlock.svelte`

This component renders the shaded block that appears after a verse in Study mode. It receives all `inlineAnnotations` for a verse and displays them in order: letter-marker (footnote) entries first, then number-marker (cross-ref) entries, each styled appropriately.

- [ ] **Step 1: Create the component**

```svelte
<!-- src/lib/components/InlineAnnotationBlock.svelte -->
<script lang="ts">
	import type { InlineAnnotation } from '$lib/data/types';
	import { isCrossRef } from '$lib/data/types';

	export let annotations: InlineAnnotation[];
</script>

<div class="annotation-wrapper">
	<div class="annotation-inner">
		<div class="my-[6px] rounded-sm border border-border bg-panel px-[10px] py-[8px] text-sm font-ui space-y-[5px]">
			{#each annotations as ann}
				<div class="flex gap-[6px] items-baseline leading-snug">
					<span class="text-accent font-semibold text-[11px] shrink-0 min-w-[16px]">
						({ann.marker})
					</span>
					{#if isCrossRef(ann.marker)}
						<span class="italic text-subtle text-[13px]">{ann.text}</span>
					{:else}
						<span class="text-foreground text-[13px]">{ann.text}</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.annotation-wrapper {
		display: grid;
		grid-template-rows: 0fr;
		opacity: 0;
		transition:
			grid-template-rows 250ms ease,
			opacity 250ms ease;
	}

	:global([data-mode='study']) .annotation-wrapper {
		grid-template-rows: 1fr;
		opacity: 1;
	}

	.annotation-inner {
		overflow: hidden;
	}
</style>
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add -f src/lib/components/InlineAnnotationBlock.svelte
git commit -m "feat: add InlineAnnotationBlock component with grid animation"
```

---

## Task 5: Create AnnotatedText component

**Files:**
- Create: `src/lib/components/AnnotatedText.svelte`

This renders annotated prose (used in both Intro and Commentary). Markers like `[1]` in the text become clickable superscript buttons that open a popover. Below the prose, a disclosure row expands to show all annotations as a numbered list.

- [ ] **Step 1: Create the component**

```svelte
<!-- src/lib/components/AnnotatedText.svelte -->
<script lang="ts">
	import type { InlineAnnotation } from '$lib/data/types';

	export let text: string;
	export let annotations: InlineAnnotation[] = [];

	// Replace [n] markers in text with <button> elements
	function renderText(raw: string): string {
		return raw.replace(/\[(\w+)\]/g, (_, marker) => {
			return `<button class="annotated-marker" data-marker="${marker}">[${marker}]</button>`;
		});
	}

	let openMarker: string | null = null;
	let footnotesExpanded = false;

	function handleTextClick(e: MouseEvent) {
		const btn = (e.target as HTMLElement).closest('[data-marker]') as HTMLElement | null;
		if (!btn) {
			openMarker = null;
			return;
		}
		const marker = btn.dataset.marker ?? null;
		openMarker = openMarker === marker ? null : marker;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') openMarker = null;
	}

	$: activeAnnotation = annotations.find((a) => a.marker === openMarker) ?? null;
	$: footnoteCount = annotations.length;
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<div class="relative" on:click={handleTextClick} role="presentation">
	<div class="font-reader text-[13px] leading-relaxed text-foreground">
		{@html renderText(text)}
	</div>

	{#if openMarker && activeAnnotation}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			class="absolute z-10 left-0 right-0 mt-1 bg-[#2a2a2a] text-[#f0ebe4] text-[11px] font-ui leading-snug rounded px-[10px] py-[8px] shadow-lg"
			role="tooltip"
		>
			<span class="text-accent font-bold mr-[5px]">[{openMarker}]</span>{activeAnnotation.text}
		</div>
	{/if}
</div>

{#if footnoteCount > 0}
	<div class="mt-[10px]">
		<button
			class="text-[11px] font-ui text-subtle hover:text-accent transition-colors duration-fast"
			on:click={() => (footnotesExpanded = !footnotesExpanded)}
		>
			{footnoteCount} note{footnoteCount > 1 ? 's' : ''} {footnotesExpanded ? '▲' : '▼'}
		</button>

		{#if footnotesExpanded}
			<div class="mt-[8px] border-t border-border pt-[8px] space-y-[6px]">
				{#each annotations as ann}
					<div class="flex gap-[6px] text-[11px] font-ui leading-snug">
						<span class="text-accent font-bold shrink-0 min-w-[18px]">[{ann.marker}]</span>
						<span class="text-subtle">{ann.text}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	:global(.annotated-marker) {
		color: var(--color-accent);
		font-size: 10px;
		vertical-align: super;
		cursor: pointer;
		font-family: var(--font-ui);
		background: none;
		border: none;
		padding: 0;
		line-height: 1;
	}
	:global(.annotated-marker:hover) {
		text-decoration: underline;
	}
</style>
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add -f src/lib/components/AnnotatedText.svelte
git commit -m "feat: add AnnotatedText component with popover markers"
```

---

## Task 6: Create StudyPanel component

**Files:**
- Create: `src/lib/components/StudyPanel.svelte`

The panel shell. Sticky-positioned, `height: 100vh`, `overflow-y: auto`. Receives the current `bookData` and `currentChapter` (chapter number from `readingPosition`) as props. Resolves the default intro sub-tab on mount.

- [ ] **Step 1: Create the component**

```svelte
<!-- src/lib/components/StudyPanel.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { studyPanel } from '$lib/stores/studyPanel';
	import { readingPosition } from '$lib/stores/reading';
	import type { BookData } from '$lib/data/types';
	import AnnotatedText from './AnnotatedText.svelte';

	export let bookData: BookData | null = null;

	// Shorten intro titles to tab labels
	function tabLabel(title: string): string {
		if (/argument/i.test(title)) return 'Argument';
		if (/sum.*old/i.test(title)) return 'Sum (OT)';
		if (/sum.*new/i.test(title)) return 'Sum (NT)';
		if (/sum/i.test(title)) return 'Sum';
		if (/moyses|moses/i.test(title)) return 'Of Moyses';
		// Fall back: first two meaningful words
		return title
			.replace(/^the\s+/i, '')
			.split(/\s+/)
			.slice(0, 2)
			.join(' ');
	}

	$: intros = bookData?.intros ?? [];

	// Resolve default intro index on mount or when book changes
	$: {
		const idx = intros.findIndex((i) => i.default);
		studyPanel.update((s) => ({ ...s, activeIntroIndex: idx >= 0 ? idx : 0 }));
	}

	// Commentary: get annotations for current chapter
	$: currentChapterNum = $readingPosition?.chapter ?? 1;
	$: currentChapterData = bookData?.chapters.find((c) => c.chapter === currentChapterNum);
	$: commentaryEntries = currentChapterData?.annotations ?? [];
</script>

<aside
	class="sticky top-0 h-screen overflow-y-auto border-l border-border bg-panel flex flex-col font-ui"
	aria-label="Study panel"
>
	<!-- Top-level tabs -->
	<div class="flex border-b border-border shrink-0">
		{#each (['intro', 'commentary'] as const) as tab}
			<button
				class="flex-1 py-[8px] text-[10px] uppercase tracking-[0.1em] transition-colors duration-fast
					{$studyPanel.activeTab === tab
					? 'text-accent border-b-2 border-accent -mb-px'
					: 'text-subtle hover:text-foreground'}"
				on:click={() => studyPanel.update((s) => ({ ...s, activeTab: tab }))}
			>
				{tab === 'intro' ? 'Intro' : 'Commentary'}
			</button>
		{/each}
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if $studyPanel.activeTab === 'intro'}
			{#if intros.length === 0}
				<p class="p-md text-[12px] text-subtle italic">No introduction available for this book yet.</p>
			{:else}
				<!-- Intro sub-tabs -->
				{#if intros.length > 1}
					<div class="flex border-b border-border bg-background overflow-x-auto shrink-0">
						{#each intros as intro, i}
							<button
								class="px-[10px] py-[6px] text-[10px] whitespace-nowrap transition-colors duration-fast shrink-0
									{$studyPanel.activeIntroIndex === i
									? 'text-accent border-b-2 border-accent -mb-px'
									: 'text-subtle hover:text-foreground'}"
								on:click={() => studyPanel.update((s) => ({ ...s, activeIntroIndex: i }))}
							>
								{tabLabel(intro.title)}
							</button>
						{/each}
					</div>
				{/if}

				<!-- Active intro content -->
				{#if intros[$studyPanel.activeIntroIndex]}
					{@const intro = intros[$studyPanel.activeIntroIndex]}
					<div class="p-md">
						<p class="text-[10px] uppercase tracking-[0.15em] text-accent mb-[10px] font-medium">
							{tabLabel(intro.title)}
						</p>
						<AnnotatedText text={intro.text} annotations={intro.annotations ?? []} />
					</div>
				{/if}
			{/if}
		{:else}
			<!-- Commentary tab -->
			{#if commentaryEntries.length === 0}
				<p class="p-md text-[12px] text-subtle italic">No commentary for this chapter yet.</p>
			{:else}
				<div class="divide-y divide-border">
					{#each commentaryEntries as entry}
						<div class="p-md">
							<p class="text-[11px] font-semibold text-accent mb-[6px]">{entry.title}</p>
							<AnnotatedText text={entry.text} annotations={entry.annotations ?? []} />
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</aside>
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add -f src/lib/components/StudyPanel.svelte
git commit -m "feat: add StudyPanel component (intro + commentary tabs)"
```

---

## Task 7: Update VerseList to render inline annotation blocks

**Files:**
- Modify: `src/lib/components/VerseList.svelte`

In Study mode, mount an `InlineAnnotationBlock` after each verse that has `inlineAnnotations`. In paragraph view, annotation blocks are not shown (paragraph view collapses verse boundaries).

- [ ] **Step 1: Add import and prop**

At the top of the `<script>` block, add:
```ts
import { prefs } from '$lib/stores/prefs';
import InlineAnnotationBlock from './InlineAnnotationBlock.svelte';
```

`prefs` is already imported — only add `InlineAnnotationBlock`.

Also update the type import:
```ts
import type { Verse } from '$lib/data/types';
```
stays the same — `Verse` now optionally has `inlineAnnotations`.

- [ ] **Step 2: Add InlineAnnotationBlock after each verse in list view**

In the `{:else}` branch (the `<ol>` list view), after the closing `</li>` tag inside the `{#each}`, add:

```svelte
{#if $prefs.readingMode === 'study' && v.inlineAnnotations && v.inlineAnnotations.length > 0}
    <InlineAnnotationBlock annotations={v.inlineAnnotations} />
{/if}
```

The full `{:else}` block should look like:

```svelte
{:else}
	<ol class="list-none space-y-[0.7rem]">
		{#each verses as v, i (i)}
			<li
				bind:this={verseEls[v.verse]}
				id="v{v.verse}"
				class="flex gap-sm"
				class:verse-target={targetVerse === v.verse}
				data-pagefind-meta="verse:{bookSlug} {chapterNum}:{v.verse}"
			>
				{#if $prefs.showVerseNumbers}
					<span
						class="text-subtle font-ui text-[13px] font-thin select-none w-6 shrink-0 text-right tabular-nums leading-[var(--line-height-reader)] pt-[0.15em]"
					>
						{v.verse}
					</span>
				{/if}
				<p
					class="font-reader leading-[var(--line-height-reader)] text-[length:var(--font-size-reader)]"
					class:text-justify={$prefs.justifiedText}
				>
					{@html renderVerse(v.text, $prefs.bionicReading && bionicReady)}
				</p>
			</li>
			{#if $prefs.readingMode === 'study' && v.inlineAnnotations && v.inlineAnnotations.length > 0}
				<InlineAnnotationBlock annotations={v.inlineAnnotations} />
			{/if}
		{/each}
	</ol>
{/if}
```

- [ ] **Step 3: Verify build and lint**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npm run build 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add -f src/lib/components/VerseList.svelte
git commit -m "feat: render InlineAnnotationBlock after verses in Study mode"
```

---

## Task 8: Update +page.svelte with Study mode layout

**Files:**
- Modify: `src/routes/odr/[book]/[chapter]/[[verse]]/+page.svelte`

Wrap the reading `<main>` and the new `StudyPanel` in a flex row. Add `data-mode` for the CSS animation. Add the drag divider. Pass `bookData` to the panel.

The existing `+page.svelte` loads `data.bookMeta` and `data.chapter`. It does not currently load the full `BookData` object (which contains `intros`). The `loadBook` function (already imported) returns `BookData`. Use `data.chapter`'s parent book — already available since `loadBook` is called for infinite scroll.

- [ ] **Step 1: Add imports**

Add to the existing imports at the top of `<script>`:
```ts
import { prefs } from '$lib/stores/prefs';
import { debounce } from '$lib/utils/debounce';
import StudyPanel from '$lib/components/StudyPanel.svelte';
```

`debounce` and `loadBook` are already imported.

- [ ] **Step 2: Add panel width state and drag logic**

Add after the existing `let` declarations:

```ts
// Study panel resize
let panelEl: HTMLElement;
let isDragging = false;
let dragStartX = 0;
let dragStartWidth = 0;

const savePanelWidth = debounce((w: string) => {
	prefs.update((p) => ({ ...p, studyPanelWidth: w }));
}, 200);

function onDividerMousedown(e: MouseEvent) {
	isDragging = true;
	dragStartX = e.clientX;
	dragStartWidth = panelEl.offsetWidth;
	e.preventDefault();
}

function onMousemove(e: MouseEvent) {
	if (!isDragging) return;
	const delta = dragStartX - e.clientX; // dragging left = panel grows
	const newWidth = Math.min(
		Math.max(dragStartWidth + delta, 240),
		window.innerWidth * 0.5
	);
	panelEl.style.width = `${newWidth}px`;
	savePanelWidth(`${newWidth}px`);
}

function onMouseup() {
	isDragging = false;
}

// bookDataMap caches full BookData (including intros) keyed by book slug.
// Populated on initial load and each time infinite scroll loads a new book.
let bookDataMap: Record<string, import('$lib/data/types').BookData> = {};
$: currentBookData = bookDataMap[chapters[0]?.bookMeta.slug] ?? null;
```

Populate `bookDataMap` in three places:

**1. In `onMount`**, load the initial book and save it:
```ts
onMount(async () => {
    readingPosition.set({ bookSlug: data.bookMeta.slug, chapter: data.chapter.chapter });
    observeHeadings();
    window.addEventListener('scroll', onScroll, { passive: true });
    // Load initial book data for StudyPanel
    try {
        const initialBook = await loadBook(data.bookMeta.slug, fetch);
        bookDataMap[data.bookMeta.slug] = initialBook;
        bookDataMap = bookDataMap; // trigger Svelte reactivity
    } catch { /* silently ignore */ }
    setTimeout(() => { scrollReady = true; onScroll(); }, 600);
});
```

**2. In `loadNextChapter`**, after `const bookData = await loadBook(...)`:
```ts
bookDataMap[last.bookMeta.slug] = bookData;
bookDataMap = bookDataMap; // trigger reactivity
```

**3. In `loadPrevChapter`**, after `const bookData = await loadBook(...)`:
```ts
bookDataMap[targetBookMeta.slug] = bookData;
bookDataMap = bookDataMap; // trigger reactivity
```

- [ ] **Step 3: Update the template**

Replace the existing `<main ...>` template with:

```svelte
<svelte:window on:mousemove={onMousemove} on:mouseup={onMouseup} />

<div
	class="flex items-start"
	data-mode={$prefs.readingMode}
>
	<main bind:this={container} class="flex-1 min-w-0 px-md py-xl">
		<div class="max-w-[750px] mx-auto">
			{#each chapters as item, i (item.bookMeta.slug + '-' + item.chapter.chapter)}
				<section class={i > 0 ? 'pt-[49px]' : ''}>
					<div
						data-chapter-heading
						data-book-slug={item.bookMeta.slug}
						data-chapter-num={item.chapter.chapter}
					></div>
					<ChapterView
						bookMeta={item.bookMeta}
						chapter={item.chapter}
						targetVerse={item.chapter.chapter === data.chapter.chapter ? data.targetVerse : undefined}
						totalChapters={item.totalChapters}
						showNav={true}
					/>
				</section>
			{/each}
		</div>
	</main>

	{#if $prefs.readingMode === 'study'}
		<!-- Drag divider -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="w-[5px] shrink-0 cursor-col-resize hover:bg-accent/20 transition-colors duration-fast self-stretch"
			on:mousedown={onDividerMousedown}
		></div>

		<!-- Study panel -->
		<div
			bind:this={panelEl}
			style="width: {$prefs.studyPanelWidth}; transition: width 0ms, max-width 250ms ease, opacity 250ms ease;"
			class="shrink-0 overflow-hidden"
		>
			<StudyPanel bookData={currentBookData} />
		</div>
	{/if}
</div>
```

Note: the panel width is applied directly via `style` binding. The mode transition (panel appearing) uses `max-width` on a wrapper, but since we're using `{#if}` to mount/unmount, the animation happens on mount. For the smooth mount animation, wrap the panel `<div>` in a Svelte `transition:` or handle via CSS. Simplest approach: use `{#if}` with no transition for v1 — the panel appears/disappears immediately on mode switch; the inline annotation animation still works via `data-mode`. Add the panel slide transition as a polish step if desired.

- [ ] **Step 4: Verify build**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npm run build 2>&1 | head -50
```

Fix any TypeScript errors. The `bookDataMap` approach may require adjusting the `loadNextChapter` / `loadPrevChapter` functions to save their loaded `BookData` objects.

- [ ] **Step 5: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add "src/routes/odr/[book]/[chapter]/[[verse]]/+page.svelte"
git commit -m "feat: add Study mode layout with panel and drag divider"
```

---

## Task 9: Update TopBar with three-way toggle

**Files:**
- Modify: `src/lib/components/TopBar.svelte`

Replace the current two-button Reading/Compare toggle with a three-button Reading/Study/Compare toggle. TopBar reads `$prefs.readingMode` for active state.

- [ ] **Step 1: Add imports**

Check the existing `<script>` block first — `page` from `$app/stores` is already imported. Add only what is missing:
```ts
import { prefs } from '$lib/stores/prefs';
import { goto } from '$app/navigation';
// import { page } from '$app/stores'; ← already imported, do not duplicate
```

- [ ] **Step 2: Add mode switch handler**

```ts
function setMode(mode: 'reading' | 'study' | 'compare') {
	if (mode === 'compare') {
		goto(`/compare/${bookSlug}/${chapterNum}`);
		return;
	}
	prefs.update((p) => ({ ...p, readingMode: mode }));
	// If currently on /compare, navigate back to ODR
	if ($page.url.pathname.startsWith('/compare')) {
		goto(`/odr/${bookSlug}/${chapterNum}`);
	}
}

$: isCompare = $page.url.pathname.startsWith('/compare');
$: activeMode = isCompare ? 'compare' : $prefs.readingMode;
```

- [ ] **Step 3: Replace the mode toggle markup**

Find this block in TopBar.svelte:
```svelte
<!-- Mode toggle -->
<div
    class="flex items-center text-[11px] font-medium uppercase tracking-[0.1em] rounded-[3px] border border-border overflow-hidden shrink-0"
>
    <span class="px-[9px] py-[5px] bg-interactive text-white border-r border-interactive"
        >Reading</span
    >
    <a
        href="/compare/{bookSlug}/{chapterNum}"
        class="px-[9px] py-[5px] text-subtle hover:text-foreground transition-colors duration-fast"
    >
        Compare
    </a>
</div>
```

Replace with:
```svelte
<!-- Mode toggle -->
<div
    class="flex items-center text-[11px] font-medium uppercase tracking-[0.1em] rounded-[3px] border border-border overflow-hidden shrink-0"
>
    {#each ([['reading', 'Reading'], ['study', 'Study'], ['compare', 'Compare']] as const) as [mode, label]}
        <button
            class="px-[9px] py-[5px] transition-colors duration-fast
                {activeMode === mode
                    ? 'bg-interactive text-white'
                    : 'text-subtle hover:text-foreground'}
                {mode !== 'compare' ? 'border-r border-border' : ''}"
            on:click={() => setMode(mode)}
        >
            {label}
        </button>
    {/each}
</div>
```

- [ ] **Step 4: Verify build and lint**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npm run build 2>&1 | head -40
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add -f src/lib/components/TopBar.svelte
git commit -m "feat: add Study to mode toggle in TopBar"
```

---

## Task 10: Panel slide animation + final wiring

**Files:**
- Modify: `src/routes/odr/[book]/[chapter]/[[verse]]/+page.svelte`

Add the smooth panel mount animation using `max-width` transitions, and verify the full feature works end-to-end.

- [ ] **Step 1: Add panel wrapper with max-width animation**

In `+page.svelte`, replace the panel section from Task 8 with a version that uses `max-width` for the slide-in animation. Wrap the panel and divider in a container that transitions:

```svelte
<!-- Animated panel container -->
<div
    class="flex shrink-0 overflow-hidden"
    style="max-width: {$prefs.readingMode === 'study' ? $prefs.studyPanelWidth : '0'}; opacity: {$prefs.readingMode === 'study' ? '1' : '0'}; transition: max-width 250ms ease, opacity 250ms ease;"
>
    <!-- Drag divider (inside so it slides with panel) -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="w-[5px] shrink-0 cursor-col-resize hover:bg-accent/20 transition-colors duration-fast self-stretch"
        on:mousedown={onDividerMousedown}
    ></div>

    <!-- Study panel -->
    <div
        bind:this={panelEl}
        style="width: {$prefs.studyPanelWidth};"
        class="shrink-0"
    >
        <StudyPanel bookData={currentBookData} />
    </div>
</div>
```

Remove the `{#if $prefs.readingMode === 'study'}` conditional — always render the container, let max-width animate it in/out. `StudyPanel` is always mounted but invisible when in Reading mode (zero width).

- [ ] **Step 2: Verify the full animation works**

Start the dev server and test manually:

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npm run dev
```

Check:
- [ ] Clicking "Study" in TopBar shows panel sliding in from right with text column narrowing
- [ ] Clicking "Reading" reverses the animation
- [ ] Dragging the divider resizes the panel
- [ ] Width persists after page reload
- [ ] `InlineAnnotationBlock` components animate in when switching to Study (they will be empty since no real data exists yet, but the animation should work if you add test data to a verse)
- [ ] Commentary tab shows "No commentary for this chapter yet." placeholder
- [ ] Intro tab shows "No introduction available for this book yet." placeholder

- [ ] **Step 3: Run lint and build**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npm run lint && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Run prettier before committing** (required — CI will fail without it)

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible" && npx prettier --write src/
```

- [ ] **Step 5: Final commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add -f src/lib/components/InlineAnnotationBlock.svelte src/lib/components/AnnotatedText.svelte src/lib/components/StudyPanel.svelte src/lib/components/VerseList.svelte src/lib/components/TopBar.svelte src/lib/stores/prefs.ts src/lib/stores/studyPanel.ts src/lib/data/types.ts
git add "src/routes/odr/[book]/[chapter]/[[verse]]/+page.svelte"
git commit -m "feat: Study mode with panel slide animation and inline annotations"
```

---

## Known Limitations (v1)

- `StudyPanel` receives `bookData` but `intros[]` will be empty for all books until the PDF parsing job produces the data — the "No introduction available" placeholder will show everywhere
- Inline annotation blocks will not appear for any verse until `inlineAnnotations` data is populated by the parser
- Commentary tab similarly shows placeholder until `annotations` data exists
- Study mode is desktop-only; mobile gets the standard Reading experience

These are all data limitations, not implementation gaps. The architecture is complete and ready to receive data.
