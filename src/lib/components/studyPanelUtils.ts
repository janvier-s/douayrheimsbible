/**
 * Pure helpers extracted from `StudyPanel.svelte`.
 *
 * The panel had grown to ~2,500 lines mixing data loading, scroll observation
 * and rendering. Everything here is a plain function of its arguments, so it can
 * be unit tested without mounting the component.
 */

import type { StudyTab } from '$lib/stores/studyPanel';
import type {
	Chapter,
	ChapterAnnotations,
	AnnotationEntry,
	Verse,
	ConfIntro
} from '$lib/data/types';
import type { HaydockIntro } from '$lib/data/loader';

export type TabDef = { id: StudyTab; label: string };

export interface VerseSection {
	verse: number;
	label: string;
	verseData: Verse | null;
	annotationEntries: AnnotationEntry[];
}

/** Shorten a front-matter title into something that fits a tab. */
export function tabLabel(title: string): string {
	if (/argument.*in general/i.test(title)) return 'General';
	if (/argument/i.test(title)) return 'Argument';
	if (/sum.*old/i.test(title)) return 'Sum (OT)';
	if (/sum.*new/i.test(title)) return 'Sum (NT)';
	if (/sum/i.test(title)) return 'Sum';
	if (/moyses|moses/i.test(title)) return 'Of Moyses';
	if (/recapitulation/i.test(title)) return 'Recapitulation';
	if (/continuance.*church/i.test(title)) return 'Continuance';
	if (/augustin/i.test(title)) return 'S. Augustin';
	if (/end of the acts/i.test(title)) return 'End of Acts';
	if (/other apostles/i.test(title)) return 'The Other Apostles';
	if (/proemial/i.test(title)) return 'Proemial';
	if (/interpretation.*scripture/i.test(title)) return 'Interpretation';
	if (/annotations.*concerning/i.test(title)) return 'Annotations';
	if (/prologue/i.test(title)) return 'Prologue';
	if (/sapiential/i.test(title)) return 'Sapiential Books';
	if (/prophetical/i.test(title)) return 'Prophetical Books';
	if (/twelve less/i.test(title)) return 'Twelve Prophets';
	if (/machabees.*historical/i.test(title)) return 'Machabees';
	if (/epistle.*hebrews/i.test(title)) return 'Epistle';
	if (/third book.*esdras/i.test(title)) return '3 Esdras';
	if (/prophecy of/i.test(title)) return 'Prophecy';
	if (/remonstrance/i.test(title)) return 'Remonstrance';
	if (/general annotations/i.test(title)) return 'Annotations';
	if (/brief note/i.test(title)) return 'Note';
	if (/parables/i.test(title)) return 'Parables';
	if (/declaration/i.test(title)) return 'Declaration';
	if (/annotations upon/i.test(title)) return 'Annotations';
	if (/catholic epistle/i.test(title)) return 'Catholic Epistles';
	if (/sum.*gospels/i.test(title)) return 'Sum (Gospels)';
	return title
		.replace(/^the\s+/i, '')
		.split(/\s+/)
		.slice(0, 2)
		.join(' ');
}

/** Which tabs the panel shows, per translation. */
export function buildVisibleTabs(
	tid: string,
	hasIntros: boolean,
	hasArticles: boolean,
	hasEndMatters: boolean,
	confIntro: ConfIntro | null,
	haydockIntro: HaydockIntro | null
): TabDef[] {
	if (tid === 'odr') {
		return [
			...(hasIntros ? [{ id: 'intro' as StudyTab, label: 'Intro' }] : []),
			{ id: 'annotations' as StudyTab, label: 'Annotations' },
			{ id: 'notes' as StudyTab, label: 'Notes' },
			{ id: 'cross-refs' as StudyTab, label: 'Cross-Refs' },
			...(hasArticles ? [{ id: 'article' as StudyTab, label: 'Article' }] : []),
			...(hasEndMatters ? [{ id: 'end' as StudyTab, label: 'End' }] : [])
		];
	}
	if (tid === 'conf') {
		const tabs: TabDef[] = [];
		if (confIntro && confIntro.length > 0) {
			tabs.push({ id: 'intro', label: 'Intro' });
		}
		tabs.push({ id: 'footnotes', label: 'Footnotes' });
		tabs.push({ id: 'commentary', label: 'Commentary' });
		return tabs;
	}
	if (tid === 'drc') {
		return [
			{ id: 'notes', label: 'Notes' },
			{ id: 'cross-refs', label: 'Cross-Refs' }
		];
	}
	if (tid === 'haydock') {
		const tabs: TabDef[] = [];
		if (haydockIntro && haydockIntro.paragraphs.length > 0) {
			tabs.push({ id: 'intro', label: 'Intro' });
		}
		tabs.push({ id: 'commentary', label: 'Commentary' });
		tabs.push({ id: 'cross-refs', label: 'Cross-Refs' });
		return tabs;
	}
	if (tid === 'cpdv' || tid === 'knox' || tid === 'kjv') {
		return [{ id: 'notes', label: 'Notes' }];
	}
	if (tid === 'vul') {
		// Always shown, including books the Glossa / textual notes never covered.
		return [
			{ id: 'glossa', label: 'Glossa Ordinaria' },
			{ id: 'textual-notes', label: 'Textual Notes' }
		];
	}
	return [];
}

