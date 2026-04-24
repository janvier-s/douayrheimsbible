import type {
	BookData,
	Chapter,
	ChapterAnnotations,
	ConfChapterFootnotes,
	ConfChapterCommentary,
	ConfIntro,
	ConfFrontMatter,
	ConfBackMatter
} from './types';
import type { TranslationBook, TranslationNote, TranslationCrossRef } from './translation-types';
import type { FathersChapterFile } from './fathers-types';

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

// ── Translation notes (DRC / CPDV chapter-level) ─────────────────

const translationNotesCache = new Map<string, Promise<TranslationNote[] | null>>();

/**
 * Fetches chapter-level notes for a non-ODR translation (DRC or CPDV).
 * Returns null on 404 (chapter has no notes). Caches per `{id}/{slug}/{chapter}`.
 */
export function loadTranslationNotes(
	id: string,
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<TranslationNote[] | null> {
	const key = `${id}/${slug}/${chapter}`;
	if (!translationNotesCache.has(key)) {
		const promise = fetch(`/data/${id}-notes/${slug}/${chapter}.json`).then((res) => {
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`Failed to load notes: ${res.status}`);
			return res.json() as Promise<TranslationNote[]>;
		});
		promise.then(null, () => translationNotesCache.delete(key));
		translationNotesCache.set(key, promise);
	}
	return translationNotesCache.get(key)!;
}

// ── Translation cross-references (DRC chapter-level) ────────────────────────────

const translationCrossRefsCache = new Map<string, Promise<TranslationCrossRef[] | null>>();

export function loadTranslationCrossRefs(
	id: string,
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<TranslationCrossRef[] | null> {
	const key = `${id}/${slug}/${chapter}`;
	if (!translationCrossRefsCache.has(key)) {
		const promise = fetch(`/data/${id}-crossrefs/${slug}/${chapter}.json`).then((res) => {
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`Failed to load cross-refs: ${res.status}`);
			return res.json() as Promise<TranslationCrossRef[]>;
		});
		promise.then(null, () => translationCrossRefsCache.delete(key));
		translationCrossRefsCache.set(key, promise);
	}
	return translationCrossRefsCache.get(key)!;
}

// ── Haydock commentary (per chapter) ────────────────────────────────

export interface HaydockCommentaryEntry {
	verse: number;
	marker: string;
	text: string;
}

const haydockCommentaryCache = new Map<string, Promise<HaydockCommentaryEntry[] | null>>();

export function loadHaydockCommentary(
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<HaydockCommentaryEntry[] | null> {
	const key = `${slug}/${chapter}`;
	if (!haydockCommentaryCache.has(key)) {
		const promise = fetch(`/data/haydock-commentary/${slug}/${chapter}.json`).then((res) => {
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`Failed to load Haydock commentary: ${res.status}`);
			return res.json() as Promise<HaydockCommentaryEntry[]>;
		});
		promise.then(null, () => haydockCommentaryCache.delete(key));
		haydockCommentaryCache.set(key, promise);
	}
	return haydockCommentaryCache.get(key)!;
}

// ── Haydock book introductions ──────────────────────────────────────

export interface HaydockIntro {
	book: string;
	paragraphs: string[];
}

const haydockIntroCache = new Map<string, Promise<HaydockIntro | null>>();

export function loadHaydockIntro(
	slug: string,
	fetch: typeof globalThis.fetch
): Promise<HaydockIntro | null> {
	if (!haydockIntroCache.has(slug)) {
		const promise = fetch(`/data/haydock-intros/${slug}.json`).then((res) => {
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`Failed to load Haydock intro: ${res.status}`);
			return res.json() as Promise<HaydockIntro>;
		});
		promise.then(null, () => haydockIntroCache.delete(slug));
		haydockIntroCache.set(slug, promise);
	}
	return haydockIntroCache.get(slug)!;
}

// ── Confraternity NT book introductions ──────────────────────────

const confIntroCache = new Map<string, Promise<ConfIntro | null>>();

