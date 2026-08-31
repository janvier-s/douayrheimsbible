import { describe, it, expect } from 'vitest';
import {
	tabLabel,
	buildVisibleTabs,
	buildVerseSections,
	formatHaydockAttribution,
	formatTrailingCitation,
	groupByVerse,
	activeTabIndex,
	studyTabId
} from '$lib/components/studyPanelUtils';
import type { Chapter, ChapterAnnotations, ConfIntro } from '$lib/data/types';
import type { HaydockIntro } from '$lib/data/loader';

describe('tabLabel', () => {
	it('maps known front-matter titles to short labels', () => {
		expect(tabLabel('The Argument in general')).toBe('General');
		expect(tabLabel('The Argument of the Book')).toBe('Argument');
		expect(tabLabel('The Sum of the Old Testament')).toBe('Sum (OT)');
		expect(tabLabel('The Sum of the New Testament')).toBe('Sum (NT)');
		expect(tabLabel('Of the twelve less Prophets')).toBe('Twelve Prophets');
	});

	it('prefers the more specific rule when several could match', () => {
		// "argument in general" is tested before the bare "argument" rule
		expect(tabLabel('Argument in General')).toBe('General');
		// "sum ... old" before bare "sum"
		expect(tabLabel('A Sum of the Old Law')).toBe('Sum (OT)');
	});

	it('falls back to the first two words, dropping a leading "the"', () => {
		expect(tabLabel('The Wonderful Providence of God')).toBe('Wonderful Providence');
		expect(tabLabel('Certain Difficult Places')).toBe('Certain Difficult');
	});

	it('handles a single-word title', () => {
		expect(tabLabel('Preface')).toBe('Preface');
	});
});

describe('buildVisibleTabs', () => {
	const noConf = null as ConfIntro | null;
	const noHaydock = null as HaydockIntro | null;

	it('odr: always shows annotations, notes and cross-refs', () => {
		const tabs = buildVisibleTabs('odr', false, false, false, noConf, noHaydock);
		expect(tabs.map((t) => t.id)).toEqual(['annotations', 'notes', 'cross-refs']);
	});

	it('odr: adds intro, article and end tabs when that content exists', () => {
		const tabs = buildVisibleTabs('odr', true, true, true, noConf, noHaydock);
		expect(tabs.map((t) => t.id)).toEqual([
			'intro',
			'annotations',
			'notes',
			'cross-refs',
			'article',
			'end'
		]);
	});

	it('conf: shows intro only when the intro actually has content', () => {
		const empty: ConfIntro = [];
		expect(
			buildVisibleTabs('conf', false, false, false, empty, noHaydock).map((t) => t.id)
		).toEqual(['footnotes', 'commentary']);

		const filled: ConfIntro = ['Introduction paragraph.'];
		expect(
			buildVisibleTabs('conf', false, false, false, filled, noHaydock).map((t) => t.id)
		).toEqual(['intro', 'footnotes', 'commentary']);
	});

	it('haydock: shows intro only when it has paragraphs', () => {
		const empty = { paragraphs: [] } as unknown as HaydockIntro;
		expect(
			buildVisibleTabs('haydock', false, false, false, noConf, empty).map((t) => t.id)
		).toEqual(['commentary', 'cross-refs']);

		const filled = { paragraphs: ['x'] } as unknown as HaydockIntro;
		expect(
			buildVisibleTabs('haydock', false, false, false, noConf, filled).map((t) => t.id)
		).toEqual(['intro', 'commentary', 'cross-refs']);
	});

	it('drc, cpdv, knox and vul get their fixed tab sets', () => {
		expect(
			buildVisibleTabs('drc', false, false, false, noConf, noHaydock).map((t) => t.id)
		).toEqual(['notes', 'cross-refs']);
		expect(
			buildVisibleTabs('cpdv', false, false, false, noConf, noHaydock).map((t) => t.id)
		).toEqual(['notes']);
		expect(
			buildVisibleTabs('knox', false, false, false, noConf, noHaydock).map((t) => t.id)
		).toEqual(['notes']);
		expect(
			buildVisibleTabs('vul', false, false, false, noConf, noHaydock).map((t) => t.id)
		).toEqual(['glossa', 'textual-notes']);
	});

	it('returns nothing for an unknown translation', () => {
		expect(buildVisibleTabs('nope', true, true, true, noConf, noHaydock)).toEqual([]);
	});
});

describe('activeTabIndex', () => {
	const tabs = [
		{ id: 'intro' as const, label: 'Intro' },
		{ id: 'notes' as const, label: 'Notes' },
		{ id: 'cross-refs' as const, label: 'Cross-Refs' }
	];

	it('finds the active tab', () => {
		expect(activeTabIndex(tabs, 'intro')).toBe(0);
		expect(activeTabIndex(tabs, 'cross-refs')).toBe(2);
	});

	it('clamps to 0 when the active tab is not in the list', () => {
		// Happens for a tick after a translation switch, before the snap-to-first
		// effect runs. A -1 here would send the underline to -100% and leave
		// aria-labelledby pointing at an id that is not in the document.
		expect(activeTabIndex(tabs, 'glossa')).toBe(0);
	});

	it('clamps to 0 for an empty list', () => {
		expect(activeTabIndex([], 'notes')).toBe(0);
	});
});

