import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadBook, getChapter, loadTranslationBook } from '$lib/data/loader';
import { getBookBySlug } from '$lib/data/books';
import { TRANSLATIONS } from '$lib/stores/compare';
import type { TranslationChapter } from '$lib/data/translation-types';

export function buildVerseMap(
	chapters: TranslationChapter[],
	chapterNum: number
): Map<number, string> {
	const ch = chapters.find((c) => c.chapter === chapterNum);
	if (!ch) return new Map();
	return new Map(ch.verses.map((v) => [v.verse, v.text]));
}

export const load: PageLoad = async ({ params, fetch }) => {
	const { book: slug, chapter: chapterStr } = params;

	const bookMeta = getBookBySlug(slug);
	if (!bookMeta) throw error(404, `Book not found: ${slug}`);

	const chapterNum = parseInt(chapterStr, 10);
	if (isNaN(chapterNum) || chapterNum < 1) throw error(404, `Invalid chapter: ${chapterStr}`);

	// Always load ODR (base text)
	const odrBookData = await loadBook(slug, fetch);
	const chapter = getChapter(odrBookData, chapterNum);
	if (!chapter) throw error(404, `Chapter ${chapterNum} not found`);

	// Load all other live translations in parallel (skip RSV which is hidden)
	const otherTranslations = TRANSLATIONS.filter(
		(t) => t.id !== 'odr' && t.live && !(t.ntOnly && bookMeta.testament === 'OT')
	);

	const translationResults = await Promise.allSettled(
		otherTranslations.map((t) => loadTranslationBook(t.id, slug, fetch))
	);

	// Build verse map per translation
	const verseMaps: Record<string, Map<number, string>> = {
		odr: new Map(chapter.verses.map((v) => [v.verse, v.text]))
	};

	for (let i = 0; i < otherTranslations.length; i++) {
		const result = translationResults[i];
		const t = otherTranslations[i];
		if (result.status === 'fulfilled') {
			verseMaps[t.id] = buildVerseMap(result.value.chapters, chapterNum);
		} else {
			verseMaps[t.id] = new Map(); // empty if translation unavailable for this book
		}
	}

	return {
		bookMeta,
		chapter,
		totalChapters: odrBookData.chapters.length,
		verseMaps,
		showLayoutTopBar: false
	};
};
