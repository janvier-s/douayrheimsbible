<script lang="ts">
	import type { Chapter, BookMeta } from '$lib/data/types';
	import type { FathersChapterFile } from '$lib/data/fathers-types';
	import FathersVerseList from './FathersVerseList.svelte';
	import FathersCommentaryPanel from './FathersCommentaryPanel.svelte';

	export let bookMeta: BookMeta;
	export let chapter: Chapter;
	export let fathersData: FathersChapterFile | null;

	let selectedVerse: number | null = null;
	let selectedPericope: string | null = null;

	function handleVerseSelect(e: CustomEvent<number>) {
		const verse = e.detail;
		selectedVerse = selectedVerse === verse ? null : verse;
		selectedPericope = null;
	}

	function handlePericopeSelect(e: CustomEvent<string>) {
		selectedPericope = e.detail;
		selectedVerse = null;
	}

	let filteredVerseEntryCounts: Record<number, number> | null = null;

	function handleFilteredCounts(e: CustomEvent<Record<number, number> | null>) {
		filteredVerseEntryCounts = e.detail;
	}

	$: data = fathersData ?? { pericopes: [], verseEntryCounts: {}, totalEntries: 0 };
</script>

<div class="flex items-stretch" style="height: calc(100vh - 100px);">
	<!-- Left pane: verse reader (hidden on mobile) -->
	<div class="border-r border-border hidden md:flex md:flex-col" style="width: 50%;">
		<FathersVerseList
			{chapter}
			pericopes={data.pericopes}
			bookSlug={bookMeta.slug}
			chapterNum={chapter.chapter}
			isOT={bookMeta.testament === 'OT'}
			verseEntryCounts={data.verseEntryCounts}
			{filteredVerseEntryCounts}
			{selectedVerse}
			on:selectVerse={handleVerseSelect}
			on:selectPericope={handlePericopeSelect}
		/>
	</div>

	<!-- Right pane: commentary panel -->
	<div class="flex-1 min-w-0 overflow-hidden">
		<FathersCommentaryPanel
			chapterData={data}
			{selectedVerse}
			{selectedPericope}
			on:filteredCounts={handleFilteredCounts}
		/>
	</div>
</div>
