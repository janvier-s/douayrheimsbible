/**
 * Shared text normalization for the ODR text search index.
 * Used by both the build-time indexer and the client-side query engine.
 */

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
	return text
		.toLowerCase()
		.replace(/\[[\d]+\]/g, '') // remove bracket markers [1], [2], etc.
		.replace(/[.,;:!?()"']/g, ' ') // punctuation to spaces
		.split(/\s+/)
		.map((w) => w.replace(/-/g, '')) // strip hyphens: to-day → today
		.filter((w) => w.length > 0);
}

/** The MiniSearch processTerm function. Returns null for empty tokens. */
export function processTerm(term: string): string | null {
	const normalized = term
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
	return text
		.replace(/\[[\d]+\]/g, '')
		.split(/[\s.,;:!?()"']+/)
		.filter((w) => w.length > 0);
}
