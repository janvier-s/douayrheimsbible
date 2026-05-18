import type { BookMeta } from './types';

// Books in canonical ODR order, following textual lineage
// OT: 49 books (46 canonical + 3 appendix: Prayer of Manasses, 3 Esdras, 4 Esdras)
// NT: 27 books — total 76
export const ALL_BOOKS: BookMeta[] = [
	// PENTATEUCH
	{
		slug: 'genesis',
		odrName: 'Genesis',
		modernName: 'Genesis',
		latinName: 'Genesis',
		testament: 'OT',
		chapters: 50,
		hasConfraternity: false
	},
	{
		slug: 'exodus',
		odrName: 'Exodus',
		modernName: 'Exodus',
		latinName: 'Exodus',
		testament: 'OT',
		chapters: 40,
		hasConfraternity: false
	},
	{
		slug: 'leviticus',
		odrName: 'Leviticus',
		modernName: 'Leviticus',
		latinName: 'Leviticus',
		testament: 'OT',
		chapters: 27,
		hasConfraternity: false
	},
	{
		slug: 'numbers',
		odrName: 'Numbers',
		modernName: 'Numbers',
		latinName: 'Numeri',
		testament: 'OT',
		chapters: 36,
		hasConfraternity: false
	},
	{
		slug: 'deuteronomy',
		odrName: 'Deuteronomy',
		modernName: 'Deuteronomy',
		latinName: 'Deuteronomium',
		testament: 'OT',
		chapters: 34,
		hasConfraternity: false
	},
	// HISTORICAL
	{
		slug: 'josue',
		odrName: 'Josue',
		modernName: 'Joshua',
		latinName: 'Josue',
		testament: 'OT',
		chapters: 24,
		hasConfraternity: false
	},
	{
		slug: 'judges',
		odrName: 'Judges',
		modernName: 'Judges',
		latinName: 'Judicum',
		testament: 'OT',
		chapters: 21,
		hasConfraternity: false
	},
	{
		slug: 'ruth',
		odrName: 'Ruth',
		modernName: 'Ruth',
		latinName: 'Ruth',
		testament: 'OT',
		chapters: 4,
		hasConfraternity: false
	},
	{
		slug: '1-kings',
		odrName: '1 Kings',
		modernName: '1 Samuel',
		latinName: 'Regum I',
		testament: 'OT',
		chapters: 31,
		hasConfraternity: false
	},
	{
		slug: '2-kings',
		odrName: '2 Kings',
		modernName: '2 Samuel',
		latinName: 'Regum II',
		testament: 'OT',
		chapters: 24,
		hasConfraternity: false
	},
	{
		slug: '3-kings',
		odrName: '3 Kings',
		modernName: '1 Kings',
		latinName: 'Regum III',
		testament: 'OT',
		chapters: 22,
		hasConfraternity: false
	},
	{
		slug: '4-kings',
		odrName: '4 Kings',
		modernName: '2 Kings',
		latinName: 'Regum IV',
		testament: 'OT',
		chapters: 25,
		hasConfraternity: false
	},
	{
		slug: '1-paralipomenon',
		odrName: '1 Paralipomenon',
		modernName: '1 Chronicles',
		latinName: 'Paralipomenon I',
		testament: 'OT',
		chapters: 29,
		hasConfraternity: false
	},
	{
		slug: '2-paralipomenon',
		odrName: '2 Paralipomenon',
		modernName: '2 Chronicles',
		latinName: 'Paralipomenon II',
		testament: 'OT',
		chapters: 36,
		hasConfraternity: false
	},
	{
		slug: '1-esdras',
		odrName: '1 Esdras',
		modernName: 'Ezra',
		latinName: 'Esdrae',
		testament: 'OT',
		chapters: 10,
		hasConfraternity: false
	},
	{
		slug: '2-esdras',
		odrName: '2 Esdras',
		modernName: 'Nehemiah',
		latinName: 'Nehemiae',
		testament: 'OT',
		chapters: 13,
		hasConfraternity: false
	},
	{
		slug: 'tobias',
		odrName: 'Tobias',
		modernName: 'Tobit',
		latinName: 'Tobiae',
		testament: 'OT',
		chapters: 14,
		hasConfraternity: false
	},
	{
		slug: 'judith',
		odrName: 'Judith',
		modernName: 'Judith',
		latinName: 'Judith',
		testament: 'OT',
		chapters: 16,
		hasConfraternity: false
	},
	{
		slug: 'esther',
		odrName: 'Esther',
		modernName: 'Esther',
		latinName: 'Esther',
		testament: 'OT',
		chapters: 16,
		hasConfraternity: false
	},
	{
		slug: '1-machabees',
		odrName: '1 Machabees',
		modernName: '1 Maccabees',
		latinName: 'Machabaeorum I',
		testament: 'OT',
		chapters: 16,
		hasConfraternity: false
	},
	{
		slug: '2-machabees',
		odrName: '2 Machabees',
		modernName: '2 Maccabees',
		latinName: 'Machabaeorum II',
		testament: 'OT',
		chapters: 15,
		hasConfraternity: false
	},
	// WISDOM
	{
		slug: 'job',
		odrName: 'Job',
		modernName: 'Job',
		latinName: 'Job',
		testament: 'OT',
		chapters: 42,
		hasConfraternity: false
	},
	{
		slug: 'psalms',
		odrName: 'Psalms',
		modernName: 'Psalms',
		latinName: 'Psalmi',
		testament: 'OT',
		chapters: 150,
		hasConfraternity: false
	},
	{
		slug: 'proverbs',
		odrName: 'Proverbs',
		modernName: 'Proverbs',
		latinName: 'Proverbia',
		testament: 'OT',
		chapters: 31,
		hasConfraternity: false
	},
	{
		slug: 'ecclesiastes',
		odrName: 'Ecclesiastes',
		modernName: 'Ecclesiastes',
		latinName: 'Ecclesiastes',
		testament: 'OT',
		chapters: 12,
		hasConfraternity: false
	},
	{
		slug: 'canticle-of-canticles',
		odrName: 'Canticle of Canticles',
		modernName: 'Song of Solomon',
		latinName: 'Canticum Canticorum',
		testament: 'OT',
		chapters: 8,
		hasConfraternity: false
	},
	{
		slug: 'wisdom',
		odrName: 'Wisdom',
		modernName: 'Wisdom',
		latinName: 'Sapientia',
		testament: 'OT',
		chapters: 19,
		hasConfraternity: false
	},
	{
		slug: 'ecclesiasticus',
		odrName: 'Ecclesiasticus',
		modernName: 'Sirach',
		latinName: 'Ecclesiasticus',
		testament: 'OT',
		chapters: 51,
		hasConfraternity: false
	},
	// PROPHETS
	{
		slug: 'isaie',
		odrName: 'Isaie',
		modernName: 'Isaiah',
		latinName: 'Isaias',
		testament: 'OT',
		chapters: 66,
		hasConfraternity: false
	},
	{
		slug: 'jeremie',
		odrName: 'Jeremy',
		modernName: 'Jeremiah',
		latinName: 'Jeremias',
		testament: 'OT',
		chapters: 52,
		hasConfraternity: false
	},
	{
		slug: 'lamentations',
		odrName: 'Lamentations',
		modernName: 'Lamentations',
		latinName: 'Lamentationes',
		testament: 'OT',
		chapters: 5,
		hasConfraternity: false
	},
	{
		slug: 'baruch',
		odrName: 'Baruch',
		modernName: 'Baruch',
		latinName: 'Baruch',
		testament: 'OT',
		chapters: 6,
		hasConfraternity: false
	},
	{
		slug: 'ezechiel',
		odrName: 'Ezechiel',
		modernName: 'Ezekiel',
		latinName: 'Ezechiel',
		testament: 'OT',
		chapters: 48,
		hasConfraternity: false
	},
	{
		slug: 'daniel',
		odrName: 'Daniel',
		modernName: 'Daniel',
		latinName: 'Daniel',
		testament: 'OT',
		chapters: 14,
		hasConfraternity: false
	},
	{
		slug: 'osee',
		odrName: 'Osee',
		modernName: 'Hosea',
		latinName: 'Osee',
		testament: 'OT',
		chapters: 14,
		hasConfraternity: false
	},
	{
		slug: 'joel',
		odrName: 'Joel',
		modernName: 'Joel',
		latinName: 'Joel',
		testament: 'OT',
		chapters: 3,
		hasConfraternity: false
	},
	{
		slug: 'amos',
		odrName: 'Amos',
		modernName: 'Amos',
		latinName: 'Amos',
		testament: 'OT',
		chapters: 9,
		hasConfraternity: false
	},
	{
		slug: 'abdias',
		odrName: 'Abdias',
		modernName: 'Obadiah',
		latinName: 'Abdias',
		testament: 'OT',
		chapters: 1,
		hasConfraternity: false
	},
	{
		slug: 'jonas',
		odrName: 'Jonas',
		modernName: 'Jonah',
		latinName: 'Jonas',
		testament: 'OT',
		chapters: 4,
		hasConfraternity: false
	},
	{
		slug: 'micheas',
		odrName: 'Micheas',
		modernName: 'Micah',
		latinName: 'Michaeas',
		testament: 'OT',
		chapters: 7,
		hasConfraternity: false
	},
	{
		slug: 'nahum',
		odrName: 'Nahum',
		modernName: 'Nahum',
		latinName: 'Nahum',
		testament: 'OT',
		chapters: 3,
		hasConfraternity: false
	},
	{
		slug: 'habacuc',
		odrName: 'Habacuc',
		modernName: 'Habakkuk',
		latinName: 'Habacuc',
		testament: 'OT',
		chapters: 3,
		hasConfraternity: false
	},
	{
		slug: 'sophonias',
		odrName: 'Sophonias',
		modernName: 'Zephaniah',
		latinName: 'Sophonias',
		testament: 'OT',
		chapters: 3,
		hasConfraternity: false
	},
	{
		slug: 'aggeus',
		odrName: 'Aggeus',
		modernName: 'Haggai',
		latinName: 'Aggaeus',
		testament: 'OT',
		chapters: 2,
		hasConfraternity: false
	},
	{
		slug: 'zacharias',
		odrName: 'Zacharias',
		modernName: 'Zechariah',
		latinName: 'Zacharias',
		testament: 'OT',
		chapters: 14,
		hasConfraternity: false
	},
	{
		slug: 'malachie',
		odrName: 'Malachie',
		modernName: 'Malachi',
		latinName: 'Malachias',
		testament: 'OT',
		chapters: 4,
		hasConfraternity: false
	},
	// OT APPENDIX (ODR-only — not in standard 73-book Catholic canon)
	// navSkip: excluded from sequential prev/next book navigation
	{
		slug: 'prayer-of-manasses',
		odrName: 'Prayer of Manasses',
		modernName: 'Prayer of Manasseh',
		testament: 'OT',
		chapters: 1,
		hasConfraternity: false,
		navSkip: true
	},
	{
		slug: '3-esdras',
		odrName: '3 Esdras',
		modernName: '3 Esdras',
		testament: 'OT',
		chapters: 9,
		hasConfraternity: false,
		navSkip: true
	},
	{
		slug: '4-esdras',
		odrName: '4 Esdras',
		modernName: '4 Esdras',
		testament: 'OT',
		chapters: 16,
		hasConfraternity: false,
		navSkip: true
	},
	// NEW TESTAMENT
	{
		slug: 'matthew',
		odrName: 'Matthew',
		modernName: 'Matthew',
		latinName: 'Matthaeus',
		testament: 'NT',
		chapters: 28,
		hasConfraternity: true
	},
	{
		slug: 'mark',
		odrName: 'Mark',
		modernName: 'Mark',
		latinName: 'Marcus',
		testament: 'NT',
		chapters: 16,
		hasConfraternity: true
	},
	{
		slug: 'luke',
		odrName: 'Luke',
		modernName: 'Luke',
		latinName: 'Lucas',
		testament: 'NT',
		chapters: 24,
		hasConfraternity: true
	},
	{
		slug: 'john',
		odrName: 'John',
		modernName: 'John',
		latinName: 'Joannes',
		testament: 'NT',
		chapters: 21,
		hasConfraternity: true
	},
	{
		slug: 'acts',
		odrName: 'Acts',
		modernName: 'Acts',
		latinName: 'Actus Apostolorum',
		testament: 'NT',
		chapters: 28,
		hasConfraternity: true
	},
	{
		slug: 'romans',
		odrName: 'Romans',
		modernName: 'Romans',
		latinName: 'ad Romanos',
		testament: 'NT',
		chapters: 16,
		hasConfraternity: true
	},
	{
		slug: '1-corinthians',
		odrName: '1 Corinthians',
		modernName: '1 Corinthians',
		latinName: 'ad Corinthios I',
		testament: 'NT',
		chapters: 16,
		hasConfraternity: true
	},
	{
		slug: '2-corinthians',
		odrName: '2 Corinthians',
		modernName: '2 Corinthians',
		latinName: 'ad Corinthios II',
		testament: 'NT',
		chapters: 13,
		hasConfraternity: true
	},
	{
		slug: 'galatians',
		odrName: 'Galatians',
		modernName: 'Galatians',
		latinName: 'ad Galatas',
		testament: 'NT',
		chapters: 6,
		hasConfraternity: true
	},
	{
		slug: 'ephesians',
		odrName: 'Ephesians',
		modernName: 'Ephesians',
		latinName: 'ad Ephesios',
		testament: 'NT',
		chapters: 6,
		hasConfraternity: true
	},
	{
		slug: 'philippians',
		odrName: 'Philippians',
		modernName: 'Philippians',
		latinName: 'ad Philippenses',
		testament: 'NT',
		chapters: 4,
		hasConfraternity: true
	},
	{
		slug: 'colossians',
		odrName: 'Colossians',
		modernName: 'Colossians',
		latinName: 'ad Colossenses',
		testament: 'NT',
		chapters: 4,
		hasConfraternity: true
	},
	{
		slug: '1-thessalonians',
		odrName: '1 Thessalonians',
		modernName: '1 Thessalonians',
		latinName: 'ad Thessalonicenses I',
		testament: 'NT',
		chapters: 5,
		hasConfraternity: true
	},
	{
		slug: '2-thessalonians',
		odrName: '2 Thessalonians',
		modernName: '2 Thessalonians',
		latinName: 'ad Thessalonicenses II',
		testament: 'NT',
		chapters: 3,
		hasConfraternity: true
	},
	{
		slug: '1-timothy',
		odrName: '1 Timothy',
		modernName: '1 Timothy',
		latinName: 'ad Timotheum I',
		testament: 'NT',
		chapters: 6,
		hasConfraternity: true
	},
	{
		slug: '2-timothy',
		odrName: '2 Timothy',
		modernName: '2 Timothy',
		latinName: 'ad Timotheum II',
		testament: 'NT',
		chapters: 4,
		hasConfraternity: true
	},
	{
		slug: 'titus',
		odrName: 'Titus',
		modernName: 'Titus',
		latinName: 'ad Titum',
		testament: 'NT',
		chapters: 3,
		hasConfraternity: true
	},
	{
		slug: 'philemon',
		odrName: 'Philemon',
		modernName: 'Philemon',
		latinName: 'ad Philemonem',
		testament: 'NT',
		chapters: 1,
		hasConfraternity: true
	},
	{
		slug: 'hebrews',
		odrName: 'Hebrews',
		modernName: 'Hebrews',
		latinName: 'ad Hebraeos',
		testament: 'NT',
		chapters: 13,
		hasConfraternity: true
	},
	{
		slug: 'james',
		odrName: 'James',
		modernName: 'James',
		latinName: 'Jacobi',
		testament: 'NT',
		chapters: 5,
		hasConfraternity: true
	},
	{
		slug: '1-peter',
		odrName: '1 Peter',
		modernName: '1 Peter',
		latinName: 'Petri I',
		testament: 'NT',
		chapters: 5,
		hasConfraternity: true
	},
	{
		slug: '2-peter',
		odrName: '2 Peter',
		modernName: '2 Peter',
		latinName: 'Petri II',
		testament: 'NT',
		chapters: 3,
		hasConfraternity: true
	},
	{
		slug: '1-john',
		odrName: '1 John',
		modernName: '1 John',
		latinName: 'Joannis I',
		testament: 'NT',
		chapters: 5,
		hasConfraternity: true
	},
	{
		slug: '2-john',
		odrName: '2 John',
		modernName: '2 John',
		latinName: 'Joannis II',
		testament: 'NT',
		chapters: 1,
		hasConfraternity: true
	},
	{
		slug: '3-john',
		odrName: '3 John',
		modernName: '3 John',
		latinName: 'Joannis III',
		testament: 'NT',
		chapters: 1,
		hasConfraternity: true
	},
	{
		slug: 'jude',
		odrName: 'Jude',
		modernName: 'Jude',
		latinName: 'Judae',
		testament: 'NT',
		chapters: 1,
		hasConfraternity: true
	},
	{
		slug: 'apocalypse',
		odrName: 'Apocalypse',
		modernName: 'Revelation',
		latinName: 'Apocalypsis',
		testament: 'NT',
		chapters: 22,
		hasConfraternity: true
	}
];

