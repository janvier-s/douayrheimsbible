// scripts/study-md-lib.ts
// Pandoc Markdown for the study edition (EPUB and DOCX). Notes and cross
// references become real footnotes; annotations follow their verse as a
// styled block; summaries, introductions, articles and end matter are
// headed, ordered blocks. Everything is read from the model in study-lib.ts.

import {
	mdEscape,
	NBSP,
	bookId,
	chapterId,
	chapterGrid,
	renderContentsMarkdown,
	type MdOpts,
	type Part
} from './epub-lib.js';
import { makeBreaker } from './layout-lib.js';
import type { Inline, StudyBlock, StudyBook } from './study-lib.js';
import type { RefDoc, RBlock } from './study-ref-lib.js';

export interface MdState {
	n: number;
	defs: string[];
}
export const newState = (): MdState => ({ n: 0, defs: [] });

const ws = (s: string) => s.replace(/\s+/g, ' ');

/**
 * A block that starts `1. Tim. 4.` would be read as an ordered list and lose
 * its number. Escape the full stop (or bracket) after a leading number, and a
 * leading bullet character.
 */
export const escLead = (s: string) =>
	s.replace(/^(\s*\d+)([.)])/, '$1\\$2').replace(/^(\s*)([-+])(\s)/, '$1\\$2$3');

/** Renders inline nodes; footnote definitions are queued on `st`. */
export function mdInline(inl: Inline[], st: MdState): string {
	let out = '';
	for (const n of inl) {
		if (n.t === 'txt') out += mdEscape(ws(n.v));
		else if (n.t === 'br') out += ' ';
		else if (n.t === 'i' || n.t === 'sc') {
			const inner = mdInline(n.c, st);
			if (!inner.trim()) {
				out += inner;
				continue;
			}
			const lead = inner.match(/^\s*/)![0];
			const trail = inner.match(/\s*$/)![0];
			const core = inner.trim();
			out += n.t === 'i' ? `${lead}*${core}*${trail}` : `${lead}[${core}]{.smallcaps}${trail}`;
		} else {
			const id = ++st.n;
			const catchword = n.catchword ? `**${mdEscape(ws(n.catchword))}** ` : '';
			st.defs.push(
				`[^${id}]: ${catchword || ''}${catchword ? mdInline(n.body, newState()).trim() : escLead(mdInline(n.body, newState()).trim())}`
			);
			out += `[^${id}]`;
		}
	}
	return out.replace(/ {2,}/g, ' ');
}

/** Queued definitions as a block, then cleared. */
function flushDefs(st: MdState): string {
	if (!st.defs.length) return '';
	const d = `${st.defs.join('\n\n')}\n`;
	st.defs = [];
	return d;
}

const para = (inl: Inline[], st: MdState) => escLead(mdInline(inl, st).trim());

const div = (cls: string, style: string, body: string) =>
	`::: {.${cls} custom-style="${style}"}\n${body}\n:::\n`;

function blockMd(b: StudyBlock, st: MdState, cls: string, style: string, headingLevel?: number) {
	const out: string[] = [];
	if (b.title && headingLevel) out.push(`${'#'.repeat(headingLevel)} ${mdEscape(b.title)}\n`);
	const paras = b.paras.map((p) => para(p, st));
	// The title leads the first paragraph; it keeps its own full stop if it has one.
	const stop = (t: string) => (/[.!?:;]$/.test(t) ? t : `${t}.`);
	if (b.title && !headingLevel && paras.length)
		paras[0] = `**${mdEscape(stop(b.title))}** ${paras[0]}`;
	else if (b.title && !headingLevel) paras.push(`**${mdEscape(b.title)}**`);
	out.push(div(cls, style, paras.join('\n\n')));
	const defs = flushDefs(st);
	if (defs) out.push(defs);
	return out.join('\n');
}

