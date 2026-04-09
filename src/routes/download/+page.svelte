<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';
</script>

<svelte:head>
	<title>Download | Douay-Rheims Bible</title>
	<meta
		name="description"
		content="Download the original Douay-Rheims Bible text as structured JSON data. Free for personal and scholarly use."
	/>
	<link rel="canonical" href="https://douayrheimsbible.net/download" />
</svelte:head>

<ProseLayout
	title="Download"
	subtitle="Access the full text of the original Douay-Rheims Bible as structured data."
>
	<h2>JSON Data</h2>

	<p>
		The complete text of the Original Douay-Rheims Bible is available as JSON files, one per book.
		Each file contains the book metadata, chapter summaries, verse text, and annotations.
	</p>

	<h3>Format</h3>

	<p>Each book file follows this structure:</p>

	<blockquote>
		<code>/data/odr/&#123;book-slug&#125;.json</code>
	</blockquote>

	<p>
		For example, <a href="/data/odr/genesis.json"><code>/data/odr/genesis.json</code></a> contains all
		50 chapters of Genesis with verse text, chapter summaries, and annotations.
	</p>

	<h3>All Books</h3>

	<p>
		There are {ALL_BOOKS.length} books available ({ALL_BOOKS.filter((b) => b.testament === 'OT')
			.length} Old Testament, {ALL_BOOKS.filter((b) => b.testament === 'NT').length} New Testament):
	</p>

	<ul>
		{#each ALL_BOOKS.slice(0, 10) as book}
			<li>
				<a href="/data/odr/{book.slug}.json"><code>{book.slug}.json</code></a> | {book.odrName} ({book.chapters}
				chapters)
			</li>
		{/each}
		<li>...and {ALL_BOOKS.length - 10} more</li>
	</ul>

	<h2>Licence</h2>

	<p>
		The text of the Original Douay-Rheims Bible is in the public domain. The structured data and
		annotations prepared for this site are freely available for personal, scholarly, and
		non-commercial use.
	</p>
</ProseLayout>

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>
