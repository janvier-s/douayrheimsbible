<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	const ABOUT_FAQ = [
		{
			q: 'What is the Douay-Rheims Bible?',
			a: 'The Douay-Rheims Bible is the first complete English Catholic translation of Sacred Scripture, produced between 1582 and 1610 by English scholars living in exile in France and the Spanish Netherlands. It was translated primarily by Gregory Martin from the Latin Vulgate, with revisions by William Allen and Richard Bristow. It predates the King James Bible by nearly three decades.'
		},
		{
			q: 'Is the Douay-Rheims Bible still used by Catholics today?',
			a: 'The Douay-Rheims remains in use by traditional Catholics who prefer a formal-equivalence translation that preserves the theological vocabulary of the Latin Vulgate. It is not the official lectionary Bible used at Mass, but it is widely read for private study and prayer.'
		},
		{
			q: 'How is the Douay-Rheims different from other English Bible translations?',
			a: 'The Douay-Rheims is distinctive in three ways: it was translated from the Latin Vulgate rather than directly from the Hebrew and Greek; it preserves many Latinate theological terms such as "longsuffering," "supersubstantial," and "penance" that other translations render more loosely; and it reflects the doctrinal tradition of the Catholic Church through both its translation choices and its extensive annotations.'
		},
		{
			q: 'Which version of the Douay-Rheims is presented on this site?',
			a: "This site presents the original pre-Challoner text as first published in 1582 (New Testament) and 1609-1610 (Old Testament). Most printed Douay-Rheims Bibles today are Bishop Challoner's eighteenth-century revision, which altered the text so extensively that Cardinal Newman called it nearly a new translation. This site restores Gregory Martin's original."
		}
	];
</script>

<svelte:head>
	<title>About the Douay-Rheims Bible: English Catholic Scripture, 1582-1610</title>
	<meta
		name="description"
		content="The Douay-Rheims Bible is the first complete English Catholic translation of Sacred Scripture, translated by Gregory Martin from the Latin Vulgate. This site presents the original pre-Challoner text of 1582 and 1609-1610."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/history/about" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="About the Douay-Rheims Bible" />
	<meta
		property="og:description"
		content="The first complete English Catholic translation of Sacred Scripture, faithfully rendered from the Latin Vulgate by English scholars in exile."
	/>
	<meta property="og:url" content="https://thedouayrheims.com/history/about" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="About the Douay-Rheims Bible"
	subtitle="The first complete English Catholic translation of Sacred Scripture, rendered faithfully from the Latin Vulgate by English scholars in exile."
	faqItems={ABOUT_FAQ}
	datePublished="2024-01-01"
