import { describe, it, expect } from 'vitest';
import {
	applyLongS,
	placeAbbreviations,
	normalizeWord,
	tokenize,
	alignVerses
} from '../../scripts/kjv1611/lib';

describe('applyLongS', () => {
	it('uses long s for non-final lowercase s', () => {
		expect(applyLongS('God said, Let', {})).toBe('God ſaid, Let');
		expect(applyLongS('goodnesse', {})).toBe('goodneſſe');
	});
	it('keeps final s round before punctuation, hyphen and tags', () => {
		expect(applyLongS('Moses: and', {})).toBe('Moſes: and');
		expect(applyLongS('<i>is</i> in it selfe-same', {})).toBe('<i>is</i> in it ſelfe-ſame');
		expect(applyLongS('is, as', {})).toBe('is, as');
		expect(applyLongS('this-man', {})).toBe('this-man');
	});
	it('leaves capitals alone', () => {
		expect(applyLongS('Sonne', {})).toBe('Sonne');
	});
	it('decides s+f/h/k/b by policy; undecided stays round', () => {
		expect(applyLongS('fish', { h: 'round' })).toBe('fish');
		expect(applyLongS('fish', { h: 'long' })).toBe('fiſh');
		expect(applyLongS('fish', {})).toBe('fish');
		expect(applyLongS('selfe', {})).toBe('ſelfe');
	});
	it('applies per-offset overrides', () => {
		expect(applyLongS('said', {}, new Map([[0, 'round']]))).toBe('said');
		expect(applyLongS('fish', {}, new Map([[2, 'long']]))).toBe('fiſh');
	});
});

describe('placeAbbreviations', () => {
	it('only the word aligned to &thorn; becomes the abbreviation', () => {
		const r = placeAbbreviations('so loued ye world, ye shall', 'so loued &thorn; world, ye shall');
		expect(r.text).toBe('so loued yͤ world, ye shall');
		expect(r).toMatchObject({ placed: 1, unplaced: 0 });
	});
	it('maps yt to the superscript t form', () => {
		expect(placeAbbreviations('and yt is', 'and yt is').text).toBe('and yͭ is');
	});
	it('reports unplaced', () => {
		const r = placeAbbreviations('hello world', 'hello &thorn; world');
		expect(r.unplaced).toBe(1);
		expect(r.text).toBe('hello world');
	});
});

describe('normalizeWord / tokenize', () => {
	it('folds letters only', () => {
		expect(normalizeWord('Vpon,')).toBe('upon');
		expect(normalizeWord('ſaid')).toBe('said');
		expect(normalizeWord('<i>Iesus</i>')).toBe('iesus');
		expect(normalizeWord('yͤ')).toBe('y');
	});
	it('tokenizes with offsets, excluding tags', () => {
		const t = tokenize('<i>is</i> in it');
		expect(t.map((x) => x.raw)).toEqual(['is', 'in', 'it']);
		expect('<i>is</i> in it'.slice(t[1].start, t[1].end)).toBe('in');
		expect(t[0].start).toBe(3);
	});
});

describe('alignVerses', () => {
	it('maps target verses to src verses past an inserted src verse', () => {
		const src = [
			{ verse: 1, text: 'the quick brown fox jumps over' },
			{ verse: 2, text: 'completely unrelated inserted verse here' },
			{ verse: 3, text: 'a lazy dog sleeps under the tree' },
			{ verse: 4, text: 'and the end came to pass' }
		];
		const target = [
			{ verse: 1, text: 'the quick brown fox jumps over' },
			{ verse: 2, text: 'a lazy dog sleeps under the tree' },
			{ verse: 3, text: 'and the end came to pass' }
		];
		const m = alignVerses(src, target);
		expect([...m.entries()]).toEqual([
			[1, 1],
			[2, 3],
			[3, 4]
		]);
	});
});
