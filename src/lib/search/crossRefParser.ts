import type { OsisRange } from './reference';
import { parseAllReferences } from './reference';

export type CrossRefToken =
	| { type: 'ref'; osis: string; display: string; isVerse: boolean }
	| { type: 'text'; content: string };

const ABBREV_TO_OSIS: Record<string, string> = {
	// Pentateuch (full names + abbreviations)
	Genesis: 'Gen',
	Gen: 'Gen',
	Ex: 'Exod',
	Exo: 'Exod',
	Exod: 'Exod',
	Exodus: 'Exod',
	Lev: 'Lev',
	Levi: 'Lev',
	Levit: 'Lev',
	Nu: 'Num',
	Num: 'Num',
	Numer: 'Num',
	Numb: 'Num',
	Deu: 'Deut',
	Deut: 'Deut',
	Deuter: 'Deut',
	Deuteron: 'Deut',
	// Historical
	Jos: 'Josh',
	Ios: 'Josh',
	Iosu: 'Josh',
	Iosue: 'Josh',
	Josue: 'Josh',
	Judges: 'Judg',
	Judic: 'Judg',
	Iudic: 'Judg',
	Iudi: 'Judg',
	Ruth: 'Ruth',
	'1Reg': '1Sam',
	'2Reg': '2Sam',
	'3Reg': '1Kgs',
	'4Reg': '2Kgs',
	'1Kings': '1Sam',
	'2Kings': '2Sam',
	'3Kings': '1Kgs',
	'4Kings': '2Kgs',
	'1Par': '1Chr',
	'2Par': '2Chr',
	'1Para': '1Chr',
	'2Para': '2Chr',
	'1Paral': '1Chr',
	'2Paral': '2Chr',
	'1Paralip': '1Chr',
	'2Paralip': '2Chr',
	'1Esd': 'Ezra',
	'1Esdr': 'Ezra',
	'2Esd': 'Neh',
	'2Esdr': 'Neh',
	'3Esd': '3Esd',
	'4Esd': '4Esd',
	Esd: 'Ezra',
	Esdr: 'Ezra',
	Esdras: 'Ezra',
	Tob: 'Tob',
	Tobie: 'Tob',
	Tobiae: 'Tob',
	Tobias: 'Tob',
	Judith: 'Jdt',
	Iudith: 'Jdt',
	Jdt: 'Jdt',
	Esth: 'Esth',
	Esther: 'Esth',
	'1Mach': '1Macc',
	'2Mach': '2Macc',
	'1Mac': '1Macc',
	'2Mac': '2Macc',
	'1Macch': '1Macc',
	'2Macch': '2Macc',
	'1Machab': '1Macc',
	'2Machab': '2Macc',
	'1Macha': '1Macc',
	'2Macha': '2Macc',
	'1Machabees': '1Macc',
	'2Machabees': '2Macc',
	// Wisdom
	Job: 'Job',
	Iob: 'Job',
	Ps: 'Ps',
	Psa: 'Ps',
	Psal: 'Ps',
	Psalm: 'Ps',
	Pro: 'Prov',
	Prov: 'Prov',
	Prover: 'Prov',
	Proverb: 'Prov',
	Eccl: 'Eccl',
	Eccle: 'Eccl',
	Eccles: 'Eccl',
	Ecclus: 'Sir',
	Eccli: 'Sir',
	Ecclesiasticus: 'Sir',
	Can: 'Cant',
	Cant: 'Cant',
	Song: 'Cant',
	Sap: 'Wis',
	Wisd: 'Wis',
	// Major prophets
	Es: 'Isa',
	Esa: 'Isa',
	Isa: 'Isa',
	Isai: 'Isa',
	Isaiae: 'Isa',
	Isaie: 'Isa',
	Isaias: 'Isa',
	Jer: 'Jer',
	Hier: 'Jer',
	Ier: 'Jer',
	Iere: 'Jer',
	Ierem: 'Jer',
	Jere: 'Jer',
	Jerem: 'Jer',
	Lam: 'Lam',
	Thren: 'Lam',
	Bar: 'Bar',
	Baruch: 'Bar',
	Ez: 'Ezek',
	Eze: 'Ezek',
	Ezec: 'Ezek',
	Ezech: 'Ezek',
	Dan: 'Dan',
	// Minor prophets
	Hosea: 'Hos',
	Os: 'Hos',
	Ose: 'Hos',
	Osee: 'Hos',
	Ioel: 'Joel',
	Joel: 'Joel',
	Amos: 'Amos',
	Abd: 'Obad',
	Abdias: 'Obad',
	Jon: 'Jonah',
	Ion: 'Jonah',
	Ionas: 'Jonah',
	Jonas: 'Jonah',
	Mich: 'Mic',
	Micheas: 'Mic',
	Nah: 'Nah',
	Nahu: 'Nah',
	Nahum: 'Nah',
	Abac: 'Hab',
	Habac: 'Hab',
	Soph: 'Zeph',
	Sopho: 'Zeph',
	Sophon: 'Zeph',
	Sophonias: 'Zeph',
	Ag: 'Hag',
	Agg: 'Hag',
	Agge: 'Hag',
	Aggeus: 'Hag',
	Zac: 'Zech',
	Zach: 'Zech',
	Zacharias: 'Zech',
	Mal: 'Mal',
	Malac: 'Mal',
	Malach: 'Mal',
	Malachie: 'Mal',
	// NT Gospels & Acts
	Matthew: 'Matt',
	Matt: 'Matt',
	Math: 'Matt',
	Mat: 'Matt',
	Mt: 'Matt',
	Mar: 'Mark',
	Marc: 'Mark',
	Mark: 'Mark',
	Mr: 'Mark',
	Luke: 'Luke',
	Lu: 'Luke',
	Luc: 'Luke',
	Luk: 'Luke',
	John: 'John',
	Io: 'John',
	Ioa: 'John',
	Ioan: 'John',
	Joan: 'John',
	Joa: 'John',
	Acts: 'Acts',
	Act: 'Acts',
	// NT Epistles
	Ro: 'Rom',
	Rom: 'Rom',
	'1Cor': '1Cor',
	'2Cor': '2Cor',
	Gal: 'Gal',
	Eph: 'Eph',
	Ephe: 'Eph',
	Ephes: 'Eph',
	Phil: 'Phil',
	Philip: 'Phil',
	Philipp: 'Phil',
	Col: 'Col',
	Colos: 'Col',
	Coloss: 'Col',
	'1Thess': '1Thess',
	'2Thess': '2Thess',
	'1Thes': '1Thess',
	'2Thes': '2Thess',
	'1Th': '1Thess',
	'2Th': '2Thess',
	'1Tim': '1Tim',
	'2Tim': '2Tim',
	'1Timo': '1Tim',
	'2Timo': '2Tim',
	Tit: 'Titus',
	Titus: 'Titus',
	Phile: 'Phlm',
	Philem: 'Phlm',
	Heb: 'Heb',
	Hebr: 'Heb',
	Ia: 'Jas',
	Iac: 'Jas',
	Iacob: 'Jas',
	Jac: 'Jas',
	Jacob: 'Jas',
	Jas: 'Jas',
	James: 'Jas',
	'1Pet': '1Pet',
	'2Pet': '2Pet',
	'1Petr': '1Pet',
	'2Petr': '2Pet',
	'1Io': '1John',
	'2Io': '2John',
	'3Io': '3John',
	'1Ioan': '1John',
	'2Ioan': '2John',
	'3Ioan': '3John',
	'1Joan': '1John',
	'2Joan': '2John',
	'3Joan': '3John',
	'1John': '1John',
	'2John': '2John',
	'3John': '3John',
	Iud: 'Jude',
	Jude: 'Jude',
	Judas: 'Jude',
	Ap: 'Rev',
	Apo: 'Rev',
	Apoc: 'Rev',
	Apocalypse: 'Rev',
	Re: 'Rev'
};

