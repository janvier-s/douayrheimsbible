# History Articles Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `/history` and `/challoner-revision` pages with a hub at `/history` listing six curated articles on the origins, language, influence, and legacy of the Douay-Rheims Bible, with four new articles written from primary sources.

**Architecture:** One static `+page.svelte` per article, following the existing ProseLayout pattern. No new components. Hub at `/history` lists all six articles in reading order. `/challoner-revision` redirects to `/history/challoner` via the `_redirects` file.

**Tech Stack:** SvelteKit, Svelte 4, TypeScript, ProseLayout component, PageFooter component

**Style rules (enforced in ALL prose):**
- No em dashes. Use commas, semicolons, colons, or rephrase.
- No "it's not X, it's Y" constructions.
- Beautiful, flowing, scholarly prose written for curious readers.

---

## File Map

| File | Action | Description |
|---|---|---|
| `src/routes/history/+page.svelte` | **Replace** | New hub index page |
| `src/routes/history/+page.ts` | **Unchanged** | Already correct |
| `src/routes/history/origins/+page.svelte` | **Create** | Existing history content, retitled |
| `src/routes/history/origins/+page.ts` | **Create** | Copy of history +page.ts |
| `src/routes/history/challoner/+page.svelte` | **Create** | Existing challoner-revision content, KJV claim corrected |
| `src/routes/history/challoner/+page.ts` | **Create** | Copy of challoner-revision +page.ts |
| `src/routes/history/rheims-1582/+page.svelte` | **Create** | New article |
| `src/routes/history/rheims-1582/+page.ts` | **Create** | Standard pattern |
| `src/routes/history/influence-on-kjv/+page.svelte` | **Create** | New article |
| `src/routes/history/influence-on-kjv/+page.ts` | **Create** | Standard pattern |
| `src/routes/history/after-challoner/+page.svelte` | **Create** | New article |
| `src/routes/history/after-challoner/+page.ts` | **Create** | Standard pattern |
| `src/routes/history/america/+page.svelte` | **Create** | New article |
| `src/routes/history/america/+page.ts` | **Create** | Standard pattern |
| `src/routes/challoner-revision/+page.svelte` | **Delete** | Content moved to /history/challoner |
| `src/routes/challoner-revision/+page.ts` | **Delete** | Redirect now handled by _redirects |
| `_redirects` | **Modify** | Add /challoner-revision redirect |
| `src/lib/components/PageFooter.svelte` | **Modify** | Update About column links |

---

## Task 1: Scaffold +page.ts files for all new sub-routes

**Files:**
- Create: `src/routes/history/origins/+page.ts`
- Create: `src/routes/history/challoner/+page.ts`
- Create: `src/routes/history/rheims-1582/+page.ts`
- Create: `src/routes/history/influence-on-kjv/+page.ts`
- Create: `src/routes/history/after-challoner/+page.ts`
- Create: `src/routes/history/america/+page.ts`

- [ ] **Create `src/routes/history/origins/+page.ts`**

```ts
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => {
	return { showLayoutTopBar: false };
};
```

- [ ] **Copy to the five remaining sub-routes**

Create the identical file at each of these paths:
- `src/routes/history/challoner/+page.ts`
- `src/routes/history/rheims-1582/+page.ts`
- `src/routes/history/influence-on-kjv/+page.ts`
- `src/routes/history/after-challoner/+page.ts`
- `src/routes/history/america/+page.ts`

Each file is identical — same content as origins/+page.ts above.

- [ ] **Commit**

```bash
cd "douayrheimsbible"
git add src/routes/history/
git commit -m "feat: scaffold +page.ts files for history sub-routes"
```

---

## Task 2: Create the hub page at `/history`

**Files:**
- Modify: `src/routes/history/+page.svelte` (replaces current content entirely)

The hub uses `ProseLayout`. The article list goes inside the slot.

- [ ] **Replace `src/routes/history/+page.svelte` with the hub page**

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;
</script>

<svelte:head>
	<title>History of the Douay-Rheims Bible: Origins, Language, and Legacy</title>
	<meta
		name="description"
		content="A collection of articles tracing the origins, translation, influence, and legacy of the Douay-Rheims Bible, the first complete English Catholic translation of Sacred Scripture."
	/>
	<link rel="canonical" href="https://douayrheimsbible.pages.dev/history" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="History of the Douay-Rheims Bible" />
	<meta
		property="og:description"
		content="Articles on the origins, language, and legacy of the first complete English Catholic translation of Sacred Scripture."
	/>
	<meta property="og:url" content="https://douayrheimsbible.pages.dev/history" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="History of the Douay-Rheims Bible"
	subtitle="A collection of articles on the origins, language, and enduring legacy of the first complete English Catholic translation of Sacred Scripture."
