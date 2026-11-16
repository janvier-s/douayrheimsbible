import { describe, it, expect } from 'vitest';
import { allcapsToSmallcaps } from '../../src/lib/utils/text';

// The original spelling prints a capital W as VV: both letters rise together.
describe('allcapsToSmallcaps with VV (capital W)', () => {
	it('keeps both Vs full-size on a content word, and treats VVAS as minor', () => {
		expect(allcapsToSmallcaps('<sc>AND THE VVORD VVAS MADE FLESH</sc>')).toBe(
			'<span class="sc">And the VVord vvas Made Flesh</span>'
		);
	});
	it('raises both Vs when VV opens the span', () => {
		expect(allcapsToSmallcaps('<sc>VVAS</sc> x')).toBe('<span class="sc">VVas</span> x');
	});
});
