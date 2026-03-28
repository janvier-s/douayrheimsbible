<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;

	const FAQ = [
		{
			q: 'Does the Catholic Church encourage Catholics to read the Bible?',
			a: 'Yes, emphatically. The Second Vatican Council\'s Dei Verbum (1965) called for "easy access to Sacred Scripture" for all the faithful and quoted Saint Jerome\'s maxim: "Ignorance of the Scriptures is ignorance of Christ." Pope Benedict XVI\'s Verbum Domini (2010) and Pope Francis\'s Aperuit Illis (2019, which instituted the Sunday of the Word of God) have continued and deepened this invitation.'
		},
		{
			q: 'What is lectio divina?',
			a: "Lectio divina (divine reading) is the ancient monastic practice of slow, prayerful Scripture reading. It moves through four movements: lectio (attentive reading), meditatio (meditation), oratio (prayer arising from the text), and contemplatio (contemplative rest in God's presence). Pope Benedict XVI endorsed it in Verbum Domini as a privileged method for encountering the living Word."
		},
		{
			q: 'Did the Catholic Church ever restrict Bible reading?',
			a: 'In certain periods, yes. The 1582 Rheims New Testament preface required readers to obtain a license from a confessor before reading it privately. These restrictions were pastoral responses to specific historical crises (the proliferation of tendentious Protestant translations) rather than opposition to Scripture reading in principle. The trajectory of Catholic teaching has moved consistently toward wider access and warmer encouragement.'
		}
	];
</script>

<svelte:head>
	<title>A Bible Open to All: How the Catholic Church Encourages Scripture Reading</title>
	<meta
		name="description"
		content="How the Catholic Church actively encourages all the faithful to read Scripture, from Dei Verbum's open invitation to the Church's guidance on how to read: with attention to literary forms, Tradition, and the Magisterium, and through the ancient practice of Lectio Divina."
	/>
	<link rel="canonical" href="https://douayrheimsbible.net/history/scripture-for-all" />
	<meta property="og:type" content="article" />
	<meta
		property="og:title"
		content="A Bible Open to All: How the Catholic Church Encourages Scripture Reading"
	/>
	<meta
		property="og:description"
		content="How the Church moved from regulated access to active encouragement, and how Catholics are invited to read Scripture today."
	/>
	<meta property="og:url" content="https://douayrheimsbible.net/history/scripture-for-all" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="A Bible Open to All"
	subtitle="How the Catholic Church encourages all the faithful to read Scripture, and the guidance it offers for reading well."
	faqItems={FAQ}
