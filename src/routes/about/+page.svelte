<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';

	let blessingOpen = false;

	function closeBlessing() {
		blessingOpen = false;
	}

	function handleBlessingKey(e: KeyboardEvent) {
		if (e.key === 'Escape') closeBlessing();
	}

	function handleBlessingBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) closeBlessing();
	}

	onMount(() => {
		if (browser) document.addEventListener('keydown', handleBlessingKey);
	});

	onDestroy(() => {
		if (browser) document.removeEventListener('keydown', handleBlessingKey);
	});

	$: if (browser && blessingOpen) {
		document.body.style.overflow = 'hidden';
	} else if (browser) {
		document.body.style.overflow = '';
	}
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
		The Latin Vulgate, St Jerome's translation of Scripture completed in the late fourth century,
		has been the Bible of the Western Church for over a millennium. The Council of Trent, in 1546,
		formally defined it as the authentic text of Sacred Scripture for the Catholic Church: the
		edition from which Catholic doctrine is to be proved and defended. It is from this text, and no
		other, that the Original Douay-Rheims Bible was made: the Word of God in English, drawn directly
		from the Latin in which the Western Church had kept and defended it.
	</p>

	<p>
		The Original Douay-Rheims of 1582–1610 is the first complete translation of the Vulgate into
		English. It was produced by Gregory Martin and his colleagues at the English College in exile at
		Rheims and Douai, priests formed in the continental tradition, working without the influence of
		Tyndale, the Geneva Bible, or any of the Protestant versions that had already shaped the English
		of their contemporaries. The language is deliberately Latinate, precise in its theological
		vocabulary, and at times startlingly direct. The annotations, all 1,707 of them, form a
		sustained argument: point by point engagement with those Protestant translations, defending
		Catholic readings of contested passages. The whole text is an act of witness to the faith of the
		Church in Jesus Christ, produced by scholars in exile who expected martyrdom and wrote
		accordingly.
	</p>

	<p>
		The translation most commonly circulated under the name Douay-Rheims is Bishop Richard
		Challoner's revision of 1749–1752, a substantial reworking that modernised the vocabulary,
		softened the Latinate constructions, and borrowed phrases from the King James Version that had
		passed into common English use. It reads more smoothly and served as the standard English
		Catholic Bible for two centuries. It is still widely printed. It is, however, a revision, and a
		deep one.
	</p>

	<p>
		Those who seek the Original Douay-Rheims have had few options. The photographic facsimiles of
		the original printed volumes are preserved at the Internet Archive in three tomes. They can be
		viewed but not searched, and the period spelling makes sustained reading difficult. A separate
		project,
		<a href="https://www.originaldouayrheims.com">originaldouayrheims.com</a>, set out to transcribe
		the text faithfully while preserving the original spelling; the undertaking proved larger than
		anticipated, and the site has seen no meaningful updates in years.
	</p>

	<div class="screenshot-row">
		<figure class="screenshot-fig">
			<a
				href="/images/about/facsimili-full.jpg"
				target="_blank"
				rel="noopener"
				class="screenshot-link"
			>
				<img
					src="/images/about/facsimili.jpg"
					alt="First page of Genesis from the 1609–1610 Douay Old Testament facsimile"
					width="469"
					height="620"
					loading="lazy"
				/>
			</a>
			<figcaption>
				<strong>Internet Archive facsimile</strong><br />Genesis 1 from the 1609–1610 Douay Old
				Testament. Period spelling and typography throughout.
			</figcaption>
		</figure>
		<figure class="screenshot-fig">
			<a
				href="/images/about/original-dr-full.jpg"
				target="_blank"
				rel="noopener"
				class="screenshot-link"
			>
				<img
					src="/images/about/original-dr.jpg"
					alt="originaldouayrheims.com website showing Genesis in original spelling"
					width="478"
					height="632"
					loading="lazy"
				/>
			</a>
			<figcaption>
				<strong>originaldouayrheims.com</strong><br />An earlier transcription project preserving
				the original spelling. No longer actively updated.
			</figcaption>
		</figure>
	</div>

	<a
		href="https://archive.org/details/1582DouaiRheimsDouayRheimsFirstEdition1Of31609OldTestament"
		class="facsimile-card"
		target="_blank"
		rel="noopener noreferrer"
	>
		<span class="facsimile-cross" aria-hidden="true">✠</span>
		<span class="facsimile-text">
			<span class="facsimile-label">Original Facsimile</span>
			<span class="facsimile-title">The Douay-Rheims Bible, 1582–1610</span>
			<span class="facsimile-sub">First Edition &middot; Internet Archive</span>
		</span>
		<span class="facsimile-arrow" aria-hidden="true">→</span>
	</a>

	<p>
		Two modern typeset editions also exist. Dr. William G. von Peters produced a meticulous
		modernised edition at <a href="https://www.realdouayrheims.com">realdouayrheims.com</a>, but it
		is copyrighted. Patrick Madueke assembled a complete PDF transcription of the Original
		Douay-Rheims and placed it in
		<a href="https://codeberg.org/olprint" target="_blank" rel="noopener noreferrer"
			>his repository</a
		>
		dedicated to Our Lady of La Salette, without copyright restriction. That repository is what this site
		is built on. Without his work, it could not have been built.
	</p>

	<div class="screenshot-row">
		<figure class="screenshot-fig">
			<a
				href="/images/about/peters-full.jpg"
				target="_blank"
				rel="noopener"
				class="screenshot-link"
			>
				<img
					src="/images/about/peters.jpg"
					alt="Dr. von Peters's modern typeset edition of the Original Douay-Rheims, showing Genesis Chapter 1"
					width="478"
					height="620"
					loading="lazy"
				/>
			</a>
			<figcaption>
				<strong>realdouayrheims.com</strong><br />Dr. William G. von Peters's meticulous modern
				typeset edition. Copyrighted.
			</figcaption>
		</figure>
		<figure class="screenshot-fig">
			<a
				href="/images/about/patrick-full.jpg"
				target="_blank"
				rel="noopener"
				class="screenshot-link"
			>
				<img
					src="/images/about/patrick.jpg"
					alt="Patrick Madueke's PDF transcription of the Original Douay-Rheims Bible, showing Genesis Chapter 1"
					width="478"
					height="620"
					loading="lazy"
				/>
			</a>
			<figcaption>
				<strong>Patrick Madueke's PDF transcription</strong><br />The open-source source text this
				site is built on.
			</figcaption>
		</figure>
	</div>

	<p>
		This site was built to fill that gap: a freely accessible, fully searchable edition of Gregory
		Martin's original text, with the annotations, prefaces, and reference material that the
		translators included.
	</p>

	<p>The texts, annotations, and references are free to read. No account required.</p>

	<figure class="screenshot-fig">
		<a href="/odr/genesis/1" class="screenshot-link">
			<img
				src="/images/about/site-reader.jpg"
				alt="The Douay-Rheims Bible website showing Genesis Chapter 1"
				width="1140"
				height="1031"
				loading="lazy"
			/>
		</a>
		<figcaption>
			thedouayrheims.com.<br />The text of Gregory Martin's original translation, freely readable
			and searchable for the first time.
		</figcaption>
	</figure>

	<div class="license-block">
		<p class="license-title">
			<span class="license-cross" aria-hidden="true">✠</span> Public Domain · CC0 1.0
		</p>
		<p class="license-body">
			The text, annotations, prefaces, and reference material on this site are in the public domain.
			You are free to copy, share, adapt, and redistribute them for any purpose, with no
			restrictions and no attribution required. The translations available on this site, along with
			Patrick Madueke's original PDF transcription, can be downloaded in JSON format from the
			<a href="/download">download page</a> and from the
			<a
				href="https://github.com/janvier-s/original-douay-rheims"
				target="_blank"
				rel="noopener noreferrer">GitHub repository</a
			>. A <a href="/api">REST API</a> is also available, with endpoints for individual verses, chapters,
			full books, random verses, and full-text search.
		</p>
		<a
			href="https://creativecommons.org/publicdomain/zero/1.0/"
			target="_blank"
			rel="noopener noreferrer"
			class="license-link">CC0 1.0 Universal →</a
		>
	</div>

	<h2 class="gen-subtitle">Genesis 1:1–2 across traditions</h2>

	<p class="compare-intro">
		The opening verses of Genesis illustrate what separates the Original Douay-Rheims from its
		successors. The Hebrew
		<em>tōhû wābōhû</em> is a rhyming pair unique to the language: two words bound together by
		sound, evoking primordial chaos and emptiness.<br />The Latin Vulgate renders it
		<em>inanis et vacua</em>. The Original Douay-Rheims preserves that pairing as
		<strong><em>vacant and void</em></strong>, a v-alliteration that echoes the Hebrew rhythm.
		Challoner replaced it with <em>void and empty</em>, losing the echo. The KJV reads
		<em>without form, and void</em>, departing further still.
	</p>

	<div class="gen-compare">
		<div class="gen-entry gen-entry--odr">
			<div class="gen-label">Original Douay-Rheims <span>1610</span></div>
			<p>
				<span class="gv">1</span> In the beginning God created heaven, and earth.
				<span class="gv">2</span> And the earth was <mark class="mark-odr">vacant and void</mark>:
				and darkness was upon the face of the deep; and the spirit of God moved over the waters.
			</p>
		</div>
		<div class="gen-entry">
			<div class="gen-label">DRC <span>Challoner revision, 1750</span></div>
			<p>
				<span class="gv">1</span> In the beginning God created heaven, and earth.
				<span class="gv">2</span> And the earth was <mark class="mark-drc">void and empty</mark>,
				and darkness was upon the face of the deep; and the spirit of God moved over the waters.
			</p>
		</div>
		<div class="gen-entry">
			<div class="gen-label">KJV <span>King James Version, 1611</span></div>
			<p>
				<span class="gv">1</span> In the beginning God created the heaven and the earth.
				<span class="gv">2</span> And the earth was
				<mark class="mark-kjv">without form, and void</mark>; and darkness was upon the face of the
				deep. And the Spirit of God moved upon the face of the waters.
			</p>
		</div>
		<div class="gen-entry">
			<div class="gen-label">Latin <span>Biblia Sacra Vulgata</span></div>
			<p class="gen-latin">
				<span class="gv">1</span> In principio creavit Deus cælum et terram.
				<span class="gv">2</span> Terra autem erat
				<mark class="mark-drc">inanis et vacua</mark>, et tenebræ super faciem abyssi; et spiritus
				Dei ferebatur super aquas.
			</p>
		</div>
		<div class="gen-entry">
			<div class="gen-label">Literal Latin <span>Word-for-word rendering</span></div>
			<p>
				<span class="gv">1</span> In the beginning God created the heaven and the earth.
				<span class="gv">2</span> But the earth was
				<mark class="mark-drc">formless and vacant</mark>; and darkness over the face of the deep;
				and the spirit of God was borne upon the waters.
			</p>
		</div>
		<div class="gen-entry gen-entry--hebrew">
			<div class="gen-label">Hebrew <span>Masoretic Text · with transliteration</span></div>
			<p class="gen-hebrew" dir="rtl" lang="he">
				<span class="gv" dir="ltr">1</span> בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת
				הָאָרֶץ. <span class="gv" dir="ltr">2</span> וְהָאָרֶץ הָיְתָה
				<mark class="mark-drc">תֹהוּ וָבֹהוּ</mark> וְחֹשֶׁךְ עַל-פְּנֵי תְהוֹם; וְרוּחַ אֱלֹהִים מְרַחֶפֶת
				עַל-פְּנֵי הַמָּיִם.
			</p>
			<p class="gen-translit">
				<span class="gv">1</span> Bərēʾšît bārāʾ ʾĔlōhîm ʾēṯ haššāmayim wəʾēṯ hāʾāreṣ.
				<span class="gv">2</span> Wəhāʾāreṣ hāyəṯāh
				<mark class="mark-drc">ṯōhû wābōhû</mark>; wəḥōšeḵ ʿal-pənê ṯəhôm; wərûaḥ ʾĔlōhîm məraḥepeṯ
				ʿal-pənê hammāyim.
			</p>
			<div class="gen-label gen-sublabel">Literal Hebrew <span>Word-for-word rendering</span></div>
			<p class="gen-lit-heb">
				<span class="gv">1</span> In beginning created God the heavens and the earth.
				<span class="gv">2</span> And the earth was
				<mark class="mark-drc">waste and void</mark>; and darkness over face of deep; and spirit of
				God hovering over face of the waters.
			</p>
		</div>
	</div>

	<h2>Notes on This Edition</h2>

	<p>
		The text you read here has been modernised in spelling only. The vocabulary, grammar, and
		sentence structure of Gregory Martin's translation are unchanged. Nothing has been added,
		removed, or softened. Where the original says what it says, this site says the same.
	</p>

	<p>Several caveats are worth stating plainly.</p>

	<p>
		The source PDFs assembled by Patrick Madueke are themselves transcriptions and may contain
		transcription errors. Where the PDF text diverges from the printed facsimile, the facsimile
		takes precedence; but not every discrepancy has been identified or corrected.
	</p>

	<p>
		The study notes, annotations, and marginal references were parsed programmatically from
		structured source files. Parsing errors may have introduced formatting mistakes, truncated
		notes, or misassigned references. If a note appears incomplete or malformed, this is almost
		certainly a parsing artefact rather than the original text.
	</p>

	<p>
		No attempt has been made to reconcile the Original Douay-Rheims' notes with modern biblical
		scholarship. The translators wrote in 1582-1610 with the theological and textual knowledge of
		their time. Where the notes make historical claims, attribute authorship, or engage with the
		meaning of a passage in ways that modern scholarship would nuance or contest, the text is left
		as it stands.
	</p>

	<p>
		This applies in full force to the annotations concerning Protestant translations. The
		translators wrote as polemicists in a confessional conflict. Their notes are pointed, sometimes
		severe, and written by men who regarded the Reformation as an assault on the faith. No effort
		has been made to soften them. They are part of the text.
	</p>

	<p>
		If you encounter an error in the text, a misformatted note, or any other problem, please use the
		<a href="/contact">contact form</a> to report it. Every correction helps.
	</p>

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
		Study mode opens a side panel alongside the text. The panel tracks the current verse as you
		scroll and surfaces everything the translators attached to it. All of this material is
		reproduced exactly as they wrote it. Nothing has been added, removed, or modified.
	</p>

	<p>The panel has two main tabs: <strong>Commentary</strong> and <strong>Intro</strong>.</p>

	<p>
		<strong>Commentary</strong> is open by default. It shows, for the active verse, everything anchored
		to that specific passage:
	</p>

	<ul>
		<li>
			<strong>Annotations:</strong> The 1,707 marginal annotations are the theological heart of the Original
			Douay-Rheims. They defend Catholic readings of Scripture, refute Protestant translations, and explain
			the Latin behind the English word chosen; the doctrines most directly at stake are those the reformers
			contested: Christ's presence in the Eucharist, the intercession of the saints, and the nature of
			justification.
		</li>
		<li>
			<strong>Cross-references:</strong> 3,709 scriptural cross-references drawn from the translators'
			own marginal notes, linking each passage to related verses across the canon.
		</li>
		<li>
			<strong>Marginal notes:</strong> Shorter textual notes, mostly philological, flagging alternative
			readings and points of translation.
		</li>
	</ul>

	<p>
		<strong>Intro</strong> contains the prefatory material the translators placed before the text itself:
		a general book argument and, where provided, separate arguments for distinct parts of the book.
	</p>

	<p>
		Some books carry an additional <strong>End</strong> tab for closing material appended after the
		text. Some chapters carry an additional <strong>Article</strong> tab for longer thematic pieces the
		translators attached to that chapter specifically. These tabs appear only where the source material
		includes them.
	</p>

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

	<h2>The Translations</h2>

	<p>
		Every translation on this site was made from the Latin Vulgate, or is included for the light it
		throws on how that text was translated and revised into English. Placed together in the reader
		and the compare view, they form a continuous record of how English-speaking Catholics have
		received Scripture over four centuries.
	</p>

	<ul>
		<li>
			<strong>Sixto-Clementine Vulgate (1592):</strong> The official Latin Bible of the Catholic Church
			from its promulgation by Pope Clement VIII until the Nova Vulgata of 1979. This is the source text
			from which all the English translations here were made, or in close relation to which they were
			produced. Reading it alongside the English editions reveals every translator's decision at its root.
		</li>
		<li>
			<strong>Original Douay-Rheims (1582–1610):</strong> The primary text of this site, described above
			in detail. The first complete English translation of the Clementine Vulgate, with the full apparatus
			of 1,707 annotations and 3,709 cross-references.
		</li>
		<li>
			<strong>Douay-Rheims Challoner (1749–1752):</strong> Bishop Richard Challoner's revision of the
			Original Douay-Rheims. Smoother in syntax, more modern in vocabulary, influenced in places by the
			King James Version. The standard English Catholic Bible for two centuries and still widely used.
			The comparison between the two Douay texts is the most instructive available on this site: it shows
			exactly what was gained in readability and what was sacrificed in fidelity. Challoner's edition
			also carries its own study notes, available in the study panel.
		</li>
		<li>
			<strong>Confraternity New Testament (1941):</strong> A revision of the Challoner New Testament sponsored
			by the Confraternity of Christian Doctrine, translated directly from the Clementine Vulgate. More
			accurate than Challoner in several places, it served as the standard New Testament for American
			Catholics through the mid-twentieth century. Only the New Testament was completed; before the Old
			Testament could be finished, the project shifted to the original languages and became what would
			eventually be published as the New American Bible.
		</li>
		<li>
			<strong>Knox Bible (1945–1949):</strong> Ronald Knox's complete translation from the Vulgate into
			English, commissioned by the Catholic Bishops of England and Wales. Knox was as much a stylist as
			a translator; his aim was a text that read as natural English prose rather than a Latinate rendering.
			The result is singular: learned, at times arrestingly different from every other version, and unlike
			anything else available here.
		</li>
		<li>
			<strong>Catholic Public Domain Version (2009):</strong> A modern translation of the Vulgate by Ronald
			Conte Jr., freely available without copyright restriction. More literal in approach than Knox, more
			modern in vocabulary than Challoner. The CPDV is accompanied on this site by study notes.
		</li>
		<li>
			<strong>King James Version (1611):</strong> A Protestant translation from the Hebrew and Greek,
			not the Vulgate. Its presence here is not incidental: Challoner drew on the KJV extensively when
			revising the Original Douay-Rheims, borrowing phrases that had entered common English use. Reading
			the three texts together, Original Douay-Rheims alongside Challoner alongside KJV, makes those borrowings
			visible and traces the influence that runs, through Challoner, between the two traditions.
		</li>
		<li>
			<strong>Revised Standard Version, Catholic Edition (forthcoming):</strong> A modern scholarly translation
			from the original languages, approved for Catholic use and liturgical reading. The RSV-CE represents
			the modern critical mainstream of Catholic biblical scholarship. Its inclusion, pending rights clearance,
			would complete the picture: the Vulgate tradition on one side, the modern critical tradition on
			the other, with every major English stepping stone between them.
		</li>
	</ul>

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
					alt="OpenDyslexic font, Genesis 1:1–2 in dyslexia-friendly typeface"
					width="960"
					height="362"
					loading="lazy"
				/>
			</a>
			<figcaption>OpenDyslexic font mode.</figcaption>
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
		accessible. A PWA version, installable directly from the browser, is planned.
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

	<p>
		All reference material is fully searchable. A search in the notes scope will surface matching
		passages from the prefaces and reference documents alongside verse annotations and marginal
		notes, with a link directly to the relevant section.
	</p>

	<h2>The Original Douay-Rheims in Numbers</h2>

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

	<h2>Built with AI</h2>

	<p>
		Extracting structured data from those PDFs, book by book, chapter by chapter, verse by verse,
		annotation by annotation, and then building the site around it, was possible only with the
		assistance of Claude, the AI model developed by Anthropic. The model served as instrument
		throughout: parsing raw text, identifying structure, formatting data, and writing code. What
		began as a straightforward extraction task grew, with its help, into something considerably more
		ambitious.
	</p>

	<p>
		This site does not store or transmit any user data to Google, Anthropic, or any third party.
		There are no cookies, tracking scripts, or advertising. The only analytics in use are
		Cloudflare's basic traffic counters, which are privacy-preserving and require no consent banner.
		What you read here stays between you and the page.
	</p>

	<p class="kofi-intro">
		This site is free and will remain so. If it has been useful to you, a small contribution helps
		keep it running.
	</p>

	<div class="kofi-row">
		<a
			href="https://ko-fi.com/N4N11OVVXB"
			target="_blank"
			rel="noopener noreferrer"
			class="kofi-btn"
		>
			<img src="/images/kofi-logo.png" alt="" aria-hidden="true" width="20" height="20" />
			Support this website on Ko-fi
		</a>
	</div>

	<p class="blessing-invite">
		Prayers for this work are also welcome.
		<button
			class="blessing-trigger"
			on:click={() => (blessingOpen = true)}
			aria-label="Open a prayer for this work"
		>
			<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
				<path
					d="M235.32,180l-36.24-36.25L162.62,23.46A21.76,21.76,0,0,0,128,12.93,21.76,21.76,0,0,0,93.38,23.46L56.92,143.76,20.68,180a16,16,0,0,0,0,22.62l32.69,32.69a16,16,0,0,0,22.63,0L124.28,187a40.68,40.68,0,0,0,3.72-4.29,40.68,40.68,0,0,0,3.72,4.29L180,235.32a16,16,0,0,0,22.63,0l32.69-32.69A16,16,0,0,0,235.32,180ZM64.68,224,32,191.32l12.69-12.69,32.69,32.69ZM120,158.75a23.85,23.85,0,0,1-7,17L88.68,200,56,167.32l13.65-13.66a8,8,0,0,0,2-3.34l37-122.22A5.78,5.78,0,0,1,120,29.78Zm23,17a23.85,23.85,0,0,1-7-17v-129a5.78,5.78,0,0,1,11.31-1.68l37,122.22a8,8,0,0,0,2,3.34l14.49,14.49-33.4,32ZM191.32,224l-12.56-12.57,33.39-32L224,191.32Z"
				/>
			</svg>
		</button>
	</p>

	<h2>A Simple Idea</h2>

	<p>
		This project began as a chapter selector: a plain page with a dropdown to move between chapters.
		It was meant to take a weekend. It grew, as such things do, into something else entirely. The
		annotations required a study panel. The study panel required synchronised scrolling. The search
		required an understanding of the Original Douay-Rheims' own vocabulary and naming conventions.
		The comparison view required ingesting additional translations. Each feature followed naturally
		from the one before it.
	</p>

	<p>
		The result is this site. It is offered freely, for anyone who wishes to read, study, or draw
		near to God through the first complete English translation of the Latin Vulgate, made without
		Protestant influence, from the text the Church has always held as its own.
	</p>

	<p class="intercession">
		St. Jerome, pray for us.<br />
		St. Edmund Campion, pray for us.<br />
		St. Carlo Acutis, pray for us.
	</p>

	<p class="laus-deo"><em>Laus Deo.</em></p>

	<div class="cta-row">
		<a href="/odr/genesis/1" class="cta-btn">Read the Original Douay-Rheims →</a>
	</div>
