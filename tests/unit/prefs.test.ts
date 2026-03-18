import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { prefs } from '$lib/stores/prefs';

beforeEach(() => {
	localStorage.clear();
});

describe('prefs store', () => {
	it('returns defaults when localStorage is empty', () => {
		const p = get(prefs);
		expect(p.showVerseNumbers).toBe(true);
		expect(p.fontSize).toBe(16);
		expect(p.bionicReading).toBe(false);
	});

	it('enabling dyslexia font disables bionic reading', () => {
		prefs.update((p) => ({ ...p, bionicReading: true }));
		prefs.update((p) => ({ ...p, dyslexiaFont: true }));
		expect(get(prefs).bionicReading).toBe(false);
	});

	it('enabling bionic reading disables dyslexia font', () => {
		prefs.update((p) => ({ ...p, dyslexiaFont: true }));
		prefs.update((p) => ({ ...p, bionicReading: true }));
		expect(get(prefs).dyslexiaFont).toBe(false);
	});
});
