import { describe, it, expect } from 'vitest';
import {
	GLOSSA_BOOK_MAP,
	GLOSSA_AUTHORS,
	normalizeLatin,
	expandAuthor,
	extractLemma
} from '../../scripts/glossa-lib.js';

describe('normalizeLatin', () => {
	it('folds case, diacritics, ligatures and j/i', () => {
		expect(normalizeLatin('In principio creavit Deus cælum')).toBe(
			'in principio creauit deus caelum'
		);
		expect(normalizeLatin('Jesus œconomia')).toBe('iesus oeconomia');
	});

	it('reduces punctuation to single spaces', () => {
		expect(normalizeLatin('Dixitque Deus : Fiat lux.')).toBe('dixitque deus fiat lux');
	});
});

describe('expandAuthor', () => {
	it('expands a short siglum', () => {
		expect(expandAuthor('AUG')).toBe('Augustinus');
		expect(expandAuthor('BEDA')).toBe('Beda');
	});

	it('collapses long and short forms of the same Father', () => {
		expect(expandAuthor('AUGUSTINUS')).toBe(expandAuthor('AUG'));
		expect(expandAuthor('HIERONYMUS')).toBe(expandAuthor('HIERON'));
		expect(expandAuthor('AMBROSIUS')).toBe(expandAuthor('AMBR'));
	});

	it('returns undefined for an absent author', () => {
		expect(expandAuthor(null)).toBeUndefined();
		expect(expandAuthor(undefined)).toBeUndefined();
		expect(expandAuthor('')).toBeUndefined();
	});

	it('throws on an unrecognised siglum', () => {
		expect(() => expandAuthor('PROSP')).toThrow('Unknown Glossa author siglum: PROSP');
	});
});

describe('extractLemma', () => {
	const v8 = 'Novissime autem omnium tamquam abortivo, visus est et mihi.';

	it('splits a verified lemma off the body', () => {
		const r = extractLemma('Abortivo. Abortivus dicitur quia extra tempus.', v8);
		expect(r.lemma).toBe('Abortivo.');
		expect(r.body).toBe('Abortivus dicitur quia extra tempus.');
	});

	it('keeps the ", etc." terminator on the lemma', () => {
		const verse = 'Quod si Christus non resurrexit, vana est fides vestra.';
		const r = extractLemma('Quod si Christus non, etc. Si Christus non resurrexit.', verse);
		expect(r.lemma).toBe('Quod si Christus non, etc.');
		expect(r.body).toBe('Si Christus non resurrexit.');
	});

	it('leaves text whole when the candidate is not in the verse', () => {
		const text = 'lib. IX Moral., cap. 7 Peccatum vero cum voce, culpa est in actione.';
		const r = extractLemma(text, v8);
		expect(r.lemma).toBeUndefined();
		expect(r.body).toBe(text);
	});

	it('drops a stray leading stop left by damaged source punctuation', () => {
		const verse = 'Percusseruntque eos in ore gladii.';
		const text = 'Percusseruntque. . Alia editio habet, etc., usque ad quia ibi.';
		const r = extractLemma(text, verse);
		expect(r.lemma).toBe('Percusseruntque.');
		expect(r.body).toBe('Alia editio habet, etc., usque ad quia ibi.');
	});

	it('leaves text whole when no terminator is present at all', () => {
		const text = 'Affectus boni animi semper proclivis est ad pietatem';
		const r = extractLemma(text, v8);
		expect(r.lemma).toBeUndefined();
		expect(r.body).toBe(text);
	});

	it('leaves text whole against a Canticle rubric slot', () => {
		const r = extractLemma('Osculetur me. Id est incarnetur.', 'Sponsa');
		expect(r.lemma).toBeUndefined();
	});

	it('rejects a candidate of two characters or fewer', () => {
		const r = extractLemma('In. Aliquid de hoc.', 'In principio creavit Deus.');
		expect(r.lemma).toBeUndefined();
	});

	it('matches across diacritics and Vulgate punctuation spacing', () => {
		const verse = 'Terra autem erat inanis et vacua, et tenebræ erant super faciem abyssi.';
		const r = extractLemma('Tenebræ erant. Id est privatio lucis.', verse);
		expect(r.lemma).toBe('Tenebræ erant.');
		expect(r.body).toBe('Id est privatio lucis.');
	});
});

describe('GLOSSA_BOOK_MAP', () => {
	it('covers all 73 source directories', () => {
		expect(Object.keys(GLOSSA_BOOK_MAP)).toHaveLength(73);
	});

	it('maps every slug to a distinct book', () => {
		const slugs = Object.values(GLOSSA_BOOK_MAP);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it('handles the Samuel/Kings and Esdras renumbering', () => {
		expect(GLOSSA_BOOK_MAP['09_1_samuel']).toBe('1-kings');
		expect(GLOSSA_BOOK_MAP['11_1_rois']).toBe('3-kings');
		expect(GLOSSA_BOOK_MAP['16_nehemie']).toBe('2-esdras');
		expect(GLOSSA_BOOK_MAP['28_siracide']).toBe('ecclesiasticus');
	});

	it('keeps the diacritic in the Joel directory key', () => {
		expect(GLOSSA_BOOK_MAP['36_joël']).toBe('joel');
	});
});

describe('GLOSSA_AUTHORS', () => {
	it('has 20 sigla', () => {
		expect(Object.keys(GLOSSA_AUTHORS)).toHaveLength(20);
	});
});
