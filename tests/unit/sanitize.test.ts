import { describe, it, expect } from 'vitest';
import DOMPurify from 'isomorphic-dompurify';

const VERSE_CONFIG = { ALLOWED_TAGS: ['span', 'b'], ALLOWED_ATTR: ['class'] };
const SUMMARY_CONFIG = { ALLOWED_TAGS: ['a'], ALLOWED_ATTR: ['href', 'data-verse', 'class'] };

describe('verse sanitization', () => {
	it('allows span.sc for small-caps', () => {
		const input = '<span class="sc">Jesus</span> Christ';
		expect(DOMPurify.sanitize(input, VERSE_CONFIG)).toBe(input);
	});

	it('strips script tags', () => {
		const input = '<script>alert(1)</script>text';
		expect(DOMPurify.sanitize(input, VERSE_CONFIG)).toBe('text');
	});

	it('strips disallowed attributes', () => {
		const input = '<span onclick="alert(1)" class="sc">Lord</span>';
		expect(DOMPurify.sanitize(input, VERSE_CONFIG)).toBe('<span class="sc">Lord</span>');
	});
});

describe('summary sanitization', () => {
	it('allows verse reference links', () => {
		const input = '<a href="#v1" data-verse="1" class="summary-verse-ref">℣.1</a>';
		expect(DOMPurify.sanitize(input, SUMMARY_CONFIG)).toBe(input);
	});

	it('strips script tags', () => {
		const input = '<script>alert(1)</script>summary text';
		expect(DOMPurify.sanitize(input, SUMMARY_CONFIG)).toBe('summary text');
	});

	it('strips disallowed href protocols', () => {
		const input = '<a href="javascript:alert(1)" class="summary-verse-ref">click</a>';
		const out = DOMPurify.sanitize(input, SUMMARY_CONFIG);
		expect(out).not.toContain('javascript:');
	});
});
