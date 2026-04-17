<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	const otBooks = ALL_BOOKS.filter((b) => b.testament === 'OT');
	const ntBooks = ALL_BOOKS.filter((b) => b.testament === 'NT');
</script>

<svelte:head>
	<title>API | The Original Douay-Rheims Bible</title>
	<meta
		name="description"
		content="REST API for the Original Douay-Rheims Bible. Fetch verses, chapters, books, and search the full text programmatically."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/api" />
</svelte:head>

<ProseLayout title="API" subtitle="Programmatic access to the Original Douay-Rheims Bible text.">
	<h2>Overview</h2>

	<p>
		The API provides read-only access to the complete text of the Original Douay-Rheims Bible,
		including verse text, footnotes, cross-references, and annotations. All endpoints return JSON.
		No authentication or API key is required.
	</p>

	<p>
		Bible data is served from Cloudflare's global CDN. Responses include long-lived cache headers —
		please cache on your end to avoid redundant requests.
	</p>

	<div class="base-url">
		<span class="base-url-label">Base URL</span>
		<code>https://thedouayrheims.com</code>
	</div>

	<h2>Endpoints</h2>

	<!-- GET /api/verse -->
	<div class="endpoint">
		<div class="endpoint-head">
			<span class="method">GET</span>
			<code class="endpoint-path">/api/verse/<em>:book</em>/<em>:chapter</em>/<em>:verse</em></code>
		</div>
		<p>Returns a single verse with its footnotes and cross-references.</p>

		<h4>Parameters</h4>
		<table class="param-table">
			<thead><tr><th>Name</th><th>In</th><th>Description</th></tr></thead>
			<tbody>
				<tr
					><td><code>book</code></td><td>path</td><td
						>Book slug (see <a href="#slugs">Book slugs</a>)</td
					></tr
				>
				<tr><td><code>chapter</code></td><td>path</td><td>Chapter number</td></tr>
				<tr><td><code>verse</code></td><td>path</td><td>Verse number</td></tr>
			</tbody>
		</table>

		<h4>Example request</h4>
		<pre><code>GET /api/verse/john/3/16</code></pre>

		<h4>Example response</h4>
		<pre><code
				>{`{
  "book": "john",
  "book_title": "The Gospel of Jesus Christ According to S. John",
  "chapter": 3,
  "verse": 16,
  "text": "For God so loved the world, as to give his only-begotten Son: that whosoever believeth in him may not perish, but may have life everlasting.",
  "notes": [
    {
      "label": "a",
      "text": "The love of God to man was so great, that he gave his only Son to die for man's salvation."
    }
  ],
  "cross_refs": [
    { "text": "1. Io. 4, 9." }
  ]
}`}</code
			></pre>
	</div>

	<!-- GET /api/chapter -->
	<div class="endpoint">
		<div class="endpoint-head">
			<span class="method">GET</span>
			<code class="endpoint-path">/api/chapter/<em>:book</em>/<em>:chapter</em></code>
		</div>
		<p>Returns all verses in a chapter.</p>

		<h4>Parameters</h4>
		<table class="param-table">
			<thead><tr><th>Name</th><th>In</th><th>Description</th></tr></thead>
			<tbody>
				<tr><td><code>book</code></td><td>path</td><td>Book slug</td></tr>
				<tr><td><code>chapter</code></td><td>path</td><td>Chapter number</td></tr>
			</tbody>
		</table>

		<h4>Example request</h4>
		<pre><code>GET /api/chapter/genesis/1</code></pre>

		<h4>Example response</h4>
		<pre><code
				>{`{
  "book": "genesis",
  "book_title": "The Book of Genesis",
  "chapter": 1,
  "verse_count": 31,
  "verses": [
    {
      "verse": 1,
      "text": "In the beginning God created heaven and earth.",
      "notes": [],
      "cross_refs": [{ "text": "Act. 14, 15. 17, 24." }]
    },
    ...
  ]
}`}</code
			></pre>
	</div>

	<!-- GET /data/odr/:book.json -->
	<div class="endpoint">
		<div class="endpoint-head">
			<span class="method">GET</span>
			<code class="endpoint-path">/data/odr/<em>:book</em>.json</code>
		</div>
		<p>
			Returns the complete book: all chapters, all verses, footnotes, cross-references, chapter
			introductions, and book metadata. Served as a static file directly from Cloudflare CDN —
			fastest option when you need a whole book.
		</p>

		<h4>Example request</h4>
		<pre><code>GET /data/odr/matthew.json</code></pre>
	</div>

	<!-- GET /api/random -->
	<div class="endpoint">
		<div class="endpoint-head">
			<span class="method">GET</span>
			<code class="endpoint-path">/api/random</code>
		</div>
		<p>Returns a randomly selected verse. Useful for widgets, bots, and daily verse features.</p>

		<h4>Parameters</h4>
		<table class="param-table">
			<thead><tr><th>Name</th><th>In</th><th>Description</th></tr></thead>
			<tbody>
				<tr>
					<td><code>testament</code></td>
					<td>query</td>
					<td>Optional. <code>OT</code> or <code>NT</code> to restrict to one Testament.</td>
				</tr>
			</tbody>
		</table>

		<h4>Example requests</h4>
		<pre><code
				>GET /api/random