/** Sorted longest-first for greedy matching */
const SORTED_ABBREVS = Object.keys(ABBREV_TO_OSIS).sort((a, b) => b.length - a.length);

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
		// Must be followed by ".", space+digit, or end of string
		const afterIdx = cursor + abbrev.length;
		if (afterIdx < text.length && text[afterIdx] !== '.' && text[afterIdx] !== ':') {
			// Allow full book names followed by space+digit (e.g. "Iosue 7")
			if (text[afterIdx] === ' ' && afterIdx + 1 < text.length && /\d/.test(text[afterIdx + 1])) {
				return { osisBook: ABBREV_TO_OSIS[abbrev], displayStart: pos, end: afterIdx };
			}
			continue;
		}
		const endIdx =
			afterIdx < text.length && (text[afterIdx] === '.' || text[afterIdx] === ':')
				? afterIdx + 1
				: afterIdx;
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

	// skip optional period after chapter
	if (cursor < text.length && text[cursor] === '.') cursor++;

	// Save position before consuming whitespace — only advance if a verse follows
	const afterPeriod = cursor;
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
	// Case 3: period separator — "19. 20." means two chapters, NOT chapter:verse.
	// Bare digit after period is a continuation chapter, handled by parseContinuationRefs.

	// If no verse was found, don't consume whitespace after the period
	if (verse === undefined) cursor = afterPeriod;

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
	// eslint-disable-next-line no-useless-assignment -- used via parseContinuationRefs
	let lastOsisBook: string | null = null;

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
					// "Eccl." in DR cross-refs: Ecclesiastes has 12 chapters,
					// so chapter > 12 must be Ecclesiasticus (Sir)
					const osisBook =
						bookMatch.osisBook === 'Eccl' && cv.chapter > 12 ? 'Sir' : bookMatch.osisBook;
					let osis = osisBook + '.' + cv.chapter;
					if (cv.verse !== undefined) {
						osis += '.' + cv.verse;
					}

					const displayEnd = bookMatch.end + cv.consumed;
					const display = text.slice(bookMatch.displayStart, displayEnd).trim();

					tokens.push({ type: 'ref', osis, display, isVerse });
					lastOsisBook = osisBook;

					pos = displayEnd;

					// Check for continuation refs: bare "chapter, verse." with same book
					// Pass last chapter+verse context so verse continuations work
					pos = parseContinuationRefs(
						text,
						pos,
						lastOsisBook,
						tokens,
						cv.verse !== undefined ? cv.chapter : undefined
					);
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

/**
 * After parsing a ref, check if bare "N, N." or "N." continuations follow
 * using the same book. E.g. "Psal. 32, 6. 135, 5." → second ref is Ps.135.5
 *
 * If `lastVerseChapter` is set, the previous ref was verse-level, so bare
 * numbers are continuation verses in that chapter (e.g. "v. 64. 65." → 65 is verse).
 */
