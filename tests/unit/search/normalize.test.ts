import { describe, it, expect } from 'vitest';
import { tokenize, stripHtml } from '$lib/search/normalize';

describe('stripHtml', () => {
	it('removes all HTML tags, stripping cr/na content', () => {
		expect(stripHtml('<sc>The</sc> <cr>[1]</cr> book of <i>life</i>')).toBe('The  book of life');
	});

	it('removes <na> tags and their contents', () => {
		expect(stripHtml('word <na>[2]</na> more')).toBe('word  more');
	});

	it('removes <cr> tags and their contents', () => {
		expect(stripHtml('word <cr>[1]</cr> more')).toBe('word  more');
	});

	it('handles text with no tags', () => {
		expect(stripHtml('plain text')).toBe('plain text');
	});
});

describe('tokenize', () => {
	it('lowercases and splits on whitespace', () => {
		expect(tokenize('The Lord God')).toEqual(['the', 'lord', 'god']);
	});

	it('strips hyphens within words', () => {
		expect(tokenize('to-day for-ever')).toEqual(['today', 'forever']);
	});

	it('strips punctuation attached to words', () => {
		expect(tokenize('heaven. And, lo:')).toEqual(['heaven', 'and', 'lo']);
	});

	it('removes bracket markers like [1]', () => {
		expect(tokenize('[1] the beginning')).toEqual(['the', 'beginning']);
	});

	it('returns empty array for empty input', () => {
		expect(tokenize('')).toEqual([]);
	});

	it('handles semicolons and colons', () => {
		expect(tokenize('faith; hope: charity')).toEqual(['faith', 'hope', 'charity']);
	});
});
