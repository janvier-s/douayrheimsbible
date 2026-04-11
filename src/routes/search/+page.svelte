<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { afterNavigate, goto } from '$app/navigation';

	import { prefs } from '$lib/stores/prefs';
	import { parseAllReferences } from '$lib/search/reference';
	import { buildResultGroups, type SearchResultGroup } from '$lib/search/verses';
	import { navOverride } from '$lib/stores/navOverride';
	import type { SearchMode, SearchScope } from './+page';
	import {
		searchVerses,
		searchNotes,
		buildTextResultGroups,
		hydrateResultGroups,
		hydrateNoteResults,
		type TextResultGroup,
		type NoteResult
	} from '$lib/search/text-search';
	import { isAllStopWords, isStopWord } from '$lib/search/expand-query';
	import { tokenize } from '$lib/search/normalize';

	export let data: { query: string; mode: SearchMode; scope: SearchScope };

	let reducedMotion = false;
	let inputEl: HTMLInputElement;
	let query = data.query;
	let mode: SearchMode = data.mode;
	let scope: SearchScope = data.scope;
	let results: SearchResultGroup[] = [];
	let textResults: TextResultGroup[] = [];
	let noteResults: NoteResult[] = [];
	let textTotal = 0;
	let textLimit = 100;
	let stopWordWarning = false;
	let loading = false;
	let searched = false;
	let debounceTimer: ReturnType<typeof setTimeout>;
	let searchGeneration = 0;
	let lastDataQuery = data.query;
	let lastDataMode = data.mode;
	let lastDataScope = data.scope;

	const VERSE_EXAMPLES = ['Matthew 16:18', 'John 6:53-56', 'Luke 1:28, Revelation 12:1'];
	const TEXT_VERSE_EXAMPLES = ['Thou art Peter', 'Full of grace', 'Daily bread'];
	const TEXT_NOTES_EXAMPLES = ['Transubstantiation', 'Original sin'];

	$: currentExamples =
		mode === 'verse'
			? VERSE_EXAMPLES
			: scope === 'notes'
				? TEXT_NOTES_EXAMPLES
				: TEXT_VERSE_EXAMPLES;

	$: placeholder =
		mode === 'verse'
			? 'Search for a verse — e.g. Matthew 16:18'
			: scope === 'notes'
				? 'Search notes & annotations — e.g. transubstantiation'
				: 'Search the Bible — e.g. Thou art Peter';

	$: heading = mode === 'verse' ? 'Verse Search' : 'Text Search';

	$: noResultsMessage =
		mode === 'verse'
			? null
			: scope === 'notes'
				? 'No notes found matching your search.'
				: 'No verses found matching your search.';

	$: isHero = !searched && !query;

	// Keep TopBar nav button in sync with the first result's book/chapter
	$: navOverride.set(
		results.length > 0
			? { bookSlug: results[0].slug, chapter: results[0].chapter }
			: textResults.length > 0
				? { bookSlug: textResults[0].slug, chapter: textResults[0].chapter }
				: null
	);

	onDestroy(() => navOverride.set(null));

	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mq.matches;
		mq.addEventListener('change', (e) => (reducedMotion = e.matches));

		if (inputEl) inputEl.focus();
		if (query) search(query);
	});

	afterNavigate(() => {
		if (
			data.query !== lastDataQuery ||
			data.mode !== lastDataMode ||
			data.scope !== lastDataScope
		) {
			lastDataQuery = data.query;
			lastDataMode = data.mode;
			lastDataScope = data.scope;
			query = data.query;
			mode = data.mode;
			scope = data.scope;
			results = [];
			textResults = [];
			searched = false;
			loading = false;
			textLimit = 100;
			stopWordWarning = false;
			if (query) search(query);
		}
		if (inputEl) inputEl.focus();
	});

	function onInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			updateUrl(query);
			if (query.trim()) {
				search(query);
			} else {
				results = [];
				textResults = [];
				searched = false;
				stopWordWarning = false;
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
		lastDataQuery = q.trim();
		lastDataMode = mode;
		lastDataScope = scope;
		const url = new URL(window.location.href);
		if (q.trim()) {
			url.searchParams.set('q', q.trim());
		} else {
			url.searchParams.delete('q');
		}
		if (mode === 'text') {
			url.searchParams.set('mode', 'text');
			if (scope === 'notes') {
				url.searchParams.set('scope', 'notes');
			} else {
				url.searchParams.delete('scope');
			}
		} else {
			url.searchParams.delete('mode');
			url.searchParams.delete('scope');
		}
		goto(url.toString(), { noScroll: true, keepFocus: true });
	}

	function collapseAndFade(_node: HTMLElement) {
		return {
			duration: reducedMotion ? 0 : 80,
			css: (t: number) => `opacity: ${t};`
		};
	}

	async function search(q: string) {
		const trimmed = q.trim();
		if (!trimmed) return;
		if (mode === 'verse') {
			await searchVerse(trimmed);
		} else {
			await searchText(trimmed);
		}
	}

	async function searchVerse(trimmed: string) {
		const ranges = parseAllReferences(trimmed);
		if (!ranges.length) {
			results = [];
			textResults = [];
			searched = true;
			loading = false;
			return;
		}
		const gen = ++searchGeneration;
		loading = true;
		try {
			const data = await buildResultGroups(ranges, fetch);
			if (gen !== searchGeneration) return;
			results = data;
			textResults = [];
			searched = true;
		} catch {
			if (gen !== searchGeneration) return;
			results = [];
			searched = true;
		}
		loading = false;
	}

	async function searchText(trimmed: string) {
		const tokens = tokenize(trimmed);
		if (isAllStopWords(tokens)) {
			stopWordWarning = true;
			textResults = [];
			results = [];
			searched = true;
			loading = false;
			return;
		}
		stopWordWarning = false;
		const gen = ++searchGeneration;
		loading = true;
		try {
			if (scope === 'verses') {
				const { results: raw, total, queryTokens } = await searchVerses(trimmed, fetch, textLimit);
				if (gen !== searchGeneration) return;
				const groups = buildTextResultGroups(raw);
				textResults = await hydrateResultGroups(groups, queryTokens, fetch);
				noteResults = [];
				textTotal = total;
			} else {
				const { results: raw, total, queryTokens } = await searchNotes(trimmed, fetch, textLimit);
				if (gen !== searchGeneration) return;
				noteResults = await hydrateNoteResults(raw, queryTokens, fetch);
				textResults = [];
				textTotal = total;
			}
			if (gen !== searchGeneration) return;
			results = [];
			searched = true;
		} catch {
			if (gen !== searchGeneration) return;
			textResults = [];
			noteResults = [];
			searched = true;
		}
		loading = false;
	}

	function setMode(newMode: SearchMode) {
		if (newMode === mode) return;
		mode = newMode;
		results = [];
		textResults = [];
		noteResults = [];
		searched = false;
		stopWordWarning = false;
		updateUrl(query);
		if (query.trim()) search(query);
	}

	function setScope(newScope: SearchScope) {
		if (newScope === scope) return;
		scope = newScope;
		textResults = [];
		noteResults = [];
		searched = false;
		stopWordWarning = false;
		updateUrl(query);
		if (query.trim()) search(query);
	}

	function showMore() {
		textLimit += 100;
		if (query.trim()) searchText(query.trim());
	}

	function onExampleClick(example: string) {
		query = example;
		updateUrl(query);
		search(query);
	}

	/** Render verse text for search results: strip cr/na, preserve <i> italics,
	 *  convert <sc> to small-caps span when the preference is enabled. */
	function renderSearchVerse(text: string): string {
		const showSmallCaps = $prefs.showSmallCaps ?? true;

		let t = text.replace(/<cr>[^<]*<\/cr>/g, '').replace(/<na>[^<]*<\/na>/g, '');

		if (showSmallCaps) {
			// Temporarily replace <sc>…</sc> to survive the tag-strip pass
			t = t.replace(/<sc>(.*?)<\/sc>/g, '\uE001$1\uE002');
		} else {
			t = t.replace(/<\/?sc>/g, '');
		}

		// Convert <mn>[N]</mn> to styled superscript markers
		t = t.replace(/<mn>\[?([^\]<]+)\]?<\/mn>/g, '<sup class="search-mn">$1</sup>');

		// Strip all remaining tags except <i> and <sup>
		t = t.replace(/<(?!\/?i\b)(?!\/?sup\b)[^>]*>/gi, '');

		if (showSmallCaps) {
			t = t.replace(/\uE001(.*?)\uE002/g, '<span class="sc">$1</span>');
		}

		return t.replace(/  +/g, ' ').trim();
	}

	/**
	 * Highlight query tokens, giving stop words a muted class unless they are
	 * directly adjacent (only whitespace between) to a non-stop-word highlight.
	 * Collects all match positions first, resolves adjacency, then applies.
	 */
	function applyHighlights(
		text: string,
		queryTokens: string[],
		cls: string,
		mutedCls: string,
		stripVerseTags: boolean
	): string {
		let t = stripVerseTags ? renderSearchVerse(text) : text;
		if (!queryTokens.length) return t;

		const escaped = queryTokens.map((tok) => tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		escaped.sort((a, b) => b.length - a.length);
		const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

		// Collect all match positions with their word boundaries
		interface HitInfo {
			start: number;
			end: number;
			word: string;
			stop: boolean;
		}
		const hits: HitInfo[] = [];

		// For verse text, skip HTML tags
		if (stripVerseTags) {
			const wordRe = /(<[^>]+>)|(\b\w+\b)/g;
			let m: RegExpExecArray | null;
			while ((m = wordRe.exec(t)) !== null) {
				if (m[1]) continue; // skip tags
				const word = m[2];
				if (word && pattern.test(word)) {
					pattern.lastIndex = 0;
					hits.push({
						start: m.index,
						end: m.index + word.length,
						word,
						stop: isStopWord(word.toLowerCase())
					});
				}
			}
		} else {
			let m: RegExpExecArray | null;
			while ((m = pattern.exec(t)) !== null) {
				const word = m[1];
				hits.push({
					start: m.index,
					end: m.index + word.length,
					word,
					stop: isStopWord(word.toLowerCase())
				});
			}
		}

		if (!hits.length) return t;

		// Determine which stop-word hits are adjacent to a non-stop hit.
		// "Adjacent" = only whitespace between the end of one hit and start of the next.
		const promoted = new Set<number>();
		for (let i = 0; i < hits.length; i++) {
			if (!hits[i].stop) {
				promoted.add(i);
				continue;
			}
			const between = (a: number, b: number) => /^\s*$/.test(t.slice(a, b));
			if (i > 0 && !hits[i - 1].stop && between(hits[i - 1].end, hits[i].start)) {
				promoted.add(i);
			} else if (
				i < hits.length - 1 &&
				!hits[i + 1].stop &&
				between(hits[i].end, hits[i + 1].start)
			) {
				promoted.add(i);
			}
		}

		// Apply highlights from end to start so indices stay valid
		for (let i = hits.length - 1; i >= 0; i--) {
			const h = hits[i];
			const c = h.stop && !promoted.has(i) ? mutedCls : cls;
			t = t.slice(0, h.start) + `<mark class="${c}">${h.word}</mark>` + t.slice(h.end);
		}

		return t;
	}

	function highlightNoteTitle(text: string, queryTokens: string[]): string {
		let t = applyHighlights(
			text,
			queryTokens,
			'search-highlight-title',
			'search-highlight-title-muted',
			false
		);
		// Merge adjacent full highlights into a single span
		t = t.replace(/<\/mark>\s+<mark class="search-highlight-title">/g, ' ');
		return t;
	}

	function highlightSearchVerse(text: string, queryTokens: string[]): string {
		return applyHighlights(text, queryTokens, 'search-highlight', 'search-highlight-muted', true);
	}
</script>

<svelte:head>
	<title>{query ? `${query} | ${heading}` : heading} | ODR Bible</title>
</svelte:head>

<main
	id="main-content"
	class="max-w-[750px] mx-auto px-md font-ui"
	style="padding-top: 55px; padding-bottom: {isHero
		? 'calc(4rem + clamp(40px, 12vh, 120px))'
		: '2rem'};"
	in:fade={{ duration: reducedMotion ? 0 : 140 }}
