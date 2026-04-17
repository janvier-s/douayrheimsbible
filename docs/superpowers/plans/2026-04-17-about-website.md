# About This Website — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an `/about` page describing the site's purpose, origin, features, and stats; rename `/history/about` to `/history/the-douay-rheims` with a 301 redirect preserving old links.

**Architecture:** Three phases — (1) rename the existing history page and wire up its redirect, (2) update every internal reference to the old URL, (3) build the new `/about` page. Each phase is independently committable. No new components; stat cards are inline styles within the page file.

**Tech Stack:** SvelteKit, Svelte 5, TypeScript, CSS custom properties (`--color-*`, `--font-*` from `app.css`), Playwright for e2e tests.

---

## File Map

| Action | File |
|---|---|
| Create | `src/routes/history/the-douay-rheims/+page.svelte` |
| Create | `src/routes/history/the-douay-rheims/+page.ts` |
| Create | `src/routes/history/about/+server.ts` (new — 301 redirect) |
| Delete | `src/routes/history/about/+page.svelte` |
| Delete | `src/routes/history/about/+page.ts` |
| Delete | `src/routes/about/+server.ts` |
| Create | `src/routes/about/+page.ts` |
| Create | `src/routes/about/+page.svelte` |
| Modify | `src/lib/components/ProseLayout.svelte` (breadcrumb label map) |
| Modify | `src/lib/components/SiteFooter.svelte` (footer link href) |
| Modify | `src/lib/components/BrandingRow.svelte` (nav link href) |
| Modify | `src/routes/history/+page.svelte` (article list first item) |
| Modify | `src/routes/history/after-challoner/+page.svelte` (inline link) |
| Modify | `src/routes/sitemap.xml/+server.ts` (add /about, update /history/about) |
| Create | `tests/e2e/about.test.ts` |

---

## Task 1: Create `/history/the-douay-rheims` route

**Files:**
- Create: `src/routes/history/the-douay-rheims/+page.ts`
- Create: `src/routes/history/the-douay-rheims/+page.svelte`

- [ ] **Step 1: Create the load file**

Create `src/routes/history/the-douay-rheims/+page.ts` — identical to the old `history/about/+page.ts`:

```typescript
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => {
	return { showLayoutTopBar: false };
};
```

- [ ] **Step 2: Create the page file**

Create `src/routes/history/the-douay-rheims/+page.svelte` — copy of `src/routes/history/about/+page.svelte` with three meta tag values updated. The full file (only the `<svelte:head>` block changes):

