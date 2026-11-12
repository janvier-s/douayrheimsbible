import type { FathersChapterFile } from '$lib/data/fathers-types';
import {
	odrToPrevious,
	previousRangeToOdr,
	previousToOdr,
	type ChapterVersification
} from './versification';

/**
 * The Fathers data is keyed on the Vulgate-aligned verse numbers. In the chapters
 * where ODR follows the 1609 division, move the keys onto ODR verse numbers so the
 * verse list, badges and highlighting line up. A verse that was split in two shows
 * the full count on both halves; a Fathers sub-verse goes to the first ODR verse
 * covering it. `verseRef` stays as published (it is a citation, not a key).
 */
export function remapFathersChapter(
	data: FathersChapterFile | null,
	cv: ChapterVersification | undefined,
	odrVerses: number[]
): FathersChapterFile | null {
	if (!data || !cv) return data;
	const verseEntryCounts: Record<number, number> = {};
	for (const n of odrVerses) {
		if (n <= 0) continue;
		const total = odrToPrevious(cv, n).reduce((sum, p) => sum + (data.verseEntryCounts[p] ?? 0), 0);
		if (total > 0) verseEntryCounts[n] = total;
	}
	return {
		...data,
		verseEntryCounts,
		pericopes: data.pericopes.map((p) => {
			const { start, end } = previousRangeToOdr(cv, p.startVerse, p.endVerse);
			return {
				...p,
				startVerse: start,
				endVerse: end,
				entries: p.entries.map((e) =>
					e.subVerseNum === null ? e : { ...e, subVerseNum: previousToOdr(cv, e.subVerseNum)[0] }
				)
			};
		})
	};
}