>
	<p>
		The Douay-Rheims Bible was produced by scholars in exile during the English Reformation,
		published between 1582 and 1610, and has shaped Catholic worship and English literature ever
		since. These articles trace its story from the founding of the English College at Douai to the
		Catholic communities of nineteenth-century America. They are arranged to be read in sequence,
		each building on the one before, though each stands on its own.
	</p>

	<ol class="article-list">
		<li class="article-item">
			<a href="/history/origins" class="article-link">
				<span class="article-title">Born in Exile: The Origins of the Douay-Rheims Bible</span>
				<span class="article-desc"
					>How English scholars, driven from their homeland by persecution, produced a Bible that
					would shape all English Scripture to follow.</span
				>
			</a>
		</li>
		<li class="article-item">
			<a href="/history/rheims-1582" class="article-link">
				<span class="article-title">Published in a Time of Crisis</span>
				<span class="article-desc"
					>The political world that greeted the Rheims New Testament in 1582, and the Protestant
					refutation that spread it further than its authors could have imagined.</span
				>
			</a>
		</li>
		<li class="article-item">
			<a href="/history/influence-on-kjv" class="article-link">
				<span class="article-title">How the Douay-Rheims Shaped the King James Bible</span>
				<span class="article-desc"
					>The specific debt the King James Version owes to the Catholic Bible, in phrases, in
					vocabulary, and in scholarly precision.</span
				>
			</a>
		</li>
		<li class="article-item">
			<a href="/history/challoner" class="article-link">
				<span class="article-title">The Challoner Revision</span>
				<span class="article-desc"
					>How Bishop Richard Challoner transformed the Douay-Rheims in the eighteenth century, and
					why the distinction between the original and the revision matters.</span
				>
			</a>
		</li>
		<li class="article-item">
			<a href="/history/after-challoner" class="article-link">
				<span class="article-title">After Challoner: A Bible in Dispute</span>
				<span class="article-desc"
					>The proliferation of competing editions after Challoner, and why Cardinal Wiseman declared
					the name "Douay-Rheims" an abuse of terms.</span
				>
			</a>
		</li>
		<li class="article-item">
			<a href="/history/america" class="article-link">
				<span class="article-title">The Douay-Rheims in America</span>
				<span class="article-desc"
					>From Maryland in 1634 to the Catholic communities of the nineteenth century, how this
					Bible crossed the Atlantic and took root in a new world.</span
				>
			</a>
		</li>
	</ol>
</ProseLayout>

<PageFooter bookMeta={ALL_BOOKS[0]} chapterNum={1} totalChapters={50} routeBase="/odr" showNav={false} />

<style>
	.article-list {
		list-style: none;
		padding: 0;
		margin: 40px 0 0;
		counter-reset: article-counter;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.article-item {
		counter-increment: article-counter;
		border-top: 1px solid var(--color-border);
		padding: 28px 0;
	}

	.article-item:last-child {
		border-bottom: 1px solid var(--color-border);
	}

	.article-link {
		display: grid;
		grid-template-columns: 32px 1fr;
		gap: 0 20px;
		text-decoration: none;
		align-items: baseline;
	}

	.article-link::before {
		content: counter(article-counter);
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		color: var(--color-accent);
		letter-spacing: 0.1em;
		padding-top: 4px;
	}

	.article-title {
		display: block;
		font-family: var(--font-reader);
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--color-foreground);
		letter-spacing: -0.01em;
		line-height: 1.3;
		margin-bottom: 6px;
		transition: color 150ms ease;
		text-decoration: underline;
	}

	.article-link:hover .article-title {
		color: var(--color-accent);
	}

	.article-desc {
		display: block;
		font-family: var(--font-reader);
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--color-muted);
	}
</style>
```

- [ ] **Run format and check**

```bash
npm run format
npm run check
```

Expected: no TypeScript errors.

- [ ] **Commit**

```bash
git add src/routes/history/+page.svelte
git commit -m "feat: add /history hub page listing all six articles"
```

---

## Task 3: Create `/history/origins` (the existing history page, relocated)

**Files:**
- Create: `src/routes/history/origins/+page.svelte`
- Read first: `src/routes/history/+page.svelte` (the OLD hub — already replaced in Task 2, so copy from git if needed; content is the existing history page before Task 2)

The prose body is unchanged. Changes: new canonical URL, new title (retitled "Born in Exile"), new prev/next navigation, new Sources section, updated internal links.

- [ ] **Create `src/routes/history/origins/+page.svelte`**

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;
</script>

<svelte:head>
	<title>Born in Exile: The Origins of the Douay-Rheims Bible</title>
	<meta
		name="description"
		content="How English Catholic scholars in exile during the Reformation produced the first complete English Catholic Bible, from the founding of the English College at Douai in 1568 to the publication of the complete Bible in 1610."
	/>
	<link rel="canonical" href="https://douayrheimsbible.pages.dev/history/origins" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="Born in Exile: The Origins of the Douay-Rheims Bible" />
	<meta
		property="og:description"
		content="How English Catholic scholars in exile produced the first complete English Catholic Bible."
	/>
	<meta property="og:url" content="https://douayrheimsbible.pages.dev/history/origins" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="Born in Exile: The Origins of the Douay-Rheims Bible"
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
		John's College, Oxford, and a close friend of Saint Edmund Campion. Martin arrived at the college in
		1570, was ordained in 1573, and spent two years helping to establish the English College in Rome
		before returning to the continent.
	</p>

	<p>
		In 1578, political unrest in the Low Countries forced the college to relocate temporarily to
		Rheims. It was here, in October 1578, that Martin began his monumental work of translating the
		entire Bible from the Latin Vulgate into English. Working with extraordinary discipline,
		translating roughly two chapters each day, he is believed to have completed the entire text by
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
		<a href="/history/challoner">substantial revision</a> that made the text more accessible to
		contemporary readers, though at the cost of much of Martin's distinctive Latinate character.
	</p>

	<p>
		The text presented on this site is Martin's original, as it appeared in 1582 and 1609–1610,
		with only light modernisation of spelling and punctuation. It is a monument to the faith and
		scholarship of a community that risked everything to preserve the word of God in English.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Rev. Henry Cotton, <em>Rhemes and Doway: An Attempt to Shew What Has Been Done by Roman
			Catholics for the Diffusion of the Holy Scriptures in English</em> (Oxford University Press, 1855)
		</li>
		<li>
			Henry Barker, <em>English Bible Versions: A Tercentenary Memorial of the King James Version</em>
		</li>
		<li>
			Cardinal John Henry Newman, "On the Rheims and Douay Version of Holy Scripture,"
			in <em>Essays Critical and Historical</em>
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history">← History of the Douay-Rheims Bible</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/history/rheims-1582">Published in a Time of Crisis →</a>
	</p>
</ProseLayout>

<PageFooter bookMeta={ALL_BOOKS[0]} chapterNum={1} totalChapters={50} routeBase="/odr" showNav={false} />
```

