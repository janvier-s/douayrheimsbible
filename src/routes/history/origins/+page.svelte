<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	const ORIGINS_FAQ = [
		{
			q: 'Where was the Douay-Rheims Bible translated?',
			a: 'The New Testament was translated and published at Rheims (modern Reims) in northern France in 1582, while the English College was residing there temporarily. The Old Testament was completed and published at Douai in 1609 and 1610, giving the translation its composite name.'
		},
		{
			q: 'Why did Catholic scholars translate the Bible in exile?',
			a: 'The English Reformation made the practice of Catholicism illegal in England. The English College at Douai was founded by William Allen in 1568 to train priests for the English mission. Translation of the Bible was part of that mission: Catholics in England needed Scripture in their own language but had only Protestant translations available to them.'
		},
		{
			q: 'Who was Gregory Martin?',
			a: "Gregory Martin (c. 1542-1582) was an Oxford-trained scholar and a founding student of St John's College alongside Saint Edmund Campion. He joined the English College at Douai and undertook the entire Bible translation (approximately two chapters per day), completing the draft around 1580. He died of tuberculosis in October 1582, the same year the New Testament appeared."
		},
		{
			q: 'How long did it take to translate the Douay-Rheims Bible?',
			a: 'Gregory Martin began translating in October 1578 and completed the draft of the entire Bible by around July 1580, roughly twenty months. Publication was delayed by funding difficulties: the New Testament appeared in 1582, but the Old Testament was not printed until 1609-1610.'
		}
	];
</script>

<svelte:head>
	<title>Origins of the Douay-Rheims Bible: English College Douai</title>
	<meta
		name="description"
		content="English scholars at Douai produced the first Catholic English Bible. Martin translated it in under two years; the Old Testament took 27 more years to print."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/history/origins" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="The Origins of the Douay-Rheims Bible" />
	<meta
		property="og:description"
		content="How English Catholics in exile at Douai and Rheims produced the first complete Catholic English Bible between 1578 and 1610."
	/>
	<meta property="og:url" content="https://thedouayrheims.com/history/origins" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="Born in Exile: The Origins of the Douay-Rheims Bible"
	subtitle="How a community of English Catholic exiles, driven from their homeland by persecution, produced the first complete English Catholic translation of Sacred Scripture."
	faqItems={ORIGINS_FAQ}
	datePublished="2024-01-01"
