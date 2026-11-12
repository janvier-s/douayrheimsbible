import type { OsisRange } from './osis';
import type { Verse } from '$lib/data/types';
import { loadBook, getChapter, loadVersification } from '$lib/data/loader';
import { chapterVersification, previousRangeToOdr } from '$lib/utils/versification';
import { OSIS_TO_SLUG } from './resolve';
import { ALL_BOOKS } from '$lib/data/books';

export interface SearchResultGroup {
	/** Display heading e.g. "Matthew 16:18" */
	heading: string;
	/** App slug for linking e.g. "matthew" */
	slug: string;
	/** Chapter number for the "Read full chapter" link */
	chapter: number;
	/** ODR book name for display */
	bookName: string;
	/** The verses in this group */
	verses: Verse[];
}

/**
 * Given parsed OSIS ranges, fetch book data and extract the matching verses.
 * Returns an array of result groups ready for display.
 */
export async function buildResultGroups(
	ranges: OsisRange[],
	fetch: typeof globalThis.fetch
): Promise<SearchResultGroup[]> {
	const groups: SearchResultGroup[] = [];

	for (const range of ranges) {
		const slug = OSIS_TO_SLUG[range.book];
		if (!slug) continue;

		const meta = ALL_BOOKS.find((b) => b.slug === slug);
		if (!meta) continue;

		try {
			const bookData = await loadBook(slug, fetch);
			const versification = await loadVersification(fetch);

			// Handle cross-chapter ranges (rare but possible)
			for (let ch = range.startChapter; ch <= range.endChapter; ch++) {
				const chapter = getChapter(bookData, ch);
				if (!chapter) continue;

				const cv = chapterVersification(versification, slug, ch);
				const lastV = chapter.verses[chapter.verses.length - 1]?.verse ?? 999;
				// A cited verse number is Vulgate-aligned; translate it onto ODR's division.
				const startV =
					ch === range.startChapter && range.startVerse !== undefined
						? previousRangeToOdr(cv, range.startVerse).start
						: 1;
				const endV =
					ch === range.endChapter && range.endVerse !== undefined
						? previousRangeToOdr(cv, range.endVerse).end
						: lastV;

				const verses = chapter.verses.filter((v) => v.verse >= startV && v.verse <= endV);
				if (!verses.length) continue;

				// Build heading
				const heading = formatHeading(meta.odrName, ch, startV, endV, range);

				groups.push({
					heading,
					slug,
					chapter: ch,
					bookName: meta.odrName,
					verses
				});
			}
		} catch {
			// Book failed to load — skip silently
			continue;
		}
	}

	return groups;
}

function formatHeading(
	bookName: string,
	chapter: number,
	startVerse: number,
	endVerse: number,
	range: OsisRange
): string {
	// Whole chapter (no verse specified in input)
	if (range.startVerse === undefined && range.endVerse === undefined) {
		return `${bookName} ${chapter}`;
	}
	// Single verse
	if (startVerse === endVerse) {
		return `${bookName} ${chapter}:${startVerse}`;
	}
	// Verse range
	return `${bookName} ${chapter}:${startVerse}\u2013${endVerse}`;
}
