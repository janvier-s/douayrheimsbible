import { bcv_parser } from 'bible-passage-reference-parser/esm/bcv_parser.js';
import * as lang from 'bible-passage-reference-parser/esm/lang/en.js';

const parser = new bcv_parser(lang);

const NORMALISE: [RegExp, string][] = [
	[/\bJosue\b/gi, 'Joshua'],
	[/\bIsaie\b/gi, 'Isaiah'],
	[/\bJeremie\b/gi, 'Jeremiah'],
	[/\bEzechiel\b/gi, 'Ezekiel'],
	[/\bOsee\b/gi, 'Hosea'],
	[/\bAbdias\b/gi, 'Obadiah'],
	[/\bJonas\b/gi, 'Jonah'],
	[/\bMicheas\b/gi, 'Micah'],
	[/\bHabacuc\b/gi, 'Habakkuk'],
	[/\bSophonias\b/gi, 'Zephaniah'],
	[/\bAggeus\b/gi, 'Haggai'],
	[/\bZacharias\b/gi, 'Zechariah'],
	[/\bMalachie\b/gi, 'Malachi'],
	[/\bMachabees\b/gi, 'Maccabees'],
	[/\bMachabee\b/gi, 'Maccabees'],
	[/\bTobias\b/gi, 'Tobit'],
	[/\bEcclus\b/gi, 'Sir'],
	[/\bEcclesiasticus\b/gi, 'Sir'],
	[/\b1\s*Paralipomenon\b/gi, '1 Chronicles'],
	[/\b2\s*Paralipomenon\b/gi, '2 Chronicles'],
	[/\bCanticle\s+of\s+Canticles\b/gi, 'Song of Solomon'],
	[/\bApocalypse\b/gi, 'Revelation'],
	[/\b1\s*Ma\b/gi, '1 Maccabees'],
	[/\b2\s*Ma\b/gi, '2 Maccabees'],
	[/\b1M\b/g, '1 Maccabees'],
	[/\b2M\b/g, '2 Maccabees']
];

function normaliseInput(input: string): string {
	return NORMALISE.reduce((s, [pat, rep]) => s.replace(pat, rep), input);
}

parser.set_options({
	book_alone_strategy: 'full_chapter',
	book_sequence_strategy: 'ignore',
	invalid_sequence_strategy: 'ignore',
	sequence_combination_strategy: 'combine',
	punctuation_strategy: 'us',
	zero_chapter_strategy: 'error',
	zero_verse_strategy: 'upgrade',
	single_chapter_1_strategy: 'chapter',
	osis_compaction_strategy: 'bc',
	captive_end_digits_strategy: 'delete',
	testaments: 'ona'
});

export interface ParsedReference {
	book: string;
	chapter: number;
	verse?: number;
}

/**
 * Parse a Psalm reference directly, bypassing bcv_parser's Protestant verse-count
 * validation. DR/LXX Psalms have different chapter/verse counts than Protestant.
 */
function parsePsalmRef(
	input: string
): { chapter: number; verse?: number; endVerse?: number } | null {
	const m = input.match(/^(?:Psalms?|Ps)\s*(\d+)(?:[:\s,]\s*(\d+)(?:\s*[-\u2013]\s*(\d+))?)?/i);
	if (!m) return null;
	return {
		chapter: parseInt(m[1]),
		verse: m[2] ? parseInt(m[2]) : undefined,
		endVerse: m[3] ? parseInt(m[3]) : undefined
	};
}

export function parseReference(input: string): ParsedReference | null {
	const normalised = normaliseInput(input.trim()).replace(/^(\d)\s+/, '$1');

	// Bypass bcv_parser for Psalms — Protestant verse counts differ from DR/LXX
	const ps = parsePsalmRef(normalised);
	if (ps) return { book: 'Ps', chapter: ps.chapter, verse: ps.verse };

	const result = parser.parse(normalised);
	const passages = result.osis_and_indices();

	if (!passages.length) return null;

	const osisStr: string = passages[0].osis;

	// Handle range like "Mark.1-Mark.16" (book-alone with full_chapter strategy)
	const rangeMatch = osisStr.match(/^([^.]+)\.(\d+)-[^.]+\.\d+$/);
	if (rangeMatch) {
		return { book: rangeMatch[1], chapter: parseInt(rangeMatch[2], 10) };
	}

	const parts = osisStr.split('.');

	if (parts.length < 2) {
		return { book: parts[0], chapter: 1 };
	}

	return {
		book: parts[0],
		chapter: parseInt(parts[1], 10),
		verse: parts[2] ? parseInt(parts[2], 10) : undefined
	};
}

export interface OsisRange {
	/** Raw OSIS string e.g. "Matt.3.2-Matt.3.12" */
	osis: string;
	/** OSIS book code e.g. "Matt" */
	book: string;
	startChapter: number;
	startVerse?: number;
	endChapter: number;
	endVerse?: number;
}

/**
 * Parse input into all OSIS references.
 * Handles multi-reference queries like "Matt 3:2-12, John 5:1-6".
 */
export function parseAllReferences(input: string): OsisRange[] {
	const normalised = normaliseInput(input.trim()).replace(/^(\d)\s+/, '$1');

	// Bypass bcv_parser for Psalms — Protestant verse counts differ from DR/LXX
	const ps = parsePsalmRef(normalised);
	if (ps) {
		const { chapter: ch, verse: sv, endVerse: ev } = ps;
		let osis: string;
		if (sv !== undefined) {
			osis = ev !== undefined && ev !== sv ? `Ps.${ch}.${sv}-Ps.${ch}.${ev}` : `Ps.${ch}.${sv}`;
		} else {
			osis = `Ps.${ch}`;
		}
		const range = parseOsis(osis);
		if (range) return [range];
	}

	const result = parser.parse(normalised);
	const passages = result.osis_and_indices();

	if (!passages.length) return [];

	const ranges: OsisRange[] = [];

	for (const passage of passages) {
		// Each passage.osis may contain comma-separated refs e.g. "Matt.3.2-Matt.3.12,John.5.1-John.5.6"
		const osisRefs = passage.osis.split(',');
		for (const osis of osisRefs) {
			const range = parseOsis(osis);
			if (range) ranges.push(range);
		}
	}

	return ranges;
}

export function parseOsis(osis: string): OsisRange | null {
	// Formats: "Book.Ch", "Book.Ch.V", "Book.Ch.V-Book.Ch.V", "Book.Ch-Book.Ch"
	const rangeMatch = osis.match(/^([^.]+)\.(\d+)(?:\.(\d+))?(?:-[^.]+\.(\d+)(?:\.(\d+))?)?$/);
	if (!rangeMatch) return null;

	const [, book, sCh, sV, eCh, eV] = rangeMatch;
	return {
		osis,
		book,
		startChapter: parseInt(sCh, 10),
		startVerse: sV ? parseInt(sV, 10) : undefined,
		endChapter: eCh ? parseInt(eCh, 10) : parseInt(sCh, 10),
		endVerse: eV ? parseInt(eV, 10) : sV ? parseInt(sV, 10) : undefined
	};
}