>
	<h2>What Is the Douay-Rheims Bible?</h2>

	<p>
		The Douay-Rheims Bible is the earliest complete English translation of the Bible produced by
		Catholic scholars. It was created by a group of former Oxford men living in exile on the
		European continent during the English Reformation, when the practice of the Catholic faith in
		England had been made illegal and possession of Catholic texts was a criminal offence.
	</p>

	<p>
		The New Testament was published in 1582 at Rheims in northern France, and the Old Testament
		followed in two volumes from Douai (then in the Spanish Netherlands) in 1609 and 1610. The
		complete work therefore predates the King James Version of 1611 by several decades.
	</p>

	<h2>The Translators</h2>

	<p>
		The principal translator was Gregory Martin, a distinguished scholar who had been among the
		first cohort of students at St John's College, Oxford, alongside his close friend Saint Edmund
		Campion, who would later be martyred for the faith. Martin began translating in October 1578,
		working at a pace of roughly two chapters per day, and is believed to have completed the entire
		Bible by around July 1580, an extraordinary feat of sustained scholarship.
	</p>

	<p>
		His work was proofread and revised by William Allen, the founder of the English College at
		Douai, together with Richard Bristow and Thomas Worthington, who also prepared the extensive
		theological annotations that accompanied the text. Martin did not live to see his Old Testament
		published. He died of tuberculosis on 28 October 1582, the same year the New Testament appeared,
		at approximately forty years of age.
	</p>

	<h2>The Source Text</h2>

	<p>
		The translators worked from the Latin Vulgate, the ancient Latin translation that the Council of
		Trent had declared the authoritative text for Catholic use. They also consulted the original
		Hebrew and Greek manuscripts for accuracy. This approach gave the translation a distinctively
		Latinate vocabulary, with words like <em>supersubstantial</em>, <em>longanimity</em>, and
		<em>benignity</em> appearing throughout. The
		<a href="https://en.wikisource.org/wiki/Catholic_Encyclopedia_(1913)/Douay_Bible"
			>Catholic Encyclopedia (1913)</a
		> described the result as "so full of Latinisms as to be in places hardly intelligible." The translators
		included a glossary to explain these terms, acknowledging the difficulty.
	</p>

	<p>
		The translators did not work from a single Greek manuscript tradition. In places their Vulgate
		source preserves readings that align with older manuscript families. For example, at James 2:20,
		the original Douay-Rheims reads "idle" (from the Greek <em>arge</em>), a reading found in the
		Codex Amiatinus, rather than "dead" (<em>nekra</em>) found in Erasmus's Textus Receptus and most
		Protestant translations.
	</p>

	<h2>Why It Was Created</h2>

	<p>
		By the late sixteenth century, several Protestant English translations of the Bible were already
		in circulation, including the Geneva Bible and the Bishops' Bible. Catholic scholars recognised
		the need for an English translation that was doctrinally sound, theologically precise, and
		faithful to the Vulgate tradition, one that could serve English-speaking Catholics who were
		increasingly cut off from Latin liturgical texts.
	</p>

	<p>
		The extensive annotations were designed not merely as commentary but as a direct response to the
		theological arguments of the Reformers, addressing points of doctrinal controversy verse by
		verse. The translators themselves stated their purpose was, in part, for "the more speedy
		abolishing of a number of false and impious translations."
	</p>

	<p>
		The completed Bible was illegal to own in England, and many copies were destroyed. It
		nonetheless remained the only Bible for English-speaking Catholics who could not read Latin, and
		its influence would prove far-reaching.
	</p>

	<h2>Influence on the King James Version</h2>

	<p>
		The translators of the King James Version (1611) explicitly acknowledged the Rheims New
		Testament in their preface, and scholarship has demonstrated that they drew upon it
		significantly. Research by Ward Allen in 1969 found that in the revision of the Gospels, roughly
		one quarter of the proposed amendments adopted readings from the Rheims text. The Rheims
		translation was made widely available to Protestant scholars through William Fulke's 1589
		parallel edition, which printed both texts side by side. Fulke intended this as a refutation,
		but it served instead as a convenient reference for the KJV committee. Saint John Henry Newman
		later observed that the relationship between the two translations was closer than either
		tradition liked to acknowledge.
	</p>

	<h2>Catholic Significance</h2>

	<p>
		For centuries, the Douay-Rheims served as the only authorised English Bible for Roman Catholics.
		It remained the standard text for English-speaking Catholics until the mid-twentieth century,
		when Pope Pius XII's 1943 encyclical <em>Divino Afflante Spiritu</em> opened the way for vernacular
		translations from the original Hebrew and Greek.
	</p>

	<h2>The Text on This Site</h2>

	<p>
		This site presents the original pre-Challoner text of the Douay-Rheims Bible, as first published
		in 1582 and 1609-1610. Nearly every "Douay-Rheims Bible" in print today is actually Bishop
		Challoner's mid-eighteenth-century revision, which altered the text so extensively that Cardinal
		Newman observed the changes "almost amounted to a new translation." The original text is
		significantly more Latinate in its vocabulary and closer to the Vulgate in its phrasing.
		Spelling and punctuation have been lightly modernised, but the translation itself is unaltered.
	</p>

	<p>
		To understand what Bishop Challoner changed and why, see
		<a href="/history/challoner">The Challoner Revision</a>. For the full story of how this
		translation came to exist, read on.
	</p>

	<hr />

	<p><a href="/history/origins">Born in Exile: The Origins of the Douay-Rheims Bible →</a></p>
</ProseLayout>
