import type { OsisRange } from './reference';
import { parseAllReferences } from './reference';

export type CrossRefToken =
	| { type: 'ref'; osis: string; display: string; isVerse: boolean }
	| { type: 'text'; content: string };

const ABBREV_TO_OSIS: Record<string, string> = {
	// Pentateuch
	Gen: 'Gen',
	Exo: 'Exod',
	Exod: 'Exod',
	Lev: 'Lev',
	Levit: 'Lev',
	Num: 'Num',
	Numer: 'Num',
	Deut: 'Deut',
	Deuteron: 'Deut',
	// Historical
	Jos: 'Josh',
	Josue: 'Josh',
	Judic: 'Judg',
	Ruth: 'Ruth',
	'1Reg': '1Sam',
	'2Reg': '2Sam',
	'3Reg': '1Kgs',
	'4Reg': '2Kgs',
	'1Par': '1Chr',
	'2Par': '2Chr',
	'1Paral': '1Chr',
	'2Paral': '2Chr',
	'1Paralip': '1Chr',
	'2Paralip': '2Chr',
	'1Esd': 'Ezra',
	'2Esd': 'Neh',
	Esdr: 'Ezra',
	Tob: 'Tob',
	Tobias: 'Tob',
	Judith: 'Jdt',
	Jdt: 'Jdt',
	Esth: 'Esth',
	Esther: 'Esth',
	'1Mach': '1Macc',
	'2Mach': '2Macc',
	'1Mac': '1Macc',
	'2Mac': '2Macc',
	'1Macch': '1Macc',
	'2Macch': '2Macc',
	// Wisdom
	Job: 'Job',
	Ps: 'Ps',
	Psal: 'Ps',
	Psalm: 'Ps',
	Prov: 'Prov',
	Prover: 'Prov',
	Eccl: 'Eccl',
	Ecclus: 'Sir',
	Eccli: 'Sir',
	Cant: 'Cant',
	Song: 'Cant',
	Sap: 'Wis',
	Wisd: 'Wis',
	// Major prophets
	Isa: 'Isa',
	Isai: 'Isa',
	Jer: 'Jer',
	Jerem: 'Jer',
	Lam: 'Lam',
	Thren: 'Lam',
	Bar: 'Bar',
	Ezech: 'Ezek',
	Dan: 'Dan',
	// Minor prophets
	Osee: 'Hos',
	Joel: 'Joel',
	Amos: 'Amos',
	Abd: 'Obad',
	Abdias: 'Obad',
	Jon: 'Jonah',
	Jonas: 'Jonah',
	Mich: 'Mic',
	Micheas: 'Mic',
	Nah: 'Nah',
	Nahum: 'Nah',
	Habac: 'Hab',
	Soph: 'Zeph',
	Sophon: 'Zeph',
	Sophonias: 'Zeph',
	Agg: 'Hag',
	Aggeus: 'Hag',
	Zach: 'Zech',
	Zacharias: 'Zech',
	Mal: 'Mal',
	Malach: 'Mal',
	// NT Gospels & Acts
	Matt: 'Matt',
	Mat: 'Matt',
	Mar: 'Mark',
	Marc: 'Mark',
	Mark: 'Mark',
	Luc: 'Luke',
	Luk: 'Luke',
	Joan: 'John',
	Joa: 'John',
	Act: 'Acts',
	// NT Epistles
	Rom: 'Rom',
	'1Cor': '1Cor',
	'2Cor': '2Cor',
	Gal: 'Gal',
	Eph: 'Eph',
	Ephes: 'Eph',
	Phil: 'Phil',
	Philipp: 'Phil',
	Col: 'Col',
	Coloss: 'Col',
	'1Thess': '1Thess',
	'2Thess': '2Thess',
	'1Thes': '1Thess',
	'2Thes': '2Thess',
	'1Tim': '1Tim',
	'2Tim': '2Tim',
	Tit: 'Titus',
	Titus: 'Titus',
	Philem: 'Phlm',
	Heb: 'Heb',
	Hebr: 'Heb',
	Jac: 'Jas',
	Jacob: 'Jas',
	Jas: 'Jas',
	'1Pet': '1Pet',
	'2Pet': '2Pet',
	'1Petr': '1Pet',
	'2Petr': '2Pet',
	'1Joan': '1John',
	'2Joan': '2John',
	'3Joan': '3John',
	Jude: 'Jude',
	Judas: 'Jude',
	Apoc: 'Rev',
	Apocalypse: 'Rev'
};

/** Sorted longest-first for greedy matching */
const SORTED_ABBREVS = Object.keys(ABBREV_TO_OSIS).sort((a, b) => b.length - a.length);

