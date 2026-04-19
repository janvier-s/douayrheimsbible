// @ts-nocheck — build script run with tsx, not part of the Svelte app
import { parse as parseHTML } from 'node-html-parser';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedVerse {
	verse: number;
	text: string;
	markers: number[];
}

export interface ParsedCrossRef {
	marker: number;
	refs: string;
	chapter?: number;
	chapterBreak?: number;
}

export interface ParsedNote {
	chapter: number | null;
	verse: number;
	text: string;
}

// ---------------------------------------------------------------------------
// convertMarkerToSuperscript
// ---------------------------------------------------------------------------

const SUPERSCRIPT_MAP: Record<string, string> = {
	'0': '⁰',
	'1': '¹',
	'2': '²',
	'3': '³',
	'4': '⁴',
	'5': '⁵',
	'6': '⁶',
	'7': '⁷',
	'8': '⁸',
	'9': '⁹'
};

/**
 * Converts a cross-ref marker number to Unicode superscript characters.
 * e.g. 12 → "¹²"
 */
export function convertMarkerToSuperscript(n: number): string {
	return String(n)
		.split('')
		.map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
		.join('');
}

// ---------------------------------------------------------------------------
// parseVerseNumber
// ---------------------------------------------------------------------------

/**
 * Extracts leading verse number from text.
 * "2 And the earth" → { verse: 2, text: "And the earth" }
 * No leading number → verse 1.
 */
export function parseVerseNumber(text: string): { verse: number; text: string } {
	const match = text.match(/^(\d+)\s+([\s\S]*)$/);
	if (match) {
		return { verse: parseInt(match[1], 10), text: match[2] };
	}
	return { verse: 1, text };
}

// ---------------------------------------------------------------------------
// collapseSpans
// ---------------------------------------------------------------------------

/**
 * Collapses epub HTML spans into clean text:
 * - plain-bible1 → plain text
 * - reference-letters → Unicode superscript
 * - char-style-override3 → just the letter (drop-cap)
 * - bible-italic → <i>text</i>
 * - <br> → space
 * - Multiple spaces collapsed
 */
