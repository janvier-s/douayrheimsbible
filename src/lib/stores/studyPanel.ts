// src/lib/stores/studyPanel.ts
import { writable } from 'svelte/store';

export type StudyTab = 'intro' | 'commentary';

export interface StudyPanelState {
	activeTab: StudyTab;
	activeIntroIndex: number;
}

const defaults: StudyPanelState = {
	activeTab: 'intro',
	activeIntroIndex: 0
};

export const studyPanel = writable<StudyPanelState>({ ...defaults });
