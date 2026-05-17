<script lang="ts">
	import { run } from 'svelte/legacy';

	import { createEventDispatcher } from 'svelte';
	import { slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import type { Chapter } from '$lib/data/types';
	import type { FathersPericope } from '$lib/data/fathers-types';
	import { prefs } from '$lib/stores/prefs';
	import { TRANSLATIONS } from '$lib/stores/compare';
	import { loadTranslationBook } from '$lib/data/loader';
	import { displayVerseRef } from '$lib/utils/fathers-display';
	import { allcapsToSmallcaps } from '$lib/utils/text';

	interface Props {
		chapter: Chapter;
		pericopes?: FathersPericope[];
		verseEntryCounts: Record<number, number>;
		filteredVerseEntryCounts: Record<number, number> | null;
		selectedVerse: number | null;
		bookSlug: string;
		chapterNum: number;
		isOT?: boolean;
	}

	let {
		chapter,
		pericopes = [],
		verseEntryCounts,
		filteredVerseEntryCounts,
		selectedVerse,
		bookSlug,
		chapterNum,
		isOT = false
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		selectVerse: number;
		selectPericope: string;
	}>();


	function handleVerseClick(verseNum: number) {
		dispatch('selectVerse', verseNum);
	}

	// ── Translation selector ──────────────────────────────────────────
	let translationId = $state('odr');
	let translationOpen = $state(false);

	// Alternate verse text loaded from translation book JSON
	let altVerses: Record<number, string> | null = $state(null);
	let lastAltKey = $state('');



	async function loadAltVerses(tid: string, slug: string, ch: number) {
		try {
			const book = await loadTranslationBook(tid, slug, fetch);
			const chap = book.chapters.find((c) => c.chapter === ch);
			if (!chap) {
				altVerses = null;
				return;
			}
			const map: Record<number, string> = {};
			for (const v of chap.verses) {
				map[v.verse] = v.text;
			}
			if (`${tid}/${slug}/${ch}` === lastAltKey) altVerses = map;
		} catch {
			altVerses = null;
		}
	}

	// ── Verse text processing (stripped for reading) ──────────────────

	/** Strip <cr>, <na> tags and their content; strip <i> tags (keep content) */
	function stripMarkers(text: string): string {
		return text
			.replace(/<cr>[^<]*<\/cr>/g, '')
			.replace(/<na>[^<]*<\/na>/g, '')
			.replace(/<\/?i>/g, '')
			.replace(/  +/g, ' ')
			.trim();
	}

	/** Strip DRC superscript markers (¹²³) */
	const SUPER_RE = /[\u2070\u00B9\u00B2\u00B3\u2074-\u2079]+/g;
	function stripSuperscripts(text: string): string {
		return text.replace(SUPER_RE, '');
	}

	function cleanVerseText(text: string, showSmallCaps: boolean): string {
		let t = stripMarkers(text);
		t = stripSuperscripts(t);
		return showSmallCaps ? allcapsToSmallcaps(t) : t;
	}
	// Map: startVerse → pericope (for injecting headers before the verse)
	let pericopeAtVerse = $derived(new Map(pericopes.map((p) => [p.startVerse, p])));
	let liveTranslations = $derived(TRANSLATIONS.filter((t) => t.live && !t.hidden));
	let currentTranslation =
		$derived(liveTranslations.find((t) => t.id === translationId) ??
		liveTranslations.find((t) => t.id === 'odr')!);
	run(() => {
		const key = `${translationId}/${bookSlug}/${chapterNum}`;
		if (browser && translationId !== 'odr' && key !== lastAltKey) {
			lastAltKey = key;
			loadAltVerses(translationId, bookSlug, chapterNum);
		} else if (translationId === 'odr') {
			altVerses = null;
			lastAltKey = '';
		}
	});
</script>

<div class="h-full flex flex-col">
	<!-- Translation selector bar -->
	<div
		class="shrink-0 border-b border-border px-sm py-[8px] bg-panel flex items-center gap-[8px] font-ui relative z-20"
	>
		<div class="relative">
			<button
				class="flex items-center gap-[5px] px-[8px] py-[4px] rounded-[3px] text-[11px] font-medium border transition-colors duration-fast
					{translationOpen
					? 'bg-interactive text-white border-interactive'
					: 'border-border text-foreground hover:text-accent'}"
				onclick={() => (translationOpen = !translationOpen)}
			>
				{currentTranslation.abbr}
				<span class="text-[9px] opacity-70">{translationOpen ? '▲' : '▼'}</span>
			</button>
			{#if translationOpen}
				<div
					transition:slide={{ duration: 180 }}
					class="absolute top-full left-0 mt-[2px] bg-panel border border-border rounded-sm shadow-md z-20 w-[240px]"
				>
					{#each liveTranslations as t (t.id)}
						{@const isCurrent = t.id === translationId}
						{@const disabled = t.ntOnly && isOT}
						<button
							class="flex items-center justify-between w-full px-[8px] py-[6px] text-[12px] text-left transition-colors duration-fast
								{disabled
								? 'opacity-40 cursor-not-allowed'
								: isCurrent
									? 'bg-accent/10 font-semibold'
									: 'hover:bg-accent/5'}"
							{disabled}
							onclick={() => {
								if (!disabled) {
									translationId = t.id;
									translationOpen = false;
								}
							}}
						>
							<span class="text-foreground">{t.label}</span>
							{#if disabled}
								<span class="text-[10px] text-subtle">NT only</span>
							{:else if isCurrent}
								<span class="text-accent text-[10px]">✓</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
		<span class="text-[11px] text-subtle font-medium ml-auto">
			Chapter {chapter.chapter}
		</span>
	</div>

	<!-- Verse list -->
	<div
		class="flex-1 overflow-y-auto styled-scroll px-sm py-md"
		style="font-family: var(--font-reader)"
	>
		<div class="space-y-[2px]">
			{#each chapter.verses as verse}
				{@const pericope = pericopeAtVerse.get(verse.verse)}
				{@const totalCount = verseEntryCounts[verse.verse] ?? 0}
				{@const filteredCount = filteredVerseEntryCounts
					? (filteredVerseEntryCounts[verse.verse] ?? 0)
					: totalCount}
				{@const isSelected = selectedVerse === verse.verse}
				{@const hasBadge = totalCount > 0}
				{@const verseText = altVerses?.[verse.verse] ?? verse.text}

				<!-- Pericope header injected before the first verse in its range -->
				{#if pericope}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="pericope-header flex items-center gap-[8px] px-[6px] py-[6px] mt-[8px] mb-[2px] rounded-sm cursor-pointer transition-colors duration-fast border-l-2 border-accent/40 hover:bg-accent/10 hover:border-accent"
						onclick={() => dispatch('selectPericope', pericope.verseRef)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								dispatch('selectPericope', pericope.verseRef);
							}
						}}
					>
						<div class="flex-1 min-w-0">
							<span class="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
								{displayVerseRef(pericope.verseRef, $prefs.modernBookNames)}
							</span>
							{#if pericope.pericopeTitle}
								<p class="text-[11px] text-foreground/70 leading-snug truncate">
									{pericope.pericopeTitle}
								</p>
							{/if}
						</div>
						<span class="shrink-0 text-[10px] font-medium text-subtle whitespace-nowrap">
							{pericope.entries.length}
							{pericope.entries.length === 1 ? 'entry' : 'entries'}
						</span>
					</div>
				{/if}

				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="flex items-start gap-[8px] rounded-sm px-[6px] py-[4px] transition-colors duration-fast group
						{isSelected ? 'bg-accent/10' : ''}
						{hasBadge ? 'cursor-pointer hover:bg-border/20' : ''}"
					onclick={() => hasBadge && handleVerseClick(verse.verse)}
					onkeydown={(e) => {
						if ((e.key === 'Enter' || e.key === ' ') && hasBadge) {
							e.preventDefault();
							handleVerseClick(verse.verse);
						}
					}}
				>
					<span class="shrink-0 text-[11px] text-subtle font-medium w-[20px] text-right pt-[2px]">
						{verse.verse}
					</span>
					<span
						class="flex-1 text-[15px] leading-relaxed text-foreground"
						class:verse-annotated={hasBadge}
						class:verse-active={isSelected}
						>{@html cleanVerseText(verseText, $prefs.showSmallCaps ?? true)}</span
					>
					{#if hasBadge}
						<span
							class="shrink-0 mt-[3px] text-[10px] font-medium whitespace-nowrap transition-all duration-fast
								{filteredCount === 0
								? 'text-border opacity-50'
								: isSelected
									? 'text-accent'
									: 'text-subtle group-hover:text-accent'}"
						>
							{filteredCount}
							{filteredCount === 1 ? 'note' : 'notes'}
						</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.verse-annotated {
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-accent-text) 60%, transparent);
	}

	.verse-annotated:hover,
	.verse-active {
		text-decoration-style: solid;
		text-decoration-color: var(--color-accent-text);
	}
</style>
