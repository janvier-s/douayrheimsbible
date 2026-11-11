// scripts/verse-only-lib.ts
// Pure renderers for the verse-only distribution: scripture text with every
// annotation marker, note, cross-reference and chapter summary removed.
// No fs, so tests import this without running a build.
//
// What stays: the verse words, and the two formatting spans the printed text
// carries (<i> italics for supplied words, <sc> small caps for the divine
// name). Formats that cannot express a span (plain text, CSV, SQLite, JSON)
// get the words alone. What goes: <na>, <cr> (markers), <alt> delimiters (the
// words are printed text and stay), chapter summaries, intros, end matter,
// verse-0 summary overflow, and the Tobias preface (chapter 0).

import {
	tokenize,
	ExportError,
	bookCode,
	KNOWN_DUPLICATE_VERSE,
	SUMMARY_OVERFLOW_VERSE,
	PREFACE_CHAPTER,
	verseRef,
	type Book,
	type TagName
} from './export-lib.js';

export const EDITION = 'Original Douay-Rheims (1582 NT / 1609 OT)';

/** One span style: what to emit around it. Absent means "words only". */
export type Wrap = Partial<Record<'i' | 'sc', [open: string, close: string]>>;

const MARKERS: ReadonlySet<TagName> = new Set<TagName>(['na', 'cr']);
const SEGMENTS = 'bcdefghijklmnopqrstuvwxyz';

/**
 * Verse text with markers removed. `wrap` decides how <i> and <sc> are
 * written; `nest` lets a format open a span inside another (USFM wants `\+sc`).
 */
export function verseText(
	text: string,
	ref: string,
	wrap: Wrap = {},
	nested?: (name: 'i' | 'sc', open: boolean, depth: number) => string | undefined
): string {
	let out = '';
	let skipUntil: TagName | null = null;
	let afterMarker = false;
	let depth = 0;

	for (const node of tokenize(text, 'verse', ref)) {
		if (node.kind === 'text') {
			if (skipUntil) continue;
			let value = node.value;
			// A removed marker leaves the space on both sides of it; drop the one
			// that would now sit in front of punctuation.
			if (afterMarker && /^[,.;:!?)\]]/.test(value)) out = out.replace(/ +$/, '');
			afterMarker = false;
			out += value;
			continue;
		}
		if (skipUntil) {
			if (node.close && node.name === skipUntil) skipUntil = null;
			continue;
		}
		if (!node.close && MARKERS.has(node.name)) {
			skipUntil = node.name;
			afterMarker = true;
			continue;
		}
		if (node.name === 'i' || node.name === 'sc') {
			const name = node.name;
			if (!node.close) depth++;
			const custom = nested?.(name, !node.close, depth);
			const pair = wrap[name];
			if (custom !== undefined) out += custom;
			else if (pair) out += node.close ? pair[1] : pair[0];
			if (node.close) depth = Math.max(0, depth - 1);
		}
		// <alt> delimiters drop; its words are printed text and are kept above.
	}
	return out.replace(/[ \t\n]{2,}|\n/g, ' ').trim();
}

export interface VerseOut {
	verse: number;
	/** '' for the normal case; 'b', 'c', … for a number the corpus repeats. */
	part: string;
	/** '12' or '12b'. */
	label: string;
	/** Raw tagged text, markers still present; render with verseText(). */
	source: string;
	/** Words only. */
	text: string;
}

export interface ChapterOut {
	chapter: number;
	verses: VerseOut[];
}

export interface BookOut {
	slug: string;
	code: string;
	ordinal: number;
	/** Multi-line source titles flattened to one line. */
	title: string;
	shortTitle: string;
	chapters: ChapterOut[];
}

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

export function toVerseBook(slug: string, book: Book, fallbackTitle: string): BookOut {
	const { usfm, ordinal } = bookCode(slug);
	const chapters: ChapterOut[] = [];

	for (const chapter of book.chapters) {
		if (chapter.chapter === PREFACE_CHAPTER) continue;
		const seen = new Map<number, number>();
		const verses: VerseOut[] = [];
		for (const v of chapter.verses) {
			if (v.verse === SUMMARY_OVERFLOW_VERSE) continue;
			const ref = verseRef(slug, chapter.chapter, v.verse);
			const nth = (seen.get(v.verse) ?? 0) + 1;
			seen.set(v.verse, nth);
			if (nth > 1 && !KNOWN_DUPLICATE_VERSE.has(ref)) {
				throw new ExportError(ref, `verse ${v.verse} appears ${nth} times in this chapter`);
			}
			const part = nth === 1 ? '' : SEGMENTS[nth - 2];
			verses.push({
				verse: v.verse,
				part,
				label: `${v.verse}${part}`,
				source: v.text,
				text: verseText(v.text, ref)
			});
		}
		chapters.push({ chapter: chapter.chapter, verses });
	}

	return {
		slug,
		code: usfm,
		ordinal,
		title: oneLine(book.book_title ?? fallbackTitle),
		shortTitle: oneLine(book.short_title ?? fallbackTitle),
		chapters
	};
}

