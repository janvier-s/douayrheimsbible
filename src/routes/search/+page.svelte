<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { afterNavigate, goto } from '$app/navigation';
	import { cubicOut } from 'svelte/easing';
	import { prefs } from '$lib/stores/prefs';
	import { parseAllReferences } from '$lib/search/reference';
	import { buildResultGroups, type SearchResultGroup } from '$lib/search/verses';
	export let data: { query: string };

	let reducedMotion = false;

	let inputEl: HTMLInputElement;
	let query = data.query;
	let results: SearchResultGroup[] = [];
	let loading = false;
	let searched = false;
	let debounceTimer: ReturnType<typeof setTimeout>;
	let searchGeneration = 0;
	// Initialized to data.query so afterNavigate doesn't double-search on mount
	let lastDataQuery = data.query;

	const EXAMPLES = ['Matthew 16:18', 'John 6:53-56', 'Luke 1:28, Revelation 12:1'];

	$: isHero = !searched && !query;

	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mq.matches;
		mq.addEventListener('change', (e) => (reducedMotion = e.matches));

		if (inputEl) inputEl.focus();
		if (query) search(query);
	});

	afterNavigate(() => {
		if (data.query !== lastDataQuery) {
			lastDataQuery = data.query;
			query = data.query;
			results = [];
			searched = false;
			loading = false;
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
		// Pre-set so afterNavigate recognises this as an internal update and skips re-search
		lastDataQuery = q.trim();
		const url = new URL(window.location.href);
		if (q.trim()) {
			url.searchParams.set('q', q.trim());
		} else {
			url.searchParams.delete('q');
		}
		goto(url.toString(), { noScroll: true, keepFocus: true });
	}

	function collapseAndFade(_node: HTMLElement) {
		// opacity + translateY — both GPU-composited, no layout reflow per frame.
		// The element stays in document flow until removed (one reflow at the end).
		return {
			duration: reducedMotion ? 0 : 220,
			easing: cubicOut,
			css: (t: number) => `opacity: ${t}; transform: translateY(${(1 - t) * -10}px);`
		};
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

		const gen = ++searchGeneration;
		loading = true;
		try {
			const data = await buildResultGroups(ranges, fetch);
			if (gen !== searchGeneration) return;
			results = data;
			searched = true;
		} catch {
			if (gen !== searchGeneration) return;
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

		// Strip all remaining tags except <i> / </i>
		t = t.replace(/<(?!\/?i\b)[^>]*>/gi, '');

		if (showSmallCaps) {
			t = t.replace(/\uE001(.*?)\uE002/g, '<span class="sc">$1</span>');
		}

		return t.replace(/  +/g, ' ').trim();
	}
</script>

<svelte:head>
	<title>{query ? `${query} | Search` : 'Search'} | ODR Bible</title>
</svelte:head>

<main
	id="main-content"
	class="max-w-[750px] mx-auto px-md font-ui"
	style="padding-top: {isHero ? 'clamp(80px, 16vh, 160px)' : '55px'}; padding-bottom: {isHero
		? '4rem'
		: '0'}; transition: padding-top {reducedMotion ? '0ms' : '260ms'} ease;"
	in:fade={{ duration: reducedMotion ? 0 : 140 }}
>
	<!-- Heading — only visible in hero (empty) state, collapses smoothly on first input -->
	{#if isHero}
		<div class="mb-[1.75rem] text-center" transition:collapseAndFade>
			<p class="font-ui text-[11px] uppercase tracking-[0.3em] text-subtle mb-[8px]">
				Douay-Rheims Bible
			</p>
			<h1
				class="font-reader text-[2.2rem] leading-[1.2] tracking-[-0.01em] text-foreground mb-[14px]"
			>
				Verse Search
			</h1>
			<div class="w-10 h-px bg-accent opacity-70 mx-auto"></div>
		</div>
	{/if}

	<!-- Search bar -->
	<form on:submit|preventDefault={onSubmit} role="search" class="mb-lg">
		<div
			class="border border-border rounded-[10px] p-[8px]"
			style="background: var(--color-search-card);"
		>
			<div
				class="flex items-center gap-[10px] border border-border rounded-[6px] bg-background px-[14px] h-[52px]
					focus-within:border-subtle transition-colors duration-fast"
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
					placeholder="Search for a verse — e.g. Matthew 16:18"
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
		</div>
	</form>

	<!-- Example queries (shown when no results and no query) -->
	{#if isHero}
		<div class="text-center" in:fade={{ duration: reducedMotion ? 0 : 160 }}>
			<p class="text-subtle text-[13px] mb-sm">Try a reference:</p>
			<div class="flex flex-wrap justify-center gap-[8px]">
				{#each EXAMPLES as example}
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

		<!-- No results -->
		{#if searched && !loading && results.length === 0}
			<p
				class="text-subtle text-[14px] text-center"
				in:fade={{ duration: reducedMotion ? 0 : 160 }}
			>
				No referencesThat verse is not found in the Original Douay-Rheims Bible.<br />Try a verse
				like
				<button
					class="text-subtle hover:text-foreground hover:underline"
					on:click={() => onExampleClick('James 2:24')}>James 2:24</button
				>
			</p>
		{/if}

		<!-- Results -->
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
	</div>
</main>
