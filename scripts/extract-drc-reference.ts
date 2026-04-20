/**
 * extract-drc-reference.ts
 *
 * Parses DRC (Challoner Douay-Rheims) PSFM source files into reference JSON
 * for the /reference/drc/ pages.
 *
 * Source: ENG-B-DRC1750-pd-PSFM-master/
 *   00-FRT  → title-page, preface, history
 *   48-INT  → nt-preface
 *   80-GLO  → glossary
 *   77-BAK  → topical-index, chronological-nt, chronological-ot
 *
 * Usage: npx tsx scripts/extract-drc-reference.ts <source-dir>
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const SRC_DIR = process.argv[2];
if (!SRC_DIR) {
	console.error('Usage: npx tsx scripts/extract-drc-reference.ts <source-dir>');
	process.exit(1);
}

const OUT_DIR = join(import.meta.dirname!, '..', 'static', 'data', 'reference', 'drc');

// ── Helpers ────────────────────────────────────────────────────────────────

function readSfm(filename: string): string {
	return readFileSync(join(SRC_DIR, filename), 'utf-8');
}

/** Strip inline USFM markers, keeping readable text. */
function cleanInline(text: string): string {
	return (
		text
			// \w word\w* → word
			.replace(/\\w\s+/g, '')
			.replace(/\\w\*/g, '')
			// \rq ref\rq* → ref  (must remove \rq* BEFORE \rq to avoid leaving *)
			.replace(/\\rq\*/g, '')
			.replace(/\\rq/g, ' ')
			// \it text\it* → <i>text</i>
			.replace(/\\it\s+/g, '<i>')
			.replace(/\\it\*/g, '</i>')
			// \em text\em* → <i>text</i>
			.replace(/\\em\s+/g, '<i>')
			.replace(/\\em\*/g, '</i>')
			// remove other backslash markers that might remain
			.replace(/\\ib\d*/g, '')
			.replace(/\\iq\b/g, '')
			.replace(/\\b\d*/g, '')
			// remove stray backslash-tag remnants (e.g. \tcr)
			.replace(/\\[a-z]+\d*/g, '')
			// remove <> artifacts from source
			.replace(/<>/g, ' ')
			// collapse multiple spaces
			.replace(/\s{2,}/g, ' ')
			.trim()
	);
}

/** Split a PSFM file into lines, skipping blank/comment lines. */
function parseLines(content: string): string[] {
	return content.split('\n').filter((l) => l.trim().length > 0);
}

function writeJson(subdir: string, slug: string, data: unknown): void {
	const dir = join(OUT_DIR, subdir);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	const path = join(dir, `${slug}.json`);
	writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
	console.log(`  wrote ${path}`);
}

// ── 00-FRT: Title Page, Preface, History ───────────────────────────────────

function extractFrontMatter(): void {
	const content = readSfm('00-FRT-ENG[B]DRC1750[pd].p.sfm');
	const lines = parseLines(content);

	// -- Title Page: from \imt1 THE HOLY BIBLE to \periph Publication Data
	const titleLines: string[] = [];
	let inTitle = false;
	for (const line of lines) {
		if (line.startsWith('\\imt1 THE HOLY BIBLE')) inTitle = true;
		if (inTitle && line.startsWith('\\periph Publication Data')) break;
		if (inTitle) {
			const stripped = line
				.replace(/^\\imt\d+\s+/, '')
				.replace(/^\\imt\d+/, '')
				.replace(/^\\iq\s*/, '')
				.replace(/^\\ib\d*/, '')
				.replace(/^\\b\d*/, '')
				.trim();
			if (stripped) titleLines.push(cleanInline(stripped));
		}
	}

	writeJson('front', 'title-page', {
		paragraphs: titleLines.map((text) => ({ text, notes: [] }))
	});

	// -- Preface (Version Info): from \periph Preface to \periph Foreword
	const prefaceParas: string[] = [];
	let inPreface = false;
	for (const line of lines) {
		if (line.startsWith('\\periph Preface')) {
			inPreface = true;
			continue;
		}
		if (inPreface && line.startsWith('\\periph')) break;
		if (inPreface) {
			if (line.startsWith('\\h') || line.startsWith('\\toc') || line.startsWith('\\rem')) continue;
			if (line.match(/^\\imt\d/)) {
				const text = line.replace(/^\\imt\d+\s*/, '').trim();
				if (text) prefaceParas.push(`<b>${cleanInline(text)}</b>`);
			} else {
				const text = line.replace(/^\\(im|ip|imi)\s+/, '').trim();
				if (text) prefaceParas.push(cleanInline(text));
			}
		}
	}

	writeJson('front', 'preface', { paragraphs: prefaceParas });

	// -- History (Foreword): from \periph Foreword to \periph Old Testament Title Page
	const historyParas: string[] = [];
	let inHistory = false;
	for (const line of lines) {
		if (line.startsWith('\\periph Foreword')) {
			inHistory = true;
			continue;
		}
		if (inHistory && line.startsWith('\\periph')) break;
		if (inHistory) {
			if (line.startsWith('\\h') || line.startsWith('\\toc') || line.startsWith('\\rem')) continue;
			const text = line
				.replace(/^\\imt\d+\s*/, '')
				.replace(/^\\(im|ip)\s+/, '')
				.trim();
			if (text) {
				if (line.match(/^\\imt\d/)) {
					historyParas.push(`<b>${cleanInline(text)}</b>`);
				} else {
					historyParas.push(cleanInline(text));
				}
			}
		}
	}

	writeJson('front', 'history', { paragraphs: historyParas });
}

