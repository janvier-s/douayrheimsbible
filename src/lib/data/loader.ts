import type { BookData, Chapter, ChapterAnnotations } from './types';
import type { TranslationBook } from './translation-types';

const bookCache = new Map<string, Promise<BookData>>();
const resolvedCache = new Map<string, BookData>();

/** Fetches the full book JSON with in-memory deduplication (also cached by browser + CDN) */
export function loadBook(slug: string, fetch: typeof globalThis.fetch): Promise<BookData> {
	if (!bookCache.has(slug)) {
		const promise = fetch(`/data/odr/${slug}.json`).then((res) => {
			if (!res.ok) throw new Error(`Book not found: ${slug}`);
			return res.json() as Promise<BookData>;
		});
		promise.then(
			(data) => resolvedCache.set(slug, data),
			() => bookCache.delete(slug) // evict on failure so next call retries
		);
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
		const promise = fetch(path).then((res) => {
			if (res.status === 404) return null; // no annotations for this chapter
			if (!res.ok) throw new Error(`Failed to load annotations: ${res.status}`);
			return res.json() as Promise<ChapterAnnotations>;
		});
		promise.then(null, () => annotationCache.delete(key)); // evict on failure so next call retries
		annotationCache.set(key, promise);
	}
	return annotationCache.get(key)!;
}

// ── Non-ODR translation books ─────────────────────────────────────

const translationBookCache = new Map<string, Promise<TranslationBook>>();

/**
 * Fetches a non-ODR translation book from /data/{id}/{slug}.json.
 * Caches per `{id}/{slug}` key. Follows the same pattern as loadBook().
 */
export function loadTranslationBook(
	id: string,
	slug: string,
	fetch: typeof globalThis.fetch
): Promise<TranslationBook> {
	const key = `${id}/${slug}`;
	if (!translationBookCache.has(key)) {
		const promise = fetch(`/data/${id}/${slug}.json`).then((res) => {
			if (!res.ok) throw new Error(`Book not found: ${id}/${slug}`);
			return res.json() as Promise<TranslationBook>;
		});
		promise.then(null, () => translationBookCache.delete(key));
		translationBookCache.set(key, promise);
	}
	return translationBookCache.get(key)!;
}
