import { describe, it, expect } from 'vitest';
import { parseResultId, buildTextResultGroups, type TextSearchResult } from '$lib/search/text-search';

describe('parseResultId', () => {
	it('parses a verse id', () => {
		expect(parseResultId('matthew:16:18')).toEqual({
			book: 'matthew',
			chapter: 16,
			verse: 18
		});
	});

	it('parses a note id', () => {
		expect(parseResultId('genesis:1:1:n0')).toEqual({
			book: 'genesis',
			chapter: 1,
			verse: 1
		});
	});

	it('parses an annotation id', () => {
		expect(parseResultId('matthew:22:2:a0')).toEqual({
			book: 'matthew',
			chapter: 22,
			verse: 2
		});
	});
});

describe('buildTextResultGroups', () => {
	it('groups results by chapter', () => {
		const results: TextSearchResult[] = [
			{ id: 'matthew:16:18', score: 5, book: 'matthew', chapter: 16, verse: 18 },
			{ id: 'matthew:16:19', score: 4, book: 'matthew', chapter: 16, verse: 19 }
		];

		const groups = buildTextResultGroups(results);
		expect(groups).toHaveLength(1);
		expect(groups[0].slug).toBe('matthew');
		expect(groups[0].chapter).toBe(16);
		expect(groups[0].verseNumbers).toEqual([18, 19]);
	});

	it('creates separate groups for different chapters', () => {
		const results: TextSearchResult[] = [
			{ id: 'matthew:16:18', score: 5, book: 'matthew', chapter: 16, verse: 18 },
			{ id: 'john:6:53', score: 3, book: 'john', chapter: 6, verse: 53 }
		];

		const groups = buildTextResultGroups(results);
		expect(groups).toHaveLength(2);
		expect(groups[0].slug).toBe('matthew');
		expect(groups[1].slug).toBe('john');
	});

	it('preserves relevance order (does not re-sort to canonical)', () => {
		const results: TextSearchResult[] = [
			{ id: 'john:6:53', score: 10, book: 'john', chapter: 6, verse: 53 },
			{ id: 'matthew:16:18', score: 5, book: 'matthew', chapter: 16, verse: 18 }
		];

		const groups = buildTextResultGroups(results);
		expect(groups[0].slug).toBe('john');
		expect(groups[1].slug).toBe('matthew');
	});
});
