<script lang="ts">
	import { page } from '$app/stores';

	type ErrorInfo = {
		latin: string;
		heading: string;
		message: string;
	};

	const errors: Record<number, ErrorInfo> = {
		404: {
			latin: 'Non Inventum',
			heading: 'Page Not Found',
			message: 'That which thou seekest dwelleth not within these pages.'
		},
		403: {
			latin: 'Nondum Paratum',
			heading: 'Not Yet Available',
			message:
				'This translation is not yet available.<br />Please check back later or choose another translation.'
		},
		500: {
			latin: 'Scriptorium in Confusione',
			heading: 'Something Went Wrong',
			message: 'The server encountered an error.<br />Please try again or navigate to another page.'
		}
	};

	let info = $derived(
		errors[$page.status] ?? {
			latin: 'Error Ignotus',
			heading: 'An Error Occurred',
			message: $page.error?.message ?? 'Something unexpected hath occurred in our scriptorium.'
		}
	);
</script>

<svelte:head>
	<title>{$page.status} — {info.heading} · Douay-Rheims Bible</title>
</svelte:head>

<main class="error-page">
	<div class="error-inner">
		<div class="ornament" aria-hidden="true">✦</div>

		<span class="status-latin">{info.latin}</span>
		<span class="status-number">{$page.status}</span>

		<h1 class="error-heading">{info.heading}</h1>

		<p class="error-message">{@html info.message}</p>

		<nav class="error-nav" aria-label="Recovery navigation">
			<a href="/odr/genesis/1" class="nav-link nav-primary">Read Genesis</a>
			<a href="/" class="nav-link">Go Home</a>
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
		margin-bottom: 28px;
		opacity: 0.7;
	}

	.status-latin {
		font-family: var(--font-ui);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.25em;
		color: var(--color-subtle);
		font-weight: 500;
		margin-bottom: 8px;
	}

	.status-number {
		font-family: var(--font-reader);
		font-size: clamp(4rem, 12vw, 6.5rem);
		line-height: 1;
		font-weight: 300;
		color: var(--color-text);
		letter-spacing: -0.03em;
		margin-bottom: 20px;
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
		margin: 0 0 36px;
		font-style: italic;
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
