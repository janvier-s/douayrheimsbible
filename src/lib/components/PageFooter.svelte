<script lang="ts">
	import { getNextNavBook } from '$lib/data/books';
	import type { BookMeta } from '$lib/data/types';

	export let bookMeta: BookMeta;
	export let chapterNum: number;
	export let totalChapters: number;
	export let routeBase: string = '/odr';
	export let showNav: boolean = true;

	$: isLastChapter = chapterNum >= totalChapters;
	$: nextNavBook = isLastChapter ? (getNextNavBook(bookMeta.slug) ?? null) : null;

	$: nextHref = isLastChapter
		? nextNavBook
			? `${routeBase}/${nextNavBook.slug}/1`
			: null
		: `${routeBase}/${bookMeta.slug}/${chapterNum + 1}`;

	$: nextBook = nextNavBook;
	$: nextLabel = nextBook ? nextBook.odrName : `Chapter ${chapterNum + 1}`;
	$: nextSubLabel = nextBook ? 'Chapter 1' : null;
</script>

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

<style>
	/* ─── Navigation ─── */
	.footer-nav {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		margin-top: 64px;
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
		margin-top: 64px;
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
</style>
