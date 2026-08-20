/**
 * Psalm numbering differs between the two traditions this site puts side by
 * side. The Douay-Rheims follows the Vulgate/Septuagint; the KJV follows the
 * Hebrew/Masoretic text. Only 12 of the 150 psalms share a number.
 *
 * Three kinds of divergence:
 *   - a straight offset of one across the long middle stretches
 *   - psalms the Vulgate merged  (DR 9 = KJV 9+10, DR 113 = KJV 114+115)
 *   - psalms the Vulgate split   (DR 114+115 = KJV 116, DR 146+147 = KJV 147)
 *
 * Verses diverge too: the Vulgate counts the Hebrew superscription as verse 1,
 * so 57 psalms sit one row out of step even once the numbers line up.
 *
 * The reverse lookup lives in books.ts as drFromHebPsalmNum, next to the
 * getHebPsalmNum display formatter that shares its table. Keep it there: one
 * copy of the numbering rule, and books.test.ts checks the two agree.
 */

export interface KjvPsalmRef {
	chapter: number;
	verse: number;
}

/** KJV (Hebrew) psalm numbers a Douay-Rheims psalm corresponds to, in order. */
export function kjvPsalmsForDr(dr: number): number[] {
	if (dr <= 8) return [dr];
	if (dr === 9) return [9, 10];
	if (dr <= 112) return [dr + 1];
	if (dr === 113) return [114, 115];
	if (dr === 114 || dr === 115) return [116];
	if (dr <= 145) return [dr + 1];
	if (dr === 146 || dr === 147) return [147];
	return [dr];
}

/**
 * For the second half of a psalm the Vulgate split, the DR psalm that takes the
 * earlier share of the same KJV psalm. Null for every other psalm.
 */
export function precedingSplitSibling(dr: number): number | null {
	if (dr === 115) return 114;
	if (dr === 147) return 146;
	return null;
}

/**
 * Douay-Rheims psalms whose superscription runs to two verses.
 *
 * These four carry a historical note the KJV keeps inside its single heading:
 * DR 50 opens "Unto the end, a Psalm of David," and only in verse 2 reaches
 * "when Nathan the Prophet came to him", while the KJV prints both as one
 * unnumbered title. Counting one title row there starts the body a row early
 * and puts every verse of the psalm out by one.
 *
 * The set is closed. Every psalm whose Douay verse count exceeds the KJV body
 * by two was read against the KJV heading: these four are titles, and Psalm 4's
 * second extra verse is a genuine division of KJV 4:8.
 */
const TWO_VERSE_TITLE = new Set([50, 51, 53, 59]);

/** How many Douay verses the superscription of a psalm occupies. */
export function drTitleVerseCount(drPsalm: number): 1 | 2 {
	return TWO_VERSE_TITLE.has(drPsalm) ? 2 : 1;
}

/**
 * Map a Douay-Rheims psalm's verse numbers onto KJV verse references.
 *
 * `kjvRefs` is the flattened, ordered verse list of `kjvPsalmsForDr(drPsalm)`.
 * For the second half of a split psalm, `precedingSiblingVerseCount` says how
 * many leading verses belong to the sibling.
 *
 * Alignment is positional. Where the Vulgate numbers the Hebrew superscription
 * as verse 1, the KJV leaves it an unnumbered heading, so the rows below it sit
 * apart and the body starts lower down. `titleRef` points at the KJV's own
 * superscription, kept as verse 0, and DR verse 1 maps onto it. `titleVerses`
 * says how many DR rows the title occupies; the KJV heading is shown against
 * the first of them, having nothing further to say on the second.
 *
 * Passing `titleRef` is what makes that safe. A DR psalm carrying one more
 * verse than the KJV is not proof of a title: neither tradition gives Psalm 2
 * one, and the DR simply divides a verse differently there, so inferring a
 * title from the count alone slid the whole psalm down a row.
 *
 * Two psalms are then left where the divisions genuinely differ: the Vulgate
 * splits KJV 2:12 across DR 2:12-13 and KJV 4:8 across DR 4:9-10. Their last
 * row has no counterpart and is left empty, rather than printing a KJV verse
 * twice and inventing a division it does not make.
 */
export function alignDrPsalmToKjv(opts: {
	drVerseCount: number;
	kjvRefs: KjvPsalmRef[];
	titleRef?: KjvPsalmRef | null;
	titleVerses?: 1 | 2;
	precedingSiblingVerseCount?: number;
}): Map<number, KjvPsalmRef> {
	const { drVerseCount, titleRef = null, titleVerses = 1, precedingSiblingVerseCount = 0 } = opts;
	const refs = precedingSiblingVerseCount
		? opts.kjvRefs.slice(precedingSiblingVerseCount)
		: opts.kjvRefs;

	const mapping = new Map<number, KjvPsalmRef>();
	if (refs.length === 0 || drVerseCount <= 0) return mapping;

	// A title row only exists where the KJV has a superscription and the DR has
	// the spare verses to hold it.
	const skipTitle = titleRef && drVerseCount > refs.length ? titleVerses : 0;
	if (skipTitle) mapping.set(1, titleRef!);

	for (let i = 0; i < refs.length; i++) {
		const drVerse = 1 + skipTitle + i;
		if (drVerse > drVerseCount) break;
		mapping.set(drVerse, refs[i]);
	}

	return mapping;
}