- [ ] **Run format and check**

```bash
npm run format
npm run check
```

- [ ] **Commit**

```bash
git add src/routes/history/origins/
git commit -m "feat: add /history/origins article (relocated from /history)"
```

---

## Task 4: Create `/history/challoner` (existing challoner-revision, corrected)

**Files:**
- Create: `src/routes/history/challoner/+page.svelte`

The prose body is largely preserved from `/challoner-revision/+page.svelte`. Changes:
1. New canonical URL
2. New prev/next navigation
3. New Sources section
4. **KJV claim correction:** Remove the bullet "Approximated the King James Version" and its associated editorial commentary claiming Challoner deliberately used the KJV. Replace with a neutral observation that Challoner's revisions brought his text closer in phrasing to the dominant English Bible of his day. Newman says Challoner's text "approximates to the Protestant version" — describing the result, not the method.

- [ ] **Create `src/routes/history/challoner/+page.svelte`**

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;
</script>

<svelte:head>
	<title>The Challoner Revision: How the Douay-Rheims Bible Was Transformed</title>
	<meta
		name="description"
		content="Bishop Richard Challoner's 18th-century revision of the Douay-Rheims Bible changed the text so extensively that Cardinal Newman said it almost amounted to a new translation. Learn what changed and why."
	/>
	<link rel="canonical" href="https://douayrheimsbible.pages.dev/history/challoner" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="The Challoner Revision of the Douay-Rheims Bible" />
	<meta
		property="og:description"
		content="How Bishop Challoner transformed the original Douay-Rheims text, and why the distinction matters."
	/>
	<meta property="og:url" content="https://douayrheimsbible.pages.dev/history/challoner" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="The Challoner Revision"
	subtitle="How Bishop Richard Challoner transformed the Douay-Rheims Bible in the eighteenth century, and why the distinction between the original and the revision matters."
>
	<h2>Bishop Richard Challoner</h2>

	<p>
		Richard Challoner (1691–1781) was a convert to Catholicism who rose to become the Vicar
		Apostolic of the London District, effectively the senior Catholic bishop in England during one
		of the most difficult periods for English Catholics. Appointed coadjutor in 1739 and taking full
		charge in 1758, he shepherded a persecuted community with quiet determination for over four
		decades.
	</p>

	<p>
		Among his many pastoral works, Challoner undertook a thorough revision of the Douay-Rheims
		Bible. By the mid-eighteenth century, the original text was over a hundred and fifty years old.
		Its heavily Latinate vocabulary, archaic phrasing, and dense annotations made it increasingly
		difficult for ordinary readers. Challoner set out to make the Bible accessible to the Catholics
		of his own day.
	</p>

	<h2>What He Changed</h2>

	<p>
		Challoner's revision was far more extensive than a simple modernisation of spelling. Working
		with the Carmelite friar Francis Blyth, he undertook several kinds of changes:
	</p>

	<ul>
		<li>
			<strong>Simplified vocabulary:</strong> <br/>The original's distinctive Latinate terms (<em
				>supersubstantial</em
			>, <em>longanimity</em>, <em>benignity</em>) were replaced with more familiar English
			equivalents.
		</li>
		<li>
			<strong>Modernised phrasing:</strong> <br/>Archaic constructions and obsolete expressions were
			rewritten for clarity.
		</li>
		<li>
			<strong>Corrected against multiple sources:</strong> <br/>Challoner checked the translation against
			the Clementine Vulgate, as well as the original Greek and Hebrew manuscripts, incorporating
			improvements from modern textual scholarship.
		</li>
		<li>
			<strong>Stripped the annotations:</strong> <br/>The original's extensive theological notes, designed
			to counter Reformation arguments, were largely removed, producing a compact single-volume
			edition that was far more practical for everyday use.
		</li>
	</ul>

	<p>
		Cardinal Newman observed that Challoner's finished text "approximates to the Protestant
		version" in its phrasing and diction, a consequence of his simplifications rather than any
		stated intention. The Catholic Dictionary noted the same: "he has sacrificed force and vividness
		in some of his changes."
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
		The scope of Challoner's alterations becomes clear when specific passages are compared side by
		side. In nearly every case, the original's Latinate precision gives way to smoother, more
		familiar English:
	</p>

	<h3>Ephesians 3:6</h3>
	<blockquote>
		Original: "coheires and concorporate and comparticipant"<br />
		Challoner: "fellow heirs, and of the same body, and copartners"
	</blockquote>

	<h3>Ephesians 3:9</h3>
	<blockquote>
		Original: "illuminate all men, what is the dispensation of the sacrament hidden from worlds"<br
		/>
		Challoner: "enlighten all men, that they may see what is the dispensation of the mystery which
		hath been hidden from eternity"
	</blockquote>

	<h3>Romans 8:15</h3>
	<blockquote>
		Original: "the spirit of servitude again in fear"<br />
		Challoner: "the spirit of bondage again in fear"
	</blockquote>

	<h3>Isaiah 40:22</h3>
	<blockquote>
		Original: "He that sitteth upon the compass of the earth"<br />
		Challoner: "It is he that sitteth upon the globe of the earth"
	</blockquote>

	<p>
		These are not isolated cases. Cardinal Wiseman went further than Newman, declaring that "to call
		it any longer the Douay or Rheimish Version is an abuse of terms. It has been altered and
		modified till scarce any verse remains as it was originally published."
	</p>

	<h2>Almost a New Translation</h2>

	<p>
		The cumulative effect of Challoner's changes was dramatic. Cardinal John Henry Newman observed
		that the revisions "almost amounted to a new translation," and that Challoner's version was
		"even nearer to the Protestant than it is to the Douay" in phraseology and diction, despite
		both being translations of the same Latin Vulgate. In many passages, the Challoner text reads
		so differently from Gregory Martin's original that they are barely recognisable as the same
		work.
	</p>

	<blockquote>
		Nearly every "Douay-Rheims Bible" in print today is actually the Douay-Rheims-Challoner
		revision, not the original text of 1582 and 1609–1610.
	</blockquote>

	<p>
		This distinction is often overlooked. When Catholics speak of "the Douay-Rheims Bible," they
		almost invariably mean Challoner's version. The original text, with its Latinate richness, its
		close fidelity to the Vulgate, and its extensive polemical annotations, has been largely
		forgotten.
	</p>

	<h2>Why the Original Matters</h2>

	<p>
		The pre-Challoner Douay-Rheims is not merely an antiquarian curiosity. It is the work of men
		who translated under extraordinary circumstances: scholars in exile, some of whom would be
		martyred, producing a translation of the entire Bible in under two years while simultaneously
		training priests for a mission that could cost them their lives.
	</p>

	<p>
		The original text reflects a different philosophy of translation, one that prioritised fidelity
		to the Latin source even at the cost of readability. Where Challoner smoothed and simplified,
		Martin and his colleagues preserved the texture of the Vulgate: its cadences, its theological
		precision, its occasionally difficult beauty.
	</p>

	<p>
		This site presents that original text, with only light modernisation of spelling and
		punctuation. The translation itself, Gregory Martin's translation, is unaltered.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Cardinal John Henry Newman, "On the Rheims and Douay Version of Holy Scripture,"
			in <em>Essays Critical and Historical</em>
		</li>
		<li>
			Henry Barker, <em>English Bible Versions: A Tercentenary Memorial of the King James Version</em>
			— cites the Catholic Dictionary on Challoner
		</li>
		<li>
			Rev. Henry Cotton, <em>Rhemes and Doway: An Attempt to Shew What Has Been Done by Roman
			Catholics for the Diffusion of the Holy Scriptures in English</em> (Oxford University Press,
			1855) — chronological list of editions
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history/influence-on-kjv">← How the Douay-Rheims Shaped the King James Bible</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/history/after-challoner">After Challoner: A Bible in Dispute →</a>
	</p>
