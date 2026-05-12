<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import { ABOUT_NAV } from './nav';
</script>

<svelte:head>
	<title>About This Website · The Original Douay-Rheims Bible</title>
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
	navItems={ABOUT_NAV}
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

	<hr />
	<p>
		<a href="/about/features">Features →</a>
	</p>
</ProseLayout>

<style>
	/* Genesis comparison (used in Translation section) */
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

	/* Screenshots (used in Translation section) */
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

	/* Facsimile card (used in Translation section) */
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

	/* License block (used in Translation section) */
	.license-block {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 20px 24px;
		margin: 28px 0;
		background: color-mix(in srgb, var(--color-border) 30%, transparent);
	}

	.license-title {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: var(--color-accent-text);
		margin: 0 0 8px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.license-cross {
		color: var(--color-accent);
	}

	.license-body {
		font-family: var(--font-reader);
		font-size: var(--font-size-reader);
		line-height: var(--line-height-reader);
		color: var(--color-text);
		margin: 0 0 12px;
	}

	.license-link {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-accent-text);
		text-decoration: none;
		letter-spacing: 0.04em;
	}

	.license-link:hover {
		color: var(--color-accent);
	}

	/* Closing (A Simple Idea) */
	.intercession {
		margin-top: 2rem;
		text-align: center;
		color: var(--color-subtle);
		font-size: 0.9rem;
		font-style: italic;
		letter-spacing: 0.03em;
	}

	.laus-deo {
		margin-top: 2.5rem;
		text-align: center;
		color: var(--color-accent-text);
		font-size: 1.5rem;
		letter-spacing: 0.06em;
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

	@media (max-width: 640px) {
		.screenshot-row {
			grid-template-columns: 1fr;
		}

		.facsimile-card {
			padding: 16px;
			gap: 12px;
		}
	}
</style>
