<script lang="ts">
	import { TRANSLATION_CONFIGS } from '$lib/data/reference';
</script>

<svelte:head>
	<title>Reference Material · Douay-Rheims Bible</title>
	<meta
		name="description"
		content="Front and back matter from Catholic Bible translations: prefaces, approvals, historical tables, glossaries, scholarly articles, and liturgical calendars."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/reference" />
</svelte:head>

<main id="main-content" class="ref-index">
	<header class="ref-header">
		<h1 class="ref-title">Reference Material</h1>
		<p class="ref-subtitle">
			Front and back matter from Catholic Bible translations: prefaces, approvals, historical
			tables, glossaries, scholarly articles, and liturgical calendars.
		</p>
		<div class="ref-rule"></div>
	</header>

	<div class="ref-translations">
		{#each TRANSLATION_CONFIGS as config}
			<a href="/reference/{config.id}" class="ref-translation-card">
				<span class="ref-card-title">{config.label}</span>
				<span class="ref-card-year">{config.year}</span>
				<span class="ref-card-desc">{config.desc}</span>
				<span class="ref-card-count"
					>{config.articles.length} article{config.articles.length !== 1 ? 's' : ''}</span
				>
			</a>
		{/each}
	</div>
</main>

<style>
	.ref-index {
		max-width: 700px;
		margin: 0 auto;
		padding: 48px 24px 80px;
	}

	.ref-header {
		margin-bottom: 48px;
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

	/* ── Translation cards ─────────────────────────────────── */

	.ref-translations {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.ref-translation-card {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 24px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		text-decoration: none;
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease;
	}

	.ref-translation-card:hover {
		border-color: var(--color-accent);
		box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.08);
	}

	.ref-card-title {
		font-family: var(--font-reader);
		font-size: 1.3rem;
		font-weight: 600;
		color: var(--color-text);
		line-height: 1.3;
	}

	.ref-card-year {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-subtle);
	}

	.ref-card-desc {
		font-family: var(--font-reader);
		font-size: 0.9rem;
		color: var(--color-muted);
		line-height: 1.5;
		margin-top: 4px;
	}

	.ref-card-count {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-subtle);
		margin-top: 8px;
	}
</style>
