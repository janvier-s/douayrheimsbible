<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	const FAQ = [
		{
			q: 'What did Bishop Challoner change in the Douay-Rheims Bible?',
			a: 'Challoner simplified the Latinate vocabulary, modernized archaic phrasing, revised some renderings against both the Vulgate and the original Greek and Hebrew, and removed most of the original annotations. The changes were extensive enough that Cardinal Newman said they "almost amounted to a new translation" and that Challoner\'s version was "even nearer to the Protestant than it is to the Douay" in phraseology.'
		},
		{
			q: 'Is the Douay-Rheims Bible in print today the same as the original?',
			a: "No. Nearly every Douay-Rheims Bible in print today is actually Bishop Challoner's eighteenth-century revision (1749-1752), not Gregory Martin's original 1582 and 1609-1610 text. The two differ significantly in vocabulary, style, and character. This site presents the original pre-Challoner text."
		},
		{
			q: 'When did Bishop Challoner revise the Douay-Rheims?',
			a: 'Challoner produced several editions: the New Testament was revised in 1749, followed by a complete Bible in 1750, and a further New Testament revision in 1752. Each edition differed from the last, and all were published anonymously.'
		},
		{
			q: 'Why did Challoner revise the Douay-Rheims Bible?',
			a: 'By the mid-eighteenth century, the original text was over 150 years old. Its heavily Latinate vocabulary and archaic phrasing made it increasingly inaccessible to ordinary Catholic readers. Challoner set out to make the Bible readable for the Catholics of his day, succeeding in that practical goal but at the cost of the distinctive character of the original.'
		}
	];
</script>

<svelte:head>
	<title>The Challoner Revision: How the Douay-Rheims Bible Was Transformed</title>
	<meta
		name="description"
		content="Bishop Richard Challoner's 18th-century revision of the Douay-Rheims Bible changed the text so extensively that Cardinal Newman said it almost amounted to a new translation. Learn what changed and why."
	/>
	<link rel="canonical" href="https://douayrheimsbible.net/history/challoner" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="The Challoner Revision of the Douay-Rheims Bible" />
	<meta
		property="og:description"
		content="How Bishop Challoner transformed the original Douay-Rheims text, and why the distinction matters."
	/>
	<meta property="og:url" content="https://douayrheimsbible.net/history/challoner" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="The Challoner Revision"
	subtitle="How Bishop Richard Challoner transformed the Douay-Rheims Bible in the eighteenth century, and why the distinction between the original and the revision matters."
	faqItems={FAQ}
	datePublished="2024-01-01"
