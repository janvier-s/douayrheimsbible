<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	const ARTICLES_FAQ = [
		{
			q: 'What is the difference between the Douay-Rheims and the Challoner revision?',
			a: "Bishop Richard Challoner revised the original Douay-Rheims so extensively between 1749 and 1752 that Cardinal Newman described the changes as 'almost amounting to a new translation.' Most printed and online 'Douay-Rheims' Bibles today are actually Challoner's revision. This site presents Gregory Martin's original text."
		},
		{
			q: 'Which Catholic Bible is most accurate?',
			a: "Accuracy depends on what you are measuring. The original Douay-Rheims is the most faithful English rendering of the Latin Vulgate. Modern translations like the RSV-CE and NABRE translate directly from the Hebrew and Greek. The question of which is 'most accurate' turns on a prior question: which source text is authoritative?"
		},
		{
			q: 'Why does the Catholic Bible have more books than the Protestant Bible?',
			a: 'The Catholic canon includes seven books — Tobit, Judith, 1 and 2 Maccabees, Wisdom, Sirach (Ecclesiasticus), and Baruch — that were removed from the Protestant canon during the Reformation, largely under the influence of Martin Luther, who placed them in a separate appendix. The Catholic Church has recognized these deuterocanonical books as Scripture since before the New Testament era.'
		}
	];

	type Article = {
		slug: string;
		title: string;
		desc: string;
		live?: boolean;
	};

	type Cluster = {
		id: string;
		heading: string;
		articles: Article[];
	};

	const CLUSTERS: Cluster[] = [
		{
			id: 'comparisons',
			heading: 'Comparisons',
			articles: [
				{
					slug: 'douay-rheims-vs-challoner',
					title: 'Douay-Rheims vs Challoner: Which Is More Accurate?',
					desc: 'How Bishop Challoner transformed the original text, what changed, and which version you are actually reading when you open a modern edition.'
				},
				{
					slug: 'most-accurate-catholic-bible',
					title: 'Which Catholic Bible Is Most Accurate?',
					desc: 'A plain-language comparison of the major Catholic translations — Douay-Rheims, RSV-CE, NABRE, Knox — and the question of what accuracy means for a Bible translation.'
				},
				{
					slug: 'douay-rheims-vs-rsv-ce',
					title: 'Douay-Rheims vs RSV-CE',
					desc: 'Two approaches to Catholic Scripture in English: the Vulgate-based original of 1582 and the critical-text revision of 1966.'
				},
				{
					slug: 'douay-rheims-vs-knox',
					title: 'Douay-Rheims vs Knox Bible',
					desc: "Monsignor Ronald Knox's idiomatic 1945 translation compared with the literal Latinate style of the original Douay-Rheims."
				}
			]
		},
		{
			id: 'verse-explainers',
			heading: 'Verse Explainers',
			articles: [
				{
					slug: 'isaiah-7-14-virgin-young-woman',
					title: 'Isaiah 7:14 — "Virgin" or "Young Woman"?',
					desc: 'Why the Douay-Rheims says "virgin" where modern Protestant translations say "young woman," and why Matthew 1:23 settles the question.'
				},
				{
					slug: 'genesis-3-15-she-shall-crush',
					title: 'Genesis 3:15 — "She" or "He" Shall Crush?',
					desc: 'The Latin ipsa vs ipse dispute: why the Douay-Rheims says "she shall crush thy head," its Marian significance, and the manuscript evidence.'
				},
				{
					slug: 'supersubstantial-bread',
					title: 'Why "Supersubstantial Bread" Not "Daily Bread"? (Matt 6:11)',
					desc: "The Douay-Rheims renders the Lord's Prayer differently from every other English Bible. What supersubstantialem means and its Eucharistic interpretation."
				},
				{
					slug: 'do-penance',
					title: 'Why "Do Penance" Not "Repent"? (Matt 4:17)',
					desc: 'What poenitentiam agite actually means, why the Protestant translations changed it, and what is at stake for the sacrament of confession.'
				},
				{
					slug: 'full-of-grace',
					title: 'Why "Full of Grace" Not "Highly Favored"? (Luke 1:28)',
					desc: 'The Greek kecharitomene, the Latin gratia plena, and why the translation difference matters for the doctrine of the Immaculate Conception.'
				},
				{
					slug: 'charity-not-love',
					title: 'Why "Charity" Not "Love"? (1 Corinthians 13)',
					desc: "What the Vulgate's caritas preserves that modern translations lose when they render it as 'love,' and why the distinction is not merely linguistic."
				},
				{
					slug: 'johannine-comma',
					title: 'The Johannine Comma: Why Is 1 John 5:7 Different?',
					desc: 'The Trinitarian clause that appears in the Douay-Rheims but not in most modern Bibles — the textual history, the controversy, and the Catholic position.'
				}
			]
		},
		{
			id: 'canon',
			heading: 'The Catholic Canon',
			articles: [
				{
					slug: 'deuterocanonical-books',
					title: 'What Are the Deuterocanonical Books?',
					desc: 'The seven books in the Catholic Bible that are not in most Protestant Bibles — what they are, what they contain, and why they were accepted by the Church.'
				},
				{
					slug: 'catholic-bible-vs-protestant',
					title: 'Catholic Bible vs Protestant Bible: What Is Different?',
					desc: 'A complete accounting of the differences between Catholic and Protestant Scripture: the seven extra books, the longer versions of Daniel and Esther, and why they diverged.'
				},
				{
					slug: 'luther-removed-books',
					title: 'Why Did Luther Remove Books from the Bible?',
					desc: "Luther's deuterocanon, his theological objections, what he actually did and did not do, and how the Protestant canon became what it is today."
				}
			]
		},
		{
			id: 'translation',
			heading: 'Translation & Scholarship',
			articles: [
				{
					slug: 'vulgate-translation-accurate',
					title: 'Is a Translation from the Latin Vulgate More Faithful?',
					desc: "The case for and against the Vulgate as a translation base — Jerome's scholarship, the Council of Trent, and what 'faithfulness' means in Bible translation."
				},
				{
					slug: 'what-is-the-septuagint',
					title: 'What Is the Septuagint and Why Does It Matter?',
					desc: "The Greek translation of the Old Testament, why the New Testament authors quoted it, and why it matters for understanding the Catholic Bible's text."
				},
				{
					slug: 'what-is-the-latin-vulgate',
					title: 'What Is the Latin Vulgate?',
					desc: "Saint Jerome's fourth-century Latin translation of the Bible — its history, its authority in the Catholic Church, and its relationship to the Douay-Rheims."
				},
				{
					slug: 'english-martyrs-bible',
					title: 'What Bible Did the English Martyrs Use?',
					desc: 'The Rheims New Testament was the Scripture of the English Catholic martyrs of the Elizabethan era. Its role in their formation, their trials, and their deaths.'
				}
			]
		}
	];
