// scripts/study-osis-lib.ts
// OSIS 2.1.1 for the study edition, from the model in study-lib.ts.
//   marginal note      <note>                       (with <catchWord> when an <alt> span names its words)
//   cross-reference    <note type="crossReference"><reference>…</reference></note>
//   annotation         <note type="study">          after its verse, inside the <verse>
//   summary            <div type="summary">         first in its chapter
//   introduction       <div type="introduction">    first in its book
//   end matter         <div type="afterword">       last in its book
// Notes cannot nest in OSIS, so an annotation's own sub-notes are flattened
// the way the USFM export flattens them: a superscript where each marker
// stood and the note texts after the annotation body.

import { osisId } from './odr-books-osis.js';
import { xmlEscape, verseOsisId, OSIS_NS } from './osis-lib.js';
import { EDITION } from './verse-only-lib.js';
import type { Inline, StudyBlock, StudyBook } from './study-lib.js';
import type { RefDoc } from './study-ref-lib.js';

const ws = (s: string) => s.replace(/\s+/g, ' ');

/** Inline nodes as OSIS. With `sink`, notes are flattened into it instead. */
export function osisInline(inl: Inline[], sink?: Inline[][]): string {
	let out = '';
	for (const n of inl) {
		if (n.t === 'txt') out += xmlEscape(ws(n.v));
		else if (n.t === 'br') out += '<lb/>';
		else if (n.t === 'i') out += `<hi type="italic">${osisInline(n.c, sink)}</hi>`;
		else if (n.t === 'sc') out += `<hi type="small-caps">${osisInline(n.c, sink)}</hi>`;
		else if (sink) {
			sink.push(n.body);
			out += `<hi type="super">${sink.length}</hi>`;
		} else if (n.kind === 'xref') {
			out += `<note type="crossReference"><reference>${osisInline(n.body)}</reference></note>`;
		} else {
			const c = n.catchword ? `<catchWord>${xmlEscape(ws(n.catchword))}</catchWord> ` : '';
			out += `<note>${c}${osisInline(n.body)}</note>`;
		}
	}
	return out.replace(/ {2,}/g, ' ');
}

const para = (inl: Inline[]) => `<p>${osisInline(inl).trim()}</p>`;

/** Annotation as a study note, paragraphs joined by <lb/>, sub-notes flattened. */
function studyNote(a: StudyBlock): string {
	const sink: Inline[][] = [];
	const body = a.paras.map((p) => osisInline(p, sink).trim()).join('<lb/>');
	const title = a.title ? `<hi type="bold">${xmlEscape(ws(a.title))}</hi> ` : '';
	const trailing = sink
		.map((b, i) => `<lb/><hi type="super">${i + 1}</hi> ${osisInline(b)}`)
		.join('');
	return `<note type="study">${title}${body}${trailing}</note>`;
}

function divBlock(type: string, b: StudyBlock, indent: string): string[] {
	const out = [`${indent}<div type="${type}">`];
	if (b.title) out.push(`${indent}\t<title>${xmlEscape(ws(b.title))}</title>`);
	for (const p of b.paras) out.push(`${indent}\t${para(p)}`);
	out.push(`${indent}</div>`);
	return out;
}

export function renderStudyOsisBook(b: StudyBook, indent = ''): string {
	const id = osisId(b.slug);
	const t = `${indent}\t`;
	const out = [
		`${indent}<div type="book" osisID="${id}">`,
		`${t}<title type="main">${xmlEscape(b.shortTitle)}</title>`
	];
	if (b.title !== b.shortTitle) out.push(`${t}<title type="sub">${xmlEscape(b.title)}</title>`);
	for (const intro of b.intros) out.push(...divBlock('introduction', intro, t));
	if (b.preface.length) {
		out.push(`${t}<div type="preface">`, `${t}\t<title>Preface</title>`);
		for (const p of b.preface) out.push(`${t}\t${para(p)}`);
		out.push(`${t}</div>`);
	}
	for (const c of b.chapters) {
		out.push(`${t}<chapter osisID="${id}.${c.chapter}">`);
		out.push(`${t}\t<title type="chapter">Chapter ${c.chapter}</title>`);
		if (c.summary) {
			out.push(`${t}\t<div type="summary">`, `${t}\t\t${para(c.summary)}`, `${t}\t</div>`);
		}
		for (const a of c.articles) out.push(...divBlock('section', a, `${t}\t`));
		for (const v of c.verses) {
			const notes = v.annotations.map(studyNote).join('');
			out.push(
				`${t}\t<verse osisID="${verseOsisId(id, c.chapter, v)}">${osisInline(v.inl).trim()}${notes}</verse>`
			);
		}
		out.push(`${t}</chapter>`);
	}
	for (const e of b.endMatter) out.push(...divBlock('afterword', e, t));
	out.push(`${indent}</div>`);
	return out.join('\n');
}

