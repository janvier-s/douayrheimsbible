<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { prefs } from '$lib/stores/prefs';
	import { parseAllReferences } from '$lib/search/reference';
	import { buildResultGroups, type SearchResultGroup } from '$lib/search/verses';
	import { stripTags } from '$lib/utils/text';
	export let data: { query: string };

	let inputEl: HTMLInputElement;
	let query = data.query;
	let results: SearchResultGroup[] = [];
	let loading = false;
	let searched = false;
	let debounceTimer: ReturnType<typeof setTimeout>;
	let searchGeneration = 0;

	const EXAMPLES = ['Matthew 16:18', 'John 6:53-56', 'Luke 1:28, Revelation 12:1'];

	onMount(() => {
		if (inputEl) inputEl.focus();
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
</script>

<svelte:head>
	<title>{query ? `${query} | Search` : 'Search'} | ODR Bible</title>
</svelte:head>

<main
	id="main-content"
	class="max-w-[750px] mx-auto px-md py-xl font-ui"
	in:fade={{ duration: 140 }}
>
	<!-- Search bar -->
	<form on:submit|preventDefault={onSubmit} role="search" class="relative mb-lg">
		<div
			class="flex items-center gap-[10px] border border-border rounded-[6px] bg-panel px-[14px] h-[54px] focus-within:border-subtle transition-colors duration-fast"
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
		</div>
	</form>

	<!-- Example queries (shown when no results and no query) -->
	{#if !searched && !query}
		<div class="text-center">
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
			<p class="text-subtle text-[14px] text-center">
				No references found. Try a verse like <button
					class="text-subtle hover:text-foreground hover:underline"
					on:click={() => onExampleClick('James 2:24')}>James 2:24</button
				>
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
						<h2
							class="font-ui text-[14px] font-semibold mb-[8px]"
							style="color: var(--color-accent-text)"
						>
							<a
								href="/odr/{group.slug}/{group.chapter}"
								class="hover:text-foreground transition-colors duration-fast"
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
										<span
											class="text-subtle font-ui text-[10px] font-light select-none tabular-nums mr-[3px]"
											>{v.verse}</span
										>
									{/if}
									<span>{@html stripTags(v.text)}</span>
								</p>
							{/each}
						</div>
						<a
							href="/odr/{group.slug}/{group.chapter}"
							class="inline-block mt-[8px] text-[11px] uppercase tracking-[0.15em] text-subtle hover:text-foreground transition-colors duration-fast font-medium"
						>
							Read full chapter →
						</a>
					</section>
				{/each}
			</div>
		{/if}
	</div>
</main>
