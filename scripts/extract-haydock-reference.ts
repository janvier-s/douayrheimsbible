/**
 * extract-haydock-reference.ts
 *
 * Parses Haydock (1883) PSFM source files into reference JSON
 * for the /reference/haydock/ pages.
 *
 * Source: ENG-B-Haydock1883-pd-PSFM-master/
 *   00-FRT  → title-page, transcription-notes, foreword, commentators,
 *             bible-history, ot-introduction, nt-introduction, chapter-summaries
 *   48-INT  → nt-preface
 *   77-BAK  → apocrypha
 *
 * Usage: npx tsx scripts/extract-haydock-reference.ts <source-dir>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SRC_DIR = process.argv[2];
if (!SRC_DIR) {
	console.error('Usage: npx tsx scripts/extract-haydock-reference.ts <source-dir>');
	process.exit(1);
}

const OUT_DIR = join(import.meta.dirname!, '..', 'static', 'data', 'reference', 'haydock');

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
			// \rq ref\rq* → ref (must remove \rq* BEFORE \rq to avoid leaving *)
			.replace(/\\rq\*/g, '')
			.replace(/\\rq/g, ' ')
			// \it text\it* → <i>text</i>
			.replace(/\\it\s+/g, '<i>')
			.replace(/\\it\*/g, '</i>')
			// \em text\em* → <i>text</i>
			.replace(/\\em\s+/g, '<i>')
			.replace(/\\em\*/g, '</i>')
			// Strip \f footnotes (inline: \f ... \f*)
			.replace(/\\f\s+.*?\\f\*/gs, '')
			// Strip curly-brace footnotes used by Haydock: { text |}
			.replace(/\{[^}]*\|?\}/g, '')
			// remove other backslash markers that might remain
			.replace(/\\ib\d*/g, '')
			.replace(/\\iq\b/g, '')
			.replace(/\\b\d*/g, '')
			// remove stray backslash-tag remnants
			.replace(/\\[a-z]+\d*/g, '')
			// remove <> artifacts
			.replace(/<>/g, ' ')
			// collapse multiple spaces
			.replace(/\s{2,}/g, ' ')
			.trim()
	);
}

/** Slugify a heading for use as an anchor ID */
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/<[^>]+>/g, '')
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
}

interface ExtractResult {
	paragraphs: string[];
	toc?: Array<{ label: string; id: string }>;
}

/** Parse lines between start and end indices into paragraphs.
 *  Handles \im, \ip, \ipi, \iq paragraph markers plus \imt headings.
 *  When withToc is true, adds id attributes to \is1 headings and builds a TOC. */
