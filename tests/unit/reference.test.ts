import { describe, it, expect } from 'vitest';
import { parseReference } from '$lib/search/reference';
import { resolveReference } from '$lib/search/resolve';

describe('parseReference', () => {
	it('parses standard reference', () => {
		const r = parseReference('Mark 3:5');
		expect(r).not.toBeNull();
	});

	it('parses abbreviated reference', () => {
		const r = parseReference('Mk 3:5');
		expect(r).not.toBeNull();
	});

	it('parses space-insensitive 1Cor', () => {
		const r = parseReference('1Cor 15:19');
		expect(r).not.toBeNull();
	});

	it('parses ODR name Josue', () => {
		const r = parseReference('Josue 1:1');
		expect(r).not.toBeNull();
	});

	it('parses Ecclesiasticus', () => {
		const r = parseReference('Ecclus 3:1');
		expect(r).not.toBeNull();
	});

	it('returns null for non-references', () => {
		expect(parseReference('baptism in the desert')).toBeNull();
		expect(parseReference('love your enemy')).toBeNull();
	});
});

describe('resolveReference', () => {
	it('resolves to ODR slug and URL', () => {
		const r = parseReference('1 Samuel 1:1');
		expect(r).not.toBeNull();
		const resolved = resolveReference(r!);
		expect(resolved?.slug).toBe('1-kings');
		expect(resolved?.url).toBe('/odr/1-kings/1/1');
	});

	it('book-only resolves to chapter 1', () => {
		const r = parseReference('Mark');
		expect(r).not.toBeNull();
		const resolved = resolveReference(r!);
		expect(resolved?.url).toBe('/odr/mark/1');
	});
});
