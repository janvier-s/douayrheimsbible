export interface InlineAnnotation {
	marker: string; // letter ('a','b') = footnote; digit ('1','2') = cross-ref
	text: string;
}

export interface Annotation {
	chapter: number;
	verse: number;
	page: number;
	title: string;
	text: string;
	annotations?: InlineAnnotation[];
}

export interface BookIntro {
	title: string;
	text: string;
	annotations?: InlineAnnotation[];
	default?: boolean;
}

export interface Verse {
	verse: number;
	text: string;
	inlineAnnotations?: InlineAnnotation[];
}

export interface Chapter {
	chapter: number;
	summary: string;
	verses: Verse[];
	annotations?: Annotation[];
}

export interface BookData {
	book: string;
	version_abbr: string;
	date: string;
	chapters: Chapter[];
	intros?: BookIntro[];
}

export interface BookMeta {
	/** URL slug e.g. "mark", "1-kings" */
	slug: string;
	/** Display name in the ODR e.g. "Mark", "3 Kings" */
	odrName: string;
	/** Modern English name e.g. "Mark", "1 Kings" */
	modernName: string;
	testament: 'OT' | 'NT';
	/** Total number of chapters */
	chapters: number;
	/** Whether this book has Confraternity data (NT only) */
	hasConfraternity: boolean;
}

/** Returns true if the marker is a cross-reference (numeric), false if footnote (letter) */
export function isCrossRef(marker: string): boolean {
	return /^\d+$/.test(marker);
}
