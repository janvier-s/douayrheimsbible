import type { PageLoad, EntryGenerator } from './$types';
import { error } from '@sveltejs/kit';
import { loadBook, getChapter, loadFathersChapter, loadVersification } from '$lib/data/loader';
import { chapterVersification } from '$lib/utils/versification';
import { remapFathersChapter } from '$lib/utils/fathers-remap';
import { getBookBySlug } from '$lib/data/books';
import manifest from '../../../../../static/data/fathers/manifest.json';

export const prerender = true;

export const entries: EntryGenerator = () =>
	Object.entries(manifest as Record<string, number[]>).flatMap(([slug, chapters]) =>
		chapters.map((ch) => ({ book: slug, chapter: String(ch) }))
	);

export const load: PageLoad = async ({ params, fetch }) => {
	const { book: slug, chapter: chapterStr } = params;

	const bookMeta = getBookBySlug(slug);
	if (!bookMeta) throw error(404, `Book not found: ${slug}`);

	const chapterNum = parseInt(chapterStr, 10);
	if (isNaN(chapterNum) || chapterNum < 1) throw error(404, `Invalid chapter: ${chapterStr}`);

	const [bookData, rawFathersData, versification] = await Promise.all([
		loadBook(slug, fetch),
		loadFathersChapter(slug, chapterNum, fetch),
		loadVersification(fetch)
	]);

	const chapter = getChapter(bookData, chapterNum);
	if (!chapter) throw error(404, `Chapter ${chapterNum} not found`);

	const fathersData = remapFathersChapter(
		rawFathersData,
		chapterVersification(versification, slug, chapterNum),
		chapter.verses.map((v) => v.verse)
	);

	return {
		bookMeta,
		chapter,
		totalChapters: bookData.chapters.length,
		fathersData,
		showLayoutTopBar: false,
		hasStudyMode: false
	};
};