>
	<!-- GPU-composited wrapper: slides down in hero state, no layout reflow -->
	<div
		class="relative"
		style="transform: translateY({isHero
			? 'clamp(40px, 12vh, 120px)'
			: '0px'}); transition: transform {reducedMotion
			? '0ms'
			: '260ms'} cubic-bezier(0.33,1,0.68,1); will-change: transform;"
	>
		<!-- Heading — absolutely positioned above wrapper, zero layout contribution -->
		{#if isHero}
			<div
				class="absolute inset-x-0 text-center pb-[1.75rem]"
				style="bottom: 100%;"
				transition:collapseAndFade
			>
				<p class="font-ui text-[11px] uppercase tracking-[0.3em] text-subtle mb-[8px]">
					Douay-Rheims Bible
				</p>
				<h1
					class="font-reader text-[2.2rem] leading-[1.2] tracking-[-0.01em] text-foreground mb-[14px]"
				>
					{heading}
				</h1>
				<div class="w-10 h-px bg-accent opacity-70 mx-auto"></div>
			</div>
		{/if}

		<!-- Search bar -->
		<form on:submit|preventDefault={onSubmit} role="search" class="mb-lg">
			<div
				class="flex items-center gap-[10px] rounded-[10px] px-[14px] h-[52px] border border-interactive
				focus-within:border-subtle transition-colors duration-fast"
				style="background: var(--color-search-card);"
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					stroke-width="1.7"
					stroke-linecap="round"
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
					{placeholder}
					class="flex-1 bg-transparent border-none outline-none focus:ring-0 font-ui text-[15px] font-light text-foreground min-w-0"
					style="outline: none;"
					autocomplete="off"
					autocorrect="off"
					autocapitalize="off"
					spellcheck="false"
				/>
				<button
					type="submit"
					class="shrink-0 px-[14px] h-[36px] bg-accent text-white rounded-[4px] text-[13px] font-medium
						hover:opacity-90 active:opacity-80 transition-opacity duration-fast"
				>
					Search
				</button>
			</div>
		</form>

		<!-- Mode toggle -->
		<div class="flex justify-center gap-[2px] mb-md -mt-[8px]">
			<button
				class="px-[16px] py-[7px] text-[12px] font-medium uppercase tracking-[0.08em] rounded-l-[4px] transition-colors duration-fast
					{mode === 'verse'
					? 'bg-accent text-white'
					: 'bg-transparent text-subtle hover:text-foreground border border-border'}"
				on:click={() => setMode('verse')}
			>
				Verse Search
			</button>
			<button
				class="px-[16px] py-[7px] text-[12px] font-medium uppercase tracking-[0.08em] rounded-r-[4px] transition-colors duration-fast
					{mode === 'text'
					? 'bg-accent text-white'
					: 'bg-transparent text-subtle hover:text-foreground border border-border'}"
				on:click={() => setMode('text')}
			>
				Text Search
			</button>
		</div>

		{#if mode === 'text'}
			<div class="flex justify-center gap-[2px] mb-md -mt-[4px]">
				<button
					class="px-[12px] py-[5px] text-[11px] font-medium tracking-[0.05em] rounded-l-[3px] transition-colors duration-fast
						{scope === 'verses'
						? 'text-foreground border-b-2 border-accent'
						: 'text-subtle hover:text-foreground'}"
					on:click={() => setScope('verses')}
				>
					Verses
				</button>
				<button
					class="px-[12px] py-[5px] text-[11px] font-medium tracking-[0.05em] rounded-r-[3px] transition-colors duration-fast
						{scope === 'notes'
						? 'text-foreground border-b-2 border-accent'
						: 'text-subtle hover:text-foreground'}"
					on:click={() => setScope('notes')}
				>
					Notes & Annotations
				</button>
			</div>
		{/if}

		<!-- Example queries (shown when no results and no query) -->
		{#if isHero}
			<div class="text-center" in:fade={{ duration: reducedMotion ? 0 : 160 }}>
				<p class="text-subtle text-[13px] mb-sm">Try a reference:</p>
				<div class="flex flex-wrap justify-center gap-[8px]">
					{#each currentExamples as example}
						<button
							class="px-[12px] py-[6px] rounded-[4px] border border-border text-[13px] text-subtle hover:text-foreground transition-colors duration-fast"
							on:click={() => onExampleClick(example)}
						>
							{example}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<div aria-live="polite">
			<!-- Loading -->
			{#if loading}
				<p class="text-subtle text-[13px] text-center">Searching...</p>
			{/if}

			<!-- No results (verse mode) -->
			{#if searched && !loading && mode === 'verse' && results.length === 0}
				<p
					class="text-subtle text-[14px] text-center"
					in:fade={{ duration: reducedMotion ? 0 : 160 }}
				>
					That verse is not found in the Original Douay-Rheims Bible.<br />Try a verse, for example:
					<button
						class="hover:underline"
						style="color: var(--color-accent-text)"
						on:click={() => onExampleClick('James 2:24')}>James 2:24</button
					>
				</p>
			{/if}

			<!-- Verse results -->
			{#if results.length > 0}
				<div class="space-y-[24px]" in:fade={{ duration: reducedMotion ? 0 : 260 }}>
					{#each results as group, groupIdx}
						{#if groupIdx > 0}
							<hr class="border-border" />
						{/if}
						<section class:pl-[2.5rem]={$prefs.showVerseNumbers}>
							<h2
								class="font-ui text-[14px] font-semibold mb-[8px]"
								style="color: var(--color-accent-text)"
							>
								<a
									href="/odr/{group.slug}/{group.chapter}"
									class="hover:text-foreground transition-colors duration-fast"
									on:click={() => prefs.update((p) => ({ ...p, readingMode: 'reading' }))}
								>
									{group.heading}
								</a>
							</h2>
							<div class="space-y-[0.7rem]">
								{#each group.verses as v}
									<div class="relative">
										{#if $prefs.showVerseNumbers}
											<span
												class="absolute right-full pr-[0.5rem] w-[2.5rem] text-right font-ui text-[13px] max-md:text-[10px] font-thin select-none tabular-nums leading-[var(--line-height-reader)] pt-[0.15em] text-subtle"
												>{v.verse}</span
											>
										{/if}
										<p
											class="font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
											class:text-justify={$prefs.justifiedText}
										>
											{@html renderSearchVerse(v.text)}
										</p>
									</div>
								{/each}
							</div>
							<a
								href="/odr/{group.slug}/{group.chapter}"
								class="inline-block mt-[8px] text-[11px] uppercase tracking-[0.15em] text-subtle hover:text-foreground transition-colors duration-fast font-medium"
								on:click={() => prefs.update((p) => ({ ...p, readingMode: 'reading' }))}
							>
								Read full chapter →
							</a>
						</section>
					{/each}
				</div>
			{/if}

			<!-- Text results -->
			{#if textResults.length > 0}
				<div class="space-y-[24px]" in:fade={{ duration: reducedMotion ? 0 : 260 }}>
					{#each textResults as group, groupIdx}
						{#if groupIdx > 0}
							<hr class="border-border" />
						{/if}
						<section class:pl-[2.5rem]={$prefs.showVerseNumbers}>
							<h2
								class="font-ui text-[14px] font-semibold mb-[8px]"
								style="color: var(--color-accent-text)"
							>
								<a
									href="/odr/{group.slug}/{group.chapter}"
									class="hover:text-foreground transition-colors duration-fast"
									on:click={() => prefs.update((p) => ({ ...p, readingMode: 'reading' }))}
								>
									{group.heading}
								</a>
							</h2>
							<div class="space-y-[0.7rem]">
								{#each group.verses as v}
									<div class="relative">
										{#if $prefs.showVerseNumbers}
											<span
												class="absolute right-full pr-[0.5rem] w-[2.5rem] text-right font-ui text-[13px] max-md:text-[10px] font-thin select-none tabular-nums leading-[var(--line-height-reader)] pt-[0.15em] text-subtle"
												>{v.verse}</span
											>
										{/if}
										<p
											class="font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
											class:text-justify={$prefs.justifiedText}
										>
											{@html highlightSearchVerse(v.text, group.queryTokens)}
										</p>
									</div>
								{/each}
							</div>
							<a
								href="/odr/{group.slug}/{group.chapter}"
								class="inline-block mt-[8px] text-[11px] uppercase tracking-[0.15em] text-subtle hover:text-foreground transition-colors duration-fast font-medium"
								on:click={() => prefs.update((p) => ({ ...p, readingMode: 'reading' }))}
							>
								Read full chapter →
							</a>
						</section>
					{/each}

					{#if textTotal > textResults.reduce((n, g) => n + g.verses.length, 0)}
						<div class="text-center pt-sm">
							<button
								class="px-[20px] py-[8px] rounded-[4px] border border-border text-[13px] text-subtle hover:text-foreground transition-colors duration-fast"
								on:click={showMore}
							>
								Show more results ({textTotal} total)
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Note/annotation results -->
			{#if noteResults.length > 0}
				<div class="space-y-[24px]" in:fade={{ duration: reducedMotion ? 0 : 260 }}>
					{#each noteResults as note, noteIdx}
						{#if noteIdx > 0}
							<hr class="border-border" />
						{/if}
						<section>
							<div class="flex items-baseline gap-[8px] mb-[6px]">
								<a
									href="/odr/{note.slug}/{note.chapter}?study={note.verse}"
									class="font-ui text-[14px] font-semibold hover:text-foreground transition-colors duration-fast"
									style="color: var(--color-accent-text)"
									on:click={() => prefs.update((p) => ({ ...p, readingMode: 'study' }))}
								>
									{note.reference}
								</a>
								<span class="font-ui text-[11px] uppercase tracking-[0.1em] text-subtle">
									{note.type === 'annotation' ? 'Annotation' : 'Note'}
								</span>
							</div>
							{#if note.title}
								<p class="font-ui text-[15px] font-medium italic text-foreground mb-[4px]">
									{@html highlightNoteTitle(note.title, note.queryTokens)}
								</p>
							{/if}
							<p
								class="font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)] text-foreground"
								class:text-justify={$prefs.justifiedText}
							>
								{@html highlightSearchVerse(note.noteText, note.queryTokens)}
							</p>
							{#if note.subNotes && note.subNotes.length > 0}
								<div class="mt-[10px] space-y-[2px] border-l-2 border-border pl-[12px]">
									{#each note.subNotes as sub}
										<p class="font-ui text-[13px] leading-[1.5] text-subtle font-light">
											<span
												class="text-[9px] font-semibold align-super mr-[1px]"
												style="color: var(--color-accent-text)">{sub.marker}</span
											>
											{@html highlightSearchVerse(sub.text, note.queryTokens)}
										</p>
									{/each}
								</div>
							{/if}
							{#if note.type === 'note' && note.verseText}
								<p
									class="font-reader text-[length:calc(var(--font-size-reader) * 0.9)] leading-[var(--line-height-reader)] text-subtle mt-[8px] border-l-2 border-border pl-[12px]"
								>
									{@html renderSearchVerse(note.verseText)}
								</p>
							{/if}
						</section>
					{/each}

					{#if textTotal > noteResults.length}
						<div class="text-center pt-sm">
							<button
								class="px-[20px] py-[8px] rounded-[4px] border border-border text-[13px] text-subtle hover:text-foreground transition-colors duration-fast"
								on:click={showMore}
							>
								Show more results ({textTotal} total)
							</button>
						</div>
					{/if}
				</div>
			{/if}

			{#if stopWordWarning}
				<p
					class="text-subtle text-[14px] text-center"
					in:fade={{ duration: reducedMotion ? 0 : 160 }}
				>
					Try a more specific search. Common words like "the" or "and" are too broad.
				</p>
			{/if}

			{#if searched && !loading && mode === 'text' && textResults.length === 0 && noteResults.length === 0 && !stopWordWarning}
				<p
					class="text-subtle text-[14px] text-center"
					in:fade={{ duration: reducedMotion ? 0 : 160 }}
				>
					{noResultsMessage}<br />Try different words, for example:
					<button
						class="italic hover:underline"
						style="color: var(--color-accent-text)"
						on:click={() => onExampleClick(currentExamples[0])}>{currentExamples[0]}</button
					>
				</p>
			{/if}
		</div>
	</div>
</main>
