// Hand-written fixtures: a corpus edit cannot quietly change what these assert.
import { describe, it, expect } from 'vitest';
import {
	verseText,
	toVerseBook,
	renderMarkdown,
	renderText,
	renderUsfmVerseOnly,
	csvRows
} from './verse-only-lib';

const book = {
	book: 'genesis',
	book_title: 'The Book of Genesis,\nin Hebrew Beresith.',
	short_title: 'Genesis',
	intros: [{ text: 'intro' }],
	chapters: [
		{
			chapter: 1,
			summary: 'Sum <na>[1]</na>',
			verses: [
				{ verse: 0, text: 'overflow of summary' },
				{
					verse: 1,
					text: 'In <cr>[1]</cr> the beginning <sc>GOD</sc> made <i>heaven</i> <na>(a)[1]</na>, and earth.'
				},
				{ verse: 2, text: 'He <alt>said</alt> <na>[2]</na>: "Light".' }
			]
		}
	]
};

describe('verseText', () => {
	it('removes markers and the space they leave', () => {
		expect(verseText('In <cr>[1]</cr> the', 'x')).toBe('In the');
		expect(verseText('end <na>(a)[1]</na>, more', 'x')).toBe('end, more');
	});
	it('keeps <alt> words', () => {
		expect(verseText('He <alt>said</alt> <na>[2]</na>: x', 'x')).toBe('He said: x');
	});
});

describe('verse-only books', () => {
	const b = toVerseBook('genesis', book as never, 'Genesis');
	it('drops summaries, intros and verse 0', () => {
		expect(b.chapters[0].verses.map((v) => v.verse)).toEqual([1, 2]);
	});
	it('flattens titles', () => expect(b.title).toBe('The Book of Genesis, in Hebrew Beresith.'));
	it('leaves no marker residue in any format', () => {
		const all = [
			renderMarkdown(b),
			renderText(b),
			renderUsfmVerseOnly(b),
			csvRows(b).join('\n')
		].join('\n');
		expect(all).not.toMatch(/<(na|cr|alt)>|\[\d+\]|\([a-z]\)|\\f |\\x |summary|overflow/);
	});
	it('markdown keeps italics, usfm keeps italics and small caps', () => {
		expect(renderMarkdown(b)).toContain('*heaven*');
		const u = renderUsfmVerseOnly(b);
		expect(u).toContain('\\sc GOD\\sc*');
		expect(u).toContain('\\it heaven\\it*');
	});
	it('quotes csv cells', () => {
		expect(csvRows(b)[1]).toContain('"He said: ""Light""."');
	});
});
