# Study Mode Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul study mode to display cross-references, inline notes, and annotations from parsed La Salette Bible data, with a synced commentary panel replacing inline annotation blocks.

**Architecture:** Data layer types updated to match the new JSON schema. Annotation sidecars lazy-loaded per chapter. VerseList renders `<cr>`/`<na>` markers as clickable superscript in study mode, strips them in reading mode. StudyPanel rebuilt as a scrollable commentary panel synced to reading position via IntersectionObserver. InlineAnnotationBlock deleted.

**Tech Stack:** SvelteKit, TypeScript, Tailwind CSS. Svelte 4 (legacy mode — `export let` props, `on:click` events, `$:` reactivity, `$store` syntax).

**Note:** Tests cannot run locally due to iCloud path spaces. Steps skip `vitest` invocations. Always run `npx prettier --write <file>` before committing.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/data/types.ts` | Modify | Add CrossRef, VerseNote, SummaryNote, AnnotationNote, AnnotationEntry, ChapterAnnotations. Update Verse, Chapter, BookData. |
| `src/lib/data/loader.ts` | Modify | Add `loadAnnotations()` with in-memory cache. |
| `src/lib/stores/studyPanel.ts` | Modify | Add `activeVerse`, `scrollTrigger`, `ScrollTrigger` type. |
| `src/lib/stores/prefs.ts` | Modify | Add `syncStudyScroll`, `showItalics` prefs (v7 migration). |
| `src/lib/components/AnnotationProse.svelte` | Create | Render annotation text with `<mn>` markers and `\n\n` paragraph breaks. |
| `src/lib/components/VerseList.svelte` | Modify | Tag rendering (strip/superscript), IntersectionObserver, verse/marker click handling. |
| `src/lib/components/ChapterView.svelte` | Modify | Summary `<na>` tag rendering, pass study mode props. |
| `src/lib/components/StudyPanel.svelte` | Modify | Full overhaul — commentary tab with per-verse sections, synced scroll, annotation loading. |
| `src/lib/components/InlineAnnotationBlock.svelte` | Delete | All study content consolidated in panel. |

---

### Task 1: Update TypeScript Types

**Files:**
- Modify: `src/lib/data/types.ts`

- [ ] **Step 1: Replace the types file with the new schema**

Replace the entire contents of `src/lib/data/types.ts`:

```typescript
// ── Cross-references & notes (new schema) ────────────────────────

export interface CrossRef {
	text: string;
}

export interface VerseNote {
	label: string;
	text: string;
}

export interface SummaryNote {
	marker: number;
	text: string;
}

// ── Annotation sidecar types ─────────────────────────────────────

export interface AnnotationNote {
	marker: number;
	text: string;
}

export interface AnnotationEntry {
	verse: number;
	part: number;
	title: string;
	text: string;
	notes: AnnotationNote[];
}

export interface ChapterAnnotations {
	chapter: number;
	annotations: AnnotationEntry[];
}

// ── Legacy inline annotation (kept for intro system) ─────────────

export interface InlineAnnotation {
	marker: string;
	text: string;
}

// ── Core data types ──────────────────────────────────────────────

export interface Verse {
	verse: number;
	text: string;
	has_annotation?: boolean;
	cross_refs?: CrossRef[];
	notes?: VerseNote[];
}

export interface Chapter {
	chapter: number;
	summary?: string;
	summary_notes?: SummaryNote[];
	verses: Verse[];
}

export interface BookData {
	book: string;
	book_title?: string | null;
	hebrew_title?: string | null;
	chapters: Chapter[];
	intros?: BookIntro[];
}

