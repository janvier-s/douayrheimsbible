<script lang="ts">
	import { ALL_BOOKS } from '$lib/data/books';
	import type { BookMeta } from '$lib/data/types';

	export let bookMeta: BookMeta;
	export let chapterNum: number;
	export let totalChapters: number;
	export let routeBase: string = '/odr';
	export let showNav: boolean = true;

	$: bookIndex = ALL_BOOKS.findIndex((b) => b.slug === bookMeta.slug);
	$: isLastChapter = chapterNum >= totalChapters;
	$: isLastBook = bookIndex >= ALL_BOOKS.length - 1;

	$: nextHref = isLastChapter
		? !isLastBook
			? `${routeBase}/${ALL_BOOKS[bookIndex + 1].slug}/1`
			: null
		: `${routeBase}/${bookMeta.slug}/${chapterNum + 1}`;

	$: nextBook = isLastChapter && !isLastBook ? ALL_BOOKS[bookIndex + 1] : null;
	$: nextLabel = nextBook ? nextBook.odrName : `Chapter ${chapterNum + 1}`;
	$: nextSubLabel = nextBook ? 'Chapter 1' : null;

	const columns = [
		{
			heading: 'Scripture',
			links: [
				{ label: 'Old Testament', href: '/books/old-testament' },
				{ label: 'New Testament', href: '/books/new-testament' },
				{ label: 'Search', href: '/search' },
				{ label: 'Compare Translations', href: '/compare' }
			]
		},
		{
			heading: 'About',
			links: [
				{ label: 'About the Translation', href: '/about' },
				{ label: 'History', href: '/history' },
				{ label: 'The Challoner Revision', href: '/challoner-revision' },
				{ label: 'Download JSON', href: '/download' },
				{ label: 'API', href: '/api' }
			]
		},
		{
			heading: 'Info',
			links: [
				{ label: 'Contact', href: '/contact' },
				{ label: 'Sitemap', href: '/sitemap.xml' },
				{ label: 'Privacy', href: '/privacy' },
				{ label: 'Terms', href: '/terms' }
			]
		}
	];
</script>

<footer class="footer">
	<!-- Ornamental divider -->
	<div class="footer-rule" aria-hidden="true">
		<span class="footer-ornament">✠</span>
	</div>

	{#if showNav}
		{#if nextHref}
			<!-- Continue reading -->
			<div class="footer-nav">
				<p class="footer-prompt">Continue reading</p>
				<a href={nextHref} class="footer-next-link">
					<span class="footer-next-title">{nextLabel}</span>
					{#if nextSubLabel}
						<span class="footer-next-sub">{nextSubLabel}</span>
					{/if}
					<span class="footer-arrow" aria-hidden="true">›</span>
				</a>
			</div>
		{:else}
			<div class="footer-end">
				<p class="footer-finis">Finis</p>
				<p class="footer-end-sub">You have reached the end of Sacred Scripture.</p>
			</div>
		{/if}
	{/if}

	<!-- Link columns -->
	<div class="footer-columns">
		{#each columns as col}
			<div class="footer-col">
				<p class="footer-col-heading">{col.heading}</p>
				<ul class="footer-col-list">
					{#each col.links as link}
						<li><a href={link.href} class="footer-col-link">{link.label}</a></li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>

	<!-- Attribution -->
	<div class="footer-attribution">
		<p>The Original Douay-Rheims Bible, 1582–1610</p>
		<p>
			Faithfully translated from the Latin Vulgate by English Catholic exiles at Douai and Rheims
		</p>
	</div>
</footer>

<style>
	.footer {
		margin-top: 64px;
		padding-bottom: 80px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 48px;
	}

	/* ─── Ornamental divider ─── */
	.footer-rule {
		position: relative;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.footer-rule::before,
	.footer-rule::after {
		content: '';
		flex: 1;
		height: 1px;
		background: linear-gradient(
			to var(--dir, right),
			transparent,
			var(--color-border) 40%,
			var(--color-border) 60%,
			transparent
		);
		max-width: 200px;
	}

	.footer-rule::before {
		--dir: right;
	}

	.footer-rule::after {
		--dir: left;
	}

	.footer-ornament {
		font-size: 14px;
		color: var(--color-accent);
		opacity: 0.5;
		padding: 0 16px;
		flex-shrink: 0;
	}

	/* ─── Navigation ─── */
	.footer-nav {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.footer-prompt {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.25em;
		color: var(--color-subtle);
		font-weight: 400;
	}

	.footer-next-link {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: var(--color-text);
		transition: color 150ms ease;
	}

	.footer-next-link:hover {
		color: var(--color-accent);
	}

	.footer-next-title {
		font-family: var(--font-reader);
		font-size: 1.35rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		line-height: 1;
	}

	.footer-next-sub {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-subtle);
		font-weight: 400;
		margin-top: 1px;
	}

	.footer-arrow {
		font-size: 22px;
		line-height: 1;
		opacity: 0.5;
	}

	/* ─── Finis ─── */
	.footer-end {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.footer-finis {
		font-family: var(--font-reader);
		font-size: 1.5rem;
		font-style: italic;
		color: var(--color-subtle);
		letter-spacing: 0.05em;
	}

	.footer-end-sub {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-subtle);
		font-weight: 300;
	}

	/* ─── Link columns ─── */
	.footer-columns {
		display: flex;
		gap: 48px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.footer-col {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 120px;
	}

	.footer-col-heading {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--color-subtle);
		font-weight: 600;
	}

	.footer-col-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.footer-col-link {
		font-family: var(--font-ui);
		font-size: 13px;
		color: var(--color-subtle);
		text-decoration: none;
		transition: color 150ms ease;
		font-weight: 300;
	}

	.footer-col-link:hover {
		color: var(--color-text);
	}

	/* ─── Attribution ─── */
	.footer-attribution {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.footer-attribution p {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-subtle);
		font-weight: 300;
		text-align: center;
		opacity: 0.7;
		line-height: 1.6;
	}
</style>
