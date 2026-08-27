// scripts/odr-lemma-lib.ts
// Pure helpers for anchoring each Rheims annotation catchword to a span of the
// verse it annotates. No fs, no side effects, so tests import this without
// running a build (the same reason glossa-lib.ts lives apart from its script).
//
// The Glossa build verifies its catchwords the same way (see extractLemma in
// glossa-lib.ts), but the two corpora differ in what they demand. A Glossa
// lemma is Latin quoted verbatim and never spans markup. A Rheims title is
// English, quotes loosely, and lands inside <sc> and <i> often enough that the
// resolved span has to be nudged back out to a tag boundary before it can be
// wrapped.

/** How confidently a title was anchored. Recorded so the report can show what
 *  each tier is carrying and a regression in one is visible on its own. */
export type MatchTier = 'exact' | 'gapped' | 'despaced' | 'fuzzy' | 'partial';

export interface LemmaSpan {
	/** Index into the raw verse text, markup included. */
	start: number;
	/** Length in raw characters, markup included. */
	length: number;
	tier: MatchTier;
}

/** Markers, not words: these carry a footnote or cross-reference label and are
 *  never part of the quoted phrase, so their content goes with the tag. */
const MARKER_TAGS = /<(cr|na|mn)>[\s\S]*?<\/\1>/g;
const ANY_TAG = /<\/?[^<>]*>/g;

/** Strips markup, keeping a map from each surviving character back to its index
 *  in the raw text, so a span found in the plain text can be reported in raw
 *  coordinates. */
export function stripMarkup(raw: string): { plain: string; map: number[] } {
	const plain: string[] = [];
	const map: number[] = [];
	let i = 0;
	while (i < raw.length) {
		if (raw[i] === '<') {
			MARKER_TAGS.lastIndex = 0;
			const marker = new RegExp(MARKER_TAGS.source).exec(raw.slice(i));
			if (marker && marker.index === 0) {
				i += marker[0].length;
				continue;
			}
			const tag = new RegExp(ANY_TAG.source).exec(raw.slice(i));
			if (tag && tag.index === 0) {
				i += tag[0].length;
				continue;
			}
		}
		plain.push(raw[i]);
		map.push(i);
		i++;
	}
	return { plain: plain.join(''), map };
}

/** Folds the orthography that separates a catchword from the verse it quotes:
 *  case, diacritics, æ/œ, the ampersand the 1582 text sets for "and", and all
 *  punctuation. Keeps a map back to the input, so a match in normalised space
 *  can be placed in the text it came from. */
export function normalize(text: string): { norm: string; map: number[] } {
	const norm: string[] = [];
	const map: number[] = [];
	const push = (ch: string, at: number) => {
		if (ch === ' ') {
			if (norm.length === 0 || norm[norm.length - 1] === ' ') return;
		}
		norm.push(ch);
		map.push(at);
	};
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === '&') {
			// "&c." is an abbreviation, not a conjunction; the caller has already
			// trimmed it from titles, and in verse text it never opens a catchword.
			for (const c of ' and ') push(c, i);
			continue;
		}
		const folded = ch
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/æ/g, 'ae')
			.replace(/œ/g, 'oe');
		for (const c of folded) {
			push(/[a-z0-9]/.test(c) ? c : ' ', i);
		}
	}
	// Leading space would shift every index by one for no gain
	while (norm.length && norm[0] === ' ') {
		norm.shift();
		map.shift();
	}
	while (norm.length && norm[norm.length - 1] === ' ') {
		norm.pop();
		map.pop();
	}
	return { norm: norm.join(''), map };
}

const NUMERALS: Record<string, string> = {
	'1': 'one',
	'2': 'two',
	'3': 'three',
	'4': 'four',
	'5': 'five',
	'6': 'six',
	'7': 'seven',
	'8': 'eight',
	'9': 'nine',
	'10': 'ten',
	'12': 'twelve'
};

/** The forms of a title worth looking for, most literal first.
 *
 *  A title is not always one phrase. Some quote two separate places numbered as
 *  they go ("Whose sins are covered. 2. not imputed.", "22. My body, 24. My
 *  blood."), and some spell a number the verse sets as a figure. The numbers are
 *  the printed margin talking, not part of any catchword, so they are stripped
 *  from the front of each piece as well as used to cut between them. */
