<script lang="ts">
	import { tick } from 'svelte';
	import type { BookMeta, Chapter } from '$lib/data/types';
	import { ALL_BOOKS } from '$lib/data/books';
	import VerseList from './VerseList.svelte';
	import VerseTooltip from './VerseTooltip.svelte';
	import { prefs } from '$lib/stores/prefs';

	export let bookMeta: BookMeta;
	export let chapter: Chapter;
	export let targetVerse: number | undefined;
	export let totalChapters: number;
	export let showNav: boolean = true;
	export let routeBase: string = '/odr';
	export let headingLevel: 'h1' | 'h2' = 'h1';

	$: bookIndex = ALL_BOOKS.findIndex((b) => b.slug === bookMeta.slug);

	function bookLabel(bm: BookMeta): string {
		return $prefs.modernBookNames ? bm.modernName : bm.odrName;
	}

	$: prevNav =
		chapter.chapter > 1
			? {
					slug: bookMeta.slug,
					ch: chapter.chapter - 1,
					label: `Ch. ${chapter.chapter - 1}`,
					chLabel: null
				}
			: bookIndex > 0
				? {
						slug: ALL_BOOKS[bookIndex - 1].slug,
						ch: ALL_BOOKS[bookIndex - 1].chapters,
						label: bookLabel(ALL_BOOKS[bookIndex - 1]),
						chLabel: `Ch. ${ALL_BOOKS[bookIndex - 1].chapters}`
					}
				: null;

	$: nextNav =
		chapter.chapter < totalChapters
			? {
					slug: bookMeta.slug,
					ch: chapter.chapter + 1,
					label: `Ch. ${chapter.chapter + 1}`,
					chLabel: null
				}
			: bookIndex < ALL_BOOKS.length - 1
				? {
						slug: ALL_BOOKS[bookIndex + 1].slug,
						ch: 1,
						label: bookLabel(ALL_BOOKS[bookIndex + 1]),
						chLabel: 'Ch. 1'
					}
				: null;

	function getProtestantPsalmNum(n: number): string | null {
		if (n <= 8) return null;
		if (n === 9) return '9\u201310';
		if (n >= 10 && n <= 112) return String(n + 1);
		if (n === 113) return '114\u2013115';
		if (n === 114 || n === 115) return '116';
		if (n >= 116 && n <= 145) return String(n + 1);
		if (n === 146 || n === 147) return '147';
		return null;
	}

	$: hebrewPsalmNum = (() => {
		if (!$prefs.showPsalmNumbers || bookMeta.slug !== 'psalms') return null;
		return getProtestantPsalmNum(chapter.chapter);
	})();

	let activeVerse: number | undefined = targetVerse;
	$: if (targetVerse !== undefined) activeVerse = targetVerse;

	// Verse tooltip
	let tooltipVerse: number | null = null;
	let tooltipX = 0;
	let tooltipY = 0;
	let tooltipCloseTimer: ReturnType<typeof setTimeout> | null = null;

	$: tooltipText =
		tooltipVerse != null ? (chapter.verses.find((v) => v.verse === tooltipVerse)?.text ?? '') : '';

	function cancelClose() {
		if (tooltipCloseTimer) {
			clearTimeout(tooltipCloseTimer);
			tooltipCloseTimer = null;
		}
	}

	function scheduleClose() {
		cancelClose();
		tooltipCloseTimer = setTimeout(() => (tooltipVerse = null), 120);
	}

	function handleSummaryMouseover(e: MouseEvent | FocusEvent) {
		const el = (e.target as HTMLElement).closest('.summary-verse-ref') as HTMLElement | null;
		if (!el) return;
		cancelClose();
		tooltipVerse = parseInt(el.dataset.verse ?? '0');
		const rect = el.getBoundingClientRect();
		tooltipX = rect.left + rect.width / 2;
		tooltipY = rect.top;
	}

	function handleSummaryMouseout() {
		scheduleClose();
	}

	function handleTooltipMouseout() {
		scheduleClose();
	}

	function handleTooltipMouseover() {
		cancelClose();
	}

	function linkifySummary(text: string): string {
		// Summary text is from trusted build-time JSON; we only inject our own <a> tags
		return text.replace(/℣\.(\d+)/g, (_, n) => {
			return `<a href="#v${n}" data-verse="${n}" class="summary-verse-ref" aria-label="Verse ${n}">℣.${n}</a>`;
		});
	}

	async function handleSummaryClick(e: MouseEvent) {
		const el = (e.target as HTMLElement).closest('[data-verse]') as HTMLElement | null;
		if (!el?.dataset.verse) return;
		e.preventDefault();
		const n = parseInt(el.dataset.verse);
		activeVerse = n;
		await tick();
		// Scope to this chapter's article — multiple chapters may be in DOM (infinite scroll)
		const article = document.querySelector(
			`[data-book="${bookMeta.slug}"][data-chapter="${chapter.chapter}"]`
		);
		(article?.querySelector('#v' + n) as HTMLElement | null)?.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		});
	}