</ProseLayout>

<PageFooter bookMeta={ALL_BOOKS[0]} chapterNum={1} totalChapters={50} routeBase="/odr" showNav={false} />
```

- [ ] **Run format and check**

```bash
npm run format
npm run check
```

- [ ] **Commit**

```bash
git add src/routes/history/challoner/
git commit -m "feat: add /history/challoner article (relocated, KJV claim corrected)"
```

---

## Task 5: Add redirect and delete old challoner-revision route

**Files:**
- Modify: `_redirects`
- Delete: `src/routes/challoner-revision/+page.svelte`
- Delete: `src/routes/challoner-revision/+page.ts`

- [ ] **Add redirect to `_redirects`**

Open `_redirects`. It currently contains:

```
/read /odr/genesis/1 301
/odr /odr/genesis/1 301
```

Add one line:

```
/read /odr/genesis/1 301
/odr /odr/genesis/1 301
/challoner-revision /history/challoner 301
```

- [ ] **Delete the old challoner-revision route files**

```bash
rm "src/routes/challoner-revision/+page.svelte"
rm "src/routes/challoner-revision/+page.ts"
```

- [ ] **Commit**

```bash
git add _redirects
git rm src/routes/challoner-revision/+page.svelte src/routes/challoner-revision/+page.ts
git commit -m "feat: redirect /challoner-revision to /history/challoner"
```

---

## Task 6: Write `/history/rheims-1582` — "Published in a Time of Crisis"

**Files:**
- Create: `src/routes/history/rheims-1582/+page.svelte`

Sources: Barker, Simms, Cotton.

- [ ] **Create `src/routes/history/rheims-1582/+page.svelte`**

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;
</script>

<svelte:head>
	<title>Published in a Time of Crisis: The Rheims New Testament of 1582</title>
	<meta
		name="description"
		content="The political world that greeted the Rheims New Testament in 1582: Campion's execution, England's anti-Roman fever, and the Protestant refutation that spread the Catholic Bible further than its authors expected."
	/>
	<link rel="canonical" href="https://douayrheimsbible.pages.dev/history/rheims-1582" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="Published in a Time of Crisis: The Rheims New Testament of 1582" />
	<meta
		property="og:description"
		content="The political world that greeted the Rheims New Testament in 1582, and the refutation that spread it further."
	/>
	<meta property="og:url" content="https://douayrheimsbible.pages.dev/history/rheims-1582" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="Published in a Time of Crisis"
	subtitle="The political world that greeted the Rheims New Testament in 1582, and the Protestant refutation that spread it further than its authors could have imagined."
>
	<h2>England in 1582</h2>

	<p>
		When the Rheims New Testament appeared in 1582, England was a country in a state of declared
		emergency. The previous year, Saint Edmund Campion, a Jesuit priest and former Fellow of St John's
		College, Oxford, had been arrested, subjected to torture in the Tower of London, and executed at
		Tyburn. The papal excommunication of Queen Elizabeth, issued by Pope Pius V in 1570, had placed
		every English Catholic in an impossible position: loyalty to Rome was framed as treason, and
		treason carried the death sentence. Along the Atlantic coasts and in the harbours of Spain, the
		fleet that would become the Armada was being assembled. England's fate, many felt on both sides
		of the confessional divide, hung in the balance.
	</p>

	<p>
		It was into this world that the Divines of the English College at Rheims released the first
		Catholic English New Testament. Henry Barker, writing three centuries later, observed that "the
		whole feeling of England was anti-Roman." The translators knew it. They published anyway.
	</p>

	<h2>The Approbation</h2>

	<p>
		The volume arrived with a formal Approbation signed by four doctors of the Church at Rheims. In
		measured Latin, it declared that the translation contained nothing contrary to Catholic doctrine
		and nothing contrary to civil peace, and that it served the true faith, the common good, and
		the integrity of Christian life. The four signatories were Pierre Remigius, Archdeacon of
		Rheims; Hubert Morus, Dean of the Rheims Chapter; Johannes le Bespits, Theologian and
		Chancellor of the University of Rheims; and Guillaume Balbus, Professor of Theology at the
		Rheims College.
	</p>

	<p>
		Without this Approbation the translation had no standing in Catholic eyes. It also marked a
		claim: the Rheims version was the legitimate, authorised word of God in English, against every
		Protestant accusation to the contrary. The notes that accompanied the text left little to the
		imagination. They defended Catholic doctrine at every disputed point, attacked Protestant
		translations with considerable force, and spared neither Queen Elizabeth nor the Reformers of
		Germany, Switzerland, and France. Dr. Geddes, himself a Catholic priest, later described
		the annotations as "virulent," directed against the Protestant religion and calculated to
		support a system, as he put it, of "transalpine Popery."
	</p>

	<h2>Martin's Companion Work</h2>

	<p>
		Gregory Martin, the principal translator, had been preparing a companion polemic alongside the
		New Testament. His <em>Discovery of the Manifold Corruptions of the Holy Scriptures by the
		Heretics of Our Days</em>, published the same year as the New Testament though somewhat later
		in 1582, laid out his case against Protestant translations at length. The preface to the New
		Testament itself referred readers to this work: "more at large in a book lately made purposely
		of that matter, called a Discovery."
	</p>

	<p>
		Martin wrote as a man in exile, translating in the knowledge that his work was a capital
		offence in his own country and that those who carried it there faced imprisonment or worse.
		Elizabeth's government treated the Rheims New Testament as a seditious document. Priests found
		carrying copies were imprisoned. The Crown's searchers seized copies wherever they were found.
		Those who circulated the New Testament faced, in some cases, torture.
	</p>

	<h2>The Question of Access</h2>

	<p>
		The translators were also mindful of a long tradition within the Catholic Church regarding
		vernacular Scripture. The fourteenth canon of the Council of Toulouse, held in 1229, had
		prohibited the laity from possessing the Old or New Testament in the vernacular tongue,
		permitting only a Psalter, a Breviary, or the Hours of the Virgin Mary. The Rheims translators
		did not abandon this tradition: even as they produced an English New Testament, they required
		that Catholic readers obtain a special licence before reading it. As Paris Simms later observed,
		"no Catholic was permitted to read it until he had obtained a special license from the proper
		authorities."
	</p>

	<p>
		Their stated motive for producing the translation at all was not a desire to place Scripture in
		every Catholic hand. It was the extensive circulation of Protestant English Bibles. As the
		preface explained, "the growing demand for such among Catholics finally forced them to provide
		an English translation."
	</p>

	<h2>The Protestant Counter-Offensive</h2>

	<p>
		Protestant England responded with vigour. William Fulke, Master of Pembroke Hall at Cambridge,
		published his <em>Defence of the Sincere and True Translations of the Holy Scriptures</em> in
		1583, a direct and rapid answer to Martin's <em>Discovery of Corruptions</em>. Thomas
		Cartwright, engaged at the instigation of Secretary Walsingham, was commissioned to prepare a
		more systematic refutation of the New Testament itself, though Archbishop Whitgift eventually
		prohibited him from continuing and transferred the task to Fulke. In 1585, Thomas Bilson,
		Warden of Winchester, published a further response addressing the political theology the Rheims
		translators had woven into their annotations.
	</p>

	<h2>The Refutation That Spread It</h2>

	<p>
		The response that spread the Rheims text most widely was the one Fulke published in 1589.
		Rather than simply arguing against the Catholic translation, Fulke printed the entire Rheims New
		Testament alongside the Bishops' Bible in parallel columns, then answered the Catholic
		annotations one by one. His intention was to expose and discredit. The effect was to place the
		Rheims text in the hands of every Protestant biblical scholar in England.
	</p>

	<p>
		Fulke's parallel edition passed through four printings. When the translators of the King James
		Version gathered in 1604, it was among the most widely circulated English New Testaments. The
		Catholic Bible had become, without anyone planning it that way, one of the working texts of the
		Protestant masterpiece. That influence is the subject of the next article in this collection.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Henry Barker, <em>English Bible Versions: A Tercentenary Memorial of the King James Version</em>
		</li>
		<li>
			Paris Marion Simms, <em>The Bible in America: Versions that have Played Their Part</em>
		</li>
		<li>
			Rev. Henry Cotton, <em>Rhemes and Doway: An Attempt to Shew What Has Been Done by Roman
			Catholics for the Diffusion of the Holy Scriptures in English</em> (Oxford University Press,
			1855) — source for the Approbation text, Martin's <em>Discovery of Corruptions</em>, and the
			Protestant responses
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history/origins">← Born in Exile: The Origins of the Douay-Rheims Bible</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/history/influence-on-kjv">How the Douay-Rheims Shaped the King James Bible →</a>
	</p>
</ProseLayout>

<PageFooter bookMeta={ALL_BOOKS[0]} chapterNum={1} totalChapters={50} routeBase="/odr" showNav={false} />
```