const ref = (b: BookOut, c: ChapterOut, v: VerseOut) => `${b.slug} ${c.chapter}:${v.label}`;

// ---------------------------------------------------------------- JSON

export function renderJson(b: BookOut): string {
	return JSON.stringify(
		{
			book: b.slug,
			code: b.code,
			title: b.title,
			short_title: b.shortTitle,
			chapters: b.chapters.map((c) => ({
				chapter: c.chapter,
				verses: c.verses.map((v) => ({
					verse: v.verse,
					...(v.part ? { part: v.part } : {}),
					text: v.text
				}))
			}))
		},
		null,
		2
	);
}

// ---------------------------------------------------------------- USFM

export function renderUsfmVerseOnly(b: BookOut): string {
	const lines = [
		`\\id ${b.code} ${EDITION}, verse text only`,
		'\\usfm 3.0',
		'\\ide UTF-8',
		`\\h ${b.shortTitle}`,
		`\\toc1 ${b.title}`,
		`\\toc2 ${b.shortTitle}`,
		`\\toc3 ${b.code}`,
		`\\mt1 ${b.title}`
	];
	// USFM 3 wants a character marker inside an open one in the `\+` form.
	const nest = (name: 'i' | 'sc', open: boolean, depth: number) => {
		const m = name === 'i' ? 'it' : 'sc';
		const plus = depth > 1;
		return open ? `\\${plus ? '+' : ''}${m} ` : `\\${plus ? '+' : ''}${m}*`;
	};
	for (const c of b.chapters) {
		lines.push(`\\c ${c.chapter}`, '\\p');
		for (const v of c.verses) {
			lines.push(`\\v ${v.label} ${verseText(v.source, ref(b, c, v), {}, nest)}`);
		}
	}
	return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------- Markdown

const mdEscape = (s: string) => s.replace(/([\\`*_[\]<>])/g, '\\$1');

export function renderMarkdown(b: BookOut, opts: { headingLevel?: number } = {}): string {
	const h = opts.headingLevel ?? 1;
	const hash = (n: number) => '#'.repeat(Math.min(6, h + n));
	const out = [`${hash(0)} ${b.shortTitle}`, ''];
	if (b.title !== b.shortTitle) out.push(`*${b.title}*`, '');
	for (const c of b.chapters) {
		out.push(`${hash(1)} Chapter ${c.chapter}`, '');
		for (const v of c.verses) {
			// Escape first, then wrap: the span delimiters must survive escaping.
			const body = verseText(v.source, ref(b, c, v), { i: ['\u0001', '\u0002'] });
			const safe = mdEscape(body).replace(/[\u0001\u0002]/g, '*');
			out.push(`**${v.label}** ${safe}`, '');
		}
	}
	return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

// ---------------------------------------------------------------- Plain text

function wrapText(text: string, width: number, first: string, rest: string): string[] {
	const lines: string[] = [];
	let line = first;
	let fresh = true;
	for (const word of text.split(' ')) {
		if (!fresh && line.length + 1 + word.length > width) {
			lines.push(line);
			line = rest + word;
		} else {
			line += (fresh ? '' : ' ') + word;
		}
		fresh = false;
	}
	lines.push(line);
	return lines;
}

export function renderText(b: BookOut, width = 76): string {
	const center = (s: string) => ' '.repeat(Math.max(0, Math.floor((width - s.length) / 2))) + s;
	const out = [center(b.shortTitle.toUpperCase()), center('='.repeat(b.shortTitle.length)), ''];
	if (b.title !== b.shortTitle) {
		for (const l of wrapText(b.title, width - 8, '', '')) out.push(center(l));
		out.push('');
	}
	for (const c of b.chapters) {
		out.push(`CHAPTER ${c.chapter}`, '-'.repeat(`CHAPTER ${c.chapter}`.length), '');
		const pad = Math.max(...c.verses.map((v) => v.label.length), 1) + 2;
		for (const v of c.verses) {
			const first = v.label.padEnd(pad);
			out.push(...wrapText(v.text, width, first, ' '.repeat(pad)));
		}
		out.push('');
	}
	return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

// ---------------------------------------------------------------- CSV / TSV

export const CSV_HEADER = 'book,code,chapter,verse,part,text';

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function csvRows(b: BookOut): string[] {
	const rows: string[] = [];
	for (const c of b.chapters) {
		for (const v of c.verses) {
			rows.push([b.slug, b.code, c.chapter, v.verse, v.part, csvCell(v.text)].join(','));
		}
	}
	return rows;
}
