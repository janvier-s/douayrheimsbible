<script lang="ts">
	import type { PageData } from './$types';
	import { TRANSLATION_CONFIGS } from '$lib/data/reference';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let config = $derived(data.config);

	// Build grouped articles for display
	let groupedSections = $derived(
		config.sections.map((sec) => {
			const sectionArticles = config.articles.filter((a) => a.section === sec.key);
			return {
				...sec,
				groups: sec.categories.map((cat) => ({
					...cat,
					articles: sectionArticles.filter((a) => a.category === cat.key)
				}))
			};
		})
	);

	let otherTranslations = $derived(TRANSLATION_CONFIGS.filter((c) => c.id !== config.id));
</script>

<svelte:head>
	<title>{config.label} Reference Material · Douay-Rheims Bible</title>
	<meta name="description" content={config.desc} />
	<link rel="canonical" href="https://thedouayrheims.com/reference/{config.id}" />
</svelte:head>

<main id="main-content" class="ref-index">
	<header class="ref-header">
		<a href="/reference" class="ref-eyebrow">Reference Material</a>
		<h1 class="ref-title">{config.label}</h1>
		<p class="ref-subtitle">{config.desc}</p>
		<div class="ref-rule"></div>
	</header>

	<!-- Translation selector -->
	{#if otherTranslations.length > 0}
		<nav class="ref-translation-selector" aria-label="Translation selector">
			<span class="ref-selector-current">{config.label}</span>
			{#each otherTranslations as other}
				<a href="/reference/{other.id}" class="ref-selector-link">{other.label}</a>
			{/each}
		</nav>
	{/if}

	{#each groupedSections as sec}
		<section class="ref-section">
			<h2 class="ref-section-heading">{sec.label}</h2>
			{#each sec.groups as group}
				{#if group.articles.length > 0}
					<h3 class="ref-category-heading">{group.label}</h3>
					<ul class="ref-list">
						{#each group.articles as article}
							<li class="ref-item">
								<a href="/reference/{config.id}/{article.section}/{article.slug}" class="ref-link">
									<span class="ref-link-title">{article.title}</span>
									<span class="ref-link-desc">{article.desc}</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			{/each}
		</section>
	{/each}
</main>

<style>
	.ref-index {
		max-width: 700px;
		margin: 0 auto;
		padding: 48px 24px 80px;
	}

	.ref-header {
		margin-bottom: 32px;
	}

	.ref-eyebrow {
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
		text-decoration: none;
	}

	.ref-title {
		font-family: var(--font-reader);
		font-size: clamp(2rem, 4vw, 2.8rem);
		font-weight: 700;
		color: var(--color-heading, var(--color-text));
		letter-spacing: -0.02em;
		line-height: 1.15;
		margin: 0 0 12px;
	}

	.ref-subtitle {
		font-family: var(--font-reader);
		font-size: 1.1rem;
		line-height: 1.65;
		color: var(--color-muted);
		margin: 0 0 20px;
		max-width: 560px;
	}

	.ref-rule {
		width: 40px;
		height: 1px;
		background: var(--color-accent);
		opacity: 0.7;
	}

	/* ── Translation selector pills ─────────────────────── */

	.ref-translation-selector {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-bottom: 40px;
	}

	.ref-selector-current {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
		padding: 5px 12px;
		border-radius: 3px;
	}

	.ref-selector-link {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-subtle);
		text-decoration: none;
		padding: 5px 12px;
		border-radius: 3px;
		transition:
			color 150ms ease,
			background 150ms ease;
	}

	.ref-selector-link:hover {
		color: var(--color-text);
		background: color-mix(in srgb, var(--color-text) 5%, transparent);
	}

	/* ── Section / article list ─────────────────────────── */

	.ref-section {
		margin-bottom: 48px;
	}

	.ref-section-heading {
		font-family: var(--font-reader);
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--color-heading, var(--color-text));
		letter-spacing: -0.01em;
		margin: 0 0 24px;
		line-height: 1.25;
	}

	.ref-category-heading {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-accent);
		font-weight: 600;
		margin: 32px 0 12px;
	}

	.ref-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.ref-item {
		border-bottom: 1px solid var(--color-border);
	}

	.ref-item:first-child {
		border-top: 1px solid var(--color-border);
	}

	.ref-link {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 16px 0;
		text-decoration: none;
		transition: background 150ms ease;
	}

	.ref-link:hover .ref-link-title {
		color: var(--color-accent);
	}

	.ref-link-title {
		font-family: var(--font-reader);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--color-text);
		line-height: 1.4;
		transition: color 150ms ease;
	}

	.ref-link-desc {
		font-family: var(--font-reader);
		font-size: 0.9rem;
		color: var(--color-muted);
		line-height: 1.5;
	}
</style>
