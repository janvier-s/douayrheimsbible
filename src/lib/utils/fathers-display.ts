// src/lib/utils/fathers-display.ts
import { getBookByOdrName } from '$lib/data/books';
import type { BookMeta } from '$lib/data/types';

/**
 * Map from unified-entries DRC book names that don't exactly match
 * the ODR odrName field. These are the only 3 mismatches.
 */
const UNIFIED_TO_ODR: Record<string, string> = {
	Isaias: 'Isaie',
	Jeremias: 'Jeremy',
	Malachias: 'Malachie'
};

/** Cache book lookups since verseRefs repeat heavily */
const bookCache = new Map<string, BookMeta | null>();

function lookupBook(bookName: string): BookMeta | null {
	if (bookCache.has(bookName)) return bookCache.get(bookName)!;
	// Try direct lookup first, then the mismatch map
	const odrName = UNIFIED_TO_ODR[bookName] ?? bookName;
	const meta = getBookByOdrName(odrName) ?? null;
	bookCache.set(bookName, meta);
	return meta;
}

/**
 * Convert a DRC verseRef to the user's preferred book-name style.
 * "1 Kings 1:1-7" → "1 Samuel 1:1-7" (modern) or "1 Kings 1:1-7" (DRC)
 */
export function displayVerseRef(verseRef: string, useModernNames: boolean): string {
	// Extract book name: everything before the last " \d" (chapter start)
	const m = verseRef.match(/^(.+?)\s+(\d.*)$/);
	if (!m) return verseRef;

	const [, bookName, rest] = m;
	const meta = lookupBook(bookName);
	if (!meta) return verseRef;

	const displayName = useModernNames ? meta.modernName : meta.odrName;
	return `${displayName} ${rest}`;
}
