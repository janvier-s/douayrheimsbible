<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';
</script>

<svelte:head>
	<title>API — Douay-Rheims Bible</title>
	<meta
		name="description"
		content="Access the original Douay-Rheims Bible text programmatically via a simple JSON API."
	/>
	<link rel="canonical" href="https://douayrheimsbible.net/api" />
</svelte:head>

<ProseLayout
	title="API"
	subtitle="Access the Bible text programmatically through static JSON endpoints."
>
	<h2>Overview</h2>

	<p>
		The Douay-Rheims Bible data is served as pre-built static JSON files from the Cloudflare CDN.
		There is no authentication required — simply fetch the URL for the book you need.
	</p>

	<h2>Endpoints</h2>

	<h3>Get a book</h3>

	<blockquote>
		<code>GET /data/odr/&#123;slug&#125;.json</code>
	</blockquote>

	<p>
		Returns the complete book including metadata, all chapters with verse text, chapter summaries,
		and annotations. The slug is the URL-friendly book name (e.g., <code>genesis</code>,
		<code>1-kings</code>, <code>mark</code>).
	</p>

	<h3>Response structure</h3>

	<blockquote>
		<code
			>&#123; "book": "Genesis", "chapters": [&#123; "chapter": 1, "summary": "...", "verses":
			[&#123; "verse": 1, "text": "..." &#125;, ...], "annotations": [...] &#125;, ...] &#125;</code
		>
	</blockquote>

	<h2>Book Slugs</h2>

	<p>
		The Old Testament uses traditional Douay-Rheims names where they differ from modern conventions:
		<code>josue</code> (not joshua), <code>1-kings</code> (not 1-samuel),
		<code>2-kings</code> (not 2-samuel), <code>3-kings</code> (not 1-kings),
		<code>4-kings</code> (not 2-kings), <code>1-paralipomenon</code> (not 1-chronicles),
		<code>2-paralipomenon</code> (not 2-chronicles).
	</p>

	<p>
		See the <a href="/download">Download page</a> for a full list of available books.
	</p>

	<h2>Rate Limits</h2>

	<p>
		All data is served from Cloudflare's global CDN as static files. There are no rate limits.
		Responses include standard HTTP cache headers — cache locally to be respectful.
	</p>
</ProseLayout>

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>
