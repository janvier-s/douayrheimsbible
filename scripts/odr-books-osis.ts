// scripts/odr-books-osis.ts
// OSIS book identifiers for every ODR slug. The 66 books shared with the
// Protestant canon use the OSIS names; the deuterocanon uses the OSIS
// deuterocanonical names where OSIS defines one. Keyed by USFM code so the
// table follows BOOK_CODES (export-lib.ts) and cannot drift from it.

import { bookCode } from './export-lib.js';

const OSIS_BY_USFM: Readonly<Record<string, string>> = {
	GEN: 'Gen',
	EXO: 'Exod',
	LEV: 'Lev',
	NUM: 'Num',
	DEU: 'Deut',
	JOS: 'Josh',
	JDG: 'Judg',
	RUT: 'Ruth',
	'1SA': '1Sam',
	'2SA': '2Sam',
	'1KI': '1Kgs',
	'2KI': '2Kgs',
	'1CH': '1Chr',
	'2CH': '2Chr',
	EZR: 'Ezra',
	NEH: 'Neh',
	TOB: 'Tob',
	JDT: 'Jdt',
	ESG: 'Esth',
	'1MA': '1Macc',
	'2MA': '2Macc',
	JOB: 'Job',
	PSA: 'Ps',
	PRO: 'Prov',
	ECC: 'Eccl',
	SNG: 'Song',
	WIS: 'Wis',
	SIR: 'Sir',
	ISA: 'Isa',
	JER: 'Jer',
	LAM: 'Lam',
	BAR: 'Bar',
	EZK: 'Ezek',
	DAG: 'Dan',
	HOS: 'Hos',
	JOL: 'Joel',
	AMO: 'Amos',
	OBA: 'Obad',
	JON: 'Jonah',
	MIC: 'Mic',
	NAM: 'Nah',
	HAB: 'Hab',
	ZEP: 'Zeph',
	HAG: 'Hag',
	ZEC: 'Zech',
	MAL: 'Mal',
	MAN: 'PrMan',
	'1ES': '1Esd',
	'2ES': '2Esd',
	MAT: 'Matt',
	MRK: 'Mark',
	LUK: 'Luke',
	JHN: 'John',
	ACT: 'Acts',
	ROM: 'Rom',
	'1CO': '1Cor',
	'2CO': '2Cor',
	GAL: 'Gal',
	EPH: 'Eph',
	PHP: 'Phil',
	COL: 'Col',
	'1TH': '1Thess',
	'2TH': '2Thess',
	'1TI': '1Tim',
	'2TI': '2Tim',
	TIT: 'Titus',
	PHM: 'Phlm',
	HEB: 'Heb',
	JAS: 'Jas',
	'1PE': '1Pet',
	'2PE': '2Pet',
	'1JN': '1John',
	'2JN': '2John',
	'3JN': '3John',
	JUD: 'Jude',
	REV: 'Rev'
};

export const OSIS_USFM_CODES = Object.keys(OSIS_BY_USFM);

export function osisId(slug: string): string {
	const { usfm } = bookCode(slug);
	const id = OSIS_BY_USFM[usfm];
	if (!id) throw new Error(`no OSIS id for ${slug} (${usfm})`);
	return id;
}
