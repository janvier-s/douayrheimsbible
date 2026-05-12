<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import { ABOUT_NAV } from '../nav';
</script>

<svelte:head>
	<title>Features · The Original Douay-Rheims Bible</title>
	<meta
		name="description"
		content="How to use this site: the reader, study panel, Church Fathers commentary, compare mode, search, and reading options for the Original Douay-Rheims Bible."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/about/features" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Features" />
	<meta
		property="og:description"
		content="How to use this site: the reader, study panel, Church Fathers commentary, compare mode, search, and reading options."
	/>
	<meta property="og:url" content="https://thedouayrheims.com/about/features" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="Features"
	subtitle="The reader, study panel, Church Fathers commentary, compare mode, and search."
	navItems={ABOUT_NAV}
>
	<h2>The Reader</h2>

	<p>
		The top bar carries a mode selector with three options: <strong>Read</strong>,
		<strong>Study</strong>, and <strong>Compare</strong>. Read is the default. It presents the full
		text of all 76 books, with inline annotation markers, chapter arguments, and book introductions
		as they appeared in the original edition, with nothing to compete for attention.
	</p>

	<p>
		Navigation is built into the chapter heading, which doubles as a dropdown for jumping directly
		to any chapter in the book. Four chevrons flank the heading:
	</p>

	<ul>
		<li><strong>‹ ›</strong> – steps one chapter back or forward.</li>
		<li><strong>‹‹ ››</strong> – jumps to the previous or next book entirely.</li>
	</ul>

	<p>
		Infinite scroll is on by default: the next chapter loads seamlessly as you reach the bottom of
		the page, and the previous as you scroll back up. The chevron navigation and infinite scroll are
		independent: both can be active at once. Each can be toggled in the reading options to suit your
		preferred reading experience.
	</p>

	<figure class="screenshot-fig">
		<a href="/images/about/reader.jpg" target="_blank" rel="noopener" class="screenshot-link">
			<img
				src="/images/about/reader.jpg"
				alt="Reading mode, John Chapter 3 with chapter summary and verse text"
				width="1140"
				height="811"
				loading="lazy"
			/>
		</a>
		<figcaption>Reading mode. Text fills the page cleanly.</figcaption>
	</figure>

	<h2>Study</h2>

	<p>
		Study mode opens a side panel alongside the text. As you scroll, the panel tracks the current
		verse and surfaces the notes, commentary, and cross-references that belong to it. All of this
		material is reproduced exactly as the translators and commentators wrote it. Nothing has been
		added, removed, or modified.
	</p>

	<h3>Study Content by Translation</h3>

	<p>Six translations carry study content, each with its own character.</p>

	<p>
		The <strong>Original Douay-Rheims</strong> carries 1,707 marginal annotations that form the theological
		heart of the translation, defending Catholic readings of Scripture, refuting Protestant renderings,
		and explaining the Latin behind the English word chosen. The doctrines most directly at stake are
		those the reformers contested: Christ's presence in the Eucharist, the intercession of the saints,
		and the nature of justification. Alongside the annotations are 3,709 scriptural cross-references drawn
		from the translators' own marginal notes, shorter textual notes on philology and alternative readings,
		book introductions and arguments, and occasional longer articles and end matter attached to specific
		chapters.
	</p>

	<p>
		The <strong>Challoner Douay-Rheims</strong> (1752) includes Bishop Challoner's own footnotes and cross-references,
		which are more concise than the originals but remain a valuable companion to his revised text.
	</p>

	<p>
		The <strong>Haydock Catholic Bible Commentary</strong> (1859) offers the most extensive study material
		on this site: verse-by-verse commentary for nearly every verse in Scripture, compiled by Rev. George
		Leo Haydock from the work of Challoner, Calmet, Tirinus, Menochius, and other Catholic commentators.
		Each entry is attributed to its author. The panel also includes book introductions and cross-references.
	</p>

	<p>
		The <strong>Confraternity New Testament</strong> (1941) carries footnotes, brief commentary, and book
		introductions prepared by the scholars of the Episcopal Committee of the Confraternity of Christian
		Doctrine.
	</p>

	<p>
		The <strong>Knox Bible</strong> (1955) includes Monsignor Knox's own translator notes, often
		witty and always illuminating, and the <strong>Catholic Public Domain Version</strong> includes translator
		notes by Ronald L. Conte Jr.
	</p>

	<h3>Linked References</h3>

	<p>
		Scripture references within cross-references and notes are automatically detected and linked.
		Hovering over a linked reference shows a tooltip with the full verse text; clicking it navigates
		to the passage. Each verse header in the panel also doubles as a shareable link: hovering
		reveals a link icon, and clicking it copies a URL that opens directly to that verse's notes,
		cross-references, or annotations. Because the references were extracted programmatically from
		sixteenth- and seventeenth-century notation, a small number may not be detected or may resolve
		incorrectly.
	</p>

	<figure class="screenshot-fig screenshot-fig-sm">
		<a href="/images/about/cross-refs.webp" target="_blank" rel="noopener" class="screenshot-link">
			<img
				src="/images/about/cross-refs.webp"
				alt="A verse tooltip showing John 8:12 alongside a cross-reference entry linking to Io. 8, 12."
				width="896"
				height="352"
				loading="lazy"
			/>
		</a>
		<figcaption>Cross-references link to full verse text on hover.</figcaption>
	</figure>

	<h3>The Panel</h3>

	<p>
		The panel can be resized by dragging the divider. On mobile it takes over the full screen, with
		the bottom bar switching between read, study, compare, and search views.
	</p>

	<figure class="screenshot-fig">
		<a href="/images/about/study.jpg" target="_blank" rel="noopener" class="screenshot-link">
			<img
				src="/images/about/study.jpg"
				alt="Study mode, John Chapter 3 with annotations panel open on the right"
				width="1140"
				height="811"
				loading="lazy"
			/>
		</a>
		<figcaption>Study mode. Annotations open alongside, scrolling in step.</figcaption>
	</figure>

	<h2>Compare</h2>

	<p>
		Any chapter can be placed alongside other translations for direct comparison. The most revealing
		comparison is with Bishop Challoner's revision of the Original Douay-Rheims itself. Setting the
		two texts side by side shows exactly what Challoner changed: where he simplified a Latinate
		construction, where he replaced the Original Douay-Rheims' vocabulary with a phrase borrowed
		from the King James Version, and where he left the original untouched. It is the clearest way to
		see what the Original Douay-Rheims actually is and what was lost in revision.
	</p>

	<p>
		The King James Version is also available. It is relevant here less as a Protestant counterpart
		than as the source Challoner drew on when modernising the Original Douay-Rheims' English.
		Reading the three texts together, Original Douay-Rheims alongside Challoner alongside KJV,
		traces that influence directly. The Revised Standard Version Catholic Edition is planned as a
		further modern reference.
	</p>

	<p>
		Up to seven translations can be displayed at once. Column headers can be grabbed and dragged to
		reorder the columns as needed. Hovering over a verse highlights the entire row across all
		columns, making it easier to track the same verse across translations.
	</p>

	<figure class="screenshot-fig">
		<a href="/compare/genesis/1" class="screenshot-link">
			<picture>
				<source srcset="/images/about/compare.webp" type="image/webp" />
				<img
					src="/images/about/compare.jpg"
					alt="Compare mode showing John Chapter 1 across four translations side by side: Clementine Vulgate, Original Douay-Rheims, King James Version, and Douay-Rheims Challoner, with row highlight on hover"
					width="1140"
					height="715"
					loading="lazy"
				/>
			</picture>
		</a>
		<figcaption>
			Compare mode. Clementine Vulgate, Original Douay-Rheims, KJV, and Challoner placed side by
			side.
		</figcaption>
	</figure>

	<h2>Church Fathers</h2>

	<p>
		Every chapter of Scripture has a fourth mode alongside Read, Study, and Compare: a panel of
		patristic commentary drawn from the first eight centuries of the Church. The writers represented
		range from Clement of Rome and Ignatius of Antioch through Augustine, Chrysostom, Jerome, and
		Gregory the Great, with coverage spanning East and West, Greek and Latin traditions. Each entry
		shows the author's name, approximate date, and the passage under comment.
	</p>

	<p>
		Commentary is organised by chapter. Within a chapter, entries are grouped by pericope, the
		natural unit of text the Fathers typically addressed. Clicking any verse number or pericope
		heading scrolls the commentary panel to the corresponding group. Where a Father comments on a
		single verse in isolation, that entry appears under its verse; where the comment ranges across
		several verses, it appears under the pericope that contains them.
	</p>

	<p>
		Each entry card can be expanded to reveal inline footnotes and the source reference. The
		footnotes supply textual variants, parallel passages, and the editor's clarifications. The
		source line at the foot of each card gives the standard citation for the patristic text: the
		volume and column in Migne's Patrologia Graeca or Patrologia Latina, or the equivalent critical
		series. Bible references within the commentary text are linked: hovering over one shows the
		verse text in a small popover, the same tooltip used in study mode.
	</p>

	<p>
		The panel includes filters for narrowing by century, era, theological tradition, or individual
		author. These can be combined: selecting the third century and the Greek East, for example,
		isolates the Alexandrian commentators on any given chapter. Filtered entries update immediately
		without reloading.
	</p>

	<h2>Reading Options</h2>

	<h3>Typography</h3>

	<ul>
		<li>
			<strong>Font:</strong> Six typefaces are available across two groups:
			<ul>
				<li>
					<strong>Libre Baskerville</strong> (default): transitional serif. High contrast between thick
					and thin strokes, vertical stress, refined bracketed serifs. The classic book type style that
					bridges Renaissance calligraphy and the precision of the modern press.
				</li>
				<li>
					<strong>Sentinel</strong>: slab serif. Thick block-like serifs, sturdy and even-stroked.
					Where transitional serifs are refined, slabs are confident and grounded.
				</li>
				<li>
					<strong>Source Serif</strong>: humanist serif. Warmer and more calligraphic, proportions
					drawn from Renaissance letterforms. Highly readable on screen.
				</li>
				<li>
					<strong>Noto Sans</strong>: humanist sans-serif. Retains the warmth and varied stroke
					weight of calligraphic letterforms, without the serifs. Neutral and legible.
				</li>
				<li>
					<strong>Libre Franklin</strong>: grotesque sans-serif. Based on the American Gothic
					tradition: utilitarian, sturdy, with just enough character to avoid feeling mechanical.
				</li>
				<li>
					<strong>Montserrat</strong>: geometric sans-serif. Letters built on circles and straight
					lines. Clean, modern, and visually even.
				</li>
			</ul>
		</li>
		<li>
			<strong>Size and spacing:</strong> Font size, line height, and column width are each adjustable
			in small steps, so the text can be set for comfortable reading on any screen.
		</li>
	</ul>

	<h3>Display</h3>

	<ul>
		<li>
			<strong>Verse numbers:</strong> Can be shown or hidden. Hidden, the text reads more naturally as
			continuous prose.
		</li>
		<li>
			<strong>Paragraph view:</strong> Arranges the text in flowing paragraphs rather than numbered
			lines, as the original printed book appeared. Two sub-options are available:
			<strong>Drop cap</strong>
			renders the first letter of each chapter as a large decorative capital, and
			<strong>Hanging verse numbers</strong> pulls each paragraph-opening verse number into the left margin
			so the text body remains flush throughout.
		</li>
		<li>
			<strong>Italics:</strong> Words italicised in the original are those supplied by the translators
			to complete the sense in English but absent from the Latin. The toggle lets you distinguish these
			from the text proper, or read without the interruption.
		</li>
		<li>
			<strong>Small caps:</strong> Used in the original for important proper nouns and significant passages.
			Can be turned off for a more uniform appearance.
		</li>
		<li>
			<strong>Ampersand:</strong> The original uses <em>&amp;</em> throughout. A toggle expands
			these to <em>and</em> for modern readability.
		</li>
	</ul>

	<div class="options-row">
		<div class="options-text">
			<h3>Themes</h3>
			<ul>
				<li><strong>Light:</strong> The standard reading mode.</li>
				<li><strong>Sepia:</strong> Approximates the warmth of a printed page.</li>
				<li><strong>Dark:</strong> For low-light reading.</li>
				<li>
					<strong>OLED:</strong> True black for screens where battery life or maximum contrast matters.
				</li>
			</ul>
		</div>
		<figure class="screenshot-fig options-panel-fig">
			<a
				href="/images/about/reading-options-panel.jpg"
				target="_blank"
				rel="noopener"
				class="screenshot-link"
			>
				<img
					src="/images/about/reading-options-panel.jpg"
					alt="Reading options panel showing font size, line spacing, font selector, and theme swatches"
					width="550"
					height="914"
					loading="lazy"
				/>
			</a>
			<figcaption>Reading options panel.</figcaption>
		</figure>
	</div>

	<h3>Accessibility</h3>

	<ul>
		<li>
			<strong>Bionic Reading:</strong> Bolds the first syllables of each word to guide the eye across
			the line, reducing the cognitive effort required to track text. Particularly useful for readers
			with ADHD or anyone who finds sustained reading difficult. Fixation depth, saccade interval, and
			text opacity are independently adjustable to suit your reading pattern.
		</li>
		<li>
			<strong>Dyslexia font:</strong> Applies Grace Dyslexic throughout the site, not only in the reader.
			The typeface adds weight to the bottom of letters to anchor them to the baseline, and introduces
			subtle visual distinctions between letterforms that are commonly confused, such as b, d, p, and
			q.
		</li>
	</ul>

	<div class="screenshot-row">
		<figure class="screenshot-fig">
			<a href="/images/about/bionic.jpg" target="_blank" rel="noopener" class="screenshot-link">
				<img
					src="/images/about/bionic.jpg"
					alt="Bionic Reading mode, Genesis 1:1–2 with bold word prefixes"
					width="970"
					height="382"
					loading="lazy"
				/>
			</a>
			<figcaption>Bionic Reading mode.</figcaption>
		</figure>
		<figure class="screenshot-fig">
			<a href="/images/about/dyslexic.jpg" target="_blank" rel="noopener" class="screenshot-link">
				<img
					src="/images/about/dyslexic.jpg"
					alt="Grace Dyslexic font, Genesis 1:1–2 in dyslexia-friendly typeface"
					width="960"
					height="362"
					loading="lazy"
				/>
			</a>
			<figcaption>Grace Dyslexic font mode.</figcaption>
		</figure>
	</div>

	<h3>Scholarly Toggles</h3>

	<ul>
		<li>
			<strong>Book names:</strong> Toggle between the Douay-Rheims names (Isaie, Josue, Paralipomenon,
			Machabees) and their modern equivalents (Isaiah, Joshua, Chronicles, Maccabees).
		</li>
		<li>
			<strong>Psalm numbering:</strong> Switches between the Douay-Rheims numbering, which follows the
			Septuagint and Latin Vulgate, and the Hebrew numbering used in most Protestant and modern Catholic
			editions. The two traditions diverge at Psalm 9 and realign after Psalm 147.
		</li>
	</ul>

	<h2>Prayer before Reading</h2>

	<p>
		The praying hands icon in the top bar opens a short prayer before reading Sacred Scripture. It
		is the <em>Veni Sancte Spiritus</em>, the traditional invocation of the Holy Spirit used before
		the reading of Scripture and the Divine Office, presented side by side in Latin and English. The
		practice of praying before opening the Scriptures is as old as the Church's engagement with the
		Word of God, who speaks still through the text.
	</p>

	<h2>Mobile</h2>

	<p>
		The site is fully responsive. On a phone the layout reflows around the screen: the navigation
		moves to a bottom bar, the text scales to the available width, and all reading options remain
		accessible. The site can be installed as a Progressive Web App directly from your browser,
		adding it to your home screen for a native app-like experience. Once installed, you can
		<a href="/download">download the full text for offline reading</a>, so the Bible is always
		available, even without a network connection.
	</p>

	<div class="mobile-mockup-row">
		<figure class="screenshot-fig screenshot-fig--mobile">
			<a
				href="/images/about/mobile-read.webp"
				target="_blank"
				rel="noopener"
				class="screenshot-link"
			>
				<img
					src="/images/about/mobile-read.webp"
					alt="Reading mode on mobile, Genesis Chapter 1"
					width="600"
					height="1182"
					loading="lazy"
				/>
			</a>
			<figcaption>Reading mode.</figcaption>
		</figure>
		<figure class="screenshot-fig screenshot-fig--mobile">
			<a
				href="/images/about/mobile-study.webp"
				target="_blank"
				rel="noopener"
				class="screenshot-link"
			>
				<img
					src="/images/about/mobile-study.webp"
					alt="Study mode on mobile, Genesis Chapter 1 with annotations"
					width="600"
					height="1182"
					loading="lazy"
				/>
			</a>
			<figcaption>Study mode.</figcaption>
		</figure>
	</div>

	<h2>Search</h2>

	<p>
		The search understands this text natively. You can type a verse reference as Catholics have
		always named these books: Josue, Apocalypse, 1 Machabees, Isaie. You can also type the modern
		equivalents; either will find your passage. Typographical ligatures are folded automatically, so
		searching for <em>egypt</em> will surface <em>Ægypt</em>, and <em>caesar</em> will find
		<em>Cæsar</em>, exactly as they appear in Gregory Martin's text.
	</p>

	<p>
		Two scopes can be searched independently: the verse text and the notes. Searching the verses
		finds every occurrence of a word in Scripture. Searching the notes covers the full scholarly
		apparatus the translators assembled: the 1,707 annotations, all marginal notes, and the
		prefatory reference material from both Testaments, including the prefaces to the reader, the
		table of corruptions in Protestant translations, the glossary of theological terms, and all
		other front matter. Results from the reference material appear alongside annotations and verse
		notes, so a search for a doctrine or a phrase will surface not only what the translators wrote
		beside a verse but what they argued at length in the prefaces.
	</p>

	<ul>
		<li>
			<strong>Verse search examples:</strong>
			<em>Josue 1:9</em>, <em>Isaie 7:14</em>, <em>Jn 3:16</em>. Any reference in DR or modern
			naming.
		</li>
		<li>
			<strong>Notes search examples:</strong>
			<em>holocausts</em>, <em>propitiation</em>, <em>wash me</em>. Any word or phrase in the
			annotations, marginal notes, and reference documents across the full edition.
		</li>
	</ul>

	<p>
		When a search term matches a word defined in the Original Douay-Rheims' own <em
			>Explication of Certain Words</em
		>, the glossary definition appears directly in the results, saving the step of looking it up
		separately.
	</p>

	<figure class="screenshot-fig">
		<a href="/images/about/search.jpg" target="_blank" rel="noopener" class="screenshot-link">
			<img
				src="/images/about/search.jpg"
				alt="Search results for Isaie 7:14, Isaiah 7:14 showing the Virgin birth prophecy"
				width="1140"
				height="450"
				loading="lazy"
			/>
		</a>
		<figcaption>
			Verse search for <em>Isaie 7:14</em>. Finds the passage using Douay-Rheims book naming.
		</figcaption>
	</figure>

	<h2>History and Articles</h2>

	<h3>History</h3>

	<p>
		Ten articles trace the story of the Douay-Rheims Bible from the exile that produced it to its
		place in American Catholic life: a story of martyrdom, dispossession, and the conviction that
		English Catholics deserved access to the Word of God in their own language on the Church's own
		terms. They begin with the founding of the English College at Douai by William Allen, follow the
		translators through the production of the Rheims New Testament of 1582 and the Douay Old
		Testament of 1609-1610, examine the theological convictions that shaped their choices, and
		continue through the Challoner revision of the eighteenth century to the reception of the text
		in nineteenth-century America. The articles are arranged to be read in sequence but each stands
		on its own.
	</p>

	<h3>Articles</h3>

	<p>
		Shorter pieces on specific topics: the language of the translation, its relationship to the
		manuscript tradition, its theological distinctives, and its influence on the King James Bible.
	</p>

	<h2>Reference</h2>

	<p>
		The original prefatory and appended material from the 1582 and 1609-1610 editions. This includes
		the New Testament and Old Testament prefaces, which are among the most direct statements the
		translators left of what they were doing and why: their argument for fidelity to the Latin
		Vulgate, their defence of specific translation choices, and their conviction that the Church's
		understanding of Christ and his mysteries must shape every rendering of Sacred Scripture.
		Reading the prefaces alongside the text they introduce changes how the text reads.
	</p>

	<p>
		Also included: the translators' table of corruptions in Protestant versions, a document that
		reads today as a window into the confessional battles of the Reformation; the historical tables
		of the ages appended to the Old Testament; and the <em>Explication of Certain Words</em>, the
		glossary of theological terms that the translators included for readers unfamiliar with the
		Latin tradition. The Explication is the Original Douay-Rheims' own dictionary of its own
		vocabulary. When a word in the text is not quite what it seems, the Explication is often the
		surest guide to what the translators meant.
	</p>

	<p>Reference material extends across four translations, each with its own apparatus:</p>

	<ul>
		<li>
			<a href="/reference/odr"><strong>Original Douay-Rheims:</strong></a> the prefaces to both
			Testaments, the table of corruptions in Protestant versions, historical tables of the ages,
			and the <em>Explication of Certain Words</em>.
		</li>
		<li>
			<a href="/reference/drc"><strong>Challoner Douay-Rheims:</strong></a> Challoner's own
			prefatory material, Pope Leo XIII's encyclical <em>Providentissimus Deus</em> on the study of Holy
			Scripture, prayers for reading, chronological tables of both Testaments, and the table of epistles
			and gospels for the liturgical year.
		</li>
		<li>
			<a href="/reference/haydock"><strong>Haydock Catholic Bible:</strong></a> the 1883 foreword, a directory
			of over two hundred commentators cited in the work, comprehensive introductions to every book of
			both Testaments, chapter summaries for the entire Bible, and a general preface on reading Scripture.
		</li>
		<li>
			<a href="/reference/conf"><strong>Confraternity New Testament:</strong></a> background essays on
			the world of the New Testament, its parables, and the text's relationship to earlier Catholic translations.
		</li>
	</ul>

	<p>
		All reference material is fully searchable. A search in the notes scope will surface matching
		passages from the prefaces and reference documents alongside verse annotations and marginal
		notes, with a link directly to the relevant section.
	</p>

	<hr />
	<p>
		<a href="/about">← About</a>
		<a href="/about/translations">The Translations →</a>
	</p>
