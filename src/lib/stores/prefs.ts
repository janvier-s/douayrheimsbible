import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface ReadingPrefs {
	showVerseNumbers: boolean;
	paragraphView: boolean;
	infiniteScroll: boolean;
	justifiedText: boolean;
	fontSize: number;
	lineHeight: number;
	fontFamily: string;
	bionicReading: boolean;
	dyslexiaFont: boolean;
	readingMode: 'reading' | 'study';
	studyPanelWidth: string; // CSS width value e.g. '33vw' or '420px'
}

const DEFAULTS: ReadingPrefs = {
	showVerseNumbers: true,
	paragraphView: false,
	infiniteScroll: true,
	justifiedText: false,
	fontSize: 16,
	lineHeight: 1.8,
	fontFamily: 'libre-baskerville',
	bionicReading: false,
	dyslexiaFont: false,
	readingMode: 'reading',
	studyPanelWidth: '33vw'
};

const PREFS_VERSION = 5;

function loadPrefs(): ReadingPrefs {
	if (!browser) return DEFAULTS;
	try {
		const stored = localStorage.getItem('reading-prefs');
		if (!stored) return DEFAULTS;
		const parsed = JSON.parse(stored) as ReadingPrefs & { _v?: number; darkMode?: boolean };
		// v2 migration: fs-brabo-pro was the old default; upgrade to libre-baskerville
		if ((!parsed._v || parsed._v < 2) && parsed.fontFamily === 'fs-brabo-pro') {
			parsed.fontFamily = 'libre-baskerville';
		}
		// v3 migration: darkMode removed; theme is now stored separately under 'theme' key
		if (!parsed._v || parsed._v < 3) {
			delete parsed.darkMode;
		}
		// v4 migration: lexend → montserrat, verdana → noto-sans
		if (!parsed._v || parsed._v < 4) {
			if (parsed.fontFamily === 'lexend') parsed.fontFamily = 'montserrat';
			if (parsed.fontFamily === 'verdana') parsed.fontFamily = 'noto-sans';
		}
		// v5 migration: add readingMode and studyPanelWidth
		if (!parsed._v || parsed._v < 5) {
			parsed.readingMode = 'reading';
			parsed.studyPanelWidth = '33vw';
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
				const next = fn(p);
				if (browser) localStorage.setItem('reading-prefs', JSON.stringify(next));
				return next;
			});
		}
	};
}

export const prefs = createPrefs();