```svelte
<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
	const ABOUT_FAQ = [
		{
			q: 'What is the Douay-Rheims Bible?',
			a: 'The Douay-Rheims Bible is the first complete English Catholic translation of Sacred Scripture, produced between 1582 and 1610 by English scholars living in exile in France and the Spanish Netherlands. It was translated primarily by Gregory Martin from the Latin Vulgate, with revisions by William Allen and Richard Bristow. It predates the King James Bible by nearly three decades.'
		},
		{
			q: 'Is the Douay-Rheims Bible still used by Catholics today?',
			a: 'The Douay-Rheims remains in use by traditional Catholics who prefer a formal-equivalence translation that preserves the theological vocabulary of the Latin Vulgate. It is not the official lectionary Bible used at Mass, but it is widely read for private study and prayer.'
		},
		{
			q: 'How is the Douay-Rheims different from other English Bible translations?',
			a: 'The Douay-Rheims is distinctive in three ways: it was translated from the Latin Vulgate rather than directly from the Hebrew and Greek; it preserves many Latinate theological terms such as "longsuffering," "supersubstantial," and "penance" that other translations render more loosely; and it reflects the doctrinal tradition of the Catholic Church through both its translation choices and its extensive annotations.'
		},
		{
			q: 'Which version of the Douay-Rheims is presented on this site?',
			a: "This site presents the original pre-Challoner text as first published in 1582 (New Testament) and 1609-1610 (Old Testament). Most printed Douay-Rheims Bibles today are Bishop Challoner's eighteenth-century revision, which altered the text so extensively that Cardinal Newman called it nearly a new translation. This site restores Gregory Martin's original."
		}
	];
</script>

<svelte:head>
	<title>About the Douay-Rheims Bible: English Catholic Scripture, 1582-1610</title>
	<meta
		name="description"
		content="The Douay-Rheims Bible is the first complete English Catholic translation of Sacred Scripture, translated by Gregory Martin from the Latin Vulgate. This site presents the original pre-Challoner text of 1582 and 1609-1610."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/history/the-douay-rheims" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="About the Douay-Rheims Bible" />
	<meta
		property="og:description"
		content="The first complete English Catholic translation of Sacred Scripture, faithfully rendered from the Latin Vulgate by English scholars in exile."
	/>
	<meta property="og:url" content="https://thedouayrheims.com/history/the-douay-rheims" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="About the Douay-Rheims Bible"
	subtitle="The first complete English Catholic translation of Sacred Scripture, rendered faithfully from the Latin Vulgate by English scholars in exile."
	faqItems={ABOUT_FAQ}
	datePublished="2024-01-01"
>
	<h2>What Is the Douay-Rheims Bible?</h2>

	<p>
		The Douay-Rheims Bible is the earliest complete English translation of the Bible produced by
		Catholic scholars. It was created by a group of former Oxford men living in exile on the
		European continent during the English Reformation, when the practice of the Catholic faith in
		England had been made illegal and possession of Catholic texts was a criminal offence.
	</p>

	<p>
		The New Testament was published in 1582 at Rheims in northern France, and the Old Testament
		followed in two volumes from Douai (then in the Spanish Netherlands) in 1609 and 1610. The
		complete work therefore predates the King James Version of 1611 by several decades.
	</p>

	<h2>The Translators</h2>

	<p>
		The principal translator was Gregory Martin, a distinguished scholar who had been among the
		first cohort of students at St John's College, Oxford, alongside his close friend Saint Edmund
		Campion, who would later be martyred for the faith. Martin began translating in October 1578,
		working at a pace of roughly two chapters per day, and is believed to have completed the entire
		Bible by around July 1580, an extraordinary feat of sustained scholarship.
	</p>

	<p>
		His work was proofread and revised by William Allen, the founder of the English College at
		Douai, together with Richard Bristow and Thomas Worthington, who also prepared the extensive
		theological annotations that accompanied the text. Martin did not live to see his Old Testament
		published. He died of tuberculosis on 28 October 1582, the same year the New Testament appeared,
		at approximately forty years of age.
	</p>

	<h2>The Source Text</h2>

	<p>
		The translators worked from the Latin Vulgate, the ancient Latin translation that the Council of
		Trent had declared the authoritative text for Catholic use. They also consulted the original
		Hebrew and Greek manuscripts for accuracy. This approach gave the translation a distinctively
		Latinate vocabulary, with words like <em>supersubstantial</em>, <em>longanimity</em>, and
		<em>benignity</em> appearing throughout. The
		<a href="https://en.wikisource.org/wiki/Catholic_Encyclopedia_(1913)/Douay_Bible"
			>Catholic Encyclopedia (1913)</a
		> described the result as "so full of Latinisms as to be in places hardly intelligible." The translators
		included a glossary to explain these terms, acknowledging the difficulty.
	</p>

	<p>
		The translators did not work from a single Greek manuscript tradition. In places their Vulgate
		source preserves readings that align with older manuscript families. For example, at James 2:20,
		the original Douay-Rheims reads "idle" (from the Greek <em>arge</em>), a reading found in the
		Codex Amiatinus, rather than "dead" (<em>nekra</em>) found in Erasmus's Textus Receptus and most
		Protestant translations.
	</p>

	<h2>Why It Was Created</h2>

	<p>
		By the late sixteenth century, several Protestant English translations of the Bible were already
		in circulation, including the Geneva Bible and the Bishops' Bible. Catholic scholars recognised
		the need for an English translation that was doctrinally sound, theologically precise, and
		faithful to the Vulgate tradition, one that could serve English-speaking Catholics who were
		increasingly cut off from Latin liturgical texts.
	</p>

	<p>
		The extensive annotations were designed not merely as commentary but as a direct response to the
		theological arguments of the Reformers, addressing points of doctrinal controversy verse by
		verse. The translators themselves stated their purpose was, in part, for "the more speedy
		abolishing of a number of false and impious translations."
	</p>

	<p>
		The completed Bible was illegal to own in England, and many copies were destroyed. It
		nonetheless remained the only Bible for English-speaking Catholics who could not read Latin, and
		its influence would prove far-reaching.
	</p>

	<h2>Influence on the King James Version</h2>

	<p>
		The translators of the King James Version (1611) explicitly acknowledged the Rheims New
		Testament in their preface, and scholarship has demonstrated that they drew upon it
		significantly. Research by Ward Allen in 1969 found that in the revision of the Gospels, roughly
		one quarter of the proposed amendments adopted readings from the Rheims text. The Rheims
		translation was made widely available to Protestant scholars through William Fulke's 1589
		parallel edition, which printed both texts side by side. Fulke intended this as a refutation,
		but it served instead as a convenient reference for the KJV committee. Saint John Henry Newman
		later observed that the relationship between the two translations was closer than either
		tradition liked to acknowledge.
	</p>

	<h2>Catholic Significance</h2>

	<p>
		For centuries, the Douay-Rheims served as the only authorised English Bible for Roman Catholics.
		It remained the standard text for English-speaking Catholics until the mid-twentieth century,
		when Pope Pius XII's 1943 encyclical <em>Divino Afflante Spiritu</em> opened the way for vernacular
		translations from the original Hebrew and Greek.
	</p>

	<h2>The Text on This Site</h2>

	<p>
		This site presents the original pre-Challoner text of the Douay-Rheims Bible, as first published
		in 1582 and 1609-1610. Nearly every "Douay-Rheims Bible" in print today is actually Bishop
		Challoner's mid-eighteenth-century revision, which altered the text so extensively that Cardinal
		Newman observed the changes "almost amounted to a new translation." The original text is
		significantly more Latinate in its vocabulary and closer to the Vulgate in its phrasing.
		Spelling and punctuation have been lightly modernised, but the translation itself is unaltered.
	</p>

	<p>
		To understand what Bishop Challoner changed and why, see
		<a href="/history/challoner">The Challoner Revision</a>. For the full story of how this
		translation came to exist, read on.
	</p>

	<hr />

	<p><a href="/history/origins">Born in Exile: The Origins of the Douay-Rheims Bible →</a></p>
</ProseLayout>
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
git add src/routes/history/the-douay-rheims/
git commit -m "feat: add /history/the-douay-rheims route (renamed from /history/about)"
```

