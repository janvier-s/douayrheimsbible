<script lang="ts">
	import type { PageData } from './$types';
	import FathersBar from '$lib/components/FathersBar.svelte';
	import FathersReader from '$lib/components/FathersReader.svelte';

	export let data: PageData;

	const SITE = 'https://thedouayrheims.com';
	const OG_IMAGE = SITE + '/images/dr-1582-rheims.webp';

	$: pageTitle = `${data.bookMeta.odrName} ${data.chapter.chapter} — Church Fathers · Douay-Rheims`;
	$: pageDesc = `Patristic commentary on ${data.bookMeta.odrName} Chapter ${data.chapter.chapter} from the Church Fathers. Early Christian interpretation alongside the Douay-Rheims text.`;
	$: pageUrl = `${SITE}/fathers/${data.bookMeta.slug}/${data.chapter.chapter}`;

	const scriptOpen = '<' + 'script type="application/ld+json">';
	const scriptClose = '</' + 'script>';
	$: jsonLdTag = `${scriptOpen}${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: pageTitle,
		description: pageDesc,
		url: pageUrl,
		image: OG_IMAGE,
		author: { '@type': 'Organization', name: 'Douay-Rheims Bible', url: SITE },
		publisher: {
			'@type': 'Organization',
			name: 'Douay-Rheims Bible',
			url: SITE,
			logo: { '@type': 'ImageObject', url: SITE + '/favicon-96x96.png' }
		},
		breadcrumb: {
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
				{
					'@type': 'ListItem',
					position: 2,
					name: data.bookMeta.odrName,
					item: `${SITE}/fathers/${data.bookMeta.slug}/1`
				},
				{
					'@type': 'ListItem',
					position: 3,
					name: `Chapter ${data.chapter.chapter}`,
					item: pageUrl
				}
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
	<meta property="og:image" content={OG_IMAGE} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDesc} />
	<meta name="twitter:image" content={OG_IMAGE} />
	{@html jsonLdTag}
</svelte:head>

{#key `${data.bookMeta.slug}-${data.chapter.chapter}`}
	<div id="main-content" class="flex flex-col h-screen">
		<FathersBar
			bookMeta={data.bookMeta}
			chapterNum={data.chapter.chapter}
			totalChapters={data.totalChapters}
		/>
		<FathersReader bookMeta={data.bookMeta} chapter={data.chapter} fathersData={data.fathersData} />
	</div>
{/key}
