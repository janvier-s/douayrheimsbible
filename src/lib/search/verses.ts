import type { OsisRange } from './reference';
import type { Verse } from '$lib/data/types';
import { loadBook, getChapter } from '$lib/data/loader';
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

			// Handle cross-chapter ranges (rare but possible)
			for (let ch = range.startChapter; ch <= range.endChapter; ch++) {
				const chapter = getChapter(bookData, ch);
				if (!chapter) continue;

				const startV = ch === range.startChapter ? (range.startVerse ?? 1) : 1;
				const endV =
					ch === range.endChapter
						? (range.endVerse ?? chapter.verses[chapter.verses.length - 1]?.verse ?? 999)
						: (chapter.verses[chapter.verses.length - 1]?.verse ?? 999);

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