function parseContinuationRefs(
	text: string,
	startPos: number,
	osisBook: string,
	tokens: CrossRefToken[],
	lastVerseChapter?: number
): number {
	let pos = startPos;

	while (pos < text.length) {
		// Skip and preserve whitespace, marginal note markers (''), and & separators
		let cursor = pos;
		while (cursor < text.length && /[ '&]/.test(text[cursor])) cursor++;

		// Must start with a digit (bare chapter number, no book name)
		if (cursor >= text.length || !/\d/.test(text[cursor])) break;

		// But NOT if it's a book abbreviation starting here
		// (that means a new book ref, not a continuation)
		const nextBook = matchBookAt(text, cursor);
		if (nextBook) break;

		// Also check if a digit prefix like "2. Thess" starts a new numbered book
		const numBookMatch = /^(\d)\.\s*[A-Z]/.exec(text.slice(cursor));
		if (numBookMatch) break;

		// Emit skipped separators as text (only after confirming this IS a continuation)
		if (cursor > pos) {
			tokens.push({ type: 'text', content: text.slice(pos, cursor) });
		}

		// If last ref was verse-level, treat bare numbers as continuation verses
		// BUT only if they're not followed by comma+number (which indicates a new chapter,verse pair)
		if (lastVerseChapter !== undefined) {
			const vMatch = text.slice(cursor).match(/^(\d+)/);
			if (!vMatch) break;
			let afterNum = cursor + vMatch[0].length;
			if (afterNum < text.length && text[afterNum] === '.') afterNum++;
			// Only break out of verse mode if THIS number is followed by comma+number
			// (indicating a new chapter,verse pair like "5, 7.")
			const afterDigits = text.slice(cursor + vMatch[0].length);
			const isNewChapterVerse = /^\s*,\s*\d/.test(afterDigits);
			if (!isNewChapterVerse) {
				const verse = parseInt(vMatch[1], 10);
				const osis = `${osisBook}.${lastVerseChapter}.${verse}`;
				const display = text.slice(cursor, afterNum).trim();
				tokens.push({ type: 'ref', osis, display, isVerse: true });
				pos = afterNum;
				continue;
			}
			// Otherwise fall through to chapter parsing
			lastVerseChapter = undefined;
		}

		// Try to parse as chapter[,verse]
		const cv = parseChapterVerse(text, cursor);
		if (!cv) break;

		const isVerse = cv.verse !== undefined;
		let osis = osisBook + '.' + cv.chapter;
		if (cv.verse !== undefined) {
			osis += '.' + cv.verse;
		}

		const displayEnd = cursor + cv.consumed;
		const display = text.slice(cursor, displayEnd).trim();

		tokens.push({ type: 'ref', osis, display, isVerse });
		// If this continuation had a verse, subsequent bare numbers are also verses
		if (cv.verse !== undefined) lastVerseChapter = cv.chapter;
		pos = displayEnd;
	}

	return pos;
}

/** Map of old abbreviations to modern book names for parseAllReferences */
const ABBREV_TO_MODERN: Record<string, string> = {
	Gen: 'Genesis',
	Exo: 'Exodus',
	Exod: 'Exodus',
	Lev: 'Leviticus',
	Levi: 'Leviticus',
	Levit: 'Leviticus',
	Nu: 'Numbers',
	Num: 'Numbers',
	Numer: 'Numbers',
	Numb: 'Numbers',
	Deu: 'Deuteronomy',
	Deut: 'Deuteronomy',
	Deuter: 'Deuteronomy',
	Deuteron: 'Deuteronomy',
	Jos: 'Joshua',
	Ios: 'Joshua',
	Iosu: 'Joshua',
	Iosue: 'Joshua',
	Josue: 'Joshua',
	Judic: 'Judges',
	Iudic: 'Judges',
	Iudi: 'Judges',
	Ruth: 'Ruth',
	Tob: 'Tobit',
	Tobie: 'Tobit',
	Tobiae: 'Tobit',
	Tobias: 'Tobit',
	Judith: 'Judith',
	Iudith: 'Judith',
	Jdt: 'Judith',
	Esth: 'Esther',
	Esther: 'Esther',
	Esd: 'Ezra',
	Esdr: 'Ezra',
	Esdras: 'Ezra',
	Job: 'Job',
	Iob: 'Job',
	Ps: 'Psalms',
	Psa: 'Psalms',
	Psal: 'Psalms',
	Psalm: 'Psalms',
	Pro: 'Proverbs',
	Prov: 'Proverbs',
	Prover: 'Proverbs',
	Proverb: 'Proverbs',
	Eccl: 'Ecclesiastes',
	Eccle: 'Ecclesiastes',
	Eccles: 'Ecclesiastes',
	Ecclus: 'Sirach',
	Eccli: 'Sirach',
	Can: 'Song of Solomon',
	Cant: 'Song of Solomon',
	Song: 'Song of Solomon',
	Sap: 'Wisdom',
	Wisd: 'Wisdom',
	Es: 'Isaiah',
	Esa: 'Isaiah',
	Isa: 'Isaiah',
	Isai: 'Isaiah',
	Isaiae: 'Isaiah',
	Isaie: 'Isaiah',
	Jer: 'Jeremiah',
	Hier: 'Jeremiah',
	Ier: 'Jeremiah',
	Iere: 'Jeremiah',
	Ierem: 'Jeremiah',
	Jere: 'Jeremiah',
	Jerem: 'Jeremiah',
	Lam: 'Lamentations',
	Thren: 'Lamentations',
	Bar: 'Baruch',
	Baruch: 'Baruch',
	Ez: 'Ezekiel',
	Eze: 'Ezekiel',
	Ezec: 'Ezekiel',
	Ezech: 'Ezekiel',
	Dan: 'Daniel',
	Os: 'Hosea',
	Ose: 'Hosea',
	Osee: 'Hosea',
	Ioel: 'Joel',
	Joel: 'Joel',
	Amos: 'Amos',
	Abd: 'Obadiah',
	Abdias: 'Obadiah',
	Jon: 'Jonah',
	Ion: 'Jonah',
	Ionas: 'Jonah',
	Jonas: 'Jonah',
	Mich: 'Micah',
	Micheas: 'Micah',
	Nah: 'Nahum',
	Nahu: 'Nahum',
	Nahum: 'Nahum',
	Abac: 'Habakkuk',
	Habac: 'Habakkuk',
	Soph: 'Zephaniah',
	Sopho: 'Zephaniah',
	Sophon: 'Zephaniah',
	Sophonias: 'Zephaniah',
	Ag: 'Haggai',
	Agg: 'Haggai',
	Agge: 'Haggai',
	Aggeus: 'Haggai',
	Zac: 'Zechariah',
	Zach: 'Zechariah',
	Zacharias: 'Zechariah',
	Mal: 'Malachi',
	Malac: 'Malachi',
	Malach: 'Malachi',
	Malachie: 'Malachi',
	Matt: 'Matthew',
	Math: 'Matthew',
	Mat: 'Matthew',
	Mt: 'Matthew',
	Mar: 'Mark',
	Marc: 'Mark',
	Mark: 'Mark',
	Mr: 'Mark',
	Lu: 'Luke',
	Luc: 'Luke',
	Luk: 'Luke',
	Io: 'John',
	Ioa: 'John',
	Ioan: 'John',
	Joan: 'John',
	Joa: 'John',
	Act: 'Acts',
	Ro: 'Romans',
	Rom: 'Romans',
	Gal: 'Galatians',
	Eph: 'Ephesians',
	Ephe: 'Ephesians',
	Ephes: 'Ephesians',
	Phil: 'Philippians',
	Philip: 'Philippians',
	Philipp: 'Philippians',
	Col: 'Colossians',
	Colos: 'Colossians',
	Coloss: 'Colossians',
	Tit: 'Titus',
	Titus: 'Titus',
	Phile: 'Philemon',
	Philem: 'Philemon',
	Heb: 'Hebrews',
	Hebr: 'Hebrews',
	Ia: 'James',
	Iac: 'James',
	Iacob: 'James',
	Jac: 'James',
	Jacob: 'James',
	Jas: 'James',
	Iud: 'Jude',
	Jude: 'Jude',
	Judas: 'Jude',
	Ap: 'Revelation',
	Apo: 'Revelation',
	Apoc: 'Revelation',
	Apocalypse: 'Revelation',
	Re: 'Revelation'
};

const SORTED_MODERN_ABBREVS = Object.keys(ABBREV_TO_MODERN).sort((a, b) => b.length - a.length);

/**
 * Normalize old Douay-Rheims abbreviations in italic text to modern names
 * that parseAllReferences can handle.
 */
function normalizeForParser(text: string): string {
	let result = text;

	// Handle numbered books like "1. Cor." → "1 Corinthians"
	// Anchor with (?:^|(?<=\s)) to avoid matching chapter numbers like "5. Joan."
	result = result.replace(
		/(?:^|(?<=\s))(\d)\.\s*(Cor|Thess|Thes|Th|Tim|Timo|Pet|Petr|Ioan|Joan|Io|Machab|Macha|Mach|Mac|Macch|Reg|Par|Para|Paral|Paralip|Esd|Esdr)\./gi,
		(match, num, abbr) => {
			const key = num + abbr;
			if (key in ABBREV_TO_OSIS) {
				const osis = ABBREV_TO_OSIS[key];
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
					'2Macc': '2 Maccabees',
					'3Esd': '1 Esdras',
					'4Esd': '2 Esdras'
				};
				return modernMap[osis] || match;
			}
			return match;
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

	// Convert "v. N[. N...]" to ":N[, N...]" when preceded by chapter
	// e.g. "26. v. 64. 65." → "26:64, 65"
	result = result.replace(/(\d+)\.\s*v\.\s*(\d+(?:\.\s*\d+)*)/g, (_, ch, versesPart) => {
		const verses = versesPart.split(/\.\s*/).filter(Boolean);
		return `${ch}:${verses.join(', ')}`;
	});

	return result;
}

export function parseItalicRef(text: string, conservative = false): OsisRange[] | null {
	// Quick check: if text has no digits, it's unlikely to be a reference
	if (!/\d/.test(text)) return null;

	// Check for patristic / non-biblical indicators — author names, work structures, Latin terms
	if (
		/\b(?:Homi|ho|Epist|Serm|Ser|Tract|lib|li|cont|Baptis|Martyres|Dialog|adv|Poenit|principio|Iovinian|Ambr|Hiero|Greg|Origen|Orig|Aug|Chrys|Clem|Cypr|Cyril|Iren|Tert|Ath|Bas|Epiph|Hilar|Isid|Prosp|Cassi|Alcuin|Bede|Anselm|Aquin|Bernard|Annot|Testa|Praef|Conc|Decret)\b/i.test(
			text
		)
	)
		return null;

	// Latin citation context: "in c. 2.", "c. 8. v. 34.", "sub finem", "prope finem", "l. 2. de", "ad Ro."
	if (/\b(?:prope|finem|ibidem|supra|infra)\b/i.test(text)) return null;
	if (/\bc\.\s*\d/i.test(text)) return null;
	if (/\bsub\s+\w/i.test(text)) return null;
	if (/\bl\.\s*\d/i.test(text)) return null;
	if (/\bad\s+[A-Z]/i.test(text)) return null;

	// Greek text mixed with refs — likely a scholarly citation, not a standalone reference
	if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(text)) return null;

	// Four-digit year = publication reference, not Bible
	if (/\b1[4-9]\d{2}\b/.test(text)) return null;

	// Conservative mode: extra checks for reference pages with mixed patristic content
	if (conservative) {
		// Reject if text starts with a bare number+period followed by an abbreviation
		// that is NOT a known numbered book. "1. Lu. v. 78." → "1Lu" not in map → reject.
		// But "1. Cor. 4, 1." → "1Cor" IS in map → allow.
		const leadingMatch = text.match(/^\s*(\d+)\.\s+([A-Z][a-z]\w*)/);
		if (leadingMatch) {
			const numberedKey = leadingMatch[1] + leadingMatch[2];
			if (!ABBREV_TO_OSIS[numberedKey]) {
				return null;
			}
		}
		// Reject if text contains lowercase Latin words mixed with refs
		// (genuine refs are mostly abbreviations + numbers)
		const stripped = text
			.replace(/<[^>]+>/g, '')
			.replace(/\d+/g, '')
			.replace(/[.,;:&v]/g, '')
			.trim();
		const words = stripped.split(/\s+/).filter((w) => w.length > 2);
		const lowerWords = words.filter((w) => w[0] === w[0].toLowerCase());
		if (lowerWords.length > 1) return null;
	}

	const normalized = normalizeForParser(text);
	const refs = parseAllReferences(normalized);

	return refs.length > 0 ? refs : null;
}

/**
 * Preprocess an HTML string: wrap <i> tags whose content parses as a Bible
 * reference in an <a class="verse-ref"> link. Non-ref italic spans are left untouched.
 */
export function linkifyItalicRefs(html: string, conservative = false): string {
	return html.replace(/<i>([\s\S]*?)<\/i>/g, (match, content) => {
		const refs = parseItalicRef(content, conservative);
		if (!refs || refs.length === 0) return match;
		const osisStr = refs.map((r) => r.osis).join(',');
		const searchUrl = `/search?q=${encodeURIComponent(osisStr)}&mode=verse`;
		return `<a class="verse-ref" data-osis="${osisStr}" href="${searchUrl}" target="_blank" rel="noopener"><i>${content}</i></a>`;
	});
}

/**
 * Linkify bare (non-italic) Bible references in text using the tokenizer.
 * Each ref token becomes a hoverable/clickable <a class="verse-ref"> link.
 */
export function linkifyBareRefs(html: string): string {
	// Don't process inside HTML tags
	// Split on tags, process only text segments
	const parts = html.split(/(<[^>]+>)/);
	return parts
		.map((part) => {
			if (part.startsWith('<')) return part;
			// Process text segment
			const tokens = tokenizeCrossRef(part);
			return tokens
				.map((t) => {
					if (t.type === 'text') return t.content;
					const searchUrl = `/search?q=${encodeURIComponent(t.osis)}&mode=verse`;
					return `<a class="verse-ref" data-osis="${t.osis}" href="${searchUrl}" target="_blank" rel="noopener">${t.display}</a>`;
				})
				.join('');
		})
		.join('');
}

// ── Confraternity reference linkification ──────────────────────────
// Confraternity content has references like "Isa. <i>53,</i> 7" where
// book names are plain text and <i> tags are interspersed. This parser
// strips italic tags, finds references in the clean text, then wraps
// the original HTML (with tags preserved) in <a class="verse-ref">.

const CONF_SIMPLE_BOOKS: Record<string, string> = {
	Gen: 'Gen',
	Gn: 'Gen',
	Ex: 'Exod',
	Exod: 'Exod',
	Lev: 'Lev',
	Lv: 'Lev',
	Num: 'Num',
	Nm: 'Num',
	Deut: 'Deut',
	Dt: 'Deut',
	Jos: 'Josh',
	Josue: 'Josh',
	Jgs: 'Judg',
	Judg: 'Judg',
	Ruth: 'Ruth',
	Ru: 'Ruth',
	Ezr: 'Ezra',
	Ezra: 'Ezra',
	Neh: 'Neh',
	Tob: 'Tob',
	Tb: 'Tob',
	Jdt: 'Jdt',
	Judith: 'Jdt',
	Est: 'Esth',
	Esth: 'Esth',
	Job: 'Job',
	Jb: 'Job',
	Ps: 'Ps',
	Pss: 'Ps',
	Prov: 'Prov',
	Prv: 'Prov',
	Eccl: 'Eccl',
	Cant: 'Cant',
	Ct: 'Cant',
	Wis: 'Wis',
	Sir: 'Sir',
	Isa: 'Isa',
	Is: 'Isa',
	Jer: 'Jer',
	Lam: 'Lam',
	Bar: 'Bar',
	Baruch: 'Bar',
	Ezech: 'Ezek',
	Ez: 'Ezek',
	Dan: 'Dan',
	Dn: 'Dan',
	Hos: 'Hos',
	Joel: 'Joel',
	Jl: 'Joel',
	Amos: 'Amos',
	Am: 'Amos',
	Abd: 'Obad',
	Jon: 'Jonah',
	Mic: 'Mic',
	Mi: 'Mic',
	Nah: 'Nah',
	Na: 'Nah',
	Hab: 'Hab',
	Hb: 'Hab',
	Soph: 'Zeph',
	Zeph: 'Zeph',
	Ag: 'Hag',
	Hag: 'Hag',
	Zach: 'Zech',
	Za: 'Zech',
	Mal: 'Mal',
	Matt: 'Matt',
	Mt: 'Matt',
	Mark: 'Mark',
	Mk: 'Mark',
	Luke: 'Luke',
	Lk: 'Luke',
	John: 'John',
	Jn: 'John',
	Acts: 'Acts',
	Rom: 'Rom',
	Gal: 'Gal',
	Eph: 'Eph',
	Phil: 'Phil',
	Col: 'Col',
	Tit: 'Titus',
	Ti: 'Titus',
	Philem: 'Phlm',
	Phlm: 'Phlm',
	Heb: 'Heb',
	Jas: 'Jas',
	Jude: 'Jude',
	Apoc: 'Rev',
	Ap: 'Rev',
	Rev: 'Rev'
};

/** Numbered books: prefix digit → OSIS code. Vulgate numbering for Kings. */
const CONF_NUMBERED_BOOKS: Record<string, Record<number, string>> = {
	Sam: { 1: '1Sam', 2: '2Sam' },
	Sm: { 1: '1Sam', 2: '2Sam' },
	// Confraternity/Vulgate: 1-2 Kgs = 1-2 Sam, 3-4 Kgs = 1-2 Kings
	Kgs: { 1: '1Sam', 2: '2Sam', 3: '1Kgs', 4: '2Kgs' },
	Kings: { 1: '1Sam', 2: '2Sam', 3: '1Kgs', 4: '2Kgs' },
	Chr: { 1: '1Chr', 2: '2Chr' },
	Chron: { 1: '1Chr', 2: '2Chr' },
	Par: { 1: '1Chr', 2: '2Chr' },
	Macc: { 1: '1Macc', 2: '2Macc' },
	Mach: { 1: '1Macc', 2: '2Macc' },
	Cor: { 1: '1Cor', 2: '2Cor' },
	Thess: { 1: '1Thess', 2: '2Thess' },
	Thes: { 1: '1Thess', 2: '2Thess' },
	Tim: { 1: '1Tim', 2: '2Tim' },
	Tm: { 1: '1Tim', 2: '2Tim' },
	Pet: { 1: '1Pet', 2: '2Pet' },
	Pt: { 1: '1Pet', 2: '2Pet' },
	John: { 1: '1John', 2: '2John', 3: '3John' },
	Jn: { 1: '1John', 2: '2John', 3: '3John' },
	Esd: { 1: 'Ezra', 2: 'Neh' },
	Esdr: { 1: 'Ezra', 2: 'Neh' }
};

function resolveConfBook(num: number, abbrev: string): string | null {
	if (num > 0) {
		return CONF_NUMBERED_BOOKS[abbrev]?.[num] ?? null;
	}
	return CONF_SIMPLE_BOOKS[abbrev] ?? null;
}

const CONF_ALL_BOOK_NAMES = [
	...new Set([...Object.keys(CONF_SIMPLE_BOOKS), ...Object.keys(CONF_NUMBERED_BOOKS)])
].sort((a, b) => b.length - a.length);

const CONF_REF_RE = new RegExp(
	'(?:(\\d)\\s+)?' + // g1: numbered prefix
		'(' +
		CONF_ALL_BOOK_NAMES.join('|') +
		')' + // g2: book abbreviation
		'\\.?\\s*' + // optional period + space
		'(\\d+)' + // g3: chapter
		'(?:\\s*[-\u2013]\\s*(\\d+))?' + // g4: chapter range end
		'(?:' +
		'\\s*,\\s*' + // comma separator
		'(\\d+)' + // g5: start verse
		'(?:\\s*[-\u2013]\\s*(\\d+))?' + // g6: end verse
		')?',
	'g'
);

interface ConfRefMatch {
	start: number;
	end: number;
	osis: string;
}

function findConfRefs(clean: string): ConfRefMatch[] {
	const results: ConfRefMatch[] = [];
	CONF_REF_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = CONF_REF_RE.exec(clean)) !== null) {
		const num = m[1] ? parseInt(m[1]) : 0;
		const osisBook = resolveConfBook(num, m[2]);
		if (!osisBook) continue;

		const chapter = parseInt(m[3]);
		const chapterEnd = m[4] ? parseInt(m[4]) : undefined;
		const verse = m[5] ? parseInt(m[5]) : undefined;
		const verseEnd = m[6] ? parseInt(m[6]) : undefined;

		let osis: string;
		if (verse !== undefined) {
			osis = `${osisBook}.${chapter}.${verse}`;
			if (verseEnd !== undefined) {
				osis += `-${osisBook}.${chapter}.${verseEnd}`;
			}
		} else if (chapterEnd !== undefined) {
			osis = `${osisBook}.${chapter}-${osisBook}.${chapterEnd}`;
		} else {
			osis = `${osisBook}.${chapter}`;
		}

		results.push({ start: m.index, end: m.index + m[0].length, osis });
	}
	return results;
}

