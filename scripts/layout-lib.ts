// scripts/layout-lib.ts
// The three ways verses are laid out in the EPUB, DOCX, HTML and OSIS files.
//   flowing    one paragraph per chapter
//   paragraph  the site's paragraphs: the CPDV paragraph starts in
//              src/lib/data/paragraphs.ts, applied exactly as the site's
//              groupIntoParagraphs does (a chapter with no data is one block)
//   verse      one paragraph per verse
// The breaks come from the CPDV edition and are applied to the ODR text by
// verse number, as on the reading site.

import { PARAGRAPH_STARTS } from '../src/lib/data/paragraphs.js';

export type Layout = 'flowing' | 'paragraph' | 'verse';
export const LAYOUTS: readonly Layout[] = ['flowing', 'paragraph', 'verse'];

export type Starts = Record<string, Record<number, number[]>>;

/**
 * True when `verse` opens a new block. The first verse of a chapter never
 * "breaks": there is nothing before it.
 */
export function makeBreaker(
	slug: string,
	chapter: number,
	layout: Layout,
	starts: Starts = PARAGRAPH_STARTS
): (verse: number) => boolean {
	if (layout === 'flowing') return () => false;
	if (layout === 'verse') return () => true;
	const set = new Set(starts[slug]?.[chapter] ?? []);
	return (verse) => set.has(verse);
}

/** Splits verses into blocks according to the layout. */
export function groupVerses<T extends { verse: number }>(
	slug: string,
	chapter: number,
	verses: T[],
	layout: Layout,
	starts: Starts = PARAGRAPH_STARTS
): T[][] {
	const breaks = makeBreaker(slug, chapter, layout, starts);
	const groups: T[][] = [];
	for (const v of verses) {
		// A repeated verse number (part b, c) stays with its first part.
		const repeat = groups.length > 0 && groups[groups.length - 1].some((x) => x.verse === v.verse);
		if (groups.length === 0 || (breaks(v.verse) && !repeat)) groups.push([v]);
		else groups[groups.length - 1].push(v);
	}
	return groups;
}

/** Books and chapters the paragraph layout has no data for; they fall back to one block. */
export function uncoveredChapters(
	slug: string,
	chapters: number[],
	starts: Starts = PARAGRAPH_STARTS
) {
	return chapters.filter((c) => !starts[slug]?.[c]?.length);
}