export function collapseSpans(innerHTML: string): string {
	const root = parseHTML(`<div>${innerHTML}</div>`);
	const div = root.querySelector('div')!;

	let result = '';

	function processNode(node: import('node-html-parser').Node): void {
		if (node.nodeType === 3) {
			// Text node
			result += node.text;
			return;
		}
		if (node.nodeType === 1) {
			const el = node as import('node-html-parser').HTMLElement;
			const tag = el.tagName?.toLowerCase();
			const cls = el.getAttribute('class') ?? '';

			if (tag === 'br') {
				result += ' ';
				return;
			}

			if (tag === 'span') {
				if (cls === 'plain-bible1' || cls.startsWith('char-style-override')) {
					// Plain text — just recurse into children
					for (const child of el.childNodes) {
						processNode(child);
					}
				} else if (cls === 'reference-letters') {
					// Convert to superscript
					const markerText = el.text.trim();
					const n = parseInt(markerText, 10);
					if (!isNaN(n)) {
						result += convertMarkerToSuperscript(n);
					} else {
						result += markerText;
					}
				} else if (cls === 'bible-italic') {
					result += '<i>';
					for (const child of el.childNodes) {
						processNode(child);
					}
					result += '</i>';
				} else {
					// Unknown span class — just recurse
					for (const child of el.childNodes) {
						processNode(child);
					}
				}
				return;
			}

			// Other elements — recurse
			for (const child of el.childNodes) {
				processNode(child);
			}
		}
	}

	for (const child of div.childNodes) {
		processNode(child);
	}

	// Collapse multiple spaces
	return result.replace(/  +/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// extractVersesFromParagraphs
// ---------------------------------------------------------------------------

/**
 * Processes verse paragraph HTML strings and returns ParsedVerse[].
 */
const SUPER_TO_DIGIT: Record<string, string> = {
	'⁰': '0',
	'¹': '1',
	'²': '2',
	'³': '3',
	'⁴': '4',
	'⁵': '5',
	'⁶': '6',
	'⁷': '7',
	'⁸': '8',
	'⁹': '9'
};

function superscriptToNumber(sup: string): number {
	const digits = sup
		.split('')
		.map((ch) => SUPER_TO_DIGIT[ch] ?? ch)
		.join('');
	return parseInt(digits, 10);
}

/**
 * Processes verse paragraph HTML strings and returns ParsedVerse[].
 */
export function extractVersesFromParagraphs(paragraphs: string[]): ParsedVerse[] {
	const verses: ParsedVerse[] = [];

	for (const para of paragraphs) {
		const collapsed = collapseSpans(para);
		const { verse, text } = parseVerseNumber(collapsed);

		// Extract superscript markers from the collapsed text
		const markerRegex = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;
		const markers: number[] = [];

		let m: RegExpExecArray | null;
		while ((m = markerRegex.exec(text)) !== null) {
			markers.push(superscriptToNumber(m[0]));
		}

		verses.push({ verse, text, markers });
	}

	return verses;
}

// ---------------------------------------------------------------------------
// parseCrossRefBlock
// ---------------------------------------------------------------------------

/**
 * Parses a cross-ref footnote block HTML.
 * Returns array of { marker, refs, chapter?, chapterBreak? }.
 */
export function parseCrossRefBlock(innerHTML: string): ParsedCrossRef[] {
	const root = parseHTML(`<div>${innerHTML}</div>`);
	const div = root.querySelector('div')!;

	// Collect alternating marker / refs pairs
	// Markers are in .foot-note-s--script spans, refs are in .plain-bible1 spans
	const children = div.childNodes.filter(
		(n) => n.nodeType === 1
	) as import('node-html-parser').HTMLElement[];

	const results: ParsedCrossRef[] = [];
	let pendingMarker: number | null = null;
	let currentChapter: number | undefined = undefined;

	for (const el of children) {
		const cls = el.getAttribute('class') ?? '';
		const text = el.text;

		if (cls === 'foot-note-s--script') {
			// e.g. "1. " or "11. "
			const match = text.match(/(\d+)/);
			if (match) {
				pendingMarker = parseInt(match[1], 10);
			}
		} else if (cls === 'plain-bible1') {
			if (pendingMarker === null) continue;

			let refsText = text;

			// Check for inline CHAP. N marker
			const chapBreakMatch = refsText.match(/CHAP\.\s*(\d+)/i);
			let chapterBreak: number | undefined = undefined;
			if (chapBreakMatch) {
				chapterBreak = parseInt(chapBreakMatch[1], 10);
				// Strip the CHAP. N part from refs
				refsText = refsText.replace(/CHAP\.\s*\d+/i, '').trim();
			}

			refsText = refsText.trim();

			const entry: ParsedCrossRef = {
				marker: pendingMarker,
				refs: refsText
			};

			if (chapterBreak !== undefined) {
				entry.chapterBreak = chapterBreak;
			}

			if (currentChapter !== undefined) {
				entry.chapter = currentChapter;
			}

			results.push(entry);

			// After a chapter break, the next entries belong to the new chapter
			if (chapterBreak !== undefined) {
				currentChapter = chapterBreak;
			}

			pendingMarker = null;
		}
	}

	return results;
}

// ---------------------------------------------------------------------------
// parseNoteBlock
// ---------------------------------------------------------------------------

/**
 * Parses a Challoner's commentary note block HTML.
 * Returns { chapter, verse, text }.
 *
 * HTML example:
 * <span class="plain-bible1">CHAP. 1. Ver. 6. </span>
 * <span class="bible-italic">A firmament</span>
 * <span class="plain-bible1">. By this name is here understood...</span>
 */
export function parseNoteBlock(innerHTML: string): ParsedNote {
	const root = parseHTML(`<div>${innerHTML}</div>`);
	const div = root.querySelector('div')!;

	let chapter: number | null = null;
	let verse = 0;
	let lemma = '';
	let bodyParts: string[] = [];
	let headerProcessed = false;

	for (const node of div.childNodes) {
		if (node.nodeType === 3) {
			// Text node — only include after header is processed
			if (headerProcessed) {
				bodyParts.push(node.text);
			}
			continue;
		}
		if (node.nodeType !== 1) continue;

		const el = node as import('node-html-parser').HTMLElement;
		const cls = el.getAttribute('class') ?? '';
		const text = el.text;

		if (!headerProcessed && cls === 'plain-bible1') {
			// Try to parse "CHAP. N. Ver. N." or "CHAP N Ver. N" or just "Ver. N."
			const chapVerMatch = text.match(/CHAP\.?\s*(\d+)\.?\s*Ver\.\s*(\d+)\.?/i);
			const verOnlyMatch = text.match(/^Ver\.\s*(\d+)\.?/i);

			if (chapVerMatch) {
				chapter = parseInt(chapVerMatch[1], 10);
				verse = parseInt(chapVerMatch[2], 10);
				headerProcessed = true;
			} else if (verOnlyMatch) {
				chapter = null;
				verse = parseInt(verOnlyMatch[1], 10);
				headerProcessed = true;
			} else {
				// Some header might not have a standard pattern — skip
				headerProcessed = true;
			}
			continue;
		}

		if (headerProcessed && cls === 'bible-italic' && lemma === '') {
			// First italic text after header is the lemma
			// Handle colon suffix: "Showed him:" → "Showed him"
			lemma = text.trim().replace(/:$/, '');
			continue;
		}

		// Remaining text parts — collect as-is
		if (headerProcessed) {
			bodyParts.push(text);
		}
	}

	// Build the note text
	// Format: "Lemma"... rest of text
	let noteText = '';
	if (lemma) {
		let body = bodyParts.join('').trim();
		// The body usually starts with ". " or ": " or "... " — normalize to "... "
		body = body.replace(/^[.:]\s*/, '... ');
		noteText = `"${lemma}"... ${body}`.replace(/\.\.\.\s+\.\.\.\s*/, '... ').trim();
	} else {
		noteText = bodyParts.join('').trim();
	}

	return { chapter, verse, text: noteText };
}

// ---------------------------------------------------------------------------
// BOOK_ANCHOR_TO_SLUG
// ---------------------------------------------------------------------------

/**
 * Maps epub anchor IDs to output slugs.
 */
export const BOOK_ANCHOR_TO_SLUG: Record<string, string> = {
	GENESIS: 'genesis',
	EXODUS: 'exodus',
	LEVITICUS: 'leviticus',
	NUMBERS: 'numbers',
	DEUTERONOMY: 'deuteronomy',
	JOSUE: 'joshua',
	JUDGES: 'judges',
	RUTH: 'ruth',
	'The-First-book-of--SAMUEL': '1-samuel',
	'The-SECOND-book-of--SAMUEL': '2-samuel',
	'The-Third-Book-of--KINGS': '1-kings',
	'THE-FOURTH-Book-of--KINGS': '2-kings',
	PARALIPOMENON: '1-chronicles',
	'THE-SECOND-BOOK-OF-PARALIPOMENON': '2-chronicles',
	'THE-SECOND-BOOK-OF-PARALIPOMENON-20': '2-chronicles',
	'The-First-Book-of--ESDRAS': 'ezra',
	NEHEMIAS: 'nehemiah',
	TOBIAS: 'tobit',
	JUDITH: 'judith',
	ESTHER: 'esther',
	JOB: 'job',
	PSALMS: 'psalms',
	PROVERBS: 'proverbs',
	ECCLESIASTES: 'ecclesiastes',
	'CANTICLE-OF-CANTICLES': 'song-of-solomon',
	WISDOM: 'wisdom',
	ECCLESIASTICUS: 'sirach',
	ISAIAS: 'isaiah',
	JEREMIAS: 'jeremiah',
	'JEREMIAS-17': 'lamentations',
	BARUCH: 'baruch',
	EZECHIEL: 'ezekiel',
	DANIEL: 'daniel',
	OSEE: 'hosea',
	JOEL: 'joel',
	AMOS: 'amos',
	ABDIAS: 'obadiah',
	JONAS: 'jonah',
	MICHEAS: 'micah',
	NAHUM: 'nahum',
	HABACUC: 'habakkuk',
	SOPHONIAS: 'zephaniah',
	AGGEUS: 'haggai',
	ZACHARIAS: 'zechariah',
	MALACHIAS: 'malachi',
	'The-First-Book-of-MACHABEES': '1-maccabees',
	'The-Second-Book-of--MACHABEES': '2-maccabees',
	'ST.-MATTHEW': 'matthew',
	'ST.-MARK': 'mark',
	'ST.-LUKE': 'luke',
	'ST.-JOHN': 'john',
	'The-Acts-of-THE-APOSTLES': 'acts',
	ROMANS: 'romans',
	'First-Epistle-of-St.-Paul-to-the-CORINTHIANS': '1-corinthians',
	'Second-Epistle-of-St.-Paul-to-the-CORINTHIANS': '2-corinthians',
	GALATIANS: 'galatians',
	EPHESIANS: 'ephesians',
	PHILIPPIANS: 'philippians',
	COLOSSIANS: 'colossians',
	TITUS: 'titus',
	PHILEMON: 'philemon',
	HEBREWS: 'hebrews',
	'ST.-JAMES': 'james',
	'FIRST-EPISTLE-OF-ST.-PETER-THE-APOSTLE': '1-peter',
	'SECOND-OF-EPISTLE-OF-ST.-PETER-THE-APOSTLE': '2-peter',
	'SECOND-EPISTLE-OF-ST.-JOHN': '2-john',
	'Third-Epsitle-of-ST.-JOHN': '3-john',
	'ST.-JUDE': 'jude',
	// Additional anchors discovered in epub
	'First-Epistle-of-St.-Paul-to-the-CORINTHIANS': '1-corinthians',
	'first-Epistle-of-ST.-JOHN': '1-john',
	'Second-Epistle-of-St.-Paul-to-the-THESSALONIANS': '2-thessalonians',
	'first-epistle-of-st.-paul-to-the-THESSALONIANS': '1-thessalonians',
	'first-epistle-of-ST.-Paul-to-TIMOTHY': '1-timothy',
	'second-epistle-of-ST.-Paul-to-TIMOTHY': '2-timothy',
	apocalypse: 'revelation'
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const ODR_PARENT = join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'ODR');
const EPUB_DIR =
	'/tmp/drc-epub/4_The Holy Bible (Douay-Rheims).epub-1673281740-914/The Holy Bible (Douay-Rheims).epub/OEBPS';
const DRC_OUT = join(ODR_PARENT, 'DRC');

// ---------------------------------------------------------------------------
// SLUG_TO_DISPLAY
// ---------------------------------------------------------------------------

const SLUG_TO_DISPLAY: Record<string, string> = {
	genesis: 'Genesis',
	exodus: 'Exodus',
	leviticus: 'Leviticus',
	numbers: 'Numbers',
	deuteronomy: 'Deuteronomy',
	joshua: 'Josue',
	judges: 'Judges',
	ruth: 'Ruth',
	'1-samuel': '1 Kings',
	'2-samuel': '2 Kings',
	'1-kings': '3 Kings',
	'2-kings': '4 Kings',
	'1-chronicles': '1 Paralipomenon',
	'2-chronicles': '2 Paralipomenon',
	ezra: '1 Esdras',
	nehemiah: '2 Esdras',
	tobit: 'Tobias',
	judith: 'Judith',
	esther: 'Esther',
	job: 'Job',
	psalms: 'Psalms',
	proverbs: 'Proverbs',
	ecclesiastes: 'Ecclesiastes',
	'song-of-solomon': 'Canticle of Canticles',
	wisdom: 'Wisdom',
	sirach: 'Ecclesiasticus',
	isaiah: 'Isaias',
	jeremiah: 'Jeremias',
	lamentations: 'Lamentations',
	baruch: 'Baruch',
	ezekiel: 'Ezechiel',
	daniel: 'Daniel',
	hosea: 'Osee',
	joel: 'Joel',
	amos: 'Amos',
	obadiah: 'Abdias',
	jonah: 'Jonas',
	micah: 'Micheas',
	nahum: 'Nahum',
	habakkuk: 'Habacuc',
	zephaniah: 'Sophonias',
	haggai: 'Aggeus',
	zechariah: 'Zacharias',
	malachi: 'Malachias',
	'1-maccabees': '1 Machabees',
	'2-maccabees': '2 Machabees',
	matthew: 'St. Matthew',
	mark: 'St. Mark',
	luke: 'St. Luke',
	john: 'St. John',
	acts: 'Acts of the Apostles',
	romans: 'Romans',
	'1-corinthians': '1 Corinthians',
	'2-corinthians': '2 Corinthians',
	galatians: 'Galatians',
	ephesians: 'Ephesians',
	philippians: 'Philippians',
	colossians: 'Colossians',
	'1-thessalonians': '1 Thessalonians',
	'2-thessalonians': '2 Thessalonians',
	'1-timothy': '1 Timothy',
	'2-timothy': '2 Timothy',
	titus: 'Titus',
	philemon: 'Philemon',
	hebrews: 'Hebrews',
	james: 'St. James',
	'1-peter': '1 Peter',
	'2-peter': '2 Peter',
	'1-john': '1 John',
	'2-john': '2 John',
	'3-john': '3 John',
	jude: 'St. Jude',
	revelation: 'Apocalypse'
};

function slugToDisplay(slug: string): string {
	if (SLUG_TO_DISPLAY[slug]) return SLUG_TO_DISPLAY[slug];
	// Fallback: title-case the slug
	return slug
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

// ---------------------------------------------------------------------------
// BOOK_ORDER — canonical order for numbered filenames
// ---------------------------------------------------------------------------

export const BOOK_ORDER: string[] = [
	'genesis',
	'exodus',
	'leviticus',
	'numbers',
	'deuteronomy',
	'joshua',
	'judges',
	'ruth',
	'1-samuel',
	'2-samuel',
	'1-kings',
	'2-kings',
	'1-chronicles',
	'2-chronicles',
	'ezra',
	'nehemiah',
	'tobit',
	'judith',
	'esther',
	'job',
	'psalms',
	'proverbs',
	'ecclesiastes',
	'song-of-solomon',
	'wisdom',
	'sirach',
	'isaiah',
	'jeremiah',
	'lamentations',
	'baruch',
	'ezekiel',
	'daniel',
	'hosea',
	'joel',
	'amos',
	'obadiah',
	'jonah',
	'micah',
	'nahum',
	'habakkuk',
	'zephaniah',
	'haggai',
	'zechariah',
	'malachi',
	'1-maccabees',
	'2-maccabees',
	'matthew',
	'mark',
	'luke',
	'john',
	'acts',
	'romans',
	'1-corinthians',
	'2-corinthians',
	'galatians',
	'ephesians',
	'philippians',
	'colossians',
	'1-thessalonians',
	'2-thessalonians',
	'1-timothy',
	'2-timothy',
	'titus',
	'philemon',
	'hebrews',
	'james',
	'1-peter',
	'2-peter',
	'1-john',
	'2-john',
	'3-john',
	'jude',
	'revelation'
];

// ---------------------------------------------------------------------------
// BookResult types
// ---------------------------------------------------------------------------

interface VerseEntry {
	verse: number;
	text: string;
}

interface ChapterDrbo {
	chapter: number;
	summary: string;
	verses: VerseEntry[];
}

interface NoteEntry {
	verse: number;
	text: string;
}

interface ChapterNotes {
	chapter: number;
	notes: NoteEntry[];
}

interface CrossRefEntry {
	marker: number;
	verse: number;
	refs: string;
}

interface ChapterCrossRefs {
	chapter: number;
	crossrefs: CrossRefEntry[];
}

interface BookResult {
	slug: string;
	intro: string;
	drboChapters: ChapterDrbo[];
	noteChapters: ChapterNotes[];
	crossrefChapters: ChapterCrossRefs[];
}

// ---------------------------------------------------------------------------
// parseBookContent
// ---------------------------------------------------------------------------

/**
 * Parses a book's HTML content (concatenated body innerHTML) into structured data.
 */
export function parseBookContent(bookHtml: string, slug: string): BookResult {
	const root = parseHTML(`<div>${bookHtml}</div>`);
	const allPs = root.querySelectorAll('p');

	let intro = '';
	let currentChapter = 0;
	const verseParagraphs: string[] = [];
	const crossrefBlocks: string[] = []; // innerHTML of footnote-rule-above-space-after paragraphs
	const noteBlocks: string[] = []; // innerHTML of footnote-rule-above paragraphs

	// We collect paragraphs in order, tracking chapter positions within verseParagraphs
	let preFirstChapter = true;
	const verseParaChapterStarts: Array<{ chapter: number; summary: string; verseIdx: number }> = [];

	for (const p of allPs) {
		const cls = p.getAttribute('class') ?? '';

		// Chapter title classes: chapter-title, chapter-title1 (1 Samuel), chapter-title-extra-spac
		if (cls === 'chapter-title' || cls === 'chapter-title1' || cls === 'chapter-title-extra-spac') {
			// Detect chapter number — handle CHAPTER N, Chapter N, and PSALM N
			const text = p.text.trim();
			const chapMatch = text.match(/(?:CHAPTER|Chapter|PSALM|Psalm)\s+(\d+)/i);
			if (chapMatch) {
				currentChapter = parseInt(chapMatch[1], 10);
				preFirstChapter = false;
				verseParaChapterStarts.push({
					chapter: currentChapter,
					summary: '', // will be filled by the next chapter-heading
					verseIdx: verseParagraphs.length
				});
			}
			// Skip the title paragraph itself
			continue;
		}

		if (cls === 'chapter-heading') {
			const text = p.text.trim();
			if (preFirstChapter) {
				// Intro (before first chapter)
				intro = (intro ? intro + ' ' : '') + text;
			} else {
				// Summary for current chapter
				const lastEntry = verseParaChapterStarts[verseParaChapterStarts.length - 1];
				if (lastEntry) {
					lastEntry.summary = text;
				}
			}
			continue;
		}

		if (
			cls === 'bible-body' ||
			cls === 'bible-body-1st-line' ||
			cls.startsWith('bible-body-with-end-space')
		) {
			verseParagraphs.push(p.innerHTML);
			continue;
		}

		if (cls === 'footnote-rule-above-space-after') {
			crossrefBlocks.push(p.innerHTML);
			continue;
		}

		if (cls === 'footnote-rule-above') {
			noteBlocks.push(p.innerHTML);
			continue;
		}
	}

	// Handle single-chapter books with no CHAPTER/PSALM title paragraph
	// (Philemon, 2 John, 3 John, Jude, Obadiah)
	if (verseParaChapterStarts.length === 0 && verseParagraphs.length > 0) {
		verseParaChapterStarts.push({
			chapter: 1,
			summary: '',
			verseIdx: 0
		});
	}

	// -----------------------------------------------------------------------
	// Build drboChapters — assign verses to chapters
	// -----------------------------------------------------------------------

	const drboChapters: ChapterDrbo[] = [];

	for (let ci = 0; ci < verseParaChapterStarts.length; ci++) {
		const { chapter, summary, verseIdx } = verseParaChapterStarts[ci];
		const nextVerseIdx =
			ci + 1 < verseParaChapterStarts.length
				? verseParaChapterStarts[ci + 1].verseIdx
				: verseParagraphs.length;

		const paraSlice = verseParagraphs.slice(verseIdx, nextVerseIdx);
		const parsedVerses = extractVersesFromParagraphs(paraSlice);

		// Deduplicate/merge verses with same number (some verse text spans multiple paragraphs)
		const verseMap = new Map<number, string>();
		for (const pv of parsedVerses) {
			if (verseMap.has(pv.verse)) {
				verseMap.set(pv.verse, verseMap.get(pv.verse)! + ' ' + pv.text);
			} else {
				verseMap.set(pv.verse, pv.text);
			}
		}

		const verses: VerseEntry[] = Array.from(verseMap.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([verse, text]) => ({ verse, text: text.trim() }));

		drboChapters.push({ chapter, summary, verses });
	}

	// -----------------------------------------------------------------------
	// Build noteChapters — parse note blocks
	// -----------------------------------------------------------------------

	const notesMap = new Map<number, NoteEntry[]>();
	let trackedChapter = 1;

	for (const nb of noteBlocks) {
		const parsed = parseNoteBlock(nb);
		if (parsed.chapter !== null) {
			trackedChapter = parsed.chapter;
		}
		if (parsed.verse === 0) continue; // skip malformed
		const chap = trackedChapter;
		if (!notesMap.has(chap)) notesMap.set(chap, []);
		notesMap.get(chap)!.push({ verse: parsed.verse, text: parsed.text });
	}

	const noteChapters: ChapterNotes[] = Array.from(notesMap.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([chapter, notes]) => ({ chapter, notes }));

	// -----------------------------------------------------------------------
	// Build crossrefChapters — parse crossref blocks and map markers to verses
	// -----------------------------------------------------------------------

	// Build a quick lookup: chapter → markerNumber → verse
	// We need to map markers to verses within each chapter
	const markerToVerseMap = new Map<number, Map<number, number>>();

	for (const ch of drboChapters) {
		const mMap = new Map<number, number>();
		for (const v of ch.verses) {
			// Extract markers from verse text
			const markerRegex = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;
			let m: RegExpExecArray | null;
			while ((m = markerRegex.exec(v.text)) !== null) {
				const markerNum = superscriptToNumberInternal(m[0]);
				if (!mMap.has(markerNum)) {
					mMap.set(markerNum, v.verse);
				}
			}
		}
		markerToVerseMap.set(ch.chapter, mMap);
	}

	// Parse all crossref blocks — they may span chapters (chapterBreak)
	const crossrefsMap = new Map<number, CrossRefEntry[]>();
	let crossrefCurrentChapter = drboChapters[0]?.chapter ?? 1;

	for (const cb of crossrefBlocks) {
		const parsedRefs = parseCrossRefBlock(cb);
		for (const pr of parsedRefs) {
			// If the entry itself has a chapter field (from chapterBreak), use it
			if (pr.chapter !== undefined) {
				crossrefCurrentChapter = pr.chapter;
			}

			// If chapterBreak is set, the CHAP marker precedes the next entries
			// but the current entry still belongs to the previous chapter
			// (handled by parseCrossRefBlock setting .chapter on post-break entries)

			const chap = crossrefCurrentChapter;
			const chapMMap = markerToVerseMap.get(chap);
			const verseNum = chapMMap?.get(pr.marker) ?? 0;

			if (!crossrefsMap.has(chap)) crossrefsMap.set(chap, []);
			crossrefsMap.get(chap)!.push({
				marker: pr.marker,
				verse: verseNum,
				refs: pr.refs
			});

			// After a chapterBreak, update tracking for subsequent entries
			if (pr.chapterBreak !== undefined) {
				crossrefCurrentChapter = pr.chapterBreak;
			}
		}
	}

	const crossrefChapters: ChapterCrossRefs[] = Array.from(crossrefsMap.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([chapter, crossrefs]) => ({ chapter, crossrefs }));

	return { slug, intro, drboChapters, noteChapters, crossrefChapters };
}

// Internal helper (mirrors the module-level superscriptToNumber)
function superscriptToNumberInternal(sup: string): number {
	const SUPER_TO_DIG: Record<string, string> = {
		'⁰': '0',
		'¹': '1',
		'²': '2',
		'³': '3',
		'⁴': '4',
		'⁵': '5',
		'⁶': '6',
		'⁷': '7',
		'⁸': '8',
		'⁹': '9'
	};
	const digits = sup
		.split('')
		.map((ch) => SUPER_TO_DIG[ch] ?? ch)
		.join('');
	return parseInt(digits, 10);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	// 1. Read all Bible-*.xhtml files, sorted
	const allFiles = (await readdir(EPUB_DIR)).filter((f) => f.match(/^Bible-\d/)).sort();

	console.log(`Found ${allFiles.length} Bible xhtml files.`);

	// 2. Concatenate all body content
	let combinedHtml = '';
	for (const fname of allFiles) {
		const raw = await readFile(join(EPUB_DIR, fname), 'utf-8');
		// Extract <body ...> ... </body>
		const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
		if (bodyMatch) {
			combinedHtml += bodyMatch[1];
		}
	}

	console.log(`Combined HTML length: ${combinedHtml.length} chars`);

	// 3. Find all book anchors — use broad pattern to catch all anchor formats
	// Pattern: <a id="SOME_ID" ...> or <a id="SOME_ID"/>
	const anchorRegex = /<a\s+[^>]*id="([^"]+)"[^>]*>/gi;
	const foundAnchors: string[] = [];
	let m: RegExpExecArray | null;
	while ((m = anchorRegex.exec(combinedHtml)) !== null) {
		const id = m[1];
		// Only collect anchors that map to known slugs OR look like book-level anchors
		// (skip x.NNNNN style internal anchors)
		if (!id.match(/^x\.\d+$/)) {
			foundAnchors.push(id);
		}
	}

	console.log(`Found ${foundAnchors.length} non-internal anchors.`);

	// 4. Filter to only book-level anchors (those in BOOK_ANCHOR_TO_SLUG)
	const bookAnchors: string[] = [];
	const unknownAnchors: string[] = [];

	for (const id of foundAnchors) {
		if (BOOK_ANCHOR_TO_SLUG[id]) {
			if (!bookAnchors.includes(id)) {
				bookAnchors.push(id);
			}
		} else {
			unknownAnchors.push(id);
		}
	}

	if (unknownAnchors.length > 0) {
		console.warn(`WARNING: Unknown anchor IDs (not in BOOK_ANCHOR_TO_SLUG):`);
		for (const id of unknownAnchors) {
			console.warn(`  "${id}"`);
		}
	}

	console.log(`Book anchors found: ${bookAnchors.length}`);

	// 5. Split HTML by book anchors
	// Build split points: find position of each book anchor in the combined HTML
	interface SplitPoint {
		anchor: string;
		slug: string;
		pos: number;
	}

	const splitPoints: SplitPoint[] = [];

	for (const anchor of bookAnchors) {
		// Escape special regex chars in anchor ID
		const escapedId = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const re = new RegExp(`<a\\s[^>]*id="${escapedId}"[^>]*>`, 'i');
		const match = re.exec(combinedHtml);
		if (match) {
			splitPoints.push({
				anchor,
				slug: BOOK_ANCHOR_TO_SLUG[anchor],
				pos: match.index
			});
		}
	}

	// Sort by position
	splitPoints.sort((a, b) => a.pos - b.pos);

	// Deduplicate: some anchors appear twice (e.g. 2-chronicles has two entries in map)
	const seenSlugs = new Set<string>();
	const uniqueSplitPoints: SplitPoint[] = [];
	for (const sp of splitPoints) {
		if (!seenSlugs.has(sp.slug)) {
			seenSlugs.add(sp.slug);
			uniqueSplitPoints.push(sp);
		}
	}

	console.log(`Unique book split points: ${uniqueSplitPoints.length}`);

	// 6. Extract book HTML slices
	interface BookSlice {
		slug: string;
		html: string;
	}

	const bookSlices: BookSlice[] = [];
	for (let i = 0; i < uniqueSplitPoints.length; i++) {
		const start = uniqueSplitPoints[i].pos;
		const end =
			i + 1 < uniqueSplitPoints.length ? uniqueSplitPoints[i + 1].pos : combinedHtml.length;
		bookSlices.push({
			slug: uniqueSplitPoints[i].slug,
			html: combinedHtml.slice(start, end)
		});
	}

	// 7. Create output directories
	const drboDir = join(DRC_OUT, 'JSON_drbo');
	const notesDir = join(DRC_OUT, 'JSON_Converted');
	const crossrefsDir = join(DRC_OUT, 'JSON_crossrefs');

	await mkdir(drboDir, { recursive: true });
	await mkdir(notesDir, { recursive: true });
	await mkdir(crossrefsDir, { recursive: true });

	console.log(`Output directories created.`);

	// 8. Process each book
	let processed = 0;
	let skipped = 0;

	for (const { slug, html } of bookSlices) {
		const bookNum = BOOK_ORDER.indexOf(slug) + 1;
		if (bookNum === 0) {
			console.warn(`WARNING: slug "${slug}" not found in BOOK_ORDER — skipping`);
			skipped++;
			continue;
		}

		const nn = String(bookNum).padStart(2, '0');
		const displayName = slugToDisplay(slug);

		let result: BookResult;
		try {
			result = parseBookContent(html, slug);
		} catch (err) {
			console.error(`ERROR processing ${slug}: ${err}`);
			skipped++;
			continue;
		}

		// JSON_drbo
		const drboJson = {
			book: displayName,
			version_abbr: 'DRC',
			date: '1941',
			intro: result.intro,
			chapters: result.drboChapters.map((ch) => ({
				chapter: ch.chapter,
				summary: ch.summary,
				verses: ch.verses
			}))
		};

		// JSON_Converted (notes)
		const notesJson = {
			book: displayName,
			version_abbr: 'DRC',
			date: '1941',
			chapters: result.noteChapters.map((ch) => ({
				chapter: ch.chapter,
				notes: ch.notes
			}))
		};

		// JSON_crossrefs
		const crossrefsJson = {
			book: displayName,
			chapters: result.crossrefChapters.map((ch) => ({
				chapter: ch.chapter,
				crossrefs: ch.crossrefs
			}))
		};

		const filename = `${nn}-${slug}.json`;
		await writeFile(join(drboDir, filename), JSON.stringify(drboJson, null, 2), 'utf-8');
		await writeFile(join(notesDir, filename), JSON.stringify(notesJson, null, 2), 'utf-8');
		await writeFile(join(crossrefsDir, filename), JSON.stringify(crossrefsJson, null, 2), 'utf-8');

		const verseCount = result.drboChapters.reduce((sum, ch) => sum + ch.verses.length, 0);
		console.log(
			`  ${nn}-${slug}: ${result.drboChapters.length} chapters, ${verseCount} verses, ${result.noteChapters.reduce((s, c) => s + c.notes.length, 0)} notes, ${result.crossrefChapters.reduce((s, c) => s + c.crossrefs.length, 0)} crossrefs`
		);
		processed++;
	}

	console.log(`\nDone. Processed: ${processed}, Skipped: ${skipped}`);
	console.log(`Output: ${DRC_OUT}`);
}

// Run main
main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
