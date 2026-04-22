<script lang="ts">
	import type { BookMeta, Chapter } from '$lib/data/types';
	import { getHebPsalmNum, getPrevNavBook, getNextNavBook } from '$lib/data/books';
	import { onDestroy } from 'svelte';
	import { allcapsToSmallcaps } from '$lib/utils/text';
	import { tokenizeCrossRef } from '$lib/search/crossRefParser';
	import { OSIS_TO_SLUG } from '$lib/search/resolve';
	import type { OsisRange } from '$lib/search/reference';
	import VerseList from './VerseList.svelte';
	import VerseTooltip from './VerseTooltip.svelte';
	import { prefs } from '$lib/stores/prefs';
	import { studyPanel, scrollTrigger } from '$lib/stores/studyPanel';

	export let bookMeta: BookMeta;
	export let chapter: Chapter;
	export let targetVerse: number | undefined;
	export let totalChapters: number;
	export let showNav: boolean = true;
	export let routeBase: string = '/odr';
	export let translationId: string = 'odr';
	export let headingLevel: 'h1' | 'h2' = 'h1';
	export let bookTitle: string | null | undefined = undefined;
	export let shortTitle: string | null | undefined = undefined;

	function renderLine(line: string): string {
		// Wrap Hebrew characters (U+0590–U+05FF, U+FB1D–U+FB4F) in a span
		let out = line.replace(
			/([\u0590-\u05FF\uFB1D-\uFB4F]+(?:\s[\u0590-\u05FF\uFB1D-\uFB4F]+)*)/g,
			'<span class="hebrew">$1</span>'
		);
		// Wrap Greek characters (basic U+0370–U+03FF + extended polytonic U+1F00–U+1FFF)
		out = out.replace(
			/([\u0370-\u03FF\u1F00-\u1FFF]+(?:\s[\u0370-\u03FF\u1F00-\u1FFF]+)*)/g,
			'<span class="greek">$1</span>'
		);
		return out;
	}

	function bookLabel(bm: BookMeta, override?: string | null): string {
		if (!$prefs.modernBookNames && override) return override;
		return $prefs.modernBookNames ? bm.modernName : bm.odrName;
	}

	$: prevNavBook = chapter.chapter <= 1 ? (getPrevNavBook(bookMeta.slug) ?? null) : null;
	$: prevNav =
		chapter.chapter > 1
			? {
					slug: bookMeta.slug,
					ch: chapter.chapter - 1,
					label: `Ch. ${chapter.chapter - 1}`,
					chLabel: null
				}
			: prevNavBook
				? {
						slug: prevNavBook.slug,
						ch: prevNavBook.chapters,
						label: bookLabel(prevNavBook),
						chLabel: `Ch. ${prevNavBook.chapters}`
					}
				: null;

	$: nextNavBook =
		chapter.chapter >= totalChapters ? (getNextNavBook(bookMeta.slug) ?? null) : null;
	$: nextNav =
		chapter.chapter < totalChapters
			? {
					slug: bookMeta.slug,
					ch: chapter.chapter + 1,
					label: `Ch. ${chapter.chapter + 1}`,
					chLabel: null
				}
			: nextNavBook
				? {
						slug: nextNavBook.slug,
						ch: 1,
						label: bookLabel(nextNavBook),
						chLabel: 'Ch. 1'
					}
				: null;

	$: hebrewPsalmNum = (() => {
		if (!$prefs.showPsalmNumbers || bookMeta.slug !== 'psalms') return null;
		return getHebPsalmNum(chapter.chapter);
	})();

	let activeVerse: number | undefined = targetVerse;
	$: if (targetVerse !== undefined) activeVerse = targetVerse;

	// Verse 0 is a summary continuation fragment — merge it into the summary display
	$: verse0 = chapter.verses.find((v) => v.verse === 0);
	$: fullSummary = verse0 ? (chapter.summary ?? '') + ' ' + verse0.text : (chapter.summary ?? '');
	$: displayVerses = verse0 ? chapter.verses.filter((v) => v.verse !== 0) : chapter.verses;
	// Reactive declaration ensures Svelte tracks the readingMode dependency properly
	// (inline {@html fn(x, $store)} can miss updates during SSR → client hydration)
	$: summaryHtml =
		fullSummary && fullSummary !== '---'
			? linkifySummary(fullSummary, $prefs.readingMode === 'study')
			: '';

	/** Strip trailing cross-reference text that follows the last </na> marker group.
	 *  e.g. "<na>[1]</na><na>[2]</na> Gen. 12. 22. 2. Reg. 7. Psal. 131." → remove "Gen. 12. …"
	 *  Also handles Latin shorthand like "li. 2. ch. 2. v. 20." and bare numbers "83. 93." */
	function stripTrailingCrossRefs(raw: string): string {
		const lastIdx = raw.lastIndexOf('</na>');
		if (lastIdx < 0) return raw;
		const afterNa = raw.slice(lastIdx + 5).trim();
		if (!afterNa) return raw;
		// If the tokenizer recognises it all as Bible refs, strip it
		const tokens = tokenizeCrossRef(afterNa);
		const allRefs = tokens.every(
			(t) => t.type === 'ref' || (t.type === 'text' && /^[\s.,;&]+$/.test(t.content))
		);
		if (allRefs && tokens.some((t) => t.type === 'ref')) {
			return raw.slice(0, lastIdx + 5);
		}
		// Also strip short trailing text that has no real words (Latin abbreviations,
		// bare numbers like "li. 2. ch. 2. v. 20." or "83. 93." or "7")
		const hasRealWord = /[a-zA-Z]{6,}/.test(afterNa);
		if (!hasRealWord && afterNa.length < 40) {
			return raw.slice(0, lastIdx + 5);
		}
		return raw;
	}

	function linkifySummary(text: string, isStudy: boolean): string {
		// Strip trailing cross-ref text (e.g. "Gen. 12. 22.") BEFORE verse-number
		// linkification — Pass 1/2 wrap numbers in <span> tags which breaks the tokenizer
		let t = stripTrailingCrossRefs(text);

		// Match verse-number references in summary text: a digit-sequence followed by
		// ". " that appears after whitespace or a semicolon (e.g. "8. Then placing…").
		const maxVerse = Math.max(...chapter.verses.map((v) => v.verse), 0);
		// Pass 1: "N. " — number with trailing period (most common)
		t = t.replace(/(^|[\s;,])(\d+)\.\s+/g, (match, sep, n) => {
			const num = parseInt(n, 10);
			if (num < 1 || num > maxVerse) return match;
			return sep + `<span class="summary-verse-ref" data-verse="${n}">${n}.</span> `;
		});
		// Pass 2: "N " — bare number after sentence punctuation (e.g. "Christ. 3 The")
		t = t.replace(/([.,:;])\s+(\d+)\s+/g, (match, punct, n) => {
			const num = parseInt(n, 10);
			if (num < 1 || num > maxVerse) return match;
			return punct + ' ' + `<span class="summary-verse-ref" data-verse="${n}">${n}</span> `;
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
		t = allcapsToSmallcaps(t);
		return t;
	}

	function handleSummaryClick(e: MouseEvent) {
		// Summary note marker click → scroll study panel to summary section
		const noteBtn = (e.target as HTMLElement).closest('[data-summary-note]') as HTMLElement | null;
		if (!noteBtn) return;
		e.preventDefault();
		const marker = noteBtn.dataset.summaryNote ?? '';
		studyPanel.update((s) => ({ ...s, annotatedVerse: 0 }));
		scrollTrigger.set({ verse: 0, type: 'note', marker });
	}

	// --- Summary verse-ref tooltip ---
	/** Reverse lookup: slug → OSIS book code */
	const SLUG_TO_OSIS: Record<string, string> = {};
	for (const [osis, slug] of Object.entries(OSIS_TO_SLUG)) {
		if (!SLUG_TO_OSIS[slug]) SLUG_TO_OSIS[slug] = osis;
	}

	let svRefRanges: OsisRange[] = [];
	let svRefAnchor: HTMLElement | null = null;
	let svRefVisible = false;
	let svRefTimer: ReturnType<typeof setTimeout> | null = null;

	function handleSummaryOver(e: Event) {
		const target = e.target as HTMLElement;
		const ref = target.closest('.summary-verse-ref') as HTMLElement | null;
		if (!ref) return;
		if (svRefTimer) clearTimeout(svRefTimer);
		const verseNum = parseInt(ref.dataset.verse ?? '', 10);
		if (!verseNum) return;
		const osisBook = SLUG_TO_OSIS[bookMeta.slug];
		if (!osisBook) return;
		svRefRanges = [
			{
				osis: `${osisBook}.${chapter.chapter}.${verseNum}`,
				book: osisBook,
				startChapter: chapter.chapter,
				startVerse: verseNum,
				endChapter: chapter.chapter,
				endVerse: verseNum
			}
		];
		svRefAnchor = ref;
		svRefVisible = true;
	}

	function handleSummaryOut(e: Event) {
		const me = e as MouseEvent;
		const related = me.relatedTarget as HTMLElement | null;
		if (related?.closest?.('.tooltip')) return;
		const ref = (e.target as HTMLElement).closest('.summary-verse-ref') as HTMLElement | null;
		if (ref) {
			svRefTimer = setTimeout(() => {
				svRefVisible = false;
				svRefAnchor = null;
			}, 120);
		}
	}

	onDestroy(() => {
		if (svRefTimer) clearTimeout(svRefTimer);
	});
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
						<span class="text-[10px] normal-case tracking-normal opacity-80">{prevNav.chLabel}</span
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
						<span class="text-[10px] normal-case tracking-normal opacity-80">{nextNav.chLabel}</span
						>
					{/if}
				</span>
				<span class="text-[16px] leading-none">›</span>
			</a>
		{/if}
	</nav>
{/if}

<article data-pagefind-body data-book={bookMeta.slug} data-chapter={chapter.chapter}>
	{#if chapter.chapter === 1 && bookTitle}
		<header class="book-title-header mb-[50px] text-center">
			{#each bookTitle.split('\n') as line, i}
				{#if i === 0}
					<span class="book-title-main">{line}</span>
				{:else}
					<span class="book-title-sub">{@html renderLine(line)}</span>
				{/if}
			{/each}
		</header>
	{/if}

	<header class="mb-[35px]">
		<p class="font-ui text-[11px] uppercase tracking-[0.3em] text-subtle mb-sm">
			{bookLabel(bookMeta, shortTitle)}
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

	{#if fullSummary && fullSummary !== '---'}
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions a11y_no_static_element_interactions a11y-mouse-events-have-key-events -->
		<p
			class="text-subtle font-reader italic mb-lg text-[length:var(--font-size-reader)] leading-[var(--line-height-reader)]"
			on:click={handleSummaryClick}
			on:mouseover={handleSummaryOver}
			on:mouseout={handleSummaryOut}
			on:focus={undefined}
			on:blur={undefined}
		>
			{@html summaryHtml}
		</p>

		<VerseTooltip
			osisRanges={svRefRanges}
			anchorEl={svRefAnchor}
			visible={svRefVisible}
			{translationId}
			on:mouseenter={() => {
				if (svRefTimer) clearTimeout(svRefTimer);
			}}
			on:mouseleave={() => {
				svRefTimer = setTimeout(() => {
					svRefVisible = false;
					svRefAnchor = null;
				}, 120);
			}}
		/>
	{/if}

	<VerseList
		verses={displayVerses}
		targetVerse={activeVerse}
		bookSlug={bookMeta.slug}
		chapterNum={chapter.chapter}
		{translationId}
	/>
</article>

<style>
	:global(.summary-verse-ref) {
		color: var(--color-muted);
		font-style: normal;
		cursor: pointer;
	}

	:global(.summary-verse-ref:hover) {
		color: var(--color-accent);
	}

	.book-title-header {
		padding: 30px 20px 0;
	}

	.book-title-main {
		font-family: var(--font-reader);
		font-size: 2rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		color: var(--color-text);
		display: block;
	}

	.book-title-sub {
		font-family: var(--font-reader);
		font-size: 1.1rem;
		font-style: italic;
		letter-spacing: 0.02em;
		color: var(--color-subtle);
		display: block;
		margin-top: 2px;
	}

	.book-title-sub :global(.hebrew) {
		font-family: 'Frank Ruhl Libre', 'David', 'Times New Roman', serif;
		font-style: normal;
		font-size: 1.3rem;
		letter-spacing: 0.05em;
		direction: rtl;
		unicode-bidi: bidi-override;
	}
</style>
