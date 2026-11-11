/**
 * Measures how far the Challoner text (static/data/drc) departs from the
 * Original Douay-Rheims (static/data/odr, modernized spelling), verse by verse.
 * Output: static/data/stats/challoner.json
 *
 * Classes per verse:
 *   unchanged  - identical after stripping markup, case and punctuation
 *   spelling   - same word count, every differing word is a near spelling variant
 *   reworded   - anything else
 *
 * Chapters whose verse numbering differs between the two texts (offset runs,
 * verse-count differences) are skipped, since verse-for-verse pairing is unsafe.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const ODR = join(ROOT, 'static/data/odr');
const DRC = join(ROOT, 'static/data/drc');
const OUT = join(ROOT, 'static/data/stats');
const OFFSETS = join(ROOT, '../sancta-scrape/analysis/verse-numbering-differences.csv');

type V = { verse: number; text: string };
type Ch = { chapter: number; verses: V[] };

function clean(t: string): string {
	return t
		.replace(/<[^>]+>/g, ' ')
		.replace(/\[\d+\]/g, ' ')
		.replace(/[¹²³⁰-⁹]+/g, ' ')
		.replace(/æ/gi, 'ae')
		.replace(/œ/gi, 'oe')
		.replace(/[‘’]/g, "'")
		.replace(/[“”]/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
}

function tokens(t: string): string[] {
	return clean(t)
		.toLowerCase()
		.replace(/[^a-z0-9' ]+/g, ' ')
		.split(/\s+/)
		.filter(Boolean);
}

function lev(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	let prev = Array.from({ length: n + 1 }, (_, i) => i);
	for (let i = 1; i <= m; i++) {
		const cur = [i];
		for (let j = 1; j <= n; j++) {
			cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
		}
		prev = cur;
	}
	return prev[n];
}

function nearVariant(a: string, b: string): boolean {
	if (a === b) return true;
	const longest = Math.max(a.length, b.length);
	if (longest < 4) return false;
	return lev(a, b) <= (longest >= 8 ? 2 : 1);
}

/** LCS-based diff; returns replaced spans as [from, to] token strings. */
function swaps(a: string[], b: string[]): Array<[string, string]> {
	const m = a.length;
	const n = b.length;
	const dp: Uint16Array[] = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
	for (let i = m - 1; i >= 0; i--)
		for (let j = n - 1; j >= 0; j--)
			dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
	const out: Array<[string, string]> = [];
	let i = 0;
	let j = 0;
	let da: string[] = [];
	let db: string[] = [];
	const flush = () => {
		if (da.length && db.length && da.length <= 3 && db.length <= 3)
			out.push([da.join(' '), db.join(' ')]);
		da = [];
		db = [];
	};
	while (i < m || j < n) {
		if (i < m && j < n && a[i] === b[j]) {
			flush();
			i++;
			j++;
		} else if (j >= n || (i < m && dp[i + 1][j] >= dp[i][j + 1])) da.push(a[i++]);
		else db.push(b[j++]);
	}
	flush();
	return out;
}

function skipSet(): Set<string> {
	const s = new Set<string>();
	if (!existsSync(OFFSETS)) return s;
	for (const line of readFileSync(OFFSETS, 'utf8').split('\n').slice(1)) {
		const [book, ch] = line.split(',');
		if (book && ch) s.add(`${book}:${Number(ch)}`);
	}
	return s;
}

const skip = skipSet();
// Not part of Challoner's canon proper; excluded from the comparison.
const APPENDIX = new Set(['3-esdras', '4-esdras', 'prayer-of-manasses']);
const books = readdirSync(DRC).filter((f) => f.endsWith('.json'));

const perBook: Array<Record<string, unknown>> = [];
const swapCount = new Map<string, number>();
const rewritten: Array<{ book: string; chapter: number; verse: number; ratio: number; n: number }> =
	[];
