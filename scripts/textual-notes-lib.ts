// scripts/textual-notes-lib.ts
// Pure helpers for the Vulgate textual-notes build. No fs, no side effects —
// mirrors glossa-lib.ts so prepare-data.ts can import the build script
// without re-running main() twice.

/** Source ref abbreviation (modern numbering, e.g. "1 Sam", "1 Kgs") to
 *  project book slug (Vulgate/DR numbering, e.g. "1-kings", "3-kings"). */
export const TEXTUAL_NOTES_BOOK_MAP: Record<string, string> = {
	Gen: 'genesis',
	Exod: 'exodus',
	Lev: 'leviticus',
	Num: 'numbers',
	Deut: 'deuteronomy',
	Josh: 'josue',
	Judg: 'judges',
	Ruth: 'ruth',
	'1 Sam': '1-kings',
	'2 Sam': '2-kings',
	'1 Kgs': '3-kings',
	'2 Kgs': '4-kings',
	'1 Chr': '1-paralipomenon',
	'2 Chr': '2-paralipomenon',
	Ezra: '1-esdras',
	Neh: '2-esdras',
	Tobit: 'tobias',
	Judith: 'judith',
	Esth: 'esther',
	'1 Macc': '1-machabees',
	'2 Macc': '2-machabees',
	Job: 'job',
	Ps: 'psalms',
	Prov: 'proverbs',
	Koh: 'ecclesiastes',
	Cant: 'canticle-of-canticles',
	Wisd: 'wisdom',
	Sir: 'ecclesiasticus',
	Isa: 'isaie',
	Jer: 'jeremie',
	Lam: 'lamentations',
	Bar: 'baruch',
	Ezek: 'ezechiel',
	Dan: 'daniel',
	Hos: 'osee',
	Joel: 'joel',
	Am: 'amos',
	Obad: 'abdias',
	Jonah: 'jonas',
	Micah: 'micheas',
	Nah: 'nahum',
	Hab: 'habacuc',
	Zeph: 'sophonias',
	Hag: 'aggeus',
	Zech: 'zacharias',
	Mal: 'malachie',
	'3 Ezra': '3-esdras',
	'4 Ezra': '4-esdras',
	Matt: 'matthew',
	Mark: 'mark',
	Luke: 'luke',
	John: 'john',
	Acts: 'acts',
	Rom: 'romans',
	'1 Cor': '1-corinthians',
	'2 Cor': '2-corinthians',
	Gal: 'galatians',
	Eph: 'ephesians',
	Phil: 'philippians',
	Col: 'colossians',
	'1 Thess': '1-thessalonians',
	'2 Thess': '2-thessalonians',
	'1 Tim': '1-timothy',
	'2 Tim': '2-timothy',
	Tit: 'titus',
	Phlm: 'philemon',
	Hebr: 'hebrews',
	Jas: 'james',
	'1 Pet': '1-peter',
	'2 Pet': '2-peter',
	'1 John': '1-john',
	'2 John': '2-john',
	'3 John': '3-john',
	Jude: 'jude',
	Rev: 'apocalypse'
	// "Laod" (Letter to the Laodiceans) has no slug in this project — dropped by the build.
};

const REF_RE = /^((?:[1-4]\s)?[A-Za-z]+)\s+(\d+)(?::(\d+))?/;

/** Parses a ref string like "Gen 1:1–4:15a", "Zech 6:3.7", or a chapter-only
 *  ref like "Rom 7" into the book abbreviation and the anchor chapter/verse —
 *  always the first chapter:verse mentioned, ignoring any range end, disjoint
 *  continuation, or sub-verse letter. A chapter-only ref anchors to verse 0
 *  (the panel's existing "Chapter" section, also used by Glossa/Haydock). The
 *  full ref string is kept verbatim elsewhere for display; this only decides
 *  which chapter file the entry belongs in and which verse it scrolls to. */
export function parseRef(ref: string): { abbrev: string; chapter: number; verse: number } | null {
	const m = REF_RE.exec(ref.trim());
	if (!m) return null;
	return {
		abbrev: m[1],
		chapter: parseInt(m[2], 10),
		verse: m[3] !== undefined ? parseInt(m[3], 10) : 0
	};
}