</script>

{#if showNav && (prevNav || nextNav)}
	<nav class="flex justify-between items-center mb-lg font-ui">
		{#if prevNav}
			<a
				href="{routeBase}/{prevNav.slug}/{prevNav.ch}"
				class="flex items-center gap-[5px] text-subtle hover:text-accent transition-colors duration-fast text-[12px] uppercase tracking-[0.15em]"
			>
				<span class="text-[16px] leading-none">‹</span>
				<span class="flex flex-col leading-tight">
					<span>{prevNav.label}</span>
					{#if prevNav.chLabel}
						<span class="text-[10px] normal-case tracking-normal opacity-70">{prevNav.chLabel}</span
						>
					{/if}
				</span>
			</a>
		{:else}
			<span></span>
		{/if}
		{#if nextNav}
			<a
				href="{routeBase}/{nextNav.slug}/{nextNav.ch}"
				class="flex items-center gap-[5px] text-subtle hover:text-accent transition-colors duration-fast text-[12px] uppercase tracking-[0.15em]"
			>
				<span class="flex flex-col items-end leading-tight">
					<span>{nextNav.label}</span>
					{#if nextNav.chLabel}
						<span class="text-[10px] normal-case tracking-normal opacity-70">{nextNav.chLabel}</span
						>
					{/if}
				</span>
				<span class="text-[16px] leading-none">›</span>
			</a>
		{/if}
	</nav>
{/if}

<article data-pagefind-body data-book={bookMeta.slug} data-chapter={chapter.chapter}>
	<header class="mb-[35px]">
		<p class="font-ui text-[11px] uppercase tracking-[0.3em] text-subtle mb-sm">
			{bookLabel(bookMeta)}
		</p>
		<svelte:element
			this={headingLevel}
			class="font-reader text-[2.5rem] leading-[1.2] tracking-[-0.01em] text-foreground mb-sm"
		>
			Chapter {chapter.chapter}{#if hebrewPsalmNum}<span
					class="text-[1.1rem] text-subtle font-ui ml-[6px] tracking-normal"
					>({hebrewPsalmNum})</span
				>{/if}
		</svelte:element>
		<div class="w-10 h-px bg-accent opacity-70"></div>
	</header>

	{#if chapter.summary && chapter.summary !== '---'}
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions a11y_mouse_events_have_key_events -->
		<p
			class="text-subtle font-reader italic mb-lg text-base leading-[var(--line-height-reader)]"
			on:click={handleSummaryClick}
			on:mouseover={handleSummaryMouseover}
			on:mouseout={handleSummaryMouseout}
			on:focusin={handleSummaryMouseover}
			on:focusout={() => scheduleClose()}
		>
			{@html linkifySummary(chapter.summary)}
		</p>
	{/if}

	{#if tooltipVerse != null && tooltipText}
		<VerseTooltip
			verseNum={tooltipVerse}
			verseText={tooltipText}
			anchorX={tooltipX}
			anchorY={tooltipY}
			on:mouseover={handleTooltipMouseover}
			on:mouseout={handleTooltipMouseout}
			on:focusin={handleTooltipMouseover}
			on:focusout={handleTooltipMouseout}
		/>
	{/if}

	<VerseList
		verses={chapter.verses}
		targetVerse={activeVerse}
		bookSlug={bookMeta.slug}
		chapterNum={chapter.chapter}
	/>
</article>

<style>
	:global(.summary-verse-ref) {
		color: var(--color-interactive);
		cursor: pointer;
		text-decoration: none;
	}
	:global(.summary-verse-ref:hover) {
		text-decoration: underline;
	}
</style>
