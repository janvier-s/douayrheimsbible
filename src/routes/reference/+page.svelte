<script lang="ts">
	import { OT_ARTICLES, NT_ARTICLES } from '$lib/data/reference';

	const otFront = OT_ARTICLES.filter((a) => a.category === 'front');
	const otBack = OT_ARTICLES.filter((a) => a.category === 'back');
	const ntFront = NT_ARTICLES.filter((a) => a.category === 'front');
	const ntBack = NT_ARTICLES.filter((a) => a.category === 'back');
</script>

<svelte:head>
	<title>Reference Material | Douay-Rheims Bible</title>
	<meta
		name="description"
		content="Front and back matter from the original Douay-Rheims Bible: prefaces, approvals, historical tables, glossaries, and other reference material."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/reference" />
</svelte:head>

<nav class="ref-nav">
	<a href="/" class="ref-nav-link">
		<span class="ref-nav-cross" aria-hidden="true">✠</span>
		<span>Douay-Rheims</span>
	</a>
</nav>

<main id="main-content" class="ref-index">
	<header class="ref-header">
		<a href="/" class="ref-eyebrow">
			<span aria-hidden="true">✠</span> Douay-Rheims Bible
		</a>
		<h1 class="ref-title">Reference Material</h1>
		<p class="ref-subtitle">
			Front and back matter from the original Douay-Rheims Bible: prefaces, approvals, historical
			tables, glossaries, and liturgical calendars.
		</p>
		<div class="ref-rule"></div>
	</header>

	<section class="ref-section">
		<h2 class="ref-section-heading">Old Testament</h2>

		<h3 class="ref-category-heading">Front Matter</h3>
		<ul class="ref-list">
			{#each otFront as article}
				<li class="ref-item">
					<a href="/reference/ot/{article.slug}" class="ref-link">
						<span class="ref-link-title">{article.title}</span>
						<span class="ref-link-desc">{article.desc}</span>
					</a>
				</li>
			{/each}
		</ul>

		<h3 class="ref-category-heading">Back Matter</h3>
		<ul class="ref-list">
			{#each otBack as article}
				<li class="ref-item">
					<a href="/reference/ot/{article.slug}" class="ref-link">
						<span class="ref-link-title">{article.title}</span>
						<span class="ref-link-desc">{article.desc}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section class="ref-section">
		<h2 class="ref-section-heading">New Testament</h2>

		<h3 class="ref-category-heading">Front Matter</h3>
		<ul class="ref-list">
			{#each ntFront as article}
				<li class="ref-item">
					<a href="/reference/nt/{article.slug}" class="ref-link">
						<span class="ref-link-title">{article.title}</span>
						<span class="ref-link-desc">{article.desc}</span>
					</a>
				</li>
			{/each}
		</ul>

		<h3 class="ref-category-heading">Back Matter</h3>
		<ul class="ref-list">
			{#each ntBack as article}
				<li class="ref-item">
					<a href="/reference/nt/{article.slug}" class="ref-link">
						<span class="ref-link-title">{article.title}</span>
						<span class="ref-link-desc">{article.desc}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
</main>

<style>
	.ref-nav {
		padding: 22px 48px;
		display: flex;
		align-items: center;
	}

	.ref-nav-link {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-weight: 600;
		color: var(--color-text);
		transition: color 150ms ease;
	}

	.ref-nav-link:hover {
		color: var(--color-accent);
	}

	.ref-nav-cross {
		font-size: 14px;
		color: var(--color-accent);
	}

	.ref-index {
		max-width: 700px;
		margin: 0 auto;
		padding: 48px 24px 80px;
	}

	.ref-header {
		margin-bottom: 48px;
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
