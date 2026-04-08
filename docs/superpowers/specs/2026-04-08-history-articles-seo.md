# History Articles SEO & Content Improvement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve all 12 /history articles for SEO discoverability and content depth, without altering the site's established Catholic apologetic voice and no-em-dash prose style.

**Architecture:** Pure content work within existing `.svelte` files. `ProseLayout` already handles Article, BreadcrumbList, and FAQPage JSON-LD schema — no technical scaffolding needed. Each article receives: keyword-targeted meta tags, expanded prose, inline internal links, inline outbound citations, and a `datePublished` prop.

**Authoritative sources available for citation:**
- https://archive.org/details/rhemesanddoway00cottuoft — Henry Cotton, *Rhemes and Doway* (1855)
- https://books.google.fr/books/about/English_Bible_Versions.html?id=WcwsNaXqE-kC — *English Bible Versions*
- https://www.ecatholic2000.com/douay-rheims-bible/ — eCatholic2000 DR text
- https://www.newmanreader.org/works/essays/volume1/index.html — Cardinal Newman's Essays
- https://books.google.com.py/books?id=F0dMAAAAIAAJ — Simms, *The Bible in America*
- https://en.wikisource.org/wiki/Catholic_Encyclopedia_(1913)/Douay_Bible — Catholic Encyclopedia (1913)
- https://realdouayrheims.com/ — Real Douay-Rheims (competitor, link from Challoner article)
- https://originaldouayrheims.com/about — Original Douay-Rheims about
- https://originaldouayrheims.com/differences — Original Douay-Rheims differences

**Per-article keyword targets:**

| Route | Primary Keyword | Secondary Keywords |
|-------|----------------|-------------------|
| about | Douay-Rheims Bible | Catholic English Bible, pre-Challoner, Gregory Martin translation |
| origins | origins of the Douay-Rheims Bible | English College Douai, Gregory Martin translator, Catholic Bible exile |
| challoner | Bishop Challoner Douay-Rheims revision | Challoner revision changes, pre-Challoner text, original Douay-Rheims |
| scripture-for-all | Catholic Bible reading | Catholics reading Scripture, lectio divina, Dei Verbum |
| forbidden-bible | Douay-Rheims Bible banned England | vernacular Bible Catholic, license to read Bible, Elizabethan recusancy |
| annotations | Rheims New Testament annotations | Douay-Rheims notes, Catholic Bible annotations 1582 |
| translation-philosophy | Douay-Rheims Latin Vulgate | translated from Vulgate, formal equivalence Catholic Bible |
| original-tongues | Catholic Bible original languages | Hebrew Greek Catholic translation, Divino Afflante Spiritu |
| influence-on-kjv | Douay-Rheims influence King James Bible | Catholic Bible King James Version, Rheims KJV borrowings |
| america | Douay-Rheims Bible America | Catholic Bible American history, Maryland Catholics 1634 |
| after-challoner | Douay-Rheims editions history | Catholic Bible editions, Haydock Bible, Cotton catalogue |
| rheims-1582 | Rheims New Testament 1582 | first Catholic English New Testament, 1582 publication |

**Style rules (from existing voice — must be preserved):**
- No em dashes in prose
- No "not X. It was Y." sentence pattern
- Catholic apologetic framing throughout
- Formal but accessible; target grade 8-9 readability (Flesch-Kincaid)
- Outbound links open in same tab (no `target="_blank"`)

**SEO rules applied per article:**
- Primary keyword appears in: `<title>`, `<meta name="description">`, H1 (or subtitle), and within first 100 words of body prose
- Semantic variants distributed across H2s and body paragraphs
- Each article links inline to at least 2 other history articles by name
- Each article has at least 1 outbound citation link to an authoritative source
- FAQ answers enriched where thin (target: 2-3 substantive sentences each)
- `datePublished="2024-01-01"` added to all ProseLayout calls (consistent baseline date)

---

## Articles

### Task 1: `/history/about` — "About the Douay-Rheims Bible"
**Primary keyword:** Douay-Rheims Bible
**Current state:** 175 lines, 4 FAQ items, 2 body sections. Thinnest article. Needs a third section and keyword tuning.
**Changes:**
- Meta title: `About the Douay-Rheims Bible | Catholic Scripture 1582–1610` (already good, keep)
- Meta description: inject "pre-Challoner original text" and "Gregory Martin"
- Subtitle: add "Douay-Rheims Bible" to first sentence if not present
- Prose first 100 words: ensure "Douay-Rheims Bible" appears naturally
- Add third section: **"This Edition"** — explain that this site presents Gregory Martin's original pre-Challoner text (not the Challoner revision), why that matters, and link to `/history/challoner` and `/history/origins`
- FAQ: expand answers to 2-3 sentences each where currently 1
- Outbound link: Catholic Encyclopedia (1913) on first mention of the translation's history
- Internal links: link to `/history/origins` and `/history/challoner` inline in prose

