import { readdir, readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildSearchIndexes } from './build-search-index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const ODR_SOURCE = join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'ODR', 'ODR');
const OUT_DIR = join(PROJECT_ROOT, 'static', 'data', 'odr');
const ODR_PARENT = join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'ODR');

export const SLUG_REMAP_DRC_KNOX: Record<string, string> = {
	'josue': 'joshua',
	'jeremie': 'jeremiah',
	'ezechiel': 'ezekiel',
	'isaie': 'isaiah',
	'micheas': 'micah',
	'osee': 'hosea',
	'aggeus': 'haggai',
	'zacharias': 'zechariah',
	'sophonias': 'zephaniah',
	'malachie': 'malachi',
	'abdias': 'obadiah',
	'jonas': 'jonah',
	'habacuc': 'habakkuk',
	'tobias': 'tobit',
	'ecclesiasticus': 'sirach',
	'canticle-of-canticles': 'song-of-solomon',
	'apocalypse': 'revelation',
	'1-machabees': '1-maccabees',
	'2-machabees': '2-maccabees',
	'1-kings': '1-samuel',
	'2-kings': '2-samuel',
	'3-kings': '1-kings',
	'4-kings': '2-kings',
	'1-paralipomenon': '1-chronicles',
	'2-paralipomenon': '2-chronicles',
	'1-esdras': 'ezra',
	'2-esdras': 'nehemiah'
};

export function remapSlug(odrSlug: string, map: Record<string, string>): string {
	return map[odrSlug] ?? odrSlug;
}

/**
 * Given a modern-name slug (as used by DRC/Knox source files), find the ODR slug.
 * Note: the Kings/Samuel entries look like a collision but are intentional —
 * '1-kings' as a *value* maps back to '3-kings' (ODR's name for 1 Kings / 1 Samuel).
 * Insertion order in SLUG_REMAP_DRC_KNOX ensures the correct result.
 */
/** @internal */
export function reverseRemapSlug(modernSlug: string, map: Record<string, string>): string {
	const entry = Object.entries(map).find(([, v]) => v === modernSlug);
	return entry ? entry[0] : modernSlug;
}

const TRANSLATIONS_TO_COPY = [
	{ id: 'vul',  srcDir: join(ODR_PARENT, 'VUL_CL', 'JSON_Converted'), remap: false },
	{ id: 'drc',  srcDir: join(ODR_PARENT, 'DRC', 'JSON_drbo'), remap: true  },
	{ id: 'knox', srcDir: join(ODR_PARENT, 'Knox', 'JSON_converted'), remap: true  },
	{ id: 'kjv',  srcDir: join(ODR_PARENT, 'KJV', 'JSON_Converted'), remap: false },
	{ id: 'cpdv', srcDir: join(ODR_PARENT, 'CPDV', 'JSON_Converted'), remap: false },
	{ id: 'conf', srcDir: join(ODR_PARENT, 'Confraternity', 'JSON_Converted'), remap: false },
] as const;

async function main() {
	// Source data lives in SCRIPTURA (local only) — skip book copying on CI where
	// static/data/odr/ is already committed, but always build search indexes.
	try {
		await readdir(ODR_SOURCE);
	} catch {
		console.log(`Source not found at ${ODR_SOURCE} — skipping book copy (using committed data).`);
		await buildSearchIndexes();
		return;
	}

	await mkdir(OUT_DIR, { recursive: true });

	const files = await readdir(ODR_SOURCE);
	let count = 0;

	for (const file of files) {
		if (!file.endsWith('.json')) continue;

		const raw = await readFile(join(ODR_SOURCE, file), 'utf-8');
		const data = JSON.parse(raw);

		// Skip non-book files (e.g. 00-intro.json)
		if (!data.book) continue;

		// Derive slug: strip leading NN- prefix, normalise known spelling variants
		const rawSlug = file.replace(/^\d+-/, '').replace('.json', '');
		const SLUG_MAP: Record<string, string> = {
			'prayer-of-manasseh': 'prayer-of-manasses'
		};
		const slug = SLUG_MAP[rawSlug] ?? rawSlug;

		await writeFile(join(OUT_DIR, `${slug}.json`), JSON.stringify(data));
		count++;
		console.log(`✓ ${slug}`);
	}

	console.log(`\nPrepared ${count} books → ${OUT_DIR}`);

	// Copy additional translation JSONs
	for (const translation of TRANSLATIONS_TO_COPY) {
		// Skip gracefully if source directory is not accessible
		try {
			await access(translation.srcDir);
		} catch {
			console.log(`Translation source not found at ${translation.srcDir} — skipping ${translation.id}.`);
			continue;
		}

		const translationOutDir = join(PROJECT_ROOT, 'static', 'data', translation.id);
		await mkdir(translationOutDir, { recursive: true });

		const translationFiles = await readdir(translation.srcDir);
		let translationCount = 0;

		for (const file of translationFiles) {
			if (!file.endsWith('.json')) continue;

			const raw = await readFile(join(translation.srcDir, file), 'utf-8');
			const data = JSON.parse(raw);

			// Skip files without chapters field
			if (!Array.isArray(data.chapters)) continue;

			// Derive output slug
			const rawSlug = file.replace(/^\d+-/, '').replace('.json', '');
			let odrSlug: string;
			if (translation.remap) {
				// rawSlug is a modern slug — reverse-remap to ODR slug
				odrSlug = reverseRemapSlug(rawSlug, SLUG_REMAP_DRC_KNOX);
			} else {
				odrSlug = rawSlug;
			}

			// Write minimal JSON: only book and chapters (with chapter/verse/text)
			const minimal = {
				book: data.book,
				chapters: (data.chapters as Array<{ chapter: unknown; verses: Array<{ verse: unknown; text: unknown }> }>).map(
					(ch) => ({
						chapter: ch.chapter,
						verses: ch.verses.map((v) => ({ verse: v.verse, text: v.text }))
					})
				)
			};

			await writeFile(join(translationOutDir, `${odrSlug}.json`), JSON.stringify(minimal));
			translationCount++;
			console.log(`✓ ${translation.id}/${odrSlug}`);
		}

		console.log(`\nPrepared ${translationCount} books → ${translationOutDir}`);
	}

	await buildSearchIndexes();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