export interface BookIntro {
	title: string;
	text: string;
	annotations?: InlineAnnotation[];
	default?: boolean;
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

Key changes:
- Removed `Annotation` (replaced by `AnnotationEntry` + sidecar loading)
- `Verse.inlineAnnotations` removed; replaced with `has_annotation`, `cross_refs`, `notes`
- `Chapter.summary` is now optional; `Chapter.annotations` removed; added `summary_notes`
- `BookData` no longer has `version_abbr`/`date`; added `book_title`/`hebrew_title`
- `InlineAnnotation` kept (used by `AnnotatedText.svelte` for intros)

- [ ] **Step 2: Format and commit**

```bash
cd /Users/Janvier/Library/Mobile\ Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible
npx prettier --write src/lib/data/types.ts
git add src/lib/data/types.ts
git commit -m "feat(data): update types to match La Salette JSON schema

Add CrossRef, VerseNote, SummaryNote, AnnotationNote, AnnotationEntry,
ChapterAnnotations. Update Verse/Chapter/BookData to new schema.
Remove old Annotation type (replaced by sidecar loading)."
```

---

### Task 2: Add Annotation Loader

**Files:**
- Modify: `src/lib/data/loader.ts`

- [ ] **Step 1: Add `loadAnnotations()` and import new type**

Add the import for `ChapterAnnotations` and the new function at the bottom of `loader.ts`:

```typescript
import type { BookData, Chapter, ChapterAnnotations } from './types';

const bookCache = new Map<string, Promise<BookData>>();
const resolvedCache = new Map<string, BookData>();

/** Fetches the full book JSON with in-memory deduplication (also cached by browser + CDN) */
export function loadBook(slug: string, fetch: typeof globalThis.fetch): Promise<BookData> {
	if (!bookCache.has(slug)) {
		const promise = fetch(`/data/odr/${slug}.json`).then((res) => {
			if (!res.ok) throw new Error(`Book not found: ${slug}`);
			return res.json() as Promise<BookData>;
		});
		promise.then((data) => resolvedCache.set(slug, data));
		bookCache.set(slug, promise);
	}
	return bookCache.get(slug)!;
}

/** Returns already-resolved BookData synchronously, or null if not yet loaded. */
export function getCachedBook(slug: string): BookData | null {
	return resolvedCache.get(slug) ?? null;
}

/** Extracts a single chapter from a loaded book */
export function getChapter(book: BookData, chapterNum: number): Chapter | undefined {
	return book.chapters.find((c) => c.chapter === chapterNum);
}

// ── Annotation sidecar (lazy-loaded per chapter) ─────────────────

const annotationCache = new Map<string, Promise<ChapterAnnotations | null>>();

/** Fetches annotation sidecar for a chapter, with in-memory caching. Returns null on 404. */
export function loadAnnotations(
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<ChapterAnnotations | null> {
	const key = `${slug}/${chapter}`;
	if (!annotationCache.has(key)) {
		const path = `/data/odr/${slug}/annotations/${String(chapter).padStart(3, '0')}.json`;
		const promise = fetch(path).then((res) =>
			res.ok ? (res.json() as Promise<ChapterAnnotations>) : null
		);
		annotationCache.set(key, promise);
	}
	return annotationCache.get(key)!;
}
```

- [ ] **Step 2: Format and commit**

```bash
npx prettier --write src/lib/data/loader.ts
git add src/lib/data/loader.ts
git commit -m "feat(data): add loadAnnotations() for chapter annotation sidecars

Lazy-loads per-chapter annotation JSON from /data/odr/{slug}/annotations/{chapter}.json
with in-memory caching. Returns null on 404."
```

---

### Task 3: Update Study Panel Store

**Files:**
- Modify: `src/lib/stores/studyPanel.ts`

- [ ] **Step 1: Add `activeVerse`, `scrollTrigger`, and `ScrollTrigger` type**

Replace the entire file:

```typescript
// src/lib/stores/studyPanel.ts
import { writable } from 'svelte/store';

export type StudyTab = 'intro' | 'commentary';

export interface ScrollTrigger {
	verse: number; // 0 = summary
	type?: 'cross_ref' | 'note' | 'annotation';
	marker?: string; // e.g. "1", "a"
}

export interface StudyPanelState {
	activeTab: StudyTab;
	activeIntroIndex: number;
	activeVerse: number | null;
	scrollTrigger: ScrollTrigger | null;
}

const defaults: StudyPanelState = {
	activeTab: 'intro',
	activeIntroIndex: 0,
	activeVerse: null,
	scrollTrigger: null
};

export const studyPanel = writable<StudyPanelState>({ ...defaults });
```

- [ ] **Step 2: Format and commit**

```bash
npx prettier --write src/lib/stores/studyPanel.ts
git add src/lib/stores/studyPanel.ts
git commit -m "feat(store): add activeVerse and scrollTrigger to study panel state

activeVerse tracks which verse section is highlighted in the panel.
scrollTrigger drives panel scroll from marker/verse clicks."
```

---

### Task 4: Update Preferences Store

**Files:**
- Modify: `src/lib/stores/prefs.ts`

- [ ] **Step 1: Add `syncStudyScroll` and `showItalics` prefs with v7 migration**

In the `ReadingPrefs` interface, add two new fields after `bionicOpacity`:

```typescript
	// v7
	syncStudyScroll: boolean;
	showItalics: boolean;
```

In `DEFAULTS`, add:

```typescript
	syncStudyScroll: true,
	showItalics: true
```

Change `PREFS_VERSION` to `7`.

Add v7 migration block after the v6 block (after line 82):

```typescript
		// v7 migration: add study sync and italics toggle
		if (!parsed._v || parsed._v < 7) {
			parsed.syncStudyScroll = true;
			parsed.showItalics = true;
		}
```

- [ ] **Step 2: Format and commit**

```bash
npx prettier --write src/lib/stores/prefs.ts
git add src/lib/stores/prefs.ts
git commit -m "feat(prefs): add syncStudyScroll and showItalics preferences (v7)

syncStudyScroll (default true) controls auto-scroll panel with reading position.
showItalics (default true) controls <i> tag rendering in reading mode."
```

---

### Task 5: Create AnnotationProse Component

**Files:**
- Create: `src/lib/components/AnnotationProse.svelte`

- [ ] **Step 1: Create the component**

```svelte
<!-- src/lib/components/AnnotationProse.svelte -->
<script lang="ts">
	import type { AnnotationNote } from '$lib/data/types';

	export let text: string;
	export let notes: AnnotationNote[] = [];

	/** Split on \n\n for paragraph breaks, render <mn> as clickable superscript, keep <i>. */
	function renderParagraphs(raw: string): string[] {
		return raw.split('\n\n').map((p) =>
			p
				.trim()
				.replace(
					/<mn>\[(\d+)\]<\/mn>/g,
					(_, n) =>
						`<button class="mn-marker" data-mn="${n}" aria-label="Marginal note ${n}">${n}</button>`
				)
		);
	}

	let openMn: string | null = null;

	function handleClick(e: MouseEvent) {
		const btn = (e.target as HTMLElement).closest('[data-mn]') as HTMLElement | null;
		if (!btn) {
			openMn = null;
			return;
		}
		const mn = btn.dataset.mn ?? null;
		openMn = openMn === mn ? null : mn;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (openMn && e.key === 'Escape') openMn = null;
	}

	$: paragraphs = renderParagraphs(text);
	$: activeNote = notes.find((n) => String(n.marker) === openMn) ?? null;
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="annotation-prose" on:click={handleClick}>
	{#each paragraphs as para}
		<p class="font-reader text-[13px] leading-relaxed text-foreground">
			{@html para}
		</p>
	{/each}

	{#if openMn && activeNote}
		<div class="mn-popover" role="status" aria-live="polite" aria-atomic="true">
			<span class="mn-popover-marker">{openMn}</span>
			<span class="mn-popover-text">{@html activeNote.text}</span>
		</div>
	{/if}
</div>

<style>
	.annotation-prose {
		position: relative;
	}

	.annotation-prose p + p {
		margin-top: 0.6em;
	}

	:global(.mn-marker) {
		color: var(--color-accent);
		font-size: 9px;
		font-family: var(--font-ui);
		vertical-align: super;
		line-height: 1;
		cursor: pointer;
		border: none;
		background: none;
		padding: 0 1px;
		margin: 0 1px;
		transition: opacity 150ms ease;
	}

	:global(.mn-marker:hover) {
		text-decoration: underline;
	}

	.mn-popover {
		margin-top: 6px;
		background: var(--color-text);
		color: var(--color-bg);
		font-size: 11px;
		font-family: var(--font-ui);
		line-height: 1.5;
		border-radius: 4px;
		padding: 8px 11px;
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.2),
			0 1px 4px rgba(0, 0, 0, 0.12);
	}

	.mn-popover-marker {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--color-accent);
		font-size: 9px;
		font-weight: 700;
		margin-right: 6px;
		vertical-align: baseline;
	}

	.mn-popover-text {
		opacity: 0.9;
	}

	/* Allow <i> tags in annotation prose to render as italic */
	.annotation-prose :global(i) {
		font-style: italic;
	}
</style>
```

- [ ] **Step 2: Format and commit**

```bash
npx prettier --write src/lib/components/AnnotationProse.svelte
git add src/lib/components/AnnotationProse.svelte
git commit -m "feat: add AnnotationProse component for annotation text rendering

Renders annotation text with <mn> markers as clickable superscript,
\n\n as paragraph breaks, <i> as italic. Marginal note popovers
on marker click."
```

---

### Task 6: Update VerseList — Tag Rendering & Interaction

**Files:**
- Modify: `src/lib/components/VerseList.svelte`

- [ ] **Step 1: Update imports and props**

Replace the `<script>` block entirely:

```svelte
<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { prefs } from '$lib/stores/prefs';
	import { studyPanel } from '$lib/stores/studyPanel';
	import type { Verse } from '$lib/data/types';

	export let verses: Verse[];
	export let targetVerse: number | undefined;
	export let bookSlug: string;
	export let chapterNum: number;

	let verseEls: Record<number, HTMLElement> = {};

	// Lazy-load text-vide only when bionic reading is first enabled
	let textVideFn: ((_text: string, _opts: object) => string) | null = null;
	let bionicReady = false;
	$: if ($prefs.bionicReading && !textVideFn) {
		import('text-vide').then((m) => {
			textVideFn = m.textVide;
			bionicReady = true;
		});
	} else if (!$prefs.bionicReading) {
		bionicReady = false;
	}

	function applyBionic(text: string): string {
		if (!textVideFn) return text;
		const fixation = $prefs.bionicFixation ?? 3;
		const saccade = $prefs.bionicSaccade ?? 0;
		const bionic = textVideFn(text, { fixationPoint: fixation });
		if (saccade === 0) return bionic;
		let n = 0;
		return bionic.replace(/<b>([^<]*)<\/b>/g, (_match, inner) => {
			n++;
			return n % (saccade + 1) === 1 ? `<b>${inner}</b>` : inner;
		});
	}

	function applySmallCaps(text: string): string {
		text = text.replace(/\bJESUS CHRIST\b/g, '<span class="sc">Jesus</span> Christ');
		text = text.replace(/\bCHRIST JESUS\b/g, 'Christ <span class="sc">Jesus</span>');
		text = text.replace(/\b[A-Z]{2,}(?:\s+[A-Z]{2,})+\b/g, (match) => {
			const sentenceCase = match.charAt(0) + match.slice(1).toLowerCase();
			return `<span class="sc">${sentenceCase}</span>`;
		});
		text = text.replace(/\b[A-Z]{3,}\b/g, (match) => {
			const titleCase = match.charAt(0) + match.slice(1).toLowerCase();
			return `<span class="sc">${titleCase}</span>`;
		});
		return text;
	}

	/** Strip <cr> and <na> tags+content for reading mode. Optionally strip <i> tags. */
	function stripStudyMarkers(text: string, showItalics: boolean): string {
		let t = text
			.replace(/<cr>[^<]*<\/cr>/g, '')
			.replace(/<na>[^<]*<\/na>/g, '')
			.replace(/  +/g, ' ')
			.trim();
		if (!showItalics) {
			t = t.replace(/<\/?i>/g, '');
		}
		return t;
	}

	/** Render <cr> and <na> content as clickable accent superscript for study mode. */
	function renderStudyMarkers(text: string): string {
		return text
			.replace(
				/<cr>(\[(\d+)\])<\/cr>/g,
				(_, full, n) =>
					`<button class="study-marker" data-marker-type="cross_ref" data-marker="${n}" aria-label="Cross-reference ${n}">${full}</button>`
			)
			.replace(
				/<na>(\((\w+)\))<\/na>/g,
				(_, full, l) =>
					`<button class="study-marker" data-marker-type="note" data-marker="${l}" aria-label="Note ${l}">${full}</button>`
			)
			.replace(
				/<na>(\[(\d+)\])<\/na>/g,
				(_, full, n) =>
					`<button class="study-marker" data-marker-type="note" data-marker="${n}" aria-label="Note ${n}">${full}</button>`
			);
	}

	function renderVerse(text: string, bionic: boolean, isStudy: boolean, showItalics: boolean): string {
		let t = text;
		if (isStudy) {
			t = renderStudyMarkers(t);
		} else {
			t = stripStudyMarkers(t, showItalics);
		}
		return applySmallCaps(bionic ? applyBionic(t) : t);
	}

	// ── Marker click handling ────────────────────────────────────────

	function handleMarkerClick(e: MouseEvent, verseNum: number) {
		const btn = (e.target as HTMLElement).closest('[data-marker-type]') as HTMLElement | null;
		if (!btn) return;
		e.stopPropagation();
		const type = btn.dataset.markerType as 'cross_ref' | 'note';
		const marker = btn.dataset.marker ?? '';
		studyPanel.update((s) => ({
			...s,
			activeTab: 'commentary',
			scrollTrigger: { verse: verseNum, type, marker }
		}));
	}

	// ── Verse click (annotation) ─────────────────────────────────────

	function handleVerseClick(e: MouseEvent, v: Verse) {
		// Don't fire if a marker was clicked (handled above)
		if ((e.target as HTMLElement).closest('[data-marker-type]')) return;
		if (!v.has_annotation) return;
		studyPanel.update((s) => ({
			...s,
			activeTab: 'commentary',
			scrollTrigger: { verse: v.verse, type: 'annotation' }
		}));
	}

	// ── IntersectionObserver for scroll sync ─────────────────────────

	let verseObserver: IntersectionObserver | null = null;

	onMount(() => {
		if (!browser) return;
		verseObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const vNum = parseInt((entry.target as HTMLElement).dataset.verseNum ?? '0');
						if (vNum > 0) {
							studyPanel.update((s) => ({ ...s, activeVerse: vNum }));
						}
					}
				}
			},
			{ rootMargin: '-0% 0px -70% 0px' } // top ~30% of viewport
		);

		// Observe existing verse elements
		for (const [, el] of Object.entries(verseEls)) {
			if (el) verseObserver.observe(el);
		}
	});

	// Re-observe when verses change
	$: if (verseObserver && verses) {
		verseObserver.disconnect();
		for (const [, el] of Object.entries(verseEls)) {
			if (el) verseObserver.observe(el);
		}
	}

	onDestroy(() => {
		verseObserver?.disconnect();
	});

	// Scroll to target verse after navigation
	afterNavigate(() => {
		if (targetVerse && verseEls[targetVerse]) {
			verseEls[targetVerse].scrollIntoView({ behavior: 'instant', block: 'center' });
		}
	});

	$: isStudy = $prefs.readingMode === 'study';
	$: showItalics = $prefs.showItalics;
	$: bionic = $prefs.bionicReading && bionicReady;
</script>
```

- [ ] **Step 2: Update the template**

Replace everything after `</script>` and before `<style>`:

```svelte
{#if $prefs.paragraphView}
	<p
		class="font-reader leading-[var(--line-height-reader)] text-[length:var(--font-size-reader)]"
		class:text-justify={$prefs.justifiedText}
		class:bionic-fade={bionic}
	>
		{#each verses as v, i (i)}
			{#if $prefs.showVerseNumbers}
				<sup
					class="font-ui text-[10px] font-thin select-none mr-[3px] tabular-nums"
					class:text-accent={isStudy && v.has_annotation}
					class:text-subtle={!isStudy || !v.has_annotation}>{v.verse}</sup
				>
			{/if}
			{@html renderVerse(v.text, bionic, isStudy, showItalics)}{' '}
		{/each}
	</p>
{:else}
	<ol class="list-none space-y-[0.7rem]">
		{#each verses as v, i (i)}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
			<li
				bind:this={verseEls[v.verse]}
				id="v{v.verse}"
				data-verse-num={v.verse}
				class="flex gap-sm"
				class:verse-target={targetVerse === v.verse}
				class:verse-annotated={isStudy && v.has_annotation}
				on:click={(e) => isStudy && handleVerseClick(e, v)}
				data-pagefind-meta="verse:{bookSlug} {chapterNum}:{v.verse}"
			>
				{#if $prefs.showVerseNumbers}
					<span
						class="font-ui text-[13px] font-thin select-none w-6 shrink-0 text-right tabular-nums leading-[var(--line-height-reader)] pt-[0.15em]"
						class:text-accent={isStudy && v.has_annotation}
						class:text-subtle={!isStudy || !v.has_annotation}
					>
						{v.verse}
					</span>
				{/if}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
				<p
					class="font-reader leading-[var(--line-height-reader)] text-[length:var(--font-size-reader)]"
					class:text-justify={$prefs.justifiedText}
					class:bionic-fade={bionic}
					on:click={(e) => isStudy && handleMarkerClick(e, v.verse)}
				>
					{@html renderVerse(v.text, bionic, isStudy, showItalics)}
				</p>
			</li>
		{/each}
	</ol>
{/if}
```

- [ ] **Step 3: Update the style block**

Replace the `<style>` block:

```svelte
<style>
	.verse-target {
		box-shadow: inset 3px 0 0 var(--color-accent);
	}

	.verse-annotated {
		cursor: pointer;
	}

	.verse-annotated:hover p {
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}

	.verse-annotated:hover {
		background: color-mix(in srgb, var(--color-accent) 4%, transparent);
		border-radius: 2px;
	}

	:global(.sc) {
		font-variant: small-caps;
	}

	:global(.bionic-fade) {
		color: color-mix(
			in srgb,
			var(--color-text) calc(var(--bionic-opacity, 0.4) * 100%),
			transparent
		);
	}

	:global(.bionic-fade b) {
		font-weight: var(--bionic-bold-weight, 700);
		color: var(--color-text);
	}

	/* Study marker superscript — accent colored, no background */
	:global(.study-marker) {
		color: var(--color-accent);
		font-size: 9px;
		font-family: var(--font-ui);
		vertical-align: super;
		line-height: 1;
		cursor: pointer;
		border: none;
		background: none;
		padding: 0 1px;
		margin: 0 1px;
	}

	:global(.study-marker:hover) {
		text-decoration: underline;
	}
</style>
```

- [ ] **Step 4: Format and commit**

```bash
npx prettier --write src/lib/components/VerseList.svelte
git add src/lib/components/VerseList.svelte
git commit -m "feat: update VerseList with study marker rendering and scroll sync

- Reading mode: strips <cr>/<na> tags and content, optional <i> toggle
- Study mode: renders markers as accent-colored clickable superscript
- IntersectionObserver tracks active verse for panel sync
- Annotated verses: accent verse numbers, pointer cursor, dotted underline hover
- Marker clicks set scrollTrigger to drive panel navigation
- Remove InlineAnnotationBlock usage"
```

---

### Task 7: Update ChapterView — Summary Marker Handling

**Files:**
- Modify: `src/lib/components/ChapterView.svelte`

- [ ] **Step 1: Update `linkifySummary` to handle `<na>` tags**

In `ChapterView.svelte`, update the `linkifySummary` function (currently at line 120) to also handle `<na>` tags based on the reading mode. Add the import for `studyPanel` and update the function:

Add to the imports at the top of the script:

```typescript
	import { studyPanel } from '$lib/stores/studyPanel';
```

Replace the `linkifySummary` function:

```typescript
	function linkifySummary(text: string, isStudy: boolean): string {
		// Summary text is from trusted build-time JSON; we only inject our own tags
		let t = text.replace(/℣\.(\d+)/g, (_, n) => {
			return `<a href="#v${n}" data-verse="${n}" class="summary-verse-ref" aria-label="Verse ${n}">℣.${n}</a>`;
		});
		if (isStudy) {
			// Render <na>[N]</na> as clickable accent superscript
			t = t.replace(
				/<na>(\[(\d+)\])<\/na>/g,
				(_, full, n) =>
					`<button class="study-marker" data-summary-note="${n}" aria-label="Summary note ${n}">${full}</button>`
			);
		} else {
			// Strip <na> tags and content in reading mode
			t = t.replace(/<na>[^<]*<\/na>/g, '');
			t = t.replace(/  +/g, ' ').trim();
		}
		return t;
	}
```

- [ ] **Step 2: Update `handleSummaryClick` to handle summary note markers**

Update `handleSummaryClick` to also handle `[data-summary-note]` clicks:

```typescript
	async function handleSummaryClick(e: MouseEvent) {
		// Summary note marker click → scroll panel to summary section
		const noteBtn = (e.target as HTMLElement).closest('[data-summary-note]') as HTMLElement | null;
		if (noteBtn) {
			e.preventDefault();
			const marker = noteBtn.dataset.summaryNote ?? '';
			studyPanel.update((s) => ({
				...s,
				activeTab: 'commentary',
				scrollTrigger: { verse: 0, type: 'note', marker }
			}));
			return;
		}

		const el = (e.target as HTMLElement).closest('[data-verse]') as HTMLElement | null;
		if (!el?.dataset.verse) return;
		e.preventDefault();
		const n = parseInt(el.dataset.verse);
		activeVerse = n;
		await tick();
		const article = document.querySelector(
			`[data-book="${bookMeta.slug}"][data-chapter="${chapter.chapter}"]`
		);
		(article?.querySelector('#v' + n) as HTMLElement | null)?.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		});
	}
```

- [ ] **Step 3: Update the summary template to pass `isStudy`**

Change the summary `{@html}` line (around line 208) from:

```svelte
			{@html linkifySummary(chapter.summary)}
```

To:

```svelte
			{@html linkifySummary(chapter.summary, $prefs.readingMode === 'study')}
```

- [ ] **Step 4: Format and commit**

```bash
npx prettier --write src/lib/components/ChapterView.svelte
git add src/lib/components/ChapterView.svelte
git commit -m "feat: handle summary <na> markers in ChapterView

- Study mode: render <na>[N]</na> as clickable accent superscript
- Reading mode: strip <na> tags and content
- Summary note clicks set scrollTrigger to navigate panel to verse 0"
```

---

### Task 8: Overhaul StudyPanel

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte`

This is the largest change. The entire file is replaced.

- [ ] **Step 1: Replace StudyPanel.svelte**

```svelte
<script lang="ts">
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import { studyPanel } from '$lib/stores/studyPanel';
	import { readingPosition } from '$lib/stores/reading';
	import { prefs } from '$lib/stores/prefs';
	import { loadAnnotations } from '$lib/data/loader';
	import type { BookData, ChapterAnnotations, AnnotationEntry, Verse } from '$lib/data/types';
	import AnnotatedText from './AnnotatedText.svelte';
	import AnnotationProse from './AnnotationProse.svelte';

