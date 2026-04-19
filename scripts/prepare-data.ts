// @ts-nocheck — build script run with tsx, not part of the Svelte app
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
	josue: 'joshua',
	jeremie: 'jeremiah',
	ezechiel: 'ezekiel',
	isaie: 'isaiah',
	micheas: 'micah',
	osee: 'hosea',
	aggeus: 'haggai',
	zacharias: 'zechariah',
	sophonias: 'zephaniah',
	malachie: 'malachi',
	abdias: 'obadiah',
	jonas: 'jonah',
	habacuc: 'habakkuk',
	tobias: 'tobit',
	ecclesiasticus: 'sirach',
	'canticle-of-canticles': 'song-of-solomon',
	apocalypse: 'revelation',
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
	{ id: 'vul', srcDir: join(ODR_PARENT, 'VUL_CL', 'JSON_Converted'), remap: false },
	{ id: 'drc', srcDir: join(ODR_PARENT, 'DRC', 'JSON_drbo'), remap: true },
	{ id: 'knox', srcDir: join(ODR_PARENT, 'Knox', 'JSON_converted'), remap: true },
	{ id: 'kjv', srcDir: join(ODR_PARENT, 'KJV', 'JSON_Converted'), remap: false },
	{ id: 'cpdv', srcDir: join(ODR_PARENT, 'CPDV', 'JSON_Converted'), remap: false },
	{ id: 'conf', srcDir: join(ODR_PARENT, 'Confraternity', 'JSON_Converted'), remap: false }
] as const;

