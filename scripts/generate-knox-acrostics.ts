/**
 * Regenerates scripts/data/knox-acrostics.json from the New Advent Knox HTML.
 *
 * Knox reproduced the Hebrew alphabetic acrostics in English, and New Advent
 * marks each stanza's initial with <strong>. The JSON conversion that feeds
 * this project dropped the tag and left a space in its place, so verses read
 * "A h, blessed they" instead of "Ah, blessed they".
 *
 * A rule cannot repair that on its own: "A far from wrong-doing" closes up
 * while "A man who has found a vigorous wife" keeps its space, and only the
 * markup says which is which. So the sites are enumerated here instead.
 *
 * Run with: npx tsx scripts/generate-knox-acrostics.ts
 * Requires the SCRIPTURA sources; the generated JSON is committed so builds
 * without them still get the fix.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { cleanVerseText } from './clean-verse-text.js';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(HERE, '..');
const HTML_DIR = join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'KNOX', 'newadvent');
// The converted source, not static/data/knox: the shipped files already have
// this fix applied, so locating sites in them would find nothing to repair.
const KNOX_SRC = join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'ODR', 'Knox', 'JSON_converted');
const OUT = join(HERE, 'data', 'knox-acrostics.json');

/** New Advent file prefix, the slug this project stores Knox under, and the
 * converted source file it comes from. Only these four books carry acrostics;
 * a scan of all 1335 New Advent files finds bold initials nowhere else. */
const BOOKS: Array<{ prefix: string; slug: string; src: string }> = [
	{ prefix: 'psa', slug: 'psalms', src: '21-psalms.json' },
	{ prefix: 'lam', slug: 'lamentations', src: '29-lamentations.json' },
	{ prefix: 'pro', slug: 'proverbs', src: '22-proverbs.json' },
	{ prefix: 'sir', slug: 'ecclesiasticus', src: '26-sirach.json' }
];

const VERSE_TAG = /<span class="verse">(\d+)<\/span>/;
const STRONG_SINGLE = /<strong>([A-Za-z])<\/strong>(\s?)/g;

/** One acrostic initial: chapter, verse, the letter, the text it precedes. */
type Site = [number, number, string, string, boolean];

interface HtmlSite {
	chapter: number;
	verse: number;
	letter: string;
	joins: boolean;
	/** Text following the initial in the markup, used to find it in the JSON. */
	context: string;
}

/** Markup text reduced to what the converted JSON keeps of it. */
function plain(html: string): string {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/\[\d+\]/g, '')
		.replace(/[\u00a0\s]+/g, ' ')
		.trim();
}

async function sitesFromHtml(prefix: string): Promise<HtmlSite[]> {
	const files = (await readdir(HTML_DIR))
		.filter((f) => f.startsWith(`${prefix}_`) && f.endsWith('.html'))
		.sort();
	const sites: HtmlSite[] = [];
	for (const file of files) {
		const chapter = parseInt(file.slice(prefix.length + 1, -5), 10);
		const html = await readFile(join(HTML_DIR, file), 'utf-8');
		const parts = html.split(new RegExp(VERSE_TAG.source));
		// split keeps the captured verse number, so parts alternate num, text
		for (let i = 1; i < parts.length - 1; i += 2) {
			const verse = parseInt(parts[i], 10);
			for (const m of parts[i + 1].matchAll(STRONG_SINGLE)) {
				const context = plain(parts[i + 1].slice(m.index + m[0].length)).slice(0, 9);
				sites.push({ chapter, verse, letter: m[1], joins: m[2] === '', context });
			}
		}
	}
	return sites;
}

async function main() {
	const out: Record<string, Site[]> = {};
	let joins = 0;
	let spaced = 0;
	const unresolved: string[] = [];

	for (const { prefix, slug, src } of BOOKS) {
		const book = JSON.parse(await readFile(join(KNOX_SRC, src), 'utf-8')) as {
			chapters: { chapter: number; verses: { verse: number; text: string }[] }[];
		};
		const text = new Map<string, string>();
		for (const c of book.chapters)
			for (const v of c.verses) text.set(`${c.chapter}:${v.verse}`, cleanVerseText(v.text));

		const sites: Site[] = [];
		for (const site of await sitesFromHtml(prefix)) {
			const key = `${site.chapter}:${site.verse}`;
			const verseText = text.get(key);
			if (verseText === undefined) {
				unresolved.push(`${slug} ${key} missing from JSON`);
				continue;
			}
			// Locate by the text that follows the initial, not by the letter alone:
			// searching for "m " finds the one inside "leave him still" first.
			let context = site.context;
			let at = -1;
			while (context.length >= 4) {
				const found = verseText.indexOf(`${site.letter} ${context}`);
				if (found !== -1 && verseText.indexOf(`${site.letter} ${context}`, found + 1) === -1) {
					at = found;
					break;
				}
				context = context.slice(0, -1);
			}
			if (at === -1) {
				unresolved.push(`${slug} ${key} no unique match for "${site.letter} ${site.context}"`);
				continue;
			}
			// The initial has to start a word, or the join would weld two together.
			if (at > 0 && /[A-Za-z’']/.test(verseText[at - 1])) {
				unresolved.push(
					`${slug} ${key} "${site.letter}" is mid-word: ${JSON.stringify(verseText.slice(at - 6, at + 10))}`
				);
				continue;
			}
			sites.push([site.chapter, site.verse, site.letter, context, site.joins]);
			site.joins ? joins++ : spaced++;
		}
		out[slug] = sites;
	}

	// One site per line: 479 rows are far easier to review than a nested dump.
	const body = Object.entries(out)
		.map(([slug, sites]) => {
			const rows = sites.map((s) => `\t\t${JSON.stringify(s)}`).join(',\n');
			return `\t${JSON.stringify(slug)}: [\n${rows}\n\t]`;
		})
		.join(',\n');
	await writeFile(OUT, `{\n${body}\n}\n`);
	const total = Object.values(out).reduce((n, s) => n + s.length, 0);
	console.log(`knox acrostics: ${total} sites (${joins} join, ${spaced} keep their space)`);
	for (const [slug, sites] of Object.entries(out)) console.log(`  ${slug}: ${sites.length}`);
	if (unresolved.length) {
		console.log(`\nunresolved (${unresolved.length}):`);
		for (const u of unresolved) console.log(`  ${u}`);
	}
}

main();
