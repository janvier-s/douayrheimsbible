import { describe, it, expect } from 'vitest';
import { remapSlug, reverseRemapSlug, SLUG_REMAP_DRC_KNOX } from '../../scripts/prepare-data.js';

describe('remapSlug', () => {
	it('passes through ODR-compatible slugs unchanged', () => {
		expect(remapSlug('genesis', SLUG_REMAP_DRC_KNOX)).toBe('genesis');
		expect(remapSlug('mark', SLUG_REMAP_DRC_KNOX)).toBe('mark');
	});
	it('remaps josue to joshua', () => {
		expect(remapSlug('josue', SLUG_REMAP_DRC_KNOX)).toBe('joshua');
	});
	it('remaps 3-kings to 1-kings', () => {
		expect(remapSlug('3-kings', SLUG_REMAP_DRC_KNOX)).toBe('1-kings');
	});
	it('remaps apocalypse to revelation', () => {
		expect(remapSlug('apocalypse', SLUG_REMAP_DRC_KNOX)).toBe('revelation');
	});
});

describe('reverseRemapSlug', () => {
	it('maps modern slug back to ODR slug', () => {
		expect(reverseRemapSlug('joshua', SLUG_REMAP_DRC_KNOX)).toBe('josue');
		expect(reverseRemapSlug('revelation', SLUG_REMAP_DRC_KNOX)).toBe('apocalypse');
	});
	it('passes through slugs not in the map', () => {
		expect(reverseRemapSlug('genesis', SLUG_REMAP_DRC_KNOX)).toBe('genesis');
	});
	it('handles the Kings/Samuel collision correctly', () => {
		// DRC/Knox file "1-kings.json" = ODR "3-kings"
		expect(reverseRemapSlug('1-kings', SLUG_REMAP_DRC_KNOX)).toBe('3-kings');
	});
});