### Task 2: `/history/origins` — "Origins of the Douay-Rheims Bible"
**Primary keyword:** origins of the Douay-Rheims Bible
**Current state:** 217 lines, 4 FAQ items, good length.
**Changes:**
- Meta title: `The Origins of the Douay-Rheims Bible | English College Douai`
- Meta description: include "Gregory Martin", "English College Douai", "1582"
- Prose: inject primary keyword naturally in first paragraph
- Add section: **"The Delay"** — explain why the New Testament appeared in 1582 but the Old Testament not until 1609-1610 (funding difficulties, Gregory Martin's death, the English College's moves). Currently mentioned only briefly.
- Outbound: archive.org Cotton link on reference to "editions"
- Internal links: to `/history/translation-philosophy` and `/history/challoner`

### Task 3: `/history/challoner` — "The Challoner Revision"
**Primary keyword:** Bishop Challoner Douay-Rheims revision
**Current state:** 324 lines, strongest article. Needs new section and competitor outbound links.
**Changes:**
- Meta title: `Bishop Challoner's Revision of the Douay-Rheims Bible`
- Meta description: include "pre-Challoner original", "Gregory Martin's text"
- Add section: **"What Was Lost: The Names"** — incorporate the argument from realdouayrheims.com that Challoner's revision removed or weakened the name of Christ in dozens of passages (e.g. "his Christ" → "his anointed" in 1 Kings 12:3), with 2-3 concrete verse examples. Cite the 1909 Catholic Encyclopedia statement that "scarcely any verse remains as it was originally published."
- Outbound links: realdouayrheims.com and originaldouayrheims.com/differences as further reading at the end of the new section; Newman Essays for Cardinal Newman quote already in the article
- Internal links: to `/history/after-challoner` and `/history/about`

### Task 4: `/history/scripture-for-all` — "A Bible Open to All"
**Primary keyword:** Catholic Bible reading
**Current state:** 394 lines, longest article, strong content.
**Changes:**
- Meta title: `Catholics and Scripture: The Church's Invitation to Read the Bible`
- Meta description: inject "lectio divina", "Dei Verbum", "Catholic Bible reading"
- Primary keyword in first 100 words
- FAQ answers: already substantive, light tuning only
- Outbound: ecatholic2000.com on reference to the available text; Catholic Encyclopedia (1913) on historical context
- Internal links: to `/history/forbidden-bible` and `/history/translation-philosophy`

### Task 5: `/history/forbidden-bible` — "A Bible Forbidden to Its Own Readers"
**Primary keyword:** Douay-Rheims Bible banned England
**Current state:** 241 lines, good content.
**Changes:**
- Meta title: `A Bible Forbidden in England: The Douay-Rheims and Recusancy Laws`
- Meta description: include "Elizabethan recusancy", "vernacular Bible", "1582 license"
- Primary keyword in first 100 words
- Add section: **"The Price of Possession"** — concrete detail on the recusancy penalties: fines, imprisonment, seizure of books. Explain how this affected circulation and why first editions are now rare.
- Outbound: Catholic Encyclopedia (1913) on the recusancy context
- Internal links: to `/history/rheims-1582` and `/history/origins`

### Task 6: `/history/annotations` — "A Bible of Arguments: The Annotations"
**Primary keyword:** Rheims New Testament annotations
**Current state:** 194 lines, strong writing.
**Changes:**
- Meta title: `The Annotations of the Rheims New Testament 1582`
- Meta description: include "scholarly annotations", "Protestant refutation", "1582"
- Primary keyword in first 100 words
- Add section: **"Their Legacy"** — how the annotations shaped later Catholic biblical scholarship; how Protestant scholars (Fulke) responded to them; how they influenced the trajectory toward the Douay-Rheims becoming more than a translation.
- Outbound: archive.org Cotton link; Catholic Encyclopedia (1913)
- Internal links: to `/history/influence-on-kjv` and `/history/challoner`

### Task 7: `/history/translation-philosophy` — "A Translation from the Authentic Latin"
**Primary keyword:** Douay-Rheims Latin Vulgate translation
**Current state:** 252 lines, strong content.
**Changes:**
- Meta title: `Translated from the Latin Vulgate: The Douay-Rheims Philosophy`
- Meta description: include "Latin Vulgate", "formal equivalence", "Council of Trent"
- Primary keyword in first 100 words
- Prose: add a brief paragraph on the practical effect of this choice: Latinate vocabulary preserved in English (supersubstantial, longsuffering, penance) as a direct result. Currently discussed but not foregrounded enough as a SEO-friendly differentiator.
- Outbound: Catholic Encyclopedia (1913) on Vulgate authenticity
- Internal links: to `/history/original-tongues` and `/history/challoner`

