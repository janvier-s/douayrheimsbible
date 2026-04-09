<script lang="ts">
	import { tick, onDestroy } from 'svelte';
	import type { BookMeta, Chapter } from '$lib/data/types';
	import { ALL_BOOKS, getHebPsalmNum } from '$lib/data/books';
	import VerseList from './VerseList.svelte';
	import VerseTooltip from './VerseTooltip.svelte';
	import { prefs } from '$lib/stores/prefs';
	import { studyPanel } from '$lib/stores/studyPanel';

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

	$: hebrewPsalmNum = (() => {
		if (!$prefs.showPsalmNumbers || bookMeta.slug !== 'psalms') return null;
		return getHebPsalmNum(chapter.chapter);
	})();

	let activeVerse: number | undefined = targetVerse;
	$: if (targetVerse !== undefined) activeVerse = targetVerse;

	// Verse tooltip
	let tooltipVerse: number | null = null;
	let tooltipX = 0;
	let tooltipY = 0;
	let tooltipCloseTimer: ReturnType<typeof setTimeout> | null = null;

	$: tooltipText = (() => {
		if (tooltipVerse == null) return '';
		const raw = chapter.verses.find((v) => v.verse === tooltipVerse)?.text ?? '';
		return raw
			.replace(/<cr>[^<]*<\/cr>/g, '')
			.replace(/<na>[^<]*<\/na>/g, '')
			.replace(/<\/?i>/g, '')
			.replace(/  +/g, ' ')
			.trim();
	})();

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

	onDestroy(() => {
		if (tooltipCloseTimer) clearTimeout(tooltipCloseTimer);
	});

	function linkifySummary(text: string, isStudy: boolean): string {
		// Summary text is from trusted build-time JSON; we only inject our own tags.
		// Match verse-number references in summary text: a digit-sequence followed by
		// ". " that appears after whitespace or a semicolon (e.g. "8. Then placing…").
		// Also handles any pre-existing ℣.N patterns.
		const maxVerse = Math.max(...chapter.verses.map((v) => v.verse), 0);
		let t = text.replace(/(^|[\s;,])(\d+)\.\s+/g, (match, sep, n) => {
			const num = parseInt(n, 10);
			if (num < 1 || num > maxVerse) return match;
			const link = `<a href="#v${n}" data-verse="${n}" class="summary-verse-ref" aria-label="Verse ${n}"><span class="verse-ref-glyph">℣.</span>${n}</a> `;
			return sep + link;
		});
		if (isStudy) {
			// Render <na>[N]</na> as clickable accent superscript
			t = t.replace(
				/<na>(\[(\d+)\])<\/na>/g,
				(_, full, n) =>
					`<button class="study-marker" data-summary-note="${n}" aria-label="Summary note ${n}">${full}</button>`
			);
		} else {
			// Strip <na> tags and content in reading mode
			t = t.replace(/<na>[^<]*<\/na>/g, '');
			t = t.replace(/  +/g, ' ').trim();
		}
		return t;
	}

	async function handleSummaryClick(e: MouseEvent) {
		// Summary note marker click → scroll panel to summary section
		const noteBtn = (e.target as HTMLElement).closest('[data-summary-note]') as HTMLElement | null;
		if (noteBtn) {
			e.preventDefault();
			const marker = noteBtn.dataset.summaryNote ?? '';
			studyPanel.update((s) => ({
				...s,
				activeTab: 'commentary',
				scrollTrigger: { verse: 0, type: 'note', marker }
			}));
			return;
		}

		const el = (e.target as HTMLElement).closest('[data-verse]') as HTMLElement | null;
		if (!el?.dataset.verse) return;
		e.preventDefault();
		const n = parseInt(el.dataset.verse);
		activeVerse = n;
		await tick();
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
			class="text-subtle font-reader italic mb-lg text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
			on:click={handleSummaryClick}
			on:mouseover={handleSummaryMouseover}
			on:mouseout={handleSummaryMouseout}
			on:focusin={handleSummaryMouseover}
			on:focusout={() => scheduleClose()}
		>
			{@html linkifySummary(chapter.summary, $prefs.readingMode === 'study')}
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
		color: color-mix(in srgb, var(--color-interactive) 75%, var(--color-text));
		cursor: pointer;
		text-decoration: none;
		font-variant-numeric: tabular-nums;
	}
	:global(.summary-verse-ref:hover) {
		text-decoration: underline;
	}
	@media (max-width: 640px) {
		:global(.verse-ref-glyph) {
			display: none;
		}
	}
</style>