// ── 48-INT: NT Preface ("The Preface To The Reader") ───────────────────────

function extractNtPreface(): void {
	const content = readSfm('48-INT-ENG[B]DRC1750[pd].p.sfm');
	const lines = parseLines(content);

	const paras: string[] = [];
	let started = false;

	for (const line of lines) {
		// Start at the first \imt5 or \imt3 (the title)
		if (line.startsWith('\\imt5 The Preface') || line.startsWith('\\imt3To The Reader')) {
			started = true;
			const text = line.replace(/^\\imt\d+\s*/, '').trim();
			if (text) paras.push(`<b>${cleanInline(text)}</b>`);
			continue;
		}
		if (!started) continue;

		// Stop at end or next \periph
		if (line.startsWith('\\periph')) break;
		if (line.startsWith('\\toc') || line.startsWith('\\h') || line.startsWith('\\rem')) continue;

		if (line.startsWith('\\im ') || line.startsWith('\\ip ')) {
			const text = line.replace(/^\\(im|ip)\s+/, '').trim();
			if (text) paras.push(cleanInline(text));
		}
	}

	writeJson('front', 'nt-preface', { paragraphs: paras });
}

// ── 80-GLO: Glossary ("Hard Words Explicated") ────────────────────────────

function extractGlossary(): void {
	const content = readSfm('80-GLO-ENG[B]DRC1750[pd].p.sfm');
	const lines = parseLines(content);

	interface WordEntry {
		word: string;
		definition: string;
	}
	interface LetterGroup {
		letter: string;
		words: WordEntry[];
	}

	const groups: LetterGroup[] = [];
	let currentLetter = '';
	let title = '';
	let subtitle = '';

	for (const line of lines) {
		// Skip metadata
		if (
			line.startsWith('\\id ') ||
			line.startsWith('\\ide ') ||
			line.startsWith('\\h') ||
			line.startsWith('\\rem')
		)
			continue;

		// Title
		if (line.startsWith('\\imt3 ')) {
			title = line.replace('\\imt3 ', '').trim();
			continue;
		}

		// Subtitle
		if (line.startsWith('\\im ')) {
			subtitle = cleanInline(line.replace('\\im ', '').trim());
			continue;
		}

		// Letter heading
		if (line.startsWith('\\imte5 ')) {
			currentLetter = line.replace('\\imte5 ', '').trim();
			groups.push({ letter: currentLetter, words: [] });
			continue;
		}

		// Word entry
		if (line.startsWith('\\ili ')) {
			const entryText = line.replace('\\ili ', '').trim();

			// Extract word: \w Word.\w* or \w Word,\w* etc.
			const wordMatch = entryText.match(/\\w\s+(.+?)\\w\*/);
			if (wordMatch) {
				const rawWord = wordMatch[1].replace(/[.,;:]+$/, '').trim();
				const afterWord = entryText.substring(entryText.indexOf('\\w*') + 3);

				// If the \w...\w* content is a long sentence (>5 words),
				// it's a continuation of the previous entry, not a new word.
				const wordCount = rawWord.split(/\s+/).length;
				if (wordCount > 5 && groups.length > 0) {
					const lastGroup = groups[groups.length - 1];
					if (lastGroup.words.length > 0) {
						const prev = lastGroup.words[lastGroup.words.length - 1];
						const continuation = cleanInline(rawWord).trim();
						const extra = cleanInline(afterWord)
							.trim()
							.replace(/^[.,;:\s]+/, '');
						prev.definition += ' ' + continuation + (extra ? ' ' + extra : '');
						continue;
					}
				}

				// Clean the definition text
				let definition = cleanInline(afterWord).trim();
				// Remove leading punctuation
				definition = definition.replace(/^[.,;:\s]+/, '').trim();

				if (groups.length === 0) {
					groups.push({ letter: '?', words: [] });
				}
				groups[groups.length - 1].words.push({
					word: `<i>${rawWord}</i>`,
					definition
				});
			}
		}
	}

	const titleHtml = `${title.toUpperCase()}<br><span class="ref-title-sub">${subtitle}</span>`;

	writeJson('back', 'glossary', {
		section: 'drc-glossary',
		title: titleHtml,
		entries: groups
	});
}