>
	<h2>Bishop Richard Challoner</h2>

	<p>
		<a href="https://en.wikipedia.org/wiki/Richard_Challoner">Richard Challoner</a> (1691–1781) was a
		convert to Catholicism who rose to become the Vicar Apostolic of the London District, effectively
		the senior Catholic bishop in England during one of the most difficult periods for English Catholics.
		Appointed coadjutor in 1739 and taking full charge in 1758, he shepherded a persecuted community with
		quiet determination for over four decades.
	</p>

	<p>
		Among his many pastoral works, Challoner undertook a thorough revision of the Douay-Rheims
		Bible. By the mid-eighteenth century, the original text was over a hundred and fifty years old.
		Its heavily Latinate vocabulary, archaic phrasing, and dense annotations made it increasingly
		difficult for ordinary readers. Challoner set out to make the Bible accessible to the Catholics
		of his own day.
	</p>

	<figure class="article-figure">
		<div
			class="article-figure-placeholder"
			data-label="Portrait of Bishop Richard Challoner (1691–1781), Vicar Apostolic of the London District"
		></div>
		<figcaption>
			Bishop Richard Challoner, whose revisions of 1749–1752 transformed the Douay-Rheims into the
			form most Catholics know today
		</figcaption>
	</figure>

	<h2>What He Changed</h2>

	<p>
		Challoner's revision was far more extensive than a simple modernization of spelling. Working
		with the Carmelite friar Francis Blyth, he undertook several kinds of changes:
	</p>

	<ul>
		<li>
			<strong>Simplified vocabulary:</strong> The original's distinctive Latinate terms were
			replaced with more familiar English equivalents: <em>exinanited</em> (Philippians 2:7) became
			"emptied himself," <em>contristate</em> (Ephesians 4:30) became "grieve," and
			<em>longanimity</em> (Romans 2:4) became "longsuffering."
		</li>
		<li>
			<strong>Modernized phrasing:</strong> Archaic constructions and obsolete expressions were rewritten
			for clarity.
		</li>
		<li>
			<strong>Corrected against multiple sources:</strong> Challoner checked the translation against the
			Clementine Vulgate, as well as the original Greek and Hebrew manuscripts, incorporating improvements
			from modern textual scholarship.
		</li>
		<li>
			<strong>Stripped the annotations:</strong> The original's extensive theological notes, designed
			to counter Reformation arguments, were largely removed, producing a compact single-volume edition
			that was far more practical for everyday use.
		</li>
	</ul>

	<p>
		Cardinal Newman observed that Challoner's finished text <q
			>approximates to the Protestant version</q
		>
		in its phrasing and diction, a consequence of his simplifications rather than any stated intention.
		The Catholic Dictionary noted the same: "he has sacrificed force and vividness in some of his changes."
	</p>

	<h2>Multiple Editions</h2>

	<p>
		Challoner did not produce a single definitive revision. He issued several editions over more
		than two decades, each differing from the last:
	</p>

	<ul>
		<li><strong>1749:</strong> First revised New Testament</li>
		<li>
			<strong>1750:</strong> Complete Bible, with approximately two hundred additional changes to the
			New Testament
		</li>
		<li>
			<strong>1752:</strong> Further New Testament revision, with over two thousand readings differing
			from the 1750 edition
		</li>
	</ul>

	<p>
		All of these editions were published anonymously. It remains unclear to what extent Challoner
		was personally involved in every change across the later editions, or whether some alterations
		were introduced by others in the editorial process.
	</p>

	<h2>Examples of Changes</h2>

	<p>
		The scope of Challoner's alterations becomes clear when specific passages are set alongside the
		Vulgate Latin that both translators were working from. In nearly every case, Martin's English
		mirrors Saint Jerome's Latin word for word; that fidelity is precisely why Challoner felt it
		needed to change.
	</p>

	<h3>Ephesians 3:6</h3>
	<blockquote class="comparison">
		<strong>Vulgate:</strong>
		<em
			>gentes esse cohæredes, et concorporales, et comparticipes promissionis ejus in Christo Jesu
			per Evangelium</em
		><br />
		<strong>Literal translation:</strong> the Gentiles to be co-heirs, and co-bodied, and
		co-partakers of his promise in Christ Jesus through the Gospel<br />
		<strong>Original:</strong> "The Gentiles to be coheirs and concorporate and comparticipant of
		his promise in Christ Jesus by the Gospel"<br />
		<strong>Challoner:</strong> "That the Gentiles should be fellow heirs, and of the same body, and co-partners
		of his promise in Christ Jesus, by the gospel"
	</blockquote>

	<p>
		Martin coined "concorporate" directly from Saint Jerome's <em>concorporales</em> and
		"comparticipant" from <em>comparticipes</em> — words that have no prior existence in English but map
		exactly onto the Latin compounds. Challoner dissolved them into natural phrases.
	</p>

	<h3>Ephesians 3:9</h3>
	<blockquote class="comparison">
		<strong>Vulgate:</strong>
		<em
			>et illuminare omnes, quæ sit dispensatio sacramenti absconditi a sæculis in Deo, qui omnia
			creavit</em
		><br />
		<strong>Literal translation:</strong> and to enlighten all, what is the dispensation of the
		mystery hidden from the ages in God, who created all things<br />
		<strong>Original:</strong> "and to illuminate all men what is the dispensation of the sacrament
		hidden from worlds in God, who created all things"<br />
		<strong>Challoner:</strong> "and to enlighten all men, that they may see what is the dispensation
		of the mystery which hath been hidden from eternity in God, who created all things"
	</blockquote>

	<p>
		Two changes in a single verse. Saint Jerome used <em>sacramentum</em> throughout his translation
		to render the Greek μυστήριον; Martin followed the Latin word and gave "sacrament." Challoner
		returned to the Greek meaning and gave "mystery." Saint Jerome's <em>a sæculis</em> (literally "from
		the ages" or "from the worlds") became Martin's literal "from worlds" and Challoner's smoother "from
		eternity."
	</p>

	<h3>Romans 8:15</h3>
	<blockquote class="comparison">
		<strong>Vulgate:</strong>
		<em
			>Non enim accepistis spiritum servitutis iterum in timore, sed accepistis spiritum adoptionis
			filiorum, in quo clamamus: Abba (Pater)</em
		><br />
		<strong>Literal translation:</strong> For you have not received the spirit of servitude again in
		fear, but you have received the spirit of adoption of sons, in whom we cry: Abba (Father)<br />
		<strong>Original:</strong> "you have not received the spirit of servitude again in fear; but you
		have received the spirit of adoption of sons, wherein we cry: Abba, (Father)"<br />
		<strong>Challoner:</strong> "you have not received the spirit of bondage again in fear; but you have
		received the spirit of adoption of sons, whereby we cry: Abba (Father)"
	</blockquote>

	<p>
		A single word changed: <em>servitutis</em> (servitude) became "bondage." Martin's choice is a direct
		rendering of the Latin; Challoner's is the more natural English idiom for the same idea.
	</p>

	<h3>Isaiah 40:22</h3>
	<blockquote class="comparison">
		<strong>Vulgate:</strong>
		<em
			>Qui sedet super gyrum terræ, et habitatores ejus sunt quasi locustæ; qui extendit velut
			nihilum cælos, et expandit eos sicut tabernaculum ad inhabitandum</em
		><br />
		<strong>Literal translation:</strong> Who sits above the circle of the earth, and its
		inhabitants are as locusts; who stretches out the heavens as nothing, and spreads them out as a
		tent for dwelling<br />
		<strong>Original:</strong> "He that sitteth upon the compass of the earth, and the inhabitants
		thereof are as locusts: he that stretcheth out the heavens as nothing, and spreadeth them as a
		tent to dwell in"<br />
		<strong>Challoner:</strong> "It is he that sitteth upon the globe of the earth, and the inhabitants
		thereof are as locusts: he that stretcheth out the heavens as nothing, and spreadeth them out as a
		tent to dwell in"
	</blockquote>

	<p>
		<em>Gyrus</em> (from the Greek γῦρος) means a ring, a circle, or a circular arc; it does not
		denote a sphere. Martin's "compass," understood in its older sense of a circular arc or circuit,
		renders
		<em>gyrum</em> faithfully. Challoner's "globe" introduces a three-dimensional object Saint Jerome's
		Latin does not specify.
	</p>

	<p>
		These are not isolated cases. By the time Challoner's successors had added their own revisions,
		the accumulated distance from Gregory Martin's original would lead Cardinal Wiseman to question
		whether the name "Douay-Rheims" still applied at all, a question taken up in the next article.
	</p>

	<h2>Almost a New Translation</h2>

	<p>
		The cumulative effect of Challoner's changes was dramatic. Cardinal John Henry Newman, writing
		in
		<a href="https://www.newmanreader.org/works/essays/volume1/index.html"
			>Essays Critical and Historical</a
		>, observed that the revisions <q>almost amounted to a new translation,</q> and that Challoner's
		version was
		<q>even nearer to the Protestant than it is to the Douay</q> in phraseology and diction, despite both
		being translations of the same Latin Vulgate. In many passages, the Challoner text reads so differently
		from Gregory Martin's original that they are barely recognizable as the same work.
	</p>

	<blockquote class="comparison">
		Nearly every "Douay-Rheims Bible" in print today is actually the Douay-Rheims-Challoner
		revision, not the original text of 1582 and 1609–1610.
	</blockquote>

	<p>
		This distinction is often overlooked. When Catholics speak of "the Douay-Rheims Bible," they
		almost invariably mean Challoner's version. The original text, with its Latinate richness, its
		close fidelity to the Vulgate, and its extensive polemical annotations, has been largely
		forgotten.
	</p>

	<h2>What Was Lost: The Names</h2>

	<p>
		Among the least-noticed but most theologically significant of Challoner's changes was his
		treatment of the name of Christ in Old Testament passages. The
		<a href="https://en.wikisource.org/wiki/Catholic_Encyclopedia_(1913)/Douay_Bible"
			>Catholic Encyclopedia (1913)</a
		>
		is direct on the scope of the intervention: Challoner's changes were "so considerable that scarcely
		any verse remains as it was originally published."
	</p>

	<p>
		The Vulgate Latin uses the word "christum," the Latin rendering of the Greek christos, in
		several Old Testament passages where the Hebrew original has "mashiach." Gregory Martin followed
		Jerome's Latin and rendered these as "his Christ," "the Christ of the Lord," or "the Lord's
		Christ," preserving the Christological resonance that Jerome intended and that the Council of
		Trent's declaration of Vulgate authenticity had sanctioned. Challoner, working toward a more
		natural English idiom, replaced these with "his anointed" or "the anointed of the Lord."
	</p>

	<p>
		The difference is not trivial. In 1 Kings 12:3, the original Douay-Rheims gives: "the Lord is
		witness against you, and his Christ is witness this day, that you have not found ought in my
		hand." Challoner's version reads: "the Lord is witness against you, and his anointed is witness
		this day, that you have not found aught in my hand." The typological link to Christ is present
		in Martin's text; in Challoner's it is dissolved into a description. The same pattern recurs
		throughout the Old Testament wherever the Vulgate uses "christum" in a Messianic context.
	</p>

	<figure class="article-figure">
		<div
			class="article-figure-placeholder"
			data-label="Side-by-side comparison of the original Douay-Rheims (1609) and Challoner revision showing 1 Kings 12:3 with 'his Christ' vs 'his anointed'"
		></div>
		<figcaption>
			A comparison of the original Douay-Rheims and Challoner texts at 1 Kings 12:3, illustrating
			the systematic replacement of "his Christ" with "his anointed"
		</figcaption>
	</figure>

	<p>
		For readers who wish to examine the differences in detail,
		<a href="https://realdouayrheims.com/">realdouayrheims.com</a> presents the case for the
		original text with further examples, and
		<a href="https://originaldouayrheims.com/differences">originaldouayrheims.com/differences</a>
		provides a systematic account of the changes Challoner introduced. This site presents the original
		pre-Challoner text: Gregory Martin's translation, unaltered.
	</p>

	<h2>Why the Original Matters</h2>

	<p>
		The pre-Challoner Douay-Rheims is not merely an antiquarian curiosity. It is the work of men who
		translated under extraordinary circumstances: scholars in exile, some of whom would be martyred,
		producing a translation of the entire Bible in under two years while simultaneously training
		priests for a mission that could cost them their lives.
	</p>

	<p>
		The original text reflects a different philosophy of translation, one that prioritized fidelity
		to the Latin source even at the cost of readability. Where Challoner smoothed and simplified,
		Martin and his colleagues preserved the texture of the Vulgate: its cadences, its theological
		precision, its occasionally difficult beauty.
	</p>

	<p>
		This site presents that original text, with only light modernization of spelling and
		punctuation. The translation itself, Gregory Martin's translation, is unaltered.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Cardinal John Henry Newman, <q>On the Rheims and Douay Version of Holy Scripture,</q> in
			<em>Essays Critical and Historical</em>
		</li>
		<li>
			Henry Barker, <em
				>English Bible Versions: A Tercentenary Memorial of the King James Version</em
			>
			— cites the Catholic Dictionary on Challoner
		</li>
		<li>
			Rev. Henry Cotton, <em
				>Rhemes and Doway: An Attempt to Shew What Has Been Done by Roman Catholics for the
				Diffusion of the Holy Scriptures in English</em
			> (Oxford University Press, 1855) — chronological list of editions
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history/influence-on-kjv">← How the Douay-Rheims Shaped the King James Bible</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/history/after-challoner">After Challoner: A Bible in Dispute →</a>
	</p>
</ProseLayout>
