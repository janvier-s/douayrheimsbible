<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;
</script>

<svelte:head>
	<title>The Douay-Rheims Bible in America</title>
	<meta
		name="description"
		content="From Maryland in 1634 to the Catholic communities of the nineteenth century: how the Douay-Rheims Bible crossed the Atlantic and accompanied American Catholics through their first centuries."
	/>
	<link rel="canonical" href="https://douayrheimsbible.pages.dev/history/america" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="The Douay-Rheims Bible in America" />
	<meta
		property="og:description"
		content="From Maryland in 1634 to the nineteenth century: how the Douay-Rheims crossed the Atlantic and took root in American Catholic life."
	/>
	<meta property="og:url" content="https://douayrheimsbible.pages.dev/history/america" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="The Douay-Rheims in America"
	subtitle="From Maryland in 1634 to the Catholic communities of the nineteenth century, how this Bible crossed the Atlantic and took root in a new world."
>
	<h2>Maryland, 1634</h2>

	<p>
		When Cecelius Calvert, the second Lord Baltimore, led his party of colonists to Maryland in
		1634, the settlement included Catholic priests. John Shea, the nineteenth-century historian of
		the Catholic Church in America, believed they brought the Rheims-Douai Bible with them. Whether
		or not that first crossing carried a copy, the Bible entered American life during those early
		Maryland years, in the hands of a community that had left England for the freedom to worship
		openly.
	</p>

	<p>
		Maryland was not exclusively Catholic. Many Protestants settled there as well, and the King
		James Version came to the colony as naturally as the Rheims-Douai. As Simms noted, "there is as
		much probability, perhaps, that the King James Version came over in 1634 as there is that the
		Rheims-Douai came at that time." The two Bibles coexisted, as the two communities did, in a
		colony whose charter had promised religious tolerance.
	</p>

	<h2>Two Bibles Made in Exile</h2>

	<p>
		The parallel between the two great English translations is striking. Protestant exiles from
		England, gathered at Geneva during the reign of Mary Tudor, produced the Geneva Bible. When
		Elizabeth restored the Protestant settlement and Catholics fled to the continent, they gathered
		at Douai and Rheims and produced the Rheims-Douai. Both were translations made in exile, shaped
		by the experience of displacement and persecution. Both eventually crossed the Atlantic with
		communities carrying their faith to a new world.
	</p>

	<h2>A Difficult Reception in England</h2>

	<p>
		The Rheims New Testament had a difficult passage through Elizabethan England. Elizabeth's
		government treated it as a seditious document. Priests found carrying copies were imprisoned.
		The Crown's searchers seized copies wherever they were found. Those who circulated the New
		Testament faced, in some cases, torture. Many copies were confiscated and destroyed. The Bible
		travelled to America partly because America offered fewer of these obstacles. Maryland's
		earliest years gave it room the Old World had not.
	</p>

	<h2>The First American Catholic Bible</h2>

	<p>
		The first American printing of a Catholic Bible did not appear until 1790, in Philadelphia:
		Challoner's revised text, published for the American Catholic community that had grown through
		the colonial period and was finding its footing in a new nation. The first complete American
		Catholic Bible followed in 1805, also in Philadelphia, published by Mathew Carey, a Catholic
		immigrant from Ireland who had become one of the most successful publishers in the young
		republic.
	</p>

	<p>
		Carey's edition was intended as a definitive Catholic Bible for the American market, and it was
		widely circulated. It carried the Challoner text and annotations, now several generations
		removed from the original Rheims-Douai of 1582, but still bearing the same name.
	</p>

	<h2>Bishop Kenrick's Translation</h2>

	<p>
		Bishop Francis Patrick Kenrick of Philadelphia, later Archbishop of Baltimore, undertook a
		complete fresh translation of the entire Bible. His New Testament and Apocalypse appeared in New
		York in 1849, with Old Testament volumes following in subsequent years. Kenrick translated
		directly from the original languages with scholarly care, and his work represented the most
		substantial American contribution to Catholic biblical scholarship in the nineteenth century.
	</p>

	<p>
		His translation reflected the coming of age of an American Catholic intellectual life. The
		community that had arrived in Maryland with a handful of priests and a Bible brought from
		England had grown, through immigration from Ireland, Germany, and Southern Europe, into a major
		presence in American religious life. Kenrick's work served that community's need for a
		translation that was both scholarly and American.
	</p>

	<h2>The Name That Endured</h2>

	<p>
		The Rheims-Douai Bible, in its various editions, accompanied American Catholics through the
		nineteenth century. Challoner's name was on most title pages. Cardinal Wiseman had declared it
		an abuse of terms to call any of these editions by the older name. But the communities that read
		them knew them as the Catholic Bible: the one that had come across the ocean, in one form or
		another, from the beginning.
	</p>

	<p>
		The text presented on this site is the original, pre-Challoner Douay-Rheims, as first published
		in 1582 and 1609-10. It is the text that preceded all the revisions, the one that Gregory Martin
		and his colleagues produced in exile, and that was carried, in the hands of priests and
		laypeople, across the Atlantic to a new world.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Paris Marion Simms, <em>The Bible in America: Versions that have Played Their Part</em> — primary
			source for the Maryland settlement, the parallel with the Geneva Bible, and the difficult English
			reception
		</li>
		<li>
			Rev. Henry Cotton, <em
				>Rhemes and Doway: An Attempt to Shew What Has Been Done by Roman Catholics for the
				Diffusion of the Holy Scriptures in English</em
			> (Oxford University Press, 1855) — chronological list of American editions including the 1805 Carey
			Bible and Kenrick's translation
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history/after-challoner">← After Challoner: A Bible in Dispute</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/history">History of the Douay-Rheims Bible →</a>
	</p>
</ProseLayout>

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>