	export let bookData: BookData | null = null;

	function tabLabel(title: string): string {
		if (/argument/i.test(title)) return 'Argument';
		if (/sum.*old/i.test(title)) return 'Sum (OT)';
		if (/sum.*new/i.test(title)) return 'Sum (NT)';
		if (/sum/i.test(title)) return 'Sum';
		if (/moyses|moses/i.test(title)) return 'Of Moyses';
		return title
			.replace(/^the\s+/i, '')
			.split(/\s+/)
			.slice(0, 2)
			.join(' ');
	}

	$: intros = bookData?.intros ?? [];

	$: {
		const idx = intros.findIndex((i) => i.default);
		const target = idx >= 0 ? idx : 0;
		if ($studyPanel.activeIntroIndex !== target) {
			studyPanel.update((s) => ({ ...s, activeIntroIndex: target }));
		}
	}

	// ── Current chapter data ─────────────────────────────────────────

	$: currentChapterNum = $readingPosition?.chapter ?? 1;
	$: currentBookSlug = $readingPosition?.bookSlug ?? '';
	$: currentChapterData = bookData?.chapters.find((c) => c.chapter === currentChapterNum);

	// ── Annotation sidecar loading ───────────────────────────────────

	let annotations: ChapterAnnotations | null = null;
	let annotationsLoading = false;
	let lastAnnotationKey = '';

