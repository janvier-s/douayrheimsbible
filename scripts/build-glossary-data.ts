// scripts/build-glossary-data.ts
// @ts-nocheck: build script run with tsx
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const OUT_DIR = join(PROJECT_ROOT, 'static', 'data', 'glossary');

/** The corpus lives outside this repo. Probe in order, and skip cleanly when
 *  none is present so Cloudflare builds use the committed JSON. */
function resolveSource(): string | null {
	const candidates = [
		process.env.GLOSSARY_SOURCE,
		join(
			homedir(),
			'Documents',
			'Bible n stuff',
			'Websites',
			'TDR',
			'Glossary',
			'vulgate_glossary_full.json'
		)
	];
	for (const c of candidates) {
		if (c && existsSync(c)) return c;
	}
	return null;
}

const SOURCE = resolveSource();

if (!SOURCE) {
	console.log('Glossary source not found; skipping build (using committed data).');
} else {
	buildGlossary(SOURCE);
}

function buildGlossary(source: string) {
	const raw = JSON.parse(readFileSync(source, 'utf-8'));
	if (!Array.isArray(raw)) {
		throw new Error('Glossary source is not an array of entries.');
	}

	const out: { letter: string; word: string; content: string }[] = [];
	let empty = 0;
	let folded = 0;
	for (const e of raw) {
		if (!e.letter) {
			throw new Error(`Glossary entry missing letter: ${JSON.stringify(e)}`);
		}
		// A handful of source entries have no word, or a bare page number
		// ("21") as the word — stray literature-list continuations that split
		// off from the entry above during extraction. Fold them back in as a
		// trailing paragraph rather than invent a headword or drop them.
		const word = (e.word ?? '').trim();
		if (!word || /^\d+$/.test(word)) {
			const prev = out[out.length - 1];
			if (!prev) {
				throw new Error(
					`Glossary entry with no usable word and no prior entry to fold into: ${JSON.stringify(e)}`
				);
			}
			folded++;
			prev.content = `${prev.content}\n\n${e.content ?? ''}`.trim();
			continue;
		}
		if (!e.content || !e.content.trim()) empty++;
		out.push({ letter: e.letter, word: e.word, content: e.content ?? '' });
	}
	if (folded > 0) console.log(`  Folded ${folded} word-less entries into the preceding term.`);

	mkdirSync(OUT_DIR, { recursive: true });
	writeFileSync(join(OUT_DIR, 'terms.json'), JSON.stringify(out));

	console.log(`✓ Glossary: ${out.length} terms (${empty} redirect-only) → ${OUT_DIR}/terms.json`);
}

// ── Export for pipeline integration ─────────────────────────────
export async function buildGlossaryData(): Promise<void> {
	// Already runs on import; this is a no-op wrapper for prepare-data.ts,
	// matching build-glossa-data.ts.
}