function linkifyConfSegment(segment: string): string {
	// Build position map: strip <i> and </i> tags
	const cleanChars: string[] = [];
	const posMap: number[] = [];
	for (let i = 0; i < segment.length; ) {
		if (segment.startsWith('<i>', i)) {
			i += 3;
			continue;
		}
		if (segment.startsWith('</i>', i)) {
			i += 4;
			continue;
		}
		posMap.push(i);
		cleanChars.push(segment[i]);
		i++;
	}
	const clean = cleanChars.join('');
	posMap.push(segment.length); // sentinel

	const refs = findConfRefs(clean);
	if (refs.length === 0) return segment;

	let result = '';
	let lastOrigEnd = 0;

	for (const ref of refs) {
		let origStart = posMap[ref.start];
		// Include leading <i> tag if the match starts right after one
		// (handles numbered books: "<i>1</i> Cor." where the digit is inside <i>)
		while (origStart >= 3 && segment.startsWith('<i>', origStart - 3)) {
			origStart -= 3;
		}
		let origEnd = posMap[ref.end];
		// Extend past trailing </i>, <i> tags and period
		while (origEnd < segment.length) {
			if (segment.startsWith('</i>', origEnd)) {
				origEnd += 4;
				continue;
			}
			if (segment.startsWith('<i>', origEnd)) {
				origEnd += 3;
				continue;
			}
			if (segment[origEnd] === '.') {
				origEnd++;
				continue;
			}
			break;
		}
		if (origStart < lastOrigEnd) continue; // skip overlapping

		const matchedHtml = segment.slice(origStart, origEnd);
		const searchUrl = `/search?q=${encodeURIComponent(ref.osis)}&mode=verse`;
		result += segment.slice(lastOrigEnd, origStart);
		result += `<a class="verse-ref" data-osis="${ref.osis}" href="${searchUrl}" target="_blank" rel="noopener">${matchedHtml}</a>`;
		lastOrigEnd = origEnd;
	}

	result += segment.slice(lastOrigEnd);
	return result;
}

