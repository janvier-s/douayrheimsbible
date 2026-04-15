// tests/unit/crossRefParser.test.ts
import { describe, it, expect } from 'vitest';
import { tokenizeCrossRef, parseItalicRef, linkifyItalicRefs } from '$lib/search/crossRefParser';

describe('tokenizeCrossRef', () => {
	it('parses a single verse reference', () => {
		const tokens = tokenizeCrossRef('Luc. 10, 16.');
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: 'ref', osis: 'Luke.10.16', isVerse: true });
	});

	it('parses a chapter-only reference', () => {
		const tokens = tokenizeCrossRef('2. Thess. 2.');
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: 'ref', osis: '2Thess.2', isVerse: false });
	});

	it('parses multiple refs in one string', () => {
		const tokens = tokenizeCrossRef('Luc. 10, 16. Act. 15, 28.');
		const refs = tokens.filter((t) => t.type === 'ref');
		expect(refs).toHaveLength(2);
		expect(refs[0]).toMatchObject({ osis: 'Luke.10.16' });
		expect(refs[1]).toMatchObject({ osis: 'Acts.15.28' });
	});

	it('leaves patristic citations as text tokens', () => {
		const tokens = tokenizeCrossRef('S. Aug. l. 11. de Gen. ad lit c. 4.');
		expect(tokens.every((t) => t.type === 'text')).toBe(true);
	});

	it('does not false-positive on Gen in patristic citation', () => {
		const tokens = tokenizeCrossRef('Ori. super. Gen. c. 1.');
		expect(tokens.filter((t) => t.type === 'ref')).toHaveLength(0);
	});

	it('handles mixed Bible refs and patristic text', () => {
		const tokens = tokenizeCrossRef('Gen. 1. v. 3. S. Aug. de Gen. cont. Manich.');
		const refs = tokens.filter((t) => t.type === 'ref');
		expect(refs).toHaveLength(1);
		expect(refs[0]).toMatchObject({ osis: 'Gen.1.3' });
	});

	it('parses period-separated chapter:verse (Gen. 1. v. 3.)', () => {
		const tokens = tokenizeCrossRef('Gen. 1. v. 3.');
		expect(tokens.filter((t) => t.type === 'ref')).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ osis: 'Gen.1.3', isVerse: true });
	});

	it('parses numbered book with digit prefix (1. Cor. 15, 28.)', () => {
		const tokens = tokenizeCrossRef('1. Cor. 15, 28.');
		expect(tokens[0]).toMatchObject({ osis: '1Cor.15.28', isVerse: true });
	});

	it('parses Joan. as John', () => {
		const tokens = tokenizeCrossRef('Joan. 8, 25.');
		expect(tokens[0]).toMatchObject({ osis: 'John.8.25' });
	});

	it('returns a single text token for purely patristic strings', () => {
		const tokens = tokenizeCrossRef('Hier. Epist. 83. ad Ocea. Tert. de Baptis.');
		expect(tokens.every((t) => t.type === 'text')).toBe(true);
	});
});

describe('parseItalicRef', () => {
	it('parses a simple italic ref', () => {
		const result = parseItalicRef('Act. 13, 14.');
		expect(result).not.toBeNull();
		expect(result![0]).toMatchObject({ book: 'Acts', startChapter: 13, startVerse: 14 });
	});

	it('parses multiple refs in one italic span', () => {
		const result = parseItalicRef('Act. 13, 14. Levit. 23.');
		expect(result).not.toBeNull();
		expect(result!.length).toBeGreaterThanOrEqual(1);
	});

	it('returns null for non-reference italic text', () => {
		const result = parseItalicRef('rested the seventh day');
		expect(result).toBeNull();
	});

	it('returns null for patristic citation', () => {
		const result = parseItalicRef('Homi. in 40 Martyres.');
		expect(result).toBeNull();
	});
});

describe('linkifyItalicRefs', () => {
	it('wraps a parseable italic span in a verse-ref link', () => {
		const result = linkifyItalicRefs('<i>Act. 13, 14.</i>');
		expect(result).toContain('class="verse-ref"');
		expect(result).toContain('data-osis=');
		expect(result).toContain('<i>Act. 13, 14.</i>');
	});

	it('leaves non-ref italic spans untouched', () => {
		const input = '<i>rested the seventh day</i>';
		expect(linkifyItalicRefs(input)).toBe(input);
	});

	it('leaves patristic citation italic spans untouched', () => {
		const input = '<i>Homi. in 40 Martyres.</i>';
		expect(linkifyItalicRefs(input)).toBe(input);
	});

	it('encodes multiple OSIS refs into data-osis for grouped refs', () => {
		const result = linkifyItalicRefs('<i>Act. 13, 14. Levit. 23.</i>');
		expect(result).toContain('class="verse-ref"');
	});
});