let T = {
	unchanged: 0,
	spelling: 0,
	reworded: 0,
	compared: 0,
	unmatched: 0,
	renumbered: 0,
	skippedChapters: 0
};

for (const f of books) {
	const slug = f.replace('.json', '');
	if (APPENDIX.has(slug)) continue;
	const odr = JSON.parse(readFileSync(join(ODR, f), 'utf8'));
	const drc = JSON.parse(readFileSync(join(DRC, f), 'utf8'));
	const drcCh = new Map<number, V[]>(drc.chapters.map((c: Ch) => [c.chapter, c.verses]));
	const b = {
		slug,
		title:
			(odr.short_title as string) ||
			slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
		unchanged: 0,
		spelling: 0,
		reworded: 0,
		compared: 0,
		unmatched: 0,
		renumbered: 0
	};
	for (const ch of odr.chapters as Ch[]) {
		const dv = drcCh.get(ch.chapter);
		if (!dv || skip.has(`${slug}:${ch.chapter}`)) {
			T.skippedChapters++;
			continue;
		}
		const dvTok = dv.map((v) => ({ n: v.verse, t: tokens(v.text) }));
		ch.verses.forEach((ov) => {
			const ta = tokens(ov.text);
			if (!ta.length) return;
			const setA = new Set(ta);
			let best = -1;
			let bestSim = 0;
			dvTok.forEach((c, k) => {
				if (Math.abs(c.n - ov.verse) > 2 || !c.t.length) return;
				const setB = new Set(c.t);
				let inter = 0;
				for (const w of setA) if (setB.has(w)) inter++;
				const sim = inter / (setA.size + setB.size - inter);
				if (sim > bestSim || (sim === bestSim && dvTok[k].n === ov.verse)) {
					bestSim = sim;
					best = k;
				}
			});
			if (best < 0 || bestSim < 0.2) return void b.unmatched++;
			if (dvTok[best].n !== ov.verse) b.renumbered++;
			const tb = dvTok[best].t;
			if (!ta.length || !tb.length) return;
			b.compared++;
			if (ta.join(' ') === tb.join(' ')) return void b.unchanged++;
			if (ta.length === tb.length && ta.every((w, k) => nearVariant(w, tb[k])))
				return void b.spelling++;
			b.reworded++;
			const sw = swaps(ta, tb);
			for (const [x, y] of sw) {
				const k = `${x}\t${y}`;
				swapCount.set(k, (swapCount.get(k) ?? 0) + 1);
			}
			const common = ta.filter((w) => tb.includes(w)).length;
			rewritten.push({
				book: b.title,
				chapter: ch.chapter,
				verse: ov.verse,
				ratio: 1 - common / Math.max(ta.length, tb.length),
				n: Math.max(ta.length, tb.length)
			});
		});
	}
	T.unchanged += b.unchanged;
	T.spelling += b.spelling;
	T.reworded += b.reworded;
	T.compared += b.compared;
	T.unmatched += b.unmatched;
	T.renumbered += b.renumbered;
	perBook.push({ ...b, rewordedRate: b.compared ? b.reworded / b.compared : 0 });
}

const topSwaps = [...swapCount.entries()]
	.filter(([k]) => {
		const [x, y] = k.split('\t');
		return lev(x, y) > 1 && !nearVariant(x.replace(/ /g, ''), y.replace(/ /g, ''));
	})
	.sort((x, y) => y[1] - x[1])
	.slice(0, 40)
	.map(([k, count]) => {
		const [from, to] = k.split('\t');
		return { from, to, count };
	});

const mostRewritten = rewritten
	.filter((r) => r.n >= 12)
	.sort((x, y) => y.ratio - x.ratio || y.n - x.n)
	.slice(0, 25);

mkdirSync(OUT, { recursive: true });
writeFileSync(
	join(OUT, 'challoner.json'),
	JSON.stringify({ totals: T, perBook, topSwaps, mostRewritten }, null, 1) + '\n'
);
console.log(T, topSwaps.slice(0, 15));