	$: {
		const key = `${currentBookSlug}/${currentChapterNum}`;
		if (key !== lastAnnotationKey && currentBookSlug) {
			lastAnnotationKey = key;
			annotationsLoading = true;
			annotations = null;
			loadAnnotations(currentBookSlug, currentChapterNum, fetch).then((data) => {
				// Only apply if still the same chapter
				if (`${currentBookSlug}/${currentChapterNum}` === key) {
					annotations = data;
					annotationsLoading = false;
				}
			});
		}
	}

	// ── Build verse sections for the commentary tab ──────────────────

	interface VerseSection {
		verse: number;
		label: string;
		verseData: Verse | null;
		annotationEntries: AnnotationEntry[];
	}

	$: verseSections = buildVerseSections(currentChapterData, annotations);

	function buildVerseSections(
		chapter: typeof currentChapterData,
		anns: ChapterAnnotations | null
	): VerseSection[] {
		if (!chapter) return [];
		const sections: VerseSection[] = [];

		// Verse 0 = Summary (if summary has notes)
		if (chapter.summary_notes && chapter.summary_notes.length > 0) {
			sections.push({
				verse: 0,
				label: 'Summary',
				verseData: null,
				annotationEntries: []
			});
		}

		// Verse sections
		for (const v of chapter.verses) {
			const hasCrossRefs = v.cross_refs && v.cross_refs.length > 0;
			const hasNotes = v.notes && v.notes.length > 0;
			const annEntries = anns?.annotations.filter((a) => a.verse === v.verse) ?? [];
			const hasAnnotations = v.has_annotation && annEntries.length > 0;

			if (hasCrossRefs || hasNotes || hasAnnotations) {
				sections.push({
					verse: v.verse,
					label: `Verse ${v.verse}`,
					verseData: v,
					annotationEntries: annEntries
				});
			}
		}

		return sections;
	}

