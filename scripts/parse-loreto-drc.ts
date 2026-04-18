// @ts-nocheck — build script run with tsx, not part of the Svelte app
import { parse as parseHTML } from 'node-html-parser';

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

	const children = div.childNodes.filter(
		(n) => n.nodeType === 1
	) as import('node-html-parser').HTMLElement[];

	let chapter: number | null = null;
	let verse = 0;
	let lemma = '';
	let bodyParts: string[] = [];
	let headerProcessed = false;

	for (let i = 0; i < children.length; i++) {
		const el = children[i];
		const cls = el.getAttribute('class') ?? '';
		const text = el.text;

		if (!headerProcessed && cls === 'plain-bible1') {
			// Try to parse "CHAP. N. Ver. N." or just "Ver. N."
			const chapVerMatch = text.match(/CHAP\.\s*(\d+)\.\s*Ver\.\s*(\d+)\./i);
			const verOnlyMatch = text.match(/^Ver\.\s*(\d+)\./i);

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
			lemma = text.trim();
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
		// The body usually starts with ". " or "... " — normalize to "... "
		body = body.replace(/^\.\s*/, '... ');
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
	'ST.-JUDE': 'jude'
};
