<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { prefs } from '$lib/stores/prefs';

	export let title: string;
	export let subtitle: string = '';
	export let ogImage: string = 'https://thedouayrheims.com/images/dr-1582-rheims.webp';
	export let datePublished: string | undefined = undefined;
	export let faqItems: Array<{ q: string; a: string }> = [];

	const SITE = 'https://thedouayrheims.com';

	const PATH_LABELS: Record<string, string> = {
		about: 'About',
		'the-douay-rheims': 'The Douay-Rheims Bible',
		articles: 'Articles',
		history: 'History',
		origins: 'Origins',
		'translation-philosophy': 'Translation Philosophy',
		'rheims-1582': 'Rheims 1582',
		annotations: 'Annotations',
		'forbidden-bible': 'Forbidden Bible',
		'influence-on-kjv': 'Influence on the KJV',
		challoner: 'The Challoner Revision',
		'after-challoner': 'After Challoner',
		america: 'America',
		'original-tongues': 'Original Tongues',
		'scripture-for-all': 'Scripture for All'
	};

	const PROSE_WIDTHS = { narrow: 580, default: 700, wide: 860 };
	const PROSE_SUBTITLE_WIDTHS = { narrow: 460, default: 560, wide: 680 };
	$: proseWidth = PROSE_WIDTHS[$prefs.columnWidth] ?? 700;
	$: proseSubtitleWidth = PROSE_SUBTITLE_WIDTHS[$prefs.columnWidth] ?? 560;

	$: canonicalUrl = SITE + $page.url.pathname;

	$: breadcrumbItems = (() => {
		const parts = $page.url.pathname.split('/').filter(Boolean);
		const items: Array<{ name: string; item: string }> = [{ name: 'Home', item: SITE + '/' }];
		let current = SITE;
		for (let i = 0; i < parts.length - 1; i++) {
			current += '/' + parts[i];
			const label = PATH_LABELS[parts[i]] ?? parts[i];
			items.push({ name: label, item: current });
		}
		if (parts.length > 0) items.push({ name: title, item: canonicalUrl });
		return items;
	})();

	const scriptOpen = '<' + 'script type="application/ld+json">';
	const scriptClose = '</' + 'script>';

	$: articleSchema = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: title,
		description: subtitle || title,
		url: canonicalUrl,
		image: ogImage,
		...(datePublished ? { datePublished } : {}),
		author: {
			'@type': 'Organization',
			name: 'Douay-Rheims Bible',
			url: SITE
		},
		publisher: {
			'@type': 'Organization',
			name: 'Douay-Rheims Bible',
			url: SITE,
			logo: { '@type': 'ImageObject', url: SITE + '/favicon-96x96.png' }
		},
		isPartOf: { '@type': 'WebSite', name: 'Douay-Rheims Bible', url: SITE }
	};

	$: breadcrumbSchema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: breadcrumbItems.map((item, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: item.name,
			item: item.item
		}))
	};

	$: faqSchema =
		faqItems.length > 0
			? {
					'@context': 'https://schema.org',
					'@type': 'FAQPage',
					mainEntity: faqItems.map(({ q, a }) => ({
						'@type': 'Question',
						name: q,
						acceptedAnswer: { '@type': 'Answer', text: a }
					}))
				}
			: null;

	$: jsonLdHtml =
		scriptOpen +
		JSON.stringify(articleSchema) +
		scriptClose +
		scriptOpen +
		JSON.stringify(breadcrumbSchema) +
		scriptClose +
		(faqSchema ? scriptOpen + JSON.stringify(faqSchema) + scriptClose : '');

	const NAV_ARTICLES = [
		{ path: '/history', label: 'History' },
		{ path: '/history/the-douay-rheims', label: 'The Douay-Rheims Bible' },
		{ path: '/history/origins', label: 'Origins' },
		{ path: '/history/translation-philosophy', label: 'Translation' },
		{ path: '/history/rheims-1582', label: 'Rheims 1582' },
		{ path: '/history/annotations', label: 'Annotations' },
		{ path: '/history/forbidden-bible', label: 'Forbidden Bible' },
		{ path: '/history/influence-on-kjv', label: 'Influence on KJV' },
		{ path: '/history/challoner', label: 'Challoner Revision' },
		{ path: '/history/after-challoner', label: 'After Challoner' },
		{ path: '/history/america', label: 'America' },
		{ path: '/history/original-tongues', label: 'Original Tongues' },
		{ path: '/history/scripture-for-all', label: 'Scripture for All' }
	];

	let articleEl: HTMLElement;

	$: isInNav = NAV_ARTICLES.some((a) => a.path === $page.url.pathname);

	// TOC
	type TocItem = { id: string; text: string };
	let tocItems: TocItem[] = [];
	let activeId = '';
	let scrollRaf = 0;

	function slugify(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
	}

	function buildToc() {
		if (!articleEl) return;
		const headings = Array.from(articleEl.querySelectorAll('h2'));
		const items: TocItem[] = [];
		for (const h of headings) {
			const text = (h.textContent || '').trim();
			if (!h.id) h.id = slugify(text);
			if (text === 'Sources') {
				h.classList.add('sources-heading');
				continue;
			}
			items.push({ id: h.id, text });
		}
		tocItems = items;
		if (tocItems.length > 0) activeId = tocItems[0].id;
	}

	function buildNav() {
		if (!articleEl) return;
		const navLinks = Array.from(articleEl.querySelectorAll('hr + p a')) as HTMLAnchorElement[];
		for (const link of navLinks) {
			const text = (link.textContent || '').trim();
			if (text.startsWith('←')) {
				const label = text.slice(1).trim();
				link.innerHTML = `<span class="nav-icon" aria-hidden="true">←</span><span class="nav-text">${label}</span>`;
			} else if (text.endsWith('→')) {
				const label = text.slice(0, -1).trim();
				link.innerHTML = `<span class="nav-text">${label}</span><span class="nav-icon" aria-hidden="true">→</span>`;
			}
		}
	}

	function updateActiveId() {
		if (!articleEl) return;
		const headings = articleEl.querySelectorAll('h2[id]');
		const threshold = window.innerHeight * 0.2;
		let current = '';
		for (const h of Array.from(headings)) {
			const id = (h as HTMLElement).id;
			if (id === 'sources') continue;
			if (h.getBoundingClientRect().top <= threshold) current = id;
		}
		if (current) activeId = current;
	}

	function onScroll() {
		cancelAnimationFrame(scrollRaf);
		scrollRaf = requestAnimationFrame(updateActiveId);
	}

	// Bionic reading
	let textVideFn: ((text: string, opts: object) => string) | null = null;

	type BionicParams = { enabled: boolean; fixation: number; saccade: number };

	function bionicAction(node: HTMLElement, params: BionicParams) {
		let original: string | null = null;

		async function apply({ enabled, fixation, saccade }: BionicParams) {
			if (enabled) {
				if (!textVideFn) {
					const m = await import('text-vide');
					textVideFn = m.textVide;
				}
				if (original === null) original = node.innerHTML;
				const opts: Record<string, unknown> = { fixationPoint: fixation };
				if (saccade > 0) opts.saccadeInterval = saccade;
				node.innerHTML = textVideFn(original, opts);
				node.classList.add('bionic-fade');
			} else if (original !== null) {
				node.innerHTML = original;
				original = null;
				node.classList.remove('bionic-fade');
			}
		}

		apply(params);
		return {
			update: (p: BionicParams) => apply(p),
			destroy: () => {
				if (original !== null) node.innerHTML = original;
			}
		};
	}

	onMount(() => {
		buildToc();
		buildNav();
		window.addEventListener('scroll', onScroll, { passive: true });
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('scroll', onScroll);
		cancelAnimationFrame(scrollRaf);
	});
