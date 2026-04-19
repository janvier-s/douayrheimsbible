import { describe, it, expect } from 'vitest';
import { usfmToSlug } from './extract-haydock';
import { parseVerseText } from './extract-haydock';
import { parseFootnote } from './extract-haydock';
import { parseCrossRef } from './extract-haydock';
import { parseBookFile } from './extract-haydock';

describe('usfmToSlug', () => {
	it('maps OT book codes', () => {
		expect(usfmToSlug('GEN')).toBe('genesis');
		expect(usfmToSlug('EXO')).toBe('exodus');
		expect(usfmToSlug('PSA')).toBe('psalms');
		expect(usfmToSlug('1SA')).toBe('1-kings');
		expect(usfmToSlug('2SA')).toBe('2-kings');
		expect(usfmToSlug('1KI')).toBe('3-kings');
		expect(usfmToSlug('2KI')).toBe('4-kings');
		expect(usfmToSlug('1CH')).toBe('1-paralipomenon');
		expect(usfmToSlug('EZR')).toBe('1-esdras');
		expect(usfmToSlug('NEH')).toBe('2-esdras');
		expect(usfmToSlug('SNG')).toBe('canticle-of-canticles');
		expect(usfmToSlug('SIR')).toBe('ecclesiasticus');
	});

	it('maps NT book codes', () => {
		expect(usfmToSlug('MAT')).toBe('matthew');
		expect(usfmToSlug('MRK')).toBe('mark');
		expect(usfmToSlug('JHN')).toBe('john');
		expect(usfmToSlug('REV')).toBe('apocalypse');
		expect(usfmToSlug('PHM')).toBe('philemon');
	});

	it('returns undefined for unknown codes', () => {
		expect(usfmToSlug('XXX')).toBeUndefined();
		expect(usfmToSlug('FRT')).toBeUndefined();
		expect(usfmToSlug('INT')).toBeUndefined();
		expect(usfmToSlug('BAK')).toBeUndefined();
	});
});

describe('parseVerseText', () => {
	it('extracts verse number and text', () => {
		const result = parseVerseText('\\v 1 In the beginning God created heaven and earth.');
		expect(result).toEqual({ verse: 1, text: 'In the beginning God created heaven and earth.' });
	});

	it('converts single asterisk to superscript ¹', () => {
		const result = parseVerseText('\\v 1 In the *beginning God created heaven and earth.');
		expect(result).toEqual({ verse: 1, text: 'In the ¹beginning God created heaven and earth.' });
	});

	it('converts multiple asterisks to sequential superscripts', () => {
		const result = parseVerseText(
			'\\v 2 *Abraham begot **Isaac. And Isaac begot Jacob. ***And Jacob begot Judas.'
		);
		expect(result).toEqual({
			verse: 2,
			text: '¹Abraham begot ²Isaac. And Isaac begot Jacob. ³And Jacob begot Judas.'
		});
	});

	it('converts quadruple asterisk', () => {
		const result = parseVerseText('\\v 5 And Salmon begot Booz of Rahab.* text** more***');
		expect(result).toEqual({
			verse: 5,
			text: 'And Salmon begot Booz of Rahab.¹ text² more³'
		});
	});

	it('returns null for non-verse lines', () => {
		expect(parseVerseText('\\p')).toBeNull();
		expect(parseVerseText('\\c 1')).toBeNull();
	});
});

describe('parseFootnote', () => {
	it('parses simple footnote', () => {
		const result = parseFootnote(
			'\\f + \\fr 1:1 \\ft Year of the World 1, Year before Christ 4004.\\f*'
		);
		expect(result).toEqual({
			chapter: 1,
			verse: 1,
			text: 'Year of the World 1, Year before Christ 4004.'
		});
	});

	it('parses long commentary with --- separators converted to <hr>', () => {
		const result = parseFootnote(
			'\\f + \\fr 1:2 \\ft Spirit of God, giving life. (Haydock)---This Spirit is what the Pagan philosophers styled the Soul of the World. (Calmet)\\f*'
		);
		expect(result).toEqual({
			chapter: 1,
			verse: 2,
			text: 'Spirit of God, giving life. (Haydock)<hr>This Spirit is what the Pagan philosophers styled the Soul of the World. (Calmet)'
		});
	});

	it('handles \\fr without space before \\ft', () => {
		const result = parseFootnote('\\f + \\fr 1:1\\ft Beginning. As St. Matthew begins...\\f*');
		expect(result).toEqual({ chapter: 1, verse: 1, text: 'Beginning. As St. Matthew begins...' });
	});

	it('parses chapter:verse 0 for chapter-level commentary', () => {
		const result = parseFootnote('\\f + \\fr 2:0 \\ft This psalm has no title.\\f*');
		expect(result).toEqual({ chapter: 2, verse: 0, text: 'This psalm has no title.' });
	});

	it('converts curly-brace side notes to parenthetical text', () => {
		const result = parseFootnote(
			'\\f + \\fr 1:1\\ft The book of the{ Ver. 1. Liber Generationis.|} Generation.\\f*'
		);
		expect(result).toEqual({
			chapter: 1,
			verse: 1,
			text: 'The book of the (Ver. 1. Liber Generationis.) Generation.'
		});
	});

	it('returns null for non-footnote lines', () => {
		expect(parseFootnote('\\v 1 text')).toBeNull();
	});
});

