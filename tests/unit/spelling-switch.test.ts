import { describe, it, expect } from 'vitest';
import { hasSpellingSwitch } from '../../src/lib/utils/spelling';

describe('spelling switch availability', () => {
	it('is offered for the ODR and the KJV, not elsewhere or in compare mode', () => {
		expect(hasSpellingSwitch('odr', false)).toBe(true);
		expect(hasSpellingSwitch('kjv', false)).toBe(true);
		expect(hasSpellingSwitch('drc', false)).toBe(false);
		expect(hasSpellingSwitch('kjv', true)).toBe(false);
	});
});
