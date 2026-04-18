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
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

	const h2 = body.querySelector('h2');
	const h2Text = h2?.text?.trim() ?? '';

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

	// Front matter
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
		// Try verse range first: "N-M: text" (e.g. "4-14: This passage...")
		const rangeMatch = cleaned.match(/^(\d+)-(\d+)\s*(?:f{0,2})?:\s*(.+)$/s);
		if (rangeMatch) {
			footnotes.push({
				verse: parseInt(rangeMatch[1], 10),
				text: rangeMatch[3].trim()
			});
			continue;
		}
		// Single verse: "N: text"
		const match = cleaned.match(/^(\d+)[\s]*(?:f{0,2})?:\s*(.+)$/s);
		if (match) {
			footnotes.push({
				verse: parseInt(match[1], 10),
				text: match[2].trim()
			});
		} else {
			// Continuation of previous footnote
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

function parseCommentary(
	elements: HTMLElement[],
	totalVerses: number
): CommentarySection[] {
	const sections: CommentarySection[] = [];

	const paragraphs: { text: string; isSectionHeading: boolean }[] = [];
	for (const el of elements) {
		const cls = el.getAttribute('class') ?? '';
		const cleaned = cleanParagraph(el);
		if (!cleaned || /^-{5,}$/.test(cleaned.replace(/<[^>]+>/g, '').trim())) continue;

		const isSectionHeading = cls.includes('calibre9');
		paragraphs.push({ text: cleaned, isSectionHeading });
	}

	if (paragraphs.length === 0) return sections;

	let currentSection: CommentarySection | null = null;

	for (const p of paragraphs) {
		if (p.isSectionHeading) {
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
	// Try cross-chapter range: "N, N -- M, P"
	const crossChapterMatch = heading.match(/(\d+),\s*(\d+)\s*--\s*(\d+),\s*(\d+)/);
	if (crossChapterMatch) {
		return { start: parseInt(crossChapterMatch[2], 10), end: totalVerses };
	}

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

	// Try single terminal verse: "N, N" at end (no trailing punctuation)
	const terminalSingle = heading.match(/(\d+),\s*(\d+)\s*(?:f{0,2})?$/);
	if (terminalSingle) {
		const v = parseInt(terminalSingle[2], 10);
		return { start: v, end: v };
	}

	// Try trailing "N-M" pattern
	const trailingRange = heading.match(/(\d+)\s*-\s*(\d+)\s*$/);
	if (trailingRange) {
		return {
			start: parseInt(trailingRange[1], 10),
			end: parseInt(trailingRange[2], 10)
		};
	}

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

	let separatorIndex = -1;
	for (let i = 0; i < children.length; i++) {
		const text = children[i].text.trim();
		if (/^-{5,}$/.test(text)) {
			separatorIndex = i;
			break;
		}
	}

	let commentaryStart = -1;
	for (let i = 0; i < children.length; i++) {
		const text = children[i].text.trim();
		if (
			text.startsWith('Supplemental Commentary:') ||
			text === 'Supplemental Commentary:'
		) {
			commentaryStart = i;
			break;
		}
	}

	// Bible intro: paragraphs between "Confraternity Bible:" and the separator
	const bibleIntro: string[] = [];
	let bibleStart = -1;
	for (let i = 0; i < children.length; i++) {
		const text = children[i].text.trim();
		if (
			text.startsWith('Confraternity Bible:') ||
			text === 'Confraternity Bible:'
		) {
			bibleStart = i;
			break;
		}
	}

	const bibleEnd =
		separatorIndex >= 0
			? separatorIndex
			: commentaryStart >= 0
				? commentaryStart
				: children.length;
	if (bibleStart >= 0) {
		for (let i = bibleStart + 1; i < bibleEnd; i++) {
			const el = children[i];
			if (el.tagName === 'P') {
				const cleaned = cleanParagraph(el);
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
				if (cls.includes('calibre12')) continue;
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

// ── Chapter verse counts ──────────────────────────────────────
function getChapterVerseCount(slug: string, chapter: number): number {
	const bookPath = path.join(STATIC_DIR, 'conf', `${slug}.json`);
	try {
		const data = JSON.parse(fs.readFileSync(bookPath, 'utf-8'));
		const ch = data.chapters?.find(
			(c: { chapter: number }) => c.chapter === chapter
		);
		return ch?.verses?.length ?? 30;
	} catch {
		return 30;
	}
}

// ── Main ──────────────────────────────────────────────────────

function main() {
	const epubDir = process.argv[2];
	if (!epubDir) {
		console.error(
			'Usage: npx tsx scripts/extract-confraternity.ts <epub-extract-dir>'
		);
		process.exit(1);
	}

	const files = fs
		.readdirSync(epubDir)
		.filter((f) => f.endsWith('.htm'))
		.sort()
		.map((f) => path.join(epubDir, f));

	console.log(`Found ${files.length} HTML files`);

	const classified: FileInfo[] = [];
	for (const filePath of files) {
		const html = fs.readFileSync(filePath, 'utf-8');
		const info = classifyFile(filePath, html);
		if (info) classified.push(info);
	}

	const intros = classified.filter((f) => f.type === 'introduction');
	const chapters = classified.filter((f) => f.type === 'chapter');

	console.log(
		`Classified: ${intros.length} introductions, ${chapters.length} chapters`
	);

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
