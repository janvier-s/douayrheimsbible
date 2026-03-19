<script lang="ts">
	import type { BookMeta, Chapter } from '$lib/data/types';
	import VerseList from './VerseList.svelte';

	export let bookMeta: BookMeta;
	export let chapter: Chapter;
	export let targetVerse: number | undefined;
	export let totalChapters: number;
	export let showNav: boolean = true;

	$: prevChapter = chapter.chapter > 1 ? chapter.chapter - 1 : null;
	$: nextChapter = chapter.chapter < totalChapters ? chapter.chapter + 1 : null;

	let activeVerse: number | undefined = targetVerse;
	$: if (targetVerse !== undefined) activeVerse = targetVerse;

	function linkifySummary(text: string): string {
		return text.replace(/℣\.(\d+)/g, (_, n) => {
			return `<a href="#v${n}" data-verse="${n}" class="summary-verse-ref">℣.${n}</a>`;
		});
	}

	function handleSummaryClick(e: MouseEvent) {
		const el = (e.target as HTMLElement).closest('[data-verse]') as HTMLElement | null;
		if (el?.dataset.verse) activeVerse = parseInt(el.dataset.verse);
	}
</script>

<article data-pagefind-body data-book={bookMeta.slug} data-chapter={chapter.chapter}>
	<header class="mb-[35px]">
		<p class="font-ui text-[11px] uppercase tracking-[0.3em] text-subtle mb-sm">
			{bookMeta.odrName}
		</p>
		<h1 class="font-reader text-[2.5rem] leading-[1.2] tracking-[-0.01em] text-foreground mb-sm">
			Chapter {chapter.chapter}
		</h1>
		<div class="w-10 h-px bg-interactive opacity-70"></div>
	</header>

	{#if chapter.summary && chapter.summary !== '---'}
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
		<p
			class="text-subtle font-reader italic mb-lg text-base leading-[var(--line-height-reader)]"
			on:click={handleSummaryClick}
		>
			{@html linkifySummary(chapter.summary)}
		</p>
	{/if}

	<VerseList
		verses={chapter.verses}
		targetVerse={activeVerse}
		bookSlug={bookMeta.slug}
		chapterNum={chapter.chapter}
	/>
</article>

{#if showNav}
	<nav class="flex justify-between items-start mt-xl pt-lg border-t border-border font-ui">
		{#if prevChapter}
			<a
				href="/odr/{bookMeta.slug}/{prevChapter}"
				class="group flex flex-col gap-[3px] text-subtle hover:text-interactive transition-colors duration-fast"
			>
				<span class="text-[10px] uppercase tracking-[0.2em]">Previous</span>
				<span class="text-sm">Chapter {prevChapter}</span>
			</a>
		{:else}
			<span></span>
		{/if}
		{#if nextChapter}
			<a
				href="/odr/{bookMeta.slug}/{nextChapter}"
				class="group flex flex-col gap-[3px] text-right text-subtle hover:text-interactive transition-colors duration-fast"
			>
				<span class="text-[10px] uppercase tracking-[0.2em]">Next</span>
				<span class="text-sm">Chapter {nextChapter}</span>
			</a>
		{:else}
			<span></span>
		{/if}
	</nav>
{/if}

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