/**
 * Fetches the book introduction for Confraternity NT.
 * Returns null on 404 (book has no intro). Caches per slug.
 */
export function loadConfIntro(
	slug: string,
	fetch: typeof globalThis.fetch
): Promise<ConfIntro | null> {
	if (!confIntroCache.has(slug)) {
		const promise = fetch(`/data/conf-intros/${slug}.json`).then((res) => {
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`Failed to load intro: ${res.status}`);
			return res.json() as Promise<ConfIntro>;
		});
		promise.then(null, () => confIntroCache.delete(slug));
		confIntroCache.set(slug, promise);
	}
	return confIntroCache.get(slug)!;
}

// ── Confraternity footnotes ───────────────────────────────────
const confFootnotesCache = new Map<string, Promise<ConfChapterFootnotes | null>>();

export function loadConfFootnotes(
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<ConfChapterFootnotes | null> {
	const key = `${slug}/${chapter}`;
	const cached = confFootnotesCache.get(key);
	if (cached) return cached;

	const padded = String(chapter).padStart(3, '0');
	const promise = fetch(`/data/conf-footnotes/${slug}/${padded}.json`)
		.then((r) => (r.ok ? (r.json() as Promise<ConfChapterFootnotes>) : null))
		.catch(() => {
			confFootnotesCache.delete(key);
			return null;
		});

	confFootnotesCache.set(key, promise);
	return promise;
}

// ── Confraternity commentary ──────────────────────────────────
const confCommentaryCache = new Map<string, Promise<ConfChapterCommentary | null>>();

export function loadConfCommentary(
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<ConfChapterCommentary | null> {
	const key = `${slug}/${chapter}`;
	const cached = confCommentaryCache.get(key);
	if (cached) return cached;

	const padded = String(chapter).padStart(3, '0');
	const promise = fetch(`/data/conf-commentary/${slug}/${padded}.json`)
		.then((r) => (r.ok ? (r.json() as Promise<ConfChapterCommentary>) : null))
		.catch(() => {
			confCommentaryCache.delete(key);
			return null;
		});

	confCommentaryCache.set(key, promise);
	return promise;
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

// ── Confraternity front/back matter (book-level content) ──────────

let frontMatterPromise: Promise<ConfFrontMatter | null> | null = null;

/** Fetches the Confraternity front matter (shared across all books). Returns null on 404. */
export function loadConfFrontMatter(
	fetch: typeof globalThis.fetch
): Promise<ConfFrontMatter | null> {
	if (!frontMatterPromise) {
		frontMatterPromise = fetch(`/data/conf-front/content.json`).then((res) => {
			if (!res.ok) return null;
			return res.json() as Promise<ConfFrontMatter>;
		});
	}
	return frontMatterPromise;
}

let backMatterPromise: Promise<ConfBackMatter | null> | null = null;

/** Fetches the Confraternity back matter (shared across all books). Returns null on 404. */
export function loadConfBackMatter(fetch: typeof globalThis.fetch): Promise<ConfBackMatter | null> {
	if (!backMatterPromise) {
		backMatterPromise = fetch(`/data/conf-back/content.json`).then((res) => {
			if (!res.ok) return null;
			return res.json() as Promise<ConfBackMatter>;
		});
	}
	return backMatterPromise;
}

// ── Fathers commentary (ACCS + FKB, per chapter) ────────────────

const fathersChapterCache = new Map<string, Promise<FathersChapterFile | null>>();

export function loadFathersChapter(
	slug: string,
	chapter: number,
	fetch: typeof globalThis.fetch
): Promise<FathersChapterFile | null> {
	const key = `${slug}/${chapter}`;
	const cached = fathersChapterCache.get(key);
	if (cached) return cached;

	const promise = fetch(`/data/fathers/${slug}/${chapter}.json`)
		.then((r) => (r.ok ? (r.json() as Promise<FathersChapterFile>) : null))
		.catch(() => {
			fathersChapterCache.delete(key);
			return null;
		});

	fathersChapterCache.set(key, promise);
	return promise;
}
