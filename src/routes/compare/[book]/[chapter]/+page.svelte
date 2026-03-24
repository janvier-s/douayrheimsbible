<script lang="ts">
	import type { PageData } from './$types';
	import { prefs } from '$lib/stores/prefs';
	import { compareStore, TRANSLATIONS, MAX_COLS } from '$lib/stores/compare';
	import type { TranslationId, Translation } from '$lib/stores/compare';
	import CompareBar from '$lib/components/CompareBar.svelte';

	export let data: PageData;

	$: ({ bookMeta, chapter } = data);

	// Derived view state from store
	$: orderedTranslations = $compareStore.order.map(
		(id: TranslationId) => TRANSLATIONS.find((t: Translation) => t.id === id)!
	);
	$: activeCols = orderedTranslations.filter((t: Translation) => $compareStore.visible.has(t.id));
	$: displayedCols = activeCols.slice(
		$compareStore.columnOffset,
		$compareStore.columnOffset + MAX_COLS
	);
	$: needsScroll = activeCols.length > MAX_COLS;
	$: canScrollLeft = $compareStore.columnOffset > 0;
	$: canScrollRight = $compareStore.columnOffset + MAX_COLS < activeCols.length;

	// Max-width scales with column count so few columns aren't stretched
	$: containerMaxWidth = `${Math.min(displayedCols.length * 360, 1800)}px`;

	// Drag-to-reorder columns
	let draggingId: TranslationId | null = null;

	function onColDragStart(e: DragEvent, id: TranslationId) {
		draggingId = id;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function onColDragOver(e: DragEvent, id: TranslationId) {
		e.preventDefault();
		if (!draggingId || draggingId === id) return;
		const newOrder = [...$compareStore.order];
		const from = newOrder.indexOf(draggingId);
		const to = newOrder.indexOf(id);
		newOrder.splice(from, 1);
		newOrder.splice(to, 0, draggingId);
		compareStore.reorder(newOrder);
	}

	function onColDragEnd() {
		draggingId = null;
	}
</script>

<svelte:head>
	<title>{bookMeta.odrName} {chapter.chapter} — Compare Translations</title>
</svelte:head>

<CompareBar {bookMeta} chapterNum={chapter.chapter} />

<!-- Fixed carousel arrows — vertical rectangles, only when >MAX_COLS translations active -->
{#if needsScroll}
	<button
		on:click={() => compareStore.scrollBy(-1)}
		disabled={!canScrollLeft}
		aria-label="Previous translation"
		class="fixed left-[8px] top-[57%] -translate-y-1/2 z-40 w-[28px] h-[64px] flex items-center justify-center rounded-[4px] text-[22px] font-light transition-all duration-fast
			{canScrollLeft
			? 'bg-[#696666] text-white border border-[#696666]/30 shadow-lg hover:bg-[#555252]'
			: 'opacity-0 pointer-events-none'}"
	>
		‹
	</button>
	<button
		on:click={() => compareStore.scrollBy(1)}
		disabled={!canScrollRight}
		aria-label="Next translation"
		class="fixed right-[8px] top-[57%] -translate-y-1/2 z-40 w-[28px] h-[64px] flex items-center justify-center rounded-[4px] text-[22px] font-light transition-all duration-fast
			{canScrollRight
			? 'bg-[#696666] text-white border border-[#696666]/30 shadow-lg hover:bg-[#555252]'
			: 'opacity-0 pointer-events-none'}"
	>
		›
	</button>
{/if}

<!-- Table container — border-x provides outer left/right edges; bg-background outside contrasts with bg-panel inside cells -->
<div class="mx-auto border-x border-t border-border" style="max-width: {containerMaxWidth};">
	<!-- Sticky column headers — draggable to reorder -->
	<div
		class="sticky top-[110px] z-20 border-b-2 border-border grid"
		style="grid-template-columns: repeat({displayedCols.length}, minmax(0, 1fr));"
	>
		{#each displayedCols as t, colIdx (t.id)}
			<div
				draggable="true"
				role="columnheader"
				aria-label={t.label}
				tabindex="0"
				on:dragstart={(e) => onColDragStart(e, t.id)}
				on:dragover={(e) => onColDragOver(e, t.id)}
				on:dragend={onColDragEnd}
				class="px-[20px] py-[13px] flex items-center justify-between gap-[8px] cursor-grab active:cursor-grabbing select-none bg-panel
					{colIdx < displayedCols.length - 1 ? 'border-r border-border' : ''}
					{draggingId === t.id ? 'opacity-50' : ''}"
			>
				<div class="flex items-center gap-[9px] min-w-0">
					<!-- Drag handle indicator -->
					<span class="text-subtle/35 text-[12px] leading-none shrink-0" aria-hidden="true">⠿</span>
					<div class="min-w-0 font-ui">
						<span class="text-[13px] font-semibold text-foreground leading-none truncate block">
							{t.label}
						</span>
						<span class="text-[11px] text-subtle mt-[2px] block">{t.year}</span>
					</div>
				</div>
				{#if !t.live}
					<span
						class="shrink-0 text-[9px] uppercase tracking-[0.1em] text-subtle border border-border rounded-[2px] px-[5px] py-[1px]"
					>
						Soon
					</span>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Summary row -->
	{#if $compareStore.showSummary && chapter.summary && chapter.summary !== '---'}
		<div
			class="grid border-b border-border"
			style="grid-template-columns: repeat({displayedCols.length}, minmax(0, 1fr));"
		>
			{#each displayedCols as t, colIdx (t.id)}
				<div
					class="px-[20px] py-[14px] bg-panel
						{colIdx < displayedCols.length - 1 ? 'border-r border-border' : ''}"
				>
					{#if t.id === 'odr'}
						<p class="font-reader italic text-subtle text-[13px] leading-relaxed">
							{chapter.summary}
						</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Verse grid: one cell per (verse × column) — CSS grid auto-flow aligns rows -->
	<div class="grid" style="grid-template-columns: repeat({displayedCols.length}, minmax(0, 1fr));">
		{#each chapter.verses as v (v.verse)}
			{#each displayedCols as t, colIdx (t.id)}
				<div
					class="px-[20px] py-[8px] border-b border-border bg-panel font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]
						{colIdx < displayedCols.length - 1 ? 'border-r border-border' : ''}"
					class:text-justify={$prefs.justifiedText}
				>
					{#if t.live}
						{#if $prefs.showVerseNumbers}
							<sup
								class="text-subtle font-ui text-[10px] font-thin select-none mr-[4px] tabular-nums"
								>{v.verse}</sup
							>
						{/if}
						{v.text}
					{:else}
						<!-- Invisible text preserves row height to match ODR column -->
						{#if $prefs.showVerseNumbers}
							<sup class="font-ui text-[10px] font-thin select-none mr-[4px] invisible"
								>{v.verse}</sup
							>
						{/if}
						<span class="invisible">{v.text}</span>
					{/if}
				</div>
			{/each}
		{/each}
	</div>
</div>
