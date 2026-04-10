<svelte:head>
	<title>404 — Page Not Found | Douay-Rheims Bible</title>
</svelte:head>

<main class="error-page">
	<div class="error-inner">
		<div class="ornament" aria-hidden="true">✦</div>

		<div class="status-block">
			<span class="status-number">404</span>
			<span class="status-divider" aria-hidden="true">—</span>
			<span class="status-latin">Non Inventum</span>
		</div>

		<h1 class="error-heading">Page Not Found</h1>

		<p class="error-message">
			This page hath been lost to the ages, like a manuscript consumed by time. The scripture you
			sought does not dwell here.
		</p>

		<blockquote class="error-verse">
			<p class="verse-text">"Seek, and you shall find; knock, and it shall be opened to you."</p>
			<cite class="verse-citation">— Matt. 7:7</cite>
		</blockquote>

		<div class="error-rule" aria-hidden="true"></div>

		<nav class="error-nav" aria-label="Recovery navigation">
			<a href="/odr/genesis/1" class="nav-link nav-primary">Begin at Genesis</a>
			<a href="/books" class="nav-link">All Books</a>
			<a href="/search" class="nav-link">Search</a>
		</nav>
	</div>
</main>

<style>
	.error-page {
		min-height: 80vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 55px 21px;
	}

	.error-inner {
		max-width: 520px;
		width: 100%;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.ornament {
		font-size: 10px;
		color: var(--color-accent);
		letter-spacing: 0.4em;
		margin-bottom: 32px;
		opacity: 0.7;
	}

	.status-block {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin-bottom: 20px;
		font-family: var(--font-ui);
	}

	.status-number {
		font-size: clamp(4rem, 12vw, 6.5rem);
		line-height: 1;
		font-weight: 300;
		color: var(--color-accent);
		letter-spacing: -0.03em;
		font-family: var(--font-reader);
	}

	.status-divider {
		color: var(--color-border);
		font-size: 1.5rem;
		font-weight: 300;
	}

	.status-latin {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.25em;
		color: var(--color-subtle);
		font-weight: 500;
		white-space: nowrap;
	}

	.error-heading {
		font-family: var(--font-reader);
		font-size: clamp(1.1rem, 3vw, 1.4rem);
		font-weight: 400;
		color: var(--color-text);
		letter-spacing: 0.01em;
		margin: 0 0 18px;
	}

	.error-message {
		font-family: var(--font-reader);
		font-size: 15px;
		line-height: 1.75;
		color: var(--color-muted);
		margin: 0 0 32px;
		font-style: italic;
	}

	.error-verse {
		margin: 0 0 32px;
		padding: 20px 24px;
		border-left: 2px solid var(--color-accent);
		border-right: 2px solid var(--color-accent);
		background: transparent;
		text-align: center;
		position: relative;
	}

	.error-verse::before,
	.error-verse::after {
		content: '';
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		width: 40px;
		height: 1px;
		background: var(--color-border);
	}

	.error-verse::before {
		top: 0;
	}

	.error-verse::after {
		bottom: 0;
	}

	.verse-text {
		font-family: var(--font-reader);
		font-size: 14px;
		line-height: 1.7;
		color: var(--color-text);
		margin: 0 0 8px;
		font-style: italic;
	}

	.verse-citation {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-accent);
		font-style: normal;
	}

	.error-rule {
		width: 40px;
		height: 1px;
		background: var(--color-border);
		margin-bottom: 28px;
	}

	.error-nav {
		display: flex;
		align-items: center;
		gap: 20px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.nav-link {
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.nav-link:hover {
		color: var(--color-accent);
	}

	.nav-primary {
		padding: 9px 20px;
		border: 1px solid var(--color-border);
		color: var(--color-text);
		transition:
			color 150ms ease,
			border-color 150ms ease;
	}

	.nav-primary:hover {
		color: var(--color-accent);
		border-color: var(--color-accent);
	}
</style>