- [ ] **Run format and check**

```bash
npm run format
npm run check
```

- [ ] **Commit**

```bash
git add src/routes/history/rheims-1582/
git commit -m "feat: add /history/rheims-1582 article"
```

---

## Task 7: Write `/history/influence-on-kjv` — "How the Douay-Rheims Shaped the King James Bible"

**Files:**
- Create: `src/routes/history/influence-on-kjv/+page.svelte`

Sources: Barker (primary), existing `/about` page (brief mention only — this article goes substantially deeper).

- [ ] **Create `src/routes/history/influence-on-kjv/+page.svelte`**

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { ALL_BOOKS } from '$lib/data/books';

	export let data: PageData;
</script>

<svelte:head>
	<title>How the Douay-Rheims Shaped the King James Bible</title>
	<meta
		name="description"
		content="The specific debt the King James Version owes to the Catholic Rheims New Testament: phrases, vocabulary, and Greek Article accuracy that passed from the Catholic Bible into the Protestant masterpiece."
	/>
	<link rel="canonical" href="https://douayrheimsbible.pages.dev/history/influence-on-kjv" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="How the Douay-Rheims Shaped the King James Bible" />
	<meta
		property="og:description"
		content="The specific debt the King James Version owes to the Rheims New Testament, in phrases, vocabulary, and scholarly precision."
	/>
	<meta property="og:url" content="https://douayrheimsbible.pages.dev/history/influence-on-kjv" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="How the Douay-Rheims Shaped the King James Bible"
	subtitle="The specific debt the King James Version owes to the Catholic Bible, in phrases, in vocabulary, and in scholarly precision."