function extractParagraphs(
	lines: string[],
	start: number,
	end: number,
	withToc = false
): ExtractResult {
	const paras: string[] = [];
	const toc: Array<{ label: string; id: string }> = [];
	let isFirstHeading = true;

	for (let i = start; i < end; i++) {
		const line = lines[i];
		// Skip metadata, periph markers, headings used for navigation only
		if (
			line.startsWith('\\id ') ||
			line.startsWith('\\ide ') ||
			line.startsWith('\\h ') ||
			line.startsWith('\\toc') ||
			line.startsWith('\\periph ') ||
			line.startsWith('\\rem ') ||
			line.startsWith('\\ib')
		)
			continue;

		// Section headings (\is1, \is2) → bold paragraph, optionally with anchor
		const isMatch = line.match(/^\\is\d?\s+(.*)/);
		if (isMatch) {
			const heading = cleanInline(isMatch[1]);
			if (heading) {
				if (withToc && !isFirstHeading && heading.length >= 4) {
					const id = slugify(heading);
					paras.push(`<h2 id="${id}">${heading}</h2>`);
					toc.push({ label: heading.replace(/\.$/, ''), id });
				} else {
					paras.push(`<b>${heading}</b>`);
					if (!isFirstHeading) {
						/* short heading, skip TOC but don't reset flag */
					}
				}
				isFirstHeading = false;
			}
			continue;
		}

		// Title markers (\imt1, \imt3, \imt5) → bold paragraph, optionally with anchor
		const imtMatch = line.match(/^\\imt\d?\s+(.*)/);
		if (imtMatch) {
			const heading = cleanInline(imtMatch[1]);
			if (heading) {
				if (withToc && !isFirstHeading && heading.length >= 4) {
					const id = slugify(heading);
					paras.push(`<h2 id="${id}">${heading}</h2>`);
					toc.push({ label: heading.replace(/\.$/, ''), id });
				} else {
					paras.push(`<b>${heading}</b>`);
				}
				isFirstHeading = false;
			}
			continue;
		}

		// Regular paragraph markers (\im, \ip, \ipi, \p)
		const pMatch = line.match(/^\\(?:im|ip|ipi|p|v)\s+(.*)/);
		if (pMatch) {
			const text = cleanInline(pMatch[1]);
			if (text) paras.push(text);
			continue;
		}

		// \m lines (used in chapter summaries)
		const mMatch = line.match(/^\\m\s+(.*)/);
		if (mMatch) {
			const text = cleanInline(mMatch[1]);
			if (text) paras.push(text);
			continue;
		}

		// \iq lines (quoted/emphasized)
		const iqMatch = line.match(/^\\iq\s+(.*)/);
		if (iqMatch) {
			const text = cleanInline(iqMatch[1]);
			if (text && text !== '==============' && !text.match(/^=+$/)) paras.push(`<i>${text}</i>`);
			continue;
		}

		// \ili list items
		const iliMatch = line.match(/^\\ili\s+(.*)/);
		if (iliMatch) {
			const text = cleanInline(iliMatch[1]);
			if (text) paras.push(text);
			continue;
		}

		// Table rows — convert to HTML table fragment within paragraphs
		if (line.startsWith('\\tr ')) {
			// Collect consecutive \tr lines into a table
			const rows: string[][] = [];
			let j = i;
			while (j < end && lines[j].startsWith('\\tr ')) {
				const cells = lines[j]
					.replace(/^\\tr\s+/, '')
					.split(/\\t[hc]\d+\s*/)
					.filter((c) => c.trim());
				rows.push(cells.map((c) => cleanInline(c)));
				j++;
			}
			if (rows.length > 0) {
				let html =
					'<table style="border-collapse:collapse;font-size:0.88rem;line-height:1.5;margin:8px 0">';
				for (let r = 0; r < rows.length; r++) {
					html += '<tr>';
					const tag = r === 0 ? 'th' : 'td';
					const style =
						r === 0
							? 'padding:6px 10px;border-bottom:2px solid var(--color-border);text-align:left;font-weight:600;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em'
							: 'padding:4px 10px;border-bottom:1px solid var(--color-border)';
					for (const cell of rows[r]) {
						html += `<${tag} style="${style}">${cell}</${tag}>`;
					}
					html += '</tr>';
				}
				html += '</table>';
				paras.push(html);
			}
			i = j - 1; // skip processed lines
			continue;
		}
	}
	const result: ExtractResult = { paragraphs: paras };
	if (withToc && toc.length > 0) result.toc = toc;
	return result;
}

/** Find all \periph boundaries in lines, returning {name, startLine} pairs. */
function findPeriphBoundaries(lines: string[]): Array<{ name: string; line: number }> {
	const boundaries: Array<{ name: string; line: number }> = [];
	for (let i = 0; i < lines.length; i++) {
		const m = lines[i].match(/^\\periph\s+(.+)/);
		if (m) boundaries.push({ name: m[1].trim(), line: i });
	}
	return boundaries;
}

function writeJson(subdir: string, slug: string, data: unknown): void {
	const dir = join(OUT_DIR, subdir);
	mkdirSync(dir, { recursive: true });
	const file = join(dir, `${slug}.json`);
	writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
	console.log(`  → ${file}`);
}

// ── Main ──────────────────────────────────────────────────────────────────

const frtRaw = readSfm('00-FRT-ENG[B]DRC1750[pd].p.sfm');
const intRaw = readSfm('48-INT-ENG[B]DRC1750[pd].p.sfm');
const bakRaw = readSfm('77-BAK-ENG[B]CPDV2009[pd].p.sfm');

const frtLines = frtRaw.split('\n');
const intLines = intRaw.split('\n');
const bakLines = bakRaw.split('\n');

const boundaries = findPeriphBoundaries(frtLines);

function getPeriphRange(name: string): { start: number; end: number } | null {
	const idx = boundaries.findIndex((b) => b.name === name);
	if (idx < 0) return null;
	const start = boundaries[idx].line;
	const end = idx + 1 < boundaries.length ? boundaries[idx + 1].line : frtLines.length;
	return { start, end };
}

