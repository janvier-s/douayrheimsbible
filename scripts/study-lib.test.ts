// Hand-written fixtures: a corpus edit cannot quietly change what these assert.
import { describe, it, expect } from 'vitest';
import { ExportError } from './export-lib';
import { markedInline, plainInline, splitParas, inlineText, toStudyBook } from './study-lib';
import { renderStudyBookMarkdown, newState } from './study-md-lib';
import { renderStudyOsisBook, osisInline } from './study-osis-lib';
import { toRefDoc, splitTitle } from './study-ref-lib';

const notes = (...t: string[]) => t.map((text, i) => ({ label: String(i + 1), text }));

describe('markedInline', () => {
	it('turns <na> into a footnote node and drops the space before it', () => {
		const inl = markedInline('In <na>[1]</na>, the end', 'verse', 'x', {
			notes: notes('Note one'),
			noteBlock: 'verse'
		});
		expect(inl.map((n) => n.t)).toEqual(['txt', 'note', 'txt']);
		expect((inl[0] as any).v).toBe('In');
		expect((inl[2] as any).v).toBe(', the end');
	});
	it('keeps a space between a note and following words', () => {
		const inl = markedInline('In <na>[1]</na> the end', 'verse', 'x', {
			notes: notes('N'),
			noteBlock: 'verse'
		});
		expect(inlineText(inl)).toBe('In the end');
	});
	it('turns <cr> into a cross-reference node', () => {
		const inl = markedInline('A <cr>[1]</cr> b', 'verse', 'x', {
			notes: [],
			refs: [{ text: 'Gen. 1. 2.' }],
			noteBlock: 'verse'
		});
		const n = inl.find((x) => x.t === 'note') as any;
		expect(n.kind).toBe('xref');
		expect(inlineText(n.body)).toBe('Gen. 1. 2.');
	});
	it('anchors <alt> words as the note catchword', () => {
		const inl = markedInline('He <alt>said</alt> <na>[1]</na>: x', 'verse', 'x', {
			notes: notes('N'),
			noteBlock: 'verse'
		});
		expect((inl.find((x) => x.t === 'note') as any).catchword).toBe('said');
	});
	it('stops on a marker that matches no note', () => {
		expect(() =>
			markedInline('A <na>[9]</na> b', 'verse', 'bad ref', {
				notes: notes('N'),
				noteBlock: 'verse'
			})
		).toThrow(ExportError);
	});
	it('stops on a cross-reference marker with no cross_refs entry', () => {
		expect(() =>
			markedInline('A <cr>[1]</cr> b', 'verse', 'x', { notes: [], noteBlock: 'verse' })
		).toThrow(/cross-reference marker/);
	});
	it('keeps an unreferenced note at the end when asked (reference documents)', () => {
		const inl = markedInline('Plain', 'prose', 'x', {
			notes: [{ marker: 0, text: 'Cite' }],
			noteBlock: 'prose',
			keepUnreferenced: true
		});
		expect(inl[inl.length - 1].t).toBe('note');
	});
});

describe('inline structure', () => {
	it('nests small caps inside italics', () => {
		const inl = plainInline('<i>the <sc>LORD</sc> said</i>', 'prose', 'x');
		expect((inl[0] as any).c.map((n: any) => n.t)).toEqual(['txt', 'sc', 'txt']);
	});
	it('splits paragraphs on <br> and drops empty ones', () => {
		const paras = splitParas(plainInline('One<br><br>Two<br>', 'prose', 'x'));
		expect(paras.map(inlineText)).toEqual(['One', 'Two']);
	});
});

const book = {
	book: 'tobias',
	book_title: 'The Book\nof Tobias',
	short_title: 'Tobias',
	intros: [
		{
			title: 'Intro title',
			text: 'INTRO <mn>[1]</mn> text',
			notes: [{ marker: 1, text: 'Intro note' }]
		}
	],
	chapters: [
		{ chapter: 0, verses: [{ verse: 1, text: 'PREFACE words' }] },
		{
			chapter: 1,
			summary: 'SUMMARY words <na>[1]</na>',
			summary_notes: [{ marker: 1, text: 'Summary note' }],
			verses: [
				{ verse: 0, text: 'overflow words' },
				{
					verse: 1,
					text: 'One <i>two</i> & <sc>GOD</sc> <na>[1]</na>',
					notes: [{ label: '1', text: 'Verse <i>note</i>' }]
				},
				{ verse: 2, text: 'x' }
			]
		}
	]
};
// verse 2 above would fail to tokenize; use a valid one
book.chapters[1].verses[2].text = 'Plain *star* _under_ ^up^';

const annotations = new Map([
	[
		1,
		[
			{
				verse: 1,
				title: 'Ann title',
				text: 'Annotation <mn>[1]</mn> body',
				notes: [{ marker: 1, text: 'Sub note' }]
			}
		]
	]
]);
const sb = toStudyBook('tobias', book as never, annotations as never, 'Tobias');