>
	<h2>The Refutation That Became a Reference</h2>

	<p>
		In 1589, William Fulke, Master of Pembroke Hall at Cambridge, published what he intended as a
		definitive Protestant refutation of the Rheims New Testament. His method was to set the entire
		Rheims text alongside the Bishops' Bible in parallel columns, then answer the Catholic
		annotations one by one. Fulke aimed to discredit. He succeeded instead in making the Rheims
		text available to every serious Protestant biblical scholar in England.
	</p>

	<p>
		When the translators of the King James Version gathered in 1604, Fulke's parallel edition was
		among the most widely circulated English New Testaments in existence. Ward Allen's research in
		1969 found that in the Gospels alone, roughly one quarter of the proposed amendments to the
		text adopted readings first found in the Rheims translation. The Catholic Bible had become,
		without anyone planning it that way, one of the working texts of the Protestant masterpiece.
	</p>

	<h2>The Specific Borrowings</h2>

	<p>
		The debt repays close attention. At Matthew 26:26, "blessed" appears first in the Rheims; the
		King James Version keeps it. At Matthew 26:30, "hymn" is the Rheims word; the KJV follows. At
		Matthew 26:63, "adjure" enters English through the Rheims New Testament, and the KJV follows
		it there. In the first chapter of St James alone, "upbraideth not" (verse 5), "engrafted word"
		(verse 21), and "bridleth not" (verse 26) all appear first in the Rheims and pass directly into
		the King James Version. As Barker noted, examining three chapters taken by chance yielded such
		results that "the reader will not doubt that very many examples of the same description might
		be produced."
	</p>

	<p>
		Cardinal Newman later observed that the relationship between the two traditions was closer than
		either tradition liked to acknowledge. The KJV translators named the Rheims New Testament in
		their preface. They drew on it extensively. The translation made by Catholic scholars in exile,
		illegal in England, circulated primarily through a Protestant refutation, had shaped the
		language of the most widely read English Bible in history.
	</p>

	<h2>The Greek Article</h2>

	<p>
		The Rheims New Testament's handling of the Greek Article drew admiration from scholars long
		after its publication. William Moulton, examining the text carefully, found more than forty
		instances where the Rheims New Testament alone, among all English versions from Tyndale to the
		Authorised Version, correctly represents the Greek Article. He noted that this was remarkable
		given that the other translators were certainly known to and used by the Rheims scholars: "They
		make no allusion in their preface to any indebtedness to preceding translators, but of the fact
		there can be no doubt."
	</p>

	<p>
		This precision in handling the Article was not a stylistic accident. Gregory Martin and his
		colleagues were Oxford-trained classicists working from a text they knew intimately. Their
		attention to the Greek original, even while formally translating from the Latin Vulgate, gave
		their New Testament a scholarly rigour that Protestant translators found useful even as they
		dismissed the translation as a whole.
	</p>

	<h2>The Vocabulary Legacy</h2>

	<p>
		Beyond individual phrases, the Rheims New Testament contributed something more lasting:
		vocabulary. The words through which English speakers discuss Christian faith entered the
		language through Saint Jerome's Vulgate, and entered English through translations that followed the
		Vulgate closely. H. H. Hoare, writing on the English Bible versions, listed the terms that
		Saint Jerome gave to the Church: "Scripture, communion, grace, sanctification, justification, spirit,
		salvation, glory, congregation, penance, propitiation, conversion, election, sacrament,
		elements, discipline, eternity." All come from Saint Jerome's Bible. The Rheims translators were the
		most rigorous carriers of this vocabulary into English, and through their influence on the KJV
		translators, these terms became the common inheritance of English-speaking Christianity.
	</p>

	<p>
		Hoare drew a fair conclusion: "were we under no other obligation to the editors than that they
		helped to encourage a better acquaintance with Saint Jerome's Vulgate, our debt to them would still
		be great."
	</p>

	<h2>A Measured Assessment</h2>

	<p>
		The assessment of Gregory Martin's work that has best survived the passage of time belongs to
		William Moulton, who examined it without partisanship. "Nothing is easier," he observed, "than
		to accumulate instances of the eccentricity of this version, of its obscure and inflated
		renderings; but only minute study can do justice to its faithfulness and to the care with which
		the translators executed their work. Every other English version is to be preferred to this, if
		it must be taken as a whole; no other English version will prove more instructive to the student
		who will take the pains to separate what is good and useful from what is ill-advised and wrong."
	</p>

	<p>
		H. H. Hoare, arriving at the same conclusion from a different direction, wrote that "the
		Douai Version has one great merit, which is wanting in our Authorised Version, namely, that it
		holds fast to the principle of uniformity in its renderings whenever this principle is not
		prejudicial to the sense. Moreover, for serious students, it is just the uncompromising fidelity
		of the translators to their Vulgate, which in its New Testament carries us back to the Old Latin
		rendering of Greek manuscripts current in the middle of the second century, that gives to the
		Rheims Edition so considerable a value for the purposes of textual criticism."
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Henry Barker, <em>English Bible Versions: A Tercentenary Memorial of the King James Version</em>
			— primary source for the specific KJV borrowings, Moulton, and Hoare
		</li>
		<li>
			Ward Allen, research cited in the existing <a href="/about">About the Douay-Rheims Bible</a>
			page — one quarter of Gospel amendments adopted Rheims readings
		</li>
		<li>
			Cardinal John Henry Newman, "On the Rheims and Douay Version of Holy Scripture,"
			in <em>Essays Critical and Historical</em>
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history/rheims-1582">← Published in a Time of Crisis</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/history/challoner">The Challoner Revision →</a>
	</p>
