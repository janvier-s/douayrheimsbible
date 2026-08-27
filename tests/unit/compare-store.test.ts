import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// The store only touches localStorage in the browser, and vitest runs as the
// server would. Without this the tests below pass vacuously.
vi.mock('$app/environment', () => ({ browser: true }));

const SAVED = {
	order: ['vul', 'odr', 'kjv', 'drc', 'haydock', 'conf', 'knox', 'cpdv', 'rsv'],
	visible: ['odr', 'kjv', 'drc']
};

async function freshStore() {
	vi.resetModules();
	const mod = await import('$lib/stores/compare');
	return mod.compareStore;
}

beforeEach(() => {
	localStorage.clear();
});

describe('compareStore hydration', () => {
	it('reads the storage key the app writes', async () => {
		// Guards the tests below: a renamed key would make them pass vacuously.
		localStorage.setItem('compareStore_v5', JSON.stringify(SAVED));
		const store = await freshStore();
		store.hydrate();
		expect(get(store).order).toEqual(SAVED.order);
	});

	it('starts from the defaults the server renders, even with saved columns', async () => {
		// The server has no localStorage, so it renders ODR + Challoner. Reading
		// storage before hydration makes the client's first render disagree with
		// that markup, and hydration then pairs each column with the wrong text.
		localStorage.setItem('compareStore_v5', JSON.stringify(SAVED));
		const store = await freshStore();
		expect([...get(store).visible]).toEqual(['odr', 'drc']);
	});

	it('applies the saved columns once hydrate() is called', async () => {
		localStorage.setItem('compareStore_v5', JSON.stringify(SAVED));
		const store = await freshStore();
		store.hydrate();
		expect([...get(store).visible].sort()).toEqual(['drc', 'kjv', 'odr']);
		expect(get(store).order).toEqual(SAVED.order);
	});

	it('keeps the defaults when nothing is saved', async () => {
		const store = await freshStore();
		store.hydrate();
		expect([...get(store).visible]).toEqual(['odr', 'drc']);
	});

	it('keeps the defaults when the saved payload is malformed', async () => {
		localStorage.setItem('compareStore_v5', '{not json');
		const store = await freshStore();
		store.hydrate();
		expect([...get(store).visible]).toEqual(['odr', 'drc']);
	});

	it('does not clobber a toggle made before a later hydrate() call', async () => {
		localStorage.setItem('compareStore_v5', JSON.stringify(SAVED));
		const store = await freshStore();
		store.hydrate();
		store.toggle('knox', false);
		store.hydrate(); // a second mount must not rewind the user's choice
		expect([...get(store).visible]).toContain('knox');
	});
});

describe('translationCoversBook', () => {
	it('keeps the OT away from NT-only translations', async () => {
		const { translationCoversBook } = await import('$lib/stores/compare');
		// The bug this exists for: canonical order puts Malachie before Matthew,
		// so a naive prev-book link on Conf Matthew 1 offered an OT book.
		expect(translationCoversBook('conf', 'OT')).toBe(false);
		expect(translationCoversBook('conf', 'NT')).toBe(true);
	});

	it('lets full-Bible translations through either way', async () => {
		const { translationCoversBook } = await import('$lib/stores/compare');
		for (const tid of ['odr', 'drc', 'haydock', 'vul', 'knox']) {
			expect(translationCoversBook(tid, 'OT')).toBe(true);
			expect(translationCoversBook(tid, 'NT')).toBe(true);
		}
	});

	it('does not block an unknown translation id', async () => {
		const { translationCoversBook } = await import('$lib/stores/compare');
		expect(translationCoversBook('nope', 'OT')).toBe(true);
	});
});
