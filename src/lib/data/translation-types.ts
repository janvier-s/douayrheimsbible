export interface TranslationVerse {
	verse: number;
	text: string;
}

/** A single verse-level note for DRC or CPDV */
export interface TranslationNote {
	verse: number;
	text: string;
}

/** A single numbered cross-reference entry for DRC */
export interface TranslationCrossRef {
	marker: number;
	verse: number;
	refs: string;
}

export interface TranslationChapter {
	chapter: number;
	summary?: string;
	verses: TranslationVerse[];
}

export interface TranslationBook {
	book: string;
	chapters: TranslationChapter[];
}
