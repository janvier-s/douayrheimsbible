<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import TopBar from '$lib/components/TopBar.svelte';
	import BibleReader from '$lib/components/BibleReader.svelte';
	import { readingPosition } from '$lib/stores/reading';
	import { prefs } from '$lib/stores/prefs';

	export let data: PageData;

	$: bookSlug = $readingPosition?.bookSlug ?? data.bookMeta.slug;

	// Only show chapterNum (and thus the tab bar) once the reader section is in view
	let readerVisible = false;
	let readerEl: HTMLElement;
	let readerObs: IntersectionObserver | null = null;

	let reducedMotion = false;
	let showSkipCheckbox = false;

	onMount(async () => {
		if ($prefs.skipHomepage) {
			await goto('/odr/genesis/1', { replaceState: true });
			return;
		}
		if (!$prefs.hasVisitedHomepage) {
			prefs.update((p) => ({ ...p, hasVisitedHomepage: true }));
		} else {
			showSkipCheckbox = true;
		}

		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mq.matches;
		mq.addEventListener('change', (e) => (reducedMotion = e.matches));

		readerObs = new IntersectionObserver(
			([entry]) => {
				readerVisible = entry.isIntersecting;
			},
			{ threshold: 0 }
		);
		if (readerEl) readerObs.observe(readerEl);
	});

	onDestroy(() => readerObs?.disconnect());

	$: chapterNum = readerVisible && $readingPosition ? String($readingPosition.chapter) : '';

	const scriptOpen = '<' + 'script type="application/ld+json">';
	const scriptClose = '</' + 'script>';
	const SITE = 'https://thedouayrheims.com';
	const websiteSchema =
		scriptOpen +
		JSON.stringify({
			'@context': 'https://schema.org',
			'@graph': [
				{
					'@type': 'WebSite',
					'@id': SITE + '/#website',
					url: SITE,
					name: 'Douay-Rheims Bible',
					description:
						'The original pre-Challoner Douay-Rheims Bible online: the first complete English Catholic translation of Sacred Scripture, 1582–1610.',
					potentialAction: {
						'@type': 'SearchAction',
						target: { '@type': 'EntryPoint', urlTemplate: SITE + '/search?q={search_term_string}' },
						'query-input': 'required name=search_term_string'
					}
				},
				{
					'@type': 'Organization',
					'@id': SITE + '/#organization',
					url: SITE,
					name: 'Douay-Rheims Bible',
					logo: {
						'@type': 'ImageObject',
						url: SITE + '/favicon-96x96.png',
						width: 96,
						height: 96
					},
					sameAs: []
				},
				{
					'@type': 'ItemList',
					name: 'Bible Translations',
					itemListElement: [
						{
							'@type': 'SiteNavigationElement',
							position: 1,
							name: 'Original Douay-Rheims (1582–1610)',
							url: SITE + '/odr/genesis/1'
						},
						{
							'@type': 'SiteNavigationElement',
							position: 2,
							name: 'Douay-Rheims Challoner (1752)',
							url: SITE + '/drc/genesis/1'
						},
						{
							'@type': 'SiteNavigationElement',
							position: 3,
							name: 'Clementine Vulgate (Latin)',
							url: SITE + '/vul/genesis/1'
						},
						{
							'@type': 'SiteNavigationElement',
							position: 4,
							name: 'King James Version (1611)',
							url: SITE + '/kjv/genesis/1'
						},
						{
							'@type': 'SiteNavigationElement',
							position: 5,
							name: 'Knox Bible (1955)',
							url: SITE + '/knox/genesis/1'
						},
						{
							'@type': 'SiteNavigationElement',
							position: 6,
							name: 'Catholic Public Domain Version',
							url: SITE + '/cpdv/genesis/1'
						},
						{
							'@type': 'SiteNavigationElement',
							position: 7,
							name: 'Confraternity NT (1941)',
							url: SITE + '/conf/matthew/1'
						}
					]
				}
			]
		}) +
		scriptClose;
</script>

<svelte:head>
	<title>The Original Pre-Challoner Douay-Rheims Bible, 1582–1610</title>
	<meta
		name="description"
		content="Read the Original Douay-Rheims Bible online | the first complete English Catholic translation from the Latin Vulgate, 1582–1610. Compare translations, search Scripture, and explore the original pre-Challoner text."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/" />
	<meta property="og:type" content="website" />
	<meta
		property="og:title"
		content="The Original Douay-Rheims Bible | English Catholic Scripture"
	/>
	<meta
		property="og:description"
		content="The first complete English Catholic translation of Sacred Scripture, faithfully rendered from the Latin Vulgate. Read the original pre-Challoner text online."
	/>
	<meta property="og:url" content="https://thedouayrheims.com/" />
	<meta property="og:image" content="https://thedouayrheims.com/images/dr-1582-rheims.webp" />
	<meta property="og:site_name" content="Original Douay-Rheims Bible" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta
		name="twitter:title"
		content="The Original Douay-Rheims Bible | English Catholic Scripture"
	/>
	<meta
		name="twitter:description"
		content="The first complete English Catholic translation of Sacred Scripture, faithfully rendered from the Latin Vulgate. Read the original pre-Challoner text online."
	/>
	<meta name="twitter:image" content="https://thedouayrheims.com/images/dr-1582-rheims.webp" />
	{@html websiteSchema}
