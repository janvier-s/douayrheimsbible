<script lang="ts">
	import type { PageData } from './$types';
	import ChapterView from '$lib/components/ChapterView.svelte';

	export let data: PageData;
</script>

<svelte:head>
	<title>{data.bookMeta.odrName} {data.chapter.chapter} — Original Douay-Rheims Bible</title>
</svelte:head>

<main class="max-w-[750px] mx-auto px-md py-xl">
	<ChapterView
		bookMeta={data.bookMeta}
		chapter={data.chapter}
		targetVerse={data.targetVerse}
		totalChapters={data.totalChapters}
	/>
</main>