---

## Task 2: Replace `/history/about` with a 301 redirect

**Files:**
- Delete: `src/routes/history/about/+page.svelte`
- Delete: `src/routes/history/about/+page.ts`
- Create: `src/routes/history/about/+server.ts`

- [ ] **Step 1: Delete the old page files**

```bash
rm "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible/src/routes/history/about/+page.svelte"
rm "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible/src/routes/history/about/+page.ts"
```

- [ ] **Step 2: Create the redirect server file**

Create `src/routes/history/about/+server.ts`:

```typescript
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	throw redirect(301, '/history/the-douay-rheims');
};
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/history/about/
git commit -m "feat: redirect /history/about to /history/the-douay-rheims (301)"
```

---

## Task 3: Update all internal references to `/history/about`

Six locations. Each is a one-line change.

**Files:**
- Modify: `src/lib/components/ProseLayout.svelte`
- Modify: `src/lib/components/SiteFooter.svelte`
- Modify: `src/lib/components/BrandingRow.svelte`
- Modify: `src/routes/history/+page.svelte`
- Modify: `src/routes/history/after-challoner/+page.svelte`
- Modify: `src/routes/sitemap.xml/+server.ts`

- [ ] **Step 1: Update ProseLayout breadcrumb label map**

In `src/lib/components/ProseLayout.svelte`, find the `PATH_LABELS` object (around line 16). Add the new key alongside the existing entries:

