import { describe, it, expect } from 'vitest';
import { buildResultGroups, type SearchResultGroup } from '$lib/search/verses';
import type { OsisRange } from '$lib/search/reference';

// Mock fetch that returns known data
const mockBookData = {
	book: 'Matthew',
	chapters: [
		{
			chapter: 16,
			verses: [
				{ verse: 17, text: 'And Jesus answering...' },
				{ verse: 18, text: 'And I say to thee...' },
				{ verse: 19, text: 'And I will give to thee...' }
			]
		}
	]
};

const mockFetch = (() => {
	return Promise.resolve({
		ok: true,
		json: () => Promise.resolve(mockBookData)
	});
}) as unknown as typeof globalThis.fetch;

describe('buildResultGroups', () => {
	it('fetches verses for a single reference', async () => {
		const ranges: OsisRange[] = [
			{
				osis: 'Matt.16.18',
				book: 'Matt',
				startChapter: 16,
				startVerse: 18,
				endChapter: 16,
				endVerse: 18
			}
		];
		const groups = await buildResultGroups(ranges, mockFetch);
		expect(groups).toHaveLength(1);
		expect(groups[0].slug).toBe('matthew');
		expect(groups[0].chapter).toBe(16);
		expect(groups[0].verses).toHaveLength(1);
		expect(groups[0].verses[0].verse).toBe(18);
	});

	it('returns empty group for unknown OSIS book', async () => {
		const ranges: OsisRange[] = [
			{ osis: 'Fake.1.1', book: 'Fake', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 1 }
		];
		const groups = await buildResultGroups(ranges, mockFetch);
		expect(groups).toHaveLength(0);
	});

	it('formats heading correctly for single verse', async () => {
		const ranges: OsisRange[] = [
			{
				osis: 'Matt.16.18',
				book: 'Matt',
				startChapter: 16,
				startVerse: 18,
				endChapter: 16,
				endVerse: 18
			}
		];
		const groups = await buildResultGroups(ranges, mockFetch);
		expect(groups[0].heading).toBe('Matthew 16:18');
	});

	it('formats heading for verse range', async () => {
		const ranges: OsisRange[] = [
			{
				osis: 'Matt.16.17-Matt.16.19',
				book: 'Matt',
				startChapter: 16,
				startVerse: 17,
				endChapter: 16,
				endVerse: 19
			}
		];
		const groups = await buildResultGroups(ranges, mockFetch);
		expect(groups[0].heading).toBe('Matthew 16:17\u201319');
		expect(groups[0].verses).toHaveLength(3);
	});
});
