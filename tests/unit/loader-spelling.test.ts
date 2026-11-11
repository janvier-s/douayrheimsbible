import { describe, it, expect, vi } from 'vitest';
import { loadBook, getCachedBook } from '../../src/lib/data/loader';

const book = (spelling: string) => ({ book: 'x', chapters: [], spelling });

describe('loadBook spelling', () => {
	it('reads odr-original for original spelling and caches it apart from modern', async () => {
		const fetch = vi.fn(async (url: string) => ({
			ok: true,
			json: async () => book(url.includes('odr-original') ? 'original' : 'modern')
		})) as unknown as typeof globalThis.fetch;
		const o = await loadBook('spell-a', fetch, 'original');
		const m = await loadBook('spell-a', fetch, 'modern');
		expect((o as any).spelling).toBe('original');
		expect((m as any).spelling).toBe('modern');
		expect(getCachedBook('spell-a', 'original')).toBe(o);
	});

	it('falls back to modern when the original book is missing', async () => {
		const fetch = vi.fn(async (url: string) =>
			url.includes('odr-original')
				? { ok: false, json: async () => ({}) }
				: { ok: true, json: async () => book('modern') }
		) as unknown as typeof globalThis.fetch;
		const b = await loadBook('spell-b', fetch, 'original');
		expect((b as any).spelling).toBe('modern');
	});
});