/**
 * Linkify Bible references in Confraternity HTML content.
 * Handles the mixed-tag format: "Isa. <i>53,</i> 7" and "<i>1</i> Cor. <i>5,</i> 5".
 */
export function linkifyConfRefs(html: string): string {
	// Don't process inside existing <a> tags
	const parts = html.split(/(<a[^>]*>[\s\S]*?<\/a>)/);
	return parts.map((part) => (part.startsWith('<a') ? part : linkifyConfSegment(part))).join('');
}

// ── Knox reference linkification ─────────────────────────────────────
// Knox notes use period-separated chapter.verse (e.g. "Gen. 17.10"),
// semicolons to chain refs ("Job 1.6; 2.1; 38.7"), and Roman numerals
// for numbered books ("III Kg. 17.1"). Plain text — no HTML tags.

/** Knox abbreviations → OSIS. Superset of existing maps, tuned for Knox's specific usage. */
const KNOX_SIMPLE_BOOKS: Record<string, string> = {
	Gen: 'Gen',
	Ex: 'Exod',
	Exod: 'Exod',
	Lev: 'Lev',
	Num: 'Num',
	Deut: 'Deut',
	Dent: 'Deut', // Knox typo
	Jos: 'Josh',
	Josue: 'Josh',
	Jg: 'Judg',
	Judges: 'Judg',
	Ruth: 'Ruth',
	Esd: 'Ezra',
	Esdras: 'Ezra',
	Neh: 'Neh',
	Tob: 'Tob',
	Judith: 'Jdt',
	Est: 'Esth',
	Esther: 'Esth',
	Job: 'Job',
	Ps: 'Ps',
	Psalms: 'Ps',
	Prov: 'Prov',
	Eccl: 'Eccl',
	Ecclus: 'Sir',
	Cant: 'Cant',
	Wis: 'Wis',
	Is: 'Isa',
	Jer: 'Jer',
	Lam: 'Lam',
	Bar: 'Bar',
	Ez: 'Ezek',
	Dan: 'Dan',
	Daniel: 'Dan',
	Os: 'Hos',
	Joel: 'Joel',
	Jl: 'Joel',
	Am: 'Amos',
	Amos: 'Amos',
	Abd: 'Obad',
	Jon: 'Jonah',
	Mic: 'Mic',
	Nah: 'Nah',
	Nahum: 'Nah',
	Hab: 'Hab',
	Soph: 'Zeph',
	Agg: 'Hag',
	Aggaeus: 'Hag',
	Zach: 'Zech',
	Zech: 'Zech',
	Mal: 'Mal',
	Mt: 'Matt',
	Mat: 'Matt',
	Mk: 'Mark',
	Mark: 'Mark',
	Lk: 'Luke',
	Luke: 'Luke',
	Jn: 'John',
	Ac: 'Acts',
	Acts: 'Acts',
	Rom: 'Rom',
	Gal: 'Gal',
	Eph: 'Eph',
	Phil: 'Phil',
	Col: 'Col',
	Tit: 'Titus',
	Phm: 'Phlm',
	Heb: 'Heb',
	Jas: 'Jas',
	Jude: 'Jude',
	Apoc: 'Rev'
};

