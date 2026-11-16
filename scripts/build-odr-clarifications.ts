/**
 * Anchors Sancta Clara Press "clarifications" (CC BY 4.0) into our ODR verse text.
 *
 * Input : ../sancta-scrape/data/<book>/<n>.json  (verses[].clarifications [{term, latin, gloss}])
 *         static/data/odr/<book>.json            (modernized text, what the reader shows)
 *         static/data/odr-original/<book>.json   (original spelling, used as a fallback)
 * Output: static/data/odr-clarifications/<book>.json  {chapter: {verse: [{term, latin, gloss, occurrence}]}}
 *         analysis/clarifications-unanchored.csv      everything that could not be anchored (not shipped)
 *
 * Anchoring order, per clarification:
 *   exact   term found as whole words in our modern verse text
 *   orig    term found in our original-spelling verse; positions carried over to the modern verse
 *           when both have the same word count
 *   fuzzy   first or last word of the term matches one of our words within a small edit distance
 * `term` in the output is the exact surface string in our modern text.
 *
 * Run: npx tsx scripts/build-odr-clarifications.ts
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { visibleText, findTermMatches, type Clarification } from '../src/lib/utils/clarifications';

const ROOT = process.cwd();
const SANCTA = join(ROOT, '../sancta-scrape/data');
const ODR = join(ROOT, 'static/data/odr');
const ORIG = join(ROOT, 'static/data/odr-original');
const OUT = join(ROOT, 'static/data/odr-clarifications');
const REPORT = join(ROOT, 'analysis/clarifications-unanchored.csv');

const SLUG_TO_SANCTA: Record<string, string> = {
	isaie: 'isaias',
	jeremie: 'jeremias',
	malachie: 'malachias'
};

type Verse = { verse: number; text: string };
type Book = { chapters?: { chapter: number; verses: Verse[] }[] };
type Raw = { term: string; latin: string; gloss: string };
type Method = 'exact' | 'orig' | 'fuzzy';

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;

interface Tok {
	w: string; // lowercased
	start: number;
	end: number;
}
function tokenize(s: string): Tok[] {
	const out: Tok[] = [];
	for (const m of s.matchAll(/[\p{L}\p{N}]+/gu)) {
		out.push({ w: m[0].toLowerCase(), start: m.index!, end: m.index! + m[0].length });
	}
	return out;
}

function lev(a: string, b: string): number {
	const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
	for (let i = 1; i <= a.length; i++) {
		let prev = dp[0];
		dp[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const tmp = dp[j];
			dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
			prev = tmp;
		}
	}
	return dp[b.length];
}

function similar(a: string, b: string): boolean {
	if (a === b) return true;
	if (Math.min(a.length, b.length) < 4) return false;
	const d = lev(a, b);
	if (d <= (a.length > 6 ? 2 : 1)) return true;
	let p = 0;
	while (p < a.length && p < b.length && a[p] === b[p]) p++;
	return p >= 5 && p >= Math.min(a.length, b.length) - 2;
}

interface Anchor {
	term: string;
	start: number;
	method: Method;
}

/** Position of `phrase` (as token indices) in the Sancta text, to carry over to ours. */
function tokenSpan(text: string, term: string): [number, number] | null {
	const hit = findTermMatches(text, term)[0];
	if (!hit) return null;
	const toks = tokenize(text);
	const a = toks.findIndex((t) => t.start >= hit.start);
	let b = a;
	while (b + 1 < toks.length && toks[b + 1].start < hit.end) b++;
	return a < 0 ? null : [a, b];
}

function anchorOne(
	raw: Raw,
	modern: string,
	original: string | null,
	sanctaModern: string,
	sanctaOriginal: string
): Anchor | null {
	// 1. exact
	const ex = findTermMatches(modern, raw.term);
	if (ex.length)
		return { term: modern.slice(ex[0].start, ex[0].end), start: ex[0].start, method: 'exact' };

	// 2. original spelling of ours; carry token positions over to the modern text
	if (original !== null) {
		const span = tokenSpan(sanctaModern, raw.term);
		const sOrig = tokenize(sanctaOriginal);
		let origTerm: string | null = null;
		if (span && sOrig.length === tokenize(sanctaModern).length) {
			origTerm = sanctaOriginal.slice(sOrig[span[0]].start, sOrig[span[1]].end);
		}
		for (const cand of [raw.term, origTerm]) {
			if (!cand) continue;
			const hit = findTermMatches(original, cand)[0];
			if (!hit) continue;
			const oT = tokenize(original);
			const mT = tokenize(modern);
			if (oT.length !== mT.length) continue;
			const a = oT.findIndex((t) => t.start >= hit.start);
			let b = a;
			while (b + 1 < oT.length && oT[b + 1].start < hit.end) b++;
			if (a < 0) continue;
			const s = mT[a].start;
			return { term: modern.slice(s, mT[b].end), start: s, method: 'orig' };
		}
	}

	// 3. fuzzy on the first or last word of the term
	const words = tokenize(raw.term).map((t) => t.w);
	const mT = tokenize(modern);
	const tries = [...new Set([words[0], words[words.length - 1]])].filter((w) => w && w.length >= 4);
	for (const w of tries) {
		const cands = mT.filter((t) => similar(w, t.w));
		if (cands.length) {
			const c = cands[0];
			return { term: modern.slice(c.start, c.end), start: c.start, method: 'fuzzy' };
		}
	}
	return null;
}

