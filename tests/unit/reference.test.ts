import { describe, it, expect } from 'vitest';
import { parseReference, parseAllReferences } from '$lib/search/reference';
import { resolveReference } from '$lib/search/resolve';

describe('parseReference', () => {
	it('parses standard reference', () => {
		const r = parseReference('Mark 3:5');
		expect(r).not.toBeNull();
	});

	it('parses abbreviated reference', () => {
		const r = parseReference('Mk 3:5');
		expect(r).not.toBeNull();
	});

	it('parses space-insensitive 1Cor', () => {
		const r = parseReference('1Cor 15:19');
		expect(r).not.toBeNull();
	});

	it('parses ODR name Josue', () => {
		const r = parseReference('Josue 1:1');
		expect(r).not.toBeNull();
	});

	it('parses Ecclesiasticus', () => {
		const r = parseReference('Ecclus 3:1');
		expect(r).not.toBeNull();
	});

	it('returns null for non-references', () => {
		expect(parseReference('baptism in the desert')).toBeNull();
		expect(parseReference('love your enemy')).toBeNull();
	});
});

describe('parseAllReferences', () => {
	it('parses a single verse reference', () => {
		const results = parseAllReferences('John 3:16');
		expect(results).toHaveLength(1);
		expect(results[0]).toEqual({
			osis: 'John.3.16',
			book: 'John',
			startChapter: 3,
			startVerse: 16,
			endChapter: 3,
			endVerse: 16
		});
	});

	it('parses a verse range', () => {
		const results = parseAllReferences('Matt 3:2-12');
		expect(results).toHaveLength(1);
		expect(results[0]).toEqual({
			osis: 'Matt.3.2-Matt.3.12',
			book: 'Matt',
			startChapter: 3,
			startVerse: 2,
			endChapter: 3,
			endVerse: 12
		});
	});

	it('parses multiple comma-separated references', () => {
		const results = parseAllReferences('Matt 3:2-12, John 5:1-6');
		expect(results).toHaveLength(2);
		expect(results[0].book).toBe('Matt');
		expect(results[1].book).toBe('John');
	});

	it('parses a whole chapter', () => {
		const results = parseAllReferences('Genesis 1');
		expect(results).toHaveLength(1);
		expect(results[0].book).toBe('Gen');
		expect(results[0].startChapter).toBe(1);
		expect(results[0].startVerse).toBeUndefined();
		expect(results[0].endVerse).toBeUndefined();
	});

	it('handles ODR book names via normalisation', () => {
		const results = parseAllReferences('Apocalypse 12:1');
		expect(results).toHaveLength(1);
		expect(results[0].book).toBe('Rev');
		expect(results[0].startChapter).toBe(12);
		expect(results[0].startVerse).toBe(1);
	});

	it('returns empty array for invalid input', () => {
		const results = parseAllReferences('hello world');
		expect(results).toEqual([]);
	});

	it('handles semicolons between references', () => {
		const results = parseAllReferences('Luke 1:28; Revelation 12:1');
		expect(results).toHaveLength(2);
		expect(results[0].book).toBe('Luke');
		expect(results[1].book).toBe('Rev');
	});
});

describe('resolveReference', () => {
	it('resolves to ODR slug and URL', () => {
		const r = parseReference('1 Samuel 1:1');
		expect(r).not.toBeNull();
		const resolved = resolveReference(r!);
		expect(resolved?.slug).toBe('1-kings');
		expect(resolved?.url).toBe('/odr/1-kings/1#v1');
	});

	it('book-only resolves to chapter 1', () => {
		const r = parseReference('Mark');
		expect(r).not.toBeNull();
		const resolved = resolveReference(r!);
		expect(resolved?.url).toBe('/odr/mark/1');
	});
});
