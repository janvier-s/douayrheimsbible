<script lang="ts">
	import type { Chapter, BookMeta } from '$lib/data/types';
	import type { FathersChapterFile } from '$lib/data/fathers-types';
	import FathersVerseList from './FathersVerseList.svelte';
	import FathersCommentaryPanel from './FathersCommentaryPanel.svelte';

	interface Props {
		bookMeta: BookMeta;
		chapter: Chapter;
		fathersData: FathersChapterFile | null;
	}

	let { bookMeta, chapter, fathersData }: Props = $props();

	let selectedVerse: number | null = $state(null);
	let selectedPericope: string | null = $state(null);

	function handleVerseSelect(e: CustomEvent<number>) {
		const verse = e.detail;
		selectedVerse = selectedVerse === verse ? null : verse;
		selectedPericope = null;
	}

	function handlePericopeSelect(e: CustomEvent<string>) {
		selectedPericope = e.detail;
		selectedVerse = null;
	}

	let filteredVerseEntryCounts: Record<number, number> | null = $state(null);

	function handleFilteredCounts(e: CustomEvent<Record<number, number> | null>) {
		filteredVerseEntryCounts = e.detail;
	}

	let data = $derived(fathersData ?? { pericopes: [], verseEntryCounts: {}, totalEntries: 0 });
</script>

<div class="flex flex-1 items-stretch min-h-0">
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
