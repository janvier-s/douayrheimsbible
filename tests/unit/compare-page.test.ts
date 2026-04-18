import { describe, it, expect } from 'vitest';
import { buildVerseMap } from '../../src/routes/compare/[book]/[chapter]/+page.js';

describe('buildVerseMap', () => {
	it('indexes verses by verse number', () => {
		const chapters = [
			{
				chapter: 1,
				verses: [
					{ verse: 1, text: 'In the beginning' },
					{ verse: 2, text: 'And the earth' }
				]
			}
		];
		const map = buildVerseMap(chapters, 1);
		expect(map.get(1)).toBe('In the beginning');
		expect(map.get(2)).toBe('And the earth');
	});

	it('returns empty map for missing chapter', () => {
		const map = buildVerseMap([], 1);
		expect(map.size).toBe(0);
	});
});
