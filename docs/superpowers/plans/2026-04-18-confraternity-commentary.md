# Confraternity NT Commentary Extraction & Study Panel Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract Bible Footnotes, Supplemental Commentary, and Introductions from the Confraternity NT epub into structured JSON, then display them in the study panel under three tabs (Intro with sub-tabs, Footnotes, Commentary) when viewing the Confraternity translation.

**Architecture:** A build-time TypeScript extraction script parses the 298 epub HTML files into per-chapter JSON files under `static/data/conf-footnotes/` and `static/data/conf-commentary/`, and replaces the existing `static/data/conf-intros/` with enriched intro data containing both the Confraternity Bible and Supplemental Commentary introductions. The study panel gains a tabbed interface for the Confraternity translation mirroring the ODR tab system, with lazy-loaded data and verse-synced scrolling.

**Tech Stack:** TypeScript, SvelteKit, Svelte 4 syntax (no runes), node-html-parser (for epub parsing)

---

## Source Material

The epub is at:
```
/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/SCRIPTURA/sources/ODR/Confraternity/Confraternity Bible New Testament and Supplemental Notes.epub
```

It contains 298 HTML files (`Confraternity_Bible_New_Testament_and_Supplemental_Commentary_split_NNN.htm`):
- Files 000-007: Front matter (title, prefaces, contributors, abbreviations, articles)
- Per NT book: one Introduction file + one file per chapter
- Files 295-297: Back matter (Index of Scripture Texts, Glossary, Transcriber's Notes)

Each chapter file has three sections:
1. **Confraternity Bible text** (the actual translation — we skip this, we already have the text)
2. **Bible Footnotes** (short verse-keyed notes, preceded by `Bible Footnotes:` heading)
3. **Supplemental Commentary** (scholarly analysis, preceded by `Supplemental Commentary:` heading and `----------` separator)

Each introduction file has two sections separated by `----------`:
1. **Confraternity Bible introduction**
2. **Supplemental Commentary introduction**

## Epub HTML Structure Details

**Chapter file sections are separated by:**
- `Bible Footnotes:` appears in a `<p class="calibre5">` with either `<strong>` or `<b>` wrapping — match on text content, not tag.
- `----------` separator (5+ dashes) in `<p class="calibre9">` between footnotes and commentary.
- `Supplemental Commentary:` appears in `<h3 class="calibre4">` with `<b>` inside `<span>`.

**Edge cases the parser must handle:**
- Some chapters have no footnotes (51 files) — no `Bible Footnotes:` heading; the `----------` separator appears directly after Bible text.
- Dash count varies: 9 or 10 dashes — use regex `\-{5,}`.
- `Bible Footnotes:` uses `<strong>` in ~136 files and `<b>` in ~84 files.
- Author byline at end of last chapter of each book in `<p class="calibre12">` — strip these.
- Introduction files use `<h2 class="calibre2">` (not `calibre10`) for heading.
- Back matter files (295-297) have non-standard structure — skip them.

## Book Slug Mapping

The epub uses names like "Matthew", "1 Corinthians", "Apocalypse". The site uses URL slugs. Full mapping:

| Epub Name | Site Slug |
|-----------|-----------|
| Matthew | `matthew` |
| Mark | `mark` |
| Luke | `luke` |
| John | `john` |
| Acts | `acts` |
| Romans | `romans` |
| 1 Corinthians | `1-corinthians` |
| 2 Corinthians | `2-corinthians` |
| Galatians | `galatians` |
| Ephesians | `ephesians` |
| Philippians | `philippians` |
| Colossians | `colossians` |
| 1 Thessalonians | `1-thessalonians` |
| 2 Thessalonians | `2-thessalonians` |
| 1 Timothy | `1-timothy` |
| 2 Timothy | `2-timothy` |
| Titus | `titus` |
| Philemon | `philemon` |
| Hebrews | `hebrews` |
| James | `james` |
| 1 Peter | `1-peter` |
| 2 Peter | `2-peter` |
| 1 John | `1-john` |
| 2 John | `2-john` |
| 3 John | `3-john` |
| Jude | `jude` |
| Apocalypse | `apocalypse` |

## File Structure

### New files
```
scripts/extract-confraternity.ts          — epub parsing script
static/data/conf-footnotes/{slug}/        — per-chapter Bible Footnotes JSON (27 book dirs)
  001.json, 002.json, ...
static/data/conf-commentary/{slug}/       — per-chapter Supplemental Commentary JSON (27 book dirs)
  001.json, 002.json, ...
```

### Modified files
```
static/data/conf-intros/{slug}.json       — replace string[] with enriched {bibleIntro, commentaryIntro}
src/lib/data/types.ts                     — add ConfFootnote, ConfCommentarySection, ConfIntro types
src/lib/data/loader.ts                    — add loadConfFootnotes(), loadConfCommentary(), update loadConfIntro()
src/lib/stores/studyPanel.ts              — extend StudyTab with 'footnotes', add activeConfIntroTab
src/lib/stores/prefs.ts                   — bump version, handle new tab values
src/lib/components/StudyPanel.svelte       — Confraternity tabbed view with 3 tabs + intro sub-tabs
```

## Output Data Schemas

### `conf-intros/{slug}.json`
```json
{
  "book": "matthew",
  "bibleIntro": ["paragraph1...", "paragraph2...", "..."],
  "commentaryIntro": ["paragraph1...", "paragraph2...", "..."]
}
```
Replaces the existing flat `string[]`. Each array entry is a cleaned HTML paragraph (semantic tags only: `<b>`, `<i>`, `<br>`).

### `conf-footnotes/{slug}/{chapter}.json`
```json
{
  "chapter": 1,
  "footnotes": [
    { "verse": 1, "text": "<i>Jesus</i> is the Greek and Latin form of the late Hebrew..." },
    { "verse": 16, "text": "The genealogy is that of Joseph, the legal father of Jesus..." },
    { "verse": 19, "text": "Supposing only a natural explanation of her condition..." }
  ]
}
```

### `conf-commentary/{slug}/{chapter}.json`
```json
{
  "chapter": 1,
  "sections": [
    {
      "startVerse": 1,
      "endVerse": 25,
      "heading": "Prelude: The Coming of the Savior 1-2",
      "paragraphs": ["This whole section wherein Jesus...", "..."]
    },
    {
      "startVerse": 1,
      "endVerse": 17,
      "heading": "1, 1-17: Genealogy of Jesus.",
      "paragraphs": ["Genealogical records, a compendium...", "..."]
    }
  ]
}
```
Each section has a verse range parsed from the heading (e.g., `"1, 1-17:"` → `startVerse: 1, endVerse: 17`). Paragraphs are cleaned HTML.

---

## Task 1: Add TypeScript types for Confraternity commentary data

**Files:**
- Modify: `src/lib/data/types.ts`

- [ ] **Step 1: Add the new types to types.ts**

Add after the `ChapterAnnotations` interface (around line 35):

```ts
// ── Confraternity commentary types ────────────────────────────
export interface ConfFootnoteEntry {
	verse: number;
	text: string;
}

export interface ConfChapterFootnotes {
	chapter: number;
	footnotes: ConfFootnoteEntry[];
}

export interface ConfCommentarySection {
	startVerse: number;
	endVerse: number;
	heading: string;
	paragraphs: string[];
}

export interface ConfChapterCommentary {
	chapter: number;
	sections: ConfCommentarySection[];
}

export interface ConfIntro {
	book: string;
	bibleIntro: string[];
	commentaryIntro: string[];
}
```

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: PASS (no errors, types are just definitions)

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/types.ts
git commit -m "feat: add TypeScript types for Confraternity commentary data"
```

---

## Task 2: Build the epub extraction script

**Files:**
- Create: `scripts/extract-confraternity.ts`

This is the core extraction logic. The script reads all 298 epub HTML files, identifies book/chapter structure, parses each chapter into footnotes + commentary, and writes JSON files.

- [ ] **Step 1: Install node-html-parser**

```bash
npm install --save-dev node-html-parser
```

- [ ] **Step 2: Create the extraction script**

Create `scripts/extract-confraternity.ts`:

```ts
/**
 * Extract Confraternity NT commentary data from epub HTML files.
 *
 * Usage:
 *   npx tsx scripts/extract-confraternity.ts <epub-extract-dir>
 *
 * The epub must already be unzipped to <epub-extract-dir>.
 * Outputs JSON to static/data/conf-footnotes/, conf-commentary/, conf-intros/.
 */

import { parse, HTMLElement, TextNode } from 'node-html-parser';
import * as fs from 'fs';
import * as path from 'path';

// ── Book slug mapping ─────────────────────────────────────────
const BOOK_SLUG_MAP: Record<string, string> = {
	Matthew: 'matthew',
	Mark: 'mark',
	Luke: 'luke',
	John: 'john',
	Acts: 'acts',
	Romans: 'romans',
	'1 Corinthians': '1-corinthians',
	'2 Corinthians': '2-corinthians',
	Galatians: 'galatians',
	Ephesians: 'ephesians',
	Philippians: 'philippians',
	Colossians: 'colossians',
	'1 Thessalonians': '1-thessalonians',
	'2 Thessalonians': '2-thessalonians',
	'1 Timothy': '1-timothy',
	'2 Timothy': '2-timothy',
	Titus: 'titus',
	Philemon: 'philemon',
	Hebrews: 'hebrews',
	James: 'james',
	'1 Peter': '1-peter',
	'2 Peter': '2-peter',
	'1 John': '1-john',
	'2 John': '2-john',
	'3 John': '3-john',
	Jude: 'jude',
	Apocalypse: 'apocalypse'
};

const STATIC_DIR = path.join(__dirname, '..', 'static', 'data');

// ── HTML cleaning ─────────────────────────────────────────────

/** Strip Calibre cruft, keep semantic HTML */
function cleanHtml(el: HTMLElement): string {
	let html = el.innerHTML;

	// Remove all span wrappers (keep content)
	html = html.replace(/<span[^>]*>/gi, '').replace(/<\/span>/gi, '');

	// Normalize <strong> to <b>
	html = html.replace(/<strong[^>]*>/gi, '<b>').replace(/<\/strong>/gi, '</b>');

	// Remove calibre classes from remaining elements
	html = html.replace(/\s+(class|pbzloc|lang|id)="[^"]*"/gi, '');

	// Clean up <br> tags
	html = html.replace(/<br\s*\/?>/gi, '<br>');

	// Remove <dir> wrappers (used for poetry indentation)
	html = html.replace(/<\/?dir>/gi, '');

	// Collapse whitespace
	html = html.replace(/\s+/g, ' ').trim();

	return html;
}

/** Extract cleaned text from a paragraph element */
function cleanParagraph(p: HTMLElement): string {
	return cleanHtml(p);
}

// ── File classification ───────────────────────────────────────

interface FileInfo {
	path: string;
	type: 'front-matter' | 'introduction' | 'chapter' | 'back-matter';
	book: string;
	chapter: number;
}

function classifyFile(filePath: string, html: string): FileInfo | null {
	const root = parse(html);
	const body = root.querySelector('body');
	if (!body) return null;

	// Check for h2 heading with book/chapter info
	const h2 = body.querySelector('h2');
	const h1 = body.querySelector('h1');

	const h2Text = h2?.text?.trim() ?? '';
	const h1Text = h1?.text?.trim() ?? '';

	// Introduction files: "BookName - Introduction"
	const introMatch = h2Text.match(/^(.+?)\s*-\s*Introduction$/);
	if (introMatch) {
		const bookName = introMatch[1].trim();
		const slug = BOOK_SLUG_MAP[bookName];
		if (slug) {
			return { path: filePath, type: 'introduction', book: slug, chapter: 0 };
		}
	}

	// Chapter files: "BookName - Chapter N"
	const chapterMatch = h2Text.match(/^(.+?)\s*-\s*Chapter\s+(\d+)$/);
	if (chapterMatch) {
		const bookName = chapterMatch[1].trim();
		const slug = BOOK_SLUG_MAP[bookName];
		if (slug) {
			return {
				path: filePath,
				type: 'chapter',
				book: slug,
				chapter: parseInt(chapterMatch[2], 10)
			};
		}
	}

	// Back matter
	if (
		h2Text.includes('Index of Scripture') ||
		h2Text.includes('Glossary') ||
		h2Text.includes('Transcriber')
	) {
		return { path: filePath, type: 'back-matter', book: '', chapter: 0 };
	}

	// Front matter (titles, prefaces, articles, etc.)
	return { path: filePath, type: 'front-matter', book: '', chapter: 0 };
}

// ── Section splitting ─────────────────────────────────────────

interface ChapterSections {
	footnotes: HTMLElement[];
	commentary: HTMLElement[];
}

function splitChapterSections(html: string): ChapterSections {
	const root = parse(html);
	const body = root.querySelector('body');
	if (!body) return { footnotes: [], commentary: [] };

	const children = body.childNodes.filter(
		(n) => n instanceof HTMLElement
	) as HTMLElement[];

	// Find the "Bible Footnotes:" paragraph
	let footnotesStart = -1;
	for (let i = 0; i < children.length; i++) {
		const text = children[i].text.trim();
		if (text === 'Bible Footnotes:') {
			footnotesStart = i;
			break;
		}
	}

	// Find the separator line (-----)
	let separatorIndex = -1;
	for (let i = 0; i < children.length; i++) {
		const text = children[i].text.trim();
		if (/^-{5,}$/.test(text)) {
			separatorIndex = i;
			break;
		}
	}

	// Find "Supplemental Commentary:" heading
	let commentaryStart = -1;
	for (let i = 0; i < children.length; i++) {
		const text = children[i].text.trim();
		if (text.startsWith('Supplemental Commentary:') || text === 'Supplemental Commentary:') {
			commentaryStart = i;
			break;
		}
	}

	// Extract footnotes: everything between "Bible Footnotes:" and separator
	const footnotes: HTMLElement[] = [];
	if (footnotesStart >= 0 && separatorIndex >= 0) {
		for (let i = footnotesStart + 1; i < separatorIndex; i++) {
			if (children[i].tagName === 'P') {
				footnotes.push(children[i]);
			}
		}
	}

	// Extract commentary: everything after "Supplemental Commentary:" heading
	const commentary: HTMLElement[] = [];
	if (commentaryStart >= 0) {
		for (let i = commentaryStart + 1; i < children.length; i++) {
			const el = children[i];
			if (el.tagName === 'P') {
				// Skip author byline (last chapter attribution)
				const cls = el.getAttribute('class') ?? '';
				if (cls.includes('calibre12')) continue;
				commentary.push(el);
			}
		}
	}

	return { footnotes, commentary };
}

// ── Footnote parsing ──────────────────────────────────────────

interface FootnoteEntry {
	verse: number;
	text: string;
}

function parseFootnotes(elements: HTMLElement[]): FootnoteEntry[] {
	const footnotes: FootnoteEntry[] = [];

	for (const el of elements) {
		const cleaned = cleanParagraph(el);
		// Footnotes start with verse number followed by colon
		// e.g., "1: Jesus is the Greek..." or "16: The genealogy..."
		// Some have verse ranges like "1-4:" or "2.5:" (multiple verses)
		const match = cleaned.match(/^(\d+)[\s\-]*(?:f{0,2})?:\s*(.+)$/s);
		if (match) {
			footnotes.push({
				verse: parseInt(match[1], 10),
				text: match[2].trim()
			});
		} else {
			// Continuation of previous footnote (rare but possible)
			if (footnotes.length > 0 && cleaned.length > 0) {
				footnotes[footnotes.length - 1].text += ' ' + cleaned;
			}
		}
	}

	return footnotes;
}

// ── Commentary parsing ────────────────────────────────────────

interface CommentarySection {
	startVerse: number;
	endVerse: number;
	heading: string;
	paragraphs: string[];
}

function parseCommentary(elements: HTMLElement[], totalVerses: number): CommentarySection[] {
	const sections: CommentarySection[] = [];

	// Collect all paragraphs as cleaned HTML
	const paragraphs: { text: string; isSectionHeading: boolean }[] = [];
	for (const el of elements) {
		const cls = el.getAttribute('class') ?? '';
		const cleaned = cleanParagraph(el);
		if (!cleaned || /^-{5,}$/.test(cleaned.replace(/<[^>]+>/g, '').trim())) continue;

		// Section headings use calibre9 class with bold content
		const isSectionHeading = cls.includes('calibre9');
		paragraphs.push({ text: cleaned, isSectionHeading });
	}

	if (paragraphs.length === 0) return sections;

	// Try to group paragraphs into sections by headings
	let currentSection: CommentarySection | null = null;

	for (const p of paragraphs) {
		if (p.isSectionHeading) {
			// Parse verse range from heading text
			const plainText = p.text.replace(/<[^>]+>/g, '').trim();
			const range = parseVerseRange(plainText, totalVerses);

			if (currentSection && currentSection.paragraphs.length > 0) {
				sections.push(currentSection);
			}

			currentSection = {
				startVerse: range.start,
				endVerse: range.end,
				heading: plainText,
				paragraphs: []
			};
		} else {
			if (!currentSection) {
				// Commentary before any heading — create a catch-all section
				currentSection = {
					startVerse: 1,
					endVerse: totalVerses,
					heading: '',
					paragraphs: []
				};
			}
			currentSection.paragraphs.push(p.text);
		}
	}

	if (currentSection && currentSection.paragraphs.length > 0) {
		sections.push(currentSection);
	}

	return sections;
}

function parseVerseRange(
	heading: string,
	totalVerses: number
): { start: number; end: number } {
	// Patterns like:
	//   "1, 1-17: Genealogy of Jesus." → ch 1, verses 1-17
	//   "Prelude: The Coming of the Savior 1-2" → chapters 1-2 (treat as 1-totalVerses)
	//   "3, 1-12: John the Baptist." → ch 3 verses 1-12
	//   "The Temptation 1-11" → verses 1-11

	// Try "chapter, startVerse-endVerse:" pattern
	const rangeMatch = heading.match(/(\d+),\s*(\d+)\s*-\s*(\d+)/);
	if (rangeMatch) {
		return { start: parseInt(rangeMatch[2], 10), end: parseInt(rangeMatch[3], 10) };
	}

	// Try "chapter, verse:" pattern (single verse section)
	const singleMatch = heading.match(/(\d+),\s*(\d+)\s*[:\.]/);
	if (singleMatch) {
		const v = parseInt(singleMatch[2], 10);
		return { start: v, end: v };
	}

	// Try trailing "N-M" pattern
	const trailingRange = heading.match(/(\d+)\s*-\s*(\d+)\s*$/);
	if (trailingRange) {
		return { start: parseInt(trailingRange[1], 10), end: parseInt(trailingRange[2], 10) };
	}

	// Default: entire chapter
	return { start: 1, end: totalVerses };
}

// ── Introduction parsing ──────────────────────────────────────

interface IntroData {
	book: string;
	bibleIntro: string[];
	commentaryIntro: string[];
}

function parseIntroduction(html: string, slug: string): IntroData {
	const root = parse(html);
	const body = root.querySelector('body');
	if (!body) return { book: slug, bibleIntro: [], commentaryIntro: [] };

	const children = body.childNodes.filter(
		(n) => n instanceof HTMLElement
	) as HTMLElement[];

	// Find the separator
	let separatorIndex = -1;
	for (let i = 0; i < children.length; i++) {
		const text = children[i].text.trim();
		if (/^-{5,}$/.test(text)) {
			separatorIndex = i;
			break;
		}
	}

	// Find "Supplemental Commentary:" heading
	let commentaryStart = -1;
	for (let i = 0; i < children.length; i++) {
		const text = children[i].text.trim();
		if (text.startsWith('Supplemental Commentary:') || text === 'Supplemental Commentary:') {
			commentaryStart = i;
			break;
		}
	}

	// Bible intro: paragraphs between the h3 "Confraternity Bible:" and the separator
	const bibleIntro: string[] = [];
	let bibleStart = -1;
	for (let i = 0; i < children.length; i++) {
		const text = children[i].text.trim();
		if (text.startsWith('Confraternity Bible:') || text === 'Confraternity Bible:') {
			bibleStart = i;
			break;
		}
	}

	const bibleEnd = separatorIndex >= 0 ? separatorIndex : (commentaryStart >= 0 ? commentaryStart : children.length);
	if (bibleStart >= 0) {
		for (let i = bibleStart + 1; i < bibleEnd; i++) {
			const el = children[i];
			if (el.tagName === 'P') {
				const cleaned = cleanParagraph(el);
				// Skip short heading-only lines and separator lines
				const plain = cleaned.replace(/<[^>]+>/g, '').trim();
				if (plain && !/^-{5,}$/.test(plain) && plain !== 'Introduction') {
					bibleIntro.push(cleaned);
				}
			}
		}
	}

	// Commentary intro: paragraphs after "Supplemental Commentary:" heading
	const commentaryIntro: string[] = [];
	if (commentaryStart >= 0) {
		for (let i = commentaryStart + 1; i < children.length; i++) {
			const el = children[i];
			if (el.tagName === 'P') {
				const cls = el.getAttribute('class') ?? '';
				if (cls.includes('calibre12')) continue; // skip author byline
				const cleaned = cleanParagraph(el);
				const plain = cleaned.replace(/<[^>]+>/g, '').trim();
				if (plain && plain !== 'Introduction') {
					commentaryIntro.push(cleaned);
				}
			}
		}
	}

	return { book: slug, bibleIntro, commentaryIntro };
}

// ── Chapter verse counts (needed for commentary verse-range fallbacks) ──
// We read these from the existing Confraternity book data
function getChapterVerseCount(slug: string, chapter: number): number {
	const bookPath = path.join(STATIC_DIR, 'conf', `${slug}.json`);
	try {
		const data = JSON.parse(fs.readFileSync(bookPath, 'utf-8'));
		const ch = data.chapters?.find((c: { chapter: number }) => c.chapter === chapter);
		return ch?.verses?.length ?? 30; // fallback
	} catch {
		return 30; // reasonable default
	}
}

// ── Main ──────────────────────────────────────────────────────

function main() {
	const epubDir = process.argv[2];
	if (!epubDir) {
		console.error('Usage: npx tsx scripts/extract-confraternity.ts <epub-extract-dir>');
		process.exit(1);
	}

	// Read all HTML files
	const files = fs
		.readdirSync(epubDir)
		.filter((f) => f.endsWith('.htm'))
		.sort()
		.map((f) => path.join(epubDir, f));

	console.log(`Found ${files.length} HTML files`);

	// Classify each file
	const classified: FileInfo[] = [];
	for (const filePath of files) {
		const html = fs.readFileSync(filePath, 'utf-8');
		const info = classifyFile(filePath, html);
		if (info) classified.push(info);
	}

	const intros = classified.filter((f) => f.type === 'introduction');
	const chapters = classified.filter((f) => f.type === 'chapter');

	console.log(`Classified: ${intros.length} introductions, ${chapters.length} chapters`);

	// Create output directories
	const footnotesDir = path.join(STATIC_DIR, 'conf-footnotes');
	const commentaryDir = path.join(STATIC_DIR, 'conf-commentary');
	const introsDir = path.join(STATIC_DIR, 'conf-intros');

	// Process introductions
	let introCount = 0;
	for (const intro of intros) {
		const html = fs.readFileSync(intro.path, 'utf-8');
		const data = parseIntroduction(html, intro.book);

		fs.mkdirSync(introsDir, { recursive: true });
		const outPath = path.join(introsDir, `${intro.book}.json`);
		fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
		introCount++;
	}
	console.log(`Wrote ${introCount} introduction files`);

	// Process chapters
	let fnCount = 0;
	let cmCount = 0;
	for (const ch of chapters) {
		const html = fs.readFileSync(ch.path, 'utf-8');
		const sections = splitChapterSections(html);

		const paddedChapter = String(ch.chapter).padStart(3, '0');

		// Write footnotes
		const fnDir = path.join(footnotesDir, ch.book);
		fs.mkdirSync(fnDir, { recursive: true });
		const footnotes = parseFootnotes(sections.footnotes);
		const fnData = { chapter: ch.chapter, footnotes };
		fs.writeFileSync(
			path.join(fnDir, `${paddedChapter}.json`),
			JSON.stringify(fnData, null, 2)
		);
		fnCount++;

		// Write commentary
		const cmDir = path.join(commentaryDir, ch.book);
		fs.mkdirSync(cmDir, { recursive: true });
		const totalVerses = getChapterVerseCount(ch.book, ch.chapter);
		const commentarySections = parseCommentary(sections.commentary, totalVerses);
		const cmData = { chapter: ch.chapter, sections: commentarySections };
		fs.writeFileSync(
			path.join(cmDir, `${paddedChapter}.json`),
			JSON.stringify(cmData, null, 2)
		);
		cmCount++;
	}

	console.log(`Wrote ${fnCount} footnote files, ${cmCount} commentary files`);
	console.log('Done!');
}

main();
```

- [ ] **Step 3: Run the extraction**

First unzip the epub:
```bash
mkdir -p /tmp/confraternity-epub
cd /tmp/confraternity-epub
unzip -o "/Users/Janvier/Library/Mobile Documents/com~apple~CloudDocs/for-the-kingdom/SCRIPTURA/sources/ODR/Confraternity/Confraternity Bible New Testament and Supplemental Notes.epub"
```

Then run the script:
```bash
npx tsx scripts/extract-confraternity.ts /tmp/confraternity-epub
```

Expected output:
```
Found 298 HTML files
Classified: 27 introductions, 260 chapters
Wrote 27 introduction files
Wrote 260 footnote files, 260 commentary files
Done!
```

- [ ] **Step 4: Verify output quality**

Spot-check a few files:
```bash
cat static/data/conf-intros/matthew.json | head -20
cat static/data/conf-footnotes/matthew/001.json | head -20
cat static/data/conf-commentary/matthew/001.json | head -30
cat static/data/conf-footnotes/apocalypse/001.json | head -20
cat static/data/conf-commentary/romans/001.json | head -30
```

Verify:
- Intros have both `bibleIntro` and `commentaryIntro` arrays with content
- Footnotes have verse numbers and cleaned text (no Calibre markup)
- Commentary sections have parsed verse ranges and cleaned paragraphs
- No `calibre` class names in any output
- HTML entities are preserved (`&hellip;`, `&mdash;` etc.)

Fix any parsing issues found during spot-checking. This is iterative — edge cases in the HTML will require script adjustments.

- [ ] **Step 5: Commit extraction script and generated data**

```bash
git add scripts/extract-confraternity.ts
git add static/data/conf-footnotes/ static/data/conf-commentary/ static/data/conf-intros/
git commit -m "feat: extract Confraternity NT footnotes, commentary, and intros from epub"
```

---

## Task 3: Add data loaders for Confraternity footnotes and commentary

**Files:**
- Modify: `src/lib/data/loader.ts`

- [ ] **Step 1: Add the loader functions**

Import the new types at the top of `loader.ts`:

```ts
import type { ConfChapterFootnotes, ConfChapterCommentary, ConfIntro } from './types';
```

Add two new caches and loaders after the existing `loadConfIntro` function (around line 106):

```ts
// ── Confraternity footnotes ───────────────────────────────────
const confFootnotesCache = new Map<string, Promise<ConfChapterFootnotes | null>>();

export function loadConfFootnotes(
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<ConfChapterFootnotes | null> {
	const key = `${slug}/${chapter}`;
	const cached = confFootnotesCache.get(key);
	if (cached) return cached;

	const padded = String(chapter).padStart(3, '0');
	const promise = fetch(`/data/conf-footnotes/${slug}/${padded}.json`)
		.then((r) => (r.ok ? (r.json() as Promise<ConfChapterFootnotes>) : null))
		.catch(() => {
			confFootnotesCache.delete(key);
			return null;
		});

	confFootnotesCache.set(key, promise);
	return promise;
}

// ── Confraternity commentary ──────────────────────────────────
const confCommentaryCache = new Map<string, Promise<ConfChapterCommentary | null>>();

export function loadConfCommentary(
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<ConfChapterCommentary | null> {
	const key = `${slug}/${chapter}`;
	const cached = confCommentaryCache.get(key);
	if (cached) return cached;

	const padded = String(chapter).padStart(3, '0');
	const promise = fetch(`/data/conf-commentary/${slug}/${padded}.json`)
		.then((r) => (r.ok ? (r.json() as Promise<ConfChapterCommentary>) : null))
		.catch(() => {
			confCommentaryCache.delete(key);
			return null;
		});

	confCommentaryCache.set(key, promise);
	return promise;
}
```

Also update the return type of `loadConfIntro` (around line 92) to use the new `ConfIntro` type instead of `string[]`:

Change:
```ts
const confIntroPromiseCache = new Map<string, Promise<string[] | null>>();

export function loadConfIntro(
	slug: string,
	fetch: typeof globalThis.fetch
): Promise<string[] | null> {
```

To:
```ts
const confIntroPromiseCache = new Map<string, Promise<ConfIntro | null>>();

export function loadConfIntro(
	slug: string,
	fetch: typeof globalThis.fetch
): Promise<ConfIntro | null> {
```

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: May fail in `StudyPanel.svelte` where `confIntro` is typed as `string[] | null` — that's expected, we fix it in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/loader.ts
git commit -m "feat: add loaders for Confraternity footnotes and commentary"
```

---

## Task 4: Extend study panel store and prefs for new tabs

**Files:**
- Modify: `src/lib/stores/studyPanel.ts`
- Modify: `src/lib/stores/prefs.ts`

- [ ] **Step 1: Extend StudyTab type in studyPanel.ts**

Change line 4 from:
```ts
export type StudyTab = 'intro' | 'commentary' | 'article' | 'end';
```
To:
```ts
export type StudyTab = 'intro' | 'commentary' | 'article' | 'end' | 'footnotes';
```

Add to the `StudyPanelState` interface (around line 20):
```ts
activeConfIntroTab: 'bible' | 'commentary';
```

Add to the defaults object (around line 32):
```ts
activeConfIntroTab: 'bible' as const,
```

- [ ] **Step 2: Update prefs.ts**

Change the `studyDefaultTab` type in the `Prefs` interface (around line 34) from:
```ts
studyDefaultTab: 'intro' | 'commentary' | 'article' | 'end';
```
To:
```ts
studyDefaultTab: 'intro' | 'commentary' | 'article' | 'end' | 'footnotes';
```

Bump `PREFS_VERSION` from 17 to 18 (around line 73).

Add a migration case for version 18 inside the migration switch (after the v17 case):
```ts
case 17:
	// v18: added 'footnotes' tab option — no data migration needed
	p.version = 18;
```

- [ ] **Step 3: Run type check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/stores/studyPanel.ts src/lib/stores/prefs.ts
git commit -m "feat: extend study panel store with footnotes tab and conf intro sub-tabs"
```

---

## Task 5: Update StudyPanel for Confraternity tabbed view

This is the main UI task. The existing `StudyPanel.svelte` has three branches:
1. ODR (lines 542-765): full tab system with intro/commentary/article/end
2. Confraternity (lines 485-530): simple conf intro paragraph view
3. DRC/CPDV (lines 485-515): simple translation notes view

We replace branch 2 with a proper tabbed interface showing Intro (with sub-tabs), Footnotes, and Commentary.

**Files:**
- Modify: `src/lib/components/StudyPanel.svelte`

- [ ] **Step 1: Add imports and state for new data**

At the top of the `<script>` block, add to the imports from `loader.ts`:
```ts
import { loadConfFootnotes, loadConfCommentary } from '$lib/data/loader';
```

Add to the imports from `types.ts`:
```ts
import type { ConfChapterFootnotes, ConfChapterCommentary, ConfIntro } from '$lib/data/types';
```

- [ ] **Step 2: Update the confIntro type and add new data state**

Change the `confIntro` declaration (around line 54) from:
```ts
let confIntro: string[] | null = null;
```
To:
```ts
let confIntro: ConfIntro | null = null;
```

Add new state variables after the confIntro block (around line 78):
```ts
// ── Confraternity footnotes ───────────────────────────────────
let confFootnotes: ConfChapterFootnotes | null = null;
let confFootnotesLoading = false;
let lastConfFootnotesKey = '';

$: if (!isOdr && isConf && currentBookSlug && currentChapterNum) {
	const key = `${currentBookSlug}/${currentChapterNum}`;
	if (key !== lastConfFootnotesKey) {
		lastConfFootnotesKey = key;
		confFootnotesLoading = true;
		confFootnotes = null;
		loadConfFootnotes(currentBookSlug, currentChapterNum, fetch).then((data) => {
			if (key === lastConfFootnotesKey) {
				confFootnotes = data;
				confFootnotesLoading = false;
			}
		});
	}
}

// ── Confraternity commentary ──────────────────────────────────
let confCommentary: ConfChapterCommentary | null = null;
let confCommentaryLoading = false;
let lastConfCommentaryKey = '';

$: if (!isOdr && isConf && currentBookSlug && currentChapterNum) {
	const key = `${currentBookSlug}/${currentChapterNum}`;
	if (key !== lastConfCommentaryKey) {
		lastConfCommentaryKey = key;
		confCommentaryLoading = true;
		confCommentary = null;
		loadConfCommentary(currentBookSlug, currentChapterNum, fetch).then((data) => {
			if (key === lastConfCommentaryKey) {
				confCommentary = data;
				confCommentaryLoading = false;
			}
		});
	}
}
```

- [ ] **Step 3: Add `isConf` flag and Confraternity tab definitions**

Add near the existing `isOdr` flag (around line 19):
```ts
$: isConf = translationId === 'conf';
```

Add Confraternity tab computation after the existing `visibleTabs` block (around line 148):
```ts
type ConfTabDef = { id: 'intro' | 'footnotes' | 'commentary'; label: string };
$: confVisibleTabs = ((): ConfTabDef[] => {
	const tabs: ConfTabDef[] = [];
	if (confIntro && (confIntro.bibleIntro.length > 0 || confIntro.commentaryIntro.length > 0)) {
		tabs.push({ id: 'intro', label: 'Intro' });
	}
	tabs.push({ id: 'footnotes', label: 'Footnotes' });
	tabs.push({ id: 'commentary', label: 'Commentary' });
	return tabs;
})();
$: confShowTabBar = confVisibleTabs.length > 1;
$: confSliderIndex = confVisibleTabs.findIndex((t) => t.id === $studyPanel.activeTab);
```

- [ ] **Step 4: Remove old introParagraphs computed and conf intro rendering**

Delete the `introParagraphs` computed block (around lines 81-97) — it processed the old `string[]` format which no longer applies.

- [ ] **Step 5: Replace the non-ODR template branch for Confraternity**

In the template, find the non-ODR branch (around line 485). Replace the `{:else if hasTranslationIntro}` block with a full Confraternity tabbed interface:

```svelte
{:else if isConf}
	<!-- Confraternity tab bar -->
	{#if confShowTabBar}
		<div class="tab-bar">
			{#each confVisibleTabs as tab, i}
				<button
					class="tab-btn"
					class:tab-active={$studyPanel.activeTab === tab.id}
					on:click={() => switchTab(tab.id)}
				>
					{tab.label}
				</button>
			{/each}
			<div
				class="tab-slider"
				style="width: {100 / confVisibleTabs.length}%; transform: translateX({(confSliderIndex < 0 ? 0 : confSliderIndex) * 100}%)"
			></div>
		</div>
	{/if}

	<!-- Confraternity intro sub-tabs (outside scroll area) -->
	{#if $studyPanel.activeTab === 'intro' && confIntro}
		<div class="sub-tab-bar">
			<button
				class="sub-tab-btn"
				class:sub-tab-active={$studyPanel.activeConfIntroTab === 'bible'}
				on:click={() => studyPanel.update((s) => ({ ...s, activeConfIntroTab: 'bible' }))}
			>
				Confraternity Bible
			</button>
			<button
				class="sub-tab-btn"
				class:sub-tab-active={$studyPanel.activeConfIntroTab === 'commentary'}
				on:click={() => studyPanel.update((s) => ({ ...s, activeConfIntroTab: 'commentary' }))}
			>
				Supplemental Commentary
			</button>
		</div>
	{/if}

	<div class="panel-scroll" bind:this={panelScroll}>
		{#if $studyPanel.activeTab === 'intro' && confIntro}
			<!-- Intro content -->
			<div class="panel-inner">
				{#if $studyPanel.activeConfIntroTab === 'bible'}
					{#each confIntro.bibleIntro as para}
						<p class="prose-para">{@html para}</p>
					{/each}
				{:else}
					{#each confIntro.commentaryIntro as para}
						<p class="prose-para">{@html para}</p>
					{/each}
				{/if}
			</div>
		{:else if $studyPanel.activeTab === 'footnotes'}
			<!-- Footnotes content -->
			<div class="panel-inner">
				{#if confFootnotesLoading}
					<p class="panel-empty">Loading&hellip;</p>
				{:else if confFootnotes && confFootnotes.footnotes.length > 0}
					{#each confFootnotes.footnotes as fn}
						<div class="conf-note-section">
							<div class="verse-label">{fn.verse}</div>
							<div class="conf-note-text">{@html fn.text}</div>
						</div>
					{/each}
				{:else}
					<p class="panel-empty">No footnotes for this chapter.</p>
				{/if}
			</div>
		{:else if $studyPanel.activeTab === 'commentary'}
			<!-- Commentary content -->
			<div class="panel-inner">
				{#if confCommentaryLoading}
					<p class="panel-empty">Loading&hellip;</p>
				{:else if confCommentary && confCommentary.sections.length > 0}
					{#each confCommentary.sections as section}
						<div class="conf-commentary-section">
							{#if section.heading}
								<h4 class="conf-section-heading">{section.heading}</h4>
							{/if}
							{#each section.paragraphs as para}
								<p class="prose-para">{@html para}</p>
							{/each}
						</div>
					{/each}
				{:else}
					<p class="panel-empty">No commentary for this chapter.</p>
				{/if}
			</div>
		{/if}
	</div>
```

- [ ] **Step 6: Set default Confraternity tab on book change**

In the book-change reactive block (around lines 153-169), add handling for Confraternity. After the existing logic that sets the active tab for ODR books, add:

```ts
// Set default tab for Confraternity
if (isConf) {
	const preferred = $prefs.studyDefaultTab;
	if (preferred === 'footnotes' || preferred === 'commentary') {
		studyPanel.update((s) => ({ ...s, activeTab: preferred }));
	} else if (confIntro && (confIntro.bibleIntro.length > 0 || confIntro.commentaryIntro.length > 0)) {
		studyPanel.update((s) => ({ ...s, activeTab: 'intro' }));
	} else {
		studyPanel.update((s) => ({ ...s, activeTab: 'footnotes' }));
	}
}
```

- [ ] **Step 7: Add styles for Confraternity-specific elements**

Add to the `<style>` block:

```css
/* ── Confraternity footnotes ─────────────────── */
.conf-note-section {
	display: flex;
	gap: 10px;
	padding: 10px 0;
	border-bottom: 1px solid var(--color-border);
}

.conf-note-section:last-child {
	border-bottom: none;
}

.conf-note-text {
	font-size: 13px;
	line-height: 1.6;
	color: var(--color-text);
}

.conf-note-text :global(i) {
	font-style: italic;
}

.conf-note-text :global(b) {
	font-weight: 600;
}

/* ── Confraternity commentary ────────────────── */
.conf-commentary-section {
	padding: 12px 0;
	border-bottom: 1px solid var(--color-border);
}

.conf-commentary-section:last-child {
	border-bottom: none;
}

.conf-section-heading {
	font-family: var(--font-ui);
	font-size: 12px;
	font-weight: 600;
	color: var(--color-accent-text);
	margin: 0 0 8px;
	text-transform: uppercase;
	letter-spacing: 0.06em;
}

/* ── Sub-tab bar (intro sub-tabs) ────────────── */
.sub-tab-bar {
	display: flex;
	border-bottom: 1px solid var(--color-border);
	padding: 0 16px;
	gap: 0;
}

.sub-tab-btn {
	flex: 1;
	padding: 8px 0;
	border: none;
	background: none;
	font-family: var(--font-ui);
	font-size: 11px;
	font-weight: 500;
	color: var(--color-subtle);
	cursor: pointer;
	text-align: center;
	transition: color 150ms ease;
	border-bottom: 2px solid transparent;
}

.sub-tab-btn:hover {
	color: var(--color-text);
}

.sub-tab-active {
	color: var(--color-accent-text);
	border-bottom-color: var(--color-accent);
}
```

- [ ] **Step 8: Run type check and dev server**

```bash
npm run check
npm run dev
```

Navigate to `/conf/matthew/1` and verify:
- Three tabs appear: Intro, Footnotes, Commentary
- Intro tab has two sub-tabs: "Confraternity Bible" and "Supplemental Commentary"
- Footnotes tab shows verse-keyed footnotes with verse number labels
- Commentary tab shows sections with headings and prose paragraphs
- Tab switching works and persists preference

- [ ] **Step 9: Commit**

```bash
git add src/lib/components/StudyPanel.svelte src/lib/data/loader.ts
git commit -m "feat: add Confraternity tabbed study panel with footnotes and commentary"
```

---

## Task 6: Verify end-to-end across multiple books

- [ ] **Step 1: Test across representative books**

Check these in the browser at `/{translation}/{book}/{chapter}`:
- `/conf/matthew/1` — Gospels (long footnotes and commentary)
- `/conf/acts/1` — Acts (different structure)
- `/conf/romans/1` — Epistles
- `/conf/philemon/1` — Single-chapter book
- `/conf/apocalypse/1` — Revelation
- `/conf/2-john/1` — Very short epistle

Verify for each:
- Footnotes tab shows correct verse numbers and text
- Commentary sections have reasonable verse ranges
- No raw HTML tags visible in rendered text
- No Calibre class names in output
- Intro sub-tabs both have content

- [ ] **Step 2: Fix any extraction issues found**

If HTML cleaning or parsing needs adjustments, update `scripts/extract-confraternity.ts` and re-run:
```bash
npx tsx scripts/extract-confraternity.ts /tmp/confraternity-epub
```

- [ ] **Step 3: Run full checks**

```bash
npm run check
npm run lint
npm run test
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: refine Confraternity extraction and verify across all NT books"
```

---

## Deferred / Out of Scope

These are noted for future work but explicitly not part of this plan:

1. **Verse-synced scrolling for Confraternity footnotes/commentary** — The ODR commentary tab syncs scroll position between the reader and study panel via IntersectionObserver. Adding this for the Confraternity tabs requires mapping footnotes/commentary sections to verse elements in the reader. This can be added later once the basic display is working.

2. **Cross-reference linkification in commentary text** — The Supplemental Commentary contains many Scripture references (e.g., "Matt. 22, 41 f"). These could be turned into hoverable links using `linkifyItalicRefs()`. Deferred because the reference format differs from ODR (uses comma instead of colon for chapter:verse).

3. **Front-matter articles** — The epub contains scholarly articles (Parables, Synoptic Relations, St. Paul's Life) that could be surfaced somewhere on the site. Not part of the study panel.

4. **Back-matter content** — Index of Scripture Texts, Glossary, Transcriber's Notes could be useful reference pages. Not part of this plan.