const _bySlug = new Map(ALL_BOOKS.map((b) => [b.slug, b]));
const _byOdr = new Map(ALL_BOOKS.map((b) => [b.odrName.toLowerCase(), b]));
const _byModern = new Map(
	ALL_BOOKS.flatMap((b) =>
		[
			[b.modernName.toLowerCase(), b],
			// Additional modern aliases
			['song of songs', _bySlug.get('canticle-of-canticles')!],
			['sirach', _bySlug.get('ecclesiasticus')!],
			['tobit', _bySlug.get('tobias')!],
			['obadiah', _bySlug.get('abdias')!],
			['jonah', _bySlug.get('jonas')!],
			['micah', _bySlug.get('micheas')!],
			['zephaniah', _bySlug.get('sophonias')!],
			['haggai', _bySlug.get('aggeus')!],
			['zechariah', _bySlug.get('zacharias')!],
			['malachi', _bySlug.get('malachie')!],
			['hosea', _bySlug.get('osee')!],
			['isaiah', _bySlug.get('isaie')!],
			['jeremiah', _bySlug.get('jeremie')!],
			['ezekiel', _bySlug.get('ezechiel')!],
			['joshua', _bySlug.get('josue')!],
			['revelation', _bySlug.get('apocalypse')!],
			['habakkuk', _bySlug.get('habacuc')!]
		].filter((e): e is [string, BookMeta] => e[1] !== undefined)
	)
);