Change:
```typescript
const PATH_LABELS: Record<string, string> = {
    about: 'About',
```
To:
```typescript
const PATH_LABELS: Record<string, string> = {
    about: 'About',
    'the-douay-rheims': 'The Douay-Rheims Bible',
```

Also update the breadcrumb entry for the old path (line ~113). Find:
```typescript
{ path: '/history/about', label: 'About' },
```
Change to:
```typescript
{ path: '/history/the-douay-rheims', label: 'The Douay-Rheims Bible' },
```

- [ ] **Step 2: Update SiteFooter**

In `src/lib/components/SiteFooter.svelte`, find (around line 46):
```typescript
{ label: 'About the Translation', href: '/history/about' },
```
Change to:
```typescript
{ label: 'About the Translation', href: '/history/the-douay-rheims' },
```

- [ ] **Step 3: Update BrandingRow**

In `src/lib/components/BrandingRow.svelte`, find (around line 46):
```svelte
{ label: 'About', href: '/history/about' }
```
Change to:
```svelte
{ label: 'About', href: '/history/the-douay-rheims' }
```

- [ ] **Step 4: Update history index page**

In `src/routes/history/+page.svelte`, find the first article list item linking to `/history/about` and update both the href and any title text:

Find:
```svelte
<a href="/history/about" class="article-link">
    <span class="article-title">About the Douay-Rheims Bible</span>
```
Change to:
```svelte
<a href="/history/the-douay-rheims" class="article-link">
    <span class="article-title">About the Douay-Rheims Bible</span>
```

- [ ] **Step 5: Update after-challoner article**

In `src/routes/history/after-challoner/+page.svelte`, find (around line 161):
```svelte
href="/history/about">About the Douay-Rheims Bible</a
```
Change to:
```svelte
href="/history/the-douay-rheims">About the Douay-Rheims Bible</a
```

- [ ] **Step 6: Update sitemap**

In `src/routes/sitemap.xml/+server.ts`, find (around line 38):
```typescript
urls.push(entry('/history/about', '0.9', 'monthly'));
```
Change to:
```typescript
urls.push(entry('/about', '0.9', 'monthly'));
urls.push(entry('/history/the-douay-rheims', '0.9', 'monthly'));
```

- [ ] **Step 7: Verify no remaining `/history/about` references**

```bash
grep -r "history/about" "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible/src" --include="*.svelte" --include="*.ts"
```

Expected: only `src/routes/history/about/+server.ts` (the redirect file itself).

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/ src/routes/history/ src/routes/sitemap.xml/
git commit -m "refactor: update all internal links from /history/about to /history/the-douay-rheims"
```

---

## Task 4: Create the `/about` page

**Files:**
- Delete: `src/routes/about/+server.ts`
- Create: `src/routes/about/+page.ts`
- Create: `src/routes/about/+page.svelte`

- [ ] **Step 1: Delete the old redirect server file**

```bash
rm "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible/src/routes/about/+server.ts"
```

- [ ] **Step 2: Create the load file**

Create `src/routes/about/+page.ts`:

```typescript
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => {
	return { showLayoutTopBar: false };
};
```

- [ ] **Step 3: Create the page**

Create `src/routes/about/+page.svelte` with the full content below. The stat cards use an inline `<style>` block with the site's CSS variables.

```svelte
<script lang="ts">
	import ProseLayout from '$lib/components/ProseLayout.svelte';
</script>