GET /api/random?testament=NT</code
			></pre>

		<h4>Response shape</h4>
		<p>Same as <code>/api/verse/:book/:chapter/:verse</code>.</p>
	</div>

	<!-- GET /api/search -->
	<div class="endpoint">
		<div class="endpoint-head">
			<span class="method">GET</span>
			<code class="endpoint-path">/api/search</code>
		</div>
		<p>
			Full-text search across verse text or the full notes corpus (annotations, marginal notes,
			reference documents).
		</p>

		<h4>Parameters</h4>
		<table class="param-table">
			<thead><tr><th>Name</th><th>In</th><th>Required</th><th>Description</th></tr></thead>
			<tbody>
				<tr><td><code>q</code></td><td>query</td><td>Yes</td><td>Search query</td></tr>
				<tr>
					<td><code>scope</code></td><td>query</td><td>No</td>
					<td><code>verses</code> (default) or <code>notes</code></td>
				</tr>
				<tr>
					<td><code>limit</code></td><td>query</td><td>No</td>
					<td>Max results, 1–500. Default: 100.</td>
				</tr>
				<tr>
					<td><code>counts</code></td><td>query</td><td>No</td>
					<td
						>Set to <code>1</code> to return only result counts for both scopes, without hydrating results.</td
					>
				</tr>
			</tbody>
		</table>

		<h4>Example request</h4>
		<pre><code>GET /api/search?q=propitiation&scope=verses&limit=20</code></pre>

		<h4>Verse scope response</h4>
		<pre><code
				>{`{
  "scope": "verses",
  "total": 4,
  "queryTokens": ["propitiation"],
  "results": [
    {
      "heading": "Romans 3",
      "slug": "romans",
      "chapter": 3,
      "bookName": "Romans",
      "verseNumbers": [25],
      "verses": [
        {
          "verse": 25,
          "text": "Whom God hath proposed to be a propitiation, through faith in his blood..."
        }
      ],
      "queryTokens": ["propitiation"]
    }
  ]
}`}</code
			></pre>

		<h4>Notes scope response</h4>
		<pre><code
				>{`{
  "scope": "notes",
  "total": 12,
  "queryTokens": ["propitiation"],
  "results": [
    {
      "reference": "Romans 3:25",
      "slug": "romans",
      "chapter": 3,
      "verse": 25,
      "type": "annotation",
      "title": "Propitiation",
      "noteText": "Christ is our propitiation...",
      "queryTokens": ["propitiation"]
    }
  ]
}`}</code
			></pre>
	</div>

	<h2 id="errors">Errors</h2>

	<table class="param-table">
		<thead><tr><th>Status</th><th>Meaning</th></tr></thead>
		<tbody>
			<tr
				><td><code>400</code></td><td>Bad request — invalid parameter (e.g. non-numeric chapter)</td
				></tr
			>
			<tr
				><td><code>404</code></td><td
					>Not found — unknown book slug, or chapter/verse out of range</td
				></tr
			>
			<tr><td><code>500</code></td><td>Internal error — data could not be loaded</td></tr>
		</tbody>
	</table>

	<p>Error responses follow the shape <code>{`{ "error": "description" }`}</code>.</p>

	<h2 id="slugs">Book slugs</h2>

	<p>
		Slugs follow the Douay-Rheims naming convention. Kings and Paralipomenon use the DR numbering
		(not the Protestant convention). The three Vulgate appendix texts are included.
	</p>

	<h3>Old Testament ({otBooks.length} books)</h3>
	<div class="slug-grid">
		{#each otBooks as book}
			<div class="slug-row">
				<code>{book.slug}</code>
				<span>{book.odrName}</span>
			</div>
		{/each}
	</div>

	<h3>New Testament ({ntBooks.length} books)</h3>
	<div class="slug-grid">
		{#each ntBooks as book}
			<div class="slug-row">
				<code>{book.slug}</code>
				<span>{book.odrName}</span>
			</div>
		{/each}
	</div>

	<h2>Caching</h2>

	<p>
		Verse and chapter endpoints return <code>Cache-Control: public, max-age=86400</code> (24 hours).
		The random endpoint returns <code>Cache-Control: no-store</code>. Search responses are private
		with a short TTL. Please respect these headers and cache on your end.
	</p>

	<h2>Rate limits</h2>

	<p>
		There are no enforced rate limits. The API is served from Cloudflare's global CDN with no
		compute cost for static book files. For high-volume use, prefer <code>/data/odr/:book.json</code
		>
		over repeated per-verse requests, and cache aggressively.
	</p>
</ProseLayout>

<style>
	.base-url {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		margin: 0 0 2rem;
	}

	.base-url-label {
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-subtle);
		white-space: nowrap;
	}

	.base-url code {
		font-size: 0.9rem;
		color: var(--color-text);
		background: none;
		padding: 0;
	}

	.endpoint {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 20px 22px;
		margin: 0 0 20px;
		background: var(--color-panel);
	}

	.endpoint h4 {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--color-subtle);
		margin: 1.4rem 0 0.5rem;
	}

	.endpoint p {
		margin: 0.5rem 0 0;
		font-size: 0.95rem;
		color: var(--color-muted);
	}

	.endpoint pre {
		margin: 0;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		padding: 12px 14px;
		overflow-x: auto;
		font-size: 0.8rem;
		line-height: 1.6;
	}

	.endpoint pre code {
		background: none;
		padding: 0;
		font-size: inherit;
		color: var(--color-text);
	}

	.endpoint-head {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 4px;
	}

	.method {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--color-bg);
		background: var(--color-accent);
		border-radius: 3px;
		padding: 2px 7px;
		flex-shrink: 0;
	}

	.endpoint-path {
		font-size: 0.92rem;
		color: var(--color-text);
		background: none;
		padding: 0;
	}

	.endpoint-path em {
		font-style: normal;
		color: var(--color-accent);
	}

	.param-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		margin: 0;
	}

	.param-table thead tr {
		border-bottom: 1px solid var(--color-border);
	}

	.param-table th {
		font-family: var(--font-ui);
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-subtle);
		padding: 6px 10px 6px 0;
		text-align: left;
	}

	.param-table td {
		padding: 7px 10px 7px 0;
		vertical-align: top;
		border-top: 1px solid var(--color-border);
		color: var(--color-text);
		line-height: 1.5;
	}

	.param-table tbody tr:first-child td {
		border-top: none;
	}

	.param-table code {
		font-size: 0.8rem;
	}

	/* Slug grid */
	.slug-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1px;
		background: var(--color-border);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
		margin: 0.75rem 0 1.5rem;
		font-size: 0.85rem;
	}

	.slug-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 12px;
		background: var(--color-panel);
	}

	.slug-row code {
		font-size: 0.78rem;
		min-width: 10ch;
		flex-shrink: 0;
	}

	.slug-row span {
		color: var(--color-muted);
		font-size: 0.82rem;
	}
</style>
