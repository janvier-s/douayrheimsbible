export interface TranslationVerse {
	verse: number;
	text: string;
}

/** A single verse-level note for DRC or CPDV */
export interface TranslationNote {
	verse: number;
	text: string;
}

export interface TranslationChapter {
	chapter: number;
	verses: TranslationVerse[];
}

export interface TranslationBook {
	book: string;
	chapters: TranslationChapter[];
}

/** Book introduction for a non-ODR translation (e.g. Confraternity). */
export interface TranslationIntro {
	/** Plain-text paragraphs — no inline markers. */
	paragraphs: string[];
}
