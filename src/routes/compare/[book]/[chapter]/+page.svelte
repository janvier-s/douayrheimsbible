<script lang="ts">
	import type { PageData } from './$types';
	import { prefs } from '$lib/stores/prefs';

	export let data: PageData;

	$: ({ bookMeta, chapter, totalChapters } = data);
	$: prevChapter = chapter.chapter > 1 ? chapter.chapter - 1 : null;
	$: nextChapter = chapter.chapter < totalChapters ? chapter.chapter + 1 : null;
	$: isOT = bookMeta.testament === 'OT';

	const ALL_TRANSLATIONS = [
		{
			id: 'odr',
			label: 'Original Douay-Rheims',
			abbr: 'ODR',
			year: '1609',
			live: true,
			ntOnly: false
		},
		{
			id: 'drc',
			label: 'Douay-Rheims Challoner',
			abbr: 'DRC',
			year: '1752',
			live: false,
			ntOnly: false
		},
		{ id: 'knox', label: 'Knox Bible', abbr: 'Knox', year: '1955', live: false, ntOnly: false },
		{
			id: 'conf',
			label: 'Confraternity NT',
			abbr: 'Conf',
			year: '1941',
			live: false,
			ntOnly: true
		},
		{
			id: 'cpdv',
			label: 'Catholic Public Domain Version',
			abbr: 'CPDV',
			year: '2009',
			live: false,
			ntOnly: false
		},
		{
			id: 'kjv',
			label: 'King James Version',
			abbr: 'KJV',
			year: '1611',
			live: false,
			ntOnly: false
		},
		{ id: 'vul', label: 'Vulgate', abbr: 'Vul', year: '~405', live: false, ntOnly: false }
	] as const;

	type TranslationId = (typeof ALL_TRANSLATIONS)[number]['id'];

	let translationOrder: TranslationId[] = ALL_TRANSLATIONS.map((t) => t.id);
	let visibleSet = new Set<TranslationId>(['odr', 'drc']);
	let showSummary = true;
	let columnOffset = 0;
	const MAX_COLS = 5;

	$: orderedTranslations = translationOrder.map((id) => ALL_TRANSLATIONS.find((t) => t.id === id)!);
	$: activeCols = orderedTranslations.filter((t) => visibleSet.has(t.id));
	$: displayedCols = activeCols.slice(columnOffset, columnOffset + MAX_COLS);
	$: canScrollLeft = columnOffset > 0;
	$: canScrollRight = columnOffset + MAX_COLS < activeCols.length;
	$: needsScroll = activeCols.length > MAX_COLS;

	function toggleTranslation(id: TranslationId) {
		const t = ALL_TRANSLATIONS.find((x) => x.id === id)!;
		if (t.ntOnly && isOT) return;
		const next = new Set(visibleSet);
		if (next.has(id)) {
			if (next.size > 1) next.delete(id);
		} else {
			next.add(id);
		}
		visibleSet = next;
		// Clamp offset so we don't show empty columns
		const newActive = orderedTranslations.filter((t) => next.has(t.id));
		if (columnOffset + MAX_COLS > newActive.length) {
			columnOffset = Math.max(0, newActive.length - MAX_COLS);
		}
	}

	// Drag-to-reorder on toggle chips
	let draggingId: TranslationId | null = null;

	function onDragStart(e: DragEvent, id: TranslationId) {
		draggingId = id;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function onDragOver(e: DragEvent, id: TranslationId) {
		e.preventDefault();
		if (!draggingId || draggingId === id) return;
		const newOrder = [...translationOrder];
		const from = newOrder.indexOf(draggingId);
		const to = newOrder.indexOf(id);
		newOrder.splice(from, 1);
		newOrder.splice(to, 0, draggingId);
		translationOrder = newOrder;
	}

	function onDragEnd() {
		draggingId = null;
	}
</script>

<svelte:head>
	<title>{bookMeta.odrName} {chapter.chapter} — Compare Translations</title>
</svelte:head>

<div class="min-h-screen font-ui">
	<!-- Controls bar: translation toggles + options -->
	<div
		class="sticky top-[90px] z-30 bg-glass backdrop-blur-sm border-b border-border px-lg"
		style="min-height: 48px;"
	>
		<div class="flex items-center justify-center gap-md" style="min-height: 48px;">
			<!-- Scroll left -->
			{#if needsScroll}
				<button
					on:click={() => (columnOffset = Math.max(0, columnOffset - 1))}
					disabled={!canScrollLeft}
					class="shrink-0 w-[26px] h-[26px] flex items-center justify-center rounded-[3px] border border-border text-[14px] transition-colors duration-fast
						{canScrollLeft
						? 'text-foreground hover:text-interactive hover:border-interactive'
						: 'text-border pointer-events-none'}"
				>
					‹
				</button>
			{/if}

			<!-- Translation chips (draggable) -->
			<div class="flex items-center gap-[6px] flex-wrap justify-center">
				{#each orderedTranslations as t (t.id)}
					{@const disabled = t.ntOnly && isOT}
					{@const active = visibleSet.has(t.id)}
					<button
						draggable="true"
						on:dragstart={(e) => onDragStart(e, t.id)}
						on:dragover={(e) => onDragOver(e, t.id)}
						on:dragend={onDragEnd}
						on:click={() => toggleTranslation(t.id)}
						title={disabled ? `${t.label} — New Testament only` : t.label}
						class="px-[10px] py-[4px] rounded-[3px] text-[11px] font-medium uppercase tracking-[0.1em] border transition-colors duration-fast select-none cursor-grab active:cursor-grabbing
							{disabled
							? 'border-border text-border pointer-events-none'
							: active
								? 'bg-interactive text-white border-interactive'
								: 'border-border text-subtle hover:text-foreground hover:border-foreground/30'}"
					>
						{t.abbr}
					</button>
				{/each}
			</div>

			<!-- Scroll right -->
			{#if needsScroll}
				<button
					on:click={() => (columnOffset = Math.min(activeCols.length - MAX_COLS, columnOffset + 1))}
					disabled={!canScrollRight}
					class="shrink-0 w-[26px] h-[26px] flex items-center justify-center rounded-[3px] border border-border text-[14px] transition-colors duration-fast
						{canScrollRight
						? 'text-foreground hover:text-interactive hover:border-interactive'
						: 'text-border pointer-events-none'}"
				>
					›
				</button>
			{/if}

			<!-- Divider -->
			<div class="w-px h-[20px] bg-border shrink-0"></div>

			<!-- Chapter nav -->
			<div class="flex items-center gap-[2px] shrink-0">
				<a
					href={prevChapter ? `/compare/${bookMeta.slug}/${prevChapter}` : undefined}
					class="w-[26px] h-[26px] flex items-center justify-center rounded-[3px] text-[14px] transition-colors duration-fast
						{prevChapter ? 'text-foreground hover:text-interactive' : 'text-border pointer-events-none'}"
					aria-label="Previous chapter"
				>
					‹
				</a>
				<span
					class="text-[12px] font-medium text-foreground px-[4px] whitespace-nowrap select-none"
				>
					{bookMeta.odrName}
					{chapter.chapter}
				</span>
				<a
					href={nextChapter ? `/compare/${bookMeta.slug}/${nextChapter}` : undefined}
					class="w-[26px] h-[26px] flex items-center justify-center rounded-[3px] text-[14px] transition-colors duration-fast
						{nextChapter ? 'text-foreground hover:text-interactive' : 'text-border pointer-events-none'}"
					aria-label="Next chapter"
				>
					›
				</a>
			</div>

			<!-- Divider -->
			<div class="w-px h-[20px] bg-border shrink-0"></div>

			<!-- Summary toggle -->
			<button
				on:click={() => (showSummary = !showSummary)}
				class="shrink-0 px-[8px] py-[3px] rounded-[3px] text-[11px] border transition-colors duration-fast
					{showSummary
					? 'border-interactive text-interactive'
					: 'border-border text-subtle hover:text-foreground'}"
				title="Toggle chapter summaries"
			>
				Summary
			</button>
		</div>
	</div>

	<!-- Sticky column headers — same grid as verse body -->
	<div
		class="sticky top-[138px] z-20 bg-panel border-b-2 border-border grid"
		style="grid-template-columns: repeat({displayedCols.length}, minmax(0, 1fr));"
	>
		{#each displayedCols as t (t.id)}
			<div
				class="px-[20px] py-[10px] border-r border-border last:border-r-0 flex items-baseline justify-between gap-[8px]"
			>
				<div class="min-w-0">
					<span class="text-[12px] font-semibold text-foreground leading-none"
						>{['odr', 'drc', 'cpdv'].includes(t.id) ? t.label : t.abbr}</span
					>
					<span class="text-[10px] text-subtle ml-[5px]">{t.year}</span>
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

	<!-- Summary row (only ODR has one for now) -->
	{#if showSummary && chapter.summary && chapter.summary !== '---'}
		<div
			class="grid border-b border-border"
			style="grid-template-columns: repeat({displayedCols.length}, minmax(0, 1fr));"
		>
			{#each displayedCols as t (t.id)}
				<div class="px-[20px] py-[16px] border-r border-border last:border-r-0">
					{#if t.live && t.id === 'odr'}
						<p class="font-reader italic text-subtle text-[13px] leading-relaxed">
							{chapter.summary}
						</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Verse grid: verses × translations, CSS grid auto-flow for alignment -->
	<div class="grid" style="grid-template-columns: repeat({displayedCols.length}, minmax(0, 1fr));">
		{#each chapter.verses as v (v.verse)}
			{#each displayedCols as t (t.id)}
				<div
					class="px-[20px] py-[7px] border-r border-b border-border last:border-r-0 font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
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
						<!-- Invisible placeholder preserving row height -->
						{#if $prefs.showVerseNumbers}
							<sup class="text-transparent font-ui text-[10px] font-thin select-none mr-[4px]"
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