</ProseLayout>

<style>
	/* Screenshots */
	.screenshot-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin: 28px 0 8px;
	}

	.screenshot-fig {
		margin: 28px 0 8px;
	}

	.screenshot-fig img {
		width: 100%;
		height: auto;
		display: block;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		transition: opacity 150ms ease;
	}

	.screenshot-link {
		display: block;
	}

	.screenshot-link:hover img {
		opacity: 0.88;
	}

	.screenshot-fig-sm {
		max-width: 520px;
	}

	.screenshot-fig figcaption {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-subtle);
		margin-top: 8px;
		line-height: 1.5;
	}

	.screenshot-row .screenshot-fig {
		margin: 0;
	}

	/* Reading options layout */
	.options-row {
		display: flex;
		align-items: flex-start;
		gap: 32px;
		margin: 0 0 8px;
	}

	.options-text {
		flex: 1;
		min-width: 0;
	}

	.options-panel-fig {
		flex-shrink: 0;
		width: 220px;
		margin: 32px 0 0;
	}

	/* Mobile mockups */
	.screenshot-fig--mobile {
		flex-shrink: 0;
		width: 200px;
		margin: 0;
	}

	.mobile-mockup-row {
		display: flex;
		justify-content: center;
		gap: 32px;
		margin: 28px 0 8px;
	}

	.mobile-mockup-row .screenshot-fig--mobile {
		width: 220px;
		flex-shrink: 0;
	}

	.mobile-mockup-row .screenshot-fig--mobile img {
		border: none;
		border-radius: 0;
	}

	@media (max-width: 560px) {
		.mobile-mockup-row {
			gap: 16px;
		}

		.mobile-mockup-row .screenshot-fig--mobile {
			width: calc(50% - 8px);
		}
	}

	@media (max-width: 640px) {
		.screenshot-row {
			grid-template-columns: 1fr;
		}
	}
</style>
