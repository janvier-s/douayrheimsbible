<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	const FAQ = [
		{
			q: 'Why did the Catholic Church move away from the Latin Vulgate as its translation source?',
			a: "Pope Pius XII's 1943 encyclical Divino Afflante Spiritu authorized Catholic scholars to translate from the original Hebrew and Greek manuscripts, a shift that had been resisted for centuries. The encyclical recognized that advances in textual scholarship — ancient manuscripts unavailable to Jerome, improved Greek and Hebrew scholarship — made original-language translation more accurate, not less reverent."
		},
		{
			q: 'What is the Clementine Vulgate?',
			a: "The Clementine Vulgate is the standard edition of the Latin Vulgate published in 1592 under Pope Clement VIII, following the Council of Trent's mandate for an authoritative Latin text. It became the normative text for Catholic use for over three centuries and was the edition against which the Challoner revision of the Douay-Rheims was checked."
		},
		{
			q: 'Is the Latin Vulgate still used in the Catholic Church?',
			a: 'The Vulgate remains the official Latin text of the Catholic Church. The Nova Vulgata (New Vulgate), published in 1979, is a revised edition the Church uses for official Latin liturgical texts. However, vernacular translations for pastoral use are now typically made from the original Hebrew and Greek rather than from the Latin.'
		}
	];
</script>

<svelte:head>
	<title
		>From the Authentic Latin to the Original Tongues: Catholic Bible Translation After Trent</title
	>
	<meta
		name="description"
		content="How the Catholic Church moved, over four centuries, from requiring the Vulgate as the basis for all translation to mandating direct use of the Hebrew and Greek originals, from Trent to Divino Afflante Spiritu to Liturgiam Authenticam."
	/>
	<link rel="canonical" href="https://douayrheimsbible.net/history/original-tongues" />
	<meta property="og:type" content="article" />
	<meta
		property="og:title"
		content="From the Authentic Latin to the Original Tongues: Catholic Bible Translation After Trent"
	/>
	<meta
		property="og:description"
		content="How the Church moved from requiring the Vulgate as the basis for all translation to mandating direct use of the Hebrew and Greek originals."
	/>
	<meta property="og:url" content="https://douayrheimsbible.net/history/original-tongues" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="From the Authentic Latin to the Original Tongues"
	subtitle="How the Church moved, over four centuries, from requiring the Vulgate as the basis for all translation to mandating direct use of the Hebrew and Greek originals."
	faqItems={FAQ}
