import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadBook, getChapter } from '$lib/data/loader';
import { getBookBySlug } from '$lib/data/books';

export const load: PageLoad = async ({ params, fetch }) => {
	const { book: slug, chapter: chapterStr } = params;

	const bookMeta = getBookBySlug(slug);
	if (!bookMeta) throw error(404, `Book not found: ${slug}`);

	const chapterNum = parseInt(chapterStr, 10);
	if (isNaN(chapterNum) || chapterNum < 1) throw error(404, `Invalid chapter: ${chapterStr}`);

	const bookData = await loadBook(slug, fetch);
	const chapter = getChapter(bookData, chapterNum);
	if (!chapter) throw error(404, `Chapter ${chapterNum} not found`);

	return {
		bookMeta,
		chapter,
		totalChapters: bookData.chapters.length,
		showLayoutTopBar: false
	};
};