</svelte:head>

<!-- ═══════════ HERO ═══════════ -->
<section class="hero">
	<nav class="hero-nav">
		<a href="/" class="hero-logo">
			<span class="hero-logo-cross" aria-hidden="true">✠</span>
			<span class="hero-logo-text">Douay-Rheims</span>
		</a>
	</nav>

	<div class="hero-inner">
		<div class="hero-left">
			<p class="hero-eyebrow">
				<span aria-hidden="true">✠</span> English Catholic Scripture
			</p>

			<h1 class="hero-title">
				<span class="hero-title-the">The original</span>
				<span class="hero-title-main">Douay-Rheims</span>
				<span class="hero-title-sub">Bible</span>
			</h1>

			<p class="hero-origin">Translated from the Latin Vulgate · 1582–1610</p>

			<p class="hero-desc">
				The first complete English Catholic translation of Sacred Scripture, faithfully rendered
				from the Latin Vulgate by English exiles at Douai and Rheims.
			</p>

			<p class="hero-note">
				This is the original text as first published, before Bishop Challoner’s 18th-century
				revisions.
			</p>
			<p class="hero-note-minor">
				Spelling and punctuation lightly modernized;<br />the translation itself is unaltered.
			</p>

			<button
				class="hero-cta"
				on:click={() =>
					document
						.getElementById('reader')
						?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' })}
			>
				Read the Scriptures
				<span class="hero-cta-arrow" aria-hidden="true">↓</span>
			</button>
			{#if showSkipCheckbox}
				<label class="hero-skip-label">
					<input
						type="checkbox"
						checked={$prefs.skipHomepage}
						on:change={(e) =>
							prefs.update((p) => ({
								...p,
								skipHomepage: (e.target as HTMLInputElement).checked
							}))}
						class="hero-skip-checkbox"
					/>
					<span>Skip this intro on future visits</span>
				</label>
			{/if}
		</div>

		<div class="hero-right">
			<figure class="hero-figure">
				<picture>
					<!-- Only load on desktop — hero-right is display:none on mobile (≤600px) -->
					<source
						media="(min-width: 601px)"
						srcset="/images/dr-1582-rheims-800.webp 800w, /images/dr-1582-rheims-1040.webp 1040w, /images/dr-1582-rheims.webp 1400w"
						sizes="(max-width: 900px) 380px, 520px"
						type="image/webp"
					/>
					<img
						src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
						alt="Title page and opening of Matthew -- Rheims New Testament, 1582"
						class="hero-img"
						width="1400"
						height="1087"
						fetchpriority="high"
						loading="eager"
					/>
				</picture>
				<figcaption class="hero-caption">
					Rheims New Testament of 1582<br />The Holy Gospel of Jesus Christ According to Saint
					Matthew
				</figcaption>
			</figure>
		</div>
	</div>

	<div class="hero-scroll-hint" aria-hidden="true">
		<span class="hero-scroll-line"></span>
	</div>
</section>

<!-- ═══════════ READER ═══════════ -->
<div id="reader" bind:this={readerEl}>
	<TopBar {bookSlug} {chapterNum} hasStudyMode={true} isHomePage={true} />
	<BibleReader
		initialBookMeta={data.bookMeta}
		initialChapter={data.chapter}
		initialTotalChapters={data.totalChapters}
		enablePrevScroll={false}
		routeBase="/odr"
	/>
</div>

<style>
	/* ─── Hero ─── */
	.hero {
		position: relative;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		overflow: clip;
		background: var(--color-background);
	}

	.hero-nav {
		position: relative;
		z-index: 11;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 22px 48px;
		flex-shrink: 0;
	}

	.hero-logo {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
	}

	.hero-logo-cross {
		font-size: 14px;
		color: var(--color-accent);
	}

	.hero-logo-text {
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-weight: 600;
		color: var(--color-text);
	}

	.hero-inner {
		position: relative;
		z-index: 2;
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 64px;
		align-items: center;
		max-width: 1180px;
		width: 100%;
		margin: 0 auto;
		padding: 0 48px 60px;
	}

	.hero-left {
		display: flex;
		flex-direction: column;
	}

	.hero-eyebrow {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.28em;
		color: var(--color-accent);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0 0 18px;
	}

	.hero-title {
		display: flex;
		flex-direction: column;
		margin: 0 0 20px;
		line-height: 1;
	}

	.hero-title-the {
		font-family: var(--font-reader);
		font-size: 1.5rem;
		font-weight: 400;
		font-style: italic;
		color: var(--color-subtle);
		letter-spacing: 0.02em;
	}

	.hero-title-main {
		font-family: var(--font-reader);
		font-size: clamp(2.8rem, 5vw, 4.2rem);
		font-weight: 700;
		color: var(--color-text);
		letter-spacing: -0.02em;
		line-height: 0.95;
	}

	.hero-title-sub {
		font-family: var(--font-reader);
		font-size: clamp(2.2rem, 4vw, 3.4rem);
		font-weight: 400;
		color: var(--color-text);
		letter-spacing: -0.01em;
		line-height: 1;
		margin-top: 4px;
	}

	.hero-origin {
		font-family: var(--font-ui);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-subtle);
		font-weight: 400;
		margin: 0 0 24px;
		padding-bottom: 24px;
		border-bottom: 1px solid var(--color-border);
	}

	.hero-desc {
		font-family: var(--font-reader);
		font-size: 1.05rem;
		line-height: 1.75;
		color: var(--color-muted);
		margin: 0 0 12px;
		max-width: 460px;
	}

	.hero-note {
		font-family: var(--font-reader);
		font-size: 1.05rem;
		line-height: 1.75;
		color: var(--color-muted);
		margin: 0 0 36px;
		max-width: 460px;
	}

	.hero-note-minor {
		font-family: var(--font-reader);
		font-size: 0.85rem;
		font-style: italic;
		line-height: 1.6;
		color: var(--color-subtle);
		margin: -24px 0 36px;
		max-width: 460px;
	}

	.hero-cta {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 13px 28px;
		/* Use the original darker red for the button so white text keeps 6.9:1.
		   The lightened --color-accent in dark mode is for text-on-dark, not
		   white-on-red buttons. */
		background: #a62c2c;
		color: white;
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-weight: 600;
		text-decoration: none;
		border-radius: 2px;
		align-self: flex-start;
		transition:
			opacity 160ms ease,
			transform 160ms ease;
	}

	.hero-cta:hover {
		opacity: 0.88;
		transform: translateY(1px);
	}

	.hero-cta-arrow {
		font-size: 14px;
		display: inline-block;
		animation: bounce 1.2s ease-in-out infinite;
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(-1px);
		}
		50% {
			transform: translateY(2px);
		}
	}

	.hero-right {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.hero-figure {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.hero-img {
		width: 100%;
		max-width: 520px;
		height: auto;
		display: block;
		border: 1px solid var(--color-border);
		box-shadow:
			0 2px 8px color-mix(in srgb, var(--color-text) 8%, transparent),
			0 20px 60px color-mix(in srgb, var(--color-text) 12%, transparent);
		outline: 1px solid var(--color-border);
		outline-offset: 4px;
	}

	.hero-caption {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-text);
		text-align: center;
		font-weight: 300;
		line-height: 2;
	}

	.hero-scroll-hint {
		position: absolute;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 2;
	}

	.hero-scroll-line {
		display: block;
		width: 1px;
		height: 48px;
		background: linear-gradient(to bottom, transparent, var(--color-border));
		margin: 0 auto;
		animation: extend 2s ease-in-out infinite;
		transform-origin: top center;
	}

	@keyframes extend {
		0%,
		100% {
			opacity: 0.3;
			transform: scaleY(0.6);
		}
		50% {
			opacity: 1;
			transform: scaleY(1);
		}
	}

	/* ─── Reduced motion ─── */
	@media (prefers-reduced-motion: reduce) {
		.hero-cta {
			transition: none;
		}

		.hero-cta-arrow {
			animation: none;
		}

		.hero-scroll-line {
			animation: none;
			opacity: 0.6;
			transform: none;
		}
	}

	/* ─── Responsive ─── */
	@media (max-width: 900px) {
		.hero-nav {
			padding: 18px 24px;
		}

		.hero-inner {
			grid-template-columns: 1fr;
			gap: 40px;
			padding: 0 24px 48px;
		}

		.hero-right {
			order: -1;
		}

		.hero-img {
			max-width: 380px;
		}
	}

	@media (max-width: 600px) {
		.hero-inner {
			padding: 0 16px 40px;
		}

		.hero-right {
			display: none;
		}

		.hero-scroll-hint {
			display: none;
		}

		.hero-nav {
			padding: 16px;
		}
	}

	.hero-skip-label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 16px;
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-subtle);
		letter-spacing: 0.05em;
	}

	.hero-skip-checkbox {
		accent-color: var(--color-accent);
		width: 13px;
		height: 13px;
		cursor: pointer;
	}
</style>