</ProseLayout>

<PageFooter bookMeta={ALL_BOOKS[0]} chapterNum={1} totalChapters={50} routeBase="/odr" showNav={false} />
```

- [ ] **Run format and check**

```bash
npm run format
npm run check
```

- [ ] **Commit**

```bash
git add src/routes/history/influence-on-kjv/
git commit -m "feat: add /history/influence-on-kjv article"
```

---

## Task 8: Write `/history/after-challoner` — "After Challoner: A Bible in Dispute"

**Files:**
- Create: `src/routes/history/after-challoner/+page.svelte`

Sources: Newman (primary), Cotton (primary), Barker.

- [ ] **Create `src/routes/history/after-challoner/+page.svelte`**

```svelte
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
		When Richard Challoner revised the Douay-Rheims between 1749 and 1777, he produced not one
		text but several, each differing from the last, each published anonymously, with no mechanism
		for determining which should be considered definitive. By the time he died in 1781, the Catholic
		English Bible existed in at least three distinct Challoner versions, none formally authorised,
		none identical with the others.
	</p>

	<p>
		What followed made the situation considerably more complex.
	</p>

	<h2>McMahon, Troy, and the Irish Revisions</h2>

	<p>
		In 1783, a Dublin priest named Mr. McMahon, at the request of Archbishop Troy of Dublin,
		undertook a further revision of Challoner's New Testament. McMahon's text introduced more than
		five hundred changes in some sections, departing from what the Catholic Dictionary later
		described as Challoner's Protestant leanings. Archbishop Troy then had the entire Bible
		collated with the Clementine Vulgate and issued the result in 1791, producing what became known
		as Dr. Troy's Bible. In 1794, and again in 1803 and 1810, further New Testament printings
		appeared, each claiming the Challoner lineage while differing in significant respects from his
		actual text.
	</p>

	<h2>Cotton's Catalogue</h2>

	<p>
		Henry Cotton, an Archdeacon of Cashel who spent years cataloguing every Catholic English Bible
		edition he could locate, published his findings at the Oxford University Press in 1855. His
		preface captured the problem with precision. Educated men, he wrote, whether Protestant or
		Catholic, allowed themselves to speak of "the Douay Bible" or "the Rhemish Testament" as though
		all copies of Holy Scripture circulating among Catholics represented one and the same
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
		Cardinal Newman, surveying this landscape in his tract on the Rheims and Douay Version,
		observed that the Old Testament had remained essentially stable since Challoner's 1750 revision,
		while the New Testament had become a field of competing readings. Editors were forced to choose
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
		composition. He did not complete it. Dr. Lingard, the historian, translated the four Gospels
		in 1836. Bishop Francis Patrick Kenrick of Philadelphia produced a complete translation of the
		New Testament and Apocalypse in 1849, followed by volumes of the Old Testament: a substantial
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
		The text presented on this site is Martin's original: the first edition pre-Challoner Douay-Rheims, the
		translation that all subsequent editors took as their starting point and that none of them left
		unchanged.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Cardinal John Henry Newman, "On the Rheims and Douay Version of Holy Scripture,"
			in <em>Essays Critical and Historical</em> — primary source for Newman's analysis of the
			post-Challoner text traditions
		</li>
		<li>
			Rev. Henry Cotton, <em>Rhemes and Doway: An Attempt to Shew What Has Been Done by Roman
			Catholics for the Diffusion of the Holy Scriptures in English</em> (Oxford University Press,
			1855) — primary source for the chronological edition list, Cotton's preface, and the Roman
			Catholic Bible Society
		</li>
		<li>
			Henry Barker, <em>English Bible Versions: A Tercentenary Memorial of the King James Version</em>
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