>
	<h2>The English Reformation</h2>

	<p>
		The origins of the Douay-Rheims Bible lie in the English Reformation's most disruptive
		consequence: the permanent exile of English Catholic scholars from their own country. When the
		Acts of Supremacy and Uniformity made the practice of Catholicism illegal in England, the men
		who would produce this translation had to leave. Their destination was the European continent,
		and their mission was to keep the Catholic faith alive among the English.
	</p>

	<p>
		The consequences for Catholics who refused to conform were severe. Recusancy (the refusal to
		attend Church of England services) brought heavy fines and imprisonment. Functioning as a
		Catholic priest in England constituted legal high treason, punishable by execution. By the end
		of Elizabeth's reign in 1603, an estimated two hundred Catholics had been put to death for their
		faith.
	</p>

	<h2>The English College at Douai</h2>

	<figure class="article-figure article-figure--float">
		<img
			src="/images/history/cardinal-allen.webp"
			alt="Portrait of Cardinal William Allen (1532–1594), founder of the English College at Douai"
			width="400"
			height="448"
			loading="lazy"
		/>
		<figcaption>Cardinal William Allen (1532–1594)</figcaption>
	</figure>

	<p>
		It was against this backdrop that <a
			href="https://en.wikipedia.org/wiki/William_Allen_(cardinal)">William Allen</a
		>, a former Fellow of Oriel College, Oxford, conceived a plan to preserve English Catholic
		scholarship and train priests for the dangerous mission of ministering to Catholics in England.
		On 29 September 1568, he founded the
		<a href="https://en.wikipedia.org/wiki/English_College,_Douai">English College</a> at the University
		of Douai in the Spanish Netherlands (now northern France).
	</p>

	<p>
		The college became the intellectual heart of English Catholicism in exile. It attracted a
		remarkable concentration of Oxford-educated scholars who had left England rather than conform to
		the new religious settlement. Over the course of its existence, the college sent more than three
		hundred priests back to England, knowing that capture likely meant death. Approximately one
		hundred and sixty of these missionaries were executed, becoming known as the Douai Martyrs. The
		first to die was Cuthbert Mayne, put to death in 1577.
	</p>

	<figure class="article-figure">
		<picture>
			<source
				srcset="/images/history/english-college-douai-800.webp 800w, /images/history/english-college-douai-400.webp 400w"
				type="image/webp"
			/>
			<img
				src="/images/history/english-college-douai-800.webp"
				alt="Engraving of the English College at Douai, founded 1568"
				width="800"
				height="551"
				loading="lazy"
			/>
		</picture>
		<figcaption>
			The English College at Douai, founded 1568, where English Catholic scholars gathered in exile
		</figcaption>
	</figure>

	<h2>Gregory Martin and the Translation</h2>

	<figure class="article-figure article-figure--float">
		<img
			src="/images/history/gregory-martin.webp"
			alt="Portrait of Gregory Martin (c. 1542–1582), principal translator of the Douay-Rheims Bible"
			width="320"
			height="414"
			loading="lazy"
		/>
		<figcaption>Gregory Martin (c. 1542–1582)</figcaption>
	</figure>

	<p>
		Among the scholars who gathered at Douai was
		<a href="https://en.wikipedia.org/wiki/Gregory_Martin_(scholar)">Gregory Martin</a> (c. 1542–1582),
		one of the original students at St John's College, Oxford, and a close friend of Saint Edmund Campion.
		Martin arrived at the college in 1570, was ordained in 1573, and spent two years helping to establish
		the English College in Rome before returning to the continent.
	</p>

	<p>
		In 1578, political unrest in the Low Countries forced the college to relocate temporarily to
		Rheims. It was here, in October 1578, that Martin began his monumental work of translating the
		entire Bible from the Latin Vulgate into English. Working with extraordinary discipline,
		translating roughly two chapters each day, he is believed to have completed the entire text by
		July 1580, a span of less than two years.
	</p>

	<p>
		For the theology behind that choice, see <a href="/history/translation-philosophy"
			>A Translation from the Authentic Latin</a
		>.
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
		from Douai: <a href="/odr/genesis/1">Genesis</a> through Job in 1609, and
		<a href="/odr/psalms/1">Psalms</a> through 2 Maccabees (together with the apocryphal books) in 1610.
		By this time the college had returned to Douai from Rheims, which is why the complete work bears the
		names of both cities.
	</p>

	<h2>Reception and Legacy</h2>

	<p>
		The completed Douay-Rheims Bible entered a hostile environment. In England, possessing it was a
		criminal offense. Yet its influence extended beyond Catholic circles. The translators of the
		King James Version, published just one year after the Douai Old Testament in 1611, acknowledged
		the Rheims New Testament in their preface and drew upon it significantly. Scholarship has shown
		that roughly a quarter of the proposed revisions to the Gospels in the KJV adopted readings from
		the Rheims text.
	</p>

	<p>
		The Douay-Rheims remained the sole authorized English Bible for Catholics for over three
		centuries. In the mid-eighteenth century, Bishop Richard Challoner would undertake a
		<a href="/history/challoner">substantial revision</a> that made the text more accessible to contemporary
		readers, though at the cost of much of Martin's distinctive Latinate character.
	</p>

	<p>
		The text presented on this site is Martin's original, as it appeared in 1582 and 1609–1610, with
		only light modernisation of spelling and punctuation. It is a monument to the faith and
		scholarship of a community that risked everything to preserve the word of God in English.
	</p>

	<h2>The Delay</h2>

	<p>
		The interval between the New Testament's appearance in 1582 and the Old Testament's publication
		in 1609-1610 was not a gap in translation but a gap in funding. Gregory Martin completed his
		draft of the entire Bible, both Testaments, by around July 1580. The New Testament was ready for
		the press at Rheims shortly afterward. The Old Testament waited.
	</p>

	<p>
		The English College had moved from Douai to Rheims in 1578 under pressure from the Spanish
		authorities who governed the southern Netherlands; it returned to Douai in 1593, after the
		political climate shifted. These moves consumed resources and administrative energy that might
		otherwise have supported publication. The death of William Allen in 1594 removed the figure who
		had driven the original project. The Old Testament manuscripts were carried between cities and
		eventually prepared for the press by Thomas Worthington, who had become president of the English
		College. He saw them through publication in 1609 and 1610.
	</p>

	<p>
		The twenty-seven-year gap therefore reflects the material conditions of a community in exile:
		the cost of printing, the disruptions of repeated relocation, and the deaths of the men who had
		initiated the work. Gregory Martin himself, the translator who had produced the entire text,
		died on 28 October 1582, the same year his New Testament appeared and more than a
		quarter-century before his Old Testament followed. For the full story of what happened to this
		translation after publication, read <a href="/history/challoner">The Challoner Revision</a>.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Rev. Henry Cotton, <em
				>Rhemes and Doway: An Attempt to Shew What Has Been Done by Roman Catholics for the
				Diffusion of the Holy Scriptures in English</em
			> (Oxford University Press, 1855)
		</li>
		<li>
			Henry Barker, <em
				>English Bible Versions: A Tercentenary Memorial of the King James Version</em
			>
		</li>
		<li>
			Cardinal John Henry Newman, <q>On the Rheims and Douay Version of Holy Scripture,</q> in
			<em>Essays Critical and Historical</em>
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history">← History of the Douay-Rheims Bible</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/history/translation-philosophy">A Translation from the Authentic Latin →</a>
	</p>
</ProseLayout>
