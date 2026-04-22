<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { FathersChapterFile, FathersEntry } from '$lib/data/fathers-types';
	import { getAuthorMeta } from '$lib/data/fathers-authors';
	import { displayVerseRef } from '$lib/utils/fathers-display';
	import { prefs } from '$lib/stores/prefs';
	import FathersEntryCard from './FathersEntryCard.svelte';

	export let chapterData: FathersChapterFile;
	export let selectedVerse: number | null;

	const dispatch = createEventDispatcher<{ filteredCounts: Record<number, number> | null }>();

	// ── Filter state ──────────────────────────────────────────────────
	let filterCentury: number | 'all' | 'other' = 'all';
	let filterEra: 'all' | 'ante-nicene' | 'nicene' | 'post-nicene' = 'all';
	let filterTradition: 'all' | 'eastern' | 'western' | 'syriac' = 'all';
	let filterSource: 'all' | 'accs' | 'fkb' = 'all';
	let filterAuthor = '';
	let expandAll = false;
	let authorInput = '';
	let authorSuggestOpen = false;

	const CENTURIES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
	const ERAS = [
		{ key: 'ante-nicene', label: 'Ante-Nicene' },
		{ key: 'nicene', label: 'Nicene' },
		{ key: 'post-nicene', label: 'Post-Nicene' }
	] as const;
	const TRADITIONS = [
		{ key: 'eastern', label: 'Eastern' },
		{ key: 'western', label: 'Western' },
		{ key: 'syriac', label: 'Syriac' }
	] as const;

	$: chapterAuthors = [
		...new Set(chapterData.pericopes.flatMap((p) => p.entries.map((e) => e.author)))
	].sort();

	$: hasFkb = chapterData.pericopes.some((p) => p.entries.some((e) => e.source === 'fkb'));

	$: authorSuggestions =
		authorInput.length >= 2
			? chapterAuthors
					.filter((a) => a.toLowerCase().includes(authorInput.toLowerCase()))
					.slice(0, 8)
			: [];

	$: hasFilter =
		filterCentury !== 'all' ||
		filterEra !== 'all' ||
		filterTradition !== 'all' ||
		filterSource !== 'all' ||
		filterAuthor !== '';

	function clearFilters() {
		filterCentury = 'all';
		filterEra = 'all';
		filterTradition = 'all';
		filterSource = 'all';
		filterAuthor = '';
		authorInput = '';
	}

	function entryMatches(e: FathersEntry): boolean {
		if (filterSource !== 'all' && e.source !== filterSource) return false;
		const meta = getAuthorMeta(e.author);
		if (filterCentury !== 'all') {
			if (filterCentury === 'other') {
				if (!meta.century || meta.century < 9) return false;
			} else {
				if (meta.century !== filterCentury) return false;
			}
		}
		if (filterEra !== 'all' && meta.era !== filterEra) return false;
		if (filterTradition !== 'all' && meta.tradition !== filterTradition) return false;
		if (filterAuthor && e.author !== filterAuthor) return false;
		return true;
	}

	function entryIsHighlighted(e: FathersEntry): boolean {
		if (selectedVerse === null) return false;
		if (e.subVerseNum !== null) return e.subVerseNum === selectedVerse;
		return false;
	}

	function entryIsDimmed(e: FathersEntry): boolean {
		if (!hasFilter) return false;
		return !entryMatches(e);
	}

	$: annotatedPericopes = chapterData.pericopes.map((p) => {
		const verseInRange =
			selectedVerse !== null && selectedVerse >= p.startVerse && selectedVerse <= p.endVerse;
		return { ...p, verseInRange };
	});

	// Dispatch filtered counts for verse list badge dimming
	$: {
		if (!hasFilter) {
			dispatch('filteredCounts', null);
		} else {
			const counts: Record<number, number> = {};
			for (const p of chapterData.pericopes) {
				for (const entry of p.entries) {
					if (!entryMatches(entry)) continue;
					if (entry.subVerseNum !== null) {
						counts[entry.subVerseNum] = (counts[entry.subVerseNum] ?? 0) + 1;
					} else {
						for (let v = p.startVerse; v <= p.endVerse; v++) {
							counts[v] = (counts[v] ?? 0) + 1;
						}
					}
				}
			}
			dispatch('filteredCounts', counts);
		}
	}

	function chipClass(active: boolean) {
		return `px-[8px] py-[3px] rounded-[3px] text-[11px] font-medium border transition-colors duration-fast
			${active ? 'bg-interactive text-white border-interactive' : 'border-border text-subtle hover:text-foreground hover:border-foreground/30'}`;
	}