describe('toStudyBook', () => {
	it('collects intro, preface, summary with overflow, and annotations', () => {
		expect(sb.intros).toHaveLength(1);
		expect(sb.preface.map(inlineText)).toEqual(['PREFACE words']);
		expect(inlineText(sb.chapters[0].summary!)).toContain('overflow words');
		expect(sb.chapters[0].verses[0].annotations).toHaveLength(1);
		expect(sb.chapters).toHaveLength(1);
	});
	it('stops on a repeated verse number that is not pinned', () => {
		const dup = {
			...book,
			chapters: [
				{
					chapter: 1,
					verses: [
						{ verse: 1, text: 'a' },
						{ verse: 1, text: 'b' }
					]
				}
			]
		};
		expect(() => toStudyBook('tobias', dup as never, new Map(), 'T')).toThrow(/appears 2 times/);
	});
	it('builds a book with no intro, summary or annotations without empty parts', () => {
		const bare = toStudyBook(
			'ruth',
			{ book: 'ruth', chapters: [{ chapter: 1, verses: [{ verse: 1, text: 'Words' }] }] } as never,
			new Map(),
			'Ruth'
		);
		const md = renderStudyBookMarkdown(bare, newState());
		expect(md).not.toMatch(/Introduction|Preface|End Matter|summary/);
	});
});

describe('Markdown', () => {
	const md = renderStudyBookMarkdown(sb, newState());
	it('emits footnotes for notes and sub-notes', () => {
		expect(md).toMatch(/\[\^\d+\]: Verse \*note\*/);
		expect(md).toMatch(/\[\^\d+\]: Summary note/);
		expect(md).toMatch(/\[\^\d+\]: Sub note/);
		expect(md).toMatch(/\[\^\d+\]: Intro note/);
	});
	it('puts the annotation after its verse as a styled block with its title', () => {
		expect(md.indexOf('^1^')).toBeLessThan(md.indexOf('custom-style="Annotation"'));
		expect(md).toContain('**Ann title.**');
	});
	it('escapes syntax characters in verse text', () => {
		expect(md).toContain('\\*star\\*');
		expect(md).toContain('\\_under\\_');
		expect(md).toContain('\\^up\\^');
	});
	it('shows the preface and the summary', () => {
		expect(md).toContain('## Preface');
		expect(md).toContain('PREFACE words');
		expect(md).toContain('{.summary');
	});
});

describe('OSIS', () => {
	const xml = renderStudyOsisBook(sb);
	it('uses note types and div types', () => {
		expect(xml).toContain('<div type="introduction">');
		expect(xml).toContain('<div type="summary">');
		expect(xml).toContain('<note type="study">');
		expect(xml).toContain('<note>Verse');
	});
	it('flattens annotation sub-notes instead of nesting notes', () => {
		const study = xml.match(/<note type="study">[\s\S]*?<\/note>/)![0];
		expect(study).not.toMatch(/<note[^>]*>[\s\S]*<note/);
		expect(study).toContain('Sub note');
	});
	it('escapes and marks italics', () => {
		expect(osisInline(plainInline('a & <i>b</i>', 'prose', 'x'))).toBe(
			'a &amp; <hi type="italic">b</hi>'
		);
	});
});

describe('reference documents', () => {
	it('splits a title from its sub-title span', () => {
		expect(splitTitle('A TABLE<br><span class="s">Wherein x</span>')).toEqual({
			title: 'A TABLE',
			subs: ['Wherein x']
		});
	});
	it('reads paragraphs, tables and letter groups', () => {
		const d = toRefDoc('t', {
			title: 'T',
			paragraphs: [
				{ text: 'Para <mn>[1]</mn>', notes: [{ marker: 1, text: 'n' }] },
				{
					table: [
						['H1', 'H2'],
						['a', 'b']
					]
				},
				{ letter: 'A', entries: ['<i>Aaron</i> x'] }
			]
		});
		expect(d.blocks.map((b) => b.k)).toEqual(['p', 'table', 'h', 'p']);
	});
	it('rejects a shape it does not know', () => {
		expect(() => toRefDoc('t', { title: 'T', mystery: [] })).toThrow(
			/unrecognised reference shape/
		);
	});
});

describe('pinned unreferenced notes', () => {
	it('keeps a note no marker points at as a footnote at the end of the verse', () => {
		// romans 10:16 is pinned in KNOWN_UNREFERENCED: a <cr> marker, and a gloss no marker references.
		const inl = markedInline('But all <cr>[1]</cr> do not obey.', 'verse', 'romans 10:16', {
			notes: [{ label: '1', text: 'Free will gloss' }],
			refs: [{ text: 'Esa. 53, 1.' }],
			noteBlock: 'verse'
		});
		const notes = inl.filter((n) => n.t === 'note') as any[];
		expect(notes.map((n) => n.kind)).toEqual(['xref', 'fn']);
		expect(inlineText(notes[1].body)).toBe('Free will gloss');
		expect(inl[inl.length - 1].t).toBe('note');
	});
});

describe('list-like text', () => {
	it('escapes a leading number so a cross-reference is not read as a list', async () => {
		const { escLead } = await import('./study-md-lib');
		expect(escLead('1. Tim. 4. 2. Tim. 3.')).toBe('1\\. Tim. 4. 2. Tim. 3.');
		expect(escLead('- dash')).toBe('\\- dash');
		expect(escLead('In 1. Tim.')).toBe('In 1. Tim.');
	});
	it('writes a footnote whose text starts with a number with the full stop escaped', () => {
		const vb = toStudyBook(
			'jude',
			{
				book: 'jude',
				chapters: [
					{
						chapter: 1,
						verses: [
							{
								verse: 18,
								text: 'x <cr>[1]</cr> y',
								cross_refs: [{ text: '1. Tim. 4. 2. Pet. 3.' }]
							}
						]
					}
				]
			} as never,
			new Map(),
			'Jude'
		);
		expect(renderStudyBookMarkdown(vb, newState())).toMatch(/\[\^1\]: 1\\\. Tim\. 4\./);
	});
});
