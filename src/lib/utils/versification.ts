/**
 * ODR verses in 13 chapters follow the 1609/1582 printing, whose division differs
 * from the Vulgate-aligned numbering every other translation here uses.
 * static/data/odr/versification.json records, per book and chapter, which
 * previous (Vulgate-aligned) verse numbers each ODR verse covers:
 *   { book: { chapter: { odrVerse: [previousVerse, ...] } } }
 * Verses (and chapters, books) that are not listed are unchanged: ODR n covers n.
 */
export type ChapterVersification = Record<string, number[]>;
export type Versification = Record<string, Record<string, ChapterVersification>>;

export function chapterVersification(
	map: Versification | null | undefined,
	book: string,
	chapter: number
): ChapterVersification | undefined {
	return map?.[book]?.[String(chapter)];
}

/** Previous (Vulgate-aligned) verse numbers covered by an ODR verse. */
export function odrToPrevious(cv: ChapterVersification | undefined, odrVerse: number): number[] {
	return cv?.[String(odrVerse)] ?? [odrVerse];
}

/** ODR verse numbers that cover a previous verse number (ascending). */
export function previousToOdr(
	cv: ChapterVersification | undefined,
	previousVerse: number
): number[] {
	if (!cv) return [previousVerse];
	const out = new Set<number>();
	// An ODR verse that is not listed covers its own number.
	if (!(String(previousVerse) in cv)) out.add(previousVerse);
	for (const [n, prev] of Object.entries(cv)) if (prev.includes(previousVerse)) out.add(Number(n));
	return [...out].sort((a, b) => a - b);
}

/** Comparison rows (previous numbering, ascending) for the given ODR verse numbers. */
export function comparisonRows(
	cv: ChapterVersification | undefined,
	odrVerses: number[]
): number[] {
	const rows = new Set<number>();
	for (const n of odrVerses) if (n > 0) for (const p of odrToPrevious(cv, n)) rows.add(p);
	return [...rows].sort((a, b) => a - b);
}

/**
 * Re-key ODR verse text onto the comparison rows. An ODR verse that spans several
 * rows is shown once, on its first row, with a "↑ (n)" pointer on the later rows.
 * Several ODR verses on one row are concatenated, each tagged with its own number.
 * A verse is tagged "(n)" whenever its number differs from the row's or it shares the row.
 */
export function alignOdrToRows(
	cv: ChapterVersification | undefined,
	texts: Record<number, string>,
	opts: { tagShifted?: boolean } = {}
): Record<number, string> {
	const { tagShifted = true } = opts;
	if (!cv) return texts;
	const byRow = new Map<number, number[]>();
	for (const key of Object.keys(texts)) {
		const n = Number(key);
		if (n <= 0) continue;
		for (const p of odrToPrevious(cv, n)) byRow.set(p, [...(byRow.get(p) ?? []), n]);
	}
	const out: Record<number, string> = {};
	for (const [row, verses] of byRow) {
		verses.sort((a, b) => a - b);
		const shared = verses.length > 1;
		out[row] = verses
			.map((n) => {
				const tag = shared || (tagShifted && n !== row) ? `(${n}) ` : '';
				return odrToPrevious(cv, n)[0] === row ? tag + (texts[n] ?? '') : `↑ (${n})`;
			})
			.join(' ');
	}
	return out;
}

/**
 * Translate a verse range cited in Vulgate-aligned numbering (a typed reference,
 * a Fathers pericope, a cross-reference from another translation) into the
 * ODR verse range that contains it.
 */
export function previousRangeToOdr(
	cv: ChapterVersification | undefined,
	start: number,
	end: number = start
): { start: number; end: number } {
	if (!cv) return { start, end };
	const s = previousToOdr(cv, start);
	const e = previousToOdr(cv, end);
	return { start: Math.min(...s), end: Math.max(...e) };
}

/**
 * Translations that number a few chapters differently from the Vulgate-aligned rows
 * (checked verse by verse against the Latin Vulgate). Challoner's Douay (DRC) and
 * Haydock split Psalm 42:5 and 125:6, 2 Corinthians 1:23 and Ecclesiasticus 29:15-18
 * one verse further than the Vulgate; the CPDV does the same except in Psalm 42.
 * Shape as in Versification: { translation: { book: { chapter: { verse: [rows] } } } }.
 */
function ecclesiasticus29Shift(): ChapterVersification {
	const m: ChapterVersification = { '16': [16, 17], '17': [18] };
	for (let v = 18; v <= 34; v++) m[String(v)] = [v + 1];
	return m;
}
const challonerNumbering = (psalm42: boolean): Versification => ({
	...(psalm42
		? { psalms: { '42': { '6': [5] }, '125': { '7': [6] } } }
		: { psalms: { '125': { '7': [6] } } }),
	'2-corinthians': { '1': { '24': [23] } },
	ecclesiasticus: { '29': ecclesiasticus29Shift() }
});
export const COLUMN_VERSIFICATION: Record<string, Versification> = {
	drc: challonerNumbering(true),
	haydock: challonerNumbering(true),
	cpdv: challonerNumbering(false)
};
