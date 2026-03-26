<script lang="ts">
	import { ALL_BOOKS } from '$lib/data/books';
	import type { BookMeta } from '$lib/data/types';

	export let bookMeta: BookMeta;
	export let chapterNum: number;
	export let totalChapters: number;
	export let routeBase: string = '/odr';

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
</script>

<footer class="footer">
	<!-- Ornamental divider -->
	<div class="footer-rule" aria-hidden="true">
		<span class="footer-ornament">✠</span>
	</div>

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

	<!-- Attribution -->
	<div class="footer-attribution">
		<p>Original Douay-Rheims Bible, 1609–1610</p>
		<p>Translated from the Latin Vulgate by English Catholic exiles at Douai and Rheims</p>
	</div>
</footer>

<style>
	.footer {
		margin-top: 64px;
		padding-bottom: 80px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 36px;
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
