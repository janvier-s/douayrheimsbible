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
 * Map a Douay-Rheims psalm's verse numbers onto KJV verse references.
 *
 * `kjvRefs` is the flattened, ordered verse list of `kjvPsalmsForDr(drPsalm)`.
 * For the second half of a split psalm, `precedingSiblingVerseCount` says how
 * many leading verses belong to the sibling.
 *
 * Alignment is positional. When DR carries more verses than the KJV, the first
 * is the Hebrew superscription the Vulgate numbers and the KJV leaves as an
 * unnumbered heading, so mapping starts at DR verse 2. This is exact for 142 of
 * the 150 psalms; the eight whose internal divisions genuinely differ (DR 4, 15,
 * 39, 50, 51, 53, 59, 76) land close and simply run out of verses at the end
 * rather than mapping to the wrong text.
 */
export function alignDrPsalmToKjv(opts: {
	drVerseCount: number;
	kjvRefs: KjvPsalmRef[];
	precedingSiblingVerseCount?: number;
}): Map<number, KjvPsalmRef> {
	const { drVerseCount, precedingSiblingVerseCount = 0 } = opts;
	const refs = precedingSiblingVerseCount
		? opts.kjvRefs.slice(precedingSiblingVerseCount)
		: opts.kjvRefs;

	const mapping = new Map<number, KjvPsalmRef>();
	if (refs.length === 0 || drVerseCount <= 0) return mapping;

	// DR ahead on verses means its first one is the superscription.
	const skipTitle = drVerseCount > refs.length ? 1 : 0;

	for (let i = 0; i < refs.length; i++) {
		const drVerse = 1 + skipTitle + i;
		if (drVerse > drVerseCount) break;
		mapping.set(drVerse, refs[i]);
	}

	return mapping;
}
