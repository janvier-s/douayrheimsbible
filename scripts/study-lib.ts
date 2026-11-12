// scripts/study-lib.ts
// A format-neutral model of the study edition. Every block of text becomes an
// Inline[] tree in which italics, small caps, line breaks and notes are
// explicit nodes. The Markdown (EPUB, DOCX) and OSIS emitters walk this tree,
// so the markup is parsed once, by export-lib's tokenize and bindMarkers, and
// a binding error stops the build exactly as it does for USFM.

import {
	tokenize,
	bindMarkers,
	assertOnlyKnownDefects,
	assertRefsConsumed,
	balanceInline,
	ExportError,
	KNOWN_UNBALANCED,
	KNOWN_DUPLICATE_VERSE,
	SUMMARY_OVERFLOW_VERSE,
	PREFACE_CHAPTER,
	bookCode,
	introRef,
	endMatterRef,
	articleRef,
	summaryRef,
	verseRef,
	annotationRef,
	type Book,
	type Annotation,
	type BlockKind,
	type NoteLike,
	type TagName,
	type MarkerHit
} from './export-lib.js';

export type Inline =
	| { t: 'txt'; v: string }
	| { t: 'i' | 'sc'; c: Inline[] }
	| { t: 'br' }
	| { t: 'note'; kind: 'fn' | 'xref'; catchword?: string; body: Inline[] };

const txt = (v: string): Inline => ({ t: 'txt', v });
const PUNCT = /^[\s,.;:!?)\]]/;

/** Parses tagged text that has no markers (a note body, a table cell, a title). */
export function plainInline(text: string, block: BlockKind, ref: string): Inline[] {
	const source = KNOWN_UNBALANCED.has(ref) ? balanceInline(text) : text;
	const root: Inline[] = [];
	const stack: Inline[][] = [root];
	for (const node of tokenize(source, block, ref)) {
		const cur = stack[stack.length - 1];
		if (node.kind === 'text') cur.push(txt(node.value));
		else if (node.name === 'i' || node.name === 'sc') {
			if (node.close) stack.pop();
			else {
				const n: Inline = { t: node.name, c: [] };
				cur.push(n);
				stack.push(n.c);
			}
		} else if (node.name === 'br') cur.push({ t: 'br' });
	}
	return root;
}

export interface MarkerCtx {
	notes: NoteLike[];
	refs?: Array<{ text: string; source?: string }>;
	/** Vocabulary of the note bodies; the USFM renderer uses 'prose' for all but verse notes. */
	noteBlock: BlockKind;
	/**
	 * Reference documents only: an unreferenced note is accepted without being
	 * pinned in KNOWN_UNREFERENCED. A marker that matches no note still stops
	 * the build. (Unreferenced notes are kept as footnotes either way.)
	 */
	keepUnreferenced?: boolean;
}

/**
 * Text with its markers resolved: each <na>/<mn> becomes a footnote node and
 * each <cr> a cross-reference node, at the position the marker stood.
 */