/** Numbered book stems for Knox. Handles Arabic ("1 Cor") and Roman ("III Kg") prefixes. */
const KNOX_NUMBERED_BOOKS: Record<string, Record<number, string>> = {
	Kg: { 1: '1Sam', 2: '2Sam', 3: '1Kgs', 4: '2Kgs' },
	Kings: { 1: '1Sam', 2: '2Sam', 3: '1Kgs', 4: '2Kgs' },
	Sam: { 1: '1Sam', 2: '2Sam' },
	Par: { 1: '1Chr', 2: '2Chr' },
	Para: { 1: '1Chr', 2: '2Chr' },
	Esd: { 1: 'Ezra', 2: 'Neh' },
	Esdras: { 1: 'Ezra', 2: 'Neh' },
	Mac: { 1: '1Macc', 2: '2Macc' },
	Cor: { 1: '1Cor', 2: '2Cor' },
	Thess: { 1: '1Thess', 2: '2Thess' },
	Tim: { 1: '1Tim', 2: '2Tim' },
	Pet: { 1: '1Pet', 2: '2Pet' },
	Peter: { 1: '1Pet', 2: '2Pet' },
	Jn: { 1: '1John', 2: '2John', 3: '3John' },
	Jo: { 1: '1John', 2: '2John', 3: '3John' }
};

const ROMAN_MAP: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

const KNOX_ALL_NAMES = [
	...new Set([...Object.keys(KNOX_SIMPLE_BOOKS), ...Object.keys(KNOX_NUMBERED_BOOKS)])
].sort((a, b) => b.length - a.length);

// Main regex: optional number prefix (Arabic or Roman) + book abbreviation + period-separated chapter.verse
// Groups: (1) Arabic num, (2) Roman num, (3) book, (4) chapter, (5) verse, (6) verse range end
const KNOX_REF_RE = new RegExp(
	'(?:' +
		'(\\d)\\s+' + // g1: Arabic number prefix "1 "
		'|' +
		'(I{1,3}V?)\\s+' + // g2: Roman number prefix "III "
		')?' +
		'(' +
		KNOX_ALL_NAMES.join('|') +
		')' + // g3: book abbreviation
		'\\.?\\s*' + // optional trailing period + space
		'(\\d+)' + // g4: chapter
		'(?:\\.(\\d+)' + // g5: verse (period-separated)
		'(?:\\s*[-\u2013]\\s*(\\d+))?' + // g6: verse range end
		')?',
	'g'
);

interface KnoxRef {
	start: number;
	end: number;
	osis: string;
	osisBook: string;
	chapter: number;
}

function resolveKnoxBook(num: number, abbrev: string): string | null {
	if (num > 0) {
		return KNOX_NUMBERED_BOOKS[abbrev]?.[num] ?? null;
	}
	return KNOX_SIMPLE_BOOKS[abbrev] ?? null;
}

