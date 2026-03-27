<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;
</script>

<svelte:head>
	<title>A Bible of Arguments: The Annotations of the Douay-Rheims</title>
	<meta
		name="description"
		content="The notes that accompanied the Douay-Rheims New Testament were a sustained, learned theological engagement with Protestant readings of Scripture that drove a Protestant response lasting decades."
	/>
	<link rel="canonical" href="https://douayrheimsbible.pages.dev/history/annotations" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="A Bible of Arguments: The Annotations of the Douay-Rheims" />
	<meta
		property="og:description"
		content="The annotations of the Douay-Rheims were a sustained theological engagement with Protestant readings of Scripture. How they shaped the Bible and its reception."
	/>
	<meta property="og:url" content="https://douayrheimsbible.pages.dev/history/annotations" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="A Bible of Arguments: The Annotations"
	subtitle="The notes that accompanied the Rheims New Testament were a sustained, scholarly engagement with Protestant readings of Scripture, and they changed everything about how the book was received."
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

	<p>
		Henry Cotton catalogued the volume with characteristic precision. The annotations, he wrote,
		were "vindicating the translation, fiercely asserting all the peculiar doctrines of the Court of
		Rome, and employing the most bitter and contumelious terms in speaking of Protestants, and their
		doctrines, and their versions of Scripture." Dr. Geddes, himself a Catholic priest, described
		them as "virulent Annotations against the Protestant Religion, and manifestly calculated to
		support a system, not of genuine Catholicity, but of transalpine Popery." The Protestant scholar
		Mombert called them "ferocious," "savage," and "fanatical."
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
		The argument prefixed to the Gospel of John was particularly characteristic. Cotton noted that
		it "treats professedly of Heresies; and contains much condemnation of Protestants, of private
		judgment, vernacular translations, the general perusal of Scripture." The notes to the
		Apocalypse were "preeminently controversial; designed to defend the Church of Rome from the
		interpretations given by Protestant Divines." One of those notes ran to six and a half pages of
		small print, arguing that the Pope could not be the Antichrist described in Revelation.
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
		the making of the greatest Protestant English Bible. That is a peculiar sort of immortality.
	</p>

	<p>
		The text on this site presents Gregory Martin's translation without the annotations of 1582. It
		is possible to read the original Douay-Rheims as a bare text. Its authors never intended it to
		be read that way.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Rev. Henry Cotton, <em
				>Rhemes and Doway: An Attempt to Shew What Has Been Done by Roman Catholics for the
				Diffusion of the Holy Scriptures in English</em
			> (Oxford University Press, 1855) — primary source for Cotton's descriptions of the annotations
			and the Protestant responses
		</li>
		<li>
			Henry Barker, <em
				>English Bible Versions: A Tercentenary Memorial of the King James Version</em
			>
			— source for Geddes's and Mombert's characterizations of the annotations
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

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>
