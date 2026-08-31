// scripts/build-textual-notes-data.ts
// @ts-nocheck: build script run with tsx
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { TEXTUAL_NOTES_BOOK_MAP, parseRef } from './textual-notes-lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUT_DIR = join(PROJECT_ROOT, 'static', 'data', 'textual-notes');

/** The corpus lives outside this repo. Probe in order, and skip cleanly when
 *  none is present so Cloudflare builds use the committed JSON. */
function resolveSource(): string | null {
	const candidates = [
		process.env.TEXTUAL_NOTES_SOURCE,
		join(homedir(), 'Documents', 'Bible n stuff', 'Websites', 'TDR', 'Vul Notes')
	];
	for (const c of candidates) {
		if (c && existsSync(c)) return c;
	}
	return null;
}

const SOURCE = resolveSource();

if (!SOURCE) {
	console.log('Textual notes source not found; skipping build (using committed data).');
} else {
	buildTextualNotes(SOURCE);
}

function buildTextualNotes(source: string) {
	// entries grouped by "slug/chapter" -> array of {verse, ref, note}
	const byChapter = new Map<string, object[]>();
	let entries = 0;
	let dropped = 0;
	const unmapped = new Set<string>();
	const unparsed: string[] = [];

	for (const group of readdirSync(source, { withFileTypes: true })) {
		if (!group.isDirectory()) continue;
		const groupDir = join(source, group.name);
		for (const file of readdirSync(groupDir)) {
			if (!file.endsWith('.json')) continue;
			const data = JSON.parse(readFileSync(join(groupDir, file), 'utf-8'));
			for (const e of data.entries ?? []) {
				entries++;
				const parsed = parseRef(e.ref);
				if (!parsed) {
					unparsed.push(e.ref);
					dropped++;
					continue;
				}
				const slug = TEXTUAL_NOTES_BOOK_MAP[parsed.abbrev];
				if (!slug) {
					unmapped.add(parsed.abbrev);
					dropped++;
					continue;
				}
				const key = `${slug}/${parsed.chapter}`;
				if (!byChapter.has(key)) byChapter.set(key, []);
				byChapter.get(key)!.push({ verse: parsed.verse, ref: e.ref, note: e.note });
			}
		}
	}

	let files = 0;
	const books = new Set<string>();
	for (const [key, out] of byChapter) {
		out.sort((a: any, b: any) => a.verse - b.verse);
		const [slug] = key.split('/');
		const bookDir = join(OUT_DIR, slug);
		mkdirSync(bookDir, { recursive: true });
		const chapter = key.slice(slug.length + 1);
		writeFileSync(join(bookDir, `${chapter}.json`), JSON.stringify(out));
		files++;
		books.add(slug);
	}

	console.log(`✓ Textual notes: ${entries} entries, ${dropped} dropped (unmapped/unparsed).`);
	if (unmapped.size > 0) {
		console.log(`  Unmapped book abbreviations: ${[...unmapped].join(', ')}`);
	}
	console.log(`✓ Textual notes: ${files} chapter files across ${books.size} books.`);
}

// ── Export for pipeline integration ─────────────────────────────
export async function buildTextualNotesData(): Promise<void> {
	// Already runs on import; this is a no-op wrapper for prepare-data.ts,
	// matching build-glossa-data.ts.
}
