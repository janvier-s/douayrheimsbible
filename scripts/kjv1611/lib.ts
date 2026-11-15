// Pure text functions for the KJV 1611 original-spelling build.

export const LONG_S = 'ſ';
export const THE_ABBR = 'yͤ'; // y + combining small e
export const THAT_ABBR = 'yͭ'; // y + combining small t

export type Token = { raw: string; start: number; end: number; key: string };
export type ClusterPolicy = Partial<Record<'f' | 'h' | 'k' | 'b', 'long' | 'round'>>;

/** Letter folding only: lowercase, no tags/punctuation, ſ→s, v→u, j→i, no combining abbreviation marks. */
export function normalizeWord(w: string): string {
	return w
		.replace(/<[^>]*>/g, '')
		.replace(/[ͤͭ]/g, '')
		.toLowerCase()
		.replace(/ſ/g, 's')
		.replace(/v/g, 'u')
		.replace(/j/g, 'i')
		.replace(/[^a-z]/g, '');
}

const WORD_RE = /<[^>]*>|[A-Za-zſͤͭ'’]+/g;

/** Words of a verse with offsets into `text`; tags are skipped, never tokenized. */
export function tokenize(text: string): Token[] {
	const out: Token[] = [];
	for (const m of text.matchAll(WORD_RE)) {
		if (m[0].startsWith('<')) continue;
		const start = m.index!;
		out.push({ raw: m[0], start, end: start + m[0].length, key: normalizeWord(m[0]) });
	}
	return out;
}

const isLetter = (c: string | undefined) => !!c && /[A-Za-zſ]/.test(c);

/**
 * Lowercase non-final s → ſ. Final = the next visible character (tags skipped) is not a letter.
 * s before f/h/k/b follows `policy` (undecided = round); `overrides` (offset of the s) wins.
 */
export function applyLongS(
	text: string,
	policy: ClusterPolicy,
	overrides?: Map<number, 'long' | 'round'>
): string {
	let out = '';
	let i = 0;
	while (i < text.length) {
		const c = text[i];
		if (c === '<') {
			const j = text.indexOf('>', i);
			const end = j < 0 ? text.length : j + 1;
			out += text.slice(i, end);
			i = end;
			continue;
		}
		if (c !== 's') {
			out += c;
			i++;
			continue;
		}
		// next visible character
		let k = i + 1;
		while (text[k] === '<') {
			const j = text.indexOf('>', k);
			if (j < 0) break;
			k = j + 1;
		}
		const next = text[k];
		let long: boolean;
		if (!isLetter(next)) long = false;
		else if (next === 'f' || next === 'h' || next === 'k' || next === 'b') {
			long = policy[next] === 'long';
		} else long = true;
		const ov = overrides?.get(i);
		if (ov && isLetter(next)) long = ov === 'long';
		out += long ? LONG_S : 's';
		i++;
	}
	return out;
}

type WTok = { key: string; thorn: boolean };

function witnessTokens(witness: string): WTok[] {
	const out: WTok[] = [];
	for (const m of witness.matchAll(/&thorn;|<[^>]*>|[A-Za-zſ'’]+/g)) {
		if (m[0].startsWith('<')) continue;
		if (m[0] === '&thorn;') out.push({ key: '', thorn: true });
		else out.push({ key: normalizeWord(m[0]), thorn: false });
	}
	return out;
}

/**
 * Put yͤ where the witness has &thorn; (aligned to a base "ye"), and yͭ for every base "yt"
 * (aruljohn writes &thorn; for both the and that, so a thorn may also align to a "yt").
 * Anchors are the non-thorn words that match in order (LCS); each thorn takes the next unused
 * "ye" in the base gap between its neighbouring anchors.
 */
export function placeAbbreviations(
	base: string,
	witness: string
): { text: string; placed: number; unplaced: number } {
	const bt = tokenize(base);
	const wt = witnessTokens(witness);
	const wWords = wt.map((t, i) => ({ t, i })).filter((x) => !x.t.thorn);
	const n = bt.length;
	const m = wWords.length;
	// LCS over base × witness words
	const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] =
				bt[i].key === wWords[j].t.key ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}
	// anchor map: witness word index (in wt) → base token index
	const anchor = new Map<number, number>();
	{
		let i = 0;
		let j = 0;
		while (i < n && j < m) {
			if (bt[i].key === wWords[j].t.key) {
				anchor.set(wWords[j].i, i);
				i++;
				j++;
			} else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
			else j++;
		}
	}
	const replace = new Map<number, string>();
	let placed = 0;
	let unplaced = 0;
	let prevBase = -1; // base index of previous anchor
	let wi = 0;
	while (wi < wt.length) {
		if (!wt[wi].thorn) {
			if (anchor.has(wi)) prevBase = anchor.get(wi)!;
			wi++;
			continue;
		}
		// run of thorns up to the next anchor
		let nextBase = n;
		for (let k = wi; k < wt.length; k++) {
			if (!wt[k].thorn && anchor.has(k)) {
				nextBase = anchor.get(k)!;
				break;
			}
		}
		const cands: number[] = [];
		for (let b = prevBase + 1; b < nextBase; b++) {
			if ((bt[b].key === 'ye' || bt[b].key === 'yt') && !replace.has(b)) cands.push(b);
		}
		let ci = 0;
		while (wi < wt.length && (wt[wi].thorn || !anchor.has(wi))) {
			if (wt[wi].thorn) {
				if (ci < cands.length) {
					const cb = cands[ci++];
					replace.set(cb, bt[cb].key === 'yt' ? THAT_ABBR : THE_ABBR);
					placed++;
				} else unplaced++;
			}
			wi++;
		}
	}
	for (let b = 0; b < n; b++) {
		if (bt[b].raw === 'yt' || bt[b].raw === 'Yt') replace.set(b, bt[b].raw[0] + 'ͭ');
	}
	let text = '';
	let pos = 0;
	for (let b = 0; b < n; b++) {
		const r = replace.get(b);
		if (r === undefined) continue;
		const raw = bt[b].raw;
		const rep = r === THE_ABBR && raw[0] === 'Y' ? 'Yͤ' : r;
		text += base.slice(pos, bt[b].start) + rep;
		pos = bt[b].end;
	}
	text += base.slice(pos);
	return { text, placed, unplaced };
}

type VT = { verse: number; text: string };

function keySet(t: string): Set<string> {
	return new Set(
		tokenize(t)
			.map((x) => x.key)
			.filter(Boolean)
	);
}

function jaccard(a: Set<string>, b: Set<string>): number {
	if (!a.size || !b.size) return 0;
	let inter = 0;
	for (const x of a) if (b.has(x)) inter++;
	return inter / (a.size + b.size - inter);
}

/** target verse → src verse, monotonic, by word-set similarity (≥ 0.3 to match). */
export function alignVerses(src: VT[], target: VT[]): Map<number, number> {
	const S = src.map((v) => keySet(v.text));
	const T = target.map((v) => keySet(v.text));
	const n = S.length;
	const m = T.length;
	const sim = (i: number, j: number) => {
		const s = jaccard(S[i], T[j]);
		return s >= 0.3 ? s : 0;
	};
	const dp: Float64Array[] = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			let best = Math.max(dp[i + 1][j], dp[i][j + 1]);
			const s = sim(i, j);
			if (s > 0) best = Math.max(best, dp[i + 1][j + 1] + s);
			dp[i][j] = best;
		}
	}
	const out = new Map<number, number>();
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		const s = sim(i, j);
		if (s > 0 && Math.abs(dp[i][j] - (dp[i + 1][j + 1] + s)) < 1e-9) {
			out.set(target[j].verse, src[i].verse);
			i++;
			j++;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
		else j++;
	}
	return out;
}