export function renderStudyBookMarkdown(b: StudyBook, st: MdState, opts: MdOpts = {}): string {
	const level = opts.level ?? 1;
	const layout = opts.layout ?? 'flowing';
	const h = (n: number) => '#'.repeat(Math.min(6, level + n));
	const out: string[] = [`${h(0)} ${mdEscape(b.shortTitle)} {#${bookId(b.slug)}}\n`];
	if (b.title !== b.shortTitle) out.push(`*${mdEscape(b.title)}*\n`);
	if (opts.grid) {
		out.push(
			`${chapterGrid(
				b.slug,
				b.chapters.map((c) => c.chapter)
			)}\n`
		);
	}

	if (b.intros.length) {
		out.push(`${h(1)} Introduction\n`);
		for (const intro of b.intros) out.push(blockMd(intro, st, 'intro', 'Introduction'));
	}
	if (b.preface.length) {
		out.push(`${h(1)} Preface\n`);
		for (const p of b.preface) {
			out.push(`${para(p, st)}\n`);
			const d = flushDefs(st);
			if (d) out.push(d);
		}
	}

	for (const c of b.chapters) {
		out.push(`${h(1)} Chapter ${c.chapter} {#${chapterId(b.slug, c.chapter)}}\n`);
		if (c.summary) {
			out.push(div('summary', 'Summary', para(c.summary, st)));
			const d = flushDefs(st);
			if (d) out.push(d);
		}
		for (const a of c.articles) out.push(blockMd(a, st, 'article', 'Introduction', h(2)));

		let run: string[] = [];
		const flush = () => {
			if (run.length) out.push(`${run.join(' ')}\n`);
			run = [];
			const d = flushDefs(st);
			if (d) out.push(d);
		};
		const breaks = makeBreaker(b.slug, c.chapter, layout);
		for (const v of c.verses) {
			if (run.length && breaks(v.verse) && !v.part) flush();
			run.push(`^${v.label}^${NBSP}${para(v.inl, st)}`);
			if (v.annotations.length) {
				flush();
				for (const a of v.annotations) out.push(blockMd(a, st, 'annotation', 'Annotation'));
			}
		}
		flush();
	}

	if (b.endMatter.length) {
		out.push(`${h(1)} End Matter\n`);
		for (const e of b.endMatter) out.push(blockMd(e, st, 'intro', 'Introduction', h(2)));
	}
	return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

// ---------------------------------------------------------------- reference documents

function cell(inl: Inline[], st: MdState) {
	return mdInline(inl, st).replace(/\|/g, '\\|').trim() || ' ';
}

export function renderRefDocMarkdown(d: RefDoc, st: MdState, level: number): string {
	const h = (n: number) => '#'.repeat(Math.min(6, level + n));
	const out: string[] = [`${h(0)} ${mdEscape(d.title)}\n`];
	for (const s of d.subtitles) out.push(`*${mdEscape(s)}*\n`);
	const flush = () => {
		const defs = flushDefs(st);
		if (defs) out.push(defs);
	};
	for (const b of d.blocks as RBlock[]) {
		if (b.k === 'h') out.push(`${h(b.level)} ${mdEscape(b.text)}\n`);
		else if (b.k === 'p') {
			out.push(`${b.lead ? `**${mdEscape(b.lead)}** ` : ''}${para(b.inl, st)}\n`);
			flush();
		} else {
			// Pipe tables need a header row; a table with none gets an empty one.
			const width = Math.max(...b.rows.map((r) => r.length), b.head?.length ?? 0);
			const pad = (r: Inline[][]) => [...r, ...Array(width - r.length).fill([])];
			const head = pad(b.head ?? []).map((c) => cell(c, st));
			out.push(`| ${head.join(' | ')} |`, `|${' --- |'.repeat(width)}`);
			for (const r of b.rows)
				out.push(
					`| ${pad(r)
						.map((c) => cell(c, st))
						.join(' | ')} |`
				);
			out.push('');
			flush();
		}
	}
	return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

// ---------------------------------------------------------------- whole Bible

export interface StudyPart {
	heading: string;
	titlePage?: string;
	front: RefDoc[];
	books: StudyBook[];
	back: RefDoc[];
}

/** Testament (h1) > front matter, books (h2) > chapters (h3), back matter. */
export function renderStudyWholeMarkdown(
	parts: StudyPart[],
	opts: MdOpts & { contents?: boolean } = {}
): string {
	const st = newState();
	const out: string[] = [];
	if (opts.contents) out.push(renderContentsMarkdown(parts));
	for (const p of parts) {
		out.push(`# ${mdEscape(p.heading)}\n`);
		if (p.titlePage) out.push(p.titlePage);
		for (const d of p.front) out.push(renderRefDocMarkdown(d, st, 2));
		for (const b of p.books) out.push(renderStudyBookMarkdown(b, st, { ...opts, level: 2 }));
		for (const d of p.back) out.push(renderRefDocMarkdown(d, st, 2));
	}
	return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

export type { Part };
