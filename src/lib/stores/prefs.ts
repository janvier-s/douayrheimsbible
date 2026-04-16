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
	// v6
	modernBookNames: boolean;
	showPsalmNumbers: boolean;
	showChapterNav: boolean;
	columnWidth: 'narrow' | 'default' | 'wide';
	bionicFixation: number; // 1–5
	bionicSaccade: number; // 0–4
	bionicOpacity: number; // 0–0.8
	// v7
	syncStudyScroll: boolean;
	showItalics: boolean;
	// v9
	showSmallCaps: boolean;
	// v10
	compareFontSize: number;
	// v11
	expandAmpersand: boolean;
	// v12
	studyDefaultTab: 'intro' | 'commentary' | 'end';
	// v13
	annotationSync: boolean;
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
	studyPanelWidth: '42.65vw',
	modernBookNames: false,
	showPsalmNumbers: false,
	showChapterNav: true,
	columnWidth: 'default',
	bionicFixation: 3,
	bionicSaccade: 0,
	bionicOpacity: 1,
	syncStudyScroll: true,
	showItalics: true,
	showSmallCaps: true,
	compareFontSize: 14,
	expandAmpersand: false,
	studyDefaultTab: 'intro',
	annotationSync: true
};

const PREFS_VERSION = 14;

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
		// v6 migration: add new display and bionic preferences
		if (!parsed._v || parsed._v < 6) {
			parsed.modernBookNames = false;
			parsed.showPsalmNumbers = false;
			parsed.showChapterNav = true;
			parsed.columnWidth = 'default';
			parsed.bionicFixation = 3;
			parsed.bionicSaccade = 0;
			parsed.bionicOpacity = 1;
		}
		// v7 migration: add study sync and italics toggle
		if (!parsed._v || parsed._v < 7) {
			parsed.syncStudyScroll = true;
			parsed.showItalics = true;
		}
		// v8 migration: update default study panel width
		if (!parsed._v || parsed._v < 8) {
			parsed.studyPanelWidth = '42.65vw';
		}
		// v9 migration: add small-caps toggle (on by default)
		if (!parsed._v || parsed._v < 9) {
			parsed.showSmallCaps = true;
		}
		// v10 migration: add separate compare font size
		if (!parsed._v || parsed._v < 10) {
			parsed.compareFontSize = 13;
		}
		// v11 migration: add expand ampersand toggle
		if (!parsed._v || parsed._v < 11) {
			parsed.expandAmpersand = false;
		}
		// v12 migration: add study default tab preference
		if (!parsed._v || parsed._v < 12) {
			parsed.studyDefaultTab = 'intro';
		}
		// v13 migration: add annotation verse sync toggle
		if (!parsed._v || parsed._v < 13) {
			parsed.annotationSync = true;
		}
		// v14 migration: bump compare font size default from 13 to 14
		if (!parsed._v || parsed._v < 14) {
			if (parsed.compareFontSize === 13) parsed.compareFontSize = 14;
		}
		parsed._v = PREFS_VERSION;
		localStorage.setItem('reading-prefs', JSON.stringify(parsed));
		return { ...DEFAULTS, ...parsed };
	} catch {
		return DEFAULTS;
	}
}

function savePrefs(p: ReadingPrefs) {
	if (browser) localStorage.setItem('reading-prefs', JSON.stringify({ ...p, _v: PREFS_VERSION }));
}

function createPrefs() {
	const { subscribe, set, update } = writable<ReadingPrefs>(loadPrefs());

	return {
		subscribe,
		set(p: ReadingPrefs) {
			savePrefs(p);
			set(p);
		},
		update(fn: (p: ReadingPrefs) => ReadingPrefs) {
			update((p) => {
				const next = fn(p);
				savePrefs(next);
				return next;
			});
		}
	};
}

export const prefs = createPrefs();