export function markedInline(text: string, block: BlockKind, ref: string, ctx: MarkerCtx): Inline[] {
	const notes = ctx.notes;
	const refs = ctx.refs ?? [];
	const bound = bindMarkers(text, notes, block, ref);
	if (ctx.keepUnreferenced) {
		if (bound.unbound.length) throw new ExportError(ref, `marker with no note: ${bound.unbound}`);
	} else assertOnlyKnownDefects(bound, notes, ref);
	const at = new Map<number, MarkerHit[]>();
	for (const h of bound.hits) at.set(h.start, [...(at.get(h.start) ?? []), h]);

	const nodes = tokenize(text, block, ref);
	// Each <alt> names the words a marginal note is about; pair it with the
	// nearest marker, as renderVerse does.
	const altFor = new Map<number, string>();
	for (let i = 0; i < nodes.length; i++) {
		const n = nodes[i];
		if (n.kind !== 'tag' || n.close || n.name !== 'alt') continue;
		let words = '';
		for (let j = i + 1; j < nodes.length; j++) {
			const m = nodes[j];
			if (m.kind === 'tag' && m.close && m.name === 'alt') break;
			if (m.kind === 'text') words += m.value;
		}
		const before = nodes.slice(0, i).reverse().find((m) => m.kind === 'tag' && !m.close && m.name !== 'alt');
		const after = nodes.slice(i).find((m) => m.kind === 'tag' && !m.close && (m.name === 'na' || m.name === 'cr'));
		const anchor = before?.kind === 'tag' && (before.name === 'na' || before.name === 'cr') ? before : after;
		if (anchor?.kind === 'tag') altFor.set(anchor.start, words.trim());
	}

	const root: Inline[] = [];
	const stack: Inline[][] = [root];
	let skip: TagName | null = null;
	let crIndex = 0;
	let pendingSpace = false;

	const pushText = (v: string) => {
		const cur = stack[stack.length - 1];
		if (pendingSpace && v && !PUNCT.test(v)) v = ` ${v}`;
		if (v) pendingSpace = false;
		cur.push(txt(v));
	};
	const pushNote = (n: Inline) => {
		const cur = stack[stack.length - 1];
		const last = cur[cur.length - 1];
		if (last && last.t === 'txt' && /\s$/.test(last.v)) {
			last.v = last.v.replace(/\s+$/, '');
			pendingSpace = true;
		}
		cur.push(n);
	};

	for (const node of nodes) {
		if (node.kind === 'text') {
			if (!skip) pushText(node.value);
			continue;
		}
		if (skip) {
			if (node.close && node.name === skip) skip = null;
			continue;
		}
		if (node.name === 'i' || node.name === 'sc') {
			if (node.close) stack.pop();
			else {
				const n: Inline = { t: node.name, c: [] };
				stack[stack.length - 1].push(n);
				stack.push(n.c);
			}
		} else if (node.close) {
			continue;
		} else if (node.name === 'na' || node.name === 'mn') {
			skip = node.name;
			const alt = altFor.get(node.start);
			for (const hit of at.get(node.start) ?? []) {
				pushNote({
					t: 'note',
					kind: 'fn',
					catchword: alt || undefined,
					body: plainInline(notes[hit.noteIndex].text, ctx.noteBlock, ref)
				});
			}
		} else if (node.name === 'cr') {
			skip = 'cr';
			const target = refs[crIndex++];
			if (!target) throw new ExportError(ref, 'cross-reference marker with no cross_refs entry');
			pushNote({
				t: 'note',
				kind: 'xref',
				catchword: altFor.get(node.start) || undefined,
				body: [txt(target.text)]
			});
		} else if (node.name === 'br') {
			stack[stack.length - 1].push({ t: 'br' });
		}
	}
	assertRefsConsumed(refs, crIndex, ref);
	// A note no marker points at (23 in the corpus, pinned in KNOWN_UNREFERENCED)
	// is kept as a footnote at the end of its text. The USFM export omits them;
	// the study edition must not drop a note without saying so.
	for (const i of bound.unreferenced) {
		root.push({ t: 'note', kind: 'fn', body: plainInline(notes[i].text, ctx.noteBlock, ref) });
	}
	return root;
}

/** Splits on top-level line breaks into paragraphs; empty ones are dropped. */
export function splitParas(inl: Inline[]): Inline[][] {
	const out: Inline[][] = [[]];
	for (const n of inl) {
		if (n.t === 'br') out.push([]);
		else out[out.length - 1].push(n);
	}
	return out.filter((p) => inlineText(p).trim() || p.some((n) => n.t === 'note'));
}

/** The words of an Inline[] with notes left out. */
export function inlineText(inl: Inline[]): string {
	return inl
		.map((n) => (n.t === 'txt' ? n.v : n.t === 'i' || n.t === 'sc' ? inlineText(n.c) : n.t === 'br' ? ' ' : ''))
		.join('');
}

