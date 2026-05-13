<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import { prefs } from '$lib/stores/prefs';
	import { compareStore, TRANSLATIONS, MAX_COLS, konamiUnlocked } from '$lib/stores/compare';
	import type { TranslationId, Translation } from '$lib/stores/compare';
	import CompareBar from '$lib/components/CompareBar.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { fade } from 'svelte/transition';
	import { stripTags, allcapsToSmallcaps } from '$lib/utils/text';

	export let data: PageData;

	// Set compare-specific font size on mount, restore on destroy
	let prevFontSize = '';
	onMount(() => {
		prevFontSize = getComputedStyle(document.documentElement).getPropertyValue(
			'--font-size-reader'
		);
		document.documentElement.style.setProperty('--font-size-reader', `${$prefs.compareFontSize}px`);
	});
	onDestroy(() => {
		if (browser && prevFontSize) {
			document.documentElement.style.setProperty('--font-size-reader', prevFontSize);
		}
	});

	$: ({ bookMeta, chapter, verseMaps } = data);
	$: prevChapter = chapter.chapter > 1 ? chapter.chapter - 1 : null;
	$: nextChapter = chapter.chapter < bookMeta.chapters ? chapter.chapter + 1 : null;

	// Responsive column cap: 2 on mobile, MAX_COLS on desktop
	let innerWidth = 0;
	$: effectiveMax = innerWidth > 0 && innerWidth < 768 ? 2 : MAX_COLS;

	// Derived view state from store
	$: orderedTranslations = $compareStore.order.map(
		(id: TranslationId) => TRANSLATIONS.find((t: Translation) => t.id === id)!
	);
	$: activeCols = orderedTranslations.filter((t: Translation) => $compareStore.visible.has(t.id));
	$: displayedCols = activeCols.slice(
		$compareStore.columnOffset,
		$compareStore.columnOffset + effectiveMax
	);
	$: needsScroll = activeCols.length > effectiveMax;
	$: canScrollLeft = $compareStore.columnOffset > 0;
	$: canScrollRight = $compareStore.columnOffset + effectiveMax < activeCols.length;

	// Max-width scales with column count (405px per col → 2 cols = 810px)
	$: containerMaxWidth = `${Math.min(displayedCols.length * 405, 1800)}px`;
	$: isOT = bookMeta.testament === 'OT';

	// ── Konami code ────────────────────────────────────────────────────────────
	const KONAMI_SEQUENCE = [
		'ArrowUp',
		'ArrowUp',
		'ArrowDown',
		'ArrowDown',
		'ArrowLeft',
		'ArrowRight',
		'ArrowLeft',
		'ArrowRight',
		'b',
		'a'
	];
	let konamiProgress = 0;
	let showUnlockToast = false;
	let konamiToastUnlocked = true;

	function onKonamiKeydown(e: KeyboardEvent) {
		if (e.key === KONAMI_SEQUENCE[konamiProgress]) {
			konamiProgress++;
			if (konamiProgress === KONAMI_SEQUENCE.length) {
				konamiProgress = 0;
				konamiToastUnlocked = !$konamiUnlocked;
				konamiUnlocked.update((v) => !v);
				showUnlockToast = true;
				setTimeout(() => (showUnlockToast = false), 4000);
			}
		} else {
			konamiProgress = e.key === KONAMI_SEQUENCE[0] ? 1 : 0;
		}
	}

	// Drag-to-reorder columns
	let draggingId: TranslationId | null = null;
	let hoveredVerse: number | null = null;

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

<svelte:window bind:innerWidth on:keydown={onKonamiKeydown} />