export function catchwordVariants(title: string): string[] {
	const out: string[] = [];
	const trim = (s: string) =>
		s
			.trim()
			.replace(/\s*&c\.?\s*$/, '')
			.replace(/\s*[.,;:?!]+\s*$/, '')
			.trim();

	for (const part of trim(title).split(/[.,]\s*\d+\.\s*/)) {
		const cleaned = trim(part.replace(/^\s*\d+\.\s*/, ''));
		if (!cleaned) continue;
		const { norm } = normalize(cleaned);
		if (!norm) continue;
		out.push(norm);
		const tokens = norm.split(' ');
		if (tokens.some((t) => t in NUMERALS)) {
			out.push(tokens.map((t) => NUMERALS[t] ?? t).join(' '));
		}
	}
	return out;
}

/** Ratio of the longest common subsequence to the longer string, the same
 *  measure difflib uses. Only ever asked about two single words. */
function similarity(a: string, b: string): number {
	const rows: number[][] = Array.from({ length: a.length + 1 }, () =>
		new Array(b.length + 1).fill(0)
	);
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			rows[i][j] =
				a[i - 1] === b[j - 1] ? rows[i - 1][j - 1] + 1 : Math.max(rows[i - 1][j], rows[i][j - 1]);
		}
	}
	return (2 * rows[a.length][b.length]) / (a.length + b.length);
}

/** Whether two words are the same word under 1582 spelling. Short words must
 *  match outright: at three letters or fewer the measure stops discriminating
 *  ("him" against "his"), and a wrong hit there would move the whole span. */
/** The Rheims titles quote in whatever person the sentence around them wants,
 *  so "Judge your-selves." heads a verse reading "did judge ourselves", and
 *  "Your obedience." one reading "our obedience". Treating the possessives as
 *  one word and the reflexives as another keeps that shift from reading as a
 *  different quotation. */
const PERSON: Array<Set<string>> = [
	new Set(['my', 'thy', 'thine', 'his', 'her', 'its', 'our', 'your', 'their']),
	new Set([
		'self',
		'selves',
		'myself',
		'thyself',
		'himself',
		'herself',
		'itself',
		'ourselves',
		'yourselves',
		'themselves'
	])
];

/** Words the annotator and the verse render differently, where no measure of
 *  spelling will ever join them because they are two words rather than two
 *  spellings. Editorial, so each one is listed and each one is a judgement:
 *  "Hung himself." heads a verse reading "hanged himself", and the annotation
 *  under it is about Judas hanging himself and nothing else. Add a pair here
 *  only when the annotation itself settles what the catchword points at. */
const EQUIVALENT: Array<Set<string>> = [new Set(['hung', 'hanged'])];

function sameWord(a: string, b: string): boolean {
	if (a === b) return true;
	if (PERSON.some((set) => set.has(a) && set.has(b))) return true;
	if (EQUIVALENT.some((set) => set.has(a) && set.has(b))) return true;
	if (a.length <= 3 || b.length <= 3) return false;
	if (a[0] !== b[0]) return false;
	if (similarity(a, b) >= 0.8) return true;
	// Two long words that agree on their opening are the same word spelled two
	// ways often enough in this corpus to be worth taking: "wrapt"/"wrapped",
	// "middes"/"midst". The shared opening is what keeps the measure honest at
	// this threshold.
	return (
		a.length >= 5 && b.length >= 5 && a.slice(0, 3) === b.slice(0, 3) && similarity(a, b) >= 0.65
	);
}

/** Maximum number of verse words a quoted phrase may skip over. The Rheims
 *  titles abbreviate as they quote: "Of the tree eat thou not." leaves out the
 *  six words of "of the tree of knowledge of good and evil eat thou not".
 *
 *  Six is where the corpus stops rewarding a wider window. At seven the match
 *  for Hebrews 7:19 "The introduction." stretches across "the law brought
 *  nothing to perfection but an introduction", and at eight John 3:18
 *  "Is judged already." spans "is not judged but he that doth not believe is
 *  already", which tints a negation the catchword does not quote. */
