import type { BookData, Chapter } from './types';

const bookCache = new Map<string, Promise<BookData>>();
const resolvedCache = new Map<string, BookData>();

/** Fetches the full book JSON with in-memory deduplication (also cached by browser + CDN) */
export function loadBook(slug: string, fetch: typeof globalThis.fetch): Promise<BookData> {
	if (!bookCache.has(slug)) {
		const promise = fetch(`/data/odr/${slug}.json`).then((res) => {
			if (!res.ok) throw new Error(`Book not found: ${slug}`);
			return res.json() as Promise<BookData>;
		});
		promise.then((data) => resolvedCache.set(slug, data));
		bookCache.set(slug, promise);
	}
	return bookCache.get(slug)!;
}

/** Returns already-resolved BookData synchronously, or null if not yet loaded. */
export function getCachedBook(slug: string): BookData | null {
	return resolvedCache.get(slug) ?? null;
}

/** Extracts a single chapter from a loaded book */
export function getChapter(book: BookData, chapterNum: number): Chapter | undefined {
	return book.chapters.find((c) => c.chapter === chapterNum);
}
