<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { prefs } from '$lib/stores/prefs';
	import { studyPanel } from '$lib/stores/studyPanel';
	import { readingPosition } from '$lib/stores/reading';
	import MarkerPopover from '$lib/components/MarkerPopover.svelte';
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
		// Convert source <sc>...</sc> tags (used in ODR text for proper small caps)
		text = text.replace(/<sc>(.*?)<\/sc>/g, '<span class="sc">$1</span>');
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

	/** Render <cr> and <na> content as clickable accent superscript for study mode.
	 *  Handles multi-marker patterns like [1][2], [1](d), (a)(a), (a)[1].
	 *  Embeds data-verse so hover can look up content without DOM traversal. */
	function renderStudyMarkers(text: string, verseNum: number): string {
		function mkCr(n: string) {
			return `<button class="study-marker" data-marker-type="cross_ref" data-marker="${n}" data-verse="${verseNum}" aria-label="Cross-reference ${n}">${n}</button>`;
		}
		function mkNote(l: string) {
			return `<button class="study-marker" data-marker-type="note" data-marker="${l}" data-verse="${verseNum}" aria-label="Note ${l}">${l}</button>`;
		}

		// <cr> may contain [N] cross-refs and (x) note refs mixed together
		text = text.replace(/<cr>(.*?)<\/cr>/g, (_, content) => {
			const buttons: string[] = [];
			for (const m of content.matchAll(/\[(\d+)\]/g)) buttons.push(mkCr(m[1]));
			for (const m of content.matchAll(/\((\w+)\)/g)) buttons.push(mkNote(m[1]));
			return buttons.length > 0 ? buttons.join('') : content;
		});

		// <na> may contain (x) note refs and [N] refs mixed together
		text = text.replace(/<na>(.*?)<\/na>/g, (_, content) => {
			const buttons: string[] = [];
			for (const m of content.matchAll(/\((\w+)\)/g)) buttons.push(mkNote(m[1]));
			for (const m of content.matchAll(/\[(\d+)\]/g)) buttons.push(mkNote(m[1]));
			return buttons.length > 0 ? buttons.join('') : content;
		});

		return text;
	}

	function renderVerse(
		text: string,
		bionic: boolean,
		isStudy: boolean,
		showItalics: boolean,
		verseNum: number,
		smallCaps: boolean,
		expandAmpersand: boolean
	): string {
		let t = text;
		if (expandAmpersand) t = t.replace(/&amp;/g, 'and').replace(/&/g, 'and');
		if (isStudy) {
			t = renderStudyMarkers(t, verseNum);
		} else {
			t = stripStudyMarkers(t, showItalics);
		}
		const t2 = bionic ? applyBionic(t) : t;
		return smallCaps ? applySmallCaps(t2) : t2;
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
			annotatedVerse: verseNum,
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
			annotatedVerse: v.verse,
			scrollTrigger: { verse: v.verse, type: 'annotation' }
		}));
	}

	// ── Marker hover popover ─────────────────────────────────────────

	interface PopoverState {
		label: string;
		content: string;
		type: 'cross_ref' | 'note';
	}

	let openPopover: PopoverState | null = null;
	let popoverAnchorEl: HTMLElement | null = null;
	let hoverTimer: ReturnType<typeof setTimeout> | null = null;

	/** Split concatenated Bible references onto separate lines.
	 *  Detects new reference starts: ". " followed by a capital+lowercase word
	 *  (e.g. "Isa.", "Ezech.") or a digit-prefix book (e.g. "1. Cor.", "2. Reg."). */
	function splitCrossRefLines(text: string): string {
		return text.replace(/\.\s+(?=\d+\.\s+[A-Z]|[A-Z][a-z])/g, '.\n').trim();
	}

	function resolveMarkerContent(btn: HTMLElement): PopoverState | null {
		const type = btn.dataset.markerType as 'cross_ref' | 'note';
		const marker = btn.dataset.marker ?? '';
		const verseNum = parseInt(btn.dataset.verse ?? '0');
		const verse = verseNum > 0 ? verses.find((v) => v.verse === verseNum) : null;
		if (!verse) return null;

		if (type === 'cross_ref') {
			const idx = parseInt(marker) - 1;
			const ref = verse.cross_refs?.[idx];
			if (!ref) return null;
			return { label: marker, content: splitCrossRefLines(ref.text), type };
		} else {
			const note = verse.notes?.find(
				(n) => n.label === marker || n.label === `(${marker})` || n.label === `[${marker}]`
			);
			if (!note) return null;
			return { label: note.label, content: note.text, type };
		}
	}

	function handleMarkerMouseover(e: Event) {
		const btn = (e.target as HTMLElement).closest('.study-marker') as HTMLElement | null;
		if (!btn) return;
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}
		const data = resolveMarkerContent(btn);
		if (!data) return;
		openPopover = data;
		popoverAnchorEl = btn;
	}

	function handleMarkerMouseout(e: Event) {
		const btn = (e.target as HTMLElement).closest('.study-marker') as HTMLElement | null;
		if (!btn) return;
		schedulePopoverDismiss();
	}

	function schedulePopoverDismiss() {
		hoverTimer = setTimeout(() => {
			openPopover = null;
			popoverAnchorEl = null;
			hoverTimer = null;
		}, 120);
	}

	function cancelPopoverDismiss() {
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}
	}

	function dismissPopover() {
		cancelPopoverDismiss();
		openPopover = null;
		popoverAnchorEl = null;
	}

	// ── IntersectionObserver for scroll sync ─────────────────────────

	let verseObserver: IntersectionObserver | null = null;
	// Suppress activeVerse updates while programmatically scrolling the reader
	// to avoid triggering a redundant panel re-scroll.
	let programmaticReaderScroll = false;
	let programmaticReaderScrollTimer: ReturnType<typeof setTimeout> | null = null;
	// Track all currently-intersecting verses so we can always pick the topmost one.
	// This fixes scroll-up: multiple verses may intersect simultaneously and the last
	// entry in the batch is not reliably the topmost one.
	const intersectingReaderVerses = new Map<number, number>(); // verse → boundingClientRect.top

	onMount(async () => {
		mounted = true;
		// Let the reactive {#each} re-render with isStudy=true before observing.
		await tick();
		if (!browser) return;
		verseObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const vNum = parseInt((entry.target as HTMLElement).dataset.verseNum ?? '0');
					if (vNum <= 0) continue;
					if (entry.isIntersecting) {
						intersectingReaderVerses.set(vNum, entry.boundingClientRect.top);
					} else {
						intersectingReaderVerses.delete(vNum);
					}
				}
				if (programmaticReaderScroll || intersectingReaderVerses.size === 0) return;
				// Pick the topmost intersecting verse (smallest top value)
				const active = [...intersectingReaderVerses.entries()].sort((a, b) => a[1] - b[1])[0][0];
				// Clear annotatedVerse on free scroll so the underline doesn't persist on
				// the wrong verse as the user scrolls past verses they didn't select.
				studyPanel.update((s) => ({ ...s, activeVerse: active, annotatedVerse: null }));
			},
			{ rootMargin: '-0% 0px -70% 0px' } // top ~30% of viewport
		);

		// Observe existing verse elements
		for (const [, el] of Object.entries(verseEls)) {
			if (el) verseObserver.observe(el);
		}
	});

	// Re-observe when verses change.
	// Disconnect first so we don't double-observe if Svelte re-runs this block.
	// intersectingReaderVerses is cleared so stale verse positions don't linger.
	// verseEls entries are kept — bind:this keeps them current; the loop below
	// re-registers only live elements (el is non-null for mounted nodes).
	$: if (verseObserver && verses) {
		verseObserver.disconnect();
		intersectingReaderVerses.clear();
		for (const [, el] of Object.entries(verseEls)) {
			if (el) verseObserver.observe(el);
		}
	}

	onDestroy(() => {
		verseObserver?.disconnect();
		if (hoverTimer) clearTimeout(hoverTimer);
		if (programmaticReaderScrollTimer) clearTimeout(programmaticReaderScrollTimer);
	});

	// Scroll to target verse after navigation
	afterNavigate(() => {
		if (targetVerse && verseEls[targetVerse]) {
			verseEls[targetVerse].scrollIntoView({ behavior: 'instant', block: 'center' });
		}
	});

	// Panel→reader sync: scroll the reader window when the panel observer moves to a verse.
	// Reads panelScrollVerse (not annotatedVerse) — the panel observer sets this field so
	// free panel scrolling drives reader scroll without triggering the verse underline.
	// Guard with chapterNum/bookSlug so only the active chapter's VerseList scrolls
	// (with infinite scroll, multiple VerseList instances can be in the DOM at once).
	$: syncPanelVerse = $studyPanel.panelScrollVerse;
	$: isActiveChapter =
		bookSlug === $readingPosition?.bookSlug && chapterNum === $readingPosition?.chapter;
	$: if (browser && $prefs.annotationSync && syncPanelVerse != null && isActiveChapter) {
		const el = verseEls[syncPanelVerse];
		if (el) {
			programmaticReaderScroll = true;
			if (programmaticReaderScrollTimer) clearTimeout(programmaticReaderScrollTimer);
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			programmaticReaderScrollTimer = setTimeout(() => {
				programmaticReaderScroll = false;
			}, 800);
		}
	}

	// mounted gate: keeps isStudy false during SSR/pre-render (where readingMode
	// defaults to 'reading'), so the hydrated HTML matches the pre-rendered HTML.
	// After onMount fires, isStudy flips to the real value → triggers {#each}
	// re-render → renderStudyMarkers runs and injects the marker buttons.
	let mounted = false;
	$: isStudy = mounted && $prefs.readingMode === 'study';
	$: showItalics = $prefs.showItalics;
	$: showSmallCaps = $prefs.showSmallCaps ?? true;
	$: bionic = $prefs.bionicReading && bionicReady;
	$: expandAmpersand = $prefs.expandAmpersand ?? false;