<svelte:head>
	<title>About This Website | The Original Douay-Rheims Bible</title>
	<meta
		name="description"
		content="How and why this site was built: the first freely searchable digital edition of the Original Douay-Rheims Bible of 1582–1610, with all annotations, search, and study tools."
	/>
	<link rel="canonical" href="https://thedouayrheims.com/about" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="About This Website" />
	<meta
		property="og:description"
		content="The first freely searchable digital edition of the Original Douay-Rheims Bible, with all 1,707 annotations, full-text search, and side-by-side comparison."
	/>
	<meta property="og:url" content="https://thedouayrheims.com/about" />
	<meta property="og:site_name" content="Douay-Rheims Bible" />
</svelte:head>

<ProseLayout
	title="About This Website"
	subtitle="The first freely searchable digital edition of the Original Douay-Rheims Bible of 1582–1610, with all annotations, notes, and study tools."
>
	<h2>The Translation and the Gap</h2>

	<p>
		The Original Douay-Rheims Bible, the first complete English Catholic translation of Sacred
		Scripture, has never been freely available in a usable digital form. The Internet Archive holds
		a photographic facsimile in three separate tomes, in the original period spelling, photographed
		directly from sixteenth and seventeenth-century printed copies. It can be viewed but not
		searched, and the archaic orthography makes it difficult to read at pace.
	</p>

	<p>
		Dr. William G. von Peters has produced a careful modernised edition, available in print and as
		PDF through <a href="https://www.originaldouayrheims.com">originaldouayrheims.com</a> and
		<a href="https://www.realdouayrheims.com">realdouayrheims.com</a>. His work is meticulous, but
		it is copyrighted. It cannot be reproduced, searched, or built upon.
	</p>

	<p>
		This site was built to fill that gap: a freely accessible, fully searchable edition of Gregory
		Martin's original text, with all the annotations, prefaces, and reference material that the
		translators included.
	</p>

	<h2>The Source</h2>

	<p>
		Everything here rests on the work of Patrick Madueke, who assembled a GitLab repository
		dedicated to Our Lady of La Salette at
		<a href="https://gitlab.com/simple-gui/xml2gui-bible">gitlab.com/simple-gui/xml2gui-bible</a>.
		That repository contained PDF files of the complete Original Douay-Rheims Bible and the Latin
		Vulgate, placed there without copyright restriction. Without his work, this site could not have
		been built.
	</p>

	<h2>Built with AI</h2>

	<p>
		Extracting structured data from those PDFs, book by book, chapter by chapter, verse by verse,
		annotation by annotation, and then building the site around it, was possible only with the
		assistance of Claude, the AI model developed by Anthropic. The model served as the instrument
		throughout: parsing raw text, identifying structure, formatting data, and writing code. What
		began as a straightforward extraction task grew, with its help, into something considerably more
		ambitious.
	</p>

	<h2>What This Site Provides</h2>

	<h3>The Reader</h3>

	<p>
		The full text of all 76 books, with inline annotation markers, chapter arguments, and book
		introductions as they appeared in the original edition. Two reading modes are available: Reading
		mode presents the text cleanly, free of distraction; Study mode opens a side panel showing the
		full annotation for the current verse, scrolling in synchrony with the text.
	</p>

	<h3>Reading Options</h3>

	<p>
		The reader is extensively configurable. Typography settings cover font family (Libre Baskerville
		for scholarly reading, Sentinel, or Gotham for a cleaner sans-serif line), font size, line
		height, and column width in three steps. Display options include verse numbers, the rendering of
		italics (which mark words supplied by the translators, absent from the Latin), small caps, and
		paragraph view for those who prefer continuous prose over verse-by-verse layout.
	</p>

	<p>
		Four themes are available: light, sepia, dark, and OLED. Accessibility options include Bionic
		Reading with independently adjustable fixation depth, saccade size, and opacity, along with a
		dedicated dyslexia font. For scholars, a toggle switches between Douay book names and their
		modern equivalents, and a second toggle adjusts Psalm numbering between the Douay-Rheims and
		Hebrew traditions.
	</p>

	<h3>Search</h3>

	<p>
		The search engine was built specifically for the ODR's text. It understands Douay-Rheims book
		names natively: Josue, Isaie, Paralipomenon, Apocalypse, and the others can be typed directly
		into any reference query. It also folds ligatures, so typing <em>egypt</em> finds
		<em>Ægypt</em>, and <em>cesar</em> finds <em>Cæsar</em>, as they appear in the original text.
	</p>

	<p>
		Two search scopes are available and can be toggled independently: the verse text and the
		annotations. A search in one scope surfaces cross-scope suggestions from the other, so a word
		search in verses will note if the same term appears significantly in the annotation corpus.
		Glossary term suggestions appear inline when a query matches a word defined in the ODR's own
		<em>Explication of Certain Words</em>, linking directly to the definition.
	</p>

	<h3>Compare</h3>

	<p>
		A side-by-side comparison view places the ODR alongside other translations for any chapter. The
		King James Version and several Vulgate-tradition translations are currently available. The
		Revised Standard Version Catholic Edition is planned as a modern Catholic reference point.
	</p>

	<h3>History</h3>

	<p>
		Ten articles trace the story of the Douay-Rheims Bible from the founding of the English College
		at Douai through the Challoner revision and its reception in nineteenth-century America. They
		are arranged to be read in sequence but each stands on its own.
	</p>

	<h3>Articles</h3>

	<p>
		Shorter pieces on specific topics: the language of the translation, its theological
		distinctives, its relationship to the manuscript tradition, and its influence on the King James
		Bible.
	</p>

	<h3>Reference</h3>

	<p>
		The original prefatory and appended material from the 1582 and 1609-1610 editions: the New
		Testament and Old Testament prefaces, the table of corruptions of Protestant translations, the
		historical tables of the ages, and the glossary of hard words known as the
		<em>Explication of Certain Words</em>.
	</p>

	<h2>The ODR in Numbers</h2>

	<div class="stats-grid">
		<div class="stat-card">
			<span class="stat-number">76</span>
			<span class="stat-label">Books</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,362</span>
			<span class="stat-label">Chapters</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">37,196</span>
			<span class="stat-label">Verses</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,707</span>
			<span class="stat-label">Annotations</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">3,709</span>
			<span class="stat-label">Marginal notes</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,989</span>
			<span class="stat-label">Cross-references</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">1,236</span>
			<span class="stat-label">Chapter summaries</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">84</span>
			<span class="stat-label">Book arguments</span>
		</div>
	</div>

	<p class="stats-note">
		The 76 books include 73 of the Catholic canon and three further texts present in the Vulgate
		appendix: 3 Esdras, 4 Esdras, and the Prayer of Manasses. The 84 book arguments exceed 76
		because several books carry more than one prefatory section, a general introduction and
		separate arguments for distinct parts.
	</p>

	<h2>A Simple Idea</h2>

	<p>
		This began as a chapter selector: a plain page showing verses with a dropdown to move between
		chapters. It was meant to take a weekend. It grew, as such things do, into something else
		entirely. The annotations required a study panel. The study panel required sync. The search
		required an understanding of the ODR's own vocabulary. The comparison view required ingesting
		additional translations. Each feature was a natural consequence of the one before it.
	</p>

	<p>
		The result is this site. It is offered freely, for anyone who wishes to read, study, or pray
		with Gregory Martin's translation, as he and his fellow exiles intended it to be used.
	</p>
