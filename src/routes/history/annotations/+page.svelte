<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	const FAQ = [
		{
			q: 'Why does the Douay-Rheims Bible have so many footnotes?',
			a: 'The annotations were a deliberate response to the Protestant Reformation. The translators knew their Bible would be read in the context of active religious controversy, and they designed the notes to defend Catholic doctrine verse by verse; they addressed specific Protestant arguments, explaining sacramental theology, and guiding readers through passages that Reformers had interpreted differently.'
		},
		{
			q: 'Who wrote the annotations in the Douay-Rheims Bible?',
			a: 'The notes were written primarily by Richard Bristow and Thomas Worthington, working alongside William Allen at the English College. Gregory Martin translated the text; the annotations were a collaborative editorial addition intended to make the translation useful for Catholic readers navigating Protestant arguments.'
		},
		{
			q: 'Are the Douay-Rheims annotations still available to read?',
			a: 'Bishop Challoner largely removed the original annotations in his eighteenth-century revision, which is why they survive primarily in scholarly editions of the original text. This site presents the original pre-Challoner text; readers interested in the full annotations should consult facsimile editions of the 1582 New Testament or the 1609-1610 Old Testament.'
		}
	];
</script>

<svelte:head>
	<title>Douay-Rheims Annotations: The 1582 Rheims New Testament</title>
	<meta
		name="description"
		content="The 1582 Douay-Rheims annotations defended Catholic doctrine verse by verse, provoked Protestant refutations, and gave KJV translators access to the text."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/history/annotations" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="Douay-Rheims Annotations: The 1582 Rheims New Testament" />
	<meta
		property="og:description"
		content="The scholarly annotations of the 1582 Rheims New Testament: their polemical purpose, their character, and their legacy."
	/>
	<meta property="og:url" content="https://thedouayrheims.com/history/annotations" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="A Bible of Arguments: The Annotations"
	subtitle="The notes that accompanied the Rheims New Testament were a sustained, scholarly engagement with Protestant readings of Scripture, and they changed everything about how the book was received."
	datePublished="2024-01-01"
	faqItems={FAQ}
