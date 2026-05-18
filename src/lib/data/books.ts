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
		latinTitle: 'Liber Genesis, Hebraice Beresith',
		testament: 'OT',
		chapters: 50,
		hasConfraternity: false
	},
	{
		slug: 'exodus',
		odrName: 'Exodus',
		modernName: 'Exodus',
		latinName: 'Exodus',
		latinTitle: 'Liber Exodus, Hebraice Veelle Semoth',
		testament: 'OT',
		chapters: 40,
		hasConfraternity: false
	},
	{
		slug: 'leviticus',
		odrName: 'Leviticus',
		modernName: 'Leviticus',
		latinName: 'Leviticus',
		latinTitle: 'Liber Leviticus, Hebraice Vaicra',
		testament: 'OT',
		chapters: 27,
		hasConfraternity: false
	},
	{
		slug: 'numbers',
		odrName: 'Numbers',
		modernName: 'Numbers',
		latinName: 'Numeri',
		latinTitle: 'Liber Numeri, Hebraice Vaiedabber',
		testament: 'OT',
		chapters: 36,
		hasConfraternity: false
	},
	{
		slug: 'deuteronomy',
		odrName: 'Deuteronomy',
		modernName: 'Deuteronomy',
		latinName: 'Deuteronomii',
		latinTitle: 'Liber Deuteronomii',
		testament: 'OT',
		chapters: 34,
		hasConfraternity: false
	},
	// HISTORICAL
	{
		slug: 'josue',
		odrName: 'Josue',
		modernName: 'Joshua',
		latinName: 'Iosue',
		latinTitle: 'Liber Iosue',
		testament: 'OT',
		chapters: 24,
		hasConfraternity: false
	},
	{
		slug: 'judges',
		odrName: 'Judges',
		modernName: 'Judges',
		latinName: 'Iudicum',
		latinTitle: 'Liber Iudicum',
		testament: 'OT',
		chapters: 21,
		hasConfraternity: false
	},
	{
		slug: 'ruth',
		odrName: 'Ruth',
		modernName: 'Ruth',
		latinName: 'Ruth',
		latinTitle: 'Liber Ruth',
		testament: 'OT',
		chapters: 4,
		hasConfraternity: false
	},
	{
		slug: '1-kings',
		odrName: '1 Kings',
		modernName: '1 Samuel',
		latinName: 'I Samuelis',
		latinTitle: 'Liber I Samuelis',
		testament: 'OT',
		chapters: 31,
		hasConfraternity: false
	},
	{
		slug: '2-kings',
		odrName: '2 Kings',
		modernName: '2 Samuel',
		latinName: 'II Samuelis',
		latinTitle: 'Liber II Samuelis',
		testament: 'OT',
		chapters: 24,
		hasConfraternity: false
	},
	{
		slug: '3-kings',
		odrName: '3 Kings',
		modernName: '1 Kings',
		latinName: 'I Regum',
		latinTitle: 'Liber I Regum',
		testament: 'OT',
		chapters: 22,
		hasConfraternity: false
	},
	{
		slug: '4-kings',
		odrName: '4 Kings',
		modernName: '2 Kings',
		latinName: 'II Regum',
		latinTitle: 'Liber II Regum',
		testament: 'OT',
		chapters: 25,
		hasConfraternity: false
	},
	{
		slug: '1-paralipomenon',
		odrName: '1 Paralipomenon',
		modernName: '1 Chronicles',
		latinName: 'I Paralipomenon',
		latinTitle: 'Liber I Paralipomenon',
		testament: 'OT',
		chapters: 29,
		hasConfraternity: false
	},
	{
		slug: '2-paralipomenon',
		odrName: '2 Paralipomenon',
		modernName: '2 Chronicles',
		latinName: 'II Paralipomenon',
		latinTitle: 'Liber II Paralipomenon',
		testament: 'OT',
		chapters: 36,
		hasConfraternity: false
	},
	{
		slug: '1-esdras',
		odrName: '1 Esdras',
		modernName: 'Ezra',
		latinName: 'Esdræ',
		latinTitle: 'Liber Esdræ',
		testament: 'OT',
		chapters: 10,
		hasConfraternity: false
	},
	{
		slug: '2-esdras',
		odrName: '2 Esdras',
		modernName: 'Nehemiah',
		latinName: 'Nehemiæ',
		latinTitle: 'Liber Nehemiæ',
		testament: 'OT',
		chapters: 13,
		hasConfraternity: false
	},
	{
		slug: 'tobias',
		odrName: 'Tobias',
		modernName: 'Tobit',
		latinName: 'Thobis',
		latinTitle: 'Liber Thobis',
		testament: 'OT',
		chapters: 14,
		hasConfraternity: false
	},
	{
		slug: 'judith',
		odrName: 'Judith',
		modernName: 'Judith',
		latinName: 'Iudith',
		latinTitle: 'Liber Iudith',
		testament: 'OT',
		chapters: 16,
		hasConfraternity: false
	},
	{
		slug: 'esther',
		odrName: 'Esther',
		modernName: 'Esther',
		latinName: 'Esther',
		latinTitle: 'Liber Esther',
		testament: 'OT',
		chapters: 16,
		hasConfraternity: false
	},
	{
		slug: '1-machabees',
		odrName: '1 Machabees',
		modernName: '1 Maccabees',
		latinName: 'I Maccabæorum',
		latinTitle: 'Liber I Maccabæorum',
		testament: 'OT',
		chapters: 16,
		hasConfraternity: false
	},
	{
		slug: '2-machabees',
		odrName: '2 Machabees',
		modernName: '2 Maccabees',
		latinName: 'II Maccabæorum',
		latinTitle: 'Liber II Maccabæorum',
		testament: 'OT',
		chapters: 15,
		hasConfraternity: false
	},
	// WISDOM
	{
		slug: 'job',
		odrName: 'Job',
		modernName: 'Job',
		latinName: 'Iob',
		latinTitle: 'Liber Iob',
		testament: 'OT',
		chapters: 42,
		hasConfraternity: false
	},
	{
		slug: 'psalms',
		odrName: 'Psalms',
		modernName: 'Psalms',
		latinName: 'Psalmorum',
		latinTitle: 'Liber Psalmorum',
		testament: 'OT',
		chapters: 150,
		hasConfraternity: false
	},
	{
		slug: 'proverbs',
		odrName: 'Proverbs',
		modernName: 'Proverbs',
		latinName: 'Proverbiorum',
		latinTitle: 'Liber Proverbiorum',
		testament: 'OT',
		chapters: 31,
		hasConfraternity: false
	},
	{
		slug: 'ecclesiastes',
		odrName: 'Ecclesiastes',
		modernName: 'Ecclesiastes',
		latinName: 'Ecclesiastes',
		latinTitle: 'Liber Ecclesiastes',
		testament: 'OT',
		chapters: 12,
		hasConfraternity: false
	},
	{
		slug: 'canticle-of-canticles',
		odrName: 'Canticle of Canticles',
		modernName: 'Song of Solomon',
		latinName: 'Canticum Canticorum',
		latinTitle: 'Canticum Canticorum',
		testament: 'OT',
		chapters: 8,
		hasConfraternity: false
	},
	{
		slug: 'wisdom',
		odrName: 'Wisdom',
		modernName: 'Wisdom',
		latinName: 'Sapientiæ',
		latinTitle: 'Liber Sapientiæ',
		testament: 'OT',
		chapters: 19,
		hasConfraternity: false
	},
	{
		slug: 'ecclesiasticus',
		odrName: 'Ecclesiasticus',
		modernName: 'Sirach',
		latinName: 'Ecclesiasticus',
		latinTitle: 'Liber Ecclesiasticus',
		testament: 'OT',
		chapters: 51,
		hasConfraternity: false
	},
	// PROPHETS
	{
		slug: 'isaie',
		odrName: 'Isaie',
		modernName: 'Isaiah',
		latinName: 'Isaiæ',
		latinTitle: 'Liber Isaiæ',
		testament: 'OT',
		chapters: 66,
		hasConfraternity: false
	},
	{
		slug: 'jeremie',
		odrName: 'Jeremy',
		modernName: 'Jeremiah',
		latinName: 'Ieremiæ',
		latinTitle: 'Liber Ieremiæ',
		testament: 'OT',
		chapters: 52,
		hasConfraternity: false
	},
	{
		slug: 'lamentations',
		odrName: 'Lamentations',
		modernName: 'Lamentations',
		latinName: 'Lamentationes',
		latinTitle: 'Lamentationes',
		testament: 'OT',
		chapters: 5,
		hasConfraternity: false
	},
	{
		slug: 'baruch',
		odrName: 'Baruch',
		modernName: 'Baruch',
		latinName: 'Baruch',
		latinTitle: 'Liber Baruch',
		testament: 'OT',
		chapters: 6,
		hasConfraternity: false
	},
	{
		slug: 'ezechiel',
		odrName: 'Ezechiel',
		modernName: 'Ezekiel',
		latinName: 'Ezechielis',
		latinTitle: 'Prophetia Ezechielis',
		testament: 'OT',
		chapters: 48,
		hasConfraternity: false
	},
	{
		slug: 'daniel',
		odrName: 'Daniel',
		modernName: 'Daniel',
		latinName: 'Danielis',
		latinTitle: 'Prophetia Danielis',
		testament: 'OT',
		chapters: 14,
		hasConfraternity: false
	},
	{
		slug: 'osee',
		odrName: 'Osee',
		modernName: 'Hosea',
		latinName: 'Osee',
		latinTitle: 'Prophetia Osee',
		testament: 'OT',
		chapters: 14,
		hasConfraternity: false
	},
	{
		slug: 'joel',
		odrName: 'Joel',
		modernName: 'Joel',
		latinName: 'Ioel',
		latinTitle: 'Prophetia Ioel',
		testament: 'OT',
		chapters: 3,
		hasConfraternity: false
	},
	{
		slug: 'amos',
		odrName: 'Amos',
		modernName: 'Amos',
		latinName: 'Amos',
		latinTitle: 'Prophetia Amos',
		testament: 'OT',
		chapters: 9,
		hasConfraternity: false
	},
	{
		slug: 'abdias',
		odrName: 'Abdias',
		modernName: 'Obadiah',
		latinName: 'Abdiæ',
		latinTitle: 'Prophetia Abdiæ',
		testament: 'OT',
		chapters: 1,
		hasConfraternity: false
	},
	{
		slug: 'jonas',
		odrName: 'Jonas',
		modernName: 'Jonah',
		latinName: 'Ionæ',
		latinTitle: 'Prophetia Ionæ',
		testament: 'OT',
		chapters: 4,
		hasConfraternity: false
	},
	{
		slug: 'micheas',
		odrName: 'Micheas',
		modernName: 'Micah',
		latinName: 'Michææ',
		latinTitle: 'Prophetia Michææ',
		testament: 'OT',
		chapters: 7,
		hasConfraternity: false
	},
	{
		slug: 'nahum',
		odrName: 'Nahum',
		modernName: 'Nahum',
		latinName: 'Nahum',
		latinTitle: 'Prophetia Nahum',
		testament: 'OT',
		chapters: 3,
		hasConfraternity: false
	},
	{
		slug: 'habacuc',
		odrName: 'Habacuc',
		modernName: 'Habakkuk',
		latinName: 'Habacuc',
		latinTitle: 'Prophetia Habacuc',
		testament: 'OT',
		chapters: 3,
		hasConfraternity: false
	},
	{
		slug: 'sophonias',
		odrName: 'Sophonias',
		modernName: 'Zephaniah',
		latinName: 'Sophoniæ',
		latinTitle: 'Prophetia Sophoniæ',
		testament: 'OT',
		chapters: 3,
		hasConfraternity: false
	},
	{
		slug: 'aggeus',
		odrName: 'Aggeus',
		modernName: 'Haggai',
		latinName: 'Aggæi',
		latinTitle: 'Prophetia Aggæi',
		testament: 'OT',
		chapters: 2,
		hasConfraternity: false
	},
	{
		slug: 'zacharias',
		odrName: 'Zacharias',
		modernName: 'Zechariah',
		latinName: 'Zachariæ',
		latinTitle: 'Prophetia Zachariæ',
		testament: 'OT',
		chapters: 14,
		hasConfraternity: false
	},
	{
		slug: 'malachie',
		odrName: 'Malachie',
		modernName: 'Malachi',
		latinName: 'Malachiæ',
		latinTitle: 'Prophetia Malachiæ',
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
		latinName: 'Matthæum',
		latinTitle: 'Evangelium secundum Matthæum',
		testament: 'NT',
		chapters: 28,
		hasConfraternity: true
	},
	{
		slug: 'mark',
		odrName: 'Mark',
		modernName: 'Mark',
		latinName: 'Marcum',
		latinTitle: 'Evangelium secundum Marcum',
		testament: 'NT',
		chapters: 16,
		hasConfraternity: true
	},
	{
		slug: 'luke',
		odrName: 'Luke',
		modernName: 'Luke',
		latinName: 'Lucam',
		latinTitle: 'Evangelium secundum Lucam',
		testament: 'NT',
		chapters: 24,
		hasConfraternity: true
	},
	{
		slug: 'john',
		odrName: 'John',
		modernName: 'John',
		latinName: 'Ioannem',
		latinTitle: 'Evangelium secundum Ioannem',
		testament: 'NT',
		chapters: 21,
		hasConfraternity: true
	},
	{
		slug: 'acts',
		odrName: 'Acts',
		modernName: 'Acts',
		latinName: 'Actus Apostolorum',
		latinTitle: 'Actus Apostolorum',
		testament: 'NT',
		chapters: 28,
		hasConfraternity: true
	},
	{
		slug: 'romans',
		odrName: 'Romans',
		modernName: 'Romans',
		latinName: 'ad Romanos',
		latinTitle: 'Epistula ad Romanos',
		testament: 'NT',
		chapters: 16,
		hasConfraternity: true
	},
	{
		slug: '1-corinthians',
		odrName: '1 Corinthians',
		modernName: '1 Corinthians',
		latinName: 'I ad Corinthios',
		latinTitle: 'Epistula I ad Corinthios',
		testament: 'NT',
		chapters: 16,
		hasConfraternity: true
	},
	{
		slug: '2-corinthians',
		odrName: '2 Corinthians',
		modernName: '2 Corinthians',
		latinName: 'II ad Corinthios',
		latinTitle: 'Epistula II ad Corinthios',
		testament: 'NT',
		chapters: 13,
		hasConfraternity: true
	},
	{
		slug: 'galatians',
		odrName: 'Galatians',
		modernName: 'Galatians',
		latinName: 'ad Galatas',
		latinTitle: 'Epistula ad Galatas',
		testament: 'NT',
		chapters: 6,
		hasConfraternity: true
	},
	{
		slug: 'ephesians',
		odrName: 'Ephesians',
		modernName: 'Ephesians',
		latinName: 'ad Ephesios',
		latinTitle: 'Epistula ad Ephesios',
		testament: 'NT',
		chapters: 6,
		hasConfraternity: true
	},
	{
		slug: 'philippians',
		odrName: 'Philippians',
		modernName: 'Philippians',
		latinName: 'ad Philippenses',
		latinTitle: 'Epistula ad Philippenses',
		testament: 'NT',
		chapters: 4,
		hasConfraternity: true
	},
	{
		slug: 'colossians',
		odrName: 'Colossians',
		modernName: 'Colossians',
		latinName: 'ad Colossenses',
		latinTitle: 'Epistula ad Colossenses',
		testament: 'NT',
		chapters: 4,
		hasConfraternity: true
	},
	{
		slug: '1-thessalonians',
		odrName: '1 Thessalonians',
		modernName: '1 Thessalonians',
		latinName: 'I ad Thessalonicenses',
		latinTitle: 'Epistula I ad Thessalonicenses',
		testament: 'NT',
		chapters: 5,
		hasConfraternity: true
	},
	{
		slug: '2-thessalonians',
		odrName: '2 Thessalonians',
		modernName: '2 Thessalonians',
		latinName: 'II ad Thessalonicenses',
		latinTitle: 'Epistula II ad Thessalonicenses',
		testament: 'NT',
		chapters: 3,
		hasConfraternity: true
	},
	{
		slug: '1-timothy',
		odrName: '1 Timothy',
		modernName: '1 Timothy',
		latinName: 'I ad Timotheum',
		latinTitle: 'Epistula I ad Timotheum',
		testament: 'NT',
		chapters: 6,
		hasConfraternity: true
	},
	{
		slug: '2-timothy',
		odrName: '2 Timothy',
		modernName: '2 Timothy',
		latinName: 'II ad Timotheum',
		latinTitle: 'Epistula II ad Timotheum',
		testament: 'NT',
		chapters: 4,
		hasConfraternity: true
	},
	{
		slug: 'titus',
		odrName: 'Titus',
		modernName: 'Titus',
		latinName: 'ad Titum',
		latinTitle: 'Epistula ad Titum',
		testament: 'NT',
		chapters: 3,
		hasConfraternity: true
	},
	{
		slug: 'philemon',
		odrName: 'Philemon',
		modernName: 'Philemon',
		latinName: 'ad Philemonem',
		latinTitle: 'Epistula ad Philemonem',
		testament: 'NT',
		chapters: 1,
		hasConfraternity: true
	},
	{
		slug: 'hebrews',
		odrName: 'Hebrews',
		modernName: 'Hebrews',
		latinName: 'ad Hebræos',
		latinTitle: 'Epistula ad Hebræos',
		testament: 'NT',
		chapters: 13,
		hasConfraternity: true
	},
	{
		slug: 'james',
		odrName: 'James',
		modernName: 'James',
		latinName: 'Iacobi',
		latinTitle: 'Epistula Iacobi',
		testament: 'NT',
		chapters: 5,
		hasConfraternity: true
	},
	{
		slug: '1-peter',
		odrName: '1 Peter',
		modernName: '1 Peter',
		latinName: 'I Petri',
		latinTitle: 'Epistula I Petri',
		testament: 'NT',
		chapters: 5,
		hasConfraternity: true
	},
	{
		slug: '2-peter',
		odrName: '2 Peter',
		modernName: '2 Peter',
		latinName: 'II Petri',
		latinTitle: 'Epistula II Petri',
		testament: 'NT',
		chapters: 3,
		hasConfraternity: true
	},
	{
		slug: '1-john',
		odrName: '1 John',
		modernName: '1 John',
		latinName: 'I Ioannis',
		latinTitle: 'Epistula I Ioannis',
		testament: 'NT',
		chapters: 5,
		hasConfraternity: true
	},
	{
		slug: '2-john',
		odrName: '2 John',
		modernName: '2 John',
		latinName: 'II Ioannis',
		latinTitle: 'Epistula II Ioannis',
		testament: 'NT',
		chapters: 1,
		hasConfraternity: true
	},
	{
		slug: '3-john',
		odrName: '3 John',
		modernName: '3 John',
		latinName: 'III Ioannis',
		latinTitle: 'Epistula III Ioannis',
		testament: 'NT',
		chapters: 1,
		hasConfraternity: true
	},
	{
		slug: 'jude',
		odrName: 'Jude',
		modernName: 'Jude',
		latinName: 'Iudæ',
		latinTitle: 'Epistula Iudæ',
		testament: 'NT',
		chapters: 1,
		hasConfraternity: true
	},
	{
		slug: 'apocalypse',
		odrName: 'Apocalypse',
		modernName: 'Revelation',
		latinName: 'Apocalypsis Ioannis',
		latinTitle: 'Apocalypsis Ioannis',
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
