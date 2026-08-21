import { describe, it, expect, vi } from 'vitest';
import { loadTranslationBook, loadGlossa } from '../../src/lib/data/loader.js';

describe('loadTranslationBook', () => {
	it('fetches from the correct URL', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ book: 'Genesis', chapters: [] })
		});
		await loadTranslationBook('drc', 'genesis', mockFetch as unknown as typeof fetch);
		expect(mockFetch).toHaveBeenCalledWith('/data/drc/genesis.json');
	});

	it('throws on non-ok response', async () => {
		const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
		await expect(
			loadTranslationBook('kjv', 'not-a-book', mockFetch as unknown as typeof fetch)
		).rejects.toThrow('Book not found');
	});
});

describe('loadGlossa', () => {
	it('fetches from the correct URL for a chapter that has glosses', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [{ verse: 1, text: 'Non dicit: In principio dicit Deus.' }]
		});
		const result = await loadGlossa('genesis', 1, mockFetch as unknown as typeof fetch);
		expect(mockFetch).toHaveBeenCalledWith('/data/glossa/genesis/1.json');
		expect(result).toEqual([{ verse: 1, text: 'Non dicit: In principio dicit Deus.' }]);
	});

	it('resolves null without fetching when the manifest has no entry', async () => {
		const mockFetch = vi.fn();
		const result = await loadGlossa('ezechiel', 1, mockFetch as unknown as typeof fetch);
		expect(result).toBeNull();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('caches by slug and chapter', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [{ verse: 1, text: 'Prima glossa.' }]
		});
		await loadGlossa('john', 1, mockFetch as unknown as typeof fetch);
		await loadGlossa('john', 1, mockFetch as unknown as typeof fetch);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});
});