// ── 77-BAK: Topical Index ──────────────────────────────────────────────────

function extractTopicalIndex(): void {
	const content = readSfm('77-BAK-ENG[B]CPDV2009[pd].p.sfm');
	const lines = parseLines(content);

	interface RawEntry {
		topic: string;
		text: string;
	}

	const rawEntries: RawEntry[] = [];
	let inSection = false;
	let title = '';

	for (const line of lines) {
		if (line.startsWith('\\imt1 A Table of References')) {
			title = cleanInline(line.replace('\\imt1 ', '').trim());
			inSection = true;
			continue;
		}
		if (inSection && line.startsWith('\\periph')) break;
		if (!inSection) continue;

		if (line.startsWith('\\ili ')) {
			const entryText = line.replace('\\ili ', '').trim();

			// Handle \\w (double backslash typo in source)
			const fixedText = entryText.replace(/\\\\w\s+/g, '\\w ').replace(/\\\\w\*/g, '\\w*');

			// Extract topic from \w Topic.\w*
			const topicMatch = fixedText.match(/\\w\s+(.+?)\\w\*/);
			if (topicMatch) {
				const topic = topicMatch[1].replace(/[.,;:]+$/, '').trim();
				const afterTopic = fixedText.substring(fixedText.indexOf('\\w*') + 3);
				const text = cleanInline(afterTopic)
					.trim()
					.replace(/^[.,;:\s]+/, '');

				rawEntries.push({ topic, text });
			}
		}
	}

	// Group by first letter → alpha-entries format (matches existing rendering)
	const letterGroups = new Map<string, string[]>();
	for (const e of rawEntries) {
		// Get first letter, stripping "The " prefix
		const stripped = e.topic.replace(/^The\s+/i, '');
		const letter = stripped.charAt(0).toUpperCase();
		if (!letterGroups.has(letter)) letterGroups.set(letter, []);
		letterGroups.get(letter)!.push(`<i>${e.topic}.</i> ${e.text}`);
	}

	const entries = Array.from(letterGroups.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([letter, items]) => ({ letter, entries: items }));

	writeJson('back', 'topical-index', {
		section: 'drc-topical-index',
		title: title.toUpperCase(),
		entries
	});
}

// ── 77-BAK: NT Chronological Index ─────────────────────────────────────────

function extractChronologicalNt(): void {
	const content = readSfm('77-BAK-ENG[B]CPDV2009[pd].p.sfm');
	const lines = parseLines(content);

	const paras: string[] = [];
	let inSection = false;
	let title = '';

	for (const line of lines) {
		if (line.startsWith('\\imt1 An Historical and Chronological Index to the New Testament')) {
			title = cleanInline(line.replace('\\imt1 ', '').trim());
			inSection = true;
			continue;
		}
		if (
			inSection &&
			(line.startsWith('\\periph') ||
				line.startsWith('\\imt1 An Historical and Chronological Index to the Old'))
		)
			break;
		if (!inSection) continue;

		// Year heading: \is4 or \s4 → bold paragraph
		if (line.match(/^\\[is]s?4\s+/)) {
			const year = line.replace(/^\\[is]s?4\s+/, '').trim();
			paras.push(`<b>${year}</b>`);
			continue;
		}

		// Paragraph content
		if (line.startsWith('\\im ') || line.startsWith('\\ip ')) {
			const text = cleanInline(line.replace(/^\\(im|ip)\s+/, '').trim());
			if (text) paras.push(text);
			continue;
		}

		// Standalone reference lines (like \rq Luke 3.\rq*) → append to last para
		if (line.startsWith('\\rq ') && paras.length > 0) {
			const ref = cleanInline(line);
			paras[paras.length - 1] += ' ' + ref;
		}

		// Plain paragraph lines (some entries in the source lack \ip prefix)
		if (line.match(/^[A-Z]/) && !line.startsWith('\\') && inSection) {
			const text = cleanInline(line.trim());
			if (text) paras.push(text);
		}
	}

	writeJson('back', 'chronological-nt', {
		paragraphs: paras
	});
}

