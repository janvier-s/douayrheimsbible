import { describe, it, expect } from 'vitest';
import { expandTokens, isAllStopWords } from '$lib/search/expand-query';

describe('expandTokens', () => {
	it('expands a modern word to its ODR equivalent', () => {
		expect(expandTokens(['baptize'])).toEqual(['baptize', 'baptise']);
	});

	it('does not duplicate words already present', () => {
		expect(expandTokens(['honour'])).toEqual(['honour']);
	});

	it('expands multiple tokens', () => {
		const result = expandTokens(['honor', 'god']);
		expect(result).toContain('honor');
		expect(result).toContain('honour');
		expect(result).toContain('god');
	});

	it('returns tokens unchanged when no expansions match', () => {
		expect(expandTokens(['grace', 'faith'])).toEqual(['grace', 'faith']);
	});

	it('handles empty array', () => {
		expect(expandTokens([])).toEqual([]);
	});
});

describe('isAllStopWords', () => {
	it('returns true for common stop words', () => {
		expect(isAllStopWords(['the', 'and', 'of'])).toBe(true);
	});

	it('returns false when at least one non-stop word', () => {
		expect(isAllStopWords(['the', 'lord'])).toBe(false);
	});

	it('returns true for empty array', () => {
		expect(isAllStopWords([])).toBe(true);
	});

	it('returns true for single stop word', () => {
		expect(isAllStopWords(['the'])).toBe(true);
	});

	it('returns false for single non-stop word', () => {
		expect(isAllStopWords(['peter'])).toBe(false);
	});
});
