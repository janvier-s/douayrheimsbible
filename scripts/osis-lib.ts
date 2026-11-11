// scripts/osis-lib.ts
// Hand-written OSIS 2.1.1 XML for the verse-only edition (study additions
// live in study-osis-lib.ts). Verses are containers inside <chapter>, which
// sits inside <div type="book">. <i> becomes <hi type="italic"> and <sc>
// becomes <hi type="small-caps">.

import { verseText, EDITION, type BookOut } from './verse-only-lib.js';
import { osisId } from './odr-books-osis.js';

export const OSIS_NS = 'http://www.bibletechnologies.net/2003/OSIS/namespace';
const SCHEMA = 'http://www.crosswire.org/osis/osisCore.2.1.1.xsd';

export const xmlEscape = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const S = ['\u0001', '\u0002', '\u0003', '\u0004'];

/** Verse words as OSIS inline XML (escaped, with <hi> for italics/small caps). */
export function inlineOsis(source: string, ref: string): string {
	const body = verseText(source, ref, { i: [S[0], S[1]], sc: [S[2], S[3]] });
	return xmlEscape(body)
		.replace(/\u0001/g, '<hi type="italic">')
		.replace(/\u0003/g, '<hi type="small-caps">')
		.replace(/[\u0002\u0004]/g, '</hi>');
}

/** The osisID of a verse; a number the corpus repeats gets `!b`, `!c`, ... */
export function verseOsisId(book: string, chapter: number, v: { verse: number; part: string }) {
	return `${book}.${chapter}.${v.verse}${v.part ? `!${v.part}` : ''}`;
}

export function renderOsisBook(b: BookOut, indent = ''): string {
	const id = osisId(b.slug);
	const out = [
		`${indent}<div type="book" osisID="${id}">`,
		`${indent}\t<title type="main">${xmlEscape(b.shortTitle)}</title>`
	];
	if (b.title !== b.shortTitle) out.push(`${indent}\t<title type="sub">${xmlEscape(b.title)}</title>`);
	for (const c of b.chapters) {
		out.push(`${indent}\t<chapter osisID="${id}.${c.chapter}">`);
		out.push(`${indent}\t\t<title type="chapter">Chapter ${c.chapter}</title>`);
		for (const v of c.verses) {
			out.push(
				`${indent}\t\t<verse osisID="${verseOsisId(id, c.chapter, v)}">${inlineOsis(v.source, `${b.slug} ${c.chapter}:${v.label}`)}</verse>`
			);
		}
		out.push(`${indent}\t</chapter>`);
	}
	out.push(`${indent}</div>`);
	return out.join('\n');
}

export interface OsisPart {
	heading: string;
	books: BookOut[];
	/** Already-escaped title page lines; empty or absent for none. */
	titleLines?: string[];
}

function header(workId: string, title: string, description: string): string {
	return [
		'\t<header>',
		`\t\t<work osisWork="${workId}">`,
		`\t\t\t<title>${xmlEscape(title)}</title>`,
		`\t\t\t<description>${xmlEscape(description)}</description>`,
		'\t\t\t<type type="OSIS">Bible</type>',
		`\t\t\t<identifier type="OSIS">Bible.${workId}</identifier>`,
		'\t\t\t<language type="IETF">en</language>',
		'\t\t\t<rights type="x-license">CC0 1.0 Universal</rights>',
		'\t\t\t<refSystem>Bible</refSystem>',
		'\t\t</work>',
		'\t</header>'
	].join('\n');
}

/** One OSIS document: a single book, or a whole Bible in testament groups. */
export function renderOsis(
	parts: OsisPart[],
	opts: { title: string; description?: string; workId?: string; whole: boolean }
): string {
	const workId = opts.workId ?? 'ODR';
	const out = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<osis xmlns="${OSIS_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${OSIS_NS} ${SCHEMA}">`,
		`<osisText osisIDWork="${workId}" osisRefWork="Bible" xml:lang="en" canonical="true">`,
		header(workId, opts.title, opts.description ?? `${EDITION}, verse text only`)
	];
	for (const part of parts) {
		if (opts.whole) {
			out.push(`\t<div type="bookGroup">`, `\t\t<title>${xmlEscape(part.heading)}</title>`);
			if (part.titleLines?.length) {
				out.push('\t\t<div type="introduction">');
				out.push(`\t\t\t<p>${part.titleLines.join('<lb/>')}</p>`, '\t\t</div>');
			}
		}
		for (const b of part.books) out.push(renderOsisBook(b, opts.whole ? '\t\t' : '\t'));
		if (opts.whole) out.push('\t</div>');
	}
	out.push('</osisText>', '</osis>');
	return `${out.join('\n')}\n`;
}

/** Title-page JSON to escaped OSIS lines (italics kept as <hi>). */
export function titleLinesOsis(paragraphs: { text: string }[]): string[] {
	const lines: string[] = [];
	for (const p of paragraphs) {
		const text = p.text
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/?span[^>]*>/gi, '')
			.replace(/<i>/g, S[0])
			.replace(/<\/i>/g, S[1]);
		for (const raw of text.split('\n')) {
			const line = raw.trim();
			if (!line) continue;
			lines.push(
				xmlEscape(line).replace(/\u0001/g, '<hi type="italic">').replace(/\u0002/g, '</hi>')
			);
		}
	}
	return lines;
}

