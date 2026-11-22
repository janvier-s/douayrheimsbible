// Builds static/data/kjv-1611 from the 66-book source + aruljohn Apocrypha.
// Usage: npx tsx scripts/kjv1611/build.ts [--evidence=<tsv>] [--out=<dir>] [--only=<site slug>] [--fixes=<tsv>]
// Persistent scan-backed corrections live in scripts/kjv1611/fixes.tsv and are applied to
// every build (override with --fixes). They run after long-s placement, so replacement
// text must already use the output orthography (ſ, ⁊, yͤ/yͭ).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SOURCE_SLUGS, APOCRYPHA, sectionOf } from './slugs';
import {
	alignVerses,
	applyLongS,
	placeAbbreviations,
	tokenize,
	LONG_S,
	type ClusterPolicy
} from './lib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const HOME = join(homedir(), 'facsimiles/kjv-1611');
const MODERN = join(ROOT, 'static/data/kjv');
const outArg = process.argv.find((a) => a.startsWith('--out='))?.slice(6);
const OUT = outArg ?? join(ROOT, 'static/data/kjv-1611');

type V = { verse: number; text: string };
type Ch = { chapter: number; verses: V[] };
type Book = { book: string; chapters: Ch[] };
type Pool = { verse: number; text: string; witness: string }; // text = base (1611 spelling, ye for the)

// --evidence=<tsv>: long-s evidence (evidence.ts) plus cluster-policy.json beside it.
type Verdict = 'long' | 'round';
const evidenceArg = process.argv.find((a) => a.startsWith('--evidence='))?.slice(11);
const policyBySection: Record<string, ClusterPolicy> = evidenceArg
	? JSON.parse(readFileSync(join(dirname(evidenceArg), 'cluster-policy.json'), 'utf8')).policy
	: {};
/** slug|chapter|verse → offset → verdict, for confident OCR readings only (Tesseract conf ≥ 80). */
const overridesByVerse = new Map<string, Map<number, Verdict>>();
/** low-confidence readings, kept for the conflicts list */
const lowConf: {
	slug: string;
	ch: number;
	v: number;
	offset: number;
	word: string;
	verdict: Verdict;
	conf: number;
}[] = [];
if (evidenceArg) {
	for (const line of readFileSync(evidenceArg, 'utf8').split('\n').slice(1)) {
		const c = line.split('\t');
		if (c.length < 8 || (c[6] !== 'long' && c[6] !== 'round')) continue;
		const conf = Number(c[7]);
		if (conf >= 80) {
			const key = `${c[0]}|${c[1]}|${c[2]}`;
			(overridesByVerse.get(key) ?? overridesByVerse.set(key, new Map()).get(key)!).set(
				Number(c[3]),
				c[6] as Verdict
			);
		} else
			lowConf.push({
				slug: c[0],
				ch: +c[1],
				v: +c[2],
				offset: +c[3],
				word: c[4],
				verdict: c[6] as Verdict,
				conf
			});
	}
}

const readBook = (p: string): Book => JSON.parse(readFileSync(p, 'utf8'));
const decode = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

// --fixes=<tsv>: persistent, scan-backed corrections keyed by slug/chapter/verse.
// TSV columns: slug chapter verse find replace reason witness. '#' comments are ignored.
type Fix = {
	key: string;
	slug: string;
	ch: number;
	v: number;
	find: string;
	replace: string;
	reason: string;
	witness: string;
};
const fixesArg = process.argv.find((a) => a.startsWith('--fixes='))?.slice(8);
const fixesPath = fixesArg ?? join(ROOT, 'scripts/kjv1611/fixes.tsv');
const fixesByVerse = new Map<string, Fix[]>();
const consumedFixes = new Set<string>();
if (existsSync(fixesPath)) {
	for (const [i, line] of readFileSync(fixesPath, 'utf8').split('\n').entries()) {
		if (!line.trim() || line.startsWith('#')) continue;
		const c = line.split('\t');
		if (c[0] === 'slug') continue; // header
		if (c.length < 5)
			throw new Error(`${fixesPath}:${i + 1}: expected at least 5 tab-separated columns`);
		const fix: Fix = {
			key: `${c[0]}|${c[1]}|${c[2]}|${c[3]}`,
			slug: c[0],
			ch: +c[1],
			v: +c[2],
			find: c[3],
			replace: c[4],
			reason: c[5] ?? '',
			witness: c[6] ?? ''
		};
		const key = `${fix.slug}|${fix.ch}|${fix.v}`;
		(fixesByVerse.get(key) ?? fixesByVerse.set(key, []).get(key)!).push(fix);
	}
}

/** Apply the ledger entries for one verse, checking each `find` occurs exactly once. */
function applyFixes(slug: string, ch: number, v: number, text: string): string {
	for (const f of fixesByVerse.get(`${slug}|${ch}|${v}`) ?? []) {
		const count = text.split(f.find).length - 1;
		if (count !== 1)
			throw new Error(
				`fix ${f.key}: expected exactly 1 occurrence of ${JSON.stringify(f.find)}, found ${count} ` +
					`(${f.witness}: ${f.reason})`
			);
		text = text.replace(f.find, f.replace);
		consumedFixes.add(f.key);
	}
	return text;
}