function findKnoxRefs(text: string): KnoxRef[] {
	const results: KnoxRef[] = [];
	KNOX_REF_RE.lastIndex = 0;
	let m: RegExpExecArray | null;

	while ((m = KNOX_REF_RE.exec(text)) !== null) {
		const arabicNum = m[1] ? parseInt(m[1]) : 0;
		const romanNum = m[2] ? (ROMAN_MAP[m[2]] ?? 0) : 0;
		const num = arabicNum || romanNum;
		const abbrev = m[3];
		const osisBook = resolveKnoxBook(num, abbrev);
		if (!osisBook) continue;

		// Disambiguation: check what precedes — skip if preceded by patristic context
		const before = text.slice(0, m.index);
		if (/(?:de|ad|in|super\.|cont\.)\s*$/i.test(before)) continue;

		const chapter = parseInt(m[4]);
		const verse = m[5] ? parseInt(m[5]) : undefined;
		const verseEnd = m[6] ? parseInt(m[6]) : undefined;

		let osis: string;
		if (verse !== undefined) {
			osis = `${osisBook}.${chapter}.${verse}`;
			if (verseEnd !== undefined) {
				osis += `-${osisBook}.${chapter}.${verseEnd}`;
			}
		} else {
			osis = `${osisBook}.${chapter}`;
		}

		let end = m.index + m[0].length;

		// Consume comma-separated continuation verses: ", 17" or ", 17-20"
		const contRe = /^,\s*(\d+)(?:\s*[-\u2013]\s*(\d+))?/;
		let contMatch: RegExpMatchArray | null;
		while ((contMatch = text.slice(end).match(contRe)) !== null) {
			// Only consume if NOT followed by period+digit (which would be chapter.verse of next ref)
			const afterCont = end + contMatch[0].length;
			if (
				afterCont < text.length &&
				text[afterCont] === '.' &&
				/\d/.test(text[afterCont + 1] ?? '')
			) {
				break; // This comma-number is actually a chapter number for a continuation ref
			}
			end += contMatch[0].length;
		}

		results.push({ start: m.index, end, osis, osisBook, chapter });
	}
	return results;
}

/**
 * After finding explicit book refs, scan for semicolon-chained bare chapter.verse
 * continuations that inherit the book from the preceding ref.
 * E.g. "Job 1.6; 2.1; 38.7" → three refs all to Job.
 */
function expandKnoxSemicolonChains(text: string, refs: KnoxRef[]): KnoxRef[] {
	if (refs.length === 0) return refs;

	const expanded: KnoxRef[] = [];

	for (let i = 0; i < refs.length; i++) {
		expanded.push(refs[i]);
		let pos = refs[i].end;
		const nextRefStart = i + 1 < refs.length ? refs[i + 1].start : text.length;
		let lastBook = refs[i].osisBook;
		let lastChapter = refs[i].chapter;

		// Look for "; N.N" continuations between this ref and the next explicit ref
		const semiRe = /^;\s*(\d+)\.(\d+)(?:\s*[-\u2013]\s*(\d+))?/;
		// Also handle bare "; N" (chapter only, no verse)
		const semiChRe = /^;\s*(\d+)(?!\.?\d)/;

		while (pos < nextRefStart) {
			// Skip whitespace
			if (text[pos] === ' ') {
				pos++;
				continue;
			}

			const remainder = text.slice(pos);

			// Try chapter.verse continuation
			const semiMatch = remainder.match(semiRe);
			if (semiMatch) {
				const chapter = parseInt(semiMatch[1]);
				const verse = parseInt(semiMatch[2]);
				const verseEnd = semiMatch[3] ? parseInt(semiMatch[3]) : undefined;
				let osis = `${lastBook}.${chapter}.${verse}`;
				if (verseEnd !== undefined) osis += `-${lastBook}.${chapter}.${verseEnd}`;
				const end = pos + semiMatch[0].length;

				// Consume comma-separated continuation verses after this semi ref
				let contEnd = end;
				const contRe = /^,\s*(\d+)(?:\s*[-\u2013]\s*(\d+))?/;
				let contMatch: RegExpMatchArray | null;
				while ((contMatch = text.slice(contEnd).match(contRe)) !== null) {
					const afterCont = contEnd + contMatch[0].length;
					if (
						afterCont < text.length &&
						text[afterCont] === '.' &&
						/\d/.test(text[afterCont + 1] ?? '')
					) {
						break;
					}
					contEnd += contMatch[0].length;
				}

				expanded.push({ start: pos, end: contEnd, osis, osisBook: lastBook, chapter });
				lastChapter = chapter;
				pos = contEnd;
				continue;
			}

			// Try chapter-only continuation: "; 2" (same book, chapter only)
			const semiChMatch = remainder.match(semiChRe);
			if (semiChMatch) {
				const chapter = parseInt(semiChMatch[1]);
				const osis = `${lastBook}.${chapter}`;
				const end = pos + semiChMatch[0].length;
				expanded.push({ start: pos, end, osis, osisBook: lastBook, chapter });
				lastChapter = chapter; // eslint-disable-line no-useless-assignment
				pos = end;
				continue;
			}

			break; // Not a continuation
		}
	}

	return expanded;
}

/**
 * Linkify Bible references in Knox translation notes.
 * Handles period-separated chapter.verse, semicolon chains, Roman numeral books,
 * and comma-separated verse continuations.
 */
export function linkifyKnoxRefs(text: string): string {
	let refs = findKnoxRefs(text);
	refs = expandKnoxSemicolonChains(text, refs);
	if (refs.length === 0) return text;

	let result = '';
	let lastEnd = 0;

	for (const ref of refs) {
		if (ref.start < lastEnd) continue; // skip overlapping
		const matchedText = text.slice(ref.start, ref.end);
		const searchUrl = `/search?q=${encodeURIComponent(ref.osis)}&mode=verse`;
		result += text.slice(lastEnd, ref.start);
		result += `<a class="verse-ref" data-osis="${ref.osis}" href="${searchUrl}" target="_blank" rel="noopener">${matchedText}</a>`;
		lastEnd = ref.end;
	}

	result += text.slice(lastEnd);
	return result;
}

// ── DRC reference linkification ──────────────────────────────────────
// DRC notes use period-space between chapter and verse: "Gen. 14. 14."
// Numbered books: "1. Par. 6. 34" or "3 Kings 22."
// Comma-separated verses: "Gen. 9. 4, 5, 6."
// Reuses the existing ABBREV_TO_OSIS map and SORTED_ABBREVS.

interface DrcRef {
	start: number;
	end: number;
	osis: string;
}

/**
 * Parse a DRC-style reference starting at `pos` in `text`.
 * Returns a ref object or null if no valid reference found.
 */