function csv(s: string): string {
	return `"${s.replace(/"/g, '""')}"`;
}

function main() {
	const slugs = readdirSync(ODR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => f.slice(0, -5))
		.filter((s) => {
			try {
				return !!readJson<Book>(join(ODR, `${s}.json`)).chapters;
			} catch {
				return false;
			}
		});
	mkdirSync(OUT, { recursive: true });
	mkdirSync(join(ROOT, 'analysis'), { recursive: true });

	const unanchored: string[] = ['book,chapter,verse,term,latin,gloss,reason,our_verse'];
	const counts: Record<Method | 'unanchored' | 'total', number> = {
		exact: 0,
		orig: 0,
		fuzzy: 0,
		unanchored: 0,
		total: 0
	};
	let booksWritten = 0;

	for (const slug of slugs) {
		const sDir = join(SANCTA, SLUG_TO_SANCTA[slug] ?? slug);
		if (!existsSync(sDir)) continue;
		const book = readJson<Book>(join(ODR, `${slug}.json`));
		const origPath = join(ORIG, `${slug}.json`);
		const origBook = existsSync(origPath) ? readJson<Book>(origPath) : null;
		const result: Record<string, Record<string, Clarification[]>> = {};

		for (const f of readdirSync(sDir).filter((x) => /^\d+\.json$/.test(x))) {
			const sc = readJson<{
				chapter: number;
				verses: { verse: number; modern: string; original: string; clarifications?: Raw[] }[];
			}>(join(sDir, f));
			const ch = book.chapters!.find((c) => c.chapter === sc.chapter);
			const och = origBook?.chapters?.find((c) => c.chapter === sc.chapter);
			for (const sv of sc.verses) {
				if (!sv.clarifications?.length) continue;
				const ours = ch?.verses.find((v) => v.verse === sv.verse);
				const oursOrig = och?.verses.find((v) => v.verse === sv.verse);
				const modern = ours ? visibleText(ours.text) : null;
				const original = oursOrig ? visibleText(oursOrig.text) : null;
				const entries: { a: Anchor; raw: Raw }[] = [];
				for (const raw of sv.clarifications) {
					counts.total++;
					const a = modern ? anchorOne(raw, modern, original, sv.modern, sv.original) : null;
					if (!a) {
						counts.unanchored++;
						unanchored.push(
							[
								slug,
								sc.chapter,
								sv.verse,
								csv(raw.term),
								csv(raw.latin),
								csv(raw.gloss),
								ours ? 'no match' : 'verse missing',
								csv(modern ?? '')
							].join(',')
						);
						continue;
					}
					counts[a.method]++;
					entries.push({ a, raw });
				}
				if (!entries.length) continue;
				// occurrence = which match of the surface string this anchor is
				const used = new Set<string>();
				const list: Clarification[] = [];
				entries.sort((x, y) => x.a.start - y.a.start);
				for (const { a, raw } of entries) {
					const hits = findTermMatches(modern!, a.term);
					let occ = hits.findIndex((h) => h.start === a.start);
					if (occ < 0) occ = 0;
					// two entries for the same word in one verse take successive matches
					while (used.has(`${a.term.toLowerCase()}#${occ}`) && occ + 1 < hits.length) occ++;
					used.add(`${a.term.toLowerCase()}#${occ}`);
					list.push({ term: a.term, latin: raw.latin, gloss: raw.gloss, occurrence: occ });
				}
				(result[sc.chapter] ??= {})[sv.verse] = list;
			}
		}
		if (Object.keys(result).length) {
			// numeric keys sort ascending in JS objects, so output order is stable
			writeFileSync(join(OUT, `${slug}.json`), JSON.stringify(result));
			booksWritten++;
		}
	}

	writeFileSync(REPORT, unanchored.join('\n') + '\n');
	const ok = counts.exact + counts.orig + counts.fuzzy;
	console.log(
		`clarifications: ${counts.total} total, ${ok} anchored (${counts.exact} exact, ${counts.orig} via original spelling, ${counts.fuzzy} fuzzy), ${counts.unanchored} unanchored; ${booksWritten} book files`
	);
}

main();
