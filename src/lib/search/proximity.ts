import { stripHtml, foldLigatures } from './normalize';

/**
 * Check if query tokens appear consecutively in text (phrase match).
 * Returns a proximity score: lower = better (0 = exact phrase match).
 * Returns Infinity if tokens don't all appear.
 */
export function phraseProximity(text: string, queryTokens: string[]): number {
	if (queryTokens.length <= 1) return 0;

	const stripped = foldLigatures(stripHtml(text).toLowerCase());
	const words = stripped.match(/[a-z]+(?:-[a-z]+)*/g);
	if (!words) return Infinity;

	// Normalize words the same way as tokenizer (strip hyphens)
	const normalized = words.map((w) => w.replace(/-/g, ''));

	// Find all positions of each query token
	const positions: number[][] = queryTokens.map((token) => {
		const pos: number[] = [];
		for (let i = 0; i < normalized.length; i++) {
			if (normalized[i] === token) pos.push(i);
		}
		return pos;
	});

	// If any token is missing, no proximity
	if (positions.some((p) => p.length === 0)) return Infinity;

	// Find the minimum span covering all query tokens in order
	let bestSpan = Infinity;
	for (const startPos of positions[0]) {
		let pos = startPos;
		let valid = true;
		for (let t = 1; t < positions.length; t++) {
			// Find the next occurrence of token t after current position
			const nextPos = positions[t].find((p) => p > pos);
			if (nextPos === undefined) {
				valid = false;
				break;
			}
			pos = nextPos;
		}
		if (valid) {
			const span = pos - startPos;
			if (span < bestSpan) bestSpan = span;
		}
	}

	return bestSpan;
}
