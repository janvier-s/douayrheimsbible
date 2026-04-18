import { describe, it, expect, vi } from 'vitest';
import { loadTranslationBook } from '../../src/lib/data/loader.js';

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