/** DOM id of a tab button, so the content region can point back at it. */
export function studyTabId(tab: StudyTab): string {
	return `study-tab-${tab}`;
}

/**
 * Index of the active tab within the visible list.
 *
 * Clamped to 0: during a translation switch the new tab list lands a tick
 * before the store's `activeTab` catches up, so the lookup can miss. Returning
 * -1 there would send the sliding underline to -100% and leave `aria-labelledby`
 * pointing at an id that is not in the document.
 */
export function activeTabIndex(tabs: TabDef[], activeTab: StudyTab): number {
	return Math.max(
		0,
		tabs.findIndex((t) => t.id === activeTab)
	);
}

/** Build the per-verse sections the ODR panel renders. */
export function buildVerseSections(
	chapter: Chapter | undefined,
	anns: ChapterAnnotations | null
): VerseSection[] {
	if (!chapter) return [];
	// Guard against stale annotations from a previously-visited chapter
	const safeAnns = anns?.chapter === chapter.chapter ? anns : null;
	const sections: VerseSection[] = [];

	// Verse 0 is a summary continuation — merge its notes into the Summary section
	const verse0 = chapter.verses.find((v) => v.verse === 0);
	const hasSummaryNotes = chapter.summary_notes && chapter.summary_notes.length > 0;
	const hasVerse0Content =
		verse0 &&
		((verse0.notes && verse0.notes.length > 0) ||
			(verse0.cross_refs && verse0.cross_refs.length > 0));

	if (hasSummaryNotes || hasVerse0Content) {
		sections.push({
			verse: 0,
			label: 'Summary',
			verseData: verse0 ?? null,
			annotationEntries: []
		});
	}

	// Verse sections (skip verse 0 — handled above)
	for (const v of chapter.verses) {
		if (v.verse === 0) continue;
		const hasCrossRefs = v.cross_refs && v.cross_refs.length > 0;
		const hasNotes = v.notes && v.notes.length > 0;
		const annEntries = safeAnns?.annotations.filter((a) => a.verse === v.verse) ?? [];
		const hasAnnotations = v.has_annotation && annEntries.length > 0;

		if (hasCrossRefs || hasNotes || hasAnnotations) {
			sections.push({
				verse: v.verse,
				label: `Verse ${v.verse}`,
				verseData: v,
				annotationEntries: annEntries
			});
		}
	}

	return sections;
}

/** Format trailing (Author) attribution as a styled citation line, per paragraph */
export function formatHaydockAttribution(html: string): string {
	return html
		.split('<hr>')
		.map((seg) =>
			seg.replace(
				/\(([A-Z][a-zA-Zé.'"  ]+)\)\s*$/,
				'<br><span class="haydock-attribution">— $1</span>'
			)
		)
		.join('<hr>');
}

/** If the note ends with a non-verse citation — either a trailing italic block such
 *  as "<i>Theod. q. 34. in Deut.</i>" or a plain-text patristic citation like
 *  "S. Aug. l. 4. de Gen. ad lit. c. 12." — promote it to its own line preceded
 *  by an em-dash. Apply AFTER linkifyDrcRefs so recognised verse references
 *  (already wrapped in <a class="verse-ref">) are excluded. */
export function formatTrailingCitation(html: string): string {
	const italic = html.match(/^([\s\S]+?[.?!])\s+(<i>((?:(?!<\/i>).)+)<\/i>)\s*$/);
	if (italic) {
		const inner = italic[3];
		// Skip italics that resolve to nothing but Bible references (already
		// linkified to <a class="verse-ref">) or bare verse markers like
		// "v. 7. & 11.". Drop anchor tags + their content first so the remaining
		// text is whatever wasn't a recognised reference; require a 3+ letter
		// word there (e.g. "Aug.", "Theod.", "civit.") to format as a citation.
		const withoutAnchors = inner.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, '');
		const remaining = withoutAnchors.replace(/<[^>]+>/g, '');
		if (/\b[A-Za-z]{3,}\b/.test(remaining)) {
			return `${italic[1]}<br /><span class="note-citation">— ${italic[2]}</span>`;
		}
	}
	// Plain-text patristic citation: must start with a known abbreviation prefix and
	// contain at least two short "abbr." chunks so we don't catch normal prose.
	const plain = html.match(
		/^([\s\S]+?[.?!])\s+((?:S\.|St\.|D\.|Theod\.|Cf\.) (?:[^<.]*\.\s*){2,}[^<.]*\.)\s*$/
	);
	if (plain) {
		return `${plain[1]}<br /><span class="note-citation">— ${plain[2]}</span>`;
	}
	return html;
}

/** The textual-notes source marks italics with underscores (e.g. "_Vulgata-Lesebuch_").
 *  Escape the note text first, then turn each underscore-delimited span into <em>. */
export function formatTextualNote(text: string): string {
	const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return escaped.replace(/_([^_]+)_/g, '<em>$1</em>');
}

/** Group flat commentary entries by verse for section rendering */
export function groupByVerse<T extends { verse: number }>(
	entries: T[]
): { verse: number; entries: T[] }[] {
	const map = new Map<number, T[]>();
	for (const e of entries) {
		if (!map.has(e.verse)) map.set(e.verse, []);
		map.get(e.verse)!.push(e);
	}
	return Array.from(map.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([verse, entries]) => ({ verse, entries }));
}