// ── 77-BAK: OT Chronological Index ─────────────────────────────────────────

function extractChronologicalOt(): void {
	const content = readSfm('77-BAK-ENG[B]CPDV2009[pd].p.sfm');
	const lines = parseLines(content);

	let inSection = false;
	let title = '';
	const tableRows: string[][] = [];
	const overflowParas: string[] = [];
	let pastTableSection = false;

	for (const line of lines) {
		if (line.startsWith('\\imt1 An Historical and Chronological Index to the Old Testament')) {
			title = cleanInline(line.replace('\\imt1 ', '').trim());
			inSection = true;
			continue;
		}
		if (inSection && line.startsWith('\\periph')) break;
		if (!inSection) continue;

		// Intro lines
		if (line.startsWith('\\iq ') || line.startsWith('\\im ')) {
			const text = cleanInline(line.replace(/^\\(iq|im)\s+/, '').trim());
			if (text && !pastTableSection) {
				overflowParas.push(text);
			}
			continue;
		}

		// Table header row
		if (line.startsWith('\\tr \\thc')) {
			const cells = line
				.replace(/^\\tr\s+/, '')
				.split(/\\thc\d+\s+/)
				.map((c) => c.trim())
				.filter(Boolean);
			tableRows.push(cells);
			pastTableSection = true;
			continue;
		}

		// Table data row
		if (line.startsWith('\\tr ')) {
			const rawCells = line.replace(/^\\tr\s+/, '');
			// Split on \tcr1, \tcr, \tc2, \tc3 etc.
			const cells: string[] = [];
			const parts = rawCells.split(/\\tcr?\d*\s*/);
			for (const part of parts) {
				const cleaned = cleanInline(part.trim());
				if (cleaned || cells.length > 0) cells.push(cleaned);
			}
			// Only include rows with at least 2 cells (skip garbled single-value lines)
			if (cells.length >= 2) {
				tableRows.push(cells);
				pastTableSection = true;
			}
			continue;
		}

		// After the \tr rows end, remaining lines are garbled multi-column OCR.
		// Collect them as raw paragraphs for manual cleanup later.
		if (pastTableSection && !line.startsWith('\\tr ')) {
			if (
				line.startsWith('\\h') ||
				line.startsWith('\\toc') ||
				line.startsWith('\\rem') ||
				line.startsWith('\\ib') ||
				line.startsWith('\\pb')
			)
				continue;
			const text = cleanInline(
				line
					.replace(/^\\(im|ip|ili|s4|is4)\s*/, '')
					.replace(/^\\[a-z]+\d*\s*/, '')
					.trim()
			);
			if (text && text.length > 1) overflowParas.push(text);
		}
	}

	// Build output: structured table + overflow paragraphs
	const paragraphs: Array<{ table?: string[][]; text?: string; notes?: never[] }> = [];

	// Intro note
	if (overflowParas.length > 0) {
		// The first few overflow paras before the table are intro text
		// The rest after the table are garbled OCR — separate them
	}

	// Add table
	if (tableRows.length > 0) {
		paragraphs.push({ table: tableRows });
	}

	// Add overflow as plain paragraphs (garbled OCR sections)
	for (const text of overflowParas) {
		paragraphs.push({ text, notes: [] });
	}

	writeJson('back', 'chronological-ot', {
		section: 'drc-chronological-ot',
		title: title,
		paragraphs
	});
}

// ── Main ───────────────────────────────────────────────────────────────────

console.log('Extracting DRC reference content...');
console.log(`  Source: ${SRC_DIR}`);
console.log(`  Output: ${OUT_DIR}`);
console.log();

extractFrontMatter();
console.log();
extractNtPreface();
console.log();
extractGlossary();
console.log();
extractTopicalIndex();
console.log();
extractChronologicalNt();
console.log();
extractChronologicalOt();

console.log('\nDone.');
