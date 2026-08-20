import { describe, it, expect } from 'vitest';
import {
	getBookBySlug,
	getBookByOdrName,
	getBookByModernName,
	drFromHebPsalmNum,
	ALL_BOOKS
} from '$lib/data/books';
import { kjvPsalmsForDr, precedingSplitSibling } from '$lib/data/psalm-mapping';

describe('ALL_BOOKS', () => {
	it('contains 76 books', () => {
		expect(ALL_BOOKS.length).toBe(76);
	});

	it('has no duplicate slugs', () => {
		const slugs = ALL_BOOKS.map((b) => b.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it('marks NT books as having Confraternity', () => {
		const mark = ALL_BOOKS.find((b) => b.slug === 'mark')!;
		expect(mark.hasConfraternity).toBe(true);
	});

	it('marks OT books as not having Confraternity', () => {
		const genesis = ALL_BOOKS.find((b) => b.slug === 'genesis')!;
		expect(genesis.hasConfraternity).toBe(false);
	});
});

describe('getBookBySlug', () => {
	it('returns book for valid slug', () => {
		expect(getBookBySlug('mark')?.odrName).toBe('Mark');
	});

	it('returns undefined for invalid slug', () => {
		expect(getBookBySlug('notabook')).toBeUndefined();
	});
});

describe('getBookByOdrName', () => {
	it('resolves ODR name with Kings offset', () => {
		expect(getBookByOdrName('3 Kings')?.slug).toBe('3-kings');
	});

	it('resolves Josue', () => {
		expect(getBookByOdrName('Josue')?.slug).toBe('josue');
	});

	it('resolves Machabees', () => {
		expect(getBookByOdrName('1 Machabees')?.slug).toBe('1-machabees');
	});
});

describe('getBookByModernName', () => {
	it('resolves modern name to ODR slug', () => {
		expect(getBookByModernName('1 Samuel')?.slug).toBe('1-kings');
	});

	it('resolves Song of Solomon', () => {
		expect(getBookByModernName('Song of Solomon')?.slug).toBe('canticle-of-canticles');
	});

	it('resolves Revelation', () => {
		expect(getBookByModernName('Revelation')?.slug).toBe('apocalypse');
	});
});

describe('drFromHebPsalmNum', () => {
	it('round-trips the simple offsets', () => {
		expect(drFromHebPsalmNum(23)).toBe(22);
		expect(drFromHebPsalmNum(1)).toBe(1);
		expect(drFromHebPsalmNum(150)).toBe(150);
	});

	it('collapses the merged psalms back onto one DR number', () => {
		expect(drFromHebPsalmNum(9)).toBe(9);
		expect(drFromHebPsalmNum(10)).toBe(9);
		expect(drFromHebPsalmNum(114)).toBe(113);
		expect(drFromHebPsalmNum(115)).toBe(113);
	});

	// This is the reverse of kjvPsalmsForDr in psalm-mapping.ts, so the two hold
	// the same table of divergences from opposite ends. Walking all 150 psalms
	// catches an edit to one that was not made to the other.
	it('inverts kjvPsalmsForDr across the whole psalter', () => {
		for (let dr = 1; dr <= 150; dr++) {
			const firstKjv = kjvPsalmsForDr(dr)[0];
			// Both halves of a psalm the Vulgate split land on the earlier half.
			const expected = precedingSplitSibling(dr) ?? dr;
			expect(drFromHebPsalmNum(firstKjv), `DR ${dr} -> KJV ${firstKjv}`).toBe(expected);
		}
	});
});