/** Get line range spanning multiple consecutive periphs */
function getPeriphSpan(firstName: string, lastName: string): { start: number; end: number } | null {
	const firstIdx = boundaries.findIndex((b) => b.name === firstName);
	const lastIdx = boundaries.findIndex((b) => b.name === lastName);
	if (firstIdx < 0 || lastIdx < 0) return null;
	const start = boundaries[firstIdx].line;
	const end = lastIdx + 1 < boundaries.length ? boundaries[lastIdx + 1].line : frtLines.length;
	return { start, end };
}

console.log('Extracting Haydock reference material...\n');
console.log('\\periph boundaries found:');
for (const b of boundaries) {
	console.log(`  Line ${b.line}: ${b.name}`);
}
console.log();

// ── 1. Title Page ─────────────────────────────────────────────────────────
// Lines before first \periph — title markers only
{
	const firstPeriph = boundaries[0]?.line ?? frtLines.length;
	const paras: string[] = [];
	for (let i = 0; i < firstPeriph; i++) {
		const line = frtLines[i];
		if (line.startsWith('\\id ') || line.startsWith('\\ide ') || line.startsWith('\\toc')) continue;
		const imtMatch = line.match(/^\\imt\d?\s+(.*)/);
		if (imtMatch) {
			const text = cleanInline(imtMatch[1]);
			if (text) paras.push(text);
		}
	}
	writeJson('front', 'title-page', { paragraphs: paras });
}

// ── 2. Transcription Notes ────────────────────────────────────────────────
// Combine "Publication Data" + "Preface" periphs
{
	const pubData = getPeriphRange('Publication Data');
	const preface = getPeriphRange('Preface');
	if (pubData && preface) {
		// Span from Publication Data to end of Preface
		const foreword = getPeriphRange('Foreword');
		const end = foreword ? foreword.start : preface.end;
		const { paragraphs } = extractParagraphs(frtLines, pubData.start, end);
		writeJson('front', 'transcription-notes', { paragraphs });
	}
}

// ── 3. Foreword ───────────────────────────────────────────────────────────
{
	const range = getPeriphRange('Foreword');
	if (range) {
		const { paragraphs } = extractParagraphs(frtLines, range.start, range.end);
		writeJson('front', 'foreword', { paragraphs });
	}
}

// ── 4. Commentators ───────────────────────────────────────────────────────
// alpha-entries format: letter headings (\imt5) with \ili entries
{
	const range = getPeriphRange('Abbreviations');
	if (range) {
		const groups: Array<{ letter: string; entries: string[] }> = [];
		let currentLetter = '';
		let currentEntries: string[] = [];

		// First extract the intro paragraph(s) before the letter headings
		const introParagraphs: string[] = [];

		for (let i = range.start; i < range.end; i++) {
			const line = frtLines[i];

			// Skip metadata
			if (
				line.startsWith('\\periph ') ||
				line.startsWith('\\h ') ||
				line.startsWith('\\toc') ||
				line.startsWith('\\ib')
			)
				continue;

			// Letter headings
			const letterMatch = line.match(/^\\imt5\s+([A-Z])\s*$/);
			if (letterMatch) {
				if (currentLetter && currentEntries.length > 0) {
					groups.push({ letter: currentLetter, entries: [...currentEntries] });
				}
				currentLetter = letterMatch[1];
				currentEntries = [];
				continue;
			}

			// List items
			const iliMatch = line.match(/^\\ili\s+(.*)/);
			if (iliMatch) {
				const text = cleanInline(iliMatch[1]);
				if (text) currentEntries.push(text);
				continue;
			}

			// Intro text (before first letter or under main title)
			if (!currentLetter) {
				const imtMatch = line.match(/^\\imt\d?\s+(.*)/);
				if (imtMatch) {
					const text = cleanInline(imtMatch[1]);
					if (text) introParagraphs.push(text);
					continue;
				}
				const imMatch = line.match(/^\\im\s+(.*)/);
				if (imMatch) {
					const text = cleanInline(imMatch[1]);
					if (text) introParagraphs.push(text);
					continue;
				}
				const iqMatch = line.match(/^\\iq\s+(.*)/);
				if (iqMatch) {
					const text = cleanInline(iqMatch[1]);
					if (text && !text.match(/^=+$/)) introParagraphs.push(`<i>${text}</i>`);
					continue;
				}
			}
		}
		// Push last group
		if (currentLetter && currentEntries.length > 0) {
			groups.push({ letter: currentLetter, entries: [...currentEntries] });
		}

		writeJson('front', 'commentators', {
			intro: introParagraphs,
			entries: groups
		});
	}
}

