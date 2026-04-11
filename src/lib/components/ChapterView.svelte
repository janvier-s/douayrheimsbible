<script lang="ts">
	import type { BookMeta, Chapter } from '$lib/data/types';
	import { ALL_BOOKS, getHebPsalmNum } from '$lib/data/books';
	import VerseList from './VerseList.svelte';
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

	function linkifySummary(text: string, isStudy: boolean): string {
		// Summary text is from trusted build-time JSON; we only inject our own tags.
		// Match verse-number references in summary text: a digit-sequence followed by
		// ". " that appears after whitespace or a semicolon (e.g. "8. Then placing…").
		// Also handles any pre-existing ℣.N patterns.
		const maxVerse = Math.max(...chapter.verses.map((v) => v.verse), 0);
		let t = text.replace(/(^|[\s;,])(\d+)\.\s+/g, (match, sep, n) => {
			const num = parseInt(n, 10);
			if (num < 1 || num > maxVerse) return match;
			const link = `<span class="summary-verse-ref">${n}.</span> `;
			return sep + link;
		});
		if (isStudy) {
			// Render <na>[N]</na> as clickable accent superscript
			t = t.replace(
				/<na>\[(\d+)\]<\/na>/g,
				(_, n) =>
					`<button class="study-marker" data-summary-note="${n}" aria-label="Summary note ${n}">${n}</button>`
			);
		} else {
			// Strip <na> tags and content in reading mode
			t = t.replace(/<na>[^<]*<\/na>/g, '');
			t = t.replace(/  +/g, ' ').trim();
		}
		return t;
	}

	function handleSummaryClick(e: MouseEvent) {
		// Summary note marker click → scroll study panel to summary section
		const noteBtn = (e.target as HTMLElement).closest('[data-summary-note]') as HTMLElement | null;
		if (!noteBtn) return;
		e.preventDefault();
		const marker = noteBtn.dataset.summaryNote ?? '';
		studyPanel.update((s) => ({
			...s,
			activeTab: 'commentary',
			scrollTrigger: { verse: 0, type: 'note', marker }
		}));
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
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
		<p
			class="text-subtle font-reader italic mb-lg text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
			on:click={handleSummaryClick}
		>
			{@html linkifySummary(chapter.summary, $prefs.readingMode === 'study')}
		</p>
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
		font-variant-numeric: tabular-nums;
	}
</style>