>
	<h2>The Notes as Purpose</h2>

	<p>
		The Rheims New Testament arrived in 1582 in a quarto volume dense with annotations. They ran to
		hundreds of pages. They addressed Protestant translations point by point, passage by passage,
		doctrine by doctrine. Their purpose was stated on the title page itself: for "discoverie of the
		corruption of divers late Translations and for cleering the controversies in religion of these
		daies."
	</p>

	<p>
		The notes were a sustained, learned, and at times ferocious engagement with the entire
		Protestant reading of Scripture, mounted from positions of considerable scholarship by men who
		knew they were writing for an illegal book in a hostile country.
	</p>

	<h2>Their Character</h2>

	<figure class="article-figure">
		<a
			href="/images/history/rheims-annotations-full.webp"
			target="_blank"
			rel="noopener"
			class="article-figure-link"
		>
			<img
				src="/images/history/rheims-annotations.webp"
				alt="Page from the 1582 Rheims New Testament showing the Gospel text with dense theological annotations in the margins and below the text"
				width="400"
				height="562"
				loading="lazy"
			/>
		</a>
		<figcaption>
			A page from the 1582 Rheims New Testament, with theological annotations that often equalled or
			exceeded the biblical text in length
		</figcaption>
	</figure>

	<p>
		<a href="https://archive.org/details/rhemesanddoway00cottuoft">Henry Cotton</a> catalogued the volume
		with characteristic precision. The annotations, he wrote, were "vindicating the translation, fiercely
		asserting all the peculiar doctrines of the Court of Rome, and employing the most bitter and contumelious
		terms in speaking of Protestants, and their doctrines, and their versions of Scripture." Dr. Geddes,
		himself a Catholic priest, described them as "virulent Annotations against the Protestant Religion,
		and manifestly calculated to support a system, not of genuine Catholicity, but of transalpine Popery."
		The Protestant scholar Mombert called them "ferocious," "savage," and "fanatical."
	</p>

	<p>
		These are strong words, and the annotations earned them. To every disputed text, whether on the
		primacy of Rome, on the sacraments, on justification, or on the authority of tradition alongside
		Scripture, the notes arrived with formidable apparatus: Latin citations, patristic authority,
		logical argument, and a fierce refusal to concede any ground to Protestant interpretation.
		Cotton observed that "it would be difficult to find a more studied series of deliberate insults,
		than these Notes contain: and where could such sentiments and language be more out of place and
		more indecent, than in a professed commentary on the Gospel of Jesus Christ?"
	</p>

	<h2>Designed as a Doctrinal System</h2>

	<p>
		Richard Bristow and Cardinal Allen had prepared the annotations concurrently while Gregory
		Martin translated the text; the work of annotating was as much their production as the
		translation itself. The argument for each of the distinctive doctrines of Rome, including
		transubstantiation, purgatory, the real presence, and the authority of tradition alongside
		Scripture, was worked out at length beside every disputable passage.
	</p>

	<p>
		The argument prefixed to the <a href="/odr/john/1">Gospel of John</a> was particularly
		characteristic. Cotton noted that it "treats professedly of Heresies; and contains much
		condemnation of Protestants, of private judgment, vernacular translations, the general perusal
		of Scripture." The notes to the
		<a href="/odr/apocalypse/1">Apocalypse</a> were "preeminently controversial; designed to defend the
		Church of Rome from the interpretations given by Protestant Divines." One of those notes ran to six
		and a half pages of small print, arguing that the Pope could not be the Antichrist described in Revelation.
	</p>

	<p>
		Barker observed the distribution of the doctrinal argument plainly: "There are renderings here
		and there which may be said to favour Roman Doctrine, but they are few and far between. It is in
		the notes that Roman Doctrine is perseveringly and strenuously taught."
	</p>

	<h2>Protestant England's Response</h2>

	<p>
		Protestant England, reading these notes, recognized them as a serious challenge. Thomas
		Cartwright, professor of divinity at Cambridge and leader of the Puritan party, was engaged by
		the Earl of Leicester and Sir Francis Walsingham as early as 1583 to write against the Rheims
		version specifically. Archbishop Whitgift, who had little sympathy for Cartwright's Puritanism
		but a great deal of concern about the Rheims annotations, eventually prohibited him from
		continuing; the work did not fully appear until 1602, nearly twenty years after Cartwright had
		begun it.
	</p>

	<p>
		Fulke took up the task instead. His 1589 parallel edition printed the Rheims text alongside the
		Bishops' Bible and argued against the Catholic annotations one by one. In printing what he
		refuted, he spread the Rheims text and its arguments throughout Protestant England.
	</p>

	<h2>A Peculiar Immortality</h2>

	<p>
		The annotations were the most controversial part of the work: the part that drove Protestant
		England to mobilize its scholarly apparatus in response. They were also, through that response,
		what spread the Rheims text so widely. Fulke's refutation required him to print the notes he was
		arguing against. In trying to bury the Catholic argument, he preserved it in a form that would
		circulate through four printings.
	</p>

	<p>
		When the translators of the King James Version gathered in 1604, Fulke's parallel edition was
		among their working texts. The annotations that Bristow and Allen had composed to defend Roman
		doctrine against Protestant corruption had, through the mechanism of refutation, contributed to
		the making of <a href="/history/influence-on-kjv">the greatest Protestant English Bible</a>.
		That is a peculiar sort of immortality.
	</p>

	<p>
		The text on this site presents Gregory Martin's translation without the annotations of 1582. It
		is possible to read the original Douay-Rheims as a bare text. Its authors never intended it to
		be read that way.
	</p>

	<h2>Their Legacy</h2>

	<p>
		The annotations produced an unintended consequence that their authors would have found ironic.
		In 1589, the Cambridge Master William Fulke published a systematic Protestant refutation of the
		Rheims New Testament by printing the entire Catholic text alongside the Bishops' Bible in
		parallel columns and answering each annotation point by point. Fulke aimed to discredit. His
		method placed the Rheims translation, and its arguments, into every serious Protestant biblical
		scholar's library in England.
	</p>

	<p>
		When the King James translators gathered in 1604, Fulke's parallel edition was among the most
		widely circulated English New Testaments in the country. The annotations they had intended to
		refute became, through Fulke's inadvertent distribution, a working reference for the committee
		producing the Protestant masterpiece. Ward Allen's analysis of the King James translators'
		revision notes, published in 1969, found that a significant proportion of their proposed textual
		improvements in the Gospels drew on readings first found in the Rheims translation. For a full
		account of this debt, see
		<a href="/history/influence-on-kjv">How the Douay-Rheims Shaped the King James Bible</a>.
	</p>

	<p>
		The annotations also shaped the tradition of Catholic biblical commentary in English. The
		learned engagement with Scripture that Gregory Martin and Richard Bristow had modelled in 1582
		continued, in modified form, through the centuries that followed. The
		<a href="https://en.wikisource.org/wiki/Catholic_Encyclopedia_(1913)/Douay_Bible"
			>Catholic Encyclopedia (1913)</a
		>
		records that the annotations remained the most cited element of the original edition in both Catholic
		and Protestant scholarship for over a century after publication.
	</p>

	<h2>The Annotations After Challoner</h2>

	<p>
		<a href="/history/challoner">Bishop Challoner</a> did not carry the original annotations into his
		revision. His editions of 1749 and 1752 replaced the dense polemical apparatus of Bristow and Worthington
		with shorter, devotional notes suited to ordinary Catholic readers in eighteenth-century England.
		The doctrinal arguments that had occupied hundreds of pages in the 1582 original were largely dropped;
		Challoner drew on their substance in composing his briefer substitutes, but the original notes did
		not survive the revision intact.
	</p>

	<p>
		As a result, the full annotations of 1582 are accessible today only through the original
		editions and scholarly facsimiles. The 1582 Rheims New Testament and the 1609-1610 Douay Old
		Testament, available through library facsimile editions and digitized copies on the Internet
		Archive, preserve the annotations as Bristow, Worthington, and Allen composed them. The text on
		this site presents Gregory Martin's translation without those notes, as the Challoner revision
		has transmitted it.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Rev. Henry Cotton, <em
				>Rhemes and Doway: An Attempt to Shew What Has Been Done by Roman Catholics for the
				Diffusion of the Holy Scriptures in English</em
			> (Oxford University Press, 1855), primary source for Cotton's descriptions of the annotations and
			the Protestant responses
		</li>
		<li>
			Henry Barker, <em
				>English Bible Versions: A Tercentenary Memorial of the King James Version</em
			>, source for Geddes's and Mombert's characterizations of the annotations
		</li>
		<li>
			Cardinal John Henry Newman, <q>On the Rheims and Douay Version of Holy Scripture,</q> in
			<em>Essays Critical and Historical</em>
		</li>
		<li>
			Paris Marion Simms, <em>The Bible in America: Versions that have Played Their Part</em>
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history/rheims-1582">← Published in a Time of Crisis</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/history/forbidden-bible">A Bible Forbidden to Its Own Readers →</a>
	</p>
</ProseLayout>
