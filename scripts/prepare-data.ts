// @ts-nocheck — build script run with tsx, not part of the Svelte app
import { readdir, readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildSearchIndexes } from './build-search-index.js';
import { cleanVerseText } from './clean-verse-text.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const ODR_SOURCE = join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'ODR', 'ODR');
const ODR_PARENT = join(PROJECT_ROOT, '..', 'SCRIPTURA', 'sources', 'ODR');
const KNOX_ACROSTICS_FILE = join(__dirname, 'data', 'knox-acrostics.json');
const KJV_PSALM_TITLES_FILE = join(__dirname, 'data', 'kjv-psalm-titles.json');

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

/**
 * Knox reproduced the Hebrew alphabetic acrostics in English, and the New
 * Advent HTML this data descends from marks each stanza's initial with
 * <strong>. The conversion dropped the tag and left a space behind, so verses
 * arrive as "A h, blessed they".
 *
 * The space cannot be closed by rule. "A far from wrong-doing" runs together
 * while "A man who has found a vigorous wife" keeps its space, and the letter
 * alone does not say which, since A, I and O are also words. So the 479 sites
 * are enumerated in knox-acrostics.json, taken from the markup itself; see
 * generate-knox-acrostics.ts. Seven of them keep their space and are recorded
 * so the list stays a full account of the acrostics rather than only the
 * repairs.
 */
type AcrosticSite = [number, number, string, string, boolean];
let knoxAcrostics: Record<string, AcrosticSite[]> = {};

async function loadKnoxAcrostics() {
	try {
		knoxAcrostics = JSON.parse(await readFile(KNOX_ACROSTICS_FILE, 'utf-8'));
	} catch {
		console.log('knox-acrostics.json not found — Knox acrostic initials left as-is.');
	}
}

/**
 * KJV psalm superscriptions, recovered from the USFM \d markers the conversion
 * dropped. They are stored as verse 0, the convention the ODR data already uses
 * for text that belongs to a chapter rather than to a numbered verse: the KJV
 * prints its superscription as an unnumbered heading, so calling it verse 1
 * would put every later citation out by one.
 */
let kjvPsalmTitles: Record<string, string> = {};

async function loadKjvPsalmTitles() {
	try {
		kjvPsalmTitles = JSON.parse(await readFile(KJV_PSALM_TITLES_FILE, 'utf-8'));
	} catch {
		console.log('kjv-psalm-titles.json not found — KJV psalms will have no superscriptions.');
	}
}

/**
 * Closes the gap after each acrostic initial in one verse and tags the letter.
 *
 * <ac> follows the convention the ODR data already uses for inline markup
 * (<cr>, <na>, <mn>): the reader styles it, and stripTags drops it wherever
 * plain text is wanted. The seven initials that are words in their own right
 * keep their space and are tagged just the same, since they are as much a part
 * of the acrostic as the rest.
 */
function markKnoxAcrostics(text: string, slug: string, chapter: number, verse: number): string {
	const sites = knoxAcrostics[slug];
	if (!sites) return text;
	let out = text;
	for (const [ch, v, letter, context, joins] of sites) {
		if (ch !== chapter || v !== verse) continue;
		const gap = joins ? '' : ' ';
		out = out.replace(`${letter} ${context}`, `<ac>${letter}</ac>${gap}${context}`);
	}
	return out;
}

/** The KJV superscription for a psalm, as a verse 0, or nothing. */
function kjvPsalmTitleVerse(
	translationId: string,
	slug: string,
	chapter: number
): Array<{ verse: number; text: string }> {
	if (translationId !== 'kjv' || slug !== 'psalms') return [];
	const title = kjvPsalmTitles[String(chapter)];
	return title ? [{ verse: 0, text: title }] : [];
}