const MAX_GAP = 6;

/** Smallest window of verse tokens containing the catchword's tokens in order. */
function alignTokens(
	catchword: string[],
	tokens: string[],
	equal: (a: string, b: string) => boolean
): [number, number] | null {
	let best: [number, number] | null = null;
	for (let start = 0; start < tokens.length; start++) {
		if (!equal(catchword[0], tokens[start])) continue;
		let k = 0;
		let i = start;
		while (i < tokens.length && k < catchword.length) {
			if (equal(catchword[k], tokens[i])) k++;
			i++;
		}
		if (k < catchword.length) continue;
		const gap = i - start - catchword.length;
		if (gap > MAX_GAP) continue;
		if (!best || i - 1 - start < best[1] - best[0]) best = [start, i - 1];
	}
	return best;
}

/** Token spans of the normalised text, so a token-level match can be converted
 *  back to character offsets. */
function tokenOffsets(norm: string): Array<[number, number]> {
	const spans: Array<[number, number]> = [];
	const re = /[^ ]+/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(norm))) spans.push([m.index, m.index + m[0].length - 1]);
	return spans;
}

/** Whether every tag inside the slice opens and closes within it. */
function balanced(slice: string): boolean {
	let depth = 0;
	const re = /<(\/?)[a-zA-Z][^<>]*>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(slice))) {
		depth += m[1] ? -1 : 1;
		if (depth < 0) return false;
	}
	return depth === 0;
}

/** Widens a span until the markup inside it balances.
 *
 *  A catchword regularly starts or ends inside a one-word element, as in
 *  "Come Lord <sc>Jesus</sc>" for the title "Come Lord Jesus." Pushing the edge
 *  out to the element boundary keeps the highlight wrappable in one <mark> and
 *  tints exactly the same words. */
export function snapToBalance(raw: string, start: number, end: number): [number, number] {
	let s = start;
	let e = end;
	for (let guard = 0; guard < 8 && !balanced(raw.slice(s, e + 1)); guard++) {
		const left = raw.lastIndexOf('<', s);
		const right = raw.indexOf('>', e);
		if (left >= 0 && balanced(raw.slice(left, e + 1))) {
			s = left;
			continue;
		}
		if (right >= 0 && balanced(raw.slice(s, right + 1))) {
			e = right;
			continue;
		}
		if (left < 0 && right < 0) break;
		if (left >= 0) s = left;
		if (right >= 0) e = right;
	}
	return [s, e];
}

/** Anchors a catchword in the verse it annotates, or returns null rather than
 *  guess. Four tiers, tried in order, each looser than the last:
 *
 *  - exact:    the phrase is in the verse as written
 *  - gapped:   the phrase quotes the verse but skips a word or four
 *  - despaced: the two differ only in where a space or hyphen falls
 *  - fuzzy:    a word is spelled differently ("battail" for "battle")
 *
 *  The returned span covers the whole quotation including any words it skipped,
 *  which is what a reader expects a quotation to underline. */
export function resolveLemma(title: string, verseText: string): LemmaSpan | null {
	const variants = catchwordVariants(title);
	if (variants.length === 0) return null;

	const { plain, map: plainMap } = stripMarkup(verseText);
	const { norm, map: normMap } = normalize(plain);
	if (!norm) return null;

	const toRaw = (from: number, to: number, tier: MatchTier): LemmaSpan => {
		const rawStart = plainMap[normMap[from]];
		const rawEnd = plainMap[normMap[to]];
		const [s, e] = snapToBalance(verseText, rawStart, rawEnd);
		return { start: s, length: e - s + 1, tier };
	};

	for (const variant of variants) {
		const at = norm.indexOf(variant);
		if (at >= 0) return toRaw(at, at + variant.length - 1, 'exact');
	}

	const tokens = norm.split(' ');
	const offsets = tokenOffsets(norm);

	for (const variant of variants) {
		const catchword = variant.split(' ');
		if (catchword.length < 2) continue;
		const span = alignTokens(catchword, tokens, (a, b) => a === b);
		if (span) return toRaw(offsets[span[0]][0], offsets[span[1]][1], 'gapped');
	}

	const squeezed = norm.replace(/ /g, '');
	for (const variant of variants) {
		const at = squeezed.indexOf(variant.replace(/ /g, ''));
		if (at < 0) continue;
		// Walk the squeezed offset back to a normalised one
		let seen = 0;
		let from = -1;
		let to = -1;
		for (let i = 0; i < norm.length; i++) {
			if (norm[i] === ' ') continue;
			if (seen === at) from = i;
			if (seen === at + variant.replace(/ /g, '').length - 1) to = i;
			seen++;
		}
		if (from >= 0 && to >= from) return toRaw(from, to, 'despaced');
	}

	for (const variant of variants) {
		const span = alignTokens(variant.split(' '), tokens, sameWord);
		if (span) return toRaw(offsets[span[0]][0], offsets[span[1]][1], 'fuzzy');
	}

	return null;
}

