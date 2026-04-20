// src/lib/stores/studyPanel.ts
import { writable } from 'svelte/store';

export type StudyTab =
	| 'intro'
	| 'commentary'
	| 'article'
	| 'end'
	| 'footnotes'
	| 'annotations'
	| 'notes'
	| 'cross-refs';

export interface ScrollTrigger {
	verse: number; // 0 = summary
	type?: 'cross_ref' | 'note' | 'annotation';
	marker?: string; // e.g. "1", "a"
}

// ── UI + sync state (persistent across tab switches) ─────────────────────────

export interface StudyPanelState {
	activeTab: StudyTab;
	activeIntroIndex: number;
	activeEndIndex: number;
	activeArticleIndex: number;
	activeVerse: number | null;
	/** Set only by explicit user clicks (marker/verse). Drives the reader verse underline. */
	annotatedVerse: number | null;
	/** Set by the panel IntersectionObserver during free panel scroll. Drives reader scroll
	 *  without showing the underline — keeps "you selected this verse" separate from
	 *  "the panel is currently showing this verse". */
	panelScrollVerse: number | null;
	activeConfIntroTab: 'bible' | 'commentary';
	/** One-shot flag: when activeTab was set from a URL ?tab= param, the book-change
	 *  reactive in StudyPanel should respect it instead of overriding with the default. */
	tabSetByUrl: boolean;
}

const defaults: StudyPanelState = {
	activeTab: 'annotations',
	activeIntroIndex: 0,
	activeEndIndex: 0,
	activeArticleIndex: 0,
	activeVerse: null,
	annotatedVerse: null,
	panelScrollVerse: null,
	activeConfIntroTab: 'bible' as const,
	tabSetByUrl: false
};

export const studyPanel = writable<StudyPanelState>({ ...defaults });

// ── Scroll trigger (one-shot event) ──────────────────────────────────────────
// Separated from the main store so frequent panelScrollVerse / annotatedVerse
// updates don't cause the trigger subscriber to re-evaluate, and vice-versa.
// Producer sets a value; consumer reads it and nulls it after handling.

export const scrollTrigger = writable<ScrollTrigger | null>(null);