</ProseLayout>

<style>
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		background-color: var(--color-border);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
		margin: 2rem 0 1rem;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 28px 16px;
		background-color: var(--color-panel);
		text-align: center;
	}

	.stat-number {
		font-family: 'Gotham', var(--font-ui);
		font-size: 2.6rem;
		font-weight: 600;
		line-height: 1;
		color: var(--color-accent);
		letter-spacing: -0.02em;
	}

	.stat-label {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-variant: small-caps;
		font-weight: 500;
		letter-spacing: 0.08em;
		color: var(--color-subtle);
		text-transform: lowercase;
	}

	.stats-note {
		font-size: 0.85em;
		color: var(--color-subtle);
		font-style: italic;
		margin-top: 0.75rem;
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-number {
			font-size: 2rem;
		}
	}
</style>
```

- [ ] **Step 4: Verify dev server renders the page correctly**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npm run dev
```

Open `http://localhost:5173/about` — verify all six sections render, stat grid shows 4 columns, text is readable.  
Open `http://localhost:5173/history/about` — verify it redirects to `/history/the-douay-rheims`.  
Open `http://localhost:5173/history/the-douay-rheims` — verify the page loads with correct title and breadcrumb.

- [ ] **Step 5: Commit**

```bash
git add src/routes/about/
git commit -m "feat: add /about page with origin story, feature tour, and stat cards"
```

