<script lang="ts">
	import type { BookMeta, Chapter } from '$lib/data/types';
	import VerseList from './VerseList.svelte';

	export let bookMeta: BookMeta;
	export let chapter: Chapter;
	export let targetVerse: number | undefined;
	export let totalChapters: number;

	$: prevChapter = chapter.chapter > 1 ? chapter.chapter - 1 : null;
	$: nextChapter = chapter.chapter < totalChapters ? chapter.chapter + 1 : null;
</script>

<article data-pagefind-body data-book={bookMeta.slug} data-chapter={chapter.chapter}>
	<h1 class="font-ui text-muted text-sm uppercase tracking-wider mb-sm">
		{bookMeta.odrName}
	</h1>
	<h2 class="font-reader text-3xl mb-md">Chapter {chapter.chapter}</h2>

	{#if chapter.summary && chapter.summary !== '---'}
		<p class="text-muted font-reader italic mb-lg text-sm leading-relaxed">
			{chapter.summary}
		</p>
	{/if}

	<VerseList
		verses={chapter.verses}
		{targetVerse}
		bookSlug={bookMeta.slug}
		chapterNum={chapter.chapter}
	/>
</article>

<!-- Chapter navigation -->
<nav class="flex justify-between items-center mt-2xl py-lg border-t border-border font-ui text-sm">
	{#if prevChapter}
		<a href="/odr/{bookMeta.slug}/{prevChapter}" class="text-interactive hover:underline">
			‹ Chapter {prevChapter}
		</a>
	{:else}
		<span></span>
	{/if}
	{#if nextChapter}
		<a href="/odr/{bookMeta.slug}/{nextChapter}" class="text-interactive hover:underline">
			Chapter {nextChapter} ›
		</a>
	{:else}
		<span></span>
	{/if}
</nav>
