<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import { OT_ARTICLES, NT_ARTICLES } from '$lib/data/reference';
	import AnnotationProse from '$lib/components/AnnotationProse.svelte';
	import VerseTooltip from '$lib/components/VerseTooltip.svelte';
	import { linkifyItalicRefs, linkifyBareRefs } from '$lib/search/crossRefParser';
	import { parseOsis } from '$lib/search/reference';
	import type { OsisRange } from '$lib/search/reference';
	import { allcapsToSmallcaps } from '$lib/utils/text';

	export let data: PageData;

	$: article = data.article;
	$: content = data.content;
	$: testament = article.testament;

	// Navigation: prev/next within the same testament
	$: list = testament === 'OT' ? OT_ARTICLES : NT_ARTICLES;
	$: currentIdx = list.findIndex((a) => a.slug === article.slug);
	$: prev = currentIdx > 0 ? list[currentIdx - 1] : null;
	$: next = currentIdx < list.length - 1 ? list[currentIdx + 1] : null;

	// Detect content type from JSON shape
	type ContentType =
		| 'paragraphs'
		| 'table-grid'
		| 'columnar'
		| 'alpha-entries'
		| 'alpha-words'
		| 'book-entries'
		| 'sectioned'
		| 'numbered-articles'
		| 'subsections';

	function detectType(c: Record<string, unknown>): ContentType {
		if (c.subsections) return 'subsections';
		if (c.articles) return 'numbered-articles';
		if (c.books) return 'book-entries';
		if (c.sections) return 'sectioned';
		if (c.columns && c.entries) return 'columnar';
		if (Array.isArray(c.entries) && (c.entries as Array<Record<string, unknown>>)[0]?.words)
			return 'alpha-words';
		if (Array.isArray(c.entries) && (c.entries as Array<Record<string, unknown>>)[0]?.letter)
			return 'alpha-entries';
		if (
			Array.isArray(c.paragraphs) &&
			(c.paragraphs as Array<Record<string, unknown>>).some((p) => p.table)
		)
			return 'table-grid';
		if (
			Array.isArray(c.paragraphs) &&
			(c.paragraphs as Array<Record<string, unknown>>).some((p) => p.letter)
		)
			return 'alpha-entries';
		return 'paragraphs';
	}

	$: contentType = detectType(content);
	$: isTitlePage = article.slug === 'title-page';
	$: isLastPage = currentIdx === list.length - 1;

	/** Strip HTML tags to get plain text for search query */
	function stripHtml(html: string): string {
		return html.replace(/<[^>]+>/g, '').trim();
	}

	/** Build annotation search URL from a word */
	function annotationSearchUrl(html: string): string {
		const word = stripHtml(html).split(/[,&]/)[0].trim();
		return `/search?q=${encodeURIComponent(word)}&mode=text&scope=notes`;
	}

	/** Linkify Bible references in raw HTML for non-AnnotationProse sections */
	function linkify(html: string): string {
		return linkifyItalicRefs(html, true);
	}

	/** Map book headings (e.g. "S. Matthew.") to OSIS codes */
	const BOOK_HEADING_TO_OSIS: Record<string, string> = {
		'S. Matthew.': 'Matt',
		'S. Mark.': 'Mark',
		'S. Luke.': 'Luke',
		'S. John.': 'John',
		'Acts of the Apostles.': 'Acts',
		"S. Paul's Epistle to the Romans.": 'Rom',
		'1. To the Corinthians.': '1Cor',
		'2. To the Corinthians.': '2Cor',
		'To the Galatians.': 'Gal',
		'To the Ephesians.': 'Eph',
		'To the Philippians.': 'Phil',
		'To the Colossians.': 'Col',
		'2. To the Thessalonians.': '2Thess',
		'1. To Timothee.': '1Tim',
		'2. To Timothee.': '2Tim',
		'To Titus.': 'Titus',
		'To the Hebrews.': 'Heb',
		"S. James' Epistles.": 'Jas',
		'1. Epistle of S. Peter.': '1Pet',
		'2. Epistle of S. Peter.': '2Pet',
		'1. Epistle of S. John.': '1John',
		'Apocalypse.': 'Rev'
	};

	/** Linkify "CHAP. N. V. N." / "Chap. N. V. N." / "V. N." patterns using book context */
	let lastCorruptionChapter = 0;
	function linkifyChapVerse(html: string, osisBook: string): string {
		if (!osisBook) return html;
		let result = html;

		function verseLink(ch: number, v: string, display: string): string {
			const ref = `${osisBook}.${ch}.${v}`;
			const url = `/search?q=${encodeURIComponent(ref)}&mode=verse`;
			return `<a class="verse-ref" data-osis="${ref}" href="${url}" target="_blank" rel="noopener">${display}</a>`;
		}

		// Match "CHAP. N. V. N." or "Chap. N. V. N." with optional trailing verse list
		// e.g. "Chap. 15. V. 2. 4. 6. 22. & 23."
		result = result.replace(
			/((?:CHAP|Chap)\.\s*(\d+)\.\s*V\.\s*(\d+))((?:[.,]\s*\d+|[.,]?\s*&\s*\d+)*)\.\s*/g,
			(_, head, ch, firstV, trail) => {
				lastCorruptionChapter = parseInt(ch, 10);
				let out = verseLink(lastCorruptionChapter, firstV, `${head}.`);
				// Parse trailing verses: ". 4. 6." or "& 23."
				if (trail) {
					out += trail.replace(/(\d+)/g, (_m: string, v: string) =>
						verseLink(lastCorruptionChapter, v, v)
					);
					out += ' ';
				}
				return out;
			}
		);
		// Match "CHAP. N." without verse (only when NOT followed by V.)
		result = result.replace(/((?:CHAP|Chap)\.\s*(\d+))\.(?!\s*V\.)/g, (_, full, ch) => {
			lastCorruptionChapter = parseInt(ch, 10);
			const ref = `${osisBook}.${ch}`;
			const url = `/search?q=${encodeURIComponent(ref)}&mode=verse`;
			return `<a class="verse-ref" data-osis="${ref}" href="${url}" target="_blank" rel="noopener">${full}.</a>`;
		});
		// Match standalone "V. N." (at start or after "and") using last chapter
		if (lastCorruptionChapter > 0) {
			result = result.replace(/(^|\band\s+)V\.\s*(\d+)\.?/g, (_, prefix, v) => {
				return `${prefix}${verseLink(lastCorruptionChapter, v, `V. ${v}.`)}`;
			});
			// Match bare "and N." after a verse ref (e.g. "and 35.")
			result = result.replace(/\band\s+(\d+)\./g, (match, v) => {
				// Only linkify if it looks like a verse number (not a year or chapter ref)
				if (parseInt(v, 10) > 200) return match;
				return `and ${verseLink(lastCorruptionChapter, v, `${v}.`)}`;
			});
		}
		return result;
	}

	/* ── Verse tooltip state ─────────────────────────────────── */
	let openVerseRef: OsisRange[] = [];
	let verseRefAnchorEl: HTMLElement | null = null;
	let verseRefVisible = false;
	let verseRefTimer: ReturnType<typeof setTimeout> | null = null;

	function handleBodyMouseover(e: Event) {
		const target = e.target as HTMLElement;
		const vref = target.closest('.verse-ref') as HTMLElement | null;
		if (vref) {
			if (verseRefTimer) clearTimeout(verseRefTimer);
			const osis = vref.dataset.osis ?? '';
			const refs = osis.split(',').flatMap((s) => {
				const r = parseOsis(s.trim());
				return r ? [r] : [];
			});
			if (refs.length > 0) {
				openVerseRef = refs;
				verseRefAnchorEl = vref;
				verseRefVisible = true;
			}
		}
	}

	function handleBodyMouseout(e: Event) {
		const target = e.target as HTMLElement;
		const vref = target.closest('.verse-ref') as HTMLElement | null;
		if (vref) {
			verseRefTimer = setTimeout(() => {
				verseRefVisible = false;
				verseRefAnchorEl = null;
			}, 120);
		}
	}

	onDestroy(() => {
		if (verseRefTimer) clearTimeout(verseRefTimer);
	});