>
	<h2>What Trent Actually Said</h2>

	<p>
		The Council of Trent, in its fourth session in 1546, issued a decree that would govern Catholic
		biblical translation for nearly four hundred years. It declared that the Vulgate, long used
		throughout the Western Church, was to be held "as authentic" for "public readings, discourses,
		disputations, preachings, and explanations."
	</p>

	<p>
		This was a practical judgment, not a claim of textual perfection. The Council fathers were not
		declaring Saint Jerome's Latin superior to the Hebrew and Greek from which it was translated.
		The decree said as much: the Vulgate was declared authentic "without depreciating the Hebrew or
		the Septuagint or any other version then in circulation." Its authority was what later
		theologians would call juridical rather than critical. The Vulgate was the established, approved
		standard for the Latin Church, the text on which centuries of liturgy, preaching, and
		theological argument had been built. That history gave it a settled, practical authority for the
		life of the Western Church. The Council confirmed that authority; it did not pronounce on
		questions of textual scholarship.
	</p>

	<p>
		The Douay-Rheims translation, produced by Gregory Martin and his colleagues in the 1580s and
		finished in 1610, embodied this principle with unusual rigor. Their translation followed the
		Vulgate word for word wherever possible, preserving Saint Jerome's Latin in English with a
		literalism that prioritized theological precision over readability. The Challoner revision and
		the long succession of editions that followed all worked from the same base. For nearly three
		centuries after Trent, no authorized Catholic translation in English worked directly from the
		Hebrew or Greek.
	</p>

	<h2>The Nineteenth-Century Opening</h2>

	<p>
		The first significant movement came in 1893, when Leo XIII issued the encyclical
		<em>Providentissimus Deus</em>. Addressed to the challenges that historical and philological
		criticism had raised for Catholic readers, it encouraged Catholic scholars to learn Hebrew,
		Greek, and related languages, to familiarize themselves with the tools of modern textual
		criticism, and to bring scholarly rigor to their work with Scripture.
	</p>

	<p>
		The encyclical did not change the translation requirement. Catholic versions were still expected
		to be made from the Vulgate. But Leo's encouragement of original-language study set something in
		motion. A generation of Catholic scholars grew up learning to work with Hebrew and Greek
		manuscripts, and they eventually produced the case for a more fundamental change. Individual
		Catholic translators had already begun to test the limits: John Lingard's translation of the
		Four Gospels in 1836 worked directly from the Greek, as did Fr. Francis Spencer's complete New
		Testament in 1937, the first by a Catholic in English from the Greek original. These were
		scholarly ventures ahead of official sanction, but they demonstrated what was possible.
	</p>

	<figure class="article-figure">
		<div
			class="article-figure-placeholder"
			data-label="Portrait of Pope Pius XII, or opening page of the encyclical Divino Afflante Spiritu (September 30, 1943)"
		></div>
		<figcaption>
			Pope Pius XII, whose encyclical <em>Divino Afflante Spiritu</em> (1943) authorized Catholic scholars
			to translate Scripture from the original Hebrew and Greek
		</figcaption>
	</figure>

	<h2>Divino Afflante Spiritu (1943)</h2>

	<p>
		On September 30, 1943, the feast of Saint Jerome, Pope Pius XII issued <em
			>Divino Afflante Spiritu</em
		>. It marked the fiftieth anniversary of <em>Providentissimus Deus</em>, and it completed what
		Leo XIII had begun.
	</p>

	<p>
		The encyclical authorized and encouraged Catholic scholars to translate directly from the
		original languages. Its reasoning was explicit: "the original text which was written by the
		inspired author himself and has more authority and greater weight than any, even the very best,
		translation" was what interpreters ought to explain. The Vulgate had acquired "long use in the
		Church" and the force of ecclesiastical approval. But Trent's decree of authenticity, Pius XII
		clarified, was juridical in character. It established the Vulgate's authority for official
		Church use, for readings and disputations in the Latin Church. It settled no question in textual
		criticism.
	</p>

	<p>
		This clarification mattered considerably. For four centuries, Trent's "authentic" had sometimes
		been read as a declaration of textual superiority, a claim that the Vulgate preserved the
		inspired text more faithfully than the surviving Hebrew and Greek manuscripts. Pius XII
		corrected that reading. The Council fathers had made a practical decision about which text the
		Latin Church would use in its public life. What they had not done was pronounce on the relative
		accuracy of the Latin, Greek, and Hebrew traditions as witnesses to the inspired originals.
	</p>

	<p>
		Catholic translators, <em>Divino Afflante Spiritu</em> made clear, should now work where their
		scholarship could reach most deeply: from the texts as the inspired writers composed them. The
		biblical scholar Raymond Brown later described the encyclical as a
		<q>Magna Carta for biblical progress.</q>
	</p>

	<h2>The Translations That Followed</h2>

	<p>
		The years after 1943 saw a rapid expansion of Catholic original-language scholarship. Ronald
		Knox's translation, completed in 1949, was a significant exception: Knox translated from the
		Vulgate, producing an elegant literary rendering that he described as a "rendering" rather than
		a strictly scholarly translation. It showed that the Vulgate tradition could still produce
		distinguished work in English. But it was also, as the decades confirmed, a late flowering of
		that tradition.
	</p>

	<p>
		The Jerusalem Bible, published in French in 1956 and in English in 1966, was made directly from
		the Hebrew and Greek, drawing on the scholarship of the École Biblique in Jerusalem. The New
		American Bible followed in 1970, produced by the Catholic Biblical Association working from
		original texts. The Second Vatican Council's constitution on divine revelation,
		<em>Dei Verbum</em> (1965), had in the meantime affirmed the direction
		<em>Divino Afflante Spiritu</em> had set, calling for <q>suitable and correct translations</q> made
		"from the original texts of the sacred books" and encouraging scholarly cooperation across confessional
		lines in producing them. These translations marked the practical completion of the shift the 1943
		encyclical had authorized.
	</p>

	<h2>Liturgiam Authenticam (2001)</h2>

	<p>
		In 2001, Pope Saint John Paul II's instruction <em>Liturgiam Authenticam</em> made the
		requirement explicit and binding. New liturgical translations were to be made "directly from the
		original texts" in Hebrew, Aramaic, or Greek. The <em>Nova Vulgata</em>, a revised Latin edition
		completed in 1979, was designated as an "auxiliary tool," useful for confirming canonical verses
		and maintaining continuity with Latin liturgical tradition, but no longer the translation base.
	</p>

	<p>
		The Vulgate remained what it had always been: the liturgical text of the Latin Rite, a monument
		to Saint Jerome's scholarship, and the medium through which Western Christianity had read and
		prayed with Scripture for over a thousand years. What changed was its role in the production of
		new translations. The Church's judgment, confirmed over a century of encyclicals and conciliar
		documents, was that translators should begin with the texts as God's human authors wrote them.
	</p>

	<h2>The Douay-Rheims in This History</h2>

	<p>
		The Douay-Rheims Bible stands at the beginning of this story, not its end. It was produced at
		the moment when Trent's decree was still new and its implications still being worked out, by
		scholars whose philosophical commitment to the Vulgate ran deeper than any institutional
		requirement. Gregory Martin and his colleagues at Rheims believed, with considerable
		justification, that the Latinate texture of Saint Jerome's translation conveyed theological
		meaning that more idiomatic English would lose. Their literalism was a considered choice as much
		as a constraint.
	</p>

	<p>
		The text presented on this site is that original translation, produced in exile and published
		between 1582 and 1610, with only light modernization of spelling. It represents a particular
		moment in the history of Catholic biblical scholarship: the fullest expression in English of the
		principle that fidelity to the Vulgate and fidelity to Scripture were, within the terms of
		Trent's decree, the same thing. The Church has since made clear that the inspired texts are the
		Hebrew, Aramaic, and Greek originals, and that translators should work from those sources. That
		development does not diminish what Martin and his colleagues produced. It locates their work in
		its proper historical context, as the defining achievement of a tradition that ran from Saint
		Jerome's Latin to the English of the Reformation era and shaped Catholic worship and scholarship
		for four centuries.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Council of Trent, Session IV, <em>Decree Concerning the Canonical Scriptures</em> (1546)
		</li>
		<li>Pope Leo XIII, <em>Providentissimus Deus</em> (1893)</li>
		<li>
			Pope Pius XII, <em>Divino Afflante Spiritu</em> (1943) — primary source for the encyclical's argument
			and the clarification of Trent's "authentic"
		</li>
		<li>Second Vatican Council, <em>Dei Verbum</em> (1965)</li>
		<li>Pope Saint John Paul II, <em>Liturgiam Authenticam</em> (2001)</li>
		<li>
			Raymond E. Brown, cited in scholarship on <em>Divino Afflante Spiritu</em> — "Magna Carta for biblical
			progress"
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history/america">← The Douay-Rheims in America</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/history/scripture-for-all">A Bible Open to All →</a>
	</p>
</ProseLayout>

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>