<svelte:head>
	<title>{bookMeta.odrName} {chapter.chapter} · Compare Translations — Douay-Rheims Bible</title>
	<meta
		name="description"
		content="Compare {bookMeta.odrName} Chapter {chapter.chapter} side-by-side across multiple Bible translations: Original Douay-Rheims, Challoner, Vulgate, KJV, Knox, and more."
	/>
	<link
		rel="canonical"
		href="https://thedouayrheims.com/compare/{bookMeta.slug}/{chapter.chapter}"
	/>
	<meta property="og:type" content="article" />
	<meta property="og:title" content="{bookMeta.odrName} {chapter.chapter} · Compare Translations" />
	<meta
		property="og:description"
		content="Compare {bookMeta.odrName} Chapter {chapter.chapter} across multiple Bible translations."
	/>
	<meta
		property="og:url"
		content="https://thedouayrheims.com/compare/{bookMeta.slug}/{chapter.chapter}"
	/>
	<meta property="og:site_name" content="Douay-Rheims Bible" />
	<meta property="og:image" content="https://thedouayrheims.com/images/dr-1582-rheims.webp" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta
		name="twitter:title"
		content="{bookMeta.odrName} {chapter.chapter} · Compare Translations"
	/>
	<meta
		name="twitter:description"
		content="Compare {bookMeta.odrName} Chapter {chapter.chapter} across multiple Bible translations."
	/>
	<meta name="twitter:image" content="https://thedouayrheims.com/images/dr-1582-rheims.webp" />
</svelte:head>

<CompareBar {bookMeta} chapterNum={chapter.chapter} />