/** Known patristic / non-Bible prefixes that should suppress a match */
const PATRISTIC_PREFIXES =
	/(?:^|\s)(?:S\.\s*|de\s+|ad\s+|in\s+|super\.\s*|cont\.\s*|l\.\s*\d+\.\s*de\s+)/i;

interface BookMatch {
	osisBook: string;
	/** Start index in the source string (including any digit prefix) */
	displayStart: number;
	/** End index (exclusive) right after the period following the abbreviation */
	end: number;
}

/**
 * Try to match a Bible book abbreviation at position `pos` in `text`.
 * Handles numbered-book prefixes like "2. Thess."
 */
function matchBookAt(text: string, pos: number): BookMatch | null {
	let cursor = pos;
	let numPrefix = '';

	// Check for numbered book prefix: digit + optional ". "
	const numMatch = text.slice(cursor).match(/^(\d)\.\s*/);
	if (numMatch) {
		numPrefix = numMatch[1];
		cursor += numMatch[0].length;
	}

	for (const abbrev of SORTED_ABBREVS) {
		// Only check abbreviations that start with a digit if we have a digit prefix
		if (/^\d/.test(abbrev) && !numPrefix) continue;
		// If abbreviation starts with digit, it must match our numPrefix
		if (/^\d/.test(abbrev)) {
			if (abbrev[0] !== numPrefix) continue;
			const rest = abbrev.slice(1);
			const slice = text.slice(cursor);
			if (!slice.startsWith(rest)) continue;
			// Must be followed by "." or end
			const afterIdx = cursor + rest.length;
			if (afterIdx < text.length && text[afterIdx] !== '.') continue;
			const endIdx = afterIdx < text.length ? afterIdx + 1 : afterIdx;
			return { osisBook: ABBREV_TO_OSIS[abbrev], displayStart: pos, end: endIdx };
		}

		// Non-numbered abbreviation
		if (numPrefix) continue; // If we consumed a digit prefix, skip non-numbered abbrevs

		const slice = text.slice(cursor);
		if (!slice.startsWith(abbrev)) continue;
		// Must be followed by "." or end of string
		const afterIdx = cursor + abbrev.length;
		if (afterIdx < text.length && text[afterIdx] !== '.') continue;
		const endIdx = afterIdx < text.length ? afterIdx + 1 : afterIdx;
		return { osisBook: ABBREV_TO_OSIS[abbrev], displayStart: pos, end: endIdx };
	}

	return null;
}

interface ChapterVerseResult {
	chapter: number;
	verse?: number;
	consumed: number; // how many chars consumed after the book match end
	display: string;
}

/**
 * Parse chapter (and optional verse) after a matched book position.
 * Returns null if no valid chapter number follows.
 */
function parseChapterVerse(text: string, startPos: number): ChapterVerseResult | null {
	let cursor = startPos;
	// skip whitespace
	while (cursor < text.length && text[cursor] === ' ') cursor++;

	// Must start with a digit
	if (cursor >= text.length || !/\d/.test(text[cursor])) return null;

	// Read chapter number
	const chMatch = text.slice(cursor).match(/^(\d+)/);
	if (!chMatch) return null;
	const chapter = parseInt(chMatch[1], 10);
	cursor += chMatch[0].length;

	// skip optional period and whitespace after chapter
	if (cursor < text.length && text[cursor] === '.') cursor++;
	while (cursor < text.length && text[cursor] === ' ') cursor++;

	// Now look for verse
	let verse: number | undefined;

	// Case 1: comma separator — "10, 16"
	if (cursor < text.length && text[cursor] === ',') {
		cursor++; // skip comma
		while (cursor < text.length && text[cursor] === ' ') cursor++;
		const vMatch = text.slice(cursor).match(/^(\d+)/);
		if (vMatch) {
			verse = parseInt(vMatch[1], 10);
			cursor += vMatch[0].length;
			// skip trailing period
			if (cursor < text.length && text[cursor] === '.') cursor++;
		}
	}
	// Case 2: "v." marker — "1. v. 3."
	else if (text.slice(cursor).match(/^v\.\s*/)) {
		const vMarker = text.slice(cursor).match(/^v\.\s*/);
		if (vMarker) {
			cursor += vMarker[0].length;
			const vMatch = text.slice(cursor).match(/^(\d+)/);
			if (vMatch) {
				verse = parseInt(vMatch[1], 10);
				cursor += vMatch[0].length;
				if (cursor < text.length && text[cursor] === '.') cursor++;
			}
		}
	}
	// Case 3: period separator — another digit follows (chapter already consumed period)
	// We already consumed the period after chapter above, check if a digit follows
	else if (cursor < text.length && /\d/.test(text[cursor])) {
		const vMatch = text.slice(cursor).match(/^(\d+)/);
		if (vMatch) {
			verse = parseInt(vMatch[1], 10);
			cursor += vMatch[0].length;
			if (cursor < text.length && text[cursor] === '.') cursor++;
		}
	}

	return {
		chapter,
		verse,
		consumed: cursor - startPos,
		display: ''
	};
}

