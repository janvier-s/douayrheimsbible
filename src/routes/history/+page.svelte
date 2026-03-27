<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;
</script>

<svelte:head>
	<title>History of the Douay-Rheims Bible: From Exile to Scripture</title>
	<meta
		name="description"
		content="How English Catholic scholars in exile during the Reformation produced the first complete English Catholic Bible, from the founding of the English College at Douai in 1568 to the publication of the complete Bible in 1610."
	/>
	<link rel="canonical" href="https://douayrheimsbible.pages.dev/history" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="History of the Douay-Rheims Bible" />
	<meta
		property="og:description"
		content="How English Catholic scholars in exile produced the first complete English Catholic Bible."
	/>
	<meta property="og:url" content="https://douayrheimsbible.pages.dev/history" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="History of the Douay-Rheims Bible"
	subtitle="How a community of English Catholic exiles, driven from their homeland by persecution, produced the first complete English Catholic translation of Sacred Scripture."
>
	<h2>The English Reformation</h2>

	<p>
		In 1534, Henry VIII severed England's ties with Rome through the Act of Supremacy, declaring
		himself head of the Church in England. What followed was a sustained campaign of religious
		transformation that intensified under Edward VI and, after a brief Catholic restoration under
		Mary I, became permanent under Elizabeth I. The Elizabethan Act of Supremacy of 1559 and the
		subsequent penal laws criminalised Catholic worship, the celebration of Mass, and the priesthood
		itself.
	</p>

	<p>
		The consequences for Catholics who refused to conform were severe. Recusancy (the refusal to
		attend Church of England services) brought heavy fines and imprisonment. Functioning as a
		Catholic priest in England constituted legal high treason, punishable by execution. By the end
		of Elizabeth's reign in 1603, an estimated two hundred Catholics had been put to death for their
		faith.
	</p>

	<h2>The English College at Douai</h2>

	<p>
		It was against this backdrop that William Allen, a former Fellow of Oriel College, Oxford,
		conceived a plan to preserve English Catholic scholarship and train priests for the dangerous
		mission of ministering to Catholics in England. On 29 September 1568, he founded the English
		College at the University of Douai in the Spanish Netherlands (now northern France).
	</p>

	<p>
		The college became the intellectual heart of English Catholicism in exile. It attracted a
		remarkable concentration of Oxford-educated scholars who had left England rather than conform to
		the new religious settlement. Over the course of its existence, the college sent more than three
		hundred priests back to England, knowing that capture likely meant death. Approximately one
		hundred and sixty of these missionaries were executed, becoming known as the Douai Martyrs. The
		first to die was Cuthbert Mayne, put to death in 1577.
	</p>

	<h2>Gregory Martin and the Translation</h2>

	<p>
		Among the scholars who gathered at Douai was Gregory Martin, one of the original students at St
		John's College, Oxford, and a close friend of Edmund Campion. Martin arrived at the college in
		1570, was ordained in 1573, and spent two years helping to establish the English College in Rome
		before returning to the continent.
	</p>

	<p>
		In 1578, political unrest in the Low Countries forced the college to relocate temporarily to
		Rheims. It was here, in October 1578, that Martin began his monumental work of translating the
		entire Bible from the Latin Vulgate into English. Working with extraordinary discipline —
		translating roughly two chapters each day. He is believed to have completed the entire text by
		July 1580, a span of less than two years.
	</p>

	<p>
		His work was not solitary. Allen, together with Richard Bristow and Thomas Worthington, reviewed
		Martin's translation daily and prepared the extensive theological annotations that would
		accompany the text. These notes were not mere commentary; they were carefully argued responses
		to the doctrinal claims of the Protestant Reformers, addressing contested passages of Scripture
		point by point.
	</p>

	<h2>Publication</h2>

	<h3>The Rheims New Testament, 1582</h3>

	<p>
		The New Testament was published first, in 1582, while the college was still at Rheims. It
		appeared in quarto format in a print run of only a few hundred copies, accompanied by dense
		annotations. The text was distinctive for its heavily Latinate vocabulary, a deliberate choice
		reflecting the translators' fidelity to the Vulgate and their conviction that certain
		theological concepts were best expressed in terms closely derived from the Latin.
	</p>

	<p>
		Gregory Martin did not long survive his achievement. He had contracted tuberculosis, and died on
		28 October 1582, the same year his New Testament was published. He was approximately forty years
		old. William Allen delivered his funeral sermon. His tomb in Rheims was lost during the French
		Revolution.
	</p>

	<h3>The Douai Old Testament, 1609–1610</h3>

	<p>
		Although Martin had completed the Old Testament translation by 1580, financial difficulties
		prevented its publication for nearly three decades. It finally appeared in two quarto volumes
		from Douai: Genesis through Job in 1609, and Psalms through 2 Maccabees (together with the
		apocryphal books) in 1610. By this time the college had returned to Douai from Rheims, which is
		why the complete work bears the names of both cities.
	</p>

	<h2>Reception and Legacy</h2>

	<p>
		The completed Douay-Rheims Bible entered a hostile environment. In England, possessing it was a
		criminal offence. Yet its influence extended beyond Catholic circles. The translators of the
		King James Version, published just one year after the Douai Old Testament in 1611, acknowledged
		the Rheims New Testament in their preface and drew upon it significantly. Scholarship has shown
		that roughly a quarter of the proposed revisions to the Gospels in the KJV adopted readings from
		the Rheims text.
	</p>

	<p>
		The Douay-Rheims remained the sole authorised English Bible for Catholics for over three
		centuries. In the mid-eighteenth century, Bishop Richard Challoner would undertake a
		<a href="/challoner-revision">substantial revision</a> that made the text more accessible to contemporary
		readers, though at the cost of much of Martin's distinctive Latinate character.
	</p>

	<p>
		The text presented on this site is Martin's original, as it appeared in 1582 and 1609–1610, with
		only light modernisation of spelling and punctuation. It is a monument to the faith and
		scholarship of a community that risked everything to preserve the word of God in English.
	</p>

	<hr />

	<p>
		<a href="/about">← About the Douay-Rheims Bible</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/challoner-revision">The Challoner Revision →</a>
	</p>
</ProseLayout>

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>
