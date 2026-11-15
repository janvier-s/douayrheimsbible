// Downloads the 1611 KJV page images from kingjamesbibleonline.org to ~/facsimiles/kjv-1611/pages/.
//
// URL scheme (probed Nov 2026): https://www.kingjamesbibleonline.org/1611-Bible-KJV/webp/<Book>-Chapter-<c>-<n>.webp
//  - <n> is the page sequence number within the book, NOT the page within a chapter. It starts at 1, 2 or 3
//    (a book that begins mid-leaf starts later; some books' first page has c=2+).
//  - <c> is the chapter the page is filed under; it never decreases as n rises and can jump by several
//    (Psalms). So pages are found by chaining: from (c, n) try (c..c+W, n+1).
//  - Book names are the Protestant ones with dashes ("1-Samuel", "Song-of-Solomon"); the site's "1-Kings" is
//    1 Kings (not 1 Samuel); Apocrypha: "1-Esdras", "Tobit", "Judith", ... See PAGE_BOOKS.
//  - The site serves HTML only to browsers (403 to scripts) but serves images freely.
// Polite: <= 2 requests/second, generic User-Agent, existing files are never re-fetched. Resumable.
// Usage: npx tsx scripts/kjv1611/fetch-pages.ts [BookName ...]   (default: all)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const BASE = 'https://www.kingjamesbibleonline.org/1611-Bible-KJV/webp/';
const DIR = join(homedir(), 'facsimiles/kjv-1611/pages');
const UA = 'bible-data-build/1.0';