/**
 * Disambiguation: check that after a book abbreviation, the next non-whitespace
 * is a digit or "v." — not a letter (which would indicate patristic context).
 */
function isFollowedByChapterIndicator(text: string, pos: number): boolean {
	let cursor = pos;
	while (cursor < text.length && text[cursor] === ' ') cursor++;
	if (cursor >= text.length) return false;
	if (/\d/.test(text[cursor])) return true;
	if (text.slice(cursor).startsWith('v.')) return true;
	return false;
}

/**
 * Check if a match at `pos` is preceded by patristic context words
 * like "de ", "ad ", "super. ", "S. ", "cont. "
 */
function isPrecededByPatristicContext(text: string, pos: number): boolean {
	const before = text.slice(0, pos);
	// Check for common patristic lead-ins right before the match
	if (/(?:de|ad|in|super\.|cont\.|l\.\s*\d+\.\s*de)\s*$/i.test(before)) return true;
	return false;
}

export function tokenizeCrossRef(text: string): CrossRefToken[] {
	const tokens: CrossRefToken[] = [];
	let pos = 0;
	let textStart = 0;

	while (pos < text.length) {
		// Try to match a book at this position
		const bookMatch = matchBookAt(text, pos);

		if (bookMatch) {
			// Disambiguation checks
			const followedByChapter = isFollowedByChapterIndicator(text, bookMatch.end);
			const patristicContext = isPrecededByPatristicContext(text, pos);

			if (followedByChapter && !patristicContext) {
				// We have a Bible reference
				const cv = parseChapterVerse(text, bookMatch.end);

				if (cv) {
					// Flush any preceding text
					if (pos > textStart) {
						tokens.push({ type: 'text', content: text.slice(textStart, pos) });
					}

					const isVerse = cv.verse !== undefined;
					let osis = bookMatch.osisBook + '.' + cv.chapter;
					if (cv.verse !== undefined) {
						osis += '.' + cv.verse;
					}

					const displayEnd = bookMatch.end + cv.consumed;
					const display = text.slice(bookMatch.displayStart, displayEnd).trim();

					tokens.push({ type: 'ref', osis, display, isVerse });

					pos = displayEnd;
					textStart = pos;
					continue;
				}
			}
		}

		pos++;
	}

	// Flush remaining text
	if (textStart < text.length) {
		tokens.push({ type: 'text', content: text.slice(textStart) });
	}

	return tokens;
}

/** Map of old abbreviations to modern book names for parseAllReferences */
const ABBREV_TO_MODERN: Record<string, string> = {
	Gen: 'Genesis',
	Exo: 'Exodus',
	Exod: 'Exodus',
	Lev: 'Leviticus',
	Levit: 'Leviticus',
	Num: 'Numbers',
	Numer: 'Numbers',
	Deut: 'Deuteronomy',
	Deuteron: 'Deuteronomy',
	Jos: 'Joshua',
	Josue: 'Joshua',
	Judic: 'Judges',
	Ruth: 'Ruth',
	Tob: 'Tobit',
	Tobias: 'Tobit',
	Judith: 'Judith',
	Jdt: 'Judith',
	Esth: 'Esther',
	Esther: 'Esther',
	Job: 'Job',
	Ps: 'Psalms',
	Psal: 'Psalms',
	Psalm: 'Psalms',
	Prov: 'Proverbs',
	Prover: 'Proverbs',
	Eccl: 'Ecclesiastes',
	Ecclus: 'Sirach',
	Eccli: 'Sirach',
	Cant: 'Song of Solomon',
	Song: 'Song of Solomon',
	Sap: 'Wisdom',
	Wisd: 'Wisdom',
	Isa: 'Isaiah',
	Isai: 'Isaiah',
	Jer: 'Jeremiah',
	Jerem: 'Jeremiah',
	Lam: 'Lamentations',
	Thren: 'Lamentations',
	Bar: 'Baruch',
	Ezech: 'Ezekiel',
	Dan: 'Daniel',
	Osee: 'Hosea',
	Joel: 'Joel',
	Amos: 'Amos',
	Abd: 'Obadiah',
	Abdias: 'Obadiah',
	Jon: 'Jonah',
	Jonas: 'Jonah',
	Mich: 'Micah',
	Micheas: 'Micah',
	Nah: 'Nahum',
	Nahum: 'Nahum',
	Habac: 'Habakkuk',
	Soph: 'Zephaniah',
	Sophon: 'Zephaniah',
	Sophonias: 'Zephaniah',
	Agg: 'Haggai',
	Aggeus: 'Haggai',
	Zach: 'Zechariah',
	Zacharias: 'Zechariah',
	Mal: 'Malachi',
	Malach: 'Malachi',
	Matt: 'Matthew',
	Mat: 'Matthew',
	Mar: 'Mark',
	Marc: 'Mark',
	Mark: 'Mark',
	Luc: 'Luke',
	Luk: 'Luke',
	Joan: 'John',
	Joa: 'John',
	Act: 'Acts',
	Rom: 'Romans',
	Gal: 'Galatians',
	Eph: 'Ephesians',
	Ephes: 'Ephesians',
	Phil: 'Philippians',
	Philipp: 'Philippians',
	Col: 'Colossians',
	Coloss: 'Colossians',
	Tit: 'Titus',
	Titus: 'Titus',
	Philem: 'Philemon',
	Heb: 'Hebrews',
	Hebr: 'Hebrews',
	Jac: 'James',
	Jacob: 'James',
	Jas: 'James',
	Jude: 'Jude',
	Judas: 'Jude',
	Apoc: 'Revelation',
	Apocalypse: 'Revelation'
};

