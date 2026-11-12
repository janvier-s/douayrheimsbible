import { describe, it, expect } from 'vitest';
import {
	odrToPrevious,
	previousToOdr,
	comparisonRows,
	alignOdrToRows,
	chapterVersification,
	type Versification
} from '$lib/utils/versification';
import real from '../../static/data/odr/versification.json';

const map = real as unknown as Versification;
const mt17 = chapterVersification(map, 'matthew', 17);
const ps5 = chapterVersification(map, 'psalms', 5);
const ecclus29 = chapterVersification(map, 'ecclesiasticus', 29);

describe('odrToPrevious / previousToOdr', () => {
	it('is the identity where nothing is listed', () => {
		expect(odrToPrevious(undefined, 4)).toEqual([4]);
		expect(previousToOdr(undefined, 4)).toEqual([4]);
		expect(chapterVersification(map, 'genesis', 1)).toBeUndefined();
	});
	it('translates a listed ODR verse and leaves unlisted ones alone', () => {
		expect(odrToPrevious(mt17, 27)).toEqual([26]);
		expect(odrToPrevious(mt17, 14)).toEqual([14]);
		// 1609: 16 "Aboue the shilde of the mightie," / 17 "& aboue the speare ... thyne enemie."
		expect(odrToPrevious(ecclus29, 16)).toEqual([16]);
		expect(odrToPrevious(ecclus29, 17)).toEqual([17, 18]);
		expect(odrToPrevious(ecclus29, 18)).toEqual([19]);
		expect(odrToPrevious(ecclus29, 26)).toEqual([27]);
		expect(odrToPrevious(ecclus29, 27)).toEqual([28]);
	});
	it('inverts, including a previous verse split over two ODR verses', () => {
		expect(previousToOdr(mt17, 14)).toEqual([14, 15]);
		expect(previousToOdr(mt17, 26)).toEqual([27]);
		expect(previousToOdr(ecclus29, 16)).toEqual([16]);
		expect(previousToOdr(ecclus29, 17)).toEqual([17]);
		expect(previousToOdr(ecclus29, 18)).toEqual([17]);
		expect(previousToOdr(ecclus29, 19)).toEqual([18]);
		expect(previousToOdr(ps5, 9)).toEqual([9]);
		expect(previousToOdr(ps5, 10)).toEqual([10]);
	});
});

describe('comparisonRows', () => {
	it('keeps Vulgate rows: Matthew 17 has 27 ODR verses but 26 rows', () => {
		const rows = comparisonRows(
			mt17,
			Array.from({ length: 27 }, (_, i) => i + 1)
		);
		expect(rows).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
	});
});

describe('alignOdrToRows', () => {
	it('returns the texts unchanged without a map', () => {
		const t = { 1: 'a', 2: 'b' };
		expect(alignOdrToRows(undefined, t)).toBe(t);
	});
	it('shares a row between two ODR verses, tagging each', () => {
		const t: Record<number, string> = {};
		for (let i = 1; i <= 27; i++) t[i] = `v${i}`;
		const out = alignOdrToRows(mt17, t);
		expect(out[14]).toBe('(14) v14 (15) v15');
		expect(out[15]).toBe('(16) v16');
		expect(out[26]).toBe('(27) v27');
		expect(out[27]).toBeUndefined();
		expect(out[3]).toBe('v3');
	});
	it('shows a verse covering several rows once, with a pointer on the later rows', () => {
		const out = alignOdrToRows(ecclus29, { 15: 'a', 16: 'b', 17: 'c', 18: 'd' });
		expect(out[15]).toBe('a');
		expect(out[16]).toBe('b');
		expect(out[17]).toBe('c');
		expect(out[18]).toBe('\u2191 (17)');
		expect(out[19]).toBe('(18) d');
	});
});

import { previousRangeToOdr, COLUMN_VERSIFICATION } from '$lib/utils/versification';
import { remapFathersChapter } from '$lib/utils/fathers-remap';
import { resolveReference } from '$lib/search/resolve';
import type { FathersChapterFile } from '$lib/data/fathers-types';