---

## Task 5: Add e2e tests

**Files:**
- Create: `tests/e2e/about.test.ts`

- [ ] **Step 1: Write the tests**

Create `tests/e2e/about.test.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('/about page loads with correct title', async ({ page }) => {
	await page.goto('/about');
	await expect(page).toHaveTitle(/About This Website/);
});

test('/about page renders all eight stat cards', async ({ page }) => {
	await page.goto('/about');
	const cards = page.locator('.stat-card');
	await expect(cards).toHaveCount(8);
});

test('/about stat cards show correct key numbers', async ({ page }) => {
	await page.goto('/about');
	await expect(page.locator('.stat-number').first()).toContainText('76');
	await expect(page.getByText('37,196')).toBeVisible();
	await expect(page.getByText('1,707')).toBeVisible();
});

test('/history/about redirects to /history/the-douay-rheims', async ({ page }) => {
	await page.goto('/history/about');
	await expect(page).toHaveURL('/history/the-douay-rheims');
});

test('/history/the-douay-rheims page loads', async ({ page }) => {
	await page.goto('/history/the-douay-rheims');
	await expect(page).toHaveTitle(/About the Douay-Rheims Bible/);
});

test('/about link in site footer points to correct URL', async ({ page }) => {
	await page.goto('/');
	const footerLink = page.locator('footer').getByRole('link', { name: 'About the Translation' });
	await expect(footerLink).toHaveAttribute('href', '/history/the-douay-rheims');
});
```

- [ ] **Step 2: Run the tests**

```bash
cd "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/douayrheimsbible"
npm run test:e2e -- tests/e2e/about.test.ts
```

Expected: all 6 tests pass. If the redirect test fails, confirm the dev server is running on the port Playwright expects (check `playwright.config.ts` for the `baseURL`).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/about.test.ts
git commit -m "test: add e2e tests for /about page and /history/about redirect"
```

---

## Self-Review

**Spec coverage:**
- [x] `/about` route created with prerender — Task 4
- [x] `/history/about` → `/history/the-douay-rheims` rename — Tasks 1 & 2
- [x] 301 redirect from old URL — Task 2
- [x] All 6 internal reference locations updated — Task 3
- [x] Sitemap updated with `/about` and new history URL — Task 3, Step 6
- [x] ProseLayout breadcrumb label for `the-douay-rheims` — Task 3, Step 1
- [x] Page section 1: translation and gap — Task 4, Step 3
- [x] Page section 2: credit to Madueke + GitLab link — Task 4, Step 3
- [x] Page section 3: built with Claude — Task 4, Step 3
- [x] Page section 4: all seven site areas described — Task 4, Step 3
- [x] Stat grid 4×2 desktop, 2×4 mobile, all 8 cards — Task 4, Step 3
- [x] Explanatory note about 84 > 76 — Task 4, Step 3
- [x] Closing section — Task 4, Step 3
- [x] No em dashes, no "not X. It was Y." in prose — verified in Step 3 content

**Placeholder scan:** No TBDs, no "implement later", no vague steps — all steps contain complete code.

**Type consistency:** No shared types across tasks. CSS class names `.stats-grid`, `.stat-card`, `.stat-number`, `.stat-label`, `.stats-note` are used consistently between the HTML and style block in Task 4.