describe('parseCrossRef', () => {
	it('parses cross-reference with multiple refs', () => {
		const result = parseCrossRef('\\x + \\xo 1:2 \\xt Acts 14:14.; Acts 17:24.; Psalm 32:6.\\x*');
		expect(result).toEqual({
			chapter: 1,
			verse: 2,
			refs: 'Acts 14:14.; Acts 17:24.; Psalm 32:6.'
		});
	});

	it('parses single ref', () => {
		const result = parseCrossRef('\\x + \\xo 1:3 \\xt Hebrews 11:3.\\x*');
		expect(result).toEqual({ chapter: 1, verse: 3, refs: 'Hebrews 11:3.' });
	});

	it('handles \\xo without space before \\xt', () => {
		const result = parseCrossRef('\\x + \\xo 1:2\\xt Acts 14:14.\\x*');
		expect(result).toEqual({ chapter: 1, verse: 2, refs: 'Acts 14:14.' });
	});

	it('returns null for non-crossref lines', () => {
		expect(parseCrossRef('\\f + \\fr 1:1 \\ft text\\f*')).toBeNull();
	});
});

describe('parseBookFile', () => {
	const samplePsfm = [
		'\\id GEN ENG (p.sfm) - Haydock',
		'\\ide UTF-8',
		'\\h Genesis',
		'\\toc1 Genesis',
		'\\toc2 Genesis',
		'\\toc3 Gen',
		'\\imt1 THE BOOK OF GENESIS.',
		'\\im This is the intro paragraph one.',
		'\\ip This is intro paragraph two.',
		'\\mt1 Genesis',
		'<>',
		'\\c 1',
		'\\cl Genesis 1',
		'\\cd God createth Heaven and Earth.',
		'\\p',
		'\\v 1 In the *beginning God created heaven and earth.',
		'\\p',
		'\\v 2 *And the earth was void.',
		'\\x + \\xo 1:1 \\xt Psalm 32:6.\\x*',
		'\\f + \\fr 1:1 \\ft Year of the World 1.\\f*',
		'\\f + \\fr 1:1 \\ft Beginning. Commentary text here.\\f*',
		'\\f + \\fr 1:2 \\ft Spirit of God. More commentary.\\f*',
		'<>',
		'\\c 2',
		'\\cl Genesis 2',
		'\\cd God resteth on the seventh day.',
		'\\p',
		'\\v 1 So the heavens and the earth were finished.'
	].join('\n');

	it('extracts book slug from \\id line', () => {
		const result = parseBookFile(samplePsfm);
		expect(result.slug).toBe('genesis');
	});

	it('extracts intro paragraphs from \\im and \\ip lines', () => {
		const result = parseBookFile(samplePsfm);
		expect(result.intro).toEqual([
			'This is the intro paragraph one.',
			'This is intro paragraph two.'
		]);
	});

	it('extracts chapters with summaries', () => {
		const result = parseBookFile(samplePsfm);
		expect(result.chapters).toHaveLength(2);
		expect(result.chapters[0].chapter).toBe(1);
		expect(result.chapters[0].summary).toBe('God createth Heaven and Earth.');
		expect(result.chapters[1].summary).toBe('God resteth on the seventh day.');
	});

	it('extracts verses with superscript markers', () => {
		const result = parseBookFile(samplePsfm);
		expect(result.chapters[0].verses).toHaveLength(2);
		expect(result.chapters[0].verses[0]).toEqual({
			verse: 1,
			text: 'In the ¹beginning God created heaven and earth.'
		});
		expect(result.chapters[0].verses[1]).toEqual({ verse: 2, text: '¹And the earth was void.' });
	});

	it('extracts footnotes grouped by chapter and verse', () => {
		const result = parseBookFile(samplePsfm);
		const ch1Notes = result.commentary[1]; // chapter 1
		expect(ch1Notes).toHaveLength(3);
		expect(ch1Notes[0]).toEqual({ verse: 1, marker: '1', text: 'Year of the World 1.' });
		expect(ch1Notes[1]).toEqual({
			verse: 1,
			marker: '2',
			text: 'Beginning. Commentary text here.'
		});
		expect(ch1Notes[2]).toEqual({ verse: 2, marker: '1', text: 'Spirit of God. More commentary.' });
	});

	it('extracts cross-references grouped by chapter', () => {
		const result = parseBookFile(samplePsfm);
		const ch1Refs = result.crossRefs[1];
		expect(ch1Refs).toHaveLength(1);
		expect(ch1Refs[0]).toEqual({ verse: 1, marker: 1, refs: 'Psalm 32:6.' });
	});
});
