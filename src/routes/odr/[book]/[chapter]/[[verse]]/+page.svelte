<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import BibleReader from '$lib/components/BibleReader.svelte';

	export let data: PageData;
</script>

<svelte:head>
	<title>{data.bookMeta.odrName} {data.chapter.chapter} — Douay-Rheims Bible</title>
	<meta
		name="description"
		content="Read {data.bookMeta.odrName} Chapter {data.chapter
			.chapter} in the original Douay-Rheims Bible (1582–1610). Pre-Challoner English Catholic translation from the Latin Vulgate.{data
			.chapter.summary && data.chapter.summary !== '---'
			? ` ${data.chapter.summary.slice(0, 120)}`
			: ''}"
	/>
</svelte:head>

<div in:fade={{ duration: 140 }}>
	<BibleReader
		initialBookMeta={data.bookMeta}
		initialChapter={data.chapter}
		initialTotalChapters={data.totalChapters}
		targetVerse={data.targetVerse}
		routeBase="/odr"
	/>
</div>
