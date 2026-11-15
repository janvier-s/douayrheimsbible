import { describe, it, expect, vi } from 'vitest';
import { loadBook, getCachedBook, loadTranslationBook } from '../../src/lib/data/loader';

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

describe('loadTranslationBook spelling', () => {
	const mk = (missing: string[] = []) => {
		const urls: string[] = [];
		const fetch = vi.fn(async (url: string) => {
			urls.push(url);
			return missing.some((m) => url.includes(m))
				? { ok: false, json: async () => ({}) }
				: { ok: true, json: async () => ({ book: 'x', chapters: [], from: url }) };
		}) as unknown as typeof globalThis.fetch;
		return { fetch, urls };
	};

	it('reads kjv-1611 for the KJV in original spelling', async () => {
		const { fetch, urls } = mk();
		const b = await loadTranslationBook('kjv', 'genesis', fetch, 'original');
		expect(urls).toEqual(['/data/kjv-1611/genesis.json']);
		expect((b as any).from).toBe('/data/kjv-1611/genesis.json');
	});

	it('falls back to modern KJV when the 1611 book is missing', async () => {
		const { fetch } = mk(['kjv-1611']);
		const b = await loadTranslationBook('kjv', 'fallback-book', fetch, 'original');
		expect((b as any).from).toBe('/data/kjv/fallback-book.json');
	});

	it('never touches kjv-1611 for modern spelling, and caches the two apart', async () => {
		const { fetch, urls } = mk();
		const m = await loadTranslationBook('kjv', 'exodus', fetch);
		const o = await loadTranslationBook('kjv', 'exodus', fetch, 'original');
		expect(urls).toEqual(['/data/kjv/exodus.json', '/data/kjv-1611/exodus.json']);
		expect(m).not.toBe(o);
	});

	it('ignores spelling for translations with no original-spelling dataset', async () => {
		const { fetch, urls } = mk();
		await loadTranslationBook('knox', 'genesis', fetch, 'original');
		expect(urls).toEqual(['/data/knox/genesis.json']);
	});
});
