# History Articles Section Design

**Date:** 2026-03-27
**Status:** Approved

## Overview

Replace the single `/history` page and `/challoner-revision` page with a curated
collection of six articles under a `/history` hub. The section serves two goals:
SEO (targeted, substantive articles on well-searched topics) and reader education
(a delightful reading progression through the origins, language, influence, and
legacy of the Douay-Rheims Bible).

## Sources

- **Henry Barker**, *English Bible Versions, A Tercentenary Memorial of the King*
  (600-line text excerpt) — rich on 1582 political context, Latinisms, KJV influence
- **Paris Marion Simms**, *The Bible in America* (135-line text excerpt) — Douay-Rheims
  in America, Latinism examples, post-Challoner editions
- **Cardinal Newman**, "Rheims and Douay Bible" (Newman Reader) — scholarly analysis
  of Challoner's revisions and the competing post-Challoner text traditions
- **Rev. Henry Cotton**, *Rhemes and Doway* (Oxford, 1855) — exhaustive bibliographic
  survey; primary source for the chronological edition list and post-Challoner history.
  Partial text in SCRIPTURA/sources/ODR/ODR/articles/rhemesanddoway; full PDF at
  /Users/Janvier/Downloads/rhemesanddoway00cottuoft.pdf

## Style Constraints

- No em dashes
- No "it's not X, it's Y" constructions
- Beautiful, delightful, flowing prose throughout
- Scholarly but accessible — written for curious readers, not academics

## Architecture

**Pattern:** Option A — one static `+page.svelte` per article, consistent with all
existing prose pages on the site. No new dependencies.

### `+page.ts` Pattern

All article `+page.ts` files follow the existing pattern:
```ts
export const prerender = true;
export const load: PageLoad = () => ({ showLayoutTopBar: false });
```

The hub `+page.ts` follows the same pattern.

### Route Structure

```
src/routes/
  history/
    +page.svelte              NEW: hub index page
    +page.ts                  NEW: prerender + hide top bar
    origins/
      +page.svelte            MOVED: existing /history content, retitled
      +page.ts                MOVED: existing +page.ts
    challoner/
      +page.svelte            MOVED: existing /challoner-revision content
      +page.ts                MOVED: existing +page.ts
    rheims-1582/
      +page.svelte            NEW article
      +page.ts
    influence-on-kjv/
      +page.svelte            NEW article
      +page.ts
    after-challoner/
      +page.svelte            NEW article
      +page.ts
    america/
      +page.svelte            NEW article
      +page.ts

  challoner-revision/
    +page.ts                  REDIRECT ONLY: redirect() to /history/challoner
```

### URL Changes

| Old URL | New URL | Action |
|---|---|---|
| `/history` | `/history` | Content replaced with hub |
| `/history` (old content) | `/history/origins` | Content moved |
| `/challoner-revision` | `/history/challoner` | Content moved + redirect |

The old `/history` URL becomes the hub automatically. No redirect needed since
the hub is the natural successor to the single history page.

## Hub Page Design (`/history`)

Uses `ProseLayout` with:

- Brief editorial introduction (3-4 sentences) explaining the collection
- Numbered reading list — 6 entries, each with title, one-line description, and link
- Numbers signal reading order without enforcing it
- No footer Bible navigation (`showNav={false}`)