export interface StudyBlock {
	title?: string;
	paras: Inline[][];
}
export interface StudyVerse {
	verse: number;
	part: string;
	label: string;
	inl: Inline[];
	annotations: StudyBlock[];
}
export interface StudyChapter {
	chapter: number;
	summary?: Inline[];
	articles: StudyBlock[];
	verses: StudyVerse[];
}
export interface StudyBook {
	slug: string;
	code: string;
	ordinal: number;
	title: string;
	shortTitle: string;
	intros: StudyBlock[];
	/** Chapter 0 of Tobias: the preface, printed before chapter 1. */
	preface: Inline[][];
	chapters: StudyChapter[];
	endMatter: StudyBlock[];
}

const SEGMENTS = 'bcdefghijklmnopqrstuvwxyz';
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

const proseBlock = (
	p: { title?: string; text: string; notes?: NoteLike[] },
	ref: string
): StudyBlock => ({
	title: p.title ? oneLine(p.title) : undefined,
	paras: splitParas(markedInline(p.text, 'prose', ref, { notes: p.notes ?? [], noteBlock: 'prose' }))
});

function verseInline(
	v: { text: string; notes?: NoteLike[]; cross_refs?: Array<{ text: string; source?: string }> },
	ref: string
): Inline[] {
	return markedInline(v.text, 'verse', ref, {
		notes: v.notes ?? [],
		refs: v.cross_refs,
		noteBlock: 'verse'
	});
}

export function toStudyBook(
	slug: string,
	book: Book,
	annotations: Map<number, Annotation[]>,
	fallbackTitle: string
): StudyBook {
	const { usfm, ordinal } = bookCode(slug);
	const preface: Inline[][] = [];
	const chapters: StudyChapter[] = [];

	for (const chapter of book.chapters) {
		if (chapter.chapter === PREFACE_CHAPTER) {
			for (const v of chapter.verses) {
				const inl = verseInline(v, verseRef(slug, chapter.chapter, v.verse));
				if (inlineText(inl).trim()) preface.push(inl);
			}
			continue;
		}

		let summary: Inline[] | undefined;
		if (chapter.summary) {
			const ref = summaryRef(slug, chapter.chapter);
			summary = markedInline(chapter.summary, 'summary', ref, {
				notes: chapter.summary_notes ?? [],
				noteBlock: 'prose'
			});
		}
		const overflow = chapter.verses.find((v) => v.verse === SUMMARY_OVERFLOW_VERSE);
		if (overflow) {
			const more = verseInline(overflow, verseRef(slug, chapter.chapter, SUMMARY_OVERFLOW_VERSE));
			summary = [...(summary ?? []), ...(summary ? [txt(' ')] : []), ...more];
		}

		const byVerse = new Map<number, StudyBlock[]>();
		for (const ann of annotations.get(chapter.chapter) ?? []) {
			const block = proseBlock(
				{ title: ann.title ?? undefined, text: ann.text, notes: ann.notes },
				annotationRef(slug, chapter.chapter, ann)
			);
			byVerse.set(ann.verse, [...(byVerse.get(ann.verse) ?? []), block]);
		}

		const seen = new Map<number, number>();
		const verses: StudyVerse[] = [];
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
				inl: verseInline(v, ref),
				annotations: nth === 1 ? (byVerse.get(v.verse) ?? []) : []
			});
		}

		chapters.push({
			chapter: chapter.chapter,
			summary,
			articles: (chapter.articles ?? []).map((a, i) =>
				proseBlock(a, articleRef(slug, chapter.chapter, i))
			),
			verses
		});
	}

	return {
		slug,
		code: usfm,
		ordinal,
		title: oneLine(book.book_title ?? fallbackTitle),
		shortTitle: oneLine(book.short_title ?? book.book ?? fallbackTitle),
		intros: (book.intros ?? []).map((p, i) => proseBlock(p, introRef(slug, i))),
		preface,
		chapters,
		endMatter: (book.endMatters ?? []).map((p, i) => proseBlock(p, endMatterRef(slug, i)))
	};
}
