<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { FathersEntry } from '$lib/data/fathers-types';
	import { getAuthorMeta } from '$lib/data/fathers-authors';
	import {
		CENTURIES,
		ERAS,
		TRADITIONS,
		chipClass,
		sortKey,
		createEmptyFilter,
		hasActiveFilter,
		filterCount,
		type FathersFilterState
	} from './fathersFilterUtils';

	export let allEntries: FathersEntry[];
	export let totalEntries: number;
	export let expandAll: boolean;

	const dispatch = createEventDispatcher<{
		filterChange: FathersFilterState;
		expandAllChange: boolean;
	}>();

	// ── Filter state ──────────────────────────────────────────────────
	let filtersOpen = false;
	let authorDropdownOpen = false;
	let authorDropdownEl: HTMLElement;

	function handleWindowClick(e: MouseEvent) {
		if (authorDropdownOpen && authorDropdownEl && !authorDropdownEl.contains(e.target as Node)) {
			authorDropdownOpen = false;
		}
	}
	let filter: FathersFilterState = createEmptyFilter();

	$: hasFilter = hasActiveFilter(filter);
	$: activeFilterCount = filterCount(filter);

	// Dispatch on any filter change
	$: dispatch('filterChange', filter);

	function clearFilters() {
		filter = createEmptyFilter();
	}

	function toggleAuthor(author: string) {
		const next = new Set(filter.authors);
		if (next.has(author)) next.delete(author);
		else next.add(author);
		filter = { ...filter, authors: next };
	}

	function setCentury(c: typeof filter.century) {
		filter = { ...filter, century: c };
	}

	function setEra(e: typeof filter.era) {
		filter = { ...filter, era: e };
	}

	function setTradition(t: typeof filter.tradition) {
		filter = { ...filter, tradition: t };
	}

	// ── Derived data from entries ─────────────────────────────────────
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

	$: documentNames = new Set(allEntries.filter((e) => e.isDocument).map((e) => e.author));
	$: chapterAuthors = chapterAuthorsAll.filter((a) => !documentNames.has(a));
	$: chapterDocuments = chapterAuthorsAll.filter((a) => documentNames.has(a));

	$: availableCenturies = new Set(
		allEntries.map((e) => getAuthorMeta(e.author).century).filter(Boolean)
	);
	$: hasOtherCentury = [...availableCenturies].some((c) => typeof c === 'number' && c >= 9);
	$: availableEras = new Set(allEntries.map((e) => getAuthorMeta(e.author).era).filter(Boolean));
	$: availableTraditions = new Set(
		allEntries.map((e) => getAuthorMeta(e.author).tradition).filter(Boolean)
	);
</script>

<svelte:window on:click={handleWindowClick} />

<!-- ── Toolbar row ────────────────────────────────────────── -->
<div class="shrink-0 border-b border-border px-sm py-[8px] bg-panel flex items-center gap-[8px]">
	<button
		class="text-[11px] font-medium px-[8px] py-[4px] rounded-[3px] border transition-colors duration-fast
			{filtersOpen
			? 'bg-interactive text-white border-interactive'
			: 'border-border text-subtle hover:text-foreground'}"
		on:click={() => (filtersOpen = !filtersOpen)}
	>
		Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
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
			on:click={() => dispatch('expandAllChange', !expandAll)}
		>
			{expandAll ? 'Collapse' : 'Expand all'}
		</button>
		<span class="text-[11px] text-subtle">
			{totalEntries}
			{totalEntries === 1 ? 'entry' : 'entries'}
		</span>
	</div>
</div>

<!-- ── Collapsible filter panel ───────────────────────────── -->
{#if filtersOpen}
	<div class="shrink-0 border-b border-border px-sm py-[10px] bg-panel/80 filter-grid">
		<!-- Century -->
		<span class="filter-label">Century</span>
		<div class="flex items-center gap-[5px] flex-wrap">
			<button class={chipClass(filter.century === 'all')} on:click={() => setCentury('all')}
				>All</button
			>
			{#each CENTURIES as c}
				{@const avail = availableCenturies.has(c)}
				{@const label = c === 1 ? '1st' : c === 2 ? '2nd' : c === 3 ? '3rd' : `${c}th`}
				<button
					class={chipClass(filter.century === c, avail)}
					title={avail
						? `Filter to ${label} century`
						: `No ${label} century entries in this chapter`}
					on:click={() => avail && setCentury(c)}
				>
					{label}
				</button>
			{/each}
			<button
				class={chipClass(filter.century === 'other', hasOtherCentury)}
				title={hasOtherCentury
					? 'Filter to 9th century and later'
					: 'No 9th+ century entries in this chapter'}
				on:click={() => hasOtherCentury && setCentury('other')}>9th+</button
			>
		</div>

		<!-- Era -->
		<span class="filter-label">Era</span>
		<div class="flex items-center gap-[5px] flex-wrap">
			<button class={chipClass(filter.era === 'all')} on:click={() => setEra('all')}>All</button>
			{#each ERAS as { key, label }}
				{@const avail = availableEras.has(key)}
				<button
					class={chipClass(filter.era === key, avail)}
					title={avail ? `Filter to ${label} era` : `No ${label} entries in this chapter`}
					on:click={() => avail && setEra(key)}>{label}</button
				>
			{/each}
		</div>

		<!-- Tradition -->
		<span class="filter-label">Tradition</span>
		<div class="flex items-center gap-[5px] flex-wrap">
			<button class={chipClass(filter.tradition === 'all')} on:click={() => setTradition('all')}
				>All</button
			>
			{#each TRADITIONS as { key, label }}
				{@const avail = availableTraditions.has(key)}
				<button
					class={chipClass(filter.tradition === key, avail)}
					title={avail ? `Filter to ${label} tradition` : `No ${label} entries in this chapter`}
					on:click={() => avail && setTradition(key)}>{label}</button
				>
			{/each}
		</div>

		<!-- Authors & Documents -->
		<span class="filter-label" style="white-space: normal; line-height: 1.3;"
			>Authors &amp;<br />Documents</span
		>
		<div class="flex items-center gap-[5px] flex-wrap">
			<div class="relative" bind:this={authorDropdownEl}>
				<button
					class="text-[11px] px-[8px] py-[3px] rounded-[3px] border transition-colors duration-fast
						{filter.authors.size > 0
						? 'bg-interactive text-white border-interactive'
						: 'border-border text-subtle hover:text-foreground'}"
					on:click={() => (authorDropdownOpen = !authorDropdownOpen)}
				>
					{filter.authors.size > 0 ? `${filter.authors.size} selected` : 'Select'}
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
								{@const selected = filter.authors.has(author)}
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
								{@const selected = filter.authors.has(doc)}
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
									<span class="text-[10px] text-subtle shrink-0">{authorEntryCounts[doc] ?? 0}</span
									>
								</label>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
			{#if filter.authors.size > 0}
				<button
					class="text-[10px] text-subtle hover:text-accent"
					on:click={() => (filter = { ...filter, authors: new Set() })}>clear</button
				>
			{/if}
		</div>
	</div>
{/if}

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
