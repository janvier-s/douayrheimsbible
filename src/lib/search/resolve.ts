import type { ParsedReference } from './reference';
import { getBookByOdrName, getBookByModernName, getBookBySlug } from '$lib/data/books';

const OSIS_TO_SLUG: Record<string, string> = {
	// OT — books with standard names
	Gen: 'genesis',
	Exod: 'exodus',
	Lev: 'leviticus',
	Num: 'numbers',
	Deut: 'deuteronomy',
	Josh: 'josue',
	Judg: 'judges',
	Ruth: 'ruth',
	Esth: 'esther',
	Job: 'job',
	Ps: 'psalms',
	Prov: 'proverbs',
	Eccl: 'ecclesiastes',
	Lam: 'lamentations',
	Bar: 'baruch',
	Dan: 'daniel',
	Joel: 'joel',
	Amos: 'amos',
	// OT — books with ODR-specific names
	'1Sam': '1-kings',
	'2Sam': '2-kings',
	'1Kgs': '3-kings',
	'2Kgs': '4-kings',
	'1Chr': '1-paralipomenon',
	'2Chr': '2-paralipomenon',
	Ezra: '1-esdras',
	Neh: '2-esdras',
	Tob: 'tobias',
	Jdt: 'judith',
	'1Macc': '1-machabees',
	'2Macc': '2-machabees',
	Sir: 'ecclesiasticus',
	Wis: 'wisdom',
	Isa: 'isaie',
	Jer: 'jeremie',
	Ezek: 'ezechiel',
	Obad: 'abdias',
	Jonah: 'jonas',
	Mic: 'micheas',
	Nah: 'nahum',
	Hab: 'habacuc',
	Zeph: 'sophonias',
	Hag: 'aggeus',
	Zech: 'zacharias',
	Mal: 'malachie',
	Hos: 'osee',
	Cant: 'canticle-of-canticles',
	Song: 'canticle-of-canticles',
	PrMan: 'prayer-of-manasses',
	'3Esd': '3-esdras',
	'4Esd': '4-esdras',
	// NT
	Matt: 'matthew',
	Mark: 'mark',
	Luke: 'luke',
	John: 'john',
	Acts: 'acts',
	Rom: 'romans',
	'1Cor': '1-corinthians',
	'2Cor': '2-corinthians',
	Gal: 'galatians',
	Eph: 'ephesians',
	Phil: 'philippians',
	Col: 'colossians',
	'1Thess': '1-thessalonians',
	'2Thess': '2-thessalonians',
	'1Tim': '1-timothy',
	'2Tim': '2-timothy',
	Titus: 'titus',
	Phlm: 'philemon',
	Heb: 'hebrews',
	Jas: 'james',
	'1Pet': '1-peter',
	'2Pet': '2-peter',
	'1John': '1-john',
	'2John': '2-john',
	'3John': '3-john',
	Jude: 'jude',
	Rev: 'apocalypse'
};

export interface ResolvedRef {
	slug: string;
	chapter: number;
	verse?: number;
	url: string;
}

export function resolveReference(ref: ParsedReference): ResolvedRef | null {
	const slug =
		OSIS_TO_SLUG[ref.book] ??
		getBookByOdrName(ref.book)?.slug ??
		getBookByModernName(ref.book)?.slug ??
		getBookBySlug(ref.book.toLowerCase())?.slug;

	if (!slug) return null;

	const url = ref.verse
		? `/odr/${slug}/${ref.chapter}/${ref.verse}`
		: `/odr/${slug}/${ref.chapter}`;

	return { slug, chapter: ref.chapter, verse: ref.verse, url };
}
