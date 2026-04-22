<script lang="ts">
	import type { PageData } from './$types';
	import FathersBar from '$lib/components/FathersBar.svelte';
	import FathersReader from '$lib/components/FathersReader.svelte';

	export let data: PageData;

	$: pageTitle = `${data.bookMeta.odrName} ${data.chapter.chapter} — Church Fathers | Douay-Rheims`;
	$: pageDesc = `Patristic commentary on ${data.bookMeta.odrName} Chapter ${data.chapter.chapter} from the Church Fathers.`;
	$: pageUrl = `https://thedouayrheims.com/fathers/${data.bookMeta.slug}/${data.chapter.chapter}`;
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDesc} />
	<link rel="canonical" href={pageUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDesc} />
	<meta property="og:url" content={pageUrl} />
</svelte:head>

{#key `${data.bookMeta.slug}-${data.chapter.chapter}`}
	<div>
		<FathersBar
			bookMeta={data.bookMeta}
			chapterNum={data.chapter.chapter}
			totalChapters={data.totalChapters}
		/>
		<FathersReader bookMeta={data.bookMeta} chapter={data.chapter} fathersData={data.fathersData} />
	</div>
{/key}
