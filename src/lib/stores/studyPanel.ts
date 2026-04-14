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
	/** Set only by explicit user clicks (marker/verse). Drives the reader verse underline. */
	annotatedVerse: number | null;
	/** Set by the panel IntersectionObserver during free panel scroll. Drives reader scroll
	 *  without showing the underline — keeps "you selected this verse" separate from
	 *  "the panel is currently showing this verse". */
	panelScrollVerse: number | null;
	scrollTrigger: ScrollTrigger | null;
}

const defaults: StudyPanelState = {
	activeTab: 'commentary',
	activeIntroIndex: 0,
	activeVerse: null,
	annotatedVerse: null,
	panelScrollVerse: null,
	scrollTrigger: null
};

export const studyPanel = writable<StudyPanelState>({ ...defaults });
