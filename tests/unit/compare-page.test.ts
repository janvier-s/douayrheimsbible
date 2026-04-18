import { describe, it, expect } from 'vitest';
import { buildVerseMap } from '../../src/lib/utils/verse-map.js';

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
		expect(map[1]).toBe('In the beginning');
		expect(map[2]).toBe('And the earth');
	});

	it('returns empty object for missing chapter', () => {
		const map = buildVerseMap([], 1);
		expect(Object.keys(map).length).toBe(0);
	});
});
