// src/lib/data/fathers-types.ts

export interface FathersEntry {
	/** Index position within pericope entries array */
	subVerse: string | null; // e.g. "1:7" — specific verse within pericope (ACCS only)
	subVerseNum: number | null; // 7 — parsed for quick comparison
	source: 'accs' | 'fkb';
	author: string; // Canonical: "St. John Chrysostom"
	date: string; // "c. 347–407", "354-430", ""
	title: string | null; // ACCS entry heading
	body: string;
	citation: string;
	isDocument: boolean; // true for councils, documents, anonymous works
	footnotes: Array<{ type: string; text: string }>;
	/** FKB-specific: doctrinal chapter context */
	fkbChapter: string | null; // e.g. "Ch. 13 — The One True God"
}

export interface FathersPericope {
	verseRef: string; // e.g. "Romans 1:1-7" (DRC book name)
	startVerse: number; // 1
	endVerse: number; // 7
	pericopeTitle: string | null; // ACCS: "An Apostle Called by God"
	overview: string | null; // ACCS: pericope overview paragraph
	entries: FathersEntry[];
}

export interface FathersChapterFile {
	pericopes: FathersPericope[];
	/** verse number → total entry count (for badge display) */
	verseEntryCounts: Record<number, number>;
	/** total entries in this chapter (ACCS + FKB) */
	totalEntries: number;
}