</script>

<svelte:head>
	<title>{article.title} | Douay-Rheims Bible</title>
	<meta name="description" content={article.desc} />
	<link
		rel="canonical"
		href="https://thedouayrheims.com/reference/{testament.toLowerCase()}/{article.slug}"
	/>
</svelte:head>

<nav class="ref-nav">
	<a href="/" class="ref-nav-link">
		<span class="ref-nav-cross" aria-hidden="true">✠</span>
		<span>Douay-Rheims</span>
	</a>
	<a href="/reference" class="ref-nav-back">Reference</a>
</nav>

<main
	id="main-content"
	class="ref-page"
	class:ref-page--wide={contentType === 'table-grid' || contentType === 'columnar'}
>
	<header class="ref-page-header" class:ref-page-header--centered={isTitlePage}>
		<a href="/reference" class="ref-eyebrow">
			<span aria-hidden="true">✠</span>
			{testament === 'OT' ? 'Old Testament' : 'New Testament'} Reference
		</a>
		{#if !isTitlePage}
			<h1 class="ref-page-title">{@html content.title || article.title}</h1>
			{#if content.subtitle}
				<p class="ref-page-subtitle">{content.subtitle}</p>
			{/if}
		{/if}
		<div class="ref-rule"></div>
	</header>

	{#if prev || next}
		<nav class="ref-article-nav ref-article-nav--top" aria-label="Article navigation (top)">
			{#if prev}
				<a
					href="/reference/{testament.toLowerCase()}/{prev.slug}"
					class="ref-article-nav-link ref-article-nav-link--prev"
				>
					<span class="ref-article-nav-arrow" aria-hidden="true">&larr;</span>
					<span class="ref-article-nav-label">{prev.title}</span>
				</a>
			{:else}
				<span></span>
			{/if}
			{#if next}
				<a
					href="/reference/{testament.toLowerCase()}/{next.slug}"
					class="ref-article-nav-link ref-article-nav-link--next"
				>
					<span class="ref-article-nav-label">{next.title}</span>
					<span class="ref-article-nav-arrow" aria-hidden="true">&rarr;</span>
				</a>
			{:else}
				<span></span>
			{/if}
		</nav>
	{/if}

	<!-- svelte-ignore a11y_no_static_element_interactions a11y_mouse_events_have_key_events -->
	<article
		class="ref-body"
		class:ref-body--centered={isTitlePage}
		on:mouseover={handleBodyMouseover}
		on:mouseout={handleBodyMouseout}
	>
		{#if contentType === 'paragraphs'}
			<!-- Standard paragraphs with optional notes -->
			{#each content.paragraphs as para, i}
				{#if isTitlePage}
					<p class="ref-para" class:ref-para--hero={i === 0}>{@html para.text}</p>
				{:else}
					<div class="ref-prose-block">
						<AnnotationProse text={para.text} notes={para.notes ?? []} conservativeLinks={true} />
					</div>
				{/if}
			{/each}
		{:else if contentType === 'table-grid'}
			<!-- Grid tables (historical ages) -->
			{#each content.paragraphs as para}
				{#if para.table}
					<div class="ref-table-wrap">
						<table class="ref-table">
							<thead>
								<tr>
									{#each para.table[0] as header}
										<th>{@html linkify(header)}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each para.table.slice(1) as row}
									<tr>
										{#each row as cell}
											<td>{@html linkify(cell)}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else if para.text}
					<div class="ref-prose-block">
						<AnnotationProse text={para.text} notes={para.notes ?? []} conservativeLinks={true} />
					</div>
				{/if}
			{/each}
		{:else if contentType === 'columnar'}
			<!-- Multi-column tables (evangelical history, Paul, Peter) -->
			<div class="ref-table-wrap ref-table-wrap--columnar">
				<table class="ref-table ref-table--columnar">
					<thead>
						<tr>
							{#each content.columns as col}
								<th>{col}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each content.entries as entry}
							{#if entry.note}
								<tr class="ref-table-section-row">
									<td colspan={content.columns.length}>{@html linkify(entry.note)}</td>
								</tr>
							{/if}
							<tr>
								{#if entry.emperor !== undefined}
									<!-- Paul/Peter table format -->
									<td>{@html linkify(entry.emperor || '')}</td>
									<td class="tabular-nums">{@html linkify(entry.col1 || '')}</td>
									<td class="tabular-nums">{@html linkify(entry.col2 || '')}</td>
									<td class="tabular-nums">{@html linkify(entry.col3 || '')}</td>
									<td>{@html linkify(entry.desc || '')}</td>
								{:else}
									<!-- Evangelical history format -->
									<td class="tabular-nums">{@html linkify(entry.mt || '')}</td>
									<td class="tabular-nums">{@html linkify(entry.mr || '')}</td>
									<td class="tabular-nums">{@html linkify(entry.lu || '')}</td>
									<td class="tabular-nums">{@html linkify(entry.io || '')}</td>
									<td>{@html linkify(entry.desc || '')}</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if content.closing}
				{#each content.closing as para}
					<p class="ref-para ref-closing">{@html linkify(para.text)}</p>
				{/each}
			{/if}
		{:else if contentType === 'alpha-entries'}
			<!-- Alphabetical entries (glossary, catholic truths) -->
			{@const items =
				content.entries ||
				content.paragraphs?.filter((p: Record<string, unknown>) => p.letter) ||
				[]}
			{#if content.paragraphs?.[0]?.text}
				<div class="ref-prose-block">
					<AnnotationProse
						text={content.paragraphs[0].text}
						notes={content.paragraphs[0].notes ?? []}
					/>
				</div>
			{/if}
			{#each items as group}
				<h2 class="ref-alpha-letter">{group.letter}</h2>
				<div class="ref-alpha-entries">
					{#each group.entries as entry}
						<p class="ref-alpha-entry">
							{@html linkifyBareRefs(linkify(allcapsToSmallcaps(entry)))}
						</p>
					{/each}
				</div>
			{/each}
		{:else if contentType === 'alpha-words'}
			<!-- Dictionary entries (explication of words) -->
			{#each content.entries as group}
				<h2 class="ref-alpha-letter">{group.letter}</h2>
				<dl class="ref-dict">
					{#each group.words as item}
						<div class="ref-dict-entry">
							<dt>
								<a
									href={annotationSearchUrl(item.word)}
									class="ref-dict-link"
									target="_blank"
									rel="noopener">{@html item.word}</a
								>
							</dt>
							<dd>{@html linkify(item.definition)}</dd>
						</div>
					{/each}
				</dl>
			{/each}
		{:else if contentType === 'book-entries'}
			<!-- Book-grouped entries (corruptions table) -->
			{#each content.books as book}
				{@const osisBook = BOOK_HEADING_TO_OSIS[book.book] || ''}
				{@const _ = lastCorruptionChapter = 0}
				<h2 class="ref-book-heading">{book.book}</h2>
				<div class="ref-book-entries">
					{#each book.entries as entry}
						<p class="ref-book-entry">
							{@html linkifyBareRefs(
								allcapsToSmallcaps(linkifyChapVerse(linkify(entry), osisBook))
							)}
						</p>
					{/each}
				</div>
			{/each}
		{:else if contentType === 'sectioned'}
			<!-- Sectioned entries (epistles & gospels table) -->
			{#if content.marginal_note}
				<p class="ref-marginal">{@html linkify(content.marginal_note)}</p>
			{/if}
			{#each content.sections as section}
				<h2 class="ref-section-title">{section.title}</h2>
				<div class="ref-section-entries">
					{#each section.entries as entry}
						{#if typeof entry === 'string'}
							<p class="ref-section-entry">{@html linkifyBareRefs(linkify(entry))}</p>
						{:else if entry.group}
							<h3 class="ref-section-group">{entry.group}</h3>
							{#each entry.entries || entry.bracket_entries || [] as sub}
								<p class="ref-section-entry">{@html linkifyBareRefs(linkify(sub))}</p>
							{/each}
						{/if}
					{/each}
				</div>
			{/each}
			{#if content.notes?.length}
				<aside class="ref-notes ref-notes--footer">
					{#each content.notes as note}
						<p class="ref-note">
							<span class="ref-note-marker">{note.marker}</span>
							{@html linkify(note.text)}
						</p>
					{/each}
				</aside>
			{/if}
		{:else if contentType === 'numbered-articles'}
			<!-- Numbered articles (apostles' creed) -->
			<ol class="ref-creed">
				{#each content.articles as item}
					<li class="ref-creed-item" value={item.number}>
						{@html linkify(item.text)}
					</li>
				{/each}
			</ol>
		{:else if contentType === 'subsections'}
			<!-- Numbered subsections with headings & annotated paragraphs -->
			{#each content.subsections as sub}
				<section class="ref-subsection">
					<div class="ref-subsection-header">
						<span class="ref-subsection-num">{sub.number}.</span>
						<h3 class="ref-subsection-heading">{sub.heading}</h3>
					</div>
					{#each sub.paragraphs as para}
						<div class="ref-prose-block">
							<AnnotationProse text={para.text} notes={para.notes ?? []} conservativeLinks={true} />
						</div>
					{/each}
				</section>
			{/each}
			{#if content.closing}
				<div class="ref-prose-block ref-subsection-closing">
					<AnnotationProse text={content.closing.text} notes={content.closing.notes ?? []} />
				</div>
			{/if}
		{/if}

		{#if isTitlePage || isLastPage}
			<div class="ref-cta">
				<a href="/odr/{testament === 'OT' ? 'genesis' : 'matthew'}/1" class="ref-cta-btn">
					Read {testament === 'OT' ? 'Old' : 'New'} Testament
				</a>
			</div>
		{/if}

		<VerseTooltip
			osisRanges={openVerseRef}
			anchorEl={verseRefAnchorEl}
			visible={verseRefVisible}
			on:mouseenter={() => {
				if (verseRefTimer) clearTimeout(verseRefTimer);
			}}
			on:mouseleave={() => {
				verseRefTimer = setTimeout(() => {
					verseRefVisible = false;
					verseRefAnchorEl = null;
				}, 120);
			}}
		/>
	</article>

	<!-- Prev / next navigation -->
	<nav class="ref-article-nav" aria-label="Article navigation">
		{#if prev}
			<a
				href="/reference/{testament.toLowerCase()}/{prev.slug}"
				class="ref-article-nav-link ref-article-nav-link--prev"
			>
				<span class="ref-article-nav-arrow" aria-hidden="true">&larr;</span>
				<span class="ref-article-nav-label">{prev.title}</span>
			</a>
		{:else}
			<span></span>
		{/if}
		{#if next}
			<a
				href="/reference/{testament.toLowerCase()}/{next.slug}"
				class="ref-article-nav-link ref-article-nav-link--next"
			>
				<span class="ref-article-nav-label">{next.title}</span>
				<span class="ref-article-nav-arrow" aria-hidden="true">&rarr;</span>
			</a>
		{:else}
			<span></span>
		{/if}
	</nav>
</main>

<style>
	/* ── Nav ──────────────────────────────────────────────────── */
	.ref-nav {
		padding: 22px 48px;
		display: flex;
		align-items: center;
		gap: 24px;
	}

	.ref-nav-link {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-weight: 600;
		color: var(--color-text);
		transition: color 150ms ease;
	}

	.ref-nav-link:hover {
		color: var(--color-accent);
	}

	.ref-nav-cross {
		font-size: 14px;
		color: var(--color-accent);
	}

	.ref-nav-back {
		font-family: var(--font-ui);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-weight: 500;
		color: var(--color-subtle);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.ref-nav-back:hover {
		color: var(--color-accent);
	}

	/* ── Page layout ─────────────────────────────────────────── */
	.ref-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 48px 24px 80px;
	}

	.ref-page--wide {
		max-width: 1200px;
	}

	.ref-page-header {
		margin-bottom: 48px;
	}

	.ref-page-header--centered {
		text-align: center;
	}

	.ref-page-header--centered .ref-eyebrow {
		justify-content: center;
	}

	.ref-page-header--centered .ref-rule {
		margin-left: auto;
		margin-right: auto;
	}

	.ref-eyebrow {
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
		text-decoration: none;
		transition: opacity 150ms ease;
	}

	.ref-eyebrow:hover {
		opacity: 0.7;
	}

	.ref-page-title {
		font-family: var(--font-reader);
		font-size: clamp(1.6rem, 3.5vw, 2.4rem);
		font-weight: 700;
		color: var(--color-heading, var(--color-text));
		letter-spacing: -0.02em;
		line-height: 1.2;
		margin: 0 0 12px;
	}

	.ref-page-subtitle {
		font-family: var(--font-reader);
		font-size: 1rem;
		line-height: 1.65;
		color: var(--color-muted);
		margin: 0 0 20px;
		max-width: 560px;
	}

	.ref-rule {
		width: 40px;
		height: 1px;
		background: var(--color-accent);
		opacity: 0.7;
	}

	/* ── Body ────────────────────────────────────────────────── */
	.ref-body {
		font-family: var(--font-reader);
		font-size: var(--font-size-reader);
		line-height: var(--line-height-reader);
		color: var(--color-text);
	}

	.ref-para {
		margin: 0 0 20px;
		white-space: pre-line;
	}

	.ref-body--centered {
		text-align: center;
	}

	.ref-body--centered .ref-para {
		white-space: pre-line;
	}

	.ref-para--hero {
		font-size: clamp(1.4rem, 3vw, 2rem);
		font-weight: 700;
		line-height: 1.3;
		color: var(--color-heading, var(--color-text));
		margin-bottom: 32px;
	}

	:global(.ref-title-sub) {
		display: block;
		font-size: clamp(0.95rem, 2vw, 1.15rem);
		font-weight: 400;
		line-height: 1.65;
		margin-top: 12px;
	}

	/* ── Prose blocks (AnnotationProse wrapper) ──────────────── */
	.ref-prose-block {
		margin: 0 0 12px;
	}

	.ref-prose-block :global(.ann-notes) {
		margin-bottom: 16px;
	}

	/* ── Notes (sectioned footer only) ────────────────────────── */
	.ref-notes {
		border-left: 2px solid var(--color-accent);
		padding-left: 16px;
		margin: 0 0 24px;
	}

	.ref-notes--footer {
		margin-top: 40px;
		border-top: 1px solid var(--color-border);
		padding-top: 16px;
		border-left: none;
		padding-left: 0;
	}

	.ref-note {
		font-size: 0.88rem;
		color: var(--color-muted);
		margin: 0 0 8px;
		line-height: 1.5;
	}

	.ref-note-marker {
		font-weight: 700;
		color: var(--color-accent);
		margin-right: 6px;
		font-size: 0.8rem;
	}

	/* ── Tables ───────────────────────────────────────────────── */
	.ref-table-wrap {
		overflow-x: auto;
		margin: 0 0 32px;
		-webkit-overflow-scrolling: touch;
	}

	.ref-table-wrap--columnar {
		overflow-x: visible;
	}

	.ref-table-wrap::-webkit-scrollbar {
		height: 6px;
	}

	.ref-table-wrap::-webkit-scrollbar-track {
		background: color-mix(in srgb, var(--color-border) 40%, transparent);
		border-radius: 3px;
	}

	.ref-table-wrap::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--color-accent) 50%, transparent);
		border-radius: 3px;
	}

	.ref-table-wrap::-webkit-scrollbar-thumb:hover {
		background: var(--color-accent);
	}

	@supports not selector(::-webkit-scrollbar) {
		.ref-table-wrap {
			scrollbar-width: thin;
			scrollbar-color: color-mix(in srgb, var(--color-accent) 50%, transparent)
				color-mix(in srgb, var(--color-border) 40%, transparent);
		}
	}

	.ref-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
		line-height: 1.5;
	}

	.ref-table--columnar {
		border-collapse: separate;
		border-spacing: 0;
	}

	.ref-table th {
		font-family: var(--font-ui);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		font-weight: 600;
		color: var(--color-accent);
		text-align: left;
		padding: 10px 12px;
		border-bottom: 2px solid var(--color-border);
		white-space: nowrap;
		position: sticky;
		top: 0;
		z-index: 2;
		background: var(--color-bg);
	}

	.ref-table--columnar th {
		top: 100px;
	}

	.ref-table td {
		padding: 8px 12px;
		border-bottom: 1px solid var(--color-border);
		vertical-align: top;
		color: var(--color-text);
	}

	.ref-table tbody tr:hover td {
		background: color-mix(in srgb, var(--color-accent) 5%, transparent);
	}

	.ref-table-section-row {
		position: sticky;
		top: 137px;
		z-index: 1;
	}

	.ref-table-section-row td {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-muted);
		padding: 16px 12px 8px;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-bg);
	}

	.ref-table--columnar td:last-child {
		min-width: 300px;
	}

	.ref-closing {
		margin-top: 16px;
		margin-bottom: 8px;
		font-style: italic;
		color: var(--color-muted);
	}

	.ref-closing + .ref-closing {
		margin-top: 0;
	}

	/* ── Alphabetical ─────────────────────────────────────────── */
	.ref-alpha-letter {
		font-family: var(--font-reader);
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-accent);
		margin: 40px 0 16px;
		line-height: 1;
	}

	.ref-alpha-entries {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.ref-alpha-entry {
		margin: 0;
		padding-left: 16px;
		text-indent: -16px;
		font-size: 0.95rem;
		line-height: 1.6;
	}

	/* ── Dictionary ───────────────────────────────────────────── */
	.ref-dict {
		margin: 0 0 32px;
	}

	.ref-dict-entry {
		display: flex;
		gap: 12px;
		padding: 6px 0;
		border-bottom: 1px solid var(--color-border);
		align-items: baseline;
	}

	.ref-dict-entry dt {
		font-weight: 600;
		min-width: 140px;
		flex-shrink: 0;
		color: var(--color-text);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
		text-underline-offset: 3px;
	}

	.ref-dict-link {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
		transition:
			color 150ms ease,
			text-decoration-color 150ms ease;
	}

	.ref-dict-link:hover {
		color: var(--color-accent);
		text-decoration-color: var(--color-accent);
	}

	.ref-dict-entry dd {
		margin: 0;
		color: var(--color-text);
	}

	/* ── Book-grouped ─────────────────────────────────────────── */
	.ref-book-heading {
		font-family: var(--font-reader);
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-heading, var(--color-text));
		margin: 40px 0 16px;
		line-height: 1.3;
	}

	.ref-book-entries {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.ref-book-entry {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.6;
		padding-left: 16px;
		border-left: 2px solid var(--color-border);
	}

	/* ── Sectioned ────────────────────────────────────────────── */
	.ref-marginal {
		font-size: 0.88rem;
		color: var(--color-muted);
		font-style: italic;
		margin: 0 0 24px;
	}

	.ref-section-title {
		font-family: var(--font-reader);
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--color-heading, var(--color-text));
		margin: 36px 0 12px;
		line-height: 1.35;
	}

	.ref-section-group {
		font-family: var(--font-ui);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		font-weight: 600;
		color: var(--color-accent);
		margin: 20px 0 8px;
	}

	.ref-section-entries {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.ref-section-entry {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.6;
	}

	/* ── Numbered articles ────────────────────────────────────── */
	.ref-creed {
		padding-left: 32px;
		counter-reset: none;
	}

	.ref-creed-item {
		margin: 0 0 16px;
		font-size: 1.05rem;
		line-height: 1.7;
	}

	.ref-creed-item::marker {
		color: var(--color-accent);
		font-weight: 700;
	}

	/* ── Article navigation ──────────────────────────────────── */
	.ref-article-nav {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 24px;
		margin-top: 56px;
		padding-top: 24px;
		border-top: 1px solid var(--color-border);
	}

	.ref-article-nav--top {
		margin-top: 0;
		margin-bottom: 32px;
		padding-top: 0;
		padding-bottom: 20px;
		border-top: none;
		border-bottom: 1px solid var(--color-border);
	}

	.ref-article-nav-link {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		font-family: var(--font-reader);
		font-size: 0.95rem;
		color: var(--color-text);
		line-height: 1.4;
		max-width: calc(50% - 12px);
		transition: color 150ms ease;
	}

	.ref-article-nav-link:hover {
		color: var(--color-accent);
	}

	.ref-article-nav-link--next {
		margin-left: auto;
		text-align: right;
	}

	.ref-cta {
		display: flex;
		justify-content: center;
		margin-top: 40px;
	}

	.ref-cta-btn {
		display: inline-flex;
		align-items: center;
		padding: 13px 32px;
		background: var(--color-accent);
		color: #fff;
		text-decoration: none;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		border-radius: 2px;
		transition: background 150ms ease;
	}

	.ref-cta-btn:hover {
		background: color-mix(in srgb, var(--color-accent) 82%, black);
	}

	.ref-article-nav-arrow {
		flex-shrink: 0;
		font-size: 1.1rem;
		color: var(--color-accent);
	}

	.ref-article-nav-label {
		font-weight: 500;
	}

	/* ── Subsections (scripture-authority) ────────────────────── */
	.ref-subsection {
		margin: 0 0 40px;
	}

	.ref-subsection-header {
		display: flex;
		gap: 10px;
		align-items: baseline;
		margin: 0 0 16px;
	}

	.ref-subsection-num {
		font-family: var(--font-reader);
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-accent);
		flex-shrink: 0;
	}

	.ref-subsection-heading {
		font-family: var(--font-reader);
		font-size: 1.1rem;
		font-weight: 600;
		line-height: 1.5;
		color: var(--color-heading, var(--color-text));
		margin: 0;
	}

	.ref-subsection-closing {
		margin-top: 40px;
		padding-top: 20px;
		border-top: 1px solid var(--color-border);
	}

	/* ── Responsive ───────────────────────────────────────────── */
	@media (max-width: 640px) {
		.ref-nav {
			padding: 16px 20px;
		}

		.ref-page {
			padding: 32px 16px 64px;
		}

		.ref-dict-entry {
			flex-direction: column;
			gap: 2px;
		}

		.ref-dict-entry dt {
			min-width: unset;
		}
	}

	/* ── Inline HTML italic support ──────────────────────────── */
	.ref-body :global(i) {
		font-style: italic;
	}

	.ref-body :global(mn) {
		font-size: 0.75em;
		vertical-align: super;
		color: var(--color-accent);
		font-weight: 700;
		cursor: default;
	}

	.tabular-nums {
		font-variant-numeric: tabular-nums;
		text-align: center;
	}

	/* ── Verse reference links (from linkifyItalicRefs) ─────── */
	.ref-body :global(.verse-ref) {
		color: var(--color-accent-text);
		text-decoration: none;
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent-text) 40%, transparent);
		cursor: pointer;
	}

	.ref-body :global(.verse-ref:hover) {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}

	/* Muted links on glossary / alpha-entry / book-entry / section-entry / columnar pages */
	.ref-alpha-entries :global(.verse-ref),
	.ref-book-entries :global(.verse-ref),
	.ref-section-entries :global(.verse-ref),
	.ref-table--columnar :global(.verse-ref) {
		color: var(--color-muted);
		border-bottom-color: color-mix(in srgb, var(--color-muted) 35%, transparent);
	}

	.ref-alpha-entries :global(.verse-ref:hover),
	.ref-book-entries :global(.verse-ref:hover),
	.ref-section-entries :global(.verse-ref:hover),
	.ref-table--columnar :global(.verse-ref:hover) {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}
</style>
