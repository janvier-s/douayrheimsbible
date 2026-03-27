<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;
</script>

<svelte:head>
	<title>History of the Douay-Rheims Bible: Origins, Language, and Legacy</title>
	<meta
		name="description"
		content="A collection of articles tracing the origins, translation, influence, and legacy of the Douay-Rheims Bible, the first complete English Catholic translation of Sacred Scripture."
	/>
	<link rel="canonical" href="https://douayrheimsbible.pages.dev/history" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="History of the Douay-Rheims Bible" />
	<meta
		property="og:description"
		content="Articles on the origins, language, and legacy of the first complete English Catholic translation of Sacred Scripture."
	/>
	<meta property="og:url" content="https://douayrheimsbible.pages.dev/history" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="History of the Douay-Rheims Bible"
	subtitle="A collection of articles on the origins, language, and enduring legacy of the first complete English Catholic translation of Sacred Scripture."
>
	<p>
		The Douay-Rheims Bible was produced by scholars in exile during the English Reformation,
		published between 1582 and 1610, and has shaped Catholic worship and English literature ever
		since. These articles trace its story from the founding of the English College at Douai to the
		Catholic communities of nineteenth-century America. They are arranged to be read in sequence,
		each building on the one before, though each stands on its own.
	</p>

	<ol class="article-list">
		<li class="article-item">
			<a href="/history/origins" class="article-link">
				<span class="article-title">Born in Exile: The Origins of the Douay-Rheims Bible</span>
				<span class="article-desc"
					>How English scholars, driven from their homeland by persecution, produced a Bible that
					would shape all English Scripture to follow.</span
				>
			</a>
		</li>
		<li class="article-item">
			<a href="/history/rheims-1582" class="article-link">
				<span class="article-title">Published in a Time of Crisis</span>
				<span class="article-desc"
					>The political world that greeted the Rheims New Testament in 1582, and the Protestant
					refutation that spread it further than its authors could have imagined.</span
				>
			</a>
		</li>
		<li class="article-item">
			<a href="/history/influence-on-kjv" class="article-link">
				<span class="article-title">How the Douay-Rheims Shaped the King James Bible</span>
				<span class="article-desc"
					>The specific debt the King James Version owes to the Catholic Bible, in phrases, in
					vocabulary, and in scholarly precision.</span
				>
			</a>
		</li>
		<li class="article-item">
			<a href="/history/challoner" class="article-link">
				<span class="article-title">The Challoner Revision</span>
				<span class="article-desc"
					>How Bishop Richard Challoner transformed the Douay-Rheims in the eighteenth century, and
					why the distinction between the original and the revision matters.</span
				>
			</a>
		</li>
		<li class="article-item">
			<a href="/history/after-challoner" class="article-link">
				<span class="article-title">After Challoner: A Bible in Dispute</span>
				<span class="article-desc"
					>The proliferation of competing editions after Challoner, and why Cardinal Wiseman
					declared the name "Douay-Rheims" an abuse of terms.</span
				>
			</a>
		</li>
		<li class="article-item">
			<a href="/history/america" class="article-link">
				<span class="article-title">The Douay-Rheims in America</span>
				<span class="article-desc"
					>From Maryland in 1634 to the Catholic communities of the nineteenth century, how this
					Bible crossed the Atlantic and took root in a new world.</span
				>
			</a>
		</li>
	</ol>
</ProseLayout>

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>

<style>
	.article-list {
		list-style: none;
		padding: 0;
		margin: 40px 0 0;
		counter-reset: article-counter;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.article-item {
		counter-increment: article-counter;
		border-top: 1px solid var(--color-border);
		padding: 28px 0;
	}

	.article-item:last-child {
		border-bottom: 1px solid var(--color-border);
	}

	.article-link {
		display: grid;
		grid-template-columns: 32px 1fr;
		gap: 0 20px;
		text-decoration: none;
		align-items: baseline;
	}

	.article-link::before {
		content: counter(article-counter);
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		color: var(--color-accent);
		letter-spacing: 0.1em;
		padding-top: 4px;
	}

	.article-title {
		display: block;
		font-family: var(--font-reader);
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--color-foreground);
		letter-spacing: -0.01em;
		line-height: 1.3;
		margin-bottom: 6px;
		transition: color 150ms ease;
	}

	.article-link:hover .article-title {
		color: var(--color-accent);
	}

	.article-desc {
		display: block;
		font-family: var(--font-reader);
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--color-muted);
	}
</style>
