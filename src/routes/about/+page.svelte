<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
</script>

<svelte:head>
	<title>About This Website | The Original Douay-Rheims Bible</title>
	<meta
		name="description"
		content="How and why this site was built: the first freely searchable digital edition of the Original Douay-Rheims Bible of 1582–1610, with all annotations, search, and study tools."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/about" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="About This Website" />
	<meta
		property="og:description"
		content="The first freely searchable digital edition of the Original Douay-Rheims Bible, with all 1,707 annotations, full-text search, and side-by-side comparison."
	/>
	<meta property="og:url" content="https://thedouayrheims.com/about" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="About This Website"
	subtitle="The first freely searchable digital edition of the Original Douay-Rheims Bible of 1582–1610, with all annotations, notes, and study tools."
>
	<h2>The Translation and the Gap</h2>

	<p>
		The Original Douay-Rheims Bible, the first complete English Catholic translation of Sacred
		Scripture, has never been freely available in a usable digital form. The Internet Archive holds
		a photographic facsimile in three separate tomes, in the original period spelling, photographed
		directly from sixteenth and seventeenth-century printed copies. It can be viewed but not
		searched, and the archaic orthography makes it difficult to read at pace.
	</p>

	<p>
		Dr. William G. von Peters has produced a careful modernised edition, available in print and as
		PDF through <a href="https://www.originaldouayrheims.com">originaldouayrheims.com</a> and
		<a href="https://www.realdouayrheims.com">realdouayrheims.com</a>. His work is meticulous, but
		it is copyrighted. It cannot be reproduced, searched, or built upon.
	</p>

	<p>
		This site was built to fill that gap: a freely accessible, fully searchable edition of Gregory
		Martin's original text, with all the annotations, prefaces, and reference material that the
		translators included.
	</p>

	<h2>The Source</h2>

	<p>
		Everything here rests on the work of Patrick Madueke, who assembled a GitLab repository
		dedicated to Our Lady of La Salette at
		<a href="https://gitlab.com/simple-gui/xml2gui-bible">gitlab.com/simple-gui/xml2gui-bible</a>.
		That repository contained PDF files of the complete Original Douay-Rheims Bible and the Latin
		Vulgate, placed there without copyright restriction. Without his work, this site could not have
		been built.
	</p>

	<h2>Built with AI</h2>

	<p>
		Extracting structured data from those PDFs, book by book, chapter by chapter, verse by verse,
		annotation by annotation, and then building the site around it, was possible only with the
		assistance of Claude, the AI model developed by Anthropic. The model served as the instrument
		throughout: parsing raw text, identifying structure, formatting data, and writing code. What
		began as a straightforward extraction task grew, with its help, into something considerably more
		ambitious.
	</p>

	<h2>What This Site Provides</h2>

	<h3>The Reader</h3>

	<p>
		The full text of all 76 books, with inline annotation markers, chapter arguments, and book
		introductions as they appeared in the original edition. Two reading modes are available: Reading
		mode presents the text cleanly, free of distraction; Study mode opens a side panel showing the
		full annotation for the current verse, scrolling in synchrony with the text.
	</p>

	<h3>Reading Options</h3>

	<p>
		The reader is extensively configurable. Typography settings cover font family (Libre Baskerville
		for scholarly reading, Sentinel, or Gotham for a cleaner sans-serif line), font size, line
		height, and column width in three steps. Display options include verse numbers, the rendering of
		italics (which mark words supplied by the translators, absent from the Latin), small caps, and
		paragraph view for those who prefer continuous prose over verse-by-verse layout.
	</p>

	<p>
		Four themes are available: light, sepia, dark, and OLED. Accessibility options include Bionic
		Reading with independently adjustable fixation depth, saccade size, and opacity, along with a
		dedicated dyslexia font. For scholars, a toggle switches between Douay book names and their
		modern equivalents, and a second toggle adjusts Psalm numbering between the Douay-Rheims and
		Hebrew traditions.
	</p>

	<h3>Search</h3>

	<p>
		The search engine was built specifically for the ODR's text. It understands Douay-Rheims book
		names natively: Josue, Isaie, Paralipomenon, Apocalypse, and the others can be typed directly
		into any reference query. It also folds ligatures, so typing <em>egypt</em> finds
		<em>Ægypt</em>, and <em>cesar</em> finds <em>Cæsar</em>, as they appear in the original text.
	</p>

	<p>
		Two search scopes are available and can be toggled independently: the verse text and the
		annotations. A search in one scope surfaces cross-scope suggestions from the other, so a word
		search in verses will note if the same term appears significantly in the annotation corpus.
		Glossary term suggestions appear inline when a query matches a word defined in the ODR's own
		<em>Explication of Certain Words</em>, linking directly to the definition.
	</p>

	<h3>Compare</h3>

	<p>
		A side-by-side comparison view places the ODR alongside other translations for any chapter. The
		King James Version and several Vulgate-tradition translations are currently available. The
		Revised Standard Version Catholic Edition is planned as a modern Catholic reference point.
	</p>

	<h3>History</h3>

	<p>
		Ten articles trace the story of the Douay-Rheims Bible from the founding of the English College
		at Douai through the Challoner revision and its reception in nineteenth-century America. They
		are arranged to be read in sequence but each stands on its own.
	</p>

	<h3>Articles</h3>

	<p>
		Shorter pieces on specific topics: the language of the translation, its theological
		distinctives, its relationship to the manuscript tradition, and its influence on the King James
		Bible.
	</p>

	<h3>Reference</h3>

	<p>
		The original prefatory and appended material from the 1582 and 1609-1610 editions: the New
		Testament and Old Testament prefaces, the table of corruptions of Protestant translations, the
		historical tables of the ages, and the glossary of hard words known as the
		<em>Explication of Certain Words</em>.
	</p>

	<h2>The ODR in Numbers</h2>

	<div class="stats-grid">
		<div class="stat-card">
			<span class="stat-number">76</span>
			<span class="stat-label">Books</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,362</span>
			<span class="stat-label">Chapters</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">37,196</span>
			<span class="stat-label">Verses</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,707</span>
			<span class="stat-label">Annotations</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">3,709</span>
			<span class="stat-label">Marginal notes</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,989</span>
			<span class="stat-label">Cross-references</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,236</span>
			<span class="stat-label">Chapter summaries</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">84</span>
			<span class="stat-label">Book arguments</span>
		</div>
	</div>

	<p class="stats-note">
		The 76 books include 73 of the Catholic canon and three further texts present in the Vulgate
		appendix: 3 Esdras, 4 Esdras, and the Prayer of Manasses. The 84 book arguments exceed 76
		because several books carry more than one prefatory section, a general introduction and separate
		arguments for distinct parts.
	</p>

	<h2>A Simple Idea</h2>

	<p>
		This began as a chapter selector: a plain page showing verses with a dropdown to move between
		chapters. It was meant to take a weekend. It grew, as such things do, into something else
		entirely. The annotations required a study panel. The study panel required sync. The search
		required an understanding of the ODR's own vocabulary. The comparison view required ingesting
		additional translations. Each feature was a natural consequence of the one before it.
	</p>

	<p>
		The result is this site. It is offered freely, for anyone who wishes to read, study, or pray
		with Gregory Martin's translation, as he and his fellow exiles intended it to be used.
	</p>
</ProseLayout>

<style>
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		background-color: var(--color-border);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
		margin: 2rem 0 1rem;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 28px 16px;
		background-color: var(--color-panel);
		text-align: center;
	}

	.stat-number {
		font-family: 'Gotham', var(--font-ui);
		font-size: 2.6rem;
		font-weight: 600;
		line-height: 1;
		color: var(--color-accent);
		letter-spacing: -0.02em;
	}

	.stat-label {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-variant: small-caps;
		font-weight: 500;
		letter-spacing: 0.08em;
		color: var(--color-subtle);
		text-transform: lowercase;
	}

	.stats-note {
		font-size: 0.85em;
		color: var(--color-subtle);
		font-style: italic;
		margin-top: 0.75rem;
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-number {
			font-size: 2rem;
		}
	}
</style>
