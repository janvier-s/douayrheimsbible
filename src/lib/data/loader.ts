import type { BookData, Chapter, ChapterAnnotations } from './types';

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

// ── Annotation sidecar (lazy-loaded per chapter) ─────────────────

const annotationCache = new Map<string, Promise<ChapterAnnotations | null>>();

/** Fetches annotation sidecar for a chapter, with in-memory caching. Returns null on 404. */
export function loadAnnotations(
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<ChapterAnnotations | null> {
	const key = `${slug}/${chapter}`;
	if (!annotationCache.has(key)) {
		const path = `/data/odr/${slug}/annotations/${String(chapter).padStart(3, '0')}.json`;
		const promise = fetch(path).then((res) =>
			res.ok ? (res.json() as Promise<ChapterAnnotations>) : null
		);
		annotationCache.set(key, promise);
	}
	return annotationCache.get(key)!;
}
