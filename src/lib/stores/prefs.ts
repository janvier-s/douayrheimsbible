import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface ReadingPrefs {
	showVerseNumbers: boolean;
	paragraphView: boolean;
	infiniteScroll: boolean;
	fontSize: number;
	lineHeight: number;
	fontFamily: string;
	darkMode: boolean;
	bionicReading: boolean;
	dyslexiaFont: boolean;
}

const DEFAULTS: ReadingPrefs = {
	showVerseNumbers: true,
	paragraphView: false,
	infiniteScroll: true,
	fontSize: 16,
	lineHeight: 1.8,
	fontFamily: 'fs-brabo-pro',
	darkMode: false,
	bionicReading: false,
	dyslexiaFont: false
};

function loadPrefs(): ReadingPrefs {
	if (!browser) return DEFAULTS;
	try {
		const stored = localStorage.getItem('reading-prefs');
		return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
	} catch {
		return DEFAULTS;
	}
}

function createPrefs() {
	const { subscribe, set, update } = writable<ReadingPrefs>(loadPrefs());

	return {
		subscribe,
		set(p: ReadingPrefs) {
			if (browser) localStorage.setItem('reading-prefs', JSON.stringify(p));
			set(p);
		},
		update(fn: (p: ReadingPrefs) => ReadingPrefs) {
			update((p) => {
				const next = fn(p);
				if (browser) localStorage.setItem('reading-prefs', JSON.stringify(next));
				return next;
			});
		}
	};
}

export const prefs = createPrefs();
