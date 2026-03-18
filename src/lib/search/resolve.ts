import type { ParsedReference } from './reference';
import { getBookByOdrName, getBookByModernName, getBookBySlug } from '$lib/data/books';

const OSIS_TO_SLUG: Record<string, string> = {
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
	Josh: 'josue',
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
	Rev: 'apocalypse',
	PrMan: 'prayer-of-manasses',
	'3Esd': '3-esdras',
	'4Esd': '4-esdras'
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
