// scripts/build-glossa-data.ts
// @ts-nocheck: build script run with tsx
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { GLOSSA_BOOK_MAP, expandAuthor, extractLemma } from './glossa-lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUT_DIR = join(PROJECT_ROOT, 'static', 'data', 'glossa');
const VUL_DIR = join(PROJECT_ROOT, 'static', 'data', 'vul');

/** The corpus lives outside this repo. Probe in order, and skip cleanly when
 *  none is present so Cloudflare builds use the committed JSON. */
function resolveSource(): string | null {
	const candidates = [
		process.env.GLOSSA_SOURCE,
		join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'GLOSSA', 'glossa_ordinaria'),
		join(homedir(), 'Development', 'for-the-kingdom', 'commentary', 'sources', 'glossa_ordinaria')
	];
	for (const c of candidates) {
		if (c && existsSync(c)) return c;
	}
	return null;
}

const SOURCE = resolveSource();

if (!SOURCE) {
	console.log('Glossa source not found; skipping build (using committed data).');
} else {
	buildGlossa(SOURCE);
}

function buildGlossa(source: string) {
	// ── Validate the book map against the source tree ────────────────
	const dirs = readdirSync(source, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);

	const unmapped = dirs.filter((d) => !(d in GLOSSA_BOOK_MAP));
	if (unmapped.length > 0) {
		throw new Error(`Glossa source dirs missing from GLOSSA_BOOK_MAP: ${unmapped.join(', ')}`);
	}
	const absent = Object.keys(GLOSSA_BOOK_MAP).filter((d) => !dirs.includes(d));
	if (absent.length > 0) {
		throw new Error(`GLOSSA_BOOK_MAP entries absent from source: ${absent.join(', ')}`);
	}

	let entries = 0;
	let lemmas = 0;
	let files = 0;
	let books = 0;

	for (const [dir, slug] of Object.entries(GLOSSA_BOOK_MAP)) {
		const vulPath = join(VUL_DIR, `${slug}.json`);
		if (!existsSync(vulPath)) {
			throw new Error(`GLOSSA_BOOK_MAP slug has no Vulgate data: ${slug}`);
		}
		const vul = JSON.parse(readFileSync(vulPath, 'utf-8'));
		const verseText = new Map<string, string>();
		for (const ch of vul.chapters) {
			for (const v of ch.verses) verseText.set(`${ch.chapter}:${v.verse}`, v.text);
		}

		let bookHadContent = false;

		for (const file of readdirSync(join(source, dir))) {
			if (!file.startsWith('chapitre_') || !file.endsWith('.json')) continue;
			const chapterData = JSON.parse(readFileSync(join(source, dir, file), 'utf-8'));
			const out: object[] = [];

			for (const c of chapterData.commentaries) {
				entries++;
				const verse = parseInt(c.verse_ref.split(':')[1], 10);
				const vt = verseText.get(c.verse_ref);
				if (vt === undefined) {
					throw new Error(`Dangling Glossa ref ${slug} ${c.verse_ref} (${dir}/${file})`);
				}
				const { lemma, body } = extractLemma(c.text, vt);
				if (lemma) lemmas++;
				const author = expandAuthor(c.author);
				out.push({
					verse,
					...(lemma ? { lemma } : {}),
					text: body,
					...(author ? { author } : {})
				});
			}

			if (out.length === 0) continue;
			out.sort((a, b) => a.verse - b.verse);

			const bookDir = join(OUT_DIR, slug);
			mkdirSync(bookDir, { recursive: true });
			writeFileSync(join(bookDir, `${chapterData.chapter}.json`), JSON.stringify(out));
			files++;
			bookHadContent = true;
		}

		if (bookHadContent) books++;
	}

	const pct = ((lemmas / entries) * 100).toFixed(1);
	console.log(`✓ Glossa: ${entries} entries, ${lemmas} lemmas (${pct}%).`);
	console.log(`✓ Glossa: ${files} chapter files across ${books} books.`);
}

// ── Export for pipeline integration ─────────────────────────────

export async function buildGlossaData(): Promise<void> {
	// Already runs on import; this is a no-op wrapper for prepare-data.ts,
	// matching build-fathers-data.ts.
}
