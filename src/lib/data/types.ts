export interface Verse {
	verse: number;
	text: string;
}

export interface Chapter {
	chapter: number;
	summary: string;
	verses: Verse[];
}

export interface BookData {
	book: string;
	version_abbr: string;
	date: string;
	chapters: Chapter[];
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

export interface ResolvedReference {
	slug: string;
	chapter: number;
	verse?: number;
}
