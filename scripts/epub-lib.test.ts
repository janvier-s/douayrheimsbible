import { describe, it, expect } from 'vitest';
import { toVerseBook } from './verse-only-lib';
import {
	inlineMd,
	mdEscape,
	renderBookMarkdown,
	renderTitlePageMarkdown,
	renderWholeMarkdown
} from './epub-lib';

const book = {
	book: 'genesis',
	book_title: 'The Book of Genesis,\nin Hebrew Beresith.',
	short_title: 'Genesis',
	intros: [{ text: 'INTRO TEXT' }],
	chapters: [
		{
			chapter: 1,
			summary: 'SUMMARY TEXT <na>[1]</na>',
			verses: [
				{ verse: 0, text: 'overflow of summary' },
				{
					verse: 1,
					text: 'In <cr>[1]</cr> the beginning <sc>GOD</sc> made <i>heaven</i> <na>(a)[1]</na>, and earth.'
				},
				{ verse: 2, text: 'Salt & <i> light </i> a*b_c^d~e' }
			]
		}
	]
};
const vb = toVerseBook('genesis', book as never, 'Genesis');

describe('inlineMd', () => {
	it('maps italics and small caps', () => {
		expect(inlineMd('made <i>heaven</i> and <sc>GOD</sc>', 'x')).toBe(
			'made *heaven* and [GOD]{.smallcaps}'
		);
	});
	it('moves whitespace outside a span', () => {
		expect(inlineMd('a <i> light </i> b', 'x')).toBe('a *light* b');
	});
	it('nests small caps in italics', () => {
		expect(inlineMd('<i>the <sc>LORD</sc> said</i>', 'x')).toBe('*the [LORD]{.smallcaps} said*');
	});
	it('escapes pandoc syntax characters', () => {
		expect(mdEscape('a*b_c^d~e&f[g]')).toBe('a\\*b\\_c\\^d\\~e\\&f\\[g\\]');
	});
});

describe('renderBookMarkdown', () => {
	const md = renderBookMarkdown(vb);
	it('has book and chapter headings and superscript verse numbers', () => {
		expect(md).toContain('# Genesis');
		expect(md).toContain('## Chapter 1');
		expect(md).toContain('^1^ In the beginning');
		expect(md).toContain('^2^ Salt');
	});
	it('leaks no apparatus', () => {
		for (const bad of ['INTRO TEXT', 'SUMMARY TEXT', 'overflow', '<na>', '<cr>', '(a)']) {
			expect(md).not.toContain(bad);
		}
	});
	it('shifts heading levels for the whole-Bible layout', () => {
		expect(renderBookMarkdown(vb, { level: 2 })).toContain('\n### Chapter 1');
	});
});

describe('renderWholeMarkdown', () => {
	it('puts a testament heading and title page before its books', () => {
		const tp = renderTitlePageMarkdown({
			title: 't',
			paragraphs: [
				{ text: 'THE\nHOLY BIBLE<br><span class="x">sub</span>' },
				{ text: '<i>Latin</i> & more' }
			]
		});
		const md = renderWholeMarkdown([{ heading: 'Old Testament', books: [vb], titlePage: tp }]);
		expect(md.indexOf('# Old Testament')).toBeLessThan(md.indexOf('HOLY BIBLE'));
		expect(md.indexOf('HOLY BIBLE')).toBeLessThan(md.indexOf('## Genesis'));
		expect(tp).toContain('*Latin* \\& more');
		expect(tp).not.toContain('<span');
	});
});