</script>

<div class="flex flex-col h-full overflow-hidden">
	<!-- ── Filter bar ─────────────────────────────────────────── -->
	<div class="shrink-0 border-b border-border px-sm py-[10px] space-y-[8px] bg-panel">
		<!-- Row 1: Century chips -->
		<div class="flex items-center gap-[5px] flex-wrap">
			<span
				class="text-[9px] uppercase tracking-[0.15em] text-subtle font-medium mr-[2px] shrink-0"
				>Century</span
			>
			<button class={chipClass(filterCentury === 'all')} on:click={() => (filterCentury = 'all')}
				>All</button
			>
			{#each CENTURIES as c}
				<button class={chipClass(filterCentury === c)} on:click={() => (filterCentury = c)}>
					{c === 1 ? '1st' : c === 2 ? '2nd' : c === 3 ? '3rd' : `${c}th`}
				</button>
			{/each}
			<button
				class={chipClass(filterCentury === 'other')}
				on:click={() => (filterCentury = 'other')}>9th+</button
			>
		</div>

		<!-- Row 2: Era chips -->
		<div class="flex items-center gap-[5px] flex-wrap">
			<span
				class="text-[9px] uppercase tracking-[0.15em] text-subtle font-medium mr-[2px] shrink-0"
				>Era</span
			>
			<button class={chipClass(filterEra === 'all')} on:click={() => (filterEra = 'all')}
				>All</button
			>
			{#each ERAS as { key, label }}
				<button class={chipClass(filterEra === key)} on:click={() => (filterEra = key)}
					>{label}</button
				>
			{/each}
		</div>

		<!-- Row 3: Tradition chips -->
		<div class="flex items-center gap-[5px] flex-wrap">
			<span
				class="text-[9px] uppercase tracking-[0.15em] text-subtle font-medium mr-[2px] shrink-0"
				>Tradition</span
			>
			<button
				class={chipClass(filterTradition === 'all')}
				on:click={() => (filterTradition = 'all')}>All</button
			>
			{#each TRADITIONS as { key, label }}
				<button
					class={chipClass(filterTradition === key)}
					on:click={() => (filterTradition = key)}>{label}</button
				>
			{/each}
		</div>

		<!-- Row 4: Source toggle + Author + Expand all -->
		<div class="flex items-center gap-[8px]">
			{#if hasFkb}
				<div class="flex items-center gap-[3px] shrink-0">
					<button
						class={chipClass(filterSource === 'all')}
						on:click={() => (filterSource = 'all')}>All</button
					>
					<button
						class={chipClass(filterSource === 'accs')}
						on:click={() => (filterSource = 'accs')}>ACCS</button
					>
					<button
						class={chipClass(filterSource === 'fkb')}
						on:click={() => (filterSource = 'fkb')}>FKB</button
					>
				</div>
			{/if}

			<!-- Author input -->
			<div class="relative flex-1">
				<input
					type="text"
					placeholder="Filter by author..."
					class="w-full text-[12px] px-[8px] py-[4px] rounded-[3px] border border-border bg-background text-foreground
						placeholder-subtle focus:outline-none focus:border-accent transition-colors duration-fast"
					bind:value={authorInput}
					on:focus={() => (authorSuggestOpen = true)}
					on:blur={() => setTimeout(() => (authorSuggestOpen = false), 150)}
					on:input={() => {
						if (authorInput === '') filterAuthor = '';
					}}
				/>
				{#if filterAuthor}
					<button
						class="absolute right-[6px] top-1/2 -translate-y-1/2 text-subtle hover:text-foreground text-[11px]"
						on:click={() => {
							filterAuthor = '';
							authorInput = '';
						}}
					>
						&#x2715;
					</button>
				{/if}
				{#if authorSuggestOpen && authorSuggestions.length > 0}
					<div
						class="absolute top-full left-0 right-0 mt-[2px] bg-panel border border-border rounded-sm shadow-md z-20 max-h-[180px] overflow-y-auto"
					>
						{#each authorSuggestions as a}
							<button
								class="w-full text-left px-[8px] py-[5px] text-[12px] text-foreground hover:bg-accent/10 transition-colors duration-fast"
								on:click={() => {
									filterAuthor = a;
									authorInput = a;
									authorSuggestOpen = false;
								}}
							>
								{a}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<button
				class="shrink-0 text-[11px] font-medium px-[8px] py-[4px] rounded-[3px] border transition-colors duration-fast
					{expandAll
					? 'bg-interactive text-white border-interactive'
					: 'border-border text-subtle hover:text-foreground'}"
				on:click={() => (expandAll = !expandAll)}
			>
				{expandAll ? 'Collapse' : 'Expand all'}
			</button>

			{#if hasFilter}
				<button
					class="shrink-0 text-[11px] text-subtle hover:text-accent transition-colors duration-fast"
					on:click={clearFilters}
				>
					Clear
				</button>
			{/if}
		</div>
	</div>

	<!-- ── Pericope groups ────────────────────────────────────── -->
	<div class="flex-1 overflow-y-auto">
		{#if chapterData.pericopes.length === 0}
			<div class="p-lg text-center text-subtle text-[14px]">
				<p>No patristic commentary available for this chapter.</p>
			</div>
		{:else}
			{#each annotatedPericopes as pericope}
				{@const pericopeEntries = pericope.entries}
				{@const matchingCount = hasFilter
					? pericopeEntries.filter(entryMatches).length
					: pericopeEntries.length}

				<div class="border-b border-border/50 last:border-b-0">
					<!-- Sticky pericope header -->
					<div
						class="sticky top-0 z-10 bg-panel/95 backdrop-blur-sm border-b border-border/30 px-sm py-[8px]"
					>
						<div class="flex items-center justify-between">
							<span
								class="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle"
							>
								{displayVerseRef(pericope.verseRef, $prefs.modernBookNames)}
							</span>
							<span class="text-[10px] text-subtle">
								{matchingCount}
								{matchingCount === 1 ? 'entry' : 'entries'}
								{#if hasFilter && matchingCount < pericopeEntries.length}
									<span class="text-border">/ {pericopeEntries.length}</span>
								{/if}
							</span>
						</div>
						{#if pericope.pericopeTitle}
							<p class="text-[12px] font-medium text-foreground/80 mt-[2px]">
								{pericope.pericopeTitle}
							</p>
						{/if}
					</div>

					<!-- Overview text -->
					{#if pericope.overview && expandAll}
						<div class="px-sm py-[8px] bg-accent/5 border-b border-border/20">
							<p
								class="text-[9px] uppercase tracking-[0.15em] text-subtle font-medium mb-[4px]"
							>
								Overview
							</p>
							<p class="text-[13px] leading-relaxed text-foreground/80 italic">
								{pericope.overview}
							</p>
						</div>
					{/if}

					<!-- Entries -->
					<div class="px-sm py-[8px] space-y-[8px]">
						{#each pericopeEntries as entry}
							<FathersEntryCard
								{entry}
								highlighted={pericope.verseInRange && entryIsHighlighted(entry)}
								dimmed={entryIsDimmed(entry)}
								forceOpen={expandAll}
							/>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
