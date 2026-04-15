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

// ── Legacy inline annotation (kept for intro system) ─────────────

export interface InlineAnnotation {
	marker: string;
	text: string;
}

// ── Core data types ──────────────────────────────────────────────

export interface Verse {
	verse: number;
	text: string;
	has_annotation?: boolean;
	cross_refs?: CrossRef[];
	notes?: VerseNote[];
}

export interface Chapter {
	chapter: number;
	summary?: string;
	summary_notes?: SummaryNote[];
	verses: Verse[];
}

export interface BookData {
	book: string;
	book_title?: string | null;
	short_title?: string | null;
	hebrew_title?: string | null;
	chapters: Chapter[];
	intros?: BookIntro[];
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
