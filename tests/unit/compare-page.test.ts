import { describe, it, expect } from 'vitest';
import { buildVerseMap } from '../../src/lib/utils/verse-map.js';

describe('buildVerseMap', () => {
	it('indexes verses by verse number', () => {
		const chapters = [
			{
				chapter: 1,
				verses: [
					{ verse: 1, text: 'In the beginning' },
					{ verse: 2, text: 'And the earth' }
				]
			}
		];
		const map = buildVerseMap(chapters, 1);
		expect(map[1]).toBe('In the beginning');
		expect(map[2]).toBe('And the earth');
	});

	it('returns empty object for missing chapter', () => {
		const map = buildVerseMap([], 1);
		expect(Object.keys(map).length).toBe(0);
	});
});

describe('compare page load: KJV 1611 spelling column', () => {
	// Serves the real static/ files, so the Psalm remap runs on real data.
	const files = import.meta.glob(
		[
			'/static/data/odr/{psalms,genesis,versification}.json',
			'/static/data/odr-original/{psalms,genesis}.json',
			'/static/data/kjv/{psalms,genesis}.json',
			'/static/data/kjv-1611/{psalms,genesis}.json'
		],
		{ query: '?raw', import: 'default', eager: true }
	) as Record<string, string>;
	const staticFetch = (async (url: string) => {
		const raw = files[`/static${url}`];
		return raw
			? { ok: true, json: async () => JSON.parse(raw) }
			: { ok: false, json: async () => ({}) };
	}) as unknown as typeof globalThis.fetch;

	it('remaps kjv-orig psalms onto the DR rows exactly as kjv does', async () => {
		const mod = await import('../../src/routes/compare/[book]/[chapter]/+page');
		const data: any = await (mod.load as any)({
			params: { book: 'psalms', chapter: '9' },
			fetch: staticFetch
		});
		const kjv = data.verseMaps['kjv'];
		const orig = data.verseMaps['kjv-orig'];
		expect(Object.keys(orig).sort()).toEqual(Object.keys(kjv).sort());
		// DR Ps 9 pulls KJV Ps 9 and 10. The 1611 text has no superscription, so a row the KJV
		// fills with a title is empty in kjv-orig; every other row is the same verse in 1611 spelling.
		const rows = Object.keys(kjv).filter((k) => kjv[k]);
		const blanks = rows.filter((k) => !orig[k]);
		expect(blanks.length).toBeLessThanOrEqual(1);
		const both = rows.filter((k) => orig[k]);
		expect(both.length).toBeGreaterThan(10);
		for (const k of both.slice(0, 5)) {
			expect(orig[k]).toMatch(/\u017f/);
			expect(kjv[k]).not.toMatch(/\u017f/);
		}
	});

	it('loads kjv-orig for a plain chapter', async () => {
		const mod = await import('../../src/routes/compare/[book]/[chapter]/+page');
		const data: any = await (mod.load as any)({
			params: { book: 'genesis', chapter: '1' },
			fetch: staticFetch
		});
		expect(data.verseMaps['kjv-orig'][3]).toMatch(/God ſaid/);
	});
});
