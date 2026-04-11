/**
 * Shared text normalization for the ODR text search index.
 * Used by both the build-time indexer and the client-side query engine.
 */

/**
 * Fold ae diphthraph and æ ligature to plain "e" so queries and indexed terms
 * match regardless of spelling.
 * æ (1 char) → ae (2 chars) → e (1 char): net 1:1, so character positions are preserved
 * in text that already uses the æ ligature (as the data does after the ligature fix).
 * This lets users find "Cæsar" by typing "cesar" or "caesar", and "Ægypt" by "egypt".
 */
export function foldLigatures(text: string): string {
	return text
		.replace(/Æ/g, 'Ae') // normalise ligature to digraph first (capital)
		.replace(/æ/g, 'ae') // normalise ligature to digraph first (lower)
		.replace(/AE/g, 'E') // fold digraph → single vowel
		.replace(/Ae/g, 'E')
		.replace(/ae/g, 'e');
}

/** Strip all HTML tags from verse/note text. Removes <cr> and <na> tags WITH their content. */
export function stripHtml(text: string): string {
	return text
		.replace(/<cr>[^<]*<\/cr>/g, '')
		.replace(/<na>[^<]*<\/na>/g, '')
		.replace(/<[^>]+>/g, '');
}

/** Tokenize text into normalized search tokens: lowercase, strip punctuation, remove hyphens. */
export function tokenize(text: string): string[] {
	if (!text) return [];
	return foldLigatures(text)
		.toLowerCase()
		.replace(/\[[\d]+\]/g, '') // remove bracket markers [1], [2], etc.
		.replace(/[.,;:!?()"']/g, ' ') // punctuation to spaces
		.split(/\s+/)
		.map((w) => w.replace(/-/g, '')) // strip hyphens: to-day → today
		.filter((w) => w.length > 0);
}

/** The MiniSearch processTerm function. Returns null for empty tokens. */
export function processTerm(term: string): string | null {
	const normalized = foldLigatures(term)
		.toLowerCase()
		.replace(/[.,;:!?()"']/g, '')
		.replace(/-/g, '');
	return normalized.length > 0 ? normalized : null;
}

/**
 * The MiniSearch tokenizer function.
 * Splits on whitespace and punctuation, removes bracket markers.
 */
export function searchTokenizer(text: string): string[] {
	if (!text) return [];
	return foldLigatures(text)
		.replace(/\[[\d]+\]/g, '')
		.split(/[\s.,;:!?()"']+/)
		.filter((w) => w.length > 0);
}
