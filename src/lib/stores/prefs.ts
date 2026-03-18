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
	fontFamily: 'libre-baskerville',
	darkMode: false,
	bionicReading: false,
	dyslexiaFont: false
};

const PREFS_VERSION = 2;

function loadPrefs(): ReadingPrefs {
	if (!browser) return DEFAULTS;
	try {
		const stored = localStorage.getItem('reading-prefs');
		if (!stored) return DEFAULTS;
		const parsed = JSON.parse(stored) as ReadingPrefs & { _v?: number };
		// v2 migration: fs-brabo-pro was the old default; upgrade to libre-baskerville
		if ((!parsed._v || parsed._v < PREFS_VERSION) && parsed.fontFamily === 'fs-brabo-pro') {
			parsed.fontFamily = 'libre-baskerville';
		}
		parsed._v = PREFS_VERSION;
		localStorage.setItem('reading-prefs', JSON.stringify(parsed));
		return { ...DEFAULTS, ...parsed };
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
				let next = fn(p);
				// Mutual exclusion: bionic and dyslexia font can't both be on
				if (next.dyslexiaFont && !p.dyslexiaFont) next = { ...next, bionicReading: false };
				if (next.bionicReading && !p.bionicReading) next = { ...next, dyslexiaFont: false };
				if (browser) localStorage.setItem('reading-prefs', JSON.stringify(next));
				return next;
			});
		}
	};
}

export const prefs = createPrefs();
