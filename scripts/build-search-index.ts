import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import MiniSearch from 'minisearch';
import { searchTokenizer, processTerm } from '../src/lib/search/normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'static', 'data', 'odr');

interface VerseDoc {
	id: string;
	book: string;
	chapter: number;
	verse: number;
	text: string;
}

interface NoteDoc {
	id: string;
	book: string;
	chapter: number;
	verse: number;
	text: string;
	type: string;
}

function stripHtml(text: string): string {
	return text
		.replace(/<cr>[^<]*<\/cr>/g, '')
		.replace(/<na>[^<]*<\/na>/g, '')
		.replace(/<[^>]+>/g, '');
}

function cleanText(text: string): string {
	return stripHtml(text)
		.replace(/\[[\d]+\]/g, '')
		.replace(/  +/g, ' ')
		.trim();
}

const MINISEARCH_OPTIONS = {
	fields: ['text'] as const,
	storeFields: ['book', 'chapter', 'verse'] as string[],
	tokenize: searchTokenizer,
	processTerm
};

const NOTES_MINISEARCH_OPTIONS = {
	...MINISEARCH_OPTIONS,
	storeFields: ['book', 'chapter', 'verse', 'type'] as string[]
};

async function buildVerseIndex(): Promise<void> {
	const miniSearch = new MiniSearch(MINISEARCH_OPTIONS);
	const docs: VerseDoc[] = [];

	const files = await readdir(DATA_DIR);
	for (const file of files.sort()) {
		if (!file.endsWith('.json') || file.startsWith('search-')) continue;
		const raw = await readFile(join(DATA_DIR, file), 'utf-8');
		const book = JSON.parse(raw);
		if (!book.book || !book.chapters) continue;

		const slug = file.replace('.json', '');
		const seen = new Map<string, number>();
		for (const ch of book.chapters) {
			for (const v of ch.verses) {
				const baseId = `${slug}:${ch.chapter}:${v.verse}`;
				const count = seen.get(baseId) ?? 0;
				seen.set(baseId, count + 1);
				const id = count === 0 ? baseId : `${baseId}:${count}`;
				docs.push({
					id,
					book: slug,
					chapter: ch.chapter,
					verse: v.verse,
					text: cleanText(v.text)
				});
			}
		}
	}

	miniSearch.addAll(docs);
	const json = JSON.stringify(miniSearch);
	await writeFile(join(DATA_DIR, 'search-index.json'), json);
	console.log(
		`✓ Verse search index: ${docs.length} documents (${(json.length / 1024 / 1024).toFixed(2)} MB)`
	);
}

async function buildNotesIndex(): Promise<void> {
	const miniSearch = new MiniSearch(NOTES_MINISEARCH_OPTIONS);
	const docs: NoteDoc[] = [];
	const usedIds = new Set<string>();

	function makeUniqueId(base: string): string {
		if (!usedIds.has(base)) {
			usedIds.add(base);
			return base;
		}
		let n = 1;
		while (usedIds.has(`${base}:${n}`)) n++;
		const id = `${base}:${n}`;
		usedIds.add(id);
		return id;
	}

	const files = await readdir(DATA_DIR);
	for (const file of files.sort()) {
		if (!file.endsWith('.json') || file.startsWith('search-')) continue;
		const raw = await readFile(join(DATA_DIR, file), 'utf-8');
		const book = JSON.parse(raw);
		if (!book.book || !book.chapters) continue;

		const slug = file.replace('.json', '');

		// Index inline verse notes
		for (const ch of book.chapters) {
			for (const v of ch.verses) {
				if (v.notes) {
					for (let i = 0; i < v.notes.length; i++) {
						const note = v.notes[i];
						const text = cleanText(note.text);
						if (text) {
							docs.push({
								id: makeUniqueId(`${slug}:${ch.chapter}:${v.verse}:n${i}`),
								book: slug,
								chapter: ch.chapter,
								verse: v.verse,
								text,
								type: 'note'
							});
						}
					}
				}
			}
		}

		// Index annotation sidecars
		const annotDir = join(DATA_DIR, slug, 'annotations');
		try {
			const annFiles = await readdir(annotDir);
			for (const annFile of annFiles.sort()) {
				if (!annFile.endsWith('.json')) continue;
				const annPath = join(annotDir, annFile);
				const annRaw = await readFile(annPath, 'utf-8');
				const annData = JSON.parse(annRaw);
				if (!annData.annotations) continue;

				for (let i = 0; i < annData.annotations.length; i++) {
					const ann = annData.annotations[i];
					const parts: string[] = [];
					if (ann.title) parts.push(ann.title);
					if (ann.text) parts.push(cleanText(ann.text));
					if (ann.notes) {
						for (const n of ann.notes) {
							if (n.text) parts.push(cleanText(n.text));
						}
					}
					const text = parts.join(' ');
					if (text) {
						docs.push({
							id: makeUniqueId(`${slug}:${annData.chapter}:${ann.verse || 0}:a${i}`),
							book: slug,
							chapter: annData.chapter,
							verse: ann.verse || 0,
							text,
							type: 'annotation'
						});
					}
				}
			}
		} catch {
			// No annotations directory for this book — skip
		}
	}

	miniSearch.addAll(docs);
	const json = JSON.stringify(miniSearch);
	await writeFile(join(DATA_DIR, 'search-notes-index.json'), json);
	console.log(
		`✓ Notes search index: ${docs.length} documents (${(json.length / 1024 / 1024).toFixed(2)} MB)`
	);
}

export async function buildSearchIndexes(): Promise<void> {
	console.log('\nBuilding search indexes...');
	await buildVerseIndex();
	await buildNotesIndex();
}

// Allow running standalone
if (process.argv[1] && process.argv[1].includes('build-search-index')) {
	buildSearchIndexes().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
