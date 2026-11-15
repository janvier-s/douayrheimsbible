// Calibrates long-s placement against the proofread Wikisource transcription of the 1611 Bible
// (Page:BibleKJV1611-0NN.pdf/*, quality >= 3). Wikisource's pages carry {{Verse|c|v}} markers, so each
// verse is matched to a book by text, then compared letter for letter at every s/ſ.
// Usage: npx tsx scripts/kjv1611/calibrate.ts <dir> [<dir> ...]   (kjv-1611 style dirs; first = rule-only)
// Writes ~/facsimiles/kjv-1611/calibration.json and wikisource-disagreements.<n>.tsv.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { tokenize, normalizeWord } from './lib';
import { alignBanded } from './evidence-lib';

const HOME = join(homedir(), 'facsimiles/kjv-1611');
const CACHE = join(HOME, 'wikisource');
const API = 'https://en.wikisource.org/w/api.php';
const UA = 'bible-data-build/1.0';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
mkdirSync(CACHE, { recursive: true });

async function api(params: Record<string, string>) {
	const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
	const r = await fetch(url, { headers: { 'User-Agent': UA } });
	await sleep(500);
	if (!r.ok) throw new Error(`${r.status} ${url}`);
	return r.json() as Promise<any>;
}

type WsPage = { title: string; quality: number; text: string };

async function loadPages(): Promise<WsPage[]> {
	const cache = join(CACHE, 'pages.json');
	if (existsSync(cache)) return JSON.parse(readFileSync(cache, 'utf8'));
	const titles: string[] = [];
	let cont: Record<string, string> = {};
	do {
		const d = await api({
			action: 'query',
			list: 'allpages',
			apnamespace: '104',
			apprefix: 'BibleKJV1611',
			aplimit: '500',
			...cont
		});
		titles.push(...d.query.allpages.map((p: any) => p.title));
		cont = d.continue ?? {};
	} while (Object.keys(cont).length);
	const pages: WsPage[] = [];
	for (let i = 0; i < titles.length; i += 40) {
		const d = await api({
			action: 'query',
			prop: 'revisions',
			rvprop: 'content',
			rvslots: 'main',
			titles: titles.slice(i, i + 40).join('|')
		});
		for (const p of d.query.pages) {
			const text: string = p.revisions?.[0]?.slots?.main?.content ?? '';
			const q = Number(text.match(/<pagequality level="(\d)"/)?.[1] ?? 0);
			pages.push({ title: p.title, quality: q, text });
		}
	}
	writeFileSync(cache, JSON.stringify(pages));
	return pages;
}

/** Strip wiki markup to plain text; returns verses keyed by chapter:verse. */
export function wikiVerses(text: string): { ch: number; v: number; text: string }[] {
	let t = text.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, '').replace(/<[^>]+>/g, '');
	// margin notes (may nest braces) → nothing; formatting templates → their content
	for (let n = 0; n < 6; n++) {
		t = t
			.replace(/\{\{MarginNote[^{}]*\}\}/gi, '')
			.replace(
				/\{\{(?:sc|smaller|larger|x-larger|uc|lc|dropinitial|di)\|([^{}|]*)(?:\|[^{}]*)?\}\}/gi,
				'$1'
			)
			.replace(/\{\{\*\}\}/g, '')
			.replace(/\{\{(?!Verse\|)[^{}]*\}\}/gi, ' ');
	}
	const out: { ch: number; v: number; text: string }[] = [];
	const re = /\{\{Verse\|(\d+)\|(\d+)\}\}/gi;
	const marks = [...t.matchAll(re)];
	marks.forEach((m, i) => {
		const end = i + 1 < marks.length ? marks[i + 1].index! : t.length;
		out.push({
			ch: +m[1],
			v: +m[2],
			text: t.slice(m.index! + m[0].length, end).replace(/\{\{[^{}]*\}\}/g, ' ')
		});
	});
	return out;
}

const wordsOf = (s: string) => s.match(/[A-Za-zſ]+/g) ?? [];