</script>

{#if $prefs.paragraphView}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<p
		class="font-reader leading-[var(--line-height-reader)] text-[length:var(--font-size-reader)]"
		class:text-justify={$prefs.justifiedText}
		class:bionic-fade={bionic}
		on:mouseover={isStudy ? handleMarkerMouseover : undefined}
		on:focus={isStudy ? handleMarkerMouseover : undefined}
		on:mouseout={isStudy ? handleMarkerMouseout : undefined}
		on:blur={isStudy ? handleMarkerMouseout : undefined}
	>
		{#each verses as v (v.verse)}
			<!-- inline anchor for intersection observer + scroll target -->
			<span
				bind:this={verseEls[v.verse]}
				id="v{v.verse}"
				data-verse-num={v.verse}
				class:verse-active-annotation={isStudy &&
					v.has_annotation &&
					$studyPanel.annotatedVerse === v.verse}
			>
				{#if $prefs.showVerseNumbers}
					<sup
						class="font-ui text-[10px] font-thin select-none mr-[3px] tabular-nums"
						class:text-subtle={!isStudy || !v.has_annotation}
						style={isStudy && v.has_annotation ? 'color: var(--color-accent-text)' : ''}
						>{v.verse}</sup
					>
				{/if}
				{@html renderVerse(
					v.text,
					bionic,
					isStudy,
					showItalics,
					v.verse,
					showSmallCaps,
					expandAmpersand
				)}{' '}
			</span>
		{/each}
	</p>
{:else}
	<ol class="list-none space-y-[0.7rem]">
		{#each verses as v (v.verse)}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
			<li
				bind:this={verseEls[v.verse]}
				id="v{v.verse}"
				data-verse-num={v.verse}
				class="flex gap-sm max-md:gap-0"
				class:verse-target={targetVerse === v.verse}
				class:verse-annotated={isStudy && v.has_annotation}
				class:verse-active-annotation={isStudy &&
					v.has_annotation &&
					$studyPanel.annotatedVerse === v.verse}
				on:click={(e) => isStudy && handleVerseClick(e, v)}
				data-pagefind-meta="verse:{bookSlug} {chapterNum}:{v.verse}"
			>
				{#if $prefs.showVerseNumbers}
					<span
						class="font-ui text-[13px] max-md:text-[10px] font-thin select-none w-6 max-md:w-fit max-md:mr-[5px] shrink-0 text-right tabular-nums leading-[var(--line-height-reader)] pt-[0.15em] max-md:pt-[0.25em]"
						class:text-subtle={!isStudy || !v.has_annotation}
						style={isStudy && v.has_annotation ? 'color: var(--color-accent-text)' : ''}
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
					on:mouseover={isStudy ? handleMarkerMouseover : undefined}
					on:focus={isStudy ? handleMarkerMouseover : undefined}
					on:mouseout={isStudy ? handleMarkerMouseout : undefined}
					on:blur={isStudy ? handleMarkerMouseout : undefined}
				>
					{@html renderVerse(
						v.text,
						bionic,
						isStudy,
						showItalics,
						v.verse,
						showSmallCaps,
						expandAmpersand
					)}
				</p>
			</li>
		{/each}
	</ol>
{/if}

<MarkerPopover
	anchorEl={popoverAnchorEl}
	visible={!!openPopover}
	on:dismiss={() => dismissPopover()}
	on:mouseenter={cancelPopoverDismiss}
	on:mouseleave={schedulePopoverDismiss}
>
	{#if openPopover}
		<span class="marker-popover-content">{@html openPopover.content}</span>
	{/if}
</MarkerPopover>

<style>
	.verse-target {
		box-shadow: inset 3px 0 0 var(--color-accent);
	}

	.verse-annotated {
		cursor: pointer;
	}

	.verse-annotated p {
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-accent-text) 60%, transparent);
	}

	.verse-annotated:hover p {
		text-decoration-style: solid;
		text-decoration-color: var(--color-accent-text);
	}

	.verse-annotated:hover {
		background: color-mix(in srgb, var(--color-accent) 4%, transparent);
		border-radius: 2px;
	}

	/* List view active annotation underline */
	.verse-active-annotation p,
	.verse-active-annotation.verse-annotated p {
		text-decoration: underline;
		text-decoration-style: solid;
		text-underline-offset: 3px;
		text-decoration-color: var(--color-accent-text);
	}

	/* List view active annotation background */
	.verse-active-annotation {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		border-radius: 2px;
	}

	/* Paragraph view - target the inline span directly */
	p .verse-active-annotation {
		text-decoration: underline;
		text-decoration-style: solid;
		text-underline-offset: 3px;
		text-decoration-color: var(--color-accent-text);
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

	/* Study marker superscript — colored badge so they're visible even when
	   the parent <p> has text-decoration which bleeds through child elements */
	:global(.study-marker) {
		position: relative;
		font-size: 8px;
		font-family: var(--font-ui);
		font-weight: 600;
		vertical-align: super;
		line-height: 1;
		cursor: pointer;
		border: none;
		padding: 1px 3px;
		margin: 0 1px;
		border-radius: 2px;
		color: var(--color-accent-text);
		background: color-mix(in srgb, var(--color-accent-text) 14%, transparent);
	}

	@media (pointer: coarse) {
		:global(.study-marker::before) {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			min-width: 44px;
			min-height: 44px;
		}
	}

	:global(.study-marker:hover) {
		opacity: 0.75;
	}

	:global(.marker-popover-content) {
		opacity: 0.9;
		white-space: pre-line;
	}
</style>
