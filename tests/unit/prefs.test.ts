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

	it('bionic reading and dyslexia font can both be enabled simultaneously', () => {
		prefs.update((p) => ({ ...p, bionicReading: true }));
		prefs.update((p) => ({ ...p, dyslexiaFont: true }));
		expect(get(prefs).bionicReading).toBe(true);
		expect(get(prefs).dyslexiaFont).toBe(true);
	});

	it('enabling bionic reading does not disable dyslexia font', () => {
		prefs.update((p) => ({ ...p, dyslexiaFont: true }));
		prefs.update((p) => ({ ...p, bionicReading: true }));
		expect(get(prefs).dyslexiaFont).toBe(true);
	});
});
