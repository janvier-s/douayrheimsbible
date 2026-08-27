// ── Cross-references & notes (new schema) ────────────────────────

export interface CrossRef {
	text: string;
}

export interface VerseNote {
	label: string;
	text: string;
}

export interface SummaryNote {
	marker: number;
	text: string;
}

// ── Annotation sidecar types ─────────────────────────────────────

export interface AnnotationNote {
	marker: string | number;
	text: string;
}

export interface AnnotationEntry {
	verse: number;
	part?: number;
	title?: string;
	text: string;
	notes: AnnotationNote[];
}

export interface ChapterAnnotations {
	chapter: number;
	annotations: AnnotationEntry[];
}

// ── Confraternity commentary types ────────────────────────────
export interface ConfFootnoteEntry {
	verse: number;
	text: string;
}

export interface ConfChapterFootnotes {
	chapter: number;
	footnotes: ConfFootnoteEntry[];
}

export interface ConfCommentarySection {
	startVerse: number;
	endVerse: number;
	heading: string;
	paragraphs: string[];
}

export interface ConfChapterCommentary {
	chapter: number;
	sections: ConfCommentarySection[];
}

/** A book's Confraternity introduction: a flat list of paragraphs.
 *
 *  This mirrors what `prepare-data.ts` actually writes (the source file's
 *  `introduction` array). It was previously declared as
 *  `{ book, bibleIntro, commentaryIntro }`, which matched no file on disk, so
 *  every Confraternity page threw a TypeError reading `bibleIntro.length` and
 *  the Intro tab never appeared. */
export type ConfIntro = string[];

export interface ConfFrontMatter {
	paragraphs: string[];
}

export interface ConfBackMatter {
	paragraphs: string[];
}

// ── Legacy inline annotation (kept for intro system) ─────────────

export interface InlineAnnotation {
	marker: string;
	text: string;
}

// ── Core data types ──────────────────────────────────────────────

/** Where an annotation's catchword sits in the verse it annotates, as
 *  `[start, length, part]` in characters of `text` with its markup included.
 *  Derived by scripts/build-odr-lemmas.ts and checked by
 *  scripts/odr-lemmas.corpus.test.ts; ODR only, and absent where a verse
 *  carries no annotation. Sorted by start, and where two spans start together
 *  the outer one comes first. */
export type LemmaSpan = [start: number, length: number, part: number];

export interface Verse {
	verse: number;
	text: string;
	has_annotation?: boolean;
	lemmas?: LemmaSpan[];
	cross_refs?: CrossRef[];
	notes?: VerseNote[];
}

export interface Chapter {
	chapter: number;
	summary?: string;
	summary_notes?: SummaryNote[];
	verses: Verse[];
	articles?: BookIntro[];
}

export interface BookData {
	book: string;
	book_title?: string | null;
	short_title?: string | null;
	hebrew_title?: string | null;
	chapters: Chapter[];
	intros?: BookIntro[];
	endMatters?: BookIntro[];
}

export interface BookIntro {
	title: string;
	text: string;
	annotations?: InlineAnnotation[];
	notes?: AnnotationNote[];
	default?: boolean;
}

export interface BookMeta {
	/** URL slug e.g. "mark", "1-kings" */
	slug: string;
	/** Display name in the ODR e.g. "Mark", "3 Kings" */
	odrName: string;
	/** Modern English name e.g. "Mark", "1 Kings" */
	modernName: string;
	/** Latin Vulgate short name e.g. "Genesis", "I Regum", "Matthaeum" */
	latinName?: string;
	/** Latin Vulgate full title e.g. "Liber Genesis, Hebraice Beresith" */
	latinTitle?: string;
	testament: 'OT' | 'NT';
	/** Total number of chapters */
	chapters: number;
	/** Whether this book has Confraternity data (NT only) */
	hasConfraternity: boolean;
	/** If true, skip this book in sequential navigation (prev/next book chevrons, infinite scroll) */
	navSkip?: boolean;
}

/** Returns true if the marker is a cross-reference (numeric), false if footnote (letter) */
export function isCrossRef(marker: string): boolean {
	return /^\d+$/.test(marker);
}