	// ── Synced scroll ────────────────────────────────────────────────

	let panelScroll: HTMLElement;
	let sectionEls: Record<number, HTMLElement> = {};

	$: if (
		browser &&
		$prefs.syncStudyScroll &&
		$studyPanel.activeVerse != null &&
		$studyPanel.activeTab === 'commentary' &&
		panelScroll
	) {
		scrollToSection($studyPanel.activeVerse);
	}

	function scrollToSection(verse: number) {
		const el = sectionEls[verse];
		if (!el || !panelScroll) return;
		const panelTop = panelScroll.getBoundingClientRect().top;
		const elTop = el.getBoundingClientRect().top;
		const offset = elTop - panelTop + panelScroll.scrollTop;
		panelScroll.scrollTo({ top: offset, behavior: 'smooth' });
	}

	// ── ScrollTrigger consumption ────────────────────────────────────

	$: if ($studyPanel.scrollTrigger && panelScroll) {
		handleScrollTrigger($studyPanel.scrollTrigger);
	}

	async function handleScrollTrigger(trigger: NonNullable<typeof $studyPanel.scrollTrigger>) {
		// Switch to commentary tab
		if ($studyPanel.activeTab !== 'commentary') {
			studyPanel.update((s) => ({ ...s, activeTab: 'commentary' }));
			await tick();
		}

		// Scroll to the section
		scrollToSection(trigger.verse);

		// Flash highlight on the specific sub-entry if marker is specified
		await tick();
		if (trigger.marker) {
			const targetId = `panel-${trigger.verse}-${trigger.type}-${trigger.marker}`;
			const targetEl = panelScroll?.querySelector(`[data-panel-id="${targetId}"]`) as HTMLElement | null;
			if (targetEl) {
				targetEl.classList.add('flash-highlight');
				setTimeout(() => targetEl.classList.remove('flash-highlight'), 1500);
			}
		}

		// Consume the trigger
		studyPanel.update((s) => ({ ...s, scrollTrigger: null }));
	}

