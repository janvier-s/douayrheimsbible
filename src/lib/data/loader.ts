import type { BookData, Chapter } from './types';

const bookCache = new Map<string, Promise<BookData>>();

/** Fetches the full book JSON with in-memory deduplication (also cached by browser + CDN) */
export function loadBook(slug: string, fetch: typeof globalThis.fetch): Promise<BookData> {
	if (!bookCache.has(slug)) {
		bookCache.set(
			slug,
			fetch(`/data/odr/${slug}.json`).then((res) => {
				if (!res.ok) throw new Error(`Book not found: ${slug}`);
				return res.json() as Promise<BookData>;
			})
		);
	}
	return bookCache.get(slug)!;
}

/** Extracts a single chapter from a loaded book */
export function getChapter(book: BookData, chapterNum: number): Chapter | undefined {
	return book.chapters.find((c) => c.chapter === chapterNum);
}

/** Returns total chapter count from book data */
export function getChapterCount(book: BookData): number {
	return book.chapters.length;
}
