import { describe, it, expect } from 'vitest';
import { foldCompare, sVerdicts, alignBanded } from '../../scripts/kjv1611/evidence-lib';

describe('foldCompare', () => {
	it('folds the letters Tesseract confuses with long s, for comparison only', () => {
		expect(foldCompare('faid')).toBe(foldCompare('said'));
		expect(foldCompare('ſaid')).toBe(foldCompare('Said,'));
		expect(foldCompare('Vpon')).toBe(foldCompare('upon'));
	});
});

describe('sVerdicts', () => {
	it('reads OCR l/f/ſ at an s position as long and s as round', () => {
		expect(sVerdicts('said', 'faid')).toEqual([{ index: 0, verdict: 'long' }]);
		expect(sVerdicts('said', 'said')).toEqual([{ index: 0, verdict: 'round' }]);
		expect(sVerdicts('goodnesse', 'goodneffe')).toEqual([
			{ index: 6, verdict: 'long' },
			{ index: 7, verdict: 'long' }
		]);
		expect(sVerdicts('Moses', 'Mofes,')).toEqual([
			{ index: 2, verdict: 'long' },
			{ index: 4, verdict: 'round' }
		]);
	});
	it('says nothing when the words do not line up letter for letter', () => {
		expect(sVerdicts('said', 'faide')).toEqual([]);
		expect(sVerdicts('said', 'xaid')).toEqual([]);
		expect(sVerdicts('said', 'iaid')).toEqual([]);
	});
});

describe('alignBanded', () => {
	it('aligns equal keys in order, skipping insertions on either side', () => {
		const verse = ['in', 'the', 'beginning', 'god', 'created'];
		const ocr = ['xx', 'in', 'the', 'junk', 'beginning', 'god', 'created', 'yy'];
		const m = alignBanded(verse, ocr, 10);
		expect([...m]).toEqual([1, 2, 4, 5, 6]);
	});
	it('marks verse words with no counterpart as -1', () => {
		const m = alignBanded(['a', 'b', 'c'], ['a', 'c'], 5);
		expect([...m]).toEqual([0, -1, 1]);
	});
});