### Task 8: `/history/original-tongues` — "From the Authentic Latin to the Original Tongues"
**Primary keyword:** Catholic Bible original languages
**Current state:** 247 lines, strong scholarly content.
**Changes:**
- Meta title: `From the Vulgate to Hebrew and Greek: Catholic Bible Translation History`
- Meta description: include "Divino Afflante Spiritu", "original languages", "Council of Trent"
- Primary keyword in first 100 words
- Outbound: Catholic Encyclopedia (1913) on Trent; *English Bible Versions* Google Books link
- Internal links: to `/history/translation-philosophy` and `/history/challoner`

### Task 9: `/history/influence-on-kjv` — "How the Douay-Rheims Shaped the King James Bible"
**Primary keyword:** Douay-Rheims influence King James Bible
**Current state:** 193 lines, unique and compelling angle.
**Changes:**
- Meta title: `How the Douay-Rheims Bible Shaped the King James Version`
- Meta description: include "Ward Allen research", "Fulke parallel edition", "Catholic influence KJV"
- Primary keyword in first 100 words
- Prose expansion: the current specific borrowings list (Matthew 26) is a strong SEO asset. Add a second set of examples from another book (e.g. John or Romans) with 3-4 additional borrowed phrases. These concrete comparisons are high-value for search intent.
- Outbound: *English Bible Versions* Google Books link; archive.org Cotton
- Internal links: to `/history/annotations` and `/history/rheims-1582`

### Task 10: `/history/america` — "The Douay-Rheims in America"
**Primary keyword:** Douay-Rheims Bible America
**Current state:** 190 lines, thinnest substantive article. Needs expansion.
**Changes:**
- Meta title: `The Douay-Rheims Bible in America: From Maryland to the Nineteenth Century`
- Meta description: include "Maryland 1634", "Catholic immigrants", "John Carroll"
- Primary keyword in first 100 words
- Add section: **"Bishop Carroll and the First American Edition"** — John Carroll, first Bishop of the United States, promoted the Douay-Rheims; the first American printing of the Catholic Bible (Mathew Carey, Philadelphia, 1790). This is a significant concrete milestone the article currently lacks.
- Outbound: Simms *The Bible in America* Google Books link; Catholic Encyclopedia (1913)
- Internal links: to `/history/challoner` and `/history/after-challoner`

### Task 11: `/history/after-challoner` — "After Challoner: A Bible in Dispute"
**Primary keyword:** Douay-Rheims Bible editions history
**Current state:** 196 lines, strong. Henry Cotton well-handled.
**Changes:**
- Meta title: `After Challoner: The Disputed History of Douay-Rheims Editions`
- Meta description: include "Haydock Bible", "Cotton catalogue", "Cardinal Wiseman"
- Primary keyword in first 100 words
- Outbound: archive.org Cotton link (already referenced in article, add as hyperlink); *English Bible Versions*
- Internal links: to `/history/challoner` and `/history/about`

### Task 12: `/history/rheims-1582` — "Published in a Time of Crisis"
**Primary keyword:** Rheims New Testament 1582
**Current state:** 210 lines, strong historical writing, compelling opening.
**Changes:**
- Meta title: `The Rheims New Testament 1582: Published in a Time of Crisis`
- Meta description: include "Edmund Campion", "1582 New Testament", "English Catholic exile"
- Primary keyword in first 100 words
- Add section: **"What the Volume Contained"** — physical description of the 1582 edition: quarto format, the preface, the annotations, the scholarly apparatus. Grounds the article in the object itself.
- Outbound: archive.org Cotton link; Catholic Encyclopedia (1913)
- Internal links: to `/history/annotations` and `/history/origins`

---

## Global Rules Applied to All Tasks

- `datePublished="2024-01-01"` added to every `<ProseLayout>` call
- No em dashes introduced
- No "not X. It was Y." patterns
- All outbound links are plain `<a href="...">` with no `target="_blank"`
- Inline links to other history articles use the article title as anchor text, linked as `<a href="/history/slug">Title</a>`
- Each article's first inline internal link appears within the first three paragraphs
- **Image placeholders:** preserve all existing `<figure>` / `article-figure-placeholder` blocks exactly as-is; add a new placeholder for any new substantive section that would naturally carry an image (use the same pattern: `<figure class="article-figure"><div class="article-figure-placeholder" data-label="...descriptive label..."></div><figcaption>...</figcaption></figure>`). Never remove a placeholder.