describe('previousRangeToOdr', () => {
	it('is the identity without a map', () => {
		expect(previousRangeToOdr(undefined, 3, 5)).toEqual({ start: 3, end: 5 });
	});
	it('widens a citation to the ODR verses that contain it', () => {
		expect(previousRangeToOdr(mt17, 14)).toEqual({ start: 14, end: 15 });
		expect(previousRangeToOdr(mt17, 20, 26)).toEqual({ start: 21, end: 27 });
		expect(previousRangeToOdr(ps5, 7, 9)).toEqual({ start: 7, end: 9 });
	});
});

describe('resolveReference', () => {
	it('lands a Vulgate-numbered citation on the ODR verse', () => {
		const r = resolveReference({ book: 'Matt', chapter: 17, verse: 20 } as never);
		expect(r?.verse).toBe(21);
		expect(r?.url).toBe('/odr/matthew/17#v21');
	});
	it('leaves other chapters alone', () => {
		expect(resolveReference({ book: 'Matt', chapter: 16, verse: 18 } as never)?.verse).toBe(18);
	});
});

describe('remapFathersChapter', () => {
	const entry = (subVerseNum: number | null) => ({ subVerseNum }) as never;
	const data: FathersChapterFile = {
		totalEntries: 3,
		verseEntryCounts: { 14: 2, 15: 1, 26: 4 },
		pericopes: [
			{
				verseRef: 'Matthew 17:14-26',
				startVerse: 14,
				endVerse: 26,
				pericopeTitle: null,
				overview: null,
				entries: [entry(null), entry(15), entry(26)]
			}
		]
	};
	it('returns the data untouched where nothing is re-divided', () => {
		expect(remapFathersChapter(data, undefined, [14, 15])).toBe(data);
	});
	it('moves counts, ranges and sub-verses onto ODR numbers', () => {
		const odr = Array.from({ length: 27 }, (_, i) => i + 1);
		const out = remapFathersChapter(data, mt17, odr)!;
		expect(out.verseEntryCounts).toEqual({ 14: 2, 15: 2, 16: 1, 27: 4 });
		expect(out.pericopes[0].startVerse).toBe(14);
		expect(out.pericopes[0].endVerse).toBe(27);
		expect(out.pericopes[0].entries.map((e) => e.subVerseNum)).toEqual([null, 16, 27]);
		expect(out.pericopes[0].verseRef).toBe('Matthew 17:14-26');
	});
});

describe('COLUMN_VERSIFICATION (Challoner numbering)', () => {
	const texts = (n: number) =>
		Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, `d${i + 1}`]));
	it('puts DRC Ecclesiasticus 29:18-34 one row down and splits 16', () => {
		const out = alignOdrToRows(
			chapterVersification(COLUMN_VERSIFICATION.drc, 'ecclesiasticus', 29),
			texts(34),
			{ tagShifted: false }
		);
		expect(out[15]).toBe('d15');
		expect(out[16]).toBe('d16');
		expect(out[17]).toBe('\u2191 (16)');
		expect(out[18]).toBe('d17');
		expect(out[19]).toBe('d18');
		expect(out[35]).toBe('d34');
	});
	it('folds the extra DRC verse onto the Vulgate row', () => {
		const ps42 = alignOdrToRows(
			chapterVersification(COLUMN_VERSIFICATION.drc, 'psalms', 42),
			texts(6),
			{ tagShifted: false }
		);
		expect(ps42[5]).toBe('(5) d5 (6) d6');
		expect(ps42[6]).toBeUndefined();
		const cpdv = alignOdrToRows(
			chapterVersification(COLUMN_VERSIFICATION.cpdv, 'psalms', 42),
			texts(6),
			{ tagShifted: false }
		);
		expect(cpdv[6]).toBe('d6');
	});
});