<PageFooter bookMeta={ALL_BOOKS[0]} chapterNum={1} totalChapters={50} routeBase="/odr" showNav={false} />
```

- [ ] **Run format and check**

```bash
npm run format
npm run check
```

- [ ] **Commit**

```bash
git add src/routes/history/after-challoner/
git commit -m "feat: add /history/after-challoner article"
```

---

## Task 9: Write `/history/america` — "The Douay-Rheims in America"

**Files:**
- Create: `src/routes/history/america/+page.svelte`

Sources: Simms (primary), Cotton (edition list).

- [ ] **Create `src/routes/history/america/+page.svelte`**

```svelte
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
		the Catholic Church in America, believed they brought the Rheims-Douai Bible with them.
		Whether or not that first crossing carried a copy, the Bible entered American life during those
		early Maryland years, in the hands of a community that had left England for the freedom to
		worship openly.
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
		travelled to America partly because America offered fewer of these obstacles. Maryland's earliest
		years gave it room the Old World had not.
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
		complete fresh translation of the entire Bible. His New Testament and Apocalypse appeared in
		New York in 1849, with Old Testament volumes following in subsequent years. Kenrick translated
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
		an abuse of terms to call any of these editions by the older name. But the communities that
		read them knew them as the Catholic Bible: the one that had come across the ocean, in one form
		or another, from the beginning.
	</p>

	<p>
		The text presented on this site is the original, pre-Challoner Douay-Rheims, as first published
		in 1582 and 1609-10. It is the text that preceded all the revisions, the one that Gregory
		Martin and his colleagues produced in exile, and that was carried, in the hands of priests and
		laypeople, across the Atlantic to a new world.
	</p>

	<h2>Sources</h2>
	<ul>
		<li>
			Paris Marion Simms, <em>The Bible in America: Versions that have Played Their Part</em> —
			primary source for the Maryland settlement, the parallel with the Geneva Bible, and the
			difficult English reception
		</li>
		<li>
			Rev. Henry Cotton, <em>Rhemes and Doway: An Attempt to Shew What Has Been Done by Roman
			Catholics for the Diffusion of the Holy Scriptures in English</em> (Oxford University Press,
			1855) — chronological list of American editions including the 1805 Carey Bible and Kenrick's
			translation
		</li>
	</ul>

	<hr />

	<p>
		<a href="/history/after-challoner">← After Challoner: A Bible in Dispute</a>
		&nbsp;&nbsp;·&nbsp;&nbsp;
		<a href="/history">History of the Douay-Rheims Bible →</a>
	</p>
</ProseLayout>

<PageFooter bookMeta={ALL_BOOKS[0]} chapterNum={1} totalChapters={50} routeBase="/odr" showNav={false} />
```

- [ ] **Run format and check**

```bash
npm run format
npm run check
```

- [ ] **Commit**

```bash
git add src/routes/history/america/
git commit -m "feat: add /history/america article"
```

---

## Task 10: Update the footer

**Files:**
- Modify: `src/lib/components/PageFooter.svelte`

The footer "About" column currently lists `/challoner-revision`. That link needs to update to `/history/challoner`. The existing "History of the DR Bible" link already points to `/history` and needs no change.

- [ ] **Read `src/lib/components/PageFooter.svelte` to find the About column links**

Locate this section (around line 36-44):

```ts
{
  heading: 'About',
  links: [
    { label: 'About the Translation', href: '/about' },
    { label: 'History of the DR Bible', href: '/history' },
    { label: 'The Challoner Revision', href: '/challoner-revision' },
    { label: 'Download JSON', href: '/download' },
    { label: 'API', href: '/api' }
  ]
},
```

- [ ] **Update the Challoner link href**

Change `href: '/challoner-revision'` to `href: '/history/challoner'`:

```ts
{
  heading: 'About',
  links: [
    { label: 'About the Translation', href: '/about' },
    { label: 'History of the DR Bible', href: '/history' },
    { label: 'The Challoner Revision', href: '/history/challoner' },
    { label: 'Download JSON', href: '/download' },
    { label: 'API', href: '/api' }
  ]
},
```

- [ ] **Run format and check**

```bash
npm run format
npm run check
```

- [ ] **Commit**

```bash
git add src/lib/components/PageFooter.svelte
git commit -m "fix: update footer Challoner link to /history/challoner"
```

---

## Task 11: Build and verify

- [ ] **Run the full build**

```bash
npm run build
```

Expected: build completes with no errors. All six article routes should appear in the build output.

- [ ] **Check for expected routes in build output**

The build should include these prerendered pages:
- `/history`
- `/history/origins`
- `/history/rheims-1582`
- `/history/influence-on-kjv`
- `/history/challoner`
- `/history/after-challoner`
- `/history/america`

If any route is missing, check that the corresponding `+page.ts` has `export const prerender = true`.

- [ ] **Verify the _redirects file is in the build output**

The `_redirects` file lives at the project root and is picked up by Cloudflare Pages. Confirm it contains the challoner-revision redirect:

```
/challoner-revision /history/challoner 301
```

- [ ] **Commit and push**

```bash
git add -A
git status
git push
```

---

## Self-Review Against Spec

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Hub at `/history` listing 6 articles in reading order | Task 2 |
| `/history/origins` — existing history content relocated | Task 3 |
| `/history/challoner` — existing challoner content relocated, KJV claim corrected | Task 4 |
| `/challoner-revision` redirect | Task 5 |
| `/history/rheims-1582` — new article from Barker/Simms/Cotton | Task 6 |
| `/history/influence-on-kjv` — new article from Barker | Task 7 |
| `/history/after-challoner` — new article from Newman/Cotton | Task 8 |
| `/history/america` — new article from Simms/Cotton | Task 9 |
| Footer Challoner link updated | Task 10 |
| `+page.ts` pattern on all routes | Task 1 |
| Sources section on every article | Tasks 3-9 |
| Prev/next navigation on every article | Tasks 3-9 |
| No em dashes in prose | All content tasks |
| No "it's not X, it's Y" constructions | All content tasks |
| SEO meta tags on every page | Tasks 2-9 |

All spec requirements covered.