	// Slider position: 0 = Intro, 1 = Commentary
	$: sliderIndex = $studyPanel.activeTab === 'commentary' ? 1 : 0;
</script>

<aside
	class="panel-root h-full overflow-hidden border-l border-border bg-panel flex flex-col font-ui"
	aria-label="Study panel"
>
	<!-- Panel identity bar -->
	<div class="panel-header shrink-0 flex flex-col">
		<div class="flex items-center justify-center px-[14px] pt-[11px] pb-[10px]">
			<span class="panel-title">Study Notes</span>
		</div>

		<!-- Tabs with sliding underline -->
		<div
			class="tab-row relative flex px-[4px] gap-[2px]"
			role="tablist"
			aria-label="Study panel sections"
		>
			{#each ['intro', 'commentary'] as tab}
				<button
					role="tab"
					aria-selected={$studyPanel.activeTab === tab}
					class="tab-btn flex-1 pb-[9px] pt-[2px]"
					class:tab-active={$studyPanel.activeTab === tab}
					on:click={() => studyPanel.update((s) => ({ ...s, activeTab: tab }))}
				>
					{tab === 'intro' ? 'Intro' : 'Commentary'}
				</button>
			{/each}
			<!-- Single sliding underline -->
			<div
				class="tab-slider"
				style="transform: translateX({sliderIndex * 100}%)"
				aria-hidden="true"
			></div>
		</div>

		<div class="border-b border-border"></div>
	</div>

	<!-- Scrollable content -->
	<div class="panel-scroll flex-1 overflow-y-auto" bind:this={panelScroll}>
		{#if $studyPanel.activeTab === 'intro'}
			{#if intros.length === 0}
				<div class="empty-state">
					<span class="empty-icon" aria-hidden="true">✦</span>
					<p>No introduction for this book yet.</p>
				</div>
			{:else}
				{#if intros.length > 1}
					<div
						class="subtab-row flex overflow-x-auto border-b border-border bg-background shrink-0"
					>
						{#each intros as intro, i}
							<button
								class="subtab-btn px-[12px] py-[7px] whitespace-nowrap transition-colors duration-fast shrink-0 relative"
								class:subtab-active={$studyPanel.activeIntroIndex === i}
								on:click={() => studyPanel.update((s) => ({ ...s, activeIntroIndex: i }))}
							>
								{tabLabel(intro.title)}
							</button>
						{/each}
					</div>
				{/if}

				{#if intros[$studyPanel.activeIntroIndex]}
					{@const intro = intros[$studyPanel.activeIntroIndex]}
					<div class="content-block">
						<p class="content-eyebrow">{tabLabel(intro.title)}</p>
						<AnnotatedText text={intro.text} annotations={intro.annotations ?? []} />
					</div>
				{/if}
			{/if}
		{:else}
			<!-- Commentary tab -->
			{#if annotationsLoading}
				<div class="empty-state">
					<p>Loading commentary...</p>
				</div>
			{:else if verseSections.length === 0}
				<div class="empty-state">
					<span class="empty-icon" aria-hidden="true">✦</span>
					<p>No commentary for this chapter yet.</p>
				</div>
			{:else}
				<div class="commentary-list">
					{#each verseSections as section (section.verse)}
						<div
							class="verse-section"
							class:verse-section-active={$studyPanel.activeVerse === section.verse}
							bind:this={sectionEls[section.verse]}
						>
							<!-- Verse header (sticky for non-summary) -->
							<div
								class="verse-section-header"
								class:verse-section-header-sticky={section.verse !== 0}
							>
								{section.label}
							</div>

							<!-- Summary notes (verse 0) -->
							{#if section.verse === 0 && currentChapterData?.summary_notes}
								<div class="sub-section">
									<div class="sub-section-header">Notes</div>
									{#each currentChapterData.summary_notes as sn}
										<div
											class="note-row"
											data-panel-id="panel-0-note-{sn.marker}"
										>
											<span class="note-marker">[{sn.marker}]</span>
											<span class="note-text">{sn.text}</span>
										</div>
									{/each}
								</div>
							{/if}

							<!-- Cross-references -->
							{#if section.verseData?.cross_refs && section.verseData.cross_refs.length > 0}
								<div class="sub-section">
									<div class="sub-section-header">Cross-references</div>
									{#each section.verseData.cross_refs as cr, ci}
										<div
											class="cr-row"
											data-panel-id="panel-{section.verse}-cross_ref-{ci + 1}"
										>
											<span class="cr-marker">[{ci + 1}]</span>
											<span class="cr-text">{cr.text}</span>
										</div>
									{/each}
								</div>
							{/if}

							<!-- Notes -->
							{#if section.verseData?.notes && section.verseData.notes.length > 0}
								<div class="sub-section">
									<div class="sub-section-header">Notes</div>
									{#each section.verseData.notes as note}
										<div
											class="note-row"
											data-panel-id="panel-{section.verse}-note-{note.label}"
										>
											<span class="note-marker">({note.label})</span>
											<span class="note-text">{@html note.text}</span>
										</div>
									{/each}
								</div>
							{/if}

							<!-- Annotations -->
							{#if section.annotationEntries.length > 0}
								<div class="sub-section">
									<div class="sub-section-header">Annotations</div>
									{#each section.annotationEntries as ann}
										<div
											class="annotation-block"
											data-panel-id="panel-{section.verse}-annotation-{ann.part}"
										>
											<p class="annotation-title">{ann.title}</p>
											<AnnotationProse text={ann.text} notes={ann.notes} />
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</aside>

<style>
	/* ─── Identity bar ──────────────────────────────── */
	.panel-title {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.25em;
		color: var(--color-subtle);
		font-weight: 500;
		user-select: none;
	}

	/* ─── Tabs ──────────────────────────────────────── */
	.tab-row {
		position: relative;
	}

	.tab-btn {
		font-size: 12px;
		font-weight: 400;
		color: var(--color-subtle);
		background: none;
		border: none;
		cursor: pointer;
		letter-spacing: 0.02em;
		transition: color var(--duration-fast);
		font-family: var(--font-ui);
	}

	.tab-btn:hover {
		color: var(--color-text);
	}

	.tab-active {
		color: var(--color-accent);
	}

	.tab-slider {
		position: absolute;
		bottom: 0;
		left: 4px;
		width: calc(50% - 4px);
		height: 2px;
		border-radius: 1px 1px 0 0;
		background: var(--color-accent);
		transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* ─── Sub-tabs ──────────────────────────────────── */
	.subtab-btn {
		font-size: 11px;
		font-weight: 400;
		color: var(--color-subtle);
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-ui);
		transition: color var(--duration-fast);
	}

	.subtab-btn:hover {
		color: var(--color-text);
	}

	.subtab-active {
		color: var(--color-accent);
	}

	/* ─── Scrollable pane ───────────────────────────── */
	.panel-scroll {
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--color-accent) 25%, transparent) transparent;
	}

	.panel-scroll::-webkit-scrollbar {
		width: 4px;
	}

	.panel-scroll::-webkit-scrollbar-track {
		background: transparent;
	}

	.panel-scroll::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--color-accent) 30%, transparent);
		border-radius: 2px;
	}

	.panel-scroll::-webkit-scrollbar-thumb:hover {
		background: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}

	/* ─── Content ───────────────────────────────────── */
	.content-block {
		padding: 16px 18px;
	}

	.content-eyebrow {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: var(--color-accent);
		font-weight: 500;
		margin-bottom: 12px;
	}

	/* ─── Commentary ────────────────────────────────── */
	.commentary-list {
		display: flex;
		flex-direction: column;
	}

	.verse-section {
		border-bottom: 1px solid var(--color-border);
		padding: 0;
		transition: box-shadow 200ms ease;
	}

	.verse-section-active {
		box-shadow: inset 3px 0 0 var(--color-accent);
	}

	.verse-section-header {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-subtle);
		font-weight: 500;
		padding: 12px 18px 6px;
		user-select: none;
	}

	.verse-section-header-sticky {
		position: sticky;
		top: 0;
		background: var(--color-panel);
		z-index: 1;
	}

	.sub-section {
		padding: 4px 18px 12px;
	}

	.sub-section-header {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-subtle);
		margin-bottom: 6px;
	}

	/* Cross-references */
	.cr-row {
		display: flex;
		gap: 7px;
		align-items: baseline;
		line-height: 1.45;
		padding: 2px 0;
	}

	.cr-marker {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		color: var(--color-accent);
		flex-shrink: 0;
		min-width: 18px;
	}

	.cr-text {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-subtle);
		font-style: italic;
	}

	/* Notes */
	.note-row {
		display: flex;
		gap: 7px;
		align-items: baseline;
		line-height: 1.45;
		padding: 2px 0;
	}

	.note-marker {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		color: var(--color-accent);
		flex-shrink: 0;
		min-width: 18px;
	}

	.note-text {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-muted);
	}

	/* Allow <i> inside note text */
	.note-text :global(i) {
		font-style: italic;
	}

	/* Annotations */
	.annotation-block {
		padding: 4px 0 8px;
	}

	.annotation-block + .annotation-block {
		border-top: 1px solid var(--color-border);
		margin-top: 4px;
		padding-top: 8px;
	}

	.annotation-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-accent);
		margin-bottom: 6px;
		font-family: var(--font-reader);
		font-style: italic;
	}

	/* Flash highlight for scroll-triggered entries */
	:global(.flash-highlight) {
		animation: flash 1.5s ease-out;
	}

	@keyframes flash {
		0% {
			background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		}
		100% {
			background: transparent;
		}
	}

	/* ─── Empty state ───────────────────────────────── */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 48px 20px;
		text-align: center;
	}

	.empty-icon {
		font-size: 18px;
		color: color-mix(in srgb, var(--color-accent) 35%, transparent);
		display: block;
	}

	.empty-state p {
		font-size: 13px;
		color: var(--color-subtle);
		font-style: italic;
		line-height: 1.5;
	}
</style>
```

- [ ] **Step 2: Format and commit**

```bash
npx prettier --write src/lib/components/StudyPanel.svelte
git add src/lib/components/StudyPanel.svelte
git commit -m "feat: overhaul StudyPanel with commentary tab and synced scroll

- Commentary tab: per-verse sections with cross-refs, notes, annotations
- Lazy-loads annotation sidecar per chapter via loadAnnotations()
- Synced scroll: reactive on activeVerse from IntersectionObserver
- ScrollTrigger: marker/verse clicks drive panel to specific entries
- Flash highlight on triggered entries
- Summary treated as verse 0 with its own notes section
- Sticky headers per verse section (except summary)"
```

---

### Task 9: Delete InlineAnnotationBlock

**Files:**
- Delete: `src/lib/components/InlineAnnotationBlock.svelte`

- [ ] **Step 1: Verify no remaining imports**

```bash
cd /Users/Janvier/Library/Mobile\ Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible
grep -r "InlineAnnotationBlock" src/
```

This should return zero results (VerseList was already updated in Task 6 to remove the import and usage).

- [ ] **Step 2: Delete the file**

```bash
rm src/lib/components/InlineAnnotationBlock.svelte
```

- [ ] **Step 3: Commit**

```bash
git add -A src/lib/components/InlineAnnotationBlock.svelte
git commit -m "chore: delete InlineAnnotationBlock (study content consolidated in panel)"
```

---

### Task 10: Verify Build and Manual Test

- [ ] **Step 1: Run the build**

```bash
cd /Users/Janvier/Library/Mobile\ Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible
npm run build
```

Fix any TypeScript or build errors.

- [ ] **Step 2: Run the dev server and verify**

```bash
npm run dev
```

Open `http://localhost:5173/odr/genesis/1` in the browser. Check:

1. **Reading mode**: Verse text shows no `[1]` or `(a)` markers. `<i>` tags render as italic (unless toggled off).
2. **Study mode**: Markers appear as accent-colored superscript. Verses with annotations have accent-colored verse numbers and show pointer cursor + dotted underline on hover.
3. **Commentary panel**: Shows per-verse sections with cross-references, notes, and annotations. Sticky headers per verse.
4. **Scroll sync**: Scrolling through verses in the main column updates the highlighted section in the panel.
5. **Marker clicks**: Clicking a `[1]` superscript scrolls the panel to the cross-reference entry.
6. **Verse clicks**: Clicking an annotated verse scrolls the panel to its annotation section.
7. **Summary markers**: In study mode, summary `[N]` markers are clickable and scroll to the Summary section in the panel.

- [ ] **Step 3: Final format check and commit if needed**

```bash
npx prettier --write src/lib/components/*.svelte src/lib/data/*.ts src/lib/stores/*.ts
```

If any files changed, commit the formatting fix.
