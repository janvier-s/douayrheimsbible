/**
 * scripts/apply-ae-ligature.ts
 *
 * One-time data fix: replace ae/Ae/AE → æ/Æ in all verse text and annotation
 * text across static/data/odr/, preserving Hebrew-origin proper nouns where
 * "ae" is not a Latin diphthong.
 *
 * Run once: npx tsx scripts/apply-ae-ligature.ts
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ODR_DIR = join(__dirname, '..', 'static', 'data', 'odr');

// ── Hebrew-origin proper nouns: "ae" here is NOT a Latin diphthong ────────────
// These are restored after the blanket ae→æ pass.
// List every inflected form explicitly so partial matches can't slip through.
const PRESERVE = [
	// Israel family
	'Israel',
	'Israelite',
	'Israelites',
	'Israelitical',
	// Michael
	'Michael',
	'Michaelmas',
	// Raphael
	'Raphael',
	// Ishmael / Ismael
	'Ishmael',
	'Ismael',
	'Ismaelite',
	'Ismaelites',
	// Nathanael
	'Nathanael',
	// Hazael
	'Hazael',
	// Asael
	'Asael',
	// Misael / Mizael
	'Misael',
	'Mizael',
	// Mathusael
	'Mathusael',
	// Jezrael / Iezraelite / Jesraelite
	'Jezrael',
	'Iezraelite',
	'Jesraelite',
	// Minor biblical names
	'Lael',
	'Phedael',
	'Subael',
	'Jathanael',
	'Jeramael',
	'Iephthael',
	'Iebnael',
	'Maviael',
	'Zaraei',
	'Asrael',
	'Azael',
	'Abimael'
];

// Pre-compute: for each preserved word, what it looks like after ae→æ pass
const RESTORE_MAP: Array<[RegExp, string]> = PRESERVE.map((word) => {
	const ligatureForm = word.replace(/AE/g, 'Æ').replace(/Ae/g, 'Æ').replace(/ae/g, 'æ');
	if (ligatureForm === word) return null; // no ae in this word, skip
	// Use word boundary to avoid partial matches (e.g. "Isræl" inside "Isræelite")
	// Sort longer words first (handled by sorting PRESERVE by length desc before mapping)
	return [new RegExp(ligatureForm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), word];
}).filter(Boolean) as Array<[RegExp, string]>;

// Sort restore map: longer ligature forms first to avoid partial-word clobbering
RESTORE_MAP.sort((a, b) => b[1].length - a[1].length);

function applyLigatures(text: string): string {
	// Step 1: blanket replacement
	let t = text.replace(/AE/g, 'Æ').replace(/Ae/g, 'Æ').replace(/ae/g, 'æ');
	// Step 2: restore Hebrew-origin names
	for (const [pattern, original] of RESTORE_MAP) {
		t = t.replace(pattern, original);
	}
	return t;
}

// ── JSON field transformers ───────────────────────────────────────────────────

function transformBook(data: Record<string, unknown>): Record<string, unknown> {
	const chapters = (data.chapters as Record<string, unknown>[]).map((ch) => {
		const verses = (ch.verses as Record<string, unknown>[]).map((v) => ({
			...v,
			text: applyLigatures(v.text as string)
		}));

		return {
			...ch,
			summary: ch.summary ? applyLigatures(ch.summary as string) : ch.summary,
			summary_notes: ch.summary_notes
				? (ch.summary_notes as Record<string, unknown>[]).map((n) => ({
						...n,
						text: applyLigatures(n.text as string)
					}))
				: ch.summary_notes,
			verses
		};
	});

	return { ...data, chapters };
}

function transformAnnotation(data: Record<string, unknown>): Record<string, unknown> {
	const annotations = (data.annotations as Record<string, unknown>[]).map((ann) => {
		const notes = ann.notes
			? (ann.notes as Record<string, unknown>[]).map((n) => ({
					...n,
					text: applyLigatures(n.text as string)
				}))
			: ann.notes;

		return {
			...ann,
			title: ann.title ? applyLigatures(ann.title as string) : ann.title,
			text: applyLigatures(ann.text as string),
			notes
		};
	});

	return { ...data, annotations };
}

// ── File walker ───────────────────────────────────────────────────────────────

async function processDir(dir: string): Promise<{ files: number; changed: number }> {
	let files = 0;
	let changed = 0;

	const entries = await readdir(dir);
	for (const entry of entries) {
		const full = join(dir, entry);
		const info = await stat(full);

		if (info.isDirectory()) {
			const sub = await processDir(full);
			files += sub.files;
			changed += sub.changed;
			continue;
		}

		if (!entry.endsWith('.json')) continue;
		files++;

		const raw = await readFile(full, 'utf-8');
		const data = JSON.parse(raw) as Record<string, unknown>;

		let transformed: Record<string, unknown>;
		if ('chapters' in data) {
			transformed = transformBook(data);
		} else if ('annotations' in data) {
			transformed = transformAnnotation(data);
		} else {
			continue;
		}

		const out = JSON.stringify(transformed);
		if (out !== JSON.stringify(data)) {
			await writeFile(full, out, 'utf-8');
			changed++;
		}
	}

	return { files, changed };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const { files, changed } = await processDir(ODR_DIR);
console.log(`Processed ${files} JSON files, updated ${changed}.`);