The hub is the landing point for SEO on broad queries ("history of the Douay-Rheims
Bible") and routes readers into the specific articles.

## Article Navigation Pattern

Each article includes at the bottom:

- A `←` link to the previous article in the collection (or back to hub on first)
- A `→` link to the next article in the collection (or to hub on last)
- A **Sources** section listing the works drawn upon for that article

This replaces the existing `← History · Challoner →` pattern on the current pages.

## Sources Section (per article)

Every article ends with a `<h2>Sources</h2>` section before the prev/next nav.
List only the sources actually used for that article's content. Format as an
unordered list. For each source include: author, title (italicised), and enough
bibliographic detail to be useful (year, publisher where known). Example:

```html
<h2>Sources</h2>
<ul>
  <li>Henry Barker, <em>English Bible Versions: A Tercentenary Memorial</em></li>
  <li>Paris Marion Simms, <em>The Bible in America: Versions that have Played
      Their Part</em></li>
  <li>Rev. Henry Cotton, <em>Rhemes and Doway</em> (Oxford University Press, 1855)</li>
  <li>Cardinal John Henry Newman, "On the Rheims and Douay Version of Holy
      Scripture," collected in <em>Essays Critical and Historical</em></li>
</ul>
```

Articles 1 and 4 (moved from existing pages) also receive a Sources section
written for the first time, drawing on whatever the original content cited.

## Articles

### 1. Born in Exile: The Origins of the Douay-Rheims Bible
**Slug:** `/history/origins`
**Source:** Existing `/history` page content — retitled, prose body unchanged
**Changes needed:** New title, new canonical URL, new prev/next navigation row
**Covers:** English Reformation, founding of Douai College 1568, Gregory Martin's
translation, Rheims NT 1582, Douay OT 1609-10, reception and legacy

### 2. Published in a Time of Crisis
**Slug:** `/history/rheims-1582`
**Source:** Barker + Simms + Cotton
**Covers:**
- England in 1582: Campion's execution the previous year, the papal excommunication
  of Elizabeth, the Armada gathering, the fevered anti-Roman atmosphere
- The formal Approbation of the Rheims NT (four Rheims doctors, Cotton primary source)
- Gregory Martin's companion work: *Discovery of the Manifold Corruptions* (1582),
  published the same year as the NT
- The Protestant counter-offensive: Fulke's *Defence* (1583), Thomas Cartwright
  engaged by Secretary Walsingham, Thomas Bilson (1585)
- The central irony: Fulke's 1589 parallel-column refutation put the Rheims text
  into every Protestant scholar's hands, feeding the KJV committee directly
- The Council of Toulouse (1229) canon restricting vernacular Bible possession,
  and the translators' own licensing restrictions on Catholic readers

**What to avoid repeating:** The founding of the college and Gregory Martin's
biography are already in `/history/origins`. This article picks up where that one
ends: the publication moment and its political world.

### 3. How the Douay-Rheims Shaped the King James Bible
**Slug:** `/history/influence-on-kjv`
**Source:** Barker (strongest), Simms, existing `/about` page (brief mention only)
**Covers:**
- Fulke's 1589 parallel edition as the mechanism: a Protestant refutation becomes
  the Catholic Bible's widest distribution
- Specific phrases the KJV adopted from the Rheims NT:
  "upbraideth not" (James 1:5), "engrafted word" (James 1:21), "bridleth not"
  (James 1:26), "adjure" (Matt 26:63), "hymn" (Matt 26:30), "blessed" (Matt 26:26)
- The Greek Article accuracy: Moulton found 40+ instances where the Rheims NT alone
  among all English versions correctly handles the Greek Article
- The vocabulary legacy: "Scripture," "communion," "grace," "sanctification,"
  "justification," "sacrament," "eternity" — all from Jerome's Vulgate, carried
  into English via the Rheims translation
- Hoare's assessment: "no other English version will prove more instructive to the
  student who will take the pains to separate what is good and useful from what is
  ill-advised and wrong"
- Ward Allen's 1969 research: roughly one quarter of proposed Gospel amendments in
  the KJV adopted Rheims readings

**What to avoid repeating:** The `/about` page has a paragraph summarising the KJV
influence. This article goes substantially deeper with specific evidence and quotes.

### 4. The Challoner Revision
**Slug:** `/history/challoner`
**Source:** Existing `/challoner-revision` page content — moved, with one correction
**Changes needed:** New canonical URL, new prev/next navigation row, KJV claim corrected

**KJV claim correction:** The existing page states Challoner "approximated the King
James Version" as a deliberate pragmatic choice. The sources do not support this
framing. Newman says Challoner's text "approximates to the Protestant version" —
describing the result, not the method. The Catholic Dictionary (via Barker) says the
same. There is no evidence in the sources that Challoner used the KJV as a reference.
The implementation must remove or rephrase the bullet point "Approximated the King
James Version" and the surrounding editorial commentary. The observable fact (his
text ended up closer to the KJV in phrasing) may be noted, but the causal claim
(he deliberately drew on it) must not be stated unless a source explicitly says so.

**Covers:** Challoner's biography, what he changed, multiple editions, examples,
Newman's "almost a new translation," Wiseman's "abuse of terms," why the original matters

### 5. After Challoner: A Bible in Dispute
**Slug:** `/history/after-challoner`
**Source:** Newman (primary), Cotton (primary), Barker
**Covers:**
- The proliferation of competing editions after Challoner: McMahon (1783/1791),
  Archbishop Troy's collation with the Clementine Vulgate, Gibson's editions (1816-17),
  Murray's (1825), Denvir's (various), Haydock's with the old Rhemish notes
- Cotton's framing: educated men speak of "the Douay Bible" not knowing there were
  dozens of competing texts, no two identical
- Newman's analysis of the four text traditions by the 1850s (the Murray/Denvir
  Irish line and the Wiseman/Haydock English/American line)
- The Roman Catholic Bible Society (1815) publishing its own edition in London
- Dr. Lingard's independent translation (1836) and Bishop Kenrick's American
  translation (1849-51)
- What "the Douay-Rheims Bible" means in this context: a family of related texts,
  not a single fixed document
- Cotton's preface question: whether there is any authorised standard text of the
  Roman Catholic English Bible, or any uniform interpretation

### 6. The Douay-Rheims in America
**Slug:** `/history/america`
**Source:** Simms (primary), Cotton (edition list)
**Covers:**
- Maryland 1634: Catholics under Cecelius Calvert, the second Lord Baltimore,
  bringing the Rheims-Douai to the New World
- The parallel with the Geneva Bible: Protestant exiles made one Bible, Catholic
  exiles made the other
- The Rheims NT's difficult reception: priests imprisoned for carrying copies,
  copies seized by Elizabeth's searchers, torture used on those who circulated it
- Challoner's text first published in America in 1790, in Philadelphia
- The 1805 Philadelphia Bible (M. Carey) — the first full American Catholic Bible
- Bishop Kenrick's American translation (1849-51): New York, a fresh translation
  for a new Catholic population
- The Bible's role in American Catholic identity through the nineteenth century

## Footer Update

`PageFooter.svelte` "About" column gains:

- Remove: "History of the DR Bible" (old single page)
- Add: "History of the DR Bible" pointing to `/history` (the new hub)

The challoner-revision link in the footer (if present) updates to `/history/challoner`.

## SEO Notes

Each article gets:
- Unique `<title>` and `<meta name="description">` targeting different search queries
- `og:type` of `"article"`
- Canonical URL pointing to the new slug
- The hub gets `og:type` of `"website"` and targets broad history queries

## What This Does Not Change

- `/about` page — stays at its URL, content unchanged
- All Bible reader routes (`/odr/`, `/books/`, `/compare/`, `/search/`)
- `ProseLayout` component — used as-is by all new pages
- `PageFooter` component — only the link targets change