/** Words that carry no quotation on their own. A catchword is placed by the
 *  words it names, not by the articles and prepositions between them, so these
 *  never count as evidence and never set the edge of a span. */
const STOP = new Set(
	(
		'a an the of and to in is are be was were that this these those it its his her their ' +
		'our your my i mine thee thou thy ye you he she they them him us we for with not no as ' +
		'at by on from shall will did do doth hath have hast so also but or than then when where ' +
		'which who whom what all any some there here into unto upon'
	).split(' ')
);

interface Partial {
	chain: Array<[number, number]>;
	/** Tokens the alignment matched before the span was tidied. */
	evidence: number;
	start: number;
	end: number;
	/** Distinct content words of the title found anywhere inside the span. */
	covered: number;
}

/** Best partial alignment of a catchword against a verse.
 *
 *  Unlike the strict tiers this one may leave title words unmatched, so the
 *  question stops being "does the phrase fit" and becomes "which stretch of the
 *  verse is the annotator pointing at". Candidates are ranked by how much of the
 *  catchword the span accounts for rather than by how many words happen to line
 *  up in order, which is what keeps "Is judged already." off the negation in the
 *  first half of John 3:18 and on "is already judged" in the second. */
function alignPartial(catchword: string[], tokens: string[], maxGap = MAX_GAP): Partial | null {
	const pairs: Array<[number, number]> = [];
	for (let j = 0; j < tokens.length; j++)
		for (let i = 0; i < catchword.length; i++)
			if (sameWord(catchword[i], tokens[j])) pairs.push([i, j]);
	if (!pairs.length) return null;
	pairs.sort((a, b) => a[1] - b[1] || a[0] - b[0]);

	const dp = pairs.map(() => 1);
	const prev = pairs.map(() => -1);
	for (let k = 0; k < pairs.length; k++)
		for (let m = 0; m < k; m++) {
			const [im, jm] = pairs[m];
			const [ik, jk] = pairs[k];
			if (im >= ik || jm >= jk) continue;
			if (jk - jm - 1 > maxGap) continue;
			// Among chains of equal length keep the one that starts latest: a
			// leading stopword picked up far to the left only widens the span.
			if (dp[m] + 1 > dp[k] || (dp[m] + 1 === dp[k] && prev[k] >= 0 && jm > pairs[prev[k]][1])) {
				dp[k] = dp[m] + 1;
				prev[k] = m;
			}
		}

	const contentWords = [...new Set(catchword.filter((t) => !STOP.has(t)))];
	let best: Partial | null = null;
	for (let k = 0; k < pairs.length; k++) {
		let chain: Array<[number, number]> = [];
		for (let e = k; e >= 0; e = prev[e]) chain.unshift(pairs[e]);
		const evidence = chain.length;

		// A matched stopword sitting several words away from the rest of the
		// quotation is a coincidence, not part of it; letting it set the edge
		// stretches the tint over words the catchword never quoted.
		while (chain.length > 1 && STOP.has(catchword[chain[0][0]]) && chain[1][1] - chain[0][1] > 3)
			chain = chain.slice(1);
		// And a quotation ends on the last word it actually quotes. Ending on a
		// matched preposition leaves the tint hanging in front of the word the
		// catchword got wrong ("penance in" before "hair-cloth").
		while (chain.length > 1 && STOP.has(catchword[chain[chain.length - 1][0]]))
			chain = chain.slice(0, -1);

		const start = chain[0][1];
		const end = chain[chain.length - 1][1];
		const window = tokens.slice(start, end + 1);
		const cand: Partial = {
			chain,
			evidence,
			start,
			end,
			covered: contentWords.filter((w) => window.some((t) => sameWord(w, t))).length
		};
		const rank = (c: Partial) => [c.covered, c.evidence, c.chain.length, -c.start, c.start - c.end];
		if (!best) {
			best = cand;
			continue;
		}
		const x = rank(cand);
		const y = rank(best);
		for (let n = 0; n < x.length; n++) {
			if (x[n] === y[n]) continue;
			if (x[n] > y[n]) best = cand;
			break;
		}
	}
	return best;
}

