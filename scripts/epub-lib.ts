// scripts/epub-lib.ts
// Pandoc Markdown renderers for the EPUB and DOCX exports, and the pandoc
// runner both use. Our code owns the content and structure; pandoc owns the
// container. Verse-only here; the study renderers live in study-md-lib.ts.

import { spawnSync } from 'child_process';
import { verseText, EDITION, type BookOut } from './verse-only-lib.js';
import { groupVerses, type Layout } from './layout-lib.js';

// Smart punctuation, math, citations and the list/attribute extensions are
// off so pandoc leaves the 1582/1609 spelling and punctuation exactly alone.
export const PANDOC_FROM =
	'markdown-smart-tex_math_dollars-tex_math_single_backslash-citations-fancy_lists-example_lists-yaml_metadata_block-pandoc_title_block-raw_html-raw_tex-auto_identifiers-inline_notes';

export const NBSP = ' ';

/** Escapes every character pandoc Markdown could read as syntax. */
export const mdEscape = (s: string) => s.replace(/([\\`*_[\]<>^~$#@|&{}])/g, '\\$1');

const I = ['\u0001', '\u0002'] as const;
const SC = ['\u0003', '\u0004'] as const;

/**
 * Verse words as pandoc Markdown: italics as `*..*`, small caps as a
 * `.smallcaps` span. Whitespace is moved outside each span, because
 * `* word*` is not emphasis.
 */
export function inlineMd(source: string, ref: string): string {
	const body = verseText(source, ref, { i: [I[0], I[1]], sc: [SC[0], SC[1]] });
	let s = mdEscape(body);
	// Small caps inside italics (or the reverse) nest, so mark both before
	// converting: inner sentinels survive the other's character class.
	for (let guard = 0; guard < 4 && /[\u0001-\u0004]/.test(s); guard++) {
		const before = s;
		s = s.replace(/\u0001(\s*)([^\u0001\u0002\u0003\u0004]*?)(\s*)\u0002/g, (_m, l, t, r2) =>
			t.trim() ? `${l}*${t}*${r2}` : `${l}${r2}`
		);
		s = s.replace(/\u0003(\s*)([^\u0001\u0002\u0003\u0004]*?)(\s*)\u0004/g, (_m, l, t, r2) =>
			t.trim() ? `${l}[${t}]{.smallcaps}${r2}` : `${l}${r2}`
		);
		if (s === before) break;
	}
	return s
		.replace(/[\u0001-\u0004]/g, '')
		.replace(/ {2,}/g, ' ')
		.trim();
}

const refOf = (b: BookOut, chapter: number, label: string) => `${b.slug} ${chapter}:${label}`;

/** XHTML ids may not start with a digit, so "1-kings" becomes "ch-1-kings-1". */
export const bookId = (slug: string) => `book-${slug}`;
export const chapterId = (slug: string, n: number) => `ch-${slug}-${n}`;

/** A row of chapter numbers, each a link to its chapter. */
export function chapterGrid(slug: string, chapters: number[]): string {
	return chapters.map((n) => `[${n}](#${chapterId(slug, n)})`).join(' \u00b7 ');
}

export interface MdOpts {
	/** Heading level of the book title. */
	level?: number;
	layout?: Layout;
	/** Put a row of chapter links under the book title (DOCX, HTML). */
	grid?: boolean;
}

/** One chapter as paragraphs, laid out as `layout` says. */
export function chapterBlocks(
	b: BookOut,
	c: BookOut['chapters'][number],
	layout: Layout
): string[] {
	return groupVerses(b.slug, c.chapter, c.verses, layout).map((g) =>
		g.map((v) => `^${v.label}^${NBSP}${inlineMd(v.source, refOf(b, c.chapter, v.label))}`).join(' ')
	);
}

/** Book as Markdown. */
export function renderBookMarkdown(b: BookOut, opts: MdOpts = {}): string {
	const level = opts.level ?? 1;
	const h = (n: number) => '#'.repeat(Math.min(6, level + n));
	const out = [`${h(0)} ${mdEscape(b.shortTitle)} {#${bookId(b.slug)}}`, ''];
	if (b.title !== b.shortTitle) out.push(`*${mdEscape(b.title)}*`, '');
	if (opts.grid)
		out.push(
			chapterGrid(
				b.slug,
				b.chapters.map((c) => c.chapter)
			),
			''
		);
	for (const c of b.chapters) {
		out.push(`${h(1)} Chapter ${c.chapter} {#${chapterId(b.slug, c.chapter)}}`, '');
		for (const para of chapterBlocks(b, c, opts.layout ?? 'flowing')) out.push(para, '');
	}
	return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

/** Whole-Bible contents page: each book linked, with its chapters. */
export function renderContentsMarkdown(
	parts: {
		heading: string;
		books: { slug: string; shortTitle: string; chapters: { chapter: number }[] }[];
	}[]
): string {
	const out = ['# Contents {.unnumbered}', ''];
	for (const p of parts) {
		out.push(`**${mdEscape(p.heading)}**`, '');
		for (const b of p.books) {
			const nums = b.chapters.map((c) => c.chapter);
			out.push(`[${mdEscape(b.shortTitle)}](#${bookId(b.slug)}): ${chapterGrid(b.slug, nums)}`, '');
		}
	}
	return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

export interface TitlePageJson {
	title: string;
	paragraphs: { text: string }[];
}

/** The transcribed title page, one centered line per source line. */
export function renderTitlePageMarkdown(tp: TitlePageJson): string {
	const lines: string[] = [];
	for (const p of tp.paragraphs) {
		const text = p.text
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/?span[^>]*>/gi, '')
			.replace(/<i>/g, I[0])
			.replace(/<\/i>/g, I[1]);
		for (const raw of text.split('\n')) {
			const line = mdEscape(raw.trim());
			if (!line) continue;
			const withEm = line
				.replace(/\u0001([^\u0001\u0002]*)\u0002/g, '*$1*')
				.replace(/[\u0001\u0002]/g, '');
			lines.push(withEm);
		}
	}
	// A backslash at line end is a hard break in pandoc Markdown.
	return `::: {.titlepage}\n${lines.join('\\\n')}\n:::\n`;
}

export interface Part {
	heading: string;
	books: BookOut[];
	titlePage?: string;
}

/**
 * Whole Bible: testament (h1) > book (h2) > chapter (h3). The title pages
 * come from reference/odr/<ot|nt>/title-page.json, already rendered.
 */
export function renderWholeMarkdown(
	parts: Part[],
	opts: MdOpts & { contents?: boolean } = {}
): string {
	const out: string[] = [];
	if (opts.contents) out.push(renderContentsMarkdown(parts));
	for (const part of parts) {
		out.push(`# ${mdEscape(part.heading)}`, '');
		if (part.titlePage) out.push(part.titlePage, '');
		for (const b of part.books) out.push(renderBookMarkdown(b, { ...opts, level: 2 }));
	}
	return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

export interface PandocMeta {
	title: string;
	subtitle?: string;
	identifier: string;
	cover?: string;
	css?: string;
	referenceDoc?: string;
	toc?: boolean;
	tocDepth?: number;
	splitLevel?: number;
	/** DOCX only: YAML metadata file (title page abstract). */
	frontFile?: string;
	/** HTML only: pandoc template path. */
	template?: string;
	/** Directory pandoc runs in, so relative image paths leave no local path in the file. */
	cwd?: string;
}

export function runPandoc(
	to: 'epub3' | 'docx' | 'html5',
	markdown: string,
	meta: PandocMeta,
	outPath: string
): void {
	const args = [
		'-f',
		PANDOC_FROM,
		'-t',
		to,
		'-o',
		outPath,
		'--metadata',
		`title=${meta.title}`,
		'--metadata',
		'lang=en-US',
		'--metadata',
		'rights=CC0 1.0 Universal',
		'--metadata',
		`identifier=${meta.identifier}`
	];
	if (meta.subtitle) args.push('--metadata', `subtitle=${meta.subtitle}`);
	if (meta.toc !== false) args.push('--toc', `--toc-depth=${meta.tocDepth ?? 3}`);
	if (to === 'html5') {
		args.push('--standalone', '--embed-resources', '--reference-location=block');
		if (meta.template) args.push(`--template=${meta.template}`);
		if (meta.css) args.push('--css', meta.css);
		if (meta.cover) args.push('--variable', `cover=${meta.cover}`);
	} else if (to === 'epub3') {
		if (meta.cover) args.push(`--epub-cover-image=${meta.cover}`);
		if (meta.css) args.push('--css', meta.css);
		args.push(`--split-level=${meta.splitLevel ?? 2}`);
	} else {
		if (meta.referenceDoc) args.push(`--reference-doc=${meta.referenceDoc}`);
		if (meta.frontFile) args.push(`--metadata-file=${meta.frontFile}`);
	}
	const res = spawnSync(process.env.PANDOC ?? 'pandoc', args, {
		input: markdown,
		encoding: 'utf8',
		maxBuffer: 1 << 28,
		cwd: meta.cwd
	});
	if (res.status !== 0) {
		throw new Error(`pandoc failed for ${outPath}: ${res.stderr || res.error}`);
	}
}

export const EPUB_SUBTITLE = EDITION;