export function getBookBySlug(slug: string): BookMeta | undefined {
	return _bySlug.get(slug);
}

export function getBookByOdrName(name: string): BookMeta | undefined {
	return _byOdr.get(name.toLowerCase());
}

export function getBookByModernName(name: string): BookMeta | undefined {
	return _byModern.get(name.toLowerCase());
}

/** Returns the previous book in canonical order, or undefined at Genesis */
export function getPrevBook(slug: string): BookMeta | undefined {
	const idx = ALL_BOOKS.findIndex((b) => b.slug === slug);
	return idx > 0 ? ALL_BOOKS[idx - 1] : undefined;
}

/** Returns the next book in canonical order, or undefined at Apocalypse */
export function getNextBook(slug: string): BookMeta | undefined {
	const idx = ALL_BOOKS.findIndex((b) => b.slug === slug);
	return idx >= 0 && idx < ALL_BOOKS.length - 1 ? ALL_BOOKS[idx + 1] : undefined;
}

/** Returns the previous navigable book, skipping navSkip books (e.g. appendix). */
export function getPrevNavBook(slug: string): BookMeta | undefined {
	const idx = ALL_BOOKS.findIndex((b) => b.slug === slug);
	for (let i = idx - 1; i >= 0; i--) {
		if (!ALL_BOOKS[i].navSkip) return ALL_BOOKS[i];
	}
	return undefined;
}

