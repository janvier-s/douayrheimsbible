import type { PageLoad } from './$types';

export const prerender = true;
import { error } from '@sveltejs/kit';
import { loadBook, getChapter } from '$lib/data/loader';
import { getBookBySlug } from '$lib/data/books';

export const load: PageLoad = async ({ fetch }) => {
	const bookMeta = getBookBySlug('genesis');
	if (!bookMeta) throw error(404, 'Genesis not found');

	const bookData = await loadBook('genesis', fetch);
	const chapter = getChapter(bookData, 1);
	if (!chapter) throw error(404, 'Chapter 1 not found');

	return {
		bookMeta,
		chapter,
		totalChapters: bookData.chapters.length,
		hasStudyMode: true,
		showLayoutTopBar: false
	};
};
