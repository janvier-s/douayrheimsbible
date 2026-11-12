import { describe, it, expect } from 'vitest';
import { groupVerses, makeBreaker, uncoveredChapters } from './layout-lib';

const vs = [1, 2, 3, 4, 5].map((verse) => ({ verse }));
const starts = { b: { 1: [1, 4] } };

describe('groupVerses', () => {
	it('flowing: one block', () => {
		expect(groupVerses('b', 1, vs, 'flowing', starts)).toHaveLength(1);
	});
	it('verse: one block per verse', () => {
		expect(groupVerses('b', 1, vs, 'verse', starts)).toHaveLength(5);
	});
	it('paragraph: breaks before the listed verses, as the site does', () => {
		expect(groupVerses('b', 1, vs, 'paragraph', starts).map((g) => g.map((v) => v.verse))).toEqual([
			[1, 2, 3],
			[4, 5]
		]);
	});
	it('paragraph: a chapter with no data is one block', () => {
		expect(groupVerses('b', 2, vs, 'paragraph', starts)).toHaveLength(1);
		expect(groupVerses('zzz', 1, vs, 'paragraph', starts)).toHaveLength(1);
	});
	it('keeps a repeated verse number with its first part', () => {
		const dup = [{ verse: 1 }, { verse: 2 }, { verse: 2 }, { verse: 3 }];
		expect(groupVerses('b', 1, dup, 'verse', starts).map((g) => g.length)).toEqual([1, 2, 1]);
	});
	it('handles an empty chapter', () => {
		expect(groupVerses('b', 1, [], 'verse', starts)).toEqual([]);
	});
	it('makeBreaker never breaks in flowing', () => {
		expect(makeBreaker('b', 1, 'flowing', starts)(4)).toBe(false);
	});
	it('reports uncovered chapters', () => {
		expect(uncoveredChapters('b', [1, 2], starts)).toEqual([2]);
	});
});
