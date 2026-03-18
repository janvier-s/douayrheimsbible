import type { BookMeta } from './types';

// Books in canonical ODR order, following textual lineage
// OT: 49 books (46 canonical + 3 appendix: Prayer of Manasses, 3 Esdras, 4 Esdras)
// NT: 27 books — total 76
export const ALL_BOOKS: BookMeta[] = [
  // PENTATEUCH
  { slug: 'genesis',      odrName: 'Genesis',       modernName: 'Genesis',       testament: 'OT', chapters: 50, hasConfraternity: false },
  { slug: 'exodus',       odrName: 'Exodus',         modernName: 'Exodus',        testament: 'OT', chapters: 40, hasConfraternity: false },
  { slug: 'leviticus',    odrName: 'Leviticus',      modernName: 'Leviticus',     testament: 'OT', chapters: 27, hasConfraternity: false },
  { slug: 'numbers',      odrName: 'Numbers',        modernName: 'Numbers',       testament: 'OT', chapters: 36, hasConfraternity: false },
  { slug: 'deuteronomy',  odrName: 'Deuteronomy',    modernName: 'Deuteronomy',   testament: 'OT', chapters: 34, hasConfraternity: false },
  // HISTORICAL
  { slug: 'josue',        odrName: 'Josue',          modernName: 'Joshua',        testament: 'OT', chapters: 24, hasConfraternity: false },
  { slug: 'judges',       odrName: 'Judges',         modernName: 'Judges',        testament: 'OT', chapters: 21, hasConfraternity: false },
  { slug: 'ruth',         odrName: 'Ruth',           modernName: 'Ruth',          testament: 'OT', chapters: 4,  hasConfraternity: false },
  { slug: '1-kings',      odrName: '1 Kings',        modernName: '1 Samuel',      testament: 'OT', chapters: 31, hasConfraternity: false },
  { slug: '2-kings',      odrName: '2 Kings',        modernName: '2 Samuel',      testament: 'OT', chapters: 24, hasConfraternity: false },
  { slug: '3-kings',      odrName: '3 Kings',        modernName: '1 Kings',       testament: 'OT', chapters: 22, hasConfraternity: false },
  { slug: '4-kings',      odrName: '4 Kings',        modernName: '2 Kings',       testament: 'OT', chapters: 25, hasConfraternity: false },
  { slug: '1-paralipomenon', odrName: '1 Paralipomenon', modernName: '1 Chronicles', testament: 'OT', chapters: 29, hasConfraternity: false },
  { slug: '2-paralipomenon', odrName: '2 Paralipomenon', modernName: '2 Chronicles', testament: 'OT', chapters: 36, hasConfraternity: false },
  { slug: '1-esdras',     odrName: '1 Esdras',       modernName: 'Ezra',          testament: 'OT', chapters: 10, hasConfraternity: false },
  { slug: '2-esdras',     odrName: '2 Esdras',       modernName: 'Nehemiah',      testament: 'OT', chapters: 13, hasConfraternity: false },
  { slug: 'tobias',       odrName: 'Tobias',         modernName: 'Tobit',         testament: 'OT', chapters: 14, hasConfraternity: false },
  { slug: 'judith',       odrName: 'Judith',         modernName: 'Judith',        testament: 'OT', chapters: 16, hasConfraternity: false },
  { slug: 'esther',       odrName: 'Esther',         modernName: 'Esther',        testament: 'OT', chapters: 16, hasConfraternity: false },
  { slug: '1-machabees',  odrName: '1 Machabees',    modernName: '1 Maccabees',   testament: 'OT', chapters: 16, hasConfraternity: false },
  { slug: '2-machabees',  odrName: '2 Machabees',    modernName: '2 Maccabees',   testament: 'OT', chapters: 15, hasConfraternity: false },
  // WISDOM
  { slug: 'job',          odrName: 'Job',            modernName: 'Job',           testament: 'OT', chapters: 42, hasConfraternity: false },
  { slug: 'psalms',       odrName: 'Psalms',         modernName: 'Psalms',        testament: 'OT', chapters: 150, hasConfraternity: false },
  { slug: 'proverbs',     odrName: 'Proverbs',       modernName: 'Proverbs',      testament: 'OT', chapters: 31, hasConfraternity: false },
  { slug: 'ecclesiastes', odrName: 'Ecclesiastes',   modernName: 'Ecclesiastes',  testament: 'OT', chapters: 12, hasConfraternity: false },
  { slug: 'canticle-of-canticles', odrName: 'Canticle of Canticles', modernName: 'Song of Solomon', testament: 'OT', chapters: 8, hasConfraternity: false },
  { slug: 'wisdom',       odrName: 'Wisdom',         modernName: 'Wisdom',        testament: 'OT', chapters: 19, hasConfraternity: false },
  { slug: 'ecclesiasticus', odrName: 'Ecclesiasticus', modernName: 'Sirach',      testament: 'OT', chapters: 51, hasConfraternity: false },
  // PROPHETS
  { slug: 'isaie',        odrName: 'Isaie',          modernName: 'Isaiah',        testament: 'OT', chapters: 66, hasConfraternity: false },
  { slug: 'jeremie',      odrName: 'Jeremie',        modernName: 'Jeremiah',      testament: 'OT', chapters: 52, hasConfraternity: false },
  { slug: 'lamentations', odrName: 'Lamentations',   modernName: 'Lamentations',  testament: 'OT', chapters: 5,  hasConfraternity: false },
  { slug: 'baruch',       odrName: 'Baruch',         modernName: 'Baruch',        testament: 'OT', chapters: 6,  hasConfraternity: false },
  { slug: 'ezechiel',     odrName: 'Ezechiel',       modernName: 'Ezekiel',       testament: 'OT', chapters: 48, hasConfraternity: false },
  { slug: 'daniel',       odrName: 'Daniel',         modernName: 'Daniel',        testament: 'OT', chapters: 14, hasConfraternity: false },
  { slug: 'osee',         odrName: 'Osee',           modernName: 'Hosea',         testament: 'OT', chapters: 14, hasConfraternity: false },
  { slug: 'joel',         odrName: 'Joel',           modernName: 'Joel',          testament: 'OT', chapters: 3,  hasConfraternity: false },
  { slug: 'amos',         odrName: 'Amos',           modernName: 'Amos',          testament: 'OT', chapters: 9,  hasConfraternity: false },
  { slug: 'abdias',       odrName: 'Abdias',         modernName: 'Obadiah',       testament: 'OT', chapters: 1,  hasConfraternity: false },
  { slug: 'jonas',        odrName: 'Jonas',          modernName: 'Jonah',         testament: 'OT', chapters: 4,  hasConfraternity: false },
  { slug: 'micheas',      odrName: 'Micheas',        modernName: 'Micah',         testament: 'OT', chapters: 7,  hasConfraternity: false },
  { slug: 'nahum',        odrName: 'Nahum',          modernName: 'Nahum',         testament: 'OT', chapters: 3,  hasConfraternity: false },
  { slug: 'habacuc',      odrName: 'Habacuc',        modernName: 'Habakkuk',      testament: 'OT', chapters: 3,  hasConfraternity: false },
  { slug: 'sophonias',    odrName: 'Sophonias',      modernName: 'Zephaniah',     testament: 'OT', chapters: 3,  hasConfraternity: false },
  { slug: 'aggeus',       odrName: 'Aggeus',         modernName: 'Haggai',        testament: 'OT', chapters: 2,  hasConfraternity: false },
  { slug: 'zacharias',    odrName: 'Zacharias',      modernName: 'Zechariah',     testament: 'OT', chapters: 14, hasConfraternity: false },
  { slug: 'malachie',     odrName: 'Malachie',       modernName: 'Malachi',       testament: 'OT', chapters: 4,  hasConfraternity: false },
  // OT APPENDIX (ODR-only — not in standard 73-book Catholic canon)
  { slug: 'prayer-of-manasses', odrName: 'Prayer of Manasses', modernName: 'Prayer of Manasseh', testament: 'OT', chapters: 1, hasConfraternity: false },
  { slug: '3-esdras',     odrName: '3 Esdras',       modernName: '3 Esdras',      testament: 'OT', chapters: 9,  hasConfraternity: false },
  { slug: '4-esdras',     odrName: '4 Esdras',       modernName: '4 Esdras',      testament: 'OT', chapters: 16, hasConfraternity: false },
  // NEW TESTAMENT
  { slug: 'matthew',      odrName: 'Matthew',        modernName: 'Matthew',       testament: 'NT', chapters: 28, hasConfraternity: true },
  { slug: 'mark',         odrName: 'Mark',           modernName: 'Mark',          testament: 'NT', chapters: 16, hasConfraternity: true },
  { slug: 'luke',         odrName: 'Luke',           modernName: 'Luke',          testament: 'NT', chapters: 24, hasConfraternity: true },
  { slug: 'john',         odrName: 'John',           modernName: 'John',          testament: 'NT', chapters: 21, hasConfraternity: true },
  { slug: 'acts',         odrName: 'Acts',           modernName: 'Acts',          testament: 'NT', chapters: 28, hasConfraternity: true },
  { slug: 'romans',       odrName: 'Romans',         modernName: 'Romans',        testament: 'NT', chapters: 16, hasConfraternity: true },
  { slug: '1-corinthians', odrName: '1 Corinthians', modernName: '1 Corinthians', testament: 'NT', chapters: 16, hasConfraternity: true },
  { slug: '2-corinthians', odrName: '2 Corinthians', modernName: '2 Corinthians', testament: 'NT', chapters: 13, hasConfraternity: true },
  { slug: 'galatians',    odrName: 'Galatians',      modernName: 'Galatians',     testament: 'NT', chapters: 6,  hasConfraternity: true },
  { slug: 'ephesians',    odrName: 'Ephesians',      modernName: 'Ephesians',     testament: 'NT', chapters: 6,  hasConfraternity: true },
  { slug: 'philippians',  odrName: 'Philippians',    modernName: 'Philippians',   testament: 'NT', chapters: 4,  hasConfraternity: true },
  { slug: 'colossians',   odrName: 'Colossians',     modernName: 'Colossians',    testament: 'NT', chapters: 4,  hasConfraternity: true },
  { slug: '1-thessalonians', odrName: '1 Thessalonians', modernName: '1 Thessalonians', testament: 'NT', chapters: 5, hasConfraternity: true },
  { slug: '2-thessalonians', odrName: '2 Thessalonians', modernName: '2 Thessalonians', testament: 'NT', chapters: 3, hasConfraternity: true },
  { slug: '1-timothy',    odrName: '1 Timothy',      modernName: '1 Timothy',     testament: 'NT', chapters: 6,  hasConfraternity: true },
  { slug: '2-timothy',    odrName: '2 Timothy',      modernName: '2 Timothy',     testament: 'NT', chapters: 4,  hasConfraternity: true },
  { slug: 'titus',        odrName: 'Titus',          modernName: 'Titus',         testament: 'NT', chapters: 3,  hasConfraternity: true },
  { slug: 'philemon',     odrName: 'Philemon',       modernName: 'Philemon',      testament: 'NT', chapters: 1,  hasConfraternity: true },
  { slug: 'hebrews',      odrName: 'Hebrews',        modernName: 'Hebrews',       testament: 'NT', chapters: 13, hasConfraternity: true },
  { slug: 'james',        odrName: 'James',          modernName: 'James',         testament: 'NT', chapters: 5,  hasConfraternity: true },
  { slug: '1-peter',      odrName: '1 Peter',        modernName: '1 Peter',       testament: 'NT', chapters: 5,  hasConfraternity: true },
  { slug: '2-peter',      odrName: '2 Peter',        modernName: '2 Peter',       testament: 'NT', chapters: 3,  hasConfraternity: true },
  { slug: '1-john',       odrName: '1 John',         modernName: '1 John',        testament: 'NT', chapters: 5,  hasConfraternity: true },
  { slug: '2-john',       odrName: '2 John',         modernName: '2 John',        testament: 'NT', chapters: 1,  hasConfraternity: true },
  { slug: '3-john',       odrName: '3 John',         modernName: '3 John',        testament: 'NT', chapters: 1,  hasConfraternity: true },
  { slug: 'jude',         odrName: 'Jude',           modernName: 'Jude',          testament: 'NT', chapters: 1,  hasConfraternity: true },
  { slug: 'apocalypse',   odrName: 'Apocalypse',     modernName: 'Revelation',    testament: 'NT', chapters: 22, hasConfraternity: true },
];

const _bySlug = new Map(ALL_BOOKS.map(b => [b.slug, b]));
const _byOdr  = new Map(ALL_BOOKS.map(b => [b.odrName.toLowerCase(), b]));
const _byModern = new Map(ALL_BOOKS.flatMap(b => [
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
  ['habakkuk', _bySlug.get('habacuc')!],
].filter((e): e is [string, BookMeta] => e[1] !== undefined)));

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
  const idx = ALL_BOOKS.findIndex(b => b.slug === slug);
  return idx > 0 ? ALL_BOOKS[idx - 1] : undefined;
}

/** Returns the next book in canonical order, or undefined at Apocalypse */
export function getNextBook(slug: string): BookMeta | undefined {
  const idx = ALL_BOOKS.findIndex(b => b.slug === slug);
  return idx >= 0 && idx < ALL_BOOKS.length - 1 ? ALL_BOOKS[idx + 1] : undefined;
}
