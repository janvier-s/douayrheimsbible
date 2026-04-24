<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import { ABOUT_NAV } from '../nav';
</script>

<svelte:head>
	<title>The Translations | The Original Douay-Rheims Bible</title>
	<meta
		name="description"
		content="Every translation available on this site: Sixto-Clementine Vulgate, Original Douay-Rheims, Challoner, Haydock, Confraternity, Knox, CPDV, and KJV."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/about/translations" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="The Translations" />
	<meta
		property="og:description"
		content="Every translation available on this site: Sixto-Clementine Vulgate, Original Douay-Rheims, Challoner, Haydock, Confraternity, Knox, CPDV, and KJV."
	/>
	<meta property="og:url" content="https://thedouayrheims.com/about/translations" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="The Translations"
	subtitle="Every translation on this site was made from the Latin Vulgate, or is included for the light it throws on how that text was translated and revised into English."
	navItems={ABOUT_NAV}
>
	<h2>The Translations</h2>

	<p>
		Every translation on this site was made from the Latin Vulgate, or is included for the light it
		throws on how that text was translated and revised into English. Placed together in the reader
		and the compare view, they form a continuous record of how English-speaking Catholics have
		received Scripture over four centuries.
	</p>

	<ul>
		<li>
			<strong>Sixto-Clementine Vulgate (1592):</strong> The official Latin Bible of the Catholic Church
			from its promulgation by Pope Clement VIII until the Nova Vulgata of 1979. This is the source text
			from which all the English translations here were made, or in close relation to which they were
			produced. Reading it alongside the English editions reveals every translator's decision at its root.
		</li>
		<li>
			<strong>Original Douay-Rheims (1582–1610):</strong> The primary text of this site, described above
			in detail. The first complete English translation of the Clementine Vulgate, with the full apparatus
			of 1,707 annotations and 3,709 cross-references.
		</li>
		<li>
			<strong>Douay-Rheims Challoner (1749–1752):</strong> Bishop Richard Challoner's revision of the
			Original Douay-Rheims. Smoother in syntax, more modern in vocabulary, influenced in places by the
			King James Version. The standard English Catholic Bible for two centuries and still widely used.
			The comparison between the two Douay texts is the most instructive available on this site: it shows
			exactly what was gained in readability and what was sacrificed in fidelity. Challoner's edition
			carries its own study notes, available in the study panel alongside the text.
		</li>
		<li>
			<strong>Haydock Catholic Bible Commentary (1883):</strong> Rev. George Leo Haydock's comprehensive
			commentary on the entire Catholic Bible, drawing on the Church Fathers, Doctors of the Church, and
			the most respected Catholic commentators. Haydock compiled and edited the work of Challoner, Witham,
			Tirinus, Menochius, Calmet, and others into a single apparatus covering every book of Scripture.
			The Bible text is the Challoner Douay-Rheims with minor punctuation variations. The commentary is
			available in the study panel with verse-by-verse notes, chapter introductions, and cross-references.
		</li>
		<li>
			<strong>Confraternity New Testament (1941):</strong> A revision of the Challoner New Testament sponsored
			by the Confraternity of Christian Doctrine, translated directly from the Clementine Vulgate. More
			accurate than Challoner in several places, it served as the standard New Testament for American
			Catholics through the mid-twentieth century. Only the New Testament was completed; before the Old
			Testament could be finished, the project shifted to the original languages and became what would
			eventually be published as the New American Bible. Each book is accompanied by an introduction,
			available in the study panel.
		</li>
		<li>
			<strong>Knox Bible (1945–1949):</strong> Ronald Knox's complete translation from the Vulgate into
			English, commissioned by the Catholic Bishops of England and Wales. Knox was as much a stylist as
			a translator; his aim was a text that read as natural English prose rather than a Latinate rendering.
			The result is singular: learned, at times arrestingly different from every other version, and unlike
			anything else available here.
		</li>
		<li>
			<strong>Catholic Public Domain Version (2009):</strong> A modern translation of the Vulgate by Ronald
			Conte Jr., freely available without copyright restriction. More literal in approach than Knox, more
			modern in vocabulary than Challoner. The CPDV is accompanied by translator's notes, available in
			the study panel.
		</li>
		<li>
			<strong>King James Version (1611):</strong> A Protestant translation from the Hebrew and Greek,
			not the Vulgate. Its presence here is not incidental: Challoner drew on the KJV extensively when
			revising the Original Douay-Rheims, borrowing phrases that had entered common English use. Reading
			the three texts together, Original Douay-Rheims alongside Challoner alongside KJV, makes those borrowings
			visible and traces the influence that runs, through Challoner, between the two traditions.
		</li>
		<li>
			<strong>Revised Standard Version, Catholic Edition (forthcoming):</strong> A modern scholarly translation
			from the original languages, approved for Catholic use and liturgical reading. The RSV-CE represents
			the modern critical mainstream of Catholic biblical scholarship. Its inclusion, pending rights clearance,
			would complete the picture: the Vulgate tradition on one side, the modern critical tradition on
			the other, with every major English stepping stone between them.
		</li>
	</ul>

	<hr />
	<p>
		<a href="/about/features">← Features</a>
		<a href="/about/stats">In Numbers →</a>
	</p>
</ProseLayout>
