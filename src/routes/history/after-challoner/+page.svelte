<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;
</script>

<svelte:head>
	<title>After Challoner: A Bible in Dispute</title>
	<meta
		name="description"
		content="The proliferation of competing Catholic Bible editions after Challoner, and why Cardinal Wiseman declared that calling any of them the Douay-Rheims was an abuse of terms."
	/>
	<link rel="canonical" href="https://douayrheimsbible.pages.dev/history/after-challoner" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="After Challoner: A Bible in Dispute" />
	<meta
		property="og:description"
		content="The competing Catholic Bible editions after Challoner, and why the name Douay-Rheims became, in Wiseman's words, an abuse of terms."
	/>
	<meta property="og:url" content="https://douayrheimsbible.pages.dev/history/after-challoner" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="After Challoner: A Bible in Dispute"
	subtitle="The proliferation of competing editions after Challoner, and why Cardinal Wiseman declared the name Douay-Rheims an abuse of terms."
>
	<h2>Multiple Editions, No Single Text</h2>

	<p>
		When Richard Challoner revised the Douay-Rheims between 1749 and 1777, he produced not one text
		but several, each differing from the last, each published anonymously, with no mechanism for
		determining which should be considered definitive. By the time he died in 1781, the Catholic
		English Bible existed in at least three distinct Challoner versions, none formally authorised,
		none identical with the others.
	</p>

	<p>What followed made the situation considerably more complex.</p>

	<h2>McMahon, Troy, and the Irish Revisions</h2>

	<p>
		In 1783, a Dublin priest named Mr. McMahon, at the request of Archbishop Troy of Dublin,
		undertook a further revision of Challoner's New Testament. McMahon's text introduced more than
		five hundred changes in some sections, departing from what the Catholic Dictionary later
		described as Challoner's Protestant leanings. Archbishop Troy then had the entire Bible collated
		with the Clementine Vulgate and issued the result in 1791, producing what became known as Dr.
		Troy's Bible. In 1794, and again in 1803 and 1810, further New Testament printings appeared,
		each claiming the Challoner lineage while differing in significant respects from his actual
		text.
	</p>

	<h2>Cotton's Catalogue</h2>

	<p>
		Henry Cotton, an Archdeacon of Cashel who spent years cataloguing every Catholic English Bible
		edition he could locate, published his findings at the Oxford University Press in 1855. His
		preface captured the problem with precision. Educated men, he wrote, whether Protestant or
		Catholic, allowed themselves to speak of "the Douay Bible" or "the Rhemish Testament" as though
		all copies of Holy Scripture circulating among Roman Catholics represented one and the same
		text, accompanied by one and the same body of notes. They did not. Cotton's chronological list
		ran to nearly three hundred entries spanning more than two and a half centuries.
	</p>

	<p>
		By the mid-nineteenth century, Cotton identified four competing text traditions in active use.
		The Murray and Denvir line, followed in Ireland, traced its descent from Challoner's earlier
		editions. The Wiseman and Haydock line, used in England and America, followed either Dr. Troy's
		revision or the later Challoner texts. The Haydock Bible, edited by the Rev. G.L. Haydock and
		published in Manchester in 1811-12, was notable for restoring the original Rhemish annotations
		of 1582 that Challoner had removed. Gibson's editions, published in Liverpool from 1816,
		represented yet another editorial position.
	</p>

	<h2>The Roman Catholic Bible Society</h2>

	<p>
		In 1815, the Roman Catholic Bible Society published its own edition in London, then issued a
		second, slightly different edition the same year. Cotton found the existence of this Society
		itself largely unknown: "the account of the curious and important proceedings of the Roman
		Catholic Bible Society, about forty years ago, the very name and existence of which Society are
		unknown to nineteen persons out of twenty at this day."
	</p>

	<h2>Newman's Analysis</h2>

	<p>
		Cardinal Newman, surveying this landscape in his tract on the Rheims and Douay Version, observed
		that the Old Testament had remained essentially stable since Challoner's 1750 revision, while
		the New Testament had become a field of competing readings. Editors were forced to choose
		between this or that of Challoner's three New Testament texts, or McMahon's revision as refined
		by Troy. No two editions were identical, yet all were published under the same name. Newman
		identified approximately one hundred and seventy textual variations in a sample of passages
		between Challoner's first edition and later versions.
	</p>

	<h2>Independent Translators</h2>

	<p>
		Individual scholars meanwhile attempted fresh translations. Dr. Geddes, a Roman Catholic priest,
		began a new translation from the original languages in 1792, concluding after reflection that
		patching and piecing what had already been pieced and patched would produce only a strange
		composition. He did not complete it. Dr. Lingard, the historian, translated the four Gospels in
		1836. Bishop Francis Patrick Kenrick of Philadelphia produced a complete translation of the New
		Testament and Apocalypse in 1849, followed by volumes of the Old Testament: a substantial
		scholarly achievement that received little official recognition from Rome.
	</p>

	<h2>An Abuse of Terms</h2>

	<p>
		Cardinal Wiseman put the situation plainly: "To call it any longer the Douay or Rhemish version
		is an abuse of terms. It has been altered and modified till scarce any verse remains as it was
		originally published."
	</p>

	<p>
		Cotton's concluding question was direct: whether there existed at that moment any authorised
		standard text of the Roman Catholic English Bible, or any such thing as a uniform interpretation
		of it. His answer was implicit in every page of his chronological list. There was not. What
		passed under the name of the Douay-Rheims Bible was a family of related texts, shaped by
		successive editors over two and a half centuries, each one departing further from the original
		work of Gregory Martin and his colleagues at Rheims.
	</p>

	<p>
		The text presented on this site is Martin's original: the pre-Challoner Douay-Rheims, the
		translation that all subsequent editors took as their starting point and that none of them left
		unchanged.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Cardinal John Henry Newman, "On the Rheims and Douay Version of Holy Scripture," in <em
				>Essays Critical and Historical</em
			> — primary source for Newman's analysis of the post-Challoner text traditions
		</li>
		<li>
			Rev. Henry Cotton, <em
				>Rhemes and Doway: An Attempt to Shew What Has Been Done by Roman Catholics for the
				Diffusion of the Holy Scriptures in English</em
			> (Oxford University Press, 1855) — primary source for the chronological edition list, Cotton's
			preface, and the Roman Catholic Bible Society
		</li>
		<li>
			Henry Barker, <em
				>English Bible Versions: A Tercentenary Memorial of the King James Version</em
			>
			— cites the Catholic Dictionary on McMahon's revision and Wiseman's collected essays
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history/challoner">← The Challoner Revision</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/history/america">The Douay-Rheims in America →</a>
	</p>
</ProseLayout>

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>
