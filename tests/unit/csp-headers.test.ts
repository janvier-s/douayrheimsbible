import { describe, expect, it } from 'vitest';
import { FACSIMILE_BASE } from '$lib/data/facsimile';
import headers from '../../_headers?raw';

function cspDirective(name: string): string[] {
	const csp = headers.match(/Content-Security-Policy:\s*(.+)/)?.[1] ?? '';
	const directive = csp
		.split(';')
		.map((d: string) => d.trim().split(/\s+/))
		.find((parts: string[]) => parts[0] === name);
	return directive?.slice(1) ?? [];
}

describe('Content-Security-Policy', () => {
	// The scans live on their own subdomain; without it in img-src the browser
	// blocks every page and the Facsimile tab shows only its caption.
	it('lets the facsimile scans load as images', () => {
		expect(cspDirective('img-src')).toContain(new URL(FACSIMILE_BASE).origin);
	});
});
