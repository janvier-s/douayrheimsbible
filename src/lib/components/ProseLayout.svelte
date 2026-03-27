<script lang="ts">
	export let title: string;
	export let subtitle: string = '';
</script>

<nav class="prose-nav">
	<a href="/" class="prose-nav-link">
		<span class="prose-nav-cross" aria-hidden="true">✠</span>
		<span>Douay-Rheims</span>
	</a>
</nav>

<main id="main-content" class="prose-page">
	<header class="prose-header">
		<a href="/" class="prose-eyebrow">
			<span aria-hidden="true">✠</span> Douay-Rheims Bible
		</a>
		<h1 class="prose-title">{title}</h1>
		{#if subtitle}
			<p class="prose-subtitle">{subtitle}</p>
		{/if}
		<div class="prose-rule"></div>
	</header>

	<article class="prose-body">
		<slot />
	</article>
</main>

<style>
	.prose-nav {
		padding: 22px 48px;
		display: flex;
		align-items: center;
	}

	.prose-nav-link {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-weight: 600;
		color: var(--color-foreground);
		transition: color 150ms ease;
	}

	.prose-nav-link:hover {
		color: var(--color-accent);
	}

	.prose-nav-cross {
		font-size: 14px;
		color: var(--color-accent);
	}

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
		color: var(--color-foreground);
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
		font-size: 1.05rem;
		line-height: 1.85;
		color: var(--color-foreground);
	}

	.prose-body :global(h2) {
		font-family: var(--font-reader);
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--color-foreground);
		letter-spacing: -0.01em;
		margin: 56px 0 16px;
		line-height: 1.25;
	}

	.prose-body :global(h3) {
		font-family: var(--font-ui);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-accent-text);
		font-weight: 600;
		margin: 40px 0 12px;
	}

	.prose-body :global(p) {
		margin: 0 0 20px;
		color: var(--color-muted);
	}

	.prose-body :global(blockquote) {
		border-left: 2px solid var(--color-accent);
		padding-left: 20px;
		margin: 28px 0;
		font-style: italic;
		color: var(--color-subtle);
	}

	.prose-body :global(a) {
		color: var(--color-accent-text);
		text-decoration: underline;
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
		color: var(--color-muted);
	}

	.prose-body :global(li) {
		margin-bottom: 8px;
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
	}

	.prose-body :global(hr + p) {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 6px 32px;
		margin-top: 4px;
	}

	.prose-body :global(hr + p a) {
		white-space: nowrap;
	}
</style>
