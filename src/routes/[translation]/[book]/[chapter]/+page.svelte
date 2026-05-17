<script lang="ts">
	import type { PageData } from './$types';
	import BibleReader from '$lib/components/BibleReader.svelte';
	import { prefs } from '$lib/stores/prefs';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let bookDisplayName = $derived(
		$prefs.modernBookNames ? data.bookMeta.modernName : data.bookMeta.odrName
	);

	const SITE = 'https://thedouayrheims.com';
	const OG_IMAGE = SITE + '/images/dr-1582-rheims.webp';

	let pageTitle = $derived(
		`${data.bookMeta.odrName} ${data.chapter?.chapter ?? ''} in the ${data.seoName ?? data.translationLabel}`
	);
	let pageDesc = $derived(
		(() => {
			const base = data.seoDesc || '';
			if (base.length >= 80) return base;
			const firstVerse = data.chapter?.verses?.[0]?.text ?? '';
			const plain = firstVerse.replace(/<[^>]*>/g, '').trim();
			const snippet = plain.length > 100 ? plain.slice(0, 100) + '…' : plain;
			if (!snippet) return base;
			return base ? `${base} ${snippet}`.slice(0, 160) : snippet.slice(0, 160);
		})()
	);
	let pageUrl = $derived(
		data.chapter
			? `${SITE}/${data.translationId}/${data.bookMeta.slug}/${data.chapter.chapter}`
			: `${SITE}/${data.translationId}/${data.bookMeta.slug}/1`
	);

	const scriptOpen = '<' + 'script type="application/ld+json">';
	const scriptClose = '</' + 'script>';
	const bookId = SITE + '/#douay-rheims-bible';
	let jsonLdTag = $derived(
		data.chapter && !data.ntOnly
			? `${scriptOpen}${JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'Article',
					headline: pageTitle,
					description: pageDesc,
					url: pageUrl,
					image: OG_IMAGE,
					isPartOf: { '@id': bookId },
					breadcrumb: {
						'@type': 'BreadcrumbList',
						itemListElement: [
							{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
							{
								'@type': 'ListItem',
								position: 2,
								name: data.bookMeta.odrName,
								item: `${SITE}/${data.translationId}/${data.bookMeta.slug}/1`
							},
							{
								'@type': 'ListItem',
								position: 3,
								name: `Chapter ${data.chapter.chapter}`,
								item: pageUrl
							}
						]
					}
				})}${scriptClose}`
			: ''
	);
</script>

<svelte:head>
	<title>{pageTitle}</title>
	{#if pageDesc}
		<meta name="description" content={pageDesc} />
	{/if}
	{#if data.chapter && !data.ntOnly}
		<link rel="canonical" href={pageUrl} />
		<meta property="og:type" content="article" />
		<meta property="og:title" content={pageTitle} />
		{#if pageDesc}<meta property="og:description" content={pageDesc} />{/if}
		<meta property="og:url" content={pageUrl} />
		<meta property="og:site_name" content="Douay-Rheims Bible" />
		<meta property="og:image" content={OG_IMAGE} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={pageTitle} />
		{#if pageDesc}<meta name="twitter:description" content={pageDesc} />{/if}
		<meta name="twitter:image" content={OG_IMAGE} />
		{@html jsonLdTag}
	{/if}
</svelte:head>

{#if data.ntOnly}
	<div class="nt-only-notice">
		<div class="notice-card">
			<span class="notice-icon" aria-hidden="true">✦</span>
			<h2 class="notice-title">Book Not Available</h2>
			<p class="notice-body">
				<strong>{bookDisplayName}</strong> is an Old Testament book. The {data.translationLabel} only
				covers the New Testament.
			</p>
			<div class="notice-actions">
				<a href="/odr/{data.bookMeta.slug}/1" class="notice-btn notice-btn-secondary">
					Read in Original Douay-Rheims
				</a>
				<a href="/{data.translationId}/matthew/1" class="notice-btn notice-btn-primary">
					Go to Matthew 1
				</a>
			</div>
		</div>
	</div>
{:else if data.chapter}
	{#key `${data.translationId}-${data.bookMeta.slug}-${data.chapter.chapter}`}
		<div>
			<BibleReader
				initialBookMeta={data.bookMeta}
				initialChapter={data.chapter}
				initialTotalChapters={data.totalChapters}
				routeBase={`/${data.translationId}`}
				translationId={data.translationId}
			/>
		</div>
	{/key}
{/if}

<style>
	.nt-only-notice {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: 40px 20px;
	}

	.notice-card {
		max-width: 440px;
		text-align: center;
		font-family: var(--font-ui);
	}

	.notice-icon {
		font-size: 20px;
		color: var(--color-accent);
		display: block;
		margin-bottom: 16px;
	}

	.notice-title {
		font-size: 22px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 12px;
	}

	.notice-body {
		font-size: 15px;
		line-height: 1.6;
		color: var(--color-subtle);
		margin: 0 0 28px;
	}

	.notice-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.notice-btn {
		display: block;
		padding: 12px 20px;
		border-radius: 4px;
		font-size: 14px;
		font-weight: 500;
		text-decoration: none;
		text-align: center;
		transition:
			background-color 150ms ease,
			color 150ms ease;
	}

	.notice-btn-primary {
		background: var(--color-accent);
		color: white;
	}

	.notice-btn-primary:hover {
		background: color-mix(in srgb, var(--color-accent) 85%, black);
	}

	.notice-btn-secondary {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		color: var(--color-accent);
	}

	.notice-btn-secondary:hover {
		background: color-mix(in srgb, var(--color-accent) 15%, transparent);
	}
</style>
