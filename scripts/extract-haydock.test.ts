import { describe, it, expect } from 'vitest';
import { usfmToSlug } from './extract-haydock';
import { parseVerseText } from './extract-haydock';
import { parseFootnote } from './extract-haydock';
import { parseCrossRef } from './extract-haydock';

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
    const result = parseVerseText('\\v 2 *Abraham begot **Isaac. And Isaac begot Jacob. ***And Jacob begot Judas.');
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
    const result = parseFootnote('\\f + \\fr 1:1 \\ft Year of the World 1, Year before Christ 4004.\\f*');
    expect(result).toEqual({ chapter: 1, verse: 1, text: 'Year of the World 1, Year before Christ 4004.' });
  });

  it('parses long commentary with --- separators converted to <hr>', () => {
    const result = parseFootnote('\\f + \\fr 1:2 \\ft Spirit of God, giving life. (Haydock)---This Spirit is what the Pagan philosophers styled the Soul of the World. (Calmet)\\f*');
    expect(result).toEqual({
      chapter: 1, verse: 2,
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
    const result = parseFootnote('\\f + \\fr 1:1\\ft The book of the{ Ver. 1. Liber Generationis.|} Generation.\\f*');
    expect(result).toEqual({ chapter: 1, verse: 1, text: 'The book of the (Ver. 1. Liber Generationis.) Generation.' });
  });

  it('returns null for non-footnote lines', () => {
    expect(parseFootnote('\\v 1 text')).toBeNull();
  });
});

describe('parseCrossRef', () => {
  it('parses cross-reference with multiple refs', () => {
    const result = parseCrossRef('\\x + \\xo 1:2 \\xt Acts 14:14.; Acts 17:24.; Psalm 32:6.\\x*');
    expect(result).toEqual({
      chapter: 1, verse: 2,
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