const SORTED_MODERN_ABBREVS = Object.keys(ABBREV_TO_MODERN).sort((a, b) => b.length - a.length);

/**
 * Normalize old Douay-Rheims abbreviations in italic text to modern names
 * that parseAllReferences can handle.
 */
function normalizeForParser(text: string): string {
	let result = text;

	// Handle numbered books like "1. Cor." → "1 Corinthians"
	result = result.replace(
		/(\d)\.\s*(Cor|Thess|Thes|Tim|Pet|Petr|Joan|Mach|Mac|Macch|Reg|Par|Paral|Paralip|Esd)\./gi,
		(_, num, abbr) => {
			const key = num + abbr;
			// Look up the combined key
			if (key in ABBREV_TO_OSIS) {
				const osis = ABBREV_TO_OSIS[key];
				// Map OSIS to modern name
				const modernMap: Record<string, string> = {
					'1Cor': '1 Corinthians',
					'2Cor': '2 Corinthians',
					'1Thess': '1 Thessalonians',
					'2Thess': '2 Thessalonians',
					'1Tim': '1 Timothy',
					'2Tim': '2 Timothy',
					'1Pet': '1 Peter',
					'2Pet': '2 Peter',
					'1John': '1 John',
					'2John': '2 John',
					'3John': '3 John',
					'1Sam': '1 Samuel',
					'2Sam': '2 Samuel',
					'1Kgs': '1 Kings',
					'2Kgs': '2 Kings',
					'1Chr': '1 Chronicles',
					'2Chr': '2 Chronicles',
					Ezra: 'Ezra',
					Neh: 'Nehemiah',
					'1Macc': '1 Maccabees',
					'2Macc': '2 Maccabees'
				};
				return modernMap[osis] || `${num} ${abbr}`;
			}
			return `${num} ${abbr}`;
		}
	);

	// Replace non-numbered abbreviations
	for (const abbrev of SORTED_MODERN_ABBREVS) {
		if (/^\d/.test(abbrev)) continue; // skip numbered
		const pattern = new RegExp(`\\b${abbrev}\\.`, 'g');
		result = result.replace(pattern, ABBREV_TO_MODERN[abbrev]);
	}

	// Convert comma-separated verse to colon: "13, 14" → "13:14"
	result = result.replace(/(\d+),\s*(\d+)/g, '$1:$2');

	// Convert "v. N" to ":N" when preceded by chapter
	result = result.replace(/(\d+)\.\s*v\.\s*(\d+)/g, '$1:$2');

	return result;
}

export function parseItalicRef(text: string): OsisRange[] | null {
	// Quick check: if text has no digits, it's unlikely to be a reference
	if (!/\d/.test(text)) return null;

	// Check for patristic indicators
	if (/\b(?:Homi|Epist|Serm|Tract|lib|cont|Baptis|Martyres)\b/i.test(text)) return null;

	const normalized = normalizeForParser(text);
	const refs = parseAllReferences(normalized);

	return refs.length > 0 ? refs : null;
}