/** site slug → page-book names (in print order). Candidate aliases tried in order. */
export const PAGE_BOOKS: Record<string, string[][]> = {
	genesis: [['Genesis']],
	exodus: [['Exodus']],
	leviticus: [['Leviticus']],
	numbers: [['Numbers']],
	deuteronomy: [['Deuteronomy']],
	josue: [['Joshua']],
	judges: [['Judges']],
	ruth: [['Ruth']],
	'1-kings': [['1-Samuel']],
	'2-kings': [['2-Samuel']],
	'3-kings': [['1-Kings']],
	'4-kings': [['2-Kings']],
	'1-paralipomenon': [['1-Chronicles']],
	'2-paralipomenon': [['2-Chronicles']],
	'1-esdras': [['Ezra']],
	'2-esdras': [['Nehemiah']],
	esther: [['Esther']],
	job: [['Job']],
	psalms: [['Psalms']],
	proverbs: [['Proverbs']],
	ecclesiastes: [['Ecclesiastes']],
	'canticle-of-canticles': [['Song-of-Solomon', 'Song-of-Songs', 'Canticles']],
	isaie: [['Isaiah']],
	jeremie: [['Jeremiah']],
	lamentations: [['Lamentations']],
	ezechiel: [['Ezekiel']],
	daniel: [
		['Daniel'],
		['Song-of-the-Three-Children', 'Prayer-of-Azariah', 'Song-of-the-Three-Holy-Children'],
		['Susanna'],
		['Bel-and-the-Dragon']
	],
	osee: [['Hosea']],
	joel: [['Joel']],
	amos: [['Amos']],
	abdias: [['Obadiah']],
	jonas: [['Jonah']],
	micheas: [['Micah']],
	nahum: [['Nahum']],
	habacuc: [['Habakkuk']],
	sophonias: [['Zephaniah']],
	aggeus: [['Haggai']],
	zacharias: [['Zechariah']],
	malachie: [['Malachi']],
	'3-esdras': [['1-Esdras']],
	'4-esdras': [['2-Esdras']],
	tobias: [['Tobit']],
	judith: [['Judith']],
	wisdom: [['Wisdom', 'Wisdom-of-Solomon']],
	ecclesiasticus: [['Ecclesiasticus']],
	baruch: [['Baruch'], ['Letter-of-Jeremiah', 'Epistle-of-Jeremy', 'Epistle-of-Jeremiah']],
	'prayer-of-manasses': [['Prayer-of-Manasses', 'Prayer-of-Manasseh', 'Manasses']],
	'1-machabees': [['1-Maccabees']],
	'2-machabees': [['2-Maccabees']],
	matthew: [['Matthew']],
	mark: [['Mark']],
	luke: [['Luke']],
	john: [['John']],
	acts: [['Acts']],
	romans: [['Romans']],
	'1-corinthians': [['1-Corinthians']],
	'2-corinthians': [['2-Corinthians']],
	galatians: [['Galatians']],
	ephesians: [['Ephesians']],
	philippians: [['Philippians']],
	colossians: [['Colossians']],
	'1-thessalonians': [['1-Thessalonians']],
	'2-thessalonians': [['2-Thessalonians']],
	'1-timothy': [['1-Timothy']],
	'2-timothy': [['2-Timothy']],
	titus: [['Titus']],
	philemon: [['Philemon']],
	hebrews: [['Hebrews']],
	james: [['James']],
	'1-peter': [['1-Peter']],
	'2-peter': [['2-Peter']],
	'1-john': [['1-John']],
	'2-john': [['2-John']],
	'3-john': [['3-John']],
	jude: [['Jude']],
	apocalypse: [['Revelation']]
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
mkdirSync(DIR, { recursive: true });

/** Fetch one page file; returns true if it exists (cached or downloaded). */
async function have(file: string): Promise<boolean> {
	const path = join(DIR, file);
	if (existsSync(path)) return true;
	const miss = join(DIR, '.miss', file);
	if (existsSync(miss)) return false;
	const r = await fetch(BASE + file, { headers: { 'User-Agent': UA } });
	await sleep(500);
	if (r.status === 200) {
		writeFileSync(path, Buffer.from(await r.arrayBuffer()));
		return true;
	}
	mkdirSync(join(DIR, '.miss'), { recursive: true });
	writeFileSync(miss, '');
	return false;
}

const name = (book: string, c: number, n: number) => `${book}-Chapter-${c}-${n}.webp`;

/** Follow the page chain for a book; returns ordered files. */
export async function crawlBook(book: string, maxChapter = 150): Promise<string[]> {
	let cur: { c: number; n: number } | undefined;
	// start: first page filed under a low chapter number at a low page number
	for (let n = 1; n <= 12 && !cur; n++)
		for (let c = 0; c <= 6 && !cur; c++) if (await have(name(book, c, n))) cur = { c, n };
	if (!cur) return [];
	const files = [name(book, cur.c, cur.n)];
	const W = book === 'Psalms' ? 14 : 5;
	for (;;) {
		let next: { c: number; n: number } | undefined;
		for (let dn = 1; dn <= 4 && !next; dn++)
			for (let dc = 0; dc <= W && !next; dc++) {
				if (cur.c + dc > maxChapter) break;
				if (await have(name(book, cur.c + dc, cur.n + dn))) next = { c: cur.c + dc, n: cur.n + dn };
			}
		if (!next) break;
		cur = next;
		files.push(name(book, cur.c, cur.n));
	}
	return files;
}

async function main() {
	const idxPath = join(DIR, 'index.json');
	const index: Record<string, string[]> = existsSync(idxPath)
		? JSON.parse(readFileSync(idxPath, 'utf8'))
		: {};
	const only = process.argv.slice(2);
	for (const [slug, groups] of Object.entries(PAGE_BOOKS)) {
		for (const aliases of groups) {
			const key = aliases[0];
			if (only.length && !only.includes(key)) continue;
			if (index[`book:${key}`]) continue;
			let files: string[] = [];
			for (const a of aliases) {
				files = await crawlBook(a);
				if (files.length) break;
			}
			index[`book:${key}`] = files;
			for (const f of files) {
				const m = f.match(/-Chapter-(\d+)-\d+\.webp$/)!;
				const k = `${slug}/${m[1]}`;
				(index[k] ??= []).push(f);
			}
			writeFileSync(idxPath, JSON.stringify(index));
			console.log(`${key}: ${files.length} pages`);
		}
	}
}
if (process.argv[1]?.endsWith('fetch-pages.ts')) await main();
