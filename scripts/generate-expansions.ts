/**
 * generate-expansions.ts
 *
 * One-time script that:
 * 1. Extracts all unique words from ODR verse text, notes, and annotations
 * 2. Cross-references against `spelling-variations` for British→American pairs
 * 3. Flags potentially archaic words for manual review
 * 4. Outputs src/lib/search/query-expansions.json
 * 5. Outputs scripts/flagged-words.txt
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sv_raw from 'spelling-variations';

// Handle tsx/CJS interop: the module may be wrapped as { default: Class }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpellingVariations: new (word: string) => {
	hasVariations(): boolean;
	toUS(): string;
	toUK(): string;
	scoreUK(): number;
	scoreUS(): number;
	USVariations(): string[];
	UKVariations(): string[];
} = ((sv_raw as unknown as { default: unknown }).default ?? sv_raw) as never;

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'static', 'data', 'odr');
const EXPANSIONS_OUT = join(PROJECT_ROOT, 'src', 'lib', 'search', 'query-expansions.json');
const FLAGGED_OUT = join(__dirname, 'flagged-words.txt');

// ---------------------------------------------------------------------------
// HTML stripping (mirrors build-search-index.ts logic)
// ---------------------------------------------------------------------------
function stripHtml(text: string): string {
	return text
		.replace(/<cr>[^<]*<\/cr>/gi, '')
		.replace(/<na>[^<]*<\/na>/gi, '')
		.replace(/<[^>]+>/g, '');
}

function tokenize(text: string): string[] {
	return stripHtml(text)
		.toLowerCase()
		.split(/[\s.,;:!?()"'\[\]{}|\\/<>@#$%^&*+=~`]+/)
		.map((w) => w.replace(/^[-–—]+|[-–—]+$/g, '')) // strip leading/trailing hyphens
		.filter((w) => w.length > 1);
}

// ---------------------------------------------------------------------------
// Archaic word heuristics — flag for manual review
// ---------------------------------------------------------------------------
const ARCHAIC_PATTERNS = [
	/eth$/, // hath, doth, giveth …
	/est$/, // thou sayest, thou doest …
	/^thy$|^thou$|^thee$|^thine$|^ye$|^hath$|^doth$|^saith$|^art$|^wilt$|^shalt$/,
];

function looksArchaic(word: string): boolean {
	return ARCHAIC_PATTERNS.some((re) => re.test(word));
}

// ---------------------------------------------------------------------------
// Hyphenated compound detection
// e.g. "to-day" → modern "today"
// We collect all hyphenated words from the corpus then try to map them.
// ---------------------------------------------------------------------------
function compoundToModern(hyphenated: string): string | null {
	const joined = hyphenated.replace(/-/g, '');
	return joined !== hyphenated ? joined : null;
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
interface Verse {
	text?: string;
	notes?: Array<{ text?: string }>;
}

interface Chapter {
	verses?: Verse[];
}

interface BookData {
	chapters?: Chapter[];
}

interface Annotation {
	title?: string;
	text?: string;
	notes?: Array<{ text?: string }>;
}

interface AnnotationFile {
	annotations?: Annotation[];
}

async function collectWordsFromBook(slug: string): Promise<Set<string>> {
	const words = new Set<string>();

	// --- Main book JSON ---
	const bookPath = join(DATA_DIR, `${slug}.json`);
	try {
		const raw = await readFile(bookPath, 'utf-8');
		const data: BookData = JSON.parse(raw);
		for (const chapter of data.chapters ?? []) {
			for (const verse of chapter.verses ?? []) {
				if (verse.text) tokenize(verse.text).forEach((w) => words.add(w));
				for (const note of verse.notes ?? []) {
					if (note.text) tokenize(note.text).forEach((w) => words.add(w));
				}
			}
		}
	} catch {
		// book JSON might not exist for directories without a matching .json
	}

	// --- Annotations ---
	const annotationsDir = join(DATA_DIR, slug, 'annotations');
	try {
		const files = await readdir(annotationsDir);
		for (const file of files) {
			if (!file.endsWith('.json')) continue;
			const raw = await readFile(join(annotationsDir, file), 'utf-8');
			const data: AnnotationFile = JSON.parse(raw);
			for (const ann of data.annotations ?? []) {
				if (ann.title) tokenize(ann.title).forEach((w) => words.add(w));
				if (ann.text) tokenize(ann.text).forEach((w) => words.add(w));
				for (const note of ann.notes ?? []) {
					if (note.text) tokenize(note.text).forEach((w) => words.add(w));
				}
			}
		}
	} catch {
		// no annotations directory — fine
	}

	return words;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
	// 1. Discover all data entries (skip files starting with "search-")
	const entries = await readdir(DATA_DIR);

	// Collect slugs: JSON files (minus extension) that don't start with "search-"
	const bookSlugs = new Set<string>();
	for (const entry of entries) {
		if (entry.startsWith('search-')) continue;
		if (entry.endsWith('.json')) {
			bookSlugs.add(entry.replace(/\.json$/, ''));
		} else {
			// directory slug — may have annotations but no matching .json
			bookSlugs.add(entry);
		}
	}

	console.log(`Found ${bookSlugs.size} book slugs to process.`);

	// 2. Extract all unique words
	const allWords = new Set<string>();
	for (const slug of bookSlugs) {
		const words = await collectWordsFromBook(slug);
		words.forEach((w) => allWords.add(w));
	}

	console.log(`Extracted ${allWords.size} unique words.`);

	// 3. Separate hyphenated words
	const hyphenatedWords = [...allWords].filter((w) => w.includes('-'));
	const plainWords = [...allWords].filter((w) => !w.includes('-'));

	// 4. Build expansions map: American spelling → [British/archaic variants]
	//    The search engine normalises to American; we want queries for the
	//    American form to also match the British/archaic form in the index.
	const expansions: Record<string, string[]> = {};
	const flagged: string[] = [];

	// 4a. British→American via spelling-variations (plain words)
	for (const word of plainWords) {
		try {
			const sv = new SpellingVariations(word);
			if (!sv.hasVariations()) continue;

			const us = sv.toUS();
			const uk = sv.toUK();

			// Only add if the word is the UK form and US form differs
			if (us && us !== word && uk === word) {
				// word is British; us is the American equivalent
				if (!expansions[us]) expansions[us] = [];
				if (!expansions[us].includes(word)) {
					expansions[us].push(word);
				}
			}
		} catch {
			// library can't handle this word — skip
		}
	}

	// 4b. Hyphenated compound expansions
	//     e.g. corpus has "to-day" → map "today" → ["to-day"]
	for (const hyph of hyphenatedWords) {
		const modern = compoundToModern(hyph);
		if (!modern) continue;
		// Only map if the modern form (without hyphens) is a real word in common use
		// We do a loose check: does the spelling-variations library know it, or is it
		// just a concatenation? We'll include it if modern form has at least 4 chars.
		if (modern.length >= 4) {
			if (!expansions[modern]) expansions[modern] = [];
			if (!expansions[modern].includes(hyph)) {
				expansions[modern].push(hyph);
			}
		}
	}

	// 4c. Deduplicate and sort the expansions keys
	const sortedExpansions: Record<string, string[]> = {};
	for (const key of Object.keys(expansions).sort()) {
		const variants = [...new Set(expansions[key])].sort();
		// Skip if the only "expansion" is identical to the key
		const meaningful = variants.filter((v) => v !== key);
		if (meaningful.length > 0) {
			sortedExpansions[key] = meaningful;
		}
	}

	// 5. Flag archaic words
	for (const word of [...allWords].sort()) {
		if (looksArchaic(word)) {
			flagged.push(word);
		}
	}

	console.log(`Generated ${Object.keys(sortedExpansions).length} expansion entries.`);
	console.log(`Flagged ${flagged.length} potentially archaic words.`);

	// 6. Write outputs
	await writeFile(EXPANSIONS_OUT, JSON.stringify(sortedExpansions, null, '\t') + '\n', 'utf-8');
	console.log(`Wrote ${EXPANSIONS_OUT}`);

	const flaggedContent =
		`# Potentially archaic words from ODR corpus\n` +
		`# Review these for manual expansion entries\n` +
		`# Generated: ${new Date().toISOString()}\n\n` +
		flagged.join('\n') +
		'\n';
	await writeFile(FLAGGED_OUT, flaggedContent, 'utf-8');
	console.log(`Wrote ${FLAGGED_OUT}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