// ── 5. Bible History ──────────────────────────────────────────────────────
{
	const range = getPeriphRange('Introduction to the Bible');
	if (range) {
		const { paragraphs } = extractParagraphs(frtLines, range.start, range.end);
		writeJson('front', 'bible-history', { paragraphs });
	}
}

// ── 6. OT Introduction ───────────────────────────────────────────────────
// Spans from "Old Testament Intro" through all sub-periphs up to "New Testament"
{
	const otStart = boundaries.find((b) => b.name === 'Old Testament Intro');
	const ntStart = boundaries.find((b) => b.name === 'New Testament');
	if (otStart && ntStart) {
		const { paragraphs, toc } = extractParagraphs(frtLines, otStart.line, ntStart.line, true);
		const data: Record<string, unknown> = { paragraphs };
		if (toc) data.toc = toc;
		writeJson('front', 'ot-introduction', data);
	}
}

// ── 7. NT Introduction ───────────────────────────────────────────────────
// Spans from "New Testament" through "Pauline Epistles" and "Catholic Epistles"
// up to "Chapter Summaries"
{
	const ntStart = boundaries.find((b) => b.name === 'New Testament');
	const chapStart = boundaries.find((b) => b.name === 'Chapter Summaries');
	if (ntStart && chapStart) {
		const { paragraphs, toc } = extractParagraphs(frtLines, ntStart.line, chapStart.line, true);
		const data: Record<string, unknown> = { paragraphs };
		if (toc) data.toc = toc;
		writeJson('front', 'nt-introduction', data);
	}
}

// ── 8. NT Preface (from 48-INT) ──────────────────────────────────────────
{
	const { paragraphs, toc } = extractParagraphs(intLines, 0, intLines.length, true);
	const data: Record<string, unknown> = { paragraphs };
	if (toc) data.toc = toc;
	writeJson('front', 'nt-preface', data);
}

// ── 9. Chapter Summaries ─────────────────────────────────────────────────
// sectioned format: \is1 book headings with \m chapter entries
{
	const chapStart = boundaries.find((b) => b.name === 'Chapter Summaries');
	const otTitle = boundaries.find((b) => b.name === 'OT Title page');
	if (chapStart) {
		const end = otTitle ? otTitle.line : frtLines.length;
		const sections: Array<{ title: string; entries: string[] }> = [];
		let currentTitle = '';
		let currentEntries: string[] = [];

		for (let i = chapStart.line; i < end; i++) {
			const line = frtLines[i];

			// Skip periph and metadata
			if (line.startsWith('\\periph ') || line.startsWith('\\ib')) continue;

			// Main title line
			const imtMatch = line.match(/^\\imt\d?\s+(.*)/);
			if (imtMatch) {
				// This is the overall heading, skip it as a section
				continue;
			}

			// Book heading
			const isMatch = line.match(/^\\is\d?\s+(.*)/);
			if (isMatch) {
				if (currentTitle && currentEntries.length > 0) {
					sections.push({ title: currentTitle, entries: [...currentEntries] });
				}
				currentTitle = cleanInline(isMatch[1]).replace(/\.$/, '');
				currentEntries = [];
				continue;
			}

			// Chapter entry
			const mMatch = line.match(/^\\m\s+(.*)/);
			if (mMatch) {
				const text = cleanInline(mMatch[1]);
				if (text) currentEntries.push(text);
				continue;
			}
		}
		// Push last section
		if (currentTitle && currentEntries.length > 0) {
			sections.push({ title: currentTitle, entries: [...currentEntries] });
		}

		writeJson('back', 'chapter-summaries', { sections });
		console.log(
			`  (${sections.length} books, ${sections.reduce((n, s) => n + s.entries.length, 0)} chapter entries)`
		);
	}
}

// ── 10. Apocrypha (from 77-BAK) ──────────────────────────────────────────
{
	const { paragraphs } = extractParagraphs(bakLines, 0, bakLines.length);
	writeJson('back', 'apocrypha', { paragraphs });
}

console.log('\nDone!');
