<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import BibleReader from '$lib/components/BibleReader.svelte';

	export let data: PageData;

	$: pageUrl = `https://douayrheimsbible.pages.dev/odr/${data.bookMeta.slug}/${data.chapter.chapter}`;
	$: pageTitle = `${data.bookMeta.odrName} ${data.chapter.chapter} — Douay-Rheims Bible`;
	$: pageDesc = `Read ${data.bookMeta.odrName} Chapter ${data.chapter.chapter} in the original Douay-Rheims Bible (1582–1610). Pre-Challoner English Catholic translation from the Latin Vulgate.${data.chapter.summary && data.chapter.summary !== '---' ? ` ${data.chapter.summary.slice(0, 120)}` : ''}`;

	const scriptOpen = '<' + 'script type="application/ld+json">';
	const scriptClose = '</' + 'script>';
	$: jsonLdTag = `${scriptOpen}${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		name: `${data.bookMeta.odrName} Chapter ${data.chapter.chapter}`,
		headline: pageTitle,
		description: pageDesc,
		url: pageUrl,
		isPartOf: {
			'@type': 'Book',
			name: 'The Douay-Rheims Bible',
			inLanguage: 'en',
			datePublished: '1610'
		},
		breadcrumb: {
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: 'https://douayrheimsbible.pages.dev/'
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: data.bookMeta.odrName,
					item: `https://douayrheimsbible.pages.dev/odr/${data.bookMeta.slug}/1`
				},
				{ '@type': 'ListItem', position: 3, name: `Chapter ${data.chapter.chapter}`, item: pageUrl }
			]
		}
	})}${scriptClose}`;
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDesc} />
	<link rel="canonical" href={pageUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDesc} />
	<meta property="og:url" content={pageUrl} />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
	{@html jsonLdTag}
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