function arul(name: string): Book {
	const b = readBook(join(HOME, 'aruljohn', `${name}.json`));
	for (const c of b.chapters) for (const v of c.verses) v.text = decode(v.text);
	return b;
}
const chap = (b: Book, c: number): V[] => b.chapters.find((x) => x.chapter === c)?.verses ?? [];

/** Base text from the source with the aruljohn verse (same ch:v) as witness. */
function sourcePool(src: Book, wit: Book, c: number, from = 0, to = Infinity): Pool[] {
	const w = new Map(chap(wit, c).map((v) => [v.verse, v.text]));
	return chap(src, c)
		.filter((v) => v.verse >= from && v.verse <= to)
		.map((v) => ({ verse: v.verse, text: v.text, witness: w.get(v.verse) ?? v.text }));
}
/** Aruljohn-only text: base = witness with &thorn; → ye. */
function arulPool(b: Book, c: number): Pool[] {
	return chap(b, c).map((v) => ({
		verse: v.verse,
		text: v.text.replace(/&thorn;/g, 'ye'),
		witness: v.text
	}));
}

/** Split one text across several modern verses by word alignment (Prayer of Manasses). */
function splitAcross(pool: Pool, modern: V[]): Pool[] {
	const bt = tokenize(pool.text);
	const mt = modern.map((v) => tokenize(v.text).map((t) => t.key));
	const flat = mt.flat();
	const n = bt.length;
	const m = flat.length;
	const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
	for (let i = n - 1; i >= 0; i--)
		for (let j = m - 1; j >= 0; j--)
			dp[i][j] =
				bt[i].key === flat[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
	const matchOf = new Map<number, number>(); // flat idx → base idx
	for (let i = 0, j = 0; i < n && j < m; ) {
		if (bt[i].key === flat[j]) matchOf.set(j++, i++);
		else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
		else j++;
	}
	const out: Pool[] = [];
	let start = 0;
	let off = 0;
	for (const [k, v] of modern.entries()) {
		off += mt[k].length;
		let cut = pool.text.length;
		if (k < modern.length - 1) {
			let j = off - 1;
			while (j >= 0 && !matchOf.has(j)) j--;
			cut = j >= 0 ? bt[matchOf.get(j)!].end : start;
		}
		const piece = pool.text.slice(start, cut).trim();
		const wpiece = pool.witness; // witness only used for thorns; split by same proportions below
		out.push({ verse: v.verse, text: piece, witness: wpiece });
		start = cut;
	}
	return out;
}

type Plan = { pool: Pool[]; modern: V[]; fallbackFrom?: number };

function build(): void {
	const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
	if (!existsSync(join(HOME, 'source'))) throw new Error(`missing ${HOME}/source`);
	mkdirSync(OUT, { recursive: true });
	if (!only) for (const f of readdirSync(OUT)) if (f.endsWith('.json')) unlinkSync(join(OUT, f));
	let overridden = 0;
	const conflicts: string[] = [];
	let totThorn = 0;
	let totUnplaced = 0;
	const lowSim: string[] = [];
	for (const file of readdirSync(MODERN).filter((f) => f.endsWith('.json'))) {
		const slug = file.replace('.json', '');
		if (only && slug !== only) continue;
		const def = SOURCE_SLUGS[slug];
		if (!def) throw new Error(`no source mapping for ${slug}`);
		const modern = readBook(join(MODERN, file));
		const src = def.source ? readBook(join(HOME, 'source', `${def.source}.json`)) : undefined;
		const wits = (def.aruljohn ?? []).map(arul);
		const chapters: Ch[] = [];
		let placed = 0;
		let unplaced = 0;
		let longS = 0;
		let verses = 0;
		let fallback = 0;

		for (const mc of modern.chapters) {
			const mv = mc.verses.filter((v) => !(slug === 'psalms' && v.verse === 0));
			let pool: Pool[];
			let identity = false;
			if (slug === 'daniel' && mc.chapter === 3) {
				pool = [
					...sourcePool(src!, wits[0], 3, 1, 23),
					...arulPool(wits[1], 1),
					...sourcePool(src!, wits[0], 3, 24, 99)
				];
			} else if (slug === 'daniel' && mc.chapter === 13) pool = arulPool(wits[2], 1);
			else if (slug === 'daniel' && mc.chapter === 14) pool = arulPool(wits[3], 1);
			else if (slug === 'baruch' && mc.chapter === 6) pool = arulPool(wits[1], 1);
			else if (slug === 'prayer-of-manasses') pool = splitAcross(arulPool(wits[0], 1)[0], mv);
			else if (slug === 'esther') pool = sourcePool(src!, wits[0], mc.chapter);
			else if (src) pool = sourcePool(src, wits[0], mc.chapter);
			else pool = arulPool(wits[0], mc.chapter);
			// The aruljohn source glues the Prologue to Ecclesiasticus 1:1; the modern KJV has none.
			if (slug === 'ecclesiasticus' && mc.chapter === 1 && pool[0]?.text.length > 1000) {
				const cut = pool[0].text.lastIndexOf('  All ');
				if (cut > 0) pool[0] = { ...pool[0], text: pool[0].text.slice(cut).trim() };
			}
			void identity;

			// map modern verse → pool entry
			const poolV = pool.map((p, i) => ({ verse: i + 1, text: p.text }));
			const direct =
				pool.length === mv.length &&
				pool.every((p, i) => p.verse === mv[i].verse) &&
				!(slug === 'daniel' && mc.chapter === 3);
			let map: Map<number, number>;
			if (direct) map = new Map(mv.map((v, i) => [v.verse, i + 1]));
			else if (slug === 'prayer-of-manasses') map = new Map(mv.map((v, i) => [v.verse, i + 1]));
			else map = alignVerses(poolV, mv);

			const outVerses: (V & { modern?: boolean })[] = [];
			for (const v of mv) {
				const pi = map.get(v.verse);
				if (pi === undefined) {
					if (slug === 'esther' || (slug === 'daniel' && mc.chapter === 3 && v.verse === 24)) {
						// Additions to Esther and Dan 3:24 are in neither source: keep the modern text, flagged.
						outVerses.push({
							verse: v.verse,
							text: applyFixes(slug, mc.chapter, v.verse, v.text),
							modern: true
						});
						fallback++;
						continue;
					}
					throw new Error(`${slug} ${mc.chapter}:${v.verse} has no 1611 match`);
				}
				const p = pool[pi - 1];
				if (!p.text.trim()) {
					// verse blank in the 1611 source: keep the modern text, flagged
					outVerses.push({
						verse: v.verse,
						text: applyFixes(slug, mc.chapter, v.verse, v.text),
						modern: true
					});
					fallback++;
					continue;
				}
				const r = placeAbbreviations(p.text, p.witness);
				placed += r.placed;
				unplaced += r.unplaced;
				const policy = policyBySection[sectionOf(slug)] ?? {};
				const ov = overridesByVerse.get(`${slug}|${mc.chapter}|${v.verse}`);
				const text = applyLongS(r.text, policy, ov);
				const rule = applyLongS(r.text, policy);
				if (evidenceArg) {
					if (ov)
						for (const [o, vd] of ov)
							if ((rule[o] === LONG_S) !== (vd === 'long') && /[A-Za-z]/.test(r.text[o + 1] ?? ''))
								overridden++;
					for (const l of lowConf.filter(
						(x) => x.slug === slug && x.ch === mc.chapter && x.v === v.verse
					)) {
						if (
							/[A-Za-z]/.test(r.text[l.offset + 1] ?? '') &&
							(rule[l.offset] === LONG_S) !== (l.verdict === 'long')
						)
							conflicts.push(
								[
									slug,
									mc.chapter,
									v.verse,
									l.offset,
									l.word,
									rule[l.offset] === LONG_S ? 'long' : 'round',
									l.verdict,
									l.conf
								].join('\t')
							);
					}
				}
				longS += [...text].filter((c) => c === LONG_S).length;
				verses++;
				outVerses.push({ verse: v.verse, text: applyFixes(slug, mc.chapter, v.verse, text) });
			}
			chapters.push({ chapter: mc.chapter, verses: outVerses });
		}
		const out: Record<string, unknown> = { book: modern.book };
		if (APOCRYPHA.includes(slug)) out.supplied = false;
		out.chapters = chapters;
		writeFileSync(join(OUT, file), JSON.stringify(out));
		totThorn += placed;
		totUnplaced += unplaced;
		console.log(
			`${slug}: verses ${verses}${fallback ? ` (+${fallback} modern fallback)` : ''} ye-abbr placed ${placed} unplaced ${unplaced} ſ ${longS}`
		);
	}
	if (!only) {
		const unused = [...fixesByVerse.values()].flat().filter((f) => !consumedFixes.has(f.key));
		if (unused.length)
			throw new Error(`fixes.tsv: entries with no matching verse: ${unused.map((f) => f.key).join(', ')}`);
	}
	if (evidenceArg && !only) {
		writeFileSync(
			join(dirname(evidenceArg), 'conflicts.tsv'),
			'slug\tchapter\tverse\toffset\tword\trule\tocr\tconf\n' + conflicts.join('\n') + '\n'
		);
		console.log(
			`evidence: ${overridden} confident overrides of the rule, ${conflicts.length} low-confidence conflicts`
		);
	}
	console.log(`TOTAL abbr placed ${totThorn} unplaced ${totUnplaced}`);
	if (lowSim.length) console.log('low similarity:', lowSim.join(', '));
}
build();
