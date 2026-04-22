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
	let filtersOpen = false;
	let filterCentury: number | 'all' | 'other' = 'all';
	let filterEra: 'all' | 'ante-nicene' | 'nicene' | 'post-nicene' = 'all';
	let filterTradition: 'all' | 'eastern' | 'western' | 'syriac' = 'all';
	let filterAuthors: Set<string> = new Set();
	let expandAll = false;
	let authorDropdownOpen = false;

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

	/** Strip honorific prefixes for sorting: St., Bl., Ven., Pope, etc. */
	function sortKey(name: string): string {
		return name.replace(/^(St\.|Bl\.|Ven\.|Pope|Abp\.|Bp\.)\s+/i, '').toLowerCase();
	}

	$: allEntries = chapterData.pericopes.flatMap((p) => p.entries);

	// Count entries per author
	$: authorEntryCounts = (() => {
		const counts: Record<string, number> = {};
		for (const e of allEntries) {
			counts[e.author] = (counts[e.author] ?? 0) + 1;
		}
		return counts;
	})();

	$: chapterAuthorsAll = [...new Set(allEntries.map((e) => e.author))].sort((a, b) =>
		sortKey(a).localeCompare(sortKey(b))
	);

	// Separate authors from documents for grouped dropdown
	$: documentNames = new Set(allEntries.filter((e) => e.isDocument).map((e) => e.author));
	$: chapterAuthors = chapterAuthorsAll.filter((a) => !documentNames.has(a));
	$: chapterDocuments = chapterAuthorsAll.filter((a) => documentNames.has(a));

	// Available filter values based on current chapter entries (for dimming unavailable chips)
	$: availableCenturies = new Set(
		allEntries.map((e) => getAuthorMeta(e.author).century).filter(Boolean)
	);
	$: hasOtherCentury = [...availableCenturies].some((c) => typeof c === 'number' && c >= 9);
	$: availableEras = new Set(allEntries.map((e) => getAuthorMeta(e.author).era).filter(Boolean));
	$: availableTraditions = new Set(
		allEntries.map((e) => getAuthorMeta(e.author).tradition).filter(Boolean)
	);

	$: hasFilter =
		filterCentury !== 'all' ||
		filterEra !== 'all' ||
		filterTradition !== 'all' ||
		filterAuthors.size > 0;

	$: filterCount =
		(filterCentury !== 'all' ? 1 : 0) +
		(filterEra !== 'all' ? 1 : 0) +
		(filterTradition !== 'all' ? 1 : 0) +
		(filterAuthors.size > 0 ? 1 : 0);

	function clearFilters() {
		filterCentury = 'all';
		filterEra = 'all';
		filterTradition = 'all';
		filterAuthors = new Set();
	}

	function toggleAuthor(author: string) {
		const next = new Set(filterAuthors);
		if (next.has(author)) next.delete(author);
		else next.add(author);
		filterAuthors = next;
	}

	function entryMatches(e: FathersEntry): boolean {
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
		if (filterAuthors.size > 0 && !filterAuthors.has(e.author)) return false;
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

	function chipClass(active: boolean, available: boolean = true) {
		if (!available && !active) {
			return `px-[8px] py-[3px] rounded-[3px] text-[11px] font-medium border transition-colors duration-fast border-border text-border cursor-not-allowed opacity-40`;
		}
		return `px-[8px] py-[3px] rounded-[3px] text-[11px] font-medium border transition-colors duration-fast
			${active ? 'bg-interactive text-white border-interactive' : 'border-border text-subtle hover:text-foreground hover:border-foreground/30'}`;
	}
</script>

<div class="flex flex-col h-full overflow-hidden">
	<!-- ── Toolbar row ────────────────────────────────────────── -->
	<div class="shrink-0 border-b border-border px-sm py-[8px] bg-panel flex items-center gap-[8px]">
		<button
			class="text-[11px] font-medium px-[8px] py-[4px] rounded-[3px] border transition-colors duration-fast
				{filtersOpen
				? 'bg-interactive text-white border-interactive'
				: 'border-border text-subtle hover:text-foreground'}"
			on:click={() => (filtersOpen = !filtersOpen)}
		>
			Filters{filterCount > 0 ? ` (${filterCount})` : ''}
		</button>

		{#if hasFilter}
			<button
				class="text-[11px] text-subtle hover:text-accent transition-colors duration-fast"
				on:click={clearFilters}
			>
				Clear filters
			</button>
		{/if}

		<div class="ml-auto flex items-center gap-[8px]">
			<button
				class="text-[11px] font-medium px-[8px] py-[4px] rounded-[3px] border transition-colors duration-fast
					{expandAll
					? 'bg-interactive text-white border-interactive'
					: 'border-border text-subtle hover:text-foreground'}"
				on:click={() => (expandAll = !expandAll)}
			>
				{expandAll ? 'Collapse' : 'Expand all'}
			</button>
			<span class="text-[11px] text-subtle">
				{chapterData.totalEntries}
				{chapterData.totalEntries === 1 ? 'entry' : 'entries'}
			</span>
		</div>
	</div>

	<!-- ── Collapsible filter panel ───────────────────────────── -->
	{#if filtersOpen}
		<div class="shrink-0 border-b border-border px-sm py-[10px] bg-panel/80 filter-grid">
			<!-- Century -->
			<span class="filter-label">Century</span>
			<div class="flex items-center gap-[5px] flex-wrap">
				<button class={chipClass(filterCentury === 'all')} on:click={() => (filterCentury = 'all')}
					>All</button
				>
				{#each CENTURIES as c}
					{@const avail = availableCenturies.has(c)}
					<button
						class={chipClass(filterCentury === c, avail)}
						on:click={() => avail && (filterCentury = c)}
					>
						{c === 1 ? '1st' : c === 2 ? '2nd' : c === 3 ? '3rd' : `${c}th`}
					</button>
				{/each}
				<button
					class={chipClass(filterCentury === 'other', hasOtherCentury)}
					on:click={() => hasOtherCentury && (filterCentury = 'other')}>9th+</button
				>
			</div>

			<!-- Era -->
			<span class="filter-label">Era</span>
			<div class="flex items-center gap-[5px] flex-wrap">
				<button class={chipClass(filterEra === 'all')} on:click={() => (filterEra = 'all')}
					>All</button
				>
				{#each ERAS as { key, label }}
					{@const avail = availableEras.has(key)}
					<button
						class={chipClass(filterEra === key, avail)}
						on:click={() => avail && (filterEra = key)}>{label}</button
					>
				{/each}
			</div>

			<!-- Tradition -->
			<span class="filter-label">Tradition</span>
			<div class="flex items-center gap-[5px] flex-wrap">
				<button
					class={chipClass(filterTradition === 'all')}
					on:click={() => (filterTradition = 'all')}>All</button
				>
				{#each TRADITIONS as { key, label }}
					{@const avail = availableTraditions.has(key)}
					<button
						class={chipClass(filterTradition === key, avail)}
						on:click={() => avail && (filterTradition = key)}>{label}</button
					>
				{/each}
			</div>

			<!-- Authors & Documents -->
			<span class="filter-label" style="white-space: normal; line-height: 1.3;"
				>Authors &amp;<br />Documents</span
			>
			<div class="flex items-center gap-[5px] flex-wrap">
				<div class="relative">
					<button
						class="text-[11px] px-[8px] py-[3px] rounded-[3px] border transition-colors duration-fast
							{filterAuthors.size > 0
							? 'bg-interactive text-white border-interactive'
							: 'border-border text-subtle hover:text-foreground'}"
						on:click={() => (authorDropdownOpen = !authorDropdownOpen)}
					>
						{filterAuthors.size > 0 ? `${filterAuthors.size} selected` : 'Select'}
						<span class="text-[9px] opacity-70 ml-[3px]">{authorDropdownOpen ? '▲' : '▼'}</span>
					</button>
					{#if authorDropdownOpen}
						<div
							class="absolute top-full left-0 mt-[2px] bg-panel border border-border rounded-sm shadow-md z-20 max-h-[240px] overflow-y-auto w-[260px]"
						>
							{#if chapterAuthors.length > 0}
								<p
									class="px-[8px] pt-[6px] pb-[2px] text-[9px] uppercase tracking-[0.15em] text-subtle font-semibold"
								>
									Authors
								</p>
								{#each chapterAuthors as author}
									{@const selected = filterAuthors.has(author)}
									<label
										class="flex items-center gap-[6px] px-[8px] py-[4px] text-[12px] text-foreground hover:bg-accent/10 cursor-pointer transition-colors duration-fast"
									>
										<input
											type="checkbox"
											checked={selected}
											on:change={() => toggleAuthor(author)}
											class="accent-accent"
										/>
										<span class="flex-1 truncate">{author}</span>
										<span class="text-[10px] text-subtle shrink-0"
											>{authorEntryCounts[author] ?? 0}</span
										>
									</label>
								{/each}
							{/if}
							{#if chapterDocuments.length > 0}
								<p
									class="px-[8px] pt-[6px] pb-[2px] text-[9px] uppercase tracking-[0.15em] text-subtle font-semibold border-t border-border/30 mt-[4px]"
								>
									Documents
								</p>
								{#each chapterDocuments as doc}
									{@const selected = filterAuthors.has(doc)}
									<label
										class="flex items-center gap-[6px] px-[8px] py-[4px] text-[12px] text-foreground italic hover:bg-accent/10 cursor-pointer transition-colors duration-fast"
									>
										<input
											type="checkbox"
											checked={selected}
											on:change={() => toggleAuthor(doc)}
											class="accent-accent"
										/>
										<span class="flex-1 truncate">{doc}</span>
										<span class="text-[10px] text-subtle shrink-0"
											>{authorEntryCounts[doc] ?? 0}</span
										>
									</label>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
				{#if filterAuthors.size > 0}
					<button
						class="text-[10px] text-subtle hover:text-accent"
						on:click={() => (filterAuthors = new Set())}>clear</button
					>
				{/if}
			</div>
		</div>
	{/if}

	<!-- ── Pericope groups ────────────────────────────────────── -->
	<div class="flex-1 overflow-y-auto styled-scroll">
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
					<!-- Pericope header (no backdrop-blur for Firefox perf) -->
					<div class="sticky top-0 z-10 bg-panel border-b border-border/30 px-sm py-[8px]">
						<div class="flex items-center justify-between">
							<span class="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
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
							<p class="text-[9px] uppercase tracking-[0.15em] text-subtle font-medium mb-[4px]">
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

<style>
	.filter-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 8px 10px;
		align-items: center;
	}

	.filter-label {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-subtle);
		font-weight: 500;
		text-align: left;
		white-space: nowrap;
	}
</style>
