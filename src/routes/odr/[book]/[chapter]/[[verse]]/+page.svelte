<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { PageData } from './$types';
	import BibleReader from '$lib/components/BibleReader.svelte';

	export let data: PageData;

	$: pageUrl = `https://thedouayrheims.com/odr/${data.bookMeta.slug}/${data.chapter.chapter}`;
	$: pageTitle = `${data.bookMeta.odrName} ${data.chapter.chapter} | Original Douay-Rheims Bible`;
	$: pageDesc = `Read ${data.bookMeta.odrName} Chapter ${data.chapter.chapter} in the original Douay-Rheims Bible (1582–1610). Pre-Challoner English Catholic translation from the Latin Vulgate.${data.chapter.summary && data.chapter.summary !== '---' ? ` ${data.chapter.summary.slice(0, 120)}` : ''}`;

	const scriptOpen = '<' + 'script type="application/ld+json">';
	const scriptClose = '</' + 'script>';
	const SITE = 'https://thedouayrheims.com';
	const bookId = SITE + '/#douay-rheims-bible';
	$: jsonLdTag = `${scriptOpen}${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'Book',
				'@id': bookId,
				name: 'The Douay-Rheims Bible',
				alternateName: ['Douay Bible', 'Rheims Bible', 'Original Douay-Rheims'],
				inLanguage: 'en',
				datePublished: '1610',
				publisher: {
					'@type': 'Organization',
					name: 'English College in Douai'
				},
				translationOfWork: {
					'@type': 'Book',
					name: 'Latin Vulgate',
					inLanguage: 'la'
				},
				description:
					'The first complete English Catholic translation of Sacred Scripture, rendered from the Latin Vulgate and published at Rheims (New Testament, 1582) and Douai (Old Testament, 1609\u20131610). This is the original pre-Challoner text, prior to Bishop Challoner\u2019s extensive revision of 1749\u20131752.'
			},
			{
				'@type': 'Article',
				name: `${data.bookMeta.odrName} Chapter ${data.chapter.chapter}`,
				headline: pageTitle,
				description: pageDesc,
				url: pageUrl,
				isPartOf: { '@id': bookId },
				breadcrumb: {
					'@type': 'BreadcrumbList',
					itemListElement: [
						{
							'@type': 'ListItem',
							position: 1,
							name: 'Home',
							item: SITE + '/'
						},
						{
							'@type': 'ListItem',
							position: 2,
							name: data.bookMeta.odrName,
							item: `${SITE}/odr/${data.bookMeta.slug}/1`
						},
						{
							'@type': 'ListItem',
							position: 3,
							name: `Chapter ${data.chapter.chapter}`,
							item: pageUrl
						}
					]
				}
			}
		]
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
	{#key data.bookMeta.slug + '-' + data.chapter.chapter}
		<BibleReader
			initialBookMeta={data.bookMeta}
			initialChapter={data.chapter}
			initialTotalChapters={data.totalChapters}
			targetVerse={data.targetVerse}
			routeBase="/odr"
		/>
	{/key}
</div>