/** A reference document as a div of the given type (introduction, appendix, glossary, ...). */
export function renderRefDocOsis(d: RefDoc, type: string, indent: string): string {
	const out = [`${indent}<div type="${type}">`, `${indent}\t<title>${xmlEscape(d.title)}</title>`];
	for (const s of d.subtitles) out.push(`${indent}\t<title type="sub">${xmlEscape(s)}</title>`);
	for (const b of d.blocks) {
		if (b.k === 'h') out.push(`${indent}\t<title type="sub">${xmlEscape(b.text)}</title>`);
		else if (b.k === 'p') {
			const lead = b.lead ? `<hi type="bold">${xmlEscape(b.lead)}</hi> ` : '';
			out.push(`${indent}\t<p>${lead}${osisInline(b.inl).trim()}</p>`);
		} else {
			out.push(`${indent}\t<table>`);
			if (b.head) {
				out.push(
					`${indent}\t\t<row>${b.head.map((c) => `<cell role="label">${osisInline(c).trim()}</cell>`).join('')}</row>`
				);
			}
			for (const r of b.rows) {
				out.push(`${indent}\t\t<row>${r.map((c) => `<cell>${osisInline(c).trim()}</cell>`).join('')}</row>`);
			}
			out.push(`${indent}\t</table>`);
		}
	}
	out.push(`${indent}</div>`);
	return out.join('\n');
}

export interface StudyOsisPart {
	heading: string;
	titleLines?: string[];
	front: RefDoc[];
	books: StudyBook[];
	back: RefDoc[];
}

export function renderStudyOsis(
	parts: StudyOsisPart[],
	opts: { title: string; whole: boolean; workId?: string }
): string {
	const workId = opts.workId ?? 'ODR';
	const out = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<osis xmlns="${OSIS_NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${OSIS_NS} http://www.crosswire.org/osis/osisCore.2.1.1.xsd">`,
		`<osisText osisIDWork="${workId}" osisRefWork="Bible" xml:lang="en" canonical="true">`,
		'\t<header>',
		`\t\t<work osisWork="${workId}">`,
		`\t\t\t<title>${xmlEscape(opts.title)}</title>`,
		`\t\t\t<description>${xmlEscape(`${EDITION}, study edition`)}</description>`,
		'\t\t\t<type type="OSIS">Bible</type>',
		`\t\t\t<identifier type="OSIS">Bible.${workId}</identifier>`,
		'\t\t\t<language type="IETF">en</language>',
		'\t\t\t<rights type="x-license">CC0 1.0 Universal</rights>',
		'\t\t\t<refSystem>Bible</refSystem>',
		'\t\t</work>',
		'\t</header>'
	];
	for (const p of parts) {
		const ind = opts.whole ? '\t\t' : '\t';
		if (opts.whole) {
			out.push('\t<div type="bookGroup">', `\t\t<title>${xmlEscape(p.heading)}</title>`);
			if (p.titleLines?.length) {
				out.push('\t\t<div type="titlePage">', `\t\t\t<p>${p.titleLines.join('<lb/>')}</p>`, '\t\t</div>');
			}
			for (const d of p.front) out.push(renderRefDocOsis(d, 'introduction', ind));
		}
		for (const b of p.books) out.push(renderStudyOsisBook(b, ind));
		if (opts.whole) {
			for (const d of p.back) out.push(renderRefDocOsis(d, 'appendix', ind));
			out.push('\t</div>');
		}
	}
	out.push('</osisText>', '</osis>');
	return `${out.join('\n')}\n`;
}
