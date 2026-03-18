import type { BookData, Chapter } from './types';

/** Fetches the full book JSON (cached by browser + CDN after first load) */
export async function loadBook(slug: string, fetch: typeof globalThis.fetch): Promise<BookData> {
	const res = await fetch(`/data/odr/${slug}.json`);
	if (!res.ok) throw new Error(`Book not found: ${slug}`);
	return res.json() as Promise<BookData>;
}

/** Extracts a single chapter from a loaded book */
export function getChapter(book: BookData, chapterNum: number): Chapter | undefined {
	return book.chapters.find((c) => c.chapter === chapterNum);
}

/** Returns total chapter count from book data */
export function getChapterCount(book: BookData): number {
	return book.chapters.length;
}
