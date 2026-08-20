import { describe, it, expect } from 'vitest';
import { chapterRefBookName } from '$lib/data/books';

describe('chapterRefBookName', () => {
	it('makes Psalms singular before a chapter number', () => {
		expect(chapterRefBookName('psalms', 'Psalms')).toBe('Psalm');
	});

	it('leaves every other book untouched', () => {
		expect(chapterRefBookName('john', 'John')).toBe('John');
		expect(chapterRefBookName('genesis', 'Genesis')).toBe('Genesis');
		expect(chapterRefBookName('proverbs', 'Proverbs')).toBe('Proverbs');
	});

	it('does not confuse other books whose names contain "psalm"', () => {
		// The 151st psalm ships as its own book in some editions.
		expect(chapterRefBookName('psalm-151', 'Psalm 151')).toBe('Psalm 151');
	});
});