</ProseLayout>

{#if blessingOpen}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="blessing-backdrop"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-labelledby="blessing-title"
		on:click={handleBlessingBackdrop}
		on:keydown={handleBlessingKey}
	>
		<div class="blessing-panel">
			<div class="blessing-head">
				<div class="blessing-eyebrow">
					<span class="blessing-cross" aria-hidden="true">✠</span>
					<span>A Prayer for This Work</span>
				</div>
				<button class="blessing-close" on:click={closeBlessing} aria-label="Close">
					<svg
						width="11"
						height="11"
						viewBox="0 0 11 11"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						aria-hidden="true"
					>
						<line x1="1" y1="1" x2="10" y2="10" />
						<line x1="10" y1="1" x2="1" y2="10" />
					</svg>
				</button>
			</div>

			<h2 id="blessing-title" class="blessing-title">Benedictio</h2>

			<div class="blessing-body">
				<p>
					O God, who hast spoken to thy people through the Sacred Scriptures and dost speak still:
					look with favour upon all who come to this place in search of thy holy Word.
				</p>
				<p>
					Bless thy servant who has built and maintains this website. Bless the memory of Gregory
					Martin and all those at Douai and Rheims who labored in exile to give the English Church
					her Scripture; bless Patrick Madueke, whose diligence preserved that text and made this
					edition possible; bless all those whose skill and labor sustain the means by which thy
					Word is now made available across the world.
				</p>
				<p>
					Grant to all who desire to draw near to thee through thy written Word the grace to do so;
					and in thy mercy look with compassion upon those who do not yet have access to Sacred
					Scripture.
				</p>
				<p>Through Jesus Christ our Lord. <em>Amen.</em></p>
			</div>
		</div>
	</div>
{/if}

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

	/* Facsimile card */
	.facsimile-card {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px 24px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-panel);
		text-decoration: none;
		color: var(--color-text);
		margin: 28px 0 8px;
		transition:
			border-color 200ms ease,
			background 200ms ease;
	}

	.facsimile-card:hover {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 4%, var(--color-panel));
		text-decoration: none;
	}

	.facsimile-cross {
		font-size: 20px;
		color: var(--color-accent);
		flex-shrink: 0;
	}

	.facsimile-text {
		display: flex;
		flex-direction: column;
		gap: 3px;
		flex: 1;
	}

	.facsimile-label {
		font-family: var(--font-ui);
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-weight: 600;
		color: var(--color-accent-text);
	}

	.facsimile-title {
		font-family: var(--font-reader);
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
		line-height: 1.3;
	}

	.facsimile-sub {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-subtle);
	}

	.facsimile-arrow {
		font-size: 18px;
		color: var(--color-accent);
		flex-shrink: 0;
		transition: transform 200ms ease;
	}

	.facsimile-card:hover .facsimile-arrow {
		transform: translateX(4px);
	}

	/* Genesis comparison */
	.gen-subtitle {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-subtle);
		margin: 24px 0 0;
	}

	.gen-sublabel {
		margin-top: 14px !important;
		padding-top: 10px;
		border-top: 1px solid var(--color-border);
	}

	.compare-intro {
		font-size: 0.95em;
		color: var(--color-muted);
		margin-top: 0;
	}

	.gen-compare {
		display: flex;
		flex-direction: column;
		gap: 1px;
		background: var(--color-border);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
		margin: 24px 0 8px;
		font-size: 0.93em;
	}

	.gen-entry {
		background: var(--color-panel);
		padding: 14px 18px;
	}

	.gen-entry--odr {
		background: color-mix(in srgb, var(--color-accent) 5%, var(--color-panel));
	}

	.gen-label {
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-accent-text);
		margin-bottom: 6px;
	}

	.gen-label span {
		font-weight: 400;
		color: var(--color-subtle);
		margin-left: 6px;
		letter-spacing: 0.08em;
	}

	.gen-entry p {
		font-family: var(--font-reader);
		line-height: 1.65;
		color: var(--color-text);
		margin: 0;
	}

	.gv {
		font-family: var(--font-ui);
		font-size: 0.72em;
		font-weight: 600;
		color: var(--color-subtle);
		vertical-align: super;
		margin-right: 2px;
	}

	.mark-odr {
		background: color-mix(in srgb, var(--color-accent) 18%, transparent);
		color: var(--color-accent-text);
		font-weight: 600;
		padding: 0 2px;
		border-radius: 2px;
	}

	.mark-drc {
		background: color-mix(in srgb, var(--color-muted) 28%, transparent);
		color: var(--color-text);
		padding: 0 2px;
		border-radius: 2px;
	}

	.mark-kjv {
		background: color-mix(in srgb, var(--color-muted) 28%, transparent);
		color: var(--color-text);
		padding: 0 2px;
		border-radius: 2px;
	}

	.gen-hebrew {
		font-size: 1.05em;
		line-height: 1.9;
		letter-spacing: 0.02em;
	}

	.gen-translit {
		font-size: 0.88em;
		color: var(--color-muted);
		margin-top: 6px !important;
	}

	.gen-lit-heb {
		font-size: 0.9em;
		color: var(--color-muted);
		margin-top: 6px !important;
	}

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

	.screenshot-link {
		display: block;
	}

	.screenshot-fig img {
		width: 100%;
		height: auto;
		display: block;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		transition: opacity 150ms ease;
	}

	.screenshot-link:hover img {
		opacity: 0.88;
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

	/* Closing */
	.intercession {
		margin-top: 2rem;
		text-align: center;
		color: var(--color-subtle);
		font-size: 0.9rem;
		font-style: italic;
		letter-spacing: 0.03em;
	}

	.kofi-row {
		display: flex;
		justify-content: center;
		margin-top: 1.5rem;
	}

	.kofi-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: color-mix(in srgb, var(--color-subtle) 15%, transparent);
		border: 1px solid transparent;
		border-radius: 4px;
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text) !important;
		text-decoration: none;
		transition:
			border-color 150ms ease,
			color 150ms ease;
	}

	.kofi-btn img {
		width: 20px;
		height: 20px;
		object-fit: contain;
	}

	.kofi-btn:hover {
		border-color: var(--color-subtle);
		color: var(--color-text) !important;
	}

	.kofi-intro {
		font-size: 0.9rem;
		color: var(--color-subtle);
		text-align: center;
		margin-top: 1.5rem;
		margin-bottom: 0;
	}

	.cta-row {
		display: flex;
		justify-content: center;
		margin-top: 2.5rem;
	}

	.cta-btn {
		display: inline-block;
		padding: 10px 24px;
		border: 1px solid var(--color-accent);
		border-radius: 4px;
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 500;
		letter-spacing: 0.04em;
		color: var(--color-accent);
		text-decoration: none;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.cta-btn:hover {
		background: var(--color-accent);
		color: var(--color-bg);
	}

	/* Prayer invite */
	.blessing-invite {
		font-size: 0.9rem;
		color: var(--color-subtle);
		text-align: center;
		margin-top: 1rem;
		margin-bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.blessing-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 3px;
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--color-subtle);
		transition: color 150ms ease;
		padding: 0;
		flex-shrink: 0;
	}

	.blessing-trigger:hover {
		color: var(--color-accent);
	}

	/* Blessing modal */
	.blessing-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9000;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		animation: blessing-backdrop-in 180ms ease both;
	}

	@keyframes blessing-backdrop-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.blessing-panel {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		box-shadow:
			0 8px 24px -4px rgba(0, 0, 0, 0.2),
			0 2px 8px -2px rgba(0, 0, 0, 0.12);
		width: 100%;
		max-width: 480px;
		padding: 32px 36px 28px;
		animation: blessing-panel-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@keyframes blessing-panel-in {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.blessing-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.blessing-eyebrow {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.22em;
		color: var(--color-accent-text);
	}

	.blessing-cross {
		font-size: 13px;
		color: var(--color-accent);
	}

	.blessing-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 3px;
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--color-subtle);
		transition: color 150ms ease;
		padding: 0;
	}

	.blessing-close:hover {
		color: var(--color-text);
	}

	.blessing-title {
		font-family: var(--font-reader);
		font-size: 1.45rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--color-heading, var(--color-text));
		margin: 0 0 20px;
		line-height: 1.2;
	}

	.blessing-body {
		font-family: var(--font-reader);
		font-size: 0.97rem;
		line-height: 1.8;
		color: var(--color-text);
	}

	.blessing-body p {
		margin: 0 0 14px;
	}

	.blessing-body p:last-child {
		margin-bottom: 0;
		color: var(--color-accent-text);
		font-size: 0.93rem;
	}

	@media (max-width: 560px) {
		.blessing-panel {
			padding: 24px 20px 20px;
		}
	}

	.laus-deo {
		margin-top: 2.5rem;
		text-align: center;
		color: var(--color-accent-text);
		font-size: 1.5rem;
		letter-spacing: 0.06em;
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-number {
			font-size: 2rem;
		}

		.facsimile-card {
			padding: 16px;
			gap: 12px;
		}

		.screenshot-row {
			grid-template-columns: 1fr;
		}
	}
</style>
