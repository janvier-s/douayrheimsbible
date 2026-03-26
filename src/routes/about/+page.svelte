<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;
</script>

<svelte:head>
	<title>About the Douay-Rheims Bible — English Catholic Scripture, 1582–1610</title>
	<meta
		name="description"
		content="The Douay-Rheims Bible is the first complete English Catholic translation of Sacred Scripture, rendered from the Latin Vulgate by English exiles at Douai and Rheims between 1582 and 1610."
	/>
	<link rel="canonical" href="https://douayrheimsbible.pages.dev/about" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="About the Douay-Rheims Bible" />
	<meta
		property="og:description"
		content="The first complete English Catholic translation of Sacred Scripture, faithfully rendered from the Latin Vulgate by English scholars in exile."
	/>
	<meta property="og:url" content="https://douayrheimsbible.pages.dev/about" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="About the Douay-Rheims Bible"
	subtitle="The first complete English Catholic translation of Sacred Scripture, rendered faithfully from the Latin Vulgate by English scholars in exile."
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
		first cohort of students at St John's College, Oxford, alongside his close friend Edmund
		Campion, who would later be martyred for the faith. Martin began translating in October 1578,
		working at a pace of roughly two chapters per day, and is believed to have completed the entire
		Bible by around July 1580 — an extraordinary feat of sustained scholarship.
	</p>

	<p>
		His work was proofread and revised by William Allen, the founder of the English College at
		Douai, together with Richard Bristow and Thomas Worthington, who also prepared the extensive
		theological annotations that accompanied the text. Martin himself did not live to see his Old
		Testament published — he died of tuberculosis on 28 October 1582, the same year the New
		Testament appeared, at approximately forty years of age.
	</p>

	<h2>The Source Text</h2>

	<p>
		The translators worked from the Latin Vulgate, the ancient Latin translation that the Council of
		Trent had declared the authoritative text for Catholic use. They also consulted the original
		Hebrew and Greek manuscripts for accuracy. This approach gave the translation a distinctively
		Latinate vocabulary — words like <em>supersubstantial</em>, <em>longanimity</em>, and
		<em>benignity</em> — which, while theologically precise, could make the text challenging for casual
		readers. The translators included a glossary to explain these terms.
	</p>

	<p>
		The translators did not work from a single Greek manuscript tradition. In places their Vulgate
		source preserves readings that align with older manuscript families — for example, at James
		2:20, the original Douay-Rheims reads "idle" (from the Greek <em>arge</em>), a reading found in
		the Codex Amiatinus, rather than "dead" (<em>nekra</em>) as found in Erasmus's Textus Receptus
		and most Protestant translations.
	</p>

	<h2>Why It Was Created</h2>

	<p>
		By the late sixteenth century, several Protestant English translations of the Bible were already
		in circulation, including the Geneva Bible and the Bishops' Bible. Catholic scholars recognised
		the need for an English translation that was doctrinally sound, theologically precise, and
		faithful to the Vulgate tradition — one that could serve English-speaking Catholics who were
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
		parallel edition, which printed both texts side by side — ironically intended as a refutation
		but serving instead as a convenient reference.
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
		in 1582 and 1609–1610. This is not the more commonly encountered Challoner revision of the
		mid-eighteenth century, which altered the text so extensively that Cardinal Newman observed the
		changes "almost amounted to a new translation." The original text is significantly more Latinate
		in its vocabulary and closer to the Vulgate in its phrasing. Spelling and punctuation have been
		lightly modernised, but the translation itself is unaltered.
	</p>

	<p>
		To understand what Bishop Challoner changed and why, see
		<a href="/challoner-revision">The Challoner Revision</a>. For the full story of how this
		translation came to exist, see <a href="/history">History of the Douay-Rheims Bible</a>.
	</p>

	<hr />

	<p>
		<a href="/odr/genesis/1">Begin reading in Genesis →</a>
	</p>
</ProseLayout>

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>