/** Anchors a catchword that none of the strict tiers would take, by finding the
 *  stretch of verse it points at rather than the phrase it reproduces.
 *
 *  Roughly one title in twenty paraphrases instead of quoting: it swaps a
 *  pronoun, reorders a clause, keeps the sense and drops a word, or names the
 *  items of a list the verse spells out. Those are still pointing at a definite
 *  place in the verse, and a reader looking for the annotated phrase is better
 *  served by a tint over the right clause than by no tint at all.
 *
 *  Call this only after the strict tiers and after checking the neighbouring
 *  verses. A loose match against the stated verse must never get in the way of
 *  an exact match against the verse next door, which is the stronger evidence
 *  that the annotation is attached to the wrong one. */
export function resolvePartialLemma(title: string, verseText: string): LemmaSpan | null {
	const variants = catchwordVariants(title);
	if (variants.length === 0) return null;

	const { plain, map: plainMap } = stripMarkup(verseText);
	const { norm, map: normMap } = normalize(plain);
	if (!norm) return null;

	const tokens = norm.split(' ');
	const offsets = tokenOffsets(norm);

	let best: { r: Partial; covered: number; start: number; chain: number } | null = null;
	for (const variant of variants) {
		const catchword = variant.split(' ');
		let r = alignPartial(catchword, tokens);
		if (!r) continue;

		// A title that lists what the verse spells out ("The residue of the eruke,
		// locust, bruke, blast.") skips far more than a quotation ever does. When
		// every word it names turns up in the verse in order, and only the wider
		// window reaches them all, the list itself bounds the span and the gap
		// limit has nothing left to protect against.
		const listed = [...new Set(catchword.filter((t) => !STOP.has(t)))];
		if (listed.length >= 2) {
			const wide = alignPartial(catchword, tokens, tokens.length);
			const covers = (c: Partial) =>
				listed.filter((w) => tokens.slice(c.start, c.end + 1).some((t) => sameWord(w, t))).length;
			if (wide && covers(wide) === listed.length && covers(wide) > covers(r)) r = wide;
		}

		const contentTotal = listed.length;
		const enough =
			r.covered >= 1 &&
			r.evidence / catchword.length >= 0.5 &&
			// One word is enough to place a catchword only when it is the whole of
			// what the catchword names and long enough to be its own evidence.
			(r.evidence >= 2 ||
				(r.covered === contentTotal && catchword.some((t) => !STOP.has(t) && t.length >= 5))) &&
			(contentTotal === 0 || r.covered / contentTotal >= 0.5);
		if (!enough) continue;

		const cand = { r, covered: r.covered, start: r.start, chain: r.chain.length };
		if (
			!best ||
			cand.covered > best.covered ||
			(cand.covered === best.covered &&
				(cand.chain > best.chain || (cand.chain === best.chain && cand.start < best.start)))
		)
			best = cand;
	}
	if (!best) return null;

	const rawStart = plainMap[normMap[offsets[best.r.start][0]]];
	const rawEnd = plainMap[normMap[offsets[best.r.end][1]]];
	const [s, e] = snapToBalance(verseText, rawStart, rawEnd);
	return { start: s, length: e - s + 1, tier: 'partial' };
}