<div in:fade={{ duration: 140 }}>
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

	<!-- Chapter prev / next — above table -->
	<div
		class="mx-auto flex justify-between items-center mt-[12px] px-[4px] font-ui"
		style="max-width: {containerMaxWidth};"
	>
		{#if prevChapter}
			<a
				href="/compare/{bookMeta.slug}/{prevChapter}"
				class="flex items-center gap-[5px] text-subtle hover:text-accent transition-colors duration-fast text-[11px] uppercase tracking-[0.15em]"
			>
				<span class="text-[16px] leading-none">‹</span> Ch. {prevChapter}
			</a>
		{:else}
			<span></span>
		{/if}
		{#if nextChapter}
			<a
				href="/compare/{bookMeta.slug}/{nextChapter}"
				class="flex items-center gap-[5px] text-subtle hover:text-accent transition-colors duration-fast text-[11px] uppercase tracking-[0.15em]"
			>
				Ch. {nextChapter} <span class="text-[16px] leading-none">›</span>
			</a>
		{:else}
			<span></span>
		{/if}
	</div>

	<!-- Table container — border-x provides outer left/right edges; bg-background outside contrasts with bg-panel inside cells -->
	<div
		class="mx-auto border-x border-t border-border mt-[8px]"
		style="max-width: {containerMaxWidth};"
	>
		<!-- Sticky column headers — draggable to reorder -->
		<div
			class="sticky top-[var(--header-height)] z-20 border-b-2 border-border grid"
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
					class="group relative px-[20px] max-md:px-[10px] py-[13px] max-md:py-[8px] flex items-center gap-[8px] max-md:gap-[4px] cursor-grab active:cursor-grabbing select-none bg-panel
					{colIdx < displayedCols.length - 1 ? 'border-r border-border' : ''}
					{draggingId === t.id ? 'opacity-50' : ''}"
				>
					<div class="flex items-center gap-[9px] min-w-0">
						<!-- Drag handle indicator -->
						<span
							class="text-subtle/35 text-[12px] leading-none shrink-0 max-md:hidden"
							aria-hidden="true">⠿</span
						>
						<div class="min-w-0 font-ui">
							<span
								class="text-[13px] max-md:text-[11px] font-semibold text-foreground leading-tight block mt-[5px] min-h-[2.6em]"
							>
								{t.label}
							</span>
							<span class="text-[11px] text-subtle mt-[3px] block">{t.year}</span>
							{#if t.micro}
								<span
									class="text-[9px] uppercase tracking-[0.12em] text-accent/70 mt-[2px] block font-medium"
									>{t.micro}</span
								>
							{/if}
						</div>
					</div>
					<button
						class="absolute top-[5px] right-[5px] opacity-0 group-hover:opacity-100 transition-opacity duration-fast flex items-center justify-center w-[26px] h-[26px] rounded-[3px] text-[#9ca3af] hover:text-[#6b7280] hover:bg-[#9ca3af]/15"
						aria-label="Remove {t.label}"
						on:click|stopPropagation={() => compareStore.toggle(t.id, isOT)}
						on:dragstart|stopPropagation
					>
						<svg
							width="11"
							height="11"
							viewBox="0 0 11 11"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							aria-hidden="true"
						>
							<line x1="1" y1="1" x2="10" y2="10" /><line x1="10" y1="1" x2="1" y2="10" />
						</svg>
					</button>
				</div>
			{/each}
		</div>

		<!-- Verse grid: one cell per (verse × column) — CSS grid auto-flow aligns rows -->
		<div
			class="grid"
			style="grid-template-columns: repeat({displayedCols.length}, minmax(0, 1fr));"
		>
			{#each chapter.verses.filter((v) => v.verse > 0) as v (v.verse)}
				{#each displayedCols as t, colIdx (t.id)}
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div
						class="verse-cell px-[16px] py-[12px] max-md:px-[5px] max-md:py-[8px] border-b border-border bg-panel font-reader text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)] flex items-start gap-[3px]
						{colIdx < displayedCols.length - 1 ? 'border-r border-border' : ''}"
						class:text-justify={$prefs.justifiedText}
						class:verse-row-hover={hoveredVerse === v.verse}
						on:mouseenter={() => (hoveredVerse = v.verse)}
						on:mouseleave={() => (hoveredVerse = null)}
					>
						{#if $prefs.showVerseNumbers}
							<span
								class="text-subtle font-ui text-[10px] font-light select-none shrink-0 tabular-nums pt-[0.25em] text-right w-fit md:mr-[6px]"
								>{v.verse}</span
							>
						{/if}
						<span>{@html allcapsToSmallcaps(stripTags(verseMaps[t.id]?.[v.verse] ?? ''))}</span>
					</div>
				{/each}
			{/each}
		</div>
	</div>

	<!-- Chapter prev / next — below table -->
	<div
		class="mx-auto flex justify-between items-center mt-[12px] mb-[40px] max-md:mb-[100px] px-[4px] font-ui"
		style="max-width: {containerMaxWidth};"
	>
		{#if prevChapter}
			<a
				href="/compare/{bookMeta.slug}/{prevChapter}"
				class="flex items-center gap-[5px] text-subtle hover:text-accent transition-colors duration-fast text-[11px] uppercase tracking-[0.15em]"
			>
				<span class="text-[16px] leading-none">‹</span> Ch. {prevChapter}
			</a>
		{:else}
			<span></span>
		{/if}
		{#if nextChapter}
			<a
				href="/compare/{bookMeta.slug}/{nextChapter}"
				class="flex items-center gap-[5px] text-subtle hover:text-accent transition-colors duration-fast text-[11px] uppercase tracking-[0.15em]"
			>
				Ch. {nextChapter} <span class="text-[16px] leading-none">›</span>
			</a>
		{:else}
			<span></span>
		{/if}
	</div>

	<PageFooter
		{bookMeta}
		chapterNum={chapter.chapter}
		totalChapters={bookMeta.chapters}
		routeBase="/compare"
	/>
</div>

{#if showUnlockToast}
	<div
		class="unlock-toast"
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 400 }}
		role="status"
		aria-live="polite"
	>
		<span class="unlock-icon" aria-hidden="true">✦</span>
		<div>
			<p class="unlock-title">
				{konamiToastUnlocked ? 'Translation unlocked' : 'Translation hidden'}
			</p>
			<p class="unlock-sub">
				{konamiToastUnlocked
					? 'RSV-2CE 2006 is now available in the translation selector'
					: 'RSV-2CE 2006 has been removed from the translation selector'}
			</p>
		</div>
	</div>
{/if}

<style>
	.unlock-toast {
		position: fixed;
		bottom: 32px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 200;
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 22px;
		background: var(--color-panel);
		border: 1px solid var(--color-accent);
		border-radius: 4px;
		box-shadow: 0 4px 24px color-mix(in srgb, var(--color-accent) 20%, transparent);
		font-family: var(--font-ui);
		white-space: nowrap;
	}

	.unlock-icon {
		font-size: 14px;
		color: var(--color-accent);
		flex-shrink: 0;
	}

	.unlock-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}

	.unlock-sub {
		font-size: 11px;
		color: var(--color-subtle);
		margin: 2px 0 0;
	}

	/* ─── Verse row hover highlight ────────────────── */
	.verse-cell {
		transition: background-color 120ms ease;
	}

	.verse-row-hover {
		background-color: color-mix(in srgb, var(--color-accent) 12%, var(--color-panel));
	}
</style>