function matchDrcRefAt(text: string, pos: number): DrcRef | null {
	let cursor = pos;

	// 1) Optional numbered book prefix: "1. " or "1 " or "3 "
	let numPrefix = '';
	const numMatch = text.slice(cursor).match(/^(\d)\.\s+/);
	const numMatchNoP = !numMatch ? text.slice(cursor).match(/^(\d)\s+/) : null;
	if (numMatch) {
		numPrefix = numMatch[1];
		cursor += numMatch[0].length;
	} else if (numMatchNoP) {
		numPrefix = numMatchNoP[1];
		cursor += numMatchNoP[0].length;
	}

	// 2) Match book abbreviation
	let osisBook: string | null = null;
	let afterBook = cursor;
	for (const abbrev of SORTED_ABBREVS) {
		if (/^\d/.test(abbrev) && !numPrefix) continue;
		if (/^\d/.test(abbrev)) {
			if (abbrev[0] !== numPrefix) continue;
			const rest = abbrev.slice(1);
			if (!text.slice(cursor).startsWith(rest)) continue;
			const endIdx = cursor + rest.length;
			// Must be followed by ".", space+digit, or end
			if (endIdx < text.length && text[endIdx] !== '.') {
				if (text[endIdx] === ' ' && endIdx + 1 < text.length && /\d/.test(text[endIdx + 1])) {
					// OK: full name + space + digit
				} else {
					continue;
				}
			}
			afterBook = endIdx;
			osisBook = ABBREV_TO_OSIS[abbrev];
			break;
		}
		if (numPrefix) continue;
		if (!text.slice(cursor).startsWith(abbrev)) continue;
		const endIdx = cursor + abbrev.length;
		// Must be followed by ".", ":", or space+digit
		if (endIdx < text.length && text[endIdx] !== '.' && text[endIdx] !== ':') {
			if (text[endIdx] === ' ' && endIdx + 1 < text.length && /\d/.test(text[endIdx + 1])) {
				// OK: full name + space + digit (e.g. "John 3")
			} else {
				continue;
			}
		}
		afterBook = endIdx;
		osisBook = ABBREV_TO_OSIS[abbrev];
		break;
	}
	if (!osisBook) return null;

	// Skip optional period and space after book name
	let c = afterBook;
	if (c < text.length && text[c] === '.') c++;
	if (c < text.length && text[c] === ' ') c++;
	// Another space is OK (some have double space)
	if (c < text.length && text[c] === ' ') c++;

	// 3) Chapter number (required)
	const chMatch = text.slice(c).match(/^(\d+)/);
	if (!chMatch) return null;
	const chapter = parseInt(chMatch[1]);
	c += chMatch[0].length;

	// Skip optional trailing period after chapter
	if (c < text.length && text[c] === '.') c++;

	// 4) Check for verse: need whitespace then digit (DRC period-space format)
	//    But NOT if the next content is a letter (would be a sentence continuation)
	let verse: number | undefined;
	const beforeVerse = c;
	// Skip whitespace
	while (c < text.length && text[c] === ' ') c++;

	if (c < text.length && /\d/.test(text[c])) {
		// Check this isn't a new book abbreviation starting with a digit
		const nextBookCheck = matchBookAt(text, c);
		if (!nextBookCheck) {
			const vMatch = text.slice(c).match(/^(\d+)/);
			if (vMatch) {
				verse = parseInt(vMatch[1]);
				c += vMatch[0].length;
				// Skip trailing period after verse
				if (c < text.length && text[c] === '.') c++;
			}
		}
	}

	if (verse === undefined) {
		c = beforeVerse;
	}

	// 5) Consume continuation verses: ", 5, 6." or "and 7"
	let end = c;
	let lastVerse = verse;
	if (verse !== undefined) {
		const contRe = /^(?:,\s*|\s+and\s+)(\d+)\.?/;
		let contMatch: RegExpMatchArray | null;
		while ((contMatch = text.slice(end).match(contRe)) !== null) {
			lastVerse = parseInt(contMatch[1]);
			end += contMatch[0].length;
		}
	}

	// Build OSIS (use range if continuations expanded the verse span)
	let osis: string;
	if (verse !== undefined) {
		osis = `${osisBook}.${chapter}.${verse}`;
		if (lastVerse !== undefined && lastVerse !== verse) {
			osis += `-${osisBook}.${chapter}.${lastVerse}`;
		}
	} else {
		osis = `${osisBook}.${chapter}`;
	}

	return { start: pos, end, osis };
}

const ORDINAL_MAP: Record<string, string> = {
	first: '1',
	second: '2',
	third: '3',
	fourth: '4'
};

const PROSE_BOOK_RE =
	/\b(first|second|third|fourth)\s+(?:book\s+of\s+)?(Machabees|Kings|Paralipomenon|Esdras|Corinthians|Thessalonians|Timothy|Peter|John|Maccabees|Chronicles|Samuel)\.?\s+(\d+)(?:\.\s*(\d+))?/gi;

function findDrcRefs(text: string): DrcRef[] {
	const refs: DrcRef[] = [];

	// Pass 1: find prose ordinal refs like "first book of Machabees 5. 54"
	PROSE_BOOK_RE.lastIndex = 0;
	let proseMatch: RegExpExecArray | null;
	while ((proseMatch = PROSE_BOOK_RE.exec(text)) !== null) {
		const num = ORDINAL_MAP[proseMatch[1].toLowerCase()];
		const bookName = proseMatch[2];
		// Build a key like "1Machabees" and look it up
		const key = num + bookName;
		const osisBook = ABBREV_TO_OSIS[key] ?? null;
		if (!osisBook) continue;

		const chapter = parseInt(proseMatch[3]);
		const verse = proseMatch[4] ? parseInt(proseMatch[4]) : undefined;
		let osis = verse !== undefined ? `${osisBook}.${chapter}.${verse}` : `${osisBook}.${chapter}`;

		let end = proseMatch.index + proseMatch[0].length;
		// Consume trailing period
		if (end < text.length && text[end] === '.') end++;

		refs.push({ start: proseMatch.index, end, osis });
	}

	// Pass 2: find standard abbreviation refs
	let pos = 0;
	while (pos < text.length) {
		// Skip positions already covered by prose refs
		const coveredByProse = refs.some((r) => pos >= r.start && pos < r.end);
		if (coveredByProse) {
			pos++;
			continue;
		}

		// Only try matching at positions where a book abbreviation could start
		if (/[A-Z0-9]/.test(text[pos])) {
			const before = text.slice(0, pos);
			if (!/(?:de|ad|in|super\.|cont\.)\s*$/i.test(before)) {
				const ref = matchDrcRefAt(text, pos);
				if (ref) {
					refs.push(ref);
					pos = ref.end;
					continue;
				}
			}
		}
		pos++;
	}

	// Sort by position
	refs.sort((a, b) => a.start - b.start);
	return refs;
}

/**
 * Linkify Bible references in DRC translation notes.
 * Handles the period-space format: "Gen. 14. 14.", "1. Par. 6. 34",
 * comma-separated verses: "Gen. 9. 4, 5, 6."
 */
export function linkifyDrcRefs(text: string): string {
	const refs = findDrcRefs(text);
	if (refs.length === 0) return text;

	let result = '';
	let lastEnd = 0;

	for (const ref of refs) {
		if (ref.start < lastEnd) continue;
		const matchedText = text.slice(ref.start, ref.end);
		const searchUrl = `/search?q=${encodeURIComponent(ref.osis)}&mode=verse`;
		result += text.slice(lastEnd, ref.start);
		result += `<a class="verse-ref" data-osis="${ref.osis}" href="${searchUrl}" target="_blank" rel="noopener">${matchedText}</a>`;
		lastEnd = ref.end;
	}

	result += text.slice(lastEnd);
	return result;
}