</script>

<svelte:head>
	<title>Articles on the Catholic Bible — Douay-Rheims Bible</title>
	<meta
		name="description"
		content="Articles on the Catholic Bible: comparisons of translations, verse-level explainers, the deuterocanonical books, and the Latin Vulgate tradition. Written from the perspective of the original Douay-Rheims."
	/>
	<link rel="canonical" href="https://douayrheimsbible.net/articles" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Articles on the Catholic Bible — Douay-Rheims Bible" />
	<meta
		property="og:description"
		content="Comparisons, verse explainers, canon questions, and translation scholarship — all from the perspective of the original Douay-Rheims Bible."
	/>
	<meta property="og:url" content="https://douayrheimsbible.net/articles" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="Articles on the Catholic Bible"
	subtitle="Comparisons, verse explainers, canon questions, and translation scholarship — written from the perspective of the original Douay-Rheims."
	faqItems={ARTICLES_FAQ}
>
	<p>
		The original Douay-Rheims Bible differs from most English versions in ways that are easy to
		notice and hard to explain without some background. These articles provide that background —
		answering the questions that arise when readers encounter the text for the first time, or when
		they want to understand what is at stake in a particular translation choice.
	</p>

	{#each CLUSTERS as cluster}
		<h2 id={cluster.id}>{cluster.heading}</h2>
		<ol class="article-list">
			{#each cluster.articles as article}
				<li class="article-item">
					{#if article.live}
						<a href="/articles/{article.slug}" class="article-link">
							<span class="article-title">{article.title}</span>
							<span class="article-desc">{article.desc}</span>
						</a>
					{:else}
						<div class="article-link article-link--planned">
							<span class="article-title">{article.title}</span>
							<span class="article-desc">{article.desc}</span>
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	{/each}
</ProseLayout>

<PageFooter
	bookMeta={ALL_BOOKS[0]}
	chapterNum={1}
	totalChapters={50}
	routeBase="/odr"
	showNav={false}
/>

<style>
	.article-list {
		list-style: none;
		padding: 0;
		margin: 16px 0 40px;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.article-item {
		border-top: 1px solid var(--color-border);
		padding: 24px 0;
	}

	.article-item:last-child {
		border-bottom: 1px solid var(--color-border);
	}

	.article-link {
		display: flex;
		flex-direction: column;
		gap: 6px;
		text-decoration: none;
	}

	.article-link--planned {
		opacity: 0.45;
		cursor: default;
	}

	.article-title {
		display: block;
		font-family: var(--font-reader);
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-accent-text);
		letter-spacing: -0.01em;
		line-height: 1.3;
		transition: color 150ms ease;
	}

	a.article-link:hover .article-title {
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.article-desc {
		display: block;
		font-family: var(--font-reader);
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--color-muted);
	}
</style>
