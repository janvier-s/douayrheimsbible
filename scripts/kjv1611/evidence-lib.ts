// Pure helpers for reading long-s evidence out of Tesseract output.

/** Comparison folding only: OCR reads ſ as f or l, so those fold to s; u/v and i/j as in normalizeWord. */
export function foldCompare(w: string): string {
	return w
		.toLowerCase()
		.replace(/[^a-zſ]/g, '')
		.replace(/[ſfl]/g, 's')
		.replace(/v/g, 'u')
		.replace(/j/g, 'i');
}

export type SVerdict = { index: number; verdict: 'long' | 'round' };

/**
 * For each lowercase s in `raw` (a verse word, ſ already folded to s), what the OCR word shows at
 * that position. Returns [] unless the two words have the same letters in the same places.
 */
export function sVerdicts(raw: string, ocrWord: string): SVerdict[] {
	const ocr = ocrWord.replace(/^[^A-Za-zſ]+|[^A-Za-zſ]+$/g, '');
	const want = raw.replace(/[^A-Za-zſ]/g, '');
	if (!want || want.length !== ocr.length || /[^A-Za-zſ]/.test(ocr)) return [];
	if (want !== raw.replace(/^[^A-Za-zſ]+|[^A-Za-zſ]+$/g, '')) return []; // inner punctuation
	const out: SVerdict[] = [];
	for (let i = 0; i < want.length; i++) {
		const r = want[i];
		const o = ocr[i];
		if (r === 's') {
			if (o === 's') out.push({ index: i, verdict: 'round' });
			else if (o === 'f' || o === 'l' || o === 'ſ') out.push({ index: i, verdict: 'long' });
			else return [];
		} else if (foldCompare(r) !== foldCompare(o)) return [];
	}
	return out;
}

/**
 * Banded longest-common-subsequence alignment of two key sequences.
 * Returns, for each a[i], the index in b it is matched to, or -1.
 * Only cells within `band` of the diagonal i·m/n are considered.
 */
export function alignBanded(a: string[], b: string[], band: number): Int32Array {
	const n = a.length;
	const m = b.length;
	const out = new Int32Array(n).fill(-1);
	if (!n || !m) return out;
	const W = 2 * band + 1;
	const lo = (i: number) => Math.round((i * m) / n) - band;
	const NEG = -1e9;
	const dp = Array.from({ length: n + 1 }, () => new Int32Array(W).fill(NEG));
	const dir = Array.from({ length: n + 1 }, () => new Int8Array(W));
	const get = (i: number, j: number) => {
		const k = j - lo(i);
		return j < 0 || j > m || k < 0 || k >= W ? NEG : dp[i][k];
	};
	for (let i = 0; i <= n; i++) {
		for (let k = 0; k < W; k++) {
			const j = lo(i) + k;
			if (j < 0 || j > m) continue;
			if (i === 0 || j === 0) {
				dp[i][k] = 0;
				dir[i][k] = i === 0 ? 2 : 1;
				continue;
			}
			let best = NEG;
			let d = 0;
			if (a[i - 1] === b[j - 1]) {
				const v = get(i - 1, j - 1) + 1;
				if (v > best) ((best = v), (d = 0));
			}
			const up = get(i - 1, j);
			if (up > best) ((best = up), (d = 1));
			const left = get(i, j - 1);
			if (left > best) ((best = left), (d = 2));
			dp[i][k] = best;
			dir[i][k] = d;
		}
	}
	let i = n;
	let j = Math.min(m, Math.max(0, lo(n) + W - 1));
	if (get(n, j) <= NEG / 2) j = m;
	while (i > 0 && j > 0) {
		const k = j - lo(i);
		if (k < 0 || k >= W) break;
		const d = dir[i][k];
		if (d === 0) {
			out[i - 1] = j - 1;
			i--;
			j--;
		} else if (d === 1) i--;
		else j--;
	}
	return out;
}