async function main() {
	await loadKnoxAcrostics();
	await loadKjvPsalmTitles();
	// Source data lives in SCRIPTURA (local only) — skip book copying on CI where
	// static/data/odr/ is already committed, but always build search indexes.
	try {
		await readdir(ODR_SOURCE);
	} catch {
		console.log(`Source not found at ${ODR_SOURCE} — skipping book copy (using committed data).`);
		await buildSearchIndexes();
		return;
	}

	// The ODR books are NOT regenerated here. static/data/odr/ is maintained in
	// this repo and has moved well past the SCRIPTURA export: it carries
	// book_title, short_title, hebrew_title and intros, which the export has
	// never had, along with text and marginal-note corrections made since. Of the
	// 77 books, 75 now differ. Copying the export over them would drop all of it.
	//
	// The copy step that used to live here also mis-derived slugs, stripping the
	// leading digit from 1-corinthians and collapsing 1/2/3-john onto one name. It
	// went unnoticed because ODR_SOURCE points a directory above the book files,
	// so it read an empty list and wrote nothing. Reaching for the correct path
	// without reading this would have overwritten the corpus.
	//
	// ODR_SOURCE is still probed above, as the test for whether this machine has
	// the sources the translation copy below needs.

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
					verses: [
						...kjvPsalmTitleVerse(translation.id, odrSlug, ch.chapter),
						...ch.verses.map((v) => ({
							verse: v.verse,
							text:
								translation.id === 'knox'
									? markKnoxAcrostics(cleanVerseText(v.text), odrSlug, ch.chapter, v.verse)
									: cleanVerseText(v.text)
						}))
					]
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
				chapters?: Array<{
					chapter: number;
					crossrefs?: Array<{ marker: number; verse: number; refs: string }>;
				}>;
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

		console.log(
			`✓ drc-crossrefs: wrote ${drcCrossRefsCount} chapter cross-ref files → ${drcCrossRefsOutBase}`
		);
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

	// --- KJV chapter notes → static/data/kjv-notes/{odrSlug}/{chapter}.json ---
	//
	// Two source directories: kjv-notes (canonical, ODR-slug filenames already)
	// and kjv-notes-apocrypha (KJV Apocrypha numbering, which does not line up
	// 1:1 with ODR slugs/chapters — see the remap table below). Both were
	// checked file-by-file against the ODR book list and the already-live
	// static/data/kjv/*.json full text before writing this:
	//
	//   - kjv-notes-apocrypha's "1 Esdras"/"2 Esdras" are the KJV Apocrypha's
	//     own Esdras books, distinct from canonical Ezra/Nehemiah (which ODR
	//     also calls "1-esdras"/"2-esdras"). They land on ODR's "3-esdras" and
	//     "4-esdras" instead.
	//   - "jeremie.json" in kjv-notes-apocrypha is the Letter/Epistle of
	//     Jeremiah, which ODR carries as Baruch chapter 6 (already integrated
	//     into static/data/kjv/baruch.json, 73 verses) — not Jeremiah itself.
	//   - "susanna" and "bel-and-dragon" are already folded into
	//     static/data/kjv/daniel.json as chapters 13 and 14, verse numbers
	//     unchanged.
	//   - "prayer-of-azarias" lands in Daniel 3, verse N → verse N+23: Azarias'
	//     own verses 1-23 open in the furnace before Nebuchadnezzar's KJV v24
	//     ("astonied..."), so v1 of Azarias becomes Daniel 3:24, ...,
	//     v68 becomes 3:91. static/data/kjv/daniel.json chapter 3 was spliced
	//     to carry the Azariah text at exactly this offset (verses 1-23 kept,
	//     Azariah's 68 verses inserted as 24-91, native 24-30 shifted to
	//     92-98) — see the source KJV/JSON_Converted/32-daniel.json.
	//   - "esther.json" exists in both source dirs (canonical ch. 1-10,
	//     apocrypha ch. 12-16 — the Greek additions) with no chapter overlap,
	//     so both just write into the same output directory.
	//   - "prayer-of-manasses" already matches its ODR/app slug directly.
	const kjvNotesCanonicalSrc = join(ODR_PARENT, 'KJV', 'kjv-notes');
	const kjvNotesApocryphaSrc = join(ODR_PARENT, 'KJV', 'kjv-notes-apocrypha');
	try {
		await access(kjvNotesCanonicalSrc);
		const kjvNotesOutBase = join(PROJECT_ROOT, 'static', 'data', 'kjv-notes');
		await mkdir(kjvNotesOutBase, { recursive: true });
		let kjvNotesCount = 0;

		type KjvNotesFile = Array<{
			chapter: number;
			verses?: Array<{ verse: number; text: string }>;
		}>;

		async function writeKjvNotes(
			odrSlug: string,
			chapters: KjvNotesFile,
			chapterOverride?: number,
			verseOffset = 0
		) {
			const bookOutDir = join(kjvNotesOutBase, odrSlug);
			for (const ch of chapters) {
				if (!Array.isArray(ch.verses) || ch.verses.length === 0) continue;
				await mkdir(bookOutDir, { recursive: true });
				const outChapter = chapterOverride ?? ch.chapter;
				const verses = verseOffset
					? ch.verses.map((v) => ({ ...v, verse: v.verse + verseOffset }))
					: ch.verses;
				await writeFile(join(bookOutDir, `${outChapter}.json`), JSON.stringify(verses));
				kjvNotesCount++;
			}
		}

		for (const file of await readdir(kjvNotesCanonicalSrc)) {
			if (!file.endsWith('.json')) continue;
			const raw = await readFile(join(kjvNotesCanonicalSrc, file), 'utf-8');
			const data = JSON.parse(raw) as KjvNotesFile;
			if (!Array.isArray(data)) continue;
			await writeKjvNotes(file.replace('.json', ''), data);
		}

		const APOCRYPHA_SLUG_REMAP: Record<string, string> = {
			'1-esdras': '3-esdras',
			'2-esdras': '4-esdras',
			jeremie: 'baruch',
			susanna: 'daniel',
			'bel-and-dragon': 'daniel',
			'prayer-of-azarias': 'daniel'
		};
		const APOCRYPHA_CHAPTER_OVERRIDE: Record<string, number> = {
			jeremie: 6,
			susanna: 13,
			'bel-and-dragon': 14,
			'prayer-of-azarias': 3
		};
		const APOCRYPHA_VERSE_OFFSET: Record<string, number> = {
			'prayer-of-azarias': 23
		};

		try {
			await access(kjvNotesApocryphaSrc);
			for (const file of await readdir(kjvNotesApocryphaSrc)) {
				if (!file.endsWith('.json')) continue;
				const baseName = file.replace('.json', '');
				const raw = await readFile(join(kjvNotesApocryphaSrc, file), 'utf-8');
				const data = JSON.parse(raw) as KjvNotesFile;
				if (!Array.isArray(data)) continue;
				const odrSlug = APOCRYPHA_SLUG_REMAP[baseName] ?? baseName;
				await writeKjvNotes(
					odrSlug,
					data,
					APOCRYPHA_CHAPTER_OVERRIDE[baseName],
					APOCRYPHA_VERSE_OFFSET[baseName] ?? 0
				);
			}
		} catch {
			console.log(`KJV apocrypha notes source not found at ${kjvNotesApocryphaSrc} — skipping.`);
		}

		console.log(`✓ kjv-notes: wrote ${kjvNotesCount} chapter note files → ${kjvNotesOutBase}`);
	} catch {
		console.log(`KJV notes source not found at ${kjvNotesCanonicalSrc} — skipping.`);
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

	// ── Fathers commentary data (ACCS + FKB) ────────────────────────
	try {
		await import('./build-fathers-data.js');
		console.log('Fathers commentary data built.');
	} catch {
		console.log('Fathers build skipped (source not available).');
	}

	// ── Glossa Ordinaria (Latin, for the Vulgate panel) ─────────────
	try {
		await import('./build-glossa-data.js');
		console.log('Glossa Ordinaria data built.');
	} catch (e) {
		console.log(`Glossa build skipped: ${e instanceof Error ? e.message : e}`);
	}

	await buildSidecarManifest();
	await buildSearchIndexes();
}

/** Scans per-chapter sidecar dirs and writes a single manifest used to avoid
 *  fetching files that don't exist (which would 404 in the browser console). */
async function buildSidecarManifest() {
	const manifestDir = join(PROJECT_ROOT, 'static', 'data', 'manifests');
	await mkdir(manifestDir, { recursive: true });
	const dataRoot = join(PROJECT_ROOT, 'static', 'data');

	async function scanChapters(base: string): Promise<Record<string, number[]>> {
		const out: Record<string, number[]> = {};
		let slugs: string[];
		try {
			slugs = await readdir(base);
		} catch {
			return out;
		}
		for (const slug of slugs) {
			const dir = join(base, slug);
			let files: string[];
			try {
				files = await readdir(dir);
			} catch {
				continue;
			}
			const chs: number[] = [];
			for (const f of files) {
				const m = /^(\d+)\.json$/.exec(f);
				if (m) chs.push(parseInt(m[1], 10));
			}
			if (chs.length) out[slug] = chs.sort((a, b) => a - b);
		}
		return out;
	}

	async function scanAnnotations(): Promise<Record<string, number[]>> {
		const out: Record<string, number[]> = {};
		const base = join(dataRoot, 'odr');
		let slugs: string[];
		try {
			slugs = await readdir(base);
		} catch {
			return out;
		}
		for (const slug of slugs) {
			const dir = join(base, slug, 'annotations');
			let files: string[];
			try {
				files = await readdir(dir);
			} catch {
				continue;
			}
			const chs: number[] = [];
			for (const f of files) {
				const m = /^(\d+)\.json$/.exec(f);
				if (m) chs.push(parseInt(m[1], 10));
			}
			if (chs.length) out[slug] = chs.sort((a, b) => a - b);
		}
		return out;
	}

	const sections = [
		'odr-notes',
		'drc-notes',
		'drc-crossrefs',
		'cpdv-notes',
		'knox-notes',
		'kjv-notes',
		'conf-footnotes',
		'conf-commentary',
		'haydock-commentary',
		'haydock-crossrefs',
		'glossa'
	];
	const manifest: Record<string, Record<string, number[]>> = {
		annotations: await scanAnnotations()
	};
	for (const section of sections) {
		manifest[section] = await scanChapters(join(dataRoot, section));
	}
	await writeFile(join(manifestDir, 'sidecars.json'), JSON.stringify(manifest));
	console.log('✓ sidecar manifest written → static/data/manifests/sidecars.json');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