describe('studyTabId', () => {
	it('is stable and distinct per tab', () => {
		expect(studyTabId('cross-refs')).toBe('study-tab-cross-refs');
		expect(studyTabId('notes')).not.toBe(studyTabId('intro'));
	});
});

describe('buildVerseSections', () => {
	it('returns nothing without a chapter', () => {
		expect(buildVerseSections(undefined, null)).toEqual([]);
	});

	it('only includes verses that carry notes, cross-refs or annotations', () => {
		const chapter: Chapter = {
			chapter: 1,
			verses: [
				{ verse: 1, text: 'plain' },
				{ verse: 2, text: 'has note', notes: [{ label: 'a', text: 'n' }] },
				{ verse: 3, text: 'has xref', cross_refs: [{ label: 'b', text: 'r' }] as never },
				{ verse: 4, text: 'plain too' }
			]
		};
		const sections = buildVerseSections(chapter, null);
		expect(sections.map((s) => s.verse)).toEqual([2, 3]);
		expect(sections[0].label).toBe('Verse 2');
	});

	it('adds a Summary section for verse 0 content and does not list verse 0 twice', () => {
		const chapter: Chapter = {
			chapter: 1,
			verses: [
				{ verse: 0, text: 'summary tail', notes: [{ label: 'a', text: 'n' }] },
				{ verse: 1, text: 'body', notes: [{ label: 'b', text: 'n' }] }
			]
		};
		const sections = buildVerseSections(chapter, null);
		expect(sections.map((s) => s.verse)).toEqual([0, 1]);
		expect(sections[0].label).toBe('Summary');
	});

	it('ignores annotations belonging to a different chapter', () => {
		const chapter: Chapter = {
			chapter: 2,
			verses: [{ verse: 1, text: 'x', has_annotation: true }]
		};
		const stale: ChapterAnnotations = {
			chapter: 1,
			annotations: [{ verse: 1, text: 'from chapter 1', notes: [] }]
		};
		// has_annotation is true but the annotations are stale, so nothing qualifies
		expect(buildVerseSections(chapter, stale)).toEqual([]);

		const fresh: ChapterAnnotations = {
			chapter: 2,
			annotations: [{ verse: 1, text: 'right chapter', notes: [] }]
		};
		const ok = buildVerseSections(chapter, fresh);
		expect(ok.map((s) => s.verse)).toEqual([1]);
		expect(ok[0].annotationEntries).toHaveLength(1);
	});
});

describe('groupByVerse', () => {
	it('groups entries and sorts the groups by verse number', () => {
		const grouped = groupByVerse([
			{ verse: 3, id: 'c' },
			{ verse: 1, id: 'a' },
			{ verse: 3, id: 'd' },
			{ verse: 2, id: 'b' }
		]);
		expect(grouped.map((g) => g.verse)).toEqual([1, 2, 3]);
		expect(grouped[2].entries.map((e) => e.id)).toEqual(['c', 'd']);
	});

	it('preserves original order within a verse', () => {
		const grouped = groupByVerse([
			{ verse: 1, id: 'first' },
			{ verse: 1, id: 'second' }
		]);
		expect(grouped[0].entries.map((e) => e.id)).toEqual(['first', 'second']);
	});

	it('handles an empty list', () => {
		expect(groupByVerse([])).toEqual([]);
	});
});

describe('formatHaydockAttribution', () => {
	it('turns a trailing (Author) into a citation line', () => {
		const out = formatHaydockAttribution('Some commentary text. (Calmet)');
		expect(out).toContain('haydock-attribution');
		expect(out).toContain('— Calmet');
	});

	it('formats each <hr>-separated paragraph independently', () => {
		const out = formatHaydockAttribution('One. (Calmet)<hr>Two. (Haydock)');
		expect(out.match(/haydock-attribution/g)).toHaveLength(2);
		expect(out).toContain('<hr>');
	});

	it('leaves text without a trailing attribution alone', () => {
		const input = 'No attribution here.';
		expect(formatHaydockAttribution(input)).toBe(input);
	});
});

describe('formatTrailingCitation', () => {
	it('promotes a trailing italic patristic citation to its own line', () => {
		const out = formatTrailingCitation('The sense is plain. <i>Theod. q. 34. in Deut.</i>');
		expect(out).toContain('note-citation');
		expect(out).toContain('Theod.');
	});

	it('leaves a trailing italic alone when it is only a linkified verse reference', () => {
		const input = 'See also. <i><a class="verse-ref" data-osis="Gen.1.1">Gen. 1.</a></i>';
		expect(formatTrailingCitation(input)).toBe(input);
	});

	it('promotes a plain-text citation that starts with a known abbreviation', () => {
		const out = formatTrailingCitation('A point of doctrine. S. Aug. l. 4. de Gen. ad lit. c. 12.');
		expect(out).toContain('note-citation');
	});

	it('leaves ordinary prose untouched', () => {
		const input = 'This is a plain sentence. And another one.';
		expect(formatTrailingCitation(input)).toBe(input);
	});
});
