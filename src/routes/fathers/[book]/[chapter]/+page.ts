import type { PageLoad, EntryGenerator } from './$types';
import { error } from '@sveltejs/kit';
import { loadBook, getChapter, loadFathersChapter } from '$lib/data/loader';
import { getBookBySlug, ALL_BOOKS } from '$lib/data/books';

export const prerender = true;

export const entries: EntryGenerator = () =>
	ALL_BOOKS.flatMap((book) =>
		Array.from({ length: book.chapters }, (_, i) => ({
			book: book.slug,
			chapter: String(i + 1)
		}))
	);

export const load: PageLoad = async ({ params, fetch }) => {
	const { book: slug, chapter: chapterStr } = params;

	const bookMeta = getBookBySlug(slug);
	if (!bookMeta) throw error(404, `Book not found: ${slug}`);

	const chapterNum = parseInt(chapterStr, 10);
	if (isNaN(chapterNum) || chapterNum < 1) throw error(404, `Invalid chapter: ${chapterStr}`);

	const bookData = await loadBook(slug, fetch);
	const chapter = getChapter(bookData, chapterNum);
	if (!chapter) throw error(404, `Chapter ${chapterNum} not found`);

	const fathersData = await loadFathersChapter(slug, chapterNum, fetch);

	return {
		bookMeta,
		chapter,
		totalChapters: bookData.chapters.length,
		fathersData,
		showLayoutTopBar: false,
		hasStudyMode: false
	};
};
