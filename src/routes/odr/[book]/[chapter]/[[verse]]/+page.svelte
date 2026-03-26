<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import BibleReader from '$lib/components/BibleReader.svelte';

	export let data: PageData;
</script>

<svelte:head>
	<title>{data.bookMeta.odrName} {data.chapter.chapter} — ODR Bible</title>
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