>
	<h2>From Caution to Invitation</h2>

	<p>
		An earlier article in this collection described the period when Catholics who produced the
		Rheims New Testament required their own readers to obtain a license before opening it. That
		history is real, and it requires explanation, but it does not represent the Church's settled
		mind on Scripture. The restrictions that marked certain periods were pastoral responses to
		specific crises: the proliferation of tendentious translations, the fracturing of Christian
		unity, the real danger that unsupported private reading of Scripture would lead ordinary
		Catholics into the doctrinal traps that polemicists had carefully laid. When those conditions
		changed, the restrictions changed with them.
	</p>

	<p>
		The trajectory of Catholic teaching has moved, consistently and deliberately, toward wider
		access and warmer encouragement. Pope Leo XIII in 1893 urged Catholics to study Scripture with
		scholarly rigor. Pope Pius XII in 1943 authorized translation from the original languages,
		opening the way to a new generation of Catholic Bibles. The Second Vatican Council's Dogmatic
		Constitution on Divine Revelation, <em>Dei Verbum</em>, issued in 1965, brought this trajectory
		to its fullest expression and placed the Church's invitation to Scripture reading at the center
		of Catholic life.
	</p>

	<figure class="article-figure">
		<div
			class="article-figure-placeholder"
			data-label="Photograph of the Second Vatican Council in session at St Peter's Basilica, or the opening page of Dei Verbum (November 18, 1965)"
		></div>
		<figcaption>
			The Second Vatican Council (1962–1965), whose Dogmatic Constitution <em>Dei Verbum</em> opened Scripture
			to all the faithful
		</figcaption>
	</figure>

	<h2>Dei Verbum: The Open Door</h2>

	<p>
		Before <em>Dei Verbum</em> says anything about access or translation, it establishes the theological
		ground for everything that follows. Divine revelation, the Council declares at the outset, is not
		the transmission of doctrines from a remote authority but an address from a friend. God, as the document
		puts it, "spoke to men as friends" (DV 2), drawing humanity into a relationship of intimacy rather
		than mere instruction. Reading Scripture is re-entering that address; the reader is not a student
		working through a text but a friend receiving a word spoken personally to them.
	</p>

	<p>
		The twenty-fifth article of <em>Dei Verbum</em> is among the most directly pastoral passages in the
		documents of Vatican II. It addresses every member of the Church, from scholars to the faithful in
		the pews, and it speaks without qualification:
	</p>

	<blockquote>
		Easy access to Sacred Scripture should be provided for all the Christian faithful. For this
		reason the Church from the very beginning accepted as her own that very ancient Greek
		translation of the Old Testament which is called the Septuagint; and she has always given a
		place of honor to other Eastern translations and Latin translations, especially the Latin
		translation known as the Vulgate. But since the Word of God should be accessible at all times,
		the Church by her authority and with maternal concern sees to it that suitable and correct
		translations are made into different languages...
	</blockquote>

	<p>
		The same article quotes Saint Jerome directly: "Ignorance of the Scriptures is ignorance of
		Christ." It calls on all the faithful to "learn by frequent reading of the divine Scriptures the
		excellent knowledge of Jesus Christ," and it places Scripture reading alongside prayer as
		indispensable to Christian life: "Let them remember that prayer should accompany the reading of
		Sacred Scripture, so that God and man may talk together; for 'we speak to Him when we pray; we
		hear Him when we read the divine sayings.'"
	</p>

	<p>
		The document describes Sacred Scripture as <q
			>the pure and everlasting source of spiritual life</q
		>
		and calls for it to nourish the faithful alongside the Eucharist. Both form, in
		<em>Dei Verbum</em>'s image, a single table: "the bread of life" from the table of God's word
		and from the table of Christ's body.
	</p>

	<h2>How to Read: The Church's Guidance</h2>

	<p>
		The Church's encouragement of Scripture reading comes with a framework for reading well. The
		Catechism of the Catholic Church, drawing on <em>Dei Verbum</em>, sets out three criteria that
		govern Catholic interpretation of Scripture.
	</p>

	<ol class="criteria-list">
		<li>
			<strong>Attention to authorial intent.</strong> Sacred Scripture speaks through human writers
			with particular intentions, literary forms, and audiences.
			<q
				>Truth is differently presented and expressed in the various types of historical writing, in
				prophetical and poetical texts, and in other forms of literary expression</q
			> (CCC 110). A passage of Hebrew poetry is read differently from a legal code; a prophetic oracle
			calls for different attention than a genealogy.
		</li>
		<li>
			<strong>Reading within the unity of Scripture.</strong> No verse stands alone. The Old and New
			Testaments form a single revelation: as Saint Augustine wrote,
			<q>the New Testament lies hidden in the Old and the Old is unveiled in the New.</q>
			Reading Scripture within its whole prevents both the isolation of proof texts and the misreading
			of difficult passages whose meaning becomes clear only in relation to the rest of what God has revealed.
		</li>
		<li>
			<strong>Reading within the living Tradition of the Church.</strong> The Catechism (CCC 113)
			draws on the Fathers in expressing this:
			<q
				>Sacred Scripture is written principally in the Church's heart rather than in documents and
				records; for the Church carries in her Tradition the living memorial of God's Word.</q
			>
			The Magisterium serves as the authoritative interpreter of Scripture, not because it stands over
			the Word of God, but because it serves it.
		</li>
	</ol>

	<p>
		These three criteria work together as a single interpretive discipline. Pope Leo XIV, in his
		2026 catechesis on <em>Dei Verbum</em>, drew on Benedict XVI's formulation to express their
		unity: <q>Authentic biblical hermeneutics can only be had within the faith of the Church.</q>
		The practical test for any reading comes from Augustine, cited in that same catechesis: a convincing
		interpretation is one that builds up <q>the twofold love of God and neighbor.</q> Where an interpretation
		serves charity and deepens faith, the reader is on firm ground; where it divides, isolates, or abstracts
		the text from the community that lives by it, something has gone wrong.
	</p>

	<p>
		These three criteria are not restrictions on the reader. They are a map. They describe what
		Scripture actually is: a human and divine document, embedded in a tradition, addressed to a
		community, and best understood within that community's accumulated wisdom.
	</p>

	<h2>Lectio Divina</h2>

	<p>
		The method the Church most commends for personal Scripture reading is <em>lectio divina</em>,
		divine reading. It is an ancient practice, rooted in the monasticism of the early centuries, and
		it has been consistently endorsed by popes and councils as the proper disposition for engaging
		the Word of God.
	</p>

	<ol class="lectio-list">
		<li>
			<em>Lectio</em> — attentive reading: taking a passage slowly, allowing the words to land, not rushing
			past difficulty.
		</li>
		<li>
			<em>Meditatio</em> — meditation: staying with a phrase or image that arrests the attention, turning
			it in the mind, listening for what it opens.
		</li>
		<li>
			<em>Oratio</em> — prayer: speaking to God from what has been heard, bringing the text into direct
			conversation with the life of the reader.
		</li>
		<li>
			<em>Contemplatio</em> — contemplation: resting in God's presence, beyond words, in the quiet that
			reading and prayer have prepared.
		</li>
	</ol>

	<p>
		Pope Benedict XVI, in his 2010 apostolic exhortation <em>Verbum Domini</em>, endorsed
		<em>lectio divina</em> as a privileged method for encountering the living Word. Drawing on Saint
		Gregory the Great, he quoted: <q>The divine words grow together with the one who reads them.</q> The
		practice, Benedict wrote, allows Scripture to become not simply a word from the past but a living
		and timely word addressed to the particular reader in the particular moment of their life.
	</p>

	<h2>A Tradition of Encouragement</h2>

	<figure class="article-figure">
		<div
			class="article-figure-placeholder"
			data-label="Portrait or mosaic of Saint Jerome in his study, or a page from his Latin Vulgate manuscript"
		></div>
		<figcaption>
			Saint Jerome (c. 347–420), whose Latin Vulgate made Scripture accessible to the Western Church
			and whose letters urged all the faithful to read it
		</figcaption>
	</figure>

	<p>
		The Church's encouragement of Scripture reading is not a modern development. It runs through the
		entire tradition, from the Fathers forward. The passages in which Saint Jerome, Saint John
		Chrysostom, and Pope Saint Gregory the Great urged their contemporaries to read Scripture
		regularly and with persistence are among the warmest and most direct in patristic literature.
	</p>

	<p>
		Saint Jerome, whose Latin Vulgate made Scripture accessible to the Western Church for a
		millennium, wrote to his correspondents with the urgency of a teacher who knew what was being
		missed: "Read assiduously and learn as much as you can. Let sleep find you holding your Bible,
		and when your head nods, let it fall on the sacred page." His maxim that "ignorance of the
		Scriptures is ignorance of Christ" passed from his letters into <em>Dei Verbum</em> itself and from
		there into the Catechism (CCC 133).
	</p>

	<p>
		Saint John Chrysostom, who preached through entire books of Scripture to his congregations in
		Antioch and Constantinople, wrote that "it is not possible ever to exhaust the mind of the
		Scriptures. It is a well that has no bottom." Gregory the Great described the Bible in a phrase
		that has stayed in the tradition ever since: <q
			>a river in which a lamb may wade and an elephant may swim.</q
		>
		Its depths are inexhaustible; its shallows are accessible to everyone. "Learn the heart of God from
		the word of God," he wrote to a friend.
	</p>

	<h2>The Continuing Call</h2>

	<p>
		The Church's invitation has only grown more explicit in the decades since <em>Dei Verbum</em>.
		In <em>Verbum Domini</em> (2010), Pope Benedict XVI called for Scripture to be integrated into every
		dimension of Catholic life: personal prayer, family life, parish community, theological study, and
		missionary work. He wrote that "the word of God is not simply a word from the past, but a living and
		timely word" and that the Church's deepening engagement with Scripture is essential to her identity
		and mission.
	</p>

	<p>
		In 2019, Pope Francis went further in a practical direction. His apostolic letter
		<em>Aperuit Illis</em> instituted the Sunday of the Word of God, celebrated each year on the
		Third Sunday in Ordinary Time, as a day specifically devoted to the celebration, study, and
		living of Scripture.
		<q>The Bible is the book of the Lord's people,</q> Francis wrote, "who, in listening to it, move from
		dispersion and division towards unity." He invoked Saint Jerome's maxim again: "Ignorance of the Scriptures
		is ignorance of Christ." The Catechism makes the same appeal (CCC 133), and the section on prayer
		returns to it: "The Church strongly urges all the Christian faithful to learn the surpassing knowledge
		of Jesus Christ by frequent reading of the divine Scriptures" (CCC 2653).
	</p>

	<p>
		In 2026, Pope Leo XIV devoted his weekly general audiences to a sustained catechesis on
		<em>Dei Verbum</em>, working through the Council's vision of Scripture and Tradition over
		successive weeks. He opened the series with the document's first theological note, that God
		"spoke to men as friends," and developed it across addresses on the unity of Scripture and
		Tradition as a single living deposit, on the dual authorship of inspired texts, on the Church as
		Scripture's natural home, and on the inexhaustibility of God's Word. Saint Jerome's maxim
		returned in each session. Augustine's observation passed through the series as well: "There is
		only one Word that sounds on the lips of many saints." The catechesis, delivered to the faithful
		assembled in Saint Peter's Square, demonstrated in its very form what <em>Dei Verbum</em> had taught:
		the Word of God addressed to all, in the presence of all, for the life of all.
	</p>

	<h2>Scripture and This Site</h2>

	<p>
		The text on this site is Gregory Martin's original Douai-Rheims translation, produced in exile
		and published between 1582 and 1610, with only light modernization of spelling. It is a
		particular and distinctive rendering of Sacred Scripture, deeply shaped by its historical moment
		and by the translators' philosophical commitment to the Vulgate. It is one way of hearing the
		Word of God in English.
	</p>

	<p>
		The Church's invitation, expressed in <em>Dei Verbum</em> and confirmed in every subsequent magisterial
		document on Scripture, is to read. Whatever translation the reader uses, whatever method they bring
		to the text, the counsel of Saint Jerome, Saint Chrysostom, Pope Saint Gregory the Great, and the
		Council fathers is the same: open the book, come without haste, and let the words do their work.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Second Vatican Council, <em>Dei Verbum</em> (1965), especially articles 12, 21, and 25
		</li>
		<li>
			<em>Catechism of the Catholic Church</em>, paragraphs 109–114 (reading Scripture well),
			131–133 (Scripture in the life of the Church), and 2653 (Scripture and prayer)
		</li>
		<li>Pope Benedict XVI, <em>Verbum Domini</em> (2010)</li>
		<li>
			Pope Francis, <em>Aperuit Illis</em> (2019) — institution of the Sunday of the Word of God
		</li>
		<li>
			Saint Jerome — <q>Ignorance of the Scriptures is ignorance of Christ</q>; cited in
			<em>Dei Verbum</em> 25 and CCC 133
		</li>
		<li>
			Saint Gregory the Great — <q>Learn the heart of God from the word of God</q>; "The divine
			words grow together with the one who reads them"; cited in <em>Verbum Domini</em> 30
		</li>
		<li>
			Pope Leo XIV, General Audiences of January 14, 21, 28 and February 4, 11, 2026 — catechesis
			series on <em>Dei Verbum</em>
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history/original-tongues">← From the Authentic Latin to the Original Tongues</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/odr/genesis/1">Begin reading the Douay-Rheims Bible →</a>
	</p>
</ProseLayout>

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>

<style>
	.criteria-list,
	.lectio-list {
		list-style: none;
		padding: 0;
		margin: 24px 0;
		counter-reset: item-counter;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.criteria-list li,
	.lectio-list li {
		counter-increment: item-counter;
		padding: 20px 0 20px 48px;
		border-top: 1px solid var(--color-border);
		position: relative;
		font-family: var(--font-reader);
		font-size: var(--font-size-reader);
		line-height: var(--line-height-reader);
		color: var(--color-text);
	}

	.criteria-list li:last-child,
	.lectio-list li:last-child {
		border-bottom: 1px solid var(--color-border);
	}

	.criteria-list li::before,
	.lectio-list li::before {
		content: counter(item-counter);
		position: absolute;
		left: 0;
		top: 20px;
		font-family: var(--font-reader);
		font-size: 11px;
		font-weight: 600;
		color: var(--color-accent-text);
		letter-spacing: 0.1em;
		line-height: calc(var(--line-height-reader) * var(--font-size-reader));
	}
</style>