function jaccard(a: Set<string>, b: Set<string>) {
	let i = 0;
	for (const x of a) if (b.has(x)) i++;
	return i / (a.size + b.size - i || 1);
}

async function main() {
	const dirs = process.argv.slice(2).map((d) => resolve(d));
	if (!dirs.length) throw new Error('usage: calibrate.ts <dir> [<dir> ...]');
	const pages = (await loadPages()).filter((p) => p.quality >= 3);
	const verseCount = pages.reduce((a, p) => a + wikiVerses(p.text).length, 0);
	console.log(`${pages.length} proofread pages (quality >= 3), ${verseCount} verses`);
	const results: Record<
		string,
		{ words: number; sPositions: number; agree: number; verses: number; unmatchedVerses: number }
	> = {};
	for (const [di, dir] of dirs.entries()) {
		const books = new Map<string, any>();
		for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')))
			books.set(f.replace('.json', ''), JSON.parse(readFileSync(join(dir, f), 'utf8')));
		const verseIx = new Map<string, { slug: string; text: string; modern?: boolean }[]>();
		for (const [slug, b] of books)
			for (const c of b.chapters)
				for (const v of c.verses) {
					const k = `${c.chapter}:${v.verse}`;
					(verseIx.get(k) ?? verseIx.set(k, []).get(k)!).push({
						slug,
						text: v.text,
						modern: v.modern
					});
				}
		const r = { words: 0, sPositions: 0, agree: 0, verses: 0, unmatchedVerses: 0 };
		const dis: string[] = [];
		for (const p of pages) {
			for (const wv of wikiVerses(p.text)) {
				const wwords = wordsOf(wv.text);
				if (wwords.length < 4) continue;
				const wkeys = new Set(wwords.map(normalizeWord));
				const cands = verseIx.get(`${wv.ch}:${wv.v}`) ?? [];
				let best: { slug: string; text: string; modern?: boolean } | undefined;
				let bs = 0;
				for (const c of cands) {
					const sc = jaccard(wkeys, new Set(tokenize(c.text).map((t) => t.key)));
					if (sc > bs) ((bs = sc), (best = c));
				}
				if (!best || bs < 0.5 || best.modern) {
					r.unmatchedVerses++;
					continue;
				}
				r.verses++;
				const ours = tokenize(best.text);
				const m = alignBanded(
					ours.map((t) => t.key),
					wwords.map(normalizeWord),
					30
				);
				ours.forEach((t, i) => {
					if (m[i] < 0) return;
					const w = wwords[m[i]];
					const a = t.raw.replace(/[^A-Za-zſ]/g, '');
					if (a.length !== w.length) return;
					r.words++;
					for (let k = 0; k < a.length; k++) {
						if (!/[sſ]/.test(a[k]) && !/[sſ]/.test(w[k])) continue;
						if (!/[sſ]/.test(a[k]) || !/[sſ]/.test(w[k])) break; // letters differ: not comparable
						r.sPositions++;
						if ((a[k] === 'ſ') === (w[k] === 'ſ')) r.agree++;
						else
							dis.push(
								[
									best!.slug,
									wv.ch,
									wv.v,
									t.start + k,
									a,
									w,
									a[k] === 'ſ' ? 'ours long, wikisource round' : 'ours round, wikisource long'
								].join('\t')
							);
					}
				});
			}
		}
		results[dir] = r;
		writeFileSync(join(HOME, `wikisource-disagreements.${di}.tsv`), dis.join('\n') + '\n');
		console.log(
			`${dir}: ${r.agree}/${r.sPositions} s-positions agree (${((100 * r.agree) / r.sPositions).toFixed(2)}%) over ${r.words} words, ${r.verses} verses (${r.unmatchedVerses} unmatched)`
		);
	}
	writeFileSync(
		join(HOME, 'calibration.json'),
		JSON.stringify({ pages: pages.length, verses: verseCount, results }, null, 1)
	);
}
if (process.argv[1]?.endsWith('calibrate.ts')) await main();
