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
