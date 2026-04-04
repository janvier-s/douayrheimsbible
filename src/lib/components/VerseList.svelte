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
				/<cr>\[(\d+)\]<\/cr>/g,
				(_, n) =>
					`<button class="study-marker" data-marker-type="cross_ref" data-marker="${n}" aria-label="Cross-reference ${n}">${n}</button>`
			)
			.replace(
				/<na>\((\w+)\)<\/na>/g,
				(_, l) =>
					`<button class="study-marker" data-marker-type="note" data-marker="${l}" aria-label="Note ${l}">${l}</button>`
			)
			.replace(
				/<na>\[(\d+)\]<\/na>/g,
				(_, n) =>
					`<button class="study-marker" data-marker-type="note" data-marker="${n}" aria-label="Note ${n}">${n}</button>`
			);
	}

	function renderVerse(
		text: string,
		bionic: boolean,
		isStudy: boolean,
		showItalics: boolean
	): string {
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
					class:text-subtle={!isStudy || !v.has_annotation}
					style={isStudy && v.has_annotation ? 'color: var(--color-accent-text)' : ''}
					>{v.verse}</sup
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
				>
					{@html renderVerse(v.text, bionic, isStudy, showItalics)}
				</p>
			</li>
		{/each}
	</ol>
{/if}

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

	/* Study marker superscript — colored badge so they're visible even when
	   the parent <p> has text-decoration which bleeds through child elements */
	:global(.study-marker) {
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
		/* Default: cross-ref color */
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
	}

	:global(.study-marker[data-marker-type='note']) {
		color: #e56868;
		background: color-mix(in srgb, #e56868 14%, transparent);
	}

	:global(.study-marker:hover) {
		opacity: 0.75;
	}
</style>
