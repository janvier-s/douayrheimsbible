<script lang="ts">
	import type { PageData } from './$types';
	import { prefs } from '$lib/stores/prefs';
	import { compareStore, TRANSLATIONS, MAX_COLS } from '$lib/stores/compare';
	import type { TranslationId } from '$lib/stores/compare';
	import CompareBar from '$lib/components/CompareBar.svelte';

	export let data: PageData;

	$: ({ bookMeta, chapter } = data);

	// Derived view state from store
	$: orderedTranslations = $compareStore.order.map((id) => TRANSLATIONS.find((t) => t.id === id)!);
	$: activeCols = orderedTranslations.filter((t) => $compareStore.visible.has(t.id));
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

<!-- Fixed carousel arrows — only when >MAX_COLS translations active -->
{#if needsScroll}
	<button
		on:click={() => compareStore.scrollBy(-1)}
		disabled={!canScrollLeft}
		aria-label="Previous translation"
		class="fixed left-[12px] top-1/2 -translate-y-1/2 z-40 w-[36px] h-[36px] flex items-center justify-center rounded-full bg-panel border border-border shadow-lg text-[18px] transition-all duration-fast
			{canScrollLeft
			? 'text-foreground hover:text-interactive hover:border-interactive'
			: 'opacity-20 pointer-events-none'}"
	>
		‹
	</button>
	<button
		on:click={() => compareStore.scrollBy(1)}
		disabled={!canScrollRight}
		aria-label="Next translation"
		class="fixed right-[12px] top-1/2 -translate-y-1/2 z-40 w-[36px] h-[36px] flex items-center justify-center rounded-full bg-panel border border-border shadow-lg text-[18px] transition-all duration-fast
			{canScrollRight
			? 'text-foreground hover:text-interactive hover:border-interactive'
			: 'opacity-20 pointer-events-none'}"
	>
		›
	</button>
{/if}

<div class="mx-auto" style="max-width: {containerMaxWidth};">
	<!-- Sticky column headers — draggable to reorder -->
	<div
		class="sticky top-[94px] z-20 bg-panel border-b-2 border-border grid"
		style="grid-template-columns: repeat({displayedCols.length}, minmax(0, 1fr));"
	>
		{#each displayedCols as t (t.id)}
			<div
				draggable="true"
				on:dragstart={(e) => onColDragStart(e, t.id)}
				on:dragover={(e) => onColDragOver(e, t.id)}
				on:dragend={onColDragEnd}
				class="px-[20px] py-[10px] border-r border-border last:border-r-0 flex items-baseline justify-between gap-[8px] cursor-grab active:cursor-grabbing select-none
					{draggingId === t.id ? 'opacity-50' : ''}"
			>
				<div class="min-w-0">
					<span class="text-[12px] font-semibold text-foreground leading-none truncate block">
						{t.fullHeader ? t.label : t.abbr}
					</span>
					<span class="text-[10px] text-subtle">{t.year}</span>
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
			{#each displayedCols as t (t.id)}
				<div class="px-[20px] py-[14px] border-r border-border last:border-r-0">
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
			{#each displayedCols as t (t.id)}
				<div
					class="px-[20px] py-[8px] border-r border-b border-border last:border-r-0 font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
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