</script>

<svelte:head>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={subtitle || title} />
	<meta name="twitter:image" content={ogImage} />
	<meta property="og:image" content={ogImage} />
	{@html jsonLdHtml}
</svelte:head>

<main id="main-content" class="prose-page" style="max-width: {proseWidth}px;">
	<header class="prose-header">
		<a href="/" class="prose-eyebrow">
			<span aria-hidden="true">✠</span> Douay-Rheims Bible
		</a>
		<h1 class="prose-title">{title}</h1>
		{#if subtitle}
			<p class="prose-subtitle" style="max-width: {proseSubtitleWidth}px;">{subtitle}</p>
		{/if}
		<div class="prose-rule"></div>
	</header>

	<article
		class="prose-body"
		class:prose-body--justified={$prefs.justifiedText}
		use:bionicAction={{
			enabled: $prefs.bionicReading,
			fixation: $prefs.bionicFixation ?? 3,
			saccade: $prefs.bionicSaccade ?? 0
		}}
		bind:this={articleEl}
	>
		<slot />
	</article>

	{#if faqItems.length > 0}
		<section class="prose-faq" aria-label="Frequently asked questions">
			<h2 class="prose-faq-heading">Frequently Asked Questions</h2>
			{#each faqItems as { q, a }}
				<details class="faq-item">
					<summary class="faq-question">
						{q}
						<span class="faq-icon" aria-hidden="true"></span>
					</summary>
					<p class="faq-answer">{a}</p>
				</details>
			{/each}
		</section>
	{/if}
</main>

<aside class="prose-toc" aria-label="Table of contents">
	<p class="toc-label">Contents</p>
	{#if isInNav}
		<ul class="toc-nav">
			{#each NAV_ARTICLES as article}
				{@const isCurrent = $page.url.pathname === article.path}
				<li class="toc-nav-item" class:toc-nav-item--current={isCurrent}>
					<a href={article.path} class="toc-nav-link" class:toc-nav-link--active={isCurrent}>
						{article.label}
					</a>
					{#if isCurrent && tocItems.length > 0}
						<ul class="toc-sections">
							{#each tocItems as item}
								<li class="toc-section-item" class:toc-section-item--active={activeId === item.id}>
									<a href="#{item.id}">{item.text}</a>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>
	{:else if tocItems.length > 0}
		<ul class="toc-sections toc-sections--standalone">
			{#each tocItems as item}
				<li class="toc-section-item" class:toc-section-item--active={activeId === item.id}>
					<a href="#{item.id}">{item.text}</a>
				</li>
			{/each}
		</ul>
	{/if}
</aside>

<style>
	/* Layout */
	.prose-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 48px 24px 80px;
	}

	.prose-header {
		margin-bottom: 48px;
	}

	.prose-eyebrow {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.28em;
		color: var(--color-accent);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 16px;
	}

	.prose-title {
		font-family: var(--font-reader);
		font-size: clamp(2rem, 4vw, 2.8rem);
		font-weight: 700;
		color: var(--color-heading, var(--color-text));
		letter-spacing: -0.02em;
		line-height: 1.15;
		margin: 0 0 12px;
	}

	.prose-subtitle {
		font-family: var(--font-reader);
		font-size: 1.1rem;
		line-height: 1.65;
		color: var(--color-muted);
		margin: 0 0 20px;
		max-width: 560px;
	}

	.prose-rule {
		width: 40px;
		height: 1px;
		background: var(--color-accent);
		opacity: 0.7;
	}

	.prose-body {
		font-family: var(--font-reader);
		font-size: var(--font-size-reader);
		line-height: var(--line-height-reader);
		color: var(--color-text);
	}

	.prose-body--justified :global(p) {
		text-align: justify;
		hyphens: auto;
	}

	.prose-body :global(h2) {
		font-family: var(--font-reader);
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--color-heading, var(--color-text));
		letter-spacing: -0.01em;
		margin: 56px 0 16px;
		line-height: 1.25;
		scroll-margin-top: calc(var(--header-height) - 24px);
	}

	.prose-body :global(h3) {
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-heading, var(--color-accent-text));
		font-weight: 600;
		margin: 40px 0 12px;
	}

	.prose-body :global(p) {
		margin: 0 0 20px;
		color: var(--color-text);
	}

	.prose-body :global(blockquote) {
		border-left: 2px solid var(--color-accent);
		padding-left: 20px;
		margin: 28px 0;
		font-style: italic;
		color: var(--color-text);
	}

	.prose-body :global(blockquote strong) {
		font-style: normal;
	}

	/* Challoner comparison blockquotes */
	.prose-body :global(.comparison) {
		font-style: normal;
	}

	.prose-body :global(.comparison strong) {
		display: block;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-accent-text);
		font-weight: 600;
		margin-top: 18px;
		margin-bottom: 4px;
	}

	.prose-body :global(.comparison strong:first-child) {
		margin-top: 0;
	}

	.prose-body :global(.comparison br) {
		display: none;
	}

	.prose-body :global(a) {
		color: var(--color-accent-text);
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-accent-text) 40%, transparent);
		transition: text-decoration-color 150ms ease;
	}

	.prose-body :global(a:hover) {
		text-decoration-color: var(--color-accent-text);
	}

	.prose-body :global(ul),
	.prose-body :global(ol) {
		margin: 0 0 20px;
		padding-left: 24px;
		color: var(--color-text);
	}

	.prose-body :global(li) {
		margin-bottom: 8px;
	}

	/* Sources section */
	.prose-body :global(.sources-heading) {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-muted);
		margin-top: 56px;
		margin-bottom: 12px;
		line-height: 1.4;
	}

	.prose-body :global(.sources-heading ~ ul) {
		color: var(--color-muted);
		font-size: 0.85rem;
	}

	.prose-body :global(hr) {
		border: none;
		height: 1px;
		background: var(--color-border);
		margin: 40px 0;
	}

	.prose-body :global(q),
	.prose-body :global(cite) {
		font-style: italic;
		quotes: none;
	}

	/* Prev / next navigation */
	.prose-body :global(hr + p) {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		font-size: 0;
		margin-top: 12px;
		gap: 24px;
	}

	.prose-body :global(hr + p a) {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1rem;
		max-width: calc(50% - 12px);
		line-height: 1.4;
		text-align: left;
	}

	.prose-body :global(hr + p a:last-of-type) {
		margin-left: auto;
		text-align: right;
	}

	.prose-body :global(.nav-icon) {
		flex-shrink: 0;
	}

	.prose-body :global(.cta-btn) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 11px 20px;
		background: var(--color-accent);
		color: #fff;
		text-decoration: none;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		border-radius: 2px;
		margin-top: 40px;
		transition:
			background 150ms ease,
			opacity 150ms ease;
	}

	.prose-body :global(.cta-btn:hover) {
		background: color-mix(in srgb, var(--color-accent) 82%, black);
		color: #fff;
		text-decoration: none;
	}

	/* TOC */
	.prose-toc {
		position: fixed;
		right: 24px;
		top: 72px;
		width: 200px;
		max-height: calc(100vh - 96px);
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
		padding: 24px 0 0;
		opacity: 0;
		transform: translateX(8px);
		animation: toc-enter 400ms ease 300ms forwards;
	}

	@keyframes toc-enter {
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.toc-label {
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.24em;
		color: var(--color-accent-text);
		margin: 0 0 12px;
		opacity: 0.8;
	}

	.toc-nav {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.toc-nav-item {
		display: flex;
		flex-direction: column;
	}

	.toc-nav-link {
		font-family: var(--font-ui);
		font-size: 13px;
		line-height: 1.5;
		padding: 4px 0;
		color: var(--color-subtle);
		text-decoration: none;
		opacity: 0.85;
		transition:
			color 220ms ease,
			opacity 220ms ease;
	}

	.toc-nav-link:hover {
		color: var(--color-text);
		opacity: 1;
	}

	.toc-nav-link--active {
		color: var(--color-accent-text);
		opacity: 1;
		font-weight: 600;
	}

	.toc-sections {
		list-style: none;
		padding: 4px 0 8px 10px;
		margin: 0;
		border-left: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
	}

	.toc-section-item a {
		display: block;
		font-family: var(--font-ui);
		font-size: 12px;
		line-height: 1.55;
		padding: 3px 0;
		color: var(--color-subtle);
		text-decoration: none;
		opacity: 0.75;
		transition:
			color 220ms ease,
			opacity 220ms ease;
	}

	.toc-section-item a:hover {
		color: var(--color-text);
		opacity: 1;
	}

	.toc-section-item--active a {
		color: var(--color-accent-text);
		opacity: 1;
	}

	.toc-sections--standalone {
		padding: 0;
		border-left: none;
	}

	.toc-sections--standalone .toc-section-item a {
		font-size: 13px;
		padding: 4px 0;
		opacity: 0.85;
	}

	@media (max-width: 1120px) {
		.prose-toc {
			display: none;
		}
	}

	/* FAQ section */
	.prose-faq {
		margin-top: 56px;
		border-top: 1px solid var(--color-border);
		padding-top: 32px;
	}

	.prose-faq-heading {
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.24em;
		color: var(--color-muted);
		margin: 0 0 24px;
	}

	.faq-item {
		border-bottom: 1px solid var(--color-border);
	}

	.faq-item[open] .faq-icon::after {
		content: '−';
	}

	.faq-question {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
		list-style: none;
		cursor: pointer;
		padding: 20px 0;
		font-family: var(--font-reader);
		font-size: var(--font-size-reader);
		font-weight: 700;
		color: var(--color-heading, var(--color-text));
		line-height: 1.4;
		user-select: none;
	}

	.faq-question::-webkit-details-marker {
		display: none;
	}

	.faq-icon {
		flex-shrink: 0;
		font-family: var(--font-ui);
		font-size: 18px;
		font-weight: 300;
		line-height: 1;
		color: var(--color-accent);
		transition: transform 180ms ease;
	}

	.faq-icon::after {
		content: '+';
	}

	.faq-answer {
		font-family: var(--font-reader);
		font-size: var(--font-size-reader);
		line-height: var(--line-height-reader);
		color: var(--color-text);
		margin: 0 0 20px;
		animation: faq-reveal 180ms ease;
	}

	@keyframes faq-reveal {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