/** Clean translation verse text at build time so JSON/API consumers get clean data. */
function cleanVerseText(text: string): string {
	return (
		text
			// KJV: USFM word-level markup  \+w WORD|strong="HXXXX"\+w*
			.replace(/\\\+w\s+(.*?)\|[^\\]*\\\+w\*/g, '$1')
			// KJV: pilcrow paragraph markers
			.replace(/¶\s*/g, '')
			// Vulgate: section bracket markers
			.replace(/[\[\]]/g, '')
			// Knox: trailing footnote marker numbers (e.g. "...Christ.1" → "...Christ.")
			.replace(/([.;?!,)…:a-zA-Z])\d{1,2}$/, '$1')
			// Collapse runs of whitespace
			.replace(/  +/g, ' ')
			.trim()
	);
}

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
			console.log(
				`Translation source not found at ${translation.srcDir} — skipping ${translation.id}.`
			);
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

			// Write minimal JSON: book and chapters (with chapter/verse/text, plus optional summary/intro)
			const minimal: Record<string, unknown> = {
				book: data.book,
				chapters: (
					data.chapters as Array<{
						chapter: unknown;
						summary?: string;
						verses: Array<{ verse: number; text: string }>;
					}>
				).map((ch) => ({
					chapter: ch.chapter,
					...(ch.summary ? { summary: ch.summary } : {}),
					verses: ch.verses.map((v) => ({ verse: v.verse, text: cleanVerseText(v.text) }))
				}))
			};
			if ((data as Record<string, unknown>).intro) {
				minimal.intro = (data as Record<string, unknown>).intro;
			}

			await writeFile(join(translationOutDir, `${odrSlug}.json`), JSON.stringify(minimal));
			translationCount++;
			console.log(`✓ ${translation.id}/${odrSlug}`);
		}

		console.log(`\nPrepared ${translationCount} books → ${translationOutDir}`);
	}

	// --- DRC chapter notes → static/data/drc-notes/{odrSlug}/{chapter}.json ---
	const drcNotesSrc = join(ODR_PARENT, 'DRC', 'JSON_Converted');
	try {
		await access(drcNotesSrc);
		const drcNotesOutBase = join(PROJECT_ROOT, 'static', 'data', 'drc-notes');
		await mkdir(drcNotesOutBase, { recursive: true });

		const drcFiles = await readdir(drcNotesSrc);
		let drcNotesCount = 0;

		for (const file of drcFiles) {
			if (!file.endsWith('.json')) continue;

			const raw = await readFile(join(drcNotesSrc, file), 'utf-8');
			const data = JSON.parse(raw) as {
				chapters?: Array<{ chapter: number; notes?: Array<{ verse: number; text: string }> }>;
			};
			if (!Array.isArray(data.chapters)) continue;

			// DRC files use modern-name slugs — reverse-remap to ODR slug
			const modernSlug = file.replace(/^\d+-/, '').replace('.json', '');
			const odrSlug = reverseRemapSlug(modernSlug, SLUG_REMAP_DRC_KNOX);
			const bookOutDir = join(drcNotesOutBase, odrSlug);

			for (const ch of data.chapters) {
				if (!Array.isArray(ch.notes) || ch.notes.length === 0) continue;
				await mkdir(bookOutDir, { recursive: true });
				await writeFile(join(bookOutDir, `${ch.chapter}.json`), JSON.stringify(ch.notes));
				drcNotesCount++;
			}
		}

		console.log(`✓ drc-notes: wrote ${drcNotesCount} chapter note files → ${drcNotesOutBase}`);
	} catch {
		console.log(`DRC notes source not found at ${drcNotesSrc} — skipping.`);
	}

	// --- DRC cross-references → static/data/drc-crossrefs/{odrSlug}/{chapter}.json ---
	const drcCrossRefsSrc = join(ODR_PARENT, 'DRC', 'JSON_crossrefs');
	try {
		await access(drcCrossRefsSrc);
		const drcCrossRefsOutBase = join(PROJECT_ROOT, 'static', 'data', 'drc-crossrefs');
		await mkdir(drcCrossRefsOutBase, { recursive: true });

		const drcCrossRefsFiles = await readdir(drcCrossRefsSrc);
		let drcCrossRefsCount = 0;

		for (const file of drcCrossRefsFiles) {
			if (!file.endsWith('.json')) continue;

			const raw = await readFile(join(drcCrossRefsSrc, file), 'utf-8');
			const data = JSON.parse(raw) as {
				chapters?: Array<{ chapter: number; crossrefs?: Array<{ marker: number; verse: number; refs: string }> }>;
			};
			if (!Array.isArray(data.chapters)) continue;

			// DRC files use modern-name slugs — reverse-remap to ODR slug
			const modernSlug = file.replace(/^\d+-/, '').replace('.json', '');
			const odrSlug = reverseRemapSlug(modernSlug, SLUG_REMAP_DRC_KNOX);
			const bookOutDir = join(drcCrossRefsOutBase, odrSlug);

			for (const ch of data.chapters) {
				if (!Array.isArray(ch.crossrefs) || ch.crossrefs.length === 0) continue;
				await mkdir(bookOutDir, { recursive: true });
				await writeFile(join(bookOutDir, `${ch.chapter}.json`), JSON.stringify(ch.crossrefs));
				drcCrossRefsCount++;
			}
		}

		console.log(`✓ drc-crossrefs: wrote ${drcCrossRefsCount} chapter cross-ref files → ${drcCrossRefsOutBase}`);
	} catch {
		console.log(`DRC cross-refs source not found at ${drcCrossRefsSrc} — skipping.`);
	}

	// --- Knox chapter notes → static/data/knox-notes/{odrSlug}/{chapter}.json ---
	const knoxNotesSrc = join(ODR_PARENT, 'Knox', 'JSON_converted');
	try {
		await access(knoxNotesSrc);
		const knoxNotesOutBase = join(PROJECT_ROOT, 'static', 'data', 'knox-notes');
		await mkdir(knoxNotesOutBase, { recursive: true });

		const knoxFiles = await readdir(knoxNotesSrc);
		let knoxNotesCount = 0;

		for (const file of knoxFiles) {
			if (!file.endsWith('.json')) continue;

			const raw = await readFile(join(knoxNotesSrc, file), 'utf-8');
			const data = JSON.parse(raw) as {
				chapters?: Array<{
					chapter: number;
					notes?: Array<{ verse_marker: number; note_marker: number; text: string }>;
				}>;
			};
			if (!Array.isArray(data.chapters)) continue;

			// Knox files use modern-name slugs — reverse-remap to ODR slug
			const modernSlug = file.replace(/^\d+-/, '').replace('.json', '');
			const odrSlug = reverseRemapSlug(modernSlug, SLUG_REMAP_DRC_KNOX);
			const bookOutDir = join(knoxNotesOutBase, odrSlug);

			for (const ch of data.chapters) {
				if (!Array.isArray(ch.notes) || ch.notes.length === 0) continue;
				await mkdir(bookOutDir, { recursive: true });
				// Normalize to { verse, text } format matching TranslationNote
				const notes = ch.notes.map((n) => ({ verse: n.verse_marker, text: n.text }));
				await writeFile(join(bookOutDir, `${ch.chapter}.json`), JSON.stringify(notes));
				knoxNotesCount++;
			}
		}

		console.log(`✓ knox-notes: wrote ${knoxNotesCount} chapter note files → ${knoxNotesOutBase}`);
	} catch {
		console.log(`Knox notes source not found at ${knoxNotesSrc} — skipping.`);
	}

	// --- CPDV chapter notes → static/data/cpdv-notes/{odrSlug}/{chapter}.json ---
	const cpdvNotesSrc = join(ODR_PARENT, 'CPDV', 'JSON_notes');
	try {
		await access(cpdvNotesSrc);
		const cpdvNotesOutBase = join(PROJECT_ROOT, 'static', 'data', 'cpdv-notes');
		await mkdir(cpdvNotesOutBase, { recursive: true });

		const cpdvFiles = await readdir(cpdvNotesSrc);
		let cpdvNotesCount = 0;

		for (const file of cpdvFiles) {
			if (!file.endsWith('.json')) continue;

			const raw = await readFile(join(cpdvNotesSrc, file), 'utf-8');
			const data = JSON.parse(raw) as {
				notes?: Array<{ chapter: number; verse: number; note: string }>;
			};
			if (!Array.isArray(data.notes)) continue;

			// CPDV uses ODR-compatible slugs — no remap needed
			const slug = file.replace(/^\d+-/, '').replace('.json', '');
			const bookOutDir = join(cpdvNotesOutBase, slug);

			// Group notes by chapter
			const byChapter = new Map<number, Array<{ verse: number; text: string }>>();
			for (const n of data.notes) {
				if (!byChapter.has(n.chapter)) byChapter.set(n.chapter, []);
				byChapter.get(n.chapter)!.push({ verse: n.verse, text: n.note });
			}

			for (const [chapterNum, notes] of byChapter) {
				await mkdir(bookOutDir, { recursive: true });
				await writeFile(join(bookOutDir, `${chapterNum}.json`), JSON.stringify(notes));
				cpdvNotesCount++;
			}
		}

		console.log(`✓ cpdv-notes: wrote ${cpdvNotesCount} chapter note files → ${cpdvNotesOutBase}`);
	} catch {
		console.log(`CPDV notes source not found at ${cpdvNotesSrc} — skipping.`);
	}

	// --- Confraternity intros → static/data/conf-intros/{odrSlug}.json ---
	const confIntroSrc = join(ODR_PARENT, 'Confraternity', 'JSON_Converted', 'JSON_intros');
	try {
		await access(confIntroSrc);
		const confIntroOutDir = join(PROJECT_ROOT, 'static', 'data', 'conf-intros');
		await mkdir(confIntroOutDir, { recursive: true });

		const introFiles = await readdir(confIntroSrc);
		let introCount = 0;

		for (const file of introFiles) {
			if (!file.endsWith('.json')) continue;

			// Strip leading number prefix and '-intro.json' suffix.
			// Skip malformed names that contain '.json' before '-intro.json'.
			const rawSlug = file.replace(/^\d+-/, '').replace(/-intro\.json$/, '');
			if (rawSlug.includes('.json')) continue; // malformed filename — skip

			const raw = await readFile(join(confIntroSrc, file), 'utf-8');
			const data = JSON.parse(raw) as { book: string; introduction: string[] };
			if (!Array.isArray(data.introduction)) continue;

			// Confraternity files already use ODR slugs (e.g. 'apocalypse', not 'revelation')
			// so no remap is needed — rawSlug is the correct ODR slug.
			await writeFile(join(confIntroOutDir, `${rawSlug}.json`), JSON.stringify(data.introduction));
			introCount++;
			console.log(`✓ conf-intros/${rawSlug}`);
		}

		console.log(`✓ conf-intros: wrote ${introCount} intro files → ${confIntroOutDir}`);
	} catch {
		console.log(`Conf intro source not found at ${confIntroSrc} — skipping.`);
	}

	await buildSearchIndexes();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
