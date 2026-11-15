// Site KJV slugs (Vulgate-style names) → where the 1611 text comes from.
//  source:   file in ~/facsimiles/kjv-1611/source (the 66-book 1611 text, Protestant slugs)
//  aruljohn: files in ~/facsimiles/kjv-1611/aruljohn, in order (abbreviation witness; for
//            Apocrypha the base text itself)

export type SlugSource = { source?: string; aruljohn?: string[] };

export const SOURCE_SLUGS: Record<string, SlugSource> = {};

const same = [
	'genesis',
	'exodus',
	'leviticus',
	'numbers',
	'deuteronomy',
	'judges',
	'ruth',
	'job',
	'psalms',
	'proverbs',
	'ecclesiastes',
	'lamentations',
	'matthew',
	'mark',
	'luke',
	'john',
	'acts',
	'romans',
	'1-corinthians',
	'2-corinthians',
	'galatians',
	'ephesians',
	'philippians',
	'colossians',
	'1-thessalonians',
	'2-thessalonians',
	'1-timothy',
	'2-timothy',
	'titus',
	'philemon',
	'hebrews',
	'nahum',
	'james',
	'1-peter',
	'2-peter',
	'1-john',
	'2-john',
	'3-john',
	'jude',
	'amos',
	'joel'
];
const title = (slug: string) =>
	slug
		.split('-')
		.map((w) => (w === 'of' ? w : w[0].toUpperCase() + w.slice(1)))
		.join(' ');
for (const s of same) SOURCE_SLUGS[s] = { source: s, aruljohn: [title(s)] };

// site slug → protestant source slug (aruljohn file uses the same name, title-cased)
const renamed: Record<string, string> = {
	'1-kings': '1-samuel',
	'2-kings': '2-samuel',
	'3-kings': '1-kings',
	'4-kings': '2-kings',
	'1-paralipomenon': '1-chronicles',
	'2-paralipomenon': '2-chronicles',
	'1-esdras': 'ezra',
	'2-esdras': 'nehemiah',
	abdias: 'obadiah',
	aggeus: 'haggai',
	apocalypse: 'revelation',
	'canticle-of-canticles': 'song-of-solomon',
	ezechiel: 'ezekiel',
	habacuc: 'habakkuk',
	isaie: 'isaiah',
	jeremie: 'jeremiah',
	jonas: 'jonah',
	josue: 'joshua',
	malachie: 'malachi',
	micheas: 'micah',
	osee: 'hosea',
	sophonias: 'zephaniah',
	zacharias: 'zechariah'
};
for (const [site, src] of Object.entries(renamed))
	SOURCE_SLUGS[site] = { source: src, aruljohn: [title(src)] };

SOURCE_SLUGS.esther = { source: 'esther', aruljohn: ['Esther'] };
SOURCE_SLUGS.daniel = {
	source: 'daniel',
	aruljohn: ['Daniel', 'Prayer of Azariah', 'Susanna', 'Bel and the Dragon']
};

// Apocrypha books (whole books with no supplied-word markup in the source)
SOURCE_SLUGS['3-esdras'] = { aruljohn: ['1 Esdras'] };
SOURCE_SLUGS['4-esdras'] = { aruljohn: ['2 Esdras'] };
SOURCE_SLUGS.tobias = { aruljohn: ['Tobit'] };
SOURCE_SLUGS.judith = { aruljohn: ['Judith'] };
SOURCE_SLUGS.wisdom = { aruljohn: ['Wisdom of Solomon'] };
SOURCE_SLUGS.ecclesiasticus = { aruljohn: ['Ecclesiasticus'] };
SOURCE_SLUGS.baruch = { aruljohn: ['Baruch', 'Letter of Jeremiah'] };
SOURCE_SLUGS['prayer-of-manasses'] = { aruljohn: ['Prayer of Manasseh'] };
SOURCE_SLUGS['1-machabees'] = { aruljohn: ['1 Maccabees'] };
SOURCE_SLUGS['2-machabees'] = { aruljohn: ['2 Maccabees'] };

export const APOCRYPHA = [
	'3-esdras',
	'4-esdras',
	'tobias',
	'judith',
	'wisdom',
	'ecclesiasticus',
	'baruch',
	'prayer-of-manasses',
	'1-machabees',
	'2-machabees'
];

const NT_SLUGS = new Set(
	'matthew mark luke john acts romans 1-corinthians 2-corinthians galatians ephesians philippians colossians 1-thessalonians 2-thessalonians 1-timothy 2-timothy titus philemon hebrews james 1-peter 2-peter 1-john 2-john 3-john jude apocalypse'.split(
		' '
	)
);
/** Book section for the per-section s-cluster policy (OT/Apocrypha/NT may differ, as the ODR's did). */
export const sectionOf = (slug: string): 'OT' | 'APOC' | 'NT' =>
	APOCRYPHA.includes(slug) ? 'APOC' : NT_SLUGS.has(slug) ? 'NT' : 'OT';
