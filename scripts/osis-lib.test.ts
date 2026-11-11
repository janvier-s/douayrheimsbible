import { describe, it, expect } from 'vitest';
import { toVerseBook } from './verse-only-lib';
import { inlineOsis, renderOsis, verseOsisId, titleLinesOsis } from './osis-lib';

const book = {
	book: 'genesis',
	book_title: 'The Book of Genesis',
	short_title: 'Genesis',
	intros: [{ text: 'INTRO' }],
	chapters: [
		{
			chapter: 1,
			summary: 'SUMMARY <na>[1]</na>',
			verses: [
				{ verse: 1, text: 'In <cr>[1]</cr> the <sc>LORD</sc> made <i>heaven</i> & earth <na>(a)[1]</na>.' },
				{ verse: 2, text: 'First' },
				{ verse: 2, text: 'Repeat <i>a <sc>B</sc></i> <lt>' }
			]
		}
	]
};

describe('osis', () => {
	it('maps spans and escapes XML', () => {
		expect(inlineOsis('made <i>heaven</i> & <sc>GOD</sc>', 'x')).toBe(
			'made <hi type="italic">heaven</hi> &amp; <hi type="small-caps">GOD</hi>'
		);
	});
	it('gives repeated verse numbers unique ids', () => {
		expect(verseOsisId('Gen', 1, { verse: 2, part: '' })).toBe('Gen.1.2');
		expect(verseOsisId('Gen', 1, { verse: 2, part: 'b' })).toBe('Gen.1.2!b');
	});
	it('renders a book with book, chapter and verse ids and no apparatus', () => {
		const vb = toVerseBook('genesis', { ...book, chapters: [{ ...book.chapters[0], verses: book.chapters[0].verses.slice(0, 2) }] } as never, 'Genesis');
		const xml = renderOsis([{ heading: 'OT', books: [vb] }], { title: 'Genesis', whole: false });
		expect(xml).toContain('<div type="book" osisID="Gen">');
		expect(xml).toContain('<chapter osisID="Gen.1">');
		expect(xml).toContain('<verse osisID="Gen.1.1">In the <hi type="small-caps">LORD</hi>');
		for (const bad of ['INTRO', 'SUMMARY', '<note', '(a)']) expect(xml).not.toContain(bad);
	});
	it('keeps italics around nested small caps', () => {
		expect(inlineOsis('<i>a <sc>B</sc></i>', 'x')).toBe(
			'<hi type="italic">a <hi type="small-caps">B</hi></hi>'
		);
	});
	it('turns title page lines into escaped lines', () => {
		expect(titleLinesOsis([{ text: 'A & B<br><span class="x">c</span>\n<i>d</i>' }])).toEqual([
			'A &amp; B',
			'c',
			'<hi type="italic">d</hi>'
		]);
	});
});
