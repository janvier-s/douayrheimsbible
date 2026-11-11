import { describe, it, expect } from 'vitest';
import { osisId } from './odr-books-osis';
import { BOOK_CODES } from './export-lib';

describe('osisId', () => {
	it('maps known books', () => {
		expect(osisId('genesis')).toBe('Gen');
		expect(osisId('1-kings')).toBe('1Sam');
		expect(osisId('apocalypse')).toBe('Rev');
		expect(osisId('psalms')).toBe('Ps');
	});
	it('covers every book with a unique id', () => {
		const ids = Object.keys(BOOK_CODES).map(osisId);
		expect(ids.length).toBe(76);
		expect(new Set(ids).size).toBe(76);
	});
});
