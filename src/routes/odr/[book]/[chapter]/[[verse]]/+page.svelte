<script lang="ts">
	import type { PageData } from './$types';
	import BibleReader from '$lib/components/BibleReader.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let pageUrl = $derived(`https://thedouayrheims.com/odr/${data.bookMeta.slug}/${data.chapter.chapter}`);
	let pageTitle = $derived(`${data.bookMeta.odrName} ${data.chapter.chapter} in the Original Douay-Rheims Bible`);
	let pageDesc = $derived((() => {
		const base = `Read ${data.bookMeta.odrName} Chapter ${data.chapter.chapter} in the original Douay-Rheims Bible (1582–1610). Pre-Challoner English Catholic translation from the Latin Vulgate.`;
		if (data.chapter.summary && data.chapter.summary !== '---') {
			return `${base} ${data.chapter.summary.slice(0, 120)}`;
		}
		const firstVerse = data.chapter.verses?.[0]?.text ?? '';
		const plain = firstVerse.replace(/<[^>]*>/g, '').trim();
		const snippet = plain.length > 100 ? plain.slice(0, 100) + '…' : plain;
		return snippet ? `${base} ${snippet}`.slice(0, 160) : base;
	})());

	const scriptOpen = '<' + 'script type="application/ld+json">';
	const scriptClose = '</' + 'script>';
	const SITE = 'https://thedouayrheims.com';
	const bookId = SITE + '/#douay-rheims-bible';
	let jsonLdTag = $derived(`${scriptOpen}${JSON.stringify({
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
	})}${scriptClose}`);
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
	<meta property="og:image" content="https://thedouayrheims.com/images/dr-1582-rheims.webp" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDesc} />
	<meta name="twitter:image" content="https://thedouayrheims.com/images/dr-1582-rheims.webp" />
	{@html jsonLdTag}
</svelte:head>

{#key `${data.bookMeta.slug}-${data.chapter.chapter}`}
	<div>
		<BibleReader
			initialBookMeta={data.bookMeta}
			initialChapter={data.chapter}
			initialTotalChapters={data.totalChapters}
			targetVerse={data.targetVerse}
			routeBase="/odr"
			initialBookTitle={data.bookTitle}
			initialShortTitle={data.shortTitle}
		/>
	</div>
{/key}
