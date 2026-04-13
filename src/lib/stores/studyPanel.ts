// src/lib/stores/studyPanel.ts
import { writable } from 'svelte/store';

export type StudyTab = 'intro' | 'commentary';

export interface ScrollTrigger {
	verse: number; // 0 = summary
	type?: 'cross_ref' | 'note' | 'annotation';
	marker?: string; // e.g. "1", "a"
}

export interface StudyPanelState {
	activeTab: StudyTab;
	activeIntroIndex: number;
	activeVerse: number | null;
	annotatedVerse: number | null;
	scrollTrigger: ScrollTrigger | null;
}

const defaults: StudyPanelState = {
	activeTab: 'commentary',
	activeIntroIndex: 0,
	activeVerse: null,
	annotatedVerse: null,
	scrollTrigger: null
};

export const studyPanel = writable<StudyPanelState>({ ...defaults });