/** Returns the next navigable book, skipping navSkip books (e.g. appendix). */
export function getNextNavBook(slug: string): BookMeta | undefined {
	const idx = ALL_BOOKS.findIndex((b) => b.slug === slug);
	for (let i = idx + 1; i < ALL_BOOKS.length; i++) {
		if (!ALL_BOOKS[i].navSkip) return ALL_BOOKS[i];
	}
	return undefined;
}

/** Maps a Vulgate/Douay psalm number to its Hebrew (Protestant) equivalent, or null if identical. */
export function getHebPsalmNum(n: number): string | null {
	if (n <= 8) return null;
	if (n === 9) return '9\u201310';
	if (n >= 10 && n <= 112) return String(n + 1);
	if (n === 113) return '114\u2013115';
	if (n === 114 || n === 115) return '116';
	if (n >= 116 && n <= 145) return String(n + 1);
	if (n === 146 || n === 147) return '147';
	return null;
}

/** Maps a Hebrew (Protestant) psalm number to its Vulgate/Douay equivalent. */
export function drFromHebPsalmNum(heb: number): number {
	if (heb <= 8) return heb;
	if (heb <= 10) return 9; // Hebrew 9+10 merged into DR 9
	if (heb <= 113) return heb - 1;
	if (heb <= 115) return 113; // Hebrew 114+115 merged into DR 113
	if (heb === 116) return 114; // Hebrew 116 → DR 114
	if (heb <= 146) return heb - 1;
	if (heb === 147) return 146; // Hebrew 147 → DR 146
	return heb; // 148–150 same
}
