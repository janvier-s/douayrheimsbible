// scripts/glossa-lib.ts
// Pure helpers for the Glossa Ordinaria build. No fs, no side effects, so
// tests can import this without kicking off a build (prepare-data.ts runs
// main() at module load, which is why this lives apart from the build script).

/** Source directory name (French) to project book slug. All 73 book dirs. */
export const GLOSSA_BOOK_MAP: Record<string, string> = {
	'01_genese': 'genesis',
	'02_exode': 'exodus',
	'03_levitique': 'leviticus',
	'04_nombres': 'numbers',
	'05_deuteronome': 'deuteronomy',
	'06_josue': 'josue',
	'07_juges': 'judges',
	'08_ruth': 'ruth',
	'09_1_samuel': '1-kings',
	'10_2_samuel': '2-kings',
	'11_1_rois': '3-kings',
	'12_2_rois': '4-kings',
	'13_1_chroniques': '1-paralipomenon',
	'14_2_chroniques': '2-paralipomenon',
	'15_esdras': '1-esdras',
	'16_nehemie': '2-esdras',
	'17_tobie': 'tobias',
	'18_judith': 'judith',
	'19_esther': 'esther',
	'20_1_maccabees': '1-machabees',
	'21_2_maccabees': '2-machabees',
	'22_job': 'job',
	'23_psaumes': 'psalms',
	'24_proverbes': 'proverbs',
	'25_ecclesiaste': 'ecclesiastes',
	'26_cantique_des_cantiques': 'canticle-of-canticles',
	'27_sagesse': 'wisdom',
	'28_siracide': 'ecclesiasticus',
	'29_isaie': 'isaie',
	'30_jeremie': 'jeremie',
	'31_lamentations': 'lamentations',
	'32_baruch': 'baruch',
	'33_ezechiel': 'ezechiel',
	'34_daniel': 'daniel',
	'35_osee': 'osee',
	'36_joël': 'joel',
	'37_amos': 'amos',
	'38_abdias': 'abdias',
	'39_jonas': 'jonas',
	'40_michee': 'micheas',
	'41_nahum': 'nahum',
	'42_habacuc': 'habacuc',
	'43_sophonie': 'sophonias',
	'44_aggee': 'aggeus',
	'45_zacharie': 'zacharias',
	'46_malachie': 'malachie',
	'47_matthieu': 'matthew',
	'48_marc': 'mark',
	'49_luc': 'luke',
	'50_jean': 'john',
	'51_actes': 'acts',
	'52_romains': 'romans',
	'53_1_corinthiens': '1-corinthians',
	'54_2_corinthiens': '2-corinthians',
	'55_galates': 'galatians',
	'56_ephesiens': 'ephesians',
	'57_philippiens': 'philippians',
	'58_colossiens': 'colossians',
	'59_1_thessaloniciens': '1-thessalonians',
	'60_2_thessaloniciens': '2-thessalonians',
	'61_1_timothee': '1-timothy',
	'62_2_timothee': '2-timothy',
	'63_tite': 'titus',
	'64_philemon': 'philemon',
	'65_hebreux': 'hebrews',
	'66_jacques': 'james',
	'67_1_pierre': '1-peter',
	'68_2_pierre': '2-peter',
	'69_1_jean': '1-john',
	'70_2_jean': '2-john',
	'71_3_jean': '3-john',
	'72_jude': 'jude',
	'73_apocalypse': 'apocalypse'
};

/** Author siglum to Latin name. The corpus uses both short and long forms
 *  for the same Father, so several sigla map to one name. */
export const GLOSSA_AUTHORS: Record<string, string> = {
	AUG: 'Augustinus',
	AUGUSTINUS: 'Augustinus',
	BEDA: 'Beda',
	GREG: 'Gregorius',
	GREGORIUS: 'Gregorius',
	ISID: 'Isidorus',
	ISIDORUS: 'Isidorus',
	HIERON: 'Hieronymus',
	HIERONYMUS: 'Hieronymus',
	STRAB: 'Strabus',
	AMBR: 'Ambrosius',
	AMBROSIUS: 'Ambrosius',
	LEO: 'Leo',
	ALCUIN: 'Alcuinus',
	ORIGENES: 'Origenes',
	ANSELM: 'Anselmus',
	CHRYSOSTOMUS: 'Chrysostomus',
	CYPR: 'Cyprianus',
	RABANUS: 'Rabanus',
	CASSIODORUS: 'Cassiodorus'
};

/** Folds Latin orthography so a gloss catchword can be compared against
 *  Vulgate verse text: case, diacritics, æ/œ ligatures, u/v and i/j, and
 *  the Clementine edition's spaced punctuation. */
export function normalizeLatin(s: string): string {
	return s
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/æ/g, 'ae')
		.replace(/œ/g, 'oe')
		.replace(/[^a-z]+/g, ' ')
		.replace(/j/g, 'i')
		.replace(/v/g, 'u')
		.trim();
}

/** Expands a source siglum to its Latin name. Anonymous entries (the bulk of
 *  the corpus) yield undefined; the UI supplies the "Glossa" byline. */
export function expandAuthor(siglum: string | null | undefined): string | undefined {
	if (!siglum) return undefined;
	const name = GLOSSA_AUTHORS[siglum];
	if (!name) throw new Error(`Unknown Glossa author siglum: ${siglum}`);
	return name;
}

/** Each gloss opens with a catchword lifted from the verse. Split it off only
 *  when it can be verified against the verse text, so nothing is ever split on
 *  a guess. Roughly 81.9% of the corpus verifies. */
export function extractLemma(text: string, verseText: string): { lemma?: string; body: string } {
	const trimmed = text.trim();
	const m = /^(.{2,80}?)(,\s*etc\.|\.)(\s|$)/.exec(trimmed);
	if (!m) return { body: trimmed };

	const candidate = normalizeLatin(m[1]);
	if (candidate.length <= 2) return { body: trimmed };
	if (!normalizeLatin(verseText).includes(candidate)) return { body: trimmed };

	return {
		lemma: m[1] + m[2],
		// Some source entries carry a stray second stop after the catchword
		// ("Percusseruntque. . Alia editio…"); drop it from the body.
		body: trimmed.slice(m[0].length).replace(/^[.\s]+/, '')
	};
}
